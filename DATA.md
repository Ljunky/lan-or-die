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
