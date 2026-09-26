import { useState } from 'react';
import type { CharacterDefinition } from '@/game/characters';

const accentClasses = ['coral', 'amber', 'pink', 'green', 'blue', 'violet'];

function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path}`;
}

export function CharacterPiece({
  character,
  index,
  selected = false,
  className = '',
  compact = false,
}: {
  character: CharacterDefinition;
  index: number;
  selected?: boolean;
  className?: string;
  compact?: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const accent = accentClasses[index % accentClasses.length];

  return (
    <div
      className={`character-piece-stage ${compact ? 'compact' : ''} ${className}`}
      data-accent={accent}
      data-selected={selected}
      aria-label={`${character.name} 3D game piece`}
    >
      {!imageFailed ? (
        <div className="character-piece">
          <div className="piece-shadow" aria-hidden="true" />
          <div className="piece-extrusion piece-extrusion-back" aria-hidden="true">
            <img src={assetUrl(character.imagePath)} alt="" />
          </div>
          <div className="piece-extrusion piece-extrusion-mid" aria-hidden="true">
            <img src={assetUrl(character.imagePath)} alt="" />
          </div>
          <div className="piece-face">
            <img
              src={assetUrl(character.imagePath)}
              alt={`${character.name} character artwork`}
              onError={() => setImageFailed(true)}
            />
          </div>
          <div className="piece-base" aria-hidden="true">
            <span />
          </div>
        </div>
      ) : (
        <div className="piece-missing">
          <span>ARTWORK</span>
          <small>PENDING</small>
        </div>
      )}
    </div>
  );
}