import { BOARD_SPACES } from '../game/board-data';
import { ICON_PATHS } from '../game/icon-paths';
import type { MatchPlayer } from '../game/match';
import { PHASE_FLAG_FOOTPRINT, ROUTE, SPACE_TILE_FOOTPRINT, START_PAD_FOOTPRINT, TABLETOP_BUILDINGS, TABLETOP_DRESSING, TABLETOP_STRUCTURES, ZONE_ANCHORS } from './board-scene';
import { getSpaceVisual } from './board-space-visuals';

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
export function BoardFallback({ players, activePlayerId, finishOrder = [], landingPosition = null, overview = false, zoom = 1, pan = { x: 0, z: 0 }, onSpaceSelect, onSpaceHover }: { players: MatchPlayer[]; activePlayerId: string; finishOrder?: number[]; landingPosition?: number | null; overview?: boolean; zoom?: number; pan?: { x: number; z: number }; onSpaceSelect?: (n: number) => void; onSpaceHover?: (n: number | null) => void }) {
  const activePosition = Math.max(0, Math.min(75, players.find(player => player.playerId === activePlayerId)?.position ?? 0));
  const focus = project(ROUTE[activePosition].x, ROUTE[activePosition].z, .45);
  const cameraZoom = zoom * (overview ? 1 : 2);
  const centerX = overview ? 600 : focus.x;
  const centerY = overview ? 380 : focus.y;
  const boardTop = points([[-23.8,-15.7,.07],[23.8,-15.7,.07],[23.8,15.7,.07],[-23.8,15.7,.07]]);
  const boardFront = points([[-23.8,15.7,.07],[23.8,15.7,.07],[23.8,15.7,-1],[-23.8,15.7,-1]]);
  const boardRight = points([[23.8,-15.7,.07],[23.8,15.7,.07],[23.8,15.7,-1],[23.8,-15.7,-1]]);
  const start = platform(ROUTE[0].x, ROUTE[0].z, START_PAD_FOOTPRINT.width / 2, START_PAD_FOOTPRINT.depth / 2, .78);
  const finish = ROUTE[75];
  return <div className="ru-board__static" data-testid="board-static-fallback">
    <div className="ru-board__static-heading"><span>WEBGL2 UNAVAILABLE / CIRCUIT MAP ACTIVE</span><strong>The circuit remains live.</strong><p>This device cannot draw the 3D tabletop. The physical route, turns, and every runner are shown below.</p></div>
    <svg className="ru-board__static-svg" viewBox={`${centerX - 600 / cameraZoom + pan.x * 19 + pan.z * 6} ${centerY - 380 / cameraZoom + pan.z * 15 - pan.x * 4} ${1200 / cameraZoom} ${760 / cameraZoom}`} role="img" aria-label="Isometric Redline circuit with all 75 raised spaces and live player positions">
      <defs>
        <pattern id="ru-circuit-grain" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M0 0h12M0 0v12" fill="none" stroke="#a8c69a" strokeOpacity=".07" /></pattern>
        <filter id="ru-board-shadow" x="-30%" y="-30%" width="160%" height="180%"><feGaussianBlur stdDeviation="13" /></filter>
      </defs>
      <ellipse cx="600" cy="573" rx="510" ry="138" fill="#020b08" opacity=".65" filter="url(#ru-board-shadow)" />
      <polygon points={boardRight} fill="#07120f" stroke="#57695a" strokeWidth="2" />
      <polygon points={boardFront} fill="#0b1814" stroke="#4c6452" strokeWidth="2" />
      <polygon points={boardTop} fill="#192b23" stroke="#788f77" strokeWidth="4" />
      <polygon points={boardTop} fill="url(#ru-circuit-grain)" />
      <polyline points={[[-23.03,-15.03],[23.03,-15.03],[23.03,15.03],[-23.03,15.03],[-23.03,-15.03]].map(([x,z]) => { const p = project(x,z,.13); return `${p.x},${p.y}`; }).join(' ')} fill="none" stroke="#08120f" strokeWidth="18" strokeLinejoin="round" />
      <polyline points={[[-23.03,-15.03],[23.03,-15.03],[23.03,15.03],[-23.03,15.03],[-23.03,-15.03]].map(([x,z]) => { const p = project(x,z,.15); return `${p.x},${p.y}`; }).join(' ')} fill="none" stroke="#293c31" strokeWidth="10" strokeLinejoin="round" />
      {Array.from({ length: 16 }, (_, i) => {
        const t = (i + 1) / 17;
        const marks = [
          [(-23.03 + t * 46.06), -15.03, (-23.03 + t * 46.06) + 0.32, -15.03],
          [(-23.03 + t * 46.06), 15.03, (-23.03 + t * 46.06) + 0.32, 15.03],
          [-23.03, (-15.03 + t * 30.06), -23.03, (-15.03 + t * 30.06) + 0.32],
          [23.03, (-15.03 + t * 30.06), 23.03, (-15.03 + t * 30.06) + 0.32],
        ];
        return marks.map(([x1,z1,x2,z2], markIndex) => {
          const a = project(x1,z1,.17);
          const b = project(x2,z2,.17);
          return <line key={`perimeter-lane-${i}-${markIndex}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#b9c98f" strokeWidth="2" strokeLinecap="round" opacity=".74" />;
        });
      })}
      <polyline points={ROUTE.map(p => { const q = project(p.x,p.z,.36); return `${q.x},${q.y}`; }).join(' ')} fill="none" stroke="#091915" strokeWidth="39" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={ROUTE.map(p => { const q = project(p.x,p.z,.42); return `${q.x},${q.y}`; }).join(' ')} fill="none" stroke="#43644d" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={ROUTE.map(p => { const q = project(p.x,p.z,.45); return `${q.x},${q.y}`; }).join(' ')} fill="none" stroke="#d4e981" strokeOpacity=".62" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {ZONE_ANCHORS.map((anchor, i) => {
        const center = project(anchor.x, anchor.z, .19);
        const colors = ['#687553', '#526e5f', '#3e7772', '#866845', '#8e4b40'];
        const texture = i === 0 ? 'url(#ru-circuit-grain)' : undefined;
        return <g key={`zone-inlay-${i}`} aria-hidden="true">
          <rect x={center.x - 42} y={center.y - 12} width="84" height="24" fill={colors[i]} fillOpacity=".48" stroke={colors[i]} strokeWidth="1.2" />
          <path d={`M${center.x - 34} ${center.y - 5}h68M${center.x - 34} ${center.y + 5}h68`} stroke={i === 2 ? '#a2d4cc' : '#d4e981'} strokeOpacity=".4" strokeWidth="1" />
          {texture && <rect x={center.x - 42} y={center.y - 12} width="84" height="24" fill={texture} />}
        </g>;
      })}
      {(() => { const p = project(0, 0, .2); return <g>
        <circle cx={p.x} cy={p.y} r="49" fill="#14261f" stroke="#536557" strokeWidth="2" />
        <circle cx={p.x} cy={p.y} r="42" fill="none" stroke="#395248" strokeWidth="2" />
        <circle cx={p.x} cy={p.y} r="28" fill="none" stroke="#d4e981" strokeOpacity=".42" />
        <path d={`M${p.x-42} ${p.y+18}h12v-7h9M${p.x+42} ${p.y-18}h-12v7h-9`} fill="none" stroke="#536557" strokeWidth="2" />
        <text x={p.x} y={p.y-1} textAnchor="middle" fill="#f96346" fontFamily="Barlow Condensed, sans-serif" fontSize="14" fontWeight="900">REDLINE</text>
        <text x={p.x} y={p.y+11} textAnchor="middle" fill="#e9e7dc" fontFamily="Space Mono, monospace" fontSize="6">UPGRADE / 01</text>
      </g>; })()}
      {TABLETOP_DRESSING.map((panel) => {
        const base = platform(panel.x, panel.z, panel.width / 2, panel.depth / 2, .3);
        const screen = project(panel.x, panel.z, .48);
        return <g key={panel.id} data-board-dressing={panel.id}>
          <polygon points={base.front} fill="#0c1713" stroke={panel.accent} strokeOpacity=".42" strokeWidth="1" />
          <polygon points={base.right} fill="#101e19" stroke={panel.accent} strokeOpacity=".42" strokeWidth="1" />
          <polygon points={base.top} fill="#192721" stroke={panel.accent} strokeWidth="1.5" />
          <rect x={screen.x-53} y={screen.y-7} width="106" height="16" rx="1" fill="#0b1512" stroke={panel.accent} strokeWidth="1.5" />
          <text x={screen.x} y={screen.y+3} textAnchor="middle" fill={panel.accent} fontFamily="Barlow Condensed, sans-serif" fontSize="7" fontWeight="900">{panel.title}</text>
          <text x={screen.x} y={screen.y+14} textAnchor="middle" fill="#c3d3bc" fontFamily="Space Mono, monospace" fontSize="3.4">{panel.subtitle}</text>
        </g>;
      })}
      {TABLETOP_STRUCTURES.map((structure) => {
        const base = platform(structure.x, structure.z, structure.width / 2, structure.depth / 2, .3);
        const tower = project(structure.x, structure.z, .72);
        return <g key={structure.id} data-board-structure={structure.id}>
          <polygon points={base.front} fill="#0b1713" stroke={structure.accent} strokeOpacity=".45" strokeWidth="1" />
          <polygon points={base.right} fill="#101e19" stroke={structure.accent} strokeOpacity=".45" strokeWidth="1" />
          <polygon points={base.top} fill="#172821" stroke={structure.accent} strokeWidth="1.5" />
          <rect x={tower.x-21} y={tower.y-9} width="42" height="12" fill="#15251e" stroke={structure.accent} strokeWidth="1.5" />
          <path d={`M${tower.x-30} ${tower.y+8}h60`} stroke={structure.accent} strokeWidth="2" />
          <text x={tower.x} y={tower.y-1} textAnchor="middle" fill={structure.accent} fontFamily="Space Mono, monospace" fontSize="4.8" fontWeight="700">{structure.label}</text>
        </g>;
      })}
      {TABLETOP_BUILDINGS.map((building) => {
        const bottom = 0.13;
        const top = bottom + building.height;
        const tower = building.profile === 'tower';
        const garage = building.profile === 'garage';
        const neon = building.profile === 'neon';
        const left = building.x - building.width / 2;
        const right = building.x + building.width / 2;
        const near = building.z + building.depth / 2;
        const far = building.z - building.depth / 2;
        const topFace = points([[left,far,top],[right,far,top],[right,near,top],[left,near,top]]);
        const frontFace = points([[left,near,top],[right,near,top],[right,near,bottom],[left,near,bottom]]);
        const rightFace = points([[right,far,top],[right,near,top],[right,near,bottom],[right,far,bottom]]);
        const rowCount = Math.max(2, Math.floor(building.height / .34));
        const rows = Array.from({ length: rowCount }, (_, rowIndex) => building.height * (rowIndex + 1) / (rowCount + 1));
        const columns = [-.34, 0, .34].map(fraction => fraction * building.width);
        return <g key={building.id} data-board-building={building.id}>
          <polygon points={frontFace} fill={building.profile === 'industrial' ? '#343a2e' : '#244141'} stroke={building.accent} strokeOpacity=".6" strokeWidth="1" />
          <polygon points={rightFace} fill="#13231e" stroke={building.accent} strokeOpacity=".48" strokeWidth="1" />
          <polygon points={topFace} fill={building.color} stroke={building.accent} strokeWidth="1.3" />
          {rows.flatMap((row, rowIndex) => columns.map((column, columnIndex) => {
            const pane = project(building.x + column, near + .01, bottom + row);
            return <rect key={`pane-${rowIndex}-${columnIndex}`} x={pane.x - 3.1} y={pane.y - 2} width="6.2" height="4" fill={building.accent} opacity=".9" />;
          }))}
          <line x1={project(left, near + .02, bottom + .06).x} y1={project(left, near + .02, bottom + .06).y} x2={project(right, near + .02, bottom + .06).x} y2={project(right, near + .02, bottom + .06).y} stroke={building.accent} strokeWidth="2" opacity=".85" />
          {tower && (() => {
            const mastBase = project(building.x, building.z, top);
            const mastTop = project(building.x, building.z, top + .9);
            return <g aria-label={`${building.label} tower`}>
              <polygon points={`${project(building.x - building.width * .35, building.z - building.depth * .3, top + .02).x},${project(building.x - building.width * .35, building.z - building.depth * .3, top + .02).y} ${project(building.x + building.width * .35, building.z - building.depth * .3, top + .02).x},${project(building.x + building.width * .35, building.z - building.depth * .3, top + .02).y} ${project(building.x + building.width * .35, building.z + building.depth * .3, top + .02).x},${project(building.x + building.width * .35, building.z + building.depth * .3, top + .02).y} ${project(building.x - building.width * .35, building.z + building.depth * .3, top + .02).x},${project(building.x - building.width * .35, building.z + building.depth * .3, top + .02).y}`} fill="#1a302d" stroke={building.accent} strokeWidth="1" />
              <line x1={mastBase.x} y1={mastBase.y} x2={mastTop.x} y2={mastTop.y} stroke={building.accent} strokeWidth="2" />
              <circle cx={mastTop.x} cy={mastTop.y} r="3" fill={building.accent} />
            </g>;
          })()}
          {garage && (() => {
            const canopy = project(building.x, building.z + building.depth * .25, top + .18);
            return <g aria-label={`${building.label} garage`}>
              <line x1={canopy.x - 27} y1={canopy.y} x2={canopy.x + 27} y2={canopy.y} stroke={building.accent} strokeWidth="4" />
              <line x1={canopy.x - 18} y1={canopy.y + 4} x2={canopy.x - 18} y2={canopy.y + 19} stroke={building.accent} strokeWidth="2" />
              <line x1={canopy.x + 18} y1={canopy.y + 4} x2={canopy.x + 18} y2={canopy.y + 19} stroke={building.accent} strokeWidth="2" />
            </g>;
          })()}
          {neon && (() => {
            const sign = project(building.x, near + .08, bottom + building.height * .56);
            return <g aria-label={`${building.label} neon sign`}>
              <rect x={sign.x - 22} y={sign.y - 7} width="44" height="13" fill="#101a17" stroke={building.accent} strokeWidth="1.5" />
              <text x={sign.x} y={sign.y + 2.5} textAnchor="middle" fill={building.accent} fontFamily="Space Mono, monospace" fontSize="5" fontWeight="700">{building.label}</text>
            </g>;
          })()}
          <text x={project(building.x, building.z, top + (tower ? .95 : .22)).x} y={project(building.x, building.z, top + (tower ? .95 : .22)).y - 4} textAnchor="middle" fill={building.accent} fontFamily="Space Mono, monospace" fontSize="4.5" fontWeight="700">{building.label}</text>
          {building.profile === 'industrial' && (() => {
            const stackLeft = project(building.x - building.width * .3, building.z, top + .62);
            const stackRight = project(building.x + building.width * .3, building.z, top + .62);
            const conveyor = project(building.x + building.width * .28, building.z + building.depth * .2, top + .18);
            return <g aria-label="Foundry industrial structure">
              <line x1={stackLeft.x} y1={stackLeft.y + 10} x2={stackLeft.x} y2={stackLeft.y - 11} stroke="#1a211b" strokeWidth="7" />
              <line x1={stackRight.x} y1={stackRight.y + 10} x2={stackRight.x} y2={stackRight.y - 11} stroke="#1a211b" strokeWidth="7" />
              <circle cx={stackLeft.x} cy={stackLeft.y - 12} r="3" fill={building.accent} />
              <circle cx={stackRight.x} cy={stackRight.y - 12} r="3" fill={building.accent} />
              <line x1={conveyor.x - 24} y1={conveyor.y + 5} x2={conveyor.x + 24} y2={conveyor.y - 5} stroke="#626c54" strokeWidth="5" />
              <line x1={conveyor.x - 24} y1={conveyor.y + 8} x2={conveyor.x + 24} y2={conveyor.y - 2} stroke={building.accent} strokeWidth="1.5" />
            </g>;
          })()}
        </g>;
      })}
      <polygon points={start.front} fill="#426046" /><polygon points={start.right} fill="#1a3427" /><polygon points={start.top} fill="#547454" stroke="#d4e981" strokeWidth="3" />
      {(() => { const p = project(ROUTE[0].x,ROUTE[0].z,.81); return <g><path d={ICON_PATHS.start} transform={`translate(${p.x-7} ${p.y-32}) scale(.6)`} fill="none" stroke="#d4e981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><text x={p.x} y={p.y+4} textAnchor="middle" fill="#f0f0d6" fontFamily="Barlow Condensed, sans-serif" fontWeight="900" fontSize="19">START</text><text x={p.x} y={p.y+17} textAnchor="middle" fill="#d4e981" fontFamily="Space Mono, monospace" fontSize="8">00 / LAUNCH PAD</text></g>; })()}
      {BOARD_SPACES.map(space => {
        const { x, z } = ROUTE[space.number];
        const milestone = space.type === 'MILESTONE' || space.type === 'CAREER_CHANGE';
         const visual = getSpaceVisual(space);
        const keyLabel = space.number === 1 ? null
          : space.type === 'SALARY_GATE' ? 'SALARY GATE'
          : space.type === 'UPGRADE_TOKEN' ? 'UPGRADE TOKEN'
          : space.type === 'MILESTONE' || space.type === 'CAREER_CHANGE' ? space.label.toUpperCase()
          : visual.className === 'deck' ? `${visual.deckCode ?? 'CARD'} DECK`
          : visual.className === 'gamble' ? 'GAMBLE'
          : null;
        const y = milestone ? .86 : .7;
        const scale = milestone ? SPACE_TILE_FOOTPRINT.landmarkScale : 1;
        const block = platform(x, z, SPACE_TILE_FOOTPRINT.width * scale / 2, SPACE_TILE_FOOTPRINT.depth * scale / 2, y);
          const color = milestone ? '#794337' : visual.className === 'start' ? '#3b543f' : space.payday ? '#577455' : visual.tile;
          const accent = milestone ? '#f96346' : visual.className === 'start' ? '#d4e981' : space.payday ? '#d4e981' : visual.accent;
        const center = project(x,z,y+.02);
        return <g key={space.number} data-board-space={space.number} style={{ cursor: 'pointer' }} onPointerDown={() => onSpaceSelect?.(space.number)} onPointerEnter={() => onSpaceHover?.(space.number)} onPointerLeave={() => onSpaceHover?.(null)}>
          <title>{`Space ${space.number}, ${space.label}. ${space.description}`}</title>
          <polygon points={block.right} fill="#101e19" stroke={accent} strokeOpacity=".65" strokeWidth="1" />
          <polygon points={block.front} fill="#13241e" stroke={accent} strokeOpacity=".65" strokeWidth="1" />
          <polygon
            points={block.top}
            fill={color}
            stroke={accent}
            strokeWidth={milestone ? 2.5 : visual.className === 'deck' ? 2.1 : visual.className === 'gamble' ? 1.45 : 1.2}
            style={visual.className === 'deck' ? { filter: `drop-shadow(0 0 3px ${accent}88)` } : undefined}
          />
           <rect x={center.x-30} y={center.y+21} width="16" height="3" rx="1" fill={accent} opacity={visual.className === 'safe' ? '.52' : '.9'} />
          <text x={center.x} y={center.y+5} textAnchor="middle" fill="#f2f0df" fontFamily="Barlow Condensed, sans-serif" fontSize={milestone ? 20 : 17} fontWeight="900">{String(space.number).padStart(2,'0')}</text>
            {visual.className === 'deck' ? <g aria-hidden="true">
              <ellipse cx={center.x+16} cy={center.y-12} rx="15" ry="11.5" fill="#0b1512" stroke={accent} strokeWidth="2" />
              <ellipse cx={center.x+16} cy={center.y-12} rx="11.5" ry="8.4" fill="#17221e" stroke="#eef0df" strokeOpacity=".28" strokeWidth=".7" />
            </g> : visual.className !== 'safe' && <circle cx={center.x+16} cy={center.y-12} r="11" fill="#14211c" stroke={accent} strokeOpacity=".72" strokeWidth={visual.className === 'gamble' ? 1.2 : 1.4} />}
            {visual.className === 'start' && <circle cx={center.x} cy={center.y} r="24" fill="none" stroke="#d4e981" strokeWidth="2" opacity=".8" />}
            {visual.className === 'start' && <text x={center.x} y={center.y+20} textAnchor="middle" fill="#d4e981" fontFamily="Space Mono, monospace" fontSize="8" fontWeight="700">OPEN ROAD</text>}
            {space.type === 'UPGRADE_TOKEN' && <g>
              <polygon points={Array.from({ length: 6 }, (_, i) => {
                const angle = Math.PI / 6 + i * Math.PI / 3;
                return `${center.x + Math.cos(angle) * 13},${center.y + Math.sin(angle) * 13}`;
              }).join(' ')} fill="#433b5a" stroke="#d4c5ff" strokeWidth="2" />
              <circle cx={center.x} cy={center.y} r="6" fill="none" stroke="#e7dcff" strokeWidth="1.5" />
            </g>}
            {space.type === 'SALARY_GATE' && <g stroke="#d4e981" strokeWidth="2">
              <path d={`M${center.x-17} ${center.y+14}v-18h34v18`} fill="none" />
              <path d={`M${center.x-20} ${center.y-4}h40`} />
            </g>}
            {landingPosition === space.number && <circle cx={center.x} cy={center.y} r="31" fill="none" stroke="#f0f0d6" strokeWidth="3" opacity=".95" />}
            {space.type !== 'NORMAL' && (space.type !== 'EVENT' || visual.className === 'effect' || visual.className === 'start') && <path d={ICON_PATHS[space.icon] ?? ICON_PATHS.milestone} transform={`translate(${center.x+(visual.className === 'deck' || visual.className === 'gamble' ? 4 : 7)} ${center.y-19}) scale(.48)`} fill="none" stroke={accent} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />}
            {visual.deckCode && <g aria-hidden="true">
              <rect x={center.x+7} y={center.y+1} width="18" height="9" rx="2" fill="#0b1512" stroke={accent} strokeOpacity=".92" strokeWidth=".85" />
              <text x={center.x+16} y={center.y+7.3} textAnchor="middle" fill={accent} fontFamily="Space Mono, monospace" fontSize="5" fontWeight="700" letterSpacing=".1">{visual.deckCode}</text>
            </g>}
          {space.secondaryIcon && <path d={ICON_PATHS[space.secondaryIcon]} transform={`translate(${center.x+4} ${center.y-3}) scale(.4)`} fill="none" stroke="#d4e981" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />}
             {keyLabel && (() => {
               const lines = keyLabel === 'SALARY GATE' ? ['SALARY', 'GATE']
                 : keyLabel === 'UPGRADE TOKEN' ? ['UPGRADE', 'TOKEN']
                 : keyLabel.includes(' / ') ? keyLabel.split(' / ') : [keyLabel];
               const labelY = center.y + 25;
               const labelHeight = lines.length > 1 ? 19 : 12;
               return <g aria-label={keyLabel}>
                 <rect x={center.x - 30} y={labelY - 9} width="60" height={labelHeight} rx="2" fill="#0b1512" fillOpacity=".94" stroke={space.type === 'UPGRADE_TOKEN' ? '#d4c5ff' : visual.accent} strokeOpacity=".72" strokeWidth="1" />
                 {lines.map((line, lineIndex) => <text key={line} x={center.x} y={labelY + lineIndex * 8} textAnchor="middle" fill={space.type === 'UPGRADE_TOKEN' ? '#d4c5ff' : visual.accent} fontFamily="Space Mono, monospace" fontSize={lines.length > 1 ? 7 : milestone ? 8 : 7} fontWeight="700" letterSpacing=".04">{line}</text>)}
               </g>;
             })()}
        </g>;
      })}
      {zoneNames.map((zone, i) => {
        const anchor = ZONE_ANCHORS[i];
        const yaw = Math.atan2(-anchor.x, -anchor.z);
        const tx = Math.cos(yaw);
        const tz = -Math.sin(yaw);
        const halfFlagWidth = PHASE_FLAG_FOOTPRINT.width / 2;
        const color = ['#9eae83', '#a6c1a0', '#82b7b6', '#d6a76f', '#f18463'][i];
        const leftTop = project(anchor.x - tx * halfFlagWidth, anchor.z - tz * halfFlagWidth, 1.48);
        const rightTop = project(anchor.x + tx * halfFlagWidth, anchor.z + tz * halfFlagWidth, 1.48);
        const leftBottom = project(anchor.x - tx * halfFlagWidth, anchor.z - tz * halfFlagWidth, .74);
        const rightBottom = project(anchor.x + tx * halfFlagWidth, anchor.z + tz * halfFlagWidth, .74);
        const poleBase = project(anchor.x - tx * halfFlagWidth, anchor.z - tz * halfFlagWidth, .14);
        const poleTop = project(anchor.x - tx * halfFlagWidth, anchor.z - tz * halfFlagWidth, 1.51);
        const label = project(anchor.x, anchor.z, 1.1);
        return <g key={`phase-flag-${zone}`} data-board-flag={zone} aria-label={zone}>
          <line x1={poleBase.x} y1={poleBase.y} x2={poleTop.x} y2={poleTop.y} stroke="#26362d" strokeWidth="5" strokeLinecap="round" />
          <line x1={leftTop.x} y1={leftTop.y} x2={rightTop.x} y2={rightTop.y} stroke={color} strokeWidth="4" strokeLinecap="round" />
          <polygon points={`${leftTop.x},${leftTop.y} ${rightTop.x},${rightTop.y} ${rightBottom.x},${rightBottom.y} ${label.x},${rightBottom.y + 4} ${leftBottom.x},${leftBottom.y}`} fill="#18251e" stroke={color} strokeWidth="2.5" />
          <text x={label.x} y={label.y - 3} textAnchor="middle" fill="#f0f0df" fontFamily="Barlow Condensed, sans-serif" fontSize="15" fontWeight="900">{zone}</text>
          <text x={label.x} y={label.y + 11} textAnchor="middle" fill={color} fontFamily="Space Mono, monospace" fontSize="8" fontWeight="700">{`ZONE 0${i + 1}`}</text>
        </g>;
      })}
      {(() => {
        const p = project(finish.x, finish.z, 1.6);
        const entries = finishOrder.slice(0, 4).map((playerIndex, place) => ({
          player: players[playerIndex],
          place: `${place + 1}${place === 0 ? 'ST' : place === 1 ? 'ND' : place === 2 ? 'RD' : 'TH'}`,
        })).filter((entry) => entry.player);
        return <g>
          <path d={`M${p.x-24} ${p.y+40}v-55h48v55`} fill="none" stroke="#f96346" strokeWidth="5" />
          <rect x={p.x-62} y={p.y-42} width="124" height={entries.length ? 28 + entries.length * 13 : 24} fill="#0d1b16" stroke="#f96346" strokeWidth="2" />
          <text x={p.x} y={p.y-27} textAnchor="middle" fill="#f96346" fontFamily="Barlow Condensed, sans-serif" fontSize="14" fontWeight="900">FINISH ORDER</text>
          {entries.map(({ player, place }, index) => <text key={player!.playerId} x={p.x} y={p.y-11 + index * 13} textAnchor="middle" fill="#d4e981" fontFamily="Space Mono, monospace" fontSize="7" fontWeight="700">{`${place} / ${player!.displayName}`}</text>)}
        </g>;
      })()}
      {players.map((player, playerIndex) => {
        const colocated = players.filter(p => p.position === player.position).sort((a,b) => a.slot-b.slot);
        const index = colocated.findIndex(p => p.playerId === player.playerId);
        const pos = ROUTE[Math.max(0,Math.min(75,player.position))];
        const x = pos.x + (colocated.length > 1 ? (index%2 ? .43 : -.43) : 0);
        const z = pos.z + (colocated.length > 1 ? (index<2 ? -.43 : .43) : 0);
        const p = project(x,z,player.position === 0 ? 1.07 : 1.1);
        const finishIndex = finishOrder.indexOf(playerIndex);
        const place = finishIndex >= 0 && finishIndex < 4 ? finishIndex + 1 : undefined;
        const placeLabel = place === undefined ? '' : `${place}${place === 1 ? 'ST' : place === 2 ? 'ND' : place === 3 ? 'RD' : 'TH'}`;
        return <g key={player.playerId}><title>{`${player.displayName} at ${player.position === 0 ? 'start' : `space ${player.position}`}`}</title>
          <ellipse cx={p.x+2} cy={p.y+10} rx="12" ry="5" fill="#050d0b" opacity=".7" />
          <path d={`M${p.x-10} ${p.y+7}l3-24 7-7 7 7 3 24z`} fill={playerColors[player.slot%4]} stroke={player.playerId === activePlayerId ? '#fff4d7' : '#14221b'} strokeWidth={player.playerId === activePlayerId ? 3 : 2} />
          <circle cx={p.x} cy={p.y-17} r="5" fill="#17241f" /><text x={p.x} y={p.y-14} textAnchor="middle" fill="#e9e7dc" fontFamily="Space Mono, monospace" fontSize="7" fontWeight="700">{player.slot+1}</text>
          {placeLabel && <g aria-label={`${placeLabel} place`}><rect x={p.x-17} y={p.y-42} width="34" height="12" rx="2" fill="#d4e981" /><text x={p.x} y={p.y-33} textAnchor="middle" fill="#14211c" fontFamily="Space Mono, monospace" fontSize="7" fontWeight="900">{placeLabel}</text></g>}
        </g>;
      })}
    </svg>
     <div className="ru-board__static-key" aria-label="Board visual key">
       <span className="ru-key-safe"><i /> SAFE / NO EFFECT</span>
       <span className="ru-key-deck"><i /> DECK / DRAW</span>
       <span className="ru-key-effect"><i /> EFFECT / LAND ONLY</span>
       <span className="ru-key-salary"><i /> SALARY / PAYDAY</span>
       <span className="ru-key-major"><i /> MAJOR / CAREER + MILESTONE</span>
       <span className="ru-key-gamble"><i /> GAMBLE / RISK</span>
       <span className="ru-key-finish"><i /> FINISH</span>
     </div>
  </div>;
}