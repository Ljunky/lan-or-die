/* LAN OR DIE – Mission 3 systems: traps, cemetery (graves + resurrection + grave reward), The Box training board,
   the dealer, the phone, filler shoppers, completion %. All numbers and texts come from data/m3-data.js.
   missions/m3.js calls window.M3_SYSTEMS(K) once with its kernel K (state getters + helpers) and gets these functions back. */
window.M3_SYSTEMS = function (K) {
'use strict';
const { D, CFG, SP, ITEMS, HERO, PARTNERS, T, tc, rel } = K;
const EF = PX.effects, R = D.raw;
const { pick, rand, clamp, fmt } = LOD;
const now = () => Date.now();
const G = () => K.G;

/* ---------- seeded random (stable per player + rotation) ---------- */
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }
const hashStr = str => { let h = 2166136261; for (const ch of String(str)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };

/* ===================== FILLER SHOPPERS (data: fillers) ===================== */
function makeFillers() {
  const F = R.fillers; if (!F) return {};
  const r = rng(hashStr((LOD.player || 'x') + now())), out = {}, names = F.names.slice();
  const skins = ['#eebd96', '#f0c8a8', '#d9a07a', '#c08a68', '#8a5a3a'];
  for (let i = 0; i < F.count && names.length; i++) {
    const name = names.splice(Math.floor(r() * names.length), 1)[0], [style, hair] = F.hair[Math.floor(r() * F.hair.length)];
    let at = null;
    for (let k = 0; k < 60 && !at; k++) { const x = F.area[0] + Math.floor(r() * F.area[2]), y = F.area[1] + Math.floor(r() * F.area[3]); if (K.walkable(...tc(x, y))) at = [x, y]; }
    out['f' + i] = { name, role: 'filler', at: at || [15, 44], area: [F.area[0], F.area[1], F.area[2], F.area[3]], release: F.release, canDie: F.canDie, catchable: F.catchable, likes: F.likes, epitaph: F.epitaph,
      look: { style, hair, top: F.tops[Math.floor(r() * F.tops.length)], legs: F.legs[Math.floor(r() * F.legs.length)], skin: skins[Math.floor(r() * skins.length)] }, lines: { pool: F.lines } };
  }
  return out;
}
function registerFillers() {
  for (const id in (G().fillers || {})) { const f = G().fillers[id]; SP['n_' + id] = { kind: 'npc', ref: id, name: f.name, type: 'MIND', rarity: 'H', stats: [52, 50, 50, 52], moves: [['slam', 1], ['peck', 1]], likes: f.likes, epitaph: f.epitaph }; }
}

/* ===================== TRAPS ===================== */
const trapReady = tr => now() - tr.at >= ITEMS[tr.item].waitMin * 60000 / Math.max(1e-6, K.trapSpeed);
async function placeTrap(id) {
  const g = G(), it = ITEMS[id];
  if (g.traps.length >= 3) { await K.say('You only have hands for three traps at a time.', { auto: false }); return; }
  const [tx, ty] = [Math.floor(g.p.x / T), Math.floor((g.p.y - 4) / T)];
  if (g.traps.some(t => Math.abs(t.tx - tx) + Math.abs(t.ty - ty) < 2)) { await K.say('There is already a trap right here.', { auto: false }); return; }
  K.take(id);
  g.traps.push({ item: id, tx, ty, x: g.p.x, y: g.p.y - 2, zone: K.zoneAt(g.p.x, g.p.y).id, at: now() });
  g.trapsUsed[id] = 1; K.learnItem(id);
  LOD.tone(520, .08, 'square', .05); LOD.toast(it.em + ' ' + it.name, 1.8);
}
function trapCatch(tr) {
  const it = ITEMS[tr.item], g = G(), z = K.ZONES.find(q => q.id === tr.zone) || {};
  if (it.spawn) return !g.caught[it.spawn] && !g.dead[it.spawn] && rel(SP[it.spawn]) ? { sp: it.spawn } : null;
  if (it.lure === 'WIFE') {
    const ids = Object.keys(PARTNERS).filter(id => rel(PARTNERS[id]) && !K.gone('w_' + id));
    const fresh = ids.filter(id => !g.solved.includes(id)); return ids.length ? { wife: pick(fresh.length ? fresh : ids) } : null;
  }
  if (Math.random() < .12) return null;
  for (const [sp, w] of it.rare || []) if (SP[sp] && rel(SP[sp]) && Math.random() < w / 100) return { sp };
  const reveal = EF.has(g.me, 'reveal'), ok = sp => SP[sp] && SP[sp].kind === 'creature' && rel(SP[sp]) && SP[sp].type === it.lure && !SP[sp].trapOnly && (!SP[sp].needs || reveal) && SP[sp].rarity !== 'L';
  let tab = (z.enc || []).filter(([sp]) => ok(sp));
  if (!tab.length) tab = Object.keys(SP).filter(sp => ok(sp) && ['C', 'U'].includes(SP[sp].rarity)).map(sp => [sp, 1]);
  return tab.length ? { sp: PX.data.weighted(tab) } : null;
}
async function trapInteract(tr) {
  const g = G(), it = ITEMS[tr.item];
  if (!trapReady(tr)) {
    const a = await K.ask(it.em + ' ' + it.name + '. Nothing yet.', [{ label: '🪤 Pick it up', value: 'up' }, K.BACK('‹ Leave')]);
    if (a === 'up') { g.traps.splice(g.traps.indexOf(tr), 1); K.give(tr.item); }
    return;
  }
  g.traps.splice(g.traps.indexOf(tr), 1);
  const r = trapCatch(tr);
  if (!r) { await K.say(it.em + ' Empty. Something ate the bait and left.', { auto: false }); return; }
  K.hideBox();
  if (r.wife) { K.startPartner(r.wife); const B = K.B; if (B) { const f = B.foes[0]; f.hp = Math.round(f.hp * (1 - it.catchBonus * .6)); B.dazed = 0; } return; }
  const z = K.ZONES.find(q => q.id === tr.zone), lv = Math.round((z && z.lv ? rand(z.lv[0], z.lv[1]) : rand(4, 8)) + it.tier * 2 + Math.min(5, g.beat.length) + (SP[r.sp].rarity === 'M' ? 10 : 0));
  K.startBattle({ kind: 'trap', foes: [K.mk(r.sp, lv)], dazed: it.catchBonus, trapItem: tr.item });
}

/* ===================== CEMETERY: graves, resurrection, the grave reward ===================== */
function addGrave(foe) {
  const g = G(), s = SP[foe.sp], date = LOD.today();
  if (s.kind === 'creature') {
    let gr = g.graves.find(q => q.sp === foe.sp);
    if (gr) { gr.n++; gr.lv = Math.max(gr.lv, foe.lv); gr.date = date; return gr; }
    gr = { sp: foe.sp, kind: 'creature', name: s.name, n: 1, lv: foe.lv, date, epitaph: PX.data.fmt(pick(R.graves.creature), { name: s.name, n: '{n}' }) };
    g.graves.push(gr); return gr;
  }
  const gr = { sp: foe.sp, kind: s.kind, name: s.name, n: 1, lv: foe.lv, date, epitaph: s.epitaph || PX.data.fmt(pick(R.graves.default), { name: s.name }) };
  g.graves.push(gr); return gr;
}
function graveSpot(i) { const a = R.graves.area, cols = Math.floor(a[2] / 2) + 1; return [a[0] + (i % cols) * 2, a[1] + Math.floor(i / cols) * 2 % a[3]]; }
const likesOf = gr => (SP[gr.sp] && SP[gr.sp].likes) || 'buns';
const matches = (id, likes) => id === likes || (ITEMS[id] && ITEMS[id].lure === likes);
function rewardGraveSp() { const r = R.graves.reward; return K.heroId() === r.rewardGrave ? 'n_' + r.rewardGraveIfSelf : 'h_' + r.rewardGrave; }
async function graveInteract(gr) {
  const g = G(), likes = likesOf(gr);
  const text = gr.name + (gr.n > 1 ? ' ×' + gr.n : '') + ' · ' + gr.date + '\n"' + gr.epitaph.replace('{n}', gr.n) + '"';
  for (;;) {
    const offer = Object.keys(g.items).filter(id => g.items[id] > 0 && matches(id, likes));
    const opts = [];
    const rw = R.graves.reward, isReward = gr.sp === rewardGraveSp() && rel(rw) && !g.flags.graveReward;
    if (isReward) { opts.push({ label: '🙏 Apologize', value: 'sorry' }); opts.push({ label: '🪙 Place a bitcoin', value: 'coin', dis: !K.has('bitcoin') }); }
    for (const id of offer) opts.push(K.itemOpt(id, { label: '🕯️ Offer ' + ITEMS[id].em + ' ' + ITEMS[id].name, value: 'offer:' + id, sub: '', unk: false }));
    opts.push(K.BACK('‹ Leave'));
    const a = await K.ask(text, opts, { who: '🪦' });
    if (!a) return;
    if (a === 'sorry' || a === 'coin') {
      if (a === 'coin') K.take('bitcoin');
      await K.say(a === 'coin' ? rw.coin : rw.sorry, { auto: false });
      for (const id of rw.give) if (ITEMS[id]) K.give(id);
      g.flags.graveReward = 1; g.flags[rw.flag] = 1; K.SFX.catch(); PX.fx.addTrauma(.5);
      await K.say('You got: ' + rw.give.map(id => ITEMS[id] ? ITEMS[id].em : '').join(' '), { auto: false });
      await K.say(rw.after, { auto: false });
      return;
    }
    const id = a.slice(6); K.take(id);
    await resurrect(gr);
    return;
  }
}
async function resurrect(gr) {
  const g = G(), s = SP[gr.sp];
  PX.fx.addTrauma(.4); LOD.haptic('success'); K.SFX.catch();
  if (--gr.n <= 0) g.graves.splice(g.graves.indexOf(gr), 1);
  if (s.kind === 'creature') { const c = K.mk(gr.sp, gr.lv); K.addToParty(c, true); g.caught[gr.sp] = 1; await K.say('The ground shakes. ' + s.name + ' climbs out and joins you, a bit muddy.', { auto: false }); return; }
  delete g.dead[gr.sp];
  await K.say('The ground shakes. ' + s.name + ' climbs out, brushes off the dirt and walks back to where they used to stand.', { auto: false });
}
const mythicOn = () => { const g = G(); return g.flags.mythicSpawned && !g.caught.wraith && !g.dead.wraith && rel(SP.wraith); };

/* ===================== THE BOX: the WOD board + training ===================== */
const GYM = R.gyms.box;
const trainOpen = () => rel({ release: GYM.trainRelease }) && G().flags[GYM.doneFlag];
function tierCap() { let cap = GYM.tiers[0].cap; for (const t of GYM.tiers) if (!t.flag || G().flags[t.flag]) cap = t.cap; return cap; }
function train(dtMin) {
  const g = G(), cap = tierCap();
  for (const s of g.gym.slots) {
    const c = s.c, mins = dtMin != null ? dtMin : (now() - s.last) / 60000; s.last = now();
    if (c.lv >= cap || mins <= 0) continue;
    let amt = Math.floor((s.carry || 0) + mins * GYM.xpPerMin * (1 + EF.sum(c, 'xpRate')));
    s.carry = ((s.carry || 0) + mins * GYM.xpPerMin * (1 + EF.sum(c, 'xpRate'))) % 1;
    while (amt > 0 && c.lv < cap) { const need = K.xpNeed(c.lv) - c.xp, put = Math.min(need, amt); K.addXp(c, put, null); amt -= put; }
    if (c.lv >= cap) c.xp = 0;
  }
}
async function board() {
  const g = G(), wod = GYM.wod.join('\n');
  if (!trainOpen()) { await K.say(wod, { auto: false, who: 'WOD' }); return; }
  for (;;) {
    train(); const cap = tierCap();
    const opts = g.gym.slots.map((s, i) => ({ label: K.cname(s.c) + ' Lv ' + s.c.lv + (s.c.lv >= cap ? ' · MAX' : ''), img: K.creatureIcon(s.c.sp), sub: EF.all(s.c, 'xpRate').map(f => '⚡' + Math.ceil(f.t / 60) + 'm').join(' ') || 'Training', value: 'slot:' + i }));
    if (g.gym.slots.length < GYM.slots) opts.push({ label: '➕ Leave a creature', value: 'add', dis: g.party.length < 2 });
    opts.push(K.BACK('‹ Leave'));
    const a = await K.ask(wod + '\nCap: Lv ' + cap, opts, { who: 'WOD', one: true });
    if (!a) return;
    if (a === 'add') {
      const i = await K.ask('Who trains?', g.party.map((c, i) => ({ label: K.cname(c) + ' Lv ' + c.lv, img: K.creatureIcon(c.sp), value: i })).concat([K.BACK()]), { one: true });
      if (i == null) continue;
      const c = g.party[i]; if (g.party.filter(q => q.hp > 0 && q !== c).length < 1) { await K.say('Someone has to come with you.', { auto: false }); continue; }
      g.party.splice(i, 1); c.fx = c.fx || []; g.gym.slots.push({ c, last: now() }); LOD.tone(660, .08, 'square', .05);
      continue;
    }
    const s = g.gym.slots[+a.slice(5)];
    const shakes = Object.keys(g.items).filter(id => g.items[id] > 0 && ITEMS[id] && ITEMS[id].train);
    const b = await K.ask(K.cname(s.c) + ' Lv ' + s.c.lv + ' · XP ' + s.c.xp, [{ label: '🎒 Pick up', value: 'up' }].concat(shakes.map(id => K.itemOpt(id, { label: 'Give ' + ITEMS[id].em + ' ' + ITEMS[id].name, value: 'give:' + id }))).concat([K.BACK()]));
    if (b === 'up') { g.gym.slots.splice(g.gym.slots.indexOf(s), 1); delete s.c.fx; K.addToParty(s.c); continue; }
    if (b && b.startsWith('give:')) {
      const id = b.slice(5); K.take(id); K.learnItem(id);
      let died = false;
      for (const e of ITEMS[id].train) EF.apply(s.c, e, { onHeart: () => { died = true; } });
      if (died) await creatureHeart(s);
      else await K.say(K.cname(s.c) + ' chugs it and starts doing burpees at double speed.', { auto: false });
    }
  }
}
async function creatureHeart(s) {
  const g = G(); g.gym.slots.splice(g.gym.slots.indexOf(s), 1);
  PX.fx.addTrauma(.8); K.SFX.grave(); LOD.callout('HEART ATTACK 💔', K.cname(s.c) + ' did one rep too many.', 'bad');
  addGrave(s.c);
  await K.say(K.cname(s.c) + ' collapses on the rower. The gym goes quiet.' + (K.cemeteryOpen() ? ' A new stone appears in the cemetery.' : ''), { auto: false });
}

/* ===================== THE DEALER ===================== */
const DL = R.dealer;
function dealerStock() {
  const g = G(), rot = Math.floor(now() / (DL.rotateMin * 60000));
  if (g.dealer.rot === rot && g.dealer.stock) return g.dealer.stock;
  const r = rng(rot * 7919 + hashStr(LOD.player || 'x')), pool = DL.stock.filter(([id]) => ITEMS[id] && rel(ITEMS[id])), stock = [];
  const bag = pool.slice();
  for (let i = 0; i < DL.size && bag.length; i++) { let tot = bag.reduce((a, s) => a + s[2], 0), x = r() * tot, k = 0; for (; k < bag.length - 1; k++) if ((x -= bag[k][2]) <= 0) break; const [id, price] = bag.splice(k, 1)[0]; stock.push({ id, price }); }
  for (const [id, price, ch] of DL.rare) if (ITEMS[id] && rel(ITEMS[id]) && r() < ch) stock.push({ id, price, rare: 1 });
  g.dealer.rot = rot; g.dealer.stock = stock; g.dealer.bought = {};
  return stock;
}
const valueOf = c => Math.max(1, Math.round((DL.rates[SP[c.sp].rarity] || 1) * (1 + c.lv * DL.levelBonus)));
async function dealer(n) {
  const g = G(), who = n.d.name;
  await K.say2(who, pick(DL.hello));
  for (;;) {
    const stock = dealerStock();
    const opts = [{ label: '🤝 Trade a creature', value: 'trade', cls: 'hot', dis: !(g.party.length + g.box.length > 1) }]
      .concat(stock.map((s, i) => K.itemOpt(s.id, { label: ITEMS[s.id].em + ' ' + ITEMS[s.id].name + ' · ' + s.price + ' ✦' + (s.rare ? ' 🔥' : ''), value: 'buy:' + i, dis: g.dealer.bought[i] || g.dealer.pts < s.price })));
    if (g.dealer.pen.length) opts.push({ label: '🔙 His creatures', value: 'pen', sub: g.dealer.pen.length + ' in the back' });
    if (!stock.length) opts.push({ label: DL.empty, value: null, dis: true });
    opts.push(K.BACK('‹ Leave'));
    const a = await K.ask('✦ ' + g.dealer.pts, opts, { who });
    if (!a) return;
    if (a === 'trade') {
      const list = g.party.map((c, i) => ({ c, from: 'party', i })).concat(g.box.map((c, i) => ({ c, from: 'box', i })));
      const k = await K.ask('Which one?', list.map((e, j) => ({ label: K.cname(e.c) + ' Lv ' + e.c.lv + (e.from === 'box' ? ' (van)' : ''), img: K.creatureIcon(e.c.sp), sub: SP[e.c.sp].wife ? '' : valueOf(e.c) + ' ✦', value: j })).concat([K.BACK()]), { one: true });
      if (k == null) continue;
      const e = list[k];
      if (SP[e.c.sp].wife) { LOD.haptic('error'); await K.say2(who, pick(DL.refuse)); continue; }
      if (e.from === 'party' && g.party.filter(c => c.hp > 0 && c !== e.c).length < 1) { await K.say2(who, 'And walk home alone? Keep that one.'); continue; }
      (e.from === 'party' ? g.party : g.box).splice(e.from === 'party' ? g.party.indexOf(e.c) : g.box.indexOf(e.c), 1);
      const v = valueOf(e.c); g.dealer.pts += v; g.dealer.pen.push({ sp: e.c.sp, lv: e.c.lv, xp: e.c.xp, hp: e.c.hp });
      K.SFX.buy(); K.learn('dealer'); await K.say2(who, 'Pleasure. +' + v + ' ✦');
    } else if (a.startsWith('buy:')) {
      const i = +a.slice(4), s = stock[i]; g.dealer.pts -= s.price; g.dealer.bought[i] = 1; K.give(s.id); K.SFX.buy();
    } else if (a === 'pen') {
      const k = await K.ask('Buy one back?', g.dealer.pen.map((c, j) => { const kr = DL.buyBack * (DL.rates[SP[c.sp].rarity] || 1); return { label: K.cname(c) + ' Lv ' + c.lv, img: K.creatureIcon(c.sp), sub: kr + ' kr', value: j, dis: g.kr < kr }; }).concat([K.BACK()]), { one: true });
      if (k == null) continue;
      const c = g.dealer.pen.splice(k, 1)[0]; g.kr -= DL.buyBack * (DL.rates[SP[c.sp].rarity] || 1);
      const m = K.mk(c.sp, c.lv); m.xp = c.xp; K.addToParty(m); K.SFX.buy();
    }
  }
}

/* ===================== THE PHONE ===================== */
async function phone() {
  const g = G();
  for (;;) {
    const ids = Object.keys(R.apps).filter(id => rel(R.apps[id]));
    const a = await K.ask('📱 ' + (new Date()).toTimeString().slice(0, 5) + ' · 4 % 🔋', ids.map(id => ({ label: R.apps[id].icon + ' ' + R.apps[id].name, value: id }))
      .concat([K.BACK('‹ Pocket')]));
    if (!a) return;
    const app = R.apps[a], used = g.apps[a] || 0, last = g.flags['appAt:' + a] || 0;
    if (app.cooldownMin && app.use && used && (!app.once || used < app.once) && now() - last < app.cooldownMin * 60000 / Math.max(1e-6, K.trapSpeed)) {
      const m = Math.ceil((app.cooldownMin * 60000 / Math.max(1e-6, K.trapSpeed) - (now() - last)) / 60000);
      await K.say(app.name + ': "Your next payment plan opens in ' + m + ' min. Breathe."', { auto: false, who: app.icon + ' ' + app.name }); continue;
    }
    g.apps[a] = used + 1; g.flags['appAt:' + a] = now();
    let line;
    if (app.gate === 'door') { line = app.lines[used ? 1 : 0]; if (used) g.flags.bankid = 1; }
    else line = pick(app.lines);
    const vars = { price: (rand(4, 99)).toFixed(2), steps: fmt(Math.round(g.steps || 0)), name: pick(['Gunnel (wrong number)', 'Ica-Stig', 'your ex', 'Löken\'s mum', 'a stranger in Kiruna', 'Systembolaget']), kr: g.kr, debt: (g.debt || 0) + (app.use || []).filter(e => e.type === 'promiseDebt').length };
    if (app.use && (!app.once || used < app.once)) K.applyAll(g.me, app.use, {});
    else if (app.use && app.once) line = 'Klarna: "You have reached your limit. And ours."';
    LOD.tone(1320, .04, 'square', .04);
    await K.say(PX.data.fmt(line, vars), { auto: false, who: app.icon + ' ' + app.name });
  }
}
/* BankID gates The Box's door once BankID is out (until you approve in the app) */
const bankidDoor = (tx, ty) => tx >= 41 && tx <= 42 && ty === 18;
function blocked(tx, ty) { const g = G(); return !!(g && rel(R.apps.bankid) && !g.flags.bankid && bankidDoor(tx, ty) && g.p && g.p.y > 18.5 * T); }

/* ===================== MAP: objects, drawing, ticking ===================== */
function mapObjects() {
  const g = G(), L = [];
  for (const tr of g.traps) L.push({ kind: 'trap', ref: tr, x: tr.x, y: tr.y, range: 22 });
  if (K.cemeteryOpen()) g.graves.forEach((gr, i) => { const [x, y] = tc(...graveSpot(i)); L.push({ kind: 'grave', ref: gr, x, y: y + 6, range: 18 }); });
  if (mythicOn()) { const [x, y] = tc(6, 14); L.push({ kind: 'mythic', x, y, range: 24 }); }
  if (rel(R.apps.bankid) && !g.flags.bankid) { const [x, y] = tc(41.5, 19); L.push({ kind: 'bankid', x, y, range: 20 }); }
  return L;
}
async function interact(o) {
  if (o.kind === 'trap') return trapInteract(o.ref);
  if (o.kind === 'grave') return graveInteract(o.ref);
  if (o.kind === 'mythic') { await K.say('It drifts towards you. The air smells of old passwords.', { auto: false }); K.hideBox(); K.startBattle({ kind: 'wild', foes: [K.mk('wraith', 20)] }); return; }
  if (o.kind === 'bankid') return K.say('🆔 "Identify yourself with BankID to enter."', { auto: false });
}
function drawMap(ctx, t) {
  const g = G();
  if (K.cemeteryOpen()) g.graves.forEach((gr, i) => { const [x, y] = tc(...graveSpot(i)); PX.drawSprite(ctx, 'tomb', 'idle', t, x, y + 7, { idle: false }); if (gr.n > 1) { ctx.fillStyle = '#fbf6e8'; ctx.font = '700 6px Barlow, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('×' + gr.n, x, y - 8); } });
  if (mythicOn()) { const [x, y] = tc(6, 14); ctx.save(); ctx.translate(x, y + 6 + Math.sin(t * 2) * 2); ctx.scale(.5, .5); K.drawCreature(ctx, 'wraith', 0, 0, 1, { t, alpha: .6 + Math.sin(t * 3) * .25 }); ctx.restore(); }
  for (const tr of g.traps) { const it = ITEMS[tr.item]; LOD.em(it.em, tr.x, tr.y - 4, 9); if (trapReady(tr)) K.bubble(ctx, tr.x, tr.y - 16, '!', '#3ddc84', t); }
  if (rel(R.apps.bankid) && !g.flags.bankid) { const [x, y] = tc(41.5, 18); ctx.fillStyle = '#1F2A44'; ctx.fillRect(x - 12, y + 2, 24, 3); LOD.em('🆔', x, y - 4, 8); }
}
let trainT = 0;
function tick(dt) {
  const g = G(); if (!g || !g.gym) return;
  for (const s of g.gym.slots) EF.tick(s.c, dt, { onHeart: () => { s.dead = true; } });
  const dead = g.gym.slots.find(s => s.dead);
  if (dead && g.scene === 'map') { g.scene = 'talk'; creatureHeart(dead).then(() => { K.hideBox(); if (G().scene === 'talk') G().scene = 'map'; }); }
  if ((trainT += dt) > 1) { trainT = 0; if (trainOpen()) train(); }
}

/* ===================== COMPLETION % (100 % takes far longer than the score) ===================== */
function completion() {
  const g = G();
  const crs = Object.keys(R.creatures).filter(id => rel(R.creatures[id]) || g.caught[id]);
  const people = Object.keys(SP).filter(sp => SP[sp].kind !== 'creature' && SP[sp].kind !== 'boss' && (SP[sp].kind !== 'hero' || SP[sp].ref !== K.heroId()));
  const apps = Object.keys(R.apps).filter(id => rel(R.apps[id])), traps = Object.keys(ITEMS).filter(id => ITEMS[id].kind === 'trap' && rel(ITEMS[id]));
  const items = Object.keys(ITEMS).filter(id => !ITEMS[id].list && rel(ITEMS[id]) && ITEMS[id].kind !== 'app');
  const parts = [
    crs.filter(id => g.caught[id]).length / Math.max(1, crs.length),
    (new Set(g.graves.map(q => q.sp)).size + Object.keys(g.dead).length * 0) / Math.max(1, crs.length + people.length),
    Object.keys(g.caughtP).length / Math.max(1, people.length),
    apps.filter(id => g.apps[id]).length / Math.max(1, apps.length),
    traps.filter(id => g.trapsUsed[id]).length / Math.max(1, traps.length),
    items.filter(id => g.known[id]).length / Math.max(1, items.length)
  ];
  return { pct: Math.floor(parts.reduce((a, b) => a + Math.min(1, b), 0) / parts.length * 100), parts };
}

return {
  newGame() { const g = G(); g.fillers = makeFillers(); registerFillers(); },
  afterLoad() { const g = G(); if (!g.fillers || !Object.keys(g.fillers).length) g.fillers = makeFillers(); registerFillers(); if (trainOpen()) train(); },
  placeTrap, addGrave, resurrect, board, dealer, dealerStock, phone, mapObjects, interact, drawMap, tick, completion, blocked, train, tierCap, trapReady, trapCatch, valueOf, graveSpot
};
};
