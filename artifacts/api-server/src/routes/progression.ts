import {
  GetAchievementProfileResponse,
  GetActiveSoloGameResponse,
  EquipCosmeticBody,
  PurchaseCosmeticBody,
  StartSoloGameBody,
  StartSoloGameResponse,
  SubmitSoloGameActionBody,
  SubmitSoloGameActionParams,
  SubmitSoloGameActionResponse,
} from "@workspace/api-zod";
import { Router, type IRouter, type Request, type Response } from "express";
import { desc, eq } from "drizzle-orm";
import { creditTransactionsTable, creditWalletsTable, db } from "@workspace/db";
import { getAchievementProfile } from "../lib/progression";
import {
  getActiveSoloGame,
  startSoloGame,
  submitSoloGameAction,
  type SoloGameResult,
} from "../lib/solo-games";
import { equipCosmetic, getInventory, getShopCatalog, purchaseCosmetic } from "../lib/cosmetics";

const router: IRouter = Router();

function sendError(res: Response, status: number, error: string): void {
  res.status(status).json({ error });
}

function requireAuthenticated(req: Request, res: Response): req is Request & { user: NonNullable<Request["user"]> } {
  if (req.isAuthenticated()) return true;
  sendError(res, 401, "Authentication required.");
  return false;
}

function sendSoloResult(res: Response, result: SoloGameResult): void {
  if (result.kind === "ok") {
    res.status(200).json(SubmitSoloGameActionResponse.parse(result.snapshot));
    return;
  }
  const status = { not_found: 404, conflict: 409, invalid: 400 }[result.kind];
  sendError(res, status, result.kind === "not_found" ? "Solo game not found." : result.message);
}

router.get("/achievement-profile", async (req: Request, res: Response): Promise<void> => {
  if (!requireAuthenticated(req, res)) return;
  const profile = await getAchievementProfile(req.user.id);
  res.status(200).json(GetAchievementProfileResponse.parse(profile));
});

router.get("/credits", async (req: Request, res: Response): Promise<void> => {
  if (!requireAuthenticated(req, res)) return;
  const result = await db.transaction(async (tx) => {
    await tx.insert(creditWalletsTable).values({ userId: req.user.id }).onConflictDoNothing();
    const [wallet] = await tx.select().from(creditWalletsTable)
      .where(eq(creditWalletsTable.userId, req.user.id)).limit(1);
    const transactions = await tx.select().from(creditTransactionsTable)
      .where(eq(creditTransactionsTable.userId, req.user.id))
      .orderBy(desc(creditTransactionsTable.createdAt)).limit(50);
    return { wallet, transactions };
  });
  res.status(200).json(result);
});

router.get("/shop/catalog", async (req: Request, res: Response): Promise<void> => {
  if (!requireAuthenticated(req, res)) return;
  res.status(200).json(await getShopCatalog(req.user.id));
});

router.post("/shop/purchase", async (req: Request, res: Response): Promise<void> => {
  if (!requireAuthenticated(req, res)) return;
  const parsed = PurchaseCosmeticBody.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, "Choose a valid cosmetic.");
    return;
  }
  const result = await purchaseCosmetic(req.user.id, parsed.data.itemId);
  if (result.kind === "ok") { res.status(201).json(result); return; }
  const status = { wallet_missing: 409, not_found: 404, owned: 409, insufficient: 409 }[result.kind];
  res.status(status).json({ error: result.kind, ...result });
});

router.get("/inventory", async (req: Request, res: Response): Promise<void> => {
  if (!requireAuthenticated(req, res)) return;
  res.status(200).json(await getInventory(req.user.id));
});

router.post("/inventory/equip", async (req: Request, res: Response): Promise<void> => {
  if (!requireAuthenticated(req, res)) return;
  const parsed = EquipCosmeticBody.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, "Choose a valid inventory item and slot.");
    return;
  }
  const result = await equipCosmetic(req.user.id, parsed.data.slot, parsed.data.itemId);
  if (result.kind === "ok") { res.status(200).json(result); return; }
  const status = result.kind === "not_found" ? 404 : result.kind === "not_owned" ? 403 : 400;
  res.status(status).json({ error: result.kind });
});

router.get("/solo-games/active", async (req: Request, res: Response): Promise<void> => {
  if (!requireAuthenticated(req, res)) return;
  const game = await getActiveSoloGame(req.user.id);
  res.status(200).json(GetActiveSoloGameResponse.parse({ game }));
});

router.post("/solo-games", async (req: Request, res: Response): Promise<void> => {
  if (!requireAuthenticated(req, res)) return;
  const parsed = StartSoloGameBody.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, "Choose a valid board and character.");
    return;
  }
  const result = await startSoloGame(req.user.id, parsed.data.boardId, parsed.data.characterId);
  if (result.kind === "ok") {
    res.status(201).json(StartSoloGameResponse.parse(result.snapshot));
    return;
  }
  const status = result.kind === "not_found" ? 404 : result.kind === "invalid" ? 400 : 409;
  sendError(res, status, result.kind === "not_found" ? "Account not found." : result.message);
});

router.post("/solo-games/:gameId/actions", async (req: Request, res: Response): Promise<void> => {
  if (!requireAuthenticated(req, res)) return;
  const params = SubmitSoloGameActionParams.safeParse(req.params);
  const parsed = SubmitSoloGameActionBody.safeParse(req.body);
  if (!params.success || !parsed.success || !parsed.data.action || typeof parsed.data.action.type !== "string") {
    sendError(res, 400, "Invalid solo game action.");
    return;
  }
  const result = await submitSoloGameAction(
    params.data.gameId,
    req.user.id,
    parsed.data.action,
    parsed.data.expectedVersion,
  );
  sendSoloResult(res, result);
});

export default router;
