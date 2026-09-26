import { useState } from 'react';
import type { CharacterDefinition } from '@/game/characters';

/** The original artwork stays in player-facing UI, never as pawn geometry. */
export function CharacterPortrait({
  character,
  className = '',
}: {
  character: CharacterDefinition;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`character-portrait ${className}`} data-testid={`portrait-${character.id}`}>
      {failed ? (
        <span className="portrait-error">Portrait unavailable</span>
      ) : (
        <img
          src={`${import.meta.env.BASE_URL}${character.imagePath}`}
          alt={`${character.name} artwork`}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}