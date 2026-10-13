import { useEffect, useState } from 'react';
import type { CharacterDefinition } from '@/game/characters';
import { getPublicAssetUrl } from '@/lib/public-asset-url';

/** The original artwork stays in player-facing UI, never as pawn geometry. */
export function CharacterPortrait({
  character,
  imagePath = character.imagePath,
  className = '',
}: {
  character: CharacterDefinition;
  imagePath?: string;
  className?: string;
}) {
  const imageKey = `${character.id}:${imagePath}`;
  const [failedImageKey, setFailedImageKey] = useState<string | null>(null);
  const failed = failedImageKey === imageKey;
  useEffect(() => {
    setFailedImageKey(null);
  }, [imageKey]);
  return (
    <div className={`character-portrait ${className}`} data-testid={`portrait-${character.id}`}>
      {failed ? (
        <span className="portrait-error">Portrait unavailable</span>
      ) : (
        <img
          src={getPublicAssetUrl(imagePath)}
          alt={`${character.name} artwork`}
          loading="eager"
          decoding="async"
          onError={() => setFailedImageKey(imageKey)}
        />
      )}
    </div>
  );
}