import './archive-index.css';
import { Component, useMemo, useState, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { pawnCatalog } from './Gallery';
import { PawnModel } from './_shared/PawnModel3D';

const notes: Record<string, { description: string; role: string; finish: string }> = {
  guardian_h: { description: 'A frontline sentinel built like a door you cannot get through. The cyan core is a deliberate tell: protection, not stealth.', role: 'Vanguard', finish: 'Cold alloy' },
  click_click: { description: 'A nimble, noise-making troublemaker. Soft curves and bright hardware make it look friendlier than it is.', role: 'Disruptor', finish: 'Signal pink' },
  frostbyte: { description: 'An icebound unit with a faceted visor and crystal shoulder. Made to look like it has just stepped out of a server freezer.', role: 'Cryo scout', finish: 'Glacier glass' },
  sadman: { description: 'Quietly strange, with a pale chest panel and a face that gives away almost nothing. The archive’s reluctant witness.', role: 'Observer', finish: 'Verdigris' },
  rainbow_dash: { description: 'A long-bodied courier caught mid-sprint. The trailing color bars are the only warning before it disappears.', role: 'Runner', finish: 'Prismatic enamel' },
  accuser: { description: 'A hard-eyed investigator carrying a needle-thin case file. Its red-lit chest marks the evidence, not the suspect.', role: 'Inquisitor', finish: 'Oxide red' },
  low_flame: { description: 'A compact fire spirit, all rising edges and restless color. Its base is nearly swallowed by its own silhouette.', role: 'Ember class', finish: 'Kiln glaze' },
  wandering_eye: { description: 'One oversized lens tracks the room while the rest of the body follows much later. Difficult to surprise; impossible to ignore.', role: 'Sentinel', finish: 'Amethyst glass' },
  the_rind: { description: 'Heavy plating hides a bright, almost citrus-colored core. A relic of the first armored build in the Redline workshop.', role: 'Bulwark', finish: 'Brushed brass' },
  anointed: { description: 'A formal, crown-bearing machine with concentric halo work. Ceremonial on the surface; entirely operational beneath it.', role: 'Sovereign', finish: 'Gilt ceramic' },
  executive_p: { description: 'A boardroom tactician whose briefcase is probably not a briefcase. The sharp suit is armor by another name.', role: 'Strategist', finish: 'Graphite / chrome' },
  alpha_prime: { description: 'Broad-shouldered and unmistakably first-generation. Its proportions were never corrected; that is precisely the point.', role: 'Prototype', finish: 'Mauve steel' },
  roll_safe: { description: 'A vault with a grin. Five candy-bright forms crown the armored body, turning a security unit into a walking contradiction.', role: 'Lockbox', finish: 'Candy lacquer' },
  hotwired: { description: 'Exposed cables, red eye-lights, no obvious off switch. Recovered from a workshop bench before the paint had dried.', role: 'Saboteur', finish: 'Worn nickel' },
  panic_bot: { description: 'Two antennae, one flashing warning, and a stance that says the warning might be about itself.', role: 'Alarm unit', finish: 'Emergency red' },
  primate: { description: 'An old-world silhouette translated into a hard-surface figure. Its calm face does not promise a calm encounter.', role: 'Wild card', finish: 'Violet alloy' },
  pain_hider: { description: 'A small, sealed figure with a bright center held just out of reach. The workshop notes simply read: “do not open.”', role: 'Unknown', finish: 'Arctic enamel' },
  prom_king: { description: 'A crown, a suit, and a carefully composed expression. The ceremonial favorite of the first Redline release.', role: 'Ceremonial', finish: 'Violet / ivory' },
  idol_core: { description: 'A luminous stage presence built around a jewel-like core. Every surface is designed to catch a second look.', role: 'Icon', finish: 'Rose quartz' },
  danger_zone: { description: 'The warning label became the character. Red chevrons, a rigid stance, and no attempt to reassure you.', role: 'Hazard', finish: 'Signal enamel' },
  the_tank: { description: 'Dense, low, and stubbornly unadorned. A rare figure whose silhouette says everything before the details do.', role: 'Heavy unit', finish: 'Stone titanium' },
};

const accents: Record<string, string> = {
  guardian_h: '#4bd9fa', click_click: '#f26bdd', frostbyte: '#71caff', sadman: '#a7ee78',
  rainbow_dash: '#ff9f58', accuser: '#ff536a', low_flame: '#ff7a3d', wandering_eye: '#fb7a57',
  the_rind: '#5cd8e8', anointed: '#ffd06a', executive_p: '#56d7e8', alpha_prime: '#78d7ea',
  roll_safe: '#f5a957', hotwired: '#ff5267', panic_bot: '#ff5f67', primate: '#e965d0',
  pain_hider: '#65d6e8', prom_king: '#b78cff', idol_core: '#f369d5', danger_zone: '#ff594e',
  the_tank: '#b99bfa',
};

function supportsWebGL() {
  if (typeof document === 'undefined') return false;
  try {
    const probe = document.createElement('canvas');
    const context = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!context) return false;
    context.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

function ArchivePawn({ characterId, spin }: { characterId: string; spin: number }) {
  return (
    <group rotation={[0, spin, 0]} position={[0, -1.42, 0]} scale={1.05}>
      <PawnModel characterId={characterId} selected />
    </group>
  );
}

function FallbackSpecimen({ characterId, spin }: { characterId: string; spin: number }) {
  const tone = accents[characterId] || '#4bd9fa';
  return (
    <div className="archive-index__fallback">
      <svg
        className="archive-index__fallback-figure"
        viewBox="0 0 360 360"
        role="img"
        aria-label="Stylized collectible figure on its display plinth"
        style={{ transform: `perspective(700px) rotateY(${spin}rad)` }}
      >
        <defs>
          <linearGradient id="archive-metal" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#68747a"/><stop offset=".48" stopColor="#29343b"/><stop offset="1" stopColor="#131d23"/></linearGradient>
          <linearGradient id="archive-face" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#f2ede2"/><stop offset="1" stopColor="#c4c4b8"/></linearGradient>
          <linearGradient id="archive-base" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#404a4f"/><stop offset="1" stopColor="#1b252b"/></linearGradient>
        </defs>
        <ellipse cx="180" cy="310" rx="94" ry="19" fill="#18242a" opacity=".12"/>
        <ellipse cx="180" cy="292" rx="82" ry="19" fill="#141e24"/>
        <path d="M98 292v13c0 10 37 19 82 19s82-9 82-19v-13" fill="url(#archive-base)" stroke="#7e8888" strokeWidth="2"/>
        <ellipse cx="180" cy="292" rx="82" ry="19" fill="url(#archive-base)" stroke="#96a09a" strokeWidth="2"/>
        <ellipse cx="180" cy="291" rx="57" ry="11" fill="none" stroke={tone} strokeWidth="3" opacity=".9"/>
        <path d="M157 277h46l-5-18h-36z" fill="#313d43" stroke="#77817f" strokeWidth="2"/>
        <path d="M143 250 132 270l23 8h50l23-8-11-20z" fill="#1b252c" stroke="#667174" strokeWidth="2"/>
        <path d="M148 226 126 230l-11 31 22 6 18-25zM212 226l22 4 11 31-22 6-18-25z" fill="url(#archive-metal)" stroke="#798380" strokeWidth="2"/>
        <path d="m143 244 11-20 13 9-5 22-19 4zM217 244l-11-20-13 9 5 22 19 4z" fill={tone} opacity=".82"/>
        <path d="m146 189-20 3-6 38 20 11 12-28zM214 189l20 3 6 38-20 11-12-28z" fill="url(#archive-metal)" stroke="#87908a" strokeWidth="2"/>
        <path d="m136 218 13 5-5 19-18-5zM224 218l-13 5 5 19 18-5z" fill={tone} opacity=".9"/>
        <path d="m149 157 31-12 31 12 9 66-24 23h-32l-24-23z" fill="url(#archive-metal)" stroke="#909994" strokeWidth="2"/>
        <path d="m157 179 23-9 23 9 3 34-13 15h-26l-13-15z" fill="#151f25" stroke="#5d696e" strokeWidth="2"/>
        <path d="m167 189 13-4 13 4v19h-26z" fill={tone} opacity=".9"/>
        <path d="m173 193 7-2 7 2v10h-14z" fill="#e9e5d9" opacity=".75"/>
        <path d="M145 133 151 97l29-15 29 15 6 36-13 24h-44z" fill="url(#archive-metal)" stroke="#9ba39d" strokeWidth="2"/>
        <path d="m157 119 9-11h28l9 11-5 15h-36z" fill="#131e24" stroke="#75817f" strokeWidth="2"/>
        <path d="M163 119h34v7h-34z" fill={tone}/>
        <path d="M170 139h20l-4 6h-12z" fill="#98a19a"/>
        <path d="m146 104-16-11-7 37 20 6zM214 104l16-11 7 37-20 6z" fill="#303c42" stroke="#7e8884" strokeWidth="2"/>
        <path d="m144 155-15-5-5 15 19 8zM216 155l15-5 5 15-19 8z" fill={tone}/>
        <path d="m154 159 9-7m43 7-9-7M158 227h44" stroke="#aab1a8" strokeWidth="2" opacity=".55"/>
        <circle cx="126" cy="261" r="3" fill={tone}/><circle cx="234" cy="261" r="3" fill={tone}/>
      </svg>
    </div>
  );
}

interface BoundaryState { failed: boolean }
class WebGLBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, BoundaryState> {
  state: BoundaryState = { failed: false };
  static getDerivedStateFromError(): BoundaryState { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export function ArchiveIndex() {
  const [webgl] = useState(supportsWebGL);
  const [activeId, setActiveId] = useState<string>(pawnCatalog[0][0]);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'all' | 'saved'>('all');
  const [saved, setSaved] = useState<string[]>([]);
  const [spin, setSpin] = useState(0);
  const activeIndex = pawnCatalog.findIndex(([id]) => id === activeId);
  const active = pawnCatalog[activeIndex];
  const note = notes[activeId];
  const visiblePawns = useMemo(() => pawnCatalog.filter(([id, name]) => {
    const matchesName = name.toLowerCase().includes(query.trim().toLowerCase());
    return matchesName && (mode === 'all' || saved.includes(id));
  }), [query, mode, saved]);

  const selectNext = (direction: number) => {
    const next = (activeIndex + direction + pawnCatalog.length) % pawnCatalog.length;
    setActiveId(pawnCatalog[next][0]);
  };

  const toggleSaved = () => {
    setSaved((current) => current.includes(activeId)
      ? current.filter((id) => id !== activeId)
      : [...current, activeId]);
  };

  return (
    <main className="archive-index">
      <header className="archive-index__topbar">
        <div className="archive-index__brand">
          <span className="archive-index__mark">R/</span>
          <span>Redline Upgrade</span>
          <span className="archive-index__brand-sep">/</span>
          <span>Object archive</span>
        </div>
        <div className="archive-index__edition">Release 01&nbsp; · &nbsp;21 hand-finished objects</div>
      </header>

      <div className="archive-index__workspace">
        <aside className="archive-index__catalog" aria-label="Archive catalogue">
          <div className="archive-index__section-head">
            <h2 className="archive-index__section-title">The register</h2>
            <span className="archive-index__tiny">{visiblePawns.length.toString().padStart(2, '0')} / 21</span>
          </div>
          <label className="archive-index__search">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="6.8" cy="6.8" r="4.5" stroke="currentColor" strokeWidth="1.3"/><path d="m10.2 10.2 3.3 3.3" stroke="currentColor" strokeWidth="1.3"/></svg>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a piece" aria-label="Find a collectible pawn" />
          </label>
          <div className="archive-index__filters" role="group" aria-label="Catalogue filter">
            <button className={`archive-index__filter ${mode === 'all' ? 'is-active' : ''}`} type="button" onClick={() => setMode('all')}>All pieces</button>
            <button className={`archive-index__filter ${mode === 'saved' ? 'is-active' : ''}`} type="button" onClick={() => setMode('saved')}>Shortlist · {saved.length}</button>
          </div>
          <div className="archive-index__list">
            {visiblePawns.length ? visiblePawns.map(([id, name]) => {
              const index = pawnCatalog.findIndex(([candidate]) => candidate === id);
              return (
                <button
                  className={`archive-index__record ${activeId === id ? 'is-selected' : ''}`}
                  key={id}
                  type="button"
                  aria-current={activeId === id ? 'true' : undefined}
                  onClick={() => setActiveId(id)}
                >
                  <span className="archive-index__number">{String(index + 1).padStart(2, '0')}</span>
                  <span className="archive-index__record-name">{name}</span>
                  {saved.includes(id) && <span className="archive-index__record-state" aria-label="Shortlisted" />}
                </button>
              );
            }) : (
              <div className="archive-index__empty">
                {mode === 'saved' && query.length === 0
                  ? <>Nothing on the shortlist yet.<br />Save a piece to keep it here.</>
                  : <>No pieces match that search.<br /><button type="button" onClick={() => { setQuery(''); setMode('all'); }}>Clear the filters</button></>}
              </div>
            )}
          </div>
        </aside>

        <section className="archive-index__showcase" aria-label="Selected collectible">
          <div className="archive-index__showcase-head">
            <span className="archive-index__eyebrow">Specimen / {String(activeIndex + 1).padStart(2, '0')}</span>
            <span className="archive-index__tiny archive-index__edition-tag">Sculpture study&nbsp; · &nbsp;Edition 01</span>
          </div>
          <div className="archive-index__stage">
            <span className="archive-index__stage-index">R/01&nbsp; — &nbsp;FRONT ELEVATION</span>
            {webgl ? (
              <WebGLBoundary fallback={<FallbackSpecimen characterId={activeId} spin={spin} />}>
                <Canvas
                  className="archive-index__model"
                  orthographic
                  camera={{ position: [0, 0, 24], zoom: 100, near: 0.1, far: 60 }}
                  dpr={[1, 1.5]}
                  gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
                  onCreated={({ gl }) => gl.setClearColor('#000000', 0)}
                >
                  <ambientLight intensity={0.76} color="#dbe4e1" />
                  <hemisphereLight args={['#f0ede3', '#49545c', 0.9]} />
                  <directionalLight position={[-5, 8, 9]} intensity={2.15} color="#fff4df" />
                  <directionalLight position={[5, 3, -4]} intensity={0.65} color="#f16c55" />
                  <pointLight position={[0, -3, 5]} intensity={0.38} distance={14} color="#83b8b5" />
                  <ArchivePawn characterId={activeId} spin={spin} />
                </Canvas>
              </WebGLBoundary>
            ) : <FallbackSpecimen characterId={activeId} spin={spin} />}
            <span className="archive-index__stage-label">Rotate to inspect</span>
            <div className="archive-index__turn">
              <button className="archive-index__icon-button" type="button" aria-label="Turn figure left" onClick={() => setSpin((value) => value - Math.PI / 3)}>
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6.1 3.1 2.8 6.4l3.3 3.3M3.1 6.4h6a3.8 3.8 0 1 1-3.8 3.8" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <button className="archive-index__icon-button" type="button" aria-label="Reset figure view" onClick={() => setSpin(0)}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.2 5.5A5 5 0 1 1 2.8 8M3 2.8v2.9h2.9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <button className="archive-index__icon-button" type="button" aria-label="Turn figure right" onClick={() => setSpin((value) => value + Math.PI / 3)}>
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m9.9 3.1 3.3 3.3-3.3 3.3m3-3.3h-6a3.8 3.8 0 1 0 3.8 3.8" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          </div>
          <div className="archive-index__showcase-bottom">
            <h1 className="archive-index__piece-name">{active[1]}</h1>
            <span className="archive-index__piece-id">R/01 — {String(activeIndex + 1).padStart(2, '0')}</span>
          </div>
          <div className="archive-index__pager">
            <button type="button" onClick={() => selectNext(-1)} aria-label="Previous collectible">
              <span aria-hidden="true">←</span> Previous
            </button>
            <button type="button" onClick={() => selectNext(1)} aria-label="Next collectible">
              Next <span aria-hidden="true">→</span>
            </button>
          </div>
        </section>

        <aside className="archive-index__inspector" aria-label="Specimen notes">
          <div className="archive-index__inspector-top">
            <h2 className="archive-index__inspector-title">Field notes</h2>
            <span className="archive-index__tiny">No. {String(activeIndex + 1).padStart(2, '0')}</span>
          </div>
          <div className="archive-index__detail">
            <span className="archive-index__meta-label">Workshop note</span>
            <p className="archive-index__description">{note.description}</p>
          </div>
          <div className="archive-index__detail archive-index__spec">
            <div>
              <span className="archive-index__meta-label">Classification</span>
              <span className="archive-index__spec-value">{note.role}</span>
            </div>
            <div>
              <span className="archive-index__meta-label">Surface</span>
              <span className="archive-index__spec-value">{note.finish}</span>
            </div>
          </div>
          <button className={`archive-index__save ${saved.includes(activeId) ? 'is-saved' : ''}`} type="button" onClick={toggleSaved}>
            <span>{saved.includes(activeId) ? 'Saved to shortlist' : 'Add to shortlist'}</span>
            <span aria-hidden="true">{saved.includes(activeId) ? '✓' : '+'}</span>
          </button>
          <span className="archive-index__shortlist-note">
            {saved.length ? `${saved.length} ${saved.length === 1 ? 'piece' : 'pieces'} held in your local shortlist` : 'Shortlist is saved for this visit'}
          </span>
        </aside>
      </div>

      <footer className="archive-index__footer">
        <span className="archive-index__foot">Redline Upgrade <span>·</span> Object archive</span>
        <span className="archive-index__foot">A closer look at the first release</span>
      </footer>
    </main>
  );
}

export default ArchiveIndex;