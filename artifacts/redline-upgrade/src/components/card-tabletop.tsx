import { useEffect, useState } from 'react';
import type { CardDefinition } from '@/game/cards';
import type { PartyChallenge } from '@/game/cards';
import type { CardPileMap } from '@/game/card-piles';
import type { Player } from '@/game/player';
import { CARD_READ_MINIMUM_MS, CARD_READ_MINIMUM_SECONDS, CPU_CARD_DRAW_MS, CPU_CARD_DRAW_SECONDS, CPU_CARD_RESULT_SECONDS } from '@/game/card-reveal-timing';
import { decks, getDeck, type DeckId } from '@/game/decks';
import { RedlineCard } from './redline-card';

type Props = {
  activeDeck?: DeckId;
  activeCard?: CardDefinition;
  offeredCards?: CardDefinition[];
  partyPlayers?: Player[];
  partyActorId?: string;
  partyCanAct?: boolean;
  cardStage?: 'choice' | 'draw' | 'resolved';
  cardPiles?: CardPileMap;
  onResolveCard?: () => void;
  onChooseGambleCard?: (cardId: string) => void;
  onResolvePartyChallenge?: (participantIds: string[], passed: boolean) => void;
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
  offeredCards,
  partyPlayers = [],
  partyActorId,
  partyCanAct = true,
  cardStage,
  cardPiles,
  onResolveCard,
  onChooseGambleCard,
  onResolvePartyChallenge,
  onAcknowledge,
  isCPU = false,
  actorName = isCPU ? 'CPU' : 'You',
  actorLabel = isCPU ? 'CPU' : 'YOU',
  resultSummary,
  showDeckBay = true,
}: Props) {
  const [minimumReadTimeComplete, setMinimumReadTimeComplete] = useState(false);
  const [partyParticipantIds, setPartyParticipantIds] = useState<string[]>([]);
  const drawReadTimeMs = isCPU ? CPU_CARD_DRAW_MS : CARD_READ_MINIMUM_MS;
  const drawReadTimeSeconds = isCPU ? CPU_CARD_DRAW_SECONDS : CARD_READ_MINIMUM_SECONDS;

  useEffect(() => {
    setMinimumReadTimeComplete(false);
    if (!activeDeck) return;
    const timer = window.setTimeout(() => setMinimumReadTimeComplete(true), drawReadTimeMs);
    return () => window.clearTimeout(timer);
  }, [activeDeck, activeCard?.id, cardStage, drawReadTimeMs]);
  useEffect(() => setPartyParticipantIds([]), [activeCard?.id]);

  const activeCardResolved = cardStage === 'resolved' && activeCard;
  const partyChallenge: PartyChallenge | undefined = activeCard?.partyChallenge;
  const requiredParticipants = partyChallenge?.target === 'SELECTED_PLAYER' || partyChallenge?.target === 'SELF_AND_SELECTED' ? 1
    : partyChallenge?.target === 'TWO_SELECTED_PLAYERS' ? 2 : 0;
  const selectablePlayers = partyPlayers.filter(player => player.playerId !== partyActorId);
  const togglePartyParticipant = (playerId: string) => setPartyParticipantIds(current => {
    if (current.includes(playerId)) return current.filter(id => id !== playerId);
    return current.length < requiredParticipants ? [...current, playerId] : current;
  });
  const presentationStep = activeCardResolved ? 3 : cardStage === 'choice' ? 1 : activeCard ? 2 : 0;
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
          <div className={`card-draw-modal-card ${cardStage === 'choice' ? 'choosing-gamble' : ''}`}>
            <ol className="card-presentation-sequence" aria-label="Card resolution sequence">
              {[isCPU ? 'CPU ACTION' : 'PLAYER ACTION', 'CARD REVEAL', 'CARD EFFECT', 'RESULT'].map((step, index) => (
                <li className={index < presentationStep ? 'complete' : index === presentationStep ? 'current' : ''} key={step}>{step}</li>
              ))}
            </ol>
          <div className="card-draw-copy">
            <span className="eyebrow">{getDeck(activeDeck).name} CARD / {getDeck(activeDeck).serial}</span>
            <h2>{cardStage === 'choice' ? 'Choose your Gamble card.' : activeCard?.title ?? 'Draw your card.'}</h2>
            <p><b>{actorLabel}</b> / {actorName} drew this card.</p>
            <p>{cardStage === 'choice' ? 'Two cards are revealed. Choose one to resolve; the other returns to the bottom of the deck.' : partyChallenge?.prompt ?? (activeCardResolved ? (resultSummary || activeCard?.description) : 'The card is revealed to the table. Its effect is ready to resolve.')}</p>
          </div>
          {cardStage === 'choice' && offeredCards?.length ? (
            <div className="card-choice-grid" data-testid="gamble-card-choices">
              {offeredCards.map((card) => isCPU ? (
                <div className="card-choice-option" key={card.id}>{card.partyChallenge ? <div className="bio-party-card"><b>{card.title}</b><p>{card.partyChallenge.prompt}</p></div> : <RedlineCard deck="gamble" face="front" card={card} />}<span>{card.title}</span></div>
              ) : (
                <button className="card-choice-option" type="button" key={card.id} disabled={!minimumReadTimeComplete} onClick={() => onChooseGambleCard?.(card.id)} data-testid={`choose-gamble-${card.id}`}>
                  {card.partyChallenge ? <div className="bio-party-card"><b>{card.title}</b><p>{card.partyChallenge.prompt}</p></div> : <RedlineCard deck="gamble" face="front" card={card} />}<span>{card.title}</span><b>CHOOSE THIS CARD</b>
                </button>
              ))}
            </div>
          ) : (
            partyChallenge
              ? <div className="bio-party-card bio-party-card-active" data-testid="bio-party-prompt"><span className="mono">BIO PARTY CHALLENGE / {partyChallenge.flow}</span><b>{activeCard?.title}</b><p>{partyChallenge.prompt}</p><small>{partyChallenge.safetyNote}</small></div>
              : <div className={`card-draw-stage ${activeCard ? 'revealed' : ''}`} key={activeCard?.id ?? activeDeck}><RedlineCard deck={activeDeck} face={activeCard ? 'front' : 'back'} card={activeCard} /></div>
          )}
          <div className="card-draw-action">
              {isCPU ? (
               <>
                 <p className="mono">{activeCardResolved ? 'RESULT RECORDED // CPU CONTINUES AUTOMATICALLY' : 'CPU ACTION // CARD READ IN PROGRESS'}</p>
                 <div className={`card-cpu-progress ${activeCardResolved ? 'resolved' : 'draw'}`} role="progressbar" aria-label={activeCardResolved ? 'CPU continuing after card result' : 'CPU reviewing card'} aria-valuetext={activeCardResolved ? `Auto-continue in about ${CPU_CARD_RESULT_SECONDS} seconds` : `Card read in progress for about ${drawReadTimeSeconds} seconds`} key={`${activeCard?.id ?? activeDeck}-${cardStage ?? 'draw'}`}>
                    <span aria-hidden="true" style={{ animationDuration: `${activeCardResolved ? CPU_CARD_RESULT_SECONDS : drawReadTimeSeconds}s` }} />
                 </div>
                  <small className="card-cpu-progress-label mono">{activeCardResolved ? `AUTO-CONTINUE / ${CPU_CARD_RESULT_SECONDS} SEC` : `CARD READ / ${drawReadTimeSeconds} SEC`}</small>
               </>
              ) : partyChallenge && cardStage === 'resolved'
                ? partyCanAct ? (
                  <div className="bio-party-actions">
                    {requiredParticipants > 0 && <div className="bio-party-targets" role="group" aria-label="Choose party challenge participants">
                      {selectablePlayers.map(player => <button type="button" key={player.playerId} className="bio-party-target" aria-pressed={partyParticipantIds.includes(player.playerId)} disabled={!partyParticipantIds.includes(player.playerId) && partyParticipantIds.length >= requiredParticipants} onClick={() => togglePartyParticipant(player.playerId)}>{player.displayName}</button>)}
                    </div>}
                    <p className="mono">{partyChallenge.flow === 'VOTE' ? 'ASK THE TABLE TO VOTE, THEN RECORD THE OUTCOME.' : partyChallenge.flow === 'CHOICE' ? 'JOIN THE CHALLENGE OR PASS.' : 'COMPLETE THE CHALLENGE OR PASS.'}</p>
                    <button type="button" className="action lime-action" disabled={!minimumReadTimeComplete || partyParticipantIds.length !== requiredParticipants} onClick={() => onResolvePartyChallenge?.(partyParticipantIds, false)} data-testid="button-complete-party-challenge">CHALLENGE COMPLETE</button>
                    <button type="button" className="text-link" disabled={!minimumReadTimeComplete} onClick={() => onResolvePartyChallenge?.([], true)} data-testid="button-pass-party-challenge">PASS / NO PENALTY</button>
                  </div>
                ) : <p className="mono">WAITING FOR {actorName.toUpperCase()} TO RESOLVE THE CHALLENGE.</p>
                : cardStage === 'choice'
               ? <p className="mono">CHOOSE ONE CARD TO RESOLVE</p>
               : activeCardResolved
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