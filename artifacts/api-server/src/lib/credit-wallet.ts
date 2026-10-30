import { eq } from "drizzle-orm";
import { creditTransactionsTable, creditWalletsTable, db } from "@workspace/db";
import { ACHIEVEMENT_TIER_CREDITS, GAME_CREDIT_REWARDS } from "../../../redline-upgrade/src/game/credit-rewards";
export { ACHIEVEMENT_TIER_CREDITS, GAME_CREDIT_REWARDS } from "../../../redline-upgrade/src/game/credit-rewards";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function grantCredits(
  tx: Tx,
  userId: string,
  amount: number,
  type: string,
  sourceId: string,
  idempotencyKey: string,
): Promise<boolean> {
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("Credit grants must be positive integers.");
  await tx.insert(creditWalletsTable).values({ userId }).onConflictDoNothing();
  const [wallet] = await tx.select().from(creditWalletsTable).where(eq(creditWalletsTable.userId, userId)).for("update").limit(1);
  if (!wallet) throw new Error("Credit wallet could not be created.");
  const [inserted] = await tx.insert(creditTransactionsTable).values({
    userId, amount, type, sourceId, idempotencyKey: `${userId}:${idempotencyKey}`, balanceAfter: wallet.balance + amount,
  }).onConflictDoNothing().returning({ id: creditTransactionsTable.id });
  if (!inserted) return false;
  await tx.update(creditWalletsTable).set({
    balance: wallet.balance + amount,
    lifetimeEarned: wallet.lifetimeEarned + amount,
    achievementEarned: wallet.achievementEarned + (type === "ACHIEVEMENT" ? amount : 0),
    gameEarned: wallet.gameEarned + (type === "GAME" ? amount : 0),
    endgameEarned: wallet.endgameEarned + (type === "ENDGAME" ? amount : 0),
    updatedAt: new Date(),
  }).where(eq(creditWalletsTable.userId, userId));
  return true;
}
