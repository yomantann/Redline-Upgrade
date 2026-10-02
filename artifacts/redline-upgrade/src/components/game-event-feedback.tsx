import type { EventLogEntry, GameEventType } from '@/game/events/types';
import { formatMoney } from '@/game/careers';
import { getAbility } from '@/game/abilities';
import type { PlayerStat } from '@/game/player';

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
  if (event.eventType === 'AI_SKILL_CHANGED') return 'AI SKILL';
  if (event.eventType === 'FAME_CHANGED') return 'FAME';
  if (event.eventType === 'LIFESTYLE_CHANGED') return 'LIFESTYLE';
  if (event.eventType === 'INFLUENCE_CHANGED') return 'INFLUENCE';
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

export const PLAYER_CHANGE_FEEDBACK_MS = 10000;
export const PLAYER_CHANGE_PULSE_MAX_MS = 2500;

export function getPlayerStatChangePulseDuration(expiresAt: number, queuedExpirations: number[], now: number): number {
  const sameDeadlineCount = 1 + queuedExpirations.filter(expiration => expiration <= expiresAt).length;
  return Math.max(450, Math.min(PLAYER_CHANGE_PULSE_MAX_MS, Math.floor((expiresAt - now) / sameDeadlineCount)));
}

export type PlayerStatChange = {
  id: string;
  stat: PlayerStat;
  delta: number;
  amountText: string;
  positive: boolean;
  sourceLabel?: string;
};

export type PlayerStatChangePulse = PlayerStatChange & { durationMs: number };

const statForEventType: Partial<Record<GameEventType, PlayerStat>> = {
  WEALTH_CHANGED: 'wealth',
  AI_SKILL_CHANGED: 'aiSkill',
  FAME_CHANGED: 'fame',
  LIFESTYLE_CHANGED: 'lifestyle',
  INFLUENCE_CHANGED: 'influence',
};

function playerStatSourceLabel(event: EventLogEntry, eventLog: EventLogEntry[], delta: number): string | undefined {
  const sourceEvent = event.sourceEventId
    ? eventLog.find(entry => entry.id === event.sourceEventId)
    : undefined;
  const abilityId = event.abilityId ?? sourceEvent?.abilityId;
  const ability = abilityId ? getAbility(abilityId) : undefined;
  const labels: string[] = [];

  if (abilityId) {
    const family = abilityId.startsWith('career')
      ? 'CAREER'
      : abilityId.startsWith('character:')
        ? 'CHARACTER'
        : null;
    if (ability?.mode === 'PASSIVE') labels.push(family ? `${family} PASSIVE` : 'PASSIVE');
    else if (family) labels.push(`${family} ABILITY`);
    else labels.push('ABILITY');
  } else if (sourceEvent?.eventType === 'CARD_RESOLVED') {
    labels.push(`${sourceEvent.deck?.replaceAll('-', ' ').toUpperCase() ?? 'CARD'} CARD`);
  } else if (sourceEvent?.eventType === 'BOARD_EFFECT_RESOLVED') {
    labels.push('BOARD EFFECT');
  } else if (event.eventType === 'ASSET_PURCHASED') {
    labels.push('ASSET PURCHASE');
  } else if (event.reason?.toLowerCase() === 'salary gate') {
    labels.push('PASSIVE');
  }

  if (event.baseDelta !== undefined && event.baseDelta > 0 && delta > event.baseDelta) {
    labels.push('CAREER BONUS');
  }
  return labels.length ? labels.join(' · ') : undefined;
}

function formatWealthDelta(amount: number): string {
  const units = [
    { scale: 1_000_000_000, suffix: 'B' },
    { scale: 1_000_000, suffix: 'M' },
    { scale: 1_000, suffix: 'K' },
  ];
  for (const unit of units) {
    const scaled = amount / unit.scale;
    if (scaled >= 1 && scaled < 1000 && Number.isInteger(scaled * 1000)) {
      return `$${scaled.toLocaleString('en-US', { maximumFractionDigits: 3 })}${unit.suffix}`;
    }
  }
  return `$${amount.toLocaleString('en-US')}`;
}

export function formatPlayerStatChange(event: EventLogEntry, eventLog: EventLogEntry[]): PlayerStatChange | null {
  if (!statForEventType[event.eventType] && event.eventType !== 'ASSET_PURCHASED') return null;
  const stat = event.stat ?? statForEventType[event.eventType] ?? (event.eventType === 'ASSET_PURCHASED' ? 'wealth' : undefined);
  if (!stat) return null;

  const previous = event.previousValue ?? (stat === 'wealth' ? event.previousWealth : undefined);
  const next = event.newValue ?? (stat === 'wealth' ? event.newWealth : undefined);
  if (previous === undefined || next === undefined) return null;
  const delta = event.delta ?? next - previous;
  if (!delta) return null;

  const amount = stat === 'wealth'
    ? formatWealthDelta(Math.abs(delta))
    : Math.abs(delta).toLocaleString('en-US');
  return {
    id: event.id,
    stat,
    delta,
    amountText: `${delta > 0 ? '+' : '−'}${amount}`,
    positive: delta > 0,
    sourceLabel: playerStatSourceLabel(event, eventLog, delta),
  };
}

export function groupPlayerStatChangesByPlayer(
  newEvents: EventLogEntry[],
  eventLog: EventLogEntry[],
  playerIds: ReadonlySet<string>,
): Map<string, PlayerStatChange[]> {
  const changesByPlayer = new Map<string, PlayerStatChange[]>();
  for (const event of newEvents) {
    const change = formatPlayerStatChange(event, eventLog);
    if (!change || !playerIds.has(event.playerId)) continue;
    const changes = changesByPlayer.get(event.playerId) ?? [];
    changes.push(change);
    changesByPlayer.set(event.playerId, changes);
  }
  return changesByPlayer;
}

export function PlayerStatChangeOverlay({
  change,
  playerIndex,
  surface,
}: {
  change: PlayerStatChangePulse;
  playerIndex: number;
  surface: 'summary' | 'detail';
}) {
  return (
    <span
      className={`player-stat-change-pulse ${change.positive ? 'positive' : 'negative'}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-testid={`player-stat-change-${playerIndex}-${change.stat}-${surface}`}
      style={{ animationDuration: `${change.durationMs}ms` }}
    >
      <b>{change.amountText}</b>
      {change.sourceLabel && <small className="mono">{change.sourceLabel}</small>}
    </span>
  );
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