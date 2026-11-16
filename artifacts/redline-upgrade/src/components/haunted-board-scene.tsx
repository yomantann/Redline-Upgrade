import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getBoardSpaces, type BoardSpace } from '../game/board-data';
import { getPublicAssetUrl } from '../lib/public-asset-url';
import {
  HAUNTED_ROUTE_EDGES,
  HAUNTED_ROUTE_POINTS,
  getHauntedRouteEdgeMode,
  getHauntedSpaceChange,
  type HauntedBoardState,
} from '../game/haunted-board';
import type { MatchPlayer } from '../game/match';
import { PawnModel } from './pawns/PawnModel';

type Point = { x: number; z: number };
type HauntedBoardSceneProps = {
  players: MatchPlayer[];
  activePlayerId: string;
  focusPosition?: number;
  finishOrder?: number[];
  landingPosition: number | null;
  overview: boolean;
  reduceMotion: boolean;
  zoom: number;
  pan: Point;
  onSpaceSelect: (number: number) => void;
  onSpaceHover: (number: number | null) => void;
  routeOptions?: number[];
  hauntedBoardState?: HauntedBoardState;
  turnCounter?: number;
};

const SPACES = getBoardSpaces('HAUNTED_UPGRADE');
const ROUTE = HAUNTED_ROUTE_POINTS;
const palette = {
  stone: '#26282a',
  slate: '#36383b',
  edge: '#544b48',
  bone: '#d4c7a9',
  teal: '#9bc9bd',
  ember: '#dc9865',
  violet: '#9684a8',
};
const deckAccent: Partial<Record<NonNullable<BoardSpace['deck']>, string>> = {
  wealth: '#d8bd82',
  ai: '#87c5cf',
  fame: '#cf8eac',
  lifestyle: '#a8b88b',
  influence: '#b49bd1',
  gamble: '#d98473',
};

function labelTexture(space: BoardSpace, accent: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 256, 160);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(18,20,22,.9)';
    ctx.beginPath();
    ctx.roundRect(10, 12, 236, 136, 18);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = '#e8deca';
    ctx.font = '700 46px monospace';
    ctx.fillText(String(space.number).padStart(2, '0'), 128, 63);
    ctx.fillStyle = accent;
    ctx.font = '700 21px sans-serif';
    const title = space.label.toUpperCase();
    ctx.fillText(title.length > 17 ? `${title.slice(0, 16)}…` : title, 128, 113);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 2;
  return texture;
}

function Space({ space, active, landing, choice, boardChange, onSelect, onHover }: {
  space: BoardSpace; active: boolean; landing: boolean; choice: boolean;
  boardChange?: ReturnType<typeof getHauntedSpaceChange>;
  onSelect: (number: number) => void; onHover: (number: number | null) => void;
}) {
  const point = ROUTE[space.number];
  const changeColor = boardChange?.kind === 'CURSE_SPACE' ? '#d66b73' : boardChange?.kind === 'SAFE_SPACE' ? '#79c9ae' : undefined;
  const accent = changeColor ?? (space.number === 75 ? palette.ember
    : choice ? palette.teal
      : space.type === 'MILESTONE' || space.type === 'CAREER_CHANGE' ? palette.ember
        : space.type === 'UPGRADE_TOKEN' ? palette.violet
          : space.type === 'CURSED_DOOR' ? '#bc8795'
            : space.payday ? '#c3b876'
              : space.type === 'CARD' ? (space.deck ? deckAccent[space.deck] : undefined) ?? '#8b9187' : '#8b9187');
  const texture = useMemo(() => labelTexture(space, accent), [space, accent]);
  useEffect(() => () => texture.dispose(), [texture]);
  const special = space.type === 'MILESTONE' || space.type === 'CAREER_CHANGE' || space.number === 75;
  return <group position={[point.x, 0, point.z]}
    onPointerDown={event => { event.stopPropagation(); onSelect(space.number); }}
    onPointerOver={event => { event.stopPropagation(); onHover(space.number); }}
    onPointerOut={() => onHover(null)}>
    <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
      <boxGeometry args={[special ? 1.88 : 1.58, 0.34, special ? 1.62 : 1.42]} />
      <meshStandardMaterial color="#17191b" metalness={0.45} roughness={0.72} />
    </mesh>
    <mesh position={[0, 0.43, 0]} castShadow receiveShadow>
      <boxGeometry args={[special ? 1.82 : 1.52, 0.12, special ? 1.56 : 1.36]} />
      <meshStandardMaterial color={choice ? '#344744' : special ? '#47413b' : '#303336'} metalness={0.32} roughness={0.55} />
    </mesh>
    <mesh position={[0, 0.497, 0]}>
      <planeGeometry args={[special ? 1.7 : 1.4, special ? 1.42 : 1.22]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </mesh>
    {(active || landing || choice) && <mesh position={[0, 0.505, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.82, 0.92, 24]} />
      <meshBasicMaterial color={landing ? palette.ember : choice ? palette.teal : '#e3d5b5'} transparent opacity={0.92} />
    </mesh>}
    {boardChange && <group position={[0, 0.76, 0]}>
      <mesh>
        <sphereGeometry args={[0.16, 12, 8]} />
        <meshBasicMaterial color={accent} />
      </mesh>
      <mesh position={[0, 0.19, 0]}>
        <coneGeometry args={[0.1, 0.16, 8]} />
        <meshBasicMaterial color={accent} />
      </mesh>
    </group>}
    <mesh position={[0, 0.51, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[2.05, 1.85]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  </group>;
}

function HauntedStart({ position }: { position: { x: number; z: number } }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 160;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = '#20292a';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.strokeStyle = '#9bc9bd';
      context.lineWidth = 8;
      context.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);
      context.fillStyle = '#e7e2d3';
      context.font = '900 54px monospace';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText('START', 256, 61);
      context.fillStyle = '#9bc9bd';
      context.font = '700 20px sans-serif';
      context.fillText('THE IRON GATE', 256, 118);
    }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return <group position={[position.x, 0, position.z]}>
    <mesh position={[0, 0.13, 0]} castShadow receiveShadow>
      <boxGeometry args={[2.45, 0.25, 1.9]} />
      <meshStandardMaterial color="#22292a" metalness={0.4} roughness={0.68} />
    </mesh>
    <mesh position={[0, 0.275, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.64, 0.84, 12]} />
      <meshBasicMaterial color={palette.teal} transparent opacity={0.94} />
    </mesh>
    {[-0.82, 0.82].map(x => <group key={x} position={[x, 0, 0]}>
      <mesh position={[0, 1.02, 0]} castShadow>
        <boxGeometry args={[0.25, 1.85, 0.34]} />
        <meshStandardMaterial color="#59645e" metalness={0.48} roughness={0.55} />
      </mesh>
      <mesh position={[0, 2.0, 0]} castShadow>
        <coneGeometry args={[0.24, 0.38, 4]} />
        <meshStandardMaterial color="#b7a783" metalness={0.5} roughness={0.42} />
      </mesh>
      <mesh position={[0, 1.18, 0.2]}>
        <sphereGeometry args={[0.12, 12, 8]} />
        <meshStandardMaterial color={palette.teal} emissive={palette.teal} emissiveIntensity={0.6} />
      </mesh>
    </group>)}
    <mesh position={[0, 1.94, 0]} castShadow>
      <boxGeometry args={[1.95, 0.22, 0.25]} />
      <meshStandardMaterial color="#777162" metalness={0.48} roughness={0.5} />
    </mesh>
    <mesh position={[0, 1.97, 0.17]}>
      <planeGeometry args={[1.65, 0.52]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  </group>;
}

function HauntedCenterPortrait() {
  const texture = useMemo(() => {
    const image = new THREE.TextureLoader().load(getPublicAssetUrl(
      'characters/haunted/more%20logos/redline-mark-danger-portrait.png',
    ));
    image.colorSpace = THREE.SRGBColorSpace;
    image.anisotropy = 4;
    return image;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return <group position={[0, 6.15, 0]} rotation={[-Math.PI / 4, 0, 0]}>
    <mesh position={[0, 0, -0.08]} castShadow receiveShadow>
      <boxGeometry args={[2.5, 2.5, 0.18]} />
      <meshStandardMaterial color="#9c8264" metalness={0.55} roughness={0.42} />
    </mesh>
    <mesh position={[0, 0, 0.02]}>
      <planeGeometry args={[2.32, 2.32]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  </group>;
}

function RouteEdge({ from, to, highlighted, mode = 'OPEN' }: {
  from: number; to: number; highlighted: boolean; mode?: 'OPEN' | 'CLOSED' | 'SHORTCUT';
}) {
  const a = ROUTE[from];
  const b = ROUTE[to];
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const length = Math.hypot(dx, dz);
  const angle = -Math.atan2(dz, dx);
  const color = mode === 'CLOSED' ? '#b34e57'
    : highlighted ? palette.teal : mode === 'SHORTCUT' ? palette.violet : '#776d62';
  return <group position={[(a.x + b.x) / 2, 0.12, (a.z + b.z) / 2]} rotation={[0, angle, 0]}>
    <mesh receiveShadow>
      <boxGeometry args={[length, 0.13, 0.48]} />
      <meshStandardMaterial color={mode === 'CLOSED' ? '#382628' : '#202326'} metalness={0.28} roughness={0.83} />
    </mesh>
    <mesh position={[0, 0.075, 0]}>
      <boxGeometry args={[length, 0.025, highlighted ? 0.17 : mode === 'SHORTCUT' ? 0.13 : 0.065]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={highlighted || mode !== 'OPEN' ? 0.5 : 0.08} metalness={0.36} roughness={0.52} />
    </mesh>
    {mode === 'CLOSED' && <mesh position={[0, 0.35, 0]} rotation={[0, 0, Math.PI / 2]}>
      <boxGeometry args={[0.09, 0.72, 0.64]} />
      <meshStandardMaterial color="#c46668" emissive="#852f37" emissiveIntensity={0.25} metalness={0.35} roughness={0.62} />
    </mesh>}
  </group>;
}

function Estate() {
  return <group>
    <mesh position={[0, -0.42, 0]} receiveShadow>
      <boxGeometry args={[57, 0.62, 40]} />
      <meshStandardMaterial color="#181a1b" metalness={0.34} roughness={0.86} />
    </mesh>
    <mesh position={[0, -0.08, 0]} receiveShadow>
      <boxGeometry args={[55, 0.12, 38]} />
      <meshStandardMaterial color="#343536" metalness={0.22} roughness={0.92} />
    </mesh>
    {/* The manor anchors the board as a place, while remaining outside playable routes. */}
    <group position={[0, 0, 0]}>
      <mesh position={[0, 2.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[10.4, 4.4, 6.4]} />
        <meshStandardMaterial color="#292829" roughness={0.84} metalness={0.12} />
      </mesh>
      <mesh position={[0, 4.65, 0]} castShadow>
        <coneGeometry args={[7.3, 2.3, 4]} />
        <meshStandardMaterial color="#403434" roughness={0.9} />
      </mesh>
      {[-3.2, 3.2].map((x, i) => <group key={x} position={[x, 2.15, 3.25]}>
        <mesh castShadow><boxGeometry args={[1.24, 2.4, 0.12]} /><meshStandardMaterial color="#151719" roughness={0.6} /></mesh>
        <mesh position={[0, 0.36, 0.08]}><boxGeometry args={[0.56, 0.14, 0.035]} /><meshStandardMaterial color={i === 1 ? palette.ember : '#a78d68'} emissive={i === 1 ? palette.ember : '#a78d68'} emissiveIntensity={0.38} /></mesh>
      </group>)}
      <HauntedCenterPortrait />
      {[-1, 1].map(side => <group key={side} position={[side * 5.6, 0, 0]}>
        <mesh position={[0, 1.45, 0]} castShadow><boxGeometry args={[2.4, 2.9, 3.3]} /><meshStandardMaterial color="#252729" roughness={0.8} /></mesh>
        <mesh position={[0, 3.15, 0]} castShadow><coneGeometry args={[1.95, 1.3, 4]} /><meshStandardMaterial color="#393033" roughness={0.86} /></mesh>
      </group>)}
    </group>
    {/* Old iron fence, sparse grave markers, and cypress silhouettes make a quiet boundary. */}
    {Array.from({ length: 18 }, (_, i) => {
      const x = -25.5 + i * 3;
      return <group key={`fence-${i}`} position={[x, 0, -17.1]}>
        <mesh position={[0, 0.75, 0]}><boxGeometry args={[0.08, 1.5, 0.08]} /><meshStandardMaterial color="#5c5550" metalness={0.68} roughness={0.42} /></mesh>
        <mesh position={[0, 1.48, 0]}><coneGeometry args={[0.12, 0.26, 4]} /><meshStandardMaterial color="#817460" metalness={0.62} roughness={0.42} /></mesh>
      </group>;
    })}
    {[-1, 1].flatMap(side => Array.from({ length: 7 }, (_, i) => {
      const z = -14 + i * 4.45;
      const x = side * 27;
      return <group key={`yew-${side}-${i}`} position={[x, 0, z]}>
        <mesh position={[0, 1.15, 0]} castShadow><cylinderGeometry args={[0.22, 0.3, 1.8, 7]} /><meshStandardMaterial color="#34332f" roughness={0.9} /></mesh>
        <mesh position={[0, 3.0, 0]} castShadow><coneGeometry args={[1.15, 3.4, 7]} /><meshStandardMaterial color="#27332e" roughness={0.96} /></mesh>
      </group>;
    }))}
    {[-20, -12, 12, 20].map((x, i) => <group key={`marker-${x}`} position={[x, 0, i % 2 ? 17 : -17]}>
      <mesh position={[0, 0.52, 0]} castShadow><boxGeometry args={[0.65, 1.04, 0.34]} /><meshStandardMaterial color="#676057" roughness={0.92} /></mesh>
      <mesh position={[0, 1.08, 0]}><boxGeometry args={[0.72, 0.12, 0.4]} /><meshStandardMaterial color="#827869" roughness={0.86} /></mesh>
    </group>)}
  </group>;
}

function Pawn({ player, active, index, count, reduceMotion, place }: {
  player: MatchPlayer; active: boolean; index: number; count: number; reduceMotion: boolean; place?: number;
}) {
  const group = useRef<THREE.Group>(null);
  const position = Math.max(0, Math.min(75, player.position));
  const travel = useRef({ from: position, to: position, elapsed: 1 });
  useEffect(() => {
    travel.current.from = travel.current.to;
    travel.current.to = position;
    travel.current.elapsed = reduceMotion ? 1 : 0;
  }, [position, reduceMotion]);
  useFrame(({ clock }, delta) => {
    const current = group.current;
    if (!current) return;
    const state = travel.current;
    state.elapsed = Math.min(1, state.elapsed + delta / 0.34);
    const t = state.elapsed * state.elapsed * (3 - 2 * state.elapsed);
    const a = ROUTE[state.from];
    const b = ROUTE[state.to];
    const spread = count > 1 ? 0.42 : 0;
    current.position.set(
      a.x + (b.x - a.x) * t + (count > 1 ? (index % 2 ? 1 : -1) * spread : 0),
      0.62 + (reduceMotion ? 0 : Math.sin(t * Math.PI) * (state.elapsed < 1 ? 0.25 : 0)),
      a.z + (b.z - a.z) * t + (count > 1 ? (index < 2 ? -1 : 1) * spread : 0),
    );
    if (!reduceMotion && state.elapsed === 1) current.position.y += Math.sin(clock.elapsedTime * 1.7 + index) * 0.014;
  });
  return <group ref={group} scale={0.43} rotation={[0, -0.45, 0]}>
    <PawnModel characterId={player.characterId} selected={active} boardId="HAUNTED_UPGRADE" />
    {place !== undefined && <mesh position={[0, 2.55, 0]}>
      <sphereGeometry args={[0.12, 8, 6]} />
      <meshBasicMaterial color={palette.ember} />
    </mesh>}
  </group>;
}

function CameraRig({ focus, overview, reduceMotion, zoom, pan }: {
  focus: number; overview: boolean; reduceMotion: boolean; zoom: number; pan: Point;
}) {
  const { camera, size } = useThree();
  const aim = useRef(new THREE.Vector3());
  const initialized = useRef(false);
  useFrame((_, delta) => {
    const p = ROUTE[Math.max(0, Math.min(75, focus))];
    const target = overview ? new THREE.Vector3(pan.x, 0, pan.z) : new THREE.Vector3(p.x + pan.x, 0, p.z + pan.z);
    const aspect = size.width / Math.max(size.height, 1);
    const mobile = size.width <= 700;
    const height = (overview ? Math.max(35, 60 / aspect) : Math.max(15, (mobile ? 15 : 20) / aspect)) / zoom;
    const cam = camera as THREE.OrthographicCamera;
    const factor = !initialized.current || reduceMotion ? 1 : Math.min(1, delta * (overview ? 3 : 5));
    cam.left += (-height * aspect / 2 - cam.left) * factor;
    cam.right += (height * aspect / 2 - cam.right) * factor;
    cam.top += (height / 2 - cam.top) * factor;
    cam.bottom += (-height / 2 - cam.bottom) * factor;
    cam.updateProjectionMatrix();
    aim.current.lerp(target, factor);
    cam.position.lerp(new THREE.Vector3(aim.current.x + 1.5, overview ? 40 : 22, aim.current.z + (overview ? 36 : 21)), factor);
    cam.lookAt(aim.current);
    initialized.current = true;
  });
  return null;
}

export function HauntedBoardScene({
  players, activePlayerId, focusPosition, finishOrder = [], landingPosition, overview, reduceMotion,
  zoom, pan, onSpaceSelect, onSpaceHover, routeOptions = [], hauntedBoardState, turnCounter = 0,
}: HauntedBoardSceneProps) {
  const activePosition = players.find(player => player.playerId === activePlayerId)?.position ?? 0;
  const activeChoices = useMemo(() => new Set(routeOptions), [routeOptions.join(',')]);
  const occupants = useMemo(() => {
    const grouped = new Map<number, MatchPlayer[]>();
    players.forEach(player => {
      const position = Math.max(0, Math.min(75, player.position));
      grouped.set(position, [...(grouped.get(position) ?? []), player]);
    });
    return grouped;
  }, [players]);
  const edges = Object.entries(HAUNTED_ROUTE_EDGES).flatMap(([from, tos]) =>
    tos.map(to => ({ from: Number(from), to, mode: getHauntedRouteEdgeMode(Number(from), to, hauntedBoardState, turnCounter) })),
  );
  for (const change of hauntedBoardState?.changes ?? []) {
    if (change.kind === 'OPEN_SHORTCUT' && (change.expiresAtTurn === null || change.expiresAtTurn > turnCounter)
      && !edges.some(edge => edge.from === change.from && edge.to === change.to)) {
      edges.push({ from: change.from, to: change.to, mode: 'SHORTCUT' });
    }
  }
  return <>
    <color attach="background" args={['#24272a']} />
    <ambientLight intensity={1.1} />
    <hemisphereLight args={['#c6c7b8', '#242b2a', 1.25]} />
    <directionalLight position={[-15, 27, 18]} intensity={2.05} color="#e6d8c2" castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-31} shadow-camera-right={31} shadow-camera-top={23} shadow-camera-bottom={-23} />
    <directionalLight position={[14, 12, -16]} intensity={0.75} color="#9cafa8" />
    <pointLight position={[0, 4, 0]} intensity={1.5} distance={19} color="#b68e70" />
    <pointLight position={[-19, 1.2, 8]} intensity={0.8} distance={9} color="#8ea99a" />
    <pointLight position={[18, 1.2, -7]} intensity={0.9} distance={10} color="#9582a3" />
    <CameraRig focus={focusPosition ?? activePosition} overview={overview} reduceMotion={reduceMotion} zoom={zoom} pan={pan} />
    <Estate />
    <HauntedStart position={ROUTE[0]} />
    {edges.map(({ from, to, mode }) => <RouteEdge key={`${from}-${to}`} from={from} to={to}
      highlighted={activeChoices.has(to)} mode={mode} />)}
    {SPACES.map(space => <Space key={space.number} space={space} active={space.number === activePosition}
      landing={space.number === landingPosition} choice={activeChoices.has(space.number)}
      boardChange={getHauntedSpaceChange(hauntedBoardState, space.number, turnCounter)}
      onSelect={onSpaceSelect} onHover={onSpaceHover} />)}
    {players.map((player, playerIndex) => {
      const atPosition = occupants.get(Math.max(0, Math.min(75, player.position))) ?? [player];
      const finishIndex = finishOrder.indexOf(playerIndex);
      const place = finishIndex >= 0 && finishIndex < 4 ? finishIndex + 1 : undefined;
      return <Pawn key={player.playerId} player={player} index={atPosition.findIndex(candidate => candidate.playerId === player.playerId)}
        count={atPosition.length} active={player.playerId === activePlayerId} reduceMotion={reduceMotion} place={place} />;
    })}
  </>;
}

export default HauntedBoardScene;
