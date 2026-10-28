import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { MatchPlayer } from '../game/match';
import { getBoardSpaces, type BoardSpace } from '../game/board-data';
import { ICON_PATHS } from '../game/icon-paths';
import { PawnModel } from './pawns/PawnModel';

type Point = { x: number; z: number };
type BioBoardSceneProps = {
  players: MatchPlayer[];
  activePlayerId: string;
  finishOrder?: number[];
  landingPosition: number | null;
  overview: boolean;
  reduceMotion: boolean;
  zoom: number;
  pan: Point;
  onSpaceSelect: (number: number) => void;
  onSpaceHover: (number: number | null) => void;
};

const ZONES = [
  { name: 'NIGHTCLUB', sub: 'PULSE DISTRICT', color: '#f36b9d', from: 1, to: 10, marker: 'club' },
  { name: 'CASINO ARCADE', sub: 'THE LUCKY LOOP', color: '#e5bd62', from: 11, to: 20, marker: 'casino' },
  { name: 'VIP LOUNGE', sub: 'UPPER DECK', color: '#a58ade', from: 21, to: 30, marker: 'lounge' },
  { name: 'HOLO BAR', sub: 'ZERO-PROOF SOCIAL', color: '#58d7d0', from: 31, to: 40, marker: 'bar' },
  { name: 'ROOFTOP', sub: 'SKYLINE LEVEL', color: '#77aef3', from: 41, to: 50, marker: 'roof' },
  { name: 'FESTIVAL', sub: 'AFTERGLOW FIELDS', color: '#f08c59', from: 51, to: 62, marker: 'festival' },
  { name: 'THE ARENA', sub: 'FINAL SHOWDOWN', color: '#fa5d61', from: 63, to: 75, marker: 'arena' },
] as const;

const TILE_LABELS = [
  'Guest list', 'Sound check', 'Light rig', 'Dance floor', 'Side stage', 'Spotlight', 'Encore pass', 'Crew call', 'Mix booth', 'Club exit',
  'Lucky number', 'Prize wheel', 'Token drop', 'Bonus round', 'High score', 'Neon lane', 'Skill shot', 'Arcade duel', 'Jackpot!', 'Game over',
  'Rope line', 'Private deck', 'Style check', 'Photo wall', 'Velvet seat', 'Host hello', 'Golden invite', 'VIP upgrade', 'Quiet suite', 'View deck',
  'Holo menu', 'Color shift', 'Sound wave', 'Light show', 'Pixel pour', 'Mocktail mix', 'Social spark', 'Glow garden', 'New signal', 'Open tab',
  'Sky pass', 'Wind tunnel', 'Cloud nine', 'Sunset set', 'City view', 'Rooftop run', 'Lookout point', 'Night breeze', 'High-rise', 'Lift off',
  'Wristband', 'Main tent', 'Festival map', 'Art walk', 'Bassline', 'Glow parade', 'Friend zone', 'Headliner', 'Dance break', 'Encore field', 'Crew tunnel', 'Final set',
  'Arena entry', 'Light the floor', 'Crowd wave', 'Sound clash', 'Stage rush', 'Spotlight round', 'All-star pass', 'Final encore', 'Champion lane', 'Victory lap', 'Hall of fame', 'Last call', 'Finish line',
] as const;

const ZONE_COLORS = ZONES.map(zone => zone.color);
const COLORS = {
  board: '#18232b',
  edge: '#273942',
  metal: '#47535b',
  tile: '#24333a',
  cream: '#f3ead7',
  muted: '#9eafb2',
  pink: '#f36b9d',
  mint: '#58d7d0',
};
const BIO_SPACES = getBoardSpaces('BIO_UPGRADE');

function getSpaceAccent(space: BoardSpace, zoneAccent: string): string {
  if (space.type === 'SALARY_GATE') return '#f3c969';
  if (space.type === 'CARD') {
    switch (space.deck) {
      case 'wealth': return '#d4ef79';
      case 'ai': return '#58d7d0';
      case 'fame': return '#f08c59';
      case 'lifestyle': return '#e59bd2';
      case 'influence': return '#a58ade';
      case 'gamble': return '#fa5d61';
      default: return zoneAccent;
    }
  }
  if (space.type === 'GAMBLE') return '#fa5d61';
  if (space.type === 'UPGRADE_TOKEN') return '#bba2ff';
  if (space.type === 'CAREER_CHANGE') return '#f3c969';
  if (space.type === 'MILESTONE') return '#f36b9d';
  if (space.type === 'NORMAL') return '#879198';
  return zoneAccent;
}

const routeCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-24, 0, 8),
  new THREE.Vector3(-22, 0, 2),
  new THREE.Vector3(-19, 0, -6),
  new THREE.Vector3(-14, 0, -11),
  new THREE.Vector3(-10, 0, -5),
  new THREE.Vector3(-13, 0, 2),
  new THREE.Vector3(-8, 0, 8),
  new THREE.Vector3(-2, 0, 10),
  new THREE.Vector3(4, 0, 6),
  new THREE.Vector3(2, 0, 0),
  new THREE.Vector3(7, 0, -6),
  new THREE.Vector3(14, 0, -8),
  new THREE.Vector3(20, 0, -3),
  new THREE.Vector3(16, 0, 4),
  new THREE.Vector3(10, 0, 8),
  new THREE.Vector3(12, 0, 14),
  new THREE.Vector3(19, 0, 16),
  new THREE.Vector3(25, 0, 11),
  new THREE.Vector3(23, 0, 4),
  new THREE.Vector3(27, 0, -4),
  new THREE.Vector3(23, 0, -12),
  new THREE.Vector3(16, 0, -15),
  new THREE.Vector3(8, 0, -13),
  new THREE.Vector3(2, 0, -16),
  new THREE.Vector3(-5, 0, -14),
  new THREE.Vector3(-10, 0, -17),
  new THREE.Vector3(-17, 0, -15),
  new THREE.Vector3(-23, 0, -11),
], false, 'centripetal');

/** Ordered from the luminous club entrance to the arena finish; index 0 is Start. */
export const BIO_ROUTE: Point[] = (() => {
  const samples = routeCurve.getSpacedPoints(75);
  return samples.map(point => ({ x: point.x, z: point.z }));
})();

function makeLabelTexture(title: string, detail: string, accent: string, width = 512, height = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = 'rgba(15,24,30,.93)';
  ctx.beginPath();
  ctx.roundRect(7, 7, width - 14, height - 14, 26);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(9, 9, width - 18, height - 18, 24);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = accent;
  ctx.font = '700 34px "Space Mono", monospace';
  ctx.fillText(detail.toUpperCase(), width / 2, 70, width - 40);
  ctx.fillStyle = COLORS.cream;
  ctx.font = '900 72px "Arial Narrow", sans-serif';
  ctx.fillText(title.toUpperCase(), width / 2, 157, width - 34);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeTileTexture(space: BoardSpace, label: string, accent: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = accent;
  ctx.font = '700 42px monospace';
  ctx.fillText(String(space.number).padStart(2, '0'), 42, 76);
  ctx.save();
  ctx.translate(376, 82);
  ctx.fillStyle = '#101a20';
  ctx.strokeStyle = accent;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(0, 0, 48, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#f3ead7';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.scale(3.2, 3.2);
  ctx.translate(-12, -12);
  ctx.stroke(new Path2D(ICON_PATHS[space.icon] ?? ICON_PATHS.normal));
  ctx.restore();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = space.type === 'NORMAL' ? '#d8deda' : accent;
  ctx.font = `800 ${label.length > 15 ? 25 : label.length > 10 ? 30 : 34}px "Arial Narrow", sans-serif`;
  ctx.fillText(label.toUpperCase(), 256, 282, 456);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeSpaceIconTexture(space: BoardSpace, accent: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);
  ctx.fillStyle = '#101a20';
  ctx.strokeStyle = accent;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(64, 64, 57, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.translate(22, 22);
  ctx.scale(3.35, 3.35);
  ctx.strokeStyle = '#fff6df';
  ctx.lineWidth = 1.7;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke(new Path2D(ICON_PATHS[space.icon] ?? ICON_PATHS.normal));
  ctx.restore();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function Sign({ title, sub, accent, position, scale = 1 }: { title: string; sub: string; accent: string; position: [number, number, number]; scale?: number }) {
  const texture = useMemo(() => makeLabelTexture(title, sub, accent), [title, sub, accent]);
  return <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} scale={[scale, scale, scale]}>
    <planeGeometry args={[2.75, 1.28]} />
    <meshBasicMaterial map={texture} transparent toneMapped={false} side={THREE.DoubleSide} />
  </mesh>;
}

function Floor() {
  return <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} receiveShadow>
      <planeGeometry args={[62, 42]} />
      <meshStandardMaterial color={COLORS.board} roughness={0.48} metalness={0.28} />
    </mesh>
    <mesh position={[0, -0.23, 0]} castShadow receiveShadow>
      <boxGeometry args={[62.8, 0.42, 42.8]} />
      <meshStandardMaterial color={COLORS.edge} roughness={0.36} metalness={0.58} />
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]}>
      <planeGeometry args={[60.5, 40.5]} />
      <meshBasicMaterial color="#293943" wireframe transparent opacity={0.2} />
    </mesh>
    {[-29.8, 29.8].map(x => <mesh key={`edge-x-${x}`} position={[x, -0.13, 0]} castShadow>
      <boxGeometry args={[0.24, 0.28, 40.6]} />
      <meshStandardMaterial color={COLORS.metal} metalness={0.72} roughness={0.26} />
    </mesh>)}
    {[-19.8, 19.8].map(z => <mesh key={`edge-z-${z}`} position={[0, -0.13, z]} castShadow>
      <boxGeometry args={[60, 0.28, 0.24]} />
      <meshStandardMaterial color={COLORS.metal} metalness={0.72} roughness={0.26} />
    </mesh>)}
  </group>;
}

function Walkway({ a, b, index }: { a: Point; b: Point; index: number }) {
  const from = new THREE.Vector3(a.x, 0.015, a.z);
  const to = new THREE.Vector3(b.x, 0.015, b.z);
  const midpoint = from.clone().add(to).multiplyScalar(0.5);
  const delta = to.clone().sub(from);
  const color = ZONE_COLORS[Math.min(6, Math.floor(index / 11))];
  return <group position={midpoint} rotation={[0, Math.atan2(delta.x, delta.z), 0]}>
    <mesh position={[0, -0.04, 0]} receiveShadow>
      <boxGeometry args={[0.3, 0.09, delta.length() - 1.5]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.32} metalness={0.36} roughness={0.3} />
    </mesh>
    <mesh position={[0, 0.015, 0]}>
      <boxGeometry args={[0.09, 0.03, delta.length() - 1.58]} />
      <meshBasicMaterial color="#f4ead8" transparent opacity={0.48} />
    </mesh>
  </group>;
}

function SpaceTile({ space, point, accent, active, landing, onSelect, onHover }: {
  space: BoardSpace; point: Point; accent: string; active: boolean; landing: boolean;
  onSelect: (n: number) => void; onHover: (n: number | null) => void;
}) {
  const number = space.number;
  const label = space.label;
  const texture = useMemo(() => makeTileTexture(space, label, accent), [space, label, accent]);
  const iconTexture = useMemo(() => makeSpaceIconTexture(space, accent), [space.icon, accent]);
  useEffect(() => () => { texture.dispose(); iconTexture.dispose(); }, [texture, iconTexture]);
  const next = BIO_ROUTE[number];
  const previous = BIO_ROUTE[number - 2] ?? BIO_ROUTE[0];
  const angle = Math.atan2((next?.x ?? point.x) - (previous?.x ?? point.x), (next?.z ?? point.z) - (previous?.z ?? point.z));
  const tileColor = space.type === 'CARD' ? '#202d32'
    : space.type === 'GAMBLE' ? '#38272e'
      : space.type === 'UPGRADE_TOKEN' ? '#2e293c'
        : space.type === 'SALARY_GATE' ? '#37342a'
          : space.type === 'MILESTONE' ? '#48243e' : '#30423b';
  const edgeColor = landing || active ? '#d4e981' : accent;
  return <group position={[point.x, 0, point.z]} rotation={[0, angle, 0]}>
    <mesh position={[0, 0.34, 0]} castShadow receiveShadow>
      <boxGeometry args={[2, 0.24, 1.84]} />
      <meshStandardMaterial color="#101a19" metalness={0.55} roughness={0.52} />
    </mesh>
    <mesh position={[0, 0.56, 0]}>
      <boxGeometry args={[2.06, 0.035, 1.9]} />
      <meshStandardMaterial color={edgeColor} metalness={0.68} roughness={0.34} emissive={edgeColor} emissiveIntensity={0.08} />
    </mesh>
    <mesh position={[0, 0.63, 0]} castShadow receiveShadow>
      <boxGeometry args={[1.9, 0.12, 1.74]} />
      <meshStandardMaterial color={landing ? '#493446' : active ? '#34464b' : tileColor} metalness={0.46} roughness={0.3} />
    </mesh>
    <mesh position={[0, 0.70, 0]}>
      <planeGeometry args={[1.86, 1.62]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} depthWrite={false} />
    </mesh>
    <mesh position={[0.59, 0.78, -0.26]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[space.type === 'MILESTONE' ? 0.68 : 0.56, space.type === 'MILESTONE' ? 0.68 : 0.56]} />
      <meshBasicMaterial map={iconTexture} transparent toneMapped={false} depthWrite={false} />
    </mesh>
    {space.type === 'MILESTONE' && <mesh position={[-0.72, 0.79, 0.48]} rotation={[0, Math.PI / 4, Math.PI / 4]} castShadow>
      <octahedronGeometry args={[0.2, 0]} />
      <meshStandardMaterial color="#ff72be" emissive="#ff4eab" emissiveIntensity={0.7} metalness={0.45} roughness={0.22} />
    </mesh>}
    {(active || landing) && <mesh position={[0, 0.705, 0]}>
      <planeGeometry args={[1.9, 1.66]} />
      <meshBasicMaterial color={landing ? '#f7bd71' : '#b1ede1'} transparent opacity={0.17} depthWrite={false} />
    </mesh>}
    {(space.type === 'CARD' || space.type === 'GAMBLE') && <group position={[0.59, 0.715, -0.26]}>
      <mesh position={[0, 0.006, 0]} castShadow><cylinderGeometry args={[0.5, 0.47, 0.075, 8]} /><meshStandardMaterial color="#0d1715" metalness={0.78} roughness={0.3} /></mesh>
      <mesh position={[0, 0.022, 0]}><cylinderGeometry args={[0.42, 0.42, 0.026, 32]} /><meshStandardMaterial color="#17221f" metalness={0.52} roughness={0.43} /></mesh>
      <mesh position={[0, 0.04, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.36, 0.026, 6, 32]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.16} metalness={0.68} roughness={0.34} /></mesh>
    </group>}
    {space.type === 'SALARY_GATE' && <group position={[0, 0.68, 0.35]}>
      {[-0.42, 0.42].map(x => <mesh key={x} position={[x, 0.2, 0]} castShadow><boxGeometry args={[0.08, 0.42, 0.18]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.16} /></mesh>)}
      <mesh position={[0, 0.4, 0]} castShadow><boxGeometry args={[0.94, 0.08, 0.18]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.16} /></mesh>
    </group>}
    {space.type === 'UPGRADE_TOKEN' && <group position={[0.59, 0.72, 0.22]}>
      <mesh castShadow><cylinderGeometry args={[0.32, 0.38, 0.16, 6]} /><meshStandardMaterial color="#433b5a" emissive={accent} emissiveIntensity={0.18} metalness={0.72} roughness={0.28} /></mesh>
      <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.35, 0.4, 6]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.3} /></mesh>
    </group>}
    {space.type === 'GAMBLE' && <mesh position={[0, 0.72, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.63, 0.69, 8]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.35} /></mesh>}
    <mesh position={[0, 0.73, 0]} onClick={event => { event.stopPropagation(); onSelect(number); }}
      onPointerOver={event => { event.stopPropagation(); onHover(number); }} onPointerOut={() => onHover(null)}>
      <planeGeometry args={[2.1, 1.82]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  </group>;
}

function ZoneMarker({ zone, index }: { zone: typeof ZONES[number]; index: number }) {
  const routeIndex = Math.round((zone.from + zone.to) / 2);
  const center = BIO_ROUTE[routeIndex];
  const tangentBefore = BIO_ROUTE[Math.max(0, routeIndex - 1)];
  const tangentAfter = BIO_ROUTE[Math.min(75, routeIndex + 1)];
  const dx = tangentAfter.x - tangentBefore.x;
  const dz = tangentAfter.z - tangentBefore.z;
  const length = Math.hypot(dx, dz) || 1;
  const position: [number, number, number] = [center.x + (dz / length) * (index % 2 ? 3.35 : -3.35), 0, center.z - (dx / length) * (index % 2 ? 3.35 : -3.35)];
  return <group position={position}>
    <mesh position={[0, 0.01, 0]} receiveShadow>
      <cylinderGeometry args={[2.05, 2.25, 0.24, 8]} />
      <meshStandardMaterial color="#27353a" metalness={0.62} roughness={0.3} />
    </mesh>
    <mesh position={[0, 0.15, 0]}>
      <torusGeometry args={[1.75, 0.07, 8, 40]} />
      <meshStandardMaterial color={zone.color} emissive={zone.color} emissiveIntensity={0.42} metalness={0.45} roughness={0.25} />
    </mesh>
    {zone.marker === 'club' && <>
      {[-1, 1].map(side => <mesh key={side} position={[side * 1.35, 1.05, 0]} castShadow>
        <boxGeometry args={[0.2, 2.1, 0.25]} />
        <meshStandardMaterial color={zone.color} emissive={zone.color} emissiveIntensity={0.25} />
      </mesh>)}
      <mesh position={[0, 2.12, 0]}><boxGeometry args={[2.9, 0.16, 0.25]} /><meshStandardMaterial color={zone.color} emissive={zone.color} emissiveIntensity={0.28} /></mesh>
    </>}
    {zone.marker === 'casino' && <>
      {[0, 1, 2, 3, 4].map(i => <mesh key={i} position={[(i - 2) * 0.48, 0.7 + (i % 2) * 0.13, 0]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.24, 0.24, 0.24]} /><meshStandardMaterial color={zone.color} emissive={zone.color} emissiveIntensity={0.5} />
      </mesh>)}
      <mesh position={[0, 1.45, 0]}><torusGeometry args={[0.72, 0.08, 7, 24]} /><meshStandardMaterial color={zone.color} emissive={zone.color} emissiveIntensity={0.5} /></mesh>
    </>}
    {zone.marker === 'lounge' && <>
      {[-1, 1].map(side => <mesh key={side} position={[side * 1.18, 0.62, -0.35]} castShadow>
        <boxGeometry args={[0.68, 0.9, 0.64]} /><meshStandardMaterial color="#3d3552" metalness={0.22} roughness={0.68} />
      </mesh>)}
      <mesh position={[0, 0.42, 0.68]} castShadow><boxGeometry args={[1.55, 0.2, 0.74]} /><meshStandardMaterial color="#5c4869" /></mesh>
      <mesh position={[0, 1.38, -0.5]}><boxGeometry args={[3, 0.12, 0.12]} /><meshStandardMaterial color={zone.color} emissive={zone.color} emissiveIntensity={0.35} /></mesh>
    </>}
    {zone.marker === 'bar' && <>
      <mesh position={[0, 0.66, 0]} castShadow><boxGeometry args={[2.35, 1.18, 0.72]} /><meshStandardMaterial color="#244344" metalness={0.55} roughness={0.24} /></mesh>
      <mesh position={[0, 1.27, 0]}><boxGeometry args={[2.5, 0.12, 0.84]} /><meshStandardMaterial color={zone.color} emissive={zone.color} emissiveIntensity={0.45} /></mesh>
      {[-0.72, 0, 0.72].map((x, i) => <mesh key={i} position={[x, 0.91, 0.39]}><boxGeometry args={[0.32, 0.28, 0.035]} /><meshBasicMaterial color={i === 1 ? '#f3ead7' : zone.color} /></mesh>)}
    </>}
    {zone.marker === 'roof' && <>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => <mesh key={`${x}-${z}`} position={[x * 1.15, 0.7, z * 0.74]} castShadow>
        <boxGeometry args={[0.13, 1.4 + (x === z ? 0.35 : 0), 0.13]} /><meshStandardMaterial color={zone.color} metalness={0.6} roughness={0.25} />
      </mesh>)}
      <mesh position={[0, 1.52, 0]}><boxGeometry args={[2.5, 0.13, 0.13]} /><meshStandardMaterial color={zone.color} emissive={zone.color} emissiveIntensity={0.35} /></mesh>
    </>}
    {zone.marker === 'festival' && <>
      {[-1, 1].map(side => <mesh key={side} position={[side * 1.28, 0.9, 0]} rotation={[0, 0, side * -0.08]} castShadow>
        <boxGeometry args={[0.16, 1.8, 0.16]} /><meshStandardMaterial color={zone.color} metalness={0.35} roughness={0.36} />
      </mesh>)}
      <mesh position={[0, 1.72, 0]}><boxGeometry args={[2.8, 0.14, 0.2]} /><meshStandardMaterial color={zone.color} emissive={zone.color} emissiveIntensity={0.32} /></mesh>
      {[-0.7, 0, 0.7].map((x, i) => <mesh key={i} position={[x, 1.33 + (i % 2) * 0.18, 0]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.18, 0.18, 0.18]} /><meshStandardMaterial color="#f3ead7" emissive={zone.color} emissiveIntensity={0.3} />
      </mesh>)}
    </>}
    {zone.marker === 'arena' && <>
      {[0, 1, 2].map(level => <mesh key={level} position={[0, 0.28 + level * 0.2, 0]} castShadow><cylinderGeometry args={[1.55 + level * 0.3, 1.8 + level * 0.3, 0.16, 16]} /><meshStandardMaterial color={level === 1 ? '#503741' : '#3a2c33'} metalness={0.62} roughness={0.28} /></mesh>)}
      <mesh position={[0, 0.68, 0]}><torusGeometry args={[1.35, 0.08, 8, 40]} /><meshStandardMaterial color={zone.color} emissive={zone.color} emissiveIntensity={0.7} /></mesh>
      {[-1, 1].map(side => <mesh key={side} position={[side * 1.35, 1.65, 0]} castShadow><boxGeometry args={[0.16, 2.05, 0.18]} /><meshStandardMaterial color={zone.color} emissive={zone.color} emissiveIntensity={0.45} /></mesh>)}
      <mesh position={[0, 2.67, 0]}><boxGeometry args={[2.85, 0.17, 0.18]} /><meshStandardMaterial color={zone.color} emissive={zone.color} emissiveIntensity={0.48} /></mesh>
      {[-0.9, 0, 0.9].map(x => <mesh key={x} position={[x, 1.02, -0.8]} castShadow><boxGeometry args={[0.16, 0.66, 0.22]} /><meshStandardMaterial color="#e2b5a8" metalness={0.5} roughness={0.4} /></mesh>)}
    </>}
    {zone.marker === 'club' && <>
      <mesh position={[0, 1.15, -0.58]} castShadow><boxGeometry args={[3.55, 2.15, 0.58]} /><meshStandardMaterial color="#322b3b" metalness={0.38} roughness={0.5} /></mesh>
      <mesh position={[0, 0.82, -0.245]}><boxGeometry args={[0.72, 1.42, 0.08]} /><meshStandardMaterial color="#131d26" metalness={0.7} roughness={0.2} /></mesh>
      {[-1.35, 1.35].map(x => <mesh key={x} position={[x, 1.36, -0.22]}><boxGeometry args={[0.55, 0.72, 0.08]} /><meshStandardMaterial color="#7a4264" emissive={zone.color} emissiveIntensity={0.2} /></mesh>)}
      <mesh position={[0, 2.27, -0.55]}><boxGeometry args={[4, 0.16, 0.82]} /><meshStandardMaterial color={zone.color} emissive={zone.color} emissiveIntensity={0.28} /></mesh>
      {[-1.65, 1.65].map(x => <mesh key={x} position={[x, 0.38, -0.58]} castShadow><boxGeometry args={[0.16, 0.52, 0.72]} /><meshStandardMaterial color="#ab8c9b" metalness={0.65} /></mesh>)}
    </>}
    {zone.marker === 'casino' && [-1, 0, 1].map((x, i) => <group key={x} position={[x * 1.05, 0, -0.48]}>
      <mesh position={[0, 0.57, 0]} castShadow><boxGeometry args={[0.72, 1.08, 0.62]} /><meshStandardMaterial color={i === 1 ? '#4d3446' : '#303746'} metalness={0.5} roughness={0.32} /></mesh>
      <mesh position={[0, 0.74, 0.33]}><boxGeometry args={[0.48, 0.33, 0.045]} /><meshStandardMaterial color={i === 1 ? '#fa5d61' : zone.color} emissive={zone.color} emissiveIntensity={0.65} /></mesh>
      <mesh position={[0, 0.17, 0.34]}><boxGeometry args={[0.42, 0.12, 0.05]} /><meshStandardMaterial color="#f3ead7" metalness={0.5} /></mesh>
    </group>)}
    {zone.marker === 'lounge' && <>
      <mesh position={[0, 1.08, -0.82]} castShadow><boxGeometry args={[4.05, 2.05, 0.34]} /><meshStandardMaterial color="#292739" roughness={0.64} /></mesh>
      {[-1.48, 1.48].map(x => <mesh key={x} position={[x, 1.08, -0.6]}><boxGeometry args={[0.7, 1.2, 0.07]} /><meshStandardMaterial color="#bba2ff" emissive="#a58ade" emissiveIntensity={0.22} /></mesh>)}
      <mesh position={[0, 1.76, -0.52]}><boxGeometry args={[2.2, 0.12, 0.09]} /><meshStandardMaterial color={zone.color} emissive={zone.color} emissiveIntensity={0.35} /></mesh>
    </>}
    {zone.marker === 'bar' && [-0.82, 0, 0.82].map((x, i) => <group key={x} position={[x, 0, -0.47]}>
      <mesh position={[0, 1.12, 0]} castShadow><cylinderGeometry args={[0.1, 0.13, 0.38, 8]} /><meshStandardMaterial color={['#8bd2bd', '#e1aa6b', '#d68daf'][i]} roughness={0.24} /></mesh>
      <mesh position={[0, 1.34, 0]}><cylinderGeometry args={[0.06, 0.08, 0.1, 8]} /><meshStandardMaterial color="#e9d7c4" /></mesh>
    </group>)}
    {zone.marker === 'roof' && [-1, 0, 1].map((x, i) => <mesh key={x} position={[x * 1.12, 0.66 + (i % 2) * 0.22, -0.6]} castShadow>
      <boxGeometry args={[0.72, 1.2 + (i % 2) * 0.44, 0.5]} /><meshStandardMaterial color={i === 1 ? '#354653' : '#283943'} metalness={0.58} roughness={0.35} />
    </mesh>)}
    {zone.marker === 'festival' && [-1, 1].map(x => <group key={x} position={[x * 1.12, 0, -0.48]}>
      <mesh position={[0, 0.58, 0]} castShadow><cylinderGeometry args={[0.82, 0.82, 0.12, 5]} /><meshStandardMaterial color="#4b3b39" /></mesh>
      <mesh position={[0, 1.1, 0]} castShadow><coneGeometry args={[0.76, 1.05, 5]} /><meshStandardMaterial color={x < 0 ? '#7e4563' : '#c67842'} roughness={0.58} /></mesh>
    </group>)}
    <Sign title={zone.name} sub={zone.sub} accent={zone.color} position={[0, zone.marker === 'arena' ? 3.55 : 2.55, 0]} scale={0.86} />
    {index === 0 && <mesh position={[0, 0.35, 0]}><torusGeometry args={[1.44, 0.025, 6, 32]} /><meshBasicMaterial color="#f3ead7" /></mesh>}
  </group>;
}

function StartAndFinish() {
  const start = BIO_ROUTE[0];
  const finish = BIO_ROUTE[75];
  return <>
    <group position={[start.x, 0, start.z]}>
      <mesh position={[0, 0.05, 0]}><cylinderGeometry args={[1.7, 1.95, 0.26, 8]} /><meshStandardMaterial color="#263740" metalness={0.55} roughness={0.3} /></mesh>
      <mesh position={[0, 0.21, 0]}><torusGeometry args={[1.48, 0.09, 8, 32]} /><meshStandardMaterial color="#f3ead7" emissive="#f3ead7" emissiveIntensity={0.3} /></mesh>
      <Sign title="START" sub="NIGHT BEGINS" accent="#f3ead7" position={[0, 2.15, 0]} />
      <mesh position={[0, 1.1, -0.2]}><boxGeometry args={[2.9, 0.1, 0.13]} /><meshStandardMaterial color="#f3ead7" emissive="#f3ead7" emissiveIntensity={0.28} /></mesh>
    </group>
    <group position={[finish.x, 0, finish.z]}>
      <mesh position={[0, 0.06, 0]}><cylinderGeometry args={[2, 2.25, 0.3, 12]} /><meshStandardMaterial color="#362932" metalness={0.7} roughness={0.24} /></mesh>
      <mesh position={[0, 0.25, 0]}><torusGeometry args={[1.72, 0.13, 8, 48]} /><meshStandardMaterial color="#fa5d61" emissive="#fa5d61" emissiveIntensity={0.65} /></mesh>
      <Sign title="FINISH" sub="CLAIM THE NIGHT" accent="#fa5d61" position={[0, 3.25, 0]} />
      <mesh position={[0, 1.72, 0]}><torusGeometry args={[1.45, 0.075, 8, 40]} /><meshStandardMaterial color="#f3ead7" emissive="#f3ead7" emissiveIntensity={0.32} /></mesh>
      <mesh position={[0, 0.57, 0]}><cylinderGeometry args={[0.95, 1.15, 0.38, 10]} /><meshStandardMaterial color="#5a3440" metalness={0.58} roughness={0.3} /></mesh>
    </group>
  </>;
}

function LivePawn({ player, index, count, active, reduceMotion }: { player: MatchPlayer; index: number; count: number; active: boolean; reduceMotion: boolean }) {
  const position = Math.max(0, Math.min(75, player.position));
  const point = BIO_ROUTE[position];
  const previous = BIO_ROUTE[Math.max(0, position - 1)];
  const next = BIO_ROUTE[Math.min(75, position + 1)];
  const rotation = Math.atan2(next.x - previous.x, next.z - previous.z);
  const angle = (index / Math.max(1, count)) * Math.PI * 2;
  const offset = count > 1 ? 0.53 : 0;
  const bob = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!bob.current || reduceMotion) return;
    bob.current.position.y = 0.21 + (active ? Math.sin(clock.elapsedTime * 3.1) * 0.07 : 0);
  });
  return <group position={[point.x + Math.cos(angle) * offset, 0, point.z + Math.sin(angle) * offset]} rotation={[0, rotation, 0]}>
    <group ref={bob} position={[0, 0.21, 0]} scale={0.42}>
      <PawnModel characterId={player.characterId} boardId="BIO_UPGRADE" selected={active} />
    </group>
    {active && <mesh position={[0, 0.24, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.92, 1.02, 40]} /><meshBasicMaterial color="#f3ead7" transparent opacity={0.88} side={THREE.DoubleSide} />
    </mesh>}
  </group>;
}

function CameraRig({ focus, overview, reduceMotion, zoom, pan }: { focus: number; overview: boolean; reduceMotion: boolean; zoom: number; pan: Point }) {
  const { camera, size } = useThree();
  const aim = useRef(new THREE.Vector3());
  const initialized = useRef(false);
  useFrame((_, delta) => {
    const point = BIO_ROUTE[Math.max(0, Math.min(75, focus))];
    const target = overview ? new THREE.Vector3(pan.x, 0, pan.z) : new THREE.Vector3(point.x + pan.x, 0, point.z + pan.z);
    const aspect = size.width / Math.max(size.height, 1);
    // Bio's ~63×43 tabletop is larger than Standard's; size the orthographic
    // frustum to the actual Bio bounds while keeping the same follow angle.
    const frustumHeight = (overview ? Math.max(47, 70 / aspect) : Math.max(11.5, 17 / aspect)) / zoom;
    const orthographic = camera as THREE.OrthographicCamera;
    const factor = !initialized.current || reduceMotion ? 1 : Math.min(1, delta * (overview ? 3 : 5));
    orthographic.left += (-frustumHeight * aspect / 2 - orthographic.left) * factor;
    orthographic.right += (frustumHeight * aspect / 2 - orthographic.right) * factor;
    orthographic.top += (frustumHeight / 2 - orthographic.top) * factor;
    orthographic.bottom += (-frustumHeight / 2 - orthographic.bottom) * factor;
    orthographic.updateProjectionMatrix();
    aim.current.lerp(target, factor);
    orthographic.position.lerp(
      new THREE.Vector3(aim.current.x + (overview ? 0 : 2), overview ? 46 : 14.5, aim.current.z + (overview ? 43 : 13.8)),
      factor,
    );
    orthographic.lookAt(aim.current);
    initialized.current = true;
  });
  return null;
}

export function BioBoardScene({
  players,
  activePlayerId,
  finishOrder: _finishOrder = [],
  landingPosition,
  overview,
  reduceMotion,
  zoom,
  pan,
  onSpaceSelect,
  onSpaceHover,
}: BioBoardSceneProps) {
  const activePosition = players.find(player => player.playerId === activePlayerId)?.position ?? 0;
  const occupants = useMemo(() => {
    const grouped = new Map<number, MatchPlayer[]>();
    players.forEach(player => {
      const position = Math.max(0, Math.min(75, player.position));
      grouped.set(position, [...(grouped.get(position) ?? []), player]);
    });
    return grouped;
  }, [players]);
  return <>
    <color attach="background" args={['#111a20']} />
    <ambientLight intensity={1.4} />
    <hemisphereLight args={['#e1d4c6', '#18242b', 1.8]} />
    <directionalLight position={[-14, 24, 18]} intensity={2.6} color="#ffe3c1" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-34} shadow-camera-right={34} shadow-camera-top={24} shadow-camera-bottom={-24} shadow-bias={-0.0004} />
    <directionalLight position={[17, 12, -15]} intensity={1.25} color="#9de7dd" />
    <pointLight position={[-18, 3, -5]} intensity={1.5} distance={12} color="#ef6d9d" />
    <pointLight position={[18, 3, 9]} intensity={1.7} distance={13} color="#f8b85e" />
    <pointLight position={[0, 4, -2]} intensity={1.45} distance={15} color="#60d8d2" />
    <CameraRig focus={activePosition} overview={overview} reduceMotion={reduceMotion} zoom={zoom} pan={pan} />
    <Floor />
    {BIO_ROUTE.slice(0, 75).map((point, index) => <Walkway key={`walk-${index}`} a={point} b={BIO_ROUTE[index + 1]} index={index} />)}
    {BIO_SPACES.map(space => {
      const number = space.number;
      const point = BIO_ROUTE[number];
      const zone = ZONES.find(item => number >= item.from && number <= item.to) ?? ZONES[0];
      const accent = getSpaceAccent(space, zone.color);
      return <SpaceTile key={number} space={space} point={point} accent={accent}
        active={number === activePosition} landing={number === landingPosition}
        onSelect={onSpaceSelect} onHover={onSpaceHover} />;
    })}
    {ZONES.map((zone, index) => <ZoneMarker key={zone.name} zone={zone} index={index} />)}
    <StartAndFinish />
    {players.map(player => {
      const atPosition = occupants.get(Math.max(0, Math.min(75, player.position))) ?? [player];
      const index = atPosition.findIndex(candidate => candidate.playerId === player.playerId);
      return <LivePawn key={player.playerId} player={player} index={index} count={atPosition.length} active={player.playerId === activePlayerId} reduceMotion={reduceMotion} />;
    })}
  </>;
}

export default BioBoardScene;
