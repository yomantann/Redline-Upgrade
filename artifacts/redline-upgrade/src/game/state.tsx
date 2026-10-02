import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
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
  const dispatchMatch = useCallback((action: MatchAction) => {
    setMatch((current) => current ? advanceMatch(current, action) : null);
  }, []);
  const rollDice = useCallback(() => {
    const die1 = rollD4();
    const die2 = rollD4();
    dispatchMatch({ type: 'ROLL', result: { die1, die2, total: die1 + die2, doubles: die1 === die2 } });
  }, [dispatchMatch]);
  const value = useMemo(
    () => ({ player, match, selectedBoardId, selectedGameMode, selectBoard, selectGameMode, careerRevealed, acknowledgeCareer, startNewGame, confirmCharacter, beginGame, dispatchMatch, rollDice }),
    [player, match, selectedBoardId, selectedGameMode, selectBoard, selectGameMode, careerRevealed, acknowledgeCareer, startNewGame, confirmCharacter, beginGame, dispatchMatch, rollDice],
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