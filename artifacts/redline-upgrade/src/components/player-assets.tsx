import { getAsset, type AssetSlot } from '@/game/assets';
import { SpaceIcon } from './space-icon';
import './player-assets.css';

const slots: { slot: AssetSlot; label: string; empty: string }[] = [
  { slot: 'car', label: 'CAR', empty: 'OPEN SLOT' },
  { slot: 'lifestyle', label: 'LIFESTYLE', empty: 'OPEN SLOT' },
  { slot: 'companion', label: 'PET / INVEST', empty: 'OPEN SLOT' },
  { slot: 'property', label: 'PROPERTY', empty: 'OPEN SLOT' },
];

export function PlayerAssets({ equipment, playerIndex }: { equipment: Record<AssetSlot, string | null>; playerIndex: number }) {
  const count = slots.filter(({ slot }) => equipment[slot]).length;
  return (
    <section className="player-assets" aria-label={`Player ${playerIndex + 1} collected assets`}>
      <div className="player-assets-head mono"><span>COLLECTED / EQUIPMENT</span><b>{String(count).padStart(2, '0')} / 04</b></div>
      <div className="player-assets-grid">
        {slots.map(({ slot, label, empty }) => {
          const asset = equipment[slot] ? getAsset(equipment[slot]!) : undefined;
          return (
            <div className={`player-asset ${asset ? 'owned' : 'empty'}`} key={slot} title={asset ? `${asset.name} — ${asset.description}` : `${label}: ${empty}`} data-testid={`asset-player-${playerIndex}-${slot}`}>
              <div className="player-asset-art" data-category={asset?.category ?? slot} aria-hidden="true">
                 <b><SpaceIcon name={asset?.category ?? (slot === 'companion' ? 'pet' : slot)} size={24} /></b>
              </div>
              <div className="player-asset-label">{label}</div>
              <strong className="player-asset-name">{asset?.name ?? empty}</strong>
            </div>
          );
        })}
      </div>
    </section>
  );
}