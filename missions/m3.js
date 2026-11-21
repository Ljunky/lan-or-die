/* LAN OR DIE – Mission 3: Bad Trip at Maxi. Needs engine.js first.
   A GBA-style creature RPG at ICA Maxi Åkersberga. Everything (map, creatures, heroes, partners, NPCs) is drawn in canvas.
   No round limit (noTimer), autosave per player (save), score = goals counted once (submitOnSave). Design: M3_DESIGN.md.
   File order: CFG -> data -> sprites -> map -> UI -> battles -> overworld -> save/score -> LOD.mission. Test hooks: window.__m3. */
(() => {
'use strict';

/* ===================== MISSION CONFIG (tuning numbers) ===================== */
const CFG = {
  VIEW_TILES: 10,          // tiles across the screen (zoom)
  SPEED: 74,               // walk speed, px per second (1 tile = 16 px)
  ENC_RATE: .09,           // encounter chance per step in tall grass / aisles
  ENC_COOLDOWN: 5,         // safe steps after a battle
  START_KR: 120, BAG_COST: 2, TAB_COST: 15, TAB_HEAL: .5,
  XP_PER_LV: 7, XP_SHARE: .5, LV_MAX: 20, START_LV: 5,
  BOSS_LV: 8, BOSS_LV_STEP: 2,   // hero bosses: level 8 + 2 per hero you already beat (any order works)
  DEV_LV: 18, DEV_HP: 2.6,       // Dev Ljunky: level and HP multiplier
  BOSS_KR: 150, PARTNER_TURNS: 5,
  LURE_RIP: 1 / 25,              // a thrown drink kills the creature 1 time in 25
  BLUR_DRINKS: 3, BLUR_TIME: 25, // more than 3 drinks in 60 s = blur for 25 s
  BUFF_TIME: 60, DRINK_TURNS: 3, // drink/food outside battle lasts 60 s, in battle 3 turns
  PTS: { item: 5000, species: 2500, speciesMax: 20, hero: 20000, partner: 5000, dev: 40000, lvl: 100, lvlMax: 15000, egg: 50000 }
};
/* =================== /MISSION CONFIG =================== */

const { clamp, rand, pick, fmt, mmss, esc } = LOD;
const T = 16, MW = 48, MH = 74; // tile size and map size in tiles
let G = null;

/* ---------- types: FIZZ › GRUB › WILD › TECH › FROST › RUSTLE › FIZZ; MIND is neutral ---------- */
const TYPES = ['FIZZ', 'GRUB', 'WILD', 'TECH', 'FROST', 'RUSTLE'];
const TCOL = { FIZZ: '#e8b820', GRUB: '#5fae3e', WILD: '#c0692e', TECH: '#2fa3d8', FROST: '#7fd3f0', RUSTLE: '#9b8fb8', MIND: '#e05cc4', NONE: '#9aa4ad' };
function eff(a, d) {
  if (!a || !d || a === 'MIND' || d === 'MIND') return 1;
  const ia = TYPES.indexOf(a), id = TYPES.indexOf(d);
  let m = (ia + 1) % 6 === id ? 1.5 : (id + 1) % 6 === ia ? .67 : 1;
  if (B && B.reversed && m !== 1) m = m > 1 ? .67 : 1.5; // Dev Ljunky's patch
  return m;
}

/* ---------- moves ---------- */
const MOVES = {
  slam: { n: 'Body Slam', t: null, p: 40 },
  foam: { n: 'Foam Spray', t: 'FIZZ', p: 45 },
  can: { n: 'Can Toss', t: 'FIZZ', p: 55 },
  burp: { n: 'Burp Blast', t: 'FIZZ', p: 75, acc: .88 },
  pickle: { n: 'Pickle Breath', t: 'GRUB', p: 50 },
  dill: { n: 'Dill Whip', t: 'GRUB', p: 72, acc: .9 },
  frz: { n: 'Freezer Burn', t: 'FROST', p: 50 },
  peas: { n: 'Pea Avalanche', t: 'FROST', p: 72, acc: .9 },
  wonky: { n: 'Wonky Wheel', t: 'RUSTLE', p: 95, acc: .62, say: 'The wheel spins the wrong way!' },
  rattle: { n: 'Rattle', t: 'RUSTLE', p: 45 },
  unexp: { n: 'Unexpected Item', t: 'TECH', p: 30, stun: .5, say: 'UNEXPECTED ITEM IN BAGGING AREA.' },
  beep: { n: 'Error Beep', t: 'TECH', p: 58 },
  sugar: { n: 'Sugar Rush', t: 'GRUB', p: 0, self: { spd: 2 } },
  goo: { n: 'Sticky Goo', t: 'GRUB', p: 52 },
  flutter: { n: 'Flutter', t: 'RUSTLE', p: 42 },
  wrap: { n: 'Bag Wrap', t: 'RUSTLE', p: 62 },
  cin: { n: 'Cinnamon Wrap', t: 'GRUB', p: 55, foe: { spd: -1 } },
  bargain: { n: 'BARGAIN!', t: 'RUSTLE', p: 0, foe: { def: -2 }, say: 'An ear-splitting scream about prices!' },
  price: { n: 'Price Cut', t: 'RUSTLE', p: 62 },
  peck: { n: 'Pant Peck', t: 'WILD', p: 52 },
  charge: { n: 'Fast Charge', t: 'TECH', p: 0, self: { atk: 2 } },
  zap: { n: 'Plug Zap', t: 'TECH', p: 62 },
  patty: { n: 'Double Patty', t: 'GRUB', p: 36, hits: 2 },
  hug: { n: 'Bear Hug', t: 'WILD', p: 66 },
  // Dev Ljunky (MIND)
  patch: { n: 'Patch Notes', t: 'MIND', p: 0, special: 'patch' },
  hotfix: { n: 'Hotfix', t: 'MIND', p: 0, special: 'hotfix' },
  spawn: { n: 'Spawn Bug', t: 'MIND', p: 0, special: 'spawn' },
  rage: { n: 'Rage Quit', t: 'MIND', p: 110, special: 'rage' },
  glitch: { n: 'Glitch Slap', t: 'MIND', p: 62 }
};

/* ---------- creatures (23 Nov scope: 1–9, 11, 15, 16). b = [HP, ATK, DEF, SPD]. mv = [move, learn level] ---------- */
const SP = {
  frog: { no: 1, n: 'Folköl Frog', t: 'FIZZ', r: 'C', b: [56, 56, 50, 62], mv: [['foam', 1], ['slam', 1], ['can', 8], ['burp', 13]], d: 'A frog with a can for a body. Foams when nervous.' },
  cuke: { no: 2, n: 'Cucumber Dragon', t: 'GRUB', r: 'C', b: [60, 60, 52, 54], mv: [['pickle', 1], ['slam', 1], ['dill', 9], ['peck', 14]], d: 'Breathes pickle. Votes AIK.' },
  peng: { no: 3, n: 'Freezer Penguin', t: 'FROST', r: 'C', b: [64, 52, 62, 46], mv: [['frz', 1], ['slam', 1], ['peas', 9], ['flutter', 14]], d: 'Wrapped in frozen peas. Never thaws.' },
  golem: { no: 4, n: 'Trolley Golem', t: 'RUSTLE', r: 'U', b: [72, 74, 72, 30], mv: [['rattle', 1], ['wonky', 1], ['slam', 6]], d: 'One wheel always spins the wrong way.' },
  ghost: { no: 5, n: 'Self-scan Ghost', t: 'TECH', r: 'U', b: [50, 60, 48, 72], mv: [['beep', 1], ['unexp', 1], ['zap', 12]], d: 'Please place the item in the bagging area.' },
  slime: { no: 6, n: 'Pick-and-mix Slime', t: 'GRUB', r: 'C', b: [62, 50, 56, 50], mv: [['goo', 1], ['sugar', 1], ['pickle', 10]], d: '7.90 kr per hectogram. Sticky.' },
  bat: { no: 7, n: 'Plastic-bag Bat', t: 'RUSTLE', r: 'C', b: [46, 52, 42, 70], mv: [['flutter', 1], ['wrap', 6], ['peck', 12]], d: 'Costs 2 kr. Lives forever.' },
  mummy: { no: 8, n: 'Cinnamon-bun Mummy', t: 'GRUB', r: 'U', b: [70, 62, 64, 40], mv: [['cin', 1], ['slam', 1], ['dill', 11]], d: 'Baked in 1987. Still warm.' },
  banshee: { no: 9, n: 'Bargain Banshee', t: 'RUSTLE', r: 'U', b: [54, 64, 46, 66], mv: [['bargain', 1], ['price', 1], ['wrap', 10]], d: 'Screams when something is 3 for 2.' },
  crow: { no: 11, n: 'Bottle-return Crow', t: 'WILD', r: 'C', b: [52, 62, 46, 68], mv: [['peck', 1], ['can', 5], ['flutter', 10]], d: 'Steals cans. Returns them. Keeps the 1 kr.' },
  snake: { no: 15, n: 'Charging-cable Snake', t: 'TECH', r: 'U', b: [56, 66, 50, 64], mv: [['zap', 1], ['charge', 1], ['beep', 9]], d: 'Always the wrong plug.' },
  bear: { no: 16, n: 'Burger Bear', t: 'GRUB', r: 'U', b: [78, 70, 62, 38], mv: [['patty', 1], ['hug', 1], ['slam', 8]], d: 'Sesame-seed ears. Smells amazing.' },
  dev: { no: 0, n: 'Dev Ljunky', t: 'MIND', r: 'L', b: [80, 70, 64, 60], mv: [['glitch', 1], ['patch', 1], ['hotfix', 1], ['spawn', 1]], hidden: true, d: 'He wrote the game.' }
};
const SPECIES = Object.keys(SP).filter(k => !SP[k].hidden);
const RAR = { C: 1, U: 1.06, R: 1.12, L: 1.25 }, CATCH_R = { C: 1, U: .75, R: .5, L: .25 };
const STARTERS = ['frog', 'cuke', 'peng'];

/* ---------- Systembolaget drinks ---------- */
const DRINKS = {
  folkol: { n: 'Folköl', em: '🍺', kr: 10, fx: { spd: 1 }, lure: 1.25, txt: '+SPD a little' },
  lager: { n: 'Lager', em: '🍺', kr: 20, fx: { atk: 1 }, lure: 1.5, txt: '+ATK' },
  ipa: { n: 'IPA', em: '🍻', kr: 30, fx: { atk: 2, acc: -.15 }, lure: 1.5, good: 'WILD', txt: '+ATK ++, −accuracy' },
  gt: { n: 'Gin & tonic', em: '🍸', kr: 35, fx: { spd: 1, cure: 1 }, lure: 1.5, good: 'TECH', txt: '+SPD, cures confusion' },
  whisky: { n: 'Whisky', em: '🥃', kr: 50, fx: { def: 1, guilt: 1 }, lure: 2, txt: '+DEF, immune to guilt' },
  glogg: { n: 'Glögg', em: '🍷', kr: 25, fx: { heal: .3 }, lure: 1.5, good: 'FROST', txt: 'Heals 30 %' },
  snaps: { n: 'Snaps', em: '🥂', kr: 40, fx: { crit: 1 }, lure: 0, txt: '+crit, the hero sings' }
};
const FOODS = {
  burger: { n: 'IRON Burger', em: '🍔', kr: 40, k: 'atk', txt: '+ATK in battle for 60 s' },
  pizza: { n: 'Kebab pizza', em: '🍕', kr: 45, k: 'hp', txt: 'Heals 30 % and +DEF for 60 s' },
  sushi: { n: 'Salmon roll', em: '🍣', kr: 50, k: 'spd', txt: '+SPD in battle for 60 s' }
};

/* ---------- shopping list (8 random per new game) ---------- */
const ITEMS = {
  milk: { n: 'Milk', em: '🥛', z: 'freezer' }, kaviar: { n: 'Kalles kaviar', em: '🐟', z: 'fruit' },
  falukorv: { n: 'Falukorv', em: '🌭', z: 'fruit' }, crisp: { n: 'Crispbread', em: '🫓', z: 'bakery' },
  buns: { n: 'Cinnamon buns', em: '🥐', z: 'bakery' }, snus: { n: 'Snus', em: '🫙', z: 'checkout' },
  chips: { n: 'Chips & dip', em: '🥔', z: 'pickmix' }, pizza: { n: 'Frozen pizza', em: '🍕', z: 'freezer' },
  tp: { n: 'Toilet paper', em: '🧻', z: 'selfcheck' }, batt: { n: 'Batteries', em: '🔋', z: 'selfcheck' },
  oat: { n: 'Oat milk', em: '🌾', z: 'freezer' }, candy: { n: 'Pick-and-mix', em: '🍬', z: 'pickmix' }
};

/* ---------- heroes: look (for the canvas sprite), boss team, ultimate, lines ---------- */
const HERO_IDS = ['bigwman', 'wizcudi', 'jrohn', 'loken', 'ljunky'];
const HERO = {
  bigwman: { n: 'BigWman', col: '#3ddc84', team: ['bat', 'banshee', 'ghost'], ult: 'YES!', ultTxt: '+50 % ATK for the whole party for 3 turns', after: 'I need to update the spreadsheet. YES… no.',
    look: { skin: '#e9b48c', hair: null, style: 'bald', top: '#1d1d24', topStyle: 'tee', legs: '#3d5f92', shoes: '#6b4a2b', prop: 'clip', big: 1 } },
  wizcudi: { n: 'Wizcudi', col: '#8c6cff', team: ['snake', 'ghost', 'peng'], ult: 'Lights Out', ultTxt: 'the enemy misses 2 turns', after: 'Fine. But turn the light off on your way out.',
    look: { skin: '#e9b48c', hair: '#5a3a22', style: 'short', beard: '#5a3a22', glasses: 1, top: '#1d1d24', top2: '#f5c518', topStyle: 'stripe', legs: '#3d5f92', shoes: '#333' } },
  jrohn: { n: 'Jrohn', col: '#ff4fa3', team: ['cuke', 'slime', 'bear'], ult: 'I Love This!', ultTxt: 'heals the party 50 % and charms the enemy', after: 'I LOVE THIS! Losing, I mean. Hug?',
    look: { skin: '#e9b48c', hair: '#6b4226', style: 'short', top: '#4f6e3a', top2: '#2e4424', topStyle: 'plaid', legs: '#6b6247', shoes: '#4a3220', prop: 'plant' } },
  loken: { n: 'Löken', col: '#f5c242', team: ['crow', 'golem', 'bear'], ult: 'Stick Together, Boys!', ultTxt: 'every creature in the party attacks at once', after: 'Good fight. Now get off the lawn. Gently.',
    look: { skin: '#e9b48c', hair: '#8a5a2b', style: 'cap', cap: '#f5c518', cap2: '#1d1d24', beard: '#8a5a2b', top: '#b9c1cc', topStyle: 'armor', legs: '#5a4a30', shoes: '#4a3220', prop: 'shield' } },
  ljunky: { n: 'Ljunky', col: '#f7931a', team: ['frog', 'mummy', 'snake'], ult: 'Buy the Dip', ultTxt: '50 %: double damage. 50 %: zero.', after: 'Unrealised loss. It does not count.',
    look: { skin: '#f0c4a0', hair: '#f0d878', style: 'short', top: '#1d1d24', topStyle: 'tee', legs: '#25252b', shoes: '#222', prop: 'bow' } }
};
const BOSS_LINES = { // boss -> player hero
  bigwman: { wizcudi: 'I ran the numbers. Your electricity savings fund exactly zero of my packages.', jrohn: "Let's settle it, Jrohn. Biggest… spreadsheet wins. Mine has more rows. YES!", loken: "I respect the lawn, Löken. I don't respect the lawn budget.", ljunky: "Bitcoin is not an asset class. It's a cry for help." },
  wizcudi: { loken: 'AIK forever. Djurgården never. And who left that light on?!', bigwman: 'I calculated 300 moves ahead. You calculated VAT.', jrohn: "Put a shirt on, you're heating the room and I can't afford that.", ljunky: 'Your mining rig costs me money from across town. I can feel it.' },
  jrohn: { bigwman: "Pants off, cards on the table. Today we find out who's bigger. I LOVE THIS!", wizcudi: 'Relax, I left every light in the basement on. For you.', loken: 'Hug first, fight after. …Where did my shirt go?', ljunky: 'Have you seen Walter? No? Then you have to fight me.' },
  loken: { wizcudi: "You're standing on Djurgården grass now. Stick together, boys… except you.", bigwman: 'I dropped 400 kr on the way here. Put it in a spreadsheet.', jrohn: 'Not on the lawn! Keep your pants ON on the lawn!', ljunky: 'The coins I drop are real. Yours are imaginary.' },
  ljunky: { bigwman: "I put your whole pension in a coin called ZOMBIE. You're welcome.", wizcudi: "I explained the rules. Twice. Unclearly. That's on you.", jrohn: "My cats ate your plants. Let's call it even.", loken: "Have you checked the Bitcoin price today? No? That's why you lose." }
};

/* ---------- partners (Psychic / Guilt). guy = the hero she is looking for ---------- */
const PARTNERS = {
  cicci: { n: 'Cicci', guy: 'bigwman', kind: 'Guilt', col: '#f4f6fb',
    moves: [{ n: 'Another package?', fx: 'stun' }, { n: 'We said a budget.', fx: 'atk' }],
    good: ['I cancelled the packages. All of them.', "He's at the checkouts, signing for something."], bad: ["It's an investment, technically.", 'Packages? What packages?'],
    look: { skin: '#f0c09a', hair: '#f0d070', style: 'updo', top: '#f4f6fb', topStyle: 'gown', legs: '#f4f6fb', shoes: '#dfe6f2', prop: 'bouquet' } },
  anna: { n: 'Anna', guy: 'wizcudi', kind: 'Psychic', col: '#c8262e',
    moves: [{ n: 'Turn it back ON.', fx: 'conf' }, { n: 'Ellie wants the light on.', fx: 'dmg' }],
    good: ['I turned the light ON. For Ellie.', "He's at the E.ON charger, guarding the meter."], bad: ['Do you know what that lamp costs per hour?', "He told me to say he's in a meeting."],
    look: { skin: '#f0c09a', hair: '#f2d27a', style: 'long', freckles: 1, top: '#c8262e', topStyle: 'dress', legs: '#f0c09a', shoes: '#c8262e', prop: 'clutch' } },
  monika: { n: 'Monika', guy: 'jrohn', kind: 'Guilt', col: '#1f2a44',
    moves: [{ n: 'Where are your clothes?', fx: 'def' }, { n: 'Walter ran away AGAIN.', fx: 'dmg' }],
    good: ['Shirt on. Walter found. Let\'s go home.', "He's in the flower department, talking to plants."], bad: ['Have you seen my pants?', 'Clothes are a social construct.'],
    look: { skin: '#f0c09a', hair: '#e8c46a', style: 'long', top: '#1f2a44', top2: '#cfe3ea', topStyle: 'blazer', legs: '#34343c', shoes: '#8a5a2b', prop: 'tablet' } },
  sofia: { n: 'Sofia', guy: 'loken', kind: 'Psychic', col: '#1d1d24',
    moves: [{ n: 'Not another Djurgården match.', fx: 'conf' }, { n: 'The lawn can wait.', fx: 'dmg' }],
    good: ['No match today. Just you and me.', "He's on the lawn by the lake. Guarding it."], bad: ['Djurgården plays at seven, though.', 'Löken? Never heard of him.'],
    look: { skin: '#eebd96', hair: '#7a4a2a', style: 'bob', top: '#1d1d24', topStyle: 'tee', necklace: 1, legs: '#3a3d48', shoes: '#f4f4f4' } },
  maadmads: { n: 'MaadMads', guy: 'ljunky', kind: 'Guilt', col: '#16161c',
    moves: [{ n: 'Did you buy the dip again?', fx: 'spd' }, { n: 'The cats need food.', fx: 'dmg' }],
    good: ['I sold everything. The cats are fed.', "He's in Systembolaget, buying the dip in liquid form."], bad: ["It's not a dip, it's a discount.", "He's mining. Somewhere. Don't ask."],
    look: { skin: '#f0c09a', hair: '#f4e08a', style: 'straight', top: '#16161c', topStyle: 'blazer', top2: '#2a2a30', legs: '#16161c', shoes: '#111', prop: 'wine', cats: 1 } }
};

/* ---------- NPCs: nonsense ---------- */
const NPC_LINES = {
  bigwman: ['He balanced the national budget with a calculator and a YES.', 'He owes me for 14 packages. The packages owe ME.', 'Why does his Polestar need to be that quiet? What is he sneaking away from?'],
  wizcudi: ['He turned off the sun once. Saved 3 kronor.', "He called me a feeder through the wall. I don't even play.", 'Every lamp in here flickers when he walks by. Coincidence?'],
  jrohn: ['He hugged a zombie and it went vegan.', 'I found a sock in the frozen peas. It said JROHN.', 'Nobody has been down in his basement. Nobody has come UP either.'],
  loken: ['His lawn is so perfect the grass mows itself out of respect.', 'He cut in line at the bottle return. Gently. Loyally. Still rude.', 'Where do all those coins come from? WHERE?'],
  ljunky: ['He caught a vase, a cat and a Bitcoin in mid-air. Same day.', 'He explained crypto to me for two hours. Now I owe him money.', 'He built this place. Look at the corners. Pixels.']
};
const NONSENSE = ['The cucumbers vote AIK.', 'Unexpected item in bagging area. Unexpected YOU.', "I've been in this queue since 2019.", 'Discount on souls today.', 'Can you smell purple?', 'The trolleys are unionizing.', "Don't look the self-checkout in the eye."];

/* ===================== SPRITES (canvas only) ===================== */
/* People: 12 x 20 px chibi, feet at (x, y). dir 0 down, 1 up, 2 left, 3 right. step = walk frame. */
function drawPerson(c, x, y, L, dir = 0, step = 0, glitch = 0) {
  x = Math.round(x - 6); y = Math.round(y - 20);
  const P = (px, py, w, h, col) => { if (!col) return; c.fillStyle = col; c.fillRect(x + px, y + py, w, h); };
  c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(x + 6, y + 20, 6, 2, 0, 0, 7); c.fill();
  const sk = L.skin, up = dir === 1, side = dir >= 2, lift = step ? 1 : 0;
  const skirt = L.topStyle === 'dress' || L.topStyle === 'gown';
  // legs + shoes
  if (L.topStyle === 'gown') { P(1, 13, 10, 7, L.top); P(0, 18, 12, 2, L.top); P(2, 15, 1, 4, 'rgba(0,0,0,.06)'); }
  else {
    P(3, 14, 3, 5 - lift, skirt ? sk : L.legs); P(6, 14, 3, 5 - (step === 2 ? 1 : 0), skirt ? sk : L.legs);
    P(3, 19 - lift, 3, 1, L.shoes); P(6, 19 - (step === 2 ? 1 : 0), 3, 1, L.shoes);
    if (L.shoes === '#f4f4f4') { P(4, 19 - lift, 1, 1, '#c8262e'); P(7, 19 - (step === 2 ? 1 : 0), 1, 1, '#c8262e'); }
  }
  // torso
  const tw = L.big ? 10 : 8, tx = L.big ? 1 : 2;
  P(tx, 8, tw, 6, L.top);
  if (L.topStyle === 'dress') P(2, 13, 8, 3, L.top);
  if (L.topStyle === 'stripe') for (let i = 0; i < 3; i++) P(tx, 9 + i * 2, tw, 1, L.top2);
  if (L.topStyle === 'plaid') { P(tx + 2, 8, 1, 6, L.top2); P(tx + 5, 8, 1, 6, L.top2); P(tx, 10, tw, 1, L.top2); P(tx, 12, tw, 1, L.top2); }
  if (L.topStyle === 'armor') { P(tx, 8, tw, 1, '#e6ebf1'); P(tx + 3, 9, 2, 4, '#8d96a3'); P(tx, 13, tw, 1, '#6d5a3a'); }
  if (L.topStyle === 'blazer' && !up) { P(tx + 3, 8, 2, 5, L.top2 || '#cfe3ea'); }
  if (L.necklace && !up) P(4, 9, 4, 1, '#d8d8e0');
  // arms
  const arm = L.topStyle === 'tee' || L.topStyle === 'dress' || L.topStyle === 'gown' ? sk : L.top;
  P(tx - 1, 9, 1, 4, arm); P(tx + tw, 9, 1, 4, arm); P(tx - 1, 13, 1, 1, sk); P(tx + tw, 13, 1, 1, sk);
  // head
  P(3, 1, 6, 7, sk);
  if (!up) {
    const ex = dir === 2 ? -1 : dir === 3 ? 1 : 0;
    if (!side || dir === 2) P(4 + ex, 4, 1, 1, '#1a1a22');
    if (!side || dir === 3) P(7 + ex, 4, 1, 1, '#1a1a22');
    P(5 + ex, 6, 2, 1, '#b5574b');
    if (L.glasses) { P(3 + ex, 4, 3, 1, 'rgba(20,20,30,.75)'); P(6 + ex, 4, 3, 1, 'rgba(20,20,30,.75)'); }
    if (L.freckles) { P(4, 5, 1, 1, '#c98a66'); P(7, 5, 1, 1, '#c98a66'); }
    if (L.beard) { P(3, 6, 6, 2, L.beard); P(5 + ex, 6, 2, 1, '#b5574b'); }
    if (L.stache) P(4 + ex, 5, 4, 1, '#3a2414');
    if (L.patch) { P(6, 3, 3, 2, '#111'); P(3, 3, 6, 1, '#111'); }
  }
  // hair
  const h = L.hair;
  switch (L.style) {
    case 'bald': P(3, 1, 6, 1, 'rgba(255,255,255,.25)'); break;
    case 'short': P(3, 0, 6, 2, h); P(2, 1, 1, 3, h); P(9, 1, 1, 3, h); if (up) P(3, 0, 6, 6, h); break;
    case 'cap': P(2, 0, 8, 2, L.cap); P(3, 1, 6, 1, L.cap2); if (!up) P(dir === 2 ? 0 : dir === 3 ? 7 : 2, 2, 5, 1, L.cap); else P(3, 2, 6, 4, h); break;
    case 'bob': P(2, 0, 8, 2, h); P(2, 2, 1, 6, h); P(9, 2, 1, 6, h); if (up) P(2, 0, 8, 8, h); break;
    case 'long': case 'straight': P(2, 0, 8, 2, h); P(1, 2, 2, 10, h); P(9, 2, 2, 10, h); if (L.style === 'long') { P(0, 6, 1, 5, h); P(11, 6, 1, 5, h); } if (up) P(2, 0, 8, 12, h); break;
    case 'updo': P(3, 0, 6, 2, h); P(2, 1, 1, 3, h); P(9, 1, 1, 3, h); P(4, -2, 4, 2, h); P(2, 4, 1, 3, h); P(9, 4, 1, 3, h); break;
    case 'messy': P(2, -1, 8, 3, h); P(1, 1, 1, 6, h); P(10, 1, 1, 6, h); P(3, -2, 2, 1, h); P(7, -2, 2, 1, h); break;
    case 'hat': P(1, 0, 10, 2, h); P(3, -2, 6, 2, h); break;
  }
  // props
  switch (L.prop) {
    case 'clip': P(10, 10, 3, 4, '#2c9a5a'); P(11, 11, 1, 2, '#bff5d2'); break;
    case 'plant': P(10, 11, 3, 3, '#8a4f2a'); P(10, 8, 3, 3, '#3f9a3a'); break;
    case 'shield': P(-1, 8, 4, 6, '#2b56b0'); P(0, 9, 2, 4, '#f5c518'); break;
    case 'bow': P(10, 6, 1, 12, '#8a5a2b'); P(11, 7, 1, 10, 'rgba(255,255,255,.5)'); P(10, 10, 1, 1, '#f7931a'); break;
    case 'bouquet': P(4, 10, 4, 3, '#f3a6a6'); P(5, 13, 2, 2, '#5fae3e'); P(4, 10, 1, 1, '#f7c99a'); break;
    case 'clutch': P(0, 12, 3, 2, '#a01c22'); break;
    case 'tablet': P(10, 8, 3, 4, '#cfe8f3'); P(-1, 12, 3, 1, '#e8eef3'); break;
    case 'wine': P(10, 8, 2, 2, '#8a1020'); P(10, 10, 2, 1, 'rgba(255,255,255,.6)'); P(10.5, 11, 1, 2, 'rgba(255,255,255,.6)'); break;
    case 'bag': P(10, 11, 3, 4, '#e8eef3'); break;
    case 'apron': P(3, 9, 6, 5, '#f4f4f4'); break;
  }
  if (L.cats) { drawCat(c, x - 5, y + 20, '#f2efe8', '#cfc8bc'); drawCat(c, x + 17, y + 20, '#d8c8b0', '#4a3a30'); }
  if (glitch) {
    for (let i = 0; i < 3; i++) { const gy = (Math.random() * 20) | 0; c.fillStyle = pick(['#3dff8a', '#ff3df0', '#3dd6ff']); c.fillRect(x + rand(-3, 3), y + gy, 12, 1); }
  }
}
function drawCat(c, x, y, fur, pt) {
  c.fillStyle = fur; c.fillRect(x - 3, y - 4, 6, 4); c.fillRect(x - 3, y - 7, 4, 3);
  c.fillStyle = pt; c.fillRect(x - 3, y - 8, 1, 1); c.fillRect(x, y - 8, 1, 1); c.fillRect(x + 3, y - 3, 2, 1); c.fillRect(x - 2, y - 6, 2, 1);
  c.fillStyle = '#3a7bd5'; c.fillRect(x - 2, y - 6, 1, 1);
}
/* a person as a crisp, upscaled canvas (battle intro, dialog avatar) */
const portraitCache = {};
function portrait(key, L) {
  if (portraitCache[key]) return portraitCache[key];
  const cv = document.createElement('canvas'); cv.width = L.cats ? 36 : 16; cv.height = 24;
  const c = cv.getContext('2d'); drawPerson(c, cv.width / 2, 22, L, 0, 0);
  return (portraitCache[key] = cv);
}

/* Creatures: vector shapes on a 48 x 48 canvas, upscaled with smoothing off = chunky GBA pixels. */
function cBody(c, col, f) { c.fillStyle = col; c.beginPath(); f(); c.fill(); }
const E = (c, x, y, r, col) => { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, r, r, 0, 0, 7); c.fill(); };
const O = (c, x, y, rx, ry, col, rot = 0) => { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, 7); c.fill(); };
const Rc = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
function eyes(c, x1, x2, y, r = 3, glow) {
  for (const x of [x1, x2]) { E(c, x, y, r, glow || '#fff'); E(c, x + .6, y + .4, r * .55, glow ? '#fff8c0' : '#111'); if (!glow) E(c, x - .6, y - .8, r * .22, '#fff'); }
}
const CREATURE_ART = {
  frog(c) {
    O(c, 0, 20, 14, 3, 'rgba(0,0,0,.25)');
    O(c, -12, 16, 5, 3, '#3f9a3a'); O(c, 12, 16, 5, 3, '#3f9a3a');
    Rc(c, -10, -2, 20, 20, '#e8c547'); Rc(c, -10, 4, 20, 7, '#2f6fd0'); Rc(c, -10, -2, 20, 2, '#c9ced6'); Rc(c, -10, 16, 20, 2, '#c9ced6');
    c.fillStyle = '#fff'; c.font = 'bold 5px sans-serif'; c.textAlign = 'center'; c.fillText('FOLK', 0, 9.5);
    O(c, 0, -6, 13, 7, '#4fb548'); E(c, -7, -12, 5, '#4fb548'); E(c, 7, -12, 5, '#4fb548'); eyes(c, -7, 7, -12, 3);
    c.strokeStyle = '#1e5a1e'; c.lineWidth = 1.2; c.beginPath(); c.arc(0, -5, 5, .2, Math.PI - .2); c.stroke();
    for (const [x, y, r] of [[-5, -20, 3], [0, -22, 4], [5, -20, 3], [-9, -18, 2], [9, -18, 2]]) E(c, x, y, r, '#fffbea');
  },
  cuke(c) {
    O(c, 0, 20, 16, 3, 'rgba(0,0,0,.25)');
    c.fillStyle = '#9fdc7a'; c.beginPath(); c.moveTo(-4, -6); c.lineTo(-20, -16); c.lineTo(-14, 0); c.fill(); c.beginPath(); c.moveTo(4, -6); c.lineTo(20, -16); c.lineTo(14, 0); c.fill();
    O(c, 0, 4, 10, 17, '#3f8f3a', .25); O(c, -2, 2, 6, 13, '#57ad4a', .25);
    for (const [x, y] of [[-4, -6], [3, 0], [-5, 8], [4, 12], [0, -12]]) E(c, x, y, 1.2, '#2b6a28');
    c.strokeStyle = '#7fd36a'; c.lineWidth = 1.5; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 2.4, -16); c.lineTo(i * 4, -23); c.stroke(); }
    eyes(c, -4, 5, -9, 2.8); O(c, 1, -3, 4, 2, '#2b6a28');
  },
  peng(c) {
    O(c, 0, 21, 14, 3, 'rgba(0,0,0,.25)');
    O(c, -6, 20, 5, 2, '#f39c34'); O(c, 6, 20, 5, 2, '#f39c34');
    O(c, 0, 4, 15, 17, '#22262e'); O(c, 0, 7, 10, 13, '#f4f6fa');
    O(c, -15, 6, 4, 9, '#22262e', .3); O(c, 15, 6, 4, 9, '#22262e', -.3);
    Rc(c, -13, 4, 26, 8, 'rgba(120,200,120,.85)'); for (let i = -10; i <= 10; i += 4) E(c, i, 8, 1.4, '#3f9a3a');
    Rc(c, -13, 4, 26, 1, 'rgba(255,255,255,.7)');
    eyes(c, -5, 5, -7, 2.6); c.fillStyle = '#f39c34'; c.beginPath(); c.moveTo(-3, -3); c.lineTo(3, -3); c.lineTo(0, 1); c.fill();
    E(c, -9, -12, 1.5, '#dff4ff'); E(c, 10, -1, 1.2, '#dff4ff');
  },
  golem(c) {
    O(c, 0, 21, 17, 3, 'rgba(0,0,0,.25)');
    c.strokeStyle = '#8c96a2'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-16, -10); c.lineTo(16, -10); c.lineTo(12, 12); c.lineTo(-12, 12); c.closePath(); c.fillStyle = 'rgba(140,150,162,.35)'; c.fill(); c.stroke();
    c.lineWidth = 1; for (let i = -12; i <= 12; i += 4) { c.beginPath(); c.moveTo(i, -10); c.lineTo(i * .8, 12); c.stroke(); } for (let j = -5; j <= 8; j += 5) { c.beginPath(); c.moveTo(-15, j); c.lineTo(15, j); c.stroke(); }
    Rc(c, -18, -15, 36, 3, '#d8312f');
    E(c, -9, 17, 3.5, '#333'); E(c, 9, 17, 3.5, '#333'); O(c, 11, 17, 2, 3.5, '#555', .8);
    c.lineWidth = 3; c.strokeStyle = '#8c96a2'; c.beginPath(); c.moveTo(-15, -2); c.lineTo(-22, 6); c.stroke(); c.beginPath(); c.moveTo(15, -2); c.lineTo(22, -8); c.stroke();
    E(c, -22, 7, 3, '#6d7682'); E(c, 22, -9, 3, '#6d7682');
    eyes(c, -5, 5, -3, 3, '#ffd23a');
  },
  ghost(c) {
    O(c, 0, 22, 12, 2.5, 'rgba(0,0,0,.18)');
    c.fillStyle = '#e6f0f4'; c.beginPath(); c.moveTo(-15, 16); c.lineTo(-15, -6); c.arc(0, -6, 15, Math.PI, 0); c.lineTo(15, 16);
    for (let i = 0; i < 5; i++) c.lineTo(15 - i * 7.5 - 3.75, i % 2 ? 16 : 11); c.closePath(); c.fill();
    Rc(c, -10, -14, 20, 14, '#1c2a36'); Rc(c, -10, -14, 20, 1, '#3c5a6e');
    Rc(c, -6, -10, 3, 3, '#5ff0ff'); Rc(c, 3, -10, 3, 3, '#5ff0ff'); Rc(c, -4, -4, 8, 1.5, '#5ff0ff');
    c.fillStyle = 'rgba(255,40,40,.75)'; c.beginPath(); c.moveTo(-2, 0); c.lineTo(2, 0); c.lineTo(10, 18); c.lineTo(-10, 18); c.fill();
  },
  slime(c) {
    O(c, 0, 20, 17, 3, 'rgba(0,0,0,.25)');
    c.fillStyle = 'rgba(140,220,255,.55)'; c.beginPath(); c.moveTo(-17, 18); c.quadraticCurveTo(-20, -4, -6, -14); c.quadraticCurveTo(0, -22, 6, -14); c.quadraticCurveTo(20, -4, 17, 18); c.closePath(); c.fill();
    for (const [x, y, col] of [[-8, 8, '#ff4f7b'], [6, 10, '#ffd23a'], [-2, 13, '#7bd36a'], [9, 1, '#b05cff'], [-10, 0, '#ff9a3a']]) { O(c, x, y, 3, 2, col, x * .1); }
    Rc(c, 0, 4, 4, 2, '#ff4f7b'); Rc(c, -4, 15, 6, 1.5, '#fff');
    eyes(c, -5, 5, -5, 3); O(c, -9, -8, 3, 2, 'rgba(255,255,255,.7)');
  },
  bat(c) {
    O(c, 0, 22, 10, 2, 'rgba(0,0,0,.18)');
    c.fillStyle = '#b9bec7'; c.beginPath(); c.moveTo(-8, -2); c.lineTo(-24, -12); c.lineTo(-20, 0); c.lineTo(-24, 8); c.lineTo(-8, 6); c.fill();
    c.beginPath(); c.moveTo(8, -2); c.lineTo(24, -12); c.lineTo(20, 0); c.lineTo(24, 8); c.lineTo(8, 6); c.fill();
    c.fillStyle = '#f4f6f8'; c.beginPath(); c.moveTo(-10, -10); c.lineTo(10, -10); c.lineTo(12, 16); c.lineTo(-12, 16); c.closePath(); c.fill();
    c.strokeStyle = '#f4f6f8'; c.lineWidth = 2.5; c.beginPath(); c.arc(-5, -12, 4, Math.PI, 0); c.stroke(); c.beginPath(); c.arc(5, -12, 4, Math.PI, 0); c.stroke();
    c.strokeStyle = 'rgba(0,0,0,.12)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-6, -8); c.lineTo(-4, 14); c.moveTo(5, -8); c.lineTo(7, 14); c.stroke();
    eyes(c, -4, 4, -4, 2.5); c.fillStyle = '#d8312f'; c.font = 'bold 6px sans-serif'; c.textAlign = 'center'; c.fillText('2 KR', 0, 10);
  },
  mummy(c) {
    O(c, 0, 21, 15, 3, 'rgba(0,0,0,.25)');
    E(c, 0, 2, 17, '#c98a4a'); c.strokeStyle = '#8a5522'; c.lineWidth = 2.2; c.beginPath();
    for (let a = 0; a < 14; a += .2) { const r = a * 1.15; const x = Math.cos(a) * r, y = 2 + Math.sin(a) * r; a ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
    c.fillStyle = 'rgba(245,240,225,.95)'; c.save(); c.rotate(-.25); c.fillRect(-18, -6, 36, 4); c.fillRect(-18, 8, 36, 4); c.restore(); c.save(); c.rotate(.5); c.fillRect(-18, 0, 30, 3.5); c.restore();
    for (const [x, y] of [[-6, -5], [6, -5]]) { E(c, x, y, 3.2, '#ffe14a'); E(c, x, y, 1.4, '#fff'); }
    E(c, -10, -12, 1.2, '#fff'); E(c, 9, 13, 1.2, '#fff');
  },
  banshee(c) {
    O(c, 0, 22, 12, 2.5, 'rgba(0,0,0,.18)');
    c.fillStyle = '#ffd23a'; c.beginPath(); c.moveTo(-14, -18); c.lineTo(10, -18); c.lineTo(18, 0); c.lineTo(10, 18); c.lineTo(-14, 18); c.closePath(); c.fill();
    c.strokeStyle = '#c99a10'; c.lineWidth = 1.5; c.stroke(); E(c, 11, 0, 2.2, '#2a2a2a');
    O(c, -3, 6, 7, 9, '#2a0a12'); O(c, -3, 11, 4, 3, '#e0405a');
    c.strokeStyle = '#2a2a2a'; c.lineWidth = 2; c.beginPath(); c.moveTo(-11, -12); c.lineTo(-5, -9); c.moveTo(5, -12); c.lineTo(-1, -9); c.stroke();
    E(c, -8, -6, 2.4, '#fff'); E(c, 2, -6, 2.4, '#fff'); E(c, -8, -6, 1.1, '#111'); E(c, 2, -6, 1.1, '#111');
    c.fillStyle = '#d8312f'; c.font = 'bold 6px sans-serif'; c.textAlign = 'center'; c.fillText('-50%', -3, -12);
  },
  crow(c) {
    O(c, 0, 21, 13, 3, 'rgba(0,0,0,.25)');
    Rc(c, -4, 14, 1.5, 6, '#555'); Rc(c, 3, 14, 1.5, 6, '#555');
    O(c, -2, 6, 13, 10, '#1d1f26'); O(c, -13, 4, 8, 4, '#2a2d36', -.4); O(c, 9, -6, 8, 8, '#1d1f26');
    c.fillStyle = '#9aa0a8'; c.beginPath(); c.moveTo(15, -8); c.lineTo(23, -5); c.lineTo(15, -3); c.fill();
    Rc(c, 19, -10, 5, 8, '#d8312f'); Rc(c, 19, -10, 5, 1.5, '#c9ced6');
    E(c, 11, -8, 2.2, '#fff'); E(c, 11.6, -8, 1.1, '#111');
    O(c, -14, 12, 6, 2.5, '#1d1f26', .5);
  },
  snake(c) {
    O(c, 0, 21, 16, 3, 'rgba(0,0,0,.25)');
    c.strokeStyle = '#2f8f3a'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath();
    c.moveTo(-18, 16); c.bezierCurveTo(-4, 24, 14, 18, 6, 8); c.bezierCurveTo(-2, 0, -12, 2, -6, -8); c.stroke();
    c.strokeStyle = '#59c264'; c.lineWidth = 2; c.stroke(); c.lineCap = 'butt';
    Rc(c, -12, -20, 13, 12, '#c9ced6'); Rc(c, -12, -20, 13, 2, '#eef1f4');
    Rc(c, -9, -26, 2, 6, '#e8c547'); Rc(c, -3, -26, 2, 6, '#e8c547');
    eyes(c, -9, -3, -14, 2.2); Rc(c, -8, -10, 5, 1, '#333');
    E(c, 8, -16, 2, '#7df0ff'); E(c, 13, -10, 1.4, '#7df0ff');
  },
  bear(c) {
    O(c, 0, 21, 16, 3, 'rgba(0,0,0,.25)');
    O(c, 0, 16, 16, 4, '#d9933f'); Rc(c, -15, 7, 30, 6, '#5a3014'); Rc(c, -16, 5, 32, 3, '#6fc04a'); Rc(c, -14, 10, 28, 2, '#ffd23a');
    c.fillStyle = '#e0a04c'; c.beginPath(); c.ellipse(0, 4, 16, 12, 0, Math.PI, 0); c.fill();
    E(c, -12, -12, 4, '#f6e7c2'); E(c, 12, -12, 4, '#f6e7c2');
    E(c, 0, -6, 11, '#8a5522'); O(c, 0, -2, 5, 3.5, '#c99a6a'); E(c, 0, -3.5, 1.6, '#222');
    eyes(c, -4, 4, -8, 2.2);
    for (const [x, y] of [[-10, 0], [8, 1], [-3, 2], [12, -2]]) O(c, x, y, 1.4, .8, '#fff6dc', .4);
  }
};
const artCache = {};
function creatureCanvas(sp) {
  if (artCache[sp]) return artCache[sp];
  const cv = document.createElement('canvas'); cv.width = cv.height = 48;
  const c = cv.getContext('2d'); c.translate(24, 24);
  if (sp === 'dev') { c.translate(-24, -24); c.save(); c.scale(2, 2); drawPerson(c, 12, 23, DEV_LOOK, 0, 0); c.restore(); }
  else (CREATURE_ART[sp] || CREATURE_ART.frog)(c);
  return (artCache[sp] = cv);
}
const DEV_LOOK = Object.assign({}, HERO.ljunky.look, { hair: '#3dff8a', top: '#2a0a3a', legs: '#111', glasses: 1 });
/* draw a creature on the screen, centered at (x, y), size px tall. flip = facing right */
function drawCreature(c, sp, x, y, size, flip, alpha = 1) {
  const cv = creatureCanvas(sp);
  c.save(); c.globalAlpha = alpha; c.imageSmoothingEnabled = false; c.translate(x, y); if (flip) c.scale(-1, 1);
  c.drawImage(cv, -size / 2, -size / 2, size, size); c.restore();
}
const iconCache = {};
const creatureIcon = sp => iconCache[sp] || (iconCache[sp] = creatureCanvas(sp).toDataURL());

/* ===================== MAP (48 x 74 tiles, built from rectangles) =====================
   Tiles: ~ water  P pier  s sand  , lawn  " tall grass (encounters)  T tree  = road  o sidewalk  . asphalt
          # wall  w shop window  _ floor  : aisle floor (encounters)  f flower beds (encounters)  H shelf  F freezer
          c counter  x locked stock-room door  e charger  v van  k parked car  B table/bench  h hedge  r door mat  l parking line */
const MAP = [];
for (let y = 0; y < MH; y++) MAP.push(new Array(MW).fill('.'));
const fill = (x, y, w, h, ch) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (MAP[j] && i >= 0 && i < MW) MAP[j][i] = ch; };
const tile = (x, y) => (MAP[y] && MAP[y][x]) || '#';
function building(x, y, w, h, door, doorTop) { // walls + floor, door gap (2 wide) at x = door
  fill(x, y, w, h, '#'); fill(x + 1, y + 1, w - 2, h - 2, '_');
  const dy = doorTop ? y : y + h - 1; fill(door, dy, 2, 1, 'r');
  for (let i = x + 2; i < x + w - 2; i += 3) if (Math.abs(i - door) > 2 && !doorTop) MAP[dy][i] = 'w';
}
// the lake, beach and pier
fill(0, 0, MW, 8, '~'); fill(0, 8, MW, 1, 's'); fill(22, 2, 3, 6, 'P');
// the lawn by the lake
fill(0, 9, MW, 11, ','); for (let y = 9; y < 20; y++) { MAP[y][0] = 'T'; MAP[y][MW - 1] = 'T'; }
fill(3, 11, 9, 4, '"'); fill(31, 11, 10, 4, '"'); fill(13, 16, 7, 3, '"'); fill(33, 16, 6, 3, '"');
for (const [x, y] of [[2, 17], [12, 10], [28, 17], [43, 10], [44, 15], [20, 11]]) MAP[y][x] = 'T';
for (const [x, y] of [[17, 12], [26, 12]]) MAP[y][x] = 'B';
// path along the lawn
fill(0, 20, MW, 2, '=');
// ICA Maxi (x 1..31, y 22..46)
building(1, 22, 31, 25, 15);
fill(2, 27, 29, 1, '#'); MAP[27][16] = 'x';                    // stock room wall + locked door
fill(2, 28, 29, 11, ':');                                      // aisles
for (const x of [4, 7, 10, 13]) { fill(x, 29, 1, 5, 'H'); fill(x, 35, 1, 3, 'H'); }
for (const x of [16, 19]) { fill(x, 29, 1, 5, 'F'); fill(x, 35, 1, 3, 'F'); }
for (const x of [22, 25]) { fill(x, 29, 1, 5, 'H'); fill(x, 35, 1, 3, 'H'); }
fill(27, 28, 4, 11, 'f'); MAP[30][28] = 'B'; MAP[36][29] = 'B';   // flower department
for (const x of [3, 7, 11]) fill(x, 41, 2, 2, 'c');               // checkouts
fill(22, 40, 9, 5, ':'); for (const x of [23, 26, 29]) MAP[41][x] = 'c'; // self-checkout
fill(2, 23, 29, 4, '_'); for (const x of [4, 8, 24, 28]) fill(x, 23, 2, 1, 'H');
// Systembolaget (x 34..46, y 22..32)
building(34, 22, 13, 11, 39);
fill(35, 23, 11, 6, ':'); for (const x of [36, 39, 42]) fill(x, 24, 1, 4, 'H'); fill(40, 30, 5, 1, 'c');
// Apotek Hjärtat (x 34..46, y 35..44)
building(34, 35, 13, 10, 39); fill(36, 38, 8, 1, 'c'); fill(35, 36, 2, 1, 'H'); fill(44, 36, 2, 1, 'H');
// sidewalk + road
fill(0, 47, MW, 1, 'o'); fill(32, 22, 2, 25, 'o'); fill(0, 48, MW, 2, '=');
// parking lot
fill(0, 50, MW, 14, '.');
for (const y of [51, 56, 61]) for (let x = 13; x < 33; x += 2) MAP[y][x] = 'l';
fill(13, 53, 20, 2, '"'); fill(13, 58, 20, 2, '"'); fill(1, 52, 9, 2, '"');
for (const [x, y] of [[14, 51], [20, 51], [26, 56], [16, 61], [30, 61], [22, 56]]) MAP[y][x] = 'k';
fill(36, 51, 11, 1, 'h'); for (const x of [38, 41, 44]) MAP[52][x] = 'e'; fill(36, 56, 11, 3, '"'); // E.ON charger
fill(3, 60, 3, 2, 'v');                                       // the van
fill(0, 64, MW, 1, 'o');
// food strip + barber (doors on top)
building(1, 65, 11, 9, 5, true); fill(2, 70, 9, 1, 'c'); fill(2, 66, 4, 3, ':'); MAP[67][8] = 'B';
building(12, 65, 11, 9, 16, true); fill(13, 70, 9, 1, 'c'); MAP[67][14] = 'B'; MAP[67][20] = 'B';
building(23, 65, 11, 9, 27, true); fill(24, 70, 9, 1, 'c'); MAP[67][25] = 'B'; MAP[67][31] = 'B';
building(34, 65, 13, 9, 39, true); for (const x of [36, 40, 44]) MAP[70][x] = 'B';

const SOLID = new Set(['~', 'T', '#', 'w', 'H', 'F', 'c', 'x', 'e', 'v', 'k', 'B', 'h']);
const ENC_TILES = new Set(['"', ':', 'f']);
function solidAt(px, py) {
  const tx = Math.floor(px / T), ty = Math.floor(py / T), ch = tile(tx, ty);
  if (ch === 'x') return !(G && G.beat && G.beat.length >= 4);
  return SOLID.has(ch);
}

/* zones: first match wins. enc = [species, weight], lv = [min, max], out = outdoors (Wizcudi's Jungle Fear) */
const ZONES = [
  { id: 'stock', n: 'ICA stock room', r: [2, 23, 29, 4] },
  { id: 'fruit', n: 'Fruit & veg', r: [2, 28, 6, 11], enc: [['cuke', 6], ['banshee', 2]], lv: [4, 7] },
  { id: 'pickmix', n: 'Pick-and-mix', r: [8, 28, 6, 11], enc: [['slime', 6], ['banshee', 2]], lv: [4, 7] },
  { id: 'freezer', n: 'Freezer aisle', r: [14, 28, 7, 11], enc: [['peng', 6], ['banshee', 2]], lv: [5, 8] },
  { id: 'bakery', n: 'Bakery', r: [21, 28, 6, 11], enc: [['mummy', 5], ['banshee', 2], ['slime', 1]], lv: [5, 8] },
  { id: 'flowers', n: 'Flower department', r: [27, 28, 4, 11], enc: [['cuke', 5], ['bat', 1]], lv: [5, 8] },
  { id: 'selfcheck', n: 'Self-checkout', r: [22, 39, 9, 7], enc: [['ghost', 5], ['bat', 1]], lv: [5, 8] },
  { id: 'checkout', n: 'Checkouts', r: [2, 39, 20, 7], enc: [['bat', 1]], lv: [4, 6] },
  { id: 'system', n: 'Systembolaget', r: [34, 22, 13, 11], enc: [['frog', 5], ['crow', 3]], lv: [6, 9] },
  { id: 'apotek', n: 'Apotek Hjärtat', r: [34, 35, 13, 10] },
  { id: 'burger', n: 'IRON Burger', r: [1, 65, 11, 9], enc: [['bear', 1]], lv: [6, 9] },
  { id: 'pizza', n: 'Pizzeria Berga', r: [12, 65, 11, 9] },
  { id: 'sushi', n: 'J&K99 Sushi', r: [23, 65, 11, 9] },
  { id: 'barber', n: "Tailor's Barber", r: [34, 65, 13, 9] },
  { id: 'charger', n: 'E.ON charger', r: [35, 50, 13, 10], enc: [['snake', 5], ['bat', 2]], lv: [6, 9], out: 1 },
  { id: 'lake', n: 'The lake', r: [0, 0, MW, 9], out: 1 },
  { id: 'lawn', n: 'The lawn by the lake', r: [0, 9, MW, 13], enc: [['crow', 5], ['bat', 2]], lv: [3, 6], out: 1 },
  { id: 'parking', n: 'Parking lot', r: [0, 46, MW, 19], enc: [['bat', 5], ['golem', 2]], lv: [2, 5], out: 1 }
];
function zoneAt(px, py) {
  const tx = Math.floor(px / T), ty = Math.floor(py / T);
  return ZONES.find(z => tx >= z.r[0] && tx < z.r[0] + z.r[2] && ty >= z.r[1] && ty < z.r[1] + z.r[3]) || ZONES[ZONES.length - 1];
}
function zoneTiles(id) { // walkable tiles in a zone (for items, shimmers)
  const z = ZONES.find(q => q.id === id), out = [];
  for (let y = z.r[1]; y < z.r[1] + z.r[3]; y++) for (let x = z.r[0]; x < z.r[0] + z.r[2]; x++) if (!SOLID.has(tile(x, y)) && tile(x, y) !== 'r') out.push([x, y]);
  return out;
}
const tc = (tx, ty) => [tx * T + T / 2, ty * T + T / 2]; // tile centre in px

/* signs over doors */
const SIGNS = [
  [16.5, 46, 'ICA MAXI', '#e3000f', '#fff'], [40, 32, 'SYSTEMBOLAGET', '#0a6e3a', '#ffd23a'], [40, 44, 'APOTEK HJÄRTAT', '#2fa36b', '#fff'],
  [6, 65, 'IRON BURGER', '#222', '#f39c34'], [17, 65, 'PIZZERIA BERGA', '#b02a1e', '#fff'], [28, 65, 'J&K99 SUSHI', '#1c2a36', '#ff6b6b'],
  [40, 65, "TAILOR'S BARBER", '#3a2a4a', '#f4e08a'], [41.5, 50.5, 'E.ON', '#e3000f', '#fff'], [16.5, 27, 'STOCK ROOM', '#333', '#ff5a5a']
];

/* pre-render the static map once (1 px = 1 world unit, upscaled crisp) */
let mapCv = null;
function hash(x, y) { let h = x * 374761393 + y * 668265263; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967296; }
function renderMap() {
  const cv = document.createElement('canvas'); cv.width = MW * T; cv.height = MH * T;
  const c = cv.getContext('2d');
  const R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
    const ch = MAP[ty][tx], x = tx * T, y = ty * T, n = hash(tx, ty);
    const floor = () => { R(x, y, T, T, (tx + ty) % 2 ? '#e6e0d2' : '#ddd6c6'); };
    switch (ch) {
      case '~': R(x, y, T, T, '#2f6fb0'); R(x + (n * 10 | 0), y + 4 + (n * 8 | 0), 4, 1, '#5b9be0'); break;
      case 'P': R(x, y, T, T, '#8a6236'); for (let i = 0; i < T; i += 4) R(x, y + i, T, 1, '#6d4a26'); break;
      case 's': R(x, y, T, T, '#e8d49a'); R(x + (n * 12 | 0), y + (n * 9 | 0) + 3, 1, 1, '#c9b070'); break;
      case ',': R(x, y, T, T, '#6cbf4a'); if (n > .6) { R(x + 4, y + 6, 1, 2, '#4f9a34'); R(x + 10, y + 10, 1, 2, '#4f9a34'); } break;
      case '"': R(x, y, T, T, '#3f9a34'); for (let i = 0; i < 4; i++) { const gx = x + 1 + i * 4, gy = y + 2 + (i % 2) * 6; R(gx, gy, 1, 6, '#2c7424'); R(gx + 1, gy - 1, 1, 6, '#7ed35a'); R(gx + 2, gy + 1, 1, 5, '#2c7424'); } break;
      case 'T': R(x, y, T, T, '#6cbf4a'); R(x + 6, y + 10, 4, 6, '#6d4a26'); c.fillStyle = '#2f7d2a'; c.beginPath(); c.arc(x + 8, y + 7, 7, 0, 7); c.fill(); c.fillStyle = '#4ea83e'; c.beginPath(); c.arc(x + 6, y + 5, 3, 0, 7); c.fill(); break;
      case '=': R(x, y, T, T, '#4a4e58'); if (tx % 3 === 0 && (ty === 21 || ty === 49)) R(x + 2, y, 8, 1, '#e8e2c8'); break;
      case 'o': R(x, y, T, T, '#b8b4aa'); R(x, y, T, 1, '#9e9a90'); R(x, y, 1, T, '#9e9a90'); break;
      case '.': case 'l': R(x, y, T, T, '#5b6069'); if (n > .85) R(x + 5, y + 9, 2, 1, '#6c717b'); if (ch === 'l') R(x + 7, y, 2, T, '#e8e2c8'); break;
      case '#': R(x, y, T, T, '#8f2a2a'); R(x, y, T, 3, '#b8403a'); R(x, y + T - 1, T, 1, '#5a1a1a'); if (ty >= 65 || (tx >= 34 && ty < 47)) { R(x, y, T, T, '#6d6a72'); R(x, y, T, 3, '#8d8a92'); } break;
      case 'w': R(x, y, T, T, '#6d6a72'); R(x + 1, y + 3, T - 2, T - 5, '#9fd3ea'); R(x + 3, y + 4, 2, 6, '#d6f0fa'); break;
      case 'r': floor(); R(x + 1, y + 2, T - 2, T - 4, '#6d4a3a'); break;
      case '_': floor(); break;
      case ':': floor(); R(x, y + 7, T, 2, 'rgba(0,0,0,.05)'); break;
      case 'f': R(x, y, T, T, '#7a5a3a'); for (let i = 0; i < 3; i++) { const fx = x + 2 + i * 5, fy = y + 3 + (i % 2) * 6; R(fx, fy + 2, 1, 4, '#3f9a34'); R(fx - 1, fy, 3, 2, ['#ff6b9a', '#ffd23a', '#c06bff'][(tx + ty + i) % 3]); } break;
      case 'H': floor(); R(x + 1, y, T - 2, T, '#6d5a4a'); for (let i = 1; i < T; i += 5) { R(x + 2, y + i, T - 4, 3, ['#e3000f', '#ffd23a', '#2fa3d8', '#5fae3e', '#f39c34'][(tx * 3 + ty + i) % 5]); } break;
      case 'F': floor(); R(x + 1, y, T - 2, T, '#cfe8f3'); R(x + 2, y + 1, T - 4, T - 2, '#9fd3ea'); R(x + 3, y + 3, 4, 3, '#7ed35a'); R(x + 8, y + 9, 4, 3, '#f4f4f4'); break;
      case 'c': floor(); R(x, y + 2, T, T - 4, '#3a3a44'); R(x, y + 2, T, 2, '#5a5a66'); R(x + 3, y + 5, 5, 3, '#1c2a36'); break;
      case 'x': R(x, y, T, T, '#555'); R(x + 2, y + 1, T - 4, T - 1, '#7a5a3a'); R(x + 10, y + 8, 2, 2, '#ffd23a'); break;
      case 'e': R(x, y, T, T, '#5b6069'); R(x + 4, y, 8, T, '#e8eef3'); R(x + 5, y + 2, 6, 4, '#1c2a36'); R(x + 6, y + 3, 4, 2, '#5ff0a0'); R(x + 4, y + T - 2, 8, 2, '#e3000f'); break;
      case 'v': R(x, y, T, T, '#5b6069'); break;
      case 'k': { R(x, y, T, T, '#5b6069'); const col = ['#c8262e', '#2f6fd0', '#e8eef3', '#222', '#3ddc84'][(tx + ty) % 5]; R(x + 1, y + 1, T - 2, T - 2, col); R(x + 3, y + 3, T - 6, 4, '#9fd3ea'); R(x + 3, y + 10, T - 6, 3, 'rgba(0,0,0,.25)'); break; }
      case 'B': if (ty >= 65 || (tx >= 13 && tx <= 31 && ty > 20 && ty < 47)) { floor(); R(x + 2, y + 3, 12, 10, '#8a6236'); R(x + 2, y + 3, 12, 2, '#a87a48'); } else { R(x, y, T, T, ty < 20 ? '#6cbf4a' : '#e6e0d2'); R(x + 1, y + 6, 14, 3, '#8a6236'); R(x + 2, y + 9, 2, 4, '#5a3a20'); R(x + 12, y + 9, 2, 4, '#5a3a20'); } break;
      case 'h': R(x, y, T, T, '#2f7d2a'); R(x, y, T, 3, '#4ea83e'); break;
    }
  }
  // the van (3 x 2 tiles)
  R(3 * T + 1, 60 * T + 2, 3 * T - 2, 2 * T - 4, '#e8eef3'); R(3 * T + 1, 60 * T + 2, 3 * T - 2, 3, '#c9ced6');
  R(3 * T + 32, 60 * T + 6, 12, 8, '#3a4a5a'); R(3 * T + 4, 60 * T + 20, 30, 3, '#f7931a');
  c.fillStyle = '#222'; c.font = 'bold 6px sans-serif'; c.textAlign = 'center'; c.fillText('LAN VAN', 3 * T + 20, 60 * T + 16);
  return cv;
}

/* ===================== UI: GBA text box + one-tap menus + bag button ===================== */
const CSS = `
#m3ui{position:absolute;inset:0;pointer-events:none}
#m3ui .m3box{position:absolute;left:max(8px,env(safe-area-inset-left,0px));right:max(8px,env(safe-area-inset-right,0px));bottom:calc(10px + env(safe-area-inset-bottom,0px));
  pointer-events:auto;background:#fbfbf4;color:#1c1c2a;border:4px solid #33456b;border-radius:12px;box-shadow:0 0 0 3px #fbfbf4,0 8px 24px rgba(0,0,0,.55);
  padding:10px 12px 12px;font:700 17px/1.32 Barlow,system-ui,sans-serif;max-height:62%;overflow-y:auto;-webkit-user-select:none;user-select:none}
#m3ui .m3txt{min-height:46px;white-space:pre-line;position:relative;padding-right:16px}
#m3ui .m3txt.more::after{content:'▼';position:absolute;right:0;bottom:-2px;font-size:12px;color:#e3000f;animation:m3b .7s infinite alternate}
@keyframes m3b{to{transform:translateY(3px)}}
#m3ui .m3who{display:inline-block;font:400 13px Bungee,Impact,sans-serif;color:#fff;background:#33456b;border-radius:6px;padding:2px 8px;margin-bottom:4px}
#m3ui .m3grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}
#m3ui .m3grid.one{grid-template-columns:1fr}
#m3ui .m3grid:empty{display:none}
#m3ui .m3grid button{font:700 16px/1.15 Barlow,system-ui,sans-serif;min-height:50px;border-radius:9px;border:2px solid #33456b;background:#fff;color:#1c1c2a;
  text-align:left;padding:6px 10px;cursor:pointer;display:flex;align-items:center;gap:8px;touch-action:manipulation}
#m3ui .m3grid button:active{background:#ffe9a8}
#m3ui .m3grid button[disabled]{opacity:.42}
#m3ui .m3grid button.hot{background:#ffd23a;border-color:#8a6a00}
#m3ui .m3grid button.back{background:#e8ecf2}
#m3ui .m3grid button small{display:block;font-weight:600;font-size:12px;opacity:.72}
#m3ui .m3grid button img{width:34px;height:34px;image-rendering:pixelated;flex:none}
#m3ui .m3grid button .ty{font:400 10px Bungee,Impact,sans-serif;color:#fff;border-radius:4px;padding:1px 4px;margin-left:4px}
#m3ui .m3grid button .hp{display:block;height:5px;border-radius:3px;background:#ddd;margin-top:3px;overflow:hidden}
#m3ui .m3grid button .hp i{display:block;height:100%;background:#3ddc84}
#m3ui .m3bag{position:absolute;right:max(14px,env(safe-area-inset-right,0px));bottom:calc(18px + env(safe-area-inset-bottom,0px));width:66px;height:66px;border-radius:50%;
  pointer-events:auto;font-size:30px;border:3px solid #33456b;background:#fbfbf4;box-shadow:0 4px 14px rgba(0,0,0,.5);cursor:pointer;touch-action:manipulation}
#m3ui .m3bag small{display:block;font:400 9px Bungee,Impact,sans-serif;margin-top:-4px;color:#33456b}
`;
const ui = {};
let FLOW = 0, pending = null;
const waits = [];
function sleep(s) { const tok = FLOW; return new Promise(res => waits.push({ t: s, res: () => { if (tok === FLOW) res(); } })); }
let TEST_SPEED = 1; // tests only (window.__m3.speed)
function tickWaits(dt) { dt *= TEST_SPEED; for (const w of waits.slice()) { w.t -= dt; if (w.t <= 0) { waits.splice(waits.indexOf(w), 1); w.res(); } } }
function buildUI() {
  if (ui.root) return;
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const root = document.createElement('div'); root.id = 'm3ui'; root.hidden = true;
  root.innerHTML = '<div class="m3box" hidden><div class="m3txt"></div><div class="m3grid"></div></div><button class="m3bag" aria-label="Bag" hidden>🎒<small>BAG</small></button>';
  LOD.cv.after(root);
  Object.assign(ui, { root, box: root.querySelector('.m3box'), txt: root.querySelector('.m3txt'), grid: root.querySelector('.m3grid'), bag: root.querySelector('.m3bag') });
  ui.box.addEventListener('click', e => { if (!e.target.closest('button') && pending && pending.say) pending.res(); });
  ui.grid.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || b.disabled || !pending || pending.say) return;
    LOD.tone(880, .04, 'square', .05); LOD.haptic('light');
    pending.res(pending.vals[+b.dataset.i]);
  });
  ui.bag.addEventListener('click', () => { if (G && G.mode === 'play' && G.scene === 'map') bagMenu(); });
  const sync = () => { // show only while this mission is on screen
    const on = LOD.M === DEF && G && LOD.G === G && (G.mode === 'play' || G.mode === 'pause') && G.started;
    if (root.hidden === on) root.hidden = !on;
    const bagOn = on && G.scene === 'map' && G.mode === 'play';
    if (ui.bag.hidden === bagOn) ui.bag.hidden = !bagOn;
    requestAnimationFrame(sync);
  };
  requestAnimationFrame(sync);
}
function hideBox() { ui.box.hidden = true; ui.grid.innerHTML = ''; pending = null; }
function boxText(text, who) { ui.txt.innerHTML = (who ? '<span class="m3who">' + esc(who) + '</span><br>' : '') + esc(text); }
/* say: a line in the text box. Battle lines move on by themselves; map lines wait for a tap. */
function say(text, o = {}) {
  const tok = FLOW;
  return new Promise(res => {
    ui.box.hidden = false; boxText(text, o.who); ui.grid.innerHTML = ''; ui.txt.classList.add('more');
    const done = () => { if (pending && pending.res === done) pending = null; ui.txt.classList.remove('more'); if (tok === FLOW) res(); };
    pending = { res: done, say: true };
    const auto = o.auto != null ? o.auto : G.scene === 'battle';
    if (auto) sleep(o.t || Math.max(1.05, .5 + text.length * .026)).then(() => { if (pending && pending.res === done) done(); });
  });
}
/* ask: text + buttons. opts = [{label, sub, value, dis, cls, img, ty, hp}] -> Promise<value> */
function ask(text, opts, o = {}) {
  const tok = FLOW;
  return new Promise(res => {
    ui.box.hidden = false; boxText(text, o.who); ui.txt.classList.remove('more');
    ui.grid.className = 'm3grid' + (o.one ? ' one' : '');
    ui.grid.innerHTML = opts.map((q, i) => '<button data-i="' + i + '"' + (q.dis ? ' disabled' : '') + (q.cls ? ' class="' + q.cls + '"' : '') + '>' +
      (q.img ? '<img src="' + q.img + '" alt="">' : '') + '<span>' + esc(q.label) + (q.ty ? '<span class="ty" style="background:' + (TCOL[q.ty] || '#888') + '">' + q.ty + '</span>' : '') +
      (q.sub ? '<small>' + esc(q.sub) + '</small>' : '') + (q.hp != null ? '<span class="hp"><i style="width:' + Math.round(q.hp * 100) + '%;background:' + hpCol(q.hp) + '"></i></span>' : '') + '</span></button>').join('');
    const done = v => { if (pending && pending.res === done) pending = null; ui.grid.innerHTML = ''; if (tok === FLOW) res(v); };
    pending = { res: done, vals: opts.map(q => q.value) };
    const first = ui.grid.querySelector('button:not([disabled])'); if (first && !('ontouchstart' in window)) { try { first.focus({ preventScroll: true }); } catch (e) {} }
  });
}
const hpCol = f => f > .5 ? '#3ddc84' : f > .2 ? '#f5c242' : '#e5484d';
async function talk(who, lines) { const was = G.scene; if (was === 'map') G.scene = 'talk'; for (const l of [].concat(lines)) await say(l, { who, auto: false }); if (was === 'map') { hideBox(); G.scene = 'map'; } }

/* ===================== CREATURES: stats, levels ===================== */
let B = null; // the current battle
const heroId = () => (LOD.fighter && LOD.fighter.id) || 'ljunky';
const typeOf = c => c.t || (SP[c.sp] ? SP[c.sp].t : 'MIND');
function mk(sp, lv) { const c = { sp, lv: clamp(Math.round(lv), 1, CFG.LV_MAX), xp: 0, hp: 1 }; c.hp = maxHp(c); return c; }
function baseStat(c, i) { const s = SP[c.sp], b = s.b[i] * RAR[s.r]; return i === 0 ? Math.floor(b * c.lv / 25 * 1.4) + c.lv + 12 : Math.floor(b * c.lv / 25 * 1.3) + 5; }
const maxHp = c => Math.round(baseStat(c, 0) * (c.hpMul || 1));
const xpNeed = lv => 10 + lv * 6;
const learned = c => SP[c.sp].mv.filter(m => m[1] <= c.lv).map(m => m[0]).slice(-4);
const stageMul = s => s >= 0 ? (2 + s) / 2 : 2 / (2 - s);
const cname = c => c.partner ? PARTNERS[c.partner].n : SP[c.sp].n;
const active = () => G.party[B.me];
const curFoe = () => B.foes[B.fi];
function eStat(c, k, side) { // effective ATK/DEF/SPD in battle
  if (side === 'me' && B.swap && (k === 'atk' || k === 'def')) k = k === 'atk' ? 'def' : 'atk'; // Dev Ljunky's Patch Notes
  let v = baseStat(c, { atk: 1, def: 2, spd: 3 }[k]), s = (c.stg && c.stg[k]) || 0;
  if (side === 'me') {
    if (B.drink && B.drink[k]) s += B.drink[k];
    if (G.food && G.food.t > 0 && (G.food.k === k || (G.food.k === 'hp' && k === 'def'))) s += 1;
    if (k === 'def' && B.pants) s -= 2;
    if (k === 'spd' && B.jungle) v *= .8;
  }
  return v * stageMul(clamp(s, -6, 6));
}
function partyLevelPts() { return [...G.party, ...G.box].reduce((a, c) => a + c.lv, 0) * CFG.PTS.lvl; }
function bestMove(c, target) {
  let best = 'slam', bv = -1;
  for (const id of learned(c)) { const m = MOVES[id]; if (!m.p) continue; const v = m.p * (m.acc || 1) * eff(m.t, typeOf(target)) * (m.t === typeOf(c) ? 1.2 : 1) * (m.hits || 1); if (v > bv) { bv = v; best = id; } }
  return best;
}

/* ===================== BATTLE ===================== */
const SFX = {
  hit: () => { LOD.noise(.12, .35, 0, 900, 'lowpass'); LOD.tone(160, .1, 'square', .06, -80); },
  crit: () => { LOD.noise(.18, .45, 0, 1400, 'lowpass'); LOD.tone(90, .2, 'sawtooth', .08, -40); },
  faint: () => { LOD.tone(520, .5, 'square', .06, -420); },
  lvl: () => [523, 659, 784, 1046].forEach((f, i) => LOD.tone(f, .1, 'square', .05, 0, i * .08)),
  catch: () => [784, 988, 1175, 1568].forEach((f, i) => LOD.tone(f, .12, 'triangle', .06, 0, i * .1)),
  shake: () => LOD.tone(300, .06, 'square', .05, 80),
  start: () => { [392, 523, 392, 523, 659].forEach((f, i) => LOD.tone(f, .07, 'square', .05, 0, i * .07)); LOD.haptic('heavy'); },
  buy: () => { LOD.tone(1318, .06, 'square', .05); LOD.tone(1760, .1, 'square', .05, 0, .06); }
};
function resetStg(c) { c.stg = { atk: 0, def: 0, spd: 0 }; c.stun = 0; c.disp = c.hp; }
function stageMsg(c, k, n) { const nm = { atk: 'ATK', def: 'DEF', spd: 'SPD' }[k]; return cname(c) + "'s " + nm + (n > 0 ? (n > 1 ? ' rose sharply!' : ' rose!') : (n < -1 ? ' fell harshly!' : ' fell!')); }
async function stage(c, k, n) { c.stg[k] = clamp(c.stg[k] + n, -4, 4); await say(stageMsg(c, k, n)); }
function hurt(c, d, side) { c.hp = Math.max(0, c.hp - d); B.hitT = .45; B.hitSide = side; if (side === 'me') LOD.haptic('light'); }

async function startBattle(o) {
  if (B || !G.party.some(c => c.hp > 0)) return;
  G.scene = 'battle'; LOD.input.clear();
  const z = zoneAt(G.p.x, G.p.y);
  B = Object.assign({ kind: 'wild', foes: [], fi: 0, me: G.party.findIndex(c => c.hp > 0), turn: 0, ult: false, lure: 1, atm: false, drink: null, yes: 0, pants: false,
    jungle: heroId() === 'wizcudi' && !!z.out, conf: 0, survive: 0, angry: 0, over: false, result: '', zone: z.id, flashT: .7, said: new Set(), pkg: 0 }, o);
  for (const c of G.party) resetStg(c); for (const f of B.foes) resetStg(f);
  if (G.drinkBuff && G.drinkBuff.t > 0) { B.drink = Object.assign({ turns: CFG.DRINK_TURNS }, DRINKS[G.drinkBuff.id].fx); delete B.drink.heal; }
  SFX.start(); await sleep(.75);
  const foe = curFoe();
  if (B.kind === 'wild') { G.seen[foe.sp] = 1; await say('A wild ' + cname(foe) + ' appeared! (Lv ' + foe.lv + ')'); }
  await say('Go, ' + cname(active()) + '!');
  while (!B.over) { await round(); if (!B) return; }
  await endBattle();
}
async function round() {
  const meRef = active(), foeRef = curFoe();
  if (heroId() === 'jrohn' && !B.pants && B.turn > 0 && Math.random() < .1 && B.kind !== 'dev') {
    B.pants = true; LOD.callout('PROGRESSIVE DISROBING', 'Pants down. DEF −2 until you pull them up.', 'bad'); await say('👖 Oops. Your pants dropped. DEF fell!');
  }
  const act = await chooseAction();
  if (!B || B.over) return;
  const foeAct = B.kind === 'partner' || B.kind === 'dev' ? null : 'move';
  const meFirst = act.k !== 'move' || (B.turn === 0 && heroId() === 'wizcudi') || !foeAct ||
    eStat(meRef, 'spd', 'me') > eStat(foeRef, 'spd', 'foe') || (eStat(meRef, 'spd', 'me') === eStat(foeRef, 'spd', 'foe') && Math.random() < .5);
  if (B.turn === 0 && heroId() === 'wizcudi' && act.k === 'move' && B.kind !== 'partner') LOD.abilityCallout('Always first on turn 1 💡');
  const order = B.kind === 'partner' ? ['me', 'foe'] : meFirst ? ['me', 'foe'] : ['foe', 'me'];
  for (const side of order) {
    if (!B || B.over) return;
    if (side === 'me') { if (active() === meRef && meRef.hp > 0) await doPlayer(act); }
    else if (curFoe() === foeRef && foeRef.hp > 0) await foeTurn();
    await resolveFaints();
  }
  if (!B || B.over) return;
  if (B.drink && --B.drink.turns <= 0) { B.drink = null; await say('The drink wore off.'); }
  if (B.yes > 0 && --B.yes === 0) await say('The YES! energy fades.');
  if (B.foeYes > 0) B.foeYes--;
  if (B.conf > 0) B.conf--;
  B.turn++;
  if (B.kind === 'partner') { B.survive++; const need = partnerNeed(); if (B.survive >= need) { await say(PARTNERS[B.partner].n + ' sighs. "Fine. We will talk about this later."'); B.over = true; B.result = 'solved'; } }
}
const partnerNeed = () => CFG.PARTNER_TURNS + (PARTNERS[B.partner].guy === heroId() ? 1 : 0);

/* ---------- the player's choice: one tap per choice ---------- */
async function chooseAction() {
  for (;;) {
    const me = active(), foe = curFoe(), K = B.kind, hero = HERO[heroId()];
    const drinksN = Object.values(G.drinks).reduce((a, b) => a + b, 0) + G.tabs;
    const pct = K === 'wild' ? Math.round(catchChance(foe) * 100) : 0;
    const main = [
      K === 'partner' ? { label: '💬 Talk', value: 'talk', cls: 'hot', sub: 'Say the right thing' } : { label: '⚔️ Fight', value: 'fight', cls: 'hot' },
      { label: '🍺 Drink', value: 'drink', sub: drinksN ? drinksN + ' in the bag' : 'Bag is empty', dis: !drinksN },
      K === 'partner' ? { label: '🛡️ Endure', value: 'endure', sub: 'Half damage this turn' }
        : { label: '🛍️ Throw', value: 'throw', sub: K === 'wild' ? (heroId() === 'bigwman' ? 'Catch ' + pct + ' % · bag 2 kr' : 'Bag 2 kr or a drink lure') : 'Not your creature', dis: K !== 'wild' },
      { label: '⭐ ' + hero.ult, value: 'ult', sub: B.ult ? 'Used' : 'Hero move, once', dis: B.ult },
      { label: '🔄 Party', value: 'party', sub: G.party.filter(c => c.hp > 0).length + ' can fight' },
      { label: '🏃 Run', value: 'run', sub: K === 'wild' ? (heroId() === 'jrohn' ? 'Always works' : 'Maybe') : K === 'partner' ? 'She is not done' : 'No running', dis: K !== 'wild' }
    ];
    if (B.pants) main.unshift({ label: '👖 Pull up your pants', value: 'pull', cls: 'hot', sub: 'Uses your turn' });
    const q = K === 'partner' ? PARTNERS[B.partner].n + ' is not done. Survive ' + Math.max(1, partnerNeed() - B.survive) + ' more turns.' : 'What will ' + cname(me) + ' do?';
    const v = await ask(q, main);
    if (!B) return { k: 'none' };
    if (v === 'fight') {
      const mv = await ask('Choose a move.', learned(me).map(id => { const m = MOVES[id], e = eff(m.t, typeOf(foe)); return { label: m.n, value: id, ty: m.t || 'NONE', sub: m.p ? 'Power ' + m.p + (m.hits ? ' ×' + m.hits : '') + (e > 1 ? ' · strong!' : e < 1 ? ' · weak' : '') : 'Status' }; }).concat([{ label: '‹ Back', value: null, cls: 'back' }]));
      if (mv) return { k: 'move', mv };
    } else if (v === 'drink') {
      const opts = Object.keys(DRINKS).filter(id => G.drinks[id] > 0).map(id => ({ label: DRINKS[id].em + ' ' + DRINKS[id].n + ' ×' + G.drinks[id], sub: DRINKS[id].txt, value: id }));
      if (G.tabs) opts.unshift({ label: '💊 Fizz tablet ×' + G.tabs, sub: 'Heals 50 %', value: 'tab' });
      const d = await ask('Drink what?', opts.concat([{ label: '‹ Back', value: null, cls: 'back' }]));
      if (d === 'tab') return { k: 'tab' }; if (d) return { k: 'drink', id: d };
    } else if (v === 'throw') {
      const opts = [{ label: '🛍️ Carrier bag', sub: (heroId() === 'bigwman' ? pct + ' % · ' : '') + '2 kr (you have ' + G.kr + ')', value: 'bag', dis: G.kr < CFG.BAG_COST, cls: 'hot' }]
        .concat(Object.keys(DRINKS).filter(id => G.drinks[id] > 0).map(id => ({ label: 'Lure: ' + DRINKS[id].em + ' ' + DRINKS[id].n, sub: 'Catch chance up. 1 in 25: too strong', value: id })));
      const t = await ask('Throw what?', opts.concat([{ label: '‹ Back', value: null, cls: 'back' }]));
      if (t === 'bag') return { k: 'bag' }; if (t) return { k: 'lure', id: t };
    } else if (v === 'party') {
      const i = await pickParty('Swap to who? (uses your turn)', false);
      if (i != null && i !== B.me) return { k: 'swap', i };
    } else if (v === 'talk') {
      const P = PARTNERS[B.partner], g = P.guy === heroId() ? 0 : 1;
      const opts = [{ label: '🙏 Apologize', sub: 'She softens. You lose HP.', value: 'sorry' }, { label: '🤞 Promise', sub: 'Ends it. Adds promise debt.', value: 'promise' }];
      const lines = [{ label: '"' + P.good[g] + '"', value: 'good' }, { label: '"' + P.bad[g] + '"', value: 'bad' }]; if (Math.random() < .5) lines.reverse();
      const a = await ask('Say what?', opts.concat(lines, [{ label: '‹ Back', value: null, cls: 'back' }]));
      if (a) return { k: 'talk', a };
    } else if (v) return { k: v };
  }
}
async function pickParty(q, forced) {
  const opts = G.party.map((c, i) => ({ label: cname(c) + ' Lv ' + c.lv + (i === B.me ? ' (out)' : ''), img: creatureIcon(c.sp), ty: typeOf(c), sub: c.hp + '/' + maxHp(c) + ' HP', hp: c.hp / maxHp(c), value: i, dis: c.hp <= 0 || i === B.me }));
  if (!forced) opts.push({ label: '‹ Back', value: null, cls: 'back' });
  return ask(q, opts, { one: true });
}

/* ---------- doing things ---------- */
async function doPlayer(act) {
  const me = active(), foe = curFoe();
  if (me.stun > 0) { me.stun--; await say(cname(me) + ' is stunned and can\'t move!'); return; }
  if (heroId() === 'bigwman' && act.k !== 'run' && B.pkg < 2 && B.turn > 0 && Math.random() < .1) {
    B.pkg++; LOD.callout('PACKAGE PANIC', 'A package arrived. You sign for it.', 'bad'); await say('📦 "Package for BigWman!" You sign for it. Turn lost.'); return;
  }
  if (B.conf > 0 && Math.random() < .3 && (act.k === 'move' || act.k === 'talk')) {
    if (act.k === 'move') { act.mv = pick(learned(me)); await say('You are confused! ' + cname(me) + ' does something random.'); }
    else { act.a = pick(['sorry', 'good', 'bad', 'bad']); await say('You are confused! The wrong words come out.'); }
  }
  switch (act.k) {
    case 'move':
      if (B.kind === 'partner') { await say(PARTNERS[B.partner].n + ' is not hurt. She is disappointed.'); return; }
      await useMove(me, foe, act.mv, 'me'); return;
    case 'tab': G.tabs--; { const h = Math.round(maxHp(me) * CFG.TAB_HEAL); me.hp = Math.min(maxHp(me), me.hp + h); } await say('💊 Fizz! ' + cname(me) + ' feels better.'); return;
    case 'drink': await drinkIt(act.id, true); return;
    case 'bag': await throwBag(); return;
    case 'lure': await throwLure(act.id); return;
    case 'ult': await heroUlt(); return;
    case 'swap': B.me = act.i; resetStg(active()); await say('Come back! Go, ' + cname(active()) + '!'); return;
    case 'pull': B.pants = false; await say('👖 You pull your pants up. Dignity restored. Mostly.'); return;
    case 'endure': B.endure = true; await say(cname(me) + ' braces for the words.'); return;
    case 'run': {
      const ok = heroId() === 'jrohn' || Math.random() < clamp(.45 + .3 * eStat(me, 'spd', 'me') / eStat(foe, 'spd', 'foe'), .3, .95);
      if (heroId() === 'jrohn') LOD.abilityCallout('Run always works 🏃');
      if (ok) { await say('Got away safely!'); B.over = true; B.result = 'run'; } else await say("Can't escape!");
      return;
    }
    case 'talk': await partnerAnswer(act.a); return;
  }
}
async function useMove(user, target, id, side, o = {}) {
  const mv = MOVES[id], nm = (side === 'foe' && B.kind === 'wild' ? 'The wild ' : side === 'foe' && B.kind === 'boss' ? HERO[B.boss].n + "'s " : '') + cname(user);
  if (side === 'foe' && user.stun > 0) { user.stun--; await say(cname(user) + ' is stunned and can\'t move!'); return; }
  await say(nm + ' used ' + mv.n + '!');
  B.lunge = side; B.lungeT = .3;
  if (mv.say) await say(mv.say);
  if (mv.special) { await devSpecial(mv.special, user); return; }
  const acc = (mv.acc || 1) + (side === 'me' && B.drink && B.drink.acc ? B.drink.acc : 0);
  if (mv.p && Math.random() > acc) { await say('It missed!'); return; }
  if (!mv.p) {
    if (mv.self) for (const k in mv.self) await stage(user, k, mv.self[k]);
    if (mv.foe) for (const k in mv.foe) await stage(target, k, mv.foe[k]);
    return;
  }
  const mt = id === 'glitch' ? typeOf(user) : mv.t, tSide = side === 'me' ? 'foe' : 'me';
  let hits = mv.hits || 1, crits = 0, e = 1, dealt = 0;
  for (let h = 0; h < hits && target.hp > 0; h++) {
    if (side === 'foe' && heroId() === 'loken' && !B.atm) { B.atm = true; LOD.abilityCallout('ATM Security: first hit blocked 🛡️'); await say('🛡️ ATM Security! The first hit is blocked.'); continue; }
    const A = eStat(user, 'atk', side), D = eStat(target, 'def', tSide);
    let d = ((2 * user.lv / 5 + 2) * mv.p * A / D) / 25 + 2;
    e = eff(mt, typeOf(target));
    let critP = .07; if (side === 'me') { if (heroId() === 'ljunky') critP = .15; if (B.drink && B.drink.crit) critP = .35; }
    const crit = Math.random() < critP; if (crit) crits++;
    d *= (mt && mt === typeOf(user) ? 1.2 : 1) * e * rand(.85, 1) * (crit ? 1.5 : 1);
    if (side === 'me' && B.yes > 0) d *= 1.5;
    if (side === 'foe' && B.foeYes > 0) d *= 1.5;
    if (side === 'me' && B.dip != null) d *= B.dip;
    if (side === 'foe' && B.foeDip != null) { d *= B.foeDip; B.foeDip = null; }
    if (side === 'foe' && B.endure) d *= .5;
    if (o.mul) d *= o.mul;
    d = Math.round(d); if (d === 0 && side === 'me' && B.dip === 0) { await say('The dip kept dipping. Zero damage.'); continue; }
    d = Math.max(1, d); dealt += d;
    hurt(target, d, tSide); crit ? SFX.crit() : SFX.hit();
    await sleep(.35);
  }
  if (mv.hits && dealt) await say('Hit ' + mv.hits + ' times!');
  if (crits) await say('A critical hit!');
  if (dealt && e > 1) await say("It's super effective!"); else if (dealt && e < 1) await say("It's not very effective…");
  if (target.hp > 0 && dealt) {
    if (mv.foe) for (const k in mv.foe) await stage(target, k, mv.foe[k]);
    if (mv.stun && Math.random() < mv.stun) { target.stun = 1; await say(cname(target) + ' is stunned!'); }
  }
}
async function foeTurn() {
  const foe = curFoe(), me = active();
  if (B.kind === 'partner') return partnerTurn();
  if (B.kind === 'dev') return devTurn();
  if (B.kind === 'boss' && !B.foeUlt && B.fi >= 1 && foe.stun <= 0) { B.foeUlt = true; if (await bossUlt()) return; }
  const ids = learned(foe);
  const id = Math.random() < .7 ? bestMove(foe, me) : pick(ids);
  await useMove(foe, me, id, 'foe');
  if (B.foeDouble && me.hp > 0 && foe.hp > 0) { B.foeDouble = 0; await useMove(foe, me, bestMove(foe, me), 'foe'); }
}
async function bossUlt() { // returns true if it used the turn
  const b = B.boss, h = HERO[b], foe = curFoe(), me = active();
  await say(h.n + ': "' + h.ult.toUpperCase() + '"'); B.flashT = .4; LOD.haptic('heavy');
  if (b === 'bigwman') { B.foeYes = 3; await say(h.n + "'s team gets +50 % ATK for 3 turns!"); return true; }
  if (b === 'wizcudi') { me.stun = 1; await say('Lights Out! ' + cname(me) + ' can\'t see a thing.'); return true; }
  if (b === 'jrohn') { foe.hp = Math.min(maxHp(foe), foe.hp + Math.round(maxHp(foe) * .5)); await say(cname(foe) + ' got a big hug and healed!'); return true; }
  if (b === 'loken') { B.foeDouble = 1; await say('Stick together, boys! Two attacks this turn!'); return false; }
  if (b === 'ljunky') { B.foeDip = Math.random() < .5 ? 2 : 0; await say(B.foeDip ? 'He bought the dip. It pumped! Next hit is double.' : 'He bought the dip. It kept dipping.'); return false; }
  return false;
}
async function heroUlt() {
  const h = heroId(), me = active(), foe = curFoe(); B.ult = true;
  LOD.callout(HERO[h].ult.toUpperCase() + '!', HERO[h].ultTxt, 'good'); B.flashT = .45;
  if (h === 'bigwman') { B.yes = 3; await say('YES!!! The whole party gets +50 % ATK for 3 turns.'); }
  else if (h === 'wizcudi') { foe.stun = (foe.stun || 0) + 2; await say('Lights Out! ' + cname(foe) + ' will miss 2 turns.'); }
  else if (h === 'jrohn') {
    for (const c of G.party) if (c.hp > 0) c.hp = Math.min(maxHp(c), c.hp + Math.round(maxHp(c) * .5));
    foe.stun = (foe.stun || 0) + 1; B.lure *= 1.5; await say('I LOVE THIS! The party heals 50 % and ' + cname(foe) + ' is charmed.');
  } else if (h === 'loken') {
    await say('Stick together, boys! Everyone attacks!');
    if (B.kind === 'partner') { await say('She is not hurt. She is impressed, a little.'); B.survive++; return; }
    for (const c of G.party) { if (c.hp <= 0 || foe.hp <= 0) continue; if (!c.stg) resetStg(c); await useMove(c, foe, bestMove(c, foe), 'me', { mul: c === me ? 1 : .8 }); }
  } else if (h === 'ljunky') {
    if (B.kind === 'partner') { await say('You bought the dip. She saw it. That made it worse.'); B.angry = 1; return; }
    B.dip = Math.random() < .5 ? 2 : 0; await say(B.dip ? 'Buy the Dip… TO THE MOON! Double damage.' : 'Buy the Dip… it keeps dipping.');
    await useMove(me, foe, bestMove(me, foe), 'me'); B.dip = null;
  }
}
async function drinkIt(id, inBattle) {
  const d = DRINKS[id]; G.drinks[id]--;
  logDrink();
  if (inBattle) {
    B.drink = Object.assign(B.drink || {}, d.fx, { turns: CFG.DRINK_TURNS }); delete B.drink.heal;
    await say('Glug glug. ' + d.em + ' ' + d.n + ': ' + d.txt + '.');
    if (d.fx.heal) { const me = active(); me.hp = Math.min(maxHp(me), me.hp + Math.round(maxHp(me) * d.fx.heal)); }
    if (d.fx.cure && B.conf) { B.conf = 0; await say('Your head clears.'); }
    if (d.fx.crit) await say('🎶 "Helan går, sjung hopp faderallan lallan lej!"');
  }
}
function logDrink() {
  G.drinkLog = (G.drinkLog || []).filter(t => G.t - t < 60); G.drinkLog.push(G.t);
  if (G.drinkLog.length > CFG.BLUR_DRINKS && !(G.blurT > 0)) { G.blurT = CFG.BLUR_TIME; G.blurred = true; LOD.callout('BLUR 🥴', 'Too many drinks. Everything sways.', 'bad'); }
}
function catchChance(f) {
  const hpF = f.hp / maxHp(f);
  return clamp((1 - hpF * .78) * CATCH_R[SP[f.sp].r] * B.lure * (heroId() === 'ljunky' ? 1.25 : 1) * (f.stun > 0 ? 1.2 : 1), .05, .95);
}
async function throwBag() {
  const foe = curFoe(); G.kr -= CFG.BAG_COST;
  await say('You threw a carrier bag! (−2 kr)');
  if (heroId() === 'ljunky') LOD.abilityCallout('Ranger Aim: +25 % catch 🎯');
  const p = catchChance(foe), ok = Math.random() < p;
  const shakes = ok ? 3 : Math.random() < p * 1.6 ? 2 : Math.random() < .5 ? 1 : 0;
  B.bagT = 1; B.bagShake = 0;
  for (let i = 0; i < shakes; i++) { await sleep(.5); B.bagShake = 1; SFX.shake(); }
  await sleep(.45);
  if (!ok) { B.bagT = 0; await say(pick(['Oh no! It broke free!', 'Argh! Almost had it!', 'It ripped the bag. 2 kr wasted.'])); return; }
  SFX.catch(); LOD.haptic('success');
  const c = { sp: foe.sp, lv: foe.lv, xp: 0, hp: foe.hp };
  const isNew = !G.caught[foe.sp]; G.caught[foe.sp] = 1;
  await say('Gotcha! ' + cname(foe) + ' was bagged!' + (isNew ? ' New species! +' + fmt(CFG.PTS.species) : ''));
  if (G.party.length < 4) G.party.push(c); else { G.box.push(c); await say('Your party is full. It went to the van.'); }
  await gainXp(foe);
  B.over = true; B.result = 'caught';
}
async function throwLure(id) {
  const d = DRINKS[id], foe = curFoe(); G.drinks[id]--;
  await say('You threw the ' + d.n + ' ' + d.em + ' as a lure!');
  if (Math.random() < CFG.LURE_RIP) { B.bagT = 0; B.rip = 1; await say('💀 Too strong. RIP.'); await say(cname(foe) + ' is gone. No catch.'); B.over = true; B.result = 'rip'; return; }
  const v = id === 'snaps' ? rand(.8, 2.6) : d.lure * (d.good === typeOf(foe) ? 1.4 : 1);
  B.lure = Math.max(B.lure, v);
  await say(cname(foe) + ' sniffs the ' + d.n + '. ' + (v >= 1.8 ? 'It loves it!' : v >= 1.3 ? 'It looks relaxed.' : 'It looks unsure.') + ' (catch chance up)');
}
async function gainXp(foe) {
  const base = Math.round(foe.lv * CFG.XP_PER_LV * (B.kind === 'wild' ? 1 : 1.7));
  for (const c of G.party) if (c.hp > 0) await addXp(c, c === active() ? base : Math.round(base * CFG.XP_SHARE), c === active());
}
async function addXp(c, amt, loud) {
  if (c.lv >= CFG.LV_MAX) return;
  c.xp += amt; if (loud) await say(cname(c) + ' gained ' + amt + ' XP!');
  while (c.lv < CFG.LV_MAX && c.xp >= xpNeed(c.lv)) {
    c.xp -= xpNeed(c.lv); const old = maxHp(c); c.lv++; c.hp = Math.min(maxHp(c), c.hp + maxHp(c) - old);
    SFX.lvl(); await say(cname(c) + ' grew to Lv ' + c.lv + '!');
    for (const m of SP[c.sp].mv) if (m[1] === c.lv) await say(cname(c) + ' learned ' + MOVES[m[0]].n + '!');
  }
  if (c.lv >= CFG.LV_MAX) c.xp = 0;
  G.lvlPts = Math.max(G.lvlPts || 0, partyLevelPts());
}
async function resolveFaints() {
  if (!B || B.over) return;
  const foe = curFoe();
  if (foe.hp <= 0 && !foe.down) {
    foe.down = true; foe.downT = .5; SFX.faint();
    await say((B.kind === 'wild' ? 'The wild ' : '') + cname(foe) + ' fainted!');
    await gainXp(foe);
    if (B.kind === 'boss' && B.fi < B.foes.length - 1) {
      B.fi++; const n = curFoe(); await sleep(.3);
      await say(HERO[B.boss].n + ' sends out ' + cname(n) + '!'); G.seen[n.sp] = 1;
    } else { B.over = true; B.result = 'win'; return; }
  }
  const me = active();
  if (me.hp <= 0 && !B.said.has(me)) {
    B.said.add(me); SFX.faint(); await say(cname(me) + ' fainted!');
    if (G.party.some(c => c.hp > 0)) { const i = await pickParty('Who goes next?', true); B.me = i; resetStg(active()); await say('Go, ' + cname(active()) + '!'); }
    else { B.over = true; B.result = 'lose'; }
  }
}

/* ---------- partners: words, never hurt ---------- */
async function partnerTurn() {
  const P = PARTNERS[B.partner], me = active(), foe = curFoe(), guy = P.guy === heroId();
  if (foe.stun > 0) { foe.stun--; await say(P.n + ' pauses. Just for a second.'); return; }
  const m = pick(P.moves);
  await say(P.n + ': "' + m.n + '"');
  const mul = (guy ? 1.4 : 1) * (B.angry ? 2 : 1) * (B.endure ? .5 : 1) / stageMul(clamp(me.stg.def + (B.drink && B.drink.def || 0) - (B.pants ? 2 : 0), -6, 6));
  B.angry = 0;
  const hit = f => { const d = Math.max(1, Math.round(maxHp(me) * f * mul * rand(.85, 1.1))); hurt(me, d, 'me'); SFX.hit(); };
  if (m.fx === 'dmg') hit(.2);
  else {
    hit(.08); await sleep(.3);
    if (m.fx === 'stun') { me.stun = 1; await say(cname(me) + ' has to deal with it. Next turn is lost.'); }
    if (m.fx === 'conf') { if (B.drink && B.drink.cure) await say('The gin keeps your head clear.'); else { B.conf = 3; await say('You are confused!'); } }
    if (m.fx === 'atk' || m.fx === 'def' || m.fx === 'spd') await stage(me, m.fx, -1);
  }
  if (P.kind === 'Guilt' && me.hp > 0) {
    if (B.drink && B.drink.guilt) await say('🥃 The whisky makes you immune to guilt.');
    else { me.stg.def = clamp(me.stg.def - 1, -4, 4); await say('Guilt! ' + cname(me) + "'s DEF fell."); }
  }
  B.endure = false;
}
async function partnerAnswer(a) {
  const P = PARTNERS[B.partner], me = active();
  if (a === 'sorry') { const d = Math.round(maxHp(me) * .22); hurt(me, d, 'me'); B.survive++; await say('You apologize. ' + P.n + ' softens a little. (One turn closer)'); }
  else if (a === 'promise') { G.debt = (G.debt || 0) + 1; await say('You promise. Again. Promise debt: ' + G.debt + '.'); await say(P.n + ': "I am writing that down."'); B.over = true; B.result = 'solved'; }
  else if (a === 'good') { SFX.catch(); await say(P.n + ': "…Okay. That was actually the right thing to say."'); B.over = true; B.result = 'solved'; }
  else { B.angry = 1; LOD.haptic('error'); await say('Wrong thing to say. ' + P.n + ' is ANGRY now. Next hit doubles.'); }
}

/* ---------- Dev Ljunky: MIND, changes the rules ---------- */
async function devTurn() {
  const d = curFoe(), f = d.hp / maxHp(d), me = active();
  if (d.stun > 0) { d.stun--; await say('Dev Ljunky is compiling… (skips a turn)'); return; }
  if (!B.rules && f < .5) {
    B.rules = true; B.reversed = true; d.t = pick(TYPES); B.glitchT = 1.5; LOD.haptic('heavy');
    await say('Dev Ljunky: "Patch 1.0.1 is live. I reversed the type chart. And I am ' + d.t + ' now."'); return;
  }
  if (!B.rage && f < .28) { B.rage = true; B.glitchT = 2.2; await useMove(d, me, 'rage', 'foe'); return; }
  const r = Math.random();
  const id = r < .18 && !B.swap ? 'patch' : r < .32 && f < .75 && (B.fixes || 0) < 2 ? 'hotfix' : r < .55 ? 'spawn' : 'glitch';
  await useMove(d, me, id, 'foe');
}
async function devSpecial(k, d) {
  const me = active();
  if (k === 'patch') { B.swap = !B.swap; B.glitchT = 1; await say('Patch notes: your ATK and DEF have been swapped. "Working as intended."'); }
  else if (k === 'hotfix') { B.fixes = (B.fixes || 0) + 1; d.hp = Math.min(maxHp(d), d.hp + Math.round(maxHp(d) * .22)); await say('Hotfix deployed. Dev Ljunky healed.'); }
  else if (k === 'spawn') {
    const sp = pick(SPECIES), bug = mk(sp, d.lv - 2); resetStg(bug); B.bug = { sp, t: 1.6 };
    await say('A wild ' + SP[sp].n + ' spawns out of a bug report!');
    await useMove(bug, me, bestMove(bug, me), 'foe');
  } else if (k === 'rage') {
    await say('RAGE QUIT. The screen tears apart!'); LOD.haptic('heavy');
    const dmg = Math.round(maxHp(me) * .45 * (B.endure ? .5 : 1)); hurt(me, dmg, 'me'); SFX.crit(); await sleep(.4);
  }
}

/* ---------- after the battle ---------- */
async function endBattle() {
  const r = B.result, foe = curFoe();
  if (r === 'win' || r === 'caught') {
    if (B.kind === 'wild' && r === 'win') { const kr = foe.lv * 3; G.kr += kr; await say('You found ' + kr + ' kr in the grass.'); }
    if (B.kind === 'boss') await bossWon(B.boss);
    if (heroId() === 'loken') { for (const c of G.party) if (c.hp > 0) c.hp = Math.min(maxHp(c), c.hp + Math.round(maxHp(c) * .1)); LOD.abilityCallout('Loyalty: the party heals 10 % 💛'); }
  }
  if (r === 'solved') await partnerSolved(B.partner);
  if (r === 'lose') await blackout();
  if (heroId() === 'ljunky' && r !== 'lose' && Math.random() < .14) {
    const ids = Object.keys(G.drinks).filter(id => G.drinks[id] > 0);
    if (ids.length) { const id = pick(ids); G.drinks[id]--; LOD.callout('CAT CHAOS 🐈', 'The cats knocked a ' + DRINKS[id].n + ' out of the bag.', 'bad'); await say('🐈 The cats knock a ' + DRINKS[id].n + ' out of your bag. It rolls away.'); }
  }
  const kind = B.kind, partner = B.partner, dev = B.kind === 'dev' && r === 'win';
  for (const c of G.party) { delete c.stg; delete c.stun; delete c.disp; }
  B = null; hideBox(); G.scene = 'map'; G.encCool = CFG.ENC_COOLDOWN; G.stepD = 0; LOD.input.clear();
  if (G.food && G.food.k === 'hp') {} // nothing
  if (kind === 'partner' && PARTNERS[partner].kind === 'Psychic') { G.mirrorT = 5; LOD.toast('🌀 Psychic! Controls mirrored for 5 s', 2.5); }
  if (dev) await devWon();
}
async function blackout() {
  await say('All your creatures fainted…'); await say('You black out and wake up at Apotek Hjärtat.');
  const lost = Math.floor(G.kr * .2); G.kr -= lost;
  for (const c of G.party) c.hp = maxHp(c);
  [G.p.x, G.p.y] = tc(40, 41); G.dir = 1;
  await say('The pharmacist patched everyone up. You dropped ' + lost + ' kr somewhere.');
}

/* ---------- starting the different fights ---------- */
function wildFor(z, rare) {
  let tot = 0; for (const e of z.enc) tot += e[1];
  let r = Math.random() * tot, sp = z.enc[0][0];
  if (rare) sp = z.enc.slice().sort((a, b) => (CATCH_R[SP[a[0]].r] - CATCH_R[SP[b[0]].r]))[0][0];
  else for (const e of z.enc) { if ((r -= e[1]) <= 0) { sp = e[0]; break; } }
  const lv = Math.round(rand(z.lv[0], z.lv[1] + .99) - .49) + Math.min(5, G.beat.length) + (rare ? 1 : 0);
  return mk(sp, lv);
}
function startWild(z, rare) { startBattle({ kind: 'wild', foes: [wildFor(z, rare)] }); }
function startBoss(id) {
  const base = CFG.BOSS_LV + CFG.BOSS_LV_STEP * Math.min(3, G.beat.length);
  const foes = HERO[id].team.map((sp, i) => mk(sp, base - 1 + i));
  startBattle({ kind: 'boss', boss: id, foes });
}
function startPartner(id) {
  const avg = G.party.reduce((a, c) => a + c.lv, 0) / G.party.length;
  startBattle({ kind: 'partner', partner: id, foes: [{ partner: id, sp: 'dev', t: 'MIND', lv: Math.round(avg) + 2, hp: 1, hpMul: 1 }] });
}
function startDev() { const d = mk('dev', CFG.DEV_LV); d.hpMul = CFG.DEV_HP; d.hp = maxHp(d); startBattle({ kind: 'dev', foes: [d] }); }

/* ===================== OVERWORLD: people, objects, movement ===================== */
const L_ = (o) => Object.assign({ skin: '#eebd96', legs: '#34343c', shoes: '#222' }, o);
const NPC_DEFS = [
  { id: 'pirate', n: 'Parking-lot Pirate', at: [7, 62], area: [6, 61, 5, 3], look: L_({ hair: '#1a1a1a', style: 'hat', beard: '#1a1a1a', patch: 1, top: '#7a2a2a', legs: '#3a2a1a' }) },
  { id: 'berit', n: 'Bagging-area Berit', at: [5, 44], area: [2, 43, 9, 3], look: L_({ skin: '#f0c8a8', hair: '#d8d8d8', style: 'bob', top: '#d8312f', legs: '#2a2a33' }) },
  { id: 'pelle', n: 'Bottle-return Pelle', at: [37, 33], area: [35, 33, 10, 2], look: L_({ hair: '#8a6a4a', style: 'short', beard: '#9a9a9a', top: '#2e7d32', prop: 'bag' }) },
  { id: 'freja', n: 'Freezer Freja', at: [15, 34], area: [14, 34, 7, 1], look: L_({ skin: '#f0c8a8', hair: '#e8c46a', style: 'long', top: '#4fc3f7', legs: '#3d5f92' }) },
  { id: 'hasse', n: 'Hallucinating Hasse', at: [16, 13], area: [13, 10, 15, 5], look: L_({ hair: '#aa7744', style: 'messy', top: '#c06bd6', top2: '#ffd23a', topStyle: 'stripe', legs: '#3d5f92' }) },
  { id: 'barber', n: 'The Barber', at: [38, 68], area: [35, 66, 10, 3], look: L_({ hair: '#1a1a1a', style: 'short', stache: 1, top: '#f4f4f4', prop: 'apron' }) }
];
const KEEPERS = [
  { id: 'system', n: 'Systembolaget cashier', at: [42, 29], look: L_({ hair: '#5a3a22', style: 'bob', top: '#0a6e3a' }) },
  { id: 'apotek', n: 'Pharmacist', at: [40, 37], look: L_({ skin: '#f0c8a8', hair: '#3a2a1a', style: 'short', glasses: 1, top: '#f4f4f4' }) },
  { id: 'burger', n: 'IRON Burger cook', at: [6, 71], look: L_({ hair: '#222', style: 'cap', cap: '#222', cap2: '#f39c34', top: '#f4f4f4' }) },
  { id: 'pizza', n: 'Pizzeria Berga', at: [17, 71], look: L_({ hair: '#2a1a10', style: 'short', stache: 1, top: '#f4f4f4' }) },
  { id: 'sushi', n: 'J&K99 Sushi chef', at: [28, 71], look: L_({ hair: '#111', style: 'short', top: '#1c2a36' }) }
];
const BOSS_AT = { bigwman: [9, 44], jrohn: [29, 32], ljunky: [37, 30], wizcudi: [41, 54], loken: [24, 14] };
const PARTNER_AT = { cicci: [14, 44], anna: [38, 55], monika: [8, 19], sofia: [17, 63], maadmads: [42, 33] };
const DEV_AT = [16, 24], VAN_AT = [4, 61], PIER_AT = [23, 2], DOOR_AT = [16, 27];
const EGG_AT = [[9, 8], [18, 34], [46, 57]];

function initPeople() {
  G.npcs = NPC_DEFS.map(d => { const [x, y] = tc(d.at[0], d.at[1]); return { d, x, y, tx: x, ty: y, wait: rand(1, 4), dir: 0, step: 0, line: 0 }; });
}
function interactables() {
  const L = [], me = heroId();
  for (const n of G.npcs) L.push({ kind: 'npc', x: n.x, y: n.y, ref: n, n: n.d.n });
  for (const k of KEEPERS) { const [x, y] = tc(...k.at); L.push({ kind: 'shop', id: k.id, x, y: y + 10, n: k.n, range: 38 }); }
  for (const id of HERO_IDS) if (id !== me) { const [x, y] = tc(...BOSS_AT[id]); L.push({ kind: 'boss', id, x, y, n: HERO[id].n }); }
  for (const id in PARTNERS) { const [x, y] = tc(...PARTNER_AT[id]); L.push({ kind: 'partner', id, x, y, n: PARTNERS[id].n }); }
  if (G.beat.length >= 4 && !G.dev) { const [x, y] = tc(...DEV_AT); L.push({ kind: 'dev', x, y, n: 'Dev Ljunky' }); }
  if (G.beat.length < 4) { const [x, y] = tc(...DOOR_AT); L.push({ kind: 'door', x, y: y + 12, n: 'Stock room door', range: 26 }); }
  { const [x, y] = tc(...VAN_AT); L.push({ kind: 'van', x, y: y + 10, n: 'LAN van', range: 34 }); }
  { const [x, y] = tc(...PIER_AT); L.push({ kind: 'pier', x, y, n: 'Fishing spot', range: 26 }); }
  { const [x, y] = tc(36, 68); L.push({ kind: 'shop', id: 'barber', x: G.npcs[5].x, y: G.npcs[5].y, n: "Tailor's Barber", skip: 1 }); }
  return L.filter(o => !o.skip);
}
function nearest() {
  let best = null, bd = 1e9;
  for (const o of interactables()) { const d = Math.hypot(o.x - G.p.x, o.y - G.p.y); if (d < (o.range || 30) && d < bd) { bd = d; best = o; } }
  return best;
}
function walkable(x, y) { return !solidAt(x - 5, y - 1) && !solidAt(x + 5, y - 1) && !solidAt(x - 5, y - 6) && !solidAt(x + 5, y - 6); }

function updMap(dt) {
  const m = LOD.input.move(); let mx = m.x, my = m.y;
  if (G.mirrorT > 0) { mx = -mx; my = -my; }
  const z = zoneAt(G.p.x, G.p.y), hero = heroId();
  const sp = CFG.SPEED * LOD.perk('speed') * (G.blurT > 0 ? .8 : 1) * (hero === 'wizcudi' && z.out ? .85 : 1);
  const k = G.blurT > 0 ? 2.5 : 16;
  G.v.x += (mx * sp - G.v.x) * Math.min(1, dt * k); G.v.y += (my * sp - G.v.y) * Math.min(1, dt * k);
  if (G.blurT > 0) { G.v.x += Math.sin(G.t * 2.3) * 14 * dt * 10; }
  const ox = G.p.x, oy = G.p.y;
  const nx = G.p.x + G.v.x * dt; if (walkable(nx, G.p.y)) G.p.x = nx; else G.v.x = 0;
  const ny = G.p.y + G.v.y * dt; if (walkable(G.p.x, ny)) G.p.y = ny; else G.v.y = 0;
  const moved = Math.hypot(G.p.x - ox, G.p.y - oy);
  if (m.len > .2) G.dir = Math.abs(mx) > Math.abs(my) ? (mx < 0 ? 2 : 3) : (my < 0 ? 1 : 0);
  G.walk = moved > .2 ? G.walk + moved : 0;
  if (z.id !== G.zoneId) { G.zoneId = z.id; G.zoneT = 2.2; }
  // Löken: Coin Leak
  if (hero === 'loken' && moved > .2) { G.coinT -= dt; if (G.coinT <= 0) { G.coinT = rand(6, 10); if (G.kr > 0) { G.kr--; G.coins.push({ x: G.p.x, y: G.p.y, t: 6 }); LOD.pop(G.p.x, G.p.y - 24, '−1 kr 🪙', '#f5c242'); if (!G.flags.coin) { G.flags.coin = 1; LOD.weakCallout && LOD.weakCallout('Coins attract creatures.'); } } } }
  for (const c of G.coins) c.t -= dt; G.coins = G.coins.filter(c => c.t > 0);
  // encounters
  const ch = tile(Math.floor(G.p.x / T), Math.floor((G.p.y - 2) / T));
  if (ENC_TILES.has(ch) && z.enc && moved > 0) {
    G.stepD += moved;
    while (G.stepD >= T) {
      G.stepD -= T; G.encCool--;
      let rate = CFG.ENC_RATE * (hero === 'loken' ? 1.25 : 1) * (hero === 'wizcudi' && z.out ? 1.3 : 1) * (G.coins.length ? 1.2 : 1);
      if (G.encCool <= 0 && Math.random() < rate) { G.v.x = G.v.y = 0; startWild(z); return; }
    }
  }
  // Wizcudi sees rare creatures: a shimmer on a nearby encounter tile
  if (hero === 'wizcudi') {
    G.shimT -= dt;
    if (!G.shim && G.shimT <= 0 && z.enc) {
      const tiles = zoneTiles(z.id).filter(([x, y]) => ENC_TILES.has(tile(x, y)) && Math.hypot(x * T - G.p.x, y * T - G.p.y) < 110);
      if (tiles.length) { const [x, y] = pick(tiles); G.shim = { x: x * T + 8, y: y * T + 12, z: z.id, t: 20 }; if (!G.flags.shim) { G.flags.shim = 1; LOD.abilityCallout('You see a rare creature ✨'); } }
      G.shimT = 18;
    }
    if (G.shim) { G.shim.t -= dt; if (G.shim.t <= 0) G.shim = null; else if (Math.hypot(G.shim.x - G.p.x, G.shim.y - G.p.y) < 10) { const zz = ZONES.find(q => q.id === G.shim.z); G.shim = null; startWild(zz, true); return; } }
  }
  // shopping list items
  for (const it of G.list) if (!it.got && Math.hypot(it.x - G.p.x, it.y - G.p.y) < 13) {
    it.got = 1; SFX.buy(); LOD.haptic('success');
    const n = G.list.filter(q => q.got).length;
    LOD.pop(it.x, it.y - 16, '+' + fmt(CFG.PTS.item), '#f5c242'); LOD.toast(ITEMS[it.id].em + ' ' + ITEMS[it.id].n + '! Shopping list ' + n + '/8', 2.2);
    if (n === 8) LOD.callout('SHOPPING DONE! 🛒', 'All 8 items. The LAN will have snacks.', 'good');
  }
  // easter egg: stand still on each spot for 1 s
  if (!G.egg) EGG_AT.forEach((e, i) => {
    if (G.eggs[i]) return; const [x, y] = tc(e[0], e[1]);
    if (Math.hypot(x - G.p.x, y - G.p.y) < 12 && m.len < .1) { G.eggHold = (G.eggHold || 0) + dt; if (G.eggHold > 1) { G.eggs[i] = 1; G.eggHold = 0; const em = (LOD.egg() || {}).em || '🥚'; LOD.toast(em + ' Found ' + G.eggs.filter(Boolean).length + '/3', 2); LOD.tone(988, .1, 'square', .05); if (G.eggs.every(Boolean)) LOD.eggFound(); } }
  });
  // wandering NPCs
  for (const n of G.npcs) {
    const d = Math.hypot(n.tx - n.x, n.ty - n.y);
    if (d < 1) { n.step = 0; n.wait -= dt; if (n.wait <= 0) { const a = n.d.area; const [x, y] = tc(a[0] + (Math.random() * a[2] | 0), a[1] + (Math.random() * a[3] | 0)); if (walkable(x, y)) { n.tx = x; n.ty = y; } n.wait = rand(1.5, 4); } }
    else { const s = 22 * dt / d; n.x += (n.tx - n.x) * Math.min(1, s); n.y += (n.ty - n.y) * Math.min(1, s); n.dir = Math.abs(n.tx - n.x) > Math.abs(n.ty - n.y) ? (n.tx < n.x ? 2 : 3) : (n.ty < n.y ? 1 : 0); n.step += dt; }
  }
  G.near = nearest();
}

/* ---------- tapping: talk / shop / fight ---------- */
async function interact() {
  const o = G.near; if (!o || G.scene !== 'map') return;
  G.scene = 'talk'; G.v.x = G.v.y = 0; LOD.input.clear();
  try {
    if (o.kind === 'npc') await npcTalk(o.ref);
    else if (o.kind === 'shop') await shop(o.id);
    else if (o.kind === 'boss') await bossTalk(o.id);
    else if (o.kind === 'partner') await partnerTalk(o.id);
    else if (o.kind === 'dev') await devTalk();
    else if (o.kind === 'door') await say('🔒 STAFF ONLY. A note on the door: "Beat the four heroes. Then we talk. – management"', { auto: false });
    else if (o.kind === 'van') await vanMenu();
    else if (o.kind === 'pier') await fish();
  } finally { if (G && G.scene === 'talk') { hideBox(); G.scene = 'map'; } }
}
const say2 = (who, t) => say(t, { who, auto: false });
async function npcTalk(n) {
  const id = n.d.id;
  n.tx = n.x; n.ty = n.y; n.dir = G.p.y < n.y ? 1 : 0;
  if (id === 'pirate' && n.line++ < 1) return say2(n.d.n, 'Arr. Tall grass and shop aisles be full o\' creatures. Tap folks to talk. The 🎒 has yer stuff. Apotek heals for free.');
  if (id === 'barber') {
    const e = LOD.egg() || { what: 'secrets', em: '🥚' };
    const a = await ask('"Trim? Gossip? Hints?"', [{ label: '💈 Hint', value: 'hint' }, { label: '✂️ Moustache trim', sub: '20 kr · cosmetic', value: 'stache', dis: G.stache || G.kr < 20 }, { label: '💬 Gossip', value: 'gossip' }, { label: '‹ Leave', value: null, cls: 'back' }], { who: n.d.n });
    if (a === 'hint') return say2(n.d.n, G.egg ? 'You found them all. Now get out of my chair.' : 'Three ' + e.what + ' ' + e.em + ': one by the lake shore, one in the freezer aisle, one behind the E.ON chargers. Stand still on each.');
    if (a === 'stache') { G.kr -= 20; G.stache = 1; SFX.buy(); return say2(n.d.n, '✂️ Snip snip. A magnificent moustache. Free of charge… no wait, 20 kr.'); }
    if (a !== 'gossip') return;
  }
  const h = pick(HERO_IDS), r = Math.random();
  const line = r < .35 ? pick(NONSENSE) : '"' + HERO[h].n + '? ' + pick(NPC_LINES[h]) + '"';
  await say2(n.d.n, line);
}
async function shop(id) {
  const who = (KEEPERS.find(k => k.id === id) || { n: "Tailor's Barber" }).n;
  if (id === 'barber') return npcTalk(G.npcs[5]);
  if (id === 'system') {
    if (!G.flags.idCheck) { G.flags.idCheck = 1; await say2(who, 'ID, please.'); await say2(who, '…You look 47. Go ahead.'); }
    for (;;) {
      const a = await ask('Systembolaget · you have ' + G.kr + ' kr. Drink = buff, throw = lure.', Object.keys(DRINKS).map(k => ({ label: DRINKS[k].em + ' ' + DRINKS[k].n + ' · ' + DRINKS[k].kr + ' kr', sub: DRINKS[k].txt + (G.drinks[k] ? ' · have ' + G.drinks[k] : ''), value: k, dis: G.kr < DRINKS[k].kr })).concat([{ label: '‹ Leave', value: null, cls: 'back' }]), { who });
      if (!a) return; G.kr -= DRINKS[a].kr; G.drinks[a]++; SFX.buy();
    }
  }
  if (id === 'apotek') {
    for (;;) {
      const a = await ask('Apotek Hjärtat · ' + G.kr + ' kr', [{ label: '❤️ Heal the party', sub: 'Free', value: 'heal', cls: 'hot' }, { label: '💊 Fizz tablet · ' + CFG.TAB_COST + ' kr', sub: 'Heals 50 % in battle · have ' + G.tabs, value: 'tab', dis: G.kr < CFG.TAB_COST }, { label: '‹ Leave', value: null, cls: 'back' }], { who });
      if (a === 'heal') { for (const c of G.party.concat(G.box)) c.hp = maxHp(c); [659, 784, 988, 1318].forEach((f, i) => LOD.tone(f, .12, 'triangle', .05, 0, i * .12)); await say2(who, 'Everyone is fully healed. Take care out there.'); }
      else if (a === 'tab') { G.kr -= CFG.TAB_COST; G.tabs++; SFX.buy(); }
      else return;
    }
  }
  const f = FOODS[id];
  const a = await ask(f.n + ' · ' + G.kr + ' kr', [{ label: f.em + ' Buy · ' + f.kr + ' kr', sub: f.txt, value: 1, dis: G.kr < f.kr, cls: 'hot' }, { label: '‹ Leave', value: null, cls: 'back' }], { who });
  if (!a) return;
  G.kr -= f.kr; SFX.buy(); G.food = { k: f.k, t: CFG.BUFF_TIME, em: f.em };
  if (f.k === 'hp') for (const c of G.party) if (c.hp > 0) c.hp = Math.min(maxHp(c), c.hp + Math.round(maxHp(c) * .3));
  await say2(who, f.em + ' Om nom. ' + f.txt + '.');
}
async function bossTalk(id) {
  const h = HERO[id];
  if (G.beat.includes(id)) return say2(h.n, h.after);
  await say2(h.n, BOSS_LINES[id][heroId()] || '…');
  const lv = CFG.BOSS_LV + CFG.BOSS_LV_STEP * Math.min(3, G.beat.length);
  const a = await ask('Fight ' + h.n + '? Three creatures, around Lv ' + lv + '.', [{ label: '⚔️ Fight!', value: 1, cls: 'hot' }, { label: 'Not yet', value: 0, cls: 'back' }]);
  if (a) { hideBox(); startBoss(id); }
}
async function bossWon(id) {
  const h = HERO[id]; G.beat.push(id); G.kr += CFG.BOSS_KR;
  LOD.callout(h.n.toUpperCase() + ' BEATEN!', '+' + fmt(CFG.PTS.hero) + ' · ' + G.beat.length + '/4 heroes', 'good');
  await say('You beat ' + h.n + '! +' + CFG.BOSS_KR + ' kr.'); await say(h.n + ': "' + h.after + '"');
  if (G.beat.length >= 4) { await say('Somewhere in ICA, a door unlocks with a click…'); await say('The stock room is open.'); }
}
async function partnerTalk(id) {
  const P = PARTNERS[id], guy = P.guy === heroId();
  if (G.solved.includes(id)) return say2(P.n, guy ? 'We are good. For now.' : 'Thanks. Tell him to text me back.');
  await say2(P.n, guy ? 'THERE you are.' : 'Where is ' + HERO[P.guy].n + '? Don\'t you dare cover for him.');
  await say2(P.n, '(' + P.kind + ' encounter: survive ' + (CFG.PARTNER_TURNS + (guy ? 1 : 0)) + ' turns, or say the right thing.)');
  hideBox(); startPartner(id);
}
async function partnerSolved(id) {
  if (!G.solved.includes(id)) G.solved.push(id);
  LOD.callout(PARTNERS[id].n.toUpperCase() + ': SOLVED', '+' + fmt(CFG.PTS.partner), 'good');
}
async function devTalk() {
  const me = heroId() === 'ljunky';
  await say2('Dev Ljunky', me ? 'Hello, me. You never had a nemesis. So I compiled one.' : 'Surprise. I spiked the drink. I also wrote the game.');
  await say2('Dev Ljunky', 'And I just patched your stats.');
  const a = await ask('Final boss. Fight Dev Ljunky?', [{ label: '⚔️ Fight!', value: 1, cls: 'hot' }, { label: 'Heal first', value: 0, cls: 'back' }]);
  if (a) { hideBox(); startDev(); }
}
async function devWon() {
  G.dev = 1; G.scene = 'talk';
  await say2('Dev Ljunky', 'Okay. Fine. You win. The drink was folköl with a splash of game engine.');
  await say2('Dev Ljunky', 'See you at the LAN. Bring snacks. You have the list.');
  hideBox(); G.scene = 'map';
  LOD.finish(true, 'done');
}
async function vanMenu() {
  const a = await ask('The LAN van. ' + G.box.length + ' creature(s) in the back.', [{ label: '🔄 Swap with the van', value: 'swap', dis: !G.box.length }, { label: '😴 Sleep', value: 'sleep' }, { label: '‹ Leave', value: null, cls: 'back' }], { who: 'LAN VAN' });
  if (a === 'sleep') return say('It smells like Löken\'s gym bag. You decide not to.', { auto: false });
  if (a !== 'swap') return;
  const bi = await ask('Take who from the van?', G.box.map((c, i) => ({ label: cname(c) + ' Lv ' + c.lv, img: creatureIcon(c.sp), ty: typeOf(c), value: i })).concat([{ label: '‹ Back', value: null, cls: 'back' }]), { one: true });
  if (bi == null) return;
  if (G.party.length < 4) { G.party.push(G.box.splice(bi, 1)[0]); return say('Added to the party.', { auto: false }); }
  const pi = await ask('Put who in the van?', G.party.map((c, i) => ({ label: cname(c) + ' Lv ' + c.lv, img: creatureIcon(c.sp), ty: typeOf(c), value: i })).concat([{ label: '‹ Back', value: null, cls: 'back' }]), { one: true });
  if (pi == null) return;
  const out = G.party[pi]; G.party[pi] = G.box[bi]; G.box[bi] = out;
  if (!G.party.some(c => c.hp > 0)) { G.box[bi] = G.party[pi]; G.party[pi] = out; return say('Someone in the party has to be awake.', { auto: false }); }
  await say('Swapped.', { auto: false });
}
async function fish() {
  if (G.fishT > 0) return say('Nothing bites. Give it a minute.', { auto: false });
  G.fishT = 30; await say('You cast a shopping bag on a string…', { auto: false });
  const r = Math.random();
  if (r < .45) { await say('You fished up a shopping trolley. It\'s ALIVE!', { auto: false }); hideBox(); startBattle({ kind: 'wild', foes: [mk('golem', 7 + Math.min(5, G.beat.length))] }); }
  else if (r < .75) await say('Something HUGE with a crown of reeds swims past. It ignores you. (Pikezilla: coming in the patch.)', { auto: false });
  else await say('A boot. Size 46. Smells like Löken.', { auto: false });
}

/* ---------- bag menu on the map ---------- */
async function bagMenu() {
  G.scene = 'talk'; LOD.input.clear(); G.v.x = G.v.y = 0;
  try {
    for (;;) {
      const nItems = G.list.filter(q => q.got).length;
      const a = await ask('🎒 ' + G.kr + ' kr · ' + nItems + '/8 items · ' + Object.keys(G.caught).length + ' species · ' + G.beat.length + '/4 heroes', [
        { label: '🐸 Party', value: 'party', sub: G.party.length + '/4' }, { label: '🍺 Drinks', value: 'drinks', sub: 'Drink one: 60 s buff' },
        { label: '🛒 Shopping list', value: 'list', sub: nItems + '/8' }, { label: '📕 Dex', value: 'dex', sub: Object.keys(G.caught).length + '/20' },
        { label: '🏆 Goals', value: 'goals', sub: fmt(goals().total) + ' pts' }, { label: '‹ Close', value: null, cls: 'back' }]);
      if (!a) break;
      if (a === 'party') {
        const i = await ask('Tap a creature to make it lead.', G.party.map((c, i) => ({ label: (i === 0 ? '★ ' : '') + cname(c) + ' Lv ' + c.lv, img: creatureIcon(c.sp), ty: typeOf(c), sub: c.hp + '/' + maxHp(c) + ' HP · ATK ' + baseStat(c, 1) + ' DEF ' + baseStat(c, 2) + ' SPD ' + baseStat(c, 3) + ' · XP ' + c.xp + '/' + xpNeed(c.lv), hp: c.hp / maxHp(c), value: i })).concat([{ label: '‹ Back', value: null, cls: 'back' }]), { one: true });
        if (i) { const c = G.party.splice(i, 1)[0]; G.party.unshift(c); }
      } else if (a === 'drinks') {
        const opts = Object.keys(DRINKS).filter(k => G.drinks[k] > 0).map(k => ({ label: DRINKS[k].em + ' ' + DRINKS[k].n + ' ×' + G.drinks[k], sub: DRINKS[k].txt, value: k }));
        if (G.tabs) opts.unshift({ label: '💊 Fizz tablet ×' + G.tabs, sub: 'Heal the lead creature 50 %', value: 'tab' });
        const d = await ask(opts.length ? 'Drink one now? The buff lasts 60 s and starts in your next battles.' : 'No drinks. Systembolaget is next to ICA.', opts.concat([{ label: '‹ Back', value: null, cls: 'back' }]));
        if (d === 'tab') { const c = G.party.find(q => q.hp > 0 && q.hp < maxHp(q)) || G.party[0]; G.tabs--; c.hp = Math.min(maxHp(c), c.hp + Math.round(maxHp(c) * CFG.TAB_HEAL)); await say('💊 ' + cname(c) + ' feels better.'); }
        else if (d) {
          G.drinks[d]--; logDrink(); G.drinkBuff = { id: d, t: CFG.BUFF_TIME };
          if (DRINKS[d].fx.heal) for (const c of G.party) if (c.hp > 0) c.hp = Math.min(maxHp(c), c.hp + Math.round(maxHp(c) * .3));
          await say('Glug glug. ' + DRINKS[d].em + ' ' + DRINKS[d].txt + ' for 60 s.' + (d === 'snaps' ? ' 🎶 Helan går!' : ''));
        }
      } else if (a === 'list') {
        await say(G.list.map(q => (q.got ? '✅ ' : '⬜ ') + ITEMS[q.id].em + ' ' + ITEMS[q.id].n + (q.got ? '' : ' · ' + ZONES.find(z => z.id === ITEMS[q.id].z).n)).join('\n'), { auto: false });
      } else if (a === 'dex') {
        await say(SPECIES.map(k => (G.caught[k] ? '● ' : G.seen[k] ? '○ ' : '· ') + '#' + String(SP[k].no).padStart(2, '0') + ' ' + (G.seen[k] || G.caught[k] ? SP[k].n : '???')).join('\n') + '\n' + Object.keys(G.caught).length + '/20 caught. More species arrive in the patch.', { auto: false });
      } else if (a === 'goals') {
        const g = goals();
        await say(g.rows.map(r => r[0] + ': ' + fmt(r[1])).join('\n') + '\nTotal: ' + fmt(g.total) + (G.debt ? '\nPromise debt: ' + G.debt : ''), { auto: false });
      }
    }
  } finally { if (G && G.scene === 'talk') { hideBox(); G.scene = 'map'; } }
}

/* ===================== DRAWING ===================== */
function drawWorld(ctx, G, t) {
  if (G.scene === 'battle' || !mapCv) return;
  ctx.save();
  if (G.blurT > 0) ctx.translate(Math.sin(t * 1.7) * 5 * Math.min(1, G.blurT / 3), Math.cos(t * 1.3) * 3 * Math.min(1, G.blurT / 3));
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(mapCv, 0, 0);
  const cam = LOD.cam, vw = LOD.view.W / LOD.view.scale, vh = LOD.view.H / LOD.view.scale;
  const x0 = Math.max(0, Math.floor((cam.x - vw / 2) / T) - 1), x1 = Math.min(MW, Math.ceil((cam.x + vw / 2) / T) + 1);
  const y0 = Math.max(0, Math.floor((cam.y - vh / 2) / T) - 1), y1 = Math.min(MH, Math.ceil((cam.y + vh / 2) / T) + 1);
  // water shimmer
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  for (let y = y0; y < Math.min(y1, 8); y++) for (let x = x0; x < x1; x++) if (MAP[y][x] === '~' && hash(x, y + ((t * 2) | 0)) > .8) ctx.fillRect(x * T + 4 + ((t * 6 + x) % 8), y * T + 9, 3, 1);
  // stock room door open
  if (G.beat.length >= 4) { ctx.fillStyle = '#1a1210'; ctx.fillRect(DOOR_AT[0] * T + 2, DOOR_AT[1] * T + 1, T - 4, T - 1); }
  // signs
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '400 7px Bungee, Impact, sans-serif';
  for (const [sx, sy, txt, bg, fg] of SIGNS) {
    const w = ctx.measureText(txt).width + 6, x = sx * T, y = sy * T - 3;
    if (y < y0 * T - 20 || y > y1 * T + 20) continue;
    ctx.fillStyle = bg; ctx.fillRect(Math.round(x - w / 2), y - 5, Math.round(w), 10); ctx.fillStyle = fg; ctx.fillText(txt, x, y + .5);
  }
  // coins, items, eggs, shimmer
  for (const c of G.coins) LOD.em('🪙', c.x, c.y - 4, 8, Math.min(1, c.t));
  for (const it of G.list) if (!it.got && it.y > y0 * T - 20 && it.y < y1 * T + 20) {
    const b = Math.sin(t * 4 + it.x) * 1.5; ctx.fillStyle = 'rgba(255,230,120,.35)'; ctx.beginPath(); ctx.arc(it.x, it.y - 6, 7 + Math.sin(t * 5) * 1.5, 0, 7); ctx.fill();
    LOD.em(ITEMS[it.id].em, it.x, it.y - 7 + b, 10);
  }
  if (!G.egg) { const e = LOD.egg(); EGG_AT.forEach((s, i) => { if (G.eggs[i]) return; const [x, y] = tc(s[0], s[1]); LOD.em(e ? e.em : '🥚', x, y - 4, 7, .5 + Math.sin(t * 3 + i) * .15); }); }
  if (G.shim) { for (let i = 0; i < 4; i++) { const a = t * 3 + i * 1.57; ctx.fillStyle = i % 2 ? '#fff' : '#ffd23a'; ctx.fillRect(G.shim.x + Math.cos(a) * 6 - 1, G.shim.y - 6 + Math.sin(a) * 4 - 1, 2, 2); } }
  // people, sorted by y
  const me = heroId(), list = [];
  list.push({ y: G.p.y, f: () => drawPerson(ctx, G.p.x, G.p.y, Object.assign({}, HERO[me].look, G.stache ? { stache: 1 } : null), G.dir, G.walk ? (Math.floor(G.walk / 6) % 4 === 1 ? 1 : Math.floor(G.walk / 6) % 4 === 3 ? 2 : 0) : 0) });
  for (const n of G.npcs) list.push({ y: n.y, f: () => drawPerson(ctx, n.x, n.y, n.d.look, n.dir, n.step ? (Math.floor(n.step * 5) % 2 ? 1 : 2) : 0) });
  for (const k of KEEPERS) { const [x, y] = tc(...k.at); list.push({ y: y + 6, f: () => drawPerson(ctx, x, y + 6, k.look, 0, 0) }); }
  for (const id of HERO_IDS) if (id !== me) { const [x, y] = tc(...BOSS_AT[id]); list.push({ y: y + 6, f: () => { drawPerson(ctx, x, y + 6, HERO[id].look, 0, 0); if (!G.beat.includes(id)) bubble(ctx, x, y - 18, '!', '#e3000f', t); else LOD.em('✅', x + 7, y - 14, 7); } }); }
  for (const id in PARTNERS) { const [x, y] = tc(...PARTNER_AT[id]); list.push({ y: y + 6, f: () => { drawPerson(ctx, x, y + 6, PARTNERS[id].look, 0, 0); if (!G.solved.includes(id)) bubble(ctx, x, y - 18, '?', '#e05cc4', t); } }); }
  if (G.beat.length >= 4 && !G.dev) { const [x, y] = tc(...DEV_AT); list.push({ y: y + 6, f: () => drawPerson(ctx, x, y + 6, DEV_LOOK, 0, 0, 1) }); }
  list.sort((a, b) => a.y - b.y).forEach(o => o.f());
  // what you can tap
  if (G.near && G.scene === 'map') { const n = G.near; ctx.fillStyle = '#fff'; ctx.strokeStyle = '#33456b'; ctx.lineWidth = 1; LOD.rrect(n.x - 6, n.y - 38 + Math.sin(t * 6) * 1.5, 12, 9, 3); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#33456b'; ctx.font = '700 7px Barlow, sans-serif'; ctx.fillText('TAP', n.x, n.y - 33.5 + Math.sin(t * 6) * 1.5); }
  ctx.restore();
}
function bubble(ctx, x, y, s, col, t) { const b = Math.sin(t * 4) * 1; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y + b, 4.5, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = '700 7px Barlow, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, x, y + b + .5); }

/* battle screen (screen coords) */
const BG = {
  out: ['#9fd3ea', '#cfeaf5', '#6cbf4a', '#4f9a34'], lawn: ['#9fd3ea', '#cfeaf5', '#6cbf4a', '#4f9a34'], parking: ['#9fb8c8', '#d0dde5', '#6b7079', '#555a63'],
  charger: ['#8fb0c8', '#d0dde5', '#6b7079', '#555a63'], system: ['#0a5e32', '#1a7e48', '#e6e0d2', '#c9c2b0'], in: ['#e3000f', '#ff6a6a', '#e6e0d2', '#c9c2b0'],
  burger: ['#2a2a2a', '#4a3a2a', '#e6e0d2', '#c9c2b0'], stock: ['#1a1210', '#3a2a20', '#4a3a30', '#2a1a10']
};
function drawBattle(ctx, t) {
  const { W, H } = LOD.view, top = LOD.view.safeTop + 50;
  const boxH = ui.box && !ui.box.hidden ? ui.box.offsetHeight + 18 : 180;
  const bot = Math.max(top + 160, H - boxH), ah = bot - top;
  const pal = BG[B.kind === 'dev' ? 'stock' : B.zone] || (['fruit', 'pickmix', 'freezer', 'bakery', 'flowers', 'selfcheck', 'checkout', 'apotek', 'pizza', 'sushi', 'barber'].includes(B.zone) ? BG.in : BG.out);
  let g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, pal[0]); g.addColorStop(.45, pal[1]); g.addColorStop(.46, pal[2]); g.addColorStop(1, pal[3]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const fx = W * .7, fy = top + ah * .36, mx = W * .3, my = top + ah * .8, fs = Math.min(W * .38, ah * .42, 190), ms = Math.min(W * .46, ah * .5, 230);
  ctx.fillStyle = 'rgba(0,0,0,.16)'; ctx.beginPath(); ctx.ellipse(fx, fy + fs * .42, fs * .62, fs * .14, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(mx, my + ms * .42, ms * .62, ms * .14, 0, 0, 7); ctx.fill();
  const foe = curFoe(), me = active();
  const shake = s => B.hitT > 0 && B.hitSide === s ? Math.sin(t * 80) * 5 : 0, blink = s => B.hitT > 0 && B.hitSide === s && Math.floor(t * 20) % 2 ? .3 : 1;
  const lunge = s => B.lunge === s && B.lungeT > 0 ? Math.sin((1 - B.lungeT / .3) * Math.PI) * 18 : 0;
  // foe
  if (foe && !(foe.down && foe.downT <= 0) && !(B.bagT > 0)) {
    const a = foe.down ? Math.max(0, foe.downT * 2) : 1;
    if (foe.partner) { const pc = portrait('p_' + foe.partner, PARTNERS[foe.partner].look); ctx.imageSmoothingEnabled = false; const h = fs * 1.1, w = h * pc.width / pc.height; ctx.drawImage(pc, fx - w / 2 + shake('foe') - lunge('foe'), fy - h / 2 + fs * .05, w, h); }
    else drawCreature(ctx, foe.sp, fx + shake('foe') - lunge('foe'), fy + (1 - a) * 20, fs, false, a * blink('foe'));
    if (foe.sp === 'dev' && !foe.partner && (B.glitchT > 0 || Math.random() < .05)) glitch(ctx, fx - fs / 2, fy - fs / 2, fs, fs);
  }
  if (B.bagT > 0) { const w = B.bagShake ? Math.sin(t * 30) * .25 : 0; B.bagShake = Math.max(0, B.bagShake - .05); ctx.save(); ctx.translate(fx, fy + fs * .25); ctx.rotate(w); LOD.em('🛍️', 0, 0, fs * .4); ctx.restore(); }
  if (B.bug && B.bug.t > 0) drawCreature(ctx, B.bug.sp, fx - fs * .55, fy + fs * .2, fs * .6, false, Math.min(1, B.bug.t));
  // me
  if (me) drawCreature(ctx, me.sp, mx + shake('me') + lunge('me'), my, ms, false, me.hp > 0 ? blink('me') : .25);
  // boss trainer peeks in
  if (B.kind === 'boss') { const pc = portrait('h_' + B.boss, HERO[B.boss].look); ctx.imageSmoothingEnabled = false; ctx.drawImage(pc, W - 46, top + 2, 32, 48); }
  // info boxes
  if (foe && !foe.partner) infoBox(ctx, 10, top + 4, Math.min(W * .56, 240), foe, false);
  if (foe && foe.partner) partnerBox(ctx, 10, top + 4, Math.min(W * .6, 250));
  if (me) infoBox(ctx, W - Math.min(W * .56, 240) - 10, top + ah * .52, Math.min(W * .56, 240), me, true);
  // effects
  if (B.flashT > 0) { ctx.fillStyle = 'rgba(255,255,255,' + Math.min(1, B.flashT * 1.6) + ')'; ctx.fillRect(0, 0, W, H); }
  if (B.glitchT > 0) glitch(ctx, 0, 0, W, H * .7);
  const tags = [];
  if (B.drink) tags.push('🍺 ' + B.drink.turns); if (B.yes) tags.push('YES! ' + B.yes); if (B.pants) tags.push('👖 DEF−2'); if (B.conf) tags.push('🌀 ' + B.conf);
  if (B.swap) tags.push('🔁 ATK/DEF'); if (B.reversed) tags.push('⚠️ CHART REVERSED'); if (B.lure > 1) tags.push('🧲 ×' + B.lure.toFixed(1)); if (G.food && G.food.t > 0) tags.push(G.food.em);
  if (tags.length) { ctx.font = '700 12px Barlow, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; let x = 12; const y = top + ah * .52 + 64; for (const s of tags) { const w = ctx.measureText(s).width + 10; if (x + w > W * .5) break; ctx.fillStyle = 'rgba(10,16,22,.7)'; LOD.rrect(x, y - 9, w, 18, 6); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(s, x + 5, y); x += w + 4; } }
}
function glitch(ctx, x, y, w, h) { for (let i = 0; i < 6; i++) { ctx.fillStyle = pick(['rgba(61,255,138,.5)', 'rgba(255,61,240,.5)', 'rgba(61,214,255,.5)']); ctx.fillRect(x + rand(-10, w * .3), y + rand(0, h), rand(w * .3, w), rand(2, 7)); } }
function infoBox(ctx, x, y, w, c, mine) {
  const h = 58;
  ctx.fillStyle = 'rgba(0,0,0,.25)'; LOD.rrect(x + 3, y + 3, w, h, 8); ctx.fill();
  ctx.fillStyle = '#fbfbf4'; LOD.rrect(x, y, w, h, 8); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#33456b'; ctx.stroke();
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillStyle = '#1c1c2a'; ctx.font = '700 15px Barlow, sans-serif';
  ctx.fillText(cname(c), x + 9, y + 13, w - 52);
  ctx.textAlign = 'right'; ctx.font = '400 11px Bungee, Impact, sans-serif'; ctx.fillText('Lv' + c.lv, x + w - 9, y + 13);
  const ty = typeOf(c); ctx.font = '400 9px Bungee, Impact, sans-serif'; const tw = ctx.measureText(ty).width + 8; ctx.fillStyle = TCOL[ty] || '#888'; LOD.rrect(x + 9, y + 36, tw, 13, 4); ctx.fill(); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(ty, x + 9 + tw / 2, y + 43);
  const mh = maxHp(c); c.disp = c.disp == null ? c.hp : c.disp + (c.hp - c.disp) * .12; if (Math.abs(c.disp - c.hp) < .5) c.disp = c.hp;
  const f = clamp(c.disp / mh, 0, 1), bx = x + 30, bw = w - 40;
  ctx.fillStyle = '#33456b'; ctx.font = '400 9px Bungee, Impact, sans-serif'; ctx.textAlign = 'left'; ctx.fillText('HP', x + 9, y + 30);
  ctx.fillStyle = '#3a3a44'; LOD.rrect(bx, y + 26, bw, 8, 4); ctx.fill(); ctx.fillStyle = hpCol(f); LOD.rrect(bx + 1, y + 27, Math.max(0, (bw - 2) * f), 6, 3); ctx.fill();
  if (mine || heroId() === 'bigwman') { ctx.fillStyle = '#1c1c2a'; ctx.font = '700 11px Barlow, sans-serif'; ctx.textAlign = 'right'; ctx.fillText(Math.round(c.disp) + '/' + mh, x + w - 9, y + 41); }
  if (mine) { const xf = c.lv >= CFG.LV_MAX ? 1 : c.xp / xpNeed(c.lv); ctx.fillStyle = "#d8dce6"; ctx.fillRect(bx + 26, y + 49, bw - 26, 3); ctx.fillStyle = "#2fa3d8"; ctx.fillRect(bx + 26, y + 49, (bw - 26) * xf, 3); }
}
function partnerBox(ctx, x, y, w) {
  const P = PARTNERS[B.partner], need = partnerNeed();
  ctx.fillStyle = '#fbfbf4'; LOD.rrect(x, y, w, 46, 8); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#33456b'; ctx.stroke();
  ctx.fillStyle = '#1c1c2a'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = '700 15px Barlow, sans-serif'; ctx.fillText(P.n + ' · ' + P.kind, x + 9, y + 13);
  ctx.font = '700 11px Barlow, sans-serif'; ctx.fillText('Survive', x + 9, y + 32);
  for (let i = 0; i < need; i++) { ctx.fillStyle = i < B.survive ? '#3ddc84' : '#d8dce6'; LOD.rrect(x + 58 + i * 18, y + 26, 14, 12, 3); ctx.fill(); }
}

/* HUD on the map (screen coords; the engine draws clock + score) */
function hud(ctx, G) {
  if (!G.started) return;
  const { W } = LOD.view, y0 = 22 + LOD.view.hudLeftY;
  if (G.scene !== 'battle') {
    ctx.font = '700 13px Barlow, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const rows = ['💰 ' + G.kr + ' kr', '🛒 ' + G.list.filter(q => q.got).length + '/8', '📕 ' + Object.keys(G.caught).length + '/20', '🏆 ' + G.beat.length + '/4'];
    if (G.food && G.food.t > 0) rows.push(G.food.em + ' ' + Math.ceil(G.food.t) + 's');
    if (G.drinkBuff && G.drinkBuff.t > 0) rows.push(DRINKS[G.drinkBuff.id].em + ' ' + Math.ceil(G.drinkBuff.t) + 's');
    if (G.blurT > 0) rows.push('🥴 ' + Math.ceil(G.blurT) + 's'); if (G.mirrorT > 0) rows.push('🌀 ' + Math.ceil(G.mirrorT) + 's');
    rows.forEach((s, i) => { const w = ctx.measureText(s).width + 12; ctx.fillStyle = 'rgba(10,16,22,.62)'; LOD.rrect(8, y0 - 10 + i * 23, w, 20, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(s, 14, y0 + i * 23); });
    if (G.zoneT > 0) {
      const z = ZONES.find(q => q.id === G.zoneId); ctx.globalAlpha = Math.min(1, G.zoneT * 2);
      ctx.font = '400 13px Bungee, Impact, sans-serif'; ctx.textAlign = 'center'; const w = ctx.measureText(z.n).width + 22;
      ctx.fillStyle = '#fbfbf4'; LOD.rrect(W / 2 - w / 2, 40, w, 24, 6); ctx.fill(); ctx.strokeStyle = '#33456b'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#33456b'; ctx.fillText(z.n, W / 2, 52.5); ctx.globalAlpha = 1;
    }
  }
}
function drawScreen(ctx, G, t) {
  if (G.scene === 'battle' && B) drawBattle(ctx, t);
  else if (G.blurT > 0) { ctx.fillStyle = 'rgba(200,120,255,' + (.08 + Math.sin(t * 2) * .04) + ')'; ctx.fillRect(0, 0, LOD.view.W, LOD.view.H); }
  if (G.mirrorT > 0 && G.scene !== 'battle') { ctx.fillStyle = 'rgba(224,92,196,.1)'; ctx.fillRect(0, 0, LOD.view.W, LOD.view.H); }
}

/* ===================== SCORE: goals, each counted once ===================== */
function goals() {
  const P = CFG.PTS;
  const items = G.list.filter(q => q.got).length, species = Math.min(P.speciesMax, Object.keys(G.caught).length);
  const heroes = Math.min(4, G.beat.length), partners = G.solved.length, dev = G.dev ? 1 : 0, lv = Math.min(P.lvlMax, G.lvlPts || 0), egg = G.egg ? 1 : 0;
  const rows = [['Shopping list ' + items + '/8', items * P.item], ['New species ' + species + '/20', species * P.species], ['Heroes beaten ' + heroes + '/4', heroes * P.hero],
    ['Partners solved ' + partners + '/5', partners * P.partner], ['Dev Ljunky', dev * P.dev], ['Party levels', lv], ['Easter egg', egg * P.egg]];
  return { rows, items, species, heroes, partners, dev, egg, total: Math.min(DEF.cap, rows.reduce((a, r) => a + r[1], 0)) };
}

/* ===================== NEW GAME / SAVE ===================== */
function newList() {
  const ids = Object.keys(ITEMS).sort(() => Math.random() - .5).slice(0, 8), used = new Set();
  return ids.map(id => {
    const tiles = zoneTiles(ITEMS[id].z).filter(([x, y]) => !used.has(x + ',' + y));
    const [x, y] = pick(tiles); used.add(x + ',' + y); const [px, py] = tc(x, y);
    return { id, x: px, y: py + 4, got: 0 };
  });
}
const strip = c => ({ sp: c.sp, lv: c.lv, xp: c.xp, hp: c.hp });
const SAVE_KEYS = ['dir', 'seen', 'caught', 'list', 'kr', 'drinks', 'tabs', 'beat', 'solved', 'dev', 'eggs', 'egg', 'debt', 'lvlPts', 'flags', 'stache', 'blurred', 'starter'];
function saveState(G) {
  const o = { v: 1, p: [Math.round(G.p.x), Math.round(G.p.y)], party: G.party.map(strip), box: G.box.map(strip) };
  for (const k of SAVE_KEYS) o[k] = G[k];
  return JSON.parse(JSON.stringify(o));
}
function loadState(G, d) {
  if (!d || d.v !== 1) return;
  for (const k of SAVE_KEYS) if (d[k] !== undefined) G[k] = d[k];
  const ok = c => c && SP[c.sp] && !SP[c.sp].hidden;
  const fix = c => { const n = mk(c.sp, c.lv); n.xp = c.xp || 0; n.hp = clamp(Math.round(c.hp), 0, maxHp(n)); return n; };
  G.party = (d.party || []).filter(ok).map(fix).slice(0, 4); G.box = (d.box || []).filter(ok).map(fix);
  if (d.p && walkable(d.p[0], d.p[1])) { G.p.x = d.p[0]; G.p.y = d.p[1]; }
  if (G.party.length && !G.party.some(c => c.hp > 0)) for (const c of G.party) c.hp = maxHp(c);
  for (const k of Object.keys(DRINKS)) G.drinks[k] = G.drinks[k] || 0;
}
async function tutorial() {
  G.scene = 'talk';
  const pir = 'Parking-lot Pirate';
  await say('You wake up in the van. Your head is pounding.', { auto: false });
  await say('Everything looks… pixelated. Something rustles between the cars.', { auto: false });
  await say2(pir, "Arr! Ye've been spiked, matey. ICA Maxi be a creature world now.");
  await say2(pir, "It's dangerous to shop alone. Take one o' these.");
  const s = await ask('Choose your first creature.', STARTERS.map(sp => ({ label: SP[sp].n, img: creatureIcon(sp), ty: SP[sp].t, sub: SP[sp].d, value: sp })), { one: true, who: pir });
  G.party = [mk(s, CFG.START_LV)]; G.caught[s] = 1; G.seen[s] = 1; G.starter = s; SFX.catch(); LOD.haptic('success');
  await say(SP[s].n + ' joined your party! (+' + fmt(CFG.PTS.species) + ' new species)', { auto: false });
  await say2(pir, 'Yer goals: the shopping list 🛒, catch creatures, beat the other four heroes, and find out who spiked ye.');
  await say2(pir, 'Here: two folköl and a Fizz tablet. Drink for a buff, or throw a drink as a lure. No time limit. The game saves itself.');
  G.lvlPts = partyLevelPts();
  hideBox(); G.scene = 'map'; LOD.toast('🎒 Your shopping list is in the bag', 3);
}

/* ===================== INPUT: tap = talk / next ===================== */
let tap = null;
LOD.cv.addEventListener('pointerdown', e => { tap = { x: e.clientX, y: e.clientY, t: performance.now() }; });
LOD.cv.addEventListener('pointerup', e => {
  if (!tap || LOD.M !== DEF || !G || G.mode !== 'play') return;
  const far = Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > 12 || performance.now() - tap.t > 380; tap = null;
  if (far) return;
  if (pending && pending.say) { pending.res(); return; }
  if (G.scene === 'map' && G.started) interact();
});
window.addEventListener('keydown', e => {
  if (LOD.M !== DEF || !G || G.mode !== 'play' || e.repeat) return;
  const k = e.key.toLowerCase();
  if (k === 'enter' || k === 'e' || k === ' ') { if (pending && pending.say) pending.res(); else if (G.scene === 'map' && G.started) interact(); }
  if (k === 'b' && G.scene === 'map') bagMenu();
});

/* ===================== THE MISSION ===================== */
const DEF = {
  id: 3, title: 'Bad Trip at Maxi', unlock: '2026-11-23', until: '2026-11-25', cap: 300000,
  world: { w: MW * T, h: MH * T }, eggs: true, noFire: true, noTimer: true, save: true, submitOnSave: true,
  viewScale: (W, H) => Math.min(W / (CFG.VIEW_TILES * T), H / (16 * T)),
  perkText: {
    bigwman: { intro: 'You see exact enemy HP and your catch %.', weakText: 'Sometimes a package arrives mid-battle. You lose the turn signing for it.' },
    wizcudi: { intro: 'You always go first on turn 1, and you see rare creatures ✨ on the map.', weakText: 'Outside (lawn, lake, parking) you are slower and meet more creatures.' },
    jrohn: { intro: 'You walk faster, and Run always works.', weakText: 'Sometimes your pants drop: DEF −2 until you spend a turn pulling them up.' },
    loken: { intro: 'ATM Security blocks the first hit in every battle. Loyalty heals the party 10 % after a win.', weakText: 'You drop coins while walking. Coins lure creatures.' },
    ljunky: { intro: '+crit chance and +25 % catch chance.', weakText: 'After a battle the cats sometimes knock a drink out of your bag.' }
  },
  intro: ({ player }) => ({
    kind: 'chat', title: 'LAN SQUAD 🎮', sub: 'Löken, Wizcudi, Jrohn, BigWman, Ljunky', button: 'Wake up 🥴',
    lines: [
      { at: 'Fri 21:47 · pre-LAN beer' },
      { from: 'Löken', text: 'Pre-LAN beer at mine! Stick together, boys!' },
      { from: 'BigWman', text: 'I made a spreadsheet of who owes for the beer. YES!' },
      { from: 'Jrohn', text: 'Has anyone seen my shirt?' },
      { from: 'Wizcudi', text: 'Who left the kitchen light on?!' },
      { from: 'Ljunky', text: 'I mixed the drinks tonight. Special recipe 😇' },
      { at: 'Sat 07:12' },
      { from: 'You', text: 'why am i in the van. why is the van at ICA Maxi' },
      { from: 'You', text: 'why is everything… pixels' },
      { sfx: 'zombie', text: '*something rustles in the parking lot*', shake: true }
    ]
  }),
  outro: (G) => G.why === 'done' ? {
    kind: 'chat', title: 'LAN SQUAD 🎮', sub: 'Löken, Wizcudi, Jrohn, BigWman, Ljunky', tbc: 'The LAN is on 28 Nov. Bring the shopping list.',
    lines: [
      { from: 'You', text: 'IT WAS LJUNKY. He spiked the drink AND built the game.' },
      { from: 'BigWman', text: 'I knew it. The budget never balanced. YES!' },
      { from: 'Löken', text: 'Group hug anyway. Stick together, boys.' },
      { from: 'Ljunky', text: 'Patch notes: you were never supposed to win. Well played.' },
      { from: 'Jrohn', text: 'Did anyone find my shirt in there?' }
    ]
  } : null,
  brief: {
    card: '<p>Someone spiked your drink. You wake up at <b>ICA Maxi Åkersberga</b> and it is a creature world. Collect the shopping list, catch creatures, beat the other four heroes and find out who did it.</p>' +
      '<p><b>No time limit.</b> The game saves itself: close it and continue later. Score = goals, each counted once (max 300 000). Tie at the cap: shortest playtime wins.</p>',
    tips: [['Move:', 'drag anywhere.'], ['Talk, shop, fight:', 'tap the screen when TAP shows over someone.'], ['Battle:', 'one tap per choice. Weaken a creature, then Throw a carrier bag.'], ['🎒 Bag:', 'party, drinks, shopping list, dex and goals.'], ['Types:', 'FIZZ › GRUB › WILD › TECH › FROST › RUSTLE › FIZZ.']]
  },
  badges: [
    { em: '🧪', name: 'Debugged the Dev', t: s => s.dev },
    { em: '🛒', name: 'Full Cart', t: s => s.items >= 8 },
    { em: '📕', name: 'Creature Collector', t: s => s.species >= 12 },
    { em: '🏆', name: 'Hero Slayer', t: s => s.heroes >= 4 },
    { em: '💍', name: 'Relationship Counselor', t: s => s.partners >= 5 },
    { em: '🤞', name: 'Promise Debt', t: s => s.debt >= 3 },
    { em: '🥴', name: 'Bad Trip', t: s => s.blurred }
  ],
  intensity: G => G.scene === 'battle' ? (B && B.kind !== 'wild' ? .9 : .5) : .12,

  init(G_) {
    G = G_; FLOW++; waits.length = 0; B = null; pending = null;
    buildUI(); hideBox();
    if (!mapCv) mapCv = renderMap();
    const [x, y] = tc(4, 62);
    Object.assign(G, {
      hp: 0, maxHp: 0, scene: 'map', started: false, p: { x, y }, v: { x: 0, y: 0 }, dir: 0, walk: 0,
      party: [], box: [], seen: {}, caught: {}, kr: CFG.START_KR, drinks: { folkol: 2, lager: 0, ipa: 0, gt: 0, whisky: 0, glogg: 0, snaps: 0 }, tabs: 1,
      beat: [], solved: [], dev: 0, eggs: [0, 0, 0], debt: 0, lvlPts: 0, list: newList(), flags: {}, coins: [], coinT: 6, shimT: 8,
      encCool: CFG.ENC_COOLDOWN, stepD: 0, fishT: 0, mirrorT: 0, blurT: 0, zoneId: 'parking', zoneT: 0, food: null, drinkBuff: null, drinkLog: [], near: null
    });
    initPeople();
  },
  saveState, loadState,
  start(G, cont) {
    G.started = true; G.zoneT = 2.5;
    if (cont && G.party.length) LOD.toast('Welcome back. Game loaded 💾', 2.5);
    else tutorial();
  },
  update(G, dt) {
    tickWaits(dt);
    if (!G.started) return;
    if (G.blurT > 0) G.blurT -= dt; if (G.mirrorT > 0) G.mirrorT -= dt; if (G.zoneT > 0) G.zoneT -= dt; if (G.fishT > 0) G.fishT -= dt;
    if (B) { B.hitT -= dt; B.lungeT -= dt; B.flashT -= dt; if (B.glitchT > 0) B.glitchT -= dt; if (B.bug) B.bug.t -= dt; for (const f of B.foes) if (f.downT > 0) f.downT -= dt; }
    else {
      if (G.food && (G.food.t -= dt) <= 0) G.food = null;
      if (G.drinkBuff && (G.drinkBuff.t -= dt) <= 0) G.drinkBuff = null;
    }
    if (G.scene === 'map') updMap(dt);
    G.score = goals().total;
  },
  camTarget: G => [G.p.x, G.p.y - 8],
  drawWorld, drawScreen, hud,
  result: G => {
    const g = goals();
    return {
      head: G.dev ? 'Dev Ljunky debugged!' : 'Progress saved', lead: G.dev ? 'It was Ljunky all along. Keep playing to fill the dex: your best score counts until 25 Nov 23:59.' : 'Keep going any time.',
      rows: g.rows, bonus: [],
      stats: { dev: !!G.dev, items: g.items, species: g.species, heroes: g.heroes, partners: g.partners, debt: G.debt || 0, blurred: !!G.blurred },
      line: g.heroes + '/4 heroes, ' + g.species + ' species, ' + g.items + '/8 items in ' + mmss(G.t) + '.'
    };
  }
};
LOD.mission(DEF);
window.__m3 = { set speed(v) { TEST_SPEED = v; }, get G() { return G; }, get B() { return B; }, get pending() { return pending; }, CFG, SP, MAP, ZONES, tile, zoneAt, tc, mk, goals, startWild, startBoss, startPartner, startDev, interact, bagMenu, walkable, BOSS_AT, PARTNER_AT, EGG_AT }; // test hooks
})();
