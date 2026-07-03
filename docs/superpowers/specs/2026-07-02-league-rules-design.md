# League Rules

**Date:** 2026-07-02  
**Status:** Approved

## Overview

One League Rule is randomly selected at the start of each run and persists for the entire season. The rule is revealed to the player immediately on the Setup screen. Rules alter game constants and/or gameplay behaviors — each run plays differently depending on which rule is active.

---

## Rules Catalogue

| Rule | Effect |
|---|---|
| 🔴 RZ Starts at 35 | FG range begins at own 35 yd line (`fgRangeYard = 35`) |
| 🌎 Field becomes 125 yards | `tdYard = 125`; drives need 105 yds to score; turnover flip uses `tdYard - driveProgress` |
| 🏔️ Altitude | FG range extended to 50 yd line (`fgRangeYard = 50`) |
| 🦶 Kickers are People, Too | `fgPoints = 6` |
| ❌ No Punting | 4th down outside FG range forces play to continue instead of auto-punt |
| 5️⃣ 5th Down | Offense gets 5 downs per drive (`maxDowns = 5`) |
| ❄️ Ice Age | Every game is Snow weather |
| 🛡️ Defense Wins Championships | Each team gets 2 Turnover Numbers; rolling either triggers a turnover |
| 🏈 Pick-2 | A turnover gives the defending team 2 points |
| 🪐 Parallel Universe | `tdPoints = 3`, `fgPoints = 7` |

---

## Architecture: RuleOverrides in GameState (Approach A)

### New file: `src/logic/leagueRules.ts`

Defines:

```typescript
interface LeagueRule {
  id: string
  emoji: string
  name: string
  description: string
}

interface RuleOverrides {
  tdPoints: number            // default 7
  fgPoints: number            // default 3
  tdYard: number              // default 100
  fgRangeYard: number         // default 60
  maxDowns: number            // default 4
  noPuntingRule: boolean      // default false
  pick2Rule: boolean          // default false
  iceAge: boolean             // default false
  dualTurnoverNumbers: boolean // default false
}
```

Exports:
- `LEAGUE_RULES: LeagueRule[]` — all 10 entries
- `getDefaultOverrides(): RuleOverrides` — all defaults, used when no rule is active
- `getRuleOverrides(rule: LeagueRule): RuleOverrides` — merges rule-specific overrides onto defaults
- `getRandomRule(): LeagueRule` — picks uniformly at random

### FG difficulty scaling

`FG_DIFFICULTY_YARD_RANGE` is currently the constant `99 - FG_RANGE_YARD`. Anywhere this value is used in the FG roll logic, replace it with the runtime expression `99 - state.fgRangeYard` so that Altitude and RZ rules scale FG difficulty correctly across the new range.

### Turnover number arrays

`userTurnoverNumber: number` and `opponentTurnoverNumber: number` are renamed to `userTurnoverNumbers: number[]` and `opponentTurnoverNumbers: number[]` throughout the store and GameState. Normally each array has one element. With Defense Wins Championships active, each array has two distinct elements drawn from 1–20. Turnover detection changes from `value === state.userTurnoverNumbers[0]` to `state.userTurnoverNumbers.includes(value)`.

### Turnover field-position flip with 125-yard field

Currently `nextDriveStartYard = 100 - driveProgress`. With Field 125 active, this must use `tdYard`: `nextDriveStartYard = Math.min(state.tdYard - 1, Math.max(1, state.tdYard - state.driveProgress))`.

---

## Store Changes (`gameStore.ts`)

- Add `activeRule: LeagueRule | null` to `GameStore` — initialized in `initGame()`, persists all run
- Rename `userTurnoverNumber → userTurnoverNumbers: number[]` — set in `initGame()`, 1 or 2 values
- Rename `opponentTurnoverNumber → opponentTurnoverNumbers: number[]` — set in `confirmSetup()` and `advanceRound()`, 1 or 2 values
- Ice Age: in `buildNextRoundData(coins, activeRule?)`, if `activeRule?.id === 'ice-age'` return `'Snow'` instead of calling `generateWeather()`

---

## GameScreen Changes (`GameScreen.tsx`)

### GameState additions

```typescript
// rule overrides (all initialized from makeInitialState)
tdPoints: number
fgPoints: number
tdYard: number
fgRangeYard: number
maxDowns: number
noPuntingRule: boolean
pick2Rule: boolean

// renamed
userTurnoverNumbers: number[]
opponentTurnoverNumbers: number[]
```

### Constant substitutions in reducer

| Was | Now |
|---|---|
| `TD_POINTS` | `state.tdPoints` |
| `FG_POINTS` | `state.fgPoints` |
| `TD_YARD` | `state.tdYard` |
| `FG_RANGE_YARD` | `state.fgRangeYard` |
| `state.down >= 4` (punt/FG threshold) | `state.down >= state.maxDowns` |
| `100 - state.driveProgress` (turnover flip) | `state.tdYard - state.driveProgress` |

### No Punting rule

On 4th down (i.e., `state.down >= state.maxDowns`) outside FG range, the current reducer auto-advances to a Punt outcome. With `state.noPuntingRule === true`, skip the Punt branch and instead let the play continue as if it were a normal down (the offense must keep going).

### Pick-2 rule

In the turnover state update (both offense and defense branches), if `state.pick2Rule`:
- Add 2 to the defending team's score alongside the existing turnover state changes
- The turnover UI message updates to include `+2 pts` context

### makeInitialState signature

```typescript
makeInitialState({
  weather,
  userTurnoverNumbers,
  opponentTurnoverNumbers,
  overrides,   // RuleOverrides
}: { ... })
```

Spreads all `RuleOverrides` fields into the initial state.

---

## UI

### SetupScreen

Banner above the roster grid showing the active rule. Layout:

```
┌─────────────────────────────────────────────┐
│  🏈 LEAGUE RULE                             │
│  Pick-2                                     │
│  Turnovers score 2 points for the defense.  │
└─────────────────────────────────────────────┘
```

Indigo/amber accent card. Player sees this before clicking "Start Season".

### RoundHub

Small rule chip below the week header: `🏈 Pick-2`. Just emoji + name, no description.

### GameHUD

- Turnover numbers line: `YOUR # 7, 14 · OPP # 3` (comma-joined when dual)
- Rule badge chip beside it

### MatchupSummary

T.O. # column props change:

```typescript
// before
userTurnoverNumber: number
opponentTurnoverNumber: number

// after
userTurnoverNumbers: number[]
opponentTurnoverNumbers: number[]
```

Values rendered as `nums.join(', ')` so dual numbers appear as `"7, 14"`.

---

## Implementation Touchpoints

| File | Change |
|---|---|
| `src/logic/leagueRules.ts` | **NEW** — rule definitions, RuleOverrides, getRandomRule, getRuleOverrides |
| `src/store/gameStore.ts` | Add `activeRule`; rename TO# fields to arrays; Ice Age weather |
| `src/components/game/GameScreen.tsx` | GameState holds overrides; reducer substitutions; 5th down; no punting; pick-2; dual TO# |
| `src/components/game/GameHUD.tsx` | TO# arrays; rule badge |
| `src/components/round/MatchupSummary.tsx` | TO# props → arrays |
| `src/components/round/RoundHub.tsx` | Pass array props; rule chip |
| `src/components/screens/SetupScreen.tsx` | Rule reveal banner |

---

## Testing

- Unit tests for `getRuleOverrides` — verify each of the 10 rules produces the correct override values
- Update existing store tests: `userTurnoverNumber` → `userTurnoverNumbers` (array)
- `getRandomRule` test: call 100× and assert all results are in `LEAGUE_RULES`
