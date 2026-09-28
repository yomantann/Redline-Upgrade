import type { CSSProperties } from 'react';
import { useLocation } from 'wouter';
import { getCareer, formatMoney, SALARY_TIERS } from '@/game/careers';
import { getDeck } from '@/game/decks';
import { useGame } from '@/game/state';
import { SpaceIcon } from './space-icon';
import './career-reveal.css';

export function CareerGlyph({ icon, className = '' }: { icon: string; className?: string }) {
  return <span className={`career-glyph ${className}`} aria-label={`Career icon: ${icon}`}>{icon}</span>;
}

export function CareerReveal() {
  const [, navigate] = useLocation();
  const { match, acknowledgeCareer } = useGame();
  const player = match?.players[0];
  const career = player?.careerId ? getCareer(player.careerId) : undefined;

  if (!match || !player || !career) {
    return (
      <main className="career-reveal">
        <div className="career-unavailable">
          <span className="eyebrow">CAREER ASSIGNMENT // UNAVAILABLE</span>
          <h1 className="display">No dossier<br />on file.</h1>
          <p>Confirm an identity to start a match and receive your career assignment.</p>
          <button className="action" type="button" onClick={() => navigate('/characters')} data-testid="button-career-choose-character">Choose identity <span aria-hidden="true">↗</span></button>
        </div>
      </main>
    );
  }

  const tierIndex = Math.max(0, Math.min(3, player.salaryTier - 1));
  const icon = career.icon || career.name;
  const careerDecks = [career.deckAffinity.primary, career.deckAffinity.secondary].filter(
    (deck): deck is NonNullable<typeof deck> => Boolean(deck),
  ).map(getDeck);
  return (
    <main className="career-reveal">
      <div className="career-reveal-top">
        <span className="eyebrow">ASSIGNMENT UNLOCKED // STEP 02</span>
        <span className="mono">IDENTITY CONFIRMED — CAREER ASSIGNED</span>
        <div className="career-reveal-progress" aria-label="Step 2 of 3"><i /><i /><i /></div>
      </div>
      <div className="career-reveal-heading">
        <div data-career={career.id}>
          <span className="mono lime">PLAYER 01 / CLASSIFIED DOSSIER</span>
          <h1 className="display">Your next<br /><span>move.</span></h1>
        </div>
        <p>The identity was your choice. The career is the luck of the draw. This is where your run begins.</p>
      </div>
      <section className="career-dossier" aria-label="Your assigned career">
        <div className={`career-feature career-${career.id}`} data-career={career.id}>
          <div className="career-feature-top mono"><span>REDLINE / CAREER FILE</span><span>ASSIGNED TO YOU</span></div>
          <div className="career-feature-center">
            <CareerGlyph icon={icon} />
            <span className="mono">CAREER // {career.id}</span>
          </div>
          <div className="career-feature-bottom">
            <span className="mono">YOUR CAREER</span>
            <h2 data-testid="text-career-name">{career.name}</h2>
            <p data-testid="text-career-description">{career.description}</p>
          </div>
        </div>
        <div className="career-details">
          <div className="career-ability">
            <span className="mono">CAREER ABILITY / ON FILE</span>
            <strong data-testid="text-career-ability">{career.abilityName}</strong>
            <p>{career.abilityDescription}</p>
          </div>
          <section className="career-decks" aria-label="Career decks">
            <div className="career-decks-header">
              <span className="mono">CAREER DECKS</span>
              <p>Match either deck to trigger your career bonus.</p>
            </div>
            <div className="career-decks-list">
              {careerDecks.map(deck => (
                <div className="career-deck" key={deck.id} style={{ '--deck-color': deck.color } as CSSProperties}>
                  <span className="career-deck-icon"><SpaceIcon name={deck.icon} size={20} /></span>
                  <strong>{deck.name}</strong>
                </div>
              ))}
            </div>
          </section>
          <div className="salary-panel">
            <div className="salary-header"><span className="mono">SALARY RESULT // FOUR POSSIBLE TIERS</span><strong>YOUR DRAW: {SALARY_TIERS[tierIndex]}</strong></div>
            <div className="salary-list">
              {career.salaryTiers.map((amount, index) => (
                <div className={`salary-row salary-tier-${index + 1} ${tierIndex === index ? 'active' : ''}`} key={index} aria-current={tierIndex === index ? 'true' : undefined}>
                  <span className="mono">0{index + 1}</span><strong>{SALARY_TIERS[index]}</strong><b>{formatMoney(amount)}</b>
                </div>
              ))}
            </div>
          </div>
          <div className="career-bank">
            <div><span className="mono">STARTING WEALTH</span><small>Balance at the starting line</small></div>
            <strong data-testid="text-starting-wealth">{formatMoney(player.wealth)}</strong>
          </div>
        </div>
      </section>
      <div className="career-actions">
        <p className="mono">SALARY: {formatMoney(player.salaryAmount)} / PAYDAY CHANGES YOUR WEALTH</p>
        <button className="action lime-action" type="button" onClick={() => { acknowledgeCareer(); navigate('/board'); }} data-testid="button-continue-board">Continue to board <span aria-hidden="true">↗</span></button>
      </div>
    </main>
  );
}