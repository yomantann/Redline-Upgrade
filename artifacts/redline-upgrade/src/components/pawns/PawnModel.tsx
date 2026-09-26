/**
 * A small, front-facing tabletop miniature. Front is +Z; the base sits on y=0.
 * Intended to be rendered inside a parent R3F Canvas with its own lights/camera.
 * All pieces share approximately the same 1.8 × 2.9 unit footprint.
 */
export interface PawnModelProps {
  characterId: string;
  selected?: boolean;
}

type V3 = [number, number, number];
type PartProps = {
  position?: V3;
  scale?: V3;
  rotation?: V3;
  color?: string;
  glow?: string;
  metalness?: number;
  roughness?: number;
};

const IRON = '#252d38';
const EDGE = '#586676';
const SHADOW = '#151d27';
const SILVER = '#94a8b4';
const CREAM = '#d5c9b9';
const CYAN = '#4ad9e8';
const RED = '#ff5a63';
const GOLD = '#e9b65c';
const PINK = '#f070c8';
const LIME = '#a9e77b';
const VIOLET = '#af91ee';
const ORANGE = '#ff9a57';

function Mat({ color = IRON, glow, metalness = 0.75, roughness = 0.3 }: Pick<PartProps, 'color' | 'glow' | 'metalness' | 'roughness'>) {
  return <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} emissive={glow || '#000000'} emissiveIntensity={glow ? 0.7 : 0} />;
}

function Block({ position = [0, 0, 0], scale = [1, 1, 1], rotation = [0, 0, 0], ...material }: PartProps) {
  return <mesh position={position} scale={scale} rotation={rotation} castShadow receiveShadow><boxGeometry args={[1, 1, 1]} /><Mat {...material} /></mesh>;
}
function Ball({ position = [0, 0, 0], scale = [1, 1, 1], ...material }: PartProps) {
  return <mesh position={position} scale={scale} castShadow receiveShadow><sphereGeometry args={[0.5, 12, 8]} /><Mat {...material} /></mesh>;
}
function Cylinder({ position = [0, 0, 0], scale = [1, 1, 1], rotation = [0, 0, 0], color, glow, metalness, roughness, top = 0.5, bottom = 0.5, sides = 10 }: PartProps & { top?: number; bottom?: number; sides?: number }) {
  return <mesh position={position} scale={scale} rotation={rotation} castShadow receiveShadow><cylinderGeometry args={[top, bottom, 1, sides]} /><Mat color={color} glow={glow} metalness={metalness} roughness={roughness} /></mesh>;
}
function Cone({ position = [0, 0, 0], scale = [1, 1, 1], rotation = [0, 0, 0], ...material }: PartProps) {
  return <mesh position={position} scale={scale} rotation={rotation} castShadow><coneGeometry args={[0.5, 1, 7]} /><Mat {...material} /></mesh>;
}
function Gem({ position = [0, 0, 0], scale = [1, 1, 1], rotation = [0, 0, 0], ...material }: PartProps) {
  return <mesh position={position} scale={scale} rotation={rotation} castShadow><octahedronGeometry args={[0.5, 0]} /><Mat {...material} /></mesh>;
}
function Ring({ position = [0, 0, 0], rotation = [0, 0, 0], radius = 0.5, tube = 0.035, color = CYAN, glow }: { position?: V3; rotation?: V3; radius?: number; tube?: number; color?: string; glow?: string }) {
  return <mesh position={position} rotation={rotation}><torusGeometry args={[radius, tube, 6, 24]} /><Mat color={color} glow={glow || color} metalness={0.35} /></mesh>;
}

function Base({ accent, selected }: { accent: string; selected: boolean }) {
  return <group>
    <Cylinder position={[0, 0.09, 0]} scale={[1.85, 0.18, 1.85]} color={SHADOW} top={0.49} bottom={0.5} sides={12} />
    <Cylinder position={[0, 0.19, 0]} scale={[1.75, 0.11, 1.75]} color={EDGE} top={0.48} bottom={0.5} sides={12} />
    <Cylinder position={[0, 0.27, 0]} scale={[1.61, 0.11, 1.61]} color={IRON} top={0.49} bottom={0.5} sides={12} />
    <Ring position={[0, 0.255, 0]} rotation={[-Math.PI / 2, 0, 0]} radius={0.7} tube={selected ? 0.035 : 0.022} color={accent} />
    <Block position={[0, 0.14, 0.89]} scale={[0.32, 0.075, 0.035]} color={accent} glow={accent} />
    {selected && <Ring position={[0, 0.055, 0]} rotation={[-Math.PI / 2, 0, 0]} radius={0.9} tube={0.035} color={accent} />}
  </group>;
}

type Archetype = 'soldier' | 'brute' | 'automaton' | 'swift';
function Body({ kind, accent }: { kind: Archetype; accent: string }) {
  const bulky = kind === 'brute';
  const swift = kind === 'swift';
  const bot = kind === 'automaton';
  const width = bulky ? 1.3 : swift ? 0.68 : 0.9;
  return <group>
    {/* Separate boots and shins keep the silhouette legible at thumbnail size. */}
    {[-1, 1].map(side => <group key={side}>
      <Block position={[side * (bulky ? 0.34 : 0.25), 0.54, 0]} scale={[bulky ? 0.31 : 0.22, 0.46, 0.29]} rotation={[0, 0, side * (swift ? -0.13 : 0)]} color={IRON} />
      <Block position={[side * (bulky ? 0.34 : 0.25), 0.37, 0.13]} scale={[bulky ? 0.38 : 0.29, 0.19, 0.43]} color={SHADOW} />
      <Block position={[side * (bulky ? 0.34 : 0.25), 0.72, 0.16]} scale={[0.16, 0.08, 0.06]} color={accent} glow={accent} />
    </group>)}
    <Cylinder position={[0, 1.04, 0]} scale={[width, bot ? 0.82 : 1.02, 0.67]} top={bot ? 0.48 : 0.39} bottom={0.46} sides={bot ? 6 : 8} color={IRON} />
    <Block position={[0, 0.82, 0.34]} scale={[width * 0.7, 0.12, 0.09]} color={EDGE} />
    <Block position={[0, 1.32, 0.32]} scale={[width * 0.65, 0.12, 0.09]} color={EDGE} />
    <Block position={[0, 1.49, 0]} scale={[width * 0.77, 0.17, 0.53]} color={SHADOW} />
    {[-1, 1].map(side => <group key={side}>
      <Ball position={[side * (width * 0.53), 1.35, 0]} scale={[bulky ? 0.58 : 0.37, bulky ? 0.45 : 0.31, 0.38]} color={EDGE} />
      <Cylinder position={[side * (width * 0.62), 1.04, 0.03]} scale={[bulky ? 0.34 : 0.22, 0.55, bulky ? 0.35 : 0.22]} rotation={[0, 0, side * (swift ? -0.3 : 0.13)]} color={IRON} />
      <Ball position={[side * (width * 0.68), 0.74, 0.04]} scale={[bulky ? 0.37 : 0.24, 0.25, 0.25]} color={SHADOW} />
    </group>)}
    <Block position={[0, 1.2, 0.36]} scale={[width * 0.46, 0.3, 0.075]} color={accent} glow={accent} />
    {bot && <Ring position={[0, 1.2, 0.41]} radius={0.12} tube={0.018} color={SHADOW} glow={SHADOW} />}
  </group>;
}

type HeadType = 'helmet' | 'face' | 'robot' | 'animal' | 'alien';
function Head({ type, accent }: { type: HeadType; accent: string }) {
  const face = type === 'face';
  const animal = type === 'animal';
  const alien = type === 'alien';
  return <group position={[0, 1.96, 0]}>
    <Cylinder position={[0, -0.17, 0]} scale={[0.25, 0.19, 0.25]} color={EDGE} />
    {type === 'robot'
      ? <Block scale={[0.65, 0.53, 0.58]} color={IRON} />
      : <Ball scale={[animal ? 0.74 : alien ? 0.48 : 0.57, animal ? 0.62 : 0.64, animal ? 0.67 : 0.57]} color={face ? CREAM : alien ? '#8bad88' : animal ? '#5a5369' : EDGE} />}
    {face ? <>
      <Block position={[0, 0.08, 0.285]} scale={[0.53, 0.1, 0.08]} color={SHADOW} />
      <Block position={[0, -0.11, 0.28]} scale={[0.3, 0.035, 0.06]} color={SHADOW} />
      <Ball position={[-0.13, 0.045, 0.295]} scale={[0.08, 0.045, 0.025]} color={accent} glow={accent} />
      <Ball position={[0.13, 0.045, 0.295]} scale={[0.08, 0.045, 0.025]} color={accent} glow={accent} />
    </> : alien ? <>
      {[-1, 1].map(s => <Ball key={s} position={[s * 0.16, 0.05, 0.22]} scale={[0.15, 0.1, 0.05]} color={SHADOW} glow={accent} />)}
    </> : animal ? <>
      <Ball position={[0, -0.1, 0.32]} scale={[0.38, 0.25, 0.29]} color={EDGE} />
      {[-1, 1].map(s => <Ball key={s} position={[s * 0.17, 0.08, 0.3]} scale={[0.1, 0.075, 0.05]} color={accent} glow={accent} />)}
    </> : <>
      <Block position={[0, 0.05, 0.29]} scale={[0.54, 0.15, 0.08]} color={accent} glow={accent} />
      <Block position={[0, -0.13, 0.28]} scale={[0.38, 0.075, 0.07]} color={SHADOW} />
    </>}
  </group>;
}

function Horns({ color = EDGE, spread = 0.25, height = 0.45 }: { color?: string; spread?: number; height?: number }) {
  return <group>{[-1, 1].map(s => <Cone key={s} position={[s * spread, 2.42, 0]} scale={[0.19, height, 0.19]} rotation={[0, 0, s * -0.26]} color={color} />)}</group>;
}
function Antenna({ color, side = 1 }: { color: string; side?: number }) {
  return <group><Cylinder position={[side * 0.29, 2.43, 0]} scale={[0.055, 0.47, 0.055]} rotation={[0, 0, side * -0.2]} color={EDGE} /><Ball position={[side * 0.35, 2.67, 0]} scale={[0.15, 0.15, 0.15]} color={color} glow={color} /></group>;
}
function Cape({ color = SHADOW, trim = RED }: { color?: string; trim?: string }) {
  return <group>
    <Cone position={[0, 1.03, -0.34]} scale={[1.28, 1.7, 0.68]} rotation={[-0.13, 0, 0]} color={color} />
    <Block position={[0, 0.48, -0.49]} scale={[1.08, 0.065, 0.08]} color={trim} glow={trim} />
  </group>;
}
function Wings({ color = EDGE, trim = CYAN }: { color?: string; trim?: string }) {
  return <group>
    {[-1, 1].map(s => <group key={s}>
      <Block position={[s * 0.83, 1.66, -0.26]} scale={[0.82, 0.12, 0.33]} rotation={[0, 0, s * 0.46]} color={color} />
      <Block position={[s * 1.16, 1.49, -0.3]} scale={[0.48, 0.075, 0.24]} rotation={[0, 0, s * -0.35]} color={trim} glow={trim} />
    </group>)}
  </group>;
}
function Shield({ accent = CYAN, side = -1 }: { accent?: string; side?: number }) {
  return <group position={[side * 0.7, 0.95, 0.45]}>
    <Cylinder rotation={[Math.PI / 2, 0, 0]} scale={[0.68, 0.13, 0.79]} color={SHADOW} sides={8} />
    <Ring position={[0, 0, 0.084]} radius={0.31} tube={0.042} color={accent} />
    <Gem position={[0, 0, 0.11]} scale={[0.25, 0.3, 0.1]} color={accent} glow={accent} />
  </group>;
}
function Visor({ color = CYAN, width = 0.56 }: { color?: string; width?: number }) {
  return <group><Block position={[0, 2.06, 0.31]} scale={[width, 0.15, 0.12]} color={SHADOW} /><Block position={[0, 2.07, 0.38]} scale={[width * 0.84, 0.065, 0.025]} color={color} glow={color} /></group>;
}
function Spikes({ color = EDGE, count = 3 }: { color?: string; count?: number }) {
  return <group>{Array.from({ length: count }, (_, i) => <Cone key={i} position={[(i - (count - 1) / 2) * 0.22, 2.43 + (i % 2) * 0.09, -0.05]} scale={[0.19, 0.45, 0.19]} color={color} />)}</group>;
}
function Crown({ color = GOLD }: { color?: string }) {
  return <group><Cylinder position={[0, 2.39, 0]} scale={[0.61, 0.17, 0.61]} top={0.47} bottom={0.48} color={color} />
    {[-1, 0, 1].map(s => <Cone key={s} position={[s * 0.23, 2.57, 0.01]} scale={[0.18, s === 0 ? 0.43 : 0.33, 0.18]} color={color} />)}
    <Gem position={[0, 2.41, 0.28]} scale={[0.12, 0.12, 0.08]} color={RED} glow={RED} />
  </group>;
}
function LongTool({ color = EDGE, side = 1 }: { color?: string; side?: number }) {
  return <group position={[side * 0.75, 1.04, 0.38]} rotation={[0, 0, side * -0.18]}>
    <Block scale={[0.15, 0.98, 0.17]} color={SHADOW} />
    <Block position={[0, 0.37, 0.015]} scale={[0.19, 0.19, 0.2]} color={color} glow={color} />
    <Block position={[0.13 * side, -0.26, 0]} scale={[0.32, 0.1, 0.18]} color={EDGE} />
  </group>;
}

const looks: Record<string, { accent: string; body: Archetype; head: HeadType }> = {
  guardian_h: { accent: CYAN, body: 'brute', head: 'animal' },
  click_click: { accent: PINK, body: 'swift', head: 'animal' },
  frostbyte: { accent: CYAN, body: 'soldier', head: 'helmet' },
  sadman: { accent: LIME, body: 'soldier', head: 'alien' },
  rainbow_dash: { accent: ORANGE, body: 'swift', head: 'robot' },
  accuser: { accent: RED, body: 'soldier', head: 'face' },
  low_flame: { accent: ORANGE, body: 'brute', head: 'animal' },
  wandering_eye: { accent: ORANGE, body: 'soldier', head: 'helmet' },
  the_rind: { accent: CYAN, body: 'swift', head: 'helmet' },
  anointed: { accent: GOLD, body: 'soldier', head: 'helmet' },
  executive_p: { accent: CYAN, body: 'soldier', head: 'face' },
  alpha_prime: { accent: CYAN, body: 'brute', head: 'face' },
  roll_safe: { accent: ORANGE, body: 'soldier', head: 'face' },
  hotwired: { accent: RED, body: 'swift', head: 'face' },
  panic_bot: { accent: RED, body: 'automaton', head: 'robot' },
  primate: { accent: PINK, body: 'brute', head: 'animal' },
  pain_hider: { accent: CYAN, body: 'soldier', head: 'face' },
  prom_king: { accent: VIOLET, body: 'soldier', head: 'face' },
  idol_core: { accent: PINK, body: 'swift', head: 'face' },
  danger_zone: { accent: RED, body: 'swift', head: 'face' },
  the_tank: { accent: VIOLET, body: 'brute', head: 'animal' },
};

function Details({ id }: { id: string }) {
  switch (id) {
    case 'guardian_h': return <><Shield accent={CYAN} /><Block position={[0, 1.43, 0.38]} scale={[0.55, 0.29, 0.09]} color={CYAN} glow={CYAN} /><Horns color={IRON} height={0.27} /></>;
    case 'click_click': return <><Horns color={PINK} spread={0.3} height={0.52} /><Cylinder position={[0, 1.92, 0.42]} scale={[0.17, 0.12, 0.11]} color={PINK} glow={PINK} /><Wings color={VIOLET} trim={PINK} /></>;
    case 'frostbyte': return <><Cape color={'#283c4b'} trim={CYAN} /><Spikes color={CYAN} count={3} /><Gem position={[0, 1.22, 0.43]} scale={[0.3, 0.46, 0.12]} color={CYAN} glow={CYAN} /><Gem position={[0.58, 1.61, 0]} scale={[0.24, 0.5, 0.25]} color={CYAN} glow={CYAN} /></>;
    case 'sadman': return <><Block position={[0, 1.28, 0.47]} scale={[0.1, 0.49, 0.07]} color={LIME} glow={LIME} /><Block position={[0, 1.4, 0.53]} scale={[0.37, 0.12, 0.06]} color={SILVER} /><Ring position={[0.54, 1.03, 0.43]} radius={0.23} color={CYAN} /></>;
    case 'rainbow_dash': return <><Cone position={[0, 2.49, 0]} scale={[0.49, 0.56, 0.48]} color={SILVER} /><Wings color={EDGE} trim={ORANGE} /><Block position={[-0.3, 1.12, -0.46]} scale={[0.14, 0.14, 0.44]} color={CYAN} glow={CYAN} /><Block position={[0, 1.12, -0.51]} scale={[0.14, 0.14, 0.46]} color={PINK} glow={PINK} /><Block position={[0.3, 1.12, -0.46]} scale={[0.14, 0.14, 0.44]} color={LIME} glow={LIME} /></>;
    case 'accuser': return <><Block position={[0, 1.25, 0.48]} scale={[0.55, 0.38, 0.08]} color={RED} glow={RED} /><Visor color={RED} /><LongTool color={RED} /></>;
    case 'low_flame': return <><Cone position={[0, 2.25, -0.08]} scale={[0.84, 0.77, 0.79]} color={'#263747'} /><Ring position={[0, 1.25, 0.44]} radius={0.17} color={ORANGE} /><Ball position={[0.6, 0.72, 0.24]} scale={[0.23, 0.28, 0.2]} color={ORANGE} glow={ORANGE} /></>;
    case 'wandering_eye': return <><Ring position={[0, 2.02, 0.02]} radius={0.46} tube={0.07} color={SILVER} glow={CYAN} /><Antenna color={ORANGE} /><Ball position={[0, 2.06, 0.4]} scale={[0.21, 0.21, 0.08]} color={ORANGE} glow={ORANGE} /></>;
    case 'the_rind': return <><Cape color={'#203242'} trim={CYAN} /><Visor color={CYAN} /><Block position={[0.13, 1.04, 0.57]} scale={[1.15, 0.15, 0.17]} rotation={[0, 0, -0.13]} color={EDGE} /><Block position={[-0.47, 1.02, 0.59]} scale={[0.27, 0.1, 0.12]} color={CYAN} glow={CYAN} /></>;
    case 'anointed': return <><Cape color={'#513c4c'} trim={GOLD} /><Crown /><Ring position={[0, 2.47, -0.05]} rotation={[Math.PI / 2, 0, 0]} radius={0.44} color={CYAN} /><Gem position={[0, 1.24, 0.48]} scale={[0.28, 0.35, 0.12]} color={GOLD} glow={GOLD} /></>;
    case 'executive_p': return <><Block position={[0, 1.2, 0.46]} scale={[0.11, 0.41, 0.07]} color={CYAN} glow={CYAN} /><Block position={[0.63, 0.58, 0.24]} scale={[0.4, 0.49, 0.16]} color={SHADOW} /><Block position={[0.63, 0.85, 0.24]} scale={[0.16, 0.07, 0.18]} color={SILVER} /></>;
    case 'alpha_prime': return <><Visor color={CYAN} width={0.69} /><Block position={[0, 1.42, 0.48]} scale={[0.66, 0.12, 0.09]} color={SILVER} /><Block position={[0, 1.07, 0.48]} scale={[0.55, 0.11, 0.09]} color={SILVER} /><Gem position={[0, 1.26, 0.5]} scale={[0.16, 0.16, 0.1]} color={CYAN} glow={CYAN} /></>;
    case 'roll_safe': return <><Block position={[0, 1.29, 0.46]} scale={[0.12, 0.43, 0.08]} color={ORANGE} /><Block position={[0.44, 2.03, 0.37]} scale={[0.11, 0.35, 0.12]} rotation={[0, 0, -0.6]} color={CREAM} /><Block position={[-0.63, 0.77, 0.37]} scale={[0.33, 0.33, 0.33]} color={SILVER} /><Ball position={[-0.63, 0.77, 0.55]} scale={[0.09, 0.09, 0.04]} color={SHADOW} /></>;
    case 'hotwired': return <><Spikes color={ORANGE} count={4} /><Ball position={[-0.14, 2.02, 0.31]} scale={[0.12, 0.11, 0.05]} color={RED} glow={RED} /><Ball position={[0.14, 2.02, 0.31]} scale={[0.12, 0.11, 0.05]} color={RED} glow={RED} /><LongTool color={ORANGE} /><Block position={[0, 1.24, 0.43]} scale={[0.06, 0.54, 0.08]} color={RED} glow={RED} /></>;
    case 'panic_bot': return <><Antenna color={RED} side={-1} /><Antenna color={RED} side={1} /><Ball position={[0, 2.38, 0]} scale={[0.31, 0.19, 0.31]} color={RED} glow={RED} /><Ring position={[0, 1.18, 0.48]} radius={0.24} color={RED} /><Block position={[0, 1.18, 0.5]} scale={[0.08, 0.28, 0.04]} color={RED} glow={RED} /></>;
    case 'primate': return <><Spikes color={PINK} count={3} /><Ball position={[0, 1.91, 0.42]} scale={[0.29, 0.19, 0.17]} color={EDGE} /><Block position={[0, 1.23, 0.48]} scale={[0.52, 0.1, 0.08]} color={PINK} glow={PINK} /></>;
    case 'pain_hider': return <><Block position={[0, 1.33, 0.45]} scale={[0.16, 0.3, 0.08]} color={CYAN} glow={CYAN} /><Block position={[0, 1.33, 0.45]} scale={[0.35, 0.13, 0.08]} color={CYAN} glow={CYAN} /><Block position={[0.52, 1.36, 0.39]} scale={[0.28, 0.12, 0.19]} rotation={[0, 0, -0.35]} color={CREAM} /></>;
    case 'prom_king': return <><Crown color={VIOLET} /><Block position={[0, 1.23, 0.47]} scale={[0.11, 0.47, 0.07]} color={CYAN} glow={CYAN} /><Block position={[0, 1.5, 0.47]} scale={[0.39, 0.13, 0.08]} color={SILVER} /></>;
    case 'idol_core': return <><Wings color={VIOLET} trim={PINK} /><Ring position={[0, 2.44, 0]} rotation={[Math.PI / 2, 0, 0]} radius={0.38} color={PINK} /><Gem position={[0, 1.27, 0.48]} scale={[0.36, 0.42, 0.15]} color={PINK} glow={PINK} /><Ball position={[0, 2.05, 0.34]} scale={[0.16, 0.12, 0.04]} color={PINK} glow={PINK} /></>;
    case 'danger_zone': return <><Spikes color={RED} count={3} /><Visor color={RED} /><Block position={[0, 1.25, 0.44]} scale={[0.47, 0.4, 0.1]} color={RED} glow={RED} /><Block position={[0, 1.25, 0.53]} scale={[0.18, 0.31, 0.03]} rotation={[0, 0, 0.4]} color={SHADOW} /></>;
    case 'the_tank': return <><Shield accent={VIOLET} /><Horns color={EDGE} spread={0.33} height={0.29} /><Ball position={[0, 1.94, 0.43]} scale={[0.21, 0.43, 0.21]} color={EDGE} /><Ball position={[-0.18, 2.12, 0.37]} scale={[0.18, 0.19, 0.07]} color={CREAM} /><Ball position={[0.18, 2.12, 0.37]} scale={[0.18, 0.19, 0.07]} color={CREAM} /><Ball position={[-0.18, 2.12, 0.44]} scale={[0.055, 0.06, 0.04]} color={SHADOW} /><Ball position={[0.18, 2.12, 0.44]} scale={[0.055, 0.06, 0.04]} color={SHADOW} /></>;
    default: return null;
  }
}

export function PawnModel({ characterId, selected = false }: PawnModelProps) {
  const look = looks[characterId];
  if (!look) throw new Error(`Unknown pawn character: ${characterId}`);
  return <group>
    <Base accent={look.accent} selected={selected} />
    <Body kind={look.body} accent={look.accent} />
    <Head type={look.head} accent={look.accent} />
    <Details id={characterId} />
  </group>;
}

export default PawnModel;