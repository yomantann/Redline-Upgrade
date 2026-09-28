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
  actorName?: string;
  actorLabel?: string;
  resultSummary?: string;
  showDeckBay?: boolean;
};

export function CardTabletop({
  activeDeck,
  activeCard,
  cardStage,
  cardPiles,
  onResolveCard,
  onAcknowledge,
  isCPU = false,
  actorName = isCPU ? 'CPU' : 'You',
  actorLabel = isCPU ? 'CPU' : 'YOU',
  resultSummary,
  showDeckBay = true,
}: Props) {
  const [preview, setPreview] = useState<DeckId | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [minimumReadTimeComplete, setMinimumReadTimeComplete] = useState(false);

  useEffect(() => { setPreview(null); }, [activeDeck]);
  useEffect(() => {
    setMinimumReadTimeComplete(false);
    if (!activeDeck) return;
    const timer = window.setTimeout(() => setMinimumReadTimeComplete(true), 2200);
    return () => window.clearTimeout(timer);
  }, [activeDeck, activeCard?.id, cardStage]);

  const previewCards = preview ? cardsForDeck(preview) : [];
  const previewedCard = previewCards.length ? previewCards[previewIndex % previewCards.length] : null;
  const displayed = preview ? getDeck(preview) : null;
  const activeCardResolved = cardStage === 'resolved' && activeCard;
  const presentationStep = activeCardResolved ? 3 : activeCard ? 2 : 0;
  return (
    <>
      {activeDeck && (
        <section
          className="card-draw-panel"
          aria-label={`${getDeck(activeDeck).name} card drawn by ${actorLabel}`}
          aria-modal="true"
          role="dialog"
          data-testid="section-card-draw"
          data-card-stage={activeCardResolved ? 'result' : 'reveal'}
        >
          <div className="card-draw-modal-card">
            <ol className="card-presentation-sequence" aria-label="Card resolution sequence">
              {[isCPU ? 'CPU ACTION' : 'PLAYER ACTION', 'CARD REVEAL', 'CARD EFFECT', 'RESULT'].map((step, index) => (
                <li className={index < presentationStep ? 'complete' : index === presentationStep ? 'current' : ''} key={step}>{step}</li>
              ))}
            </ol>
          <div className="card-draw-copy">
            <span className="eyebrow">{getDeck(activeDeck).name} CARD / {getDeck(activeDeck).serial}</span>
            <h2>{activeCard?.title ?? 'Draw your card.'}</h2>
            <p><b>{actorLabel}</b> / {actorName} drew this card.</p>
            <p>{activeCardResolved ? (resultSummary || activeCard?.description) : 'The card is revealed to the table. Its effect is ready to resolve.'}</p>
          </div>
          <div className={`card-draw-stage ${activeCard ? 'revealed' : ''}`} key={activeCard?.id ?? activeDeck}>
            <RedlineCard deck={activeDeck} face={activeCard ? 'front' : 'back'} card={activeCard} />
          </div>
          <div className="card-draw-action">
            {isCPU ? <p className="mono">{activeCardResolved ? 'RESULT RECORDED // CPU CONTINUES AFTER THE TABLE READS IT' : 'CPU ACTION // REVIEWING CARD EFFECT'}</p> : activeCardResolved
              ? <button type="button" className="action lime-action" onClick={onAcknowledge} disabled={!minimumReadTimeComplete} aria-describedby={!minimumReadTimeComplete ? 'card-read-time-reason' : undefined} data-testid="button-acknowledge-card">CONTINUE RUN <span aria-hidden="true">↗</span></button>
              : onResolveCard
                ? <button type="button" className="action" onClick={onResolveCard} disabled={!minimumReadTimeComplete} aria-describedby={!minimumReadTimeComplete ? 'card-read-time-reason' : undefined} data-testid="button-draw-card">RESOLVE CARD EFFECT <span aria-hidden="true">↗</span></button>
                : <p className="mono">FINAL GAMBLE // CARD REVEALED, RESULT NEXT</p>}
            {!isCPU && !minimumReadTimeComplete && <small className="card-read-time-reason" id="card-read-time-reason">CARD ON TABLE / TAKE A MOMENT TO READ IT</small>}
            <p><b>{activeCardResolved ? 'RESULT' : 'CARD EFFECT'}</b><br />{activeCard?.effect ?? 'The resolved effect will be recorded in the event log.'}</p>
          </div>
          </div>
        </section>
      )}
      {showDeckBay && <aside className="tabletop-decks" aria-label="Card decks beside the board">
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
      </aside>}
    </>
  );
}