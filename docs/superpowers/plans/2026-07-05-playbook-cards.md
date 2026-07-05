# Playbook Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the binary Run/Pass play selection with a 10-card Playbook system — each drive the user draws 4 cards (or 5 with the 5th-Down rule) from a weighted deck, and those cards are their only options for the whole drive.

**Architecture:** Card definitions and deck logic live in a new `playbookCards.ts` module. A `drawHand(n)` function draws n cards using the seeded `rng`. Card-specific yard effects are computed by a pure `applyCardYards` function (testable in isolation). `GameState` gains `userHand` and `activeCard`; the `ROLL_PAIR` reducer case applies card effects when finalizing yards. Special roll behaviors (roll-twice, floor-value, Deep Shot branching) are handled in `handleStep` and a new `DEEP_SHOT_SWITCH` reducer action.

**Tech Stack:** React + TypeScript, Zustand, Vitest, Tailwind CSS, seeded `rng` from `src/logic/rng.ts`

## Global Constraints

- All randomness must use `rng()` from `src/logic/rng.ts` (never `Math.random`) so games are reproducible from their seed.
- Card draw for the opponent is not needed — `randomPlayCall()` already matches the Dive (run) / Quick Pass (pass) 50/50 split.
- 4 drawn cards are the available options every down of that drive (not consumed on use). On 5th-Down rule drives, 5 cards are drawn. Go-for-it bonus plays use the same hand.
- Defense (Run Stop / Pass Stop) is unchanged.
- Existing abilities continue to apply to their players as normal — no ability-card interactions to implement.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/types/index.ts` | Modify | Add `PlaybookCard`, `PlaybookCardId`, `CardMechanic`, `CardYardsContext` |
| `src/logic/playbookCards.ts` | Create | Card definitions, `CARDS`, `drawHand`, `applyCardYards` |
| `src/logic/playbookCards.test.ts` | Create | Tests for `drawHand` and `applyCardYards` |
| `src/components/game/PlaybookCardButton.tsx` | Create | Presentational card button: name + description |
| `src/components/game/GameScreen.tsx` | Modify | State fields, driveReset, choose-offense UI, rolling mechanics, ROLL_PAIR yards |
| `src/components/game/PlayArea.tsx` | Modify | Card name in matchup badge; card bonus in advantage breakdown |

---

## Task 1: Types + playbookCards.ts + tests

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/logic/playbookCards.ts`
- Create: `src/logic/playbookCards.test.ts`

**Interfaces:**
- Produces: `PlaybookCard`, `PlaybookCardId`, `CardMechanic`, `CardYardsContext` (used by Tasks 3–7)
- Produces: `drawHand(n: number): PlaybookCard[]` (used by Tasks 3, 4)
- Produces: `applyCardYards(card, offTotal, defTotal, advantageBonus, ctx): { yards: number; cardBonus: number }` (used by Task 6)
- Produces: `CARDS` record (used by tests and Task 4)

- [ ] **Step 1: Add types to `src/types/index.ts`**

Append after the last export in the file:

```typescript
export type CardMechanic =
  | 'vanilla'
  | 'off-tackle'
  | 'power-run'
  | 'ramp-run'
  | 'play-action-bonus'
  | 'double-move'
  | 'checkdown'
  | 'threshold-shot'
  | 'hail-mary'

export type PlaybookCardId =
  | 'dive' | 'quick-pass' | 'off-tackle' | 'power-run'
  | 'ground-and-pound' | 'play-action' | 'double-move'
  | 'checkdown' | 'deep-shot' | 'hail-mary'

export interface PlaybookCard {
  id: PlaybookCardId
  name: string
  description: string
  playType: 'run' | 'pass'
  mechanic: CardMechanic
}

export interface CardYardsContext {
  runsThisDrive: number
  prevPlayCall: 'run' | 'pass' | null
  qbRoll: number
}
```

- [ ] **Step 2: Create `src/logic/playbookCards.ts`**

```typescript
import { rng } from './rng'
import type { PlaybookCard, PlaybookCardId, CardYardsContext } from '../types'

export const CARDS: Record<PlaybookCardId, PlaybookCard> = {
  'dive': {
    id: 'dive',
    name: 'Dive',
    description: 'RB + OLine. Straight ahead, no frills.',
    playType: 'run',
    mechanic: 'vanilla',
  },
  'quick-pass': {
    id: 'quick-pass',
    name: 'Quick Pass',
    description: 'QB + OLine + WR. Standard pass play.',
    playType: 'pass',
    mechanic: 'vanilla',
  },
  'off-tackle': {
    id: 'off-tackle',
    name: 'Off Tackle',
    description: 'RB rolls twice, keep lower. Guaranteed non-negative yards.',
    playType: 'run',
    mechanic: 'off-tackle',
  },
  'power-run': {
    id: 'power-run',
    name: 'Power Run',
    description: 'RB rolls twice, keep higher. OLine rolls normally.',
    playType: 'run',
    mechanic: 'power-run',
  },
  'ground-and-pound': {
    id: 'ground-and-pound',
    name: 'Ground & Pound',
    description: 'RB + OLine. +3 per prior run this drive (max +12).',
    playType: 'run',
    mechanic: 'ramp-run',
  },
  'play-action': {
    id: 'play-action',
    name: 'Play Action',
    description: 'QB + OLine + WR. +8 bonus if previous play was a run.',
    playType: 'pass',
    mechanic: 'play-action-bonus',
  },
  'double-move': {
    id: 'double-move',
    name: 'Double Move',
    description: 'QB + OLine + WR. WR rolls twice, keep higher.',
    playType: 'pass',
    mechanic: 'double-move',
  },
  'checkdown': {
    id: 'checkdown',
    name: 'Checkdown',
    description: 'QB + OLine + WR. WR uses floor value. Turnover-immune.',
    playType: 'pass',
    mechanic: 'checkdown',
  },
  'deep-shot': {
    id: 'deep-shot',
    name: 'Deep Shot',
    description: 'WR rolls solo. If ≥14: full value vs no defense. If not: OLine vs DLine.',
    playType: 'pass',
    mechanic: 'threshold-shot',
  },
  'hail-mary': {
    id: 'hail-mary',
    name: 'Hail Mary',
    description: 'QB + OLine + WR. If QB ≥16: offense×2. Otherwise: 0 yards.',
    playType: 'pass',
    mechanic: 'hail-mary',
  },
}

const DECK_WEIGHTS: { card: PlaybookCard; weight: number }[] = [
  { card: CARDS['dive'],           weight: 3 },
  { card: CARDS['quick-pass'],     weight: 3 },
  { card: CARDS['off-tackle'],     weight: 1 },
  { card: CARDS['power-run'],      weight: 1 },
  { card: CARDS['ground-and-pound'], weight: 1 },
  { card: CARDS['play-action'],    weight: 1 },
  { card: CARDS['double-move'],    weight: 1 },
  { card: CARDS['checkdown'],      weight: 1 },
  { card: CARDS['deep-shot'],      weight: 1 },
  { card: CARDS['hail-mary'],      weight: 1 },
]

const TOTAL_WEIGHT = DECK_WEIGHTS.reduce((sum, { weight }) => sum + weight, 0) // 14

export function drawHand(n: number): PlaybookCard[] {
  const hand: PlaybookCard[] = []
  for (let i = 0; i < n; i++) {
    let r = rng() * TOTAL_WEIGHT
    for (const { card, weight } of DECK_WEIGHTS) {
      r -= weight
      if (r <= 0) {
        hand.push(card)
        break
      }
    }
  }
  return hand
}

export function applyCardYards(
  card: PlaybookCard | null,
  offTotal: number,
  defTotal: number,
  advantageBonus: number,
  ctx: CardYardsContext,
): { yards: number; cardBonus: number } {
  const baseYards = offTotal - defTotal + advantageBonus
  if (!card) return { yards: baseYards, cardBonus: 0 }

  switch (card.mechanic) {
    case 'off-tackle':
      return { yards: Math.max(0, baseYards), cardBonus: 0 }
    case 'ramp-run': {
      const bonus = Math.min(12, 3 * ctx.runsThisDrive)
      return { yards: baseYards + bonus, cardBonus: bonus }
    }
    case 'play-action-bonus': {
      const bonus = ctx.prevPlayCall === 'run' ? 8 : 0
      return { yards: baseYards + bonus, cardBonus: bonus }
    }
    case 'hail-mary': {
      if (ctx.qbRoll >= 16) {
        return { yards: offTotal * 2 - defTotal + advantageBonus, cardBonus: offTotal }
      }
      // Failed: yards=0; cardBonus is the negative adjustment to make the breakdown sum to 0
      return { yards: 0, cardBonus: -baseYards }
    }
    default:
      return { yards: baseYards, cardBonus: 0 }
  }
}
```

- [ ] **Step 3: Write failing tests in `src/logic/playbookCards.test.ts`**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { seedRng } from './rng'
import { drawHand, applyCardYards, CARDS } from './playbookCards'

describe('drawHand', () => {
  beforeEach(() => { seedRng('test-seed-playbookcards') })

  it('returns exactly n cards', () => {
    expect(drawHand(4)).toHaveLength(4)
    expect(drawHand(5)).toHaveLength(5)
  })

  it('all returned cards are valid PlaybookCards', () => {
    const hand = drawHand(4)
    for (const card of hand) {
      expect(card.id).toBeDefined()
      expect(card.name).toBeDefined()
      expect(['run', 'pass']).toContain(card.playType)
      expect(card.mechanic).toBeDefined()
    }
  })

  it('skews toward Dive and Quick Pass over specialty cards', () => {
    seedRng('distribution-test-playbookcards')
    const counts: Record<string, number> = {}
    for (let i = 0; i < 1000; i++) {
      const [card] = drawHand(1)
      counts[card.id] = (counts[card.id] ?? 0) + 1
    }
    const diveCount = counts['dive'] ?? 0
    const offtackleCount = counts['off-tackle'] ?? 0
    expect(diveCount).toBeGreaterThan(offtackleCount * 1.5)
    expect(counts['quick-pass'] ?? 0).toBeGreaterThan(offtackleCount * 1.5)
  })
})

describe('applyCardYards', () => {
  const baseCtx: import('../types').CardYardsContext = {
    runsThisDrive: 0,
    prevPlayCall: null,
    qbRoll: 0,
  }

  it('vanilla: returns standard yards with no card bonus', () => {
    const result = applyCardYards(CARDS['dive'], 15, 8, 5, baseCtx)
    expect(result).toEqual({ yards: 12, cardBonus: 0 })
  })

  it('off-tackle: floors net yards at 0', () => {
    const result = applyCardYards(CARDS['off-tackle'], 5, 20, -5, baseCtx)
    expect(result.yards).toBe(0)
    expect(result.cardBonus).toBe(0)
  })

  it('off-tackle: positive yards pass through unchanged', () => {
    const result = applyCardYards(CARDS['off-tackle'], 15, 5, 5, baseCtx)
    expect(result.yards).toBe(15)
  })

  it('ramp-run: +3 per run, capped at +12', () => {
    expect(applyCardYards(CARDS['ground-and-pound'], 10, 5, 5, { ...baseCtx, runsThisDrive: 0 }).cardBonus).toBe(0)
    expect(applyCardYards(CARDS['ground-and-pound'], 10, 5, 5, { ...baseCtx, runsThisDrive: 2 }).cardBonus).toBe(6)
    expect(applyCardYards(CARDS['ground-and-pound'], 10, 5, 5, { ...baseCtx, runsThisDrive: 4 }).cardBonus).toBe(12)
    expect(applyCardYards(CARDS['ground-and-pound'], 10, 5, 5, { ...baseCtx, runsThisDrive: 10 }).cardBonus).toBe(12)
  })

  it('ramp-run: adds bonus to base yards', () => {
    const result = applyCardYards(CARDS['ground-and-pound'], 10, 5, 5, { ...baseCtx, runsThisDrive: 3 })
    expect(result.yards).toBe(10 - 5 + 5 + 9)  // 19
    expect(result.cardBonus).toBe(9)
  })

  it('play-action-bonus: +8 if prev was run, 0 otherwise', () => {
    expect(applyCardYards(CARDS['play-action'], 10, 5, 5, { ...baseCtx, prevPlayCall: 'run' }).cardBonus).toBe(8)
    expect(applyCardYards(CARDS['play-action'], 10, 5, 5, { ...baseCtx, prevPlayCall: 'pass' }).cardBonus).toBe(0)
    expect(applyCardYards(CARDS['play-action'], 10, 5, 5, { ...baseCtx, prevPlayCall: null }).cardBonus).toBe(0)
  })

  it('play-action-bonus: adds bonus to yards', () => {
    const result = applyCardYards(CARDS['play-action'], 10, 5, 5, { ...baseCtx, prevPlayCall: 'run' })
    expect(result.yards).toBe(10 - 5 + 5 + 8)  // 18
  })

  it('hail-mary success (QB >= 16): offTotal×2 − defTotal + bonus', () => {
    const result = applyCardYards(CARDS['hail-mary'], 12, 6, 5, { ...baseCtx, qbRoll: 16 })
    expect(result.yards).toBe(12 * 2 - 6 + 5)  // 23
    expect(result.cardBonus).toBe(12)
  })

  it('hail-mary: QB exactly 16 is success', () => {
    const result = applyCardYards(CARDS['hail-mary'], 12, 6, 5, { ...baseCtx, qbRoll: 16 })
    expect(result.yards).toBeGreaterThan(0)
  })

  it('hail-mary fail (QB < 16): yards = 0, breakdown sums correctly', () => {
    const result = applyCardYards(CARDS['hail-mary'], 12, 6, 5, { ...baseCtx, qbRoll: 15 })
    expect(result.yards).toBe(0)
    // cardBonus offsets the base yards so breakdown: offTotal - defTotal + bonus + cardBonus = 0
    expect(12 - 6 + 5 + result.cardBonus).toBe(0)
  })

  it('null card: returns standard yards', () => {
    const result = applyCardYards(null, 10, 5, 5, baseCtx)
    expect(result).toEqual({ yards: 10, cardBonus: 0 })
  })
})
```

- [ ] **Step 4: Run tests to verify they fail (playbookCards.ts exists but applyCardYards not yet wired)**

```bash
npx vitest run src/logic/playbookCards.test.ts
```

Expected: tests for `drawHand` pass (file exists), tests for `applyCardYards` pass (function is defined). All tests should pass after Step 2 and 3.

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/logic/playbookCards.ts src/logic/playbookCards.test.ts
git commit -m "feat: add PlaybookCard types, deck, drawHand, and applyCardYards"
```

---

## Task 2: PlaybookCardButton component

**Files:**
- Create: `src/components/game/PlaybookCardButton.tsx`

**Interfaces:**
- Consumes: `PlaybookCard` from `src/types`
- Produces: `PlaybookCardButton({ card, onClick, disabled? })` (used by Task 3)

- [ ] **Step 1: Create `src/components/game/PlaybookCardButton.tsx`**

```tsx
import type { PlaybookCard } from '../../types'

interface PlaybookCardButtonProps {
  card: PlaybookCard
  onClick: () => void
  disabled?: boolean
}

export function PlaybookCardButton({ card, onClick, disabled }: PlaybookCardButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="text-left bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-indigo-500 rounded-xl p-4 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed w-full"
    >
      <p className="font-bold text-white text-sm leading-tight">{card.name}</p>
      <p className="text-gray-400 text-xs mt-1 leading-snug">{card.description}</p>
    </button>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/game/PlaybookCardButton.tsx
git commit -m "feat: add PlaybookCardButton component"
```

---

## Task 3: GameScreen — state fields, driveReset, makeInitialState

**Files:**
- Modify: `src/components/game/GameScreen.tsx`

**Interfaces:**
- Consumes: `PlaybookCard`, `CardYardsContext` from `src/types`; `drawHand` from `src/logic/playbookCards`
- Produces: `state.userHand: PlaybookCard[]`, `state.activeCard: PlaybookCard | null`, `state.cardBonus: number`, `state.deepShotFallback` (used by Tasks 4–6)

- [ ] **Step 1: Add imports to GameScreen.tsx**

At the top of the file, add to the existing imports:

```typescript
import { drawHand, applyCardYards } from '../../logic/playbookCards'
import type { PlaybookCard } from '../../types'
```

- [ ] **Step 2: Add new fields to the `GameState` interface**

Find the `interface GameState {` block and add these fields:

```typescript
  userHand: PlaybookCard[]
  activeCard: PlaybookCard | null
  cardBonus: number
  deepShotFallback: { off: (Player | TeamUnit)[]; def: (Player | TeamUnit)[] } | null
```

- [ ] **Step 3: Update `driveReset()` to accept `maxDowns` and draw the hand**

Change the function signature and add the new fields to its return:

```typescript
function driveReset(maxDowns: number): Partial<GameState> {
  return {
    down: 1,
    driveProgress: STARTING_YARD_LINE,
    downHistory: [],
    wentForIt: false,
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
    activeFgPoints: null,
    userRunsThisDrive: 0,
    opponentRunsThisDrive: 0,
    wr1YacActive: false,
    wr2YacActive: false,
    offBonuses: [],
    defBonuses: [],
    currentDriveYards: 0,
    currentDrivePassYards: 0,
    currentDriveRushYards: 0,
    currentDriveNegativePlays: 0,
    userPassPlaysThisDrive: 0,
    opponentPassPlaysThisDrive: 0,
    userDriveWR1Plays: 0,
    userDriveWR2Plays: 0,
    opponentDriveWR1Plays: 0,
    turnoverYardLine: null,
    userHand: drawHand(maxDowns),
    activeCard: null,
    cardBonus: 0,
    deepShotFallback: null,
  }
}
```

- [ ] **Step 4: Update `playReset()` to clear card state**

Add to the object returned by `playReset()`:

```typescript
    activeCard: null,
    cardBonus: 0,
    deepShotFallback: null,
```

- [ ] **Step 5: Update `makeInitialState` to include card fields**

In `makeInitialState`, add to the returned object:

```typescript
    userHand: drawHand(overrides.maxDowns),
    activeCard: null,
    cardBonus: 0,
    deepShotFallback: null,
```

- [ ] **Step 6: Update the `ADVANCE_DRIVE` reducer case to pass `maxDowns`**

Find the `ADVANCE_DRIVE` case. It calls `...driveReset()` — change it to `...driveReset(state.maxDowns)`.

- [ ] **Step 7: Update the `BACK_TO_PLAY_CHOICE` reducer case to clear card state**

Find the `BACK_TO_PLAY_CHOICE` case and add:

```typescript
    activeCard: null,
    deepShotFallback: null,
```

- [ ] **Step 8: Update `CHOOSE_OFF_PLAY` action type to carry the card**

Find the `GameAction` type and update the `CHOOSE_OFF_PLAY` variant:

```typescript
  | { type: 'CHOOSE_OFF_PLAY'; call: 'run' | 'pass'; opponentDefCall?: 'run-stop' | 'pass-stop'; offPlayers: (Player | TeamUnit)[]; defPlayers: (Player | TeamUnit)[]; card: PlaybookCard }
```

- [ ] **Step 9: Update the `CHOOSE_OFF_PLAY` reducer case to set `activeCard`**

In the run branch, add `activeCard: action.card`. In the pass branch, add `activeCard: action.card`:

```typescript
    case 'CHOOSE_OFF_PLAY': {
      const { call, opponentDefCall, offPlayers, defPlayers, card } = action
      if (call === 'pass') {
        return {
          ...state,
          offensePlayCall: 'pass',
          defPlayers,
          defBonuses: new Array(defPlayers.length).fill(null),
          activeCard: card,
          phase: 'choose-wr',
        }
      }
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
        activeCard: card,
        phase: 'rolling-pairs',
      }
    }
```

- [ ] **Step 10: Update `SHOW_RUNNER_CHOICE` to carry the card**

Update the action type:

```typescript
  | { type: 'SHOW_RUNNER_CHOICE'; card: PlaybookCard }
```

Update the reducer case:

```typescript
    case 'SHOW_RUNNER_CHOICE': {
      return { ...state, phase: 'choose-runner', activeCard: action.card }
    }
```

- [ ] **Step 11: Update `CHOOSE_WR` action type to carry deepShotFallback**

```typescript
  | { type: 'CHOOSE_WR'; wr: 'WR1' | 'WR2' | 'RB'; opponentDefCall: 'run-stop' | 'pass-stop'; offPlayers: (Player | TeamUnit)[]; deepShotFallback?: { off: (Player | TeamUnit)[]; def: (Player | TeamUnit)[] } }
```

Update the `CHOOSE_WR` reducer case to store it:

```typescript
    case 'CHOOSE_WR': {
      const { wr, opponentDefCall, offPlayers } = action
      return {
        ...state,
        selectedWR: wr,
        defensePlayCall: opponentDefCall,
        offPlayers,
        offRolls: new Array(offPlayers.length).fill(null),
        defRolls: new Array(state.defPlayers.length).fill(null),
        offBonuses: new Array(offPlayers.length).fill(null),
        defBonuses: new Array(state.defPlayers.length).fill(null),
        deepShotFallback: action.deepShotFallback ?? null,
        phase: 'rolling-pairs',
      }
    }
```

- [ ] **Step 12: Add `DEEP_SHOT_SWITCH` action type**

Add to `GameAction`:

```typescript
  | { type: 'DEEP_SHOT_SWITCH'; offPlayers: (Player | TeamUnit)[]; defPlayers: (Player | TeamUnit)[] }
```

Add the reducer case (before `default:`):

```typescript
    case 'DEEP_SHOT_SWITCH': {
      const { offPlayers, defPlayers } = action
      return {
        ...state,
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

- [ ] **Step 13: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors (or only pre-existing errors unrelated to the new fields).

- [ ] **Step 14: Commit**

```bash
git add src/components/game/GameScreen.tsx
git commit -m "feat: add card state fields and reducer actions to GameScreen"
```

---

## Task 4: GameScreen — choose-offense UI and handleCardPlay

**Files:**
- Modify: `src/components/game/GameScreen.tsx`

**Interfaces:**
- Consumes: `PlaybookCardButton` from Task 2; `state.userHand`, `state.activeCard` from Task 3
- Produces: `handleCardPlay(card)` replacing `handleOffPlay`

- [ ] **Step 1: Add PlaybookCardButton import**

```typescript
import { PlaybookCardButton } from './PlaybookCardButton'
```

- [ ] **Step 2: Replace `handleOffPlay` with `handleCardPlay`**

Remove the existing `handleOffPlay` function entirely. Add in its place:

```typescript
  function handleCardPlay(card: PlaybookCard) {
    if (card.playType === 'run' && userRoster.QB?.ability === 'dual-threat-qb') {
      dispatch({ type: 'SHOW_RUNNER_CHOICE', card })
      return
    }
    if (card.playType === 'run') {
      const opponentDefCall = randomDefCall()
      const offPlayers = getOffensePlayers(userRoster, 'run', 'WR1')
      const defPlayers = getDefensePlayers(oppRoster, 'run')
      dispatch({ type: 'CHOOSE_OFF_PLAY', call: 'run', opponentDefCall, offPlayers, defPlayers, card })
    } else {
      // pass card — determine initial defPlayers (empty for Deep Shot; normal for others)
      const defPlayers = card.mechanic === 'threshold-shot'
        ? []
        : getDefensePlayers(oppRoster, 'pass')
      dispatch({ type: 'CHOOSE_OFF_PLAY', call: 'pass', offPlayers: [], defPlayers, card })
    }
  }
```

- [ ] **Step 3: Update `handleRunnerChoice` to pass card through**

The existing function dispatches `CHOOSE_RUNNER` — that action doesn't need to change (the card is already in state from `SHOW_RUNNER_CHOICE`). No change needed here.

- [ ] **Step 4: Update `handleReceiverChoice` to handle Deep Shot**

Find `handleReceiverChoice`. Add a Deep Shot branch at the top:

```typescript
  function handleReceiverChoice(slot: 'WR1' | 'WR2' | 'RB') {
    const opponentDefCall = randomDefCall()

    // Deep Shot: WR rolls solo vs no defense; pre-compute OLine fallback
    if (state.activeCard?.mechanic === 'threshold-shot') {
      const wr = slot === 'WR2' ? userRoster.WR2 : slot === 'RB' ? userRoster.RB : userRoster.WR1
      const offPlayers = [wr].filter(Boolean) as (Player | TeamUnit)[]
      const fallbackOff = [userRoster.OLine].filter(Boolean) as (Player | TeamUnit)[]
      const fallbackDef = [oppRoster.DLine].filter(Boolean) as (Player | TeamUnit)[]
      dispatch({
        type: 'CHOOSE_WR',
        wr: slot,
        opponentDefCall,
        offPlayers,
        deepShotFallback: { off: fallbackOff, def: fallbackDef },
      })
      return
    }

    if (slot === 'RB') {
      const offPlayers = [userRoster.QB, userRoster.OLine, userRoster.RB].filter(Boolean) as (Player | TeamUnit)[]
      dispatch({ type: 'CHOOSE_WR', wr: 'RB', opponentDefCall, offPlayers })
    } else {
      const offPlayers = getOffensePlayers(userRoster, 'pass', slot)
      dispatch({ type: 'CHOOSE_WR', wr: slot, opponentDefCall, offPlayers })
    }
  }
```

- [ ] **Step 5: Replace the `choose-offense` UI**

Find the `{state.phase === 'choose-offense' && (` block and replace it entirely:

```tsx
        {state.phase === 'choose-offense' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Choose your play</p>
            <div className="grid grid-cols-2 gap-3 w-full max-w-lg px-6">
              {state.userHand.map((card, i) => (
                <PlaybookCardButton
                  key={i}
                  card={card}
                  onClick={() => handleCardPlay(card)}
                />
              ))}
            </div>
            {state.driveProgress >= activeFgRangeYard && (
              <Button size="lg" onClick={handleKickFG}>
                🦵 Kick FG (beat {computeFGDifficulty(state.driveProgress, activeFgRangeYard, state.tdYard)})
              </Button>
            )}
          </div>
        )}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Manual smoke test**

Run `npm run dev`, start a game. Verify:
- `choose-offense` shows 4 card buttons (not Run/Pass)
- Dive/Quick Pass appear more often than specialty cards across a few drives
- Clicking a run card proceeds to rolling
- Clicking a pass card proceeds to WR selection
- WR selection screen still works correctly

- [ ] **Step 8: Commit**

```bash
git add src/components/game/GameScreen.tsx
git commit -m "feat: replace Run/Pass buttons with playbook card grid"
```

---

## Task 5: GameScreen — special rolling mechanics

**Files:**
- Modify: `src/components/game/GameScreen.tsx`

**Interfaces:**
- Consumes: `state.activeCard` from Task 3
- Produces: correct roll values for Off Tackle, Power Run, Double Move, Checkdown, Deep Shot

- [ ] **Step 1: Update `handleStep` rolling-pairs case with card-aware rolling**

Find the `case 'rolling-pairs':` block inside `handleStep`. Replace the entire case with:

```typescript
      case 'rolling-pairs': {
        const offIdx = state.offRolls.findIndex(r => r === null)
        if (offIdx === -1) return
        const offPlayer = state.offPlayers[offIdx]
        const mechanic = state.activeCard?.mechanic
        const isFirstOff = offIdx === 0
        const isLastOff = offIdx === state.offPlayers.length - 1

        let offValue: number
        if (mechanic === 'off-tackle' && isFirstOff) {
          // RB rolls twice, keep lower
          const r1 = rollDie(getPlayerDie(offPlayer))
          const r2 = rollDie(getPlayerDie(offPlayer))
          offValue = Math.min(r1, r2)
        } else if (mechanic === 'power-run' && isFirstOff) {
          // RB rolls twice, keep higher
          const r1 = rollDie(getPlayerDie(offPlayer))
          const r2 = rollDie(getPlayerDie(offPlayer))
          offValue = Math.max(r1, r2)
        } else if (mechanic === 'double-move' && isLastOff) {
          // WR rolls twice, keep higher
          const r1 = rollDie(getPlayerDie(offPlayer))
          const r2 = rollDie(getPlayerDie(offPlayer))
          offValue = Math.max(r1, r2)
        } else if (mechanic === 'checkdown' && isLastOff) {
          // WR uses floor value — no randomness
          const die = getPlayerDie(offPlayer)
          offValue = Math.min(...die)
        } else {
          offValue = rollDie(getPlayerDie(offPlayer))
        }

        const defIdx = offIdx - 1
        const defPlayer = defIdx >= 0 && defIdx < state.defPlayers.length ? state.defPlayers[defIdx] : null
        const defValue = defPlayer ? rollDie(getPlayerDie(defPlayer)) : null

        dispatch({ type: 'ROLL_PAIR', offIndex: offIdx, offValue, defIndex: defPlayer ? defIdx : null, defValue })
        break
      }
```

- [ ] **Step 2: Handle Deep Shot branching in `ROLL_PAIR` reducer**

In the `ROLL_PAIR` reducer case, find where the turnover check happens. Add the Deep Shot threshold check BEFORE the turnover check (so we handle the switch before any turnover logic runs):

```typescript
      // Deep Shot: after WR rolls, branch on threshold
      if (state.activeCard?.mechanic === 'threshold-shot' && offIndex === 0) {
        if (offValue >= 14) {
          // Success: WR's raw value is the full offense; no defense paired
          const advBonus = computeAdvantageBonus(state.offensePlayCall!, state.defensePlayCall!)
          return {
            ...state,
            offRolls: newOffRolls,
            defRolls: newDefRolls,
            offBonuses: newOffBonuses,
            defBonuses: newDefBonuses,
            yardsGained: offValue + advBonus,
            phase: 'show-play-result',
          }
        } else {
          // Fail: switch to OLine vs DLine using pre-stored fallback
          const fallback = state.deepShotFallback ?? { off: [], def: [] }
          return {
            ...state,
            offPlayers: fallback.off,
            defPlayers: fallback.def,
            offRolls: new Array(fallback.off.length).fill(null),
            defRolls: new Array(fallback.def.length).fill(null),
            offBonuses: new Array(fallback.off.length).fill(null),
            defBonuses: new Array(fallback.def.length).fill(null),
            phase: 'rolling-pairs',
          }
        }
      }
```

Place this block immediately after `const allDone = ...` is set and BEFORE the existing `if (!allDone)` check. Actually, place it BEFORE the turnover check — specifically after `newOffBonuses = recomputeBlessed(...)` and `newDefBonuses = recomputeBlessed(...)` but before `const defTurnoverNums = ...`.

- [ ] **Step 3: Add Checkdown turnover immunity in `ROLL_PAIR`**

Find the turnover check in `ROLL_PAIR`:

```typescript
      const defTurnoverNums = state.possession === 'user' ? state.opponentTurnoverNumbers : state.userTurnoverNumbers
      if (defTurnoverNums.includes(offValue)) {
```

Wrap the `if` with a Checkdown guard:

```typescript
      const defTurnoverNums = state.possession === 'user' ? state.opponentTurnoverNumbers : state.userTurnoverNumbers
      if (state.activeCard?.mechanic !== 'checkdown' && defTurnoverNums.includes(offValue)) {
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Manual test — special card mechanics**

Run `npm run dev`. Test each card:

- **Off Tackle**: Play it. RB's roll should feel lower on average. Verify net yards never go below 0.
- **Power Run**: Play it. RB's roll should feel higher on average.
- **Double Move**: Play it. WR roll should be notably higher than a single roll.
- **Checkdown**: Play it. WR shows a fixed value (the die's minimum). Verify intentionally triggering a turnover number does NOT cause a turnover.
- **Deep Shot**: Play it. After WR selection, only the WR rolls first. If ≥14: result shown immediately. If <14: OLine appears and rolls vs DLine.

- [ ] **Step 6: Commit**

```bash
git add src/components/game/GameScreen.tsx
git commit -m "feat: implement special card rolling mechanics (off-tackle, power-run, double-move, checkdown, deep-shot)"
```

---

## Task 6: GameScreen — ROLL_PAIR card yards (Ground & Pound, Play Action, Hail Mary, Off Tackle floor)

**Files:**
- Modify: `src/components/game/GameScreen.tsx`

**Interfaces:**
- Consumes: `applyCardYards` from `src/logic/playbookCards`; `state.activeCard`, `state.cardBonus` from Task 3
- Produces: `state.cardBonus` set correctly; `state.yardsGained` uses card-adjusted yards

- [ ] **Step 1: Replace the yards computation in `ROLL_PAIR` when `allDone`**

Find the section in `ROLL_PAIR` that runs when all rolls are complete:

```typescript
      // Compute final yards and show result
      const bonus = computeAdvantageBonus(state.offensePlayCall!, state.defensePlayCall!)
      const yards = computeYardsGained(newOffRolls as number[], newDefRolls as number[], bonus)
      return {
        ...state,
        offRolls: newOffRolls,
        ...
        yardsGained: yards,
        ...
        phase: 'show-play-result',
      }
```

Replace with:

```typescript
      // Compute final yards with card effects
      const advBonus = computeAdvantageBonus(state.offensePlayCall!, state.defensePlayCall!)
      const offTotal = (newOffRolls as number[]).reduce((a, b) => a + b, 0)
      const defTotal = (newDefRolls as number[]).reduce((a, b) => a + b, 0)
      const runsThisDrive = state.possession === 'user' ? state.userRunsThisDrive : state.opponentRunsThisDrive
      const prevPlayCall = state.downHistory.length > 0
        ? state.downHistory[state.downHistory.length - 1].playCall
        : null
      const { yards, cardBonus } = applyCardYards(
        state.possession === 'user' ? state.activeCard : null,
        offTotal,
        defTotal,
        advBonus,
        { runsThisDrive, prevPlayCall, qbRoll: (newOffRolls[0] as number) ?? 0 },
      )
      return {
        ...state,
        offRolls: newOffRolls,
        defRolls: newDefRolls,
        offBonuses: newOffBonuses,
        defBonuses: newDefBonuses,
        wr1YacActive: newWr1YacActive,
        wr2YacActive: newWr2YacActive,
        yardsGained: yards,
        cardBonus,
        userAbsorbHits: state.userAbsorbHits + absorbHitsDelta,
        phase: 'show-play-result',
      }
```

Note: `applyCardYards` is only applied for the user's offense (`state.possession === 'user'`). The opponent always plays vanilla Dive or Quick Pass so `applyCardYards(null, ...)` returns standard yards.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Manual test — resolve-time card effects**

Run `npm run dev`. Test:

- **Ground & Pound**: Play it on down 2 after a run on down 1. Verify the net yards are higher than the raw offense-defense difference (bonus = +3).
- **Play Action**: Play it on down 2 after a run on down 1. Verify +8 bonus shows in the advantage breakdown. Play it after a pass — verify no bonus.
- **Hail Mary success**: Draw or force Hail Mary (edit weights temporarily). Roll QB; if it shows ≥16, verify yards = offTotal×2 − defTotal + advantage.
- **Hail Mary fail**: Verify yards = 0 regardless of other rolls.
- **Off Tackle**: Verify net yards can't go below 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/game/GameScreen.tsx
git commit -m "feat: apply card yard effects in ROLL_PAIR (ground-and-pound, play-action, hail-mary, off-tackle floor)"
```

---

## Task 7: PlayArea — card name in badge + card bonus in breakdown

**Files:**
- Modify: `src/components/game/PlayArea.tsx`
- Modify: `src/components/game/GameScreen.tsx` (pass new props)

**Interfaces:**
- Consumes: `PlaybookCard` from `src/types`; `state.activeCard`, `state.cardBonus` from Task 3

- [ ] **Step 1: Add props to `PlayAreaProps`**

In `PlayArea.tsx`, find `interface PlayAreaProps` and add:

```typescript
  activeCard?: import('../../types').PlaybookCard | null
  cardBonus?: number | null
```

- [ ] **Step 2: Update the play-call matchup badge to show card name**

Find the block that renders the offense badge:

```tsx
          {matchupOff && (
            <span className="bg-indigo-900/50 text-indigo-300 px-3 py-1 rounded-full font-bold">
              {PLAY_CALL_LABELS[matchupOff]}
            </span>
          )}
```

Replace with:

```tsx
          {matchupOff && (
            <span className="bg-indigo-900/50 text-indigo-300 px-3 py-1 rounded-full font-bold">
              {activeCard ? activeCard.name.toUpperCase() : PLAY_CALL_LABELS[matchupOff]}
            </span>
          )}
```

- [ ] **Step 3: Add card bonus line to the advantage breakdown**

In the `show-play-result` breakdown section (the IIFE that renders the breakdown panel), add a card bonus line after the ability bonuses block and before the divider line:

```tsx
              {cardBonus !== null && cardBonus !== undefined && cardBonus !== 0 && (() => {
                let label = activeCard?.name ?? 'Card'
                if (activeCard?.mechanic === 'hail-mary') {
                  label = cardBonus > 0 ? 'Hail Mary (×2)' : 'Hail Mary (Failed)'
                } else if (activeCard?.mechanic === 'ramp-run') {
                  label = 'Ground & Pound'
                } else if (activeCard?.mechanic === 'play-action-bonus') {
                  label = 'Play Action'
                }
                return (
                  <div className="flex justify-between mb-2">
                    <span className="text-amber-400 font-semibold">{label}</span>
                    <span className={`font-bold tabular-nums ${cardBonus >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {cardBonus >= 0 ? '+' : ''}{cardBonus}
                    </span>
                  </div>
                )
              })()}
```

- [ ] **Step 4: Pass `activeCard` and `cardBonus` from GameScreen to PlayArea**

In `GameScreen.tsx`, find where `<PlayArea` is rendered. Add the two new props:

```tsx
            <PlayArea
              ...existing props...
              activeCard={state.activeCard}
              cardBonus={state.cardBonus}
            />
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Manual test**

Run `npm run dev`. Verify:
- The matchup badge shows the card name (e.g., "GROUND & POUND") instead of "RUN" or "PASS".
- Ground & Pound shows its bonus in the breakdown with a yellow label and green value.
- Play Action shows its +8 in the breakdown when triggered.
- Hail Mary shows "Hail Mary (×2)" on success or "Hail Mary (Failed)" on fail.
- Off Tackle: no special breakdown line (floor doesn't add bonus), but net yards never go below 0.
- Dive and Quick Pass: no card bonus line in breakdown.

- [ ] **Step 7: Run the full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/components/game/PlayArea.tsx src/components/game/GameScreen.tsx
git commit -m "feat: show card name in matchup badge and card bonus in breakdown"
```

---

## Self-Review

**Spec coverage check:**
- ✅ 10 cards defined (Dive, Quick Pass, Off Tackle, Power Run, Ground & Pound, Play Action, Double Move, Checkdown, Deep Shot, Hail Mary)
- ✅ Weighted draw with Dive=3, Quick Pass=3, all others=1
- ✅ 4 cards drawn per drive; 5 for 5th-Down rule (via `maxDowns`)
- ✅ Cards are options available all drive (not consumed on use)
- ✅ Defense unchanged (Run Stop / Pass Stop)
- ✅ All pass cards flow through `choose-wr`
- ✅ Deep Shot WR-first branching with OLine fallback
- ✅ Off Tackle: RB rolls twice keep lower, floor 0
- ✅ Power Run: RB rolls twice keep higher
- ✅ Double Move: WR rolls twice keep higher
- ✅ Checkdown: WR floor value, TO-immune
- ✅ Ground & Pound: +3 × runs this drive, capped +12
- ✅ Play Action: +8 if prev play was run
- ✅ Hail Mary: QB≥16 → offTotal×2; QB<16 → 0 yards
- ✅ Opponent behavior unchanged (randomPlayCall() = Dive/Quick Pass 50/50)
- ✅ Card name shown in matchup badge
- ✅ Card bonus shown in advantage breakdown
- ✅ seeded rng used throughout
- ✅ `applyCardYards` only applied for user offense (opponent always vanilla)
