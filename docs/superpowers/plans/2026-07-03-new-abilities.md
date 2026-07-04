# New Abilities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 14 new player abilities across 5 implementation tiers — simple roll bonuses, FG mechanics, season-persistent counters, drive-sequence tracking, and dual-threat UI flows.

**Architecture:** New abilities slot into the existing `abilityEngine.ts` `computeRollBonus`/`computePostRollBonus` switch; abilities requiring extra context get new fields injected into `AbilityContext` in the `ROLL_PAIR` reducer case (same pattern as `wrYacActive`); season counters live on player objects (`abilityCounter`, `abilityTarget`); FG mechanic overrides live in `GameState`; Dual Threat adds a `choose-runner` phase and extends the existing WR-choice screen.

**Tech Stack:** React 18 + TypeScript + Vitest, Zustand store, Tailwind. All files are `.ts`/`.tsx`.

## Global Constraints

- Run `npm test` after every commit; all tests must pass before moving to the next task.
- No new npm packages.
- Ability IDs are kebab-case strings; every new ID must appear in ALL of: `ABILITY_RARITY`, `ABILITY_DESCRIPTIONS`, `ABILITY_DISPLAY`, `ENABLED_ABILITIES`, `POSITION_ABILITY_IDS`, and the `computeRollBonus`/`computePostRollBonus` switch (or be handled in GameScreen for FG/Dual Threat abilities).
- New `GameState` fields must be initialised in `makeInitialState`, cleared in `driveReset()` where appropriate, and reset in `ADVANCE_DRIVE` if they are drive-scoped.
- New `AbilityContext` fields must be added to the `AbilityContext` interface in `abilityEngine.ts` AND to `buildAbilityContext` in `GameScreen.tsx`.
- `Player` and `TeamUnit` types live in `src/types/index.ts`; modify both if adding shared optional fields.
- All ability IDs added to `ENABLED_ABILITIES` and `POSITION_ABILITY_IDS` must be committed in the same task that adds their engine logic, so the system is always consistent.

## New Ability IDs Reference

| ID | Category | Position(s) |
|---|---|---|
| `warming-up` | general | all |
| `elevate` | general | all |
| `long-leg` | FG mechanic | K |
| `money-ball` | FG mechanic | K |
| `absorb` | season counter | all |
| `td-merchant` | season counter | QB, RB, WR1, WR2 |
| `to-merchant` | season counter | DLine, Secondary |
| `patience-qb` | drive sequence | QB |
| `patience-rb` | drive sequence | RB |
| `patience-wr` | drive sequence | WR1, WR2 |
| `feed-the-beast-rb` | drive sequence | RB |
| `feed-the-beast-wr` | drive sequence | WR1, WR2 |
| `dual-threat-qb` | UI mechanic | QB |
| `dual-threat-rb` | UI mechanic | RB |

---

## Task 1: Register all ability IDs + implement Warming Up and Elevate

**Files:**
- Modify: `src/logic/abilityEngine.ts`
- Modify: `src/logic/abilityGen.ts`
- Modify: `src/logic/gameConstants.ts`
- Test: `src/logic/abilityEngine.test.ts`

**Interfaces:**
- Produces: All 14 ability IDs registered and visible to the shop/roster system; `warming-up` and `elevate` return correct bonuses from `computeRollBonus`/`computePostRollBonus`.

- [ ] **Step 1: Write failing tests for Warming Up and Elevate**

In `src/logic/abilityEngine.test.ts`, add to the existing test file (keep all existing tests):

```typescript
describe('warming-up', () => {
  const baseCtx: AbilityContext = {
    quarter: 1, driveIndex: 0, possession: 'user', playerSide: 'offense',
    playerTeamIsLosing: false, isLastTeamDrive: false, driveProgress: 50,
    rzYard: 80, down: 1, playCall: 'run', weather: 'Clear',
    ownPlayHistory: [], oppPlayHistory: [], ownRunsThisDrive: 0,
    wrYacActive: false, olineRoll: null, opponentWRRating: undefined,
    allOffRolls: [], allDefRolls: [],
    downHistory: [], feedTheBeastBonus: 0, abilityCounter: 0,
  }
  it('returns -3 in quarter 1', () => {
    expect(computeRollBonus('warming-up', 8, { ...baseCtx, quarter: 1 })).toBe(-3)
  })
  it('returns -3 in quarter 2', () => {
    expect(computeRollBonus('warming-up', 8, { ...baseCtx, quarter: 2 })).toBe(-3)
  })
  it('returns +10 in quarter 3', () => {
    expect(computeRollBonus('warming-up', 8, { ...baseCtx, quarter: 3 })).toBe(10)
  })
  it('returns +10 in quarter 4', () => {
    expect(computeRollBonus('warming-up', 8, { ...baseCtx, quarter: 4 })).toBe(10)
  })
})

describe('elevate', () => {
  const baseCtx: AbilityContext = {
    quarter: 2, driveIndex: 2, possession: 'user', playerSide: 'offense',
    playerTeamIsLosing: false, isLastTeamDrive: false, driveProgress: 40,
    rzYard: 80, down: 2, playCall: 'pass', weather: 'Clear',
    ownPlayHistory: [], oppPlayHistory: [], ownRunsThisDrive: 0,
    wrYacActive: false, olineRoll: null, opponentWRRating: undefined,
    allOffRolls: [], allDefRolls: [],
    downHistory: [], feedTheBeastBonus: 0, abilityCounter: 0,
  }
  it('returns 0 when no opponent rolled 15+', () => {
    const ctx = { ...baseCtx, playerSide: 'offense' as const, allDefRolls: [10, 12] }
    expect(computePostRollBonus('elevate', ctx)).toBe(0)
  })
  it('returns +5 when an opponent raw roll is exactly 15', () => {
    const ctx = { ...baseCtx, playerSide: 'offense' as const, allDefRolls: [15, 8] }
    expect(computePostRollBonus('elevate', ctx)).toBe(5)
  })
  it('returns +5 when an opponent raw roll exceeds 15', () => {
    const ctx = { ...baseCtx, playerSide: 'defense' as const, allOffRolls: [16], allDefRolls: [] }
    expect(computePostRollBonus('elevate', ctx)).toBe(5)
  })
  it('returns 0 when holding side is offense and no defender rolled 15+', () => {
    const ctx = { ...baseCtx, playerSide: 'offense' as const, allDefRolls: [14] }
    expect(computePostRollBonus('elevate', ctx)).toBe(0)
  })
})
```

- [ ] **Step 2: Run to verify they fail**

```bash
cd /Users/loudimuro/Desktop/claude_projects/football-game && npm test -- --run abilityEngine.test
```

Expected: failures referencing unknown fields (`downHistory`, `feedTheBeastBonus`, `abilityCounter`) and missing cases.

- [ ] **Step 3: Update AbilityContext interface in `src/logic/abilityEngine.ts`**

Add three new fields to the `AbilityContext` interface (after `allDefRolls`):

```typescript
export interface AbilityContext {
  quarter: number
  driveIndex: number
  possession: 'user' | 'opponent'
  playerSide: 'offense' | 'defense'
  playerTeamIsLosing: boolean
  isLastTeamDrive: boolean
  driveProgress: number
  rzYard: number
  down: number
  playCall: 'run' | 'pass'
  weather: WeatherCondition
  ownPlayHistory: ('run' | 'pass')[]
  oppPlayHistory: ('run' | 'pass')[]
  ownRunsThisDrive: number
  wrYacActive: boolean
  olineRoll: number | null
  opponentWRRating: number | undefined
  allOffRolls: (number | null)[]
  allDefRolls: (number | null)[]
  downHistory: { playCall: 'run' | 'pass'; yardsGained: number }[]
  feedTheBeastBonus: number
  abilityCounter: number
}
```

- [ ] **Step 4: Add all 14 ability IDs to `ABILITY_RARITY` in `src/logic/abilityEngine.ts`**

Add these entries to `ABILITY_RARITY` (all Common for now):

```typescript
'warming-up':       'Common',
'elevate':          'Common',
'long-leg':         'Common',
'money-ball':       'Common',
'absorb':           'Common',
'td-merchant':      'Common',
'to-merchant':      'Common',
'patience-qb':      'Common',
'patience-rb':      'Common',
'patience-wr':      'Common',
'feed-the-beast-rb':'Common',
'feed-the-beast-wr':'Common',
'dual-threat-qb':   'Common',
'dual-threat-rb':   'Common',
```

- [ ] **Step 5: Add all 14 IDs to `ABILITY_DESCRIPTIONS` and `ABILITY_DISPLAY` in `src/logic/abilityEngine.ts`**

Add to `ABILITY_DESCRIPTIONS`:
```typescript
'warming-up':        '−3 in the 1st Half; +10 in the 2nd Half',
'elevate':           '+5 if any opponent rolls 15+ (raw die) during the play',
'long-leg':          'FG range extended by 5 yards',
'money-ball':        'FGs scored from the Red Zone are worth 5 points',
'absorb':            '+1 for each time your target value is rolled across the season',
'td-merchant':       '+1 for every offensive TD your team scores in the season',
'to-merchant':       '+1 for every defensive turnover your team forces in the season',
'patience-qb':       '+15 on 4th Down if the first 3 downs of the drive were run plays',
'patience-rb':       '+15 on 4th Down if the first 3 downs of the drive were pass plays',
'patience-wr':       '+10 on 4th Down if the first 3 downs of the drive were run plays',
'feed-the-beast-rb': '+5 (stacking) for each drive where the RB played every down; bonus persists for the game',
'feed-the-beast-wr': '+5 (stacking) for each drive where this WR played every down; bonus persists for the game',
'dual-threat-qb':    'QB can be selected in place of the RB on Run plays',
'dual-threat-rb':    'RB can be selected in place of a WR on Pass plays',
```

Add to `ABILITY_DISPLAY`:
```typescript
'warming-up':        '🔥 Warming Up',
'elevate':           '⬆️ Elevate',
'long-leg':          '🦵 Long Leg',
'money-ball':        '💰 Money Ball',
'absorb':            '🧽 Absorb',
'td-merchant':       '💰 TD Merchant',
'to-merchant':       '💰 TO Merchant',
'patience-qb':       '🧘 Patience',
'patience-rb':       '🧘 Patience',
'patience-wr':       '🧘 Patience',
'feed-the-beast-rb': '👹 Feed the Beast',
'feed-the-beast-wr': '👹 Feed the Beast',
'dual-threat-qb':    '2️⃣ Dual Threat',
'dual-threat-rb':    '2️⃣ Dual Threat',
```

- [ ] **Step 6: Add `isPostRollAbility` entries for `elevate`**

In `abilityEngine.ts`, update `POST_ROLL_ABILITIES`:
```typescript
const POST_ROLL_ABILITIES = new Set(['blessed-evens', 'blessed-odds', 'elevate'])
```

- [ ] **Step 7: Add Warming Up and Elevate to `computeRollBonus` and `computePostRollBonus`**

In `computeRollBonus`, add before `default`:
```typescript
case 'warming-up': return ctx.quarter <= 2 ? -3 : 10
```

In `computePostRollBonus`, add before `default`:
```typescript
case 'elevate': {
  const opponentRolls = ctx.playerSide === 'offense'
    ? ctx.allDefRolls.filter((r): r is number => r !== null)
    : ctx.allOffRolls.filter((r): r is number => r !== null)
  return opponentRolls.some(r => r >= 15) ? 5 : 0
}
```

- [ ] **Step 8: Add stubs for all remaining ability IDs to `computeRollBonus`**

These stubs prevent `default: return 0` from silently swallowing a mismatch. They return 0 now and will be filled in later tasks:
```typescript
case 'absorb':           return ctx.abilityCounter
case 'td-merchant':      return ctx.abilityCounter
case 'to-merchant':      return ctx.abilityCounter
case 'patience-qb':
  return (ctx.down === 4 && ctx.downHistory.length === 3
    && ctx.downHistory.every(e => e.playCall === 'run')) ? 15 : 0
case 'patience-rb':
  return (ctx.down === 4 && ctx.downHistory.length === 3
    && ctx.downHistory.every(e => e.playCall === 'pass')) ? 15 : 0
case 'patience-wr':
  return (ctx.down === 4 && ctx.downHistory.length === 3
    && ctx.downHistory.every(e => e.playCall === 'run')) ? 10 : 0
case 'feed-the-beast-rb':  return ctx.feedTheBeastBonus
case 'feed-the-beast-wr':  return ctx.feedTheBeastBonus
case 'long-leg':           return 0  // handled in GameScreen
case 'money-ball':         return 0  // handled in GameScreen
case 'dual-threat-qb':     return 0  // handled in GameScreen
case 'dual-threat-rb':     return 0  // handled in GameScreen
```

- [ ] **Step 9: Register all 14 IDs in `src/logic/abilityGen.ts`**

Update `POSITION_ABILITY_IDS`:
```typescript
export const POSITION_ABILITY_IDS: Record<string, string[]> = {
  QB:        ['play-action', 'in-rhythm', 'patience-qb', 'td-merchant', 'dual-threat-qb'],
  WR:        ['basketball-player', 'yac', 'td-merchant', 'patience-wr', 'feed-the-beast-wr'],
  RB:        ['workhorse', 'fresh-legs', 'goal-line', 'td-merchant', 'patience-rb', 'feed-the-beast-rb', 'dual-threat-rb'],
  K:         ['long-leg', 'money-ball'],
  OLine:     ['air-raid', 'ground-and-pound', 'psychic'],
  DLine:     ['bull-rush', 'brick-wall', 'stack-the-box', 'psychic', 'bend-dont-break', 'to-merchant'],
  Secondary: ['bend-dont-break', 'on-an-island', 'no-fly-zone', 'psychic', 'to-merchant'],
}
```

Update `ALL_ABILITY_IDS` (general abilities — any position):
```typescript
export const ALL_ABILITY_IDS = [
  'second-half', 'clutch',
  'rain-man', 'snow-man',
  'comeback-kid', 'two-minute-drill',
  'warming-up', 'elevate', 'absorb',
]
```

- [ ] **Step 10: Register all 14 IDs in `ENABLED_ABILITIES` in `src/logic/gameConstants.ts`**

Add after existing entries:
```typescript
  // General (new)
  'warming-up',
  'elevate',
  'absorb',
  // QB (new)
  'patience-qb',
  'td-merchant',
  'dual-threat-qb',
  // RB (new)
  'patience-rb',
  'feed-the-beast-rb',
  'dual-threat-rb',
  // WR (new)
  'patience-wr',
  'feed-the-beast-wr',
  // K (new)
  'long-leg',
  'money-ball',
  // DLine / Secondary (new)
  'to-merchant',
```

- [ ] **Step 11: Patch `buildAbilityContext` in `src/components/game/GameScreen.tsx` to supply new fields**

After the existing return statement fields (before the closing `}`), add:
```typescript
downHistory: state.downHistory,
feedTheBeastBonus: 0,   // overridden per-player in ROLL_PAIR (Task 4)
abilityCounter: 0,      // overridden per-player in ROLL_PAIR (Task 3)
```

- [ ] **Step 12: Run tests**

```bash
cd /Users/loudimuro/Desktop/claude_projects/football-game && npm test -- --run
```

Expected: all tests pass, including the new Warming Up / Elevate tests.

- [ ] **Step 13: Commit**

```bash
git add src/logic/abilityEngine.ts src/logic/abilityGen.ts src/logic/gameConstants.ts src/components/game/GameScreen.tsx src/logic/abilityEngine.test.ts
git commit -m "feat: register 14 new ability IDs; implement warming-up and elevate"
```

---

## Task 2: FG mechanic abilities — Long Leg and Money Ball

**Files:**
- Modify: `src/components/game/GameScreen.tsx`

**Interfaces:**
- Consumes: `long-leg`, `money-ball` IDs already registered (Task 1).
- Produces: `GameState.userFgRangeYard`, `GameState.opponentFgRangeYard`, `GameState.activeFgPoints`; `KICK_FG` action extended; opponent auto-FG uses per-team FG range; `DriveProgressBar` and FG buttons use effective range.

- [ ] **Step 1: Add new GameState fields**

In `GameScreen.tsx`, update the `GameState` interface to add after `fgRangeYard: number`:
```typescript
userFgRangeYard: number
opponentFgRangeYard: number
activeFgPoints: number | null  // overrides fgPoints for the current FG kick; null = use fgPoints
userKickerAbility: string | undefined
opponentKickerAbility: string | undefined
```

- [ ] **Step 2: Update `driveReset()` to clear `activeFgPoints`**

Add to the returned object of `driveReset()`:
```typescript
activeFgPoints: null,
```

- [ ] **Step 3: Update `makeInitialState` to accept and store FG range and kicker abilities**

Change the function signature to accept two new required fields:
```typescript
function makeInitialState({ weather, userTurnoverNumbers, opponentTurnoverNumbers, overrides, userFgRangeYard, opponentFgRangeYard, userKickerAbility, opponentKickerAbility }: {
  weather: WeatherCondition
  userTurnoverNumbers: number[]
  opponentTurnoverNumbers: number[]
  overrides: RuleOverrides
  userFgRangeYard: number
  opponentFgRangeYard: number
  userKickerAbility: string | undefined
  opponentKickerAbility: string | undefined
}): GameState {
  return {
    // ... all existing fields unchanged ...
    fgRangeYard: overrides.fgRangeYard,  // baseline (unchanged)
    userFgRangeYard,
    opponentFgRangeYard,
    activeFgPoints: null,
    userKickerAbility,
    opponentKickerAbility,
    // ... rest unchanged ...
  }
}
```

- [ ] **Step 4: Compute and pass FG range / kicker ability in the `GameScreen` component**

In the `GameScreen` function body, before the `useReducer` call, compute effective ranges:
```typescript
const overrides = activeRule ? getRuleOverrides(activeRule) : getDefaultOverrides()
const baseFgRangeYard = overrides.fgRangeYard
const userFgRangeYard = roster.K?.ability === 'long-leg'
  ? baseFgRangeYard - 5 : baseFgRangeYard
const computedOppRoster = currentOpponentRoster ?? {
  QB: null, WR1: null, WR2: null, RB: null,
  K: null, OLine: null, DLine: null, Secondary: null,
}
const opponentFgRangeYard = computedOppRoster.K?.ability === 'long-leg'
  ? baseFgRangeYard - 5 : baseFgRangeYard
```

Then update the `useReducer` third argument (the initializer object):
```typescript
const [state, dispatch] = useReducer(
  gameReducer,
  {
    weather: currentWeather ?? 'Clear',
    userTurnoverNumbers,
    opponentTurnoverNumbers,
    overrides,
    userFgRangeYard,
    opponentFgRangeYard,
    userKickerAbility: roster.K?.ability,
    opponentKickerAbility: computedOppRoster.K?.ability,
  },
  makeInitialState,
)
```

Remove the now-redundant `activeRule ? getRuleOverrides(activeRule) : getDefaultOverrides()` call that was previously inside the initializer object.

- [ ] **Step 5: Update `KICK_FG` action type to carry effective FG settings**

Replace:
```typescript
| { type: 'KICK_FG' }
```
With:
```typescript
| { type: 'KICK_FG'; effectiveFgRangeYard: number; effectiveFgPoints: number }
```

- [ ] **Step 6: Update the `KICK_FG` reducer case**

```typescript
case 'KICK_FG': {
  return {
    ...state,
    fgDifficulty: computeFGDifficulty(state.driveProgress, action.effectiveFgRangeYard, state.tdYard),
    activeFgPoints: action.effectiveFgPoints,
    phase: 'fg-roll',
  }
}
```

- [ ] **Step 7: Update the `FG_ROLL` reducer case to use `activeFgPoints`**

Find every `state.fgPoints` in the `FG_ROLL` case and replace with `(state.activeFgPoints ?? state.fgPoints)`. There are three occurrences:

```typescript
case 'FG_ROLL': {
  if (state.fgDifficulty === null) return state
  const value = action.value
  // ... existing turnover block (unchanged) ...

  const made = value >= state.fgDifficulty
  const effectivePts = state.activeFgPoints ?? state.fgPoints
  const driveResult = buildDriveResult(
    state,
    made ? 'FG' : 'FG-missed',
    made ? effectivePts : 0,
    { yards: state.currentDriveYards, passYards: state.currentDrivePassYards,
      rushYards: state.currentDriveRushYards, runPlays, passPlays,
      negativePlays: state.currentDriveNegativePlays, fgRoll: value, fgDifficulty: state.fgDifficulty },
  )
  return {
    ...state,
    fgRoll: value,
    driveOutcome: made ? 'FG' : 'FG-missed',
    userScore: (made && state.possession === 'user') ? state.userScore + effectivePts : state.userScore,
    opponentScore: (made && state.possession === 'opponent') ? state.opponentScore + effectivePts : state.opponentScore,
    driveHistory: [...state.driveHistory, driveResult],
    phase: 'fg-result',
  }
}
```

- [ ] **Step 8: Update opponent auto-FG in `RESOLVE_PLAY` to use `opponentFgRangeYard`**

Find the line `if (newProgress >= state.fgRangeYard)` in the opponent auto-FG block (around line 573). Update it:
```typescript
if (newProgress >= state.opponentFgRangeYard) {
  const inRZ = newProgress >= state.rzYard
  const activeFgPoints = (state.opponentKickerAbility === 'money-ball' && inRZ)
    ? 5 : state.fgPoints
  return {
    ...state,
    yardsGained: null,
    driveProgress: newProgress,
    fgDifficulty: computeFGDifficulty(newProgress, state.opponentFgRangeYard, state.tdYard),
    activeFgPoints,
    // ... rest of the existing return fields unchanged ...
  }
}
// Opponent auto-punt:
// existing code: if (newProgress < state.fgRangeYard) → change to (newProgress < state.opponentFgRangeYard)
```

Also find the auto-punt fallthrough and update its condition from `state.fgRangeYard` to `state.opponentFgRangeYard` (there should be an implicit else/fallthrough after the FG block).

- [ ] **Step 9: Update `handleKickFG` in the component**

```typescript
function handleKickFG() {
  const kicker = state.possession === 'user' ? userRoster.K : oppRoster.K
  const activeFgRangeYard = state.possession === 'user' ? state.userFgRangeYard : state.opponentFgRangeYard
  const inRZ = state.driveProgress >= state.rzYard
  const effectiveFgPoints = (kicker?.ability === 'money-ball' && inRZ) ? 5 : state.fgPoints
  dispatch({ type: 'KICK_FG', effectiveFgRangeYard: activeFgRangeYard, effectiveFgPoints })
}
```

- [ ] **Step 10: Update all UI references to `state.fgRangeYard` in JSX**

Compute a derived value in the component body (after the roster declarations):
```typescript
const activeFgRangeYard = state.possession === 'user' ? state.userFgRangeYard : state.opponentFgRangeYard
```

Replace every occurrence of `state.fgRangeYard` in the JSX (DriveProgressBar prop, button visibility checks, button label computations) with `activeFgRangeYard`. There are approximately 6 occurrences in the JSX section.

The `GameHUD` receives `fgRangeYard={activeFgRangeYard}` and the `DriveProgressBar` will already receive it via `GameHUD`.

- [ ] **Step 11: Run tests**

```bash
cd /Users/loudimuro/Desktop/claude_projects/football-game && npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 12: Commit**

```bash
git add src/components/game/GameScreen.tsx
git commit -m "feat: long-leg and money-ball — per-team FG range and RZ FG scoring"
```

---

## Task 3: Season-persistent counter abilities — Absorb, TD Merchant, TO Merchant

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/logic/abilityGen.ts`
- Modify: `src/logic/rosterGen.ts`
- Modify: `src/store/gameStore.ts`
- Modify: `src/components/game/GameScreen.tsx`
- Modify: `src/store/gameStore.test.ts`

**Interfaces:**
- Consumes: `absorb`, `td-merchant`, `to-merchant` stubs in abilityEngine (Task 1).
- Produces: `Player.abilityCounter`, `Player.abilityTarget`, `TeamUnit.abilityCounter`, `TeamUnit.abilityTarget`; `generateAbsorbTarget()`; `allGameRolls: number[]` in `GameState`; `recordGameResult` updates player counters.

- [ ] **Step 1: Add `abilityCounter` and `abilityTarget` to `Player` and `TeamUnit` types**

In `src/types/index.ts`, update both interfaces:
```typescript
export interface Player {
  // ... existing fields unchanged ...
  ability?: string
  abilityCounter?: number   // season-accumulated bonus for counter abilities
  abilityTarget?: number    // random die value to track (Absorb only)
}

export interface TeamUnit {
  // ... existing fields unchanged ...
  ability?: string
  abilityCounter?: number
  abilityTarget?: number
}
```

- [ ] **Step 2: Export `generateAbsorbTarget` from `src/logic/abilityGen.ts`**

Add this function to `abilityGen.ts`:
```typescript
/** Returns a random die value (1–12) to track for the Absorb ability. */
export function generateAbsorbTarget(): number {
  return Math.floor(Math.random() * 12) + 1
}
```

- [ ] **Step 3: Patch `generateRandomSlot` in `src/logic/rosterGen.ts` to set `abilityTarget` when `absorb` is assigned**

In `rosterGen.ts`, import `generateAbsorbTarget`:
```typescript
import { assignAbility, forceAssignAbility, generateAbsorbTarget } from './abilityGen'
```

Add a helper at the top of the file:
```typescript
function withAbsorbTarget(player: Player | TeamUnit): Player | TeamUnit {
  if (player.ability === 'absorb') {
    return { ...player, abilityTarget: generateAbsorbTarget() }
  }
  return player
}
```

In `generateRandomSlot`, wrap both return paths:
```typescript
// Unit path:
if (match) return withAbsorbTarget({ ...match, die: assignDie(match.rating), ability: assignAbility(match.position as UnitPosition) })

// Player path:
const picked = pickRandom(matches)
return withAbsorbTarget({ ...picked, die: assignDie(picked.rating), ability: assignAbility(picked.position) })
```

In `generateRandomRoster`, in the guaranteed-ability loop:
```typescript
slots[pos] = withAbsorbTarget({ ...base, ability: forceAssignAbility(base.position as IndividualPosition | UnitPosition) })
```

In the practice squad loop (where `assignAbility` is called directly):
```typescript
slot.die = assignDie(slot.rating)
const ab = assignAbility(slot.position as IndividualPosition | UnitPosition)
slot.ability = ab
if (ab === 'absorb') slot.abilityTarget = generateAbsorbTarget()
slots[pos] = slot
```

Also in `generateShopSlot` (the last helper function in rosterGen.ts):
```typescript
return slot ? withAbsorbTarget({ ...slot, die: assignDie(slot.rating), ability: assignAbility(slot.position) } as T) : null
```

- [ ] **Step 4: Patch `buyAbility` in `src/store/gameStore.ts` to set `abilityTarget` for Absorb**

In `gameStore.ts`, import `generateAbsorbTarget`:
```typescript
import { generateAbilityShopOffer, generateAbsorbTarget } from '../logic/abilityGen'
```

Update `buyAbility`:
```typescript
buyAbility: (abilityId, targetPosition) => {
  const { roster, abilityShopOffer, coins } = get()
  if (!abilityShopOffer || !abilityShopOffer.includes(abilityId)) return
  const currentSlot = roster[targetPosition]
  if (!currentSlot) return
  const cost = abilityCost(abilityId)
  if (coins < cost) return
  const updatedSlot = {
    ...currentSlot,
    ability: abilityId,
    abilityTarget: abilityId === 'absorb' ? generateAbsorbTarget() : currentSlot.abilityTarget,
    abilityCounter: undefined,  // reset counter when ability changes
  }
  set({
    roster: { ...roster, [targetPosition]: updatedSlot },
    coins: coins - cost,
    abilityShopComplete: true,
  })
},
```

- [ ] **Step 5: Add `allGameRolls: number[]` to `GameState` in `GameScreen.tsx`**

Add to the `GameState` interface:
```typescript
allGameRolls: number[]
```

Add to `makeInitialState` return:
```typescript
allGameRolls: [],
```

`allGameRolls` is intentionally NOT cleared by `driveReset()` — it accumulates for the whole game.

- [ ] **Step 6: Append to `allGameRolls` in `ROLL_PAIR` and `FG_ROLL` reducer cases**

In the `ROLL_PAIR` case, after computing rolls, add to the state update:
```typescript
allGameRolls: [
  ...state.allGameRolls,
  offValue,
  ...(defValue !== null ? [defValue] : []),
],
```

In the `FG_ROLL` case, add to the state update:
```typescript
allGameRolls: [...state.allGameRolls, action.value],
```

- [ ] **Step 7: Extend `recordGameResult` in `src/store/gameStore.ts` to update player counters**

Update the signature and implementation:
```typescript
recordGameResult: (result: SimulationResult, allGameRolls: number[]) => {
  const { simulationHistory, roster } = get()

  // Count season-relevant events from this game
  const offTDs = result.drives.filter(d => d.possession === 'user' && d.outcome === 'TD').length
  const defTOs = result.drives.filter(
    d => d.possession === 'opponent' && (d.outcome === 'Turnover' || d.outcome === 'DefTD')
  ).length

  // Update ability counters for each roster slot
  const updatedRoster = { ...roster } as typeof roster
  const positions: (keyof typeof roster)[] = ['QB', 'WR1', 'WR2', 'RB', 'K', 'OLine', 'DLine', 'Secondary']
  for (const pos of positions) {
    const slot = roster[pos]
    if (!slot?.ability) continue
    let increment = 0
    if (slot.ability === 'td-merchant' && ['QB', 'WR1', 'WR2', 'RB'].includes(pos)) {
      increment = offTDs
    } else if (slot.ability === 'to-merchant' && ['DLine', 'Secondary'].includes(pos)) {
      increment = defTOs
    } else if (slot.ability === 'absorb' && slot.abilityTarget !== undefined) {
      increment = allGameRolls.filter(r => r === slot.abilityTarget).length
    }
    if (increment > 0) {
      updatedRoster[pos] = { ...slot, abilityCounter: (slot.abilityCounter ?? 0) + increment } as typeof slot
    }
  }

  set({
    roster: updatedRoster,
    simulationResult: result,
    simulationHistory: [...simulationHistory, result],
    phase: 'round-hub',
  })
},
```

Also update the `GameStoreState` interface's `recordGameResult` type signature:
```typescript
recordGameResult: (result: SimulationResult, allGameRolls: number[]) => void
```

- [ ] **Step 8: Update the game-over `useEffect` in `GameScreen.tsx` to pass `allGameRolls`**

```typescript
useEffect(() => {
  if (state.phase === 'game-over') {
    const result = buildSimulationResult(state, opponentLabel)
    recordGameResult(result, state.allGameRolls)
  }
}, [state.phase, state.userScore, state.opponentScore, state.driveHistory, opponentLabel, recordGameResult])
```

- [ ] **Step 9: Inject `abilityCounter` per-player in the `ROLL_PAIR` reducer case**

In `ROLL_PAIR`, when computing the offense roll bonus, after reading `offPlayer`:
```typescript
const offAbilityCounter = offPlayer.abilityCounter ?? 0
const ctx = {
  ...buildAbilityContext('offense', state, newOffRolls, newDefRolls),
  wrYacActive,
  feedTheBeastBonus: 0,     // filled in Task 4
  abilityCounter: offAbilityCounter,
}
```

Similarly for the defense roll bonus (when computing defPlayer bonus):
```typescript
if (defPlayer?.ability && !isPostRollAbility(defPlayer.ability)) {
  const defAbilityCounter = defPlayer.abilityCounter ?? 0
  const defCtx = {
    ...buildAbilityContext('defense', state, newOffRolls, newDefRolls),
    wrYacActive: false,
    feedTheBeastBonus: 0,
    abilityCounter: defAbilityCounter,
  }
  newDefBonuses[defIdx] = computeRollBonus(defPlayer.ability, defValue, defCtx)
}
```

Also update the post-roll bonus computation at the end of `ROLL_PAIR` to inject `abilityCounter` for each player similarly.

- [ ] **Step 10: Write tests in `src/store/gameStore.test.ts`**

```typescript
describe('recordGameResult — ability counter updates', () => {
  const makeResult = (drives: Partial<{ possession: 'user' | 'opponent'; outcome: string }>[]) => ({
    userTeamLabel: 'User', opponentTeamLabel: 'Opp',
    drives: drives.map(d => ({ possession: d.possession ?? 'user', quarter: 1, outcome: d.outcome ?? 'TD', scoringTeam: null, points: 0 })),
    userScore: 0, opponentScore: 0, winner: 'tie' as const,
  })

  it('increments td-merchant counter for user offensive TDs', () => {
    const { result } = renderHook(() => useGameStore())
    act(() => {
      result.current.roster.QB = { ...result.current.roster.QB!, ability: 'td-merchant', abilityCounter: 2 }
    })
    act(() => {
      result.current.recordGameResult(
        makeResult([{ possession: 'user', outcome: 'TD' }, { possession: 'user', outcome: 'TD' }, { possession: 'opponent', outcome: 'TD' }]),
        []
      )
    })
    expect(result.current.roster.QB?.abilityCounter).toBe(4)  // 2 + 2 user TDs
  })

  it('increments to-merchant counter for defensive turnovers', () => {
    const { result } = renderHook(() => useGameStore())
    act(() => {
      result.current.roster.DLine = { ...result.current.roster.DLine!, ability: 'to-merchant', abilityCounter: 0 }
    })
    act(() => {
      result.current.recordGameResult(
        makeResult([{ possession: 'opponent', outcome: 'Turnover' }, { possession: 'opponent', outcome: 'DefTD' }]),
        []
      )
    })
    expect(result.current.roster.DLine?.abilityCounter).toBe(2)
  })

  it('increments absorb counter for matching rolls', () => {
    const { result } = renderHook(() => useGameStore())
    act(() => {
      result.current.roster.QB = { ...result.current.roster.QB!, ability: 'absorb', abilityTarget: 7, abilityCounter: 3 }
    })
    act(() => {
      result.current.recordGameResult(makeResult([]), [7, 7, 5, 7])
    })
    expect(result.current.roster.QB?.abilityCounter).toBe(6)  // 3 + 3 sevens
  })

  it('does not increment counter for non-counter abilities', () => {
    const { result } = renderHook(() => useGameStore())
    act(() => {
      result.current.roster.QB = { ...result.current.roster.QB!, ability: 'clutch', abilityCounter: 5 }
    })
    act(() => {
      result.current.recordGameResult(makeResult([{ possession: 'user', outcome: 'TD' }]), [])
    })
    expect(result.current.roster.QB?.abilityCounter).toBe(5)  // unchanged
  })
})
```

- [ ] **Step 11: Run tests**

```bash
cd /Users/loudimuro/Desktop/claude_projects/football-game && npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 12: Commit**

```bash
git add src/types/index.ts src/logic/abilityGen.ts src/logic/rosterGen.ts src/store/gameStore.ts src/store/gameStore.test.ts src/components/game/GameScreen.tsx
git commit -m "feat: absorb, td-merchant, to-merchant — season-persistent ability counters"
```

---

## Task 4: Drive-sequence abilities — Patience and Feed the Beast

**Files:**
- Modify: `src/components/game/GameScreen.tsx`
- Modify: `src/logic/abilityEngine.test.ts`

**Interfaces:**
- Consumes: `patience-qb/rb/wr` and `feed-the-beast-rb/wr` stubs in abilityEngine (Task 1); `AbilityContext.downHistory` and `AbilityContext.feedTheBeastBonus` fields (Task 1).
- Produces: `GameState.userFeedTheBeast`, `GameState.opponentFeedTheBeast`, `GameState.userDriveWR1Plays`, `GameState.userDriveWR2Plays`, `GameState.opponentDriveWR1Plays`; `feedTheBeastBonus` correctly injected in `ROLL_PAIR`; FTB trigger at each drive-end site.

- [ ] **Step 1: Write tests for Patience**

In `src/logic/abilityEngine.test.ts`:

```typescript
describe('patience abilities', () => {
  const makeCtx = (down: number, downHistory: { playCall: 'run' | 'pass'; yardsGained: number }[]): AbilityContext => ({
    quarter: 2, driveIndex: 2, possession: 'user', playerSide: 'offense',
    playerTeamIsLosing: false, isLastTeamDrive: false, driveProgress: 50,
    rzYard: 80, down, playCall: down === 4 ? 'run' : 'run', weather: 'Clear',
    ownPlayHistory: [], oppPlayHistory: [], ownRunsThisDrive: 0,
    wrYacActive: false, olineRoll: null, opponentWRRating: undefined,
    allOffRolls: [], allDefRolls: [],
    downHistory,
    feedTheBeastBonus: 0, abilityCounter: 0,
  })
  const allRuns = [
    { playCall: 'run' as const, yardsGained: 2 },
    { playCall: 'run' as const, yardsGained: 3 },
    { playCall: 'run' as const, yardsGained: 1 },
  ]
  const allPasses = [
    { playCall: 'pass' as const, yardsGained: 5 },
    { playCall: 'pass' as const, yardsGained: 7 },
    { playCall: 'pass' as const, yardsGained: 3 },
  ]

  it('patience-qb: returns 15 on 4th down when prior 3 downs were all runs', () => {
    expect(computeRollBonus('patience-qb', 8, makeCtx(4, allRuns))).toBe(15)
  })
  it('patience-qb: returns 0 when not on 4th down', () => {
    expect(computeRollBonus('patience-qb', 8, makeCtx(3, allRuns.slice(0, 2)))).toBe(0)
  })
  it('patience-qb: returns 0 when prior downs include a pass', () => {
    const mixed = [allRuns[0], allPasses[0], allRuns[1]]
    expect(computeRollBonus('patience-qb', 8, makeCtx(4, mixed))).toBe(0)
  })
  it('patience-rb: returns 15 on 4th down when prior 3 downs were all passes', () => {
    expect(computeRollBonus('patience-rb', 8, makeCtx(4, allPasses))).toBe(15)
  })
  it('patience-rb: returns 0 when prior downs include a run', () => {
    const mixed = [allPasses[0], allRuns[0], allPasses[1]]
    expect(computeRollBonus('patience-rb', 8, makeCtx(4, mixed))).toBe(0)
  })
  it('patience-wr: returns 10 on 4th down when prior 3 downs were all runs', () => {
    expect(computeRollBonus('patience-wr', 8, makeCtx(4, allRuns))).toBe(10)
  })
  it('patience-wr: returns 0 on 4th down when prior downs were not all runs', () => {
    expect(computeRollBonus('patience-wr', 8, makeCtx(4, allPasses))).toBe(0)
  })
})
```

- [ ] **Step 2: Write tests for Feed the Beast**

```typescript
describe('feed-the-beast', () => {
  const makeCtx = (ftbBonus: number): AbilityContext => ({
    quarter: 2, driveIndex: 4, possession: 'user', playerSide: 'offense',
    playerTeamIsLosing: false, isLastTeamDrive: false, driveProgress: 50,
    rzYard: 80, down: 2, playCall: 'run', weather: 'Clear',
    ownPlayHistory: [], oppPlayHistory: [], ownRunsThisDrive: 3,
    wrYacActive: false, olineRoll: null, opponentWRRating: undefined,
    allOffRolls: [], allDefRolls: [], downHistory: [],
    feedTheBeastBonus: ftbBonus, abilityCounter: 0,
  })
  it('returns 0 when no FTB bonus accumulated', () => {
    expect(computeRollBonus('feed-the-beast-rb', 8, makeCtx(0))).toBe(0)
  })
  it('returns the accumulated bonus (+5 per qualifying drive)', () => {
    expect(computeRollBonus('feed-the-beast-rb', 8, makeCtx(10))).toBe(10)
  })
  it('feed-the-beast-wr returns the same bonus', () => {
    expect(computeRollBonus('feed-the-beast-wr', 8, makeCtx(15))).toBe(15)
  })
})
```

- [ ] **Step 3: Run to verify tests fail (feedTheBeastBonus isn't injected yet)**

```bash
cd /Users/loudimuro/Desktop/claude_projects/football-game && npm test -- --run abilityEngine.test
```

Expected: Patience tests may already pass (stubs are correct from Task 1). FTB tests fail because `feedTheBeastBonus` isn't injected in GameScreen yet.

- [ ] **Step 4: Add FTB fields to `GameState`**

In `GameScreen.tsx`, add to `GameState`:
```typescript
userFeedTheBeast: { RB: number; WR1: number; WR2: number }
opponentFeedTheBeast: { RB: number; WR1: number; WR2: number }
userDriveWR1Plays: number     // pass plays this drive using WR1 (user possession)
userDriveWR2Plays: number     // pass plays this drive using WR2 (user possession)
opponentDriveWR1Plays: number // opponent's WR1 pass plays this drive
```

- [ ] **Step 5: Add FTB fields to `makeInitialState`**

```typescript
userFeedTheBeast: { RB: 0, WR1: 0, WR2: 0 },
opponentFeedTheBeast: { RB: 0, WR1: 0, WR2: 0 },
userDriveWR1Plays: 0,
userDriveWR2Plays: 0,
opponentDriveWR1Plays: 0,
```

- [ ] **Step 6: Add drive-level WR play counters to `driveReset()`**

```typescript
userDriveWR1Plays: 0,
userDriveWR2Plays: 0,
opponentDriveWR1Plays: 0,
```

- [ ] **Step 7: Track WR play counts in `RESOLVE_PLAY`**

In the RESOLVE_PLAY case, after computing `newUserPassPlays` (around line 458), add:

```typescript
const newUserDriveWR1Plays = state.possession === 'user' && state.offensePlayCall === 'pass' && state.selectedWR === 'WR1'
  ? state.userDriveWR1Plays + 1 : state.userDriveWR1Plays
const newUserDriveWR2Plays = state.possession === 'user' && state.offensePlayCall === 'pass' && state.selectedWR === 'WR2'
  ? state.userDriveWR2Plays + 1 : state.userDriveWR2Plays
const newOpponentDriveWR1Plays = state.possession === 'opponent' && state.offensePlayCall === 'pass'
  ? state.opponentDriveWR1Plays + 1 : state.opponentDriveWR1Plays
```

Include these in every state return object in RESOLVE_PLAY that currently propagates `userRunsThisDrive` (TD, Safety, Punt, TurnoverOnDowns, fourth-down-choice, Next down). Also pass them in FOURTH_DOWN_PUNT.

- [ ] **Step 8: Add FTB helper function in GameScreen.tsx**

Add this function near the top of the file (after imports, before the component):

```typescript
function checkFeedTheBeastTrigger(
  totalRuns: number,
  totalPasses: number,
  wr1Plays: number,
  wr2Plays: number,
): { rbTrigger: boolean; wr1Trigger: boolean; wr2Trigger: boolean } {
  const total = totalRuns + totalPasses
  if (total < 4) return { rbTrigger: false, wr1Trigger: false, wr2Trigger: false }
  return {
    rbTrigger: totalPasses === 0,
    wr1Trigger: totalRuns === 0 && wr1Plays === total,
    wr2Trigger: totalRuns === 0 && wr2Plays === total,
  }
}
```

- [ ] **Step 9: Fire FTB check at each user drive-end site in the reducer**

At every place in `RESOLVE_PLAY` and `FOURTH_DOWN_PUNT` where a user drive ends (outcome: TD, Safety, TurnoverOnDowns, fourth-down-choice→Punt, fourth-down-choice→FG), add:

```typescript
// FTB check (before the return)
let newUserFeedTheBeast = state.userFeedTheBeast
if (state.possession === 'user') {
  const { rbTrigger, wr1Trigger, wr2Trigger } = checkFeedTheBeastTrigger(
    newUserRunsThisDrive,      // use the "new" value computed in this case
    newUserPassPlays,          // use the "new" value
    newUserDriveWR1Plays,
    newUserDriveWR2Plays,
  )
  newUserFeedTheBeast = {
    RB:  state.userFeedTheBeast.RB  + (rbTrigger  ? 5 : 0),
    WR1: state.userFeedTheBeast.WR1 + (wr1Trigger ? 5 : 0),
    WR2: state.userFeedTheBeast.WR2 + (wr2Trigger ? 5 : 0),
  }
}
```

For **opponent** drive-ends (same cases but with `state.possession === 'opponent'`), add a similar check updating `opponentFeedTheBeast`.

Include `userFeedTheBeast: newUserFeedTheBeast` (and `opponentFeedTheBeast`) in the return objects.

**IMPORTANT**: In the `FOURTH_DOWN_PUNT` and FG cases, the FTB check uses `state.userRunsThisDrive` (already updated when going to fourth-down-choice) not `newUserRunsThisDrive` (which doesn't exist in those cases).

For `FG_ROLL` drive-end (FG made or missed), add the same FTB check using `state.userRunsThisDrive` / `state.userPassPlaysThisDrive` / `state.userDriveWR1Plays` / `state.userDriveWR2Plays`.

- [ ] **Step 10: Inject `feedTheBeastBonus` per-player in `ROLL_PAIR`**

In the `ROLL_PAIR` case, when computing the offense roll for each player (`offIndex`), compute the FTB bonus before building context:

```typescript
// Look up FTB bonus for this specific player
let offFtbBonus = 0
if (state.possession === 'user') {
  const p = offPlayer
  if (isPlayer(p) && p.ability === 'feed-the-beast-rb' && p.position === 'RB') {
    offFtbBonus = state.userFeedTheBeast.RB
  } else if (isPlayer(p) && p.ability === 'feed-the-beast-wr' && p.position === 'WR') {
    offFtbBonus = state.selectedWR === 'WR1' ? state.userFeedTheBeast.WR1 : state.userFeedTheBeast.WR2
  }
} else {
  // opponent possession
  const p = offPlayer
  if (isPlayer(p) && p.ability === 'feed-the-beast-rb' && p.position === 'RB') {
    offFtbBonus = state.opponentFeedTheBeast.RB
  } else if (isPlayer(p) && p.ability === 'feed-the-beast-wr' && p.position === 'WR') {
    offFtbBonus = state.opponentFeedTheBeast.WR1
  }
}
const ctx = {
  ...buildAbilityContext('offense', state, newOffRolls, newDefRolls),
  wrYacActive,
  feedTheBeastBonus: offFtbBonus,
  abilityCounter: offPlayer.abilityCounter ?? 0,
}
```

Similarly for each defense player.

- [ ] **Step 11: Run all tests**

```bash
cd /Users/loudimuro/Desktop/claude_projects/football-game && npm test -- --run
```

Expected: all tests pass including Patience and FTB tests.

- [ ] **Step 12: Commit**

```bash
git add src/components/game/GameScreen.tsx src/logic/abilityEngine.test.ts
git commit -m "feat: patience and feed-the-beast — drive-sequence ability bonuses"
```

---

## Task 5: Dual Threat — QB and RB

**Files:**
- Modify: `src/components/game/GameScreen.tsx`

**Interfaces:**
- Consumes: `dual-threat-qb`, `dual-threat-rb` IDs registered (Task 1).
- Produces: `'choose-runner'` phase; extended `selectedWR` type; `SHOW_RUNNER_CHOICE` and `CHOOSE_RUNNER` actions; QB and RB receiver choice UI in GameScreen JSX.

Note: `dual-threat-qb` and `dual-threat-rb` return 0 from `computeRollBonus` — all their effect is in which `offPlayers` are passed to the play, which changes which die is rolled.

- [ ] **Step 1: Extend `PlayPhase` union type**

In `GameScreen.tsx`, add `'choose-runner'` to the `PlayPhase` type:
```typescript
type PlayPhase =
  | 'choose-offense'
  | 'choose-wr'
  | 'choose-runner'    // new: QB Dual Threat — pick QB or RB for run play
  | 'choose-defense'
  | 'rolling-pairs'
  | 'show-play-result'
  | 'drive-end'
  | 'fourth-down-choice'
  | 'fg-roll'
  | 'fg-result'
  | 'turnover'
  | 'game-over'
```

- [ ] **Step 2: Extend `selectedWR` type to include `'RB'`**

Find the `selectedWR` field in `GameState`:
```typescript
selectedWR: 'WR1' | 'WR2' | null
```
Change to:
```typescript
selectedWR: 'WR1' | 'WR2' | 'RB' | null
```

Find the `CHOOSE_WR` action type and update its `wr` field:
```typescript
| { type: 'CHOOSE_WR'; wr: 'WR1' | 'WR2' | 'RB'; opponentDefCall: 'run-stop' | 'pass-stop'; offPlayers: (Player | TeamUnit)[] }
```

- [ ] **Step 3: Add `SHOW_RUNNER_CHOICE` and `CHOOSE_RUNNER` action types**

```typescript
| { type: 'SHOW_RUNNER_CHOICE' }
| { type: 'CHOOSE_RUNNER'; runner: 'QB' | 'RB'; opponentDefCall: 'run-stop' | 'pass-stop'; offPlayers: (Player | TeamUnit)[]; defPlayers: (Player | TeamUnit)[] }
```

- [ ] **Step 4: Add `SHOW_RUNNER_CHOICE` and `CHOOSE_RUNNER` reducer cases**

```typescript
case 'SHOW_RUNNER_CHOICE': {
  return { ...state, phase: 'choose-runner' }
}

case 'CHOOSE_RUNNER': {
  const { runner, opponentDefCall, offPlayers, defPlayers } = action
  return {
    ...state,
    offensePlayCall: 'run',
    defensePlayCall: opponentDefCall,
    offPlayers,
    defPlayers,
    offRolls: new Array(offPlayers.length).fill(null),
    defRolls: new Array(defPlayers.length).fill(null),
    offBonuses: new Array(offPlayers.length).fill(null),
    defBonuses: new Array(defPlayers.length).fill(null),
    phase: 'rolling-pairs',
  }
}
```

- [ ] **Step 5: Update `handleOffPlay` to check for QB Dual Threat**

```typescript
function handleOffPlay(call: 'run' | 'pass') {
  if (call === 'run' && userRoster.QB?.ability === 'dual-threat-qb') {
    dispatch({ type: 'SHOW_RUNNER_CHOICE' })
    return
  }
  if (call === 'pass') {
    const defPlayers = getDefensePlayers(oppRoster, 'pass')
    dispatch({ type: 'CHOOSE_OFF_PLAY', call: 'pass', offPlayers: [], defPlayers })
  } else {
    const opponentDefCall = randomDefCall()
    const offPlayers = getOffensePlayers(userRoster, 'run', 'WR1')
    const defPlayers = getDefensePlayers(oppRoster, 'run')
    dispatch({ type: 'CHOOSE_OFF_PLAY', call: 'run', opponentDefCall, offPlayers, defPlayers })
  }
}
```

- [ ] **Step 6: Add `handleRunnerChoice` function**

```typescript
function handleRunnerChoice(runner: 'QB' | 'RB') {
  const opponentDefCall = randomDefCall()
  const offPlayers: (Player | TeamUnit)[] = runner === 'QB'
    ? [userRoster.QB, userRoster.OLine].filter(Boolean) as (Player | TeamUnit)[]
    : getOffensePlayers(userRoster, 'run', 'WR1')
  const defPlayers = getDefensePlayers(oppRoster, 'run')
  dispatch({ type: 'CHOOSE_RUNNER', runner, opponentDefCall, offPlayers, defPlayers })
}
```

- [ ] **Step 7: Update `handleWRChoice` to accept RB as receiver**

Rename the function to `handleReceiverChoice` and update its signature:
```typescript
function handleReceiverChoice(slot: 'WR1' | 'WR2' | 'RB') {
  const opponentDefCall = randomDefCall()
  if (slot === 'RB') {
    // RB acts as receiver — [QB, OLine, RB]
    const offPlayers = [userRoster.QB, userRoster.OLine, userRoster.RB].filter(Boolean) as (Player | TeamUnit)[]
    dispatch({ type: 'CHOOSE_WR', wr: 'RB', opponentDefCall, offPlayers })
  } else {
    const offPlayers = getOffensePlayers(userRoster, 'pass', slot)
    dispatch({ type: 'CHOOSE_WR', wr: slot, opponentDefCall, offPlayers })
  }
}
```

Update all existing call sites of `handleWRChoice` to `handleReceiverChoice`.

- [ ] **Step 8: Add `choose-runner` UI in the JSX**

Add this block alongside the other `state.phase === '...'` blocks in the `<div className="flex-1 overflow-y-auto">` section:

```tsx
{state.phase === 'choose-runner' && (
  <div className="flex flex-col items-center gap-4 py-8">
    <p className="text-xs text-gray-500 uppercase tracking-wider">Choose your runner</p>
    <div className="grid grid-cols-2 gap-4 w-full max-w-lg px-6">
      {([
        { slot: 'QB' as const, player: userRoster.QB },
        { slot: 'RB' as const, player: userRoster.RB },
      ]).map(({ slot, player }) => (
        <button
          key={slot}
          onClick={() => handleRunnerChoice(slot)}
          className="text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-xl"
        >
          {player ? (
            <PlayerRollCard player={player} roll={null} isNext={false} />
          ) : (
            <div className="border-2 border-dashed border-gray-700 rounded-xl p-6 text-center text-gray-500 text-sm">
              {slot} — Empty
            </div>
          )}
        </button>
      ))}
    </div>
    <button
      onClick={() => dispatch({ type: 'BACK_TO_PLAY_CHOICE' })}
      className="text-xs text-gray-500 hover:text-gray-300 transition-colors mt-1"
    >
      ← Back
    </button>
  </div>
)}
```

- [ ] **Step 9: Add RB option to `choose-wr` UI when RB has Dual Threat**

In the existing `{state.phase === 'choose-wr' && ...}` block, change the `(['WR1', 'WR2'] as const).map(...)` to:

```tsx
{state.phase === 'choose-wr' && (
  <div className="flex flex-col items-center gap-4 py-8">
    <p className="text-xs text-gray-500 uppercase tracking-wider">Choose your receiver</p>
    <div className="grid grid-cols-2 gap-4 w-full max-w-lg px-6">
      {(['WR1', 'WR2'] as const).map(slot => {
        const wr = userRoster[slot]
        return (
          <button
            key={slot}
            onClick={() => handleReceiverChoice(slot)}
            className="text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-xl"
          >
            {wr ? (
              <PlayerRollCard player={wr} roll={null} isNext={false} />
            ) : (
              <div className="border-2 border-dashed border-gray-700 rounded-xl p-6 text-center text-gray-500 text-sm">
                {slot} — Empty
              </div>
            )}
          </button>
        )
      })}
      {userRoster.RB?.ability === 'dual-threat-rb' && (
        <button
          onClick={() => handleReceiverChoice('RB')}
          className="text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-xl"
        >
          <PlayerRollCard player={userRoster.RB} roll={null} isNext={false} />
        </button>
      )}
    </div>
    <button
      onClick={() => dispatch({ type: 'BACK_TO_PLAY_CHOICE' })}
      className="text-xs text-gray-500 hover:text-gray-300 transition-colors mt-1"
    >
      ← Back
    </button>
  </div>
)}
```

- [ ] **Step 10: Update `showStep` condition to include `'choose-runner'` in non-step phases**

Find the `showStep` line and ensure `'choose-runner'` is listed alongside the other non-step phases where the step button is NOT shown. Currently:
```typescript
const showStep = ['rolling-pairs', 'show-play-result', ...].includes(state.phase) || ...
```
The `'choose-runner'` phase should NOT trigger step — it's a choice panel. No change needed since it's not in the step-triggering set.

- [ ] **Step 11: Update `BACK_TO_PLAY_CHOICE` case to handle `choose-runner`**

Find the `BACK_TO_PLAY_CHOICE` reducer case and verify it resets phase to `'choose-offense'` correctly (it should already, since it just sets `phase: 'choose-offense'`). If it only applies to WR choice, ensure it also works from `choose-runner`.

The existing case should be:
```typescript
case 'BACK_TO_PLAY_CHOICE': {
  return { ...state, ...playReset(), phase: 'choose-offense' }
}
```
This works for both `choose-wr` and `choose-runner`. No change needed.

- [ ] **Step 12: Run all tests**

```bash
cd /Users/loudimuro/Desktop/claude_projects/football-game && npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 13: Commit**

```bash
git add src/components/game/GameScreen.tsx
git commit -m "feat: dual-threat-qb and dual-threat-rb — alternate runner/receiver selection"
```

---

## Self-Review

**Spec coverage check:**

| Ability | Task |
|---|---|
| 🧽 Absorb | Task 3 |
| 🔥 Warming Up | Task 1 |
| ⬆️ Elevate | Task 1 |
| 🧘 Patience (QB) | Task 1 (logic) + Task 4 (injection) |
| 💰 TD Merchant (QB/RB/WR) | Task 3 |
| 2️⃣ Dual Threat QB | Task 5 |
| 💰 TD Merchant (RB) | Task 3 |
| 🧘 Patience RB | Task 1 + 4 |
| 👹 Feed the Beast RB | Task 1 + 4 |
| 2️⃣ Dual Threat RB | Task 5 |
| 💰 TD Merchant WR | Task 3 |
| 🧘 Patience WR | Task 1 + 4 |
| 👹 Feed the Beast WR | Task 1 + 4 |
| 💰 TO Merchant | Task 3 |
| 🦵 Long Leg | Task 2 |
| 💰 Money Ball | Task 2 |

All 16 abilities covered. ✓

**Placeholder scan:** No TBDs found. All code blocks are complete.

**Type consistency check:**
- `AbilityContext.downHistory`, `feedTheBeastBonus`, `abilityCounter` defined in Task 1 and used consistently in Tasks 3/4.
- `GameState.userFeedTheBeast` shape `{ RB: number; WR1: number; WR2: number }` consistent across Task 4.
- `selectedWR: 'WR1' | 'WR2' | 'RB' | null` updated in Task 5; `CHOOSE_WR` action `wr` field updated to match.
- `recordGameResult(result, gameRolls)` signature updated in both the store interface and the call site.
