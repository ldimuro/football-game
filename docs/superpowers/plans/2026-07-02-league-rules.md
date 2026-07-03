# League Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Randomly assign one of 10 League Rules at run start; the rule alters game constants and/or behaviors (FG range, TD/FG points, field length, down count, turnover numbers, punting, weather) for the entire season.

**Architecture:** New `leagueRules.ts` defines the 10 rules and derives a `RuleOverrides` object per rule. The active rule is stored in Zustand. `GameState` holds the overrides as flat fields (e.g., `state.tdPoints`, `state.fgRangeYard`); the reducer reads from state rather than imported constants. Turnover numbers migrate from `number` to `number[]` arrays to support the dual-number rule.

**Tech Stack:** React 18, TypeScript, Zustand, Vitest, Tailwind CSS

## Global Constraints

- All new TypeScript must pass `npx tsc --noEmit` with zero errors.
- All 235 existing tests must stay green after every task.
- Do not import constants from `gameConstants.ts` in the reducer where a `state.*` field now exists; use the state field instead.
- Commit after every task.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/logic/leagueRules.ts` | CREATE | Rule definitions, RuleOverrides type, getRuleOverrides, getRandomRule |
| `src/logic/leagueRules.test.ts` | CREATE | Unit tests for all 10 rules + getRandomRule |
| `src/store/gameStore.ts` | MODIFY | Add activeRule, rename TO# fields to arrays, Ice Age weather |
| `src/logic/gameEngine.ts` | MODIFY | computeFGDifficulty gains optional fgRangeYard param |
| `src/logic/gameEngine.test.ts` | MODIFY | Add test for computeFGDifficulty with custom fgRangeYard |
| `src/components/game/GameScreen.tsx` | MODIFY | GameState overrides; reducer constant substitutions; 5th down; no punting; pick-2; dual TO# |
| `src/components/game/GameHUD.tsx` | MODIFY | Props: TO# arrays + activeRule; display: joined numbers + rule chip |
| `src/components/round/MatchupSummary.tsx` | MODIFY | Props: userTurnoverNumbers/opponentTurnoverNumbers arrays |
| `src/components/round/RoundHub.tsx` | MODIFY | Destructure arrays + activeRule; pass to MatchupSummary; show rule chip |
| `src/components/screens/SetupScreen.tsx` | MODIFY | Read activeRule from store; show rule banner above roster |

---

## Task 1: `src/logic/leagueRules.ts` + tests (TDD)

**Files:**
- Create: `src/logic/leagueRules.ts`
- Create: `src/logic/leagueRules.test.ts`

**Interfaces — Produces:**
```typescript
export interface LeagueRule {
  id: string
  emoji: string
  name: string
  description: string
}

export interface RuleOverrides {
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

export declare const LEAGUE_RULES: LeagueRule[]
export declare function getDefaultOverrides(): RuleOverrides
export declare function getRuleOverrides(rule: LeagueRule): RuleOverrides
export declare function getRandomRule(): LeagueRule
```

- [ ] **Step 1: Write the failing tests**

Create `src/logic/leagueRules.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { LEAGUE_RULES, getDefaultOverrides, getRuleOverrides, getRandomRule } from './leagueRules'

describe('getDefaultOverrides', () => {
  it('returns all baseline values', () => {
    expect(getDefaultOverrides()).toEqual({
      tdPoints: 7, fgPoints: 3, tdYard: 100, fgRangeYard: 60,
      maxDowns: 4, noPuntingRule: false, pick2Rule: false,
      iceAge: false, dualTurnoverNumbers: false,
    })
  })
})

describe('getRuleOverrides', () => {
  function rule(id: string) {
    return LEAGUE_RULES.find(r => r.id === id)!
  }

  it('rz-starts-at-35: fgRangeYard=35, others unchanged', () => {
    const o = getRuleOverrides(rule('rz-starts-at-35'))
    expect(o.fgRangeYard).toBe(35)
    expect(o.tdPoints).toBe(7)
    expect(o.fgPoints).toBe(3)
  })
  it('field-125: tdYard=125', () => {
    expect(getRuleOverrides(rule('field-125')).tdYard).toBe(125)
  })
  it('altitude: fgRangeYard=50', () => {
    expect(getRuleOverrides(rule('altitude')).fgRangeYard).toBe(50)
  })
  it('kickers-people: fgPoints=6', () => {
    expect(getRuleOverrides(rule('kickers-people')).fgPoints).toBe(6)
  })
  it('no-punting: noPuntingRule=true', () => {
    expect(getRuleOverrides(rule('no-punting')).noPuntingRule).toBe(true)
  })
  it('fifth-down: maxDowns=5', () => {
    expect(getRuleOverrides(rule('fifth-down')).maxDowns).toBe(5)
  })
  it('ice-age: iceAge=true', () => {
    expect(getRuleOverrides(rule('ice-age')).iceAge).toBe(true)
  })
  it('defense-wins: dualTurnoverNumbers=true', () => {
    expect(getRuleOverrides(rule('defense-wins')).dualTurnoverNumbers).toBe(true)
  })
  it('pick-2: pick2Rule=true', () => {
    expect(getRuleOverrides(rule('pick-2')).pick2Rule).toBe(true)
  })
  it('parallel-universe: tdPoints=3 fgPoints=7', () => {
    const o = getRuleOverrides(rule('parallel-universe'))
    expect(o.tdPoints).toBe(3)
    expect(o.fgPoints).toBe(7)
  })
})

describe('getRandomRule', () => {
  it('always returns a rule from LEAGUE_RULES', () => {
    const ids = new Set(LEAGUE_RULES.map(r => r.id))
    for (let i = 0; i < 50; i++) {
      expect(ids.has(getRandomRule().id)).toBe(true)
    }
  })
  it('LEAGUE_RULES has exactly 10 entries', () => {
    expect(LEAGUE_RULES).toHaveLength(10)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/logic/leagueRules.test.ts 2>&1 | tail -10
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/logic/leagueRules.ts`**

```typescript
export interface LeagueRule {
  id: string
  emoji: string
  name: string
  description: string
}

export interface RuleOverrides {
  tdPoints: number
  fgPoints: number
  tdYard: number
  fgRangeYard: number
  maxDowns: number
  noPuntingRule: boolean
  pick2Rule: boolean
  iceAge: boolean
  dualTurnoverNumbers: boolean
}

export const LEAGUE_RULES: LeagueRule[] = [
  { id: 'rz-starts-at-35',    emoji: '🔴', name: 'RZ Starts at 35',               description: 'FG range begins at the 35 yd line — kickers can attempt from much further back.' },
  { id: 'field-125',          emoji: '🌎', name: 'Field becomes 125 yards',        description: 'The field extends to 125 yards. Drives need 105 yards to score a TD.' },
  { id: 'altitude',           emoji: '🏔️', name: 'Altitude',                       description: 'Thin air extends FG range to the 50 yd line.' },
  { id: 'kickers-people',     emoji: '🦶', name: 'Kickers are People, Too',        description: 'Field goals are worth 6 points.' },
  { id: 'no-punting',         emoji: '❌', name: 'No Punting',                     description: 'Failed 4th downs turn the ball over at the spot instead of punting to the 20.' },
  { id: 'fifth-down',         emoji: '5️⃣', name: '5th Down',                       description: 'The offense gets a 5th down per drive.' },
  { id: 'ice-age',            emoji: '❄️', name: 'Ice Age',                        description: 'Every game this season is played in the snow.' },
  { id: 'defense-wins',       emoji: '🛡️', name: 'Defense Wins Championships',    description: 'Each team starts with 2 Turnover Numbers — rolling either triggers a turnover.' },
  { id: 'pick-2',             emoji: '🏈', name: 'Pick-2',                         description: 'Turnovers score 2 points for the defending team.' },
  { id: 'parallel-universe',  emoji: '🪐', name: 'Parallel Universe',              description: 'FGs are worth 7 points and TDs are worth 3 points.' },
]

export function getDefaultOverrides(): RuleOverrides {
  return {
    tdPoints: 7,
    fgPoints: 3,
    tdYard: 100,
    fgRangeYard: 60,
    maxDowns: 4,
    noPuntingRule: false,
    pick2Rule: false,
    iceAge: false,
    dualTurnoverNumbers: false,
  }
}

export function getRuleOverrides(rule: LeagueRule): RuleOverrides {
  const d = getDefaultOverrides()
  switch (rule.id) {
    case 'rz-starts-at-35':   return { ...d, fgRangeYard: 35 }
    case 'field-125':         return { ...d, tdYard: 125 }
    case 'altitude':          return { ...d, fgRangeYard: 50 }
    case 'kickers-people':    return { ...d, fgPoints: 6 }
    case 'no-punting':        return { ...d, noPuntingRule: true }
    case 'fifth-down':        return { ...d, maxDowns: 5 }
    case 'ice-age':           return { ...d, iceAge: true }
    case 'defense-wins':      return { ...d, dualTurnoverNumbers: true }
    case 'pick-2':            return { ...d, pick2Rule: true }
    case 'parallel-universe': return { ...d, tdPoints: 3, fgPoints: 7 }
    default:                  return d
  }
}

export function getRandomRule(): LeagueRule {
  return LEAGUE_RULES[Math.floor(Math.random() * LEAGUE_RULES.length)]
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run src/logic/leagueRules.test.ts 2>&1 | tail -6
```

Expected: 13 tests PASS.

- [ ] **Step 5: Run full suite to confirm nothing broke**

```bash
npx vitest run 2>&1 | tail -5
```

Expected: all tests pass (+ 13 new).

- [ ] **Step 6: Commit**

```bash
git add src/logic/leagueRules.ts src/logic/leagueRules.test.ts
git commit -m "feat: add leagueRules module with 10 rules and RuleOverrides"
```

---

## Task 2: `src/store/gameStore.ts` — activeRule, TO# arrays, Ice Age

**Files:**
- Modify: `src/store/gameStore.ts`

**Interfaces — Consumes:**
- `LeagueRule`, `RuleOverrides`, `getRandomRule`, `getRuleOverrides`, `getDefaultOverrides` from `../logic/leagueRules`

**Interfaces — Produces (changes to GameStore):**
```typescript
// replaces userTurnoverNumber: number and opponentTurnoverNumber: number
activeRule: LeagueRule | null
userTurnoverNumbers: number[]
opponentTurnoverNumbers: number[]
```

- [ ] **Step 1: Add imports at the top of `src/store/gameStore.ts`**

Add after the existing imports:

```typescript
import { getRandomRule, getRuleOverrides, getDefaultOverrides } from '../logic/leagueRules'
import type { LeagueRule } from '../logic/leagueRules'
```

- [ ] **Step 2: Update the `GameStore` interface**

Replace:
```typescript
  userTurnoverNumber: number
  opponentTurnoverNumber: number
```
With:
```typescript
  activeRule: LeagueRule | null
  userTurnoverNumbers: number[]
  opponentTurnoverNumbers: number[]
```

- [ ] **Step 3: Add a `generateTurnoverNumbers` helper and update `buildNextRoundData`**

Add this helper function above `buildNextRoundData`:

```typescript
function generateTurnoverNumbers(dual: boolean): number[] {
  const first = Math.ceil(Math.random() * 20)
  if (!dual) return [first]
  let second = Math.ceil(Math.random() * 20)
  while (second === first) second = Math.ceil(Math.random() * 20)
  return [first, second]
}
```

Replace the existing `buildNextRoundData` function:

```typescript
async function buildNextRoundData(remainingCoins: number, activeRule: LeagueRule | null = null) {
  const [{ stats: opponent, roster: opponentRoster }, draftOffer, shopOffer] = await Promise.all([
    generateOpponent(),
    generateDraftOffer(),
    generateShopOffer(remainingCoins),
  ])
  const weather = activeRule?.id === 'ice-age' ? 'Snow' as const : generateWeather()
  return { opponent, opponentRoster, draftOffer, weather, shopOffer }
}
```

- [ ] **Step 4: Update store defaults**

Replace:
```typescript
  userTurnoverNumber: 0,
  opponentTurnoverNumber: 0,
```
With:
```typescript
  activeRule: null,
  userTurnoverNumbers: [],
  opponentTurnoverNumbers: [],
```

- [ ] **Step 5: Update `initGame`**

Replace the existing `initGame` action:

```typescript
  initGame: async () => {
    set({ isLoading: true })
    const roster = await generateRandomRoster()
    const coins = coinsForRoster(roster)
    const activeRule = getRandomRule()
    const { dualTurnoverNumbers } = getRuleOverrides(activeRule)
    set({
      roster, phase: 'setup', round: 1, setupRerollsRemaining: 3, seasonLog: [],
      coins, shopOffer: null, shopComplete: false, pendingShopBoughtId: null, isLoading: false,
      activeRule,
      userTurnoverNumbers: generateTurnoverNumbers(dualTurnoverNumbers),
    })
  },
```

- [ ] **Step 6: Update `confirmSetup`**

Replace the existing `confirmSetup` action:

```typescript
  confirmSetup: async () => {
    set({ isLoading: true })
    const { roster, activeRule } = get()
    const coins = coinsForRoster(roster)
    const { dualTurnoverNumbers } = activeRule ? getRuleOverrides(activeRule) : getDefaultOverrides()
    const { opponent, opponentRoster, draftOffer, weather, shopOffer } = await buildNextRoundData(coins, activeRule)
    set({
      phase: 'round-hub',
      coins,
      shopOffer,
      shopComplete: false,
      currentOpponent: opponent,
      currentOpponentRoster: opponentRoster,
      currentWeather: weather,
      currentDraftOffer: draftOffer,
      draftRerollAvailable: true,
      opponentTurnoverNumbers: generateTurnoverNumbers(dualTurnoverNumbers),
      isLoading: false,
    })
  },
```

- [ ] **Step 7: Update `advanceRound`**

In `advanceRound`, find the two locations where `opponentTurnoverNumber` is set and update them:

In the early-return branch (round >= 17), no TO# is set — leave as-is.

In the main `set(...)` call after `buildNextRoundData`, replace:
```typescript
      opponentTurnoverNumber: Math.ceil(Math.random() * 20),
```
With:
```typescript
      opponentTurnoverNumbers: generateTurnoverNumbers(
        activeRule ? getRuleOverrides(activeRule).dualTurnoverNumbers : false
      ),
```

Also add `activeRule` to the destructured variables at the top of `advanceRound`:
```typescript
    const {
      round, seasonLog, currentOpponent, currentWeather,
      pendingDraftedId, simulationResult, pendingShopBoughtId, coins, activeRule,
    } = get()
```

And update the `buildNextRoundData` call to pass `activeRule`:
```typescript
    const { opponent, opponentRoster, draftOffer, weather, shopOffer } = await buildNextRoundData(coins, activeRule)
```

- [ ] **Step 8: TypeScript check**

```bash
npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 9: Run full test suite**

```bash
npx vitest run 2>&1 | tail -5
```

Expected: all tests pass.

- [ ] **Step 10: Commit**

```bash
git add src/store/gameStore.ts
git commit -m "feat: add activeRule and dual turnover number arrays to game store"
```

---

## Task 3: `src/logic/gameEngine.ts` — computeFGDifficulty fgRangeYard param

**Files:**
- Modify: `src/logic/gameEngine.ts`
- Modify: `src/logic/gameEngine.test.ts`

**Interfaces — Produces:**
```typescript
export function computeFGDifficulty(progress: number, fgRangeYard?: number): number
// default fgRangeYard = FG_RANGE_YARD (60)
// FG difficulty scales linearly from MAX at fgRangeYard to MIN at 99
```

- [ ] **Step 1: Add the new test to `src/logic/gameEngine.test.ts`**

Inside the existing `describe('computeFGDifficulty', ...)` block, add after the last test:

```typescript
  it('scales correctly when fgRangeYard=50 (Altitude rule)', () => {
    // At fgRangeYard=50: difficulty = 15 (MAX)
    expect(computeFGDifficulty(50, 50)).toBe(15)
  })
  it('returns MIN when fgRangeYard=35 and progress=99', () => {
    expect(computeFGDifficulty(99, 35)).toBe(1)
  })
```

- [ ] **Step 2: Run the new tests to confirm they fail**

```bash
npx vitest run src/logic/gameEngine.test.ts 2>&1 | tail -6
```

Expected: 2 new tests FAIL (function does not accept second argument yet).

- [ ] **Step 3: Update `computeFGDifficulty` in `src/logic/gameEngine.ts`**

First, remove `FG_DIFFICULTY_YARD_RANGE` from the import at the top of `gameEngine.ts` — the local `yardRange` variable replaces it:

```typescript
// before
import { FG_RANGE_YARD, FG_DIFFICULTY_MAX, FG_DIFFICULTY_MIN, FG_DIFFICULTY_YARD_RANGE } from './gameConstants'
// after
import { FG_RANGE_YARD, FG_DIFFICULTY_MAX, FG_DIFFICULTY_MIN } from './gameConstants'
```

Then replace the function body:

```typescript
// REPLACE:
export function computeFGDifficulty(progress: number): number {
  return Math.min(
    FG_DIFFICULTY_MAX,
    Math.max(
      FG_DIFFICULTY_MIN,
      Math.round(FG_DIFFICULTY_MAX - ((progress - FG_RANGE_YARD) / FG_DIFFICULTY_YARD_RANGE) * (FG_DIFFICULTY_MAX - FG_DIFFICULTY_MIN)),
    ),
  )
}

// WITH:
export function computeFGDifficulty(progress: number, fgRangeYard = FG_RANGE_YARD): number {
  const yardRange = 99 - fgRangeYard
  return Math.min(
    FG_DIFFICULTY_MAX,
    Math.max(
      FG_DIFFICULTY_MIN,
      Math.round(FG_DIFFICULTY_MAX - ((progress - fgRangeYard) / yardRange) * (FG_DIFFICULTY_MAX - FG_DIFFICULTY_MIN)),
    ),
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run src/logic/gameEngine.test.ts 2>&1 | tail -6
```

Expected: all gameEngine tests PASS.

- [ ] **Step 5: Run full suite**

```bash
npx vitest run 2>&1 | tail -5
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/logic/gameEngine.ts src/logic/gameEngine.test.ts
git commit -m "feat: add optional fgRangeYard param to computeFGDifficulty"
```

---

## Task 4: `src/components/game/GameScreen.tsx` — all rule-aware changes

**Files:**
- Modify: `src/components/game/GameScreen.tsx`

**Context:** GameScreen is ~884 lines. All edits are surgical replacements listed below in order of appearance in the file.

**Interfaces — Consumes:**
- `getRuleOverrides`, `getDefaultOverrides`, `RuleOverrides` from `../../logic/leagueRules`
- `computeFGDifficulty(progress, fgRangeYard)` — already updated in Task 3
- `userTurnoverNumbers: number[]`, `opponentTurnoverNumbers: number[]`, `activeRule: LeagueRule | null` from `useGameStore()`

- [ ] **Step 1: Add import at the top of `GameScreen.tsx`**

Add after the `gameConstants` import block:

```typescript
import { getRuleOverrides, getDefaultOverrides } from '../../logic/leagueRules'
import type { RuleOverrides } from '../../logic/leagueRules'
import type { LeagueRule } from '../../logic/leagueRules'
```

Also remove `TD_POINTS`, `FG_POINTS`, `TD_YARD`, `FG_RANGE_YARD` from the `gameConstants` import — they are no longer used in the reducer. The import becomes:

```typescript
import {
  DRIVES_PER_GAME,
  DRIVES_PER_QUARTER,
  STARTING_YARD_LINE,
} from '../../logic/gameConstants'
```

- [ ] **Step 2: Extend `GameState` interface**

In the `GameState` interface, replace:
```typescript
  userTurnoverNumber: number
  opponentTurnoverNumber: number
```
With:
```typescript
  userTurnoverNumbers: number[]
  opponentTurnoverNumbers: number[]
  tdPoints: number
  fgPoints: number
  tdYard: number
  fgRangeYard: number
  maxDowns: number
  noPuntingRule: boolean
  pick2Rule: boolean
```

- [ ] **Step 3: Update `makeInitialState`**

Replace the entire `makeInitialState` function:

```typescript
function makeInitialState({ weather, userTurnoverNumbers, opponentTurnoverNumbers, overrides }: {
  weather: WeatherCondition
  userTurnoverNumbers: number[]
  opponentTurnoverNumbers: number[]
  overrides: RuleOverrides
}): GameState {
  return {
    driveIndex: 0,
    possession: 'user',
    down: 1,
    driveProgress: STARTING_YARD_LINE,
    userScore: 0,
    opponentScore: 0,
    driveHistory: [],
    phase: 'choose-offense',
    offensePlayCall: null,
    defensePlayCall: null,
    selectedWR: null,
    opponentPlayCall: null,
    offPlayers: [],
    defPlayers: [],
    offRolls: [],
    defRolls: [],
    yardsGained: null,
    fgRoll: null,
    fgDifficulty: null,
    driveOutcome: null,
    weather,
    userTurnoverNumbers,
    opponentTurnoverNumbers,
    tdPoints: overrides.tdPoints,
    fgPoints: overrides.fgPoints,
    tdYard: overrides.tdYard,
    fgRangeYard: overrides.fgRangeYard,
    maxDowns: overrides.maxDowns,
    noPuntingRule: overrides.noPuntingRule,
    pick2Rule: overrides.pick2Rule,
    turnoverYardLine: null,
    nextDriveStartYard: STARTING_YARD_LINE,
    userPlayHistory: [],
    opponentPlayHistory: [],
    userRunsThisDrive: 0,
    opponentRunsThisDrive: 0,
    wr1YacActive: false,
    wr2YacActive: false,
    offBonuses: [],
    defBonuses: [],
    currentDriveYards: 0,
    currentDriveNegativePlays: 0,
    userPassPlaysThisDrive: 0,
    opponentPassPlaysThisDrive: 0,
  }
}
```

- [ ] **Step 4: Update the ROLL reducer — offense branch turnover detection**

In the ROLL reducer, offense branch, replace the two lines:
```typescript
        const defTurnoverNum = state.possession === 'user' ? state.opponentTurnoverNumber : state.userTurnoverNumber
        if (value === defTurnoverNum) {
```
With:
```typescript
        const defTurnoverNums = state.possession === 'user' ? state.opponentTurnoverNumbers : state.userTurnoverNumbers
        if (defTurnoverNums.includes(value)) {
```

Still inside that offense-branch turnover block, replace:
```typescript
            nextDriveStartYard: Math.min(99, Math.max(1, 100 - state.driveProgress)),
```
With:
```typescript
            nextDriveStartYard: Math.min(state.tdYard - 1, Math.max(1, state.tdYard - state.driveProgress)),
            userScore: (state.possession === 'opponent' && state.pick2Rule) ? state.userScore + 2 : state.userScore,
            opponentScore: (state.possession === 'user' && state.pick2Rule) ? state.opponentScore + 2 : state.opponentScore,
```

- [ ] **Step 5: Update the ROLL reducer — defense branch turnover detection**

In the defense branch, replace:
```typescript
      const offTurnoverNum = state.possession === 'user' ? state.userTurnoverNumber : state.opponentTurnoverNumber
      if (value === offTurnoverNum) {
```
With:
```typescript
      const offTurnoverNums = state.possession === 'user' ? state.userTurnoverNumbers : state.opponentTurnoverNumbers
      if (offTurnoverNums.includes(value)) {
```

Inside that defense-branch turnover block, replace:
```typescript
            nextDriveStartYard: Math.min(99, Math.max(1, 100 - state.driveProgress)),
```
With:
```typescript
            nextDriveStartYard: Math.min(state.tdYard - 1, Math.max(1, state.tdYard - state.driveProgress)),
            userScore: (state.possession === 'opponent' && state.pick2Rule) ? state.userScore + 2 : state.userScore,
            opponentScore: (state.possession === 'user' && state.pick2Rule) ? state.opponentScore + 2 : state.opponentScore,
```

- [ ] **Step 6: Update RESOLVE_PLAY — newProgress clamp**

Replace:
```typescript
      const newProgress = Math.min(100, Math.max(0, state.driveProgress + state.yardsGained))
```
With:
```typescript
      const newProgress = Math.min(state.tdYard, Math.max(0, state.driveProgress + state.yardsGained))
```

- [ ] **Step 7: Update RESOLVE_PLAY — TD detection and scoring**

Replace:
```typescript
      if (newProgress >= TD_YARD) {
```
With:
```typescript
      if (newProgress >= state.tdYard) {
```

Replace both TD score lines:
```typescript
          TD_POINTS,
          { yards: newDriveYards, runPlays, passPlays, negativePlays: newNegativePlays, scoringPlayerName, scoringPlayerPos },
        )
        return {
          ...state,
          driveProgress: newProgress,
          userScore: state.possession === 'user' ? state.userScore + TD_POINTS : state.userScore,
          opponentScore: state.possession === 'opponent' ? state.opponentScore + TD_POINTS : state.opponentScore,
```
With:
```typescript
          state.tdPoints,
          { yards: newDriveYards, runPlays, passPlays, negativePlays: newNegativePlays, scoringPlayerName, scoringPlayerPos },
        )
        return {
          ...state,
          driveProgress: newProgress,
          userScore: state.possession === 'user' ? state.userScore + state.tdPoints : state.userScore,
          opponentScore: state.possession === 'opponent' ? state.opponentScore + state.tdPoints : state.opponentScore,
```

- [ ] **Step 8: Update RESOLVE_PLAY — 4th/5th down check and FG range**

Replace:
```typescript
      if (state.down >= 4) {
        if (newProgress >= FG_RANGE_YARD) {
```
With:
```typescript
      if (state.down >= state.maxDowns) {
        if (newProgress >= state.fgRangeYard) {
```

Replace the `fgDifficulty` line inside the FG branch:
```typescript
            fgDifficulty: computeFGDifficulty(newProgress),
```
With:
```typescript
            fgDifficulty: computeFGDifficulty(newProgress, state.fgRangeYard),
```

- [ ] **Step 9: Update RESOLVE_PLAY — Punt branch (No Punting rule)**

Inside the `if (state.down >= state.maxDowns)` block, after the `if (newProgress >= state.fgRangeYard) { ... }` branch, replace the entire punt block:

```typescript
// REPLACE (the block starting immediately after the FG `if` closes):
        const runPlays = state.possession === 'user' ? newUserRunsThisDrive : newOppRunsThisDrive
        const passPlays = state.possession === 'user' ? newUserPassPlays : newOppPassPlays
        const driveResult = buildDriveResult(
          { ...state, driveProgress: newProgress },
          'Punt',
          0,
          { yards: newDriveYards, runPlays, passPlays, negativePlays: newNegativePlays },
        )
        return {
          ...state,
          driveProgress: newProgress,
          driveHistory: [...state.driveHistory, driveResult],
          driveOutcome: 'Punt',
          userPlayHistory: newUserPlayHistory,
          opponentPlayHistory: newOppPlayHistory,
          userRunsThisDrive: newUserRunsThisDrive,
          opponentRunsThisDrive: newOppRunsThisDrive,
          phase: 'drive-end',
        }

// WITH (adds nextDriveStartYard that varies by noPuntingRule):
        const runPlays = state.possession === 'user' ? newUserRunsThisDrive : newOppRunsThisDrive
        const passPlays = state.possession === 'user' ? newUserPassPlays : newOppPassPlays
        const driveResult = buildDriveResult(
          { ...state, driveProgress: newProgress },
          'Punt',
          0,
          { yards: newDriveYards, runPlays, passPlays, negativePlays: newNegativePlays },
        )
        return {
          ...state,
          driveProgress: newProgress,
          nextDriveStartYard: state.noPuntingRule
            ? Math.min(state.tdYard - 1, Math.max(1, state.tdYard - newProgress))
            : STARTING_YARD_LINE,
          driveHistory: [...state.driveHistory, driveResult],
          driveOutcome: 'Punt',
          userPlayHistory: newUserPlayHistory,
          opponentPlayHistory: newOppPlayHistory,
          userRunsThisDrive: newUserRunsThisDrive,
          opponentRunsThisDrive: newOppRunsThisDrive,
          phase: 'drive-end',
        }
```

- [ ] **Step 10: Update FG_ROLL — use state.fgPoints**

Replace:
```typescript
        made ? FG_POINTS : 0,
```
With:
```typescript
        made ? state.fgPoints : 0,
```

Replace both FG score lines:
```typescript
        userScore: (made && state.possession === 'user') ? state.userScore + FG_POINTS : state.userScore,
        opponentScore: (made && state.possession === 'opponent') ? state.opponentScore + FG_POINTS : state.opponentScore,
```
With:
```typescript
        userScore: (made && state.possession === 'user') ? state.userScore + state.fgPoints : state.userScore,
        opponentScore: (made && state.possession === 'opponent') ? state.opponentScore + state.fgPoints : state.opponentScore,
```

There are three `FG_POINTS` references in the FG_ROLL case: the `buildDriveResult` points arg plus the two score lines. The two replacements above cover all three.

- [ ] **Step 11: Update KICK_FG — use state.fgRangeYard**

Replace:
```typescript
      fgDifficulty: computeFGDifficulty(state.driveProgress),
```
With:
```typescript
      fgDifficulty: computeFGDifficulty(state.driveProgress, state.fgRangeYard),
```

- [ ] **Step 12: Update GameScreen component — destructure and useReducer**

Replace:
```typescript
  const { roster, currentOpponentRoster, currentOpponent, recordGameResult, currentWeather, userTurnoverNumber, opponentTurnoverNumber } = useGameStore()
  const [state, dispatch] = useReducer(
    gameReducer,
    { weather: currentWeather ?? 'Clear', userTurnoverNumber, opponentTurnoverNumber },
    makeInitialState,
  )
```
With:
```typescript
  const { roster, currentOpponentRoster, currentOpponent, recordGameResult, currentWeather, userTurnoverNumbers, opponentTurnoverNumbers, activeRule } = useGameStore()
  const [state, dispatch] = useReducer(
    gameReducer,
    {
      weather: currentWeather ?? 'Clear',
      userTurnoverNumbers,
      opponentTurnoverNumbers,
      overrides: activeRule ? getRuleOverrides(activeRule) : getDefaultOverrides(),
    },
    makeInitialState,
  )
```

- [ ] **Step 13: Update GameHUD props in JSX**

Replace:
```typescript
        userTurnoverNumber={state.userTurnoverNumber}
        opponentTurnoverNumber={state.opponentTurnoverNumber}
```
With:
```typescript
        userTurnoverNumbers={state.userTurnoverNumbers}
        opponentTurnoverNumbers={state.opponentTurnoverNumbers}
        activeRule={activeRule}
```

- [ ] **Step 14: Update FG button visibility in choose-offense JSX**

Replace:
```typescript
              {state.driveProgress >= FG_RANGE_YARD && (
```
With:
```typescript
              {state.driveProgress >= state.fgRangeYard && (
```

- [ ] **Step 15: TypeScript check**

```bash
npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 16: Run full suite**

```bash
npx vitest run 2>&1 | tail -5
```

Expected: all tests pass.

- [ ] **Step 17: Commit**

```bash
git add src/components/game/GameScreen.tsx
git commit -m "feat: wire rule overrides into GameScreen reducer (5th down, no punting, pick-2, dual TO#, field/FG/TD constants)"
```

---

## Task 5: `src/components/game/GameHUD.tsx` — TO# arrays + rule badge

**Files:**
- Modify: `src/components/game/GameHUD.tsx`

**Interfaces — Consumes:**
```typescript
import type { LeagueRule } from '../../logic/leagueRules'
```

- [ ] **Step 1: Update props interface**

Replace:
```typescript
  userTurnoverNumber: number
  opponentTurnoverNumber: number
```
With:
```typescript
  userTurnoverNumbers: number[]
  opponentTurnoverNumbers: number[]
  activeRule: LeagueRule | null
```

- [ ] **Step 2: Update destructured props in function signature**

Replace:
```typescript
  userTurnoverNumber, opponentTurnoverNumber,
```
With:
```typescript
  userTurnoverNumbers, opponentTurnoverNumbers, activeRule,
```

- [ ] **Step 3: Update TO# display and add rule chip**

Replace:
```typescript
      <div className="flex items-center justify-center gap-4 mb-3 text-xs text-gray-500">
        <span>YOUR # <span className="text-amber-400 font-bold">{userTurnoverNumber}</span></span>
        <span className="text-gray-700">·</span>
        <span>OPP # <span className="text-amber-400 font-bold">{opponentTurnoverNumber}</span></span>
      </div>
```
With:
```typescript
      <div className="flex items-center justify-center gap-4 mb-3 text-xs text-gray-500 flex-wrap">
        <span>YOUR # <span className="text-amber-400 font-bold">{userTurnoverNumbers.join(', ')}</span></span>
        <span className="text-gray-700">·</span>
        <span>OPP # <span className="text-amber-400 font-bold">{opponentTurnoverNumbers.join(', ')}</span></span>
        {activeRule && (
          <>
            <span className="text-gray-700">·</span>
            <span className="text-indigo-400 font-semibold">{activeRule.emoji} {activeRule.name}</span>
          </>
        )}
      </div>
```

- [ ] **Step 4: Add the LeagueRule import**

Add at the top of the file:
```typescript
import type { LeagueRule } from '../../logic/leagueRules'
```

- [ ] **Step 5: TypeScript check + test suite**

```bash
npx tsc --noEmit 2>&1 && npx vitest run 2>&1 | tail -5
```

Expected: no TS errors, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/game/GameHUD.tsx
git commit -m "feat: update GameHUD to show TO# arrays and active rule badge"
```

---

## Task 6: `MatchupSummary.tsx` + `RoundHub.tsx` — prop rename to arrays

**Files:**
- Modify: `src/components/round/MatchupSummary.tsx`
- Modify: `src/components/round/RoundHub.tsx`

- [ ] **Step 1: Update `MatchupSummary.tsx` Props interface**

Replace:
```typescript
  userTurnoverNumber: number
  opponentTurnoverNumber: number
```
With:
```typescript
  userTurnoverNumbers: number[]
  opponentTurnoverNumbers: number[]
```

- [ ] **Step 2: Update `MatchupSummary.tsx` function signature**

Replace:
```typescript
export function MatchupSummary({ userRoster, opponentRoster, opponentTeam, opponentYear, weather, userTurnoverNumber, opponentTurnoverNumber }: Props) {
```
With:
```typescript
export function MatchupSummary({ userRoster, opponentRoster, opponentTeam, opponentYear, weather, userTurnoverNumbers, opponentTurnoverNumbers }: Props) {
```

- [ ] **Step 3: Update T.O. # column values in `MatchupSummary.tsx`**

Replace:
```typescript
      userVal: String(userTurnoverNumber),
      oppVal: String(opponentTurnoverNumber),
```
With:
```typescript
      userVal: userTurnoverNumbers.join(', '),
      oppVal: opponentTurnoverNumbers.join(', '),
```

- [ ] **Step 4: Update `RoundHub.tsx` — destructure from store**

Replace:
```typescript
    round, roster, currentOpponent, currentOpponentRoster, currentWeather,
    viewDraftOffer, startGame, draftComplete, isLoading, seasonLog,
    coins, shopComplete, userTurnoverNumber, opponentTurnoverNumber,
```
With:
```typescript
    round, roster, currentOpponent, currentOpponentRoster, currentWeather,
    viewDraftOffer, startGame, draftComplete, isLoading, seasonLog,
    coins, shopComplete, userTurnoverNumbers, opponentTurnoverNumbers, activeRule,
```

- [ ] **Step 5: Update `RoundHub.tsx` — rule chip below coins**

In the left column of the header, after the coins `<p>` tag, add:
```tsx
          {activeRule && (
            <p className="text-xs mt-0.5">
              <span className="text-indigo-500 dark:text-indigo-400 font-semibold">{activeRule.emoji} {activeRule.name}</span>
            </p>
          )}
```

- [ ] **Step 6: Update `RoundHub.tsx` — MatchupSummary props**

Replace:
```typescript
        userTurnoverNumber={userTurnoverNumber}
        opponentTurnoverNumber={opponentTurnoverNumber}
```
With:
```typescript
        userTurnoverNumbers={userTurnoverNumbers}
        opponentTurnoverNumbers={opponentTurnoverNumbers}
```

- [ ] **Step 7: TypeScript check + test suite**

```bash
npx tsc --noEmit 2>&1 && npx vitest run 2>&1 | tail -5
```

Expected: no errors, all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/components/round/MatchupSummary.tsx src/components/round/RoundHub.tsx
git commit -m "feat: update MatchupSummary and RoundHub for TO# arrays and rule chip"
```

---

## Task 7: `src/components/screens/SetupScreen.tsx` — rule banner

**Files:**
- Modify: `src/components/screens/SetupScreen.tsx`

- [ ] **Step 1: Update useGameStore destructure**

Replace:
```typescript
  const { roster, setupRerollsRemaining, rerollSetupSlot, confirmSetup, isLoading } = useGameStore()
```
With:
```typescript
  const { roster, setupRerollsRemaining, rerollSetupSlot, confirmSetup, isLoading, activeRule } = useGameStore()
```

- [ ] **Step 2: Add the rule banner above the roster grid**

Insert the following block between the closing `</div>` of the title/button row and the `<RosterGrid` line:

```tsx
        {activeRule && (
          <div className="mb-6 rounded-xl border border-indigo-500/30 bg-indigo-950/30 dark:bg-indigo-900/20 px-5 py-4">
            <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">League Rule</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{activeRule.emoji} {activeRule.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{activeRule.description}</p>
          </div>
        )}
```

- [ ] **Step 3: TypeScript check + full test suite**

```bash
npx tsc --noEmit 2>&1 && npx vitest run 2>&1 | tail -5
```

Expected: no errors, all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/screens/SetupScreen.tsx
git commit -m "feat: show active League Rule banner on SetupScreen"
```
