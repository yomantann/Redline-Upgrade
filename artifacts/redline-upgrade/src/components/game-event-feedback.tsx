import type { EventLogEntry } from '@/game/events/types';
import { formatMoney } from '@/game/careers';

function eventTransitionValues(event: EventLogEntry) {
  if (event.baseValue !== undefined && event.finalGameValue !== undefined) {
    return { previous: event.baseValue, next: event.finalGameValue };
  }
  if (event.previousValue !== undefined && event.newValue !== undefined) {
    return { previous: event.previousValue, next: event.newValue };
  }
  if (event.previousWealth !== undefined && event.newWealth !== undefined) {
    return { previous: event.previousWealth, next: event.newWealth };
  }
  if (event.previousSalary !== undefined && event.newSalary !== undefined) {
    return { previous: event.previousSalary, next: event.newSalary };
  }
  return null;
}

function transitionLabel(event: EventLogEntry): string {
  if (event.eventType === 'CASH_OUT_RESOLVED' || event.eventType === 'DOUBLE_DOWN_RESOLVED' || event.eventType === 'FINAL_GAMBLE_RESOLVED') return 'FINAL VALUE';
  if (event.eventType === 'SALARY_GATE' || event.eventType === 'WEALTH_CHANGED') return 'WEALTH';
  if (event.eventType === 'CAREER_CHANGE' && event.previousSalary !== undefined) return 'SALARY';
  if (event.eventType === 'UPGRADE_TOKEN_HELD') return 'HELD UPGRADE TOKENS';
  if (event.eventType === 'UPGRADE_TOKEN_GAINED' || event.eventType === 'UPGRADE_TOKEN_SPENT') return 'UPGRADE TOKENS';
  if (event.eventType === 'ASSET_UPGRADED') return `${event.assetName ?? 'ASSET'} LEVEL`;
  if (event.stat) return event.stat.replaceAll(/([A-Z])/g, ' $1').toUpperCase();
  return event.eventType.replaceAll('_', ' ');
}

export function formatEventTransition(event: EventLogEntry): string | null {
  const values = eventTransitionValues(event);
  if (!values) return null;
  const delta = event.delta ?? values.next - values.previous;
  const label = transitionLabel(event);
  const signedDelta = label === 'WEALTH' || label === 'SALARY'
    ? `${delta >= 0 ? '+' : '−'}${formatMoney(Math.abs(delta))}`
    : `${delta >= 0 ? '+' : '−'}${Math.abs(delta).toLocaleString('en-US')}`;
  return `${signedDelta} ${label}`;
}

export function formatSpaceFeedbackOutcome(event: EventLogEntry): string {
  const delta = event.amount ?? 0;
  const signed = `${delta >= 0 ? '+' : '−'}${Math.abs(delta).toLocaleString('en-US')}`;
  if (event.eventType === 'SALARY_GATE') {
    const income = event.salaryAmount ?? delta;
    return `+${formatMoney(income)} WEALTH`;
  }
  const transition = formatEventTransition(event);
  if (transition) return transition;
  switch (event.eventType) {
    case 'WEALTH_CHANGED':
      return `${delta >= 0 ? '+' : '−'}${formatMoney(Math.abs(delta))} WEALTH`;
    case 'AI_SKILL_CHANGED':
      return `${signed} AI SKILL`;
    case 'FAME_CHANGED':
      return `${signed} FAME`;
    case 'LIFESTYLE_CHANGED':
      return `${signed} LIFESTYLE`;
    case 'INFLUENCE_CHANGED':
      return `${signed} INFLUENCE`;
    case 'UPGRADE_TOKEN_GAINED':
      return `+${Math.max(1, Math.abs(delta))} UPGRADE TOKEN${Math.abs(delta) === 1 ? '' : 'S'}`;
    case 'MILESTONE':
      return 'CHOOSE AN ASSET';
    case 'CAREER_CHANGE':
      return 'CAREER CHANGE AVAILABLE';
    default:
      return 'SPACE EFFECT RESOLVED';
  }
}

export type AbilityFeedback = {
  event: EventLogEntry;
  playerName: string;
  abilityType: 'CAREER' | 'CHARACTER';
};

export function AbilityActivationBanner({ notice }: { notice: AbilityFeedback }) {
  const transition = formatEventTransition(notice.event);
  return (
    <aside className="ability-activation-flash" role="status" aria-live="polite" key={notice.event.id}>
      <span className="mono">{notice.playerName} / {notice.abilityType}</span>
      <strong>{transition ? `ABILITY ACTIVATED / ${transition}` : 'ABILITY ACTIVATED'}</strong>
      <small className="mono">{notice.event.label} / TRIGGER {notice.event.eventType.replaceAll('_', ' ')}</small>
      <p>{notice.event.detail}</p>
    </aside>
  );
}

export function SpaceRewardBanner({
  event,
  playerName,
  spaceLabel,
  outcome,
}: {
  event: EventLogEntry;
  playerName: string;
  spaceLabel: string;
  outcome: string;
}) {
  return (
    <aside className="space-reward-flash" role="status" aria-live="polite" key={event.id}>
      <span className="mono">{playerName} / SPACE RESOLVED</span>
      <strong>{spaceLabel}</strong>
      <b>{outcome}</b>
      <p>{event.detail}</p>
    </aside>
  );
}