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
  PTS: { item: 2500, species: 2000, speciesMax: 20, hero: 30000, partner: 4000, dev: 50000, egg: 50000 }  // goals only, max 300 000. Levels give no points
},

/* ---------- types: each beats the next one in the list (×strong), loses to the previous (×weak). MIND is neutral ---------- */
types: {
  cycle: ['FIZZ', 'GRUB', 'WILD', 'TECH', 'FROST', 'RUSTLE'], strong: 1.5, weak: .67,
  colors: { FIZZ: '#e8b820', GRUB: '#5fae3e', WILD: '#c0692e', TECH: '#2fa3d8', FROST: '#7fd3f0', RUSTLE: '#9b8fb8', MIND: '#e05cc4', NONE: '#9aa4ad' }
},

/* ---------- moves. p = power (0 = status), acc, hits, stun (chance), self/foe = stat stages, say = extra line, special = scripted ---------- */
moves: {
  slam: { name: 'Body Slam', type: null, p: 40 },
  foam: { name: 'Foam Spray', type: 'FIZZ', p: 45 }, can: { name: 'Can Toss', type: 'FIZZ', p: 55 }, burp: { name: 'Burp Blast', type: 'FIZZ', p: 75, acc: .88 },
  pickle: { name: 'Pickle Breath', type: 'GRUB', p: 50 }, dill: { name: 'Dill Whip', type: 'GRUB', p: 72, acc: .9 },
  frz: { name: 'Freezer Burn', type: 'FROST', p: 50 }, peas: { name: 'Pea Avalanche', type: 'FROST', p: 72, acc: .9 },
  wonky: { name: 'Wonky Wheel', type: 'RUSTLE', p: 95, acc: .62, say: 'The wheel spins the wrong way!' }, rattle: { name: 'Rattle', type: 'RUSTLE', p: 45 },
  unexp: { name: 'Unexpected Item', type: 'TECH', p: 30, stun: .5, say: 'UNEXPECTED ITEM IN BAGGING AREA.' }, beep: { name: 'Error Beep', type: 'TECH', p: 58 },
  sugar: { name: 'Sugar Rush', type: 'GRUB', p: 0, self: { spd: 2 } }, goo: { name: 'Sticky Goo', type: 'GRUB', p: 52 },
  flutter: { name: 'Flutter', type: 'RUSTLE', p: 42 }, wrap: { name: 'Bag Wrap', type: 'RUSTLE', p: 62 },
  cin: { name: 'Cinnamon Wrap', type: 'GRUB', p: 55, foe: { spd: -1 } },
  bargain: { name: 'BARGAIN!', type: 'RUSTLE', p: 0, foe: { def: -2 }, say: 'An ear-splitting scream about prices!' }, price: { name: 'Price Cut', type: 'RUSTLE', p: 62 },
  peck: { name: 'Pant Peck', type: 'WILD', p: 52 }, charge: { name: 'Fast Charge', type: 'TECH', p: 0, self: { atk: 2 } }, zap: { name: 'Plug Zap', type: 'TECH', p: 62 },
  patty: { name: 'Double Patty', type: 'GRUB', p: 36, hits: 2 }, hug: { name: 'Bear Hug', type: 'WILD', p: 66 },
  swarm: { name: 'Swarm', type: 'WILD', p: 18, hits: 4 }, tonic: { name: 'Tonic Wish', type: 'FIZZ', p: 0, self: { def: 1 }, heal: .3 },
  stare: { name: 'Smoky Stare', type: 'FIZZ', p: 0, foe: { atk: -2 } }, drowsy: { name: 'Drowsy', type: 'MIND', p: 20, stun: .6, say: 'A sticky, sleepy cloud…' },
  garlic: { name: 'Garlic Sauce', type: 'GRUB', p: 60 }, wasabi: { name: 'Wasabi Kick', type: 'FROST', p: 64 }, trim: { name: 'Trim', type: 'WILD', p: 40, foe: { atk: -1 } },
  bite: { name: 'Lake Bite', type: 'WILD', p: 85, acc: .85 }, card: { name: 'Golden Member Card', type: 'MIND', p: 70 },
  fetch: { name: 'Fetch!', type: 'WILD', p: 55 }, knock: { name: 'Knock It Off The Shelf', type: 'RUSTLE', p: 60, foe: { def: -1 } },
  curse: { name: 'Forgotten Item', type: 'MIND', p: 70, say: 'You forgot the milk. Again.' }, neon: { name: 'Neon Antlers', type: 'WILD', p: 80, stun: .3 },
  receipt: { name: 'Endless Receipt', type: 'RUSTLE', p: 24, hits: 4 }, seed: { name: 'Seed Phrase', type: 'MIND', p: 95, acc: .9, say: 'Twelve words echo. You forgot all of them.' },
  ferry: { name: 'Ferry', type: 'WILD', p: 0, say: 'It paddles on, steady as a ferry.' },   // a creature that knows this can carry you over the big lake (once someone has taught you)
  // heroes and wives as party members
  yes: { name: 'YES!', type: 'MIND', p: 0, self: { atk: 2 } }, lights: { name: 'Lights Out', type: 'TECH', p: 40, stun: .5 }, love: { name: 'I Love This!', type: 'MIND', p: 0, heal: .4 },
  stick: { name: 'Stick Together', type: 'WILD', p: 30, hits: 3 }, dip: { name: 'Buy the Dip', type: 'MIND', p: 90, acc: .5 }, guilt: { name: 'Guilt Trip', type: 'MIND', p: 55, foe: { def: -1 } },
  // Dev Ljunky + AI-Ljunky
  patch: { name: 'Patch Notes', type: 'MIND', p: 0, special: 'patch' }, hotfix: { name: 'Hotfix', type: 'MIND', p: 0, special: 'hotfix' },
  spawn: { name: 'Spawn Bug', type: 'MIND', p: 0, special: 'spawn' }, rage: { name: 'Rage Quit', type: 'MIND', p: 110, special: 'rage' }, glitch: { name: 'Glitch Slap', type: 'MIND', p: 62 }
},

/* ---------- creatures. stats = [HP, ATK, DEF, SPD]. moves = [[move, learn level]]. rarity C U R E(epic) L M(mythic) H(person)
   art = 48x48 PNG (transparent). likes = an item id or lure tag; sacrificing a matching item at its grave brings it back.
   needs: 'reveal' = only appears while something reveals it (magic mushrooms). trapOnly: item id = can only be caught from that trap. ---------- */
creatures: {
  frog: { no: 1, name: 'Folköl Frog', type: 'FIZZ', rarity: 'C', stats: [56, 56, 50, 62], moves: [['foam', 1], ['slam', 1], ['can', 8], ['burp', 13]], desc: 'A frog with a can for a body. Foams when nervous.', art: 'assets/creatures/frog.png', likes: 'FIZZ', release: 'mon' },
  cuke: { no: 2, name: 'Cucumber Dragon', type: 'GRUB', rarity: 'C', stats: [60, 60, 52, 54], moves: [['pickle', 1], ['slam', 1], ['dill', 9], ['peck', 14]], desc: 'Breathes pickle. Votes AIK.', art: 'assets/creatures/cuke.png', likes: 'GRUB', release: 'mon' },
  peng: { no: 3, name: 'Freezer Penguin', type: 'FROST', rarity: 'C', stats: [64, 52, 62, 46], moves: [['frz', 1], ['slam', 1], ['peas', 9], ['flutter', 14]], desc: 'Wrapped in frozen peas. Never thaws.', art: 'assets/creatures/peng.png', likes: 'FROST', release: 'mon' },
  golem: { no: 4, name: 'Trolley Golem', type: 'RUSTLE', rarity: 'U', stats: [72, 74, 72, 30], moves: [['rattle', 1], ['wonky', 1], ['slam', 6]], desc: 'One wheel always spins the wrong way.', art: 'assets/creatures/golem.png', likes: 'RUSTLE', release: 'mon' },
  ghost: { no: 5, name: 'Self-scan Ghost', type: 'TECH', rarity: 'U', stats: [50, 60, 48, 72], moves: [['beep', 1], ['unexp', 1], ['zap', 12]], desc: 'Please place the item in the bagging area.', art: 'assets/creatures/ghost.png', likes: 'TECH', release: 'mon' },
  slime: { no: 6, name: 'Pick-and-mix Slime', type: 'GRUB', rarity: 'C', stats: [62, 50, 56, 50], moves: [['goo', 1], ['sugar', 1], ['pickle', 10]], desc: '7.90 kr per hectogram. Sticky.', art: 'assets/creatures/slime.png', likes: 'GRUB', release: 'mon' },
  bat: { no: 7, name: 'Plastic-bag Bat', type: 'RUSTLE', rarity: 'C', stats: [46, 52, 42, 70], moves: [['flutter', 1], ['wrap', 6], ['peck', 12]], desc: 'Costs 2 kr. Lives forever.', art: 'assets/creatures/bat.png', likes: 'RUSTLE', release: 'mon' },
  mummy: { no: 8, name: 'Cinnamon-bun Mummy', type: 'GRUB', rarity: 'U', stats: [70, 62, 64, 40], moves: [['cin', 1], ['slam', 1], ['dill', 11]], desc: 'Baked in 1987. Still warm.', art: 'assets/creatures/mummy.png', likes: 'buns', release: 'mon' },
  banshee: { no: 9, name: 'Bargain Banshee', type: 'RUSTLE', rarity: 'U', stats: [54, 64, 46, 66], moves: [['bargain', 1], ['price', 1], ['wrap', 10]], desc: 'Screams when something is 3 for 2.', art: 'assets/creatures/banshee.png', likes: 'RUSTLE', release: 'mon' },
  fly: { no: 10, name: 'Fruit-fly Swarm', type: 'WILD', rarity: 'C', stats: [44, 58, 40, 74], moves: [['swarm', 1], ['peck', 6]], desc: 'Arrived with the bananas. Never left.', art: 'assets/creatures/fly.png', likes: 'WILD', release: 'tue' },
  crow: { no: 11, name: 'Bottle-return Crow', type: 'WILD', rarity: 'C', stats: [52, 62, 46, 68], moves: [['peck', 1], ['can', 5], ['flutter', 10]], desc: 'Steals cans. Returns them. Keeps the 1 kr.', art: 'assets/creatures/crow.png', likes: 'WILD', release: 'mon' },
  genie: { no: 12, name: 'Gin Genie', type: 'FIZZ', rarity: 'R', stats: [58, 66, 54, 70], moves: [['tonic', 1], ['foam', 1], ['burp', 10]], desc: 'Grants three wishes. All of them are tonic.', art: 'assets/creatures/genie.png', likes: 'FIZZ', release: 'tue' },
  owl: { no: 13, name: 'Whisky Owl', type: 'FIZZ', rarity: 'R', stats: [64, 70, 62, 52], moves: [['stare', 1], ['peck', 1], ['can', 10]], desc: 'Peated. Judges your life choices.', art: 'assets/creatures/owl.png', likes: 'FIZZ', release: 'tue' },
  snail: { no: 14, name: 'Cough-syrup Snail', type: 'MIND', rarity: 'U', stats: [66, 48, 70, 30], moves: [['drowsy', 1], ['goo', 1], ['slam', 8]], desc: 'Take two spoons. Then take a nap.', art: 'assets/creatures/snail.png', likes: 'shrooms', release: 'tue' },
  snake: { no: 15, name: 'Charging-cable Snake', type: 'TECH', rarity: 'U', stats: [56, 66, 50, 64], moves: [['zap', 1], ['charge', 1], ['beep', 9]], desc: 'Always the wrong plug.', art: 'assets/creatures/snake.png', likes: 'TECH', release: 'mon' },
  bear: { no: 16, name: 'Burger Bear', type: 'GRUB', rarity: 'U', stats: [78, 70, 62, 38], moves: [['patty', 1], ['hug', 1], ['slam', 8]], desc: 'Sesame-seed ears. Smells amazing.', art: 'assets/creatures/bear.png', likes: 'GRUB', release: 'mon' },
  lizard: { no: 17, name: 'Kebab-pizza Lizard', type: 'GRUB', rarity: 'U', stats: [66, 68, 56, 54], moves: [['garlic', 1], ['slam', 1], ['dill', 10]], desc: 'Extra sauce. Extra spines.', art: 'assets/creatures/lizard.png', likes: 'GRUB', release: 'tue' },
  salmon: { no: 18, name: 'Salmon Roll', type: 'FROST', rarity: 'U', stats: [58, 64, 58, 60], moves: [['wasabi', 1], ['frz', 1], ['peas', 10]], desc: 'Walks on chopsticks. Hates soy sauce.', art: 'assets/creatures/salmon.png', likes: 'FROST', release: 'tue' },
  moth: { no: 19, name: 'Moustache Moth', type: 'WILD', rarity: 'R', stats: [52, 64, 50, 76], moves: [['trim', 1], ['flutter', 1], ['peck', 9]], desc: 'Lives in barber shops. Eats wax.', art: 'assets/creatures/moth.png', likes: 'WILD', release: 'tue' },
  pike: { no: 20, name: 'Pikezilla', type: 'WILD', rarity: 'R', stats: [80, 82, 64, 56], moves: [['bite', 1], ['slam', 1], ['ferry', 30]], desc: 'The king of the lake. Wears reeds like a crown.', art: 'assets/creatures/pike.png', likes: 'WILD', release: 'tue' },
  loyal: { no: 21, name: 'The Loyal Customer', type: 'MIND', rarity: 'L', stats: [86, 80, 76, 70], moves: [['card', 1], ['slam', 1], ['tonic', 1]], desc: 'Has collected stamps since 1972.', art: 'assets/creatures/loyal.png', likes: 'buns', release: 'tue', requires: 'loyalReady' },
  walter: { no: 22, name: 'Walter', type: 'WILD', rarity: 'R', stats: [60, 66, 52, 80], moves: [['fetch', 1], ['peck', 1]], desc: 'Jrohn\'s dog. Ran away again.', art: 'assets/creatures/walter.png', likes: 'buns', release: 'tue' },
  cat: { no: 23, name: 'The Cats', type: 'RUSTLE', rarity: 'R', stats: [56, 70, 50, 78], moves: [['knock', 1], ['peck', 1]], desc: 'Ljunky\'s. They knock things off shelves on purpose.', art: 'assets/creatures/cat.png', likes: 'WILD', release: 'tue' },
  // EPIC: only while magic mushrooms reveal them
  lich: { no: 30, name: 'Shopping-list Lich', type: 'MIND', rarity: 'E', stats: [84, 84, 72, 64], moves: [['curse', 1], ['glitch', 1]], desc: 'Every item you ever forgot. Alive.', art: 'assets/creatures/lich.png', likes: 'shrooms', needs: 'reveal', release: 'tue' },
  elk: { no: 31, name: 'Neon Shroom Elk', type: 'WILD', rarity: 'E', stats: [90, 86, 68, 66], moves: [['neon', 1], ['hug', 1]], desc: 'Only visible to the enlightened. Or the very high.', art: 'assets/creatures/elk.png', likes: 'shrooms', needs: 'reveal', release: 'tue' },
  serpent: { no: 32, name: 'Receipt Serpent', type: 'RUSTLE', rarity: 'E', stats: [80, 78, 66, 76], moves: [['receipt', 1], ['wrap', 1]], desc: '14 metres long. You do not want a copy.', art: 'assets/creatures/serpent.png', likes: 'shrooms', needs: 'reveal', release: 'tue' },
  // MYTHIC: spawns after the grave reward, only caught with the Mythic Trap
  wraith: { no: 40, name: 'Cold Wallet Wraith', type: 'MIND', rarity: 'M', stats: [96, 92, 80, 80], moves: [['seed', 1], ['glitch', 1], ['hotfix', 12]], desc: 'Holds 3,000 bitcoin. Forgot the password.', art: 'assets/creatures/wraith.png', likes: 'mythicTrap', trapOnly: 'mythicTrap', release: 'wed', requires: 'mythicSpawned' }
},

/* ---------- people as fighters (bosses you can catch, wives, NPCs). look = paper-doll spec, see dollParts ---------- */
heroes: {
  bigwman: { name: 'BigWman', col: '#3ddc84', team: ['bat', 'banshee', 'ghost'], at: [9, 44], ult: 'YES!', ultTxt: '+50 % ATK for the whole party for 3 turns', after: 'I need to update the spreadsheet. YES… no.',
    stats: [80, 72, 74, 46], moves: [['yes', 1], ['slam', 1], ['hug', 8]], likes: 'beer6', epitaph: 'Balanced the budget. Not the life.',
    look: { skin: '#e9b48c', hair: null, style: 'bald', top: '#1d1d24', topStyle: 'tee', legs: '#3d5f92', shoes: '#6b4a2b', prop: 'clip', big: 1 } },
  wizcudi: { name: 'Wizcudi', col: '#8c6cff', team: ['snake', 'ghost', 'peng'], at: [41, 54], ult: 'Lights Out', ultTxt: 'the enemy misses 2 turns', after: 'Fine. But turn the light off on your way out.',
    stats: [64, 70, 60, 74], moves: [['lights', 1], ['zap', 1], ['beep', 8]], likes: 'beer6', epitaph: 'Finally, the lights are off.',
    look: { skin: '#e9b48c', hair: '#5a3a22', style: 'short', beard: '#5a3a22', glasses: 1, top: '#1d1d24', top2: '#f5c518', topStyle: 'stripe', legs: '#3d5f92', shoes: '#333' } },
  jrohn: { name: 'Jrohn', col: '#ff4fa3', team: ['cuke', 'slime', 'bear'], at: [29, 32], ult: 'I Love This!', ultTxt: 'heals the party 50 % and charms the enemy', after: 'I LOVE THIS! Losing, I mean. Hug?',
    stats: [70, 64, 58, 70], moves: [['love', 1], ['hug', 1], ['dill', 8]], likes: 'beer6', epitaph: 'Here lies Jrohn. Shirt not included.',
    look: { skin: '#e9b48c', hair: '#6b4226', style: 'short', top: '#4f6e3a', top2: '#2e4424', topStyle: 'plaid', legs: '#6b6247', shoes: '#4a3220', prop: 'plant' } },
  loken: { name: 'Löken', col: '#f5c242', team: ['crow', 'golem', 'bear'], at: [24, 14], ult: 'Stick Together, Boys!', ultTxt: 'every creature in the party attacks at once', after: 'Good fight. Now get off the lawn. Gently.',
    stats: [76, 70, 78, 48], moves: [['stick', 1], ['slam', 1], ['rattle', 8]], likes: 'beer6', epitaph: 'Stuck together. Alone, for once.',
    look: { skin: '#e9b48c', hair: '#8a5a2b', style: 'cap', cap: '#f5c518', cap2: '#1d1d24', beard: '#8a5a2b', top: '#b9c1cc', topStyle: 'armor', legs: '#5a4a30', shoes: '#4a3220', prop: 'shield' } },
  ljunky: { name: 'Ljunky', col: '#f7931a', team: ['frog', 'mummy', 'snake'], at: [41, 12], ult: 'Buy the Dip', ultTxt: '50 %: double damage. 50 %: zero.', after: 'Unrealised loss. It does not count.',
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
  meatballs: { kind: 'throwable', name: 'Frozen meatballs', em: '🧆', price: 12, hit: .8, throw: [{ type: 'damage', value: 16, vs: { FROST: 2.5 } }], learnedNote: 'Very strong against FROST.', release: 'mon' },
  surstromming: { kind: 'throwable', name: 'Surströmming can', em: '🥫', price: 18, hit: 1, area: true, throw: [{ type: 'flee', vs: 'WILD', chance: .5 }, { type: 'stun', turns: 1 }, { type: 'catchBonus', value: .4, turns: 3 }], learnedNote: 'WILD ones may flee. Everything else is dazed.', release: 'mon' },
  banana: { kind: 'throwable', name: 'Banana peel', em: '🍌', price: 5, hit: .9, throw: [{ type: 'loseTurn', turns: 1 }], learnedNote: 'They slip and lose a turn.', release: 'mon' },
  // for the women (sold by Flower Fia)
  bouquet: { kind: 'throwable', name: 'Chlorine bouquet', em: '💐', price: 25, hit: .9, wife: true, throw: [{ type: 'stun', turns: 2 }, { type: 'calm', value: 20 }], learnedNote: 'Sneezing fit. Stunned for 2 turns.', release: 'mon' },
  glitter: { kind: 'throwable', name: 'Glitter bomb', em: '✨', price: 20, hit: .95, wife: true, throw: [{ type: 'blind', value: .35, turns: 3 }, { type: 'calm', value: 15 }], learnedNote: 'Blinded. Her aim gets worse.', release: 'mon' },
  giftcard: { kind: 'throwable', name: 'Gift card', em: '🎁', price: 40, hit: 1, wife: true, throw: [{ type: 'catchBonus', value: .6, turns: 3 }, { type: 'loseTurn', turns: 1 }, { type: 'calm', value: 30 }], learnedNote: 'Distracted. Easier to catch.', release: 'mon' },
  ringbox: { requires: 'know:ring', kind: 'throwable', name: 'Ring box', em: '💍', price: 250, hit: 1, wife: true, throw: [{ type: 'calm', value: 60 }, { type: 'promiseDebt', value: 1 }], learnedNote: 'Big calm. Adds promise debt.', release: 'mon' },
  chores: { kind: 'throwable', name: 'Chore chart', em: '📋', price: 8, hit: 1, wife: true, throw: [{ type: 'anger', value: 30 }], learnedNote: 'Backfires. She gets angrier.', release: 'mon' },
  // traps: place one on the map; after waitMin real minutes a dazed creature that likes the lure may sit in it
  fizzMk1: { kind: 'trap', name: 'Open energy drink', em: '⚡', price: 30, lure: 'FIZZ', tier: 1, waitMin: 3, catchBonus: .3, rare: [['genie', 4], ['owl', 4]], learnedNote: 'Attracts FIZZ.', release: 'mon' },
  grubMk1: { kind: 'trap', name: 'Half-eaten kebab', em: '🥙', price: 30, lure: 'GRUB', tier: 1, waitMin: 3, catchBonus: .3, rare: [['lizard', 5]], learnedNote: 'Attracts GRUB.', release: 'mon' },
  wildMk1: { kind: 'trap', name: 'Laser pointer', em: '🔴', price: 30, lure: 'WILD', tier: 1, waitMin: 3, catchBonus: .3, rare: [['cat', 6], ['walter', 4]], learnedNote: 'Attracts WILD.', release: 'mon' },
  techMk1: { kind: 'trap', name: 'Charger in the wall', em: '🔌', price: 30, lure: 'TECH', tier: 1, waitMin: 3, catchBonus: .3, learnedNote: 'Attracts TECH.', release: 'tue' },
  frostMk1: { kind: 'trap', name: 'Freezer door left open', em: '🧊', price: 30, lure: 'FROST', tier: 1, waitMin: 3, catchBonus: .3, rare: [['salmon', 5]], learnedNote: 'Attracts FROST.', release: 'tue' },
  rustleMk1: { kind: 'trap', name: 'Crisp bag', em: '🥔', price: 30, lure: 'RUSTLE', tier: 1, waitMin: 3, catchBonus: .3, learnedNote: 'Attracts RUSTLE.', release: 'tue' },
  saleSign: { kind: 'trap', name: '"70 % off" sign', em: '🏷️', price: 45, lure: 'WIFE', tier: 1, waitMin: 4, catchBonus: .3, learnedNote: 'Attracts wives.', release: 'tue' },
  samples: { kind: 'trap', name: 'Free-sample stand with bubbly', em: '🥂', price: 60, lure: 'WIFE', tier: 2, waitMin: 3, catchBonus: .5, learnedNote: 'Attracts wives. They stay longer.', release: 'wed' },
  fizzMk2: { kind: 'trap', name: 'Energy drink Mk2', em: '⚡', price: 70, lure: 'FIZZ', tier: 2, waitMin: 2, catchBonus: .5, rare: [['genie', 10], ['owl', 10]], learnedNote: 'Faster, rarer FIZZ.', release: 'wed' },
  fizzMk3: { kind: 'trap', name: 'Energy drink Mk3', em: '⚡', price: 140, lure: 'FIZZ', tier: 3, waitMin: 1, catchBonus: .8, rare: [['genie', 20], ['owl', 20], ['loyal', 2]], learnedNote: 'Fastest. Rare ones love it.', release: 'wed' },
  grubMk2: { kind: 'trap', name: 'Kebab Mk2 (extra sauce)', em: '🥙', price: 70, lure: 'GRUB', tier: 2, waitMin: 2, catchBonus: .5, rare: [['lizard', 12]], learnedNote: 'Faster, rarer GRUB.', release: 'wed' },
  grubMk3: { kind: 'trap', name: 'Kebab Mk3 (everything on it)', em: '🥙', price: 140, lure: 'GRUB', tier: 3, waitMin: 1, catchBonus: .8, rare: [['lizard', 20], ['loyal', 2]], learnedNote: 'Fastest. Rare ones love it.', release: 'wed' },
  wildMk2: { kind: 'trap', name: 'Laser pointer Mk2', em: '🔴', price: 70, lure: 'WILD', tier: 2, waitMin: 2, catchBonus: .5, rare: [['cat', 12], ['walter', 10], ['moth', 8]], learnedNote: 'Faster, rarer WILD.', release: 'wed' },
  wildMk3: { kind: 'trap', name: 'Laser pointer Mk3 (green)', em: '🟢', price: 140, lure: 'WILD', tier: 3, waitMin: 1, catchBonus: .8, rare: [['cat', 20], ['walter', 20], ['moth', 15], ['pike', 6]], learnedNote: 'Fastest. Rare ones love it.', release: 'wed' },
  mythicTrap: { kind: 'trap', name: 'Mythic Trap', em: '🔱', price: 0, lure: 'MYTHIC', tier: 3, waitMin: 2, catchBonus: 1, spawn: 'wraith', notSold: true, learnedNote: 'The only thing that holds the Wraith.', release: 'wed' },
  // lures: use on the map for 60 s; also what the dead like at the cemetery
  buns: { kind: 'lure', name: 'Free cinnamon buns', em: '🥐', price: 15, lure: 'GRUB', use: [{ type: 'attract', value: 'GRUB', duration: 60 }], learnedNote: 'GRUB comes running for 60 s. Everyone loves them.', release: 'tue' },
  furniture: { kind: 'lure', name: '"Furniture 70 % off" flyer', em: '🛋️', price: 20, lure: 'WIFE', use: [{ type: 'attract', value: 'WIFE', duration: 60 }], learnedNote: 'A wife shows up. Fast.', release: 'tue' },
  beer6: { kind: 'lure', name: 'Six-pack', em: '🍻', price: 60, lure: 'HERO', use: [{ type: 'attract', value: 'HERO', duration: 60 }], learnedNote: 'A hero smells it from across the parking lot.', release: 'tue' },
  // weapon: the tranquilizer gun (in the Throw menu). upgradesTo + cost = buy the next tier at the same shop
  tranq: { requires: 'know:tranq', kind: 'weapon', name: 'Tranquilizer gun', em: '🔫', price: 120, hit: .7, throw: [{ type: 'sleep', turns: 2 }], upgradesTo: 'tranqDarts', learnedNote: 'Puts them to sleep for 2 turns.', release: 'mon' },
  tranqDarts: { kind: 'weapon', name: 'Tranq gun + heavy darts', em: '🔫', price: 0, upgradeCost: 150, hit: .7, throw: [{ type: 'sleep', turns: 3 }, { type: 'catchBonus', value: .2, turns: 3 }], upgradesTo: 'tranqScope', notSold: true, learnedNote: 'Sleeps 3 turns. Easier to catch.', release: 'mon' },
  tranqScope: { kind: 'weapon', name: 'Tranq gun + darts + scope', em: '🎯', price: 0, upgradeCost: 220, hit: 1, throw: [{ type: 'sleep', turns: 3 }, { type: 'catchBonus', value: .3, turns: 3 }], notSold: true, learnedNote: 'Never misses.', release: 'mon' },
  // drugs and drinks: use = on you; throw = on the opponent. Drinks count towards the blur.
  folkol: { kind: 'drug', name: 'Folköl', em: '🍺', price: 10, drink: true, use: [{ type: 'stat', value: { spd: 1 }, duration: 60 }], lureMul: 1.25, learnedNote: '+SPD a little.', release: 'mon' },
  lager: { kind: 'drug', name: 'Lager', em: '🍺', price: 20, drink: true, use: [{ type: 'stat', value: { atk: 1 }, duration: 60 }], lureMul: 1.5, learnedNote: '+ATK.', release: 'mon' },
  ipa: { kind: 'drug', name: 'IPA', em: '🍻', price: 30, drink: true, use: [{ type: 'stat', value: { atk: 2, acc: -.15 }, duration: 60 }], lureMul: 1.5, good: 'WILD', learnedNote: '+ATK ++, −accuracy.', release: 'mon' },
  gt: { kind: 'drug', name: 'Gin & tonic', em: '🍸', price: 35, drink: true, use: [{ type: 'stat', value: { spd: 1 }, duration: 60 }, { type: 'cure' }], lureMul: 1.5, good: 'TECH', learnedNote: '+SPD, clears your head.', release: 'mon' },
  whisky: { kind: 'drug', name: 'Whisky', em: '🥃', price: 50, drink: true, use: [{ type: 'stat', value: { def: 1 }, duration: 60 }, { type: 'guard', duration: 60 }], lureMul: 2, learnedNote: '+DEF, immune to guilt.', release: 'mon' },
  glogg: { kind: 'drug', name: 'Glögg', em: '🍷', price: 25, drink: true, use: [{ type: 'heal', value: .3 }, { type: 'stat', value: { atk: 1, acc: -.12 }, duration: 60 }], lureMul: 1.5, good: 'FROST', learnedNote: 'Heals 30 %. Brave, but worse aim.', release: 'mon' },
  snaps: { kind: 'drug', name: 'Snaps', em: '🥂', price: 40, drink: true, use: [{ type: 'stat', value: { crit: 1 }, duration: 60 }, { type: 'say', value: '🎶 "Helan går, sjung hopp faderallan lallan lej!"' }], lureMul: 0, learnedNote: '+crit. You sing.', release: 'mon' },
  fizztab: { kind: 'drug', name: 'Fizz tablet', em: '💊', price: 15, use: [{ type: 'heal', value: .5 }], learnedNote: 'Heals 50 %.', release: 'mon' },
  burger: { kind: 'drug', name: 'IRON Burger', em: '🍔', price: 40, use: [{ type: 'stat', value: { atk: 1 }, duration: 60 }], learnedNote: '+ATK for 60 s.', release: 'mon' },
  kebabpizza: { kind: 'drug', name: 'Kebab pizza', em: '🍕', price: 45, use: [{ type: 'heal', value: .3 }, { type: 'stat', value: { def: 1 }, duration: 60 }], learnedNote: 'Heals 30 % and +DEF.', release: 'mon' },
  sushi: { kind: 'drug', name: 'Salmon roll', em: '🍣', price: 50, use: [{ type: 'stat', value: { spd: 1 }, duration: 60 }], learnedNote: '+SPD for 60 s.', release: 'mon' },
  snus: { kind: 'drug', name: 'Snus', em: '🫙', price: 20, use: [{ type: 'stat', value: { atk: 1, def: 1 }, duration: 90 }], throw: [{ type: 'stat', value: { atk: -1 }, turns: 3 }], learnedNote: 'Small buff. Lasts a while.', release: 'mon' },
  coke: { kind: 'drug', name: 'Coke', em: '❄️', price: 0, use: [{ type: 'speed', value: 1, duration: 60, stacks: true, maxStacks: 3, onOverdose: { type: 'heartAttack' } }], throw: [{ type: 'stat', value: { spd: 2, atk: 1 }, turns: 3 }], train: [{ type: 'xpRate', value: 1, duration: 600, stacks: true, maxStacks: 3, onOverdose: { type: 'heartAttack' } }], learnedNote: 'Everything is faster. Your heart disagrees after 3.', release: 'mon' },
  weed: { kind: 'drug', name: 'Weed', em: '🌿', price: 0, use: [{ type: 'speed', value: -.4, duration: 60 }, { type: 'catchBonus', value: .4, duration: 60 }, { type: 'attract', value: 'GRUB', duration: 60 }], throw: [{ type: 'sleep', turns: 2 }], learnedNote: 'Slow-mo, easier catches, GRUB gets curious. Thrown: they fall asleep.', release: 'mon' },
  shrooms: { kind: 'drug', name: 'Magic mushrooms', em: '🍄', price: 0, use: [{ type: 'reveal', duration: 90 }, { type: 'tint', value: 'rainbow', duration: 90 }], throw: [{ type: 'confuse', turns: 3 }], learnedNote: 'You see things that were always there.', release: 'tue' },
  protein: { kind: 'drug', name: 'Protein shake', em: '🥤', price: 35, use: [{ type: 'heal', value: .2 }], train: [{ type: 'xpRate', value: 1, duration: 1800 }], learnedNote: 'Gym creatures train twice as fast.', release: 'tue' },
  // fishing: the net holds a wild creature for 2 turns; the lake net trap only works on a shore
  net: { kind: 'throwable', name: 'Fishing net', em: '🕸️', price: 25, hit: .85, throw: [{ type: 'stun', turns: 2 }, { type: 'catchBonus', value: .2, turns: 2 }], learnedNote: 'Holds it still for two turns.', release: 'tue' },
  netTrap: { kind: 'trap', name: 'Lake net trap', em: '🥅', price: 80, shore: true, lure: 'WATER', tier: 2, waitMin: 3, catchBonus: .5, catch: [['pike', 3], ['salmon', 3], ['frog', 2], ['genie', 1]], rare: [['owl', 4]], learnedNote: 'Set it on a shore.', release: 'tue' },
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
apps: {
  tibber: { name: 'Tibber', icon: '⚡', lines: ['Electricity right now: {price} kr/kWh.\nWizcudi has been notified.', 'Price spike! {price} kr/kWh.\nTip: turn off the sun.', 'Your fridge used 14 kr while you read this.'], release: 'mon' },
  swish: { name: 'Swish', icon: '💸', lines: ['You swished 10 kr to {name}.\nYou meant to swish Löken.', 'Payment sent to {name}.\nMessage: "pizza"', '{name} received 10 kr.\nNobody knows why.'], use: [{ type: 'kr', value: -10 }], release: 'mon' },
  bankid: { name: 'BankID', icon: '🆔', lines: ['Open BankID on your other device.\nYou do not have another device.', 'Identification approved.\nDoors marked 🆔 open for you now.'], gate: 'door', release: 'wed' },
  strava: { name: 'Strava', icon: '🏃', lines: ['Today: {steps} steps inside ICA Maxi.\nNew personal record: aisle 4.', '{steps} steps. Kudos from: nobody.'], release: 'wed' },
  klarna: { name: 'Klarna', icon: '🩷', lines: ['Buy now, pay later!\n+200 kr. Promise debt: {debt}.', 'Smoooth. +200 kr. You promised to pay. Again.'], use: [{ type: 'kr', value: 200 }, { type: 'promiseDebt', value: 1 }], once: 3, cooldownMin: 10, release: 'wed' }
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
  freja: { name: 'Freezer Freja', role: 'merchant', at: [15, 34], area: [14, 34, 7, 1], gossip: true, canDie: true, catchable: true, likes: 'FROST', epitaph: 'Finally warm.',
    look: { skin: '#f0c8a8', hair: '#e8c46a', style: 'long', top: '#4fc3f7', legs: '#3d5f92' }, shop: ['meatballs', 'frostMk1'], release: 'mon',
    lines: { pool: ['Penguins hate it when you leave the freezer door open. Or love it. I forget.'] } },
  hasse: { name: 'Hallucinating Hasse', role: 'talker', at: [16, 13], area: [13, 10, 10, 5], gossip: true, canDie: true, catchable: true, likes: 'shrooms', epitaph: 'Can finally smell purple.',
    look: { hair: '#aa7744', style: 'messy', top: '#c06bd6', top2: '#ffd23a', topStyle: 'stripe', legs: '#3d5f92' }, release: 'mon',
    lines: { pool: ['Can you smell purple?', 'The receipt in aisle 4 is fourteen metres long and it LOOKED at me.', 'Mushrooms? Ask the guy who hides behind the bottle machines. Didn\'t hear it from me.'] } },
  barber: { name: 'The Barber', role: 'merchant', at: [38, 68], area: [35, 66, 10, 3], canDie: true, catchable: true, likes: 'WILD', epitaph: 'Took a little off the top. All of it.',
    look: { hair: '#1a1a1a', style: 'short', stache: 1, top: '#f4f4f4', prop: 'apron' }, shop: ['tranq', 'stache'], release: 'mon',
    lines: { pool: ['Trim? Gossip? A tranquilizer gun? Don\'t ask why I have one.'] } },
  jonas: { name: 'Hardware Jonas', role: 'merchant', at: [10, 57], area: [9, 56, 3, 2], canDie: true, catchable: true, likes: 'TECH', epitaph: 'Always had the right tool. Except this time.',
    look: { hair: '#3a2a1a', style: 'cap', cap: '#e3000f', cap2: '#fff', top: '#2a2a33', legs: '#5a4a30' }, shop: ['rock', 'bottle', 'fizzMk1', 'grubMk1', 'wildMk1', 'techMk1', 'rustleMk1', 'fizzMk2', 'grubMk2', 'wildMk2', 'fizzMk3', 'grubMk3', 'wildMk3'], release: 'mon',
    lines: { pool: ['Traps work while you sleep. Like me.', 'Put it where the creatures walk. Come back later.'] } },
  fia: { name: 'Flower Fia', role: 'merchant', at: [29, 37], area: [28, 35, 2, 3], canDie: true, catchable: true, likes: 'WIFE', epitaph: 'Pushing up her own daisies.',
    look: { skin: '#f0c8a8', hair: '#a0522d', style: 'long', top: '#5fae3e', legs: '#34343c', prop: 'bouquet' }, shop: ['bouquet', 'glitter', 'giftcard', 'ringbox', 'chores', 'saleSign', 'furniture', 'samples'], release: 'mon',
    lines: { pool: ['Flowers solve everything. Except chlorine flowers. Those make it worse.', 'Never give a wife a chore chart. Trust me.'] } },
  system: { name: 'Systembolaget cashier', role: 'merchant', at: [42, 29], canDie: false, look: { hair: '#5a3a22', style: 'bob', top: '#0a6e3a' }, shop: ['folkol', 'lager', 'ipa', 'gt', 'whisky', 'glogg', 'snaps', 'beer6'], release: 'mon',
    lines: { pool: ['ID, please. …You look 47. Go ahead.'] } },
  apotek: { name: 'Pharmacist', role: 'merchant', at: [40, 37], canDie: false, heal: true, look: { skin: '#f0c8a8', hair: '#3a2a1a', style: 'short', glasses: 1, top: '#f4f4f4' }, shop: ['fizztab'], release: 'mon',
    lines: { pool: ['Everyone is fully healed. Take care out there.'] } },
  burgercook: { name: 'IRON Burger cook', role: 'merchant', at: [6, 71], canDie: true, likes: 'GRUB', epitaph: 'Well done. Finally.', look: { hair: '#222', style: 'cap', cap: '#222', cap2: '#f39c34', top: '#f4f4f4' }, shop: ['burger'], release: 'mon', lines: { pool: ['Om nom.'] } },
  pizzaiolo: { name: 'Pizzeria Berga', role: 'merchant', at: [17, 71], canDie: true, likes: 'GRUB', epitaph: 'Extra sauce, extra dead.', look: { hair: '#2a1a10', style: 'short', stache: 1, top: '#f4f4f4' }, shop: ['kebabpizza'], release: 'mon', lines: { pool: ['Kebab pizza. The national dish.'] } },
  sushichef: { name: 'J&K99 Sushi chef', role: 'merchant', at: [28, 71], canDie: true, likes: 'FROST', epitaph: 'Rolled away.', look: { hair: '#111', style: 'short', top: '#1c2a36' }, shop: ['sushi'], release: 'mon', lines: { pool: ['Fresh today. Probably.'] } },
  dealer: { name: 'Guy behind the bottle machines', role: 'dealer', at: [46, 34], canDie: true, catchable: false, likes: 'buns', epitaph: 'Out of stock.', hidden: true,
    look: { skin: '#d8b090', hair: '#1a1a1a', style: 'hat', top: '#2a2a33', legs: '#111', glasses: 1 }, release: 'mon',
    lines: { pool: ['Psst. You didn\'t see me.', 'Cash is for tourists. I take creatures.'] } },
  kenta: { name: 'Coach Kenta', role: 'gym', at: [43, 15], canDie: true, catchable: true, likes: 'protein', epitaph: 'Did one more rep.',
    look: { skin: '#d9a07a', hair: '#222', style: 'short', top: '#e3000f', legs: '#111', big: 1 }, party: [['bear', 9], ['golem', 10], ['frog', 11]], shop: ['protein'], release: 'mon',
    lines: { pool: ['Three, two, one, GO! …Why are you not going?', 'Leave your creatures on the WOD board. They come back stronger.'], when: [{ flag: 'gymOpen', text: 'The board is open. Drop your creatures, pick them up later.' }] } },
  trainer1: { name: 'Protein Patrik', role: 'trainer', at: [39, 14], canDie: true, catchable: true, likes: 'protein', epitaph: 'Skipped leg day. Permanently.',
    look: { skin: '#e0a882', hair: '#d8b060', style: 'short', top: '#f7931a', legs: '#2a2a33', big: 1 }, party: [['bear', 8], ['slime', 8]], release: 'mon',
    lines: { pool: ['Do you even lift, bro?', 'Protein shake? I have nine.'] } },
  trainer2: { name: 'Kettlebell Kim', role: 'trainer', at: [44, 11], canDie: true, catchable: true, likes: 'protein', epitaph: 'Swung too hard.',
    look: { skin: '#f0c8a8', hair: '#1a1a1a', style: 'bob', top: '#3ddc84', legs: '#111' }, party: [['golem', 9], ['crow', 8]], release: 'mon',
    lines: { pool: ['WOD of the day: catch 20 creatures, for time.'] } },
  aiLjunky: { name: 'AI-Ljunky', role: 'trainer', at: [44, 12], canDie: true, catchable: true, likes: 'bitcoin', epitaph: 'SEGMENTATION FAULT (core dumped).',
    look: { skin: '#b8c4d0', hair: '#3dff8a', style: 'short', top: '#2a0a3a', legs: '#111', glasses: 1, prop: 'bow' }, party: [['wraith', 18], ['snake', 19], ['frog', 19], ['mummy', 20]], partyFallback: ['ghost', 18], release: 'tue', requires: 'ljunkyDone', robot: true,
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
  doorman: { name: 'Doorman Dragan', role: 'talker', at: [143, 59], area: [141, 58, 6, 2], canDie: true, catchable: true, likes: 'coke', epitaph: 'Not tonight. Not ever.',
    look: { skin: '#d9a07a', hair: '#111', style: 'bald', top: '#111', legs: '#111', glasses: 1, big: 1 }, release: 'tue', lines: { pool: ['Not tonight.'] } },
  folke: { name: 'Fisherman Folke', role: 'merchant', at: [72, 19], area: [68, 18, 8, 2], canDie: true, catchable: true, likes: 'FROST', epitaph: 'The big one got away. And back.',
    look: { hair: '#8a6a4a', style: 'hat', beard: '#8a6a4a', top: '#2f6fd0', legs: '#3a2a1a', prop: 'bag' }, shop: ['net', 'netTrap'], release: 'tue', lines: { pool: ['Fish.'] } },
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
  ingvar: { name: 'Inkasso-Ingvar', role: 'trainer', at: [0, 0], canDie: false, catchable: false, offMap: true, release: 'wed',
    look: { skin: '#e9b48c', hair: '#666', style: 'short', top: '#1d1d24', top2: '#e8eef3', topStyle: 'blazer', legs: '#1d1d24', glasses: 1, prop: 'clip' },
    lines: { pool: ['Inkasso-Ingvar. You promised. Klarna remembers.'] }, win: 'Fine. I will put a note in your file.' }
},
/* Kenny the Fence pays kronor for creatures: rates[rarity] + level × perLv. Low on purpose */
fence: { rates: { C: 3, U: 6, R: 12, E: 25, L: 40, M: 60 }, perLv: .5 },
/* Inkasso-Ingvar shows up when promise debt reaches every `every` points. Pay `pay` kr or fight his team (levels = your best + lvUp) */
debtCollector: { npc: 'ingvar', every: 3, pay: 250, team: ['golem', 'banshee', 'ghost'], lvUp: 2 },
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
  fruit: { name: 'Fruit & veg', r: [2, 28, 6, 11], enc: [['cuke', 6], ['banshee', 2], ['fly', 4], ['lich', 2]], lv: [4, 7] },
  pickmix: { name: 'Pick-and-mix', r: [8, 28, 6, 11], enc: [['slime', 6], ['banshee', 2], ['serpent', 2]], lv: [4, 7] },
  freezer: { name: 'Freezer aisle', r: [14, 28, 7, 11], enc: [['peng', 6], ['banshee', 2], ['salmon', 2]], lv: [5, 8] },
  bakery: { name: 'Bakery', r: [21, 28, 6, 11], enc: [['mummy', 5], ['banshee', 2], ['slime', 1], ['lich', 1]], lv: [5, 8] },
  flowers: { name: 'Flower department', r: [27, 28, 4, 11], enc: [['cuke', 5], ['bat', 1], ['fly', 3]], lv: [5, 8] },
  selfcheck: { name: 'Self-checkout', r: [22, 39, 9, 7], enc: [['ghost', 5], ['bat', 1], ['serpent', 2]], lv: [5, 8] },
  checkout: { name: 'Checkouts', r: [2, 39, 20, 7], enc: [['bat', 1], ['serpent', 1]], lv: [4, 6] },
  system: { name: 'Systembolaget', r: [34, 22, 13, 11], enc: [['frog', 5], ['crow', 3], ['genie', 1], ['owl', 1]], lv: [6, 9] },
  apotek: { name: 'Apotek Hjärtat', r: [34, 35, 13, 10], enc: [['snail', 1]], lv: [6, 9] },
  burger: { name: 'IRON Burger', r: [1, 65, 11, 9], enc: [['bear', 1]], lv: [6, 9] },
  pizza: { name: 'Pizzeria Berga', r: [12, 65, 11, 9], enc: [['lizard', 1]], lv: [6, 9] },
  sushi: { name: 'J&K99 Sushi', r: [23, 65, 11, 9], enc: [['salmon', 1]], lv: [6, 9] },
  barber: { name: "Tailor's Barber", r: [34, 65, 13, 9], enc: [['moth', 1]], lv: [7, 10] },
  charger: { name: 'E.ON charger', r: [35, 50, 13, 10], enc: [['snake', 5], ['bat', 2]], lv: [6, 9], out: 1 },
  box: { name: 'The Box', r: [37, 9, 10, 10], house: 'ljunky' },
  cemetery: { name: 'Cemetery', r: [1, 9, 11, 10], out: 1, release: 'tue' },
  // ---- the bigger world: houses first, then the grass that crosses the roads, then the big areas (first match wins) ----
  estore: { name: 'The electronics store', r: [98, 32, 14, 6], house: 'wizcudi', release: 'tue' },
  cave: { name: 'The shaman cave', r: [134, 22, 14, 8], house: 'jrohn', release: 'tue' },
  castle: { name: 'The castle', r: [131, 4, 20, 9], house: 'loken', release: 'wed' },
  rave: { name: 'The rave', r: [136, 62, 18, 10], house: 'bigwman', release: 'tue', ambient: { tone: 55, vol: .035, nightVol: .09, every: .5, flash: true } },
  grounds: { name: 'The castle grounds', r: [126, 2, 30, 15], out: 1, release: 'wed' },
  boxpath: { name: 'The lawn, east side', r: [24, 9, 23, 11], enc: [['crow', 4], ['fly', 3], ['bat', 2], ['elk', 1]], lv: [8, 11], out: 1 },
  band_s1: { name: 'Roadside grass', r: [52, 46, 4, 5], enc: [['fly', 3], ['crow', 3], ['cat', 1]], lv: [11, 14], out: 1, release: 'tue' },
  band_s2: { name: 'Roadside grass', r: [72, 46, 4, 5], enc: [['fly', 3], ['bat', 2], ['cat', 2], ['walter', 1]], lv: [14, 17], out: 1, release: 'tue' },
  band_s3: { name: 'City outskirts', r: [90, 46, 4, 5], enc: [['ghost', 3], ['golem', 3], ['banshee', 2], ['bat', 2]], lv: [17, 20], out: 1, release: 'tue' },
  band_s4: { name: 'City outskirts', r: [108, 46, 4, 5], enc: [['ghost', 3], ['snake', 3], ['golem', 2], ['banshee', 2]], lv: [19, 22], out: 1, release: 'tue' },
  band_n1: { name: 'Lakeside grass', r: [52, 19, 4, 4], enc: [['crow', 3], ['fly', 3], ['frog', 2]], lv: [11, 14], out: 1, release: 'tue' },
  band_n2: { name: 'Lakeside grass', r: [76, 19, 4, 4], enc: [['crow', 3], ['frog', 3], ['genie', 1]], lv: [14, 17], out: 1, release: 'tue' },
  band_n3: { name: 'Lakeside grass', r: [100, 19, 4, 4], enc: [['frog', 3], ['owl', 2], ['genie', 1]], lv: [17, 20], out: 1, release: 'tue' },
  foothills: { name: 'The foothills', r: [124, 29, 4, 4], enc: [['peng', 3], ['golem', 3], ['lizard', 2]], lv: [24, 28], out: 1, release: 'tue' },
  mtrail: { name: 'The mountain trail', r: [130, 29, 4, 4], enc: [['golem', 3], ['lizard', 3], ['owl', 2], ['peng', 2]], lv: [28, 32], out: 1, release: 'tue' },
  forest1: { name: 'The forest', r: [56, 56, 6, 10], enc: [['elk', 3], ['walter', 2], ['cat', 2], ['moth', 2], ['fly', 2]], lv: [23, 26], out: 1, release: 'tue' },
  forest2: { name: 'The forest', r: [76, 56, 6, 10], enc: [['elk', 3], ['moth', 3], ['owl', 2], ['cat', 2]], lv: [26, 30], out: 1, release: 'tue' },
  deep1: { name: 'The deep forest', r: [112, 56, 6, 10], enc: [['lich', 2], ['serpent', 2], ['owl', 3], ['elk', 3]], lv: [34, 37], out: 1, release: 'tue' },
  deep2: { name: 'The deep forest', r: [126, 56, 6, 10], enc: [['lich', 2], ['serpent', 2], ['owl', 2], ['snake', 2]], lv: [37, 40], out: 1, release: 'tue' },
  deep3: { name: 'The deep forest', r: [136, 56, 18, 6], enc: [['lich', 2], ['serpent', 3], ['owl', 2], ['elk', 2]], lv: [39, 42], out: 1, release: 'tue' },
  biglake: { name: 'The big lake', r: [56, 0, 104, 20], enc: [['pike', 4], ['salmon', 3], ['genie', 2], ['frog', 2]], lv: [34, 40], out: 1, release: 'wed' },
  golf: { name: 'The golf course', r: [48, 22, 39, 25], enc: [['crow', 3], ['fly', 4], ['bat', 2], ['cat', 1], ['walter', 1]], lv: [10, 14], out: 1, release: 'tue' },
  city: { name: 'The city', r: [88, 22, 35, 25], out: 1, release: 'tue' },
  mountain: { name: 'The mountain', r: [123, 22, 37, 29], enc: [['peng', 3], ['golem', 3], ['lizard', 2], ['owl', 1]], lv: [26, 31], out: 1, release: 'tue' },
  forest: { name: 'The forest', r: [48, 50, 52, 24], enc: [['elk', 3], ['walter', 2], ['cat', 2], ['moth', 2], ['fly', 2], ['owl', 1]], lv: [23, 28], out: 1, release: 'tue' },
  deepforest: { name: 'The deep forest', r: [100, 50, 60, 24], enc: [['lich', 2], ['serpent', 2], ['owl', 2], ['elk', 2], ['snake', 1]], lv: [35, 41], out: 1, release: 'tue' },
  countryside: { name: 'The countryside', r: [48, 0, 112, 74], out: 1, release: 'tue' },
  lake: { name: 'The lake', r: [0, 0, 48, 9], out: 1 },
  lawn: { name: 'The lawn by the lake', r: [0, 9, 48, 13], enc: [['crow', 5], ['bat', 2], ['fly', 2], ['elk', 2]], lv: [3, 6], out: 1 },
  parking: { name: 'Parking lot', r: [0, 46, 48, 19], enc: [['bat', 5], ['golem', 2], ['walter', 1], ['elk', 1]], lv: [2, 5], out: 1 }
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
  rates: { C: 1, U: 2, R: 4, E: 7, L: 9, M: 12, H: 5 },
  stock: [['coke', 3, 3], ['weed', 2, 3], ['snus', 1, 2], ['glogg', 1, 2], ['shrooms', 4, 1]], // [item, price in creature points, weight]
  rare: [['shrooms', 4, .25], ['coke', 2, .15]],                                               // [item, price, chance per rotation] (discount specials)
  refuse: ['Whoa. That\'s somebody\'s wife. I have standards. Low ones, but still.', 'No wives. Bad for business. Bad for karma.'],
  hello: ['Psst. Creatures for goodies. No questions.', 'You again. Good. I need a Trolley Golem for… reasons.'],
  empty: 'Come back later. Supply chain issues.'
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
  starters: ['frog', 'cuke', 'peng', 'snake', 'crow'],
  joined: '{name} joined your party!',
  tooSlow: '…',                                 // said when someone else grabbed the same one a second earlier
  noFight: 'You have nothing to fight with.',
  startItems: { folkol: 2, fizztab: 1, bag: 5 }
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
  types:   { name: 'How the types work', text: 'FIZZ › GRUB › WILD › TECH › FROST › RUSTLE › FIZZ. The move list shows what is strong.' },
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
  ferry: { name: 'A ferry creature', text: 'A big lake creature that knows Ferry can carry you across the water.', release: 'wed' }
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
      { if: { step: 'freja_penguin:0' }, text: 'Have you found a penguin yet? Any penguin. It does not have to like me.' },
      { if: { metMin: 2, questNot: 'freja_penguin' }, text: 'It is lonely in here. Bring me a Freezer Penguin. Just so I can see it. Do not tell the peas.', replies: [
        { label: 'I will find one.', quest: 'freja_penguin', tone: 'kind', text: 'Mm. Thanks.' }, { label: 'Penguins have jobs.', tone: 'funny', text: 'Mm.' }] },
      { if: { questDone: 'freja_penguin' }, text: 'It stood by the peas for a whole minute. I will remember that forever.' },
      { if: { met: 0 }, text: "Cold in here. Colder out there. You want something, or are you just standing in my draught?", replies: [
        { label: 'Just looking.', tone: 'kind', text: 'Mm. Everyone is.' },
        { label: 'Your freezers are lovely.', tone: 'flirt', text: 'Please do not.' }] },
      { if: { metMin: 1 }, tell: 'types', text: 'Listen. FIZZ beats GRUB, GRUB beats WILD, WILD beats TECH, TECH beats FROST, FROST beats RUSTLE, RUSTLE beats FIZZ. Write it down. Or do not. I am only a freezer.' },
      { if: { carry: 'peng' }, text: 'A penguin. Is it warm? Why is it not shivering?' },
      { if: { killed: 'berit' }, text: 'Berit and I shared the lunch room. It is very quiet at the lunch table now.' },
      { if: { state: 'high' }, text: 'Your eyes are the size of dinner plates. Lie down by the peas.' },
      { text: 'Penguins hate it when you leave the freezer door open. Or love it. I forget.' }] },
  hasse: { rumours: true, personality: 'dreamer', friends: ['pirate'],
    talk: [
      { if: { met: 0 }, text: 'Can you smell purple? No? Then you have not lived.', replies: [
        { label: 'Smells blue to me.', tone: 'funny', text: 'BLUE! Yes! You see it too!' },
        { label: 'No.', tone: 'honest', text: 'Honest. Sad. Honest.' }] },
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
      { if: { state: 'blurred' }, text: 'You are swaying. Sit. Breathe. Do not mix any more.' },
      { if: { debtMin: 2 }, text: 'There is no medicine for promise debt. Only payment.' },
      { text: 'Take two Fizz tablets and call me in the morning. I am here at night too.' }] },
  burgercook: { personality: 'hothead', talk: [
      { if: { met: 0 }, text: 'ORDER UP! Oh. You are not an order.' },
      { if: { carry: 'bear' }, text: 'Is that a BURGER BEAR? Do not bring it near my grill. It knows.' },
      { text: 'The secret ingredient is rage. And mayonnaise.' }] },
  pizzaiolo: { personality: 'flirty', talk: [
      { if: { met: 0 }, text: 'Ciao, bella! Kebab pizza, the national dish. Specialita della casa: regret.' },
      { if: { night: true }, text: 'Midnight pizza? The best kind. I do not judge. Much.' },
      { text: 'Extra garlic sauce? You say yes. Everybody says yes.' }] },
  sushichef: { personality: 'dry', talk: [
      { if: { met: 0 }, text: 'Fresh today. Probably.' },
      { if: { carry: 'salmon' }, text: 'That salmon roll walks. That is not on my menu. Please take it away.' },
      { text: 'Soy sauce is not a personality.' }] },
  dealer: { personality: 'paranoid', talk: [
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
      { if: { metMin: 1 }, tell: 'herbs', release: 'tue', text: 'Jrohn brews in the cave. The order matters: fern first, then the mushroom, then moss. Do not ask me how I know. I carried the herbs.' },
      { if: { met: 0 }, text: 'Hiking boots? No? You will regret that. Everyone does.' },
      { if: { carry: 'peng' }, text: 'A freezer penguin on a mountain. It looks at home, at least.' },
      { if: { night: true }, text: 'Nobody goes up at night. Except the shaman. And he floats.' },
      { text: 'The trail is long and the rocks are rude. Halfway up there is a cave. Do not touch the boulder.' }] },
  doorman: { personality: 'hothead', talk: [
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
      { if: { carry: 'pike', from: 'wed' }, tell: 'ferry', release: 'wed', text: 'THAT is a Pikezilla! Feed it, level it. At the right size it can ferry you across the water on its back. Do not ask how I know.' },
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
      { if: { carry: 'bat' }, text: 'A bat in a bag. Good. Do not let it near the lights.' },
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
      { if: { flag: 'edge:jrohn' }, text: 'The brew bubbles. Jrohn will be very, very relaxed.' },
      { if: { flag: 'h3' }, text: 'You add the herbs. The cauldron hums. Somewhere, Jrohn loses track of what a fight is.', set: { 'edge:jrohn': true }, give: { shrooms: 1 } },
      { text: 'A cold cauldron. It wants herbs, in the right order. Someone on the mountain knows it.' }] },
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
      { if: { carry: 'walter' }, text: 'WALTER! You found him! I love this! I love you! Where is my shirt?' },
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
      { if: { carry: 'cat' }, text: 'You have my cats! Give them back. They do not like you. They like me.' },
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
        { text: 'I have Walter right here. He is fine. He is FINE.', right: { carry: 'walter' } },
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
      { if: { carry: 'walter' }, text: 'WALTER! Oh. Oh, you have him. Do you know what that means?' },
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
        { text: 'The cats are with you? Thank god. Give them tuna.', right: { carry: 'cat' } },
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
    ['fill', 100, 60, 45, 2, 'y'], ['fill', 112, 56, 6, 10, 'u'], ['fill', 126, 56, 6, 10, 'u'], ['fill', 136, 56, 18, 6, 'u'], ['room', 136, 62, 18, 10, 'D', 'd', 144, 62, 2],
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
    trophy: { at: [100, 34], give: { techMk1: 1, fizztab: 2 }, text: 'A glass case: a perfect, never-used extension cord. You take it. Nobody is looking.' },
    locked: 'The store is dark. Every single light is off, on purpose.' },
  jrohn:   { name: 'The shaman cave', hero: 'jrohn', level: 30, door: [140, 29], doorW: 2, release: 'tue', home: { at: [144, 26] },
    trophy: { at: [136, 26], give: { weed: 1, shrooms: 1 }, text: 'Dried herbs on a stone shelf. A note: "For Walter".' },
    locked: 'A boulder sits in the cave mouth. It hums. You are not strong enough to move it.' },
  loken:   { name: 'The castle', hero: 'loken', level: 40, door: [140, 12], doorW: 2, release: 'wed', home: { at: [146, 8] },
    trophy: { at: [135, 8], kr: 400, give: { ringbox: 1 }, text: 'A trophy cabinet: 400 kr in small coins. Dropped, collected, dropped again.' },
    locked: 'The castle gate is shut. Gently. Loyally. Shut.' },
  bigwman: { name: 'The rave', hero: 'bigwman', level: 40, door: [144, 62], doorW: 2, release: 'tue', home: { at: [148, 66] },
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
    steps: [ { text: 'Show Freja a Freezer Penguin.', turnIn: 'freja', done: { carry: 'peng' } } ],
    rewards: [ { rel: { freja: 2 }, give: { meatballs: 3, frostMk1: 1 }, text: 'She cannot stop smiling. Cold smile.' } ] },
  barber_fur: { name: 'The cat hair', giver: 'barber', release: 'tue',
    steps: [ { text: 'Bring the Barber one of Ljunky\'s cats (it has to be a real one).', turnIn: 'barber', done: { carry: 'cat' } } ],
    rewards: [ { rel: { barber: 2, maadmads: 1 }, kr: 300, give: { ringbox: 1 }, text: 'He weeps over the fur. Pays well.' } ] },
  jonas_bulbs: { name: "Anna's light bill", giver: 'jonas', release: 'tue',
    steps: [ { text: 'Talk to Anna about the light bill.', done: { flag: 'talked:anna' } }, { text: 'Tell Jonas how it went.', turnIn: 'jonas', done: {} } ],
    rewards: [ { rel: { jonas: 2, anna: 2 }, tell: 'wife:anna', give: { techMk1: 1 }, text: 'Jonas finally understands the meter.' } ] },
  folke_pike: { name: 'The one with the crown', giver: 'folke', release: 'tue',
    steps: [ { text: 'Show Folke a Pikezilla.', turnIn: 'folke', done: { carry: 'pike' } } ],
    rewards: [ { rel: { folke: 3 }, give: { netTrap: 1 }, text: 'Folke whispers: "It is real." And gives you a trap.' } ] },
  folke_cast: { name: 'The perfect cast', giver: 'folke', release: 'tue',
    steps: [ { text: 'Fish with a perfect timing (every reel in the gold).', done: { flag: 'fish:perfect' } }, { text: 'Tell Folke.', turnIn: 'folke', done: {} } ],
    rewards: [ { rel: { folke: 2 }, give: { net: 3 }, text: 'Folke respects the cast.' } ] },
  caddy_par: { name: 'Par on the first hole', giver: 'caddy', release: 'tue',
    steps: [ { text: 'Make par on the first hole (the tee is by the pond).', done: { flag: 'golf:par' } }, { text: 'Tell Caddy Calle.', turnIn: 'caddy', done: {} } ],
    rewards: [ { rel: { caddy: 3 }, kr: 250, give: { beer6: 1 }, text: 'Calle shakes your hand. It is damp.' } ] },
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
  pier: { name: 'The pier', at: [23, 2], em: '🎣', minigame: 'fishing', catch: [['golem', 3], ['crow', 2], ['frog', 3]], lv: [6, 9], junk: 'A boot. Size 46. Smells like Löken.', cooldown: 20 },
  lakespot: { name: 'A fishing spot', at: [66, 18], em: '🎣', minigame: 'fishing', catch: [['pike', 4], ['salmon', 3], ['genie', 2], ['frog', 2]], lv: [30, 36], junk: 'A shopping trolley. It is not alive. Not yet.', cooldown: 20, release: 'tue' },
  tee1: { name: 'Tee 1', at: [58, 36], em: '⛳', minigame: 'golf', hole: { name: 'Hole 1: over the pond', distance: 140, par: 3 }, release: 'tue' },
  kb1: { name: '8 kg kettlebell', at: [39, 12], em: '🏋️', release: 'mon' }, kb2: { name: '16 kg kettlebell', at: [40, 14], em: '🏋️', release: 'mon' }, kb3: { name: '24 kg kettlebell', at: [43, 14], em: '🏋️', release: 'mon' }, rower: { name: 'The rower', at: [42, 12], em: '🚣', release: 'mon' },
  fuse1: { name: 'A drawer', at: [101, 33], em: '🗄️', release: 'tue' }, fuse2: { name: 'A toolbox', at: [107, 36], em: '🧰', release: 'tue' }, fuse3: { name: 'A shelf', at: [110, 34], em: '📚', release: 'tue' }, fusebox: { name: 'The fuse box', at: [104, 33], em: '🔲', release: 'tue' },
  fern: { name: 'A fern', at: [136, 24], em: '🌿', release: 'tue' }, mush: { name: 'A mushroom', at: [145, 27], em: '🍄', release: 'tue' }, moss: { name: 'Moss', at: [136, 28], em: '🪨', release: 'tue' }, cauldron: { name: 'The cauldron', at: [141, 24], em: '🍲', release: 'tue' },
  throne: { name: 'The throne', at: [141, 6], em: '👑', release: 'wed' },
  bar: { name: 'The bar', at: [139, 64], em: '🍹', release: 'tue' }, dj: { name: 'The DJ booth', at: [148, 64], em: '🎧', release: 'tue' },
  balloons: { name: 'Balloon stand', at: [27, 47], em: '🎈', show: { day: 'mon' }, release: 'mon' },
  wallet: { name: 'A lost wallet', at: [30, 18], em: '👛', show: { day: 'wed' }, release: 'wed' }
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
