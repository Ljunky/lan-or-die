# Browser tests

Small Playwright scripts that open the game in a hidden Chrome, click through the menus like a player, check that things work and save screenshots to `tests/out/` (not committed). Players never load these files.

| Script | Checks |
|---|---|
| `engine-m1.js` | Mission 1 plays through the real menus: clock, keys, pause/resume, finish, result screen. Pause button top-left, no in-game sound button. Mission 2's "tilt your phone" screen pauses in portrait and resumes in landscape; your own pause survives a rotate. |
| `m2.js` | Mission 2 (28 checks): camera height, car at the bottom, stop button with the friend in view, pickup, −2 000 drive-past penalty (never below 0), blood splats (max 6, edges only, fade out), wife text, Jrohn's Yes/No and space mode (big rock = −1 life, small rock = points), running over a friend (no win, not sent to the board), playing as Jrohn. |
| `m2-fixes.js` | Early first wife text, browser fullscreen on Play (released at the menus), Jrohn's Yes/No fits a 300 px high screen, Mission 1 not fullscreen. |
| `m3.js` | Mission 3: brief Go → Continue/New game, no OVERLOAD (noTimer), tutorial + starter, walking and the lake as a wall, tall-grass encounter, fight + XP, catching with a bag, buying at Systembolaget, partners (right line / survive, mirrored controls), the 4 hero bosses, stock room opening, save on pause + Continue, Dev Ljunky → result screen, New game needs two taps, autosubmit sends only a new best (fake live day, network mocked). |
| `m2-billboards.js` | Only screenshots of the four hero billboards. |
| `m3-polish.js` | Mission 3 polish (65 checks): release gating, phone apps (Swish, Klarna limit, BankID door, Tibber), dev long-press tile, data validates, solid start screen without hints, discovery (??? until used, saved), throw + knockout → catch, finish off → grave → resurrect with a liked lure, trap wait + dazed spawn, coke ×4 heart attack → cemetery, mushrooms reveal EPIC creatures, ring box → catch a wife, dealer trade + wife refusal, Ljunky → AI-Ljunky → training board (tier cap, coke overdose) → grave reward → Mythic Trap catch, old v1 save migration, an NPC + a trap added purely via data, `?fx=off`. Screenshots `M3P_*.png`. |
| `flow.js` | Helper: clicks through name → hero → intro → brief → play. |

## Run them
Needs Node and Playwright with Chromium (`npm i -D playwright && npx playwright install chromium`; Claude Code cloud sessions already have it). From the repo root:

```bash
bash tests/run.sh
```

Every line says `PASS` or `FAIL`; the script ends with `ALL PASSED` or `SOME TESTS FAILED`. To run one script against an already running server: `LOD_URL=http://127.0.0.1:8123/ node tests/m2.js`.

The tests use `?dev=all&date=2026-11-21`, so nothing is ever sent to the scoreboard, and the hooks `window.__lod` (engine), `window.__m2` (Mission 2) and `window.__m3` (Mission 3, with `speed` to run battle waits faster and `trapSpeed` to make traps ready at once) to set up situations quickly.

## When you change things
- Run all of them after any change to `engine.js` or `index.html`: they are the quick check that Missions 1 and 2 still work.
- New mission? Add `tests/mN.js` (copy the start of `m2.js`), expose test hooks as `window.__mN` in the mission, and add it to `run.sh`.
- A check that depends on a number in `CFG` (e.g. `CAM_HEIGHT: 1300`) fails if you change that number on purpose: update the test too.
