/* LAN OR DIE – Mission 2: The Pickup. Needs engine.js first.
   A pseudo-3D racer: drive the black EV, pick up your 4 friends at their houses, then cross the finish
   between the grocery store and Systembolaget. Only the game lives here; the engine does the loop,
   input, HUD base, result screen, scoreboard, Telegram and backend (see ENGINE.md).

   The road (segments, curves, hills, projection, fog, sprite scaling) is adapted from Jake Gordon's
   javascript-racer (v4.final). No images from the racer are used; everything is canvas shapes or emoji.

   javascript-racer: Copyright (c) 2012, 2013, 2014, 2015, 2016 Jake Gordon and contributors

   Permission is hereby granted, free of charge, to any person obtaining a copy
   of this software and associated documentation files (the "Software"), to deal
   in the Software without restriction, including without limitation the rights
   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   copies of the Software, and to permit persons to whom the Software is
   furnished to do so, subject to the following conditions:

   The above copyright notice and this permission notice shall be included in all
   copies or substantial portions of the Software.

   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
   SOFTWARE.
*/
(() => {
'use strict';

/* ===================== MISSION CONFIG (tuning numbers) ===================== */
const CFG = {
  LIVES: 10,                 // 10 pieces of LAN gear = 10 lives
  MAX_SPEED: 9000,           // world units / s at level 1 (≈ 45 segments / s)
  SPEED_STEP: .045, SPEED_MAX_MUL: 1.4, // +4.5 % top speed per level, at most +40 %
  LEVEL_EVERY: 20,           // seconds per difficulty level (OVERLOAD at 3:00 comes from the engine)
  STOP_SPEED: .3,            // under 30 % of top speed to open the door
  STOP_RANGE: [2, 16],       // the house must be 2–16 segments ahead of the car (so you can see your friend)
  FRIEND_PTS: 10000, VICTORY: 50000, TIME_BONUS_PER_S: 400, LIFE_BONUS: 2000, GEAR_BACK_PTS: 500,
  DRIVE_PTS: 15, DRIVE_PTS_STEP: 10, // points per second at full speed, + per level
  ZOMBIE_PTS: { n: 150, r: 250, g: 2000 }, ZOMBIE_LVL_STEP: .15,
  TRAFFIC: 4, TRAFFIC_STEP: 1.5, TRAFFIC_FINAL: 4,      // cars on the road, + per level, + final minute
  ZOMBIE_EVERY: 2.2, ZOMBIE_EVERY_STEP: .2, ZOMBIE_EVERY_MIN: .55,
  BLOCK_EVERY: 9, BLOCK_EVERY_STEP: .6, BLOCK_EVERY_MIN: 3.5,
  MOOSE_EVERY: 18, MOOSE_EVERY_STEP: 1.2, MOOSE_EVERY_MIN: 6,
  ITEM_EVERY: 9, ITEM_EVERY_FINAL: 4.5,
  INV: 1.4,                  // seconds of no damage after a crash
  DRAW: 130, DRAW_LOW: 90, DRAW_MIN: 60, // draw distance in segments (drops on slow phones)
  FOG: 4,
  // Swap the pixel-art friends for your own PNGs: put a path here, e.g. 'img/loken-wave.png'. Empty = pixel art.
  HERO_H: 1000,              // height of the heroes waiting at the roadside (world units; the car is 420)
  FRIEND_IMG: { 'Löken': '', 'Wizcudi': '', 'Jrohn': '', 'BigWman': '', 'Ljunky': '' }
};
/* =================== /MISSION CONFIG =================== */

const { clamp, rand, pick, fmt, mmss } = LOD;
let G = null;

/* ---------- road geometry (Jake Gordon) ---------- */
const SEG = 200, RUMBLE = 3, LANES = 3, RW = 2000, FOV = 100, CAM_H = 1000, CENTRIFUGAL = .3;
const CD = 1 / Math.tan(FOV / 2 * Math.PI / 180), PZ = CAM_H * CD;
const lerp = (a, b, p) => a + (b - a) * p;
const easeIn = (a, b, p) => a + (b - a) * p * p;
const easeInOut = (a, b, p) => a + (b - a) * ((-Math.cos(p * Math.PI) / 2) + .5);
const expFog = (d, den) => 1 / Math.pow(Math.E, d * d * den);
const overlap = (x1, w1, x2, w2, pc) => { const h = (pc || 1) / 2; return !((x1 + w1 * h) < (x2 - w2 * h) || (x1 - w1 * h) > (x2 + w2 * h)); };

const segs = [];
const lastY = () => segs.length ? segs[segs.length - 1].p2.world.y : 0;
function addSegment(curve, y) {
  const n = segs.length;
  segs.push({ index: n, p1: { world: { y: lastY(), z: n * SEG }, camera: {}, screen: {} }, p2: { world: { y, z: (n + 1) * SEG }, camera: {}, screen: {} },
    curve, sprites: [], dark: Math.floor(n / RUMBLE) % 2 === 1, clip: 0, fog: 1, forest: false, finish: false });
}
function addRoad(enter, hold, leave, curve, y) {
  const startY = lastY(), endY = startY + (y || 0) * SEG, total = enter + hold + leave;
  for (let n = 0; n < enter; n++) addSegment(easeIn(0, curve, n / enter), easeInOut(startY, endY, n / total));
  for (let n = 0; n < hold; n++) addSegment(curve, easeInOut(startY, endY, (enter + n) / total));
  for (let n = 0; n < leave; n++) addSegment(easeInOut(curve, 0, n / leave), easeInOut(startY, endY, (enter + hold + n) / total));
}
const ROAD = { LENGTH: { SHORT: 25, MEDIUM: 50, LONG: 100 }, HILL: { LOW: 20, MEDIUM: 40, HIGH: 60 }, CURVE: { EASY: 2, MEDIUM: 4, HARD: 6 } };
const addStraight = n => addRoad(n, n, n, 0, 0);
const addCurve = (n, c, h) => addRoad(n, n, n, c, h || 0);
function addLowRollingHills(n, h) {
  addRoad(n, n, n, 0, h / 2); addRoad(n, n, n, 0, -h); addRoad(n, n, n, ROAD.CURVE.EASY, h);
  addRoad(n, n, n, 0, 0); addRoad(n, n, n, -ROAD.CURVE.EASY, h / 2); addRoad(n, n, n, 0, 0);
}
function addSCurves() {
  const M = ROAD.LENGTH.MEDIUM, C = ROAD.CURVE, Hh = ROAD.HILL;
  addRoad(M, M, M, -C.EASY, 0); addRoad(M, M, M, C.MEDIUM, Hh.MEDIUM); addRoad(M, M, M, C.EASY, -Hh.LOW);
  addRoad(M, M, M, -C.EASY, Hh.MEDIUM); addRoad(M, M, M, -C.MEDIUM, -Hh.MEDIUM);
}
function addBumps() { [5, -2, -5, 8, 5, -7, 5, -2].forEach(h => addRoad(10, 10, 10, 0, h)); }
const addDownhillToEnd = n => addRoad(n, n, n, -ROAD.CURVE.EASY, -lastY() / SEG);

addStraight(ROAD.LENGTH.SHORT);
addLowRollingHills(ROAD.LENGTH.SHORT, ROAD.HILL.LOW);
addCurve(ROAD.LENGTH.MEDIUM, ROAD.CURVE.MEDIUM, ROAD.HILL.LOW);
addSCurves();
addBumps();
addCurve(ROAD.LENGTH.MEDIUM, -ROAD.CURVE.MEDIUM, 0);
addDownhillToEnd(100);
const N = segs.length, L = N * SEG;
const findSeg = z => segs[Math.floor(z / SEG) % N];
const segDiff = (a, b) => ((a - b) % N + N * 1.5) % N - N / 2;      // signed, in segments
const sdist = (a, b) => ((a - b) % L + L * 1.5) % L - L / 2;         // signed, in world z
for (let i = 0; i < 3; i++) segs[i].finish = true;

/* ---------- the track: houses, shops, scenery ---------- */
const HOUSES = [{ n: 330, side: -1, style: 0 }, { n: 800, side: 1, style: 1 }, { n: 1290, side: -1, style: 2 }, { n: 1720, side: 1, style: 3 }];
const FOREST = [900, 1240];
const EGGS = [[560, .8], [1130, -.8], [1950, .75]];
const SHOP_N = N - 14;
const nearHouseSeg = (n, r) => HOUSES.some(h => Math.abs(segDiff(n, h.n)) < r);
const S = (n, kind, x, o) => segs[((n % N) + N) % N].sprites.push(Object.assign({ kind, x, ww: 900, wh: 1500, solid: true }, o || {}));
HOUSES.forEach((h, i) => {
  S(h.n, 'house', h.side * 1.25, { ww: 2600, wh: 2000, i, style: h.style });
  S(h.n, 'friend', h.side * .98, { ww: 260, wh: 455, i, solid: false, center: true });
  S(h.n - 7, 'lamp', h.side * 1.12, { ww: 160, wh: 1500 }); S(h.n + 7, 'lamp', h.side * 1.12, { ww: 160, wh: 1500 });
});
S(SHOP_N, 'shop', -1.3, { ww: 5200, wh: 3000, shop: 'grocery' });
S(SHOP_N, 'shop', 1.3, { ww: 5200, wh: 3000, shop: 'system' });
S(1, 'banner', 0, { ww: RW * 2.4, wh: 2600, solid: false, center: true });
[[1000, 1], [1500, -1]].forEach(([n, s]) => S(n, 'msign', s * 1.15, { ww: 620, wh: 1300 }));
const BILLBOARDS = [[120, 1, 'LAN OR DIE|28 NOV'], [620, -1, 'KNIVSTA|42 km'], [1100, 1, 'HAVE YOU CHECKED|THE BITCOIN PRICE?'], [1600, -1, 'TURN OFF|THE LIGHTS'], [1900, 1, 'GROCERY +|SYSTEMBOLAGET →']];
BILLBOARDS.forEach(([n, s, text]) => S(n, 'board', s * 1.2, { ww: 2300, wh: 1700, text: text.split('|') }));
for (let n = 60; n < N - 30; n += 60) if (!nearHouseSeg(n, 12)) S(n, 'lamp', 1.12, { ww: 160, wh: 1500 });
for (let n = 12; n < N - 30; ) {
  const forest = n > FOREST[0] && n < FOREST[1];
  if (!nearHouseSeg(n, 9) && !BILLBOARDS.some(b => Math.abs(b[0] - n) < 4)) {
    S(n, 'tree', -(forest ? 1.25 + Math.random() * 1.6 : 1.4 + Math.random() * 2.6), { v: Math.random() });
    if (forest || Math.random() < .6) S(n, 'tree', forest ? 1.25 + Math.random() * 1.6 : 1.4 + Math.random() * 2.6, { v: Math.random() });
  }
  if (forest) segs[n].forest = segs[n + 1].forest = true;
  n += forest ? 2 : 3 + Math.floor(Math.random() * 3);
}

/* ---------- sizes of moving things (world units; w = hit width in road units) ---------- */
const SIZES = {
  car: { ww: 560, wh: 420, w: .3 }, truck: { ww: 660, wh: 720, w: .34 }, zombie: { ww: 230, wh: 460, w: .13 },
  moose: { ww: 760, wh: 700, w: .38 }, block: { ww: 820, wh: 430, w: .42 }, beer: { ww: 260, wh: 260, w: .2 },
  energy: { ww: 260, wh: 260, w: .2 }, package: { ww: 300, wh: 300, w: .2 }, gear: { ww: 320, wh: 320, w: .24 }, egg: { ww: 260, wh: 260, w: .22 }
};
const PLAYER_W = 560, PW = PLAYER_W / RW;
const LANE_X = [-2 / 3, 0, 2 / 3];
const CAR_COLS = ['#c0392b', '#2e86de', '#e5e8ea', '#7f8c8d', '#27ae60', '#f39c12', '#8e44ad', '#34495e'];
const EQUIP = [['🎒', 'Lökens backpack'], ['💻', 'Wizcudis laptop'], ['🖥️', 'Ljunkys monitor'], ['🪑', 'A gaming chair'], ['📡', 'The router'],
  ['🔌', 'All the cables'], ['⌨️', 'BigWmans keyboard'], ['🎧', 'Jrohns headset'], ['🖱️', 'The lucky mouse'], ['🍕', 'The emergency pizza']];
const MUM = ['Have you eaten? ❤️', 'Drive carefully. Are you wearing a jacket?', 'Who is this Systembolaget??', 'Call me when you arrive!!!'];
const listNames = a => a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];

/* ---------- friends: pixel art placeholders (or your PNGs) ---------- */
const COLORS = {}, HAIR = { 'Löken': '#e2b955', 'Wizcudi': '#2b1d14', 'Jrohn': '#8a5a2b', 'BigWman': '#3a2a1a', 'Ljunky': '#141414' };
const HERO = {}; // the heroes' full-body PNGs from characters.json (same as on the character select screen)
LOD.loadCharacters().then(list => list.forEach(c => { COLORS[c.name] = c.color; if (c.img && /\.png$/i.test(c.src || '')) HERO[c.name] = c.img; })).catch(() => {});
const FIMG = {};
Object.keys(CFG.FRIEND_IMG).forEach(n => { if (CFG.FRIEND_IMG[n]) { const im = new Image(); im.src = CFG.FRIEND_IMG[n]; FIMG[n] = im; } });
const PIX = ['..HHHH..', '.HHHHHH.', '.HSSSSH.', '.SESSES.', '..SSSS..', '...SS...', '.CCCCCC.', 'CCCCCCCC', 'S.CCCC.S', '..CCCC..', '..PPPP..', '..P..P..', '..P..P..', '.BB..BB.'];
const pixCache = {};
function friendSprite(name, frame) { // 8x14 canvas, scaled up with smoothing off
  const col = COLORS[name] || '#3fa7ff', k = name + col + frame;
  if (pixCache[k]) return pixCache[k];
  const c = document.createElement('canvas'); c.width = 8; c.height = 14; const x = c.getContext('2d');
  const pal = { H: HAIR[name] || '#2b1d14', S: '#f0c8a0', E: '#111', C: col, P: '#2a3442', B: '#0b0b0b' };
  PIX.forEach((row, r) => { for (let i = 0; i < 8; i++) { const ch = row[i]; if (ch === '.' || (r === 8 && i === 7)) continue; x.fillStyle = pal[ch]; x.fillRect(i, r, 1, 1); } });
  x.fillStyle = pal.S; x.fillRect(7, 4, 1, 3); x.fillRect(frame ? 7 : 6, 3, 1, 1); // waving arm
  return (pixCache[k] = c);
}

/* ---------- audio ---------- */
const tone = (...a) => LOD.tone(...a);
const sfx = {
  crash() { LOD.noise(.5, .5, 0, 900); tone(90, .4, 'sawtooth', .12, -50); LOD.noise(.25, .3, .05, 3000, 'highpass'); },
  trunk() { tone(620, .06, 'square', .05); tone(310, .14, 'square', .05, 0, .07); },
  splat() { LOD.noise(.12, .28, 0, 700); tone(180, .1, 'sawtooth', .05, -120); },
  pick() { tone(660, .08, 'triangle', .06); tone(990, .1, 'triangle', .06, 0, .08); },
  door() { tone(1046, .14, 'sine', .07); tone(784, .22, 'sine', .07, 0, .16); },
  nope() { tone(220, .14, 'square', .05); },
  bump() { LOD.noise(.18, .3, 0, 500); tone(70, .15, 'sine', .1); },
  level() { tone(523, .08, 'square', .05); tone(784, .12, 'square', .05, 0, .08); },
  horn() { tone(370, .3, 'square', .05); tone(466, .3, 'square', .04); },
  moose() { tone(110, .7, 'sawtooth', .08, -25); tone(82, .8, 'sawtooth', .06, 15, .2); },
  text() { tone(1568, .06, 'sine', .06); tone(1568, .06, 'sine', .06, 0, .12); },
  bad() { tone(200, .25, 'sawtooth', .06, -120); },
  win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, .16, 'triangle', .07, 0, i * .12)); }
};

/* ---------- state ---------- */
let DD = ((navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 2) ? CFG.DRAW_LOW : CFG.DRAW;
const perf = { acc: 0, n: 0 };
const absZ = () => (G.pos + PZ) % L;
const pSegIdx = () => Math.floor(absZ() / SEG) % N;

function init(g) {
  G = g;
  const me = (LOD.fighter && LOD.fighter.name) || LOD.player || 'Ljunky';
  let friends = LOD.CFG.PLAYERS.filter(n => n !== me);
  if (friends.length > 4) friends = friends.filter(n => n !== 'Ljunky');
  friends = friends.slice(0, 4);
  Object.assign(G, {
    hp: 0, maxHp: 0, lives: CFG.LIVES, driver: me,
    pos: 0, speed: 0, px: 0, lap: 1, ramp: LOD.ramp({ every: CFG.LEVEL_EVERY }), objs: [], flyers: [],
    houses: HOUSES.map((h, i) => Object.assign({ i, name: friends[i] || 'Jonas', picked: false }, h)), picked: 0,
    trunk: 0, inv: 0, pick: null, banner: null, steerVis: 0, hold: 0, braking: false, boost: 0, sky: 0, hill: 0, tree: 0, keyWas: false,
    zT: 2, bT: CFG.BLOCK_EVERY, mT: CFG.MOOSE_EVERY, iT: 5, goldT: rand(25, 40), mumT: rand(35, 55), weakT: rand(12, 18),
    mum: 0, mumMsg: '', mumOk: true, pants: 0, cat: 0, lost: 0, recovered: 0, eggsGot: 0, humT: 0, credits: 0, car: { x: 0, y: 0, w: 0 },
    stats: { kills: 0, gold: 0, crashes: 0, mooseHit: 0, mooseSeen: 0, beers: 0 }
  });
  EGGS.forEach(([n, x]) => G.objs.push(Object.assign({ kind: 'egg', z: n * SEG + SEG / 2, pz: n * SEG + SEG / 2, x, static: true }, SIZES.egg)));
}

/* ---------- spawning ---------- */
const topSpeed = () => {
  const seg = G ? findSeg(absZ()) : null, jungle = LOD.weak() === 'jungle' && seg && seg.forest;
  return CFG.MAX_SPEED * Math.min(CFG.SPEED_MAX_MUL, G.ramp.step(1, CFG.SPEED_STEP)) * LOD.perk('speed') * (G.boost > 0 ? 1.2 : 1) * (jungle ? .85 : 1);
};
function spawn(kind, segsAhead, o) {
  const z = (absZ() + segsAhead * SEG) % L;
  const ob = Object.assign({ kind, z, pz: z, x: 0, speed: 0, vx: 0, seed: Math.random() * 6 }, SIZES[kind], o || {});
  G.objs.push(ob); return ob;
}
const farAhead = () => DD * rand(.72, .96);
const quietZone = s => nearHouseSeg(s, 14) || s > N - 30 || s < 12; // no blocks/moose next to houses or the finish
function spawnCar() {
  const s = farAhead(), lane = pick(LANE_X), truck = Math.random() < .2;
  const zz = (absZ() + s * SEG) % L;
  if (G.objs.some(o => (o.kind === 'car' || o.kind === 'truck') && Math.abs(o.x - lane) < .3 && Math.abs(sdist(o.z, zz)) < SEG * 8)) return;
  spawn(truck ? 'truck' : 'car', s, { x: lane + rand(-.06, .06), speed: topSpeed() * rand(.25, .55) * (truck ? .8 : 1), col: pick(CAR_COLS) });
}
function spawnZombies(n, gold) {
  const s0 = farAhead();
  for (let i = 0; i < n; i++) {
    const side = Math.random() < .3 ? pick([-1, 1]) : 0, type = gold ? 'g' : Math.random() < .3 ? 'r' : 'n';
    const x = side ? side * rand(1.2, 1.5) : rand(-.9, .9);
    spawn('zombie', s0 + i * rand(.5, 3), { x, type, vx: gold ? pick([-1, 1]) * .9 : side ? -side * rand(.2, .35) : rand(-.08, .08) });
  }
}
function spawnBlock() {
  const s = farAhead(), seg = (pSegIdx() + Math.round(s)) % N; if (quietZone(seg)) return;
  const li = Math.floor(Math.random() * 3);
  spawn('block', s, { x: LANE_X[li] });
  if (G.ramp.lvl >= 4 && Math.random() < .45) spawn('block', s, { x: LANE_X[(li + pick([1, 2])) % 3] }); // two lanes closed, find the gap
}
function spawnMoose(extra) {
  const s = DD * rand(.55, .8) + (extra || 0), seg = (pSegIdx() + Math.round(s)) % N; if (quietZone(seg)) return;
  const side = pick([-1, 1]);
  spawn('moose', s, { x: side * 1.9, vx: -side * rand(.35, .55), dir: -side });
  G.stats.mooseSeen++;
  if (!G.flags.moose) { G.flags.moose = true; LOD.toast('🦌 MOOSE on the road! Steer around it', 2.4); }
  sfx.moose();
}
function spawnItem() {
  const k = Math.random() < .5 ? 'beer' : 'energy';
  spawn(k, farAhead(), { x: pick(LANE_X) + rand(-.1, .1), em: k === 'beer' ? '🍺' : '⚡' });
}

/* ---------- events ---------- */
function crash(o) {
  if (G.inv > 0) return false;
  const c = G.car;
  if (LOD.tryShield()) { G.inv = 1; LOD.burst(c.x, c.y - c.w * .3, '#f5c242', 14); tone(1200, .1, 'square', .05); return false; } // Löken's shield
  G.lives--; G.inv = CFG.INV; G.trunk = 1.3; G.shake = 10; G.mumOk = false; LOD.comboBreak(); G.stats.crashes++;
  if (o.kind === 'moose') G.stats.mooseHit++;
  G.speed *= .3; sfx.crash(); LOD.haptic('heavy'); LOD.after(.08, sfx.trunk);
  const eq = EQUIP[G.lost % EQUIP.length]; G.lost++;
  G.flyers.push({ em: eq[0], t: 0, dir: rand(-1, 1), toward: true });
  LOD.pop(c.x, c.y - c.w * .75, '-1 ❤️ ' + eq[1] + ' flew out!', '#ff8a8a');
  LOD.burst(c.x, c.y - c.w * .35, '#ffb347', 10);
  // the gear lands on the road behind you: drive over it next lap to get it back
  const gz = (absZ() - SEG * 3 + L) % L;
  G.objs.push(Object.assign({ kind: 'gear', em: eq[0], name: eq[1], z: gz, pz: gz, x: clamp(G.px + rand(-.3, .3), -.8, .8), static: true }, SIZES.gear));
  if (!G.flags.gearTip) { G.flags.gearTip = true; LOD.after(1.6, () => LOD.toast('It landed on the road. Grab it next lap for +1 ❤️', 2.6)); }
  if (G.lives <= 0) { G.lives = 0; LOD.finish(false, 'down'); }
  return true;
}
function hitZombie(o) {
  o.dead = true; G.stats.kills++;
  const pts = Math.round(CFG.ZOMBIE_PTS[o.type] * LOD.combo() * G.ramp.step(1, CFG.ZOMBIE_LVL_STEP));
  LOD.addScore(pts, 'zombies');
  const c = G.car, sx = c.x + (o.x - G.px) * RW * (CD / PZ) * (VW / 2);
  LOD.pop(sx, c.y - c.w * .7, '+' + fmt(pts), o.type === 'g' ? '#f5c242' : '#b7f07a');
  LOD.burst(sx, c.y - c.w * .45, o.type === 'g' ? '#f5c242' : '#5f8f4a', 9);
  G.flyers.push({ em: '🧟', t: 0, dir: o.x > G.px ? 1 : -1, toward: false, x0: sx });
  G.speed *= .97; sfx.splat(); LOD.haptic('light');
  if (o.type === 'g') { G.stats.gold++; LOD.toast('✨ GOLDEN ZOMBIE! +' + fmt(pts), 2.2); }
}
function collect(o) {
  o.dead = true; const c = G.car;
  if (o.kind === 'beer') {
    if (LOD.beer()) G.stats.beers++; else { LOD.addScore(300, 'bonus'); LOD.pop(c.x, c.y - c.w * .7, '+300 🍺', '#f5c242'); }
  } else if (o.kind === 'energy') {
    G.boost = 4; LOD.pop(c.x, c.y - c.w * .7, '⚡ SPEED!', '#f5c242'); LOD.toast('⚡ Energy drink! Faster for 4 s', 1.8);
  } else if (o.kind === 'package') {
    G.speed *= .25; LOD.pop(c.x, c.y - c.w * .7, '📦 SIGN HERE!', '#e5484d'); tone(500, .1, 'square', .05); tone(400, .14, 'square', .05, 0, .12);
    if (!G.flags.pkg) { G.flags.pkg = true; LOD.weakCallout('A package on the road! You HAVE to sign for it 📦'); }
    return;
  } else if (o.kind === 'gear') {
    G.lives = Math.min(CFG.LIVES, G.lives + 1); G.recovered++; LOD.addScore(CFG.GEAR_BACK_PTS, 'gear');
    LOD.pop(c.x, c.y - c.w * .75, o.em + ' ' + o.name + ' is back! +1 ❤️', '#46c28a');
  } else if (o.kind === 'egg') {
    G.eggsGot++; const eg = LOD.egg() || { em: '🥚' };
    LOD.pop(c.x, c.y - c.w * .7, eg.em + ' ' + G.eggsGot + '/3', '#f5c242'); tone(880 + G.eggsGot * 110, .12, 'square', .05);
    if (G.eggsGot === 3) { LOD.addScore(LOD.CFG.EGG_BONUS, 'egg'); LOD.eggFound(); }
    return;
  }
  sfx.pick(); LOD.haptic('medium');
}
function nearHouse() {
  const ps = pSegIdx();
  return G.houses.find(h => { if (h.picked) return false; const d = segDiff(h.n, ps); return d >= CFG.STOP_RANGE[0] && d <= CFG.STOP_RANGE[1]; }) || null;
}
function tryStop() {
  if (!G || G.mode !== 'play' || G.pick) return;
  const h = nearHouse();
  if (!h) { LOD.toast('No one waiting here. Look for the houses 🏠', 1.5); sfx.nope(); return; }
  if (G.speed > topSpeed() * CFG.STOP_SPEED) { LOD.toast('Too fast! Slow down to open the door 🛑', 1.6); sfx.nope(); LOD.haptic('error'); return; }
  G.pick = { h, t: 0 }; sfx.door(); LOD.haptic('medium');
}
function finishPick() {
  const h = G.pick.h, c = G.car; G.pick = null;
  h.picked = true; G.picked++; LOD.addScore(CFG.FRIEND_PTS, 'friends');
  const heal = LOD.perk('hugHeal', 1), before = G.lives; G.lives = Math.min(CFG.LIVES, G.lives + heal);
  LOD.pop(c.x, c.y - c.w * .8, h.name + ' is in! +' + fmt(CFG.FRIEND_PTS) + (G.lives > before ? ' 🫂 +' + (G.lives - before) + ' ❤️' : ''), '#46c28a');
  sfx.pick(); LOD.haptic('success');
  if (heal > 1 && G.lives > before) LOD.abilityCallout('Loyalty! The hug gives +' + heal + ' hearts 🤝');
  LOD.toast(G.picked >= 4 ? 'Everyone is in! Drive to the finish 🏁' : 'Picked up: ' + G.picked + '/4', 2.4);
}
function crossFinish() {
  if (G.picked >= 4) { LOD.finish(true, 'done'); return; }
  G.lap++;
  const miss = G.houses.filter(h => !h.picked).map(h => h.name);
  G.banner = { text: 'Fuck, we forgot to pick up ' + listNames(miss) + '! Need to drive back!', t: 4.5 };
  sfx.bad(); LOD.haptic('warning');
}

/* ---------- weaknesses + bonus moments ---------- */
function updWeak(dt) {
  const wk = LOD.weak(), seg = findSeg(absZ());
  if (wk === 'jungle' && seg.forest && !G.flags.jungle) { G.flags.jungle = true; LOD.weakCallout('The forest is a jungle. You drive slower in here 🌲'); }
  G.weakT -= dt; if (G.weakT > 0) return;
  G.weakT = rand(18, 26);
  if (wk === 'packages') spawn('package', DD * .6, { x: clamp(G.px, -.8, .8), em: '📦' });
  else if (wk === 'pants') { G.pants = 3; LOD.pop(G.car.x, G.car.y - G.car.w * .8, '👖 PANTS DOWN!', '#ff8fb0'); if (!G.flags.pants) { G.flags.pants = true; LOD.weakCallout('Pants down! Steering is wobbly for 3 s 👖'); } }
  else if (wk === 'coins') { tone(1568, .05, 'square', .05); tone(2093, .08, 'square', .04, 0, .06); spawnZombies(3); if (!G.flags.coins) { G.flags.coins = true; LOD.weakCallout('Coins out of the window. Zombies heard it 🪙'); } }
  else if (wk === 'cat') { G.cat = 2.2; tone(700, .2, 'sine', .08, 450); tone(1100, .22, 'sine', .07, -520, .18); if (!G.flags.cat) { G.flags.cat = true; LOD.weakCallout('The cat jumped on the dashboard! 🐈'); } }
}
function updBonus(dt) {
  G.goldT -= dt;
  if (G.goldT <= 0) { G.goldT = rand(30, 45); spawnZombies(1, true); LOD.toast('✨ A GOLDEN ZOMBIE is on the road!', 2.2); sfx.horn(); }
  G.mumT -= dt;
  if (G.mumT <= 0 && G.mum <= 0) { G.mumT = rand(45, 65); G.mum = 3.5; G.mumOk = true; G.mumMsg = pick(MUM); sfx.text(); LOD.haptic('warning'); }
  if (G.mum > 0) {
    G.mum -= dt;
    if (G.mum <= 0 && G.mumOk) { LOD.addScore(1500, 'bonus'); LOD.toast('Eyes on the road. Mum is proud. +1 500 📱', 2.2); }
  }
}

/* ---------- update (only while playing) ---------- */
function update(G, dt) {
  const mv = LOD.input.move(), joy = LOD.input.joy, keys = LOD.input.keys, R = G.ramp;
  if (R.tick(dt)) { LOD.toast('LEVEL ' + R.lvl + ': more traffic, faster road', 2); sfx.level(); }
  const maxSp = topSpeed();
  // input: drag = steer, hold still = brake, auto gas. Keys: arrows / A D, down = brake, Space / E = stop & open door
  G.hold = joy && mv.len < .15 ? G.hold + dt : 0;
  let brake = G.hold > .12 || mv.y > .55;
  let steer = mv.x * (G.pants > 0 ? .45 : 1);
  const kd = keys.has(' ') || keys.has('e'); if (kd && !G.keyWas) tryStop(); G.keyWas = kd;
  if (G.pick) { brake = true; steer = 0; G.pick.t += dt; if (G.pick.t >= 1 && G.speed < 50) finishPick(); }
  G.braking = brake;
  if (G.pants > 0) G.pants -= dt; if (G.cat > 0) G.cat -= dt; if (G.boost > 0) G.boost -= dt; if (G.inv > 0) G.inv -= dt;
  // speed (Jake: accelerate / brake / off-road)
  const off = Math.abs(G.px) > 1;
  if (brake) G.speed -= maxSp * 1.1 * dt; else G.speed += maxSp / 4.5 * dt;
  if (off && G.speed > maxSp / 4) G.speed -= maxSp / 2 * dt;
  G.speed = clamp(G.speed, 0, maxSp);
  // steering + centrifugal force in curves
  const oldA = absZ(), pSeg = findSeg(oldA), spPct = G.speed / maxSp;
  const dx = dt * 2 * Math.max(.3, Math.min(1, G.speed / CFG.MAX_SPEED));
  if (G.speed > 150) G.px += steer * dx;
  G.px -= dx * spPct * pSeg.curve * CENTRIFUGAL;
  G.px = clamp(G.px, -2.2, 2.2);
  G.steerVis += (steer - G.steerVis) * Math.min(1, dt * 8);
  // move + parallax
  const startPos = G.pos;
  G.pos = (G.pos + dt * G.speed) % L;
  const moved = (G.pos - startPos + L) % L;
  G.sky = (G.sky + .001 * pSeg.curve * moved / SEG + 1) % 1; G.hill = (G.hill + .002 * pSeg.curve * moved / SEG + 1) % 1; G.tree = (G.tree + .003 * pSeg.curve * moved / SEG + 1) % 1;
  const newA = absZ();
  // roadside bumps (trees, houses, shops) when off road
  if (Math.abs(G.px) > 1) for (const s of findSeg(newA).sprites) {
    if (!s.solid) continue; const wU = s.ww / RW, cx = s.x + (s.x < 0 ? -wU / 2 : wU / 2);
    if (overlap(G.px, PW, cx, wU)) { G.speed = maxSp / 6; G.px += G.px > 0 ? -.08 : .08; G.shake = 4; sfx.bump(); LOD.comboBreak(); break; }
  }
  // objects move
  for (const o of G.objs) {
    if (o.dead) continue; o.pz = o.z;
    if (o.speed) { o.z = (o.z + o.speed * dt) % L; o.x += Math.sin(G.t * .7 + o.seed) * .03 * dt; }
    if (o.kind === 'zombie') {
      if (o.type === 'r' && sdist(o.z, newA) < SEG * 35) o.vx = Math.sign(G.px - o.x) * .35;
      if (o.type === 'g' && Math.abs(o.x) > .95) o.vx = -Math.sign(o.x) * Math.abs(o.vx);
      o.x += o.vx * dt;
    } else if (o.kind === 'moose') o.x += o.vx * dt;
  }
  // collisions: anything we passed this frame and overlap sideways
  for (const o of G.objs) {
    if (o.dead) continue;
    const ro = sdist(o.pz, oldA), rn = sdist(o.z, newA);
    if (!(ro >= -SEG * .5 && rn <= SEG * .5)) continue;
    const w = o.kind === 'zombie' ? o.w * LOD.perk('range') : o.w;
    if (!overlap(G.px, PW, o.x, w, .9)) continue;
    if (o.kind === 'zombie') hitZombie(o);
    else if (o.kind === 'car' || o.kind === 'truck') { if (crash(o)) { o.z = (newA + SEG * 3) % L; o.pz = o.z; sfx.horn(); } }
    else if (o.kind === 'block' || o.kind === 'moose') { if (crash(o)) { o.dead = true; LOD.burst(G.car.x, G.car.y - G.car.w * .4, o.kind === 'moose' ? '#7a5230' : '#f5a524', 12); } }
    else collect(o);
    if (G.mode !== 'play') return;
  }
  // clean up
  G.objs = G.objs.filter(o => {
    if (o.dead) return false; if (o.static) return true;
    const rel = sdist(o.z, newA);
    if (rel < -SEG * 5 || rel > SEG * (DD + 25)) return false;
    if ((o.kind === 'zombie' || o.kind === 'moose') && Math.abs(o.x) > 2.2) return false;
    return true;
  });
  // finish line
  if (newA < oldA) { crossFinish(); if (G.mode !== 'play') return; }
  // spawns: difficulty rises with the ramp, the final minute goes crazy
  const fm = G.finalMin, lvl = R.lvl;
  const cars = G.objs.reduce((n, o) => n + (o.kind === 'car' || o.kind === 'truck' ? 1 : 0), 0);
  if (cars < CFG.TRAFFIC + (lvl - 1) * CFG.TRAFFIC_STEP + (fm ? CFG.TRAFFIC_FINAL : 0) && Math.random() < dt * 2.5) spawnCar();
  G.zT -= dt; if (G.zT <= 0) { G.zT = Math.max(CFG.ZOMBIE_EVERY_MIN, R.step(CFG.ZOMBIE_EVERY, -CFG.ZOMBIE_EVERY_STEP)) * (fm ? .6 : 1); spawnZombies(Math.random() < .25 + lvl * .04 ? 3 + Math.floor(Math.random() * 4) : 1 + Math.floor(Math.random() * 2)); }
  G.bT -= dt; if (G.bT <= 0) { G.bT = Math.max(CFG.BLOCK_EVERY_MIN, R.step(CFG.BLOCK_EVERY, -CFG.BLOCK_EVERY_STEP)) * (fm ? .7 : 1); spawnBlock(); }
  G.mT -= dt; if (G.mT <= 0) { G.mT = Math.max(CFG.MOOSE_EVERY_MIN, R.step(CFG.MOOSE_EVERY, -CFG.MOOSE_EVERY_STEP)) * (fm ? .5 : 1); spawnMoose(); }
  G.iT -= dt; if (G.iT <= 0) { G.iT = fm ? CFG.ITEM_EVERY_FINAL : CFG.ITEM_EVERY; spawnItem(); if (fm) spawnItem(); }
  updWeak(dt); updBonus(dt);
  LOD.addScore(R.step(CFG.DRIVE_PTS, CFG.DRIVE_PTS_STEP) * (G.speed / CFG.MAX_SPEED) * dt, 'drive');
  if (G.banner) { G.banner.t -= dt; if (G.banner.t <= 0) G.banner = null; }
  if (!G.hinted && G.t > .3) { G.hinted = true; LOD.toast('Drag to steer. Hold still to brake.', 3.5); }
}
function onFinalMinute(G) { G.iT = 1; spawnMoose(); spawnMoose(12); spawnMoose(24); spawnZombies(6); }

/* ---------- every frame (all modes): stop button, ending, audio, quality ---------- */
function frame(G, dt) {
  syncStopBtn();
  const playing = G.mode === 'play';
  if (G.mode === 'ending') {
    if (G.why === 'done') { G.speed = Math.max(G.speed, CFG.MAX_SPEED * .8); G.px *= .97; G.credits += dt; }
    else G.speed *= Math.pow(.2, dt);
    G.pos = (G.pos + G.speed * dt) % L;
    if (G.why === 'down' && Math.random() < .5) G.parts.push({ x: G.car.x + rand(-10, 10), y: G.car.y - G.car.w * .5, vx: rand(-20, 20), vy: rand(-80, -40), t: .9, c: '#555' });
  }
  if (playing || G.mode === 'ending') { for (const f of G.flyers) f.t += dt; if (G.trunk > 0) G.trunk -= dt; }
  if (G.flyers.length) G.flyers = G.flyers.filter(f => f.t < 1.3);
  // electric whine + road noise
  const sp = clamp(G.speed / CFG.MAX_SPEED, 0, 1.4);
  G.loopT = (G.loopT || 0) - dt;
  if (G.loopT <= 0) { G.loopT = .25; LOD.setLoop('road', playing ? .02 + .06 * sp : 0, 500, 'lowpass'); }
  if (playing && !LOD.isMuted()) { G.humT -= dt; if (G.humT <= 0) { G.humT = .09; tone(160 + 520 * sp, .12, 'triangle', .008 + .01 * sp); } }
  // drop the draw distance on slow phones
  if (playing) {
    perf.acc += dt; perf.n++;
    if (perf.acc > 1.5) { const avg = perf.acc / perf.n; if (avg > 1 / 42 && DD > CFG.DRAW_MIN) DD -= 15; else if (avg < 1 / 56 && DD < CFG.DRAW) DD += 5; perf.acc = perf.n = 0; }
  }
}

/* ---------- Stop & Open Door button (own DOM button, only while this mission plays) ---------- */
const st = document.createElement('style');
st.textContent = '#btn-stop{position:absolute;right:14px;bottom:max(14px,env(safe-area-inset-bottom,0px));z-index:3;width:104px;height:84px;border-radius:18px;border:3px solid #000;background:#2a3d4e;color:#93a7b6;' +
  'font:400 11px/1.1 Bungee,Impact,sans-serif;letter-spacing:.03em;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;box-shadow:0 5px 0 #0b1117;touch-action:none;-webkit-user-select:none;user-select:none;cursor:pointer}' +
  '#btn-stop b{font-size:28px;line-height:1;font-weight:400}#btn-stop.near{background:#5a4a2a;color:#f5c242}' +
  '#btn-stop.ready{background:radial-gradient(circle at 35% 30%,#ffd27a,#f5a524 60%,#b8730f);color:#1b1204;animation:stop-pulse .6s ease-in-out infinite alternate}' +
  '#btn-stop:active{transform:translateY(4px);box-shadow:0 1px 0 #0b1117}' +
  '@keyframes stop-pulse{from{box-shadow:0 5px 0 #6b4308,0 0 0 0 rgba(245,165,36,.7)}to{box-shadow:0 5px 0 #6b4308,0 0 0 12px rgba(245,165,36,0)}}' +
  '@media (prefers-reduced-motion:reduce){#btn-stop.ready{animation:none}}';
document.head.appendChild(st);
const stopBtn = document.createElement('button');
stopBtn.id = 'btn-stop'; stopBtn.hidden = true; stopBtn.setAttribute('aria-label', 'Stop and open the door');
stopBtn.innerHTML = '<b>🚪</b><span>STOP &amp;<br>OPEN DOOR</span>';
LOD.stage.appendChild(stopBtn);
stopBtn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); tryStop(); });
stopBtn.addEventListener('contextmenu', e => e.preventDefault());
let btnState = '';
function syncStopBtn() {
  const on = G && G.mode === 'play';
  let s = 'off';
  if (on) { const h = !G.pick && nearHouse(); s = h ? (G.speed <= topSpeed() * CFG.STOP_SPEED ? 'ready' : 'near') : 'idle'; }
  if (s === btnState) return; btnState = s;
  stopBtn.hidden = !on; stopBtn.classList.toggle('ready', s === 'ready'); stopBtn.classList.toggle('near', s === 'near');
}

/* ---------- drawing: projection fitted to portrait phones ---------- */
let VW = 400, VH = 700, Kx = 200, Ky = 300, cy = 400;
function fit() {
  VW = LOD.view.W; VH = LOD.view.H; Kx = VW / 2; Ky = Math.min(VH * .5, Kx * 1.6); cy = VH - Ky - VH * .03;
}
function project(p, camX, camY, camZ) {
  p.camera.x = -camX; p.camera.y = (p.world.y || 0) - camY; p.camera.z = (p.world.z || 0) - camZ;
  const s = p.screen.scale = CD / p.camera.z;
  p.screen.x = Math.round(VW / 2 + s * p.camera.x * Kx);
  p.screen.y = Math.round(cy - s * p.camera.y * Ky);
  p.screen.w = Math.round(s * RW * Kx);
}
const FOGC = [13, 22, 34];
const fogCache = new Map();
function fogc(hex, f) { // colour faded into the night fog, cached in 12 steps
  const lv = Math.round((1 - f) * 12), k = hex + lv; let c = fogCache.get(k);
  if (!c) {
    const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255, t = lv / 12;
    c = 'rgb(' + Math.round(r + (FOGC[0] - r) * t) + ',' + Math.round(g + (FOGC[1] - g) * t) + ',' + Math.round(b + (FOGC[2] - b) * t) + ')'; fogCache.set(k, c);
  }
  return c;
}
const COL = {
  road: ['#3a3f47', '#363b42'], grass: ['#17331f', '#132b1a'], forest: ['#10241a', '#0d1f16'], rumble: ['#d9dce0', '#b3262c'], lane: '#d8dde2'
};
function poly(ctx, x1, y1, x2, y2, x3, y3, x4, y4, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.lineTo(x4, y4); ctx.closePath(); ctx.fill(); }
function drawSegment(ctx, seg) {
  const a = seg.p1.screen, b = seg.p2.screen, f = seg.fog, d = seg.dark ? 1 : 0;
  const r1 = a.w / 6, r2 = b.w / 6;
  ctx.fillStyle = fogc((seg.forest ? COL.forest : COL.grass)[d], f); ctx.fillRect(0, b.y, VW, a.y - b.y + 1);
  poly(ctx, a.x - a.w - r1, a.y, a.x - a.w, a.y, b.x - b.w, b.y, b.x - b.w - r2, b.y, fogc(COL.rumble[d], f));
  poly(ctx, a.x + a.w + r1, a.y, a.x + a.w, a.y, b.x + b.w, b.y, b.x + b.w + r2, b.y, fogc(COL.rumble[d], f));
  if (seg.finish) { // checkered finish line
    const k = 8;
    for (let i = 0; i < k; i++) {
      const xa = a.x - a.w + a.w * 2 * i / k, xa2 = a.x - a.w + a.w * 2 * (i + 1) / k, xb = b.x - b.w + b.w * 2 * i / k, xb2 = b.x - b.w + b.w * 2 * (i + 1) / k;
      poly(ctx, xa, a.y, xa2, a.y, xb2, b.y, xb, b.y, fogc((i + seg.index) % 2 ? '#f2f2f2' : '#111111', f));
    }
    return;
  }
  poly(ctx, a.x - a.w, a.y, a.x + a.w, a.y, b.x + b.w, b.y, b.x - b.w, b.y, fogc(COL.road[d], f));
  if (!d) {
    const l1 = a.w / 32, l2 = b.w / 32, lw1 = a.w * 2 / LANES, lw2 = b.w * 2 / LANES;
    for (let i = 1; i < LANES; i++) { const x1 = a.x - a.w + lw1 * i, x2 = b.x - b.w + lw2 * i; poly(ctx, x1 - l1 / 2, a.y, x1 + l1 / 2, a.y, x2 + l2 / 2, b.y, x2 - l2 / 2, b.y, fogc(COL.lane, f)); }
  }
}

/* sky, moon, stars, hills and tree line (parallax with the curves) */
const STARS = Array.from({ length: 46 }, () => ({ x: Math.random(), y: Math.random() * .9, s: Math.random() < .2 ? 2 : 1 }));
let skyKey = '', skyGrad = null, vigKey = '', vigGrad = null;
function drawBackground(ctx, playerY) {
  const key = VH + '|' + cy;
  if (key !== skyKey) { skyKey = key; skyGrad = ctx.createLinearGradient(0, 0, 0, cy); skyGrad.addColorStop(0, '#050913'); skyGrad.addColorStop(.7, '#121a33'); skyGrad.addColorStop(1, '#2a2242'); }
  ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, VW, cy + 2);
  ctx.fillStyle = '#d7dff0';
  for (const s of STARS) { const x = (((s.x - G.sky * 1.5) % 1) + 1) % 1 * VW; ctx.fillRect(x, s.y * cy * .8, s.s, s.s); }
  const mx = (((.78 - G.sky * 1.5) % 1.2) + 1.2) % 1.2 * VW;
  ctx.fillStyle = '#f3ecd2'; ctx.beginPath(); ctx.arc(mx, cy * .22, Math.max(14, VW * .045), 0, 7); ctx.fill();
  ctx.fillStyle = '#121a33'; ctx.beginPath(); ctx.arc(mx + VW * .018, cy * .22 - 4, Math.max(14, VW * .045), 0, 7); ctx.fill();
  const base = cy + clamp(playerY * .002, -30, 30);
  ctx.fillStyle = '#1a2440'; ctx.beginPath(); ctx.moveTo(0, VH);
  for (let i = 0; i <= 24; i++) { const x = i / 24 * VW, u = (i / 24 + G.hill) * Math.PI * 4; ctx.lineTo(x, base - VH * (.07 + .035 * Math.sin(u) + .025 * Math.sin(u * 2.3 + 1))); }
  ctx.lineTo(VW, VH); ctx.fill();
  ctx.fillStyle = '#0c1712'; ctx.beginPath(); ctx.moveTo(0, VH);
  for (let i = 0; i <= 48; i++) { const x = i / 48 * VW, u = (i / 48 + G.tree) * 48, h = (i % 2 ? .035 : .015) + .01 * Math.sin(u * .7); ctx.lineTo(x, base - VH * h); }
  ctx.lineTo(VW, VH); ctx.fill();
}

/* ---------- sprite drawing (canvas shapes + emoji) ---------- */
const EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
function emo(ctx, ch, x, y, size) { ctx.font = Math.round(size) + 'px ' + EMOJI; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ch, x, y); }
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
function drawTree(ctx, x, y, w, h, v) {
  ctx.fillStyle = '#3a2a1c'; ctx.fillRect(x + w * .45, y + h * .82, w * .1, h * .18);
  const cols = v > .5 ? ['#0f3a24', '#134a2d', '#1a5c37'] : ['#0e3320', '#124229', '#175231'];
  for (let i = 0; i < 3; i++) { const top = y + h * i * .22, bw = w * (.62 + i * .19); ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.moveTo(x + w / 2, top); ctx.lineTo(x + w / 2 + bw / 2, top + h * .42); ctx.lineTo(x + w / 2 - bw / 2, top + h * .42); ctx.fill(); }
}
function drawLamp(ctx, x, y, w, h, left) {
  ctx.fillStyle = '#4a5560'; ctx.fillRect(x + w * .4, y + h * .05, w * .2, h * .95);
  const lx = left ? x + w * 2.2 : x - w * 1.2;
  ctx.fillRect(Math.min(lx, x + w * .5), y + h * .05, Math.abs(lx - (x + w * .5)), Math.max(1, w * .12));
  ctx.fillStyle = 'rgba(255,214,120,.16)'; ctx.beginPath(); ctx.arc(lx, y + h * .12, w * 2.4, 0, 7); ctx.fill();
  ctx.fillStyle = '#ffe3a0'; ctx.beginPath(); ctx.arc(lx, y + h * .08, Math.max(1.5, w * .45), 0, 7); ctx.fill();
}
const HOUSE_STYLE = [{ wall: '#8b2a22', trim: '#efe9dc', roof: '#262a31' }, { wall: '#d2ad4f', trim: '#f6f1e4', roof: '#3b2b25' },
  { wall: '#4d6f93', trim: '#eef2f5', roof: '#22262d' }, { wall: '#e6e0d2', trim: '#7a4a2c', roof: '#3a2a2a' }];
function drawHouse(ctx, x, y, w, h, s, house) {
  const c = HOUSE_STYLE[s.style], waiting = house && !house.picked;
  ctx.fillStyle = c.roof; ctx.fillRect(x + w * .68, y + h * .08, w * .08, h * .22);
  ctx.fillStyle = c.wall; ctx.fillRect(x, y + h * .38, w, h * .62);
  ctx.fillStyle = c.roof; ctx.beginPath(); ctx.moveTo(x - w * .04, y + h * .41); ctx.lineTo(x + w / 2, y + h * .02); ctx.lineTo(x + w * 1.04, y + h * .41); ctx.fill();
  ctx.fillStyle = waiting ? '#ffd27a' : '#3a3324';
  ctx.fillRect(x + w * .1, y + h * .54, w * .2, h * .18); ctx.fillRect(x + w * .7, y + h * .54, w * .2, h * .18);
  ctx.fillStyle = c.trim; ctx.fillRect(x + w * .195, y + h * .54, w * .01, h * .18); ctx.fillRect(x + w * .795, y + h * .54, w * .01, h * .18);
  ctx.fillRect(x + w * .4, y + h * .64, w * .2, h * .36); ctx.fillStyle = waiting ? '#ffb347' : '#2a2a2a'; ctx.fillRect(x + w * .43, y + h * .67, w * .14, h * .33);
  if (waiting) { ctx.fillStyle = 'rgba(255,210,122,.22)'; ctx.beginPath(); ctx.arc(x + w * .5, y + h * .64, w * .22, 0, 7); ctx.fill(); }
  if (house && w > 50) { ctx.font = '400 ' + Math.round(w * .085) + 'px Bungee, Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText(house.name, x + w / 2, y + h * .3, w * .7); }
}
function drawShop(ctx, x, y, w, h, kind) {
  const gro = kind === 'grocery';
  ctx.fillStyle = gro ? '#d9d4c7' : '#3e403c'; ctx.fillRect(x, y + h * .12, w, h * .88);
  ctx.fillStyle = gro ? '#c8312f' : '#1f6b3a'; ctx.fillRect(x - w * .02, y, w * 1.04, h * .24);
  ctx.font = '400 ' + Math.round(h * .13) + 'px Bungee, Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
  ctx.fillText(gro ? 'GROCERY' : 'SYSTEMBOLAGET', x + w / 2, y + h * .125, w * .92);
  ctx.fillStyle = '#fff3c4'; ctx.fillRect(x + w * .06, y + h * .36, w * .38, h * .38); ctx.fillRect(x + w * .56, y + h * .36, w * .38, h * .38);
  ctx.fillStyle = gro ? '#e0c060' : '#2f7d4a';
  for (let r = 0; r < 3; r++) { ctx.fillRect(x + w * .06, y + h * (.46 + r * .1), w * .38, h * .015); ctx.fillRect(x + w * .56, y + h * (.46 + r * .1), w * .38, h * .015); }
  if (!gro && w > 80) { ctx.fillStyle = '#2a5a35'; for (let i = 0; i < 6; i++) { const bx = x + w * (.6 + i * .055); ctx.fillRect(bx, y + h * .5, w * .02, h * .08); ctx.fillRect(bx, y + h * .6, w * .02, h * .08); } }
  ctx.fillStyle = '#1b2026'; ctx.fillRect(x + w * .44, y + h * .62, w * .12, h * .38);
  ctx.fillStyle = 'rgba(255,243,196,.12)'; ctx.fillRect(x, y + h * .9, w, h * .1);
}
function drawBanner(ctx, x, y, w, h) {
  ctx.fillStyle = '#9aa3ab'; ctx.fillRect(x + w * .02, y, w * .015, h); ctx.fillRect(x + w * .965, y, w * .015, h);
  ctx.fillStyle = '#0a0a0a'; ctx.fillRect(x, y, w, h * .2);
  const k = 24, cw = w / k; for (let i = 0; i < k; i++) { ctx.fillStyle = i % 2 ? '#f2f2f2' : '#111'; ctx.fillRect(x + i * cw, y + h * .2, cw, h * .04); }
  ctx.font = '400 ' + Math.round(h * .1) + 'px Bungee, Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#f5a524';
  ctx.fillText('FINISH · LAN OR DIE 🏁', x + w / 2, y + h * .1, w * .9);
}
function drawBoard(ctx, x, y, w, h, lines) {
  ctx.fillStyle = '#3a3f47'; ctx.fillRect(x + w * .2, y + h * .5, w * .05, h * .5); ctx.fillRect(x + w * .75, y + h * .5, w * .05, h * .5);
  ctx.fillStyle = '#1a2733'; ctx.fillRect(x, y, w, h * .55); ctx.strokeStyle = '#f5a524'; ctx.lineWidth = Math.max(1, w * .015); ctx.strokeRect(x, y, w, h * .55);
  if (w < 40) return;
  ctx.font = '400 ' + Math.round(h * .12) + 'px Bungee, Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#f5c242';
  lines.forEach((t, i) => ctx.fillText(t, x + w / 2, y + h * (.18 + i * .2), w * .9));
}
function moosePath(ctx, x, y, w, h, dir, body, antler) { // side view in a 100x100 box, origin bottom-centre
  ctx.save(); ctx.translate(x + w / 2, y + h); ctx.scale(dir * w / 100, h / 100);
  ctx.fillStyle = body;
  ctx.fillRect(-30, -42, 7, 42); ctx.fillRect(-18, -42, 7, 42); ctx.fillRect(14, -42, 7, 42); ctx.fillRect(25, -42, 7, 42);
  ctx.beginPath(); ctx.ellipse(-2, -54, 36, 18, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(22, -64); ctx.lineTo(36, -82); ctx.lineTo(44, -74); ctx.lineTo(30, -50); ctx.fill();
  ctx.beginPath(); ctx.ellipse(46, -76, 13, 7, .35, 0, 7); ctx.fill();
  ctx.fillStyle = antler; ctx.beginPath(); ctx.moveTo(36, -84); ctx.lineTo(26, -100); ctx.lineTo(34, -96); ctx.lineTo(38, -106); ctx.lineTo(44, -95); ctx.lineTo(52, -103); ctx.lineTo(51, -88); ctx.lineTo(42, -82); ctx.fill();
  ctx.restore();
}
function drawMooseSign(ctx, x, y, w, h) {
  ctx.fillStyle = '#6b737b'; ctx.fillRect(x + w * .46, y + h * .45, w * .08, h * .55);
  ctx.fillStyle = '#d8262b'; ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w, y + h * .5); ctx.lineTo(x, y + h * .5); ctx.fill();
  ctx.fillStyle = '#f5c518'; ctx.beginPath(); ctx.moveTo(x + w / 2, y + h * .07); ctx.lineTo(x + w * .9, y + h * .46); ctx.lineTo(x + w * .1, y + h * .46); ctx.fill();
  if (w > 18) moosePath(ctx, x + w * .3, y + h * .2, w * .4, h * .22, 1, '#111', '#111');
}
function drawCar(ctx, x, y, w, h, o) { // traffic car / truck from behind
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x - w * .04, y + h * .94, w * 1.08, h * .08);
  ctx.fillStyle = '#0b0b0b'; ctx.fillRect(x + w * .06, y + h * .78, w * .18, h * .22); ctx.fillRect(x + w * .76, y + h * .78, w * .18, h * .22);
  if (o.kind === 'truck') {
    ctx.fillStyle = o.col; rr(ctx, x, y, w, h * .86, w * .04); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x + w * .495, y + h * .06, w * .01, h * .74);
    ctx.fillStyle = '#d11a2a'; ctx.fillRect(x + w * .03, y + h * .72, w * .14, h * .07); ctx.fillRect(x + w * .83, y + h * .72, w * .14, h * .07);
    return;
  }
  ctx.fillStyle = o.col; ctx.beginPath(); ctx.moveTo(x + w * .14, y + h * .42); ctx.lineTo(x + w * .24, y + h * .06); ctx.lineTo(x + w * .76, y + h * .06); ctx.lineTo(x + w * .86, y + h * .42); ctx.fill();
  ctx.fillStyle = '#1b2533'; ctx.beginPath(); ctx.moveTo(x + w * .2, y + h * .38); ctx.lineTo(x + w * .28, y + h * .12); ctx.lineTo(x + w * .72, y + h * .12); ctx.lineTo(x + w * .8, y + h * .38); ctx.fill();
  ctx.fillStyle = o.col; rr(ctx, x, y + h * .38, w, h * .48, w * .07); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(x, y + h * .74, w, h * .12);
  ctx.fillStyle = '#d11a2a'; ctx.fillRect(x + w * .04, y + h * .48, w * .2, h * .1); ctx.fillRect(x + w * .76, y + h * .48, w * .2, h * .1);
  ctx.fillStyle = '#e8eef3'; ctx.fillRect(x + w * .38, y + h * .62, w * .24, h * .1);
}
function drawBlock(ctx, x, y, w, h, t) {
  ctx.fillStyle = '#2b2f35'; ctx.fillRect(x + w * .1, y + h * .4, w * .07, h * .6); ctx.fillRect(x + w * .83, y + h * .4, w * .07, h * .6);
  const k = 7, sw = w / k; for (let i = 0; i < k; i++) { ctx.fillStyle = i % 2 ? '#f2f2f2' : '#e5484d'; ctx.fillRect(x + i * sw, y + h * .3, sw, h * .3); }
  ctx.fillStyle = Math.floor(t * 4) % 2 ? '#ffb020' : '#5a3a00'; ctx.beginPath(); ctx.arc(x + w * .14, y + h * .2, Math.max(1.5, w * .05), 0, 7); ctx.arc(x + w * .86, y + h * .2, Math.max(1.5, w * .05), 0, 7); ctx.fill();
}
function drawGlowEmoji(ctx, ch, x, y, w, h, glow, t) {
  const bob = Math.sin(t * 4) * h * .06;
  if (glow) { ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x + w / 2, y + h * .55, w * .55, 0, 7); ctx.fill(); }
  emo(ctx, ch, x + w / 2, y + h * .5 + bob, h * .9);
}

/* player's car: a sleek black electric crossover, seen from behind. No badge or logo. */
function drawPlayer(ctx, cx, by, w, t) {
  const h = w * .62, x = cx - w / 2, y = by - h, sp = G.speed / CFG.MAX_SPEED;
  const bounce = G.mode === 'play' ? Math.sin(t * 31) * sp * 1.2 : 0;
  if (G.inv > 0 && Math.floor(t * 14) % 2) ctx.globalAlpha = .55;
  ctx.save(); ctx.translate(cx, by + bounce); ctx.rotate(G.steerVis * .035); ctx.translate(-cx, -by);
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(cx, by - h * .02, w * .56, h * .08, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#050505'; rr(ctx, x + w * .03, y + h * .78, w * .17, h * .22, w * .03); ctx.fill(); rr(ctx, x + w * .8, y + h * .78, w * .17, h * .22, w * .03); ctx.fill();
  // lower body + bumper
  ctx.fillStyle = '#121519'; rr(ctx, x, y + h * .42, w, h * .46, w * .08); ctx.fill();
  ctx.fillStyle = '#07080a'; rr(ctx, x + w * .04, y + h * .74, w * .92, h * .14, w * .05); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(x + w * .06, y + h * .45, w * .88, h * .04);
  const open = G.trunk > 0 ? clamp(Math.min((1.3 - G.trunk) / .15, G.trunk / .35), 0, 1) : 0;
  // cabin / liftgate
  if (open > 0) {
    ctx.fillStyle = '#030405'; ctx.beginPath(); ctx.moveTo(x + w * .1, y + h * .44); ctx.lineTo(x + w * .2, y + h * .04); ctx.lineTo(x + w * .8, y + h * .04); ctx.lineTo(x + w * .9, y + h * .44); ctx.fill();
    emo(ctx, '📦', cx - w * .14, y + h * .3, h * .2); emo(ctx, '🔌', cx + w * .14, y + h * .32, h * .18);
    const lift = h * .62 * open; // the liftgate swings up above the roof
    ctx.fillStyle = '#16191e'; ctx.beginPath(); ctx.moveTo(x + w * .2, y + h * .04); ctx.lineTo(x + w * .24, y + h * .04 - lift); ctx.lineTo(x + w * .76, y + h * .04 - lift); ctx.lineTo(x + w * .8, y + h * .04); ctx.fill();
    ctx.fillStyle = '#1d2a38'; ctx.beginPath(); ctx.moveTo(x + w * .25, y + h * .02); ctx.lineTo(x + w * .27, y + h * .04 - lift * .85); ctx.lineTo(x + w * .73, y + h * .04 - lift * .85); ctx.lineTo(x + w * .75, y + h * .02); ctx.fill();
  } else {
    ctx.fillStyle = '#16191e'; ctx.beginPath(); ctx.moveTo(x + w * .08, y + h * .46); ctx.quadraticCurveTo(x + w * .14, y + h * .02, x + w * .3, y); ctx.lineTo(x + w * .7, y); ctx.quadraticCurveTo(x + w * .86, y + h * .02, x + w * .92, y + h * .46); ctx.fill();
    ctx.fillStyle = '#1d2a38'; ctx.beginPath(); ctx.moveTo(x + w * .17, y + h * .4); ctx.quadraticCurveTo(x + w * .2, y + h * .08, x + w * .32, y + h * .07); ctx.lineTo(x + w * .68, y + h * .07); ctx.quadraticCurveTo(x + w * .8, y + h * .08, x + w * .83, y + h * .4); ctx.fill();
    ctx.fillStyle = 'rgba(160,200,255,.12)'; ctx.beginPath(); ctx.moveTo(x + w * .3, y + h * .1); ctx.lineTo(x + w * .42, y + h * .1); ctx.lineTo(x + w * .3, y + h * .36); ctx.lineTo(x + w * .22, y + h * .36); ctx.fill();
  }
  // full-width light bar + taillights
  const br = G.braking;
  ctx.fillStyle = br ? '#ff3b3b' : '#8f0f17'; ctx.fillRect(x + w * .06, y + h * .47, w * .88, h * .035);
  ctx.fillStyle = br ? '#ff5050' : '#b3121b'; rr(ctx, x + w * .02, y + h * .44, w * .2, h * .09, w * .03); ctx.fill(); rr(ctx, x + w * .78, y + h * .44, w * .2, h * .09, w * .03); ctx.fill();
  if (br) { ctx.fillStyle = 'rgba(255,60,60,.18)'; ctx.fillRect(x - w * .04, y + h * .36, w * 1.08, h * .26); }
  ctx.fillStyle = '#e8eef3'; ctx.fillRect(cx - w * .12, y + h * .6, w * .24, h * .1);
  if (w > 70) { ctx.font = '700 ' + Math.round(h * .075) + 'px Barlow, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#111'; ctx.fillText('LAN 028', cx, y + h * .652); }
  // side mirrors
  ctx.fillStyle = '#0d0f12'; ctx.fillRect(x - w * .02, y + h * .3, w * .06, h * .07); ctx.fillRect(x + w * .96, y + h * .3, w * .06, h * .07);
  // door open while picking up a friend (on the house side)
  if (G.pick) { const s = G.pick.h.side, dx0 = s < 0 ? x : x + w; ctx.fillStyle = '#14171b'; ctx.beginPath(); ctx.moveTo(dx0, y + h * .1); ctx.lineTo(dx0 + s * w * .28, y + h * .02); ctx.lineTo(dx0 + s * w * .28, y + h * .7); ctx.lineTo(dx0, y + h * .8); ctx.fill(); ctx.fillStyle = 'rgba(255,214,120,.35)'; ctx.fillRect(dx0 + (s < 0 ? -w * .02 : 0), y + h * .12, w * .02, h * .6); }
  ctx.restore(); ctx.globalAlpha = 1;
}

/* ---------- road render (Jake: project segments front to back, sprites back to front) ---------- */
const buckets = [];
function renderRoad(ctx, t) {
  const DDn = Math.min(DD, N - 1);
  const base = findSeg(G.pos), basePct = (G.pos % SEG) / SEG;
  const pAbs = absZ(), pSeg = findSeg(pAbs), pPct = (pAbs % SEG) / SEG;
  const playerY = lerp(pSeg.p1.world.y, pSeg.p2.world.y, pPct);
  drawBackground(ctx, playerY);
  const fogD = CFG.FOG / LOD.perk('light'); // Wizcudi sees further in the dark
  let maxy = VH, x = 0, dx = -(base.curve * basePct);
  for (let n = 0; n < DDn; n++) {
    const seg = segs[(base.index + n) % N], looped = seg.index < base.index;
    seg.fog = expFog(n / DDn, fogD); seg.clip = maxy;
    project(seg.p1, G.px * RW - x, playerY + CAM_H, G.pos - (looped ? L : 0));
    project(seg.p2, G.px * RW - x - dx, playerY + CAM_H, G.pos - (looped ? L : 0));
    x += dx; dx += seg.curve;
    if (seg.p1.camera.z <= CD || seg.p2.screen.y >= seg.p1.screen.y || seg.p2.screen.y >= maxy) continue;
    drawSegment(ctx, seg);
    maxy = seg.p1.screen.y;
  }
  // headlights on the road
  const c = G.car;
  if (c.w) { ctx.fillStyle = 'rgba(255,240,190,.07)'; ctx.beginPath(); ctx.moveTo(c.x - c.w * .4, c.y - c.w * .3); ctx.lineTo(c.x + c.w * .4, c.y - c.w * .3); ctx.lineTo(c.x + c.w * 1.3 + G.steerVis * c.w, cy + (c.y - cy) * .2); ctx.lineTo(c.x - c.w * 1.3 + G.steerVis * c.w, cy + (c.y - cy) * .2); ctx.fill(); }
  for (let n = 0; n < DDn; n++) (buckets[n] || (buckets[n] = [])).length = 0;
  for (const o of G.objs) { if (o.dead) continue; const n = (Math.floor(o.z / SEG) % N - base.index + N) % N; if (n > 0 && n < DDn) buckets[n].push(o); }
  const pn = (pSeg.index - base.index + N) % N;
  for (let n = DDn - 1; n > 0; n--) {
    const seg = segs[(base.index + n) % N];
    if (seg.p1.camera.z > CD) {
      for (const s of seg.sprites) drawStatic(ctx, seg, s, t);
      const b = buckets[n]; if (b.length > 1) b.sort((p, q) => q.z - p.z);
      for (const o of b) drawObj(ctx, seg, o, t);
    }
    if (n === pn) {
      const sc = CD / PZ, camY = lerp(pSeg.p1.camera.y, pSeg.p2.camera.y, pPct);
      G.car.x = VW / 2; G.car.y = cy - sc * camY * Ky; G.car.w = PLAYER_W * sc * Kx;
      drawPlayer(ctx, G.car.x, G.car.y, G.car.w, t);
    }
  }
}
function withClip(ctx, top, bottom, clipY, fog, fn) { // hide what is behind a hill; fade into the fog
  if (top >= clipY) return;
  const clip = bottom > clipY;
  if (clip) { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, VW, clipY); ctx.clip(); }
  ctx.globalAlpha = .25 + .75 * fog; fn(); ctx.globalAlpha = 1;
  if (clip) ctx.restore();
}
function drawStatic(ctx, seg, s, t) {
  const sc = seg.p1.screen.scale, sx = seg.p1.screen.x + sc * s.x * RW * Kx, sy = seg.p1.screen.y;
  const w = s.ww * sc * Kx, h = s.wh * sc * Kx; if (w < 1.2) return;
  const x = s.center ? sx - w / 2 : s.x < 0 ? sx - w : sx, y = sy - h;
  if (x > VW || x + w < 0) return;
  withClip(ctx, y, sy, seg.clip, seg.fog, () => {
    if (s.kind === 'tree') drawTree(ctx, x, y, w, h, s.v);
    else if (s.kind === 'lamp') drawLamp(ctx, x, y, w, h, s.x < 0);
    else if (s.kind === 'house') drawHouse(ctx, x, y, w, h, s, G.houses[s.i]);
    else if (s.kind === 'friend') {
      const hs = G.houses[s.i]; if (!hs || hs.picked) return;
      const picking = G.pick && G.pick.h === hs, k = picking ? clamp(G.pick.t, 0, 1) : 0;
      if (picking && k >= .98) return;
      // your own PNG (CFG.FRIEND_IMG) > the hero from the character select > pixel-art placeholder
      const own = FIMG[hs.name], hero = HERO[hs.name];
      const img = own && own.complete && own.naturalWidth ? own : hero && hero.naturalWidth ? hero : null;
      let fw = w, fh = h, bx = x, by = y;
      if (img) { fh = CFG.HERO_H * sc * Kx; fw = fh * img.naturalWidth / img.naturalHeight; bx = sx - fw / 2; by = sy - fh; }
      const jump = img && !picking ? Math.abs(Math.sin(t * 5 + s.i)) * fh * .06 : 0; // the hero hops to wave you down
      const fx = lerp(bx, VW / 2 + (hs.side < 0 ? -1 : 1) * G.car.w * .55 - fw / 2, k), fy = lerp(by, G.car.y - fh, k) - jump;
      if (img) ctx.drawImage(img, fx, fy, fw, fh);
      else { ctx.imageSmoothingEnabled = false; ctx.drawImage(friendSprite(hs.name, Math.floor(t * 4) % 2), fx, fy, fw, fh); ctx.imageSmoothingEnabled = true; }
      if (fh > 16 && !picking) {
        ctx.fillStyle = '#f5a524'; const ay = fy - fh * .2 + Math.sin(t * 6) * fh * .04;
        ctx.beginPath(); ctx.moveTo(fx + fw / 2 - fh * .06, ay); ctx.lineTo(fx + fw / 2 + fh * .06, ay); ctx.lineTo(fx + fw / 2, ay + fh * .1); ctx.fill();
        ctx.font = '700 ' + Math.round(clamp(fh * .12, 9, 15)) + 'px Barlow, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = 3; ctx.strokeText(hs.name, fx + fw / 2, ay - 3); ctx.fillStyle = '#fff'; ctx.fillText(hs.name, fx + fw / 2, ay - 3);
      }
    }
    else if (s.kind === 'shop') drawShop(ctx, x, y, w, h, s.shop);
    else if (s.kind === 'banner') drawBanner(ctx, x, y, w, h);
    else if (s.kind === 'msign') drawMooseSign(ctx, x, y, w, h);
    else if (s.kind === 'board') drawBoard(ctx, x, y, w, h, s.text);
  });
}
function drawObj(ctx, seg, o, t) {
  const pc = (o.z % SEG) / SEG, a = seg.p1.screen, b = seg.p2.screen;
  const sc = lerp(a.scale, b.scale, pc), sx = lerp(a.x, b.x, pc) + sc * o.x * RW * Kx, sy = lerp(a.y, b.y, pc);
  const w = o.ww * sc * Kx, h = o.wh * sc * Kx; if (w < 1) return;
  const x = sx - w / 2, y = sy - h; if (x > VW || x + w < 0) return;
  withClip(ctx, y, sy, seg.clip, seg.fog, () => {
    if (o.kind === 'car' || o.kind === 'truck') drawCar(ctx, x, y, w, h, o);
    else if (o.kind === 'zombie') {
      if (o.type === 'g') { ctx.fillStyle = 'rgba(245,194,66,' + (.3 + .2 * Math.sin(t * 8)) + ')'; ctx.beginPath(); ctx.arc(sx, y + h * .5, w * .7, 0, 7); ctx.fill(); }
      emo(ctx, '🧟', sx + Math.sin(t * 6 + o.seed) * w * .06, y + h * .5, h * (o.type === 'r' ? .9 : 1));
      if (o.type === 'g' && w > 8) emo(ctx, '✨', sx + w * .4, y + h * .1, h * .3);
    }
    else if (o.kind === 'moose') moosePath(ctx, x, y, w, h, o.dir, '#5a3a22', '#c9a46a');
    else if (o.kind === 'block') drawBlock(ctx, x, y, w, h, t);
    else if (o.kind === 'beer' || o.kind === 'energy') drawGlowEmoji(ctx, o.em, x, y, w, h, 'rgba(245,194,66,.28)', t);
    else if (o.kind === 'package') drawGlowEmoji(ctx, '📦', x, y, w, h, 'rgba(229,72,77,.25)', t);
    else if (o.kind === 'gear') drawGlowEmoji(ctx, o.em, x, y, w, h, 'rgba(70,194,138,.35)', t);
    else if (o.kind === 'egg') { const eg = LOD.egg(); drawGlowEmoji(ctx, eg ? eg.em : '🥚', x, y, w, h, 'rgba(255,255,255,.18)', t); }
  });
}

/* ---------- engine hooks: world (1:1 screen), overlays, HUD ---------- */
function drawWorld(ctx, G, t) {
  fit(); renderRoad(ctx, t);
  // gear flying out of the trunk (towards you) and zombies flying off the bonnet
  const c = G.car;
  for (const f of G.flyers) {
    const k = f.t / 1.2;
    let x, y, size;
    if (f.toward) { x = c.x + f.dir * VW * .45 * k; y = c.y - c.w * .65 - Math.sin(Math.min(1, k) * Math.PI) * VH * .18 + k * k * VH * .45; size = 22 + 120 * k * k; }
    else { x = f.x0 + f.dir * VW * .25 * k; y = c.y - c.w * .5 - Math.sin(Math.min(1, k * 1.2) * Math.PI) * VH * .3; size = 30 * (1 - k * .7); }
    ctx.save(); ctx.globalAlpha = clamp(1.3 - k, 0, 1); ctx.translate(x, y); ctx.rotate(f.dir * f.t * 7); emo(ctx, f.em, 0, 0, size); ctx.restore();
  }
  // dark edges, lit centre
  const key = VW + 'x' + VH;
  if (key !== vigKey) { vigKey = key; vigGrad = ctx.createRadialGradient(VW / 2, VH * .72, VH * .2, VW / 2, VH * .72, Math.max(VW, VH) * .85); vigGrad.addColorStop(0, 'rgba(3,6,12,0)'); vigGrad.addColorStop(1, 'rgba(3,6,12,.6)'); }
  ctx.fillStyle = vigGrad; ctx.fillRect(0, 0, VW, VH);
}
function wrapText(ctx, text, maxW) {
  const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) { const tst = cur ? cur + ' ' + w : w; if (ctx.measureText(tst).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tst; }
  if (cur) lines.push(cur); return lines;
}
function drawScreen(ctx, G, t) {
  const W = VW, H = VH;
  if (G.cat > 0) { // the cat on the dashboard
    const k = Math.min(1, (2.2 - G.cat) * 4, G.cat * 3);
    emo(ctx, '🐈', W / 2 + Math.sin(t * 5) * 20, H - H * .2 * k, H * .38);
    ctx.font = '400 22px Bungee, Impact, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('MEOW!', W / 2, H - H * .42 * k);
  }
  if (G.mum > 0) { // Mum texts: the phone blocks part of the road
    const pw = Math.min(250, W * .66), ph = 112, px = W / 2 - pw / 2, py = H * .24;
    ctx.globalAlpha = Math.min(1, G.mum * 3, (3.5 - G.mum) * 6);
    ctx.fillStyle = '#0a0a0a'; rr(ctx, px, py, pw, ph, 16); ctx.fill(); ctx.strokeStyle = '#2a3d4e'; ctx.lineWidth = 3; ctx.stroke();
    ctx.font = '700 12px Barlow, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#93a7b6'; ctx.fillText('📱 Mum · now', px + 14, py + 18);
    ctx.font = '600 15px Barlow, sans-serif'; ctx.fillStyle = '#fff';
    wrapText(ctx, G.mumMsg, pw - 28).slice(0, 3).forEach((l, i) => ctx.fillText(l, px + 14, py + 44 + i * 19));
    ctx.globalAlpha = 1;
  }
  if (G.banner) { // forgot someone at the finish line
    const a = Math.min(1, G.banner.t * 2), on = Math.floor(t * 6) % 2;
    ctx.font = '400 ' + (W < 400 ? 17 : 21) + 'px Bungee, Impact, sans-serif';
    const lines = wrapText(ctx, G.banner.text, Math.min(W - 48, 520)), lh = W < 400 ? 23 : 28, bh = lines.length * lh + 26, bw = Math.min(W - 24, 560), by = H * .34;
    ctx.globalAlpha = a; ctx.save(); ctx.translate(W / 2, by + bh / 2); ctx.rotate(-.03);
    ctx.fillStyle = '#000'; rr(ctx, -bw / 2 + 5, -bh / 2 + 5, bw, bh, 12); ctx.fill();
    ctx.fillStyle = on ? '#e5484d' : '#b8262b'; rr(ctx, -bw / 2, -bh / 2, bw, bh, 12); ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    lines.forEach((l, i) => ctx.fillText(l, 0, -bh / 2 + 13 + lh / 2 + i * lh));
    ctx.restore(); ctx.globalAlpha = 1;
  }
  if (G.mode === 'ending' && G.why === 'done') { // credits roll (tap skips)
    const k = clamp(G.credits / .8, 0, 1);
    ctx.fillStyle = 'rgba(5,8,14,' + (.75 * k) + ')'; ctx.fillRect(0, 0, W, H);
    const lines = [['LAN OR DIE', 30, '#f5a524'], ['Mission 2 · The Pickup', 16, '#e8eef3'], ['', 10], ['Driver', 12, '#93a7b6'], [G.driver, 20, '#fff'], ['', 8],
      ['Passengers', 12, '#93a7b6'], [G.houses.map(h => h.name).join(' · '), 16, '#fff'], ['', 8], ['Gear still in the trunk', 12, '#93a7b6'], [G.lives + ' / ' + CFG.LIVES, 18, '#fff'], ['', 8],
      ['Zombies flattened', 12, '#93a7b6'], [String(G.stats.kills), 18, '#fff'], ['', 8], ['Road engine', 12, '#93a7b6'], ['Jake Gordon · javascript-racer (MIT)', 14, '#fff'], ['', 8],
      ['No moose were harmed.', 14, '#c9a46a'], ['Probably.', 14, '#c9a46a'], ['', 10], ['Next stop: the grocery store 🛒', 16, '#46c28a'], ['LAN · 28 Nov 2026', 14, '#93a7b6']];
    let y = H - G.credits * 70 + 40; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const [txt, size, col] of lines) { if (txt && y > -20 && y < H + 20) { ctx.globalAlpha = k; ctx.font = '400 ' + size + 'px Bungee, Impact, sans-serif'; ctx.fillStyle = col; ctx.fillText(txt, W / 2, y, W - 30); } y += size + 12; }
    ctx.globalAlpha = 1;
  }
}
function hud(ctx, G) { // on top of the engine HUD (clock, score, combo)
  const W = VW, pad = 12;
  ctx.textBaseline = 'middle';
  const ly = 22 + LOD.view.hudLeftY; // left column sits below the pause button
  ctx.textAlign = 'left'; emo(ctx, '❤️', pad + 9, ly, 16);
  ctx.textAlign = 'left'; ctx.font = '400 16px Bungee, Impact, sans-serif'; ctx.fillStyle = G.lives <= 3 ? '#e5484d' : '#fff'; ctx.fillText('×' + G.lives, pad + 20, ly + 1);
  ctx.font = '400 11px Bungee, Impact, sans-serif'; ctx.fillStyle = '#93a7b6'; ctx.fillText('LAP ' + G.lap, pad + 2, ly + 22);
  ctx.textAlign = 'center'; ctx.font = '400 14px Bungee, Impact, sans-serif'; ctx.fillStyle = G.picked >= 4 ? '#46c28a' : '#f5a524';
  ctx.fillText('Picked up: ' + G.picked + '/4', W / 2, 46);
  G.houses.forEach((h, i) => {
    const x = W / 2 + (i - 1.5) * 22, y = 66;
    ctx.globalAlpha = h.picked ? 1 : .3; ctx.fillStyle = COLORS[h.name] || '#3fa7ff'; ctx.beginPath(); ctx.arc(x, y, 8, 0, 7); ctx.fill();
    ctx.fillStyle = '#0a1016'; ctx.font = '700 10px Barlow, sans-serif'; ctx.fillText(h.name.slice(0, 1), x, y + 1); ctx.globalAlpha = 1;
  });
  // where to next
  const ps = pSegIdx();
  let hint = '';
  if (G.mode !== 'play') hint = '';
  else if (G.picked >= 4) hint = '🏁 Finish · ' + (((N - ps) * 1.1 / 1000).toFixed(1)) + ' km';
  else {
    let best = null, bd = 1e9;
    for (const h of G.houses) if (!h.picked) { const d = (h.n - ps + N) % N; if (d < bd) { bd = d; best = h; } }
    if (best && bd < 140) hint = '🏠 ' + best.name + ' · ' + Math.round(bd * 1.1) + ' m' + (bd < 30 && Math.floor(G.t * 4) % 2 ? '  SLOW DOWN!' : '');
  }
  if (hint) { ctx.font = '700 14px Barlow, sans-serif'; ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = 3; ctx.strokeText(hint, W / 2, 90); ctx.fillText(hint, W / 2, 90); }
  ctx.textAlign = 'right'; ctx.font = '400 12px Bungee, Impact, sans-serif'; ctx.fillStyle = '#93a7b6';
  ctx.fillText(Math.round(G.speed / CFG.MAX_SPEED * 180) + ' km/h', W - pad, G.mult > 1 ? 64 : 46);
}

/* ---------- badges + result ---------- */
const BADGES = [
  { em: '🚕', name: 'Taxi Driver', t: s => s.win },
  { em: '🧟', name: 'Roadkill Royalty', t: s => s.kills >= 40 },
  { em: '🦌', name: 'Moose Whisperer', t: s => s.win && s.mooseHit === 0 }
];
function onFinish(G) {
  if (G.why === 'done') { G.endT = 9; G.credits = 0; sfx.win(); LOD.toast('🏁 EVERYBODY IS IN! TO THE LAN!', 3); }
  else if (G.why === 'overload') { sfx.bad(); LOD.toast('⚠️ OVERLOAD! Score saved.', 2.5); }
  else { sfx.bad(); LOD.toast('No LAN without equipment! 🧳', 2.5); }
}
function result(G) {
  const c = k => Math.round((G.cats[k] || {}).pts || 0), s = G.stats, win = G.why === 'done', over = G.why === 'overload';
  const miss = G.houses.filter(h => !h.picked).map(h => h.name);
  const rows = [['Zombies (' + s.kills + ')', c('zombies')], ['Driving', c('drive')], ['Friends picked up (' + G.picked + '/4)', c('friends')]];
  if (c('gear')) rows.push(['Gear recovered (' + G.recovered + ')', c('gear')]);
  if (c('bonus')) rows.push(['Bonus moments', c('bonus')]);
  if (c('egg')) rows.push(['Easter egg 🥚', c('egg')]);
  const bonus = win ? [['Everybody picked up', CFG.VICTORY], ['Time bonus (' + mmss(G.t) + ')', Math.max(0, Math.round((LOD.M.maxTime - G.t) * CFG.TIME_BONUS_PER_S))], ['Gear left (' + G.lives + '/' + CFG.LIVES + ')', G.lives * CFG.LIFE_BONUS]] : [];
  return {
    head: win ? 'Everybody is in!' : over ? 'OVERLOAD!' : 'No LAN without equipment!',
    lead: win ? 'Four friends, ' + G.lives + ' pieces of gear and a trunk that finally stays shut. Grocery store and Systembolaget, here we come.'
      : over ? 'Three minutes on the road' + (miss.length ? ' and ' + listNames(miss) + (miss.length > 1 ? ' are' : ' is') + ' still waiting.' : ' and the finish line is still out there.') + ' Everything counts.'
      : 'The trunk is empty. ' + LOD.otherPlayer() + ' is driving next time.',
    rows, bonus,
    stats: { win, overload: over, kills: s.kills, mooseHit: s.mooseHit, mooseSeen: s.mooseSeen, picked: G.picked, lives: G.lives, time: Math.round(G.t) },
    line: win ? 'Picked up everyone in ' + mmss(G.t) + ' (lap ' + G.lap + ').' : over ? 'OVERLOAD with ' + G.picked + '/4 picked up.' : 'Lost all the gear with ' + G.picked + '/4 picked up.'
  };
}

/* ---------- register with the engine ---------- */
const BRIEF_TIPS = [
  ['Steer:', 'drag left or right anywhere. The car speeds up on its own. Keyboard: ← → (or A D).'],
  ['Brake:', 'hold your finger still on the screen (or ↓).'],
  ['Pick up:', 'slow down next to a waving friend 🏠 and press 🚪 STOP & OPEN DOOR (or Space). +' + fmt(CFG.FRIEND_PTS) + ' and a hug ❤️.'],
  ['Zombies 🧟', 'on the road = points. Hit them in a row for a combo. ✨ Golden zombies are worth a lot.'],
  ['10 pieces of gear = 10 lives.', 'Cars, 🚧 roadblocks and moose 🦌 knock one out of the trunk. It lands on the road: grab it next lap to get it back.'],
  ['Pickups:', '🍺 beer boosts your abilities, ⚡ gives speed.'],
  ['Forgot someone?', 'The finish is between the grocery store and Systembolaget. Cross it without everyone and you drive another lap.'],
  ['3:00', 'The road gets busier and faster. Final minute = chaos. At 3:00: OVERLOAD.']
];
LOD.mission({
  id: 2, title: 'The Pickup', unlock: '2026-11-21', until: '2026-11-22', cap: 300000, noFire: true, landscape: true, // counts 21 + 22 Nov, final 22 Nov 23:59
  world: { w: 100000, h: 100000 }, viewScale: () => 1, camTarget: () => [LOD.view.W / 2, LOD.view.H / 2], // world coords = screen coords
  intro: () => ({
    kind: 'chat', title: 'LAN SQUAD 🎮', sub: 'Löken, Wizcudi, Jrohn, BigWman, Ljunky, Jonas', button: 'Start the car ⚡',
    lines: [
      { at: 'Today 06:02' },
      { from: 'You', text: 'The van is full of zombies. Taking the black EV instead. Picking you all up now 🚗' },
      { from: 'BigWman', text: 'Pick me up FIRST. The route is in the spreadsheet. 📊' },
      { from: 'Löken', text: 'Nobody gets left behind. Stick together, boys.' },
      { from: 'Wizcudi', text: 'I am outside already. All lights OFF. It is very dark.' },
      { from: 'Jrohn', text: 'I love this!! Waiting by the road. Wearing pants. Mostly.' },
      { from: 'Ljunky', text: 'Is it charged? Please say it is charged.' },
      { sfx: 'zombie', text: '*THUMP* …something on the roof', shake: true, wait: 1700 },
      { from: 'Jonas', text: 'Relax. What could go wrong? 😎' },
      { from: 'You', text: 'Finish line: the grocery store and Systembolaget. Everybody in or we drive another lap.' }
    ]
  }),
  outro: G => G.why === 'done' ? {
    kind: 'call', title: 'LAN SQUAD', sub: 'Calling…', music: 'game', intensity: .5, auto: 2500, button: 'Hang up', tbc: 'Next stop: the grocery store.',
    lines: [
      { from: 'You', text: 'Everybody in? Count off!' },
      { from: G.houses[0].name, text: 'Here. Who left a zombie hand in the cup holder?' },
      { from: G.houses[1].name, text: 'Here! Systembolaget first. Priorities.' },
      { from: G.houses[2].name, text: 'Here. Is that my monitor on the road back there?' },
      { from: G.houses[3].name, text: 'I love this!!' },
      { from: 'Jonas', text: '…guys? I am still at home.' }
    ]
  } : null,
  brief: {
    card: '<div class="gearline" aria-hidden="true">🏠 🏠 🏠 🏠 → 🛒 🍾</div><p style="margin-top:8px">Pick up your 4 friends at their houses, then cross the finish line between the grocery store and Systembolaget.</p>',
    get tips() { const e = LOD.egg(); return e ? BRIEF_TIPS.concat([['🥚 Easter egg:', 'drive over 3 ' + e.what + ' ' + e.em + ' on the road. +' + fmt(LOD.CFG.EGG_BONUS) + '.']]) : BRIEF_TIPS; }
  },
  badges: BADGES,
  init, update, frame, drawWorld, drawScreen, hud, onFinish, result, onFinalMinute,
  overloadWin: () => false,
  intensity: G => G.speed / CFG.MAX_SPEED * .45 + (G.lives <= 3 ? .3 : 0)
});

window.__m2 = { get G() { return G; }, CFG, HOUSES, N, SEG, PZ, tryStop, nearHouse, crossFinish, crash, spawnMoose, spawnZombies, get DD() { return DD; } }; // test hooks
})();
