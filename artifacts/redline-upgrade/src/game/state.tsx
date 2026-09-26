import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { createPlayer, type Player } from './player';

interface GameStateValue {
  player: Player | null;
  startNewGame: () => void;
  confirmCharacter: (characterId: string) => void;
}

const GameContext = createContext<GameStateValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<Player | null>(null);
  const startNewGame = useCallback(() => setPlayer(null), []);
  const confirmCharacter = useCallback((characterId: string) => {
    setPlayer(createPlayer(characterId));
  }, []);
  const value = useMemo(
    () => ({ player, startNewGame, confirmCharacter }),
    [player, startNewGame, confirmCharacter],
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