import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
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
export const SPACE_TILE_FOOTPRINT = { width: 2.06, depth: 1.9, landmarkScale: 1.02 } as const;
export const START_PAD_FOOTPRINT = { width: 2.9, depth: 3.55 } as const;
export const PHASE_FLAG_FOOTPRINT = { width: 2.5, depth: 0.12 } as const;
export const TABLETOP_DRESSING = [
  { id: 'redline-sign', x: -16.4, z: -14.25, width: 3.7, depth: 0.44, title: 'REDLINE', subtitle: 'UPGRADE SYSTEMS', accent: '#f96346' },
  { id: 'market-display', x: 16.4, z: -14.25, width: 3.7, depth: 0.44, title: 'MARKET', subtitle: 'LIVE EXCHANGE', accent: '#d4e981' },
  { id: 'ai-terminal', x: -16.4, z: 14.25, width: 3.7, depth: 0.44, title: 'AI NODE', subtitle: 'SKILL NETWORK', accent: '#88c6c2' },
] as const;
export const TABLETOP_STRUCTURES = [
  { id: 'north-spine', x: 20.4, z: 13.7, width: 2.9, depth: 0.7, label: 'NORTH / 05', accent: '#e9c477' },
  { id: 'south-spine', x: 20.4, z: -13.7, width: 2.9, depth: 0.7, label: 'SOUTH / 06', accent: '#f96346' },
  { id: 'west-spine', x: -20.4, z: 13.7, width: 2.9, depth: 0.7, label: 'WEST / 02', accent: '#88c6c2' },
] as const;
export const TABLETOP_BUILDINGS = [
  { id: 'grind-foundry', x: -20.4, z: -13.75, width: 2.7, depth: 1.52, height: 1.02, color: '#2b3328', accent: '#c5b96d', profile: 'industrial', label: 'FOUNDRY' },
  { id: 'north-skyline', x: -17.3, z: 11.5, width: 2.1, depth: 1.42, height: 1.62, color: '#263a3a', accent: '#88c6c2', profile: 'tower', label: 'SKYLINE' },
  { id: 'flex-garage', x: 17.25, z: 13.7, width: 2.8, depth: 1.48, height: 0.84, color: '#243a39', accent: '#88c6c2', profile: 'garage', label: 'PIT 09' },
  { id: 'relay-neon', x: 20.3, z: -10.9, width: 2.3, depth: 1.38, height: 1.08, color: '#302e26', accent: '#f96346', profile: 'neon', label: 'RELAY' },
] as const;

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

function DressingPanel({ panel }: { panel: typeof TABLETOP_DRESSING[number] }) {
  const texture = useMemo(() => graphic([panel.title, panel.subtitle], panel.accent), [panel.title, panel.subtitle, panel.accent]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <group position={[panel.x, 0.16, panel.z]}>
    <mesh position={[0, 0.045, 0]} receiveShadow>
      <boxGeometry args={[panel.width, 0.09, panel.depth]} />
      <meshStandardMaterial color="#101a17" metalness={0.82} roughness={0.3} />
    </mesh>
    <mesh position={[0, 0.11, 0]}>
      <boxGeometry args={[panel.width - 0.28, 0.025, panel.depth - 0.14]} />
      <meshStandardMaterial color={panel.accent} emissive={panel.accent} emissiveIntensity={0.16} metalness={0.72} roughness={0.32} />
    </mesh>
    <mesh position={[0, 0.145, 0]}>
      <planeGeometry args={[panel.width - 0.8, 0.2]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </mesh>
    <mesh position={[-panel.width / 2 + 0.28, 0.15, 0]}>
      <boxGeometry args={[0.06, 0.055, 0.34]} />
      <meshStandardMaterial color="#d9e9c0" emissive="#d9e9c0" emissiveIntensity={0.25} />
    </mesh>
  </group>;
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
  const lines = useMemo(() => [name, `ZONE 0${index + 1}`], [index, name]);
  const texture = useMemo(() => graphic(lines, color), [lines, color]);
  const banner = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-1.34, 0.42);
    shape.lineTo(1.34, 0.42);
    shape.lineTo(1.34, -0.38);
    shape.lineTo(0, -0.54);
    shape.lineTo(-1.34, -0.38);
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  useEffect(() => () => banner.dispose(), [banner]);
  return <group position={[x, 0.14, z]} rotation={[0, Math.atan2(-x, -z), 0]}>
    <mesh position={[-1.1, 0.72, 0]} castShadow>
      <boxGeometry args={[0.075, 1.44, 0.085]} />
      <meshStandardMaterial color="#35453d" metalness={0.78} roughness={0.32} />
    </mesh>
    <mesh position={[0, 1.48, 0]} castShadow>
      <boxGeometry args={[2.78, 0.055, 0.09]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.14} metalness={0.7} roughness={0.3} />
    </mesh>
    <mesh position={[0, 1.08, 0]} geometry={banner} castShadow>
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.08} roughness={0.72} side={THREE.DoubleSide} />
    </mesh>
    <mesh position={[0, 1.08, 0.055]}>
      <planeGeometry args={[2.55, 0.62]} />
      <meshBasicMaterial map={texture} transparent side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
    <mesh position={[-1.1, 0.035, 0]} receiveShadow>
      <cylinderGeometry args={[0.2, 0.24, 0.07, 8]} />
      <meshStandardMaterial color="#1c2922" metalness={0.72} roughness={0.38} />
    </mesh>
  </group>;
}

function ZoneFrame({ index, color }: { index: number; color: string }) {
  const routeIndex = [8, 23, 38, 53, 68][index];
  const point = ROUTE[routeIndex];
  const next = ROUTE[Math.min(75, routeIndex + 1)];
  const angle = Math.atan2(next.z - point.z, next.x - point.x);
  return <group position={[point.x, 0.14, point.z]} rotation={[0, -angle, 0]}>
    <mesh position={[0, 0.012, 0]} receiveShadow>
      <boxGeometry args={[0.1, 0.02, 2.9]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.12} metalness={0.56} roughness={0.42} />
    </mesh>
    {[-1.25, 1.25].map((z) => <mesh key={z} position={[0, 0.008, z]} receiveShadow>
      <boxGeometry args={[3.5, 0.014, 0.045]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.08} metalness={0.48} roughness={0.46} />
    </mesh>)}
  </group>;
}

function TabletopStructure({ structure }: { structure: typeof TABLETOP_STRUCTURES[number] }) {
  return <group position={[structure.x, 0.16, structure.z]}>
    <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
      <boxGeometry args={[structure.width, 0.16, structure.depth]} />
      <meshStandardMaterial color="#101a18" metalness={0.8} roughness={0.34} />
    </mesh>
    {[-1, 0, 1].map((slot) => <mesh key={slot} position={[slot * 0.74, 0.26 + (slot === 0 ? 0.1 : 0), 0]} castShadow>
      <boxGeometry args={[0.42, slot === 0 ? 0.38 : 0.24, 0.52]} />
      <meshStandardMaterial color="#20312a" metalness={0.68} roughness={0.4} />
    </mesh>)}
    <mesh position={[0, 0.49, 0.02]}>
      <boxGeometry args={[2.46, 0.035, 0.06]} />
      <meshStandardMaterial color={structure.accent} emissive={structure.accent} emissiveIntensity={0.2} metalness={0.72} roughness={0.3} />
    </mesh>
    <PrintedLabel lines={[structure.label]} x={0} y={0.52} z={0.2} w={1.9} h={0.16} color={structure.accent} />
  </group>;
}

function PerimeterBuilding({ building }: { building: typeof TABLETOP_BUILDINGS[number] }) {
  const rowCount = Math.max(2, Math.floor(building.height / 0.34));
  const rows = Array.from({ length: rowCount }, (_, index) => building.height * (index + 1) / (rowCount + 1));
  const frontColumns = [-0.34, 0, 0.34].map(fraction => fraction * building.width);
  const sideColumns = [-0.32, 0, 0.32].map(fraction => fraction * building.depth);
  const industrial = building.profile === 'industrial';
  const tower = building.profile === 'tower';
  const garage = building.profile === 'garage';
  const neon = building.profile === 'neon';
  return <group position={[building.x, 0.14, building.z]}>
    <mesh position={[0, 0.026, 0]} receiveShadow>
      <boxGeometry args={[building.width + 0.22, 0.052, building.depth + 0.18]} />
      <meshStandardMaterial color="#101a16" metalness={0.76} roughness={0.42} />
    </mesh>
     <mesh position={[0, 0.052 + building.height / 2, 0]} castShadow receiveShadow>
       <boxGeometry args={[building.width, building.height, building.depth]} />
      <meshStandardMaterial color={building.color} metalness={industrial ? 0.46 : 0.78} roughness={industrial ? 0.7 : 0.26} />
    </mesh>
     {tower && <group position={[0, 0.052 + building.height + 0.22, 0]}>
       <mesh castShadow><boxGeometry args={[building.width * 0.66, 0.34, building.depth * 0.72]} /><meshStandardMaterial color="#1a302d" metalness={0.8} roughness={0.23} /></mesh>
       <mesh position={[0, 0.26, 0]} castShadow><cylinderGeometry args={[0.055, 0.055, 0.48, 8]} /><meshStandardMaterial color={building.accent} emissive={building.accent} emissiveIntensity={0.25} metalness={0.72} roughness={0.25} /></mesh>
       <mesh position={[0, 0.53, 0]}><sphereGeometry args={[0.09, 12, 8]} /><meshStandardMaterial color={building.accent} emissive={building.accent} emissiveIntensity={0.75} /></mesh>
     </group>}
     {garage && <group position={[0, 0.052 + building.height + 0.06, 0]}>
       <mesh castShadow><boxGeometry args={[building.width + 0.12, 0.11, building.depth + 0.1]} /><meshStandardMaterial color="#345451" metalness={0.74} roughness={0.3} /></mesh>
       {[-0.74, 0.74].map(x => <mesh key={x} position={[x, 0.11, building.depth * 0.28]}><boxGeometry args={[0.09, 0.2, 0.04]} /><meshStandardMaterial color={building.accent} emissive={building.accent} emissiveIntensity={0.28} /></mesh>)}
     </group>}
    <mesh position={[0, 0.052 + building.height + 0.025, 0]} castShadow>
      <boxGeometry args={[building.width + 0.12, 0.05, building.depth + 0.1]} />
      <meshStandardMaterial color={industrial ? '#495044' : '#345451'} metalness={0.74} roughness={0.3} />
    </mesh>
    {rows.flatMap((row, rowIndex) => frontColumns.map((column, columnIndex) => (
      <mesh key={`front-window-${rowIndex}-${columnIndex}`} position={[column, 0.052 + row, building.depth / 2 + 0.014]}>
        <boxGeometry args={[0.19, 0.11, 0.024]} />
        <meshStandardMaterial color={building.accent} emissive={building.accent} emissiveIntensity={0.18} metalness={0.68} roughness={0.24} />
      </mesh>
    )))}
    {rows.slice(0, 2).flatMap((row, rowIndex) => sideColumns.map((column, columnIndex) => (
      <mesh key={`side-window-${rowIndex}-${columnIndex}`} position={[building.width / 2 + 0.014, 0.052 + row, column]}>
        <boxGeometry args={[0.024, 0.11, 0.17]} />
        <meshStandardMaterial color={building.accent} emissive={building.accent} emissiveIntensity={0.14} metalness={0.68} roughness={0.24} />
      </mesh>
    )))}
     {industrial
       ? <group>
           {[-0.34, 0.34].map((x) => <group key={x} position={[x, 0.052 + building.height + 0.2, 0]}>
             <mesh castShadow><cylinderGeometry args={[0.14, 0.18, 0.38, 8]} /><meshStandardMaterial color="#171f1a" metalness={0.72} roughness={0.45} /></mesh>
             <mesh position={[0, 0.22, 0]}><cylinderGeometry args={[0.09, 0.09, 0.06, 8]} /><meshStandardMaterial color={building.accent} emissive={building.accent} emissiveIntensity={0.28} metalness={0.66} roughness={0.32} /></mesh>
           </group>)}
           <mesh position={[building.width * 0.25, 0.052 + building.height + 0.1, building.depth * 0.18]} rotation={[0, 0, -0.22]} castShadow>
             <boxGeometry args={[1.28, 0.1, 0.16]} /><meshStandardMaterial color="#59634d" metalness={0.56} roughness={0.58} />
           </mesh>
           <mesh position={[building.width * 0.25, 0.052 + building.height + 0.03, building.depth * 0.18]}>
             <boxGeometry args={[1.4, 0.025, 0.22]} /><meshStandardMaterial color={building.accent} emissive={building.accent} emissiveIntensity={0.2} metalness={0.62} roughness={0.4} />
           </mesh>
         </group>
       : <mesh position={[0, 0.052 + building.height + (tower ? 0.82 : 0.055), 0]}>
          <boxGeometry args={[building.width * 0.72, 0.018, 0.04]} />
          <meshStandardMaterial color={building.accent} emissive={building.accent} emissiveIntensity={0.22} metalness={0.82} roughness={0.2} />
        </mesh>}
     {neon && <group position={[0, 0.052 + building.height * 0.58, building.depth / 2 + 0.04]}>
       <mesh><boxGeometry args={[building.width * 0.76, 0.3, 0.06]} /><meshStandardMaterial color="#141b18" metalness={0.72} roughness={0.3} /></mesh>
       <mesh position={[0, 0, 0.05]}><boxGeometry args={[building.width * 0.62, 0.06, 0.025]} /><meshStandardMaterial color={building.accent} emissive={building.accent} emissiveIntensity={0.62} metalness={0.5} roughness={0.24} /></mesh>
       <mesh position={[building.width * 0.36, 0.24, 0]} rotation={[0, 0, -0.2]}><boxGeometry args={[0.06, 0.35, 0.05]} /><meshStandardMaterial color={building.accent} emissive={building.accent} emissiveIntensity={0.58} /></mesh>
     </group>}
     <PrintedLabel lines={[building.label]} x={0} y={0.052 + building.height + (tower ? 0.98 : garage ? 0.2 : 0.18)} z={0.18} w={building.width * 0.82} h={0.15} color={building.accent} />
  </group>;
}

const tileShape = new THREE.BoxGeometry(SPACE_TILE_FOOTPRINT.width - 0.06, 0.24, SPACE_TILE_FOOTPRINT.depth - 0.06);
const tileTop = new THREE.BoxGeometry(SPACE_TILE_FOOTPRINT.width - 0.16, 0.12, SPACE_TILE_FOOTPRINT.depth - 0.16);
const stripShape = new THREE.BoxGeometry(1.86, 0.025, 0.06);
const edgeGeometry = new THREE.BoxGeometry(SPACE_TILE_FOOTPRINT.width, 0.035, SPACE_TILE_FOOTPRINT.depth);
const tabletopBaseGeometry = new RoundedBoxGeometry(48, 0.86, 31.8, 3, 0.12);
const mats = {
  base: new THREE.MeshStandardMaterial({ color: '#101a19', metalness: 0.55, roughness: 0.52 }),
  normal: new THREE.MeshStandardMaterial({ color: '#30423b', metalness: 0.38, roughness: 0.56 }),
  payday: new THREE.MeshStandardMaterial({ color: '#496752', metalness: 0.56, roughness: 0.34 }),
  event: new THREE.MeshStandardMaterial({ color: '#45523b', metalness: 0.45, roughness: 0.43 }),
  effect: new THREE.MeshStandardMaterial({ color: '#35483e', metalness: 0.42, roughness: 0.48 }),
  start: new THREE.MeshStandardMaterial({ color: '#3b543f', metalness: 0.58, roughness: 0.38 }),
  safeMarker: new THREE.MeshStandardMaterial({ color: '#8ea69a', metalness: 0.35, roughness: 0.58 }),
  gamble: new THREE.MeshStandardMaterial({ color: '#533b32', metalness: 0.5, roughness: 0.43 }),
  deckSocket: new THREE.MeshStandardMaterial({ color: '#0d1715', metalness: 0.78, roughness: 0.3 }),
  deckWell: new THREE.MeshStandardMaterial({ color: '#17221f', metalness: 0.52, roughness: 0.43 }),
  milestone: new THREE.MeshStandardMaterial({ color: '#603b32', metalness: 0.58, roughness: 0.38 }),
  accent: new THREE.MeshStandardMaterial({ color: COLORS.orange, emissive: COLORS.orange, emissiveIntensity: 0.24, metalness: 0.45 }),
  lime: new THREE.MeshStandardMaterial({ color: COLORS.lime, emissive: COLORS.lime, emissiveIntensity: 0.21 }),
  dark: new THREE.MeshStandardMaterial({ color: '#17231e', metalness: 0.6, roughness: 0.38 }),
};

function Tile({ space, active, landing, onSelect, onHover }: { space: BoardSpace; active: boolean; landing: boolean; onSelect: (n: number) => void; onHover: (n: number | null) => void }) {
  const { x, z } = ROUTE[space.number];
  const visual = getSpaceVisual(space);
  const deckMaterial = useMemo(() => visual.className === 'deck' || visual.className === 'gamble'
    ? new THREE.MeshStandardMaterial({ color: visual.tile, metalness: visual.className === 'deck' ? 0.52 : 0.42, roughness: 0.46 })
    : null, [visual.className, visual.tile]);
  const deckEdgeMaterial = useMemo(() => visual.className === 'deck' || visual.className === 'gamble'
    ? new THREE.MeshStandardMaterial({
      color: visual.accent,
      emissive: visual.accent,
      emissiveIntensity: visual.className === 'deck' ? 0.16 : 0.055,
      metalness: 0.68,
      roughness: 0.34,
    })
    : null, [visual.className, visual.accent]);
  useEffect(() => () => {
    deckMaterial?.dispose();
    deckEdgeMaterial?.dispose();
  }, [deckMaterial, deckEdgeMaterial]);
  const landmark = space.type === 'MILESTONE' || space.type === 'CAREER_CHANGE';
  const finish = space.number === 75;
  const topY = landmark ? 0.87 : 0.71;
  const boardLabel = space.number === 1 || finish ? null
    : space.type === 'SALARY_GATE' ? 'SALARY GATE'
    : space.type === 'UPGRADE_TOKEN' ? 'UPGRADE TOKEN'
    : space.type === 'MILESTONE' || space.type === 'CAREER_CHANGE' ? space.label.toUpperCase()
    : visual.className === 'deck' ? `${visual.deckCode ?? 'CARD'} DECK`
    : visual.className === 'gamble' ? 'GAMBLE'
    : null;
  const sideMaterial = visual.className === 'major' ? mats.accent
    : visual.className === 'deck' || visual.className === 'gamble' ? deckEdgeMaterial ?? mats.event
    : visual.className === 'start' ? mats.lime
    : space.payday ? mats.lime : visual.className === 'effect' ? mats.effect : mats.normal;
  const topMaterial = finish ? mats.milestone : landmark ? mats.milestone : space.payday ? mats.payday
    : visual.className === 'effect' ? mats.effect : visual.className === 'start' ? mats.start : visual.className === 'gamble' ? deckMaterial ?? mats.gamble
    : deckMaterial ?? mats.normal;
  return <group position={[x, 0, z]} onPointerDown={(event) => { event.stopPropagation(); onSelect(space.number); }} onPointerOver={(event) => { event.stopPropagation(); onHover(space.number); }} onPointerOut={() => onHover(null)}>
    <mesh position={[0, 0.34, 0]} scale={[landmark ? SPACE_TILE_FOOTPRINT.landmarkScale : 1, landmark ? 1.45 : 1, landmark ? SPACE_TILE_FOOTPRINT.landmarkScale : 1]} geometry={tileShape} material={mats.base} castShadow receiveShadow />
    <mesh position={[0, landmark ? 0.7 : 0.56, 0]} scale={[landmark ? SPACE_TILE_FOOTPRINT.landmarkScale : 1, 1, landmark ? SPACE_TILE_FOOTPRINT.landmarkScale : 1]} geometry={edgeGeometry} material={sideMaterial} castShadow />
    <mesh position={[0, landmark ? 0.79 : 0.63, 0]} scale={[landmark ? SPACE_TILE_FOOTPRINT.landmarkScale : 1, 1, landmark ? SPACE_TILE_FOOTPRINT.landmarkScale : 1]} geometry={tileTop}
      material={topMaterial} castShadow receiveShadow />
    <mesh position={[0, topY + 0.015, 0.82]} geometry={stripShape} material={landing || active ? mats.lime : sideMaterial} />
    <mesh position={[-0.67, topY + 0.045, 0.49]} castShadow={false}>
      <boxGeometry args={[0.34, 0.035, 0.08]} />
      <meshStandardMaterial color={visual.accent} metalness={0.38} roughness={0.48} emissive={visual.accent} emissiveIntensity={visual.className === 'safe' ? 0.02 : 0.08} />
    </mesh>
    {visual.className === 'deck' ? <group position={[0.59, topY + 0.005, -0.26]}>
      <mesh position={[0, 0.006, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.47, 0.075, 8]} /><primitive object={mats.deckSocket} attach="material" />
      </mesh>
      <mesh position={[0, 0.022, 0]}>
        <cylinderGeometry args={[0.42, 0.42, 0.026, 32]} /><primitive object={mats.deckWell} attach="material" />
      </mesh>
      <mesh position={[0, 0.04, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.36, 0.026, 6, 32]} /><primitive object={deckEdgeMaterial ?? mats.event} attach="material" />
      </mesh>
    </group> : visual.className !== 'safe' && <group position={[0.59, topY + 0.005, -0.26]}>
      <mesh position={[0, 0.016, 0]}>
        <cylinderGeometry args={[0.43, 0.43, 0.035, 24]} /><primitive object={mats.dark} attach="material" />
      </mesh>
      <mesh position={[0, 0.04, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.34, visual.className === 'gamble' ? 0.018 : 0.022, 6, 24]} />
        {visual.className === 'gamble' ? <primitive object={deckEdgeMaterial ?? mats.gamble} attach="material" /> : <meshStandardMaterial color={visual.accent} metalness={0.68} roughness={0.36} />}
      </mesh>
    </group>}
    {space.type === 'GAMBLE' && <mesh position={[0, topY + 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.63, 0.69, 8]} /><primitive object={deckEdgeMaterial ?? mats.accent} attach="material" />
    </mesh>}
    {visual.className === 'start' && <group position={[0, topY + 0.052, 0.18]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.76, 0.84, 24]} /><primitive object={mats.lime} attach="material" />
      </mesh>
      <mesh position={[0, 0.025, 0.48]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.12, 0.5]} /><primitive object={mats.accent} attach="material" />
      </mesh>
    </group>}
    {space.type === 'UPGRADE_TOKEN' && <group position={[0, topY + 0.09, 0.24]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.32, 0.38, 0.16, 6]} />
        <meshStandardMaterial color="#433b5a" emissive="#d4c5ff" emissiveIntensity={0.18} metalness={0.72} roughness={0.28} />
      </mesh>
      <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.35, 0.4, 6]} />
        <meshStandardMaterial color="#d4c5ff" emissive="#d4c5ff" emissiveIntensity={0.3} metalness={0.7} roughness={0.26} />
      </mesh>
    </group>}
    {space.type === 'SALARY_GATE' && <group position={[0, topY + 0.05, 0.35]}>
      {[-0.42, 0.42].map((x) => <mesh key={x} position={[x, 0.2, 0]} castShadow>
        <boxGeometry args={[0.08, 0.42, 0.18]} /><primitive object={mats.lime} attach="material" />
      </mesh>)}
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[0.94, 0.08, 0.18]} /><primitive object={mats.lime} attach="material" />
      </mesh>
    </group>}
    {landing && <mesh position={[0, topY + 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.91, 1.02, 32]} /><primitive object={mats.lime} attach="material" />
    </mesh>}
    {space.effectId && <mesh position={[0.72, topY + 0.075, -0.68]} rotation={[-Math.PI / 2, 0, 0]} castShadow={false}>
      <boxGeometry args={[0.16, 0.025, 0.16]} />
      <meshStandardMaterial color={visual.accent} metalness={0.62} roughness={0.4} />
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
    {visual.className === 'start' && <PrintedLabel lines={['OPEN ROAD']} x={0} y={topY + 0.045} z={0.6} w={1.86} h={0.29} color={COLORS.lime} />}
    {space.type !== 'NORMAL' && (space.type !== 'EVENT' || visual.className === 'effect' || visual.className === 'start') && <PrintedIcon icon={space.icon} y={topY} color={visual.accent} z={space.secondaryIcon ? -0.55 : -0.26} size={space.secondaryIcon ? 0.6 : 0.64} />}
    {space.secondaryIcon && <PrintedIcon icon={space.secondaryIcon} y={topY} color={COLORS.lime} z={0.16} size={0.6} />}
    {boardLabel && <PrintedLabel lines={[boardLabel]} x={0} y={topY + 0.045} z={0.68} w={landmark ? 2.02 : 1.92} h={0.25} color={visual.className === 'deck' ? visual.accent : space.type === 'UPGRADE_TOKEN' ? '#d4c5ff' : COLORS.cream} />}
    {finish && <PrintedLabel lines={['FINISH']} x={0} y={topY + 0.05} z={0.42} w={1.83} h={0.46} color={COLORS.orange} />}
  </group>;
}

function Connector({ a, b, hot = false, zoneColor = COLORS.lime }: { a: Point; b: Point; hot?: boolean; zoneColor?: string }) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const length = Math.hypot(dx, dz);
  const angle = -Math.atan2(dz, dx);
  return <group position={[(a.x + b.x) / 2, 0, (a.z + b.z) / 2]} rotation={[0, angle, 0]}>
    <mesh position={[0, 0.31, 0]} castShadow receiveShadow>
      <boxGeometry args={[length, 0.16, 0.91]} /><primitive object={mats.base} attach="material" />
    </mesh>
    <mesh position={[0, 0.405, 0]}>
      <boxGeometry args={[length, 0.026, 0.12]} />
      {hot
        ? <meshStandardMaterial color={zoneColor} emissive={zoneColor} emissiveIntensity={0.08} metalness={0.62} roughness={0.38} />
        : <primitive object={mats.lime} attach="material" />}
    </mesh>
    {[-1, 1].map(side => <mesh key={side} position={[0, 0.44, side * 0.47]}>
      <boxGeometry args={[length, 0.045, 0.045]} />
      {hot
        ? <meshStandardMaterial color={zoneColor} metalness={0.68} roughness={0.36} />
        : <primitive object={mats.normal} attach="material" />}
    </mesh>)}
  </group>;
}

function ZoneInlay({ index, color }: { index: number; color: string }) {
  const routeIndex = [8, 23, 38, 53, 68][index];
  const point = ROUTE[routeIndex];
  const next = ROUTE[Math.min(75, routeIndex + 1)];
  const angle = Math.atan2(next.z - point.z, next.x - point.x);
  const polished = index === 2;
  const rough = index === 0;
  return <group position={[ZONE_ANCHORS[index].x, 0.115, ZONE_ANCHORS[index].z]} rotation={[0, -angle, 0]}>
    <mesh receiveShadow>
      <boxGeometry args={[4.55, 0.025, 1.12]} />
      <meshStandardMaterial color={rough ? '#4a5140' : polished ? '#294846' : '#303e36'} metalness={polished ? 0.72 : 0.42} roughness={rough ? 0.78 : polished ? 0.25 : 0.55} />
    </mesh>
    {[-0.42, 0, 0.42].map((z) => <mesh key={z} position={[0, 0.022, z]}>
      <boxGeometry args={[4.1, 0.012, 0.018]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={index === 0 || index === 2 ? 0.12 : 0.04} metalness={0.68} roughness={0.36} />
    </mesh>)}
    {rough && <mesh position={[0, 0.027, 0]}>
      <boxGeometry args={[3.7, 0.012, 0.025]} />
      <meshStandardMaterial color="#c5b96d" metalness={0.4} roughness={0.85} />
    </mesh>}
    {rough && [-1.35, -0.45, 0.45, 1.35].map((x, i) => <mesh key={`hazard-mark-${i}`} position={[x, 0.026, 0.47]} rotation={[0, Math.PI / 4, 0]}>
      <boxGeometry args={[0.32, 0.012, 0.035]} />
      <meshStandardMaterial color="#d2bd69" metalness={0.32} roughness={0.86} />
    </mesh>)}
    {polished && [-1, 1].map((side) => <mesh key={`glass-rail-${side}`} position={[side * 2.08, 0.023, 0]}>
      <boxGeometry args={[0.035, 0.012, 0.84]} />
      <meshStandardMaterial color="#9adbd0" emissive="#73c6bb" emissiveIntensity={0.34} metalness={0.82} roughness={0.18} />
    </mesh>)}
  </group>;
}

function PerimeterRoad() {
  const dash = (x: number, z: number, horizontal: boolean, key: string) => <mesh key={key} position={[x, 0.13, z]}>
    <boxGeometry args={horizontal ? [1.15, 0.018, 0.045] : [0.045, 0.018, 1.15]} />
    <meshStandardMaterial color="#b9c98f" emissive="#b9c98f" emissiveIntensity={0.08} metalness={0.44} roughness={0.58} />
  </mesh>;
  return <group>
    <mesh position={[0, 0.11, -15.03]} receiveShadow>
      <boxGeometry args={[45.7, 0.045, 0.62]} />
      <meshStandardMaterial color="#1b2924" metalness={0.34} roughness={0.8} />
    </mesh>
    <mesh position={[0, 0.11, 15.03]} receiveShadow>
      <boxGeometry args={[45.7, 0.045, 0.62]} />
      <meshStandardMaterial color="#1b2924" metalness={0.34} roughness={0.8} />
    </mesh>
    <mesh position={[-23.03, 0.11, 0]} receiveShadow>
      <boxGeometry args={[0.62, 0.045, 30.2]} />
      <meshStandardMaterial color="#1b2924" metalness={0.34} roughness={0.8} />
    </mesh>
    <mesh position={[23.03, 0.11, 0]} receiveShadow>
      <boxGeometry args={[0.62, 0.045, 30.2]} />
      <meshStandardMaterial color="#1b2924" metalness={0.34} roughness={0.8} />
    </mesh>
    {Array.from({ length: 18 }, (_, i) => dash(-21.3 + i * 2.5, -15.03, true, `n-${i}`))}
    {Array.from({ length: 18 }, (_, i) => dash(-21.3 + i * 2.5, 15.03, true, `s-${i}`))}
    {Array.from({ length: 12 }, (_, i) => dash(-23.03, -12.8 + i * 2.35, false, `w-${i}`))}
    {Array.from({ length: 12 }, (_, i) => dash(23.03, -12.8 + i * 2.35, false, `e-${i}`))}
  </group>;
}

function PerimeterCity() {
  return <group>
    <PerimeterRoad />
    {TABLETOP_DRESSING.map(panel => <DressingPanel key={panel.id} panel={panel} />)}
    {TABLETOP_STRUCTURES.map(structure => <TabletopStructure key={structure.id} structure={structure} />)}
    {TABLETOP_BUILDINGS.map(building => <PerimeterBuilding key={building.id} building={building} />)}
  </group>;
}

function CircuitBoard() {
  return <group>
    <mesh position={[0, -0.42, 0]} receiveShadow>
      <primitive object={tabletopBaseGeometry} attach="geometry" />
      <meshStandardMaterial color="#0a1211" metalness={0.68} roughness={0.42} />
    </mesh>
    <mesh position={[0, 0.012, 0]} receiveShadow>
      <boxGeometry args={[47.65, 0.08, 31.45]} />
      <meshStandardMaterial color={COLORS.rim} metalness={0.7} roughness={0.3} />
    </mesh>
    <mesh position={[0, 0.06, 0]} receiveShadow>
      <boxGeometry args={[47.25, 0.09, 31.05]} />
      <meshStandardMaterial color={COLORS.deck} metalness={0.52} roughness={0.6} />
    </mesh>
    <mesh position={[0, 0.105, 0]} receiveShadow>
      <boxGeometry args={[46.8, 0.035, 30.6]} />
      <meshStandardMaterial color="#22342c" metalness={0.28} roughness={0.76} />
    </mesh>
    {[-1, 1].flatMap(x => [-1, 1].map(z => <mesh key={`bolt-${x}-${z}`} position={[x * 22.45, 0.18, z * 14.65]}>
      <cylinderGeometry args={[0.12, 0.12, 0.035, 12]} />
      <meshStandardMaterial color="#a6b593" metalness={0.84} roughness={0.22} />
    </mesh>))}
    {ZONE_COLORS.map((color, index) => <ZoneInlay key={color} index={index} color={color} />)}
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
    <PerimeterCity />
  </group>;
}

function CenterEmblem() {
  return <group position={[0, 0.12, 0]}>
    <mesh position={[0, 0.02, 0]} receiveShadow>
      <cylinderGeometry args={[3.02, 3.2, 0.14, 64]} />
      <meshStandardMaterial color="#172620" metalness={0.72} roughness={0.46} />
    </mesh>
    <mesh position={[0, 0.096, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[2.82, 2.88, 64]} />
      <meshStandardMaterial color="#536557" metalness={0.72} roughness={0.34} />
    </mesh>
    <mesh position={[0, 0.098, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[2.5, 2.53, 64]} />
      <meshStandardMaterial color="#395248" metalness={0.62} roughness={0.48} />
    </mesh>
    {[-1, 1].map((side) => <mesh key={side} position={[side * 1.9, 0.096, 0]}>
      <boxGeometry args={[0.5, 0.014, 0.045]} />
      <meshStandardMaterial color="#395248" metalness={0.6} roughness={0.5} />
    </mesh>)}
    <PrintedLabel lines={['REDLINE', 'UPGRADE / CIRCUIT 01']} x={0} y={0.16} z={0} w={3.9} h={1.24} color={COLORS.orange} />
  </group>;
}

function StartGate() {
  const p = ROUTE[0];
  return <group position={[p.x, 0, p.z]}>
    <mesh position={[0, 0.46, 0]} castShadow receiveShadow>
      <boxGeometry args={[START_PAD_FOOTPRINT.width, 0.12, START_PAD_FOOTPRINT.depth]} /><primitive object={mats.dark} attach="material" />
    </mesh>
    <mesh position={[0, 0.54, 0]} castShadow receiveShadow>
      <boxGeometry args={[2.78, 0.035, 3.42]} /><primitive object={mats.lime} attach="material" />
    </mesh>
    <mesh position={[0, 0.58, 0]} castShadow receiveShadow>
      <boxGeometry args={[2.68, 0.03, 3.28]} /><primitive object={mats.normal} attach="material" />
    </mesh>
    <PrintedLabel lines={['START', '00 / LAUNCH PAD']} x={0} y={0.62} z={0.15} w={2.25} h={0.78} color={COLORS.lime} />
    <PrintedIcon icon="start" y={0.58} color={COLORS.lime} x={0} z={-0.83} size={0.7} />
    <mesh position={[0, 0.625, -1.2]}>
      <boxGeometry args={[2.55, 0.025, 0.06]} /><primitive object={mats.accent} attach="material" />
    </mesh>
  </group>;
}

function FinishGate({ players, finishOrder }: { players: MatchPlayer[]; finishOrder: number[] }) {
  const p = ROUTE[75];
  return <group position={[p.x, 0, p.z]}>
    <mesh position={[0, 0.46, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[1.52, 1.64, 0.12, 8]} /><primitive object={mats.dark} attach="material" />
    </mesh>
    <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[1.5, 1.5, 0.035, 8]} /><primitive object={mats.accent} attach="material" />
    </mesh>
    <PrintedLabel lines={['FINISH']} x={0} y={0.59} z={0.98} w={2.25} h={0.42} color={COLORS.orange} />
    {finishOrder.slice(0, 4).map((playerIndex, place) => {
      const player = players[playerIndex];
      if (!player) return null;
      const ordinal = `${place + 1}${place === 0 ? 'ST' : place === 1 ? 'ND' : place === 2 ? 'RD' : 'TH'}`;
      return <PrintedLabel key={player.playerId} lines={[`${ordinal} / ${player.displayName}`]} x={0} y={0.61} z={1.0 + place * 0.27} w={2.35} h={0.2} color={COLORS.lime} />;
    })}
  </group>;
}

function Miniature({ player, index, count, active, reduceMotion, place }: {
  player: MatchPlayer; index: number; count: number; active: boolean; reduceMotion: boolean; place?: number;
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
    {place !== undefined && <PrintedLabel lines={[`${place}${place === 1 ? 'ST' : place === 2 ? 'ND' : place === 3 ? 'RD' : 'TH'}`]} x={0} y={2.25} z={0} w={1.15} h={0.42} color={COLORS.lime} />}
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
    const height = (overview ? Math.max(39, 56 / width) : Math.max(14.7, 20 / width)) / zoom;
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

export function BoardScene({ players, activePlayerId, finishOrder = [], landingPosition, overview, reduceMotion, zoom, pan, onSpaceSelect, onSpaceHover }: {
  players: MatchPlayer[]; activePlayerId: string; finishOrder?: number[]; landingPosition: number | null; overview: boolean; reduceMotion: boolean; zoom: number; pan: Point; onSpaceSelect: (n: number) => void; onSpaceHover: (n: number | null) => void;
}) {
  const activePosition = players.find(p => p.playerId === activePlayerId)?.position ?? 0;
  return <>
    <color attach="background" args={['#101917']} />
    <ambientLight intensity={1.4} />
    <hemisphereLight args={['#bcd2c2', '#16201d', 1.8]} />
    <directionalLight position={[-12, 25, 17]} intensity={2.6} color="#ffe4cb" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-29} shadow-camera-right={29} shadow-camera-top={23} shadow-camera-bottom={-23} shadow-bias={-0.0005} />
    <directionalLight position={[14, 9, -12]} intensity={1.1} color="#a8d7bf" />
    <pointLight position={[ZONE_ANCHORS[0].x, 0.65, ZONE_ANCHORS[0].z]} intensity={1.35} distance={6} color="#c5b96d" />
    <pointLight position={[ZONE_ANCHORS[2].x, 0.65, ZONE_ANCHORS[2].z]} intensity={1.45} distance={6} color="#88c6c2" />
    <pointLight position={[0, 0.55, 0]} intensity={0.8} distance={11} color="#d4e981" />
    <CameraRig focus={activePosition} overview={overview} reduceMotion={reduceMotion} zoom={zoom} pan={pan} />
    <CircuitBoard />
    <CenterEmblem />
    {ROUTE.slice(0, 75).map((a, i) => <Connector key={i} a={a} b={ROUTE[i + 1]} hot={i % 15 === 14} zoneColor={ZONE_COLORS[Math.floor(i / 15)]} />)}
    {BOARD_SPACES.map(space => <Tile key={space.number} space={space} active={space.number === activePosition} landing={space.number === landingPosition} onSelect={onSpaceSelect} onHover={onSpaceHover} />)}
    <StartGate />
    <FinishGate players={players} finishOrder={finishOrder} />
    {ZONES.map((name, i) => <group key={name}><ZoneFrame index={i} color={ZONE_COLORS[i]} /><StandingLabel name={name} index={i} x={ZONE_ANCHORS[i].x} z={ZONE_ANCHORS[i].z} color={ZONE_COLORS[i]} /></group>)}
    {players.map((player, playerIndex) => {
      const colocated = players.filter(p => p.position === player.position).sort((a, b) => a.slot - b.slot);
      const finishIndex = finishOrder.indexOf(playerIndex);
      const place = finishIndex >= 0 && finishIndex < 4 ? finishIndex + 1 : undefined;
      return <Miniature key={player.playerId} player={player} index={colocated.findIndex(p => p.playerId === player.playerId)} count={colocated.length} active={player.playerId === activePlayerId} reduceMotion={reduceMotion} place={place} />;
    })}
  </>;
}