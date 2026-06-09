# Coins / Salary Cap System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 100-coin salary cap system: player costs derived from rating tiers, a 3-player shop per round, and sell buttons on the roster.

**Architecture:** A new `playerCost()` utility in `src/logic/playerValue.ts` is the single source of truth for tier-to-cost mapping. `generateRandomRoster` becomes sequential to track a running budget. The Zustand store gains `coins`, `shopOffer`, `shopComplete`, and `pendingShopBoughtId` state plus `buyFromShop` and `sellPlayer` actions. Three new UI components handle the shop and sell confirm flows. `RoundHub` gains a Shop button; `RosterSummary` gains a cap-space stat; `RosterGrid` passes sell callbacks to `PlayerCard`.

**Tech Stack:** React + TypeScript, Zustand, Vitest, Tailwind CSS

---

## File Map

| Action | File |
|--------|------|
| Create | `src/logic/playerValue.ts` |
| Create | `src/logic/playerValue.test.ts` |
| Modify | `src/logic/rosterGen.ts` |
| Modify | `src/logic/rosterGen.test.ts` |
| Modify | `src/types/index.ts` |
| Modify | `src/store/gameStore.ts` |
| Modify | `src/store/gameStore.test.ts` |
| Modify | `src/components/roster/PlayerCard.tsx` |
| Create | `src/components/roster/ConfirmSellModal.tsx` |
| Modify | `src/components/roster/RosterGrid.tsx` |
| Modify | `src/components/screens/RosterView.tsx` |
| Create | `src/components/round/ShopModal.tsx` |
| Modify | `src/components/round/RoundHub.tsx` |
| Modify | `src/components/roster/RosterSummary.tsx` |

---

### Task 1: playerCost utility

**Files:**
- Create: `src/logic/playerValue.ts`
- Create: `src/logic/playerValue.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/logic/playerValue.test.ts
import { describe, it, expect } from 'vitest'
import { playerCost } from './playerValue'

describe('playerCost', () => {
  it('returns 30 for Legendary (≥98)', () => { expect(playerCost(99)).toBe(30) })
  it('returns 30 for Elite (≥93)', () => { expect(playerCost(95)).toBe(30) })
  it('returns 30 at the exact Elite boundary (93)', () => { expect(playerCost(93)).toBe(30) })
  it('returns 20 for Great (≥85)', () => { expect(playerCost(90)).toBe(20) })
  it('returns 20 at the exact Great boundary (85)', () => { expect(playerCost(85)).toBe(20) })
  it('returns 15 for Good (≥75)', () => { expect(playerCost(80)).toBe(15) })
  it('returns 10 for Average (≥65)', () => { expect(playerCost(70)).toBe(10) })
  it('returns 5 for Below Avg (<65)', () => { expect(playerCost(60)).toBe(5) })
  it('returns 5 for undefined rating', () => { expect(playerCost(undefined)).toBe(5) })
})
```

- [ ] **Step 2: Run test — expect FAIL ("Cannot find module")**

```bash
npx vitest run src/logic/playerValue.test.ts
```

Expected: `Error: Cannot find module './playerValue'`

- [ ] **Step 3: Write the implementation**

```ts
// src/logic/playerValue.ts
export function playerCost(rating: number | undefined): number {
  if (rating === undefined) return 5
  if (rating >= 93) return 30
  if (rating >= 85) return 20
  if (rating >= 75) return 15
  if (rating >= 65) return 10
  return 5
}
```

Note: `>= 93` covers both Legendary (≥98) and Elite (≥93) tiers — they share the same cost per the spec.

- [ ] **Step 4: Run test — expect all PASS**

```bash
npx vitest run src/logic/playerValue.test.ts
```

Expected: 9 passed

- [ ] **Step 5: Commit**

```bash
git add src/logic/playerValue.ts src/logic/playerValue.test.ts
git commit -m "feat: add playerCost utility (tier-to-coins mapping)"
```

---

### Task 2: Type update — add shopBoughtId to RoundRecord

**Files:**
- Modify: `src/types/index.ts`

The `RoundRecord` interface needs `shopBoughtId: string | null` parallel to `draftedId`.

- [ ] **Step 1: Add the field**

In `src/types/index.ts`, update `RoundRecord`:

```ts
export interface RoundRecord {
  round: number
  opponentTeam: string
  opponentYear: number
  draftedId: string | null
  weather: WeatherCondition
  result: 'win' | 'loss' | 'tie'
  shopBoughtId: string | null
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: errors in `gameStore.ts` only (advanceRound builds a RoundRecord without `shopBoughtId`). We'll fix that in Task 4.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add shopBoughtId to RoundRecord type"
```

---

### Task 3: Budget-aware generateRandomRoster + generateShopOffer

**Files:**
- Modify: `src/logic/rosterGen.ts`
- Modify: `src/logic/rosterGen.test.ts`

- [ ] **Step 1: Write the failing tests**

Add these two `describe` blocks to the bottom of `src/logic/rosterGen.test.ts`:

```ts
// at the top of the file, extend the existing import:
import { generateRandomRoster, generateRandomSlot, generateShopOffer } from './rosterGen'
import { playerCost } from './playerValue'
```

```ts
describe('generateRandomRoster (budget-aware)', () => {
  it('total coin cost never exceeds 100', async () => {
    const roster = await generateRandomRoster()
    const slots = [
      roster.QB, roster.WR1, roster.WR2, roster.RB,
      roster.K, roster.OLine, roster.DLine, roster.Secondary,
    ]
    const total = slots.reduce((sum, s) => sum + playerCost(s?.rating), 0)
    expect(total).toBeLessThanOrEqual(100)
  })
})

describe('generateShopOffer', () => {
  it('returns exactly 3 items', async () => {
    const offer = await generateShopOffer(100)
    expect(offer).toHaveLength(3)
  })

  it('all 3 items are defined', async () => {
    const offer = await generateShopOffer(100)
    expect(offer[0]).toBeDefined()
    expect(offer[1]).toBeDefined()
    expect(offer[2]).toBeDefined()
  })

  it('returns 3 items even when coins are low (may be unaffordable)', async () => {
    const offer = await generateShopOffer(0)
    expect(offer).toHaveLength(3)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run src/logic/rosterGen.test.ts
```

Expected: `generateShopOffer` tests fail with "is not a function"; budget test may pass trivially (mock has no ratings → cost=5, total=40≤100).

- [ ] **Step 3: Update rosterGen.ts**

Replace the entire contents of `src/logic/rosterGen.ts`:

```ts
import { loadTeamMeta, loadTeamRoster } from './dataLoader'
import { playerCost } from './playerValue'
import type {
  Roster, RosterPosition, Player, TeamUnit, TeamMeta, TeamRosterData,
  QBStats, WRStats, RBStats, KStats,
} from '../types'

let metaCache: TeamMeta[] | null = null

async function getMeta(): Promise<TeamMeta[]> {
  if (!metaCache) metaCache = await loadTeamMeta()
  return metaCache
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

const UNIT_POSITIONS = new Set<RosterPosition>(['OLine', 'DLine', 'Secondary'])
const PLAYER_POSITION_MAP: Record<RosterPosition, string> = {
  QB: 'QB', WR1: 'WR', WR2: 'WR', RB: 'RB', K: 'K',
  OLine: 'OLine', DLine: 'DLine', Secondary: 'Secondary',
}

export async function generateRandomSlot(position: RosterPosition, retries = 5): Promise<Player | TeamUnit> {
  const meta = await getMeta()
  const { team, year } = pickRandom(meta)
  const { players, units } = await loadTeamRoster(year, team)
  const targetPos = PLAYER_POSITION_MAP[position]

  if (UNIT_POSITIONS.has(position)) {
    const match = units.find(u => u.position === targetPos)
    if (match) return match
  } else {
    const matches = players.filter(p => p.position === targetPos)
    if (matches.length > 0) return pickRandom(matches)
  }

  if (retries <= 0) throw new Error(`Could not find a player for position ${position}`)
  return generateRandomSlot(position, retries - 1)
}

export async function generateRandomRoster(): Promise<Roster> {
  const positions: RosterPosition[] = ['QB', 'WR1', 'WR2', 'RB', 'K', 'OLine', 'DLine', 'Secondary']
  const slots: (Player | TeamUnit)[] = []
  let remainingBudget = 100

  for (const pos of positions) {
    let best = await generateRandomSlot(pos)
    let bestCost = playerCost(best.rating)

    for (let attempt = 1; attempt < 5; attempt++) {
      if (bestCost <= remainingBudget) break
      const candidate = await generateRandomSlot(pos)
      const candidateCost = playerCost(candidate.rating)
      if (candidateCost < bestCost) {
        best = candidate
        bestCost = candidateCost
      }
    }

    slots.push(best)
    remainingBudget = Math.max(0, remainingBudget - bestCost)
  }

  return {
    QB: slots[0] as Player,
    WR1: slots[1] as Player,
    WR2: slots[2] as Player,
    RB: slots[3] as Player,
    K: slots[4] as Player,
    OLine: slots[5] as TeamUnit,
    DLine: slots[6] as TeamUnit,
    Secondary: slots[7] as TeamUnit,
  }
}

const SHOP_POSITION_POOL: RosterPosition[] = [
  'QB', 'WR1', 'WR2', 'RB', 'K', 'OLine', 'DLine', 'Secondary',
]

export async function generateShopOffer(remainingCoins: number): Promise<(Player | TeamUnit)[]> {
  const shuffled = [...SHOP_POSITION_POOL].sort(() => Math.random() - 0.5)
  const positions = shuffled.slice(0, 3)
  const offer: (Player | TeamUnit)[] = []

  for (const pos of positions) {
    let slot = await generateRandomSlot(pos)
    for (let attempt = 1; attempt < 5; attempt++) {
      if (playerCost(slot.rating) <= remainingCoins) break
      slot = await generateRandomSlot(pos)
    }
    offer.push(slot)
  }

  return offer
}

function bestBy<T extends Player | TeamUnit>(items: T[], scoreFn: (item: T) => number): T | null {
  if (items.length === 0) return null
  return items.reduce((best, item) => (scoreFn(item) > scoreFn(best) ? item : best))
}

/** Builds a representative roster from a team's full season data, picking the top performer at each position. */
export function selectTopRoster(data: TeamRosterData): Roster {
  const { players, units } = data
  const qbs = players.filter(p => p.position === 'QB')
  const wrs = [...players.filter(p => p.position === 'WR')]
    .sort((a, b) => (b.stats as WRStats).recYPG - (a.stats as WRStats).recYPG)
  const rbs = players.filter(p => p.position === 'RB')
  const ks = players.filter(p => p.position === 'K')

  return {
    QB: bestBy(qbs, p => (p.stats as QBStats).passYPG),
    WR1: wrs[0] ?? null,
    WR2: wrs[1] ?? null,
    RB: bestBy(rbs, p => (p.stats as RBStats).rushYPG),
    K: bestBy(ks, p => (p.stats as KStats).fgAccuracy),
    OLine: units.find(u => u.position === 'OLine') ?? null,
    DLine: units.find(u => u.position === 'DLine') ?? null,
    Secondary: units.find(u => u.position === 'Secondary') ?? null,
  }
}
```

- [ ] **Step 4: Run all rosterGen tests — expect PASS**

```bash
npx vitest run src/logic/rosterGen.test.ts
```

Expected: all tests pass (budget test passes trivially since mock players have no `rating` → cost=5×8=40≤100)

- [ ] **Step 5: Commit**

```bash
git add src/logic/rosterGen.ts src/logic/rosterGen.test.ts
git commit -m "feat: budget-aware generateRandomRoster and generateShopOffer"
```

---

### Task 4: Store — new state and actions

**Files:**
- Modify: `src/store/gameStore.ts`

Add `coins`, `shopOffer`, `shopComplete`, `pendingShopBoughtId` state; update `buildNextRoundData`; update `initGame`, `confirmSetup`, `advanceRound`; add `buyFromShop` and `sellPlayer`.

- [ ] **Step 1: Replace the full contents of `src/store/gameStore.ts`**

```ts
import { create } from 'zustand'
import { generateRandomRoster, generateRandomSlot, generateShopOffer } from '../logic/rosterGen'
import {
  generateDraftOffer, generateOpponent,
  rerollDraftOfferTeam as genOfferNewTeam, rerollDraftOfferYear as genOfferNewYear,
} from '../logic/draftGen'
import { generateWeather } from '../logic/weatherGen'
import { simulateGame as runSimulation } from '../logic/gameSimulator'
import { playerCost } from '../logic/playerValue'
import type {
  GamePhase, Roster, RosterPosition, Player, TeamUnit,
  DraftOffer, TeamStats, WeatherCondition, RoundRecord, SimulationResult,
} from '../types'

interface GameStore {
  phase: GamePhase
  round: number
  roster: Roster
  coins: number
  shopOffer: (Player | TeamUnit)[] | null
  shopComplete: boolean
  pendingShopBoughtId: string | null
  setupRerollsRemaining: number
  draftRerollAvailable: boolean
  currentOpponent: TeamStats | null
  currentOpponentRoster: Roster | null
  currentWeather: WeatherCondition | null
  currentDraftOffer: DraftOffer | null
  seasonLog: RoundRecord[]
  isLoading: boolean
  draftComplete: boolean
  simulationResult: SimulationResult | null
  pendingDraftedId: string | null

  initGame: () => Promise<void>
  rerollSetupSlot: (position: RosterPosition) => Promise<void>
  confirmSetup: () => Promise<void>
  viewDraftOffer: () => void
  rerollDraftOfferTeam: () => Promise<void>
  rerollDraftOfferYear: () => Promise<void>
  draftPlayer: (id: string, targetPosition: RosterPosition) => void
  skipDraft: () => void
  simulateGame: () => void
  advanceRound: () => Promise<void>
  buyFromShop: (buyId: string, sellPosition: RosterPosition) => void
  sellPlayer: (position: RosterPosition) => void
}

const EMPTY_ROSTER: Roster = {
  QB: null, WR1: null, WR2: null, RB: null,
  K: null, OLine: null, DLine: null, Secondary: null,
}

function rosterCost(roster: Roster): number {
  return Object.values(roster).reduce(
    (sum: number, slot) => sum + (slot ? playerCost(slot.rating) : 0), 0
  )
}

async function buildNextRoundData(remainingCoins: number) {
  const [{ stats: opponent, roster: opponentRoster }, draftOffer, shopOffer] = await Promise.all([
    generateOpponent(),
    generateDraftOffer(),
    generateShopOffer(remainingCoins),
  ])
  const weather = generateWeather()
  return { opponent, opponentRoster, draftOffer, weather, shopOffer }
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'setup',
  round: 1,
  roster: EMPTY_ROSTER,
  coins: 0,
  shopOffer: null,
  shopComplete: false,
  pendingShopBoughtId: null,
  setupRerollsRemaining: 3,
  draftRerollAvailable: true,
  currentOpponent: null,
  currentOpponentRoster: null,
  currentWeather: null,
  currentDraftOffer: null,
  seasonLog: [],
  isLoading: false,
  draftComplete: false,
  simulationResult: null,
  pendingDraftedId: null,

  initGame: async () => {
    set({ isLoading: true })
    const roster = await generateRandomRoster()
    const coins = 100 - rosterCost(roster)
    set({
      roster, phase: 'setup', round: 1, setupRerollsRemaining: 3, seasonLog: [],
      coins, shopOffer: null, shopComplete: false, pendingShopBoughtId: null, isLoading: false,
    })
  },

  rerollSetupSlot: async (position) => {
    const { setupRerollsRemaining, roster } = get()
    if (setupRerollsRemaining <= 0) return
    set({ isLoading: true })
    const newSlot = await generateRandomSlot(position)
    set({
      roster: { ...roster, [position]: newSlot },
      setupRerollsRemaining: setupRerollsRemaining - 1,
      isLoading: false,
    })
  },

  confirmSetup: async () => {
    set({ isLoading: true })
    const { roster } = get()
    const coins = 100 - rosterCost(roster)
    const { opponent, opponentRoster, draftOffer, weather, shopOffer } = await buildNextRoundData(coins)
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
      isLoading: false,
    })
  },

  viewDraftOffer: () => set({ phase: 'draft-offer' }),

  rerollDraftOfferTeam: async () => {
    const { draftRerollAvailable, currentDraftOffer } = get()
    if (!draftRerollAvailable || !currentDraftOffer) return
    set({ isLoading: true })
    const draftOffer = await genOfferNewTeam(currentDraftOffer.team, currentDraftOffer.year)
    set({ currentDraftOffer: draftOffer, draftRerollAvailable: false, isLoading: false })
  },

  rerollDraftOfferYear: async () => {
    const { draftRerollAvailable, currentDraftOffer } = get()
    if (!draftRerollAvailable || !currentDraftOffer) return
    set({ isLoading: true })
    const draftOffer = await genOfferNewYear(currentDraftOffer.team, currentDraftOffer.year)
    set({ currentDraftOffer: draftOffer, draftRerollAvailable: false, isLoading: false })
  },

  draftPlayer: (id, targetPosition) => {
    const { roster, currentDraftOffer } = get()
    if (!currentDraftOffer) return
    const allItems = [...currentDraftOffer.players, ...currentDraftOffer.units]
    const selected = allItems.find(item => item.id === id) as Player | TeamUnit | undefined
    if (!selected) return
    set({
      roster: { ...roster, [targetPosition]: selected },
      draftComplete: true,
      pendingDraftedId: id,
      phase: 'round-hub',
    })
  },

  skipDraft: () => {
    set({ draftComplete: true, pendingDraftedId: null, phase: 'round-hub' })
  },

  simulateGame: () => {
    const { roster, currentOpponentRoster, currentOpponent } = get()
    if (!currentOpponentRoster || !currentOpponent) return
    const opponentLabel = `${currentOpponent.team} '${String(currentOpponent.year).slice(2)}`
    const result = runSimulation(roster, currentOpponentRoster, opponentLabel)
    set({ simulationResult: result })
  },

  advanceRound: async () => {
    const {
      round, seasonLog, currentOpponent, currentWeather,
      pendingDraftedId, simulationResult, pendingShopBoughtId, coins,
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
      })
      return
    }

    set({ isLoading: true })
    const { opponent, opponentRoster, draftOffer, weather, shopOffer } = await buildNextRoundData(coins)
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
      isLoading: false,
    })
  },

  buyFromShop: (buyId, sellPosition) => {
    const { roster, shopOffer, coins } = get()
    if (!shopOffer) return
    const newPlayer = shopOffer.find(p => p.id === buyId)
    if (!newPlayer) return
    const newCost = playerCost(newPlayer.rating)
    const currentSlot = roster[sellPosition]
    const refund = currentSlot ? playerCost(currentSlot.rating) : 0
    set({
      roster: { ...roster, [sellPosition]: newPlayer },
      coins: coins - newCost + refund,
      shopComplete: true,
      pendingShopBoughtId: buyId,
    })
  },

  sellPlayer: (position) => {
    const { roster, coins } = get()
    const player = roster[position]
    if (!player) return
    set({
      roster: { ...roster, [position]: null },
      coins: coins + playerCost(player.rating),
    })
  },
}))
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/store/gameStore.ts
git commit -m "feat: add coins/shop state and buyFromShop/sellPlayer actions to store"
```

---

### Task 5: Store tests — update and add new

**Files:**
- Modify: `src/store/gameStore.test.ts`

Two changes required: (1) update the existing `vi.mock` for rosterGen to include `generateShopOffer`, and (2) update `INITIAL_STATE` to include the new fields, then add tests for `buyFromShop` and `sellPlayer`.

- [ ] **Step 1: Update the vi.mock for rosterGen**

Find this block in `src/store/gameStore.test.ts`:

```ts
vi.mock('../logic/rosterGen', () => ({
  generateRandomRoster: vi.fn().mockResolvedValue(mockRoster),
  generateRandomSlot: vi.fn().mockResolvedValue(mockRoster.QB),
}))
```

Replace it with:

```ts
vi.mock('../logic/rosterGen', () => ({
  generateRandomRoster: vi.fn().mockResolvedValue(mockRoster),
  generateRandomSlot: vi.fn().mockResolvedValue(mockRoster.QB),
  generateShopOffer: vi.fn().mockResolvedValue([mockRoster.QB!, mockRoster.OLine!, mockRoster.DLine!]),
}))
```

- [ ] **Step 2: Update INITIAL_STATE**

Find:

```ts
const INITIAL_STATE = {
  phase: 'setup' as const,
  round: 1,
  roster: { QB: null, WR1: null, WR2: null, RB: null, K: null, OLine: null, DLine: null, Secondary: null },
  setupRerollsRemaining: 3,
  draftRerollAvailable: true,
  currentOpponent: null,
  currentOpponentRoster: null,
  currentWeather: null,
  currentDraftOffer: null,
  seasonLog: [],
  isLoading: false,
  draftComplete: false,
  simulationResult: null,
  pendingDraftedId: null,
}
```

Replace with:

```ts
const INITIAL_STATE = {
  phase: 'setup' as const,
  round: 1,
  roster: { QB: null, WR1: null, WR2: null, RB: null, K: null, OLine: null, DLine: null, Secondary: null },
  coins: 0,
  shopOffer: null,
  shopComplete: false,
  pendingShopBoughtId: null,
  setupRerollsRemaining: 3,
  draftRerollAvailable: true,
  currentOpponent: null,
  currentOpponentRoster: null,
  currentWeather: null,
  currentDraftOffer: null,
  seasonLog: [],
  isLoading: false,
  draftComplete: false,
  simulationResult: null,
  pendingDraftedId: null,
}
```

- [ ] **Step 3: Add tests for buyFromShop and sellPlayer**

Append to the end of `src/store/gameStore.test.ts`:

```ts
const shopPlayer = {
  id: 'shop-qb', name: 'Shop QB', position: 'QB' as const, team: 'DAL', year: 2020, rating: 90,
  stats: { passYPG: 280, avgTDPerGame: 1.8, avgINTPerGame: 0.8, completionPct: 0.62, qbr: 72 },
}

describe('buyFromShop', () => {
  it('replaces the slot, deducts cost, refunds old slot, sets shopComplete', () => {
    useGameStore.setState({ ...INITIAL_STATE, roster: mockRoster, coins: 50, shopOffer: [shopPlayer] })
    useGameStore.getState().buyFromShop('shop-qb', 'QB')
    const state = useGameStore.getState()
    expect(state.roster.QB?.id).toBe('shop-qb')
    // shopPlayer rating=90 → cost=20; mockRoster.QB has no rating → refund=5; 50-20+5=35
    expect(state.coins).toBe(35)
    expect(state.shopComplete).toBe(true)
    expect(state.pendingShopBoughtId).toBe('shop-qb')
  })

  it('gives no refund when replacing an empty slot', () => {
    useGameStore.setState({
      ...INITIAL_STATE,
      roster: { ...mockRoster, QB: null },
      coins: 50,
      shopOffer: [shopPlayer],
    })
    useGameStore.getState().buyFromShop('shop-qb', 'QB')
    expect(useGameStore.getState().coins).toBe(30) // 50 - 20, no refund
  })

  it('does nothing when shopOffer is null', () => {
    useGameStore.setState({ ...INITIAL_STATE, roster: mockRoster, coins: 50, shopOffer: null })
    useGameStore.getState().buyFromShop('shop-qb', 'QB')
    expect(useGameStore.getState().coins).toBe(50)
    expect(useGameStore.getState().shopComplete).toBe(false)
  })

  it('does nothing when id is not found in shopOffer', () => {
    useGameStore.setState({ ...INITIAL_STATE, roster: mockRoster, coins: 50, shopOffer: [shopPlayer] })
    useGameStore.getState().buyFromShop('nonexistent-id', 'QB')
    expect(useGameStore.getState().coins).toBe(50)
  })
})

describe('sellPlayer', () => {
  it('clears the slot and refunds the coin cost', () => {
    useGameStore.setState({ ...INITIAL_STATE, roster: mockRoster, coins: 40 })
    useGameStore.getState().sellPlayer('QB')
    const state = useGameStore.getState()
    expect(state.roster.QB).toBeNull()
    // mockRoster.QB has no rating → playerCost(undefined) = 5
    expect(state.coins).toBe(45)
  })

  it('does nothing if the slot is already empty', () => {
    useGameStore.setState({
      ...INITIAL_STATE,
      roster: { ...mockRoster, QB: null },
      coins: 40,
    })
    useGameStore.getState().sellPlayer('QB')
    expect(useGameStore.getState().coins).toBe(40)
    expect(useGameStore.getState().roster.QB).toBeNull()
  })
})
```

- [ ] **Step 4: Run all store tests — expect PASS**

```bash
npx vitest run src/store/gameStore.test.ts
```

Expected: all tests pass

- [ ] **Step 5: Commit**

```bash
git add src/store/gameStore.test.ts
git commit -m "test: update store tests for coins system (buyFromShop, sellPlayer)"
```

---

### Task 6: PlayerCard — coin badge and sell button

**Files:**
- Modify: `src/components/roster/PlayerCard.tsx`

Add optional `coinValue?: number` and `onSell?: () => void` props. When present, render a coin badge and sell button in the right-side column (where the rating tier and Re-roll button already live).

- [ ] **Step 1: Update PlayerCardProps and the component**

In `src/components/roster/PlayerCard.tsx`:

Change the interface from:

```ts
interface PlayerCardProps {
  slot: Player | TeamUnit
  position: RosterPosition
  onReroll?: () => void
  rerollsRemaining?: number
}
```

to:

```ts
interface PlayerCardProps {
  slot: Player | TeamUnit
  position: RosterPosition
  onReroll?: () => void
  rerollsRemaining?: number
  coinValue?: number
  onSell?: () => void
}
```

Change the function signature from:

```ts
export function PlayerCard({ slot, position, onReroll, rerollsRemaining = 0 }: PlayerCardProps) {
```

to:

```ts
export function PlayerCard({ slot, position, onReroll, rerollsRemaining = 0, coinValue, onSell }: PlayerCardProps) {
```

Find the right-side flex column:

```tsx
        <div className="flex flex-col items-end gap-1">
          {tier && (
            <div className="text-right">
              <span className={`text-2xl leading-none ${tier.className}`}>{rating}</span>
              <p className={`text-xs leading-none mt-0.5 ${tier.className}`}>{tier.label}</p>
            </div>
          )}
          {onReroll && (
            <Button
              onClick={onReroll}
              variant="ghost"
              disabled={rerollsRemaining <= 0}
              className="text-xs"
            >
              Re-roll
            </Button>
          )}
        </div>
```

Replace with:

```tsx
        <div className="flex flex-col items-end gap-1">
          {tier && (
            <div className="text-right">
              <span className={`text-2xl leading-none ${tier.className}`}>{rating}</span>
              <p className={`text-xs leading-none mt-0.5 ${tier.className}`}>{tier.label}</p>
            </div>
          )}
          {coinValue !== undefined && (
            <span className="text-xs font-semibold text-yellow-500 dark:text-yellow-400 tabular-nums">
              {coinValue}c
            </span>
          )}
          {onReroll && (
            <Button
              onClick={onReroll}
              variant="ghost"
              disabled={rerollsRemaining <= 0}
              className="text-xs"
            >
              Re-roll
            </Button>
          )}
          {onSell && (
            <button
              onClick={onSell}
              className="text-xs font-semibold text-red-400 hover:text-red-300 transition-colors px-1 py-0.5 rounded"
            >
              Sell
            </button>
          )}
        </div>
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/components/roster/PlayerCard.tsx
git commit -m "feat: add coinValue and onSell props to PlayerCard"
```

---

### Task 7: ConfirmSellModal

**Files:**
- Create: `src/components/roster/ConfirmSellModal.tsx`

A small centered modal for the standalone sell flow (triggered from the roster view, not the shop).

- [ ] **Step 1: Create the component**

```tsx
// src/components/roster/ConfirmSellModal.tsx
import { Button } from '../ui/Button'

interface Props {
  playerName: string
  refundValue: number
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmSellModal({ playerName, refundValue, onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 max-w-sm w-full shadow-2xl">
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">Sell Player?</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
          Sell{' '}
          <span className="font-semibold text-gray-900 dark:text-white">{playerName}</span>?
          You'll receive{' '}
          <span className="font-bold text-yellow-500 dark:text-yellow-400">{refundValue} coins</span>{' '}
          and the slot will be left empty.
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg font-semibold text-sm bg-red-600 hover:bg-red-500 text-white transition-colors"
          >
            Confirm Sale
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/components/roster/ConfirmSellModal.tsx
git commit -m "feat: add ConfirmSellModal component"
```

---

### Task 8: RosterGrid + RosterView — sell button wiring

**Files:**
- Modify: `src/components/roster/RosterGrid.tsx`
- Modify: `src/components/screens/RosterView.tsx`

`RosterGrid` gains an optional `onSell` prop and passes `coinValue`/`onSell` to each `PlayerCard`. `RosterView` manages `sellPos` state and renders `ConfirmSellModal` when a sell is triggered.

- [ ] **Step 1: Update RosterGrid**

Replace the entire contents of `src/components/roster/RosterGrid.tsx`:

```tsx
import { PlayerCard } from './PlayerCard'
import { playerCost } from '../../logic/playerValue'
import type { Roster, RosterPosition } from '../../types'

interface RosterGridProps {
  roster: Roster
  onReroll?: (position: RosterPosition) => void
  rerollsRemaining?: number
  onSell?: (position: RosterPosition) => void
}

const POSITIONS: RosterPosition[] = ['QB', 'WR1', 'WR2', 'RB', 'K', 'OLine', 'DLine', 'Secondary']

export function RosterGrid({ roster, onReroll, rerollsRemaining = 0, onSell }: RosterGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {POSITIONS.map(pos => {
        const slot = roster[pos]
        if (!slot) return (
          <div key={pos} className="bg-white dark:bg-gray-900 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-4 flex items-center justify-center">
            <span className="text-gray-500 dark:text-gray-600 text-sm">Empty</span>
          </div>
        )
        return (
          <PlayerCard
            key={pos}
            slot={slot}
            position={pos}
            onReroll={onReroll ? () => onReroll(pos) : undefined}
            rerollsRemaining={rerollsRemaining}
            coinValue={playerCost(slot.rating)}
            onSell={onSell ? () => onSell(pos) : undefined}
          />
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Update RosterView**

Replace the entire contents of `src/components/screens/RosterView.tsx`:

```tsx
import { useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { RosterGrid } from '../roster/RosterGrid'
import { RosterSummary } from '../roster/RosterSummary'
import { ConfirmSellModal } from '../roster/ConfirmSellModal'
import { playerCost } from '../../logic/playerValue'
import type { RosterPosition } from '../../types'

const POSITION_LABELS: Record<RosterPosition, string> = {
  QB: 'QB', WR1: 'WR1', WR2: 'WR2', RB: 'RB', K: 'K',
  OLine: 'O-Line', DLine: 'D-Line', Secondary: 'Secondary',
}

export function RosterView() {
  const { roster, sellPlayer } = useGameStore()
  const [sellPos, setSellPos] = useState<RosterPosition | null>(null)

  const sellSlot = sellPos ? roster[sellPos] : null
  const playerName = sellSlot
    ? ('name' in sellSlot ? sellSlot.name : `${sellSlot.team} ${POSITION_LABELS[sellPos!]}`)
    : ''

  const confirmSell = () => {
    if (sellPos) sellPlayer(sellPos)
    setSellPos(null)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">My Roster</h2>
      <RosterSummary roster={roster} />
      <RosterGrid roster={roster} onSell={setSellPos} />
      {sellPos && sellSlot && (
        <ConfirmSellModal
          playerName={playerName}
          refundValue={playerCost(sellSlot.rating)}
          onConfirm={confirmSell}
          onCancel={() => setSellPos(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/components/roster/RosterGrid.tsx src/components/screens/RosterView.tsx
git commit -m "feat: wire sell buttons to RosterGrid and RosterView"
```

---

### Task 9: ShopModal

**Files:**
- Create: `src/components/round/ShopModal.tsx`

Two internal views: **browse** (shows 3 shop players with buy buttons) and **replace** (shows the current roster slot(s) at that position, lets user pick which to replace). After confirming, calls `buyFromShop` and closes.

- [ ] **Step 1: Create the component**

```tsx
// src/components/round/ShopModal.tsx
import { useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { PlayerCard } from '../roster/PlayerCard'
import { Button } from '../ui/Button'
import { playerCost } from '../../logic/playerValue'
import type { Player, TeamUnit, RosterPosition } from '../../types'

type ShopView = 'browse' | 'replace'

const POSITION_LABELS: Record<RosterPosition, string> = {
  QB: 'QB', WR1: 'WR1', WR2: 'WR2', RB: 'RB', K: 'K',
  OLine: 'O-Line', DLine: 'D-Line', Secondary: 'Secondary',
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
  const { shopOffer, coins, shopComplete, roster, buyFromShop } = useGameStore()
  const [view, setView] = useState<ShopView>('browse')
  const [buyTarget, setBuyTarget] = useState<(Player | TeamUnit) | null>(null)
  const [sellPosition, setSellPosition] = useState<RosterPosition | null>(null)

  if (!shopOffer) return null

  const handleBuyClick = (player: Player | TeamUnit) => {
    const eligible = eligibleSlots(player)
    setBuyTarget(player)
    setSellPosition(eligible.length === 1 ? eligible[0] : null)
    setView('replace')
  }

  const handleConfirm = () => {
    if (!buyTarget || !sellPosition) return
    buyFromShop(buyTarget.id, sellPosition)
    onClose()
  }

  const handleBack = () => {
    setBuyTarget(null)
    setSellPosition(null)
    setView('browse')
  }

  if (view === 'replace' && buyTarget) {
    const cost = playerCost(buyTarget.rating)
    const slots = eligibleSlots(buyTarget)
    const refund = sellPosition ? playerCost(roster[sellPosition]?.rating) : 0
    const netCost = cost - refund

    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-950 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl">
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
                    <PlayerCard
                      slot={current}
                      position={pos}
                      coinValue={playerCost(current.rating)}
                    />
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
              <Button variant="secondary" onClick={handleBack}>Back</Button>
              <Button onClick={handleConfirm} disabled={!sellPosition}>
                Confirm Purchase
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-950 border border-gray-700 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
        <div className="p-5 border-b border-gray-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-0.5">Shop</p>
            <p className="text-sm text-gray-400">
              <span className="text-yellow-400 font-bold">{coins}</span> coins remaining
            </p>
          </div>
          <Button variant="ghost" onClick={onClose}>✕</Button>
        </div>

        {shopComplete ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <p className="text-gray-400 text-center">You've already made a purchase this round.</p>
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
                      onClick={() => canAfford && handleBuyClick(player)}
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
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/components/round/ShopModal.tsx
git commit -m "feat: add ShopModal with browse and sell-to-replace views"
```

---

### Task 10: RoundHub + RosterSummary — final wiring

**Files:**
- Modify: `src/components/round/RoundHub.tsx`
- Modify: `src/components/roster/RosterSummary.tsx`

`RoundHub` gets a "Shop" button, coin display in the header, and renders `ShopModal`. `RosterSummary` reads `coins` from the store and adds a "Cap Space" stat in the meta group.

- [ ] **Step 1: Update RoundHub**

Replace the entire contents of `src/components/round/RoundHub.tsx`:

```tsx
import { useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { MatchupSummary } from './MatchupSummary'
import { PositionMatchups } from './PositionMatchups'
import { SimulationModal } from './SimulationModal'
import { ShopModal } from './ShopModal'
import { Button } from '../ui/Button'

export function RoundHub() {
  const {
    round, roster, currentOpponent, currentOpponentRoster, currentWeather,
    viewDraftOffer, simulateGame, draftComplete, isLoading, seasonLog,
    coins, shopComplete,
  } = useGameStore()
  const [shopOpen, setShopOpen] = useState(false)

  const wins = seasonLog.filter(r => r.result === 'win').length
  const losses = seasonLog.filter(r => r.result === 'loss').length
  const ties = seasonLog.filter(r => r.result === 'tie').length

  if (!currentOpponent || !currentOpponentRoster || !currentWeather) return null

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">NFL Season</p>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Week {round} <span className="text-gray-400 dark:text-gray-500 text-xl font-normal">of 17</span>
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 tabular-nums">
            {wins}–{losses}{ties > 0 ? `–${ties}` : ''}
          </p>
          <p className="text-xs mt-0.5 tabular-nums">
            <span className="text-yellow-500 dark:text-yellow-400 font-semibold">{coins}</span>
            <span className="text-gray-500 dark:text-gray-400"> / 100 coins</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShopOpen(true)}
            disabled={isLoading || shopComplete}
            variant="secondary"
          >
            {shopComplete ? 'Shop ✓' : 'Shop'}
          </Button>
          <Button onClick={viewDraftOffer} disabled={isLoading || draftComplete} variant="secondary">
            View Draft Offer →
          </Button>
          <Button onClick={simulateGame} disabled={isLoading}>
            Simulate Game
          </Button>
        </div>
      </div>
      <MatchupSummary
        userRoster={roster}
        opponentRoster={currentOpponentRoster}
        opponentTeam={currentOpponent.team}
        opponentYear={currentOpponent.year}
        weather={currentWeather}
      />
      <div className="mt-4">
        <PositionMatchups
          opponentTeam={currentOpponent.team}
          opponentRoster={currentOpponentRoster}
          userRoster={roster}
        />
      </div>
      <SimulationModal />
      {shopOpen && <ShopModal onClose={() => setShopOpen(false)} />}
    </div>
  )
}
```

- [ ] **Step 2: Update RosterSummary**

In `src/components/roster/RosterSummary.tsx`, add the store import and coins display.

Change the import section from:

```ts
import { computeRosterSummary } from '../../logic/stats'
import type { Roster } from '../../types'
```

to:

```ts
import { computeRosterSummary } from '../../logic/stats'
import { useGameStore } from '../../store/gameStore'
import type { Roster } from '../../types'
```

Change the component from:

```ts
export function RosterSummary({ roster }: { roster: Roster }) {
  const s = computeRosterSummary(roster)
```

to:

```ts
export function RosterSummary({ roster }: { roster: Roster }) {
  const s = computeRosterSummary(roster)
  const { coins } = useGameStore()
```

Add a 4th item to the meta group (after the "Roster Filled" stat):

```tsx
        <SummaryStat label="All-Pros" value={`${s.allProCount} ⭐️`} />
        <SummaryStat
          label="Award Winners"
          value={String(s.awardWinnerCount)}
          valueClassName={s.awardWinnerCount > 0 ? 'text-yellow-500 dark:text-yellow-400' : undefined}
        />
        <SummaryStat label="Roster Filled" value={`${s.rosterFilled}/${s.rosterSize}`} />
        <SummaryStat
          label="Cap Space"
          value={`${coins} / 100`}
          valueClassName={
            coins < 20 ? 'text-red-500 dark:text-red-400'
            : coins < 50 ? 'text-yellow-500 dark:text-yellow-400'
            : 'text-green-500 dark:text-green-400'
          }
        />
```

- [ ] **Step 3: Type-check and run all tests**

```bash
npx tsc --noEmit && npx vitest run
```

Expected: 0 type errors, all tests pass

- [ ] **Step 4: Commit**

```bash
git add src/components/round/RoundHub.tsx src/components/roster/RosterSummary.tsx
git commit -m "feat: wire Shop button and coin display to RoundHub and RosterSummary"
```

---

## Self-Review

### Spec coverage

| Spec requirement | Task |
|-----------------|------|
| Tier → cost mapping single source of truth | Task 1 (`playerCost`) |
| Starting roster fits in 100 coins | Task 3 (budget-aware `generateRandomRoster`) |
| `coins = 100 - rosterCost` set at `initGame` | Task 4 |
| `confirmSetup` recalculates coins (handles rerolls) | Task 4 |
| Shop refreshes each round via `buildNextRoundData` | Task 4 |
| `buyFromShop` — refund + deduct + `shopComplete: true` | Tasks 4 & 5 |
| One purchase per round (`shopComplete` gate) | Task 9 (ShopModal shows "purchased" msg), Task 10 (button disabled) |
| `sellPlayer` — refund + slot → null | Tasks 4 & 5 |
| Sell leaves slot empty | Task 8 (empty slot shown in RosterGrid) |
| `RoundRecord.shopBoughtId` | Tasks 2 & 4 |
| `advanceRound` resets `shopComplete`, includes `shopBoughtId` | Task 4 |
| Coin badge on PlayerCard | Task 6 |
| Sell button on roster PlayerCards → ConfirmSellModal | Tasks 7 & 8 |
| ShopModal browse view with affordability gating | Task 9 |
| ShopModal sell-to-replace view with WR1/WR2 selection | Task 9 |
| ShopModal "net cost" display | Task 9 |
| Shop button in RoundHub (disabled after purchase) | Task 10 |
| Coin display in RoundHub header | Task 10 |
| Cap Space in RosterSummary meta group | Task 10 |

### Type consistency check

- `playerCost(rating: number | undefined): number` defined in Task 1, used in Tasks 3, 4, 6, 8, 9
- `generateShopOffer(remainingCoins: number): Promise<(Player | TeamUnit)[]>` defined in Task 3, mocked in Task 5, called in Task 4
- `buyFromShop(buyId: string, sellPosition: RosterPosition): void` — signature consistent across Task 4 (definition), Task 5 (test), Task 9 (call site)
- `sellPlayer(position: RosterPosition): void` — consistent across Tasks 4, 5, 8
- `RoundRecord.shopBoughtId: string | null` — added in Task 2, populated in Task 4
- `shopOffer: (Player | TeamUnit)[] | null` — used in Tasks 4, 5, 9

All references consistent.
