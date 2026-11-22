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
  pike: { no: 20, name: 'Pikezilla', type: 'WILD', rarity: 'R', stats: [80, 82, 64, 56], moves: [['bite', 1], ['slam', 1]], desc: 'The king of the lake. Wears reeds like a crown.', art: 'assets/creatures/pike.png', likes: 'WILD', release: 'tue' },
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
  ringbox: { kind: 'throwable', name: 'Ring box', em: '💍', price: 250, hit: 1, wife: true, throw: [{ type: 'calm', value: 60 }, { type: 'promiseDebt', value: 1 }], learnedNote: 'Big calm. Adds promise debt.', release: 'mon' },
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
  tranq: { kind: 'weapon', name: 'Tranquilizer gun', em: '🔫', price: 120, hit: .7, throw: [{ type: 'sleep', turns: 2 }], upgradesTo: 'tranqDarts', learnedNote: 'Puts them to sleep for 2 turns.', release: 'mon' },
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
  // key items
  stache: { kind: 'key', name: 'Moustache trim', em: '✂️', price: 20, cosmetic: true, learnedNote: 'Magnificent. Purely cosmetic.', release: 'mon' },
  bitcoin: { kind: 'key', name: 'Bitcoin (physical)', em: '🪙', notSold: true, learnedNote: 'Somebody would love this on a grave.', release: 'wed' },
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
  lines: ['I came in for milk in 2019.', 'Is it Tuesday? It feels like Tuesday.', 'The trolleys are unionizing.', "Don't look the self-checkout in the eye.", 'Discount on souls today.']
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
  box: { name: 'The Box', r: [37, 9, 10, 10] },
  cemetery: { name: 'Cemetery', r: [1, 9, 11, 10], out: 1, release: 'tue' },
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
