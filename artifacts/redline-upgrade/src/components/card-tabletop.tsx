import { useEffect, useState } from 'react';
import type { CardDefinition } from '@/game/cards';
import type { CardPileMap } from '@/game/card-piles';
import { CARD_READ_MINIMUM_MS, CARD_READ_MINIMUM_SECONDS, CPU_CARD_RESULT_SECONDS } from '@/game/card-reveal-timing';
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
  const [minimumReadTimeComplete, setMinimumReadTimeComplete] = useState(false);

  useEffect(() => {
    setMinimumReadTimeComplete(false);
    if (!activeDeck) return;
    const timer = window.setTimeout(() => setMinimumReadTimeComplete(true), CARD_READ_MINIMUM_MS);
    return () => window.clearTimeout(timer);
  }, [activeDeck, activeCard?.id, cardStage]);

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
             {isCPU ? (
               <>
                 <p className="mono">{activeCardResolved ? 'RESULT RECORDED // CPU CONTINUES AUTOMATICALLY' : 'CPU ACTION // CARD READ IN PROGRESS'}</p>
                 <div className={`card-cpu-progress ${activeCardResolved ? 'resolved' : 'draw'}`} role="progressbar" aria-label={activeCardResolved ? 'CPU continuing after card result' : 'CPU reviewing card'} aria-valuetext={activeCardResolved ? `Auto-continue in about ${CPU_CARD_RESULT_SECONDS} seconds` : `Card read in progress for about ${CARD_READ_MINIMUM_SECONDS} seconds`} key={`${activeCard?.id ?? activeDeck}-${cardStage ?? 'draw'}`}>
                   <span aria-hidden="true" />
                 </div>
                 <small className="card-cpu-progress-label mono">{activeCardResolved ? `AUTO-CONTINUE / ${CPU_CARD_RESULT_SECONDS} SEC` : `CARD READ / ${CARD_READ_MINIMUM_SECONDS} SEC`}</small>
               </>
             ) : activeCardResolved
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
            <figure className={`tabletop-deck ${activeDeck === deck.id ? 'active' : ''}`} key={deck.id} data-testid={`deck-bay-${deck.id}`}>
              <RedlineCard deck={deck.id} />
              <figcaption className="tabletop-deck-caption"><span>{deck.name}</span><span>{String(cardPiles?.[deck.id]?.drawPile.length ?? deck.count).padStart(2, '0')}</span></figcaption>
            </figure>
          ))}
        </div>
      </aside>}
    </>
  );
}