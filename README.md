# Football Manager Game

A browser-based football card-game manager. You build a roster of real NFL players and units, call plays down-by-down against simulated opponents, and chase a championship across a 17-week season — all driven by custom dice rolls and a growing ability system.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Game Flow](#game-flow)
  - [Season Structure](#season-structure)
  - [Setup Phase](#setup-phase)
  - [Round Hub](#round-hub)
  - [Playing a Game](#playing-a-game)
  - [Season End](#season-end)
- [Roster](#roster)
  - [Positions](#positions)
  - [Rating Tiers & Dice](#rating-tiers--dice)
  - [Player Cost & Salary Cap](#player-cost--salary-cap)
  - [Practice Squad](#practice-squad)
- [Core Game Mechanics](#core-game-mechanics)
  - [Drives](#drives)
  - [Play Calls](#play-calls)
  - [Rolling Pairs](#rolling-pairs)
  - [Yards & Scoring](#yards--scoring)
  - [Field Goals](#field-goals)
  - [Turnovers](#turnovers)
  - [Weather](#weather)
- [Between-Round Actions](#between-round-actions)
  - [Player Shop](#player-shop)
  - [Ability Shop](#ability-shop)
  - [Draft Offer](#draft-offer)
  - [Selling Players](#selling-players)
- [Abilities](#abilities)
  - [General Abilities](#general-abilities)
  - [QB Abilities](#qb-abilities)
  - [WR Abilities](#wr-abilities)
  - [RB Abilities](#rb-abilities)
  - [K Abilities](#k-abilities)
  - [O-Line Abilities](#o-line-abilities)
  - [D-Line Abilities](#d-line-abilities)
  - [Secondary Abilities](#secondary-abilities)
  - [Season-Counter Abilities](#season-counter-abilities)
  - [Dual Threat Abilities](#dual-threat-abilities)
- [Rarity System](#rarity-system)
- [League Rules](#league-rules)
- [Seeded Randomness & Save Files](#seeded-randomness--save-files)
- [Development](#development)

---

## Overview

Each season you:

1. **Draft a starting roster** from three guaranteed-tier players (plus Practice Squad filler).
2. **Play 17 rounds** — each round you face a simulated opponent, then upgrade your roster between games.
3. **Win games** by managing yards down-by-down: call run or pass, choose your receiver or runner, roll your dice, watch abilities trigger, and either score or punt.

Everything from player dice pools to ability assignment to weather is seeded to a single 10-digit hex number so runs are reproducible.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS |
| State | Zustand |
| Tests | Vitest |
| RNG | sfc32 seeded PRNG (`src/logic/rng.ts`) |

---

## Game Flow

### Season Structure

A season is **17 rounds**. Each round has the same structure:

```
Round Hub → (optional) Player Shop → (optional) Ability Shop
         → (optional) Draft Offer  → Play Game → Advance Round
```

### Setup Phase

On game start you receive **3 real players** across a guaranteed rating spread:

| Tier | Rating Range |
|---|---|
| Good | 75 – 84 |
| Great | 85 – 92 |
| Elite | 93+ |

The remaining 5 roster slots are filled with **Practice Squad** placeholders (rating 60, no dice, no abilities). You get **3 re-rolls** to swap any starting slot before confirming.

Between **1 and 2** of your 3 starting real players are guaranteed to have an ability.

After confirmation the game generates your first opponent, shop, draft offer, and weather, and drops you into Round 1.

### Round Hub

The hub shows the current round, your record, the opponent you face this week, the week's weather, the active League Rule, and all available actions. You can do any combination of Shop / Ability Shop / Draft in any order before starting the game.

### Playing a Game

A game is **16 drives** — 4 drives per quarter, alternating possession (user first each quarter). Your team always plays the interactive game; the **opponent's drives** are resolved automatically by the simulation engine.

See [Core Game Mechanics](#core-game-mechanics) for drive-by-drive details.

### Season End

After round 17 the game moves to a **Season Complete** screen showing your full record and season log.

---

## Roster

### Positions

| Slot | Type | Role |
|---|---|---|
| QB | Individual Player | Passes; rolls on pass plays |
| WR1 | Individual Player | Receives; chosen by you on pass plays |
| WR2 | Individual Player | Receives; chosen by you on pass plays |
| RB | Individual Player | Runs; rolls on run plays |
| K | Individual Player | Field goal specialist |
| O-Line | Team Unit | Blocks; rolls on every play; its roll is the O-Line value used by D-Line abilities |
| D-Line | Team Unit | Defends runs and pass rush |
| Secondary | Team Unit | Defends pass plays |

### Rating Tiers & Dice

Each player/unit is assigned a **6-sided custom die** from a pool matching their rating tier. All six faces are shown on their card. Higher tiers have bigger and/or more consistent numbers.

| Tier | Rating | Die Character |
|---|---|---|
| Legendary | 98+ | All 18–20 faces |
| Elite | 93–97 | High consistent (15–20 range) or high-variance boom/bust |
| Great | 85–92 | Solid mid-to-high (10–15 avg) |
| Good | 75–84 | Average with occasional spikes |
| Average | 65–74 | Low-mid values |
| Below Average | < 65 | Mostly low (1–6) |

Each tier has multiple distinct die shapes (e.g. balanced vs. boom/bust), so two players at the same rating can play very differently.

### Player Cost & Salary Cap

Total cap space is **200 coins**. Your available coins are `200 − cost of all filled slots`. Empty slots and Practice Squad placeholders cost 0.

| Rating | Cost per Season |
|---|---|
| 93+ (Elite) | 30 coins |
| 85–92 (Great) | 20 coins |
| 75–84 (Good) | 15 coins |
| 65–74 (Average) | 10 coins |
| < 65 (Below Avg) | 5 coins |

You spend coins in the Player Shop and Ability Shop each round. Selling a player refunds his cost.

### Practice Squad

Practice Squad slots are free placeholders (rating 60, no die) used when a position hasn't been filled with a real player. They still roll in game — they use the fallback die `[5, 5, 5, 5, 5, 5]`.

---

## Core Game Mechanics

### Drives

Each of your 16 drives starts at the **20-yard line**. You have **4 downs** to advance to the end zone (100 yards). A failed 4th-down punt returns the ball to the opponent; turnovers and scores also end a drive.

The drive progress bar shows your current field position. The **red zone** begins at the **80-yard line** by default (League Rules can change this).

### Play Calls

At the start of each down you secretly choose **Run** or **Pass**. The opponent (AI) simultaneously chooses **Run-Stop** or **Pass-Stop**. If the defense correctly predicted your call, you lose **5 yards of advantage bonus**; if they guessed wrong, you gain **+5**.

**On pass plays** you also pick your receiver — **WR1** or **WR2**. If your QB has `Dual Threat`, you can also choose to run with the QB. If your RB has `Dual Threat`, the RB can be selected as the receiver on pass plays.

**On run plays** with a QB who has `Dual Threat`, you're prompted to choose between the QB and RB as the runner.

### Rolling Pairs

After calls are locked in, players roll in matched pairs (offense vs. defense):

| Play | Offense rolls | Defense rolls |
|---|---|---|
| Run | RB, O-Line | D-Line |
| Pass | QB, O-Line, chosen WR | D-Line, Secondary |

Each roll is a random face from that player's custom die. Abilities are evaluated immediately after each individual roll:

- **Pre-roll abilities** add a bonus to the raw die value.
- **Post-roll abilities** (`Blessed Evens`, `Blessed Odds`, `Elevate`) are evaluated after all rolls complete and see every roll on the field.

### Yards & Scoring

```
Yards Gained = (sum of offense rolls + offense bonuses) − (sum of defense rolls + defense bonuses) + advantage bonus
```

Positive yards advance down the field. Reaching **100 yards** (default) scores a **touchdown (7 pts)**. Negative yards are still applied — drives can stall or go backwards.

After each play the game checks:
- **Reached TD yard** → Touchdown
- **Turnover roll triggered** → Turnover (see below)
- **4th down failed** → Punt (or turnover if No Punting rule is active)
- **FG range reached** → Option to kick a field goal

### Field Goals

Once you reach the **60-yard line** (configurable) a **Kick FG** button appears. The kicker rolls their die against a difficulty value that scales linearly: hardest at the 60-yard line (**difficulty 15**), easiest right before the end zone (**difficulty 1**).

The FG succeeds if the kicker's roll ≥ difficulty. A miss ends the drive with no points.

FG are worth **3 points** by default. The `Money Ball` ability upgrades red zone FGs to **5 points**. The League Rule *Kickers Are People, Too* makes all FGs worth 6.

### Turnovers

Each team has one **Turnover Number** (1–20), generated at game start. Any time a player rolls their team's Turnover Number on their die during a down, the drive immediately ends as a Turnover. Under the *Defense Wins Championships* rule each team gets **two** Turnover Numbers.

A turnover yields 0 points by default. Under the *Pick-2* rule, turnovers score **2 points** for the defending team.

### Weather

Each game has one of five weather conditions that can affect ability bonuses:

| Weather | Effect |
|---|---|
| Clear | No modifier |
| Dome | No modifier |
| Rain | Activates `Rain Man` (+5) |
| Heavy Wind | No direct modifier (affects feel) |
| Snow | Activates `Snow Man` (+5) |

Weather is rolled at round start from a weighted pool (Clear 50%, Dome 20%, Rain 15%, Heavy Wind 10%, Snow 5%). The *Ice Age* League Rule forces Snow every week.

---

## Between-Round Actions

### Player Shop

Each round a shop of **4 random players** appears (positions chosen randomly). Buying a player costs coins and replaces your chosen roster slot — you receive a refund for whoever you're replacing. The shop respects your current coin balance so offers skew affordable.

### Ability Shop

Alongside the player shop, **4 random abilities** are offered for sale. Each ability can be applied to any compatible roster slot (see [Abilities](#abilities) for which abilities work on which positions). Buying replaces whatever ability that player currently has.

| Rarity | Cost |
|---|---|
| Common | 10 coins |
| Uncommon | 20 coins |
| Rare | 30 coins |

### Draft Offer

Each round a full roster from a random real NFL team/year is offered for free. You can draft one player (or unit) to any compatible slot for free. You get one chance to re-roll the offered team (different team) or re-roll the year (same team, different season). Drafting is optional.

### Selling Players

You can sell any filled roster slot from the **My Roster** screen at any time, recovering their coin cost. The slot reverts to a Practice Squad placeholder.

---

## Abilities

Abilities are special bonuses attached to individual players. They activate during the rolling phase based on game state. Each player can hold **one ability** at a time.

Abilities fall into **General** (can land on any position) and **Position-Specific** groups.

### General Abilities

| Ability | Effect |
|---|---|
| 🔥 Warming Up | −3 in Q1/Q2; +10 in Q3/Q4 |
| ⬆️ Elevate | +5 if any opponent rolls 15+ (raw die) on this play |
| 🧽 Absorb (N) | +1 each time this player rolls their target number N (1–20); stacks immediately and persists across the season |
| 💪🏻 2nd-Half Player | +5 in the 3rd and 4th quarters |
| 💪🏻 Clutch | +10 in the 4th quarter |
| 🌧️ Rain Man | +5 during rain games |
| ❄️ Snow Man | +5 during snow games |
| 📈 Comeback Kid | +5 when your team is losing |
| ⏱️ Two Minute Drill | +15 on the last offensive drive of each half |

### QB Abilities

| Ability | Effect |
|---|---|
| 🏈 Play Action | +5 on pass plays when the previous play was a run |
| 🎵 In Rhythm | +5 on pass plays when the previous play was also a pass |
| 🧘 Patience | +15 on 4th Down if the first 3 downs of the drive were all run plays |
| 💰 TD Merchant | +1 for every offensive TD your team scores this season |
| 2️⃣ Dual Threat | QB can be chosen in place of the RB on run plays |

### WR Abilities

| Ability | Effect |
|---|---|
| 🏀 Basketball Player | +5 when in the red zone |
| 🏈 YAC | +5 on every roll this drive after any player scored 12+ on a single roll |
| 🧘 Patience | +10 on 4th Down if the first 3 downs of the drive were all run plays |
| 👹 Feed the Beast | +5 (stacking) for each drive this game where this WR played every single down; bonus persists all game |
| 💰 TD Merchant | +1 for every offensive TD your team scores this season |

### RB Abilities

| Ability | Effect |
|---|---|
| 🐴 Workhorse | +3 × number of rushes already called this drive (grows with each run) |
| 🦵 Fresh Legs | +8 on 1st-down run plays |
| 🏈 Goal Line | +5 when in the red zone |
| 🧘 Patience | +15 on 4th Down if the first 3 downs of the drive were all pass plays |
| 👹 Feed the Beast | +5 (stacking) for each drive this game where the RB played every single down; bonus persists all game |
| 💰 TD Merchant | +1 for every offensive TD your team scores this season |
| 2️⃣ Dual Threat | RB can be chosen as the receiver on pass plays |

### K Abilities

| Ability | Effect |
|---|---|
| 🦵 Long Leg | FG range extended by 5 yards (can attempt FGs from the 55-yard line) |
| 💰 Money Ball | FGs kicked from the red zone are worth 5 points instead of 3 |

### O-Line Abilities

| Ability | Effect |
|---|---|
| ✈️ Air Raid | +5 on every pass play |
| 👊 Ground and Pound | +5 on every run play |
| 🔮 Psychic | +5 when the opponent repeats the same play type; +2 more for each additional consecutive repeat |

### D-Line Abilities

| Ability | Effect |
|---|---|
| 🐂 Bull Rush | +7 on pass plays when this roll beats the O-Line's roll |
| 🧱 Brick Wall | +7 on run plays when this roll beats the O-Line's roll |
| 📦 Stack the Box | +5 when the offense repeats a run play; +2 more per additional consecutive repeat |
| ⛓️ Bend Don't Break | +5 when the offense is in the red zone |
| 💰 TO Merchant | +1 for every defensive turnover your team forces this season |

### Secondary Abilities

| Ability | Effect |
|---|---|
| 🏝️ On an Island | +5 when matched against an elite WR (93+ rating) |
| ❌ No Fly Zone | +5 when the offense repeats a pass play; +2 more per additional consecutive repeat |
| ⛓️ Bend Don't Break | +5 when the offense is in the red zone |
| 💰 TO Merchant | +1 for every defensive turnover your team forces this season |

### Season-Counter Abilities

Three abilities accumulate a **permanent bonus** across the entire season:

| Ability | Trigger | Bonus |
|---|---|---|
| 🧽 Absorb (N) | Player rolls their target number N | +1 per hit, applies immediately mid-game |
| 💰 TD Merchant | Each offensive TD drive | +1 per TD, applied after each game |
| 💰 TO Merchant | Each defensive turnover | +1 per TO, applied after each game |

The counter is shown in the ability tooltip (and for Absorb, in the label itself: `🧽 Absorb (7)`). If a player with a counter ability is replaced, their counter is lost with them.

### Dual Threat Abilities

**Dual Threat QB** — on any run play, a receiver-selection UI appears asking you to pick **QB** or **RB** as the runner. The QB rolls in place of the RB.

**Dual Threat RB** — on any pass play, the WR selection UI adds the RB as a third option. The RB rolls in the WR slot (WR-specific abilities do not fire for the RB receiver).

---

## Rarity System

All current abilities are **Common**. The rarity system is in place for future Uncommon and Rare abilities:

| Rarity | Shop Cost | Selection Weight |
|---|---|---|
| Common | 10 coins | 10× |
| Uncommon | 20 coins | 4× |
| Rare | 30 coins | 1× |

Higher rarity abilities will appear less frequently in shops and in random ability assignment.

---

## League Rules

One League Rule is randomly selected at game start and applies for the entire season. Each rule changes how the game works at a fundamental level.

| Rule | Effect |
|---|---|
| 🔴 RZ Starts at 65 | Red zone begins at the 65-yard line instead of 80 — RZ abilities trigger much earlier |
| 🌎 Field Becomes 125 Yards | Drives need 105 yards to score a TD |
| 🏔️ Altitude | FG range extended to the 50-yard line for both teams |
| 🦶 Kickers Are People, Too | Field goals are worth 6 points |
| ❌ No Punting | Failed 4th downs turn the ball over at the spot (no free punt to the 20) |
| 5️⃣ 5th Down | The offense gets a 5th down per drive |
| ❄️ Ice Age | Every game this season is played in the snow |
| 🛡️ Defense Wins Championships | Each team rolls two Turnover Numbers — either triggers a turnover |
| 🏈 Pick-2 | Turnovers score 2 points for the defending team |
| 🪐 Parallel Universe | FGs worth 7 points; TDs worth 3 points |

---

## Seeded Randomness & Save Files

Every game is driven by a **10-digit hex seed** (e.g. `a3f7c1d8b2`) generated at startup using `crypto.getRandomValues`. The seed initializes an sfc32 PRNG that controls:

- Starting roster generation and die assignment
- Shop/draft/ability offer selection
- Opponent selection and stats
- Weather
- Turnover numbers
- All in-game die rolls
- Opponent AI play calls

The seed is included in the **My Roster → Save .json** export alongside your roster, coins, season log, and simulation history. Sharing a save file gives a full snapshot of the run.

---

## Development

```bash
npm install
npm run dev       # start dev server
npm run build     # production build
npm test          # run Vitest suite (289 tests)
```

Key source directories:

| Path | Purpose |
|---|---|
| `src/logic/` | Pure game logic — dice, abilities, roster gen, simulator |
| `src/store/` | Zustand store — game state and actions |
| `src/components/game/` | Interactive game UI (GameScreen, PlayerRollCard) |
| `src/components/roster/` | Roster display components |
| `src/components/round/` | Shop, draft, and round-hub screens |
| `src/components/screens/` | Top-level screen routing |
| `src/types/` | Shared TypeScript types |
| `docs/superpowers/plans/` | Implementation plans |
