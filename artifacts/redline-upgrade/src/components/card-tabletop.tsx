import { useEffect, useState } from 'react';
import { examplesForDeck, getCard, type CardDefinition } from '@/game/cards';
import { decks, getDeck, type DeckId } from '@/game/decks';
import { RedlineCard } from './redline-card';

type Props = { activeDeck?: DeckId; activeCardId?: string; onAcknowledge?: () => void; isCPU?: boolean };

export function CardTabletop({ activeDeck, activeCardId, onAcknowledge, isCPU = false }: Props) {
  const [preview, setPreview] = useState<DeckId | null>(null);
  const [drawn, setDrawn] = useState<CardDefinition | null>(null);
  const [exampleIndex, setExampleIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => { setPreview(null); setDrawn(null); setRevealed(false); }, [activeDeck, activeCardId]);

  const draw = (deck: DeckId) => {
    const examples = examplesForDeck(deck);
    const next = examples[exampleIndex % examples.length];
    setExampleIndex(value => value + 1);
    setPreview(deck);
    setDrawn(next);
  };
  const chosen = preview;
  const displayed = chosen ? getDeck(chosen) : null;
  const activeCard = activeCardId ? getCard(activeCardId) ?? null : null;
  return (
    <>
      {activeDeck && (
        <section className="card-draw-panel" aria-label={`${getDeck(activeDeck).name} card draw`} data-testid="section-card-draw">
          <div className="card-draw-copy">
            <span className="eyebrow">CARD SPACE / {getDeck(activeDeck).serial}</span>
            <h2>{revealed && activeCard ? 'Card revealed.' : 'Draw your card.'}</h2>
            <p>{revealed && activeCard ? activeCard.description : `The ${getDeck(activeDeck).name} deck is ready. Draw to reveal the active card.`}</p>
          </div>
          <div className={`card-draw-stage ${revealed && activeCard ? 'revealed' : ''}`} key={activeCard?.id ?? activeDeck}>
            <RedlineCard deck={activeDeck} face={revealed && activeCard ? 'front' : 'back'} card={revealed && activeCard ? activeCard : undefined} />
          </div>
          <div className="card-draw-action">
            {isCPU ? <p>CPU DRAW IN PROGRESS // BOARD PAUSED</p> : revealed && activeCard
              ? <button type="button" className="action lime-action" onClick={onAcknowledge} data-testid="button-acknowledge-card">CONTINUE RUN <span aria-hidden="true">↗</span></button>
              : <button type="button" className="action" onClick={() => setRevealed(true)} data-testid="button-draw-card">DRAW CARD <span aria-hidden="true">↗</span></button>}
            <p>{revealed && activeCard ? activeCard.effect : 'ACTIVE CARD / EFFECT APPLIES ON CONTINUE'}</p>
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
              <div><p className="tabletop-preview-count">{displayed.count} CARDS / ACTIVE SET</p><p>Previewing here does not change the current match.</p><button className="action secondary" type="button" onClick={() => draw(displayed.id)} data-testid={`button-preview-draw-${displayed.id}`}>DRAW PREVIEW <span aria-hidden="true">↗</span></button></div>
            </div>
            {drawn?.deck === displayed.id && <div className="tabletop-preview-content"><RedlineCard deck={displayed.id} face="front" card={drawn} /><p>PREVIEW ONLY<br />{drawn.title}: {drawn.value}<br />Deck preview does not change gameplay.</p></div>}
          </div>
        )}
      </aside>
    </>
  );
}