# Player Abilities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder ability strings with 29 mechanically-active abilities that modify player rolls in the interactive game, showing a colored bonus next to each roll.

**Architecture:** A new pure `abilityEngine.ts` exports evaluation functions; `abilityGen.ts` is rewritten with position-aware pools and `ABILITY_RATE = 0.4`; `GameScreen.tsx` gains play-history/run-counter/YAC/bonus arrays in `GameState` and computes bonuses inside the `ROLL` reducer case.

**Tech Stack:** TypeScript, React, Vitest, Zustand, Tailwind CSS.

## Global Constraints

- Test runner: `npx vitest run <file>` — do NOT use Jest
- Ability IDs are kebab-case strings (e.g. `'evens'`, `'stack-the-box'`)
- `ABILITY_DISPLAY` lives in `src/logic/abilityEngine.ts`
- `assignAbility` signature: `(position: IndividualPosition | UnitPosition): string | undefined`
- Red Zone threshold: `driveProgress >= 80` (matches `RED_ZONE_YARD` constant in `gameConstants.ts`)
- Elite/Legendary WR threshold: `rating >= 93`
- User team's last drive: `driveIndex === 14`; opponent's last drive: `driveIndex === 15`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/logic/abilityGen.ts` | Rewrite | `ABILITY_RATE`, position pools, new `assignAbility` |
| `src/logic/abilityGen.test.ts` | Rewrite | Tests for new signature + pools |
| `src/logic/abilityEngine.ts` | Create | `AbilityContext`, `ABILITY_DISPLAY`, `computeRollBonus`, `computePostRollBonus`, `isPostRollAbility` |
| `src/logic/abilityEngine.test.ts` | Create | Tests for all 29 abilities |
| `src/logic/rosterGen.ts` | Modify | Pass position to `assignAbility` at 4 call sites |
| `src/logic/draftGen.ts` | Modify | Pass position to `assignAbility` at 6 call sites |
| `src/components/roster/PlayerCard.tsx` | Modify | Display ability via `ABILITY_DISPLAY` lookup |
| `src/components/draft/PlayerPickCard.tsx` | Modify | Same display fix |
| `src/components/game/PlayerRollCard.tsx` | Modify | Display fix + new `bonus` prop |
| `src/components/game/PlayArea.tsx` | Modify | New `offBonuses`/`defBonuses` props |
| `src/components/game/GameScreen.tsx` | Modify | New state fields, `buildAbilityContext`, ROLL case bonuses, RESOLVE_PLAY history |

---

## Task 1: Rewrite `abilityGen.ts` + update all call sites

**Files:**
- Rewrite: `src/logic/abilityGen.ts`
- Rewrite: `src/logic/abilityGen.test.ts`
- Modify: `src/logic/rosterGen.ts`
- Modify: `src/logic/draftGen.ts`

**Interfaces:**
- Produces: `ABILITY_RATE: number`, `assignAbility(position: IndividualPosition | UnitPosition): string | undefined`

---

- [ ] **Step 1: Write the failing tests**

Replace the entire contents of `src/logic/abilityGen.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { assignAbility, ABILITY_RATE } from './abilityGen'

afterEach(() => vi.restoreAllMocks())

describe('ABILITY_RATE', () => {
  it('is 0.4', () => expect(ABILITY_RATE).toBe(0.4))
})

describe('assignAbility', () => {
  it('returns undefined when Math.random() >= ABILITY_RATE', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.5)
    expect(assignAbility('QB')).toBeUndefined()
  })

  it('returns a string when Math.random() < ABILITY_RATE', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.1)  // rate check: assign
      .mockReturnValueOnce(0)    // pick index 0 from pool
    expect(typeof assignAbility('QB')).toBe('string')
  })

  it('K does not receive OLine-specific abilities', () => {
    // Force assignment, run 200 times — no OLine ability should appear
    vi.spyOn(Math, 'random').mockImplementation(() => 0.1)
    const results = new Set(Array.from({ length: 200 }, () => assignAbility('K')))
    expect(results.has('air-raid')).toBe(false)
    expect(results.has('bull-rush')).toBe(false)
    expect(results.has('psychic')).toBe(false)
  })

  it('OLine can receive OLine-specific abilities', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.1)   // rate check: assign
      .mockReturnValueOnce(0.999) // pick last element of OLine pool
    // OLine pool = 12 ALL + ['air-raid','ground-and-pound','psychic'] = 15 items; last = 'psychic'
    expect(assignAbility('OLine')).toBe('psychic')
  })

  it('DLine can receive DLine-specific abilities', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.1)
      .mockReturnValueOnce(0.999) // last in DLine pool
    // DLine pool = 12 ALL + ['bull-rush','brick-wall','stack-the-box','psychic','bend-dont-break'] = 17; last = 'bend-dont-break'
    expect(assignAbility('DLine')).toBe('bend-dont-break')
  })

  it('Secondary can receive Secondary-specific abilities', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.1)
      .mockReturnValueOnce(0.999)
    // Secondary pool = 12 ALL + ['bend-dont-break','on-an-island','no-fly-zone','psychic'] = 16; last = 'psychic'
    expect(assignAbility('Secondary')).toBe('psychic')
  })
})
```

- [ ] **Step 2: Run to confirm tests fail**

```bash
npx vitest run src/logic/abilityGen.test.ts
```

Expected: multiple FAIL — `ABILITY_RATE is not exported`, `assignAbility` signature mismatch.

- [ ] **Step 3: Rewrite `src/logic/abilityGen.ts`**

```ts
import type { IndividualPosition, UnitPosition } from '../types'

export const ABILITY_RATE = 0.4

const ALL_ABILITY_IDS = [
  'evens', 'odds', 'evil-evens', 'evil-odds',
  'blessed-evens', 'blessed-odds',
  'second-half', 'clutch',
  'rain-man', 'snow-man',
  'comeback-kid', 'two-minute-drill',
]

const POSITION_ABILITY_IDS: Record<string, string[]> = {
  QB:        ['play-action', 'in-rhythm'],
  WR:        ['basketball-player', 'yac'],
  RB:        ['workhorse', 'fresh-legs', 'goal-line'],
  K:         [],
  OLine:     ['air-raid', 'ground-and-pound', 'psychic'],
  DLine:     ['bull-rush', 'brick-wall', 'stack-the-box', 'psychic', 'bend-dont-break'],
  Secondary: ['bend-dont-break', 'on-an-island', 'no-fly-zone', 'psychic'],
}

export function assignAbility(position: IndividualPosition | UnitPosition): string | undefined {
  if (Math.random() >= ABILITY_RATE) return undefined
  const posSpecific = POSITION_ABILITY_IDS[position] ?? []
  const pool = [...ALL_ABILITY_IDS, ...posSpecific]
  return pool[Math.floor(Math.random() * pool.length)]
}
```

- [ ] **Step 4: Run tests — all should pass**

```bash
npx vitest run src/logic/abilityGen.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Update `rosterGen.ts` — 4 call sites**

Apply these four changes to `src/logic/rosterGen.ts`:

Line 36 (unit in `generateRandomSlot`):
```ts
// Before:
if (match) return { ...match, die: assignDie(match.rating), ability: assignAbility() }
// After:
if (match) return { ...match, die: assignDie(match.rating), ability: assignAbility(match.position as UnitPosition) }
```

Line 41 (player in `generateRandomSlot`):
```ts
// Before:
return { ...picked, die: assignDie(picked.rating), ability: assignAbility() }
// After:
return { ...picked, die: assignDie(picked.rating), ability: assignAbility(picked.position) }
```

Line 66 (practice squad loop):
```ts
// Before:
slot.ability = assignAbility()
// After:
slot.ability = assignAbility(slot.position as IndividualPosition | UnitPosition)
```

Line 137 (`withExtras` function):
```ts
// Before:
return slot ? { ...slot, die: assignDie(slot.rating), ability: assignAbility() } as T : null
// After:
return slot ? { ...slot, die: assignDie(slot.rating), ability: assignAbility(slot.position) } as T : null
```

- [ ] **Step 6: Update `draftGen.ts` — 6 call sites (3 functions × players + units)**

In each of the three functions (`generateDraftOffer`, `rerollDraftOfferTeam`, `rerollDraftOfferYear`), change both the players map and the units map:

```ts
// Before (players):
players: players.map(p => ({ ...p, die: assignDie(p.rating), ability: assignAbility() })),
// After:
players: players.map(p => ({ ...p, die: assignDie(p.rating), ability: assignAbility(p.position) })),

// Before (units):
units: units.map(u => ({ ...u, die: assignDie(u.rating), ability: assignAbility() })),
// After:
units: units.map(u => ({ ...u, die: assignDie(u.rating), ability: assignAbility(u.position) })),
```

Apply to all three functions.

- [ ] **Step 7: Confirm full test suite passes**

```bash
npx vitest run
```

Expected: all green. No TypeScript errors.

- [ ] **Step 8: Commit**

```bash
git add src/logic/abilityGen.ts src/logic/abilityGen.test.ts src/logic/rosterGen.ts src/logic/draftGen.ts
git commit -m "feat: rewrite abilityGen — position-aware pools, ABILITY_RATE=0.4"
```

---

## Task 2: Create `abilityEngine.ts` + tests

**Files:**
- Create: `src/logic/abilityEngine.ts`
- Create: `src/logic/abilityEngine.test.ts`

**Interfaces:**
- Produces: `AbilityContext`, `ABILITY_DISPLAY`, `isPostRollAbility`, `computeRollBonus`, `computePostRollBonus`

---

- [ ] **Step 1: Write the failing tests**

Create `src/logic/abilityEngine.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  computeRollBonus, computePostRollBonus, isPostRollAbility, ABILITY_DISPLAY,
} from './abilityEngine'
import type { AbilityContext } from './abilityEngine'

const base: AbilityContext = {
  quarter: 1,
  driveIndex: 0,
  possession: 'user',
  playerSide: 'offense',
  playerTeamIsLosing: false,
  isLastTeamDrive: false,
  driveProgress: 20,
  down: 1,
  playCall: 'pass',
  weather: 'Clear',
  ownPlayHistory: [],
  oppPlayHistory: [],
  ownRunsThisDrive: 0,
  wrYacActive: false,
  olineRoll: null,
  opponentWRRating: undefined,
  allOffRolls: [],
  allDefRolls: [],
}

describe('ABILITY_DISPLAY', () => {
  it('has an entry for evens', () => expect(ABILITY_DISPLAY['evens']).toBeTruthy())
  it('has an entry for psychic', () => expect(ABILITY_DISPLAY['psychic']).toBeTruthy())
  it('has an entry for yac', () => expect(ABILITY_DISPLAY['yac']).toBeTruthy())
})

describe('isPostRollAbility', () => {
  it('returns true for blessed-evens', () => expect(isPostRollAbility('blessed-evens')).toBe(true))
  it('returns true for blessed-odds', () => expect(isPostRollAbility('blessed-odds')).toBe(true))
  it('returns false for evens', () => expect(isPostRollAbility('evens')).toBe(false))
  it('returns false for unknown id', () => expect(isPostRollAbility('unknown')).toBe(false))
})

describe('computeRollBonus — evens / odds', () => {
  it('evens: +5 on even roll', () => expect(computeRollBonus('evens', 10, base)).toBe(5))
  it('evens: 0 on odd roll', () => expect(computeRollBonus('evens', 9, base)).toBe(0))
  it('odds: +5 on odd roll', () => expect(computeRollBonus('odds', 7, base)).toBe(5))
  it('odds: 0 on even roll', () => expect(computeRollBonus('odds', 8, base)).toBe(0))
  it('evil-evens: +7 on even roll', () => expect(computeRollBonus('evil-evens', 12, base)).toBe(7))
  it('evil-evens: -3 on odd roll', () => expect(computeRollBonus('evil-evens', 11, base)).toBe(-3))
  it('evil-odds: +7 on odd roll', () => expect(computeRollBonus('evil-odds', 13, base)).toBe(7))
  it('evil-odds: -3 on even roll', () => expect(computeRollBonus('evil-odds', 14, base)).toBe(-3))
})

describe('computeRollBonus — time / score', () => {
  it('second-half: +5 in Q3', () => expect(computeRollBonus('second-half', 5, { ...base, quarter: 3 })).toBe(5))
  it('second-half: +5 in Q4', () => expect(computeRollBonus('second-half', 5, { ...base, quarter: 4 })).toBe(5))
  it('second-half: 0 in Q1', () => expect(computeRollBonus('second-half', 5, { ...base, quarter: 1 })).toBe(0))
  it('clutch: +10 in Q4', () => expect(computeRollBonus('clutch', 5, { ...base, quarter: 4 })).toBe(10))
  it('clutch: 0 in Q3', () => expect(computeRollBonus('clutch', 5, { ...base, quarter: 3 })).toBe(0))
  it('comeback-kid: +5 when losing', () => expect(computeRollBonus('comeback-kid', 5, { ...base, playerTeamIsLosing: true })).toBe(5))
  it('comeback-kid: 0 when not losing', () => expect(computeRollBonus('comeback-kid', 5, { ...base, playerTeamIsLosing: false })).toBe(0))
  it('two-minute-drill: +15 on last team drive for offense', () =>
    expect(computeRollBonus('two-minute-drill', 5, { ...base, playerSide: 'offense', isLastTeamDrive: true })).toBe(15))
  it('two-minute-drill: 0 when on defense even if last drive', () =>
    expect(computeRollBonus('two-minute-drill', 5, { ...base, playerSide: 'defense', isLastTeamDrive: true })).toBe(0))
  it('two-minute-drill: 0 when not last drive', () =>
    expect(computeRollBonus('two-minute-drill', 5, { ...base, playerSide: 'offense', isLastTeamDrive: false })).toBe(0))
})

describe('computeRollBonus — weather', () => {
  it('rain-man: +5 in Rain', () => expect(computeRollBonus('rain-man', 5, { ...base, weather: 'Rain' })).toBe(5))
  it('rain-man: 0 in Clear', () => expect(computeRollBonus('rain-man', 5, { ...base, weather: 'Clear' })).toBe(0))
  it('snow-man: +5 in Snow', () => expect(computeRollBonus('snow-man', 5, { ...base, weather: 'Snow' })).toBe(5))
  it('snow-man: 0 in Rain', () => expect(computeRollBonus('snow-man', 5, { ...base, weather: 'Rain' })).toBe(0))
})

describe('computeRollBonus — OLine', () => {
  it('air-raid: +5 on pass', () => expect(computeRollBonus('air-raid', 5, { ...base, playCall: 'pass' })).toBe(5))
  it('air-raid: 0 on run', () => expect(computeRollBonus('air-raid', 5, { ...base, playCall: 'run' })).toBe(0))
  it('ground-and-pound: +5 on run', () => expect(computeRollBonus('ground-and-pound', 5, { ...base, playCall: 'run' })).toBe(5))
  it('ground-and-pound: 0 on pass', () => expect(computeRollBonus('ground-and-pound', 5, { ...base, playCall: 'pass' })).toBe(0))
})

describe('computeRollBonus — psychic', () => {
  it('0 on first play', () =>
    expect(computeRollBonus('psychic', 5, { ...base, playerSide: 'offense', ownPlayHistory: [], playCall: 'run' })).toBe(0))
  it('+5 when offense calls same play 2nd time in a row', () =>
    expect(computeRollBonus('psychic', 5, { ...base, playerSide: 'offense', ownPlayHistory: ['run'], playCall: 'run' })).toBe(5))
  it('+7 on 3rd consecutive same call', () =>
    expect(computeRollBonus('psychic', 5, { ...base, playerSide: 'offense', ownPlayHistory: ['run', 'run'], playCall: 'run' })).toBe(7))
  it('0 when play type changes', () =>
    expect(computeRollBonus('psychic', 5, { ...base, playerSide: 'offense', ownPlayHistory: ['run', 'run'], playCall: 'pass' })).toBe(0))
  it('defense uses oppPlayHistory', () =>
    expect(computeRollBonus('psychic', 5, { ...base, playerSide: 'defense', oppPlayHistory: ['pass', 'pass'], playCall: 'pass' })).toBe(7))
})

describe('computeRollBonus — DLine', () => {
  it('bull-rush: +7 when olineRoll <= dlineRoll on pass', () =>
    expect(computeRollBonus('bull-rush', 10, { ...base, playCall: 'pass', olineRoll: 8 })).toBe(7))
  it('bull-rush: +7 when olineRoll === dlineRoll', () =>
    expect(computeRollBonus('bull-rush', 8, { ...base, playCall: 'pass', olineRoll: 8 })).toBe(7))
  it('bull-rush: 0 when olineRoll > dlineRoll', () =>
    expect(computeRollBonus('bull-rush', 6, { ...base, playCall: 'pass', olineRoll: 10 })).toBe(0))
  it('bull-rush: 0 on run play', () =>
    expect(computeRollBonus('bull-rush', 10, { ...base, playCall: 'run', olineRoll: 8 })).toBe(0))
  it('brick-wall: +7 when olineRoll <= dlineRoll on run', () =>
    expect(computeRollBonus('brick-wall', 12, { ...base, playCall: 'run', olineRoll: 10 })).toBe(7))
  it('brick-wall: 0 on pass play', () =>
    expect(computeRollBonus('brick-wall', 12, { ...base, playCall: 'pass', olineRoll: 10 })).toBe(0))
  it('stack-the-box: +5 on 2nd consecutive run by opponent', () =>
    expect(computeRollBonus('stack-the-box', 5, { ...base, playCall: 'run', oppPlayHistory: ['run'] })).toBe(5))
  it('stack-the-box: +7 on 3rd consecutive run', () =>
    expect(computeRollBonus('stack-the-box', 5, { ...base, playCall: 'run', oppPlayHistory: ['run', 'run'] })).toBe(7))
  it('stack-the-box: 0 when opponent switches to pass', () =>
    expect(computeRollBonus('stack-the-box', 5, { ...base, playCall: 'pass', oppPlayHistory: ['run', 'run'] })).toBe(0))
  it('bend-dont-break: +5 at driveProgress 80', () =>
    expect(computeRollBonus('bend-dont-break', 5, { ...base, driveProgress: 80 })).toBe(5))
  it('bend-dont-break: 0 at driveProgress 79', () =>
    expect(computeRollBonus('bend-dont-break', 5, { ...base, driveProgress: 79 })).toBe(0))
})

describe('computeRollBonus — Secondary', () => {
  it('no-fly-zone: +5 on 2nd consecutive pass by opponent', () =>
    expect(computeRollBonus('no-fly-zone', 5, { ...base, playerSide: 'defense', playCall: 'pass', oppPlayHistory: ['pass'] })).toBe(5))
  it('no-fly-zone: 0 on run play', () =>
    expect(computeRollBonus('no-fly-zone', 5, { ...base, playerSide: 'defense', playCall: 'run', oppPlayHistory: ['pass', 'pass'] })).toBe(0))
  it('on-an-island: +5 when opponent WR rating is 93 (Elite)', () =>
    expect(computeRollBonus('on-an-island', 5, { ...base, opponentWRRating: 93 })).toBe(5))
  it('on-an-island: +5 when opponent WR rating is 98 (Legendary)', () =>
    expect(computeRollBonus('on-an-island', 5, { ...base, opponentWRRating: 98 })).toBe(5))
  it('on-an-island: 0 when opponent WR rating is 92', () =>
    expect(computeRollBonus('on-an-island', 5, { ...base, opponentWRRating: 92 })).toBe(0))
  it('on-an-island: 0 when rating is undefined', () =>
    expect(computeRollBonus('on-an-island', 5, { ...base, opponentWRRating: undefined })).toBe(0))
})

describe('computeRollBonus — QB', () => {
  it('play-action: +5 when previous play was run', () =>
    expect(computeRollBonus('play-action', 5, { ...base, ownPlayHistory: ['run'] })).toBe(5))
  it('play-action: 0 when previous play was pass', () =>
    expect(computeRollBonus('play-action', 5, { ...base, ownPlayHistory: ['pass'] })).toBe(0))
  it('play-action: 0 with empty history', () =>
    expect(computeRollBonus('play-action', 5, { ...base, ownPlayHistory: [] })).toBe(0))
  it('in-rhythm: +5 when previous play was pass', () =>
    expect(computeRollBonus('in-rhythm', 5, { ...base, ownPlayHistory: ['pass'] })).toBe(5))
  it('in-rhythm: 0 when previous play was run', () =>
    expect(computeRollBonus('in-rhythm', 5, { ...base, ownPlayHistory: ['run'] })).toBe(0))
})

describe('computeRollBonus — RB', () => {
  it('workhorse: +3 on first run (ownRunsThisDrive=0)', () =>
    expect(computeRollBonus('workhorse', 5, { ...base, playCall: 'run', ownRunsThisDrive: 0 })).toBe(3))
  it('workhorse: +9 on third run (ownRunsThisDrive=2)', () =>
    expect(computeRollBonus('workhorse', 5, { ...base, playCall: 'run', ownRunsThisDrive: 2 })).toBe(9))
  it('workhorse: 0 on pass play', () =>
    expect(computeRollBonus('workhorse', 5, { ...base, playCall: 'pass', ownRunsThisDrive: 3 })).toBe(0))
  it('fresh-legs: +8 on first down run', () =>
    expect(computeRollBonus('fresh-legs', 5, { ...base, down: 1, playCall: 'run' })).toBe(8))
  it('fresh-legs: 0 on second down run', () =>
    expect(computeRollBonus('fresh-legs', 5, { ...base, down: 2, playCall: 'run' })).toBe(0))
  it('fresh-legs: 0 on first down pass', () =>
    expect(computeRollBonus('fresh-legs', 5, { ...base, down: 1, playCall: 'pass' })).toBe(0))
  it('goal-line: +5 at driveProgress 80', () =>
    expect(computeRollBonus('goal-line', 5, { ...base, driveProgress: 80 })).toBe(5))
  it('goal-line: 0 at driveProgress 79', () =>
    expect(computeRollBonus('goal-line', 5, { ...base, driveProgress: 79 })).toBe(0))
})

describe('computeRollBonus — WR', () => {
  it('basketball-player: +5 at driveProgress 80', () =>
    expect(computeRollBonus('basketball-player', 5, { ...base, driveProgress: 80 })).toBe(5))
  it('basketball-player: 0 at driveProgress 79', () =>
    expect(computeRollBonus('basketball-player', 5, { ...base, driveProgress: 79 })).toBe(0))
  it('yac: +5 when wrYacActive', () =>
    expect(computeRollBonus('yac', 5, { ...base, wrYacActive: true })).toBe(5))
  it('yac: 0 when not active', () =>
    expect(computeRollBonus('yac', 5, { ...base, wrYacActive: false })).toBe(0))
})

describe('computeRollBonus — unknown id', () => {
  it('returns 0 for unknown ability', () =>
    expect(computeRollBonus('does-not-exist', 10, base)).toBe(0))
})

describe('computePostRollBonus — blessed', () => {
  it('blessed-evens: counts evens across all rolls', () => {
    const ctx = { ...base, allOffRolls: [10, 7, null] as (number|null)[], allDefRolls: [8, 9] as (number|null)[] }
    expect(computePostRollBonus('blessed-evens', ctx)).toBe(2)
  })
  it('blessed-odds: counts odds across all rolls', () => {
    const ctx = { ...base, allOffRolls: [10, 7] as (number|null)[], allDefRolls: [8, 9] as (number|null)[] }
    expect(computePostRollBonus('blessed-odds', ctx)).toBe(2)
  })
  it('blessed-evens: ignores null values', () => {
    const ctx = { ...base, allOffRolls: [null, null] as (number|null)[], allDefRolls: [null] as (number|null)[] }
    expect(computePostRollBonus('blessed-evens', ctx)).toBe(0)
  })
  it('returns 0 for unknown post-roll ability', () =>
    expect(computePostRollBonus('does-not-exist', base)).toBe(0))
})
```

- [ ] **Step 2: Run to confirm tests fail**

```bash
npx vitest run src/logic/abilityEngine.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/logic/abilityEngine.ts`**

```ts
import type { WeatherCondition } from '../types'

export interface AbilityContext {
  quarter: number
  driveIndex: number
  possession: 'user' | 'opponent'
  playerSide: 'offense' | 'defense'
  playerTeamIsLosing: boolean
  isLastTeamDrive: boolean
  driveProgress: number
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
}

export const ABILITY_DISPLAY: Record<string, string> = {
  'evens':             '2️⃣ Evens',
  'odds':              '3️⃣ Odds',
  'evil-evens':        '2️⃣ Evil Evens',
  'evil-odds':         '3️⃣ Evil Odds',
  'blessed-evens':     '2️⃣ Blessed Evens',
  'blessed-odds':      '3️⃣ Blessed Odds',
  'second-half':       '💪🏻 2nd-Half Player',
  'clutch':            '💪🏻 Clutch',
  'rain-man':          '🌧️ Rain Man',
  'snow-man':          '❄️ Snow Man',
  'comeback-kid':      '📈 Comeback Kid',
  'two-minute-drill':  '⏱️ Two Minute Drill',
  'air-raid':          '✈️ Air Raid',
  'ground-and-pound':  '👊 Ground and Pound',
  'psychic':           '🔮 Psychic',
  'bull-rush':         '🐂 Bull Rush',
  'brick-wall':        '🧱 Brick Wall',
  'stack-the-box':     '📦 Stack the Box',
  'bend-dont-break':   '⛓️ Bend Don\'t Break',
  'on-an-island':      '🏝️ On an Island',
  'no-fly-zone':       '❌ No Fly Zone',
  'play-action':       '🏈 Play Action',
  'in-rhythm':         '🎵 In Rhythm',
  'workhorse':         '🐴 Workhorse',
  'fresh-legs':        '🦵 Fresh Legs',
  'goal-line':         '🏈 Goal Line',
  'basketball-player': '🏀 Basketball Player',
  'yac':               '🏈 YAC',
}

const POST_ROLL_ABILITIES = new Set(['blessed-evens', 'blessed-odds'])

export function isPostRollAbility(abilityId: string): boolean {
  return POST_ROLL_ABILITIES.has(abilityId)
}

function consecutiveCount(history: ('run' | 'pass')[], current: 'run' | 'pass'): number {
  let count = 0
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i] === current) count++
    else break
  }
  return count + 1  // +1 for the current play
}

function consecutiveBonus(count: number): number {
  return count >= 2 ? 5 + 2 * (count - 2) : 0
}

export function computeRollBonus(abilityId: string, roll: number, ctx: AbilityContext): number {
  switch (abilityId) {
    case 'evens':            return roll % 2 === 0 ? 5 : 0
    case 'odds':             return roll % 2 !== 0 ? 5 : 0
    case 'evil-evens':       return roll % 2 === 0 ? 7 : -3
    case 'evil-odds':        return roll % 2 !== 0 ? 7 : -3
    case 'second-half':      return ctx.quarter >= 3 ? 5 : 0
    case 'clutch':           return ctx.quarter === 4 ? 10 : 0
    case 'rain-man':         return ctx.weather === 'Rain' ? 5 : 0
    case 'snow-man':         return ctx.weather === 'Snow' ? 5 : 0
    case 'comeback-kid':     return ctx.playerTeamIsLosing ? 5 : 0
    case 'two-minute-drill': return ctx.playerSide === 'offense' && ctx.isLastTeamDrive ? 15 : 0
    case 'air-raid':         return ctx.playCall === 'pass' ? 5 : 0
    case 'ground-and-pound': return ctx.playCall === 'run' ? 5 : 0
    case 'psychic': {
      const history = ctx.playerSide === 'offense' ? ctx.ownPlayHistory : ctx.oppPlayHistory
      return consecutiveBonus(consecutiveCount(history, ctx.playCall))
    }
    case 'bull-rush':
      return ctx.playCall === 'pass' && ctx.olineRoll !== null && ctx.olineRoll <= roll ? 7 : 0
    case 'brick-wall':
      return ctx.playCall === 'run' && ctx.olineRoll !== null && ctx.olineRoll <= roll ? 7 : 0
    case 'stack-the-box':
      return ctx.playCall === 'run'
        ? consecutiveBonus(consecutiveCount(ctx.oppPlayHistory, 'run'))
        : 0
    case 'no-fly-zone':
      return ctx.playCall === 'pass'
        ? consecutiveBonus(consecutiveCount(ctx.oppPlayHistory, 'pass'))
        : 0
    case 'bend-dont-break':  return ctx.driveProgress >= 80 ? 5 : 0
    case 'on-an-island':     return (ctx.opponentWRRating ?? 0) >= 93 ? 5 : 0
    case 'play-action':      return ctx.ownPlayHistory.at(-1) === 'run' ? 5 : 0
    case 'in-rhythm':        return ctx.ownPlayHistory.at(-1) === 'pass' ? 5 : 0
    case 'workhorse':        return ctx.playCall === 'run' ? (ctx.ownRunsThisDrive + 1) * 3 : 0
    case 'fresh-legs':       return ctx.down === 1 && ctx.playCall === 'run' ? 8 : 0
    case 'goal-line':        return ctx.driveProgress >= 80 ? 5 : 0
    case 'basketball-player':return ctx.driveProgress >= 80 ? 5 : 0
    case 'yac':              return ctx.wrYacActive ? 5 : 0
    default:                 return 0
  }
}

export function computePostRollBonus(abilityId: string, ctx: AbilityContext): number {
  const rolls = [...ctx.allOffRolls, ...ctx.allDefRolls].filter((r): r is number => r !== null)
  switch (abilityId) {
    case 'blessed-evens': return rolls.filter(r => r % 2 === 0).length
    case 'blessed-odds':  return rolls.filter(r => r % 2 !== 0).length
    default:              return 0
  }
}
```

- [ ] **Step 4: Run tests — all should pass**

```bash
npx vitest run src/logic/abilityEngine.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/logic/abilityEngine.ts src/logic/abilityEngine.test.ts
git commit -m "feat: add abilityEngine — 29 ability evaluators with full test coverage"
```

---

## Task 3: Fix ability display in `PlayerCard` + `PlayerPickCard`

**Files:**
- Modify: `src/components/roster/PlayerCard.tsx`
- Modify: `src/components/draft/PlayerPickCard.tsx`

**Interfaces:**
- Consumes: `ABILITY_DISPLAY` from `src/logic/abilityEngine.ts`

---

- [ ] **Step 1: Update `PlayerCard.tsx`**

Add the import at the top of the file:
```ts
import { ABILITY_DISPLAY } from '../../logic/abilityEngine'
```

Find the ability display line (around line 182):
```tsx
// Before:
{tab === 'die' && slot.ability && (
  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{slot.ability}</p>
)}
// After:
{tab === 'die' && slot.ability && (
  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
    {ABILITY_DISPLAY[slot.ability] ?? slot.ability}
  </p>
)}
```

- [ ] **Step 2: Update `PlayerPickCard.tsx`**

Add the import:
```ts
import { ABILITY_DISPLAY } from '../../logic/abilityEngine'
```

Find the ability display line (around line 52):
```tsx
// Before:
{tab === 'die' && item.ability && (
  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.ability}</p>
)}
// After:
{tab === 'die' && item.ability && (
  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
    {ABILITY_DISPLAY[item.ability] ?? item.ability}
  </p>
)}
```

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```

Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/roster/PlayerCard.tsx src/components/draft/PlayerPickCard.tsx
git commit -m "fix: render ability display strings from ABILITY_DISPLAY map"
```

---

## Task 4: Add bonus display to `PlayerRollCard` + update `PlayArea`

**Files:**
- Modify: `src/components/game/PlayerRollCard.tsx`
- Modify: `src/components/game/PlayArea.tsx`

**Interfaces:**
- Consumes: `ABILITY_DISPLAY` from `src/logic/abilityEngine.ts`
- Produces: `PlayerRollCard` accepts `bonus?: number | null`; `PlayArea` accepts `offBonuses: (number | null)[]` and `defBonuses: (number | null)[]`

---

- [ ] **Step 1: Update `PlayerRollCard.tsx`**

Add import:
```ts
import { ABILITY_DISPLAY } from '../../logic/abilityEngine'
```

Add `bonus` to the props interface (after `isNext`):
```ts
export function PlayerRollCard({
  player,
  roll,
  isNext,
  bonus,
}: {
  player: Player | TeamUnit
  roll: number | null
  isNext: boolean
  bonus?: number | null
}) {
```

Fix the ability display line:
```tsx
// Before:
{player.ability && (
  <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">{player.ability}</p>
)}
// After:
{player.ability && (
  <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
    {ABILITY_DISPLAY[player.ability] ?? player.ability}
  </p>
)}
```

Add the bonus display in the roll value `<div>`. Replace the existing roll value div with:
```tsx
<div className="flex items-center justify-center gap-1.5">
  <div
    className={`text-center text-2xl font-bold tabular-nums transition-colors ${
      displayValue !== null
        ? isAnimating ? 'text-yellow-400' : 'text-white'
        : 'text-gray-600'
    }`}
  >
    {displayValue !== null ? displayValue : '?'}
  </div>
  {displayValue !== null && bonus !== null && bonus !== undefined && (
    <span className={`text-sm font-bold tabular-nums ${bonus >= 0 ? 'text-green-400' : 'text-red-400'}`}>
      {bonus >= 0 ? `+${bonus}` : `${bonus}`}
    </span>
  )}
</div>
```

- [ ] **Step 2: Update `PlayArea.tsx`**

Add `offBonuses` and `defBonuses` to the props interface (after `defRolls`):
```ts
interface PlayAreaProps {
  possession: 'user' | 'opponent'
  phase: string
  offPlayers: (Player | TeamUnit)[]
  defPlayers: (Player | TeamUnit)[]
  offRolls: (number | null)[]
  defRolls: (number | null)[]
  offBonuses: (number | null)[]
  defBonuses: (number | null)[]
  offensePlayCall: 'run' | 'pass' | null
  defensePlayCall: 'run-stop' | 'pass-stop' | null
  opponentPlayCall: 'run' | 'pass' | null
  yardsGained: number | null
  fgRoll: number | null
  fgDifficulty: number | null
  driveOutcome: 'TD' | 'FG' | 'FG-missed' | 'Punt' | null
  kicker: Player | TeamUnit | null
}
```

Destructure the new props in the function signature:
```ts
export function PlayArea({
  possession, phase,
  offPlayers, defPlayers,
  offRolls, defRolls,
  offBonuses, defBonuses,
  offensePlayCall, defensePlayCall, opponentPlayCall,
  yardsGained, fgRoll, fgDifficulty, driveOutcome,
  kicker,
}: PlayAreaProps) {
```

Pass `bonus` to each `PlayerRollCard` in the offense column (around line 113):
```tsx
// Before:
{offPlayers.map((player, i) => (
  <PlayerRollCard
    key={player.id}
    player={player}
    roll={offRolls[i] ?? null}
    isNext={offRollingIdx === i}
  />
))}
// After:
{offPlayers.map((player, i) => (
  <PlayerRollCard
    key={player.id}
    player={player}
    roll={offRolls[i] ?? null}
    isNext={offRollingIdx === i}
    bonus={offBonuses[i] ?? null}
  />
))}
```

Pass `bonus` to each `PlayerRollCard` in the defense column (around line 133):
```tsx
// Before:
{defPlayers.map((player, i) => (
  <PlayerRollCard
    key={player.id}
    player={player}
    roll={defRolls[i] ?? null}
    isNext={defRollingIdx === i}
  />
))}
// After:
{defPlayers.map((player, i) => (
  <PlayerRollCard
    key={player.id}
    player={player}
    roll={defRolls[i] ?? null}
    isNext={defRollingIdx === i}
    bonus={defBonuses[i] ?? null}
  />
))}
```

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```

Expected: all PASS (TypeScript will flag missing `offBonuses`/`defBonuses` in the `GameScreen` call to `PlayArea` — that's resolved in Task 6).

- [ ] **Step 4: Commit**

```bash
git add src/components/game/PlayerRollCard.tsx src/components/game/PlayArea.tsx
git commit -m "feat: add bonus prop to PlayerRollCard; offBonuses/defBonuses to PlayArea"
```

---

## Task 5: Add history / counter / YAC / bonus fields to `GameState` + update `RESOLVE_PLAY`

**Files:**
- Modify: `src/components/game/GameScreen.tsx`

**Interfaces:**
- Consumes: `WeatherCondition` from `../types`
- Produces: `GameState` gains `weather`, `userPlayHistory`, `opponentPlayHistory`, `userRunsThisDrive`, `opponentRunsThisDrive`, `wr1YacActive`, `wr2YacActive`, `offBonuses`, `defBonuses`

---

- [ ] **Step 1: Add `WeatherCondition` to the GameScreen imports**

At the top of `src/components/game/GameScreen.tsx`, find the types import line:
```ts
// Before:
import type { Roster, Player, TeamUnit, DriveResult, DriveOutcome, SimulationResult } from '../../types'
// After:
import type { Roster, Player, TeamUnit, DriveResult, DriveOutcome, SimulationResult, WeatherCondition } from '../../types'
```

- [ ] **Step 2: Add new fields to the `GameState` interface**

Add these fields to the `interface GameState` block:

```ts
interface GameState {
  // ... existing fields ...
  weather: WeatherCondition
  userPlayHistory: ('run' | 'pass')[]
  opponentPlayHistory: ('run' | 'pass')[]
  userRunsThisDrive: number
  opponentRunsThisDrive: number
  wr1YacActive: boolean
  wr2YacActive: boolean
  offBonuses: (number | null)[]
  defBonuses: (number | null)[]
}
```

- [ ] **Step 3: Update `driveReset()` to clear drive-scoped and play-scoped fields**

```ts
function driveReset(): Partial<GameState> {
  return {
    down: 1,
    driveProgress: STARTING_YARD_LINE,
    offensePlayCall: null,
    defensePlayCall: null,
    selectedWR: null,
    offPlayers: [],
    defPlayers: [],
    offRolls: [],
    defRolls: [],
    yardsGained: null,
    fgRoll: null,
    fgDifficulty: null,
    driveOutcome: null,
    userRunsThisDrive: 0,
    opponentRunsThisDrive: 0,
    wr1YacActive: false,
    wr2YacActive: false,
    offBonuses: [],
    defBonuses: [],
  }
}
```

- [ ] **Step 4: Update `playReset()` to clear per-play bonus arrays**

```ts
function playReset(): Partial<GameState> {
  return {
    offensePlayCall: null,
    defensePlayCall: null,
    selectedWR: null,
    offPlayers: [],
    defPlayers: [],
    offRolls: [],
    defRolls: [],
    yardsGained: null,
    driveOutcome: null,
    offBonuses: [],
    defBonuses: [],
  }
}
```

- [ ] **Step 5: Update `makeInitialState` to accept weather and initialize new fields**

```ts
function makeInitialState(weather: WeatherCondition): GameState {
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
    userPlayHistory: [],
    opponentPlayHistory: [],
    userRunsThisDrive: 0,
    opponentRunsThisDrive: 0,
    wr1YacActive: false,
    wr2YacActive: false,
    offBonuses: [],
    defBonuses: [],
  }
}
```

- [ ] **Step 6: Update `RESOLVE_PLAY` to track play history and run counters**

At the top of the `RESOLVE_PLAY` case, before computing `newProgress`, add:

```ts
case 'RESOLVE_PLAY': {
  const { nextOpponentPlayCall } = action
  if (state.yardsGained === null) return state

  // Track play history and run counters (carries across drives)
  const newUserPlayHistory = state.possession === 'user'
    ? [...state.userPlayHistory, state.offensePlayCall!]
    : state.userPlayHistory
  const newOppPlayHistory = state.possession === 'opponent'
    ? [...state.opponentPlayHistory, state.offensePlayCall!]
    : state.opponentPlayHistory
  const newUserRunsThisDrive = state.possession === 'user' && state.offensePlayCall === 'run'
    ? state.userRunsThisDrive + 1
    : state.userRunsThisDrive
  const newOppRunsThisDrive = state.possession === 'opponent' && state.offensePlayCall === 'run'
    ? state.opponentRunsThisDrive + 1
    : state.opponentRunsThisDrive

  const newProgress = Math.min(100, Math.max(0, state.driveProgress + state.yardsGained))
  // ... rest of the existing RESOLVE_PLAY logic unchanged ...
```

Then spread the four new values into every return statement inside `RESOLVE_PLAY`:
- TD branch: add `userPlayHistory: newUserPlayHistory, opponentPlayHistory: newOppPlayHistory, userRunsThisDrive: newUserRunsThisDrive, opponentRunsThisDrive: newOppRunsThisDrive`
- FG branch: same
- Punt branch: same
- Next down branch: same (this branch already spreads `playReset()` which resets run counters via `driveReset` later, but the history must survive)

For the next-down branch the spread order matters — put the history/counter updates AFTER `playReset()` so they are not overwritten:

```ts
// Next down branch:
return {
  ...state,
  ...playReset(),
  driveProgress: newProgress,
  down: state.down + 1,
  opponentPlayCall: state.possession === 'opponent' ? nextOpponentPlayCall : state.opponentPlayCall,
  userPlayHistory: newUserPlayHistory,
  opponentPlayHistory: newOppPlayHistory,
  userRunsThisDrive: newUserRunsThisDrive,
  opponentRunsThisDrive: newOppRunsThisDrive,
  phase: nextPhase,
}
```

- [ ] **Step 7: Initialize bonus arrays in CHOOSE_* reducer cases**

The `CHOOSE_*` cases set `offRolls`/`defRolls` but must also size the bonus arrays to match. Apply these additions:

`CHOOSE_OFF_PLAY` — run branch return:
```ts
return {
  ...state,
  offensePlayCall: 'run',
  defensePlayCall: opponentDefCall ?? 'run-stop',
  offPlayers,
  defPlayers,
  offRolls: new Array(offPlayers.length).fill(null),
  defRolls: new Array(defPlayers.length).fill(null),
  offBonuses: new Array(offPlayers.length).fill(null),
  defBonuses: new Array(defPlayers.length).fill(null),
  phase: 'rolling-offense',
}
```

`CHOOSE_OFF_PLAY` — pass branch return (defPlayers known; offPlayers set in CHOOSE_WR):
```ts
return {
  ...state,
  offensePlayCall: 'pass',
  defPlayers,
  defBonuses: new Array(defPlayers.length).fill(null),
  phase: 'choose-wr',
}
```

`CHOOSE_WR` return:
```ts
return {
  ...state,
  selectedWR: wr,
  defensePlayCall: opponentDefCall,
  offPlayers,
  offRolls: new Array(offPlayers.length).fill(null),
  defRolls: new Array(state.defPlayers.length).fill(null),
  offBonuses: new Array(offPlayers.length).fill(null),
  defBonuses: new Array(state.defPlayers.length).fill(null),
  phase: 'rolling-offense',
}
```

`CHOOSE_DEF_PLAY` return:
```ts
return {
  ...state,
  offensePlayCall: state.opponentPlayCall ?? 'run',
  defensePlayCall: call,
  offPlayers,
  defPlayers,
  offRolls: new Array(offPlayers.length).fill(null),
  defRolls: new Array(defPlayers.length).fill(null),
  offBonuses: new Array(offPlayers.length).fill(null),
  defBonuses: new Array(defPlayers.length).fill(null),
  phase: 'rolling-offense',
}
```

- [ ] **Step 8: Run full test suite**

```bash
npx vitest run
```

Expected: all PASS. TypeScript may warn about the `useReducer` call — that gets fixed next task.

- [ ] **Step 9: Commit**

```bash
git add src/components/game/GameScreen.tsx
git commit -m "feat: add play history, run counters, YAC flags, bonus arrays to GameState"
```

---

## Task 6: Wire ability bonuses into the ROLL case + pass weather + update PlayArea call

**Files:**
- Modify: `src/components/game/GameScreen.tsx`

**Interfaces:**
- Consumes: `AbilityContext`, `computeRollBonus`, `computePostRollBonus`, `isPostRollAbility` from `../../logic/abilityEngine`
- Consumes: `currentWeather` from `useGameStore()`

---

- [ ] **Step 1: Add ability engine imports to GameScreen**

```ts
import {
  computeRollBonus, computePostRollBonus, isPostRollAbility,
} from '../../logic/abilityEngine'
import type { AbilityContext } from '../../logic/abilityEngine'
```

- [ ] **Step 2: Add `isPlayer` type guard near the top of the file (after imports)**

```ts
function isPlayer(p: Player | TeamUnit): p is Player {
  return 'name' in p
}
```

- [ ] **Step 3: Add `buildAbilityContext` helper (module-level, after `isPlayer`)**

```ts
function buildAbilityContext(
  side: 'offense' | 'defense',
  state: GameState,
  allOffRolls: (number | null)[],
  allDefRolls: (number | null)[],
): AbilityContext {
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
  const ownPlayHistory = state.possession === 'user' ? state.userPlayHistory : state.opponentPlayHistory
  const oppPlayHistory = state.possession === 'user' ? state.opponentPlayHistory : state.userPlayHistory
  const ownRunsThisDrive = state.possession === 'user' ? state.userRunsThisDrive : state.opponentRunsThisDrive
  const olineIdx = state.offPlayers.findIndex(p => p.position === 'OLine')
  const olineRoll = olineIdx >= 0 ? (allOffRolls[olineIdx] ?? null) : null
  const wrPlayer = state.offPlayers.find(p => isPlayer(p) && p.position === 'WR') as Player | undefined
  return {
    quarter,
    driveIndex: state.driveIndex,
    possession: state.possession,
    playerSide: side,
    playerTeamIsLosing,
    isLastTeamDrive,
    driveProgress: state.driveProgress,
    down: state.down,
    playCall: state.offensePlayCall!,
    weather: state.weather,
    ownPlayHistory,
    oppPlayHistory,
    ownRunsThisDrive,
    wrYacActive: false,   // overridden per-player below for WRs
    olineRoll,
    opponentWRRating: wrPlayer?.rating,
    allOffRolls,
    allDefRolls,
  }
}
```

- [ ] **Step 4: Add `recomputeBlessed` helper (module-level, after `buildAbilityContext`)**

```ts
function recomputeBlessed(
  players: (Player | TeamUnit)[],
  bonuses: (number | null)[],
  side: 'offense' | 'defense',
  state: GameState,
  allOffRolls: (number | null)[],
  allDefRolls: (number | null)[],
): (number | null)[] {
  const result = [...bonuses]
  players.forEach((player, i) => {
    if (player.ability && isPostRollAbility(player.ability)) {
      const ctx = buildAbilityContext(side, state, allOffRolls, allDefRolls)
      result[i] = computePostRollBonus(player.ability, ctx)
    }
  })
  return result
}
```

- [ ] **Step 5: Update the `ROLL` case in `gameReducer`**

Replace the entire `ROLL` case with:

```ts
case 'ROLL': {
  const { side, index, value } = action
  if (side === 'offense') {
    const newOffRolls = [...state.offRolls]
    newOffRolls[index] = value
    const player = state.offPlayers[index]

    // Roll-time bonus for this player
    let newOffBonuses = [...state.offBonuses]
    if (player.ability && !isPostRollAbility(player.ability)) {
      const isWR = isPlayer(player) && player.position === 'WR'
      const wrYacActive = isWR
        ? (state.selectedWR === 'WR1' ? state.wr1YacActive : state.wr2YacActive)
        : false
      const ctx = { ...buildAbilityContext('offense', state, newOffRolls, state.defRolls), wrYacActive }
      newOffBonuses[index] = computeRollBonus(player.ability, value, ctx)
    }

    // YAC activation: if WR rolls 12+, mark their slot active for future plays
    let newWr1YacActive = state.wr1YacActive
    let newWr2YacActive = state.wr2YacActive
    if (isPlayer(player) && player.position === 'WR' && value >= 12) {
      if (state.selectedWR === 'WR1') newWr1YacActive = true
      else newWr2YacActive = true
    }

    // Re-evaluate Blessed bonuses for all players now that rolls have changed
    newOffBonuses = recomputeBlessed(state.offPlayers, newOffBonuses, 'offense', state, newOffRolls, state.defRolls)
    const newDefBonuses = recomputeBlessed(state.defPlayers, [...state.defBonuses], 'defense', state, newOffRolls, state.defRolls)

    const allDone = newOffRolls.every(r => r !== null)
    return {
      ...state,
      offRolls: newOffRolls,
      offBonuses: newOffBonuses,
      defBonuses: newDefBonuses,
      wr1YacActive: newWr1YacActive,
      wr2YacActive: newWr2YacActive,
      phase: allDone ? 'rolling-defense' : 'rolling-offense',
    }
  }

  // Defense side
  const newDefRolls = [...state.defRolls]
  newDefRolls[index] = value
  const player = state.defPlayers[index]

  // Roll-time bonus for this player
  let newDefBonuses = [...state.defBonuses]
  if (player.ability && !isPostRollAbility(player.ability)) {
    const ctx = buildAbilityContext('defense', state, state.offRolls, newDefRolls)
    newDefBonuses[index] = computeRollBonus(player.ability, value, ctx)
  }

  // Re-evaluate Blessed bonuses
  const newOffBonuses = recomputeBlessed(state.offPlayers, [...state.offBonuses], 'offense', state, state.offRolls, newDefRolls)
  newDefBonuses = recomputeBlessed(state.defPlayers, newDefBonuses, 'defense', state, state.offRolls, newDefRolls)

  const allDone = newDefRolls.every(r => r !== null)
  if (!allDone) {
    return { ...state, defRolls: newDefRolls, defBonuses: newDefBonuses, offBonuses: newOffBonuses }
  }
  const bonus = computeAdvantageBonus(state.offensePlayCall!, state.defensePlayCall!)
  const yards = computeYardsGained(
    state.offRolls as number[],
    newDefRolls as number[],
    bonus,
  )
  return {
    ...state,
    defRolls: newDefRolls,
    defBonuses: newDefBonuses,
    offBonuses: newOffBonuses,
    yardsGained: yards,
    phase: 'show-play-result',
  }
}
```

- [ ] **Step 6: Pull `currentWeather` from store and wire into `useReducer`**

In the `GameScreen` component, update the store destructure to include `currentWeather`:

```ts
// Before:
const { roster, currentOpponentRoster, currentOpponent, recordGameResult } = useGameStore()
// After:
const { roster, currentOpponentRoster, currentOpponent, recordGameResult, currentWeather } = useGameStore()
```

Update the `useReducer` call to pass weather to `makeInitialState`:

```ts
// Before:
const [state, dispatch] = useReducer(gameReducer, undefined, makeInitialState)
// After:
const [state, dispatch] = useReducer(gameReducer, currentWeather ?? 'Clear', makeInitialState)
```

- [ ] **Step 7: Pass `offBonuses` and `defBonuses` to `PlayArea`**

In the `<PlayArea>` JSX (around line 519), add the two new props:

```tsx
<PlayArea
  possession={state.possession}
  phase={state.phase}
  offPlayers={state.offPlayers}
  defPlayers={state.defPlayers}
  offRolls={state.offRolls}
  defRolls={state.defRolls}
  offBonuses={state.offBonuses}
  defBonuses={state.defBonuses}
  offensePlayCall={state.offensePlayCall}
  defensePlayCall={state.defensePlayCall}
  opponentPlayCall={state.opponentPlayCall}
  yardsGained={state.yardsGained}
  fgRoll={state.fgRoll}
  fgDifficulty={state.fgDifficulty}
  driveOutcome={state.driveOutcome}
  kicker={state.possession === 'user' ? userRoster.K : oppRoster.K}
/>
```

- [ ] **Step 8: Run full test suite**

```bash
npx vitest run
```

Expected: all PASS, no TypeScript errors.

- [ ] **Step 9: Run the app and verify bonuses appear**

Start the dev server and play through a game. Confirm:
- Ability names show emoji+name (not raw IDs) in PlayerCard / PlayerPickCard / PlayerRollCard
- After a player rolls, `+ N` or `- N` appears in green/red next to their roll value when the ability applies
- Blessed Evens/Odds bonus updates after each subsequent roll on the play
- YAC activation: WR rolls 12+, no bonus shown; on next play that WR shows `+5`
- Consecutive abilities (Psychic, Stack the Box) increase by +2 each extra consecutive play

- [ ] **Step 10: Commit**

```bash
git add src/components/game/GameScreen.tsx
git commit -m "feat: wire ability bonuses into ROLL reducer — roll-time and post-roll Blessed"
```
