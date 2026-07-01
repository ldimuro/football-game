# Interactive Game Simulation Design

**Date:** 2026-06-30

---

## Overview

Replace the current auto-simulation with a fully interactive, step-by-step game. The user plays through 16 drives across 4 quarters, making play calls and advancing through individual dice rolls with a Step button. The existing `SimulationModal` results summary is preserved and populated with actual drive outcomes at game end.

---

## 1. Game Structure

**16 drives total:** 4 quarters × 4 drives per quarter, alternating possession: User → Opp → User → Opp each quarter. Each drive starts with the progress bar at 20 and runs for up to 4 downs.

**Drive outcomes (checked after each down):**
- Progress ≥ 100 at any point → **TD** (7 pts), drive ends immediately
- After 4th down, progress ≥ 65 → **FG attempt** (kicker rolls vs. difficulty)
- After 4th down, progress < 65 → **Punt** (0 pts)

---

## 2. Drive Mechanics

### Players per play type

| Play | Offense rolls | Defense rolls |
|---|---|---|
| Run | RB, OLine | DLine |
| Pass | QB, OLine, selected WR | DLine, Secondary |

On the user's drive, user's offensive players roll first (one Step per player), then opponent's defensive players. On the opponent's drive, opponent's offensive players roll first, then user's defensive players.

### Yards gained formula

```
raw = sum(offense rolls) - sum(defense rolls)
yardsGained = raw + advantageBonus
driveProgress = clamp(driveProgress + yardsGained, 0, 100)
```

Each die roll picks one face at random from the player's `die: number[]` array.

### Advantage matrix

| Off call | Def call | Bonus |
|---|---|---|
| Run | Run Stop | −5 |
| Run | Pass Stop | +5 |
| Pass | Run Stop | +5 |
| Pass | Pass Stop | −5 |

### FG attempt

```
difficulty = Math.max(1, 80 - driveProgress)
kicker rolls one random face from their die
roll >= difficulty → FG made (3 pts)
roll < difficulty → FG missed (0 pts)
```

### Opponent AI

On offense: opponent play call (Run/Pass) picked randomly at the start of each opponent drive.
On defense: opponent defensive call (Run Stop/Pass Stop) picked randomly when the user confirms their play call.

---

## 3. Step Button & Phase Transitions

The Step button advances through rolling and result phases. Choice phases (play call selection, WR selection) require the user to click a choice button — the Step button is hidden during these.

### User on offense

```
choose-offense
  → [user clicks Run]     → rolling-offense (RB, OLine)
  → [user clicks Pass]    → choose-wr
      → [user picks WR]   → rolling-offense (QB, OLine, WR)
rolling-offense
  → [Step] reveal one offense roll → repeat until all offense players rolled
  → rolling-defense (DLine, or DLine+Secondary)
rolling-defense
  → [Step] reveal one defense roll → repeat until all defense players rolled
  → show-play-result
show-play-result
  → [Step] compute yards, update driveProgress, increment down
  → if TD or 4th down done: drive-end / fg-roll / punt
  → else: choose-offense (next down)
fg-roll
  → [Step] kicker rolls → fg-result
fg-result
  → [Step] record drive result (FG made → 'FG' outcome, FG missed → 'Punt' outcome), advance to next drive
```

### User on defense

```
choose-defense (opponent play call already shown)
  → [user clicks Run Stop / Pass Stop] → rolling-offense (opponent's offensive players)
rolling-offense, rolling-defense, show-play-result
  → same as above, but offense = opponent's players, defense = user's players
```

---

## 4. Drive Progress Bar

Horizontal bar, values 0–100, starts at 20 each drive. Three fixed markers:

| Position | Label |
|---|---|
| 65 | FG Range |
| 80 | Redzone |
| 100 | TD |

Progress is clamped to [0, 100]. The filled portion reflects current `driveProgress`.

---

## 5. Component Architecture

All new components under `src/components/game/`:

### `GameScreen.tsx`
Top-level container. Owns all in-game state via `useReducer`. Renders HUD, play area, and Step button. On game end, constructs `SimulationResult` and calls `recordGameResult()`.

### `GameHUD.tsx`
Sticky header: Quarter label, Drive #, Down, score (`Your Team X — Y OppLabel`), and `DriveProgressBar`. Re-renders on every state change.

### `DriveProgressBar.tsx`
Renders the progress bar with FG Range / Redzone / TD markers. Ball indicator at current `driveProgress`.

### `PlayArea.tsx`
Two columns: user's side vs. opponent's side. Each participating player shown as a card with name, position, and die faces. Unrolled players show `?`; rolled players reveal their value. Below the columns: running roll totals and the advantage matchup label (once both sides have chosen).

---

## 6. Pure Game Logic (`src/logic/gameEngine.ts`)

New file, no React dependencies:

```typescript
rollDie(die: number[]): number
computeAdvantageBonus(offCall: 'run' | 'pass', defCall: 'run-stop' | 'pass-stop'): number
computeYardsGained(offRolls: number[], defRolls: number[], bonus: number): number
computeFGDifficulty(progress: number): number  // Math.max(1, 80 - progress)
getOffensePlayers(roster: Roster, play: 'run' | 'pass', wr: 'WR1' | 'WR2'): (Player | TeamUnit)[]
getDefensePlayers(roster: Roster, play: 'run' | 'pass'): (Player | TeamUnit)[]
buildDriveResult(possession, quarter, driveOutcome, scoringTeam, points): DriveResult
```

---

## 7. Store Changes

### `src/types/index.ts`
Add `'game'` to `GamePhase`:
```typescript
export type GamePhase = 'setup' | 'round-hub' | 'draft-offer' | 'game' | 'complete'
```

### `src/store/gameStore.ts`
- **Add** `startGame()` — synchronous, sets `phase: 'game'`. Called from `RoundHub` in place of the old `simulateGame()`.
- **Add** `recordGameResult(result: SimulationResult)` — sets `simulationResult` and `phase: 'round-hub'`. Called by `GameScreen` on game end.
- **Remove** `simulateGame()` action and its call to `gameSimulator.simulateGame()`.

### `src/App.tsx`
Add branch: `phase === 'game'` → render `<GameScreen />`.

---

## 8. Data Flow

1. User clicks "Simulate Game" in `RoundHub` → `startGame()` → `phase: 'game'`
2. `App.tsx` renders `<GameScreen />`
3. `GameScreen` initializes: quarter=1, driveIndex=0, driveProgress=20, scores=0–0
4. User steps through all 16 drives
5. Each completed drive appends a `DriveResult` to `driveHistory`
6. After drive 16, `GameScreen` builds `SimulationResult` and calls `recordGameResult(result)`
7. Store sets `simulationResult` + `phase: 'round-hub'`
8. `SimulationModal` appears (unchanged) showing actual drive log
9. User clicks "Continue →" → `advanceRound()` → clears result, loads next round

---

## 9. Out of Scope

- Weather/ability effects on rolls
- Turnovers during interactive play (they remain as auto-sim outcomes for now — the DriveOutcome type can stay but won't be produced by the new engine)
- Overtime
- Penalties
- Animated roll reveals (Step reveals value immediately)
