import { useLocation } from 'wouter';
import { AppShell } from '@/components/app-shell';
import './pages.css';

// Shop items will eventually reference a persistent Credits price; none exists yet.
const categories = ['Backgrounds', 'Borders', 'Logos', 'Character / driver skins', 'Board cosmetics', 'Other customization'];

export function ShopPage() {
  const [, navigate] = useLocation();
  return (
    <AppShell>
      <main className="platform-main">
        <section className="platform-panel" data-testid="panel-shop">
          <div className="eyebrow">SHOP // COMING SOON</div>
          <h1 className="display platform-title">The shop<br /><span className="title-outline">is closed.</span></h1>
          <p className="platform-lede">Cosmetics will be unlockable with Credits once persistent accounts and Credits launch. Nothing is for sale yet, and no purchases or currency exist.</p>
          <div className="shop-grid">
            {categories.map((category) => (
              <div className="shop-tile" key={category} aria-disabled="true">
                <strong>{category}</strong>
                <span className="mono">UNAVAILABLE</span>
              </div>
            ))}
          </div>
          <div className="platform-actions"><button className="text-link" type="button" onClick={() => navigate('/')}>← Home</button></div>
        </section>
      </main>
    </AppShell>
  );
}
