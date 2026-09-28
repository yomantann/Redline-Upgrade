import { getCharacter } from '../game/characters';
import type { EndgameAttributeBonus, MatchPlayer } from '../game/match';
import './endgame-attribute-bonus-summary.css';

interface EndgameAttributeBonusSummaryProps {
  awards: readonly EndgameAttributeBonus[] | null;
  players: readonly MatchPlayer[];
}

export function EndgameAttributeBonusSummary({ awards, players }: EndgameAttributeBonusSummaryProps) {
  if (!awards?.length) return null;

  return (
    <section className="endgame-attribute-bonus-summary" aria-labelledby="attribute-bonus-title">
      <header className="endgame-attribute-bonus-heading">
        <span className="mono">FINAL ATTRIBUTE LEADERS / WEALTH REWARD</span>
        <h2 id="attribute-bonus-title">Four leaders. Four $50K awards.</h2>
      </header>
      <div className="endgame-attribute-bonus-grid">
        {awards.map((award) => {
          const player = players[award.playerIndex];
          const character = player ? getCharacter(player.characterId) : undefined;
          return (
            <article className="endgame-attribute-bonus-card" key={award.attribute}>
              <span className="mono">{award.label}</span>
              <strong>{character?.name ?? player?.displayName ?? `Player ${award.playerIndex + 1}`}</strong>
              <div className="endgame-attribute-bonus-result">
                <span className="mono">LEADING VALUE / {award.value.toLocaleString()}</span>
                <b>+${(award.amount / 1000).toFixed(0)}K</b>
              </div>
            </article>
          );
        })}
      </div>
      <p>
        Ties go to the player who finished earlier. If finish order cannot distinguish tied leaders,
        the lower player slot wins.
      </p>
    </section>
  );
}