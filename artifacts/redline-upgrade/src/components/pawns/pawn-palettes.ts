export type BioPawnPalette = Readonly<{
  body: string;
  trim: string;
  accent: string;
}>;

/** Character-specific colors sampled and art-directed from the Bio portrait set. */
export const BIO_PAWN_PALETTES: Readonly<Record<string, BioPawnPalette>> = {
  accuser: { body: '#33284D', trim: '#A78BFA', accent: '#D8B4FE' },
  alpha_prime: { body: '#1E3A8A', trim: '#38BDF8', accent: '#93C5FD' },
  anointed: { body: '#3B2B27', trim: '#FB923C', accent: '#FDE68A' },
  click_click: { body: '#123B3C', trim: '#14B8A6', accent: '#F472B6' },
  danger_zone: { body: '#641B3D', trim: '#FB7185', accent: '#FDBA74' },
  rainbow_dash: { body: '#3D1F59', trim: '#E879F9', accent: '#A3E635' },
  executive_p: { body: '#303A46', trim: '#B45309', accent: '#FBBF24' },
  frostbyte: { body: '#1C3E65', trim: '#60A5FA', accent: '#CFFAFE' },
  guardian_h: { body: '#172B52', trim: '#D6A36A', accent: '#FCA5A5' },
  hotwired: { body: '#5B2217', trim: '#F97316', accent: '#FACC15' },
  idol_core: { body: '#3D184F', trim: '#EC4899', accent: '#C4B5FD' },
  low_flame: { body: '#3C3321', trim: '#D97706', accent: '#FEF08A' },
  pain_hider: { body: '#35434A', trim: '#22D3EE', accent: '#F59E0B' },
  panic_bot: { body: '#321B5C', trim: '#8B5CF6', accent: '#67E8F9' },
  primate: { body: '#3B4A2A', trim: '#65A30D', accent: '#D9F99D' },
  prom_king: { body: '#3B255E', trim: '#C084FC', accent: '#EAB308' },
  the_rind: { body: '#3B2247', trim: '#2DD4BF', accent: '#F9A8D4' },
  roll_safe: { body: '#263D3C', trim: '#0F766E', accent: '#FEA07A' },
  sadman: { body: '#3A2A59', trim: '#7C3AED', accent: '#A5F3FC' },
  the_tank: { body: '#3C3028', trim: '#EA580C', accent: '#FDA4AF' },
  wandering_eye: { body: '#1D4051', trim: '#0891B2', accent: '#FCD34D' },
};

export const BIO_PAWN_COLORS: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(BIO_PAWN_PALETTES).map(([id, palette]) => [id, palette.accent]),
);

export const STANDARD_PAWN_COLORS = [
  '#4ad9e8', '#ff5a63', '#e9b65c', '#f070c8', '#a9e77b', '#af91ee', '#ff9a57', '#9ff4ff',
  '#55dce9', '#ff626b', '#ecc16e', '#f17bd1', '#b0e581', '#ba9ff2', '#ffa568', '#baf7fa',
] as const;

export const BIO_PAWN_BASE = {
  shadow: '#171322',
  edge: '#554465',
  body: '#271e35',
  highlight: '#c9b7dc',
} as const;

const allBioColors = Object.values(BIO_PAWN_PALETTES).flatMap(({ body, trim, accent }) => [body, trim, accent]);
if (Object.keys(BIO_PAWN_PALETTES).length !== 21 || new Set(allBioColors).size !== 63) {
  throw new Error('Bio pawn palettes must define 21 characters with 63 distinct palette colors.');
}
