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
      <Boots accent={accent} wide /><Core accent={accent} width={1.3} height={1.05} />
      <Ball position={[0, 1.97, 0]} scale={[.72, .66, .65]} color={SHADOW} />
      <Ball position={[-.47, 1.99, .12]} scale={[.18, .2, .18]} color={SHADOW} /><Ball position={[.47, 1.99, .12]} scale={[.18, .2, .18]} color={SHADOW} />
      <Ball position={[0, 1.82, .48]} scale={[.43, .27, .22]} color={EDGE} /><Ball position={[0, 1.94, .68]} scale={[.14, .08, .06]} color={SHADOW} />
      <Ball position={[-.2, 2.04, .43]} scale={[.075, .06, .045]} color={CYAN} glow={CYAN} /><Ball position={[.2, 2.04, .43]} scale={[.075, .06, .045]} color={CYAN} glow={CYAN} />
      <Block position={[0, 1.69, .57]} scale={[.3, .05, .04]} color={SHADOW} />
      <Block position={[0, 2.39, -.02]} scale={[.22, .38, .28]} rotation={[0, 0, -.05]} color={'#512c43'} />
      <Ball position={[-.72, 1.62, 0]} scale={[.46, .42, .52]} color={IRON} /><Ball position={[.72, 1.62, 0]} scale={[.46, .42, .52]} color={IRON} />
      <Block position={[-.85, 1.13, .13]} scale={[.3, .68, .34]} rotation={[0, 0, -.08]} color={SHADOW} /><Block position={[.85, 1.13, .13]} scale={[.3, .68, .34]} rotation={[0, 0, .08]} color={SHADOW} />
      <Ball position={[-.85, .74, .32]} scale={[.3, .25, .34]} color={EDGE} /><Ball position={[.85, .74, .32]} scale={[.3, .25, .34]} color={EDGE} />
      <Block position={[0, 1.37, .42]} scale={[.62, .1, .06]} color={SILVER} /><Gem position={[0, 1.2, .48]} scale={[.14, .14, .08]} color={CYAN} glow={CYAN} />
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
      <Boots accent={accent} /><Core accent={accent} width={.94} height={1.02} />
      <Cone position={[0, 2.06, -.04]} scale={[.94, 1.32, .76]} color={'#172632'} />
      <Ball position={[0, 1.93, .27]} scale={[.44, .5, .27]} color={SHADOW} />
      <Gem position={[0, 1.9, .49]} scale={[.34, .42, .12]} color={ICE} glow={CYAN} />
      <Block position={[0, 1.4, .38]} scale={[.6, .28, .12]} color={'#355266'} /><Gem position={[0, 1.38, .46]} scale={[.14, .2, .08]} color={CYAN} glow={CYAN} />
      <Gem position={[.63, 1.62, .04]} scale={[.23, .72, .23]} rotation={[0, 0, .24]} color={ICE} glow={CYAN} />
      <Gem position={[.79, 1.35, -.02]} scale={[.18, .49, .18]} rotation={[0, 0, .38]} color={CYAN} glow={CYAN} />
      <Gem position={[-.56, 1.45, .08]} scale={[.18, .47, .18]} rotation={[0, 0, -.28]} color={'#5eaed0'} glow={CYAN} />
      <Block position={[0, 2.55, -.08]} scale={[.56, .12, .52]} color={EDGE} />
    </group>;
    case 'sadman': return <group rotation={[0, 0, -.04]}>
      <Boots accent={accent} />
      <Cylinder position={[0, 1.14, 0]} scale={[.84, 1.12, .56]} sides={6} color={SHADOW} />
      <Block position={[0, 1.24, .31]} scale={[.34, .74, .08]} color={CREAM} />
      <Block position={[0, 1.08, .38]} scale={[.12, .5, .07]} color={CYAN} />
      <Block position={[-.22, 1.42, .34]} scale={[.26, .5, .07]} rotation={[0, 0, -.18]} color={IRON} /><Block position={[.22, 1.42, .34]} scale={[.26, .5, .07]} rotation={[0, 0, .18]} color={IRON} />
      <Ball position={[0, 2, .02]} scale={[.5, .7, .44]} color={'#6f9b89'} />
      <Ball position={[-.46, 1.96, .02]} scale={[.14, .16, .12]} color={'#6f9b89'} /><Ball position={[.46, 1.96, .02]} scale={[.14, .16, .12]} color={'#6f9b89'} />
      <Block position={[0, 2.05, .4]} scale={[.29, .08, .06]} color={SHADOW} /><Block position={[0, 1.92, .42]} scale={[.11, .21, .08]} rotation={[0, 0, .1]} color={'#90b7a0'} />
      <Ball position={[-.17, 2.08, .39]} scale={[.07, .045, .035]} color={SHADOW} /><Ball position={[.17, 2.08, .39]} scale={[.07, .045, .035]} color={SHADOW} />
      <Block position={[.47, 1.24, .22]} scale={[.12, .62, .12]} rotation={[0, 0, -.4]} color={SHADOW} /><Ball position={[.66, 1.42, .38]} scale={[.15, .12, .12]} color={'#6f9b89'} />
      <Block position={[.67, 1.39, .54]} scale={[.48, .31, .025]} rotation={[0, -.12, .14]} color={'#174453'} /><Ring position={[.67, 1.39, .57]} radius={.2} tube={.015} color={CYAN} />
    </group>;
    case 'rainbow_dash': return <group>
      <Cylinder position={[0, 1.3, 0]} scale={[1.55, .42, .58]} sides={8} color={SILVER} />
      <Block position={[.03, 1.48, .23]} scale={[1.15, .12, .07]} color={EDGE} />
      <Block position={[-.53, 1.31, .3]} scale={[.18, .4, .07]} color={SHADOW} /><Block position={[0, 1.31, .3]} scale={[.18, .4, .07]} color={SHADOW} /><Block position={[.49, 1.31, .3]} scale={[.18, .4, .07]} color={SHADOW} />
      <Ball position={[-.77, 1.48, .03]} scale={[.43, .36, .4]} color={SILVER} />
      <Cone position={[-.99, 1.78, -.02]} scale={[.18, .47, .17]} rotation={[0, 0, -.24]} color={EDGE} /><Cone position={[-.56, 1.78, -.02]} scale={[.18, .47, .17]} rotation={[0, 0, .24]} color={EDGE} />
      <Ball position={[-.9, 1.48, .34]} scale={[.07, .06, .04]} color={CYAN} glow={CYAN} /><Ball position={[-.66, 1.48, .34]} scale={[.07, .06, .04]} color={CYAN} glow={CYAN} />
      <Cone position={[-.78, 1.35, .41]} scale={[.18, .16, .12]} rotation={[Math.PI, 0, 0]} color={SHADOW} />
      {[-.48, .48].map(s => <group key={s}><Cylinder position={[s, .89, .02]} scale={[.11, .64, .11]} color={EDGE} /><Ball position={[s, .59, .07]} scale={[.2, .1, .25]} color={SHADOW} /></group>)}
      <Block position={[1.05, 1.42, -.02]} scale={[.58, .045, .12]} color={RED} glow={RED} /><Block position={[1.13, 1.33, -.02]} scale={[.68, .045, .1]} color={ORANGE} glow={ORANGE} /><Block position={[1.19, 1.24, -.02]} scale={[.8, .045, .08]} color={LIME} glow={LIME} /><Block position={[1.23, 1.15, -.02]} scale={[.9, .045, .06]} color={CYAN} glow={CYAN} />
    </group>;
    case 'accuser': return <group>
      <Boots accent={accent} /><Core accent={accent} width={.9} /><Block position={[0, 1.32, .39]} scale={[.62, .46, .1]} color={RED} glow={RED} />
      <Ball position={[0, 2.03, .02]} scale={[.47, .59, .43]} color={CREAM} /><Block position={[0, 2.3, .04]} scale={[.5, .13, .39]} color={SHADOW} /><Block position={[0, 2.24, .31]} scale={[.44, .14, .16]} color={SHADOW} />
      <Block position={[-.17, 2.04, .4]} scale={[.12, .055, .04]} color={SHADOW} /><Block position={[.17, 2.04, .4]} scale={[.12, .055, .04]} color={SHADOW} />
      <Ball position={[0, 1.92, .42]} scale={[.055, .1, .06]} color={CREAM} /><Ball position={[0, 1.78, .44]} scale={[.13, .14, .08]} color={SHADOW} />
      <Block position={[0, 1.47, .41]} scale={[.28, .06, .04]} color={CYAN} glow={CYAN} />
      <Cylinder position={[-.83, 1.83, .29]} scale={[.16, .95, .16]} rotation={[0, 0, .72]} color={IRON} /><Cylinder position={[-1.11, 2.06, .36]} scale={[.12, .53, .12]} rotation={[0, 0, .97]} color={SHADOW} />
      <Cone position={[-1.38, 2.25, .36]} scale={[.14, .31, .13]} rotation={[0, 0, Math.PI / 2]} color={CREAM} />
      <Block position={[.59, 1.37, .26]} scale={[.16, .58, .15]} rotation={[0, 0, -.25]} color={IRON} />
    </group>;
    case 'low_flame': return <group>
      <Cylinder position={[0, .88, -.05]} scale={[.96, .75, .64]} sides={8} color={'#252c35'} />
      <Block position={[0, .72, .62]} scale={[1.1, .34, .16]} color={EDGE} /><Block position={[0, .75, .72]} scale={[.9, .24, .035]} color={'#153b48'} />
      <Block position={[0, .92, .65]} scale={[1.1, .08, .13]} color={SHADOW} />
      <Ball position={[0, 1.65, .02]} scale={[.52, .48, .48]} color={'#79614e'} />
      <Cone position={[-.34, 2.02, .02]} scale={[.27, .58, .23]} rotation={[0, 0, -.18]} color={'#79543f'} /><Cone position={[.34, 2.02, .02]} scale={[.27, .58, .23]} rotation={[0, 0, .18]} color={'#79543f'} />
      <Ball position={[0, 1.51, .37]} scale={[.31, .2, .19]} color={CREAM} /><Ball position={[0, 1.58, .52]} scale={[.09, .065, .055]} color={SHADOW} />
      <Ring position={[-.2, 1.73, .39]} radius={.13} tube={.045} color={ORANGE} /><Ring position={[.2, 1.73, .39]} radius={.13} tube={.045} color={ORANGE} /><Block position={[0, 1.73, .4]} scale={[.13, .045, .045]} color={SHADOW} />
      <Ring position={[-.48, 1.76, .08]} radius={.2} tube={.065} color={VIOLET} /><Ring position={[.48, 1.76, .08]} radius={.2} tube={.065} color={VIOLET} />
      <Block position={[-.42, 1.18, .28]} scale={[.16, .6, .16]} rotation={[0, 0, -.35]} color={SHADOW} /><Ball position={[-.65, .96, .45]} scale={[.16, .15, .15]} color={CREAM} />
      <Block position={[.43, 1.05, .33]} scale={[.17, .55, .15]} rotation={[0, 0, .62]} color={SHADOW} /><Ball position={[.64, .85, .48]} scale={[.16, .13, .13]} color={CREAM} />
      <Cylinder position={[-.73, .94, .48]} scale={[.23, .3, .23]} color={CREAM} /><Cylinder position={[-.73, 1.09, .48]} scale={[.19, .05, .19]} color={ORANGE} glow={ORANGE} /><Ring position={[-.92, .95, .5]} radius={.12} tube={.025} color={SILVER} />
    </group>;
    case 'wandering_eye': return <group>
      <Boots accent={accent} /><Core accent={accent} width={.95} height={.96} />
      <Ball position={[0, 2, 0]} scale={[.66, .7, .63]} color={SILVER} /><Ball position={[0, 1.97, .23]} scale={[.43, .48, .38]} color={CREAM} />
      <Ring position={[0, 2.02, .37]} radius={.56} tube={.075} color={EDGE} /><Block position={[0, 2.26, .38]} scale={[.64, .08, .08]} color={CYAN} glow={CYAN} />
      <Ball position={[-.17, 2.02, .55]} scale={[.055, .05, .035]} color={SHADOW} /><Ball position={[.17, 2.02, .55]} scale={[.055, .05, .035]} color={SHADOW} />
      <Block position={[0, 1.87, .58]} scale={[.14, .09, .07]} color={EDGE} /><Block position={[0, 1.76, .54]} scale={[.17, .035, .04]} color={SHADOW} />
      <Cylinder position={[-.57, 2, 0]} scale={[.18, .28, .18]} color={IRON} /><Cylinder position={[.57, 2, 0]} scale={[.18, .28, .18]} color={IRON} />
      <Ring position={[-.57, 2, .12]} radius={.15} tube={.04} color={ORANGE} /><Ring position={[.57, 2, .12]} radius={.15} tube={.04} color={ORANGE} />
      <Cable from={[-.36, 1.44, .05]} to={[-.64, 1.18, .18]} color={ORANGE} /><Cable from={[-.64, 1.18, .18]} to={[-.54, 1.02, .24]} color={CYAN} />
    </group>;
    case 'the_rind': return <group>
      <Cylinder position={[-.1, 1, 0]} scale={[.82, .9, .64]} sides={8} color={IRON} />
      <Block position={[-.15, 1.28, .34]} scale={[.64, .52, .12]} rotation={[0, 0, -.18]} color={SHADOW} /><Block position={[-.2, .98, .42]} scale={[.7, .1, .06]} color={EDGE} />
      <Ball position={[-.34, 1.82, 0]} scale={[.48, .47, .43]} color={SHADOW} />
      <Cone position={[-.61, 2.13, .03]} scale={[.24, .43, .19]} rotation={[0, 0, -.22]} color={'#743f4b'} /><Cone position={[-.17, 2.13, .03]} scale={[.24, .43, .19]} rotation={[0, 0, .22]} color={'#743f4b'} />
      <Ball position={[-.34, 1.72, .34]} scale={[.32, .2, .19]} color={'#49535b'} /><Ball position={[-.34, 1.77, .49]} scale={[.1, .07, .05]} color={SHADOW} />
      <Block position={[-.17, 1.9, .39]} scale={[.07, .18, .04]} color={CYAN} glow={CYAN} />
      <Block position={[-.13, .66, .08]} scale={[.62, .25, .25]} rotation={[0, 0, -.5]} color={SHADOW} /><Block position={[.3, .56, -.02]} scale={[.58, .2, .25]} rotation={[0, 0, .42]} color={IRON} />
      <Block position={[-.38, 1.42, .34]} scale={[.72, .13, .12]} rotation={[0, 0, -.62]} color={SHADOW} /><Block position={[.2, 1.62, .39]} scale={[.68, .1, .1]} rotation={[0, 0, .06]} color={IRON} />
      <Cylinder position={[.37, 1.65, .44]} scale={[.055, 1.2, .055]} rotation={[0, 0, -Math.PI / 2]} color={SILVER} />
      <Block position={[-.28, 1.6, .45]} scale={[.3, .22, .12]} color={SHADOW} /><Block position={[.36, 1.77, .45]} scale={[.2, .08, .13]} color={EDGE} /><Block position={[.9, 1.65, .44]} scale={[.17, .08, .12]} color={SHADOW} />
      <Cable from={[-.48, .72, -.05]} to={[-.95, .44, -.05]} color={SHADOW} /><Cable from={[-.95, .44, -.05]} to={[-1.12, .68, -.05]} color={SHADOW} />
    </group>;
    case 'anointed': return <group>
      <Cylinder position={[0, 1.17, -.03]} scale={[1.1, 1.35, .7]} sides={8} color={'#503c4c'} /><Cone position={[0, 1.22, -.34]} scale={[1.12, 1.38, .42]} color={'#503c4c'} />
      <Block position={[-.56, 1.65, .02]} scale={[.43, .5, .39]} rotation={[0, 0, -.1]} color={'#263653'} /><Block position={[.56, 1.65, .02]} scale={[.43, .5, .39]} rotation={[0, 0, .1]} color={'#263653'} />
      <Block position={[0, 1.5, .38]} scale={[.66, .5, .12]} color={'#18334a'} /><Gem position={[0, 1.52, .47]} scale={[.16, .27, .08]} color={GOLD} glow={GOLD} />
      <Cylinder position={[0, 2.1, .03]} scale={[.57, .69, .48]} sides={8} color={GOLD} /><Block position={[0, 2.06, .28]} scale={[.42, .46, .14]} color={'#8b6025'} />
      <Block position={[-.16, 2.17, .39]} scale={[.1, .06, .04]} color={CYAN} glow={CYAN} /><Block position={[.16, 2.17, .39]} scale={[.1, .06, .04]} color={CYAN} glow={CYAN} />
      <Block position={[0, 2.05, .47]} scale={[.035, .33, .04]} color={GOLD} /><Block position={[-.12, 1.91, .41]} scale={[.035, .19, .04]} color={GOLD} /><Block position={[.12, 1.91, .41]} scale={[.035, .19, .04]} color={GOLD} />
      <Cylinder position={[0, 2.45, .02]} scale={[.62, .16, .58]} sides={8} color={GOLD} />
      {[-1, 0, 1].map(s => <Cone key={s} position={[s * .25, 2.67, .02]} scale={[.16, .43, .16]} color={GOLD} />)}
      <Ring position={[0, 2.86, -.08]} rotation={[Math.PI / 2, 0, 0]} radius={.55} tube={.045} color={CYAN} glow={CYAN} />
      <Ring position={[0, 2.73, -.1]} rotation={[Math.PI / 2, 0, 0]} radius={.42} tube={.025} color={CYAN} glow={CYAN} />
    </group>;
    case 'executive_p': return <group>
      <Boots accent={accent} /><Core accent={accent} width={.92} height={.98} />
      <Block position={[0, 1.45, .37]} scale={[.76, .76, .14]} color={SHADOW} /><Block position={[-.29, 1.79, .39]} scale={[.16, .62, .09]} rotation={[0, 0, -.18]} color={SILVER} /><Block position={[.29, 1.79, .39]} scale={[.16, .62, .09]} rotation={[0, 0, .18]} color={SILVER} />
      <Block position={[0, 1.46, .47]} scale={[.17, .62, .08]} color={CREAM} /><Block position={[0, 1.23, .52]} scale={[.08, .3, .06]} color={SHADOW} />
      <Ball position={[0, 2.03, .02]} scale={[.4, .52, .38]} color={CREAM} /><Block position={[0, 2.31, .02]} scale={[.45, .13, .38]} color={SHADOW} /><Block position={[0, 2.24, .3]} scale={[.4, .12, .13]} color={SHADOW} />
      <Block position={[-.67, .9, .2]} scale={[.13, .64, .14]} rotation={[0, 0, .12]} color={IRON} />
      <Cylinder position={[-.67, 1.1, .32]} scale={[.055, .86, .055]} rotation={[0, 0, .08]} color={SILVER} />
      <Gem position={[-.78, 1.56, .31]} scale={[.42, .3, .11]} rotation={[0, 0, .3]} color={CYAN} glow={CYAN} />
      <Block position={[-.52, 1.48, .4]} scale={[.2, .16, .06]} rotation={[0, 0, -.35]} color={CYAN} glow={CYAN} />
      <Ball position={[.55, 1.32, .26]} scale={[.15, .13, .15]} color={CREAM} />
    </group>;
    case 'alpha_prime': return <group>
      <Boots accent={accent} wide /><Core accent={accent} width={1.25} height={1.08} /><Ball position={[0, 1.98, 0]} scale={[.56, .56, .5]} color={CREAM} /><Block position={[0, 1.55, .41]} scale={[1.02, .23, .14]} color={SILVER} /><Block position={[-.72, 1.45, 0]} scale={[.47, .7, .38]} rotation={[0, 0, -.18]} color={SILVER} /><Block position={[.72, 1.45, 0]} scale={[.47, .7, .38]} rotation={[0, 0, .18]} color={SILVER} /><Visor color={CYAN} width={.72} /><Gem position={[0, 1.28, .47]} scale={[.2, .2, .1]} color={CYAN} glow={CYAN} />
    </group>;
    case 'roll_safe': return <group>
      <Boots accent={accent} /><Core accent={accent} width={.96} />
      <Block position={[0, 1.42, .39]} scale={[.73, .71, .12]} color={'#252a30'} /><Block position={[-.25, 1.45, .46]} scale={[.15, .62, .05]} rotation={[0, 0, -.16]} color={EDGE} /><Block position={[.25, 1.45, .46]} scale={[.15, .62, .05]} rotation={[0, 0, .16]} color={EDGE} />
      <Ball position={[0, 2, .02]} scale={[.48, .57, .43]} color={'#80533d'} /><Block position={[0, 2.28, .02]} scale={[.43, .12, .37]} color={'#201a18'} />
      <Ball position={[0, 1.79, .34]} scale={[.31, .2, .13]} color={'#30201d'} />
      <Ball position={[-.17, 2.03, .4]} scale={[.07, .06, .035]} color={SHADOW} /><Ball position={[.17, 2.03, .4]} scale={[.07, .06, .035]} color={SHADOW} />
      <Block position={[.21, 2.02, .41]} scale={[.055, .18, .05]} rotation={[0, 0, -.58]} color={'#80533d'} /><Ball position={[.3, 2.1, .43]} scale={[.1, .08, .07]} color={'#80533d'} />
      <Block position={[0, 1.38, .48]} scale={[.12, .37, .04]} color={CYAN} glow={CYAN} />
      <Block position={[-.42, .98, .37]} scale={[.14, .63, .14]} rotation={[0, 0, .55]} color={SHADOW} /><Ball position={[.3, 1.18, .5]} scale={[.14, .12, .12]} color={'#80533d'} />
    </group>;
    case 'hotwired': return <group>
      <Boots accent={accent} /><Core accent={accent} width={.86} height={.92} />
      <Ball position={[0, 1.98, .02]} scale={[.54, .62, .47]} color={'#aaa8a0'} />
      <Block position={[0, 1.91, .4]} scale={[.55, .36, .13]} color={'#24252a'} />
      <Ball position={[-.18, 2.01, .48]} scale={[.1, .12, .06]} color={SHADOW} /><Ball position={[.18, 2.01, .48]} scale={[.1, .12, .06]} color={SHADOW} />
      <Ball position={[-.18, 2.02, .54]} scale={[.045, .05, .03]} color={RED} glow={RED} /><Ball position={[.18, 2.02, .54]} scale={[.045, .05, .03]} color={RED} glow={RED} />
      <Gem position={[0, 1.87, .51]} scale={[.11, .1, .07]} color={SILVER} /><Block position={[0, 1.72, .51]} scale={[.38, .1, .05]} color={SHADOW} />
      {[-1, 1].map(s => <Block key={`tooth-${s}`} position={[s * .1, 1.73, .55]} scale={[.045, .07, .025]} color={SILVER} />)}
      <Cable from={[-.35, 2.34, .02]} to={[-.7, 2.05, .08]} color={SHADOW} thickness={.08} /><Cable from={[-.7, 2.05, .08]} to={[-.78, 1.7, .1]} color={SHADOW} thickness={.08} />
      <Cable from={[-.14, 2.49, -.05]} to={[-.32, 2.14, .05]} color={RED} thickness={.07} /><Cable from={[-.32, 2.14, .05]} to={[-.47, 1.82, .18]} color={SHADOW} thickness={.07} />
      <Cable from={[.12, 2.45, -.05]} to={[.37, 2.13, .02]} color={SHADOW} thickness={.08} /><Cable from={[.37, 2.13, .02]} to={[.49, 1.78, .12]} color={SHADOW} thickness={.08} />
      <Cable from={[.38, 2.3, -.08]} to={[.7, 2.01, .02]} color={SHADOW} thickness={.07} /><Cable from={[.7, 2.01, .02]} to={[.78, 1.7, .12]} color={RED} thickness={.07} />
      <Block position={[-.56, 1.34, .14]} scale={[.3, .5, .28]} rotation={[0, 0, -.2]} color={SHADOW} /><Block position={[.56, 1.34, .14]} scale={[.3, .5, .28]} rotation={[0, 0, .2]} color={SHADOW} />
      <Block position={[0, 1.34, .39]} scale={[.2, .5, .06]} color={RED} glow={RED} />
    </group>;
    case 'panic_bot': return <group>
      <Boots accent={accent} wide /><Core accent={accent} width={1.05} height={.95} /><Block position={[0, 2, 0]} scale={[.72, .62, .62]} color={IRON} /><Visor color={GOLD} width={.62} y={2.05} /><Antenna color={RED} side={-1} /><Antenna color={RED} side={1} /><Ball position={[0, 1.28, .45]} scale={[.24, .24, .08]} color={RED} glow={RED} /><Block position={[-.7, 1.22, .15]} scale={[.27, .65, .27]} rotation={[0, 0, -.5]} color={EDGE} /><Block position={[.72, 1.22, .15]} scale={[.27, .65, .27]} rotation={[0, 0, .6]} color={EDGE} />
    </group>;
    case 'primate': return <group>
      <Cylinder position={[0, .95, 0]} scale={[1.12, .92, .7]} sides={8} color={'#4e4652'} /><Ball position={[0, 1.95, .02]} scale={[.7, .66, .62]} color={'#514b57'} />
      {[-1, 1].map(s => <Ball key={s} position={[s * .43, 1.91, .18]} scale={[.2, .21, .16]} color={'#514b57'} />)}
      <Ball position={[0, 1.72, .48]} scale={[.43, .3, .18]} color={'#77747a'} /><Ball position={[0, 1.62, .62]} scale={[.21, .13, .06]} color={SHADOW} />
      <Ball position={[-.2, 2.03, .48]} scale={[.07, .07, .04]} color={CYAN} glow={CYAN} /><Ball position={[.2, 2.03, .48]} scale={[.07, .07, .04]} color={CYAN} glow={CYAN} />
      <Cone position={[0, 2.45, -.02]} scale={[.59, .48, .35]} color={'#773d7e'} />
      <Block position={[-.82, .9, .12]} scale={[.3, .75, .3]} rotation={[0, 0, -.45]} color={'#514b57'} /><Block position={[.82, .9, .12]} scale={[.3, .75, .3]} rotation={[0, 0, .45]} color={'#514b57'} />
      {[-1, 1].map(s => <group key={`knuckle-${s}`}><Ball position={[s * .82, .4, .36]} scale={[.3, .18, .3]} color={'#3e3943'} /><Ball position={[s * .7, .39, .48]} scale={[.08, .08, .08]} color={PINK} glow={PINK} /></group>)}
      <Block position={[-.54, 1.46, .31]} scale={[.18, .58, .08]} rotation={[0, 0, -.25]} color={SHADOW} /><Block position={[.54, 1.46, .31]} scale={[.18, .58, .08]} rotation={[0, 0, .25]} color={SHADOW} />
      <Block position={[0, 1.35, .48]} scale={[.08, .55, .06]} color={CYAN} glow={CYAN} />
    </group>;
    case 'pain_hider': return <group>
      <Boots accent={accent} /><Core accent={accent} width={.95} height={.95} />
      <Block position={[0, 1.38, .39]} scale={[.7, .52, .1]} color={'#171e25'} />
      <Ball position={[0, 2, .02]} scale={[.52, .61, .44]} color={'#c4aa91'} />
      <Ball position={[-.49, 2, .02]} scale={[.12, .18, .13]} color={'#b79a83'} /><Ball position={[.49, 2, .02]} scale={[.12, .18, .13]} color={'#b79a83'} />
      <Block position={[0, 2.27, .03]} scale={[.43, .12, .37]} color={'#b3a896'} />
      <Ball position={[-.17, 2.04, .4]} scale={[.07, .055, .035]} color={SHADOW} /><Ball position={[.17, 2.04, .4]} scale={[.07, .055, .035]} color={SHADOW} />
      <Block position={[0, 1.93, .43]} scale={[.11, .17, .06]} color={'#ae9078'} /><Block position={[0, 1.78, .42]} scale={[.25, .04, .04]} color={'#756152'} />
      <Block position={[-.37, 2.12, .28]} scale={[.18, .17, .18]} color={SILVER} /><Block position={[.37, 2.12, .28]} scale={[.18, .17, .18]} color={SILVER} />
      <Block position={[-.55, 1.33, .22]} scale={[.24, .59, .22]} rotation={[0, 0, -.35]} color={SHADOW} />
      <Block position={[.45, 1.57, .25]} scale={[.16, .59, .15]} rotation={[0, 0, -.35]} color={'#c4aa91'} /><Ball position={[.61, 1.78, .4]} scale={[.14, .12, .12]} color={'#c4aa91'} />
      <Cylinder position={[.73, 1.25, .4]} scale={[.23, .37, .23]} color={'#4bb6e5'} glow={CYAN} /><Cylinder position={[.73, 1.43, .4]} scale={[.2, .05, .2]} color={CYAN} glow={CYAN} /><Ring position={[.92, 1.25, .4]} radius={.11} tube={.025} color={SILVER} />
      <Block position={[-.25, 1.91, .44]} scale={[.04, .13, .025]} rotation={[0, 0, -.28]} color={SILVER} /><Block position={[.25, 1.91, .44]} scale={[.04, .13, .025]} rotation={[0, 0, .28]} color={SILVER} />
    </group>;
    case 'prom_king': return <group>
      <Boots accent={accent} /><Core accent={accent} width={.88} />
      <Block position={[0, 1.4, .38]} scale={[.72, .72, .13]} color={SHADOW} /><Block position={[-.28, 1.58, .45]} scale={[.15, .66, .06]} rotation={[0, 0, -.2]} color={CYAN} glow={CYAN} /><Block position={[.28, 1.58, .45]} scale={[.15, .66, .06]} rotation={[0, 0, .2]} color={CYAN} glow={CYAN} />
      <Block position={[0, 1.63, .49]} scale={[.29, .1, .06]} color={CREAM} /><Block position={[0, 1.43, .49]} scale={[.1, .33, .05]} color={CREAM} />
      <Ball position={[0, 2.02, .02]} scale={[.43, .55, .4]} color={CREAM} /><Block position={[0, 2.31, .02]} scale={[.46, .14, .4]} color={'#24242a'} />
      <Block position={[-.18, 2.08, .38]} scale={[.1, .055, .035]} color={SHADOW} /><Block position={[.18, 2.08, .38]} scale={[.1, .055, .035]} color={SHADOW} />
      <Crown color={VIOLET} />
      <Block position={[.51, 1.52, .24]} scale={[.16, .54, .15]} rotation={[0, 0, -.48]} color={SHADOW} /><Ball position={[.3, 1.81, .42]} scale={[.14, .13, .12]} color={CREAM} />
      <Block position={[0, 1.79, .52]} scale={[.07, .23, .04]} rotation={[0, 0, -.14]} color={CYAN} glow={CYAN} />
    </group>;
    case 'idol_core': return <group>
      <Boots accent={accent} /><Core accent={accent} width={.7} /><Ball position={[0, 2, 0]} scale={[.42, .56, .4]} color={CREAM} /><Ring position={[0, 2.62, 0]} rotation={[Math.PI / 2, 0, 0]} radius={.48} tube={.05} color={PINK} glow={PINK} /><Ring position={[0, 1.62, .42]} radius={.3} color={PINK} /><Wings color={VIOLET} trim={PINK} /><Gem position={[0, 1.34, .48]} scale={[.37, .43, .12]} color={PINK} glow={PINK} /><Block position={[-.63, 1.18, .35]} scale={[.1, .6, .08]} rotation={[0, 0, -.5]} color={PINK} /><Block position={[.63, 1.18, .35]} scale={[.1, .6, .08]} rotation={[0, 0, .5]} color={PINK} />
      <Cylinder position={[-.75, 1.63, .42]} scale={[.055, .52, .055]} rotation={[0, 0, -.35]} color= {SHADOW} /><Ball position={[-.84, 1.91, .42]} scale={[.14, .12, .13]} color={PINK} glow={PINK} />
      <Block position={[.56, 2.34, .15]} scale={[.07, .28, .04]} rotation={[0, 0, .24]} color={PINK} glow={PINK} /><Block position={[.76, 2.25, .15]} scale={[.07, .34, .04]} rotation={[0, 0, -.18]} color={VIOLET} glow={VIOLET} />
    </group>;
    case 'danger_zone': return <group>
      <Boots accent={accent} /><Core accent={accent} width={.92} height={.98} />
      <Block position={[0, 1.39, .39]} scale={[.69, .72, .1]} color={'#161c26'} />
      <Block position={[-.25, 1.54, .46]} scale={[.1, .6, .04]} rotation={[0, 0, -.18]} color={RED} glow={RED} /><Block position={[.25, 1.54, .46]} scale={[.1, .6, .04]} rotation={[0, 0, .18]} color={RED} glow={RED} />
      <Ball position={[0, 2.03, .02]} scale={[.45, .55, .39]} color={CREAM} />
      <Block position={[0, 2.29, .02]} scale={[.48, .12, .38]} color={'#363640'} /><Block position={[-.22, 2.28, .02]} scale={[.12, .13, .35]} color={'#d4d3d1'} /><Block position={[.22, 2.28, .02]} scale={[.12, .13, .35]} color={'#d4d3d1'} />
      <Ball position={[-.16, 2.03, .38]} scale={[.06, .05, .03]} color={SHADOW} /><Ball position={[.16, 2.03, .38]} scale={[.06, .05, .03]} color={SHADOW} />
      <Block position={[0, 1.88, .4]} scale={[.13, .08, .04]} color={SHADOW} /><Block position={[0, 1.75, .39]} scale={[.16, .04, .035]} color={SHADOW} />
      <Block position={[-.57, 1.48, .17]} scale={[.17, .57, .14]} rotation={[0, 0, -.68]} color={SHADOW} /><Block position={[-.74, 1.13, .25]} scale={[.17, .37, .14]} rotation={[0, 0, .48]} color={SHADOW} />
      <Ball position={[-.78, .97, .35]} scale={[.15, .13, .14]} color={CREAM} />
      <Block position={[.57, 1.48, .17]} scale={[.17, .57, .14]} rotation={[0, 0, .68]} color={SHADOW} /><Block position={[.74, 1.13, .25]} scale={[.17, .37, .14]} rotation={[0, 0, -.48]} color={SHADOW} />
      <Ball position={[.78, .97, .35]} scale={[.15, .13, .14]} color={CREAM} />
      <Block position={[-.67, 1.49, .29]} scale={[.07, .45, .035]} rotation={[0, 0, -.68]} color={RED} glow={RED} /><Block position={[.67, 1.49, .29]} scale={[.07, .45, .035]} rotation={[0, 0, .68]} color={RED} glow={RED} />
    </group>;
    case 'the_tank': return <group>
      <Cylinder position={[0, 1.35, 0]} scale={[1.25, 1.42, .95]} sides={8} color={'#6c7072'} />
      <Gem position={[-.72, 1.65, .47]} scale={[.42, .6, .25]} rotation={[0, 0, -.18]} color={'#747a7c'} /><Gem position={[.72, 1.65, .47]} scale={[.42, .6, .25]} rotation={[0, 0, .18]} color={'#747a7c'} />
      <Gem position={[-.44, .92, .64]} scale={[.35, .3, .18]} color={'#85898a'} /><Gem position={[.47, 1.09, .67]} scale={[.3, .38, .16]} color={'#85898a'} />
      <Cylinder position={[-.4, .42, .02]} scale={[.25, .5, .27]} sides={6} color={SHADOW} /><Cylinder position={[.4, .42, .02]} scale={[.25, .5, .27]} sides={6} color={SHADOW} />
      <Ball position={[-.25, 1.78, .78]} scale={[.17, .19, .07]} color={'#e5ddda'} /><Ball position={[.25, 1.78, .78]} scale={[.17, .19, .07]} color={'#e5ddda'} />
      <Ball position={[-.25, 1.78, .84]} scale={[.055, .07, .03]} color={SHADOW} /><Ball position={[.25, 1.78, .84]} scale={[.055, .07, .03]} color={SHADOW} />
      <Block position={[0, 1.59, .88]} scale={[.34, .04, .035]} color={SHADOW} />
      <Block position={[.32, 1.31, .58]} scale={[.16, .55, .14]} rotation={[0, 0, -.58]} color={'#777b7b'} /><Ball position={[.08, 1.53, .77]} scale={[.17, .14, .12]} color={'#85898a'} />
      <Block position={[.02, 1.73, .91]} scale={[.09, .37, .07]} color={CREAM} />
      <Block position={[-.18, 1.42, .64]} scale={[.04, .16, .04]} color={'#a3a4a1'} /><Block position={[.53, 1.89, .57]} scale={[.04, .24, .04]} rotation={[0, 0, .5]} color={'#a3a4a1'} />
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