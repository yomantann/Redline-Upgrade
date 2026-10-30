import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  getActiveSoloGame,
  getAchievementProfile,
  startSoloGame,
  submitMatchAction,
  submitSoloGameAction,
  ApiError,
  type MatchSnapshot,
  type SoloGameSnapshot,
} from '@workspace/api-client-react';
import { AUTH_USER_UPDATED_EVENT } from '@workspace/replit-auth-web';
import { toClientAction } from './multiplayer';
import type { Player } from './player';
import { createPlayer } from './player';
import { advanceMatch, createMatch, rollD4, type Match, type MatchAction } from './match';
import { DEFAULT_BOARD_ID, findBoardDefinition, getBoardDefinition, type BoardId, type GameMode } from './boards';

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
  beginGame: () => Promise<boolean>;
  dispatchMatch: (action: MatchAction) => void;
  rollDice: () => void;
  /** Set while a server-authoritative multiplayer match is shown; `match` then mirrors the server. */
  remote: RemoteInfo | null;
  remoteError: string | null;
  /** False while polling the server is failing (connection lost); cleared on the next successful poll. */
  remoteConnected: boolean;
  newAchievementIds: string[];
  setRemoteConnected: (connected: boolean) => void;
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
  pausedAt: number | null;
  abandoned: boolean;
  seats: MatchSnapshot['seats'];
}

const GameContext = createContext<GameStateValue | null>(null);

function getInitialBoardId(): BoardId {
  if (typeof window === 'undefined') return DEFAULT_BOARD_ID;
  try {
    const requested = new URLSearchParams(window.location.search).get('board')
      ?? window.sessionStorage.getItem('redline-upgrade:selected-board');
    const board = requested ? findBoardDefinition(requested) : undefined;
    return board?.playable ? board.id : DEFAULT_BOARD_ID;
  } catch {
    return DEFAULT_BOARD_ID;
  }
}

export function GameProvider({
  children,
  accountId,
  authLoading = false,
}: {
  children: ReactNode;
  accountId: string | null;
  authLoading?: boolean;
}) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [selectedBoardId, setSelectedBoardId] = useState<BoardId>(getInitialBoardId);
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode | null>(null);
  const [careerRevealed, setCareerRevealed] = useState(false);
  const [soloSnapshot, setSoloSnapshot] = useState<SoloGameSnapshot | null>(null);
  const soloSnapshotRef = useRef<SoloGameSnapshot | null>(null);
  const soloSendChain = useRef<Promise<void>>(Promise.resolve());
  const [newAchievementIds, setNewAchievementIds] = useState<string[]>([]);
  const [snapshot, setSnapshot] = useState<MatchSnapshot | null>(null);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [remoteConnected, setRemoteConnected] = useState(true);
  const snapshotRef = useRef<MatchSnapshot | null>(null);
  const sendChain = useRef<Promise<void>>(Promise.resolve());
  const previousAccountIdRef = useRef(accountId);
  useEffect(() => {
    if (authLoading || previousAccountIdRef.current === accountId) return;
    previousAccountIdRef.current = accountId;
    setPlayer(null);
    setMatch(null);
    setCareerRevealed(false);
    soloSnapshotRef.current = null;
    setSoloSnapshot(null);
    setNewAchievementIds([]);
    snapshotRef.current = null;
    setSnapshot(null);
    setRemoteError(null);
    setRemoteConnected(true);
    soloSendChain.current = Promise.resolve();
    sendChain.current = Promise.resolve();
  }, [authLoading, accountId]);
  const selectBoard = useCallback((boardId: BoardId) => {
    setSelectedBoardId(boardId);
    setSelectedGameMode(null);
    try {
      window.sessionStorage.setItem('redline-upgrade:selected-board', boardId);
    } catch {
      // Board selection still works in browsers that block session storage.
    }
  }, []);
  const selectGameMode = useCallback((mode: GameMode) => setSelectedGameMode(mode), []);
  const acknowledgeCareer = useCallback(() => setCareerRevealed(true), []);
  const startNewGame = useCallback(() => {
    setPlayer(null);
    setMatch(null);
    setCareerRevealed(false);
    soloSnapshotRef.current = null;
    setSoloSnapshot(null);
    setNewAchievementIds([]);
    setSelectedGameMode('SINGLE_PLAYER');
  }, []);
  const confirmCharacter = useCallback((characterId: string) => {
    setPlayer(createPlayer(characterId, 'You'));
    setMatch(null);
    setCareerRevealed(false);
  }, []);
  const setSoloGameSnapshot = useCallback((next: SoloGameSnapshot | null) => {
    if (
      next
      && soloSnapshotRef.current?.gameId === next.gameId
      && next.version < soloSnapshotRef.current.version
    ) return;
    soloSnapshotRef.current = next;
    setSoloSnapshot(next);
    if (next) {
      const serverMatch = next.match as unknown as Match;
      setMatch(serverMatch);
      setPlayer(serverMatch.players[0] ?? null);
      if (next.newlyUnlocked.length) setNewAchievementIds(next.newlyUnlocked);
    }
  }, []);
  useEffect(() => {
    if (authLoading || !accountId) return;
    let cancelled = false;
    getActiveSoloGame()
      .then(({ game }) => {
        if (!cancelled && game) setSoloGameSnapshot(game);
      })
      .catch(() => {
        // Starting a new game remains available; the server reports persistent-game errors on actions.
      });
    return () => { cancelled = true; };
  }, [authLoading, accountId, setSoloGameSnapshot]);
  useEffect(() => {
    if (authLoading || !accountId) return;
    let cancelled = false;
    const refreshActiveGameName = () => {
      void getActiveSoloGame()
        .then(({ game }) => { if (!cancelled && game) setSoloGameSnapshot(game); })
        .catch(() => {});
    };
    window.addEventListener(AUTH_USER_UPDATED_EVENT, refreshActiveGameName);
    return () => {
      cancelled = true;
      window.removeEventListener(AUTH_USER_UPDATED_EVENT, refreshActiveGameName);
    };
  }, [authLoading, accountId, setSoloGameSnapshot]);
  const achievementLookupRef = useRef<string | null>(null);
  useEffect(() => {
    const completedMatch = snapshot?.match as unknown as Match | undefined;
    if (!accountId || !snapshot || completedMatch?.phase !== 'complete') return;
    const lookupKey = `${snapshot.roomId}:${snapshot.version}`;
    if (achievementLookupRef.current === lookupKey) return;
    achievementLookupRef.current = lookupKey;
    let cancelled = false;
    getAchievementProfile()
      .then((profile) => {
        if (cancelled) return;
        const history = profile.history.find((game) => game.source === 'MULTIPLAYER' && game.gameId === snapshot.roomId);
        setNewAchievementIds(history?.unlockedAchievementIds ?? []);
      })
      .catch(() => {
        achievementLookupRef.current = null;
      });
    return () => { cancelled = true; };
  }, [accountId, snapshot?.roomId, snapshot?.version, snapshot?.match]);

  const beginGame = useCallback(async () => {
    if (!player) return false;
    if (match) return true;
    if (!getBoardDefinition(selectedBoardId).playable || selectedGameMode === 'MULTIPLAYER') return false;
    if (accountId) {
      try {
        const started = await startSoloGame({ boardId: selectedBoardId, characterId: player.characterId });
        setRemoteError(null);
        setSoloGameSnapshot(started);
        return true;
      } catch (error) {
        const data = error instanceof ApiError ? (error.data as { error?: string } | null) : null;
        setRemoteError(data?.error ?? 'Could not start a saved game. Please try again.');
        return false;
      }
    }
    const nextMatch = createMatch(player.characterId, selectedBoardId, selectedGameMode ?? 'SINGLE_PLAYER');
    setPlayer(nextMatch.players[0]);
    setMatch(nextMatch);
    setCareerRevealed(false);
    return true;
  }, [player, match, selectedBoardId, selectedGameMode, accountId, setSoloGameSnapshot]);
  const setRemoteSnapshot = useCallback((next: MatchSnapshot | null) => {
    // Never go backwards: a slow poll must not overwrite a newer action response.
    if (next && snapshotRef.current && next.roomId === snapshotRef.current.roomId && next.version < snapshotRef.current.version) return;
    snapshotRef.current = next;
    setSnapshot(next);
    if (!next) { setRemoteError(null); setRemoteConnected(true); }
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
    pausedAt: snapshot.pausedAt,
    abandoned: snapshot.abandoned,
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
    const currentSolo = soloSnapshotRef.current;
    if (currentSolo) {
      const clientAction = toClientAction(action);
      if (!clientAction) return;
      soloSendChain.current = soloSendChain.current.then(async () => {
        const latest = soloSnapshotRef.current;
        if (!latest) return;
        try {
          const next = await submitSoloGameAction(latest.gameId, {
            action: clientAction,
            expectedVersion: latest.version,
          });
          setRemoteError(null);
          setSoloGameSnapshot(next);
        } catch (error) {
          const data = error instanceof ApiError ? (error.data as { error?: string } | null) : null;
          setRemoteError(data?.error ?? 'Could not save this game action.');
        }
      });
      return;
    }
    setMatch((existing) => existing ? advanceMatch(existing, action) : null);
  }, [setRemoteSnapshot, setSoloGameSnapshot]);
  const rollDice = useCallback(() => {
    const die1 = rollD4();
    const die2 = rollD4();
    dispatchMatch({ type: 'ROLL', result: { die1, die2, total: die1 + die2, doubles: die1 === die2 } });
  }, [dispatchMatch]);
  const shownMatch = remoteMatch ?? match;
  const value = useMemo(
    () => ({ player, match: shownMatch, remote, remoteError, remoteConnected, newAchievementIds, setRemoteConnected, setRemoteSnapshot, selectedBoardId, selectedGameMode, selectBoard, selectGameMode, careerRevealed, acknowledgeCareer, startNewGame, confirmCharacter, beginGame, dispatchMatch, rollDice }),
    [player, shownMatch, remote, remoteError, remoteConnected, newAchievementIds, setRemoteConnected, setRemoteSnapshot, selectedBoardId, selectedGameMode, selectBoard, selectGameMode, careerRevealed, acknowledgeCareer, startNewGame, confirmCharacter, beginGame, dispatchMatch, rollDice],
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