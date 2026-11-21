# LAN OR DIE – ENGINE.md

Motorn (`engine.js`) äger allt som är lika i alla missions. En mission är en fil i `missions/` som anropar `LOD.mission({...})`.

## Filer
| Fil | Innehåll |
|---|---|
| index.html | Skal: titel + missionsmeny, story, brief, paus, resultat, topplista. CSS. |
| engine.js | Ljud, karaktärer, karaktärsval, poser **+ core**: loop, input, kamera, HUD, poäng, combo, fx, timers, ramp, finish/resultat, backend (`LOD.api`), topplista, badges, datumlås, Telegram. |
| missions/m1.js | Mission 1 "Sneak Out" (bara spelet). |
| characters.json + 5 png | Karaktärerna. |

**Ny mission:** skapa `missions/mN.js` och lägg en rad i index.html: `<script src="missions/mN.js"></script>`.

## Konfig (`LOD.CFG` överst i core)
`API_URL`, `TZ` (Europe/Stockholm), `MAX_TIME` (180), `LAN_DATE`, `PLAYERS` (5 namn), `RANKS`.

## Datum, Practice, dev
- `unlock: 'YYYY-MM-DD'` = missionens första dag, `until: 'YYYY-MM-DD'` (valfri) = sista dagen den räknas. En gemensam rankning för hela perioden. Före: låst. Samma dag: **LIVE** (poäng skickas). Efter: **Practice** (spelbar, poäng skickas inte, räknas inte).
- Rankbadges och 👑 räknas bara på missionens egen dag. Slutgiltiga 23:59.
- `?dev=all` låser upp allt (som Practice). `?dev=all&date=2026-11-20` låtsas att det är ett annat datum (skickar aldrig poäng).

## Mission-definition
```js
LOD.mission({
  id: 2, title: 'The Wife Boss', unlock: '2026-11-20',
  cap: 300000,              // poängtak (håll lika med Code.gs)
  maxTime: 180,             // valfri, default CFG.MAX_TIME -> OVERLOAD
  landscape: true,          // valfri: spelas liggande. Stående telefon = paus + #rotate-warning, Telegram låser orienteringen
  noTimer: true,            // valfri: ingen maxTime/OVERLOAD, klockan visar total speltid (M3)
  save: true,               // valfri: sparar per spelare i localStorage 'lod.save.m<id>.<spelare>' var 10:e s, vid paus och när fliken döljs.
                            //   Missionen ger datat: saveState(G) -> objekt, loadState(G, data) efter init, start(G, continued). Briefen får Continue / New game.
  perkText: { loken: { intro, weakText } }, // valfri: egen text för hjältens förmåga/svaghet i briefen och startrutan
  submitOnSave: true,       // valfri: skickar aktuell total när den slår spelarens bästa, max en gång per minut + när man lämnar
  world: { w: 1600, h: 1000 },
  intro: ({ player, fighter }) => ({ kind: 'chat', title, sub, button, lines: [{ at }, { from, text }, { sfx: 'zombie', text, shake }] }), // valfri, mobilchatt före briefen ('You' = spelaren)
  outro: (G, { player }) => spec | null,      // valfri, t.ex. { kind: 'call', music: 'game', tbc: 'text', lines } när man klarar banan
  story: [{ time, text, q, danger }],          // valfri, används om intro saknas
  brief: { card: '<html>', tips: [['Move', 'drag...'], ...] },
  badges: [{ em: '🍯', name: 'Smooth Operator', t: s => s.smooth }],

  init(G) {},               // bygg världen på G (G.hp/G.maxHp sätts här)
  start(G) {},              // valfri, när rundan börjar
  update(G, dt) {},         // bara när G.mode === 'play'
  frame(G, dt) {},          // varje bildruta i alla lägen (ambience, regn)
  camTarget(G) { return [x, y]; },
  drawWorld(ctx, G, t) {},  // världskoordinater
  drawScreen(ctx, G, t) {}, // skärmkoordinater (mörker, regn, blixt)
  hud(ctx, G) {},           // extra HUD (motorn ritar hjärtan, klocka, poäng, combo, toast, joystick)
  timerText(G) {},          // valfri
  overloadWin(G) {},        // valfri: räknas Overload som klarad? default true
  onFinish(G) {},           // valfri: ljud/toast när rundan tar slut
  result(G) { return { head, lead, rows: [[label, pts]], bonus: [[label, pts]], stats: {}, line: 'Made it in 1:23.', noSubmit: false }; } // noSubmit: true = rundan skickas inte (sparas som practice)
});
```
Total = `G.score + summa(bonus)`, kapad till `cap`.

## Motorns API (window.LOD)
- **State:** `LOD.G`, `LOD.M`, `LOD.player`, `LOD.fighter`, `LOD.view {W,H,DPR,scale,safeTop,hudLeftY}`, `LOD.cam`, `LOD.ctx`.
- **HUD-layout:** pausknappen sitter uppe till vänster. `hud()` ritas redan nedflyttad med `view.safeTop` (Telegram fullscreen). Lägg `LOD.view.hudLeftY` på y för allt i vänsterkolumnen, så hamnar det under pausknappen. Ingen ljudknapp i spelet (telefonens volym gäller, sparad mute fungerar fortfarande).
- **Input:** `LOD.input.move()` → `{x, y, len}` (tangenter + joystick), `LOD.input.clear()`.
- **Poäng:** `LOD.addScore(pts, kategori?)` (summeras i `G.cats`), `LOD.combo()` → multiplikator 1–5, `LOD.comboBreak()`.
- **Fx:** `LOD.pop(x,y,text,color)`, `LOD.toast(text, sek)`, `LOD.burst(x,y,color,n)`, `LOD.em(emoji,x,y,size,alpha)`, `LOD.rrect(x,y,w,h,r)`, `LOD.haptic('light'|'medium'|'heavy'|'success'|'error')`.
- **Tid:** `LOD.after(sek, fn)` (pausas med spelet), `LOD.ramp({every, overload})` → `.tick(dt)` (true vid ny nivå), `.lvl`, `.over`, `.step(bas, perNivå)`.
- **Flöde:** `LOD.finish(win, why)` (`why`: 'done' | 'drive' | 'down' | 'overload'), `LOD.resume()` (tillbaka till spel från egen skärm), `LOD.ui.panel(id, html)` (egen skärm), `LOD.ui.show(id)`, `LOD.ui.hideAll()`.
- **Backend:** `LOD.api.submit(row)`, `.getBoard()`, `.rankDay(rows, mission, day)`, `.dayKey(ts)`, `.flush()`.
- **Hjälp:** `LOD.clamp, rand, pick, fmt, mmss, esc, today(), status(def)`.
- Ljud och karaktärer som förut: `LOD.tone, noise, setLoop, charAvatar, charMod, playPose(c, host, {hold}), showCharacterSelect`.
- **Musik:** `LOD.music.play('title'|'game'|null)`, `.intensity(0..1)`, `.duck(bool)`. Motorn sätter intensiteten från tiden (sista minuten ≥ 0,82); missionen kan höja med `intensity(G)`.
- **Abilities (PERKS i engine.js):** `LOD.perk('speed'|'light'|'fireRate'|'range'|'comboTime'|'hugHeal'|'shield')` (ölförstärkt), `LOD.weak()` → 'packages'|'jungle'|'pants'|'coins'|'cat', `LOD.egg()` → {em, what, done}, `LOD.tryShield()`, `LOD.beer()` (max 3, 20 s), `LOD.callout(titel, text, 'good'|'bad')`, `LOD.abilityCallout(text)`, `LOD.weakCallout(text)`, `LOD.eggFound()`.
- **Vapen (sparas per spelare över alla missions):** `LOD.input.fire` (håll knappen / Space), `LOD.weapon()` → {id, kind:'gun'|'melee'|'spray', rate, range, dmg, noise, silenced}, `LOD.unlockWeapon('knife'|'extinguisher'|'silencer')`, `LOD.hasWeapon(id)`. Missionen gör själva träffarna.
- **Motorn sköter också:** "Who's playing?"-skärmen, sista minuten (`G.finalMin` + `onFinalMinute(G)`), RIP-graven vid `why: 'down'`, tryck för att hoppa över slutanimationen. `noFire: true` i en mission döljer skjutknappen. `eggs: true` visar easter egg-tipset i briefen.

## Svårighetsregel (alla missions)
Svårighet och poäng per sekund ökar med tiden. Använd `LOD.ramp`. Senast vid `maxTime` blir det OVERLOAD, och poängen sparas.

## Ändringar i Code.gs (gör när Mission 2 finns)
1. Poängtak per mission: `const CAPS = {1: 300000, 2: 300000};` och kontrollera `score <= CAPS[mission]`.
2. Valfritt: neka rader där dagen (Europe/Stockholm) inte är missionens dag.
3. Valfritt: räkna rankbadges och 👑 i `morningPost`.
