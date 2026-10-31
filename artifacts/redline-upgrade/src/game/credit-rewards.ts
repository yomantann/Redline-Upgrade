export const GAME_CREDIT_REWARDS = {
  completion: 25,
  placement: [75, 40, 20, 10],
  firstGame: 50,
  firstCareerWin: 25,
  firstCharacterWin: 25,
  firstWin: 100,
  retention: [{ minimum: 5, credits: 50 }, { minimum: 3, credits: 25 }, { minimum: 1, credits: 10 }],
  levelFourRetained: 25,
  doubleDownSuccess: 50,
  finalGambleSuccess: 75,
  winAfterDoubleDown: 50,
  winAfterFinalGamble: 100,
  lossFree: 0,
} as const;

export const ACHIEVEMENT_TIER_CREDITS = {
  BRONZE: 25, SILVER: 50, GOLD: 100, PLATINUM: 200, LEGENDARY: 500, MYTHIC: 1_000,
} as const;

export const CREDIT_EARNING_GUIDE: { title: string; value: string }[] = [
  { title: "Complete a game", value: `+${GAME_CREDIT_REWARDS.completion}` },
  { title: "Finish in 1st / 2nd / 3rd / 4th", value: `+${GAME_CREDIT_REWARDS.placement.join(" / ")}` },
  { title: "First completed game", value: `+${GAME_CREDIT_REWARDS.firstGame}` },
  { title: "First overall win", value: `+${GAME_CREDIT_REWARDS.firstWin}` },
  { title: "First win with a career", value: `+${GAME_CREDIT_REWARDS.firstCareerWin}` },
  { title: "First win with a character", value: `+${GAME_CREDIT_REWARDS.firstCharacterWin}` },
  { title: "Retain 1 / 3 / 5 assets", value: `+${GAME_CREDIT_REWARDS.retention.map((tier) => tier.credits).reverse().join(" / ")}` },
  { title: "Retain a level-four asset", value: `+${GAME_CREDIT_REWARDS.levelFourRetained}` },
  { title: "Successful Double Down", value: `+${GAME_CREDIT_REWARDS.doubleDownSuccess}` },
  { title: "Win after a successful Double Down", value: `+${GAME_CREDIT_REWARDS.winAfterDoubleDown}` },
  { title: "Successful Final Gamble", value: `+${GAME_CREDIT_REWARDS.finalGambleSuccess}` },
  { title: "Win after a successful Final Gamble", value: `+${GAME_CREDIT_REWARDS.winAfterFinalGamble}` },
  { title: "Milestone unlock", value: "Reward varies" },
];
