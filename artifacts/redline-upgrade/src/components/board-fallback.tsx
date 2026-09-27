import { BOARD_SPACES } from '../game/board-data';
import type { MatchPlayer } from '../game/match';
import { ROUTE, ZONE_ANCHORS } from './board-scene';

type P = { x: number; y: number };
function project(x: number, z: number, height = 0): P {
  return { x: 600 + x * 19 + z * 6, y: 380 + z * 15 - x * 4 - height * 19 };
}
function points(corners: [number, number, number][]): string {
  return corners.map(([x, z, y]) => {
    const p = project(x, z, y);
    return `${p.x},${p.y}`;
  }).join(' ');
}
function platform(x: number, z: number, halfX: number, halfZ: number, y: number) {
  const top: [number, number, number][] = [[x-halfX,z-halfZ,y],[x+halfX,z-halfZ,y],[x+halfX,z+halfZ,y],[x-halfX,z+halfZ,y]];
  const front: [number, number, number][] = [[x-halfX,z+halfZ,y],[x+halfX,z+halfZ,y],[x+halfX,z+halfZ,y-.28],[x-halfX,z+halfZ,y-.28]];
  const right: [number, number, number][] = [[x+halfX,z-halfZ,y],[x+halfX,z+halfZ,y],[x+halfX,z+halfZ,y-.28],[x+halfX,z-halfZ,y-.28]];
  return { top: points(top), front: points(front), right: points(right) };
}
const zoneNames = ['THE GRIND', 'THE RISE', 'THE FLEX', 'THE CHAOS', 'THE ENDGAME'];
const playerColors = ['#d4e981', '#72c4b9', '#f9a66d', '#e9a5b6'];

/** Same 76 route coordinates as WebGL, projected into an isometric, physical-looking diagram. */
export function BoardFallback({ players, activePlayerId, zoom = 1, pan = { x: 0, z: 0 } }: { players: MatchPlayer[]; activePlayerId: string; zoom?: number; pan?: { x: number; z: number } }) {
  const boardTop = points([[-23.8,-15.7,.07],[23.8,-15.7,.07],[23.8,15.7,.07],[-23.8,15.7,.07]]);
  const boardFront = points([[-23.8,15.7,.07],[23.8,15.7,.07],[23.8,15.7,-1],[-23.8,15.7,-1]]);
  const boardRight = points([[23.8,-15.7,.07],[23.8,15.7,.07],[23.8,15.7,-1],[23.8,-15.7,-1]]);
  const start = platform(ROUTE[0].x, ROUTE[0].z, 1.55, 1.58, .78);
  const finish = ROUTE[75];
  return <div className="ru-board__static" data-testid="board-static-fallback">
    <div className="ru-board__static-heading"><span>WEBGL2 UNAVAILABLE / CIRCUIT MAP ACTIVE</span><strong>The circuit remains live.</strong><p>This device cannot draw the 3D tabletop. The physical route, turns, and every runner are shown below.</p></div>
    <svg className="ru-board__static-svg" viewBox={`${600 - 600 / zoom + pan.x * 19 + pan.z * 6} ${380 - 380 / zoom + pan.z * 15 - pan.x * 4} ${1200 / zoom} ${760 / zoom}`} role="img" aria-label="Isometric Redline circuit with all 75 raised spaces and live player positions">
      <defs>
        <pattern id="ru-circuit-grain" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M0 0h12M0 0v12" fill="none" stroke="#a8c69a" strokeOpacity=".07" /></pattern>
        <filter id="ru-board-shadow" x="-30%" y="-30%" width="160%" height="180%"><feGaussianBlur stdDeviation="13" /></filter>
      </defs>
      <ellipse cx="600" cy="573" rx="510" ry="138" fill="#020b08" opacity=".65" filter="url(#ru-board-shadow)" />
      <polygon points={boardRight} fill="#07120f" stroke="#57695a" strokeWidth="2" />
      <polygon points={boardFront} fill="#0b1814" stroke="#4c6452" strokeWidth="2" />
      <polygon points={boardTop} fill="#192b23" stroke="#788f77" strokeWidth="4" />
      <polygon points={boardTop} fill="url(#ru-circuit-grain)" />
      <polyline points={ROUTE.map(p => { const q = project(p.x,p.z,.36); return `${q.x},${q.y}`; }).join(' ')} fill="none" stroke="#091915" strokeWidth="39" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={ROUTE.map(p => { const q = project(p.x,p.z,.42); return `${q.x},${q.y}`; }).join(' ')} fill="none" stroke="#43644d" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={ROUTE.map(p => { const q = project(p.x,p.z,.45); return `${q.x},${q.y}`; }).join(' ')} fill="none" stroke="#d4e981" strokeOpacity=".62" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {zoneNames.map((zone, i) => {
        const p = project(ZONE_ANCHORS[i].x, ZONE_ANCHORS[i].z, .2);
        return <g key={zone}><rect x={p.x-58} y={p.y-12} width="116" height="22" fill="#0c1b16" stroke="#839f7e" strokeWidth="1" />
          <text x={p.x} y={p.y+3} textAnchor="middle" fill="#d4e981" fontFamily="Space Mono, monospace" fontSize="10" fontWeight="700">{`0${i+1} / ${zone}`}</text>
        </g>;
      })}
      {(() => { const p = project(0, 0, .2); return <g>
        <circle cx={p.x} cy={p.y} r="31" fill="#14261f" stroke="#f96346" strokeWidth="2" />
        <circle cx={p.x} cy={p.y} r="25" fill="none" stroke="#d4e981" strokeOpacity=".5" />
        <text x={p.x} y={p.y-1} textAnchor="middle" fill="#f96346" fontFamily="Barlow Condensed, sans-serif" fontSize="14" fontWeight="900">REDLINE</text>
        <text x={p.x} y={p.y+11} textAnchor="middle" fill="#e9e7dc" fontFamily="Space Mono, monospace" fontSize="6">UPGRADE / 01</text>
      </g>; })()}
      <polygon points={start.front} fill="#426046" /><polygon points={start.right} fill="#1a3427" /><polygon points={start.top} fill="#547454" stroke="#d4e981" strokeWidth="3" />
      {(() => { const p = project(ROUTE[0].x,ROUTE[0].z,.81); return <g><text x={p.x} y={p.y+4} textAnchor="middle" fill="#f0f0d6" fontFamily="Barlow Condensed, sans-serif" fontWeight="900" fontSize="19">START</text><text x={p.x} y={p.y+17} textAnchor="middle" fill="#d4e981" fontFamily="Space Mono, monospace" fontSize="8">00 / LAUNCH PAD</text></g>; })()}
      {BOARD_SPACES.map(space => {
        const { x, z } = ROUTE[space.number];
        const milestone = space.type === 'MILESTONE';
        const y = milestone ? .86 : .7;
        const block = platform(x,z,milestone ? 1.29 : 1.09,milestone ? 1.2 : .98,y);
        const color = space.type === 'MILESTONE' ? '#794337' : space.payday ? '#577455' : space.type === 'GAMBLE' ? '#67503b' : space.type === 'EVENT' ? '#566b48' : '#345147';
        const accent = space.type === 'MILESTONE' ? '#f96346' : space.payday ? '#d4e981' : space.type === 'GAMBLE' ? '#e8a367' : space.type === 'EVENT' ? '#d4e981' : '#90aea0';
        const center = project(x,z,y+.02);
        return <g key={space.number}>
          <title>{`Space ${space.number}, ${space.payday ? 'Payday, ' : ''}${space.type.toLowerCase()}`}</title>
          <polygon points={block.right} fill="#101e19" stroke={accent} strokeOpacity=".65" strokeWidth="1" />
          <polygon points={block.front} fill="#13241e" stroke={accent} strokeOpacity=".65" strokeWidth="1" />
          <polygon points={block.top} fill={color} stroke={accent} strokeWidth={milestone ? 2.5 : 1.2} />
          <text x={center.x} y={center.y+5} textAnchor="middle" fill="#f2f0df" fontFamily="Barlow Condensed, sans-serif" fontSize={milestone ? 20 : 17} fontWeight="900">{String(space.number).padStart(2,'0')}</text>
          {space.payday ? <text x={center.x+14} y={center.y-6} textAnchor="middle" fill="#d4e981" fontSize="15" fontWeight="900">$</text> : space.type !== 'NORMAL' && <circle cx={center.x+14} cy={center.y-8} r="2.8" fill={accent} />}
        </g>;
      })}
      {(() => { const p = project(finish.x,finish.z,1.6); return <g><path d={`M${p.x-24} ${p.y+40}v-55h48v55`} fill="none" stroke="#f96346" strokeWidth="5" /><rect x={p.x-19} y={p.y-42} width="101" height="24" fill="#f96346" /><text x={p.x+31} y={p.y-25} textAnchor="middle" fill="#18241d" fontFamily="Barlow Condensed, sans-serif" fontSize="18" fontWeight="900">FINISH / CASHOUT</text></g>; })()}
      {players.map((player) => {
        const colocated = players.filter(p => p.position === player.position).sort((a,b) => a.slot-b.slot);
        const index = colocated.findIndex(p => p.playerId === player.playerId);
        const pos = ROUTE[Math.max(0,Math.min(75,player.position))];
        const x = pos.x + (colocated.length > 1 ? (index%2 ? .43 : -.43) : 0);
        const z = pos.z + (colocated.length > 1 ? (index<2 ? -.43 : .43) : 0);
        const p = project(x,z,player.position === 0 ? 1.07 : 1.1);
        return <g key={player.playerId}><title>{`${player.displayName} at ${player.position === 0 ? 'start' : `space ${player.position}`}`}</title>
          <ellipse cx={p.x+2} cy={p.y+10} rx="12" ry="5" fill="#050d0b" opacity=".7" />
          <path d={`M${p.x-10} ${p.y+7}l3-24 7-7 7 7 3 24z`} fill={playerColors[player.slot%4]} stroke={player.playerId === activePlayerId ? '#fff4d7' : '#14221b'} strokeWidth={player.playerId === activePlayerId ? 3 : 2} />
          <circle cx={p.x} cy={p.y-17} r="5" fill="#17241f" /><text x={p.x} y={p.y-14} textAnchor="middle" fill="#e9e7dc" fontFamily="Space Mono, monospace" fontSize="7" fontWeight="700">{player.slot+1}</text>
        </g>;
      })}
    </svg>
    <div className="ru-board__static-key"><span><i /> NORMAL</span><span><i /> EVENT</span><span><i /> GAMBLE</span><span><i /> MILESTONE</span><span><i /> PAYDAY $</span></div>
  </div>;
}