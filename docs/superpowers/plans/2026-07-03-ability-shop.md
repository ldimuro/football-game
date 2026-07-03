# Ability Shop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the existing Shop into two independent tabbed shops — Player Shop (unchanged) and Ability Shop (new) — each with its own purchase slot per round.

**Architecture:** Logic changes first (pricing, compatibility, offer generation), then store state, then UI. The ShopModal is refactored to a tabbed modal; the RoundHub button becomes disabled only when both shops are exhausted.

**Tech Stack:** React 18, TypeScript, Zustand, Vitest, Tailwind CSS

## Global Constraints

- `SHOP_SLOTS = 4` — both shops offer exactly 4 items per round (from `src/logic/gameConstants.ts`)
- Ability pricing: Common = 10 coins, Uncommon = 20 coins, Rare = 30 coins
- Two independent `shopComplete` flags: `shopComplete` (player) and `abilityShopComplete` (ability)
- Player Shop: one purchase per round; Ability Shop: one purchase per round — independent
- `buyAbility` must guard: ability in offer, slot occupied, player can afford
- All `useState` hooks must be called before any conditional returns in React components
- Run tests with: `npx vitest run` from repo root

---

## File Map

| File | Change |
|---|---|
| `src/logic/gameConstants.ts` | Add `ABILITY_SHOP_COSTS` record |
| `src/logic/abilityGen.ts` | Export `ALL_ABILITY_IDS`, `POSITION_ABILITY_IDS`; add `generateAbilityShopOffer()`, `compatibleRosterPositions()`, `abilityPositionLabel()` |
| `src/logic/playerValue.ts` | Add `abilityCost()` |
| `src/logic/abilityGen.test.ts` | Add tests for new exports |
| `src/logic/playerValue.test.ts` | Add tests for `abilityCost` |
| `src/store/gameStore.ts` | Add `abilityShopOffer`, `abilityShopComplete`, `buyAbility`; update `buildNextRoundData`, `initGame`, `confirmSetup`, `advanceRound` |
| `src/store/gameStore.test.ts` | Add `vi.mock` for `abilityGen`; update `INITIAL_STATE`; add `buyAbility` tests |
| `src/components/round/ShopModal.tsx` | Full refactor: tabbed modal with Ability Shop browse/player-select/confirm-replace views |
| `src/components/round/RoundHub.tsx` | Add `abilityShopComplete` selector; disable button only when both shops are done |

---

### Task 1: Logic layer — pricing, compatibility, offer generation

**Files:**
- Modify: `src/logic/gameConstants.ts`
- Modify: `src/logic/abilityGen.ts`
- Modify: `src/logic/playerValue.ts`
- Modify: `src/logic/abilityGen.test.ts`
- Modify: `src/logic/playerValue.test.ts`

**Interfaces:**
- Produces:
  - `abilityCost(abilityId: string): number` — from `playerValue.ts`
  - `generateAbilityShopOffer(): string[]` — from `abilityGen.ts`
  - `compatibleRosterPositions(abilityId: string): RosterPosition[]` — from `abilityGen.ts`
  - `abilityPositionLabel(abilityId: string): string` — from `abilityGen.ts`
  - `ALL_ABILITY_IDS: string[]` (exported) — from `abilityGen.ts`
  - `POSITION_ABILITY_IDS: Record<string, string[]>` (exported) — from `abilityGen.ts`

- [ ] **Step 1: Write failing tests for `abilityCost`**

Open `src/logic/playerValue.test.ts` and append at the bottom:

```typescript
import { abilityCost } from './playerValue'

describe('abilityCost', () => {
  it('returns 10 for a Common ability (second-half)', () => {
    expect(abilityCost('second-half')).toBe(10)
  })
  it('returns 10 for any ability not found in ABILITY_RARITY (fallback to Common)', () => {
    expect(abilityCost('nonexistent-ability-xyz')).toBe(10)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/logic/playerValue.test.ts
```

Expected: FAIL — `abilityCost is not a function`

- [ ] **Step 3: Add `ABILITY_SHOP_COSTS` to `gameConstants.ts`**

In `src/logic/gameConstants.ts`, append after the `// ─── Shop ───` block (after `CAP_SPACE`):

```typescript
// ─── Ability Shop pricing ──────────────────────────────────────────────────────
export const ABILITY_SHOP_COSTS = {
  Common:   10,
  Uncommon: 20,
  Rare:     30,
} as const
```

- [ ] **Step 4: Add `abilityCost` to `playerValue.ts`**

At the top of `src/logic/playerValue.ts`, add to imports:

```typescript
import { ABILITY_SHOP_COSTS } from './gameConstants'
import { ABILITY_RARITY } from './abilityEngine'
```

Then append at the bottom of the file:

```typescript
export function abilityCost(abilityId: string): number {
  const rarity = ABILITY_RARITY[abilityId] ?? 'Common'
  return ABILITY_SHOP_COSTS[rarity]
}
```

- [ ] **Step 5: Run `abilityCost` tests to verify they pass**

```bash
npx vitest run src/logic/playerValue.test.ts
```

Expected: all PASS

- [ ] **Step 6: Write failing tests for ability gen functions**

Open `src/logic/abilityGen.test.ts` and append after the existing `describe('assignAbility', ...)` block:

```typescript
import { generateAbilityShopOffer, compatibleRosterPositions, abilityPositionLabel } from './abilityGen'
import { ENABLED_ABILITIES, SHOP_SLOTS } from './gameConstants'

describe('generateAbilityShopOffer', () => {
  it('returns exactly SHOP_SLOTS ability IDs', () => {
    const offer = generateAbilityShopOffer()
    expect(offer).toHaveLength(SHOP_SLOTS)
  })

  it('returns no duplicate ability IDs', () => {
    const offer = generateAbilityShopOffer()
    expect(new Set(offer).size).toBe(offer.length)
  })

  it('returns only IDs that are in ENABLED_ABILITIES', () => {
    const offer = generateAbilityShopOffer()
    for (const id of offer) {
      expect(ENABLED_ABILITIES.has(id)).toBe(true)
    }
  })
})

describe('compatibleRosterPositions', () => {
  it('returns all 8 positions for a general ability (second-half)', () => {
    const positions = compatibleRosterPositions('second-half')
    expect(positions).toHaveLength(8)
    expect(positions).toEqual(
      expect.arrayContaining(['QB', 'WR1', 'WR2', 'RB', 'K', 'OLine', 'DLine', 'Secondary'])
    )
  })

  it('returns only QB for play-action', () => {
    expect(compatibleRosterPositions('play-action')).toEqual(['QB'])
  })

  it('returns WR1 and WR2 for yac', () => {
    expect(compatibleRosterPositions('yac')).toEqual(expect.arrayContaining(['WR1', 'WR2']))
    expect(compatibleRosterPositions('yac')).toHaveLength(2)
  })

  it('returns OLine, DLine, Secondary for psychic', () => {
    const positions = compatibleRosterPositions('psychic')
    expect(positions).toEqual(expect.arrayContaining(['OLine', 'DLine', 'Secondary']))
    expect(positions).toHaveLength(3)
  })
})

describe('abilityPositionLabel', () => {
  it('returns "Any Player" for a general ability', () => {
    expect(abilityPositionLabel('second-half')).toBe('Any Player')
  })

  it('returns "QB" for play-action', () => {
    expect(abilityPositionLabel('play-action')).toBe('QB')
  })

  it('returns "WR" for yac (both WR slots map to same label)', () => {
    expect(abilityPositionLabel('yac')).toBe('WR')
  })

  it('returns multiple position names for psychic', () => {
    const label = abilityPositionLabel('psychic')
    expect(label).toContain('O-Line')
    expect(label).toContain('D-Line')
    expect(label).toContain('Secondary')
  })
})
```

- [ ] **Step 7: Run new tests to verify they fail**

```bash
npx vitest run src/logic/abilityGen.test.ts
```

Expected: FAIL — `generateAbilityShopOffer is not a function` (and similar)

- [ ] **Step 8: Update `abilityGen.ts` — exports + new functions**

Replace the entire contents of `src/logic/abilityGen.ts` with:

```typescript
import type { IndividualPosition, UnitPosition, RosterPosition } from '../types'
import { ENABLED_ABILITIES, ABILITY_RARITY_WEIGHTS, SHOP_SLOTS } from './gameConstants'
import { ABILITY_RARITY } from './abilityEngine'

export const ABILITY_RATE = 0.4

export const ALL_ABILITY_IDS = [
  // 'evens', 'odds', 'evil-evens', 'evil-odds',
  // 'blessed-evens', 'blessed-odds',
  'second-half', 'clutch',
  'rain-man', 'snow-man',
  'comeback-kid', 'two-minute-drill',
]

export const POSITION_ABILITY_IDS: Record<string, string[]> = {
  QB:        ['play-action', 'in-rhythm'],
  WR:        ['basketball-player', 'yac'],
  RB:        ['workhorse', 'fresh-legs', 'goal-line'],
  K:         [],
  OLine:     ['air-raid', 'ground-and-pound', 'psychic'],
  DLine:     ['bull-rush', 'brick-wall', 'stack-the-box', 'psychic', 'bend-dont-break'],
  Secondary: ['bend-dont-break', 'on-an-island', 'no-fly-zone', 'psychic'],
}

const POSITION_ROSTER_MAP: Record<string, RosterPosition[]> = {
  QB:        ['QB'],
  WR:        ['WR1', 'WR2'],
  RB:        ['RB'],
  K:         ['K'],
  OLine:     ['OLine'],
  DLine:     ['DLine'],
  Secondary: ['Secondary'],
}

const POSITION_READABLE: Record<string, string> = {
  QB: 'QB', WR: 'WR', RB: 'RB', K: 'K',
  OLine: 'O-Line', DLine: 'D-Line', Secondary: 'Secondary',
}

const ALL_ROSTER_POSITIONS: RosterPosition[] = [
  'QB', 'WR1', 'WR2', 'RB', 'K', 'OLine', 'DLine', 'Secondary',
]

function weightedPick(pool: string[]): string {
  const weights = pool.map(id => ABILITY_RARITY_WEIGHTS[ABILITY_RARITY[id] ?? 'Common'])
  const total = weights.reduce((s, w) => s + w, 0)
  let r = Math.random() * total
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i]
    if (r <= 0) return pool[i]
  }
  return pool[pool.length - 1]
}

export function assignAbility(position: IndividualPosition | UnitPosition): string | undefined {
  if (Math.random() >= ABILITY_RATE) return undefined
  const posSpecific = POSITION_ABILITY_IDS[position] ?? []
  const pool = [...ALL_ABILITY_IDS, ...posSpecific].filter(id => ENABLED_ABILITIES.has(id))
  if (pool.length === 0) return undefined
  return weightedPick(pool)
}

/** Always returns an ability, ignoring ABILITY_RATE. Use for guaranteed ability assignment. */
export function forceAssignAbility(position: IndividualPosition | UnitPosition): string | undefined {
  const posSpecific = POSITION_ABILITY_IDS[position] ?? []
  const pool = [...ALL_ABILITY_IDS, ...posSpecific].filter(id => ENABLED_ABILITIES.has(id))
  if (pool.length === 0) return undefined
  return weightedPick(pool)
}

/** Returns SHOP_SLOTS unique ability IDs sampled from ENABLED_ABILITIES using rarity weights. */
export function generateAbilityShopOffer(): string[] {
  const pool = [...ENABLED_ABILITIES]
  const offer: string[] = []
  while (offer.length < SHOP_SLOTS && pool.length > 0) {
    const picked = weightedPick(pool)
    offer.push(picked)
    pool.splice(pool.indexOf(picked), 1)
  }
  return offer
}

/** Returns the roster positions that can receive the given ability. */
export function compatibleRosterPositions(abilityId: string): RosterPosition[] {
  if (ALL_ABILITY_IDS.includes(abilityId)) return [...ALL_ROSTER_POSITIONS]
  const result: RosterPosition[] = []
  for (const [pos, ids] of Object.entries(POSITION_ABILITY_IDS)) {
    if (ids.includes(abilityId)) {
      result.push(...(POSITION_ROSTER_MAP[pos] ?? []))
    }
  }
  return result
}

/**
 * Returns a human-readable label for which players can use this ability.
 * General abilities → "Any Player". Position-specific → e.g. "QB" or "O-Line, D-Line, Secondary".
 */
export function abilityPositionLabel(abilityId: string): string {
  if (ALL_ABILITY_IDS.includes(abilityId)) return 'Any Player'
  const seen = new Set<string>()
  const labels: string[] = []
  for (const [pos, ids] of Object.entries(POSITION_ABILITY_IDS)) {
    if (ids.includes(abilityId)) {
      const label = POSITION_READABLE[pos] ?? pos
      if (!seen.has(label)) { seen.add(label); labels.push(label) }
    }
  }
  return labels.join(', ') || 'Any Player'
}
```

- [ ] **Step 9: Run all logic tests to verify they pass**

```bash
npx vitest run src/logic/abilityGen.test.ts src/logic/playerValue.test.ts
```

Expected: all PASS

- [ ] **Step 10: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 11: Commit**

```bash
git add src/logic/gameConstants.ts src/logic/abilityGen.ts src/logic/playerValue.ts \
        src/logic/abilityGen.test.ts src/logic/playerValue.test.ts
git commit -m "feat: ability shop logic — pricing, compatibility, offer generation"
```

---

### Task 2: Store — ability shop state and buyAbility action

**Files:**
- Modify: `src/store/gameStore.ts`
- Modify: `src/store/gameStore.test.ts`

**Interfaces:**
- Consumes (from Task 1):
  - `generateAbilityShopOffer(): string[]` from `src/logic/abilityGen.ts`
  - `abilityCost(abilityId: string): number` from `src/logic/playerValue.ts`
- Produces (for Task 3 UI):
  - `abilityShopOffer: string[] | null` on store state
  - `abilityShopComplete: boolean` on store state
  - `buyAbility: (abilityId: string, targetPosition: RosterPosition) => void` on store

- [ ] **Step 1: Write failing tests for `buyAbility`**

In `src/store/gameStore.test.ts`:

a) Add to the existing `vi.mock` block at the top (after the other mocks):

```typescript
vi.mock('../logic/abilityGen', () => ({
  generateAbilityShopOffer: vi.fn().mockReturnValue(['second-half', 'clutch', 'rain-man', 'snow-man']),
}))
```

b) Add `abilityShopOffer` and `abilityShopComplete` to the `INITIAL_STATE` constant:

```typescript
const INITIAL_STATE = {
  // ... existing fields unchanged ...
  abilityShopOffer: null,
  abilityShopComplete: false,
}
```

c) Add the import for `abilityCost` at the top of the test file:

```typescript
import { abilityCost } from '../logic/playerValue'
```

d) Append these `describe` blocks at the bottom of the test file:

```typescript
describe('buyAbility', () => {
  it('sets the ability on the target player, deducts cost, sets abilityShopComplete', () => {
    useGameStore.setState({
      ...INITIAL_STATE,
      roster: mockRoster,
      coins: 50,
      abilityShopOffer: ['second-half', 'clutch', 'rain-man', 'snow-man'],
    })
    useGameStore.getState().buyAbility('second-half', 'QB')
    const state = useGameStore.getState()
    expect(state.roster.QB?.ability).toBe('second-half')
    expect(state.coins).toBe(50 - abilityCost('second-half')) // 50 - 10 = 40
    expect(state.abilityShopComplete).toBe(true)
  })

  it('does nothing when abilityShopOffer is null', () => {
    useGameStore.setState({ ...INITIAL_STATE, roster: mockRoster, coins: 50, abilityShopOffer: null })
    useGameStore.getState().buyAbility('second-half', 'QB')
    expect(useGameStore.getState().coins).toBe(50)
    expect(useGameStore.getState().abilityShopComplete).toBe(false)
  })

  it('does nothing when abilityId is not in the current offer', () => {
    useGameStore.setState({
      ...INITIAL_STATE,
      roster: mockRoster,
      coins: 50,
      abilityShopOffer: ['clutch', 'rain-man', 'snow-man', 'comeback-kid'],
    })
    useGameStore.getState().buyAbility('second-half', 'QB')
    expect(useGameStore.getState().coins).toBe(50)
    expect(useGameStore.getState().abilityShopComplete).toBe(false)
  })

  it('does nothing when the target slot is empty', () => {
    useGameStore.setState({
      ...INITIAL_STATE,
      roster: { ...mockRoster, QB: null },
      coins: 50,
      abilityShopOffer: ['second-half', 'clutch', 'rain-man', 'snow-man'],
    })
    useGameStore.getState().buyAbility('second-half', 'QB')
    expect(useGameStore.getState().coins).toBe(50)
    expect(useGameStore.getState().abilityShopComplete).toBe(false)
  })

  it('does nothing when the player cannot afford the ability', () => {
    useGameStore.setState({
      ...INITIAL_STATE,
      roster: mockRoster,
      coins: 5,
      abilityShopOffer: ['second-half', 'clutch', 'rain-man', 'snow-man'],
    })
    useGameStore.getState().buyAbility('second-half', 'QB') // costs 10, only 5 coins
    expect(useGameStore.getState().coins).toBe(5)
    expect(useGameStore.getState().abilityShopComplete).toBe(false)
  })
})

describe('abilityShopComplete resets on advanceRound', () => {
  it('resets abilityShopComplete to false when advancing to next round', async () => {
    useGameStore.setState({
      ...INITIAL_STATE,
      phase: 'round-hub',
      roster: mockRoster,
      currentOpponent: mockOpponent,
      currentWeather: 'Clear',
      abilityShopComplete: true,
    })
    await act(async () => { await useGameStore.getState().advanceRound() })
    expect(useGameStore.getState().abilityShopComplete).toBe(false)
  })
})
```

- [ ] **Step 2: Run new tests to verify they fail**

```bash
npx vitest run src/store/gameStore.test.ts
```

Expected: new tests FAIL — `buyAbility is not a function`, existing tests may also fail if `INITIAL_STATE` is missing new fields

- [ ] **Step 3: Update `gameStore.ts` — imports**

In `src/store/gameStore.ts`, update the imports at the top:

```typescript
import { generateRandomRoster, generateRandomSlot, generateShopOffer } from '../logic/rosterGen'
import { generateAbilityShopOffer } from '../logic/abilityGen'
// ... rest of existing imports unchanged ...
import { playerCost, slotCost, abilityCost } from '../logic/playerValue'
```

- [ ] **Step 4: Add new fields to the `GameStore` interface**

In the `interface GameStore { ... }` block, add these two fields and one action after `buyFromShop`:

```typescript
abilityShopOffer: string[] | null
abilityShopComplete: boolean
buyAbility: (abilityId: string, targetPosition: RosterPosition) => void
```

- [ ] **Step 5: Add initial values for new fields**

In the `create<GameStore>((set, get) => ({` block, add after `shopComplete: false,`:

```typescript
abilityShopOffer: null,
abilityShopComplete: false,
```

- [ ] **Step 6: Update `buildNextRoundData` to generate ability shop offer**

Replace the existing `buildNextRoundData` function:

```typescript
async function buildNextRoundData(remainingCoins: number, activeRule: LeagueRule | null = null) {
  const [{ stats: opponent, roster: opponentRoster }, draftOffer, shopOffer] = await Promise.all([
    generateOpponent(),
    generateDraftOffer(),
    generateShopOffer(remainingCoins),
  ])
  const abilityShopOffer = generateAbilityShopOffer()
  const weather = activeRule?.id === 'ice-age' ? 'Snow' as const : generateWeather()
  return { opponent, opponentRoster, draftOffer, weather, shopOffer, abilityShopOffer }
}
```

- [ ] **Step 7: Update `initGame` to reset ability shop fields**

In the `initGame` action's `set({ ... })` call, add:

```typescript
abilityShopOffer: null,
abilityShopComplete: false,
```

- [ ] **Step 8: Update `confirmSetup` to set ability shop offer**

In `confirmSetup`, destructure `abilityShopOffer` from `buildNextRoundData` result and include it in `set()`:

```typescript
confirmSetup: async () => {
  set({ isLoading: true })
  const { roster, activeRule } = get()
  const coins = coinsForRoster(roster)
  const { dualTurnoverNumbers } = activeRule ? getRuleOverrides(activeRule) : getDefaultOverrides()
  const { opponent, opponentRoster, draftOffer, weather, shopOffer, abilityShopOffer } = await buildNextRoundData(coins, activeRule)
  set({
    phase: 'round-hub',
    coins,
    shopOffer,
    shopComplete: false,
    abilityShopOffer,
    abilityShopComplete: false,
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

- [ ] **Step 9: Update `advanceRound` to reset ability shop fields**

In `advanceRound`, there are two `set()` calls: one for the season-complete branch (round >= 17) and one for the normal branch. Update both:

In the round >= 17 branch, add to the `set()` call:
```typescript
abilityShopComplete: false,
```

In the normal branch, destructure `abilityShopOffer` from `buildNextRoundData` result and add to the `set()` call:
```typescript
abilityShopOffer,
abilityShopComplete: false,
```

The full `advanceRound` action after changes:

```typescript
advanceRound: async () => {
  const {
    round, seasonLog, currentOpponent, currentWeather,
    pendingDraftedId, simulationResult, pendingShopBoughtId, coins, activeRule,
  } = get()
  if (!currentOpponent || !currentWeather) return

  const record: RoundRecord = {
    round,
    opponentTeam: currentOpponent.team,
    opponentYear: currentOpponent.year,
    draftedId: pendingDraftedId,
    weather: currentWeather,
    result: simulationResult?.winner === 'user' ? 'win'
      : simulationResult?.winner === 'opponent' ? 'loss' : 'tie',
    shopBoughtId: pendingShopBoughtId,
  }
  const newLog = [...seasonLog, record]

  if (round >= 17) {
    set({
      seasonLog: newLog, phase: 'complete',
      simulationResult: null, draftComplete: false, pendingDraftedId: null,
      shopComplete: false, pendingShopBoughtId: null,
      abilityShopComplete: false,
    })
    return
  }

  set({ isLoading: true })
  const { opponent, opponentRoster, draftOffer, weather, shopOffer, abilityShopOffer } = await buildNextRoundData(coins, activeRule)
  set({
    seasonLog: newLog,
    round: round + 1,
    currentOpponent: opponent,
    currentOpponentRoster: opponentRoster,
    currentWeather: weather,
    currentDraftOffer: draftOffer,
    shopOffer,
    draftRerollAvailable: true,
    draftComplete: false,
    simulationResult: null,
    pendingDraftedId: null,
    shopComplete: false,
    pendingShopBoughtId: null,
    abilityShopOffer,
    abilityShopComplete: false,
    opponentTurnoverNumbers: generateTurnoverNumbers(
      activeRule ? getRuleOverrides(activeRule).dualTurnoverNumbers : false
    ),
    isLoading: false,
  })
},
```

- [ ] **Step 10: Add `buyAbility` action**

Append before the closing `}))` of the store:

```typescript
buyAbility: (abilityId, targetPosition) => {
  const { roster, abilityShopOffer, coins } = get()
  if (!abilityShopOffer || !abilityShopOffer.includes(abilityId)) return
  const cost = abilityCost(abilityId)
  if (cost > coins) return
  const currentSlot = roster[targetPosition]
  if (!currentSlot) return
  set({
    roster: { ...roster, [targetPosition]: { ...currentSlot, ability: abilityId } },
    coins: coins - cost,
    abilityShopComplete: true,
  })
},
```

- [ ] **Step 11: Run all store tests to verify they pass**

```bash
npx vitest run src/store/gameStore.test.ts
```

Expected: all PASS

- [ ] **Step 12: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 13: Commit**

```bash
git add src/store/gameStore.ts src/store/gameStore.test.ts
git commit -m "feat: ability shop store state — abilityShopOffer, abilityShopComplete, buyAbility"
```

---

### Task 3: UI — ShopModal tabs and RoundHub button

**Files:**
- Modify: `src/components/round/ShopModal.tsx`
- Modify: `src/components/round/RoundHub.tsx`

**Interfaces:**
- Consumes (from Task 1 & 2):
  - `abilityCost(abilityId: string): number` from `src/logic/playerValue.ts`
  - `compatibleRosterPositions(abilityId: string): RosterPosition[]` from `src/logic/abilityGen.ts`
  - `abilityPositionLabel(abilityId: string): string` from `src/logic/abilityGen.ts`
  - `ABILITY_DISPLAY: Record<string, string>` from `src/logic/abilityEngine.ts`
  - `ABILITY_DESCRIPTIONS: Record<string, string>` from `src/logic/abilityEngine.ts`
  - `ABILITY_RARITY: Record<string, AbilityRarity>` from `src/logic/abilityEngine.ts`
  - `abilityShopOffer: string[] | null` from store
  - `abilityShopComplete: boolean` from store
  - `buyAbility: (abilityId: string, targetPosition: RosterPosition) => void` from store

- [ ] **Step 1: Replace `ShopModal.tsx` with the tabbed implementation**

Replace the entire contents of `src/components/round/ShopModal.tsx`:

```typescript
import { useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { PlayerCard } from '../roster/PlayerCard'
import { Button } from '../ui/Button'
import { playerCost, slotCost, abilityCost } from '../../logic/playerValue'
import { compatibleRosterPositions, abilityPositionLabel } from '../../logic/abilityGen'
import { ABILITY_DISPLAY, ABILITY_DESCRIPTIONS, ABILITY_RARITY } from '../../logic/abilityEngine'
import type { Player, TeamUnit, RosterPosition } from '../../types'

type PlayerShopView = 'browse' | 'replace'
type AbilityShopView = 'browse' | 'player-select' | 'confirm-replace'

const POSITION_LABELS: Record<RosterPosition, string> = {
  QB: 'QB', WR1: 'WR1', WR2: 'WR2', RB: 'RB', K: 'K',
  OLine: 'O-Line', DLine: 'D-Line', Secondary: 'Secondary',
}

const ALL_POSITIONS: RosterPosition[] = ['QB', 'WR1', 'WR2', 'RB', 'K', 'OLine', 'DLine', 'Secondary']

const RARITY_COLORS: Record<string, string> = {
  Common: 'text-gray-400',
  Uncommon: 'text-blue-400',
  Rare: 'text-purple-400',
}

function eligibleSlots(player: Player | TeamUnit): RosterPosition[] {
  if (player.position === 'WR') return ['WR1', 'WR2']
  const MAP: Partial<Record<string, RosterPosition>> = {
    QB: 'QB', RB: 'RB', K: 'K', OLine: 'OLine', DLine: 'DLine', Secondary: 'Secondary',
  }
  const slot = MAP[player.position]
  return slot ? [slot] : []
}

function displayPosition(player: Player | TeamUnit): RosterPosition {
  return eligibleSlots(player)[0] ?? 'QB'
}

function playerName(player: Player | TeamUnit): string {
  return 'name' in player
    ? player.name
    : `${player.team} ${POSITION_LABELS[displayPosition(player)]}`
}

interface Props {
  onClose: () => void
}

export function ShopModal({ onClose }: Props) {
  const {
    shopOffer, coins, shopComplete, roster, buyFromShop,
    abilityShopOffer, abilityShopComplete, buyAbility,
  } = useGameStore()

  // All hooks before any conditional returns
  const [activeTab, setActiveTab] = useState<'player' | 'ability'>('player')
  const [playerView, setPlayerView] = useState<PlayerShopView>('browse')
  const [buyTarget, setBuyTarget] = useState<(Player | TeamUnit) | null>(null)
  const [sellPosition, setSellPosition] = useState<RosterPosition | null>(null)
  const [abilityView, setAbilityView] = useState<AbilityShopView>('browse')
  const [selectedAbilityId, setSelectedAbilityId] = useState<string | null>(null)
  const [confirmPosition, setConfirmPosition] = useState<RosterPosition | null>(null)

  if (!shopOffer) return null

  const switchTab = (tab: 'player' | 'ability') => {
    setActiveTab(tab)
    setPlayerView('browse')
    setBuyTarget(null)
    setSellPosition(null)
    setAbilityView('browse')
    setSelectedAbilityId(null)
    setConfirmPosition(null)
  }

  // ─── Player Shop handlers ────────────────────────────────────────────────────

  const handlePlayerBuyClick = (player: Player | TeamUnit) => {
    const eligible = eligibleSlots(player)
    setBuyTarget(player)
    setSellPosition(eligible.length === 1 ? eligible[0] : null)
    setPlayerView('replace')
  }

  const handlePlayerConfirm = () => {
    if (!buyTarget || !sellPosition) return
    buyFromShop(buyTarget.id, sellPosition)
    onClose()
  }

  const handlePlayerBack = () => {
    setBuyTarget(null)
    setSellPosition(null)
    setPlayerView('browse')
  }

  // ─── Ability Shop handlers ───────────────────────────────────────────────────

  const handleAbilityBuyClick = (abilityId: string) => {
    setSelectedAbilityId(abilityId)
    setAbilityView('player-select')
  }

  const handlePositionClick = (pos: RosterPosition) => {
    if (!selectedAbilityId) return
    const currentSlot = roster[pos]
    if (!currentSlot) return
    if (currentSlot.ability) {
      setConfirmPosition(pos)
      setAbilityView('confirm-replace')
    } else {
      buyAbility(selectedAbilityId, pos)
      onClose()
    }
  }

  const handleAbilityConfirm = () => {
    if (!selectedAbilityId || !confirmPosition) return
    buyAbility(selectedAbilityId, confirmPosition)
    onClose()
  }

  const handleAbilityBack = () => {
    if (abilityView === 'confirm-replace') {
      setConfirmPosition(null)
      setAbilityView('player-select')
    } else {
      setSelectedAbilityId(null)
      setAbilityView('browse')
    }
  }

  // ─── Shared tab bar ──────────────────────────────────────────────────────────

  const tabBar = (
    <div className="flex border-b border-gray-800">
      {(['player', 'ability'] as const).map(tab => (
        <button
          key={tab}
          onClick={() => switchTab(tab)}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === tab
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          {tab === 'player' ? 'Player Shop' : 'Ability Shop'}
        </button>
      ))}
    </div>
  )

  // ─── Player Shop — replace sub-view ─────────────────────────────────────────

  if (activeTab === 'player' && playerView === 'replace' && buyTarget) {
    const cost = playerCost(buyTarget.rating)
    const slots = eligibleSlots(buyTarget)
    const refund = sellPosition ? slotCost(roster[sellPosition]) : 0
    const netCost = cost - refund

    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-950 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl">
          <div className="p-5 border-b border-gray-800 flex items-center justify-between">
            <p className="text-sm text-gray-400">
              <span className="text-yellow-400 font-bold">{coins}</span> coins remaining
            </p>
            <Button variant="ghost" onClick={onClose}>✕</Button>
          </div>
          {tabBar}
          <div className="p-5 border-b border-gray-800">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Buying</p>
            <p className="text-white font-bold">
              {playerName(buyTarget)}
              <span className="ml-2 text-yellow-400 font-bold">{cost} coins</span>
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              Select slot to replace
            </p>
            {slots.map(pos => {
              const current = roster[pos]
              const isSelected = sellPosition === pos
              return (
                <button
                  key={pos}
                  onClick={() => setSellPosition(pos)}
                  className={`w-full text-left mb-3 rounded-xl ring-2 transition-colors ${
                    isSelected ? 'ring-indigo-500' : 'ring-transparent hover:ring-gray-600'
                  }`}
                >
                  {current ? (
                    <PlayerCard slot={current} position={pos} coinValue={slotCost(current)} />
                  ) : (
                    <div className="p-4 bg-gray-900 rounded-xl text-gray-500 text-sm text-left">
                      {POSITION_LABELS[pos]} — Empty slot (no refund)
                    </div>
                  )}
                </button>
              )
            })}
          </div>
          <div className="p-4 border-t border-gray-800">
            {sellPosition && (
              <p className="text-sm text-gray-400 mb-3">
                Net cost:{' '}
                <span className="text-yellow-400 font-bold">{netCost} coins</span>
                {' '}(buy {cost} – sell {refund})
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={handlePlayerBack}>Back</Button>
              <Button onClick={handlePlayerConfirm} disabled={!sellPosition}>Confirm Purchase</Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── Ability Shop — confirm-replace sub-view ─────────────────────────────────

  if (activeTab === 'ability' && abilityView === 'confirm-replace' && selectedAbilityId && confirmPosition) {
    const slot = roster[confirmPosition]
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-950 border border-gray-700 rounded-2xl w-full max-w-lg flex flex-col shadow-2xl">
          <div className="p-5 border-b border-gray-800 flex items-center justify-between">
            <p className="text-sm text-gray-400">
              <span className="text-yellow-400 font-bold">{coins}</span> coins remaining
            </p>
            <Button variant="ghost" onClick={onClose}>✕</Button>
          </div>
          {tabBar}
          <div className="p-6">
            <p className="text-white font-semibold mb-2">Replace ability?</p>
            <p className="text-sm text-gray-400">
              Replace{' '}
              <span className="text-white font-semibold">
                {ABILITY_DISPLAY[slot?.ability ?? ''] ?? slot?.ability}
              </span>
              {' '}with{' '}
              <span className="text-white font-semibold">
                {ABILITY_DISPLAY[selectedAbilityId]}
              </span>
              {' '}on{' '}
              <span className="text-white font-semibold">{POSITION_LABELS[confirmPosition]}</span>?
            </p>
          </div>
          <div className="p-4 border-t border-gray-800 flex gap-2 justify-end">
            <Button variant="secondary" onClick={handleAbilityBack}>Cancel</Button>
            <Button onClick={handleAbilityConfirm}>Confirm</Button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Ability Shop — player-select sub-view ───────────────────────────────────

  if (activeTab === 'ability' && abilityView === 'player-select' && selectedAbilityId) {
    const compatible = compatibleRosterPositions(selectedAbilityId)
    const cost = abilityCost(selectedAbilityId)

    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-950 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl">
          <div className="p-5 border-b border-gray-800 flex items-center justify-between">
            <p className="text-sm text-gray-400">
              <span className="text-yellow-400 font-bold">{coins}</span> coins remaining
            </p>
            <Button variant="ghost" onClick={onClose}>✕</Button>
          </div>
          {tabBar}
          <div className="p-5 border-b border-gray-800">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Buying ability</p>
            <p className="text-white font-bold">
              {ABILITY_DISPLAY[selectedAbilityId]}
              <span className="ml-2 text-yellow-400 font-bold">{cost} coins</span>
            </p>
            <p className="text-sm text-gray-500 mt-1">{ABILITY_DESCRIPTIONS[selectedAbilityId]}</p>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              Select a player to receive this ability
            </p>
            {ALL_POSITIONS.map(pos => {
              const slot = roster[pos]
              const isCompatible = compatible.includes(pos)
              const isDisabled = !isCompatible || !slot
              return (
                <button
                  key={pos}
                  onClick={() => !isDisabled && handlePositionClick(pos)}
                  disabled={isDisabled}
                  className={`w-full text-left mb-3 rounded-xl ring-2 transition-colors ${
                    isDisabled
                      ? 'opacity-40 ring-transparent cursor-not-allowed'
                      : 'ring-transparent hover:ring-indigo-500 cursor-pointer'
                  }`}
                >
                  {slot ? (
                    <PlayerCard slot={slot} position={pos} />
                  ) : (
                    <div className="p-4 bg-gray-900 rounded-xl text-gray-500 text-sm">
                      {POSITION_LABELS[pos]} — Empty
                    </div>
                  )}
                </button>
              )
            })}
          </div>
          <div className="p-4 border-t border-gray-800 flex justify-end">
            <Button variant="secondary" onClick={handleAbilityBack}>Back</Button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Browse views (Player Shop + Ability Shop) ───────────────────────────────

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-950 border border-gray-700 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
        <div className="p-5 border-b border-gray-800 flex items-center justify-between">
          <p className="text-sm text-gray-400">
            <span className="text-yellow-400 font-bold">{coins}</span> coins remaining
          </p>
          <Button variant="ghost" onClick={onClose}>✕</Button>
        </div>
        {tabBar}

        {/* Player Shop browse */}
        {activeTab === 'player' && (
          shopComplete ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <p className="text-gray-400 text-center">You've already bought a player this round.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {shopOffer.map(player => {
                  const cost = playerCost(player.rating)
                  const canAfford = cost <= coins
                  const pos = displayPosition(player)
                  return (
                    <div key={player.id} className={!canAfford ? 'opacity-50' : ''}>
                      <PlayerCard slot={player} position={pos} coinValue={cost} />
                      <button
                        onClick={() => canAfford && handlePlayerBuyClick(player)}
                        disabled={!canAfford}
                        className={`mt-2 w-full px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                          canAfford
                            ? 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer'
                            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {canAfford ? `Buy — ${cost} coins` : `Can't afford (${cost} coins)`}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        )}

        {/* Ability Shop browse */}
        {activeTab === 'ability' && (
          !abilityShopOffer || abilityShopComplete ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <p className="text-gray-400 text-center">
                {abilityShopComplete
                  ? "You've already bought an ability this round."
                  : 'No abilities available.'}
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {abilityShopOffer.map(abilityId => {
                  const cost = abilityCost(abilityId)
                  const canAfford = cost <= coins
                  const rarity = ABILITY_RARITY[abilityId] ?? 'Common'
                  const posLabel = abilityPositionLabel(abilityId)
                  return (
                    <div
                      key={abilityId}
                      className={`bg-gray-900 rounded-xl p-4 ${!canAfford ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <p className="text-white font-bold text-sm">{ABILITY_DISPLAY[abilityId]}</p>
                        <span className={`text-xs font-semibold ml-2 shrink-0 ${RARITY_COLORS[rarity] ?? 'text-gray-400'}`}>
                          {rarity}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mb-3">{ABILITY_DESCRIPTIONS[abilityId]}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">{posLabel}</span>
                        <button
                          onClick={() => canAfford && handleAbilityBuyClick(abilityId)}
                          disabled={!canAfford}
                          className={`px-3 py-1.5 rounded-lg font-semibold text-sm transition-colors ${
                            canAfford
                              ? 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer'
                              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          {canAfford ? `Buy — ${cost} coins` : `${cost} coins`}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update `RoundHub.tsx` — disable Shop button only when both shops are done**

In `src/components/round/RoundHub.tsx`, update the destructure from `useGameStore()` to include `abilityShopComplete`:

```typescript
const {
  round, roster, currentOpponent, currentOpponentRoster, currentWeather,
  startGame, isLoading, seasonLog,
  coins, shopComplete, abilityShopComplete, userTurnoverNumbers, opponentTurnoverNumbers, activeRule,
} = useGameStore()
```

Then replace the Shop button:

```typescript
const bothShopsComplete = shopComplete && abilityShopComplete
// ...
<Button
  onClick={() => setShopOpen(true)}
  disabled={isLoading || bothShopsComplete}
  variant="secondary"
>
  {bothShopsComplete ? 'Shop ✓' : 'Shop'}
</Button>
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Run full test suite**

```bash
npx vitest run
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/round/ShopModal.tsx src/components/round/RoundHub.tsx
git commit -m "feat: ability shop UI — tabbed ShopModal with browse, player-select, confirm-replace views"
```
