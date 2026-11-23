# DATA.md: adding Mission 3 content without code

Everything in Mission 3 lives in **`data/m3-data.js`**: creatures, items, NPCs, the gym, graves, the dealer, phone apps, zones and unlock dates. `missions/m3.js` only holds the rules. To add something, copy an example below into the right section, change the values, reload with `?dev=all` and check the browser console: `[PX.data]` lists broken references, unknown kinds and missing art. The game never crashes on a bad entry; it warns.

## Rules that apply to every entry
| Field | Meaning |
|---|---|
| `release: 'mon' \| 'tue' \| 'wed'` | Hidden before that day (dates in `releases` at the top). `?dev=all` shows everything. A plain date `'2026-11-27'` also works. |
| `requires: 'flagName'` | Hidden until that flag is set in the save (e.g. `ljunkyDone`, `mythicSpawned`, `loyalReady`). |
| `at: [x, y]` | Tile on the 48 × 74 map. **To find one:** open `?dev=all`, long-press the map. The tile is shown and copied to the clipboard. |
| `likes` | An item id (`'buns'`, `'honey'`) or a lure tag (`'WIFE'`, `'HERO'`, `'BUNS'`). At the grave, any item whose id or `lure` matches can be offered to resurrect it. Creatures like their first `bait` unless they have `likes`. |
| `learnedNote` | Effect text. Players see **???** until they have used the item once, then this note. |

No tutorial or hint text anywhere. Hints go in signs, NPC `lines` and how things look.

## Creature (one entry per FORM; design in `M3_CREATURES.md`)
There are 96 forms in 26 **lines** (5 starter lines, 21 wild lines) plus the Cold Wallet Wraith, the one creature outside the roster (it belongs to the grave reward). A line is a family: Mouse → Rat → Rat King, plus the drug forms.
```js
// creatures: { … }
badgerCub: { line: 'badger', stage: 1, no: 1, name: 'Badger Cub', type: 'FANG', rarity: 'C', size: 'S', stats: [50, 53, 48, 42],   // HP ATK DEF SPD
  moves: [['claw', 1], ['slam', 1], ['bite', 8], ['maul', 20]],       // [move id, level it is learned]; the last 4 learned are used
  desc: 'A cub with the confidence of a bear.', evolve: { lv: 16, to: 'badger' }, starter: true, mat: 'fur', bait: ['honey'], release: 'mon' },
badger: { line: 'badger', stage: 2, …, evolve: { lv: 32, to: 'honeyBadger' }, feedLv: 24,
  feed: { xanax: 'xanadger', molly: 'ecstadger', keta: 'ketadger', lsd: 'ladger' } },   // feed the TEEN a drug at or above feedLv
xanadger: { line: 'badger', stage: 'drug', name: 'Xanadger', trip: 'xanax', feedFrom: 'badger', moves: […, ['nap', 1]], … },
```
| Field | Meaning |
|---|---|
| `line`, `stage` | The family and `1` youngling · `2` teen · `3` adult · `'drug'` (only by feeding). Stats: stage 1 ≈ 75 % of the line's teen stats, stage 3 ≈ 125 %, drug forms ≈ 130 %. |
| `evolve: { lv, to }` | Automatic evolution at that level (flash, announced; name, nickname, level and XP stay). Chain levels must rise. |
| `feed`, `feedLv`, `feedFrom`, `trip` | Drug forms: see **Drug forms and trips** below. |
| `size` | `S` a carrier bag works · `M` bag only as a youngling (stage 1) · `L` / `XL` trap only. A creature from a trap can always be bagged. |
| `tier`, `trap`, `hab`, `bait`, `day`, `night`, `nightBoost` | Traps: see **Traps** below. |
| `mat` | What Finish off drops (`fur`, `feather`, `scale`, `chitin`, `shell`, `antler`): 1 for S/M, 2 for L, 3 for XL. |
| `starter: true` | Only ever a starter. Never in zones, traps or the Fältboken list until you have seen it. |
| `wild: true` (drug form) | May also appear in the wild: name it in a zone's `enc` (Methmoth at city lamps at night, Trancequirrel at the rave at night). |
| `needs: 'reveal'` | Only while something reveals it: mushrooms, LSD, a Ladd-ybug in the party. (Trippopotamus.) |
| `ability` | `noDrops` (ignores stat drops: Honey Badger), `reveal` (Ladd-ybug). |
| `rarity` | `C` `U` `R` `E` `L` `M`: catch odds, XP stats, Kenny's and the dealer's prices. `M`: add `trapOnly: 'mythicTrap'`. |
| `art` | **Not needed any more:** put a PNG (96 × 96 recommended, 48 × 48 also works, any mix) named after the form id in `assets/creatures/` (`assets/creatures/badgerCub.png`) and the game uses it; 96 px art is shown at the same on-screen size as 48 px art, smoothed (looked up once when the mission opens; a missing file is silent and shows a dark disc with a `?`). An explicit `art: '…'` still works and warns when its file is missing. Make the PNG from any picture with `node tools/import-art.js photo.jpg badgerCub` (or open `tools/import-art.html`): background removed, cropped, 96 × 96 (`--size 48` for the small format), thick navy outline, palette-snapped (only for pixel art; photos and AI pictures keep their colours, see `--snap` / `--no-snap`), navy outline. |

**Where things name creatures** (zones, trainer `party`, `debtCollector.team`, fishing `catch`, quests `carry:`): a **line** id (`'rat'`) means "the form that lives at that level" (Mouse below Lv 12, Rat to 29, Rat King from 30), an exact form id (`'cokeroach'`, `'pikezilla'`) means that form. `carry: 'rat'` matches any form of the line. Hero teams (`heroes.x.team`) are exact drug forms; their levels follow `tuning.BOSS_LV` + steps per hero beaten, or with `BOSS_AT_GATE: true` the house gate −2 / ±0 / +2. A line you add needs at least one form with `stage: 1` (the youngling) to be found.

**Species points** count LINES you caught by bag or trap (the first form of each line), never forms, starters or evolutions. 21 wild lines exist, the goal counts 20.

## Types
```js
types: { cycle: ['FANG', 'WING', 'ROOT', 'WATER', 'STONE', 'SHELL'], strong: 1.5, weak: .67, colors: { FANG: '#b5651d', … } }
```
Each beats the next one in the list and loses to the one before: FANG › WING › ROOT › WATER › STONE › SHELL › FANG. `MIND` is neutral (people, Dev Ljunky, the Wraith). Items use the same names: `good: 'FANG'` on a drink, `vs: { WATER: 2.5 }` on a throwable, `attract` effect values.

## Drug forms and trips
Feed a teen (Bag → Use → pick a drug → pick a creature) a drug it has a recipe for, at or above its `feedLv`, and it becomes the drug form. Too young: "very relaxed. Nothing else happens. Yet." Every feeding rolls a **bad trip** (`trips.<drug>.badTrip`, 5–12 %): the creature is *sketchy* for `tuning.TRIP_MIN` real minutes (30): it cannot fight, shows grey with 🥴, the timer runs while the game is closed, nobody dies. A feeding that works also teaches you the recipe (knowledge `recipe:<form>`), which can be told by people (`tell: ['recipe:xanadger']`) and shows in Fältboken.
```js
// the drug is an item with feed: true (it can also be taken yourself); the trip is a row in trips with the SAME id
molly: { kind: 'drug', feed: true, name: 'Molly', em: '💖', price: 70, use: […], release: 'tue' },
trips: { molly: { name: 'Love Everyone', up: '…', down: '…', healParty: .05, catchBonus: .15, skipP: .2, skipText: 'is too full of love to attack.', badTrip: .09 } },
```
Trip numbers: `defMul` `spdMul` `atkMul` (stat multipliers) · `skipP` + `skipText` (+ `halfDmg`) lose the turn · `healSelf` `healParty` `drainSelf` (share of max HP per turn) · `first` (always first) · `crit` · `immune: ['drops', 'status', 'confuse']` · `extraHits` + `accPenalty` · `atkStep` `defStep` (steps per turn) · `confuseOnHit` · `foeAtkEvery2` · `lsd` (type changes each turn) · `catchBonus` · `reveal` · `badTrip`. Drug forms also get a signature **move** (see Move).

## Move
```js
// moves: { … }
toast: { name: 'Golden Toast', type: 'FANG', p: 65, acc: .9, stun: .2, say: 'Ding!' },    // p = power, 0 = status move
cheer: { name: 'Pep Talk', type: 'MIND', p: 0, self: { atk: 1, spd: 1 }, heal: .2 },     // status: stat stages / heal
```
Extras (all optional): `hits` (number or `[min, max]`) · `heal` · `partyHeal` · `selfStun` + `stunText` · `foeLose` (foe skips n turns, once per battle) · `vanish` (hides one turn, then hits) · `cute` · `confuse` (chance; a status move always) · `confuseAll` · `poison` (turns) · `drain` · `recoil` · `rage` (stronger when hurt) · `bestType` · `sure` (never misses) · `team: {spd: 1}` + `nightTeam` · `say`. Hero, wife and NPC moves use `type: 'MIND'` (neutral).

## Items (`kind` = throwable | trap | bait | material | lure | weapon | drug | app | key)
```js
// items: { … }
// THROWABLE: thrown in battle (Throw menu). hit = chance. throw = effects on the target.
pie: { kind: 'throwable', name: 'Cream pie', em: '🥧', price: 9, hit: .8,
  throw: [{ type: 'damage', value: 12, vs: { SHELL: 2 } }, { type: 'blind', value: .3, turns: 2 }],
  learnedNote: 'Blinds. Great against SHELL.', release: 'tue' },
// For the women only: add  wife: true  (calm = lowers her mood bar, anger = raises it).

// TRAP: see Traps. A trap belongs to a ladder (ground | water | air) and a tier 1-5. You only buy tier 1; Trapper Tore upgrades.
mouseTrap: { kind: 'trap', name: 'Mouse trap', em: '🪤', price: 30, value: 30, ladder: 'ground', tier: 1, cap: 'S', waitMin: 4, place: 'ground',
  upgradesTo: 'liveBox', upgradeCost: { kr: 60, fur: 3 }, learnedNote: 'Ground trap, tier 1.', release: 'mon' },
// lure: 'WIFE' traps catch a wife (old style: lure + tier + waitMin + catchBonus). spawn: 'creatureId' always holds that one creature (the Mythic Trap).
// BAIT / MATERIAL: bait = what you put in a trap; material = dropped by Finish off.
cheese: { kind: 'bait', name: 'Cheese', em: '🧀', price: 4, learnedNote: 'Bait: mice and rats.', release: 'mon' },
fur: { kind: 'material', name: 'Fur', em: '🧶', notSold: true, learnedNote: 'Trap upgrades.', release: 'mon' },

// LURE: used on the map for 60 s, attracts a type ('FANG'…), a wife ('WIFE') or a hero ('HERO'). Also resurrection bait.
kanelbulle: { kind: 'lure', name: 'Kanelbulle', em: '🥐', price: 12, lure: 'BUNS',
  use: [{ type: 'attract', value: 'FANG', duration: 60 }], learnedNote: 'FANG animals come running.', release: 'tue' },

// WEAPON: in the Throw menu, never used up. upgradesTo + upgradeCost = buy the next tier at a shop that sells the base weapon.
slingshot: { kind: 'weapon', name: 'Slingshot', em: '🪃', price: 80, hit: .8, throw: [{ type: 'damage', value: 20 }],
  upgradesTo: 'slingshot2', learnedNote: 'Reusable.', release: 'wed' },
slingshot2: { kind: 'weapon', name: 'Slingshot Pro', em: '🪃', price: 0, upgradeCost: 120, notSold: true, hit: 1, throw: [{ type: 'damage', value: 30 }], learnedNote: 'Never misses.', release: 'wed' },

// DRUG: use = on you (seconds). throw = on the opponent (turns). train = on a creature in the gym. drink: true counts towards the blur.
energy: { kind: 'drug', name: 'Energy drink', em: '🥫', price: 15,
  use: [{ type: 'speed', value: .5, duration: 30, stacks: true, maxStacks: 4, onOverdose: { type: 'heartAttack' } }],
  throw: [{ type: 'stat', value: { spd: 2 }, turns: 3 }],
  learnedNote: 'Zoom. Max four.', release: 'wed' },

// KEY: quest items. list: true + zone = can be on the shopping list.
kexchoklad: { kind: 'key', list: true, name: 'Kexchoklad', em: '🍫', zone: 'pickmix' },
```
**Sell it:** add the id to an NPC's `shop` list (see NPC).

## Effects (use in `use`, `throw`, `train`, app `use`)
| type | value | Notes |
|---|---|---|
| `speed` | +1 = double game speed (negative = slow-mo) | `stacks/maxStacks/onOverdose` |
| `heal` | 0.3 = 30 % | |
| `stat` | `{ atk, def, spd, acc, crit }` | on you: seconds; thrown: stat stages |
| `damage` | base damage, `vs: { TYPE: mul }` | thrown |
| `stun` / `sleep` / `loseTurn` | `turns` | sleep breaks when hit |
| `blind` | 0.35 = −35 % accuracy | thrown |
| `confuse` | | thrown |
| `catchBonus` | 0.4 = +40 % catch chance | you or the target |
| `reveal` | | EPIC creatures appear, controls wobble |
| `attract` | type, `'WIFE'` or `'HERO'` | more encounters of that type, or someone comes to you |
| `xpRate` | +1 = double training XP | gym (`train`) |
| `tint` | `'rainbow'` or a colour | screen tint + wobble |
| `calm` / `anger` | % of her mood bar | wives |
| `flee` | `vs: 'WILD', chance: .5` | |
| `kr` / `promiseDebt` / `cure` / `guard` / `say` | | money, debt, clear confusion, guilt immunity, a line |
| `heartAttack` | | used as `onOverdose` |
| `spawnTable` | `[[creature, weight]]` | while active, these join every encounter table (a trap's `rare` list works the same way) |

All effects take `duration` (seconds) or `turns`. Neither means instant. They also take `stacks: true, maxStacks: 3, onOverdose: { … }`.

## NPC
```js
// npcs: { … }   role: talker | merchant | trainer | gym | dealer | filler
gunnar: { name: 'Gym-bro Gunnar', role: 'trainer', at: [40, 16], area: [39, 15, 4, 2],   // area = wander box (omit = stands still)
  look: { skin: '#e0a882', hair: '#222', style: 'short', top: '#f7931a', legs: '#111', big: 1, glasses: 1 },
  party: [['bear', 10], ['golem', 11]],                // trainers fight with these
  shop: ['protein'],                                   // merchants (and anyone) can sell
  lines: { pool: ['Bro.', 'Leg day is a myth.'], when: [{ flag: 'ljunkyDone', text: 'RIP the coach. Anyway, bro.' }] },
  gossip: true,                                        // mixes in hero gossip + nonsense
  canDie: true, catchable: true, likes: 'protein', epitaph: 'Skipped the cooldown.', release: 'tue' },
```
- **Look (paper doll):**
  - `style`: `short`, `bald`, `cap`, `bob`, `long`, `straight`, `updo`, `messy`, `hat`.
  - `topStyle`: `tee`, `stripe`, `plaid`, `armor`, `blazer`, `dress`, `gown`.
  - `prop`: `clip`, `plant`, `shield`, `bow`, `bouquet`, `clutch`, `tablet`, `wine`, `bag`, `apron`.
  - Flags: `glasses`, `beard: '#hex'`, `stache`, `patch`, `freckles`, `necklace`, `big`, `cats`.
  - Colours: `skin`, `hair`, `top`, `top2`, `legs`, `shoes`, `cap`, `cap2`.
  - New hair or clothes shapes go in `dollParts` (rect layers).
- **Portrait for the fight intro:** `assets/portraits/<npcId>.png` (any size, transparent). Without one, the sprite is used.
- **Heal spot:** `heal: true`. **Hidden:** `hidden: true` (drawn faint until you are close, like the dealer).
- **Fillers:** random shoppers come from `fillers` (count, names, hair, tops, legs, lines). To get more, raise `count` or add names.

## Hero, wife
`heroes` and `partners` follow the same pattern: `at`, `look`, `likes`, `epitaph`. Heroes also have `team`, `stats` and `moves` (used when caught). Wives also have `kind` (Guilt|Psychic), `moves`, `good`/`bad` lines and `fightMoves`.

## Zone
```js
// zones: { … }  first match wins; r = [x, y, w, h] in tiles. enc = [[line or form, weight]] (the level picks the form). hab = habitat tag for traps.
deli: { name: 'Deli counter', hab: 'maxi', r: [2, 39, 6, 3], enc: [['rat', 3], ['cockroach', 1]], lv: [6, 9], release: 'tue' },
```
The game skips `night` creatures by day and `day` creatures at night, doubles `nightBoost` ones at night, and never rolls a `starter`. Habitat tags used so far: `maxi` `lot` `lawn` `golf` `city` `forest` `deepforest` `mountain` `castle`; the lakes are `oldlake` and `biglake` (picked from the water next to the trap).

## Gym, graves, dealer, apps
```js
gyms.box.tiers:   [{ cap: 12 }, { cap: 16, flag: 'aiBeaten' }, { cap: 20, flag: 'mythicCaught' }]   // training level cap per tier
graves.default:   ['Here lies {name}. Shopped till dropped.']          // {name}, creatures also {n}
graves.reward:    { rewardGrave: 'ljunky', give: ['coke', …, 'mythicTrap'], flag: 'mythicSpawned', … }
dealer.rates:     { C: 1, U: 2, R: 4, E: 7, L: 9, M: 12, H: 5 }        // creature points per rarity (× 1 + level × levelBonus)
dealer.book:      { item: 'faltboken', price: 4, line: '…' }          // always for sale (creature points) until you own the book
dealer.stock:     [['coke', 3, 3], …]                                  // [item, price in points, weight]; rotates every rotateMin
dealer.refuse:    ['No wives. Bad for business.']                      // said when you offer a wife
apps.tinder:      { name: 'Tinder', icon: '🔥', lines: ['It\'s a match! With {name}.'], use: [{ type: 'promiseDebt', value: 1 }], once: 1, release: 'wed' }
```
App line variables: `{steps}`, `{price}`, `{name}`, `{kr}`, `{debt}`.

## Things to do: quests, puzzles, mini-games, day and night, rumours

### Quests (`quests`)
```js
bottle_war: { name: 'The bottle war', giver: 'pelle', release: 'tue', locks: ['berit_parcel'],     // starting this closes the others (you chose a side)
  steps: [ { text: 'Ask Berit. Pick a side.', done: { flag: 'bw_decided' } },                          // done when the conditions match (same language as dialogue)
           { text: 'Tell Pelle.', turnIn: 'pelle', done: {} } ],                                      // turnIn = only when you talk to that person; done: {} = always true
  rewards: [ { if: { flag: 'side:berit' }, rel: { berit: 3, pelle: -3 }, give: { bag: 3 }, text: '…' },   // the best matching reward is given: choices matter
             { if: { flag: 'side:pelle' }, rel: { pelle: 3, berit: -3 }, give: { bottle: 3 } } ] }
```
- **Start** a quest from any dialogue line or reply: `quest: 'bottle_war'`. A reply can set the choice: `set: { 'side:berit': true, bw_decided: true }`.
- **Step effects** (on a step or a reward): `give`, `take` (hand in items), `takeCreature: 'rat'` (hand in a creature), `kr`, `tell: 'knowledgeId'`, `set`, and `rel` as a number (this person) or a **map** `{ berit: 3, pelle: -3 }` (several people). Rewards are knowledge, items, kronor and relationships, never points.
- **Dialogue conditions for quests:** `quest: 'id'` (active), `step: 'id:1'` (at that step), `questDone: 'id'`, `questNot: 'id'` (not started and not closed), `questLocked: 'id'` (closed because you chose another). Also useful: `flag: 'talked:berit'` (set whenever you have talked to someone).
- Quests show in 📓 Notes (done ones ticked, closed ones crossed out). Quest offers should come on the 3rd meeting or later, after the person's knowledge lines.

### Props (`props`): things to tap that are not people
```js
kb1: { name: '8 kg kettlebell', at: [39, 12], em: '🏋️', release: 'mon' },       // + dialogue.kb1 = { repeat: true, talk: [ … ] }   (repeat: true = lines may be said again)
tee1: { name: 'Tee 1', at: [58, 36], em: '⛳', minigame: 'golf', hole: { name: 'Hole 1', distance: 140, par: 3 } },
lakespot: { name: 'A fishing spot', at: [66, 18], em: '🎣', minigame: 'fishing', catch: [['pike', 4], ['salmon', 3]], lv: [30, 36], junk: 'A shopping trolley.', cooldown: 20 },
balloons: { name: 'Balloon stand', at: [27, 47], em: '🎈', show: { day: 'mon' } }     // show = when it is there (day, night, any dialogue condition)
```
**Hidden stashes** are props with `stash: true` and a one-line `repeat: true` dialogue that gives one thing once (`give: { weed: 1 }` or `kr: 30`) and sets `got:<id>`. The cover object (`em`: a stone, a tyre, a bin) is the prop; `show: { notFlag: 'got:<id>' }` makes it vanish once emptied, and the first dialogue line (`if: { flag: 'got:<id>' }`) keeps a direct tap harmless. Put each on a walkable tile at least 2 tiles from other props, with `release` = the day its item is released. Rule: at most one stash per drug on the whole map (the test checks it). The speech bubble (three dots) over anything you can search or talk to is drawn by the engine, nothing to configure.

Puzzles are props whose lines depend on flags set by other props (`set: { wod1: true }`, `if: { flag: 'wod1' }`), e.g. the kettlebells in The Box (light → heavy), three fuses in the store, herbs in the right order in the cave, the throne in the castle (a choice), the bar and DJ at the rave (only after dark). Solving one sets `edge:<hero>`: that hero's team is **3 levels lower** and he says something about it. `People` can have `show` too (Night-watch Nisse: `show: { night: true }`, Market-Maud: `show: { day: 'tue' }`).

### Mini-games (`minigames`)
`fishing: { rounds: 3, need: 2, zone: .24, speed: 1.2 }` (win `need` of `rounds` timing bars; zone = size of the green part), `golf: { maxCarry: 100, maxStrokes: 6, window: .09, cup: 5, speed: 1.1 }` (the green zone is the power that reaches the hole). A perfect fishing round sets `fish:perfect` and leaves the fish dazed; golf sets `golf:par`, `golf:birdie`, `golf:strokes`. Both are one tap.

### Day and night, rumours
Night is the real clock (`tuning.NIGHT: [20, 6]`, 20:00–06:00) and tints the outdoors. `ambient` on a zone makes a bass pulse (`nightVol` = louder at night; the rave). `rumours: { mon: [...], tue: [...], wed: [...] }` are repeated by people with `rumours: true` in their dialogue, and end up in 📓 Notes. Day events are props or people with `show: { day: 'tue' }`.

## The bigger world: map, houses, zones, lake

**The map** is rectangles in `data/m3-data.js` → `world`. The old map (x 0–47) is in code and never changes, so saves keep working; everything east of it is data. Edit the rectangles, reload, look.
```js
world: { width: 160, release: 'tue',                     // before this day the east is a wall of trees (closed ops), so Monday's map is the old one
  always: [['fill', 37, 19, 10, 1, '"']],                // applied every day (grass strip in front of The Box)
  closed: [['fill', 48, 0, 112, 74, 'Q']],
  ops: [ ['fill', x, y, w, h, tile], ['set', x, y, tile], ['scatter', x, y, w, h, tile, density, seed], ['room', x, y, w, h, wallTile, floorTile, doorX, doorY, doorWidth] ] }
```
Tiles: `~` old lake, `V` big lake (solid unless you have a boat or a ferry creature), `s` sand, `,` grass, `"` tall grass (encounters), `u` undergrowth (encounters), `T` tree, `Q` dense forest (solid), `=` road, `o` sidewalk, `a` fairway, `Z` green, `G` flag, `b` bunker, `N` city wall (solid), `X` rock (solid), `y` dirt path, `i` cave floor, `J` castle wall (solid), `j` castle floor, `D` rave wall (solid), `d` rave floor, `r` door mat. Tall grass or undergrowth tiles are where encounters happen, so a **path crosses an encounter area by having a band of `"`/`u` across it** (the roads have such bands). The zone under the band decides what appears.

**Zones** (`zones`) say what you meet and at which level: `r: [x, y, w, h]`, `enc: [['elk', 3], …]` (creature ids and weights), `lv: [min, max]`, `release`. The first matching zone wins, so small band zones come before the big areas. `house: 'wizcudi'` makes a zone a house interior (its name shows as ??? until someone told you).

**Houses** (`houses`):
```js
wizcudi: { name: 'The electronics store', hero: 'wizcudi', level: 20, door: [104, 37], doorW: 2, release: 'tue',
  home: { at: [108, 34] },                                         // your own hero's house is your home: always open, heal + storage
  trophy: { at: [100, 34], give: { mouseTrap: 1 }, kr: 0, text: '…' }, // one-time reward inside
  locked: 'The store is dark. Every single light is off, on purpose.' }   // what the door says (no number, no sign)
```
You can only get in if your **best** creature (party or storage) has the level. Stepping inside a house sets the flag `house:<hero>`. Dev Ljunky's stock room needs all four heroes beaten **and** every released house except your own seen. Heroes stay where they are for now.

**The lake:** a boat (Boat-Bengt, `role: 'boatman'`, only after `know:boat`) trades the van for a boat; the storage keeps working. Or a creature that knows the move `ferry` (Pikezilla at Lv 30, see `moves.ferry` and the creature's move list) once you know `ferry`. On the water you meet the `biglake` zone. `net` (throwable, holds a creature for 2 turns) and `netTrap` (`shore: true`, `catch: [[creature, weight]]`) are ordinary items.

## Dialogue: people with personality, memory and relationships

Everything a person says is in `data/m3-data.js` → `dialogue`, one entry per person id (an NPC id, a hero id or a wife id). Personalities and knowledge are separate sections. No code needed.

```js
personalities: { grumpy: { voice: 'complains, hates small talk', shareRel: 2,       // shareRel = how much they must like you before they tell you things
                           hunt: 'I have been waiting for you.',                    // said when they come after you (−4 or worse)
                           tones: { kind: 0, rude: 1, funny: -1, bribe: 1, honest: 2, lie: -2, flirt: -2 } } },   // tone of your reply → relationship change

knowledge: { types: { name: 'How the types work', text: 'FANG › WING › …' },                  // shown in 📓 Notes once learned
             'house:jrohn': { name: "Jrohn's house", text: 'A shaman cave.', listed: true, release: 'wed' } },   // listed: true = shows as ??? until learned

dialogue: {
  berit: { personality: 'grumpy',
    friends: ['pelle', 'cicci'],                       // people who know each other (see below)
    help: { relMin: 4, give: { bag: 3 }, text: 'Take a few bags. On the house.' },   // once per real day when she likes you
    hunt: 'You again. I have had ENOUGH.',            // optional, overrides the personality's hunt line
    talk: [                                            // the best matching line that has not been used yet is said
      { if: { met: 0 }, text: 'Unexpected item in bagging area. Unexpected YOU.',
        replies: [ { label: 'Just browsing.', tone: 'kind', text: 'Browse faster.' },
                   { label: 'Bags are a scam.', tone: 'honest', text: '…Correct.', set: { berit_ally: true } },
                   { label: 'Pay her 20 kr', take: { }, kr: -20, rel: 2, text: 'Hm. Fine.' } ] },
      { if: { metMin: 2 }, tell: 'wife:cicci', text: 'Cicci cried over a package once. Ask her about the budget.' },
      { if: { hero: 'bigwman', killed: 'pelle' }, text: 'You. You killed Pelle. And you are BigWman.' },
      { if: { last: 'honest', returning: true }, text: 'You told me the truth yesterday. I remember.' },
      { text: 'Still here? The queue is behind you.' }          // no "if" = always possible, the weakest match
    ] }
}
```

**Which line is said:** every line whose `if` matches is a candidate. The line that matches the most conditions wins. Lines already used are skipped until all matching lines have been used; then the pool starts over. Release-gated lines use `release` / `requires` like everything else.

**Conditions** (`if`, all must match):
| key | matches when |
|---|---|
| `hero: 'loken'` / `['loken','jrohn']`, `notHero` | you play that hero |
| `met: 0`, `metMin: 2`, `metMax: 3` | how many times you have talked to this person |
| `returning: true` | you talked before, but on an earlier real day |
| `last: 'honest'`, `lastNot` | their memory of your last answer (a reply `id`, or the label if it has none) |
| `relMin: 2`, `relMax: -1` | their relationship to you (−5…+5) |
| `flag: 'x'`, `notFlag` | a flag is set (`killed:berit`, `caught:berit`, `grudge:pelle`, `know:types`, and your own `set` flags) |
| `know: 'types'`, `notKnow` | you have learned that |
| `killed: 'pelle'`, `caught: 'pelle'` | you killed / caught that person (or creature id) |
| `beat: 'loken'`, `solved: 'cicci'` | you beat that hero / solved that wife |
| `debtMin: 2` | your promise debt |
| `state: 'drunk'` (`drunk`, `high`, `blurred`, `sober`) | what you are on |
| `carry: 'walter'` | you carry that creature or item |
| `night: true`, `hour: [22, 4]` | the real clock (hour ranges can wrap past midnight) |
| `day: 'tue'`, `from: 'tue'`, `until: 'wed'` | the release day |
| `zone: 'lawn'` | where you stand |

An unknown key never matches (and the validator warns). **Effects** (on a line or a reply): `rel: +1` (or a `tone`: the personality decides), `set: { flag: true }`, `give: { item: n }`, `take: { item: n }` (the reply is greyed out if you lack it), `kr: -20`, `debt: 1`, `tell: 'knowledgeId'` (they teach you something; only if they trust you: relationship ≥ their `shareRel`, unless the line has its own `relMin`), `fight: true` (a reply that starts a fight). Reply `if` hides replies. Text can use `{hero}`, `{name}`, `{last}` (your last answer), `{debt}`, `{met}`, `{kr}`.

**Relationship (−5…+5):** friends get up to 25 % off (♥ on the price), enemies at −3 refuse to trade, friends at +4 give gifts (`help`), enemies at −4 walk up to you and fight (after the fight it cools to −2). Picking a fight costs −2.

**Friends:** `friends: ['pelle']` works both ways. Kill someone: their friends −3, their friends' friends −1, and flags `killed:<id>` / `grudge:<friend>` are set. Catch someone: friends −1. Lines can read those flags.

**The first meeting with a hero** uses `bossLines` (one line per hero you play), so nothing is written twice.

### The wives
```js
cicci: { personality: 'dry', friends: ['berit', 'bigwman'],
  talk: [ { if: { met: 0, hero: 'bigwman' }, text: 'There you are. I counted the boxes.' }, … ],       // what she says when you walk up, per hero
  after: [ { text: 'We are good. For now.' } ],                                                          // when she is solved
  wife: { reacts: { bigwman: { mul: 1.5, turns: 1 }, loken: { mul: .7, turns: 0 }, … },                 // per hero: how hard she hits, extra turns to survive
    lines: [                                                    // what you can say. right = the conditions under which this line is THE right one
      { text: 'A budget. In writing.', right: { hero: 'bigwman', last: 'wrong' } },
      { text: 'Berit will not sign for any more packages.', right: { killed: 'berit' } },
      { text: 'I cancelled the packages.', right: { hero: 'bigwman' } },
      { text: "It's an investment, technically." } ] } }      // no right = always wrong
```
Each time you open the menu, the most specific matching `right` line is the right one, plus three random wrong lines (4 in total). So the answer changes with who you play, what you carry, what you did, how much you owe and what happened last time. A wrong answer makes her angrier and costs a survived turn (8 turns in total, `+turns` per hero). Promise debt makes her hit harder. Once someone has told you `wife:<id>`, the right line carries a 💡. `wife.reacts`/`talk` keys use the hero id you play.

### Knowledge
`tell: 'types'` puts it in 📓 Notes ("told by X, MON"). Things can require it: `requires: 'know:ring'` on an item, zone, NPC or line (not in `?dev=all`, which shows everything). The move list shows what is strong only after `types` is known.

### Traps
Three ladders. **Ground** (mouse trap → live box → snare → pit trap → moose pen), **water** (rod & worm → fishing net → crayfish cage → deep longline → trawl), **air** (jam jar → mist net → light trap). Each trap item has `ladder`, `tier` (1-5), `cap` (biggest size it holds: S M L XL), `waitMin`, `place` (`ground`, `shore`, `deep` = pier end or boat, `boat`), optional `night: true`, `upgradesTo` + `upgradeCost` (kr + materials) and `value` (what it cost to build; Tore repairs for half). You place a trap from the bag, optionally with one **bait** item and one **drug** (feedable), wait real minutes and come back; the trap itself returns to your bag.

Every creature form says which ladders can hold it (`trap`), at which `tier` (a number or `[2, 4]`), where (`hab`: zone habitats, or the lake) and when (`day`, `night`). A ready trap of tier T rolls (`tuning.TRAP`): **nothing** 25 % · **lower** tier (T−1) 25 % (tier 1: junk) · **its own tier** 40 % · **higher** tier (T+1) 10 %: it wrecks the trap (Tore repairs it for half price) and the dazed creature is still there, hard to catch. Matching bait: −10 % nothing, +10 % own. Each upgrade step of the ladder: −5 % nothing, +5 % own. "Own" never goes over 60 %. A drug in the bait: nothing +10 %, and an own-tier catch has a 30 % chance to be that line's drug form. Creatures with `needs: 'reveal'` (Trippopotamus) roll first, and only while you are tripping. A creature bigger than the trap's `cap` only comes as a "higher" result. Texts: `trapText`.

**Breakable traps:** an item with `uses: n` (the starter `shoebox`) is used up after n catches (`G.wear` counts, saved); it comes back to the bag until then. Not sold, no upgrade path.

### Trapper Tore
`role: 'trapper'`: upgrades a trap you carry (`upgradeCost`), repairs wrecks, sells bait (`shop`). He is hidden until you have been told (`requires: 'know:tore'`; Hardware Jonas and Mountain guide Greta tell you).

### Fältboken
There is no creature list. Until you own the item `faltboken` the bag shows only your own creatures. Buy it from the dealer (`dealer.book`) or find it in the camper van in the deep forest (prop `camper`, which also holds a very rare bag of meth on the second visit). With it, every line gets a page: seen = picture and name, caught = size, bait, trap tier, habitat and the previous owner's margin note (`fieldbook.margin.<line>`), drug forms = black silhouettes until someone tells you the recipe (`knowledge['recipe:<form>']`) or you feed it yourself. Boss teams and sightings mark a form as seen. Lines with `tell` need a `relMin` in their `if` when they are on a prop (props have no trust to lose).

### Where the drugs come from
Weed, coke, shrooms: the dealer. Xanax: Apotek, only after the `xanax_rx` quest (show the pharmacist a Signal Crayfish). Molly, Speed, Ketamine: Doorman Dragan at the rave. LSD: Hasse, once he trusts you. DMT: the cauldron in the shaman cave once the brew works. Meth: the camper van. Coke also behind a bin in a city alley, at night.

### Filler shoppers
`fillers.voices: { grumpy: [ 'line', { if: { night: true }, text: '…' } ], … }` – every random shopper gets one personality and a slice of that personality's lines. No two shoppers share a line.

### Check
The browser console warns about unknown conditions, unknown knowledge/item ids, unknown people and unknown personalities (`[PX.data]`).

### Auto-fight
`tuning`: `AUTO_STOP_HP` (.3 = stops when your creature is under 30 % HP), `AUTO_GAP` (seconds the Stop button shows between turns). Fight → **⏩ Auto-fight** (wild and trap fights, not Epics) plays the best move every turn; the next wild fights start on auto until you tap Stop or it stops itself. Knock-out choices (Catch / Finish off) are always yours.

## Balance, Kenny the Fence, Inkasso-Ingvar
```js
tuning: { XP_BASE: 8, XP_SQ: 1.3,   // XP for the next level = XP_BASE + XP_SQ × level²   (LV_MAX: 50)
  XP_LOW: 3,                        // a foe below your level gives XP × (foe lv / your lv)^XP_LOW; a stronger foe at most ×1.5
  XP_SHARE: .25, BOSS_XP: 1.2, WILD_KR: 1.5,   // bench share, bosses/trainers, kronor per foe level from wild fights
  WILD_STAT: 1.2, BOSS_STAT: .6,    // stat multipliers for wild creatures (also traps and fishing) and for hero teams / trainer drug forms: the main difficulty knobs
  BOSS_AT_GATE: false,              // true = hero team levels are the house gate −2 / ±0 / +2 (for when the heroes live in their houses)
  TRIP_MIN: 30, NIGHT: [20, 6],     // bad trip length (real minutes), night hours (real clock)
  TRAP: { nothing: .25, lower: .25, own: .4, higher: .1, bait: .1, step: .05, ownCap: .6, drug: .3, drugNothing: .1 },   // the trap roll
  KO_CATCH: {…}, CATCH_R: {…},      // catch chances by rarity (catching gives no XP)
  PTS: { hero: 30000, dev: 50000, egg: 50000, species: 2000, speciesMax: 20, item: 2500, partner: 4000 } }  // goals only, max 300 000
fence: { rates: { C: 3, U: 6, R: 12, E: 25, L: 40, M: 60 }, perLv: .5 }       // Kenny pays rates[rarity] + level × perLv kronor
debtCollector: { npc: 'ingvar', every: 3, pay: 250, team: ['boar', 'crow', 'adder'], lvUp: 2 }   // every 3 promise debt: pay or fight
apps.klarna: { …, once: 3, cooldownMin: 10 }                                 // max 3 uses, one per 10 real minutes
```
`role: 'fence'` on an NPC makes them buy creatures. The opening thought can use `{hero}`, which is a random hero other than yours.

## The phone, the Appbutiken, Faunalens and the Faunadex
`phone: { battery, wallpaper: [c1, c2], storeTitle, storeLine }` dresses the phone (`missions/m3-phone.js`). Every entry in `apps` is an icon on the home screen. Three kinds:
```js
tibber:  { name: 'Tibber', icon: '⚡', color: '#1f6feb', lines: ['…'], release: 'mon' },          // lines app: tap it, get a line. Optional use / once / cooldownMin / gate (as before)
calc:    { widget: 'calc', name: 'Calculator', icon: '🧮', store: { price: 0, blurb: '…' }, easter: { '42': 'The answer.' } },   // widget app
dex:     { custom: true, name: 'Faunadex', icon: '🔍', store: { price: 0, needs: 'lens', blurb: '…' } },                       // custom app: code in K.phoneApps[id]
```
Widgets: `torch` (on/off lines), `calc` (easter eggs by result), `compass` (points at The Box), `eight` (answers), `fart` (sounds `[{label, f, len}]`), `messages` (`from`, `pool`, `replies [{label, answer}]`), `weather` (`icons`, `lines`), `camera` (`captions`), `hemnet` (`lines`). `appstore: true` is the Appbutiken itself. **An app with `store: { price }` is not on the phone until you download it** (price in kr, 0 = free; `needs: 'x'` = only shown once app `x` is installed). Installed apps are saved in `G.installed`.

**Faunalens / Faunadex:** `lens` holds the texts. After your first catch the phone offers a scan (`offer`, `yes`, `no`, `scan`, `done`, `later`). Yes installs Faunalens (an app) and unlocks the **Faunadex** (free) in the Appbutiken; No leaves Faunalens in the Appbutiken. With the lens installed every catch gets a one-line scan (`scanLine`). The Faunadex app lists the lines with pictures, tap one for its page (`fieldbook` data is unchanged: `margin`, `locked`, `intro`). The paper Fältboken (dealer, camper van) still works for players who have it.

**Bag and team screens:** the bag is a 3-column grid of icon tiles (`ask(…, { tiles: true })`, a label starting with an emoji becomes the big icon) and the team is a list of picture cards (`ask(…, { cards: true })` with `{ card: { sp, name, lv, ty, hp, hpTxt, chips, star, note } }`, or `teamCard(c, i)`). No placeholders needed: a creature without art gets a type-coloured disc with a `?`.

## Signs: shops and houses
```js
signStyle: { glow: .95 },                  // how strongly signs glow at night
signs: [ { at: [17, 65], text: 'PIZZERIA BERGA', icon: '🍕', bg: '#b02a1e', fg: '#fff', awning: ['#b02a1e', '#fff', '#2f8f3a', '#fff'], flicker: true }, … ]
```
`at` = [tile x (.5 allowed), tile y] of the wall above the door. A sign gets a cartoon board (outline, shadow, chains, shine, optional `icon`). Unless `awning: false`, the game finds the door tiles (`r`) next to it and hangs a striped scalloped awning over them (`awning` = the stripe colours, default sign colour + cream). `flicker: true` for neon-ish signs, `glow: false` to switch the night glow off, `glowCol` to tint it, `release` to gate it. At night every sign glows and its text goes white. **Hero houses** (`houses`) get their name plank automatically (`name`, or `sign` to override), two waving pennants in the hero's colour, and `OPEN` / `HOME` or `🔒 LV n` depending on whether the door opens for you.

## Opening and blackout
```js
opening: { blink: 4.2, thoughts: ['Zombies everywhere!', …], strangerAfter: 12, stranger: { name: '???', look: {…} },
  lines: ['You have been chosen.', 'Now it is your time to choose.'], starters: ['badgerCub', 'lynxKitten', 'toadlet', 'hoglet', 'fawn'], startItems: { folkol: 3, fizztab: 2, bag: 8, shoebox: 1, worms: 2, … } }   // the shoebox (a trap with `uses: 3`) falls apart after that many catches; traps and bait in startItems start out known
respawn: { at: [4, 62], lose: 'Everything goes black…', wakeVan: 'You wake up in the van… {lost} kr lighter.', … }
```
**Starter pool:** on a LIVE day each player claims one starter on the server, first come first served (needs `backend/claims.gs` in the Apps Script). In practice or `?dev=all` the claims are kept on the phone, so you can test by switching names. `?dev=all&claims=reset` clears them.

## Small pixel sprites
```js
sprites: { coin: { grid: ['..yy..', '.yYYy.', 'yYwYYy', '.yYYy.', '..yy..'] } }   // one char per pixel, keys = PX.palette
```

## Checklist after a data drop
1. Open `?dev=all&date=<the drop day>` and check that the console shows no `[PX.data]` warnings. `?dev=day&date=<the drop day>` plays that day as players get it (nothing from later days).
2. Run `bash tests/run.sh` and make sure it ends with `ALL PASSED`.
3. Commit only `data/m3-data.js` plus any new PNGs.
