export type HauntedPawnDesign = Readonly<{
  accent: string;
  body: 'wraith' | 'armor' | 'beast' | 'doll' | 'machine' | 'winged' | 'reliquary';
  face: 'skull' | 'hood' | 'cat' | 'ice' | 'mask' | 'lantern' | 'eye' | 'gear' | 'crown';
  relic: 'shield' | 'bells' | 'shard' | 'lantern' | 'feather' | 'scales' | 'flame' | 'telescope' | 'cleaver' | 'halo' | 'ledger' | 'reactor' | 'dice' | 'wrench' | 'siren' | 'chain' | 'vial' | 'scepter' | 'microphone' | 'spear' | 'tombstone';
}>;

/** Bespoke Haunted silhouettes: each identity owns a different sculpt, face, relic, and accent. */
export const HAUNTED_PAWN_DESIGNS: Readonly<Record<string, HauntedPawnDesign>> = {
  guardian_h: { accent: '#7fc6b7', body: 'armor', face: 'hood', relic: 'shield' },
  click_click: { accent: '#e58bb9', body: 'beast', face: 'cat', relic: 'bells' },
  frostbyte: { accent: '#8dd8ed', body: 'wraith', face: 'ice', relic: 'shard' },
  sadman: { accent: '#9ab8aa', body: 'wraith', face: 'skull', relic: 'lantern' },
  rainbow_dash: { accent: '#f0a56b', body: 'winged', face: 'mask', relic: 'feather' },
  accuser: { accent: '#d67a74', body: 'reliquary', face: 'mask', relic: 'scales' },
  low_flame: { accent: '#e5a34f', body: 'doll', face: 'lantern', relic: 'flame' },
  wandering_eye: { accent: '#81bdd0', body: 'machine', face: 'eye', relic: 'telescope' },
  the_rind: { accent: '#89aa8a', body: 'beast', face: 'skull', relic: 'cleaver' },
  anointed: { accent: '#d1b773', body: 'reliquary', face: 'crown', relic: 'halo' },
  executive_p: { accent: '#a8a4b8', body: 'doll', face: 'mask', relic: 'ledger' },
  alpha_prime: { accent: '#8bb4d7', body: 'machine', face: 'gear', relic: 'reactor' },
  roll_safe: { accent: '#d7a06f', body: 'wraith', face: 'skull', relic: 'dice' },
  hotwired: { accent: '#dc795c', body: 'machine', face: 'gear', relic: 'wrench' },
  panic_bot: { accent: '#c18bc2', body: 'machine', face: 'lantern', relic: 'siren' },
  primate: { accent: '#b89572', body: 'beast', face: 'skull', relic: 'chain' },
  pain_hider: { accent: '#9cb9b3', body: 'doll', face: 'hood', relic: 'vial' },
  prom_king: { accent: '#c18cc8', body: 'armor', face: 'crown', relic: 'scepter' },
  idol_core: { accent: '#e28ebb', body: 'winged', face: 'lantern', relic: 'microphone' },
  danger_zone: { accent: '#e58369', body: 'armor', face: 'mask', relic: 'spear' },
  the_tank: { accent: '#c29a7d', body: 'reliquary', face: 'skull', relic: 'tombstone' },
};

const uniqueDesigns = new Set(Object.values(HAUNTED_PAWN_DESIGNS)
  .map(design => `${design.body}:${design.face}:${design.relic}:${design.accent}`));
if (Object.keys(HAUNTED_PAWN_DESIGNS).length !== 21 || uniqueDesigns.size !== 21) {
  throw new Error('Haunted pawns must define 21 unique character-specific designs.');
}
