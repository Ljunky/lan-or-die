/* LAN OR DIE – engine.js
   Shared by every mission: storage, Web Audio synth + mute, character data,
   the character select screen and the pose animations.

   Public API (window.LOD):
     LOD.showCharacterSelect(onSelected, opts)  -> shows the select screen; calls onSelected(character) after the pose
         opts.container   element to cover (default #stage or body)
         opts.label       small text above the title, e.g. 'Mission 1 · Sneak Out'
         opts.preselect   character id to start on (default: last pick)
         opts.onBack      if set, a Back button is shown and calls this
         opts.note        small line under the title (e.g. the player's badges)
     Game core (loop, input, HUD, score, missions, backend): see the CORE block at the end and ENGINE.md.
     LOD.getCharacter()        -> the selected character (or null)
     LOD.charMod(key, def)     -> gameplay modifier from characters.json "mods" (empty = just for fun)
     LOD.charAvatar(char, px)  -> round canvas avatar for drawing in a mission
     LOD.loadCharacters()      -> Promise<characters[]>
     LOD.tone(f, dur, type, vol, slide, delay), LOD.noise(dur, vol, delay, freq, filterType)
     LOD.isMuted(), LOD.setMuted(bool), LOD.toggleMute(), LOD.onMute(fn)
     LOD.store.get(key, default), LOD.store.set(key, value)
     LOD.reducedMotion   true when the phone asks for less motion
*/
(() => {
'use strict';

/* ---------------- storage ---------------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rand = (a, b) => a + Math.random() * (b - a);
const mqReduce = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

/* ---------------- audio (starts only after the first tap) ---------------- */
let AC = null, master = null, noiseBuf = null, unlocked = false, muted = store.get('lod.muted', false);
const muteListeners = [];
function ac() {
  if (!unlocked) return null;
  if (!AC) {
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      const comp = AC.createDynamicsCompressor();
      master = AC.createGain(); master.gain.value = .9;
      master.connect(comp); comp.connect(AC.destination);
      noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { AC = null; }
  }
  if (AC && AC.state === 'suspended') AC.resume().catch(() => {});
  return AC;
}
function unlockAudio() { unlocked = true; ac(); }
['pointerdown', 'touchend', 'keydown'].forEach(ev => window.addEventListener(ev, unlockAudio, { capture: true, passive: true }));

function tone(f, d = .08, type = 'square', v = .04, slide = 0, delay = 0) {
  if (muted) return; const a = ac(); if (!a) return;
  try {
    const o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime + delay;
    o.type = type; o.frequency.setValueAtTime(f, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t0 + d);
    g.gain.setValueAtTime(v, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + d + .02);
  } catch (e) {}
}
function noise(d = .2, v = .2, delay = 0, freq = 1200, ftype = 'lowpass') {
  if (muted) return; const a = ac(); if (!a || !noiseBuf) return;
  try {
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(), t0 = a.currentTime + delay;
    s.buffer = noiseBuf; f.type = ftype; f.frequency.value = freq;
    g.gain.setValueAtTime(v, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
    s.connect(f); f.connect(g); g.connect(master); s.start(t0, Math.random() * .5); s.stop(t0 + d + .02);
  } catch (e) {}
}
function setMuted(m) { muted = !!m; store.set('lod.muted', muted); if (muted) Object.keys(loops).forEach(k => setLoop(k, 0)); muteListeners.forEach(fn => { try { fn(muted); } catch (e) {} }); }
/* LAUNCH: looping filtered noise for ambience (rain). setLoop(id, vol) fades it in or out. */
const loops = {};
function setLoop(id, vol, freq = 1200, ftype = 'lowpass') {
  const a = ac(); if (!a || !noiseBuf) return;
  let L = loops[id];
  if (!L) {
    if (!vol) return;
    try {
      const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
      s.buffer = noiseBuf; s.loop = true; f.type = ftype; f.frequency.value = freq; g.gain.value = 0;
      s.connect(f); f.connect(g); g.connect(master); s.start(); L = loops[id] = { g };
    } catch (e) { return; }
  }
  try { L.g.gain.setTargetAtTime(muted ? 0 : vol, a.currentTime, .35); } catch (e) {}
}

/* ---------------- MUSIC: tiny step sequencer, original tunes ----------------
   LOD.music.play('title' | 'game' | null), LOD.music.intensity(0..1), LOD.music.duck(bool)
   'title' = happy quest march. 'game' = calm pad that turns into a stressful chase as intensity rises. */
const midi = n => 440 * Math.pow(2, (n - 69) / 12);
const MUS = { song: null, i: 0, step: 0, next: 0, bus: null, duck: false, timer: 0 };
function mBus(a) {
  if (!MUS.bus) { MUS.bus = a.createGain(); MUS.bus.gain.value = 1; MUS.bus.connect(master); }
  return MUS.bus;
}
function mNote(a, n, t, d, type, v, slide) {
  try {
    const o = a.createOscillator(), g = a.createGain(), f = midi(n);
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(f * slide, t + d);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g); g.connect(mBus(a)); o.start(t); o.stop(t + d + .03);
  } catch (e) {}
}
function mNoise(a, t, d, v, freq, ft) {
  if (!noiseBuf) return;
  try {
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = noiseBuf; f.type = ft; f.frequency.value = freq;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    s.connect(f); f.connect(g); g.connect(mBus(a)); s.start(t, Math.random() * .5); s.stop(t + d + .02);
  } catch (e) {}
}
function mKick(a, t, v) {
  try {
    const o = a.createOscillator(), g = a.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + .13);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + .18);
    o.connect(g); g.connect(mBus(a)); o.start(t); o.stop(t + .2);
  } catch (e) {}
}
// title: 8 bars of 8th notes in C major (0 = rest)
const T_LEAD = [72, 0, 76, 79, 84, 0, 79, 76, 77, 0, 81, 84, 81, 0, 79, 0, 76, 0, 79, 84, 86, 0, 84, 83, 81, 0, 79, 0, 79, 0, 0, 0,
  72, 0, 76, 79, 84, 0, 86, 88, 89, 0, 88, 86, 84, 0, 81, 0, 79, 0, 84, 0, 88, 86, 84, 83, 84, 0, 0, 0, 79, 0, 84, 0];
const T_ROOT = [48, 53, 48, 43, 48, 53, 43, 48], T_BASS = [0, 0, 12, 0, 7, 0, 12, 0];
const G_ROOT = [45, 41, 43, 40], G_BASS = [0, 0, 12, 0, 7, 0, 12, 3];
const SONGS = {
  title(a, k, t) { // happy quest march, 140 bpm
    const sp = 60 / 140 / 2, j = k % 8, bar = (k >> 3) % 8, n = T_LEAD[k % 64];
    if (n) { mNote(a, n, t, sp * (T_LEAD[(k + 1) % 64] ? 1.5 : 2.6), 'square', .085); mNote(a, n - 12, t, sp * 1.2, 'triangle', .05); }
    mNote(a, T_ROOT[bar] + T_BASS[j], t, sp * .9, 'triangle', .2);
    mNote(a, T_ROOT[bar] + 24 + [0, 4, 7, 12][j % 4], t, sp * .7, 'square', .025); // sparkle arp
    if (j % 4 === 0) mKick(a, t, .45);
    if (j === 2 || j === 6) mNoise(a, t, .1, .2, 1800, 'bandpass'); // snare
    mNoise(a, t, .03, j % 2 ? .1 : .05, 7000, 'highpass');
    if (j === 0) mNote(a, T_ROOT[bar] + 24, t, sp * 7, 'triangle', .05);
    return sp;
  },
  game(a, k, t) { // starts tense, ends as a full-on chase: 100 -> 176 bpm
    const i = MUS.i, sp = 60 / (100 + 76 * i) / 2, j = k % 8, bar = (k >> 3) % 4, root = G_ROOT[bar], minor = bar !== 3;
    mNote(a, root + G_BASS[j], t, sp * .85, 'triangle', .2);                                   // driving bass from the start
    if (i > .55) mNote(a, root + G_BASS[j] + 12, t, sp * .6, 'sawtooth', .045);               // grit layer
    if (i < .5 && j === 0) { mNote(a, root + 24, t, sp * 8, 'triangle', .06); mNote(a, root + 24 + (minor ? 3 : 4), t, sp * 8, 'triangle', .045); }
    if (j % 2 === 1 || i > .6) mNoise(a, t, .03, .09, 7000, 'highpass');                      // hats
    if (i > .2 && (j % 4 === 0 || (i > .5 && j % 2 === 0))) mKick(a, t, .5);                  // kick -> four on the floor
    if (i > .35 && (j === 2 || j === 6)) mNoise(a, t, .12, .26, 1800, 'bandpass');            // snare
    if (i > .3) { const ch = minor ? [0, 3, 7, 12] : [0, 4, 7, 12]; mNote(a, root + 24 + ch[j % 4] + (i > .7 && j >= 4 ? 12 : 0), t, sp * .8, 'square', .045); }
    if (i > .7 && j === 0 && bar % 2 === 0) { mNote(a, 81, t, sp * 1.5, 'square', .06); mNote(a, 80, t + sp * 2, sp * 1.5, 'square', .06); } // alarm
    if (i > .8 && bar === 3 && j >= 4) mNote(a, 50 - j, t, sp * .9, 'sine', .25, .6);       // tom fill
    return sp;
  }
};
function musicTick() {
  if (!MUS.song) return; const a = ac(); if (!a) return;
  mBus(a).gain.setTargetAtTime(muted ? 0 : MUS.duck ? .3 : 1, a.currentTime, .1);
  if (MUS.next < a.currentTime) MUS.next = a.currentTime + .06;
  while (MUS.next < a.currentTime + .2) { const d = muted ? (MUS.song === 'title' ? 60 / 140 / 2 : 60 / (100 + 76 * MUS.i) / 2) : SONGS[MUS.song](a, MUS.step, MUS.next); MUS.step++; MUS.next += d; }
}
const music = {
  play(name) {
    if (MUS.song === name) return;
    MUS.song = name && SONGS[name] ? name : null; MUS.step = 0; MUS.next = 0;
    const a = AC; if (a && MUS.bus) { MUS.bus.gain.cancelScheduledValues(a.currentTime); MUS.bus.gain.setValueAtTime(0, a.currentTime); } // cut the old song
    if (MUS.song && !MUS.timer) MUS.timer = setInterval(musicTick, 50);
  },
  intensity(i) { MUS.i = Math.max(0, Math.min(1, i)); },
  duck(on) { MUS.duck = !!on; },
  get song() { return MUS.song; }
};

/* fighting-game style stinger shared by every pose */
function hitStinger() {
  noise(.28, .5, 0, 1600);
  tone(170, .4, 'sine', .55, -125);
  tone(85, .35, 'square', .12, -40);
}

/* ---------------- characters ---------------- */
const PALETTE = ['#3ddc84', '#8c6cff', '#ff4fa3', '#f5c242', '#f7931a', '#3fa7ff'];
const ACRONYMS = { aik: 'AIK', atm: 'ATM', adc: 'ADC', dif: 'DIF', hp: 'HP' };
const labelize = k => String(k).split(/[_\s]+/).filter(Boolean).map(w => ACRONYMS[w.toLowerCase()] || w[0].toUpperCase() + w.slice(1)).join(' ');
const slug = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '');

const FALLBACK = [
  ['bigwman', 'BigWman', 'The Spreadsheet Titan', 'Tank / Finance', 'YES!'],
  ['wizcudi', 'Wizcudi', 'The Midlane Overthinker', 'Mid / Meter Defense', 'Who left this light on?!'],
  ['jrohn', 'Jrohn', 'The Bohemian Cremator', 'Support / Progressive Disrober', 'I love this!'],
  ['loken', 'Löken', 'The Gilded Paladin', 'Bruiser / Squad Glue', 'Stick together, boys!'],
  ['ljunky', 'Ljunky', 'The Crypto Ranger', 'Jungle & ADC / Game Master', 'Have you checked the Bitcoin price today?']
].map(([id, name, archetype, role, catchphrase]) => ({ id, name, archetype, role, catchphrase, stats: {} }));

function isNegative(s) {
  return s.negative === true || s.positive === false || /neg|weak|minus|bad|curse/i.test(String(s.type || s.kind || ''));
}
function normalize(raw) {
  const list = Array.isArray(raw) ? raw : (raw && (raw.game_roster || raw.characters || raw.roster)) || [];
  return list.map((c, i) => {
    const id = c.id || slug(c.name || 'char' + i);
    const labels = c.stat_labels || {};
    let stats = [];
    if (Array.isArray(c.stats)) stats = c.stats.map(s => ({ key: s.key || slug(s.name || s.label), name: s.name || s.label || labelize(s.key), value: +(s.value != null ? s.value : s.v) || 0 }));
    else if (c.stats && typeof c.stats === 'object') stats = Object.entries(c.stats).map(([k, v]) => ({ key: k, name: labels[k] || labelize(k), value: +v || 0 }));
    stats = stats.slice(0, 5).map(s => Object.assign(s, { value: Math.max(0, Math.min(10, Math.round(s.value))) }));
    let skills = (c.skills || []).map(s => typeof s === 'string' ? { name: s } : s);
    if (c.weakness) skills.push(Object.assign({ type: 'negative' }, typeof c.weakness === 'string' ? { name: c.weakness } : c.weakness));
    skills = skills.map(s => ({ name: s.name || '?', icon: s.icon || (isNegative(s) ? '⚠️' : '⭐'), effect: s.effect || s.description || '', neg: isNegative(s) }));
    skills = skills.filter(s => !s.neg).slice(0, 4).concat(skills.filter(s => s.neg).slice(0, 1));
    return {
      id, name: c.name || id, archetype: c.archetype || c.title || '', role: c.role || '',
      catchphrase: c.catchphrase || c.catch_phrase || c.quote || '',
      color: c.color || PALETTE[i % PALETTE.length],
      image: c.avatar_file || c.image || c.img || c.portrait || id + '.png',
      backstory: c.backstory_short || c.backstory || c.bio || '',
      easterEgg: c.easter_egg || c.easterEgg || '',
      stats, skills, mods: c.mods || {}, raw: c
    };
  });
}
function placeholderSrc(c) {
  const ch = esc((c.name || '?').slice(0, 1).toUpperCase());
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 600"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + c.color + '"/><stop offset="1" stop-color="#121c25"/></linearGradient></defs>' +
    '<circle cx="150" cy="120" r="80" fill="url(#g)"/><rect x="60" y="215" width="180" height="300" rx="70" fill="url(#g)"/>' +
    '<text x="150" y="150" font-family="Impact,Arial Black,sans-serif" font-size="90" text-anchor="middle" fill="#0a1016">' + ch + '</text></svg>';
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

let CHARS = null, loading = null;
function loadCharacters() {
  if (CHARS) return Promise.resolve(CHARS);
  if (loading) return loading;
  loading = fetch('characters.json', { cache: 'no-cache' })
    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(normalize)
    .catch(err => { console.warn('[LOD] characters.json could not be loaded, using built-in names.', err); return normalize(FALLBACK); })
    .then(list => {
      if (!list.length) list = normalize(FALLBACK);
      return Promise.all(list.map(c => new Promise(res => {
        const img = new Image();
        img.onload = () => { c.src = c.image; c.img = img; res(); };
        img.onerror = () => { c.src = placeholderSrc(c); const p = new Image(); p.onload = p.onerror = () => res(); p.src = c.src; c.img = p; };
        img.src = c.image;
      }))).then(() => (CHARS = list));
    });
  return loading;
}

let current = null;
function getCharacter() { return current; }
function charMod(key, def) { const m = current && current.mods; return m && m[key] != null ? m[key] : def; }

const avatarCache = {};
function charAvatar(c, px = 64) {
  if (!c || !c.img || !c.img.naturalWidth) return null;
  const k = c.id + ':' + px; if (avatarCache[k]) return avatarCache[k];
  const cv = document.createElement('canvas'); cv.width = cv.height = px;
  const x = cv.getContext('2d');
  x.fillStyle = '#121c25'; x.beginPath(); x.arc(px / 2, px / 2, px / 2, 0, 7); x.fill();
  x.save(); x.beginPath(); x.arc(px / 2, px / 2, px / 2 - 3, 0, 7); x.clip();
  // head and shoulders: top ~38% of the full-body image
  const iw = c.img.naturalWidth, ih = c.img.naturalHeight, sw = iw * .62, sh = sw, sx = (iw - sw) / 2, sy = ih * .0;
  x.drawImage(c.img, sx, sy, sw, sh, 2, 2, px - 4, px - 4);
  x.restore();
  x.strokeStyle = c.color; x.lineWidth = 3; x.beginPath(); x.arc(px / 2, px / 2, px / 2 - 1.5, 0, 7); x.stroke();
  return (avatarCache[k] = cv);
}

/* ---------------- styles ---------------- */
const CSS = `
.cs{position:absolute;inset:0;z-index:40;display:flex;flex-direction:column;gap:10px;overflow-y:auto;overflow-x:hidden;
  padding:12px max(14px,3.5vw) max(12px,env(safe-area-inset-bottom,0px));background:#0a1016;color:#e8eef3;
  font-family:'Barlow','Segoe UI',system-ui,-apple-system,sans-serif;touch-action:pan-y;-webkit-user-select:none;user-select:none;--c:#f5a524}
.cs *{box-sizing:border-box}
.cs-glow{position:absolute;inset:0;pointer-events:none;background:radial-gradient(90% 55% at 50% 28%,var(--c),transparent 70%);opacity:.22;transition:opacity .3s}
.cs>*:not(.cs-glow):not(.pz):not(.cs-modal){position:relative}
.cs-top{display:flex;align-items:center;gap:10px}
.cs-top .t{flex:1;min-width:0}
.cs-eyebrow{font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#93a7b6}
.cs-title{font-family:'Bungee','Impact','Arial Black',sans-serif;font-weight:900;text-transform:uppercase;font-style:italic;font-size:clamp(20px,6vw,30px);line-height:1;letter-spacing:.02em}
.cs-ico{flex:0 0 auto;width:44px;height:44px;border-radius:50%;border:1px solid #2a3d4e;background:rgba(10,16,22,.6);color:#e8eef3;font-size:18px;cursor:pointer}
.cs-car{flex:1 1 auto;min-height:210px;max-height:48vh;position:relative}
.cs-track{position:absolute;inset:0;display:flex;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;scrollbar-width:none;touch-action:pan-x;overscroll-behavior-x:contain}
.cs-track::-webkit-scrollbar{display:none}
.cs-slide{flex:0 0 100%;height:100%;scroll-snap-align:center;scroll-snap-stop:always;display:flex;align-items:flex-end;justify-content:center;position:relative}
.cs-slide::after{content:"";position:absolute;bottom:0;left:50%;width:44%;height:16px;margin-left:-22%;border-radius:50%;background:rgba(0,0,0,.5)}
.cs-slide img{height:100%;max-width:100%;object-fit:contain;object-position:50% 100%;position:relative;z-index:1;transform-origin:50% 100%;-webkit-user-drag:none;pointer-events:none}
.cs-slide.cur img{animation:cs-idle 2.6s ease-in-out infinite}
@keyframes cs-idle{0%,100%{transform:translateY(0) scale(1,1)}50%{transform:translateY(-1.5%) scale(1.01,.99)}}
.cs-arrow{position:absolute;top:50%;margin-top:-22px;z-index:2;width:44px;height:44px;border-radius:50%;border:1px solid #2a3d4e;background:rgba(10,16,22,.7);color:#e8eef3;font:700 20px system-ui;cursor:pointer}
.cs-arrow.l{left:0}.cs-arrow.r{right:0}
.cs-thumbs{display:flex;justify-content:center;gap:8px}
.cs-thumb{width:44px;height:44px;border-radius:50%;border:2px solid #2a3d4e;background:#121c25 no-repeat;background-size:150%;background-position:50% 2%;cursor:pointer;padding:0;transition:transform .15s}
.cs-thumb[aria-current="true"]{border-color:var(--c);transform:scale(1.12)}
.cs-info{display:flex;flex-direction:column;gap:8px;width:100%;max-width:560px;align-self:center}
.cs-name{font-family:'Bungee','Impact','Arial Black',sans-serif;font-weight:900;font-style:italic;font-size:clamp(24px,7vw,34px);line-height:1;color:var(--c);text-shadow:2px 2px 0 #000}
.cs-meta{font-size:14px;color:#93a7b6;font-weight:600;margin-top:2px}
.cs-note{font-size:13px;color:#f5c242;font-weight:700;margin-top:3px}
.cs-hint{text-align:center;font-size:12px;color:#93a7b6;font-weight:700;letter-spacing:.06em}
.cs-lock{position:absolute;inset:0;z-index:70;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;background:radial-gradient(circle,rgba(0,0,0,.35),rgba(0,0,0,.9));animation:pz-in .1s both}
.cs-lock img{height:46%;object-fit:contain;animation:cs-lockimg .5s cubic-bezier(.2,1.6,.4,1) both;filter:drop-shadow(0 0 18px var(--c))}
.cs-lock b{font:italic 900 clamp(34px,11vw,64px)/1 'Bungee','Impact',sans-serif;color:var(--c);text-shadow:3px 3px 0 #000}
.cs-lock span{font:400 clamp(18px,6vw,30px)/1 'Bungee','Impact',sans-serif;color:#fff;background:#e5484d;padding:6px 14px;border:3px solid #000;transform:rotate(-4deg);box-shadow:4px 4px 0 #000;animation:cs-stamp .35s cubic-bezier(.2,1.8,.4,1) .2s both}
@keyframes cs-lockimg{from{transform:scale(.4);opacity:0}to{transform:scale(1);opacity:1}}
@keyframes cs-stamp{from{transform:rotate(-4deg) scale(3);opacity:0}to{transform:rotate(-4deg) scale(1);opacity:1}}
.cs-stats{display:flex;flex-direction:column;gap:5px;background:#0d151d;border:2px solid #2a3d4e;border-radius:6px;padding:8px 10px;box-shadow:inset 0 0 0 2px #070b10}
.cs-stat{display:grid;grid-template-columns:44% 1fr 20px;gap:8px;align-items:center}
.cs-stat .l{font-size:10.5px;font-weight:800;letter-spacing:.04em;line-height:1.1;text-transform:uppercase;color:#c7d3dc;overflow-wrap:anywhere}
.cs-stat .v{font:700 12px ui-monospace,Menlo,Consolas,monospace;text-align:right;color:#93a7b6}
.cs-blocks{display:grid;grid-template-columns:repeat(10,1fr);gap:2px}
.cs-blocks i{position:relative;height:11px;background:#1b2633;border-radius:1px;box-shadow:inset 0 -2px 0 rgba(0,0,0,.4)}
.cs-blocks b{position:absolute;inset:0;border-radius:1px;background:var(--c);box-shadow:inset 0 2px 0 rgba(255,255,255,.5),inset 0 -2px 0 rgba(0,0,0,.28);transform:scale(0);opacity:0;transition:transform .12s cubic-bezier(.3,1.7,.5,1),opacity .05s}
.cs-blocks i.on b{transform:scale(1);opacity:1}
.cs-skills{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}
.cs-skill{display:flex;flex-direction:column;align-items:center;gap:4px;background:none;border:0;padding:2px 0;color:#e8eef3;cursor:pointer;min-height:44px;font-family:inherit}
.cs-skill .ic{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;font-size:20px;position:relative;
  background:rgba(70,194,138,.16);border:2px solid #46c28a;transition:transform .12s}
.cs-skill.blue .ic{background:rgba(63,167,255,.16);border-color:#3fa7ff}
.cs-skill.neg .ic{background:rgba(245,194,66,.38);border-color:#e5484d}
.cs-skill.neg .ic::after{content:"!";position:absolute;right:-4px;top:-4px;width:17px;height:17px;border-radius:50%;background:#f5c242;color:#1b1204;font:900 12px/17px system-ui;text-align:center;border:2px solid #e5484d}
.cs-skill[aria-pressed="true"] .ic{transform:scale(1.14);box-shadow:0 0 0 3px rgba(255,255,255,.15)}
.cs-skill .n{font-size:10.5px;font-weight:700;line-height:1.15;text-align:center;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;max-width:100%}
.cs-effect{min-height:44px;font-size:14px;line-height:1.35;background:#121c25;border:1px solid #2a3d4e;border-left:4px solid #2a3d4e;border-radius:8px;padding:8px 10px;color:#c7d3dc}
.cs-effect.pos{border-left-color:#46c28a}.cs-effect.neg{border-left-color:#e5484d}
.cs-effect b{color:#fff}
.cs-actions{display:flex;gap:10px;width:100%;max-width:560px;align-self:center}
.cs-btn{font:900 16px 'Bungee','Impact','Arial Black',sans-serif;letter-spacing:.04em;border-radius:10px;padding:14px 18px;min-height:52px;cursor:pointer;border:0}
.cs-btn.ghost{background:transparent;color:#e8eef3;border:1px solid #2a3d4e;flex:0 0 auto}
.cs-btn.go{flex:1;background:#f5a524;color:#1b1204;font-size:20px;box-shadow:0 4px 0 #a86a0c}
.cs-btn.go:active{transform:translateY(3px);box-shadow:0 1px 0 #a86a0c}
.cs-btn:disabled{opacity:.5}
.cs button:focus-visible{outline:2px solid #f5a524;outline-offset:2px}
.cs-modal{position:absolute;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(4,8,14,.78);animation:pz-in .15s both}
.cs-card{width:100%;max-width:420px;background:#121c25;border:2px solid var(--c);border-radius:14px;padding:18px;display:flex;flex-direction:column;gap:12px;box-shadow:0 0 0 4px #070b10}
.cs-card h3{margin:0;font:400 22px 'Bungee','Impact','Arial Black',sans-serif;color:var(--c)}
.cs-card p{margin:0;font-size:16px;line-height:1.45}
.cs-egg{background:#0d151d;border-radius:8px;padding:10px 12px;font-size:15px;color:#c7d3dc}
.cs-egg b{color:#f5c242}

/* ---- pose layer ---- */
.pz{position:absolute;inset:0;z-index:50;font-family:system-ui,sans-serif;overflow:hidden;background:#06090d;pointer-events:none;--c:#f5a524;animation:pz-in .12s both}
.pz.out{animation:pz-out .16s forwards}
.pz.held{pointer-events:auto;cursor:pointer}
.pz-tap{position:absolute;left:0;right:0;bottom:1.2%;z-index:8;text-align:center;font:400 13px 'Bungee','Impact',sans-serif;letter-spacing:.14em;color:#fff;text-shadow:2px 2px 0 #000;animation:pz-blink .7s ease-in-out infinite alternate}
@keyframes pz-blink{from{opacity:.45}to{opacity:1}}
.pz-rays{position:absolute;left:50%;top:42%;width:220vmax;height:220vmax;margin:-110vmax 0 0 -110vmax;will-change:transform;
  background:repeating-conic-gradient(from 0deg,var(--c) 0deg 5deg,transparent 5deg 15deg);opacity:.55;animation:pz-rays 1.5s linear both}
.pz-vig{position:absolute;inset:0;background:radial-gradient(circle at 50% 42%,rgba(6,9,13,0) 0,rgba(6,9,13,.15) 22%,rgba(6,9,13,.92) 62%)}
.pz-shake{position:absolute;inset:0;animation:pz-shake .36s linear both}
.pz-figpos{position:absolute;left:50%;top:12%;height:64%;width:min(90%,520px);transform:translateX(-50%)}
.pz-fig{position:absolute;inset:0;transform-origin:50% 95%;perspective:900px;animation:pz-pop .5s both}
.pz-act{position:absolute;inset:0;transform-origin:50% 95%}
.pz-act img,.pz-shine{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;object-position:50% 100%}
.pz-fx{position:absolute;inset:0}
.pz-p{position:absolute;left:50%;top:44%;font-size:clamp(22px,7vmin,40px);line-height:1;will-change:transform,opacity;
  animation:pz-fly var(--t,.7s) cubic-bezier(.15,.7,.35,1) var(--d,0s) both}
.pz-bubble{position:absolute;top:4%;right:5%;max-width:58%;overflow-wrap:anywhere;hyphens:auto;z-index:5;background:#fff;color:#0a0a0a;border:3px solid #000;border-radius:20px;
  padding:10px 14px;font:900 clamp(14px,4.1vw,24px)/1.12 'Bangers','Chalkboard SE','Comic Sans MS','Comic Neue','Impact',sans-serif;
  text-transform:uppercase;letter-spacing:.01em;box-shadow:5px 5px 0 #000;transform-origin:10% 110%;animation:pz-bubble .42s cubic-bezier(.2,1.6,.4,1) var(--bd,.33s) both}
.pz-bubble::before,.pz-bubble::after{content:"";position:absolute;left:16%;bottom:-22px;border:12px solid transparent;border-top:12px solid #000;border-left:6px solid transparent;transform:skewX(25deg)}
.pz-bubble::after{bottom:-15px;left:calc(16% + 3px);border-width:9px 9px 9px 4px;border-color:#fff transparent transparent transparent}
.pz-bubble.huge{font-size:clamp(38px,12vw,84px);padding:6px 20px 2px;color:var(--c);-webkit-text-stroke:3px #000;text-shadow:4px 4px 0 #000}
.pz-name{position:absolute;left:0;right:0;bottom:6%;text-align:center;z-index:6;animation:pz-slam .32s cubic-bezier(.2,1.5,.4,1) .18s both}
.pz-name b{display:block;font:italic 900 clamp(34px,11vw,72px)/1 'Bungee','Impact','Arial Black',sans-serif;color:var(--c);text-shadow:3px 3px 0 #000,-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000}
.pz-name span{display:block;margin-top:4px;font:700 13px/1.2 system-ui,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#e8eef3}
.pz-flash{position:absolute;inset:0;z-index:9;background:#fff;opacity:0;animation:pz-flash 40ms steps(1,end) both}
.pz-flash.b{animation-delay:var(--fd,.8s);animation-fill-mode:forwards}
@keyframes pz-in{from{opacity:0}to{opacity:1}}
@keyframes pz-out{from{opacity:1}to{opacity:0}}
@keyframes pz-rays{from{transform:rotate(0) scale(.55);opacity:0}15%{opacity:.55}to{transform:rotate(35deg) scale(1);opacity:.55}}
@keyframes pz-shake{0%,100%{transform:translate(0,0)}10%{transform:translate(-11px,7px)}20%{transform:translate(10px,-8px)}30%{transform:translate(-8px,-5px)}40%{transform:translate(8px,6px)}55%{transform:translate(-5px,3px)}70%{transform:translate(3px,-3px)}85%{transform:translate(-2px,1px)}}
@keyframes pz-pop{0%{transform:translateY(25%) scale(.25,.25);opacity:0}22%{transform:translateY(0) scale(1.25,.75);opacity:1}38%{transform:scale(.9,1.12)}54%{transform:scale(1.05,.96)}70%,100%{transform:scale(1,1);opacity:1}}
@keyframes pz-flash{0%{opacity:.95}100%{opacity:0}}
@keyframes pz-bubble{0%{transform:scale(0) rotate(-14deg);opacity:0}60%{transform:scale(1.15) rotate(3deg);opacity:1}82%{transform:scale(.96) rotate(-1deg)}100%{transform:scale(1) rotate(-2deg);opacity:1}}
@keyframes pz-slam{0%{transform:translateX(-60%) skewX(-25deg);opacity:0}70%{transform:translateX(3%) skewX(6deg);opacity:1}100%{transform:none;opacity:1}}
@keyframes pz-fly{0%{transform:translate(-50%,-50%) scale(.3) rotate(0);opacity:0}12%{opacity:1}80%{opacity:1}100%{transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(var(--s,1)) rotate(var(--r,0deg));opacity:0}}

/* BigWman: deep squat, launch, YES!, Excel cells */
.pz-bigwman .pz-act{animation:pz-squat .75s cubic-bezier(.3,.8,.4,1) .42s both}
@keyframes pz-squat{0%{transform:translateY(0) scale(1,1)}40%{transform:translateY(0) scale(1.2,.62)}55%{transform:translateY(-14%) scale(.86,1.16)}75%{transform:translateY(2%) scale(1.08,.92)}100%{transform:translateY(0) scale(1,1)}}
.pz-bigwman .pz-shake.b{animation:pz-shake .3s linear .73s both}
.pz-cell{font:700 clamp(12px,3.4vmin,18px)/1 ui-monospace,Menlo,Consolas,monospace;color:#fff;background:#1d6f42;border:2px solid #3ddc84;padding:4px 6px;border-radius:2px}

/* Wizcudi: lights go out, spotlight, bulbs die */
.pz-dim{position:absolute;inset:0;z-index:3;background:#000;opacity:0;animation:pz-dimflick .36s linear .26s both,pz-dimoff .2s linear .66s forwards}
@keyframes pz-dimflick{0%{opacity:0}20%{opacity:.9}35%{opacity:.35}55%{opacity:.92}70%{opacity:.6}100%{opacity:.94}}
@keyframes pz-dimoff{from{opacity:.94}to{opacity:0}}
.pz-spot{position:absolute;inset:0;z-index:3;opacity:0;background:radial-gradient(ellipse 34% 46% at 50% 46%,rgba(0,0,0,0) 0,rgba(0,0,0,0) 62%,rgba(0,0,0,.9) 100%);animation:pz-in .14s linear .64s both}
.pz-beam{position:absolute;left:0;right:0;top:0;height:82%;z-index:3;opacity:0;clip-path:polygon(44% 0,56% 0,82% 100%,18% 100%);
  background:linear-gradient(rgba(255,246,200,.42),rgba(255,246,200,.06));animation:pz-in .12s linear .66s both}
.pz-bulb{position:absolute;z-index:4;font-size:clamp(24px,7vmin,40px);line-height:1;transform:translate(-50%,-50%);animation:pz-bulb .5s linear var(--d) both}
.pz-bulb::before{content:"";position:absolute;left:50%;top:40%;width:3em;height:3em;margin:-1.5em 0 0 -1.5em;border-radius:50%;
  background:radial-gradient(circle,rgba(255,236,140,.7),rgba(255,236,140,0) 65%);animation:pz-glowoff .5s linear var(--d) both}
@keyframes pz-bulb{0%{opacity:1}20%{opacity:.3}30%{opacity:1}48%{opacity:.25}58%{opacity:.85}100%{opacity:.28;transform:translate(-50%,-50%) scale(.82)}}
@keyframes pz-glowoff{0%{opacity:1}20%{opacity:.2}30%{opacity:1}48%{opacity:0}58%{opacity:.6}100%{opacity:0}}
.pz-wizcudi .pz-bubble,.pz-wizcudi .pz-name{z-index:7}

/* Jrohn: laughs, clothes fly, leaf covers */
.pz-jrohn .pz-act{animation:pz-laugh .72s linear .36s both}
@keyframes pz-laugh{0%,100%{transform:rotate(0) translateY(0)}12%{transform:rotate(-6deg) translateY(-2%)}25%{transform:rotate(5deg) translateY(0)}38%{transform:rotate(-5deg) translateY(-2%)}52%{transform:rotate(4deg) translateY(0)}66%{transform:rotate(-3deg) translateY(-1%)}82%{transform:rotate(2deg) translateY(0)}}
.pz-ha{position:absolute;z-index:5;font:900 clamp(20px,6vw,34px)/1 'Bangers','Impact',sans-serif;color:#fff;-webkit-text-stroke:2px #000;animation:pz-ha .5s cubic-bezier(.2,1.6,.4,1) var(--d) both}
@keyframes pz-ha{0%{transform:scale(0) rotate(var(--r));opacity:0}40%{transform:scale(1.2) rotate(var(--r));opacity:1}80%{opacity:1}100%{transform:scale(1) translateY(-30%) rotate(var(--r));opacity:0}}
.pz-leaf{position:absolute;left:50%;top:60%;z-index:4;font-size:clamp(70px,24vmin,150px);line-height:1;animation:pz-leaf .42s cubic-bezier(.2,1.5,.4,1) .78s both}
@keyframes pz-leaf{0%{transform:translate(-50%,60vh) rotate(-60deg) scale(.6);opacity:0}100%{transform:translate(-50%,-50%) rotate(-8deg) scale(1);opacity:1}}

/* Löken: celebration jump-spin, gold shine, coins */
.pz-loken .pz-act{animation:pz-siu .66s cubic-bezier(.3,.7,.4,1) .36s both}
@keyframes pz-siu{0%{transform:translateY(0) rotateY(0deg) scale(1,1)}15%{transform:translateY(3%) rotateY(0deg) scale(1.08,.9)}55%{transform:translateY(-22%) rotateY(300deg) scale(.95,1.06)}72%{transform:translateY(0) rotateY(360deg) scale(1.16,.84)}86%{transform:translateY(0) rotateY(360deg) scale(.97,1.04)}100%{transform:translateY(0) rotateY(360deg) scale(1,1)}}
.pz-shine{overflow:hidden;-webkit-mask-size:contain;mask-size:contain;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;-webkit-mask-position:50% 100%;mask-position:50% 100%}
.pz-shine i{position:absolute;top:-10%;bottom:-10%;left:0;width:38%;background:linear-gradient(100deg,rgba(255,255,255,0) 0,rgba(255,240,170,.85) 45%,rgba(255,255,255,.95) 50%,rgba(255,240,170,.85) 55%,rgba(255,255,255,0) 100%);
  transform:translateX(-120%) skewX(-18deg);animation:pz-sweep .42s ease-in-out .95s both}
@keyframes pz-sweep{from{transform:translateX(-120%) skewX(-18deg)}to{transform:translateX(300%) skewX(-18deg)}}
.pz-coin{position:absolute;top:0;z-index:4;font-size:clamp(20px,6vmin,34px);line-height:1;animation:pz-coin .62s linear var(--d) both}
@keyframes pz-coin{0%{transform:translateY(-12vh) rotate(0);opacity:0;animation-timing-function:cubic-bezier(.5,0,1,1)}8%{opacity:1}55%{transform:translateY(var(--f)) rotate(200deg);animation-timing-function:cubic-bezier(0,0,.5,1)}72%{transform:translateY(calc(var(--f) - 9vh)) rotate(260deg);animation-timing-function:cubic-bezier(.5,0,1,1)}86%{transform:translateY(var(--f)) rotate(320deg);animation-timing-function:cubic-bezier(0,0,.5,1)}93%{transform:translateY(calc(var(--f) - 2.5vh)) rotate(340deg)}100%{transform:translateY(var(--f)) rotate(360deg);opacity:1}}
.pz-siu{position:absolute;left:0;right:0;top:46%;z-index:6;text-align:center;font:400 clamp(40px,14vw,90px)/1 'Bungee','Impact',sans-serif;color:#f5c242;text-shadow:4px 4px 0 #000;
  animation:pz-siutext .5s cubic-bezier(.2,1.6,.4,1) .82s both}
@keyframes pz-siutext{0%{transform:scale(3);opacity:0}50%{transform:scale(.92);opacity:1}100%{transform:scale(1);opacity:1}}

/* Ljunky: drawn back like a bow, fired forward, ₿ and a cat */
.pz-ljunky .pz-act{animation:pz-bow .9s linear .32s both}
@keyframes pz-bow{0%{transform:translateX(0) rotate(0) scale(1,1);animation-timing-function:cubic-bezier(.3,.6,.4,1)}40%{transform:translateX(-17%) rotate(-5deg) scale(.86,1.05)}45%{transform:translateX(-16%) rotate(-4deg) scale(.87,1.04)}50%{transform:translateX(-17.5%) rotate(-5.5deg) scale(.85,1.05);animation-timing-function:cubic-bezier(.1,.9,.2,1)}60%{transform:translateX(15%) rotate(3deg) scale(1.18,.9)}78%{transform:translateX(-3%) rotate(-1deg) scale(.98,1.02)}100%{transform:translateX(0) rotate(0) scale(1,1)}}
.pz-streak{position:absolute;left:8%;height:4px;width:60%;z-index:2;background:linear-gradient(90deg,rgba(255,255,255,0),#fff);transform-origin:0 50%;transform:scaleX(0);opacity:0;animation:pz-streak .34s ease-out var(--d) both}
@keyframes pz-streak{0%{transform:scaleX(0);opacity:1}60%{transform:translateX(20%) scaleX(1);opacity:.9}100%{transform:translateX(60%) scaleX(.4);opacity:0}}
.pz-btc{font:900 clamp(24px,8vmin,44px)/1 system-ui,sans-serif;color:#f7931a;text-shadow:2px 2px 0 #000}
.pz-cat{position:absolute;left:0;bottom:14%;z-index:5;animation:pz-catrun .8s linear .52s both}
.pz-cat i{display:block;font-style:normal;font-size:clamp(34px,11vmin,60px);line-height:1;animation:pz-hop .2s cubic-bezier(.3,0,.7,1) .52s 4 alternate both}
.pz-cat i span{display:block;transform:scaleX(-1)}
@keyframes pz-catrun{from{transform:translateX(-20vw)}to{transform:translateX(110vw)}}
@keyframes pz-hop{from{transform:translateY(0)}to{transform:translateY(-9vh)}}

@media (max-height:720px){
  .cs{gap:7px;padding-top:8px}
  .cs-car{min-height:170px}
  .cs-thumb{width:36px;height:36px}
  .cs-name{font-size:24px}.cs-meta{font-size:13px}
  .cs-stats{gap:4px;padding:6px 8px}
  .cs-skill .ic{width:36px;height:36px;font-size:17px}
  .cs-effect{min-height:38px;font-size:13px;padding:6px 9px}
  .cs-btn{min-height:46px;padding:10px 14px}
}
@media (prefers-reduced-motion:reduce){
  .cs-slide.cur img{animation:none}
  .cs-blocks b{transition:opacity .15s}
  .pz *, .pz *::before, .pz *::after{animation:none!important}
  .pz-rays{opacity:.3;transform:none}
  .pz-fig,.pz-bubble,.pz-name{animation:pz-in .35s both!important}
  .pz-bubble{animation-delay:.25s!important}
  .pz-flash,.pz-dim,.pz-p,.pz-cat,.pz-coin,.pz-streak,.pz-ha,.pz-bulb,.pz-shine,.pz-siu{display:none}
}
`;
let cssDone = false;
function injectCss() { if (cssDone) return; cssDone = true; const s = document.createElement('style'); s.id = 'lod-engine-css'; s.textContent = CSS; document.head.appendChild(s); }

/* ---------------- poses ---------------- */
const el = (tag, cls, html, style) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (style) e.setAttribute('style', style); return e; };
function particle(box, html, o) {
  const p = el('span', 'pz-p ' + (o.cls || ''), html);
  p.style.setProperty('--dx', o.dx + 'px'); p.style.setProperty('--dy', o.dy + 'px');
  p.style.setProperty('--r', (o.r || 0) + 'deg'); p.style.setProperty('--s', o.s || 1);
  p.style.setProperty('--d', (o.d || 0) + 's'); p.style.setProperty('--t', (o.t || .7) + 's');
  if (o.left) p.style.left = o.left; if (o.top) p.style.top = o.top;
  box.appendChild(p); return p;
}
const radial = (i, n, minR, maxR, spread = 1) => { const a = (i / n) * Math.PI * 2 * spread + rand(-.25, .25); const r = rand(minR, maxR); return [Math.cos(a) * r, Math.sin(a) * r]; };

const POSES = {
  bigwman: {
    build(L, c, W, H) {
      L.shake2 = true;
      L.bubble.classList.add('huge'); L.bubble.style.setProperty('--bd', '.72s');
      L.bubble.style.top = '1%';
      const vals = ['=SUM()', '42', '1337', '%', '=IF()', '€', '9 000', 'YES', '#REF!', '∑', '0,5', 'A1', '+12%', '$$'];
      vals.forEach((v, i) => { const [dx, dy] = radial(i, vals.length, W * .32, W * .55); particle(L.fx, esc(v), { cls: 'pz-cell', dx, dy: dy - 30, r: rand(-90, 90), d: .74 + rand(0, .1), t: .62, s: rand(.9, 1.3) }); });
      L.flash2 = .74;
    },
    sound() {
      tone(240, .3, 'sawtooth', .14, -170, .42);              // squat
      noise(.35, .45, .74, 2600); tone(110, .45, 'square', .14, -50, .74);
      [392, 494, 587, 784].forEach(f => tone(f, .4, 'square', .07, 0, .76));   // YES! chord
      [784, 988, 1175].forEach((f, i) => tone(f, .12, 'square', .05, 0, .98 + i * .07));
    }
  },
  wizcudi: {
    build(L, c, W, H) {
      L.shake.after(el('div', 'pz-dim'));
      L.root.appendChild(el('div', 'pz-spot')); L.root.appendChild(el('div', 'pz-beam'));
      const n = 7;
      for (let i = 0; i < n; i++) {
        const a = -Math.PI * .95 + (i / (n - 1)) * Math.PI * .9 + Math.PI * (i % 2 ? .02 : -.02);
        const rx = 40, ry = 36, x = 50 + Math.cos(a) * rx * (i % 2 ? .82 : 1), y = 46 + Math.sin(a) * ry + (i % 2 ? 8 : 0);
        const b = el('span', 'pz-bulb', '💡'); b.style.left = x + '%'; b.style.top = (y + 22) + '%'; b.style.setProperty('--d', (.24 + i * .045) + 's');
        L.root.appendChild(b);
      }
      L.bubble.style.setProperty('--bd', '.74s');
    },
    sound() {
      noise(.03, .4, .26, 3500, 'highpass'); tone(2200, .02, 'square', .06, 0, .26);   // click
      tone(640, .4, 'sawtooth', .1, -580, .28);                                        // power down
      noise(.03, .25, .4, 3500, 'highpass'); noise(.03, .25, .52, 3500, 'highpass');
      tone(110, .7, 'sawtooth', .12, 0, .66); tone(165, .7, 'square', .05, 0, .66);     // spotlight on
      tone(1320, .35, 'triangle', .05, 0, .72); tone(1760, .35, 'triangle', .04, 0, .8);
    }
  },
  jrohn: {
    build(L, c, W, H) {
      const has = [['HA!', 18, 10, -12, .38], ['HA!', 66, 6, 10, .52], ['HAHA!', 12, 28, -6, .66], ['HA!', 70, 24, 14, .8]];
      has.forEach(([t, x, y, r, d]) => { const h = el('span', 'pz-ha', t); h.style.left = x + '%'; h.style.top = y + '%'; h.style.setProperty('--r', r + 'deg'); h.style.setProperty('--d', d + 's'); L.root.appendChild(h); });
      const clothes = ['👕', '👖', '🧦', '🧢', '🩳', '🧦', '👔'];
      clothes.forEach((e, i) => { const side = i % 2 ? 1 : -1; particle(L.fx, e, { dx: side * rand(W * .35, W * .6), dy: rand(-H * .45, -H * .1), r: side * rand(200, 520), d: .46 + i * .04, t: .72, s: 1.4, top: '48%' }); });
      L.fx.appendChild(el('span', 'pz-leaf', '🌿'));
      L.bubble.style.setProperty('--bd', '.9s');
    },
    sound() {
      for (let i = 0; i < 6; i++) { tone(560 - i * 35, .08, 'square', .1, -90, .38 + i * .12); tone(280 - i * 18, .08, 'triangle', .06, 0, .38 + i * .12); }
      noise(.25, .25, .46, 900, 'bandpass'); noise(.2, .2, .6, 1200, 'bandpass');       // clothes whoosh
      tone(900, .1, 'triangle', .12, 600, .8); tone(1320, .14, 'triangle', .08, 0, .88); // leaf pop
    }
  },
  loken: {
    build(L, c, W, H) {
      const sh = el('div', 'pz-shine', '<i></i>');
      const u = 'url("' + String(c.src).replace(/"/g, '%22') + '")';
      sh.style.webkitMaskImage = u; sh.style.maskImage = u;
      L.act.appendChild(sh);
      for (let i = 0; i < 14; i++) {
        const co = el('span', 'pz-coin', '🪙'); co.style.left = rand(12, 86) + '%';
        co.style.setProperty('--d', (.84 + rand(0, .3)) + 's'); co.style.setProperty('--f', rand(72, 80) + 'vh');
        L.root.appendChild(co);
      }
      L.root.appendChild(el('div', 'pz-siu', 'SIUUU!'));
      L.bubble.style.setProperty('--bd', '1.0s');
      L.flash2 = .82;
    },
    sound() {
      tone(180, .45, 'square', .08, 900, .36);                              // jump
      noise(.3, .4, .82, 1800); tone(330, .5, 'sawtooth', .12, 220, .82);  // land + SIUU
      for (let i = 0; i < 7; i++) { tone(988, .06, 'square', .05, 0, .9 + i * .07); tone(1319, .12, 'square', .05, 0, .96 + i * .07); }
      tone(2093, .3, 'triangle', .05, 0, .98);                              // shine
    }
  },
  ljunky: {
    build(L, c, W, H) {
      for (let i = 0; i < 6; i++) { const s = el('span', 'pz-streak'); s.style.top = (28 + i * 8 + rand(-2, 2)) + '%'; s.style.setProperty('--d', (.78 + i * .02) + 's'); L.root.appendChild(s); }
      for (let i = 0; i < 10; i++) particle(L.fx, '₿', { cls: 'pz-btc', dx: rand(W * .15, W * .6), dy: rand(-H * .35, H * .25), r: rand(-60, 60), d: .8 + i * .025, t: .6, s: rand(.9, 1.5) });
      L.root.appendChild(el('div', 'pz-cat', '<i><span>🐈</span></i>'));
      L.bubble.style.setProperty('--bd', '.9s');
      L.flash2 = .8;
    },
    sound() {
      tone(80, .45, 'sawtooth', .08, 70, .32);                         // string creak
      tone(1300, .2, 'triangle', .15, -1000, .8); noise(.25, .3, .8, 2400, 'bandpass'); // twang + whoosh
      tone(700, .2, 'sine', .1, 450, .98); tone(1100, .22, 'sine', .08, -520, 1.16);    // meow
      tone(1568, .08, 'square', .05, 0, 1.05); tone(2093, .18, 'square', .05, 0, 1.12); // cha-ching
    }
  }
};
const GENERIC = { build() {}, sound() { [523, 659, 784].forEach((f, i) => tone(f, .14, 'square', .06, 0, .4 + i * .1)); } };

const POSE_MS = 1330, FADE_MS = 160;
function playPose(c, host, o = {}) { // o.hold: freeze on the last frame until tapped
  injectCss();
  return new Promise(resolve => {
    host.querySelectorAll(':scope > .pz').forEach(n => n.remove()); // LAUNCH: one pose at a time
    const reduce = mqReduce.matches;
    const P = POSES[c.id] || GENERIC;
    const root = el('div', 'pz pz-' + c.id); root.style.setProperty('--c', c.color);
    root.setAttribute('aria-hidden', 'true');
    root.appendChild(el('div', 'pz-rays'));
    root.appendChild(el('div', 'pz-vig'));
    const shake = el('div', 'pz-shake'); root.appendChild(shake);
    const figpos = el('div', 'pz-figpos'), fig = el('div', 'pz-fig'), act = el('div', 'pz-act');
    const img = el('img'); img.src = c.src; img.alt = '';
    act.appendChild(img); fig.appendChild(act); figpos.appendChild(fig); shake.appendChild(figpos);
    const fx = el('div', 'pz-fx'); shake.appendChild(fx);
    const bubble = el('div', 'pz-bubble', esc(c.catchphrase || c.name + '!')); root.appendChild(bubble);
    root.appendChild(el('div', 'pz-name', '<b>' + esc(c.name) + '</b><span>' + esc(c.archetype) + '</span>'));
    const L = { root, shake, fig, act, fx, bubble };
    host.appendChild(root);
    const W = root.clientWidth || 360, H = root.clientHeight || 640;
    if (!reduce) {
      try { P.build(L, c, W, H); } catch (e) { console.error('[LOD] pose', e); }
      root.appendChild(el('div', 'pz-flash'));
      if (L.flash2) { const f2 = el('div', 'pz-flash b'); f2.style.setProperty('--fd', L.flash2 + 's'); root.appendChild(f2); }
      if (L.shake2) { const s2 = el('div', 'pz-shake b'); while (shake.firstChild) s2.appendChild(shake.firstChild); shake.appendChild(s2); }
    }
    hitStinger();
    try { P.sound(); } catch (e) {}
    const total = reduce ? 1100 : POSE_MS;
    const out = () => { root.classList.add('out'); setTimeout(() => { root.remove(); resolve(); }, FADE_MS); };
    setTimeout(() => {
      if (!o.hold || !root.isConnected) return out();
      root.classList.add('held'); root.appendChild(el('div', 'pz-tap', 'Tap to continue'));
      root.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); tone(660, .05, 'square', .05); out(); }, { once: true });
    }, total);
  });
}

/* ---------------- select screen ---------------- */
let open = null;
function showCharacterSelect(onSelected, opts = {}) {
  injectCss();
  if (open) open.close();
  const host = opts.container || document.getElementById('stage') || document.body;
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
  const root = el('div', 'cs'); root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Choose your fighter');
  root.innerHTML = '<div class="cs-glow"></div><p style="margin:auto;color:#93a7b6">Loading fighters…</p>';
  host.appendChild(root);
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };
  const clearTimers = () => { timers.forEach(clearTimeout); timers.clear(); };
  let closed = false, busy = false, idx = 0, list = [], renderToken = 0;
  const api = { close() { closed = true; clearTimers(); document.removeEventListener('keydown', onKey); root.remove(); if (open === api) open = null; } };
  open = api;

  function onKey(e) {
    if (busy || closed) return;
    const modal = root.querySelector('.cs-modal');
    if (modal) { if (e.key === 'Escape') modal.remove(); return; }
    if (e.key === 'ArrowRight') { go(idx + 1); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { go(idx - 1); e.preventDefault(); }
  }

  loadCharacters().then(chars => {
    if (closed) return;
    list = chars;
    const pre = opts.preselect || store.get('lod.char', null);
    idx = Math.max(0, list.findIndex(c => c.id === pre));
    root.innerHTML =
      '<div class="cs-glow"></div>' +
      '<div class="cs-top">' +
        (opts.onBack ? '<button class="cs-ico" data-a="back" aria-label="Back">←</button>' : '') +
        '<div class="t"><div class="cs-eyebrow">' + esc(opts.label || 'LAN OR DIE') + '</div><div class="cs-title">' + esc(opts.title || 'Choose your hero') + '</div>' + (opts.note ? '<div class="cs-note">' + esc(opts.note) + '</div>' : '') + '</div>' + // CORE: badges note
        '<button class="cs-ico" data-a="mute" aria-label="Toggle sound"></button>' +
      '</div>' +
      '<div class="cs-car">' +
        '<div class="cs-track" tabindex="0" aria-label="Characters, swipe to browse">' +
          list.map((c, i) => '<div class="cs-slide" data-i="' + i + '"><img src="' + esc(c.src) + '" alt="' + esc(c.name) + '" draggable="false"></div>').join('') +
        '</div>' +
        '<button class="cs-arrow l" data-a="prev" aria-label="Previous character">‹</button>' +
        '<button class="cs-arrow r" data-a="next" aria-label="Next character">›</button>' +
      '</div>' +
      '<div class="cs-thumbs">' + list.map((c, i) => '<button class="cs-thumb" data-i="' + i + '" aria-label="' + esc(c.name) + '" style="background-image:url(&quot;' + esc(c.src) + '&quot;)"></button>').join('') + '</div>' +
      '<div class="cs-info" aria-live="polite">' +
        '<div><div class="cs-name"></div><div class="cs-meta"></div></div>' +
        '<div class="cs-stats"></div>' +
        '<div class="cs-skills"></div>' +
        '<div class="cs-effect">Tap a skill to see what it does.</div>' +
      '</div>' +
      '<div class="cs-actions"><button class="cs-btn ghost" data-a="bio">📖 Read bio</button><button class="cs-btn go" data-a="select">PLAY</button></div><div class="cs-hint">‹ Swipe or tap the faces to change hero ›</div>';

    const track = root.querySelector('.cs-track'), muteBtn = root.querySelector('[data-a="mute"]');
    const syncMute = () => { muteBtn.textContent = muted ? '🔇' : '🔊'; };
    syncMute(); muteListeners.push(syncMute);
    api.close = (orig => () => { const k = muteListeners.indexOf(syncMute); if (k >= 0) muteListeners.splice(k, 1); orig(); })(api.close);

    root.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b || busy) return;
      const a = b.dataset.a;
      if (a === 'prev') go(idx - 1);
      else if (a === 'next') go(idx + 1);
      else if (a === 'mute') { setMuted(!muted); if (!muted) tone(660, .06, 'square', .06); }
      else if (a === 'back') { host.querySelectorAll(':scope > .pz').forEach(n => n.remove()); api.close(); opts.onBack(); } // LAUNCH: + remove pose
      else if (a === 'bio') showBio();
      else if (a === 'select') select();
      else if (b.classList.contains('cs-thumb')) go(+b.dataset.i);
      else if (b.classList.contains('cs-skill')) showSkill(+b.dataset.k);
      else if (a === 'close') b.closest('.cs-modal').remove();
    });
    document.addEventListener('keydown', onKey);

    let scrollT = 0, progUntil = 0;
    track.addEventListener('scroll', () => {
      clearTimeout(scrollT);
      scrollT = setTimeout(() => { if (performance.now() < progUntil) return; const i = Math.round(track.scrollLeft / (track.clientWidth || 1)); if (i !== idx) setIdx(i, false); }, 70);
    }, { passive: true });

    function go(i) {
      const n = list.length; i = (i + n) % n;
      const wrap = Math.abs(i - idx) > 1;
      progUntil = performance.now() + 700;
      track.scrollTo({ left: i * track.clientWidth, behavior: wrap || mqReduce.matches ? 'auto' : 'smooth' });
      setIdx(i, true);
    }
    function setIdx(i, fromButton) {
      idx = i; render();
      tone(330, .05, 'square', .05, 200);
    }
    function render() {
      const c = list[idx];
      clearTimers();
      const poseHi = !!opts.poseOnHighlight, token = ++renderToken; // pose holds until tapped, then the stats fill
      let fillStats = null;
      if (poseHi) { host.querySelectorAll(':scope > .pz').forEach(n => n.remove()); later(() => { if (!busy) playPose(c, host, { hold: true }).then(() => { if (token === renderToken && fillStats) fillStats(); }); }, 300); }
      root.style.setProperty('--c', c.color);
      root.querySelectorAll('.cs-slide').forEach((s, i) => s.classList.toggle('cur', i === idx));
      root.querySelectorAll('.cs-thumb').forEach((t, i) => t.setAttribute('aria-current', String(i === idx)));
      root.querySelector('.cs-name').textContent = c.name;
      root.querySelector('[data-a="select"]').textContent = 'PLAY AS ' + c.name.toUpperCase() + ' ▶';
      root.querySelector('.cs-meta').textContent = [c.archetype, c.role].filter(Boolean).join(' · ');
      const stats = root.querySelector('.cs-stats');
      stats.innerHTML = c.stats.length ? c.stats.map(s => '<div class="cs-stat" aria-label="' + esc(s.name) + ' ' + s.value + ' of 10"><span class="l">' + esc(s.name) + '</span><span class="cs-blocks">' + '<i><b></b></i>'.repeat(10) + '</span><span class="v">' + s.value + '</span></div>').join('')
        : '<p style="margin:0;color:#93a7b6;font-size:13px">No stats yet.</p>';
      const rows = [...stats.querySelectorAll('.cs-blocks')];
      fillStats = () => { for (let k = 0; k < 10; k++) {
        later(() => {
          let any = false;
          rows.forEach((r, j) => { if (c.stats[j].value > k) { r.children[k].classList.add('on'); any = true; } });
          if (any) tone(520 + k * 75, .035, 'square', .045);
        }, 140 + k * 55);
      } };
      if (!poseHi) fillStats();
      let pos = 0;
      root.querySelector('.cs-skills').innerHTML = c.skills.map((s, k) => {
        const cls = s.neg ? 'neg' : (pos++ % 2 ? 'blue' : '');
        return '<button class="cs-skill ' + cls + '" data-k="' + k + '" aria-pressed="false"><span class="ic">' + esc(s.icon) + '</span><span class="n">' + esc(s.name) + '</span></button>';
      }).join('');
      const ef = root.querySelector('.cs-effect'); ef.className = 'cs-effect'; ef.textContent = c.skills.length ? 'Tap a skill to see what it does.' : '';
    }
    function showSkill(k) {
      const c = list[idx], s = c.skills[k]; if (!s) return;
      root.querySelectorAll('.cs-skill').forEach((b, j) => b.setAttribute('aria-pressed', String(j === k)));
      const ef = root.querySelector('.cs-effect');
      ef.className = 'cs-effect ' + (s.neg ? 'neg' : 'pos');
      ef.innerHTML = '<b>' + esc(s.icon + ' ' + s.name) + (s.neg ? ' (weakness)' : '') + ':</b> ' + esc(s.effect || '…');
      if (s.neg) tone(200, .14, 'square', .06, -70); else { tone(784, .05, 'triangle', .06); tone(1046, .07, 'triangle', .06, 0, .05); }
    }
    function showBio() {
      const c = list[idx];
      const m = el('div', 'cs-modal', '<div class="cs-card" role="dialog" aria-label="Bio"><h3>' + esc(c.name) + '</h3>' +
        '<p>' + esc(c.backstory || 'No bio yet.') + '</p>' +
        (c.easterEgg ? '<div class="cs-egg"><b>🥚 Easter egg:</b> ' + esc(c.easterEgg) + '</div>' : '') +
        '<button class="cs-btn go" data-a="close">OK</button></div>');
      m.addEventListener('click', e => { if (e.target === m) m.remove(); });
      root.appendChild(m);
      tone(440, .06, 'triangle', .05); tone(660, .08, 'triangle', .05, 0, .06);
      const ok = m.querySelector('button'); try { ok.focus({ preventScroll: true }); } catch (e) {}
    }
    function select() {
      if (busy) return; busy = true;
      const c = list[idx];
      root.querySelectorAll('button').forEach(b => { b.disabled = true; });
      current = c; store.set('lod.char', c.id);
      if (opts.poseOnHighlight) { // HERO LOCKED IN stamp, then go
        host.querySelectorAll(':scope > .pz').forEach(n => n.remove());
        const st = el('div', 'cs-lock', '<img src="' + esc(c.src) + '" alt=""><b>' + esc(c.name) + '</b><span>HERO LOCKED IN!</span>'); st.style.setProperty('--c', c.color); root.appendChild(st);
        hitStinger(); [523, 659, 784, 1046].forEach((f, i) => tone(f, .16, 'square', .07, 0, .08 + i * .07));
        setTimeout(() => { api.close(); try { onSelected && onSelected(c); } catch (e) { console.error(e); } }, 1150);
        return;
      }
      playPose(c, host).then(() => { api.close(); try { onSelected && onSelected(c); } catch (e) { console.error(e); } });
    }

    // initial position (no smooth scroll)
    progUntil = performance.now() + 400; requestAnimationFrame(() => { track.scrollLeft = idx * track.clientWidth; });
    window.addEventListener('resize', () => { if (!closed) track.scrollLeft = idx * track.clientWidth; });
    render();
    const sel = root.querySelector('[data-a="select"]'); try { sel.focus({ preventScroll: true }); } catch (e) {}
  });
  return api;
}

/* restore the last pick so missions can show it even before a new select */
loadCharacters().then(list => { const id = store.get('lod.char', null); if (!current && id) current = list.find(c => c.id === id) || null; });

window.LOD = {
  store, esc, tone, noise, unlockAudio, setLoop, music, // LAUNCH: + setLoop, + music
  isMuted: () => muted, setMuted, toggleMute: () => setMuted(!muted), onMute: fn => muteListeners.push(fn),
  loadCharacters, showCharacterSelect, getCharacter, charMod, charAvatar, playPose, resetCharacter: () => { current = null; },
  get reducedMotion() { return mqReduce.matches; },
  _normalize: normalize
};
})();

/* ======================================================================
   CORE – game shell shared by every mission (see ENGINE.md)
   loop, input, camera, HUD, score/combo, fx, timers, ramp, finish + result,
   backend (LOD.api), scoreboard, badges, date lock / practice, Telegram.
   ====================================================================== */
(() => {
'use strict';
const LOD = window.LOD;

/* ===================== CONFIG ===================== */
const CFG = LOD.CFG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbx8imnqNUNMxuI79n1L60uKUz3SHgQUSMOw-iBh4xzu7zb9SZXvmw_65GUxi3dkp13_/exec', // Apps Script /exec. Empty = this phone only.
  TZ: 'Europe/Stockholm',  // "today", mission days and the 23:59 deadline
  MAX_TIME: 180,           // default round limit in seconds -> OVERLOAD
  LAN_DATE: '2026-11-28',
  PLAYERS: ['Löken', 'Wizcudi', 'Jrohn', 'BigWman', 'Ljunky'],
  RANKS: [['🏆', 'Legendary'], ['💜', 'Epic'], ['💙', 'Rare'], ['🤍', 'Common'], ['🎟️', 'Participated']],
  KING: '👑',
  EGG_BONUS: 50000,        // easter egg reward (same for every fighter)
  BEER_TIME: 20, BEER_MAX: 3 // each beer boosts every ability for 20 s, max 3 at a time
};
/* =================== /CONFIG =================== */

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const esc = LOD.esc;
const fmt = n => Math.round(n).toLocaleString('en-US').replace(/,/g, ' ');
const mmss = t => { t = Math.max(0, Math.floor(t)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
const store = LOD.store, music = LOD.music;
const params = new URLSearchParams(location.search);
const DEV = params.get('dev') === 'all';
const FAKE_DATE = DEV && /^\d{4}-\d{2}-\d{2}$/.test(params.get('date') || '') ? params.get('date') : null;

/* ---------- dates, lock, practice ---------- */
const dayKey = ts => new Intl.DateTimeFormat('sv-SE', { timeZone: CFG.TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ts));
const today = () => FAKE_DATE || dayKey(Date.now());
const prettyDay = k => { const [y, m, d] = k.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }); };
const lastDay = def => def.until || def.unlock; // a mission can count over several days (until: 'YYYY-MM-DD')
const untilText = def => lastDay(def) === today() ? '23:59 today' : prettyDay(lastDay(def)) + ' 23:59';
const daysText = def => def.until && def.until !== def.unlock ? prettyDay(def.unlock) + ' – ' + prettyDay(def.until) : prettyDay(def.unlock);
function status(def) { // 'live' | 'practice' | 'locked'
  const t = today();
  if (def.unlock <= t && t <= lastDay(def)) return 'live';
  if (def.unlock < t) return 'practice';
  return DEV ? 'practice' : 'locked';
}
const counts = def => status(def) === 'live' && !FAKE_DATE; // only live rounds are sent to the board

/* ---------- Telegram (only inside a Telegram Mini App) ---------- */
let TG = null;
function initTelegram() {
  if (!/tgWebAppData/.test(location.hash + location.search)) return;
  const s = document.createElement('script'); s.src = 'https://telegram.org/js/telegram-web-app.js';
  s.onload = () => {
    try {
      TG = window.Telegram && Telegram.WebApp; if (!TG) return;
      const v = x => !TG.isVersionAtLeast || TG.isVersionAtLeast(x); // old clients only log a warning, but skip anyway
      TG.ready(); TG.expand();
      if (TG.requestFullscreen && v('8.0')) TG.requestFullscreen();
      if (TG.disableVerticalSwipes && v('7.7')) TG.disableVerticalSwipes(); // swipe-down must not close the game while dragging
      ['viewportChanged', 'safeAreaChanged', 'contentSafeAreaChanged', 'fullscreenChanged'].forEach(ev => { try { TG.onEvent(ev, () => setTimeout(resize, 50)); } catch (e) {} });
      setTimeout(resize, 300);
      if (TG.setHeaderColor) TG.setHeaderColor('#0a1016');
      if (TG.setBackgroundColor) TG.setBackgroundColor('#0a1016');
    } catch (e) {}
  };
  document.head.appendChild(s);
}
function haptic(kind) {
  try {
    const h = TG && TG.HapticFeedback;
    if (h) { if (kind === 'success' || kind === 'error' || kind === 'warning') h.notificationOccurred(kind); else h.impactOccurred(kind || 'light'); return; }
    if (navigator.vibrate && (kind === 'heavy' || kind === 'error')) navigator.vibrate(25);
  } catch (e) {}
}

/* ---------- orientation: landscape missions (def.landscape) ---------- */
let rotPaused = false, oriLocked = false;
const isPortrait = () => window.innerHeight > window.innerWidth;
function lockLandscape() {
  if (oriLocked) return; oriLocked = true;
  try { if (TG && TG.lockOrientation && (!TG.isVersionAtLeast || TG.isVersionAtLeast('8.0'))) TG.lockOrientation(); } catch (e) {} // Telegram locks the current one
  try { const o = screen.orientation; if (o && o.lock) o.lock('landscape').catch(() => {}); } catch (e) {}
}
let fsByUs = false; // browser fullscreen we asked for (not inside Telegram, which has its own)
function enterFullscreen() { // must run inside a tap (the brief's Play button)
  if (TG) return;
  const d = document, el = d.documentElement, req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!req || d.fullscreenElement || d.webkitFullscreenElement) return;
  try {
    const p = req.call(el, { navigationUI: 'hide' });
    fsByUs = true;
    if (p && p.then) p.then(() => { try { const o = screen.orientation; if (o && o.lock) o.lock('landscape').catch(() => {}); } catch (e) {} }).catch(() => { fsByUs = false; });
  } catch (e) { fsByUs = false; }
}
function exitFullscreen() {
  if (!fsByUs) return; fsByUs = false;
  const d = document;
  try { if (d.fullscreenElement && d.exitFullscreen) d.exitFullscreen().catch(() => {}); else if (d.webkitFullscreenElement && d.webkitExitFullscreen) d.webkitExitFullscreen(); } catch (e) {}
}
function unlockOrientation() {
  exitFullscreen();
  if (!oriLocked) return; oriLocked = false;
  try { if (TG && TG.unlockOrientation && (!TG.isVersionAtLeast || TG.isVersionAtLeast('8.0'))) TG.unlockOrientation(); } catch (e) {}
  try { const o = screen.orientation; if (o && o.unlock) o.unlock(); } catch (e) {}
}
function checkRotate() { // runs every frame: cheap, and catches every mode change
  const inGame = G && M && M.landscape && (G.mode === 'play' || G.mode === 'pause');
  const warn = inGame && isPortrait();
  const el = $('#rotate-warning'); if (el && el.hidden === warn) el.hidden = !warn;
  if (warn && G.mode === 'play') { G.mode = 'pause'; rotPaused = true; J = null; fireHeld = false; music.duck(true); }
  else if (!warn && rotPaused) { rotPaused = false; if (G && G.mode === 'pause' && $('#scr-pause').hidden) resume(); }
  if (inGame && !isPortrait()) lockLandscape();
  else if (!inGame && G.mode !== 'ending' && (oriLocked || fsByUs)) unlockOrientation(); // keep it through the end animation
}

/* ---------- backend: Google Apps Script (swap this block for Supabase later) ---------- */
const localRows = () => store.get('lod.scores', []).filter(r => !r.practice).map(r => ({ ts: r.ts, name: r.name, mission: r.m, score: r.score, time: r.time || 0 }));
async function submit(row) { // row: {name, mission, score, time, ts}
  if (!CFG.API_URL) return { ok: false, offline: true, noApi: true };
  row.id = row.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
  try {
    const r = await fetch(CFG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(row) });
    const j = await r.json();
    return j.ok ? j : { ok: false, error: j.error || 'rejected' }; // rejected rows are not retried
  } catch (e) {
    const q = store.get('lod.queue', []); if (!q.some(x => x.id === row.id)) q.push(row); store.set('lod.queue', q.slice(-20));
    return { ok: false, offline: true };
  }
}
async function flush() {
  const q = store.get('lod.queue', []); if (!q.length || !CFG.API_URL) return;
  store.set('lod.queue', []);
  for (const row of q) await submit(row);
}
async function getBoard() {
  if (CFG.API_URL) {
    try {
      const r = await fetch(CFG.API_URL + (CFG.API_URL.includes('?') ? '&' : '?') + 't=' + Date.now());
      const j = await r.json();
      if (Array.isArray(j.rows)) { store.set('lod.remote', j.rows); return { rows: j.rows, src: 'live' }; }
    } catch (e) {}
    const cached = store.get('lod.remote', null);
    if (cached) return { rows: cached.concat(store.get('lod.queue', [])), src: 'cache' };
  }
  return { rows: localRows(), src: 'local' };
}
const cachedRows = () => { const c = store.get('lod.remote', null); return c ? c.concat(store.get('lod.queue', [])) : localRows(); };
function rankDay(rows, mission, day, endDay) { // best per person in the mission's days -> rank badge; longest round -> Sidequest King
  const best = {}; let king = null, end = endDay || day;
  rows.forEach(r => {
    const k = dayKey(r.ts);
    if (Number(r.mission) !== mission || k < day || k > end) return;
    const sc = Number(r.score), tm = Number(r.time) || 0;
    if (!best[r.name] || sc > best[r.name].score) best[r.name] = Object.assign({}, r, { score: sc, time: tm });
    if (tm > 0 && (!king || tm > king.time)) king = Object.assign({}, r, { score: sc, time: tm });
  });
  const list = Object.values(best).sort((a, b) => b.score - a.score).map((r, i) => Object.assign({ rank: CFG.RANKS[Math.min(i, 4)] }, r));
  return { list, king };
}
function collection(rows) { // badges per person over every mission whose day has come
  const out = {};
  const get = n => out[n] || (out[n] = { n, pts: 0, c: {} });
  MISSIONS.forEach(def => {
    if (def.unlock > today()) return;
    const d = rankDay(rows, def.id, def.unlock, lastDay(def));
    d.list.forEach((r, i) => { const o = get(r.name), em = r.rank[0]; o.c[em] = (o.c[em] || 0) + 1; o.pts += 5 - Math.min(i, 4); });
    if (d.king) { const o = get(d.king.name); o.c[CFG.KING] = (o.c[CFG.KING] || 0) + 1; o.pts += .5; }
  });
  return out;
}
const badgeText = o => o ? CFG.RANKS.map(r => r[0]).concat(CFG.KING).filter(em => o.c[em]).map(em => em + (o.c[em] > 1 ? '×' + o.c[em] : '')).join(' ') : '';

/* ---------- missions ---------- */
const MISSIONS = [];
let booted = false;
function mission(def) {
  def.cap = def.cap || 300000; def.maxTime = def.maxTime || CFG.MAX_TIME; def.world = def.world || { w: 1000, h: 1000 };
  const i = MISSIONS.findIndex(m => m.id === def.id); if (i >= 0) MISSIONS.splice(i, 1);
  MISSIONS.push(def); MISSIONS.sort((a, b) => a.id - b.id);
  if (booted) renderTitle();
}
const defaultMission = () => MISSIONS.find(m => status(m) === 'live') || MISSIONS.filter(m => status(m) === 'practice').pop() || MISSIONS[0] || null;
const missionLabel = def => 'Mission ' + def.id + ' · ' + def.title;

/* ---------- PERKS: every fighter's ability + weakness + easter egg ----------
   Abilities are multipliers the mission reads with LOD.perk(key). Beer boosts them.
   Weaknesses and eggs are themes; each mission decides how they show up (LOD.weak(), LOD.egg()). */
const PERKS = {
  bigwman: { comboTime: 1.6, label: 'EXCEL MASTERY', intro: 'Your combo lasts 60 % longer.',
    weak: 'packages', weakLabel: 'PACKAGE PANIC', weakText: 'Packages on the floor. Touch one and you freeze to sign for it.',
    egg: { em: '📊', what: 'lost spreadsheets', done: 'BUDGET APPROVED!' } },
  wizcudi: { light: 1.4, label: 'LIGHT SWITCH REFLEX', intro: 'You see 40 % further in the dark.',
    weak: 'jungle', weakLabel: 'JUNGLE FEAR', weakText: 'You are slower outside in the garden.',
    egg: { em: '💡', what: 'lights left on', done: 'ELECTRICITY BILL SAVED!' } },
  jrohn: { speed: 1.2, label: 'SPRINT AFTER WALTER', intro: 'You run 20 % faster.',
    weak: 'pants', weakLabel: 'PROGRESSIVE DISROBING', weakText: 'Too close to furniture and your pants drop. Stand still to pull them up.',
    egg: { em: '🪴', what: 'thirsty plants', done: 'GREEN FINGERS!' } },
  loken: { shield: 20, hugHeal: 2, label: 'ATM SECURITY', intro: 'Your shield blocks one hit every 20 s. Hugs give 2 hearts.',
    weak: 'coins', weakLabel: 'COIN LEAK', weakText: 'You drop coins now and then. Zombies hear it.',
    egg: { em: '🧣', what: 'Djurgården scarves', done: 'DJURGÅRDEN FOREVER!' } },
  ljunky: { fireRate: 1.35, range: 1.25, label: 'RANGER AIM', intro: 'You shoot 35 % faster and 25 % further.',
    weak: 'cat', weakLabel: 'CAT CHAOS', weakText: 'Now and then the cat bolts through the house and makes noise.',
    egg: { em: '₿', what: 'lost bitcoins', done: 'TO THE MOON!' } }
};
const fid = () => { const f = fighter || LOD.getCharacter(); return f ? f.id : null; };
const myPerks = () => PERKS[fid()] || null;
const beerN = () => (G && G.beer ? G.beer.n : 0);
function perk(key, def = 1) { // the fighter's ability value, boosted by beer
  const p = myPerks(), v = p && p[key] != null ? p[key] : null, n = beerN();
  if (key === 'speed') return (v ? 1 + (v - 1) * (1 + .5 * n) : 1) * (1 + .05 * n); // beer: everyone a bit faster
  if (v == null) return def;
  if (key === 'hugHeal') return v;
  if (key === 'shield') return v / (1 + .35 * n);
  return 1 + (v - 1) * (1 + .5 * n);
}
const weak = () => (myPerks() || {}).weak || null;
const egg = () => (myPerks() || {}).egg || null;

/* callouts: a comic panel with the fighter's face when an ability or weakness kicks in */
function callout(title, sub, kind) {
  if (!G) return;
  G.callout = { title, sub: sub || '', t: 2, kind: kind || 'good' };
  if (kind === 'bad') { LOD.tone(300, .12, 'square', .06, -150); LOD.tone(200, .18, 'square', .05, -80, .1); haptic('warning'); }
  else { LOD.tone(660, .07, 'square', .06); LOD.tone(990, .1, 'square', .06, 0, .07); LOD.tone(1320, .14, 'triangle', .05, 0, .14); haptic('medium'); }
}
const abilityCallout = sub => { const p = myPerks(); if (p) callout(p.label + '!', sub, 'good'); };
const weakCallout = sub => { const p = myPerks(); if (p) callout(p.weakLabel + '!', sub || p.weakText, 'bad'); };
function beer() { // returns false when you already have the max
  if (!G.beer) G.beer = { n: 0, t: 0 };
  if (G.beer.n >= CFG.BEER_MAX) return false;
  G.beer.n++; G.beer.t = CFG.BEER_TIME;
  callout('BEER #' + G.beer.n + '! 🍺', 'All abilities boosted for ' + CFG.BEER_TIME + ' s', 'good');
  LOD.noise(.25, .25, .05, 2500, 'highpass'); LOD.tone(140, .25, 'sawtooth', .05, -60, .3); // pssst + burp
  return true;
}
function tryShield() { // true = the hit was blocked
  const p = myPerks(); if (!p || !p.shield || !G || G.shieldT > 0) return false;
  G.shieldT = perk('shield'); abilityCallout('Hit blocked by the shield 🛡️'); return true;
}
function eggFound() {
  const e = egg(); if (!G || G.egg) return; G.egg = true;
  callout('🥚 EASTER EGG! ' + (e ? e.done : ''), '+' + fmt(CFG.EGG_BONUS) + ' bonus', 'good');
  LOD.tone(523, .12, 'square', .06); LOD.tone(659, .12, 'square', .06, 0, .12); LOD.tone(784, .12, 'square', .06, 0, .24); LOD.tone(1046, .3, 'square', .06, 0, .36);
  haptic('success');
}

/* weapons: catalog + per-player loadout that is remembered across missions */
const WEAPONS = {
  pistol: { id: 'pistol', em: '🔫', name: 'Pistol', kind: 'gun', rate: .28, range: 290, dmg: 1, noise: 5 },
  knife: { id: 'knife', em: '🔪', name: 'Knife', kind: 'melee', rate: .3, range: 42, dmg: 2, noise: 0, melee: true },
  extinguisher: { id: 'extinguisher', em: '🧯', name: 'Extinguisher', kind: 'spray', rate: .08, range: 125, dmg: 1, noise: 1.2 }
};
const loadouts = () => store.get('lod.loadout', {});
function loadout() {
  const all = loadouts(), L = all[playerName] || {};
  return { owned: Array.isArray(L.owned) && L.owned.length ? L.owned.filter(id => WEAPONS[id]) : ['pistol'], silencer: !!L.silencer, cur: WEAPONS[L.cur] ? L.cur : 'pistol' };
}
function saveLoadout(L) { if (!playerName) return; const all = loadouts(); all[playerName] = L; store.set('lod.loadout', all); renderWeapons(); }
function weapon() {
  const L = loadout(), w = Object.assign({}, WEAPONS[L.owned.includes(L.cur) ? L.cur : 'pistol']);
  if (w.id === 'pistol' && L.silencer) { w.noise = 1.2; w.silenced = true; }
  return w;
}
const hasWeapon = id => id === 'silencer' ? loadout().silencer : loadout().owned.includes(id);
function selectWeapon(id) { const L = loadout(); if (!L.owned.includes(id)) return; L.cur = id; saveLoadout(L); LOD.tone(440, .04, 'square', .05); haptic('light'); }
function unlockWeapon(id) { // true if new
  const L = loadout();
  if (id === 'silencer') { if (L.silencer) return false; L.silencer = true; saveLoadout(L); callout('SILENCER! 🔇', 'Pistol is almost silent. Saved for all missions.', 'good'); return true; }
  if (!WEAPONS[id] || L.owned.includes(id)) return false;
  L.owned.push(id); L.cur = id; saveLoadout(L);
  callout('NEW WEAPON: ' + WEAPONS[id].name.toUpperCase() + ' ' + WEAPONS[id].em, 'Saved for all missions. Switch above the fire button.', 'good');
  return true;
}
function renderWeapons() {
  const box = $('#weapons'), fire = $('#btn-fire'); if (!box || !fire) return;
  const L = loadout(), w = weapon();
  box.innerHTML = L.owned.length > 1 ? L.owned.map(id => '<button class="wpn" data-w="' + id + '" aria-pressed="' + (id === w.id) + '" aria-label="' + WEAPONS[id].name + '">' + WEAPONS[id].em + (id === 'pistol' && L.silencer ? '<small>🔇</small>' : '') + '</button>').join('') : '';
  fire.innerHTML = w.em + '<small>' + (w.melee ? 'STAB' : w.kind === 'spray' ? 'SPRAY' : 'FIRE') + '</small>';
}

/* ---------- canvas, view, camera ---------- */
const stage = $('#stage'), cv = $('#cv'), ctx = cv.getContext('2d');
const view = { W: 300, H: 300, DPR: 1, scale: 1, safeTop: 0, hudLeftY: 48 }; // hudLeftY: how far the left HUD column (hearts, shield, beer) sits below its old row, to clear the pause button
const cam = { x: 0, y: 0 };
function resize() {
  const r = stage.getBoundingClientRect();
  view.DPR = Math.min(window.devicePixelRatio || 1, 2); view.W = Math.max(100, r.width); view.H = Math.max(100, r.height);
  cv.width = Math.round(view.W * view.DPR); cv.height = Math.round(view.H * view.DPR);
  const probe = $('#safe-probe'); // same top as the pause button (CSS var --hud-top)
  view.safeTop = probe ? Math.max(0, probe.offsetTop - 10) : 0;
  view.scale = M && M.viewScale ? M.viewScale(view.W, view.H) : clamp(Math.min(view.W / 460, view.H / 500), .6, 1.5);
}
function camUpdate(dt, snap) {
  const [x, y] = M.camTarget ? M.camTarget(G) : [M.world.w / 2, M.world.h / 2];
  const vw = view.W / view.scale, vh = view.H / view.scale, Wd = M.world;
  const tx = vw < Wd.w ? clamp(x, vw / 2, Wd.w - vw / 2) : Wd.w / 2;
  const ty = vh < Wd.h ? clamp(y, vh / 2, Wd.h - vh / 2) : Wd.h / 2;
  const k = snap ? 1 : Math.min(1, dt * 6); cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
}

/* ---------- input: keys + floating joystick -> one move vector ---------- */
const keys = new Set(); let J = null;
let fireHeld = false;
const input = {
  keys,
  get joy() { return J; },
  get fire() { return fireHeld || keys.has(' ') || keys.has('j') || keys.has('enter'); },
  clear() { J = null; keys.clear(); fireHeld = false; },
  move() { // call once per update
    let mx = 0, my = 0;
    if (keys.has('a') || keys.has('arrowleft')) mx -= 1; if (keys.has('d') || keys.has('arrowright')) mx += 1;
    if (keys.has('w') || keys.has('arrowup')) my -= 1; if (keys.has('s') || keys.has('arrowdown')) my += 1;
    if (J) {
      const dx = J.x - J.bx, dy = J.y - J.by, l = Math.hypot(dx, dy);
      if (l > 8) { const m = Math.min(1, (l - 8) / 40); mx += dx / l * m; my += dy / l * m; }
      if (l > 56) { J.bx += dx / l * (l - 56); J.by += dy / l * (l - 56); }
    }
    const len = Math.hypot(mx, my); if (len > 1) { mx /= len; my /= len; }
    return { x: mx, y: my, len: Math.min(1, len) };
  }
};

/* ---------- state ---------- */
let M = null, G = null, fighter = null, last = performance.now();
let playerName = store.get('lod.name', '');
if (!CFG.PLAYERS.includes(playerName)) playerName = '';
function baseG() {
  return { mode: 'menu', t: 0, score: 0, cats: {}, combo: 0, comboT: 0, mult: 1, hp: 0, maxHp: 0, toast: null, pops: [], parts: [], shake: 0, flash: 0, endT: 0, win: false, why: '', timers: [], stats: {}, beer: { n: 0, t: 0 }, shieldT: 0, callout: null, egg: false, finalMin: false, flags: {} };
}
function newGame() { G = baseG(); if (M) { resize(); if (M.init) M.init(G); camUpdate(0, true); } }

/* ---------- score, combo, fx, timers, ramp ---------- */
function addScore(pts, cat) {
  G.score = Math.max(0, G.score + pts);
  if (cat) { const c = G.cats[cat] || (G.cats[cat] = { pts: 0, n: 0 }); c.pts += pts; c.n++; }
}
function combo() {
  G.combo++; G.comboT = 2.4 * perk('comboTime'); G.mult = Math.min(5, 1 + Math.floor(G.combo / 2));
  if (G.combo === 6 && perk('comboTime') > 1 && !G.flags.comboCall) { G.flags.comboCall = true; abilityCallout('Combo kept alive 60 % longer 📊'); }
  return G.mult;
}
function comboBreak() { G.combo = 0; G.comboT = 0; G.mult = 1; }
const pop = (x, y, text, color) => G.pops.push({ x, y, text: String(text), color: color || '#fff', t: 0 });
const toast = (text, dur = 2.2) => { G.toast = { text, t: dur }; };
const burst = (x, y, color, n = 6) => { for (let i = 0; i < n; i++) G.parts.push({ x, y, vx: rand(-90, 90), vy: rand(-90, 90), t: rand(.25, .5), c: color }); };
const after = (sec, fn) => G.timers.push({ t: sec, fn });
function ramp(o) {
  return {
    o, t: 0, lvl: 1,
    tick(dt) { this.t += dt; const l = 1 + Math.floor(this.t / o.every); const up = l !== this.lvl; this.lvl = l; return up; },
    get over() { return o.overload != null && this.lvl >= o.overload; },
    step(base, per) { return base + (this.lvl - 1) * per; }
  };
}
function tickFx(dt) {
  for (const q of G.pops) q.t += dt; G.pops = G.pops.filter(q => q.t < 1);
  for (const q of G.parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.t -= dt; } G.parts = G.parts.filter(q => q.t > 0);
  if (G.toast) { G.toast.t -= dt; if (G.toast.t <= 0) G.toast = null; }
  if (G.callout) { G.callout.t -= dt; if (G.callout.t <= 0) G.callout = null; }
  G.shake = Math.max(0, G.shake - dt * 30);
}

/* ---------- drawing helpers ---------- */
const EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
function em(t, x, y, size, alpha) {
  ctx.save(); if (alpha != null) ctx.globalAlpha = alpha;
  ctx.font = size + 'px ' + EMOJI; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, x, y); ctx.restore();
}
function rrect(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
const toScreen = (x, y) => [(x - cam.x) * view.scale + view.W / 2, (y - cam.y) * view.scale + view.H / 2];

function draw(now) {
  const { W, H, DPR, scale } = view, t = now / 1000;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.fillStyle = '#0a1016'; ctx.fillRect(0, 0, W, H);
  if (!M || !G) return;
  const sx = G.shake ? rand(-G.shake, G.shake) : 0, sy = G.shake ? rand(-G.shake, G.shake) : 0;
  ctx.setTransform(DPR * scale, 0, 0, DPR * scale, DPR * (W / 2 - cam.x * scale + sx), DPR * (H / 2 - cam.y * scale + sy));
  if (M.drawWorld) M.drawWorld(ctx, G, t);
  for (const q of G.parts) { ctx.globalAlpha = Math.min(1, q.t * 3); ctx.fillStyle = q.c; ctx.fillRect(q.x - 2, q.y - 2, 4, 4); } ctx.globalAlpha = 1;
  for (const q of G.pops) {
    ctx.globalAlpha = Math.max(0, 1 - q.t); ctx.fillStyle = q.color; ctx.font = '700 ' + (q.text.length > 6 ? 15 : 18) + 'px Barlow, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 3; ctx.strokeText(q.text, q.x, q.y - q.t * 30); ctx.fillText(q.text, q.x, q.y - q.t * 30);
  } ctx.globalAlpha = 1;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (M.drawScreen) M.drawScreen(ctx, G, t);
  if (G.mode !== 'menu' && G.mode !== 'result') drawHUD();
}
function drawHUD() {
  const { W, H } = view, pad = 12, ly = 22 + view.hudLeftY; // ly: hearts row, below the pause button
  ctx.save(); ctx.translate(0, view.safeTop); // fullscreen Telegram: keep the HUD below the notch and Telegram's buttons
  ctx.textBaseline = 'middle';
  for (let i = 0; i < G.maxHp; i++) em(i < G.hp ? '❤️' : '🖤', pad + 10 + i * 22, ly, 17, i < G.hp ? 1 : .6);
  let hx = pad + 10 + G.maxHp * 22 + 4;
  if (myPerks() && myPerks().shield) { em('🛡️', hx, ly, 16, G.shieldT > 0 ? .25 : 1); hx += 24; }
  if (G.beer && G.beer.n) {
    em('🍺', hx, ly, 16); ctx.textAlign = 'left'; ctx.font = '400 12px Bungee, Impact, sans-serif'; ctx.fillStyle = '#f5c242'; ctx.fillText('×' + G.beer.n, hx + 10, ly + 2);
    ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(hx - 8, ly + 11, 34, 3); ctx.fillStyle = '#f5c242'; ctx.fillRect(hx - 8, ly + 11, 34 * G.beer.t / CFG.BEER_TIME, 3);
  }
  ctx.textAlign = 'center'; ctx.fillStyle = G.t > M.maxTime - 30 ? '#e5484d' : '#e8eef3'; ctx.font = '400 18px Bungee, Impact, sans-serif';
  ctx.fillText(M.timerText ? M.timerText(G) : mmss(G.t), W / 2, 22);
  ctx.textAlign = 'right'; ctx.font = '400 18px Bungee, Impact, sans-serif'; ctx.fillStyle = '#f5a524'; ctx.fillText(fmt(G.score), W - pad, 22);
  if (G.mult > 1) { ctx.font = '400 15px Bungee, Impact, sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText('x' + G.mult + ' COMBO', W - pad, 44); }
  if (M.hud) { ctx.save(); M.hud(ctx, G); ctx.restore(); }
  ctx.restore();
  if (!counts(M)) { ctx.textAlign = 'center'; ctx.font = '400 12px Bungee, Impact, sans-serif'; ctx.fillStyle = 'rgba(232,238,243,.55)'; ctx.fillText('PRACTICE · DOES NOT COUNT', W / 2, H - 30); }
  if (G.callout) drawCallout(G.callout);
  if (G.toast) {
    ctx.globalAlpha = Math.min(1, G.toast.t * 2); ctx.font = '700 16px Barlow, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = Math.min(W - 24, ctx.measureText(G.toast.text).width + 28), y = view.safeTop + H * .2;
    ctx.fillStyle = 'rgba(8,13,18,.82)'; rrect(W / 2 - w / 2, y - 16, w, 32, 10); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(G.toast.text, W / 2, y, W - 40); ctx.globalAlpha = 1;
  }
  if (J && G.mode === 'play') {
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(J.bx, J.by, 56, 0, 7); ctx.stroke();
    const dx = J.x - J.bx, dy = J.y - J.by, l = Math.hypot(dx, dy), m = Math.min(l, 56);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(J.bx + (l ? dx / l * m : 0), J.by + (l ? dy / l * m : 0), 22, 0, 7); ctx.fill();
  }
}

function drawCallout(c) {
  const { W, H } = view, f = fighter || LOD.getCharacter();
  const age = 2 - c.t, sc = age < .15 ? .6 + age / .15 * .5 : age < .3 ? 1.1 - (age - .15) / .15 * .1 : 1;
  const w = Math.min(W - 24, 330), h = 62, x = W / 2, y = H * .32;
  ctx.save(); ctx.globalAlpha = Math.min(1, c.t * 3); ctx.translate(x, y); ctx.scale(sc, sc); ctx.rotate(-.03);
  ctx.fillStyle = '#000'; rrect(-w / 2 + 5, -h / 2 + 5, w, h, 12); ctx.fill();
  ctx.fillStyle = c.kind === 'bad' ? '#e5484d' : (f && f.color) || '#f5a524'; rrect(-w / 2, -h / 2, w, h, 12); ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.stroke();
  const av = LOD.charAvatar(f, 64); if (av) ctx.drawImage(av, -w / 2 + 6, -h / 2 + 6, 50, 50);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#0a1016';
  ctx.font = '400 16px Bungee, Impact, sans-serif'; ctx.fillText(c.title, -w / 2 + (av ? 64 : 12), -9, w - (av ? 72 : 20));
  ctx.font = '700 12px Barlow, sans-serif'; ctx.fillText(c.sub, -w / 2 + (av ? 64 : 12), 13, w - (av ? 72 : 20));
  ctx.restore();
}

/* ---------- update + loop ---------- */
function update(dt) {
  if (G.mode === 'ending') {
    G.endT -= dt; tickFx(dt);
    if (G.endT <= 0) { G.mode = 'result'; showResult(); }
    return;
  }
  G.t += dt;
  if (G.t >= M.maxTime) { G.t = M.maxTime; finish(M.overloadWin ? M.overloadWin(G) : true, 'overload'); return; } // the 3:00 rule
  if (G.beer.n) { G.beer.t -= dt; if (G.beer.t <= 0) { G.beer.n = 0; toast('The beer wore off 🍺', 1.6); } }
  if (G.shieldT > 0) { G.shieldT -= dt; if (G.shieldT <= 0) pop(LOD.G.p ? G.p.x : 0, LOD.G.p ? G.p.y - 30 : 0, '🛡️ READY', '#f5c242'); }
  if (!G.finalMin && G.t >= M.maxTime - 60) { G.finalMin = true; toast('⚠️ FINAL MINUTE! More zombies, more loot!', 3); haptic('heavy'); if (M.onFinalMinute) M.onFinalMinute(G); }
  const base = G.finalMin ? .82 + .18 * (G.t - (M.maxTime - 60)) / 60 : .7 * G.t / Math.max(1, M.maxTime - 60);
  music.intensity(Math.max(base, M.intensity ? M.intensity(G) : 0));
  M.update(G, dt);
  if (G.mode !== 'play') return;
  for (const tm of G.timers) { tm.t -= dt; if (tm.t <= 0 && !tm.done) { tm.done = true; try { tm.fn(); } catch (e) { console.error(e); } if (G.mode !== 'play') break; } }
  G.timers = G.timers.filter(tm => !tm.done);
  if (G.mode !== 'play') return;
  if (G.comboT > 0) { G.comboT -= dt; if (G.comboT <= 0) comboBreak(); }
  tickFx(dt);
}
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (M && G) {
    try {
      checkRotate();
      if (G.mode === 'play' || G.mode === 'ending') update(dt);
      if (M.frame) M.frame(G, dt);
      camUpdate(dt, false);
    } catch (e) { console.error('[LOD] frame', e); }
  }
  draw(now);
  requestAnimationFrame(frame);
}

/* ---------- screens ---------- */
const screens = () => [...stage.querySelectorAll(':scope > .screen')];
function hideAll() { screens().forEach(s => { s.hidden = true; }); }
function show(id) {
  hideAll(); const s = document.getElementById(id); if (!s) return; s.hidden = false;
  const f = s.querySelector('button:not([disabled])'); if (f && !s.dataset.nofocus) { try { f.focus({ preventScroll: true }); } catch (e) {} }
}
function panel(id, html, opts = {}) { // a mission's own overlay screen (phone call, choice...)
  let s = document.getElementById(id);
  if (!s) { s = document.createElement('section'); s.id = id; s.className = 'screen' + (opts.cls ? ' ' + opts.cls : ''); s.hidden = true; stage.appendChild(s); }
  if (opts.nofocus) s.dataset.nofocus = '1';
  s.innerHTML = html; return s;
}
function inGameUI(on) {
  $('#btn-pause').hidden = !on;
  const fireUI = on && !(M && M.noFire); $('#btn-fire').hidden = !fireUI; $('#weapons').hidden = !fireUI;
  if (fireUI) renderWeapons(); else fireHeld = false;
}

/* ---------- flow: title -> fighter -> story -> brief -> play -> result ---------- */
function goTitle() {
  if (M) newGame(); inGameUI(false); music.duck(false); music.play('title');
  if (!playerName) { renderWho(); show('scr-who'); return; }
  renderTitle(); show('scr-title');
}
function renderWho() {
  $('#who-names').innerHTML = CFG.PLAYERS.map(n => '<button class="who" data-name="' + esc(n) + '" aria-pressed="' + (n === playerName) + '">' + esc(n) + '</button>').join('');
}
function openMission(def) {
  if (!playerName || status(def) === 'locked') return;
  M = def; newGame(); chooseFighter(startStory);
}
function chooseFighter(next) {
  hideAll(); inGameUI(false);
  const cur = LOD.getCharacter();
  const pre = cur ? cur.id : playerName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const mine = collection(cachedRows())[playerName];
  LOD.showCharacterSelect(c => { fighter = c; next(); }, {
    label: 'Step 3 · ' + missionLabel(M) + (counts(M) ? '' : ' · Practice'), title: 'Choose your hero', preselect: pre, onBack: goTitle, poseOnHighlight: true,
    note: 'Player: ' + playerName + ' · ' + (mine ? badgeText(mine) : 'no badges yet')
  });
}
let storyI = 0;
function startStory() {
  if (M.intro) { hideAll(); cutscene(M.intro({ player: playerName, fighter: fighter || LOD.getCharacter() })).then(showBrief); return; }
  if (M.story && M.story.length) { storyI = 0; renderStory(); show('scr-story'); } else showBrief();
}
function renderStory() {
  const s = M.story[storyI];
  $('#story-dots').innerHTML = M.story.map((_, i) => '<span class="' + (i <= storyI ? 'on' : '') + '"></span>').join('');
  $('#story-time').textContent = s.time || '';
  $('#story-text').innerHTML = esc(s.text) + (s.q ? '<q>' + (s.q.includes('<b>') ? s.q : esc(s.q)) + '</q>' : '') + (s.danger ? '<div class="danger-line" style="margin-top:14px">' + s.danger + '</div>' : '');
  $('#story-next').textContent = storyI === M.story.length - 1 ? 'Brief me' : 'Next';
}
function showBrief() {
  const b = M.brief || {};
  $('#brief-eyebrow').textContent = missionLabel(M);
  $('#brief-card').innerHTML = b.card || '';
  $('#brief-card').hidden = !b.card;
  const p = myPerks(), e = egg(), tips = (b.tips || []).slice();
  if (p) { tips.push(['⭐ ' + p.label + ':', p.intro]); tips.push(['⚠️ ' + p.weakLabel + ':', p.weakText]); }
  if (e && M.eggs) tips.push(['🥚 Easter egg:', 'find 3 ' + e.what + ' ' + e.em + ' hidden in the level and hold still on each. +' + fmt(CFG.EGG_BONUS) + '.']);
  $('#brief-tips').innerHTML = tips.map((t, i) => '<li><b>' + (i + 1) + '</b><span><strong>' + esc(t[0]) + '</strong> ' + esc(t[1]) + '</span></li>').join('');
  const n = $('#brief-note');
  n.textContent = counts(M) ? 'LIVE. Your best score counts until ' + untilText(M) + '.' : 'Practice. This mission counted on ' + daysText(M) + '. Scores are not saved to the board.';
  n.className = 'note' + (counts(M) ? ' live' : '');
  show('scr-brief');
}
function beginPlay() {
  if (M && M.landscape) enterFullscreen(); // phone browsers: hide the address bar (Android; iPhone Safari has no fullscreen for pages)
  newGame(); G.mode = 'play'; hideAll(); inGameUI(true); camUpdate(0, true); last = performance.now();
  music.duck(false); music.play('game'); music.intensity(0);
  const p = myPerks(); if (p) after(1.2, () => abilityCallout(p.intro));
  if (M.start) M.start(G);
}
function resume() { G.mode = 'play'; hideAll(); $('#btn-pause').hidden = false; music.duck(false); last = performance.now(); }
function pauseGame() { if (!G || G.mode !== 'play') return; G.mode = 'pause'; J = null; fireHeld = false; music.duck(true); show('scr-pause'); }
function resumeGame() { if (!G || G.mode !== 'pause') return; resume(); }

function finish(win, why) {
  if (!G || G.mode !== 'play') return;
  G.mode = 'ending'; G.win = !!win; G.why = why || (win ? 'done' : 'down'); G.endT = win ? .9 : 1.2;
  if (G.why === 'overload') { G.shake = 12; G.endT = 1.4; }
  J = null; fireHeld = false; inGameUI(false); music.play(null);
  if (G.why === 'down') G.endT = Math.max(G.endT, 1.4);
  haptic(G.why === 'down' ? 'error' : 'success');
  if (M.onFinish) M.onFinish(G);
  else if (G.why === 'overload') toast('⚠️ OVERLOAD! Score saved.', 2.5);
  else toast(win ? 'Mission complete!' : 'You are down. 🧟', 2);
}

function showResult() {
  if (G.why === 'down' && !G.ripShown) { G.ripShown = true; showRip().then(showResult); return; }
  if (G.win && M.outro && !G.outroShown) { const o = M.outro(G, { player: playerName, fighter: fighter || LOD.getCharacter() }); if (o) { G.outroShown = true; cutscene(o).then(showResult); return; } }
  const r = M.result(G) || {}, time = Math.round(G.t);
  const bonus = r.bonus || [], bsum = bonus.reduce((a, b) => a + b[1], 0);
  const total = clamp(Math.round(G.score + bsum), 0, M.cap);
  const earned = (M.badges || []).filter(b => { try { return b.t(r.stats || {}); } catch (e) { return false; } });
  const main = earned[0] || { em: '🧟', name: 'Survivor' };
  const counted = counts(M) && !r.noSubmit; // noSubmit: the mission voids this round (kept on the phone as practice)
  const list = store.get('lod.scores', []);
  const prevBest = Math.max(-1, ...list.filter(x => x.name === playerName && x.m === M.id && !x.practice).map(x => x.score));
  const fc = fighter || LOD.getCharacter(), fn = fc ? fc.name : '';
  list.push({ name: playerName, char: fn, m: M.id, score: total, time, badge: main.em + ' ' + main.name, ts: Date.now(), practice: !counted || undefined });
  store.set('lod.scores', list.slice(-300));
  const isBest = counted && total > prevBest;
  const rows = (r.rows || []).concat(bonus);
  const as = fn && fn !== playerName ? ' (as ' + fn + ')' : '';
  window.__share = 'LAN OR DIE · ' + missionLabel(M) + (counted ? '' : ' · practice') + '\n' + playerName + as + ': ' + fmt(total) + ' pts ' + main.em + ' ' + main.name + '\n' + (r.line ? r.line + ' ' : '') + 'Beat that.';
  const next = MISSIONS.find(m => m.id > M.id && status(m) === 'locked');
  $('#result').innerHTML =
    '<div class="eyebrow">' + esc(missionLabel(M)) + (counted ? '' : ' · Practice') + '</div>' +
    (fc ? '<div class="res-hero" style="--c:' + esc(fc.color || '#f5a524') + '"><img src="' + esc(fc.src) + '" alt=""><div><div class="res-name">' + esc(playerName) + (fn && fn !== playerName ? ' <span class="note">as ' + esc(fn) + '</span>' : '') + '</div><div class="res-score">' + fmt(total) + '</div><div class="note">' + esc(fc.catchphrase || '') + '</div></div></div>' : '') +
    '<h2>' + esc(r.head || (G.win ? 'Mission complete' : 'Game over')) + '</h2>' +
    (r.lead ? '<p class="lead">' + esc(r.lead) + '</p>' : '') +
    '<div class="card"><table class="score">' + rows.map(x => '<tr><td>' + esc(x[0]) + '</td><td>' + (x[1] > 0 ? '+' : '') + fmt(x[1]) + '</td></tr>').join('') +
    '<tr class="total"><td>Total</td><td>' + fmt(total) + '</td></tr></table>' +
    '<p class="note" style="margin-top:6px">Round time ' + mmss(time) + (isBest ? ' · new personal best for ' + esc(playerName) + '.' : '') + '</p>' +
    '<p class="note" id="save-msg" role="status">' + (counted ? 'Saving…' : 'Practice – does not count. Only ' + esc(daysText(M)) + ' counted.') + '</p></div>' +
    '<div class="badges">' + earned.map((b, i) => '<span class="badge' + (i === 0 ? ' main' : '') + '">' + b.em + ' ' + esc(b.name) + '</span>').join('') + '</div>' +
    '<textarea id="share-text" readonly hidden aria-label="Share text"></textarea>' +
    '<p class="note" id="copy-msg" role="status"></p>' +
    '<div class="row"><button class="btn" id="again">Play again</button><button class="btn ghost" id="change">Change fighter</button></div>' +
    '<div class="row"><button class="btn ghost" id="share">Copy score for Telegram</button><button class="btn ghost" id="res-board">Scoreboard</button><button class="btn ghost" id="res-home">Missions</button></div>' +
    (next ? '<p class="note">Next: ' + esc(missionLabel(next)) + '. Unlocks ' + esc(prettyDay(next.unlock)) + '.</p>' : '');
  $('#again').addEventListener('click', beginPlay);
  $('#change').addEventListener('click', () => chooseFighter(beginPlay));
  $('#share').addEventListener('click', copyShare);
  $('#res-board').addEventListener('click', () => openBoard('scr-result'));
  $('#res-home').addEventListener('click', goTitle);
  inGameUI(false); music.play('title');
  show('scr-result');
  if (fc && LOD.playPose && G.why !== 'down') LOD.playPose(fc, stage, { hold: true });
  if (!counted) return;
  submit({ name: playerName, mission: M.id, score: total, time, ts: Date.now() }).then(res => {
    const m = $('#save-msg'); if (!m) return;
    m.textContent = res.ok ? (res.best ? 'Saved to the group board. New personal best 🔥' : 'Saved to the group board.')
      : res.noApi ? 'Saved on this phone. Copy your score for the group.'
      : res.offline ? 'No network. Saved on this phone, will retry next time.'
      : 'The board did not accept this score (' + res.error + ').';
  });
}
/* ---------- cutscenes: group chat on a phone, or a phone call while driving ----------
   spec = { kind: 'chat'|'call', title, sub, lines: [ {at:'05:41'} | {from:'Löken', text} | {sfx:'zombie', text, shake:true} ], button, tbc } */
function zombieGroan() {
  LOD.tone(110, 1.3, 'sawtooth', .16, -45); LOD.tone(84, 1.5, 'sawtooth', .12, 25, .15); LOD.tone(58, 1.6, 'square', .07, -15, .3);
  LOD.noise(1.4, .35, 0, 420, 'bandpass'); LOD.noise(.9, .25, .9, 300, 'bandpass'); LOD.tone(140, .8, 'sawtooth', .1, -70, 1.1);
}
function cutscene(spec) {
  return LOD.loadCharacters().then(list => new Promise(res => {
    const me = playerName, call = spec.kind === 'call';
    const o = document.createElement('div'); o.className = 'cut' + (call ? ' road' : ''); o.setAttribute('role', 'dialog'); o.setAttribute('aria-label', spec.title || 'Cutscene');
    const avatar = name => {
      const c = list.find(x => x.name === name), a = c && LOD.charAvatar(c, 64);
      return a ? '<img class="av" src="' + a.toDataURL() + '" alt="">' : '<span class="av">' + esc((name || '?').slice(0, 1)) + '</span>';
    };
    o.innerHTML = '<div class="ph"><div class="ph-top">' + (call ? '<span class="ph-call">📞</span>' : '<span class="ph-grp">🎮</span>') +
      '<div><b>' + esc(spec.title || '') + '</b><small id="cut-sub">' + esc(spec.sub || '') + '</small></div></div>' +
      '<div class="ph-chat" aria-live="polite"></div>' +
      '<div class="ph-btns"><button class="btn ghost small" data-a="skip">Skip</button><button class="btn" data-a="go" hidden>' + esc(spec.button || 'Continue') + '</button></div></div>';
    stage.appendChild(o);
    if (spec.music) { music.play(spec.music); music.intensity(spec.intensity || .6); music.duck(true); }
    const chat = o.querySelector('.ph-chat'), goBtn = o.querySelector('[data-a="go"]');
    let i = 0, done = false, timer = 0, t0 = performance.now();
    const callT = call ? setInterval(() => { const s = Math.floor((performance.now() - t0) / 1000); const el = o.querySelector('#cut-sub'); if (el) el.textContent = 'On call · ' + mmss(s); }, 500) : 0;
    const end = () => {
      if (done) return; done = true; clearTimeout(timer); clearInterval(callT);
      if (spec.tbc) { // freeze frame + TO BE CONTINUED
        o.classList.add('freeze'); music.play(null);
        LOD.tone(196, .5, 'square', .09); LOD.tone(247, .5, 'square', .08); LOD.tone(294, 1.4, 'square', .08, 0, .5); LOD.tone(392, 1.4, 'square', .07, 0, .5);
        const t = document.createElement('div'); t.className = 'tbc'; t.innerHTML = '<b>TO BE<br>CONTINUED</b><span>' + esc(spec.tbc === true ? '' : spec.tbc) + '</span><small>Tap to continue</small>';
        o.appendChild(t);
        setTimeout(() => o.addEventListener('pointerdown', close, { once: true }), 700);
      } else close();
    };
    const close = () => { o.classList.add('out'); setTimeout(() => { o.remove(); res(); }, 220); };
    const add = html => { const d = document.createElement('div'); d.innerHTML = html; const n = d.firstChild; chat.appendChild(n); chat.scrollTop = chat.scrollHeight; return n; };
    function next() {
      if (done) return;
      if (i >= spec.lines.length) { goBtn.hidden = false; try { goBtn.focus({ preventScroll: true }); } catch (e) {} if (spec.auto) timer = setTimeout(end, spec.auto); return; }
      const L = spec.lines[i++];
      if (L.at) { add('<div class="ph-time">' + esc(L.at) + '</div>'); timer = setTimeout(next, 600); return; }
      if (L.sfx) {
        if (L.sfx === 'zombie') { zombieGroan(); music.duck(true); haptic('heavy'); }
        if (L.shake) { o.classList.remove('shake'); void o.offsetWidth; o.classList.add('shake'); }
        add('<div class="msg sys"><div class="bub">' + esc(L.text || '') + '</div></div>');
        timer = setTimeout(next, L.wait || 1500); return;
      }
      const mine = L.from === me || L.from === 'You', name = L.from === 'You' ? me : L.from;
      const c = list.find(x => x.name === name), col = c ? c.color : '#93a7b6';
      const typing = add('<div class="msg' + (mine ? ' me' : '') + ' typing">' + avatar(name) + '<div class="bub"><i></i><i></i><i></i></div></div>');
      timer = setTimeout(() => {
        typing.remove();
        add('<div class="msg' + (mine ? ' me' : '') + '" style="--c:' + col + '">' + avatar(name) + '<div class="bub"><b>' + esc(mine ? 'You' : name) + '</b>' + esc(L.text) + '</div></div>');
        LOD.tone(mine ? 880 : 1175, .05, 'sine', .07); LOD.tone(mine ? 1320 : 1568, .07, 'sine', .05, 0, .05);
        timer = setTimeout(next, L.wait || 550 + Math.min(1100, L.text.length * 14));
      }, Math.min(800, 300 + L.text.length * 8));
    }
    o.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.a === 'skip' || b.dataset.a === 'go') { music.duck(false); end(); } });
    if (call) { LOD.tone(440, .3, 'sine', .08); LOD.tone(480, .3, 'sine', .08); LOD.tone(440, .3, 'sine', .08, 0, .5); LOD.tone(480, .3, 'sine', .08, 0, .5); timer = setTimeout(next, 1300); }
    else timer = setTimeout(next, 400);
  }));
}

/* death: grave + the other four crying with beers */
function showRip() {
  return LOD.loadCharacters().then(list => new Promise(res => {
    const me = fighter || LOD.getCharacter() || { name: playerName, id: '' };
    const friends = list.filter(c => c.id !== me.id).slice(0, 4);
    const o = document.createElement('div'); o.className = 'rip'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-label', 'RIP ' + me.name);
    o.innerHTML = '<div class="rip-rain"></div><div class="rip-stone"><b>RIP</b><span>' + esc(me.name) + '</span><small>Fell on the quest to the LAN</small></div>' +
      '<div class="rip-mound"></div><div class="rip-friends">' + friends.map((c, i) => '<div class="rip-f" style="--d:' + (i * .17) + 's"><img src="' + esc(c.src) + '" alt="' + esc(c.name) + '"><i class="tear">💧</i><i class="tear b">💧</i><i class="bt">🍺</i></div>').join('') + '</div>' +
      '<div class="rip-tap">Tap to continue</div>';
    stage.appendChild(o);
    [392, 370, 349, 311].forEach((f, i) => LOD.tone(f, i === 3 ? .9 : .38, 'sawtooth', .06, i === 3 ? -40 : -8, .2 + i * .42)); // sad trombone
    LOD.noise(1.2, .08, 1.8, 600, 'bandpass'); // sobbing
    let done = false;
    const end = () => { if (done) return; done = true; o.classList.add('out'); setTimeout(() => { o.remove(); res(); }, 250); };
    setTimeout(() => o.addEventListener('pointerdown', end), 400);
    setTimeout(end, 5500);
  }));
}
async function copyShare() {
  const t = window.__share, ta = $('#share-text'), msg = $('#copy-msg');
  try { await navigator.clipboard.writeText(t); msg.textContent = 'Copied. Paste it in the Telegram group.'; }
  catch (e) { ta.hidden = false; ta.value = t; ta.focus(); ta.select(); msg.textContent = 'Select the text above and copy it.'; }
}

/* ---------- title: names + mission list ---------- */
function renderTitle() {
  const box = $('#missions'); if (!box) return;
  const t = today();
  box.innerHTML = MISSIONS.length ? MISSIONS.map(def => {
    const st = status(def);
    const tag = st === 'live' ? 'LIVE' : st === 'practice' ? (def.unlock > t ? 'Dev' : 'Practice') : '🔒 ' + prettyDay(def.unlock);
    const sub = st === 'live' ? 'Counts until ' + untilText(def) : st === 'practice' ? 'Played ' + daysText(def) + ' · does not count' : 'Unlocks ' + prettyDay(def.unlock);
    return '<button class="mcard ' + st + '" data-m="' + def.id + '"' + (st === 'locked' || !playerName ? ' disabled' : '') + '><span>Mission ' + def.id + ' · ' + esc(def.title) + '<small>' + sub + '</small></span><span class="st">' + tag + '</span></button>';
  }).join('') : '<p class="muted">No missions yet.</p>';
  $('#missions-note').textContent = !playerName ? 'Pick who is playing first.' : MISSIONS.some(m => status(m) === 'live') ? '' : 'No live mission today. Old missions are practice only.';
  const lan = CFG.LAN_DATE, days = Math.round((Date.parse(lan + 'T12:00:00Z') - Date.parse(t + 'T12:00:00Z')) / 864e5);
  $('#days').textContent = days > 0 ? days : '0';
  $('#days-label').textContent = days > 1 ? 'days to the LAN' : days === 1 ? 'day to the LAN' : days === 0 ? 'LAN day!' : 'LAN is over';
  if (DEV) $('#missions-note').textContent += ' DEV mode' + (FAKE_DATE ? ' · date ' + FAKE_DATE + ' · nothing is sent' : '') + '.';
}
function setName(n) { playerName = n; store.set('lod.name', n); syncNames(); renderTitle(); renderWeapons(); }
function syncNames() { const n = $('#player-name'); if (n) n.textContent = playerName || '?'; }

/* ---------- scoreboard: one tab per mission + badge collection ---------- */
const board = { from: 'scr-title', m: null };
function openBoard(from) { board.from = from; board.m = (M && status(M) !== 'locked' ? M : defaultMission() || {}).id; renderBoard(); show('scr-board'); }
async function renderBoard() {
  const open = MISSIONS.filter(m => status(m) !== 'locked');
  $('#board-tabs').innerHTML = open.map(m => '<button class="chip" data-m="' + m.id + '" aria-pressed="' + (m.id === board.m) + '">' + m.id + ' · ' + esc(m.title) + '</button>').join('');
  $('#board').innerHTML = '<p class="muted">Loading…</p>'; $('#board-note').textContent = ''; $('#collection').innerHTML = '';
  const def = MISSIONS.find(m => m.id === board.m);
  const { rows, src } = await getBoard();
  if (!def) { $('#board').innerHTML = '<p class="muted">No missions yet.</p>'; return; }
  const d = rankDay(rows, def.id, def.unlock, lastDay(def)), live = status(def) === 'live';
  const line = (n, name, sub, score) => '<div class="r"><b>' + n + '</b><span class="n">' + esc(name) + (sub ? '<br><span class="note">' + sub + '</span>' : '') + '</span><span class="s">' + score + '</span></div>';
  let h = '<div class="board-h">' + (live ? (def.until && def.until !== def.unlock ? 'Live until ' + esc(untilText(def)) : 'Today') : esc(daysText(def))) + '</div>';
  if (d.king) h += line(CFG.KING, d.king.name, 'Sidequest King · longest round', mmss(d.king.time));
  h += d.list.length ? d.list.map((r, i) => line(i + 1, r.name + (d.king && d.king.name === r.name ? ' ' + CFG.KING : ''), r.rank[0] + ' ' + r.rank[1], fmt(r.score))).join('')
    : '<p class="muted">' + (live ? 'No scores today. Be the first.' : 'Nobody played on the day.') + '</p>';
  $('#board').innerHTML = h;
  const col = Object.values(collection(rows)).sort((a, b) => b.pts - a.pts);
  $('#collection').innerHTML = col.length ? col.map(o => '<div class="r"><b>' + esc(o.n.slice(0, 1)) + '</b><span class="n">' + esc(o.n) + '</span><span class="s">' + badgeText(o) + '</span></div>').join('') : '<p class="muted">No badges yet.</p>';
  $('#board-note').textContent = (src === 'live' ? 'Shared group board.' : src === 'cache' ? 'Offline: last saved group board.' : 'Scores on this phone only.') + (live ? ' Badges are final ' + untilText(def) + '.' : '');
}

/* ---------- reset test data (this phone only; the shared board is untouched) ---------- */
let resetArm = 0;
function resetData() {
  const b = $('#reset-data');
  if (Date.now() - resetArm > 3000) { resetArm = Date.now(); b.textContent = 'Tap again to erase everything on this phone'; b.classList.add('danger'); setTimeout(() => { if (Date.now() - resetArm >= 3000) { b.textContent = 'Reset test data'; b.classList.remove('danger'); } }, 3100); return; }
  resetArm = 0;
  try { Object.keys(localStorage).filter(k => k.startsWith('lod.')).forEach(k => localStorage.removeItem(k)); } catch (e) {}
  playerName = ''; fighter = null; LOD.resetCharacter(); LOD.setMuted(false);
  b.textContent = 'Reset test data'; b.classList.remove('danger');
  goTitle();
}

/* ---------- wiring ---------- */
function initUI() {
  $('#who-names').addEventListener('click', e => { const b = e.target.closest('.who'); if (b) { setName(b.dataset.name); LOD.tone(660, .06, 'square', .05); LOD.tone(990, .08, 'square', .05, 0, .06); goTitle(); } });
  $('#change-player').addEventListener('click', () => { renderWho(); show('scr-who'); });
  $('#weapons').addEventListener('click', e => { const b = e.target.closest('.wpn'); if (b) selectWeapon(b.dataset.w); });
  const fb = $('#btn-fire');
  fb.addEventListener('pointerdown', e => { e.preventDefault(); fireHeld = true; fb.classList.add('on'); try { fb.setPointerCapture(e.pointerId); } catch (er) {} });
  const fUp = () => { fireHeld = false; fb.classList.remove('on'); };
  fb.addEventListener('pointerup', fUp); fb.addEventListener('pointercancel', fUp); fb.addEventListener('lostpointercapture', fUp);
  fb.addEventListener('contextmenu', e => e.preventDefault());
  $('#missions').addEventListener('click', e => { const b = e.target.closest('.mcard'); if (b && !b.disabled) openMission(MISSIONS.find(m => m.id === +b.dataset.m)); });
  syncNames();
  $('#story-next').addEventListener('click', () => { if (storyI < M.story.length - 1) { storyI++; renderStory(); } else showBrief(); });
  $('#story-skip').addEventListener('click', showBrief);
  $('#brief-go').addEventListener('click', beginPlay);
  $('#brief-back').addEventListener('click', goTitle);
  $('#to-board').addEventListener('click', () => openBoard('scr-title'));
  $('#board-tabs').addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) { board.m = +b.dataset.m; renderBoard(); } });
  $('#reset-data').addEventListener('click', resetData);
  $('#board-back').addEventListener('click', () => { if (board.from === 'scr-result' && G && G.mode === 'result') show('scr-result'); else goTitle(); });
  $('#btn-pause').addEventListener('click', pauseGame);
  $('#resume').addEventListener('click', resumeGame);
  $('#quit').addEventListener('click', goTitle);
}
window.addEventListener('keydown', e => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  const k = e.key.toLowerCase();
  if (G && G.mode === 'play' && ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  if (k === 'p' || k === 'escape') { if (G && G.mode === 'play') pauseGame(); else if (G && G.mode === 'pause') resumeGame(); return; }
  if (G && G.mode === 'play') { const L = loadout(); if (/^[1-3]$/.test(k) && L.owned[+k - 1]) { selectWeapon(L.owned[+k - 1]); return; } if (k === 'q') { selectWeapon(L.owned[(L.owned.indexOf(weapon().id) + 1) % L.owned.length]); return; } }
  keys.add(k);
});
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => { keys.clear(); J = null; });
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });
cv.addEventListener('pointerdown', e => {
  if (G && G.mode === 'ending' && G.endT > .1 && G.t > 0) { G.endT = .05; return; } // tap skips the ending animation
  if (!G || G.mode !== 'play') return;
  const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  J = { id: e.pointerId, bx: x, by: y, x, y }; try { cv.setPointerCapture(e.pointerId); } catch (er) {}
});
cv.addEventListener('pointermove', e => { if (J && e.pointerId === J.id) { const r = cv.getBoundingClientRect(); J.x = e.clientX - r.left; J.y = e.clientY - r.top; } });
const endPtr = e => { if (J && e.pointerId === J.id) J = null; };
cv.addEventListener('pointerup', endPtr); cv.addEventListener('pointercancel', endPtr);

function boot() {
  if (booted) return; booted = true;
  initTelegram();
  M = defaultMission();
  resize(); new ResizeObserver(resize).observe(stage);
  initUI(); goTitle();
  flush();
  getBoard().catch(() => {}); // warm the cache for the badge line on fighter select
  requestAnimationFrame(frame);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else setTimeout(boot, 0);

/* ---------- public API ---------- */
Object.assign(LOD, {
  mission, missions: MISSIONS, status, today, dayKey, prettyDay, dev: DEV,
  view, cam, ctx, cv, stage, input, toScreen,
  addScore, combo, comboBreak, pop, toast, burst, after, ramp, tickFx, em, rrect, haptic,
  perk, weak, egg, beer, tryShield, callout, abilityCallout, weakCallout, eggFound, PERKS,
  WEAPONS, weapon, hasWeapon, unlockWeapon, selectWeapon, loadout,
  finish, resume, otherPlayer: () => pick(CFG.PLAYERS.filter(n => n !== playerName)),
  ui: { show, hideAll, panel, $ }, cutscene, zombieGroan,
  api: { submit, flush, getBoard, rankDay, dayKey, collection },
  clamp, rand, pick, fmt, mmss
});
Object.defineProperties(LOD, { // live getters (Object.assign would copy a snapshot)
  G: { get: () => G }, M: { get: () => M }, player: { get: () => playerName }, fighter: { get: () => fighter || LOD.getCharacter() }
});
window.__lod = { LOD, openMission, beginPlay, setName, showResult, renderBoard, finish, get G() { return G; } }; // test hooks
})();
