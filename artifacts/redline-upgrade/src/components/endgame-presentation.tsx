import type { CardDefinition } from '@/game/cards';
import { getCardArtworkUrl } from '@/game/card-artwork';
import { getAsset, type AssetSlot } from '@/game/assets';
import { AssetArtwork } from './asset-artwork';
import { formatMoney, getCareer, getCategory, SALARY_TIERS } from '@/game/careers';
import { getCharacter } from '@/game/characters';
import type { Match } from '@/game/match';
import { effectiveSalaryAmount, type Player } from '@/game/player';
import { CharacterPortrait } from './character-portrait';
import { RedlineCard } from './redline-card';
import './endgame-presentation.css';

export interface EndgameAchievement {
  id: string;
  title: string;
  description?: string;
  /** Future engines can mark a supplied achievement as locked without the view inventing a state. */
  unlocked?: boolean;
}

export type FinalGamble =
  | CardDefinition
  | {
      card: CardDefinition;
      result?: string | null;
    };

export interface EndgamePresentationProps {
  player: Player;
  match: Match;
  finalTitle?: string | null;
  redlineCredits?: number | null;
  achievements?: readonly EndgameAchievement[] | null;
  finalGamble?: FinalGamble | null;
  /** Kept separate for engines that pass a card and its resolution as sibling values. */
  finalGambleResult?: string | null;
}

const assetSlots: readonly {
  slot: AssetSlot;
  label: string;
  eyebrow: string;
}[] = [
  { slot: 'car', label: 'CAR', eyebrow: 'MILESTONE 01' },
  { slot: 'lifestyle', label: 'LIFESTYLE', eyebrow: 'MILESTONE 02' },
  { slot: 'companion', label: 'PET / INVESTMENT', eyebrow: 'MILESTONE 03' },
  { slot: 'property', label: 'PROPERTY', eyebrow: 'MILESTONE 04' },
];

function formatStat(value: number) {
  return value.toLocaleString();
}

function StatBlock({ label, value, accent, money }: { label: string; value: number; accent?: boolean; money?: boolean }) {
  return (
    <div className={`endgame-stat ${accent ? 'accent' : ''}`}>
      <span className="mono endgame-stat-label">{label}</span>
      <strong data-testid={`endgame-stat-${label.toLowerCase().replaceAll(' ', '-')}`}>
        {money ? formatMoney(value) : formatStat(value)}
      </strong>
    </div>
  );
}

function AssetTrophy({ slot, label, eyebrow, assetId, assetLevel }: (typeof assetSlots)[number] & { assetId: string | null; assetLevel: number }) {
  const asset = assetId ? getAsset(assetId) : undefined;
  const level = asset ? Math.max(1, Math.min(4, assetLevel)) as 1 | 2 | 3 | 4 : 1;

  return (
    <article className={`endgame-trophy ${asset ? 'collected' : 'uncollected'}`} data-testid={`endgame-asset-${slot}`}>
      <div className="endgame-trophy-top">
        <span className="mono">{eyebrow}</span>
        <span className="endgame-trophy-notch" aria-hidden="true" />
      </div>
      <div className="endgame-trophy-art" data-category={asset?.category ?? slot}>
          {asset ? (
           <AssetArtwork assetId={asset.id} level={level} className="endgame-trophy-image" />
        ) : (
          <span className="endgame-trophy-mark" aria-hidden="true">—</span>
        )}
        {!asset && <span className="mono endgame-trophy-pending">OPEN SLOT</span>}
      </div>
      <div className="endgame-trophy-copy">
        <span className="mono">{label}{asset ? ` / LEVEL ${level}` : ''}</span>
        <strong data-testid={`endgame-asset-name-${slot}`}>{asset?.name ?? 'NOT ACQUIRED'}</strong>
        {asset && <small>{asset.description}</small>}
      </div>
    </article>
  );
}

function FinalGambleReveal({
  finalGamble,
  finalGambleResult,
}: {
  finalGamble?: FinalGamble | null;
  finalGambleResult?: string | null;
}) {
  if (!finalGamble) {
    return (
      <section className="endgame-panel endgame-gamble-panel" aria-labelledby="endgame-gamble-heading">
        <div className="endgame-panel-heading">
          <span className="eyebrow">FINAL GAMBLE // UNREVEALED</span>
          <span className="mono">CARD DATA PENDING</span>
        </div>
        <div className="endgame-gamble-pending">
          <span className="endgame-pending-cross" aria-hidden="true" />
          <h2 id="endgame-gamble-heading" className="display">The last<br />draw waits.</h2>
          <p>Final Gamble card data will appear here when the engine supplies it.</p>
        </div>
      </section>
    );
  }

  const card = 'card' in finalGamble ? finalGamble.card : finalGamble;
  const result = 'card' in finalGamble ? finalGamble.result ?? finalGambleResult : finalGambleResult;
  const artwork = getCardArtworkUrl(card.id);

  return (
    <section className="endgame-panel endgame-gamble-panel" aria-labelledby="endgame-gamble-heading">
      <div className="endgame-panel-heading">
        <span className="eyebrow">FINAL GAMBLE // REVEALED</span>
        <span className="mono">{card.deck.toUpperCase()} / {card.rarity}</span>
      </div>
      <div className="endgame-gamble-content">
        <div className="endgame-gamble-art" aria-hidden="true">
          {artwork ? <img src={artwork} alt="" loading="lazy" /> : <span>{card.artCue}</span>}
        </div>
        <div className="endgame-gamble-copy">
          <span className="mono signal">CARD // {card.id}</span>
          <h2 id="endgame-gamble-heading" data-testid="endgame-gamble-name">{card.title}</h2>
          <p>{card.description}</p>
          <div className="endgame-gamble-effect">
            <span className="mono">EFFECT</span>
            <strong data-testid="endgame-gamble-effect">{card.effect}</strong>
            <span className="endgame-gamble-value">{card.value}</span>
          </div>
          <div className={`endgame-gamble-result ${result ? 'resolved' : 'pending'}`} data-testid="endgame-gamble-result">
            <span className="mono">RESULT</span>
            <strong>{result ?? 'RESULT PENDING'}</strong>
          </div>
        </div>
        <RedlineCard deck={card.deck} face="front" card={card} className="endgame-gamble-card" />
      </div>
    </section>
  );
}

function ChoiceRail() {
  return (
    <section className="endgame-choice-panel" aria-labelledby="endgame-choice-heading">
      <div className="endgame-panel-heading">
        <span className="eyebrow">CLOSING DECISION // VISUAL ONLY</span>
        <span className="mono">NO ACTION ACTIVE</span>
      </div>
      <h2 id="endgame-choice-heading" className="display endgame-choice-heading">How does<br /><span>the run close?</span></h2>
      <div className="endgame-choice-rail" aria-label="Closing decision choices">
        <div className="endgame-choice cash-out" data-testid="endgame-choice-cash-out">
          <span className="mono">01 / SECURE THE LINE</span>
          <strong>CASH OUT</strong>
          <small>Lock the life you built.</small>
        </div>
        <div className="endgame-choice double-down" data-testid="endgame-choice-double-down">
          <span className="mono">02 / PRESS THE EDGE</span>
          <strong>DOUBLE DOWN</strong>
          <small>Put the record back on the table.</small>
        </div>
        <div className="endgame-choice grab-gamble" data-testid="endgame-choice-grab-gamble">
          <span className="mono">03 / TAKE THE UNKNOWN</span>
          <strong>GRAB GAMBLE CARD</strong>
          <small>One more draw before the lights.</small>
        </div>
      </div>
    </section>
  );
}

export function EndgamePresentation({
  player,
  match,
  finalTitle,
  redlineCredits,
  achievements,
  finalGamble,
  finalGambleResult,
}: EndgamePresentationProps) {
  const character = getCharacter(player.characterId);
  const career = player.careerId ? getCareer(player.careerId) : undefined;
  const secondCareer = player.secondCareer ? getCareer(player.secondCareer.careerId) : undefined;
  const category = career ? getCategory(career.categoryId) : undefined;
  const matchPlayer = match.players.find((entry) => entry.playerId === player.playerId);
  const paydayTier = player.secondCareer && player.secondCareer.salaryAmount > player.salaryAmount
    ? player.secondCareer.salaryTier
    : player.salaryTier;
  const tierIndex = Math.max(0, Math.min(SALARY_TIERS.length - 1, paydayTier - 1));
  const hasAchievements = achievements !== null && achievements !== undefined;

  return (
    <main className="endgame-page">
      <header className="endgame-masthead">
        <div>
          <span className="eyebrow">REDLINE UPGRADE // ENDGAME</span>
          <h1 className="display endgame-page-title">The life<br /><span>you made.</span></h1>
        </div>
        <div className="endgame-masthead-meta mono">
          <span>FINAL FRAME / {String(match.players.length).padStart(2, '0')} PLAYERS</span>
          <span>{matchPlayer?.isCPU ? 'CPU RECORD' : 'LOCAL PLAYER RECORD'}</span>
        </div>
      </header>

      <section className="endgame-identity" aria-labelledby="endgame-identity-heading">
        <div className="endgame-portrait-wrap">
          {character ? (
            <CharacterPortrait character={character} className="endgame-portrait" />
          ) : (
            <div className="endgame-portrait-fallback" aria-label="Portrait unavailable">NO PORTRAIT</div>
          )}
          <span className="mono endgame-portrait-caption">IDENTITY / {player.characterId}</span>
        </div>
        <div className="endgame-identity-copy">
          <span className="mono signal">PLAYER RECORD // {player.displayName}</span>
          <h2 id="endgame-identity-heading" className="display endgame-identity-name" data-testid="endgame-identity-name">
            {character?.name ?? player.displayName}
          </h2>
          <div className="endgame-career-line">
            <span className="mono">CAREER / CATEGORY</span>
            <strong data-testid="endgame-career">{career?.name ?? 'CAREER PENDING'}{secondCareer ? ` + ${secondCareer.name}` : ''}</strong>
            <span data-testid="endgame-career-category">{category?.name ?? 'CATEGORY PENDING'}{secondCareer ? ` / ${getCategory(secondCareer.categoryId)?.name ?? 'SECOND CAREER'}` : ''}</span>
          </div>
          <div className="endgame-salary-line">
            <span className="mono">PAYDAY TIER / AMOUNT</span>
            <strong data-testid="endgame-salary">{career ? `${SALARY_TIERS[tierIndex]} / ${formatMoney(effectiveSalaryAmount(player))}` : 'SALARY PENDING'}</strong>
          </div>
        </div>
        <div className="endgame-title-panel">
          <span className="mono">FINAL STATUS / TITLE</span>
          <strong data-testid="endgame-final-title">{finalTitle || 'TITLE PENDING'}</strong>
          <small>{finalTitle ? 'ENGINE TITLE ON FILE' : 'AWAITING FINAL ENGINE OUTPUT'}</small>
        </div>
      </section>

      <section className="endgame-stats" aria-labelledby="endgame-stats-heading">
        <div className="endgame-section-label">
          <span className="eyebrow">LIFE LEDGER // FINAL READOUT</span>
          <h2 id="endgame-stats-heading" className="display">What remains<br /><span>on the record.</span></h2>
        </div>
        <div className="endgame-stat-grid">
          <StatBlock label="Wealth" value={player.wealth} accent money />
          <StatBlock label="AI Skill" value={player.aiSkill} />
          <StatBlock label="Fame" value={player.fame} />
          <StatBlock label="Lifestyle" value={player.lifestyle} />
          <StatBlock label="Influence" value={player.influence} />
        </div>
        <div className="endgame-credits" data-testid="endgame-redline-credits">
          <span className="mono">REDLINE CREDITS</span>
          <strong>{redlineCredits === null || redlineCredits === undefined ? 'PENDING' : formatStat(redlineCredits)}</strong>
          <small>{redlineCredits === null || redlineCredits === undefined ? 'CALCULATION NOT SUPPLIED' : 'FINAL ENGINE VALUE'}</small>
        </div>
      </section>

      <section className="endgame-assets" aria-labelledby="endgame-assets-heading">
        <div className="endgame-section-label">
          <span className="eyebrow">COLLECTION // MILESTONE TROPHIES</span>
          <h2 id="endgame-assets-heading" className="display">Proof of<br /><span>the upgrade.</span></h2>
        </div>
        <div className="endgame-trophy-grid">
           {assetSlots.map((entry) => (
             <AssetTrophy key={entry.slot} {...entry} assetId={player.equipment[entry.slot]} assetLevel={player.equipment[entry.slot] ? player.assetLevels[player.equipment[entry.slot]!] ?? 1 : 1} />
          ))}
        </div>
      </section>

      <ChoiceRail />
      <FinalGambleReveal finalGamble={finalGamble} finalGambleResult={finalGambleResult} />

      <section className="endgame-achievements" aria-labelledby="endgame-achievements-heading">
        <div className="endgame-section-label">
          <span className="eyebrow">ACHIEVEMENT VIEW // SUPPLIED DATA ONLY</span>
          <h2 id="endgame-achievements-heading" className="display">Receipts<br /><span>from the run.</span></h2>
        </div>
        <div className="endgame-achievement-list">
          {!hasAchievements ? (
            <div className="endgame-achievement-pending">
              <span className="mono">ACHIEVEMENTS PENDING</span>
              <p>No achievement view models have been supplied by the engine.</p>
            </div>
          ) : achievements.length === 0 ? (
            <div className="endgame-achievement-pending">
              <span className="mono">NO ACHIEVEMENTS RECORDED</span>
              <p>The supplied achievement list is empty.</p>
            </div>
          ) : (
            achievements.map((achievement, index) => (
              <article className={`endgame-achievement ${achievement.unlocked === false ? 'locked' : ''}`} key={achievement.id} data-testid={`endgame-achievement-${achievement.id}`}>
                <span className="endgame-achievement-index">{String(index + 1).padStart(2, '0')}</span>
                <span className="endgame-achievement-medal" aria-hidden="true">◇</span>
                <div>
                  <strong>{achievement.title}</strong>
                  {achievement.description && <p>{achievement.description}</p>}
                </div>
                <span className="mono">{achievement.unlocked === false ? 'LOCKED' : 'RECORDED'}</span>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
