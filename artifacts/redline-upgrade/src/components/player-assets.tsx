import { getAsset, type AssetSlot } from '@/game/assets';
import { getAssetArtworkUrl } from '@/game/asset-artwork';
import { SpaceIcon } from './space-icon';
import { AssetArtwork } from './asset-artwork';
import './player-assets.css';

const slots: { slot: AssetSlot; label: string; empty: string }[] = [
  { slot: 'car', label: 'CAR', empty: 'OPEN SLOT' },
  { slot: 'lifestyle', label: 'LIFESTYLE', empty: 'OPEN SLOT' },
  { slot: 'companion', label: 'PET / INVEST', empty: 'OPEN SLOT' },
  { slot: 'property', label: 'PROPERTY', empty: 'OPEN SLOT' },
];

export function PlayerAssets({
  equipment,
  assetLevels,
  upgradeTokens,
  heldUpgradeTokens,
  playerIndex,
}: {
  equipment: Record<AssetSlot, string | null>;
  assetLevels: Record<string, number>;
  upgradeTokens: number;
  heldUpgradeTokens: number;
  playerIndex: number;
}) {
  const count = slots.filter(({ slot }) => equipment[slot]).length;
  const availableTokens = Math.max(0, upgradeTokens - heldUpgradeTokens);
  return (
    <section className="player-assets" aria-label={`Player ${playerIndex + 1} collected assets`}>
      <div className="player-assets-head mono"><span>COLLECTED / EQUIPMENT</span><b>{String(count).padStart(2, '0')} / 04</b></div>
      <div className="player-assets-grid">
        {slots.map(({ slot, label, empty }) => {
          const asset = equipment[slot] ? getAsset(equipment[slot]!) : undefined;
          const level = asset ? (assetLevels[asset.id] ?? 1) : 1;
          const artwork = asset ? getAssetArtworkUrl(asset.id) : undefined;
          return (
            <div className={`player-asset ${asset ? 'owned' : 'empty'}`} key={slot} title={asset ? `${asset.name} — ${asset.description} — Level ${level}` : `${label}: ${empty}`} data-testid={`asset-player-${playerIndex}-${slot}`}>
              <div className={`player-asset-art ${artwork ? 'has-artwork' : ''}`} data-category={asset?.category ?? slot} aria-hidden="true">
                 <b><SpaceIcon name={asset?.category ?? (slot === 'companion' ? 'pet' : slot)} size={24} /></b>
                 {asset && <AssetArtwork assetId={asset.id} level={level as 1 | 2 | 3 | 4} className="player-asset-image" />}
              </div>
              <div className="player-asset-label">{label}</div>
              <strong className="player-asset-name">{asset?.name ?? empty}</strong>
              {asset && <span className="player-asset-level">LEVEL {level} · VALUE ${(asset.cost * level).toLocaleString('en-US')}</span>}
            </div>
          );
        })}
      </div>
      <div className="player-token-count" data-testid={`tokens-player-${playerIndex}`}>
        <span><SpaceIcon name="upgrade-token" size={14} /> UPGRADE TOKENS</span>
        <b>{String(availableTokens).padStart(2, '0')} AVAILABLE <i>·</i> {String(heldUpgradeTokens).padStart(2, '0')} HELD</b>
      </div>
    </section>
  );
}