import { useId } from 'react';

export interface SculptedPawnProps {
  characterId: string;
  selected?: boolean;
}

const C = {
  cyan: '#35e3f2', red: '#ff435c', gold: '#ffc44e', pink: '#f145d0',
  lime: '#a3f34e', violet: '#b47bff', orange: '#ff852f', ice: '#abf8ff',
  steel: '#8399a8', dark: '#101723', light: '#d6e0e2', cream: '#e3d2ba',
};

const accents: Record<string, string> = {
  guardian_h: C.cyan, click_click: C.pink, frostbyte: C.cyan, sadman: C.lime,
  rainbow_dash: C.orange, accuser: C.red, low_flame: C.orange, wandering_eye: C.pink,
  the_rind: C.gold, anointed: C.gold, executive_p: C.red, alpha_prime: C.violet,
  roll_safe: C.pink, hotwired: C.red, panic_bot: C.red, primate: C.pink,
  pain_hider: C.cyan, prom_king: C.violet, idol_core: C.pink, danger_zone: C.orange,
  the_tank: C.violet,
};

function Base({ accent, selected }: { accent: string; selected: boolean }) {
  return <g>
    <ellipse cx="125" cy="298" rx="94" ry="16" fill="#03060c" opacity=".84" />
    <path d="M34 269h182v20q0 18-91 18t-91-18Z" fill="url(#plinth-side)" stroke="#080d16" strokeWidth="5" />
    <path d="M39 278q13 15 86 15t86-15" fill="none" stroke="#0e1723" strokeWidth="3" />
    <ellipse cx="125" cy="269" rx="91" ry="19" fill="#222e3c" stroke="#8191a0" strokeWidth="3" />
    <ellipse cx="125" cy="268" rx="83" ry="15" fill="url(#plinth-top)" stroke="#f253d3" strokeWidth="4" />
    <ellipse cx="125" cy="266" rx="70" ry="10" fill="#101824" stroke={accent} strokeWidth="1.8" />
    <path d="M52 279q18 9 48 10" fill="none" stroke="#fb55d7" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M151 289q28-2 46-12" fill="none" stroke="#42e7fa" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M111 298h28" stroke={accent} strokeWidth="4" strokeLinecap="round" />
    <path d="M55 264q20-11 48-12" fill="none" stroke="#d1dbe4" strokeWidth="1.5" opacity=".62" />
    {selected && <ellipse cx="125" cy="269" rx="99" ry="21" fill="none" stroke={accent} strokeWidth="2.5" />}
  </g>;
}
function Boots({ accent, wide = false }: { accent: string; wide?: boolean }) {
  const spread = wide ? 30 : 20;
  return <g stroke="#101923" strokeWidth="5" strokeLinejoin="round">
    <path d={`M${125 - spread - 13} 202h26l-5 54h-29ZM${125 + spread - 13} 202h26l5 54h-26Z`} fill="url(#armor)" />
    <path d={`M${125 - spread - 18} 247h29l4 22-43 1 4-12ZM${125 + spread - 11} 247h29l11 22-43-1Z`} fill="#141e2b" />
    <path d={`M${125 - spread - 10} 237h20m30 0h20`} stroke={accent} strokeWidth="4" />
    <path d={`M${125 - spread - 9} 209v18m30-18v18`} stroke="#dce8ee" strokeWidth="2" opacity=".57" />
  </g>;
}
function Core({ accent, wide = false }: { accent: string; wide?: boolean }) {
  const l = wide ? 71 : 53;
  return <g strokeLinejoin="round">
    <path d={`M${125 - l} 137h${l * 2}l${wide ? 25 : 18} 25-12 48q-38 17-${l - 5} 0l-12-48Z`} fill="url(#armor)" stroke="#111b25" strokeWidth="6" />
    <path d={`M${125 - l + 12} 150h${l * 2 - 24}l10 16-8 32q-24 8-48 0l-9-32Z`} fill="url(#steel)" stroke="#8ca3b3" strokeWidth="2.5" />
    <path d={`M${125 - l + 12} 185h${l * 2 - 24}`} stroke={accent} strokeWidth="5" strokeLinecap="round" />
    <path d={`M${125 - l + 18} 158h${l * 2 - 36}`} stroke="#f7fbfd" strokeWidth="2" opacity=".42" />
  </g>;
}
function Visor({ accent, y = 102, width = 58 }: { accent: string; y?: number; width?: number }) {
  return <g>
    <path d={`M${125 - width / 2} ${y}q${width / 2} -11 ${width} 0l-5 18q-${width / 2} 9-${width - 7} 0Z`} fill="#101a25" stroke="#8296a6" strokeWidth="3" />
    <path d={`M${125 - width / 2 + 8} ${y + 7}q${width / 2 - 8} -6 ${width - 16} 0`} fill="none" stroke={accent} strokeWidth="6" strokeLinecap="round" />
    <path d={`M${125 - width / 2 + 8} ${y + 4}h${width - 22}`} stroke="#f8fcff" strokeWidth="1.5" opacity=".5" />
  </g>;
}
function Cables({ accent }: { accent: string }) {
  return <g fill="none" strokeLinecap="round"><path d="M96 153q-40 30-30 75" stroke={accent} strokeWidth="6" /><path d="M154 153q42 22 28 66" stroke={C.orange} strokeWidth="5" /><path d="M108 228q22 22 55 9" stroke={C.cyan} strokeWidth="4" /></g>;
}
function Crown({ accent }: { accent: string }) {
  return <g stroke="#17222d" strokeWidth="3" strokeLinejoin="round"><path d="m98 88-7-34 17 12 17-27 17 27 17-12-7 34Z" fill={accent} /><path d="M98 84h54v12H98Z" fill="#927197" /><path d="m125 72 6 8-6 8-6-8Z" fill={C.cyan} stroke="none" /></g>;
}
function Wings({ accent }: { accent: string }) {
  return <g stroke="#718493" strokeWidth="3" strokeLinejoin="round"><path d="M99 158 62 125 37 108 52 147 76 164 95 174ZM151 158 188 125 213 108 198 147 174 164 155 174Z" fill="#344658" /><path d="m41 113 38 41 17 13M209 113l-38 41-17 13" fill="none" stroke={accent} strokeWidth="5" /></g>;
}

function Signature({ id, accent }: { id: string; accent: string }) {
  switch (id) {
    case 'guardian_h': return <g><Boots accent={accent} wide /><Core accent={accent} wide /><path d="M55 156q5-55 70-58 65 3 70 58l-15 63H70Z" fill="url(#armor)" stroke="#101923" strokeWidth="6" /><path d="M77 151q8-45 48-46 40 1 48 46l-12 37q-36 22-72 0Z" fill="#25323b" stroke="#111b25" strokeWidth="5" /><ellipse cx="83" cy="123" rx="17" ry="21" fill="#25323b" stroke="#111b25" strokeWidth="4" /><ellipse cx="167" cy="123" rx="17" ry="21" fill="#25323b" stroke="#111b25" strokeWidth="4" /><path d="M95 155q30-18 60 0l-8 25q-22 13-44 0Z" fill="#83949c" stroke="#18242c" strokeWidth="4" /><path d="m110 164 15 9 15-9" fill="none" stroke="#131d25" strokeWidth="5" /><path d="M103 135q8-6 15 0m14 0q8-6 15 0" fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round" /><path d="M99 91q26-25 52 0l-8-30-18 18-18-18Z" fill="#512c43" stroke="#16222c" strokeWidth="5" /><path d="M68 165 48 190l20 28 26-17m62-36 25 25-21 31-25-18" fill="#637787" stroke="#17232d" strokeWidth="6" /><path d="m102 187 23 14 23-14" fill="none" stroke={accent} strokeWidth="6" /></g>;
    case 'click_click': return <g>
      <path d="M65 186q17-38 60-36 52-4 69 38l-13 48H82Z" fill="#705f76" stroke="#19232d" strokeWidth="6" />
      <path d="M79 218v26q-12 12-30 4m58-31v30q-10 11-26 5m61-32v28q10 13 26 6m0-49v24q13 13 29 5" fill="none" stroke="#4a4857" strokeWidth="14" strokeLinecap="round" />
      <path d="M78 151q-38-9-39-44 4-16 18-11 12 6 3 21 18 0 30 12" fill="none" stroke="#776981" strokeWidth="13" strokeLinecap="round" />
      <path d="M78 111 69 49l39 34m34 0 39-34-9 62" fill="#cc59cf" stroke="#17242c" strokeWidth="6" />
      <path d="M79 124q-2-47 46-55 48 8 46 55l-12 34q-34 22-68 0Z" fill="#766b7d" stroke="#19232d" strokeWidth="6" />
      <path d="M95 115q11-7 20 0m20 0q9-7 20 0" fill="none" stroke={accent} strokeWidth="6" strokeLinecap="round" />
      <ellipse cx="125" cy="145" rx="25" ry="31" fill="#121b25" stroke="#ead5e8" strokeWidth="4" />
      <path d="M108 150q17-12 34 0v17q-17 10-34 0Z" fill={C.red} />
      <path d="M89 133 53 124m39 23-43 4m112-18 36-9m-38 23 43 4" stroke="#dce6ed" strokeWidth="3" strokeLinecap="round" />
      <Cables accent={accent} /><path d="M181 174h12v12h-12m8-26h8v8h-8" fill={C.cyan} />
    </g>;
    case 'frostbyte': return <g><Boots accent={accent} /><Core accent={accent} /><path d="M79 173 68 112 84 65l22 7 19-39 20 38 24-9 18 50-13 61-49 28Z" fill="#172632" stroke="#14232e" strokeWidth="6" /><path d="M94 139q6-36 31-40 26 4 31 40l-12 24q-19 13-38 0Z" fill="#111c28" stroke="#344d5b" strokeWidth="4" /><path d="m110 126 15-22 15 22-8 32h-14Z" fill="url(#ice)" stroke="#d0ffff" strokeWidth="3" /><path d="m72 159-20-24 12-35 25 23m74 34 24-25-10-32-29 25" fill="#5deafb" stroke="#396a79" strokeWidth="4" /><path d="m87 193 25-22 26 22 18 38H91Z" fill="#355266" stroke="#14232e" strokeWidth="5" /><path d="m129 194 12 17-13 20-13-20Z" fill={C.cyan} /></g>;
    case 'sadman': return <g><Boots accent={accent} /><path d="M78 129h94l17 105H62Z" fill="#202a35" stroke="#111b25" strokeWidth="6" /><path d="m96 130 29 33 29-33 13 29-42 28-42-28Z" fill={C.cream} stroke="#26323a" strokeWidth="4" /><path d="m119 161 6 13 7-13v58h-13Z" fill={C.cyan} /><path d="M88 76q36-27 73 1l-7 65q-29 21-59-1Z" fill="#6fa948" stroke="#14232b" strokeWidth="5" /><path d="M91 97q-20-9-17-23 16-5 22 13m64 10q20-9 17-23-16-5-22 13" fill="#6fa948" stroke="#14232b" strokeWidth="4" /><path d="M101 111q9-6 18 0m12 0q9-6 18 0" stroke="#24332f" strokeWidth="4" strokeLinecap="round" /><path d="m117 115 8 13 8-13m-19 24q11 6 22 0" fill="none" stroke="#33473e" strokeWidth="4" /><path d="M159 167h43v34h-43Z" fill="#153b48" stroke={C.cyan} strokeWidth="3" /><circle cx="170" cy="178" r="4" fill={C.lime} /><circle cx="185" cy="188" r="4" fill={C.cyan} /><path d="m154 157 18 18" stroke="#6fa948" strokeWidth="9" strokeLinecap="round" /></g>;
    case 'rainbow_dash': return <g><path d="M80 144q-20-24-9-52l34 23 18-40 19 40 34-24q12 30-12 54l-18 35H96Z" fill="#bbcbd5" stroke="#172530" strokeWidth="6" /><path d="m100 130 7 21m37-21-7 21" stroke={C.cyan} strokeWidth="6" strokeLinecap="round" /><circle cx="111" cy="128" r="5" fill={C.cyan} /><circle cx="138" cy="128" r="5" fill={C.cyan} /><path d="M71 177h111l16 34H66Z" fill="#93aab8" stroke="#172530" strokeWidth="6" /><path d="M84 188h85m-75 14h65" stroke="#6f808d" strokeWidth="5" /><path d="m84 208-7 31m27-31v34m52-34 8 31m-29-31v34" stroke="#475562" strokeWidth="10" strokeLinecap="round" /><path d="M74 235h-14m120 0h14" stroke="#252d36" strokeWidth="8" strokeLinecap="round" /><path d="M175 171q30-16 44 4m-35 3q29-9 45 8m-39 3q27-5 40 12" fill="none" stroke={C.red} strokeWidth="6" strokeLinecap="round" /><path d="M183 171q30-16 44 4m-35 3q29-9 45 8m-39 3q27-5 40 12" fill="none" stroke={C.orange} strokeWidth="4" strokeLinecap="round" transform="translate(0 6)" /><path d="M189 176q30-16 44 4m-35 3q29-9 45 8m-39 3q27-5 40 12" fill="none" stroke={C.cyan} strokeWidth="3" strokeLinecap="round" transform="translate(0 12)" /></g>;
    case 'accuser': return <g><Boots accent={accent} /><path d="M79 133q46-25 92 0l17 100H63Z" fill="#1c2028" stroke="#101923" strokeWidth="6" /><path d="M100 140h50v58h-50Z" fill="#b52e40" stroke="#481f29" strokeWidth="4" /><path d="M101 148h48v9h-48Z" fill={accent} /><path d="M97 72q29-23 58 0v57q-29 22-58 0Z" fill={C.cream} stroke="#26303a" strokeWidth="5" /><path d="M93 89q9-31 34-30 31 3 34 31l-10-9-13 7-10-8-16 8-15-6Z" fill="#20232a" /><path d="M104 105h12m17 0h12" stroke="#27252a" strokeWidth="4" strokeLinecap="round" /><path d="M121 115q4 7 9 0m-12 13q10 9 21 0" fill="none" stroke="#7c3435" strokeWidth="4" /><path d="M75 152 53 126m9-10-17 12 18 6" fill="none" stroke="#20252c" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" /><path d="m42 125-12 1 10-9" fill={C.cream} stroke="#20252c" strokeWidth="3" strokeLinejoin="round" /><path d="m165 159 20 42" stroke="#343e49" strokeWidth="13" strokeLinecap="round" /></g>;
    case 'low_flame': return <g strokeLinejoin="round">
      <path d="M79 258q-26-23-3-55-1-30 22-57 1 25 15 31-10-50 24-96 1 37 22 52 18 15 17 39 20-10 23-38 28 37 0 77-13 28-3 49l-20 22-64 4Z" fill="url(#flame-outer)" stroke="#42151c" strokeWidth="5" />
      <path d="M98 244q-12-21 8-48-2-26 13-46 3 23 17 28-2-26 13-52 4 30 17 44 9 12 6 33 15-8 17-25 12 26-5 49-15 18-7 38l-27 20-39-1Z" fill="url(#flame-inner)" stroke="#ff9a3e" strokeWidth="3" />
      <path d="M116 224q-1-24 17-42 0 22 15 29 16 8 6 28-15 18-33 8Z" fill="#36121b" stroke="#ffcf61" strokeWidth="3" />
      <path d="M120 211q7-15 15-20 0 13 9 22-6 8-17 7Z" fill="#fff0a0" />
      <path d="M113 185q12-11 24-2m11 3q10-8 18 1" fill="none" stroke="#fff2a2" strokeWidth="5" strokeLinecap="round" />
      <path d="M120 205q14 9 28 0" fill="none" stroke="#ff4b31" strokeWidth="4" strokeLinecap="round" />
      <path d="M103 159q-9-15 1-32m63 9q14-18 12-35" fill="none" stroke="#ffcf58" strokeWidth="3" opacity=".92" />
    </g>;
    case 'wandering_eye': return <g strokeLinejoin="round">
      <path d="M57 213q-29 14-18 38 16 15 36-5l18-31m89 1q31 14 26 35-10 17-33 0l-17-27M87 227q-19 13-13 29 9 12 23-3m67-26q19 14 15 29-8 12-22-3" fill="none" stroke="#4d225d" strokeWidth="13" strokeLinecap="round" />
      <path d="M79 173q-4-39 24-55l-9-31 28 18 26-35 2 39 31-11-14 34q20 28 3 71-20 33-57 31-38-3-49-28Z" fill="url(#eye-beast)" stroke="#271337" strokeWidth="7" />
      <path d="M84 162q-14-10-11-26l23 5m80 17q17-13 18-29l-24 7M96 129 77 105l27 10m43-2 27-28-12 40" fill="none" stroke="#b738d6" strokeWidth="8" strokeLinecap="round" />
      <ellipse cx="126" cy="157" rx="44" ry="34" fill="#d7d4df" stroke="#f15ae8" strokeWidth="6" />
      <ellipse cx="129" cy="157" rx="28" ry="29" fill="url(#eye-iris)" stroke="#73226f" strokeWidth="4" />
      <ellipse cx="130" cy="157" rx="13" ry="21" fill="#130e23" />
      <ellipse cx="130" cy="157" rx="5" ry="15" fill="#050811" />
      <circle cx="117" cy="145" r="7" fill="#fff5ff" />
      <path d="M92 133q34-25 69-1m-68 48q32 22 65 1" fill="none" stroke="#fbadf3" strokeWidth="3" opacity=".9" />
      <path d="m72 184-19 4m118-53 25-10m-87 92-9 18m39-202-1-19" stroke="#f17bdd" strokeWidth="5" strokeLinecap="round" />
    </g>;
    case 'the_rind': return <g strokeLinejoin="round">
      <path d="M75 244q-14-26-5-58l18-48q12-25 39-26 31 1 48 27l18 54-4 51Z" fill="url(#rind-armor)" stroke="#111827" strokeWidth="7" />
      <path d="m84 161-20 18 8 40 27-7m74-50 22 17-9 42-28-8" fill="#343b48" stroke="#111827" strokeWidth="7" />
      <path d="m93 141 9-37 25-17 30 13 13 38-21 26-37-1Z" fill="#b78b2d" stroke="#1c2230" strokeWidth="6" />
      <path d="m102 117 23-15 31 12-5 23-48 3Z" fill="#111b2a" stroke="#f7c739" strokeWidth="4" />
      <path d="M111 127h31" stroke="#54e9fb" strokeWidth="6" strokeLinecap="round" />
      <path d="m100 163 23 18 30-17-9 56-21 12-20-15Z" fill="#414958" stroke="#121a27" strokeWidth="5" />
      <path d="m105 174 19 10 26-12m-27 13v46" fill="none" stroke="#f2c33e" strokeWidth="5" />
      <path d="m80 191-30 43 8 8 38-35m75-22 28-7 31 12-4 8-34-8-29 34Z" fill="#273342" stroke="#0c1420" strokeWidth="6" />
      <path d="m182 182 52 8 3 7-55-1Z" fill="#b9c7d0" stroke="#111722" strokeWidth="3" />
      <path d="m64 232-7 23m135-46 12 39m-91-86 24 8 26-9" fill="none" stroke="#ffe47a" strokeWidth="3" />
    </g>;
    case 'anointed': return <g><path d="M59 145q66-35 132 0l-9 93q-57 24-114 0Z" fill="#503948" stroke="#181c27" strokeWidth="6" /><path d="M71 151 99 127l25 22 26-22 29 24-16 31-38-18-38 18Z" fill="#263653" stroke="#1a2531" strokeWidth="5" /><path d="M101 76q24-18 48 0v58h-48Z" fill={C.gold} stroke="#17222d" strokeWidth="5" /><path d="M103 104h12m19 0h12" stroke="#203047" strokeWidth="5" /><path d="M124 92v38m-13-2 13 15 13-15" fill="none" stroke="#fff0ba" strokeWidth="4" /><path d="M93 80 87 52l20 14 18-32 18 32 21-14-7 30Z" fill={C.gold} stroke="#17222d" strokeWidth="5" /><circle cx="124" cy="63" r="6" fill={C.red} /><ellipse cx="124" cy="55" rx="50" ry="13" fill="none" stroke={C.cyan} strokeWidth="5" /><path d="m124 152 20 24-20 31-20-31Z" fill={C.gold} stroke="#fff0ba" strokeWidth="3" /><path d="M88 192h72" stroke="#93434c" strokeWidth="8" /></g>;
    case 'executive_p': return <g strokeLinejoin="round">
      <path d="M78 151 60 234l18 16h93l20-17-18-83-20-14h-56Z" fill="url(#suit-paint)" stroke="#090d16" strokeWidth="7" />
      <path d="m93 149 32 30 32-30 14 22-19 25h-54l-20-26Z" fill="#1b2736" stroke="#687a8e" strokeWidth="3" />
      <path d="m125 177 13 15-13 38-13-38Z" fill="#d62e49" stroke="#e85668" strokeWidth="3" />
      <path d="M122 190h6v36h-6Z" fill="#f3d8cb" />
      <path d="m78 164-21 49 14 13 20-33m87-30 22 48-14 13-21-33" fill="#222d3b" stroke="#0a111a" strokeWidth="6" />
      <path d="M93 55 164 45l8 13v72l-9 15-69-2-10-12V68Z" fill="url(#monitor-case)" stroke="#0a0f18" strokeWidth="7" />
      <path d="m101 66 59-7v56l-59 7Z" fill="#080e18" stroke="#718396" strokeWidth="3" />
      <path d="m111 85 13-9 13 5 10-7m-34 31 36-5" fill="none" stroke="#f44b63" strokeWidth="5" strokeLinecap="round" />
      <circle cx="155" cy="126" r="4" fill="#31e8ef" />
      <path d="m81 86-19-12m99-27 14-13" stroke="#ff526b" strokeWidth="4" strokeLinecap="round" />
      <path d="M84 246v17m78-17v17" stroke="#8fa5b8" strokeWidth="7" />
    </g>;
    case 'alpha_prime': return <g strokeLinejoin="round">
      <path d="M65 226q-17-42 4-84 13-31 46-35l12 13 13-14q44 5 54 40 9 42-13 83l-34 22-63-4Z" fill="url(#gorilla-fur)" stroke="#100f1d" strokeWidth="8" />
      <path d="M74 146q-34-20-24-54 13-33 51-28l27 25-13 42m57 0q36-28 25-60-16-33-52-17l-27 28 14 38" fill="#302248" stroke="#0e111d" strokeWidth="8" />
      <path d="M78 153q-15 14-17 40l28 25 22-15-7-40m61-10q15 15 18 39l-28 24-23-15 8-39" fill="#8741a6" stroke="#281632" strokeWidth="5" />
      <path d="M91 130q30-31 66-1l14 41-22 36-43 2-28-35Z" fill="#462b55" stroke="#171322" strokeWidth="6" />
      <path d="M98 152q27-19 56 0l-7 33q-21 17-43 0Z" fill="url(#gorilla-muzzle)" stroke="#17111d" strokeWidth="4" />
      <path d="M104 153h11m21 0h11" stroke="#ffc16d" strokeWidth="6" strokeLinecap="round" />
      <path d="M110 180q15-9 31 0m-27 14 8 8 8-8 8 8 8-8" fill="none" stroke="#f1d8c6" strokeWidth="4" />
      <path d="M75 203q-5 22 13 39m88-40q7 24-13 40" fill="none" stroke="#f54dc9" strokeWidth="6" />
      <path d="m108 110 17 14 18-15" fill="none" stroke="#bd75ec" strokeWidth="5" />
    </g>;
    case 'roll_safe': return <g strokeLinejoin="round">
      <path d="M77 158q0-46 48-51 48 5 48 51v82H77Z" fill="url(#case-paint)" stroke="#080e18" strokeWidth="7" />
      <path d="M87 166h76v56H87Z" fill="#111b2a" stroke="#526c87" strokeWidth="4" />
      <path d="M93 163q-5-26 11-41-2-20 14-29 6 18 12 20 3-27 24-35-4 23 4 33 20 14 11 43-9 23-39 26-25-1-37-17Z" fill="url(#brain-paint)" stroke="#682e86" strokeWidth="4" />
      <path d="M111 108q-16 7-7 23m29-41q-8 16 2 25m23-14q-12 14-5 28m-37 1q-7 12 3 21m22-20q13 9 7 21" fill="none" stroke="#ff9aed" strokeWidth="3" />
      <path d="M95 179h60v31H95Z" fill="#172538" stroke="#546f8c" strokeWidth="3" />
      <circle cx="125" cy="194" r="10" fill="#09101a" stroke="#ff5bda" strokeWidth="3" />
      <path d="M109 194h-8m48 0h-8m-16-14v-8m0 44v-7" stroke="#39e7f3" strokeWidth="3" />
      <path d="M88 229h74m-56 10v14m38-14v14" stroke="#0a111a" strokeWidth="9" />
      <path d="M85 231h80" stroke="#f153d6" strokeWidth="4" />
    </g>;
    case 'hotwired': return <g><Core accent={accent} /><path d="M92 111q5-39 33-43 30 4 33 43l-8 45q-25 18-50 0Z" fill="#bcbab1" stroke="#17242c" strokeWidth="5" /><path d="M99 118h18m16 0h18" stroke="#18191f" strokeWidth="13" strokeLinecap="round" /><circle cx="108" cy="118" r="7" fill={accent} /><circle cx="142" cy="118" r="7" fill={accent} /><path d="m125 124-8 18 13 2" fill="none" stroke="#67666a" strokeWidth="5" strokeLinejoin="round" /><path d="M105 153q20-10 40 0l-5 14h-30Z" fill="#211f25" stroke="#111b25" strokeWidth="4" /><path d="M110 155v8m10-10v10m10-10v10m10-8v8" stroke="#e6e0d5" strokeWidth="3" /><path d="M89 100 79 63m24 30-1-43m22 40 7-46m14 52 18-40m-70 34-24-23m94 34 28-28" stroke="#38474e" strokeWidth="10" strokeLinecap="round" /><Cables accent={accent} /><path d="M183 167v55m-9-42h18" stroke={C.orange} strokeWidth="7" /><path d="m74 167-17 53m115-54 18 48" stroke="#272d35" strokeWidth="12" strokeLinecap="round" /></g>;
    case 'panic_bot': return <g><Boots accent={accent} wide /><Core accent={accent} wide /><path d="M88 77h74l9 23-9 43-37 12-37-12-9-43Z" fill="#354755" stroke="#14202a" strokeWidth="6" /><Visor accent={C.gold} width={60} y={105} /><path d="M99 77 84 49m67 28 15-30" stroke="#7d91a2" strokeWidth="5" /><circle cx="84" cy="49" r="8" fill={accent} /><circle cx="166" cy="48" r="8" fill={accent} /><path d="M125 165a19 19 0 1 0 0 38 19 19 0 1 0 0-38Z" fill="#182630" stroke={accent} strokeWidth="5" /><path d="M125 174v17" stroke={accent} strokeWidth="5" /></g>;
    case 'primate': return <g><path d="M57 163q9-41 68-41 59 0 68 41l-11 77H69Z" fill="#3d3346" stroke="#19232d" strokeWidth="6" /><path d="M75 159 55 206l-1 34m123-81 20 47 1 34" fill="none" stroke="#5e5465" strokeWidth="22" strokeLinecap="round" /><path d="M74 230 52 240m126-10 22 10" stroke="#302f38" strokeWidth="13" strokeLinecap="round" /><path d="M78 116q-12-46 47-58 59 12 47 58l-14 40q-33 19-66 0Z" fill="#5a5261" stroke="#19232d" strokeWidth="6" /><circle cx="82" cy="116" r="15" fill="#5a5261" stroke="#19232d" strokeWidth="5" /><circle cx="168" cy="116" r="15" fill="#5a5261" stroke="#19232d" strokeWidth="5" /><path d="M91 132q34-22 68 0l-8 31q-26 17-52 0Z" fill="#939da3" stroke="#263442" strokeWidth="4" /><path d="M104 143h12m18 0h12" stroke="#f0d7a5" strokeWidth="5" strokeLinecap="round" /><path d="M108 157q17 10 34 0" fill="none" stroke="#263442" strokeWidth="4" /><path d="M91 76q12-38 42-30 27 8 32 31l-16 7-13-14-11 12-13-13-14 12Z" fill="#d246bd" stroke="#312d38" strokeWidth="5" /><path d="M84 183h82m-61 8 20 19 20-19" fill="none" stroke={C.cyan} strokeWidth="5" /><path d="M95 185 86 232m59-47 12 47" stroke="#34323d" strokeWidth="7" /></g>;
    case 'pain_hider': return <g><Boots accent={accent} /><path d="M78 141q47-24 94 0l15 93H63Z" fill="#1e2831" stroke="#111b25" strokeWidth="6" /><path d="M94 82q31-27 62 0v61q-31 20-62 0Z" fill="#d0b69b" stroke="#29303a" strokeWidth="5" /><path d="M99 89q8-18 27-17 16 0 25 17" fill="none" stroke="#eee3d3" strokeWidth="7" /><path d="M103 111h13m18 0h13" stroke="#41352f" strokeWidth="4" /><path d="M117 118v14m-11 8q18 7 36 0" fill="none" stroke="#8f725e" strokeWidth="4" /><path d="M95 100h10v20H95Zm54 0h10v20h-10Z" fill="#87949a" stroke={C.cyan} strokeWidth="3" /><path d="M67 163 53 204m130-42 15 39" stroke="#202a33" strokeWidth="14" strokeLinecap="round" /><path d="M153 168q-8 21-29 13" fill="none" stroke="#d0b69b" strokeWidth="10" strokeLinecap="round" /><path d="M155 187h34v46h-34Z" fill="#36afe2" stroke="#c5d6db" strokeWidth="4" /><path d="M158 192h28" stroke={C.cyan} strokeWidth="5" /><path d="M186 195q17 4 3 19" fill="none" stroke="#c5d6db" strokeWidth="4" /></g>;
    case 'prom_king': return <g><Boots accent={accent} /><path d="M70 143q55-26 110 0l17 91H53Z" fill="#182430" stroke="#111b25" strokeWidth="6" /><path d="M102 142 125 166l23-24m-23 24v42" fill="none" stroke="#cedadd" strokeWidth="5" /><path d="M116 162h18v58h-18Z" fill="#e6e0d8" /><path d="M124 167v44" stroke="#25242d" strokeWidth="6" /><path d="M100 83q25-24 50 0v58h-50Z" fill={C.cream} stroke="#26333b" strokeWidth="5" /><path d="M97 89q6-23 28-24 23 2 28 24l-14-7-14 8-14-8Z" fill="#27242b" /><path d="M107 108h11m14 0h11" stroke="#25242d" strokeWidth="4" /><path d="M100 57 92 34l21 10 12-29 13 29 21-10-8 23Z" fill={accent} stroke="#192530" strokeWidth="5" /><circle cx="125" cy="36" r="5" fill={C.cyan} /><path d="M67 201 95 177m83 24-27-27" stroke="#182430" strokeWidth="13" strokeLinecap="round" /><path d="m90 176 21-8m32 10-11-6" stroke="#d5b994" strokeWidth="9" strokeLinecap="round" /></g>;
    case 'idol_core': return <g><path d="M90 148q35-31 70 0l17 85q-52 18-104 0Z" fill="#e1eee5" stroke="#17242d" strokeWidth="6" /><Wings accent={accent} /><path d="M125 203q-35-20-21-42 13-12 21 2 8-14 21-2 14 22-21 42Z" fill={accent} stroke="#ffe0f1" strokeWidth="3" /><ellipse cx="125" cy="65" rx="38" ry="11" fill="none" stroke={accent} strokeWidth="5" /><path d="M101 112q24-10 48 0" stroke={accent} strokeWidth="6" /><path d="M81 134 65 163m-7-9 14 16m-18-7 21 0" fill="none" stroke={C.dark} strokeWidth="8" strokeLinecap="round" /><circle cx="63" cy="126" r="10" fill={accent} stroke="#ffe0f1" strokeWidth="3" /><path d="M180 118q17-18 28 0m-20 8q22-13 34 1" fill="none" stroke={accent} strokeWidth="4" /></g>;
    case 'danger_zone': return <g><Boots accent={accent} /><path d="M72 140q53-26 106 0l17 93H55Z" fill="#151d27" stroke="#201923" strokeWidth="6" /><path d="M95 143h60v59H95Z" fill="#151d27" stroke="#36323a" strokeWidth="4" /><path d="M101 151v42m48-42v42m-48-24h48" stroke={accent} strokeWidth="5" strokeLinecap="round" /><path d="M99 75q26-23 52 0v58q-26 20-52 0Z" fill="#ded7ce" stroke="#29313a" strokeWidth="5" /><path d="M95 86q5-27 29-31 27 3 31 31l-10-10-11 5-12-8-15 8-12-4Z" fill="#a6a4a3" /><path d="M105 105h11m17 0h11" stroke="#2a292d" strokeWidth="4" /><path d="M113 127q12 6 24 0" fill="none" stroke="#713d41" strokeWidth="4" /><path d="M79 154 58 175l-15 27m128-48 22 21 15 27" fill="none" stroke="#151d27" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" /><path d="M57 199 43 206m142-7 15 7" stroke="#d7cfc6" strokeWidth="9" strokeLinecap="round" /><path d="M70 168 55 183m126-15 15 15" stroke={accent} strokeWidth="5" /></g>;
    case 'the_tank': return <g><path d="M60 150q5-61 65-82 60 21 65 82l-13 78q-52 20-104 0Z" fill="#7c8080" stroke="#222c32" strokeWidth="7" /><path d="M70 134 52 97l31 16m111 21 20-36-32 14" fill="#718293" stroke="#18232d" strokeWidth="6" /><path d="m75 160 20-17 9 11m61 2-15-15 24 8m-73 61 20-11 11 13m34-1 18-12" fill="none" stroke="#a5acad" strokeWidth="6" strokeLinejoin="round" /><circle cx="105" cy="122" r="17" fill="#eee1e0" /><circle cx="145" cy="122" r="17" fill="#eee1e0" /><circle cx="106" cy="123" r="6" fill="#26313a" /><circle cx="145" cy="123" r="6" fill="#26313a" /><path d="M109 161q16 8 32 0" fill="none" stroke="#242b30" strokeWidth="5" /><path d="M125 165v-49" fill="none" stroke={C.cream} strokeWidth="14" strokeLinecap="round" /><circle cx="125" cy="111" r="9" fill={C.cream} /><path d="M69 225 63 254m118-29 6 29" stroke="#3d4449" strokeWidth="15" strokeLinecap="round" /><path d="M82 245h-27m113 0h27" stroke="#3d4449" strokeWidth="9" strokeLinecap="round" /></g>;
    default: return null;
  }
}

/** A painted variant fork of the extracted PawnFallback silhouette renderer. */
export function SculptedPawn({ characterId, selected = false }: SculptedPawnProps) {
  const accent = accents[characterId];
  if (!accent) throw new Error(`Unknown pawn character: ${characterId}`);
  const uid = useId().replace(/:/g, '');
  return <svg className="pawn-fallback sculpted-pawn" viewBox="0 0 250 320" width="100%" height="100%" aria-hidden="true"
    aria-label={`${characterId.replaceAll('_', ' ')} painted tabletop miniature`} preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id={`plinth-side-${uid}`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#293646" /><stop offset=".22" stopColor="#101722" /><stop offset="1" stopColor="#05080f" /></linearGradient>
      <linearGradient id="plinth-side" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#293646" /><stop offset=".22" stopColor="#101722" /><stop offset="1" stopColor="#05080f" /></linearGradient>
      <linearGradient id="plinth-top" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#354354" /><stop offset=".48" stopColor="#171f2b" /><stop offset="1" stopColor="#080e17" /></linearGradient>
      <linearGradient id="armor" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#8296a8" /><stop offset=".22" stopColor="#435364" /><stop offset=".64" stopColor="#222e3d" /><stop offset="1" stopColor="#111a27" /></linearGradient>
      <linearGradient id="steel" x1="0" y1="0" x2=".8" y2="1"><stop stopColor="#e5f0f1" /><stop offset=".38" stopColor="#95aab5" /><stop offset="1" stopColor="#334657" /></linearGradient>
      <linearGradient id="ice" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f5ffff" /><stop offset=".5" stopColor="#92efff" /><stop offset="1" stopColor="#318dcb" /></linearGradient>
      <linearGradient id="flame-outer" x1="0" y1="1" x2=".2" y2="0"><stop stopColor="#bc162f" /><stop offset=".43" stopColor="#ff452d" /><stop offset=".73" stopColor="#ff8b27" /><stop offset="1" stopColor="#ffe67b" /></linearGradient>
      <linearGradient id="flame-inner" x1=".2" y1="1" x2=".7" y2="0"><stop stopColor="#ff381f" /><stop offset=".52" stopColor="#ff9e2e" /><stop offset="1" stopColor="#fff1a0" /></linearGradient>
      <radialGradient id="eye-beast" cx=".45" cy=".3" r=".75"><stop stopColor="#a54aba" /><stop offset=".58" stopColor="#472453" /><stop offset="1" stopColor="#121521" /></radialGradient>
      <radialGradient id="eye-iris" cx=".28" cy=".24" r=".8"><stop stopColor="#ffd7fb" /><stop offset=".32" stopColor="#fc56df" /><stop offset=".68" stopColor="#a91db5" /><stop offset="1" stopColor="#351343" /></radialGradient>
      <linearGradient id="rind-armor" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#84909d" /><stop offset=".23" stopColor="#414d5b" /><stop offset=".66" stopColor="#252f3d" /><stop offset="1" stopColor="#121922" /></linearGradient>
      <linearGradient id="monitor-case" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#687888" /><stop offset=".22" stopColor="#293746" /><stop offset=".78" stopColor="#121923" /><stop offset="1" stopColor="#080e16" /></linearGradient>
      <linearGradient id="suit-paint" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#424e5f" /><stop offset=".32" stopColor="#161f2d" /><stop offset="1" stopColor="#080d16" /></linearGradient>
      <radialGradient id="gorilla-fur" cx=".38" cy=".22" r=".9"><stop stopColor="#9b67a9" /><stop offset=".3" stopColor="#513c5c" /><stop offset=".72" stopColor="#292334" /><stop offset="1" stopColor="#100f19" /></radialGradient>
      <linearGradient id="gorilla-muzzle" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#c9a29e" /><stop offset=".42" stopColor="#75626d" /><stop offset="1" stopColor="#382e3c" /></linearGradient>
      <linearGradient id="case-paint" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#708399" /><stop offset=".22" stopColor="#29384d" /><stop offset=".72" stopColor="#111a27" /><stop offset="1" stopColor="#080d16" /></linearGradient>
      <radialGradient id="brain-paint" cx=".32" cy=".2" r=".8"><stop stopColor="#ffc1f2" /><stop offset=".38" stopColor="#f063d4" /><stop offset=".77" stopColor="#ad2db0" /><stop offset="1" stopColor="#451859" /></radialGradient>
      <linearGradient id={`pawn-sheen-${uid}`} x1="0" x2="1" y1="0" y2="1"><stop stopColor="#d9f7ff" /><stop offset=".3" stopColor="#415361" /><stop offset="1" stopColor="#182530" /></linearGradient>
    </defs>
    <Base accent={accent} selected={selected} />
    <Signature id={characterId} accent={accent} />
  </svg>;
}

export default SculptedPawn;