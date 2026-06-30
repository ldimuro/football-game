# Player Abilities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Assign each Player and TeamUnit a random Ability string at generation time and display it below the die faces on all player cards.

**Architecture:** A new `abilityGen.ts` module owns the pool and `assignAbility()`. `ability` is embedded as an optional string on `Player`/`TeamUnit` at the same six generation points as `die`. UI renders it as a single text line below `DieFaces` in the Die tab.

**Tech Stack:** TypeScript, React, Vitest

## Global Constraints

- `ability` is stored as a plain `string` — no structured type, no gameplay logic
- `Loaded` ability format: `"🎲Loaded: {num1} become {num2}"` where num1 ∈ [1–10], num2 ∈ [11–20]
- Single flat pool — all 21 abilities available to any player regardless of tier
- All tests run with `npm test`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/logic/abilityGen.ts` | Create | Ability pool, `assignAbility()` |
| `src/logic/abilityGen.test.ts` | Create | Tests for ability logic |
| `src/types/index.ts` | Modify | Add `ability?: string` to Player and TeamUnit |
| `src/logic/rosterGen.ts` | Modify | Assign ability in `generateRandomSlot`, practice squad loop, rename `withDie` → `withExtras` in `selectTopRoster` |
| `src/logic/rosterGen.test.ts` | Modify | Verify ability assigned on generated slots |
| `src/logic/draftGen.ts` | Modify | Add ability to spread in all three draft functions |
| `src/components/roster/PlayerCard.tsx` | Modify | Render ability string below DieFaces in Die tab |
| `src/components/draft/PlayerPickCard.tsx` | Modify | Render ability string below DieFaces in Die tab |

---

### Task 1: Ability logic module

**Files:**
- Create: `src/logic/abilityGen.ts`
- Create: `src/logic/abilityGen.test.ts`

**Interfaces:**
- Produces:
  - `ABILITIES: string[]` — exported pool (21 entries; `'🎲Loaded'` is the sentinel)
  - `assignAbility(): string` — returns a random ability string; resolves Loaded to parameterized form

- [ ] **Step 1: Write the failing tests**

```typescript
// src/logic/abilityGen.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { assignAbility, ABILITIES } from './abilityGen'

describe('assignAbility', () => {
  afterEach(() => vi.restoreAllMocks())

  it('returns a non-empty string', () => {
    expect(typeof assignAbility()).toBe('string')
    expect(assignAbility().length).toBeGreaterThan(0)
  })

  it('returns a non-Loaded ability verbatim when that index is selected', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // always picks index 0
    expect(assignAbility()).toBe(ABILITIES[0])
  })

  it('returns a parameterized string when Loaded is selected', () => {
    const loadedIdx = ABILITIES.indexOf('🎲Loaded')
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(loadedIdx / ABILITIES.length) // pick Loaded
      .mockReturnValueOnce(0.3)  // num1 = Math.floor(0.3*10)+1 = 4
      .mockReturnValueOnce(0.6)  // num2 = Math.floor(0.6*10)+11 = 17
    expect(assignAbility()).toBe('🎲Loaded: 4 become 17')
  })

  it('Loaded num1 is in [1, 10] and num2 is in [11, 20] at extremes', () => {
    const loadedIdx = ABILITIES.indexOf('🎲Loaded')
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(loadedIdx / ABILITIES.length)
      .mockReturnValueOnce(0.99) // num1 = Math.floor(9.9)+1 = 10
      .mockReturnValueOnce(0.99) // num2 = Math.floor(9.9)+11 = 20
    const result = assignAbility()
    const match = result.match(/🎲Loaded: (\d+) become (\d+)/)!
    expect(Number(match[1])).toBe(10)
    expect(Number(match[2])).toBe(20)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/logic/abilityGen.test.ts
```

Expected: FAIL — `abilityGen` module not found

- [ ] **Step 3: Implement `src/logic/abilityGen.ts`**

```typescript
export const ABILITIES: string[] = [
  '🔄Reroll',
  '🔄Mega Reroll',
  '🔄Lucky Reroll',
  '🔄Unlucky Reroll',
  '🎲Loaded',
  '🎲Second Chance',
  '🧮Average',
  '🐈‍⬛Copycat',
  '2️⃣Evens',
  '3️⃣Odds',
  '2️⃣Evil Evens',
  '3️⃣Evil Odds',
  '🔒Lockdown',
  '📖Read the Play',
  '💪🏻2nd-Half Player',
  '💪🏻Clutch',
  '🚗Road Warrior',
  '🌧️Rain Man',
  '❄️Snow Man',
  '🏈Goal Line',
  '⏱️Two Minute Drill',
]

export function assignAbility(): string {
  const ability = ABILITIES[Math.floor(Math.random() * ABILITIES.length)]
  if (ability === '🎲Loaded') {
    const num1 = Math.floor(Math.random() * 10) + 1
    const num2 = Math.floor(Math.random() * 10) + 11
    return `🎲Loaded: ${num1} become ${num2}`
  }
  return ability
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/logic/abilityGen.test.ts
```

Expected: all 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/logic/abilityGen.ts src/logic/abilityGen.test.ts
git commit -m "feat: add ability pool and assignAbility logic"
```

---

### Task 2: Types and generation assignment

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/logic/rosterGen.ts`
- Modify: `src/logic/draftGen.ts`
- Modify: `src/logic/rosterGen.test.ts`

**Interfaces:**
- Consumes: `assignAbility(): string` from `./abilityGen`
- Produces: all `Player` and `TeamUnit` objects returned from generation functions have `ability: string` set

- [ ] **Step 1: Add `ability` field to types**

In `src/types/index.ts`, add `ability?: string` to both interfaces:

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
  ability?: string
}

export interface TeamUnit {
  id: string
  position: UnitPosition
  team: string
  year: number
  stats: OLineStats | DLineStats | SecondaryStats
  rating?: number
  die?: number[]
  ability?: string
}
```

- [ ] **Step 2: Write failing tests for ability assignment**

Add to `src/logic/rosterGen.test.ts` after the existing `die assignment` describe block:

```typescript
describe('ability assignment', () => {
  it('generateRandomSlot assigns an ability string', async () => {
    const slot = await generateRandomSlot('QB')
    expect(typeof slot.ability).toBe('string')
    expect(slot.ability!.length).toBeGreaterThan(0)
  })

  it('generateRandomSlot assigns an ability to a unit slot', async () => {
    const slot = await generateRandomSlot('OLine')
    expect(typeof slot.ability).toBe('string')
    expect(slot.ability!.length).toBeGreaterThan(0)
  })

  it('generateRandomRoster assigns an ability to every slot', async () => {
    const roster = await generateRandomRoster()
    const slots = [
      roster.QB, roster.WR1, roster.WR2, roster.RB,
      roster.K, roster.OLine, roster.DLine, roster.Secondary,
    ]
    for (const slot of slots) {
      expect(typeof slot?.ability).toBe('string')
      expect(slot?.ability!.length).toBeGreaterThan(0)
    }
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx vitest run src/logic/rosterGen.test.ts
```

Expected: the three new `ability assignment` tests FAIL, existing tests still PASS

- [ ] **Step 4: Update `generateRandomSlot` in `rosterGen.ts`**

Add `assignAbility` to the import and spread `ability` alongside `die` in both return paths:

```typescript
import { assignDie } from './diceGen'
import { assignAbility } from './abilityGen'

export async function generateRandomSlot(position: RosterPosition, retries = 5): Promise<Player | TeamUnit> {
  const meta = await getMeta()
  const { team, year } = pickRandom(meta)
  const { players, units } = await loadTeamRoster(year, team)
  const targetPos = PLAYER_POSITION_MAP[position]

  if (UNIT_POSITIONS.has(position)) {
    const match = units.find(u => u.position === targetPos)
    if (match) return { ...match, die: assignDie(match.rating), ability: assignAbility() }
  } else {
    const matches = players.filter(p => p.position === targetPos)
    if (matches.length > 0) {
      const picked = pickRandom(matches)
      return { ...picked, die: assignDie(picked.rating), ability: assignAbility() }
    }
  }

  if (retries <= 0) throw new Error(`Could not find a player for position ${position}`)
  return generateRandomSlot(position, retries - 1)
}
```

- [ ] **Step 5: Update practice squad loop in `generateRandomRoster`**

Add `slot.ability = assignAbility()` alongside the existing `slot.die` mutation:

```typescript
for (const pos of practiceSquadPositions) {
  const slot = UNIT_POSITIONS.has(pos)
    ? createPracticeSquadUnit(PLAYER_POSITION_MAP[pos] as UnitPosition)
    : createPracticeSquadPlayer(PLAYER_POSITION_MAP[pos] as IndividualPosition)
  slot.die = assignDie(slot.rating)
  slot.ability = assignAbility()
  slots[pos] = slot
}
```

- [ ] **Step 6: Rename `withDie` → `withExtras` in `selectTopRoster` and add ability**

```typescript
function withExtras<T extends Player | TeamUnit>(slot: T | null): T | null {
  return slot ? { ...slot, die: assignDie(slot.rating), ability: assignAbility() } as T : null
}

return {
  QB: withExtras(bestBy(qbs, p => (p.stats as QBStats).passYPG)),
  WR1: withExtras(wrs[0] ?? null),
  WR2: withExtras(wrs[1] ?? null),
  RB: withExtras(bestBy(rbs, p => (p.stats as RBStats).rushYPG)),
  K: withExtras(bestBy(ks, p => (p.stats as KStats).fgAccuracy)),
  OLine: withExtras(units.find(u => u.position === 'OLine') ?? null),
  DLine: withExtras(units.find(u => u.position === 'DLine') ?? null),
  Secondary: withExtras(units.find(u => u.position === 'Secondary') ?? null),
}
```

- [ ] **Step 7: Update all three draft functions in `draftGen.ts`**

Add `import { assignAbility } from './abilityGen'` and add `ability: assignAbility()` to every spread map. All three functions get the same treatment:

```typescript
import { assignDie } from './diceGen'
import { assignAbility } from './abilityGen'

export async function generateDraftOffer(): Promise<DraftOffer> {
  const meta = await getMeta()
  const { team, year } = pickRandom(meta)
  const { players, units } = await loadTeamRoster(year, team)
  return {
    team,
    year,
    players: players.map(p => ({ ...p, die: assignDie(p.rating), ability: assignAbility() })),
    units: units.map(u => ({ ...u, die: assignDie(u.rating), ability: assignAbility() })),
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
    players: players.map(p => ({ ...p, die: assignDie(p.rating), ability: assignAbility() })),
    units: units.map(u => ({ ...u, die: assignDie(u.rating), ability: assignAbility() })),
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
    players: players.map(p => ({ ...p, die: assignDie(p.rating), ability: assignAbility() })),
    units: units.map(u => ({ ...u, die: assignDie(u.rating), ability: assignAbility() })),
  }
}
```

(`generateOpponent` is unchanged — covered by `withExtras` in `selectTopRoster`.)

- [ ] **Step 8: Run all tests**

```bash
npm test
```

Expected: all tests PASS including the three new `ability assignment` tests

- [ ] **Step 9: Commit**

```bash
git add src/types/index.ts src/logic/rosterGen.ts src/logic/rosterGen.test.ts src/logic/draftGen.ts
git commit -m "feat: assign ability to all player/unit objects at generation time"
```

---

### Task 3: Display ability in player cards

**Files:**
- Modify: `src/components/roster/PlayerCard.tsx`
- Modify: `src/components/draft/PlayerPickCard.tsx`

**Interfaces:**
- Consumes: `slot.ability?: string` and `item.ability?: string` from Player/TeamUnit
- Produces: ability string rendered below DieFaces in the Die tab of both card components

- [ ] **Step 1: Add ability display to `PlayerCard.tsx`**

In `src/components/roster/PlayerCard.tsx`, add one line after the existing DieFaces render and its fallback:

Find this block:
```tsx
{tab === 'die' && slot.die && <DieFaces faces={slot.die} />}
{tab === 'die' && !slot.die && <p className="text-xs text-gray-400">—</p>}
{tab === 'stats' && <div>{renderStats(slot)}</div>}
```

Replace with:
```tsx
{tab === 'die' && slot.die && <DieFaces faces={slot.die} />}
{tab === 'die' && !slot.die && <p className="text-xs text-gray-400">—</p>}
{tab === 'die' && slot.ability && (
  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{slot.ability}</p>
)}
{tab === 'stats' && <div>{renderStats(slot)}</div>}
```

- [ ] **Step 2: Add ability display to `PlayerPickCard.tsx`**

In `src/components/draft/PlayerPickCard.tsx`, apply the same pattern:

Find this block:
```tsx
{tab === 'die' && item.die && <DieFaces faces={item.die} />}
{tab === 'die' && !item.die && <p className="text-xs text-gray-400">—</p>}
{tab === 'stats' && renderStats(item, { showRank: true })}
```

Replace with:
```tsx
{tab === 'die' && item.die && <DieFaces faces={item.die} />}
{tab === 'die' && !item.die && <p className="text-xs text-gray-400">—</p>}
{tab === 'die' && item.ability && (
  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.ability}</p>
)}
{tab === 'stats' && renderStats(item, { showRank: true })}
```

- [ ] **Step 3: Run all tests**

```bash
npm test
```

Expected: all tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/roster/PlayerCard.tsx src/components/draft/PlayerPickCard.tsx
git commit -m "feat: display player ability below die faces in card Die tab"
```
