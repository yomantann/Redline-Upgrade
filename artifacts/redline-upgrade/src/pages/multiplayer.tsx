import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import {
  ApiError,
  createRoom,
  getRoom,
  getRoomMatch,
  setRoomSelection,
  joinRoom,
  leaveRoom,
  setRoomReady,
  startRoom,
  updateRoomSettings,
  type RoomDetails,
} from '@workspace/api-client-react';
import { useAuth } from '@workspace/replit-auth-web';
import { AppShell } from '@/components/app-shell';
import { useGame } from '@/game/state';
import { GameScreen } from '@/components/game-screen';
import { characters } from '@/game/characters';
import { careers } from '@/game/careers';
import { findBoardDefinition, getBoardDefinition } from '@/game/boards';
import './pages.css';

const ROOM_STORAGE_KEY = 'redline.activeRoomId';
const POLL_MS = 3000;
const MATCH_POLL_MS = 1500;

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const data = error.data as { error?: string } | null;
    return data?.error ?? 'Something went wrong. Please try again.';
  }
  return 'Could not reach the server. Check your connection and try again.';
}

function SignInGate({ login }: { login: () => void }) {
  return (
    <section className="platform-panel" data-testid="panel-multiplayer-signin">
      <div className="eyebrow">MULTIPLAYER // SIGN-IN REQUIRED</div>
      <h1 className="display platform-title">Sign in to<br /><span className="title-outline">play together.</span></h1>
      <p className="platform-lede">Creating or joining a room requires an account so your seat in the lobby is yours. Single player never needs one.</p>
      <div className="platform-actions">
        <button className="action" type="button" onClick={login} data-testid="button-signin">Sign in <span aria-hidden="true">↗</span></button>
      </div>
    </section>
  );
}

function CreateJoin({ onEnter }: { onEnter: (details: RoomDetails) => void }) {
  const [, navigate] = useLocation();
  const { selectedBoardId } = useGame();
  const board = getBoardDefinition(selectedBoardId);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<RoomDetails>) => {
    setBusy(true);
    setError(null);
    try {
      onEnter(await action());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="platform-panel">
      <div className="eyebrow">MULTIPLAYER // STEP 03</div>
      <h1 className="display platform-title">Create or<br /><span className="title-outline">join a room.</span></h1>
      <p className="platform-lede"><span className="mono lime">SELECTED BOARD</span> {board.name}</p>
      <div className="platform-grid">
        <div className="platform-card">
          <span className="mono platform-kicker">HOST</span>
          <strong>Create room</strong>
          <span>Start a lobby on {board.name} and share the room code.</span>
          <button className="action" type="button" disabled={busy || !board.multiplayerAvailable} onClick={() => run(() => createRoom({ boardId: board.id, mode: 'MULTIPLAYER' }))} data-testid="button-create-room">
            {board.multiplayerAvailable ? 'Create room' : 'Unavailable'} <span aria-hidden="true">↗</span>
          </button>
        </div>
        <form className="platform-card" onSubmit={(event) => { event.preventDefault(); if (code.trim()) void run(() => joinRoom({ code: code.trim() })); }}>
          <span className="mono platform-kicker">GUEST</span>
          <strong>Join room</strong>
          <label className="mono platform-label" htmlFor="room-code">ROOM CODE</label>
          <input id="room-code" className="platform-input mono" value={code} maxLength={12} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="ABC123" onChange={(event) => setCode(event.target.value.toUpperCase())} data-testid="input-room-code" />
          <button className="action secondary" type="submit" disabled={busy || code.trim().length < 4} data-testid="button-join-room">Join room <span aria-hidden="true">→</span></button>
        </form>
      </div>
      {error && <p className="platform-error" role="alert" data-testid="text-room-error">{error}</p>}
      <div className="platform-actions">
        <button className="text-link" type="button" onClick={() => navigate('/mode')}>← Back to game modes</button>
      </div>
    </section>
  );
}

function Lobby({ details, userId, onChange, onExit }: { details: RoomDetails; userId: string; onChange: (details: RoomDetails) => void; onExit: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { room, players } = details;
  const board = findBoardDefinition(room.boardId);
  const isHost = room.hostUserId === userId;
  const me = players.find((player) => player.userId === userId);
  const host = players.find((player) => player.userId === room.hostUserId);
  const others = players.filter((player) => player.userId !== room.hostUserId);
  const canStart = isHost && players.length >= room.minPlayers && others.every((player) => player.ready && player.status === 'joined');

  const run = async (action: () => Promise<RoomDetails>) => {
    setBusy(true);
    setError(null);
    try {
      onChange(await action());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const leave = async () => {
    setBusy(true);
    try {
      await leaveRoom(room.id);
    } catch {
      // The room may already be gone; leaving locally is still correct.
    }
    onExit();
  };

  const slots = Array.from({ length: room.maxPlayers }, (_, slot) => players.find((player) => player.slot === slot) ?? null);

  return (
    <section className="platform-panel" data-testid="panel-lobby">
      <div className="eyebrow">LOBBY // {board?.name.toUpperCase() ?? room.boardId}</div>
      <div className="lobby-head">
        <div>
          <span className="mono platform-kicker">ROOM CODE</span>
          <div className="lobby-code display" data-testid="text-room-code">{room.code}</div>
        </div>
        <dl className="lobby-meta mono">
          <div><dt>BOARD</dt><dd data-testid="text-room-board">{board?.name ?? room.boardId}</dd></div>
          <div><dt>HOST</dt><dd>{host?.displayName ?? '—'}</dd></div>
          <div><dt>PLAYERS</dt><dd>{players.length} / {room.maxPlayers}</dd></div>
          <div><dt>STATUS</dt><dd>{room.status.replace('_', ' ').toUpperCase()}</dd></div>
        </dl>
      </div>

      {room.status === 'in_progress' ? (
        <div className="platform-card match-entry" data-testid="panel-match-entry">
          <span className="mono platform-kicker">GAME ENTRY</span>
          <strong>The game is in progress</strong>
          <span>Connecting you to the match …</span>
        </div>
      ) : room.status === 'cancelled' ? (
        <div className="platform-card"><strong>This room has closed.</strong></div>
      ) : null}

      <ul className="lobby-slots" aria-label="Player slots">
        {slots.map((player, slot) => (
          <li key={slot} className={`lobby-slot ${player ? '' : 'empty'}`} data-testid={`slot-${slot}`}>
            <span className="mono lobby-slot-index">SLOT 0{slot + 1}</span>
            {player ? (
              <>
                <strong>{player.displayName}{player.userId === userId ? ' (you)' : ''}</strong>
                <span className="mono" data-testid={`text-selection-${slot}`}>{[player.selectedCharacterId ? characters.find((c) => c.id === player.selectedCharacterId)?.name : 'Random character', player.selectedCareerId ? careers.find((c) => c.id === player.selectedCareerId)?.name : 'Random career'].join(' · ')}</span>
                <span className="lobby-tags mono">
                  {player.userId === room.hostUserId && <b className="tag-host">HOST</b>}
                  {player.status === 'disconnected' ? <b className="tag-off">DISCONNECTED</b> : player.userId === room.hostUserId ? <b className="tag-ready">READY</b> : player.ready ? <b className="tag-ready">READY</b> : <b>NOT READY</b>}
                </span>
              </>
            ) : (
              <strong className="muted">Open seat</strong>
            )}
          </li>
        ))}
      </ul>

      {room.status === 'waiting' && me && (
        <div className="lobby-setting mono" data-testid="panel-selection">
          <span>YOUR CHARACTER</span>
          <select className="platform-input" value={me.selectedCharacterId ?? ''} disabled={busy} onChange={(event) => event.target.value && void run(() => setRoomSelection(room.id, { characterId: event.target.value }))} data-testid="select-character">
            <option value="">Random</option>
            {characters.map((character) => {
              const takenBy = players.find((player) => player.userId !== userId && player.selectedCharacterId === character.id);
              return <option key={character.id} value={character.id} disabled={Boolean(takenBy)}>{character.name}{takenBy ? ` (${takenBy.displayName})` : ''}</option>;
            })}
          </select>
          <span>YOUR CAREER</span>
          <select className="platform-input" value={me.selectedCareerId ?? ''} disabled={busy} onChange={(event) => event.target.value && void run(() => setRoomSelection(room.id, { careerId: event.target.value }))} data-testid="select-career">
            <option value="">Random</option>
            {careers.map((career) => {
              const takenBy = players.find((player) => player.userId !== userId && player.selectedCareerId === career.id);
              return <option key={career.id} value={career.id} disabled={Boolean(takenBy)}>{career.name}{takenBy ? ` (${takenBy.displayName})` : ''}</option>;
            })}
          </select>
        </div>
      )}

      {room.status === 'waiting' && (
        <>
          {isHost && (
            <div className="lobby-setting mono">
              <span>MINIMUM PLAYERS TO START</span>
              <div className="lobby-stepper">
                {[2, 3, 4].map((count) => (
                  <button key={count} type="button" className={room.minPlayers === count ? 'active' : ''} disabled={busy} onClick={() => run(() => updateRoomSettings(room.id, { minPlayers: count }))} aria-pressed={room.minPlayers === count} data-testid={`button-min-${count}`}>{count}</button>
                ))}
              </div>
            </div>
          )}
          <div className="platform-actions">
            {isHost ? (
              <button className="action lime-action" type="button" disabled={busy || !canStart} onClick={() => run(() => startRoom(room.id))} data-testid="button-start-game">
                Start game <span aria-hidden="true">↗</span>
              </button>
            ) : (
              <button className="action" type="button" disabled={busy} onClick={() => run(() => setRoomReady(room.id, { ready: !me?.ready }))} data-testid="button-ready">
                {me?.ready ? 'Unready' : 'Ready up'} <span aria-hidden="true">✓</span>
              </button>
            )}
            <button className="action secondary" type="button" disabled={busy} onClick={leave} data-testid="button-leave-room">Leave room</button>
          </div>
          {isHost && !canStart && <p className="platform-hint mono">Need at least {room.minPlayers} connected players, all ready.</p>}
        </>
      )}
      {room.status !== 'waiting' && (
        <div className="platform-actions">
          <button className="action secondary" type="button" onClick={leave} data-testid="button-leave-room">Leave room</button>
        </div>
      )}
      {error && <p className="platform-error" role="alert" data-testid="text-room-error">{error}</p>}
    </section>
  );
}

export function MultiplayerPage() {
  const { user, isLoading, login } = useAuth(import.meta.env.BASE_URL);
  const { selectedBoardId } = useGame();
  const board = getBoardDefinition(selectedBoardId);
  const [roomId, setRoomId] = useState<string | null>(() => sessionStorage.getItem(ROOM_STORAGE_KEY));
  const [details, setDetails] = useState<RoomDetails | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [, navigate] = useLocation();
  const { remote, setRemoteSnapshot } = useGame();

  const enter = useCallback((next: RoomDetails) => {
    sessionStorage.setItem(ROOM_STORAGE_KEY, next.room.id);
    setRoomId(next.room.id);
    setDetails(next);
    setNotice(null);
  }, []);

  const exit = useCallback((message?: string) => {
    sessionStorage.removeItem(ROOM_STORAGE_KEY);
    setRoomId(null);
    setDetails(null);
    setNotice(message ?? null);
  }, []);

  // The server is authoritative; polling doubles as the player's connection heartbeat.
  useEffect(() => {
    if (!user || !roomId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const next = await getRoom(roomId);
        if (!cancelled) setDetails(next);
      } catch (err) {
        if (!cancelled && err instanceof ApiError && (err.status === 404 || err.status === 400)) {
          exit('That room is no longer available.');
        }
      }
    };
    void load();
    const timer = window.setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [user, roomId, exit]);

  // While the room's match runs, poll the authoritative state. A refresh lands here too: the stored
  // room ID plus the user's seat restores the same slot and the current game state.
  const roomStatus = details?.room.status;
  const matchRunning = roomStatus === 'in_progress' || roomStatus === 'completed';
  const statusRef = useRef(roomStatus);
  statusRef.current = roomStatus;
  useEffect(() => {
    if (!user || !roomId || !matchRunning) return;
    let cancelled = false;
    const load = async () => {
      try {
        const snapshot = await getRoomMatch(roomId);
        if (!cancelled) setRemoteSnapshot(snapshot);
      } catch (err) {
        if (cancelled || !(err instanceof ApiError)) return;
        if (err.status === 403) {
          setRemoteSnapshot(null);
          exit((err.data as { error?: string } | null)?.error ?? 'You were removed from this match.');
        } else if (err.status === 404) {
          setRemoteSnapshot(null);
        }
      }
    };
    void load();
    const timer = window.setInterval(load, MATCH_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [user, roomId, matchRunning, exit, setRemoteSnapshot]);

  useEffect(() => () => {
    setRemoteSnapshot(null);
    // A finished match is not resumed on the next visit.
    if (statusRef.current === 'completed') sessionStorage.removeItem(ROOM_STORAGE_KEY);
  }, [setRemoteSnapshot]);

  let content;
  if (remote && roomId && matchRunning) {
    return (
      <AppShell>
        <GameScreen />
      </AppShell>
    );
  }
  if (isLoading) {
    content = <section className="platform-panel"><div className="eyebrow">CONNECTING …</div></section>;
  } else if (!user) {
    content = <SignInGate login={login} />;
  } else if (roomId && details) {
    content = <Lobby details={details} userId={user.id} onChange={setDetails} onExit={() => exit()} />;
  } else if (roomId) {
    content = <section className="platform-panel"><div className="eyebrow">ENTERING LOBBY …</div></section>;
  } else if (!board.multiplayerAvailable) {
    content = (
      <section className="platform-panel">
        <div className="eyebrow">MULTIPLAYER // UNAVAILABLE</div>
        <h1 className="display platform-title">{board.name}<br /><span className="title-outline">not online yet.</span></h1>
        <div className="platform-actions"><button className="action" type="button" onClick={() => navigate('/boards')}>Choose another board</button></div>
      </section>
    );
  } else {
    content = <CreateJoin onEnter={enter} />;
  }

  return (
    <AppShell>
      <main className="platform-main">
        {notice && <p className="platform-error" role="status">{notice}</p>}
        {content}
      </main>
    </AppShell>
  );
}
