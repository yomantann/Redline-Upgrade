import type { CharacterDefinition } from '@/game/characters';
import type { Career } from '@/game/careers';

function AbilityBlock({
  type,
  name,
  description,
}: {
  type: 'CAREER' | 'CHARACTER';
  name: string;
  description: string;
}) {
  return (
    <div className={`game-player-ability game-player-ability-${type.toLowerCase()}`}>
      <span className="mono">{type} ABILITY</span>
      <strong>{name}</strong>
      <p title={description}>{description}</p>
    </div>
  );
}

export function PlayerAbilityDetails({
  career,
  character,
}: {
  career?: Career;
  character?: CharacterDefinition;
}) {
  return (
    <section className="game-player-abilities" aria-label="Player abilities">
      {career && (
        <AbilityBlock
          type="CAREER"
          name={career.abilityName}
          description={career.abilityDescription}
        />
      )}
      {character && (
        <AbilityBlock
          type="CHARACTER"
          name={character.abilityName}
          description={character.abilityDescription}
        />
      )}
    </section>
  );
}