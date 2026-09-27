import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { getCharacter } from '@/game/characters';
import type { WealthEvent } from '@/game/match';
import { formatMoney, getCareer, getCategory, SALARY_TIERS } from '@/game/careers';
import { useGame } from '@/game/state';
import { CareerGlyph } from './career-reveal';
import { GameBoard } from './game-board';
import { DiceRoller } from './dice-roller';
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
  const onRollComplete = useCallback(() => dispatchMatch({ type: 'REVEAL' }), [dispatchMatch]);
  const latestEvent: WealthEvent | undefined = match?.wealthEvents.at(-1);
  const lastSeenEvent = useRef(latestEvent?.id);
  const [visibleEvent, setVisibleEvent] = useState<WealthEvent | null>(null);

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
    } else if (phase === 'landed') {
      delay = turnIndex === 0 ? 2300 : 1700;
      callback = () => dispatchMatch({ type: 'NEXT_TURN' });
    } else return;
    const timer = window.setTimeout(callback, delay);
    return () => window.clearTimeout(timer);
  }, [match === null, phase, isCPU, turnIndex, remaining, rollDice, dispatchMatch]);

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
  const landingEvent = landing ? match.wealthEvents?.slice().reverse().find((event) => event.playerIndex === landing.playerIndex && event.space === landing.space.number) : undefined;

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
          <small>{currentCharacter?.name} · {match.phase === 'ready' ? (active.isCPU ? 'Preparing to roll' : 'Ready to roll') : match.phase === 'rolling' ? 'Dice in motion' : match.phase === 'reveal' ? 'Roll resolved' : match.phase === 'moving' ? `${match.stepsRemaining} steps remaining` : 'Space reached'}</small>
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

      <section className="game-players" aria-label="Players, careers and finances">
        {match.players.map((contestant, index) => {
          const character = getCharacter(contestant.characterId);
          const career = contestant.careerId ? getCareer(contestant.careerId) : undefined;
          const category = career ? getCategory(career.categoryId) : undefined;
          const tier = contestant.salaryTier >= 1 && contestant.salaryTier <= 4 ? SALARY_TIERS[contestant.salaryTier - 1] : 'UNASSIGNED';
          const change = visibleEvent?.playerIndex === index ? visibleEvent : null;
          return (
            <article className={`game-player ${index === match.turnIndex ? 'active' : ''} ${index === 0 ? 'human' : ''}`} key={contestant.playerId} data-slot={index} data-testid={`card-player-${index}`}>
              <div className="game-player-top"><span className="game-player-index mono">0{index + 1} / {contestant.isCPU ? `CPU ${contestant.slot}` : 'YOU'}</span><span className="game-player-position mono">{contestant.position === 0 ? 'START' : `SPACE ${String(contestant.position).padStart(2, '0')}`}</span></div>
              <strong className="game-player-name">{character?.name ?? contestant.displayName}</strong>
              <div className="game-player-career">
                <CareerGlyph icon={career?.icon || career?.name || 'career'} />
                <div><span className="mono">{category?.name ?? 'CAREER'}</span><b data-testid={`text-player-career-${index}`}>{career?.name ?? 'Unassigned'}</b></div>
              </div>
              <div className={`game-player-salary salary-tier-${contestant.salaryTier}`}><span className="mono">SALARY / {tier}</span><b data-testid={`text-player-salary-${index}`}>{formatMoney(contestant.salaryAmount)}</b></div>
              <div className="game-player-wealth">
                <span className="mono">WEALTH</span>
                <WealthCounter amount={contestant.wealth} />
                {change && <span className={`wealth-change ${change.amount < 0 ? 'negative' : ''}`} key={change.id}>{change.amount >= 0 ? '+' : '−'}{formatMoney(Math.abs(change.amount))}</span>}
              </div>
              <div className="game-player-stats">
                {([['AI SKILL', contestant.aiSkill], ['FAME', contestant.fame], ['LIFESTYLE', contestant.lifestyle], ['INFLUENCE', contestant.influence]] as const).map(([label, value]) => (
                  <div key={label}><span className="mono">{label}</span><b>{value.toLocaleString()}</b></div>
                ))}
              </div>
            </article>
          );
        })}
      </section>

      <GameBoard
        players={match.players}
        activePlayerId={active.playerId}
        landingPosition={match.phase === 'landed' ? landing?.space.number ?? null : null}
        movingPlayerId={match.phase === 'moving' ? active.playerId : null}
      />

      <section className="game-console">
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
                <p>{landingEvent ? `Payday: ${landingEvent.amount >= 0 ? '+' : '−'}${formatMoney(Math.abs(landingEvent.amount))} Wealth for ${match.players[landing.playerIndex].displayName}.` : landing.space.number === 75 ? 'Finish boundary reached. End-game rules arrive in a later phase.' : landing.space.type === 'NORMAL' ? 'No effect on this space.' : `Placeholder ${landing.space.type.toLowerCase()} space. Effects unlock in a later phase.`}</p>
              </>
            ) : (
              <><span className="mono">LANDING REPORT</span><p>Roll the dice to reveal your first destination.</p></>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}