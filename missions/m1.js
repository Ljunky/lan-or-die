/* LAN OR DIE – Mission 1: Sneak Out. Needs engine.js first. Only the game lives here; the engine does
   the loop, input, HUD base, result screen, scoreboard and backend (see ENGINE.md). */
(() => {
'use strict';

/* ===================== MISSION CONFIG (tuning numbers) ===================== */
const CFG = {
  LOAD_BONUS: 100000, LOAD_BONUS_PER_S: 1000, // car-loaded bonus: 100 000 minus 1 000 per second of play
  KIDS: { every: 3, step: 0.03, max: 1.6 },   // kids wake up: +3 % speed every 3 s, at most x1.6 (after 60 s)
  SQ: {                   // Sidequest after the car is loaded
    levelEvery: 15,       // seconds per difficulty level
    overloadLevel: 9,     // reaching this level = OVERLOAD (the engine's 3:00 limit also ends it)
    firstWave: 2,         // seconds before wave 1
    waveGap: 7, waveGapMin: 2.5, waveGapStep: 0.6,  // seconds between waves, shrinks per level
    waveSize: 3, waveSizeStep: 1,                   // zombies per wave, + per level
    speedStep: 0.08,      // +8 % zombie speed per level
    runnerShare: 0.35, runnerShareStep: 0.04,       // share of fast zombies, + per level (max 80 %)
    tankFromLevel: 3, tankEvery: 2,                 // from level 3: 1 tank per wave, +1 every 2 levels
    killPtsStep: 0.25,    // kill points x (1 + 0.25 per level above 1)
    survivePts: 10, survivePtsStep: 6,              // points per second survived, + per level
    maxAlive: 40,
    pizzaEveryWaves: 4    // a pizza drops in the yard every N waves
  },
  MAX_HP: 3,
  HUG_HEAL_CD: 12,        // a kid can heal you once per 12 s (the hug still stuns you and makes noise)
  PIZZA_PTS: 250,
  ITEM_EVERY: 22, ITEM_EVERY_FINAL: 8, ITEM_LIFE: 15, // pop-up special items (faster in the final minute)
  SHOES_TIME: 10, SHOES_SPEED: 1.35, ENERGY_TIME: 6, ENERGY_SPEED: 1.35,
  BEER_EVERY: 2,          // stand at the fridge: one beer now, one more every 2 s (engine: max 3, 20 s)
  MELEE_BONUS: 1.5,       // +50 % points for knife kills
  NOISE_SPAWN_FROM: 55,   // noise above this pulls extra zombies into the level
  EXT_CHARGE: 100, EXT_USE: 32, EXT_REGEN: 14, // extinguisher charge per second
  SILENCER_AT: 35,        // seconds until the silencer pops up in the office
  FINAL_SPAWN: 2.2, FINAL_SPEED: 1.15 // final minute: yard spawns every 2.2 s, new zombies 15 % faster
};
/* =================== /MISSION CONFIG =================== */

const { clamp, rand, pick, fmt, mmss, em, rrect, pop, toast, burst } = LOD;
const ctx = LOD.ctx, $ = LOD.ui.$;
let G = null; // the engine's state for the current round (set in init)

/* ---------- world ---------- */
const WORLD = { w: 1600, h: 1000 };
const CELL = 20, GW = 80, GH = 50;
const HOUSE = { x: 100, y: 100, w: 1000, h: 800 };
const walls = [];
const R = (x, y, w, h, o) => walls.push(Object.assign({ x, y, w, h, c: '#0b1117' }, o || {}));
// outer walls (front door gap at x=1100, y 670..760)
R(90, 90, 1030, 20); R(90, 890, 1030, 20); R(90, 90, 20, 820);
R(1100, 90, 20, 580); R(1100, 760, 20, 150);
// vertical room walls (door gaps y 270..360 and 670..760)
for (const x of [423, 756]) { R(x, 110, 20, 160); R(x, 360, 20, 310); R(x, 760, 20, 130); }
// horizontal wall (door gaps x 200..290, 550..640, 880..970)
R(110, 490, 90, 20); R(290, 490, 260, 20); R(640, 490, 240, 20); R(970, 490, 130, 20);
// furniture
const F = (x, y, w, h, c, em) => R(x, y, w, h, { f: true, c, em });
F(125, 125, 120, 150, '#5a4a44', '🛏️');
F(330, 115, 85, 55, '#4a3d36');
F(600, 125, 130, 90, '#3e5a7a', '🛏️');
F(455, 420, 70, 50, '#7a4a3a', '🧸');
F(800, 125, 230, 60, '#4b3f33');
F(1050, 300, 40, 120, '#3a2f28');
F(125, 800, 150, 80, '#6b8696', '🛁');
F(340, 520, 70, 40, '#55646f');
F(470, 810, 200, 70, '#5b3a3a', '🛋️');
F(540, 630, 120, 60, '#4a3b2f');
F(790, 520, 80, 30, '#3c3c44');               // kitchen counter
F(1015, 522, 70, 46, '#cfd8de', '🍺');          // the FRIDGE (beer)
F(1040, 820, 40, 40, '#2f5a3c', '🪴');
const CAR = { x: 1430, y: 470, w: 130, h: 70 };
R(CAR.x - CAR.w / 2, CAR.y - CAR.h / 2, CAR.w, CAR.h, { car: true, c: '#8aa0b4' });

const ROOMS = [
  [110, 110, 313, 380, '#2f2a29', 'BEDROOM'], [443, 110, 313, 380, '#262c37', 'KIDS ROOM'],
  [776, 110, 324, 380, '#25302f', 'OFFICE'], [110, 510, 313, 380, '#28323a', 'BATHROOM'],
  [443, 510, 313, 380, '#33292a', 'LIVING ROOM'], [776, 510, 324, 380, '#2b2b34', 'KITCHEN']
];
const ITEM_DEFS = [
  { em: '🎧', name: 'Headset', x: 165, y: 425 },
  { em: '⌨️', name: 'Keyboard', x: 605, y: 425 },
  { em: '🖥️', name: 'Monitor', x: 1000, y: 210 },
  { em: '🖱️', name: 'Mouse', x: 330, y: 650 },
  { em: '', name: 'Snus', x: 600, y: 735, snus: true } // Swedish snus tin, drawn by drawSnus()
];
const PIZZA_SPOTS = [[380, 220], [600, 300], [1050, 450], [350, 780], [700, 770], [1000, 800]];
const ENERGY_SPOTS = [[1250, 450], [1300, 800], [1200, 200]];
const FRIDGE = { x: 1050, y: 600 };                                 // stand here to grab a beer
const WEAPON_SPOTS = { knife: [900, 620], extinguisher: [720, 560] }; // kitchen + living room
const SILENCER_SPOT = [880, 300];                                    // office, pops up later
const SHOES_SPOT = [300, 330];                                       // bedroom, from the start
const MUD = [[1230, 380, 46, 22], [1340, 700, 56, 24], [1480, 600, 44, 20], [1250, 900, 50, 22]]; // yard puddles (x, y, rx, ry)
const PACKAGES = [[560, 470], [870, 470], [600, 560], [330, 560]];  // BigWman's weakness
const EGG_SPOTS = [[140, 305], [1062, 250], [150, 650]];             // same 3 spots for every fighter = equally hard
const INDOOR_Z = [[690, 380], [900, 350], [1000, 440], [200, 640], [700, 600], [520, 730], [950, 640], [860, 800]];
const YARD_Z = [[1250, 300], [1300, 620], [1500, 220], [1520, 720], [1380, 860]];

function pointInWalls(x, y, pad = 0) {
  for (const w of walls) if (x > w.x - pad && x < w.x + w.w + pad && y > w.y - pad && y < w.y + w.h + pad) return true;
  return false;
}
function los(x1, y1, x2, y2) {
  const d = Math.hypot(x2 - x1, y2 - y1), n = Math.ceil(d / 8);
  for (let i = 1; i < n; i++) { const t = i / n; if (pointInWalls(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, 0)) return false; }
  return true;
}
function resolve(e) {
  for (let pass = 0; pass < 2; pass++) for (const w of walls) {
    const cx = clamp(e.x, w.x, w.x + w.w), cy = clamp(e.y, w.y, w.y + w.h);
    const dx = e.x - cx, dy = e.y - cy, d2 = dx * dx + dy * dy;
    if (d2 < e.r * e.r) {
      if (d2 > 0.0001) { const d = Math.sqrt(d2), push = e.r - d; e.x += dx / d * push; e.y += dy / d * push; }
      else {
        const l = e.x - w.x, r = w.x + w.w - e.x, t = e.y - w.y, b = w.y + w.h - e.y, m = Math.min(l, r, t, b);
        if (m === l) e.x = w.x - e.r; else if (m === r) e.x = w.x + w.w + e.r; else if (m === t) e.y = w.y - e.r; else e.y = w.y + w.h + e.r;
      }
    }
  }
  e.x = clamp(e.x, e.r, WORLD.w - e.r); e.y = clamp(e.y, e.r, WORLD.h - e.r);
}
function moveE(e, dx, dy) { e.x += dx; e.y += dy; resolve(e); }

/* flow field (path to the player) */
const blocked = new Uint8Array(GW * GH);
for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) blocked[j * GW + i] = pointInWalls((i + .5) * CELL, (j + .5) * CELL, 10) ? 1 : 0;
const dist = new Int16Array(GW * GH), queue = new Int32Array(GW * GH);
const DIRS = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
function computeFlow(px, py) {
  dist.fill(32767);
  let qh = 0, qt = 0;
  const pi = clamp(Math.floor(px / CELL), 0, GW - 1), pj = clamp(Math.floor(py / CELL), 0, GH - 1);
  const seed = (i, j) => { if (i < 0 || j < 0 || i >= GW || j >= GH) return; const k = j * GW + i; if (!blocked[k] && dist[k] === 32767) { dist[k] = 0; queue[qt++] = k; } };
  if (!blocked[pj * GW + pi]) seed(pi, pj); else for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) seed(pi + di, pj + dj);
  while (qh < qt) {
    const k = queue[qh++], i = k % GW, j = (k / GW) | 0, dk = dist[k];
    for (const [di, dj] of DIRS) {
      const ni = i + di, nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= GW || nj >= GH) continue;
      const nk = nj * GW + ni;
      if (blocked[nk] || dist[nk] !== 32767) continue;
      if (di && dj && (blocked[j * GW + ni] || blocked[nj * GW + i])) continue;
      dist[nk] = dk + 1; queue[qt++] = nk;
    }
  }
}
function flowDir(x, y) {
  const i = clamp(Math.floor(x / CELL), 0, GW - 1), j = clamp(Math.floor(y / CELL), 0, GH - 1);
  let best = dist[j * GW + i], bi = -1, bj = -1;
  for (const [di, dj] of DIRS) {
    const ni = i + di, nj = j + dj;
    if (ni < 0 || nj < 0 || ni >= GW || nj >= GH) continue;
    const nk = nj * GW + ni, nd = dist[nk];
    if (nd >= best || blocked[nk]) continue;
    if (di && dj && (blocked[j * GW + ni] || blocked[nj * GW + i])) continue;
    best = nd; bi = ni; bj = nj;
  }
  if (bi < 0) return null;
  const dx = (bi + .5) * CELL - x, dy = (bj + .5) * CELL - y, l = Math.hypot(dx, dy) || 1;
  return [dx / l, dy / l];
}

/* ---------- audio + haptics ---------- */
let lastShot = 0;
const tone = (...a) => LOD.tone(...a);
const sfx = {
  shot(sil) { const n = performance.now(); if (n - lastShot < 90) return; lastShot = n; if (sil) LOD.noise(.05, .12, 0, 1800, 'bandpass'); else tone(380, .06, 'square', .025, -250); },
  stab() { LOD.noise(.08, .2, 0, 3000, 'highpass'); tone(900, .05, 'sawtooth', .03, -500); },
  spray() { LOD.noise(.09, .1, 0, 4000, 'highpass'); },
  hit() { tone(140, .07, 'sawtooth', .04, -60); },
  kill() { tone(220, .12, 'sawtooth', .05, -150); LOD.haptic('light'); },
  hurt() { tone(120, .22, 'square', .07, -70); LOD.haptic('heavy'); },
  pick() { tone(520, .08, 'triangle', .06); tone(780, .1, 'triangle', .06, 0, .08); LOD.haptic('medium'); },
  ring() { tone(880, .14, 'sine', .06); tone(880, .14, 'sine', .06, 0, .22); LOD.haptic('warning'); },
  good() { tone(523, .1, 'triangle', .06); tone(659, .1, 'triangle', .06, 0, .1); tone(784, .16, 'triangle', .06, 0, .2); LOD.haptic('success'); },
  bad() { tone(200, .25, 'sawtooth', .06, -120); LOD.haptic('error'); },
  splash() { LOD.noise(.3, .3, 0, 900, 'lowpass'); tone(300, .2, 'sine', .05, -200); },
  skid() { LOD.noise(1.1, .35, 0, 2600, 'bandpass'); tone(90, .9, 'sawtooth', .07, 260); tone(140, .7, 'square', .03, 300, .3); }
};

/* ---------- state ---------- */
const rain = Array.from({ length: 150 }, () => ({ x: Math.random(), y: Math.random(), s: rand(.7, 1.3) }));
const isFurn = walls.filter(w => w.f);

function mkZ(type, x, y, alert) {
  const T = { n: { hp: 2, r: 13, sp: 70, pts: 100 }, r: { hp: 1, r: 11, sp: 135, pts: 150 }, t: { hp: 9, r: 20, sp: 46, pts: 400 }, g: { hp: 3, r: 13, sp: 175, pts: 500 } }[type];
  const z = { type, x, y, hp: T.hp, max: T.hp, r: T.r, sp: T.sp * rand(.9, 1.1), pts: T.pts, alert: !!alert, hx: x, hy: y, wt: 0, ang: rand(0, 6.28), mv: false, hit: 0, stag: 0, dead: false, wob: rand(0, 6), foam: 0 };
  if (G && G.finalMin) z.sp *= CFG.FINAL_SPEED;
  return z;
}
const item = (kind, em, name, x, y, o) => Object.assign({ kind, em, name, x, y, got: false }, o || {});

function init(g) {
  G = g;
  const hp = Math.min(CFG.MAX_HP, CFG.MAX_HP + LOD.charMod('extraHp', 0));
  Object.assign(G, {
    killScore: 0, gearScore: 0, callScore: 0, eggScore: 0, maxHp: CFG.MAX_HP, hp, noise: 0, thunder: rand(8, 18),
    p: { x: 330, y: 330, r: 12, face: 0, inv: 0, stun: 0, boost: 0, fire: 0, moving: false, slip: 0, svx: 0, svy: 0, pants: false, pull: 0, pantsCd: 4, swing: 0, freeze: 0 },
    z: [], b: [], kids: [], items: [], gear: 0, spawnT: 3, flowT: 0, hintT: 0, carMsgT: 0, carProg: 0,
    ext: CFG.EXT_CHARGE, itemT: CFG.ITEM_EVERY, noiseSpawnT: 3, fridgeT: -1, mudCd: 0, coinT: rand(10, 16), catT: rand(18, 26), cat: null,
    eggs: EGG_SPOTS.map(([x, y]) => ({ x, y, got: false, prog: 0 })), van: null, flyers: [], skids: [],
    stats: { kills: 0, hugs: 0, noiseFull: false, smooth: false, tank: false, gold: false, callDone: false, melee: 0, beers: 0, maxBeer: 0, egg: false },
    sq: { on: false, ramp: null, lvl: 1, waveT: 0, waves: 0, kills: 0, killScore: 0, surv: 0, acc: 0 }, lock: null
  });
  INDOOR_Z.forEach(([x, y]) => G.z.push(mkZ('n', x, y, false)));
  G.z.push(mkZ('g', 360, 830, false));
  YARD_Z.forEach(([x, y], i) => G.z.push(mkZ(i % 2 ? 'r' : 'n', x, y, false)));
  G.z.push(mkZ('t', 1480, 330, false));
  G.kids.push({ x: 520, y: 320, r: 10, em: '🧒', cd: 0, healCd: 0, say: 'Where are you going?!', sayT: 3.5, ang: 0 });
  G.kids.push({ x: 650, y: 300, r: 10, em: '👧', cd: 1.5, healCd: 0, say: '', sayT: 0, ang: 2 });
  ITEM_DEFS.forEach(d => G.items.push(item('gear', d.em, d.name, d.x, d.y, { snus: !!d.snus })));
  PIZZA_SPOTS.slice().sort(() => Math.random() - .5).slice(0, 2).forEach(([x, y]) => G.items.push(item('pizza', '🍕', 'Pizza', x, y)));
  G.items.push(item('shoes', '👟', 'Fast shoes', SHOES_SPOT[0], SHOES_SPOT[1]));
  const en = pick(ENERGY_SPOTS); G.items.push(item('energy', '⚡', 'Energy drink', en[0], en[1]));
  for (const id of ['knife', 'extinguisher']) if (!LOD.hasWeapon(id)) G.items.push(item('weapon', LOD.WEAPONS[id].em, LOD.WEAPONS[id].name, WEAPON_SPOTS[id][0], WEAPON_SPOTS[id][1], { wid: id }));
  if (LOD.weak() === 'packages') PACKAGES.forEach(([x, y]) => G.items.push(item('package', '📦', 'Package', x, y)));
  computeFlow(G.p.x, G.p.y);
}

/* ---------- game logic ---------- */
function hurt(z) {
  const p = G.p; if (p.inv > 0 || G.mode !== 'play') return;
  if (LOD.tryShield()) { p.inv = 1; burst(p.x, p.y, '#f5c242', 12); tone(1200, .1, 'square', .05); const dx = p.x - z.x, dy = p.y - z.y, l = Math.hypot(dx, dy) || 1; moveE(z, -dx / l * 30, -dy / l * 30); return; } // Löken's shield
  G.hp--; p.inv = 1.3; G.shake = 9; for (const it of G.items) it.prog = 0; G.noise = Math.min(100, G.noise + 6); LOD.comboBreak(); sfx.hurt();
  const dx = p.x - z.x, dy = p.y - z.y, l = Math.hypot(dx, dy) || 1; moveE(p, dx / l * 22, dy / l * 22);
  burst(p.x, p.y, '#e5484d', 8);
  if (G.hp <= 0) LOD.finish(G.sq.on, 'down'); // dying in the sidequest still counts as made it
}
function kill(z, melee) {
  z.dead = true; G.stats.kills++;
  const mult = LOD.combo();
  const lvlMul = G.sq.on ? 1 + (G.sq.lvl - 1) * CFG.SQ.killPtsStep : 1; // kill points grow with difficulty
  const pts = Math.round(z.pts * mult * lvlMul * (melee ? CFG.MELEE_BONUS : 1));
  if (melee) G.stats.melee++;
  if (G.sq.on) { G.sq.killScore += pts; G.sq.kills++; } else G.killScore += pts; G.score += pts;
  pop(z.x, z.y - 18, '+' + pts + (melee ? ' MELEE' : ''), z.type === 'g' ? '#f5c242' : melee ? '#ff8a8a' : '#fff');
  burst(z.x, z.y, z.type === 'g' ? '#f5c242' : '#5f8f4a', 9); sfx.kill();
  if (z.type === 't') { G.stats.tank = true; toast('Lag zombie down! 🔨'); }
  if (z.type === 'g') { G.stats.gold = true; toast('GOLDEN ZOMBIE! +' + pts + ' 🥇'); }
}
function damage(z, n, melee) {
  z.hp -= n; z.hit = .12; z.stag = .06; sfx.hit();
  if (z.hp <= 0 && !z.dead) kill(z, melee);
}
function alertAll(indoorOnly) {
  for (const z of G.z) if (!z.dead && !z.alert && z.type !== 'g' && (!indoorOnly || z.x < 1100)) z.alert = true;
}
function addNoise(n) {
  G.noise = Math.min(100, G.noise + n);
  if (G.noise >= 100 && !G.stats.noiseFull) {
    G.stats.noiseFull = true; alertAll(true); G.noise = 65; G.shake = 6;
    toast('TOO LOUD! The whole house is awake!', 3);
  }
}
function alertNear(x, y, r) { for (const z of G.z) if (!z.dead && z.type !== 'g' && Math.hypot(z.x - x, z.y - y) < r && !z.alert) { z.alert = true; pop(z.x, z.y - 22, '!', '#e5484d'); } }
function wander(z, dt, k) {
  z.wt -= dt;
  if (z.wt <= 0) { z.ang = rand(0, 6.28); z.wt = rand(1, 3); z.mv = Math.random() < .6; }
  if (Math.hypot(z.x - z.hx, z.y - z.hy) > 70) { z.ang = Math.atan2(z.hy - z.y, z.hx - z.x); z.mv = true; }
  if (z.mv) moveE(z, Math.cos(z.ang) * z.sp * .3 * k * dt, Math.sin(z.ang) * z.sp * .3 * k * dt);
}
function updZ(z, dt) {
  const p = G.p, d = Math.hypot(p.x - z.x, p.y - z.y);
  if (z.hit > 0) z.hit -= dt;
  if (z.stag > 0) { z.stag -= dt; return; }
  if (z.type === 'g') {
    if (d < 260) {
      let ax = (z.x - p.x) / (d || 1), ay = (z.y - p.y) / (d || 1);
      const w = Math.sin(G.t * 3 + z.wob) * .7, vx = ax - ay * w, vy = ay + ax * w, vl = Math.hypot(vx, vy) || 1;
      moveE(z, vx / vl * z.sp * dt, vy / vl * z.sp * dt);
    } else wander(z, dt, 1.2);
    return;
  }
  if (!z.alert) {
    const wake = 150 + G.noise * 2.2;
    if (d < wake && (d < 110 || los(z.x, z.y, p.x, p.y))) { z.alert = true; pop(z.x, z.y - 22, '!', '#e5484d'); }
    else { wander(z, dt, 1); return; }
  }
  let dx, dy;
  if (d < 220 && los(z.x, z.y, p.x, p.y)) { dx = p.x - z.x; dy = p.y - z.y; }
  else { const v = flowDir(z.x, z.y); if (v) { dx = v[0]; dy = v[1]; } else { dx = p.x - z.x; dy = p.y - z.y; } }
  const l = Math.hypot(dx, dy) || 1;
  moveE(z, dx / l * z.sp * dt, dy / l * z.sp * dt);
  if (d < z.r + p.r + 2) hurt(z);
}
const kidMul = () => Math.min(CFG.KIDS.max, 1 + Math.floor(G.t / CFG.KIDS.every) * CFG.KIDS.step); // kids wake up
function updKid(k, dt) {
  const p = G.p;
  if (k.sayT > 0) k.sayT -= dt;
  if (k.healCd > 0) k.healCd -= dt;
  if (k.cd > 0) {
    k.cd -= dt; k.ang += dt * .5;
    moveE(k, Math.cos(k.ang) * 30 * dt, Math.sin(k.ang) * 30 * dt);
  } else if (p.x > 1110) {
    if (k.x < 1060) { const v = flowDir(k.x, k.y); if (v) moveE(k, v[0] * 70 * kidMul() * dt, v[1] * 70 * kidMul() * dt); }
    if (k.sayT <= 0 && Math.random() < dt * .25) { k.say = 'Mum said no going outside!'; k.sayT = 2.5; }
  } else {
    const d = Math.hypot(p.x - k.x, p.y - k.y);
    let v;
    if (d < 160 && los(k.x, k.y, p.x, p.y)) { v = [(p.x - k.x) / (d || 1), (p.y - k.y) / (d || 1)]; } else v = flowDir(k.x, k.y);
    if (v) moveE(k, v[0] * 74 * kidMul() * dt, v[1] * 74 * kidMul() * dt);
    if (d < k.r + p.r + 4) {
      p.stun = .9; k.cd = 5.5; k.say = pick(['Daddy!!', 'Take me with you!', 'I am hungry!', 'Is that a zombie?!', 'Can I hold the gun?']); k.sayT = 2;
      G.stats.hugs++; addNoise(14); tone(300, .12, 'sine', .05, 120); LOD.haptic('medium');
      const heal = LOD.perk('hugHeal', 1);
      if (G.hp < G.maxHp && k.healCd <= 0) { // hugs heal
        k.healCd = CFG.HUG_HEAL_CD; G.hp = Math.min(G.maxHp, G.hp + heal);
        pop(p.x, p.y - 22, '🫂 +' + heal + ' ❤️', '#ff8fb0'); burst(p.x, p.y, '#ff8fb0', 10);
        if (heal > 1) LOD.abilityCallout('Loyalty! The hug gives +' + heal + ' hearts 🤝');
      } else pop(p.x, p.y - 22, '🫂 HUG!', '#f5a524');
    }
  }
  if (k.x > 1080) k.x = 1080;
  if (G.mode === 'play' && k.sayT <= 0 && k.cd <= 0 && Math.random() < dt * .08) { k.say = pick(['Where are you going?', 'Why is it so dark?', 'Mum is asleep!']); k.sayT = 2; }
}

/* ---------- weapons: hold the fire button; aim is automatic ---------- */
function target(range) {
  const p = G.p; let tgt = null, td = range;
  for (const z of G.z) if (!z.dead) { const d = Math.hypot(z.x - p.x, z.y - p.y) - (z.r || 0); if (d < td && los(p.x, p.y, z.x, z.y)) { tgt = z; td = d; } }
  return tgt;
}
function useWeapon(dt, firing) {
  const p = G.p, w = LOD.weapon();
  if (w.kind !== 'spray' || !firing) G.ext = Math.min(CFG.EXT_CHARGE, G.ext + CFG.EXT_REGEN * dt);
  const range = w.kind === 'gun' ? w.range * LOD.perk('range') : w.range;
  const tgt = target(range + 40);
  if (tgt) p.face = Math.atan2(tgt.y - p.y, tgt.x - p.x);
  if (!firing || p.fire > 0) return;
  if (w.kind === 'gun') {
    p.fire = w.rate / LOD.perk('fireRate');
    const a = tgt && Math.hypot(tgt.x - p.x, tgt.y - p.y) <= range + tgt.r ? Math.atan2(tgt.y - p.y, tgt.x - p.x) : p.face;
    G.b.push({ x: p.x + Math.cos(a) * 16, y: p.y + Math.sin(a) * 16, vx: Math.cos(a) * 640, vy: Math.sin(a) * 640, life: range / 640 + .05, gold: LOD.perk('range') > 1 });
    addNoise(w.noise); sfx.shot(w.silenced);
  } else if (w.kind === 'melee') {
    p.fire = w.rate / LOD.perk('fireRate'); p.swing = .16; sfx.stab();
    const z = target(w.range);
    if (z) { damage(z, w.dmg, true); burst(z.x, z.y, '#c33', 5); const dx = z.x - p.x, dy = z.y - p.y, l = Math.hypot(dx, dy) || 1; moveE(z, dx / l * 14, dy / l * 14); }
  } else if (w.kind === 'spray') {
    p.fire = w.rate;
    if (G.ext < 4) { if (!G.flags.extEmpty) { G.flags.extEmpty = true; pop(p.x, p.y - 30, 'Empty! Recharging…', '#93a7b6'); } return; }
    G.flags.extEmpty = false; G.ext -= CFG.EXT_USE * w.rate; addNoise(w.noise * w.rate * 3); sfx.spray();
    for (let i = 0; i < 3; i++) { const a = p.face + rand(-.4, .4), sp = rand(160, 260); G.parts.push({ x: p.x + Math.cos(a) * 14, y: p.y + Math.sin(a) * 14, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: .45, c: '#eef6ff' }); }
    for (const z of G.z) {
      if (z.dead) continue;
      const dx = z.x - p.x, dy = z.y - p.y, d = Math.hypot(dx, dy); if (d > w.range + z.r) continue;
      let da = Math.atan2(dy, dx) - p.face; da = Math.atan2(Math.sin(da), Math.cos(da)); if (Math.abs(da) > .5) continue;
      moveE(z, dx / (d || 1) * 7, dy / (d || 1) * 7); z.stag = .12; z.alert = true;
      z.foam += w.rate; if (z.foam >= .4) { z.foam = 0; damage(z, w.dmg, false); }
    }
  }
}
function spawnZ(force) {
  const alive = G.z.filter(z => !z.dead).length; if (alive > (force ? 26 : 16)) return;
  const p = G.p;
  for (let tries = 0; tries < 6; tries++) {
    const side = Math.floor(Math.random() * 3);
    const x = side === 0 ? 1585 : rand(1150, 1585), y = side === 0 ? rand(40, 960) : side === 1 ? 15 : 985;
    if (Math.hypot(x - p.x, y - p.y) > 350) { G.z.push(mkZ(Math.random() < .4 ? 'r' : 'n', x, y, true)); return; }
  }
}
function ambush(n) {
  const p = G.p, spots = INDOOR_Z.concat(YARD_Z).filter(([x, y]) => { const d = Math.hypot(x - p.x, y - p.y); return d > 230 && d < 560; });
  for (let i = 0; i < n && spots.length; i++) {
    const [x, y] = spots.splice(Math.floor(Math.random() * spots.length), 1)[0];
    G.z.push(mkZ(i === 1 ? 'r' : 'n', x + rand(-15, 15), y + rand(-15, 15), true));
  }
}
function freeSpot(minX, maxX) {
  for (let tries = 0; tries < 20; tries++) {
    const x = rand(minX, maxX), y = rand(130, 870);
    if (!pointInWalls(x, y, 24) && Math.hypot(x - G.p.x, y - G.p.y) > 160) return [x, y];
  }
  return null;
}
function popUpItem() { // special items appear around the map
  const k = pick(['shoes', 'energy', 'pizza', 'shoes', 'energy']);
  const sp = freeSpot(130, 1560); if (!sp) return;
  const def = { shoes: ['👟', 'Fast shoes'], energy: ['⚡', 'Energy drink'], pizza: ['🍕', 'Pizza'] }[k];
  G.items.push(item(k, def[0], def[1], sp[0], sp[1], { life: CFG.ITEM_LIFE }));
  pop(sp[0], sp[1] - 24, 'NEW!', '#46c28a');
}
function collectItem(it) {
  it.got = true; const p = G.p;
  if (it.kind === 'gear') {
    G.gear++; G.gearScore += 200; G.score += 200; sfx.pick(); pop(it.x, it.y - 20, '+200', '#f5a524');
    toast((it.em ? it.em + ' ' : '') + it.name + '! ' + G.gear + '/5', 1.8);
    if (G.gear === 5) toast('All gear! Get to the van 🚐', 3);
    else if (Math.random() < .85) { ambush(2); pop(p.x, p.y - 34, 'They heard that!', '#e5484d'); }
    if (G.gear === 2 && !G.stats.callDone) { G.stats.callDone = true; LOD.after(1.5, startCall); } // bonus moment: the wife calls
  } else if (it.kind === 'pizza') {
    G.score += CFG.PIZZA_PTS; G.killScore += CFG.PIZZA_PTS; pop(it.x, it.y - 20, '+' + CFG.PIZZA_PTS + ' 🍕', '#fff'); sfx.pick();
  } else if (it.kind === 'shoes') {
    p.boost = Math.max(p.boost, CFG.SHOES_TIME); p.boostMul = CFG.SHOES_SPEED; pop(it.x, it.y - 20, 'FAST SHOES!', '#46c28a'); sfx.pick(); toast('👟 Fast shoes! ' + CFG.SHOES_TIME + ' s of speed', 2);
  } else if (it.kind === 'energy') {
    p.boost = Math.max(p.boost, CFG.ENERGY_TIME); p.boostMul = CFG.ENERGY_SPEED; pop(it.x, it.y - 20, 'SPEED!', '#f5c242'); sfx.pick(); toast('⚡ Energy drink! Faster for ' + CFG.ENERGY_TIME + ' s', 2);
  } else if (it.kind === 'weapon') {
    sfx.good(); if (!LOD.unlockWeapon(it.wid)) toast(it.em + ' already in your loadout', 2);
  } else if (it.kind === 'silencer') {
    sfx.good(); LOD.unlockWeapon('silencer');
  } else if (it.kind === 'coin') {
    G.score += 100; G.killScore += 100; pop(it.x, it.y - 18, '+100 🪙', '#f5c242'); tone(1568, .06, 'square', .04);
  } else if (it.kind === 'package') {
    p.freeze = 1.3; addNoise(6); tone(500, .1, 'square', .05); tone(400, .14, 'square', .05, 0, .12);
    pop(it.x, it.y - 22, '📦 SIGN HERE!', '#e5484d');
    if (!G.flags.pkg) { G.flags.pkg = true; LOD.weakCallout('Must... sign... for the package 📦'); }
  }
}

/* ---------- weaknesses ---------- */
function nearFurniture(p, pad) {
  for (const w of isFurn) { const cx = clamp(p.x, w.x, w.x + w.w), cy = clamp(p.y, w.y, w.y + w.h); if (Math.hypot(p.x - cx, p.y - cy) < p.r + pad) return true; }
  return false;
}
function updWeakness(dt, mv) {
  const p = G.p, wk = LOD.weak(), inside = p.x < 1110;
  if (wk === 'pants') {
    if (p.pants) {
      if (mv.len < .1) { p.pull += dt; if (p.pull >= .8) { p.pants = false; p.pantsCd = 8; pop(p.x, p.y - 26, 'PANTS UP! 👖', '#46c28a'); tone(700, .08, 'square', .05, 300); } }
      else p.pull = 0;
    } else {
      p.pantsCd -= dt;
      if (p.pantsCd <= 0 && mv.len > .3 && nearFurniture(p, 6) && Math.random() < .5) {
        p.pants = true; p.pull = 0; p.pantsCd = 3; addNoise(4); tone(400, .3, 'sawtooth', .05, -250);
        pop(p.x, p.y - 26, '👖 PANTS DOWN!', '#ff8fb0');
        if (!G.flags.pants) { G.flags.pants = true; LOD.weakCallout('Pants down! Stand still to pull them up 👖'); }
      } else if (p.pantsCd <= 0) p.pantsCd = .4;
    }
  }
  if (wk === 'jungle' && !inside && !G.flags.jungle) { G.flags.jungle = true; LOD.weakCallout('The garden is a jungle. You are slower out here 🌲'); }
  if (wk === 'coins') {
    G.coinT -= dt;
    if (G.coinT <= 0) {
      G.coinT = rand(10, 16); addNoise(12); LOD.tone(1568, .05, 'square', .05); LOD.tone(2093, .08, 'square', .04, 0, .06);
      G.items.push(item('coin', '🪙', 'Coin', p.x + rand(-6, 6), p.y + 12, { life: 12, delay: 1 }));
      pop(p.x, p.y - 26, 'clink clink 🪙', '#f5c242');
      if (!G.flags.coins) { G.flags.coins = true; LOD.weakCallout('Coins fall out of your pockets. Zombies hear it 🪙'); }
    }
  }
  if (wk === 'cat') {
    G.catT -= dt;
    if (G.catT <= 0 && inside && !G.cat) {
      G.catT = rand(20, 30); const a = rand(0, 6.28);
      G.cat = { x: p.x, y: p.y, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, t: 2.4, r: 8 };
      addNoise(22); tone(700, .2, 'sine', .08, 450); tone(1100, .22, 'sine', .07, -520, .18);
      if (!G.flags.cat) { G.flags.cat = true; LOD.weakCallout('The cat bolts through the house! 🐈'); }
    }
    if (G.cat) {
      const c = G.cat; c.t -= dt; const ox = c.x, oy = c.y; moveE(c, c.vx * dt, c.vy * dt);
      if (Math.abs(c.x - ox - c.vx * dt) > 1 || Math.abs(c.y - oy - c.vy * dt) > 1) { const a = rand(0, 6.28); c.vx = Math.cos(a) * 260; c.vy = Math.sin(a) * 260; }
      alertNear(c.x, c.y, 140);
      if (Math.random() < dt * 4) { G.noise = Math.min(99, G.noise + 2); LOD.noise(.05, .08, 0, 3000, 'highpass'); }
      if (c.t <= 0) G.cat = null;
    }
  }
}

/* ---------- fridge, mud, eggs, items over time ---------- */
function updWorld(dt, mv) {
  const p = G.p;
  // fridge: one beer when you arrive, one more every 2 s you stay
  const atF = Math.hypot(p.x - FRIDGE.x, p.y - FRIDGE.y) < 42;
  if (atF) {
    if (G.fridgeT < 0) { G.fridgeT = 0; takeBeer(); }
    else { G.fridgeT += dt; if (G.fridgeT >= CFG.BEER_EVERY) { G.fridgeT = 0; takeBeer(); } }
  } else G.fridgeT = -1;
  // mud puddles: slide
  if (G.mudCd > 0) G.mudCd -= dt;
  if (!p.slip && G.mudCd <= 0 && mv.len > .2) for (const [x, y, rx, ry] of MUD) {
    const dx = (p.x - x) / rx, dy = (p.y - y) / ry;
    if (dx * dx + dy * dy < 1) {
      p.slip = .9; G.mudCd = 1.6; const sp = 150 * mv.len; p.svx = mv.x / mv.len * sp * 1.4; p.svy = mv.y / mv.len * sp * 1.4;
      pop(p.x, p.y - 24, 'SPLASH! 💦', '#8fc6ff'); sfx.splash(); addNoise(6); for (let i = 0; i < 8; i++) G.parts.push({ x: p.x, y: p.y + 8, vx: rand(-80, 80), vy: rand(-90, 10), t: .5, c: '#6b4a2b' });
      if (!G.flags.mud) { G.flags.mud = true; toast('Mud! You slide 💦', 1.8); }
      break;
    }
  }
  // easter egg: same 3 spots for every fighter, only visible up close, hold still to collect
  if (!G.egg) for (const e of G.eggs) if (!e.got) {
    const near = Math.hypot(e.x - p.x, e.y - p.y) < 30;
    e.prog = near && mv.len < .2 ? e.prog + dt / 1 : Math.max(0, e.prog - dt * 2);
    if (e.prog >= 1) {
      e.got = true; const n = G.eggs.filter(x => x.got).length, eg = LOD.egg() || { em: '🥚' };
      pop(e.x, e.y - 22, eg.em + ' ' + n + '/3', '#f5c242'); tone(880 + n * 110, .12, 'square', .05);
      if (n === 3) { G.eggScore = LOD.CFG.EGG_BONUS; G.score += G.eggScore; G.stats.egg = true; LOD.eggFound(); }
    }
  }
  // pop-up items, silencer, item lifetimes
  G.itemT -= dt;
  if (G.itemT <= 0) { G.itemT = G.finalMin ? CFG.ITEM_EVERY_FINAL : CFG.ITEM_EVERY; popUpItem(); }
  if (G.t >= CFG.SILENCER_AT && !G.flags.silencer && !LOD.hasWeapon('silencer')) {
    G.flags.silencer = true; G.items.push(item('silencer', '🔇', 'Silencer', SILENCER_SPOT[0], SILENCER_SPOT[1])); toast('🔇 A silencer appeared in the office!', 2.4);
  }
  for (const it of G.items) { if (it.life != null && !it.got) { it.life -= dt; if (it.life <= 0) it.got = true; } if (it.delay) it.delay = Math.max(0, it.delay - dt); }
  // noise pulls extra zombies into the level
  if (G.noise > CFG.NOISE_SPAWN_FROM && !G.sq.on) {
    G.noiseSpawnT -= dt;
    if (G.noiseSpawnT <= 0) {
      G.noiseSpawnT = 4 - 2.8 * (G.noise - CFG.NOISE_SPAWN_FROM) / (100 - CFG.NOISE_SPAWN_FROM); spawnZ(true);
      if (!G.flags.noiseSpawn) { G.flags.noiseSpawn = true; toast('Too loud! More zombies are coming 🧟', 2.4); }
    }
  }
}
function takeBeer() {
  if (LOD.beer()) {
    G.stats.beers++; G.stats.maxBeer = Math.max(G.stats.maxBeer, LOD.G.beer.n);
    pop(FRIDGE.x, FRIDGE.y - 30, '🍺 +1', '#f5c242'); addNoise(3);
  } else if (!G.flags.maxBeer) { G.flags.maxBeer = true; pop(FRIDGE.x, FRIDGE.y - 30, 'Max 3 beers!', '#e5484d'); LOD.after(3, () => { G.flags.maxBeer = false; }); }
}

/* ---------- bonus moment: wife call (own screen) ---------- */
LOD.ui.panel('scr-call',
  '<div class="inner" style="align-items:stretch">' +
  '<div class="phone" aria-hidden="true" style="align-self:center">📱</div>' +
  '<div class="eyebrow" style="text-align:center">Incoming call · Wife</div>' +
  '<h2 id="call-q" style="text-align:center"></h2>' +
  '<div class="timer"><i id="call-bar"></i></div>' +
  '<div id="call-opts" style="display:flex;flex-direction:column;gap:10px"></div></div>', { cls: 'call', nofocus: true });
const CALLS = [
  { q: 'Where are you going at this hour?', good: 'Fetching fresh buns for you, my love.', bad: ['Nowhere. Go back to sleep.', 'To the LAN. Don\'t be mad.'] },
  { q: 'Why is the front door open?', good: 'Wind. I am on it. Sleep tight, you are beautiful.', bad: ['Zombies.', 'Wasn\'t me.'] },
  { q: 'Is that you making all that noise?', good: 'I am tiptoeing so you can sleep, darling.', bad: ['It is the kids!', 'The neighbours\' cat.'] }
];
let callTimer = null;
function startCall() {
  if (G.mode !== 'play') return;
  G.mode = 'call'; LOD.input.clear(); LOD.music.duck(true);
  const c = pick(CALLS); $('#call-q').textContent = '"' + c.q + '"';
  const opts = [{ t: c.good, ok: true }, { t: c.bad[0] }, { t: c.bad[1] }].sort(() => Math.random() - .5);
  const box = $('#call-opts'); box.innerHTML = '';
  opts.forEach(o => { const b = document.createElement('button'); b.className = 'opt'; b.textContent = o.t; b.addEventListener('click', () => answerCall(o.ok)); box.appendChild(b); });
  const bar = $('#call-bar'); bar.style.transition = 'none'; bar.style.width = '100%';
  void bar.offsetWidth; bar.style.transition = 'width 7s linear'; bar.style.width = '0%';
  clearTimeout(callTimer); callTimer = setTimeout(() => answerCall(false, true), 7000);
  LOD.ui.show('scr-call'); sfx.ring();
}
function answerCall(ok, late) {
  if (!G || G.mode !== 'call') return; clearTimeout(callTimer);
  LOD.resume();
  if (ok) { G.stats.smooth = true; G.callScore += 300; G.score += 300; toast('She is melting. +300 💘', 2.6); sfx.good(); }
  else { G.callScore -= 100; G.score = Math.max(0, G.score - 100); addNoise(35); toast(late ? 'Too slow. "I am coming down."' : 'Wrong line. "I am coming down."', 2.8); sfx.bad(); }
}

/* ---------- van loaded: drive off or sidequest (own screen) ---------- */
LOD.ui.panel('scr-choice',
  '<div class="inner"><div class="choice-big" aria-hidden="true">🚐 / 🧟</div>' +
  '<h2 style="text-align:center">Van loaded!</h2>' +
  '<p class="lead" id="choice-text" style="text-align:center;align-self:center"></p>' +
  '<div class="row"><button id="choice-go" class="btn">🚐 Drive off</button><button id="choice-sq" class="btn danger">🧟 Sidequest</button></div>' +
  '<p class="note" style="text-align:center">Drive off = score saved now. Sidequest = keep your score and survive waves for more. Dying keeps everything.</p></div>');
$('#choice-go').addEventListener('click', driveOff);
$('#choice-sq').addEventListener('click', startSidequest);

function missionBonus() {
  const b = []; if (!G.stats.noiseFull) b.push(['Stealth bonus', 500]);
  b.push(['Load bonus (' + mmss(G.t) + ')', Math.max(0, Math.round(CFG.LOAD_BONUS - CFG.LOAD_BONUS_PER_S * G.t))]); // faster = more
  b.push(['Health bonus', G.hp * 100]); return b;
}
function openChoice() {
  G.mode = 'choice'; LOD.input.clear(); G.lock = missionBonus(); $('#btn-pause').hidden = true; $('#btn-fire').hidden = true; $('#weapons').hidden = true;
  $('#choice-text').textContent = 'Score so far: ' + fmt(G.score + G.lock.reduce((a, b) => a + b[1], 0)) + ' · time ' + mmss(G.t) + ' of ' + mmss(LOD.M.maxTime);
  LOD.ui.show('scr-choice'); sfx.good();
}
function driveOff() { if (G.mode !== 'choice') return; LOD.resume(); LOD.finish(true, 'drive'); }
function startSidequest() {
  if (G.mode !== 'choice') return;
  LOD.resume(); $('#btn-fire').hidden = false; $('#weapons').hidden = false;
  G.sq.on = true; G.sq.ramp = LOD.ramp({ every: CFG.SQ.levelEvery, overload: CFG.SQ.overloadLevel }); G.sq.waveT = CFG.SQ.firstWave;
  toast('SIDEQUEST! Survive. OVERLOAD at ' + mmss(LOD.M.maxTime), 3); sfx.bad();
}
function sqSpawn(type, spd) {
  if (G.z.length >= CFG.SQ.maxAlive) return;
  const p = G.p;
  for (let tries = 0; tries < 12; tries++) {
    const a = rand(0, 6.283), d = rand(340, 620), x = clamp(p.x + Math.cos(a) * d, 20, WORLD.w - 20), y = clamp(p.y + Math.sin(a) * d, 20, WORLD.h - 20);
    if (pointInWalls(x, y, 22) || Math.hypot(x - p.x, y - p.y) < 300) continue;
    const z = mkZ(type, x, y, true); z.sp *= spd; G.z.push(z); return;
  }
}
function dropPizza() {
  for (let tries = 0; tries < 10; tries++) {
    const x = rand(1150, 1580), y = rand(40, 960);
    if (!pointInWalls(x, y, 20) && Math.hypot(x - G.p.x, y - G.p.y) > 120) { G.items.push(item('pizza', '🍕', 'Pizza', x, y)); return; }
  }
}
function updSidequest(dt) {
  const S = G.sq, C = CFG.SQ, R = S.ramp;
  if (R.tick(dt)) { S.lvl = R.lvl; if (!R.over) { toast('LEVEL ' + R.lvl + ': faster, more, meaner', 2); sfx.ring(); } }
  if (R.over) { LOD.finish(true, 'overload'); return; }
  S.acc += R.step(C.survivePts, C.survivePtsStep) * dt;
  const whole = Math.floor(S.acc); S.acc -= whole; S.surv += whole; G.score += whole;
  S.waveT -= dt;
  if (S.waveT <= 0) {
    S.waves++; S.waveT = Math.max(C.waveGapMin, R.step(C.waveGap, -C.waveGapStep)) * (G.finalMin ? .7 : 1);
    const n = R.step(C.waveSize, C.waveSizeStep) + (G.finalMin ? 2 : 0);
    const tanks = S.lvl >= C.tankFromLevel ? 1 + Math.floor((S.lvl - C.tankFromLevel) / C.tankEvery) : 0;
    const runner = Math.min(.8, R.step(C.runnerShare, C.runnerShareStep)), spd = R.step(1, C.speedStep);
    for (let i = 0; i < n + tanks; i++) sqSpawn(i < tanks ? 't' : Math.random() < runner ? 'r' : 'n', spd);
    if (C.pizzaEveryWaves && S.waves % C.pizzaEveryWaves === 0) dropPizza();
    pop(G.p.x, G.p.y - 34, 'WAVE ' + S.waves, '#e5484d');
  }
}

/* ---------- badges + result ---------- */
const BADGES = [
  { em: '🥚', name: 'Egg Hunter', t: s => s.egg },
  { em: '⚡', name: 'Overload Survivor', t: s => s.overload },
  { em: '🧟', name: 'Sidequester', t: s => s.sq && !s.overload },
  { em: '🔪', name: 'Butcher', t: s => s.melee >= 5 },
  { em: '🍺', name: 'Three Beers Deep', t: s => s.maxBeer >= 3 },
  { em: '🤫', name: 'Whisper Dad', t: s => s.win && !s.noiseFull },
  { em: '🍯', name: 'Smooth Operator', t: s => s.smooth },
  { em: '⏱️', name: 'Speed Sneaker', t: s => s.win && s.time < 100 },
  { em: '🔨', name: 'Lag Slayer', t: s => s.tank },
  { em: '🥇', name: 'Goldfinger', t: s => s.gold },
  { em: '🫂', name: 'Hug Magnet', t: s => s.hugs >= 3 },
  { em: '📢', name: 'Neighbourhood Alarm', t: s => s.noiseFull },
  { em: '🍖', name: 'Zombie Snack', t: s => !s.win }
];
function onFinish(G) {
  if (G.why === 'overload') { sfx.bad(); toast('⚠️ OVERLOAD! Score saved.', 2.5); }
  else if (G.why === 'drive') { // skid off, zombies fly at the screen
    G.endT = 2.8; sfx.skid(); toast('🚐 GO GO GO!', 2);
    G.van = { x: CAR.x, y: CAR.y, vx: 40, rot: 0, t: 0 };
    G.z.filter(z => !z.dead).sort((a, b) => Math.hypot(a.x - CAR.x, a.y - CAR.y) - Math.hypot(b.x - CAR.x, b.y - CAR.y)).slice(0, 7).forEach((z, i) => { z.dead = true; G.flyers.push({ x: z.x, y: z.y, t: -.15 - i * .18, r: rand(-1, 1), em: z.type === 'g' ? '✨' : '🧟' }); });
  } else { sfx.bad(); toast('You are down. 🧟', 2); }
}
function result(G) {
  const s = G.stats, win = G.win, time = Math.round(G.t), sq = G.sq, over = G.why === 'overload';
  const bonus = win ? (G.lock || missionBonus()) : []; // mission bonus locked when the van was loaded
  const rows = [['Zombie kills (' + (s.kills - sq.kills) + (s.melee ? ', ' + s.melee + ' melee' : '') + ')', G.killScore], ['Gear (' + G.gear + '/5)', G.gearScore]];
  if (G.callScore) rows.push(['Wife call', G.callScore]);
  if (G.eggScore) rows.push(['Easter egg 🥚', G.eggScore]);
  if (sq.on) { rows.push(['Sidequest kills (' + sq.kills + ')', sq.killScore]); rows.push(['Survival (level ' + sq.lvl + ')', sq.surv]); }
  return {
    head: over ? 'OVERLOAD!' : sq.on ? 'Sidequest over' : win ? 'You made it!' : 'Game over',
    lead: over ? 'The horde got too big. You held out the full round. Everything counts.' : sq.on ? 'The van is loaded, but the sidequest ate you. Everything counts.' : win ? 'All five pieces of gear are in the van. The family is still asleep. Probably.' : LOD.otherPlayer() + ' takes your seat at the LAN.',
    rows, bonus,
    stats: { win, time, hugs: s.hugs, noiseFull: s.noiseFull, smooth: s.smooth, tank: s.tank, gold: s.gold, overload: over, sq: sq.on, melee: s.melee, maxBeer: s.maxBeer, egg: s.egg },
    line: over ? 'OVERLOAD after ' + mmss(time) + '.' : sq.on ? 'Sidequest, survived ' + mmss(time) + '.' : win ? 'Made it to the van in ' + mmss(time) + '.' : 'Did not make it.'
  };
}

/* ---------- ambience: kids running in the house, rain + thunder outside ---------- */
const amb = { stepT: 0, giggleT: 3, loopT: 0 };
function thunderSound() {
  LOD.noise(.35, .35, 0, 900); LOD.noise(2.2, .5, .12, 140); LOD.tone(48, 1.6, 'sine', .25, -15, .1);
}
function ambience(dt) {
  const playing = G.mode === 'play', outside = playing && G.p.x >= 1110;
  amb.loopT -= dt;
  if (amb.loopT <= 0) { amb.loopT = .25; LOD.setLoop('rain', outside ? .16 : playing ? .025 : 0, 2600, 'lowpass'); }
  if (!playing || outside || LOD.isMuted()) return;
  const p = G.p; let d = 1e9;
  for (const k of G.kids) d = Math.min(d, Math.hypot(k.x - p.x, k.y - p.y));
  const near = clamp(1 - d / 800, .2, 1);
  amb.stepT -= dt;
  if (amb.stepT <= 0) { amb.stepT = .26 / kidMul() + rand(0, .05); LOD.noise(.05, .22 * near, 0, 420 + rand(0, 160)); LOD.tone(85 + rand(0, 25), .06, 'sine', .14 * near, -20); }
  amb.giggleT -= dt;
  if (amb.giggleT <= 0) { amb.giggleT = rand(3, 7); const f = rand(650, 900); for (let i = 0; i < 4; i++) LOD.tone(f + i * 45, .07, 'triangle', .05 * near, 140, i * .09); }
}
function frame(G, dt) { // every frame, all modes
  for (const d of rain) { d.y += dt * .9 * d.s; d.x -= dt * .08 * d.s; if (d.y > 1) { d.y = 0; d.x = Math.random() * 1.1; } if (d.x < 0) d.x += 1.1; }
  if (G.mode === 'call') LOD.tickFx(dt);
  if (G.mode !== 'pause' && G.mode !== 'result') {
    G.thunder -= dt;
    if (G.thunder <= 0) { G.thunder = rand(10, 24); G.flash = .35; if (G.mode === 'play' && G.p.x >= 1110) thunderSound(); }
    G.flash = Math.max(0, G.flash - dt * .8);
  }
  if (G.van && G.mode === 'ending') { // getaway animation
    const v = G.van; v.t += dt; v.vx += 520 * dt; v.x += v.vx * dt; v.rot = Math.sin(v.t * 9) * .18 * Math.max(0, 1 - v.t / 1.6);
    v.y += Math.sin(v.t * 5) * 30 * dt;
    if (Math.random() < .8) G.skids.push({ x: v.x - 50, y: v.y + 28 + rand(-3, 3) });
    for (const f of G.flyers) f.t += dt;
  }
  ambience(dt);
}

/* ---------- update (only while playing) ---------- */
function update(G, dt) {
  const p = G.p;
  const mv = LOD.input.move();
  let sp = 130 * LOD.charMod('speed', 1) * LOD.perk('speed');
  if (p.boost > 0) { sp *= p.boostMul || 1.35; p.boost -= dt; if (LOD.perk('speed') > 1 && Math.random() < dt * 12) G.parts.push({ x: p.x, y: p.y + 8, vx: rand(-30, 30), vy: rand(-10, 10), t: .3, c: '#c9b28a' }); }
  if (LOD.weak() === 'jungle' && p.x >= 1110) sp *= .8;
  if (p.pants) sp *= .3;
  if (p.stun > 0) { sp *= .35; p.stun -= dt; }
  if (p.freeze > 0) { sp = 0; p.freeze -= dt; }
  if (p.slip > 0) { // sliding in mud: almost no control
    p.slip -= dt; moveE(p, (p.svx + mv.x * sp * .25) * dt, (p.svy + mv.y * sp * .25) * dt); p.svx *= .985; p.svy *= .985;
    if (p.slip <= 0) p.slip = 0;
  } else moveE(p, mv.x * sp * dt, mv.y * sp * dt);
  if (LOD.perk('speed') > 1.1 && mv.len > .5 && Math.random() < dt * 10) G.parts.push({ x: p.x - mv.x * 10, y: p.y + 8, vx: -mv.x * 40, vy: rand(-10, 10), t: .35, c: '#9aa7b2' }); // Jrohn sprint dust
  p.moving = mv.len > .1;
  if (p.inv > 0) p.inv -= dt;
  if (p.swing > 0) p.swing -= dt;
  if (p.moving && !target(LOD.weapon().range + 40)) p.face = Math.atan2(mv.y, mv.x);
  p.fire -= dt;
  useWeapon(dt, LOD.input.fire);
  // flow
  G.flowT -= dt; if (G.flowT <= 0) { G.flowT = .3; computeFlow(p.x, p.y); }
  // bullets
  for (const b of G.b) {
    for (let s = 0; s < 2 && b.life > 0; s++) {
      b.x += b.vx * dt / 2; b.y += b.vy * dt / 2;
      if (pointInWalls(b.x, b.y, 0)) { b.life = 0; break; }
      for (const z of G.z) if (!z.dead && Math.hypot(z.x - b.x, z.y - b.y) < z.r + 3) {
        b.life = 0; burst(b.x, b.y, '#5f8f4a', 3); damage(z, 1, false); break;
      }
    }
    b.life -= dt;
  }
  G.b = G.b.filter(b => b.life > 0);
  // zombies
  for (const z of G.z) if (!z.dead) updZ(z, dt);
  for (let i = 0; i < G.z.length; i++) for (let j = i + 1; j < G.z.length; j++) {
    const a = G.z[i], c = G.z[j]; if (a.dead || c.dead) continue;
    const dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy), m = a.r + c.r - 2;
    if (d > 0 && d < m) { const pu = (m - d) / 2 * .5; a.x -= dx / d * pu; a.y -= dy / d * pu; c.x += dx / d * pu; c.y += dy / d * pu; }
  }
  G.z = G.z.filter(z => !z.dead);
  if (G.mode !== 'play') return;
  for (const k of G.kids) updKid(k, dt);
  updWeakness(dt, mv);
  updWorld(dt, mv);
  // items
  for (const it of G.items) if (!it.got && !it.delay) {
    const near = Math.hypot(it.x - p.x, it.y - p.y) < 30;
    if (it.kind !== 'gear') { if (near) collectItem(it); continue; }
    it.prog = near ? (it.prog || 0) + dt / 1.1 : Math.max(0, (it.prog || 0) - dt * 2);
    if (it.prog >= 1) collectItem(it);
  }
  G.items = G.items.filter(it => !it.got || it.kind === 'gear');
  // van: hold position to load it while the swarm arrives
  const dc = Math.hypot(p.x - CAR.x, p.y - CAR.y);
  if (G.sq.on) { updSidequest(dt); if (G.mode !== 'play') return; }
  else if (dc < 100 && G.gear >= 5) {
    if (G.carProg === 0) { for (let i = 0; i < 4; i++) spawnZ(); toast('Loading the van! Hold on!', 3); }
    G.carProg += dt / 2.5;
    if (G.carProg >= 1) { openChoice(); return; }
  } else {
    G.carProg = Math.max(0, G.carProg - dt * 1.5);
    if (dc < 100) { G.carMsgT -= dt; if (G.carMsgT <= 0) { G.carMsgT = 3; toast('You still need ' + (5 - G.gear) + ' piece(s) of gear', 2); } }
  }
  // noise / spawn / hint
  G.noise = Math.max(0, G.noise - 9 * dt);
  if (p.x > 1115 && !G.sq.on) { G.spawnT -= dt; if (G.spawnT <= 0) { G.spawnT = G.finalMin ? CFG.FINAL_SPAWN : 4.5; spawnZ(G.finalMin); } }
  G.hintT += dt; if (G.hintT > 0.2 && !G.hinted) { G.hinted = true; toast('Drag to move. Hold 🔴 to fight.', 4); }
}
function onFinalMinute(G) { G.itemT = 1; for (let i = 0; i < 3; i++) spawnZ(true); }

/* ---------- drawing ---------- */
function drawSnus(x, y, size, alpha) { // a round blue snus tin
  const r = size * .5;
  ctx.save(); if (alpha != null) ctx.globalAlpha = alpha;
  ctx.fillStyle = '#0b1d47'; ctx.beginPath(); ctx.ellipse(x, y + r * .18, r, r * .82, 0, 0, 7); ctx.fill();
  const g = ctx.createRadialGradient(x - r * .3, y - r * .35, 1, x, y, r); g.addColorStop(0, '#5a8cf0'); g.addColorStop(1, '#173b8c');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, r, r * .8, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '900 ' + Math.round(size * .3) + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('SNUS', x, y + 1);
  ctx.restore();
}
const icon = (it, x, y, size, alpha) => it.snus ? drawSnus(x, y, size, alpha) : em(it.em, x, y, size, alpha);
function drawVan(x, y, rot, glow) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(0, 36, 74, 14, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#e9eef2'; rrect(-66, -34, 132, 62, 10); ctx.fill(); // body
  ctx.fillStyle = '#d3dce3'; rrect(34, -26, 34, 54, 10); ctx.fill();  // cab
  ctx.fillStyle = '#25384a'; rrect(42, -20, 22, 18, 4); ctx.fill();   // windscreen
  ctx.fillStyle = '#25384a'; rrect(-58, -26, 26, 14, 3); ctx.fill(); rrect(-28, -26, 26, 14, 3); ctx.fill(); rrect(2, -26, 26, 14, 3); ctx.fill(); // windows
  ctx.fillStyle = '#1f6fd1'; ctx.fillRect(-66, 2, 132, 7); // stripe
  ctx.font = '400 24px Bungee, Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#1f6fd1'; ctx.fillText('TVK', -14, -3 + 15);
  ctx.fillStyle = '#111'; for (const wx of [-42, 40]) { ctx.beginPath(); ctx.arc(wx, 28, 11, 0, 7); ctx.fill(); ctx.fillStyle = '#777'; ctx.beginPath(); ctx.arc(wx, 28, 4, 0, 7); ctx.fill(); ctx.fillStyle = '#111'; }
  ctx.fillStyle = '#ffe08a'; ctx.fillRect(64, 8, 4, 8); // light
  ctx.strokeStyle = '#000'; ctx.lineWidth = 2; rrect(-66, -34, 132, 62, 10); ctx.stroke();
  ctx.restore();
}
function drawWorld(ctx, G, t) {
  const p = G.p;
  // yard
  ctx.fillStyle = '#15221d'; ctx.fillRect(0, 0, WORLD.w, WORLD.h);
  ctx.fillStyle = '#1b2a24'; for (let i = 0; i < 60; i++) { const gx = (i * 337) % 1600, gy = (i * 211) % 1000; if (gx > 1120 || gx < 90) ctx.fillRect(gx, gy, 3, 12); }
  ctx.fillStyle = '#26332f'; ctx.fillRect(1120, 690, 300, 50);
  for (const [x, y, rx, ry] of MUD) { ctx.fillStyle = '#3d2c1c'; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(140,170,200,.18)'; ctx.beginPath(); ctx.ellipse(x - rx * .25, y - ry * .3, rx * .4, ry * .25, 0, 0, 7); ctx.fill(); }
  // floors
  ctx.fillStyle = '#1d2229'; ctx.fillRect(90, 90, 1030, 820);
  for (const r of ROOMS) {
    ctx.fillStyle = r[4]; ctx.fillRect(r[0], r[1], r[2], r[3]);
    ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.font = '700 13px Barlow, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(r[5], r[0] + 10, r[1] + 8);
  }
  // walls and furniture
  for (const w of walls) {
    if (w.car) continue;
    ctx.fillStyle = w.c; rrect(w.x, w.y, w.w, w.h, w.f ? 6 : 2); ctx.fill();
    if (!w.f) { ctx.fillStyle = '#3a4c5d'; ctx.fillRect(w.x, w.y, w.w, 2); }
    else if (w.em) em(w.em, w.x + w.w / 2, w.y + w.h / 2, Math.min(36, w.h * .8));
  }
  // fridge glow
  ctx.strokeStyle = 'rgba(245,194,66,' + (.25 + .2 * Math.sin(t * 3)) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(FRIDGE.x, FRIDGE.y, 26, 0, 7); ctx.stroke();
  if (G.fridgeT >= 0) { ctx.strokeStyle = '#f5c242'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(FRIDGE.x, FRIDGE.y, 26, -Math.PI / 2, -Math.PI / 2 + G.fridgeT / CFG.BEER_EVERY * 6.283); ctx.stroke(); }
  em('💤', 262 + Math.sin(t * 2) * 3, 150 - Math.abs(Math.sin(t)) * 8, 22, .8);
  // skid marks + van
  ctx.fillStyle = 'rgba(10,10,10,.5)'; for (const s of G.skids) ctx.fillRect(s.x, s.y, 6, 4);
  const carReady = G.gear >= 5;
  if (carReady && !G.van) { ctx.strokeStyle = 'rgba(245,165,36,' + (.5 + .4 * Math.sin(t * 6)) + ')'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(CAR.x, CAR.y, 100, 0, 7); ctx.stroke(); }
  if (G.van) drawVan(G.van.x, G.van.y, G.van.rot); else drawVan(CAR.x, CAR.y, 0);
  // easter egg spots (faint until close)
  const eg = LOD.egg();
  if (eg && !G.egg) for (const e of G.eggs) if (!e.got) {
    const d = Math.hypot(e.x - p.x, e.y - p.y), a = clamp(1 - (d - 60) / 110, 0, 1);
    if (a > 0) { em(eg.em, e.x, e.y + Math.sin(t * 4) * 2, 20, a * .9); if (e.prog > 0) { ctx.strokeStyle = '#f5c242'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(e.x, e.y, 18, -Math.PI / 2, -Math.PI / 2 + e.prog * 6.283); ctx.stroke(); } }
  }
  // items
  for (const it of G.items) if (!it.got) {
    const bob = Math.sin(t * 3 + it.x) * 3, blink = it.life != null && it.life < 3 && Math.floor(t * 8) % 2;
    if (blink) continue;
    if (it.kind === 'gear' || it.kind === 'weapon' || it.kind === 'silencer') { ctx.fillStyle = (it.kind === 'gear' ? 'rgba(245,165,36,' : 'rgba(229,72,77,') + (.18 + .1 * Math.sin(t * 4)) + ')'; ctx.beginPath(); ctx.arc(it.x, it.y, 26, 0, 7); ctx.fill(); }
    icon(it, it.x, it.y + bob, it.kind === 'gear' || it.kind === 'weapon' ? 28 : it.kind === 'coin' ? 16 : 24, it.delay ? .5 : 1);
    if (it.prog > 0) { ctx.strokeStyle = '#f5a524'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(it.x, it.y, 24, -Math.PI / 2, -Math.PI / 2 + Math.min(1, it.prog) * 6.283); ctx.stroke(); }
  }
  if (G.carProg > 0) { ctx.strokeStyle = '#46c28a'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(CAR.x, CAR.y, 100, -Math.PI / 2, -Math.PI / 2 + Math.min(1, G.carProg) * 6.283); ctx.stroke(); }
  // objective arrow (not in the sidequest)
  if (G.mode === 'play' && !G.sq.on) {
    let tg = null, bd = 1e9;
    if (G.gear >= 5) tg = CAR; else for (const it of G.items) if (it.kind === 'gear' && !it.got) { const d = Math.hypot(it.x - p.x, it.y - p.y); if (d < bd) { bd = d; tg = it; } }
    if (tg) {
      const d = Math.hypot(tg.x - p.x, tg.y - p.y);
      if (d > 110) {
        const a = Math.atan2(tg.y - p.y, tg.x - p.x); ctx.save(); ctx.translate(p.x + Math.cos(a) * 38, p.y + Math.sin(a) * 38); ctx.rotate(a);
        ctx.fillStyle = 'rgba(245,165,36,.9)'; ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-5, -6); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill(); ctx.restore();
      }
    }
  }
  // actors sorted by y
  const actors = [];
  for (const z of G.z) actors.push({ y: z.y, f: () => drawZ(z, t) });
  for (const k of G.kids) actors.push({ y: k.y, f: () => drawKid(k) });
  if (!G.van) actors.push({ y: p.y, f: () => drawPlayer(t) });
  if (G.cat) actors.push({ y: G.cat.y, f: () => em('🐈', G.cat.x, G.cat.y, 22) });
  actors.sort((a, b) => a.y - b.y).forEach(a => a.f());
  // bullets (the engine draws particles and popups on top)
  for (const b of G.b) { ctx.fillStyle = b.gold ? '#ffd23f' : '#ffe08a'; ctx.beginPath(); ctx.arc(b.x, b.y, b.gold ? 3.5 : 3, 0, 7); ctx.fill(); }
}
function drawScreen(ctx, G, t) {
  const { W, H, scale } = LOD.view, cam = LOD.cam;
  const [psx, psy] = G.van ? LOD.toScreen(G.van.x, G.van.y) : LOD.toScreen(G.p.x, G.p.y);
  const lit = G.mode === 'menu' ? [W / 2, H / 2] : [psx, psy], L = G.mode === 'menu' ? 1 : LOD.perk('light'); // Wizcudi sees further
  const g = ctx.createRadialGradient(lit[0], lit[1], 110 * scale * L, lit[0], lit[1], 470 * scale * L);
  g.addColorStop(0, 'rgba(4,8,14,0)'); g.addColorStop(1, 'rgba(4,8,14,.8)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // rain (only outside the house)
  ctx.strokeStyle = 'rgba(170,200,230,.35)'; ctx.lineWidth = 1; ctx.beginPath();
  for (const d of rain) {
    const x = d.x * W, y = d.y * H, wx = cam.x + (x - W / 2) / scale, wy = cam.y + (y - H / 2) / scale;
    if (wx > HOUSE.x - 10 && wx < HOUSE.x + HOUSE.w + 20 && wy > HOUSE.y - 10 && wy < HOUSE.y + HOUSE.h + 20) continue;
    ctx.moveTo(x, y); ctx.lineTo(x - 3 * d.s, y + 12 * d.s);
  } ctx.stroke();
  if (G.flash > 0) { ctx.fillStyle = 'rgba(210,225,255,' + G.flash * .5 + ')'; ctx.fillRect(0, 0, W, H); }
  // zombies flying at the screen after the getaway
  for (const f of G.flyers) {
    if (f.t <= 0) continue;
    const [sx, sy] = LOD.toScreen(f.x, f.y), k = Math.min(1, f.t / 1.1), x = sx + (W / 2 - sx) * k, y = sy + (H / 2 - sy) * k - Math.sin(k * Math.PI) * 120;
    ctx.save(); ctx.globalAlpha = Math.max(0, 1 - Math.max(0, f.t - .8) * 3.5); ctx.translate(x, y); ctx.rotate(f.r * f.t * 8);
    ctx.font = (24 + 130 * k * k) + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(f.em, 0, 0); ctx.restore();
  }
}
function drawPlayer(t) {
  const p = G.p, name = LOD.player || 'You';
  if (p.inv > 0 && Math.floor(t * 14) % 2) ctx.globalAlpha = .4;
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(p.x, p.y + 10, 12, 5, 0, 0, 7); ctx.fill();
  const w = LOD.weapon();
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.face + (p.swing > 0 ? (p.swing / .16 - .5) * 1.6 : 0));
  if (w.kind === 'gun') { ctx.fillStyle = '#222b33'; ctx.fillRect(6, -3, 18, 6); ctx.fillStyle = '#58a6ff'; ctx.fillRect(20, -2, w.silenced ? 12 : 6, 4); }
  else { ctx.rotate(Math.PI / 4); em(w.em, 18, 0, 16); }
  ctx.restore();
  // Löken: shield ready ring
  if (LOD.PERKS[(LOD.fighter || {}).id] && LOD.PERKS[LOD.fighter.id].shield && LOD.G.shieldT <= 0) { ctx.strokeStyle = 'rgba(245,194,66,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 6, 0, 7); ctx.stroke(); }
  ctx.fillStyle = p.boost > 0 ? '#f5c242' : '#3d8ee0'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
  const av = LOD.charAvatar(LOD.fighter, 64);
  if (av) ctx.drawImage(av, p.x - 14, p.y - 15, 28, 28); else em('😬', p.x, p.y - 1, 18);
  if (p.pants) em('👖', p.x, p.y + 14, 14);
  if (LOD.G.beer && LOD.G.beer.n) em('🍺', p.x + 14, p.y - 12, 11);
  ctx.globalAlpha = 1;
  ctx.font = '700 12px Barlow, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = 3;
  ctx.strokeText(name, p.x, p.y - 20); ctx.fillStyle = '#fff'; ctx.fillText(name, p.x, p.y - 20);
}
function drawZ(z, t) {
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(z.x, z.y + z.r * .7, z.r, z.r * .4, 0, 0, 7); ctx.fill();
  const s = (z.type === 't' ? 48 : z.type === 'r' ? 26 : 30) * (z.hit > 0 ? 1.15 : 1), wob = Math.sin(t * 6 + z.wob) * 1.5;
  if (z.type === 'g') { ctx.fillStyle = 'rgba(245,194,66,' + (.25 + .15 * Math.sin(t * 8)) + ')'; ctx.beginPath(); ctx.arc(z.x, z.y, 22, 0, 7); ctx.fill(); }
  em('🧟', z.x + wob, z.y, s, z.alert || z.type === 'g' ? 1 : .8);
  if (z.foam > 0 || z.stag > .08) { ctx.fillStyle = 'rgba(240,248,255,.55)'; ctx.beginPath(); ctx.arc(z.x, z.y - 4, z.r * .9, 0, 7); ctx.fill(); }
  if (z.type === 'g') em('✨', z.x + 14, z.y - 14, 14);
  if (z.type === 't') {
    ctx.fillStyle = '#000a'; ctx.fillRect(z.x - 18, z.y - 34, 36, 5); ctx.fillStyle = '#e5484d'; ctx.fillRect(z.x - 18, z.y - 34, 36 * Math.max(0, z.hp) / z.max, 5);
    ctx.font = '700 10px Barlow, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.textBaseline = 'alphabetic'; ctx.fillText('LAG', z.x, z.y - 38);
  }
}
function drawKid(k) {
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(k.x, k.y + 8, 9, 4, 0, 0, 7); ctx.fill();
  em(k.em, k.x, k.y, 22);
  if (k.healCd <= 0 && G.hp < G.maxHp) em('💗', k.x + 10, k.y - 12, 11, .9);
  if (k.sayT > 0 && k.say) {
    ctx.font = '600 12px Barlow, sans-serif'; const w = ctx.measureText(k.say).width + 14, x = clamp(k.x - w / 2, 4, WORLD.w - w - 4), y = k.y - 42;
    ctx.fillStyle = '#fff'; rrect(x, y, w, 20, 8); ctx.fill(); ctx.fillStyle = '#10202c'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(k.say, x + 7, y + 10);
  }
}
function hud(ctx, G) { // extras on top of the engine HUD (hearts, clock, score, combo)
  const { W } = LOD.view, pad = 12;
  ctx.textBaseline = 'middle';
  if (G.sq.on) { ctx.textAlign = 'center'; ctx.font = '400 13px Bungee, Impact, sans-serif'; ctx.fillStyle = '#e5484d'; ctx.fillText('SIDEQUEST · LVL ' + G.sq.lvl, W / 2, 42); }
  let gi = 0; for (const it of G.items) if (it.kind === 'gear') { icon(it, pad + 12 + gi * 28, 52, 20, it.got ? 1 : .22); gi++; }
  const eg = LOD.egg(); if (eg) { const n = G.eggs.filter(e => e.got).length; if (n) { ctx.textAlign = 'left'; ctx.font = '400 12px Bungee, Impact, sans-serif'; ctx.fillStyle = '#f5c242'; ctx.fillText(eg.em + ' ' + (G.egg ? '✓' : n + '/3'), pad + 4, 78); } }
  const bw = Math.min(120, W * .32), bx = W - pad - bw, by = G.mult > 1 ? 66 : 54;
  ctx.fillStyle = 'rgba(255,255,255,.12)'; rrect(bx, by, bw, 8, 4); ctx.fill();
  ctx.fillStyle = G.noise > 75 ? '#e5484d' : G.noise > 40 ? '#f5a524' : '#46c28a'; rrect(bx, by, bw * G.noise / 100, 8, 4); ctx.fill();
  ctx.textAlign = 'right'; ctx.font = '700 10px Barlow, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.65)'; ctx.fillText('NOISE', bx - 6, by + 4);
  if (LOD.weapon().kind === 'spray') { ctx.fillStyle = 'rgba(255,255,255,.12)'; rrect(bx, by + 14, bw, 6, 3); ctx.fill(); ctx.fillStyle = '#eef6ff'; rrect(bx, by + 14, bw * G.ext / CFG.EXT_CHARGE, 6, 3); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.65)'; ctx.fillText('🧯', bx - 6, by + 17); }
}

/* ---------- register with the engine ---------- */
LOD.mission({
  id: 1, title: 'Sneak Out', unlock: '2026-11-19', until: '2026-11-20', // counts 19 + 20 Nov, final 20 Nov 23:59 cap: 300000, world: WORLD, eggs: true,
  intro: ({ player }) => ({ // group chat on your phone
    kind: 'chat', title: 'LAN SQUAD 🎮', sub: 'Löken, Wizcudi, Jrohn, BigWman, Ljunky, Jonas', button: 'Pack my stuff 🤫',
    lines: [
      { at: 'Yesterday 22:14' },
      { from: 'BigWman', text: 'The spreadsheet for the trip is DONE. Pickup 06:00 sharp. 📊' },
      { from: 'Löken', text: 'Stick together, boys. Nobody bails this year.' },
      { from: 'Wizcudi', text: 'Turn off your lights before you leave. I am serious.' },
      { from: 'Jrohn', text: 'I love this!! Bringing snacks. And pants. Probably.' },
      { from: 'Ljunky', text: 'Bought the dip. And energy drinks. Have you checked the Bitcoin price today?' },
      { from: 'Jonas', text: 'Relax guys. Nothing can go wrong! 😎' },
      { at: 'Today 05:41' },
      { sfx: 'zombie', text: '*GRRRAAAAHHH…*', shake: true, wait: 1900 },
      { from: 'Ljunky', text: 'eh… did anyone else hear that??' },
      { from: 'Wizcudi', text: 'Probably a neighbour. Screaming at a lamp someone left on.' },
      { sfx: 'zombie', text: '*crunch… scratch scratch…*', shake: true, wait: 1500 },
      { from: 'BigWman', text: 'Doesn\'t matter. Pickup in 20 min. GO.' },
      { from: 'You', text: 'Ok. Just pack my stuff before everyone wakes up. Quietly. 🤫' }
    ]
  }),
  outro: (G, { player }) => (G.why === 'drive' || (G.why === 'overload' && G.sq.on)) ? { // phone call while driving the van
    kind: 'call', title: 'LAN SQUAD', sub: 'Calling…', music: 'game', intensity: .75, tbc: 'Next mission unlocks tomorrow.', auto: 2500, button: 'Hang up',
    lines: [
      { from: 'You', text: 'WTF was that, guys?! I am coming to pick you up!' },
      { from: 'Löken', text: 'Hurry. There are things outside my door. 🧟' },
      { from: 'Jonas', text: '…ok, maybe something CAN go wrong.' },
      { from: 'Jrohn', text: 'I love this!!' }
    ]
  } : null,
  brief: {
    card: '<div class="gearline" aria-hidden="true">🎧 ⌨️ 🖥️ 🖱️ <span class="snus">SNUS</span></div><p style="margin-top:8px">Collect all 5 pieces of gear, then load the TVK van in the yard. You have 3 hearts.</p>',
    tips: [
      ['Move:', 'drag a finger anywhere (or WASD). Hold the red 🔴 button to fight (or Space). Aiming is automatic.'],
      ['Weapons:', 'find the 🔪 knife in the kitchen (silent, +50 % points) and the 🧯 extinguisher in the living room. A 🔇 silencer turns up later. Switch above the fire button. Weapons are saved for all missions.'],
      ['Noise:', 'gunshots are loud. Too much noise pulls more zombies into the house.'],
      ['The kids', 'hug you. It slows you down and makes noise, but a hug gives you +1 ❤️.'],
      ['The fridge 🍺:', 'stand still at it for beers. Each beer boosts your abilities for 20 s (max 3).'],
      ['Watch out:', 'mud in the yard makes you slide. Grab 👟 fast shoes and ⚡ energy drinks.'],
      ['Be fast.', 'Load bonus: 100 000 minus 1 000 per second. The final minute gets wild, with more loot.'],
      ['Van loaded?', 'Drive off, or stay for the Sidequest: endless waves, more points per kill. Max 3:00, then OVERLOAD.']
    ]
  },
  badges: BADGES,
  init, update, frame, drawWorld, drawScreen, hud, onFinish, result, onFinalMinute,
  camTarget: G => G.van ? [G.van.x, G.van.y] : G.mode === 'menu' ? [560, 500] : [G.p.x, G.p.y],
  timerText: G => G.sq.on ? mmss(Math.max(0, LOD.M.maxTime - G.t)) : mmss(G.t), // the sidequest counts down
  overloadWin: G => G.sq.on,
  intensity: G => Math.max(G.sq.on ? .55 + G.sq.lvl * .05 : 0, G.noise > 70 ? .5 : 0)
});

window.__m1 = { get G() { return G; }, pointInWalls, computeFlow, dist, blocked, walls, CAR, ITEM_DEFS, CFG, FRIDGE, EGG_SPOTS, MUD, WEAPON_SPOTS, openChoice, startSidequest, driveOff, startCall, answerCall, collectItem }; // test hooks
})();
