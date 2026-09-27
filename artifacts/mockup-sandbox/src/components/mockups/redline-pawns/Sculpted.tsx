import './_group.css';
import './sculpted.css';
import type { CSSProperties } from 'react';
import { PawnFallback } from './_shared/pawn-fallback';
import { pawnCatalog } from './Gallery';

const rimLights: Record<string, string> = {
  guardian_h: '#4bd9fa',
  click_click: '#f26bdd',
  frostbyte: '#71caff',
  sadman: '#a7ee78',
  rainbow_dash: '#ff9f58',
  accuser: '#ff536a',
  low_flame: '#ff7a3d',
  wandering_eye: '#fb7a57',
  the_rind: '#5cd8e8',
  anointed: '#ffd06a',
  executive_p: '#56d7e8',
  alpha_prime: '#78d7ea',
  roll_safe: '#f5a957',
  hotwired: '#ff5267',
  panic_bot: '#ff5f67',
  primate: '#e965d0',
  pain_hider: '#65d6e8',
  prom_king: '#b78cff',
  idol_core: '#f369d5',
  danger_zone: '#ff594e',
  the_tank: '#b99bfa',
};

export function Sculpted() {
  return (
    <main className="sculpted-gallery">
      <svg className="sculpted-gallery__filter-defs" aria-hidden="true">
        <defs>
          <filter id="sculpted-resin-finish" x="-24%" y="-20%" width="148%" height="145%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency=".48" numOctaves="2" seed="19" result="paint-grain" />
            <feColorMatrix in="paint-grain" type="saturate" values="0" result="soft-grain" />
            <feComponentTransfer in="soft-grain" result="matte-grain">
              <feFuncA type="table" tableValues="0 .13" />
            </feComponentTransfer>
            <feComposite in="matte-grain" in2="SourceAlpha" operator="in" result="surface-grain" />
            <feBlend in="SourceGraphic" in2="surface-grain" mode="soft-light" result="painted-surface" />
            <feDiffuseLighting in="SourceAlpha" surfaceScale="4.2" diffuseConstant=".48" lightingColor="#bdd8e5" result="edge-relief">
              <feDistantLight azimuth="228" elevation="57" />
            </feDiffuseLighting>
            <feComposite in="edge-relief" in2="SourceAlpha" operator="in" result="lit-relief" />
            <feBlend in="painted-surface" in2="lit-relief" mode="soft-light" result="sculpted-relief" />
            <feSpecularLighting in="SourceAlpha" surfaceScale="3.6" specularConstant=".5" specularExponent="21" lightingColor="#f1fbff" result="paint-glints">
              <feDistantLight azimuth="230" elevation="63" />
            </feSpecularLighting>
            <feComposite in="paint-glints" in2="SourceAlpha" operator="in" result="shape-glints" />
            <feBlend in="sculpted-relief" in2="shape-glints" mode="screen" />
          </filter>
        </defs>
      </svg>
      <header className="sculpted-gallery__header">
        <div className="sculpted-gallery__title">Redline Upgrade <span>//</span> Character pieces</div>
        <div className="sculpted-gallery__count"><i /> 21 unique pieces</div>
      </header>
      <section className="sculpted-gallery__grid" aria-label="Redline Upgrade collectible character miniatures">
        {pawnCatalog.map(([id, name], index) => (
          <article className="sculpted-gallery__tile" key={id} style={{ '--piece-rim': rimLights[id], '--piece-order': index } as CSSProperties}>
            <div className="sculpted-gallery__stage">
              <div className="sculpted-gallery__halo" />
              <PawnFallback characterId={id} />
              <span className="sculpted-gallery__index">{String(index + 1).padStart(2, '0')}</span>
            </div>
            <div className="sculpted-gallery__name">{name}</div>
          </article>
        ))}
      </section>
      <footer className="sculpted-gallery__footer">
        <span>Hand-finished units <b>·</b> Edition 01</span>
        <span>Display archive <b>—</b> 7 × 3</span>
      </footer>
    </main>
  );
}