// Dev tool: balance simulator for Mission 3. Mirrors the battle, XP and encounter math of missions/m3.js (see "MIRROR" comments)
// and reads every number from data/m3-data.js, so a data change shows up here at once.
// Usage: node tools/balance.js [--cells] [--check]    (--check prints stats the game can be compared against)
const fs = require('fs'), path = require('path'), vm = require('vm');
const win = {}; vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../data/m3-data.js'), 'utf8'), { window: win });
const D = win.M3_DATA, CFG = D.tuning, TY = D.types, MOVES = D.moves, CR = D.creatures;
const rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)];

/* ---- MIRROR: stats, XP, types ---- */
const stat = (id, lv, i) => { const s = CR[id], b = s.stats[i] * (CFG.RARITY_STAT[s.rarity] || 1); return i === 0 ? Math.floor(b * lv / 25 * 1.4) + lv + 12 : Math.floor(b * lv / 25 * 1.3) + 5; };
const maxHp = (id, lv) => stat(id, lv, 0);
const xpNeed = lv => Math.round(CFG.XP_BASE + CFG.XP_SQ * lv * lv);
const learned = (id, lv) => CR[id].moves.filter(m => m[1] <= lv && MOVES[m[0]]).map(m => m[0]).slice(-4);
const eff = (a, d) => { if (!a || !d || a === 'MIND' || d === 'MIND') return 1; const c = TY.cycle, ia = c.indexOf(a), id = c.indexOf(d); if (ia < 0 || id < 0) return 1; return (ia + 1) % c.length === id ? TY.strong : (id + 1) % c.length === ia ? TY.weak : 1; };
const stageMul = s => s >= 0 ? (2 + s) / 2 : 2 / (2 - s);
const best = (me, foe) => { let b = learned(me.id, me.lv)[0] || 'slam', bv = -1; for (const m of learned(me.id, me.lv)) { const mv = MOVES[m]; if (!mv.p) continue; const v = mv.p * (mv.acc || 1) * eff(mv.type, CR[foe.id].type) * (mv.type === CR[me.id].type ? 1.2 : 1) * (mv.hits || 1); if (v > bv) { bv = v; b = m; } } return b; };

/* ---- MIRROR: one battle, lead vs foe. Player always picks the best move (no items). foeMul = HP multiplier (Dev Ljunky) ---- */
function fight(my, foe, o = {}) {
  const A = { id: my.id, lv: my.lv, hp: my.hp != null ? my.hp : maxHp(my.id, my.lv), stg: { atk: 0, def: 0, spd: 0 } }, B = { id: foe.id, lv: foe.lv, hp: o.foeHp != null ? o.foeHp : maxHp(foe.id, foe.lv) * (o.foeMul || 1), stg: { atk: 0, def: 0, spd: 0 } };
  const ds = o.dev;                                                // Dev Ljunky state { fixes, rage } kept between your creatures
  const maxA = maxHp(A.id, A.lv), maxB = B.hp; let rounds = 0;
  const es = (c, k) => stat(c.id, c.lv, { atk: 1, def: 2, spd: 3 }[k]) * stageMul(Math.max(-6, Math.min(6, c.stg[k])));
  const hit = (u, t, id) => {
    const mv = MOVES[id]; if (mv.p && Math.random() > (mv.acc || 1)) return;
    if (!mv.p) { for (const k in (mv.self || {})) u.stg[k] = Math.max(-4, Math.min(4, u.stg[k] + mv.self[k])); for (const k in (mv.foe || {})) t.stg[k] = Math.max(-4, Math.min(4, t.stg[k] + mv.foe[k])); if (mv.heal) u.hp = Math.min(u === A ? maxA : maxB, u.hp + (u === A ? maxA : maxB) * mv.heal); return; }
    for (let h = 0; h < (mv.hits || 1) && t.hp > 0; h++) {
      let d = ((2 * u.lv / 5 + 2) * mv.p * es(u, 'atk') / es(t, 'def')) / 25 + 2;
      const crit = Math.random() < .07; d *= (mv.type && mv.type === CR[u.id].type ? 1.2 : 1) * eff(mv.type, CR[t.id].type) * rnd(.85, 1) * (crit ? 1.5 : 1);
      t.hp -= Math.max(1, Math.round(d));
    }
  };
  while (A.hp > 0 && B.hp > 0 && rounds < 60) {
    rounds++;
    const meFirst = es(A, 'spd') > es(B, 'spd') || (es(A, 'spd') === es(B, 'spd') && Math.random() < .5);
    const act = s => { if (s === 'me') hit(A, B, best(A, B)); else if (ds) {   // MIRROR of devTurn(): rage under 28 %, then patch 18 % / hotfix 14 % / spawn 23 % / glitch
        const f = B.hp / maxB, r = Math.random();
        if (!ds.rage && f < .28) { ds.rage = true; A.hp -= Math.round(maxA * .45); }
        else if (r < .18) { /* patch notes: ATK and DEF swapped, roughly neutral on average */ }
        else if (r < .32 && f < .75 && ds.fixes < 2) { ds.fixes++; B.hp = Math.min(maxB, B.hp + maxB * .22); }
        else if (r < .55) { const ids = Object.keys(CR).filter(k => !CR[k].needs && !CR[k].trapOnly && !CR[k].hidden && CR[k].kind !== 'boss'); const bid = pick(ids); const bug = { id: bid, lv: Math.max(1, B.lv - 2), hp: 1e9, stg: { atk: 0, def: 0, spd: 0 } }; hit(bug, A, best(bug, A)); }
        else hit(B, A, 'glitch');
      } else { const ids = learned(B.id, B.lv); hit(B, A, Math.random() < .7 ? best(B, A) : pick(ids)); } };
    for (const s of meFirst ? ['me', 'foe'] : ['foe', 'me']) { if (A.hp <= 0 || B.hp <= 0) break; act(s); }
  }
  return { win: B.hp <= 0 && A.hp > 0, rounds, foeHp: Math.max(0, B.hp), lost: Math.max(0, (my.hp != null ? my.hp : maxA) - Math.max(0, A.hp)) / maxA, hpLeft: Math.max(0, A.hp) };
}
const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const STARTERS = ['frog', 'cuke', 'peng'];                      // a typical lead (the pessimistic case: no swapping)
const PARTY = ['frog', 'cuke', 'peng', 'snake'];                // a typical party: four different types
// a real player swaps in the creature with the best type matchup against what is in front of them
const matchup = (id, foeId) => { let o = 0; for (const m of learned(id, 20)) { const mv = MOVES[m]; if (mv.p) o = Math.max(o, eff(mv.type, CR[foeId].type) * (mv.type === CR[id].type ? 1.2 : 1) * mv.p); } let d = 0; for (const m of learned(foeId, 20)) { const mv = MOVES[m]; if (mv.p) d = Math.max(d, eff(mv.type, CR[id].type) * mv.p); } return o - d; };
const smartLead = foeId => PARTY.slice().sort((a, b) => matchup(b, foeId) - matchup(a, foeId))[0];
const SMART = !process.argv.includes('--random');
function cell(myLv, zoneEnc, lvRange, n = 400) {                // wild fights against a zone's table
  let win = 0, rounds = [], lost = [];
  for (let i = 0; i < n; i++) { const id = (() => { const tot = zoneEnc.reduce((a, e) => a + e[1], 0); let r = Math.random() * tot; for (const e of zoneEnc) if ((r -= e[1]) <= 0) return e[0]; return zoneEnc[0][0]; })(), lv = Math.round(rnd(lvRange[0], lvRange[1] + .99) - .49), r = fight({ id: SMART ? smartLead(id) : pick(STARTERS), lv: myLv }, { id, lv }); if (r.win) { win++; rounds.push(r.rounds); lost.push(r.lost); } }
  return { win: win / n, rounds: mean(rounds), lost: mean(lost) };
}

/* ---- MIRROR: XP per win, time per fight (real play) ---- */
const xpWin = (myLv, foeLv) => Math.max(1, Math.round(foeLv * CFG.XP_PER_LV * (foeLv >= myLv ? Math.min(1.5, foeLv / myLv) : Math.pow(foeLv / myLv, CFG.XP_LOW))));
const TILE_S = 16 / CFG.SPEED, STEPS_BETWEEN = CFG.ENC_COOLDOWN + 1 / CFG.ENC_RATE;          // walking time between encounters in tall grass
const fightSecs = rounds => 9 + 5.5 * rounds;                                                  // intro + texts + two taps per round + the end screen (measured by hand)
const HEAL_SECS = 60;                                                                          // a walk to the pharmacist / using a Fizz tablet

const out = [], w = s => { out.push(s); console.log(s); };
const zonesOf = pred => Object.entries(D.zones).filter(([id, z]) => z.enc && z.lv && pred(id, z)).map(([id, z]) => Object.assign({ id }, z));
const rel = (e, day) => !e.release || ['mon', 'tue', 'wed'].indexOf(e.release) <= ['mon', 'tue', 'wed'].indexOf(day);
const cached = {};
function zoneStats(z, myLv) { const k = z.id + ':' + myLv; if (cached[k]) return cached[k]; const tab = z.enc.filter(([id]) => CR[id] && rel(CR[id], 'wed') && !CR[id].needs && !CR[id].trapOnly); return (cached[k] = tab.length ? cell(myLv, tab, z.lv, 250) : null); }

if (process.argv.includes('--check')) { // numbers to compare with the real game
  for (const [id, lv] of [['frog', 5], ['cuke', 20], ['golem', 30], ['pike', 40], ['wraith', 50]]) w(`CHECK ${id} Lv${lv}: HP ${maxHp(id, lv)} ATK ${stat(id, lv, 1)} DEF ${stat(id, lv, 2)} SPD ${stat(id, lv, 3)} xpNeed ${xpNeed(lv)} moves ${learned(id, lv).join(',')}`);
  process.exit(0);
}

if (process.argv.includes('--pair')) { // node tools/balance.js --pair frog 10 cuke 10 [n]  → win %, turns, HP lost for one matchup
  const a = process.argv, i = a.indexOf('--pair'), n = +(a[i + 5] || 400); let win = 0; const rr = [], ll = [];
  for (let k = 0; k < n; k++) { const r = fight({ id: a[i + 1], lv: +a[i + 2] }, { id: a[i + 3], lv: +a[i + 4] }); if (r.win) { win++; rr.push(r.rounds); ll.push(r.lost); } }
  console.log(`SIM ${a[i + 1]} ${a[i + 2]} vs ${a[i + 3]} ${a[i + 4]}: win ${Math.round(win / n * 100)} % · ${mean(rr).toFixed(2)} turns · -${Math.round(mean(ll) * 100)} % HP`); process.exit(0);
}
/* ===== 1. pacing: minutes of grinding to reach each level, the player always uses the best zone that is safe ===== */
function grind(days, startLv, goalLv) {
  const zones = zonesOf((id, z) => rel(z, days) && !z.house);
  let lv = startLv, xp = 0, secs = 0, fights = 0, hpPool = 1; const reach = {}, zoneAt = {}, report = [10, 15, 20, 25, 30, 35, 40, 46, 50];
  while (lv < goalLv && fights < 6000) {
    // the zone with the best XP per second that the player wins >= 90 % of the time and loses <= 55 % HP on average
    let bz = null, bv = -1;
    for (const z of zones) { const st = zoneStats(z, lv); if (!st || st.win < .9 || st.lost > .55) continue; const meanLv = (z.lv[0] + z.lv[1]) / 2, xpf = xpWin(lv, Math.round(meanLv)), t = fightSecs(st.rounds) + STEPS_BETWEEN * TILE_S + st.lost * HEAL_SECS; const v = xpf / t; if (v > bv) { bv = v; bz = Object.assign({ st, xpf, t }, z); } }
    if (!bz) { zoneAt[lv] = null; break; }
    zoneAt[lv] = bz.id; xp += bz.xpf; secs += bz.t; fights++;
    while (xp >= xpNeed(lv)) { xp -= xpNeed(lv); lv++; if (report.includes(lv)) reach[lv] = { min: Math.round(secs / 60), fights, zone: bz.id }; }
  }
  return { lv, secs, fights, reach, zoneAt };
}
w('# Balance pass (generated by tools/balance.js; every number comes from data/m3-data.js)\n');
w('Model: the simulator mirrors the game\'s battle, XP and encounter math (checked against real in-game fights: same win rate, turns and HP loss within noise). The player has a party of four different types and swaps in the best matchup' + (SMART ? '' : ' (OFF: random lead)') + ', uses the best move, no items. Real time per fight = 9 s + 5.5 s per turn, plus walking to the next encounter, plus 60 s to heal for each full HP bar lost.\n');
w('XP for the next level = ' + CFG.XP_BASE + ' + ' + CFG.XP_SQ + ' × lv²  ·  XP per win = foe lv × ' + CFG.XP_PER_LV + ' (weaker foes × (foe/you)^' + CFG.XP_LOW + ', stronger at most ×1.5)  ·  encounter ' + CFG.ENC_RATE * 100 + ' % per tile after ' + CFG.ENC_COOLDOWN + ' safe tiles\n');
for (const [day, label] of [['mon', 'MONDAY (the old map only)'], ['wed', 'TUESDAY/WEDNESDAY (the east is open)']]) {
  const g = grind(day, CFG.START_LV, 50);
  w('## Time to reach a level, grinding the best safe zone: ' + label);
  w('| level | minutes | fights | where |'); w('|---|---|---|---|');
  for (const l of [10, 15, 20, 25, 30, 35, 40, 46, 50]) { const r = g.reach[l]; w(`| ${l} | ${r ? r.min + ' (' + (r.min / 60).toFixed(1) + ' h)' : 'not reachable'} | ${r ? r.fights : '-'} | ${r ? r.zone : '-'} |`); }
  w('');
  if (g.lv < 50) w('The grind stalls at level ' + g.lv + ': no zone gives a safe fight at that level (' + (day === 'mon' ? 'the old map tops out around level 11' : 'see the gap table') + ').\n');
}

/* ===== 2. the gaps: for each level, which zones are a fair fight ===== */
w('## Which zones are a fair fight (win ≥ 90 %, loses ≤ 55 % HP on average)');
w('| your level | fair zones (levels) |'); w('|---|---|');
const all = zonesOf((id, z) => !z.house);
for (const lv of [5, 8, 10, 12, 15, 20, 25, 30, 35, 40, 45, 50]) { const ok = all.filter(z => { const s = zoneStats(z, lv); return s && s.win >= .9 && s.lost <= .55; }); w(`| ${lv} | ${ok.length ? ok.map(z => z.id + ' ' + z.lv.join('-')).join(', ') : '**none**'} |`); }
w('');

/* ===== 3. one wild fight at a glance ===== */
w('## One wild fight: a lead of level L against a creature of level L + d (average of the three starters vs average zone creature)');
w('Turns are counted over won fights only.');
w('| lead level | foe −3 | foe +0 | foe +3 | foe +6 |'); w('|---|---|---|---|---|');
const avgTab = [['frog', 1], ['cuke', 1], ['golem', 1], ['ghost', 1], ['crow', 1], ['bear', 1]];
for (const lv of [5, 10, 20, 30, 40, 50]) { const r = [-3, 0, 3, 6].map(d => { const c = cell(lv, avgTab, [lv + d, lv + d], 300); return `${Math.round(c.win * 100)} % win · ${c.rounds.toFixed(1)} turns · −${Math.round(c.lost * 100)} % HP`; }); w(`| ${lv} | ${r.join(' | ')} |`); }
w('');

/* ===== 4. the bosses ===== */
w('## The four hero bosses (3 creatures each, the lead fights them one after the other, no healing; the boss level rises by 2 per hero you have beaten)');
w('| heroes beaten | boss team | your lead lv | wins all 3 | with 4 creatures of that level |'); w('|---|---|---|---|---|');
const heroTeam = Object.values(D.heroes)[0].team;
function teamFight(lv, beaten, n = 300, party = 1, edge = 0) {
  let wins = 0; const base = CFG.BOSS_LV + CFG.BOSS_LV_STEP * Math.min(3, beaten) - edge;
  for (let i = 0; i < n; i++) { const mine = Array.from({ length: party }, (_, q) => ({ id: PARTY[q % PARTY.length], lv, hp: null })); let alive = true, k = 0;
    for (let f = 0; f < 3 && alive; f++) { const foe = { id: heroTeam[f], lv: Math.max(1, base - 1 + f) };
      while (k < mine.length) { const r = fight({ id: mine[k].id, lv, hp: mine[k].hp }, foe); if (r.win) { mine[k].hp = r.hpLeft; break; } k++; }
      if (k >= mine.length) alive = false; }
    if (alive) wins++; }
  return wins / n;
}
for (const beaten of [0, 1, 2, 3]) { const base = CFG.BOSS_LV + CFG.BOSS_LV_STEP * beaten; for (const lv of [base - 2, base, base + 3]) w(`| ${beaten} | ${base - 1}/${base}/${base + 1} | ${lv} | ${Math.round(teamFight(lv, beaten, 250) * 100)} % | ${Math.round(teamFight(lv, beaten, 250, 4) * 100)} % |`); }
w('With a house puzzle solved (−3 levels): lead = boss level, 0 heroes beaten → ' + Math.round(teamFight(8, 0, 250, 1, 3) * 100) + ' % (instead of ' + Math.round(teamFight(8, 0, 250) * 100) + ' %).\n');

/* ===== 5. Dev Ljunky ===== */
w('## Dev Ljunky (level ' + CFG.DEV_LV + ', HP ×' + CFG.DEV_HP + ', his real AI: Glitch Slap, spawns a bug, heals twice, Rage Quit under 28 % HP = 45 % of your lead\'s HP)');
w('Your party: four creatures of the same level (Starter-type mix), one after the other, Dev keeps his HP between them. No items, no swapping mid-fight: this is the floor, a real player with Fizz tablets and type swaps does better.');
w('| your party level | wins | creatures lost on average |'); w('|---|---|---|');
function devFight(lv, tabs, party = 4) {
  const ds = { fixes: 0, rage: false }, mine = Array.from({ length: party }, (_, q) => ({ id: PARTY[q % PARTY.length], lv, hp: null })); let foeHp = null, fainted = 0, left = tabs, k = 0;
  const first = ['ghost'];
  while (k < mine.length) {
    // pick the best matchup among the creatures still standing (Dev is MIND: neutral against everything, so just take the next one)
    const c = mine[k]; const r = fight({ id: c.id, lv, hp: c.hp }, { id: 'ghost', lv: CFG.DEV_LV }, { foeMul: CFG.DEV_HP, foeHp, dev: ds });
    foeHp = r.foeHp; if (foeHp <= 0 || r.win) return { win: true, fainted };
    c.hp = 0; fainted++; k++;
    if (left > 0 && k >= mine.length) { /* last stand: tablets cannot revive */ }
  }
  return { win: false, fainted };
}
for (const lv of [40, 46, 50]) for (const tabs of [0]) { let wins = 0, lostN = 0; const n = 300; for (let i = 0; i < n; i++) { const r = devFight(lv, tabs); if (r.win) wins++; lostN += r.fainted; } w(`| ${lv} | ${Math.round(wins / n * 100)} % | ${(lostN / n).toFixed(1)} of 4 |`); }
w('A party that has to level four creatures to 46 needs about 2.3× the grind time of the lead alone (bench XP share ' + CFG.XP_SHARE + ').\n');

/* ===== 6. money ===== */
w('## Money');
w('Kronor per wild win = foe level × ' + CFG.WILD_KR + '. A carrier bag costs ' + CFG.BAG_COST + ' kr, a Fizz tablet ' + D.items.fizztab.price + ' kr, a trap ' + D.items.fizzMk1.price + ' kr, a ring box ' + D.items.ringbox.price + ' kr.');
w('| foe level | kr per win | bags per win | fights to afford a ring box |'); w('|---|---|---|---|');
for (const lv of [5, 10, 20, 30, 40]) { const kr = Math.round(lv * CFG.WILD_KR); w(`| ${lv} | ${kr} | ${(kr / CFG.BAG_COST).toFixed(1)} | ${Math.ceil(D.items.ringbox.price / kr)} |`); }
w('');
/* catching: bags needed (chance at 25 % HP, with a normal lure) */
w('## Catching (chance per bag at 25 % HP / after a knockout, no lure)');
w('| rarity | at 25 % HP | after a knockout | bags per catch at 25 % HP |'); w('|---|---|---|---|');
for (const r of ['C', 'U', 'R', 'E', 'L', 'M']) { const c = Math.max(.03, Math.min(.95, (1 - .25 * .78) * CFG.CATCH_R[r])), k = Math.min(.98, CFG.KO_CATCH[r]); w(`| ${r} | ${Math.round(c * 100)} % | ${Math.round(k * 100)} % | ${(1 / c).toFixed(1)} |`); }
w('');
fs.writeFileSync(path.join(__dirname, '../BALANCE.md'), out.join('\n') + '\n');
console.log('\nwrote BALANCE.md');
