# DATA.md: adding Mission 3 content without code

Everything in Mission 3 lives in **`data/m3-data.js`**: creatures, items, NPCs, the gym, graves, the dealer, phone apps, zones and unlock dates. `missions/m3.js` only holds the rules. To add something, copy an example below into the right section, change the values, reload with `?dev=all` and check the browser console: `[PX.data]` lists broken references, unknown kinds and missing art. The game never crashes on a bad entry; it warns.

## Rules that apply to every entry
| Field | Meaning |
|---|---|
| `release: 'mon' \| 'tue' \| 'wed'` | Hidden before that day (dates in `releases` at the top). `?dev=all` shows everything. A plain date `'2026-11-27'` also works. |
| `requires: 'flagName'` | Hidden until that flag is set in the save (e.g. `ljunkyDone`, `mythicSpawned`, `loyalReady`). |
| `at: [x, y]` | Tile on the 48 × 74 map. **To find one:** open `?dev=all`, long-press the map. The tile is shown and copied to the clipboard. |
| `likes` | An item id (`'buns'`) or a lure tag (`'GRUB'`, `'WIFE'`, `'HERO'`). At the grave, any item whose id or `lure` matches can be offered to resurrect it. |
| `learnedNote` | Effect text. Players see **???** until they have used the item once, then this note. |

No tutorial or hint text anywhere. Hints go in signs, NPC `lines` and how things look.

## Creature
```js
// creatures: { … }
toaster: { no: 24, name: 'Toaster Terror', type: 'TECH', rarity: 'U', stats: [58, 66, 50, 60],   // HP ATK DEF SPD
  moves: [['zap', 1], ['beep', 1], ['slam', 9]],                    // [move id, level it is learned]
  desc: 'Burns everything. Even the bread.', art: 'assets/creatures/toaster.png',
  likes: 'TECH', release: 'tue' },
```
- **Art:** a 48 × 48 PNG with transparency in `assets/creatures/`. Use the palette colours (see `engine/sprites.js`, `PALETTE`) with a navy `#1F2A44` outline. A missing PNG shows `❔` and a dev warning.
  - If you'd rather draw in code, add a function to `tools/art-src.js` and run `node tools/bake-art.js toaster`. It writes the PNG with the palette and outline applied.
- **Where it appears:** add `['toaster', weight]` to a zone's `enc` list (see Zone). Traps also pick creatures whose `type` matches their `lure`.
- **Rarity:**
  - `C`, `U`, `R`: normal.
  - `E` (EPIC): add `needs: 'reveal'`. It only appears while magic mushrooms are active.
  - `L`: legendary.
  - `M` (mythic): add `trapOnly: 'mythicTrap'`. Only that trap can hold it.

## Move
```js
// moves: { … }
toast: { name: 'Golden Toast', type: 'TECH', p: 65, acc: .9, stun: .2, say: 'Ding!' },   // p = power, 0 = status move
cheer: { name: 'Pep Talk', type: 'MIND', p: 0, self: { atk: 1, spd: 1 }, heal: .2 },     // status: stat stages / heal
```

## Items (`kind` = throwable | trap | lure | weapon | drug | app | key)
```js
// items: { … }
// THROWABLE: thrown in battle (Throw menu). hit = chance. throw = effects on the target.
pie: { kind: 'throwable', name: 'Cream pie', em: '🥧', price: 9, hit: .8,
  throw: [{ type: 'damage', value: 12, vs: { GRUB: 2 } }, { type: 'blind', value: .3, turns: 2 }],
  learnedNote: 'Blinds. Great against GRUB.', release: 'tue' },
// For the women only: add  wife: true  (calm = lowers her mood bar, anger = raises it).

// TRAP: placed from the bag on the map. After waitMin real minutes, a dazed creature that likes `lure` may sit in it.
techMk2: { kind: 'trap', name: 'Charger Mk2', em: '🔌', price: 70, lure: 'TECH', tier: 2, waitMin: 2, catchBonus: .5,
  rare: [['snake', 10], ['toaster', 5]],          // [creature, % chance] tried first
  learnedNote: 'Faster, rarer TECH.', release: 'wed' },
// lure: 'WIFE' traps catch a wife. spawn: 'creatureId' always holds that one creature (the Mythic Trap).

// LURE: used on the map for 60 s, attracts a type ('GRUB'…), a wife ('WIFE') or a hero ('HERO'). Also resurrection bait.
kanelbulle: { kind: 'lure', name: 'Kanelbulle', em: '🥐', price: 12, lure: 'GRUB',
  use: [{ type: 'attract', value: 'GRUB', duration: 60 }], learnedNote: 'GRUB comes running.', release: 'tue' },

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
// zones: { … }  first match wins; r = [x, y, w, h] in tiles
deli: { name: 'Deli counter', r: [2, 39, 6, 3], enc: [['lizard', 3], ['bear', 1]], lv: [6, 9], release: 'tue' },
```

## Gym, graves, dealer, apps
```js
gyms.box.tiers:   [{ cap: 12 }, { cap: 16, flag: 'aiBeaten' }, { cap: 20, flag: 'mythicCaught' }]   // training level cap per tier
graves.default:   ['Here lies {name}. Shopped till dropped.']          // {name}, creatures also {n}
graves.reward:    { rewardGrave: 'ljunky', give: ['coke', …, 'mythicTrap'], flag: 'mythicSpawned', … }
dealer.rates:     { C: 1, U: 2, R: 4, E: 7, L: 9, M: 12, H: 5 }        // creature points per rarity (× 1 + level × levelBonus)
dealer.stock:     [['coke', 3, 3], …]                                  // [item, price in points, weight]; rotates every rotateMin
dealer.refuse:    ['No wives. Bad for business.']                      // said when you offer a wife
apps.tinder:      { name: 'Tinder', icon: '🔥', lines: ['It\'s a match! With {name}.'], use: [{ type: 'promiseDebt', value: 1 }], once: 1, release: 'wed' }
```
App line variables: `{steps}`, `{price}`, `{name}`, `{kr}`, `{debt}`.

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
  trophy: { at: [100, 34], give: { techMk1: 1 }, kr: 0, text: '…' }, // one-time reward inside
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

knowledge: { types: { name: 'How the types work', text: 'FIZZ › GRUB › …' },                  // shown in 📓 Notes once learned
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

### Filler shoppers
`fillers.voices: { grumpy: [ 'line', { if: { night: true }, text: '…' } ], … }` – every random shopper gets one personality and a slice of that personality's lines. No two shoppers share a line.

### Check
The browser console warns about unknown conditions, unknown knowledge/item ids, unknown people and unknown personalities (`[PX.data]`).

## Balance, Kenny the Fence, Inkasso-Ingvar
```js
tuning: { XP_BASE: 8, XP_SQ: 1.3,   // XP for the next level = XP_BASE + XP_SQ × level²   (LV_MAX: 50)
  XP_LOW: 3,                        // a foe below your level gives XP × (foe lv / your lv)^XP_LOW; a stronger foe at most ×1.5
  XP_SHARE: .25, BOSS_XP: 1.2, WILD_KR: 1.5,   // bench share, bosses/trainers, kronor per foe level from wild fights
  KO_CATCH: {…}, CATCH_R: {…},      // catch chances by rarity (catching gives no XP)
  PTS: { hero: 30000, dev: 50000, egg: 50000, species: 2000, speciesMax: 20, item: 2500, partner: 4000 } }  // goals only, max 300 000
fence: { rates: { C: 3, U: 6, R: 12, E: 25, L: 40, M: 60 }, perLv: .5 }       // Kenny pays rates[rarity] + level × perLv kronor
debtCollector: { npc: 'ingvar', every: 3, pay: 250, team: ['golem', 'banshee', 'ghost'], lvUp: 2 }   // every 3 promise debt: pay or fight
apps.klarna: { …, once: 3, cooldownMin: 10 }                                 // max 3 uses, one per 10 real minutes
```
`role: 'fence'` on an NPC makes them buy creatures. The opening thought can use `{hero}`, which is a random hero other than yours.

## Opening and blackout
```js
opening: { blink: 4.2, thoughts: ['Zombies everywhere!', …], strangerAfter: 12, stranger: { name: '???', look: {…} },
  lines: ['You have been chosen.', 'Now it is your time to choose.'], starters: ['frog', 'cuke', 'peng', 'snake', 'crow'], startItems: { folkol: 2, … } }
respawn: { at: [4, 62], lose: 'Everything goes black…', wakeVan: 'You wake up in the van… {lost} kr lighter.', … }
```
**Starter pool:** on a LIVE day each player claims one starter on the server, first come first served (needs `backend/claims.gs` in the Apps Script). In practice or `?dev=all` the claims are kept on the phone, so you can test by switching names. `?dev=all&claims=reset` clears them.

## Small pixel sprites
```js
sprites: { coin: { grid: ['..yy..', '.yYYy.', 'yYwYYy', '.yYYy.', '..yy..'] } }   // one char per pixel, keys = PX.palette
```

## Checklist after a data drop
1. Open `?dev=all&date=<the drop day>` and check that the console shows no `[PX.data]` warnings.
2. Run `bash tests/run.sh` and make sure it ends with `ALL PASSED`.
3. Commit only `data/m3-data.js` plus any new PNGs.
