import { useEffect, useRef } from 'react';
import type { DiceResult, TurnPhase } from '../game/match';
import './game-board.css';

export interface DiceRollerProps {
  roll: DiceResult | null;
  phase: TurnPhase;
  disabled: boolean;
  onRoll: () => void;
  onRollComplete: () => void;
  rollerName: string;
  isHuman: boolean;
  disabledReason?: string;
}

function D4({ value, index }: { value: number | null; index: number }) {
  return (
    <div className="ru-dice__die" aria-label={`Die ${index}: ${value ?? 'not rolled'}`} data-testid={`dice-die-${index}`}>
      <span className="ru-dice__die-index" aria-hidden="true">D4 / 0{index}</span>
      <span className="ru-dice__die-body">
        <span className="ru-dice__face" data-testid={`dice-value-${index}`}>{value ?? '—'}</span>
      </span>
      <span className="ru-dice__shadow" aria-hidden="true" />
    </div>
  );
}

export function DiceRoller({ roll, phase, disabled, onRoll, onRollComplete, rollerName, isHuman, disabledReason }: DiceRollerProps) {
  const completeRef = useRef(onRollComplete);
  const firedRef = useRef(false);
  completeRef.current = onRollComplete;

  useEffect(() => {
    if (phase !== 'rolling') {
      firedRef.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      if (firedRef.current) return;
      firedRef.current = true;
      completeRef.current();
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const showingResult = phase === 'reveal' || phase === 'moving' || phase === 'decision' || phase === 'landed' || phase === 'endgame' || phase === 'complete';
  const canRoll = isHuman && phase === 'ready' && !disabled;
  const phaseLabel: Record<TurnPhase, string> = {
    ready: 'Awaiting throw',
    rolling: 'In motion',
    reveal: 'Roll confirmed',
    moving: 'Runner advancing',
    decision: 'Choice in progress',
    landed: 'Position secured',
    endgame: 'Final decision',
    complete: 'Match complete',
  };

  return (
    <section className="ru-dice" data-phase={phase} aria-label="Two four-sided dice roller" data-testid="dice-roller">
      <header className="ru-dice__header">
        <div>
          <span className="ru-dice__eyebrow">Turn mechanism / 2 × D4</span>
          <h2 className="ru-dice__title">{isHuman ? 'Your throw' : `${rollerName}'s throw`}</h2>
        </div>
        <span className="ru-dice__phase" role="status" data-testid="dice-phase">{phaseLabel[phase]}</span>
      </header>
      <div className="ru-dice__tray" aria-live="polite" aria-label={showingResult && roll ? `Dice result: ${roll.die1} and ${roll.die2}, total ${roll.total}` : 'Dice tray'}>
        <D4 value={showingResult ? roll?.die1 ?? null : null} index={1} />
        <D4 value={showingResult ? roll?.die2 ?? null : null} index={2} />
      </div>
      <div className="ru-dice__footer">
        <span className="ru-dice__caption">
          {phase === 'rolling' ? 'The dice are in the air.' : showingResult ? 'The circuit has spoken. Move the distance shown.' : isHuman ? 'Two four-sided dice. One route forward.' : 'CPU is preparing its throw.'}
        </span>
        <div className="ru-dice__total" data-testid="dice-total">
          <span className="ru-dice__total-label">Total</span>
          <strong className="ru-dice__total-value">{showingResult && roll ? String(roll.total).padStart(2, '0') : '—'}</strong>
        </div>
      </div>
      <button
        className="ru-dice__button"
        type="button"
        onClick={onRoll}
        disabled={!canRoll}
        aria-describedby={!canRoll && disabledReason ? 'dice-roll-disabled-reason' : undefined}
        data-testid="button-roll-dice"
        aria-label={isHuman ? 'Roll two four-sided dice' : 'CPU rolls automatically'}
      >
        <span>ROLL DICE</span>
        <span className="ru-dice__button-mark" aria-hidden="true">↗</span>
      </button>
      {!canRoll && disabledReason && <small className="ru-dice__disabled-reason" id="dice-roll-disabled-reason">ROLL UNAVAILABLE / {disabledReason}</small>}
    </section>
  );
}

export default DiceRoller;