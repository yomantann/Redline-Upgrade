import { eq } from "drizzle-orm";
import { creditTransactionsTable, creditWalletsTable, db } from "@workspace/db";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const GAME_CREDIT_REWARDS = {
  completion: 50,
  placement: [200, 100, 50, 20],
  firstGame: 100,
  firstCareerWin: 75,
  firstCharacterWin: 75,
  firstWin: 250,
  retention: [{ minimum: 5, credits: 100 }, { minimum: 3, credits: 50 }, { minimum: 1, credits: 25 }],
  levelFourRetained: 75,
  doubleDownSuccess: 100,
  finalGambleSuccess: 150,
  winAfterDoubleDown: 150,
  winAfterFinalGamble: 250,
  lossFree: 50,
} as const;

export const ACHIEVEMENT_TIER_CREDITS = {
  BRONZE: 50, SILVER: 125, GOLD: 300, PLATINUM: 600, LEGENDARY: 1_500, MYTHIC: 4_000,
} as const;

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
