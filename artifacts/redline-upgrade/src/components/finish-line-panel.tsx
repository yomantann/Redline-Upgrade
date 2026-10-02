import { getAsset, type AssetLevel, type AssetSlot } from '@/game/assets';
import { getCard } from '@/game/cards';
import { formatMoney, getCareer, SALARY_TIERS } from '@/game/careers';
import { getCharacter } from '@/game/characters';
import { effectiveSalaryAmount } from '@/game/player';
import type { EndgameChoice, EndgameState } from '@/game/endgame';
import type { MatchPlayer } from '@/game/match';
import { FINISH_ORDER_WEALTH_REWARDS } from '@/game/careers';
import { assetValueAtLevel } from '@/game/upgrade-tokens';
import { CharacterPortrait } from './character-portrait';
import { AssetArtwork } from './asset-artwork';
import './finish-line-panel.css';

export interface FinishLinePanelProps {
  player: MatchPlayer;
  endgame: EndgameState;
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
    description: 'Draw one Gamble card and apply its effect to the recorded value.',
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

function ChoiceButton({
  choice,
  onChoose,
}: {
  choice: (typeof choices)[number];
  onChoose: (choice: EndgameChoice) => void;
}) {
  return (
    <button
      className={`finish-line-choice finish-line-choice-${choice.accent}`}
      type="button"
      onClick={() => onChoose(choice.id)}
      aria-label={`Choose ${choice.title}`}
      data-testid={`button-finish-choice-${choice.id.toLowerCase()}`}
    >
      <span className="finish-line-choice-top">
        <span className="mono">{choice.number} / DECISION</span>
        <span className="finish-line-choice-mark" aria-hidden="true">↗</span>
      </span>
      <strong>{choice.title}</strong>
      <span>{choice.description}</span>
      <span className="mono finish-line-choice-cta">SELECT <span aria-hidden="true">→</span></span>
    </button>
  );
}

function SnapshotLedger({ endgame }: { endgame: EndgameState }) {
  const { snapshot } = endgame;
  const career = snapshot.careerId ? getCareer(snapshot.careerId) : undefined;
  const secondCareer = snapshot.secondCareer ? getCareer(snapshot.secondCareer.careerId) : undefined;
  const salaryTier = snapshot.secondCareer && snapshot.secondCareer.salaryAmount > snapshot.salaryAmount
    ? SALARY_TIERS[snapshot.secondCareer.salaryTier - 1] ?? 'UNASSIGNED'
    : SALARY_TIERS[snapshot.salaryTier - 1] ?? 'UNASSIGNED';
  const paydaySalary = effectiveSalaryAmount(snapshot);
  const availableTokens = Math.max(0, snapshot.upgradeTokens - snapshot.heldUpgradeTokens);

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
          <span className="mono">HELD TOKENS / FUTURE CREDITS</span>
          <strong>{snapshot.heldUpgradeTokens} HELD</strong>
          <small>{availableTokens} available · {snapshot.history.upgradeTokensSpent} spent · held tokens are not included in this match value</small>
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

function PendingDecision({
  endgame,
  onChoose,
}: {
  endgame: EndgameState;
  onChoose: (choice: EndgameChoice) => void;
}) {
  if (endgame.snapshot.isCPU) {
    return (
      <section className="finish-line-decision finish-line-awaiting" aria-live="polite" aria-labelledby="finish-line-decision-heading">
        <div className="finish-line-section-heading">
          <span className="eyebrow">CLOSING DECISION // CPU</span>
          <span className="mono">ENGINE CONTROL</span>
        </div>
        <h2 id="finish-line-decision-heading" className="display">Decision<br /><span>processing.</span></h2>
        <p>The engine is selecting the final line for {endgame.snapshot.displayName}. No player input is required.</p>
        <div className="finish-line-processing" aria-hidden="true"><i /><i /><i /></div>
      </section>
    );
  }

  return (
    <section className="finish-line-decision" aria-labelledby="finish-line-decision-heading">
      <div className="finish-line-section-heading">
        <span className="eyebrow">CLOSING DECISION // YOUR MOVE</span>
        <span className="mono">SELECT ONE / NO AUTO-RESOLVE</span>
      </div>
      <div className="finish-line-decision-heading-row">
        <h2 id="finish-line-decision-heading" className="display">The last<br /><span>line is yours.</span></h2>
        <p>Everything above is locked. Choose how the recorded run closes.</p>
      </div>
      <div className="finish-line-choice-grid" aria-label="Endgame choices">
        {choices.map((choice) => <ChoiceButton key={choice.id} choice={choice} onChoose={onChoose} />)}
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

export function FinishLinePanel({ player, endgame, onChoose, onContinue, finishPlace, finishBonus }: FinishLinePanelProps) {
  const character = getCharacter(endgame.snapshot.characterId);
  const isResolved = endgame.status === 'RESOLVED';

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
          {character ? <CharacterPortrait character={character} className="finish-line-portrait" /> : <div className="finish-line-portrait-fallback">PORTRAIT UNAVAILABLE</div>}
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
      {isResolved ? <ResolvedResult endgame={endgame} onContinue={onContinue} /> : <PendingDecision endgame={endgame} onChoose={onChoose} />}
    </main>
  );
}

export function MatchResultsPanel({ players, finishOrder = [] }: { players: MatchPlayer[]; finishOrder?: number[] }) {
  const resolvedPlayers = players
    .filter((player) => player.endgame?.status === 'RESOLVED')
    .sort((a, b) => {
      const valueA = a.endgame?.finalGameValue ?? Number.NEGATIVE_INFINITY;
      const valueB = b.endgame?.finalGameValue ?? Number.NEGATIVE_INFINITY;
      return valueB - valueA || a.slot - b.slot;
    });

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
        <p>Every finish choice is resolved. The standings below are ordered by final game value.</p>
      </section>

      {resolvedPlayers.length ? (
        <section className="finish-line-results-list" aria-label="Final match standings">
          {resolvedPlayers.map((player, index) => {
            const endgame = player.endgame!;
            const character = getCharacter(player.characterId);
            const career = player.careerId ? getCareer(player.careerId) : undefined;
            const availableTokens = Math.max(0, endgame.snapshot.upgradeTokens - endgame.snapshot.heldUpgradeTokens);
            const finishPlace = finishOrder.indexOf(player.slot) + 1;
            const finishBonus = finishPlace > 0 ? FINISH_ORDER_WEALTH_REWARDS[finishPlace - 1] ?? 0 : 0;
            return (
              <article className={`finish-line-result-row ${index === 0 ? 'winner' : ''}`} key={player.playerId} data-testid={`match-result-${player.playerId}`}>
                <div className="finish-line-result-placement" aria-label={`Placement ${index + 1}`}>
                  <span className="mono">PLACE</span>
                  <strong>{String(index + 1).padStart(2, '0')}</strong>
                </div>
                <div className="finish-line-result-player">
                   <div className="finish-line-result-avatar" aria-hidden="true">
                     {character
                       ? <CharacterPortrait character={character} className="finish-line-result-avatar-image" />
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
                   <span className="mono">HELD TOKENS / FUTURE CREDITS</span>
                  <strong>{endgame.snapshot.heldUpgradeTokens} HELD</strong>
                  <small>{availableTokens} available · {endgame.snapshot.history.upgradeTokensSpent} spent · held tokens are not included in this match value</small>
                </div>
                <div className="finish-line-result-value">
                  <span className="mono">FINAL GAME VALUE</span>
                  <strong>{typeof endgame.finalGameValue === 'number' ? formatMoney(endgame.finalGameValue) : 'VALUE PENDING'}</strong>
                </div>
                 <div className="finish-line-result-extra">
                   <div className="finish-line-result-verdict">
                     <span className="mono">FINAL SIGNAL</span>
                     <strong>{endgame.endGameTitle ?? 'FINISH RECORDED'}</strong>
                     {endgame.endGameTitleDescription && <p>{endgame.endGameTitleDescription}</p>}
                     {finishPlace > 0 && <small className="finish-order-result mono">{finishOrdinal(finishPlace)} TO FINISH / +{formatMoney(finishBonus)} FINISH BONUS</small>}
                   </div>
                   <div className="finish-line-result-assets" role="group" aria-label={`${character?.name ?? player.displayName} final assets`}>
                     {assetSlots.map(({ slot, label }) => {
                       const assetId = endgame.snapshot.equipment[slot];
                       const asset = assetId ? getAsset(assetId) : undefined;
                       const level = asset ? endgame.snapshot.assetLevels[asset.id] ?? 1 : null;
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
    </main>
  );
}