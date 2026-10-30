import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@workspace/replit-auth-web';
import { AppShell } from '@/components/app-shell';
import { getPublicAssetUrl } from '@/lib/public-asset-url';
import './pages.css';

type CatalogItem = { id: string; name: string; category: 'LOGO' | 'DRIVER_SKIN'; rarity: string; price: number; assetPath: string; characterId: string | null };
type Wallet = { balance: number; lifetimeEarned: number; lifetimeSpent: number; achievementEarned: number; gameEarned: number; endgameEarned: number };
type CatalogResponse = { items: CatalogItem[]; ownedItemIds: string[]; equipped: { slot: string; itemId: string | null }[] };
type InventoryResponse = { items: { acquiredAt: string; item: CatalogItem }[]; equipped: { slot: string; itemId: string | null }[] };
const money = (value: number) => value.toLocaleString();
const characterName = (id: string | null) => id ? id.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';
const rarityRank: Record<string, number> = { MYTHIC: 0, LEGENDARY: 1, EPIC: 2, RARE: 3, UNCOMMON: 4, COMMON: 5 };

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) throw new Error(`Request failed (${response.status}).`);
  return response.json() as Promise<T>;
}

function MarketNav({ current }: { current: 'shop' | 'inventory' }) {
  const [, navigate] = useLocation();
  return <nav className="market-nav" aria-label="Marketplace">
    <button className={current === 'shop' ? 'selected' : ''} onClick={() => navigate('/shop')}>BLACK MARKET</button>
    <button className={current === 'inventory' ? 'selected' : ''} onClick={() => navigate('/inventory')}>INVENTORY</button>
    <button className="market-profile-link" onClick={() => navigate('/profile')}>PROFILE ↗</button>
  </nav>;
}

export function ShopPage() {
  const { user, isLoading, login } = useAuth(import.meta.env.BASE_URL);
  const [, navigate] = useLocation();
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [category, setCategory] = useState<'LOGO' | 'DRIVER_SKIN'>('DRIVER_SKIN');
  const [selected, setSelected] = useState<CatalogItem | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const [nextCatalog, creditResponse] = await Promise.all([
      getJson<CatalogResponse>('/api/shop/catalog'),
      getJson<{ wallet: Wallet }>('/api/credits'),
    ]);
    setCatalog(nextCatalog);
    setWallet(creditResponse.wallet);
  }, []);
  useEffect(() => {
    if (!user) return;
    load().catch(() => setError('The market could not load. Please retry.'));
  }, [user, load]);
  useEffect(() => { if (!isLoading && !user) login(); }, [isLoading, user, login]);
  const owned = new Set(catalog?.ownedItemIds ?? []);
  const equipped = new Set((catalog?.equipped ?? []).map(row => row.itemId).filter(Boolean));
  const items = useMemo(() => (catalog?.items.filter(item => item.category === category) ?? [])
    .sort((a, b) => Number(owned.has(b.id)) - Number(owned.has(a.id))
      || (rarityRank[a.rarity] ?? 99) - (rarityRank[b.rarity] ?? 99)
      || a.name.localeCompare(b.name)), [catalog, category]);

  async function buy(item: CatalogItem) {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/shop/purchase', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id }),
      });
      const result = await response.json() as { balance?: number; error?: string; kind?: string };
      if (!response.ok) {
        setError(result.kind === 'insufficient' ? `You need ${money(item.price - (result.balance ?? wallet?.balance ?? 0))} more Credits.` : result.error ?? 'Purchase could not be completed.');
        return;
      }
      setWallet(current => current ? { ...current, balance: result.balance ?? current.balance } : current);
      setNotice(`${item.name} added to your Inventory.`);
      setSelected(null);
      await load();
    } catch {
      setError('Purchase could not be completed. Your balance has not been changed.');
    } finally {
      setBusy(false);
    }
  }

  async function equipItem(item: CatalogItem, remove = false) {
    const slot = item.category === 'LOGO' ? 'logo' : `skin:${item.characterId}`;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/inventory/equip', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot, itemId: remove ? null : item.id }),
      });
      if (!response.ok) throw new Error('Could not update equipment.');
      setNotice(remove ? `${item.name} unequipped.` : `${item.name} equipped.`);
      await load();
    } catch {
      setError('Could not update equipment.');
    } finally {
      setBusy(false);
    }
  }

  return <AppShell>
    <main className="market-page">
      <header className="market-hero">
        <div>
          <span className="market-kicker">REDLINE // PRIVATE EXCHANGE</span>
          <h1>BLACK<br /><span>MARKET</span></h1>
          <p>Rare identities change hands here. Credits earned in completed games are the only currency.</p>
        </div>
        <aside className="market-wallet"><span>AVAILABLE CREDITS</span><strong>◈ {wallet ? money(wallet.balance) : '—'}</strong><button onClick={() => navigate('/inventory')}>VIEW INVENTORY ↗</button></aside>
      </header>
      <MarketNav current="shop" />
      <section className="market-section">
        <div className="market-section-heading"><div><span className="market-kicker">THE COLLECTION</span><h2>Choose your mark.</h2><p className="market-sort-note">UNLOCKED FIRST · THEN HIGHEST RARITY</p></div>
          <div className="market-filters" role="group" aria-label="Shop category">
            <button className={category === 'LOGO' ? 'selected' : ''} onClick={() => setCategory('LOGO')}>LOGOS</button>
            <button className={category === 'DRIVER_SKIN' ? 'selected' : ''} onClick={() => setCategory('DRIVER_SKIN')}>DRIVER SKINS</button>
          </div>
        </div>
        {error && <div className="market-alert" role="alert">{error}<button onClick={() => { setError(''); load().catch(() => setError('The market could not load.')); }}>Retry</button></div>}
        {notice && <div className="market-success" role="status">{notice}<button onClick={() => navigate('/inventory')}>Open Inventory ↗</button><button aria-label="Dismiss" onClick={() => setNotice('')}>×</button></div>}
        {!catalog && !error ? <div className="market-empty">Opening secure exchange…</div> : !items.length ? <div className="market-empty">No items in this category.</div> : (
          <div className="market-grid">
            {items.map(item => {
              const isOwned = owned.has(item.id);
              const isEquipped = equipped.has(item.id);
              return <article className={`market-item rarity-${item.rarity.toLowerCase()}`} key={item.id}>
                <div className="market-art"><img src={getPublicAssetUrl(item.assetPath)} alt={item.name} loading="lazy" /><span className="market-rarity">{item.rarity}</span></div>
                <div className="market-item-copy"><span className="market-kicker">{item.category === 'LOGO' ? 'PLAYER LOGO' : characterName(item.characterId)}</span><h3>{item.name}</h3>
                  <div className="market-item-meta"><span>{item.price === 0 ? 'FREE' : `◈ ${money(item.price)}`}</span><span>{isEquipped ? 'EQUIPPED' : isOwned ? 'OWNED' : 'AVAILABLE'}</span></div>
                </div>
                {isOwned
                  ? <><button className="market-buy" disabled={busy || isEquipped} onClick={() => equipItem(item)}>{isEquipped ? 'EQUIPPED' : 'EQUIP'}</button>
                    {isEquipped && <button className="market-unequip" disabled={busy} onClick={() => equipItem(item, true)}>UNEQUIP</button>}</>
                  : <button className="market-buy" disabled={busy || (item.price > 0 && (!wallet || wallet.balance < item.price))} onClick={() => { setError(''); setSelected(item); }}>
                    {item.price === 0 ? 'UNLOCK FREE' : (wallet && wallet.balance < item.price) ? 'INSUFFICIENT CREDITS' : 'BUY'}
                  </button>}
              </article>;
            })}
          </div>
        )}
      </section>
      <section className="market-coming"><div><span className="market-kicker">IN DEVELOPMENT</span><h2>Pawn skins and board cosmetics</h2><p>Pawn skins and board cosmetics are in development.</p></div><span className="market-coming-badge">IN DEVELOPMENT</span></section>
      <section className="market-coming market-credit-coming"><div><span className="market-kicker">FUTURE PAYMENT OPTIONS</span><h2>Get more Credits</h2><p>Credit bundles are not available yet. No payment is taken and no Credits are granted here.</p></div><span className="market-coming-badge">COMING SOON</span></section>
      {selected && <div className="market-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !busy) setSelected(null); }}>
        <section className="market-modal" role="dialog" aria-modal="true" aria-labelledby="market-confirm-title">
          <button className="market-modal-close" onClick={() => setSelected(null)} aria-label="Close purchase confirmation">×</button>
          <img src={getPublicAssetUrl(selected.assetPath)} alt={selected.name} />
          <span className="market-kicker">{selected.price === 0 ? 'FREE UNLOCK' : 'PURCHASE CONFIRMATION'} · {selected.rarity}</span><h2 id="market-confirm-title">{selected.name}</h2>
          <p>{selected.category === 'LOGO' ? 'Player logo' : `${characterName(selected.characterId)} driver skin`}</p>
          <div className="market-confirm-price"><span>PRICE</span><strong>{selected.price === 0 ? 'FREE' : `◈ ${money(selected.price)}`}</strong><span>REMAINING</span><strong>◈ {money(Math.max(0, (wallet?.balance ?? 0) - selected.price))}</strong></div>
          <button className="market-buy market-confirm-button" disabled={busy || (selected.price > 0 && (!wallet || wallet.balance < selected.price))} onClick={() => buy(selected)}>{busy ? 'PROCESSING…' : selected.price === 0 ? 'UNLOCK FREE' : 'CONFIRM PURCHASE'}</button>
          <button className="market-cancel" disabled={busy} onClick={() => setSelected(null)}>CANCEL</button>
        </section>
      </div>}
    </main>
  </AppShell>;
}

export function InventoryPage() {
  const { user, isLoading, login } = useAuth(import.meta.env.BASE_URL);
  const [, navigate] = useLocation();
  const [data, setData] = useState<InventoryResponse | null>(null);
  const [category, setCategory] = useState('ALL');
  const [character, setCharacter] = useState('ALL');
  const [rarity, setRarity] = useState('ALL');
  const [equippedFilter, setEquippedFilter] = useState('ALL');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => getJson<InventoryResponse>('/api/inventory').then(setData), []);
  useEffect(() => { if (user) load().catch(() => setError('Inventory could not load.')); }, [user, load]);
  useEffect(() => { if (!isLoading && !user) login(); }, [isLoading, user, login]);
  const filtered = (data?.items ?? []).filter(({ item }) =>
    (category === 'ALL' || item.category === category)
    && (character === 'ALL' || item.characterId === character)
    && (rarity === 'ALL' || item.rarity === rarity)
    && (equippedFilter === 'ALL' || (equippedFilter === 'EQUIPPED' ? data?.equipped.some(row => row.itemId === item.id) : !data?.equipped.some(row => row.itemId === item.id))),
  );
  const characters = [...new Set((data?.items ?? []).map(({ item }) => item.characterId).filter((id): id is string => Boolean(id)))].sort();
  const equippedItems = (data?.items ?? []).filter(({ item }) => data?.equipped.some(row => row.itemId === item.id));
  async function equip(item: CatalogItem, remove = false) {
    const slot = item.category === 'LOGO' ? 'logo' : `skin:${item.characterId}`;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/inventory/equip', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot, itemId: remove ? null : item.id }),
      });
      if (!response.ok) throw new Error('Could not update equipment.');
      setNotice(remove ? `${item.name} unequipped.` : `${item.name} equipped.`);
      await load();
    } catch { setError('Could not update equipment.'); }
    finally { setBusy(false); }
  }

  return <AppShell><main className="market-page inventory-page">
    <header className="market-hero inventory-hero"><div><span className="market-kicker">REDLINE // PERSONAL VAULT</span><h1>YOUR<br /><span>INVENTORY</span></h1><p>Owned cosmetics only. Your choices stay with your account.</p></div>
      <aside className="market-wallet"><span>OWNED ITEMS</span><strong>{data?.items.length ?? '—'}</strong><button onClick={() => navigate('/shop')}>RETURN TO MARKET ↗</button></aside>
    </header>
    <MarketNav current="inventory" />
    <section className="market-section">
      <div className="market-section-heading"><div><span className="market-kicker">ACCOUNT-BOUND COSMETICS</span><h2>Equipment locker.</h2></div><div className="market-filters"><button onClick={() => navigate('/shop')}>BROWSE MARKET ↗</button></div></div>
      <section className="market-equipped" aria-labelledby="market-equipped-title">
        <div><span className="market-kicker">ACTIVE LOADOUT</span><h3 id="market-equipped-title">Currently equipped</h3></div>
        <div className="market-equipped-items">
          <div className="market-equipped-card">
            {equippedItems.find(({ item }) => item.category === 'LOGO')
              ? <img src={getPublicAssetUrl(equippedItems.find(({ item }) => item.category === 'LOGO')!.item.assetPath)} alt="" />
              : <span className="market-default-mark">RL</span>}
            <span><small>PLAYER LOGO</small><strong>{equippedItems.find(({ item }) => item.category === 'LOGO')?.item.name ?? 'Default Redline logo'}</strong></span>
          </div>
          {equippedItems.filter(({ item }) => item.category === 'DRIVER_SKIN').map(({ item }) => (
            <div className="market-equipped-card" key={item.id}><img src={getPublicAssetUrl(item.assetPath)} alt="" /><span><small>{characterName(item.characterId)}</small><strong>{item.name}</strong></span></div>
          ))}
          {!equippedItems.some(({ item }) => item.category === 'DRIVER_SKIN') && <span className="market-equipped-empty">No driver skin equipped</span>}
        </div>
      </section>
      {notice && <div className="market-success" role="status">{notice}<button onClick={() => setNotice('')}>×</button></div>}
      {error && <div className="market-alert" role="alert">{error}<button onClick={() => load().catch(() => setError('Inventory could not load.'))}>Retry</button></div>}
      <div className="inventory-filters">
        <label>Category<select value={category} onChange={e => setCategory(e.target.value)}><option value="ALL">All</option><option value="LOGO">Logos</option><option value="DRIVER_SKIN">Driver skins</option></select></label>
        <label>Character<select value={character} onChange={e => setCharacter(e.target.value)}><option value="ALL">All characters</option>{characters.map(id => <option key={id} value={id}>{characterName(id)}</option>)}</select></label>
        <label>Rarity<select value={rarity} onChange={e => setRarity(e.target.value)}><option value="ALL">All rarities</option>{[...new Set((data?.items ?? []).map(row => row.item.rarity))].map(value => <option key={value}>{value}</option>)}</select></label>
        <label>Status<select value={equippedFilter} onChange={e => setEquippedFilter(e.target.value)}><option value="ALL">All</option><option value="EQUIPPED">Equipped</option><option value="UNEQUIPPED">Unequipped</option></select></label>
      </div>
      {!data && !error ? <div className="market-empty">Opening your vault…</div> : filtered.length === 0 ? <div className="market-empty"><h3>No matching owned items</h3><p>Purchases appear here immediately.</p><button className="market-buy" onClick={() => navigate('/shop')}>VISIT BLACK MARKET</button></div> : (
        <div className="market-grid">
          {filtered.map(({ item, acquiredAt }) => {
            const slot = item.category === 'LOGO' ? 'logo' : `skin:${item.characterId}`;
            const isEquipped = data?.equipped.some(row => row.slot === slot && row.itemId === item.id) ?? false;
            return <article className={`market-item rarity-${item.rarity.toLowerCase()}`} key={item.id}>
              <div className="market-art"><img src={getPublicAssetUrl(item.assetPath)} alt={item.name} loading="lazy" /><span className="market-rarity">{item.rarity}</span></div>
              <div className="market-item-copy"><span className="market-kicker">{item.category === 'LOGO' ? 'PLAYER LOGO' : characterName(item.characterId)}</span><h3>{item.name}</h3><div className="market-item-meta"><span>ACQUIRED {new Date(acquiredAt).toLocaleDateString()}</span><span>{isEquipped ? 'EQUIPPED' : 'OWNED'}</span></div></div>
              <button className="market-buy" disabled={busy || isEquipped} onClick={() => equip(item)}>{isEquipped ? 'EQUIPPED' : 'EQUIP'}</button>
              {isEquipped && <button className="market-unequip" disabled={busy} onClick={() => equip(item, true)}>UNEQUIP</button>}
            </article>;
          })}
        </div>
      )}
    </section>
  </main></AppShell>;
}
