import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { AUTH_USER_UPDATED_EVENT, useAuth } from '@workspace/replit-auth-web';
import { getGetAchievementProfileQueryKey, useGetAchievementProfile, useUpdateCurrentProfile } from '@workspace/api-client-react';
import type { CompletedGameRecord } from '@workspace/api-client-react';
import type { AchievementCategory, AchievementDefinition } from '@/game/achievement-catalog';
import { achievementCatalog, achievementCategoryLabels } from '@/game/achievement-catalog';
import { assets, getAsset, type AssetDefinition } from '@/game/assets';
import { characters } from '@/game/characters';
import { AssetArtwork } from '@/components/asset-artwork';
import { AppShell } from '@/components/app-shell';
import { getProfileAssetTier, profileAssetTierOrder, profileAssetTierRank, type ProfileAssetTier } from '@/lib/profile-asset-tier';
import { useLocation } from 'wouter';
import { getPublicAssetUrl } from '@/lib/public-asset-url';
import { CreditEarningGuide } from '@/components/credit-earning-guide';
import './pages.css';

type ProfileTab = 'overview' | 'collection' | 'milestones' | 'history';
type CreditSummary = {
  wallet: {
    balance: number;
    lifetimeEarned: number;
    lifetimeSpent: number;
    achievementEarned: number;
    gameEarned: number;
    endgameEarned: number;
  } | null;
  transactions: { id: string; amount: number; type: string; sourceId: string; balanceAfter: number; createdAt: string }[];
};
type ProfileInventory = {
  items: { acquiredAt: string; item: { id: string; name: string; category: string; assetPath: string } }[];
  equipped: { slot: string; itemId: string | null }[];
};
type AchievementDisplay = Omit<AchievementDefinition, 'category'> & {
  category: AchievementCategory | 'SECRET';
  isSecret: boolean;
  progress: number;
  unlockedAt: string | null;
  unlockGameId: string | null;
  artwork?: string;
};

const categories = [...Object.keys(achievementCategoryLabels), 'SECRET'] as (AchievementCategory | 'SECRET')[];
const categoryLabels: Record<AchievementCategory | 'SECRET', string> = {
  ...achievementCategoryLabels,
  SECRET: 'Secret Milestones',
};
const dateLabel = (value: string | null | undefined) => value
  ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
  : '—';
const money = (value: number | undefined) => new Intl.NumberFormat(undefined, {
  style: 'currency', currency: 'USD', maximumFractionDigits: 0,
}).format(value ?? 0);
const titleCase = (value: string) => value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
const metricLabel = (value: string) => titleCase(value.replace(/([A-Z])/g, ' $1'));

export function ProfilePage() {
  const [, navigate] = useLocation();
  const { user, isLoading, login } = useAuth(import.meta.env.BASE_URL);
  const profileQuery = useGetAchievementProfile({ query: { enabled: !!user, queryKey: getGetAchievementProfileQueryKey() } });
  const updateProfile = useUpdateCurrentProfile();
  const profile = profileQuery.data;
  const [tab, setTab] = useState<ProfileTab>('overview');
  const [category, setCategory] = useState<AchievementCategory | 'SECRET'>('ASSET_COLLECTION');
  const [collectionFilter, setCollectionFilter] = useState<'all' | 'held' | 'ever'>('all');
  const [expandedGame, setExpandedGame] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [displayNameDraft, setDisplayNameDraft] = useState('');
  const [nameError, setNameError] = useState('');
  const [nameStatus, setNameStatus] = useState('');
  const [creditSummary, setCreditSummary] = useState<CreditSummary | null>(null);
  const [profileInventory, setProfileInventory] = useState<ProfileInventory | null>(null);

  useEffect(() => {
    if (!user) {
      setCreditSummary(null);
      return;
    }
    let active = true;
    fetch('/api/credits', { credentials: 'include' })
      .then(response => {
        if (!response.ok) throw new Error(`Credits request failed (${response.status}).`);
        return response.json() as Promise<CreditSummary>;
      })
      .then(data => { if (active) setCreditSummary(data); })
      .catch(() => { if (active) setCreditSummary({ wallet: null, transactions: [] }); });
    return () => { active = false; };
  }, [user?.id]);

  useEffect(() => {
    if (!user) { setProfileInventory(null); return; }
    let active = true;
    fetch('/api/inventory', { credentials: 'include' })
      .then(response => {
        if (!response.ok) throw new Error(`Inventory request failed (${response.status}).`);
        return response.json() as Promise<ProfileInventory>;
      })
      .then(data => { if (active) setProfileInventory(data); })
      .catch(() => { if (active) setProfileInventory(null); });
    return () => { active = false; };
  }, [user?.id]);
  const equippedLogoId = profileInventory?.equipped.find(item => item.slot === 'logo')?.itemId;
  const equippedLogo = profileInventory?.items.find(entry => entry.item.id === equippedLogoId)?.item;

  useEffect(() => {
    if (!isLoading && !user) login();
  }, [isLoading, user, login]);

  const name = user?.displayName?.trim() || (user ? [user.firstName, user.lastName].filter(Boolean).join(' ') : '');
  const achievementList = useMemo<AchievementDisplay[]>(() => {
    const progress = new Map((profile?.achievements ?? []).map(item => [item.achievementId, item]));
    return [
      ...achievementCatalog.map(item => {
        const row = progress.get(item.id);
        return {
          ...item,
          isSecret: false,
          progress: row?.progress ?? 0,
          unlockedAt: row?.unlockedAt ?? null,
          unlockGameId: row?.unlockGameId ?? null,
        };
      }),
      ...(profile?.achievements ?? []).filter(item => item.isSecret).map(item => ({
        id: item.achievementId,
        name: item.name ?? '???',
        description: item.description ?? '??? — SECRET MILESTONE',
        category: 'SECRET' as const,
        metric: '',
        target: 1,
        rarity: item.rarity ?? 'LEGENDARY',
        icon: '',
        creditReward: item.rewardCredits ?? 0,
        isSecret: true,
        progress: item.progress ?? 0,
        unlockedAt: item.unlockedAt,
        unlockGameId: item.unlockGameId,
        artwork: item.artwork,
      })),
    ];
  }, [profile?.achievements]);
  const collectionByAssetId = useMemo(() => new Map((profile?.collection ?? []).map(entry => [entry.assetId, entry])), [profile?.collection]);
  const allAssets = useMemo(() => assets
    .map(definition => ({ definition, profileTier: getProfileAssetTier(definition), record: collectionByAssetId.get(definition.id) }))
    .sort((a, b) => Number((b.record?.acquiredCount ?? 0) > 0) - Number((a.record?.acquiredCount ?? 0) > 0)
      || profileAssetTierRank[a.profileTier] - profileAssetTierRank[b.profileTier]
      || a.definition.name.localeCompare(b.definition.name)), [collectionByAssetId]);
  const collection = useMemo(() => allAssets
    .filter(({ record }) => collectionFilter === 'all' || (collectionFilter === 'held' ? (record?.retainedCount ?? 0) > 0 : (record?.acquiredCount ?? 0) > 0)), [allAssets, collectionFilter]);
  const collectionSections = useMemo(() => {
    const acquisitionGroups = collectionFilter === 'all'
      ? [
        { key: 'acquired', label: 'Acquired', items: collection.filter(({ record }) => (record?.acquiredCount ?? 0) > 0) },
        { key: 'not-acquired', label: 'Not yet acquired', items: collection.filter(({ record }) => (record?.acquiredCount ?? 0) === 0) },
      ]
      : [{
        key: collectionFilter,
        label: collectionFilter === 'held' ? 'Held at finish' : 'Acquired',
        items: collection,
      }];

    return acquisitionGroups.map(group => ({
      ...group,
      rarities: profileAssetTierOrder.map(rarity => ({
        rarity,
        items: group.items.filter(({ profileTier }) => profileTier === rarity),
      })).filter(group => group.items.length > 0),
    })).filter(group => group.rarities.length > 0);
  }, [collection, collectionFilter]);
  const uniqueCollected = allAssets.filter(({ record }) => (record?.acquiredCount ?? 0) > 0).length;
  const uniqueRetained = allAssets.filter(({ record }) => (record?.retainedCount ?? 0) > 0).length;
  const collectionCompletion = assets.length ? Math.round(uniqueCollected / assets.length * 100) : 0;
  const mostAcquired = [...allAssets].filter(({ record }) => (record?.acquiredCount ?? 0) > 0)
    .sort((a, b) => (b.record?.acquiredCount ?? 0) - (a.record?.acquiredCount ?? 0))[0];
  const mostRetained = [...allAssets].filter(({ record }) => (record?.retainedCount ?? 0) > 0)
    .sort((a, b) => (b.record?.retainedCount ?? 0) - (a.record?.retainedCount ?? 0))[0];
  const categoryAchievements = achievementList.filter(item => item.category === category);
  const unlocked = profile?.unlockedCount ?? 0;
  const total = profile?.totalCount ?? achievementCatalog.length + 25;
  const completedGames = profile?.history ?? [];
  const gamesPlayed = profile?.metrics.completedGames ?? completedGames.length;
  const gamesWon = profile?.metrics.wins ?? completedGames.filter(game => game.placement === 1).length;
  const winRate = gamesPlayed ? Math.round((gamesWon / gamesPlayed) * 100) : 0;
  const highestRetainedLevelByAsset = useMemo(() => {
    const levels = new Map<string, number>();
    for (const game of completedGames) {
      for (const retained of game.retainedAssets ?? []) {
        const level = Math.max(1, Math.min(4, retained.level || 1));
        levels.set(retained.assetId, Math.max(levels.get(retained.assetId) ?? 0, level));
      }
    }
    return levels;
  }, [completedGames]);
  const latestGame = useMemo(() => [...completedGames].sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0], [completedGames]);
  const latestAwards = useMemo(() => {
    const unlockedIds = new Set(latestGame?.unlockedAchievementIds ?? []);
    return achievementList.filter(achievement => unlockedIds.has(achievement.id) && achievement.unlockedAt);
  }, [latestGame, achievementList]);

  async function saveDisplayName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const displayName = displayNameDraft.trim();
    if (!displayName || displayName.length > 40) {
      setNameError('Enter a profile name between 1 and 40 characters.');
      return;
    }
    setNameError('');
    setNameStatus('');
    try {
      await updateProfile.mutateAsync({ data: { displayName } });
      window.dispatchEvent(new Event(AUTH_USER_UPDATED_EVENT));
      setIsEditingName(false);
      setNameStatus('Profile name saved.');
    } catch {
      setNameError('Could not save your profile name. Please try again.');
    }
  }

  function assetCard({ definition, profileTier, record }: (typeof collection)[number]) {
    const isCollected = (record?.acquiredCount ?? 0) > 0;
    const isEverRetained = (record?.retainedCount ?? 0) > 0;
    const highestRetainedLevel = isEverRetained ? Math.min(4, Math.max(1, highestRetainedLevelByAsset.get(definition.id) ?? 1)) : null;
    return <article className={`red-asset-card profile-tier-${profileTier.toLowerCase()} ${isCollected ? 'asset-collected' : ''} ${isEverRetained ? 'asset-retained' : 'asset-not-retained'}`} key={definition.id} aria-label={`${isEverRetained ? definition.name : 'Unknown asset'}, ${isEverRetained ? `retained at level ${highestRetainedLevel}` : isCollected ? 'collected but not retained' : 'locked'}`}>
      <div className="red-asset-art">{isEverRetained
        ? <AssetArtwork assetId={definition.id} level={highestRetainedLevel as 1 | 2 | 3 | 4} className="red-asset-image" alt={`${definition.name}, level ${highestRetainedLevel}`} />
        : <div className="red-asset-mystery" aria-label="Asset image appears after first retention"><span aria-hidden="true">?</span></div>}
        <span className={`red-rarity rarity-${profileTier.toLowerCase()}`}>{profileTier}</span><span className="red-asset-lock-state">{isEverRetained ? 'RETAINED' : isCollected ? 'COLLECTED / NOT RETAINED' : 'LOCKED'}</span></div>
      <div className="red-asset-copy"><span className="mono">{titleCase(definition.category)}</span><h3>{isEverRetained ? definition.name : '?'}</h3><p>{isEverRetained ? definition.description : 'Retain this asset through a completed game to reveal its identity.'}</p>
        {isEverRetained && <div className="red-asset-pricing"><span className="mono">BASE COST</span><strong>{money(definition.cost)}</strong></div>}
        <div className="red-asset-counts"><div><strong>{record?.acquiredCount ?? 0}</strong><span>ACQUIRED</span></div><div><strong>{record?.retainedCount ?? 0}</strong><span>RETAINED</span></div><div><strong>{record?.lostCount ?? 0}</strong><span>LOST</span></div></div>
        <div className="red-asset-level-info"><span className="mono">HIGHEST RETAINED LEVEL</span><strong>{highestRetainedLevel ? `LEVEL ${highestRetainedLevel}` : '—'}</strong></div>
        <dl className="red-asset-dates"><div><dt>Games acquired / retained</dt><dd>{record?.gamesAcquired ?? 0} / {record?.gamesRetained ?? 0}</dd></div><div><dt>First acquired / retained</dt><dd>{dateLabel(record?.firstAcquiredAt)} / {dateLabel(record?.firstRetainedAt)}</dd></div><div><dt>Last acquired / retained</dt><dd>{dateLabel(record?.lastAcquiredAt)} / {dateLabel(record?.lastRetainedAt)}</dd></div></dl>
      </div>
    </article>;
  }

  function achievementCard(item: AchievementDisplay) {
    const target = item.id === 'complete-asset-catalog' ? assets.length : item.target;
    const current = Math.min(target, Math.max(0, item.progress));
    const isUnlocked = !!item.unlockedAt;
    const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
    if (item.isSecret && !isUnlocked) {
      return (
        <article className="red-achievement is-locked is-secret" key={item.id} aria-label="Locked secret milestone">
          <div className="red-achievement-top"><div className="red-mystery-art" aria-hidden="true"><span>?</span></div><span className="red-tier">CLASSIFIED</span></div>
          <h3>??? — SECRET MILESTONE</h3>
          <p>Its identity and requirements remain hidden until earned.</p>
          <div className="red-secret-seal mono">SEALED / 0 DATA RELEASED</div>
        </article>
      );
    }
    return (
      <article className={`red-achievement ${isUnlocked ? 'is-unlocked' : 'is-locked'} ${item.isSecret ? `is-secret tier-card-${item.rarity.toLowerCase()}` : ''}`} key={item.id}>
        <div className="red-achievement-top">
          {item.isSecret && item.artwork
            ? <img className="red-secret-art" src={item.artwork} alt={`${item.rarity} milestone emblem`} />
            : <span className="red-achievement-glyph" aria-hidden="true">{isUnlocked ? '✓' : '—'}</span>}
          <span className={`red-tier tier-${item.rarity.toLowerCase()}`}>{item.rarity}</span>
        </div>
        <h3>{item.name}</h3>
        <p>{item.description}</p>
        {!item.isSecret && <div className="red-progress-line" role="progressbar" aria-label={`${item.name} progress`} aria-valuenow={current} aria-valuemin={0} aria-valuemax={target}>
          <span style={{ width: `${pct}%` }} />
        </div>}
        <div className="red-achievement-foot">
          <span>{item.isSecret ? 'SECRET / REVEALED' : `${current.toLocaleString()} / ${target.toLocaleString()}`}</span>
          <span>{isUnlocked ? `UNLOCKED ${dateLabel(item.unlockedAt)} / GAME ${item.unlockGameId ?? '—'}` : 'LOCKED'}</span>
        </div>
        <div className="red-reward">{item.creditReward} credits <small>REWARD TIER</small></div>
      </article>
    );
  }

  return (
    <AppShell>
      <main className="red-profile-main" data-testid="panel-profile">
        {isLoading || !user ? <div className="red-profile-loading" role="status"><span className="red-skeleton red-skeleton-title" /><span className="red-skeleton" />Redirecting to sign-in…</div> : (
          <>
            <header className="red-profile-hero">
              <div className="red-profile-identity">
                <div className="eyebrow">PLAYER RECORD / ACCOUNT-BOUND</div>
                <h1 className="display">THE<br /><span className="title-outline">LONG GAME</span></h1>
                <div className="red-profile-user">
                  {user.profileImageUrl ? <img className="profile-avatar" src={user.profileImageUrl} alt="" /> : <div className="red-avatar-fallback" aria-hidden="true">{(name || 'R').slice(0, 1).toUpperCase()}</div>}
                  <div className="red-profile-identity-copy">
                    <strong data-testid="text-profile-name">{name || 'Player'}</strong>
                    <span aria-label="Sign-in email, read only">{user.email ?? 'Account email unavailable'} · READ ONLY</span>
                    {isEditingName ? (
                      <form className="red-profile-name-form" onSubmit={saveDisplayName}>
                        <label htmlFor="profile-display-name">Profile name</label>
                        <input
                          id="profile-display-name"
                          value={displayNameDraft}
                          onChange={event => setDisplayNameDraft(event.target.value)}
                          maxLength={40}
                          autoComplete="nickname"
                          required
                        />
                        {nameError && <span className="red-profile-name-error" role="alert">{nameError}</span>}
                        <div className="red-profile-name-actions">
                          <button className="action lime-action" type="submit" disabled={updateProfile.isPending}>{updateProfile.isPending ? 'Saving…' : 'Save name'}</button>
                          <button className="text-link" type="button" disabled={updateProfile.isPending} onClick={() => { setIsEditingName(false); setNameError(''); }}>Cancel</button>
                        </div>
                      </form>
                    ) : (
                      <div className="red-profile-name-actions">
                        <button className="text-link" type="button" onClick={() => { setDisplayNameDraft(name); setNameError(''); setNameStatus(''); setIsEditingName(true); }}>Edit name</button>
                        {nameStatus && <span className="red-profile-name-status" role="status">{nameStatus}</span>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="red-profile-stamp">
                <div className="red-profile-logo" aria-label={equippedLogo ? `Equipped logo: ${equippedLogo.name}` : 'Default logo equipped'}>
                  {equippedLogo ? <img src={getPublicAssetUrl(equippedLogo.assetPath)} alt="" /> : <span>DEFAULT<br />MARK</span>}
                </div>
                <span className="mono">PERMANENT RECORD</span>
                <strong>{String(unlocked).padStart(2, '0')}<i>/{String(total).padStart(2, '0')}</i></strong>
                <span className="mono">MILESTONES SECURED</span>
                <div className="red-stamp-rule" />
                <span className="red-account-id mono">ID · {user.id}</span>
              </div>
            </header>

            <nav className="red-profile-nav" aria-label="Profile sections">
              {([['overview', 'Overview'], ['collection', 'Asset record'], ['milestones', 'Milestones'], ['history', 'Game history']] as const).map(([id, label], index) => (
                <button key={id} type="button" className={tab === id ? 'active' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>
                  <span>0{index + 1}</span>{label}
                </button>
              ))}
            </nav>

            {profileQuery.isLoading ? (
              <section className="red-loading-grid" aria-label="Loading profile data" aria-busy="true">
                {Array.from({ length: 4 }, (_, index) => <div className="red-skeleton-card" key={index}><span className="red-skeleton" /><span className="red-skeleton" /><span className="red-skeleton" /></div>)}
              </section>
            ) : profileQuery.isError ? (
              <section className="red-state-card" role="alert"><span className="eyebrow">RECORD UNAVAILABLE</span><h2>Could not load your profile.</h2><p>Your sign-in is still active. Try requesting the record again.</p><button className="action lime-action" type="button" onClick={() => profileQuery.refetch()}>Retry profile load</button></section>
            ) : !profile ? (
              <section className="red-state-card"><span className="eyebrow">NO PROFILE RECORD</span><h2>No progression record yet.</h2><p>Completed games will appear here when the server has a record for this account.</p></section>
            ) : (
              <div className="red-profile-content">
                {latestAwards.length > 0 && latestGame && <section className="red-award-notice" aria-labelledby="red-award-title">
                  <div className="red-award-signal" aria-hidden="true">+</div>
                  <div className="red-award-copy"><span className="mono">LATEST MATCH / {dateLabel(latestGame.completedAt)} / {titleCase(latestGame.mode)}</span><h2 id="red-award-title">{latestAwards.length === 1 ? 'New milestone secured.' : `${latestAwards.length} new milestones secured.`}</h2>
                    <ul>{latestAwards.map(award => <li key={award.id}><strong>{award.name}</strong><span>{award.description}</span></li>)}</ul>
                  </div>
                  <button type="button" className="red-award-link" onClick={() => setTab('milestones')}>View milestone record <span aria-hidden="true">↗</span></button>
                </section>}
                {tab === 'overview' && (
                  <>
                    <section className="red-overview-grid">
                      <div className="red-section-heading"><span className="eyebrow">PLAYER PERFORMANCE</span><h2>Performance<br />stats.</h2><p>Completed games, first-place finishes, win rate, and best final value across Standard and Bio matches.</p></div>
                      <div className="red-metrics-grid">
                        {[
                          ['GAMES PLAYED', gamesPlayed],
                          ['GAMES WON', gamesWon],
                          ['WIN RATE', `${winRate}%`],
                          ['BEST FINAL VALUE', money(profile.metrics.highestFinalValue)],
                        ].map(([label, value], index) => <div className="red-metric" key={label}><span className="mono">0{index + 1} / {label}</span><strong>{value}</strong></div>)}
                      </div>
                      <div className="red-wallet-actions">
                        <button className="red-inline-link" type="button" onClick={() => navigate('/shop')}>Black Market ↗</button>
                        <button className="red-inline-link" type="button" onClick={() => navigate('/inventory')}>Inventory ↗</button>
                      </div>
                    </section>
                    <section className="red-overview-grid">
                      <div className="red-section-heading"><span className="eyebrow">REDLINE CREDITS</span><h2>Wallet<br />ledger.</h2><p>Credits earned through completed games, endgame results, and milestones.</p></div>
                      <div className="red-metrics-grid">
                        {[
                          ['AVAILABLE', creditSummary?.wallet?.balance.toLocaleString() ?? (creditSummary ? 'UNAVAILABLE' : '…')],
                          ['LIFETIME EARNED', creditSummary?.wallet?.lifetimeEarned.toLocaleString() ?? '—'],
                          ['LIFETIME SPENT', creditSummary?.wallet?.lifetimeSpent.toLocaleString() ?? '—'],
                          ['MILESTONE EARNED', creditSummary?.wallet?.achievementEarned.toLocaleString() ?? '—'],
                          ['GAME EARNED', creditSummary?.wallet?.gameEarned.toLocaleString() ?? '—'],
                          ['ENDGAME EARNED', creditSummary?.wallet?.endgameEarned.toLocaleString() ?? '—'],
                        ].map(([label, value], index) => <div className="red-metric" key={label}><span className="mono">0{index + 1} / {label}</span><strong>{value}</strong></div>)}
                      </div>
                      <CreditEarningGuide />
                    </section>
                    <section className="red-credit-ledger">
                      <div className="red-section-bar"><div><span className="eyebrow">LATEST CREDIT ACTIVITY</span><h2>Wallet transactions</h2></div></div>
                      {creditSummary?.transactions?.length ? <div className="red-credit-rows">{creditSummary.transactions.slice(0, 8).map(transaction => (
                        <div className="red-credit-row" key={transaction.id}>
                          <span className="mono">{titleCase(transaction.type)} · {dateLabel(transaction.createdAt)}</span>
                          <strong className={transaction.amount < 0 ? 'spent' : 'earned'}>{transaction.amount > 0 ? '+' : ''}{transaction.amount.toLocaleString()} ◈</strong>
                          <span className="mono">BALANCE {transaction.balanceAfter.toLocaleString()}</span>
                        </div>
                      ))}</div> : <EmptyState title="No Credits activity yet" text="Completed-game and milestone rewards will appear here." />}
                    </section>
                    <section className="red-latest">
                      <div className="red-section-bar"><div><span className="eyebrow">LATEST RESULT</span><h2>From the table</h2></div><button className="red-inline-link" type="button" onClick={() => setTab('history')}>All game records <span aria-hidden="true">↗</span></button></div>
                      {completedGames.length ? (() => {
                        const game = completedGames[0];
                        const character = characters.find(item => item.id === game.characterId);
                        const key = `overview-${game.id}`;
                        return <article className="red-game-card">
                          <div className="red-game-summary">
                            <div className="red-game-date"><span className="mono">{dateLabel(game.completedAt)}</span><strong>{game.placement === 1 ? 'VICTORY' : `PLACE ${game.placement}`}</strong></div>
                            <div className="red-game-main"><span className="mono">{titleCase(game.boardId)} / {titleCase(game.mode)} / {game.source}</span><h3>{character?.name ?? titleCase(game.characterId)}</h3><span className="mono">CAREER · {game.careerId ? titleCase(game.careerId) : 'NONE RECORDED'} · GAME {game.gameId}</span></div>
                            <div className="red-game-values"><span className="mono">FINAL VALUE</span><strong>{money(game.finalValue)}</strong><span className="mono">PORTFOLIO {money(game.portfolioValue)}</span></div>
                            <button className="red-expand" type="button" aria-expanded={expandedGame === key} onClick={() => setExpandedGame(expandedGame === key ? null : key)}>{expandedGame === key ? 'Close details' : 'View details'}</button>
                          </div>
                          {expandedGame === key && <GameDetails game={game} achievements={achievementList} />}
                        </article>;
                      })() : <EmptyState title="No completed games" text="There are no completed Standard or Bio match records for this account yet." />}
                    </section>
                    <section className="red-metric-ledger"><div className="red-section-bar"><div><span className="eyebrow">SERVER METRICS</span><h2>Progress ledger</h2></div></div><div className="red-ledger-grid">{Object.entries(profile.metrics).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => <div key={key}><span className="mono">{metricLabel(key)}</span><strong>{value.toLocaleString()}</strong></div>)}</div></section>
                  </>
                )}
                {tab === 'collection' && (
                  <section className="red-tab-section">
                    <div className="red-section-bar"><div><span className="eyebrow">YOUR ASSET RECORD</span><h2>Asset archive</h2><p className="red-section-copy">Acquired assets appear first, then sort from the Standard tier up to Elite. Artwork appears after an asset is retained through a completed game.</p></div>
                      <div className="red-filter-set" role="group" aria-label="Filter asset collection">{([['all', 'Full catalog'], ['ever', 'Acquired'], ['held', 'Held at finish']] as const).map(([value, label]) => <button key={value} type="button" className={collectionFilter === value ? 'selected' : ''} aria-pressed={collectionFilter === value} onClick={() => setCollectionFilter(value)}>{label}</button>)}</div>
                    </div>
                    <div className="red-collection-summary" aria-label="Lifetime asset collection summary">
                      <div><span className="mono">TOTAL ACQUIRED</span><strong>{(profile.metrics.assetsAcquired ?? 0).toLocaleString()}</strong></div>
                      <div><span className="mono">UNIQUE COLLECTED</span><strong>{uniqueCollected} / {assets.length}</strong></div>
                      <div><span className="mono">UNIQUE HELD AT ENDGAME</span><strong>{profile.metrics.uniqueAssetsRetained ?? uniqueRetained}</strong></div>
                      <div><span className="mono">ASSETS LOST</span><strong>{(profile.metrics.assetsLost ?? 0).toLocaleString()}</strong></div>
                      <div><span className="mono">COLLECTION COMPLETE</span><strong>{collectionCompletion}%</strong></div>
                      <div><span className="mono">GAMES WITH RETENTION</span><strong>{(profile.metrics.gamesHeldAssets ?? 0).toLocaleString()}</strong></div>
                    </div>
                    <div className="red-collection-highlights">
                      <p><span className="mono">MOST ACQUIRED</span><strong>{mostAcquired ? (mostAcquired.record?.retainedCount ? `${mostAcquired.definition.name} × ${mostAcquired.record.acquiredCount}` : `? × ${mostAcquired.record?.acquiredCount ?? 0}`) : 'No acquisitions yet'}</strong></p>
                      <p><span className="mono">MOST RETAINED</span><strong>{mostRetained ? `${mostRetained.definition.name} × ${mostRetained.record?.retainedCount ?? 0}` : 'No retained assets yet'}</strong></p>
                      <p><span className="mono">BEST ENDGAME PORTFOLIO</span><strong>{money(profile.metrics.highestAssetPortfolio)}</strong></p>
                    </div>
                    {collection.length ? <div className="red-asset-record-groups">
                      {collectionSections.map(section => <details className="red-asset-acquisition-group" key={section.key} aria-label={`${section.label} assets`} open>
                        <summary className="red-asset-group-heading"><h3>{section.label}</h3><span>{section.rarities.reduce((count, group) => count + group.items.length, 0)} assets</span></summary>
                        {section.rarities.map(group => <section className="red-asset-rarity-group" key={`${section.key}-${group.rarity}`}>
                          <div className="red-asset-rarity-heading"><h4>{titleCase(group.rarity)} rarity</h4><span>{group.items.length}</span></div>
                          <div className="red-assets-grid">{group.items.map(assetCard)}</div>
                        </section>)}
                      </details>)}
                    </div> : <EmptyState title={collectionFilter === 'held' ? 'Nothing held at finish' : 'No acquired assets'} text={collectionFilter === 'held' ? 'No asset records show endgame retention yet. The full catalog remains available under Full catalog.' : 'No asset records show acquisitions for this account yet.'} />}
                  </section>
                )}
                {tab === 'milestones' && (
                  <section className="red-tab-section">
                    <div className="red-section-bar"><div><span className="eyebrow">{profile.standardCount} STANDARD / {profile.secretCount} SECRET / {profile.totalCount} TOTAL MILESTONES</span><h2>Milestone progress</h2><p className="red-section-copy">Track progress from completed games. Secret milestones stay hidden until earned. Credits are paid once when a milestone first unlocks.</p></div></div>
                    <div className="red-category-layout">
                      <nav className="red-category-nav" aria-label="Milestone categories">{categories.map((item, index) => {
                        const categoryDefs = achievementList.filter(def => def.category === item);
                        const categoryUnlocked = categoryDefs.filter(def => !!def.unlockedAt).length;
                        return <button key={item} type="button" className={category === item ? 'selected' : ''} aria-current={category === item ? 'true' : undefined} onClick={() => setCategory(item)}><span>0{index + 1}</span><b>{categoryLabels[item]}</b><small>{categoryUnlocked}/{categoryDefs.length}</small></button>;
                      })}</nav>
                      <div className="red-category-content"><div className="red-category-title"><span className="mono">{categoryLabels[category]}</span><strong>{categoryAchievements.filter(item => !!item.unlockedAt).length} <i>/ {categoryAchievements.length} SECURED</i></strong></div><div className="red-achievements-grid">{categoryAchievements.map(achievementCard)}</div></div>
                    </div>
                  </section>
                )}
                {tab === 'history' && (
                  <section className="red-tab-section">
                    <div className="red-section-bar"><div><span className="eyebrow">COMPLETED MATCH RECORDS</span><h2>The runs that count.</h2><p className="red-section-copy">Standard and Bio results shown from account history; each match preserves its own final asset snapshot.</p></div><span className="red-history-count mono">{completedGames.length} RECORDS</span></div>
                    {completedGames.length ? <div className="red-history-list">{completedGames.map((game, index) => {
                      const character = characters.find(item => item.id === game.characterId);
                      const key = game.id;
                      return <article className="red-game-card" key={game.id}>
                        <div className="red-game-summary">
                          <div className="red-game-date"><span className="mono">RUN {String(completedGames.length - index).padStart(3, '0')}</span><strong>{game.placement === 1 ? 'VICTORY' : `PLACE ${game.placement}`}</strong></div>
                          <div className="red-game-main"><span className="mono">{dateLabel(game.completedAt)} / {game.source} / {titleCase(game.boardId)}</span><h3>{character?.name ?? titleCase(game.characterId)}</h3><span className="mono">{titleCase(game.mode)} · GAME {game.gameId} · BOARD {game.boardId}</span></div>
                          <div className="red-game-values"><span className="mono">FINAL VALUE</span><strong>{money(game.finalValue)}</strong><span className="mono">PORTFOLIO {money(game.portfolioValue)}</span></div>
                          <button className="red-expand" type="button" aria-expanded={expandedGame === key} onClick={() => setExpandedGame(expandedGame === key ? null : key)}>{expandedGame === key ? 'Close details' : 'Match details'}</button>
                        </div>
                        {expandedGame === key && <GameDetails game={game} achievements={achievementList} />}
                      </article>;
                    })}</div> : <EmptyState title="No completed games" text="Your completed matches will be recorded here. No history has been returned for this account." />}
                  </section>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </AppShell>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="red-empty-state"><span className="red-empty-mark" aria-hidden="true">—</span><div><h3>{title}</h3><p>{text}</p></div></div>;
}

function GameDetails({ game, achievements }: { game: CompletedGameRecord; achievements: AchievementDisplay[] }) {
  const stats = Object.entries(game.finalStats).sort(([a], [b]) => a.localeCompare(b));
  const acquired = game.acquiredAssetIds.map(id => getAsset(id)).filter((item): item is NonNullable<typeof item> => !!item);
  const lost = game.lostAssetIds.map(id => getAsset(id)).filter((item): item is NonNullable<typeof item> => !!item);
  const unlocked = game.unlockedAchievementIds.map(id => achievements.find(item => item.id === id)).filter((item): item is AchievementDisplay => !!item && !!item.unlockedAt);
  return <div className="red-game-details">
    <div className="red-game-detail-grid">
      <div><span className="mono">FINAL STATS</span>{stats.length ? <dl className="red-stat-list">{stats.map(([key, value]) => <div key={key}><dt>{metricLabel(key)}</dt><dd>{value.toLocaleString()}</dd></div>)}</dl> : <p>No final stats recorded.</p>}</div>
      <div><span className="mono">ASSETS ACQUIRED</span><p>{acquired.length ? acquired.map(item => item.name).join(' / ') : 'None recorded'}</p></div>
      <div><span className="mono">ASSETS LOST</span><p>{lost.length ? lost.map(item => item.name).join(' / ') : 'None recorded'}</p></div>
      <div><span className="mono">MILESTONES RECORDED</span><p>{unlocked.length ? unlocked.map(item => item.name).join(' / ') : 'None recorded'}</p></div>
    </div>
    <div className="red-snapshot-head"><span className="mono">ENDGAME SNAPSHOT / HELD AT FINISH</span><span className="mono">{game.retainedAssets.length} ASSETS</span></div>
    {game.retainedAssets.length ? <div className="red-snapshot-grid">{game.retainedAssets.map(item => {
      const definition = getAsset(item.assetId);
      if (!definition) return null;
      return <div className="red-snapshot-asset" key={`${item.assetId}-${item.level}`}><div><AssetArtwork assetId={item.assetId} level={Math.max(1, Math.min(4, item.level)) as 1 | 2 | 3 | 4} className="red-snapshot-image" alt={definition.name} /></div><span>{definition.name}</span><small>LEVEL {item.level}</small></div>;
    })}</div> : <p className="red-no-snapshot">No retained assets recorded at endgame.</p>}
  </div>;
}
