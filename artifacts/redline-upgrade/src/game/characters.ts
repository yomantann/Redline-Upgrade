export interface CharacterDefinition {
  id: string;
  name: string;
  imagePath: string;
  description: string;
  abilityName: string;
  abilityDescription: string;
}

// Ability copy is character flavor for Phase 1; no mechanical effects exist yet.
// Character art is imported into public/characters from the supplied source archive.
const roster = [
  ['guardian_h', 'Guardian H', 'The last line of defense when a city forgets who it left behind.', 'Hold the Line', 'Stands firm when everything else gives way.'],
  ['click_click', 'Click Click', 'A streetwise operator who hears opportunity in every locked door.', 'Quick Draw', 'Acts before the moment has a chance to disappear.'],
  ['frostbyte', 'Frostbyte', 'A cold-blooded tactician with a mind sharper than the grid.', 'Deep Freeze', 'Keeps calm when the system starts to burn.'],
  ['sadman', 'Sadman', 'An unlikely survivor carrying a long history of second chances.', 'Last Laugh', 'Finds an opening when the odds look hopeless.'],
  ['rainbow_dash', 'Rainbow Dash', 'A neon streak that never stays in one place for long.', 'Prismatic Rush', 'Turns momentum into a signature move.'],
  ['accuser', 'Accuser', 'A relentless investigator who sees through polished lies.', 'Call It Out', 'Exposes what others would rather keep hidden.'],
  ['low_flame', 'Low Flame', 'Quiet intensity, waiting patiently beneath the surface.', 'Slow Burn', 'Builds pressure without drawing attention.'],
  ['wandering_eye', 'Wandering Eye', 'A watcher of patterns, secrets, and paths nobody else notices.', 'Peripheral Vision', 'Spots possibilities just outside the obvious route.'],
  ['the_rind', 'The Rind', 'A hard-shelled drifter shaped by the edges of the city.', 'Hard Exterior', 'Endures the hits that would stop someone else.'],
  ['anointed', 'Anointed', 'A self-made icon who walks as though the future is already written.', 'Chosen Path', 'Turns conviction into an unmistakable presence.'],
  ['executive_p', 'Executive P', 'A corporate power player fluent in leverage and appearances.', 'Power Move', 'Knows when to make an offer nobody can ignore.'],
  ['alpha_prime', 'Alpha Prime', 'A prototype built to lead, now choosing their own direction.', 'Prime Directive', 'Cuts through uncertainty with decisive focus.'],
  ['roll_safe', 'Roll Safe', 'A calculated gambler who never lets a risk go unmeasured.', 'Calculated Risk', 'Finds the safest angle in a dangerous situation.'],
  ['hotwired', 'Hotwired', 'A restless mechanic with an instinct for bringing dead things to life.', 'Jump Start', 'Gets moving when the whole system stalls.'],
  ['panic_bot', 'Panic Bot', 'An anxious machine whose alarms are usually right.', 'Red Alert', 'Senses trouble before it reaches the rest of the crew.'],
  ['primate', 'Primate', 'Raw instinct and fearless energy in a world of careful plans.', 'Wild Instinct', 'Trusts a gut feeling when logic runs out.'],
  ['pain_hider', 'Pain Hider', 'A guarded survivor who has learned to keep moving through anything.', 'Poker Face', 'Reveals nothing, even under pressure.'],
  ['prom_king', 'Prom King', 'A former golden child determined to own a new kind of spotlight.', 'Spotlight', 'Commands the room before saying a word.'],
  ['idol_core', 'Idol Core', 'A manufactured star learning what it means to be real.', 'Main Character', 'Captures attention wherever the signal reaches.'],
  ['danger_zone', 'Danger Zone', 'A thrill seeker who lives one step beyond the warning signs.', 'Full Throttle', 'Leans in when everyone else backs away.'],
  ['the_tank', 'The Tank', 'An unstoppable force with no interest in taking the easy route.', 'Breakthrough', 'Pushes forward when the way is blocked.'],
] as const;

const imageFileById: Record<string, string> = {
  guardian_h: 'guardian_h.png',
  click_click: 'click_click.png',
  frostbyte: 'frostbyte.png',
  sadman: 'sadman.png',
  rainbow_dash: 'rainbow_dash.png',
  accuser: 'accuser.png',
  low_flame: 'low_flame.png',
  wandering_eye: 'wandering_eye.png',
  the_rind: 'the_rind.png',
  anointed: 'anointed.png',
  executive_p: 'executive_p.png',
  alpha_prime: 'alpha_prime.png',
  roll_safe: 'roll_safe.png',
  hotwired: 'hotwired.png',
  panic_bot: 'panic_bot.png',
  primate: 'primate.png',
  pain_hider: 'pain_hider.png',
  prom_king: 'prom_king.png',
  idol_core: 'idol_core.png',
  danger_zone: 'danger_zone.png',
  the_tank: 'the_tank.png',
};

export const characters: CharacterDefinition[] = roster.map(
  ([id, name, description, abilityName, abilityDescription]) => ({
    id,
    name,
    imagePath: `characters/${imageFileById[id]}`,
    description,
    abilityName,
    abilityDescription,
  }),
);

export function getCharacter(id: string): CharacterDefinition | undefined {
  return characters.find((character) => character.id === id);
}