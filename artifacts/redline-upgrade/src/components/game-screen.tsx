import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@workspace/replit-auth-web';
import { characters, getCharacter } from '@/game/characters';
import { getCard } from '@/game/cards';
import { getAsset, type AssetSlot } from '@/game/assets';
import { CARD_READ_MINIMUM_MS, CPU_CARD_DRAW_MS, CPU_CARD_RESULT_MS } from '@/game/card-reveal-timing';
import { createMatch, type Match, type MatchAction, type MatchPlayer, type PendingDecision, type WealthEvent } from '@/game/match';
import type { BoardId } from '@/game/boards';
import { effectiveSalaryAmount, type PlayerStat } from '@/game/player';
import type { EndgameChoice } from '@/game/endgame';
import { calculateEndgameBaseValue } from '@/game/endgame';
import type { EventLogEntry } from '@/game/events/types';
import { FINISH_ORDER_WEALTH_REWARDS, formatMoney, getCareer, SALARY_TIERS } from '@/game/careers';
import { availableUpgradeTokens } from '@/game/upgrade-tokens';
import { useGame } from '@/game/state';
import { CareerGlyph } from './career-reveal';
import { CharacterPortrait } from './character-portrait';
import { GameBoard } from './game-board';
import { DiceRoller } from './dice-roller';
import { MilestoneChoice } from './milestone-choice';
import { PlayerAssets } from './player-assets';
import { PlayerAbilityDetails } from './player-ability-details';
import { groupPlayerStatChangesByPlayer, PLAYER_CHANGE_FEEDBACK_MS, PlayerStatChangeOverlay, type PlayerStatChangePulse } from './game-event-feedback';
import { UpgradeTokenControls } from './upgrade-token-controls';
import { CardTabletop } from './card-tabletop';
import { FinishLinePanel, MatchResultsPanel } from './finish-line-panel';
import { EndgameAttributeBonusSummary } from './endgame-attribute-bonus-summary';
import { SpaceIcon } from './space-icon';
import { CareerDeckBadges } from './career-deck-badges';
import { AgeRestrictionBadge } from './age-restriction-badge';
import { MultiplayerCareerReveal } from './multiplayer-career-reveal';
import './game-screen.css';
import './mobile-gameplay.css';

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

type PlayerCardLayout = 'compact' | 'wide';
type PlayerCardDisclosure = { layout: PlayerCardLayout; open: boolean };

function ordinal(place: number): string {
  return `${place}${place === 1 ? 'ST' : place === 2 ? 'ND' : place === 3 ? 'RD' : 'TH'}`;
}

function AutoScrollToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className="auto-scroll-toggle mono"
      aria-pressed={enabled}
      aria-label={enabled ? 'Stop automatic scrolling' : 'Resume automatic scrolling'}
      title={enabled ? 'Stop automatic scrolling' : 'Resume automatic scrolling'}
      data-testid="button-toggle-auto-scroll"
      onClick={onToggle}
    >
      AUTO-SCROLL / {enabled ? 'ON' : 'OFF'}
    </button>
  );
}

function DecisionInspectionToolbar({
  view,
  onView,
}: {
  view: 'choice' | 'board' | 'players';
  onView: (view: 'choice' | 'board' | 'players') => void;
}) {
  return <nav className="decision-inspection-toolbar" aria-label="Inspect before deciding">
    <span className="mono">DECISION INSPECTION</span>
    <button type="button" aria-pressed={view === 'board'} onClick={() => onView(view === 'board' ? 'choice' : 'board')}>VIEW BOARD</button>
    <button type="button" aria-pressed={view === 'players'} onClick={() => onView(view === 'players' ? 'choice' : 'players')}>VIEW PLAYERS</button>
    <button type="button" aria-pressed={view === 'choice'} onClick={() => onView('choice')}>RETURN TO CHOICE</button>
  </nav>;
}

function DecisionPlayerInspection({ players, boardId }: { players: MatchPlayer[]; boardId: BoardId }) {
  return <section className="decision-inspection-players" aria-label="Player details during endgame decision">
    <h2 className="mono">PLAYER DETAILS / FINAL SNAPSHOTS</h2>
    <div className="decision-inspection-player-grid">
      {players.map((player, index) => {
        const character = getCharacter(player.characterId);
        const career = player.careerId ? getCareer(player.careerId) : undefined;
        return <article key={player.playerId}>
          <div className="decision-inspection-player-heading">
            {character && <CharacterPortrait character={character} imagePath={player.portraitImagePath ?? undefined} logoPath={player.playerLogoPath} boardId={boardId} className="decision-inspection-portrait" />}
            <div><span className="mono">PLAYER {index + 1} / {player.isCPU ? `CPU ${player.slot}` : player.displayName}</span><h3>{character?.name ?? player.displayName}</h3><p>{career?.name ?? 'Unassigned'} · {formatMoney(effectiveSalaryAmount(player))} per payday</p></div>
          </div>
          <div className="decision-inspection-stats">
            <span>WEALTH <strong>{formatMoney(player.wealth)}</strong></span>
            <span>AI SKILL <strong>{player.aiSkill}</strong></span>
            <span>FAME <strong>{player.fame}</strong></span>
            <span>LIFESTYLE <strong>{player.lifestyle}</strong></span>
            <span>INFLUENCE <strong>{player.influence}</strong></span>
          </div>
          <PlayerAbilityDetails character={character} career={career} />
          <PlayerAssets equipment={player.equipment} assetLevels={player.assetLevels} upgradeTokens={player.upgradeTokens} playerIndex={index} />
        </article>;
      })}
    </div>
  </section>;
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
    .filter(event => event.eventType === 'CARD_RESOLVED' || event.label.startsWith('GAMBLE '))
    .map(event => event.detail)
    .filter(Boolean);
  return [...new Set(results)].slice(-6).join(' · ') || undefined;
}

function RemoteStatus({ remote, error, players, match, connected }: { remote: NonNullable<ReturnType<typeof useGame>['remote']>; error: string | null; players: Match['players']; match: Match; connected: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const acting = remote.seats.find((seat) => seat.playerIndex === remote.currentPlayerIndex);
  const secondsLeft = Math.max(0, Math.ceil((remote.actionAt + remote.autoplayAfterMs - now) / 1000));
  const mine = remote.seats.find((seat) => seat.playerIndex === remote.youIndex);
  const myTurn = remote.currentPlayerIndex === remote.youIndex;
  const me = players[remote.youIndex];
  const iFinished = me?.status === 'FINISHED';
  const over = match.phase === 'endgame';
  const nameById = new Map(players.map((player) => [player.playerId, player.displayName]));
  const activity = match.eventLog.slice(-4).reverse();
  let banner: string;
  if (remote.abandoned) banner = 'MATCH EXPIRED';
  else if (remote.pausedAt !== null) banner = 'MATCH PAUSED // WAITING FOR A PLAYER';
  else if (over) banner = 'MATCH COMPLETE';
  else if (myTurn) banner = 'YOUR TURN';
  else if (iFinished) banner = `SPECTATING // WAITING FOR ${(acting?.displayName ?? 'PLAYERS').toUpperCase()}`;
  else banner = `WAITING FOR ${(acting?.displayName ?? 'PLAYER').toUpperCase()}${acting && !acting.connected ? ' (OFFLINE)' : ''}`;
  return (
    <section className={`remote-status mono ${myTurn && !over ? 'my-turn' : ''}`} aria-live="polite" data-testid="panel-remote-status">
      {!connected && <div className="remote-reconnect platform-error" role="alert" data-testid="text-reconnecting">CONNECTION LOST — RECONNECTING… YOUR SEAT IS SAVED</div>}
      <div className="remote-banner" data-testid="text-turn-banner">{banner}</div>
      <span>ONLINE // {acting ? `${acting.displayName.toUpperCase()}${acting.playerIndex === remote.youIndex ? ' (YOU)' : ''} ACTING` : '—'}{acting?.kicked ? ' // REMOVED' : acting && !acting.connected ? ' // DISCONNECTED' : ''} // ROUND {match.round}</span>
      {acting && !acting.kicked && !over && !remote.pausedAt && <span data-testid="text-autoplay-countdown">{acting.cpuControlled ? `CPU TURN ${acting.cpuTurns}/4${acting.fastCpu ? ' // FAST CPU' : ''}` : acting.connected ? `AUTOPLAY IN ${secondsLeft}s` : 'RECONNECT GRACE ACTIVE'}</span>}
      <ul className="remote-players" data-testid="list-remote-players">
        {players.map((player, index) => {
          const seat = remote.seats[index];
          const state = seat?.kicked ? 'REMOVED' : player.status === 'FINISHED' ? 'FINISHED' : seat?.fastCpu ? 'FAST CPU' : seat?.cpuControlled ? 'CPU CONTROLLING' : seat?.connected === false ? 'DISCONNECTED' : index === remote.currentPlayerIndex ? 'ACTING' : 'CONNECTED';
          return <li key={player.playerId} className={`${index === remote.currentPlayerIndex ? 'acting' : ''} ${index === remote.youIndex ? 'you' : ''}`} data-testid={`remote-player-${index}`}><b>{player.displayName.toUpperCase()}{index === remote.youIndex ? ' (YOU)' : ''}</b><span>SPACE {player.position}/75 // {state}</span></li>;
        })}
      </ul>
      {activity.length > 0 && <ol className="remote-activity" data-testid="list-remote-activity">{activity.map((event) => <li key={event.id}>{nameById.get(event.playerId) ?? 'PLAYER'}: {event.label}{event.detail ? ` — ${event.detail}` : ''}</li>)}</ol>}
      {error && <span className="platform-error" role="alert" data-testid="text-remote-error">{error}</span>}
    </section>
  );
}

export function GameScreen() {
  const [, navigate] = useLocation();
  const { match, dispatchMatch, rollDice, remote, remoteError, remoteConnected, selectedBoardId, selectBoard, returnHome, newAchievementIds } = useGame();
  const { user } = useAuth(import.meta.env.BASE_URL);
  const isBioBoard = selectedBoardId === 'BIO_UPGRADE';
  const previewPlayers = useMemo(
    () => createMatch(characters[0].id, selectedBoardId).players.map((player, index) => ({
      ...player,
      position: index === 0 ? 1 : [0, 12, 24, 36][index] ?? 0,
    })),
    [selectedBoardId],
  );
  const previewActivePlayer = previewPlayers.find(player => !player.isCPU) ?? previewPlayers[0];
  const [previewPosition, setPreviewPosition] = useState(1);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const seatName = (player: { slot: number; displayName: string; isCPU: boolean }) => remote ? player.displayName.toUpperCase() : `CPU ${player.slot}`;
  const [compactPlayerLayout, setCompactPlayerLayout] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 700px)').matches);
  const [playerCardDisclosure, setPlayerCardDisclosure] = useState<Record<string, PlayerCardDisclosure>>({});
  const [decisionInspection, setDecisionInspection] = useState<'choice' | 'board' | 'players'>('choice');
  const phase = match?.phase;
  const turnIndex = match?.turnIndex;
  const remaining = match?.stepsRemaining;
  const isCPU = match?.players[match.turnIndex].isCPU;
  const pending = match?.pending;
  const decisionPlayerIndex = pending?.kind === 'ABILITY' ? pending.playerIndex : turnIndex;
  const decisionIsCPU = decisionPlayerIndex === undefined ? isCPU : match?.players[decisionPlayerIndex]?.isCPU;
  const hasTurnStartToken = Boolean(match && availableUpgradeTokens(match.players[match.turnIndex]) > 0);
  const onRollComplete = useCallback(() => dispatchMatch({ type: 'REVEAL' }), [dispatchMatch]);
  const toggleAutoScroll = useCallback(() => {
    if (autoScrollEnabled) window.scrollTo({ top: window.scrollY, left: window.scrollX, behavior: 'auto' });
    setAutoScrollEnabled(enabled => !enabled);
  }, [autoScrollEnabled]);
  const latestLogEventId = match?.eventLog.at(-1)?.id;
  const landedPlayer = match && match.lastLanding ? match.players[match.lastLanding.playerIndex] : undefined;
  const isCardLanding = match?.pending?.kind === 'CARD'
    || match?.lastLanding?.space.type === 'CARD'
    || match?.lastLanding?.space.type === 'GAMBLE';
  const [playerStatPulses, setPlayerStatPulses] = useState<Record<string, PlayerStatChangePulse[]>>({});
  const lastSeenStatChangeEventId = useRef(latestLogEventId);
  const playerStatChangeTimers = useRef(new Map<string, number>());
  const statFeedbackLifecycle = useRef(0);
  const previousEquipment = useRef(match?.players.map(player => ({ ...player.equipment })) ?? []);
  const [purchaseNotice, setPurchaseNotice] = useState<{ id: string; name: string; player: string; currentWealth?: number } | null>(null);
  const previousDecision = useRef<PendingDecision | null>(pending ?? null);
  const [careerLocked, setCareerLocked] = useState(false);
  const currentPlayerId = match?.players[match.turnIndex]?.playerId ?? null;
  const currentGambleCardId = match?.players[match.turnIndex]?.endgame?.gambleCardId ?? null;
  const gambleCardKey = currentPlayerId && currentGambleCardId ? `${currentPlayerId}:${currentGambleCardId}` : null;
  const lastGambleCardKey = useRef<string | null>(null);
  const [gambleCardStage, setGambleCardStage] = useState<'draw' | 'resolved'>('draw');

  useEffect(() => {
    if (match || !isBioBoard) return;
    const timer = window.setInterval(() => {
      setPreviewPosition(position => position >= 75 ? 1 : position + 1);
    }, 700);
    return () => window.clearInterval(timer);
  }, [match, isBioBoard]);

  function expirePlayerStatChange(playerId: string, changeId: string) {
    playerStatChangeTimers.current.delete(`${playerId}:${changeId}`);
    setPlayerStatPulses(current => {
      const remaining = (current[playerId] ?? []).filter(change => change.id !== changeId);
      if (remaining.length === (current[playerId] ?? []).length) return current;
      const updated = { ...current };
      if (remaining.length) updated[playerId] = remaining;
      else delete updated[playerId];
      return updated;
    });
  }

  useEffect(() => {
    if (!match) return;
    const previousId = lastSeenStatChangeEventId.current;
    const newestId = match.eventLog.at(-1)?.id;
    lastSeenStatChangeEventId.current = newestId;
    if (!previousId || !newestId || previousId === newestId) return;

    const previousIndex = match.eventLog.findIndex(event => event.id === previousId);
    if (previousIndex < 0) return;

    const playerIds = new Set(match.players.map(player => player.playerId));
    const changesByPlayer = groupPlayerStatChangesByPlayer(
      match.eventLog.slice(previousIndex + 1),
      match.eventLog,
      playerIds,
    );

    for (const [playerId, changes] of changesByPlayer) {
      const activeIds = new Set((playerStatPulses[playerId] ?? []).map(change => change.id));
      const additions = changes
        .filter(change => !activeIds.has(change.id))
        .map(change => ({ ...change, durationMs: PLAYER_CHANGE_FEEDBACK_MS }));
      if (!additions.length) continue;

      setPlayerStatPulses(current => {
        const currentIds = new Set((current[playerId] ?? []).map(change => change.id));
        const fresh = additions.filter(change => !currentIds.has(change.id));
        return fresh.length ? { ...current, [playerId]: [...(current[playerId] ?? []), ...fresh] } : current;
      });
      for (const change of additions) {
        const timerKey = `${playerId}:${change.id}`;
        const timer = window.setTimeout(
          () => expirePlayerStatChange(playerId, change.id),
          PLAYER_CHANGE_FEEDBACK_MS,
        );
        playerStatChangeTimers.current.set(timerKey, timer);
      }
    }
  }, [match, playerStatPulses]);

  useEffect(() => {
    const lifecycle = ++statFeedbackLifecycle.current;
    return () => {
      queueMicrotask(() => {
        if (statFeedbackLifecycle.current !== lifecycle) return;
        playerStatChangeTimers.current.forEach(timer => window.clearTimeout(timer));
        playerStatChangeTimers.current.clear();
      });
    };
  }, []);

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
            player: player.isCPU ? seatName(player) : 'YOU',
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
    if (!match) return;
    let delay: number;
    let callback: () => void;
    // Multiplayer: the server drives everything except the local player's own pacing steps.
    if (remote && (phase === 'ready' || phase === 'decision' || phase === 'endgame' || isCPU)) return;
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
        delay = pending.stage === 'draw' ? CPU_CARD_DRAW_MS : CPU_CARD_RESULT_MS;
        callback = () => dispatchMatch({ type: 'AUTO_DECIDE' });
      } else {
        delay = 1050;
        callback = () => dispatchMatch({ type: 'AUTO_DECIDE' });
      }
    } else if (phase === 'landed') {
      if (match.players[match.turnIndex].endgame?.status === 'RESOLVED' && !isCPU) return;
      const resolvedGamble = match.players[match.turnIndex].endgame?.gambleCardId;
      const cpuFinishResolved = isCPU && match.players[match.turnIndex].endgame?.status === 'RESOLVED';
      // CPU end-of-line screens stay up three times as long; the player can also close them with Continue.
      delay = cpuFinishResolved ? (resolvedGamble ? 5200 : 1700) * 3 : turnIndex === 0 ? 2300 : 1700;
      callback = () => dispatchMatch({ type: 'NEXT_TURN' });
    } else if (phase === 'endgame' && isCPU) {
      delay = 1150 * 3;
      callback = () => dispatchMatch({ type: 'AUTO_DECIDE' });
    } else return;
    const timer = window.setTimeout(callback, delay);
    return () => window.clearTimeout(timer);
}, [match === null, phase, isCPU, decisionIsCPU, decisionPlayerIndex, turnIndex, remaining, pending?.kind, pending?.kind === 'CARD' || pending?.kind === 'CAREER' ? pending.stage : pending?.kind === 'ASSET' ? pending.category : pending?.kind === 'ABILITY' ? pending.decision : undefined, rollDice, dispatchMatch, remote !== null]);

  useEffect(() => {
    if (!phase || !autoScrollEnabled) return;
    const desktop = window.matchMedia('(min-width: 1001px)').matches;
    const target = desktop
      ? phase === 'ready' && hasTurnStartToken ? '.upgrade-token-panel'
        : phase === 'ready' || phase === 'rolling' || phase === 'reveal' ? '.game-dice-panel'
        : phase === 'moving' ? '.game-tabletop-board'
        : phase === 'decision' ? pending?.kind === 'CARD' ? '.card-draw-panel' : '.milestone-choice'
        : phase === 'landed' ? active.endgame?.status === 'RESOLVED' ? '.finish-line-panel' : '.game-player[data-active="true"]'
        : phase === 'endgame' ? '.finish-line-panel'
        : phase === 'complete' ? '.finish-line-results-intro'
        : null
      : phase === 'ready' && hasTurnStartToken ? '.upgrade-token-panel'
        : phase === 'ready' ? '.game-dice-panel'
        : phase === 'rolling' || phase === 'reveal' ? '.game-dice-panel'
        : phase === 'moving' ? '.game-tabletop-board'
        : phase === 'landed' ? '.game-player[data-active="true"]'
        : null;
    if (!target) return;
    const timer = window.setTimeout(() => {
      const element = document.querySelector(target);
      if (!element) return;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      element.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: target === '.game-tabletop-board' ? 'center' : desktop ? 'nearest' : 'start' });
    }, phase === 'landed' ? 600 : 150);
    return () => window.clearTimeout(timer);
  }, [phase, turnIndex, pending?.kind, match?.players[match.turnIndex]?.endgame?.status, hasTurnStartToken, autoScrollEnabled]);

  if (!match) return (
    <main className="game-screen board-preview-page">
      <header className="empty-board-header">
        <div>
          <span className="eyebrow">NO MATCH LOADED // BOARD PREVIEW</span>
          <h1 className="display empty-board-title">{isBioBoard ? 'BIO UPGRADE' : 'REDLINE UPGRADE'}</h1>
          {isBioBoard && <AgeRestrictionBadge />}
        </div>
        <div className="empty-board-actions">
          <div className="empty-board-switch" role="group" aria-label="Choose board to preview">
            {([
              ['REDLINE_UPGRADE', 'Redline Upgrade'],
              ['BIO_UPGRADE', 'Bio Upgrade'],
            ] as const satisfies readonly (readonly [BoardId, string])[]).map(([boardId, label]) => (
              <button
                key={boardId}
                type="button"
                aria-pressed={selectedBoardId === boardId}
                className={selectedBoardId === boardId ? 'selected' : ''}
                onClick={() => {
                  selectBoard(boardId);
                  navigate(`/board?board=${boardId}`);
                }}
                data-testid={`button-preview-${boardId.toLowerCase()}`}
              >{label}</button>
            ))}
          </div>
          <button className={`action ${isBioBoard ? 'lime-action' : ''}`} type="button" onClick={() => navigate('/mode')} data-testid="button-board-start">
            Play {isBioBoard ? 'Bio Upgrade' : 'Redline Upgrade'} <span aria-hidden>↗</span>
          </button>
        </div>
      </header>
      <div className="board-preview-banner mono" role="note">
        {isBioBoard
          ? 'LIVE BOARD PREVIEW / PAWN AUTO-MOVES ALONG THE ROUTE / NO GAME STATE CHANGED'
          : 'SAMPLE PAWN PLACEMENT / NO GAME STATE CHANGED / SELECT A BOARD TO PREVIEW'}
      </div>
      <GameBoard
        boardId={selectedBoardId}
        players={isBioBoard
          ? previewPlayers.map((player, index) => index === 0 ? { ...player, position: previewPosition } : player)
          : previewPlayers}
        activePlayerId={previewActivePlayer.playerId}
        landingPosition={null}
        movingPlayerId={isBioBoard ? previewActivePlayer.playerId : null}
        preview={isBioBoard}
      />
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
    : remote && remote.careerRevealPendingPlayerIndexes.length > 0
      ? 'Waiting for all players to confirm their career'
    : match.phase !== 'ready'
      ? 'Available when your turn is ready'
      : undefined;
  const remoteCareerPlayer = remote ? match.players[remote.youIndex] : undefined;
  const remoteCareer = remoteCareerPlayer?.careerId ? getCareer(remoteCareerPlayer.careerId) : undefined;
  const needsRemoteCareerConfirmation = Boolean(
    remote && remote.careerRevealPendingPlayerIndexes.includes(remote.youIndex),
  );
  const cardResultSummary = pending?.kind === 'CARD' && pending.stage === 'resolved'
    ? summarizeCardResolution(match.eventLog, active.playerId)
    : undefined;
  const offeredGambleCards = pending?.kind === 'CARD' && pending.offeredCardIds
    ? pending.offeredCardIds.map(id => getCard(id)).filter((card): card is NonNullable<typeof card> => Boolean(card))
    : undefined;
  const landingEvent = landing ? match.wealthEvents?.slice().reverse().find((event) => event.kind === 'PAYDAY' && event.playerIndex === landing.playerIndex && event.space === landing.space.number) : undefined;
  const recentLog = match.eventLog.slice(-4).reverse();

  if (match.phase === 'complete') {
    return (
      <main className="game-screen game-screen-finish-line">
        <AutoScrollToggle enabled={autoScrollEnabled} onToggle={toggleAutoScroll} />
        {isBioBoard && <AgeRestrictionBadge />}
        <MatchResultsPanel
          players={match.players}
          finishOrder={match.finishOrder}
          assetEvents={match.assetEventLog}
          boardId={match.boardId}
          unlockedAchievementIds={newAchievementIds}
          attributeLeaderAwards={match.endgameAttributeBonuses ?? []}
          onHome={() => { returnHome(); navigate('/'); }}
          onProfile={user ? () => navigate('/profile') : undefined}
        />
      </main>
    );
  }

  if (match.phase === 'endgame' || (match.phase === 'landed' && active.endgame?.status === 'RESOLVED')) {
    if (!active.endgame) return null;
    const waitingForHumanChoice = active.endgame.status !== 'RESOLVED' && !active.isCPU;
    return (
      <main className="game-screen game-screen-finish-line">
        {!waitingForHumanChoice && <AutoScrollToggle enabled={autoScrollEnabled} onToggle={toggleAutoScroll} />}
        {!waitingForHumanChoice && isBioBoard && <AgeRestrictionBadge />}
        {!waitingForHumanChoice && <DecisionInspectionToolbar
          view={decisionInspection}
          onView={view => {
            setDecisionInspection(view);
            const target = view === 'choice' ? '.finish-line-panel'
              : view === 'board' ? '.decision-inspection-board'
                : '.decision-inspection-players';
            document.querySelector(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        />}
        {!waitingForHumanChoice && <EndgameAttributeBonusSummary awards={match.endgameAttributeBonuses} players={match.players} />}
        <FinishLinePanel
          player={active}
          otherPlayers={match.players.filter((candidate) => candidate.playerId !== active.playerId)}
          endgame={active.endgame}
          boardId={match.boardId}
          finishPlace={match.finishOrder.indexOf(match.turnIndex) + 1}
          finishBonus={FINISH_ORDER_WEALTH_REWARDS[match.finishOrder.indexOf(match.turnIndex)] ?? 0}
          onChoose={(choice: EndgameChoice) => dispatchMatch({ type: 'CHOOSE_ENDGAME', choice })}
          onContinue={() => dispatchMatch({ type: 'NEXT_TURN' })}
        />
        {!waitingForHumanChoice && decisionInspection === 'board' && <section className="decision-inspection-board" aria-label="Board inspection">
          <GameBoard players={match.players} activePlayerId={active.playerId} landingPosition={null} movingPlayerId={null} finishOrder={match.finishOrder} boardId={match.boardId} />
        </section>}
        {!waitingForHumanChoice && decisionInspection === 'players' && <DecisionPlayerInspection players={match.players} boardId={match.boardId} />}
      </main>
    );
  }

  return (
    <main className="game-screen">
      <AutoScrollToggle enabled={autoScrollEnabled} onToggle={toggleAutoScroll} />
      {isBioBoard && <AgeRestrictionBadge />}
      {remote && <RemoteStatus remote={remote} error={remoteError} players={match.players} match={match} connected={remoteConnected} />}
      {remote && remote.careerRevealPendingPlayerIndexes.length > 0 && !needsRemoteCareerConfirmation && (
        <div className="career-reveal-waiting-banner mono" role="status" data-testid="text-career-confirmation-waiting">
          WAITING FOR EVERY PLAYER TO CONFIRM THEIR CAREER
        </div>
      )}
      {match.phase === 'decision' && pending && <DecisionInspectionToolbar
        view={decisionInspection}
        onView={view => {
          setDecisionInspection(view);
          if (view === 'players') {
            setPlayerCardDisclosure(Object.fromEntries(match.players.map(player => [player.playerId, { layout: compactPlayerLayout ? 'compact' : 'wide', open: true }])));
            document.querySelector('.game-players')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else if (view === 'board') {
            document.querySelector('.game-tabletop-board')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else if (view === 'choice') {
            document.querySelector(pending.kind === 'CARD' ? '.game-tabletop' : '.milestone-choice')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }}
      />}
      {needsRemoteCareerConfirmation && remoteCareerPlayer && remoteCareer && (
        <MultiplayerCareerReveal
          player={remoteCareerPlayer}
          career={remoteCareer}
          waitingForPlayers={Math.max(0, (remote?.careerRevealPendingPlayerIndexes.length ?? 0) - 1)}
          onConfirm={() => dispatchMatch({ type: 'ACKNOWLEDGE_CAREER_REVEAL' })}
        />
      )}
      <section className="game-head">
        <div>
          <span className="eyebrow">{remote ? 'ONLINE MATCH' : 'MATCH 01 / LOCAL TABLETOP'}</span>
          <h1 className="display">The <span>board.</span></h1>
        </div>
        <button className="quit-to-menu" type="button" onClick={() => navigate('/')} title="Quit to Menu" aria-label="Quit to Menu" data-testid="button-quit-to-menu">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>
          <span className="quit-to-menu-tip mono" role="tooltip">Quit to Menu</span>
        </button>
      </section>

       {purchaseNotice && <div className="asset-purchase-flash" role="status" aria-live="polite" key={purchaseNotice.id}><span className="mono">{purchaseNotice.player} / NEW ASSET ACQUIRED</span><strong>{purchaseNotice.name}</strong>{purchaseNotice.currentWealth !== undefined && <span className="mono">WEALTH NOW / {formatMoney(purchaseNotice.currentWealth)}</span>}</div>}
      {careerLocked && <div className="career-locked-flash" role="status" aria-live="polite"><span className="mono">SPACE 35 / DECISION COMPLETE</span><strong>CAREER LOCKED IN</strong><span className="mono">SALARY AND WEALTH UNCHANGED</span></div>}

 {match.phase === 'decision' && pending && pending.kind !== 'CARD' && <MilestoneChoice pending={pending} player={decisionPlayer} players={match.players} onAction={dispatchMatch} boardId={match.boardId} />}

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
          const playerStats: { label: string; stat: PlayerStat; value: number }[] = [
            { label: 'WEALTH', stat: 'wealth', value: contestant.wealth },
            { label: 'AI SKILL', stat: 'aiSkill', value: contestant.aiSkill },
            { label: 'FAME', stat: 'fame', value: contestant.fame },
            { label: 'LIFESTYLE', stat: 'lifestyle', value: contestant.lifestyle },
            { label: 'INFLUENCE', stat: 'influence', value: contestant.influence },
          ];
          const assetCount = Object.values(contestant.equipment).filter(Boolean).length;
          const protections = match.effectProtections[contestant.playerId] ?? [];
          const protectionCount = protections.reduce((total, protection) => total + Math.max(0, protection.remaining), 0);
          const protectedEffects = [...new Set(protections.flatMap(protection => protection.blockedEffectTypes ?? []))];
          const protectionTitle = protectedEffects.length ? `Blocks: ${protectedEffects.join(', ')}` : 'Blocks the next negative effect';
          const rewardModifier = (stat: PlayerStat) => match.rewardModifiers[`${contestant.playerId}:${stat}`]?.amount ?? 0;
          const rewardModifierLabel = (stat: PlayerStat) => {
            const amount = rewardModifier(stat);
            if (!amount) return '';
            const formatted = stat === 'wealth' ? formatMoney(Math.abs(amount)) : Math.abs(amount).toLocaleString();
            return `NEXT ${amount > 0 ? '+' : '−'}${formatted}`;
          };
          const coreSummaryStats: { label: string; stat?: PlayerStat; value: string }[] = [
            { label: 'WEALTH', stat: 'wealth', value: formatMoney(contestant.wealth) },
            { label: 'ASSETS', value: String(assetCount) },
            { label: 'SCORE', value: formatMoney(calculateEndgameBaseValue(contestant)) },
          ];
          const summaryStats: { label: string; stat?: PlayerStat; value: string }[] = compactPlayerLayout ? coreSummaryStats : [
            ...coreSummaryStats,
            { label: 'PAYDAY', value: formatMoney(paydaySalary) },
            { label: 'UPGRADE TOKENS', value: String(contestant.upgradeTokens) },
            ...playerStats.slice(1).map(stat => ({ ...stat, value: stat.value.toLocaleString() })),
          ];
           const activeStatChanges = playerStatPulses[contestant.playerId] ?? [];
           const changesForStat = (stat: PlayerStat) => activeStatChanges.filter(change => change.stat === stat);
           const wealthChanges = changesForStat('wealth');
           const pulseStack = (changes: PlayerStatChangePulse[], surface: 'summary' | 'detail') => changes.length
             ? <div className={`player-stat-change-stack ${surface}`}>{changes.map(change => (
               <PlayerStatChangeOverlay key={change.id} change={change} playerIndex={index} surface={surface} />
             ))}</div>
             : null;
          const statAttribute = (stat: PlayerStat) => stat === 'aiSkill' ? 'ai-skill' : stat;
          const cardLayout: PlayerCardLayout = compactPlayerLayout ? 'compact' : 'wide';
          const savedDisclosure = playerCardDisclosure[contestant.playerId];
          const playerCardOpen = savedDisclosure?.layout === cardLayout ? savedDisclosure.open : !compactPlayerLayout;
          return (
             <article className={`game-player ${index === match.turnIndex ? 'active' : ''} ${(remote ? index === remote.youIndex : index === 0) ? 'human' : ''}`} key={contestant.playerId} data-slot={index} data-active={index === match.turnIndex} data-testid={`card-player-${index}`} aria-label={`${character?.name ?? contestant.displayName}, ${contestant.isCPU ? seatName(contestant) : 'human player'}${index === match.turnIndex ? ', active turn' : ''}`}>
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
                      <span className="game-player-index mono">0{index + 1} / {contestant.isCPU ? seatName(contestant) : 'YOU'}</span>
                      {index === match.turnIndex && <span className={`game-player-summary-active ${contestant.isCPU ? 'cpu' : ''}`} data-testid={`status-active-player-${index}`}>{contestant.isCPU ? `${seatName(contestant)} ACTIVE` : 'YOUR TURN'}</span>}
                      <span className="game-player-position mono">{contestant.status === 'FINISHED' ? 'FINISHED' : contestant.position === 0 ? 'START' : `SPACE ${String(contestant.position).padStart(2, '0')}`}{finishPlace ? ` / ${ordinal(finishPlace)}` : ''}</span>
                    </div>
                   <div className="game-player-summary-identity">
                      {character && <CharacterPortrait character={character} imagePath={contestant.portraitImagePath ?? undefined} logoPath={contestant.playerLogoPath} boardId={match.boardId} className="game-player-summary-portrait" />}
                      <div><span className="mono">CHARACTER</span><strong>{character?.name ?? contestant.displayName}</strong>{remote && <small>{contestant.displayName}{index === remote.youIndex ? ' · YOU' : ''}</small>}<small>{career?.name ?? 'Unassigned'}{secondCareer ? ` + ${secondCareer.name}` : ''}</small>{protectionCount > 0 && <small className="game-player-protection-badge mono" title={protectionTitle}>SHIELD / {protectionCount} EFFECT{protectionCount === 1 ? '' : 'S'}</small>}</div>
                   </div>
                   <div className="game-player-summary-values">
                      {summaryStats.map(({ label, stat, value }) => {
                       const changes = stat ? changesForStat(stat) : [];
                       const hasChanges = changes.length > 0;
                        return (
                          <span
                            key={label}
                            data-stat={stat ? statAttribute(stat) : undefined}
                           className={hasChanges ? 'player-stat-changing' : undefined}
                           style={hasChanges ? { animationDuration: `${PLAYER_CHANGE_FEEDBACK_MS}ms` } : undefined}
                          >
                            <small className="mono">{label}{stat && rewardModifier(stat) !== 0 && <em className="player-card-next-reward">{rewardModifierLabel(stat)}</em>}</small>
                            <b>{value}</b>
                            {pulseStack(changes, 'summary')}
                          </span>
                        );
                      })}
                   </div>
                    <span className="game-player-summary-toggle mono">DETAILS / TAP</span>
                 </summary>
                 <div className="game-player-expanded">
               <div className={`game-player-top ${contestant.status === 'FINISHED' ? 'finished' : ''}`}>
                 <span className="game-player-index mono">0{index + 1} / {contestant.isCPU ? seatName(contestant) : 'YOU'}</span>
                  <span className="game-player-position mono">{contestant.position === 0 ? 'START' : `SPACE ${String(contestant.position).padStart(2, '0')}`}{contestant.status === 'FINISHED' ? ' / FINISHED' : ''}{finishPlace ? ` / ${ordinal(finishPlace)}` : ''}</span>
               </div>
               {index === match.turnIndex && <div className="game-player-active-signal" aria-label="Active turn"><i aria-hidden="true" /> ACTIVE TURN</div>}
               <div className="game-player-identity">
                  {character && <CharacterPortrait character={character} imagePath={contestant.portraitImagePath ?? undefined} logoPath={contestant.playerLogoPath} boardId={match.boardId} className="game-player-portrait" />}
                   <div className="game-player-identity-copy"><span className="mono">CHARACTER / {String(index + 1).padStart(2, '0')}</span><strong className="game-player-name" data-testid={`text-player-character-${index}`}>{character?.name ?? contestant.displayName}</strong><small>{contestant.isCPU ? `${remote ? 'PLAYER' : `CPU ${contestant.slot}`} // ` : remote ? 'YOU // ' : 'LOCAL // '}{contestant.status === 'FINISHED' ? 'FINISHED' : 'IN PLAY'}{remote ? ` // ${remote.seats[index]?.fastCpu ? 'FAST CPU' : remote.seats[index]?.cpuControlled ? 'CPU CONTROLLING' : remote.seats[index]?.connected ? 'CONNECTED' : 'DISCONNECTED'}` : ''}</small>{protectionCount > 0 && <small className="game-player-protection-badge mono" title={protectionTitle}>SHIELD / {protectionCount} EFFECT{protectionCount === 1 ? '' : 'S'}</small>}</div>
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
               <div
                 className={`game-player-wealth ${wealthChanges.length ? 'player-stat-changing' : ''}`}
                 data-stat="wealth"
                 style={wealthChanges.length ? { animationDuration: `${PLAYER_CHANGE_FEEDBACK_MS}ms` } : undefined}
               >
                 <div className="game-player-wealth-heading">
                    <span className="mono"><SpaceIcon name="wealth" size={12} /> WEALTH{rewardModifier('wealth') !== 0 && <em className="player-card-next-reward">{rewardModifierLabel('wealth')}</em>}</span>
                    {pulseStack(wealthChanges, 'detail')}
                 </div>
                 <WealthCounter amount={contestant.wealth} />
               </div>
              <div className="game-player-stats">
                 {playerStats.slice(1).map(({ label, stat, value }) => {
                    const changes = changesForStat(stat);
                    const hasChanges = changes.length > 0;
                   return (
                     <div
                       key={stat}
                       data-stat={statAttribute(stat)}
                        className={hasChanges ? 'player-stat-changing' : undefined}
                        style={hasChanges ? { animationDuration: `${PLAYER_CHANGE_FEEDBACK_MS}ms` } : undefined}
                     >
                    <span className="mono"><SpaceIcon name={stat === 'aiSkill' ? 'ai' : label.toLowerCase()} size={11} /> {label}{rewardModifier(stat) !== 0 && <em className="player-card-next-reward">{rewardModifierLabel(stat)}</em>}</span>
                       <b>{value.toLocaleString()}</b>
                        {pulseStack(changes, 'detail')}
                     </div>
                   );
                 })}
              </div>
               <PlayerAssets equipment={contestant.equipment} assetLevels={contestant.assetLevels} upgradeTokens={contestant.upgradeTokens} playerIndex={index} />
                 </div>
               </details>
            </article>
          );
        })}
      </section>

       {(match.phase !== 'decision' || pending?.kind === 'CARD' || decisionInspection === 'board') && <div className="game-tabletop">
       <div className="game-tabletop-board"><GameBoard
        players={match.players}
        activePlayerId={active.playerId}
        landingPosition={match.phase === 'landed' ? landing?.space.number ?? null : null}
        movingPlayerId={match.phase === 'moving' ? active.playerId : null}
        finishOrder={match.finishOrder}
         boardId={match.boardId}
       /></div>
        <aside className="game-dice-panel" aria-label="Turn status and dice">
          <div className={`turn-signal ${active.isCPU ? 'cpu' : ''}`} aria-live="polite">
            <span className="mono">ROUND {String(match.round).padStart(2, '0')} // TURN {match.turnIndex + 1} OF {match.players.length}</span>
            <strong className="display">{active.isCPU ? `${seatName(active)}'S TURN` : 'YOUR TURN'}</strong>
            <small>{currentCharacter?.name} · {match.phase === 'ready' ? (active.isCPU ? 'Preparing to roll' : 'Ready to roll') : match.phase === 'rolling' ? 'Dice in motion' : match.phase === 'reveal' ? 'Roll resolved' : match.phase === 'moving' ? `${match.stepsRemaining} steps remaining` : match.phase === 'decision' ? 'Card draw in progress' : 'Space reached'}</small>
            {match.round === 1 && !active.isCPU && match.phase === 'ready' && <details className="how-to-roll" data-testid="text-how-to-roll">
              <summary>HOW TO WIN / Highest final score wins.</summary>
              <ul>
                <li>Final score combines Wealth, choice-adjusted assets, Attribute Points, and bonuses.</li>
                <li>Each Attribute leader earns $50,000; ties go to the player who finished first.</li>
                <li>Finish rewards: $100,000 / $75,000 / $50,000 / $25,000.</li>
                <li>Upgrade Tokens convert to Credits separately from the final score.</li>
                <li>Press ROLL to move with two D4s.</li>
              </ul>
            </details>}
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
         offeredCards={offeredGambleCards}
          partyPlayers={match.players}
          partyActorId={active.playerId}
          partyCanAct={!remote || remote.youIndex === remote.currentPlayerIndex}
         boardId={match.boardId}
         cardStage={match.phase === 'decision' && pending?.kind === 'CARD' ? pending.stage : undefined}
         cardPiles={match.cardPiles}
         isCPU={active.isCPU}
          actorName={currentCharacter?.name ?? active.displayName}
         actorLabel={active.isCPU ? seatName(active) : 'YOU'}
          resultSummary={cardResultSummary}
         onResolveCard={() => dispatchMatch({ type: 'RESOLVE_CARD' })}
         onChooseGambleCard={cardId => dispatchMatch({ type: 'CHOOSE_GAMBLE_CARD', cardId })}
           onResolvePartyChallenge={(participantIds, passed, resolution) => dispatchMatch({ type: 'RESOLVE_PARTY_CHALLENGE', participantIds, passed, resolution })}
         onAcknowledge={() => dispatchMatch({ type: 'ACKNOWLEDGE_CARD' })}
       />
       </div>}

      {match.phase === 'ready' && !active.isCPU && <UpgradeTokenControls player={active} boardId={match.boardId} onAction={(action: MatchAction) => dispatchMatch(action)} />}

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