import { HAUNTED_PAWN_DESIGNS } from './haunted-pawn-designs';

type V3 = [number, number, number];
type PieceProps = { position?: V3; scale?: V3; color: string; emissive?: string; rotation?: V3 };

function Metal({ position = [0, 0, 0], scale = [1, 1, 1], color, emissive, rotation = [0, 0, 0] }: PieceProps) {
  return <mesh position={position} scale={scale} rotation={rotation} castShadow receiveShadow>
    <boxGeometry args={[1, 1, 1]} />
    <meshStandardMaterial color={color} metalness={0.62} roughness={0.36} emissive={emissive ?? '#000'} emissiveIntensity={emissive ? 0.52 : 0} />
  </mesh>;
}
function Orb({ position = [0, 0, 0], scale = [1, 1, 1], color, emissive }: PieceProps) {
  return <mesh position={position} scale={scale} castShadow receiveShadow>
    <sphereGeometry args={[0.5, 16, 12]} />
    <meshStandardMaterial color={color} metalness={0.28} roughness={0.32} emissive={emissive ?? '#000'} emissiveIntensity={emissive ? 0.75 : 0} />
  </mesh>;
}
function Pillar({ position = [0, 0, 0], scale = [1, 1, 1], color, emissive, rotation = [0, 0, 0] }: PieceProps) {
  return <mesh position={position} scale={scale} rotation={rotation} castShadow receiveShadow>
    <cylinderGeometry args={[0.5, 0.62, 1, 9]} />
    <meshStandardMaterial color={color} metalness={0.66} roughness={0.38} emissive={emissive ?? '#000'} emissiveIntensity={emissive ? 0.48 : 0} />
  </mesh>;
}
function Spike({ position = [0, 0, 0], scale = [1, 1, 1], color, emissive, rotation = [0, 0, 0] }: PieceProps) {
  return <mesh position={position} scale={scale} rotation={rotation} castShadow>
    <coneGeometry args={[0.5, 1, 6]} />
    <meshStandardMaterial color={color} metalness={0.44} roughness={0.42} emissive={emissive ?? '#000'} emissiveIntensity={emissive ? 0.48 : 0} />
  </mesh>;
}
function Ring({ position = [0, 0, 0], color, emissive, rotation = [0, 0, 0], radius = 0.5 }: PieceProps & { radius?: number }) {
  return <mesh position={position} rotation={rotation}>
    <torusGeometry args={[radius, 0.045, 8, 24]} />
    <meshStandardMaterial color={color} metalness={0.42} roughness={0.3} emissive={emissive ?? color} emissiveIntensity={0.38} />
  </mesh>;
}

function HauntedBase({ accent, selected }: { accent: string; selected: boolean }) {
  return <group>
    <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.86, 0.92, 0.16, 12]} />
      <meshStandardMaterial color="#121419" metalness={0.72} roughness={0.35} />
    </mesh>
    <mesh position={[0, 0.19, 0]} castShadow>
      <cylinderGeometry args={[0.78, 0.84, 0.1, 12]} />
      <meshStandardMaterial color="#37333a" metalness={0.78} roughness={0.3} />
    </mesh>
    <Ring position={[0, 0.245, 0]} rotation={[-Math.PI / 2, 0, 0]} radius={0.69} color={accent} emissive={accent} />
    <Metal position={[0, 0.155, 0.83]} scale={[0.25, 0.055, 0.035]} color={accent} emissive={accent} />
    {selected && <Ring position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} radius={0.93} color={accent} emissive={accent} />}
  </group>;
}

function Body({ kind, accent }: { kind: string; accent: string }) {
  const shadow = '#17171b';
  if (kind === 'armor') return <group>
    <Pillar position={[0, 1.06, 0]} scale={[1.12, 1.24, 0.78]} color="#3a373a" />
    <Metal position={[0, 1.32, 0.43]} scale={[0.96, 0.72, 0.16]} color="#51494b" />
    <Metal position={[-0.62, 1.42, 0]} scale={[0.4, 0.76, 0.55]} color="#393538" rotation={[0, 0, -0.16]} />
    <Metal position={[0.62, 1.42, 0]} scale={[0.4, 0.76, 0.55]} color="#393538" rotation={[0, 0, 0.16]} />
    <Metal position={[0, 0.62, 0.24]} scale={[0.82, 0.24, 0.42]} color={shadow} />
    <Metal position={[0, 1.05, 0.53]} scale={[0.11, 0.8, 0.05]} color={accent} emissive={accent} />
  </group>;
  if (kind === 'beast') return <group>
    <Orb position={[0, 1.05, 0]} scale={[1.13, 0.82, 0.77]} color="#332f36" />
    <Orb position={[-0.55, 0.68, 0.18]} scale={[0.38, 0.66, 0.43]} color="#28262d" />
    <Orb position={[0.55, 0.68, 0.18]} scale={[0.38, 0.66, 0.43]} color="#28262d" />
    <Metal position={[0, 0.63, 0.4]} scale={[1.25, 0.19, 0.18]} color="#51464b" />
    <Ring position={[0, 1.32, -0.37]} rotation={[0.5, 0, 0]} radius={0.47} color={accent} emissive={accent} />
  </group>;
  if (kind === 'doll') return <group>
    <Pillar position={[0, 1.02, 0]} scale={[0.91, 1.06, 0.7]} color="#3a3438" />
    <Metal position={[0, 1.36, 0.4]} scale={[0.7, 0.16, 0.1]} color="#9b827b" />
    <Pillar position={[-0.62, 1.12, 0]} scale={[0.3, 0.68, 0.31]} color="#28262a" rotation={[0, 0, -0.32]} />
    <Pillar position={[0.62, 1.12, 0]} scale={[0.3, 0.68, 0.31]} color="#28262a" rotation={[0, 0, 0.32]} />
    <Orb position={[0, 0.56, 0.19]} scale={[0.23, 0.23, 0.23]} color={accent} emissive={accent} />
    <Metal position={[0, 1.02, 0.46]} scale={[0.58, 0.08, 0.05]} color={accent} />
  </group>;
  if (kind === 'machine') return <group>
    <Metal position={[0, 1.08, 0]} scale={[1.04, 1.15, 0.86]} color="#32363a" />
    <Metal position={[0, 1.28, 0.47]} scale={[0.8, 0.46, 0.12]} color="#1c2025" />
    <Pillar position={[-0.68, 1.05, 0]} scale={[0.2, 0.82, 0.23]} color="#5b5355" />
    <Pillar position={[0.68, 1.05, 0]} scale={[0.2, 0.82, 0.23]} color="#5b5355" />
    <Orb position={[0, 0.94, 0.55]} scale={[0.18, 0.18, 0.1]} color={accent} emissive={accent} />
    <Ring position={[0, 1.08, -0.46]} rotation={[Math.PI / 2, 0, 0]} radius={0.45} color={accent} emissive={accent} />
  </group>;
  if (kind === 'winged') return <group>
    <Pillar position={[0, 1.02, 0]} scale={[0.83, 1.08, 0.66]} color="#37323b" />
    <Metal position={[-0.84, 1.34, -0.14]} scale={[0.78, 0.19, 0.32]} rotation={[0, 0, -0.52]} color="#524653" />
    <Metal position={[-1.13, 1.06, -0.22]} scale={[0.56, 0.12, 0.22]} rotation={[0, 0, -0.75]} color={accent} emissive={accent} />
    <Metal position={[0.84, 1.34, -0.14]} scale={[0.78, 0.19, 0.32]} rotation={[0, 0, 0.52]} color="#524653" />
    <Metal position={[1.13, 1.06, -0.22]} scale={[0.56, 0.12, 0.22]} rotation={[0, 0, 0.75]} color={accent} emissive={accent} />
    <Ring position={[0, 1.48, -0.28]} rotation={[Math.PI / 2, 0, 0]} radius={0.46} color={accent} emissive={accent} />
  </group>;
  return <group>
    <Spike position={[0, 0.95, 0]} scale={[1.25, 1.48, 0.92]} color="#443b3a" rotation={[Math.PI, 0, 0]} />
    <Metal position={[0, 1.11, 0.44]} scale={[0.74, 0.9, 0.14]} color="#29272b" />
    <Metal position={[-0.53, 1.13, 0.26]} scale={[0.14, 0.92, 0.12]} color={accent} />
    <Metal position={[0.53, 1.13, 0.26]} scale={[0.14, 0.92, 0.12]} color={accent} />
    <Orb position={[0, 0.59, 0.47]} scale={[0.18, 0.2, 0.12]} color={accent} emissive={accent} />
  </group>;
}

function Face({ kind, accent }: { kind: string; accent: string }) {
  if (kind === 'cat') return <group>
    <Orb position={[0, 2.06, 0.08]} scale={[0.58, 0.51, 0.48]} color="#4b454a" />
    <Spike position={[-0.35, 2.48, 0]} scale={[0.27, 0.7, 0.25]} color="#4b454a" rotation={[0, 0, -0.18]} />
    <Spike position={[0.35, 2.48, 0]} scale={[0.27, 0.7, 0.25]} color="#4b454a" rotation={[0, 0, 0.18]} />
    <Orb position={[-0.2, 2.08, 0.49]} scale={[0.1, 0.1, 0.05]} color={accent} emissive={accent} />
    <Orb position={[0.2, 2.08, 0.49]} scale={[0.1, 0.1, 0.05]} color={accent} emissive={accent} />
    <Spike position={[0, 1.82, 0.45]} scale={[0.13, 0.22, 0.11]} color="#d0b2a5" rotation={[Math.PI, 0, 0]} />
  </group>;
  if (kind === 'ice') return <group>
    <Spike position={[0, 2.12, 0]} scale={[0.72, 0.98, 0.61]} color="#9bdce8" emissive={accent} />
    <Spike position={[-0.45, 2.22, -0.05]} scale={[0.25, 0.7, 0.22]} color="#d6f4f1" rotation={[0, 0, 0.22]} />
    <Spike position={[0.42, 2.24, 0.05]} scale={[0.24, 0.6, 0.21]} color="#7ac6d8" rotation={[0, 0, -0.2]} />
    <Metal position={[0, 1.95, 0.49]} scale={[0.55, 0.1, 0.05]} color="#15262f" />
  </group>;
  if (kind === 'hood') return <group>
    <Orb position={[0, 2.02, 0.02]} scale={[0.57, 0.66, 0.51]} color="#29272c" />
    <Spike position={[0, 2.26, -0.18]} scale={[0.82, 1.16, 0.72]} color="#373139" rotation={[Math.PI, 0, 0]} />
    <Metal position={[0, 2.01, 0.49]} scale={[0.62, 0.13, 0.08]} color="#15171b" />
    <Orb position={[-0.18, 2.01, 0.56]} scale={[0.06, 0.07, 0.04]} color={accent} emissive={accent} />
    <Orb position={[0.18, 2.01, 0.56]} scale={[0.06, 0.07, 0.04]} color={accent} emissive={accent} />
  </group>;
  if (kind === 'lantern') return <group>
    <Pillar position={[0, 2.06, 0]} scale={[0.57, 0.72, 0.55]} color="#352d30" />
    <Metal position={[0, 2.07, 0.31]} scale={[0.38, 0.5, 0.09]} color="#171a1d" />
    <Orb position={[0, 2.06, 0.4]} scale={[0.18, 0.2, 0.12]} color={accent} emissive={accent} />
    <Spike position={[0, 2.54, 0]} scale={[0.12, 0.28, 0.12]} color="#716264" />
    <Ring position={[0, 2.06, 0]} rotation={[Math.PI / 2, 0, 0]} radius={0.5} color="#76646a" />
  </group>;
  if (kind === 'eye') return <group>
    <Ring position={[0, 2.06, 0]} rotation={[Math.PI / 2, 0, 0]} radius={0.52} color="#586a70" />
    <Orb position={[0, 2.06, 0.08]} scale={[0.34, 0.34, 0.3]} color="#c2b5a4" />
    <Orb position={[0.02, 2.06, 0.34]} scale={[0.14, 0.16, 0.08]} color={accent} emissive={accent} />
    <Spike position={[-0.38, 2.43, -0.02]} scale={[0.18, 0.5, 0.18]} color="#41454a" />
    <Spike position={[0.38, 2.43, -0.02]} scale={[0.18, 0.5, 0.18]} color="#41454a" />
  </group>;
  if (kind === 'gear') return <group>
    <Metal position={[0, 2.06, 0]} scale={[0.72, 0.65, 0.58]} color="#4a4546" />
    <Ring position={[0, 2.06, 0.34]} rotation={[0, 0, 0]} radius={0.34} color={accent} emissive={accent} />
    <Orb position={[-0.18, 2.12, 0.38]} scale={[0.08, 0.08, 0.05]} color="#e2c5a3" />
    <Orb position={[0.18, 2.12, 0.38]} scale={[0.08, 0.08, 0.05]} color="#e2c5a3" />
    <Spike position={[0, 2.52, -0.05]} scale={[0.18, 0.48, 0.18]} color="#686064" />
    <Spike position={[-0.41, 2.4, 0]} scale={[0.13, 0.33, 0.13]} color="#686064" rotation={[0, 0, -0.48]} />
    <Spike position={[0.41, 2.4, 0]} scale={[0.13, 0.33, 0.13]} color="#686064" rotation={[0, 0, 0.48]} />
  </group>;
  if (kind === 'crown') return <group>
    <Orb position={[0, 2.04, 0.02]} scale={[0.5, 0.6, 0.44]} color="#8b776d" />
    <Metal position={[0, 2.35, 0.03]} scale={[0.78, 0.16, 0.62]} color="#b89a61" />
    {[-1, 0, 1].map(side => <Spike key={side} position={[side * 0.27, 2.65, 0]} scale={[0.16, side === 0 ? 0.55 : 0.38, 0.15]} color="#d5b56e" />)}
    <Orb position={[0, 2.04, 0.43]} scale={[0.12, 0.08, 0.04]} color={accent} emissive={accent} />
  </group>;
  if (kind === 'mask') return <group>
    <Orb position={[0, 2.04, 0]} scale={[0.5, 0.62, 0.44]} color="#c8bda8" />
    <Metal position={[0, 2.08, 0.4]} scale={[0.75, 0.2, 0.09]} color="#28252a" />
    <Orb position={[-0.18, 2.09, 0.47]} scale={[0.08, 0.06, 0.04]} color={accent} emissive={accent} />
    <Orb position={[0.18, 2.09, 0.47]} scale={[0.08, 0.06, 0.04]} color={accent} emissive={accent} />
    <Spike position={[0, 1.82, 0.43]} scale={[0.13, 0.3, 0.12]} color="#7a625e" rotation={[Math.PI, 0, 0]} />
    <Metal position={[0, 1.69, 0.39]} scale={[0.28, 0.06, 0.05]} color="#291e25" />
  </group>;
  return <group>
    <Orb position={[0, 2.02, 0]} scale={[0.52, 0.6, 0.45]} color="#b5a99b" />
    <Metal position={[0, 2.19, 0.4]} scale={[0.43, 0.14, 0.08]} color="#2b292b" />
    <Orb position={[-0.16, 2.08, 0.42]} scale={[0.05, 0.05, 0.035]} color={accent} emissive={accent} />
    <Orb position={[0.16, 2.08, 0.42]} scale={[0.05, 0.05, 0.035]} color={accent} emissive={accent} />
    <Metal position={[0, 1.9, 0.43]} scale={[0.24, 0.08, 0.05]} color="#483b39" />
  </group>;
}

function Relic({ kind, accent }: { kind: string; accent: string }) {
  const shaft = '#51484a';
  if (kind === 'shield') return <group>
    <Metal position={[-0.91, 1.08, 0.38]} scale={[0.52, 1.12, 0.18]} color="#38373c" rotation={[0, 0, -0.1]} />
    <Metal position={[-0.91, 1.08, 0.49]} scale={[0.09, 0.9, 0.04]} color={accent} />
    <Ring position={[-0.91, 1.08, 0.52]} radius={0.2} color={accent} />
  </group>;
  if (kind === 'bells') return <group>
    {[-0.72, 0.72].map((x, i) => <group key={x}>
      <Pillar position={[x, 1.33, 0.05]} scale={[0.12, 0.85, 0.12]} color={shaft} rotation={[0, 0, x * 0.3]} />
      <Orb position={[x * 1.13, 0.91, 0.1]} scale={[0.22, 0.24, 0.22]} color={i ? '#b88a54' : accent} emissive={i ? undefined : accent} />
    </group>)}
    <Metal position={[-0.55, 1.91, 0.07]} scale={[0.56, 0.05, 0.05]} color="#957c6d" rotation={[0, 0, -0.55]} />
  </group>;
  if (kind === 'shard') return <group>
    <Spike position={[0.82, 1.4, 0.05]} scale={[0.34, 1.4, 0.3]} color="#a9e3ec" emissive={accent} rotation={[0, 0, 0.2]} />
    <Spike position={[0.96, 1.88, 0.04]} scale={[0.2, 0.92, 0.2]} color="#def6ed" rotation={[0, 0, -0.3]} />
    <Ring position={[0.82, 0.77, 0.04]} rotation={[0.2, 0, 0]} radius={0.22} color={accent} />
  </group>;
  if (kind === 'lantern') return <group>
    <Pillar position={[0.94, 1.35, 0.06]} scale={[0.46, 0.58, 0.4]} color="#454044" />
    <Metal position={[0.94, 1.35, 0.29]} scale={[0.22, 0.4, 0.08]} color={accent} emissive={accent} />
    <Spike position={[0.94, 1.76, 0.06]} scale={[0.18, 0.3, 0.18]} color="#857364" />
    <Pillar position={[0.94, 1.83, 0.06]} scale={[0.08, 0.28, 0.08]} color="#8b7768" />
  </group>;
  if (kind === 'feather') return <group>
    {[-1, 0, 1].map((side, i) => <Spike key={side} position={[0.72 + side * 0.2, 1.35 + i * 0.08, -0.12]} scale={[0.15, 1.02 - i * 0.16, 0.08]} color={i === 1 ? accent : '#d6b49b'} rotation={[0, 0, 0.56 + side * 0.24]} />)}
  </group>;
  if (kind === 'scales') return <group>
    <Pillar position={[0.9, 1.29, 0.02]} scale={[0.09, 1.42, 0.09]} color="#8a775e" />
    <Metal position={[0.9, 1.94, 0.02]} scale={[1.02, 0.06, 0.06]} color="#b79d72" />
    {[-0.35, 0.35].map(side => <group key={side}>
      <Pillar position={[0.9 + side, 1.53, 0.02]} scale={[0.04, 0.65, 0.04]} color="#b79d72" />
      <Ring position={[0.9 + side, 1.2, 0.02]} rotation={[Math.PI / 2, 0, 0]} radius={0.28} color={accent} />
    </group>)}
  </group>;
  if (kind === 'flame') return <group>
    <Pillar position={[0.9, 1.17, 0]} scale={[0.3, 0.94, 0.3]} color="#574139" />
    <Spike position={[0.9, 1.91, 0]} scale={[0.42, 0.88, 0.38]} color="#dd7345" emissive={accent} />
    <Spike position={[0.9, 1.83, 0.2]} scale={[0.2, 0.52, 0.16]} color="#f1c26d" emissive={accent} rotation={[0, 0, -0.24]} />
  </group>;
  if (kind === 'telescope') return <group>
    <Pillar position={[0.9, 1.48, 0.05]} scale={[0.21, 1.4, 0.21]} color="#4a5053" rotation={[0, 0, -0.58]} />
    <Pillar position={[1.25, 1.82, 0.07]} scale={[0.28, 0.32, 0.3]} color={accent} />
    <Ring position={[1.25, 1.82, 0.23]} radius={0.17} color="#c5bb9b" />
    <Spike position={[0.58, 1.13, 0.08]} scale={[0.15, 0.66, 0.14]} color="#696164" />
  </group>;
  if (kind === 'cleaver') return <group>
    <Pillar position={[0.96, 1.08, 0.13]} scale={[0.1, 0.95, 0.1]} color="#59473d" rotation={[0, 0, -0.2]} />
    <Metal position={[0.85, 1.77, 0.08]} scale={[0.64, 0.58, 0.12]} color="#87817c" rotation={[0, 0, -0.2]} />
    <Metal position={[0.84, 1.77, 0.16]} scale={[0.11, 0.38, 0.045]} color={accent} />
    <Spike position={[1.17, 1.52, 0.08]} scale={[0.16, 0.36, 0.12]} color="#87817c" rotation={[0, 0, Math.PI / 2]} />
  </group>;
  if (kind === 'halo') return <group>
    <Ring position={[0.8, 2.44, -0.06]} rotation={[Math.PI / 2, 0, -0.24]} radius={0.48} color="#dbc077" emissive="#dbc077" />
    <Pillar position={[0.82, 1.06, 0.16]} scale={[0.23, 0.94, 0.23]} color="#c4ae7d" />
    <Metal position={[0.82, 1.52, 0.28]} scale={[0.56, 0.18, 0.08]} color={accent} />
  </group>;
  if (kind === 'ledger') return <group>
    <Metal position={[0.93, 1.16, 0.32]} scale={[0.58, 0.86, 0.22]} color="#4b353b" rotation={[0, 0, -0.12]} />
    <Metal position={[0.93, 1.16, 0.45]} scale={[0.43, 0.69, 0.04]} color="#b99e78" />
    {[-0.16, 0, 0.16].map(y => <Metal key={y} position={[0.93, 1.16 + y, 0.48]} scale={[0.26, 0.035, 0.02]} color="#45343a" />)}
  </group>;
  if (kind === 'reactor') return <group>
    <Ring position={[0.92, 1.3, 0.14]} radius={0.46} color={accent} emissive={accent} />
    <Ring position={[0.92, 1.3, 0.14]} rotation={[0, Math.PI / 2, 0]} radius={0.32} color="#b4d3df" />
    <Orb position={[0.92, 1.3, 0.16]} scale={[0.22, 0.22, 0.22]} color={accent} emissive={accent} />
    <Metal position={[0.92, 0.77, 0.14]} scale={[0.12, 0.4, 0.12]} color="#596167" />
  </group>;
  if (kind === 'dice') return <group>
    <Metal position={[0.93, 1.24, 0.16]} scale={[0.52, 0.52, 0.52]} color="#e0d0b7" rotation={[0.5, 0.3, 0.25]} />
    {[[-0.1, 1.31], [0.1, 1.31], [0, 1.2]].map(([x, y], index) => <Orb key={index} position={[0.93 + x, y, 0.43]} scale={[0.055, 0.055, 0.035]} color="#342b2d" />)}
    <Metal position={[0.95, 0.75, 0.08]} scale={[0.12, 0.58, 0.12]} color="#795744" />
  </group>;
  if (kind === 'wrench') return <group>
    <Pillar position={[0.88, 1.26, 0.12]} scale={[0.16, 1.42, 0.16]} color="#687174" rotation={[0, 0, -0.34]} />
    <Ring position={[1.02, 1.91, 0.12]} radius={0.3} color="#879394" />
    <Metal position={[0.78, 0.65, 0.12]} scale={[0.3, 0.23, 0.3]} color={accent} />
    <Orb position={[0.6, 1.59, 0.17]} scale={[0.13, 0.13, 0.13]} color="#c3b8a1" />
  </group>;
  if (kind === 'siren') return <group>
    <Pillar position={[0.9, 1.06, 0.12]} scale={[0.16, 0.55, 0.16]} color="#55515a" />
    <Orb position={[0.9, 1.58, 0.12]} scale={[0.42, 0.32, 0.38]} color={accent} emissive={accent} />
    <Ring position={[0.9, 1.58, 0.12]} radius={0.46} color="#d3b5d0" />
    <Ring position={[0.9, 1.58, 0.12]} rotation={[0, Math.PI / 2, 0]} radius={0.46} color="#d3b5d0" />
    <Spike position={[0.9, 1.98, 0.12]} scale={[0.13, 0.3, 0.13]} color="#e9d6e2" />
  </group>;
  if (kind === 'chain') return <group>
    <Ring position={[0.93, 1.5, 0.05]} rotation={[0.45, 0, 0.1]} radius={0.42} color="#80786f" />
    <Ring position={[0.98, 1.08, 0.18]} rotation={[0.5, 0.3, 0.5]} radius={0.32} color="#77716c" />
    <Pillar position={[1.1, 0.77, 0.22]} scale={[0.43, 0.4, 0.43]} color="#57504d" />
    <Spike position={[1.1, 0.49, 0.22]} scale={[0.2, 0.28, 0.2]} color={accent} rotation={[Math.PI, 0, 0]} />
  </group>;
  if (kind === 'vial') return <group>
    <Pillar position={[0.9, 1.24, 0.1]} scale={[0.35, 0.66, 0.32]} color="#3b5553" emissive={accent} />
    <Metal position={[0.9, 1.63, 0.1]} scale={[0.2, 0.16, 0.2]} color="#9c8268" />
    <Pillar position={[0.9, 1.77, 0.1]} scale={[0.13, 0.16, 0.13]} color="#826e59" />
    <Orb position={[0.9, 1.19, 0.28]} scale={[0.12, 0.18, 0.06]} color={accent} emissive={accent} />
    <Ring position={[0.9, 1.0, 0.1]} rotation={[Math.PI / 2, 0, 0]} radius={0.23} color="#b8aaa0" />
  </group>;
  if (kind === 'scepter') return <group>
    <Pillar position={[0.93, 1.18, 0.1]} scale={[0.13, 1.46, 0.13]} color="#c2a565" rotation={[0, 0, -0.16]} />
    <Ring position={[0.83, 1.97, 0.1]} radius={0.25} color="#c2a565" />
    <Orb position={[0.83, 1.97, 0.1]} scale={[0.16, 0.16, 0.16]} color={accent} emissive={accent} />
    <Spike position={[0.93, 0.39, 0.1]} scale={[0.22, 0.3, 0.22]} color="#c2a565" />
  </group>;
  if (kind === 'microphone') return <group>
    <Pillar position={[0.92, 1.17, 0.1]} scale={[0.13, 1.3, 0.13]} color="#62656c" rotation={[0, 0, -0.28]} />
    <Orb position={[0.73, 1.81, 0.1]} scale={[0.23, 0.31, 0.2]} color="#4c4a50" />
    <Ring position={[0.73, 1.81, 0.1]} radius={0.25} color={accent} emissive={accent} />
    <Metal position={[0.82, 0.5, 0.1]} scale={[0.38, 0.12, 0.34]} color="#62656c" />
  </group>;
  if (kind === 'spear') return <group>
    <Pillar position={[0.96, 1.4, 0.05]} scale={[0.1, 1.88, 0.1]} color="#574740" rotation={[0, 0, -0.13]} />
    <Spike position={[0.84, 2.39, 0.05]} scale={[0.25, 0.54, 0.22]} color="#a69b8e" rotation={[0, 0, -0.13]} />
    <Metal position={[0.96, 1.02, 0.13]} scale={[0.26, 0.18, 0.06]} color={accent} />
    <Spike position={[0.96, 0.39, 0.05]} scale={[0.16, 0.28, 0.15]} color="#807064" rotation={[Math.PI, 0, 0]} />
  </group>;
  return <group>
    <Metal position={[0.92, 1.18, 0.25]} scale={[0.66, 1.02, 0.2]} color="#69605a" />
    <Metal position={[0.92, 1.18, 0.37]} scale={[0.12, 0.8, 0.04]} color={accent} />
    <Ring position={[0.92, 1.73, 0.37]} radius={0.18} color="#c8bba7" />
    <Orb position={[0.92, 1.73, 0.37]} scale={[0.08, 0.08, 0.06]} color={accent} emissive={accent} />
    <Spike position={[0.92, 0.55, 0.25]} scale={[0.2, 0.32, 0.18]} color="#8b7e71" rotation={[Math.PI, 0, 0]} />
  </group>;
}

export function HauntedPawnModel({ characterId, selected = false }: { characterId: string; selected?: boolean }) {
  const design = HAUNTED_PAWN_DESIGNS[characterId];
  if (!design) throw new Error(`Unknown Haunted pawn character: ${characterId}`);
  return <group name={`haunted-pawn-${characterId}`}>
    <HauntedBase accent={design.accent} selected={selected} />
    <Body kind={design.body} accent={design.accent} />
    <Face kind={design.face} accent={design.accent} />
    <Relic kind={design.relic} accent={design.accent} />
    <Orb position={[0, 0.36, 0]} scale={[0.12, 0.12, 0.12]} color={design.accent} emissive={design.accent} />
  </group>;
}
