import { useEffect, useState } from 'react';
import { getCharacterImagePath, type CharacterDefinition } from '@/game/characters';
import type { BoardId } from '@/game/boards';
import { getPublicAssetUrl } from '@/lib/public-asset-url';

/** The original artwork stays in player-facing UI, never as pawn geometry. */
export function CharacterPortrait({
  character,
  imagePath,
  logoPath,
  boardId = 'REDLINE_UPGRADE',
  className = '',
}: {
  character: CharacterDefinition;
  imagePath?: string;
  logoPath?: string | null;
  boardId?: BoardId;
  className?: string;
}) {
  const resolvedImagePath = imagePath ?? getCharacterImagePath(character.id, boardId);
  const imageKey = `${character.id}:${resolvedImagePath}`;
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
          src={getPublicAssetUrl(resolvedImagePath)}
          alt={`${character.name} artwork`}
          loading="eager"
          decoding="async"
          onError={() => setFailedImageKey(imageKey)}
        />
      )}
      {logoPath && <img className="character-player-logo" src={getPublicAssetUrl(logoPath)} alt="" aria-hidden="true" />}
    </div>
  );
}