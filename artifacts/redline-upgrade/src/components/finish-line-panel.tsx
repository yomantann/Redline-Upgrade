import { getAsset, type AssetLevel, type AssetSlot } from '@/game/assets';
import { getCard } from '@/game/cards';
import { formatMoney, getCareer, SALARY_TIERS } from '@/game/careers';
import { getCharacter } from '@/game/characters';
import { effectiveSalaryAmount } from '@/game/player';
import type { EndgameChoice, EndgameState } from '@/game/endgame';
import { getFinalPlacementOrder, type MatchPlayer } from '@/game/match';
import type { BoardId } from '@/game/boards';
import { FINISH_ORDER_WEALTH_REWARDS } from '@/game/careers';
import { assetValueAtLevel } from '@/game/upgrade-tokens';
import { calculateAssetValue } from '@/game/endgame';
import { achievementCatalog } from '@/game/achievement-catalog';
import type { AssetEventLogEntry } from '@/game/events/types';
import { useState } from 'react';
import { CharacterPortrait } from './character-portrait';
import { AssetArtwork } from './asset-artwork';
import './finish-line-panel.css';

export interface FinishLinePanelProps {
  player: MatchPlayer;
  endgame: EndgameState;
  boardId: BoardId;
  onChoose: (choice: EndgameChoice) => void;
  onContinue: () => void;
  finishPlace?: number;
  finishBonus?: number;
}

const assetSlots: readonly { slot: AssetSlot; label: string }[] = [
  { slot: 'car', label: 'CAR' },
  { slot: 'lifestyle', label: 'LIFESTYLE' },
  { slot: 'companion', label: 'COMPANION' },
  { slot: 'property', label: 'PROPERTY' },
];

const choices: readonly {
  id: EndgameChoice;
  number: string;
  title: string;
  description: string;
  accent: string;
}[] = [
  {
    id: 'CASH_OUT',
    number: '01',
    title: 'CASH OUT',
    description: 'Lock the base value at 1× and close the run.',
    accent: 'cash',
  },
  {
    id: 'DOUBLE_DOWN',
    number: '02',
    title: 'DOUBLE DOWN',
    description: 'Roll 2d4 for a 0.25×–2.75× multiplier on the base value.',
    accent: 'double',
  },
  {
    id: 'FINAL_GAMBLE',
    number: '03',
    title: 'FINAL GAMBLE',
    description: 'Reveal a Gamble card for the record. A fixed 50/50 flip doubles your stake or loses it all.',
    accent: 'gamble',
  },
];

function formatSignedMoney(value: number) {
  return `${value >= 0 ? '+' : '−'}${formatMoney(Math.abs(value))}`;
}

function finishOrdinal(place: number) {
  const suffix = place === 1 ? 'ST' : place === 2 ? 'ND' : place === 3 ? 'RD' : 'TH';
  return `${place}${suffix}`;
}

function SnapshotLedger({ endgame }: { endgame: EndgameState }) {
  const { snapshot } = endgame;
  const career = snapshot.careerId ? getCareer(snapshot.careerId) : undefined;
  const secondCareer = snapshot.secondCareer ? getCareer(snapshot.secondCareer.careerId) : undefined;
  const salaryTier = snapshot.secondCareer && snapshot.secondCareer.salaryAmount > snapshot.salaryAmount
    ? SALARY_TIERS[snapshot.secondCareer.salaryTier - 1] ?? 'UNASSIGNED'
    : SALARY_TIERS[snapshot.salaryTier - 1] ?? 'UNASSIGNED';
  const paydaySalary = effectiveSalaryAmount(snapshot);

  return (
    <section className="finish-line-ledger" aria-labelledby="finish-line-ledger-heading">
      <div className="finish-line-section-heading">
        <span className="eyebrow">FINISH SNAPSHOT // CAPTURED RECORD</span>
        <span className="mono">SPACE {String(snapshot.position).padStart(2, '0')} / LOCKED</span>
      </div>
      <h2 id="finish-line-ledger-heading" className="display finish-line-ledger-title">
        What crosses<br /><span>the line.</span>
      </h2>
      <div className="finish-line-ledger-grid">
        <div className="finish-line-ledger-cell finish-line-ledger-wealth">
          <span className="mono">RECORDED WEALTH</span>
          <strong>{formatMoney(snapshot.wealth)}</strong>
        </div>
        <div className="finish-line-ledger-cell">
          <span className="mono">BASE VALUE</span>
          <strong>{formatMoney(endgame.baseValue)}</strong>
          <small>ENGINE CALCULATION</small>
        </div>
        <div className="finish-line-ledger-cell">
          <span className="mono">CAREER / SALARY</span>
          <strong>{career?.name ?? 'UNASSIGNED'}{secondCareer ? ` + ${secondCareer.name}` : ''}</strong>
          <small>PAYDAY / {salaryTier} / {formatMoney(paydaySalary)}</small>
        </div>
      </div>
      <div className="finish-line-detail-grid">
        <div>
          <span className="mono">RECORDED STATS</span>
          <div className="finish-line-stat-list">
            <span><b>AI SKILL</b><strong>{snapshot.aiSkill.toLocaleString()}</strong></span>
            <span><b>FAME</b><strong>{snapshot.fame.toLocaleString()}</strong></span>
            <span><b>LIFESTYLE</b><strong>{snapshot.lifestyle.toLocaleString()}</strong></span>
            <span><b>INFLUENCE</b><strong>{snapshot.influence.toLocaleString()}</strong></span>
          </div>
        </div>
        <div className="finish-line-token-readout">
          <span className="mono">UPGRADE TOKENS / FINAL GAMBLE</span>
          <strong>{snapshot.upgradeTokens} CARRY OVER</strong>
          <small>Unused tokens remain available for the final gamble · {snapshot.history.upgradeTokensSpent} spent during the match</small>
        </div>
      </div>
      <div className="finish-line-assets" aria-label="Captured assets">
        {assetSlots.map(({ slot, label }) => {
          const assetId = snapshot.equipment[slot];
          const asset = assetId ? getAsset(assetId) : undefined;
          const level = asset ? snapshot.assetLevels[asset.id] ?? 1 : null;
          const categoryLabel = asset?.category === 'pet'
            ? 'PET'
            : asset?.category === 'investment'
              ? 'INVESTMENT'
              : label;
           return (
            <div className={`finish-line-asset ${asset ? 'collected' : 'open'}`} key={slot} aria-label={asset ? `${categoryLabel}, ${asset.name}, level ${level}` : `${label}, open slot`}>
              <span className="mono">{categoryLabel}</span>
               <div className="finish-line-asset-art" aria-hidden="true">
                 {asset ? <AssetArtwork assetId={asset.id} level={level! as 1 | 2 | 3 | 4} className="finish-line-asset-image" /> : <span>+</span>}
               </div>
              <strong>{asset?.name ?? 'OPEN SLOT'}</strong>
                <small>{asset ? `LEVEL ${level} / ENDGAME +${formatMoney(assetValueAtLevel(asset, level! as AssetLevel))}` : 'NOT ACQUIRED'}</small>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ResolvedResult({ endgame, onContinue }: { endgame: EndgameState; onContinue: () => void }) {
  const choice = choices.find((entry) => entry.id === endgame.choice);
  const card = endgame.gambleCardId ? getCard(endgame.gambleCardId) : undefined;
  const hasFinalValue = typeof endgame.finalGameValue === 'number';
  return (
    <section className="finish-line-result" aria-labelledby="finish-line-result-heading" aria-live="polite">
      <div className="finish-line-section-heading">
        <span className="eyebrow">FINAL DECISION // RESOLVED</span>
        <span className="mono">ENGINE RESULT ON RECORD</span>
      </div>
      <div className="finish-line-result-head">
        <div>
          <span className="mono">CHOICE MADE</span>
          <h2 id="finish-line-result-heading" className="display">{choice?.title ?? 'CHOICE RECORDED'}</h2>
        </div>
       {(endgame.endGameTitle || endgame.endGameTitleDescription) && (
         <div className="finish-line-endgame-callout" data-testid="finish-endgame-title">
           <span className="eyebrow">ENDGAME SIGNAL // RECORDED</span>
           {endgame.endGameTitle && <h3>{endgame.endGameTitle}</h3>}
           {endgame.endGameTitleDescription && <p>{endgame.endGameTitleDescription}</p>}
         </div>
       )}
        {hasFinalValue && (
          <div className="finish-line-final-value">
            <span className="mono">FINAL GAME VALUE</span>
            <strong>{formatMoney(endgame.finalGameValue!)}</strong>
          </div>
        )}
      </div>
      <div className="finish-line-result-body">
        {endgame.choice === 'CASH_OUT' && (
          <div className="finish-line-outcome">
            <span className="mono">SECURED VALUE</span>
            <strong>{hasFinalValue ? formatMoney(endgame.finalGameValue!) : 'VALUE PENDING'}</strong>
            <small>{typeof endgame.multiplier === 'number' ? `MULTIPLIER / ${endgame.multiplier.toFixed(2)}×` : 'MULTIPLIER NOT SUPPLIED'}</small>
          </div>
        )}
        {endgame.choice === 'DOUBLE_DOWN' && (
          <div className="finish-line-outcome">
            <span className="mono">LAST ROLL</span>
            <strong>{endgame.dice ? `${endgame.dice.die1} + ${endgame.dice.die2} = ${endgame.dice.total}` : 'ROLL NOT SUPPLIED'}</strong>
            <small>{typeof endgame.effectiveRoll === 'number' ? `EFFECTIVE ROLL / ${endgame.effectiveRoll}` : 'EFFECTIVE ROLL NOT SUPPLIED'}</small>
            {typeof endgame.multiplier === 'number' && <small>MULTIPLIER / {endgame.multiplier.toFixed(2)}×</small>}
            {typeof endgame.rollEffectDelta === 'number' && <small>ROLL MODIFIER / {endgame.rollEffectDelta >= 0 ? '+' : '−'}{Math.abs(endgame.rollEffectDelta)}</small>}
          </div>
        )}
        {endgame.choice === 'FINAL_GAMBLE' && (
          <div className="finish-line-outcome finish-line-gamble-outcome">
            <span className="mono">FINAL CARD</span>
            <strong>{card?.title ?? (endgame.gambleCardId ? `CARD ${endgame.gambleCardId}` : 'CARD NOT SUPPLIED')}</strong>
            {typeof endgame.gambleAdjustedDelta === 'number' && <small>OUTCOME / {formatSignedMoney(endgame.gambleAdjustedDelta)}</small>}
            {card && <small>{card.effect}</small>}
            <small>The revealed card is informational; it does not change the fixed 50/50 stake rules.</small>
            {endgame.gambleStake && (
              <>
                <small data-testid="finish-gamble-stake">ALL-IN FLIP / {endgame.gambleStake.won ? 'WON' : 'LOST'} — STAKE {formatMoney(endgame.gambleStake.wealth)} WEALTH + {formatMoney(endgame.gambleStake.assetValue)} ASSETS{endgame.gambleStake.tokens ? ` + ${endgame.gambleStake.tokens} UPGRADE TOKEN${endgame.gambleStake.tokens === 1 ? '' : 'S'}` : ''}</small>
                <small>STAKE RESULT / {formatSignedMoney(endgame.gambleStake.delta)}</small>
              </>
            )}
          </div>
        )}
        {!endgame.choice && <p className="finish-line-result-missing">The engine resolved this finish without a named choice.</p>}
      </div>
      <button className="action finish-line-continue" type="button" onClick={onContinue} data-testid="button-finish-continue">
        Continue to final record <span aria-hidden="true">↗</span>
      </button>
    </section>
  );
}

export function FinishLinePanel({ player, endgame, boardId, onChoose, onContinue, finishPlace, finishBonus }: FinishLinePanelProps) {
  const character = getCharacter(endgame.snapshot.characterId);
  const isResolved = endgame.status === 'RESOLVED';
  const [selectedChoice, setSelectedChoice] = useState<EndgameChoice | null>(null);
  const selected = choices.find((choice) => choice.id === selectedChoice);
  const assetValue = calculateAssetValue(endgame.snapshot);
  const assetCount = Object.values(endgame.snapshot.equipment).filter(Boolean).length;
  const doubleDownMultipliers = [0.25, 0.5, 0.85, 1.25, 1.9, 2.75];

  return (
    <main className="finish-line-panel" data-player-id={player.playerId} data-status={endgame.status}>
      <header className="finish-line-header">
        <div>
          <span className="eyebrow">REDLINE UPGRADE // FINISH LINE</span>
          <h1 className="display">The last<br /><span>move.</span></h1>
        </div>
        <div className="finish-line-header-meta mono">
          <span>{endgame.snapshot.isCPU ? 'CPU RECORD' : 'LOCAL PLAYER RECORD'}</span>
          <span>POSITION {String(endgame.snapshot.position).padStart(2, '0')} / 75</span>
        </div>
      </header>

      <section className="finish-line-identity" aria-labelledby="finish-line-player-heading">
        <div className="finish-line-portrait-wrap">
          {character ? <CharacterPortrait character={character} imagePath={player.portraitImagePath ?? undefined} logoPath={player.playerLogoPath} boardId={boardId} className="finish-line-portrait" /> : <div className="finish-line-portrait-fallback">PORTRAIT UNAVAILABLE</div>}
          <span className="mono finish-line-portrait-caption">PLAYER / {endgame.snapshot.displayName}</span>
        </div>
        <div className="finish-line-identity-copy">
          <span className="mono signal">FINISHER // {endgame.snapshot.displayName}</span>
          <h2 id="finish-line-player-heading" className="display">{character?.name ?? endgame.snapshot.displayName}</h2>
          <p>{getCareer(endgame.snapshot.careerId ?? '')?.description ?? 'The board is complete. The final value is ready to be decided.'}</p>
        </div>
        <div className="finish-line-status-block">
          <span className="mono">FINISH STATUS</span>
          <strong>{isResolved ? 'RESOLVED' : 'AT THE LINE'}</strong>
          <small>{isResolved ? 'FINAL ENGINE OUTPUT' : 'AWAITING DELIBERATE CHOICE'}</small>
        </div>
      </section>

      {finishPlace && finishPlace > 0 && (
        <section className="finish-order-banner" aria-label="Finish-order reward" data-testid="finish-order-bonus">
          <span className="mono">{finishOrdinal(finishPlace)} TO FINISH!</span>
          <strong>+{formatMoney(finishBonus ?? FINISH_ORDER_WEALTH_REWARDS[finishPlace - 1] ?? 0)} FINISH BONUS</strong>
          <small>ADDED TO WEALTH BEFORE THE FINAL SNAPSHOT</small>
        </section>
      )}
      <SnapshotLedger endgame={endgame} />
      {isResolved ? <ResolvedResult endgame={endgame} onContinue={onContinue} /> : endgame.snapshot.isCPU ? (
        <section className="finish-line-decision finish-line-awaiting" aria-live="polite">
          <span className="eyebrow">CLOSING DECISION // CPU</span>
          <h2 className="display">Decision<br /><span>processing.</span></h2>
          <p>The engine is selecting the final line for {endgame.snapshot.displayName}. No player input is required.</p>
          <div className="finish-line-processing" aria-hidden="true"><i /><i /><i /></div>
        </section>
      ) : (
        <section className="finish-line-choice-review" aria-label="Choose how to settle your final value">
          <div className="finish-line-choice-grid">
            {choices.map((choice) => (
              <button
                className={`finish-line-choice finish-line-choice-${choice.accent} ${selectedChoice === choice.id ? 'selected' : ''}`}
                type="button"
                onClick={() => setSelectedChoice(choice.id)}
                aria-pressed={selectedChoice === choice.id}
                key={choice.id}
                data-testid={`button-finish-choice-${choice.id.toLowerCase()}`}
              >
                <span className="finish-line-choice-top"><span className="mono">{choice.number} / DECISION</span><span aria-hidden="true">↗</span></span>
                <strong>{choice.title}</strong>
                <span>{choice.description}</span>
                <span className="mono finish-line-choice-cta">{selectedChoice === choice.id ? 'SELECTED' : 'REVIEW'}</span>
              </button>
            ))}
          </div>
          {selected && (
            <div className="finish-line-consequence-preview" aria-live="polite">
              <span className="eyebrow">BEFORE YOU CONFIRM // {selected.title}</span>
              {selectedChoice === 'CASH_OUT' && <p><strong>Secure {formatMoney(endgame.baseValue)}.</strong> Your Wealth, {assetCount} assets ({formatMoney(assetValue)}), and attributes remain unchanged.</p>}
              {selectedChoice === 'DOUBLE_DOWN' && <p><strong>Risk the final score, not your assets.</strong> The 2d4 multiplier range is {formatMoney(endgame.baseValue * Math.min(...doubleDownMultipliers))}–{formatMoney(endgame.baseValue * Math.max(...doubleDownMultipliers))}; Wealth and all {assetCount} assets remain owned regardless of the roll.</p>}
              {selectedChoice === 'FINAL_GAMBLE' && <p><strong>Stake all current Wealth, {assetCount} assets ({formatMoney(assetValue)}), and {endgame.snapshot.upgradeTokens} Upgrade Tokens.</strong> A 50/50 flip either adds the stake to final value or forfeits the staked Wealth, assets, and tokens. The drawn Gamble card is shown in the result.</p>}
              <div className="finish-line-choice-review-actions">
                <button type="button" className="action secondary" onClick={() => setSelectedChoice(null)}>CANCEL</button>
                <button type="button" className="action lime-action" onClick={() => selectedChoice && onChoose(selectedChoice)} data-testid="button-confirm-finish-choice">CONFIRM {selected.title}</button>
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

export function MatchResultsPanel({
  players,
  finishOrder = [],
  assetEvents = [],
  boardId = 'REDLINE_UPGRADE',
  unlockedAchievementIds = [],
  onHome,
  onProfile,
}: {
  players: MatchPlayer[];
  finishOrder?: number[];
  assetEvents?: AssetEventLogEntry[];
  boardId?: BoardId;
  unlockedAchievementIds?: string[];
  onHome?: () => void;
  onProfile?: () => void;
}) {
  const resolvedPlayers = getFinalPlacementOrder(players, finishOrder)
    .map((playerIndex) => players[playerIndex])
    .filter((player): player is MatchPlayer => player?.endgame?.status === 'RESOLVED');
  const achievementNames = unlockedAchievementIds.map((id) =>
    achievementCatalog.find((achievement) => achievement.id === id)?.name ?? 'Secret milestone unlocked',
  );

  return (
    <main className="finish-line-panel finish-line-match-results" data-testid="panel-match-results">
      <header className="finish-line-header">
        <div>
          <span className="eyebrow">REDLINE UPGRADE // MATCH COMPLETE</span>
          <h1 className="display">The final<br /><span>record.</span></h1>
        </div>
        <div className="finish-line-header-meta mono">
          <span>ALL FINISHERS / {String(resolvedPlayers.length).padStart(2, '0')}</span>
          <span>FINAL VALUES LOCKED</span>
        </div>
      </header>

      <section className="finish-line-results-intro" aria-labelledby="finish-line-results-heading">
        <div>
          <span className="eyebrow">MATCH OUTCOME // READ ONLY</span>
          <h2 id="finish-line-results-heading" className="display">Who held<br /><span>the line.</span></h2>
        </div>
        <p>{resolvedPlayers[0] ? `${getCharacter(resolvedPlayers[0].characterId)?.name ?? resolvedPlayers[0].displayName} wins with ${typeof resolvedPlayers[0].endgame?.finalGameValue === 'number' ? formatMoney(resolvedPlayers[0].endgame.finalGameValue) : 'the top final value'}. ` : ''}Every finish choice is resolved. Standings are ordered by final game value.</p>
      </section>

      {resolvedPlayers.length ? (
        <section className="finish-line-results-list" aria-label="Final match standings">
          {resolvedPlayers.map((player, index) => {
            const endgame = player.endgame!;
            const snapshotAssets = calculateAssetValue(endgame.snapshot);
            const finalAssets = new Set(Object.values(player.equipment).filter((assetId): assetId is string => Boolean(assetId)));
            const gambleLostAssets = endgame.choice === 'FINAL_GAMBLE' && endgame.gambleStake?.won === false
              ? new Set(Object.values(endgame.snapshot.equipment).filter((assetId): assetId is string => Boolean(assetId)))
              : new Set<string>();
            const transferredOutAssets = new Set(assetEvents
              .filter((event) => event.type === 'ASSET_TRANSFERRED' && event.targetPlayerId === player.playerId)
              .map((event) => event.assetId));
            const disposedEventsByAsset = new Map(assetEvents
              .filter((event) => event.type === 'ASSET_DISPOSED' && event.playerIndex === player.slot)
              .map((event) => [event.assetId, event]));
            const disposedAssets = new Set(disposedEventsByAsset.keys());
            const acquiredAssets = assetEvents
              .filter((event) => event.playerIndex === player.slot && (event.type === 'ASSET_ACQUIRED' || event.type === 'ASSET_PURCHASED'))
              .map((event) => event.assetId);
            const reconciledAssetIds = [...new Set([...acquiredAssets, ...finalAssets, ...gambleLostAssets, ...disposedAssets, ...transferredOutAssets])];
            const reconciliation = reconciledAssetIds.map((assetId) => ({
              assetId,
              status: finalAssets.has(assetId) ? 'RETAINED' as const
                : gambleLostAssets.has(assetId) ? 'LOST' as const
                  : disposedAssets.has(assetId) || transferredOutAssets.has(assetId) ? 'LOST' as const
                    : 'UNEXPLAINED' as const,
              reason: finalAssets.has(assetId) ? 'Retained after endgame'
                : gambleLostAssets.has(assetId) ? 'Forfeited in Final Gamble'
                  : disposedEventsByAsset.has(assetId) ? `Forfeited by ${disposedEventsByAsset.get(assetId)?.reason ?? 'a Gamble card'}`
                  : transferredOutAssets.has(assetId) ? 'Transferred out'
                    : 'No recorded loss event',
              level: player.assetLevels[assetId] ?? endgame.snapshot.assetLevels[assetId] ?? disposedEventsByAsset.get(assetId)?.assetLevel ?? 1,
            }));
            const finishStatsValue = endgame.snapshot.aiSkill * 15_000
              + endgame.snapshot.fame * 8_000
              + endgame.snapshot.lifestyle * 10_000
              + endgame.snapshot.influence * 7_500;
            const character = getCharacter(player.characterId);
            const career = player.careerId ? getCareer(player.careerId) : undefined;
            const finishPlace = finishOrder.indexOf(player.slot) + 1;
            const finishBonus = finishPlace > 0 ? FINISH_ORDER_WEALTH_REWARDS[finishPlace - 1] ?? 0 : 0;
            return (
              <article className={`finish-line-result-row ${index === 0 ? 'winner' : ''}`} key={player.playerId} data-testid={`match-result-${player.playerId}`}>
                <div className={`finish-line-result-placement placement-${index + 1}`} aria-label={`Final placement ${index + 1}`}>
                  <span className="mono">{index === 0 ? 'WINNER' : 'FINAL PLACE'}</span>
                  <strong>{finishOrdinal(index + 1)}</strong>
                </div>
                <div className="finish-line-result-player">
                   <div className="finish-line-result-avatar" aria-hidden="true">
                     {character
                        ? <CharacterPortrait character={character} imagePath={player.portraitImagePath ?? undefined} logoPath={player.playerLogoPath} boardId={boardId} className="finish-line-result-avatar-image" />
                       : player.displayName.slice(0, 1)}
                   </div>
                  <div>
                    <span className="mono">{player.isCPU ? `CPU ${player.slot}` : 'LOCAL PLAYER'}</span>
                    <strong>{character?.name ?? player.displayName}</strong>
                    <small>{player.displayName}</small>
                  </div>
                </div>
                <div className="finish-line-result-career">
                  <span className="mono">CAREER</span>
                  <strong>{career?.name ?? 'UNASSIGNED'}</strong>
                </div>
                <div className="finish-line-result-token">
                   <span className="mono">UPGRADE TOKENS / FINAL GAMBLE</span>
                  <strong>{endgame.snapshot.upgradeTokens} CARRY OVER</strong>
                  <small>Unused tokens remain available for the final gamble · {endgame.snapshot.history.upgradeTokensSpent} spent during the match</small>
                </div>
                <div className="finish-line-result-value">
                  <span className="mono">FINAL GAME VALUE</span>
                  <strong>{typeof endgame.finalGameValue === 'number' ? formatMoney(endgame.finalGameValue) : 'VALUE PENDING'}</strong>
                </div>
                 <div className="finish-line-result-ledger" aria-label={`${character?.name ?? player.displayName} final ledger`}>
                    <div><span className="mono">FINAL WEALTH</span><strong>{formatMoney(player.wealth)}</strong></div>
                    <div><span className="mono">AI SKILL / VALUE</span><strong>{endgame.snapshot.aiSkill.toLocaleString()} / {formatMoney(endgame.snapshot.aiSkill * 15_000)}</strong></div>
                    <div><span className="mono">FAME / VALUE</span><strong>{endgame.snapshot.fame.toLocaleString()} / {formatMoney(endgame.snapshot.fame * 8_000)}</strong></div>
                    <div><span className="mono">LIFESTYLE / VALUE</span><strong>{endgame.snapshot.lifestyle.toLocaleString()} / {formatMoney(endgame.snapshot.lifestyle * 10_000)}</strong></div>
                    <div><span className="mono">INFLUENCE / VALUE</span><strong>{endgame.snapshot.influence.toLocaleString()} / {formatMoney(endgame.snapshot.influence * 7_500)}</strong></div>
                    <div><span className="mono">BASE VALUE BREAKDOWN</span><strong>{formatMoney(endgame.snapshot.wealth)} WEALTH + {formatMoney(snapshotAssets)} ASSETS + {formatMoney(finishStatsValue)} ATTRIBUTES</strong></div>
                   <div><span className="mono">FINAL CHOICE</span><strong>{endgame.choice === 'CASH_OUT' ? 'CASH OUT' : endgame.choice === 'DOUBLE_DOWN' ? 'DOUBLE DOWN' : endgame.choice === 'FINAL_GAMBLE' ? 'FINAL GAMBLE' : 'NONE'}</strong>{endgame.choice === 'DOUBLE_DOWN' && endgame.multiplier !== undefined && <small>x{endgame.multiplier} multiplier</small>}</div>
                   <div><span className="mono">FINAL GAMBLE</span><strong>{typeof endgame.gambleAdjustedDelta === 'number' ? `${endgame.gambleAdjustedDelta >= 0 ? '+' : '-'}${formatMoney(Math.abs(endgame.gambleAdjustedDelta))}` : 'NOT TAKEN'}</strong></div>
                 </div>
                 <div className="finish-line-result-extra">
                   <div className="finish-line-result-verdict">
                     <span className="mono">FINAL SIGNAL</span>
                     <strong>{endgame.endGameTitle ?? 'FINISH RECORDED'}</strong>
                     {endgame.endGameTitleDescription && <p>{endgame.endGameTitleDescription}</p>}
                      {finishPlace > 0 && <small className="finish-order-result mono">BOARD FINISH / {finishOrdinal(finishPlace)} · +{formatMoney(finishBonus)} WEALTH BONUS</small>}
                      {endgame.choice === 'FINAL_GAMBLE' && <p>{endgame.gambleStake?.won
                        ? `Final Gamble won: the stake added ${formatMoney(endgame.gambleStake.wealth + endgame.gambleStake.assetValue + endgame.gambleStake.tokenValue)} to final value; assets remain owned.`
                        : `Final Gamble lost: ${formatMoney(endgame.gambleStake?.wealth ?? 0)} Wealth, ${formatMoney(endgame.gambleStake?.assetValue ?? 0)} in assets, and ${endgame.gambleStake?.tokens ?? 0} Upgrade Tokens were forfeited.`}</p>}
                      <small className="finish-order-result mono">ENDGAME OUTCOME / {endgame.choice === 'CASH_OUT' ? 'BASE VALUE LOCKED AT 1×' : endgame.choice === 'DOUBLE_DOWN' ? `2D4 ROLL · ${endgame.effectiveRoll} · ${endgame.multiplier}×` : endgame.choice === 'FINAL_GAMBLE' ? (endgame.gambleStake?.won ? '50/50 STAKE WON' : '50/50 STAKE LOST') : 'NOT RECORDED'}</small>
                   </div>
                    {player.creditRewardReceipt && <div className="finish-line-credit-receipt" data-testid={`credit-receipt-${player.playerId}`}>
                      <span className="mono">REDLINE CREDITS EARNED</span>
                      <strong>+{player.creditRewardReceipt.total.toLocaleString()} ◈</strong>
                      <small>GAME {player.creditRewardReceipt.game.toLocaleString()} · ENDGAME {player.creditRewardReceipt.endgame.toLocaleString()} · MILESTONES {player.creditRewardReceipt.milestones.toLocaleString()}</small>
                    </div>}
                   <div className="finish-line-result-assets" role="group" aria-label={`${character?.name ?? player.displayName} final assets`}>
                     {assetSlots.map(({ slot, label }) => {
                        const assetId = player.equipment[slot];
                       const asset = assetId ? getAsset(assetId) : undefined;
                        const level = asset ? player.assetLevels[asset.id] ?? 1 : null;
                        const endgameValue = asset ? assetValueAtLevel(asset, level! as AssetLevel) : 0;
                       const categoryLabel = asset?.category === 'pet'
                         ? 'PET'
                         : asset?.category === 'investment'
                           ? 'INVESTMENT'
                           : label;
                       return (
                         <div className={`finish-line-result-asset ${asset ? 'collected' : 'open'}`} key={slot} role="group" aria-label={asset ? `${categoryLabel}, ${asset.name}, level ${level}` : `${label}, open slot`}>
                           <span className="mono">{categoryLabel}</span>
                           <div className="finish-line-result-asset-art" aria-hidden="true">
                             {asset ? <AssetArtwork assetId={asset.id} level={level! as 1 | 2 | 3 | 4} className="finish-line-result-asset-image" /> : <span>+</span>}
                           </div>
                           <strong>{asset?.name ?? 'OPEN'}</strong>
                            <small>{asset ? `LV ${level} / ENDGAME +${formatMoney(endgameValue)}` : 'EMPTY'}</small>
                         </div>
                       );
                     })}
                    </div>
                    <section className="finish-line-asset-reconciliation" aria-label={`${character?.name ?? player.displayName} asset reconciliation`}>
                      <span className="mono">ASSET RECONCILIATION / AFTER ENDGAME</span>
                      {reconciliation.length ? <ul>{reconciliation.map((entry) => (
                        <li className={`disposition-${entry.status.toLowerCase()}`} key={entry.assetId}>
                          <strong>{getAsset(entry.assetId)?.name ?? entry.assetId}</strong>
                          <span>LEVEL {entry.level} · {entry.status === 'RETAINED' ? 'RETAINED AT FINISH' : entry.status}</span>
                          <small>{entry.reason}</small>
                        </li>
                      ))}</ul> : <p>No assets were acquired or held in this game.</p>}
                      {reconciliation.some((entry) => entry.status === 'UNEXPLAINED') && <p className="finish-line-asset-reconciliation-warning" role="alert">An asset was acquired but has no recorded retention or loss event. It is flagged for reconciliation and is not counted as lost.</p>}
                    </section>
                 </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="finish-line-results-empty" aria-live="polite">
          <span className="mono">FINAL RECORD UNAVAILABLE</span>
          <p>No resolved finish values have been supplied.</p>
        </section>
      )}
      {achievementNames.length > 0 && <section className="finish-line-unlocked-milestones" aria-label="New profile milestones">
        <span className="mono">NEW PROFILE MILESTONES</span>
        <ul>{achievementNames.map((name, awardIndex) => <li key={`${awardIndex}-${name}`}>{name}</li>)}</ul>
      </section>}
      {(onHome || onProfile) && <nav className="finish-line-result-actions" aria-label="After-match navigation">
        {onHome && <button type="button" className="action lime-action" onClick={onHome}>BACK TO HOME</button>}
        {onProfile && <button type="button" className="action secondary" onClick={onProfile}>VIEW PROFILE</button>}
      </nav>}
    </main>
  );
}