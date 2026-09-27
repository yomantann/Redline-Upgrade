import './moving-pieces.css';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
// @ts-expect-error Three.js is supplied by React Three Fiber in this sandbox, but has no declaration package here.
import * as THREE from 'three';
import { pawnCatalog } from './Gallery';

const ROUTE_LENGTH = pawnCatalog.length;
const PIECE_TEXTURE = (id: string) => `/__mockup/images/redline-pawns/${id}.png`;

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

function createAlphaOutline(image: CanvasImageSource, width: number, height: number, size: number): any | null {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(image, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height).data;
    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;

    for (let y = 0; y < height; y += 3) {
      for (let x = 0; x < width; x += 3) {
        if (pixels[(y * width + x) * 4 + 3] > 30) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }
    if (maxX <= minX || maxY <= minY) return null;

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const searchRadius = Math.hypot(width, height) * 0.51;
    const outline = new THREE.Shape();
    const samples = 144;
    let found = 0;
    for (let sample = 0; sample < samples; sample++) {
      const angle = (sample / samples) * Math.PI * 2;
      let outerRadius = 0;
      for (let radius = 0; radius < searchRadius; radius += 2) {
        const x = Math.round(centerX + Math.cos(angle) * radius);
        const y = Math.round(centerY + Math.sin(angle) * radius);
        if (x < 0 || x >= width || y < 0 || y >= height) break;
        if (pixels[(y * width + x) * 4 + 3] > 30) outerRadius = radius;
      }
      if (outerRadius < 1) continue;
      const px = centerX + Math.cos(angle) * (outerRadius + 2);
      const py = centerY + Math.sin(angle) * (outerRadius + 2);
      const x = ((px / width) - 0.5) * size;
      const y = (0.5 - (py / height)) * size;
      if (found === 0) outline.moveTo(x, y);
      else outline.lineTo(x, y);
      found++;
    }
    if (found < 12) return null;
    outline.closePath();
    return new THREE.ExtrudeGeometry(outline, {
      depth: 0.12,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.035,
      bevelThickness: 0.025,
      curveSegments: 3,
    });
  } catch {
    // If a browser cannot expose the alpha channel, the textured cutout still renders.
    return null;
  }
}

function PawnCutout({
  characterId,
  step,
  reducedMotion,
}: {
  characterId: string;
  step: number;
  reducedMotion: boolean;
}) {
  const { viewport } = useThree();
  const groupRef = useRef<any>(null);
  const textureRef = useRef<any>(null);
  const [texture, setTexture] = useState<any | null>(null);
  const [outline, setOutline] = useState<any | null>(null);
  const startedAt = useRef(0);
  const previousStep = useRef(step);
  const radiusX = viewport.width * 0.39;
  const radiusY = viewport.height * 0.3;
  const imageSize = Math.min(2.55, radiusX * 0.44);
  const destination = routePoint(step % ROUTE_LENGTH);
  const target = useMemo(
    () => new THREE.Vector3(destination.x * radiusX, destination.y * radiusY + imageSize * 0.43, 0.3),
    [destination.x, destination.y, radiusX, radiusY, imageSize],
  );

  useEffect(() => {
    setTexture(null);
    setOutline(null);
    const loader = new THREE.TextureLoader();
    let active = true;
    const loaded = loader.load(
      PIECE_TEXTURE(characterId),
      (nextTexture: any) => {
        if (!active) {
          nextTexture.dispose();
          return;
        }
        nextTexture.colorSpace = THREE.SRGBColorSpace;
        nextTexture.anisotropy = 4;
        textureRef.current = nextTexture;
        setTexture(nextTexture);
        const image = nextTexture.image as CanvasImageSource & { width: number; height: number };
        const width = image.width || 512;
        const height = image.height || 512;
        setOutline(createAlphaOutline(image, width, height, imageSize));
      },
      undefined,
      () => setTexture(null),
    );
    return () => {
      active = false;
      loaded.dispose();
      textureRef.current = null;
    };
  }, [characterId, imageSize]);

  useEffect(() => {
    if (step !== previousStep.current) {
      startedAt.current = 0;
      previousStep.current = step;
    }
  }, [step]);

  useEffect(() => () => outline?.dispose(), [outline]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const group = groupRef.current;
    if (reducedMotion) {
      group.position.copy(target);
      group.rotation.set(0, -0.08, 0);
      return;
    }
    if (startedAt.current === 0) startedAt.current = state.clock.elapsedTime;
    const elapsed = state.clock.elapsedTime - startedAt.current;
    group.position.x = THREE.MathUtils.damp(group.position.x, target.x, 5.2, delta);
    group.position.z = THREE.MathUtils.damp(group.position.z, target.z, 5.2, delta);
    if (elapsed < 0.64) {
      const lift = Math.sin((elapsed / 0.64) * Math.PI);
      group.position.y = THREE.MathUtils.damp(group.position.y, target.y + lift * 0.45, 10, delta);
      group.rotation.y = THREE.MathUtils.damp(group.rotation.y, -0.08 + Math.sin(elapsed * 8) * 0.17, 9, delta);
      group.rotation.z = THREE.MathUtils.damp(group.rotation.z, Math.sin(elapsed * 7) * 0.035, 9, delta);
    } else {
      group.position.y = THREE.MathUtils.damp(group.position.y, target.y, 6, delta);
      group.rotation.y = THREE.MathUtils.damp(group.rotation.y, -0.08, 6, delta);
      group.rotation.z = THREE.MathUtils.damp(group.rotation.z, 0, 6, delta);
    }
  });

  return (
    <group ref={groupRef} position={[target.x, target.y, target.z]} rotation={[0, -0.08, 0]}>
      {outline && (
        <mesh
          geometry={outline}
          position={[0, 0, -0.11]}
          castShadow
        >
          <meshStandardMaterial color="#25383c" metalness={0.46} roughness={0.42} />
        </mesh>
      )}
      {texture && (
        <mesh position={[0, 0, 0.06]} castShadow>
          <planeGeometry args={[imageSize, imageSize]} />
          <meshBasicMaterial map={texture} transparent alphaTest={0.015} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

function MiniatureRoute({
  characterId,
  step,
  reducedMotion,
}: {
  characterId: string;
  step: number;
  reducedMotion: boolean;
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
      <PawnCutout characterId={characterId} step={step} reducedMotion={reducedMotion} />
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

export function MovingPieces() {
  const [selectedId, setSelectedId] = useState<string>(pawnCatalog[0][0]);
  const [step, setStep] = useState(0);
  const [hopSignal, setHopSignal] = useState(0);
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
                    <MiniatureRoute characterId={selectedId} step={step} reducedMotion={reducedMotion} />
                  </Canvas>
                  <span className="redline-moving__scene-caption">Printed cutout · shallow relief backer</span>
                </div>
              </SceneBoundary>
            )}
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
                  onClick={() => setSelectedId(id)}
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
          <span>Art remains paired to its catalog name <strong>·</strong> select any piece to swap the runner</span>
          <span>Movement is a visual test, not game rules</span>
        </footer>
      </div>
    </main>
  );
}

export default MovingPieces;