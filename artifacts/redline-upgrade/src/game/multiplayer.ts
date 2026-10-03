import { advanceMatch, rollD4, type DiceResult, type Match, type MatchAction } from './match';
import type { EndgameChoice } from './endgame';

/**
 * Server-authoritative multiplayer layer. It owns no gameplay rules: clients send intent-level
 * actions, and this module checks seat/turn ownership and then feeds plain `MatchAction`s through
 * the existing `advanceMatch` reducer (and its event engine). Anything the reducer ignores is
 * reported as illegal, so legality always comes from the single-player rules.
 */

export interface MultiplayerSeat {
  userId: string;
  playerId: string;
  playerIndex: number;
}

/** Persisted canonical state for one room's match. */
export interface MultiplayerMatchState {
  match: Match;
  seats: MultiplayerSeat[];
  /** Epoch ms of the last accepted (or auto-played) action; the autoplay clock restarts from it. */
  actionAt: number;
  /** Consecutive turns each user missed (reset whenever they act). */
  missedTurns: Record<string, number>;
  /** Last turnCounter already counted as missed per user, so one turn counts once. */
  missedMarks: Record<string, number>;
  /** Users removed for missing too many turns; their seats are auto-played instantly. */
  kicked: string[];
}

/** An idle player's turn is auto-played after this long. */
export const AUTOPLAY_AFTER_MS = 60_000;
/** Consecutive missed turns that remove a player from the match. */
export const MAX_MISSED_TURNS = 3;

export type ClientAction =
  | { type: 'ROLL_DICE' }
  | { type: 'MOVE' }
  | { type: 'DRAW_CARD' }
  | { type: 'ACKNOWLEDGE_CARD' }
  | { type: 'USE_ABILITY'; resolution: AbilityResolution }
  | { type: 'CHOOSE_ASSET_CATEGORY'; category: 'pet' | 'investment' }
  | { type: 'BUY_ASSET'; assetId: string }
  | { type: 'SKIP_ASSET' }
  | { type: 'USE_UPGRADE_TOKEN'; mode: 'UPGRADE_ASSET'; assetId: string }
  | { type: 'USE_UPGRADE_TOKEN'; mode: 'RECOVER_MILESTONE' | 'HOLD' }
  | { type: 'GAMBLE'; choice: EndgameChoice }
  | { type: 'CHANGE_CAREER'; step: 'KEEP' | 'SWITCH' | 'ACKNOWLEDGE' }
  | { type: 'CHANGE_CAREER'; step: 'SELECT'; careerId: string }
  | { type: 'END_TURN' };

export type AbilityResolution =
  | { kind: 'STAT_DESTINATION'; stat: 'aiSkill' | 'fame' | 'influence' }
  | { kind: 'ASSET_INTERACTION'; choice: 'STEAL' | 'SWAP' | 'DECLINE' }
  | { kind: 'CAREER_SWAP'; accept: boolean };

export type ActionRejection = 'INVALID_ACTION' | 'KICKED' | 'NOT_A_PLAYER' | 'NOT_YOUR_TURN' | 'ILLEGAL_ACTION' | 'MATCH_COMPLETE';
export type ActionResult =
  | { ok: true; state: MultiplayerMatchState }
  | { ok: false; reason: ActionRejection; message: string };

const MAX_AUTO_STEPS = 100;
const ENDGAME_CHOICES: readonly string[] = ['CASH_OUT', 'DOUBLE_DOWN', 'FINAL_GAMBLE'];

export function seatForUser(state: MultiplayerMatchState, userId: string): MultiplayerSeat | undefined {
  return state.seats.find((seat) => seat.userId === userId);
}

/** The player index who must act right now (a pending ability decision can belong to someone else). */
export function actingPlayerIndex(match: Match): number {
  return match.pending?.kind === 'ABILITY' ? match.pending.playerIndex : match.turnIndex;
}

export function serverRollDice(): DiceResult {
  const die1 = rollD4();
  const die2 = rollD4();
  return { die1, die2, total: die1 + die2, doubles: die1 === die2 };
}

function reject(reason: ActionRejection, message: string): ActionResult {
  return { ok: false, reason, message };
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 80;
}

/** Inverse of `toMatchActions` for the UI: which client request a reducer-style UI action stands for. */
export function toClientAction(action: MatchAction): ClientAction | null {
  switch (action.type) {
    case 'ROLL': return { type: 'ROLL_DICE' };
    case 'MOVE': return { type: 'MOVE' };
    case 'RESOLVE_CARD': return { type: 'DRAW_CARD' };
    case 'ACKNOWLEDGE_CARD': return { type: 'ACKNOWLEDGE_CARD' };
    case 'CHOOSE_ASSET_CATEGORY': return { type: 'CHOOSE_ASSET_CATEGORY', category: action.category };
    case 'BUY_ASSET': return { type: 'BUY_ASSET', assetId: action.assetId };
    case 'SKIP_ASSET': return { type: 'SKIP_ASSET' };
    case 'UPGRADE_ASSET': return { type: 'USE_UPGRADE_TOKEN', mode: 'UPGRADE_ASSET', assetId: action.assetId };
    case 'RECOVER_MILESTONE': return { type: 'USE_UPGRADE_TOKEN', mode: 'RECOVER_MILESTONE' };
    case 'HOLD_UPGRADE_TOKEN': return { type: 'USE_UPGRADE_TOKEN', mode: 'HOLD' };
    case 'KEEP_CAREER': return { type: 'CHANGE_CAREER', step: 'KEEP' };
    case 'SWITCH_CAREER': return { type: 'CHANGE_CAREER', step: 'SWITCH' };
    case 'SELECT_CAREER': return { type: 'CHANGE_CAREER', step: 'SELECT', careerId: action.careerId };
    case 'ACKNOWLEDGE_CAREER': return { type: 'CHANGE_CAREER', step: 'ACKNOWLEDGE' };
    case 'RESOLVE_ABILITY_STAT_DESTINATION': return { type: 'USE_ABILITY', resolution: { kind: 'STAT_DESTINATION', stat: action.stat } };
    case 'RESOLVE_ABILITY_ASSET_INTERACTION': return { type: 'USE_ABILITY', resolution: { kind: 'ASSET_INTERACTION', choice: action.choice } };
    case 'RESOLVE_ABILITY_CAREER_SWAP': return { type: 'USE_ABILITY', resolution: { kind: 'CAREER_SWAP', accept: action.accept } };
    case 'CHOOSE_ENDGAME': return { type: 'GAMBLE', choice: action.choice };
    case 'NEXT_TURN': return { type: 'END_TURN' };
    // REVEAL, STEP and AUTO_DECIDE are driven by the server, never requested by a client.
    default: return null;
  }
}

/** Translates a validated client action into the reducer actions it stands for, or null if malformed. */
function toMatchActions(action: ClientAction): MatchAction[] | null {
  switch (action.type) {
    case 'ROLL_DICE':
      return [{ type: 'ROLL', result: serverRollDice() }, { type: 'REVEAL' }];
    case 'MOVE': return [{ type: 'MOVE' }];
    case 'DRAW_CARD': return [{ type: 'RESOLVE_CARD' }];
    case 'ACKNOWLEDGE_CARD': return [{ type: 'ACKNOWLEDGE_CARD' }];
    case 'USE_ABILITY': {
      const resolution = action.resolution;
      if (resolution?.kind === 'STAT_DESTINATION' && ['aiSkill', 'fame', 'influence'].includes(resolution.stat)) {
        return [{ type: 'RESOLVE_ABILITY_STAT_DESTINATION', stat: resolution.stat }];
      }
      if (resolution?.kind === 'ASSET_INTERACTION' && ['STEAL', 'SWAP', 'DECLINE'].includes(resolution.choice)) {
        return [{ type: 'RESOLVE_ABILITY_ASSET_INTERACTION', choice: resolution.choice }];
      }
      if (resolution?.kind === 'CAREER_SWAP' && typeof resolution.accept === 'boolean') {
        return [{ type: 'RESOLVE_ABILITY_CAREER_SWAP', accept: resolution.accept }];
      }
      return null;
    }
    case 'CHOOSE_ASSET_CATEGORY':
      return action.category === 'pet' || action.category === 'investment'
        ? [{ type: 'CHOOSE_ASSET_CATEGORY', category: action.category }] : null;
    case 'BUY_ASSET': return isString(action.assetId) ? [{ type: 'BUY_ASSET', assetId: action.assetId }] : null;
    case 'SKIP_ASSET': return [{ type: 'SKIP_ASSET' }];
    case 'USE_UPGRADE_TOKEN':
      if (action.mode === 'UPGRADE_ASSET') return isString(action.assetId) ? [{ type: 'UPGRADE_ASSET', assetId: action.assetId }] : null;
      if (action.mode === 'RECOVER_MILESTONE') return [{ type: 'RECOVER_MILESTONE' }];
      if (action.mode === 'HOLD') return [{ type: 'HOLD_UPGRADE_TOKEN' }];
      return null;
    case 'GAMBLE':
      return ENDGAME_CHOICES.includes(action.choice) ? [{ type: 'CHOOSE_ENDGAME', choice: action.choice }] : null;
    case 'CHANGE_CAREER':
      if (action.step === 'KEEP') return [{ type: 'KEEP_CAREER' }];
      if (action.step === 'SWITCH') return [{ type: 'SWITCH_CAREER' }];
      if (action.step === 'ACKNOWLEDGE') return [{ type: 'ACKNOWLEDGE_CAREER' }];
      if (action.step === 'SELECT') return isString(action.careerId) ? [{ type: 'SELECT_CAREER', careerId: action.careerId }] : null;
      return null;
    case 'END_TURN': return [{ type: 'NEXT_TURN' }];
    default: return null;
  }
}

/** Walks the reducer through the purely mechanical movement phases once the mover has committed. */
function settleMovement(match: Match): Match {
  let current = match;
  for (let i = 0; i < MAX_AUTO_STEPS && current.phase === 'moving'; i += 1) {
    const next = advanceMatch(current, { type: 'STEP' });
    if (next === current) break;
    current = next;
  }
  return current;
}

/**
 * Applies one player's requested action to the canonical state. The caller persists `state`
 * only when `ok` is true; rejected actions never change anything.
 */
export function applyPlayerAction(state: MultiplayerMatchState, userId: string, action: ClientAction, now = Date.now()): ActionResult {
  const seat = seatForUser(state, userId);
  if (!seat) return reject('NOT_A_PLAYER', 'You are not a player in this match.');
  if (state.kicked.includes(userId)) return reject('KICKED', 'You were removed from this match for missing too many turns.');
  const { match } = state;
  if (match.phase === 'complete') return reject('MATCH_COMPLETE', 'This match is over.');
  if (!action || typeof action !== 'object') return reject('INVALID_ACTION', 'Unknown action.');
  const matchActions = toMatchActions(action);
  if (!matchActions) return reject('INVALID_ACTION', 'Unknown or malformed action.');
  if (actingPlayerIndex(match) !== seat.playerIndex) return reject('NOT_YOUR_TURN', 'It is not your turn.');

  let next = match;
  try {
    for (const matchAction of matchActions) {
      const advanced = advanceMatch(next, matchAction);
      if (advanced === next) return reject('ILLEGAL_ACTION', 'That action is not allowed right now.');
      next = advanced;
    }
  } catch {
    return reject('ILLEGAL_ACTION', 'That action is not allowed right now.');
  }
  // Resuming after a decision can leave steps to walk; nobody needs to confirm those.
  next = settleMovement(next);
  return {
    ok: true,
    state: { ...state, match: next, actionAt: now, missedTurns: { ...state.missedTurns, [userId]: 0 } },
  };
}

/** Public view for a client: the canonical match plus who is acting. */
export function describeTurn(state: MultiplayerMatchState) {
  const index = actingPlayerIndex(state.match);
  return {
    currentPlayerIndex: index,
    currentUserId: state.seats.find((seat) => seat.playerIndex === index)?.userId ?? null,
    turnOrder: state.match.players.map((player, playerIndex) => ({
      playerIndex,
      playerId: player.playerId,
      userId: state.seats.find((seat) => seat.playerIndex === playerIndex)?.userId ?? null,
    })),
  };
}

export function createMultiplayerState(match: Match, userIdsBySlot: string[], now = Date.now()): MultiplayerMatchState {
  return {
    match,
    seats: match.players.map((player, playerIndex) => ({
      userId: userIdsBySlot[playerIndex],
      playerId: player.playerId,
      playerIndex,
    })),
    actionAt: now,
    missedTurns: {},
    missedMarks: {},
    kicked: [],
  };
}

/** Runs one reducer action for `index` as if that seat were a CPU, then hands control back to the human. */
function asAutopilot(match: Match, index: number, action: MatchAction): Match {
  const lent: Match = {
    ...match,
    players: match.players.map((player, i) => i === index ? { ...player, isCPU: true } : player),
  };
  const result = advanceMatch(lent, action);
  return {
    ...result,
    players: result.players.map((player, i) => i === index ? { ...player, isCPU: match.players[index].isCPU } : player),
  };
}

/** One autopilot step for the acting seat using the same reducer rules a human would face. */
function autopilotStep(match: Match, index: number): Match {
  switch (match.phase) {
    case 'ready': {
      const rolled = advanceMatch(match, { type: 'ROLL', result: serverRollDice() });
      return advanceMatch(rolled, { type: 'REVEAL' });
    }
    case 'rolling': return advanceMatch(match, { type: 'REVEAL' });
    case 'reveal': return settleMovement(advanceMatch(match, { type: 'MOVE' }));
    case 'moving': return settleMovement(match);
    case 'landed': return advanceMatch(match, { type: 'NEXT_TURN' });
    case 'decision':
    case 'endgame': return settleMovement(asAutopilot(match, index, { type: 'AUTO_DECIDE' }));
    default: return match;
  }
}

export interface AutoplayResult {
  state: MultiplayerMatchState;
  changed: boolean;
  newlyKicked: string[];
}

/**
 * Lazily enforces the idle rules: once the acting player has been silent for AUTOPLAY_AFTER_MS their
 * turn is played for them and counted as missed; MAX_MISSED_TURNS in a row removes them, after which
 * their seat is auto-played without waiting. Called on every poll/action, so no timers are needed.
 */
export function autoplayIfStale(initial: MultiplayerMatchState, now = Date.now()): AutoplayResult {
  let state = initial;
  let changed = false;
  const newlyKicked: string[] = [];
  for (let guard = 0; guard < 500 && state.match.phase !== 'complete'; guard += 1) {
    const index = actingPlayerIndex(state.match);
    const seat = state.seats.find((candidate) => candidate.playerIndex === index);
    if (!seat) break;
    const isKicked = state.kicked.includes(seat.userId);
    if (!isKicked && now - state.actionAt < AUTOPLAY_AFTER_MS) break;

    let { missedTurns, missedMarks, kicked } = state;
    const turnCounter = state.match.turnCounter;
    if (!isKicked && missedMarks[seat.userId] !== turnCounter) {
      const missed = (missedTurns[seat.userId] ?? 0) + 1;
      missedTurns = { ...missedTurns, [seat.userId]: missed };
      missedMarks = { ...missedMarks, [seat.userId]: turnCounter };
      if (missed >= MAX_MISSED_TURNS) {
        kicked = [...kicked, seat.userId];
        newlyKicked.push(seat.userId);
      }
    }

    // Play the acting seat's decisions until control moves to someone else or the turn ends.
    let match = state.match;
    let progressed = false;
    for (let step = 0; step < 400 && match.phase !== 'complete'; step += 1) {
      if (actingPlayerIndex(match) !== index || (step > 0 && match.turnCounter !== turnCounter)) break;
      const next = autopilotStep(match, index);
      if (next === match) break;
      match = next;
      progressed = true;
    }
    state = { ...state, match, missedTurns, missedMarks, kicked, actionAt: now };
    changed = true;
    if (!progressed) break;
  }
  return { state, changed, newlyKicked };
}
