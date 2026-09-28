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

function formatTransitionNumber(event: EventLogEntry, value: number): string {
  if (['WEALTH', 'SALARY', 'FINAL VALUE'].includes(transitionLabel(event))) return formatMoney(value);
  return value.toLocaleString('en-US');
}

export function formatEventTransition(event: EventLogEntry): string | null {
  const values = eventTransitionValues(event);
  if (!values) return null;
  const delta = event.delta ?? values.next - values.previous;
  const signedDelta = transitionLabel(event) === 'WEALTH' || transitionLabel(event) === 'SALARY'
    ? `${delta >= 0 ? '+' : '−'}${formatMoney(Math.abs(delta))}`
    : `${delta >= 0 ? '+' : '−'}${Math.abs(delta).toLocaleString('en-US')}`;
  const primary = `${transitionLabel(event)} ${formatTransitionNumber(event, values.previous)} → ${formatTransitionNumber(event, values.next)} / ${signedDelta}`;
  if (event.eventType !== 'ASSET_UPGRADED' || event.previousAssetValue === undefined || event.newAssetValue === undefined) return primary;
  const assetDelta = event.newAssetValue - event.previousAssetValue;
  return `${primary} · ASSET VALUE ${formatMoney(event.previousAssetValue)} → ${formatMoney(event.newAssetValue)} / ${assetDelta >= 0 ? '+' : '−'}${formatMoney(Math.abs(assetDelta))}`;
}

export function formatSpaceFeedbackOutcome(event: EventLogEntry): string {
  const delta = event.amount ?? 0;
  const signed = `${delta >= 0 ? '+' : '−'}${Math.abs(delta).toLocaleString('en-US')}`;
  const transition = formatEventTransition(event);
  if (event.eventType === 'SALARY_GATE') {
    const income = event.salaryAmount ?? delta;
    return `+${formatMoney(income)} SALARY${transition ? ` · ${transition}` : ''}`;
  }
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
      <span className="mono">{notice.playerName} / {notice.abilityType} ABILITY ACTIVATED</span>
      <strong>{notice.event.label}</strong>
      <small className="mono">TRIGGER / {notice.event.eventType.replaceAll('_', ' ')}</small>
      {transition && <b className="event-transition">{transition}</b>}
      <p>{notice.event.detail}</p>
    </aside>
  );
}

export function NumberChangeBanner({
  events,
  players,
}: {
  events: EventLogEntry[];
  players: { playerId: string; displayName: string; isCPU: boolean; slot: number }[];
}) {
  if (!events.length) return null;
  return (
    <aside className="number-change-flash" role="status" aria-live="polite" key={events.at(-1)?.id}>
      <span className="mono">GAME STATE / NUMBER CHANGES</span>
      {events.slice(-5).map((event) => {
        const player = players.find((candidate) => candidate.playerId === event.playerId);
        const who = player?.isCPU ? `CPU ${player.slot}` : player?.displayName ?? 'PLAYER';
        return (
          <div className="number-change-row" key={event.id}>
            <small className="mono">{who}</small>
            <strong>{formatEventTransition(event) ?? event.detail}</strong>
          </div>
        );
      })}
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
  const transition = formatEventTransition(event);
  return (
    <aside className="space-reward-flash" role="status" aria-live="polite" key={event.id}>
      <span className="mono">{playerName} / SPACE RESOLVED</span>
      <strong>{spaceLabel}</strong>
      <b>{outcome}</b>
      {transition && <small className="event-transition">{transition}</small>}
      <p>{event.detail}</p>
    </aside>
  );
}