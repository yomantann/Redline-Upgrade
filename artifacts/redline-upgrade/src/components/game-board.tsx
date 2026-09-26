import { useEffect, useRef } from 'react';
import { BOARD_SPACES } from '../game/board-data';
import type { MatchPlayer } from '../game/match';
import { CharacterPiece } from './character-piece';
import './game-board.css';

export interface GameBoardProps {
  players: MatchPlayer[];
  activePlayerId: string;
  landingPosition: number | null;
  movingPlayerId: string | null;
}

function BoardPawns({
  occupants,
  activePlayerId,
  movingPlayerId,
  landing,
}: {
  occupants: MatchPlayer[];
  activePlayerId: string;
  movingPlayerId: string | null;
  landing: boolean;
}) {
  return (
    <div className="ru-board__pawns" data-count={occupants.length} aria-label={occupants.map((player) => player.displayName).join(', ')}>
      {occupants.map((player) => {
        const active = player.playerId === activePlayerId;
        const moving = player.playerId === movingPlayerId;
        return (
          <div
            className="ru-board__pawn"
            data-active={active}
            data-moving={moving}
            data-testid={`board-pawn-${player.playerId}`}
            title={`${player.displayName} · space ${player.position}`}
            key={player.playerId}
          >
            <CharacterPiece
              characterId={player.characterId}
              name={player.displayName}
              compact
              selected={active}
              motion={moving ? 'moving' : landing && active ? 'landing' : 'idle'}
            />
            <span className="ru-board__pawn-index" aria-hidden="true">{String(player.slot + 1).padStart(2, '0')}</span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * A five-pass, serpentine 75-space circuit. Space 1 begins at the lower left;
 * successive rows reverse direction so the path never teleports across a row.
 */
export function GameBoard({ players, activePlayerId, landingPosition, movingPlayerId }: GameBoardProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const occupants = new Map<number, MatchPlayer[]>();
  for (const player of players) {
    const at = Math.max(0, Math.min(75, player.position));
    const group = occupants.get(at) ?? [];
    group.push(player);
    occupants.set(at, group);
  }
  const activePlayer = players.find((player) => player.playerId === activePlayerId);
  const startOccupants = occupants.get(0) ?? [];

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !activePlayer) return;
    const target = activePlayer.position === 0
      ? viewport.querySelector<HTMLElement>('.ru-board__start')
      : viewport.querySelector<HTMLElement>(`[data-testid="board-space-${activePlayer.position}"]`);
    if (!target) return;
    const left = target.offsetLeft - viewport.clientWidth / 2 + target.clientWidth / 2;
    viewport.scrollTo({ left: Math.max(0, left), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }, [activePlayer?.position, activePlayerId]);

  return (
    <section className="ru-board" aria-label="Redline Upgrade 75-space game board" data-testid="game-board">
      <header className="ru-board__masthead">
        <div>
          <span className="ru-board__overline">Circuit 01 / the upgrade route</span>
          <h2 className="ru-board__title">The redline circuit</h2>
        </div>
        <div className="ru-board__meta">
          <strong>75 spaces</strong><br />
          Start low. Finish high.
        </div>
      </header>

      <div className="ru-board__viewport" ref={viewportRef} role="region" tabIndex={0} aria-label="Scrollable game board track">
        <div className="ru-board__surface">
          <div className="ru-board__grid">
            {[1, 2, 3, 4, 5].map((row) => <span key={`rail-${row}`} aria-hidden="true" className={`ru-board__row-rail ru-board__row-rail--${row}`} />)}
            {[1, 2, 3, 4].map((turn) => <span key={`turn-${turn}`} aria-hidden="true" className={`ru-board__turn ru-board__turn--${turn}`} />)}
            {BOARD_SPACES.map((space) => {
              const routeRow = Math.floor((space.number - 1) / 15);
              const routeColumn = (space.number - 1) % 15;
              const column = routeRow % 2 === 0 ? routeColumn + 1 : 15 - routeColumn;
              const row = 5 - routeRow;
              const onSpace = occupants.get(space.number) ?? [];
              const isLanding = landingPosition === space.number;
              const isActive = activePlayer?.position === space.number;
              const isMoving = onSpace.some((player) => player.playerId === movingPlayerId);
              return (
                <div
                  key={space.number}
                  className={[
                    'ru-board__cell',
                    `ru-board__cell--${space.type.toLowerCase()}`,
                    onSpace.length && 'ru-board__cell--occupied',
                    isLanding && 'ru-board__cell--landing',
                    isActive && 'ru-board__cell--active',
                    isMoving && 'ru-board__cell--moving',
                  ].filter(Boolean).join(' ')}
                  style={{ gridRow: row, gridColumn: column }}
                  data-testid={`board-space-${space.number}`}
                  aria-label={`Space ${space.number}, ${space.type.toLowerCase()}${onSpace.length ? `, occupied by ${onSpace.map((player) => player.displayName).join(' and ')}` : ''}${isLanding ? ', landing space' : ''}`}
                >
                  <span className="ru-board__cell-number">{String(space.number).padStart(2, '0')}</span>
                  {space.number === 75 && <span className="ru-board__finish-label">FINISH</span>}
                  <span className="ru-board__cell-label">{space.type}</span>
                  {onSpace.length > 0 && <BoardPawns occupants={onSpace} activePlayerId={activePlayerId} movingPlayerId={movingPlayerId} landing={isLanding} />}
                </div>
              );
            })}
          </div>
          <div className="ru-board__start" data-testid="board-start-pad" aria-label={`Start pad, ${startOccupants.length} players`}>
            <span className="ru-board__start-mark" aria-hidden="true">00</span>
            <div className="ru-board__start-copy">
              <span className="ru-board__start-label">START PAD</span>
              <span className="ru-board__start-sub">All runners enter here</span>
            </div>
            <div className="ru-board__start-pawns">
              <BoardPawns occupants={startOccupants} activePlayerId={activePlayerId} movingPlayerId={movingPlayerId} landing={landingPosition === 0} />
            </div>
          </div>
        </div>
      </div>
      <footer className="ru-board__foot">
        <div className="ru-board__legend" aria-label="Space type legend">
          <span><i />Route</span>
          <span className="event"><i />Event</span>
          <span className="gamble"><i />Gamble</span>
          <span className="milestone"><i />Milestone</span>
        </div>
        <span className="ru-board__scroll-cue">Scroll sideways to follow the circuit →</span>
      </footer>
    </section>
  );
}

export default GameBoard;