# Football Game — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a React + Vite web app for a 17-round NFL stat-based game covering roster setup, per-round draft mechanics, opponent preview, and weather — everything up to the simulation phase.

**Architecture:** Phase-driven single-page app (no routing) — the active screen is controlled by a Zustand `phase` field (`setup | round-hub | draft-offer | complete`). Static JSON in `/public/data/` is fetched on demand per team/year combo. All game state is ephemeral (single session, no persistence).

**Tech Stack:** React 18, TypeScript 5, Vite 5, Zustand 4, Tailwind CSS 3, Vitest + @testing-library/react

---

## File Map

```
/public/data/
  meta.json                          # list of valid {team, year} combos
  players/{YEAR}/{TEAM}.json         # roster + per-game stats for one team/year
  teams/{YEAR}/{TEAM}.json           # team-level stats for opponent preview

/scripts/
  preprocess.py                      # one-time data pipeline: CSV → JSON
  requirements.txt

/src/
  types/index.ts                     # all shared TypeScript types
  logic/
    stats.ts                         # computeAggregateStats, eraNormalize
    weatherGen.ts                    # generateWeather()
    dataLoader.ts                    # fetch helpers (loadTeamMeta, loadTeamRoster, loadTeamStats)
    rosterGen.ts                     # generateRandomRoster, generateRandomSlot
    draftGen.ts                      # generateDraftOffer, generateOpponent
  store/
    gameStore.ts                     # Zustand store: all state + actions
  components/
    ui/
      Button.tsx                     # reusable button with variant + disabled state
      Badge.tsx                      # colored pill label
      StatBar.tsx                    # labeled stat with optional rank indicator
    roster/
      PlayerCard.tsx                 # single player/unit card with stats + optional re-roll button
      RosterGrid.tsx                 # 8-slot roster layout
    round/
      OpponentPreview.tsx            # opponent team stats panel
      WeatherBadge.tsx               # weather condition display
      TeamStatsSummary.tsx           # user's aggregate stats panel
      RoundHub.tsx                   # full round-hub screen
    draft/
      PlayerPickCard.tsx             # selectable player card in draft offer
      SlotChooser.tsx                # WR1 vs WR2 picker overlay
      DraftOffer.tsx                 # full draft-offer screen
    screens/
      SetupScreen.tsx                # initial roster setup screen
      RosterView.tsx                 # read-only full roster screen
      CompleteScreen.tsx             # season complete screen
  test/
    setup.ts                         # @testing-library/jest-dom import
  App.tsx                            # phase-based screen switcher + nav
  main.tsx
  index.css
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/test/setup.ts`

- [ ] **Step 1: Scaffold Vite project**

Run from `/Users/loudimuro/Desktop/claude_projects/football-game/`:
```bash
npm create vite@latest . -- --template react-ts
```
When prompted about non-empty directory, choose **"Ignore files and continue"**.

- [ ] **Step 2: Install dependencies**

```bash
npm install zustand
npm install -D tailwindcss postcss autoprefixer @tailwindcss/vite vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
npx tailwindcss init -p
```

- [ ] **Step 3: Configure Vite with Tailwind and Vitest**

Replace `vite.config.ts` with:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
```

- [ ] **Step 4: Configure Tailwind content paths**

Replace `tailwind.config.js` with:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

- [ ] **Step 5: Set up CSS**

Replace `src/index.css` with:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 6: Create test setup file**

Create `src/test/setup.ts`:
```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 7: Add `types` field to tsconfig for vitest globals**

In `tsconfig.app.json`, add `"vitest/globals"` to `compilerOptions.types`:
```json
{
  "compilerOptions": {
    "types": ["vitest/globals"]
  }
}
```

- [ ] **Step 8: Stub App.tsx**

Replace `src/App.tsx` with:
```tsx
export default function App() {
  return <div className="min-h-screen bg-gray-950 text-white p-4">Football Game</div>
}
```

- [ ] **Step 9: Verify dev server starts**

```bash
npm run dev
```
Expected: server starts at `http://localhost:5173`, page shows "Football Game".

- [ ] **Step 10: Verify test runner works**

```bash
npm run test -- --run
```
Expected: "No test files found" or 0 failures.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite + React + Tailwind + Vitest project"
```

---

## Task 2: TypeScript Types

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: Create types**

Create `src/types/index.ts`:
```typescript
export type IndividualPosition = 'QB' | 'WR' | 'RB' | 'K'
export type UnitPosition = 'OLine' | 'DLine' | 'Secondary'
export type RosterPosition = 'QB' | 'WR1' | 'WR2' | 'RB' | 'K' | 'OLine' | 'DLine' | 'Secondary'
export type GamePhase = 'setup' | 'round-hub' | 'draft-offer' | 'complete'
export type WeatherCondition = 'Clear' | 'Rain' | 'Snow' | 'HeavyWind' | 'Dome'

export interface QBStats {
  passYPG: number
  tdRatio: number
  intRatio: number
  qbr: number
}

export interface WRStats {
  recYPG: number
  tdPerGame: number
}

export interface RBStats {
  rushYPG: number
  tdPerGame: number
}

export interface KStats {
  fgAccuracy: number
}

export interface OLineStats {
  sacksAllowedPerGame: number
  rushYPC: number
  rushTDPct: number
  normalizedRank: number
}

export interface DLineStats {
  sacksPerGame: number
  rushYPCAllowed: number
  rushTDPctAllowed: number
  normalizedRank: number
}

export interface SecondaryStats {
  completionPctAllowed: number
  yardsPerAttemptAllowed: number
  tdPctAllowed: number
  intPct: number
  normalizedRank: number
}

export interface Player {
  id: string
  name: string
  position: IndividualPosition
  team: string
  year: number
  stats: QBStats | WRStats | RBStats | KStats
  eraNormFactor: number
}

export interface TeamUnit {
  id: string
  position: UnitPosition
  team: string
  year: number
  stats: OLineStats | DLineStats | SecondaryStats
  eraNormFactor: number
}

export interface TeamMeta {
  team: string
  year: number
}

export interface TeamStats {
  team: string
  year: number
  offenseRank: number
  defenseRank: number
  qbAvgYPG: number
  rbAvgYPG: number
  wrAvgYPG: number
  defPointsAllowed: number
}

export interface DraftOffer {
  team: string
  year: number
  players: Player[]
  units: TeamUnit[]
}

export interface RoundRecord {
  round: number
  opponentTeam: string
  opponentYear: number
  draftedId: string | null
  weather: WeatherCondition
}

export interface Roster {
  QB: Player | null
  WR1: Player | null
  WR2: Player | null
  RB: Player | null
  K: Player | null
  OLine: TeamUnit | null
  DLine: TeamUnit | null
  Secondary: TeamUnit | null
}

export interface AggregateStats {
  passYPG: number
  rushYPG: number
  oLineRank: number
  dLineRank: number
  secondaryRank: number
}

export interface TeamRosterData {
  players: Player[]
  units: TeamUnit[]
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add TypeScript types"
```

---

## Task 3: Sample Data Files

**Files:**
- Create: `public/data/meta.json`, `public/data/players/2022/KC.json`, `public/data/players/2019/NE.json`, `public/data/teams/2022/KC.json`, `public/data/teams/2019/NE.json`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p public/data/players/2022 public/data/players/2019
mkdir -p public/data/teams/2022 public/data/teams/2019
```

- [ ] **Step 2: Create `public/data/meta.json`**

```json
[
  { "team": "KC", "year": 2022 },
  { "team": "NE", "year": 2019 },
  { "team": "SF", "year": 2023 },
  { "team": "BUF", "year": 2021 }
]
```

- [ ] **Step 3: Create `public/data/players/2022/KC.json`**

```json
{
  "players": [
    {
      "id": "p_mahomes_kc_2022",
      "name": "Patrick Mahomes",
      "position": "QB",
      "team": "KC",
      "year": 2022,
      "stats": { "passYPG": 317.4, "tdRatio": 0.067, "intRatio": 0.011, "qbr": 74.2 },
      "eraNormFactor": 1.08
    },
    {
      "id": "p_kelce_kc_2022",
      "name": "Travis Kelce",
      "position": "WR",
      "team": "KC",
      "year": 2022,
      "stats": { "recYPG": 84.5, "tdPerGame": 0.47 },
      "eraNormFactor": 1.18
    },
    {
      "id": "p_hardman_kc_2022",
      "name": "Mecole Hardman",
      "position": "WR",
      "team": "KC",
      "year": 2022,
      "stats": { "recYPG": 38.2, "tdPerGame": 0.24 },
      "eraNormFactor": 0.82
    },
    {
      "id": "p_pacheco_kc_2022",
      "name": "Isiah Pacheco",
      "position": "RB",
      "team": "KC",
      "year": 2022,
      "stats": { "rushYPG": 62.1, "tdPerGame": 0.41 },
      "eraNormFactor": 0.94
    },
    {
      "id": "p_butker_kc_2022",
      "name": "Harrison Butker",
      "position": "K",
      "team": "KC",
      "year": 2022,
      "stats": { "fgAccuracy": 0.923 },
      "eraNormFactor": 1.05
    }
  ],
  "units": [
    {
      "id": "u_kc_oline_2022",
      "position": "OLine",
      "team": "KC",
      "year": 2022,
      "stats": { "sacksAllowedPerGame": 2.1, "rushYPC": 4.8, "rushTDPct": 0.052, "normalizedRank": 8 },
      "eraNormFactor": 1.0
    },
    {
      "id": "u_kc_dline_2022",
      "position": "DLine",
      "team": "KC",
      "year": 2022,
      "stats": { "sacksPerGame": 3.2, "rushYPCAllowed": 4.1, "rushTDPctAllowed": 0.038, "normalizedRank": 10 },
      "eraNormFactor": 1.0
    },
    {
      "id": "u_kc_secondary_2022",
      "position": "Secondary",
      "team": "KC",
      "year": 2022,
      "stats": { "completionPctAllowed": 0.634, "yardsPerAttemptAllowed": 6.8, "tdPctAllowed": 0.038, "intPct": 0.027, "normalizedRank": 11 },
      "eraNormFactor": 1.0
    }
  ]
}
```

- [ ] **Step 4: Create `public/data/players/2019/NE.json`**

```json
{
  "players": [
    {
      "id": "p_brady_ne_2019",
      "name": "Tom Brady",
      "position": "QB",
      "team": "NE",
      "year": 2019,
      "stats": { "passYPG": 240.1, "tdRatio": 0.058, "intRatio": 0.013, "qbr": 61.4 },
      "eraNormFactor": 0.92
    },
    {
      "id": "p_edelman_ne_2019",
      "name": "Julian Edelman",
      "position": "WR",
      "team": "NE",
      "year": 2019,
      "stats": { "recYPG": 72.3, "tdPerGame": 0.35 },
      "eraNormFactor": 1.02
    },
    {
      "id": "p_dorsett_ne_2019",
      "name": "Phillip Dorsett",
      "position": "WR",
      "team": "NE",
      "year": 2019,
      "stats": { "recYPG": 37.8, "tdPerGame": 0.25 },
      "eraNormFactor": 0.79
    },
    {
      "id": "p_michel_ne_2019",
      "name": "Sony Michel",
      "position": "RB",
      "team": "NE",
      "year": 2019,
      "stats": { "rushYPG": 58.4, "tdPerGame": 0.47 },
      "eraNormFactor": 0.88
    },
    {
      "id": "p_folk_ne_2019",
      "name": "Nick Folk",
      "position": "K",
      "team": "NE",
      "year": 2019,
      "stats": { "fgAccuracy": 0.917 },
      "eraNormFactor": 1.01
    }
  ],
  "units": [
    {
      "id": "u_ne_oline_2019",
      "position": "OLine",
      "team": "NE",
      "year": 2019,
      "stats": { "sacksAllowedPerGame": 1.8, "rushYPC": 4.3, "rushTDPct": 0.061, "normalizedRank": 5 },
      "eraNormFactor": 1.0
    },
    {
      "id": "u_ne_dline_2019",
      "position": "DLine",
      "team": "NE",
      "year": 2019,
      "stats": { "sacksPerGame": 3.9, "rushYPCAllowed": 3.8, "rushTDPctAllowed": 0.031, "normalizedRank": 4 },
      "eraNormFactor": 1.0
    },
    {
      "id": "u_ne_secondary_2019",
      "position": "Secondary",
      "team": "NE",
      "year": 2019,
      "stats": { "completionPctAllowed": 0.571, "yardsPerAttemptAllowed": 5.9, "tdPctAllowed": 0.029, "intPct": 0.041, "normalizedRank": 1 },
      "eraNormFactor": 1.0
    }
  ]
}
```

- [ ] **Step 5: Create `public/data/teams/2022/KC.json`**

```json
{
  "team": "KC",
  "year": 2022,
  "offenseRank": 3,
  "defenseRank": 11,
  "qbAvgYPG": 317.4,
  "rbAvgYPG": 89.2,
  "wrAvgYPG": 142.6,
  "defPointsAllowed": 20.8
}
```

- [ ] **Step 6: Create `public/data/teams/2019/NE.json`**

```json
{
  "team": "NE",
  "year": 2019,
  "offenseRank": 12,
  "defenseRank": 1,
  "qbAvgYPG": 240.1,
  "rbAvgYPG": 94.7,
  "wrAvgYPG": 118.3,
  "defPointsAllowed": 13.8
}
```

- [ ] **Step 7: Commit**

```bash
git add public/
git commit -m "feat: add sample data files for KC 2022 and NE 2019"
```

---

## Task 4: Stats & Weather Logic

**Files:**
- Create: `src/logic/stats.ts`, `src/logic/stats.test.ts`, `src/logic/weatherGen.ts`, `src/logic/weatherGen.test.ts`

- [ ] **Step 1: Write failing tests for stats**

Create `src/logic/stats.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { computeAggregateStats, eraNormalize } from './stats'
import type { Roster } from '../types'

const emptyRoster: Roster = {
  QB: null, WR1: null, WR2: null, RB: null,
  K: null, OLine: null, DLine: null, Secondary: null,
}

describe('eraNormalize', () => {
  it('scales a stat by the norm factor', () => {
    expect(eraNormalize(300, 1.1)).toBeCloseTo(330)
  })

  it('returns the stat unchanged when factor is 1', () => {
    expect(eraNormalize(250, 1.0)).toBe(250)
  })
})

describe('computeAggregateStats', () => {
  it('returns zeros and mid-ranks for an empty roster', () => {
    const stats = computeAggregateStats(emptyRoster)
    expect(stats.passYPG).toBe(0)
    expect(stats.rushYPG).toBe(0)
    expect(stats.oLineRank).toBe(16)
    expect(stats.dLineRank).toBe(16)
    expect(stats.secondaryRank).toBe(16)
  })

  it('reads passYPG from QB stats', () => {
    const roster: Roster = {
      ...emptyRoster,
      QB: {
        id: 'q1', name: 'Test QB', position: 'QB', team: 'XX', year: 2020,
        stats: { passYPG: 280, tdRatio: 0.05, intRatio: 0.02, qbr: 60 },
        eraNormFactor: 1.0,
      },
    }
    expect(computeAggregateStats(roster).passYPG).toBe(280)
  })

  it('reads rushYPG from RB stats', () => {
    const roster: Roster = {
      ...emptyRoster,
      RB: {
        id: 'r1', name: 'Test RB', position: 'RB', team: 'XX', year: 2020,
        stats: { rushYPG: 95, tdPerGame: 0.5 },
        eraNormFactor: 1.0,
      },
    }
    expect(computeAggregateStats(roster).rushYPG).toBe(95)
  })

  it('reads unit ranks from roster units', () => {
    const roster: Roster = {
      ...emptyRoster,
      OLine: {
        id: 'o1', position: 'OLine', team: 'XX', year: 2020,
        stats: { sacksAllowedPerGame: 2, rushYPC: 4.5, rushTDPct: 0.05, normalizedRank: 7 },
        eraNormFactor: 1.0,
      },
      DLine: {
        id: 'd1', position: 'DLine', team: 'XX', year: 2020,
        stats: { sacksPerGame: 3, rushYPCAllowed: 4.0, rushTDPctAllowed: 0.04, normalizedRank: 9 },
        eraNormFactor: 1.0,
      },
      Secondary: {
        id: 's1', position: 'Secondary', team: 'XX', year: 2020,
        stats: { completionPctAllowed: 0.62, yardsPerAttemptAllowed: 6.5, tdPctAllowed: 0.035, intPct: 0.03, normalizedRank: 5 },
        eraNormFactor: 1.0,
      },
    }
    const agg = computeAggregateStats(roster)
    expect(agg.oLineRank).toBe(7)
    expect(agg.dLineRank).toBe(9)
    expect(agg.secondaryRank).toBe(5)
  })
})
```

- [ ] **Step 2: Run — verify fails**

```bash
npm run test -- --run src/logic/stats.test.ts
```
Expected: FAIL — `computeAggregateStats` and `eraNormalize` not found.

- [ ] **Step 3: Implement stats.ts**

Create `src/logic/stats.ts`:
```typescript
import type { Roster, AggregateStats, QBStats, RBStats, OLineStats, DLineStats, SecondaryStats } from '../types'

export function eraNormalize(rawStat: number, normFactor: number): number {
  return rawStat * normFactor
}

export function computeAggregateStats(roster: Roster): AggregateStats {
  const qbStats = roster.QB?.stats as QBStats | undefined
  const rbStats = roster.RB?.stats as RBStats | undefined
  const oLineStats = roster.OLine?.stats as OLineStats | undefined
  const dLineStats = roster.DLine?.stats as DLineStats | undefined
  const secStats = roster.Secondary?.stats as SecondaryStats | undefined

  return {
    passYPG: qbStats?.passYPG ?? 0,
    rushYPG: rbStats?.rushYPG ?? 0,
    oLineRank: oLineStats?.normalizedRank ?? 16,
    dLineRank: dLineStats?.normalizedRank ?? 16,
    secondaryRank: secStats?.normalizedRank ?? 16,
  }
}
```

- [ ] **Step 4: Run — verify passes**

```bash
npm run test -- --run src/logic/stats.test.ts
```
Expected: PASS — 6 tests.

- [ ] **Step 5: Write failing tests for weatherGen**

Create `src/logic/weatherGen.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { generateWeather } from './weatherGen'

const ALL_CONDITIONS = ['Clear', 'Rain', 'Snow', 'HeavyWind', 'Dome'] as const

describe('generateWeather', () => {
  it('returns a valid weather condition', () => {
    const result = generateWeather()
    expect(ALL_CONDITIONS).toContain(result)
  })

  it('returns Clear when Math.random returns 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    expect(generateWeather()).toBe('Clear')
    vi.restoreAllMocks()
  })

  it('returns Snow when Math.random is near 1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    expect(generateWeather()).toBe('Snow')
    vi.restoreAllMocks()
  })

  it('always returns a valid condition across 100 calls', () => {
    for (let i = 0; i < 100; i++) {
      expect(ALL_CONDITIONS).toContain(generateWeather())
    }
  })
})
```

- [ ] **Step 6: Run — verify fails**

```bash
npm run test -- --run src/logic/weatherGen.test.ts
```
Expected: FAIL — `generateWeather` not found.

- [ ] **Step 7: Implement weatherGen.ts**

Create `src/logic/weatherGen.ts`:
```typescript
import type { WeatherCondition } from '../types'

const WEATHER_WEIGHTS: [WeatherCondition, number][] = [
  ['Clear', 50],
  ['Dome', 20],
  ['Rain', 15],
  ['HeavyWind', 10],
  ['Snow', 5],
]

const TOTAL_WEIGHT = WEATHER_WEIGHTS.reduce((sum, [, w]) => sum + w, 0)

export function generateWeather(): WeatherCondition {
  let rand = Math.random() * TOTAL_WEIGHT
  for (const [condition, weight] of WEATHER_WEIGHTS) {
    rand -= weight
    if (rand <= 0) return condition
  }
  return 'Clear'
}
```

- [ ] **Step 8: Run — verify passes**

```bash
npm run test -- --run src/logic/weatherGen.test.ts
```
Expected: PASS — 4 tests.

- [ ] **Step 9: Commit**

```bash
git add src/logic/
git commit -m "feat: add stats normalization and weather generator with tests"
```

---

## Task 5: Data Loader Utility

**Files:**
- Create: `src/logic/dataLoader.ts`, `src/logic/dataLoader.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/logic/dataLoader.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loadTeamMeta, loadTeamRoster, loadTeamStats } from './dataLoader'
import type { TeamMeta, TeamRosterData, TeamStats } from '../types'

const mockMeta: TeamMeta[] = [{ team: 'KC', year: 2022 }]

const mockRoster: TeamRosterData = {
  players: [
    {
      id: 'p1', name: 'Test QB', position: 'QB', team: 'KC', year: 2022,
      stats: { passYPG: 300, tdRatio: 0.06, intRatio: 0.01, qbr: 70 },
      eraNormFactor: 1.0,
    },
  ],
  units: [],
}

const mockTeamStats: TeamStats = {
  team: 'KC', year: 2022,
  offenseRank: 3, defenseRank: 11,
  qbAvgYPG: 300, rbAvgYPG: 90, wrAvgYPG: 140, defPointsAllowed: 21,
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

describe('loadTeamMeta', () => {
  it('fetches /data/meta.json and returns parsed JSON', async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: () => Promise.resolve(mockMeta),
    } as Response)

    const result = await loadTeamMeta()
    expect(fetch).toHaveBeenCalledWith('/data/meta.json')
    expect(result).toEqual(mockMeta)
  })
})

describe('loadTeamRoster', () => {
  it('fetches the correct path and returns roster data', async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: () => Promise.resolve(mockRoster),
    } as Response)

    const result = await loadTeamRoster(2022, 'KC')
    expect(fetch).toHaveBeenCalledWith('/data/players/2022/KC.json')
    expect(result.players).toHaveLength(1)
  })
})

describe('loadTeamStats', () => {
  it('fetches the correct path and returns team stats', async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: () => Promise.resolve(mockTeamStats),
    } as Response)

    const result = await loadTeamStats(2022, 'KC')
    expect(fetch).toHaveBeenCalledWith('/data/teams/2022/KC.json')
    expect(result.offenseRank).toBe(3)
  })
})
```

- [ ] **Step 2: Run — verify fails**

```bash
npm run test -- --run src/logic/dataLoader.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Implement dataLoader.ts**

Create `src/logic/dataLoader.ts`:
```typescript
import type { TeamMeta, TeamRosterData, TeamStats } from '../types'

export async function loadTeamMeta(): Promise<TeamMeta[]> {
  const res = await fetch('/data/meta.json')
  return res.json()
}

export async function loadTeamRoster(year: number, team: string): Promise<TeamRosterData> {
  const res = await fetch(`/data/players/${year}/${team}.json`)
  return res.json()
}

export async function loadTeamStats(year: number, team: string): Promise<TeamStats> {
  const res = await fetch(`/data/teams/${year}/${team}.json`)
  return res.json()
}
```

- [ ] **Step 4: Run — verify passes**

```bash
npm run test -- --run src/logic/dataLoader.test.ts
```
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/logic/dataLoader.ts src/logic/dataLoader.test.ts
git commit -m "feat: add data loader utility with tests"
```

---

## Task 6: Roster Generator

**Files:**
- Create: `src/logic/rosterGen.ts`, `src/logic/rosterGen.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/logic/rosterGen.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateRandomRoster, generateRandomSlot } from './rosterGen'
import type { TeamRosterData } from '../types'

vi.mock('./dataLoader', () => ({
  loadTeamMeta: vi.fn().mockResolvedValue([
    { team: 'KC', year: 2022 },
    { team: 'NE', year: 2019 },
  ]),
  loadTeamRoster: vi.fn().mockResolvedValue({
    players: [
      { id: 'qb1', name: 'QB', position: 'QB', team: 'KC', year: 2022,
        stats: { passYPG: 300, tdRatio: 0.06, intRatio: 0.01, qbr: 70 }, eraNormFactor: 1.0 },
      { id: 'wr1', name: 'WR', position: 'WR', team: 'KC', year: 2022,
        stats: { recYPG: 80, tdPerGame: 0.4 }, eraNormFactor: 1.0 },
      { id: 'rb1', name: 'RB', position: 'RB', team: 'KC', year: 2022,
        stats: { rushYPG: 70, tdPerGame: 0.4 }, eraNormFactor: 1.0 },
      { id: 'k1', name: 'K', position: 'K', team: 'KC', year: 2022,
        stats: { fgAccuracy: 0.9 }, eraNormFactor: 1.0 },
    ],
    units: [
      { id: 'ol1', position: 'OLine', team: 'KC', year: 2022,
        stats: { sacksAllowedPerGame: 2, rushYPC: 4.5, rushTDPct: 0.05, normalizedRank: 8 }, eraNormFactor: 1.0 },
      { id: 'dl1', position: 'DLine', team: 'KC', year: 2022,
        stats: { sacksPerGame: 3, rushYPCAllowed: 4.0, rushTDPctAllowed: 0.04, normalizedRank: 10 }, eraNormFactor: 1.0 },
      { id: 'sec1', position: 'Secondary', team: 'KC', year: 2022,
        stats: { completionPctAllowed: 0.63, yardsPerAttemptAllowed: 6.8, tdPctAllowed: 0.038, intPct: 0.027, normalizedRank: 11 }, eraNormFactor: 1.0 },
    ],
  } as TeamRosterData),
}))

describe('generateRandomSlot', () => {
  it('returns a QB for the QB slot', async () => {
    const result = await generateRandomSlot('QB')
    expect(result.position).toBe('QB')
  })

  it('returns a WR player for WR1 slot', async () => {
    const result = await generateRandomSlot('WR1')
    expect(result.position).toBe('WR')
  })

  it('returns a WR player for WR2 slot', async () => {
    const result = await generateRandomSlot('WR2')
    expect(result.position).toBe('WR')
  })

  it('returns an OLine unit for the OLine slot', async () => {
    const result = await generateRandomSlot('OLine')
    expect(result.position).toBe('OLine')
  })
})

describe('generateRandomRoster', () => {
  it('fills all 8 roster slots', async () => {
    const roster = await generateRandomRoster()
    expect(roster.QB).not.toBeNull()
    expect(roster.WR1).not.toBeNull()
    expect(roster.WR2).not.toBeNull()
    expect(roster.RB).not.toBeNull()
    expect(roster.K).not.toBeNull()
    expect(roster.OLine).not.toBeNull()
    expect(roster.DLine).not.toBeNull()
    expect(roster.Secondary).not.toBeNull()
  })

  it('puts a QB in the QB slot', async () => {
    const roster = await generateRandomRoster()
    expect(roster.QB?.position).toBe('QB')
  })
})
```

- [ ] **Step 2: Run — verify fails**

```bash
npm run test -- --run src/logic/rosterGen.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Implement rosterGen.ts**

Create `src/logic/rosterGen.ts`:
```typescript
import { loadTeamMeta, loadTeamRoster } from './dataLoader'
import type { Roster, RosterPosition, Player, TeamUnit, TeamMeta } from '../types'

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
  const slots = await Promise.all(positions.map(pos => generateRandomSlot(pos)))
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
```

- [ ] **Step 4: Run — verify passes**

```bash
npm run test -- --run src/logic/rosterGen.test.ts
```
Expected: PASS — 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/logic/rosterGen.ts src/logic/rosterGen.test.ts
git commit -m "feat: add roster generator with tests"
```

---

## Task 7: Draft Generator

**Files:**
- Create: `src/logic/draftGen.ts`, `src/logic/draftGen.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/logic/draftGen.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { generateDraftOffer, generateOpponent } from './draftGen'

vi.mock('./dataLoader', () => ({
  loadTeamMeta: vi.fn().mockResolvedValue([{ team: 'KC', year: 2022 }]),
  loadTeamRoster: vi.fn().mockResolvedValue({
    players: [
      { id: 'qb1', name: 'QB', position: 'QB', team: 'KC', year: 2022,
        stats: { passYPG: 300, tdRatio: 0.06, intRatio: 0.01, qbr: 70 }, eraNormFactor: 1.0 },
    ],
    units: [
      { id: 'ol1', position: 'OLine', team: 'KC', year: 2022,
        stats: { sacksAllowedPerGame: 2, rushYPC: 4.5, rushTDPct: 0.05, normalizedRank: 8 }, eraNormFactor: 1.0 },
    ],
  }),
  loadTeamStats: vi.fn().mockResolvedValue({
    team: 'KC', year: 2022,
    offenseRank: 3, defenseRank: 11,
    qbAvgYPG: 300, rbAvgYPG: 90, wrAvgYPG: 140, defPointsAllowed: 21,
  }),
}))

describe('generateDraftOffer', () => {
  it('returns an offer with team, year, players, and units', async () => {
    const offer = await generateDraftOffer()
    expect(offer.team).toBe('KC')
    expect(offer.year).toBe(2022)
    expect(Array.isArray(offer.players)).toBe(true)
    expect(Array.isArray(offer.units)).toBe(true)
  })
})

describe('generateOpponent', () => {
  it('returns team stats with required fields', async () => {
    const stats = await generateOpponent()
    expect(stats.team).toBe('KC')
    expect(typeof stats.offenseRank).toBe('number')
    expect(typeof stats.defPointsAllowed).toBe('number')
  })
})
```

- [ ] **Step 2: Run — verify fails**

```bash
npm run test -- --run src/logic/draftGen.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Implement draftGen.ts**

Create `src/logic/draftGen.ts`:
```typescript
import { loadTeamMeta, loadTeamRoster, loadTeamStats } from './dataLoader'
import type { DraftOffer, TeamStats, TeamMeta } from '../types'

let metaCache: TeamMeta[] | null = null

async function getMeta(): Promise<TeamMeta[]> {
  if (!metaCache) metaCache = await loadTeamMeta()
  return metaCache
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export async function generateDraftOffer(): Promise<DraftOffer> {
  const meta = await getMeta()
  const { team, year } = pickRandom(meta)
  const { players, units } = await loadTeamRoster(year, team)
  return { team, year, players, units }
}

export async function generateOpponent(): Promise<TeamStats> {
  const meta = await getMeta()
  const { team, year } = pickRandom(meta)
  return loadTeamStats(year, team)
}
```

- [ ] **Step 4: Run — verify passes**

```bash
npm run test -- --run src/logic/draftGen.test.ts
```
Expected: PASS — 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/logic/draftGen.ts src/logic/draftGen.test.ts
git commit -m "feat: add draft generator with tests"
```

---

## Task 8: Game Store

**Files:**
- Create: `src/store/gameStore.ts`, `src/store/gameStore.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/store/gameStore.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act } from 'react'
import { useGameStore } from './gameStore'
import type { Roster } from '../types'

const mockRoster: Roster = {
  QB: { id: 'qb1', name: 'Test QB', position: 'QB', team: 'KC', year: 2022,
    stats: { passYPG: 300, tdRatio: 0.06, intRatio: 0.01, qbr: 70 }, eraNormFactor: 1.0 },
  WR1: { id: 'wr1', name: 'WR1', position: 'WR', team: 'KC', year: 2022,
    stats: { recYPG: 80, tdPerGame: 0.4 }, eraNormFactor: 1.0 },
  WR2: { id: 'wr2', name: 'WR2', position: 'WR', team: 'KC', year: 2022,
    stats: { recYPG: 50, tdPerGame: 0.2 }, eraNormFactor: 1.0 },
  RB: { id: 'rb1', name: 'RB', position: 'RB', team: 'KC', year: 2022,
    stats: { rushYPG: 80, tdPerGame: 0.4 }, eraNormFactor: 1.0 },
  K: { id: 'k1', name: 'K', position: 'K', team: 'KC', year: 2022,
    stats: { fgAccuracy: 0.9 }, eraNormFactor: 1.0 },
  OLine: { id: 'ol1', position: 'OLine', team: 'KC', year: 2022,
    stats: { sacksAllowedPerGame: 2, rushYPC: 4.5, rushTDPct: 0.05, normalizedRank: 8 }, eraNormFactor: 1.0 },
  DLine: { id: 'dl1', position: 'DLine', team: 'KC', year: 2022,
    stats: { sacksPerGame: 3, rushYPCAllowed: 4.0, rushTDPctAllowed: 0.04, normalizedRank: 10 }, eraNormFactor: 1.0 },
  Secondary: { id: 'sec1', position: 'Secondary', team: 'KC', year: 2022,
    stats: { completionPctAllowed: 0.63, yardsPerAttemptAllowed: 6.8, tdPctAllowed: 0.038, intPct: 0.027, normalizedRank: 11 }, eraNormFactor: 1.0 },
}

vi.mock('../logic/rosterGen', () => ({
  generateRandomRoster: vi.fn().mockResolvedValue(mockRoster),
  generateRandomSlot: vi.fn().mockResolvedValue(mockRoster.QB),
}))

vi.mock('../logic/draftGen', () => ({
  generateDraftOffer: vi.fn().mockResolvedValue({
    team: 'NE', year: 2019, players: [mockRoster.QB!], units: [mockRoster.OLine!],
  }),
  generateOpponent: vi.fn().mockResolvedValue({
    team: 'NE', year: 2019, offenseRank: 12, defenseRank: 1,
    qbAvgYPG: 240, rbAvgYPG: 94, wrAvgYPG: 118, defPointsAllowed: 13.8,
  }),
}))

vi.mock('../logic/weatherGen', () => ({
  generateWeather: vi.fn().mockReturnValue('Clear'),
}))

const INITIAL_STATE = {
  phase: 'setup' as const,
  round: 1,
  roster: { QB: null, WR1: null, WR2: null, RB: null, K: null, OLine: null, DLine: null, Secondary: null },
  setupRerollsRemaining: 3,
  draftRerollAvailable: true,
  currentOpponent: null,
  currentWeather: null,
  currentDraftOffer: null,
  seasonLog: [],
  isLoading: false,
}

beforeEach(() => {
  useGameStore.setState(INITIAL_STATE)
})

describe('initGame', () => {
  it('populates roster and sets phase to setup', async () => {
    await act(async () => { await useGameStore.getState().initGame() })
    const state = useGameStore.getState()
    expect(state.phase).toBe('setup')
    expect(state.roster.QB).not.toBeNull()
    expect(state.setupRerollsRemaining).toBe(3)
  })
})

describe('rerollSetupSlot', () => {
  it('decrements setupRerollsRemaining', async () => {
    useGameStore.setState({ ...INITIAL_STATE, roster: mockRoster })
    await act(async () => { await useGameStore.getState().rerollSetupSlot('QB') })
    expect(useGameStore.getState().setupRerollsRemaining).toBe(2)
  })

  it('does not decrement when rerolls are exhausted', async () => {
    useGameStore.setState({ ...INITIAL_STATE, roster: mockRoster, setupRerollsRemaining: 0 })
    await act(async () => { await useGameStore.getState().rerollSetupSlot('QB') })
    expect(useGameStore.getState().setupRerollsRemaining).toBe(0)
  })
})

describe('confirmSetup', () => {
  it('transitions to round-hub and sets opponent and weather', async () => {
    useGameStore.setState({ ...INITIAL_STATE, roster: mockRoster })
    await act(async () => { await useGameStore.getState().confirmSetup() })
    const state = useGameStore.getState()
    expect(state.phase).toBe('round-hub')
    expect(state.currentOpponent).not.toBeNull()
    expect(state.currentWeather).toBe('Clear')
  })
})

describe('viewDraftOffer', () => {
  it('transitions to draft-offer phase', () => {
    useGameStore.setState({ ...INITIAL_STATE, phase: 'round-hub' })
    useGameStore.getState().viewDraftOffer()
    expect(useGameStore.getState().phase).toBe('draft-offer')
  })
})

describe('rerollDraftOffer', () => {
  it('replaces the draft offer and marks reroll as used', async () => {
    const initialOffer = { team: 'KC', year: 2022, players: [], units: [] }
    useGameStore.setState({ ...INITIAL_STATE, currentDraftOffer: initialOffer, draftRerollAvailable: true })
    await act(async () => { await useGameStore.getState().rerollDraftOffer() })
    const state = useGameStore.getState()
    expect(state.draftRerollAvailable).toBe(false)
    expect(state.currentDraftOffer?.team).toBe('NE')
  })

  it('does nothing if reroll already used', async () => {
    const offer = { team: 'KC', year: 2022, players: [], units: [] }
    useGameStore.setState({ ...INITIAL_STATE, currentDraftOffer: offer, draftRerollAvailable: false })
    await act(async () => { await useGameStore.getState().rerollDraftOffer() })
    expect(useGameStore.getState().currentDraftOffer?.team).toBe('KC')
  })
})

describe('draftPlayer', () => {
  it('places the player into the target slot and logs the round', async () => {
    const offer = { team: 'NE', year: 2019, players: [mockRoster.QB!], units: [] }
    useGameStore.setState({
      ...INITIAL_STATE, phase: 'draft-offer', roster: mockRoster,
      currentDraftOffer: offer, currentOpponent: {
        team: 'NE', year: 2019, offenseRank: 12, defenseRank: 1,
        qbAvgYPG: 240, rbAvgYPG: 94, wrAvgYPG: 118, defPointsAllowed: 13.8,
      }, currentWeather: 'Clear',
    })
    await act(async () => { await useGameStore.getState().draftPlayer('qb1', 'QB') })
    const state = useGameStore.getState()
    expect(state.seasonLog).toHaveLength(1)
    expect(state.seasonLog[0].draftedId).toBe('qb1')
  })

  it('transitions to complete phase on round 17', async () => {
    const offer = { team: 'NE', year: 2019, players: [mockRoster.QB!], units: [] }
    useGameStore.setState({
      ...INITIAL_STATE, round: 17, phase: 'draft-offer', roster: mockRoster,
      currentDraftOffer: offer,
      currentOpponent: { team: 'NE', year: 2019, offenseRank: 12, defenseRank: 1, qbAvgYPG: 240, rbAvgYPG: 94, wrAvgYPG: 118, defPointsAllowed: 13.8 },
      currentWeather: 'Clear',
    })
    await act(async () => { await useGameStore.getState().draftPlayer('qb1', 'QB') })
    expect(useGameStore.getState().phase).toBe('complete')
  })
})

describe('skipDraft', () => {
  it('logs the round with draftedId null and advances', async () => {
    useGameStore.setState({
      ...INITIAL_STATE, phase: 'draft-offer', roster: mockRoster,
      currentOpponent: { team: 'NE', year: 2019, offenseRank: 12, defenseRank: 1, qbAvgYPG: 240, rbAvgYPG: 94, wrAvgYPG: 118, defPointsAllowed: 13.8 },
      currentWeather: 'Rain', currentDraftOffer: { team: 'NE', year: 2019, players: [], units: [] },
    })
    await act(async () => { await useGameStore.getState().skipDraft() })
    const state = useGameStore.getState()
    expect(state.seasonLog[0].draftedId).toBeNull()
    expect(state.round).toBe(2)
  })
})
```

- [ ] **Step 2: Run — verify fails**

```bash
npm run test -- --run src/store/gameStore.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Implement gameStore.ts**

Create `src/store/gameStore.ts`:
```typescript
import { create } from 'zustand'
import { generateRandomRoster, generateRandomSlot } from '../logic/rosterGen'
import { generateDraftOffer, generateOpponent } from '../logic/draftGen'
import { generateWeather } from '../logic/weatherGen'
import type {
  GamePhase, Roster, RosterPosition, Player, TeamUnit,
  DraftOffer, TeamStats, WeatherCondition, RoundRecord,
} from '../types'

interface GameStore {
  phase: GamePhase
  round: number
  roster: Roster
  setupRerollsRemaining: number
  draftRerollAvailable: boolean
  currentOpponent: TeamStats | null
  currentWeather: WeatherCondition | null
  currentDraftOffer: DraftOffer | null
  seasonLog: RoundRecord[]
  isLoading: boolean

  initGame: () => Promise<void>
  rerollSetupSlot: (position: RosterPosition) => Promise<void>
  confirmSetup: () => Promise<void>
  viewDraftOffer: () => void
  rerollDraftOffer: () => Promise<void>
  draftPlayer: (id: string, targetPosition: RosterPosition) => Promise<void>
  skipDraft: () => Promise<void>
}

const EMPTY_ROSTER: Roster = {
  QB: null, WR1: null, WR2: null, RB: null,
  K: null, OLine: null, DLine: null, Secondary: null,
}

async function buildNextRoundData() {
  const [opponent, draftOffer] = await Promise.all([generateOpponent(), generateDraftOffer()])
  const weather = generateWeather()
  return { opponent, draftOffer, weather }
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'setup',
  round: 1,
  roster: EMPTY_ROSTER,
  setupRerollsRemaining: 3,
  draftRerollAvailable: true,
  currentOpponent: null,
  currentWeather: null,
  currentDraftOffer: null,
  seasonLog: [],
  isLoading: false,

  initGame: async () => {
    set({ isLoading: true })
    const roster = await generateRandomRoster()
    set({ roster, phase: 'setup', round: 1, setupRerollsRemaining: 3, seasonLog: [], isLoading: false })
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
    const { opponent, draftOffer, weather } = await buildNextRoundData()
    set({
      phase: 'round-hub',
      currentOpponent: opponent,
      currentWeather: weather,
      currentDraftOffer: draftOffer,
      draftRerollAvailable: true,
      isLoading: false,
    })
  },

  viewDraftOffer: () => set({ phase: 'draft-offer' }),

  rerollDraftOffer: async () => {
    if (!get().draftRerollAvailable) return
    set({ isLoading: true })
    const draftOffer = await generateDraftOffer()
    set({ currentDraftOffer: draftOffer, draftRerollAvailable: false, isLoading: false })
  },

  draftPlayer: async (id, targetPosition) => {
    const { roster, currentDraftOffer, currentOpponent, currentWeather, round, seasonLog } = get()
    if (!currentDraftOffer || !currentOpponent || !currentWeather) return

    const allItems = [...currentDraftOffer.players, ...currentDraftOffer.units]
    const selected = allItems.find(item => item.id === id) as Player | TeamUnit | undefined
    if (!selected) return

    const record: RoundRecord = {
      round, opponentTeam: currentOpponent.team, opponentYear: currentOpponent.year,
      draftedId: id, weather: currentWeather,
    }
    const newRoster = { ...roster, [targetPosition]: selected }
    const newLog = [...seasonLog, record]

    if (round >= 17) {
      set({ roster: newRoster, seasonLog: newLog, phase: 'complete' })
      return
    }

    set({ isLoading: true })
    const { opponent, draftOffer, weather } = await buildNextRoundData()
    set({
      roster: newRoster, seasonLog: newLog,
      round: round + 1, currentOpponent: opponent, currentWeather: weather,
      currentDraftOffer: draftOffer, draftRerollAvailable: true,
      phase: 'round-hub', isLoading: false,
    })
  },

  skipDraft: async () => {
    const { currentOpponent, currentWeather, round, seasonLog } = get()
    if (!currentOpponent || !currentWeather) return

    const record: RoundRecord = {
      round, opponentTeam: currentOpponent.team, opponentYear: currentOpponent.year,
      draftedId: null, weather: currentWeather,
    }
    const newLog = [...seasonLog, record]

    if (round >= 17) {
      set({ seasonLog: newLog, phase: 'complete' })
      return
    }

    set({ isLoading: true })
    const { opponent, draftOffer, weather } = await buildNextRoundData()
    set({
      seasonLog: newLog, round: round + 1,
      currentOpponent: opponent, currentWeather: weather,
      currentDraftOffer: draftOffer, draftRerollAvailable: true,
      phase: 'round-hub', isLoading: false,
    })
  },
}))
```

- [ ] **Step 4: Run — verify passes**

```bash
npm run test -- --run src/store/gameStore.test.ts
```
Expected: PASS — 10 tests.

- [ ] **Step 5: Commit**

```bash
git add src/store/
git commit -m "feat: add Zustand game store with tests"
```

---

## Task 9: Shared UI Components

**Files:**
- Create: `src/components/ui/Button.tsx`, `src/components/ui/Badge.tsx`, `src/components/ui/StatBar.tsx`, `src/components/ui/Button.test.tsx`

- [ ] **Step 1: Write failing test for Button**

Create `src/components/ui/Button.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'

describe('Button', () => {
  it('renders children', () => {
    render(<Button onClick={vi.fn()}>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const handler = vi.fn()
    render(<Button onClick={handler}>Go</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('does not call onClick when disabled', async () => {
    const handler = vi.fn()
    render(<Button onClick={handler} disabled>Go</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(handler).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run — verify fails**

```bash
npm run test -- --run src/components/ui/Button.test.tsx
```
Expected: FAIL.

- [ ] **Step 3: Create Button.tsx**

Create `src/components/ui/Button.tsx`:
```tsx
interface ButtonProps {
  onClick: () => void
  children: React.ReactNode
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'ghost'
  className?: string
}

const VARIANTS = {
  primary: 'bg-indigo-600 hover:bg-indigo-500 text-white',
  secondary: 'bg-gray-700 hover:bg-gray-600 text-white',
  ghost: 'bg-transparent hover:bg-gray-800 text-gray-300',
}

export function Button({ onClick, children, disabled, variant = 'primary', className = '' }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors
        disabled:opacity-40 disabled:cursor-not-allowed
        ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  )
}
```

- [ ] **Step 4: Run — verify passes**

```bash
npm run test -- --run src/components/ui/Button.test.tsx
```
Expected: PASS — 3 tests.

- [ ] **Step 5: Create Badge.tsx**

Create `src/components/ui/Badge.tsx`:
```tsx
interface BadgeProps {
  label: string
  color?: 'gray' | 'green' | 'yellow' | 'red' | 'blue'
}

const COLORS = {
  gray: 'bg-gray-700 text-gray-200',
  green: 'bg-green-800 text-green-200',
  yellow: 'bg-yellow-800 text-yellow-200',
  red: 'bg-red-800 text-red-200',
  blue: 'bg-blue-800 text-blue-200',
}

export function Badge({ label, color = 'gray' }: BadgeProps) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${COLORS[color]}`}>
      {label}
    </span>
  )
}
```

- [ ] **Step 6: Create StatBar.tsx**

Create `src/components/ui/StatBar.tsx`:
```tsx
interface StatBarProps {
  label: string
  value: string | number
  subLabel?: string
}

export function StatBar({ label, value, subLabel }: StatBarProps) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-gray-800 last:border-0">
      <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
      <div className="text-right">
        <span className="text-sm font-semibold text-white">{value}</span>
        {subLabel && <span className="ml-1 text-xs text-gray-500">{subLabel}</span>}
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/
git commit -m "feat: add shared UI components (Button, Badge, StatBar)"
```

---

## Task 10: Setup Screen

**Files:**
- Create: `src/components/roster/PlayerCard.tsx`, `src/components/roster/RosterGrid.tsx`, `src/components/screens/SetupScreen.tsx`, `src/components/screens/SetupScreen.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/screens/SetupScreen.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SetupScreen } from './SetupScreen'
import { useGameStore } from '../../store/gameStore'
import type { Roster } from '../../types'

const mockRoster: Roster = {
  QB: { id: 'qb1', name: 'Patrick Mahomes', position: 'QB', team: 'KC', year: 2022,
    stats: { passYPG: 317, tdRatio: 0.067, intRatio: 0.011, qbr: 74 }, eraNormFactor: 1.08 },
  WR1: { id: 'wr1', name: 'Travis Kelce', position: 'WR', team: 'KC', year: 2022,
    stats: { recYPG: 84, tdPerGame: 0.47 }, eraNormFactor: 1.18 },
  WR2: { id: 'wr2', name: 'Mecole Hardman', position: 'WR', team: 'KC', year: 2022,
    stats: { recYPG: 38, tdPerGame: 0.24 }, eraNormFactor: 0.82 },
  RB: { id: 'rb1', name: 'Isiah Pacheco', position: 'RB', team: 'KC', year: 2022,
    stats: { rushYPG: 62, tdPerGame: 0.41 }, eraNormFactor: 0.94 },
  K: { id: 'k1', name: 'Harrison Butker', position: 'K', team: 'KC', year: 2022,
    stats: { fgAccuracy: 0.923 }, eraNormFactor: 1.05 },
  OLine: { id: 'ol1', position: 'OLine', team: 'KC', year: 2022,
    stats: { sacksAllowedPerGame: 2.1, rushYPC: 4.8, rushTDPct: 0.052, normalizedRank: 8 }, eraNormFactor: 1.0 },
  DLine: { id: 'dl1', position: 'DLine', team: 'KC', year: 2022,
    stats: { sacksPerGame: 3.2, rushYPCAllowed: 4.1, rushTDPctAllowed: 0.038, normalizedRank: 10 }, eraNormFactor: 1.0 },
  Secondary: { id: 'sec1', position: 'Secondary', team: 'KC', year: 2022,
    stats: { completionPctAllowed: 0.634, yardsPerAttemptAllowed: 6.8, tdPctAllowed: 0.038, intPct: 0.027, normalizedRank: 11 }, eraNormFactor: 1.0 },
}

beforeEach(() => {
  useGameStore.setState({
    phase: 'setup', round: 1, roster: mockRoster,
    setupRerollsRemaining: 3, draftRerollAvailable: true,
    currentOpponent: null, currentWeather: null, currentDraftOffer: null,
    seasonLog: [], isLoading: false,
    initGame: vi.fn(), rerollSetupSlot: vi.fn(), confirmSetup: vi.fn(),
    viewDraftOffer: vi.fn(), rerollDraftOffer: vi.fn(),
    draftPlayer: vi.fn(), skipDraft: vi.fn(),
  })
})

describe('SetupScreen', () => {
  it('shows all 8 position labels', () => {
    render(<SetupScreen />)
    expect(screen.getByText('QB')).toBeInTheDocument()
    expect(screen.getByText('WR1')).toBeInTheDocument()
    expect(screen.getByText('WR2')).toBeInTheDocument()
    expect(screen.getByText('RB')).toBeInTheDocument()
    expect(screen.getByText('K')).toBeInTheDocument()
    expect(screen.getByText('O-Line')).toBeInTheDocument()
    expect(screen.getByText('D-Line')).toBeInTheDocument()
    expect(screen.getByText('Secondary')).toBeInTheDocument()
  })

  it('shows the reroll count', () => {
    render(<SetupScreen />)
    expect(screen.getByText(/3 re-rolls/i)).toBeInTheDocument()
  })

  it('calls rerollSetupSlot when re-roll button clicked', async () => {
    const rerollFn = vi.fn().mockResolvedValue(undefined)
    useGameStore.setState({ rerollSetupSlot: rerollFn } as any)
    render(<SetupScreen />)
    const rerollBtns = screen.getAllByRole('button', { name: /re-roll/i })
    await userEvent.click(rerollBtns[0])
    expect(rerollFn).toHaveBeenCalledTimes(1)
  })

  it('disables re-roll buttons when rerolls exhausted', () => {
    useGameStore.setState({ setupRerollsRemaining: 0 } as any)
    render(<SetupScreen />)
    const rerollBtns = screen.getAllByRole('button', { name: /re-roll/i })
    rerollBtns.forEach(btn => expect(btn).toBeDisabled())
  })

  it('calls confirmSetup when Start Season clicked', async () => {
    const confirmFn = vi.fn().mockResolvedValue(undefined)
    useGameStore.setState({ confirmSetup: confirmFn } as any)
    render(<SetupScreen />)
    await userEvent.click(screen.getByRole('button', { name: /start season/i }))
    expect(confirmFn).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run — verify fails**

```bash
npm run test -- --run src/components/screens/SetupScreen.test.tsx
```
Expected: FAIL.

- [ ] **Step 3: Create PlayerCard.tsx**

Create `src/components/roster/PlayerCard.tsx`:
```tsx
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { StatBar } from '../ui/StatBar'
import type { Player, TeamUnit, RosterPosition, QBStats, WRStats, RBStats, KStats, OLineStats, DLineStats, SecondaryStats } from '../../types'

interface PlayerCardProps {
  slot: Player | TeamUnit
  position: RosterPosition
  onReroll?: () => void
  rerollsRemaining?: number
}

const POSITION_LABELS: Record<RosterPosition, string> = {
  QB: 'QB', WR1: 'WR1', WR2: 'WR2', RB: 'RB', K: 'K',
  OLine: 'O-Line', DLine: 'D-Line', Secondary: 'Secondary',
}

function renderStats(slot: Player | TeamUnit) {
  const s = slot.stats
  if ('passYPG' in s) {
    const q = s as QBStats
    return (
      <>
        <StatBar label="Pass YPG" value={q.passYPG.toFixed(1)} />
        <StatBar label="TD Ratio" value={(q.tdRatio * 100).toFixed(1) + '%'} />
        <StatBar label="INT Ratio" value={(q.intRatio * 100).toFixed(1) + '%'} />
        <StatBar label="QBR" value={q.qbr.toFixed(1)} />
      </>
    )
  }
  if ('recYPG' in s) {
    const w = s as WRStats
    return (
      <>
        <StatBar label="Rec YPG" value={w.recYPG.toFixed(1)} />
        <StatBar label="TDs/Game" value={w.tdPerGame.toFixed(2)} />
      </>
    )
  }
  if ('rushYPG' in s) {
    const r = s as RBStats
    return (
      <>
        <StatBar label="Rush YPG" value={r.rushYPG.toFixed(1)} />
        <StatBar label="TDs/Game" value={r.tdPerGame.toFixed(2)} />
      </>
    )
  }
  if ('fgAccuracy' in s) {
    const k = s as KStats
    return <StatBar label="FG Accuracy" value={(k.fgAccuracy * 100).toFixed(1) + '%'} />
  }
  if ('sacksAllowedPerGame' in s) {
    const o = s as OLineStats
    return (
      <>
        <StatBar label="Sacks Allowed/G" value={o.sacksAllowedPerGame.toFixed(1)} />
        <StatBar label="Rush YPC" value={o.rushYPC.toFixed(1)} />
        <StatBar label="Rank" value={`#${o.normalizedRank}`} />
      </>
    )
  }
  if ('sacksPerGame' in s) {
    const d = s as DLineStats
    return (
      <>
        <StatBar label="Sacks/G" value={d.sacksPerGame.toFixed(1)} />
        <StatBar label="Rush YPC Allowed" value={d.rushYPCAllowed.toFixed(1)} />
        <StatBar label="Rank" value={`#${d.normalizedRank}`} />
      </>
    )
  }
  const sec = s as SecondaryStats
  return (
    <>
      <StatBar label="Comp% Allowed" value={(sec.completionPctAllowed * 100).toFixed(1) + '%'} />
      <StatBar label="Yds/Att Allowed" value={sec.yardsPerAttemptAllowed.toFixed(1)} />
      <StatBar label="Rank" value={`#${sec.normalizedRank}`} />
    </>
  )
}

export function PlayerCard({ slot, position, onReroll, rerollsRemaining = 0 }: PlayerCardProps) {
  const isUnit = 'position' in slot && !('name' in slot)
  const name = 'name' in slot ? slot.name : `${slot.team} ${POSITION_LABELS[position]}`

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
            {POSITION_LABELS[position]}
          </span>
          <p className="text-white font-semibold mt-0.5">{name}</p>
          <div className="flex gap-1 mt-1">
            <Badge label={slot.team} />
            <Badge label={String(slot.year)} color="blue" />
          </div>
        </div>
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
      <div>{renderStats(slot)}</div>
    </div>
  )
}
```

- [ ] **Step 4: Create RosterGrid.tsx**

Create `src/components/roster/RosterGrid.tsx`:
```tsx
import { PlayerCard } from './PlayerCard'
import type { Roster, RosterPosition } from '../../types'

interface RosterGridProps {
  roster: Roster
  onReroll?: (position: RosterPosition) => void
  rerollsRemaining?: number
}

const POSITIONS: RosterPosition[] = ['QB', 'WR1', 'WR2', 'RB', 'K', 'OLine', 'DLine', 'Secondary']

export function RosterGrid({ roster, onReroll, rerollsRemaining = 0 }: RosterGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {POSITIONS.map(pos => {
        const slot = roster[pos]
        if (!slot) return (
          <div key={pos} className="bg-gray-900 border border-dashed border-gray-700 rounded-xl p-4 flex items-center justify-center">
            <span className="text-gray-600 text-sm">Loading...</span>
          </div>
        )
        return (
          <PlayerCard
            key={pos}
            slot={slot}
            position={pos}
            onReroll={onReroll ? () => onReroll(pos) : undefined}
            rerollsRemaining={rerollsRemaining}
          />
        )
      })}
    </div>
  )
}
```

- [ ] **Step 5: Create SetupScreen.tsx**

Create `src/components/screens/SetupScreen.tsx`:
```tsx
import { useGameStore } from '../../store/gameStore'
import { RosterGrid } from '../roster/RosterGrid'
import { Button } from '../ui/Button'
import type { RosterPosition } from '../../types'

export function SetupScreen() {
  const { roster, setupRerollsRemaining, rerollSetupSlot, confirmSetup, isLoading } = useGameStore()

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Your Starting Roster</h1>
          <p className="text-gray-400 mt-1">
            {setupRerollsRemaining} re-rolls remaining — swap out any player before the season begins
          </p>
        </div>
        <Button onClick={confirmSetup} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Start Season →'}
        </Button>
      </div>
      <RosterGrid
        roster={roster}
        onReroll={(pos: RosterPosition) => rerollSetupSlot(pos)}
        rerollsRemaining={setupRerollsRemaining}
      />
    </div>
  )
}
```

- [ ] **Step 6: Run — verify passes**

```bash
npm run test -- --run src/components/screens/SetupScreen.test.tsx
```
Expected: PASS — 5 tests.

- [ ] **Step 7: Commit**

```bash
git add src/components/
git commit -m "feat: add setup screen with player cards and roster grid"
```

---

## Task 11: Round Hub Screen

**Files:**
- Create: `src/components/round/OpponentPreview.tsx`, `src/components/round/WeatherBadge.tsx`, `src/components/round/TeamStatsSummary.tsx`, `src/components/round/RoundHub.tsx`

- [ ] **Step 1: Create OpponentPreview.tsx**

Create `src/components/round/OpponentPreview.tsx`:
```tsx
import { StatBar } from '../ui/StatBar'
import type { TeamStats } from '../../types'

function rankColor(rank: number): string {
  if (rank <= 8) return 'text-green-400'
  if (rank <= 24) return 'text-yellow-400'
  return 'text-red-400'
}

export function OpponentPreview({ opponent }: { opponent: TeamStats }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Opponent</h3>
      <p className="text-white font-bold text-lg mb-1">{opponent.team} <span className="text-gray-500 font-normal">'{String(opponent.year).slice(2)}</span></p>
      <div className="grid grid-cols-2 gap-x-4 mt-3">
        <div>
          <p className="text-xs text-gray-500 mb-1">Offense</p>
          <p className={`text-sm font-semibold ${rankColor(opponent.offenseRank)}`}>#{opponent.offenseRank}/32</p>
          <StatBar label="QB YPG" value={opponent.qbAvgYPG.toFixed(1)} />
          <StatBar label="RB YPG" value={opponent.rbAvgYPG.toFixed(1)} />
          <StatBar label="WR YPG" value={opponent.wrAvgYPG.toFixed(1)} />
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Defense</p>
          <p className={`text-sm font-semibold ${rankColor(opponent.defenseRank)}`}>#{opponent.defenseRank}/32</p>
          <StatBar label="Pts Allowed/G" value={opponent.defPointsAllowed.toFixed(1)} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create WeatherBadge.tsx**

Create `src/components/round/WeatherBadge.tsx`:
```tsx
import type { WeatherCondition } from '../../types'

const WEATHER_CONFIG: Record<WeatherCondition, { icon: string; label: string; color: string }> = {
  Clear: { icon: '☀️', label: 'Clear', color: 'text-yellow-300' },
  Dome: { icon: '🏟️', label: 'Dome', color: 'text-blue-300' },
  Rain: { icon: '🌧️', label: 'Rain', color: 'text-blue-400' },
  HeavyWind: { icon: '💨', label: 'Heavy Wind', color: 'text-gray-300' },
  Snow: { icon: '❄️', label: 'Snow', color: 'text-cyan-300' },
}

export function WeatherBadge({ condition }: { condition: WeatherCondition }) {
  const { icon, label, color } = WEATHER_CONFIG[condition]
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wider">Conditions</p>
        <p className={`font-semibold ${color}`}>{label}</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create TeamStatsSummary.tsx**

Create `src/components/round/TeamStatsSummary.tsx`:
```tsx
import { StatBar } from '../ui/StatBar'
import { computeAggregateStats } from '../../logic/stats'
import type { Roster } from '../../types'

export function TeamStatsSummary({ roster }: { roster: Roster }) {
  const stats = computeAggregateStats(roster)
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Your Team</h3>
      <StatBar label="Pass YPG" value={stats.passYPG.toFixed(1)} />
      <StatBar label="Rush YPG" value={stats.rushYPG.toFixed(1)} />
      <StatBar label="O-Line Rank" value={`#${stats.oLineRank}`} />
      <StatBar label="D-Line Rank" value={`#${stats.dLineRank}`} />
      <StatBar label="Secondary Rank" value={`#${stats.secondaryRank}`} />
    </div>
  )
}
```

- [ ] **Step 4: Create RoundHub.tsx**

Create `src/components/round/RoundHub.tsx`:
```tsx
import { useGameStore } from '../../store/gameStore'
import { OpponentPreview } from './OpponentPreview'
import { WeatherBadge } from './WeatherBadge'
import { TeamStatsSummary } from './TeamStatsSummary'
import { Button } from '../ui/Button'

export function RoundHub() {
  const { round, roster, currentOpponent, currentWeather, viewDraftOffer, isLoading } = useGameStore()

  if (!currentOpponent || !currentWeather) return null

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider">NFL Season</p>
          <h1 className="text-3xl font-bold text-white">Week {round} <span className="text-gray-500 text-xl font-normal">of 17</span></h1>
        </div>
        <Button onClick={viewDraftOffer} disabled={isLoading}>
          View Draft Offer →
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <OpponentPreview opponent={currentOpponent} />
        <div className="flex flex-col gap-4">
          <WeatherBadge condition={currentWeather} />
          <TeamStatsSummary roster={roster} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/round/
git commit -m "feat: add round hub screen components"
```

---

## Task 12: Draft Offer Screen

**Files:**
- Create: `src/components/draft/PlayerPickCard.tsx`, `src/components/draft/SlotChooser.tsx`, `src/components/draft/DraftOffer.tsx`, `src/components/draft/DraftOffer.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/draft/DraftOffer.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DraftOffer } from './DraftOffer'
import { useGameStore } from '../../store/gameStore'

const mockOffer = {
  team: 'NE', year: 2019,
  players: [
    { id: 'qb_brady', name: 'Tom Brady', position: 'QB' as const, team: 'NE', year: 2019,
      stats: { passYPG: 240, tdRatio: 0.058, intRatio: 0.013, qbr: 61 }, eraNormFactor: 0.92 },
    { id: 'wr_edelman', name: 'Julian Edelman', position: 'WR' as const, team: 'NE', year: 2019,
      stats: { recYPG: 72, tdPerGame: 0.35 }, eraNormFactor: 1.02 },
  ],
  units: [
    { id: 'sec_ne', position: 'Secondary' as const, team: 'NE', year: 2019,
      stats: { completionPctAllowed: 0.571, yardsPerAttemptAllowed: 5.9, tdPctAllowed: 0.029, intPct: 0.041, normalizedRank: 1 }, eraNormFactor: 1.0 },
  ],
}

const mockRoster = {
  QB: { id: 'qb_old', name: 'Old QB', position: 'QB' as const, team: 'KC', year: 2022,
    stats: { passYPG: 317, tdRatio: 0.067, intRatio: 0.011, qbr: 74 }, eraNormFactor: 1.08 },
  WR1: null, WR2: null, RB: null, K: null, OLine: null, DLine: null, Secondary: null,
}

beforeEach(() => {
  useGameStore.setState({
    phase: 'draft-offer', round: 3, roster: mockRoster as any,
    currentDraftOffer: mockOffer, draftRerollAvailable: true,
    currentOpponent: null, currentWeather: null,
    seasonLog: [], isLoading: false, setupRerollsRemaining: 0,
    initGame: vi.fn(), rerollSetupSlot: vi.fn(), confirmSetup: vi.fn(),
    viewDraftOffer: vi.fn(),
    rerollDraftOffer: vi.fn().mockResolvedValue(undefined),
    draftPlayer: vi.fn().mockResolvedValue(undefined),
    skipDraft: vi.fn().mockResolvedValue(undefined),
  })
})

describe('DraftOffer', () => {
  it('shows the offering team and year', () => {
    render(<DraftOffer />)
    expect(screen.getByText(/NE/)).toBeInTheDocument()
    expect(screen.getByText(/2019/)).toBeInTheDocument()
  })

  it('shows all players and units in the offer', () => {
    render(<DraftOffer />)
    expect(screen.getByText('Tom Brady')).toBeInTheDocument()
    expect(screen.getByText('Julian Edelman')).toBeInTheDocument()
    expect(screen.getByText(/NE Secondary/i)).toBeInTheDocument()
  })

  it('enables Confirm after selecting a non-WR player', async () => {
    render(<DraftOffer />)
    await userEvent.click(screen.getByText('Tom Brady'))
    expect(screen.getByRole('button', { name: /confirm/i })).not.toBeDisabled()
  })

  it('calls skipDraft when Skip is clicked', async () => {
    const skipFn = vi.fn().mockResolvedValue(undefined)
    useGameStore.setState({ skipDraft: skipFn } as any)
    render(<DraftOffer />)
    await userEvent.click(screen.getByRole('button', { name: /skip/i }))
    expect(skipFn).toHaveBeenCalledTimes(1)
  })

  it('calls rerollDraftOffer when Re-roll Offer is clicked', async () => {
    const rerollFn = vi.fn().mockResolvedValue(undefined)
    useGameStore.setState({ rerollDraftOffer: rerollFn } as any)
    render(<DraftOffer />)
    await userEvent.click(screen.getByRole('button', { name: /re-roll offer/i }))
    expect(rerollFn).toHaveBeenCalledTimes(1)
  })

  it('shows SlotChooser when a WR is selected', async () => {
    render(<DraftOffer />)
    await userEvent.click(screen.getByText('Julian Edelman'))
    expect(screen.getByText(/WR1/)).toBeInTheDocument()
    expect(screen.getByText(/WR2/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run — verify fails**

```bash
npm run test -- --run src/components/draft/DraftOffer.test.tsx
```
Expected: FAIL.

- [ ] **Step 3: Create PlayerPickCard.tsx**

Create `src/components/draft/PlayerPickCard.tsx`:
```tsx
import { Badge } from '../ui/Badge'
import { StatBar } from '../ui/StatBar'
import type { Player, TeamUnit, QBStats, WRStats, RBStats, KStats, OLineStats, DLineStats, SecondaryStats } from '../../types'

interface PlayerPickCardProps {
  item: Player | TeamUnit
  selected: boolean
  onClick: () => void
}

function renderStats(item: Player | TeamUnit) {
  const s = item.stats
  if ('passYPG' in s) { const q = s as QBStats; return <StatBar label="Pass YPG" value={q.passYPG.toFixed(1)} /> }
  if ('recYPG' in s) { const w = s as WRStats; return <StatBar label="Rec YPG" value={w.recYPG.toFixed(1)} /> }
  if ('rushYPG' in s) { const r = s as RBStats; return <StatBar label="Rush YPG" value={r.rushYPG.toFixed(1)} /> }
  if ('fgAccuracy' in s) { const k = s as KStats; return <StatBar label="FG Acc" value={(k.fgAccuracy * 100).toFixed(1) + '%'} /> }
  if ('sacksAllowedPerGame' in s) { const o = s as OLineStats; return <StatBar label="Rank" value={`#${o.normalizedRank}`} /> }
  if ('sacksPerGame' in s) { const d = s as DLineStats; return <StatBar label="Rank" value={`#${d.normalizedRank}`} /> }
  const sec = s as SecondaryStats; return <StatBar label="Rank" value={`#${sec.normalizedRank}`} />
}

export function PlayerPickCard({ item, selected, onClick }: PlayerPickCardProps) {
  const name = 'name' in item ? item.name : `${item.team} ${item.position}`
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-lg border p-3 transition-all
        ${selected
          ? 'border-indigo-500 bg-indigo-950 ring-1 ring-indigo-500'
          : 'border-gray-700 bg-gray-900 hover:border-gray-500'
        }`}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-white">{name}</p>
        <Badge label={item.position} color="blue" />
      </div>
      {renderStats(item)}
    </div>
  )
}
```

- [ ] **Step 4: Create SlotChooser.tsx**

Create `src/components/draft/SlotChooser.tsx`:
```tsx
import { Button } from '../ui/Button'
import type { RosterPosition } from '../../types'

interface SlotChooserProps {
  onChoose: (slot: RosterPosition) => void
  onCancel: () => void
  currentWR1Name: string | null
  currentWR2Name: string | null
}

export function SlotChooser({ onChoose, onCancel, currentWR1Name, currentWR2Name }: SlotChooserProps) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-80">
        <h3 className="text-white font-bold text-lg mb-1">Choose a slot</h3>
        <p className="text-gray-400 text-sm mb-5">Which receiver slot should this player fill?</p>
        <div className="flex flex-col gap-3">
          <Button onClick={() => onChoose('WR1')} variant="secondary">
            WR1 {currentWR1Name ? `(replace ${currentWR1Name})` : '(empty)'}
          </Button>
          <Button onClick={() => onChoose('WR2')} variant="secondary">
            WR2 {currentWR2Name ? `(replace ${currentWR2Name})` : '(empty)'}
          </Button>
        </div>
        <button onClick={onCancel} className="mt-4 w-full text-center text-sm text-gray-500 hover:text-gray-300">
          Cancel
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create DraftOffer.tsx**

Create `src/components/draft/DraftOffer.tsx`:
```tsx
import { useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { PlayerPickCard } from './PlayerPickCard'
import { SlotChooser } from './SlotChooser'
import { Button } from '../ui/Button'
import type { Player, TeamUnit, RosterPosition } from '../../types'

export function DraftOffer() {
  const {
    round, currentDraftOffer, roster, draftRerollAvailable,
    isLoading, rerollDraftOffer, draftPlayer, skipDraft,
  } = useGameStore()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showSlotChooser, setShowSlotChooser] = useState(false)

  if (!currentDraftOffer) return null

  const allItems: (Player | TeamUnit)[] = [...currentDraftOffer.players, ...currentDraftOffer.units]
  const selected = allItems.find(i => i.id === selectedId)

  function handleSelect(item: Player | TeamUnit) {
    setSelectedId(item.id)
    setShowSlotChooser(false)
  }

  function handleConfirm() {
    if (!selected) return
    if (selected.position === 'WR') {
      setShowSlotChooser(true)
      return
    }
    const targetPosition = selected.position as RosterPosition
    draftPlayer(selected.id, targetPosition)
  }

  function handleSlotChosen(slot: RosterPosition) {
    if (!selected) return
    setShowSlotChooser(false)
    draftPlayer(selected.id, slot)
  }

  const wr1Name = roster.WR1 && 'name' in roster.WR1 ? (roster.WR1 as Player).name : null
  const wr2Name = roster.WR2 && 'name' in roster.WR2 ? (roster.WR2 as Player).name : null

  const byPosition = allItems.reduce<Record<string, (Player | TeamUnit)[]>>((acc, item) => {
    const pos = item.position
    if (!acc[pos]) acc[pos] = []
    acc[pos].push(item)
    return acc
  }, {})

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {showSlotChooser && (
        <SlotChooser
          onChoose={handleSlotChosen}
          onCancel={() => setShowSlotChooser(false)}
          currentWR1Name={wr1Name}
          currentWR2Name={wr2Name}
        />
      )}

      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider">Week {round} Draft Offer</p>
          <h1 className="text-3xl font-bold text-white">
            {currentDraftOffer.team} <span className="text-gray-400 font-normal">{currentDraftOffer.year}</span>
          </h1>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={rerollDraftOffer}
            variant="secondary"
            disabled={!draftRerollAvailable || isLoading}
          >
            Re-roll Offer
          </Button>
          <Button onClick={skipDraft} variant="ghost" disabled={isLoading}>
            Skip
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedId || isLoading}>
            Confirm Pick
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(byPosition).map(([pos, items]) => (
          <div key={pos}>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{pos}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {items.map(item => (
                <PlayerPickCard
                  key={item.id}
                  item={item}
                  selected={item.id === selectedId}
                  onClick={() => handleSelect(item)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Run — verify passes**

```bash
npm run test -- --run src/components/draft/DraftOffer.test.tsx
```
Expected: PASS — 6 tests.

- [ ] **Step 7: Commit**

```bash
git add src/components/draft/
git commit -m "feat: add draft offer screen with slot chooser"
```

---

## Task 13: Roster View & Complete Screen

**Files:**
- Create: `src/components/screens/RosterView.tsx`, `src/components/screens/CompleteScreen.tsx`

- [ ] **Step 1: Create RosterView.tsx**

Create `src/components/screens/RosterView.tsx`:
```tsx
import { useGameStore } from '../../store/gameStore'
import { RosterGrid } from '../roster/RosterGrid'

export function RosterView() {
  const { roster } = useGameStore()
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold text-white mb-6">My Roster</h2>
      <RosterGrid roster={roster} />
    </div>
  )
}
```

- [ ] **Step 2: Create CompleteScreen.tsx**

Create `src/components/screens/CompleteScreen.tsx`:
```tsx
import { useGameStore } from '../../store/gameStore'
import { TeamStatsSummary } from '../round/TeamStatsSummary'

export function CompleteScreen() {
  const { roster, seasonLog } = useGameStore()
  const drafted = seasonLog.filter(r => r.draftedId !== null).length

  return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center">
      <p className="text-indigo-400 font-bold uppercase tracking-widest text-sm mb-2">Season Complete</p>
      <h1 className="text-5xl font-black text-white mb-4">17 Weeks Done</h1>
      <p className="text-gray-400 mb-10">You drafted {drafted} player{drafted !== 1 ? 's' : ''} over the season.</p>
      <div className="text-left">
        <TeamStatsSummary roster={roster} />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/screens/RosterView.tsx src/components/screens/CompleteScreen.tsx
git commit -m "feat: add roster view and season complete screen"
```

---

## Task 14: App Composition

**Files:**
- Modify: `src/App.tsx`
- Create: `src/App.test.tsx`

- [ ] **Step 1: Write failing test**

Create `src/App.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'
import { useGameStore } from './store/gameStore'

vi.mock('./store/gameStore', () => ({
  useGameStore: vi.fn(),
}))

const baseState = {
  phase: 'setup', round: 1, roster: { QB: null, WR1: null, WR2: null, RB: null, K: null, OLine: null, DLine: null, Secondary: null },
  setupRerollsRemaining: 3, draftRerollAvailable: true,
  currentOpponent: null, currentWeather: null, currentDraftOffer: null,
  seasonLog: [], isLoading: false,
  initGame: vi.fn().mockResolvedValue(undefined),
  rerollSetupSlot: vi.fn(), confirmSetup: vi.fn(), viewDraftOffer: vi.fn(),
  rerollDraftOffer: vi.fn(), draftPlayer: vi.fn(), skipDraft: vi.fn(),
}

describe('App', () => {
  it('renders SetupScreen in setup phase', () => {
    vi.mocked(useGameStore).mockReturnValue({ ...baseState, phase: 'setup' } as any)
    render(<App />)
    expect(screen.getByText(/Starting Roster/i)).toBeInTheDocument()
  })

  it('renders RoundHub in round-hub phase', () => {
    vi.mocked(useGameStore).mockReturnValue({
      ...baseState,
      phase: 'round-hub',
      currentOpponent: { team: 'NE', year: 2019, offenseRank: 12, defenseRank: 1, qbAvgYPG: 240, rbAvgYPG: 94, wrAvgYPG: 118, defPointsAllowed: 13.8 },
      currentWeather: 'Clear',
    } as any)
    render(<App />)
    expect(screen.getByText(/Week/i)).toBeInTheDocument()
  })

  it('renders CompleteScreen in complete phase', () => {
    vi.mocked(useGameStore).mockReturnValue({ ...baseState, phase: 'complete', seasonLog: [] } as any)
    render(<App />)
    expect(screen.getByText(/Season Complete/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run — verify fails**

```bash
npm run test -- --run src/App.test.tsx
```
Expected: FAIL.

- [ ] **Step 3: Implement App.tsx**

Replace `src/App.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { useGameStore } from './store/gameStore'
import { SetupScreen } from './components/screens/SetupScreen'
import { RoundHub } from './components/round/RoundHub'
import { DraftOffer } from './components/draft/DraftOffer'
import { RosterView } from './components/screens/RosterView'
import { CompleteScreen } from './components/screens/CompleteScreen'

export default function App() {
  const { phase, initGame, isLoading, roster } = useGameStore()
  const [showRoster, setShowRoster] = useState(false)

  useEffect(() => { initGame() }, [])

  if (isLoading && phase === 'setup' && !roster.QB) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400 animate-pulse">Generating your roster...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      {phase !== 'setup' && phase !== 'complete' && (
        <nav className="border-b border-gray-800 px-4 py-3 flex items-center justify-between">
          <span className="text-indigo-400 font-bold tracking-wide text-sm">NFL DRAFT GAME</span>
          <button
            onClick={() => setShowRoster(v => !v)}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            {showRoster ? '← Back' : 'My Roster'}
          </button>
        </nav>
      )}

      {/* Roster overlay */}
      {showRoster ? (
        <RosterView />
      ) : (
        <>
          {phase === 'setup' && <SetupScreen />}
          {phase === 'round-hub' && <RoundHub />}
          {phase === 'draft-offer' && <DraftOffer />}
          {phase === 'complete' && <CompleteScreen />}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run — verify passes**

```bash
npm run test -- --run src/App.test.tsx
```
Expected: PASS — 3 tests.

- [ ] **Step 5: Run full test suite**

```bash
npm run test -- --run
```
Expected: All tests pass.

- [ ] **Step 6: Start dev server and verify the full flow works**

```bash
npm run dev
```
Navigate to `http://localhost:5173`. Verify:
- Setup screen loads with 8 player cards from KC 2022 / NE 2019 sample data
- Re-roll buttons decrement the counter
- "Start Season" transitions to Round Hub
- "View Draft Offer" transitions to Draft Offer screen
- Selecting a non-WR and confirming advances to next round
- Selecting a WR shows the WR1/WR2 chooser

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "feat: wire up App with phase-based screen routing and roster nav"
```

---

## Task 15: Data Preprocessing Script

**Files:**
- Create: `scripts/requirements.txt`, `scripts/preprocess.py`

- [ ] **Step 1: Create requirements.txt**

Create `scripts/requirements.txt`:
```
nfl-data-py==0.3.3
pandas>=2.0.0
```

- [ ] **Step 2: Create preprocess.py**

Create `scripts/preprocess.py`:
```python
"""
NFL Stats Preprocessor
Outputs: public/data/meta.json, public/data/players/{year}/{team}.json,
         public/data/teams/{year}/{team}.json

Run: cd scripts && pip install -r requirements.txt && python preprocess.py
"""

import json
import os
import sys
from pathlib import Path

import nfl_data_py as nfl
import pandas as pd

YEARS = list(range(2000, 2026))
OUT = Path(__file__).parent.parent / "public" / "data"

TEAM_ABBR_MAP = {
    "ARI": "ARI", "ATL": "ATL", "BAL": "BAL", "BUF": "BUF",
    "CAR": "CAR", "CHI": "CHI", "CIN": "CIN", "CLE": "CLE",
    "DAL": "DAL", "DEN": "DEN", "DET": "DET", "GB": "GB",
    "HOU": "HOU", "IND": "IND", "JAX": "JAX", "KC": "KC",
    "LAC": "LAC", "LAR": "LAR", "LV": "LV", "MIA": "MIA",
    "MIN": "MIN", "NE": "NE", "NO": "NO", "NYG": "NYG",
    "NYJ": "NYJ", "PHI": "PHI", "PIT": "PIT", "SEA": "SEA",
    "SF": "SF", "TB": "TB", "TEN": "TEN", "WAS": "WAS",
    # legacy abbreviations
    "OAK": "LV", "SD": "LAC", "STL": "LAR",
}


def normalize_team(abbr: str) -> str:
    return TEAM_ABBR_MAP.get(abbr.upper(), abbr.upper())


def era_factor(series: pd.Series, value: float) -> float:
    mean = series.mean()
    return round(value / mean, 4) if mean > 0 else 1.0


def compute_league_averages(weekly: pd.DataFrame) -> dict:
    """Compute per-year league averages for era normalization."""
    avgs = {}
    for year, grp in weekly.groupby("season"):
        qbs = grp[grp["position"] == "QB"].copy()
        qbs = qbs.groupby("player_id").agg({"passing_yards": "sum", "games": "sum"}).query("games >= 4")
        avg_pass_ypg = (qbs["passing_yards"] / qbs["games"]).mean() if len(qbs) > 0 else 250
        avgs[int(year)] = {"avg_pass_ypg": avg_pass_ypg}
    return avgs


def process_players(weekly: pd.DataFrame, era_avgs: dict) -> dict:
    """Returns {(team, year): {players: [...], units: [...]}}"""
    roster_map: dict = {}

    def add(key, category, entry):
        if key not in roster_map:
            roster_map[key] = {"players": [], "units": []}
        roster_map[key][category].append(entry)

    # Individual players: aggregate to season totals, compute per-game
    season = weekly.copy()
    season["games"] = season.groupby(["player_id", "season"])["week"].transform("count")

    for (pid, yr), grp in season.groupby(["player_id", "season"]):
        row = grp.iloc[0]
        pos = str(row.get("position", "")).upper()
        team = normalize_team(str(row.get("recent_team", "")))
        if team not in TEAM_ABBR_MAP.values():
            continue
        g = len(grp)
        if g < 4:
            continue
        key = (team, int(yr))
        yr_int = int(yr)

        if pos == "QB":
            pass_yds = grp["passing_yards"].sum()
            pass_td = grp["passing_tds"].sum()
            ints = grp["interceptions"].sum()
            atts = grp["attempts"].sum()
            epa = grp["passing_epa"].mean() if "passing_epa" in grp.columns else 0.0
            if atts < 100:
                continue
            ypg = round(pass_yds / g, 1)
            avg_ypg = era_avgs.get(yr_int, {}).get("avg_pass_ypg", 250)
            qbr = round(max(0, min(100, 50 + epa * 10)), 1)
            add(key, "players", {
                "id": f"p_{pid}_{team}_{yr_int}",
                "name": str(row.get("player_display_name", pid)),
                "position": "QB",
                "team": team,
                "year": yr_int,
                "stats": {
                    "passYPG": ypg,
                    "tdRatio": round(pass_td / atts, 4) if atts > 0 else 0,
                    "intRatio": round(ints / atts, 4) if atts > 0 else 0,
                    "qbr": qbr,
                },
                "eraNormFactor": era_factor(pd.Series([avg_ypg]), ypg),
            })

        elif pos in ("WR", "TE"):
            rec_yds = grp["receiving_yards"].sum()
            rec_td = grp["receiving_tds"].sum()
            tgt = grp["targets"].sum()
            if tgt < 20:
                continue
            ypg = round(rec_yds / g, 1)
            add(key, "players", {
                "id": f"p_{pid}_{team}_{yr_int}",
                "name": str(row.get("player_display_name", pid)),
                "position": "WR",
                "team": team,
                "year": yr_int,
                "stats": {"recYPG": ypg, "tdPerGame": round(rec_td / g, 3)},
                "eraNormFactor": 1.0,
            })

        elif pos == "RB":
            rush_yds = grp["rushing_yards"].sum()
            rush_td = grp["rushing_tds"].sum()
            carries = grp["carries"].sum()
            if carries < 30:
                continue
            ypg = round(rush_yds / g, 1)
            add(key, "players", {
                "id": f"p_{pid}_{team}_{yr_int}",
                "name": str(row.get("player_display_name", pid)),
                "position": "RB",
                "team": team,
                "year": yr_int,
                "stats": {"rushYPG": ypg, "tdPerGame": round(rush_td / g, 3)},
                "eraNormFactor": 1.0,
            })

    return roster_map


def process_kickers(pbp: pd.DataFrame, roster_map: dict) -> None:
    """Extract kicker FG accuracy from play-by-play and add to roster_map."""
    fg_plays = pbp[pbp["play_type"] == "field_goal"].copy()
    if fg_plays.empty:
        return

    for (team_raw, yr), grp in fg_plays.groupby(["posteam", "season"]):
        team = normalize_team(str(team_raw))
        yr_int = int(yr)
        key = (team, yr_int)
        att = len(grp)
        if att < 5:
            continue
        made = grp["field_goal_result"].eq("made").sum() if "field_goal_result" in grp.columns else 0
        accuracy = round(made / att, 4) if att > 0 else 0.0
        kicker_name = str(grp["kicker_player_name"].mode().iloc[0]) if "kicker_player_name" in grp.columns else "K"
        kicker_id = str(grp["kicker_player_id"].mode().iloc[0]) if "kicker_player_id" in grp.columns else f"k_{team}_{yr_int}"

        if key not in roster_map:
            roster_map[key] = {"players": [], "units": []}
        roster_map[key]["players"].append({
            "id": f"p_{kicker_id}_{team}_{yr_int}",
            "name": kicker_name,
            "position": "K",
            "team": team,
            "year": yr_int,
            "stats": {"fgAccuracy": accuracy},
            "eraNormFactor": 1.0,
        })


def process_team_units(schedules: pd.DataFrame, weekly: pd.DataFrame, roster_map: dict) -> dict:
    """Compute O-Line, D-Line, Secondary units and team-level stats. Returns team_stats_map."""
    team_stats_map: dict = {}

    # Aggregate season rushing/passing offense and defense from weekly data
    off_rush = weekly.groupby(["recent_team", "season"]).agg(
        rush_yds=("rushing_yards", "sum"),
        rush_td=("rushing_tds", "sum"),
        carries=("carries", "sum"),
        games=("week", "count"),
    ).reset_index()

    off_pass = weekly.groupby(["recent_team", "season"]).agg(
        pass_yds=("passing_yards", "sum"),
        pass_td=("passing_tds", "sum"),
        attempts=("attempts", "sum"),
        completions=("completions", "sum"),
    ).reset_index()

    # Compute per-team season rushing stats for O-Line
    off_rush["ypc"] = (off_rush["rush_yds"] / off_rush["carries"]).fillna(0)
    off_rush["td_pct"] = (off_rush["rush_td"] / off_rush["carries"]).fillna(0)

    # Compute O-Line rank per year (lower sacks allowed = better)
    # We'll derive sacks allowed from opponent's sack data (not in weekly by default — approximate)
    # Use rushing YPC rank as primary O-Line metric
    for yr, yr_grp in off_rush.groupby("season"):
        yr_int = int(yr)
        yr_grp = yr_grp.copy()
        yr_grp["oline_rank"] = yr_grp["ypc"].rank(ascending=False).astype(int)
        yr_grp["dline_rank"] = yr_grp["ypc"].rank(ascending=True).astype(int)  # lower YPC allowed = better DL

        for _, row in yr_grp.iterrows():
            team = normalize_team(str(row["recent_team"]))
            g = max(1, int(row["games"]))
            key = (team, yr_int)

            if key not in roster_map:
                roster_map[key] = {"players": [], "units": []}

            roster_map[key]["units"].append({
                "id": f"u_{team}_OLine_{yr_int}",
                "position": "OLine",
                "team": team,
                "year": yr_int,
                "stats": {
                    "sacksAllowedPerGame": 2.5,  # placeholder; needs PBP sack data
                    "rushYPC": round(float(row["ypc"]), 2),
                    "rushTDPct": round(float(row["td_pct"]), 4),
                    "normalizedRank": int(row["oline_rank"]),
                },
                "eraNormFactor": 1.0,
            })

    # D-Line and Secondary: approximate from opponent passing/rushing
    # For each team's defense, we look at what opponents gained against them via schedule
    for (team_raw, yr), grp in schedules.groupby(["home_team", "season"]):
        # This is simplified; a full implementation uses PBP opponent stats
        team = normalize_team(str(team_raw))
        yr_int = int(yr)
        key = (team, yr_int)
        if key not in roster_map:
            roster_map[key] = {"players": [], "units": []}

        # Placeholder secondary/dline units; populated properly after PBP processing
        if not any(u["position"] == "DLine" for u in roster_map[key].get("units", [])):
            roster_map[key]["units"].append({
                "id": f"u_{team}_DLine_{yr_int}",
                "position": "DLine",
                "team": team,
                "year": yr_int,
                "stats": {
                    "sacksPerGame": 2.5,
                    "rushYPCAllowed": 4.2,
                    "rushTDPctAllowed": 0.045,
                    "normalizedRank": 16,
                },
                "eraNormFactor": 1.0,
            })

        if not any(u["position"] == "Secondary" for u in roster_map[key].get("units", [])):
            roster_map[key]["units"].append({
                "id": f"u_{team}_Secondary_{yr_int}",
                "position": "Secondary",
                "team": team,
                "year": yr_int,
                "stats": {
                    "completionPctAllowed": 0.635,
                    "yardsPerAttemptAllowed": 7.0,
                    "tdPctAllowed": 0.04,
                    "intPct": 0.025,
                    "normalizedRank": 16,
                },
                "eraNormFactor": 1.0,
            })

    # Build team_stats_map from schedules
    for (team_raw, yr), grp in schedules.groupby(["home_team", "season"]):
        team = normalize_team(str(team_raw))
        yr_int = int(yr)
        team_stats_map[(team, yr_int)] = {
            "team": team, "year": yr_int,
            "offenseRank": 16, "defenseRank": 16,
            "qbAvgYPG": 0.0, "rbAvgYPG": 0.0, "wrAvgYPG": 0.0,
            "defPointsAllowed": float(grp["away_score"].mean()) if "away_score" in grp.columns else 22.0,
        }

    # Fill in per-team YPG stats from weekly
    for (team_raw, yr), grp in weekly.groupby(["recent_team", "season"]):
        team = normalize_team(str(team_raw))
        yr_int = int(yr)
        key = (team, yr_int)
        if key not in team_stats_map:
            team_stats_map[key] = {
                "team": team, "year": yr_int,
                "offenseRank": 16, "defenseRank": 16,
                "qbAvgYPG": 0.0, "rbAvgYPG": 0.0, "wrAvgYPG": 0.0,
                "defPointsAllowed": 22.0,
            }
        g = max(1, len(grp["week"].unique()))
        qb_rows = grp[grp["position"] == "QB"]
        rb_rows = grp[grp["position"] == "RB"]
        wr_rows = grp[grp["position"].isin(["WR", "TE"])]
        if not qb_rows.empty:
            team_stats_map[key]["qbAvgYPG"] = round(qb_rows["passing_yards"].sum() / g, 1)
        if not rb_rows.empty:
            team_stats_map[key]["rbAvgYPG"] = round(rb_rows["rushing_yards"].sum() / g, 1)
        if not wr_rows.empty:
            team_stats_map[key]["wrAvgYPG"] = round(wr_rows["receiving_yards"].sum() / g, 1)

    # Compute offense/defense ranks per year
    for yr in set(yr for _, yr in team_stats_map.keys()):
        yr_teams = [(t, d) for (t, y), d in team_stats_map.items() if y == yr]
        total_off = sorted(yr_teams, key=lambda x: (x[1]["qbAvgYPG"] + x[1]["rbAvgYPG"] + x[1]["wrAvgYPG"]), reverse=True)
        total_def = sorted(yr_teams, key=lambda x: x[1]["defPointsAllowed"])
        for rank, (team, _) in enumerate(total_off, 1):
            team_stats_map[(team, yr)]["offenseRank"] = rank
        for rank, (team, _) in enumerate(total_def, 1):
            team_stats_map[(team, yr)]["defenseRank"] = rank

    return team_stats_map


def write_outputs(roster_map: dict, team_stats_map: dict) -> list:
    meta = []
    for (team, yr), data in roster_map.items():
        if not data["players"] and not data["units"]:
            continue
        player_dir = OUT / "players" / str(yr)
        player_dir.mkdir(parents=True, exist_ok=True)
        with open(player_dir / f"{team}.json", "w") as f:
            json.dump(data, f, indent=2)
        meta.append({"team": team, "year": yr})

    for (team, yr), stats in team_stats_map.items():
        team_dir = OUT / "teams" / str(yr)
        team_dir.mkdir(parents=True, exist_ok=True)
        with open(team_dir / f"{team}.json", "w") as f:
            json.dump(stats, f, indent=2)

    with open(OUT / "meta.json", "w") as f:
        json.dump(sorted(meta, key=lambda x: (x["year"], x["team"])), f, indent=2)

    return meta


def main():
    print(f"Fetching weekly player data for {YEARS[0]}–{YEARS[-1]}...")
    weekly_cols = [
        "player_id", "player_display_name", "position", "recent_team", "season", "week",
        "passing_yards", "passing_tds", "interceptions", "attempts", "completions", "passing_epa",
        "rushing_yards", "rushing_tds", "carries",
        "receiving_yards", "receiving_tds", "receptions", "targets",
    ]
    weekly = nfl.import_weekly_data(YEARS, weekly_cols)
    weekly = weekly.fillna(0)

    print("Computing era averages...")
    era_avgs = compute_league_averages(weekly)

    print("Processing player stats...")
    roster_map = process_players(weekly, era_avgs)

    print("Fetching schedules...")
    schedules = nfl.import_schedules(YEARS)

    print("Processing team units and team stats...")
    team_stats_map = process_team_units(schedules, weekly, roster_map)

    print("Fetching play-by-play for kicker stats (this may take a while)...")
    try:
        pbp = nfl.import_pbp_data(YEARS, columns=["season", "posteam", "play_type", "field_goal_result", "kicker_player_name", "kicker_player_id"])
        process_kickers(pbp, roster_map)
    except Exception as e:
        print(f"Warning: Could not process kicker data: {e}")

    print("Writing output files...")
    meta = write_outputs(roster_map, team_stats_map)
    print(f"Done. Generated {len(meta)} team/year combos.")
    print(f"Output written to {OUT}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 3: Verify script runs (dry run — no PBP)**

```bash
cd scripts && pip install -r requirements.txt
python -c "import nfl_data_py; print('nfl_data_py OK')"
```
Expected: `nfl_data_py OK`

- [ ] **Step 4: Run the full preprocessing (takes 10–30 min on first run due to data downloads)**

```bash
python preprocess.py
```
Expected output ends with: `Done. Generated N team/year combos.`

After running, update `public/data/meta.json` is now populated with all real team/year combos and sample files are replaced.

- [ ] **Step 5: Commit**

```bash
cd ..
git add scripts/
git commit -m "feat: add NFL stats preprocessing script"
```

---

## Running All Tests

```bash
npm run test -- --run
```
Expected: All tests pass across all 15 tasks.

