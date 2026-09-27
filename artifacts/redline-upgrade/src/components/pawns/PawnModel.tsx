/**
 * Redline collectible pawn set.
 * The plinth is shared; every silhouette above it is authored around the
 * character concept rather than a shared humanoid rig.
 */
export interface PawnModelProps {
  characterId: string;
  selected?: boolean;
}

type V3 = [number, number, number];
type MaterialProps = {
  color?: string;
  glow?: string;
  metalness?: number;
  roughness?: number;
};

const IRON = '#252d38';
const EDGE = '#657887';
const SHADOW = '#121b25';
const SILVER = '#a9bbc2';
const CREAM = '#d9cdbb';
const CYAN = '#4ad9e8';
const RED = '#ff5a63';
const GOLD = '#e9b65c';
const PINK = '#f070c8';
const LIME = '#a9e77b';
const VIOLET = '#af91ee';
const ORANGE = '#ff9a57';
const ICE = '#9ff4ff';

function Mat({ color = IRON, glow, metalness = 0.76, roughness = 0.3 }: MaterialProps) {
  return <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} emissive={glow || '#000000'} emissiveIntensity={glow ? 0.72 : 0} />;
}
function Block({ position = [0, 0, 0], scale = [1, 1, 1], rotation = [0, 0, 0], ...material }: { position?: V3; scale?: V3; rotation?: V3 } & MaterialProps) {
  return <mesh position={position} scale={scale} rotation={rotation} castShadow receiveShadow><boxGeometry args={[1, 1, 1]} /><Mat {...material} /></mesh>;
}
function Ball({ position = [0, 0, 0], scale = [1, 1, 1], ...material }: { position?: V3; scale?: V3 } & MaterialProps) {
  return <mesh position={position} scale={scale} castShadow receiveShadow><sphereGeometry args={[0.5, 14, 10]} /><Mat {...material} /></mesh>;
}
function Cylinder({ position = [0, 0, 0], scale = [1, 1, 1], rotation = [0, 0, 0], sides = 10, top = .5, bottom = .5, ...material }: { position?: V3; scale?: V3; rotation?: V3; sides?: number; top?: number; bottom?: number } & MaterialProps) {
  return <mesh position={position} scale={scale} rotation={rotation} castShadow receiveShadow><cylinderGeometry args={[top, bottom, 1, sides]} /><Mat {...material} /></mesh>;
}
function Cone({ position = [0, 0, 0], scale = [1, 1, 1], rotation = [0, 0, 0], ...material }: { position?: V3; scale?: V3; rotation?: V3 } & MaterialProps) {
  return <mesh position={position} scale={scale} rotation={rotation} castShadow><coneGeometry args={[.5, 1, 7]} /><Mat {...material} /></mesh>;
}
function Gem({ position = [0, 0, 0], scale = [1, 1, 1], rotation = [0, 0, 0], ...material }: { position?: V3; scale?: V3; rotation?: V3 } & MaterialProps) {
  return <mesh position={position} scale={scale} rotation={rotation} castShadow><octahedronGeometry args={[.5, 0]} /><Mat {...material} /></mesh>;
}
function Ring({ position = [0, 0, 0], rotation = [0, 0, 0], radius = .5, tube = .035, color = CYAN, glow }: { position?: V3; rotation?: V3; radius?: number; tube?: number; color?: string; glow?: string }) {
  return <mesh position={position} rotation={rotation}><torusGeometry args={[radius, tube, 7, 24]} /><Mat color={color} glow={glow || color} metalness={.4} /></mesh>;
}
function Base({ accent, selected }: { accent: string; selected: boolean }) {
  return <group>
    <Cylinder position={[0, .09, 0]} scale={[1.85, .18, 1.85]} color={SHADOW} top={.49} bottom={.5} sides={12} />
    <Cylinder position={[0, .19, 0]} scale={[1.75, .11, 1.75]} color={EDGE} top={.48} bottom={.5} sides={12} />
    <Cylinder position={[0, .27, 0]} scale={[1.61, .11, 1.61]} color={IRON} top={.49} bottom={.5} sides={12} />
    <Ring position={[0, .255, 0]} rotation={[-Math.PI / 2, 0, 0]} radius={.7} tube={selected ? .035 : .022} color={accent} />
    <Block position={[0, .14, .89]} scale={[.32, .075, .035]} color={accent} glow={accent} />
    {selected && <Ring position={[0, .055, 0]} rotation={[-Math.PI / 2, 0, 0]} radius={.9} tube={.035} color={accent} />}
  </group>;
}
function Core({ accent = CYAN, width = .82, height = .85, y = 1.05 }: { accent?: string; width?: number; height?: number; y?: number }) {
  return <group>
    <Cylinder position={[0, y, 0]} scale={[width, height, .58]} sides={8} color={IRON} />
    <Block position={[0, y + height * .27, .3]} scale={[width * .63, .1, .08]} color={EDGE} />
    <Block position={[0, y - height * .26, .3]} scale={[width * .54, .1, .08]} color={accent} glow={accent} />
  </group>;
}
function Boots({ accent = CYAN, wide = false }: { accent?: string; wide?: boolean }) {
  return <group>{[-1, 1].map(s => <group key={s}>
    <Block position={[s * (wide ? .36 : .24), .54, 0]} scale={[wide ? .38 : .24, .42, .28]} color={IRON} />
    <Block position={[s * (wide ? .37 : .25), .36, .16]} scale={[wide ? .48 : .3, .17, .46]} color={SHADOW} />
    <Block position={[s * (wide ? .37 : .25), .74, .17]} scale={[.13, .07, .05]} color={accent} glow={accent} />
  </group>)}</group>;
}
function Visor({ color = CYAN, width = .56, y = 2.06 }: { color?: string; width?: number; y?: number }) {
  return <group><Block position={[0, y, .3]} scale={[width, .14, .1]} color={SHADOW} /><Block position={[0, y, .36]} scale={[width * .82, .055, .025]} color={color} glow={color} /></group>;
}
function Crown({ color = GOLD, y = 2.4 }: { color?: string; y?: number }) {
  return <group><Cylinder position={[0, y, 0]} scale={[.62, .15, .62]} color={color} sides={8} />
    {[-1, 0, 1].map(s => <Cone key={s} position={[s * .23, y + .2, .01]} scale={[.17, s === 0 ? .43 : .3, .17]} color={color} />)}
    <Gem position={[0, y + .01, .3]} scale={[.11, .11, .07]} color={RED} glow={RED} /></group>;
}
function Cable({ from, to, color = RED, thickness = .045 }: { from: V3; to: V3; color?: string; thickness?: number }) {
  const mid: V3 = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2];
  const dx = to[0] - from[0], dy = to[1] - from[1];
  return <Cylinder position={mid} scale={[thickness, Math.sqrt(dx * dx + dy * dy) * 1.04, thickness]} rotation={[0, 0, -Math.atan2(dx, dy)]} color={color} glow={color} sides={8} />;
}

function Signature({ id, accent }: { id: string; accent: string }) {
  switch (id) {
    case 'guardian_h': return <group>
      <Boots accent={accent} wide /><Core accent={accent} width={1.22} height={1.02} /><Ball position={[0, 1.95, 0]} scale={[.72, .64, .62]} color={SHADOW} />
      <Ball position={[-.45, 1.96, .15]} scale={[.19, .22, .2]} color={SHADOW} /><Ball position={[.45, 1.96, .15]} scale={[.19, .22, .2]} color={SHADOW} />
      <Ball position={[0, 1.82, .48]} scale={[.44, .27, .22]} color={EDGE} /><Ball position={[0, 1.94, .68]} scale={[.14, .08, .06]} color={SHADOW} />
      <Ball position={[-.2, 2.03, .43]} scale={[.075, .06, .045]} color={CYAN} glow={CYAN} /><Ball position={[.2, 2.03, .43]} scale={[.075, .06, .045]} color={CYAN} glow={CYAN} />
      <Block position={[0, 1.68, .57]} scale={[.3, .05, .04]} color={SHADOW} />
      <Block position={[0, 1.8, .36]} scale={[.75, .18, .09]} color={accent} glow={accent} /><Cylinder position={[-.72, 1.15, .4]} scale={[.86, 1.25, .14]} rotation={[Math.PI / 2, 0, -.16]} sides={8} color={SHADOW} /><Ring position={[-.72, 1.15, .49]} rotation={[Math.PI / 2, 0, -.16]} radius={.28} color={accent} /><Horns color={EDGE} spread={.3} height={.28} />
    </group>;
    case 'click_click': return <group>
      <Cylinder position={[0, .83, -.03]} scale={[1.1, .52, .72]} sides={10} color={'#626a77'} />
      {[-1, 1].map(s => <group key={s}><Ball position={[s * .43, .49, .34]} scale={[.29, .19, .36]} color={SHADOW} /><Ball position={[s * .39, .5, -.31]} scale={[.27, .18, .31]} color={SHADOW} /></group>)}
      <Ball position={[0, 1.58, .02]} scale={[.84, .72, .7]} color={'#626a77'} />
      {[-1, 1].map(s => <Cone key={s} position={[s * .38, 2.2, .02]} scale={[.23, .61, .22]} rotation={[0, 0, s * -.18]} color={PINK} />)}
      <Ball position={[-.24, 1.82, .45]} scale={[.085, .11, .05]} color={CYAN} glow={CYAN} /><Ball position={[.24, 1.82, .45]} scale={[.085, .11, .05]} color={CYAN} glow={CYAN} />
      <Ball position={[0, 1.52, .5]} scale={[.34, .4, .13]} color={SHADOW} /><Ball position={[0, 1.35, .6]} scale={[.17, .14, .035]} color={RED} glow={PINK} />
      {[-1, 1].map(s => <group key={`whisker-${s}`}><Block position={[s * .52, 1.57, .48]} scale={[.42, .025, .025]} rotation={[0, 0, s * .16]} color={SILVER} /><Block position={[s * .52, 1.48, .48]} scale={[.38, .02, .02]} rotation={[0, 0, s * -.08]} color={SILVER} /></group>)}
      <Cable from={[-.45, .83, -.42]} to={[-.76, 1.05, -.5]} color={PINK} /><Cable from={[-.76, 1.05, -.5]} to={[-.73, 1.3, -.48]} color={VIOLET} />
      <Ring position={[.57, .91, .05]} rotation={[0, 0, 0]} radius={.18} color={PINK} />
    </group>;
    case 'frostbyte': return <group>
      <Boots accent={accent} /><Core accent={accent} width={.8} height={.92} /><Cone position={[0, 2.08, 0]} scale={[.62, 1.06, .56]} color={'#355266'} /><Gem position={[0, 1.83, .38]} scale={[.32, .47, .1]} color={ICE} glow={CYAN} />
      <Gem position={[-.55, 1.52, 0]} scale={[.24, .72, .24]} rotation={[0, 0, -.28]} color={CYAN} glow={CYAN} /><Gem position={[.58, 1.64, 0]} scale={[.2, .6, .2]} rotation={[0, 0, .36]} color={ICE} glow={CYAN} /><Cone position={[0, 2.67, 0]} scale={[.35, .46, .3]} color={ICE} glow={CYAN} />
    </group>;
    case 'sadman': return <group rotation={[0, 0, -.08]}>
      <Block position={[0, .55, .1]} scale={[.7, .22, .46]} rotation={[0, 0, -.12]} color={SHADOW} /><Core accent={accent} width={.7} height={.72} y={.93} /><Ball position={[.12, 1.62, .1]} scale={[.47, .6, .47]} color={'#6f9b89'} /><Block position={[.1, 1.66, .53]} scale={[.42, .09, .05]} rotation={[0, 0, -.34]} color={SHADOW} /><Block position={[-.14, 1.33, .42]} scale={[.07, .6, .07]} rotation={[0, 0, -.52]} color={CREAM} /><Ring position={[.47, .78, .38]} radius={.2} color={CYAN} />
    </group>;
    case 'rainbow_dash': return <group rotation={[0, 0, -.03]}>
      <Block position={[0, 1.03, 0]} scale={[1.25, .42, .72]} rotation={[0, 0, 0]} color={SILVER} /><Cone position={[.7, 1.04, 0]} scale={[.8, .37, .65]} rotation={[0, 0, -Math.PI / 2]} color={EDGE} /><Cone position={[-.7, 1.04, 0]} scale={[.6, .28, .5]} rotation={[0, 0, Math.PI / 2]} color={SILVER} />
      <Ring position={[.12, 1.28, .35]} rotation={[Math.PI / 2, 0, 0]} radius={.22} color={CYAN} /><Block position={[0, .77, -.35]} scale={[1.15, .08, .12]} color={ORANGE} glow={ORANGE} />
      {[[-.48, CYAN], [-.16, PINK], [.16, LIME], [.48, ORANGE]].map(([x, c]) => <Block key={String(x)} position={[Number(x), .92, -.43]} scale={[.16, .12, .5]} color={String(c)} glow={String(c)} />)}
      <Cone position={[0, 1.1, .43]} scale={[.33, .26, .22]} rotation={[Math.PI / 2, 0, 0]} color={SHADOW} />
    </group>;
    case 'accuser': return <group>
      <Boots accent={accent} /><Core accent={accent} /><Ball position={[0, 2.02, 0]} scale={[.54, .62, .5]} color={CREAM} /><Block position={[0, 1.95, .44]} scale={[.55, .1, .08]} color={SHADOW} />
      <Cylinder position={[.62, 1.62, .35]} scale={[.17, 1.08, .17]} rotation={[0, 0, -1.05]} color={SHADOW} /><Cone position={[1.02, 2.06, .35]} scale={[.2, .52, .18]} rotation={[0, 0, -1.05]} color={RED} glow={RED} />
      <Block position={[-.58, 1.25, .35]} scale={[.12, .58, .15]} rotation={[0, 0, .18]} color= {IRON} />
    </group>;
    case 'low_flame': return <group>
      <Cylinder position={[0, .72, 0]} scale={[1.12, .62, .86]} sides={8} color={SHADOW} /><Ball position={[0, 1.12, .05]} scale={[.5, .4, .46]} color={'#2b4250'} />
      <Ball position={[-.16, 1.2, .43]} scale={[.075, .055, .04]} color={ORANGE} glow={ORANGE} /><Ball position={[.16, 1.2, .43]} scale={[.075, .055, .04]} color={ORANGE} glow={ORANGE} />
      <Cone position={[0, 1.95, -.08]} scale={[.72, 1.32, .68]} rotation={[0, 0, .08]} color={ORANGE} glow={ORANGE} /><Cone position={[-.24, 2.12, .08]} scale={[.34, .86, .29]} color={GOLD} glow={ORANGE} /><Cone position={[.35, 1.65, -.1]} scale={[.31, .79, .29]} rotation={[0, 0, -.16]} color={RED} glow={ORANGE} />
      <Block position={[0, .7, .56]} scale={[.72, .46, .13]} color={EDGE} /><Block position={[0, .73, .64]} scale={[.58, .31, .035]} color={'#203844'} /><Block position={[0, .95, .61]} scale={[.72, .055, .1]} color={SHADOW} />
    </group>;
    case 'wandering_eye': return <group>
      <Cylinder position={[0, .92, 0]} scale={[.62, 1.06, .5]} sides={8} color={IRON} /><Ring position={[0, 1.76, .12]} radius={.7} tube={.11} color={SILVER} glow={CYAN} /><Ball position={[0, 1.76, .47]} scale={[.49, .49, .18]} color={CREAM} /><Ball position={[.03, 1.76, .59]} scale={[.15, .22, .07]} color={ORANGE} glow={ORANGE} /><Cable from={[-.3, 1.2, 0]} to={[-.72, 1.68, .1]} color={CYAN} /><Antenna color={ORANGE} />
    </group>;
    case 'the_rind': return <group>
      <Cylinder position={[0, .92, 0]} scale={[.9, 1.1, .62]} sides={6} color={'#273a43'} /><Block position={[0, 1.33, .39]} scale={[.98, .2, .16]} rotation={[0, 0, -.13]} color={EDGE} /><Ball position={[0, 1.92, 0]} scale={[.55, .46, .5]} color={SHADOW} /><Cone position={[-.2, 2.33, 0]} scale={[.28, .64, .24]} rotation={[0, 0, -.3]} color={EDGE} /><Block position={[.04, 1.02, .52]} scale={[1.18, .14, .13]} rotation={[0, 0, -.2]} color={IRON} /><Block position={[-.47, 1.15, .55]} scale={[.22, .12, .15]} color={CYAN} glow={CYAN} /><Cable from={[-.36, .4, -.1]} to={[.42, 1.4, -.12]} color={CYAN} />
    </group>;
    case 'anointed': return <group>
      <Boots accent={accent} /><Core accent={accent} width={.92} /><Ball position={[0, 1.97, 0]} scale={[.46, .58, .44]} color={GOLD} /><Crown color={GOLD} /><Ring position={[0, 2.48, -.08]} rotation={[Math.PI / 2, 0, 0]} radius={.55} tube={.045} color={CYAN} glow={CYAN} /><Cone position={[0, 1.2, -.3]} scale={[1.15, 1.5, .45]} color={'#503c4c'} /><Block position={[0, 1.43, .47]} scale={[.35, .5, .1]} color={GOLD} glow={GOLD} />
    </group>;
    case 'executive_p': return <group>
      <Boots accent={accent} /><Core accent={accent} width={.9} /><Cylinder position={[0, 2, 0]} scale={[.43, .62, .38]} sides={6} color={CREAM} /><Block position={[0, 1.55, .39]} scale={[.58, .1, .05]} color={CYAN} glow={CYAN} /><Block position={[0, 1.28, .38]} scale={[.62, .5, .09]} color={SHADOW} /><Block position={[.65, .78, .27]} scale={[.48, .55, .18]} color={SHADOW} /><Block position={[.65, 1.07, .28]} scale={[.18, .07, .2]} color={SILVER} /><Cone position={[0, 2.47, 0]} scale={[.19, .42, .19]} color={CYAN} />
    </group>;
    case 'alpha_prime': return <group>
      <Boots accent={accent} wide /><Core accent={accent} width={1.25} height={1.08} /><Ball position={[0, 1.98, 0]} scale={[.56, .56, .5]} color={CREAM} /><Block position={[0, 1.55, .41]} scale={[1.02, .23, .14]} color={SILVER} /><Block position={[-.72, 1.45, 0]} scale={[.47, .7, .38]} rotation={[0, 0, -.18]} color={SILVER} /><Block position={[.72, 1.45, 0]} scale={[.47, .7, .38]} rotation={[0, 0, .18]} color={SILVER} /><Visor color={CYAN} width={.72} /><Gem position={[0, 1.28, .47]} scale={[.2, .2, .1]} color={CYAN} glow={CYAN} />
    </group>;
    case 'roll_safe': return <group>
      <Boots accent={accent} /><Core accent={accent} /><Ball position={[0, 2, 0]} scale={[.53, .6, .5]} color={CREAM} /><Block position={[.23, 2.12, .43]} scale={[.09, .35, .09]} rotation={[0, 0, -.68]} color={CREAM} /><Ball position={[.43, 2.3, .42]} scale={[.11, .08, .05]} color={SHADOW} /><Cylinder position={[-.62, .82, .25]} scale={[.42, .45, .2]} sides={8} color={SILVER} /><Ring position={[-.62, .82, .38]} radius={.17} tube={.025} color={ORANGE} /><Gem position={[-.62, 1.05, .25]} scale={[.18, .18, .1]} color={ORANGE} glow={ORANGE} />
    </group>;
    case 'hotwired': return <group>
      <Boots accent={accent} /><Core accent={accent} width={.74} /><Ball position={[0, 1.98, 0]} scale={[.48, .58, .43]} color={'#59636e'} /><Spikes color={ORANGE} /><Block position={[0, 1.96, .41]} scale={[.3, .1, .05]} color={RED} glow={RED} /><Cable from={[-.34, 1.5, .15]} to={[-.8, .72, .3]} color={RED} /><Cable from={[.34, 1.55, .15]} to={[.8, .92, .32]} color={ORANGE} /><Cable from={[-.2, .7, -.1]} to={[.55, .46, .15]} color={CYAN} /><Block position={[.78, .92, .32]} scale={[.22, .42, .15]} color={IRON} glow={RED} />
    </group>;
    case 'panic_bot': return <group>
      <Boots accent={accent} wide /><Core accent={accent} width={1.05} height={.95} /><Block position={[0, 2, 0]} scale={[.72, .62, .62]} color={IRON} /><Visor color={GOLD} width={.62} y={2.05} /><Antenna color={RED} side={-1} /><Antenna color={RED} side={1} /><Ball position={[0, 1.28, .45]} scale={[.24, .24, .08]} color={RED} glow={RED} /><Block position={[-.7, 1.22, .15]} scale={[.27, .65, .27]} rotation={[0, 0, -.5]} color={EDGE} /><Block position={[.72, 1.22, .15]} scale={[.27, .65, .27]} rotation={[0, 0, .6]} color={EDGE} />
    </group>;
    case 'primate': return <group>
      <Cylinder position={[0, .95, 0]} scale={[1.12, .92, .7]} sides={8} color={'#4e4652'} /><Ball position={[0, 1.95, .02]} scale={[.7, .66, .62]} color={'#514b57'} />
      {[-1, 1].map(s => <Ball key={s} position={[s * .43, 1.91, .18]} scale={[.2, .21, .16]} color={'#514b57'} />)}
      <Ball position={[0, 1.72, .48]} scale={[.43, .3, .18]} color={EDGE} /><Ball position={[0, 1.62, .62]} scale={[.21, .13, .06]} color={SHADOW} />
      <Ball position={[-.2, 2.03, .48]} scale={[.07, .07, .04]} color={GOLD} /><Ball position={[.2, 2.03, .48]} scale={[.07, .07, .04]} color={GOLD} />
      <Cone position={[0, 2.45, -.02]} scale={[.59, .48, .35]} color={'#34303c'} /><Block position={[0, 1.34, .5]} scale={[.7, .12, .1]} color={PINK} glow={PINK} />
      <Block position={[-.82, .9, .12]} scale={[.3, .75, .3]} rotation={[0, 0, -.45]} color={'#514b57'} /><Block position={[.82, .9, .12]} scale={[.3, .75, .3]} rotation={[0, 0, .45]} color={'#514b57'} />
      {[-1, 1].map(s => <group key={`knuckle-${s}`}><Ball position={[s * .82, .4, .36]} scale={[.3, .18, .3]} color={'#3e3943'} /><Ball position={[s * .7, .39, .48]} scale={[.08, .08, .08]} color={PINK} glow={PINK} /></group>)}
    </group>;
    case 'pain_hider': return <group>
      <Boots accent={accent} /><Core accent={accent} /><Ball position={[0, 2, 0]} scale={[.52, .62, .48]} color={SHADOW} /><Block position={[0, 1.98, .45]} scale={[.65, .42, .12]} color={IRON} /><Block position={[0, 2.03, .53]} scale={[.42, .05, .03]} color={CYAN} glow={CYAN} /><Block position={[.55, 1.37, .28]} scale={[.27, .54, .2]} rotation={[0, 0, -.55]} color= {CREAM} /><Ring position={[0, 1.26, .46]} radius={.19} color={CYAN} />
    </group>;
    case 'prom_king': return <group>
      <Boots accent={accent} /><Core accent={accent} /><Ball position={[0, 2, 0]} scale={[.47, .58, .43]} color={CREAM} /><Crown color={VIOLET} /><Block position={[0, 1.46, .39]} scale={[.68, .1, .06]} color={SILVER} /><Cone position={[0, 1.06, -.28]} scale={[.95, 1.2, .4]} color={SHADOW} /><Block position={[0, 1.35, .47]} scale={[.12, .42, .07]} color={CYAN} glow={CYAN} /><Ring position={[0, 2.67, 0]} rotation={[Math.PI / 2, 0, 0]} radius={.18} color={VIOLET} />
    </group>;
    case 'idol_core': return <group>
      <Boots accent={accent} /><Core accent={accent} width={.7} /><Ball position={[0, 2, 0]} scale={[.42, .56, .4]} color={CREAM} /><Ring position={[0, 2.62, 0]} rotation={[Math.PI / 2, 0, 0]} radius={.48} tube={.05} color={PINK} glow={PINK} /><Ring position={[0, 1.62, .42]} radius={.3} color={PINK} /><Wings color={VIOLET} trim={PINK} /><Gem position={[0, 1.34, .48]} scale={[.37, .43, .12]} color={PINK} glow={PINK} /><Block position={[-.63, 1.18, .35]} scale={[.1, .6, .08]} rotation={[0, 0, -.5]} color={PINK} /><Block position={[.63, 1.18, .35]} scale={[.1, .6, .08]} rotation={[0, 0, .5]} color={PINK} />
      <Cylinder position={[-.75, 1.63, .42]} scale={[.055, .52, .055]} rotation={[0, 0, -.35]} color= {SHADOW} /><Ball position={[-.84, 1.91, .42]} scale={[.14, .12, .13]} color={PINK} glow={PINK} />
      <Block position={[.56, 2.34, .15]} scale={[.07, .28, .04]} rotation={[0, 0, .24]} color={PINK} glow={PINK} /><Block position={[.76, 2.25, .15]} scale={[.07, .34, .04]} rotation={[0, 0, -.18]} color={VIOLET} glow={VIOLET} />
    </group>;
    case 'danger_zone': return <group>
      <Cylinder position={[0, .95, 0]} scale={[.94, 1.05, .72]} sides={6} color={RED} /><Gem position={[0, 1.95, .2]} scale={[.65, .62, .5]} color={SHADOW} /><Cone position={[-.48, 2.36, 0]} scale={[.28, .65, .25]} color={RED} glow={RED} /><Cone position={[.48, 2.36, 0]} scale={[.28, .65, .25]} color={RED} glow={RED} /><Block position={[0, 1.12, .51]} scale={[.18, .48, .04]} rotation={[0, 0, .5]} color={GOLD} glow={RED} /><Block position={[0, 1.12, .54]} scale={[.16, .48, .04]} rotation={[0, 0, -.5]} color={GOLD} glow={RED} /><Ring position={[0, .38, 0]} rotation={[-Math.PI / 2, 0, 0]} radius={.52} color={RED} />
    </group>;
    case 'the_tank': return <group>
      <Cylinder position={[0, .9, 0]} scale={[1.32, 1.2, .96]} sides={8} color={'#6c7072'} /><Block position={[0, 1.57, .37]} scale={[.75, .16, .1]} color= {SILVER} /><Ball position={[0, 2.02, 0]} scale={[.88, .78, .7]} color={'#777b7b'} /><Block position={[0, 1.94, .58]} scale={[.5, .08, .04]} color={SHADOW} /><Ball position={[-.2, 2.22, .56]} scale={[.13, .16, .06]} color={CREAM} /><Ball position={[.2, 2.22, .56]} scale={[.13, .16, .06]} color={CREAM} /><Ball position={[-.2, 2.23, .61]} scale={[.04, .06, .02]} color={SHADOW} /><Ball position={[.2, 2.23, .61]} scale={[.04, .06, .02]} color={SHADOW} /><Block position={[.05, 1.92, .65]} scale={[.08, .34, .04]} rotation={[0, 0, -.35]} color={CREAM} /><Shield accent={VIOLET} side={-.82} />
    </group>;
    default: return null;
  }
}

function Horns({ color = EDGE, spread = .25, height = .45 }: { color?: string; spread?: number; height?: number }) {
  return <group>{[-1, 1].map(s => <Cone key={s} position={[s * spread, 2.47, 0]} scale={[.16, height, .16]} rotation={[0, 0, s * -.25]} color={color} />)}</group>;
}
function Antenna({ color, side = 1 }: { color: string; side?: number }) {
  return <group><Cylinder position={[side * .27, 2.42, 0]} scale={[.045, .42, .045]} rotation={[0, 0, side * -.2]} color={EDGE} /><Ball position={[side * .34, 2.65, 0]} scale={[.13, .13, .13]} color={color} glow={color} /></group>;
}
function Wings({ color = EDGE, trim = CYAN }: { color?: string; trim?: string }) {
  return <group>{[-1, 1].map(s => <group key={s}><Block position={[s * .72, 1.65, -.27]} scale={[.75, .1, .3]} rotation={[0, 0, s * .46]} color={color} /><Block position={[s * 1.02, 1.45, -.3]} scale={[.42, .06, .2]} rotation={[0, 0, s * -.35]} color={trim} glow={trim} /></group>)}</group>;
}
function Shield({ accent = CYAN, side = -1 }: { accent?: string; side?: number }) {
  return <group position={[side * .7, .95, .45]}><Cylinder rotation={[Math.PI / 2, 0, 0]} scale={[.66, .12, .76]} color={SHADOW} sides={8} /><Ring position={[0, 0, .08]} radius={.3} tube={.04} color={accent} /><Gem position={[0, 0, .1]} scale={[.23, .28, .09]} color={accent} glow={accent} /></group>;
}
function Spikes({ color = EDGE, count = 3 }: { color?: string; count?: number }) {
  return <group>{Array.from({ length: count }, (_, i) => <Cone key={i} position={[(i - (count - 1) / 2) * .22, 2.48 + (i % 2) * .08, -.04]} scale={[.16, .4, .16]} color={color} />)}</group>;
}

const accents: Record<string, string> = {
  guardian_h: CYAN, click_click: PINK, frostbyte: CYAN, sadman: LIME, rainbow_dash: ORANGE, accuser: RED, low_flame: ORANGE, wandering_eye: ORANGE, the_rind: CYAN, anointed: GOLD, executive_p: CYAN, alpha_prime: CYAN, roll_safe: ORANGE, hotwired: RED, panic_bot: RED, primate: PINK, pain_hider: CYAN, prom_king: VIOLET, idol_core: PINK, danger_zone: RED, the_tank: VIOLET,
};

export function PawnModel({ characterId, selected = false }: PawnModelProps) {
  const accent = accents[characterId];
  if (!accent) throw new Error(`Unknown pawn character: ${characterId}`);
  return <group><Base accent={accent} selected={selected} /><Signature id={characterId} accent={accent} /></group>;
}

export default PawnModel;