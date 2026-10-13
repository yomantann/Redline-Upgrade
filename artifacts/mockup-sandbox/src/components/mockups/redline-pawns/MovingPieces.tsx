import './moving-pieces.css';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
// @ts-expect-error Three.js is supplied by React Three Fiber in this sandbox, but has no declaration package here.
import * as THREE from 'three';
import { pawnCatalog, type PawnId } from './Gallery';
import { PawnModel } from './_shared/PawnModel3D';

const ROUTE_LENGTH = pawnCatalog.length;
const PIECE_TEXTURE = (id: string) => id === 'guardian_h'
  ? '/__mockup/images/redline-pawns/reimagined/guardian_h.png'
  : `/__mockup/images/redline-pawns/${id}.png`;

function routePoint(index: number) {
  const angle = -Math.PI / 2 + (index / ROUTE_LENGTH) * Math.PI * 2;
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

function supportsWebGL() {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!context) return false;
    context.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

function PawnRunner({
  characterId,
  step,
  reducedMotion,
  turnAngle,
  tiltAngle,
}: {
  characterId: PawnId;
  step: number;
  reducedMotion: boolean;
  turnAngle: number;
  tiltAngle: number;
}) {
  const { viewport } = useThree();
  const groupRef = useRef<any>(null);
  const modelRef = useRef<any>(null);
  const startedAt = useRef(0);
  const previousStep = useRef(step);
  const radiusX = viewport.width * 0.39;
  const radiusY = viewport.height * 0.3;
  const destination = routePoint(step % ROUTE_LENGTH);
  const target = useMemo(
    () => new THREE.Vector3(destination.x * radiusX, destination.y * radiusY, 0.3),
    [destination.x, destination.y, radiusX, radiusY],
  );

  useEffect(() => {
    if (step !== previousStep.current) {
      startedAt.current = 0;
      previousStep.current = step;
    }
  }, [step]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const group = groupRef.current;
    if (reducedMotion) {
      group.position.copy(target);
      group.rotation.set(0, 0, 0);
      if (modelRef.current) modelRef.current.rotation.set(tiltAngle, turnAngle, 0);
      return;
    }
    if (startedAt.current === 0) startedAt.current = state.clock.elapsedTime;
    const elapsed = state.clock.elapsedTime - startedAt.current;
    group.position.x = THREE.MathUtils.damp(group.position.x, target.x, 5.2, delta);
    group.position.z = THREE.MathUtils.damp(group.position.z, target.z, 5.2, delta);
    if (elapsed < 0.64) {
      const lift = Math.sin((elapsed / 0.64) * Math.PI);
      group.position.y = THREE.MathUtils.damp(group.position.y, target.y + lift * 0.45, 10, delta);
      group.rotation.z = THREE.MathUtils.damp(group.rotation.z, Math.sin(elapsed * 7) * 0.035, 9, delta);
    } else {
      group.position.y = THREE.MathUtils.damp(group.position.y, target.y, 6, delta);
      group.rotation.z = THREE.MathUtils.damp(group.rotation.z, 0, 6, delta);
    }
    if (modelRef.current) {
      const hopTurn = elapsed < 0.64 ? Math.sin(elapsed * 8) * 0.12 : 0;
      modelRef.current.rotation.set(tiltAngle, turnAngle + hopTurn, 0);
    }
  });

  return (
    <group ref={groupRef} position={[target.x, target.y, target.z]}>
      <group ref={modelRef} scale={0.78}>
        <PawnModel characterId={characterId} selected />
      </group>
    </group>
  );
}

function MiniatureRoute({
  characterId,
  step,
  reducedMotion,
  turnAngle,
  tiltAngle,
}: {
  characterId: PawnId;
  step: number;
  reducedMotion: boolean;
  turnAngle: number;
  tiltAngle: number;
}) {
  const { viewport } = useThree();
  const radiusX = viewport.width * 0.39;
  const radiusY = viewport.height * 0.3;
  const orbit = useMemo(() => {
    const points = Array.from({ length: ROUTE_LENGTH }, (_, index) => {
      const point = routePoint(index);
      return new THREE.Vector3(point.x * radiusX, point.y * radiusY, -0.08);
    });
    const geometry = new THREE.BufferGeometry().setFromPoints([
      ...points,
      points[0],
    ]);
    return { points, geometry };
  }, [radiusX, radiusY]);

  return (
    <>
      <ambientLight intensity={1.12} color="#fff7e8" />
      <directionalLight position={[-4, 6, 9]} intensity={1.8} color="#fff8e7" />
      <directionalLight position={[5, -3, 5]} intensity={0.58} color="#d8e7df" />
      <directionalLight position={[3, 4, -7]} intensity={1.15} color="#c8d8dd" />

      <mesh position={[0, 0, -0.45]} scale={[radiusX * 1.12, radiusY * 1.31, 1]}>
        <circleGeometry args={[1, 96]} />
        <meshStandardMaterial color="#deded3" roughness={0.93} />
      </mesh>
      <mesh position={[0, 0, -0.42]} scale={[radiusX * 1.12, radiusY * 1.31, 1]}>
        <ringGeometry args={[0.92, 0.925, 128]} />
        <meshBasicMaterial color="#6f8178" transparent opacity={0.32} />
      </mesh>
      <lineLoop geometry={orbit.geometry}>
        <lineBasicMaterial color="#788981" transparent opacity={0.61} />
      </lineLoop>
      {orbit.points.map((point, index) => {
        const active = index === step % ROUTE_LENGTH;
        const visited = step > 0 && (step >= ROUTE_LENGTH || index < step % ROUTE_LENGTH);
        return (
          <group key={index} position={[point.x, point.y, -0.2]}>
            <mesh>
              <circleGeometry args={[active ? 0.17 : 0.105, 28]} />
              <meshBasicMaterial
                color={active ? '#d84b39' : visited ? '#6f8d7d' : '#aab3a7'}
                transparent
                opacity={active ? 0.96 : 0.82}
              />
            </mesh>
            {active && (
              <mesh position={[0, 0, -0.015]}>
                <ringGeometry args={[0.205, 0.22, 28]} />
                <meshBasicMaterial color="#b94b3a" transparent opacity={0.42} />
              </mesh>
            )}
          </group>
        );
      })}
      <PawnRunner
        characterId={characterId}
        step={step}
        reducedMotion={reducedMotion}
        turnAngle={turnAngle}
        tiltAngle={tiltAngle}
      />
    </>
  );
}

function WebGLUnavailable({ onFail }: { onFail: () => void }) {
  useEffect(() => onFail(), [onFail]);
  return null;
}

interface BoundaryState {
  failed: boolean;
}

class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function RouteFallback({
  characterId,
  step,
  hopSignal,
}: {
  characterId: string;
  step: number;
  hopSignal: number;
}) {
  const [hopping, setHopping] = useState(false);
  useEffect(() => {
    if (!hopSignal) return;
    setHopping(true);
    const timeout = window.setTimeout(() => setHopping(false), 430);
    return () => window.clearTimeout(timeout);
  }, [hopSignal]);
  const selectedPoint = routePoint(step % ROUTE_LENGTH);

  return (
    <div
      className={`redline-moving__fallback${hopping ? ' redline-moving__fallback--hop' : ''}`}
      role="img"
      aria-label={`Tabletop route. ${pawnCatalog.find(([id]) => id === characterId)?.[1] ?? 'Selected piece'} is on space ${(step % ROUTE_LENGTH) + 1} of ${ROUTE_LENGTH}.`}
    >
      <span className="redline-moving__fallback-status">21-space tabletop route · browser rendering mode</span>
      <svg viewBox="0 0 600 360" aria-hidden="true">
        <ellipse cx="300" cy="180" rx="265" ry="142" fill="#dcdcd1" stroke="#c3c8bb" strokeWidth="1.5" />
        <ellipse cx="300" cy="180" rx="247" ry="127" fill="none" stroke="#89988d" strokeWidth="1.25" strokeDasharray="3 5" opacity=".75" />
        {pawnCatalog.map(([id], index) => {
          const point = routePoint(index);
          const x = 300 + point.x * 239;
          const y = 180 + point.y * 105;
          const active = index === step % ROUTE_LENGTH;
          const visited = step > 0 && (step >= ROUTE_LENGTH || index < step % ROUTE_LENGTH);
          return (
            <g key={id}>
              <circle cx={x} cy={y} r={active ? 8.5 : 5.2} fill={active ? '#d84b39' : visited ? '#6f8d7d' : '#aab3a7'} />
              {active && <circle cx={x} cy={y} r="12" fill="none" stroke="#b94b3a" strokeWidth="1.5" opacity=".6" />}
              <text x={x} y={y - 10} textAnchor="middle" fill="#697a70" fontSize="8" fontFamily="monospace">
                {String(index + 1).padStart(2, '0')}
              </text>
            </g>
          );
        })}
      </svg>
      <img
        className="redline-moving__fallback-piece"
        src={PIECE_TEXTURE(characterId)}
        alt=""
        style={{
          left: `${((300 + selectedPoint.x * 239) / 600) * 100}%`,
          top: `${((180 + selectedPoint.y * 105) / 360) * 100}%`,
        }}
      />
    </div>
  );
}

function MoveControls({
  step,
  onAdvance,
  onReset,
}: {
  step: number;
  onAdvance: () => void;
  onReset: () => void;
}) {
  const completed = step >= ROUTE_LENGTH;
  return (
    <div className="redline-moving__controls">
      <div className="redline-moving__progress" aria-live="polite">
        <div className="redline-moving__progress-copy">
          <strong>{completed ? 'Lap complete' : `Space ${String((step % ROUTE_LENGTH) + 1).padStart(2, '0')} / ${ROUTE_LENGTH}`}</strong>
          <span>·</span>
          <span>{step} of {ROUTE_LENGTH} moves</span>
        </div>
        <div
          className="redline-moving__meter"
          role="progressbar"
          aria-label="Movement test progress"
          aria-valuemin={0}
          aria-valuemax={ROUTE_LENGTH}
          aria-valuenow={step}
        >
          <span style={{ width: `${(step / ROUTE_LENGTH) * 100}%` }} />
        </div>
      </div>
      <div className="redline-moving__actions">
        <button className="redline-moving__button redline-moving__button--advance" type="button" onClick={onAdvance} disabled={completed}>
          Advance <span aria-hidden="true">→</span>
        </button>
        <button className="redline-moving__button" type="button" onClick={onReset} disabled={step === 0}>
          Reset
        </button>
      </div>
    </div>
  );
}

function TurnControls({
  turnAngle,
  tiltAngle,
  onTurn,
  onTilt,
  onReset,
  enabled,
}: {
  turnAngle: number;
  tiltAngle: number;
  onTurn: (direction: -1 | 1) => void;
  onTilt: (direction: -1 | 1) => void;
  onReset: () => void;
  enabled: boolean;
}) {
  const degrees = ((Math.round((turnAngle * 180) / Math.PI) % 360) + 360) % 360;
  const tiltDegrees = Math.round((tiltAngle * 180) / Math.PI);

  return (
    <div className="redline-moving__turn-controls" role="group" aria-label="Inspect the selected miniature">
      <div className="redline-moving__turn-status" aria-live="polite">
        <strong>Model view</strong>
        <span>{enabled ? `${String(degrees).padStart(3, '0')}° turn · ${tiltDegrees}° tilt` : '3D view needs WebGL'}</span>
      </div>
      <div className="redline-moving__turn-actions">
        <button type="button" aria-label="Turn miniature left 45 degrees" onClick={() => onTurn(-1)} disabled={!enabled}>Turn left</button>
        <button type="button" aria-label="Reset miniature to front view" onClick={onReset} disabled={!enabled}>Front</button>
        <button type="button" aria-label="Turn miniature right 45 degrees" onClick={() => onTurn(1)} disabled={!enabled}>Turn right</button>
        <button type="button" aria-label="Tilt miniature upward 15 degrees" onClick={() => onTilt(-1)} disabled={!enabled}>Tilt up</button>
        <button type="button" aria-label="Tilt miniature downward 15 degrees" onClick={() => onTilt(1)} disabled={!enabled}>Tilt down</button>
      </div>
    </div>
  );
}

export function MovingPieces() {
  const [selectedId, setSelectedId] = useState<PawnId>(pawnCatalog[0][0]);
  const [step, setStep] = useState(0);
  const [hopSignal, setHopSignal] = useState(0);
  const [turnAngle, setTurnAngle] = useState(0);
  const [tiltAngle, setTiltAngle] = useState(0);
  const [webglAvailable] = useState(supportsWebGL);
  const [canvasFailed, setCanvasFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const selectedName = pawnCatalog.find(([id]) => id === selectedId)?.[1] ?? pawnCatalog[0][1];
  const markCanvasFailed = useCallback(() => setCanvasFailed(true), []);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  const advance = () => {
    setStep((current) => Math.min(ROUTE_LENGTH, current + 1));
    setHopSignal((current) => current + 1);
  };
  const reset = () => {
    setStep(0);
    setHopSignal((current) => current + 1);
  };
  const showFallback = !webglAvailable || canvasFailed;

  return (
    <main className="redline-moving">
      <div className="redline-moving__inner">
        <header className="redline-moving__masthead">
          <div className="redline-moving__brand">Redline Upgrade <span>//</span> Miniature workbench</div>
          <div className="redline-moving__edition">Character movement study · 01 / 21</div>
        </header>

        <section className="redline-moving__intro" aria-labelledby="moving-pieces-title">
          <div>
            <p className="redline-moving__kicker">A tabletop handling test</p>
            <h1 className="redline-moving__title" id="moving-pieces-title">Pieces in motion</h1>
          </div>
          <p className="redline-moving__subtitle">
            Pick a miniature from the rack. Walk it around the 21-space route, one measured move at a time.
          </p>
        </section>

        <div className="redline-moving__workbench">
          <section className="redline-moving__stage-card" aria-label="Movement test table">
            <div className="redline-moving__stage-head">
              <span>Route study <strong>·</strong> 21 spaces</span>
              <span>{String((step % ROUTE_LENGTH) + 1).padStart(2, '0')} / {String(ROUTE_LENGTH).padStart(2, '0')}</span>
            </div>
            {showFallback ? (
              <RouteFallback characterId={selectedId} step={step} hopSignal={hopSignal} />
            ) : (
              <SceneBoundary fallback={<RouteFallback characterId={selectedId} step={step} hopSignal={hopSignal} />}>
                <div className="redline-moving__canvas" role="img" aria-label={`${selectedName} miniature on the tabletop route, space ${(step % ROUTE_LENGTH) + 1} of ${ROUTE_LENGTH}`}>
                  <Canvas
                    orthographic
                    camera={{ position: [0, 0, 25], zoom: 50, near: 0.1, far: 60 }}
                    dpr={[1, 1.5]}
                    gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
                    fallback={<WebGLUnavailable onFail={markCanvasFailed} />}
                    onCreated={({ gl }) => {
                      gl.setClearColor('#e8e7dd', 0);
                    }}
                  >
                    <MiniatureRoute
                      characterId={selectedId}
                      step={step}
                      reducedMotion={reducedMotion}
                      turnAngle={turnAngle}
                      tiltAngle={tiltAngle}
                    />
                  </Canvas>
                  <span className="redline-moving__scene-caption">
                    {selectedId === 'guardian_h' ? 'Reimagined Guardian H pilot' : 'Full-volume model'} · 45° turn controls
                  </span>
                </div>
              </SceneBoundary>
            )}
            {showFallback && (
              <div className="redline-moving__fallback-caption">
                Reference image shown because this browser cannot render the 3D model.
              </div>
            )}
            <TurnControls
              turnAngle={turnAngle}
              tiltAngle={tiltAngle}
              onTurn={(direction) => setTurnAngle((angle) => angle + direction * (Math.PI / 4))}
              onTilt={(direction) => setTiltAngle((angle) => THREE.MathUtils.clamp(angle + direction * (Math.PI / 12), -Math.PI / 3, Math.PI / 3))}
              onReset={() => {
                setTurnAngle(0);
                setTiltAngle(0);
              }}
              enabled={!showFallback}
            />
            <MoveControls step={step} onAdvance={advance} onReset={reset} />
          </section>

          <aside className="redline-moving__roster" aria-label="Character piece roster">
            <div className="redline-moving__roster-head">
              <span>Piece rack</span>
              <span>21 characters</span>
            </div>
            <div className="redline-moving__roster-list" role="group" aria-label="Choose a miniature">
              {pawnCatalog.map(([id, name], index) => (
                <button
                  className="redline-moving__roster-button"
                  key={id}
                  type="button"
                  aria-pressed={selectedId === id}
                  aria-label={`${name}${selectedId === id ? ', selected' : ', select piece'}`}
                  onClick={() => {
                    setSelectedId(id);
                    setTurnAngle(0);
                    setTiltAngle(0);
                  }}
                >
                  <span className="redline-moving__roster-index">{String(index + 1).padStart(2, '0')}</span>
                  <span className="redline-moving__roster-name">{name}</span>
                  <span className="redline-moving__roster-state" aria-hidden="true">●</span>
                </button>
              ))}
            </div>
          </aside>
        </div>
        <footer className="redline-moving__note">
          <span>Each sculpt follows its catalog ID and name <strong>·</strong> select any piece to swap the runner</span>
          <span>Movement is a visual test, not game rules</span>
        </footer>
      </div>
    </main>
  );
}

export default MovingPieces;