import { getAsset, type AssetLevel, type AssetSlot } from '@/game/assets';
import { formatMoney, getCareer, SALARY_TIERS } from '@/game/careers';
import { getCharacter } from '@/game/characters';
import { effectiveSalaryAmount } from '@/game/player';
import {
  ENDGAME_BALANCE,
  calculateAssetValue,
  calculateAttributePointValue,
  calculateEndgameBaseValue,
  type EndgameChoice,
  type EndgameScoreBreakdown,
  type EndgameState,
} from '@/game/endgame';
import { getFinalPlacementOrder, type MatchPlayer } from '@/game/match';
import type { BoardId } from '@/game/boards';
import { FINISH_ORDER_WEALTH_REWARDS } from '@/game/careers';
import { assetValueAtLevel } from '@/game/upgrade-tokens';
import { doubleDownValue } from '@/game/endgame';
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
    description: 'Score assets at 50%. Keep Wealth, stats, and assets.',
    accent: 'cash',
  },
  {
    id: 'DOUBLE_DOWN',
    number: '02',
    title: 'DOUBLE DOWN',
    description: 'Score assets at 70%, then apply the 2d4 multiplier.',
    accent: 'double',
  },
  {
    id: 'FINAL_GAMBLE',
    number: '03',
    title: 'FINAL GAMBLE',
    description: 'A 50/50 result scores assets at 140% or forfeits them.',
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

function personalBestValue(category: string, value: number) {
  return ['FINAL_SCORE', 'FINAL_WEALTH', 'PORTFOLIO_VALUE'].includes(category)
    ? formatMoney(value)
    : category === 'ASSET_UPGRADE_LEVEL'
      ? `LEVEL ${value}`
      : value.toLocaleString();
}

function personalBestCategoryLabel(category: string) {
  return category.replaceAll('_', ' ');
}

function ScoreBreakdownDetails({
  breakdown,
  choice,
  multiplier,
  dice,
}: {
  breakdown: EndgameScoreBreakdown;
  choice: EndgameChoice;
  multiplier?: number;
  dice?: EndgameState['dice'];
}) {
  return (
    <details className="finish-line-score-breakdown">
      <summary>Scoring breakdown</summary>
      <dl>
        <div><dt>Wealth before finish bonus</dt><dd>{formatMoney(breakdown.wealthBeforeFinishBonus)}</dd></div>
        <div><dt>Finish-order wealth bonus</dt><dd>+{formatMoney(breakdown.finishOrderBonus)}</dd></div>
        <div><dt>Attribute-leader bonus</dt><dd>+{formatMoney(breakdown.attributeLeaderBonus)}</dd></div>
        <div><dt>Assets · {Math.round(breakdown.assetMultiplier * 100)}% of {formatMoney(breakdown.assetBaseValue)}</dt><dd>{formatMoney(breakdown.adjustedAssetValue)}</dd></div>
        <div><dt>Attribute point value</dt><dd>{formatMoney(breakdown.attributePointValue)}</dd></div>
        <div><dt>Score before endgame adjustment</dt><dd>{formatMoney(breakdown.preAdjustmentScore)}</dd></div>
        {choice === 'DOUBLE_DOWN' && dice && (
          <>
            <div><dt>2d4 result</dt><dd>{dice.die1} + {dice.die2} = {dice.total}</dd></div>
            <div><dt>2d4 multiplier</dt><dd>{multiplier?.toFixed(2) ?? '—'}×</dd></div>
            <div><dt>Dice adjustment</dt><dd>{formatSignedMoney(breakdown.diceAdjustment)}</dd></div>
          </>
        )}
        <div className="finish-line-score-total"><dt>Final dollar score</dt><dd>{formatMoney(breakdown.finalScore)}</dd></div>
      </dl>
    </details>
  );
}

function SnapshotLedger({ endgame }: { endgame: EndgameState }) {
  const { snapshot } = endgame;
  const nominalAssetValue = calculateAssetValue(snapshot);
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
          <span className="mono">WEALTH AT FINISH</span>
          <strong>{formatMoney(snapshot.wealth)}</strong>
        </div>
        <div className="finish-line-ledger-cell">
          <span className="mono">CASH OUT SCORE BASE</span>
          <strong>{formatMoney(endgame.baseValue)}</strong>
          <small>50% ASSET VALUE · BEFORE ANY DOUBLE-DOWN ROLL</small>
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
          <span className="mono">UPGRADE TOKENS / NOT SCORE VALUE</span>
          <strong>{snapshot.upgradeTokens} TO CONVERT</strong>
          <small>
            Cash Out or Double Down: {formatMoney(snapshot.upgradeTokens * ENDGAME_BALANCE.tokenCreditsPerOutcome.cashOut)} Credits.
            Final Gamble: {formatMoney(snapshot.upgradeTokens * ENDGAME_BALANCE.tokenCreditsPerOutcome.finalGambleWin)} on a win, $0 on a loss.
            {` ${snapshot.history.upgradeTokensSpent} spent during the match.`}
          </small>
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
                <small>{asset
                  ? `LV ${level} / NOMINAL ${formatMoney(assetValueAtLevel(asset, level! as AssetLevel))} / CASH OUT ${formatMoney(assetValueAtLevel(asset, level! as AssetLevel) * ENDGAME_BALANCE.assetValueMultipliers.cashOut)}`
                  : 'NOT ACQUIRED'}</small>
            </div>
          );
        })}
      </div>
      <p className="finish-line-asset-value-note">
        Asset baseline: {formatMoney(nominalAssetValue)}. Tokens convert to Credits after settlement; they never add to Wealth or dollar score.
      </p>
    </section>
  );
}

function ResolvedResult({ endgame, onContinue }: { endgame: EndgameState; onContinue: () => void }) {
  const choice = choices.find((entry) => entry.id === endgame.choice);
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
            <span className="mono">50/50 FINAL GAMBLE</span>
            <strong>{endgame.gambleStake?.won ? 'WON' : 'LOST'}</strong>
            <small>
              Wealth and attributes stay unchanged. Assets {endgame.gambleStake?.won
                ? `score at 140% (${formatMoney(endgame.gambleStake.adjustedAssetValue)}) and remain owned.`
                : 'score $0 and are forfeited.'}
            </small>
            {endgame.gambleStake && (
              <>
                <small data-testid="finish-gamble-stake">
                  TOKENS / {endgame.gambleStake.tokens} × {formatMoney(endgame.gambleStake.creditsPerToken)} = {formatMoney(endgame.gambleStake.credits)} CREDITS
                </small>
              </>
            )}
          </div>
        )}
        {!endgame.choice && <p className="finish-line-result-missing">The engine resolved this finish without a named choice.</p>}
      </div>
      {endgame.scoreBreakdown && endgame.choice && (
        <ScoreBreakdownDetails
          breakdown={endgame.scoreBreakdown}
          choice={endgame.choice}
          multiplier={endgame.multiplier}
          dice={endgame.dice}
        />
      )}
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
  const canFinalGamble = assetCount > 0 || endgame.snapshot.upgradeTokens > 0;
  const doubleDownOutcomes = [2, 3, 4, 5, 6, 7, 8].map((total) => ({
    total,
    ...doubleDownValue(
      calculateEndgameBaseValue(endgame.snapshot, ENDGAME_BALANCE.assetValueMultipliers.doubleDown),
      total,
    ),
  }));
  const cashOutScore = calculateEndgameBaseValue(
    endgame.snapshot,
    ENDGAME_BALANCE.assetValueMultipliers.cashOut,
  );
  const finalGambleWinScore = calculateEndgameBaseValue(
    endgame.snapshot,
    ENDGAME_BALANCE.assetValueMultipliers.finalGambleWin,
  );
  const finalGambleLossScore = calculateEndgameBaseValue(
    endgame.snapshot,
    ENDGAME_BALANCE.assetValueMultipliers.finalGambleLoss,
  );

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
                disabled={choice.id === 'FINAL_GAMBLE' && !canFinalGamble}
                aria-pressed={selectedChoice === choice.id}
                key={choice.id}
                data-testid={`button-finish-choice-${choice.id.toLowerCase()}`}
              >
                <span className="finish-line-choice-top"><span className="mono">{choice.number} / DECISION</span><span aria-hidden="true">↗</span></span>
                <strong>{choice.title}</strong>
                <span>{choice.description}</span>
                <span className="mono finish-line-choice-value">
                  {choice.id === 'CASH_OUT' && `SCORE ${formatMoney(cashOutScore)} · ${endgame.snapshot.upgradeTokens * ENDGAME_BALANCE.tokenCreditsPerOutcome.cashOut} CREDITS`}
                  {choice.id === 'DOUBLE_DOWN' && `2d4 · SCORE ${formatMoney(doubleDownOutcomes[0].finalGameValue)}–${formatMoney(doubleDownOutcomes[doubleDownOutcomes.length - 1].finalGameValue)} · ${endgame.snapshot.upgradeTokens * ENDGAME_BALANCE.tokenCreditsPerOutcome.doubleDown} CREDITS`}
                  {choice.id === 'FINAL_GAMBLE' && (canFinalGamble
                    ? `WIN ${formatMoney(finalGambleWinScore)} / LOSE ${formatMoney(finalGambleLossScore)}`
                    : 'UNAVAILABLE · NEED AN ASSET OR TOKEN')}
                </span>
                <span className="mono finish-line-choice-cta">{selectedChoice === choice.id ? 'SELECTED' : 'REVIEW'}</span>
              </button>
            ))}
          </div>
          {selected && (
            <div className="finish-line-consequence-preview" aria-live="polite">
              <span className="eyebrow">BEFORE YOU CONFIRM // {selected.title}</span>
              {selectedChoice === 'CASH_OUT' && (
                <>
                  <p><strong>Final score: {formatMoney(cashOutScore)}.</strong> Assets score at 50% of their {formatMoney(assetValue)} level value. Wealth, stats, and all {assetCount} assets remain unchanged. {endgame.snapshot.upgradeTokens} tokens convert to {formatMoney(endgame.snapshot.upgradeTokens * ENDGAME_BALANCE.tokenCreditsPerOutcome.cashOut)} Credits.</p>
                </>
              )}
              {selectedChoice === 'DOUBLE_DOWN' && (
                <>
                  <p><strong>Assets score at 70% before the 2d4 multiplier.</strong> Wealth, stats, and all {assetCount} assets remain unchanged. Tokens convert at {formatMoney(ENDGAME_BALANCE.tokenCreditsPerOutcome.doubleDown)} Credits each.</p>
                  <div className="finish-line-dice-outcomes" aria-label="Double Down 2d4 outcomes">
                    {doubleDownOutcomes.map((outcome) => (
                      <span key={outcome.total}>2d4 {outcome.total} · {outcome.multiplier}× · {formatMoney(outcome.finalGameValue)}</span>
                    ))}
                  </div>
                </>
              )}
              {selectedChoice === 'FINAL_GAMBLE' && (
                <p><strong>One 50/50 result.</strong> Win: assets score at 140%, all assets stay owned, and tokens convert to {formatMoney(endgame.snapshot.upgradeTokens * ENDGAME_BALANCE.tokenCreditsPerOutcome.finalGambleWin)} Credits. Loss: assets score $0 and are forfeited; tokens convert to $0 Credits. Wealth and stats are never risked. Potential scores: win {formatMoney(finalGambleWinScore)}, loss {formatMoney(finalGambleLossScore)}.</p>
              )}
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
                      {!!player.personalBestCategories?.length && <div className="finish-line-personal-best-badges" aria-label="New Personal Best categories">
                        {player.personalBestCategories.map(category => <span key={category}>NEW PERSONAL BEST · {personalBestCategoryLabel(category)}</span>)}
                      </div>}
                   </div>
                    {!!player.personalBestDetails?.length && <details className="finish-line-personal-best-details">
                      <summary>Personal Best details · {player.personalBestDetails.length} records</summary>
                      <div className="finish-line-personal-best-list">
                        {player.personalBestDetails.map(record => <article key={record.category}>
                          <span className="mono">{record.label} · {record.mode} · {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(record.achievedAt))}</span>
                          <strong>{record.isBaseline ? 'BASELINE RECORDED' : record.isNewRecord ? 'NEW PERSONAL BEST' : 'PERSONAL BEST'}</strong>
                          <div><span>Previous best: {record.previousValue === null ? '—' : personalBestValue(record.category, record.previousValue)}</span><span>New best: {personalBestValue(record.category, record.value)}</span><span>Improvement: {record.isBaseline ? 'Baseline' : `+${personalBestValue(record.category, record.improvement)}`}</span></div>
                          {record.category === 'ASSET_UPGRADE_LEVEL' && record.relevantAssetId && <small>{getAsset(record.relevantAssetId)?.name ?? record.relevantAssetId}</small>}
                        </article>)}
                      </div>
                    </details>}
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