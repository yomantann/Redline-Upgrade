import { ICON_PATHS } from '@/game/icon-paths';

export function SpaceIcon({ name, size = 24, className }: { name: string; size?: number; className?: string }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d={ICON_PATHS[name] ?? ICON_PATHS.milestone} />
  </svg>;
}