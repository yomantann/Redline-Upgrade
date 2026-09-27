import { careerAbilityId, getAbility } from './abilities';

export const SALARY_TIERS = ['LOW', 'STANDARD', 'HIGH', 'ELITE'] as const;
export type SalaryTier = 1 | 2 | 3 | 4;
export type CareerStat = 'aiSkill' | 'fame' | 'lifestyle' | 'influence';
export type CareerCategoryTag = 'digital' | 'risk' | 'creative' | 'business' | 'performance' | 'medical' | 'legal' | 'service' | 'hustle' | 'science';

export interface CareerCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface Career {
  id: string;
  name: string;
  description: string;
  icon: string;
  categoryId: string;
  tags: readonly CareerCategoryTag[];
  abilityIds: readonly string[];
  abilityName: string;
  abilityDescription: string;
  salaryTiers: readonly [number, number, number, number];
  startingWealthModifier: number;
  statModifiers: Partial<Record<CareerStat, number>>;
}

export const categories: readonly CareerCategory[] = [
  { id: 'digital-science', name: 'DIGITAL / SCIENCE', icon: '⌘', description: 'Technical careers shaping the next system.' },
  { id: 'digital-risk', name: 'DIGITAL / RISK', icon: '⬡', description: 'High-speed digital careers with volatile upside.' },
  { id: 'performance-risk', name: 'PERFORMANCE / RISK', icon: '◈', description: 'Fast lanes, bigger pressure, louder stakes.' },
  { id: 'creative-business', name: 'CREATIVE / BUSINESS', icon: '✦', description: 'Attention, production, and monetizing the signal.' },
  { id: 'legal-business', name: 'LEGAL / BUSINESS', icon: '§', description: 'Leverage, negotiation, and control of the room.' },
  { id: 'medical-science', name: 'MEDICAL / SCIENCE', icon: '✚', description: 'Applied expertise with measurable consequences.' },
  { id: 'performance-service', name: 'PERFORMANCE / SERVICE', icon: '▲', description: 'People-facing performance careers built on discipline.' },
  { id: 'service-hustle', name: 'SERVICE / HUSTLE', icon: '↯', description: 'Flexible work powered by momentum and adaptation.' },
  { id: 'business-risk', name: 'BUSINESS / RISK', icon: '◇', description: 'Ownership, volatility, and asymmetric upside.' },
];

export const careers: readonly Career[] = [
  { id: 'ai-engineer', name: 'AI Engineer', description: 'Builds the models reshaping every industry.', icon: '⌘', categoryId: 'digital-science', tags: ['digital', 'science'], abilityIds: [careerAbilityId('ai-engineer')], abilityName: getAbility(careerAbilityId('ai-engineer'))?.name ?? 'MODEL UPGRADE', abilityDescription: getAbility(careerAbilityId('ai-engineer'))?.description ?? 'The first AI gain each turn gets a little stronger.', salaryTiers: [70000, 100000, 140000, 200000], startingWealthModifier: 0, statModifiers: { aiSkill: 2 } },
  { id: 'race-driver', name: 'Race Driver', description: 'Lives for a faster line and a bigger finish.', icon: '◈', categoryId: 'performance-risk', tags: ['performance', 'risk'], abilityIds: [careerAbilityId('race-driver')], abilityName: getAbility(careerAbilityId('race-driver'))?.name ?? 'NEED FOR SPEED', abilityDescription: getAbility(careerAbilityId('race-driver'))?.description ?? 'Car purchases come with extra payout.', salaryTiers: [45000, 85000, 150000, 300000], startingWealthModifier: 0, statModifiers: { influence: 1 } },
  { id: 'content-creator', name: 'Content Creator', description: 'Turns original ideas into an audience.', icon: '▣', categoryId: 'creative-business', tags: ['creative', 'business'], abilityIds: [careerAbilityId('content-creator')], abilityName: getAbility(careerAbilityId('content-creator'))?.name ?? 'GO VIRAL', abilityDescription: getAbility(careerAbilityId('content-creator'))?.description ?? 'The first Fame gain each turn gets amplified.', salaryTiers: [30000, 75000, 130000, 240000], startingWealthModifier: 0, statModifiers: { fame: 2 } },
  { id: 'gig-worker', name: 'Gig Worker', description: 'Makes the next opportunity count.', icon: '↯', categoryId: 'service-hustle', tags: ['service', 'hustle'], abilityIds: [careerAbilityId('gig-worker')], abilityName: getAbility(careerAbilityId('gig-worker'))?.name ?? 'SIDE HUSTLE', abilityDescription: getAbility(careerAbilityId('gig-worker'))?.description ?? 'Resolved cards pay a little extra.', salaryTiers: [25000, 50000, 85000, 140000], startingWealthModifier: 5000, statModifiers: { lifestyle: 1 } },
  { id: 'lawyer', name: 'Lawyer', description: 'Finds leverage in every detail.', icon: '§', categoryId: 'legal-business', tags: ['legal', 'business'], abilityIds: [careerAbilityId('lawyer')], abilityName: getAbility(careerAbilityId('lawyer'))?.name ?? 'OBJECTION', abilityDescription: getAbility(careerAbilityId('lawyer'))?.description ?? 'A low roll sets up a legal shield against penalties.', salaryTiers: [85000, 120000, 165000, 220000], startingWealthModifier: 0, statModifiers: { influence: 2 } },
  { id: 'pro-gamer', name: 'Pro Gamer', description: 'Competes at the edge of reaction time.', icon: '⌑', categoryId: 'digital-risk', tags: ['digital', 'performance'], abilityIds: [careerAbilityId('pro-gamer')], abilityName: getAbility(careerAbilityId('pro-gamer'))?.name ?? 'SWEAT THE ODDS', abilityDescription: getAbility(careerAbilityId('pro-gamer'))?.description ?? 'Doubles turn into a little more Fame.', salaryTiers: [20000, 65000, 140000, 300000], startingWealthModifier: 0, statModifiers: { aiSkill: 1, fame: 1 } },
  { id: 'doctor', name: 'Doctor', description: 'Makes the difficult call when it matters.', icon: '✚', categoryId: 'medical-science', tags: ['medical', 'science'], abilityIds: [careerAbilityId('doctor')], abilityName: getAbility(careerAbilityId('doctor'))?.name ?? 'HEALTH INSURANCE', abilityDescription: getAbility(careerAbilityId('doctor'))?.description ?? 'Big setbacks still leave a little recovery behind.', salaryTiers: [100000, 140000, 180000, 240000], startingWealthModifier: 10000, statModifiers: { lifestyle: 1 } },
  { id: 'personal-trainer', name: 'Personal Trainer', description: 'Builds stronger habits, one session at a time.', icon: '▲', categoryId: 'performance-service', tags: ['performance', 'service'], abilityIds: [careerAbilityId('personal-trainer')], abilityName: getAbility(careerAbilityId('personal-trainer'))?.name ?? 'LOCKED IN', abilityDescription: getAbility(careerAbilityId('personal-trainer'))?.description ?? 'Lifestyle purchases come with extra Lifestyle.', salaryTiers: [35000, 60000, 95000, 150000], startingWealthModifier: 0, statModifiers: { lifestyle: 2 } },
  { id: 'degen-trader', name: 'Degen Trader', description: 'Chases improbable gains in unstable markets.', icon: '⇋', categoryId: 'digital-risk', tags: ['digital', 'risk'], abilityIds: [careerAbilityId('degen-trader')], abilityName: getAbility(careerAbilityId('degen-trader'))?.name ?? 'YOLO', abilityDescription: getAbility(careerAbilityId('degen-trader'))?.description ?? 'Rolling an 8 hits harder.', salaryTiers: [20000, 75000, 200000, 500000], startingWealthModifier: -5000, statModifiers: { influence: 1 } },
  { id: 'startup-founder', name: 'Startup Founder', description: 'Bets everything on a new idea.', icon: '◇', categoryId: 'business-risk', tags: ['business', 'risk'], abilityIds: [careerAbilityId('startup-founder')], abilityName: getAbility(careerAbilityId('startup-founder'))?.name ?? 'EQUITY', abilityDescription: getAbility(careerAbilityId('startup-founder'))?.description ?? 'Gamble cards can cash out bigger.', salaryTiers: [20000, 65000, 150000, 350000], startingWealthModifier: 0, statModifiers: { aiSkill: 1, influence: 1 } },
  { id: 'influencer', name: 'Influencer', description: 'Turns attention into momentum.', icon: '✦', categoryId: 'creative-business', tags: ['creative', 'business'], abilityIds: [careerAbilityId('influencer')], abilityName: getAbility(careerAbilityId('influencer'))?.name ?? 'ENGAGEMENT', abilityDescription: getAbility(careerAbilityId('influencer'))?.description ?? 'The first Fame gain each turn also pays out Wealth.', salaryTiers: [30000, 70000, 145000, 300000], startingWealthModifier: 0, statModifiers: { fame: 2 } },
  { id: 'corporate-executive', name: 'Corporate Executive', description: 'Moves strategy from the boardroom to the balance sheet.', icon: '▤', categoryId: 'legal-business', tags: ['business', 'legal'], abilityIds: [careerAbilityId('corporate-executive')], abilityName: getAbility(careerAbilityId('corporate-executive'))?.name ?? 'GOLDEN HANDCUFFS', abilityDescription: getAbility(careerAbilityId('corporate-executive'))?.description ?? 'Salary gates also raise Influence.', salaryTiers: [110000, 145000, 185000, 240000], startingWealthModifier: 10000, statModifiers: { influence: 2 } },
  { id: 'cybersecurity-specialist', name: 'Cybersecurity Specialist', description: 'Finds the fault line before anyone else does.', icon: '⬡', categoryId: 'digital-risk', tags: ['digital', 'risk'], abilityIds: [careerAbilityId('cybersecurity-specialist')], abilityName: getAbility(careerAbilityId('cybersecurity-specialist'))?.name ?? 'ZERO DAY', abilityDescription: getAbility(careerAbilityId('cybersecurity-specialist'))?.description ?? 'A low roll sets up a digital failsafe.', salaryTiers: [75000, 105000, 140000, 190000], startingWealthModifier: 0, statModifiers: { aiSkill: 2 } },
  { id: 'entertainer', name: 'Entertainer', description: 'Commands a room and remembers the crowd.', icon: '✶', categoryId: 'creative-business', tags: ['creative', 'performance'], abilityIds: [careerAbilityId('entertainer')], abilityName: getAbility(careerAbilityId('entertainer'))?.name ?? 'MAIN CHARACTER', abilityDescription: getAbility(careerAbilityId('entertainer'))?.description ?? 'Landing on someone turns into Fame.', salaryTiers: [25000, 70000, 160000, 350000], startingWealthModifier: 0, statModifiers: { fame: 2 } },
  { id: 'real-estate-investor', name: 'Real Estate Investor', description: 'Sees potential where others see empty space.', icon: '▥', categoryId: 'business-risk', tags: ['business', 'risk'], abilityIds: [careerAbilityId('real-estate-investor')], abilityName: getAbility(careerAbilityId('real-estate-investor'))?.name ?? 'PROPERTY LADDER', abilityDescription: getAbility(careerAbilityId('real-estate-investor'))?.description ?? 'Property purchases come with extra upside.', salaryTiers: [40000, 90000, 175000, 320000], startingWealthModifier: 5000, statModifiers: { influence: 1 } },
];

export const STARTING_WEALTH_MULTIPLIER = 0.5;
export function startingWealth(career: Career, salary: number): number {
  return Math.max(0, Math.round(salary * STARTING_WEALTH_MULTIPLIER + career.startingWealthModifier));
}
export function getCareer(id: string): Career | undefined {
  return careers.find(career => career.id === id);
}
export function getCategory(id: string): CareerCategory | undefined {
  return categories.find(category => category.id === id);
}
export function formatMoney(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  const value = Math.abs(amount);
  return `${sign}$${value >= 1_000_000 ? `${+(value / 1_000_000).toFixed(2)}M` : value >= 1_000 ? `${+(value / 1_000).toFixed(1)}K` : value.toLocaleString()}`;
}
