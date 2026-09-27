import './_group.css';
import { PawnFallback } from './_shared/pawn-fallback';
import { Gallery } from './Gallery';

export function Current() {
  return <Gallery Pawn={PawnFallback} eyebrow="Current build / pawn renderer" />;
}