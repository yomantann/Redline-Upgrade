import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Router as WouterRouter, useLocation } from 'wouter';
import { characters, getCharacter, type CharacterDefinition } from '@/game/characters';
import { GameProvider, useGame } from '@/game/state';
import { CharacterPiece, type PawnMotion } from '@/components/character-piece';
import { CharacterPortrait } from '@/components/character-portrait';
import { GameScreen } from '@/components/game-screen';
import { CareerReveal } from '@/components/career-reveal';

function Artwork({
  index = 0,
  label = 'VISUAL ID / PENDING',
  className = '',
}: {
  index?: number;
  label?: string;
  className?: string;
}) {
  return (
    <div className={`artwork variant-${index % 6} ${className}`} aria-label="Abstract character art placeholder">
      <span className="artwork-index">{String(index + 1).padStart(2, '0')} / 21</span>
      <span className="artwork-cross" />
      <span className="artwork-ring" />
      <span className="artwork-core" />
      <span className="artwork-label">{label}</span>
    </div>
  );
}

function Header() {
  const [location, navigate] = useLocation();
  const { match } = useGame();
  const activeRoster = location === '/characters' || location === '/setup';

  return (
    <header className="site-header">
      <button className="brand" type="button" onClick={() => navigate('/')}>
        <span className="brand-mark" aria-hidden="true" />
        REDLINE <span className="muted">/</span> UPGRADE
      </button>
      <div className="header-right mono">
        <span className="header-phase">PHASE 05 // TABLETOP</span>
        <button className={`header-link ${activeRoster ? 'active' : ''}`} type="button" onClick={() => navigate('/characters')}>
          ROSTER
        </button>
        {match && <button className={`header-link ${location === '/board' ? 'active' : ''}`} type="button" onClick={() => navigate('/board')}>BOARD</button>}
        <span className="header-index"><i /> LOCAL BUILD</span>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="page-footer mono">
      <span>REDLINE UPGRADE // INTERNAL BUILD</span>
      <span>21 IDENTITIES // 75 SPACES // 2 × D4</span>
    </footer>
  );
}

function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <Header />
      {children}
      <Footer />
    </div>
  );
}

function Home() {
  const [, navigate] = useLocation();
  const { startNewGame, match } = useGame();

  const start = () => {
    startNewGame();
    navigate('/characters');
  };

  return (
    <AppShell>
      <main className="home-main">
        <section className="home-hero">
          <div className="home-copy">
            <div className="home-meta mono">
              <span className="eyebrow">NEW GAME PROTOCOL</span>
              <span>v.0.1 // ONLINE</span>
            </div>
            <h1 className="display home-title">
              <span>Redline</span>
              <span className="title-outline">Upgrade</span>
            </h1>
            <p className="home-intro">
              Choose the identity that will take you past the limit.
              A four-player race through 75 spaces begins here.
            </p>
            <div className="home-actions">
              <button className="action" type="button" onClick={start}>
                Start New Game <span aria-hidden="true">↗</span>
              </button>
              {match && <button className="action secondary" type="button" onClick={() => navigate('/board')}>Continue game <span aria-hidden="true">→</span></button>}
              <button className="text-link" type="button" onClick={() => navigate('/characters')}>
                Browse identities <span aria-hidden="true">→</span>
              </button>
            </div>
            <div className="home-low mono">
              <span>LOCAL SESSION</span>
              <span>NO NETWORK REQUIRED</span>
            </div>
          </div>
          <div className="home-visual" aria-label="Redline Upgrade abstract title art">
            <div className="hero-visual-top mono">
              <span>IDENTITY ENGINE</span>
              <span>01—21</span>
            </div>
            <div className="hero-orbit" />
            <div className="hero-visual-bottom mono">
              <span>CHOOSE YOUR<br />OPERATING SYSTEM</span>
              <strong>READY_</strong>
            </div>
          </div>
        </section>
        <section className="home-strip" aria-label="Game foundation status">
          <div className="strip-cell">
            <span className="strip-number">21</span>
            <span><strong>Playable identities</strong><span>Every path starts somewhere</span></span>
          </div>
          <div className="strip-cell">
              <span className="strip-number">04</span>
              <span><strong>Local players</strong><span>You versus three CPU opponents</span></span>
          </div>
          <div className="strip-cell">
              <span className="strip-number">75</span>
              <span><strong>Board spaces</strong><span>Two D4s drive every turn</span></span>
          </div>
        </section>
      </main>
    </AppShell>
  );
}

function CharacterTile({
  character,
  selected,
  onSelect,
}: {
  character: CharacterDefinition;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button className={`character-tile ${selected ? 'selected' : ''}`} type="button" onClick={onSelect} aria-pressed={selected} data-testid={`button-character-${character.id}`}>
      {selected && <span className="tile-selected">SELECTED</span>}
      <CharacterPortrait character={character} className="tile-portrait" />
      <span className="tile-body">
        <span className="tile-name">{character.name}</span>
        <span className="tile-ability">{character.abilityName}</span>
      </span>
    </button>
  );
}

function CharacterPreview({ character, index }: { character: CharacterDefinition; index: number }) {
  const [, navigate] = useLocation();
  const { confirmCharacter } = useGame();
  const [motion, setMotion] = useState<PawnMotion>('idle');
  const timers = useRef<number[]>([]);

  useEffect(() => {
    setMotion('idle');
    return () => {
      timers.current.forEach(window.clearTimeout);
      timers.current = [];
    };
  }, [character.id]);

  const previewMove = () => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    setMotion('moving');
    timers.current.push(window.setTimeout(() => setMotion('landing'), 700));
    timers.current.push(window.setTimeout(() => setMotion('idle'), 1500));
  };

  const confirm = () => {
    confirmCharacter(character.id);
    navigate('/setup');
  };

  return (
    <aside className="preview-column">
      <div className="preview-inner">
        <div className="preview-kicker mono">
          <span>ACTIVE IDENTITY</span>
          <span className="lime">{String(index + 1).padStart(2, '0')} / 21</span>
        </div>
        <div className="preview-visual">
          <CharacterPortrait character={character} className="preview-portrait" />
          <CharacterPiece characterId={character.id} name={character.name} selected motion={motion} className="preview-pawn" />
        </div>
        <div className="preview-info">
          <span className="mono preview-number signal">PROFILE // {character.id}</span>
          <h2 className="display preview-name">{character.name}</h2>
          <p className="preview-description">{character.description}</p>
          <div className="ability-panel">
            <span className="mono signal">SIGNATURE ABILITY</span>
            <h3 className="ability-title">{character.abilityName}</h3>
            <p className="ability-description">{character.abilityDescription}</p>
          </div>
          <div className="preview-actions">
            <button className="action lime-action" type="button" onClick={confirm}>
              Confirm identity <span aria-hidden="true">↗</span>
            </button>
            <button className="action secondary" type="button" onClick={previewMove} data-testid="button-preview-move">
              Test move <span aria-hidden="true">↗</span>
            </button>
          </div>
           <p className="preview-note mono">CAREER AND SALARY ARE ASSIGNED WHEN YOU START THE GAME</p>
        </div>
      </div>
    </aside>
  );
}

function Characters() {
  const [selectedId, setSelectedId] = useState(characters[0].id);
  const selected = useMemo(() => getCharacter(selectedId) ?? characters[0], [selectedId]);
  const selectedIndex = characters.findIndex((character) => character.id === selected.id);

  return (
    <AppShell>
      <main>
        <section className="roster-heading">
          <div className="eyebrow">IDENTITY SELECTION // STEP 01</div>
          <div className="roster-heading-row">
            <h1 className="display roster-title">Choose<br /><span className="title-outline">your player</span></h1>
            <p className="roster-subtitle">Every run begins with an operating system. Select the identity that feels most like a warning.</p>
          </div>
        </section>
        <section className="roster-layout">
          <div className="roster-list">
            <div className="roster-toolbar mono">
              <span><b>ROSTER</b> // 21 AVAILABLE</span>
              <span className="lime">SELECT ONE</span>
            </div>
            <div className="roster-grid">
              {characters.map((character) => (
                <CharacterTile
                  key={character.id}
                  character={character}
                  selected={character.id === selected.id}
                  onSelect={() => setSelectedId(character.id)}
                />
              ))}
            </div>
          </div>
          <CharacterPreview character={selected} index={selectedIndex} />
        </section>
      </main>
    </AppShell>
  );
}

function Setup() {
  const [, navigate] = useLocation();
  const { player, match, beginGame, startNewGame } = useGame();
  const character = player ? getCharacter(player.characterId) : undefined;

  if (!player || !character) {
    return (
      <AppShell>
        <main className="setup-main">
          <section className="setup-top">
            <div className="eyebrow">GAME SETUP // WAITING</div>
          </section>
          <section className="setup-body">
            <div className="setup-content">
              <h1 className="display setup-title">No player<br /><span className="title-outline">loaded.</span></h1>
              <p className="setup-lede">Choose an identity first. Your local player record will be created after confirmation.</p>
              <button className="action" type="button" onClick={() => navigate('/characters')}>Choose identity <span aria-hidden="true">↗</span></button>
            </div>
            <div className="setup-aside">
              <Artwork index={20} className="setup-art" label="PLAYER / EMPTY" />
            </div>
          </section>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="setup-main">
        <section className="setup-top">
          <div className="eyebrow">GAME SETUP // IDENTITY LOCKED</div>
        </section>
        <section className="setup-body">
          <div className="setup-content">
            <span className="mono lime">PLAYER RECORD // {player.playerId.slice(0, 8)}</span>
            <h1 className="display setup-title">Ready to<br /><span className="title-outline">upgrade.</span></h1>
            <p className="setup-lede">Your identity is selected. Start the game to assign a random career and salary to you and three CPU rivals.</p>
            <div className="setup-record mono">
              <span className="setup-record-label">SELECTED IDENTITY</span>
              <span className="setup-record-value">{character.name}</span>
            </div>
            <div className="setup-actions">
              <button className="action lime-action" type="button" onClick={() => { beginGame(); navigate('/career'); }} data-testid="button-enter-career">{match ? 'Reveal career' : 'Start game'} <span aria-hidden="true">↗</span></button>
              <button className="text-link" type="button" onClick={() => { startNewGame(); navigate('/characters'); }}>Change identity <span aria-hidden="true">→</span></button>
            </div>
          </div>
          <div className="setup-aside">
            <div className="setup-art">
              <CharacterPortrait character={character} className="setup-portrait" />
              <CharacterPiece characterId={character.id} name={character.name} selected className="setup-pawn" />
            </div>
            <div className="setup-aside-caption mono">
              <span>PORTRAIT + 3D FIGURINE</span>
              <span className="lime">READY</span>
            </div>
          </div>
        </section>
      </main>
    </AppShell>
  );
}

function NotFound() {
  const [, navigate] = useLocation();
  return (
    <AppShell>
      <main className="setup-main">
        <section className="setup-content">
          <div className="eyebrow">SIGNAL LOST</div>
          <h1 className="display setup-title">404<br /><span className="title-outline">offline.</span></h1>
          <button className="action" type="button" onClick={() => navigate('/')}>Return home <span aria-hidden="true">↗</span></button>
        </section>
      </main>
    </AppShell>
  );
}

function Router() {
  const [location] = useLocation();
  const { match, careerRevealed } = useGame();
  return (
    <RoutedErrorBoundary>
      {location === '/' && <Home />}
      {location === '/characters' && <Characters />}
      {location === '/setup' && <Setup />}
      {location === '/career' && <AppShell><CareerReveal /></AppShell>}
      {location === '/board' && <AppShell>{match && !careerRevealed ? <CareerReveal /> : <GameScreen />}</AppShell>}
      {!['/', '/characters', '/setup', '/career', '/board'].includes(location) && <NotFound />}
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <GameProvider>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Router />
      </WouterRouter>
    </GameProvider>
  );
}

export default App;
