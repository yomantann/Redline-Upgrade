import type { DeckId } from './decks';

export interface CareerDeckAffinity {
  primary: DeckId;
  secondary?: DeckId;
}

export const CAREER_DECK_AFFINITIES = {
  'ai-engineer': { primary: 'ai', secondary: 'wealth' },
  'race-driver': { primary: 'fame', secondary: 'lifestyle' },
  'content-creator': { primary: 'fame', secondary: 'lifestyle' },
  'gig-worker': { primary: 'gamble', secondary: 'wealth' },
  lawyer: { primary: 'influence', secondary: 'wealth' },
  'pro-gamer': { primary: 'gamble', secondary: 'ai' },
  doctor: { primary: 'lifestyle', secondary: 'ai' },
  'personal-trainer': { primary: 'lifestyle', secondary: 'fame' },
  'degen-trader': { primary: 'gamble', secondary: 'wealth' },
  'startup-founder': { primary: 'wealth', secondary: 'influence' },
  influencer: { primary: 'fame', secondary: 'wealth' },
  'corporate-executive': { primary: 'wealth', secondary: 'influence' },
  'cybersecurity-specialist': { primary: 'ai', secondary: 'wealth' },
  entertainer: { primary: 'fame', secondary: 'lifestyle' },
  'real-estate-investor': { primary: 'wealth', secondary: 'influence' },
  thief: { primary: 'gamble', secondary: 'wealth' },
  alien: { primary: 'ai', secondary: 'influence' },
} satisfies Record<string, CareerDeckAffinity>;

export function getCareerDeckAffinity(careerId: string): CareerDeckAffinity {
  const affinity = CAREER_DECK_AFFINITIES[careerId as keyof typeof CAREER_DECK_AFFINITIES];
  if (!affinity) throw new Error(`Missing deck affinity for career: ${careerId}`);
  return affinity;
}

export function careerAffinityAbilityId(careerId: string, deck: DeckId): string {
  return `career-affinity:${careerId}:${deck}`;
}

export function careerAffinityAbilityIds(careerId: string): string[] {
  const affinity = getCareerDeckAffinity(careerId);
  return [affinity.primary, ...(affinity.secondary ? [affinity.secondary] : [])]
    .map((deck) => careerAffinityAbilityId(careerId, deck));
}