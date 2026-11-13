import { memo, useCallback, useEffect, useRef, useState, type ComponentProps, type PointerEvent } from 'react';
import { Canvas } from '@react-three/fiber';
import { getBoardSpaces } from '../game/board-data';
import { SpaceIcon } from './space-icon';
import type { MatchPlayer } from '../game/match';
import type { BoardId } from '../game/boards';
import { ErrorBoundary } from './error-boundary';
import { BoardScene, ROUTE } from './board-scene';
import { BioBoardScene, BIO_ROUTE } from './bio-board-scene';
import { BoardFallback } from './board-fallback';
import './game-board.css';
import './board-scene.css';

export interface GameBoardProps {
  players: MatchPlayer[];
  activePlayerId: string;
  landingPosition: number | null;
  movingPlayerId: string | null;
  finishOrder?: number[];
  boardId?: BoardId;
  preview?: boolean;
  /** Board Focus layout is owned by the screen; the board only exposes the toggle. */
  focusMode?: boolean;
  onToggleFocusMode?: () => void;
}

const redlineZones = ['THE GRIND', 'THE RISE', 'THE FLEX', 'THE CHAOS', 'THE ENDGAME'];
const bioZones = ['NIGHTCLUB', 'CASINO ARCADE', 'VIP LOUNGE', 'HOLO BAR', 'ROOFTOP', 'FESTIVAL', 'THE ARENA'];
const MIN_ZOOM = 0.7;
const isMobileViewport = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 700px)').matches;
function maximumBoardZoom(): number {
  return isMobileViewport() ? 4.8 : 2.8;
}
const clampZoom = (value: number) => Math.min(maximumBoardZoom(), Math.max(MIN_ZOOM, value));

type CameraTarget = { kind: 'active' } | { kind: 'player'; playerId: string } | { kind: 'space'; space: number };
type SceneProps = ComponentProps<typeof BoardScene>;

/**
 * Scenes only depend on what is drawn on the table. Wealth, stats and assets change
 * constantly during play; skipping those keeps the static circuit from re-rendering.
 */
function sameSceneProps(a: SceneProps, b: SceneProps): boolean {
  if (a.activePlayerId !== b.activePlayerId || a.focusPosition !== b.focusPosition || a.landingPosition !== b.landingPosition
    || a.overview !== b.overview || a.reduceMotion !== b.reduceMotion || a.zoom !== b.zoom || a.pan !== b.pan
    || a.onSpaceSelect !== b.onSpaceSelect || a.onSpaceHover !== b.onSpaceHover) return false;
  if ((a.finishOrder ?? []).join(',') !== (b.finishOrder ?? []).join(',')) return false;
  if (a.players.length !== b.players.length) return false;
  return a.players.every((p, i) => {
    const q = b.players[i];
    return p.playerId === q.playerId && p.position === q.position && p.characterId === q.characterId && p.status === q.status
      && p.displayName === q.displayName && p.slot === q.slot;
  });
}
const MemoBoardScene = memo(BoardScene, sameSceneProps);
const MemoBioBoardScene = memo(BioBoardScene, sameSceneProps as (a: ComponentProps<typeof BioBoardScene>, b: ComponentProps<typeof BioBoardScene>) => boolean);

export function GameBoard({ players, activePlayerId, landingPosition, movingPlayerId, finishOrder = [], boardId = 'REDLINE_UPGRADE', preview = false, focusMode = false, onToggleFocusMode }: GameBoardProps) {
  const isBio = boardId === 'BIO_UPGRADE';
  const boardSpaces = getBoardSpaces(boardId);
  const route = isBio ? BIO_ROUTE : ROUTE;
  const zones = isBio ? bioZones : redlineZones;
  // Phone portrait gets a wide-enough chase frame (~5 tiles across) instead of the old
  // 2.1x crop; phone landscape uses the desktop-style frustum at a gentle zoom.
  const defaultFollowZoom = () => {
    if (typeof window === 'undefined') return 1.15;
    const portraitPhone = window.matchMedia('(max-width: 700px) and (orientation: portrait)').matches;
    const landscapePhone = window.matchMedia('(max-height: 500px) and (orientation: landscape)').matches;
    if (preview) return portraitPhone ? 1.05 : isBio ? 1.15 : 1.25;
    return portraitPhone ? 1.3 : landscapePhone ? 1 : 1.25;
  };
  const fitZoom = isBio ? 1 : 1.24;
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [overview, setOverview] = useState(true);
  const [zoom, setZoom] = useState(fitZoom);
  const [followActive, setFollowActive] = useState(false);
  const [target, setTarget] = useState<CameraTarget>({ kind: 'active' });
  const [wheelZoomEnabled, setWheelZoomEnabled] = useState(false);
  const [pan, setPan] = useState({ x: 0, z: 0 });
  const [selectedSpace, setSelectedSpace] = useState<number | null>(null);
  const [hoveredSpace, setHoveredSpace] = useState<number | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; id: number } | null>(null);
  const dragFroze = useRef(false);
  const touchPointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchDistance = useRef<number | null>(null);
  const [reduceMotion, setReduceMotion] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const active = players.find(p => p.playerId === activePlayerId);
  const activePosition = Math.max(0, Math.min(75, active?.position ?? 0));
  const lastActivePosition = useRef(activePosition);
  const info = boardSpaces[(hoveredSpace ?? selectedSpace ?? 0) - 1];
  const activeZoneIndex = isBio
    ? activePosition <= 10 ? 0 : activePosition <= 20 ? 1 : activePosition <= 30 ? 2 : activePosition <= 40 ? 3 : activePosition <= 50 ? 4 : activePosition <= 62 ? 5 : 6
    : Math.min(4, Math.floor(Math.max(0, activePosition - 1) / 15));
  const targetPlayer = target.kind === 'player' ? players.find(p => p.playerId === target.playerId) : undefined;
  // Follow OFF freezes the camera on the last active-pawn position instead of tracking.
  if (followActive || target.kind !== 'active') lastActivePosition.current = activePosition;
  const focusPosition = Math.max(0, Math.min(75,
    target.kind === 'space' ? target.space
      : targetPlayer ? targetPlayer.position
        : followActive ? activePosition : lastActivePosition.current));
  const focusLabel = overview ? 'FULL BOARD'
    : target.kind === 'space' ? `SPACE ${String(target.space).padStart(2, '0')}`
      : targetPlayer ? targetPlayer.displayName.toUpperCase()
        : followActive ? 'FOLLOWING ACTIVE PAWN' : 'FREE CAMERA';
  const onSpaceSelect = useCallback((n: number) => setSelectedSpace(n), []);
  const onSpaceHover = useCallback((n: number | null) => setHoveredSpace(n), []);

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
  // Never force the camera mode on movement: follow mode already tracks the pawn, and
  // full-board / player / space inspection stays exactly where the user left it.
  const movingIsActive = movingPlayerId !== null && movingPlayerId === activePlayerId;
  // Board Focus captures the wheel by default; elsewhere wheel zoom needs the toggle
  // (or a trackpad pinch / Ctrl+wheel) so ordinary page scrolling keeps working.
  const wheelArmed = wheelZoomEnabled || focusMode;
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (event: WheelEvent) => {
      if (!wheelArmed && !event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const step = Math.min(1.25, Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.0018)));
      setZoom(value => clampZoom(value * step));
    };
    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => stage.removeEventListener('wheel', onWheel);
  }, [wheelArmed]);
  useEffect(() => {
    if (!focusMode || !onToggleFocusMode) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onToggleFocusMode(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focusMode, onToggleFocusMode]);

  /** Fit: whole board in frame. Reset: back to the default chase camera on the active pawn. */
  const fitBoard = () => { setOverview(true); setZoom(fitZoom); setPan({ x: 0, z: 0 }); };
  const resetCamera = () => { setOverview(false); setTarget({ kind: 'active' }); setFollowActive(true); setPan({ x: 0, z: 0 }); setZoom(defaultFollowZoom()); };
  const focusPlayer = (playerId: string) => {
    setOverview(false); setPan({ x: 0, z: 0 });
    setTarget(playerId === activePlayerId ? { kind: 'active' } : { kind: 'player', playerId });
    if (playerId === activePlayerId) setFollowActive(true);
    setZoom(value => Math.max(value, defaultFollowZoom()));
  };
  const focusSpace = (space: number) => { setOverview(false); setPan({ x: 0, z: 0 }); setTarget({ kind: 'space', space }); setZoom(value => Math.max(value, defaultFollowZoom())); };
  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    if (event.pointerType === 'touch') {
      touchPointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (touchPointers.current.size >= 2) {
        drag.current = null;
        const [first, second] = [...touchPointers.current.values()];
        pinchDistance.current = Math.hypot(first.x - second.x, first.y - second.y);
        return;
      }
    }
    drag.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
    dragFroze.current = false;
  };
  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch' && touchPointers.current.has(event.pointerId)) {
      touchPointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (touchPointers.current.size >= 2) {
        const [first, second] = [...touchPointers.current.values()];
        const distance = Math.hypot(first.x - second.x, first.y - second.y);
        const previous = pinchDistance.current;
        if (previous && distance > 0) setZoom(value => clampZoom(value * (distance / previous)));
        pinchDistance.current = distance;
        return;
      }
    }
    if (!drag.current || drag.current.id !== event.pointerId) return;
    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;
    drag.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
    if (Math.abs(dx) + Math.abs(dy) < 0.5) return;
    // A manual drag pins the camera where it is: the pan offset becomes relative to a
    // frozen space, so later pawn moves cannot slide the board out from under the user.
    if (!dragFroze.current) {
      dragFroze.current = true;
      if (!overview && target.kind !== 'space') { setTarget({ kind: 'space', space: focusPosition }); setFollowActive(false); }
    }
    // The SVG fallback frames 1200/(zoom*k) px at 19px per world unit; match its scale.
    const units = (webgl === false ? (overview ? 63 : 31.6) : (overview ? 53 : 20)) / (Math.max(stageRef.current?.clientWidth ?? 1, 1) * zoom);
    const limitX = isBio ? 30 : 25;
    const limitZ = isBio ? 21 : 18;
    setPan(value => ({
      x: Math.max(-limitX, Math.min(limitX, value.x - dx * units)),
      z: Math.max(-limitZ, Math.min(limitZ, value.z - dy * units * 1.4)),
    }));
  };
  const stopDrag = (event: PointerEvent<HTMLDivElement>) => {
    touchPointers.current.delete(event.pointerId);
    pinchDistance.current = null;
    if (touchPointers.current.size === 1) {
      const [id, point] = [...touchPointers.current.entries()][0];
      drag.current = { ...point, id };
    } else if (drag.current?.id === event.pointerId) {
      drag.current = null;
    }
  };
  const fallback = <BoardFallback boardId={boardId} players={players} activePlayerId={activePlayerId} focusPosition={focusPosition} landingPosition={landingPosition} finishOrder={finishOrder} overview={overview} zoom={zoom} pan={pan} onSpaceSelect={onSpaceSelect} onSpaceHover={onSpaceHover} />;
  const sceneProps = { players, activePlayerId, focusPosition, finishOrder, landingPosition, overview, reduceMotion, zoom, pan, onSpaceSelect, onSpaceHover };

  return <section className={`ru-board ru-tabletop ${isBio ? 'ru-board--bio' : ''} ${preview ? 'ru-board--preview' : ''} ${focusMode ? 'ru-board--focus' : ''}`} aria-label={`${isBio ? 'Bio Upgrade' : 'Redline Upgrade'} 75-space game board`} data-testid="game-board">
    <header className="ru-board__masthead">
      <div className="ru-board__heading"><span className="ru-board__overline">{isBio ? 'BIO UPGRADE / 21+ ONLY' : 'CIRCUIT 01 / PHYSICAL EDITION'}</span><h2 className="ru-board__title">{isBio ? 'The after-hours circuit' : 'The redline circuit'}<span className="ru-board__title-slash"> / 75</span></h2></div>
      <div className="ru-board__controls" role="group" aria-label="Board camera">
        <button type="button" data-testid="button-board-overview" className={overview ? 'selected' : ''} onClick={fitBoard} aria-pressed={overview} title="Fit the whole board in view">FIT BOARD</button>
        <button type="button" data-testid="button-board-reset" onClick={resetCamera} title="Reset to the default camera on the active pawn">RESET</button>
        <button type="button" data-testid="button-board-follow" className={followActive && target.kind === 'active' && !overview ? 'selected' : ''} aria-pressed={followActive} onClick={() => {
          if (followActive && target.kind === 'active' && !overview) { setFollowActive(false); return; }
          setFollowActive(true); setTarget({ kind: 'active' }); setOverview(false);
        }} title="Keep the camera on the active pawn as it moves">FOLLOW {followActive ? 'ON' : 'OFF'}</button>
        <button type="button" data-testid="button-board-zoom-out" onClick={() => setZoom(value => clampZoom(+(value / 1.3).toFixed(2)))} aria-label="Zoom out">−</button>
        <button type="button" data-testid="button-board-zoom-in" onClick={() => setZoom(value => clampZoom(+(value * 1.3).toFixed(2)))} aria-label="Zoom in">+</button>
        {!focusMode && <button type="button" data-testid="button-board-wheel" className={`ru-board__wheel-toggle ${wheelZoomEnabled ? 'selected' : ''}`} aria-pressed={wheelZoomEnabled} onClick={() => setWheelZoomEnabled(value => !value)} title="Capture the scroll wheel for zoom (Ctrl + wheel and trackpad pinch always zoom)">WHEEL {wheelZoomEnabled ? 'ON' : 'OFF'}</button>}
        {onToggleFocusMode && <button type="button" data-testid="button-board-focus-mode" className={`ru-board__focus-toggle ${focusMode ? 'selected' : ''}`} aria-pressed={focusMode} onClick={onToggleFocusMode}>{focusMode ? 'EXIT FOCUS' : 'BOARD FOCUS'}</button>}
      </div>
      <div className="ru-board__runners" role="group" aria-label="Focus camera on a player">
        {players.map(p => {
          const selected = !overview && (target.kind === 'player' ? target.playerId === p.playerId : target.kind === 'active' && p.playerId === activePlayerId);
          return <button type="button" key={p.playerId} data-testid={`button-board-focus-player-${p.playerId}`} className={`${selected ? 'selected' : ''} ${p.playerId === activePlayerId ? 'is-active' : ''}`} aria-pressed={selected} onClick={() => focusPlayer(p.playerId)} title={`Center camera on ${p.displayName}`}>
            <i aria-hidden="true" /><span>{p.displayName}</span><b>{p.position === 0 ? 'ST' : String(p.position).padStart(2, '0')}</b>
          </button>;
        })}
        <span className="ru-board__camera-state" data-testid="text-board-camera-state">CAM / {focusLabel} / {zoom.toFixed(1)}×</span>
      </div>
    </header>
    <div className={`ru-board__stage ${wheelArmed ? 'zoom-armed' : ''}`} ref={stageRef} style={{ touchAction: 'none' }} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={stopDrag} onPointerCancel={stopDrag}>
      <div className="ru-board__stage-index" aria-hidden="true"><span>{isBio ? 'BIO / UPGRADE' : 'REDLINE / UPGRADE'}</span><span>TABLETOP  /  01—75</span></div>
      {webgl === null && <div className="ru-board__loading" aria-label="Preparing 3D tabletop"><span /><span /><span /><p>PREPARING THE CIRCUIT</p></div>}
      {webgl === false && fallback}
      {webgl === true && <ErrorBoundary resetKey={`${boardId}-tabletop`} FallbackComponent={() => fallback}>
        <Canvas
          aria-hidden="true"
          data-testid="board-canvas"
          orthographic
          camera={{ position: [2, 39, 37], zoom: 1, near: 0.1, far: 150 }}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          shadows
          dpr={[1, 1.75]}
          onCreated={({ gl }) => { gl.toneMapping = 3; gl.toneMappingExposure = 1.25; }}
        >
          {isBio ? <MemoBioBoardScene {...sceneProps} /> : <MemoBoardScene {...sceneProps} />}
        </Canvas>
      </ErrorBoundary>}
      <div className="ru-board__telemetry" aria-live="polite">
        <span>{movingIsActive ? 'MOVING' : 'LIVE POSITION'} / {active?.displayName ?? 'RUNNER'}</span>
        <strong>{activePosition === 0 ? 'START' : String(activePosition).padStart(2, '0')}{activePosition > 0 && <small> / 75</small>}</strong>
         <span>{activePosition === 0 ? (isBio ? 'CLUB ENTRANCE' : 'LAUNCH PAD') : zones[activeZoneIndex]}</span>
      </div>
      <div className="ru-board__minimap" aria-label="Complete circuit overview">
        <span className="ru-board__minimap-label">ROUTE / 00—75</span>
         <svg viewBox={isBio ? '-29 -19 58 38' : '-25 -18 50 36'} role="img" aria-label={`${isBio ? 'Bio Upgrade route' : 'Circuit map'}, active pawn at ${activePosition === 0 ? 'start' : `space ${activePosition}`}`}>
           <polyline points={route.map(p => `${p.x},${p.z}`).join(' ')} fill="none" stroke={isBio ? '#58d7d0' : '#516b58'} strokeWidth=".42" strokeLinejoin="round" strokeLinecap="round" />
           <polyline points={route.slice(0, activePosition + 1).map(p => `${p.x},${p.z}`).join(' ')} fill="none" stroke={isBio ? '#f36b9d' : '#f96346'} strokeWidth=".54" strokeLinejoin="round" strokeLinecap="round" />
           {(isBio ? [10, 20, 30, 40, 50, 62, 75] : [10, 20, 30, 45, 60, 75]).map(n => <circle key={n} cx={route[n].x} cy={route[n].z} r=".52" fill={isBio ? '#f36b9d' : '#f96346'} />)}
           <circle cx={route[activePosition].x} cy={route[activePosition].z} r=".92" fill="#d4e981" stroke="#14211c" strokeWidth=".3" />
        </svg>
        <span className="ru-board__minimap-endpoints"><span>START</span><span>FINISH</span></span>
      </div>
    </div>
    <div className="ru-board__information" role="status" aria-live="polite">
      {info ? <><SpaceIcon name={info.icon} size={29} />{info.secondaryIcon && <SpaceIcon name={info.secondaryIcon} size={29} />}<div><span>SPACE {String(info.number).padStart(2, '0')} / {info.trigger === 'LAND_OR_PASS' ? 'PASS OR LAND' : info.trigger === 'LAND' ? 'LAND ONLY' : 'NO ACTIVE EFFECT'}</span><strong>{info.label}</strong><p>{info.description}</p></div><button type="button" className="ru-board__info-focus" data-testid="button-board-focus-space" onClick={() => focusSpace(info.number)}>CENTER</button><button type="button" onClick={() => { setSelectedSpace(null); setHoveredSpace(null); }} aria-label="Close space information">×</button></>
        : <p>Select or hover over a board space to learn what happens there.</p>}
    </div>
    <footer className="ru-board__foot">
      <details className="ru-board__space-legend" open={!isMobileViewport()}>
        <summary>BOARD LEGEND</summary>
        <div>{[
          ['salary', 'Salary Gate (payday)'], ['career', 'Career Change'], ['car', 'Car'], ['lifestyle', 'Lifestyle'],
          ['pet', 'Pet'], ['investment', 'Investment'], ['property', 'Property'], ['wealth', 'Card Space (draw)'],
          ['gamble', 'Gamble'], ['upgrade-token', 'Upgrade Token'], ['event', 'Effect Space'], ['normal', 'Open Road'], ['start', 'Start'], ['finish', 'Finish'],
        ].map(([icon, label]) => <span key={label}><SpaceIcon name={icon} size={20} />{label}</span>)}</div>
      </details>
       <span className="ru-board__scroll-cue">{isBio ? 'SEVEN ZONES / ONE WAY FORWARD' : 'FIVE ZONES / ONE WAY FORWARD'}</span>
    </footer>
    {/* Persistent DOM semantics: canvas is a drawing surface, not the source of game state. */}
    <div className="ru-board__accessible" aria-label="Board spaces and occupants">
      <div data-testid="board-start-pad" aria-label={`Start pad, ${players.filter(p => p.position === 0).length} players`}>Start pad, position zero</div>
      {boardSpaces.map(space => {
        const occupants = players.filter(p => p.position === space.number);
        return <button type="button" key={space.number} data-testid={`board-space-${space.number}`} onClick={() => { setSelectedSpace(space.number); focusSpace(space.number); }} aria-label={`Space ${space.number}, ${space.label}. ${space.description}${occupants.length ? ` Occupied by ${occupants.map(p => p.displayName).join(' and ')}.` : ''}${landingPosition === space.number ? ' Landing space.' : ''}`}>
          Space {space.number}: {space.payday ? 'PAYDAY + ' : ''}{space.type}; {occupants.length ? occupants.map(p => p.displayName).join(', ') : 'unoccupied'}
        </button>;
      })}
      {players.map((p, playerIndex) => {
        const place = finishOrder.indexOf(playerIndex);
        const placeLabel = place >= 0 && place < 4 ? `, ${place + 1}${place === 0 ? 'ST' : place === 1 ? 'ND' : place === 2 ? 'RD' : 'TH'} PLACE` : '';
        return <div key={p.playerId} data-testid={`board-pawn-${p.playerId}`} aria-label={`${p.displayName}${placeLabel}, ${p.position === 0 ? 'start pad' : `space ${p.position}`}`}>
        {p.displayName}{placeLabel} at {p.position === 0 ? 'start' : `space ${p.position}`}
        </div>;
      })}
    </div>
    <span hidden data-testid="board-webgl-status">{webgl === null ? 'Checking WebGL2' : webgl ? 'WebGL2 ready' : 'WebGL2 unavailable'}</span>
  </section>;
}

export default GameBoard;