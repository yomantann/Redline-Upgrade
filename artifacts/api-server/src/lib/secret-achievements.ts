import type { AchievementTier } from "../../../redline-upgrade/src/game/achievement-catalog";

export interface SecretAchievementDefinition {
  id: string;
  name: string;
  description: string;
  metric: string;
  target: number;
  rarity: "LEGENDARY" | "MYTHIC";
  creditReward: number;
  artwork: string;
}

const records = [
  ["THE IMMORTAL PORTFOLIO", "Finish ten consecutive completed games retaining at least three assets in each.", "secretImmortalPortfolio", 10, "MYTHIC", 5000],
  ["DIAMOND HANDS FOREVER", "Retain the same unique asset type at endgame in 25 different completed games.", "secretDiamondHands", 25, "MYTHIC", 5000],
  ["THE GRAND COLLECTOR", "Retain every eligible asset from the versioned catalog at endgame across your lifetime.", "secretGrandCollector", 1, "MYTHIC", 5000],
  ["UNTOUCHABLE EMPIRE", "Finish five consecutive games without losing or transferring away an asset.", "secretUntouchableEmpire", 5, "LEGENDARY", 2500],
  ["THE VAULT", "Finish 50 completed games while retaining at least one asset in each.", "secretVault", 50, "LEGENDARY", 2500],
  ["COLLECTOR'S PARADOX", "Acquire every eligible asset in the versioned catalog at least twice across your lifetime.", "secretCollectorsParadox", 1, "MYTHIC", 5000],
  ["THE PERFECT HEIST", "Finish holding all four distinct asset slots, after acquiring each this game and losing none.", "secretPerfectHeist", 1, "MYTHIC", 5000],
  ["THE BILLIONAIRE'S CLUB", "Finish in the top decile of Wealth among the players in ten completed games.", "secretBillionairesClub", 10, "LEGENDARY", 2500],
  ["SIX-DIMENSIONAL GENIUS", "In one completed game, reach the top established tier across Wealth, four attributes, and portfolio value.", "secretSixDimensionalGenius", 1, "MYTHIC", 5000],
  ["ABSOLUTE DOMINANCE", "Win while strictly leading all six tracked endgame values against every participant.", "secretAbsoluteDominance", 1, "MYTHIC", 5000],
  ["THE IMPOSSIBLE COMEBACK", "Win after being in last place when the first player reaches the late-game checkpoint.", "secretImpossibleComeback", 1, "LEGENDARY", 2500],
  ["THE PERFECT BALANCE", "Finish a completed game with four attributes equal and each at least 25.", "secretPerfectBalance", 1, "LEGENDARY", 2500],
  ["MASTER OF ALL TRADES", "Win a completed game with every playable character.", "secretMasterOfAllTrades", 21, "MYTHIC", 5000],
  ["THE CHAMELEON", "Win completed games using ten distinct careers.", "secretChameleon", 10, "LEGENDARY", 2500],
  ["CAREER IMMORTALITY", "Win ten consecutive games without changing the career you started with.", "secretCareerImmortality", 10, "MYTHIC", 5000],
  ["THE UNDERDOG LEGEND", "Win a game after starting with the lowest available starting salary.", "secretUnderdogLegend", 1, "LEGENDARY", 2500],
  ["THE ULTIMATE SPECIALIST", "Win 25 games with the same character and starting-career combination.", "secretUltimateSpecialist", 25, "MYTHIC", 5000],
  ["THE UNDEFEATED", "Win 15 consecutive eligible completed games.", "secretUndefeated", 15, "MYTHIC", 5000],
  ["THE FINAL GAMBLER", "Win ten games after resolving the existing Final Gamble option.", "secretFinalGambler", 10, "LEGENDARY", 2500],
  ["DOUBLE DOWN DYNASTY", "Win ten games after resolving the existing Double Down option.", "secretDoubleDownDynasty", 10, "LEGENDARY", 2500],
  ["THE LAST SECOND LEGEND", "Win after entering endgame with the lowest pre-decision base value.", "secretLastSecondLegend", 1, "MYTHIC", 5000],
  ["THE PERFECT RUN", "Win after acquiring an asset at every milestone space where you landed.", "secretPerfectRun", 1, "MYTHIC", 5000],
  ["THE CENTURION", "Win 100 completed games.", "secretCenturion", 100, "MYTHIC", 5000],
  ["THE REDLINE MYTH", "Unlock all 100 standard achievements.", "secretRedlineMyth", 100, "MYTHIC", 5000],
  ["BEYOND THE REDLINE", "Unlock every other achievement in the 125-achievement catalog.", "secretBeyondTheRedline", 124, "MYTHIC", 5000],
] as const;

// Each award has its own silhouette, not a recolor of a shared icon. The SVGs
// remain server-side and are sent only with an unlocked achievement record.
const iconPaths = [
  "M48 9 78 20v22c0 20-12 34-30 45C30 76 18 62 18 42V20z M48 24v43 M32 45h32",
  "M48 12 68 31 48 51 28 31z M48 51v27 M34 78h28 M22 31h52",
  "M18 72h60l-6-38-15 13-9-25-9 25-15-13z M30 83h36",
  "M48 10 75 26v32L48 84 21 58V26z M34 48l10 10 22-24",
  "M22 25h52v48H22z M30 34h36v30H30z M39 43h18v12H39z",
  "M48 10 70 23v26L48 62 26 49V23z M48 62v22 M30 73h36 M39 25l18 18-18 18",
  "M20 28 48 12l28 16v32L48 76 20 60z M33 44h30 M48 29v30 M36 66l12 10 12-10",
  "M18 68h60 M25 58l15-18 12 10 22-29 M62 21h12v12",
  "M48 9 58 28l21 3-15 15 4 22-20-11-20 11 4-22-15-15 21-3z M48 32v22",
  "M48 12 77 29v34L48 80 19 63V29z M31 55l10 10 27-30 M28 30h40",
  "M20 25h56v48H20z M29 36h38 M29 48h24 M29 60h32 M62 48l8 8-8 8",
  "M48 11c-17 0-30 13-30 30 0 20 30 42 30 42s30-22 30-42c0-17-13-30-30-30z M48 27v27 M35 40h26",
  "M20 24h56v48H20z M29 60l11-20 12 13 8-10 11 17 M29 33h20",
  "M48 10 76 26v32L48 74 20 58V26z M32 48h32 M48 32v32 M36 24l24 48",
  "M25 76V30l23-15 23 15v46 M34 76V43h28v33 M41 54h14",
  "M48 12 72 24v28L48 84 24 52V24z M34 38h28 M38 51l10 10 10-10",
  "M48 13 76 29v32L48 77 20 61V29z M30 48h36 M48 30v36 M34 34l28 28",
  "M48 11 78 78H18z M34 59h28 M41 45h14 M48 30v5",
  "M20 28h56v44H20z M29 59 42 43l10 9 8-12 11 19 M34 37h10",
  "M22 22h52v52H22z M34 35h28v26H34z M39 42h18v12H39z M48 19v-8",
  "M16 64c12-21 22-31 32-31s20 10 32 31 M20 70h56 M35 33v-9h26v9 M41 48h14",
  "M48 10 56 33l24 1-19 14 7 24-20-14-20 14 7-24-19-14 24-1z M48 42v17",
  "M24 20h48v60H24z M34 32h28v14H34z M34 55h28 M34 66h18",
  "M48 9 58 29l22 3-16 15 4 22-20-11-20 11 4-22-16-15 22-3z M48 35v20 M38 45h20",
] as const;

const colors = [
  "#c7a8ff", "#94d9ff", "#ffcf69", "#ff657a", "#95e8c3",
  "#c79aff", "#ff8f53", "#a7d9ff", "#f3df75", "#ff738d",
  "#b19cff", "#81e0cf", "#e9b5ff", "#ffd078", "#85c7ff",
  "#ff9c76", "#cab1ff", "#ffdf78", "#83e6b9", "#ff91b8",
  "#9fdbff", "#e9c77c", "#ffab73", "#a8d8ff", "#ffdf8b",
] as const;

function artwork(index: number): string {
  const path = iconPaths[index];
  const color = colors[index];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${color}"/><stop offset="1" stop-color="#f4f2e7"/></linearGradient><filter id="glow"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><path d="M48 4 86 26v44L48 92 10 70V26z" fill="#0a1418" stroke="${color}" stroke-opacity=".55" stroke-width="1.5"/><path d="M48 11 79 29v36L48 83 17 65V29z" fill="none" stroke="#f3f2e9" stroke-opacity=".13"/><path d="${path}" fill="none" stroke="url(#g)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)"/><circle cx="48" cy="48" r="2.2" fill="${color}"/><path d="M13 48h7m56 0h7M48 8v5m0 70v5" stroke="#f2f1e8" stroke-opacity=".35"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const secretAchievementCatalog: readonly SecretAchievementDefinition[] = records.map(
  ([name, description, metric, target, rarity, creditReward], index) => ({
    id: `secret-${String(index + 1).padStart(2, "0")}`,
    name,
    description,
    metric,
    target,
    rarity: rarity as AchievementTier & ("LEGENDARY" | "MYTHIC"),
    creditReward,
    artwork: artwork(index),
  }),
);

export const SECRET_ACHIEVEMENT_IDS = secretAchievementCatalog.map(({ id }) => id);
