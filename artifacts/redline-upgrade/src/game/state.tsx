import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { submitMatchAction, ApiError, type MatchSnapshot } from '@workspace/api-client-react';
import { toClientAction } from './multiplayer';
import type { Player } from './player';
import { createPlayer } from './player';
import { advanceMatch, createMatch, rollD4, type Match, type MatchAction } from './match';
import { DEFAULT_BOARD_ID, type BoardId, type GameMode } from './boards';

interface GameStateValue {
  player: Player | null;
  match: Match | null;
  selectedBoardId: BoardId;
  selectedGameMode: GameMode | null;
  selectBoard: (boardId: BoardId) => void;
  selectGameMode: (mode: GameMode) => void;
  careerRevealed: boolean;
  acknowledgeCareer: () => void;
  startNewGame: () => void;
  confirmCharacter: (characterId: string) => void;
  beginGame: () => void;
  dispatchMatch: (action: MatchAction) => void;
  rollDice: () => void;
  /** Set while a server-authoritative multiplayer match is shown; `match` then mirrors the server. */
  remote: RemoteInfo | null;
  remoteError: string | null;
  setRemoteSnapshot: (snapshot: MatchSnapshot | null) => void;
}

export interface RemoteInfo {
  roomId: string;
  version: number;
  youIndex: number;
  currentPlayerIndex: number;
  actionAt: number;
  autoplayAfterMs: number;
  maxMissedTurns: number;
  seats: MatchSnapshot['seats'];
}

const GameContext = createContext<GameStateValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [selectedBoardId, setSelectedBoardId] = useState<BoardId>(DEFAULT_BOARD_ID);
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode | null>(null);
  const [careerRevealed, setCareerRevealed] = useState(false);
  const selectBoard = useCallback((boardId: BoardId) => {
    setSelectedBoardId(boardId);
    setSelectedGameMode(null);
  }, []);
  const selectGameMode = useCallback((mode: GameMode) => setSelectedGameMode(mode), []);
  const acknowledgeCareer = useCallback(() => setCareerRevealed(true), []);
  const startNewGame = useCallback(() => {
    setPlayer(null);
    setMatch(null);
    setCareerRevealed(false);
    setSelectedGameMode('SINGLE_PLAYER');
  }, []);
  const confirmCharacter = useCallback((characterId: string) => {
    setPlayer(createPlayer(characterId, 'You'));
    setMatch(null);
    setCareerRevealed(false);
  }, []);
  const beginGame = useCallback(() => {
    if (!player || match) return;
    if (selectedBoardId !== DEFAULT_BOARD_ID || selectedGameMode === 'MULTIPLAYER') return;
    const nextMatch = createMatch(player.characterId, selectedBoardId, selectedGameMode ?? 'SINGLE_PLAYER');
    setPlayer(nextMatch.players[0]);
    setMatch(nextMatch);
    setCareerRevealed(false);
  }, [player, match, selectedBoardId, selectedGameMode]);
  const [snapshot, setSnapshot] = useState<MatchSnapshot | null>(null);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const snapshotRef = useRef<MatchSnapshot | null>(null);
  const sendChain = useRef<Promise<void>>(Promise.resolve());
  const setRemoteSnapshot = useCallback((next: MatchSnapshot | null) => {
    // Never go backwards: a slow poll must not overwrite a newer action response.
    if (next && snapshotRef.current && next.roomId === snapshotRef.current.roomId && next.version < snapshotRef.current.version) return;
    snapshotRef.current = next;
    setSnapshot(next);
    if (!next) setRemoteError(null);
  }, []);
  const remoteMatch = useMemo<Match | null>(() => {
    if (!snapshot) return null;
    const source = snapshot.match as unknown as Match;
    // Seats other than yours are rendered by the existing UI as non-interactive "other players".
    return { ...source, players: source.players.map((candidate, index) => ({ ...candidate, isCPU: index !== snapshot.you.playerIndex })) };
  }, [snapshot]);
  const remote = useMemo<RemoteInfo | null>(() => snapshot ? {
    roomId: snapshot.roomId,
    version: snapshot.version,
    youIndex: snapshot.you.playerIndex,
    currentPlayerIndex: snapshot.currentPlayerIndex,
    actionAt: snapshot.actionAt,
    autoplayAfterMs: snapshot.autoplayAfterMs,
    maxMissedTurns: snapshot.maxMissedTurns,
    seats: snapshot.seats,
  } : null, [snapshot]);
  const dispatchMatch = useCallback((action: MatchAction) => {
    const current = snapshotRef.current;
    if (current) {
      const clientAction = toClientAction(action);
      if (!clientAction) return;
      // Requests are sent one at a time, each against the newest known version, so rapid clicks or
      // timers never race each other into stale-version errors.
      sendChain.current = sendChain.current.then(async () => {
        const latest = snapshotRef.current;
        if (!latest) return;
        try {
          const next = await submitMatchAction(latest.roomId, { action: clientAction, expectedVersion: latest.version });
          setRemoteError(null);
          setRemoteSnapshot(next);
        } catch (error) {
          const data = error instanceof ApiError ? (error.data as { error?: string } | null) : null;
          setRemoteError(data?.error ?? 'Could not reach the server.');
        }
      });
      return;
    }
    setMatch((existing) => existing ? advanceMatch(existing, action) : null);
  }, [setRemoteSnapshot]);
  const rollDice = useCallback(() => {
    const die1 = rollD4();
    const die2 = rollD4();
    dispatchMatch({ type: 'ROLL', result: { die1, die2, total: die1 + die2, doubles: die1 === die2 } });
  }, [dispatchMatch]);
  const shownMatch = remoteMatch ?? match;
  const value = useMemo(
    () => ({ player, match: shownMatch, remote, remoteError, setRemoteSnapshot, selectedBoardId, selectedGameMode, selectBoard, selectGameMode, careerRevealed, acknowledgeCareer, startNewGame, confirmCharacter, beginGame, dispatchMatch, rollDice }),
    [player, shownMatch, remote, remoteError, setRemoteSnapshot, selectedBoardId, selectedGameMode, selectBoard, selectGameMode, careerRevealed, acknowledgeCareer, startNewGame, confirmCharacter, beginGame, dispatchMatch, rollDice],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameStateValue {
  const value = useContext(GameContext);
  if (!value) {
    throw new Error('useGame must be used within GameProvider');
  }
  return value;
}