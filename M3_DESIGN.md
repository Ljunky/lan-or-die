# Mission 3: "Bad Trip at Maxi" (design)

Live **23–25 Nov** (`unlock '2026-11-23'`, `until '2026-11-25'`). Our own GBA-style monster RPG. **No code or graphics from FireRed-RPG or Pokémon.** Everything is drawn in canvas and every creature is original.

**Story:** someone slipped something into your drink at the pre-LAN beer. You wake up in the parking lot at ICA Maxi Åkersberga, and the whole area has turned into a creature world. Collect the shopping list, catch creatures, beat the other heroes and find out who did it. (Spoiler: Ljunky. He also built the game.)

## 1. Rules (exception to the 3-minute rule)
- **No round time limit.** The game auto-saves. Close it and continue later. A full run is designed to take about 10 min, plus any extra time you want to spend.
- **Score = completed goals, each counted once**, capped at 300 000. Grinding does not give endless points.
- The best score is submitted on every save. **Highest score at 25 Nov 23:59 wins.** If scores tie at the cap, the shortest total playtime wins.
- 👑 Sidequest King for M3 = most total playtime in M3.
- "New game" is allowed (it resets the save but not your best score).

| Goal | Points |
|---|---|
| Shopping-list item (8) | 5 000 each = 40 000 |
| New creature species caught (20) | 2 500 each = 50 000 |
| Hero beaten (4: everyone except you) | 20 000 each = 80 000 |
| Partner encounter solved (5) | 5 000 each = 25 000 |
| Dev Ljunky (final boss) | 40 000 |
| Party levels (sum × 100) | max 15 000 |
| Easter egg (your hero's) | 50 000 |
| **Max** | **300 000** |

## 2. The map (from Google Maps)
One top-down map with walk-in buildings and a grid. The **joystick moves**; tap = interact. Tall-grass zones are areas with random encounters.

| Zone | What happens | Encounters |
|---|---|---|
| **Parking lot** (start) | You wake up in the van. Tutorial NPC | Charging cable snake, plastic-bag bat |
| **ICA Maxi** (big building) | Aisles = tall grass: fruit & veg, pick-and-mix, freezer, bakery, self-checkout. Shopping-list items lie on shelves | Most creatures |
| **Checkouts** | **BigWman boss** | — |
| **Flower department** (inside ICA) | **Jrohn boss** | Cucumber dragon |
| **Systembolaget** (next to ICA) | Buy and collect drinks. **Ljunky boss** (if you're not Ljunky) | Whisky owl, gin genie, folköl frog |
| **Apotek Hjärtat** | Heal the whole party for free (Pokécenter). Buy "Fizz tablets" (heal) | Cough-syrup snail |
| **IRON Burger / Pizzeria Berga / J&K99 sushi** | Food = buff for 60 s (ATK / max HP / SPD) | Burger bear, kebab pizza lizard, salmon roll |
| **E.ON charger** | **Wizcudi boss** (meter defense) | Charging cable snake |
| **The lawn by the lake** | **Löken boss** (turf) | Bottle-return crow |
| **The lake** | Fishing spot, rare | Pikezilla |
| **Tailor's Barber** | Easter-egg hints, cosmetics | Moustache moth |
| **ICA stock room** (opens after 4 heroes) | **Dev Ljunky** final boss | — |

## 3. Battles
- 1v1 turns, **one tap per choice:** `Fight` (2–4 moves) / `Drink` / `Throw` (catch) / `Hero` (ultimate, once per battle) / `Run`.
- 7 types in a cycle: **FIZZ › GRUB › WILD › TECH › FROST › RUSTLE › FIZZ** (×1.5 against the next, ×0.67 against the previous). **MIND** (psychic/guilt) is neutral to all; only the partners and Dev Ljunky use it.
- Stats: HP, ATK, DEF, SPD. Level 1–20, XP from battles. Some creatures evolve at level 8.
- Catch: weaken the creature, then **Throw** (a carrier bag). Catch chance rises at low HP and with a lured creature.
- Party of max 4 creatures. You start with one from a choice of 3 (Folköl frog, Cucumber dragon, Freezer penguin).

### Systembolaget drinks
Drink = buff for 3 turns in battle (60 s outside battle). Throw = **lure**: +catch chance, **but 1 in 25 kills the creature** (💀 "Too strong. RIP.", no catch). More than 3 drinks in 60 s = the screen sways and controls get sluggish ("blur").

| Drink | Drink effect | Lure |
|---|---|---|
| Folköl | +SPD a little | Weak lure, cheap |
| Lager | +ATK | Normal |
| IPA | +ATK ++, −accuracy | Good for WILD |
| Gin & tonic | +SPD, cures confusion | Good for TECH |
| Whisky | +DEF, immune to Guilt | Strong lure |
| Glögg | Heals 30 % | Good for FROST |
| Snaps | +crit, the hero sings | Random |

## 4. The heroes
You play as your chosen hero, who has a **passive** (from PERKS) and an **ultimate** (once per battle). The other four are **bosses** with their own team of 3 creatures plus their ultimate.

| Hero | Passive (positive) | Weakness | Ultimate |
|---|---|---|---|
| **BigWman, The Spreadsheet Titan** (Tank / Finance) | Excel Mastery: sees exact enemy HP and catch % | Package Panic: sometimes "package delivered", lose a turn to sign | **YES!**: +50 % ATK for the whole party for 3 turns |
| **Wizcudi, The Midlane Overthinker** (Mid / Tech & Meter Defense) | Light Switch Reflex: always goes first in turn 1, sees rare creatures on the map | Jungle Fear: outside (lawn, lake) encounters +30 % and −SPD | **Lights Out**: the enemy misses 2 turns |
| **Jrohn, The Bohemian Cremator** (Support / Progressive Disrober) | Sprint After Walter: walks faster, Run always works | Progressive Disrobing: sometimes pants drop, −DEF until you spend a turn pulling them up | **I Love This!**: heals the party 50 % and charms the enemy |
| **Löken, The Gilded Paladin** (Bruiser / Turf & Group Glue) | ATM Security: blocks the first hit in every battle; Loyalty: the party heals 10 % after a win | Coin Leak: drops coins while walking, which lures creatures | **Stick Together, Boys!**: all creatures in the party attack at once |
| **Ljunky, The Crypto Ranger** (Jungle & ADC / Game Master) | Ranger Aim: +crit, +catch chance | Cat Chaos: the cats sometimes knock an item out of the bag | **Buy the Dip**: 50 % double damage, 50 % zero damage |

### Rivalries
The rival shows up **twice on the map** (small team) before the boss fight and gives **+10 000 rival bonus** when beaten in the boss fight (included in the hero points).
- **Löken vs Wizcudi:** Djurgården vs AIK. Chant battle: the boss's ultimate becomes a club chant.
- **BigWman vs Jrohn:** the eternal "who has the biggest…" debate. Cheeky, not explicit.
- **Ljunky:** no rival. The twist: **his nemesis is himself.** Dev Ljunky shows up early as a glitch and taunts him. In the final it turns out Ljunky spiked the drink *and* built the game.

### Opening lines (boss → player)
**BigWman**
- → Wizcudi: "I ran the numbers. Your electricity savings fund exactly zero of my packages."
- → Jrohn: "Let's settle it, Jrohn. Biggest… spreadsheet wins. Mine has more rows. YES!"
- → Löken: "I respect the lawn, Löken. I don't respect the lawn budget."
- → Ljunky: "Bitcoin is not an asset class. It's a cry for help."

**Wizcudi**
- → Löken: "AIK forever. Djurgården never. And who left that light on?!"
- → BigWman: "I calculated 300 moves ahead. You calculated VAT."
- → Jrohn: "Put a shirt on, you're heating the room and I can't afford that."
- → Ljunky: "Your mining rig costs me money from across town. I can feel it."

**Jrohn**
- → BigWman: "Pants off, cards on the table. Today we find out who's bigger. I LOVE THIS!"
- → Wizcudi: "Relax, I left every light in the basement on. For you."
- → Löken: "Hug first, fight after. …Where did my shirt go?"
- → Ljunky: "Have you seen Walter? No? Then you have to fight me."

**Löken**
- → Wizcudi: "You're standing on Djurgården grass now. Stick together, boys… except you."
- → BigWman: "I dropped 400 kr on the way here. Put it in a spreadsheet."
- → Jrohn: "Not on the lawn! Keep your pants ON on the lawn!"
- → Ljunky: "The coins I drop are real. Yours are imaginary."

**Ljunky**
- → BigWman: "I put your whole pension in a coin called ZOMBIE. You're welcome."
- → Wizcudi: "I explained the rules. Twice. Unclearly. That's on you."
- → Jrohn: "My cats ate your plants. Let's call it even."
- → Löken: "Have you checked the Bitcoin price today? No? That's why you lose."

**Dev Ljunky (final boss, MIND type, changes the rules mid-fight)**
- → everyone: "Surprise. I spiked the drink. I also wrote the game. And I just patched your stats."
- → Ljunky: "Hello, me. You never had a nemesis. So I compiled one."
- Moves: *Patch Notes* (swaps your ATK/DEF), *Hotfix* (heals himself), *Spawn Bug* (summons a creature), *Rage Quit* (only at low HP: the screen glitches).

## 5. The partners (Psychic / Guilt)
Each partner is out looking for **her own guy**. If you play as him, she's a tough fight. If you play as someone else, she accuses you of covering for him. Solved encounter (win **or** say the right thing) = 5 000.

| Partner of | Name | Type | Look (for the sprite) | Signature moves |
|---|---|---|---|---|
| BigWman | **Cicci** | Guilt | [hair / clothes / prop] | "Another package?" (lose a turn), "We said a budget." (−ATK) |
| Wizcudi | **Anna** | Psychic | [ ] | "Turn it back ON." (confuses: random move), "Ellie wants the light on." |
| Jrohn | **Monika** | Guilt | [ ] | "Where are your clothes?" (−DEF), "Walter ran away AGAIN." |
| Löken | **Sofia** | Psychic | [ ] | "Not another Djurgården match." (confuses), "The lawn can wait." |
| Ljunky | **MaadMads** | Guilt | [ ] | "Did you buy the dip again?" (−SPD), "The cats need food." |

- **Psychic** = confusion: 30 % chance your move is random, and the controls are mirrored for 5 s on the map.
- **Guilt** = lures you in and lowers DEF. Every turn you stay, DEF −1. Answer options: *Apologize* (heal her, −your HP), *Promise* (end the fight, adds promise debt), *Whisky* (immune).
- Partners attack with words and never get hurt. You win by surviving 5 turns or picking the right answer.

## 6. NPCs (talk nonsense)
6 wandering NPCs. Each says a random line from the pools below, about a random hero (positive, negative or suspicious) or pure nonsense.

**NPCs:** Bagging-area Berit, Bottle-return Pelle, Freezer Freja, Parking-lot Pirate, Hallucinating Hasse, the Barber.

| Hero | Wildly positive | Wildly negative | Suspicious |
|---|---|---|---|
| BigWman | "He balanced the national budget with a calculator and a YES." | "He owes me for 14 packages. The packages owe ME." | "Why does his Polestar need to be that quiet? What is he sneaking away from?" |
| Wizcudi | "He turned off the sun once. Saved 3 kronor." | "He called me a feeder through the wall. I don't even play." | "Every lamp in here flickers when he walks by. Coincidence?" |
| Jrohn | "He hugged a zombie and it went vegan." | "I found a sock in the frozen peas. It said JROHN." | "Nobody has been down in his basement. Nobody has come UP either." |
| Löken | "His lawn is so perfect the grass mows itself out of respect." | "He cut in line at the bottle return. Gently. Loyally. Still rude." | "Where do all those coins come from? WHERE?" |
| Ljunky | "He caught a vase, a cat and a Bitcoin in mid-air. Same day." | "He explained crypto to me for two hours. Now I owe him money." | "He built this place. Look at the corners. Pixels." |

**Nonsense:** "The cucumbers vote AIK." · "Unexpected item in bagging area. Unexpected YOU." · "I've been in this queue since 2019." · "Discount on souls today." · "Can you smell purple?" · "The trolleys are unionizing." · "Don't look the self-checkout in the eye."

## 7. Creatures (20 + secrets)
All original. Stats are scaled by rarity and level in code. Rarity: C = common, U = uncommon, R = rare, L = legendary.

| # | Name | Type | Where | Rarity | Signature move | Look |
|---|---|---|---|---|---|---|
| 1 | **Folköl frog** (starter) | FIZZ | Systembolaget | C | *Foam Spray* | A green frog with a can as a body, foam on its head |
| 2 | **Cucumber dragon** (starter) → **Cucumber drake** | GRUB | Fruit & veg | C | *Pickle Breath* | A long cucumber with small wings and a dill crest |
| 3 | **Freezer penguin** (starter) | FROST | Freezer | C | *Freezer Burn* | A penguin wrapped in frozen-pea bags |
| 4 | **Trolley golem** | RUSTLE | Parking lot | U | *Wonky Wheel* (random direction, high damage) | A trolley with arms, one wheel spins wrong |
| 5 | **Self-scan ghost** | TECH | Self-checkout | U | *Unexpected Item* (stuns 1 turn) | A pale screen face with a red scanner beam |
| 6 | **Pick-and-mix slime** | GRUB | Pick-and-mix | C | *Sugar Rush* (+SPD) | A clear slime with sweets inside |
| 7 | **Plastic-bag bat** | RUSTLE | Parking lot, checkouts | C | *Flutter* | A rustling bag with wings, "2 KR" on its chest |
| 8 | **Cinnamon-bun mummy** | GRUB | Bakery | U | *Cinnamon Wrap* | A cinnamon bun with bandages and glowing eyes |
| 9 | **Bargain banshee** | RUSTLE | Aisles | U | *BARGAIN!* (scream, −DEF) | A yellow price tag with a wide-open mouth |
| 10 | **Fruit-fly swarm** | WILD | Fruit & veg | C | *Swarm* (hits 2–5 times) | A cloud of dots around a banana |
| 11 | **Bottle-return crow** | WILD | The lawn, Systembolaget | C | *Pant Peck* | A black crow with a can in its beak |
| 12 | **Gin genie** | FIZZ | Systembolaget | R | *Tonic Wish* (heals) | A blue genie rising out of a gin glass with a lemon slice |
| 13 | **Whisky owl** | FIZZ | Systembolaget | R | *Smoky Stare* (−ATK) | A brown owl, amber eyes, a cork as its beak |
| 14 | **Cough-syrup snail** | MIND | Apotek | U | *Drowsy* (puts the enemy to sleep) | A pink snail with a medicine-bottle shell |
| 15 | **Charging-cable snake** | TECH | E.ON charger | U | *Fast Charge* (+ATK) | A green cable with a plug head |
| 16 | **Burger bear** | GRUB | IRON Burger | U | *Double Patty* | A bear with a burger as a body, sesame-seed ears |
| 17 | **Kebab-pizza lizard** | GRUB | Pizzeria Berga | U | *Garlic Sauce* (poison) | A lizard with a pizza-slice back and kebab spines |
| 18 | **Salmon roll** | FROST | Sushi | U | *Wasabi Kick* | A sushi roll with salmon fins and chopstick legs |
| 19 | **Moustache moth** | WILD | Tailor's Barber | R | *Trim* (removes enemy buffs) | A moth with moustache wings |
| 20 | **Pikezilla** | WILD | The lake (fishing) | R | *Lake Bite* | A huge pike with a crown of reeds |
| ★ | **The Loyal Customer** (legendary) | FIZZ/MIND | Appears after 15 species | L | *Golden Member Card* (×2 points this battle) | A golden ghost with a loyalty card as a cape |

**Secrets** (count as species, but aren't needed for max):
- **Walter** (Jrohn's dog, WILD): runs around the parking lot. You can only catch him if you're playing Jrohn; others get a funny line.
- **The Cats** (Ljunky's, WILD/RUSTLE): show up at Cat Chaos; they knock things over and run off.

## 8. Shopping list
8 random items per new game from: milk, Kalles kaviar, falukorv, crispbread, cinnamon buns, snus, chips & dip, frozen pizza, toilet paper, batteries, oat milk, pick-and-mix. Items lie on shelves in the right aisle, or you get them after a battle or from an NPC.

## 9. Engine support needed (keep engine.js changes small)
- `save: true` → the engine saves `G` per player and mission in localStorage (`lod.save.m3.<player>`) every 10 s and on pause. Continue/New game in the brief.
- `noTimer: true` → no `maxTime`/OVERLOAD. The timer shows total playtime.
- `submitOnSave: true` → submits the current score (goals) when it is higher than the best, at most once a minute and when leaving.
- A grid/tile map and battle UI live in `missions/m3.js` (own screen via `LOD.ui.panel`).

## 10. Scope
**Must be ready 23 Nov:** the map with all zones, 12 creatures (1–9, 11, 15, 16), battles/catching/levels, shopping list, drinks, 4 hero bosses + Dev Ljunky, NPC lines, save, scoring.
**Patch 24 Nov (if time allows):** the remaining creatures and evolutions, rival encounters on the map, food buffs, secrets.
