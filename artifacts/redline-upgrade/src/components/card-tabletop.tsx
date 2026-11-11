import { useEffect, useRef, useState } from 'react';
import type { CardDefinition, CardEffect, PartyChallenge } from '@/game/cards';
import type { CardPileMap } from '@/game/card-piles';
import { careers, type CareerCategoryTag } from '@/game/careers';
import type { MatchPlayer } from '@/game/match';
import type { BoardId } from '@/game/boards';
import { CARD_READ_MINIMUM_MS, CARD_READ_MINIMUM_SECONDS, CPU_CARD_DRAW_MS, CPU_CARD_DRAW_SECONDS, CPU_CARD_RESULT_SECONDS } from '@/game/card-reveal-timing';
import { decks, getDeck, type DeckId } from '@/game/decks';
import { getCardArtworkUrl } from '@/game/card-artwork';
import { RedlineCard } from './redline-card';
import { getPartyParticipantIds } from '@/game/bio-party-targets';
import { PlayerTargetOption } from './player-target-option';
import { ExpandableText } from './expandable-text';
import './card-tabletop.css';

function targetLabel(target?: string) {
  if (!target) return 'the current player';
  return ({
    SELF: 'the current player',
    RANDOM_OPPONENT: 'a random opponent',
    WEALTH_LEADER: 'the Wealth leader',
    WEALTH_TRAILER: 'the Wealth trailer',
    ALL_OPPONENTS: 'all opponents',
    SELECTED_PLAYER: 'the selected player',
    SELF_AND_SELECTED: 'the current player and selected player',
    TWO_SELECTED_PLAYERS: 'two selected players',
    ALL_PLAYERS: 'all players',
    ALL_EXCEPT_SELF: 'all other players',
    SELF_OR_ALL_PLAYERS: 'the current player or all players',
  } as Record<string, string>)[target] ?? target.toLowerCase().replaceAll('_', ' ');
}

function effectInstructions(effect: CardEffect): string[] {
  const careerTag = 'careerTag' in effect ? effect.careerTag : undefined;
  const eligibleCareerNames = careerTag
    ? careers.filter(career => career.tags.includes(careerTag as CareerCategoryTag)).map(career => career.name).join(', ')
    : '';
  const condition = eligibleCareerNames ? ` (career bonus for ${eligibleCareerNames})` : '';
  const reason = effect.reason ? ` — ${effect.reason}` : '';
  switch (effect.kind) {
    case 'STAT':
      return [`${effect.amount >= 0 ? '+' : '−'}${Math.abs(effect.amount)} ${effect.stat} for ${targetLabel(effect.target)}${condition}${reason}`];
    case 'TRANSFER_WEALTH':
      return [`Transfer ${Math.abs(effect.amount).toLocaleString()} Wealth to ${targetLabel(effect.target)}${reason}`];
    case 'UPGRADE_TOKEN':
      return [`${effect.amount >= 0 ? '+' : '−'}${Math.abs(effect.amount)} Upgrade Token${Math.abs(effect.amount) === 1 ? '' : 's'}${reason}`];
    case 'MODIFY_SALARY':
      return [`${effect.amount >= 0 ? '+' : '−'}${Math.abs(effect.amount).toLocaleString()} salary for ${targetLabel(effect.target)}${condition}${reason}`];
    case 'PROTECT':
      return [`Protect ${targetLabel(effect.target)}${effect.amount ? ` for ${effect.amount} effect${effect.amount === 1 ? '' : 's'}` : ''}${effect.blockedEffectTypes?.length ? ` from ${effect.blockedEffectTypes.join(', ')}` : ''}${reason}`];
    case 'REWARD_MODIFIER':
      return [`${effect.amount >= 0 ? '+' : '−'}${Math.abs(effect.amount)} ${effect.stat} reward modifier for ${targetLabel(effect.target)}${condition}${reason}`];
    case 'DOUBLE_OR_NOTHING':
      return [`Double-or-nothing chance: ${Math.round(effect.chance * 100)}%${reason}`];
    case 'RISK':
      return [
        `Risk chance: ${Math.round(effect.chance * 100)}%${reason}`,
        ...effect.win.flatMap((entry) => effectInstructions(entry).map((line) => `On win: ${line}`)),
        ...effect.loss.flatMap((entry) => effectInstructions(entry).map((line) => `On loss: ${line}`)),
      ];
  }
}

export function CardPreviewModal({ card, onClose }: { card: CardDefinition; onClose: () => void }) {
  const dialogRef = useRef<HTMLElement>(null);
  const deck = getDeck(card.deck);
  const instructions = card.effects.flatMap(effectInstructions);
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);
  return (
    <div
      className="card-preview-backdrop"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
      data-testid="card-preview-backdrop"
    >
      <section
        ref={dialogRef}
        className="card-preview-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-preview-title"
        tabIndex={-1}
        data-testid="card-preview-dialog"
      >
        <header className="card-preview-header">
          <div>
            <span className="eyebrow">{deck.name}</span>
            <h2 id="card-preview-title">{card.title}</h2>
          </div>
          <button type="button" className="card-preview-close" onClick={onClose} aria-label="Close card preview" data-testid="button-close-card-preview">×</button>
        </header>
        <div className="card-preview-content">
          <div className="card-preview-art">
            <RedlineCard deck={card.deck} face="front" card={card} className="card-preview-face" />
          </div>
          <div className="card-preview-rules">
            <p className="mono card-preview-category">{deck.name.toUpperCase()}</p>
            <h3>{card.title}</h3>
            <section>
              <h4>DESCRIPTION</h4>
              <p>{card.description}</p>
            </section>
            <section className="card-preview-primary-effect">
              <h4>GAMEPLAY EFFECT</h4>
              <p>{card.effect}</p>
              {card.value && card.value !== '—' && <strong>{card.value}</strong>}
            </section>
            {instructions.length > 0 && (
              <section>
                <h4>RULES AND CONDITIONS</h4>
                <ul>{instructions.map((instruction, index) => <li key={`${index}-${instruction}`}>{instruction}</li>)}</ul>
              </section>
            )}
            {card.partyChallenge && (
              <section className="card-preview-party">
                <h4>CHALLENGE INSTRUCTIONS</h4>
                <p>{card.partyChallenge.prompt}</p>
                <p><b>Participants:</b> {targetLabel(card.partyChallenge.target)} · <b>Flow:</b> {card.partyChallenge.flow.toLowerCase()}</p>
                <p><b>Safety:</b> {card.partyChallenge.safetyNote}</p>
                {!!card.partyChallenge.choices?.length && <ul>{card.partyChallenge.choices.map((choice) => <li key={choice.label}>{choice.label}: {targetLabel(choice.target)}</li>)}</ul>}
              </section>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function BioPartyCardFace({ card, compact = false }: { card: CardDefinition; compact?: boolean }) {
  const artworkUrl = getCardArtworkUrl(card.id);
  const prompt = card.partyChallenge?.prompt ?? card.description;
  return (
    <div className={`bio-party-card ${compact ? 'bio-party-card-compact' : 'bio-party-card-active'}`} data-testid={compact ? `bio-party-card-${card.id}` : 'bio-party-prompt'}>
      {artworkUrl && <img src={artworkUrl} alt="" className="bio-party-card-art" loading="eager" decoding="async" />}
      <div className="bio-party-card-copy">
        <span className="mono">BIO UPGRADE / {getDeck(card.deck).name.toUpperCase()}</span>
        <b>{card.title}</b>
        {compact ? <p>{prompt}</p> : <ExpandableText text={prompt} className="bio-party-card-expandable" />}
        {!compact && card.partyChallenge?.safetyNote && <small>{card.partyChallenge.safetyNote}</small>}
      </div>
    </div>
  );
}

type Props = {
  activeDeck?: DeckId;
  activeCard?: CardDefinition;
  offeredCards?: CardDefinition[];
  partyPlayers?: MatchPlayer[];
  partyActorId?: string;
  partyCanAct?: boolean;
  boardId?: BoardId;
  inlineDecision?: boolean;
  cardStage?: 'choice' | 'draw' | 'resolved';
  cardPiles?: CardPileMap;
  onResolveCard?: () => void;
  onChooseGambleCard?: (cardId: string) => void;
  onResolvePartyChallenge?: (participantIds: string[], passed: boolean, resolution?: string) => void;
  onAcknowledge?: () => void;
  isCPU?: boolean;
  requireHumanAcknowledgement?: boolean;
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
  boardId = 'REDLINE_UPGRADE',
  inlineDecision = false,
  cardStage,
  cardPiles,
  onResolveCard,
  onChooseGambleCard,
  onResolvePartyChallenge,
  onAcknowledge,
  isCPU = false,
  requireHumanAcknowledgement = false,
  actorName = isCPU ? 'CPU' : 'You',
  actorLabel = isCPU ? 'CPU' : 'YOU',
  resultSummary,
  showDeckBay = true,
}: Props) {
  const [minimumReadTimeComplete, setMinimumReadTimeComplete] = useState(false);
  const [partyParticipantIds, setPartyParticipantIds] = useState<string[]>([]);
  const [partyOutcome, setPartyOutcome] = useState('');
  const [previewCard, setPreviewCard] = useState<CardDefinition | null>(null);
  const previewTriggerRef = useRef<HTMLElement | null>(null);
  const drawReadTimeMs = isCPU ? CPU_CARD_DRAW_MS : CARD_READ_MINIMUM_MS;
  const drawReadTimeSeconds = isCPU ? CPU_CARD_DRAW_SECONDS : CARD_READ_MINIMUM_SECONDS;

  useEffect(() => {
    setMinimumReadTimeComplete(false);
    if (!activeDeck) return;
    const timer = window.setTimeout(() => setMinimumReadTimeComplete(true), drawReadTimeMs);
    return () => window.clearTimeout(timer);
  }, [activeDeck, activeCard?.id, cardStage, drawReadTimeMs]);
  useEffect(() => {
    setPartyParticipantIds([]);
    setPartyOutcome('');
  }, [activeCard?.id]);
  useEffect(() => {
    if (!previewCard) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPreviewCard(null);
        requestAnimationFrame(() => previewTriggerRef.current?.focus());
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [previewCard]);

  const openPreview = (card: CardDefinition, trigger: HTMLElement) => {
    previewTriggerRef.current = trigger;
    setPreviewCard(card);
  };
  const closePreview = () => {
    setPreviewCard(null);
    requestAnimationFrame(() => previewTriggerRef.current?.focus());
  };

  const activeCardResolved = cardStage === 'resolved' && activeCard;
  const partyChallenge: PartyChallenge | undefined = activeCard?.partyChallenge;
  const cpuCardNeedsHumanAcknowledgement = Boolean(isCPU && requireHumanAcknowledgement && activeCardResolved && !partyChallenge);
  const requiredParticipants = partyChallenge?.target === 'SELECTED_PLAYER' || partyChallenge?.target === 'SELF_AND_SELECTED' ? 1
    : partyChallenge?.target === 'TWO_SELECTED_PLAYERS' ? 2 : 0;
  const selectablePlayers = partyPlayers.filter(player => player.playerId !== partyActorId);
  const participatingIds = partyChallenge && partyActorId
    ? getPartyParticipantIds(partyChallenge, partyPlayers.map(player => player.playerId), partyActorId, partyParticipantIds, partyOutcome)
    : [];
  const participatingNames = participatingIds.map(id => partyPlayers.find(player => player.playerId === id)?.displayName).filter(Boolean);
  const togglePartyParticipant = (playerId: string) => setPartyParticipantIds(current => {
    if (current.includes(playerId)) return current.filter(id => id !== playerId);
    return current.length < requiredParticipants ? [...current, playerId] : current;
  });
  const presentationStep = activeCardResolved ? 3 : cardStage === 'choice' ? 1 : activeCard ? 2 : 0;
  const cardDescription = cardStage === 'choice'
    ? 'Two cards are revealed. Choose one to resolve; the other returns to the bottom of the deck.'
    : partyChallenge?.prompt ?? (activeCardResolved
      ? resultSummary || activeCard?.description
      : activeCard?.description) ?? '';
  return (
    <>
      {activeDeck && (
        <section
          className="card-draw-panel"
          aria-label={`${getDeck(activeDeck).name} card drawn by ${actorLabel}`}
          aria-modal={!inlineDecision}
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
             {cardDescription && <ExpandableText className="card-draw-description" text={cardDescription} />}
          </div>
          {cardStage === 'choice' && offeredCards?.length ? (
            <div className="card-choice-grid" data-testid="gamble-card-choices">
              {offeredCards.map((card) => (
                <article className="card-choice-option" key={card.id}>
                  <button
                    className="card-choice-preview"
                    type="button"
                    aria-label={`Preview ${card.title}`}
                    onClick={(event) => openPreview(card, event.currentTarget)}
                    data-testid={`button-preview-card-${card.id}`}
                  >
                    {card.partyChallenge ? <BioPartyCardFace card={card} compact /> : <RedlineCard deck={card.deck} face="front" card={card} />}
                    <span>{card.title}</span>
                    <small>OPEN FULL CARD</small>
                  </button>
                  {!isCPU && (
                    <button
                      className="action card-choice-confirm"
                      type="button"
                      disabled={!minimumReadTimeComplete || !partyCanAct}
                      onClick={() => onChooseGambleCard?.(card.id)}
                      data-testid={`choose-gamble-${card.id}`}
                    >
                      CHOOSE THIS CARD
                    </button>
                  )}
                </article>
              ))}
            </div>
          ) : (
            partyChallenge
              ? activeCard ? (
                <button className="card-draw-preview-trigger" type="button" onClick={(event) => openPreview(activeCard, event.currentTarget)} aria-label={`Open full preview of ${activeCard.title}`} data-testid={`button-preview-card-${activeCard.id}`}>
                  <BioPartyCardFace card={activeCard} />
                  <span>OPEN FULL CARD</span>
                </button>
              ) : null
              : <div className={`card-draw-stage ${activeCard ? 'revealed' : ''}`} key={activeCard?.id ?? activeDeck}>
                {activeCard ? (
                  <button className="card-draw-preview-trigger" type="button" onClick={(event) => openPreview(activeCard, event.currentTarget)} aria-label={`Open full preview of ${activeCard.title}`} data-testid={`button-preview-card-${activeCard.id}`}>
                    <RedlineCard deck={activeDeck} face="front" card={activeCard} />
                    <span>OPEN FULL CARD</span>
                  </button>
                ) : <RedlineCard deck={activeDeck} face="back" />}
              </div>
          )}
          <div className="card-draw-action">
              {isCPU && !cpuCardNeedsHumanAcknowledgement ? (
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
                    <p className="mono" data-testid="party-participation">
                      {participatingNames.length ? `PARTICIPANTS: ${participatingNames.join(', ')}` : requiredParticipants ? 'CHOOSE THE PARTICIPANT BELOW.' : partyChallenge.choices ? 'CHOOSE YOUR CHALLENGE BELOW.' : 'EVERYONE ELSE PARTICIPATES.'}
                    </p>
                    {requiredParticipants > 0 && <div className="bio-party-targets" role="group" aria-label="Choose party challenge participants">
                      {selectablePlayers.map(player => (
                        <PlayerTargetOption
                          key={player.playerId}
                          player={player}
                          boardId={boardId}
                          selected={partyParticipantIds.includes(player.playerId)}
                          disabled={!partyCanAct || (!partyParticipantIds.includes(player.playerId) && partyParticipantIds.length >= requiredParticipants)}
                          onSelect={() => togglePartyParticipant(player.playerId)}
                        />
                      ))}
                    </div>}
                    <p className="mono">{partyChallenge.flow === 'VOTE' ? 'ASK THE TABLE TO VOTE, THEN RECORD THE OUTCOME.' : partyChallenge.flow === 'CHOICE' ? 'JOIN THE CHALLENGE OR PASS.' : 'COMPLETE THE CHALLENGE OR PASS.'}</p>
                    {partyChallenge.flow !== 'CONFIRM' && <label className="bio-party-outcome">{partyChallenge.flow === 'VOTE' ? 'Record the group vote' : 'Record the choice made'}{partyChallenge.choices
                      ? <select value={partyOutcome} onChange={event => setPartyOutcome(event.target.value)} data-testid="select-party-choice"><option value="">Choose a challenge</option>{partyChallenge.choices.map(choice => <option key={choice.label} value={choice.label}>{choice.label}</option>)}</select>
                      : <input value={partyOutcome} maxLength={120} onChange={event => setPartyOutcome(event.target.value)} placeholder={partyChallenge.flow === 'VOTE' ? 'Winning option / group result' : 'Choice selected'} />}</label>}
                    <button type="button" className="action lime-action" disabled={!partyCanAct || !minimumReadTimeComplete || partyParticipantIds.length !== requiredParticipants || (partyChallenge.target === 'ALL_EXCEPT_SELF' && selectablePlayers.length === 0) || (partyChallenge.flow !== 'CONFIRM' && !partyOutcome.trim())} onClick={() => onResolvePartyChallenge?.(partyParticipantIds, false, partyOutcome.trim() || undefined)} data-testid="button-complete-party-challenge">{requiredParticipants > 0 ? 'CONFIRM TARGET' : 'CHALLENGE COMPLETE'}</button>
                    <button type="button" className="text-link" disabled={!minimumReadTimeComplete} onClick={() => onResolvePartyChallenge?.([], true)} data-testid="button-pass-party-challenge">PASS / NO PENALTY</button>
                  </div>
                ) : <p className="mono">WAITING FOR {actorName.toUpperCase()} TO RESOLVE THE CHALLENGE.</p>
                : cardStage === 'choice'
               ? <p className="mono">CHOOSE ONE CARD TO RESOLVE</p>
               : activeCardResolved
               ? <>
                   {cpuCardNeedsHumanAcknowledgement && <p className="mono card-human-acknowledgement">CPU EFFECT APPLIED // ACKNOWLEDGE TO CONTINUE</p>}
                   <button type="button" className="action lime-action" onClick={onAcknowledge} disabled={!minimumReadTimeComplete} aria-describedby={!minimumReadTimeComplete ? 'card-read-time-reason' : undefined} data-testid="button-acknowledge-card">{cpuCardNeedsHumanAcknowledgement ? 'ACKNOWLEDGE CPU CARD EFFECT' : 'CONTINUE RUN'} <span aria-hidden="true">↗</span></button>
                 </>
              : onResolveCard
                ? <button type="button" className="action" onClick={onResolveCard} disabled={!minimumReadTimeComplete} aria-describedby={!minimumReadTimeComplete ? 'card-read-time-reason' : undefined} data-testid="button-draw-card">RESOLVE CARD EFFECT <span aria-hidden="true">↗</span></button>
                : <p className="mono">FINAL GAMBLE // CARD REVEALED, RESULT NEXT</p>}
            {!isCPU && !minimumReadTimeComplete && <small className="card-read-time-reason" id="card-read-time-reason">CARD ON TABLE / TAKE A MOMENT TO READ IT</small>}
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
      {previewCard && <CardPreviewModal card={previewCard} onClose={closePreview} />}
    </>
  );
}