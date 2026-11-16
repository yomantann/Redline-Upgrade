import type { CardDefinition, CardEffect, CardChoiceOption, HauntedCardCategory } from './cards';
import type { PlayerStat } from './player';
import type { DeckId } from './decks';

type HauntedCardSeed = readonly [id: string, title: string, description: string, artCue: string];
const HAUNTED_CARD_DECKS: readonly DeckId[] = ['wealth', 'ai', 'fame', 'lifestyle', 'influence', 'gamble'];
const STAT_CYCLE: readonly PlayerStat[] = ['wealth', 'aiSkill', 'fame', 'lifestyle', 'influence'];

const categories: readonly { category: HauntedCardCategory; seeds: readonly HauntedCardSeed[] }[] = [
  {
    category: 'GHOST_ENCOUNTER',
    seeds: [
      ['ghost-lantern-keeper', 'The Lantern Keeper', 'A silent guide offers one bright favor before the flame goes out.', 'A translucent groundskeeper raises a brass lantern on a rain-dark path, moths circling a blue flame.'],
      ['ghost-stairwell-choir', 'The Stairwell Choir', 'The voices know your name and the note you missed.', 'Spectral singers hover in a spiral stone stairwell, their pale mouths glowing with thin silver sound rings.'],
      ['ghost-no-shadow-cat', 'The Cat With No Shadow', 'The estate cat leaves a useful gift and no footprints.', 'A black cat with luminous green eyes sits beside an antique key on a moonlit checkerboard floor.'],
      ['ghost-room-service', 'Room Service From Below', 'A silver tray arrives from a floor that is not on the plan.', 'A floating silver cloche and gloved ghost hand emerge from a dark service elevator with violet light.'],
      ['ghost-the-watcher', 'The Window Watcher', 'A face appears in the glass, then points toward your next opening.', 'A pale face peers from an upstairs window while a small gold opportunity glows on the wet lawn.'],
      ['ghost-railway-conductor', 'The Last Conductor', 'The conductor accepts exact change from a train that left a century ago.', 'A ghostly railway conductor holds out a ticket punch beside a spectral midnight train.'],
      ['ghost-portrait-applause', 'Portrait Applause', 'The family portraits clap with detached hands and one approving smile.', 'Oil portraits line a burgundy hall as disembodied hands applaud beneath a single spotlight.'],
      ['ghost-well-whisper', 'The Well Whisper', 'A voice from the well gives a short answer and a longer bill.', 'A stone wishing well exhales mint-green mist around a glowing coin and a curled message.'],
      ['ghost-mourner-umbrella', 'The Mourner’s Umbrella', 'A stranger shares shelter, then vanishes before the rain stops.', 'A veiled ghost shares a black umbrella with a traveler beneath silver rain and a dim streetlamp.'],
      ['ghost-clockmaker', 'The Clockmaker’s Guest', 'A tiny repair to the clock buys you a little more time.', 'A spectral watchmaker adjusts a giant brass clock with a tiny tool as violet gears turn.'],
      ['ghost-bell-rope', 'The Bell Rope Tug', 'Something pulls the chapel bell once. The whole house answers.', 'An unseen hand pulls a frayed chapel rope as a bronze bell sends visible ripples through fog.'],
      ['ghost-ice-queen', 'The Ice Queen’s Receipt', 'A frozen noblewoman returns an old debt with interest.', 'A crystalline ghost queen lays a frost-edged receipt and a bright coin on a marble palm.'],
      ['ghost-attic-radio', 'The Attic Radio', 'Static clears long enough to catch one valuable sentence.', 'A dusty tabletop radio in a cluttered attic broadcasts turquoise waves around a floating note.'],
      ['ghost-garden-host', 'The Garden Host', 'A pale host invites you to tea among the roses that grow indoors.', 'A ghostly host pours tea at a garden table under indoor roses, curling roots, and warm amber lights.'],
      ['ghost-mirror-twin', 'The Mirror Twin', 'Your reflection steps out, makes a deal, and slips back inside.', 'A mirrored double reaches through a silver standing mirror to exchange a small violet token.'],
    ],
  },
  {
    category: 'HAUNTED_CHALLENGE',
    seeds: [
      ['challenge-candle-race', 'Candle-End Sprint', 'Reach the chapel door before the last candle gutters.', 'A tiny candle flame races a cloaked runner down a long chapel corridor of swinging shadows.'],
      ['challenge-name-in-glass', 'Write Your Name in Glass', 'The frost writes back. Keep your nerve while the letters move.', 'A gloved hand writes on a fogged window as icy letters rearrange into a staring face.'],
      ['challenge-count-the-knocks', 'Count the Knocks', 'Three knocks mean trouble. Four mean it heard you counting.', 'A red-painted door vibrates as four luminous rings pulse outward into a black hallway.'],
      ['challenge-keep-the-flame', 'Keep the Flame', 'Carry the lantern through the draft without letting it go dark.', 'A trembling lantern crosses a windy stone bridge over a deep violet ravine.'],
      ['challenge-portrait-stare', 'Portrait Stare-Down', 'The portrait blinks first. Or you do. Nobody agrees.', 'A painted noble and a determined visitor stare each other down across a candlelit gallery.'],
      ['challenge-crypt-key', 'Crypt Key Scramble', 'The lock is easy. The key keeps changing shape.', 'A handful of silver keys morph above a half-open crypt gate with a ghostly hand inside.'],
      ['challenge-banquet-seat', 'The Empty Banquet Seat', 'Sit in the chair that nobody wants and make it through dessert.', 'An ornate empty chair waits at the end of a spectral banquet table set with black roses.'],
      ['challenge-hallway-loop', 'The Hallway Loop', 'Find the exit before the corridor folds back on itself again.', 'A traveler runs through a repeating corridor whose doors spiral toward a tiny green exit.'],
      ['challenge-raven-riddle', 'Raven’s Riddle', 'The raven asks a question. Its shadow supplies the wrong answer.', 'A glossy raven perches beside a brass riddle plaque while its shadow points elsewhere.'],
      ['challenge-still-water', 'Still Water Test', 'Cross the flooded floor without waking what sleeps below.', 'A narrow stone walkway crosses black water where a huge pale eye opens beneath the surface.'],
      ['challenge-dance-with-ghost', 'Dance With the Guest', 'The ghost sets the tempo. Missing a step is part of the lesson.', 'A living dancer and translucent partner spin across a moonlit ballroom floor.'],
      ['challenge-bell-tower', 'Bell Tower Balance', 'Climb the swaying stairs while the bells ring out of sequence.', 'A figure climbs a narrow bell tower staircase surrounded by bronze bells and green lightning.'],
      ['challenge-hide-and-seek', 'Hide From the House', 'The walls keep moving. Your hiding place should too.', 'A small figure hides behind shifting wallpaper as eyes appear in the floral pattern.'],
      ['challenge-shadow-puppet', 'Shadow Puppet Trial', 'Make the wall laugh before your shadow gets bored.', 'A performer makes elaborate hand shadows on a wall while a second shadow waves independently.'],
      ['challenge-midnight-toast', 'Midnight Toast', 'Raise a glass with the unseen guests and do not ask what is in it.', 'Crystal glasses rise above a banquet table as ghostly hands gather in a violet haze.'],
    ],
  },
  {
    category: 'CURSED_CHOICE',
    seeds: [
      ['choice-silver-envelope', 'The Silver Envelope', 'A sealed offer promises something useful and asks for something small.', 'Two sealed envelopes float above an antique desk, one silver and one blood-red, under a trembling candle.'],
      ['choice-trade-a-memory', 'Trade a Memory', 'Keep the story or take the stranger’s immediate offer.', 'A glowing memory orb and a stack of old coins balance on opposite sides of a black scale.'],
      ['choice-the-hosts-toast', 'The Host’s Toast', 'Join the toast for a favor or refuse and keep your composure.', 'A spectral host raises a jeweled goblet while a guest weighs a second empty glass in one hand.'],
      ['choice-take-the-mask', 'Take the Mask', 'The mask offers attention. The unmasked route offers quiet.', 'An ornate porcelain mask and a plain iron key rest on velvet in a moonlit dressing room.'],
      ['choice-accept-the-wager', 'Accept the Wager', 'A ghost offers a sure small gain or a risky larger one.', 'A spectral dealer presents one steady gold chip and one oversized glowing red wager.'],
      ['choice-open-the-box', 'Open the Box', 'The small box is safe. The larger one is very confident about that.', 'Two antique boxes sit open a crack, one leaking soft teal light and one violet smoke.'],
      ['choice-share-the-secret', 'Share the Secret', 'Tell the table for influence or keep it and take a private reward.', 'A whisper passes between two figures as a black envelope glows between them.'],
      ['choice-choose-a-door', 'Choose a Door Again', 'The house offers a shortcut or a calmer passage with a modest reward.', 'A bright narrow portal and a wide candlelit corridor split a crooked stone hallway.'],
      ['choice-return-the-ring', 'Return the Ring', 'Keep the ring’s cash value or return it for a lasting reputation.', 'A tarnished signet ring glows above two hands, one reaching for a coin purse.'],
      ['choice-feed-the-raven', 'Feed the Raven', 'Pay the raven or refuse and let it choose what to take.', 'A raven waits beside a small silver coin and a larger locked purse on a stone sill.'],
      ['choice-take-the-suitcase', 'Take the Suitcase', 'Carry the cash now or leave it and keep your name out of the ledger.', 'A battered suitcase spills gold light while an ink-stained contract curls beside it.'],
      ['choice-choose-the-twin', 'Pick the Twin', 'Trust the friendly twin or bet on the one who will not look at you.', 'Two identical pale twins stand beneath separate green and violet spotlights in a mirror hall.'],
      ['choice-light-the-candle', 'Light the Candle', 'Use the flame for a little comfort or save it for a future passage.', 'A single match hovers between a small coin and a shadowy staircase beneath a glass dome.'],
      ['choice-keep-the-ticket', 'Keep the Ticket', 'Sell the ticket now or save it for a possible ride out.', 'A brass train ticket and a stack of bills lie on a velvet seat beside a ghostly platform.'],
      ['choice-answer-the-knock', 'Answer the Knock', 'Open the door for a social reward or stay safe and sharpen your focus.', 'A hand reaches toward a chain-locked door while a mirror reflects a second, safer hallway.'],
    ],
  },
  {
    category: 'CHARACTER_ENCOUNTER',
    seeds: [
      ['character-accuser-inquest', 'The Accuser’s Inquest', 'A sharp question exposes a rival’s weak alibi and strengthens your case.', 'A detective-like accuser points to a glowing evidence board while a rival clutches a torn note.'],
      ['character-alpha-prime', 'Alpha Prime’s Shadow', 'A towering figure offers a lesson in confidence at someone else’s expense.', 'A powerful armored silhouette casts a long shadow over a smaller rival beneath a red moon.'],
      ['character-anointed', 'Anointed at the Altar', 'A solemn blessing lands differently on every person in the chapel.', 'A crowned figure stands at a candlelit altar while three spectral rays fall across the room.'],
      ['character-click-click', 'Click Click’s Double Take', 'A photographer catches a rival’s worst angle and your best one.', 'A camera flash splits a dark hall between a startled rival and a composed subject.'],
      ['character-frostbyte', 'Frostbyte’s Cold Read', 'A quiet calculation freezes one rival and clears your head.', 'A white-haired hacker studies an icy holographic chessboard as a rival’s screen freezes.'],
      ['character-rainbow-dash', 'Rainbow Dash’s Encore', 'A burst of color steals the room and leaves someone else in the dark.', 'A vibrant performer spins a rainbow ribbon through a black ballroom as a rival loses the spotlight.'],
      ['character-executive-p', 'Executive P’s Closed Session', 'A private meeting sends one person away with a fee and another with a favor.', 'A polished executive closes a boardroom door while a gold envelope passes through a narrow gap.'],
      ['character-guardian-h', 'Guardian H Holds the Line', 'A calm intervention shields you from the room’s next cheap shot.', 'A heroic guardian raises a luminous shield between a player and a storm of red sparks.'],
      ['character-hotwired', 'Hotwired the Organ', 'The organ starts itself. The whole audience moves to your tempo.', 'A neon-haired musician plays a haunted pipe organ as spectral notes swirl over a crowd.'],
      ['character-low-flame', 'Low Flame, High Stakes', 'A smoldering trick turns a small opening into an awkward rival problem.', 'A low-burning candle ignites a delicate paper contract beside a startled rival.'],
      ['character-pain-hider', 'Pain Hider’s Poker Face', 'Nobody sees the hit land, but the table notices your control.', 'A stoic figure hides a cracked porcelain mask while opponents react around a card table.'],
      ['character-panic-bot', 'Panic Bot’s Emergency Mode', 'The robot panics in a useful direction and takes the room with it.', 'A small alarmed robot projects a red emergency map that sends ghosts scattering.'],
      ['character-primate', 'Primate’s Banquet Heist', 'A fruit bowl goes missing. A rival gets blamed. You leave with the best story.', 'A mischievous primate swings from a chandelier with fruit as a rival faces a ghostly accusation.'],
      ['character-the-rind', 'The Rind’s Last Laugh', 'A strange punchline lands cleanly on a rival and earns your own applause.', 'A masked trickster peels back a painted wall to reveal a laughing audience in the next room.'],
      ['character-roll-safe', 'Roll Safe’s Quiet Plan', 'The dice are marked by the house. You still find a way to come out ahead.', 'A composed gambler studies weighted dice beside a ghost dealer and a small stack of coins.'],
    ],
  },
  {
    category: 'GROUP_EVENT',
    seeds: [
      ['group-banquet-switch', 'The Banquet Switch', 'Every plate changes places at once. Someone gets yours.', 'A ghost banquet table spins as place settings and candle flames swirl into a ring.'],
      ['group-mirror-vote', 'Mirror-Hall Vote', 'Every reflection votes. The real people have to live with the result.', 'A line of mirrors shows a crowd raising different hands beneath a violet chandelier.'],
      ['group-midnight-weather', 'Midnight Weather Report', 'A sudden indoor storm sweeps one stat across the whole table.', 'Rain falls inside a ballroom as players shield themselves beneath dark umbrellas.'],
      ['group-ghost-chorus', 'Ghost Chorus', 'The whole room sings the wrong verse with total confidence.', 'Spectral singers surround a table of laughing players under pale teal spotlights.'],
      ['group-family-photo', 'The Family Photo', 'The camera flashes. One person looks great; everyone else blinks.', 'A haunted family portrait flashes white as a crowded group reacts in comic confusion.'],
      ['group-shared-tab', 'The Shared Tab', 'The bill arrives with everyone’s name on it and one extra line.', 'A long restaurant bill unrolls across a haunted dining table as players point in disbelief.'],
      ['group-blackout', 'The Ballroom Blackout', 'The lights go out. The loudest person loses the room first.', 'A ballroom drops into darkness except for a bright green exit and scattered glowing eyes.'],
      ['group-raven-courier', 'Raven Courier Service', 'The raven delivers one small package to everyone at the same time.', 'Ravens swoop over a round table dropping identical sealed parcels into open hands.'],
      ['group-last-dance', 'The Last Dance', 'The band starts again. The room gains energy while the host takes the spotlight.', 'A spectral band plays as guests dance in a spiral beneath a brass clock.'],
      ['group-cold-front', 'Cold Front Through the Crypt', 'A deep chill moves through the room and leaves one player strangely composed.', 'Blue fog rolls around a group in a crypt while one figure stands untouched in warm light.'],
      ['group-portrait-auction', 'Portrait Auction', 'The portraits bid on the players and the house collects the loudest offer.', 'An auctioneer points toward shifting portraits as a crowd holds up mismatched bidding paddles.'],
      ['group-wrong-toast', 'The Wrong Toast', 'Everyone raises a glass to the wrong person, including the person speaking.', 'A table full of raised goblets turns toward a surprised guest while a ghost host looks amused.'],
      ['group-candle-relay', 'Candle Relay', 'The flame passes around the table, gathering a little fortune and a little nerve.', 'A bright candle travels hand to hand around a round table in a dark chapel.'],
      ['group-fog-machine', 'The Fog Machine Was Not Plugged In', 'The fog arrives anyway. The entire group loses the plot for a moment.', 'A broken stage fog machine emits a living violet cloud that swallows a laughing crowd.'],
      ['group-ringing-phone', 'The Ringing Phone', 'One phone rings from inside the wall. Everyone hears the voicemail.', 'A vintage telephone rings from a cracked wall as a group leans in to listen.'],
    ],
  },
  {
    category: 'TRICK_BETRAYAL',
    seeds: [
      ['trick-false-bottom', 'False Bottom', 'The drawer has two bottoms. The rival finds the first one.', 'A gloved hand lifts a false drawer bottom as coins slide toward a shadowy figure.'],
      ['trick-ink-stain', 'Ink-Stained Invitation', 'A forged invitation gets you in and leaves the wealth leader holding the bill.', 'A black invitation bleeds ink across a velvet rope while a suited guest slips through.'],
      ['trick-switch-the-labels', 'Switch the Labels', 'A quick switch sends the wrong box to the wrong player.', 'Two identical antique boxes exchange places beneath a chandelier while hands blur.'],
      ['trick-raven-decoy', 'Raven Decoy', 'The raven steals a decoy purse. The real one takes a scenic route to you.', 'A raven flies off with a dummy purse while a silver coin trail arcs toward a player.'],
      ['trick-portrait-frame-job', 'Frame Job', 'The portraits accuse the wealth trailer of your very public mistake.', 'A gallery portrait points at a rival as a frame cracks behind a composed player.'],
      ['trick-spare-key', 'The Spare Key', 'You lend a key, borrow a favor, and quietly keep the duplicate.', 'A brass key changes hands beneath a staircase while a second key glints in a sleeve.'],
      ['trick-invisible-guest', 'Invisible Guest List', 'Someone is removed from the list. Someone else collects the entrance fee.', 'A name vanishes from a glowing guest list while a velvet rope opens for another figure.'],
      ['trick-cursed-compliment', 'Cursed Compliment', 'A flattering remark distracts the rival while you pocket the room’s attention.', 'A rose-colored whisper curls toward a startled guest as a spotlight shifts to the trickster.'],
      ['trick-fake-funeral', 'Fake Funeral', 'The procession is fake. The condolences and cash are unexpectedly real.', 'A tiny black funeral procession rolls through a ballroom with a gold donation box.'],
      ['trick-stolen-shadow', 'Stolen Shadow', 'Your shadow follows a rival for one turn and makes their next entrance awkward.', 'A detached shadow clings to a rival’s shoes beneath a glowing moonlit arch.'],
      ['trick-mirror-invoice', 'Mirror Invoice', 'The mirror sends your bill to the person who looks most like they can pay.', 'A mirror reflects a luxury invoice toward a wealthy-looking stranger across a dark hall.'],
      ['trick-key-in-the-cake', 'Key in the Cake', 'The dessert hides a key and the person who finds it owes you a favor.', 'A slice of black velvet cake reveals a tiny brass key under a violet frosting glow.'],
      ['trick-quiet-alibi', 'Quiet Alibi', 'You leave no evidence and let the fame leader take the headline.', 'A shadowy figure slips through a service door while a camera turns toward a rival.'],
      ['trick-ghostwriter', 'Ghostwriter', 'A ghost signs your rival’s name to a very expensive apology.', 'A spectral quill writes on a contract while a rival watches the ink spread.'],
      ['trick-wrong-room', 'Wrong Room, Right Wallet', 'A mistaken turn delivers you to a private room with an unlocked purse.', 'A confused guest opens a door to a lavish room where a purse rests under green light.'],
    ],
  },
  {
    category: 'LIVING_BOARD',
    seeds: [
      ['board-gallery-shortcut', 'A Door in the Gallery', 'The portrait wall parts and reveals a permanent passage.', 'A row of oil portraits slides apart to reveal a violet-lit hidden corridor.'],
      ['board-sealed-passage', 'The House Seals a Passage', 'A stone wall closes one route. Another remains open toward the finish.', 'A heavy stone passage seals with red runes while a teal-lit alternate corridor stays clear.'],
      ['board-graveyard-curse', 'The Graveyard Wakes', 'One quiet stretch of path turns dangerous for the next few turns.', 'Gravestones glow red beneath a twisted tree as green mist spills across a board path.'],
      ['board-chapel-mercy', 'Mercy at the Chapel', 'A cursed space is cleansed and becomes safe for a short time.', 'A chapel bell rings as white light clears dark vines from a stone tile.'],
      ['board-bone-bridge', 'The Bone Bridge Appears', 'A new short crossing opens above the flooded crypt.', 'A bridge made of pale stone ribs forms over black water with violet sparks.'],
      ['board-roots-through-road', 'Roots Through the Road', 'The roots seal one fork, but the estate leaves its other branch open.', 'Huge roots curl over one stone route while a narrow green passage glows nearby.'],
      ['board-witchlight-marker', 'Witchlight Marker', 'A new dangerous mark appears on a nearby tile until the house turns again.', 'A cursed green flame floats above a numbered stone tile surrounded by black flowers.'],
      ['board-safe-room', 'The Safe Room Opens', 'One dangerous space becomes a safe haven for several turns.', 'A heavy oak door opens to a warm amber room while storm clouds stop at the threshold.'],
      ['board-mirror-branch', 'The Mirror Adds a Branch', 'A mirror gate creates a lasting new link between two estate passages.', 'A standing mirror connects two distant corridors with a luminous silver ribbon.'],
      ['board-crypt-shift', 'The Crypt Shifts', 'The floor moves: one short route closes and an alternate passage remains.', 'Crypt tiles slide like a puzzle as one red passage closes and another teal path opens.'],
    ],
  },
];

const moneyAmount = (amount: number) => amount * 5_000;
const statAmount = (stat: PlayerStat, amount: number) => stat === 'wealth' ? moneyAmount(amount) : amount;
const statEffect = (
  stat: PlayerStat,
  amount: number,
  target: Extract<CardEffect, { kind: 'STAT' }>['target'] = 'SELF',
): Extract<CardEffect, { kind: 'STAT' }> => ({
  kind: 'STAT',
  stat,
  amount: statAmount(stat, amount),
  target,
});
const boardChanges: readonly Extract<CardEffect, { kind: 'BOARD_CHANGE' }>['change'][] = [
  'OPEN_SHORTCUT', 'CLOSE_ROUTE', 'CURSE_SPACE', 'SAFE_SPACE',
];

function makeEffects(category: HauntedCardCategory, localIndex: number): { effects: readonly CardEffect[]; choices?: readonly CardChoiceOption[]; effect: string; value: string } {
  const stat = STAT_CYCLE[localIndex % STAT_CYCLE.length];
  const otherStat = STAT_CYCLE[(localIndex + 1) % STAT_CYCLE.length];
  const strength = 1 + Math.floor(localIndex / STAT_CYCLE.length);
  const amount = statAmount(stat, strength);
  const moneyLabel = (value: number) => `$${Math.abs(value).toLocaleString()}`;
  const statLabel: Record<PlayerStat, string> = { wealth: 'WEALTH', aiSkill: 'AI SKILL', fame: 'FAME', lifestyle: 'LIFESTYLE', influence: 'INFLUENCE' };
  const signed = (statName: PlayerStat, value: number) => `${value > 0 ? '+' : '−'}${statName === 'wealth' ? moneyLabel(value) : `${Math.abs(value)} ${statLabel[statName]}`}`;
  if (category === 'GHOST_ENCOUNTER') {
    const effect = statEffect(stat, strength);
    return { effects: [effect], effect: `Gain ${stat === 'wealth' ? moneyLabel(amount) : `${strength} ${statLabel[stat]}`}.`, value: signed(stat, amount) };
  }
  if (category === 'HAUNTED_CHALLENGE') {
    const chance = 0.3 + localIndex * 0.02;
    const lossStat = otherStat;
    const winAmount = 2 + localIndex % 5;
    const lossAmount = 1 + localIndex % 3;
    const win = statEffect(stat, winAmount);
    const loss = statEffect(lossStat, -lossAmount);
    return {
      effects: [{ kind: 'RISK', chance, win: [win], loss: [loss] }],
      effect: `${Math.round(chance * 100)}%: ${signed(stat, statAmount(stat, winAmount))}; otherwise ${signed(lossStat, -statAmount(lossStat, lossAmount))}.`,
      value: `${Math.round(chance * 100)}% / ${signed(stat, statAmount(stat, winAmount))} OR ${signed(lossStat, -statAmount(lossStat, lossAmount))}`,
    };
  }
  if (category === 'CURSED_CHOICE') {
    const primaryGain = statEffect(stat, strength + 1);
    const saferGain = statEffect(otherStat, strength);
    const options: readonly CardChoiceOption[] = [
      { id: 'TAKE_THE_OFFER', label: 'TAKE THE OFFER', description: `Gain ${stat === 'wealth' ? moneyLabel(primaryGain.amount) : `${strength + 1} ${statLabel[stat]}`} and lose $5,000.`, effects: [primaryGain, statEffect('wealth', -1)] },
      { id: 'KEEP_YOUR_HEAD', label: 'KEEP YOUR HEAD', description: `Gain ${otherStat === 'wealth' ? moneyLabel(saferGain.amount) : `${strength} ${statLabel[otherStat]}`} and lose 1 ${statLabel[stat]}.`, effects: [saferGain, statEffect(stat, -1)] },
    ];
    return { effects: [], choices: options, effect: 'Choose one offer; each has a different cost.', value: 'CHOOSE / DIFFERENT COSTS' };
  }
  if (category === 'CHARACTER_ENCOUNTER') {
    const target = localIndex % 2 ? 'WEALTH_LEADER' : 'RANDOM_OPPONENT';
    const actorEffect = statEffect(stat, strength + 1);
    const targetEffect = statEffect(otherStat, -(1 + localIndex % 3), target);
    return {
      effects: [actorEffect, targetEffect],
      effect: `Gain ${stat === 'wealth' ? moneyLabel(actorEffect.amount) : `${strength + 1} ${statLabel[stat]}`}; ${target === 'WEALTH_LEADER' ? 'the Wealth leader' : 'a random opponent'} loses ${otherStat === 'wealth' ? moneyLabel(targetEffect.amount) : `${Math.abs(targetEffect.amount)} ${statLabel[otherStat]}`}.`,
      value: `${signed(stat, actorEffect.amount)} / ${target === 'WEALTH_LEADER' ? 'LEADER' : 'RIVAL'} ${signed(otherStat, targetEffect.amount)}`,
    };
  }
  if (category === 'GROUP_EVENT') {
    const groupAmount = localIndex % 2 ? -(1 + localIndex % 3) : 1 + localIndex % 3;
    const actorAmount = strength;
    const groupEffect = statEffect(stat, groupAmount, 'ALL_OPPONENTS');
    const ownEffect = statEffect(otherStat, actorAmount);
    return {
      effects: [groupEffect, ownEffect],
      effect: `All opponents ${groupAmount > 0 ? 'gain' : 'lose'} ${stat === 'wealth' ? moneyLabel(groupEffect.amount) : `${Math.abs(groupEffect.amount)} ${statLabel[stat]}`}; gain ${otherStat === 'wealth' ? moneyLabel(ownEffect.amount) : `${actorAmount} ${statLabel[otherStat]}`}.`,
      value: `RIVALS ${signed(stat, groupEffect.amount)} / ${signed(otherStat, ownEffect.amount)}`,
    };
  }
  if (category === 'TRICK_BETRAYAL') {
    const target = (['RANDOM_OPPONENT', 'WEALTH_LEADER', 'WEALTH_TRAILER'] as const)[localIndex % 3];
    const transferAmount = moneyAmount(1 + localIndex % 5);
    const ownEffect = statEffect(stat, strength);
    return {
      effects: [{ kind: 'TRANSFER_WEALTH', amount: transferAmount, target }, ownEffect],
      effect: `Take up to ${moneyLabel(transferAmount)} from ${target === 'RANDOM_OPPONENT' ? 'a random opponent' : target === 'WEALTH_LEADER' ? 'the Wealth leader' : 'the Wealth trailer'}; gain ${stat === 'wealth' ? moneyLabel(ownEffect.amount) : `${strength} ${statLabel[stat]}`}.`,
      value: `UP TO +${moneyLabel(transferAmount)} / ${signed(stat, ownEffect.amount)}`,
    };
  }
  const change = boardChanges[localIndex % boardChanges.length];
  const boardEffect: CardEffect = { kind: 'BOARD_CHANGE', change };
  const statReward = statEffect(stat, strength);
  const changeText = change === 'OPEN_SHORTCUT' ? 'Open the west-gallery shortcut permanently.'
    : change === 'CLOSE_ROUTE' ? 'Seal one fork passage for three turns; another route remains open.'
      : change === 'CURSE_SPACE' ? 'Curse one open tile for three turns.'
        : 'Make one cursed tile safe for three turns.';
  return {
    effects: [boardEffect, statReward],
    effect: `${changeText} Gain ${stat === 'wealth' ? moneyLabel(statReward.amount) : `${strength} ${statLabel[stat]}`}.`,
    value: `${change.replaceAll('_', ' ')} / ${signed(stat, statReward.amount)}`,
  };
}

let globalIndex = 0;
export const hauntedCards: readonly CardDefinition[] = categories.flatMap(({ category, seeds }) =>
  seeds.map(([id, title, description, artCue], localIndex) => {
    const deck = HAUNTED_CARD_DECKS[globalIndex % HAUNTED_CARD_DECKS.length];
    const { effects, choices, effect, value } = makeEffects(category, localIndex);
    globalIndex += 1;
    return {
      id,
      deck,
      boardId: 'HAUNTED_UPGRADE',
      title,
      description,
      effect,
      value,
      rarity: 'STANDARD',
      effects,
      artCue,
      artworkPath: `api/card-art/${id}`,
      hauntedCategory: category,
      choices,
    };
  }),
);
