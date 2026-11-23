/* LAN OR DIE – Mission 3 "Bad Trip at Maxi": ALL content lives here. missions/m3.js holds no creature/item/NPC data.
   How to add things without code: see DATA.md (copy-paste examples for every kind).
   Every entry may have:  release: 'mon' | 'tue' | 'wed'   (hidden before that day; ?dev=all shows everything)
                          requires: 'flagName'              (hidden until the flag is set in the save)
   Colours: hex strings. Positions: [tileX, tileY] on the 48 x 74 map (in ?dev mode, long-press the map to copy a tile). */
window.M3_DATA = {

releases: { mon: '2026-11-23', tue: '2026-11-24', wed: '2026-11-25' },

/* ---------- tuning numbers ---------- */
tuning: {
  VIEW_TILES: 10, SPEED: 74, ENC_RATE: .09, ENC_COOLDOWN: 5,
  START_KR: 120, BAG_COST: 10, XP_PER_LV: 7, XP_SHARE: .25, LV_MAX: 50, START_LV: 5,
  XP_BASE: 8, XP_SQ: 1.3,            // XP for the next level = XP_BASE + XP_SQ × level²
  XP_LOW: 3,                          // anti-grind: a foe below your level gives XP × (foe lv / your lv)^XP_LOW
  BOSS_XP: 1.2, WILD_KR: 1.5,         // XP multiplier for bosses/trainers, kronor per foe level from wild fights
  BOSS_LV: 8, BOSS_LV_STEP: 2, DEV_LV: 46, DEV_HP: 2.6, AI_LV: 19, BOSS_KR: 150, PARTNER_TURNS: 8,
  WIFE_DEBT_ANGER: .15,               // each point of promise debt: the wives hit 15 % harder
  FERRY_LV: 30,                       // a ferry creature (see ferry below) this level can swim you to the castle
  LURE_RIP: 1 / 25, BLUR_DRINKS: 3, BLUR_TIME: 25,
  KO_CATCH: { C: .7, U: .55, R: .4, E: .3, L: .22, M: .3, H: .35 },    // catch chance after a knockout, by rarity (H = heroes, wives, NPCs)
  CATCH_R: { C: .7, U: .5, R: .32, E: .22, L: .15, M: .1, H: .2 },     // carrier-bag multiplier before a knockout
  RARITY_STAT: { C: 1, U: 1.06, R: 1.12, E: 1.2, L: 1.25, M: 1.35, H: 1.15 },
  NIGHT: [20, 6],                     // real clock: night runs from 20:00 to 06:00 (people, traps, rave, moths)
  WILD_STAT: 1.2,                     // stat multiplier for wild creatures (also from traps and fishing): the lower the easier the wild
  BOSS_STAT: .6,                      // stat multiplier for hero teams and trainer drug forms: they are drug forms (×1.3, rarer) fighting your youngling-stage party, plus their trip traits
  TRIP_MIN: 30,                       // a bad trip: the creature is 'sketchy' (cannot fight) for this many REAL minutes, also while the game is closed
  BOSS_AT_GATE: false,                // false: hero teams follow the old ladder (BOSS_LV + steps). true: levels = the house gate −2 / ±0 / +2 (use once the heroes live in their houses)
  AUTO_STOP_HP: .3, AUTO_GAP: .5,   // auto-fight: stops below this share of max HP; seconds the Stop button shows between turns
  TRAP: { nothing: .25, lower: .25, own: .4, higher: .1, bait: .1, step: .05, ownCap: .6, drug: .3, drugNothing: .1 },   // what a ready trap rolls (see M3_CREATURES.md §7)
  PTS: { item: 2500, species: 2000, speciesMax: 20, hero: 30000, partner: 4000, dev: 50000, egg: 50000 }  // goals only, max 300 000. Levels give no points
},

/* ---------- types: each beats the next one in the list (×strong), loses to the previous (×weak). MIND is neutral (people, Dev, the Wraith).
   FANG › WING › ROOT › WATER › STONE › SHELL › FANG: predators catch birds, birds strip plants, roots drink water, water wears stone, stones crack shells, shells break teeth ---------- */
types: {
  cycle: ['FANG', 'WING', 'ROOT', 'WATER', 'STONE', 'SHELL'], strong: 1.5, weak: .67,
  colors: { FANG: '#b5651d', WING: '#5ec2f2', ROOT: '#4cae4f', WATER: '#2f6fe4', STONE: '#8e949c', SHELL: '#e3a02c', MIND: '#e05cc4', NONE: '#9aa4ad' }
},

/* ---------- moves. p = power (0 = status), acc, hits (number or [min,max]), stun (chance), self/foe = stat stages, say = extra line.
   Move extras (all optional): heal (self, fraction) · partyHeal (every creature on your side) · selfStun (the user skips n turns; stunText = what is said then) · foeLose (foe skips n turns, once per battle) · vanish (turn 1: hides, turn 2: hits)
   cute (foe can't attack it for n turns) · confuse (chance; on a status move = always, 3 turns) · confuseAll · poison (turns) · drain (heal by this share of the damage) · recoil · rage (stronger the lower its HP)
   bestType (uses the type that hits hardest) · sure (never misses) · team ({stat: n}, +1 more at night) · special = scripted (Dev Ljunky) ---------- */
moves: {
  slam: { name: 'Body Slam', type: null, p: 40 },
  // FANG
  nip: { name: 'Nip', type: 'FANG', p: 38 }, gnaw: { name: 'Gnaw', type: 'FANG', p: 26, hits: 2 }, bite: { name: 'Bite', type: 'FANG', p: 48 }, claw: { name: 'Claw Swipe', type: 'FANG', p: 55 },
  pounce: { name: 'Pounce', type: 'FANG', p: 64 }, snap: { name: 'Snap', type: 'FANG', p: 68, acc: .95 }, tusk: { name: 'Tusk Charge', type: 'FANG', p: 72, stun: .25 },
  maul: { name: 'Maul', type: 'FANG', p: 84, acc: .9 }, rend: { name: 'Rend', type: 'FANG', p: 92, acc: .85 }, hug: { name: 'Bear Hug', type: 'FANG', p: 66 },
  growl: { name: 'Growl', type: 'FANG', p: 0, foe: { atk: -1 } },
  // WING
  flap: { name: 'Flap', type: 'WING', p: 40 }, peck: { name: 'Pant Peck', type: 'WING', p: 52 }, gust: { name: 'Gust', type: 'WING', p: 50, foe: { spd: -1 } }, swoop: { name: 'Swoop', type: 'WING', p: 58 },
  dive: { name: 'Dive Bomb', type: 'WING', p: 74, acc: .9 }, talon: { name: 'Talon Strike', type: 'WING', p: 82, acc: .88 }, screech: { name: 'Screech', type: 'WING', p: 0, foe: { def: -1 } },
  // ROOT
  nibble: { name: 'Nibble', type: 'ROOT', p: 40 }, vine: { name: 'Vine Whip', type: 'ROOT', p: 52 }, thorn: { name: 'Thorn Shot', type: 'ROOT', p: 62 },
  stomp: { name: 'Stomp', type: 'ROOT', p: 72 }, gore: { name: 'Antler Gore', type: 'ROOT', p: 80, acc: .9 }, bloomup: { name: 'Bloom', type: 'ROOT', p: 0, heal: .3 },
  // WATER
  splash: { name: 'Splash', type: 'WATER', p: 42 }, bubble: { name: 'Bubble Beam', type: 'WATER', p: 54 }, wave: { name: 'Wave', type: 'WATER', p: 62 }, jet: { name: 'Water Jet', type: 'WATER', p: 72 },
  torrent: { name: 'Torrent', type: 'WATER', p: 86, acc: .88 }, lbite: { name: 'Lake Bite', type: 'WATER', p: 85, acc: .85 },
  ferry: { name: 'Ferry', type: 'WATER', p: 0, say: 'It paddles on, steady as a ferry.' },   // a creature that knows this can carry you over the big lake (once someone has taught you)
  // STONE
  pebble: { name: 'Pebble Toss', type: 'STONE', p: 42 }, crush: { name: 'Crush', type: 'STONE', p: 64 }, slide: { name: 'Rockslide', type: 'STONE', p: 78, acc: .9 }, boulder: { name: 'Boulder', type: 'STONE', p: 92, acc: .78 },
  // SHELL
  shell: { name: 'Shell Bash', type: 'SHELL', p: 48 }, quill: { name: 'Quill Jab', type: 'SHELL', p: 52 }, spike: { name: 'Spike Roll', type: 'SHELL', p: 60 }, pinch: { name: 'Pinch', type: 'SHELL', p: 56 },
  roll: { name: 'Roll Out', type: 'SHELL', p: 68 }, chitin: { name: 'Chitin Crash', type: 'SHELL', p: 76 }, harden: { name: 'Harden', type: 'SHELL', p: 0, self: { def: 2 } },
  // drug-form signature moves (one each; see trips for the passive side)
  dgaf: { name: "Doesn't Care", type: 'FANG', p: 74, say: 'It does not care about your stat drops either.' },
  nap: { name: 'Benzo Nap', type: 'FANG', p: 0, heal: .4, selfStun: 1, stunText: 'is still asleep. Zzz.', say: 'It dozes off. Zzz.' },
  hug2: { name: 'Group Hug', type: 'FANG', p: 0, partyHeal: .15, foe: { atk: -1 }, say: 'Everyone gets a hug. Everyone.' },
  khole: { name: 'K-Hole', type: 'FANG', p: 125, vanish: true, say: 'It slips out of reality…' },
  kclaw: { name: 'Kaleidoscope Claw', type: 'FANG', p: 80, bestType: true },
  eyes: { name: 'Big Eyes', type: 'STONE', p: 0, cute: 2, say: 'Those eyes. Nobody can attack that.' },
  brk: { name: 'Breakthrough', type: 'WATER', p: 0, foeLose: 3, say: 'The foe meets the machine elves. They have a lot to say.' },
  spores: { name: 'Spore Quills', type: 'SHELL', p: 22, hits: [3, 5], confuse: .35 },
  chill: { name: 'Chill Out', type: 'ROOT', p: 0, heal: .25, self: { atk: -1 }, foe: { atk: -1 }, say: 'Everybody takes it easy.' },
  rail: { name: 'Rail', type: 'SHELL', p: 58, say: 'Sniff. Fast.' },
  dissoc: { name: 'Dissociate', type: 'WING', p: 64 },
  spots: { name: 'Seven Spots of Truth', type: 'WING', p: 50 },
  bass: { name: 'Drop the Bass', type: 'ROOT', p: 0, team: { spd: 1 }, say: 'THE BASS. Your team speeds up.' },
  tweak: { name: 'Tweak', type: 'SHELL', p: 20, hits: [4, 6] },
  dash: { name: 'Line Dash', type: 'SHELL', p: 66 },
  sing: { name: 'Helan Går', type: 'SHELL', p: 56, self: { atk: 1 }, say: '🎶 Helan går, sjung hopp faderallan lallan lej!' },
  lovebite: { name: 'Love Bite', type: 'WATER', p: 72, drain: .5 },
  sporepunch: { name: 'Sporepunch', type: 'WATER', p: 78, confuse: .4 },
  unbothered: { name: 'Unbothered', type: 'FANG', p: 0, self: { def: 2 }, heal: .15, say: 'It simply does not care.' },
  truffle: { name: 'Truffle Rage', type: 'FANG', p: 72, rage: true },
  nose: { name: 'Nose Charge', type: 'FANG', p: 108, acc: .9, recoil: .3 },
  lamp: { name: 'Lamp Frenzy', type: 'WING', p: 0, self: { atk: 2 }, say: 'It sees the lamp. It sees ONLY the lamp.' },
  void: { name: 'Moose in the Void', type: 'ROOT', p: 0, heal: .5, selfStun: 1, stunText: 'is somewhere else entirely.', say: 'The moose is not here. The moose is also not not here.' },
  bloom: { name: 'Antler Bloom', type: 'ROOT', p: 0, confuse: 1, say: 'A spore cloud blooms from the antlers.' },
  eye: { name: 'Third Eye Maul', type: 'FANG', p: 88, sure: true, confuse: .35 },
  melt: { name: 'Melt', type: 'FANG', p: 42, foe: { def: -2 }, poison: 4 },
  badtrip: { name: 'Bad Trip', type: 'WATER', p: 0, confuseAll: true, say: 'Everything melts. Including the hippo.' },
  // people (heroes, wives, NPCs) and the Wraith: MIND is neutral
  rattle: { name: 'Rattle', type: 'MIND', p: 45 }, zap: { name: 'Plug Zap', type: 'MIND', p: 62 }, beep: { name: 'Error Beep', type: 'MIND', p: 58 }, dill: { name: 'Dill Whip', type: 'MIND', p: 72, acc: .9 },
  drowsy: { name: 'Drowsy', type: 'MIND', p: 20, stun: .6, say: 'A sticky, sleepy cloud…' }, card: { name: 'Golden Member Card', type: 'MIND', p: 70 },
  curse: { name: 'Forgotten Item', type: 'MIND', p: 70, say: 'You forgot the milk. Again.' }, seed: { name: 'Seed Phrase', type: 'MIND', p: 95, acc: .9, say: 'Twelve words echo. You forgot all of them.' },
  // heroes and wives as party members
  yes: { name: 'YES!', type: 'MIND', p: 0, self: { atk: 2 } }, lights: { name: 'Lights Out', type: 'MIND', p: 40, stun: .5 }, love: { name: 'I Love This!', type: 'MIND', p: 0, heal: .4 },
  stick: { name: 'Stick Together', type: 'FANG', p: 30, hits: 3 }, dip: { name: 'Buy the Dip', type: 'MIND', p: 90, acc: .5 }, guilt: { name: 'Guilt Trip', type: 'MIND', p: 55, foe: { def: -1 } },
  // Dev Ljunky + AI-Ljunky
  patch: { name: 'Patch Notes', type: 'MIND', p: 0, special: 'patch' }, hotfix: { name: 'Hotfix', type: 'MIND', p: 0, special: 'hotfix' },
  spawn: { name: 'Spawn Bug', type: 'MIND', p: 0, special: 'spawn' }, rage: { name: 'Rage Quit', type: 'MIND', p: 110, special: 'rage' }, glitch: { name: 'Glitch Slap', type: 'MIND', p: 62 }
},

/* ---------- trip traits: what a drug does to a creature that was grown on it (creature field  trip: 'xanax').
   Numbers: defMul/spdMul/atkMul = stat multipliers · skipP = chance to lose the turn (skipText = what is said; halfDmg = takes half damage that turn) · healSelf / healParty = share of max HP per turn · drainSelf = loses this share per turn
   first = always moves first · crit = extra crit chance · immune = [drops, status, confuse] · extraHits / accPenalty = multi-hit moves · atkStep/defStep = stat steps per turn · confuseOnHit · foeAtkEvery2 · lsd = type changes each turn
   catchBonus = wild foes are easier to catch while it is on your team · reveal = shows hidden creatures while on your team · badTrip = chance per feeding (5–12 %) that the creature goes sketchy for TRIP_MIN minutes ---------- */
trips: {
  xanax: { name: 'Benzo Calm', up: 'DEF ×1.4, immune to confusion and guilt', down: '15 % to doze off for a turn', defMul: 1.4, immune: ['confuse'], skipP: .15, skipText: 'dozes off. Zzz.', badTrip: .06 },
  molly: { name: 'Love Everyone', up: 'heals the team 5 % every turn; wild foes are easier to catch', down: '20 % to refuse to attack ("too much love")', healParty: .05, catchBonus: .15, skipP: .2, skipText: 'is too full of love to attack.', badTrip: .09 },
  keta: { name: 'Dissociate', up: 'immune to stat drops and status', down: 'sometimes K-hole: skips a turn and takes half damage', immune: ['drops', 'status', 'confuse'], skipP: .2, halfDmg: true, skipText: 'drifts into a K-hole.', badTrip: .1 },
  lsd: { name: 'Kaleidoscope', up: 'its type changes every turn (often super-effective); reveals Epic creatures', down: 'its own type is random too, so it can turn weak', lsd: true, reveal: true, badTrip: .12 },
  shrooms: { name: 'Spore Mind', up: 'moves can confuse; heals 5 % a turn; reveals Epic creatures', down: 'SPD ×0.85', confuseOnHit: .3, healSelf: .05, spdMul: .85, reveal: true, badTrip: .08 },
  coke: { name: 'Rail', up: 'always moves first, +crit', down: 'loses 5 % HP every turn', first: true, crit: .15, drainSelf: .05, badTrip: .1 },
  speed: { name: 'Tweak', up: 'multi-hit moves hit 2 extra times', down: 'accuracy −15 %', extraHits: 2, accPenalty: .15, badTrip: .07 },
  meth: { name: 'Lamp Frenzy', up: 'ATK +1 every turn', down: 'DEF −1 every turn', atkStep: 1, defStep: -1, badTrip: .12 },
  dmt: { name: 'Breakthrough', up: 'once per battle the foe loses 3 turns', down: 'uses its whole turn doing it', badTrip: .11 },
  weed: { name: 'Chill', up: 'heals 8 % a turn; the foe\'s ATK drops every other turn', down: 'SPD ×0.7', healSelf: .08, foeAtkEvery2: -1, spdMul: .7, badTrip: .05 },
  snaps: { name: 'Helan Går', up: '+crit', down: 'sings at the wrong moments', crit: .1, badTrip: .05 }
},

/* ---------- creatures: ONE ENTRY PER FORM (96 forms). Full design: M3_CREATURES.md.  stats = [HP, ATK, DEF, SPD]. moves = [[move, learn level]] (the last 4 learned are used).
   line = the family (all forms of an animal). stage = 1 youngling · 2 teen · 3 adult · 'drug' = a form you only get by feeding. evolve = { lv, to } (automatic).
   Drug forms: the teen has feed = { drugItem: formId } and feedLv; the form has trip (see trips), feedFrom = the teen. ability: noDrops | reveal.
   size: S (a carrier bag works) · M (bag only as a youngling) · L / XL (trap only). Traps: tier 1-5 = how deep/big (a number or [a, b]), trap = the ladders that can hold it (ground | water | air), hab = places, day / night, bait = what it likes, mat = what Finish off drops.
   starter: true = only ever a starter, never wild. wild: true on a drug form = it can also appear in the wild (zone lists name it). needs: 'reveal' = only while something reveals it.
   Zones, trainer parties and quests name a LINE (the game picks the form for the level) or an exact form id. art: add  art: 'assets/creatures/<id>.png'  (48 × 48) when you have drawn it; until then the game shows ❔. ---------- */
creatures: {
  badgerCub: {line:'badger',stage:1,no:1,name:'Badger Cub',type:'FANG',rarity:'C',size:'S',stats:[50,53,48,42],moves:[['claw',1],['slam',1],['bite',8],['maul',20]],desc:'A cub with the confidence of a bear. Hisses at vacuum cleaners.',evolve:{lv:16,to:'badger'},starter:true,release:'mon',mat:'fur',bait:['honey']},
  badger: {line:'badger',stage:2,no:2,name:'Badger',type:'FANG',rarity:'U',size:'M',stats:[66,70,64,56],moves:[['claw',1],['slam',1],['bite',8],['maul',20]],desc:'Sturdy, grumpy, and surprisingly good at digging.',evolve:{lv:32,to:'honeyBadger'},starter:true,release:'mon',mat:'fur',bait:['honey'],feedLv:24,feed:{xanax:'xanadger',molly:'ecstadger',keta:'ketadger',lsd:'ladger'}},
  honeyBadger: {line:'badger',stage:3,no:3,name:'Honey Badger',type:'FANG',rarity:'R',size:'M',stats:[83,88,80,70],moves:[['claw',1],['slam',1],['bite',8],['maul',20],['dgaf',1]],desc:'Doesn\'t care. About anything. Ever.',ability:'noDrops',starter:true,release:'mon',mat:'fur',bait:['honey']},
  xanadger: {line:'badger',stage:'drug',no:4,name:'Xanadger',type:'FANG',rarity:'R',size:'M',stats:[86,91,83,73],moves:[['claw',1],['slam',1],['bite',8],['maul',20],['nap',1]],desc:'Sleepy but tough. Naps in the middle of fights.',trip:'xanax',feedFrom:'badger',mat:'fur',release:'tue'},
  ecstadger: {line:'badger',stage:'drug',no:5,name:'Ecstadger',type:'FANG',rarity:'R',size:'M',stats:[86,91,83,73],moves:[['claw',1],['slam',1],['bite',8],['maul',20],['hug2',1]],desc:'Hugs everyone. Including the thing that is trying to eat it.',trip:'molly',feedFrom:'badger',mat:'fur',release:'tue'},
  ketadger: {line:'badger',stage:'drug',no:6,name:'Ketadger',type:'FANG',rarity:'R',size:'M',stats:[86,91,83,73],moves:[['claw',1],['slam',1],['bite',8],['maul',20],['khole',1]],desc:'Is it here? Is it there? It is behind you. Huge hit.',trip:'keta',feedFrom:'badger',mat:'fur',release:'tue'},
  ladger: {line:'badger',stage:'drug',no:7,name:'Ladger',type:'FANG',rarity:'R',size:'M',stats:[86,91,83,73],moves:[['claw',1],['slam',1],['bite',8],['maul',20],['kclaw',1]],desc:'Sees every colour. Hits with the one that hurts most.',trip:'lsd',feedFrom:'badger',mat:'fur',release:'tue'},
  lynxKitten: {line:'lynx',stage:1,no:8,name:'Lynx Kitten',type:'STONE',rarity:'C',size:'S',stats:[44,51,42,57],moves:[['pebble',1],['claw',1],['crush',9],['slide',22]],desc:'Tufted ears, enormous paws, no idea how to use either.',evolve:{lv:16,to:'lynx'},starter:true,release:'mon',mat:'fur',bait:['meat']},
  lynx: {line:'lynx',stage:2,no:9,name:'Lynx',type:'STONE',rarity:'U',size:'M',stats:[58,68,56,76],moves:[['pebble',1],['claw',1],['crush',9],['slide',22]],desc:'Silent on stone. Stares at you from rooftops.',evolve:{lv:32,to:'mountainLynx'},starter:true,release:'mon',mat:'fur',bait:['meat'],feedLv:22,feed:{molly:'mollynx'}},
  mountainLynx: {line:'lynx',stage:3,no:10,name:'Mountain Lynx',type:'STONE',rarity:'R',size:'M',stats:[73,85,70,95],moves:[['pebble',1],['claw',1],['crush',9],['slide',22]],desc:'King of the high rocks. Looks bored, is not.',starter:true,release:'mon',mat:'fur',bait:['meat']},
  mollynx: {line:'lynx',stage:'drug',no:11,name:'MolLynx',type:'STONE',rarity:'R',size:'M',stats:[75,88,73,99],moves:[['pebble',1],['claw',1],['crush',9],['slide',22],['eyes',1]],desc:'Big Eyes. Nobody can bring themselves to attack it.',trip:'molly',feedFrom:'lynx',mat:'fur',release:'tue'},
  toadlet: {line:'toad',stage:1,no:12,name:'Toadlet',type:'WATER',rarity:'C',size:'S',stats:[53,44,47,36],moves:[['splash',1],['slam',1],['bubble',9],['jet',22]],desc:'Fits on a thumbnail. Sings at 3 a.m.',evolve:{lv:14,to:'toad'},starter:true,release:'mon',mat:'scale',bait:['worms']},
  toad: {line:'toad',stage:2,no:13,name:'Toad',type:'WATER',rarity:'U',size:'S',stats:[70,58,62,48],moves:[['splash',1],['slam',1],['bubble',9],['jet',22]],desc:'Warts: yes. Charm: also yes.',evolve:{lv:30,to:'giantToad'},starter:true,release:'mon',mat:'scale',bait:['worms'],feedLv:26,feed:{dmt:'dmtoad'}},
  giantToad: {line:'toad',stage:3,no:14,name:'Giant Toad',type:'WATER',rarity:'R',size:'M',stats:[88,73,78,60],moves:[['splash',1],['slam',1],['bubble',9],['jet',22]],desc:'Sits on the lake like a boulder with opinions.',starter:true,release:'mon',mat:'scale',bait:['worms']},
  dmtoad: {line:'toad',stage:'drug',no:15,name:'DMToad',type:'WATER',rarity:'R',size:'S',stats:[91,75,81,62],moves:[['splash',1],['slam',1],['bubble',9],['jet',22],['brk',1]],desc:'It has met the machine elves. They said hi.',trip:'dmt',feedFrom:'toad',mat:'scale',release:'wed'},
  hoglet: {line:'hedgehog',stage:1,no:16,name:'Hoglet',type:'SHELL',rarity:'C',size:'S',stats:[42,42,60,33],moves:[['shell',1],['quill',1],['spike',9],['roll',20]],desc:'Rolls into a ball when you say hello.',evolve:{lv:16,to:'hedgehog'},starter:true,release:'mon',mat:'shell',bait:['jam']},
  hedgehog: {line:'hedgehog',stage:2,no:17,name:'Hedgehog',type:'SHELL',rarity:'U',size:'S',stats:[56,56,80,44],moves:[['shell',1],['quill',1],['spike',9],['roll',20]],desc:'Crosses roads with a courage nobody asked for.',evolve:{lv:30,to:'porcupine'},starter:true,release:'mon',mat:'shell',bait:['jam'],feedLv:24,feed:{shrooms:'sporecupine'}},
  porcupine: {line:'hedgehog',stage:3,no:18,name:'Porcupine',type:'SHELL',rarity:'R',size:'M',stats:[70,70,100,55],moves:[['shell',1],['quill',1],['spike',9],['roll',20]],desc:'Too many quills, too little personal space.',starter:true,release:'mon',mat:'shell',bait:['jam']},
  sporecupine: {line:'hedgehog',stage:'drug',no:19,name:'Sporecupine',type:'SHELL',rarity:'R',size:'S',stats:[73,73,104,57],moves:[['shell',1],['quill',1],['spike',9],['roll',20],['spores',1]],desc:'Mushrooms grow on its back. It is fine with that.',trip:'shrooms',feedFrom:'hedgehog',mat:'shell',release:'tue'},
  fawn: {line:'deer',stage:1,no:20,name:'Fawn',type:'ROOT',rarity:'C',size:'M',stats:[47,47,42,53],moves:[['nibble',1],['vine',1],['stomp',10],['gore',22]],desc:'Legs too long, ears too big. Falls over a lot.',evolve:{lv:16,to:'deer'},starter:true,release:'mon',mat:'antler',bait:['salt']},
  deer: {line:'deer',stage:2,no:21,name:'Deer',type:'ROOT',rarity:'U',size:'M',stats:[62,62,56,70],moves:[['nibble',1],['vine',1],['stomp',10],['gore',22]],desc:'Looks at headlights like they owe it money.',evolve:{lv:32,to:'stag'},starter:true,release:'mon',mat:'antler',bait:['salt'],feedLv:22,feed:{weed:'stonedeer'}},
  stag: {line:'deer',stage:3,no:22,name:'Stag',type:'ROOT',rarity:'R',size:'L',stats:[78,78,70,88],moves:[['nibble',1],['vine',1],['stomp',10],['gore',22]],desc:'Antlers like a chandelier. Bows to nobody.',starter:true,release:'mon',mat:'antler',bait:['salt']},
  stonedeer: {line:'deer',stage:'drug',no:23,name:'Stonedeer',type:'ROOT',rarity:'R',size:'M',stats:[81,81,73,91],moves:[['nibble',1],['vine',1],['stomp',10],['gore',22],['chill',1]],desc:'Chill Out. Everybody at the fight is a bit more chill.',trip:'weed',feedFrom:'deer',mat:'antler',release:'mon'},
  mouse: {line:'rat',stage:1,no:24,name:'Mouse',type:'FANG',rarity:'C',size:'S',stats:[36,42,33,50],moves:[['nip',1],['gnaw',1],['bite',10],['pounce',18]],desc:'Lives in the dumpster behind the pharmacy. Pays no rent.',evolve:{lv:12,to:'rat'},release:'mon',mat:'fur',bait:['cheese'],tier:1,trap:['ground'],hab:['maxi','lot','city']},
  rat: {line:'rat',stage:2,no:25,name:'Rat',type:'FANG',rarity:'C',size:'S',stats:[48,56,44,66],moves:[['nip',1],['gnaw',1],['bite',10],['pounce',18]],desc:'Knows every pipe in the building. Has opinions about the cheese.',evolve:{lv:30,to:'ratKing'},release:'mon',mat:'fur',bait:['cheese'],tier:1,trap:['ground'],hab:['maxi','lot','city']},
  ratKing: {line:'rat',stage:3,no:26,name:'Rat King',type:'FANG',rarity:'U',size:'S',stats:[60,70,55,83],moves:[['nip',1],['gnaw',1],['bite',10],['pounce',18]],desc:'Seven rats, one crown, zero regrets.',release:'mon',mat:'fur',bait:['cheese'],tier:2,trap:['ground'],hab:['maxi','lot','city']},
  nymph: {line:'cockroach',stage:1,no:27,name:'Nymph',type:'SHELL',rarity:'C',size:'S',stats:[39,38,53,36],moves:[['shell',1],['nip',1],['spike',10],['chitin',20]],desc:'Smaller than a thumb. Survives anything.',evolve:{lv:14,to:'cockroach'},release:'mon',mat:'chitin',bait:['jam'],tier:1,trap:['ground'],hab:['maxi','city'],nightBoost:true},
  cockroach: {line:'cockroach',stage:2,no:28,name:'Cockroach',type:'SHELL',rarity:'C',size:'S',stats:[52,50,70,48],moves:[['shell',1],['nip',1],['spike',10],['chitin',20]],desc:'Survived the 90s, the 00s and the last cleaning.',evolve:{lv:28,to:'giantCockroach'},release:'mon',mat:'chitin',bait:['jam'],tier:2,trap:['ground'],hab:['maxi','city'],nightBoost:true,feedLv:18,feed:{coke:'cokeroach'}},
  giantCockroach: {line:'cockroach',stage:3,no:29,name:'Giant Cockroach',type:'SHELL',rarity:'U',size:'S',stats:[65,63,88,60],moves:[['shell',1],['nip',1],['spike',10],['chitin',20]],desc:'Size of a loaf. Faster than your anger.',release:'mon',mat:'chitin',bait:['jam'],tier:2,trap:['ground'],hab:['maxi','city'],nightBoost:true},
  cokeroach: {line:'cockroach',stage:'drug',no:30,name:'Cokeroach',type:'SHELL',rarity:'U',size:'S',stats:[68,65,91,62],moves:[['shell',1],['nip',1],['spike',10],['chitin',20],['rail',1]],desc:'Always first. Always sniffing. Never sleeps.',trip:'coke',feedFrom:'cockroach',mat:'chitin',hab:['maxi','city'],release:'mon'},
  crowling: {line:'crow',stage:1,no:31,name:'Crowling',type:'WING',rarity:'C',size:'S',stats:[39,47,35,51],moves:[['peck',1],['flap',1],['swoop',9],['talon',22]],desc:'Loud, scruffy, always hungry. Steals a fry and screams.',evolve:{lv:16,to:'crow'},release:'mon',mat:'feather',bait:['bread'],tier:2,trap:['air'],hab:['lot','lawn','city','golf','mountain']},
  crow: {line:'crow',stage:2,no:32,name:'Crow',type:'WING',rarity:'C',size:'M',stats:[52,62,46,68],moves:[['peck',1],['flap',1],['swoop',9],['talon',22]],desc:'Knows your face. Holds a grudge for ten years.',evolve:{lv:32,to:'raven'},release:'mon',mat:'feather',bait:['bread'],tier:2,trap:['air'],hab:['lot','lawn','city','golf','mountain'],feedLv:20,feed:{keta:'ketacrow'}},
  raven: {line:'crow',stage:3,no:33,name:'Raven',type:'WING',rarity:'U',size:'M',stats:[65,78,58,85],moves:[['peck',1],['flap',1],['swoop',9],['talon',22]],desc:'Sees everything from the lamp post. Says very little.',release:'mon',mat:'feather',bait:['bread'],tier:3,trap:['air'],hab:['lot','lawn','city','golf','mountain']},
  ketacrow: {line:'crow',stage:'drug',no:34,name:'Ketacrow',type:'WING',rarity:'U',size:'M',stats:[68,81,60,88],moves:[['peck',1],['flap',1],['swoop',9],['talon',22],['dissoc',1]],desc:'Stares into the void. The void stares back and apologises.',trip:'keta',feedFrom:'crow',mat:'feather',hab:['lot','lawn','city','golf','mountain'],release:'tue'},
  larva: {line:'ladybug',stage:1,no:35,name:'Larva',type:'WING',rarity:'C',size:'S',stats:[33,41,45,47],moves:[['flap',1],['nibble',1],['spike',10]],desc:'A spotty little caterpillar thing. Eats aphids all day.',evolve:{lv:12,to:'ladybug'},release:'mon',mat:'chitin',bait:['jam'],tier:1,trap:['air'],hab:['lawn','golf','maxi'],day:true},
  ladybug: {line:'ladybug',stage:2,no:36,name:'Ladybug',type:'WING',rarity:'C',size:'S',stats:[48,59,66,68],moves:[['flap',1],['nibble',1],['spike',10]],desc:'Seven spots. Luck included. Warranty not.',release:'mon',mat:'chitin',bait:['jam'],tier:1,trap:['air'],hab:['lawn','golf','maxi'],day:true,feedLv:12,feed:{lsd:'laddybug'}},
  laddybug: {line:'ladybug',stage:'drug',no:37,name:'Ladd-ybug',type:'WING',rarity:'U',size:'S',stats:[57,70,78,81],moves:[['flap',1],['nibble',1],['spike',10],['spots',1]],desc:'Seven Spots of Truth. Shows you what is really there.',trip:'lsd',feedFrom:'ladybug',ability:'reveal',mat:'chitin',hab:['lawn','golf','maxi'],release:'tue'},
  perchFry: {line:'perch',stage:1,no:38,name:'Perch Fry',type:'WATER',rarity:'C',size:'S',stats:[42,42,41,44],moves:[['splash',1],['nip',1],['bubble',10],['wave',20]],desc:'Striped, curious, bites at anything.',evolve:{lv:12,to:'perch'},release:'mon',mat:'scale',bait:['worms'],tier:1,trap:['water'],hab:['oldlake','biglake']},
  perch: {line:'perch',stage:2,no:39,name:'Perch',type:'WATER',rarity:'C',size:'S',stats:[56,56,54,58],moves:[['splash',1],['nip',1],['bubble',10],['wave',20]],desc:'The fish your uncle always catches. Nobody else does.',evolve:{lv:26,to:'bigPerch'},release:'mon',mat:'scale',bait:['worms'],tier:2,trap:['water'],hab:['oldlake','biglake']},
  bigPerch: {line:'perch',stage:3,no:40,name:'Big Perch',type:'WATER',rarity:'U',size:'S',stats:[70,70,68,73],moves:[['splash',1],['nip',1],['bubble',10],['wave',20]],desc:'Fat, old, wise. Refuses to bite on Mondays.',release:'mon',mat:'scale',bait:['worms'],tier:3,trap:['water'],hab:['oldlake','biglake']},
  squirrelKit: {line:'squirrel',stage:1,no:41,name:'Squirrel Kit',type:'ROOT',rarity:'C',size:'S',stats:[38,42,35,56],moves:[['nibble',1],['vine',1],['swoop',12],['thorn',18]],desc:'Hides nuts. Forgets where. Plants forests by accident.',evolve:{lv:14,to:'squirrel'},release:'tue',mat:'fur',bait:['nuts'],tier:2,trap:['ground'],hab:['golf','lawn','forest'],day:true},
  squirrel: {line:'squirrel',stage:2,no:42,name:'Squirrel',type:'ROOT',rarity:'U',size:'S',stats:[50,56,46,74],moves:[['nibble',1],['vine',1],['swoop',12],['thorn',18]],desc:'Steals golf balls. Pretends it was the crow.',evolve:{lv:30,to:'flyingSquirrel'},release:'tue',mat:'fur',bait:['nuts'],tier:2,trap:['ground'],hab:['golf','lawn','forest'],day:true,feedLv:20,feed:{molly:'trancequirrel'}},
  flyingSquirrel: {line:'squirrel',stage:3,no:43,name:'Flying Squirrel',type:'ROOT',rarity:'R',size:'S',stats:[63,70,58,93],moves:[['nibble',1],['vine',1],['swoop',12],['thorn',18]],desc:'Glides between pines. Landing: optional.',release:'tue',mat:'fur',bait:['nuts'],tier:3,trap:['ground'],hab:['golf','lawn','forest'],day:true},
  trancequirrel: {night:true,line:'squirrel',stage:'drug',no:44,name:'Trancequirrel',type:'ROOT',rarity:'R',size:'S',stats:[65,73,60,96],moves:[['nibble',1],['vine',1],['swoop',12],['thorn',18],['bass',1]],desc:'Drop the Bass. Sets up in the golf rough at night.',trip:'molly',feedFrom:'squirrel',mat:'fur',hab:['golf','lawn','forest'],wild:true,release:'tue'},
  grub: {line:'beetle',stage:1,no:45,name:'Grub',type:'SHELL',rarity:'C',size:'S',stats:[44,48,54,30],moves:[['shell',1],['pinch',1],['spike',10],['chitin',20]],desc:'A fat white worm with an attitude.',evolve:{lv:18,to:'stagBeetle'},release:'tue',mat:'chitin',bait:['jam'],tier:1,trap:['air','ground'],hab:['golf','forest','lawn']},
  stagBeetle: {line:'beetle',stage:2,no:46,name:'Stag Beetle',type:'SHELL',rarity:'U',size:'S',stats:[64,70,79,44],moves:[['shell',1],['pinch',1],['spike',10],['chitin',20]],desc:'Antlers on a bug. Fights other bugs for fun.',release:'tue',mat:'chitin',bait:['jam'],tier:1,trap:['air','ground'],hab:['golf','forest','lawn'],feedLv:18,feed:{speed:'speedbeetle'}},
  speedbeetle: {line:'beetle',stage:'drug',no:47,name:'Speedbeetle',type:'SHELL',rarity:'R',size:'S',stats:[75,83,94,52],moves:[['shell',1],['pinch',1],['spike',10],['chitin',20],['tweak',1]],desc:'Tweak. Doesn\'t blink. Doesn\'t stop.',trip:'speed',feedFrom:'stagBeetle',mat:'chitin',hab:['golf','forest','lawn'],release:'tue'},
  hatchling: {line:'tortoise',stage:1,no:48,name:'Hatchling',type:'SHELL',rarity:'U',size:'S',stats:[54,36,62,20],moves:[['shell',1],['slam',1],['harden',12],['roll',24]],desc:'Escaped from a living room in 2009.',evolve:{lv:22,to:'tortoise'},release:'tue',mat:'shell',bait:['nuts'],tier:2,trap:['ground'],hab:['golf','castle']},
  tortoise: {line:'tortoise',stage:2,no:49,name:'Tortoise',type:'SHELL',rarity:'U',size:'M',stats:[72,48,82,26],moves:[['shell',1],['slam',1],['harden',12],['roll',24]],desc:'Lives by the pond. Has seen four owners come and go.',evolve:{lv:40,to:'elderTortoise'},release:'tue',mat:'shell',bait:['nuts'],tier:3,trap:['ground'],hab:['golf','castle'],feedLv:22,feed:{coke:'snortoise'}},
  elderTortoise: {line:'tortoise',stage:3,no:50,name:'Elder Tortoise',type:'SHELL',rarity:'R',size:'L',stats:[90,60,103,33],moves:[['shell',1],['slam',1],['harden',12],['roll',24]],desc:'Older than the golf club. Judges your swing.',release:'tue',mat:'shell',bait:['nuts'],tier:4,trap:['ground'],hab:['golf','castle']},
  snortoise: {line:'tortoise',stage:'drug',no:51,name:'Snortoise',type:'SHELL',rarity:'R',size:'M',stats:[94,62,107,34],moves:[['shell',1],['slam',1],['harden',12],['roll',24],['dash',1]],desc:'Line Dash. The fastest tortoise alive. It will tell you.',trip:'coke',feedFrom:'tortoise',mat:'shell',hab:['golf','castle'],release:'tue'},
  crayling: {line:'crayfish',stage:1,no:52,name:'Crayling',type:'SHELL',rarity:'U',size:'S',stats:[42,50,51,33],moves:[['pinch',1],['shell',1],['spike',12],['chitin',22]],desc:'A tiny crayfish. Pinches your finger on principle.',evolve:{lv:18,to:'crayfish'},release:'tue',mat:'shell',bait:['worms','meat'],tier:2,trap:['water'],hab:['oldlake','biglake'],night:true},
  crayfish: {line:'crayfish',stage:2,no:53,name:'Crayfish',type:'SHELL',rarity:'U',size:'S',stats:[56,66,68,44],moves:[['pinch',1],['shell',1],['spike',12],['chitin',22]],desc:'Red in the pot, brown in the lake.',evolve:{lv:34,to:'signalCrayfish'},release:'tue',mat:'shell',bait:['worms','meat'],tier:3,trap:['water'],hab:['oldlake','biglake'],night:true,feedLv:18,feed:{snaps:'snapskrafta'}},
  signalCrayfish: {line:'crayfish',stage:3,no:54,name:'Signal Crayfish',type:'SHELL',rarity:'R',size:'M',stats:[70,83,85,55],moves:[['pinch',1],['shell',1],['spike',12],['chitin',22]],desc:'Invasive. Proud of it. Great with dill.',release:'tue',mat:'shell',bait:['worms','meat'],tier:3,trap:['water'],hab:['oldlake','biglake'],night:true},
  snapskrafta: {line:'crayfish',stage:'drug',no:55,name:'Snapskräfta',type:'SHELL',rarity:'R',size:'S',stats:[73,86,88,57],moves:[['pinch',1],['shell',1],['spike',12],['chitin',22],['sing',1]],desc:'Sings Helan Går. Hits harder when you join in.',trip:'snaps',feedFrom:'crayfish',mat:'shell',hab:['biglake'],release:'tue',night:true},
  pikeFry: {line:'pike',stage:1,no:56,name:'Pike Fry',type:'WATER',rarity:'U',size:'M',stats:[48,57,38,48],moves:[['splash',1],['lbite',1],['wave',14],['torrent',22],['ferry',30]],desc:'A toothy little torpedo.',evolve:{lv:22,to:'pike'},release:'tue',mat:'scale',bait:['worms','meat'],tier:1,trap:['water'],hab:['oldlake','biglake']},
  pike: {line:'pike',stage:2,no:57,name:'Pike',type:'WATER',rarity:'R',size:'M',stats:[64,76,50,64],moves:[['splash',1],['lbite',1],['wave',14],['torrent',22],['ferry',30]],desc:'Lurks in the reeds. Patient. Unbothered. Toothy.',evolve:{lv:38,to:'pikezilla'},release:'tue',mat:'scale',bait:['worms','meat'],tier:[2,4],trap:['water'],hab:['oldlake','biglake'],feedLv:24,feed:{molly:'mollipike'}},
  pikezilla: {line:'pike',stage:3,no:58,name:'Pikezilla',type:'WATER',rarity:'R',size:'L',stats:[80,95,63,80],moves:[['splash',1],['lbite',1],['wave',14],['torrent',22],['ferry',30]],desc:'The king of the lake. Wears reeds like a crown.',release:'tue',mat:'scale',bait:['worms','meat'],tier:5,trap:['water'],hab:['oldlake','biglake']},
  mollipike: {line:'pike',stage:'drug',no:59,name:'Mollipike',type:'WATER',rarity:'E',size:'M',stats:[83,99,65,83],moves:[['splash',1],['lbite',1],['wave',14],['torrent',22],['ferry',30],['lovebite',1]],desc:'Love Bite. Drains you gently and tells you it is nothing personal.',trip:'molly',feedFrom:'pike',mat:'scale',hab:['biglake'],release:'tue'},
  mantisLarva: {line:'mantis',stage:1,no:60,name:'Mantis Larva',type:'WATER',rarity:'R',size:'S',stats:[39,63,42,54],moves:[['jet',1],['pinch',1],['torrent',28]],desc:'Escaped from the city aquarium. Punches faster than the eye.',evolve:{lv:26,to:'mantisShrimp'},release:'wed',mat:'shell',bait:['meat'],tier:4,trap:['water'],hab:['oldlake','biglake']},
  mantisShrimp: {line:'mantis',stage:2,no:61,name:'Mantis Shrimp',type:'WATER',rarity:'R',size:'S',stats:[57,92,62,79],moves:[['jet',1],['pinch',1],['torrent',28]],desc:'The fastest punch in the animal kingdom. In a lake.',release:'wed',mat:'shell',bait:['meat'],tier:4,trap:['water'],hab:['oldlake','biglake'],feedLv:26,feed:{shrooms:'mantisShroom'}},
  mantisShroom: {line:'mantis',stage:'drug',no:62,name:'Mantis Shroom',type:'WATER',rarity:'E',size:'S',stats:[68,109,73,94],moves:[['jet',1],['pinch',1],['torrent',28],['sporepunch',1]],desc:'Sporepunch. Hits first, confuses second.',trip:'shrooms',feedFrom:'mantisShrimp',mat:'shell',hab:['biglake'],release:'tue'},
  trippo: {line:'trippo',stage:1,no:63,name:'Trippopotamus',type:'WATER',rarity:'E',size:'XL',stats:[110,80,70,40],moves:[['splash',1],['badtrip',1],['wave',20],['torrent',30]],desc:'Only visible to the tripping. Everyone is confused. Itself too.',release:'wed',mat:'scale',tier:5,trap:['water'],hab:['biglake'],needs:'reveal'},
  foxKit: {line:'fox',stage:1,no:64,name:'Fox Kit',type:'FANG',rarity:'U',size:'S',stats:[42,50,36,54],moves:[['nip',1],['claw',1],['pounce',14],['snap',22]],desc:'Rusty fluff, huge ears, no manners.',evolve:{lv:20,to:'fox'},release:'tue',mat:'fur',bait:['meat'],tier:2,trap:['ground'],hab:['forest','golf','city'],night:true},
  fox: {line:'fox',stage:2,no:65,name:'Fox',type:'FANG',rarity:'U',size:'M',stats:[56,66,48,72],moves:[['nip',1],['claw',1],['pounce',14],['snap',22]],desc:'Raids bins in town after dark.',evolve:{lv:36,to:'silverFox'},release:'tue',mat:'fur',bait:['meat'],tier:3,trap:['ground'],hab:['forest','golf','city'],night:true,feedLv:22,feed:{xanax:'xanaxfox'}},
  silverFox: {line:'fox',stage:3,no:66,name:'Silver Fox',type:'FANG',rarity:'R',size:'M',stats:[70,83,60,90],moves:[['nip',1],['claw',1],['pounce',14],['snap',22]],desc:'Silver fur, silver tongue, no conscience.',release:'tue',mat:'fur',bait:['meat'],tier:4,trap:['ground'],hab:['forest','golf','city'],night:true},
  xanaxfox: {line:'fox',stage:'drug',no:67,name:'Xanaxfox',type:'FANG',rarity:'R',size:'M',stats:[73,86,62,94],moves:[['nip',1],['claw',1],['pounce',14],['snap',22],['unbothered',1]],desc:'Unbothered. Was chasing a mouse. Forgot why.',trip:'xanax',feedFrom:'fox',mat:'fur',hab:['forest','golf','city'],release:'tue',night:true},
  boarlet: {line:'boar',stage:1,no:68,name:'Boarlet',type:'FANG',rarity:'U',size:'M',stats:[59,56,48,33],moves:[['bite',1],['slam',1],['tusk',14],['maul',26]],desc:'Stripes today. Tusks tomorrow.',evolve:{lv:24,to:'wildBoar'},release:'tue',mat:'fur',bait:['meat'],tier:3,trap:['ground'],hab:['forest']},
  wildBoar: {line:'boar',stage:2,no:69,name:'Wild Boar',type:'FANG',rarity:'U',size:'L',stats:[78,74,64,44],moves:[['bite',1],['slam',1],['tusk',14],['maul',26]],desc:'Rolls in mud like it is a spa. Rams like a truck.',evolve:{lv:40,to:'tusker'},release:'tue',mat:'fur',bait:['meat'],tier:4,trap:['ground'],hab:['forest'],feedLv:26,feed:{shrooms:'shroomboar',coke:'blowboar'}},
  tusker: {line:'boar',stage:3,no:70,name:'Tusker',type:'FANG',rarity:'R',size:'L',stats:[98,93,80,55],moves:[['bite',1],['slam',1],['tusk',14],['maul',26]],desc:'Tusks the length of your forearm. Do not stand in the way.',release:'tue',mat:'fur',bait:['meat'],tier:4,trap:['ground'],hab:['forest']},
  shroomboar: {line:'boar',stage:'drug',no:71,name:'Shroomboar',type:'FANG',rarity:'R',size:'L',stats:[101,96,83,57],moves:[['bite',1],['slam',1],['tusk',14],['maul',26],['truffle',1]],desc:'Truffle Rage. The lower its HP, the harder it hits.',trip:'shrooms',feedFrom:'wildBoar',mat:'fur',hab:['forest'],release:'tue'},
  blowboar: {line:'boar',stage:'drug',no:72,name:'Blowboar',type:'FANG',rarity:'R',size:'L',stats:[101,96,83,57],moves:[['bite',1],['slam',1],['tusk',14],['maul',26],['nose',1]],desc:'Nose Charge. Huge hit. It will feel that tomorrow.',trip:'coke',feedFrom:'wildBoar',mat:'fur',hab:['forest'],release:'tue'},
  caterpillar: {line:'moth',stage:1,no:73,name:'Caterpillar',type:'WING',rarity:'U',size:'S',stats:[38,45,35,57],moves:[['flap',1],['nibble',1],['gust',12],['swoop',22]],desc:'Eats a leaf an hour. Dreams of lamps.',evolve:{lv:18,to:'moth'},release:'tue',mat:'chitin',bait:['jam'],tier:3,trap:['air'],hab:['forest','city'],night:true},
  moth: {line:'moth',stage:2,no:74,name:'Moth',type:'WING',rarity:'U',size:'S',stats:[50,60,46,76],moves:[['flap',1],['nibble',1],['gust',12],['swoop',22]],desc:'Drawn to light. Cannot explain why.',evolve:{lv:34,to:'deathMoth'},release:'tue',mat:'chitin',bait:['jam'],tier:3,trap:['air'],hab:['forest','city'],night:true,feedLv:20,feed:{meth:'methmoth'}},
  deathMoth: {line:'moth',stage:3,no:75,name:'Death\'s-head Moth',type:'WING',rarity:'R',size:'M',stats:[63,75,58,95],moves:[['flap',1],['nibble',1],['gust',12],['swoop',22]],desc:'A skull on its back. Shows up in bad dreams.',release:'tue',mat:'chitin',bait:['jam'],tier:3,trap:['air'],hab:['forest','city'],night:true},
  methmoth: {line:'moth',stage:'drug',no:76,name:'Methmoth',type:'WING',rarity:'R',size:'S',stats:[65,78,60,99],moves:[['flap',1],['nibble',1],['gust',12],['swoop',22],['lamp',1]],desc:'Lamp Frenzy. Has not slept since Tuesday. Fights the street lamp.',trip:'meth',feedFrom:'moth',mat:'chitin',hab:['forest','city'],wild:true,release:'wed',night:true},
  mooseCalf: {line:'moose',stage:1,no:77,name:'Moose Calf',type:'ROOT',rarity:'R',size:'L',stats:[69,57,53,30],moves:[['nibble',1],['stomp',1],['gore',16],['crush',24]],desc:'Knees like a table. Sulks when it rains.',evolve:{lv:30,to:'moose'},release:'tue',mat:'antler',bait:['salt'],tier:4,trap:['ground'],hab:['deepforest']},
  moose: {line:'moose',stage:2,no:78,name:'Moose',type:'ROOT',rarity:'R',size:'XL',stats:[92,76,70,40],moves:[['nibble',1],['stomp',1],['gore',16],['crush',24]],desc:'Crosses roads without looking. Wins every time.',evolve:{lv:44,to:'bullMoose'},release:'tue',mat:'antler',bait:['salt'],tier:5,trap:['ground'],hab:['deepforest'],feedLv:32,feed:{keta:'ketamoose',shrooms:'shroomoose'}},
  bullMoose: {line:'moose',stage:3,no:79,name:'Bull Moose',type:'ROOT',rarity:'E',size:'XL',stats:[115,95,88,50],moves:[['nibble',1],['stomp',1],['gore',16],['crush',24]],desc:'Antlers like a satellite dish. Bellows at 4 a.m.',release:'tue',mat:'antler',bait:['salt'],tier:5,trap:['ground'],hab:['deepforest']},
  ketamoose: {line:'moose',stage:'drug',no:80,name:'Ketamoose',type:'ROOT',rarity:'E',size:'XL',stats:[120,99,91,52],moves:[['nibble',1],['stomp',1],['gore',16],['crush',24],['void',1]],desc:'Moose in the Void. Is it still here? Define \'here\'.',trip:'keta',feedFrom:'moose',mat:'antler',hab:['deepforest'],release:'tue'},
  shroomoose: {line:'moose',stage:'drug',no:81,name:'Shroomoose',type:'ROOT',rarity:'E',size:'XL',stats:[120,99,91,52],moves:[['nibble',1],['stomp',1],['gore',16],['crush',24],['bloom',1]],desc:'Antler Bloom. A spore cloud with an opinion.',trip:'shrooms',feedFrom:'moose',mat:'antler',hab:['deepforest'],release:'tue'},
  bearCub: {line:'bear',stage:1,no:82,name:'Bear Cub',type:'FANG',rarity:'R',size:'L',stats:[68,63,50,33],moves:[['bite',1],['claw',1],['hug',12],['maul',26]],desc:'Cute. Careful: mum is watching.',evolve:{lv:32,to:'brownBear'},release:'tue',mat:'fur',bait:['honey'],tier:4,trap:['ground'],hab:['deepforest','mountain']},
  brownBear: {line:'bear',stage:2,no:83,name:'Brown Bear',type:'FANG',rarity:'R',size:'XL',stats:[90,84,66,44],moves:[['bite',1],['claw',1],['hug',12],['maul',26]],desc:'Eats honey, salmon, hikers. Not in that order.',evolve:{lv:46,to:'oldBear'},release:'tue',mat:'fur',bait:['honey'],tier:5,trap:['ground'],hab:['deepforest','mountain'],feedLv:34,feed:{shrooms:'psilocybear'}},
  oldBear: {line:'bear',stage:3,no:84,name:'Old Bear',type:'FANG',rarity:'E',size:'XL',stats:[113,105,83,55],moves:[['bite',1],['claw',1],['hug',12],['maul',26]],desc:'Greyer, slower, meaner. Remembers every picnic.',release:'tue',mat:'fur',bait:['honey'],tier:5,trap:['ground'],hab:['deepforest','mountain']},
  psilocybear: {line:'bear',stage:'drug',no:85,name:'Psilocybear',type:'FANG',rarity:'E',size:'XL',stats:[117,109,86,57],moves:[['bite',1],['claw',1],['hug',12],['maul',26],['eye',1]],desc:'Third Eye Maul. Never misses. Sees you from three angles.',trip:'shrooms',feedFrom:'brownBear',mat:'fur',hab:['deepforest','mountain'],release:'tue'},
  adderling: {line:'adder',stage:1,no:86,name:'Adderling',type:'FANG',rarity:'U',size:'S',stats:[39,53,35,56],moves:[['nip',1],['snap',1],['bite',14],['pounce',24]],desc:'Zig-zag on its back. Bites if stepped on.',evolve:{lv:22,to:'adder'},release:'tue',mat:'scale',bait:['meat'],tier:2,trap:['ground'],hab:['mountain','forest'],day:true},
  adder: {line:'adder',stage:2,no:87,name:'Adder',type:'FANG',rarity:'U',size:'S',stats:[52,70,46,74],moves:[['nip',1],['snap',1],['bite',14],['pounce',24]],desc:'Sunbathes on the warmest rock in the county.',evolve:{lv:36,to:'blackAdder'},release:'tue',mat:'scale',bait:['meat'],tier:3,trap:['ground'],hab:['mountain','forest'],day:true,feedLv:24,feed:{lsd:'acidadder'}},
  blackAdder: {line:'adder',stage:3,no:88,name:'Black Adder',type:'FANG',rarity:'R',size:'M',stats:[65,88,58,93],moves:[['nip',1],['snap',1],['bite',14],['pounce',24]],desc:'All black, all venom, all attitude.',release:'tue',mat:'scale',bait:['meat'],tier:3,trap:['ground'],hab:['mountain','forest'],day:true},
  acidadder: {line:'adder',stage:'drug',no:89,name:'Acidadder',type:'FANG',rarity:'R',size:'S',stats:[68,91,60,96],moves:[['nip',1],['snap',1],['bite',14],['pounce',24],['melt',1]],desc:'Melt. Everything is liquid and it is your fault.',trip:'lsd',feedFrom:'adder',mat:'scale',hab:['mountain','forest'],release:'tue'},
  leveret: {line:'hare',stage:1,no:90,name:'Leveret',type:'ROOT',rarity:'U',size:'S',stats:[36,42,33,60],moves:[['nibble',1],['vine',1],['swoop',12]],desc:'A tuft of fur with eyes.',evolve:{lv:18,to:'mountainHare'},release:'tue',mat:'fur',bait:['nuts'],tier:2,trap:['ground'],hab:['mountain']},
  mountainHare: {line:'hare',stage:2,no:91,name:'Mountain Hare',type:'ROOT',rarity:'U',size:'S',stats:[53,62,48,88],moves:[['nibble',1],['vine',1],['swoop',12]],desc:'White in winter, grey in summer, gone in a flash.',release:'tue',mat:'fur',bait:['nuts'],tier:3,trap:['ground'],hab:['mountain']},
  eaglet: {line:'eagle',stage:1,no:92,name:'Eaglet',type:'WING',rarity:'R',size:'M',stats:[47,63,39,57],moves:[['flap',1],['peck',1],['dive',14],['talon',28]],desc:'Fluff and hunger. Mum is not far.',evolve:{lv:28,to:'eagle'},release:'tue',mat:'feather',bait:['meat'],tier:2,trap:['air','ground'],hab:['mountain'],day:true},
  eagle: {line:'eagle',stage:2,no:93,name:'Eagle',type:'WING',rarity:'R',size:'L',stats:[62,84,52,76],moves:[['flap',1],['peck',1],['dive',14],['talon',28]],desc:'Spots your sandwich from two kilometres.',evolve:{lv:42,to:'goldenEagle'},release:'tue',mat:'feather',bait:['meat'],tier:4,trap:['air','ground'],hab:['mountain'],day:true},
  goldenEagle: {line:'eagle',stage:3,no:94,name:'Golden Eagle',type:'WING',rarity:'E',size:'L',stats:[78,105,65,95],moves:[['flap',1],['peck',1],['dive',14],['talon',28]],desc:'Golden neck, golden eyes. Not for sale.',release:'tue',mat:'feather',bait:['meat'],tier:4,trap:['air','ground'],hab:['mountain'],day:true},
  wolverineKit: {line:'wolverine',stage:1,no:95,name:'Wolverine Kit',type:'FANG',rarity:'R',size:'M',stats:[51,65,50,48],moves:[['bite',1],['claw',1],['maul',20],['rend',34]],desc:'Small, angry, already carrying a grudge.',evolve:{lv:34,to:'wolverine'},release:'tue',mat:'fur',bait:['meat'],tier:3,trap:['ground'],hab:['mountain']},
  wolverine: {line:'wolverine',stage:2,no:96,name:'Wolverine',type:'FANG',rarity:'E',size:'M',stats:[75,95,73,70],moves:[['bite',1],['claw',1],['maul',20],['rend',34]],desc:'Not a bear. Not a badger. Will fight both.',release:'tue',mat:'fur',bait:['meat'],tier:4,trap:['ground'],hab:['mountain']},
  wraith: { line: 'wraith', stage: 1, no: 97, name: 'Cold Wallet Wraith', type: 'MIND', rarity: 'M', size: 'M', stats: [96, 92, 80, 80], moves: [['seed', 1], ['glitch', 1], ['hotfix', 12]], desc: 'Holds 3,000 bitcoin. Forgot the password. The one creature that is not part of the roster: it belongs to the grave reward.', art: 'assets/creatures/wraith.png', likes: 'shrooms', trapOnly: 'mythicTrap', release: 'wed', requires: 'mythicSpawned' }
},

/* ---------- people as fighters (bosses you can catch, wives, NPCs). look = paper-doll spec, see dollParts ---------- */
heroes: {
  bigwman: { name: 'BigWman', col: '#3ddc84', team: ['trancequirrel', 'blowboar', 'psilocybear'], at: [9, 44], ult: 'YES!', ultTxt: '+50 % ATK for the whole team for 3 turns', after: 'I need to update the spreadsheet. YES… no.',
    stats: [80, 72, 74, 46], moves: [['yes', 1], ['slam', 1], ['hug', 8]], likes: 'beer6', epitaph: 'Balanced the budget. Not the life.',
    look: { skin: '#e9b48c', hair: null, style: 'bald', top: '#1d1d24', topStyle: 'tee', legs: '#3d5f92', shoes: '#6b4a2b', prop: 'clip', big: 1 } },
  wizcudi: { name: 'Wizcudi', col: '#8c6cff', team: ['methmoth', 'speedbeetle', 'mantisShroom'], at: [41, 54], ult: 'Lights Out', ultTxt: 'the enemy misses 2 turns', after: 'Fine. But turn the light off on your way out.',
    stats: [64, 70, 60, 74], moves: [['lights', 1], ['zap', 1], ['beep', 8]], likes: 'beer6', epitaph: 'Finally, the lights are off.',
    look: { skin: '#e9b48c', hair: '#5a3a22', style: 'short', beard: '#5a3a22', glasses: 1, top: '#1d1d24', top2: '#f5c518', topStyle: 'stripe', legs: '#3d5f92', shoes: '#333' } },
  jrohn: { name: 'Jrohn', col: '#ff4fa3', team: ['acidadder', 'shroomboar', 'shroomoose'], at: [29, 32], ult: 'I Love This!', ultTxt: 'heals the team 50 % and charms the enemy', after: 'I LOVE THIS! Losing, I mean. Hug?',
    stats: [70, 64, 58, 70], moves: [['love', 1], ['hug', 1], ['dill', 8]], likes: 'beer6', epitaph: 'Here lies Jrohn. Shirt not included.',
    look: { skin: '#e9b48c', hair: '#6b4226', style: 'short', top: '#4f6e3a', top2: '#2e4424', topStyle: 'plaid', legs: '#6b6247', shoes: '#4a3220', prop: 'plant' } },
  loken: { name: 'Löken', col: '#f5c242', team: ['snortoise', 'mollipike', 'ketamoose'], at: [24, 14], ult: 'Stick Together, Boys!', ultTxt: 'every creature on your team attacks at once', after: 'Good fight. Now get off the lawn. Gently.',
    stats: [76, 70, 78, 48], moves: [['stick', 1], ['slam', 1], ['rattle', 8]], likes: 'beer6', epitaph: 'Stuck together. Alone, for once.',
    look: { skin: '#e9b48c', hair: '#8a5a2b', style: 'cap', cap: '#f5c518', cap2: '#1d1d24', beard: '#8a5a2b', top: '#b9c1cc', topStyle: 'armor', legs: '#5a4a30', shoes: '#4a3220', prop: 'shield' } },
  ljunky: { name: 'Ljunky', col: '#f7931a', team: ['cokeroach', 'laddybug', 'ketacrow'], at: [41, 12], ult: 'Buy the Dip', ultTxt: '50 %: double damage. 50 %: zero.', after: 'Unrealised loss. It does not count.',
    stats: [68, 76, 56, 72], moves: [['dip', 1], ['peck', 1], ['zap', 8]], likes: 'beer6', epitaph: 'Bought the dip. The dip bought him.',
    look: { skin: '#f0c4a0', hair: '#f0d878', style: 'short', top: '#1d1d24', topStyle: 'tee', legs: '#25252b', shoes: '#222', prop: 'bow' } }
},
/* boss -> player hero opening lines */
bossLines: {
  bigwman: { wizcudi: 'I ran the numbers. Your electricity savings fund exactly zero of my packages.', jrohn: "Let's settle it, Jrohn. Biggest… spreadsheet wins. Mine has more rows. YES!", loken: "I respect the lawn, Löken. I don't respect the lawn budget.", ljunky: "Bitcoin is not an asset class. It's a cry for help." },
  wizcudi: { loken: 'AIK forever. Djurgården never. And who left that light on?!', bigwman: 'I calculated 300 moves ahead. You calculated VAT.', jrohn: "Put a shirt on, you're heating the room and I can't afford that.", ljunky: 'Your mining rig costs me money from across town. I can feel it.' },
  jrohn: { bigwman: "Pants off, cards on the table. Today we find out who's bigger. I LOVE THIS!", wizcudi: 'Relax, I left every light in the basement on. For you.', loken: 'Hug first, fight after. …Where did my shirt go?', ljunky: 'Have you seen Walter? No? Then you have to fight me.' },
  loken: { wizcudi: "You're standing on Djurgården grass now. Stick together, boys… except you.", bigwman: 'I dropped 400 kr on the way here. Put it in a spreadsheet.', jrohn: 'Not on the lawn! Keep your pants ON on the lawn!', ljunky: 'The coins I drop are real. Yours are imaginary.' },
  ljunky: { bigwman: "I put your whole pension in a coin called ZOMBIE. You're welcome.", wizcudi: "I explained the rules. Twice. Unclearly. That's on you.", jrohn: "My cats ate your plants. Let's call it even.", loken: "Have you checked the Bitcoin price today? No? That's why you lose." }
},

/* ---------- wives / partners. kind Guilt|Psychic. Her "mood" bar drops from the women's throwables; at zero she is knocked out ---------- */
partners: {
  cicci: { name: 'Cicci', guy: 'bigwman', kind: 'Guilt', col: '#f4f6fb', at: [14, 44], release: 'mon', likes: 'WIFE', epitaph: 'Cancelled every package. Then herself.',
    moves: [{ n: 'Another package?', fx: 'stun' }, { n: 'We said a budget.', fx: 'atk' }],
    good: ['I cancelled the packages. All of them.', "He's at the checkouts, signing for something."], bad: ["It's an investment, technically.", 'Packages? What packages?'],
    stats: [70, 60, 70, 60], fightMoves: [['guilt', 1], ['slam', 1]],
    look: { skin: '#f0c09a', hair: '#f0d070', style: 'updo', top: '#f4f6fb', topStyle: 'gown', legs: '#f4f6fb', shoes: '#dfe6f2', prop: 'bouquet' } },
  anna: { name: 'Anna', guy: 'wizcudi', kind: 'Psychic', col: '#c8262e', at: [38, 55], release: 'mon', likes: 'WIFE', epitaph: 'The light is finally on. Forever.',
    moves: [{ n: 'Turn it back ON.', fx: 'conf' }, { n: 'Ellie wants the light on.', fx: 'dmg' }],
    good: ['I turned the light ON. For Ellie.', "He's at the E.ON charger, guarding the meter."], bad: ['Do you know what that lamp costs per hour?', "He told me to say he's in a meeting."],
    stats: [64, 66, 60, 70], fightMoves: [['guilt', 1], ['lights', 1]],
    look: { skin: '#f0c09a', hair: '#f2d27a', style: 'long', freckles: 1, top: '#c8262e', topStyle: 'dress', legs: '#f0c09a', shoes: '#c8262e', prop: 'clutch' } },
  monika: { name: 'Monika', guy: 'jrohn', kind: 'Guilt', col: '#1f2a44', at: [8, 19], release: 'mon', likes: 'WIFE', epitaph: 'Found Walter. Lost patience.',
    moves: [{ n: 'Where are your clothes?', fx: 'def' }, { n: 'Walter ran away AGAIN.', fx: 'dmg' }],
    good: ["Shirt on. Walter found. Let's go home.", "He's in the flower department, talking to plants."], bad: ['Have you seen my pants?', 'Clothes are a social construct.'],
    stats: [68, 62, 66, 62], fightMoves: [['guilt', 1], ['slam', 1]],
    look: { skin: '#f0c09a', hair: '#e8c46a', style: 'long', top: '#1f2a44', top2: '#cfe3ea', topStyle: 'blazer', legs: '#34343c', shoes: '#8a5a2b', prop: 'tablet' } },
  sofia: { name: 'Sofia', guy: 'loken', kind: 'Psychic', col: '#1d1d24', at: [17, 63], release: 'mon', likes: 'WIFE', epitaph: 'No more Djurgården matches. Ever.',
    moves: [{ n: 'Not another Djurgården match.', fx: 'conf' }, { n: 'The lawn can wait.', fx: 'dmg' }],
    good: ['No match today. Just you and me.', "He's on the lawn by the lake. Guarding it."], bad: ['Djurgården plays at seven, though.', 'Löken? Never heard of him.'],
    stats: [66, 64, 64, 66], fightMoves: [['guilt', 1], ['peck', 1]],
    look: { skin: '#eebd96', hair: '#7a4a2a', style: 'bob', top: '#1d1d24', topStyle: 'tee', necklace: 1, legs: '#3a3d48', shoes: '#f4f4f4' } },
  maadmads: { name: 'MaadMads', guy: 'ljunky', kind: 'Guilt', col: '#16161c', at: [42, 33], release: 'mon', likes: 'WIFE', epitaph: 'Fed the cats one last time.',
    moves: [{ n: 'Did you buy the dip again?', fx: 'spd' }, { n: 'The cats need food.', fx: 'dmg' }],
    good: ['I sold everything. The cats are fed.', "He's in The Box, doing burpees for no reason."], bad: ["It's not a dip, it's a discount.", "He's mining. Somewhere. Don't ask."],
    stats: [66, 68, 60, 66], fightMoves: [['guilt', 1], ['knock', 1]],
    look: { skin: '#f0c09a', hair: '#f4e08a', style: 'straight', top: '#16161c', topStyle: 'blazer', top2: '#2a2a30', legs: '#16161c', shoes: '#111', prop: 'wine', cats: 1 } }
},
/* answers in a partner encounter. note = shown under the button after you have picked it once */
choices: {
  sorry: { label: '🙏 Apologize', note: 'She softens. You lose HP.' },
  promise: { label: '🤞 Promise', note: 'Ends it. Adds promise debt.' },
  wrong: ['Have you lost weight?', 'Calm down.', 'My mum does it differently.', 'Is this about the dishwasher?', 'Sounds like a you problem.', 'Let me google that.']   // random wrong lines mixed in
},

/* ---------- items. kind: throwable | trap | lure | weapon | drug | app | key
   Effect text is hidden ("???") until you use the item once; then learnedNote shows under it.
   use: effects when you drink/eat/use it (self).  throw: effects on the opponent (battle).  em = icon.
   Effects: see the effect list in DATA.md. ---------- */
items: {
  // catching
  bag: { kind: 'throwable', name: 'Carrier bag', em: '🛍️', price: 10, catch: true, learnedNote: 'Catches a weakened creature. Better after a knockout.', release: 'mon' },
  // throwables (sold by Hardware Jonas, the freezer, the checkouts)
  rock: { kind: 'throwable', name: 'Rock', em: '🪨', price: 3, hit: .55, throw: [{ type: 'damage', value: 14 }], learnedNote: 'Cheap. Misses a lot.', release: 'mon' },
  bottle: { kind: 'throwable', name: 'Empty bottle', em: '🍾', price: 6, hit: .7, onMiss: 'near', koBelow: .35, throw: [{ type: 'damage', value: 18 }], learnedNote: 'A hit on a weak foe knocks it out. A miss lands next to it.', release: 'mon' },
  meatballs: { kind: 'throwable', name: 'Frozen meatballs', em: '🧆', price: 12, hit: .8, throw: [{ type: 'damage', value: 16, vs: { WATER: 2.5 } }], learnedNote: 'Very strong against WATER.', release: 'mon' },
  surstromming: { kind: 'throwable', name: 'Surströmming can', em: '🥫', price: 18, hit: 1, area: true, throw: [{ type: 'flee', vs: 'FANG', chance: .5 }, { type: 'stun', turns: 1 }, { type: 'catchBonus', value: .4, turns: 3 }], learnedNote: 'FANG animals may flee. Everything else is dazed.', release: 'mon' },
  banana: { kind: 'throwable', name: 'Banana peel', em: '🍌', price: 5, hit: .9, throw: [{ type: 'loseTurn', turns: 1 }], learnedNote: 'They slip and lose a turn.', release: 'mon' },
  // for the women (sold by Flower Fia)
  bouquet: { kind: 'throwable', name: 'Chlorine bouquet', em: '💐', price: 25, hit: .9, wife: true, throw: [{ type: 'stun', turns: 2 }, { type: 'calm', value: 20 }], learnedNote: 'Sneezing fit. Stunned for 2 turns.', release: 'mon' },
  glitter: { kind: 'throwable', name: 'Glitter bomb', em: '✨', price: 20, hit: .95, wife: true, throw: [{ type: 'blind', value: .35, turns: 3 }, { type: 'calm', value: 15 }], learnedNote: 'Blinded. Her aim gets worse.', release: 'mon' },
  giftcard: { kind: 'throwable', name: 'Gift card', em: '🎁', price: 40, hit: 1, wife: true, throw: [{ type: 'catchBonus', value: .6, turns: 3 }, { type: 'loseTurn', turns: 1 }, { type: 'calm', value: 30 }], learnedNote: 'Distracted. Easier to catch.', release: 'mon' },
  ringbox: { requires: 'know:ring', kind: 'throwable', name: 'Ring box', em: '💍', price: 250, hit: 1, wife: true, throw: [{ type: 'calm', value: 60 }, { type: 'promiseDebt', value: 1 }], learnedNote: 'Big calm. Adds promise debt.', release: 'mon' },
  chores: { kind: 'throwable', name: 'Chore chart', em: '📋', price: 8, hit: 1, wife: true, throw: [{ type: 'anger', value: 30 }], learnedNote: 'Backfires. She gets angrier.', release: 'mon' },
  // ---- traps: three ladders (ground / water / air), tier 1-5. cap = biggest creature size it holds (S M L XL), waitMin = real minutes, place = ground | shore | deep (pier end or boat) | boat | night.
  //      You never buy tier 2+: Trapper Tore upgrades a lower trap (upgradesTo + upgradeCost { kr, fur, feather, scale, chitin, shell, antler }). value = what it cost to build (repairs cost half) ----
  shoebox: { kind: 'trap', name: 'Shoebox trap', em: '👞', price: 0, notSold: true, value: 5, ladder: 'ground', tier: 1, cap: 'S', waitMin: 3, place: 'ground', uses: 3, learnedNote: 'Ground trap, tier 1. A homemade starter: falls apart after 3 catches. Small things only.', release: 'mon' },
  mouseTrap: { kind: 'trap', name: 'Mouse trap', em: '🪤', price: 30, value: 30, ladder: 'ground', tier: 1, cap: 'S', waitMin: 4, place: 'ground', upgradesTo: 'liveBox', upgradeCost: { kr: 60, fur: 3 }, learnedNote: 'Ground trap, tier 1. Small things: mice, roaches, beetles.', release: 'mon' },
  liveBox: { kind: 'trap', name: 'Live box', em: '📦', price: 0, notSold: true, value: 60, ladder: 'ground', tier: 2, cap: 'M', waitMin: 3.5, place: 'ground', upgradesTo: 'snare', upgradeCost: { kr: 100, fur: 4, chitin: 2 }, learnedNote: 'Ground trap, tier 2. Up to medium: squirrels, fox kits, crowlings.', release: 'mon' },
  snare: { kind: 'trap', name: 'Snare', em: '➰', price: 0, notSold: true, value: 100, ladder: 'ground', tier: 3, cap: 'M', waitMin: 3, place: 'ground', upgradesTo: 'pitTrap', upgradeCost: { kr: 160, fur: 6, shell: 2 }, learnedNote: 'Ground trap, tier 3. Foxes, adders, boarlets.', release: 'mon' },
  pitTrap: { kind: 'trap', name: 'Pit trap', em: '🕳️', price: 0, notSold: true, value: 160, ladder: 'ground', tier: 4, cap: 'L', waitMin: 2.5, place: 'ground', upgradesTo: 'moosePen', upgradeCost: { kr: 250, fur: 6, antler: 4 }, learnedNote: 'Ground trap, tier 4. Big ones: boars, deer-sized.', release: 'mon' },
  moosePen: { kind: 'trap', name: 'Moose pen (with salt lick)', em: '🪵', price: 0, notSold: true, value: 250, ladder: 'ground', tier: 5, cap: 'XL', waitMin: 2, place: 'ground', learnedNote: 'Ground trap, tier 5. Moose and bears.', release: 'mon' },
  rodTrap: { kind: 'trap', name: 'Rod & worm', em: '🎣', price: 35, value: 35, ladder: 'water', tier: 1, cap: 'S', waitMin: 4, place: 'shore', upgradesTo: 'netTrap', upgradeCost: { kr: 60, scale: 3 }, learnedNote: 'Water trap, tier 1. Set it on a shore: perch fry, crayling, pike fry.', release: 'mon' },
  netTrap: { kind: 'trap', name: 'Fishing net', em: '🥅', price: 80, value: 80, ladder: 'water', tier: 2, cap: 'M', waitMin: 3.5, place: 'shore', upgradesTo: 'crayCage', upgradeCost: { kr: 120, scale: 3 }, learnedNote: 'Water trap, tier 2. Set it on a shore: the reeds. Pike, perch.', release: 'tue' },
  crayCage: { kind: 'trap', name: 'Crayfish cage', em: '🧺', price: 0, notSold: true, value: 120, ladder: 'water', tier: 3, cap: 'M', waitMin: 3, place: 'shore', night: true, upgradesTo: 'longline', upgradeCost: { kr: 180, scale: 5, shell: 3 }, learnedNote: 'Water trap, tier 3. The lake bottom, at night. The crayfish line.', release: 'tue' },
  longline: { kind: 'trap', name: 'Deep longline', em: '🪝', price: 0, notSold: true, value: 180, ladder: 'water', tier: 4, cap: 'L', waitMin: 2.5, place: 'deep', upgradesTo: 'trawl', upgradeCost: { kr: 300, scale: 8, shell: 4 }, learnedNote: 'Water trap, tier 4. Needs deep water: the pier end or a boat.', release: 'tue' },
  trawl: { kind: 'trap', name: 'Trawl', em: '⚓', price: 0, notSold: true, value: 300, ladder: 'water', tier: 5, cap: 'XL', waitMin: 2, place: 'boat', learnedNote: 'Water trap, tier 5. Only from a boat, in the deepest water.', release: 'wed' },
  jamJar: { kind: 'trap', name: 'Jam jar', em: '🍯', price: 20, value: 20, ladder: 'air', tier: 1, cap: 'S', waitMin: 4, place: 'ground', upgradesTo: 'mistNet', upgradeCost: { kr: 60, feather: 3 }, learnedNote: 'Air trap, tier 1. Ladybugs and beetles.', release: 'mon' },
  mistNet: { kind: 'trap', name: 'Mist net', em: '🕸️', price: 0, notSold: true, value: 60, ladder: 'air', tier: 2, cap: 'M', waitMin: 3, place: 'ground', upgradesTo: 'lightTrap', upgradeCost: { kr: 100, feather: 4, chitin: 4 }, learnedNote: 'Air trap, tier 2. Crows and eaglets.', release: 'tue' },
  lightTrap: { kind: 'trap', name: 'Light trap', em: '💡', price: 0, notSold: true, value: 100, ladder: 'air', tier: 3, cap: 'L', waitMin: 2.5, place: 'ground', night: true, learnedNote: 'Air trap, tier 3. Only after dark (20:00-06:00): moths.', release: 'tue' },
  saleSign: { kind: 'trap', name: '"70 % off" sign', em: '🏷️', price: 45, lure: 'WIFE', tier: 1, waitMin: 4, catchBonus: .3, learnedNote: 'Attracts wives.', release: 'tue' },
  samples: { kind: 'trap', name: 'Free-sample stand with bubbly', em: '🥂', price: 60, lure: 'WIFE', tier: 2, waitMin: 3, catchBonus: .5, learnedNote: 'Attracts wives. They stay longer.', release: 'wed' },
  mythicTrap: { kind: 'trap', name: 'Mythic Trap', em: '🔱', price: 0, lure: 'MYTHIC', tier: 3, waitMin: 2, catchBonus: 1, spawn: 'wraith', notSold: true, learnedNote: 'The only thing that holds the Wraith.', release: 'wed' },
  // ---- bait (put one in a trap when you place it; the right bait lifts the odds) and drugs as bait: see tuning.TRAP ----
  worms: { kind: 'bait', name: 'Worms', em: '🪱', price: 4, learnedNote: 'Bait: fish and toads.', release: 'mon' },
  cheese: { kind: 'bait', name: 'Cheese', em: '🧀', price: 4, learnedNote: 'Bait: mice and rats.', release: 'mon' },
  honey: { kind: 'bait', name: 'Honey', em: '🍯', price: 8, learnedNote: 'Bait: badgers and bears.', release: 'mon' },
  nuts: { kind: 'bait', name: 'Nuts', em: '🥜', price: 5, learnedNote: 'Bait: squirrels, hares and tortoises.', release: 'mon' },
  salt: { kind: 'bait', name: 'Salt lick', em: '🧂', price: 6, learnedNote: 'Bait: deer and moose.', release: 'mon' },
  meat: { kind: 'bait', name: 'Meat scraps', em: '🥩', price: 5, learnedNote: 'Bait: foxes, adders, boars, eagles, lynx.', release: 'mon' },
  jam: { kind: 'bait', name: 'Jam', em: '🍓', price: 5, learnedNote: 'Bait: ladybugs, beetles, roaches, moths, hedgehogs.', release: 'mon' },
  bread: { kind: 'bait', name: 'Bread', em: '🍞', price: 3, learnedNote: 'Bait: crows.', release: 'mon' },
  // ---- materials: dropped when you Finish off a creature. Spend them on trap upgrades at Trapper Tore ----
  fur: { kind: 'material', name: 'Fur', em: '🧶', notSold: true, learnedNote: 'From fur-bearers. Trap upgrades.', release: 'mon' },
  feather: { kind: 'material', name: 'Feather', em: '🪶', notSold: true, learnedNote: 'From birds. Trap upgrades.', release: 'mon' },
  scale: { kind: 'material', name: 'Scale', em: '🐟', notSold: true, learnedNote: 'From fish and snakes. Trap upgrades.', release: 'mon' },
  chitin: { kind: 'material', name: 'Chitin', em: '🪲', notSold: true, learnedNote: 'From bugs. Trap upgrades.', release: 'mon' },
  shell: { kind: 'material', name: 'Shell', em: '🐚', notSold: true, learnedNote: 'From shells and crabs. Trap upgrades.', release: 'mon' },
  antler: { kind: 'material', name: 'Antler', em: '🦌', notSold: true, learnedNote: 'From deer and moose. Trap upgrades.', release: 'mon' },
  faltboken: { kind: 'key', name: 'Fältboken', em: '📕', notSold: true, learnedNote: 'Coffee-stained, weed-stained. Notes about every animal in the margins.', release: 'mon' },
  // lures: use on the map for 60 s; also what the dead like at the cemetery
  buns: { kind: 'lure', name: 'Free cinnamon buns', em: '🥐', price: 15, lure: 'BUNS', use: [{ type: 'attract', value: 'FANG', duration: 60 }], learnedNote: 'FANG animals come running for 60 s. Everyone loves buns.', release: 'tue' },
  furniture: { kind: 'lure', name: '"Furniture 70 % off" flyer', em: '🛋️', price: 20, lure: 'WIFE', use: [{ type: 'attract', value: 'WIFE', duration: 60 }], learnedNote: 'A wife shows up. Fast.', release: 'tue' },
  beer6: { kind: 'lure', name: 'Six-pack', em: '🍻', price: 60, lure: 'HERO', use: [{ type: 'attract', value: 'HERO', duration: 60 }], learnedNote: 'A hero smells it from across the parking lot.', release: 'tue' },
  // weapon: the tranquilizer gun (in the Throw menu). upgradesTo + cost = buy the next tier at the same shop
  tranq: { requires: 'know:tranq', kind: 'weapon', name: 'Tranquilizer gun', em: '🔫', price: 120, hit: .7, throw: [{ type: 'sleep', turns: 2 }], upgradesTo: 'tranqDarts', learnedNote: 'Puts them to sleep for 2 turns.', release: 'mon' },
  tranqDarts: { kind: 'weapon', name: 'Tranq gun + heavy darts', em: '🔫', price: 0, upgradeCost: 150, hit: .7, throw: [{ type: 'sleep', turns: 3 }, { type: 'catchBonus', value: .2, turns: 3 }], upgradesTo: 'tranqScope', notSold: true, learnedNote: 'Sleeps 3 turns. Easier to catch.', release: 'mon' },
  tranqScope: { kind: 'weapon', name: 'Tranq gun + darts + scope', em: '🎯', price: 0, upgradeCost: 220, hit: 1, throw: [{ type: 'sleep', turns: 3 }, { type: 'catchBonus', value: .3, turns: 3 }], notSold: true, learnedNote: 'Never misses.', release: 'mon' },
  // drugs and drinks: use = on you; throw = on the opponent. Drinks count towards the blur.
  folkol: { kind: 'drug', name: 'Folköl', em: '🍺', price: 10, drink: true, use: [{ type: 'stat', value: { spd: 1 }, duration: 60 }], lureMul: 1.25, learnedNote: '+SPD a little.', release: 'mon' },
  lager: { kind: 'drug', name: 'Lager', em: '🍺', price: 20, drink: true, use: [{ type: 'stat', value: { atk: 1 }, duration: 60 }], lureMul: 1.5, learnedNote: '+ATK.', release: 'mon' },
  ipa: { kind: 'drug', name: 'IPA', em: '🍻', price: 30, drink: true, use: [{ type: 'stat', value: { atk: 2, acc: -.15 }, duration: 60 }], lureMul: 1.5, good: 'FANG', learnedNote: '+ATK ++, −accuracy.', release: 'mon' },
  gt: { kind: 'drug', name: 'Gin & tonic', em: '🍸', price: 35, drink: true, use: [{ type: 'stat', value: { spd: 1 }, duration: 60 }, { type: 'cure' }], lureMul: 1.5, good: 'WING', learnedNote: '+SPD, clears your head.', release: 'mon' },
  whisky: { kind: 'drug', name: 'Whisky', em: '🥃', price: 50, drink: true, use: [{ type: 'stat', value: { def: 1 }, duration: 60 }, { type: 'guard', duration: 60 }], lureMul: 2, learnedNote: '+DEF, immune to guilt.', release: 'mon' },
  glogg: { kind: 'drug', name: 'Glögg', em: '🍷', price: 25, drink: true, use: [{ type: 'heal', value: .3 }, { type: 'stat', value: { atk: 1, acc: -.12 }, duration: 60 }], lureMul: 1.5, good: 'STONE', learnedNote: 'Heals 30 %. Brave, but worse aim.', release: 'mon' },
  snaps: { kind: 'drug', feed: true, name: 'Snaps', em: '🥂', price: 40, drink: true, use: [{ type: 'stat', value: { crit: 1 }, duration: 60 }, { type: 'say', value: '🎶 "Helan går, sjung hopp faderallan lallan lej!"' }], lureMul: 0, learnedNote: '+crit. You sing.', release: 'mon' },
  fizztab: { kind: 'drug', name: 'Fizz tablet', em: '💊', price: 15, use: [{ type: 'heal', value: .5 }], learnedNote: 'Heals 50 %.', release: 'mon' },
  burger: { kind: 'drug', name: 'IRON Burger', em: '🍔', price: 40, use: [{ type: 'stat', value: { atk: 1 }, duration: 60 }], learnedNote: '+ATK for 60 s.', release: 'mon' },
  kebabpizza: { kind: 'drug', name: 'Kebab pizza', em: '🍕', price: 45, use: [{ type: 'heal', value: .3 }, { type: 'stat', value: { def: 1 }, duration: 60 }], learnedNote: 'Heals 30 % and +DEF.', release: 'mon' },
  sushi: { kind: 'drug', name: 'Salmon roll', em: '🍣', price: 50, use: [{ type: 'stat', value: { spd: 1 }, duration: 60 }], learnedNote: '+SPD for 60 s.', release: 'mon' },
  snus: { kind: 'drug', name: 'Snus', em: '🫙', price: 20, use: [{ type: 'stat', value: { atk: 1, def: 1 }, duration: 90 }], throw: [{ type: 'stat', value: { atk: -1 }, turns: 3 }], learnedNote: 'Small buff. Lasts a while.', release: 'mon' },
  coke: { kind: 'drug', feed: true, name: 'Coke', em: '❄️', price: 0, use: [{ type: 'speed', value: 1, duration: 60, stacks: true, maxStacks: 3, onOverdose: { type: 'heartAttack' } }], throw: [{ type: 'stat', value: { spd: 2, atk: 1 }, turns: 3 }], train: [{ type: 'xpRate', value: 1, duration: 600, stacks: true, maxStacks: 3, onOverdose: { type: 'heartAttack' } }], learnedNote: 'Everything is faster. Your heart disagrees after 3.', release: 'mon' },
  weed: { kind: 'drug', feed: true, name: 'Weed', em: '🌿', price: 0, use: [{ type: 'speed', value: -.4, duration: 60 }, { type: 'catchBonus', value: .4, duration: 60 }, { type: 'attract', value: 'ROOT', duration: 60 }], throw: [{ type: 'sleep', turns: 2 }], learnedNote: 'Slow-mo, easier catches, ROOT animals get curious. Thrown: they fall asleep.', release: 'mon' },
  shrooms: { kind: 'drug', feed: true, name: 'Magic mushrooms', em: '🍄', price: 0, use: [{ type: 'reveal', duration: 90 }, { type: 'tint', value: 'rainbow', duration: 90 }], throw: [{ type: 'confuse', turns: 3 }], learnedNote: 'You see things that were always there.', release: 'tue' },
  protein: { kind: 'drug', name: 'Protein shake', em: '🥤', price: 35, use: [{ type: 'heal', value: .2 }], train: [{ type: 'xpRate', value: 1, duration: 1800 }], learnedNote: 'Gym creatures train twice as fast.', release: 'tue' },
  // ---- feedable drugs: Bag → Use → pick the drug → pick a creature (or yourself). Right drug + right creature + level = a drug form. Each feeding can cause a bad trip (see trips). ----
  xanax: { kind: 'drug', feed: true, name: 'Xanax', em: '💊', price: 45, requires: 'xanaxRx', use: [{ type: 'speed', value: -.3, duration: 60 }, { type: 'guard', duration: 60 }], learnedNote: 'Everything is fine. Fine is a verb.', release: 'tue' },
  molly: { kind: 'drug', feed: true, name: 'Molly', em: '💖', price: 70, use: [{ type: 'heal', value: .2 }, { type: 'tint', value: '#ff7ac8', duration: 60 }, { type: 'catchBonus', value: .3, duration: 60 }], learnedNote: 'You love everyone. Creatures can tell.', release: 'tue' },
  keta: { kind: 'drug', feed: true, name: 'Ketamine', em: '🧪', price: 70, use: [{ type: 'speed', value: -.5, duration: 45 }, { type: 'tint', value: '#7a8cff', duration: 45 }], learnedNote: 'You are very still. The floor is very far away.', release: 'tue' },
  lsd: { kind: 'drug', feed: true, name: 'LSD', em: '🌈', price: 0, notSold: true, use: [{ type: 'reveal', duration: 90 }, { type: 'tint', value: 'rainbow', duration: 90 }], learnedNote: 'You see things that were always there. Now with colours.', release: 'tue' },
  speed: { kind: 'drug', feed: true, name: 'Speed', em: '⚡', price: 60, use: [{ type: 'speed', value: .6, duration: 60, stacks: true, maxStacks: 4, onOverdose: { type: 'heartAttack' } }], learnedNote: 'Faster. A lot faster. Your heart agrees, then does not.', release: 'tue' },
  meth: { kind: 'drug', feed: true, name: 'Meth', em: '💎', price: 0, notSold: true, use: [{ type: 'speed', value: 1.2, duration: 60, stacks: true, maxStacks: 2, onOverdose: { type: 'heartAttack' } }, { type: 'stat', value: { atk: 2, def: -1 }, duration: 60 }], learnedNote: 'The lamp is looking at you. Do not look back.', release: 'wed' },
  dmt: { kind: 'drug', feed: true, name: 'DMT', em: '🌀', price: 0, notSold: true, use: [{ type: 'reveal', duration: 60 }, { type: 'tint', value: 'rainbow', duration: 60 }, { type: 'confuse', duration: 30 }], learnedNote: 'Eight minutes. Machine elves. They say hi.', release: 'wed' },
  // fishing: the net holds a wild creature for 2 turns
  net: { kind: 'throwable', name: 'Fishing net', em: '🕸️', price: 25, hit: .85, throw: [{ type: 'stun', turns: 2 }, { type: 'catchBonus', value: .2, turns: 2 }], learnedNote: 'Holds it still for two turns.', release: 'tue' },
  // key items
  stache: { kind: 'key', name: 'Moustache trim', em: '✂️', price: 20, cosmetic: true, learnedNote: 'Magnificent. Purely cosmetic.', release: 'mon' },
  bitcoin: { kind: 'key', name: 'Bitcoin (physical)', em: '🪙', notSold: true, learnedNote: 'Somebody would love this on a grave.', release: 'wed' },
  parcel: { kind: 'key', name: 'Suspicious parcel', em: '📦', notSold: true, learnedNote: 'It ticks. Probably just a clock.', release: 'tue' },
  fuse: { kind: 'key', name: 'Fuse', em: '🔌', notSold: true, learnedNote: 'Old, ceramic, important.', release: 'tue' },
  glowstick: { kind: 'key', name: 'Glow stick', em: '🟢', notSold: true, learnedNote: 'Glows. Loudly.', release: 'tue' },
  // shopping list (8 random per new game), zone = where it lies
  milk: { kind: 'key', list: true, name: 'Milk', em: '🥛', zone: 'freezer' }, kaviar: { kind: 'key', list: true, name: 'Kalles kaviar', em: '🐟', zone: 'fruit' },
  falukorv: { kind: 'key', list: true, name: 'Falukorv', em: '🌭', zone: 'fruit' }, crisp: { kind: 'key', list: true, name: 'Crispbread', em: '🫓', zone: 'bakery' },
  cbuns: { kind: 'key', list: true, name: 'Cinnamon buns', em: '🥐', zone: 'bakery' }, snuslist: { kind: 'key', list: true, name: 'Snus (for Löken)', em: '🫙', zone: 'checkout' },
  chips: { kind: 'key', list: true, name: 'Chips & dip', em: '🥔', zone: 'pickmix' }, fpizza: { kind: 'key', list: true, name: 'Frozen pizza', em: '🍕', zone: 'freezer' },
  tp: { kind: 'key', list: true, name: 'Toilet paper', em: '🧻', zone: 'selfcheck' }, batt: { kind: 'key', list: true, name: 'Batteries', em: '🔋', zone: 'selfcheck' },
  oat: { kind: 'key', list: true, name: 'Oat milk', em: '🌾', zone: 'freezer' }, candy: { kind: 'key', list: true, name: 'Pick-and-mix', em: '🍬', zone: 'pickmix' }
},

/* ---------- phone apps (bag → 📱). lines = one is shown at random; {vars} come from the game: {steps} {price} {name} {kr} {debt}
   use = effects when you open it (kr, promiseDebt…). gate: 'door' = BankID must approve doors marked bankid ---------- */
phone: { battery: 4, wallpaper: ['#16264a', '#5a2064'], storeTitle: 'Appbutiken', storeLine: 'Download things you did not need. 100 % ad-free. 0 % useful.' },
apps: {
  tibber: { color: '#1f6feb', name: 'Tibber', icon: '⚡', lines: ['Electricity right now: {price} kr/kWh.\nWizcudi has been notified.', 'Price spike! {price} kr/kWh.\nTip: turn off the sun.', 'Your fridge used 14 kr while you read this.'], release: 'mon' },
  swish: { color: '#16a34a', name: 'Swish', icon: '💸', lines: ['You swished 10 kr to {name}.\nYou meant to swish Löken.', 'Payment sent to {name}.\nMessage: "pizza"', '{name} received 10 kr.\nNobody knows why.'], use: [{ type: 'kr', value: -10 }], release: 'mon' },
  bankid: { color: '#0b3d5c', name: 'BankID', icon: '🆔', lines: ['Open BankID on your other device.\nYou do not have another device.', 'Identification approved.\nDoors marked 🆔 open for you now.'], gate: 'door', release: 'wed' },
  strava: { color: '#fc4c02', name: 'Strava', icon: '🏃', lines: ['Today: {steps} steps inside ICA Maxi.\nNew personal record: aisle 4.', '{steps} steps. Kudos from: nobody.'], release: 'wed' },
  klarna: { color: '#ff8fb5', name: 'Klarna', icon: '🩷', lines: ['Buy now, pay later!\n+200 kr. Promise debt: {debt}.', 'Smoooth. +200 kr. You promised to pay. Again.'], use: [{ type: 'kr', value: 200 }, { type: 'promiseDebt', value: 1 }], once: 3, cooldownMin: 10, release: 'wed' },
  /* --- on the phone from the start --- */
  lens: { name: 'Faunalens', icon: '📷', color: '#e11d48', release: 'mon', store: { price: 0, blurb: 'AI scans every animal you catch.' }, lines: ['Faunalens is active. It will scan the animals you catch.', 'Point at an animal. Or a Löken. The AI is not sure which is which.'] },
  dex: { custom: true, name: 'Faunadex', icon: '🔍', color: '#0891b2', release: 'mon', store: { price: 0, needs: 'lens', blurb: 'Every animal you meet. With margin notes.' } },
  store: { appstore: true, name: 'Appbutiken', icon: '🛍️', color: '#7c3aed', release: 'mon' },
  messages: { widget: 'messages', name: 'Messages', icon: '💬', color: '#22a559', release: 'mon', from: ['Löken', 'Wizcudi', 'Jrohn', 'BigWman', 'Ljunky'],
    pool: ['who has the van keys', 'Is Maxi open? Asking for a friend.', 'I found a pike. It found me back.', 'DO NOT eat the red ones', 'ok but who is Kenny', 'Did anyone feed the badger?', 'sent from my fridge', 'brb, hiding from Berit', 'Löken: gym at 6. Nobody asked.', 'LAN at 20:00. Bring snacks. And a creature.', 'who put a shoebox in the parking lot', 'my wife says hi. she is behind me.'],
    replies: [{ label: 'On my way', answer: 'No you are not.' }, { label: '👍', answer: 'That is not a sentence.' }, { label: 'Wait, what?', answer: 'Exactly. Welcome.' }] },
  weather: { widget: 'weather', name: 'SMHI', title: 'SMHI Väder', icon: '⛅', color: '#0ea5e9', release: 'mon', icons: ['🌧️', '⛅', '☀️', '❄️', '🌫️'],
    lines: ['Rain. Or snow. Or both. It is Sweden.', 'Light breeze from the left. Strong opinions from the right.', 'Perfect weather to stay in the van.', 'Fog over the lake. Probably a creature. Probably.', 'Warning class 1: you are outside.'] },
  torch: { widget: 'torch', name: 'Flashlight', icon: '🔦', color: '#eab308', release: 'mon', on: ['It is a flashlight. It is on.', 'Bright. Nothing in the parking lot got better.', 'You can see clearly now. It is worse.'], off: ['Off. Very dark. Very on-brand.', 'The flashlight rests.', 'Tap ON. It is not complicated.'] },
  camera: { widget: 'camera', name: 'Camera', icon: '📷', color: '#475569', release: 'mon', hint: 'Say cheese. Or "Maxi".', captions: ['Selfie saved. You look tired.', 'Nice one. Your thumb is in it.', 'Saved to the cloud. The cloud is Löken.', 'You blinked.', 'A blurry creature is in the background. Lucky you.'] },
  /* --- download them in the Appbutiken --- */
  calc: { widget: 'calc', name: 'Calculator', icon: '🧮', color: '#f08a24', release: 'mon', store: { price: 0, blurb: 'Does maths. Mostly.' }, easter: { '42': 'The answer.', '69': 'Nice.', '1337': 'LEET.', '420': 'Löken noticed.', '8008': 'Grow up.', 'Ask Löken': 'Division by zero. Löken is busy.' } },
  compass: { widget: 'compass', name: 'Kompass', icon: '🧭', color: '#0f766e', release: 'mon', label: 'Points to: The Box (Löken, probably flexing)', store: { price: 0, blurb: 'Always points at the gym. Useless. Reliable.' } },
  eight: { widget: 'eight', name: 'Fråga Björn', icon: '🎱', color: '#312e81', release: 'mon', store: { price: 5, blurb: 'A wise bear answers yes/no questions.' },
    answers: ['Yes. Obviously.', 'No. Ask Löken.', 'Maybe. Have a snack.', 'Björn is on a break.', 'Definitely. Do not tell Berit.', 'Skål.', 'Ask your wife.', 'Absolutely not. Do it anyway.'] },
  fart: { widget: 'fart', name: 'Pruttis', icon: '💨', color: '#a16207', release: 'mon', store: { price: 10, blurb: 'Four premium sounds. Rated 4.9 by nobody.' },
    sounds: [{ label: 'Classic', f: 260, len: .25 }, { label: 'The long one', f: 140, len: .7 }, { label: 'Squeaker', f: 520, len: .15 }, { label: 'Löken (deep)', f: 80, len: .9 }] },
  hemnet: { widget: 'hemnet', name: 'Hemnet', icon: '🏠', color: '#16a34a', release: 'mon', store: { price: 0, blurb: 'What is your van worth today?' }, lines: ['Charming. Needs love. And a roof.', 'Great light. In the bad way.', 'Walking distance to a Maxi. Because it is in a Maxi parking lot.', 'Viewing tomorrow. Bring wellies.'] }

},

/* ---------- NPCs: one entry each. role: talker | merchant | trainer | gym | dealer | filler
   look = paper-doll spec. area = [x, y, w, h] tiles they wander in (none = stand still).
   lines: pool = random line; when = [{ flag, text }] (first matching flag wins); gossip: true mixes in hero gossip.
   shop = item ids sold here. party = [[creature, level]] for trainers. canDie / catchable / epitaph / likes. ---------- */
npcs: {
  pirate: { name: 'Parking-lot Pirate', role: 'talker', at: [7, 62], area: [6, 61, 5, 3], gossip: true, canDie: true, catchable: true, likes: 'buns', epitaph: 'Arr. Parked forever.',
    look: { hair: '#1a1a1a', style: 'hat', beard: '#1a1a1a', patch: 1, top: '#7a2a2a', legs: '#3a2a1a' }, release: 'mon',
    lines: { pool: ['Arr. The van smells of Löken\'s gym bag.', 'I saw a pike with a crown. Swear on me parrot.', 'Something tall glows on the lawn when ye\'ve had the mushrooms.'], when: [{ flag: 'dead:loken', text: 'Arr… the lawn be quiet without Löken.' }] } },
  berit: { name: 'Bagging-area Berit', role: 'merchant', at: [5, 44], area: [2, 43, 9, 3], gossip: true, canDie: true, catchable: true, likes: 'buns', epitaph: 'Unexpected item in the grave area.',
    look: { skin: '#f0c8a8', hair: '#d8d8d8', style: 'bob', top: '#d8312f', legs: '#2a2a33' }, shop: ['bag', 'surstromming', 'banana', 'snus'], release: 'mon',
    lines: { pool: ['Unexpected item in bagging area. Unexpected YOU.', 'Bags are 10 kr. Souls are extra.'] } },
  pelle: { name: 'Bottle-return Pelle', role: 'talker', at: [37, 33], area: [35, 33, 8, 2], gossip: true, canDie: true, catchable: true, likes: 'buns', epitaph: 'Returned his last bottle.',
    look: { hair: '#8a6a4a', style: 'short', beard: '#9a9a9a', top: '#2e7d32', prop: 'bag' }, release: 'mon',
    lines: { pool: ['The machines make a funny noise. Like someone is breathing behind them.', 'One krona per can. I have three million cans.'] } },
  freja: { name: 'Freezer Freja', role: 'merchant', at: [15, 34], area: [14, 34, 7, 1], gossip: true, canDie: true, catchable: true, likes: 'meatballs', epitaph: 'Finally warm.',
    look: { skin: '#f0c8a8', hair: '#e8c46a', style: 'long', top: '#4fc3f7', legs: '#3d5f92' }, shop: ['meatballs', 'jam'], release: 'mon',
    lines: { pool: ['Rats love it when you leave the freezer door open. Or hate it. I forget.'] } },
  hasse: { name: 'Hallucinating Hasse', role: 'talker', at: [16, 13], area: [13, 10, 10, 5], gossip: true, canDie: true, catchable: true, likes: 'shrooms', epitaph: 'Can finally smell purple.',
    look: { hair: '#aa7744', style: 'messy', top: '#c06bd6', top2: '#ffd23a', topStyle: 'stripe', legs: '#3d5f92' }, release: 'mon',
    lines: { pool: ['Can you smell purple?', 'The receipt in aisle 4 is fourteen metres long and it LOOKED at me.', 'Mushrooms? Ask the guy who hides behind the bottle machines. Didn\'t hear it from me.'] } },
  barber: { name: 'The Barber', role: 'merchant', at: [38, 68], area: [35, 66, 10, 3], canDie: true, catchable: true, likes: 'stache', epitaph: 'Took a little off the top. All of it.',
    look: { hair: '#1a1a1a', style: 'short', stache: 1, top: '#f4f4f4', prop: 'apron' }, shop: ['tranq', 'stache'], release: 'mon',
    lines: { pool: ['Trim? Gossip? A tranquilizer gun? Don\'t ask why I have one.'] } },
  jonas: { name: 'Hardware Jonas', role: 'merchant', at: [10, 57], area: [9, 56, 3, 2], canDie: true, catchable: true, likes: 'rock', epitaph: 'Always had the right tool. Except this time.',
    look: { hair: '#3a2a1a', style: 'cap', cap: '#e3000f', cap2: '#fff', top: '#2a2a33', legs: '#5a4a30' }, shop: ['rock', 'bottle', 'mouseTrap', 'jamJar', 'rodTrap', 'cheese', 'nuts', 'jam', 'bread', 'meat'], release: 'mon',
    lines: { pool: ['Traps work while you sleep. Like me.', 'Put it where the creatures walk. Come back later.'] } },
  fia: { name: 'Flower Fia', role: 'merchant', at: [29, 37], area: [28, 35, 2, 3], canDie: true, catchable: true, likes: 'WIFE', epitaph: 'Pushing up her own daisies.',
    look: { skin: '#f0c8a8', hair: '#a0522d', style: 'long', top: '#5fae3e', legs: '#34343c', prop: 'bouquet' }, shop: ['bouquet', 'glitter', 'giftcard', 'ringbox', 'chores', 'saleSign', 'furniture', 'samples'], release: 'mon',
    lines: { pool: ['Flowers solve everything. Except chlorine flowers. Those make it worse.', 'Never give a wife a chore chart. Trust me.'] } },
  system: { name: 'Systembolaget cashier', role: 'merchant', at: [42, 29], canDie: false, look: { hair: '#5a3a22', style: 'bob', top: '#0a6e3a' }, shop: ['folkol', 'lager', 'ipa', 'gt', 'whisky', 'glogg', 'snaps', 'beer6'], release: 'mon',
    lines: { pool: ['ID, please. …You look 47. Go ahead.'] } },
  apotek: { name: 'Pharmacist', role: 'merchant', at: [40, 37], canDie: false, heal: true, look: { skin: '#f0c8a8', hair: '#3a2a1a', style: 'short', glasses: 1, top: '#f4f4f4' }, shop: ['fizztab', 'xanax'], release: 'mon',
    lines: { pool: ['Everyone is fully healed. Take care out there.'] } },
  burgercook: { name: 'IRON Burger cook', role: 'merchant', at: [6, 71], canDie: true, likes: 'buns', epitaph: 'Well done. Finally.', look: { hair: '#222', style: 'cap', cap: '#222', cap2: '#f39c34', top: '#f4f4f4' }, shop: ['burger'], release: 'mon', lines: { pool: ['Om nom.'] } },
  pizzaiolo: { name: 'Pizzeria Berga', role: 'merchant', at: [17, 71], canDie: true, likes: 'buns', epitaph: 'Extra sauce, extra dead.', look: { hair: '#2a1a10', style: 'short', stache: 1, top: '#f4f4f4' }, shop: ['kebabpizza'], release: 'mon', lines: { pool: ['Kebab pizza. The national dish.'] } },
  sushichef: { name: 'J&K99 Sushi chef', role: 'merchant', at: [28, 71], canDie: true, likes: 'sushi', epitaph: 'Rolled away.', look: { hair: '#111', style: 'short', top: '#1c2a36' }, shop: ['sushi'], release: 'mon', lines: { pool: ['Fresh today. Probably.'] } },
  dealer: { name: 'Guy behind the bottle machines', role: 'dealer', at: [46, 34], canDie: true, catchable: false, likes: 'buns', epitaph: 'Out of stock.', hidden: true,
    look: { skin: '#d8b090', hair: '#1a1a1a', style: 'hat', top: '#2a2a33', legs: '#111', glasses: 1 }, release: 'mon',
    lines: { pool: ['Psst. You didn\'t see me.', 'Cash is for tourists. I take creatures.'] } },
  kenta: { name: 'Coach Kenta', role: 'gym', at: [43, 15], canDie: true, catchable: true, likes: 'protein', epitaph: 'Did one more rep.',
    look: { skin: '#d9a07a', hair: '#222', style: 'short', top: '#e3000f', legs: '#111', big: 1 }, party: [['bear', 9], ['boar', 10], ['fox', 11]], shop: ['protein'], release: 'mon',
    lines: { pool: ['Three, two, one, GO! …Why are you not going?', 'Leave your creatures on the WOD board. They come back stronger.'], when: [{ flag: 'gymOpen', text: 'The board is open. Drop your creatures, pick them up later.' }] } },
  trainer1: { name: 'Protein Patrik', role: 'trainer', at: [39, 14], canDie: true, catchable: true, likes: 'protein', epitaph: 'Skipped leg day. Permanently.',
    look: { skin: '#e0a882', hair: '#d8b060', style: 'short', top: '#f7931a', legs: '#2a2a33', big: 1 }, party: [['bear', 8], ['cockroach', 8]], release: 'mon',
    lines: { pool: ['Do you even lift, bro?', 'Protein shake? I have nine.'] } },
  trainer2: { name: 'Kettlebell Kim', role: 'trainer', at: [44, 11], canDie: true, catchable: true, likes: 'protein', epitaph: 'Swung too hard.',
    look: { skin: '#f0c8a8', hair: '#1a1a1a', style: 'bob', top: '#3ddc84', legs: '#111' }, party: [['boar', 9], ['crow', 8]], release: 'mon',
    lines: { pool: ['WOD of the day: catch 20 creatures, for time.'] } },
  aiLjunky: { name: 'AI-Ljunky', role: 'trainer', at: [44, 12], canDie: true, catchable: true, likes: 'bitcoin', epitaph: 'SEGMENTATION FAULT (core dumped).',
    look: { skin: '#b8c4d0', hair: '#3dff8a', style: 'short', top: '#2a0a3a', legs: '#111', glasses: 1, prop: 'bow' }, party: [['wraith', 18], ['methmoth', 19], ['ketacrow', 19], ['cokeroach', 20]], partyFallback: ['fox', 18], release: 'tue', requires: 'ljunkyDone', robot: true,
    lines: { pool: ['HELLO. I AM LJUNKY. VERSION 2.0. NOW WITH 40 % MORE DIP.', 'ERROR: FEELINGS.EXE NOT FOUND. FIGHT? Y/N', 'I HAVE TRAINED ON 10,000 HOURS OF LJUNKY EXPLAINING CRYPTO. YOU CANNOT WIN.'] },
    win: 'REBOOTING… I… LOVE… THIS… GYM.' },
  caddy: { name: 'Caddy Calle', role: 'talker', at: [60, 24], area: [58, 23, 6, 4], canDie: true, catchable: true, likes: 'beer6', epitaph: 'Found the water hazard.',
    look: { hair: '#8a6a4a', style: 'cap', cap: '#fbf6e8', cap2: '#3ddc84', top: '#fbf6e8', legs: '#5a7a3a', glasses: 1 }, release: 'tue', lines: { pool: ['Fore!'] } },
  kioskman: { name: 'Kiosk-Klas', role: 'merchant', at: [117, 35], canDie: true, catchable: true, likes: 'snus', epitaph: 'Closed for good.',
    look: { hair: '#222', style: 'short', stache: 1, top: '#e3000f', legs: '#34343c', prop: 'bag' }, shop: ['folkol', 'snus', 'fizztab', 'net'], release: 'tue', lines: { pool: ['Open 24 hours. Closed 24 hours. Depends.'] } },
  hermit: { name: 'Hermit Hilding', role: 'talker', at: [70, 62], area: [66, 58, 8, 6], canDie: true, catchable: true, likes: 'shrooms', epitaph: 'Finally alone.',
    look: { hair: '#c9c9c9', style: 'messy', beard: '#c9c9c9', top: '#4f6e3a', legs: '#5a4a30' }, release: 'tue', lines: { pool: ['Trees.'] } },
  guide: { name: 'Mountain guide Greta', role: 'talker', at: [121, 33], area: [119, 32, 4, 3], canDie: true, catchable: true, likes: 'protein', epitaph: 'Slipped on the way up.',
    look: { skin: '#f0c8a8', hair: '#a0522d', style: 'long', top: '#e3000f', topStyle: 'stripe', top2: '#fbf6e8', legs: '#3d5f92' }, release: 'tue', lines: { pool: ['Rocks.'] } },
  doorman: { name: 'Doorman Dragan', role: 'merchant', shop: ['molly', 'speed', 'keta'], at: [143, 59], area: [141, 58, 6, 2], canDie: true, catchable: true, likes: 'coke', epitaph: 'Not tonight. Not ever.',
    look: { skin: '#d9a07a', hair: '#111', style: 'bald', top: '#111', legs: '#111', glasses: 1, big: 1 }, release: 'tue', lines: { pool: ['Not tonight.'] } },
  folke: { name: 'Fisherman Folke', role: 'merchant', at: [72, 19], area: [68, 18, 8, 2], canDie: true, catchable: true, likes: 'worms', epitaph: 'The big one got away. And back.',
    look: { hair: '#8a6a4a', style: 'hat', beard: '#8a6a4a', top: '#2f6fd0', legs: '#3a2a1a', prop: 'bag' }, shop: ['net', 'netTrap', 'worms'], release: 'tue', lines: { pool: ['Fish.'] } },
  bengt: { name: 'Boat-Bengt', role: 'boatman', at: [58, 19], requires: 'know:boat', canDie: true, catchable: true, likes: 'buns', epitaph: 'Sank with dignity.',
    look: { hair: '#222', style: 'cap', cap: '#fbf6e8', cap2: '#1F2A44', beard: '#222', top: '#1F2A44', legs: '#fbf6e8', glasses: 1 }, release: 'wed', lines: { pool: ['Boats.'] } },
  nisse: { name: 'Night-watch Nisse', role: 'talker', at: [12, 57], area: [10, 56, 8, 3], show: { night: true }, canDie: true, catchable: true, likes: 'coke', epitaph: 'Off duty.',
    look: { hair: '#555', style: 'cap', cap: '#1F2A44', cap2: '#ffd23a', top: '#1F2A44', legs: '#1F2A44', glasses: 1 }, release: 'mon', lines: { pool: ['Night.'] } },
  market: { name: 'Market-Maud', role: 'merchant', at: [24, 56], area: [22, 55, 5, 3], show: { day: 'tue' }, priceMul: .5, canDie: true, catchable: true, likes: 'buns', epitaph: 'Everything must go. She did.',
    look: { skin: '#f0c8a8', hair: '#d8d8d8', style: 'bob', top: '#ff6b9a', legs: '#34343c', prop: 'bag' }, shop: ['bottle', 'rock', 'meatballs', 'banana', 'net'], release: 'tue', lines: { pool: ['Half price.'] } },
  kenny: { name: 'Kenny the Fence', role: 'fence', at: [46, 62], canDie: true, catchable: true, likes: 'snus', epitaph: 'Fenced in. Finally.',
    look: { skin: '#d8b090', hair: '#222', style: 'cap', cap: '#2a2a33', cap2: '#3ddc84', top: '#3a3a44', legs: '#222', stache: 1 }, release: 'mon',
    lines: { pool: ['Psst. I buy animals. No paperwork, no questions, no real money.', 'Creatures? I know a guy in Norrtälje. He knows a guy.'] },
    offer: ['What you got?', 'I pay cash. Not much cash.', 'Market is soft today. Very soft.'], thanks: ['{kr} kr. Pleasure doing business.', 'Here, {kr} kr. Don\'t tell Pelle.', '{kr} kr. Take it or… you already took it.'] },
  tore: { name: 'Trapper Tore', role: 'trapper', at: [50, 58], area: [49, 57, 3, 3], requires: 'know:tore', canDie: true, catchable: true, likes: 'honey', epitaph: 'Caught in his own trap. Fitting.',
    look: { hair: '#6b4226', style: 'cap', cap: '#4f6e3a', cap2: '#2e4424', beard: '#6b4226', top: '#6b5a3a', legs: '#4a3a22', prop: 'bag' }, shop: ['honey', 'salt', 'meat', 'worms', 'cheese'], release: 'tue',
    lines: { pool: ['Traps. Upgrades. Repairs. In that order.'] } },
  ingvar: { name: 'Inkasso-Ingvar', role: 'trainer', at: [0, 0], canDie: false, catchable: false, offMap: true, release: 'wed',
    look: { skin: '#e9b48c', hair: '#666', style: 'short', top: '#1d1d24', top2: '#e8eef3', topStyle: 'blazer', legs: '#1d1d24', glasses: 1, prop: 'clip' },
    lines: { pool: ['Inkasso-Ingvar. You promised. Klarna remembers.'] }, win: 'Fine. I will put a note in your file.' }
},
/* Kenny the Fence pays kronor for creatures: rates[rarity] + level × perLv. Low on purpose */
fence: { rates: { C: 3, U: 6, R: 12, E: 25, L: 40, M: 60 }, perLv: .5 },
/* Inkasso-Ingvar shows up when promise debt reaches every `every` points. Pay `pay` kr or fight his team (levels = your best + lvUp) */
debtCollector: { npc: 'ingvar', every: 3, pay: 250, team: ['boar', 'crow', 'adder'], lvUp: 2 },
/* filler shoppers: generated from names + paper-doll parts. Count per release day. */
fillers: {
  release: 'tue', count: 8, area: [2, 28, 28, 18], canDie: true, catchable: true, likes: 'buns', epitaph: 'Just came in for milk.',
  names: ['Gunnel', 'Bosse', 'Lasse', 'Agneta', 'Pontus', 'Tove', 'Leif', 'Majken', 'Roger', 'Siv', 'Göran', 'Ylva'],
  hair: [['short', '#5a3a22'], ['bob', '#d8d8d8'], ['long', '#e8c46a'], ['messy', '#aa7744'], ['bald', null], ['cap', '#222']],
  tops: ['#d8312f', '#2f6fd0', '#3ddc84', '#f39c34', '#9b6bd6', '#1d1d24', '#f4f4f4'], legs: ['#3d5f92', '#34343c', '#5a4a30'],
  lines: ['I came in for milk in 2019.', 'Is it Tuesday? It feels like Tuesday.', 'The trolleys are unionizing.', "Don't look the self-checkout in the eye.", 'Discount on souls today.'],
  /* every shopper gets one personality and a slice of that personality's lines. No line is ever shared between two shoppers. { if, text } lines work too */
  voices: {
    grumpy:   ['I came in for milk in 2019.', 'Do not talk to me before my coffee. Or after.', 'They moved the crispbread again. They always move it.', { if: { night: true }, text: 'Nobody should be shopping at night. Including me.' }, 'The queue is always the one I did not pick.', 'Prices. Hmph.'],
    gossip:   ['I heard Berit has a thing for the self-checkout.', 'Someone told me the Barber is not really a barber.', 'You did not hear it from me, but Pelle talks to the machines.', { if: { killed: 'berit' }, text: 'They say you did something to Berit. They say a lot of things.' }, 'My cousin knows a guy who knows Löken. Personally.', 'The pizza man is in love. Nobody knows with whom.'],
    paranoid: ['Do not look behind you. Just keep browsing.', 'The freezers hum in a pattern. A pattern!', 'I have counted the cameras. Twelve. There used to be eleven.', { if: { night: true }, text: 'Night is when they replace the stock. Not with stock.' }, 'Is that really a banana? Look at it. Look closely.', 'Whoever is watching the aisles, they are better at it than me.'],
    flirty:   ['Hello there, stranger. Are you here for the apples, or for me?', 'You have nice shoes. Shoes say a lot.', 'I love a man who carries a bag. Especially a carrier bag.', { if: { state: 'drunk' }, text: 'Oh, you have been drinking. How brave.' }, 'Do you come here often? Everybody does. It is the law.', 'Wink wink. That was a wink. I am bad at it.'],
    salesman: ['Today only: three for the price of three!', 'May I interest you in a very reasonable bag?', 'I do not work here, but I will sell you things.', { if: { night: true }, text: 'Night special: the same prices, but darker.' }, 'Buy one, get a feeling.', 'Everything is on sale, if you believe hard enough.'],
    dreamer:  ['Do you ever feel like the cucumbers are watching?', 'I came in for milk and found a purpose. Then I lost both.', 'The aisles go on forever if you stop counting.', { if: { state: 'high' }, text: 'You can see it too. The shimmer on the shelves.' }, 'Sometimes the trolleys whisper in Swedish.', 'I once cried at the sight of a perfect pear.']
  }
},
/* gossip lines about heroes, mixed into talkers with gossip: true */
gossip: {
  bigwman: ['He balanced the national budget with a calculator and a YES.', 'He owes me for 14 packages. The packages owe ME.', 'Why does his Polestar need to be that quiet? What is he sneaking away from?'],
  wizcudi: ['He turned off the sun once. Saved 3 kronor.', "He called me a feeder through the wall. I don't even play.", 'Every lamp in here flickers when he walks by. Coincidence?'],
  jrohn: ['He hugged a zombie and it went vegan.', 'I found a sock in the frozen peas. It said JROHN.', 'Nobody has been down in his basement. Nobody has come UP either.'],
  loken: ['His lawn is so perfect the grass mows itself out of respect.', 'He cut in line at the bottle return. Gently. Loyally. Still rude.', 'Where do all those coins come from? WHERE?'],
  ljunky: ['He caught a vase, a cat and a Bitcoin in mid-air. Same day.', 'He explained crypto to me for two hours. Now I owe him money.', 'He built this place. Look at the corners. Pixels.']
},
nonsense: ['The cucumbers vote AIK.', 'Unexpected item in bagging area. Unexpected YOU.', "I've been in this queue since 2019.", 'Discount on souls today.', 'Can you smell purple?', 'The trolleys are unionizing.', "Don't look the self-checkout in the eye."],

/* ---------- encounter zones (first match wins). r = [x, y, w, h] tiles. enc = [[creature, weight]] (EPIC/needs entries only while revealed) ---------- */
zones: {
  stock: { name: 'ICA stock room', r: [2, 23, 29, 4] },
  fruit: { name: 'Fruit & veg', hab: 'maxi', r: [2, 28, 6, 11], enc: [['rat', 6], ['cockroach', 3], ['ladybug', 1]], lv: [4, 7] },
  pickmix: { name: 'Pick-and-mix', hab: 'maxi', r: [8, 28, 6, 11], enc: [['rat', 4], ['cockroach', 4], ['ladybug', 2]], lv: [4, 7] },
  freezer: { name: 'Freezer aisle', hab: 'maxi', r: [14, 28, 7, 11], enc: [['rat', 5], ['cockroach', 3]], lv: [5, 8] },
  bakery: { name: 'Bakery', hab: 'maxi', r: [21, 28, 6, 11], enc: [['cockroach', 5], ['rat', 4], ['ladybug', 1]], lv: [5, 8] },
  flowers: { name: 'Flower department', hab: 'maxi', r: [27, 28, 4, 11], enc: [['ladybug', 6], ['cockroach', 2], ['rat', 2]], lv: [5, 8] },
  selfcheck: { name: 'Self-checkout', hab: 'maxi', r: [22, 39, 9, 7], enc: [['rat', 4], ['cockroach', 3], ['crow', 1]], lv: [5, 8] },
  checkout: { name: 'Checkouts', hab: 'maxi', r: [2, 39, 20, 7], enc: [['rat', 3], ['cockroach', 3]], lv: [4, 6] },
  system: { name: 'Systembolaget', hab: 'maxi', r: [34, 22, 13, 11], enc: [['crow', 4], ['rat', 3], ['cockroach', 2]], lv: [6, 9] },
  apotek: { name: 'Apotek Hjärtat', hab: 'maxi', r: [34, 35, 13, 10], enc: [['cockroach', 3], ['rat', 3]], lv: [6, 9] },
  burger: { name: 'IRON Burger', hab: 'maxi', r: [1, 65, 11, 9], enc: [['rat', 3], ['cockroach', 3], ['crow', 2]], lv: [6, 9] },
  pizza: { name: 'Pizzeria Berga', hab: 'maxi', r: [12, 65, 11, 9], enc: [['rat', 3], ['cockroach', 3], ['crow', 2]], lv: [6, 9] },
  sushi: { name: 'J&K99 Sushi', hab: 'maxi', r: [23, 65, 11, 9], enc: [['rat', 3], ['cockroach', 2], ['crow', 2]], lv: [6, 9] },
  barber: { name: "Tailor's Barber", hab: 'maxi', r: [34, 65, 13, 9], enc: [['rat', 3], ['cockroach', 3]], lv: [7, 10] },
  charger: { name: 'E.ON charger', hab: 'lot', r: [35, 50, 13, 10], enc: [['crow', 4], ['rat', 3], ['ladybug', 1]], lv: [6, 9], out: 1 },
  box: { name: 'The Box', r: [37, 9, 10, 10], house: 'ljunky' },
  cemetery: { name: 'Cemetery', r: [1, 9, 11, 10], out: 1, release: 'tue' },
  // ---- the bigger world: houses first, then the grass that crosses the roads, then the big areas (first match wins) ----
  estore: { name: 'The electronics store', r: [98, 32, 14, 6], house: 'wizcudi', release: 'tue' },
  cave: { name: 'The shaman cave', r: [134, 22, 14, 8], house: 'jrohn', release: 'tue' },
  castle: { name: 'The castle', r: [131, 4, 20, 9], house: 'loken', release: 'wed' },
  rave: { name: 'The rave', r: [136, 62, 18, 10], house: 'bigwman', release: 'tue', ambient: { tone: 55, vol: .035, nightVol: .09, every: .5, flash: true } },
  grounds: { name: 'The castle grounds', hab: 'castle', r: [126, 2, 30, 15], out: 1, release: 'wed' },
  boxpath: { name: 'The lawn, east side', hab: 'lawn', r: [24, 9, 23, 11], enc: [['crow', 4], ['ladybug', 3], ['rat', 2], ['cockroach', 1]], lv: [8, 11], out: 1 },
  band_s1: { name: 'Roadside grass', hab: 'lawn', r: [52, 46, 4, 5], enc: [['crow', 3], ['rat', 3], ['ladybug', 2]], lv: [11, 14], out: 1, release: 'tue' },
  band_s2: { name: 'Roadside grass', hab: 'golf', r: [72, 46, 4, 5], enc: [['crow', 3], ['rat', 2], ['squirrel', 2], ['beetle', 2]], lv: [14, 17], out: 1, release: 'tue' },
  band_s3: { name: 'City outskirts', hab: 'city', r: [90, 46, 4, 5], enc: [['cockroach', 3], ['rat', 3], ['crow', 2], ['fox', 1]], lv: [17, 20], out: 1, release: 'tue' },
  band_s4: { name: 'City outskirts', hab: 'city', r: [108, 46, 4, 5], enc: [['cockroach', 3], ['rat', 2], ['crow', 2], ['fox', 2], ['methmoth', 1]], lv: [19, 22], out: 1, release: 'tue' },
  band_n1: { name: 'Lakeside grass', hab: 'lawn', r: [52, 19, 4, 4], enc: [['crow', 3], ['ladybug', 3], ['rat', 1]], lv: [11, 14], out: 1, release: 'tue' },
  band_n2: { name: 'Lakeside grass', hab: 'lawn', r: [76, 19, 4, 4], enc: [['crow', 3], ['squirrel', 2], ['ladybug', 2]], lv: [14, 17], out: 1, release: 'tue' },
  band_n3: { name: 'Lakeside grass', hab: 'lawn', r: [100, 19, 4, 4], enc: [['squirrel', 3], ['crow', 2], ['beetle', 2]], lv: [17, 20], out: 1, release: 'tue' },
  foothills: { name: 'The foothills', hab: 'mountain', r: [124, 29, 4, 4], enc: [['hare', 3], ['adder', 3], ['crow', 2]], lv: [24, 28], out: 1, release: 'tue' },
  mtrail: { name: 'The mountain trail', hab: 'mountain', r: [130, 29, 4, 4], enc: [['adder', 3], ['hare', 3], ['eagle', 1], ['crow', 2]], lv: [28, 32], out: 1, release: 'tue' },
  forest1: { name: 'The forest', hab: 'forest', r: [56, 56, 6, 10], enc: [['fox', 3], ['boar', 2], ['squirrel', 3], ['moth', 2], ['beetle', 2]], lv: [23, 26], out: 1, release: 'tue' },
  forest2: { name: 'The forest', hab: 'forest', r: [76, 56, 6, 10], enc: [['fox', 3], ['boar', 3], ['moth', 3], ['squirrel', 2]], lv: [26, 30], out: 1, release: 'tue' },
  deep1: { name: 'The deep forest', hab: 'deepforest', r: [112, 56, 6, 10], enc: [['boar', 3], ['bear', 1], ['moth', 2], ['fox', 2], ['adder', 1]], lv: [29, 32], out: 1, release: 'tue' },
  deep2: { name: 'The deep forest', hab: 'deepforest', r: [126, 56, 6, 10], enc: [['moose', 2], ['boar', 2], ['bear', 2], ['moth', 2]], lv: [31, 34], out: 1, release: 'tue' },
  deep3: { name: 'The deep forest', hab: 'deepforest', r: [136, 56, 18, 6], enc: [['moose', 3], ['bear', 2], ['boar', 2], ['trancequirrel', 1]], lv: [33, 36], out: 1, release: 'tue' },
  biglake: { name: 'The big lake', r: [56, 0, 104, 20], enc: [['pike', 4], ['crayfish', 3], ['mantis', 2], ['perch', 2], ['trippo', 1]], lv: [34, 40], out: 1, release: 'wed' },
  golf: { name: 'The golf course', hab: 'golf', r: [48, 22, 39, 25], enc: [['squirrel', 3], ['ladybug', 3], ['beetle', 3], ['tortoise', 2], ['crow', 2], ['fox', 1]], lv: [14, 20], out: 1, release: 'tue' },
  city: { name: 'The city', hab: 'city', r: [88, 22, 35, 25], enc: [['rat', 3], ['cockroach', 3], ['crow', 3], ['fox', 1], ['methmoth', 1]], lv: [12, 20], out: 1, release: 'tue' },
  mountain: { name: 'The mountain', hab: 'mountain', r: [123, 22, 37, 29], enc: [['adder', 3], ['hare', 3], ['eagle', 2], ['wolverine', 1], ['bear', 1], ['crow', 2]], lv: [26, 33], out: 1, release: 'tue' },
  forest: { name: 'The forest', hab: 'forest', r: [48, 50, 52, 24], enc: [['fox', 3], ['boar', 2], ['squirrel', 3], ['moth', 2], ['beetle', 1]], lv: [23, 28], out: 1, release: 'tue' },
  deepforest: { name: 'The deep forest', hab: 'deepforest', r: [100, 50, 60, 24], enc: [['moose', 2], ['bear', 2], ['boar', 2], ['moth', 2], ['trancequirrel', 1], ['fox', 1]], lv: [35, 41], out: 1, release: 'tue' },
  countryside: { name: 'The countryside', r: [48, 0, 112, 74], out: 1, release: 'tue' },
  lake: { name: 'The lake', r: [0, 0, 48, 9], out: 1 },
  lawn: { name: 'The lawn by the lake', hab: 'lawn', r: [0, 9, 48, 13], enc: [['crow', 5], ['ladybug', 4], ['rat', 1]], lv: [3, 6], out: 1 },
  parking: { name: 'Parking lot', hab: 'lot', r: [0, 46, 48, 19], enc: [['crow', 5], ['rat', 3], ['cockroach', 2]], lv: [2, 5], out: 1 }
},

/* ---------- The Box (Ljunky's CrossFit gym). boss = hero id; bossIfSelf = who runs it when you ARE that hero.
   After the boss is caught or finished off: flag ljunkyDone → AI-Ljunky rematch + the training board.
   Training: creatures left on the WOD board gain xpPerMin real-time XP, capped at the tier's level cap. ---------- */
gyms: {
  box: { name: 'The Box', boss: 'ljunky', bossIfSelf: 'kenta', board: [41, 10], doneFlag: 'ljunkyDone', trainRelease: 'tue',
    slots: 3, xpPerMin: 3, tiers: [{ cap: 15 }, { cap: 30, flag: 'aiBeaten' }, { cap: 45, flag: 'mythicCaught' }],
    wod: ['WOD: "THE MAXI"', '21-15-9', 'Kettlebell swings', 'Tyre flips', 'Rower 500 m'] }
},

/* ---------- cemetery. Every finished-off person/creature gets a stone. Resurrect by sacrificing an item it likes.
   reward: at the grave of `rewardGrave` (or rewardGraveIfSelf when you ARE that hero), Apologize or place a bitcoin → give + flag ---------- */
graves: {
  area: [2, 11, 9, 7], gate: [6, 18],
  default: ['Here lies {name}. Shopped till dropped.', '{name}. Came for milk, left in a bag.', 'R.I.P. {name}. Price per kilo unknown.', '{name} — no returns, no refunds.'],
  creature: ['{name} ×{n}. They had it coming.', 'In memory of {n} × {name}. Mostly a misunderstanding.'],
  reward: { release: 'wed', rewardGrave: 'ljunky', rewardGraveIfSelf: 'kenta', give: ['coke', 'weed', 'snus', 'glogg', 'shrooms', 'protein', 'mythicTrap'], flag: 'mythicSpawned',
    sorry: 'You apologize to the stone. A cold wind answers: "Apology accepted. Also: HODL."', coin: 'You place the bitcoin on the grave. The ground hums. Somewhere, a wallet unlocks.',
    after: 'Something cold and golden drifts out of the grave. It does not like carrier bags.' }
},

/* ---------- the dealer: trade creatures for drugs. value = rate[rarity] × (1 + level × levelBonus). Stock rotates every rotateMin.
   refuse = his line when you offer a wife. Traded creatures can show up in his stock later (buy back with kr). ---------- */
dealer: {
  npc: 'dealer', rotateMin: 20, size: 3, levelBonus: .08, buyBack: 60,
  book: { item: 'faltboken', price: 4, line: 'Field research. Very academic.' },   // always for sale (in creature points) until you own it
  rates: { C: 1, U: 2, R: 4, E: 7, L: 9, M: 12, H: 5 },
  stock: [['coke', 3, 3], ['weed', 2, 3], ['snus', 1, 2], ['glogg', 1, 2], ['shrooms', 4, 1]], // [item, price in creature points, weight]
  rare: [['shrooms', 4, .25], ['coke', 2, .15]],                                               // [item, price, chance per rotation] (discount specials)
  refuse: ['Whoa. That\'s somebody\'s wife. I have standards. Low ones, but still.', 'No wives. Bad for business. Bad for karma.'],
  hello: ['Psst. Creatures for goodies. No questions.', 'You again. Good. I need a Badger for… reasons.'],
  empty: 'Come back later. Supply chain issues.'
},

/* ---------- old saves: creatures from before the new roster become these (level kept; the form follows the level) ---------- */
legacy: { frog: 'toadlet', cuke: 'fawn', peng: 'hoglet', golem: 'hoglet', ghost: 'lynxKitten', slime: 'fawn', bat: 'crowling', mummy: 'badgerCub', banshee: 'crowling', fly: 'larva', crow: 'crowling', genie: 'lynxKitten', owl: 'crowling', snail: 'hoglet',
  snake: 'adderling', bear: 'bearCub', lizard: 'adderling', salmon: 'perchFry', moth: 'caterpillar', pike: 'pikeFry', loyal: 'badgerCub', walter: 'foxKit', cat: 'lynxKitten', lich: 'badgerCub', elk: 'fawn', serpent: 'adderling' },

/* ---------- Fältboken (the field book, replaces the creature list). margin = the previous owner's notes, one per line. A drug form shows as a black silhouette until you have seen its line; the recipe shows once you know it. ---------- */
/* ---------- Faunalens: the AI scan offered after your first catch; after that the Faunadex can be downloaded in the Appbutiken ---------- */
lens: {
  offer: '📱 Faunalens AI: "New animal detected! Scan {name} for free? We will only use your data for… things."',
  yes: '📷 Scan it', no: 'No thanks',
  scan: ['Scanning… 🔍', '{name}: {type}, size {size}, {rarity}. Likes: {bait}. Confidence 94 %.'],
  done: 'Faunalens is installed. The Faunadex app is now free in the Appbutiken (📱 Phone → 🛍️).',
  later: 'Fine. Faunalens waits in the Appbutiken if you change your mind. It will not shut up about it.',
  scanLine: '📷 Faunalens: {name} · {type} · {size} · likes {bait}.'
},
fieldbook: {
  locked: 'You have no field guide. Catch something and your phone will offer to scan it (Faunalens). Then download the Faunadex in the Appbutiken. Or buy a paper Fältboken behind the bottle machines.',
  intro: 'FAUNADEX. Nordens Djur, med anteckningar. Coffee rings on every page.',
  margin: {
    badger: 'It does not care. DO NOT feed it anything you would not eat yourself. (I did.)', lynx: 'Hates being looked at. Loves being looked at. Do not ask which.', toad: 'Sings at 3 a.m. Sings louder with the right drug. The elves hum along.',
    hedgehog: 'Crosses roads. Always. Give it a small mushroom and it grows a garden.', deer: 'Calm already. Give it weed and it levitates, emotionally.',
    rat: 'Cheese. Always cheese. It knows what a mouse trap is. It does not care.', cockroach: 'Survives everything. Including what I fed it. Fast now. VERY fast.', crow: 'Holds grudges. Remembers faces. Hates me specifically.', ladybug: 'Lucky. Dangerous in a spotty way.', perch: 'First fish. Always the first fish. It is a tradition.',
    squirrel: 'Nuts. Golf balls. Whatever. At the rave it is the DJ.', beetle: 'Looks tough. Is tough. Do not give it speed. It is already late.', tortoise: 'Do not hurry it. If you hurry it: coke. It will outrun you.',
    crayfish: 'Night. Lake bottom. A cage. A pinch. Snaps? Yes. It sings.', pike: 'The king of the lake. Molly makes it affectionate. That is worse.', mantis: 'Fastest punch alive. Shrooms: the punch comes with colours.', trippo: 'Only seen when I was... not myself. It was HUGE. Was it real? Ask the cat.',
    fox: 'Foxes come into town at night. They are the only honest ones.', boar: 'Mud. Rage. Cocaine makes it worse. Shrooms make it HONEST.', moth: 'Do NOT give it meth. I did. Look at the lamp over there.', moose: 'DO NOT give the moose ketamine indoors.', bear: 'Honey. Always honey. Shrooms and it will look right through you.',
    adder: 'Zig-zag. Sunbathing. Stay on the path. LSD melts it.', hare: 'Fast. Winter coat. Nothing else to say about it.', eagle: 'It sees you from two kilometres. Mist net? Good luck.', wolverine: 'Small. Angry. Stays mean. Drugs do not help. Nothing helps.', wraith: 'Not in the book. Not in the world. Not in this edition.'
  }
},

/* ---------- what a trap says when you check it (see tuning.TRAP for the odds) ---------- */
trapText: {
  nothing: ['The bait is gone. Something laughed at you.', 'Empty. A single feather. Possibly an insult.', 'Nothing. The bait is gone, and so is your dignity.', 'The trap is sprung, the bait is eaten, and nobody is home.'],
  junk: ['You find a boot. Size 46. Smells like Löken.', 'A shopping bag, a receipt and a lot of regret.', 'A single sock. It is not yours. It is also not nobody\'s.', 'A Folköl can. Empty. Still cold.'],
  higher: 'Something far too big got in. It wrecked the trap, but it is still here. Dazed. Angry.'
},

/* ---------- the opening: you wake up in the van, walk around, a stranger lets you choose a starter ----------
   starters: the pool. In a LIVE round each player claims one on the server (first come, first served), so the
   first player chooses from 5, the second from 4… In practice/dev the claims are kept on this phone (?dev=all&claims=reset clears them). */
opening: {
  blink: 4.2,                                   // seconds of eyelids opening and closing
  thoughts: ['Zombies everywhere!', 'Did {hero} run me over?', "No… that can't be. I have all my limbs intact.", 'But damn, my tummy hurts.'],
  strangerAfter: 12,                            // seconds of walking around before he shows up
  stranger: { name: '???', look: { skin: '#d8d0c8', hair: '#2a0a3a', style: 'hat', top: '#2a0a3a', top2: '#3dff8a', topStyle: 'blazer', legs: '#111', shoes: '#111', glasses: 1, big: 1 } },
  lines: ['You have been chosen.', 'Now it is your time to choose.'],
  starters: ['badgerCub', 'lynxKitten', 'toadlet', 'hoglet', 'fawn'],
  joined: '{name} joined your team!',
  tooSlow: '…',                                 // said when someone else grabbed the same one a second earlier
  noFight: 'You have nothing to fight with.',
  startItems: { folkol: 3, fizztab: 2, bag: 8, shoebox: 1, worms: 2, nuts: 1, jam: 1 }   // a kinder start: 8 bags, 2 fizz tabs, a 3-use shoebox trap and some bait
},
/* ---------- when everything faints (lose) or your heart gives up (heart) ---------- */
respawn: {
  at: [4, 62],
  lose: 'Everything goes black…',
  heart: 'Your heart goes BA-DUM… BA… DUM………',
  wakeVan: 'You wake up in the van. Again. Someone patched your creatures up and left a receipt from Apotek Hjärtat. You are {lost} kr lighter.',
  wakeGrave: 'You wake up at the cemetery gate. Someone already measured you for a stone. You are {lost} kr lighter.'
},

/* ===================================================== PEOPLE: personality, memory, knowledge =====================================================
   personalities: how a person reacts to the tone of your replies (tone → relationship change) and how readily they share what they know (shareRel).
   knowledge: facts you only get from people. Entries with listed:true show as ??? in the 📓 Notes until someone tells you.
   dialogue: one entry per person id (NPC, hero or wife). See DATA.md "Dialogue" for every condition and effect. */
personalities: {
  dry:      { hunt: "You. Yes, you. We are not finished.", voice: 'flat, short, deadpan',            shareRel: 1,  tones: { kind: 1, rude: -1, funny: 0, bribe: 1, honest: 1, lie: -1, flirt: -1 } },
  grumpy:   { hunt: "I have been waiting for you. With a bad mood.", voice: 'complains, hates small talk',     shareRel: 2,  tones: { kind: 0, rude: 1, funny: -1, bribe: 1, honest: 2, lie: -2, flirt: -2 } },
  gossip:   { hunt: "There you are! Everyone is talking about what you did.", voice: 'talks too much, knows everything', shareRel: -3, tones: { kind: 1, rude: -2, funny: 1, bribe: 1, honest: 0, lie: 0, flirt: 1 } },
  paranoid: { hunt: "I KNEW it. I knew it was you.", voice: 'whispers, suspects everyone',     shareRel: 3,  tones: { kind: 0, rude: -2, funny: -1, bribe: 2, honest: 2, lie: -3, flirt: -1 } },
  flirty:   { hunt: "Oh, darling. You have really done it this time.", voice: 'warm, teasing, a bit much',       shareRel: 0,  tones: { kind: 1, rude: -2, funny: 1, bribe: 1, honest: 0, lie: -1, flirt: 2 } },
  salesman: { hunt: "No more discounts for you. Only consequences.", voice: 'friendly, always selling',        shareRel: -1, tones: { kind: 1, rude: -1, funny: 1, bribe: 2, honest: 0, lie: 0, flirt: 0 } },
  dreamer:  { hunt: "The ferns told me you were coming. They were upset.", voice: 'drifting, half in another world', shareRel: 0,  tones: { kind: 1, rude: -1, funny: 2, bribe: 0, honest: 1, lie: 0, flirt: 1 } },
  hothead:  { hunt: "COME HERE! We settle this NOW.", voice: 'loud, proud, short fuse',         shareRel: 1,  tones: { kind: 0, rude: -2, funny: 1, bribe: 0, honest: 2, lie: -2, flirt: 0 } },
  robot:    { hunt: "HOSTILITY.EXE LOADED. PREPARE FOR PATCH.", voice: 'ALL CAPS, glitchy',               shareRel: -5, tones: { kind: 0, rude: 0, funny: -1, bribe: 0, honest: 1, lie: 0, flirt: 0 } }
},

knowledge: {
  types:   { name: 'How the types work', text: 'FANG › WING › ROOT › WATER › STONE › SHELL › FANG. The move list shows what is strong.' },
  tranq:   { name: 'The Barber has a tranquilizer gun', text: 'Under the chair. He sells it.' },
  ring:    { name: 'Fia keeps a ring box for desperate husbands', text: 'Behind the counter. Pricey.' },
  'wife:cicci':    { name: 'What Cicci wants', text: 'Someone who talks about the budget out loud. Honestly.' },
  'wife:anna':     { name: 'What Anna wants', text: 'Someone who talks about the light bill. Out loud.' },
  'wife:monika':   { name: 'What Monika wants', text: 'Walter found. And a shirt on the problem.' },
  'wife:sofia':    { name: 'What Sofia wants', text: 'To be looked at during the match.' },
  'wife:maadmads': { name: 'What MaadMads wants', text: 'Honesty about the coins. And the cats fed.' },
  'house:ljunky':  { name: "Ljunky's house", text: 'The gym by the bottle machines.', listed: true, release: 'tue' },
  'house:wizcudi': { name: "Wizcudi's house", text: 'The electronics store in the city.', listed: true, release: 'tue' },
  'house:jrohn':   { name: "Jrohn's house", text: 'A shaman cave in the mountain.', listed: true, release: 'tue' },
  'house:loken':   { name: "Löken's house", text: 'A castle, across the big lake.', listed: true, release: 'wed' },
  'house:bigwman': { name: "BigWman's house", text: 'A 24-hour rave, deep in the forest.', listed: true, release: 'tue' },
  herbs: { name: "Jrohn's brew", text: 'Fern, then mushroom, then moss. Never the other way.', release: 'tue' },
  boat:  { name: 'Boat-Bengt', text: 'Trades boats for vans. On the big lake shore.', release: 'wed' },
  ferry: { name: 'A ferry creature', text: 'A big lake creature that knows Ferry can carry you across the water.', release: 'wed' },
  tore:  { name: 'Trapper Tore', text: 'Upgrades and repairs traps. A clearing at the forest edge, by the dirt road. Bring fur.', release: 'tue' },
  // drug recipes: which drug turns which teen into which form. Told by the dealer, the doorman, Hasse… or learned by feeding. Shown in Fältboken.
  'recipe:xanadger': { name: 'Badger + Xanax', text: 'Feed a Badger (Lv 24+) Xanax and it becomes Xanadger. Sleepy but tough. Naps in the middle of fights.', release: 'tue' },
  'recipe:ecstadger': { name: 'Badger + Molly', text: 'Feed a Badger (Lv 24+) Molly and it becomes Ecstadger. Hugs everyone. Including the thing that is trying to eat it.', release: 'tue' },
  'recipe:ketadger': { name: 'Badger + Ketamine', text: 'Feed a Badger (Lv 24+) Ketamine and it becomes Ketadger. Is it here? Is it there? It is behind you. Huge hit.', release: 'tue' },
  'recipe:ladger': { name: 'Badger + LSD', text: 'Feed a Badger (Lv 24+) LSD and it becomes Ladger. Sees every colour. Hits with the one that hurts most.', release: 'tue' },
  'recipe:mollynx': { name: 'Lynx + Molly', text: 'Feed a Lynx (Lv 22+) Molly and it becomes MolLynx. Big Eyes. Nobody can bring themselves to attack it.', release: 'tue' },
  'recipe:dmtoad': { name: 'Toad + DMT', text: 'Feed a Toad (Lv 26+) DMT and it becomes DMToad. It has met the machine elves. They said hi.', release: 'wed' },
  'recipe:sporecupine': { name: 'Hedgehog + Shrooms', text: 'Feed a Hedgehog (Lv 24+) Shrooms and it becomes Sporecupine. Mushrooms grow on its back. It is fine with that.', release: 'tue' },
  'recipe:stonedeer': { name: 'Deer + Weed', text: 'Feed a Deer (Lv 22+) Weed and it becomes Stonedeer. Chill Out. Everybody at the fight is a bit more chill.', release: 'mon' },
  'recipe:cokeroach': { name: 'Cockroach + Coke', text: 'Feed a Cockroach (Lv 18+) Coke and it becomes Cokeroach. Always first. Always sniffing. Never sleeps.', release: 'mon' },
  'recipe:ketacrow': { name: 'Crow + Ketamine', text: 'Feed a Crow (Lv 20+) Ketamine and it becomes Ketacrow. Stares into the void. The void stares back and apologises.', release: 'tue' },
  'recipe:laddybug': { name: 'Ladybug + LSD', text: 'Feed a Ladybug (Lv 12+) LSD and it becomes Ladd-ybug. Seven Spots of Truth. Shows you what is really there.', release: 'tue' },
  'recipe:trancequirrel': { name: 'Squirrel + Molly', text: 'Feed a Squirrel (Lv 20+) Molly and it becomes Trancequirrel. Drop the Bass. Sets up in the golf rough at night.', release: 'tue' },
  'recipe:speedbeetle': { name: 'Stag Beetle + Speed', text: 'Feed a Stag Beetle (Lv 18+) Speed and it becomes Speedbeetle. Tweak. Doesn\'t blink. Doesn\'t stop.', release: 'tue' },
  'recipe:snortoise': { name: 'Tortoise + Coke', text: 'Feed a Tortoise (Lv 22+) Coke and it becomes Snortoise. Line Dash. The fastest tortoise alive. It will tell you.', release: 'tue' },
  'recipe:snapskrafta': { name: 'Crayfish + Snaps', text: 'Feed a Crayfish (Lv 18+) Snaps and it becomes Snapskräfta. Sings Helan Går. Hits harder when you join in.', release: 'tue' },
  'recipe:mollipike': { name: 'Pike + Molly', text: 'Feed a Pike (Lv 24+) Molly and it becomes Mollipike. Love Bite. Drains you gently and tells you it is nothing personal.', release: 'tue' },
  'recipe:mantisShroom': { name: 'Mantis Shrimp + Shrooms', text: 'Feed a Mantis Shrimp (Lv 26+) Shrooms and it becomes Mantis Shroom. Sporepunch. Hits first, confuses second.', release: 'tue' },
  'recipe:xanaxfox': { name: 'Fox + Xanax', text: 'Feed a Fox (Lv 22+) Xanax and it becomes Xanaxfox. Unbothered. Was chasing a mouse. Forgot why.', release: 'tue' },
  'recipe:shroomboar': { name: 'Wild Boar + Shrooms', text: 'Feed a Wild Boar (Lv 26+) Shrooms and it becomes Shroomboar. Truffle Rage. The lower its HP, the harder it hits.', release: 'tue' },
  'recipe:blowboar': { name: 'Wild Boar + Coke', text: 'Feed a Wild Boar (Lv 26+) Coke and it becomes Blowboar. Nose Charge. Huge hit. It will feel that tomorrow.', release: 'tue' },
  'recipe:methmoth': { name: 'Moth + Meth', text: 'Feed a Moth (Lv 20+) Meth and it becomes Methmoth. Lamp Frenzy. Has not slept since Tuesday. Fights the street lamp.', release: 'wed' },
  'recipe:ketamoose': { name: 'Moose + Ketamine', text: 'Feed a Moose (Lv 32+) Ketamine and it becomes Ketamoose. Moose in the Void. Is it still here? Define "here".', release: 'tue' },
  'recipe:shroomoose': { name: 'Moose + Shrooms', text: 'Feed a Moose (Lv 32+) Shrooms and it becomes Shroomoose. Antler Bloom. A spore cloud with an opinion.', release: 'tue' },
  'recipe:psilocybear': { name: 'Brown Bear + Shrooms', text: 'Feed a Brown Bear (Lv 34+) Shrooms and it becomes Psilocybear. Third Eye Maul. Never misses. Sees you from three angles.', release: 'tue' },
  'recipe:acidadder': { name: 'Adder + LSD', text: 'Feed a Adder (Lv 24+) LSD and it becomes Acidadder. Melt. Everything is liquid and it is your fault.', release: 'tue' },
},

dialogue: {
  /* ---- NPCs ---- */
  pirate: { rumours: true, personality: 'dreamer', friends: ['hasse'], help: { relMin: 4, give: { bottle: 1 }, text: 'Take this, matey. It was empty when I found it.' },
    talk: [
      { if: { step: 'pirate_rum:0' }, text: 'Got me bottle yet, matey? A dry pirate be a sad pirate.' },
      { if: { metMin: 2, questNot: 'pirate_rum' }, text: 'Me bottle be empty. Fetch me another one. Jonas sells them, the traitor.', replies: [
        { label: 'Aye aye.', quest: 'pirate_rum', tone: 'kind', text: 'Ye be a good sailor!' }, { label: 'Buy your own.', tone: 'rude', text: 'Arr. Cold.' }] },
      { if: { questDone: 'pirate_rum' }, text: 'Ye saved me life. Almost. Parrot says thank you.' },
      { if: { met: 0 }, text: "Arr! New face in the lot. The van's yers, aye? Don't touch me parrot.", replies: [
        { label: 'Nice parrot.', tone: 'kind', text: 'Gunilla be her name. She bites.' },
        { label: "I don't see a parrot.", tone: 'honest', text: '…Shh. Between us: there be no parrot. Tell no one.' },
        { label: 'Move, pirate.', tone: 'rude', text: 'Arr. Rude. I almost respect it.' }] },
      { if: { hero: 'loken' }, text: 'Ye smell o\' fresh lawn and gold coins. The lawn folk be dangerous, they say.' },
      { if: { state: 'drunk' }, text: 'Ye drink like a pirate! Welcome aboard, ye barnacle!' },
      { if: { night: true }, text: 'Night be the best time. The bats own the lot. And me.' },
      { if: { killed: 'pelle' }, text: 'I heard Pelle took a trip to the cemetery. Arr. He still owes me a krona.' },
      { if: { last: 'honest' }, text: 'Ye told me the truth about me parrot. Few do. Few know.' },
      { if: { from: 'wed', metMin: 1 }, tell: 'house:loken', release: 'wed', text: "Löken has a castle across the water, they say. Ye can't walk there. Ask about a man called Bengt." },
      { text: 'Arr. The van smells o\' Löken\'s gym bag. Not that I be complaining.' },
      { if: { metMin: 1 }, text: 'Back again. The lot be quiet, apart from the cars that breathe.' }] },
  berit: { rumours: true, personality: 'grumpy', friends: ['pelle', 'cicci'], help: { relMin: 4, give: { bag: 3 }, text: 'Take a few bags. On the house. If you tell anyone I will deny it.' },
    talk: [
      { if: { step: 'bottle_war:0' }, text: 'Pelle sent you? He returns FAKE cans. Count them yourself. Whose side are you on?', replies: [
        { label: 'Berit is right.', set: { bw_decided: true, 'side:berit': true }, rel: 2, text: 'Finally someone sensible.' },
        { label: 'Pelle is right.', set: { bw_decided: true, 'side:pelle': true }, rel: -2, text: 'Out. Out of my queue.' },
        { label: 'You are both wrong.', set: { bw_decided: true, 'side:none': true }, tone: 'honest', text: '…Fair. I hate that you are fair.' }] },
      { if: { metMin: 3, questNot: 'berit_parcel' }, text: 'A parcel arrived for Hardware Jonas. It ticks. I do not want it near my register. Take it to him?', replies: [
        { label: 'Fine. I will take it.', quest: 'berit_parcel', give: { parcel: 1 }, tone: 'kind', text: 'Do not shake it.' }, { label: 'It ticks?!', tone: 'funny', text: 'It is probably a clock. Probably.' }] },
      { if: { questLocked: 'berit_parcel' }, text: 'You are in with Pelle now. I have nothing for you.' },
      { if: { met: 0 }, text: 'Unexpected item in bagging area. Unexpected YOU. Bags are 10 kr.', replies: [
        { label: 'Just browsing.', tone: 'kind', text: 'Browse faster.' },
        { label: 'Bags are a scam.', tone: 'honest', text: '…Correct. Do not tell management.' },
        { label: 'Calm down, Berit.', tone: 'rude', text: 'Do not tell ME to calm down.' }] },
      { if: { metMin: 2 }, tell: 'wife:cicci', text: "Cicci stood right there crying over a package once. You know what helped? Somebody asked her about the budget. Out loud. Honestly." },
      { if: { hero: 'bigwman' }, text: "You're BigWman. Your packages are in my back room. All of them. Stop sending them to ICA." },
      { if: { killed: 'pelle' }, text: "Pelle's gone. Nobody returns bottles properly any more. Are you happy?" },
      { if: { state: 'blurred' }, text: "You're swaying. Please step away from the register." },
      { if: { night: true }, text: 'Night shift. Even the cash register gets tired. Do not look the self-checkout in the eye.' },
      { text: "Still here? The queue is behind you. It has always been behind you." },
      { text: 'I have been in this queue since 2019.' }] },
  pelle: { personality: 'paranoid', friends: ['berit', 'sofia'],
    talk: [
      { if: { metMin: 3, questNot: 'bottle_war' }, text: 'Berit is stealing my cans. I counted. Ask her. Quietly. Then tell me whose side you are on.', replies: [
        { label: 'I will ask her.', quest: 'bottle_war', tone: 'kind', text: 'Do not trust the bagging area.' }, { label: 'Not my problem.', tone: 'rude' }] },
      { if: { step: 'bottle_war:1' }, text: 'So? What did she say?' },
      { if: { questDone: 'bottle_war', flag: 'side:pelle' }, text: 'You took my side. I will never forget it. I forget everything else, but not that.' },
      { if: { questDone: 'bottle_war', flag: 'side:berit' }, text: 'You took her side. The machines are watching you now.' },
      { if: { questLocked: 'bottle_war' }, text: 'Berit asked you something first. I know. The machines told me.' },
      { if: { met: 0 }, text: 'Shh. The machines are listening.', replies: [
        { label: 'Who is listening?', tone: 'kind', text: 'The machines. Keep your voice down.' },
        { label: 'They are just machines.', tone: 'rude', text: 'That is exactly what they want you to think.' },
        { label: 'I hear it too.', tone: 'lie', text: '…You do? ...No. No, you are lying. Nobody hears it.' }] },
      { if: { metMin: 1, hero: 'ljunky' }, text: "You. Ljunky. Your gym is right there. They do burpees at night, ten of them, in perfect time. Perfect." },
      { if: { from: 'tue', metMin: 1 }, tell: 'house:ljunky', release: 'tue', text: 'That gym next to the machines. The Box. It belongs to Ljunky. The machines respect it.' },
      { if: { metMin: 2 }, tell: 'wife:sofia', text: "Sofia comes for the bottles Löken throws on the lawn. She says she just wants him to look at her during the match. Not the screen. Her." },
      { if: { killed: 'berit' }, text: 'Berit is gone. They got her. They are coming for me next. And YOU know it.' },
      { if: { relMax: -1 }, text: 'You. Go away.' },
      { if: { night: true }, text: 'The machine hums louder at night. It sings.' },
      { text: 'One krona per can. I have three million cans. They count the cans. They KNOW.' }] },
  freja: { personality: 'dry', friends: ['berit'],
    talk: [
      { if: { step: 'freja_penguin:0' }, text: 'Have you found a rat yet? Any rat. It does not have to like me.' },
      { if: { metMin: 2, questNot: 'freja_penguin' }, text: 'Something is living in the freezer pipes. Bring me a Rat. Just so I can see it. Do not tell the peas.', replies: [
        { label: 'I will find one.', quest: 'freja_penguin', tone: 'kind', text: 'Mm. Thanks.' }, { label: 'Rats have jobs.', tone: 'funny', text: 'Mm.' }] },
      { if: { questDone: 'freja_penguin' }, text: 'It sat by the peas for a whole minute. I will remember that forever.' },
      { if: { met: 0 }, text: "Cold in here. Colder out there. You want something, or are you just standing in my draught?", replies: [
        { label: 'Just looking.', tone: 'kind', text: 'Mm. Everyone is.' },
        { label: 'Your freezers are lovely.', tone: 'flirt', text: 'Please do not.' }] },
      { if: { metMin: 1 }, tell: 'types', text: 'Listen. FANG beats WING, WING beats ROOT, ROOT beats WATER, WATER beats STONE, STONE beats SHELL, SHELL beats FANG. Teeth catch birds, birds eat plants, roots drink water, water wears stone, stones crack shells, shells break teeth. Write it down. Or do not. I am only a freezer.' },
      { if: { carry: 'rat' }, text: 'A rat. In MY freezer aisle? Name it. Not Gunnar. I knew a Gunnar.' },
      { if: { killed: 'berit' }, text: 'Berit and I shared the lunch room. It is very quiet at the lunch table now.' },
      { if: { state: 'high' }, text: 'Your eyes are the size of dinner plates. Lie down by the peas.' },
      { text: 'Rats love it when you leave the freezer door open. Or hate it. I forget.' }] },
  hasse: { rumours: true, personality: 'dreamer', friends: ['pirate'],
    talk: [
      { if: { met: 0 }, text: 'Can you smell purple? No? Then you have not lived.', replies: [
        { label: 'Smells blue to me.', tone: 'funny', text: 'BLUE! Yes! You see it too!' },
        { label: 'No.', tone: 'honest', text: 'Honest. Sad. Honest.' }] },
      { if: { relMin: 2, notFlag: 'got:lsd' }, text: 'Psst. You are okay. I like you. Take this: a little rainbow. Put it on a ladybug. Do not ask me how I know.', give: { lsd: 1 }, set: { 'got:lsd': true }, tell: ['recipe:laddybug', 'recipe:ladger', 'recipe:acidadder'] },
      { if: { state: 'high' }, text: 'YOU can see them too! The shapes! Tell no one. Tell everyone.' },
      { if: { hero: 'jrohn' }, text: 'Jrohn! That is you. Wait. That is me? Which one of us is wearing the shirt?' },
      { if: { from: 'tue', metMin: 1 }, tell: 'house:jrohn', release: 'tue', text: 'There is a cave halfway up the mountain. A shaman lives in it. Half plant, half man, no shirt. I do not know who he is.' },
      { if: { night: true }, text: 'The stars are loud tonight. Do you hear the receipts? The receipts!' },
      { text: 'The receipt in aisle 4 is fourteen metres long and it LOOKED at me.' },
      { text: 'Mushrooms? Ask the guy who hides behind the bottle machines. Did not hear it from me.' }] },
  barber: { rumours: true, personality: 'salesman', friends: ['maadmads', 'jonas'],
    talk: [
      { if: { step: 'barber_fur:0' }, text: 'A real cat, mind you. From Ljunky\'s gang. For the fur. No questions.' },
      { if: { metMin: 3, questNot: 'barber_fur' }, text: 'I need a cat. One of Ljunky\'s, for the fur. I will pay well. I will ask nothing.', replies: [
        { label: 'I will see what I can do.', quest: 'barber_fur', tone: 'kind', text: 'Discretion. Always.' }, { label: 'That is creepy.', tone: 'honest', text: 'It is a business.' }] },
      { if: { questDone: 'barber_fur' }, text: 'The fur is perfect. I cried. The mirror cried.' },
      { if: { met: 0 }, text: 'Trim? Gossip? A shave? Something under the chair, for the discerning customer?', replies: [
        { label: 'A trim, please.', tone: 'kind', text: 'Snip snip. You have good ears.' },
        { label: 'What is under the chair?', tone: 'funny', text: 'Ask me when we are better friends.' }] },
      { if: { know: 'tranq' }, text: 'Jonas talked? Fine, fine. A tranquilizer gun, for the moths. 120 kr. No questions.' },
      { if: { metMin: 2 }, tell: 'wife:maadmads', text: 'MaadMads comes by for the cat fur. Says one day she will sell it to feed the other cats. What she really wants is honesty about the coins. Fewer coins, more honesty.' },
      { if: { hero: 'ljunky' }, text: 'Ljunky! The moustache king himself. Your cats left hair on my chair again.' },
      { if: { killed: 'jonas' }, text: 'No more sharp tools from Jonas. I have to sharpen my own now. It is a shame.' },
      { text: 'Hair grows. Gossip grows faster.' }] },
  jonas: { personality: 'grumpy', friends: ['anna', 'barber'], help: { relMin: 4, give: { rock: 3 }, text: 'Here. Rocks. Free. The only thing in this shop with no markup.' },
    talk: [
      { if: { metMin: 1 }, tell: 'tore', release: 'tue', text: 'Anything above a mouse trap is Tore. Forest edge, a clearing by the dirt road. He bites. Not literally. Mostly.' },
      { if: { step: 'jonas_bulbs:1' }, text: 'Well? How was she about the bill?' },
      { if: { step: 'jonas_bulbs:0' }, text: 'Anna. The light bill. Go and talk to her. She yells less at strangers.' },
      { if: { metMin: 3, questNot: 'jonas_bulbs' }, text: 'Anna buys the cheap bulbs, then yells at me about the bill. Talk to her about it? For me?', replies: [
        { label: 'I will.', quest: 'jonas_bulbs', tone: 'kind', text: 'You are a good person. Or a fool. Same thing.' }, { label: 'Not my fight.', tone: 'rude', text: 'Everybody says that.' }] },
      { if: { questDone: 'jonas_bulbs' }, text: 'She said thank you. To me. I did not know she could.' },
      { if: { carry: 'parcel' }, text: 'That parcel ticks. From Berit? Give it here. Quickly. Then go.' },
      { if: { met: 0 }, text: 'Traps work while you sleep. Like me.', replies: [
        { label: 'What is good for catching?', tone: 'kind', text: 'Anything with a smell. Creatures are simple.' },
        { label: 'Your prices are a joke.', tone: 'rude', text: 'The joke is you are still standing here.' }] },
      { if: { metMin: 1 }, tell: 'tranq', text: 'The Barber has a tranquilizer gun under the chair. Do not ask why. He says it is for the moths.' },
      { if: { metMin: 2 }, tell: 'wife:anna', text: 'Anna buys the cheapest bulbs and complains about the bill. Honestly? She wants somebody to talk about the light bill. Out loud. With her.' },
      { if: { from: 'tue', metMin: 1 }, tell: 'house:wizcudi', release: 'tue', text: 'Wizcudi has the electronics store in the city. Do not go in under-levelled. He turns the lights off on you.' },
      { if: { killed: 'barber' }, text: 'Barber is dead? Then who else buys my blades? Thanks a lot.' },
      { if: { night: true }, text: 'Closing time was six hours ago. I am here because I am too grumpy to go home.' },
      { text: 'Put it where the creatures walk. Come back later.' }] },
  fia: { personality: 'flirty', friends: ['monika'],
    talk: [
      { if: { met: 0 }, text: 'Flowers solve everything. Except chlorine flowers. Those make it worse.', replies: [
        { label: 'You solve everything.', tone: 'flirt', text: 'Oh, aren\'t you sweet.' },
        { label: 'What are chlorine flowers?', tone: 'kind', text: 'A mistake. Do not give them to a wife.' }] },
      { if: { metMin: 1 }, tell: 'ring', text: 'Behind the counter I keep a ring box for desperate husbands. Instant calm. Many regrets. Ask me when you are desperate.' },
      { if: { metMin: 2 }, tell: 'wife:monika', text: 'Monika buys tulips and tells them about Walter. All she wants is Walter found. Bring him, or at least say you have seen him.' },
      { if: { state: 'drunk' }, text: 'Careful, darling. I am not a lamppost.' },
      { if: { killed: 'monika' }, text: 'Monika was my best customer. Now every tulip is sad.' },
      { text: 'Never give a wife a chore chart. Trust me.' }] },
  system: { personality: 'salesman', talk: [
      { if: { met: 0 }, text: 'ID, please. …You look 47. Go ahead.' },
      { if: { state: 'drunk' }, text: 'Hm. You have had some. I will serve you anyway. I am a professional.' },
      { if: { night: true }, text: 'Closing soon. Which means: buy more now.' },
      { text: 'Special today: everything. All of it.' }] },
  apotek: { personality: 'dry', talk: [
      { if: { met: 0 }, text: 'Everyone is fully healed. Take care out there.' },
      { if: { step: 'xanax_rx:0' }, text: 'A Signal Crayfish. From the big lake. Show me one and the doctor will sign.' },
      { if: { metMin: 2, notFlag: 'xanaxRx', questNot: 'xanax_rx' }, quest: 'xanax_rx', text: 'Something for the nerves? I need a prescription. The doctor wants a Signal Crayfish. I do not ask. I just pass it on.' },
      { if: { state: 'blurred' }, text: 'You are swaying. Sit. Breathe. Do not mix any more.' },
      { if: { debtMin: 2 }, text: 'There is no medicine for promise debt. Only payment.' },
      { text: 'Take two Fizz tablets and call me in the morning. I am here at night too.' }] },
  burgercook: { personality: 'hothead', talk: [
      { if: { met: 0 }, text: 'ORDER UP! Oh. You are not an order.' },
      { if: { carry: 'bear' }, text: 'Is that a BEAR? In my kitchen? It is always hungry. Do not bring it near my grill.' },
      { text: 'The secret ingredient is rage. And mayonnaise.' }] },
  pizzaiolo: { personality: 'flirty', talk: [
      { if: { met: 0 }, text: 'Ciao, bella! Kebab pizza, the national dish. Specialita della casa: regret.' },
      { if: { night: true }, text: 'Midnight pizza? The best kind. I do not judge. Much.' },
      { text: 'Extra garlic sauce? You say yes. Everybody says yes.' }] },
  sushichef: { personality: 'dry', talk: [
      { if: { met: 0 }, text: 'Fresh today. Probably.' },
      { if: { carry: 'perch' }, text: 'That perch is staring at my fish tank. Please keep it away from my fish tank.' },
      { text: 'Soy sauce is not a personality.' }] },
  dealer: { personality: 'paranoid', talk: [
      { if: { relMin: 1 }, tell: ['recipe:cokeroach', 'recipe:blowboar', 'recipe:snortoise', 'recipe:sporecupine'], text: 'Coke on a roach, a boar, a tortoise: they get FAST. Shrooms on a hedgehog: spores. I did not say anything.' },
      { if: { metMin: 1, notCarry: 'faltboken' }, text: 'I also sell a book. Field research. Very academic. Four points.' },
      { if: { met: 0 }, text: "Psst. You didn't see me." },
      { if: { relMin: 2 }, text: 'You again. Good. You are not a cop. Cops have worse shoes.' },
      { if: { night: true }, text: 'Nighttime is good for business. And for hiding.' },
      { text: 'Cash is for tourists. I take creatures.' }] },
  kenny: { personality: 'salesman', friends: ['dealer'], talk: [
      { if: { met: 0 }, text: 'Psst. I buy animals. No paperwork, no questions, no real money.' },
      { if: { from: 'tue', metMin: 1 }, tell: 'house:bigwman', release: 'tue', text: 'Rave in the deep forest. Twenty-four hours. BigWman owns it, believe it or not. Bass you can feel in your fillings. Do not go in weak.' },
      { if: { relMin: 2 }, text: 'You are a good customer. I will pay a bit above the going rate. A bit.' },
      { text: 'Creatures? I know a guy in Norrtälje. He knows a guy.' }] },
  kenta: { personality: 'hothead', friends: ['trainer1', 'trainer2'], talk: [
      { if: { met: 0 }, text: 'Three, two, one, GO! …Why are you not going?' },
      { if: { flag: 'gymOpen' }, text: 'The board is open. Drop your creatures, pick them up later.' },
      { if: { killed: 'trainer1' }, text: 'You... you did what to Patrik? Get out of my gym.' },
      { text: 'Leave your creatures on the WOD board. They come back stronger.' }] },
  trainer1: { personality: 'hothead', friends: ['kenta'], talk: [
      { if: { met: 0 }, text: 'Do you even lift, bro?' },
      { if: { carry: 'protein' }, text: 'THAT is a protein shake. Respect.' },
      { text: 'Protein shake? I have nine.' }] },
  trainer2: { personality: 'dry', friends: ['kenta'], talk: [
      { if: { met: 0 }, text: 'WOD of the day: catch 20 creatures, for time.' },
      { text: 'Rest day is a social construct.' }] },
  aiLjunky: { personality: 'robot', talk: [
      { if: { met: 0 }, text: 'HELLO. I AM LJUNKY. VERSION 2.0. NOW WITH 40 % MORE DIP.' },
      { text: 'ERROR: FEELINGS.EXE NOT FOUND. FIGHT? Y/N' },
      { text: 'I HAVE TRAINED ON 10,000 HOURS OF LJUNKY EXPLAINING CRYPTO. YOU CANNOT WIN.' }] },
  ingvar: { personality: 'dry', talk: [{ text: 'Inkasso-Ingvar. You promised. Klarna remembers.' }] },

  /* ---- the bigger world ---- */
  caddy: { rumours: true, personality: 'dry', friends: ['hermit'], talk: [

      { if: { step: 'caddy_par:1' }, text: 'Par? You made par? Tell me everything. Every stroke.' },
      { if: { step: 'caddy_par:0' }, text: 'The tee is by the pond. Hit it long. Then hit it right.' },
      { if: { metMin: 1, questNot: 'caddy_par' }, text: 'Nobody makes par on the first hole. Not since the pond moved. Do you want to try? Tee is over there.', replies: [
        { label: 'Fore!', quest: 'caddy_par', tone: 'funny', text: 'Oh, I like you.' }, { label: 'Golf is boring.', tone: 'honest', text: 'It is. That is the beauty.' }] },
      { if: { met: 0 }, text: 'Fore! …That was for me. Nobody is playing. Nobody has played since the lake rose.', replies: [
        { label: 'Nice course.', tone: 'kind', text: 'Eight holes, three of them under water. I call it character.' },
        { label: 'Who needs golf?', tone: 'honest', text: 'Exactly. I only carry the bag.' }] },
      { if: { state: 'drunk' }, text: 'You are swaying more than my flag. Sit down on the bunker. Nobody minds.' },
      { if: { night: true }, text: 'Night golf. The ball glows. Very exclusive.' },
      { if: { killed: 'hermit' }, text: 'Hilding is gone? Then who will complain about the noise now?' },
      { text: 'Between the rough and the road there is always something with teeth. Mind the tall grass.' }] },
  kioskman: { rumours: true, personality: 'salesman', talk: [
      { if: { met: 0 }, text: 'Welcome to the city! Everything is available. Some of it legally.' },
      { if: { night: true }, text: 'Night kiosk: the same prices, but with the lights on.' },
      { if: { metMin: 1 }, text: 'Nets for fishing, snus for everything else. What can I do for you?' },
      { text: 'The electronics store? Dark. They never turn the lights on. I think it is about the bill.' }] },
  hermit: { personality: 'paranoid', friends: ['caddy'], talk: [
      { if: { met: 0 }, text: 'Quiet. The trees are working. Do not talk until it passes.', replies: [
        { label: 'Sorry. I will whisper.', tone: 'kind', text: '…Whisper. Yes. Good.' },
        { label: 'What are they working on?', tone: 'funny', text: 'Roots. Obviously. Everything is roots.' }] },
      { if: { state: 'high' }, text: 'You can hear them too. Good. Do not tell the moths.' },
      { if: { night: true }, text: 'At night the forest gets deeper. Never go east in the dark.' },
      { text: 'There is a party in the deep forest. It never ends. The bass makes my teeth ring.' }] },
  guide: { personality: 'grumpy', talk: [
      { if: { metMin: 2 }, tell: 'tore', release: 'tue', text: 'Tore lives where the trees thin. Makes traps. Hates visitors. Likes fur.' },
      { if: { metMin: 1 }, tell: 'herbs', release: 'tue', text: 'Jrohn brews in the cave. The order matters: fern first, then the mushroom, then moss. Do not ask me how I know. I carried the herbs.' },
      { if: { met: 0 }, text: 'Hiking boots? No? You will regret that. Everyone does.' },
      { if: { carry: 'hare' }, text: 'A mountain hare. Still in its winter coat. Suspicious.' },
      { if: { night: true }, text: 'Nobody goes up at night. Except the shaman. And he floats.' },
      { text: 'The trail is long and the rocks are rude. Halfway up there is a cave. Do not touch the boulder.' }] },
  tore: { personality: 'grumpy', talk: [
      { if: { met: 0 }, text: 'Traps. I make them better. Fur and kronor. Mostly fur. Do not touch the pit.' },
      { text: 'A good trap is a patient trap. Bring me fur, scales, shells. And kronor.' }] },
  doorman: { personality: 'hothead', talk: [
      { if: { relMin: 1 }, tell: ['recipe:mollynx', 'recipe:ecstadger', 'recipe:trancequirrel', 'recipe:mollipike', 'recipe:ketadger', 'recipe:ketacrow', 'recipe:speedbeetle'], text: 'Molly on a badger, a lynx, a squirrel, a pike. Ketamine on a crow. Speed on a beetle. I said NOTHING. Move along.' },
      { if: { met: 0 }, text: 'Name? Not on the list. Move along.' },
      { if: { night: true }, text: 'THE BASS IS UP. It is night. Do you feel it in your teeth?' },
      { if: { hero: 'bigwman' }, text: 'Oh, it is you. The owner. I did not recognise you with the shirt on.' },
      { text: 'Not tonight. Come back when you are stronger. Much stronger.' }] },
  folke: { personality: 'dreamer', friends: ['bengt'], talk: [
      { if: { step: 'folke_pike:0' }, text: 'A Pikezilla. With the crown. Show me one and I will believe in you.' },
      { if: { step: 'folke_cast:0' }, text: 'A perfect cast: every reel in the gold. Do it once and I will respect you.' },
      { if: { step: 'folke_cast:1' }, text: 'You did the perfect cast? I felt it from here.' },
      { if: { metMin: 3, questNot: 'folke_pike' }, text: 'The one with the crown. Bring me one, where I can see it. I have only ever heard it.', replies: [
        { label: 'I will find it.', quest: 'folke_pike', tone: 'kind', text: 'Be quiet about it.' }, { label: 'Fish stories.', tone: 'funny', text: 'Mm. Everyone says that.' }] },
      { if: { metMin: 4, questNot: 'folke_cast' }, text: 'Can you cast? A perfect cast: every reel in the gold, once.', replies: [
        { label: 'Watch me.', quest: 'folke_cast', tone: 'funny', text: 'I never watch. I listen.' }, { label: 'Not now.', tone: 'kind' }] },
      { if: { met: 0 }, text: 'Shh. They bite better in the quiet.', replies: [
        { label: 'What are you fishing for?', tone: 'kind', text: 'The one with the crown. He always gets away.' },
        { label: 'Any luck?', tone: 'funny', text: 'Luck is for lottery winners. I have patience.' }] },
      { if: { metMin: 1, from: 'wed' }, tell: 'boat', release: 'wed', text: 'You want to reach the castle? Over the big lake? Then you want Boat-Bengt, down on the western shore. He trades boats. For vans, strangely.' },
      { if: { carry: 'pikezilla', from: 'wed' }, tell: 'ferry', release: 'wed', text: 'THAT is a Pikezilla! Feed it, level it. At the right size it can ferry you across the water on its back. Do not ask how I know.' },
      { if: { night: true }, text: 'Night fishing is the best. The lake breathes.' },
      { text: 'Nets, traps, patience. Two of those are for sale.' }] },
  bengt: { personality: 'salesman', talk: [
      { if: { met: 0 }, text: 'A boat! A boat! You want a boat. Everyone wants a boat. I want a van. We are made for each other.' },
      { if: { flag: 'boat' }, text: 'How is she? The old van? I mean, the new boat? Both of them, I hope.' },
      { if: { night: true }, text: 'Night is for sailing. And for not asking where the boat was before.' },
      { text: 'Keys for keys. That is the whole business.' }] },
  /* ---- people with a schedule ---- */
  nisse: { rumours: true, personality: 'paranoid', friends: ['pelle'], talk: [
      { if: { met: 0 }, text: 'Shh. Night shift. I watch the lot. Somebody has to, and it is never the day shift.', replies: [
        { label: 'What do you see?', tone: 'kind', text: 'Bats. Mostly. And once, a trolley that walked on its own.' },
        { label: 'Nothing happens here.', tone: 'rude', text: 'That is exactly what they want you to think.' }] },
      { if: { carry: 'moth' }, text: 'A moth in a bag. Good. Do not let it near the lights.' },
      { text: 'The rave in the deep forest is louder at night. You can feel it in the bags.' },
      { text: 'Day people have no idea. I could tell them. They would not listen.' }] },
  market: { rumours: true, personality: 'salesman', talk: [
      { if: { met: 0 }, text: 'TUESDAY MARKET! Everything half price! Nothing is guaranteed!' },
      { if: { relMin: 2 }, text: 'For you, even cheaper. Do not tell Jonas.' },
      { text: 'Come tomorrow and I will be gone. Come today and I will be cheap.' }] },
  /* ---- puzzle pieces and day events (props). repeat: true = the same line can be said again ---- */
  kb1: { repeat: true, talk: [
      { if: { flag: 'edge:ljunky' }, text: 'You are done here. Your arms agree.' },
      { if: { flag: 'wod1', notFlag: 'wod2' }, text: 'Already lifted. Something heavier next.' },
      { text: '8 kg. Light. You lift it with one finger. Something in The Box nods.', set: { wod1: true }, quest: 'box_wod' }] },
  kb2: { repeat: true, talk: [
      { if: { flag: 'wod2', notFlag: 'wod3' }, text: 'Lifted. Heavier next.' },
      { if: { flag: 'wod1' }, text: '16 kg. You lift it. Properly.', set: { wod2: true } },
      { text: '16 kg, cold. Your back says: start with the light one.', set: { wod1: false, wod2: false, wod3: false } }] },
  kb3: { repeat: true, talk: [
      { if: { flag: 'wod3' }, text: 'Lifted. All of them. The rower is waiting.' },
      { if: { flag: 'wod2' }, text: '24 kg. You lift it. The Box applauds silently.', set: { wod3: true } },
      { text: '24 kg, cold. You hear something pop. Start light.', set: { wod1: false, wod2: false, wod3: false } }] },
  rower: { repeat: true, talk: [
      { if: { flag: 'edge:ljunky' }, text: 'You did the WOD already. Ljunky never does the last set. He starts late. Always.' },
      { if: { flag: 'wod3' }, text: '500 metres on the rower. You finish. Ljunky never does the last set. He starts late, and tired.', set: { 'edge:ljunky': true } },
      { text: 'The rower waits. Warm up first: light to heavy.' }] },
  fuse1: { repeat: true, talk: [
      { if: { flag: 'got:fuse1' }, text: 'Empty. Just cables.' },
      { text: 'A fuse, in a drawer of cables. You take it.', give: { fuse: 1 }, set: { 'got:fuse1': true }, quest: 'store_fuses' }] },
  fuse2: { repeat: true, talk: [
      { if: { flag: 'got:fuse2' }, text: 'Empty. Just screws.' },
      { text: 'A fuse, wrapped in a sock, in a toolbox. Of course.', give: { fuse: 1 }, set: { 'got:fuse2': true }, quest: 'store_fuses' }] },
  fuse3: { repeat: true, talk: [
      { if: { flag: 'got:fuse3' }, text: 'Just manuals.' },
      { text: 'A fuse, behind a manual about fuses.', give: { fuse: 1 }, set: { 'got:fuse3': true }, quest: 'store_fuses' }] },
  fusebox: { repeat: true, talk: [
      { if: { flag: 'edge:wizcudi' }, text: 'Every light is on. The store hums.' },
      { text: 'A fuse box with three empty slots. Every light in the building is off. On purpose.', replies: [
        { label: 'Put in the fuses', take: { fuse: 3 }, set: { 'edge:wizcudi': true }, text: 'Click. Click. Click. EVERY light comes on. Somewhere across town, Wizcudi winces.' },
        { label: 'Later' }] }] },
  fern: { repeat: true, talk: [{ text: 'A fern, growing out of the cave wall. It looks strangely proud.', set: { h1: true, h2: false, h3: false }, quest: 'cave_brew' }] },
  mush: { repeat: true, talk: [
      { if: { flag: 'h1' }, text: 'A mushroom. It tastes of Thursdays. You pick it.', set: { h2: true } },
      { text: 'A mushroom, cold. The cave coughs. Something about the order…', set: { h1: false, h2: false, h3: false } }] },
  moss: { repeat: true, talk: [
      { if: { flag: 'h2' }, text: 'Moss. Soft. It purrs. You pick it.', set: { h3: true } },
      { text: 'Moss, too soon. It sulks. The order matters.', set: { h1: false, h2: false, h3: false } }] },
  cauldron: { repeat: true, talk: [
      { if: { flag: 'got:dmt' }, text: 'The cauldron bubbles. The elves wave from inside.' },
      { if: { flag: 'edge:jrohn' }, text: 'The brew bubbles. Jrohn will be very, very relaxed.' },
      { if: { flag: 'h3', notFlag: 'got:dmt', relMin: 0 }, text: 'You add the herbs. The cauldron hums. Somewhere, Jrohn loses track of what a fight is.', set: { 'edge:jrohn': true, 'got:dmt': true }, give: { shrooms: 1, dmt: 1 }, tell: ['recipe:dmtoad'] },
      { text: 'A cold cauldron. It wants herbs, in the right order. Someone on the mountain knows it.' }] },
  camper: { repeat: true, talk: [
      { if: { flag: 'got:meth' }, text: 'The camper is empty. The smell stays. Do not touch the thermos.' },
      { if: { carry: 'faltboken', notFlag: 'got:meth', relMin: 0 }, text: 'Under the bunk, in a sock: a small bag of bright crystals and a note: "for the Methmoth guy. Do NOT." You take it. It glows a little.', give: { meth: 1 }, set: { 'got:meth': true }, tell: ['recipe:methmoth'] },
      { text: 'A dented camper van, curtains drawn. On the dashboard: a thermos, a lamp (lit) and a coffee- and weed-stained book. FÄLTBOKEN – Nordens Djur, med anteckningar. Nobody is coming back for it.', give: { faltboken: 1 }, set: { 'got:book': true } }] },
  /* hidden stashes (see props) */
  stash_weed: { repeat: true, talk: [{ if: { flag: 'got:stash_weed' }, text: 'Nothing else here. Just a bit of dust and a bad feeling.' }, { text: "Under the flat stone: a baggie of weed, taped shut. The dealer's handwriting says \"for later\". It is later.", give: { weed: 1 }, set: { 'got:stash_weed': true } }] },
  stash_coins1: { repeat: true, talk: [{ if: { flag: 'got:stash_coins1' }, text: 'Nothing else here. Just a bit of dust and a bad feeling.' }, { text: 'Behind the flat tyre: a sock with 30 kr in coins. Nobody is looking for it.', kr: 30, set: { 'got:stash_coins1': true } }] },
  stash_coins2: { repeat: true, talk: [{ if: { flag: 'got:stash_coins2' }, text: 'Nothing else here. Just a bit of dust and a bad feeling.' }, { text: "Under the trolley's seat: a fold of 50 kr. The trolley judges you. You keep the money.", kr: 50, set: { 'got:stash_coins2': true } }] },
  stash_speed: { repeat: true, talk: [{ if: { flag: 'got:stash_speed' }, text: 'Nothing else here. Just a bit of dust and a bad feeling.' }, { text: "Inside the tyre: a film canister marked \"SPEED, DO NOT EAT\". Somebody's been eating.", give: { speed: 1 }, set: { 'got:stash_speed': true } }] },
  stash_molly: { repeat: true, talk: [{ if: { flag: 'got:stash_molly' }, text: 'Nothing else here. Just a bit of dust and a bad feeling.' }, { text: 'Behind the bin, taped to the wall: one pink capsule in a sandwich bag. It smells of strawberry.', give: { molly: 1 }, set: { 'got:stash_molly': true } }] },
  stash_keta: { repeat: true, talk: [{ if: { flag: 'got:stash_keta' }, text: 'Nothing else here. Just a bit of dust and a bad feeling.' }, { text: 'In the cooler, between two Folköl: a small vial. The label says "HORSE?". You choose not to ask.', give: { keta: 1 }, set: { 'got:stash_keta': true } }] },
  stash_shrooms: { repeat: true, talk: [{ if: { flag: 'got:stash_shrooms' }, text: 'Nothing else here. Just a bit of dust and a bad feeling.' }, { text: 'Under the log, in a paper bag: dried mushrooms. A smiley is drawn on it. The smiley is not reassuring.', give: { shrooms: 1 }, set: { 'got:stash_shrooms': true } }] },
  stash_lsd: { repeat: true, talk: [{ if: { flag: 'got:stash_lsd' }, text: 'Nothing else here. Just a bit of dust and a bad feeling.' }, { text: "In the golf bag's side pocket: a tiny sheet of paper, ten little squares. Do not lick the scorecard.", give: { lsd: 1 }, set: { 'got:stash_lsd': true } }] },
  stash_dmt: { repeat: true, talk: [{ if: { flag: 'got:stash_dmt' }, text: 'Nothing else here. Just a bit of dust and a bad feeling.' }, { text: 'In the stump, wrapped in a leaf: a vial of yellow-green crystals. The forest hums while you hold it.', give: { dmt: 1 }, set: { 'got:stash_dmt': true } }] },
  alley: { repeat: true, talk: [
      { if: { flag: 'got:alley' }, text: 'A bin. A smell. Nothing else tonight.' },
      { text: 'Behind a bin, a very small, very cold bag. You are not sure what it is. You are sure what it is.', give: { coke: 1 }, set: { 'got:alley': true } }] },
  throne: { repeat: true, talk: [
      { if: { flag: 'throne:done' }, text: 'The throne is quiet. For now.' },
      { text: 'An empty throne. Dusty. Löken guards it from the lawn, gently.', quest: 'castle_throne', replies: [
        { label: 'Sit on it', set: { 'edge:loken': true, 'throne:done': true }, rel: { sofia: -2 }, text: 'You sit. It is comfortable. A crown rolls out of the cushion. Löken will hear about this.' },
        { label: 'Polish it', set: { 'throne:done': true }, rel: { sofia: 1 }, kr: 100, text: 'You polish it until your face shows. Behind the cushion: 100 kr.' },
        { label: 'Leave it' }] }] },
  bar: { repeat: true, talk: [
      { if: { flag: 'got:glow' }, text: 'The bartender shrugs. You already have yours.' },
      { text: 'The bartender hands you a glow stick without a word. 🍹', give: { glowstick: 1 }, set: { 'got:glow': true }, quest: 'rave_dj' }] },
  dj: { repeat: true, talk: [
      { if: { flag: 'edge:bigwman' }, text: 'The beat is perfect. Nobody can count it now.' },
      { if: { night: true, carry: 'glowstick' }, text: 'The DJ sees the glow stick. "You. Up here." You drop the beat on the seven. Somewhere, BigWman loses count of everything.', set: { 'edge:bigwman': true }, take: { glowstick: 1 } },
      { if: { night: true }, text: 'The DJ is in the zone. Bring something that glows.' },
      { if: { night: false }, text: 'The DJ is asleep under the decks. Come back after dark.' }] },
  balloons: { repeat: true, talk: [
      { if: { flag: 'got:balloon' }, text: 'Out of balloons. Monday is for balloons.' },
      { text: 'A man gives you a balloon and a Fizz tablet. "Monday!" he says. That is all he says.', give: { fizztab: 1 }, set: { 'got:balloon': true } }] },
  wallet: { repeat: true, talk: [
      { if: { flag: 'got:wallet' }, text: 'Empty now. A photo of a cat.' },
      { text: 'A lost wallet. 200 kr and a photo of a cat. You keep the money. The cat judges you.', kr: 200, set: { 'got:wallet': true } }] },
  /* ---- the heroes (before the fight). Their first meeting uses the bossLines from above, written once ---- */
  bigwman: { personality: 'dry', friends: ['cicci'], talk: [
      { if: { flag: 'edge:bigwman' }, text: 'Why is the beat in my head on the seven? One, two, three… I lost count!' },
      { if: { metMin: 1 }, text: 'Back again. I updated the spreadsheet: you appear in row 14.' },
      { if: { debtMin: 2 }, text: 'Your promise debt is on my sheet. In red.' },
      { if: { killed: 'cicci' }, text: 'You did what to Cicci? I have no formula for that.' },
      { if: { state: 'drunk' }, text: 'You smell like Systembolaget. Is that a tax write-off?' },
      { if: { night: true }, text: 'It is the middle of the night. Nobody does spreadsheets at night. Except me.' },
      { text: 'Every single package is accounted for. YES.' }] },
  wizcudi: { personality: 'paranoid', friends: ['anna'], talk: [
      { if: { flag: 'edge:wizcudi' }, text: 'Every light in my store is on. EVERY ONE. Who did this?!' },
      { if: { metMin: 1 }, text: 'You moved a lamp last time. I counted. I always count.' },
      { if: { killed: 'anna' }, text: 'Anna... was the only one who turned the light on. Now it is dark. Thank you.' },
      { if: { state: 'blurred' }, text: 'You are swaying. The electricity is wobbling because of you.' },
      { if: { night: true }, text: 'Night rate is cheaper. This conversation is already too expensive.' },
      { text: 'Who left that light on?!' }] },
  jrohn: { personality: 'dreamer', friends: ['monika'], talk: [
      { if: { flag: 'edge:jrohn' }, text: 'Everything is so... soft. What were we doing? Oh! A hug!' },
      { if: { metMin: 1 }, text: 'You came back! I have been telling the ferns about you.' },
      { if: { killed: 'monika' }, text: 'Monika... the ferns are very quiet today.' },
      { if: { carry: 'toad' }, text: 'A TOAD! Hug it for me! I love this! I love you! Where is my shirt?' },
      { if: { state: 'high' }, text: 'We are in the same garden right now. Do you see it? The same one.' },
      { text: 'Walk with me. Or fight me. Whichever has more hugs.' }] },
  loken: { personality: 'hothead', friends: ['sofia'], talk: [
      { if: { flag: 'edge:loken' }, text: 'Someone sat on my throne. I can SMELL it. Gently. But I can smell it.' },
      { if: { metMin: 1 }, text: 'Back on my lawn. Stick together, boys. Except you.' },
      { if: { killed: 'sofia' }, text: 'You... touched Sofia. You are DEAD to the lawn.' },
      { if: { carry: 'crow' }, text: 'A bottle crow. The lawn approves. Gently. Loyally.' },
      { if: { night: true }, text: 'It is the middle of the night. The grass sleeps. Be QUIET on it.' },
      { text: 'I dropped 400 kr on the way here. Pick it up, I dare you.' }] },
  ljunky: { personality: 'salesman', friends: ['maadmads'], talk: [
      { if: { flag: 'edge:ljunky' }, text: 'Why am I so tired already? I did not even start. WHY IS THE ROWER WARM?' },
      { if: { metMin: 1 }, text: 'Back for more? I have patched the game since you left.' },
      { if: { killed: 'maadmads' }, text: 'You... deleted my wife? That is not in the patch notes.' },
      { if: { carry: 'lynx' }, text: 'A lynx. My cats are lynx-adjacent. They like me. They do not like you.' },
      { if: { debtMin: 3 }, text: 'Three promise debts. I could make a coin out of that.' },
      { text: 'Buy the dip, my friend. Buy it.' }] },

  /* ---- the wives. talk = what she says when you walk up (per hero, then memory of earlier meetings).
         wife.reacts = how hard she hits and how many turns she needs, per hero you play.
         wife.lines = what you can say. right: {conditions} = this line is THE right line while the conditions hold (most specific wins);
         lines without right are always wrong. Nobody can memorise the answer: it depends on who you are, what you carry, what you did. ---- */
  cicci: { after: [{ text: "We are good. For now. Tell him the packages stay cancelled." }], personality: 'dry', friends: ['berit', 'bigwman'],
    wife: { reacts: { bigwman: { mul: 1.5, turns: 1 }, wizcudi: { mul: .9, turns: 0 }, jrohn: { mul: .8, turns: 0 }, loken: { mul: .7, turns: 0 }, ljunky: { mul: 1, turns: 0 } },
      lines: [
        { text: 'A budget. In writing. I will sign it myself.', right: { hero: 'bigwman', last: 'wrong' } },
        { text: 'Berit will not be signing for any more packages. That is a relief, not a loss.', right: { killed: 'berit' } },
        { text: 'Sit down. Drink some water. We can do the packages tomorrow.', right: { state: 'drunk' } },
        { text: 'I know I promised. I am paying it back. Now.', right: { debtMin: 2 } },
        { text: 'I cancelled the packages. All of them.', right: { hero: 'bigwman' } },
        { text: 'He is at the checkouts, signing for something. Go easy on him.', right: { notHero: 'bigwman' } },
        { text: "It's an investment, technically." },
        { text: 'Packages? What packages?' },
        { text: 'Is the spreadsheet in the cloud, at least?' },
        { text: 'It was only a small one. Medium.' }] },
    talk: [
      { if: { met: 0, hero: 'bigwman' }, text: 'There you are. I counted the boxes: fourteen. You have a minute to explain.' },
      { if: { met: 0, hero: 'wizcudi' }, text: "Oh, thank goodness. It is you and not him. Where is that man with his packages?" },
      { if: { met: 0, hero: 'jrohn' }, text: 'You. Without a shirt. Have you seen my husband? He might be wearing one.' },
      { if: { met: 0, hero: 'loken' }, text: 'Löken. You are the only one of them who never orders anything. I like you. Where is my husband?' },
      { if: { met: 0, hero: 'ljunky' }, text: 'Ljunky. Is any of this your fault? Whatever "this" is.' },
      { if: { last: 'promise' }, text: 'You promised me last time. I wrote it down. We are not doing that again.' },
      { if: { last: 'right' }, text: 'You listened to me last time. That is rarer than you think. Try again.' },
      { if: { killed: 'berit' }, text: 'You... did something to Berit? She was my friend. I am not alone, you know.' },
      { text: 'Another one of you. Of course.' }] },
  anna: { after: [{ text: "The light is on. For Ellie. Thank you. Tell him to look at the bill, not the switch." }], personality: 'paranoid', friends: ['jonas', 'wizcudi'],
    wife: { reacts: { wizcudi: { mul: 1.6, turns: 1 }, bigwman: { mul: .9, turns: 0 }, jrohn: { mul: .7, turns: 0 }, loken: { mul: 1, turns: 0 }, ljunky: { mul: .9, turns: 0 } },
      lines: [
        { text: 'Last time I promised the light. I forgot. I will not forget now.', right: { last: 'promise' } },
        { text: 'I am sorry about Jonas. He was the only one who understood the meter.', right: { killed: 'jonas' } },
        { text: 'Quiet. Ellie is asleep, and she needs her light.', right: { state: 'drunk' } },
        { text: 'The bill is high. I will pay it myself.', right: { debtMin: 2 } },
        { text: 'Ellie can have every light in the house. I will pay the bill.', right: { hero: 'wizcudi' } },
        { text: 'I turned the light ON. For Ellie.', right: { notHero: 'wizcudi' } },
        { text: 'Do you know what that lamp costs per hour?' },
        { text: 'He told me to say he is in a meeting.' },
        { text: 'LEDs are fine. Relax.' },
        { text: 'Have you tried turning yourself off and on?' }] },
    talk: [
      { if: { met: 0, hero: 'wizcudi' }, text: 'Turn it back ON. NOW. Ellie is scared of the dark, and so am I.' },
      { if: { met: 0, hero: 'bigwman' }, text: 'You are not him. But you know him. Whatever you say, I am writing it down.' },
      { if: { met: 0, hero: 'jrohn' }, text: 'Jrohn. You and the lights. Do you know how much your basement costs me?' },
      { if: { met: 0, hero: 'loken' }, text: 'Löken. Quiet one. I like quiet. It uses less electricity.' },
      { if: { met: 0, hero: 'ljunky' }, text: 'Ljunky. Your mining rig. I can hear it from here. Everything hums.' },
      { if: { last: 'wrong' }, text: 'Last time you said something stupid. I remembered. I always remember.' },
      { text: 'Is the light on? Check. Check again.' }] },
  monika: { after: [{ text: "Walter is home and the shirt is on. Mostly. Tell him I love him. Nicely." }], personality: 'dreamer', friends: ['fia', 'jrohn'],
    wife: { reacts: { jrohn: { mul: 1.5, turns: 1 }, bigwman: { mul: .8, turns: 0 }, wizcudi: { mul: .9, turns: 0 }, loken: { mul: .8, turns: 0 }, ljunky: { mul: 1, turns: 0 } },
      lines: [
        { text: 'I have the toad right here. He is fine. He is FINE.', right: { carry: 'toad' } },
        { text: 'Fia gave him his flowers. I will miss her.', right: { killed: 'fia' } },
        { text: 'No more drinks for you. Have a sandwich.', right: { state: 'drunk' } },
        { text: 'It is true, I promised. I will fix it.', right: { debtMin: 2 } },
        { text: 'Shirt on. Walter found. Let us go home.', right: { hero: 'jrohn' } },
        { text: 'He is in the flower department, talking to plants.', right: { notHero: 'jrohn' } },
        { text: 'Have you seen my pants?' },
        { text: 'Clothes are a social construct.' },
        { text: 'Walter is a free spirit.' },
        { text: 'It is a lifestyle choice.' }] },
    talk: [
      { if: { met: 0, hero: 'jrohn' }, text: 'Jrohn. Where is Walter? And where is your shirt? One answer will do.' },
      { if: { met: 0, hero: 'bigwman' }, text: 'BigWman. You look very organised. Has anyone told you that is suspicious?' },
      { if: { met: 0, hero: 'wizcudi' }, text: 'Wizcudi. Lovely to see you. I am sorry about the lights. Everyone is.' },
      { if: { met: 0, hero: 'loken' }, text: 'Löken. The lawn man. Please tell me my husband is not on it.' },
      { if: { met: 0, hero: 'ljunky' }, text: 'Ljunky. Are those cats following you, or are you following them?' },
      { if: { carry: 'toad' }, text: 'A TOAD! Oh. Oh, you have it. Do you know what that means?' },
      { text: 'Walter ran away AGAIN.' }] },
  sofia: { after: [{ text: "No match tonight. I made soup. Tell him to look at me." }], personality: 'hothead', friends: ['pelle', 'loken'],
    wife: { reacts: { loken: { mul: 1.6, turns: 1 }, bigwman: { mul: .9, turns: 0 }, wizcudi: { mul: 1.2, turns: 0 }, jrohn: { mul: .8, turns: 0 }, ljunky: { mul: .9, turns: 0 } },
      lines: [
        { text: 'Pelle was a Djurgården fan, you know. I think he would have wanted a quiet day.', right: { killed: 'pelle' } },
        { text: 'It is late. Come home. The match will be replayed.', right: { night: true } },
        { text: 'Let me sit with you. Not the screen. You.', right: { state: 'drunk' } },
        { text: 'I know about the promises. I forgive you. Once.', right: { debtMin: 2 } },
        { text: 'No match today. Just you and me.', right: { hero: 'loken' } },
        { text: 'He is on the lawn by the lake. Guarding it.', right: { notHero: 'loken' } },
        { text: 'Djurgården plays at seven, though.' },
        { text: 'Löken? Never heard of him.' },
        { text: 'AIK are rubbish anyway.' },
        { text: 'It is tradition.' }] },
    talk: [
      { if: { met: 0, hero: 'loken' }, text: 'Löken. There you are. Where have you been? Which match was it this time?' },
      { if: { met: 0, hero: 'wizcudi' }, text: 'AIK man. Of course. Everything is your fault. Do not argue.' },
      { if: { met: 0, hero: 'bigwman' }, text: 'BigWman. Calm. Neat. Boring. Have you seen him? The loud one?' },
      { if: { met: 0, hero: 'jrohn' }, text: 'Jrohn. Put on a shirt. Then we can talk about my husband.' },
      { if: { met: 0, hero: 'ljunky' }, text: 'Ljunky. Tell me you did not teach him crypto.' },
      { if: { killed: 'pelle' }, text: 'Pelle. You... You killed Pelle? He was a friend. A bit weird. But a friend.' },
      { text: 'Not another Djurgården match.' }] },
  maadmads: { after: [{ text: "The cats are fed. I saved the coins. Please tell him to text me." }], personality: 'gossip', friends: ['barber', 'ljunky'],
    wife: { reacts: { ljunky: { mul: 1.5, turns: 1 }, bigwman: { mul: .8, turns: 0 }, wizcudi: { mul: 1, turns: 0 }, jrohn: { mul: .9, turns: 0 }, loken: { mul: .9, turns: 0 } },
      lines: [
        { text: 'A lynx with you? Thank god. Give it tuna. A lot of tuna.', right: { carry: 'lynx' } },
        { text: 'I heard what happened at The Box. I am not angry. Honestly.', right: { flag: 'ljunkyDone' } },
        { text: 'You smell of beer. Go and drink some water. Then we talk.', right: { state: 'drunk' } },
        { text: 'I know the promises. I will not take another.', right: { debtMin: 2 } },
        { text: 'I sold everything. The cats are fed.', right: { hero: 'ljunky' } },
        { text: 'He is in Systembolaget, buying the dip in liquid form.', right: { notHero: 'ljunky' } },
        { text: 'It is not a dip, it is a discount.' },
        { text: 'He is mining. Somewhere. Do not ask.' },
        { text: 'Sell the cats and you are covered.' },
        { text: 'Crypto is a lifestyle.' }] },
    talk: [
      { if: { met: 0, hero: 'ljunky' }, text: 'Ljunky. The cats are hungry and so am I. Where have you been?' },
      { if: { met: 0, hero: 'bigwman' }, text: 'BigWman! Spreadsheet man! Quick, tell me his numbers. Wait, no. Not that.' },
      { if: { met: 0, hero: 'wizcudi' }, text: 'Wizcudi. Everyone knows about your lights. I mean everyone.' },
      { if: { met: 0, hero: 'jrohn' }, text: 'Jrohn. Have you seen Ljunky? You seem like you know things. Or like you know nothing.' },
      { if: { met: 0, hero: 'loken' }, text: 'Löken, the lawn man. Everyone tells me about you. Everyone.' },
      { if: { killed: 'barber' }, text: 'The Barber is dead? I... I just saw him yesterday. I always see everyone yesterday.' },
      { text: 'Did you buy the dip again?' }] }
},

/* ===================================================== THE BIGGER WORLD (east of the old map; every old coordinate is unchanged) =====================================================
   The map is built from rectangles. Tiles: ~ old lake  V big lake (boat or ferry needed)  s sand  , grass  " tall grass (encounters)  u undergrowth (encounters)  T tree  Q dense forest (solid)
   = road  o sidewalk  a golf fairway  Z golf green  G golf flag  b bunker  N city wall  X rock (solid)  y dirt path  i cave floor  J castle wall  j castle floor  D rave wall  d rave floor
   Ops: ['fill', x, y, w, h, tile]   ['set', x, y, tile]   ['scatter', x, y, w, h, tile, density 0-1, seed]   ['room', x, y, w, h, wallTile, floorTile, doorX, doorY, doorWidth]
   Before world.release the east is closed (closed ops = a wall of trees) so Monday's map is exactly the old one. */
world: {
  width: 160, release: 'tue',
  always: [['fill', 37, 19, 10, 1, '"']],   // applied from Monday too: the strip of tall grass in front of The Box (the path there crosses level 8–11 creatures)
  closed: [['fill', 48, 0, 112, 74, 'Q']],
  ops: [
    ['fill', 48, 0, 112, 74, ','],
    // the old lake and lawn continue east; the lawn is open at the old edge
    ['fill', 47, 9, 1, 11, ','], ['fill', 48, 0, 8, 8, '~'], ['fill', 48, 8, 8, 1, 's'],
    // the big lake (north-east), its beaches, and the castle island: only a boat or a ferry gets you there
    ['fill', 56, 0, 104, 20, 'V'], ['fill', 55, 8, 1, 12, 's'], ['fill', 56, 18, 70, 2, 's'],
    ['fill', 126, 2, 30, 15, 's'], ['fill', 127, 3, 28, 13, ','], ['room', 131, 4, 20, 9, 'J', 'j', 140, 12, 2],
    // the roads, the golf course in between
    ['fill', 48, 20, 65, 2, '='], ['fill', 48, 47, 75, 1, 'o'], ['fill', 48, 48, 75, 2, '='],
    ['fill', 48, 22, 39, 25, 'a'], ['scatter', 48, 22, 39, 25, '"', .07, 9], ['scatter', 48, 22, 39, 25, 'b', .02, 7], ['scatter', 48, 22, 39, 25, 'T', .03, 3],
    ['fill', 66, 30, 6, 4, '~'], ['fill', 52, 38, 5, 3, '~'], ['fill', 80, 24, 5, 4, 'Z'], ['set', 82, 25, 'G'], ['fill', 54, 31, 4, 3, 'Z'], ['set', 56, 32, 'G'],
    ['room', 50, 23, 9, 6, '#', '_', 54, 28, 2],
    // the city (electronics store = Wizcudi's house, a kiosk)
    ['fill', 88, 22, 35, 25, 'o'], ['fill', 88, 30, 35, 2, '='], ['fill', 88, 38, 35, 2, '='], ['fill', 96, 22, 2, 25, '='], ['fill', 112, 22, 2, 25, '='],
    ['fill', 88, 22, 8, 8, 'N'], ['fill', 98, 22, 14, 8, 'N'], ['fill', 114, 22, 9, 8, 'N'], ['fill', 88, 32, 8, 6, 'N'],
    ['room', 98, 32, 14, 6, 'N', '_', 104, 37, 2], ['room', 114, 32, 9, 6, 'N', '_', 117, 37, 2],
    ['fill', 88, 40, 8, 7, 'N'], ['fill', 98, 40, 14, 7, 'N'], ['fill', 114, 40, 9, 7, 'N'],
    // the mountain: rock, a trail up, the shaman cave halfway
    ['fill', 126, 22, 34, 29, 'X'], ['fill', 123, 30, 19, 2, 'y'], ['room', 134, 22, 14, 8, 'X', 'i', 140, 29, 2],
    ['fill', 124, 29, 4, 4, 'u'], ['fill', 130, 29, 4, 4, 'u'],
    // the forest and the deep forest, the rave
    ['fill', 48, 50, 112, 24, 'Q'], ['fill', 48, 50, 52, 24, ','], ['scatter', 48, 50, 52, 24, 'T', .18, 5], ['fill', 48, 60, 52, 2, 'y'], ['fill', 56, 56, 6, 10, 'u'], ['fill', 76, 56, 6, 10, 'u'],
    ['fill', 49, 57, 4, 4, ','], ['fill', 119, 58, 5, 2, ','], ['fill', 100, 60, 45, 2, 'y'], ['fill', 112, 56, 6, 10, 'u'], ['fill', 126, 56, 6, 10, 'u'], ['fill', 136, 56, 18, 6, 'u'], ['room', 136, 62, 18, 10, 'D', 'd', 144, 62, 2],
    // tall grass that crosses the roads: you cannot get past without meeting something (level goes up eastwards)
    ['fill', 52, 46, 4, 5, '"'], ['fill', 72, 46, 4, 5, '"'], ['fill', 90, 46, 4, 5, '"'], ['fill', 108, 46, 4, 5, '"'],
    ['fill', 52, 19, 4, 4, '"'], ['fill', 76, 19, 4, 4, '"'], ['fill', 100, 19, 4, 4, '"']
  ]
},

/* ---------- the five houses. level = what your BEST creature must be to get in. Your own hero's house is your home (always open; heal + storage).
   No sign: the name only shows once someone has told you (knowledge house:<hero>). locked = what you read at the door.
   trophy = a one-time reward inside. home.at = the spot you tap at home. zone = the zone id of the interior (see zones). ---------- */
houses: {
  ljunky:  { name: 'The Box', hero: 'ljunky', level: 10, door: [41, 18], doorW: 2, release: 'mon', home: { at: [44, 11] },
    locked: "The Box is locked. Through the window: someone screaming 'ONE MORE ROUND'. You are not ready for that." },
  wizcudi: { name: 'The electronics store', hero: 'wizcudi', level: 20, door: [104, 37], doorW: 2, release: 'tue', home: { at: [108, 34] },
    trophy: { at: [100, 34], give: { mouseTrap: 1, fizztab: 2 }, text: 'A glass case: a perfect, never-used extension cord. You take it. Nobody is looking.' },
    locked: 'The store is dark. Every single light is off, on purpose.' },
  jrohn:   { name: 'The shaman cave', hero: 'jrohn', level: 30, door: [140, 29], doorW: 2, release: 'tue', home: { at: [144, 26] },
    trophy: { at: [136, 26], give: { weed: 1, shrooms: 1 }, text: 'Dried herbs on a stone shelf. A note: "For Walter".' },
    locked: 'A boulder sits in the cave mouth. It hums. You are not strong enough to move it.' },
  loken:   { name: 'The castle', hero: 'loken', level: 40, door: [140, 12], doorW: 2, release: 'wed', home: { at: [146, 8] },
    trophy: { at: [135, 8], kr: 400, give: { ringbox: 1 }, text: 'A trophy cabinet: 400 kr in small coins. Dropped, collected, dropped again.' },
    locked: 'The castle gate is shut. Gently. Loyally. Shut.' },
  bigwman: { name: 'The rave', hero: 'bigwman', level: 35, door: [144, 62], doorW: 2, release: 'tue', home: { at: [148, 66] },
    trophy: { at: [140, 66], give: { protein: 2, coke: 1 }, text: 'A rack of glow sticks and a spreadsheet of beats. You take the protein bars.' },
    locked: "A bouncer made of bass. 'Not tonight.' You are not on the list." }
},

/* ===================================================== THINGS TO DO: quests, props (puzzles, fishing spots, tees), mini-games, rumours =====================================================
   quests: a chain of steps. A step is done when its conditions match (same language as dialogue); turnIn = only when you talk to that person. Rewards are knowledge, items, kronor and relationships (never points).
   rewards: the best matching one is given (choices change what you get). locks: starting this quest closes those (you chose a side).
   Start a quest from any dialogue line or reply with  quest: 'id'. Rel can be a map:  rel: { berit: +3, pelle: -3 }. Hand in a creature with takeCreature. */
quests: {
  bottle_war: { name: 'The bottle war', giver: 'pelle', release: 'tue', locks: ['berit_parcel'],
    steps: [ { text: 'Pelle says Berit steals his cans. Ask Berit. Pick a side.', done: { flag: 'bw_decided' } }, { text: 'Tell Pelle what you decided.', turnIn: 'pelle', done: {} } ],
    rewards: [ { if: { flag: 'side:berit' }, rel: { berit: 3, pelle: -3 }, give: { bag: 3 }, text: 'Berit owes you. Pelle does not.' },
               { if: { flag: 'side:pelle' }, rel: { pelle: 3, berit: -3 }, give: { bottle: 3 }, text: 'Pelle owes you. Berit does not.' },
               { if: { flag: 'side:none' }, rel: { pelle: -1, berit: -1 }, kr: 60, text: 'Neither is happy. You are fair.' } ] },
  berit_parcel: { name: 'The ticking parcel', giver: 'berit', release: 'tue', locks: ['bottle_war'],
    steps: [ { text: 'Deliver Berit\'s parcel to Hardware Jonas.', turnIn: 'jonas', done: { carry: 'parcel' }, take: { parcel: 1 } } ],
    rewards: [ { rel: { berit: 2, jonas: 1 }, give: { surstromming: 1 }, text: 'Jonas signs for it, sweating.' } ] },
  pirate_rum: { name: 'An empty bottle', giver: 'pirate', release: 'tue',
    steps: [ { text: 'Bring the pirate an empty bottle (Hardware Jonas sells them).', turnIn: 'pirate', done: { carry: 'bottle' }, take: { bottle: 1 } } ],
    rewards: [ { rel: { pirate: 2 }, give: { surstromming: 1 }, text: 'The pirate cries a little.' } ] },
  freja_penguin: { name: 'Company for the freezer', giver: 'freja', release: 'tue',
    steps: [ { text: 'Show Freja a Rat (there is something in her pipes).', turnIn: 'freja', done: { carry: 'rat' } } ],
    rewards: [ { rel: { freja: 2 }, give: { meatballs: 3, jamJar: 1 }, text: 'She cannot stop smiling. Cold smile.' } ] },
  barber_fur: { name: 'The fox fur', giver: 'barber', release: 'tue',
    steps: [ { text: 'Bring the Barber a Fox. He says it is for the moustache wax.', turnIn: 'barber', done: { carry: 'fox' } } ],
    rewards: [ { rel: { barber: 2, maadmads: 1 }, kr: 300, give: { ringbox: 1 }, text: 'He weeps over the fur. Pays well.' } ] },
  jonas_bulbs: { name: "Anna's light bill", giver: 'jonas', release: 'tue',
    steps: [ { text: 'Talk to Anna about the light bill.', done: { flag: 'talked:anna' } }, { text: 'Tell Jonas how it went.', turnIn: 'jonas', done: {} } ],
    rewards: [ { rel: { jonas: 2, anna: 2 }, tell: 'wife:anna', give: { mouseTrap: 1 }, text: 'Jonas finally understands the meter.' } ] },
  folke_pike: { name: 'The one with the crown', giver: 'folke', release: 'tue',
    steps: [ { text: 'Show Folke a Pikezilla.', turnIn: 'folke', done: { carry: 'pikezilla' } } ],
    rewards: [ { rel: { folke: 3 }, give: { netTrap: 1 }, text: 'Folke whispers: "It is real." And gives you a trap.' } ] },
  folke_cast: { name: 'The perfect cast', giver: 'folke', release: 'tue',
    steps: [ { text: 'Fish with a perfect timing (every reel in the gold).', done: { flag: 'fish:perfect' } }, { text: 'Tell Folke.', turnIn: 'folke', done: {} } ],
    rewards: [ { rel: { folke: 2 }, give: { net: 3 }, text: 'Folke respects the cast.' } ] },
  caddy_par: { name: 'Par on the first hole', giver: 'caddy', release: 'tue',
    steps: [ { text: 'Make par on the first hole (the tee is by the pond).', done: { flag: 'golf:par' } }, { text: 'Tell Caddy Calle.', turnIn: 'caddy', done: {} } ],
    rewards: [ { rel: { caddy: 3 }, kr: 250, give: { beer6: 1 }, text: 'Calle shakes your hand. It is damp.' } ] },
  xanax_rx: { name: 'The prescription', giver: 'apotek', release: 'tue',
    steps: [ { text: 'Show the pharmacist a Signal Crayfish (big lake, a tier 3 water trap at night).', turnIn: 'apotek', done: { carry: 'signalCrayfish' } } ],
    rewards: [ { rel: { apotek: 2 }, set: { xanaxRx: true }, tell: ['recipe:xanadger', 'recipe:xanaxfox'], text: 'Prescription granted. Xanax is on the shelf.' } ] },
  // the house puzzles: each gives you an edge on that hero (his team is 3 levels lower, and he is off his game)
  box_wod: { name: 'The WOD', giver: 'kb1', release: 'mon',
    steps: [ { text: 'Warm up in The Box: the kettlebells, light to heavy.', done: { flag: 'wod3' } }, { text: 'Finish on the rower.', done: { flag: 'edge:ljunky' } } ],
    rewards: [ { give: { protein: 2 }, text: 'Ljunky will start late.' } ] },
  store_fuses: { name: 'Lights on', giver: 'fuse1', release: 'tue',
    steps: [ { text: 'Find the three fuses hidden in the store.', done: { flag: ['got:fuse1', 'got:fuse2', 'got:fuse3'] } }, { text: 'Put them in the fuse box.', done: { flag: 'edge:wizcudi' } } ],
    rewards: [ { kr: 150, text: 'Wizcudi winces from across town.' } ] },
  cave_brew: { name: "The shaman's brew", giver: 'fern', release: 'tue',
    steps: [ { text: 'Gather the herbs in the right order (someone knows it).', done: { flag: 'h3' } }, { text: 'Add them to the cauldron.', done: { flag: 'edge:jrohn' } } ],
    rewards: [ { give: { shrooms: 1 }, text: 'Jrohn will be very relaxed.' } ] },
  castle_throne: { name: 'The empty throne', giver: 'throne', release: 'wed',
    steps: [ { text: 'Decide what to do with Löken\'s throne.', done: { flag: 'throne:done' } } ],
    rewards: [ { text: 'Done. Everybody will hear about it.' } ] },
  rave_dj: { name: 'Off the beat', giver: 'bar', release: 'tue',
    steps: [ { text: 'Get a glow stick from the bar.', done: { flag: 'got:glow' } }, { text: 'Give the DJ a reason (after dark).', done: { flag: 'edge:bigwman' } } ],
    rewards: [ { give: { coke: 1 }, text: 'BigWman will lose count.' } ] }
},

/* props: things you can tap that are not people: puzzle pieces, tees, fishing spots, day events. at = tile, em = icon.
   minigame: 'fishing' (catch = [[creature, weight]], lv = [min, max]) or 'golf' (hole). Others use dialogue[id] like a person (repeat: true = may repeat lines).
   show = conditions for when it is there (day, night …). Every prop has dialogue/quests like any person. */
props: {
  pier: { name: 'The pier', at: [23, 2], em: '🎣', minigame: 'fishing', catch: [['perch', 5], ['pike', 2], ['crayfish', 2]], lv: [6, 9], junk: 'A boot. Size 46. Smells like Löken.', cooldown: 20 },
  lakespot: { name: 'A fishing spot', at: [66, 18], em: '🎣', minigame: 'fishing', catch: [['pike', 4], ['crayfish', 3], ['perch', 2], ['mantis', 1]], lv: [30, 36], junk: 'A shopping trolley. It is not alive. Not yet.', cooldown: 20, release: 'tue' },
  tee1: { name: 'Tee 1', at: [58, 36], em: '⛳', minigame: 'golf', hole: { name: 'Hole 1: over the pond', distance: 140, par: 3 }, release: 'tue' },
  kb1: { name: '8 kg kettlebell', at: [39, 12], em: '🏋️', release: 'mon' }, kb2: { name: '16 kg kettlebell', at: [40, 14], em: '🏋️', release: 'mon' }, kb3: { name: '24 kg kettlebell', at: [43, 14], em: '🏋️', release: 'mon' }, rower: { name: 'The rower', at: [42, 12], em: '🚣', release: 'mon' },
  fuse1: { name: 'A drawer', at: [101, 33], em: '🗄️', release: 'tue' }, fuse2: { name: 'A toolbox', at: [107, 36], em: '🧰', release: 'tue' }, fuse3: { name: 'A shelf', at: [110, 34], em: '📚', release: 'tue' }, fusebox: { name: 'The fuse box', at: [104, 33], em: '🔲', release: 'tue' },
  fern: { name: 'A fern', at: [136, 24], em: '🌿', release: 'tue' }, mush: { name: 'A mushroom', at: [145, 27], em: '🍄', release: 'tue' }, moss: { name: 'Moss', at: [136, 28], em: '🪨', release: 'tue' }, cauldron: { name: 'The cauldron', at: [141, 24], em: '🍲', release: 'tue' },
  throne: { name: 'The throne', at: [141, 6], em: '👑', release: 'wed' },
  bar: { name: 'The bar', at: [139, 64], em: '🍹', release: 'tue' }, dj: { name: 'The DJ booth', at: [148, 64], em: '🎧', release: 'tue' },
  camper: { name: 'A camper van', at: [121, 58], em: '🚐', release: 'tue' },
  alley: { name: 'A city alley', at: [92, 43], em: '🗑️', show: { night: true }, release: 'tue' },
  balloons: { name: 'Balloon stand', at: [27, 47], em: '🎈', show: { day: 'mon' }, release: 'mon' },
  wallet: { name: 'A lost wallet', at: [30, 18], em: '👛', show: { day: 'wed' }, release: 'wed' },
  /* hidden stashes: search the cover objects (stone, tyre, bin …). Each gives one thing once, then the cover object disappears. Max 1 of each drug on the whole map. */
  stash_weed: { name: 'A flat stone', at: [11, 53], em: '🪨', show: { notFlag: 'got:stash_weed' }, stash: true, release: 'mon' },
  stash_coins1: { name: 'A flat tyre', at: [22, 62], em: '🛞', show: { notFlag: 'got:stash_coins1' }, stash: true, release: 'mon' },
  stash_coins2: { name: 'A shopping trolley', at: [28, 50], em: '🛒', show: { notFlag: 'got:stash_coins2' }, stash: true, release: 'mon' },
  stash_speed: { name: 'A rusty tyre', at: [34, 59], em: '🛞', show: { notFlag: 'got:stash_speed' }, stash: true, release: 'tue' },
  stash_molly: { name: 'A bin behind the cars', at: [5, 57], em: '🗑️', show: { notFlag: 'got:stash_molly' }, stash: true, release: 'tue' },
  stash_keta: { name: 'A cooler box', at: [41, 59], em: '🧊', show: { notFlag: 'got:stash_keta' }, stash: true, release: 'tue' },
  stash_shrooms: { name: 'A fallen log', at: [30, 12], em: '🪵', show: { notFlag: 'got:stash_shrooms' }, stash: true, release: 'tue' },
  stash_lsd: { name: 'A golf bag', at: [60, 30], em: '⛳', show: { notFlag: 'got:stash_lsd' }, stash: true, release: 'tue' },
  stash_dmt: { name: 'A hollow stump', at: [66, 60], em: '🌳', show: { notFlag: 'got:stash_dmt' }, stash: true, release: 'wed' }

},

/* minigames: numbers only. fishing: rounds you need to win out of rounds, zone = size of the green part (0-1), speed = how fast the marker swings. golf: maxCarry metres at full power, window = how forgiving the green zone is, cup = how close is "in" */
minigames: {
  fishing: { rounds: 3, need: 2, zone: .24, speed: 1.2 },
  golf: { maxCarry: 100, maxStrokes: 6, window: .09, cup: 5, speed: 1.1 }
},

/* rumours: what gossipy people repeat, per release day (people with  rumours: true  in their dialogue). They end up in 📓 Notes. */
rumours: {
  mon: ['Somebody saw a van with no driver outside ICA.', 'Pelle says the bottle machines are humming a new tune.', 'Berit locked the self-checkout. From the inside.'],
  tue: ['The golf course is open again. Nobody knows why.', 'A shaman is selling herbs in the mountain. Or buying them.', 'The big lake rose three tiles last night.'],
  wed: ['Boat-Bengt is trading boats for vans. Two vans. Maybe three.', 'The castle drawbridge creaks at night.', 'Löken dropped 400 kr on the way home. Again.']
},

/* ---------- small pixel sprites (char grids, see PX.palette: o navy, c cream, g/G/d greys, k black, w white …) ---------- */
sprites: {
  tomb: { grid: [
    '...oooooo...', '..oGGGGGGo..', '.oGGwwwwGGo.', '.oGGGGGGGGo.', '.oGgGGGGgGo.', '.oGGggggGGo.', '.oGGGGGGGGo.', '.oGgggggggo.', '.oGGGGGGGGo.',
    '.oGGGGGGGGo.', 'oogggggggggoo'.slice(0, 12), 'oeeEeeeeEeeo', '.oooooooooo.'] },
  minicat: { grid: [['o..o....', 'owwo....', 'owbwo..o', 'owwwwoow', '.owwwwwo', '.owowowo', '..o.o.o.'], ['o..o....', 'owwo....', 'owbwo...', 'owwwwooo', '.owwwwwo', '.owowowo', '..o.o.o.']], fps: 2, anims: { idle: [0, 0, 0, 1] } }
},

/* ---------- the paper doll: rect layers per view, in a 12 x 20 box (feet at the bottom). [x, y, w, h, colourKey]
   colour keys: skin hair top top2 legs shoes arm cap cap2 beard (or any #hex). ---------- */
dollParts: (() => {
  const S = 'skin', H = 'hair';
  const legs = { base: [[3, 14, 3, 5, 'legs'], [6, 14, 3, 5, 'legs'], [3, 19, 3, 1, 'shoes'], [6, 19, 3, 1, 'shoes']], skirt: [[3, 14, 3, 5, S], [6, 14, 3, 5, S], [3, 19, 3, 1, 'shoes'], [6, 19, 3, 1, 'shoes']], gown: [[1, 13, 10, 7, 'top'], [0, 18, 12, 2, 'top']] };
  const body = { base: [[2, 8, 8, 6, 'top']], big: [[1, 8, 10, 6, 'top']], dress: [[2, 8, 8, 6, 'top'], [2, 13, 8, 3, 'top']] };
  const pattern = { stripe: [[2, 9, 8, 1, 'top2'], [2, 11, 8, 1, 'top2'], [2, 13, 8, 1, 'top2']], plaid: [[4, 8, 1, 6, 'top2'], [7, 8, 1, 6, 'top2'], [2, 10, 8, 1, 'top2'], [2, 12, 8, 1, 'top2']],
    armor: [[2, 8, 8, 1, '#e6ebf1'], [5, 9, 2, 4, '#8d96a3'], [2, 13, 8, 1, '#6d5a3a']], blazer: [[5, 8, 2, 5, 'top2']], necklace: [[4, 9, 4, 1, '#d8d8e0']] };
  const arms = { base: [[1, 9, 1, 4, 'arm'], [10, 9, 1, 4, 'arm'], [1, 13, 1, 1, S], [10, 13, 1, 1, S]], big: [[0, 9, 1, 4, 'arm'], [11, 9, 1, 4, 'arm'], [0, 13, 1, 1, S], [11, 13, 1, 1, S]] };
  const head = { base: [[3, 1, 6, 7, S]] };
  const eye = '#1a1a22', mouth = '#b5574b';
  const faceD = { base: [[4, 4, 1, 1, eye], [7, 4, 1, 1, eye], [5, 6, 2, 1, mouth]] }, faceS = { base: [[3, 4, 1, 1, eye], [4, 6, 2, 1, mouth]] };
  const extrasD = { glasses: [[3, 4, 3, 1, 'rgba(20,20,30,.75)'], [6, 4, 3, 1, 'rgba(20,20,30,.75)']], beard: [[3, 6, 6, 2, 'beard'], [5, 6, 2, 1, mouth]], stache: [[4, 5, 4, 1, '#3a2414']], patch: [[6, 3, 3, 2, '#111'], [3, 3, 6, 1, '#111']], freckles: [[4, 5, 1, 1, '#c98a66'], [7, 5, 1, 1, '#c98a66']] };
  const extrasS = { glasses: [[2, 4, 4, 1, 'rgba(20,20,30,.75)']], beard: [[3, 6, 5, 2, 'beard'], [4, 6, 2, 1, mouth]], stache: [[3, 5, 3, 1, '#3a2414']], patch: [[3, 3, 6, 1, '#111']], freckles: [[3, 5, 1, 1, '#c98a66']] };
  const hairD = { bald: [[3, 1, 6, 1, 'rgba(255,255,255,.25)']], short: [[3, 0, 6, 2, H], [2, 1, 1, 3, H], [9, 1, 1, 3, H]], cap: [[2, 0, 8, 2, 'cap'], [3, 1, 6, 1, 'cap2'], [2, 2, 5, 1, 'cap']],
    bob: [[2, 0, 8, 2, H], [2, 2, 1, 6, H], [9, 2, 1, 6, H]], long: [[2, 0, 8, 2, H], [1, 2, 2, 10, H], [9, 2, 2, 10, H], [0, 6, 1, 5, H], [11, 6, 1, 5, H]], straight: [[2, 0, 8, 2, H], [1, 2, 2, 10, H], [9, 2, 2, 10, H]],
    updo: [[3, 0, 6, 2, H], [2, 1, 1, 3, H], [9, 1, 1, 3, H], [4, -2, 4, 2, H], [2, 4, 1, 3, H], [9, 4, 1, 3, H]], messy: [[2, -1, 8, 3, H], [1, 1, 1, 6, H], [10, 1, 1, 6, H], [3, -2, 2, 1, H], [7, -2, 2, 1, H]], hat: [[1, 0, 10, 2, H], [3, -2, 6, 2, H]] };
  const hairU = Object.assign({}, hairD, { short: [[3, 0, 6, 6, H], [2, 1, 1, 3, H], [9, 1, 1, 3, H]], cap: [[2, 0, 8, 2, 'cap'], [3, 1, 6, 1, 'cap2'], [3, 2, 6, 4, H]], bob: [[2, 0, 8, 8, H]], long: [[2, 0, 8, 12, H], [1, 2, 2, 10, H], [9, 2, 2, 10, H]], straight: [[2, 0, 8, 12, H], [1, 2, 2, 10, H], [9, 2, 2, 10, H]] });
  const hairS = Object.assign({}, hairD, { cap: [[2, 0, 8, 2, 'cap'], [3, 1, 6, 1, 'cap2'], [0, 2, 5, 1, 'cap']] });
  const prop = { clip: [[10, 10, 3, 4, '#2c9a5a'], [11, 11, 1, 2, '#bff5d2']], plant: [[10, 11, 3, 3, '#8a4f2a'], [10, 8, 3, 3, '#3f9a3a']], shield: [[-1, 8, 4, 6, '#2b56b0'], [0, 9, 2, 4, '#f5c518']],
    bow: [[10, 6, 1, 12, '#8a5a2b'], [11, 7, 1, 10, 'rgba(255,255,255,.5)'], [10, 10, 1, 1, '#f7931a']], bouquet: [[4, 10, 4, 3, '#f3a6a6'], [5, 13, 2, 2, '#5fae3e'], [4, 10, 1, 1, '#f7c99a']],
    clutch: [[0, 12, 3, 2, '#a01c22']], tablet: [[10, 8, 3, 4, '#cfe8f3'], [-1, 12, 3, 1, '#e8eef3']], wine: [[10, 8, 2, 2, '#8a1020'], [10, 10, 2, 1, 'rgba(255,255,255,.6)'], [10, 11, 1, 2, 'rgba(255,255,255,.6)']],
    bag: [[10, 11, 3, 4, '#e8eef3']], apron: [[3, 9, 6, 5, '#f4f4f4']] };
  const view = (face, extras, hair, pat) => ({ legs, body, top: pat, arms, head, face, glasses: { base: extras.glasses }, beard: { base: extras.beard }, stache: { base: extras.stache }, patch: { base: extras.patch }, freckles: { base: extras.freckles }, hair, prop });
  return {
    down: view(faceD, extrasD, hairD, pattern),
    up: view({}, {}, hairU, { stripe: pattern.stripe, plaid: pattern.plaid, armor: pattern.armor }),
    side: view(faceS, extrasS, hairS, pattern)
  };
})()
};
