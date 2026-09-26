import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Player } from './player';
import { advanceMatch, createMatch, rollD4, type Match, type MatchAction } from './match';

interface GameStateValue {
  player: Player | null;
  match: Match | null;
  startNewGame: () => void;
  confirmCharacter: (characterId: string) => void;
  dispatchMatch: (action: MatchAction) => void;
  rollDice: () => void;
}

const GameContext = createContext<GameStateValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const startNewGame = useCallback(() => {
    setPlayer(null);
    setMatch(null);
  }, []);
  const confirmCharacter = useCallback((characterId: string) => {
    const nextMatch = createMatch(characterId);
    setPlayer(nextMatch.players[0]);
    setMatch(nextMatch);
  }, []);
  const dispatchMatch = useCallback((action: MatchAction) => {
    setMatch((current) => current ? advanceMatch(current, action) : null);
  }, []);
  const rollDice = useCallback(() => {
    const die1 = rollD4();
    const die2 = rollD4();
    dispatchMatch({ type: 'ROLL', result: { die1, die2, total: die1 + die2 } });
  }, [dispatchMatch]);
  const value = useMemo(
    () => ({ player, match, startNewGame, confirmCharacter, dispatchMatch, rollDice }),
    [player, match, startNewGame, confirmCharacter, dispatchMatch, rollDice],
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