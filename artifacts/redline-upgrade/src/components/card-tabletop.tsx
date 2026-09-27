import { useEffect, useState } from 'react';
import { cardsForDeck, type CardDefinition } from '@/game/cards';
import type { CardPileMap } from '@/game/card-piles';
import { decks, getDeck, type DeckId } from '@/game/decks';
import { RedlineCard } from './redline-card';

type Props = {
  activeDeck?: DeckId;
  activeCard?: CardDefinition;
  cardStage?: 'draw' | 'resolved';
  cardPiles?: CardPileMap;
  onResolveCard?: () => void;
  onAcknowledge?: () => void;
  isCPU?: boolean;
};

export function CardTabletop({
  activeDeck,
  activeCard,
  cardStage,
  cardPiles,
  onResolveCard,
  onAcknowledge,
  isCPU = false,
}: Props) {
  const [preview, setPreview] = useState<DeckId | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);

  useEffect(() => { setPreview(null); }, [activeDeck]);

  const previewCards = preview ? cardsForDeck(preview) : [];
  const previewedCard = previewCards.length ? previewCards[previewIndex % previewCards.length] : null;
  const displayed = preview ? getDeck(preview) : null;
  const activeCardResolved = cardStage === 'resolved' && activeCard;
  return (
    <>
      {activeDeck && (
        <section className="card-draw-panel" aria-label={`${getDeck(activeDeck).name} card draw`} data-testid="section-card-draw">
          <div className="card-draw-copy">
            <span className="eyebrow">CARD SPACE / {getDeck(activeDeck).serial}</span>
            <h2>{activeCardResolved ? activeCard.title : 'Draw your card.'}</h2>
            <p>{activeCardResolved ? activeCard.description : `The ${getDeck(activeDeck).name} card is ready. Reveal it to resolve its effect.`}</p>
          </div>
          <div className={`card-draw-stage ${activeCardResolved ? 'revealed' : ''}`} key={activeCardResolved ? activeCard.id : activeDeck}>
            <RedlineCard deck={activeDeck} face={activeCardResolved ? 'front' : 'back'} card={activeCardResolved ? activeCard : undefined} />
          </div>
          <div className="card-draw-action">
            {isCPU ? <p>CPU CARD IN PROGRESS // BOARD PAUSED</p> : activeCardResolved
              ? <button type="button" className="action lime-action" onClick={onAcknowledge} data-testid="button-acknowledge-card">CONTINUE RUN <span aria-hidden="true">↗</span></button>
              : <button type="button" className="action" onClick={onResolveCard} data-testid="button-draw-card">DRAW & RESOLVE <span aria-hidden="true">↗</span></button>}
            <p>{activeCardResolved ? activeCard.effect : 'The card effect will update player stats and the event log.'}</p>
          </div>
        </section>
      )}
      <aside className="tabletop-decks" aria-label="Card decks beside the board">
        <div className="tabletop-decks-head"><div><span className="eyebrow">TABLETOP / DECK BAY</span><h2>Six ways forward.</h2></div><span className="mono">06 DECKS</span></div>
        <div className="tabletop-decks-grid">
          {decks.map(deck => (
            <button className={`tabletop-deck ${activeDeck === deck.id ? 'active' : ''}`} type="button" key={deck.id} onClick={() => { setPreview(deck.id); setPreviewIndex(0); }} aria-pressed={activeDeck === deck.id} data-testid={`button-preview-deck-${deck.id}`}>
              <RedlineCard deck={deck.id} />
              <div className="tabletop-deck-caption"><span>{deck.name}</span><span>{String(cardPiles?.[deck.id]?.drawPile.length ?? deck.count).padStart(2, '0')}</span></div>
            </button>
          ))}
        </div>
        {displayed && (
          <div className="tabletop-preview" data-testid={`section-deck-preview-${displayed.id}`}>
            <div className="tabletop-preview-head"><div><span className="mono" style={{ color: displayed.color }}>DECK FILE / {displayed.serial}</span><h3>{displayed.name}</h3></div><button type="button" onClick={() => setPreview(null)} aria-label="Close deck preview" data-testid="button-close-deck-preview">×</button></div>
            <p>{displayed.description}</p>
            <div className="tabletop-preview-content">
              <RedlineCard deck={displayed.id} face="front" card={previewedCard ?? undefined} />
              <div>
                <p className="tabletop-preview-count">{displayed.count} UNIQUE CARDS / {previewedCard ? `CARD ${String((previewIndex % displayed.count) + 1).padStart(2, '0')}` : 'EMPTY DECK'}</p>
                <p>{previewedCard ? `${previewedCard.title}: ${previewedCard.effect}` : 'No card is available to preview.'}</p>
                <button className="action secondary" type="button" onClick={() => setPreviewIndex(value => (value + 1) % Math.max(1, previewCards.length))} data-testid={`button-preview-draw-${displayed.id}`}>PREVIEW NEXT CARD <span aria-hidden="true">↗</span></button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}