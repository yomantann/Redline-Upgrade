import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@workspace/replit-auth-web';
import { AppShell } from '@/components/app-shell';
import './pages.css';

// Persistent profile features are planned; each entry becomes a real section later.
const upcomingSections = ['Player statistics', 'Unlocked cosmetics', 'Credits', 'Game history', 'Achievements', 'Customization'];

export function ProfilePage() {
  const [, navigate] = useLocation();
  const { user, isLoading, login, logout } = useAuth(import.meta.env.BASE_URL);

  useEffect(() => {
    if (!isLoading && !user) login();
  }, [isLoading, user, login]);

  const name = user ? [user.firstName, user.lastName].filter(Boolean).join(' ') : '';

  return (
    <AppShell>
      <main className="platform-main">
        <section className="platform-panel" data-testid="panel-profile">
          <div className="eyebrow">PROFILE</div>
          <h1 className="display platform-title">Your<br /><span className="title-outline">account.</span></h1>
          {isLoading || !user ? (
            <p className="platform-lede">Redirecting to sign-in …</p>
          ) : (
            <>
              <div className="profile-card">
                {user.profileImageUrl && <img className="profile-avatar" src={user.profileImageUrl} alt="" />}
                <dl className="profile-fields mono">
                  <div><dt>NAME</dt><dd data-testid="text-profile-name">{name || '—'}</dd></div>
                  <div><dt>EMAIL</dt><dd data-testid="text-profile-email">{user.email ?? '—'}</dd></div>
                  <div><dt>ACCOUNT ID</dt><dd>{user.id}</dd></div>
                </dl>
              </div>
              <p className="platform-hint mono">Characters and careers are chosen per game and are never tied to your account.</p>
              <ul className="soon-list" aria-label="Upcoming profile features">
                {upcomingSections.map((section) => (
                  <li key={section}><span>{section}</span><span className="mono">COMING SOON</span></li>
                ))}
              </ul>
              <div className="platform-actions">
                <button className="action secondary" type="button" onClick={logout}>Sign out</button>
              </div>
            </>
          )}
          <div className="platform-actions"><button className="text-link" type="button" onClick={() => navigate('/')}>← Home</button></div>
        </section>
      </main>
    </AppShell>
  );
}
