import { useEffect, useState } from 'react';
import type { CharacterDefinition } from '@/game/characters';
import { getPublicAssetUrl } from '@/lib/public-asset-url';

/** The original artwork stays in player-facing UI, never as pawn geometry. */
export function CharacterPortrait({
  character,
  className = '',
}: {
  character: CharacterDefinition;
  className?: string;
}) {
  const [failedCharacterId, setFailedCharacterId] = useState<string | null>(null);
  const failed = failedCharacterId === character.id;
  useEffect(() => {
    setFailedCharacterId(null);
  }, [character.id]);
  return (
    <div className={`character-portrait ${className}`} data-testid={`portrait-${character.id}`}>
      {failed ? (
        <span className="portrait-error">Portrait unavailable</span>
      ) : (
        <img
          src={getPublicAssetUrl(character.imagePath)}
          alt={`${character.name} artwork`}
          loading="eager"
          decoding="async"
          onError={() => setFailedCharacterId(character.id)}
        />
      )}
    </div>
  );
}