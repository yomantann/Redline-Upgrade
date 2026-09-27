import { useEffect, useState } from 'react';
import { examplesForDeck, type CardDefinition } from '@/game/cards';
import { decks, getDeck, type DeckId } from '@/game/decks';
import { RedlineCard } from './redline-card';

type Props = { activeDeck?: DeckId; onAcknowledge?: () => void; isCPU?: boolean };

export function CardTabletop({ activeDeck, onAcknowledge, isCPU = false }: Props) {
  const [preview, setPreview] = useState<DeckId | null>(null);
  const [drawn, setDrawn] = useState<CardDefinition | null>(null);
  const [exampleIndex, setExampleIndex] = useState(0);

  useEffect(() => { setPreview(null); setDrawn(null); }, [activeDeck]);

  const draw = (deck: DeckId) => {
    const examples = examplesForDeck(deck);
    const next = examples[exampleIndex % examples.length];
    setExampleIndex(value => value + 1);
    setPreview(deck);
    setDrawn(next);
  };
  const chosen = preview;
  const displayed = chosen ? getDeck(chosen) : null;
  return (
    <>
      {activeDeck && (
        <section className="card-draw-panel" aria-label={`${getDeck(activeDeck).name} card draw`} data-testid="section-card-draw">
          <div className="card-draw-copy">
            <span className="eyebrow">CARD SPACE / {getDeck(activeDeck).serial}</span>
            <h2>{drawn?.deck === activeDeck ? 'Card revealed.' : 'Draw your card.'}</h2>
            <p>{drawn?.deck === activeDeck ? 'This is a presentation-only example. No stats or wealth have changed.' : `The ${getDeck(activeDeck).name} deck is ready. Draw to reveal an example card.`}</p>
          </div>
          <div className={`card-draw-stage ${drawn?.deck === activeDeck ? 'revealed' : ''}`} key={drawn?.id ?? activeDeck}>
            <RedlineCard deck={activeDeck} face={drawn?.deck === activeDeck ? 'front' : 'back'} card={drawn?.deck === activeDeck ? drawn : undefined} />
          </div>
          <div className="card-draw-action">
            {isCPU ? <p>CPU DRAW IN PROGRESS // BOARD PAUSED</p> : drawn?.deck === activeDeck
              ? <button type="button" className="action lime-action" onClick={onAcknowledge} data-testid="button-acknowledge-card">CONTINUE RUN <span aria-hidden="true">↗</span></button>
              : <button type="button" className="action" onClick={() => draw(activeDeck)} data-testid="button-draw-card">DRAW CARD <span aria-hidden="true">↗</span></button>}
            <p>EXAMPLE EFFECT ONLY / NON-ACTIVE</p>
          </div>
        </section>
      )}
      <aside className="tabletop-decks" aria-label="Card decks beside the board">
        <div className="tabletop-decks-head"><div><span className="eyebrow">TABLETOP / DECK BAY</span><h2>Six ways forward.</h2></div><span className="mono">06 DECKS</span></div>
        <div className="tabletop-decks-grid">
          {decks.map(deck => (
            <button className={`tabletop-deck ${activeDeck === deck.id ? 'active' : ''}`} type="button" key={deck.id} onClick={() => { setPreview(deck.id); if (drawn?.deck !== deck.id) setDrawn(null); }} aria-pressed={activeDeck === deck.id} data-testid={`button-preview-deck-${deck.id}`}>
              <RedlineCard deck={deck.id} />
              <div className="tabletop-deck-caption"><span>{deck.name}</span><span>{deck.count.toString().padStart(2, '0')}</span></div>
            </button>
          ))}
        </div>
        {displayed && (
          <div className="tabletop-preview" data-testid={`section-deck-preview-${displayed.id}`}>
            <div className="tabletop-preview-head"><div><span className="mono" style={{ color: displayed.color }}>DECK FILE / {displayed.serial}</span><h3>{displayed.name}</h3></div><button type="button" onClick={() => setPreview(null)} aria-label="Close deck preview" data-testid="button-close-deck-preview">×</button></div>
            <p>{displayed.description}</p>
            <div className="tabletop-preview-content">
              <RedlineCard deck={displayed.id} />
              <div><p className="tabletop-preview-count">{displayed.count} CARDS / COUNT PLACEHOLDER</p><p>Two representative fronts are available. Drawing here is a visual preview only.</p><button className="action secondary" type="button" onClick={() => draw(displayed.id)} data-testid={`button-preview-draw-${displayed.id}`}>DRAW EXAMPLE <span aria-hidden="true">↗</span></button></div>
            </div>
            {drawn?.deck === displayed.id && <div className="tabletop-preview-content"><RedlineCard deck={displayed.id} face="front" card={drawn} /><p>EXAMPLE / NON-ACTIVE<br />{drawn.title}: {drawn.value}<br />No gameplay effect applied.</p></div>}
          </div>
        )}
      </aside>
    </>
  );
}