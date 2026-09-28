import type { EventLogEntry } from '@/game/events/types';
import { formatMoney } from '@/game/careers';

export function formatSpaceFeedbackOutcome(event: EventLogEntry): string {
  const delta = event.amount ?? 0;
  const signed = `${delta >= 0 ? '+' : '−'}${Math.abs(delta).toLocaleString('en-US')}`;
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
  return (
    <aside className="ability-activation-flash" role="status" aria-live="polite" key={notice.event.id}>
      <span className="mono">{notice.playerName} / {notice.abilityType} ABILITY ACTIVATED</span>
      <strong>{notice.event.label}</strong>
      <small className="mono">TRIGGER / {notice.event.eventType.replaceAll('_', ' ')}</small>
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