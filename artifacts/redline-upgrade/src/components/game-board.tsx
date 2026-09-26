import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { BOARD_SPACES } from '../game/board-data';
import type { MatchPlayer } from '../game/match';
import { ErrorBoundary } from './error-boundary';
import { BoardScene, ROUTE } from './board-scene';
import { BoardFallback } from './board-fallback';
import './game-board.css';
import './board-scene.css';

export interface GameBoardProps {
  players: MatchPlayer[];
  activePlayerId: string;
  landingPosition: number | null;
  movingPlayerId: string | null;
}

const zones = ['THE GRIND', 'THE RISE', 'THE FLEX', 'THE CHAOS', 'THE ENDGAME'];

export function GameBoard({ players, activePlayerId, landingPosition, movingPlayerId }: GameBoardProps) {
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [overview, setOverview] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const active = players.find(p => p.playerId === activePlayerId);
  const activePosition = Math.max(0, Math.min(75, active?.position ?? 0));

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    try {
      const probe = document.createElement('canvas');
      const gl = probe.getContext('webgl2', { failIfMajorPerformanceCaveat: true });
      setWebgl(Boolean(gl));
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
    } catch {
      setWebgl(false);
    }
  }, []);
  // A moving turn should enter the close chase camera automatically; the map remains available.
  useEffect(() => {
    if (movingPlayerId === activePlayerId) setOverview(false);
  }, [movingPlayerId, activePlayerId]);

  return <section className="ru-board ru-tabletop" aria-label="Redline Upgrade 75-space game board" data-testid="game-board">
    <header className="ru-board__masthead">
      <div><span className="ru-board__overline">CIRCUIT 01 / PHYSICAL EDITION</span><h2 className="ru-board__title">The redline circuit<span className="ru-board__title-slash"> / 75</span></h2></div>
      <div className="ru-board__controls" role="group" aria-label="Board camera">
        <button type="button" data-testid="button-board-overview" className={overview ? 'selected' : ''} onClick={() => setOverview(true)} aria-pressed={overview}>01 / FULL CIRCUIT</button>
        <button type="button" data-testid="button-board-follow" className={!overview ? 'selected' : ''} onClick={() => setOverview(false)} aria-pressed={!overview}>02 / FOLLOW PAWN</button>
      </div>
    </header>
    <div className="ru-board__stage">
      <div className="ru-board__stage-index" aria-hidden="true"><span>REDLINE / UPGRADE</span><span>TABLETOP  /  01—75</span></div>
      {webgl === null && <div className="ru-board__loading" aria-label="Preparing 3D tabletop"><span /><span /><span /><p>PREPARING THE CIRCUIT</p></div>}
      {webgl === false && <BoardFallback players={players} activePlayerId={activePlayerId} />}
      {webgl === true && <ErrorBoundary resetKey="redline-tabletop" FallbackComponent={() => <BoardFallback players={players} activePlayerId={activePlayerId} />}>
        <Canvas
          aria-hidden="true"
          data-testid="board-canvas"
          orthographic
          camera={{ position: [2, 39, 37], zoom: 1, near: 0.1, far: 150 }}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          shadows
          dpr={[1, 1.6]}
          onCreated={({ gl }) => { gl.toneMapping = 3; gl.toneMappingExposure = 1.25; }}
        >
          <BoardScene players={players} activePlayerId={activePlayerId} landingPosition={landingPosition} overview={overview} reduceMotion={reduceMotion} />
        </Canvas>
      </ErrorBoundary>}
      <div className="ru-board__telemetry" aria-live="polite">
        <span>LIVE POSITION / {active?.displayName ?? 'RUNNER'}</span>
        <strong>{activePosition === 0 ? 'START' : String(activePosition).padStart(2, '0')}{activePosition > 0 && <small> / 75</small>}</strong>
        <span>{activePosition === 0 ? 'LAUNCH PAD' : zones[Math.floor((activePosition - 1) / 15)]}</span>
      </div>
      <div className="ru-board__minimap" aria-label="Complete circuit overview">
        <span className="ru-board__minimap-label">ROUTE / 00—75</span>
        <svg viewBox="-25 -18 50 36" role="img" aria-label={`Circuit map, active pawn at ${activePosition === 0 ? 'start' : `space ${activePosition}`}`}>
          <polyline points={ROUTE.map(p => `${p.x},${p.z}`).join(' ')} fill="none" stroke="#516b58" strokeWidth=".42" strokeLinejoin="round" strokeLinecap="round" />
          <polyline points={ROUTE.slice(0, activePosition + 1).map(p => `${p.x},${p.z}`).join(' ')} fill="none" stroke="#f96346" strokeWidth=".54" strokeLinejoin="round" strokeLinecap="round" />
          {[10, 20, 30, 45, 60, 75].map(n => <circle key={n} cx={ROUTE[n].x} cy={ROUTE[n].z} r=".52" fill="#f96346" />)}
          <circle cx={ROUTE[activePosition].x} cy={ROUTE[activePosition].z} r=".92" fill="#d4e981" stroke="#14211c" strokeWidth=".3" />
        </svg>
        <span className="ru-board__minimap-endpoints"><span>START</span><span>FINISH</span></span>
      </div>
    </div>
    <footer className="ru-board__foot">
      <div className="ru-board__legend" aria-label="Space type legend">
        <span><i />NORMAL</span><span className="event"><i />EVENT</span><span className="gamble"><i />GAMBLE</span><span className="milestone"><i />MILESTONE</span>
      </div>
      <span className="ru-board__scroll-cue">FIVE ZONES / ONE WAY FORWARD</span>
    </footer>
    {/* Persistent DOM semantics: canvas is a drawing surface, not the source of game state. */}
    <div className="ru-board__accessible" aria-label="Board spaces and occupants">
      <div data-testid="board-start-pad" aria-label={`Start pad, ${players.filter(p => p.position === 0).length} players`}>Start pad, position zero</div>
      {BOARD_SPACES.map(space => {
        const occupants = players.filter(p => p.position === space.number);
        return <div key={space.number} data-testid={`board-space-${space.number}`} aria-label={`Space ${space.number}, ${space.type.toLowerCase()}, ${zones[Math.floor((space.number - 1) / 15)]}${occupants.length ? `, occupied by ${occupants.map(p => p.displayName).join(' and ')}` : ''}${landingPosition === space.number ? ', landing space' : ''}`}>
          Space {space.number}: {space.type}; {occupants.length ? occupants.map(p => p.displayName).join(', ') : 'unoccupied'}
        </div>;
      })}
      {players.map(p => <div key={p.playerId} data-testid={`board-pawn-${p.playerId}`} aria-label={`${p.displayName}, ${p.position === 0 ? 'start pad' : `space ${p.position}`}`}>
        {p.displayName} at {p.position === 0 ? 'start' : `space ${p.position}`}
      </div>)}
    </div>
    <span hidden data-testid="board-webgl-status">{webgl === null ? 'Checking WebGL2' : webgl ? 'WebGL2 ready' : 'WebGL2 unavailable'}</span>
  </section>;
}

export default GameBoard;