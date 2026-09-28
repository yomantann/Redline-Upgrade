import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { getCharacter } from '@/game/characters';
import { getCard } from '@/game/cards';
import { getAsset, type AssetSlot } from '@/game/assets';
import { getDeck } from '@/game/decks';
import type { MatchAction, PendingDecision, WealthEvent } from '@/game/match';
import type { EndgameChoice } from '@/game/endgame';
import { formatMoney, getCareer, getCategory, SALARY_TIERS } from '@/game/careers';
import { useGame } from '@/game/state';
import { CareerGlyph } from './career-reveal';
import { CharacterPortrait } from './character-portrait';
import { GameBoard } from './game-board';
import { DiceRoller } from './dice-roller';
import { MilestoneChoice } from './milestone-choice';
import { PlayerAssets } from './player-assets';
import { UpgradeTokenControls } from './upgrade-token-controls';
import { CardTabletop } from './card-tabletop';
import { FinishLinePanel, MatchResultsPanel } from './finish-line-panel';
import { SpaceIcon } from './space-icon';
import './game-screen.css';

function WealthCounter({ amount, compact = false }: { amount: number; compact?: boolean }) {
  const [display, setDisplay] = useState(amount);
  const lastAmount = useRef(amount);
  useEffect(() => {
    const startAmount = lastAmount.current;
    lastAmount.current = amount;
    if (startAmount === amount || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(amount);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 850);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(startAmount + (amount - startAmount) * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [amount]);
  return <span className={compact ? 'wealth-number compact' : 'wealth-number'} data-testid="text-wealth-counter">{formatMoney(display)}</span>;
}

export function GameScreen() {
  const [, navigate] = useLocation();
  const { match, dispatchMatch, rollDice } = useGame();
  const phase = match?.phase;
  const turnIndex = match?.turnIndex;
  const remaining = match?.stepsRemaining;
  const isCPU = match?.players[match.turnIndex].isCPU;
  const pending = match?.pending;
  const onRollComplete = useCallback(() => dispatchMatch({ type: 'REVEAL' }), [dispatchMatch]);
  const latestEvent: WealthEvent | undefined = match?.wealthEvents.filter(event => event.kind === 'PAYDAY').at(-1);
  const lastSeenEvent = useRef(latestEvent?.id);
  const [visibleEvent, setVisibleEvent] = useState<WealthEvent | null>(null);
  const previousEquipment = useRef(match?.players.map(player => ({ ...player.equipment })) ?? []);
  const [purchaseNotice, setPurchaseNotice] = useState<{ id: string; name: string; amount: number; player: string } | null>(null);
  const previousDecision = useRef<PendingDecision | null>(pending ?? null);
  const [careerLocked, setCareerLocked] = useState(false);

  useEffect(() => {
    if (previousDecision.current?.kind === 'CAREER' && previousDecision.current.stage === 'choice' && !pending && phase !== 'decision') setCareerLocked(true);
    previousDecision.current = pending ?? null;
  }, [pending, phase]);

  useEffect(() => {
    if (!careerLocked) return;
    const timer = window.setTimeout(() => setCareerLocked(false), 3000);
    return () => window.clearTimeout(timer);
  }, [careerLocked]);

  useEffect(() => {
    if (!match) return;
    const slots: AssetSlot[] = ['car', 'lifestyle', 'companion', 'property'];
    let notice: typeof purchaseNotice = null;
    match.players.forEach((player, index) => {
      for (const slot of slots) {
        const id = player.equipment[slot];
        if (id && id !== previousEquipment.current[index]?.[slot]) {
          const asset = getAsset(id);
          if (asset) notice = { id: `${player.playerId}-${id}`, name: asset.name, amount: asset.cost, player: player.isCPU ? `CPU ${player.slot}` : 'YOU' };
        }
      }
    });
    previousEquipment.current = match.players.map(player => ({ ...player.equipment }));
    if (notice) setPurchaseNotice(notice);
  }, [match?.players]);

  useEffect(() => {
    if (!purchaseNotice) return;
    const timer = window.setTimeout(() => setPurchaseNotice(current => current?.id === purchaseNotice.id ? null : current), 4000);
    return () => window.clearTimeout(timer);
  }, [purchaseNotice?.id]);

  useEffect(() => {
    if (!latestEvent || latestEvent.id === lastSeenEvent.current) return;
    lastSeenEvent.current = latestEvent.id;
    setVisibleEvent(latestEvent);
    const timer = window.setTimeout(() => setVisibleEvent((current) => current?.id === latestEvent.id ? null : current), 3800);
    return () => window.clearTimeout(timer);
  }, [latestEvent?.id]);

  useEffect(() => {
    if (!match) return;
    let delay: number;
    let callback: () => void;
    if (phase === 'ready' && isCPU) {
      delay = 850;
      callback = rollDice;
    } else if (phase === 'reveal') {
      delay = 700;
      callback = () => dispatchMatch({ type: 'MOVE' });
    } else if (phase === 'moving') {
      delay = 360;
      callback = () => dispatchMatch({ type: 'STEP' });
    } else if (phase === 'decision' && isCPU && pending) {
      delay = 1050;
      callback = () => dispatchMatch({ type: 'AUTO_DECIDE' });
    } else if (phase === 'landed') {
      if (match.players[match.turnIndex].endgame?.status === 'RESOLVED' && !isCPU) return;
      delay = turnIndex === 0 ? 2300 : 1700;
      callback = () => dispatchMatch({ type: 'NEXT_TURN' });
    } else if (phase === 'endgame' && isCPU) {
      delay = 1150;
      callback = () => dispatchMatch({ type: 'AUTO_DECIDE' });
    } else return;
    const timer = window.setTimeout(callback, delay);
    return () => window.clearTimeout(timer);
  }, [match === null, phase, isCPU, turnIndex, remaining, pending?.kind, pending?.kind === 'CAREER' ? pending.stage : pending?.kind === 'ASSET' ? pending.category : undefined, rollDice, dispatchMatch]);

  if (!match) return (
    <main className="game-gate">
      <span className="eyebrow">NO MATCH LOADED</span>
      <h1 className="display">Start the<br />signal.</h1>
      <button className="action" type="button" onClick={() => navigate('/characters')} data-testid="button-board-choose-character">Choose your character <span aria-hidden>↗</span></button>
    </main>
  );

  const active = match.players[match.turnIndex];
  const currentCharacter = getCharacter(active.characterId);
  const currentCareer = active.careerId ? getCareer(active.careerId) : undefined;
  const landing = match.lastLanding;
  const roll = match.roll;
  const landingEvent = landing ? match.wealthEvents?.slice().reverse().find((event) => event.kind === 'PAYDAY' && event.playerIndex === landing.playerIndex && event.space === landing.space.number) : undefined;
  const recentLog = match.eventLog.slice(-4).reverse();

  if (match.phase === 'complete') {
    return (
      <main className="game-screen game-screen-finish-line">
        <MatchResultsPanel players={match.players} />
      </main>
    );
  }

  if (match.phase === 'endgame' || (match.phase === 'landed' && active.endgame?.status === 'RESOLVED')) {
    if (!active.endgame) return null;
    return (
      <main className="game-screen game-screen-finish-line">
        <FinishLinePanel
          player={active}
          endgame={active.endgame}
          onChoose={(choice: EndgameChoice) => dispatchMatch({ type: 'CHOOSE_ENDGAME', choice })}
          onContinue={() => dispatchMatch({ type: 'NEXT_TURN' })}
        />
      </main>
    );
  }

  return (
    <main className="game-screen">
      <section className="game-head">
        <div>
          <span className="eyebrow">MATCH 01 / LOCAL TABLETOP</span>
          <h1 className="display">The <span>board.</span></h1>
        </div>
        <div className={`turn-signal ${active.isCPU ? 'cpu' : ''}`} aria-live="polite">
          <span className="mono">ROUND {String(match.round).padStart(2, '0')} // TURN {match.turnIndex + 1} OF 4</span>
          <strong className="display">{active.isCPU ? `CPU ${active.slot}'S TURN` : 'YOUR TURN'}</strong>
           <small>{currentCharacter?.name} · {match.phase === 'ready' ? (active.isCPU ? 'Preparing to roll' : 'Ready to roll') : match.phase === 'rolling' ? 'Dice in motion' : match.phase === 'reveal' ? 'Roll resolved' : match.phase === 'moving' ? `${match.stepsRemaining} steps remaining` : match.phase === 'decision' ? pending?.kind === 'CARD' ? 'Card draw in progress' : 'Milestone decision in progress' : 'Space reached'}</small>
          <button className="action turn-roll" type="button" onClick={rollDice} disabled={active.isCPU || match.phase !== 'ready'} data-testid="button-roll-top">ROLL DICE <span aria-hidden="true">↗</span></button>
        </div>
      </section>

      {visibleEvent && (
        <div className={`payday-flash ${visibleEvent.amount < 0 ? 'negative' : ''}`} role="status" aria-live="polite" key={visibleEvent.id}>
          <span className="mono">{match.players[visibleEvent.playerIndex]?.isCPU ? `CPU ${match.players[visibleEvent.playerIndex].slot} / PAYDAY` : 'YOUR PAYDAY'} // SPACE {String(visibleEvent.space).padStart(2, '0')}</span>
          <strong>{visibleEvent.amount >= 0 ? '+' : '−'}{formatMoney(Math.abs(visibleEvent.amount))}</strong>
          <span className="mono">WEALTH {visibleEvent.amount >= 0 ? 'INCREASED' : 'DECREASED'}</span>
        </div>
      )}
      {purchaseNotice && <div className="asset-purchase-flash" role="status" aria-live="polite" key={purchaseNotice.id}><span className="mono">{purchaseNotice.player} / NEW ASSET ACQUIRED</span><strong>{purchaseNotice.name}</strong><span className="mono">−{formatMoney(purchaseNotice.amount)} WEALTH // ADDED TO PLAYER SHEET</span></div>}
      {careerLocked && <div className="career-locked-flash" role="status" aria-live="polite"><span className="mono">SPACE 35 / DECISION COMPLETE</span><strong>CAREER LOCKED IN</strong><span className="mono">SALARY AND WEALTH UNCHANGED</span></div>}

       {match.phase === 'decision' && pending && pending.kind !== 'CARD' && <MilestoneChoice pending={pending} player={active} onAction={dispatchMatch} />}

      <section className="game-players" aria-label="Players, careers and finances">
        {match.players.map((contestant, index) => {
          const character = getCharacter(contestant.characterId);
          const career = contestant.careerId ? getCareer(contestant.careerId) : undefined;
          const category = career ? getCategory(career.categoryId) : undefined;
          const tier = contestant.salaryTier >= 1 && contestant.salaryTier <= 4 ? SALARY_TIERS[contestant.salaryTier - 1] : 'UNASSIGNED';
          const change = visibleEvent?.playerIndex === index ? visibleEvent : null;
          return (
            <article className={`game-player ${index === match.turnIndex ? 'active' : ''} ${index === 0 ? 'human' : ''}`} key={contestant.playerId} data-slot={index} data-testid={`card-player-${index}`}>
              <div className={`game-player-top ${contestant.status === 'FINISHED' ? 'finished' : ''}`}><span className="game-player-index mono">0{index + 1} / {contestant.isCPU ? `CPU ${contestant.slot}` : 'YOU'}</span><span className="game-player-position mono">{contestant.position === 0 ? 'START' : `SPACE ${String(contestant.position).padStart(2, '0')}`}{contestant.status === 'FINISHED' ? ' / FINISHED' : ''}</span></div>
               <div className="game-player-identity">
                 {character && <CharacterPortrait character={character} className="game-player-portrait" />}
                 <div className="game-player-identity-copy"><span className="mono">CHARACTER / {String(index + 1).padStart(2, '0')}</span><strong className="game-player-name">{character?.name ?? contestant.displayName}</strong></div>
               </div>
              <div className="game-player-career">
                <CareerGlyph icon={career?.icon || career?.name || 'career'} />
                  <div>
                    <span className="mono">{category?.name ?? 'CAREER'}</span>
                    <b data-testid={`text-player-career-${index}`}>{career?.name ?? 'Unassigned'}</b>
                    <small title={career?.abilityDescription}>{career?.abilityName ?? 'NO ABILITY ASSIGNED'}</small>
                    {career?.startingBenefitDescription && <small className="mono" title="Career benefit granted only at match start">START BENEFIT / {career.startingBenefitDescription}</small>}
                    {career && (
                      <small className="mono" title="Primary and secondary card-deck affinity">
                        DECK AFFINITY / {getDeck(career.deckAffinity.primary).name}
                        {career.deckAffinity.secondary ? ` · ${getDeck(career.deckAffinity.secondary).name}` : ''}
                      </small>
                    )}
                  </div>
              </div>
              <div className={`game-player-salary salary-tier-${contestant.salaryTier}`}><span className="mono">SALARY / {tier}</span><b data-testid={`text-player-salary-${index}`}>{formatMoney(contestant.salaryAmount)}</b></div>
              <div className="game-player-wealth">
                 <span className="mono"><SpaceIcon name="wealth" size={12} /> WEALTH</span>
                <WealthCounter amount={contestant.wealth} />
                {change && <span className={`wealth-change ${change.amount < 0 ? 'negative' : ''}`} key={change.id}>{change.amount >= 0 ? '+' : '−'}{formatMoney(Math.abs(change.amount))}</span>}
              </div>
              <div className="game-player-stats">
                {([['AI SKILL', contestant.aiSkill], ['FAME', contestant.fame], ['LIFESTYLE', contestant.lifestyle], ['INFLUENCE', contestant.influence]] as const).map(([label, value]) => (
                   <div key={label}><span className="mono"><SpaceIcon name={label === 'AI SKILL' ? 'ai' : label.toLowerCase()} size={11} /> {label}</span><b>{value.toLocaleString()}</b></div>
                ))}
              </div>
               <PlayerAssets equipment={contestant.equipment} assetLevels={contestant.assetLevels} upgradeTokens={contestant.upgradeTokens} heldUpgradeTokens={contestant.heldUpgradeTokens} playerIndex={index} />
            </article>
          );
        })}
      </section>

       {(match.phase !== 'decision' || pending?.kind === 'CARD') && <div className="game-tabletop">
       <div className="game-tabletop-board"><GameBoard
        players={match.players}
        activePlayerId={active.playerId}
        landingPosition={match.phase === 'landed' ? landing?.space.number ?? null : null}
        movingPlayerId={match.phase === 'moving' ? active.playerId : null}
       /></div>
       <CardTabletop
         activeDeck={match.phase === 'decision' && pending?.kind === 'CARD' ? pending.deck : undefined}
         activeCard={match.phase === 'decision' && pending?.kind === 'CARD' ? getCard(pending.cardId) : undefined}
         cardStage={match.phase === 'decision' && pending?.kind === 'CARD' ? pending.stage : undefined}
         cardPiles={match.cardPiles}
         isCPU={active.isCPU}
         onResolveCard={() => dispatchMatch({ type: 'RESOLVE_CARD' })}
         onAcknowledge={() => dispatchMatch({ type: 'ACKNOWLEDGE_CARD' })}
       />
       </div>}

      {match.phase === 'ready' && !active.isCPU && <UpgradeTokenControls player={active} onAction={(action: MatchAction) => dispatchMatch(action)} />}

      {match.phase !== 'decision' && <section className="game-console">
        <DiceRoller
          roll={roll}
          phase={match.phase}
          disabled={active.isCPU || match.phase !== 'ready'}
          onRoll={rollDice}
          onRollComplete={onRollComplete}
          rollerName={active.displayName}
          isHuman={!active.isCPU}
        />
        <div className="game-readout">
          <div className="readout-top mono"><span>FIELD REPORT // LIVE</span><span>2 × D4</span></div>
          <div className="readout-primary">
            <span className="mono">CURRENT PLAYER</span>
            <strong>{active.displayName} <em>/ {currentCharacter?.name}</em></strong>
            <span className="mono">{currentCareer?.name ?? 'UNASSIGNED'} · POSITION {active.position === 0 ? 'START' : `${active.position} / 75`}</span>
          </div>
          <div className="readout-stats">
            <div className="readout-wealth"><span className="mono">WEALTH</span><strong><WealthCounter amount={active.wealth} compact /></strong></div>
            {([['AI SKILL', active.aiSkill], ['FAME', active.fame], ['LIFESTYLE', active.lifestyle], ['INFLUENCE', active.influence]] as const).map(([label, value]) => (
              <div key={label}><span className="mono">{label}</span><strong>{value.toLocaleString()}</strong></div>
            ))}
          </div>
          <div className="readout-landing" aria-live="polite">
            {landing ? (
              <>
                <span className="mono">LAST LANDING / {match.players[landing.playerIndex].displayName}</span>
                <div><strong>SPACE {String(landing.space.number).padStart(2, '0')}</strong><b>{landing.space.payday ? 'PAYDAY' : landing.space.type}</b></div>
                <p>{landingEvent
                  ? `Salary Gate: +${formatMoney(landingEvent.amount)} Wealth for ${match.players[landing.playerIndex].displayName}.`
                  : landing.space.number === 75 ? 'Finish-line decision resolved. The final value is recorded.'
                  : landing.space.type === 'CAREER_CHANGE' ? `Career opportunity resolved. Current salary: ${formatMoney(match.players[landing.playerIndex].salaryAmount)}.`
                  : landing.space.type === 'MILESTONE' ? (() => {
                    const slot = ({ 10: 'car', 30: 'lifestyle', 45: 'companion', 60: 'property' } as const)[landing.space.number as 10 | 30 | 45 | 60];
                    const item = slot ? match.players[landing.playerIndex].equipment[slot] : null;
                    return item ? `${getAsset(item)?.name ?? 'Asset'} acquired and added to the player card.` : 'Milestone passed without a purchase.';
                  })()
                  : landing.space.type === 'NORMAL' ? 'No effect on this space.'
                  : `Placeholder ${landing.space.type.toLowerCase()} space. Effects unlock in a later phase.`}</p>
              </>
            ) : (
              <><span className="mono">LANDING REPORT</span><p>Roll the dice to reveal your first destination.</p></>
            )}
          </div>
          <div className="readout-landing" aria-live="polite">
            <span className="mono">EVENT LOG</span>
            {recentLog.length ? recentLog.map((entry) => (
              <p key={entry.id}>
                <strong>{entry.label}</strong>
                {entry.source === 'ABILITY' && (
                  <>
                    <br />
                    <small className="mono">TRIGGER / {entry.eventType.replace(/_/g, ' ')}</small>
                  </>
                )}
                <br />
                {entry.detail}
              </p>
            )) : <p>No event activity yet.</p>}
          </div>
        </div>
      </section>}
    </main>
  );
}