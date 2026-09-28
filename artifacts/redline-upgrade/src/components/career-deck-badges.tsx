import type { CSSProperties } from 'react';
import type { Career } from '@/game/careers';
import { getDeck } from '@/game/decks';
import { SpaceIcon } from './space-icon';
import './career-deck-badges.css';

export function CareerDeckBadges({ career, compact = false }: { career: Career; compact?: boolean }) {
  const deckIds = [career.deckAffinity.primary, career.deckAffinity.secondary].filter(
    (deckId): deckId is NonNullable<typeof deckId> => Boolean(deckId),
  );
  const careerDecks = deckIds.map(getDeck);
  const primary = careerDecks[0];
  const secondary = careerDecks[1] ?? primary;
  const style = {
    '--career-deck-primary': primary?.color ?? '#d4e981',
    '--career-deck-secondary': secondary?.color ?? primary?.color ?? '#d4e981',
  } as CSSProperties;

  return (
    <div className={`career-deck-badges ${compact ? 'compact' : ''}`} style={style} aria-label={`Career decks: ${careerDecks.map((deck) => deck.name).join(', ')}`}>
      <span className="career-deck-heading mono">CAREER DECKS</span>
      <div className="career-deck-list">
        {careerDecks.map((deck) => (
          <span className="career-deck-badge" key={deck.id} style={{ '--deck-color': deck.color } as CSSProperties}>
            <SpaceIcon name={deck.icon} size={12} />
            {deck.name}
          </span>
        ))}
      </div>
      <small>Matching decks can trigger your career bonus.</small>
    </div>
  );
}