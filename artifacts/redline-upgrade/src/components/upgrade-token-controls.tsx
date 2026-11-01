import { useState } from 'react';
import { ASSET_ATTRIBUTE_STATS, MAX_ASSET_ATTRIBUTE_POINTS_PER_ASSET, MAX_ASSET_LEVEL, calculateAssetAttributeAward, type AssetAttributeStat, type AssetLevel } from '@/game/assets';
import type { MatchAction, MatchPlayer } from '@/game/match';
import type { BoardId } from '@/game/boards';
import { assetOptions } from '@/game/assets';
import { getSpace } from '@/game/board-data';
import { availableUpgradeTokens, formatAssetValue, getEligibleRecoveryMilestones, getOwnedUpgradeableAssets } from '@/game/upgrade-tokens';
import { AssetArtwork } from './asset-artwork';
import { SpaceIcon } from './space-icon';
import './upgrade-token-controls.css';

const assetAttributeLabels: Record<AssetAttributeStat, string> = {
  aiSkill: 'AI Skill',
  fame: 'Fame',
  lifestyle: 'Lifestyle',
  influence: 'Influence',
};

export function UpgradeTokenControls({
  player,
  boardId,
  onAction,
}: {
  player: MatchPlayer;
  boardId: BoardId;
  onAction: (action: MatchAction) => void;
}) {
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState<number | null>(null);
  const available = availableUpgradeTokens(player);
  if (!available) return null;
  const ownedAssets = getOwnedUpgradeableAssets(player);
  const recoverable = getEligibleRecoveryMilestones(player);

  return (
    <section className="upgrade-token-panel" aria-label="Beginning-of-turn Upgrade Token choices" data-testid="upgrade-token-controls">
      <header className="upgrade-token-heading">
        <SpaceIcon name="upgrade-token" size={22} />
        <div>
          <span className="mono">BEGINNING OF TURN / {available} AVAILABLE</span>
          <strong>Choose how to use an Upgrade Token</strong>
        </div>
      </header>

      <div className="upgrade-token-options">
        <section className="upgrade-token-upgrade">
          <div className="upgrade-token-option-title mono">01 / UPGRADE AN OWNED ASSET</div>
          {ownedAssets.length ? (
            <div className="upgrade-token-assets">
              {ownedAssets.map((asset) => {
                const level = player.assetLevels[asset.id] ?? 1;
                const nextLevel = Math.min(MAX_ASSET_LEVEL, level + 1) as AssetLevel;
                const currentAward = calculateAssetAttributeAward(asset.id, level as AssetLevel);
                const nextAward = calculateAssetAttributeAward(asset.id, nextLevel);
                const attributeIncreases = ASSET_ATTRIBUTE_STATS
                  .map((stat) => ({ stat, amount: nextAward[stat] - currentAward[stat] }))
                  .filter(({ amount }) => amount > 0);
                const currentTotal = ASSET_ATTRIBUTE_STATS.reduce((total, stat) => total + currentAward[stat], 0);
                const attributeDescription = attributeIncreases.length
                  ? attributeIncreases.map(({ stat, amount }) => `+${amount} ${assetAttributeLabels[stat]}`).join(' · ')
                  : currentTotal >= MAX_ASSET_ATTRIBUTE_POINTS_PER_ASSET
                    ? 'asset attribute limit reached'
                    : 'no attribute bonus';
                return (
                  <button
                    type="button"
                    className="upgrade-token-asset-choice"
                    key={asset.id}
                    data-testid={`upgrade-asset-${asset.id}`}
                    onClick={() => onAction({ type: 'UPGRADE_ASSET', assetId: asset.id })}
                  >
                    <span className="upgrade-token-art"><AssetArtwork assetId={asset.id} level={level as AssetLevel} className="upgrade-token-asset-image" /></span>
                    <span className="upgrade-token-choice-copy">
                      <strong>{asset.name}</strong>
                      <span>LEVEL {level} → {nextLevel}</span>
                      <small>+{formatAssetValue(asset.cost)} value · {attributeDescription}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="upgrade-token-unavailable">No owned asset can be upgraded further.</p>
          )}
        </section>

        <section className="upgrade-token-action">
          <span className="upgrade-token-option-title mono">02 / MILESTONE RECOVERY</span>
          <strong>Recover a missed milestone</strong>
          <small>{recoverable.length
            ? `${recoverable.length} eligible milestone${recoverable.length === 1 ? '' : 's'}; choose one before spending a token.`
            : <span id="upgrade-recovery-disabled-reason">No passed milestone with an empty asset slot is eligible.</span>}</small>
          <button type="button" className="upgrade-token-recovery-open" disabled={!recoverable.length} onClick={() => { setRecoveryOpen((open) => !open); setSelectedSpace(null); }} data-testid="recover-missed-milestone">
            {recoveryOpen ? 'CLOSE CHOICES' : 'CHOOSE MILESTONE'}
          </button>
          {recoveryOpen && recoverable.length > 0 && <div className="upgrade-token-recovery-choices" role="radiogroup" aria-label="Eligible missed milestones">
            {recoverable.map((milestone) => {
              const label = getSpace(milestone.space, boardId)?.label ?? `Milestone ${milestone.space}`;
              return <div className={`upgrade-token-recovery-choice ${selectedSpace === milestone.space ? 'selected' : ''}`} key={milestone.space}>
                <button type="button" role="radio" aria-checked={selectedSpace === milestone.space} onClick={() => setSelectedSpace(milestone.space)}>
                  <strong>SPACE {String(milestone.space).padStart(2, '0')} · {label}</strong>
                  <span>REWARD CATEGORY · {milestone.categories.map((category) => category.toUpperCase()).join(' / ')}</span>
                </button>
              </div>;
            })}
            <p className="upgrade-token-recovery-disclaimer">The milestone is your choice. The asset is still selected at random; companion recovery also randomly selects pet or investment.</p>
            <button type="button" className="upgrade-token-recovery-confirm" disabled={selectedSpace === null} onClick={() => {
              if (selectedSpace === null) return;
              onAction({ type: 'RECOVER_MILESTONE', space: selectedSpace });
              setRecoveryOpen(false);
              setSelectedSpace(null);
            }} data-testid="confirm-recover-milestone">CONFIRM RECOVERY · SPEND 1 TOKEN</button>
          </div>}
        </section>

      </div>
      <p className="upgrade-token-note">Unused tokens remain available and carry through to the endgame. You can roll without spending one. Upgrades repeat listed effects and add one base cost to asset value. Recovery lets you choose an eligible milestone; its asset remains random.</p>
    </section>
  );
}