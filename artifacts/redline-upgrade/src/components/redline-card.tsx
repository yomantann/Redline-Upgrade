import type { CSSProperties, ReactNode } from 'react';
import { getDeck, type DeckId } from '@/game/decks';
import type { CardDefinition } from '@/game/cards';
import { getCardArtworkUrl } from '@/game/card-artwork';
import { SpaceIcon } from './space-icon';
import './card-tabletop.css';

type Props = {
  deck: DeckId;
  face?: 'back' | 'front';
  card?: CardDefinition;
  artwork?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function RedlineCard({ deck, face = 'back', card, artwork, action, className = '' }: Props) {
  const config = getDeck(deck);
  const artworkUrl = card ? getCardArtworkUrl(card.id) : undefined;
  return (
    <article className={`redline-card ${face} ${className}`} style={{ '--deck-color': config.color } as CSSProperties} aria-label={face === 'back' ? `${config.name} deck card back` : `${card?.title ?? config.name} card`}>
      <div className="redline-card-rail"><span>REDLINE / UPGRADE</span><span>{config.serial}</span></div>
      {face === 'back' ? (
        <>
          <div className="redline-card-back-core"><div className="redline-card-back-ring"><SpaceIcon name={config.icon} size={34} /></div><b>{config.name}</b><small>DRAW / DISCOVER</small></div>
          <div className="redline-card-footer"><span>RU / {config.id.toUpperCase()}</span><span>7A — 01</span></div>
        </>
      ) : (
        <>
          <div className={`redline-card-art ${!artwork && artworkUrl ? 'has-artwork' : !artwork ? 'artwork-missing' : ''}`} aria-hidden="true">
            {artwork ?? (
              <>
                {artworkUrl && <img className="redline-card-art-image" src={artworkUrl} alt="" loading="lazy" onError={event => { event.currentTarget.style.display = 'none'; const parent = event.currentTarget.parentElement; parent?.classList.remove('has-artwork'); parent?.classList.add('artwork-missing'); }} />}
                <span className="redline-card-art-missing">ARTWORK UNAVAILABLE</span>
              </>
            )}
          </div>
          <div className="redline-card-content">
            <span className="mono" style={{ color: config.color, fontSize: 7 }}>{card ? `${card.rarity} / ${card.id}` : 'DECK PROFILE'}</span>
            <h3>{card?.title ?? config.name}</h3>
            <p>{card?.description ?? config.description}</p>
            <div className="redline-card-effect"><span>{card?.effect ?? 'Deck description'}</span><b>{card?.value ?? '—'}</b></div>
            {action}
          </div>
        </>
      )}
    </article>
  );
}