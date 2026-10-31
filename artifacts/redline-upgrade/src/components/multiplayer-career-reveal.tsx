import { useEffect, useRef } from 'react';
import type { MatchPlayer } from '@/game/match';
import { ExpandableText } from './expandable-text';
import './multiplayer-career-reveal.css';

export interface MultiplayerCareer {
  id: string;
  name: string;
  description: string;
  abilityName: string;
  abilityDescription: string;
}

export function MultiplayerCareerReveal({
  player,
  career,
  waitingForPlayers,
  onConfirm,
}: {
  player: MatchPlayer;
  career: MultiplayerCareer;
  waitingForPlayers: number;
  onConfirm: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => confirmRef.current?.focus(), []);

  return (
    <div className="multiplayer-career-backdrop">
      <section className="multiplayer-career-card" role="dialog" aria-modal="true" aria-labelledby="multiplayer-career-title">
        <div className="multiplayer-career-kicker mono">ASSIGNED CAREER // {career.id}</div>
        <p className="multiplayer-career-player">{player.displayName} · {player.characterId}</p>
        <h2 className="display" id="multiplayer-career-title">{career.name}</h2>
        <ExpandableText text={career.description} className="multiplayer-career-description" />
        <div className="multiplayer-career-salary">
          <span className="mono">YOUR SALARY</span>
          <strong>{`$${player.salaryAmount.toLocaleString()}`}</strong>
          <small>{player.salaryTier ? `TIER ${player.salaryTier}` : 'ASSIGNED FOR THIS MATCH'}</small>
        </div>
        <section className="multiplayer-career-ability">
          <span className="mono">CAREER ABILITY</span>
          <h3>{career.abilityName}</h3>
          <ExpandableText text={career.abilityDescription} className="multiplayer-career-ability-description" />
        </section>
        <button ref={confirmRef} type="button" className="action lime-action" onClick={onConfirm} data-testid="button-confirm-multiplayer-career">
          Confirm career <span aria-hidden="true">↗</span>
        </button>
        {waitingForPlayers > 0 && <small className="multiplayer-career-waiting mono">WAITING FOR {waitingForPlayers} OTHER PLAYER{waitingForPlayers === 1 ? '' : 'S'} TO CONFIRM</small>}
      </section>
    </div>
  );
}
