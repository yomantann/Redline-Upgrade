import { assetOptions, getAsset, MAX_ASSET_LEVEL, type AssetCategory, type AssetDefinition, type AssetSlot } from './assets';
import type { Player } from './player';

export interface RecoverableMilestone {
  space: number;
  slot: AssetSlot;
  categories: readonly AssetCategory[];
}

const RECOVERABLE_MILESTONES: readonly RecoverableMilestone[] = [
  { space: 10, slot: 'car', categories: ['car'] },
  { space: 30, slot: 'lifestyle', categories: ['lifestyle'] },
  { space: 45, slot: 'companion', categories: ['pet', 'investment'] },
  { space: 60, slot: 'property', categories: ['property'] },
];

export function availableUpgradeTokens(player: Pick<Player, 'upgradeTokens' | 'heldUpgradeTokens'>): number {
  return Math.max(0, player.upgradeTokens - player.heldUpgradeTokens);
}

export function getOwnedUpgradeableAssets(player: Pick<Player, 'equipment' | 'assetLevels'>): AssetDefinition[] {
  return Object.values(player.equipment)
    .flatMap((assetId) => assetId ? [getAsset(assetId)] : [])
    .filter((asset): asset is AssetDefinition => Boolean(asset))
    .filter((asset) => (player.assetLevels[asset.id] ?? 1) < MAX_ASSET_LEVEL);
}

export function getEligibleRecoveryMilestones(
  player: Pick<Player, 'position' | 'equipment'>,
): RecoverableMilestone[] {
  return RECOVERABLE_MILESTONES.filter((milestone) =>
    player.position >= milestone.space && !player.equipment[milestone.slot],
  ).map((milestone) => ({ ...milestone }));
}

export interface RecoveredMilestoneAsset {
  milestone: RecoverableMilestone;
  category: AssetCategory;
  asset: AssetDefinition;
}

function randomIndex(length: number, random: () => number): number {
  if (length < 1) throw new Error('Cannot select a random item from an empty list.');
  return Math.min(length - 1, Math.max(0, Math.floor(random() * length)));
}

/** Chooses a missed milestone first, then its asset category, then one eligible asset. */
export function chooseRecoveredMilestoneAsset(
  player: Pick<Player, 'position' | 'equipment'>,
  random: () => number = Math.random,
): RecoveredMilestoneAsset | null {
  const milestones = getEligibleRecoveryMilestones(player);
  if (!milestones.length) return null;
  const milestone = milestones[randomIndex(milestones.length, random)];
  const category = milestone.categories[randomIndex(milestone.categories.length, random)];
  const options = assetOptions(category);
  if (!options.length) throw new Error(`No assets exist for recoverable category ${category}.`);
  return { milestone, category, asset: options[randomIndex(options.length, random)] };
}

/** A token adds one full set of the asset's listed effects and one base-cost of value. */
export function assetValueAtLevel(asset: AssetDefinition, level: number): number {
  return asset.cost * Math.max(1, Math.min(MAX_ASSET_LEVEL, Math.floor(level)));
}

export function formatAssetValue(value: number): string {
  return `$${Math.round(value).toLocaleString('en-US')}`;
}