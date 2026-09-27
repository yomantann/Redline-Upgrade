import './_group.css';
import './sculpted3d.css';
import { Canvas, useThree } from '@react-three/fiber';
import { Component, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CSSProperties } from 'react';
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

type Point3 = [number, number, number];

interface ReliefPartProps {
  position: Point3;
  scale: Point3;
  color: string;
  rotation?: Point3;
  glow?: string;
}

function ReliefBlock({ position, scale, color, rotation = [0, 0, 0], glow }: ReliefPartProps) {
  return (
    <mesh position={position} scale={scale} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={color}
        metalness={0.58}
        roughness={0.3}
        emissive={glow ?? '#000000'}
        emissiveIntensity={glow ? 0.38 : 0}
      />
    </mesh>
  );
}

function ReliefOrb({ position, scale, color, glow }: Omit<ReliefPartProps, 'rotation'>) {
  return (
    <mesh position={position} scale={scale} castShadow receiveShadow>
      <sphereGeometry args={[0.5, 18, 14]} />
      <meshStandardMaterial
        color={color}
        metalness={0.32}
        roughness={0.3}
        emissive={glow ?? '#000000'}
        emissiveIntensity={glow ? 0.44 : 0}
      />
    </mesh>
  );
}

function ReliefSpike({ position, scale, color, rotation = [0, 0, 0], glow }: ReliefPartProps) {
  return (
    <mesh position={position} scale={scale} rotation={rotation} castShadow>
      <coneGeometry args={[0.5, 1, 7]} />
      <meshStandardMaterial
        color={color}
        metalness={0.38}
        roughness={0.28}
        emissive={glow ?? '#000000'}
        emissiveIntensity={glow ? 0.34 : 0}
      />
    </mesh>
  );
}

function ReliefCrystal({ position, scale, color, glow }: Omit<ReliefPartProps, 'rotation'>) {
  return (
    <mesh position={position} scale={scale} castShadow>
      <octahedronGeometry args={[0.5, 0]} />
      <meshStandardMaterial
        color={color}
        metalness={0.52}
        roughness={0.2}
        emissive={glow ?? '#000000'}
        emissiveIntensity={glow ? 0.42 : 0}
      />
    </mesh>
  );
}

function ReliefRing({ position, radius, color }: { position: Point3; radius: number; color: string }) {
  return (
    <mesh position={position}>
      <torusGeometry args={[radius, 0.035, 8, 32]} />
      <meshStandardMaterial color={color} metalness={0.48} roughness={0.2} emissive={color} emissiveIntensity={0.28} />
    </mesh>
  );
}

/**
 * Additional low-poly relief is layered over the shared pawn set to bring
 * each silhouette closer to the provided miniature sheet and character art.
 * The geometry stays inside the existing PawnModel coordinate envelope.
 */
function CharacterRelief({ characterId }: { characterId: string }) {
  switch (characterId) {
    case 'guardian_h': return <group>
      <ReliefOrb position={[-0.69, 1.6, 0.48]} scale={[0.44, 0.46, 0.28]} color="#647d93" />
      <ReliefBlock position={[-0.91, 1.23, 0.69]} scale={[0.62, 0.84, 0.14]} color="#26394b" rotation={[0, 0, 0.1]} />
      <ReliefBlock position={[-0.91, 1.23, 0.78]} scale={[0.42, 0.61, 0.045]} color="#142334" rotation={[0, 0, 0.1]} />
      <ReliefBlock position={[-0.91, 1.23, 0.81]} scale={[0.06, 0.4, 0.035]} color="#50dff4" glow="#50dff4" />
      <ReliefBlock position={[-0.91, 1.23, 0.81]} scale={[0.28, 0.06, 0.035]} color="#50dff4" glow="#50dff4" />
      <ReliefBlock position={[0, 1.34, 0.64]} scale={[0.08, 0.42, 0.04]} color="#e4eef2" />
    </group>;
    case 'click_click': return <group>
      <ReliefSpike position={[-0.5, 2.53, 0.12]} scale={[0.24, 0.63, 0.21]} rotation={[0, 0, -0.22]} color="#f16bd8" />
      <ReliefSpike position={[0.5, 2.53, 0.12]} scale={[0.24, 0.63, 0.21]} rotation={[0, 0, 0.22]} color="#f16bd8" />
      <ReliefOrb position={[0, 1.54, 0.72]} scale={[0.18, 0.22, 0.11]} color="#bd3156" glow="#ff4c93" />
      <ReliefBlock position={[-0.72, 1.5, 0.55]} scale={[0.42, 0.025, 0.03]} rotation={[0, 0, 0.16]} color="#e9f7ff" />
      <ReliefBlock position={[0.72, 1.5, 0.55]} scale={[0.42, 0.025, 0.03]} rotation={[0, 0, -0.16]} color="#e9f7ff" />
    </group>;
    case 'frostbyte': return <group>
      <ReliefCrystal position={[-0.58, 1.65, 0.18]} scale={[0.34, 0.72, 0.3]} color="#8ceeff" glow="#29cfff" />
      <ReliefCrystal position={[0.61, 1.74, 0.1]} scale={[0.33, 0.8, 0.3]} color="#c4f8ff" glow="#49dfff" />
      <ReliefCrystal position={[0, 2.76, -0.02]} scale={[0.3, 0.54, 0.25]} color="#d8fcff" glow="#7be8ff" />
      <ReliefBlock position={[0, 1.12, 0.47]} scale={[0.7, 0.13, 0.1]} color="#2b9fc3" glow="#4deaff" />
    </group>;
    case 'sadman': return <group>
      <ReliefOrb position={[-0.2, 2.25, 0.4]} scale={[0.18, 0.23, 0.15]} color="#91cf52" />
      <ReliefOrb position={[0.2, 2.25, 0.4]} scale={[0.18, 0.23, 0.15]} color="#91cf52" />
      <ReliefOrb position={[-0.2, 2.28, 0.52]} scale={[0.055, 0.07, 0.045]} color="#101923" />
      <ReliefOrb position={[0.2, 2.28, 0.52]} scale={[0.055, 0.07, 0.045]} color="#101923" />
      <ReliefBlock position={[0, 1.79, 0.5]} scale={[0.3, 0.055, 0.04]} rotation={[0, 0, Math.PI]} color="#26372e" />
      <ReliefBlock position={[0, 1.53, 0.46]} scale={[0.16, 0.42, 0.08]} color="#f3f0d3" />
    </group>;
    case 'rainbow_dash': return <group>
      <ReliefSpike position={[-0.87, 1.84, -0.26]} scale={[0.56, 0.44, 0.23]} rotation={[0, 0, 0.8]} color="#168ed0" />
      <ReliefSpike position={[0.86, 1.84, -0.26]} scale={[0.56, 0.44, 0.23]} rotation={[0, 0, -0.8]} color="#f14f9c" />
      <ReliefBlock position={[0.72, 1.28, -0.27]} scale={[0.72, 0.045, 0.055]} rotation={[0, 0, -0.18]} color="#ffb642" glow="#ff923b" />
      <ReliefBlock position={[0.79, 1.18, -0.29]} scale={[0.82, 0.04, 0.05]} rotation={[0, 0, -0.18]} color="#43def1" glow="#43def1" />
      <ReliefCrystal position={[0.2, 1.58, 0.51]} scale={[0.2, 0.35, 0.16]} color="#ffcf4c" glow="#ff7f34" />
    </group>;
    case 'accuser': return <group>
      <ReliefSpike position={[-0.22, 2.42, 0.05]} scale={[0.26, 0.6, 0.22]} rotation={[0, 0, -0.5]} color="#d62950" />
      <ReliefSpike position={[0.12, 2.45, 0.05]} scale={[0.28, 0.65, 0.22]} rotation={[0, 0, 0.4]} color="#ff4968" />
      <ReliefOrb position={[-0.57, 1.57, 0.49]} scale={[0.23, 0.34, 0.18]} color="#b6203d" />
      <ReliefBlock position={[0.71, 1.11, 0.44]} scale={[0.14, 0.66, 0.11]} rotation={[0, 0, -0.2]} color="#a8b5c3" />
      <ReliefCrystal position={[0.71, 1.48, 0.44]} scale={[0.18, 0.22, 0.13]} color="#ff5877" glow="#ff425d" />
    </group>;
    case 'low_flame': return <group>
      <ReliefSpike position={[-0.72, 1.47, 0.05]} scale={[0.54, 1.2, 0.4]} rotation={[0, 0, -0.42]} color="#f44b22" glow="#ff6327" />
      <ReliefSpike position={[0.63, 1.55, -0.05]} scale={[0.48, 1.1, 0.38]} rotation={[0, 0, 0.38]} color="#ffac34" glow="#ff7724" />
      <ReliefSpike position={[0.06, 2.39, 0.11]} scale={[0.33, 0.82, 0.27]} rotation={[0, 0, 0.13]} color="#ffd353" glow="#ff8c28" />
      <ReliefOrb position={[-0.13, 1.66, 0.69]} scale={[0.08, 0.07, 0.04]} color="#fff4ad" glow="#ffb33c" />
      <ReliefOrb position={[0.16, 1.66, 0.69]} scale={[0.08, 0.07, 0.04]} color="#fff4ad" glow="#ffb33c" />
    </group>;
    case 'wandering_eye': return <group>
      <ReliefRing position={[0, 1.84, 0.7]} radius={0.58} color="#f04bdd" />
      <ReliefOrb position={[0, 1.84, 0.77]} scale={[0.3, 0.38, 0.1]} color="#f2e9f5" />
      <ReliefOrb position={[0.02, 1.84, 0.85]} scale={[0.16, 0.23, 0.065]} color="#db38cf" glow="#cb2fe8" />
      <ReliefSpike position={[-0.92, 1.23, 0.04]} scale={[0.24, 0.73, 0.19]} rotation={[0, 0, -0.65]} color="#a847ca" />
      <ReliefSpike position={[0.91, 1.24, 0.04]} scale={[0.24, 0.73, 0.19]} rotation={[0, 0, 0.65]} color="#a847ca" />
    </group>;
    case 'the_rind': return <group>
      <ReliefOrb position={[-0.55, 1.77, 0.39]} scale={[0.34, 0.38, 0.24]} color="#ba9b35" />
      <ReliefOrb position={[0.56, 1.77, 0.39]} scale={[0.34, 0.38, 0.24]} color="#9d822d" />
      <ReliefBlock position={[0, 2.24, 0.45]} scale={[0.52, 0.07, 0.07]} color="#191e24" />
      <ReliefBlock position={[0, 2.24, 0.5]} scale={[0.34, 0.035, 0.035]} color="#ffca42" glow="#ffb528" />
      <ReliefBlock position={[0.93, 1.62, 0.49]} scale={[0.38, 0.09, 0.11]} color="#141d26" />
      <ReliefCrystal position={[0.96, 1.75, 0.49]} scale={[0.15, 0.18, 0.14]} color="#d8a936" />
    </group>;
    case 'anointed': return <group>
      <ReliefRing position={[0, 2.9, -0.04]} radius={0.58} color="#ffd45a" />
      <ReliefBlock position={[-0.78, 1.78, -0.32]} scale={[0.64, 0.13, 0.22]} rotation={[0, 0, -0.45]} color="#e8d6a7" />
      <ReliefBlock position={[0.78, 1.78, -0.32]} scale={[0.64, 0.13, 0.22]} rotation={[0, 0, 0.45]} color="#e8d6a7" />
      <ReliefCrystal position={[0, 1.46, 0.51]} scale={[0.22, 0.3, 0.13]} color="#ffe092" glow="#ffcb4a" />
      <ReliefBlock position={[-0.42, 1.32, 0.5]} scale={[0.06, 0.5, 0.05]} rotation={[0, 0, -0.18]} color="#e8d6a7" />
      <ReliefBlock position={[0.42, 1.32, 0.5]} scale={[0.06, 0.5, 0.05]} rotation={[0, 0, 0.18]} color="#e8d6a7" />
    </group>;
    case 'executive_p': return <group>
      <ReliefBlock position={[0, 2.06, 0.48]} scale={[0.63, 0.52, 0.045]} color="#070d16" />
      <ReliefBlock position={[0, 2.24, 0.52]} scale={[0.36, 0.05, 0.035]} rotation={[0, 0, -0.28]} color="#fa405d" glow="#fa405d" />
      <ReliefBlock position={[0.02, 2.11, 0.52]} scale={[0.47, 0.035, 0.03]} rotation={[0, 0, 0.1]} color="#ff7285" glow="#ff405a" />
      <ReliefBlock position={[0, 1.4, 0.51]} scale={[0.11, 0.44, 0.075]} color="#d62e49" />
      <ReliefBlock position={[-0.4, 1.77, 0.47]} scale={[0.25, 0.11, 0.07]} rotation={[0, 0, -0.62]} color="#aab8c2" />
      <ReliefBlock position={[0.4, 1.77, 0.47]} scale={[0.25, 0.11, 0.07]} rotation={[0, 0, 0.62]} color="#aab8c2" />
    </group>;
    case 'alpha_prime': return <group>
      <ReliefOrb position={[-0.78, 1.6, 0.13]} scale={[0.48, 0.56, 0.42]} color="#67427a" />
      <ReliefOrb position={[0.78, 1.6, 0.13]} scale={[0.48, 0.56, 0.42]} color="#67427a" />
      <ReliefBlock position={[0, 1.49, 0.54]} scale={[0.88, 0.43, 0.17]} color="#493250" rotation={[0, 0, -0.04]} />
      <ReliefOrb position={[-0.22, 2.09, 0.54]} scale={[0.09, 0.07, 0.045]} color="#ffd078" glow="#ffb454" />
      <ReliefOrb position={[0.22, 2.09, 0.54]} scale={[0.09, 0.07, 0.045]} color="#ffd078" glow="#ffb454" />
      <ReliefBlock position={[0, 1.2, 0.62]} scale={[0.12, 0.35, 0.065]} color="#ee58d7" glow="#ee58d7" />
    </group>;
    case 'roll_safe': return <group>
      <ReliefBlock position={[0, 1.25, 0.7]} scale={[1.12, 1.08, 0.1]} color="#34495f" />
      <ReliefBlock position={[0, 1.25, 0.77]} scale={[0.98, 0.93, 0.035]} color="#111c2a" />
      <ReliefRing position={[0, 1.25, 0.82]} radius={0.3} color="#fa5adb" />
      <ReliefOrb position={[0, 1.25, 0.86]} scale={[0.11, 0.11, 0.06]} color="#07101b" />
      <ReliefOrb position={[-0.36, 2.3, 0.26]} scale={[0.36, 0.4, 0.31]} color="#ce43bf" glow="#a92cc3" />
      <ReliefOrb position={[0.35, 2.3, 0.26]} scale={[0.36, 0.4, 0.31]} color="#e968d5" glow="#a92cc3" />
    </group>;
    case 'hotwired': return <group>
      <ReliefOrb position={[-0.54, 2.37, 0.1]} scale={[0.12, 0.12, 0.1]} color="#ff5162" glow="#ff3c52" />
      <ReliefOrb position={[0.54, 2.37, 0.1]} scale={[0.12, 0.12, 0.1]} color="#4bdff2" glow="#4bdff2" />
      <ReliefBlock position={[-0.61, 1.36, 0.44]} scale={[0.13, 0.6, 0.12]} rotation={[0, 0, -0.2]} color="#d22f4d" />
      <ReliefBlock position={[0.61, 1.36, 0.44]} scale={[0.13, 0.6, 0.12]} rotation={[0, 0, 0.2]} color="#2ebad5" />
      <ReliefSpike position={[-0.31, 2.42, -0.12]} scale={[0.16, 0.46, 0.14]} rotation={[0, 0, -0.27]} color="#859aa9" />
      <ReliefSpike position={[0.31, 2.42, -0.12]} scale={[0.16, 0.46, 0.14]} rotation={[0, 0, 0.27]} color="#859aa9" />
    </group>;
    case 'panic_bot': return <group>
      <ReliefBlock position={[0, 1.95, 0.4]} scale={[0.57, 0.13, 0.08]} color="#1a2937" />
      <ReliefOrb position={[0, 2.33, 0.05]} scale={[0.18, 0.19, 0.18]} color="#ff405e" glow="#ff3156" />
      <ReliefBlock position={[0, 1.29, 0.47]} scale={[0.42, 0.36, 0.1]} color="#171e27" />
      <ReliefRing position={[0, 1.29, 0.54]} radius={0.2} color="#ff455f" />
      <ReliefBlock position={[-0.48, 1.37, 0.3]} scale={[0.15, 0.58, 0.15]} rotation={[0, 0, -0.28]} color="#8d9daa" />
      <ReliefBlock position={[0.48, 1.37, 0.3]} scale={[0.15, 0.58, 0.15]} rotation={[0, 0, 0.28]} color="#8d9daa" />
    </group>;
    case 'primate': return <group>
      <ReliefOrb position={[-0.79, 1.16, 0.12]} scale={[0.38, 0.55, 0.35]} color="#5b3c68" />
      <ReliefOrb position={[0.79, 1.16, 0.12]} scale={[0.38, 0.55, 0.35]} color="#5b3c68" />
      <ReliefOrb position={[-0.79, 0.58, 0.46]} scale={[0.3, 0.22, 0.24]} color="#322939" />
      <ReliefOrb position={[0.79, 0.58, 0.46]} scale={[0.3, 0.22, 0.24]} color="#322939" />
      <ReliefBlock position={[0, 1.49, 0.54]} scale={[0.85, 0.44, 0.14]} color="#403344" />
      <ReliefBlock position={[0, 1.34, 0.62]} scale={[0.11, 0.4, 0.04]} color="#45e0ef" glow="#45e0ef" />
    </group>;
    case 'pain_hider': return <group>
      <ReliefSpike position={[0, 2.28, -0.04]} scale={[1.1, 0.83, 0.6]} color="#211c2c" />
      <ReliefBlock position={[0, 1.96, 0.5]} scale={[0.44, 0.38, 0.1]} color="#090d15" />
      <ReliefBlock position={[0, 2.04, 0.56]} scale={[0.34, 0.055, 0.04]} color="#8a5eaa" glow="#6d3c92" />
      <ReliefOrb position={[-0.14, 2.05, 0.59]} scale={[0.04, 0.04, 0.025]} color="#f047d4" glow="#f047d4" />
      <ReliefOrb position={[0.14, 2.05, 0.59]} scale={[0.04, 0.04, 0.025]} color="#f047d4" glow="#f047d4" />
      <ReliefBlock position={[-0.68, 1.32, -0.12]} scale={[0.14, 0.92, 0.16]} rotation={[0, 0, -0.16]} color="#30243c" />
      <ReliefBlock position={[0.68, 1.32, -0.12]} scale={[0.14, 0.92, 0.16]} rotation={[0, 0, 0.16]} color="#30243c" />
    </group>;
    case 'prom_king': return <group>
      <ReliefSpike position={[-0.27, 2.57, 0.04]} scale={[0.2, 0.47, 0.16]} rotation={[0, 0, -0.13]} color="#edc341" />
      <ReliefSpike position={[0, 2.68, 0.04]} scale={[0.2, 0.63, 0.16]} color="#f7d758" />
      <ReliefSpike position={[0.27, 2.57, 0.04]} scale={[0.2, 0.47, 0.16]} rotation={[0, 0, 0.13]} color="#edc341" />
      <ReliefRing position={[0, 2.48, 0.05]} radius={0.42} color="#ffd754" />
      <ReliefBlock position={[0, 1.5, 0.53]} scale={[0.16, 0.54, 0.07]} color="#e6d9c8" />
      <ReliefBlock position={[0.68, 1.15, 0.35]} scale={[0.08, 1.25, 0.08]} color="#94723d" />
      <ReliefCrystal position={[0.68, 1.87, 0.35]} scale={[0.21, 0.27, 0.18]} color="#f4d35a" glow="#fa8747" />
    </group>;
    case 'idol_core': return <group>
      <ReliefRing position={[0, 2.68, -0.05]} radius={0.52} color="#f06bd8" />
      <ReliefCrystal position={[0, 1.78, 0.54]} scale={[0.4, 0.46, 0.2]} color="#ff4fca" glow="#f62dbd" />
      <ReliefBlock position={[-0.77, 1.61, -0.28]} scale={[0.68, 0.13, 0.18]} rotation={[0, 0, -0.48]} color="#dfeee7" />
      <ReliefBlock position={[0.77, 1.61, -0.28]} scale={[0.68, 0.13, 0.18]} rotation={[0, 0, 0.48]} color="#dfeee7" />
      <ReliefSpike position={[-0.71, 1.37, 0.16]} scale={[0.16, 0.58, 0.13]} rotation={[0, 0, -0.7]} color="#ec78de" />
      <ReliefSpike position={[0.71, 1.37, 0.16]} scale={[0.16, 0.58, 0.13]} rotation={[0, 0, 0.7]} color="#ec78de" />
    </group>;
    case 'danger_zone': return <group>
      <ReliefSpike position={[0.84, 2.06, 0.2]} scale={[0.4, 0.78, 0.1]} color="#ffae3e" />
      <ReliefBlock position={[0.84, 1.99, 0.28]} scale={[0.08, 0.3, 0.035]} color="#17212b" />
      <ReliefOrb position={[0.84, 1.76, 0.29]} scale={[0.05, 0.05, 0.035]} color="#17212b" />
      <ReliefBlock position={[0, 1.36, 0.51]} scale={[0.58, 0.49, 0.1]} color="#222a30" />
      <ReliefBlock position={[-0.24, 1.33, 0.58]} scale={[0.16, 0.49, 0.035]} rotation={[0, 0, 0.55]} color="#ffad34" />
      <ReliefBlock position={[0.24, 1.33, 0.58]} scale={[0.16, 0.49, 0.035]} rotation={[0, 0, 0.55]} color="#ffad34" />
    </group>;
    case 'the_tank': return <group>
      <ReliefBlock position={[-0.72, 0.56, 0.08]} scale={[0.44, 0.42, 0.66]} color="#303a43" />
      <ReliefBlock position={[0.72, 0.56, 0.08]} scale={[0.44, 0.42, 0.66]} color="#303a43" />
      <ReliefRing position={[-0.72, 0.56, 0.43]} radius={0.16} color="#6d7d88" />
      <ReliefRing position={[0.72, 0.56, 0.43]} radius={0.16} color="#6d7d88" />
      <ReliefBlock position={[0, 1.56, 0.59]} scale={[0.46, 0.26, 0.28]} color="#6e7c84" />
      <ReliefBlock position={[0.11, 1.61, 0.78]} scale={[0.12, 0.12, 0.76]} color="#8796a0" />
    </group>;
    default: return null;
  }
}

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
  const pawnScale = Math.min(0.57, (cellHeight - 0.35) / 2.9);

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
          <CharacterRelief characterId={id} />
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

function CharacterStudyFallback({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <main className="sculpted3d">
      <header className="sculpted3d__header">
        <div className="sculpted3d__brand">Redline Upgrade <span>//</span> Character-led sculpts</div>
        <div className="sculpted3d__edition">21 reference-led pieces</div>
      </header>
      <div className="sculpted3d__scroll">
        <section className="sculpted3d__sheet sculpted3d__sheet--portraits" aria-label="Character reference miniatures">
          <div className="sculpted3d__grid sculpted3d__grid--portraits">
            {pawnCatalog.map(([id, name], index) => (
              <button
                className="sculpted3d__tile"
                key={id}
                type="button"
                aria-label={`${name} character miniature${selectedId === id ? ', selected' : ''}`}
                aria-pressed={selectedId === id}
                onClick={() => onSelect(id)}
                style={{ '--piece-rim': rimLights[id] } as CSSProperties}
              >
                <span className="sculpted3d__stage sculpted3d__portrait-stage">
                  <span className="sculpted3d__index">{String(index + 1).padStart(2, '0')}</span>
                  <img
                    className="sculpted3d__portrait"
                    src={`/__mockup/images/sculpted3d-${id}.png`}
                    alt=""
                    loading="lazy"
                    onError={(event) => { event.currentTarget.hidden = true; }}
                  />
                  <span className="sculpted3d__pedestal" aria-hidden="true"><span /></span>
                </span>
                <span className="sculpted3d__name">{name}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
      <footer className="sculpted3d__footer">
        <span>Character art study <b>·</b> Edition 01</span>
        <span>Display archive <b>—</b> 7 × 3 <b>·</b> Select a piece to inspect</span>
      </footer>
    </main>
  );
}

interface BoundaryState {
  failed: boolean;
}

class WebGLBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

export function Sculpted3D() {
  const [webgl] = useState(supportsWebGL);
  const [canvasFailed, setCanvasFailed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const pawns = pawnCatalog;
  const handleCanvasFailure = useCallback(() => setCanvasFailed(true), []);

  if (!webgl || canvasFailed) {
    return (
      <CharacterStudyFallback
        selectedId={selectedId}
        onSelect={(id) => setSelectedId((current) => current === id ? null : id)}
      />
    );
  }

  return (
    <WebGLBoundary
      fallback={(
        <CharacterStudyFallback
          selectedId={selectedId}
          onSelect={(id) => setSelectedId((current) => current === id ? null : id)}
        />
      )}
    >
      <main className="sculpted3d">
      <header className="sculpted3d__header">
        <div className="sculpted3d__brand">Redline Upgrade <span>//</span> Character-led sculpts</div>
        <div className="sculpted3d__edition">21 reference-led pieces</div>
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
        <span>Silhouette study <b>·</b> Edition 01</span>
        <span>Display archive <b>—</b> 7 × 3 <b>·</b> Select a piece to inspect</span>
      </footer>
      </main>
    </WebGLBoundary>
  );
}

export default Sculpted3D;