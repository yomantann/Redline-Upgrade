// BIO_UPGRADE board content. Everything here is owned by Bio Upgrade and is never offered on other boards.
// This module imports types only so the shared lookups (getCard, getAsset, ...) can include it without cycles.
import type { AssetDefinition } from './assets';
import type { BoardSpace, SpaceType } from './board-data';
import type { CardDefinition, CardEffect } from './cards';
import type { Career } from './careers';
import type { CharacterDefinition } from './characters';
import type { DeckId } from './decks';

export const BIO_FINISH_SPACE = 75;

const characterRoster = [
  ['bio_helix', 'Helix', 'A gene-splicer who treats every setback as a sequence to rewrite.'],
  ['bio_spore', 'Spore', 'A drifting culture that thrives wherever conditions are worst.'],
  ['bio_marrow', 'Marrow', 'A resilient field medic who builds strength from what remains.'],
  ['bio_synapse', 'Synapse', 'A fast-firing mind that connects ideas before anyone else sees the gap.'],
  ['bio_chlorophyll', 'Chlorophyll', 'A patient grower who turns light and time into compounding advantage.'],
  ['bio_pulse', 'Pulse', 'A rhythm-keeper who always senses the next heartbeat of the market.'],
  ['bio_graft', 'Graft', 'A splicer who borrows the best traits of every rival.'],
  ['bio_antibody', 'Antibody', 'A guardian instinct that answers every threat before it lands.'],
] as const;

export const bioCharacters: CharacterDefinition[] = characterRoster.map(([id, name, description]) => ({
  id,
  name,
  imagePath: `bio-characters/${id}.png`,
  description,
  abilityIds: [],
  abilityName: 'Bio Trait',
  abilityDescription: 'This character has no special ability in the current Bio Upgrade rules.',
}));

const careerRoster: ReadonlyArray<readonly [string, string, string, string, Career['tags'], Career['statModifiers'], DeckId, DeckId, Career['salaryTiers']]> = [
  ['bio-geneticist', 'Geneticist', 'Rewrites the code of living things.', 'digital-risk', ['digital', 'risk'], { aiSkill: 2 }, 'ai', 'wealth', [30000, 42000, 58000, 80000]],
  ['bio-field-medic', 'Field Medic', 'Keeps the whole expedition alive.', 'professional', ['professional'], { lifestyle: 1, influence: 1 }, 'lifestyle', 'influence', [28000, 40000, 55000, 75000]],
  ['bio-biotech-founder', 'Biotech Founder', 'Bets a lab on a living idea.', 'business-entrepreneur', ['business', 'entrepreneur'], { influence: 1, aiSkill: 1 }, 'wealth', 'influence', [26000, 40000, 62000, 90000]],
  ['bio-science-streamer', 'Science Streamer', 'Makes the microscope go viral.', 'media-fame', ['media', 'fame'], { fame: 2 }, 'fame', 'lifestyle', [24000, 36000, 52000, 72000]],
  ['bio-seed-trader', 'Seed Trader', 'Speculates on harvests and cultures.', 'digital-risk', ['risk', 'flex'], { fame: 1, aiSkill: 1 }, 'gamble', 'wealth', [22000, 38000, 60000, 88000]],
  ['bio-conservationist', 'Conservationist', 'Protects the ecosystems everyone else depends on.', 'flex-gig', ['flex', 'gig'], { lifestyle: 2 }, 'lifestyle', 'fame', [26000, 36000, 50000, 68000]],
];

export const bioCareers: Career[] = careerRoster.map(([id, name, description, categoryId, tags, statModifiers, primary, secondary, salaryTiers]) => ({
  id,
  name,
  description,
  icon: '✚',
  categoryId,
  tags,
  abilityIds: [],
  deckAffinity: { primary, secondary },
  abilityName: 'Bio Specialty',
  abilityDescription: 'Bio careers use deck affinities only; no special career ability.',
  salaryTiers,
  statModifiers,
}));

const stat = (statName: 'wealth' | 'aiSkill' | 'fame' | 'lifestyle' | 'influence', amount: number): CardEffect => ({ kind: 'STAT', stat: statName, amount, target: 'SELF' });
const bioCard = (id: string, deck: DeckId, title: string, description: string, effect: string, value: string, effects: readonly CardEffect[], rarity: CardDefinition['rarity'] = 'STANDARD'): CardDefinition => ({
  id: `bio-${id}`, deck, title, description, effect, value, rarity, effects,
  artCue: `Bio Upgrade card: ${title}`,
  artworkPath: `cards/bio/${id}.webp`,
});

export const bioCards: readonly CardDefinition[] = [
  bioCard('wealth-grant', 'wealth', 'Research Grant', 'A panel funds the long shot.', 'Gain $15,000 Wealth.', '+$15,000', [stat('wealth', 15000)]),
  bioCard('wealth-patent', 'wealth', 'Gene Patent', 'A licence pays out every quarter.', 'Gain $22,000 Wealth.', '+$22,000', [stat('wealth', 22000)]),
  bioCard('wealth-recall', 'wealth', 'Batch Recall', 'A contaminated batch costs a fortune.', 'Lose $9,000 Wealth.', '-$9,000', [stat('wealth', -9000)]),
  bioCard('ai-sequencer', 'ai', 'Fast Sequencer', 'The machine reads a genome overnight.', 'Gain 4 AI Skill.', '+4 AI', [stat('aiSkill', 4)]),
  bioCard('ai-model', 'ai', 'Protein Model', 'Folding predictions land on the first try.', 'Gain 3 AI Skill and $6,000 Wealth.', '+3 AI / +$6,000', [stat('aiSkill', 3), stat('wealth', 6000)]),
  bioCard('ai-bad-data', 'ai', 'Bad Dataset', 'The trial data was mislabeled.', 'Lose 2 AI Skill.', '-2 AI', [stat('aiSkill', -2)]),
  bioCard('fame-journal', 'fame', 'Journal Cover', 'Your paper makes the cover.', 'Gain 5 Fame.', '+5 FAME', [stat('fame', 5)]),
  bioCard('fame-viral', 'fame', 'Viral Specimen', 'Your lab creature trends worldwide.', 'Gain 3 Fame and $5,000 Wealth.', '+3 FAME / +$5,000', [stat('fame', 3), stat('wealth', 5000)]),
  bioCard('fame-retraction', 'fame', 'Retraction Notice', 'A footnote undoes a headline.', 'Lose 3 Fame.', '-3 FAME', [stat('fame', -3)]),
  bioCard('lifestyle-greenhouse', 'lifestyle', 'Greenhouse Weekend', 'Fresh air resets the whole schedule.', 'Gain 3 Lifestyle.', '+3 LIFE', [stat('lifestyle', 3)]),
  bioCard('lifestyle-diet', 'lifestyle', 'Microbiome Diet', 'It works, eventually.', 'Gain 2 Lifestyle and lose $3,000 Wealth.', '+2 LIFE / -$3,000', [stat('lifestyle', 2), stat('wealth', -3000)]),
  bioCard('lifestyle-quarantine', 'lifestyle', 'Surprise Quarantine', 'Two weeks of staring at the walls.', 'Lose 2 Lifestyle.', '-2 LIFE', [stat('lifestyle', -2)]),
  bioCard('influence-panel', 'influence', 'Ethics Panel Seat', 'The committee wants your view.', 'Gain 3 Influence.', '+3 INFL', [stat('influence', 3)]),
  bioCard('influence-coalition', 'influence', 'Research Coalition', 'Allies pool their reach.', 'Gain 2 Influence and $5,000 Wealth.', '+2 INFL / +$5,000', [stat('influence', 2), stat('wealth', 5000)]),
  bioCard('influence-leak', 'influence', 'Lab Leak Rumor', 'Nobody is sure, everybody is talking.', 'Lose 2 Influence.', '-2 INFL', [stat('influence', -2)]),
  bioCard('gamble-mutation', 'gamble', 'Wild Mutation', 'It either flourishes or collapses.', '50%: gain $30,000 Wealth. Otherwise lose $12,000.', '+$30,000 or -$12,000', [{ kind: 'RISK', chance: 0.5, win: [stat('wealth', 30000)], loss: [stat('wealth', -12000)] }], 'RARE'),
  bioCard('gamble-call', 'gamble', 'Double Or Nothing', 'One culture, one chance.', '50%: double your current Wealth. Otherwise lose all attributes and assets, but keep your Wealth.', 'x2 WEALTH or LOSE ALL', [{ kind: 'DOUBLE_OR_NOTHING', chance: 0.5 }], 'RARE'),
  bioCard('gamble-clinical', 'gamble', 'Clinical Trial', 'The results arrive tomorrow.', '50%: gain 4 Fame. Otherwise lose 3 Fame.', '+4 or -3 FAME', [{ kind: 'RISK', chance: 0.5, win: [stat('fame', 4)], loss: [stat('fame', -3)] }]),
];

const asset = (id: string, name: string, category: AssetDefinition['category'], cost: number, description: string, effects: AssetDefinition['effects'], rarity: AssetDefinition['rarity'] = 'STANDARD'): AssetDefinition => ({
  id: `bio-${id}`, name, category, visual: '✚', cost, description, effects, rarity,
  visualVariants: { 1: `bio-${id}:level-1`, 2: `bio-${id}:level-2`, 3: `bio-${id}:level-3`, 4: `bio-${id}:level-4` },
});

export const bioAssets: readonly AssetDefinition[] = [
  asset('field-rover', 'Field Rover', 'car', 60000, 'Reaches every sample site.', { fame: 3, lifestyle: 2 }),
  asset('bio-diesel-coupe', 'Biodiesel Coupe', 'car', 140000, 'Runs on algae.', { fame: 8, aiSkill: 4 }, 'RARE'),
  asset('lab-hybrid', 'Lab Hybrid', 'car', 260000, 'A prototype that grows its own fuel.', { fame: 15, aiSkill: 10 }, 'ELITE'),
  asset('garden-life', 'Garden Life', 'lifestyle', 70000, 'Slow mornings among growing things.', { lifestyle: 10 }),
  asset('retreat-clinic', 'Longevity Retreat', 'lifestyle', 150000, 'Every metric, tuned.', { lifestyle: 15, influence: 5 }, 'RARE'),
  asset('symbiotic-elite', 'Symbiotic Elite', 'lifestyle', 240000, 'A circle that feeds each other.', { lifestyle: 20, influence: 10 }, 'ELITE'),
  asset('petri-pup', 'Petri Pup', 'pet', 55000, 'Loyalty, engineered.', { lifestyle: 5, fame: 3 }),
  asset('glow-fish', 'Glow Fish', 'pet', 80000, 'Lights up every room.', { lifestyle: 5, aiSkill: 5 }, 'RARE'),
  asset('chimera-companion', 'Chimera Companion', 'pet', 140000, 'Nobody knows what it is.', { lifestyle: 10, fame: 8 }, 'ELITE'),
  asset('seed-vault-fund', 'Seed Vault Fund', 'investment', 90000, 'A fund that stores the future.', {}, 'STANDARD'),
  asset('biotech-ipo', 'Biotech IPO', 'investment', 150000, 'Back the next listing.', {}, 'RARE'),
  asset('gene-therapy-bet', 'Gene Therapy Bet', 'investment', 200000, 'A long, high-risk cure.', {}, 'ELITE'),
  asset('lab-loft', 'Lab Loft', 'property', 110000, 'Bench space and a bed.', { lifestyle: 5 }),
  asset('biodome-estate', 'Biodome Estate', 'property', 300000, 'A self-sustaining habitat.', { lifestyle: 12, influence: 6 }, 'RARE'),
  asset('research-campus', 'Research Campus', 'property', 480000, 'Your own institute.', { influence: 18, lifestyle: 12 }, 'ELITE'),
];

const BIO_MILESTONES: Record<number, [string, string, string]> = {
  10: ['car', 'Car', 'Land here to choose one of three randomly offered cars, or skip.'],
  30: ['lifestyle', 'Lifestyle', 'Land here to choose one of three randomly offered lifestyles, or skip.'],
  45: ['pet', 'Pet / Investment', 'Land here to choose a Pet or Investment, then choose one of three offers, or skip.'],
  60: ['property', 'Property', 'Land here to choose one of three randomly offered properties, or skip.'],
};
const BIO_PAYDAYS = new Set([8, 16, 25, 38, 52, 64, 72]);
const BIO_GAMBLES = new Set([14, 40, 68]);
const BIO_TOKENS = new Set([4, 21, 56]);
const BIO_CAREER_CHANGE = 35;
const BIO_CARD_SPACES: Partial<Record<number, DeckId>> = {
  2: 'ai', 5: 'wealth', 7: 'lifestyle', 11: 'fame', 13: 'influence', 18: 'wealth', 20: 'ai', 23: 'fame',
  26: 'influence', 28: 'lifestyle', 31: 'wealth', 36: 'ai', 37: 'fame', 42: 'lifestyle', 44: 'influence',
  47: 'wealth', 50: 'ai', 53: 'fame', 55: 'lifestyle', 58: 'influence', 62: 'wealth', 66: 'ai', 70: 'fame',
};

export const bioSpaces: BoardSpace[] = Array.from({ length: BIO_FINISH_SPACE }, (_, index): BoardSpace => {
  const number = index + 1;
  const payday = BIO_PAYDAYS.has(number);
  const milestone = BIO_MILESTONES[number];
  const deck = BIO_CARD_SPACES[number] ?? (BIO_GAMBLES.has(number) ? 'gamble' : undefined);
  if (number === 1) return { number, type: 'NORMAL', payday: false, icon: 'normal', label: 'LAB START', description: 'Lab Start. No gameplay effect is triggered here.', trigger: 'NONE' };
  if (number === BIO_FINISH_SPACE) return { number, type: 'MILESTONE', payday: false, icon: 'finish', label: 'Finish', description: 'The finish line. Reach it to lock in your place and make your final choice.', trigger: 'NONE' };
  if (milestone) return { number, type: 'MILESTONE', payday: false, icon: milestone[0], label: milestone[1], description: milestone[2], trigger: 'LAND' };
  const type: SpaceType = number === BIO_CAREER_CHANGE ? 'CAREER_CHANGE' : payday ? 'SALARY_GATE' : BIO_TOKENS.has(number) ? 'UPGRADE_TOKEN' : BIO_GAMBLES.has(number) ? 'GAMBLE' : deck ? 'CARD' : 'NORMAL';
  switch (type) {
    case 'CAREER_CHANGE': return { number, type, payday, icon: 'career', label: 'Career Change', description: 'Pass through or land here to keep your career or choose between two new opportunities.', trigger: 'LAND_OR_PASS' };
    case 'SALARY_GATE': return { number, type, payday, icon: 'salary', label: 'Salary Gate', description: 'Pass through or land here to receive your exact current salary once.', trigger: 'LAND_OR_PASS' };
    case 'UPGRADE_TOKEN': return { number, type, payday, icon: 'upgrade-token', label: 'Upgrade Token', description: 'Land here to gain 1 match-only Upgrade Token.', trigger: 'LAND' };
    case 'GAMBLE': return { number, type, payday, icon: 'gamble', label: 'Gamble Card', description: 'Land here to draw and resolve a high-risk Gamble card.', trigger: 'LAND', deck: 'gamble' };
    case 'CARD': return { number, type, payday, icon: deck!, label: `${deck!.toUpperCase()} Card`, description: `Land here to draw and resolve a card from the ${deck} deck.`, trigger: 'LAND', deck };
    default: return { number, type: 'NORMAL', payday, icon: 'normal', label: 'Open Culture', description: 'A regular space. No effect is active here.', trigger: 'NONE' };
  }
});
