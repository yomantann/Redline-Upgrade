import './_group.css';
import './sculpted3d.css';
import { Canvas, useThree } from '@react-three/fiber';
import { Component, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CSSProperties } from 'react';
import { Sculpted } from './Sculpted';
import { pawnCatalog } from './Gallery';
import { PawnModel } from './_shared/PawnModel3D';

const rimLights: Record<string, string> = {
  guardian_h: '#4bd9fa',
  click_click: '#f26bdd',
  frostbyte: '#71caff',
  sadman: '#a7ee78',
  rainbow_dash: '#ff9f58',
  accuser: '#ff536a',
  low_flame: '#ff7a3d',
  wandering_eye: '#fb7a57',
  the_rind: '#5cd8e8',
  anointed: '#ffd06a',
  executive_p: '#56d7e8',
  alpha_prime: '#78d7ea',
  roll_safe: '#f5a957',
  hotwired: '#ff5267',
  panic_bot: '#ff5f67',
  primate: '#e965d0',
  pain_hider: '#65d6e8',
  prom_king: '#b78cff',
  idol_core: '#f369d5',
  danger_zone: '#ff594e',
  the_tank: '#b99bfa',
};

function supportsWebGL() {
  if (typeof document === 'undefined') return false;
  try {
    const probe = document.createElement('canvas');
    const context = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!context) return false;
    context.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

function PawnField({ selectedId }: { selectedId: string | null }) {
  const viewport = useThree((state) => state.viewport);
  const pawns = useMemo(() => pawnCatalog.map(([id], index) => ({
    id,
    index,
    row: Math.floor(index / 7),
    column: index % 7,
  })), []);
  const cellWidth = viewport.width / 7;
  const cellHeight = viewport.height / 3;
  const pawnScale = Math.min(0.6, (cellHeight - 0.35) / 2.9);

  return (
    <>
      {pawns.map(({ id, index, row, column }) => (
        <group
          key={id}
          position={[
            -viewport.width / 2 + (column + 0.5) * cellWidth,
            viewport.height / 2 - (row + 1) * cellHeight + 0.215,
            0,
          ]}
          scale={pawnScale}
          rotation={[0, -0.12, 0]}
        >
          <PawnModel characterId={id} selected={selectedId === id} />
        </group>
      ))}
    </>
  );
}

function CanvasFailure({ onFailure }: { onFailure: () => void }) {
  useEffect(() => {
    onFailure();
  }, [onFailure]);
  return null;
}

interface BoundaryState {
  failed: boolean;
}

class WebGLBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return <Sculpted />;
    return this.props.children;
  }
}

export function Sculpted3D() {
  const [webgl] = useState(supportsWebGL);
  const [canvasFailed, setCanvasFailed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const pawns = pawnCatalog;
  const handleCanvasFailure = useCallback(() => setCanvasFailed(true), []);

  if (!webgl || canvasFailed) return <Sculpted />;

  return (
    <WebGLBoundary>
      <main className="sculpted3d">
      <header className="sculpted3d__header">
        <div className="sculpted3d__brand">Redline Upgrade <span>//</span> Sculpted in 3D</div>
        <div className="sculpted3d__edition">21 hand-painted units</div>
      </header>
      <div className="sculpted3d__scroll">
        <section className="sculpted3d__sheet" aria-label="Three-dimensional collectible pawn gallery">
          <div className="sculpted3d__scene" aria-hidden="true">
            <Canvas
              orthographic
              camera={{ position: [0, 0, 24], zoom: 100, near: 0.1, far: 60 }}
              dpr={[1, 1.5]}
              gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
              fallback={<CanvasFailure onFailure={handleCanvasFailure} />}
              onCreated={({ gl }) => {
                gl.setClearColor('#000000', 0);
              }}
            >
              <ambientLight intensity={0.72} color="#9eb8ce" />
              <hemisphereLight args={['#d8f3ff', '#111827', 0.82]} />
              <directionalLight position={[-5, 8, 9]} intensity={1.8} color="#f2f6ff" />
              <directionalLight position={[5, 3, -4]} intensity={0.82} color="#ff78d9" />
              <pointLight position={[0, -3, 5]} intensity={0.48} distance={14} color="#39d9ed" />
              <PawnField selectedId={selectedId} />
            </Canvas>
          </div>
          <div className="sculpted3d__grid">
            {pawns.map(([id, name], index) => (
              <button
                className="sculpted3d__tile"
                key={id}
                type="button"
                aria-label={`${name} collectible pawn${selectedId === id ? ', selected' : ''}`}
                aria-pressed={selectedId === id}
                data-testid={`pawn-${id}`}
                onClick={() => setSelectedId((current) => current === id ? null : id)}
                style={{ '--piece-rim': rimLights[id] } as CSSProperties}
              >
                <span className="sculpted3d__stage">
                  <span className="sculpted3d__index">{String(index + 1).padStart(2, '0')}</span>
                </span>
                <span className="sculpted3d__name">{name}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
      <footer className="sculpted3d__footer">
        <span>Hand-finished units <b>·</b> Edition 01</span>
        <span>Display archive <b>—</b> 7 × 3 <b>·</b> Select a piece to inspect</span>
      </footer>
      </main>
    </WebGLBoundary>
  );
}

export default Sculpted3D;