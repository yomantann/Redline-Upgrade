export const HAUNTED_START_SPACE = 0;
export const HAUNTED_FINISH_SPACE = 75;

export interface HauntedRouteOption {
  space: number;
  label: string;
  description: string;
}

export interface HauntedFork {
  space: number;
  title: string;
  options: readonly HauntedRouteOption[];
}

export interface HauntedRoutePoint {
  x: number;
  z: number;
}

export type HauntedBoardChange =
  | { id: string; kind: 'CLOSE_ROUTE'; from: number; to: number; expiresAtTurn: number | null; label: string }
  | { id: string; kind: 'OPEN_SHORTCUT'; from: number; to: number; expiresAtTurn: number | null; label: string }
  | { id: string; kind: 'CURSE_SPACE' | 'SAFE_SPACE'; space: number; expiresAtTurn: number | null; label: string };
export type HauntedBoardChangeRequest = 'CLOSE_ROUTE' | 'OPEN_SHORTCUT' | 'CURSE_SPACE' | 'SAFE_SPACE';
export interface HauntedBoardState {
  changes: HauntedBoardChange[];
}

const outgoing = new Map<number, number[]>();

function connect(from: number, to: number): void {
  outgoing.set(from, [...(outgoing.get(from) ?? []), to]);
}

function connectLine(from: number, through: number, to: number): void {
  for (let space = from; space < through; space += 1) connect(space, space + 1);
  connect(through, to);
}

// Branches intentionally skip the spaces on the route not chosen. All paths
// reconnect, preserve global space labels, and eventually reach the same finish.
connectLine(0, 10, 11);
connect(11, 12);
connect(11, 15);
connectLine(12, 14, 20);
connectLine(15, 19, 20);
connectLine(20, 29, 30);
connect(30, 31);
connect(30, 34);
connectLine(31, 33, 39);
connectLine(34, 38, 39);
connectLine(39, 48, 49);
connect(49, 50);
connect(49, 52);
connectLine(50, 51, 54);
connectLine(52, 53, 54);
connectLine(54, 63, 64);
connect(64, 65);
connect(64, 70);
connectLine(65, 69, 72);
connectLine(70, 71, 72);
connectLine(72, 74, 75);

export const HAUNTED_ROUTE_EDGES: Readonly<Record<number, readonly number[]>> = Object.freeze(
  Object.fromEntries([...outgoing].map(([space, next]) => [space, Object.freeze([...next])])),
);

export const HAUNTED_FORKS: readonly HauntedFork[] = [
  {
    space: 11,
    title: 'THE CHAPEL FORK',
    options: [
      { space: 12, label: 'CANDLELIT GALLERY', description: 'Shorter, quieter passage through the old chapel.' },
      { space: 15, label: 'BELL TOWER STAIRS', description: 'Longer route with the risky Cursed Door at space 19.' },
    ],
  },
  {
    space: 30,
    title: 'THE MIRROR HALL',
    options: [
      { space: 31, label: 'SHATTERED GALLERY', description: 'Shorter passage through broken reflections.' },
      { space: 34, label: 'THE LONG PORTRAIT HALL', description: 'Longer route, with more spaces exposed to the house.' },
    ],
  },
  {
    space: 49,
    title: 'THE SUNKEN CROSSING',
    options: [
      { space: 50, label: 'FLOODED CRYPT', description: 'Short flooded crossing beneath the estate.' },
      { space: 52, label: 'BONE BRIDGE', description: 'Longer, exposed bridge above the crypt.' },
    ],
  },
  {
    space: 64,
    title: 'THE FINAL APPROACH',
    options: [
      { space: 65, label: 'THE OLD CATACOMBS', description: 'Longer route, with the Cursed Door at space 68.' },
      { space: 70, label: 'THE GRAVEYARD GATE', description: 'Shorter route across exposed ground.' },
    ],
  },
];

const forkBySpace = new Map(HAUNTED_FORKS.map((fork) => [fork.space, fork]));

const ELLIPSE_SAMPLES = 4096;
const ellipsePoints = Array.from({ length: ELLIPSE_SAMPLES + 1 }, (_, index) => {
  const angle = -Math.PI / 2 + (index / ELLIPSE_SAMPLES) * Math.PI * 2;
  return { angle, x: Math.cos(angle) * 25, z: Math.sin(angle) * 16 };
});
const ellipseDistances = [0];
for (let index = 1; index < ellipsePoints.length; index += 1) {
  const previous = ellipsePoints[index - 1];
  const current = ellipsePoints[index];
  ellipseDistances.push(ellipseDistances[index - 1] + Math.hypot(current.x - previous.x, current.z - previous.z));
}
const ellipsePerimeter = ellipseDistances[ellipseDistances.length - 1];

function pointOnEllipseAt(distance: number): HauntedRoutePoint {
  let low = 1;
  let high = ellipseDistances.length - 1;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (ellipseDistances[middle] < distance) low = middle + 1;
    else high = middle;
  }
  const upper = low;
  const lower = Math.max(0, upper - 1);
  const segmentLength = ellipseDistances[upper] - ellipseDistances[lower] || 1;
  const progress = (distance - ellipseDistances[lower]) / segmentLength;
  return {
    x: ellipsePoints[lower].x + (ellipsePoints[upper].x - ellipsePoints[lower].x) * progress,
    z: ellipsePoints[lower].z + (ellipsePoints[upper].z - ellipsePoints[lower].z) * progress,
  };
}

const routePoints: Record<number, HauntedRoutePoint> = Object.fromEntries(
  Array.from({ length: HAUNTED_FINISH_SPACE }, (_, index) => [
    index + 1,
    pointOnEllipseAt((index / HAUNTED_FINISH_SPACE) * ellipsePerimeter),
  ]),
);

function placeBranch(spaces: readonly number[], from: number, to: number, offset: number): void {
  const start = routePoints[from];
  const end = routePoints[to];
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const length = Math.hypot(dx, dz) || 1;
  const perpendicular = { x: -dz / length, z: dx / length };
  spaces.forEach((space, index) => {
    const t = (index + 1) / (spaces.length + 1);
    const bulge = Math.sin(t * Math.PI) * offset;
    routePoints[space] = {
      x: start.x + dx * t + perpendicular.x * bulge,
      z: start.z + dz * t + perpendicular.z * bulge,
    };
  });
}

// Longer branches occupy more of the otherwise empty central board area;
// shorter options stay direct so the visual route length matches the rules.
placeBranch([12, 13, 14], 11, 20, -1.5);
placeBranch([15, 16, 17, 18, 19], 11, 20, 8.5);
placeBranch([31, 32, 33], 30, 39, -1.5);
placeBranch([34, 35, 36, 37, 38], 30, 39, 8.5);
placeBranch([50, 51], 49, 54, -4.2);
placeBranch([52, 53], 49, 54, 4.2);
routePoints[72] = { x: -14, z: -11 };
placeBranch([65, 66, 67, 68, 69], 64, 72, -7.5);
placeBranch([70, 71], 64, 72, 2.5);
routePoints[73] = { x: -11.8, z: -9 };
routePoints[74] = { x: -9.6, z: -7 };
routePoints[75] = { x: -7.4, z: -5 };
const startVector = {
  x: routePoints[1].x - routePoints[2].x,
  z: routePoints[1].z - routePoints[2].z,
};
const startLength = Math.hypot(startVector.x, startVector.z) || 1;
routePoints[HAUNTED_START_SPACE] = {
  x: routePoints[1].x + (startVector.x / startLength) * 3.6,
  z: routePoints[1].z + (startVector.z / startLength) * 3.6,
};

export const HAUNTED_ROUTE_POINTS: Readonly<Record<number, HauntedRoutePoint>> = Object.freeze(
  Object.fromEntries(Object.entries(routePoints).map(([space, point]) => [space, Object.freeze(point)])),
);

export function createHauntedBoardState(): HauntedBoardState {
  return { changes: [] };
}

function activeChanges(state?: HauntedBoardState, turnCounter = 0): HauntedBoardChange[] {
  return (state?.changes ?? []).filter(change => change.expiresAtTurn === null || change.expiresAtTurn > turnCounter);
}

export function getHauntedNextSpaces(space: number, state?: HauntedBoardState, turnCounter = 0): readonly number[] {
  const changes = activeChanges(state, turnCounter);
  const blocked = new Set(changes
    .filter((change): change is Extract<HauntedBoardChange, { kind: 'CLOSE_ROUTE' }> => change.kind === 'CLOSE_ROUTE' && change.from === space)
    .map(change => change.to));
  const opened = changes
    .filter((change): change is Extract<HauntedBoardChange, { kind: 'OPEN_SHORTCUT' }> => change.kind === 'OPEN_SHORTCUT' && change.from === space)
    .map(change => change.to);
  return [...new Set([...(HAUNTED_ROUTE_EDGES[space] ?? []).filter(destination => !blocked.has(destination)), ...opened])].sort((a, b) => a - b);
}

export function getHauntedFork(space: number): HauntedFork | undefined {
  return forkBySpace.get(space);
}

export function getHauntedSpaceChange(state: HauntedBoardState | undefined, space: number, turnCounter = 0): HauntedBoardChange | undefined {
  return activeChanges(state, turnCounter).filter((change) =>
    (change.kind === 'CURSE_SPACE' || change.kind === 'SAFE_SPACE') && change.space === space,
  ).at(-1);
}

export function getHauntedRouteEdgeMode(
  from: number,
  to: number,
  state?: HauntedBoardState,
  turnCounter = 0,
): 'OPEN' | 'CLOSED' | 'SHORTCUT' {
  const changes = activeChanges(state, turnCounter);
  if (changes.some(change => change.kind === 'CLOSE_ROUTE' && change.from === from && change.to === to)) return 'CLOSED';
  if (changes.some(change => change.kind === 'OPEN_SHORTCUT' && change.from === from && change.to === to)) return 'SHORTCUT';
  return 'OPEN';
}

export function applyHauntedBoardMutation(
  currentState: HauntedBoardState | undefined,
  request: HauntedBoardChangeRequest,
  turnCounter: number,
  idPrefix: string,
  random: () => number = Math.random,
): [HauntedBoardState, string] {
  const board = expireHauntedBoardChanges(currentState, turnCounter);
  const expiresAtTurn = turnCounter + 3;
  let boardChange: HauntedBoardChange;
  if (request === 'OPEN_SHORTCUT') {
    const alreadyOpen = board.changes.some(item => item.kind === 'OPEN_SHORTCUT' && item.from === 26 && item.to === 30);
    if (alreadyOpen) return [board, 'The hidden gallery passage is already open.'];
    boardChange = { id: `${idPrefix}-shortcut`, kind: 'OPEN_SHORTCUT', from: 26, to: 30, expiresAtTurn: null, label: 'THE WEST GALLERY SHORTCUT IS OPEN' };
  } else if (request === 'CLOSE_ROUTE') {
    const availableForks = HAUNTED_FORKS.filter(fork => getHauntedNextSpaces(fork.space, board, turnCounter).length > 1);
    if (!availableForks.length) return applyHauntedBoardMutation(board, 'OPEN_SHORTCUT', turnCounter, idPrefix, random);
    const fork = availableForks[Math.floor(random() * availableForks.length)] ?? availableForks[0];
    const options = getHauntedNextSpaces(fork.space, board, turnCounter);
    const to = options[Math.floor(random() * options.length)] ?? options[0];
    boardChange = { id: `${idPrefix}-closed-${fork.space}-${to}`, kind: 'CLOSE_ROUTE', from: fork.space, to, expiresAtTurn, label: `THE PASSAGE FROM ${fork.space} TO ${to} IS SEALED` };
  } else if (request === 'CURSE_SPACE') {
    const candidates = [22, 23, 24, 25, 36, 37, 38, 46, 47, 48, 61, 62, 63, 71, 72]
      .filter(space => !getHauntedSpaceChange(board, space, turnCounter));
    const space = candidates[Math.floor(random() * candidates.length)] ?? 24;
    boardChange = { id: `${idPrefix}-curse-${space}`, kind: 'CURSE_SPACE', space, expiresAtTurn, label: `SPACE ${space} IS CURSED` };
  } else {
    const currentCurse = board.changes.find(item => item.kind === 'CURSE_SPACE' && (item.expiresAtTurn === null || item.expiresAtTurn > turnCounter));
    const candidates = [22, 23, 24, 25, 36, 37, 38, 46, 47, 48, 61, 62, 63, 71, 72];
    const space = currentCurse?.kind === 'CURSE_SPACE'
      ? currentCurse.space
      : candidates.find(candidate => !getHauntedSpaceChange(board, candidate, turnCounter)) ?? 24;
    boardChange = { id: `${idPrefix}-safe-${space}`, kind: 'SAFE_SPACE', space, expiresAtTurn, label: `SPACE ${space} IS SAFE` };
  }
  const nextBoard = { changes: [...board.changes, boardChange] };
  if (validateHauntedRouteGraph(nextBoard, turnCounter).length
    || getHauntedShortestDistance(0, HAUNTED_FINISH_SPACE, nextBoard, turnCounter) === null) {
    return [board, 'The estate rejects the change; every route to the finish remains open.'];
  }
  return [nextBoard, boardChange.label];
}

export function getHauntedShortestDistance(from: number, target = HAUNTED_FINISH_SPACE, state?: HauntedBoardState, turnCounter = 0): number | null {
  if (from === target) return 0;
  const queue: Array<{ space: number; distance: number }> = [{ space: from, distance: 0 }];
  const visited = new Set([from]);
  while (queue.length) {
    const current = queue.shift()!;
    for (const next of getHauntedNextSpaces(current.space, state, turnCounter)) {
      if (next === target) return current.distance + 1;
      if (!visited.has(next)) {
        visited.add(next);
        queue.push({ space: next, distance: current.distance + 1 });
      }
    }
  }
  return null;
}

/** Reports missing, cyclic, unreachable, or finishless routes without mutating board data. */
export function validateHauntedRouteGraph(state?: HauntedBoardState, turnCounter = 0): string[] {
  const errors: string[] = [];
  for (const space of Array.from({ length: HAUNTED_FINISH_SPACE + 1 }, (_, index) => index)) {
    if (space !== HAUNTED_FINISH_SPACE && getHauntedNextSpaces(space, state, turnCounter).length === 0) {
      errors.push(`Space ${space} has no outgoing route.`);
    }
    for (const next of getHauntedNextSpaces(space, state, turnCounter)) {
      if (next < 1 || next > HAUNTED_FINISH_SPACE) errors.push(`Space ${space} points outside the board to ${next}.`);
    }
  }

  const reachable = new Set<number>([HAUNTED_START_SPACE]);
  const pending = [HAUNTED_START_SPACE];
  while (pending.length) {
    const space = pending.shift()!;
    for (const next of getHauntedNextSpaces(space, state, turnCounter)) {
      if (!reachable.has(next)) {
        reachable.add(next);
        pending.push(next);
      }
    }
  }
  if (!state) {
    for (let space = 1; space <= HAUNTED_FINISH_SPACE; space += 1) {
      if (!reachable.has(space)) errors.push(`Space ${space} is unreachable from Start.`);
    }
  }

  const visiting = new Set<number>();
  const finishable = new Map<number, boolean>();
  const reachesFinish = (space: number): boolean => {
    if (space === HAUNTED_FINISH_SPACE) return true;
    if (visiting.has(space)) {
      errors.push(`Route cycle found at space ${space}.`);
      return false;
    }
    const cached = finishable.get(space);
    if (cached !== undefined) return cached;
    visiting.add(space);
    const nextSpaces = getHauntedNextSpaces(space, state, turnCounter);
    const allPathsFinish = nextSpaces.length > 0 && nextSpaces.every(reachesFinish);
    visiting.delete(space);
    finishable.set(space, allPathsFinish);
    if (!allPathsFinish) errors.push(`At least one route from space ${space} does not reach the finish.`);
    return allPathsFinish;
  };

  reachesFinish(HAUNTED_START_SPACE);
  return [...new Set(errors)];
}

export function expireHauntedBoardChanges(state: HauntedBoardState | undefined, turnCounter: number): HauntedBoardState {
  const current = state ?? createHauntedBoardState();
  return {
    changes: current.changes.filter(change => change.expiresAtTurn === null || change.expiresAtTurn > turnCounter),
  };
}
