import { MAX_ASSET_LEVEL, type AssetLevel } from '@/game/assets';
import type { MatchAction, MatchPlayer } from '@/game/match';
import { assetValueAtLevel, availableUpgradeTokens, formatAssetValue, getEligibleRecoveryMilestones, getOwnedUpgradeableAssets } from '@/game/upgrade-tokens';
import { AssetArtwork } from './asset-artwork';
import { SpaceIcon } from './space-icon';
import './upgrade-token-controls.css';

export function UpgradeTokenControls({
  player,
  onAction,
}: {
  player: MatchPlayer;
  onAction: (action: MatchAction) => void;
}) {
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
                      <small>+{formatAssetValue(asset.cost)} value · listed effects increase</small>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="upgrade-token-unavailable">No owned asset can be upgraded further.</p>
          )}
        </section>

        <button
          type="button"
          className="upgrade-token-action"
          disabled={!recoverable.length}
          data-testid="recover-missed-milestone"
          onClick={() => onAction({ type: 'RECOVER_MILESTONE' })}
        >
          <span className="upgrade-token-option-title mono">02 / RANDOM RECOVERY</span>
          <strong>Recover a missed milestone</strong>
          <small>{recoverable.length
            ? `Random category and asset from ${recoverable.length} passed, empty milestone slot${recoverable.length === 1 ? '' : 's'}.`
            : 'No passed milestone with an empty asset slot is eligible.'}</small>
        </button>

        <button
          type="button"
          className="upgrade-token-action upgrade-token-hold"
          data-testid="hold-upgrade-token"
          onClick={() => onAction({ type: 'HOLD_UPGRADE_TOKEN' })}
        >
          <span className="upgrade-token-option-title mono">03 / SAVE FOR LATER</span>
          <strong>Hold for the endgame</strong>
          <small>Reserve 1 token without spending it. It stays on your match record for future endgame rules.</small>
        </button>
      </div>
      <p className="upgrade-token-note">Upgrades repeat the asset’s listed effects and add one base cost to its displayed value. Recovery is random; no asset choice screen is used.</p>
    </section>
  );
}