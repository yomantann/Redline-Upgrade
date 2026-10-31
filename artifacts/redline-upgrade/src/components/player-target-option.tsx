import { getCharacter } from '@/game/characters';
import type { BoardId } from '@/game/boards';
import type { MatchPlayer } from '@/game/match';
import { getCareer } from '@/game/careers';
import { CharacterPortrait } from './character-portrait';
import './player-target-option.css';

export function PlayerTargetOption({
  player,
  boardId,
  selected,
  disabled = false,
  onSelect,
}: {
  player: MatchPlayer;
  boardId: BoardId;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  const character = getCharacter(player.characterId);
  const career = player.careerId ? getCareer(player.careerId) : undefined;
  const assetCount = Object.values(player.equipment).filter(Boolean).length;
  return (
    <button
      type="button"
      className={`player-target-option ${selected ? 'selected' : ''}`}
      aria-pressed={selected}
      aria-label={`Select ${player.displayName}, ${character?.name ?? 'character'}, wealth ${player.wealth.toLocaleString()}, ${assetCount} assets`}
      disabled={disabled}
      onClick={onSelect}
      data-testid={`button-target-player-${player.playerId}`}
    >
      {character && (
        <CharacterPortrait
          character={character}
          imagePath={player.portraitImagePath ?? undefined}
          logoPath={player.playerLogoPath}
          boardId={boardId}
          className="player-target-option-portrait"
        />
      )}
      <span className="player-target-option-copy">
        <strong>{player.displayName}</strong>
        <span>{character?.name ?? 'Character'} · {career?.name ?? 'Career'}</span>
        <small>WEALTH ${player.wealth.toLocaleString()} · {assetCount} ASSET{assetCount === 1 ? '' : 'S'} · SPACE {player.position}</small>
      </span>
      <span className="player-target-option-check" aria-hidden="true">{selected ? '✓' : '+'}</span>
    </button>
  );
}
