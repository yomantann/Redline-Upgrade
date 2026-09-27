import type { ComponentType } from 'react';
import type { PawnFallbackProps } from './_shared/pawn-fallback';

export const pawnCatalog = [
  ['guardian_h', 'Guardian H'], ['click_click', 'Click Click'], ['frostbyte', 'Frostbyte'],
  ['sadman', 'Sadman'], ['rainbow_dash', 'Rainbow Dash'], ['accuser', 'Accuser'],
  ['low_flame', 'Low Flame'], ['wandering_eye', 'Wandering Eye'], ['the_rind', 'The Rind'],
  ['anointed', 'Anointed'], ['executive_p', 'Executive P'], ['alpha_prime', 'Alpha Prime'],
  ['roll_safe', 'Roll Safe'], ['hotwired', 'Hotwired'], ['panic_bot', 'Panic Bot'],
  ['primate', 'Primate'], ['pain_hider', 'Pain Hider'], ['prom_king', 'Prom King'],
  ['idol_core', 'Idol Core'], ['danger_zone', 'Danger Zone'], ['the_tank', 'The Tank'],
] as const;

export function Gallery({
  Pawn,
  eyebrow,
}: {
  Pawn: ComponentType<PawnFallbackProps>;
  eyebrow: string;
}) {
  return (
    <main className="redline-pawn-gallery">
      <header className="redline-pawn-gallery__header">
        <span>{eyebrow}</span>
        <span>21 unique pieces</span>
      </header>
      <section className="redline-pawn-gallery__grid" aria-label="Redline character pieces">
        {pawnCatalog.map(([id, name]) => (
          <article className="redline-pawn-gallery__tile" key={id}>
            <div className="redline-pawn-gallery__stage">
              <Pawn characterId={id} />
            </div>
            <div className="redline-pawn-gallery__name">{name}</div>
          </article>
        ))}
      </section>
    </main>
  );
}