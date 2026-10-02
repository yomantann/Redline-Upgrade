import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { getPublicAssetUrl } from '@/lib/public-asset-url';

type Manifest = { lobby: string[]; game: string[] };
export type MusicMode = 'lobby' | 'game';

const STORAGE_KEY = 'redline-music-enabled';
const MusicContext = createContext<{ enabled: boolean; setEnabled: (value: boolean) => void; hasTracks: boolean }>({
  enabled: false,
  setEnabled: () => undefined,
  hasTracks: false,
});

export const useMusic = () => useContext(MusicContext);

function pick(list: string[], exclude?: string) {
  const options = list.length > 1 ? list.filter((track) => track !== exclude) : list;
  return options[Math.floor(Math.random() * options.length)];
}

export function MusicProvider({ mode, children }: { mode: MusicMode; children: ReactNode }) {
  const [enabled, setEnabledState] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) !== 'off'; } catch { return true; }
  });
  const [manifest, setManifest] = useState<Manifest>({ lobby: [], game: [] });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetch(getPublicAssetUrl('music/manifest.json'))
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setManifest({
          lobby: Array.isArray(data.lobby) ? data.lobby.filter((t: unknown) => typeof t === 'string') : [],
          game: Array.isArray(data.game) ? data.game.filter((t: unknown) => typeof t === 'string') : [],
        });
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const tracks = manifest[mode];
  const trackKey = tracks.join('|');

  useEffect(() => {
    if (!enabled || tracks.length === 0) return;
    const audio = new Audio();
    audio.volume = 0.35;
    audioRef.current = audio;
    let stopped = false;
    const playNext = () => {
      if (stopped) return;
      const track = pick(tracks, lastRef.current);
      lastRef.current = track;
      audio.src = getPublicAssetUrl(`music/${track.split("/").map(encodeURIComponent).join("/")}`);
      audio.loop = mode === 'lobby' && tracks.length === 1;
      audio.play().catch(() => undefined);
    };
    const onEnded = () => playNext();
    const onError = () => { if (tracks.length > 1) playNext(); };
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    playNext();
    // Browsers block autoplay until a gesture; retry on first interaction.
    const unlock = () => { if (audio.paused && !stopped) audio.play().catch(() => undefined); };
    window.addEventListener('pointerdown', unlock);
    return () => {
      stopped = true;
      window.removeEventListener('pointerdown', unlock);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.pause();
      audio.removeAttribute('src');
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, mode, trackKey]);

  const setEnabled = (value: boolean) => {
    setEnabledState(value);
    try { localStorage.setItem(STORAGE_KEY, value ? 'on' : 'off'); } catch { /* ignore */ }
  };

  return <MusicContext.Provider value={{ enabled, setEnabled, hasTracks: tracks.length > 0 }}>{children}</MusicContext.Provider>;
}
