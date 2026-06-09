# Simulate Game Feature — Design Spec
**Date:** 2026-06-08

---

## Overview

Add a "SIMULATE GAME" button to the Round Hub screen. Clicking it runs a drive-by-drive simulation using both teams' player ratings, produces a winner and final score, and shows a modal with the full drive log. Pressing "Continue" in the modal advances the round. The Draft Offer and Simulate Game flows are independent — the player may do either or both in any order before continuing.

---

## 1. Rating Mapping

All inputs to the simulation are pulled from the pre-computed `rating` field (0–100 scale) already present on every `Player` and `TeamUnit` in the data. No new stat derivation is needed.

| Formula Input | Source |
|---|---|
| `UserPassRating` | `roster.QB?.rating ?? 50` |
| `UserRushRating` | `roster.RB?.rating ?? 50` |
| `UserOLineRating` | `roster.OLine?.rating ?? 50` |
| `OppDLineRating` | `opponentRoster.DLine?.rating ?? 50` |
| `OppSecondaryRating` | `opponentRoster.Secondary?.rating ?? 50` |
| `UserKickerRating` | `roster.K?.rating ?? 50` |
| `QB_INT_risk` | `(roster.QB?.stats as QBStats).avgINTPerGame * 10` |

All buff bonuses (`offense_buff_bonus`, `kicker_buff_bonus`, `opponent_defense_bonus`, `turnover_buff_bonus`, `pick_six_buff_bonus`, `chaos_bonus`) are `0` for now — placeholders for future weather/award effects.

Temperature is fixed at `20`.

---

## 2. Drive Simulation Formulas

For each drive, compute six raw scores, run softmax, then sample the outcome.

### Advantage Computations (offense perspective)
```
PassAdv         = UserPassRating - OppSecondaryRating
RushAdv         = UserRushRating - OppDLineRating
ProtectionAdv   = UserOLineRating - OppDLineRating
```

### Raw Outcome Scores
```
TD_score        = 0.45*PassAdv + 0.30*RushAdv + 0.15*ProtectionAdv + random_noise
FG_score        = 0.20*PassAdv + 0.20*RushAdv + 0.10*ProtectionAdv + 0.25*KickerRating + random_noise
Punt_score      = -0.35*PassAdv - 0.35*RushAdv - 0.10*ProtectionAdv + random_noise
Turnover_score  = 0.30*OppSecondaryRating + 0.25*OppDLineRating + QB_INT_risk - 0.25*ProtectionAdv + random_noise
DefTD_score     = Turnover_score * 0.25 + random_noise
Safety_score    = 0.10*OppDLineRating - 0.10*ProtectionAdv + tiny_random_noise
```

`random_noise` = `Math.random() * 6 - 3` (±3)
`tiny_random_noise` = `Math.random() * 2 - 1` (±1)

### Softmax
```
probability(outcome) = exp(score / 20) / sum(exp(all_scores / 20))
```
Sample outcome by rolling a random number against the cumulative probability distribution.

### Point Values (NFL rules)
| Outcome | Points | Scored By |
|---|---|---|
| TD | 7 | Offense |
| FG | 3 | Offense |
| Punt | 0 | — |
| Turnover | 0 | — |
| DefTD | 7 | Defense |
| Safety | 2 | Defense |

---

## 3. Simulation Engine (`src/logic/gameSimulator.ts`)

Pure module — no React dependencies, fully unit-testable.

```typescript
export function computeTeamRatings(roster: Roster): TeamRatings
export function simulateDrive(offense: TeamRatings, defense: TeamRatings): DriveResult
export function simulateGame(userRoster: Roster, opponentRoster: Roster, opponentLabel: string): SimulationResult
```

**Drive sequence:** 24 total drives (12 per team), 3 per quarter, alternating by possession:
- Q1: U, O, U, O, U, O
- Q2: U, O, U, O, U, O
- Q3: U, O, U, O, U, O
- Q4: U, O, U, O, U, O

When user is on offense, the drive outcome uses user's offense ratings vs opponent's defense ratings. DefTD and Safety score points for the *opponent*. When opponent is on offense, roles flip.

---

## 4. New Types (`src/types/index.ts`)

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

---

## 5. Store Changes (`src/store/gameStore.ts`)

### New State Fields
```typescript
draftComplete: boolean          // true after pick or skip this round; resets on advanceRound
simulationResult: SimulationResult | null
```

### Modified Actions
- **`draftPlayer()`** — updates roster, logs `RoundRecord`, sets `draftComplete: true`. Does NOT advance the round.
- **`skipDraft()`** — logs `RoundRecord`, sets `draftComplete: true`. Does NOT advance the round.

### New Actions
- **`simulateGame()`** — synchronous; calls `gameSimulator.simulateGame()` with current rosters, sets `simulationResult`.
- **`advanceRound()`** — clears `simulationResult`, resets `draftComplete: false` and `draftRerollAvailable: true`, increments `round`, loads next opponent/offer/weather. Handles `round >= 17` → `phase: 'complete'`.

---

## 6. UI Changes

### `RoundHub.tsx`
- Header row: "View Draft Offer" button + new "Simulate Game" button side by side
- "View Draft Offer" disabled when `draftComplete === true`
- "Simulate Game" always enabled (no dependency on draft state)
- When `simulationResult` is non-null, render `<SimulationModal />`

### New `SimulationModal.tsx` (`src/components/round/`)
```
┌─────────────────────────────────────────────────────┐
│  GAME RESULT                                        │
│  Your Team  24  —  17  KC '22                       │
│  YOU WIN                                            │
├─────────────────────────────────────────────────────┤
│  Drive Log                           (scrollable)   │
│  Q1  Your offense   TD       +7      7–0            │
│  Q1  KC offense     FG       +3      7–3            │
│  Q1  Your offense   Punt      —      7–3            │
│  Q1  KC offense     Turnover  —      7–3            │
│  ...                                                │
├─────────────────────────────────────────────────────┤
│                              [ Continue → ]         │
└─────────────────────────────────────────────────────┘
```

- Each drive row: quarter label, possession label, outcome, points delta, running score
- Drive rows are discrete items — structured for future staggered animation
- "Continue →" calls `advanceRound()`, which resets `simulationResult` to null (closing the modal)

---

## 7. Out of Scope
- Weather/award buff bonuses (wired as 0; ready to fill in)
- Drive animation (row structure supports it; not implemented now)
- Overtime
- Penalties
