// Mission 3, shops and bags: data shops with stock + restock, three bag tiers (catch bonus, tear chance, rare spawns), Mk1 at the checkout, Mk2 in the garden corner, Mk3 only from the dealer.
const { chromium } = require('playwright');
const OUT = process.argv[2] || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT, { recursive: true });
const BASE = process.env.LOD_URL || 'http://127.0.0.1:8123/';
const ok = (c, msg) => { console.log((c ? 'PASS ' : 'FAIL ') + msg); if (!c) process.exitCode = 1; };
const E = (p, f, a) => p.evaluate(f, a);
const PORT = { width: 390, height: 780 };

async function open(b, q = '?dev=all&date=2026-11-25', o = {}) {
  const p = await b.newPage(Object.assign({ viewport: PORT, deviceScaleFactor: 2 }, o.page || {}));
  p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  p.on('console', m => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && p.errs.push(m.text()));
  if (o.route) await o.route(p);
  if (o.init) await p.addInitScript(o.init);
  await p.goto(BASE + q); await p.waitForTimeout(700);
  await E(p, () => { window.__lod.setName('Ljunky'); window.__lod.LOD.store.set('lod.char', 'bigwman'); });
  return p;
}
async function toBrief(p, hero = 'bigwman') {
  await E(p, () => { const L = window.__lod; L.openMission(L.LOD.missions.find(m => m.id === 3)); });
  for (let i = 0; i < 40; i++) {
    await p.waitForTimeout(250);
    if (await E(p, () => !document.getElementById('scr-brief').hidden)) return true;
    await E(p, h => {
      const c = [...document.querySelectorAll('button')].filter(b => b.offsetParent && !b.disabled), cur = document.querySelector('.cs-name');
      if (h && cur && cur.textContent.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') !== h) { const n = c.find(x => x.matches('[data-a="next"]')); if (n) return n.click(); }
      const b = c.find(x => x.matches('[data-a="select"]')) || c.find(x => x.matches('.cut [data-a="skip"]')); if (b) b.click();
    }, hero);
  }
  return false;
}
async function play(p, hero = 'bigwman') { // fresh game, starter chosen, on the map
  await E(p, () => localStorage.removeItem('lod.save.m3.Ljunky'));
  await toBrief(p, hero); await p.click('#brief-go'); await p.waitForTimeout(400);
  await E(p, () => { window.__m3.speed = 25; });
  await pickStarter(p, 'Badger Cub'); await E(p, () => { window.__m3.skipReplies = true; });
  await E(p, () => { const m = window.__m3; m.G.party = ['badger', 'lynx', 'toad', 'hedgehog'].map(s => m.mk(s, 18)); m.G.kr = 5000; });
}
async function drive(p, prefer, max = 500) {
  for (let i = 0; i < max; i++) {
    const st = await E(p, pref => {
      const m = window.__m3, G = m.G;
      if (!G || G.mode !== 'play') return 'mode:' + (G && G.mode);
      if (G.scene === 'map' && !m.B) return 'done';
      const pd = m.pending; if (!pd) return 'wait';
      if (pd.say) { pd.res(); return 'say'; }
      const btns = [...document.querySelectorAll('#m3ui .m3grid button')].filter(b => !b.disabled);
      for (const r of pref) { const b = btns.find(x => new RegExp(r).test(x.textContent)); if (b) { b.click(); return 'click ' + r; } }
      const b = btns.find(x => !/Back|Leave|Not yet|Close|Pocket/.test(x.textContent)) || btns[0]; if (b) { b.click(); return 'click*'; }
      return 'none';
    }, prefer);
    if (st === 'done' || st.startsWith('mode:')) return st;
    await p.waitForTimeout(st === 'wait' ? 40 : 15);
  }
  return 'timeout';
}
// click through until a button matching re shows up (or the box closes); returns true if clicked
async function until(p, re, max = 200) {
  for (let i = 0; i < max; i++) {
    const r = await E(p, re => { const m = window.__m3, pd = m.pending; const b = [...document.querySelectorAll('#m3ui .m3grid button')].find(x => !x.disabled && new RegExp(re).test(x.textContent)); if (b) { b.click(); return 'hit'; } if (pd && pd.say) { pd.res(); return 'say'; } return m.G.scene === 'map' && !m.B && !pd ? 'map' : 'wait'; }, re);
    if (r === 'hit') return true; if (r === 'map') return false; await p.waitForTimeout(30);
  }
  return false;
}
// talk to a person through the real dialogue system; clicks the reply matching `click` if a menu shows. Returns { texts, btns, res }
async function talkTo(p, id, click) {
  await E(p, id => { window.__t = { done: false }; window.__m3.PPL.talk(id, { name: id }).then(r => { window.__t.done = true; window.__t.res = { fight: r.fight, line: !!r.line }; }); }, id);
  const texts = []; let btns = null;
  for (let i = 0; i < 80; i++) {
    const r = await E(p, () => { const m = window.__m3, pd = m.pending, txt = document.querySelector('#m3ui .m3txt').textContent; if (window.__t.done) return { done: true, res: window.__t.res }; if (!pd) return { wait: true };
      if (pd.say) { pd.res(); return { text: txt }; } return { text: txt, btns: [...document.querySelectorAll('#m3ui .m3grid button')].map(b => b.textContent) }; });
    if (r.done) return { texts, btns, res: r.res };
    if (r.text) texts.push(r.text);
    if (r.btns) { btns = r.btns; const ok = await E(p, re => { const b = [...document.querySelectorAll('#m3ui .m3grid button')].find(x => !x.disabled && new RegExp(re).test(x.textContent)) || document.querySelector('#m3ui .m3grid button'); b.click(); return true; }, click || '.'); }
    await p.waitForTimeout(40);
  }
  return { texts, btns, res: null };
}
// use a prop (puzzle piece, tee, fishing spot) through the real code; clicks the reply matching `click` if a menu shows
async function startProp(p, id) { await E(p, id => { window.__u = { done: false }; window.__m3.propUse(id).then(() => { window.__u.done = true; }); }, id); }
// click through everything a prop says until it is finished (a running mini-game is left alone); clicks the reply matching `click` if a menu shows
async function settle(p, click, max = 150) {
  for (let i = 0; i < max; i++) {
    const r = await E(p, () => { const m = window.__m3, pd = m.pending; if (window.__u.done) return { done: true }; if (m.MINI.active || !pd) return { wait: true }; if (pd.say) { pd.res(); return { say: true }; } return { btns: true }; });
    if (r.done) return true;
    if (r.btns) await E(p, re => { const b = [...document.querySelectorAll('#m3ui .m3grid button')].find(x => !x.disabled && new RegExp(re).test(x.textContent)) || document.querySelector('#m3ui .m3grid button'); b.click(); }, click || '.');
    await p.waitForTimeout(40);
  }
  return false;
}
const useProp = async (p, id, click) => { await startProp(p, id); return settle(p, click); };
const btnText = p => E(p, () => [...document.querySelectorAll('#m3ui .m3grid button')].map(b => b.textContent).join(' | '));
const at = (p, x, y) => E(p, ([x, y]) => { const m = window.__m3, [px, py] = m.tc(x, y); m.G.p.x = px; m.G.p.y = py; window.__lod.LOD.cam.x = px; window.__lod.LOD.cam.y = py; }, [x, y]);

// the opening: blink, thoughts, then the stranger walks up and you pick a starter
async function pickStarter(p, name) {
  for (let i = 0; i < 300; i++) {
    const st = await p.evaluate(name => {
      const m = window.__m3, G = m.G, pd = m.pending;
      if (G.starter) return 'done';
      if (pd && pd.say) { pd.res(); return 'say'; }
      const b = [...document.querySelectorAll('#m3ui .m3grid button')].find(x => new RegExp(name).test(x.textContent)); if (b) { b.click(); return 'pick'; }
      if (G.scene === 'map' && !m.stranger) m.summon();
      return 'wait';
    }, name);
    if (st === 'done') { await p.evaluate(() => { const pd = window.__m3.pending; if (pd && pd.say) pd.res(); }); await p.waitForTimeout(100); await p.evaluate(() => { const pd = window.__m3.pending; if (pd && pd.say) pd.res(); }); return true; }
    await p.waitForTimeout(40);
  }
  return false;
}

// run an async game function through the real UI. start = "name.path" in window.__m3 or a function source; click = regex (or list) for menus
async function flow(p, start, arg, click, max = 400) {
  await E(p, ([s, a]) => { window.__fl = { done: false, err: null }; const f = /^\w[\w.]*$/.test(s) ? s.split('.').reduce((o, k) => o[k], window.__m3) : (0, eval)('(' + s + ')'); Promise.resolve(f(...[].concat(a == null ? [] : a))).then(() => { window.__fl.done = true; }, e => { window.__fl.err = String(e && e.stack || e); window.__fl.done = true; }); }, [start, arg]);
  const texts = [];
  for (let i = 0; i < max; i++) {
    const r = await E(p, () => { if (window.__fl.done) return { done: true, err: window.__fl.err }; const m = window.__m3, pd = m.pending; if (!pd) return { wait: true }; const txt = document.querySelector('#m3ui .m3txt').textContent; if (pd.say) { pd.res(); return { text: txt }; } return { text: txt, btns: true }; });
    if (r.done) return { texts, err: r.err };
    if (r.text && !texts.includes(r.text)) texts.push(r.text);
    if (r.btns) await E(p, res => { const L = [...document.querySelectorAll('#m3ui .m3grid button')].filter(x => !x.disabled), used = window.__fl.used = window.__fl.used || []; let b = null; for (const re of res) { if (used.includes(re)) continue; b = L.find(x => new RegExp(re).test(x.textContent)); if (b) { used.push(re); break; } } b = b || L.find(x => /Back|Leave|Close/.test(x.textContent)) || L[0]; b && b.click(); }, [].concat(click || []));
    await p.waitForTimeout(25);
  }
  return { texts, err: 'timeout' };
}
const wait = (p, ms) => p.waitForTimeout(ms);
const mkParty = (p, list) => E(p, list => { const m = window.__m3; m.G.party = list.map(([s, lv]) => m.mk(s, lv)); m.G.box = []; for (const c of m.G.party) c.hp = m.maxHp(c); }, list);

const clickBtn = async (p, re, tries = 60) => { for (let i = 0; i < tries; i++) { const r = await E(p, re => { const pd = window.__m3.pending; if (pd && pd.say) { pd.res(); return 'say'; } const b = [...document.querySelectorAll('#m3ui .m3grid button')].find(x => new RegExp(re).test(x.textContent)); if (b && !b.disabled) { b.click(); return 'hit'; } return b ? 'disabled' : 'none'; }, re); if (r === 'hit') return true; if (r === 'disabled') return 'disabled'; await p.waitForTimeout(40); } return false; };
const menu = p => E(p, () => [...document.querySelectorAll('#m3ui .m3grid button')].map(b => b.textContent + (b.disabled ? ' [off]' : '')).join(' | '));
const openShop = async (p, npc) => { await E(p, n => { window.__sh = window.__m3.shop(window.__m3.D.raw.npcs[n], n); }, npc); await p.waitForTimeout(250); };
const leave = async p => { await clickBtn(p, 'Leave'); await p.waitForTimeout(150); };

async function run(fx) {
  const b = await chromium.launch(); const p = await open(b, '?dev=all&date=2026-11-25' + (fx ? '&fx=off' : '')); await play(p);
  const tag = fx ? ' (?fx=off)' : '';
  let g;
  // ---- data
  g = await E(p, () => {
    const D = window.M3_DATA, m = window.__m3, I = D.items, bad = [], inShop = id => Object.values(D.shops).some(s => s.stock.some(q => q.item === id)) || Object.values(D.npcs).some(n => Array.isArray(n.shop) && n.shop.includes(id));
    const bags = Object.keys(I).filter(i => I[i].catch).sort((a, c) => I[a].mk - I[c].mk);
    for (const i of bags) for (const k of ['mk', 'price', 'catchBonus', 'breakChance']) if (I[i][k] == null) bad.push(i + ' misses ' + k);
    return { bags, bonus: bags.map(i => I[i].catchBonus), brk: bags.map(i => I[i].breakChance), price: bags.map(i => I[i].price), warn: m.D.warnings.length, bad,
      checkout: D.shops.checkout.stock.map(s => s.item), garden: D.shops.garden.stock.map(s => s.item), mk3shop: ['snare', 'pitTrap'].filter(inShop), goods: D.dealer.goods.map(x => x.item), jute: I.bagJute.rareSpawn };
  });
  ok(g.bags.join() === 'bag,bagLife,bagJute' && g.bad.length === 0, 'three bags with mk, price, catch bonus and tear chance' + tag + ' (' + g.bags + ')');
  ok(g.bonus[0] < g.bonus[1] && g.bonus[1] < g.bonus[2] && g.brk[0] > g.brk[1] && g.brk[1] > g.brk[2] && g.price[0] < g.price[1] && g.price[1] < g.price[2], 'Mk1 < Mk2 < Mk3: catch chance and price rise, tear chance falls (' + g.bonus + ' / ' + g.brk + ' / ' + g.price + ')');
  ok(['bag', 'bagLife', 'bagJute', 'mouseTrap', 'jamJar', 'rodTrap'].every(i => g.checkout.includes(i)) && ['liveBox', 'netTrap'].every(i => g.garden.includes(i)), 'checkout: the 3 bags + the Mk1 traps; garden corner: the Mk2 traps');
  ok(g.mk3shop.length === 0 && g.goods.join() === 'snare,pitTrap', 'Mk3 traps (snare, pit trap) are in no shop, only in the dealer goods (' + g.goods + ')');
  ok(g.warn === 0 && g.jute > 0, 'the data validates with no warnings; the jute bag raises rare spawns');
  // ---- the people are there
  g = await E(p, () => { const m = window.__m3, [gx, gy] = m.tc(...m.D.raw.npcs.gardener.at); return { walk: m.walkable(gx, gy + 6), has: m.npcList().some(n => n.id === 'gardener'), berit: m.D.raw.npcs.berit.shop };
  });
  ok(g.walk && g.has && g.berit === 'checkout', 'the garden corner clerk stands on walkable ground; Berit at the checkout points at the shop id');

  // ---- buying at the checkout
  await E(p, () => { const m = window.__m3; m.G.kr = 500; m.G.items = {}; });
  await openShop(p, 'berit');
  const mnu = await menu(p);
  ok(/Plastic carrier bag · 10 kr · 12 left/.test(mnu) && /Bag for life · 25 kr · 6 left/.test(mnu) && /Reusable jute bag · 60 kr · 3 left/.test(mnu) && /Mouse trap · 30 kr · 4 left/.test(mnu), 'the checkout lists bags and Mk1 traps with price and stock' + tag + ' (' + mnu.slice(0, 120) + ')');
  await p.screenshot({ path: OUT + '/shops-checkout' + (fx ? '-fxoff' : '') + '.png' });
  await clickBtn(p, 'Bag for life'); await p.waitForTimeout(150);
  g = await E(p, () => { const m = window.__m3; return { kr: m.G.kr, n: m.G.items.bagLife, left: m.G.shopStock.checkout.bagLife.n }; });
  ok(g.kr === 475 && g.n === 1 && g.left === 5, 'buying a bag: kr down, bag in the inventory, stock 6 → 5 (' + JSON.stringify(g) + ')');
  // stock limit
  await E(p, () => { window.__m3.G.shopStock.checkout.bagJute.n = 1; });
  await leave(p); await openShop(p, 'berit');
  await clickBtn(p, 'jute bag'); await p.waitForTimeout(150);
  const m2 = await menu(p);
  ok(/jute bag · 60 kr · sold out.*\[off\]/.test(m2) && await E(p, () => window.__m3.G.items.bagJute === 1 && window.__m3.G.shopStock.checkout.bagJute.n === 0), 'the last jute bag sells, then the shelf says sold out and the button is dead (' + m2.match(/jute[^|]*/)[0] + ')');
  // restock timer
  await E(p, () => { const r = window.__m3.G.shopStock.checkout.bagJute; r.t = Date.now() - 21 * 60000; });
  await leave(p); await openShop(p, 'berit');
  ok(/jute bag · 60 kr · 2 left/.test(await menu(p)), 'after 21 minutes the shop got 2 jute bags back (restock every 20 min, +2)');
  await leave(p);

  // ---- garden corner + not enough kr (neutral, nothing else said)
  await E(p, () => { window.__m3.G.kr = 3; });
  await openShop(p, 'gardener');
  ok(/Live box · 60 kr · 3 left/.test(await menu(p)) && /Fishing net/.test(await menu(p)) === (await E(p, () => window.__m3.rel ? true : true)), 'the garden corner sells the Mk2 traps' + tag);
  await p.screenshot({ path: OUT + '/shops-garden' + (fx ? '-fxoff' : '') + '.png' });
  await clickBtn(p, 'Live box'); await p.waitForTimeout(250);
  g = await E(p, () => ({ txt: document.querySelector('#m3ui .m3txt').textContent, kr: window.__m3.G.kr, box: window.__m3.G.items.liveBox | 0 }));
  ok(/Not enough kr\./.test(g.txt) && g.kr === 3 && g.box === 0, 'too poor: a neutral "Not enough kr.", nothing bought, no hints (' + g.txt.slice(0, 60) + ')');
  await E(p, () => { const pd = window.__m3.pending; if (pd && pd.say) pd.res(); }); await leave(p);

  // ---- Mk1 trap: buy, place, wait, spawn
  await E(p, () => { window.__m3.G.kr = 500; window.__m3.G.traps = []; });
  await openShop(p, 'berit'); await clickBtn(p, 'Mouse trap'); await leave(p);
  ok(await E(p, () => window.__m3.G.items.mouseTrap === 1), 'a Mk1 trap bought at the checkout');
  await flow(p, 'S.placeTrap', ['mouseTrap'], ['No bait']);
  g = await E(p, () => { const m = window.__m3; return { n: m.G.traps.length, item: m.G.traps[0] && m.G.traps[0].item, inv: m.G.items.mouseTrap | 0 }; });
  ok(g.n === 1 && g.item === 'mouseTrap' && g.inv === 0, 'placed on the ground (' + JSON.stringify(g) + ')');
  await p.screenshot({ path: OUT + '/shops-trap-placed' + (fx ? '-fxoff' : '') + '.png' });
  await E(p, () => { const m = window.__m3; m.trapSpeed = 1e6; m.G.traps[0].at = 0; window.__real = Math.random; Math.random = () => .5; });
  await flow(p, 'S.interact', [{ kind: 'trap', ref: await E(p, () => window.__m3.G.traps[0]) }]); await p.waitForTimeout(300);
  await E(p, () => { Math.random = window.__real; });
  g = await E(p, () => { const m = window.__m3; return { kind: m.B && m.B.kind, back: m.G.items.mouseTrap | 0 }; });
  ok(g.kind === 'trap' && g.back === 1, 'after the wait the trap holds a creature (a trap fight starts) and the trap comes back (' + JSON.stringify(g) + ')');
  await E(p, () => { const m = window.__m3; m.B.over = true; m.B.result = 'run'; }); await drive(p, ['Walk away', 'Run']);
  await E(p, () => { window.__m3.G.scene = 'map'; });

  // ---- the dealer: Mk3 for kr or for creature points
  await E(p, () => { const m = window.__m3; m.G.kr = 400; m.G.dealer.pts = 0; m.G.items = {}; window.__dl = m.S.dealer({ d: m.D.raw.npcs.dealer, id: 'dealer' }); });
  await p.waitForTimeout(400);
  for (let i = 0; i < 20; i++) { const t = await E(p, () => { const pd = window.__m3.pending; if (pd && pd.say) { pd.res(); return 'say'; } return pd ? 'ask' : ''; }); if (t === 'ask') break; await p.waitForTimeout(60); }
  const dm = await menu(p);
  ok(/Snare · 6 ✦/.test(dm) && /Snare · 220 kr/.test(dm) && /Pit trap · 360 kr/.test(dm), 'the dealer sells Mk3 traps for creature points or kr' + tag + ' (' + dm.slice(0, 110) + ')');
  await p.screenshot({ path: OUT + '/shops-dealer' + (fx ? '-fxoff' : '') + '.png' });
  await clickBtn(p, 'Snare · 220 kr'); await p.waitForTimeout(200);
  g = await E(p, () => ({ kr: window.__m3.G.kr, snare: window.__m3.G.items.snare | 0 }));
  ok(g.kr === 180 && g.snare === 1, 'paying the dealer 220 kr: a snare (' + JSON.stringify(g) + ')');
  await E(p, () => { window.__m3.G.dealer.pts = 10; }); await clickBtn(p, 'Pit trap · 10 ✦'); await p.waitForTimeout(200);
  ok(await E(p, () => window.__m3.G.items.pitTrap === 1 && window.__m3.G.dealer.pts === 0), 'paying with 10 creature points: a pit trap');
  await clickBtn(p, 'Leave'); await p.waitForTimeout(200);

  // ---- bags in battle: catch bonus, tearing, rare spawns
  await E(p, () => { const m = window.__m3; m.G.scene = 'map'; m.G.party = [m.mk('badger', 18)]; m.G.items = { bag: 3, bagLife: 3, bagJute: 3 }; m.startWild(m.ZONES.find(z => z.id === 'parking')); });
  for (let i = 0; i < 60; i++) { await p.waitForTimeout(80); const r = await E(p, () => { const pd = window.__m3.pending; if (pd && pd.say) { pd.res(); return 'say'; } return pd ? 'ask' : 'none'; }); if (r === 'ask') break; }
  g = await E(p, () => { const m = window.__m3, f = m.curFoe(); f.hp = Math.ceil(f.hp / 2); const out = {}; for (const id of m.bagIds()) { m.B.bagId = id; out[id] = m.catchChance(f); } m.B.bagId = null; return out; });
  ok(g.bag < g.bagLife && g.bagLife < g.bagJute, 'the better the bag, the better the catch chance (' + Object.entries(g).map(([k, v]) => k + ' ' + Math.round(v * 100) + ' %').join(', ') + ')');
  const fail = async (id, brk) => {
    await E(p, ([id, brk]) => { const m = window.__m3; m.D.raw.items[id].breakChance = brk; m.G.items = { [id]: 3 }; const f = m.curFoe(); f.hp = Math.max(1, Math.floor(f.hp / 2)); window.__real = Math.random; Math.random = () => .995; window.__d = null; m.B.bagId = id; m.B.bagPaid = false; m.G.items[id]--; m.throwBag(false).then(x => { window.__d = x; }); }, [id, brk]);
    for (let i = 0; i < 300; i++) { const d = await E(p, () => { const pd = window.__m3.pending; if (pd && pd.say) pd.res(); return window.__d; }); if (d !== null) break; await p.waitForTimeout(40); }
    await E(p, () => { Math.random = window.__real; });
    return E(p, id => window.__m3.G.items[id]), id;
  };
  await fail('bag', 1); const torn = await E(p, () => window.__m3.G.items.bag);
  await fail('bagJute', 0); const kept = await E(p, () => window.__m3.G.items.bagJute);
  ok(torn === 2 && kept === 3, 'a failed catch: a bag with 100 % tear chance is gone (3 → ' + torn + '), one with 0 % comes back (3 → ' + kept + ')');
  await E(p, () => { const m = window.__m3; m.B.over = true; m.B.result = 'run'; }); await drive(p, ['Walk away', 'Run']);
  g = await E(p, () => { const m = window.__m3; m.G.scene = 'map'; m.G.items = {}; const z = m.ZONES.find(q => q.id === 'forest') || m.ZONES.find(q => q.enc && q.enc.length > 3), rare = t => t.filter(([ref]) => { const r = m.SP[ref] || m.SP[m.formFor(ref, 30)]; return r && (r.rarity === 'R' || r.rarity === 'E'); }).reduce((a, [, w]) => a + w, 0), tot = t => t.reduce((a, [, w]) => a + w, 0);
    const a = m.encTable(z), before = rare(a) / tot(a); m.G.items.bagJute = 1; const c = m.encTable(z), after = rare(c) / tot(c); return { before, after, rareFound: rare(a) > 0 }; });
  ok(g.rareFound && g.after > g.before, 'carrying the jute bag makes Rare and Epic creatures show up more (' + Math.round(g.before * 1000) / 10 + ' % → ' + Math.round(g.after * 1000) / 10 + ' %)');

  // ---- old save: no shop stock field
  g = await E(p, () => { const m = window.__m3, d = m.saveState(m.G); delete d.shopStock; delete d.installed; m.G.shopStock = { x: 1 }; m.loadState(m.G, d); return { stock: JSON.stringify(m.G.shopStock) }; });
  ok(g.stock === '{}', 'an old save without shop stock loads and gets an empty default (' + g.stock + ')');
  await E(p, () => { const m = window.__m3; m.G.shopStock = {}; m.G.kr = 500; });
  await openShop(p, 'berit'); await clickBtn(p, 'Mouse trap'); await leave(p);
  g = await E(p, () => { const m = window.__m3, d = m.saveState(m.G); return { st: d.shopStock.checkout.mouseTrap.n, inv: d.items.mouseTrap }; });
  ok(g.st === 3 && g.inv === 1, 'stock and inventory are in the save (' + JSON.stringify(g) + ')');

  ok(p.errs.length === 0, 'no page errors' + tag + ' (' + p.errs.join(' | ') + ')');
  await b.close();
}
(async () => {
  await run(false);
  await run(true);
  if (process.exitCode) console.log('SOME FAILED'); else console.log('PASS m3-shops all');
})();
