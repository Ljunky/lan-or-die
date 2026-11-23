/* LAN OR DIE – Mission 3 people: personality, memory, relationships, friends, knowledge, notes, the wives' talk.
   Everything people say is data (data/m3-data.js → dialogue, personalities, knowledge). See DATA.md "Dialogue".
   missions/m3.js calls window.M3_PEOPLE(K) once and uses the functions returned here. */
window.M3_PEOPLE = function (K) {
'use strict';
const { D, ITEMS, HERO, PARTNERS } = K;
const R = D.raw, EF = PX.effects;
const { pick, clamp } = LOD;
const G = () => K.G;
const today = () => LOD.today();
let FAKE = { hour: null };

/* ---------- time: the real clock, and which release day it is ---------- */
const hour = () => FAKE.hour != null ? FAKE.hour : new Date().getHours();
const isNight = () => { const h = hour(), N = (K.CFG && K.CFG.NIGHT) || [21, 6]; return h >= N[0] || h < N[1]; };
const dayOrder = () => Object.keys(R.releases).sort((a, b) => R.releases[a] < R.releases[b] ? -1 : 1);
function dayKey() { const t = today(), o = dayOrder(); let k = o[0]; for (const d of o) if (t >= R.releases[d]) k = d; return k; }
const dayIdx = k => Math.max(0, dayOrder().indexOf(k));
const inHour = r => { const [a, b] = r, h = hour(); return a <= b ? h >= a && h < b : h >= a || h < b; };

/* ---------- state per person: met, rel (−5…+5), last answer, which lines were used ---------- */
function pst(id) {
  const g = G(); g.people = g.people || {};
  return g.people[id] || (g.people[id] = { met: 0, rel: 0, last: null, lastLabel: '', lastDay: '', used: [], gift: '' });
}
const entry0 = id => R.dialogue && R.dialogue[id] || (G().fillers && G().fillers[id] && G().fillers[id].dialogue) || null;
const heroEntries = {};
function entry(id) { // heroes also get their opening lines (bossLines) as first-meeting entries, so nothing is written twice
  const e = entry0(id);
  if (HERO[id] && R.bossLines && R.bossLines[id]) {
    if (!heroEntries[id]) { const o = Object.assign({}, e || {}); o.talk = Object.keys(R.bossLines[id]).map(h => ({ id: 'open:' + h, if: { hero: h, met: 0 }, text: R.bossLines[id][h] })).concat(o.talk || []); heroEntries[id] = o; }
    return heroEntries[id];
  }
  return e;
}
const persona = e => R.personalities[(e && e.personality) || 'dry'] || R.personalities.dry || { shareRel: 0, tones: {} };
const nameOf = id => (R.props && R.props[id] && R.props[id].name) || (HERO[id] && HERO[id].name) || (PARTNERS[id] && PARTNERS[id].name) || (K.npcDef(id) && K.npcDef(id).name) || id;
const know = id => !!(G().know && G().know[id]);
const hasFlag = f => f.startsWith('know:') ? know(f.slice(5)) : !!G().flags[f];
const ids4 = id => [id, 'n_' + id, 'h_' + id, 'w_' + id];
const isDead = id => ids4(id).some(k => G().dead[k]) || G().graves.some(q => q.sp === id);
const isCaught = id => ids4(id).some(k => G().caughtP[k]) || !!G().caught[id];
function carries(id) { const g = G(); return [...g.party, ...g.box, ...((g.gym && g.gym.slots) || []).map(s => s.c)].some(c => c.sp === id || (K.SP[c.sp] && K.SP[c.sp].line === id)) || (g.items[id] || 0) > 0; }
function stateIs(v) {
  const g = G(), drinks = (g.drinkLog || []).filter(t => g.t - t < 180).length;
  const drunk = drinks >= 2, blur = g.blurT > 0, high = EF.has(g.me, 'reveal') || EF.has(g.me, 'speed') || EF.has(g.me, 'tint');
  return v === 'drunk' ? drunk : v === 'blurred' ? blur : v === 'high' ? high : v === 'sober' ? !drunk && !blur && !high : false;
}

const qs = id => (G().quests && G().quests[id]) || {};
/* ---------- conditions: all keys must match; the more keys a line matches, the better it is ---------- */
const COND_KEYS = ['hero', 'notHero', 'met', 'metMin', 'metMax', 'returning', 'flag', 'notFlag', 'know', 'notKnow', 'relMin', 'relMax', 'killed', 'caught', 'beat', 'solved', 'debtMin', 'state', 'carry', 'notCarry', 'hour', 'night', 'day', 'from', 'until', 'last', 'lastNot', 'zone', 'quest', 'questDone', 'questNot', 'questLocked', 'step'];
function cond(c, pid) { // -1 = no match, otherwise how many conditions matched (specificity)
  if (!c) return 0;
  const g = G(), pp = pst(pid || '_'); let n = 0;
  for (const k in c) {
    const v = c[k], A = [].concat(v); let ok;
    switch (k) {
      case 'hero': ok = A.includes(K.heroId()); break;
      case 'notHero': ok = !A.includes(K.heroId()); break;
      case 'met': ok = pp.met === v; break;
      case 'metMin': ok = pp.met >= v; break;
      case 'metMax': ok = pp.met <= v; break;
      case 'returning': ok = !!pp.lastDay && ((pp.lastDay !== today()) === !!v); break;
      case 'flag': ok = A.every(hasFlag); break;
      case 'notFlag': ok = !A.some(hasFlag); break;
      case 'know': ok = A.every(know); break;
      case 'notKnow': ok = !A.some(know); break;
      case 'relMin': ok = pp.rel >= v; break;
      case 'relMax': ok = pp.rel <= v; break;
      case 'killed': ok = A.every(isDead); break;
      case 'caught': ok = A.every(isCaught); break;
      case 'beat': ok = A.every(h => g.beat.includes(h)); break;
      case 'solved': ok = A.every(w => g.solved.includes(w)); break;
      case 'debtMin': ok = (g.debt || 0) >= v; break;
      case 'state': ok = A.every(stateIs); break;
      case 'carry': ok = A.every(carries); break;
      case 'notCarry': ok = A.every(x => !carries(x)); break;
      case 'hour': ok = inHour(v); break;
      case 'night': ok = isNight() === !!v; break;
      case 'day': ok = dayKey() === v; break;
      case 'from': ok = dayIdx(dayKey()) >= dayIdx(v); break;
      case 'until': ok = dayIdx(dayKey()) <= dayIdx(v); break;
      case 'last': ok = pp.last === v; break;
      case 'lastNot': ok = pp.last !== v; break;
      case 'zone': ok = K.zoneAt(g.p.x, g.p.y).id === v; break;
      case 'quest': ok = A.every(q => { const t = qs(q); return !!t.started && !t.done; }); break;
      case 'questDone': ok = A.every(q => !!qs(q).done); break;
      case 'questNot': ok = A.every(q => { const t = qs(q); return !t.started && !t.locked; }); break;
      case 'questLocked': ok = A.every(q => !!qs(q).locked); break;
      case 'step': ok = A.every(x => { const [q, n] = x.split(':'), t = qs(q); return !!t.started && !t.done && t.step === +n; }); break;
      default: ok = false;
    }
    if (!ok) return -1; n++;
  }
  return n;
}

/* ---------- relationship ---------- */
const rel = id => pst(id).rel;
function adjust(id, d) {
  if (!d) return; const pp = pst(id), old = pp.rel; pp.rel = clamp(pp.rel + d, -5, 5);
  if (pp.rel !== old) { const g = G(); LOD.pop(g.p.x, g.p.y - 30, d > 0 ? '♥' : '💢', d > 0 ? '#ff6b9a' : '#ff8a8a'); }
}
const priceMul = id => clamp(1 - .05 * rel(id), .75, 1.25);        // friends get discounts
const refuses = id => rel(id) <= -3;                                // enemies do not trade
const hunting = id => { const e = entry0(id), d = K.npcDef(id); return rel(id) <= -4 && !!d && d.canDie !== false && !(e && e.hunt === false) && !K.gone('n_' + id); };

/* ---------- knowledge ---------- */
function tell(kid, pid) {
  const g = G(), k = R.knowledge[kid]; g.know = g.know || {};
  if (!k || g.know[kid]) return false;
  g.know[kid] = { by: pid, day: dayKey() }; LOD.tone(1046, .08, 'triangle', .05); LOD.toast('📓 ' + k.name, 2.2);
  return true;
}

/* ---------- text templates ---------- */
function tpl(text, pid) {
  const pp = pst(pid || '_'), g = G();
  return String(text).replace(/\{(\w+)\}/g, (m, k) => ({ hero: HERO[K.heroId()] ? HERO[K.heroId()].name : 'you', name: nameOf(pid), last: pp.lastLabel || 'that', debt: g.debt || 0, met: pp.met, kr: g.kr }[k] ?? m));
}

/* ---------- effects of a line or a reply ---------- */
function effects(pid, e, tones) {
  const g = G(), pe = persona(entry0(pid));
  let d = e.rel;
  if (d && typeof d === 'object') { for (const k in d) adjust(k, d[k]); d = null; }  // rel: { berit: +3, pelle: -3 } = how several people feel
  else if (d == null && e.tone) d = (pe.tones || {})[e.tone] || 0;
  if (d) adjust(pid, d);
  for (const q of [].concat(e.quest || [])) startQuest(q, pid);
  if (e.takeCreature) K.takeCreature(e.takeCreature);
  for (const k in (e.set || {})) g.flags[k] = e.set[k];
  for (const k in (e.give || {})) K.give(k, e.give[k]);
  for (const k in (e.take || {})) K.take(k, e.take[k]);
  if (e.kr) g.kr = Math.max(0, g.kr + e.kr);
  if (e.debt) g.debt = Math.max(0, (g.debt || 0) + e.debt);
  if (e.tell) for (const t of [].concat(e.tell)) tell(t, pid);
}

/* ---------- quests (data: quests). A step is done when its conditions match; turnIn = only when you talk to that person ---------- */
function startQuest(id, by) {
  const g = G(), q = R.quests && R.quests[id]; if (!q || !K.rel(q)) return false;
  g.quests = g.quests || {}; const st = g.quests[id]; if (st && (st.started || st.locked)) return false;
  g.quests[id] = { started: true, step: 0, by, day: dayKey() };
  for (const l of q.locks || []) { const o = g.quests[l]; if (!o || !o.started) g.quests[l] = { locked: true }; }   // choosing this closes the others
  LOD.tone(784, .08, 'triangle', .05); LOD.toast('📜 ' + q.name, 2.4); return true;
}
function finishQuest(id, pid) {
  const g = G(), q = R.quests[id], st = g.quests[id]; st.done = true;
  const c = (q.rewards || []).map(r => ({ r, s: cond(r.if, pid || '_') })).filter(x => x.s >= 0).sort((a, b) => b.s - a.s)[0];
  if (c) effects(pid || q.giver, c.r);
  LOD.tone(1046, .1, 'triangle', .06); LOD.haptic('success'); LOD.callout('QUEST DONE', q.name + (c && c.r.text ? ': ' + tpl(c.r.text) : ''), 'good');
}
function advanceQuests(pid) {
  const g = G(); if (!g.quests) return;
  for (let guard = 0, moved = true; moved && guard < 6; guard++) {
    moved = false;
    for (const id in g.quests) {
      const st = g.quests[id], q = R.quests && R.quests[id]; if (!q || !st.started || st.done) continue;
      const step = q.steps[st.step]; if (!step || (step.turnIn && step.turnIn !== pid)) continue;
      if (cond(step.done, pid || '_') < 0) continue;
      for (const k in (step.take || {})) K.take(k, step.take[k]);            // hand in items
      if (step.takeCreature) K.takeCreature(step.takeCreature);
      effects(pid || step.turnIn || q.giver, step);
      st.step++; moved = true;
      if (st.step >= q.steps.length) finishQuest(id, pid); else LOD.toast('📜 ' + q.name + ' ✓', 1.6);
    }
  }
}
let qT = 0;
function tick(dt) { if ((qT += dt) > 1) { qT = 0; advanceQuests(null); } }

/* ---------- the talk: pick the best matching unused line, say it, offer replies, remember the answer ---------- */
async function talk(pid, o = {}) {
  const e = entry(pid) || {}, pp = pst(pid), name = o.name || nameOf(pid), g = G();
  const share = persona(e).shareRel;
  advanceQuests(pid);                                           // hand-ins to this person happen before they speak
  // help: friends give you something once per real day
  if (e.help && pp.rel >= (e.help.relMin != null ? e.help.relMin : 4) && pp.gift !== today()) {
    pp.gift = today(); await K.say2(name, tpl(e.help.text || '…', pid)); for (const k in (e.help.give || {})) K.give(k, e.help.give[k]); LOD.toast('🎁 ' + Object.keys(e.help.give || {}).map(k => (ITEMS[k] ? ITEMS[k].em : '') + '×' + e.help.give[k]).join(' '), 2);
  }
  const key = o.list || 'talk', list = e[key] || [], cands = [];
  list.forEach((l, i) => {
    if (!K.rel(l)) return;                                     // release / requires
    const id = l.id || key + i, s = cond(l.if, pid); if (s < 0) return;
    if (l.tell && pp.rel < share && !(l.if && l.if.relMin != null)) return;   // they do not share with people they do not trust
    cands.push({ l, id, s });
  });
  if (e.rumours && R.rumours) (R.rumours[dayKey()] || []).forEach((t, i) => { const id = 'rumour:' + dayKey() + ':' + i; if (!pp.used.includes(id)) cands.push({ l: { text: pick(['Word is: ', 'I heard: ', 'They say: ']) + t, _rumour: t }, id, s: 0 }); });
  let best = null;
  if (cands.length) {
    const unused = e.repeat ? cands : cands.filter(c => !pp.used.includes(c.id));   // repeat: true (props) = lines may be said again
    if (unused.length) { const top = Math.max(...unused.map(c => c.s)); best = unused.find(c => c.s === top); }
    else { pp.used = pp.used.filter(u => !cands.some(c => c.id === u)); const top = Math.max(...cands.map(c => c.s)); best = cands.find(c => c.s === top); } // pool used up: start over
    if (!e.repeat) pp.used.push(best.id);
  }
  const text = best ? tpl(best.l.text, pid) : (o.fallback ? tpl(o.fallback, pid) : null);
  if (text == null) return { none: true };
  const reps = best && !FAKE.skipReplies ? (best.l.replies || []).filter(r => K.rel(r) && cond(r.if, pid) >= 0) : [];
  let reply = null;
  if (reps.length) {
    const v = await K.ask(text, reps.map((r, i) => ({ label: tpl(r.label, pid), value: i, dis: Object.keys(r.take || {}).some(k => (g.items[k] || 0) < r.take[k]) || (r.kr < 0 && g.kr < -r.kr) })), { who: name });
    reply = reps[v];
  } else await K.say2(name, text);
  if (best) { effects(pid, best.l); if (best.l._rumour) { g.heard = g.heard || {}; g.heard[best.id] = best.l._rumour; } }
  let fight = false;
  if (reply) {
    pp.last = reply.id || reply.label; pp.lastLabel = tpl(reply.label, pid);
    if (reply.text) await K.say2(name, tpl(reply.text, pid));
    effects(pid, reply); fight = !!reply.fight;
  }
  pp.met++; pp.lastDay = today(); g.flags['talked:' + pid] = 1;
  advanceQuests(pid);
  return { line: best && best.l, reply, fight, text };
}

/* ---------- people who know each other ---------- */
const friendsOf = id => { const out = new Set((entry0(id) && entry0(id).friends) || []); for (const k in (R.dialogue || {})) if ((R.dialogue[k].friends || []).includes(id)) out.add(k); return [...out].filter(f => f !== id); };
function reactGone(sp, how) {
  const g = G(), s = K.SP[sp]; if (!s) return;
  const ref = s.ref || sp, dead = how === 'dead';
  g.flags[(dead ? 'killed:' : 'caught:') + ref] = 1;
  if (s.kind === 'creature') return;
  for (const f of friendsOf(ref)) {
    adjust(f, dead ? -3 : -1);
    if (dead) { g.flags['grudge:' + f] = 1; for (const ff of friendsOf(f)) if (ff !== ref) adjust(ff, -1); }   // the friend warns their own friends
  }
}
async function afterFight(id, how) { // a hunter was dealt with: the grudge cools down
  const pp = pst(id); if (how !== 'dead') pp.rel = Math.max(pp.rel, -2);
}

/* ---------- the wives ---------- */
function reacts(id) {
  const e = entry0(id), w = e && e.wife, guy = PARTNERS[id].guy === K.heroId(), r = w && w.reacts && w.reacts[K.heroId()];
  return { mul: r && r.mul != null ? r.mul : guy ? 1.4 : 1, turns: r && r.turns != null ? r.turns : guy ? 1 : 0 };
}
function wifeLines(id) {
  const e = entry0(id), w = e && e.wife; if (!w || !w.lines) return null;
  const pool = w.lines.filter(l => K.rel(l));
  const rights = pool.filter(l => l.right).map(l => ({ l, s: cond(l.right, id) })).filter(c => c.s >= 0).sort((a, b) => b.s - a.s);
  const right = rights.length ? rights[0].l : null; if (!right) return null;
  const wrongs = pool.filter(l => l !== right).sort(() => Math.random() - .5).slice(0, 3);
  return [right].concat(wrongs).sort(() => Math.random() - .5).map(l => ({ label: '"' + tpl(l.text, id) + '"' + (l === right && know('wife:' + id) ? ' 💡' : ''), value: l === right ? 'good' : 'bad' }));
}
function wifeAfter(id, how) {
  const pp = pst(id), g = G();
  pp.last = how; pp.lastDay = today();
  adjust(id, { right: 2, sorry: 1, promise: (g.debt || 0) >= 3 ? -2 : 0, wrong: -1, endured: 1 }[how] || 0);
}

/* ---------- notes page ---------- */
const heart = r => r >= 3 ? '💛' : r >= 1 ? '🙂' : r <= -3 ? '💢' : r <= -1 ? '😒' : '😐';
function notes() {
  const g = G(), out = ['📓 WHAT YOU KNOW'];
  let n = 0;
  for (const id in R.knowledge) {
    const k = R.knowledge[id]; if (!K.rel(k)) continue;
    const got = g.know && g.know[id];
    if (got) { n++; out.push('• ' + k.name + ' (' + nameOf(got.by) + ', ' + got.day.toUpperCase() + ')' + (k.text ? '\n   ' + tpl(k.text) : '')); }
    else if (k.listed) { n++; out.push('• ???'); }
  }
  if (!n) out.push('Nothing yet. People talk.');
  const q = g.quests || {}, ids = Object.keys(q).filter(k => R.quests[k]);
  out.push('', '📜 QUESTS');
  if (!ids.length) out.push('None yet. People ask for things.');
  for (const id of ids) { const t = q[id], d = R.quests[id]; out.push(t.done ? '✓ ' + d.name : t.locked && !t.started ? '✗ ' + d.name + ' (nobody asks any more)' : '• ' + d.name + ' (' + nameOf(d.giver) + ')\n   ' + tpl((d.steps[t.step] || {}).text || '')); }
  const hr = Object.values(g.heard || {});
  if (hr.length) { out.push('', '📰 RUMOURS'); hr.forEach(t => out.push('• ' + t)); }
  out.push('', '👥 PEOPLE');
  const met = Object.keys(g.people || {}).filter(id => g.people[id].met > 0 && id !== '_');
  if (!met.length) out.push('Nobody yet.');
  for (const id of met) out.push(heart(g.people[id].rel) + ' ' + nameOf(id) + (g.people[id].last ? ' · you said: ' + g.people[id].lastLabel : ''));
  return out.join('\n');
}

const visible = (d, id) => !d || !d.show || cond(d.show, id) >= 0;   // night-only people, Tuesday-only stalls …

/* ---------- fillers: random shoppers get their own personality and their own lines (no line is shared) ---------- */
function decorateFillers() {
  const g = G(), F = R.fillers; if (!F || !F.voices || !g.fillers) return;
  const ids = Object.keys(g.fillers), pers = Object.keys(F.voices), pool = {};
  pers.forEach(p => { pool[p] = F.voices[p].slice().sort(() => Math.random() - .5); });
  const per = Math.max(1, Math.floor(F.voices[pers[0]].length / Math.max(1, Math.ceil(ids.length / pers.length))));
  ids.forEach((id, i) => {
    const f = g.fillers[id]; if (f.dialogue) return;
    const p = pers[i % pers.length], mine = pool[p].splice(0, per);
    f.personality = p; f.dialogue = { personality: p, talk: mine.map(t => typeof t === 'string' ? { text: t } : t) };
  });
}

/* ---------- authoring check: warn about unknown condition keys, unknown knowledge ids and items ---------- */
function validate() {
  const bad = [], chk = (c, where) => { for (const k in (c || {})) if (!COND_KEYS.includes(k)) bad.push(where + ': unknown condition "' + k + '"'); };
  const fx = (e, where) => { for (const t of [].concat(e.tell || [])) if (!R.knowledge[t]) bad.push(where + ': tell → unknown knowledge "' + t + '"'); for (const k of Object.keys(e.give || {}).concat(Object.keys(e.take || {}))) if (!ITEMS[k]) bad.push(where + ': unknown item "' + k + '"'); if (e.tone && !['kind', 'rude', 'funny', 'bribe', 'honest', 'lie', 'flirt'].includes(e.tone)) bad.push(where + ': unknown tone "' + e.tone + '"'); };
  for (const pid in (R.dialogue || {})) {
    const e = R.dialogue[pid];
    if (!K.npcDef(pid) && !HERO[pid] && !PARTNERS[pid] && !(R.props && R.props[pid])) bad.push('dialogue.' + pid + ': no such person');
    if (e.personality && !R.personalities[e.personality]) bad.push('dialogue.' + pid + ': unknown personality "' + e.personality + '"');
    for (const f of e.friends || []) if (!K.npcDef(f) && !HERO[f] && !PARTNERS[f]) bad.push('dialogue.' + pid + ': friend "' + f + '" does not exist');
    (e.talk || []).forEach((l, i) => { const w = 'dialogue.' + pid + '.talk[' + i + ']'; chk(l.if, w); fx(l, w); (l.replies || []).forEach((r, j) => { chk(r.if, w + '.replies[' + j + ']'); fx(r, w + '.replies[' + j + ']'); }); });
    ((e.wife && e.wife.lines) || []).forEach((l, i) => chk(l.right, 'dialogue.' + pid + '.wife.lines[' + i + '].right'));
  }
  for (const id in (R.quests || {})) { const q = R.quests[id], w = 'quests.' + id;
    if (!K.npcDef(q.giver) && !(R.props && R.props[q.giver]) && !HERO[q.giver]) bad.push(w + ': giver "' + q.giver + '" does not exist');
    (q.steps || []).forEach((st, i) => { chk(st.done, w + '.steps[' + i + '].done'); if (st.turnIn && !K.npcDef(st.turnIn) && !(R.props && R.props[st.turnIn]) && !PARTNERS[st.turnIn]) bad.push(w + '.steps[' + i + ']: turnIn "' + st.turnIn + '" does not exist'); fx(st, w + '.steps[' + i + ']'); });
    (q.rewards || []).forEach((r, i) => { chk(r.if, w + '.rewards[' + i + '].if'); fx(r, w + '.rewards[' + i + ']'); });
    for (const l of q.locks || []) if (!R.quests[l]) bad.push(w + ': locks unknown quest "' + l + '"');
  }
  for (const id in (R.knowledge || {})) { const k = R.knowledge[id]; if (!k.name) bad.push('knowledge.' + id + ': missing name'); }
  return bad;
}

return {
  talk, cond, rel, adjust, priceMul, refuses, hunting, tell, know, notes, reactGone, afterFight, reacts, wifeLines, wifeAfter, decorateFillers, validate,
  startQuest, advanceQuests, tick, visible, qs, pst, entry, friendsOf, dayKey, hour, isNight, nameOf, tpl,
  test: { set hour(v) { FAKE.hour = v; }, set skipReplies(v) { FAKE.skipReplies = !!v; } }
};
};
