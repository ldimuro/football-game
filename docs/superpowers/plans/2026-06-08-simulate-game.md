# Simulate Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a drive-by-drive game simulation feature to the Round Hub with a modal result view, where pressing "Continue" advances the round.

**Architecture:** Pure simulation logic in `gameSimulator.ts`; store gains `draftComplete`, `simulationResult`, `pendingDraftedId` state and two new actions (`simulateGame`, `advanceRound`); draft actions no longer advance the round; `SimulationModal` overlay renders the drive log and calls `advanceRound` on Continue.

**Tech Stack:** React 19, Zustand 5, Tailwind CSS 4, Vitest

---

## File Map

**Created:**
- `src/logic/gameSimulator.ts` — `computeTeamRatings`, `simulateDrive`, `simulateGame` pure functions
- `src/logic/gameSimulator.test.ts` — unit tests for the simulator
- `src/components/round/SimulationModal.tsx` — drive log modal component

**Modified:**
- `src/types/index.ts` — add `DriveOutcome`, `TeamRatings`, `DriveResult`, `SimulationResult`
- `src/store/gameStore.ts` — add new state fields and actions; `draftPlayer`/`skipDraft` no longer advance the round
- `src/store/gameStore.test.ts` — update affected tests, add tests for new actions
- `src/components/round/RoundHub.tsx` — add Simulate Game button, disable Draft Offer after use, render `SimulationModal`

---

### Task 1: Add new types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Append new types to `src/types/index.ts`**

Add after the existing `TeamRosterData` interface at the bottom of the file:

```typescript
export type DriveOutcome = 'TD' | 'FG' | 'Punt' | 'Turnover' | 'DefTD' | 'Safety'

export interface TeamRatings {
  passRating: number
  rushRating: number
  oLineRating: number
  dLineRating: number
  secondaryRating: number
  kickerRating: number
  qbIntRisk: number
}

export interface DriveResult {
  possession: 'user' | 'opponent'
  quarter: number
  outcome: DriveOutcome
  scoringTeam: 'user' | 'opponent' | null
  points: number
}

export interface SimulationResult {
  userTeamLabel: string
  opponentTeamLabel: string
  drives: DriveResult[]
  userScore: number
  opponentScore: number
  winner: 'user' | 'opponent' | 'tie'
}
```

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add simulation types (DriveOutcome, TeamRatings, DriveResult, SimulationResult)"
```

---

### Task 2: Implement the game simulator

**Files:**
- Create: `src/logic/gameSimulator.ts`
- Create: `src/logic/gameSimulator.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/logic/gameSimulator.test.ts`:

```typescript
import { describe, it, expect, vi, afterEach } from 'vitest'
import { computeTeamRatings, simulateDrive, simulateGame } from './gameSimulator'
import type { Roster } from '../types'

const makeRoster = (overrides: Partial<Roster> = {}): Roster => ({
  QB: { id: 'qb1', name: 'QB', position: 'QB', team: 'KC', year: 2022, rating: 90,
    stats: { passYPG: 300, avgTDPerGame: 2.0, avgINTPerGame: 0.5, completionPct: 0.68, qbr: 80 } },
  WR1: { id: 'wr1', name: 'WR1', position: 'WR', team: 'KC', year: 2022, rating: 85,
    stats: { recYPG: 80, tdPerGame: 0.4, avgTargetsPerGame: 7, avgCatchesPerGame: 5 } },
  WR2: { id: 'wr2', name: 'WR2', position: 'WR', team: 'KC', year: 2022, rating: 78,
    stats: { recYPG: 55, tdPerGame: 0.2, avgTargetsPerGame: 5, avgCatchesPerGame: 3 } },
  RB: { id: 'rb1', name: 'RB', position: 'RB', team: 'KC', year: 2022, rating: 82,
    stats: { rushYPG: 90, recYPG: 20, tdPerGame: 0.4, rushAttPerGame: 15 } },
  K: { id: 'k1', name: 'K', position: 'K', team: 'KC', year: 2022, rating: 88,
    stats: { fgAccuracy: 0.90, avgKickDistance: 38, avgMissDistance: 48, longestMadeKick: 56 } },
  OLine: { id: 'ol1', position: 'OLine', team: 'KC', year: 2022, rating: 84,
    stats: { sacksAllowedPerGame: 2.5, rushYPC: 4.7, rushTDPct: 0.04, normalizedRank: 9 } },
  DLine: { id: 'dl1', position: 'DLine', team: 'KC', year: 2022, rating: 88,
    stats: { rushYPCAllowed: 4.4, rushYPGAllowed: 107, sackPct: 0.09, rushTDPerGameAllowed: 0.6, blitzPct: 0.24, pressurePct: 0.25, normalizedRank: 8 } },
  Secondary: { id: 'sec1', position: 'Secondary', team: 'KC', year: 2022, rating: 74,
    stats: { completionPctAllowed: 0.66, yardsPerAttemptAllowed: 5.6, passYPGAllowed: 221, passTDPerGameAllowed: 1.9, interceptionsPerGame: 0.65, normalizedRank: 18 } },
  ...overrides,
})

afterEach(() => vi.restoreAllMocks())

describe('computeTeamRatings', () => {
  it('extracts ratings from the rating field on each slot', () => {
    const ratings = computeTeamRatings(makeRoster())
    expect(ratings.passRating).toBe(90)
    expect(ratings.rushRating).toBe(82)
    expect(ratings.oLineRating).toBe(84)
    expect(ratings.dLineRating).toBe(88)
    expect(ratings.secondaryRating).toBe(74)
    expect(ratings.kickerRating).toBe(88)
    expect(ratings.qbIntRisk).toBeCloseTo(5) // 0.5 * 10
  })

  it('falls back to 50 for missing slots', () => {
    const ratings = computeTeamRatings({
      QB: null, WR1: null, WR2: null, RB: null, K: null,
      OLine: null, DLine: null, Secondary: null,
    })
    expect(ratings.passRating).toBe(50)
    expect(ratings.rushRating).toBe(50)
    expect(ratings.kickerRating).toBe(50)
    expect(ratings.qbIntRisk).toBeCloseTo(10) // default avgINTPerGame 1.0 * 10
  })
})

describe('simulateDrive', () => {
  it('returns a valid DriveResult shape', () => {
    const ratings = computeTeamRatings(makeRoster())
    const drive = simulateDrive(ratings, ratings, 'user', 1)
    expect(['TD', 'FG', 'Punt', 'Turnover', 'DefTD', 'Safety']).toContain(drive.outcome)
    expect(drive.possession).toBe('user')
    expect(drive.quarter).toBe(1)
    expect(typeof drive.points).toBe('number')
    expect(drive.scoringTeam === 'user' || drive.scoringTeam === 'opponent' || drive.scoringTeam === null).toBe(true)
  })

  it('TD outcome scores 7 points for the offense', () => {
    // Math.random call order: turnoverScore noise, tdScore noise, fgScore noise,
    // puntScore noise, defTdScore noise, safetyScore noise, then die roll.
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5)  // turnoverScore noise → 0
      .mockReturnValueOnce(0.5)  // tdScore noise → 0
      .mockReturnValueOnce(0.5)  // fgScore noise → 0
      .mockReturnValueOnce(0.5)  // puntScore noise → 0
      .mockReturnValueOnce(0.5)  // defTdScore noise → 0
      .mockReturnValueOnce(0.5)  // safetyScore noise → 0
      .mockReturnValueOnce(0)    // die roll 0 → always selects index 0 (TD)
    const ratings = computeTeamRatings(makeRoster())
    const drive = simulateDrive(ratings, ratings, 'user', 2)
    expect(drive.outcome).toBe('TD')
    expect(drive.points).toBe(7)
    expect(drive.scoringTeam).toBe('user')
  })

  it('Safety outcome scores 2 points for the defense (opponent)', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5)     // turnoverScore noise
      .mockReturnValueOnce(0.5)     // tdScore noise
      .mockReturnValueOnce(0.5)     // fgScore noise
      .mockReturnValueOnce(0.5)     // puntScore noise
      .mockReturnValueOnce(0.5)     // defTdScore noise
      .mockReturnValueOnce(0.5)     // safetyScore noise
      .mockReturnValueOnce(0.9999)  // die roll → cumulative reaches 1.0 only at index 5 (Safety)
    const ratings = computeTeamRatings(makeRoster())
    const drive = simulateDrive(ratings, ratings, 'user', 3)
    expect(drive.outcome).toBe('Safety')
    expect(drive.points).toBe(2)
    expect(drive.scoringTeam).toBe('opponent')
  })

  it('DefTD when opponent is possession scores 7 points for the user', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0) // die roll → index 0 (TD for opponent offense)
    const ratings = computeTeamRatings(makeRoster())
    // When opponent has possession and scores TD, scoringTeam = 'opponent'
    const drive = simulateDrive(ratings, ratings, 'opponent', 1)
    expect(drive.possession).toBe('opponent')
    expect(drive.outcome).toBe('TD')
    expect(drive.scoringTeam).toBe('opponent')
    expect(drive.points).toBe(7)
  })
})

describe('simulateGame', () => {
  it('returns exactly 24 drives', () => {
    const roster = makeRoster()
    expect(simulateGame(roster, roster, "NE '19").drives).toHaveLength(24)
  })

  it('starts each quarter with user possession', () => {
    const { drives } = simulateGame(makeRoster(), makeRoster(), "NE '19")
    expect(drives[0].possession).toBe('user')   // Q1 first
    expect(drives[6].possession).toBe('user')   // Q2 first
    expect(drives[12].possession).toBe('user')  // Q3 first
    expect(drives[18].possession).toBe('user')  // Q4 first
    expect(drives[1].possession).toBe('opponent') // Q1 second
  })

  it('assigns correct quarter numbers', () => {
    const { drives } = simulateGame(makeRoster(), makeRoster(), "NE '19")
    drives.slice(0, 6).forEach(d => expect(d.quarter).toBe(1))
    drives.slice(6, 12).forEach(d => expect(d.quarter).toBe(2))
    drives.slice(12, 18).forEach(d => expect(d.quarter).toBe(3))
    drives.slice(18, 24).forEach(d => expect(d.quarter).toBe(4))
  })

  it('computes userScore and opponentScore as the sum of drive points', () => {
    const result = simulateGame(makeRoster(), makeRoster(), "NE '19")
    const expectedUser = result.drives
      .filter(d => d.scoringTeam === 'user')
      .reduce((s, d) => s + d.points, 0)
    const expectedOpp = result.drives
      .filter(d => d.scoringTeam === 'opponent')
      .reduce((s, d) => s + d.points, 0)
    expect(result.userScore).toBe(expectedUser)
    expect(result.opponentScore).toBe(expectedOpp)
  })

  it('sets winner correctly', () => {
    const result = simulateGame(makeRoster(), makeRoster(), "NE '19")
    if (result.userScore > result.opponentScore) expect(result.winner).toBe('user')
    else if (result.opponentScore > result.userScore) expect(result.winner).toBe('opponent')
    else expect(result.winner).toBe('tie')
  })

  it('uses opponentLabel and hardcodes userTeamLabel as "Your Team"', () => {
    const result = simulateGame(makeRoster(), makeRoster(), "KC '22")
    expect(result.userTeamLabel).toBe('Your Team')
    expect(result.opponentTeamLabel).toBe("KC '22")
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npx vitest run src/logic/gameSimulator.test.ts`
Expected: FAIL — "Cannot find module './gameSimulator'"

- [ ] **Step 3: Implement `src/logic/gameSimulator.ts`**

Create `src/logic/gameSimulator.ts`:

```typescript
import type { Roster, TeamRatings, DriveResult, DriveOutcome, SimulationResult, QBStats } from '../types'

export function computeTeamRatings(roster: Roster): TeamRatings {
  const qbStats = roster.QB?.stats as QBStats | undefined
  return {
    passRating: roster.QB?.rating ?? 50,
    rushRating: roster.RB?.rating ?? 50,
    oLineRating: roster.OLine?.rating ?? 50,
    dLineRating: roster.DLine?.rating ?? 50,
    secondaryRating: roster.Secondary?.rating ?? 50,
    kickerRating: roster.K?.rating ?? 50,
    qbIntRisk: (qbStats?.avgINTPerGame ?? 1.0) * 10,
  }
}

const TEMPERATURE = 20

function noise(range: number): number {
  return Math.random() * range * 2 - range
}

function softmax(scores: number[]): number[] {
  const exps = scores.map(s => Math.exp(s / TEMPERATURE))
  const total = exps.reduce((a, b) => a + b, 0)
  return exps.map(e => e / total)
}

function sampleOutcome(probs: number[]): number {
  const r = Math.random()
  let cumulative = 0
  for (let i = 0; i < probs.length; i++) {
    cumulative += probs[i]
    if (r < cumulative) return i
  }
  return probs.length - 1
}

const OUTCOMES: DriveOutcome[] = ['TD', 'FG', 'Punt', 'Turnover', 'DefTD', 'Safety']

const POINTS: Record<DriveOutcome, number> = {
  TD: 7, FG: 3, Punt: 0, Turnover: 0, DefTD: 7, Safety: 2,
}

function resolveScoringTeam(
  outcome: DriveOutcome,
  possession: 'user' | 'opponent',
): 'user' | 'opponent' | null {
  const defender: 'user' | 'opponent' = possession === 'user' ? 'opponent' : 'user'
  if (outcome === 'TD' || outcome === 'FG') return possession
  if (outcome === 'DefTD' || outcome === 'Safety') return defender
  return null
}

export function simulateDrive(
  offense: TeamRatings,
  defense: TeamRatings,
  possession: 'user' | 'opponent',
  quarter: number,
): DriveResult {
  const passAdv = offense.passRating - defense.secondaryRating
  const rushAdv = offense.rushRating - defense.dLineRating
  const protectionAdv = offense.oLineRating - defense.dLineRating

  const turnoverScore =
    0.30 * defense.secondaryRating +
    0.25 * defense.dLineRating +
    offense.qbIntRisk -
    0.25 * protectionAdv +
    noise(3)

  const scores = [
    0.45 * passAdv + 0.30 * rushAdv + 0.15 * protectionAdv + noise(3),        // TD
    0.20 * passAdv + 0.20 * rushAdv + 0.10 * protectionAdv + 0.25 * offense.kickerRating + noise(3), // FG
    -0.35 * passAdv - 0.35 * rushAdv - 0.10 * protectionAdv + noise(3),        // Punt
    turnoverScore,                                                               // Turnover
    turnoverScore * 0.25 + noise(3),                                            // DefTD
    0.10 * defense.dLineRating - 0.10 * protectionAdv + noise(1),              // Safety
  ]

  const outcome = OUTCOMES[sampleOutcome(softmax(scores))]
  return {
    possession,
    quarter,
    outcome,
    scoringTeam: resolveScoringTeam(outcome, possession),
    points: POINTS[outcome],
  }
}

export function simulateGame(
  userRoster: Roster,
  opponentRoster: Roster,
  opponentLabel: string,
): SimulationResult {
  const userRatings = computeTeamRatings(userRoster)
  const oppRatings = computeTeamRatings(opponentRoster)
  const drives: DriveResult[] = []

  for (let q = 1; q <= 4; q++) {
    for (let d = 0; d < 3; d++) {
      drives.push(simulateDrive(userRatings, oppRatings, 'user', q))
      drives.push(simulateDrive(oppRatings, userRatings, 'opponent', q))
    }
  }

  let userScore = 0
  let opponentScore = 0
  for (const drive of drives) {
    if (drive.scoringTeam === 'user') userScore += drive.points
    else if (drive.scoringTeam === 'opponent') opponentScore += drive.points
  }

  return {
    userTeamLabel: 'Your Team',
    opponentTeamLabel: opponentLabel,
    drives,
    userScore,
    opponentScore,
    winner: userScore > opponentScore ? 'user' : opponentScore > userScore ? 'opponent' : 'tie',
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `npx vitest run src/logic/gameSimulator.test.ts`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/logic/gameSimulator.ts src/logic/gameSimulator.test.ts
git commit -m "feat: add game simulator engine with drive-by-drive softmax logic"
```

---

### Task 3: Update the store

**Files:**
- Modify: `src/store/gameStore.ts`
- Modify: `src/store/gameStore.test.ts`

- [ ] **Step 1: Write updated and new store tests**

Replace the entire content of `src/store/gameStore.test.ts` with:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act } from 'react'
import { useGameStore } from './gameStore'
import type { Roster } from '../types'

const { mockRoster } = vi.hoisted(() => {
  const mockRoster: Roster = {
    QB: { id: 'qb1', name: 'Test QB', position: 'QB', team: 'KC', year: 2022,
      stats: { passYPG: 300, avgTDPerGame: 1.8, avgINTPerGame: 0.3, completionPct: 0.64, qbr: 70 } },
    WR1: { id: 'wr1', name: 'WR1', position: 'WR', team: 'KC', year: 2022,
      stats: { recYPG: 80, tdPerGame: 0.4, avgTargetsPerGame: 6.0, avgCatchesPerGame: 4.0 } },
    WR2: { id: 'wr2', name: 'WR2', position: 'WR', team: 'KC', year: 2022,
      stats: { recYPG: 50, tdPerGame: 0.2, avgTargetsPerGame: 6.0, avgCatchesPerGame: 4.0 } },
    RB: { id: 'rb1', name: 'RB', position: 'RB', team: 'KC', year: 2022,
      stats: { rushYPG: 80, recYPG: 18.0, tdPerGame: 0.4, rushAttPerGame: 14.0 } },
    K: { id: 'k1', name: 'K', position: 'K', team: 'KC', year: 2022,
      stats: { fgAccuracy: 0.9, avgKickDistance: 38.0, avgMissDistance: 47.0, longestMadeKick: 55 } },
    OLine: { id: 'ol1', position: 'OLine', team: 'KC', year: 2022,
      stats: { sacksAllowedPerGame: 2, rushYPC: 4.5, rushTDPct: 0.05, normalizedRank: 8 } },
    DLine: { id: 'dl1', position: 'DLine', team: 'KC', year: 2022,
      stats: { rushYPCAllowed: 4.0, rushYPGAllowed: 105.0, sackPct: 0.07, rushTDPerGameAllowed: 0.5, blitzPct: 0.25, pressurePct: 0.22, normalizedRank: 10 } },
    Secondary: { id: 'sec1', position: 'Secondary', team: 'KC', year: 2022,
      stats: { completionPctAllowed: 0.63, yardsPerAttemptAllowed: 6.8, passYPGAllowed: 220.0, passTDPerGameAllowed: 1.4, interceptionsPerGame: 0.9, normalizedRank: 11 } },
  }
  return { mockRoster }
})

vi.mock('../logic/rosterGen', () => ({
  generateRandomRoster: vi.fn().mockResolvedValue(mockRoster),
  generateRandomSlot: vi.fn().mockResolvedValue(mockRoster.QB),
}))

vi.mock('../logic/draftGen', () => ({
  generateDraftOffer: vi.fn().mockResolvedValue({
    team: 'NE', year: 2019, players: [mockRoster.QB!], units: [mockRoster.OLine!],
  }),
  rerollDraftOfferTeam: vi.fn().mockResolvedValue({
    team: 'NE', year: 2022, players: [mockRoster.QB!], units: [mockRoster.OLine!],
  }),
  rerollDraftOfferYear: vi.fn().mockResolvedValue({
    team: 'KC', year: 2019, players: [mockRoster.QB!], units: [mockRoster.OLine!],
  }),
  generateOpponent: vi.fn().mockResolvedValue({
    stats: {
      team: 'NE', year: 2019, offenseRank: 12, defenseRank: 1,
      qbAvgYPG: 240, rbAvgYPG: 94, wrAvgYPG: 118, defPointsAllowed: 13.8,
    },
    roster: mockRoster,
  }),
}))

vi.mock('../logic/weatherGen', () => ({
  generateWeather: vi.fn().mockReturnValue('Clear'),
}))

vi.mock('../logic/gameSimulator', () => ({
  simulateGame: vi.fn().mockReturnValue({
    userTeamLabel: 'Your Team',
    opponentTeamLabel: "NE '19",
    drives: [],
    userScore: 21,
    opponentScore: 14,
    winner: 'user' as const,
  }),
}))

const mockOpponent = {
  team: 'NE', year: 2019, offenseRank: 12, defenseRank: 1,
  qbAvgYPG: 240, rbAvgYPG: 94, wrAvgYPG: 118, defPointsAllowed: 13.8,
}

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

describe('rerollDraftOfferTeam', () => {
  it('replaces the draft offer and marks reroll as used', async () => {
    const initialOffer = { team: 'KC', year: 2022, players: [], units: [] }
    useGameStore.setState({ ...INITIAL_STATE, currentDraftOffer: initialOffer, draftRerollAvailable: true })
    await act(async () => { await useGameStore.getState().rerollDraftOfferTeam() })
    const state = useGameStore.getState()
    expect(state.draftRerollAvailable).toBe(false)
    expect(state.currentDraftOffer?.team).toBe('NE')
  })

  it('does nothing if reroll already used', async () => {
    const offer = { team: 'KC', year: 2022, players: [], units: [] }
    useGameStore.setState({ ...INITIAL_STATE, currentDraftOffer: offer, draftRerollAvailable: false })
    await act(async () => { await useGameStore.getState().rerollDraftOfferTeam() })
    expect(useGameStore.getState().currentDraftOffer?.team).toBe('KC')
  })
})

describe('rerollDraftOfferYear', () => {
  it('replaces the draft offer and marks reroll as used', async () => {
    const initialOffer = { team: 'KC', year: 2022, players: [], units: [] }
    useGameStore.setState({ ...INITIAL_STATE, currentDraftOffer: initialOffer, draftRerollAvailable: true })
    await act(async () => { await useGameStore.getState().rerollDraftOfferYear() })
    const state = useGameStore.getState()
    expect(state.draftRerollAvailable).toBe(false)
    expect(state.currentDraftOffer?.year).toBe(2019)
  })

  it('does nothing if reroll already used', async () => {
    const offer = { team: 'KC', year: 2022, players: [], units: [] }
    useGameStore.setState({ ...INITIAL_STATE, currentDraftOffer: offer, draftRerollAvailable: false })
    await act(async () => { await useGameStore.getState().rerollDraftOfferYear() })
    expect(useGameStore.getState().currentDraftOffer?.team).toBe('KC')
  })
})

describe('draftPlayer', () => {
  it('places the player into the target slot and sets draftComplete', () => {
    const offer = { team: 'NE', year: 2019, players: [mockRoster.QB!], units: [] }
    useGameStore.setState({
      ...INITIAL_STATE, phase: 'draft-offer', roster: mockRoster,
      currentDraftOffer: offer, currentOpponent: mockOpponent, currentWeather: 'Clear',
    })
    useGameStore.getState().draftPlayer('qb1', 'QB')
    const state = useGameStore.getState()
    expect(state.roster.QB?.id).toBe('qb1')
    expect(state.draftComplete).toBe(true)
    expect(state.pendingDraftedId).toBe('qb1')
    expect(state.phase).toBe('round-hub')
  })

  it('does not advance the round', () => {
    const offer = { team: 'NE', year: 2019, players: [mockRoster.QB!], units: [] }
    useGameStore.setState({
      ...INITIAL_STATE, phase: 'draft-offer', roster: mockRoster,
      currentDraftOffer: offer, currentOpponent: mockOpponent, currentWeather: 'Clear',
    })
    useGameStore.getState().draftPlayer('qb1', 'QB')
    expect(useGameStore.getState().round).toBe(1)
  })
})

describe('skipDraft', () => {
  it('sets draftComplete and returns to round-hub without advancing round', () => {
    useGameStore.setState({
      ...INITIAL_STATE, phase: 'draft-offer', roster: mockRoster,
      currentOpponent: mockOpponent, currentWeather: 'Rain',
      currentDraftOffer: { team: 'NE', year: 2019, players: [], units: [] },
    })
    useGameStore.getState().skipDraft()
    const state = useGameStore.getState()
    expect(state.draftComplete).toBe(true)
    expect(state.pendingDraftedId).toBeNull()
    expect(state.phase).toBe('round-hub')
    expect(state.round).toBe(1)
  })
})

describe('simulateGame', () => {
  it('sets simulationResult from the simulator module', () => {
    useGameStore.setState({
      ...INITIAL_STATE, phase: 'round-hub', roster: mockRoster,
      currentOpponentRoster: mockRoster, currentOpponent: mockOpponent, currentWeather: 'Clear',
    })
    useGameStore.getState().simulateGame()
    const state = useGameStore.getState()
    expect(state.simulationResult).not.toBeNull()
    expect(state.simulationResult?.userTeamLabel).toBe('Your Team')
    expect(state.simulationResult?.opponentTeamLabel).toBe("NE '19")
  })

  it('does nothing if opponent roster is missing', () => {
    useGameStore.setState({ ...INITIAL_STATE, phase: 'round-hub', roster: mockRoster })
    useGameStore.getState().simulateGame()
    expect(useGameStore.getState().simulationResult).toBeNull()
  })
})

describe('advanceRound', () => {
  it('increments round and resets draftComplete, simulationResult, pendingDraftedId', async () => {
    useGameStore.setState({
      ...INITIAL_STATE, phase: 'round-hub', roster: mockRoster,
      currentOpponent: mockOpponent, currentWeather: 'Clear',
      draftComplete: true,
      simulationResult: { userTeamLabel: 'Your Team', opponentTeamLabel: "NE '19", drives: [], userScore: 21, opponentScore: 14, winner: 'user' as const },
    })
    await act(async () => { await useGameStore.getState().advanceRound() })
    const state = useGameStore.getState()
    expect(state.round).toBe(2)
    expect(state.draftComplete).toBe(false)
    expect(state.simulationResult).toBeNull()
    expect(state.pendingDraftedId).toBeNull()
    expect(state.phase).toBe('round-hub')
  })

  it('logs a round record using pendingDraftedId', async () => {
    useGameStore.setState({
      ...INITIAL_STATE, phase: 'round-hub', roster: mockRoster,
      currentOpponent: mockOpponent, currentWeather: 'Clear', pendingDraftedId: 'qb1',
    })
    await act(async () => { await useGameStore.getState().advanceRound() })
    const { seasonLog } = useGameStore.getState()
    expect(seasonLog).toHaveLength(1)
    expect(seasonLog[0].draftedId).toBe('qb1')
    expect(seasonLog[0].round).toBe(1)
    expect(seasonLog[0].opponentTeam).toBe('NE')
  })

  it('logs a null draftedId when no draft was made', async () => {
    useGameStore.setState({
      ...INITIAL_STATE, phase: 'round-hub', roster: mockRoster,
      currentOpponent: mockOpponent, currentWeather: 'Clear',
    })
    await act(async () => { await useGameStore.getState().advanceRound() })
    expect(useGameStore.getState().seasonLog[0].draftedId).toBeNull()
  })

  it('resets draftRerollAvailable to true', async () => {
    useGameStore.setState({
      ...INITIAL_STATE, phase: 'round-hub', roster: mockRoster,
      currentOpponent: mockOpponent, currentWeather: 'Clear', draftRerollAvailable: false,
    })
    await act(async () => { await useGameStore.getState().advanceRound() })
    expect(useGameStore.getState().draftRerollAvailable).toBe(true)
  })

  it('transitions to complete phase on round 17', async () => {
    useGameStore.setState({
      ...INITIAL_STATE, round: 17, phase: 'round-hub', roster: mockRoster,
      currentOpponent: mockOpponent, currentWeather: 'Clear',
    })
    await act(async () => { await useGameStore.getState().advanceRound() })
    expect(useGameStore.getState().phase).toBe('complete')
  })
})
```

- [ ] **Step 2: Run tests to confirm failures match expected changes**

Run: `npx vitest run src/store/gameStore.test.ts`
Expected: Multiple failures — new state fields missing, `draftPlayer` still auto-advances, `advanceRound` not defined

- [ ] **Step 3: Rewrite `src/store/gameStore.ts`**

Replace the entire file with:

```typescript
import { create } from 'zustand'
import { generateRandomRoster, generateRandomSlot } from '../logic/rosterGen'
import {
  generateDraftOffer, generateOpponent,
  rerollDraftOfferTeam as genOfferNewTeam, rerollDraftOfferYear as genOfferNewYear,
} from '../logic/draftGen'
import { generateWeather } from '../logic/weatherGen'
import { simulateGame as runSimulation } from '../logic/gameSimulator'
import type {
  GamePhase, Roster, RosterPosition, Player, TeamUnit,
  DraftOffer, TeamStats, WeatherCondition, RoundRecord, SimulationResult,
} from '../types'

interface GameStore {
  phase: GamePhase
  round: number
  roster: Roster
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
}

const EMPTY_ROSTER: Roster = {
  QB: null, WR1: null, WR2: null, RB: null,
  K: null, OLine: null, DLine: null, Secondary: null,
}

async function buildNextRoundData() {
  const [{ stats: opponent, roster: opponentRoster }, draftOffer] = await Promise.all([generateOpponent(), generateDraftOffer()])
  const weather = generateWeather()
  return { opponent, opponentRoster, draftOffer, weather }
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'setup',
  round: 1,
  roster: EMPTY_ROSTER,
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
    const { opponent, opponentRoster, draftOffer, weather } = await buildNextRoundData()
    set({
      phase: 'round-hub',
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
    const { round, seasonLog, currentOpponent, currentWeather, pendingDraftedId } = get()
    if (!currentOpponent || !currentWeather) return

    const record: RoundRecord = {
      round,
      opponentTeam: currentOpponent.team,
      opponentYear: currentOpponent.year,
      draftedId: pendingDraftedId,
      weather: currentWeather,
    }
    const newLog = [...seasonLog, record]

    if (round >= 17) {
      set({
        seasonLog: newLog, phase: 'complete',
        simulationResult: null, draftComplete: false, pendingDraftedId: null,
      })
      return
    }

    set({ isLoading: true })
    const { opponent, opponentRoster, draftOffer, weather } = await buildNextRoundData()
    set({
      seasonLog: newLog,
      round: round + 1,
      currentOpponent: opponent,
      currentOpponentRoster: opponentRoster,
      currentWeather: weather,
      currentDraftOffer: draftOffer,
      draftRerollAvailable: true,
      draftComplete: false,
      simulationResult: null,
      pendingDraftedId: null,
      isLoading: false,
    })
  },
}))
```

- [ ] **Step 4: Run all store tests**

Run: `npx vitest run src/store/gameStore.test.ts`
Expected: All tests pass

- [ ] **Step 5: Run full test suite to catch regressions**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/store/gameStore.ts src/store/gameStore.test.ts
git commit -m "feat: add simulateGame and advanceRound actions; draft actions no longer advance round"
```

---

### Task 4: Build SimulationModal

**Files:**
- Create: `src/components/round/SimulationModal.tsx`

- [ ] **Step 1: Create `src/components/round/SimulationModal.tsx`**

```typescript
import { useGameStore } from '../../store/gameStore'
import { Button } from '../ui/Button'
import type { DriveOutcome, DriveResult } from '../../types'

const OUTCOME_LABELS: Record<DriveOutcome, string> = {
  TD: 'Touchdown',
  FG: 'Field Goal',
  Punt: 'Punt',
  Turnover: 'Turnover',
  DefTD: 'Def. Touchdown',
  Safety: 'Safety',
}

const OUTCOME_COLORS: Record<DriveOutcome, string> = {
  TD: 'text-green-400',
  FG: 'text-blue-400',
  Punt: 'text-gray-500',
  Turnover: 'text-red-400',
  DefTD: 'text-orange-400',
  Safety: 'text-yellow-400',
}

interface DriveRowProps {
  drive: DriveResult
  userScore: number
  oppScore: number
}

function DriveRow({ drive, userScore, oppScore }: DriveRowProps) {
  return (
    <div className="grid grid-cols-[2.5rem_1fr_1fr_auto] gap-x-3 items-center py-2 border-b border-gray-800 text-sm">
      <span className="text-gray-600 text-xs font-mono">Q{drive.quarter}</span>
      <span className={drive.possession === 'user' ? 'text-indigo-400' : 'text-gray-400'}>
        {drive.possession === 'user' ? 'Your offense' : 'Opp. offense'}
      </span>
      <span className={OUTCOME_COLORS[drive.outcome]}>{OUTCOME_LABELS[drive.outcome]}</span>
      <span className="text-right text-gray-400 text-xs tabular-nums whitespace-nowrap">
        {userScore}–{oppScore}
      </span>
    </div>
  )
}

export function SimulationModal() {
  const { simulationResult, advanceRound, isLoading } = useGameStore()
  if (!simulationResult) return null

  const { userTeamLabel, opponentTeamLabel, drives, userScore, opponentScore, winner } = simulationResult

  let runningUser = 0
  let runningOpp = 0
  const rows = drives.map((drive, i) => {
    if (drive.scoringTeam === 'user') runningUser += drive.points
    else if (drive.scoringTeam === 'opponent') runningOpp += drive.points
    return { drive, runningUser, runningOpp, key: i }
  })

  const winnerText = winner === 'user' ? 'YOU WIN' : winner === 'opponent' ? 'YOU LOSE' : 'TIE GAME'
  const winnerColor = winner === 'user' ? 'text-green-400' : winner === 'opponent' ? 'text-red-400' : 'text-yellow-400'

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-950 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl">
        <div className="p-6 border-b border-gray-800">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Game Result</p>
          <div className="flex items-center justify-between mb-3">
            <span className="text-white font-bold text-sm">{userTeamLabel}</span>
            <span className="text-3xl font-bold text-white tabular-nums">
              {userScore} <span className="text-gray-600">—</span> {opponentScore}
            </span>
            <span className="text-gray-400 font-bold text-sm">{opponentTeamLabel}</span>
          </div>
          <p className={`text-center text-lg font-bold tracking-widest ${winnerColor}`}>{winnerText}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Drive Log</p>
          {rows.map(({ drive, runningUser, runningOpp, key }) => (
            <DriveRow key={key} drive={drive} userScore={runningUser} oppScore={runningOpp} />
          ))}
        </div>

        <div className="p-4 border-t border-gray-800 flex justify-end">
          <Button onClick={advanceRound} disabled={isLoading}>
            {isLoading ? 'Loading…' : 'Continue →'}
          </Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/round/SimulationModal.tsx
git commit -m "feat: add SimulationModal drive log overlay"
```

---

### Task 5: Update RoundHub

**Files:**
- Modify: `src/components/round/RoundHub.tsx`

- [ ] **Step 1: Replace `src/components/round/RoundHub.tsx`**

```typescript
import { useGameStore } from '../../store/gameStore'
import { OpponentPreview } from './OpponentPreview'
import { WeatherBadge } from './WeatherBadge'
import { TeamStatsSummary } from './TeamStatsSummary'
import { PositionMatchups } from './PositionMatchups'
import { SimulationModal } from './SimulationModal'
import { Button } from '../ui/Button'

export function RoundHub() {
  const {
    round, roster, currentOpponent, currentOpponentRoster, currentWeather,
    viewDraftOffer, simulateGame, draftComplete, isLoading,
  } = useGameStore()

  if (!currentOpponent || !currentOpponentRoster || !currentWeather) return null

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">NFL Season</p>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Week {round} <span className="text-gray-400 dark:text-gray-500 text-xl font-normal">of 17</span>
          </h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={viewDraftOffer} disabled={isLoading || draftComplete} variant="secondary">
            View Draft Offer →
          </Button>
          <Button onClick={simulateGame} disabled={isLoading}>
            Simulate Game
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <OpponentPreview opponent={currentOpponent} />
        <div className="flex flex-col gap-4">
          <WeatherBadge condition={currentWeather} />
          <TeamStatsSummary roster={roster} />
        </div>
      </div>
      <div className="mt-4">
        <PositionMatchups
          opponentTeam={currentOpponent.team}
          opponentRoster={currentOpponentRoster}
          userRoster={roster}
        />
      </div>
      <SimulationModal />
    </div>
  )
}
```

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/components/round/RoundHub.tsx
git commit -m "feat: add Simulate Game button and SimulationModal to RoundHub"
```
