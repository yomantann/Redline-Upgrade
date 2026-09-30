import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { getCharacter } from '@/game/characters';
import { getCard } from '@/game/cards';
import { getAsset, type AssetSlot } from '@/game/assets';
import { CARD_READ_MINIMUM_MS, CPU_CARD_RESULT_MS } from '@/game/card-reveal-timing';
import type { MatchAction, PendingDecision, WealthEvent } from '@/game/match';
import { effectiveSalaryAmount } from '@/game/player';
import type { EndgameChoice } from '@/game/endgame';
import type { EventLogEntry } from '@/game/events/types';
import { FINISH_ORDER_WEALTH_REWARDS, formatMoney, getCareer, SALARY_TIERS } from '@/game/careers';
import { useGame } from '@/game/state';
import { CareerGlyph } from './career-reveal';
import { CharacterPortrait } from './character-portrait';
import { GameBoard } from './game-board';
import { DiceRoller } from './dice-roller';
import { MilestoneChoice } from './milestone-choice';
import { PlayerAssets } from './player-assets';
import { PlayerAbilityDetails } from './player-ability-details';
import { AbilityActivationBanner, formatEventTransition, formatSpaceFeedbackOutcome, SpaceRewardBanner, type AbilityFeedback } from './game-event-feedback';
import { UpgradeTokenControls } from './upgrade-token-controls';
import { CardTabletop } from './card-tabletop';
import { FinishLinePanel, MatchResultsPanel } from './finish-line-panel';
import { EndgameAttributeBonusSummary } from './endgame-attribute-bonus-summary';
import { SpaceIcon } from './space-icon';
import { CareerDeckBadges } from './career-deck-badges';
import './game-screen.css';

function WealthCounter({ amount, compact = false }: { amount: number; compact?: boolean }) {
  const [display, setDisplay] = useState(amount);
  const lastAmount = useRef(amount);
  useEffect(() => {
    const startAmount = lastAmount.current;
    lastAmount.current = amount;
    if (startAmount === amount || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(amount);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 850);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(startAmount + (amount - startAmount) * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [amount]);
  return <span className={compact ? 'wealth-number compact' : 'wealth-number'} data-testid="text-wealth-counter">{formatMoney(display)}</span>;
}

const spaceFeedbackTypes = new Set([
  'BOARD_EFFECT_RESOLVED',
  'WEALTH_CHANGED',
  'AI_SKILL_CHANGED',
  'FAME_CHANGED',
  'LIFESTYLE_CHANGED',
  'INFLUENCE_CHANGED',
  'UPGRADE_TOKEN_GAINED',
  'UPGRADE_TOKEN_SPENT',
  'UPGRADE_TOKEN_HELD',
  'ASSET_UPGRADED',
  'MILESTONE',
  'CAREER_CHANGE',
  'SALARY_GATE',
]);

const boardZones = ['THE GRIND', 'THE RISE', 'THE FLEX', 'THE CHAOS', 'THE ENDGAME'] as const;
type PlayerCardLayout = 'compact' | 'wide';
type PlayerCardDisclosure = { layout: PlayerCardLayout; open: boolean };

function boardZone(position: number): string {
  if (position <= 0) return 'LAUNCH PAD';
  return boardZones[Math.min(boardZones.length - 1, Math.floor((position - 1) / 15))];
}

function ordinal(place: number): string {
  return `${place}${place === 1 ? 'ST' : place === 2 ? 'ND' : place === 3 ? 'RD' : 'TH'}`;
}

function summarizeCardResolution(events: EventLogEntry[], playerId: string): string | undefined {
  let drawIndex = -1;
  for (let index = events.length - 1; index >= 0; index -= 1) {
    if (events[index].eventType === 'CARD_DRAW' && events[index].playerId === playerId) {
      drawIndex = index;
      break;
    }
  }
  if (drawIndex < 0) return undefined;
  const results = events.slice(drawIndex + 1)
    .filter(event => event.eventType === 'CARD_RESOLVED' || Boolean(formatEventTransition(event)) || event.source === 'ABILITY')
    .map(event => {
      const transition = formatEventTransition(event);
      if (event.eventType === 'CARD_RESOLVED') return event.detail;
      if (event.source === 'ABILITY') return `${event.label}: ${transition ?? event.detail}`;
      return transition ?? '';
    })
    .filter(Boolean);
  return [...new Set(results)].slice(-6).join(' · ') || undefined;
}

export function GameScreen() {
  const [, navigate] = useLocation();
  const { match, dispatchMatch, rollDice } = useGame();
  const [compactPlayerLayout, setCompactPlayerLayout] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 700px)').matches);
  const [playerCardDisclosure, setPlayerCardDisclosure] = useState<Record<string, PlayerCardDisclosure>>({});
  const phase = match?.phase;
  const turnIndex = match?.turnIndex;
  const remaining = match?.stepsRemaining;
  const isCPU = match?.players[match.turnIndex].isCPU;
  const pending = match?.pending;
  const decisionPlayerIndex = pending?.kind === 'ABILITY' ? pending.playerIndex : turnIndex;
  const decisionIsCPU = decisionPlayerIndex === undefined ? isCPU : match?.players[decisionPlayerIndex]?.isCPU;
  const onRollComplete = useCallback(() => dispatchMatch({ type: 'REVEAL' }), [dispatchMatch]);
  const latestEvent: WealthEvent | undefined = match?.wealthEvents.filter(event => event.kind === 'PAYDAY').at(-1);
  const latestAbilityEvent = match?.eventLog.filter(event => event.source === 'ABILITY').at(-1);
  const landedPlayer = match && match.lastLanding ? match.players[match.lastLanding.playerIndex] : undefined;
  const isCardLanding = match?.pending?.kind === 'CARD'
    || match?.lastLanding?.space.type === 'CARD'
    || match?.lastLanding?.space.type === 'GAMBLE';
  const latestSpaceEvent = !isCardLanding && landedPlayer && match?.lastLanding
    ? match.eventLog.slice().reverse().find(event =>
      event.playerId === landedPlayer.playerId
      && !event.abilityId
      && spaceFeedbackTypes.has(event.eventType),
    )
    : undefined;
  const lastSeenEvent = useRef(latestEvent?.id);
  const lastSeenAbilityEvent = useRef(latestAbilityEvent?.id);
  const lastSeenSpaceEvent = useRef(latestSpaceEvent?.id);
  const [visibleEvent, setVisibleEvent] = useState<WealthEvent | null>(null);
  const [abilityNotice, setAbilityNotice] = useState<AbilityFeedback | null>(null);
  const [spaceNotice, setSpaceNotice] = useState<{
    event: EventLogEntry;
    playerName: string;
    spaceLabel: string;
    outcome: string;
  } | null>(null);
  const previousEquipment = useRef(match?.players.map(player => ({ ...player.equipment })) ?? []);
  const [purchaseNotice, setPurchaseNotice] = useState<{ id: string; name: string; player: string; currentWealth?: number } | null>(null);
  const [zoneNotice, setZoneNotice] = useState<{ id: string; playerName: string; zone: string } | null>(null);
  const previousZonePosition = useRef<{ playerId: string; position: number } | null>(null);
  const previousDecision = useRef<PendingDecision | null>(pending ?? null);
  const [careerLocked, setCareerLocked] = useState(false);
  const currentPlayerId = match?.players[match.turnIndex]?.playerId ?? null;
  const currentGambleCardId = match?.players[match.turnIndex]?.endgame?.gambleCardId ?? null;
  const gambleCardKey = currentPlayerId && currentGambleCardId ? `${currentPlayerId}:${currentGambleCardId}` : null;
  const lastGambleCardKey = useRef<string | null>(null);
  const [gambleCardStage, setGambleCardStage] = useState<'draw' | 'resolved'>('draw');

  useEffect(() => {
    const query = window.matchMedia('(max-width: 700px)');
    const updateLayout = (event: MediaQueryListEvent) => setCompactPlayerLayout(event.matches);
    setCompactPlayerLayout(query.matches);
    query.addEventListener('change', updateLayout);
    return () => query.removeEventListener('change', updateLayout);
  }, []);

  useEffect(() => {
    if (previousDecision.current?.kind === 'CAREER' && previousDecision.current.stage === 'choice' && !pending && phase !== 'decision') setCareerLocked(true);
    previousDecision.current = pending ?? null;
  }, [pending, phase]);

  useEffect(() => {
    if (!careerLocked) return;
    const timer = window.setTimeout(() => setCareerLocked(false), 3000);
    return () => window.clearTimeout(timer);
  }, [careerLocked]);

  useEffect(() => {
    if (!gambleCardKey) {
      lastGambleCardKey.current = null;
      return;
    }
    if (lastGambleCardKey.current === gambleCardKey) return;
    lastGambleCardKey.current = gambleCardKey;
    setGambleCardStage('draw');
    const timer = window.setTimeout(() => setGambleCardStage('resolved'), 2600);
    return () => window.clearTimeout(timer);
  }, [gambleCardKey]);

  useEffect(() => {
    if (!match) return;
    const slots: AssetSlot[] = ['car', 'lifestyle', 'companion', 'property'];
    let notice: typeof purchaseNotice = null;
    match.players.forEach((player, index) => {
      for (const slot of slots) {
        const id = player.equipment[slot];
        if (id && id !== previousEquipment.current[index]?.[slot]) {
          const asset = getAsset(id);
          if (asset) notice = {
            id: `${player.playerId}-${id}`,
            name: asset.name,
            player: player.isCPU ? `CPU ${player.slot}` : 'YOU',
             currentWealth: player.wealth,
          };
        }
      }
    });
    previousEquipment.current = match.players.map(player => ({ ...player.equipment }));
    if (notice) setPurchaseNotice(notice);
  }, [match?.players]);

  useEffect(() => {
    if (!purchaseNotice) return;
    const timer = window.setTimeout(() => setPurchaseNotice(current => current?.id === purchaseNotice.id ? null : current), 4000);
    return () => window.clearTimeout(timer);
  }, [purchaseNotice?.id]);

  useEffect(() => {
    if (!latestEvent || latestEvent.id === lastSeenEvent.current) return;
    lastSeenEvent.current = latestEvent.id;
    setVisibleEvent(latestEvent);
    const timer = window.setTimeout(() => setVisibleEvent((current) => current?.id === latestEvent.id ? null : current), 3800);
    return () => window.clearTimeout(timer);
  }, [latestEvent?.id]);

  useEffect(() => {
    if (!latestAbilityEvent || latestAbilityEvent.id === lastSeenAbilityEvent.current || !match) return;
    lastSeenAbilityEvent.current = latestAbilityEvent.id;
    const player = match.players.find(candidate => candidate.playerId === latestAbilityEvent.playerId);
    if (!player) return;
    const career = player.careerId ? getCareer(player.careerId) : undefined;
    const abilityType = career?.abilityIds.includes(latestAbilityEvent.abilityId ?? '') ? 'CAREER' : 'CHARACTER';
    const character = getCharacter(player.characterId);
    setAbilityNotice({
      event: latestAbilityEvent,
      abilityType,
      playerName: abilityType === 'CAREER' ? career?.name ?? player.displayName : character?.name ?? player.displayName,
    });
    const timer = window.setTimeout(() => {
      setAbilityNotice(current => current?.event.id === latestAbilityEvent.id ? null : current);
    }, 4200);
    return () => window.clearTimeout(timer);
  }, [latestAbilityEvent?.id]);

  useEffect(() => {
    if (!latestSpaceEvent || latestSpaceEvent.id === lastSeenSpaceEvent.current || !match?.lastLanding || !landedPlayer) return;
    lastSeenSpaceEvent.current = latestSpaceEvent.id;
    const character = getCharacter(landedPlayer.characterId);
    setSpaceNotice({
      event: latestSpaceEvent,
      playerName: character?.name ?? landedPlayer.displayName,
      spaceLabel: match.lastLanding.space.label,
      outcome: formatSpaceFeedbackOutcome(latestSpaceEvent),
    });
    const timer = window.setTimeout(() => {
      setSpaceNotice(current => current?.event.id === latestSpaceEvent.id ? null : current);
    }, 3800);
    return () => window.clearTimeout(timer);
  }, [latestSpaceEvent?.id]);

  useEffect(() => {
    const activePlayer = match?.players[match.turnIndex];
    if (!activePlayer) {
      previousZonePosition.current = null;
      return;
    }
    const previous = previousZonePosition.current;
    previousZonePosition.current = { playerId: activePlayer.playerId, position: activePlayer.position };
    if (!previous || previous.playerId !== activePlayer.playerId || previous.position === activePlayer.position) return;
    const previousZone = boardZone(previous.position);
    const nextZone = boardZone(activePlayer.position);
    if (previousZone === nextZone) return;
    const noticeId = `${activePlayer.playerId}-${activePlayer.position}`;
    setZoneNotice({ id: noticeId, playerName: activePlayer.isCPU ? `CPU ${activePlayer.slot}` : 'YOU', zone: nextZone });
    const timer = window.setTimeout(() => setZoneNotice(current => current?.id === noticeId ? null : current), 3000);
    return () => window.clearTimeout(timer);
  }, [match?.players[match?.turnIndex ?? 0]?.playerId, match?.players[match?.turnIndex ?? 0]?.position, match?.turnIndex]);

  useEffect(() => {
    if (!match) return;
    let delay: number;
    let callback: () => void;
    if (phase === 'ready' && isCPU) {
      delay = 850;
      callback = rollDice;
    } else if (phase === 'reveal') {
      delay = 700;
      callback = () => dispatchMatch({ type: 'MOVE' });
    } else if (phase === 'moving') {
      delay = 360;
      callback = () => dispatchMatch({ type: 'STEP' });
  } else if (phase === 'decision' && decisionIsCPU && pending) {
      if (pending.kind === 'CARD') {
        delay = pending.stage === 'draw' ? CARD_READ_MINIMUM_MS : CPU_CARD_RESULT_MS;
        callback = () => dispatchMatch({ type: 'AUTO_DECIDE' });
      } else {
        delay = 1050;
        callback = () => dispatchMatch({ type: 'AUTO_DECIDE' });
      }
    } else if (phase === 'landed') {
      if (match.players[match.turnIndex].endgame?.status === 'RESOLVED' && !isCPU) return;
      const resolvedGamble = match.players[match.turnIndex].endgame?.gambleCardId;
      delay = isCPU && resolvedGamble ? 5200 : turnIndex === 0 ? 2300 : 1700;
      callback = () => dispatchMatch({ type: 'NEXT_TURN' });
    } else if (phase === 'endgame' && isCPU) {
      delay = 1150;
      callback = () => dispatchMatch({ type: 'AUTO_DECIDE' });
    } else return;
    const timer = window.setTimeout(callback, delay);
    return () => window.clearTimeout(timer);
}, [match === null, phase, isCPU, decisionIsCPU, decisionPlayerIndex, turnIndex, remaining, pending?.kind, pending?.kind === 'CARD' || pending?.kind === 'CAREER' ? pending.stage : pending?.kind === 'ASSET' ? pending.category : pending?.kind === 'ABILITY' ? pending.decision : undefined, rollDice, dispatchMatch]);

  if (!match) return (
    <main className="game-gate">
      <span className="eyebrow">NO MATCH LOADED</span>
      <h1 className="display">Start the<br />signal.</h1>
      <button className="action" type="button" onClick={() => navigate('/characters')} data-testid="button-board-choose-character">Choose your character <span aria-hidden>↗</span></button>
    </main>
  );

  const active = match.players[match.turnIndex];
const decisionPlayer = pending?.kind === 'ABILITY' ? match.players[pending.playerIndex] : active;
  const currentCharacter = getCharacter(active.characterId);
  const currentCareer = active.careerId ? getCareer(active.careerId) : undefined;
  const landing = match.lastLanding;
  const roll = match.roll;
  const rollDisabledReason = active.isCPU
    ? 'CPU turn'
    : match.phase !== 'ready'
      ? 'Available when your turn is ready'
      : undefined;
  const cardResultSummary = pending?.kind === 'CARD' && pending.stage === 'resolved'
    ? summarizeCardResolution(match.eventLog, active.playerId)
    : undefined;
  const landingEvent = landing ? match.wealthEvents?.slice().reverse().find((event) => event.kind === 'PAYDAY' && event.playerIndex === landing.playerIndex && event.space === landing.space.number) : undefined;
  const recentLog = match.eventLog.slice(-4).reverse();

  if (match.phase === 'complete') {
    return (
      <main className="game-screen game-screen-finish-line">
        <EndgameAttributeBonusSummary awards={match.endgameAttributeBonuses} players={match.players} />
        <MatchResultsPanel players={match.players} finishOrder={match.finishOrder} />
      </main>
    );
  }

  if (match.phase === 'endgame' || (match.phase === 'landed' && active.endgame?.status === 'RESOLVED')) {
    if (!active.endgame) return null;
    const endgameCard = active.endgame.gambleCardId ? getCard(active.endgame.gambleCardId) : undefined;
    const gambleEvent = endgameCard
      ? match.eventLog.slice().reverse().find((event) => event.eventType === 'FINAL_GAMBLE_RESOLVED')
      : undefined;
    const gambleResult = gambleEvent
      ? [gambleEvent.detail, formatEventTransition(gambleEvent)].filter(Boolean).join(' · ')
      : undefined;
    return (
      <main className="game-screen game-screen-finish-line">
        <EndgameAttributeBonusSummary awards={match.endgameAttributeBonuses} players={match.players} />
        <FinishLinePanel
          player={active}
          endgame={active.endgame}
          finishPlace={match.finishOrder.indexOf(match.turnIndex) + 1}
          finishBonus={FINISH_ORDER_WEALTH_REWARDS[match.finishOrder.indexOf(match.turnIndex)] ?? 0}
          abilityNotice={abilityNotice ?? undefined}
          onChoose={(choice: EndgameChoice) => dispatchMatch({ type: 'CHOOSE_ENDGAME', choice })}
          onContinue={() => dispatchMatch({ type: 'NEXT_TURN' })}
        />
        {endgameCard && (
          <CardTabletop
            activeDeck="gamble"
            activeCard={endgameCard}
            cardStage={gambleCardStage}
            cardPiles={match.cardPiles}
            isCPU={active.isCPU}
            actorName={currentCharacter?.name ?? active.displayName}
            actorLabel={active.isCPU ? `CPU ${active.slot}` : 'YOU'}
            resultSummary={gambleResult}
            showDeckBay={false}
            onAcknowledge={() => dispatchMatch({ type: 'NEXT_TURN' })}
          />
        )}
      </main>
    );
  }

  return (
    <main className="game-screen">
      <section className="game-head">
        <div>
          <span className="eyebrow">MATCH 01 / LOCAL TABLETOP</span>
          <h1 className="display">The <span>board.</span></h1>
        </div>
      </section>

      {visibleEvent && (
        <div className={`payday-flash ${visibleEvent.amount < 0 ? 'negative' : ''}`} role="status" aria-live="polite" key={visibleEvent.id}>
          <span className="mono">{match.players[visibleEvent.playerIndex]?.isCPU ? `CPU ${match.players[visibleEvent.playerIndex].slot} / PAYDAY` : 'YOUR PAYDAY'} // SPACE {String(visibleEvent.space).padStart(2, '0')}</span>
          <strong>{visibleEvent.amount >= 0 ? '+' : '−'}{formatMoney(Math.abs(visibleEvent.amount))}</strong>
          <span className="mono">WEALTH {visibleEvent.amount >= 0 ? 'INCREASED' : 'DECREASED'}</span>
        </div>
      )}
      {spaceNotice && <SpaceRewardBanner {...spaceNotice} />}
      {abilityNotice && <AbilityActivationBanner notice={abilityNotice} />}
       {purchaseNotice && <div className="asset-purchase-flash" role="status" aria-live="polite" key={purchaseNotice.id}><span className="mono">{purchaseNotice.player} / NEW ASSET ACQUIRED</span><strong>{purchaseNotice.name}</strong>{purchaseNotice.currentWealth !== undefined && <span className="mono">WEALTH NOW / {formatMoney(purchaseNotice.currentWealth)}</span>}</div>}
      {careerLocked && <div className="career-locked-flash" role="status" aria-live="polite"><span className="mono">SPACE 35 / DECISION COMPLETE</span><strong>CAREER LOCKED IN</strong><span className="mono">SALARY AND WEALTH UNCHANGED</span></div>}
       {zoneNotice && <div className="zone-transition-flash" role="status" aria-live="polite" key={zoneNotice.id}><span className="mono">{zoneNotice.playerName} / ROUTE UPDATE</span><strong>{zoneNotice.zone}</strong><span className="mono">NEW BOARD SECTION</span></div>}

 {match.phase === 'decision' && pending && pending.kind !== 'CARD' && <MilestoneChoice pending={pending} player={decisionPlayer} players={match.players} onAction={dispatchMatch} />}

      <section className="game-players" aria-label="Players, careers and finances">
        {match.players.map((contestant, index) => {
          const character = getCharacter(contestant.characterId);
          const career = contestant.careerId ? getCareer(contestant.careerId) : undefined;
          const secondCareer = contestant.secondCareer ? getCareer(contestant.secondCareer.careerId) : undefined;
          const paydaySalary = effectiveSalaryAmount(contestant);
          const paydayTier = contestant.secondCareer && contestant.secondCareer.salaryAmount > contestant.salaryAmount
            ? SALARY_TIERS[contestant.secondCareer.salaryTier - 1] ?? 'UNASSIGNED'
            : contestant.salaryTier >= 1 && contestant.salaryTier <= 4 ? SALARY_TIERS[contestant.salaryTier - 1] : 'UNASSIGNED';
          const finishPlaceIndex = match.finishOrder.indexOf(index);
          const finishPlace = finishPlaceIndex >= 0 ? finishPlaceIndex + 1 : null;
          const finishBonus = finishPlace ? FINISH_ORDER_WEALTH_REWARDS[finishPlaceIndex] ?? 0 : 0;
          const change = visibleEvent?.playerIndex === index ? visibleEvent : null;
          const cardLayout: PlayerCardLayout = compactPlayerLayout ? 'compact' : 'wide';
          const savedDisclosure = playerCardDisclosure[contestant.playerId];
          const playerCardOpen = savedDisclosure?.layout === cardLayout ? savedDisclosure.open : !compactPlayerLayout;
          return (
             <article className={`game-player ${index === match.turnIndex ? 'active' : ''} ${index === 0 ? 'human' : ''}`} key={contestant.playerId} data-slot={index} data-active={index === match.turnIndex} data-testid={`card-player-${index}`} aria-label={`${character?.name ?? contestant.displayName}, ${contestant.isCPU ? `CPU ${contestant.slot}` : 'human player'}${index === match.turnIndex ? ', active turn' : ''}`}>
                <details
                  className="game-player-details"
                  open={playerCardOpen}
                  onToggle={event => {
                    const open = event.currentTarget.open;
                    setPlayerCardDisclosure(current => {
                      const previous = current[contestant.playerId];
                      if (previous?.layout === cardLayout && previous.open === open) return current;
                      return { ...current, [contestant.playerId]: { layout: cardLayout, open } };
                    });
                  }}
                >
                 <summary className="game-player-summary" data-testid={`button-toggle-player-status-${index}`}>
                    <div className="game-player-summary-top">
                      <span className="game-player-index mono">0{index + 1} / {contestant.isCPU ? `CPU ${contestant.slot}` : 'YOU'}</span>
                      {index === match.turnIndex && <span className={`game-player-summary-active ${contestant.isCPU ? 'cpu' : ''}`} data-testid={`status-active-player-${index}`}>{contestant.isCPU ? `CPU ${contestant.slot} ACTIVE` : 'YOUR TURN'}</span>}
                      <span className="game-player-position mono">{contestant.status === 'FINISHED' ? 'FINISHED' : contestant.position === 0 ? 'START' : `SPACE ${String(contestant.position).padStart(2, '0')}`}{finishPlace ? ` / ${ordinal(finishPlace)}` : ''}</span>
                    </div>
                   <div className="game-player-summary-identity">
                     {character && <CharacterPortrait character={character} className="game-player-summary-portrait" />}
                     <div><span className="mono">CHARACTER</span><strong>{character?.name ?? contestant.displayName}</strong><small>{career?.name ?? 'Unassigned'}{secondCareer ? ` + ${secondCareer.name}` : ''}</small></div>
                   </div>
                   <div className="game-player-summary-values">
                     <span><small className="mono">WEALTH</small><b>{formatMoney(contestant.wealth)}</b></span>
                     <span><small className="mono">PAYDAY</small><b>{formatMoney(paydaySalary)}</b></span>
                     <span><small className="mono">UPGRADE TOKENS</small><b>{contestant.upgradeTokens}</b></span>
                   </div>
                    <span className="game-player-summary-toggle mono">DETAILS</span>
                 </summary>
                 <div className="game-player-expanded">
               <div className={`game-player-top ${contestant.status === 'FINISHED' ? 'finished' : ''}`}>
                 <span className="game-player-index mono">0{index + 1} / {contestant.isCPU ? `CPU ${contestant.slot}` : 'YOU'}</span>
                  <span className="game-player-position mono">{contestant.position === 0 ? 'START' : `SPACE ${String(contestant.position).padStart(2, '0')}`}{contestant.status === 'FINISHED' ? ' / FINISHED' : ''}{finishPlace ? ` / ${ordinal(finishPlace)}` : ''}</span>
               </div>
               {index === match.turnIndex && <div className="game-player-active-signal" aria-label="Active turn"><i aria-hidden="true" /> ACTIVE TURN</div>}
               <div className="game-player-identity">
                 {character && <CharacterPortrait character={character} className="game-player-portrait" />}
                  <div className="game-player-identity-copy"><span className="mono">CHARACTER / {String(index + 1).padStart(2, '0')}</span><strong className="game-player-name" data-testid={`text-player-character-${index}`}>{character?.name ?? contestant.displayName}</strong><small>{contestant.isCPU ? `CPU ${contestant.slot} // ` : 'LOCAL // '}{contestant.status === 'FINISHED' ? 'FINISHED' : 'IN PLAY'}</small></div>
               </div>
              <div className="game-player-career">
                <CareerGlyph icon={career?.icon || career?.name || 'career'} />
                  <div>
                    <span className="mono">CAREER</span>
                    <b data-testid={`text-player-career-${index}`}>{career?.name ?? 'Unassigned'}</b>
                    {secondCareer && <small className="mono">SECOND CAREER / {secondCareer.name} · {formatMoney(contestant.secondCareer!.salaryAmount)} salary</small>}
                    {career?.acquisitionBenefitDescription && <small className="mono" title="Granted whenever this career is newly acquired">CAREER BENEFIT / {career.acquisitionBenefitDescription}</small>}
                    {career && <CareerDeckBadges career={career} compact />}
                  </div>
              </div>
              {finishPlace && (
                <div className="game-player-finish" aria-label={`${ordinal(finishPlace)} to finish, bonus ${formatMoney(finishBonus)}`}>
                  <b>{ordinal(finishPlace)}</b>
                  <div><strong>TO FINISH</strong><small>FINISH BONUS / +{formatMoney(finishBonus)}</small></div>
                  <small className="finish-wealth-change">CURRENT WEALTH / {formatMoney(contestant.wealth)}</small>
                </div>
              )}
              <PlayerAbilityDetails career={career} character={character} />
               <div className={`game-player-salary salary-tier-${contestant.salaryTier}`}><span className="mono">PAYDAY TIER / {paydayTier}</span><b data-testid={`text-player-salary-${index}`}>{formatMoney(paydaySalary)}<small> / PAYDAY</small></b></div>
              <div className="game-player-wealth">
                 <span className="mono"><SpaceIcon name="wealth" size={12} /> WEALTH</span>
                <WealthCounter amount={contestant.wealth} />
                {change && <span className={`wealth-change ${change.amount < 0 ? 'negative' : ''}`} key={change.id}>{change.amount >= 0 ? '+' : '−'}{formatMoney(Math.abs(change.amount))}</span>}
              </div>
              <div className="game-player-stats">
                {([['AI SKILL', contestant.aiSkill], ['FAME', contestant.fame], ['LIFESTYLE', contestant.lifestyle], ['INFLUENCE', contestant.influence]] as const).map(([label, value]) => (
                   <div key={label} data-stat={label.toLowerCase().replace(' ', '-')}><span className="mono"><SpaceIcon name={label === 'AI SKILL' ? 'ai' : label.toLowerCase()} size={11} /> {label}</span><b>{value.toLocaleString()}</b></div>
                ))}
              </div>
               <PlayerAssets equipment={contestant.equipment} assetLevels={contestant.assetLevels} upgradeTokens={contestant.upgradeTokens} heldUpgradeTokens={contestant.heldUpgradeTokens} playerIndex={index} />
                 </div>
               </details>
            </article>
          );
        })}
      </section>

       {(match.phase !== 'decision' || pending?.kind === 'CARD') && <div className="game-tabletop">
       <div className="game-tabletop-board"><GameBoard
        players={match.players}
        activePlayerId={active.playerId}
        landingPosition={match.phase === 'landed' ? landing?.space.number ?? null : null}
        movingPlayerId={match.phase === 'moving' ? active.playerId : null}
        finishOrder={match.finishOrder}
       /></div>
        <aside className="game-dice-panel" aria-label="Turn status and dice">
          <div className={`turn-signal ${active.isCPU ? 'cpu' : ''}`} aria-live="polite">
            <span className="mono">ROUND {String(match.round).padStart(2, '0')} // TURN {match.turnIndex + 1} OF 4</span>
            <strong className="display">{active.isCPU ? `CPU ${active.slot}'S TURN` : 'YOUR TURN'}</strong>
            <small>{currentCharacter?.name} · {match.phase === 'ready' ? (active.isCPU ? 'Preparing to roll' : 'Ready to roll') : match.phase === 'rolling' ? 'Dice in motion' : match.phase === 'reveal' ? 'Roll resolved' : match.phase === 'moving' ? `${match.stepsRemaining} steps remaining` : match.phase === 'decision' ? 'Card draw in progress' : 'Space reached'}</small>
            {rollDisabledReason && <small className="roll-disabled-reason">ROLL UNAVAILABLE / {rollDisabledReason}</small>}
          </div>
          <DiceRoller
            roll={roll}
            phase={match.phase}
            disabled={active.isCPU || match.phase !== 'ready'}
            disabledReason={rollDisabledReason}
            onRoll={rollDice}
            onRollComplete={onRollComplete}
            rollerName={active.displayName}
            isHuman={!active.isCPU}
            buttonTestId="button-roll-top"
          />
        </aside>
       <CardTabletop
         activeDeck={match.phase === 'decision' && pending?.kind === 'CARD' ? pending.deck : undefined}
         activeCard={match.phase === 'decision' && pending?.kind === 'CARD' ? getCard(pending.cardId) : undefined}
         cardStage={match.phase === 'decision' && pending?.kind === 'CARD' ? pending.stage : undefined}
         cardPiles={match.cardPiles}
         isCPU={active.isCPU}
          actorName={currentCharacter?.name ?? active.displayName}
         actorLabel={active.isCPU ? `CPU ${active.slot}` : 'YOU'}
          resultSummary={cardResultSummary}
         onResolveCard={() => dispatchMatch({ type: 'RESOLVE_CARD' })}
         onAcknowledge={() => dispatchMatch({ type: 'ACKNOWLEDGE_CARD' })}
       />
       </div>}

      {match.phase === 'ready' && !active.isCPU && <UpgradeTokenControls player={active} onAction={(action: MatchAction) => dispatchMatch(action)} />}

      {match.phase !== 'decision' && <section className="game-console">
        <div className="game-readout">
          <div className="readout-top mono"><span>FIELD REPORT // LIVE</span><span>2 × D4</span></div>
          <div className="readout-primary">
            <span className="mono">CURRENT PLAYER</span>
            <strong>{active.displayName} <em>/ {currentCharacter?.name}</em></strong>
            <span className="mono">{currentCareer?.name ?? 'UNASSIGNED'} · POSITION {active.position === 0 ? 'START' : `${active.position} / 75`}</span>
          </div>
          <div className="readout-stats">
            <div className="readout-wealth"><span className="mono">WEALTH</span><strong><WealthCounter amount={active.wealth} compact /></strong></div>
            {([['AI SKILL', active.aiSkill], ['FAME', active.fame], ['LIFESTYLE', active.lifestyle], ['INFLUENCE', active.influence]] as const).map(([label, value]) => (
              <div key={label}><span className="mono">{label}</span><strong>{value.toLocaleString()}</strong></div>
            ))}
          </div>
          <div className="readout-landing" aria-live="polite">
            {landing ? (
              <>
                <span className="mono">LAST LANDING / {match.players[landing.playerIndex].displayName}</span>
                <div><strong>SPACE {String(landing.space.number).padStart(2, '0')}</strong><b>{landing.space.payday ? 'PAYDAY' : landing.space.type}</b></div>
                <p>{landingEvent
                  ? `Salary Gate: +${formatMoney(landingEvent.amount)} Wealth for ${match.players[landing.playerIndex].displayName}.`
                  : landing.space.number === 75 ? 'Finish-line decision resolved. The final value is recorded.'
                  : landing.space.type === 'CAREER_CHANGE' ? `Career opportunity resolved. Effective Payday salary: ${formatMoney(effectiveSalaryAmount(match.players[landing.playerIndex]))}.`
                  : landing.space.type === 'MILESTONE' ? (() => {
                    const slot = ({ 10: 'car', 30: 'lifestyle', 45: 'companion', 60: 'property' } as const)[landing.space.number as 10 | 30 | 45 | 60];
                    const item = slot ? match.players[landing.playerIndex].equipment[slot] : null;
                    return item ? `${getAsset(item)?.name ?? 'Asset'} acquired and added to the player card.` : 'Milestone passed without a purchase.';
                  })()
                  : landing.space.type === 'NORMAL' ? 'No effect on this space.'
                  : landing.space.type === 'GAMBLE' ? 'Gamble card resolved. Review the result before continuing.'
                  : landing.space.type === 'UPGRADE_TOKEN' ? 'Upgrade Token awarded and added to the player sheet.'
                  : 'Space effect resolved. See the event log for the result.'}</p>
              </>
            ) : (
              <><span className="mono">LANDING REPORT</span><p>Roll the dice to reveal your first destination.</p></>
            )}
          </div>
          <div className="readout-landing" aria-live="polite">
            <span className="mono">EVENT LOG</span>
            {recentLog.length ? recentLog.map((entry) => (
              <p key={entry.id}>
                <strong>{entry.label}</strong>
                {entry.source === 'ABILITY' && (
                  <>
                    <br />
                    <small className="mono">TRIGGER / {entry.eventType.replace(/_/g, ' ')}</small>
                  </>
                )}
                <br />
                {entry.detail}
              </p>
            )) : <p>No event activity yet.</p>}
          </div>
        </div>
      </section>}
    </main>
  );
}