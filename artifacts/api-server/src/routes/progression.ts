import {
  GetAchievementProfileResponse,
  GetActiveSoloGameResponse,
  StartSoloGameBody,
  StartSoloGameResponse,
  SubmitSoloGameActionBody,
  SubmitSoloGameActionParams,
  SubmitSoloGameActionResponse,
} from "@workspace/api-zod";
import { Router, type IRouter, type Request, type Response } from "express";
import { getAchievementProfile } from "../lib/progression";
import {
  getActiveSoloGame,
  startSoloGame,
  submitSoloGameAction,
  type SoloGameResult,
} from "../lib/solo-games";

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
