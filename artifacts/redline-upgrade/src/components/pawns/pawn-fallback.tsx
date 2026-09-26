import { useId } from 'react';

export interface PawnFallbackProps {
  characterId: string;
  selected?: boolean;
}

type Kind = 'brute' | 'swift' | 'soldier' | 'robot';
type Face = 'animal' | 'human' | 'helmet' | 'alien' | 'robot';
type Look = { accent: string; kind: Kind; face: Face };

const C = {
  cyan: '#55dce9', red: '#ff626b', gold: '#ecc16e', pink: '#f17bd1',
  lime: '#b0e581', violet: '#ba9ff2', orange: '#ffa568',
  steel: '#8396a4', dark: '#18232d', light: '#c5d1d2',
};

const looks: Record<string, Look> = {
  guardian_h: { accent: C.cyan, kind: 'brute', face: 'animal' },
  click_click: { accent: C.pink, kind: 'swift', face: 'animal' },
  frostbyte: { accent: C.cyan, kind: 'soldier', face: 'helmet' },
  sadman: { accent: C.lime, kind: 'soldier', face: 'alien' },
  rainbow_dash: { accent: C.orange, kind: 'swift', face: 'robot' },
  accuser: { accent: C.red, kind: 'soldier', face: 'human' },
  low_flame: { accent: C.orange, kind: 'brute', face: 'animal' },
  wandering_eye: { accent: C.orange, kind: 'soldier', face: 'helmet' },
  the_rind: { accent: C.cyan, kind: 'swift', face: 'helmet' },
  anointed: { accent: C.gold, kind: 'soldier', face: 'helmet' },
  executive_p: { accent: C.cyan, kind: 'soldier', face: 'human' },
  alpha_prime: { accent: C.cyan, kind: 'brute', face: 'human' },
  roll_safe: { accent: C.orange, kind: 'soldier', face: 'human' },
  hotwired: { accent: C.red, kind: 'swift', face: 'human' },
  panic_bot: { accent: C.red, kind: 'robot', face: 'robot' },
  primate: { accent: C.pink, kind: 'brute', face: 'animal' },
  pain_hider: { accent: C.cyan, kind: 'soldier', face: 'human' },
  prom_king: { accent: C.violet, kind: 'soldier', face: 'human' },
  idol_core: { accent: C.pink, kind: 'swift', face: 'human' },
  danger_zone: { accent: C.red, kind: 'swift', face: 'human' },
  the_tank: { accent: C.violet, kind: 'brute', face: 'animal' },
};

function Wings({ accent }: { accent: string }) {
  return <g stroke="#718493" strokeWidth="3" strokeLinejoin="round">
    <path d="M99 158 62 125 37 108 52 147 76 164 95 174ZM151 158 188 125 213 108 198 147 174 164 155 174Z" fill="#344658" />
    <path d="m41 113 38 41 17 13M209 113l-38 41-17 13" fill="none" stroke={accent} strokeWidth="5" />
  </g>;
}
function Cape({ accent, regal = false }: { accent: string; regal?: boolean }) {
  return <g strokeLinejoin="round"><path d="M101 139Q81 149 71 184L52 253Q84 269 125 257q41 12 73-4l-19-69q-10-35-30-45Z" fill={regal ? '#503948' : '#273a4c'} stroke="#101b27" strokeWidth="5" />
    <path d="M53 251q72 23 144 0" fill="none" stroke={accent} strokeWidth="4" /></g>;
}
function Shield({ accent }: { accent: string }) {
  return <g transform="translate(36 174)" strokeLinejoin="round">
    <path d="M0-27 29-35 55-23 55 14Q48 45 27 57 5 46 0 13Z" fill="#1b2934" stroke="#8494a2" strokeWidth="5" />
    <path d="M8-18 29-24 46-15v27Q42 32 27 44 12 31 8 10Z" fill="#324654" stroke={accent} strokeWidth="3" />
    <path d="m27-8 11 15-11 17L16 7Z" fill={accent} />
  </g>;
}
function Crown({ accent }: { accent: string }) {
  return <g stroke="#17222d" strokeWidth="3" strokeLinejoin="round">
    <path d="M98 79 92 55l16 9 17-24 17 24 16-9-6 24Z" fill={accent} />
    <path d="M98 77h54v11H98Z" fill="#8b718c" />
    <path d="m125 68 5 7-5 7-5-7Z" fill={C.cyan} stroke="none" />
  </g>;
}
function Spikes({ accent, tall = false }: { accent: string; tall?: boolean }) {
  return <g fill={accent} stroke="#18232d" strokeWidth="3" strokeLinejoin="round">
    <path d={`M101 84 99 ${tall ? 42 : 61}l17 26ZM118 79l7 ${tall ? 34 : 53} 8 26ZM137 83l18 ${tall ? 49 : 62}-3 25Z`} />
  </g>;
}
function Antenna({ accent, both = false }: { accent: string; both?: boolean }) {
  return <g stroke="#7d91a2" strokeWidth="4" strokeLinecap="round">
    <path d="M149 90 163 55" /><circle cx="163" cy="54" r="7" fill={accent} stroke="none" />
    {both && <><path d="M101 90 87 55" /><circle cx="87" cy="54" r="7" fill={accent} stroke="none" /></>}
  </g>;
}
function Visor({ accent }: { accent: string }) {
  return <g><path d="M94 100q31-12 62 0l-5 19q-25 11-52 0Z" fill="#101a25" stroke="#687e8d" strokeWidth="3" />
    <path d="M101 107q24-7 48 0" fill="none" stroke={accent} strokeWidth="6" strokeLinecap="round" /></g>;
}
function BackDetails({ id, accent }: { id: string; accent: string }) {
  switch (id) {
    case 'click_click': case 'rainbow_dash': case 'idol_core': return <Wings accent={accent} />;
    case 'frostbyte': case 'the_rind': return <Cape accent={accent} />;
    case 'anointed': return <><Cape accent={accent} regal /><ellipse cx="125" cy="66" rx="44" ry="15" fill="none" stroke={C.cyan} strokeWidth="5" /></>;
    case 'low_flame': return <path d="M75 157Q83 84 125 75q42 9 50 82l-32-14h-36Z" fill="#283b4b" stroke="#111c28" strokeWidth="5" />;
    case 'hotwired': return <Spikes accent={C.orange} tall />;
    case 'primate': case 'danger_zone': return <Spikes accent={accent} />;
    case 'panic_bot': return <Antenna accent={accent} both />;
    case 'wandering_eye': return <Antenna accent={accent} />;
    case 'the_tank': return <path d="M74 104 55 76 82 87M176 104l19-28-27 11" fill="#697989" stroke="#18232d" strokeWidth="5" />;
    default: return null;
  }
}
function Body({ kind, accent, armorId, armId }: { kind: Kind; accent: string; armorId: string; armId: string }) {
  const brute = kind === 'brute', swift = kind === 'swift', bot = kind === 'robot';
  const outer = brute ? 69 : swift ? 88 : 79;
  return <g strokeLinejoin="round">
    {/* Split, articulated legs and wedge boots. */}
    <path d="M94 204h27l-6 55H91ZM129 204h27l3 55h-24Z" fill="#263642" stroke="#111b26" strokeWidth="5" />
    <path d="M90 250h27l4 20-42 1 3-12ZM133 250h27l12 21-43-1Z" fill="#1b2833" stroke="#728595" strokeWidth="3" />
    <path d="M92 238h24m19 0h24" stroke={accent} strokeWidth="4" />
    <path d={`M${outer + 13} 143Q${outer - 10} 139 ${outer - 15} 157l-7 48 9 17 21-1 10-57ZM${250 - outer - 13} 143q23-4 28 14l7 48-9 17-21-1-10-57Z`} fill={`url(#${armId})`} stroke="#14202b" strokeWidth="5" />
    <path d={`M${outer - 16} 148q-6 14-3 29l28 4 12-28-14-15ZM${266 - outer} 148q6 14 3 29l-28 4-12-28 14-15Z`} fill="#607484" stroke="#1a2732" strokeWidth="4" />
    <path d={`M100 136h50l${brute ? 28 : swift ? 16 : 21} 26-12 48q-32 17-82 0l-12-48Z`} fill={`url(#${armorId})`} stroke="#111b25" strokeWidth="6" />
    <path d="M104 146h42l13 19-10 36q-24 7-48 0l-10-36Z" fill="#334657" stroke="#8093a0" strokeWidth="2.5" />
    <path d="M107 152h36l8 12h-52Z" fill="#5d7383" />
    <path d="M105 184h40" stroke={accent} strokeWidth="5" strokeLinecap="round" />
    <path d="M110 209h30v9h-30Z" fill="#778a99" />
    <path d="M82 207h19v17H78ZM149 207h19l4 17h-23Z" fill="#172530" stroke="#738998" strokeWidth="3" />
    {bot && <><path d="M103 146h44v52h-44Z" fill="#344653" stroke="#91a5af" strokeWidth="3" /><circle cx="125" cy="171" r="13" fill="#182632" stroke={accent} strokeWidth="4" /><circle cx="125" cy="171" r="4" fill={accent} /></>}
  </g>;
}
function Head({ face, accent }: { face: Face; accent: string }) {
  return <g strokeLinejoin="round">
    <path d="M112 130h26v15h-26Z" fill="#60727e" stroke="#17222c" strokeWidth="4" />
    {face === 'robot'
      ? <path d="M96 83h58l8 15-7 31-29 9-30-9-8-31Z" fill="#354755" stroke="#14202a" strokeWidth="5" />
      : face === 'alien'
        ? <path d="M125 77q36 0 33 35-5 25-33 28-28-3-33-28-3-35 33-35Z" fill="#86aa91" stroke="#14232b" strokeWidth="5" />
        : face === 'animal'
          ? <path d="M86 103q-5-29 39-34 44 5 39 34l-11 30-28 9-28-9Z" fill="#5d6470" stroke="#19232d" strokeWidth="5" />
          : face === 'human'
            ? <path d="M95 93q5-20 30-20t30 20l-3 28q-12 21-27 22-15-1-27-22Z" fill="#bea995" stroke="#26303a" strokeWidth="5" />
            : <path d="M93 87q31-22 64 0l7 22-14 25-25 9-25-9-14-25Z" fill="#627787" stroke="#17232e" strokeWidth="5" />}
    {face === 'human' ? <>
      <path d="M97 94q28-18 56 0l-4-15q-23-20-48-2Z" fill="#263540" />
      <path d="M106 108h10m18 0h10" stroke={accent} strokeWidth="4" strokeLinecap="round" />
      <path d="m119 123 6 3 6-3" stroke="#634f50" strokeWidth="2" fill="none" />
    </> : face === 'alien' ? <>
      <path d="M99 104q12-7 21 3-2 12-16 10ZM151 104q-12-7-21 3 2 12 16 10Z" fill="#132b29" stroke={accent} strokeWidth="2" />
      <path d="M119 126h12" stroke="#385549" strokeWidth="2" />
    </> : face === 'animal' ? <>
      <path d="M99 108q10-5 18 2m16 0q8-7 18-2" stroke={accent} strokeWidth="5" strokeLinecap="round" />
      <path d="M109 119q16-8 32 0l-6 15h-20Z" fill="#83919a" stroke="#263442" strokeWidth="3" />
      <path d="m120 121 5 4 5-4" fill="#17232d" />
    </> : <>
      <path d="M96 100h58v21q-29 13-58 0Z" fill="#111d27" stroke="#728795" strokeWidth="3" />
      <path d="M103 107h44" stroke={accent} strokeWidth="7" strokeLinecap="round" />
      <path d="M111 128h28" stroke="#8da0ab" strokeWidth="3" />
    </>}
  </g>;
}

function FrontDetails({ id, accent }: { id: string; accent: string }) {
  switch (id) {
    case 'guardian_h': return <><Shield accent={accent} /><path d="M105 157h40v27h-40Z" fill={accent} stroke="#15232d" strokeWidth="4" /><path d="M110 163h30" stroke="#d9faf7" strokeWidth="3" /></>;
    case 'click_click': return <><path d="M96 85 89 48l26 30m20 0 26-30-7 37" fill="#a86ac0" stroke="#17242c" strokeWidth="4" /><path d="M108 126q17 19 34 0" fill="none" stroke={accent} strokeWidth="4" /></>;
    case 'frostbyte': return <><path d="m90 125-19-16 6-26 20 23m63 19 19-16-6-26-20 23" fill={C.cyan} stroke="#396a79" strokeWidth="3" /><path d="m125 154 15 16-15 27-15-27Z" fill={C.cyan} stroke="#c2f8f5" strokeWidth="3" /><Spikes accent={C.cyan} /></>;
    case 'sadman': return <><path d="m125 150-7 12 7 33 7-33Z" fill={accent} /><path d="M101 152 125 168l24-16" fill="none" stroke="#a1bac0" strokeWidth="4" /><circle cx="174" cy="182" r="20" fill="none" stroke={C.cyan} strokeWidth="3" /><path d="m165 182 9-10 9 10-9 10Z" fill={C.cyan} /></>;
    case 'rainbow_dash': return <><path d="M101 83 125 47l24 36Z" fill="#a5b1bd" stroke="#1b2933" strokeWidth="4" /><path d="M110 77h30" stroke={C.cyan} strokeWidth="4" /><path d="m87 208-7 31m14-31-1 35m65-35 7 31m-14-31 1 35" stroke={C.pink} strokeWidth="5" strokeLinecap="round" /><path d="m83 216-12 23m93-23 12 23" stroke={C.lime} strokeWidth="4" /></>;
    case 'accuser': return <><Visor accent={accent} /><path d="M104 153h42v37h-42Z" fill="#a3303e" stroke={accent} strokeWidth="3" /><path d="M111 164h27m-27 8h18" stroke="#ffb9ae" strokeWidth="3" /><path d="M177 174v54m-8-46h16" stroke={accent} strokeWidth="6" /></>;
    case 'low_flame': return <><path d="M90 88q35-21 70 0l-10 40q-24-14-50 0Z" fill="#263a48" stroke="#101d29" strokeWidth="5" /><circle cx="125" cy="172" r="16" fill="#382e2b" stroke={accent} strokeWidth="5" /><path d="M176 211q-11-18 2-32 1 16 10 20 12 18-7 29-20-3-5-17Z" fill={accent} /></>;
    case 'wandering_eye': return <><circle cx="125" cy="108" r="51" fill="none" stroke="#8da5b2" strokeWidth="9" /><circle cx="125" cy="108" r="42" fill="none" stroke={C.cyan} strokeWidth="2" /><circle cx="125" cy="109" r="12" fill={accent} /><circle cx="174" cy="112" r="6" fill={accent} /></>;
    case 'the_rind': return <><Visor accent={accent} /><path d="m62 198 127-35 5 15-127 35Z" fill="#526c79" stroke="#13222b" strokeWidth="4" /><path d="M69 194h36m56-22h30" stroke={accent} strokeWidth="4" /><path d="m119 190 8 26" stroke="#899eaa" strokeWidth="6" /></>;
    case 'anointed': return <><Crown accent={accent} /><path d="m125 149 19 21-19 29-19-29Z" fill={accent} stroke="#fff0ba" strokeWidth="2" /><path d="M93 146 74 157m83-11 19 11" stroke={accent} strokeWidth="7" /></>;
    case 'executive_p': return <><path d="M125 151 117 162l8 36 8-36Z" fill={accent} /><path d="m101 151 24 15 24-15" fill="none" stroke="#ccd4d1" strokeWidth="4" /><rect x="163" y="210" width="33" height="40" rx="3" fill="#1a2935" stroke="#899ca7" strokeWidth="4" /><path d="M174 210v-6h11v6" fill="none" stroke="#899ca7" strokeWidth="3" /></>;
    case 'alpha_prime': return <><Visor accent={accent} /><path d="M94 160h62m-54 22h46" stroke="#b8c7ce" strokeWidth="6" /><path d="m125 166 9 9-9 9-9-9Z" fill={accent} /></>;
    case 'roll_safe': return <><path d="M125 150 118 162l7 35 7-35Z" fill={accent} /><path d="m174 162 12-38-5-5-13 24" fill="#bda895" stroke="#26333b" strokeWidth="3" /><path d="M172 216h27v27h-27Z" fill="#a8b7b5" stroke="#22323b" strokeWidth="3" /><circle cx="179" cy="223" r="2" fill="#26343c" /><circle cx="192" cy="236" r="2" fill="#26343c" /></>;
    case 'hotwired': return <><circle cx="111" cy="108" r="7" fill={accent} /><circle cx="139" cy="108" r="7" fill={accent} /><path d="m103 156 17 12-10 14 19 15" fill="none" stroke={accent} strokeWidth="5" /><path d="M185 161v64m-9-48h18" stroke={C.orange} strokeWidth="6" /></>;
    case 'panic_bot': return <><path d="M110 78q15-18 30 0" fill={accent} stroke="#18242d" strokeWidth="4" /><circle cx="125" cy="77" r="8" fill={accent} /><circle cx="125" cy="174" r="17" fill="#182630" stroke={accent} strokeWidth="5" /><path d="M125 162v17m0 6v3" stroke={accent} strokeWidth="5" strokeLinecap="round" /></>;
    case 'primate': return <><path d="M110 128q15 13 30 0" fill="none" stroke="#b9a6c4" strokeWidth="5" /><path d="M103 177h44" stroke={accent} strokeWidth="6" /><path d="M75 204h25m50 0h25" stroke={accent} strokeWidth="4" /></>;
    case 'pain_hider': return <><path d="M125 155v37m-18-18h36" stroke={accent} strokeWidth="9" /><path d="m166 176-27 7-11-8" fill="none" stroke="#c8b7a5" strokeWidth="8" strokeLinecap="round" /><path d="M106 91h13" stroke="#e3d5bc" strokeWidth="2" /></>;
    case 'prom_king': return <><Crown accent={accent} /><path d="M125 150 117 161l8 37 8-37Z" fill={C.cyan} /><path d="m100 153 25 13 25-13" fill="none" stroke="#cedadd" strokeWidth="4" /></>;
    case 'idol_core': return <><path d="M125 195q-34-19-21-39 13-12 21 1 8-13 21-1 13 20-21 39Z" fill={accent} stroke="#ffe0f1" strokeWidth="3" /><path d="M103 113q22-9 44 0" stroke={accent} strokeWidth="6" /><ellipse cx="125" cy="64" rx="37" ry="11" fill="none" stroke={accent} strokeWidth="4" /></>;
    case 'danger_zone': return <><Visor accent={accent} /><path d="M101 151h48v46h-48Z" fill="#a9343e" stroke={accent} strokeWidth="3" /><path d="m126 157-16 33h13l-4 9 22-27h-14l5-15Z" fill="#192633" /></>;
    case 'the_tank': return <><Shield accent={accent} /><path d="M116 121q9-13 18 0l-5 31q-4 9-10 0Z" fill="#87929c" stroke="#273440" strokeWidth="4" /><circle cx="109" cy="107" r="12" fill="#e1d6d7" /><circle cx="141" cy="107" r="12" fill="#e1d6d7" /><circle cx="110" cy="108" r="4" fill="#26313a" /><circle cx="140" cy="108" r="4" fill="#26313a" /></>;
    default: return null;
  }
}

/**
 * Geometry-only SVG fallback for environments without WebGL.
 * Fits a 250 × 320 viewport; front-facing, with the pedestal at the bottom.
 */
export function PawnFallback({ characterId, selected = false }: PawnFallbackProps) {
  const look = looks[characterId];
  if (!look) throw new Error(`Unknown pawn character: ${characterId}`);
  const { accent, kind, face } = look;
  const uid = useId().replace(/:/g, '');
  const armorId = `pawn-armor-${uid}`;
  const baseId = `pawn-base-${uid}`;
  const armId = `pawn-arm-${uid}`;

  return <svg className="pawn-fallback" viewBox="0 0 250 320" width="100%" height="100%" aria-hidden="true"
    aria-label={`${characterId.replaceAll('_', ' ')} geometric tabletop pawn`}
    preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id={armorId} x1="0" x2="1" y1="0" y2="1">
        <stop stopColor="#8ca0ad" /><stop offset=".25" stopColor="#415361" />
        <stop offset=".72" stopColor="#253541" /><stop offset="1" stopColor="#182530" />
      </linearGradient>
      <linearGradient id={baseId} x1="0" x2="0" y1="0" y2="1">
        <stop stopColor="#677b89" /><stop offset=".43" stopColor="#25343f" /><stop offset="1" stopColor="#111c27" />
      </linearGradient>
      <linearGradient id={armId} x1="0" x2="1" y1="0" y2="0">
        <stop stopColor="#8194a0" /><stop offset=".4" stopColor="#364a58" /><stop offset="1" stopColor="#1b2a36" />
      </linearGradient>
    </defs>
    {/* The plinth reads as a solid collectible piece, not a floating character. */}
    <ellipse cx="125" cy="295" rx="94" ry="17" fill="#101923" opacity=".28" />
    <path d="M40 275h170v21q0 15-85 15t-85-15Z" fill={`url(#${baseId})`} stroke="#111b25" strokeWidth="4" />
    <ellipse cx="125" cy="275" rx="85" ry="16" fill="#303f4b" stroke="#8495a1" strokeWidth="4" />
    <ellipse cx="125" cy="275" rx="72" ry="11" fill="#1a2833" stroke={accent} strokeWidth={selected ? 5 : 2.5} />
    <path d="M109 303h32" stroke={accent} strokeWidth="5" strokeLinecap="round" />
    <BackDetails id={characterId} accent={accent} />
    <Body kind={kind} accent={accent} armorId={armorId} armId={armId} />
    <Head face={face} accent={accent} />
    <FrontDetails id={characterId} accent={accent} />
    {selected && <ellipse cx="125" cy="277" rx="98" ry="20" fill="none" stroke={accent} strokeWidth="2.5" opacity=".8" />}
  </svg>;
}

export default PawnFallback;