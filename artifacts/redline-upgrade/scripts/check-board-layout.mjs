import { createServer } from 'vite';

process.env.PORT ??= '5174';
process.env.BASE_PATH ??= '/redline-upgrade';

const server = await createServer({
  configFile: 'vite.config.ts',
  server: { middlewareMode: true },
  appType: 'custom',
});

const minimumClearance = 0.04;

function axisAlignedClear(a, b) {
  const gapX = Math.abs(a.x - b.x) - (a.width + b.width) / 2;
  const gapZ = Math.abs(a.z - b.z) - (a.depth + b.depth) / 2;
  return gapX >= minimumClearance || gapZ >= minimumClearance;
}

function rotatedFlagClear(flag, tile) {
  const dx = tile.x - flag.x;
  const dz = tile.z - flag.z;
  const cos = Math.cos(flag.yaw);
  const sin = Math.sin(flag.yaw);
  const flagHalfWidth = flag.width / 2;
  const flagHalfDepth = flag.depth / 2;
  const tileHalfWidth = tile.width / 2;
  const tileHalfDepth = tile.depth / 2;
  const separatingAxes = [
    [Math.abs(dx), tileHalfWidth + flagHalfWidth * Math.abs(cos) + flagHalfDepth * Math.abs(sin)],
    [Math.abs(dz), tileHalfDepth + flagHalfWidth * Math.abs(sin) + flagHalfDepth * Math.abs(cos)],
    [Math.abs(dx * cos - dz * sin), flagHalfWidth + tileHalfWidth * Math.abs(cos) + tileHalfDepth * Math.abs(sin)],
    [Math.abs(dx * sin + dz * cos), flagHalfDepth + tileHalfWidth * Math.abs(sin) + tileHalfDepth * Math.abs(cos)],
  ];
  return separatingAxes.some(([distance, radius]) => distance >= radius + minimumClearance);
}

try {
  const scene = await server.ssrLoadModule('/src/components/board-scene.tsx');
  const boardData = await server.ssrLoadModule('/src/game/board-data.ts');
  const {
    PHASE_FLAG_FOOTPRINT,
    ROUTE,
    SPACE_TILE_FOOTPRINT,
    START_PAD_FOOTPRINT,
    TABLETOP_DRESSING,
    TABLETOP_BUILDINGS,
    TABLETOP_STRUCTURES,
    ZONE_ANCHORS,
  } = scene;
  const { BOARD_SPACES } = boardData;
  const tiles = BOARD_SPACES.map(space => {
    const scale = space.type === 'MILESTONE' || space.type === 'CAREER_CHANGE'
      ? SPACE_TILE_FOOTPRINT.landmarkScale
      : 1;
    return {
      number: space.number,
      x: ROUTE[space.number].x,
      z: ROUTE[space.number].z,
      width: SPACE_TILE_FOOTPRINT.width * scale,
      depth: SPACE_TILE_FOOTPRINT.depth * scale,
    };
  });
  const scenery = [
    ...TABLETOP_BUILDINGS.map(building => ({
      id: building.id,
      x: building.x,
      z: building.z,
      width: building.width + 0.22,
      depth: building.depth + 0.18,
    })),
    ...TABLETOP_STRUCTURES.map(structure => ({
      id: structure.id,
      x: structure.x,
      z: structure.z,
      width: structure.width,
      depth: structure.depth,
    })),
    ...TABLETOP_DRESSING.map(panel => ({
      id: panel.id,
      x: panel.x,
      z: panel.z,
      width: panel.width,
      depth: panel.depth,
    })),
  ];
  const overlaps = [];

  for (let i = 0; i < tiles.length; i += 1) {
    for (let j = i + 1; j < tiles.length; j += 1) {
      if (!axisAlignedClear(tiles[i], tiles[j])) {
        overlaps.push(`spaces ${tiles[i].number} and ${tiles[j].number}`);
      }
    }
  }

  const startPad = {
    x: ROUTE[0].x,
    z: ROUTE[0].z,
    width: START_PAD_FOOTPRINT.width,
    depth: START_PAD_FOOTPRINT.depth,
  };
  for (const tile of tiles) {
    if (!axisAlignedClear(startPad, tile)) overlaps.push(`start pad and space ${tile.number}`);
  }

  for (let i = 0; i < scenery.length; i += 1) {
    for (let j = i + 1; j < scenery.length; j += 1) {
      if (!axisAlignedClear(scenery[i], scenery[j])) {
        overlaps.push(`${scenery[i].id} and ${scenery[j].id}`);
      }
    }
    for (const tile of tiles) {
      if (!axisAlignedClear(scenery[i], tile)) overlaps.push(`${scenery[i].id} and space ${tile.number}`);
    }
  }
  for (const prop of scenery) {
    if (!axisAlignedClear(startPad, prop)) overlaps.push(`start pad and ${prop.id}`);
  }

  for (const anchor of ZONE_ANCHORS) {
    const flag = {
      x: anchor.x,
      z: anchor.z,
      yaw: Math.atan2(-anchor.x, -anchor.z),
      width: PHASE_FLAG_FOOTPRINT.width,
      depth: PHASE_FLAG_FOOTPRINT.depth,
    };
    for (const tile of tiles) {
      if (!rotatedFlagClear(flag, tile)) overlaps.push(`phase flag ${anchor.number} and space ${tile.number}`);
    }
  }

  if (overlaps.length) {
    throw new Error(`Board layout has overlapping footprints:\n${overlaps.join('\n')}`);
  }

  console.log(`Board layout clear: ${tiles.length} spaces, start pad, ${scenery.length} perimeter props, and ${ZONE_ANCHORS.length} phase flags.`);
} finally {
  await server.close();
}