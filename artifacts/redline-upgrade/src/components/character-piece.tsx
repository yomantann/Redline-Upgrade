import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { ErrorBoundary } from './error-boundary';
import { PawnModel } from './pawns/pawn-model';
import { PawnFallback } from './pawns/pawn-fallback';

export type PawnMotion = 'idle' | 'moving' | 'landing';

function AnimatedPawn({
  characterId,
  selected,
  hovered,
  motion,
  reduceMotion,
}: {
  characterId: string;
  selected: boolean;
  hovered: boolean;
  motion: PawnMotion;
  reduceMotion: boolean;
}) {
  const group = useRef<Group>(null);
  const motionTime = useRef(0);

  useEffect(() => {
    motionTime.current = 0;
  }, [motion, characterId]);

  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    motionTime.current += delta;
    const t = motionTime.current;
    const phase = clock.getElapsedTime();
    const moving = motion === 'moving' && !reduceMotion;
    const landing = motion === 'landing' && !reduceMotion;
    const progress = Math.min(t / 0.68, 1);
    const x = moving ? -0.55 + progress * 1.1 : 0;
    const hop = moving ? Math.sin(progress * Math.PI) * 0.36 : 0;
    const bounce = landing ? Math.abs(Math.sin(t * 16)) * Math.exp(-t * 5) * 0.22 : 0;
    const idle = reduceMotion || moving || landing ? 0 : Math.sin(phase * 1.45) * 0.035;
    const targetScale = landing ? 1 - Math.sin(Math.min(t / 0.3, 1) * Math.PI) * 0.07 : hovered ? 1.07 : 1;
    const easing = Math.min(delta * 12, 1);
    group.current.position.x += (x - group.current.position.x) * easing;
    group.current.position.y += (hop + bounce + idle - group.current.position.y) * easing;
    group.current.rotation.y += ((hovered ? 0.35 : 0) + (reduceMotion ? 0 : Math.sin(phase * 0.55) * 0.12) - group.current.rotation.y) * easing;
    group.current.scale.setScalar(group.current.scale.x + (targetScale - group.current.scale.x) * easing);
  });

  return <group ref={group}><PawnModel characterId={characterId} selected={selected} /></group>;
}

/** A standalone board pawn. It never reads or renders the character portrait. */
export function CharacterPiece({
  characterId,
  name,
  selected = false,
  motion = 'idle',
  className = '',
  compact = false,
}: {
  characterId: string;
  name?: string;
  selected?: boolean;
  motion?: PawnMotion;
  className?: string;
  compact?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null);
  const [reduceMotion, setReduceMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    try {
      const probe = document.createElement('canvas');
      const context = probe.getContext('webgl2');
      setWebglAvailable(Boolean(context));
      context?.getExtension('WEBGL_lose_context')?.loseContext();
    } catch {
      setWebglAvailable(false);
    }
  }, []);

  return (
    <div
      className={`character-piece-stage ${compact ? 'compact' : ''} ${className}`}
      data-selected={selected}
      data-motion={motion}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      role="img"
      aria-label={`${name ?? characterId.replaceAll('_', ' ')} 3D board-game figurine`}
      data-testid={`pawn-${characterId}`}
    >
      {webglAvailable && (
        <ErrorBoundary
          resetKey={characterId}
          FallbackComponent={({ error }) =>
            error.message.includes('WebGL')
              ? <PawnFallback characterId={characterId} selected={selected} />
              : <span className="pawn-render-error">3D figurine unavailable: {error.message}</span>
          }
        >
          <Canvas
            aria-hidden="true"
            camera={{ position: [4.1, 3.4, 5.8], fov: 38, near: 0.1, far: 50 }}
            gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
            dpr={[1, 1.5]}
          >
            <ambientLight intensity={1.35} />
            <hemisphereLight args={['#b9e7f4', '#271d22', 1.2]} />
            <directionalLight position={[3, 6, 5]} intensity={3.3} color="#fff0dc" />
            <group position={[0, -1.35, 0]}>
              <AnimatedPawn
                characterId={characterId}
                selected={selected}
                hovered={hovered}
                motion={motion}
                reduceMotion={reduceMotion}
              />
            </group>
          </Canvas>
        </ErrorBoundary>
      )}
      {webglAvailable === false && <PawnFallback characterId={characterId} selected={selected} />}
      <span className="piece-stage-label" aria-hidden="true">
        {webglAvailable === false ? 'FIGURINE / STATIC PREVIEW' : 'FIGURINE / LIVE 3D'}
      </span>
    </div>
  );
}