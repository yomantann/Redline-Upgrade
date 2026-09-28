import { getAsset } from './assets';
import type { EndgameState } from './endgame';
import type { Player } from './player';

interface TitleCandidate {
  title: string;
  description: string;
  fit: number;
}

const statTitles = [
  {
    stat: 'aiSkill',
    threshold: 8,
    title: 'THE MACHINE',
    description: 'Built the future. Probably broke something.',
  },
  {
    stat: 'fame',
    threshold: 8,
    title: 'THE MAIN CHARACTER',
    description: 'Every room got louder when you showed up.',
  },
  {
    stat: 'lifestyle',
    threshold: 8,
    title: 'THE BALLER',
    description: 'All signal, no subtlety.',
  },
  {
    stat: 'influence',
    threshold: 8,
    title: 'THE POWER BROKER',
    description: 'Deals got done when you were in the room.',
  },
] as const;

function thresholdFit(value: number, threshold: number): number {
  if (!Number.isFinite(value) || value < threshold) return 0;
  return 1 + Math.min(2, (value - threshold) / threshold);
}

function addCandidate(
  candidates: TitleCandidate[],
  title: string,
  description: string,
  fit: number,
) {
  if (fit >= 1) candidates.push({ title, description, fit });
}

export function evaluateEndGameTitle(
  player: Player,
  endgame: EndgameState,
): { endGameTitle: string; endGameTitleDescription: string } {
  const history = player.history;
  const ownedAssets = Object.values(player.equipment)
    .flatMap((assetId) => assetId ? [getAsset(assetId)] : [])
    .filter((asset): asset is NonNullable<typeof asset> => Boolean(asset));
  const highestAssetLevel = ownedAssets.reduce(
    (highest, asset) => Math.max(highest, player.assetLevels[asset.id] ?? 1),
    0,
  );
  const candidates: TitleCandidate[] = [];

  for (const statTitle of statTitles) {
    const fit = thresholdFit(player[statTitle.stat], statTitle.threshold);
    addCandidate(candidates, statTitle.title, statTitle.description, fit);
  }

  const wealthShare = endgame.baseValue > 0 ? player.wealth / endgame.baseValue : 0;
  if (
    player.wealth >= 500_000
    && wealthShare >= 0.55
    && endgame.choice === 'CASH_OUT'
  ) {
    addCandidate(
      candidates,
      'THE BAG HOLDER',
      'Put the bag away before the last card could touch it.',
      thresholdFit(player.wealth, 500_000) + Math.max(0, wealthShare - 0.55),
    );
  }

  if (
    endgame.choice === 'FINAL_GAMBLE'
    || history.finalGambles > 0
    || history.gambleCardsDrawn >= 2
  ) {
    addCandidate(
      candidates,
      'THE DEGEN',
      'One more bet was always the plan.',
      1.25 + Math.min(1, Math.max(0, history.gambleCardsDrawn - 1) * 0.2)
        + (endgame.choice === 'FINAL_GAMBLE' ? 0.35 : 0),
    );
  }
  if (history.gambleCardsDrawn >= 3) {
    addCandidate(
      candidates,
      'THE CARD SHARK',
      'The gamble deck saw you coming more than once.',
      thresholdFit(history.gambleCardsDrawn, 3),
    );
  }
  if (history.doubleDowns >= 1 || endgame.choice === 'DOUBLE_DOWN') {
    addCandidate(
      candidates,
      'THE DOUBLE-DOWN ARTIST',
      'You put the recorded value back on the table.',
      1.2 + Math.min(0.8, Math.max(0, history.doubleDowns - 1) * 0.2),
    );
  }

  const assetLevelTotal = ownedAssets.reduce(
    (total, asset) => total + (player.assetLevels[asset.id] ?? 1),
    0,
  );
  if (ownedAssets.length >= 3) {
    addCandidate(
      candidates,
      'THE COLLECTOR',
      'You kept finding room for one more.',
      thresholdFit(ownedAssets.length, 3) + Math.max(0, assetLevelTotal - ownedAssets.length) * 0.04,
    );
  }
  if (history.assetUpgrades >= 2) {
    addCandidate(
      candidates,
      'THE UPGRADE GOBLIN',
      'Tokens went straight back into the build.',
      thresholdFit(history.assetUpgrades, 2),
    );
  }
  if (highestAssetLevel >= 4 && ownedAssets.length >= 2) {
    addCandidate(
      candidates,
      'THE OVERCLOCKED',
      'You pushed the hardware past the warning label.',
      thresholdFit(highestAssetLevel, 4) + Math.max(0, ownedAssets.length - 2) * 0.1,
    );
  }
  if (endgame.snapshot.heldUpgradeTokens >= 3) {
    addCandidate(
      candidates,
      'THE HOARDER',
      'Held the tools until the final signal.',
      thresholdFit(endgame.snapshot.heldUpgradeTokens, 3),
    );
  }
  if (history.playerEncounters >= 4) {
    addCandidate(
      candidates,
      'THE TAILGATER',
      'Always on somebody else’s bumper.',
      thresholdFit(history.playerEncounters, 4),
    );
  }
  if (history.careerChanges >= 2) {
    addCandidate(
      candidates,
      'THE CAREER HOPPER',
      'You changed lanes until the right title stuck.',
      thresholdFit(history.careerChanges, 2),
    );
  }
  if (history.largestWealthSwing >= 200_000) {
    addCandidate(
      candidates,
      'THE WHIPLASH',
      'The balance sheet never got a quiet turn.',
      thresholdFit(history.largestWealthSwing, 200_000),
    );
  }

  if (player.wealth <= 150_000) {
    addCandidate(
      candidates,
      'THE SURVIVOR',
      'Made it to the line when the numbers got ugly.',
      0.9 + Math.min(0.2, history.playerEncounters * 0.025 + history.gambleCardsDrawn * 0.025),
    );
  }

  candidates.sort((a, b) => b.fit - a.fit);
  const selected = candidates[0] ?? {
    title: 'THE SURVIVOR',
    description: 'You made it to the line. The next run is yours.',
    fit: 0,
  };

  return {
    endGameTitle: selected.title,
    endGameTitleDescription: selected.description,
  };
}