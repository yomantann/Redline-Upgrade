import { useState } from 'react';
import { assetOptions, type AssetCategory, type AssetDefinition } from '@/game/assets';
import { formatMoney, getCareer, getCategory, SALARY_TIERS, type Career } from '@/game/careers';
import type { MatchAction, MatchPlayer, PendingDecision } from '@/game/match';
import { getAssetArtworkUrl, getCategoryArtworkUrl } from '@/game/asset-artwork';
import { CareerGlyph } from './career-reveal';
import { SpaceIcon } from './space-icon';
import './milestone-choice.css';

type Props = { pending: PendingDecision; player: MatchPlayer; onAction: (action: MatchAction) => void };
const statLabels: Record<string, string> = { aiSkill: 'AI SKILL', fame: 'FAME', lifestyle: 'LIFESTYLE', influence: 'INFLUENCE', wealth: 'WEALTH' };
const titles: Record<string, string> = { car: 'Choose your car.', lifestyle: 'Choose your lifestyle.', pet: 'Choose your companion.', investment: 'Back your future.', property: 'Choose your property.' };

function Header({ space, eyebrow, title, highlighted, description }: { space: number; eyebrow: string; title: string; highlighted?: string; description: string }) {
  return (
    <div className="milestone-heading">
      <div><span className="eyebrow">SPACE {String(space).padStart(2, '0')} // {eyebrow}</span><h2>{title} {highlighted && <span>{highlighted}</span>}</h2></div>
      <p>{description}</p>
    </div>
  );
}

function AssetArtwork({ asset, index }: { asset: AssetDefinition; index: number }) {
  const image = getAssetArtworkUrl(asset.id);
  return (
    <div className={`milestone-art ${image ? 'has-artwork' : ''}`} data-category={asset.category} aria-label={`${asset.name} visual`}>
      <span className="milestone-art-index">{String(index + 1).padStart(2, '0')} / {asset.rarity.toUpperCase()}</span>
      <span className="milestone-art-symbol" aria-hidden="true"><SpaceIcon name={asset.category} size={58} /></span>
      {image && <img className="milestone-art-image" src={image} alt="" loading="lazy" onError={event => { event.currentTarget.style.display = 'none'; event.currentTarget.parentElement?.classList.remove('has-artwork'); }} />}
      <span className="milestone-art-caption">{asset.category.toUpperCase()} / REDLINE</span>
    </div>
  );
}

function AssetCard({ asset, index, wealth, selected, onSelect, onBuy }: { asset: AssetDefinition; index: number; wealth: number; selected: boolean; onSelect: () => void; onBuy: () => void }) {
  const affordable = wealth >= asset.cost;
  const effects = Object.entries(asset.effects).filter(([, value]) => value != null && value !== 0);
  return (
    <article className={`milestone-card asset-offer-card ${selected ? 'selected' : ''}`} data-testid={`card-asset-${asset.id}`} tabIndex={0} aria-label={`Select ${asset.name} offer`} onClick={onSelect} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onSelect(); } }}>
      <AssetArtwork asset={asset} index={index} />
      <div className="milestone-card-body">
        <span className="milestone-card-kicker mono"><SpaceIcon name={asset.category} size={13} /> {asset.category} / {asset.rarity}</span>
        <h3>{asset.name}</h3>
        <p className="milestone-card-desc">{asset.description}</p>
        <div className="milestone-card-price"><span className="mono">COST / WEALTH</span><strong>{formatMoney(asset.cost)}</strong></div>
        <div className="milestone-effects" aria-label="Stat effects">
          {effects.length ? effects.map(([key, value]) => <span key={key}>{value! > 0 ? '+' : ''}{key === 'wealth' ? formatMoney(value!) : value} {statLabels[key] ?? key}</span>) : <span>NO IMMEDIATE STAT CHANGE</span>}
        </div>
        {asset.passiveEffect && <p className="milestone-passive"><b>SPECIAL / ON FILE</b>{asset.passiveEffect}</p>}
        <button className="milestone-buy" type="button" disabled={!affordable} onClick={(event) => { event.stopPropagation(); onBuy(); }} data-testid={`button-buy-asset-${asset.id}`}>
          <span>{affordable ? `BUY ${asset.name}` : 'NOT ENOUGH WEALTH'}</span><span aria-hidden="true">{affordable ? '↗' : '—'}</span>
        </button>
      </div>
    </article>
  );
}

function CareerCard({ career, index, onSelect }: { career: Career; index: number; onSelect: () => void }) {
  const category = getCategory(career.categoryId);
  return (
    <article className={`milestone-card milestone-career-card career-${career.id}`} data-testid={`card-career-offer-${career.id}`}>
      <div className="milestone-art career-art" data-category={career.categoryId}>
        <span className="milestone-art-index">OFFER / 0{index + 1}</span>
        <span className="milestone-art-symbol"><CareerGlyph icon={career.icon || career.name} /></span>
        <span className="milestone-art-caption">{category?.name ?? career.categoryId} / {career.icon}</span>
      </div>
      <div className="milestone-card-body">
        <span className="milestone-card-kicker mono"><CareerGlyph icon={category?.icon ?? career.categoryId} className="career-kicker-glyph" /> {category?.name ?? career.categoryId}</span>
        <h3>{career.name}</h3>
        <p className="milestone-card-desc">{career.description}</p>
        <div className="milestone-card-price"><span className="mono">SALARY RANGE</span><strong>{formatMoney(career.salaryTiers[0])}–{formatMoney(career.salaryTiers[3])}</strong></div>
        <div className="career-tier-strip" aria-label="Four salary tiers">{career.salaryTiers.map((salary, tier) => <span className={`salary-tier-${tier + 1}`} key={tier}><small>{SALARY_TIERS[tier]}</small><b>{formatMoney(salary)}</b></span>)}</div>
        <div className="milestone-effects"><span>ABILITY / {career.abilityName}</span></div>
        <p className="milestone-passive">{career.abilityDescription}</p>
        <button className="milestone-buy" type="button" onClick={onSelect} data-testid={`button-select-career-${career.id}`}><span>SELECT CAREER</span><span aria-hidden="true">↗</span></button>
      </div>
    </article>
  );
}

export function MilestoneChoice({ pending, player, onAction }: Props) {
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const currentCareer = player.careerId ? getCareer(player.careerId) : undefined;
  const category = pending.kind === 'ASSET' ? pending.category ?? (pending.slot === 'companion' ? null : pending.slot) : null;
  const offers = pending.kind === 'ASSET' ? pending.offeredAssetIds : undefined;
  const options = category ? assetOptions(category as AssetCategory).filter(asset => !offers || offers.includes(asset.id)).slice(0, 3) : [];

  if (pending.kind === 'CARD') return null;

  if (player.isCPU) {
    return (
      <section className="milestone-choice" aria-live="polite" data-testid="status-cpu-decision">
        <Header space={pending.space} eyebrow="AUTOMATIC DECISION" title={`CPU ${player.slot} is`} highlighted="choosing." description="Their move is being resolved. The player sheet will update when the decision is complete." />
        <div className="milestone-cpu"><strong>Calculating<br />next move.</strong><i aria-hidden="true" /><p className="mono">DECISION IN PROGRESS // BOARD PAUSED</p></div>
      </section>
    );
  }

  if (pending.kind === 'ASSET') {
    if (!category) return (
      <section className="milestone-choice" aria-labelledby="milestone-title">
        <Header space={45} eyebrow="FORK IN THE ROAD" title="What's your" highlighted="next move?" description="One slot. Two directions. Choose a companion or put your wealth to work." />
        <div className="milestone-meta mono"><span>AVAILABLE WEALTH / <b>{formatMoney(player.wealth)}</b></span><span>PET OR INVESTMENT // CHOOSE ONE PATH</span></div>
        <div className="milestone-grid two">
          {(['pet', 'investment'] as const).map((choice, index) => {
            const artwork = getCategoryArtworkUrl(choice);
            return (
              <button className="milestone-card milestone-option" key={choice} type="button" onClick={() => onAction({ type: 'CHOOSE_ASSET_CATEGORY', category: choice })} data-testid={`button-choose-category-${choice}`}>
                <div className={`milestone-art ${artwork ? 'has-artwork' : ''}`} data-category={choice}>
                  <span className="milestone-art-index">PATH / 0{index + 1}</span>
                  <span className="milestone-art-symbol">{choice === 'pet' ? 'P' : 'I'}</span>
                  {artwork && <img className="milestone-art-image" src={artwork} alt="" loading="lazy" onError={event => { event.currentTarget.style.display = 'none'; event.currentTarget.parentElement?.classList.remove('has-artwork'); }} />}
                  <span className="milestone-art-caption">SPACE 45 / CHOICE</span>
                </div>
                <div className="milestone-card-body"><span className="mono milestone-card-kicker">COMPANION SLOT</span><h3>{choice === 'pet' ? 'PET' : 'INVESTMENT'}</h3><span className="milestone-card-desc">{choice === 'pet' ? 'Bring someone along. Build your Lifestyle, Fame or AI Skill.' : 'Put capital in play. Choose an asset with future potential.'}</span><span className="milestone-buy">VIEW {choice.toUpperCase()} CARDS <span aria-hidden="true">↗</span></span></div>
              </button>
            );
          })}
        </div>
        <div className="milestone-footer"><span className="mono">NO PURCHASE REQUIRED // YOU CAN PASS</span><button type="button" className="milestone-skip" onClick={() => onAction({ type: 'SKIP_ASSET' })} data-testid="button-skip-asset">SKIP MILESTONE ↗</button></div>
      </section>
    );
    return (
      <section className="milestone-choice" aria-label={`${category} milestone choices`} data-testid={`section-milestone-${category}`}>
        <Header space={pending.space} eyebrow={`${category.toUpperCase()} MILESTONE`} title={titles[category] ?? 'Choose your'} description="Every purchase changes the run. Compare the cost, the immediate effects and the long game before you commit." />
        <div className="milestone-meta mono"><span>AVAILABLE WEALTH / <b>{formatMoney(player.wealth)}</b></span><span>{options.length} OPTIONS // ONE SLOT</span></div>
        <div className={`milestone-grid ${options.length === 2 ? 'two' : ''}`}>
          {options.map((asset, index) => <AssetCard key={asset.id} asset={asset} index={index} wealth={player.wealth} selected={selectedAsset === asset.id} onSelect={() => setSelectedAsset(asset.id)} onBuy={() => onAction({ type: 'BUY_ASSET', assetId: asset.id })} />)}
        </div>
        <div className="milestone-footer"><span className="mono">CAN'T AFFORD IT OR NOT THE RIGHT FIT? KEEP MOVING.</span><button type="button" className="milestone-skip" onClick={() => onAction({ type: 'SKIP_ASSET' })} data-testid="button-skip-asset">SKIP PURCHASE ↗</button></div>
      </section>
    );
  }

  if (pending.stage === 'choice') return (
    <section className="milestone-choice" aria-label="Career opportunity">
      <Header space={35} eyebrow="CAREER OPPORTUNITY" title="Stay the course." highlighted="Or switch." description="Your career is on the line. Keep your current role, or draw two new offers and rewrite your next payday." />
      <div className={`milestone-career-current ${currentCareer ? `career-${currentCareer.id}` : ''}`} data-category={currentCareer?.categoryId}><CareerGlyph icon={currentCareer?.icon ?? '◇'} /><div><span className="mono">CURRENT CAREER / {currentCareer ? getCategory(currentCareer.categoryId)?.name : 'UNASSIGNED'}</span><strong>{currentCareer?.name ?? 'Unassigned'}</strong><small>{currentCareer?.abilityName} · {SALARY_TIERS[player.salaryTier - 1]} · {formatMoney(player.salaryAmount)} salary</small></div></div>
      <div className="milestone-grid two">
        <button className="milestone-card milestone-option" type="button" onClick={() => onAction({ type: 'KEEP_CAREER' })} data-testid="button-keep-career"><div className="milestone-art" data-category="lifestyle"><span className="milestone-art-index">OPTION / 01</span><span className="milestone-art-symbol">=</span><span className="milestone-art-caption">STABILITY / LOCK IN</span></div><div className="milestone-card-body"><span className="mono">NO CHANGE TO SALARY OR WEALTH</span><h3>KEEP CAREER</h3><span className="milestone-card-desc">Stay with {currentCareer?.name ?? 'your current career'}. Your category, ability, salary and wealth remain intact.</span><span className="milestone-buy">LOCK IN CAREER <span aria-hidden="true">↗</span></span></div></button>
        <button className="milestone-card milestone-option" type="button" onClick={() => onAction({ type: 'SWITCH_CAREER' })} data-testid="button-switch-career"><div className="milestone-art" data-category="car"><span className="milestone-art-index">OPTION / 02</span><span className="milestone-art-symbol">↗</span><span className="milestone-art-caption">NEW PATH / TWO OFFERS</span></div><div className="milestone-card-body"><span className="mono">REPLACE YOUR CAREER</span><h3>SWITCH CAREER</h3><span className="milestone-card-desc">Reveal two new career offers. Your new salary tier will be drawn after you choose; existing wealth stays yours.</span><span className="milestone-buy">REVEAL OFFERS <span aria-hidden="true">↗</span></span></div></button>
      </div>
    </section>
  );

  if (pending.stage === 'offers') return (
    <section className="milestone-choice" aria-label="Career offers">
      <Header space={35} eyebrow="TWO OFFERS / ONE FUTURE" title="Pick your" highlighted="next move." description="New career. New ability. New salary roll. The wealth you've already built stays in your hands." />
      <div className="milestone-meta mono"><span>YOUR CURRENT ROLE / <b>{currentCareer?.name ?? 'UNASSIGNED'}</b></span><span>SELECT ONE CAREER</span></div>
      <div className="milestone-grid two">{pending.options?.map((id, index) => { const career = getCareer(id); return career ? <CareerCard key={id} career={career} index={index} onSelect={() => onAction({ type: 'SELECT_CAREER', careerId: id })} /> : null; })}</div>
    </section>
  );

  const selected = pending.selectedCareerId ? getCareer(pending.selectedCareerId) : currentCareer;
  return (
    <section className="milestone-choice" aria-label="New salary revealed" aria-live="polite">
      <Header space={35} eyebrow="SALARY REVEAL" title="New career." highlighted="New salary." description="The draw is locked. Your existing wealth carries forward, and future salary gates now use this figure." />
      <div className="milestone-salary">
        <div className="milestone-salary-feature"><span className="mono">REDLINE / NEW CAREER</span><div><CareerGlyph icon={selected?.icon ?? '◇'} /><h3>{selected?.name ?? 'Career selected'}</h3><span className="mono">{selected ? getCategory(selected.categoryId)?.name : ''} / {selected?.abilityName}</span></div></div>
        <div className={`milestone-salary-details salary-tier-${player.salaryTier}`}><span className="mono">SALARY TIER / {SALARY_TIERS[player.salaryTier - 1]}</span><strong data-testid="text-new-salary">{formatMoney(player.salaryAmount)}</strong><b>{SALARY_TIERS[player.salaryTier - 1]}</b><p>Existing wealth: {formatMoney(player.wealth)}. No new starting wealth is added.</p><button className="action lime-action" type="button" onClick={() => onAction({ type: 'ACKNOWLEDGE_CAREER' })} data-testid="button-acknowledge-career">CONTINUE RUN <span aria-hidden="true">↗</span></button></div>
      </div>
    </section>
  );
}