export const SALARY_TIERS = ['LOW', 'STANDARD', 'HIGH', 'ELITE'] as const;
export type SalaryTier = 1 | 2 | 3 | 4;
export type CareerStat = 'aiSkill' | 'fame' | 'lifestyle' | 'influence';

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
  abilityName: string;
  abilityDescription: string;
  salaryTiers: readonly [number, number, number, number];
  startingWealthModifier: number;
  statModifiers: Partial<Record<CareerStat, number>>;
}

export const categories: readonly CareerCategory[] = [
  { id: 'digital-risk', name: 'DIGITAL / RISK', icon: '⌘', description: 'Code, competition and volatile markets.' },
  { id: 'performance', name: 'PERFORMANCE', icon: '↗', description: 'Speed, strength and discipline.' },
  { id: 'media-fame', name: 'MEDIA / FAME', icon: '✦', description: 'Attention is the currency.' },
  { id: 'professional', name: 'PROFESSIONAL', icon: '§', description: 'Expertise under pressure.' },
  { id: 'business-entrepreneur', name: 'BUSINESS / ENTREPRENEUR', icon: '◇', description: 'Build, lead and own the upside.' },
  { id: 'flex-gig', name: 'FLEX / GIG', icon: '↯', description: 'Adapt quickly and take every opening.' },
];

// All balancing lives here. Ability copy is descriptive; its special effects are future work.
export const careers: readonly Career[] = [
  { id: 'ai-engineer', name: 'AI Engineer', description: 'Builds the models reshaping every industry.', icon: '⌘', categoryId: 'digital-risk', abilityName: 'MODEL UPGRADE', abilityDescription: 'Gain extra AI Skill from future AI-related events.', salaryTiers: [70000, 100000, 140000, 200000], startingWealthModifier: 0, statModifiers: { aiSkill: 2 } },
  { id: 'race-driver', name: 'Race Driver', description: 'Lives for a faster line and a bigger finish.', icon: '◈', categoryId: 'performance', abilityName: 'NEED FOR SPEED', abilityDescription: 'Future car ownership can unlock special benefits.', salaryTiers: [45000, 85000, 150000, 300000], startingWealthModifier: 0, statModifiers: { influence: 1 } },
  { id: 'content-creator', name: 'Content Creator', description: 'Turns original ideas into an audience.', icon: '▣', categoryId: 'media-fame', abilityName: 'GO VIRAL', abilityDescription: 'Gain extra Fame from future Fame events.', salaryTiers: [30000, 75000, 130000, 240000], startingWealthModifier: 0, statModifiers: { fame: 2 } },
  { id: 'gig-worker', name: 'Gig Worker', description: 'Makes the next opportunity count.', icon: '↯', categoryId: 'flex-gig', abilityName: 'SIDE HUSTLE', abilityDescription: 'Future Event spaces can award extra Wealth.', salaryTiers: [25000, 50000, 85000, 140000], startingWealthModifier: 5000, statModifiers: { lifestyle: 1 } },
  { id: 'lawyer', name: 'Lawyer', description: 'Finds leverage in every detail.', icon: '§', categoryId: 'professional', abilityName: 'OBJECTION', abilityDescription: 'A future ability can cancel one negative penalty.', salaryTiers: [85000, 120000, 165000, 220000], startingWealthModifier: 0, statModifiers: { influence: 2 } },
  { id: 'pro-gamer', name: 'Pro Gamer', description: 'Competes at the edge of reaction time.', icon: '⌑', categoryId: 'digital-risk', abilityName: 'SWEAT THE ODDS', abilityDescription: 'Future successful Gamble spaces can pay more.', salaryTiers: [20000, 65000, 140000, 300000], startingWealthModifier: 0, statModifiers: { aiSkill: 1, fame: 1 } },
  { id: 'doctor', name: 'Doctor', description: 'Makes the difficult call when it matters.', icon: '✚', categoryId: 'professional', abilityName: 'HEALTH INSURANCE', abilityDescription: 'A future ability can ignore one health-related penalty.', salaryTiers: [100000, 140000, 180000, 240000], startingWealthModifier: 10000, statModifiers: { lifestyle: 1 } },
  { id: 'personal-trainer', name: 'Personal Trainer', description: 'Builds stronger habits, one session at a time.', icon: '▲', categoryId: 'performance', abilityName: 'LOCKED IN', abilityDescription: 'Gain Lifestyle more efficiently in future systems.', salaryTiers: [35000, 60000, 95000, 150000], startingWealthModifier: 0, statModifiers: { lifestyle: 2 } },
  { id: 'degen-trader', name: 'Degen Trader', description: 'Chases improbable gains in unstable markets.', icon: '⇋', categoryId: 'digital-risk', abilityName: 'YOLO', abilityDescription: 'Future Gamble wins can deliver stronger rewards.', salaryTiers: [20000, 75000, 200000, 500000], startingWealthModifier: -5000, statModifiers: { influence: 1 } },
  { id: 'startup-founder', name: 'Startup Founder', description: 'Bets everything on a new idea.', icon: '◇', categoryId: 'business-entrepreneur', abilityName: 'EQUITY', abilityDescription: 'Future risky events can award extra Wealth.', salaryTiers: [20000, 65000, 150000, 350000], startingWealthModifier: 0, statModifiers: { aiSkill: 1, influence: 1 } },
  { id: 'influencer', name: 'Influencer', description: 'Turns attention into momentum.', icon: '✦', categoryId: 'media-fame', abilityName: 'ENGAGEMENT', abilityDescription: 'Some future Fame gains can create extra Wealth.', salaryTiers: [30000, 70000, 145000, 300000], startingWealthModifier: 0, statModifiers: { fame: 2 } },
  { id: 'corporate-executive', name: 'Corporate Executive', description: 'Moves strategy from the boardroom to the balance sheet.', icon: '▤', categoryId: 'business-entrepreneur', abilityName: 'GOLDEN HANDCUFFS', abilityDescription: 'Stable salary with less flexibility in future decisions.', salaryTiers: [110000, 145000, 185000, 240000], startingWealthModifier: 10000, statModifiers: { influence: 2 } },
  { id: 'cybersecurity-specialist', name: 'Cybersecurity Specialist', description: 'Finds the fault line before anyone else does.', icon: '⬡', categoryId: 'digital-risk', abilityName: 'ZERO DAY', abilityDescription: 'A future ability can avoid one negative Event.', salaryTiers: [75000, 105000, 140000, 190000], startingWealthModifier: 0, statModifiers: { aiSkill: 2 } },
  { id: 'entertainer', name: 'Entertainer', description: 'Commands a room and remembers the crowd.', icon: '✶', categoryId: 'media-fame', abilityName: 'MAIN CHARACTER', abilityDescription: 'Future player interactions can award Fame.', salaryTiers: [25000, 70000, 160000, 350000], startingWealthModifier: 0, statModifiers: { fame: 2 } },
  { id: 'real-estate-investor', name: 'Real Estate Investor', description: 'Sees potential where others see empty space.', icon: '▥', categoryId: 'business-entrepreneur', abilityName: 'PROPERTY LADDER', abilityDescription: 'Future property purchases can grant extra benefits.', salaryTiers: [40000, 90000, 175000, 320000], startingWealthModifier: 5000, statModifiers: { influence: 1 } },
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