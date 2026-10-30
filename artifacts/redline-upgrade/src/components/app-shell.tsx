import type { ReactNode } from 'react';
import { useLocation } from 'wouter';
import { useGame } from '@/game/state';
import { useMusic } from '@/lib/music';
import { useAuth } from '@workspace/replit-auth-web';

function Header() {
  const [location, navigate] = useLocation();
  const { match } = useGame();
  const { enabled, setEnabled, hasTracks } = useMusic();
  const { user, isLoading, login, logout } = useAuth(import.meta.env.BASE_URL);
  const activeRoster = location === '/characters' || location === '/setup';

  return (
    <header className="site-header">
      <button className="brand" type="button" onClick={() => navigate('/')}>
        <span className="brand-mark" aria-hidden="true" />
        REDLINE <span className="muted">/</span> UPGRADE
      </button>
      <div className="header-right mono">
        <button className={`header-link ${activeRoster ? 'active' : ''}`} type="button" onClick={() => navigate('/characters')}>
          ROSTER
        </button>
        <button className={`header-link header-board-link ${location === '/board' || location === '/board-preview' ? 'active' : ''}`} type="button" onClick={() => navigate(match ? '/board' : '/board-preview')} aria-label={match ? 'Open current game board' : 'Open board visual preview'}>
          {match ? 'BOARD' : <><span className="header-board-wide">BOARD PREVIEW</span><span className="header-board-compact">BOARD</span></>}
        </button>
        <button className="header-link header-music-link" type="button" onClick={() => setEnabled(!enabled)} aria-pressed={enabled} title={hasTracks ? 'Toggle music' : 'No music tracks installed (see public/music/README.md)'} aria-label={enabled ? 'Turn music off' : 'Turn music on'}>
          <span className="header-music-wide">{enabled ? 'MUSIC: ON' : 'MUSIC: OFF'}</span>
          <span className="header-music-compact">{enabled ? 'M:ON' : 'M:OFF'}</span>
        </button>
        {match && (
          <span className="header-index">
            <i /> {match.mode === 'MULTIPLAYER' ? 'MULTIPLAYER MATCH' : 'LOCAL MATCH'}
          </span>
        )}
        <span className="header-auth" aria-live="polite">
          {isLoading ? (
            <span className="header-auth-state">ACCOUNT …</span>
          ) : user ? (
            <>
              <span className="header-auth-user">{user.displayName || user.firstName || 'ACCOUNT'}</span>
              <button className="header-link" type="button" onClick={logout}>SIGN OUT</button>
            </>
          ) : (
            <button className="header-link" type="button" onClick={login}>SIGN IN</button>
          )}
        </span>
      </div>
    </header>
  );
}

function Footer() {
  const [location] = useLocation();
  if (location === '/' || location === '/profile') {
    return (
      <footer className="page-footer page-footer-home" aria-hidden="true">
        <div className="home-footer-signal">
          <span className="home-footer-rail" />
          <span className="home-footer-orbit"><i /></span>
          <span className="home-footer-mark" />
        </div>
      </footer>
    );
  }

  return (
    <footer className="page-footer mono">
      <span>REDLINE UPGRADE // LOCAL MATCH</span>
      <span>21 IDENTITIES // 75 SPACES // 2 × D4</span>
    </footer>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <Header />
      {children}
      <Footer />
    </div>
  );
}
