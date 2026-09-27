import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { BOARD_SPACES } from '../game/board-data';
import type { BoardSpace } from '../game/board-data';
import type { MatchPlayer } from '../game/match';
import { ICON_PATHS } from '../game/icon-paths';
import { PawnModel } from './pawns/PawnModel';
import { getSpaceVisual } from './board-space-visuals';

type Point = { x: number; z: number };
const ZONES = ['THE GRIND', 'THE RISE', 'THE FLEX', 'THE CHAOS', 'THE ENDGAME'];
const COLORS = {
  deck: '#172521', side: '#0c1615', rim: '#536557', face: '#273831',
  orange: '#f96346', lime: '#d4e981', cream: '#e9e7dc', teal: '#7fbdb1',
};
const ZONE_COLORS = ['#9eae83', '#a6c1a0', '#82b7b6', '#d6a76f', '#f18463'];

/**
 * A nearly three-turn inward race spiral, not rows. Catmull-Rom bends pass through
 * 37 varying-radius control points; arc-length resampling keeps platforms evenly
 * spaced (~2.82 units minimum) even through the tighter inner turns.
 */
const spine = new THREE.CatmullRomCurve3(
  Array.from({ length: 37 }, (_, i) => {
    const progress = i / 36;
    const angle = -2.65 + i * Math.PI / 6;
    return new THREE.Vector3(
      (21.2 - 15.4 * progress) * Math.cos(angle) + Math.sin(i * 1.7) * 0.32,
      0,
      (13.55 - 9.4 * progress) * Math.sin(angle) + Math.cos(i * 1.25) * 0.22,
    );
  }),
  false,
  'centripetal',
);
const sampled = spine.getSpacedPoints(74);
const entrance = sampled[0].clone().add(sampled[0].clone().sub(sampled[1]).normalize().multiplyScalar(3.12));
export const ROUTE: Point[] = [entrance, ...sampled].map(p => ({ x: p.x, z: p.z }));
export const ZONE_ANCHORS = [8, 23, 38, 53, 68].map((number, i) => {
  const p = ROUTE[number];
  const before = ROUTE[number - 1];
  const after = ROUTE[number + 1];
  const dx = after.x - before.x;
  const dz = after.z - before.z;
  const length = Math.hypot(dx, dz);
  const side = [1, 1, -1, -1, -1][i];
  return { number, x: p.x + side * dz / length * 1.75, z: p.z - side * dx / length * 1.75 };
});

function graphic(lines: string[], accent = COLORS.cream, width = 512, height = 160) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, width, height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((line, i) => {
    ctx.font = `${i === 0 ? '900 76px' : '700 32px'} "Barlow Condensed", sans-serif`;
    ctx.fillStyle = i === 0 ? accent : '#b7c5b5';
    ctx.fillText(line, width / 2, lines.length === 1 ? height / 2 : 55 + i * 65);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function PrintedLabel({ lines, x, y, z, w, h, color }: {
  lines: string[]; x: number; y: number; z: number; w: number; h: number; color?: string;
}) {
  const texture = useMemo(() => graphic(lines, color), [lines.join('|'), color]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, y, z]}>
    <planeGeometry args={[w, h]} />
    <meshBasicMaterial map={texture} transparent depthWrite={false} />
  </mesh>;
}

function PrintedIcon({ icon, y, color, x = 0.59, z = -0.26, size = 0.74 }: { icon: string; y: number; color: string; x?: number; z?: number; size?: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.translate(64, 64);
    ctx.scale(4.4, 4.4);
    ctx.translate(-12, -12);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = ctx.lineCap = 'round';
    ctx.stroke(new Path2D(ICON_PATHS[icon] ?? ICON_PATHS.milestone));
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, [icon, color]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, y + 0.05, z]}>
    <planeGeometry args={[size, size]} />
    <meshBasicMaterial map={texture} transparent depthWrite={false} />
  </mesh>;
}

function StandingLabel({ name, index, x, z, color }: { name: string; index: number; x: number; z: number; color: string }) {
  const lines = useMemo(() => [`0${index + 1} / ${name}`], [index, name]);
  const texture = useMemo(() => graphic(lines, color), [lines, color]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <group position={[x, 0, z]}>
    <mesh position={[0, 0.72, 0]} castShadow>
      <boxGeometry args={[0.095, 1.4, 0.1]} /><primitive object={mats.dark} attach="material" />
    </mesh>
    <mesh position={[0, 1.43, 0]} castShadow>
      <boxGeometry args={[3.25, 0.82, 0.13]} />
      <meshStandardMaterial color="#172820" metalness={0.62} roughness={0.44} />
    </mesh>
    <mesh position={[0, 1.43, 0.075]}>
      <planeGeometry args={[3.1, 0.71]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </mesh>
    <mesh position={[0, 1.04, 0.08]}>
      <boxGeometry args={[3.14, 0.035, 0.035]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} />
    </mesh>
  </group>;
}

const tileShape = new THREE.BoxGeometry(2.18, 0.24, 2.08);
const tileTop = new THREE.BoxGeometry(2.06, 0.12, 1.96);
const stripShape = new THREE.BoxGeometry(1.86, 0.025, 0.06);
const edgeGeometry = new THREE.BoxGeometry(2.34, 0.035, 2.24);
const mats = {
  base: new THREE.MeshStandardMaterial({ color: '#101a19', metalness: 0.55, roughness: 0.52 }),
  normal: new THREE.MeshStandardMaterial({ color: '#30423b', metalness: 0.38, roughness: 0.56 }),
  payday: new THREE.MeshStandardMaterial({ color: '#496752', metalness: 0.56, roughness: 0.34 }),
  event: new THREE.MeshStandardMaterial({ color: '#45523b', metalness: 0.45, roughness: 0.43 }),
  effect: new THREE.MeshStandardMaterial({ color: '#35483e', metalness: 0.42, roughness: 0.48 }),
  safeMarker: new THREE.MeshStandardMaterial({ color: '#8ea69a', metalness: 0.35, roughness: 0.58 }),
  gamble: new THREE.MeshStandardMaterial({ color: '#533b32', metalness: 0.5, roughness: 0.43 }),
  milestone: new THREE.MeshStandardMaterial({ color: '#603b32', metalness: 0.58, roughness: 0.38 }),
  accent: new THREE.MeshStandardMaterial({ color: COLORS.orange, emissive: COLORS.orange, emissiveIntensity: 0.24, metalness: 0.45 }),
  lime: new THREE.MeshStandardMaterial({ color: COLORS.lime, emissive: COLORS.lime, emissiveIntensity: 0.21 }),
  dark: new THREE.MeshStandardMaterial({ color: '#17231e', metalness: 0.6, roughness: 0.38 }),
};

function Tile({ space, active, landing, onSelect, onHover }: { space: BoardSpace; active: boolean; landing: boolean; onSelect: (n: number) => void; onHover: (n: number | null) => void }) {
  const { x, z } = ROUTE[space.number];
  const visual = getSpaceVisual(space);
  const deckMaterial = useMemo(() => visual.className === 'deck'
    ? new THREE.MeshStandardMaterial({ color: visual.tile, metalness: 0.46, roughness: 0.48 })
    : null, [visual.className, visual.tile]);
  useEffect(() => () => deckMaterial?.dispose(), [deckMaterial]);
  const landmark = space.type === 'MILESTONE' || space.type === 'CAREER_CHANGE';
  const finish = space.number === 75;
  const topY = landmark ? 0.87 : 0.71;
  const sideMaterial = visual.className === 'gamble' || visual.className === 'major' ? mats.accent : space.payday ? mats.lime : visual.className === 'deck' ? mats.event : visual.className === 'effect' ? mats.effect : mats.normal;
  const topMaterial = finish ? mats.milestone : landmark ? mats.milestone : space.payday ? mats.payday : visual.className === 'gamble' ? mats.gamble : visual.className === 'effect' ? mats.effect : deckMaterial ?? mats.normal;
  return <group position={[x, 0, z]} onPointerDown={(event) => { event.stopPropagation(); onSelect(space.number); }} onPointerOver={(event) => { event.stopPropagation(); onHover(space.number); }} onPointerOut={() => onHover(null)}>
    <mesh position={[0, 0.34, 0]} scale={[landmark ? 1.18 : 1, landmark ? 1.45 : 1, landmark ? 1.18 : 1]} geometry={tileShape} material={mats.base} castShadow receiveShadow />
    <mesh position={[0, landmark ? 0.7 : 0.56, 0]} scale={[landmark ? 1.18 : 1, 1, landmark ? 1.18 : 1]} geometry={edgeGeometry} material={sideMaterial} castShadow />
    <mesh position={[0, landmark ? 0.79 : 0.63, 0]} scale={[landmark ? 1.18 : 1, 1, landmark ? 1.18 : 1]} geometry={tileTop}
      material={topMaterial} castShadow receiveShadow />
    <mesh position={[0, topY + 0.015, 0.82]} geometry={stripShape} material={landing || active ? mats.lime : sideMaterial} />
    <mesh position={[-0.67, topY + 0.045, 0.49]} castShadow={false}>
      <boxGeometry args={[0.34, 0.035, 0.08]} />
      <meshStandardMaterial color={visual.accent} metalness={0.38} roughness={0.48} emissive={visual.accent} emissiveIntensity={visual.className === 'safe' ? 0.02 : 0.08} />
    </mesh>
    {space.type === 'GAMBLE' && <mesh position={[0, topY + 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.63, 0.71, 8]} /><primitive object={mats.accent} attach="material" />
    </mesh>}
    {space.type === 'EVENT' && <mesh position={[0.72, topY + 0.075, -0.68]} rotation={[-Math.PI / 2, 0, 0]} castShadow={false}>
      <boxGeometry args={[0.16, 0.025, 0.16]} /><primitive object={mats.safeMarker} attach="material" />
    </mesh>}
    {space.payday && <group position={[0.72, topY + 0.15, -0.66]}>
      <mesh castShadow><cylinderGeometry args={[0.19, 0.19, 0.1, 16]} /><primitive object={mats.lime} attach="material" /></mesh>
      <mesh position={[0, 0.07, 0]} castShadow><cylinderGeometry args={[0.14, 0.14, 0.04, 16]} /><primitive object={mats.payday} attach="material" /></mesh>
    </group>}
    {landmark && <group>
      {[-1, 1].map(side => <mesh key={side} position={[side * 1.03, topY + 0.26, 0]} castShadow>
        <boxGeometry args={[0.1, 0.48, 1.85]} /><primitive object={mats.accent} attach="material" />
      </mesh>)}
      <mesh position={[0, topY + 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.72, 0.79, 32]} /><primitive object={mats.accent} attach="material" />
      </mesh>
    </group>}
    <PrintedLabel lines={[String(space.number).padStart(2, '0')]} x={visual.className === 'safe' ? 0 : -0.52} y={topY + 0.045} z={-0.37} w={0.9} h={0.57} color={landmark ? COLORS.orange : COLORS.cream} />
    {space.type !== 'NORMAL' && (space.type !== 'EVENT' || visual.className === 'effect') && <PrintedIcon icon={space.icon} y={topY} color={visual.accent} z={space.secondaryIcon ? -0.55 : -0.26} size={space.secondaryIcon ? 0.6 : 0.64} />}
    {space.secondaryIcon && <PrintedIcon icon={space.secondaryIcon} y={topY} color={COLORS.lime} z={0.16} size={0.6} />}
    {finish && <PrintedLabel lines={['FINISH', 'ENDGAME SOON']} x={0} y={topY + 0.05} z={0.42} w={1.83} h={0.62} color={COLORS.orange} />}
  </group>;
}

function Connector({ a, b, hot = false }: { a: Point; b: Point; hot?: boolean }) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const length = Math.hypot(dx, dz);
  const angle = -Math.atan2(dz, dx);
  return <group position={[(a.x + b.x) / 2, 0, (a.z + b.z) / 2]} rotation={[0, angle, 0]}>
    <mesh position={[0, 0.31, 0]} castShadow receiveShadow>
      <boxGeometry args={[length, 0.16, 0.91]} /><primitive object={mats.base} attach="material" />
    </mesh>
    <mesh position={[0, 0.405, 0]}>
      <boxGeometry args={[length, 0.026, 0.12]} /><primitive object={hot ? mats.accent : mats.lime} attach="material" />
    </mesh>
    {[-1, 1].map(side => <mesh key={side} position={[0, 0.44, side * 0.47]}>
      <boxGeometry args={[length, 0.045, 0.045]} /><primitive object={hot ? mats.accent : mats.normal} attach="material" />
    </mesh>)}
  </group>;
}

function CircuitBoard() {
  return <group>
    <mesh position={[0, -0.42, 0]} receiveShadow>
      <boxGeometry args={[48, 0.86, 31.8]} />
      <meshStandardMaterial color={COLORS.side} metalness={0.55} roughness={0.48} />
    </mesh>
    <mesh position={[0, 0.012, 0]} receiveShadow>
      <boxGeometry args={[47.65, 0.08, 31.45]} />
      <meshStandardMaterial color={COLORS.rim} metalness={0.7} roughness={0.3} />
    </mesh>
    <mesh position={[0, 0.06, 0]} receiveShadow>
      <boxGeometry args={[47.25, 0.09, 31.05]} />
      <meshStandardMaterial color={COLORS.deck} metalness={0.52} roughness={0.6} />
    </mesh>
    {[-1, 1].map(s => <group key={s}>
      <mesh position={[0, 0.11, s * 15.15]}>
        <boxGeometry args={[46.8, 0.025, 0.1]} /><primitive object={mats.accent} attach="material" />
      </mesh>
      {Array.from({ length: 20 }, (_, i) => <mesh key={i} position={[-21.8 + i * 2.3, 0.115, s * 14.8]}>
        <boxGeometry args={[0.72, 0.012, 0.035]} /><primitive object={mats.lime} attach="material" />
      </mesh>)}
    </group>)}
    {Array.from({ length: 13 }, (_, i) => <group key={i}>
      <mesh position={[-21.6 + i * 3.6, 0.113, 2.6]}>
        <boxGeometry args={[1.9, 0.01, 0.016]} /><meshStandardMaterial color="#38574a" metalness={0.5} />
      </mesh>
      <mesh position={[-21.6 + i * 3.6, 0.113, 3.05]}>
        <boxGeometry args={[1.3, 0.01, 0.016]} /><meshStandardMaterial color="#38574a" metalness={0.5} />
      </mesh>
    </group>)}
    {[-1, 1].map(s => <mesh key={s} position={[s * 23.45, 0.11, 0]}>
      <boxGeometry args={[0.08, 0.025, 30.4]} /><primitive object={mats.accent} attach="material" />
    </mesh>)}
    <mesh position={[0, -0.92, 0]} receiveShadow>
      <boxGeometry args={[54, 0.08, 37]} />
      <meshStandardMaterial color="#101816" roughness={0.9} />
    </mesh>
    {[-1, 1].flatMap(x => [-1, 1].map(z => <mesh key={`${x}-${z}`} position={[x * 20.7, -0.93, z * 13.2]} castShadow>
      <boxGeometry args={[2.2, 0.25, 1.5]} /><meshStandardMaterial color="#0a100f" metalness={0.5} />
    </mesh>))}
  </group>;
}

function StartGate() {
  const p = ROUTE[0];
  return <group position={[p.x, 0, p.z]}>
    <mesh position={[0, 0.36, 0]} castShadow receiveShadow>
      <boxGeometry args={[3.2, 0.66, 3.55]} /><primitive object={mats.dark} attach="material" />
    </mesh>
    <mesh position={[0, 0.71, 0]} castShadow receiveShadow>
      <boxGeometry args={[3.08, 0.06, 3.42]} /><primitive object={mats.lime} attach="material" />
    </mesh>
    <mesh position={[0, 0.76, 0]} castShadow receiveShadow>
      <boxGeometry args={[2.94, 0.06, 3.28]} /><primitive object={mats.normal} attach="material" />
    </mesh>
    <PrintedLabel lines={['START', '00 / LAUNCH PAD']} x={0} y={0.801} z={0.15} w={2.25} h={0.78} color={COLORS.lime} />
    <PrintedIcon icon="start" y={0.76} color={COLORS.lime} x={0} z={-0.83} size={0.7} />
    {[-1, 1].map(s => <group key={s}>
      <mesh position={[s * 1.34, 1.05, -1.2]} castShadow><boxGeometry args={[0.14, 0.55, 0.18]} /><primitive object={mats.lime} attach="material" /></mesh>
      <mesh position={[s * 1.34, 1.63, -1.2]} castShadow><boxGeometry args={[0.14, 0.55, 0.18]} /><primitive object={mats.lime} attach="material" /></mesh>
    </group>)}
    <mesh position={[0, 1.84, -1.2]} castShadow><boxGeometry args={[2.82, 0.18, 0.22]} /><primitive object={mats.accent} attach="material" /></mesh>
  </group>;
}

function FinishGate() {
  const p = ROUTE[75];
  return <group position={[p.x, 0, p.z]}>
    <mesh position={[0, 0.38, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[1.52, 1.64, 0.76, 8]} /><primitive object={mats.dark} attach="material" />
    </mesh>
    <mesh position={[0, 0.78, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[1.5, 1.5, 0.08, 8]} /><primitive object={mats.accent} attach="material" />
    </mesh>
    {[-1, 1].map(s => <mesh key={s} position={[s * 1.36, 1.73, -0.25]} castShadow>
      <boxGeometry args={[0.18, 1.85, 0.22]} /><primitive object={mats.accent} attach="material" />
    </mesh>)}
    <mesh position={[0, 2.7, -0.25]} castShadow><boxGeometry args={[2.9, 0.23, 0.25]} /><primitive object={mats.accent} attach="material" /></mesh>
    <PrintedLabel lines={['FINISH', 'ENDGAME SOON']} x={0} y={0.84} z={0.98} w={2.25} h={0.66} color={COLORS.orange} />
  </group>;
}

function Miniature({ player, index, count, active, reduceMotion }: {
  player: MatchPlayer; index: number; count: number; active: boolean; reduceMotion: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const travel = useRef({ from: Math.max(0, Math.min(75, player.position)), to: Math.max(0, Math.min(75, player.position)), elapsed: 1 });
  const position = Math.max(0, Math.min(75, player.position));
  // Every STEP is 360ms. Animate each adjacent coordinate before the next state arrives.
  useEffect(() => {
    const state = travel.current;
    state.from = state.to;
    state.to = position;
    state.elapsed = reduceMotion ? 1 : 0;
  }, [position, reduceMotion]);
  useFrame(({ clock }, delta) => {
    const g = group.current;
    if (!g) return;
    const state = travel.current;
    state.elapsed = Math.min(1, state.elapsed + delta / 0.32);
    const t = state.elapsed * state.elapsed * (3 - 2 * state.elapsed);
    const a = ROUTE[state.from];
    const b = ROUTE[state.to];
    const spread = count > 1 ? 0.43 : 0;
    const offsetX = count > 1 ? (index % 2 ? 1 : -1) * spread : 0;
    const offsetZ = count > 1 ? (index < 2 ? -1 : 1) * spread : 0;
    g.position.set(
      a.x + (b.x - a.x) * t + offsetX,
      (state.to === 0 ? 0.79 : BOARD_SPACES[state.to - 1].type === 'MILESTONE' ? 0.9 : 0.75) + (reduceMotion ? 0 : Math.sin(t * Math.PI) * (state.elapsed < 1 ? 0.36 : 0)),
      a.z + (b.z - a.z) * t + offsetZ,
    );
    if (!reduceMotion && state.elapsed === 1) g.position.y += Math.sin(clock.elapsedTime * 1.8 + index) * 0.014;
  });
  return <group ref={group} scale={0.48} rotation={[0, -0.5, 0]}>
    <PawnModel characterId={player.characterId} selected={active} />
  </group>;
}

function CameraRig({ focus, overview, reduceMotion, zoom, pan }: { focus: number; overview: boolean; reduceMotion: boolean; zoom: number; pan: Point }) {
  const { camera, size } = useThree();
  const aim = useRef(new THREE.Vector3());
  const initialized = useRef(false);
  useFrame((_, delta) => {
    const p = ROUTE[Math.max(0, Math.min(75, focus))];
    const target = overview ? new THREE.Vector3(pan.x, 0, pan.z) : new THREE.Vector3(p.x + pan.x, 0, p.z + pan.z);
    const width = size.width / Math.max(size.height, 1);
    const height = (overview ? Math.max(37, 53 / width) : Math.max(14.7, 20 / width)) / zoom;
    const c = camera as THREE.OrthographicCamera;
    const factor = !initialized.current || reduceMotion ? 1 : Math.min(1, delta * (overview ? 3 : 5));
    c.left += (-height * width / 2 - c.left) * factor;
    c.right += (height * width / 2 - c.right) * factor;
    c.top += (height / 2 - c.top) * factor;
    c.bottom += (-height / 2 - c.bottom) * factor;
    c.updateProjectionMatrix();
    aim.current.lerp(target, factor);
    c.position.lerp(new THREE.Vector3(aim.current.x + 2, overview ? 39 : 21, aim.current.z + (overview ? 37 : 20)), factor);
    c.lookAt(aim.current);
    initialized.current = true;
  });
  return null;
}

export function BoardScene({ players, activePlayerId, landingPosition, overview, reduceMotion, zoom, pan, onSpaceSelect, onSpaceHover }: {
  players: MatchPlayer[]; activePlayerId: string; landingPosition: number | null; overview: boolean; reduceMotion: boolean; zoom: number; pan: Point; onSpaceSelect: (n: number) => void; onSpaceHover: (n: number | null) => void;
}) {
  const activePosition = players.find(p => p.playerId === activePlayerId)?.position ?? 0;
  return <>
    <color attach="background" args={['#101917']} />
    <ambientLight intensity={1.4} />
    <hemisphereLight args={['#bcd2c2', '#16201d', 1.8]} />
    <directionalLight position={[-12, 25, 17]} intensity={2.6} color="#ffe4cb" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-29} shadow-camera-right={29} shadow-camera-top={23} shadow-camera-bottom={-23} shadow-bias={-0.0005} />
    <directionalLight position={[14, 9, -12]} intensity={1.1} color="#a8d7bf" />
    <CameraRig focus={activePosition} overview={overview} reduceMotion={reduceMotion} zoom={zoom} pan={pan} />
    <CircuitBoard />
    {ROUTE.slice(0, 75).map((a, i) => <Connector key={i} a={a} b={ROUTE[i + 1]} hot={i > 0 && i % 15 === 0} />)}
    {BOARD_SPACES.map(space => <Tile key={space.number} space={space} active={space.number === activePosition} landing={space.number === landingPosition} onSelect={onSpaceSelect} onHover={onSpaceHover} />)}
    <StartGate />
    <FinishGate />
    {ZONES.map((name, i) => <StandingLabel key={name} name={name} index={i} x={ZONE_ANCHORS[i].x} z={ZONE_ANCHORS[i].z} color={ZONE_COLORS[i]} />)}
    <group position={[0, 0.15, 0]}>
      <mesh position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.28, 1.36, 48]} /><primitive object={mats.accent} attach="material" />
      </mesh>
      <PrintedLabel lines={['REDLINE', 'UPGRADE / CIRCUIT 01']} x={0} y={0.08} z={0} w={4.2} h={1.35} color={COLORS.orange} />
    </group>
    {players.map(player => {
      const colocated = players.filter(p => p.position === player.position).sort((a, b) => a.slot - b.slot);
      return <Miniature key={player.playerId} player={player} index={colocated.findIndex(p => p.playerId === player.playerId)} count={colocated.length} active={player.playerId === activePlayerId} reduceMotion={reduceMotion} />;
    })}
  </>;
}