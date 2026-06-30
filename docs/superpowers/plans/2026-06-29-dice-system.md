# Dice System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Assign each player/unit a random Die (6 face values) based on their skill tier, surface it as the primary tab on all player cards, and hide the raw rating number.

**Architecture:** A new `diceGen.ts` module owns die pools and assignment. `die` is embedded directly on `Player`/`TeamUnit` objects at generation time so no separate lookup is needed. `PlayerCard` and `PlayerPickCard` get local tab state (Die default, Stats secondary).

**Tech Stack:** TypeScript, React (useState), Tailwind CSS, Vitest

## Global Constraints

- Die has exactly 6 face values (number[])
- Tier thresholds match existing `ratingTier()`: ≥98 LEGENDARY, ≥93 ELITE, ≥85 GREAT, ≥75 GOOD, ≥65 AVERAGE, <65 BELOW_AVG
- Die face color and border color must match the player's skill tier color
- Rating number must be hidden everywhere in the UI
- All tests run with `npm test`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/logic/diceGen.ts` | Create | Die pools, `assignDie`, `dieColorClass` |
| `src/logic/diceGen.test.ts` | Create | Tests for die logic |
| `src/types/index.ts` | Modify | Add `die?: number[]` to Player and TeamUnit |
| `src/logic/rosterGen.ts` | Modify | Assign die in `generateRandomSlot`, `generateRandomRoster`, `selectTopRoster` |
| `src/logic/rosterGen.test.ts` | Modify | Verify die is assigned on generated slots |
| `src/logic/draftGen.ts` | Modify | Assign die to all players/units in all three draft functions |
| `src/components/ui/DieFaces.tsx` | Create | 3×2 grid of face value squares |
| `src/components/roster/PlayerCard.tsx` | Modify | Add Die/Stats tabs, hide rating number |
| `src/components/draft/PlayerPickCard.tsx` | Modify | Add Die/Stats tabs, hide rating number |

---

### Task 1: Die logic module

**Files:**
- Create: `src/logic/diceGen.ts`
- Create: `src/logic/diceGen.test.ts`

**Interfaces:**
- Produces:
  - `assignDie(rating: number | undefined): number[]` — returns 6-element array from tier pool
  - `dieColorClass(rating: number | undefined): string` — Tailwind classes for text + border color

- [ ] **Step 1: Write the failing tests**

```typescript
// src/logic/diceGen.test.ts
import { describe, it, expect } from 'vitest'
import { assignDie, dieColorClass, DIE_POOLS } from './diceGen'

describe('assignDie', () => {
  it('returns exactly 6 face values', () => {
    expect(assignDie(90)).toHaveLength(6)
  })

  it('returns a die from the LEGENDARY pool for rating 98', () => {
    const die = assignDie(98)
    expect(DIE_POOLS.LEGENDARY).toContainEqual(die)
  })

  it('returns a die from the LEGENDARY pool for rating 100', () => {
    const die = assignDie(100)
    expect(DIE_POOLS.LEGENDARY).toContainEqual(die)
  })

  it('returns a die from the ELITE pool for rating 93', () => {
    const die = assignDie(93)
    expect(DIE_POOLS.ELITE).toContainEqual(die)
  })

  it('returns a die from the GREAT pool for rating 85', () => {
    const die = assignDie(85)
    expect(DIE_POOLS.GREAT).toContainEqual(die)
  })

  it('returns a die from the GOOD pool for rating 75', () => {
    const die = assignDie(75)
    expect(DIE_POOLS.GOOD).toContainEqual(die)
  })

  it('returns a die from the AVERAGE pool for rating 65', () => {
    const die = assignDie(65)
    expect(DIE_POOLS.AVERAGE).toContainEqual(die)
  })

  it('returns a die from the BELOW_AVG pool for rating 64', () => {
    const die = assignDie(64)
    expect(DIE_POOLS.BELOW_AVG).toContainEqual(die)
  })

  it('returns a die from the BELOW_AVG pool for undefined rating', () => {
    const die = assignDie(undefined)
    expect(DIE_POOLS.BELOW_AVG).toContainEqual(die)
  })
})

describe('dieColorClass', () => {
  it('returns yellow class for legendary rating', () => {
    expect(dieColorClass(98)).toContain('yellow-400')
  })

  it('returns purple class for elite rating', () => {
    expect(dieColorClass(93)).toContain('purple-400')
  })

  it('returns green class for great rating', () => {
    expect(dieColorClass(85)).toContain('green-400')
  })

  it('returns blue class for good rating', () => {
    expect(dieColorClass(75)).toContain('blue-400')
  })

  it('returns gray-400 class for average rating', () => {
    expect(dieColorClass(65)).toContain('gray-400')
  })

  it('returns gray-500 class for below avg rating', () => {
    expect(dieColorClass(60)).toContain('gray-500')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/logic/diceGen.test.ts
```

Expected: FAIL — `diceGen` module not found

- [ ] **Step 3: Implement `src/logic/diceGen.ts`**

```typescript
export const DIE_POOLS: Record<string, number[][]> = {
  LEGENDARY: [
    [20, 20, 20, 20, 20, 20],
    [18, 19, 19, 19, 19, 20],
    [15, 15, 15, 20, 20, 20],
  ],
  ELITE: [
    [15, 16, 17, 18, 19, 20],
    [5, 5, 5, 20, 20, 20],
    [15, 15, 16, 16, 17, 17],
    [16, 16, 16, 17, 17, 17],
    [10, 16, 16, 16, 16, 20],
  ],
  GREAT: [
    [8, 9, 10, 10, 11, 12],
    [10, 10, 10, 15, 15, 15],
    [12, 12, 13, 13, 14, 14],
    [13, 13, 13, 14, 14, 14],
    [2, 3, 4, 18, 19, 20],
    [10, 14, 14, 14, 14, 18],
    [3, 3, 3, 18, 18, 18],
    [1, 1, 1, 1, 1, 20],
  ],
  GOOD: [
    [8, 8, 9, 9, 10, 10],
    [7, 7, 7, 10, 10, 10],
    [6, 7, 8, 9, 10, 11],
    [1, 2, 3, 15, 16, 17],
    [8, 12, 12, 12, 12, 16],
    [3, 3, 3, 15, 15, 15],
    [1, 1, 1, 1, 1, 20],
  ],
  AVERAGE: [
    [4, 5, 6, 7, 8, 9],
    [5, 5, 5, 10, 10, 10],
    [7, 7, 7, 7, 7, 7],
    [1, 2, 3, 10, 11, 12],
    [4, 7, 7, 7, 7, 10],
    [1, 1, 1, 10, 10, 10],
    [1, 1, 1, 1, 1, 20],
  ],
  BELOW_AVG: [
    [1, 2, 3, 4, 5, 6],
    [1, 1, 1, 5, 5, 5],
    [3, 3, 3, 3, 3, 3],
    [1, 2, 3, 4, 5, 10],
    [1, 1, 1, 1, 1, 10],
  ],
}

function tierForRating(rating: number | undefined): string {
  if (rating === undefined) return 'BELOW_AVG'
  if (rating >= 98) return 'LEGENDARY'
  if (rating >= 93) return 'ELITE'
  if (rating >= 85) return 'GREAT'
  if (rating >= 75) return 'GOOD'
  if (rating >= 65) return 'AVERAGE'
  return 'BELOW_AVG'
}

export function assignDie(rating: number | undefined): number[] {
  const pool = DIE_POOLS[tierForRating(rating)]
  return pool[Math.floor(Math.random() * pool.length)]
}

export function dieColorClass(rating: number | undefined): string {
  const r = rating ?? 0
  if (r >= 98) return 'text-yellow-400 border-yellow-400'
  if (r >= 93) return 'text-purple-400 border-purple-400'
  if (r >= 85) return 'text-green-400 border-green-400'
  if (r >= 75) return 'text-blue-400 border-blue-400'
  if (r >= 65) return 'text-gray-400 border-gray-400'
  return 'text-gray-500 border-gray-500'
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/logic/diceGen.test.ts
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/logic/diceGen.ts src/logic/diceGen.test.ts
git commit -m "feat: add die pools and assignDie/dieColorClass logic"
```

---

### Task 2: Types and generation assignment

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/logic/rosterGen.ts`
- Modify: `src/logic/draftGen.ts`
- Modify: `src/logic/rosterGen.test.ts`

**Interfaces:**
- Consumes: `assignDie(rating: number | undefined): number[]` from `./diceGen`
- Produces: all `Player` and `TeamUnit` objects returned from generation functions have `die: number[]` set

- [ ] **Step 1: Add `die` field to types**

In `src/types/index.ts`, add `die?: number[]` to both interfaces:

```typescript
export interface Player {
  id: string
  name: string
  position: IndividualPosition
  team: string
  year: number
  stats: QBStats | WRStats | RBStats | KStats
  rating?: number
  is_all_pro?: boolean
  is_mvp?: boolean
  is_opy?: boolean
  is_dpy?: boolean
  die?: number[]
}

export interface TeamUnit {
  id: string
  position: UnitPosition
  team: string
  year: number
  stats: OLineStats | DLineStats | SecondaryStats
  rating?: number
  die?: number[]
}
```

- [ ] **Step 2: Write failing tests for die assignment**

Add to `src/logic/rosterGen.test.ts` (after the existing `generateShopOffer` describe block):

```typescript
describe('die assignment', () => {
  it('generateRandomSlot assigns a die with 6 faces', async () => {
    const slot = await generateRandomSlot('QB')
    expect(slot.die).toBeDefined()
    expect(slot.die).toHaveLength(6)
  })

  it('generateRandomSlot assigns a die to a unit slot', async () => {
    const slot = await generateRandomSlot('OLine')
    expect(slot.die).toBeDefined()
    expect(slot.die).toHaveLength(6)
  })

  it('generateRandomRoster assigns a die to every slot', async () => {
    const roster = await generateRandomRoster()
    const slots = [
      roster.QB, roster.WR1, roster.WR2, roster.RB,
      roster.K, roster.OLine, roster.DLine, roster.Secondary,
    ]
    for (const slot of slots) {
      expect(slot?.die).toBeDefined()
      expect(slot?.die).toHaveLength(6)
    }
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx vitest run src/logic/rosterGen.test.ts
```

Expected: the three new `die assignment` tests FAIL, existing tests still PASS

- [ ] **Step 4: Assign die in `generateRandomSlot` in `rosterGen.ts`**

Replace the return-point in the if/else block so the picked slot gets a die before being returned. The full updated function (imports gain `assignDie`):

```typescript
import { assignDie } from './diceGen'

export async function generateRandomSlot(position: RosterPosition, retries = 5): Promise<Player | TeamUnit> {
  const meta = await getMeta()
  const { team, year } = pickRandom(meta)
  const { players, units } = await loadTeamRoster(year, team)
  const targetPos = PLAYER_POSITION_MAP[position]

  if (UNIT_POSITIONS.has(position)) {
    const match = units.find(u => u.position === targetPos)
    if (match) return { ...match, die: assignDie(match.rating) }
  } else {
    const matches = players.filter(p => p.position === targetPos)
    if (matches.length > 0) {
      const picked = pickRandom(matches)
      return { ...picked, die: assignDie(picked.rating) }
    }
  }

  if (retries <= 0) throw new Error(`Could not find a player for position ${position}`)
  return generateRandomSlot(position, retries - 1)
}
```

- [ ] **Step 5: Assign die to practice squad slots in `generateRandomRoster`**

In `generateRandomRoster`, the practice squad loop creates slots via `createPracticeSquadPlayer`/`createPracticeSquadUnit`. Assign a die to each:

```typescript
for (const pos of practiceSquadPositions) {
  const slot = UNIT_POSITIONS.has(pos)
    ? createPracticeSquadUnit(PLAYER_POSITION_MAP[pos] as UnitPosition)
    : createPracticeSquadPlayer(PLAYER_POSITION_MAP[pos] as IndividualPosition)
  slot.die = assignDie(slot.rating)
  slots[pos] = slot
}
```

- [ ] **Step 6: Assign die in `selectTopRoster` in `rosterGen.ts`**

`selectTopRoster` is called by `generateOpponent` and its returned players are shown via `PlayerCard` in `PositionMatchups`. Assign dice to all non-null slots before returning:

```typescript
export function selectTopRoster(data: TeamRosterData): Roster {
  const { players, units } = data
  const qbs = players.filter(p => p.position === 'QB')
  const wrs = [...players.filter(p => p.position === 'WR')]
    .sort((a, b) => (b.stats as WRStats).recYPG - (a.stats as WRStats).recYPG)
  const rbs = players.filter(p => p.position === 'RB')
  const ks = players.filter(p => p.position === 'K')

  function withDie<T extends Player | TeamUnit>(slot: T | null): T | null {
    return slot ? { ...slot, die: assignDie(slot.rating) } as T : null
  }

  return {
    QB: withDie(bestBy(qbs, p => (p.stats as QBStats).passYPG)),
    WR1: withDie(wrs[0] ?? null),
    WR2: withDie(wrs[1] ?? null),
    RB: withDie(bestBy(rbs, p => (p.stats as RBStats).rushYPG)),
    K: withDie(bestBy(ks, p => (p.stats as KStats).fgAccuracy)),
    OLine: withDie(units.find(u => u.position === 'OLine') ?? null),
    DLine: withDie(units.find(u => u.position === 'DLine') ?? null),
    Secondary: withDie(units.find(u => u.position === 'Secondary') ?? null),
  }
}
```

- [ ] **Step 7: Assign die in all three draft functions in `draftGen.ts`**

All three functions (`generateDraftOffer`, `rerollDraftOfferTeam`, `rerollDraftOfferYear`) load players/units and return them in a `DraftOffer`. Map each array to spread-assign a die:

```typescript
import { assignDie } from './diceGen'

export async function generateDraftOffer(): Promise<DraftOffer> {
  const meta = await getMeta()
  const { team, year } = pickRandom(meta)
  const { players, units } = await loadTeamRoster(year, team)
  return {
    team,
    year,
    players: players.map(p => ({ ...p, die: assignDie(p.rating) })),
    units: units.map(u => ({ ...u, die: assignDie(u.rating) })),
  }
}

export async function rerollDraftOfferTeam(currentTeam: string, currentYear: number): Promise<DraftOffer> {
  const meta = await getMeta()
  const candidates = meta.filter(m => m.year === currentYear && m.team !== currentTeam)
  const pool = candidates.length ? candidates : meta.filter(m => m.year === currentYear)
  const { team, year } = pickRandom(pool)
  const { players, units } = await loadTeamRoster(year, team)
  return {
    team,
    year,
    players: players.map(p => ({ ...p, die: assignDie(p.rating) })),
    units: units.map(u => ({ ...u, die: assignDie(u.rating) })),
  }
}

export async function rerollDraftOfferYear(currentTeam: string, currentYear: number): Promise<DraftOffer> {
  const meta = await getMeta()
  const candidates = meta.filter(m => m.team === currentTeam && m.year !== currentYear)
  const pool = candidates.length ? candidates : meta.filter(m => m.team === currentTeam)
  const { team, year } = pickRandom(pool)
  const { players, units } = await loadTeamRoster(year, team)
  return {
    team,
    year,
    players: players.map(p => ({ ...p, die: assignDie(p.rating) })),
    units: units.map(u => ({ ...u, die: assignDie(u.rating) })),
  }
}
```

(`generateOpponent` is unchanged — its die assignment goes through `selectTopRoster`.)

- [ ] **Step 8: Run all tests**

```bash
npm test
```

Expected: all tests PASS including the new `die assignment` tests

- [ ] **Step 9: Commit**

```bash
git add src/types/index.ts src/logic/rosterGen.ts src/logic/rosterGen.test.ts src/logic/draftGen.ts
git commit -m "feat: assign die to all player/unit objects at generation time"
```

---

### Task 3: DieFaces component

**Files:**
- Create: `src/components/ui/DieFaces.tsx`

**Interfaces:**
- Consumes: `dieColorClass(rating: number | undefined): string` from `../../logic/diceGen`
- Produces: `<DieFaces faces={number[]} rating={number | undefined} />` — 3×2 grid of colored squares

- [ ] **Step 1: Create `src/components/ui/DieFaces.tsx`**

```tsx
import { dieColorClass } from '../../logic/diceGen'

interface DieFacesProps {
  faces: number[]
  rating?: number
}

export function DieFaces({ faces, rating }: DieFacesProps) {
  const colorClass = dieColorClass(rating)
  return (
    <div className="grid grid-cols-3 gap-2">
      {faces.map((value, i) => (
        <div
          key={i}
          className={`flex items-center justify-center border-2 rounded-lg aspect-square font-bold text-base ${colorClass}`}
        >
          {value}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Run existing tests to confirm no regressions**

```bash
npm test
```

Expected: all tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/DieFaces.tsx
git commit -m "feat: add DieFaces component for rendering die face grid"
```

---

### Task 4: PlayerCard — tabs and hide rating

**Files:**
- Modify: `src/components/roster/PlayerCard.tsx`

**Interfaces:**
- Consumes: `<DieFaces faces={number[]} rating={number | undefined} />` from `../ui/DieFaces`
- Produces: `PlayerCard` with Die tab (default) and Stats tab; rating number removed

- [ ] **Step 1: Add tab state and DieFaces import, remove rating display**

Replace the full `PlayerCard` function in `src/components/roster/PlayerCard.tsx` with the version below. Key changes:
1. Add `import { useState } from 'react'`
2. Add `import { DieFaces } from '../ui/DieFaces'`
3. Add `const [tab, setTab] = useState<'die' | 'stats'>('die')` inside the component
4. Remove the `tier` variable and its `{rating}` display block
5. Replace `<div>{renderStats(slot)}</div>` with the tabbed content

```tsx
import { useState } from 'react'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { StatBar } from '../ui/StatBar'
import { DieFaces } from '../ui/DieFaces'
import { getTeamColor } from '../../logic/teamColors'
import { statColorClass, rankColorClass } from '../../logic/statColors'
import { PRACTICE_SQUAD_ID_PREFIX } from '../../logic/practiceSquad'
import type { Player, TeamUnit, RosterPosition, QBStats, WRStats, RBStats, KStats, OLineStats, DLineStats, SecondaryStats } from '../../types'

interface PlayerCardProps {
  slot: Player | TeamUnit
  position: RosterPosition
  onReroll?: () => void
  rerollsRemaining?: number
  coinValue?: number
  onSell?: () => void
}

const POSITION_LABELS: Record<RosterPosition, string> = {
  QB: 'QB', WR1: 'WR1', WR2: 'WR2', RB: 'RB', K: 'K',
  OLine: 'O-Line', DLine: 'D-Line', Secondary: 'Secondary',
}

export function renderStats(slot: Player | TeamUnit, options?: { showRank?: boolean }) {
  const s = slot.stats
  const { year, position } = slot
  const c = (field: string, value: number | null) => statColorClass(year, position, field, value)
  const showRank = options?.showRank ?? false

  if ('passYPG' in s) {
    const q = s as QBStats
    return (
      <>
        <StatBar label="Pass YPG" value={q.passYPG.toFixed(1)} valueClassName={c('passYPG', q.passYPG)} />
        <StatBar label="Completion%" value={(q.completionPct * 100).toFixed(1) + '%'} valueClassName={c('completionPct', q.completionPct)} />
        <StatBar label="Avg TD/G" value={q.avgTDPerGame.toFixed(2)} valueClassName={c('avgTDPerGame', q.avgTDPerGame)} />
        <StatBar label="Avg INT/G" value={q.avgINTPerGame.toFixed(2)} valueClassName={c('avgINTPerGame', q.avgINTPerGame)} />
        <StatBar label="QBR" value={q.qbr.toFixed(1)} valueClassName={c('qbr', q.qbr)} />
      </>
    )
  }
  if ('rushYPG' in s) {
    const r = s as RBStats
    return (
      <>
        <StatBar label="Rush YPG" value={r.rushYPG.toFixed(1)} valueClassName={c('rushYPG', r.rushYPG)} />
        <StatBar label="Rec YPG" value={r.recYPG.toFixed(1)} valueClassName={c('recYPG', r.recYPG)} />
        <StatBar label="TDs/Game" value={r.tdPerGame.toFixed(2)} valueClassName={c('tdPerGame', r.tdPerGame)} />
        <StatBar label="Rush Att/G" value={r.rushAttPerGame.toFixed(1)} valueClassName={c('rushAttPerGame', r.rushAttPerGame)} />
      </>
    )
  }
  if ('recYPG' in s) {
    const w = s as WRStats
    return (
      <>
        <StatBar label="Rec YPG" value={w.recYPG.toFixed(1)} valueClassName={c('recYPG', w.recYPG)} />
        <StatBar label="TDs/Game" value={w.tdPerGame.toFixed(2)} valueClassName={c('tdPerGame', w.tdPerGame)} />
        <StatBar label="Avg Targets/G" value={w.avgTargetsPerGame === null ? '-' : w.avgTargetsPerGame.toFixed(1)} valueClassName={c('avgTargetsPerGame', w.avgTargetsPerGame)} />
        <StatBar label="Avg Catches/G" value={w.avgCatchesPerGame.toFixed(1)} valueClassName={c('avgCatchesPerGame', w.avgCatchesPerGame)} />
      </>
    )
  }
  if ('fgAccuracy' in s) {
    const k = s as KStats
    return (
      <>
        <StatBar label="FG Accuracy" value={(k.fgAccuracy * 100).toFixed(1) + '%'} valueClassName={c('fgAccuracy', k.fgAccuracy)} />
        <StatBar label="Avg Kick Distance" value={k.avgKickDistance.toFixed(1)} valueClassName={c('avgKickDistance', k.avgKickDistance)} />
        <StatBar label="Avg Miss Distance" value={k.avgMissDistance.toFixed(1)} valueClassName={c('avgMissDistance', k.avgMissDistance)} />
        <StatBar label="Longest Made Kick" value={k.longestMadeKick} valueClassName={c('longestMadeKick', k.longestMadeKick)} />
      </>
    )
  }
  if ('sacksAllowedPerGame' in s) {
    const o = s as OLineStats
    return (
      <>
        <StatBar label="Sacks Allowed/G" value={o.sacksAllowedPerGame.toFixed(1)} valueClassName={c('sacksAllowedPerGame', o.sacksAllowedPerGame)} />
        <StatBar label="Rush YPC" value={o.rushYPC.toFixed(1)} valueClassName={c('rushYPC', o.rushYPC)} />
        <StatBar label="Rush TD%" value={(o.rushTDPct * 100).toFixed(1) + '%'} valueClassName={c('rushTDPct', o.rushTDPct)} />
        {showRank && <StatBar label="Rank" value={`#${o.normalizedRank}`} valueClassName={rankColorClass(o.normalizedRank)} />}
      </>
    )
  }
  if ('sackPct' in s) {
    const d = s as DLineStats
    return (
      <>
        <StatBar label="Rush YPC Allowed" value={d.rushYPCAllowed.toFixed(1)} valueClassName={c('rushYPCAllowed', d.rushYPCAllowed)} />
        <StatBar label="Rush YPG Allowed" value={d.rushYPGAllowed.toFixed(1)} valueClassName={c('rushYPGAllowed', d.rushYPGAllowed)} />
        <StatBar label="Rush TD/G Allowed" value={d.rushTDPerGameAllowed.toFixed(2)} valueClassName={c('rushTDPerGameAllowed', d.rushTDPerGameAllowed)} />
        <StatBar label="Sack%" value={(d.sackPct * 100).toFixed(1) + '%'} valueClassName={c('sackPct', d.sackPct)} />
        {showRank && <StatBar label="Rank" value={`#${d.normalizedRank}`} valueClassName={rankColorClass(d.normalizedRank)} />}
      </>
    )
  }
  const sec = s as SecondaryStats
  return (
    <>
      <StatBar label="Comp% Allowed" value={(sec.completionPctAllowed * 100).toFixed(1) + '%'} valueClassName={c('completionPctAllowed', sec.completionPctAllowed)} />
      <StatBar label="Yds/Att Allowed" value={sec.yardsPerAttemptAllowed.toFixed(1)} valueClassName={c('yardsPerAttemptAllowed', sec.yardsPerAttemptAllowed)} />
      <StatBar label="Pass YPG Allowed" value={sec.passYPGAllowed.toFixed(1)} valueClassName={c('passYPGAllowed', sec.passYPGAllowed)} />
      <StatBar label="Pass TD/G Allowed" value={sec.passTDPerGameAllowed.toFixed(2)} valueClassName={c('passTDPerGameAllowed', sec.passTDPerGameAllowed)} />
      <StatBar label="INTs/G" value={sec.interceptionsPerGame.toFixed(2)} valueClassName={c('interceptionsPerGame', sec.interceptionsPerGame)} />
      {showRank && <StatBar label="Rank" value={`#${sec.normalizedRank}`} valueClassName={rankColorClass(sec.normalizedRank)} />}
    </>
  )
}

export function ratingTier(r: number): { className: string } {
  if (r >= 98) return { className: 'text-yellow-400 font-black' }
  if (r >= 93) return { className: 'text-purple-400 font-bold' }
  if (r >= 85) return { className: 'text-green-400 font-bold' }
  if (r >= 75) return { className: 'text-blue-400 font-semibold' }
  if (r >= 65) return { className: 'text-gray-400 font-semibold' }
  return               { className: 'text-gray-500 font-semibold' }
}

export function PlayerCard({ slot, position, onReroll, rerollsRemaining = 0, coinValue, onSell }: PlayerCardProps) {
  const [tab, setTab] = useState<'die' | 'stats'>('die')
  const isUnit = 'position' in slot && !('name' in slot)
  const isPracticeSquad = slot.id.startsWith(PRACTICE_SQUAD_ID_PREFIX)
  const name = isPracticeSquad ? 'Practice Squad' : 'name' in slot ? slot.name : `${slot.team} ${POSITION_LABELS[position]}`
  const isAllPro = 'is_all_pro' in slot && slot.is_all_pro
  const isAwardWinner = ('is_mvp' in slot && slot.is_mvp) || ('is_opy' in slot && slot.is_opy) || ('is_dpy' in slot && slot.is_dpy)

  return (
    <div
      className={`border-2 rounded-xl p-4 flex flex-col gap-3 ${isAwardWinner ? 'bg-yellow-400/20' : 'bg-white dark:bg-gray-900'}`}
      style={{ borderColor: getTeamColor(slot.team) }}
    >
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            {POSITION_LABELS[position]}
          </span>
          <p className="text-gray-900 dark:text-white font-semibold mt-0.5">{name}{isAllPro && ' ⭐️'}</p>
          <div className="flex gap-1 mt-1">
            {!isPracticeSquad && <Badge label={slot.team} />}
            {!isPracticeSquad && <Badge label={String(slot.year)} color="blue" />}
            {isUnit && <Badge label="Unit" color="gray" />}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {coinValue !== undefined && (
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-yellow-500 text-gray-900 text-xs font-bold tabular-nums">
              {coinValue}
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
      </div>

      <div className="flex gap-3 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setTab('die')}
          className={`text-xs pb-1.5 font-semibold transition-colors ${tab === 'die' ? 'border-b-2 border-indigo-500 text-indigo-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
        >
          Die
        </button>
        <button
          onClick={() => setTab('stats')}
          className={`text-xs pb-1.5 font-semibold transition-colors ${tab === 'stats' ? 'border-b-2 border-indigo-500 text-indigo-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
        >
          Stats
        </button>
      </div>

      {tab === 'die' && slot.die && <DieFaces faces={slot.die} rating={slot.rating} />}
      {tab === 'die' && !slot.die && <p className="text-xs text-gray-400">—</p>}
      {tab === 'stats' && <div>{renderStats(slot)}</div>}
    </div>
  )
}
```

- [ ] **Step 2: Run all tests**

```bash
npm test
```

Expected: all tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/roster/PlayerCard.tsx
git commit -m "feat: add Die/Stats tabs to PlayerCard, hide rating number"
```

---

### Task 5: PlayerPickCard — tabs and hide rating

**Files:**
- Modify: `src/components/draft/PlayerPickCard.tsx`

**Interfaces:**
- Consumes: `renderStats` from `../roster/PlayerCard`, `<DieFaces />` from `../ui/DieFaces`
- Produces: `PlayerPickCard` with Die tab (default) and Stats tab; rating number removed

- [ ] **Step 1: Update `PlayerPickCard.tsx`**

```tsx
import { useState } from 'react'
import { Badge } from '../ui/Badge'
import { DieFaces } from '../ui/DieFaces'
import { renderStats } from '../roster/PlayerCard'
import { getTeamColor } from '../../logic/teamColors'
import type { Player, TeamUnit } from '../../types'

interface PlayerPickCardProps {
  item: Player | TeamUnit
  selected: boolean
  onClick: () => void
}

export function PlayerPickCard({ item, selected, onClick }: PlayerPickCardProps) {
  const [tab, setTab] = useState<'die' | 'stats'>('die')
  const name = 'name' in item ? item.name : `${item.team} ${item.position}`
  const isAllPro = 'is_all_pro' in item && item.is_all_pro
  const isAwardWinner = ('is_mvp' in item && item.is_mvp) || ('is_opy' in item && item.is_opy) || ('is_dpy' in item && item.is_dpy)

  return (
    <div
      onClick={onClick}
      style={{ borderColor: getTeamColor(item.team) }}
      className={`cursor-pointer rounded-lg border-2 p-3 transition-all
        ${selected ? 'ring-1 ring-indigo-500 bg-indigo-100 dark:bg-indigo-950' : isAwardWinner ? 'bg-yellow-400/20' : 'bg-white dark:bg-gray-900 hover:brightness-125'}
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{name}{isAllPro && ' ⭐️'}</p>
          <Badge label={item.position} color="blue" />
        </div>
      </div>

      <div className="flex gap-3 border-b border-gray-200 dark:border-gray-700 mb-2">
        <button
          onClick={e => { e.stopPropagation(); setTab('die') }}
          className={`text-xs pb-1.5 font-semibold transition-colors ${tab === 'die' ? 'border-b-2 border-indigo-500 text-indigo-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
        >
          Die
        </button>
        <button
          onClick={e => { e.stopPropagation(); setTab('stats') }}
          className={`text-xs pb-1.5 font-semibold transition-colors ${tab === 'stats' ? 'border-b-2 border-indigo-500 text-indigo-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
        >
          Stats
        </button>
      </div>

      {tab === 'die' && item.die && <DieFaces faces={item.die} rating={item.rating} />}
      {tab === 'die' && !item.die && <p className="text-xs text-gray-400">—</p>}
      {tab === 'stats' && renderStats(item, { showRank: true })}
    </div>
  )
}
```

Note: tab buttons use `e.stopPropagation()` so clicking a tab doesn't also trigger the card's `onClick` (which selects the player).

- [ ] **Step 2: Run all tests**

```bash
npm test
```

Expected: all tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/draft/PlayerPickCard.tsx
git commit -m "feat: add Die/Stats tabs to PlayerPickCard, hide rating number"
```
