import { useCallback, useEffect } from 'react';
import { useLocation } from 'wouter';
import { getCharacter } from '@/game/characters';
import { useGame } from '@/game/state';
import { GameBoard } from './game-board';
import { DiceRoller } from './dice-roller';
import './game-screen.css';

export function GameScreen() {
  const [, navigate] = useLocation();
  const { match, dispatchMatch, rollDice } = useGame();
  const phase = match?.phase;
  const turnIndex = match?.turnIndex;
  const remaining = match?.stepsRemaining;
  const isCPU = match?.players[match.turnIndex].isCPU;
  const onRollComplete = useCallback(() => dispatchMatch({ type: 'REVEAL' }), [dispatchMatch]);

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
      <button className="action" type="button" onClick={() => navigate('/characters')}>Choose your character <span aria-hidden>↗</span></button>
    </main>
  );

  const active = match.players[match.turnIndex];
  const currentCharacter = getCharacter(active.characterId);
  const landing = match.lastLanding;
  const roll = match.roll;

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

      <section className="game-players" aria-label="Players and positions">
        {match.players.map((contestant, index) => (
          <div className={`game-player ${index === match.turnIndex ? 'active' : ''}`} key={contestant.playerId} data-slot={index}>
            <span className="game-player-index mono">0{index + 1} / {contestant.isCPU ? 'CPU' : 'YOU'}</span>
            <strong>{getCharacter(contestant.characterId)?.name}</strong>
            <span className="game-player-position mono">{contestant.position === 0 ? 'START' : `SPACE ${String(contestant.position).padStart(2, '0')}`}</span>
          </div>
        ))}
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
            <span className="mono">POSITION {active.position === 0 ? 'START' : `${active.position} / 75`}</span>
          </div>
          <div className="readout-stats">
            {([['WEALTH', active.wealth], ['AI SKILL', active.aiSkill], ['FAME', active.fame], ['LIFESTYLE', active.lifestyle], ['INFLUENCE', active.influence]] as const).map(([label, value]) => (
              <div key={label}><span className="mono">{label}</span><strong>{value.toLocaleString()}</strong></div>
            ))}
          </div>
          <div className="readout-landing" aria-live="polite">
            {landing ? (
              <>
                <span className="mono">LAST LANDING / {match.players[landing.playerIndex].displayName}</span>
                <div><strong>SPACE {String(landing.space.number).padStart(2, '0')}</strong><b>{landing.space.type}</b></div>
                <p>{landing.space.number === 75 ? 'Finish boundary reached. End-game rules arrive in a later phase.' : landing.space.type === 'NORMAL' ? 'No effect on this space.' : `Placeholder ${landing.space.type.toLowerCase()} space. Effects unlock in a later phase.`}</p>
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