# Player Abilities Design (Revised)

**Date:** 2026-07-01

---

## Overview

Replaces the existing placeholder ability system with 29 mechanically-active abilities that modify player rolls during the interactive game. Each ability is a short kebab-case ID stored on `Player.ability` / `TeamUnit.ability`. A display map in `abilityEngine.ts` converts IDs to emoji+name strings for the UI. Players have a 40% chance of receiving an ability when generated (`ABILITY_RATE = 0.4`). Position-specific pools ensure that, e.g., OLine abilities only land on OLine units.

Abilities split into two timing groups:
- **Roll-time:** computed immediately when the player rolls; bonus appears in the UI at once.
- **Post-roll (Blessed only):** re-evaluated after every subsequent roll on the play so the bonus updates live as rolls come in.

---

## 1. Ability IDs and Display Strings

### All Positions

| ID | Display |
|---|---|
| `evens` | 2️⃣ Evens |
| `odds` | 3️⃣ Odds |
| `evil-evens` | 2️⃣ Evil Evens |
| `evil-odds` | 3️⃣ Evil Odds |
| `blessed-evens` | 2️⃣ Blessed Evens |
| `blessed-odds` | 3️⃣ Blessed Odds |
| `second-half` | 💪🏻 2nd-Half Player |
| `clutch` | 💪🏻 Clutch |
| `rain-man` | 🌧️ Rain Man |
| `snow-man` | ❄️ Snow Man |
| `comeback-kid` | 📈 Comeback Kid |
| `two-minute-drill` | ⏱️ Two Minute Drill |

### OLine

| ID | Display |
|---|---|
| `air-raid` | ✈️ Air Raid |
| `ground-and-pound` | 👊 Ground and Pound |
| `psychic` | 🔮 Psychic |

### DLine

| ID | Display |
|---|---|
| `bull-rush` | 🐂 Bull Rush |
| `brick-wall` | 🧱 Brick Wall |
| `stack-the-box` | 📦 Stack the Box |
| `psychic` | 🔮 Psychic |
| `bend-dont-break` | ⛓️ Bend Don't Break |

### Secondary

| ID | Display |
|---|---|
| `bend-dont-break` | ⛓️ Bend Don't Break |
| `on-an-island` | 🏝️ On an Island |
| `no-fly-zone` | ❌ No Fly Zone |
| `psychic` | 🔮 Psychic |

### QB

| ID | Display |
|---|---|
| `play-action` | 🏈 Play Action |
| `in-rhythm` | 🎵 In Rhythm |

### RB

| ID | Display |
|---|---|
| `workhorse` | 🐴 Workhorse |
| `fresh-legs` | 🦵 Fresh Legs |
| `goal-line` | 🏈 Goal Line |

### WR

| ID | Display |
|---|---|
| `basketball-player` | 🏀 Basketball Player |
| `yac` | 🏈 YAC |

### K
K units have access to the All Positions pool only (K-specific abilities are out of scope).

---

## 2. Assignment (`src/logic/abilityGen.ts` — full rewrite)

```ts
export const ABILITY_RATE = 0.4

// Pool constants (used internally to build position pools)
const ALL_ABILITY_IDS: string[]
const OLINE_ABILITY_IDS: string[]
// ... etc.

export function assignAbility(position: IndividualPosition | UnitPosition): string | undefined
```

`ABILITY_DISPLAY` (the emoji+name map) lives in `abilityEngine.ts`, not here. `abilityGen.ts` only stores IDs.

- Returns `undefined` with probability `1 - ABILITY_RATE`
- Returns a random ID from the position's pool with probability `ABILITY_RATE`
- Position pool = ALL_ABILITY_IDS + position-specific IDs (as in Section 1)
Called from the same six generation points as `die`. The signature changes from the old `assignAbility(): string` to `assignAbility(position): string | undefined`, so all six call sites must pass the player/unit's position and handle the `undefined` return (meaning no ability is assigned):
1. `generateRandomSlot` in `rosterGen.ts`
2. Practice squad loop in `generateRandomRoster`
3. `selectTopRoster` / `withExtras` helper in `rosterGen.ts`
4. `generateDraftOffer` in `draftGen.ts`
5. `rerollDraftOfferTeam` in `draftGen.ts`
6. `rerollDraftOfferYear` in `draftGen.ts`

The existing `abilityGen.test.ts` is updated to cover position-aware assignment and the 40% rate.

---

## 3. Ability Engine (`src/logic/abilityEngine.ts` — new file)

### AbilityContext

```ts
export interface AbilityContext {
  quarter: number                       // 1–4
  driveIndex: number                    // 0–15
  possession: 'user' | 'opponent'
  playerSide: 'offense' | 'defense'
  playerTeamIsLosing: boolean           // true when this player's team is currently behind
  isLastTeamDrive: boolean              // true when this is the last drive this team has on offense
  driveProgress: number                 // 0–100
  down: number                          // 1–4
  playCall: 'run' | 'pass'
  weather: WeatherCondition
  ownPlayHistory: ('run' | 'pass')[]    // this player's team's offensive play calls (cross-drive)
  oppPlayHistory: ('run' | 'pass')[]    // opposing team's offensive play calls (cross-drive)
  ownRunsThisDrive: number              // runs this team's offense has called this drive (before current play)
  wrYacActive: boolean                  // for WR: has this WR already triggered YAC this drive?
  olineRoll: number | null              // for Bull Rush / Brick Wall: the OLine's roll from offRolls
  opponentWRRating: number | undefined  // for On an Island: rating of the WR in the current offense
  allOffRolls: (number | null)[]        // for Blessed abilities (re-evaluated after each roll)
  allDefRolls: (number | null)[]
}
```

### Exported functions

```ts
export const ABILITY_DISPLAY: Record<string, string>

export function isPostRollAbility(abilityId: string): boolean
// Returns true for 'blessed-evens' and 'blessed-odds' only.

export function computeRollBonus(abilityId: string, roll: number, ctx: AbilityContext): number
// Called immediately when a player rolls. Returns integer bonus (may be negative for Evil Evens/Odds).

export function computePostRollBonus(abilityId: string, ctx: AbilityContext): number
// Called after every roll on the play to re-evaluate Blessed bonuses.
```

### Internal helper

```ts
function consecutiveCount(history: ('run' | 'pass')[], current: 'run' | 'pass'): number
// Counts how many times in a row `current` appears at the tail of [...history, current].
// Example: history=['run','pass','pass'], current='pass' → 3.

function consecutiveBonus(count: number): number
// count >= 2 → 5 + 2*(count-2); else 0.
```

### Roll-time evaluation table

| Ability | Logic |
|---|---|
| `evens` | `roll % 2 === 0 ? +5 : 0` |
| `odds` | `roll % 2 !== 0 ? +5 : 0` |
| `evil-evens` | `roll % 2 === 0 ? +7 : -3` |
| `evil-odds` | `roll % 2 !== 0 ? +7 : -3` |
| `second-half` | `ctx.quarter >= 3 ? +5 : 0` |
| `clutch` | `ctx.quarter === 4 ? +10 : 0` |
| `rain-man` | `ctx.weather === 'Rain' ? +5 : 0` |
| `snow-man` | `ctx.weather === 'Snow' ? +5 : 0` |
| `comeback-kid` | `ctx.playerTeamIsLosing ? +5 : 0` |
| `two-minute-drill` | `ctx.playerSide === 'offense' && ctx.isLastTeamDrive ? +15 : 0` |
| `air-raid` | `ctx.playCall === 'pass' ? +5 : 0` |
| `ground-and-pound` | `ctx.playCall === 'run' ? +5 : 0` |
| `psychic` | `consecutiveBonus(consecutiveCount(ctx.playerSide === 'offense' ? ctx.ownPlayHistory : ctx.oppPlayHistory, ctx.playCall))` |
| `bull-rush` | `ctx.playCall === 'pass' && ctx.olineRoll !== null && ctx.olineRoll <= roll ? +7 : 0` |
| `brick-wall` | `ctx.playCall === 'run' && ctx.olineRoll !== null && ctx.olineRoll <= roll ? +7 : 0` |
| `stack-the-box` | `ctx.playCall === 'run' ? consecutiveBonus(consecutiveCount(ctx.oppPlayHistory, 'run')) : 0` |
| `no-fly-zone` | `ctx.playCall === 'pass' ? consecutiveBonus(consecutiveCount(ctx.oppPlayHistory, 'pass')) : 0` |
| `bend-dont-break` | `ctx.driveProgress >= 80 ? +5 : 0` |
| `on-an-island` | `(ctx.opponentWRRating ?? 0) >= 93 ? +5 : 0` |
| `play-action` | `ctx.ownPlayHistory.at(-1) === 'run' ? +5 : 0` |
| `in-rhythm` | `ctx.ownPlayHistory.at(-1) === 'pass' ? +5 : 0` |
| `workhorse` | `ctx.playCall === 'run' ? (ctx.ownRunsThisDrive + 1) * 3 : 0` |
| `fresh-legs` | `ctx.down === 1 && ctx.playCall === 'run' ? +8 : 0` |
| `goal-line` | `ctx.driveProgress >= 80 ? +5 : 0` |
| `basketball-player` | `ctx.driveProgress >= 80 ? +5 : 0` |
| `yac` | `ctx.wrYacActive ? +5 : 0` |

**Notes on specific abilities:**

- **Psychic (OLine):** `playerSide === 'offense'` → uses `ownPlayHistory`. Bonus applies when this player's own offense repeats the same call.
- **Psychic (DLine / Secondary):** `playerSide === 'defense'` → uses `oppPlayHistory`. Bonus applies when opposing offense repeats.
- **Bull Rush / Brick Wall:** DLine is always in `defPlayers`. By the time DLine rolls (during `rolling-defense`), OLine's roll is already in `offRolls`. `olineRoll` is extracted when building context for a defense roll.
- **Workhorse:** `ownRunsThisDrive` is the count of runs the offense has called this drive *before* the current play. Adding 1 gives "this is the Nth run."
- **Two Minute Drill:** Only offensive players benefit. User team's last drive = `driveIndex === 14` (user possession); opponent's last drive = `driveIndex === 15` (opponent possession). `isLastTeamDrive` is pre-computed when building context.
- **Comeback Kid:** `playerTeamIsLosing` is pre-computed when building context. For offense players, "their team" is the possessing team. For defense players, "their team" is the non-possessing team.

### Post-roll evaluation (Blessed)

```ts
// blessed-evens:
const rolls = [...ctx.allOffRolls, ...ctx.allDefRolls].filter((r): r is number => r !== null)
return rolls.filter(r => r % 2 === 0).length

// blessed-odds:
return rolls.filter(r => r % 2 !== 0).length
```

---

## 4. GameState additions (`GameScreen.tsx`)

```ts
// Cross-drive (never reset)
userPlayHistory: ('run' | 'pass')[]
opponentPlayHistory: ('run' | 'pass')[]

// Per-drive (reset in driveReset())
userRunsThisDrive: number
opponentRunsThisDrive: number
wr1YacActive: boolean
wr2YacActive: boolean

// Per-play (reset in playReset(), parallel to offPlayers / defPlayers)
offBonuses: (number | null)[]
defBonuses: (number | null)[]
```

**`driveReset()`:** clears all drive-scoped and play-scoped fields (does NOT touch play history arrays).

**`playReset()`:** clears `offBonuses`, `defBonuses`, `offPlayers`, `defPlayers`, `offRolls`, `defRolls`.

**`makeInitialState()`:** all history arrays empty `[]`, all counters `0`, all YAC flags `false`.

**`RESOLVE_PLAY` reducer case:** before advancing to the next phase, append `offensePlayCall` to the appropriate history and increment the run counter:
```ts
const newUserHistory = possession === 'user'
  ? [...userPlayHistory, offensePlayCall]
  : userPlayHistory
const newOppHistory = possession === 'opponent'
  ? [...opponentPlayHistory, offensePlayCall]
  : opponentPlayHistory
const newUserRuns = possession === 'user' && offensePlayCall === 'run'
  ? userRunsThisDrive + 1
  : userRunsThisDrive
const newOppRuns = possession === 'opponent' && offensePlayCall === 'run'
  ? opponentRunsThisDrive + 1
  : opponentRunsThisDrive
```

**YAC activation:** in the `ROLL` case, after setting an offense roll, check: if the rolling player is a WR and the roll value ≥ 12, set `wr1YacActive` or `wr2YacActive` = true (using `state.selectedWR` to identify which slot). The `wrYacActive` flag passed to context during the current roll is the value *before* this activation, so the bonus is 0 on the triggering play and +5 on all subsequent plays in the drive.

**Weather:** `currentWeather` is pulled from `useGameStore()` alongside `roster` and `currentOpponentRoster` at the top of `GameScreen`.

---

## 5. Reducer ROLL case — bonus computation steps

After setting the new roll value (`newOffRolls` or `newDefRolls`):

**Step 1 — Roll-time bonus for the rolling player:**
- If the player has an ability and `!isPostRollAbility(ability)`:
  - Build `AbilityContext` for this player
  - `bonuses[i] = computeRollBonus(ability, value, ctx)`
  - For **defense** players: set `ctx.olineRoll` = find OLine in `offPlayers` by position, get `offRolls[olineIdx]`
  - For **WR** (offense): set `ctx.wrYacActive` using `wr1YacActive` / `wr2YacActive` and `selectedWR`
  - For **On an Island** (Secondary, defense, pass play): set `ctx.opponentWRRating` by finding the WR in `offPlayers`

**Step 2 — Post-roll re-evaluation (Blessed abilities):**
After every roll action, scan all `offPlayers` and `defPlayers` for `blessed-evens` / `blessed-odds`. For each found, rebuild context with the current `allOffRolls` + `allDefRolls` and call `computePostRollBonus`. Store result in the appropriate `offBonuses[i]` or `defBonuses[i]`.

**Context construction helpers (internal to GameScreen):**

```ts
function buildContext(
  player: Player | TeamUnit,
  side: 'offense' | 'defense',
  state: GameState,
  weather: WeatherCondition,
  userRoster: Roster,
  oppRoster: Roster,
): AbilityContext
```

Pre-computes `playerTeamIsLosing` and `isLastTeamDrive` so the evaluator only reads them as booleans:

```ts
const quarter = Math.floor(state.driveIndex / 4) + 1

const playerTeamIsUser =
  (side === 'offense' && state.possession === 'user') ||
  (side === 'defense' && state.possession === 'opponent')
const playerTeamIsLosing = playerTeamIsUser
  ? state.userScore < state.opponentScore
  : state.opponentScore < state.userScore

const isLastTeamDrive =
  side === 'offense' && (
    (state.possession === 'user' && state.driveIndex === 14) ||
    (state.possession === 'opponent' && state.driveIndex === 15)
  )
```

---

## 6. UI Changes

### `PlayerRollCard`
New optional prop: `bonus?: number | null`

When the roll is revealed and `bonus` is a non-null number:
- Positive: show `+{bonus}` in `text-green-400` immediately to the right of the roll value
- Negative: show `{bonus}` (e.g. `-3`) in `text-red-400`
- Zero or null: show nothing

Ability display: `player.ability` is now an ID, not a display string. Change the existing ability line to:
```tsx
{player.ability && (
  <p className="text-xs text-gray-500">{ABILITY_DISPLAY[player.ability] ?? player.ability}</p>
)}
```
`ABILITY_DISPLAY` imported from `abilityEngine.ts` (or `abilityGen.ts`).

### `PlayArea`
New props: `offBonuses: (number | null)[]`, `defBonuses: (number | null)[]`

Passes `offBonuses[i]` / `defBonuses[i]` as `bonus` to each corresponding `PlayerRollCard`.

### `GameScreen`
Passes `offBonuses` and `defBonuses` from game state into `PlayArea`.

### `PlayerCard` and `PlayerPickCard`
Same `ABILITY_DISPLAY` lookup: replace raw `player.ability` string render with the display map lookup.

---

## 7. Types

`src/types/index.ts` — no changes required. `ability?: string` already exists on both `Player` and `TeamUnit`.

---

## 8. Out of Scope

- Kicker abilities (Long Leg, Weather Man)
- Ol' Reliable
- Animated bonus reveals (bonus appears immediately when computed, no animation)
- Turnover / safety interactions with abilities
