import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Router as WouterRouter, useLocation } from 'wouter';
import { characters, getCharacter, type CharacterDefinition } from '@/game/characters';
import { GameProvider, useGame } from '@/game/state';
import { createMatch } from '@/game/match';
import { CharacterPiece, type PawnMotion } from '@/components/character-piece';
import { CharacterPortrait } from '@/components/character-portrait';
import { MusicProvider, useMusic } from '@/lib/music';
import { GameScreen } from '@/components/game-screen';
import { CareerReveal } from '@/components/career-reveal';
import { GameBoard } from '@/components/game-board';
import { boards, getBoardDefinition, type GameMode } from '@/game/boards';
import { AppShell } from '@/components/app-shell';
import { MultiplayerPage } from '@/pages/multiplayer';
import { ProfilePage } from '@/pages/profile';
import { ShopPage } from '@/pages/shop';
import { boardAvailabilityLabel } from '@/game/boards';
import { useAuth } from '@workspace/replit-auth-web';

function Artwork({
  index = 0,
  label = 'PLAYER / EMPTY',
  className = '',
}: {
  index?: number;
  label?: string;
  className?: string;
}) {
  return (
    <div className={`artwork variant-${index % 6} ${className}`} aria-label="No character selected">
      <span className="artwork-index">{String(index + 1).padStart(2, '0')} / 21</span>
      <span className="artwork-cross" />
      <span className="artwork-ring" />
      <span className="artwork-core" />
      <span className="artwork-label">{label}</span>
    </div>
  );
}

function Home() {
  const [, navigate] = useLocation();
  const { match } = useGame();
  const { user, login } = useAuth(import.meta.env.BASE_URL);

  const openProfile = () => {
    if (user) navigate('/profile');
    else login();
  };

  const start = () => {
    navigate('/boards');
  };

  return (
    <AppShell>
      <main className="home-main">
        <section className="home-hero">
          <div className="home-copy">
            <div className="home-meta mono">
              <span className="eyebrow">CHOOSE YOUR GAME</span>
              <span>01 // BOARD SELECTION</span>
            </div>
            <h1 className="display home-title">
              <span>Redline</span>
              <span className="title-outline">Upgrade</span>
            </h1>
            <p className="home-intro">
              A multi-board game platform. Choose a board, then play solo or create a room with friends. Redline Upgrade is ready to race; Bio Upgrade and Haunted Upgrade are on the way.
            </p>
            <div className="home-actions">
              <button className="action" type="button" onClick={start}>
                Play <span aria-hidden="true">↗</span>
              </button>
              {match && <button className="action secondary" type="button" onClick={() => navigate('/board')}>Continue game <span aria-hidden="true">→</span></button>}
              <button className="action secondary" type="button" onClick={openProfile} data-testid="button-profile">Profile</button>
              <button className="action secondary" type="button" onClick={() => navigate('/shop')} data-testid="button-shop">Shop</button>
              <button className="text-link" type="button" onClick={() => navigate('/characters')}>
                Browse identities <span aria-hidden="true">→</span>
              </button>
            </div>
            <div className="home-low mono">
              <span>BOARD / MODE SELECTION</span>
              <span>SOLO PLAY / MULTIPLAYER</span>
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
            <span className="strip-number">03</span>
            <span><strong>Distinct boards</strong><span>Redline, Bio and Haunted Upgrade</span></span>
          </div>
          <div className="strip-cell">
            <span className="strip-number">01</span>
            <span><strong>Playable board</strong><span>Redline Upgrade single player</span></span>
          </div>
          <div className="strip-cell">
            <span className="strip-number">02</span>
            <span><strong>Play modes</strong><span>Single player and online rooms</span></span>
          </div>
        </section>
      </main>
    </AppShell>
  );
}

function BoardSelection() {
  const [, navigate] = useLocation();
  const { selectBoard } = useGame();

  const chooseBoard = (board: (typeof boards)[number]) => {
    selectBoard(board.id);
    navigate(board.availability === 'COMING_SOON' ? '/board-coming-soon' : '/mode');
  };

  return (
    <AppShell>
      <main className="selection-page">
        <section className="roster-heading">
          <div className="eyebrow">NEW GAME // STEP 01</div>
          <div className="roster-heading-row">
            <h1 className="display roster-title">Choose<br /><span className="title-outline">your board</span></h1>
            <p className="roster-subtitle">Each board is its own game experience. Select a world to see its available play modes.</p>
          </div>
        </section>
        <section className="board-choice-grid" aria-label="Available boards">
          {boards.map((board, index) => (
            <button
              className={`board-choice ${board.artwork.themeClass} ${board.availability === 'AVAILABLE' ? '' : 'board-unavailable'}`}
              type="button"
              key={board.id}
              onClick={() => chooseBoard(board)}
              data-board-id={board.id}
              data-testid={`button-board-${board.id.toLowerCase()}`}
            >
              <span className="board-choice-visual" aria-hidden="true">
                <span className="board-choice-index mono">BOARD // 0{index + 1}</span>
                <span className="board-choice-mark">{board.artwork.mark}</span>
                <span className="board-choice-tag mono">{boardAvailabilityLabel(board)}</span>
              </span>
              <span className="board-choice-copy">
                <span className="mono board-choice-kicker">{board.tagline}</span>
                <strong>{board.name}</strong>
                <span>{board.description}</span>
                <span className="board-choice-link">{board.availability === 'COMING_SOON' ? 'Preview' : 'View game modes'} <span aria-hidden="true">↗</span></span>
              </span>
            </button>
          ))}
        </section>
        <div className="selection-back">
          <button className="text-link" type="button" onClick={() => navigate('/')}>← Home</button>
        </div>
      </main>
    </AppShell>
  );
}

function GameModeSelection() {
  const [, navigate] = useLocation();
  const { selectedBoardId, selectGameMode, startNewGame } = useGame();
  const board = getBoardDefinition(selectedBoardId);

  const chooseMode = (mode: GameMode) => {
    selectGameMode(mode);
    if (mode === 'MULTIPLAYER') {
      navigate(board.multiplayerAvailable ? '/multiplayer' : '/board-coming-soon');
    } else if (board.playable) {
      startNewGame();
      navigate('/characters');
    } else {
      navigate('/board-coming-soon');
    }
  };

  return (
    <AppShell>
      <main className="selection-page mode-page">
        <section className="roster-heading">
          <div className="eyebrow">NEW GAME // STEP 02</div>
          <div className="roster-heading-row">
            <h1 className="display roster-title">How will<br /><span className="title-outline">you play?</span></h1>
            <p className="roster-subtitle"><span className="mono lime">SELECTED BOARD</span><br />{board.name} — {board.tagline}</p>
          </div>
        </section>
        <section className="mode-choice-grid" aria-label="Choose a play mode">
          <button className="mode-choice" type="button" onClick={() => chooseMode('SINGLE_PLAYER')} data-testid="button-mode-single-player">
            <span className="mono mode-choice-index">MODE // 01</span>
            <strong>Single Player</strong>
            <span>{board.playable ? 'Start a local game against three CPU rivals.' : 'This board is not playable yet.'}</span>
            <span className={`mode-choice-status ${board.playable ? 'lime' : ''}`}>{board.playable ? 'AVAILABLE' : 'COMING SOON'}</span>
          </button>
          <button className="mode-choice multiplayer-choice" type="button" onClick={() => chooseMode('MULTIPLAYER')} data-testid="button-mode-multiplayer">
            <span className="mono mode-choice-index">MODE // 02</span>
            <strong>Multiplayer</strong>
            <span>{board.multiplayerAvailable ? 'Create or join a room and gather in a lobby. Sign-in required.' : 'Multiplayer is not available for this board yet.'}</span>
            <span className={`mode-choice-status ${board.multiplayerAvailable ? 'lime' : ''}`}>{board.multiplayerAvailable ? 'LOBBY AVAILABLE' : 'COMING SOON'}</span>
          </button>
        </section>
        <div className="selection-back">
          <button className="text-link" type="button" onClick={() => navigate('/boards')}>← Change board</button>
        </div>
      </main>
    </AppShell>
  );
}

function ComingSoon() {
  const [, navigate] = useLocation();
  const { selectedBoardId } = useGame();
  const board = getBoardDefinition(selectedBoardId);
  const label = board.availability === 'COMING_SOON' ? 'COMING SOON' : 'IN DEVELOPMENT';

  return (
    <AppShell>
      <main className="setup-main coming-soon-page">
        <section className="setup-content">
          <div className="eyebrow">{board.name.toUpperCase()} // {label}</div>
          <h1 className="display setup-title">{board.name}<br /><span className="title-outline">{board.availability === 'COMING_SOON' ? 'coming soon.' : 'in development.'}</span></h1>
          <p className="setup-lede">{board.description} This board will have its own board, rules, cards, characters and assets when it is ready. Redline Upgrade remains ready to play.</p>
          <div className="setup-actions">
            <button className="action" type="button" onClick={() => navigate('/boards')}>Choose another board <span aria-hidden="true">←</span></button>
            <button className="text-link" type="button" onClick={() => navigate('/')}>Home <span aria-hidden="true">→</span></button>
          </div>
        </section>
        <div className={`coming-soon-visual ${board.artwork.themeClass.replace('-choice', '-coming-visual')}`} aria-hidden="true">
          <span>{board.artwork.mark}</span>
          <i />
        </div>
      </main>
    </AppShell>
  );
}

function CharacterTile({
  character,
  selected,
  onSelect,
  onConfirm,
}: {
  character: CharacterDefinition;
  selected: boolean;
  onSelect: () => void;
  onConfirm: () => void;
}) {
  return (
    <button className={`character-tile ${selected ? 'selected' : ''}`} type="button" onClick={onSelect} onDoubleClick={onConfirm} title="Double-click to lock in" aria-pressed={selected} data-testid={`button-character-${character.id}`}>
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
          <div className="preview-selection-confirmation" role="status" aria-live="polite">
            <span className="mono lime">SELECTED / READY TO START</span>
            <button className="action lime-action" type="button" onClick={confirm} data-testid="button-confirm-identity">
              Confirm identity <span aria-hidden="true">↗</span>
            </button>
          </div>
          <p className="preview-description">{character.description}</p>
          <div className="ability-panel">
            <span className="mono signal">SIGNATURE ABILITY</span>
            <h3 className="ability-title">{character.abilityName}</h3>
            <p className="ability-description">{character.abilityDescription}</p>
          </div>
          <div className="preview-actions">
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
  const { confirmCharacter } = useGame();
  const [, navigate] = useLocation();

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
              <span className="lime">SELECT ONE / DOUBLE-CLICK TO LOCK IN</span>
            </div>
            <div className="roster-grid">
              {characters.map((character) => (
                <CharacterTile
                  key={character.id}
                  character={character}
                  selected={character.id === selected.id}
                  onSelect={() => setSelectedId(character.id)}
                  onConfirm={() => { confirmCharacter(character.id); navigate('/setup'); }}
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

function BoardVisualPreview() {
  const previewMatch = useMemo(() => createMatch(characters[0].id), []);
  const previewPlayers = previewMatch.players.map((player, index) => ({
    ...player,
    position: [0, 4, 9, 14][index] ?? 0,
  }));
  const activePlayer = previewPlayers.find((player) => !player.isCPU) ?? previewPlayers[0];

  return (
    <AppShell>
      <main className="game-screen board-preview-page">
        <div className="board-preview-banner mono" role="note" data-testid="text-board-visual-preview">
          BOARD VISUAL PREVIEW / SAMPLE PIECE PLACEMENT / NO GAME STATE CHANGED
        </div>
        <GameBoard players={previewPlayers} activePlayerId={activePlayer.playerId} landingPosition={null} movingPlayerId={null} />
      </main>
    </AppShell>
  );
}

function Router() {
  const [location] = useLocation();
  const { match, careerRevealed } = useGame();
  const inGame = location === '/board' && Boolean(match) && careerRevealed;
  return (
    <MusicProvider mode={inGame ? 'game' : 'lobby'}>
    <RoutedErrorBoundary>
      {location === '/' && <Home />}
      {location === '/boards' && <BoardSelection />}
      {location === '/mode' && <GameModeSelection />}
      {location === '/multiplayer' && <MultiplayerPage />}
      {location === '/profile' && <ProfilePage />}
      {location === '/shop' && <ShopPage />}
      {location === '/board-coming-soon' && <ComingSoon />}
      {location === '/characters' && <Characters />}
      {location === '/setup' && <Setup />}
      {location === '/career' && <AppShell><CareerReveal /></AppShell>}
      {location === '/board' && <AppShell>{match && !careerRevealed ? <CareerReveal /> : <GameScreen />}</AppShell>}
      {location === '/board-preview' && <BoardVisualPreview />}
      {!['/', '/boards', '/mode', '/multiplayer', '/profile', '/shop', '/board-coming-soon', '/characters', '/setup', '/career', '/board', '/board-preview'].includes(location) && <NotFound />}
    </RoutedErrorBoundary>
    </MusicProvider>
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
