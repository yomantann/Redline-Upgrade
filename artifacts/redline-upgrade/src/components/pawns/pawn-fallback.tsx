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
    case 'guardian_h': return <g><Boots accent={accent} wide /><Core accent={accent} wide /><path d="M55 156q5-55 70-58 65 3 70 58l-15 63H70Z" fill="#1d2931" stroke="#101923" strokeWidth="6" /><path d="M77 151q8-45 48-46 40 1 48 46l-12 37q-36 22-72 0Z" fill="#25323b" stroke="#111b25" strokeWidth="5" /><ellipse cx="83" cy="123" rx="17" ry="21" fill="#25323b" stroke="#111b25" strokeWidth="4" /><ellipse cx="167" cy="123" rx="17" ry="21" fill="#25323b" stroke="#111b25" strokeWidth="4" /><path d="M95 155q30-18 60 0l-8 25q-22 13-44 0Z" fill="#72828a" stroke="#18242c" strokeWidth="4" /><path d="m110 164 15 9 15-9" fill="none" stroke="#131d25" strokeWidth="5" /><path d="M103 135q8-6 15 0m14 0q8-6 15 0" fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round" /><path d="M99 91q26-25 52 0l-8-30-18 18-18-18Z" fill="#512c43" stroke="#16222c" strokeWidth="5" /><path d="M68 165 48 190l20 28 26-17m62-36 25 25-21 31-25-18" fill="#556773" stroke="#17232d" strokeWidth="6" /><path d="m102 187 23 14 23-14" fill="none" stroke={accent} strokeWidth="6" /></g>;
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
    case 'frostbyte': return <g><Boots accent={accent} /><Core accent={accent} /><path d="M79 173 68 112 84 65l22 7 19-39 20 38 24-9 18 50-13 61-49 28Z" fill="#172632" stroke="#14232e" strokeWidth="6" /><path d="M94 139q6-36 31-40 26 4 31 40l-12 24q-19 13-38 0Z" fill="#111c28" stroke="#344d5b" strokeWidth="4" /><path d="m110 126 15-22 15 22-8 32h-14Z" fill={C.ice} stroke="#bff9f7" strokeWidth="3" /><path d="m72 159-20-24 12-35 25 23m74 34 24-25-10-32-29 25" fill={C.cyan} stroke="#396a79" strokeWidth="4" /><path d="m87 193 25-22 26 22 18 38H91Z" fill="#355266" stroke="#14232e" strokeWidth="5" /><path d="m129 194 12 17-13 20-13-20Z" fill={C.cyan} /></g>;
    case 'sadman': return <g><Boots accent={accent} /><path d="M78 129h94l17 105H62Z" fill="#202a35" stroke="#111b25" strokeWidth="6" /><path d="m96 130 29 33 29-33 13 29-42 28-42-28Z" fill={C.cream} stroke="#26323a" strokeWidth="4" /><path d="m119 161 6 13 7-13v58h-13Z" fill={C.cyan} /><path d="M88 76q36-27 73 1l-7 65q-29 21-59-1Z" fill="#779e89" stroke="#14232b" strokeWidth="5" /><path d="M91 97q-20-9-17-23 16-5 22 13m64 10q20-9 17-23-16-5-22 13" fill="#779e89" stroke="#14232b" strokeWidth="4" /><path d="M101 111q9-6 18 0m12 0q9-6 18 0" stroke="#24332f" strokeWidth="4" strokeLinecap="round" /><path d="m117 115 8 13 8-13m-19 24q11 6 22 0" fill="none" stroke="#33473e" strokeWidth="4" /><path d="M159 167h43v34h-43Z" fill="#153b48" stroke={C.cyan} strokeWidth="3" /><circle cx="170" cy="178" r="4" fill={C.lime} /><circle cx="185" cy="188" r="4" fill={C.cyan} /><path d="m154 157 18 18" stroke="#779e89" strokeWidth="9" strokeLinecap="round" /></g>;
    case 'rainbow_dash': return <g><path d="M80 144q-20-24-9-52l34 23 18-40 19 40 34-24q12 30-12 54l-18 35H96Z" fill="#b6c1c7" stroke="#172530" strokeWidth="6" /><path d="m100 130 7 21m37-21-7 21" stroke={C.cyan} strokeWidth="6" strokeLinecap="round" /><circle cx="111" cy="128" r="5" fill={C.cyan} /><circle cx="138" cy="128" r="5" fill={C.cyan} /><path d="M71 177h111l16 34H66Z" fill="#9eabb4" stroke="#172530" strokeWidth="6" /><path d="M84 188h85m-75 14h65" stroke="#6f808d" strokeWidth="5" /><path d="m84 208-7 31m27-31v34m52-34 8 31m-29-31v34" stroke="#475562" strokeWidth="10" strokeLinecap="round" /><path d="M74 235h-14m120 0h14" stroke="#252d36" strokeWidth="8" strokeLinecap="round" /><path d="M175 171q30-16 44 4m-35 3q29-9 45 8m-39 3q27-5 40 12" fill="none" stroke={C.red} strokeWidth="6" strokeLinecap="round" /><path d="M183 171q30-16 44 4m-35 3q29-9 45 8m-39 3q27-5 40 12" fill="none" stroke={C.orange} strokeWidth="4" strokeLinecap="round" transform="translate(0 6)" /><path d="M189 176q30-16 44 4m-35 3q29-9 45 8m-39 3q27-5 40 12" fill="none" stroke={C.cyan} strokeWidth="3" strokeLinecap="round" transform="translate(0 12)" /></g>;
    case 'accuser': return <g><Boots accent={accent} /><path d="M79 133q46-25 92 0l17 100H63Z" fill="#1c2028" stroke="#101923" strokeWidth="6" /><path d="M100 140h50v58h-50Z" fill="#a92f3a" stroke="#481f29" strokeWidth="4" /><path d="M101 148h48v9h-48Z" fill={accent} /><path d="M97 72q29-23 58 0v57q-29 22-58 0Z" fill={C.cream} stroke="#26303a" strokeWidth="5" /><path d="M93 89q9-31 34-30 31 3 34 31l-10-9-13 7-10-8-16 8-15-6Z" fill="#20232a" /><path d="M104 105h12m17 0h12" stroke="#27252a" strokeWidth="4" strokeLinecap="round" /><path d="M121 115q4 7 9 0m-12 13q10 9 21 0" fill="none" stroke="#7c3435" strokeWidth="4" /><path d="M75 152 53 126m9-10-17 12 18 6" fill="none" stroke="#20252c" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" /><path d="m42 125-12 1 10-9" fill={C.cream} stroke="#20252c" strokeWidth="3" strokeLinejoin="round" /><path d="m165 159 20 42" stroke="#343e49" strokeWidth="13" strokeLinecap="round" /></g>;
    case 'low_flame': return <g>
      <path d="M66 211q13-38 59-41 48 4 60 41l-10 37H76Z" fill="#252c35" stroke="#111c25" strokeWidth="6" />
      <path d="M80 191h90v49H80Z" fill="#374d57" stroke="#101923" strokeWidth="5" /><path d="M87 199h76v32H87Z" fill="#153b48" stroke={C.cyan} strokeWidth="3" /><path d="M80 192h90" stroke="#aab1b5" strokeWidth="5" />
      <path d="M91 102q34-28 68 0l-7 61q-27 20-54 0Z" fill="#79614e" stroke="#252c35" strokeWidth="5" /><path d="M99 109 88 81l29 16m34 12 14-29-31 17" fill="#79543f" stroke="#252c35" strokeWidth="5" />
      <path d="M104 139h17m8 0h17" stroke="#231f20" strokeWidth="5" /><circle cx="112" cy="138" r="14" fill="none" stroke={C.orange} strokeWidth="5" /><circle cx="140" cy="138" r="14" fill="none" stroke={C.orange} strokeWidth="5" /><path d="M125 138h13" stroke="#282327" strokeWidth="5" />
      <path d="M112 151q13-8 26 0l-4 19q-10 9-20 0Z" fill={C.cream} stroke="#3b302b" strokeWidth="4" /><ellipse cx="125" cy="158" rx="5" ry="4" fill="#302c2b" />
      <circle cx="79" cy="129" r="19" fill="#222b32" stroke="#9567a6" strokeWidth="7" /><circle cx="171" cy="129" r="19" fill="#222b32" stroke="#9567a6" strokeWidth="7" /><path d="M79 119q46-51 92 0" fill="none" stroke="#9567a6" strokeWidth="8" />
      <path d="m83 183 25 14m59-14-25 14" stroke="#79614e" strokeWidth="13" strokeLinecap="round" />
      <path d="M48 230h35v21H48Z" fill="#f1e6d3" stroke="#26313a" strokeWidth="4" /><path d="M48 235h35" stroke={C.orange} strokeWidth="6" /><path d="M81 234q14-2 10 12" fill="none" stroke="#d8d2c8" strokeWidth="4" />
      <path d="M68 181q-7-20 6-34 1 13 12 20 5 16-9 23-14-1-9-9Zm110-2q-4-18 10-30 0 13 10 19 5 14-8 21-15-1-12-10Z" fill={C.orange} stroke="#6d3328" strokeWidth="4" />
    </g>;
    case 'wandering_eye': return <g><Boots accent={accent} /><Core accent={accent} /><path d="M81 118q44-33 88 0l18 112H63Z" fill="#273a45" stroke="#14232d" strokeWidth="6" /><path d="M82 93q4-55 43-58 43 3 47 58l-6 68H88Z" fill="#aab4b4" stroke="#718694" strokeWidth="8" /><path d="M96 95q4-38 29-41 27 3 30 41v43H96Z" fill="#d5d4cc" stroke="#4d606d" strokeWidth="5" /><path d="M101 101h48v27h-48Z" fill="#263741" stroke={C.cyan} strokeWidth="4" /><path d="M108 112h8m17 0h8" stroke={C.cream} strokeWidth="4" strokeLinecap="round" /><path d="m124 116 5 10 5-10" fill="none" stroke={C.cream} strokeWidth="3" /><path d="M83 100H69V79h15m82 21h15V79h-15" fill="#758694" stroke="#364a56" strokeWidth="5" /><circle cx="72" cy="90" r="8" fill={C.orange} /><circle cx="178" cy="90" r="8" fill={C.orange} /><path d="M97 72h55" stroke={C.cyan} strokeWidth="5" /><path d="M79 178 63 211m108-33 17 33" stroke="#202d37" strokeWidth="13" strokeLinecap="round" /><path d="M170 163q34 14 21 38" fill="none" stroke={C.orange} strokeWidth="5" /></g>;
    case 'the_rind': return <g><path d="M63 202q-4-49 34-67l41 7 29 30-17 65H74Z" fill="#273a43" stroke="#111e28" strokeWidth="6" /><path d="M89 143q-16-26-3-48l28 22 17-25 10 35-14 32Z" fill="#343941" stroke="#111e28" strokeWidth="5" /><path d="M89 117 74 84l31 17m35 10 26-30-12 41" fill="#884d58" stroke="#242932" strokeWidth="5" /><path d="M97 132q17-10 36 1l-7 19-25 2Z" fill="#56616a" /><circle cx="119" cy="135" r="5" fill={C.cyan} /><path d="M110 151h36" stroke="#d0c8c4" strokeWidth="3" strokeLinecap="round" /><path d="M78 189h58m-48 12h40" stroke="#516a75" strokeWidth="6" /><path d="M48 197 188 157l8 16-143 43Z" fill="#526c79" stroke="#13222b" strokeWidth="5" /><path d="m60 206-17 26m17-26 8 8m88-54h25m-18-6v13" stroke="#19232c" strokeWidth="5" /><path d="M82 226q-34 9-30 25 6 10 23-2" fill="none" stroke="#252d35" strokeWidth="6" strokeLinecap="round" /></g>;
    case 'anointed': return <g><path d="M59 145q66-35 132 0l-9 93q-57 24-114 0Z" fill="#503948" stroke="#181c27" strokeWidth="6" /><path d="M71 151 99 127l25 22 26-22 29 24-16 31-38-18-38 18Z" fill="#263653" stroke="#1a2531" strokeWidth="5" /><path d="M101 76q24-18 48 0v58h-48Z" fill={C.gold} stroke="#17222d" strokeWidth="5" /><path d="M103 104h12m19 0h12" stroke="#203047" strokeWidth="5" /><path d="M124 92v38m-13-2 13 15 13-15" fill="none" stroke="#fff0ba" strokeWidth="4" /><path d="M93 80 87 52l20 14 18-32 18 32 21-14-7 30Z" fill={C.gold} stroke="#17222d" strokeWidth="5" /><circle cx="124" cy="63" r="6" fill={C.red} /><ellipse cx="124" cy="55" rx="50" ry="13" fill="none" stroke={C.cyan} strokeWidth="5" /><path d="m124 152 20 24-20 31-20-31Z" fill={C.gold} stroke="#fff0ba" strokeWidth="3" /><path d="M88 192h72" stroke="#93434c" strokeWidth="8" /></g>;
    case 'executive_p': return <g><Boots accent={accent} /><path d="M78 138h94l19 97H59Z" fill="#172530" stroke="#111b25" strokeWidth="6" /><path d="M100 139 125 166l25-27" fill="none" stroke="#ccd4d1" strokeWidth="5" /><path d="M116 163h18v61h-18Z" fill={C.cream} /><path d="M124 167v50" stroke="#151d26" strokeWidth="6" /><path d="M97 84q28-25 56 0v54H97Z" fill={C.cream} stroke="#26333b" strokeWidth="5" /><path d="M94 88q4-32 34-34 28 4 30 33l-13-7-17 7-16-7Z" fill="#28252b" /><path d="M107 106h12m15 0h12" stroke="#25272c" strokeWidth="4" /><path d="M73 181 58 221m116-40 15 40" stroke="#172530" strokeWidth="12" strokeLinecap="round" /><path d="M56 222 47 191l10-37 35 11-9 39Z" fill="#242c35" stroke="#7c8b91" strokeWidth="4" /><path d="M62 193 75 168m-10 30 16-24m-10 31 19-20" stroke={C.cyan} strokeWidth="5" strokeLinecap="round" /><path d="M43 189 29 177m23 22-16 10m28-7 1 17" stroke={C.cyan} strokeWidth="4" strokeLinecap="round" /></g>;
    case 'alpha_prime': return <g><Boots accent={accent} wide /><Core accent={accent} wide /><path d="M87 148q-19-29 7-45l31 12 31-12q26 16 7 45l-21 29h-34Z" fill="#b8c0c4" stroke="#1b252e" strokeWidth="6" /><path d="M84 153 57 177l20 35 33-22m73-37 27 24-20 35-33-22" fill="#adb8be" stroke="#1b252e" strokeWidth="6" /><path d="M95 107q30-24 60 0v39q-30 20-60 0Z" fill="#bdc5c5" stroke="#1b252e" strokeWidth="5" /><Visor accent={accent} width={68} /></g>;
    case 'roll_safe': return <g><Boots accent={accent} /><path d="M68 141q15-23 57-26 43 3 57 26l14 93H54Z" fill="#292a2d" stroke="#111b25" strokeWidth="6" /><path d="m91 145 34 25 34-25m-34 25v48" fill="none" stroke="#64717a" strokeWidth="6" /><path d="M97 83q28-23 56 0v55q-28 22-56 0Z" fill="#80533d" stroke="#26333b" strokeWidth="5" /><path d="M96 89q7-31 30-33 27 3 29 34l-15-7-13 7-13-7Z" fill="#241e1b" /><path d="M106 107h12m15 0h12" stroke="#221d1a" strokeWidth="4" strokeLinecap="round" /><path d="M107 126q18 8 36 0" fill="none" stroke="#352521" strokeWidth="4" /><path d="M151 91q20-24 15-42m-2 2 4-10m-7 14 9-5" fill="none" stroke="#80533d" strokeWidth="9" strokeLinecap="round" /><path d="M64 209 87 177m87 36-14-25" stroke="#252a30" strokeWidth="13" strokeLinecap="round" /><path d="m156 93-4-14m-2 12 12-2" stroke="#80533d" strokeWidth="6" strokeLinecap="round" /></g>;
    case 'hotwired': return <g><Core accent={accent} /><path d="M92 111q5-39 33-43 30 4 33 43l-8 45q-25 18-50 0Z" fill="#b5b2aa" stroke="#17242c" strokeWidth="5" /><path d="M99 118h18m16 0h18" stroke="#18191f" strokeWidth="13" strokeLinecap="round" /><circle cx="108" cy="118" r="7" fill={accent} /><circle cx="142" cy="118" r="7" fill={accent} /><path d="m125 124-8 18 13 2" fill="none" stroke="#67666a" strokeWidth="5" strokeLinejoin="round" /><path d="M105 153q20-10 40 0l-5 14h-30Z" fill="#211f25" stroke="#111b25" strokeWidth="4" /><path d="M110 155v8m10-10v10m10-10v10m10-8v8" stroke="#c4c1b8" strokeWidth="3" /><path d="M89 100 79 63m24 30-1-43m22 40 7-46m14 52 18-40m-70 34-24-23m94 34 28-28" stroke="#38474e" strokeWidth="10" strokeLinecap="round" /><Cables accent={accent} /><path d="M183 167v55m-9-42h18" stroke={C.orange} strokeWidth="7" /><path d="m74 167-17 53m115-54 18 48" stroke="#272d35" strokeWidth="12" strokeLinecap="round" /></g>;
    case 'panic_bot': return <g><Boots accent={accent} wide /><Core accent={accent} wide /><path d="M88 77h74l9 23-9 43-37 12-37-12-9-43Z" fill="#354755" stroke="#14202a" strokeWidth="6" /><Visor accent={C.gold} width={60} y={105} /><path d="M99 77 84 49m67 28 15-30" stroke="#7d91a2" strokeWidth="5" /><circle cx="84" cy="49" r="8" fill={accent} /><circle cx="166" cy="48" r="8" fill={accent} /><path d="M125 165a19 19 0 1 0 0 38 19 19 0 1 0 0-38Z" fill="#182630" stroke={accent} strokeWidth="5" /><path d="M125 174v17" stroke={accent} strokeWidth="5" /></g>;
    case 'primate': return <g>
      <path d="M57 163q9-41 68-41 59 0 68 41l-11 77H69Z" fill="#292934" stroke="#19232d" strokeWidth="6" />
      <path d="M75 159 55 206l-1 34m123-81 20 47 1 34" fill="none" stroke="#514b57" strokeWidth="22" strokeLinecap="round" /><path d="M74 230 52 240m126-10 22 10" stroke="#302f38" strokeWidth="13" strokeLinecap="round" />
      <path d="M78 116q-12-46 47-58 59 12 47 58l-14 40q-33 19-66 0Z" fill="#514b57" stroke="#19232d" strokeWidth="6" /><circle cx="82" cy="116" r="15" fill="#514b57" stroke="#19232d" strokeWidth="5" /><circle cx="168" cy="116" r="15" fill="#514b57" stroke="#19232d" strokeWidth="5" />
      <path d="M91 132q34-22 68 0l-8 31q-26 17-52 0Z" fill="#83919a" stroke="#263442" strokeWidth="4" /><path d="M104 143h12m18 0h12" stroke="#f0d7a5" strokeWidth="5" strokeLinecap="round" /><path d="M108 157q17 10 34 0" fill="none" stroke="#263442" strokeWidth="4" />
      <path d="M91 76q12-38 42-30 27 8 32 31l-16 7-13-14-11 12-13-13-14 12Z" fill="#bf5d9f" stroke="#312d38" strokeWidth="5" /><path d="M84 183h82m-61 8 20 19 20-19" fill="none" stroke={C.cyan} strokeWidth="5" /><path d="M95 185 86 232m59-47 12 47" stroke="#34323d" strokeWidth="7" />
    </g>;
    case 'pain_hider': return <g><Boots accent={accent} /><path d="M78 141q47-24 94 0l15 93H63Z" fill="#1e2831" stroke="#111b25" strokeWidth="6" /><path d="M94 82q31-27 62 0v61q-31 20-62 0Z" fill="#c4aa91" stroke="#29303a" strokeWidth="5" /><path d="M99 89q8-18 27-17 16 0 25 17" fill="none" stroke="#e0d9ca" strokeWidth="7" /><path d="M103 111h13m18 0h13" stroke="#41352f" strokeWidth="4" /><path d="M117 118v14m-11 8q18 7 36 0" fill="none" stroke="#8f725e" strokeWidth="4" /><path d="M95 100h10v20H95Zm54 0h10v20h-10Z" fill="#87949a" stroke={C.cyan} strokeWidth="3" /><path d="M67 163 53 204m130-42 15 39" stroke="#202a33" strokeWidth="14" strokeLinecap="round" /><path d="M153 168q-8 21-29 13" fill="none" stroke="#c4aa91" strokeWidth="10" strokeLinecap="round" /><path d="M155 187h34v46h-34Z" fill="#4bb6e5" stroke="#c5d6db" strokeWidth="4" /><path d="M158 192h28" stroke={C.cyan} strokeWidth="5" /><path d="M186 195q17 4 3 19" fill="none" stroke="#c5d6db" strokeWidth="4" /></g>;
    case 'prom_king': return <g><Boots accent={accent} /><path d="M70 143q55-26 110 0l17 91H53Z" fill="#182430" stroke="#111b25" strokeWidth="6" /><path d="M102 142 125 166l23-24m-23 24v42" fill="none" stroke="#cedadd" strokeWidth="5" /><path d="M116 162h18v58h-18Z" fill="#e2ded6" /><path d="M124 167v44" stroke="#25242d" strokeWidth="6" /><path d="M100 83q25-24 50 0v58h-50Z" fill={C.cream} stroke="#26333b" strokeWidth="5" /><path d="M97 89q6-23 28-24 23 2 28 24l-14-7-14 8-14-8Z" fill="#27242b" /><path d="M107 108h11m14 0h11" stroke="#25242d" strokeWidth="4" /><path d="M100 57 92 34l21 10 12-29 13 29 21-10-8 23Z" fill={accent} stroke="#192530" strokeWidth="5" /><circle cx="125" cy="36" r="5" fill={C.cyan} /><path d="M67 201 95 177m83 24-27-27" stroke="#182430" strokeWidth="13" strokeLinecap="round" /><path d="m90 176 21-8m32 10-11-6" stroke="#d5b994" strokeWidth="9" strokeLinecap="round" /></g>;
    case 'idol_core': return <g><path d="M90 148q35-31 70 0l17 85q-52 18-104 0Z" fill="#d8e6dc" stroke="#17242d" strokeWidth="6" /><Wings accent={accent} /><path d="M125 203q-35-20-21-42 13-12 21 2 8-14 21-2 14 22-21 42Z" fill={accent} stroke="#ffe0f1" strokeWidth="3" /><ellipse cx="125" cy="65" rx="38" ry="11" fill="none" stroke={accent} strokeWidth="5" /><path d="M101 112q24-10 48 0" stroke={accent} strokeWidth="6" /><path d="M81 134 65 163m-7-9 14 16m-18-7 21 0" fill="none" stroke={C.dark} strokeWidth="8" strokeLinecap="round" /><circle cx="63" cy="126" r="10" fill={accent} stroke="#ffe0f1" strokeWidth="3" /><path d="M180 118q17-18 28 0m-20 8q22-13 34 1" fill="none" stroke={accent} strokeWidth="4" /></g>;
    case 'danger_zone': return <g><Boots accent={accent} /><path d="M72 140q53-26 106 0l17 93H55Z" fill="#151d27" stroke="#201923" strokeWidth="6" /><path d="M95 143h60v59H95Z" fill="#151d27" stroke="#36323a" strokeWidth="4" /><path d="M101 151v42m48-42v42m-48-24h48" stroke={accent} strokeWidth="5" strokeLinecap="round" /><path d="M99 75q26-23 52 0v58q-26 20-52 0Z" fill="#d7cfc6" stroke="#29313a" strokeWidth="5" /><path d="M95 86q5-27 29-31 27 3 31 31l-10-10-11 5-12-8-15 8-12-4Z" fill="#a6a4a3" /><path d="M105 105h11m17 0h11" stroke="#2a292d" strokeWidth="4" /><path d="M113 127q12 6 24 0" fill="none" stroke="#713d41" strokeWidth="4" /><path d="M79 154 58 175l-15 27m128-48 22 21 15 27" fill="none" stroke="#151d27" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" /><path d="M57 199 43 206m142-7 15 7" stroke="#d7cfc6" strokeWidth="9" strokeLinecap="round" /><path d="M70 168 55 183m126-15 15 15" stroke={accent} strokeWidth="5" /></g>;
    case 'the_tank': return <g><path d="M60 150q5-61 65-82 60 21 65 82l-13 78q-52 20-104 0Z" fill="#6c7072" stroke="#222c32" strokeWidth="7" /><path d="M70 134 52 97l31 16m111 21 20-36-32 14" fill="#697989" stroke="#18232d" strokeWidth="6" /><path d="m75 160 20-17 9 11m61 2-15-15 24 8m-73 61 20-11 11 13m34-1 18-12" fill="none" stroke="#8b9191" strokeWidth="6" strokeLinejoin="round" /><circle cx="105" cy="122" r="17" fill="#e1d6d7" /><circle cx="145" cy="122" r="17" fill="#e1d6d7" /><circle cx="106" cy="123" r="6" fill="#26313a" /><circle cx="145" cy="123" r="6" fill="#26313a" /><path d="M109 161q16 8 32 0" fill="none" stroke="#242b30" strokeWidth="5" /><path d="M125 165v-49" fill="none" stroke={C.cream} strokeWidth="14" strokeLinecap="round" /><circle cx="125" cy="111" r="9" fill={C.cream} /><path d="M69 225 63 254m118-29 6 29" stroke="#3d4449" strokeWidth="15" strokeLinecap="round" /><path d="M82 245h-27m113 0h27" stroke="#3d4449" strokeWidth="9" strokeLinecap="round" /></g>;
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