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
  { title: "Acquire assets and finish without losses", value: `+${GAME_CREDIT_REWARDS.lossFree}` },
  { title: "Milestone unlock", value: "Reward varies" },
];
