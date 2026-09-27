import { useId } from 'react';

export interface PawnFallbackProps {
  characterId: string;
  selected?: boolean;
}

const C = {
  cyan: '#55dce9', red: '#ff626b', gold: '#ecc16e', pink: '#f17bd1',
  lime: '#b0e581', violet: '#ba9ff2', orange: '#ffa568', ice: '#baf7fa',
  steel: '#8396a4', dark: '#18232d', light: '#c5d1d2', cream: '#d8c9b7',
};

const accents: Record<string, string> = {
  guardian_h: C.cyan, click_click: C.pink, frostbyte: C.cyan, sadman: C.lime,
  rainbow_dash: C.orange, accuser: C.red, low_flame: C.orange, wandering_eye: C.orange,
  the_rind: C.cyan, anointed: C.gold, executive_p: C.cyan, alpha_prime: C.cyan,
  roll_safe: C.orange, hotwired: C.red, panic_bot: C.red, primate: C.pink,
  pain_hider: C.cyan, prom_king: C.violet, idol_core: C.pink, danger_zone: C.red,
  the_tank: C.violet,
};

function Base({ accent, selected }: { accent: string; selected: boolean }) {
  return <g>
    <ellipse cx="125" cy="295" rx="94" ry="17" fill="#101923" opacity=".28" />
    <path d="M40 275h170v21q0 15-85 15t-85-15Z" fill="#182530" stroke="#101a24" strokeWidth="4" />
    <ellipse cx="125" cy="275" rx="85" ry="16" fill="#344652" stroke="#8495a1" strokeWidth="4" />
    <ellipse cx="125" cy="275" rx="72" ry="11" fill="#182631" stroke={accent} strokeWidth={selected ? 5 : 2.5} />
    <path d="M109 303h32" stroke={accent} strokeWidth="5" strokeLinecap="round" />
    {selected && <ellipse cx="125" cy="277" rx="98" ry="20" fill="none" stroke={accent} strokeWidth="2.5" opacity=".8" />}
  </g>;
}
function Boots({ accent, wide = false }: { accent: string; wide?: boolean }) {
  const spread = wide ? 30 : 20;
  return <g stroke="#111b26" strokeWidth="5" strokeLinejoin="round">
    <path d={`M${125 - spread - 13} 202h26l-5 54h-29ZM${125 + spread - 13} 202h26l5 54h-26Z`} fill="#273842" />
    <path d={`M${125 - spread - 18} 247h29l4 22-43 1 4-12ZM${125 + spread - 11} 247h29l11 22-43-1Z`} fill="#192832" />
    <path d={`M${125 - spread - 10} 237h20m30 0h20`} stroke={accent} strokeWidth="4" />
  </g>;
}
function Core({ accent, wide = false }: { accent: string; wide?: boolean }) {
  const l = wide ? 71 : 53;
  return <g strokeLinejoin="round">
    <path d={`M${125 - l} 137h${l * 2}l${wide ? 25 : 18} 25-12 48q-38 17-${l - 5} 0l-12-48Z`} fill="#273844" stroke="#111b25" strokeWidth="6" />
    <path d={`M${125 - l + 12} 150h${l * 2 - 24}l10 16-8 32q-24 8-48 0l-9-32Z`} fill="#364c5b" stroke="#8093a0" strokeWidth="2.5" />
    <path d={`M${125 - l + 12} 185h${l * 2 - 24}`} stroke={accent} strokeWidth="5" strokeLinecap="round" />
  </g>;
}
function Visor({ accent, y = 102, width = 58 }: { accent: string; y?: number; width?: number }) {
  return <g><path d={`M${125 - width / 2} ${y}q${width / 2} -11 ${width} 0l-5 18q-${width / 2} 9-${width - 7} 0Z`} fill="#101a25" stroke="#687e8d" strokeWidth="3" /><path d={`M${125 - width / 2 + 8} ${y + 7}q${width / 2 - 8} -6 ${width - 16} 0`} fill="none" stroke={accent} strokeWidth="6" strokeLinecap="round" /></g>;
}
function Crown({ accent }: { accent: string }) {
  return <g stroke="#17222d" strokeWidth="3" strokeLinejoin="round"><path d="m98 88-7-34 17 12 17-27 17 27 17-12-7 34Z" fill={accent} /><path d="M98 84h54v12H98Z" fill="#8b718c" /><path d="m125 72 6 8-6 8-6-8Z" fill={C.cyan} stroke="none" /></g>;
}
function Wings({ accent }: { accent: string }) {
  return <g stroke="#718493" strokeWidth="3" strokeLinejoin="round"><path d="M99 158 62 125 37 108 52 147 76 164 95 174ZM151 158 188 125 213 108 198 147 174 164 155 174Z" fill="#344658" /><path d="m41 113 38 41 17 13M209 113l-38 41-17 13" fill="none" stroke={accent} strokeWidth="5" /></g>;
}
function Shield({ accent }: { accent: string }) {
  return <g transform="translate(36 174)" strokeLinejoin="round"><path d="M0-27 29-35 55-23 55 14Q48 45 27 57 5 46 0 13Z" fill="#1b2934" stroke="#8494a2" strokeWidth="5" /><path d="M8-18 29-24 46-15v27Q42 32 27 44 12 31 8 10Z" fill="#324654" stroke={accent} strokeWidth="3" /><path d="m27-8 11 15-11 17L16 7Z" fill={accent} /></g>;
}
function Cables({ accent }: { accent: string }) {
  return <g fill="none" strokeLinecap="round"><path d="M96 153q-40 30-30 75" stroke={accent} strokeWidth="6" /><path d="M154 153q42 22 28 66" stroke={C.orange} strokeWidth="5" /><path d="M108 228q22 22 55 9" stroke={C.cyan} strokeWidth="4" /></g>;
}
function Signature({ id, accent }: { id: string; accent: string }) {
  switch (id) {
    case 'guardian_h': return <g><Boots accent={accent} wide /><Core accent={accent} wide /><path d="M82 111q43-37 86 0v37q-43 24-86 0Z" fill="#18242e" stroke="#111b25" strokeWidth="5" /><path d="M94 127q31-17 62 0l-8 23q-24 14-46 0Z" fill="#75848b" stroke="#26323b" strokeWidth="4" /><path d="m116 139 9 6 9-6" fill="#111b24" /><path d="M104 156q21 12 42 0" fill="none" stroke="#101921" strokeWidth="5" /><path d="M100 121q9-6 17 0m16 0q8-6 17 0" fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round" /><Shield accent={accent} /><path d="m105 86-9-21m49 21 9-21" stroke="#687b88" strokeWidth="10" strokeLinecap="round" /></g>;
    case 'click_click': return <g>
      <path d="M65 186q17-38 60-36 52-4 69 38l-13 48H82Z" fill="#5d6470" stroke="#19232d" strokeWidth="6" />
      <path d="M79 218v26q-12 12-30 4m58-31v30q-10 11-26 5m61-32v28q10 13 26 6m0-49v24q13 13 29 5" fill="none" stroke="#414b56" strokeWidth="14" strokeLinecap="round" />
      <path d="M78 151q-38-9-39-44 4-16 18-11 12 6 3 21 18 0 30 12" fill="none" stroke="#626a77" strokeWidth="13" strokeLinecap="round" />
      <path d="M78 111 69 49l39 34m34 0 39-34-9 62" fill="#a86ac0" stroke="#17242c" strokeWidth="6" />
      <path d="M79 124q-2-47 46-55 48 8 46 55l-12 34q-34 22-68 0Z" fill="#626a77" stroke="#19232d" strokeWidth="6" />
      <path d="M95 115q11-7 20 0m20 0q9-7 20 0" fill="none" stroke={accent} strokeWidth="6" strokeLinecap="round" />
      <ellipse cx="125" cy="145" rx="25" ry="31" fill="#121b25" stroke="#d8cad7" strokeWidth="4" />
      <path d="M108 150q17-12 34 0v17q-17 10-34 0Z" fill={C.red} />
      <path d="M89 133 53 124m39 23-43 4m112-18 36-9m-38 23 43 4" stroke="#c5d1d2" strokeWidth="3" strokeLinecap="round" />
      <Cables accent={accent} /><path d="M181 174h12v12h-12m8-26h8v8h-8" fill={C.cyan} />
    </g>;
    case 'frostbyte': return <g><Boots accent={accent} /><Core accent={accent} /><path d="M93 133 77 87l18-37 30 25 30-25 18 37-16 46-32 16Z" fill="#355266" stroke="#14232e" strokeWidth="6" /><path d="m125 147 15 20-15 30-15-30Z" fill={C.ice} stroke="#bff9f7" strokeWidth="3" /><path d="m80 145-24-24 11-31 25 28m66 27 24-24-11-31-25 28" fill={C.cyan} stroke="#396a79" strokeWidth="4" /></g>;
    case 'sadman': return <g transform="rotate(-8 125 170)"><path d="M75 242q30-30 100 0" fill="#17232d" stroke="#111b25" strokeWidth="5" /><Core accent={accent} /><path d="M102 102q31-21 57 4l-6 44q-28 18-51-2Z" fill="#86aa91" stroke="#14232b" strokeWidth="5" /><path d="M102 129q25 18 51 0" fill="none" stroke="#2b4039" strokeWidth="4" /><path d="m98 150-30 22m30-8 30 18" stroke={C.cream} strokeWidth="8" strokeLinecap="round" /><circle cx="181" cy="188" r="19" fill="none" stroke={C.cyan} strokeWidth="4" /></g>;
    case 'rainbow_dash': return <g><path d="m35 160 37-29 104 0 39 29-39 29H72Z" fill="#a8b7c0" stroke="#172530" strokeWidth="6" /><path d="M62 160h125" stroke={C.cyan} strokeWidth="5" /><path d="m82 196-12 32m28-32-3 37m61-37 12 32m-28-32 3 37" stroke={C.pink} strokeWidth="7" strokeLinecap="round" /><path d="M79 229h-18m110 0h18" stroke={C.lime} strokeWidth="5" /><path d="M96 124 125 80l29 44Z" fill="#c7d2d7" stroke="#1b2933" strokeWidth="5" /><path d="M105 119h40" stroke={C.orange} strokeWidth="5" /></g>;
    case 'accuser': return <g><Boots accent={accent} /><Core accent={accent} /><path d="M96 83q29-24 58 0v43q-29 22-58 0Z" fill={C.cream} stroke="#26303a" strokeWidth="5" /><Visor accent={accent} y={103} /><path d="M160 159 195 111" stroke="#192732" strokeWidth="15" strokeLinecap="round" /><path d="m191 110 27-8-17 21" fill={accent} stroke="#192732" strokeWidth="4" strokeLinejoin="round" /><path d="m84 160-20 54" stroke="#334957" strokeWidth="13" /></g>;
    case 'low_flame': return <g>
      <path d="M64 239q-11-39 17-61l27-14h47l28 18q20 19 5 58Z" fill="#283a43" stroke="#111c25" strokeWidth="6" />
      <path d="M82 194q-6-48 40-62 47 9 49 60l-22 20H98Z" fill="#2b4250" stroke="#111c25" strokeWidth="5" />
      <path d="M105 152q-5-28 20-49l-4 32q16 9 20 22-7 19-24 14-15-4-12-19Z" fill={C.cream} stroke="#1d2830" strokeWidth="4" />
      <path d="M101 145 89 120l17 13m28 0 17-21-10 29" fill="#2b4250" stroke="#111c25" strokeWidth="4" />
      <path d="M125 135q-25-38 3-91 2 37 22 50 32 36-4 64-35 0-21-23Z" fill={accent} stroke="#311f24" strokeWidth="5" />
      <path d="M112 112q-13-35 2-57 2 24 18 36" fill="none" stroke={C.gold} strokeWidth="9" strokeLinecap="round" />
      <path d="M66 210q12-31 26-29l25 18-5 8Z" fill="#18232d" stroke="#101923" strokeWidth="4" />
      <path d="M66 211h77v38H66Z" fill="#374d57" stroke="#101923" strokeWidth="5" /><path d="M73 218h63v24H73Z" fill="#1c3541" /><path d="M66 211h77" stroke={C.gold} strokeWidth="4" />
      <path d="M48 237q-9-15 2-29 2 13 11 18 7 16-8 22-17-3-5-11Z" fill={C.gold} />
    </g>;
    case 'wandering_eye': return <g><path d="M74 220q-12-56 51-72 63 16 51 72Z" fill="#273a45" stroke="#14232d" strokeWidth="6" /><circle cx="125" cy="119" r="61" fill="#d6e0db" stroke="#718694" strokeWidth="9" /><circle cx="125" cy="119" r="44" fill="#1b2932" stroke={C.cyan} strokeWidth="4" /><circle cx="125" cy="119" r="14" fill={accent} /><circle cx="125" cy="119" r="5" fill="#fff" /><path d="M171 83 190 50" stroke="#718694" strokeWidth="5" /><circle cx="191" cy="49" r="8" fill={accent} /></g>;
    case 'the_rind': return <g><path d="M76 214 60 149l29-29 28 18 37-24 31 39-18 61Z" fill="#273a43" stroke="#111e28" strokeWidth="6" /><path d="m67 189 121-31 7 17-123 34Z" fill="#526c79" stroke="#13222b" strokeWidth="5" /><path d="M83 180h40m25-15h30" stroke={accent} strokeWidth="5" /><path d="m101 129-18-31m72 23 15-35" stroke="#647884" strokeWidth="13" strokeLinecap="round" /><path d="M88 225q35 21 74-1" fill="none" stroke={accent} strokeWidth="4" /></g>;
    case 'anointed': return <g><path d="M66 142q59-38 118 0l-10 92q-50 25-98 0Z" fill="#503948" stroke="#181c27" strokeWidth="6" /><path d="M125 96q-30-11-28-42h56q2 31-28 42Z" fill={C.gold} stroke="#17222d" strokeWidth="5" /><Crown accent={C.gold} /><ellipse cx="125" cy="64" rx="49" ry="15" fill="none" stroke={C.cyan} strokeWidth="5" /><path d="m125 143 20 24-20 31-20-31Z" fill={C.gold} stroke="#fff0ba" strokeWidth="3" /></g>;
    case 'executive_p': return <g><Boots accent={accent} /><path d="M87 139h76l23 95q-60 18-122 0Z" fill="#172530" stroke="#111b25" strokeWidth="6" /><path d="M103 139 125 166l22-27" fill="none" stroke="#ccd4d1" strokeWidth="5" /><path d="M100 97q25-28 50 0v38h-50Z" fill={C.cream} stroke="#26333b" strokeWidth="5" /><path d="M125 144v45" stroke={accent} strokeWidth="5" /><rect x="164" y="199" width="38" height="49" rx="3" fill="#1a2935" stroke="#899ca7" strokeWidth="4" /><path d="M175 199v-8h13v8" fill="none" stroke="#899ca7" strokeWidth="3" /></g>;
    case 'alpha_prime': return <g><Boots accent={accent} wide /><Core accent={accent} wide /><path d="M87 148q-19-29 7-45l31 12 31-12q26 16 7 45l-21 29h-34Z" fill="#b8c0c4" stroke="#1b252e" strokeWidth="6" /><path d="M84 153 57 177l20 35 33-22m73-37 27 24-20 35-33-22" fill="#adb8be" stroke="#1b252e" strokeWidth="6" /><path d="M95 107q30-24 60 0v39q-30 20-60 0Z" fill="#bdc5c5" stroke="#1b252e" strokeWidth="5" /><Visor accent={accent} width={68} /></g>;
    case 'roll_safe': return <g><Boots accent={accent} /><Core accent={accent} /><path d="M97 93q28-23 56 0v42q-28 20-56 0Z" fill={C.cream} stroke="#26333b" strokeWidth="5" /><path d="M151 113q22-25 14-43" stroke={C.cream} strokeWidth="9" strokeLinecap="round" /><path d="M166 72h-5" stroke="#26333b" strokeWidth="4" /><path d="M67 211h38v36H67Z" fill="#a8b7b5" stroke="#22323b" strokeWidth="4" /><circle cx="76" cy="220" r="3" fill="#26343c" /><circle cx="94" cy="238" r="3" fill="#26343c" /><path d="M151 91q8-12 16 0" fill="none" stroke={accent} strokeWidth="4" /></g>;
    case 'hotwired': return <g><Core accent={accent} /><path d="M94 103q31-29 62 0v41q-31 21-62 0Z" fill="#59636e" stroke="#17242c" strokeWidth="5" /><path d="M98 89 89 53m22 32-1-41m20 41 1-41m21 55 10-36" stroke="#4b5c63" strokeWidth="8" strokeLinecap="round" /><circle cx="111" cy="112" r="8" fill={accent} /><circle cx="139" cy="112" r="8" fill={accent} /><Cables accent={accent} /><path d="M188 162v66m-11-50h22" stroke={C.orange} strokeWidth="7" /></g>;
    case 'panic_bot': return <g><Boots accent={accent} wide /><Core accent={accent} wide /><path d="M88 77h74l9 23-9 43-37 12-37-12-9-43Z" fill="#354755" stroke="#14202a" strokeWidth="6" /><Visor accent={C.gold} width={60} y={105} /><path d="M99 77 84 49m67 28 15-30" stroke="#7d91a2" strokeWidth="5" /><circle cx="84" cy="49" r="8" fill={accent} /><circle cx="166" cy="48" r="8" fill={accent} /><path d="M125 165a19 19 0 1 0 0 38 19 19 0 1 0 0-38Z" fill="#182630" stroke={accent} strokeWidth="5" /><path d="M125 174v17" stroke={accent} strokeWidth="5" /></g>;
    case 'primate': return <g>
      <path d="M59 168q8-42 66-42 58 0 66 42l-12 67H71Z" fill="#4e4652" stroke="#19232d" strokeWidth="6" />
      <path d="M75 160 54 207l-2 34m123-81 22 47 2 34" fill="none" stroke="#514b57" strokeWidth="22" strokeLinecap="round" />
      <path d="M75 229 50 240m125-11 25 11" stroke="#3c3741" strokeWidth="13" strokeLinecap="round" />
      <path d="M78 116q-12-46 47-58 59 12 47 58l-14 40q-33 19-66 0Z" fill="#514b57" stroke="#19232d" strokeWidth="6" />
      <circle cx="82" cy="116" r="15" fill="#514b57" stroke="#19232d" strokeWidth="5" /><circle cx="168" cy="116" r="15" fill="#514b57" stroke="#19232d" strokeWidth="5" />
      <path d="M91 132q34-22 68 0l-8 31q-26 17-52 0Z" fill="#83919a" stroke="#263442" strokeWidth="4" />
      <path d="M104 143h12m18 0h12" stroke="#f0d7a5" strokeWidth="5" strokeLinecap="round" /><path d="M108 157q17 10 34 0" fill="none" stroke="#263442" strokeWidth="4" />
      <path d="M93 73q31-31 64 0" fill="none" stroke="#312d38" strokeWidth="15" strokeLinecap="round" /><path d="M82 183h87" stroke={accent} strokeWidth="6" />
    </g>;
    case 'pain_hider': return <g><Boots accent={accent} /><Core accent={accent} /><path d="M96 87q29-25 58 0v50q-29 18-58 0Z" fill="#101a25" stroke="#1e2d37" strokeWidth="6" /><path d="M91 118h68v30H91Z" fill="#263642" stroke={accent} strokeWidth="4" /><path d="M105 132h40" stroke={accent} strokeWidth="5" /><path d="m161 168-31 9-15-11" fill="none" stroke={C.cream} strokeWidth="10" strokeLinecap="round" /></g>;
    case 'prom_king': return <g><path d="M71 146q54-27 108 0l17 88H54Z" fill="#182430" stroke="#111b25" strokeWidth="6" /><path d="M103 96q22-24 44 0v39h-44Z" fill={C.cream} stroke="#26333b" strokeWidth="5" /><Crown accent={accent} /><path d="M99 148 125 165l26-17" fill="none" stroke="#cedadd" strokeWidth="5" /><path d="M125 165v39" stroke={C.cyan} strokeWidth="6" /></g>;
    case 'idol_core': return <g><path d="M90 148q35-31 70 0l17 85q-52 18-104 0Z" fill="#d8e6dc" stroke="#17242d" strokeWidth="6" /><Wings accent={accent} /><path d="M125 203q-35-20-21-42 13-12 21 2 8-14 21-2 14 22-21 42Z" fill={accent} stroke="#ffe0f1" strokeWidth="3" /><ellipse cx="125" cy="65" rx="38" ry="11" fill="none" stroke={accent} strokeWidth="5" /><path d="M101 112q24-10 48 0" stroke={accent} strokeWidth="6" /><path d="M81 134 65 163m-7-9 14 16m-18-7 21 0" fill="none" stroke={C.dark} strokeWidth="8" strokeLinecap="round" /><circle cx="63" cy="126" r="10" fill={accent} stroke="#ffe0f1" strokeWidth="3" /><path d="M180 118q17-18 28 0m-20 8q22-13 34 1" fill="none" stroke={accent} strokeWidth="4" /></g>;
    case 'danger_zone': return <g><path d="M73 135 99 102h52l26 33-13 96q-39 16-78 0Z" fill="#a9343e" stroke="#241923" strokeWidth="6" /><path d="m125 110 31 32-31 37-31-37Z" fill="#151e28" stroke={accent} strokeWidth="4" /><path d="m125 145-18 37h14l-5 13 27-34h-16l6-16Z" fill={C.gold} /><path d="M92 88 75 54m83 34 17-34" stroke={accent} strokeWidth="8" strokeLinecap="round" /></g>;
    case 'the_tank': return <g><path d="M60 145q9-67 65-79 56 12 65 79l-19 87H79Z" fill="#6c7072" stroke="#222c32" strokeWidth="7" /><path d="M74 132 55 96l29 12m92 24 19-36-29 12" fill="#697989" stroke="#18232d" strokeWidth="6" /><path d="M81 176 103 168l9 9m48 1-11-12 20 5" fill="none" stroke="#8b9191" strokeWidth="5" strokeLinejoin="round" /><circle cx="106" cy="117" r="15" fill="#e1d6d7" /><circle cx="144" cy="117" r="15" fill="#e1d6d7" /><circle cx="106" cy="118" r="5" fill="#26313a" /><circle cx="144" cy="118" r="5" fill="#26313a" /><path d="M125 154V112" fill="none" stroke={C.cream} strokeWidth="13" strokeLinecap="round" /><circle cx="125" cy="108" r="8" fill={C.cream} /><path d="M113 163q12 7 24 0" fill="none" stroke="#242b30" strokeWidth="4" /></g>;
    default: return null;
  }
}

/**
 * Geometry-only fallback for non-WebGL environments. It uses the same
 * concept-first silhouettes as PawnModel and keeps the shared plinth.
 */
export function PawnFallback({ characterId, selected = false }: PawnFallbackProps) {
  const accent = accents[characterId];
  if (!accent) throw new Error(`Unknown pawn character: ${characterId}`);
  const uid = useId().replace(/:/g, '');
  return <svg className="pawn-fallback" viewBox="0 0 250 320" width="100%" height="100%" aria-hidden="true"
    aria-label={`${characterId.replaceAll('_', ' ')} geometric tabletop pawn`} preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id={`pawn-sheen-${uid}`} x1="0" x2="1" y1="0" y2="1"><stop stopColor="#8ca0ad" /><stop offset=".3" stopColor="#415361" /><stop offset="1" stopColor="#182530" /></linearGradient></defs>
    <Base accent={accent} selected={selected} />
    <Signature id={characterId} accent={accent} />
  </svg>;
}

export default PawnFallback;