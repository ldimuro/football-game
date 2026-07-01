# GameScreen Enhancements Design

**Date:** 2026-06-30

---

## Overview

Twelve targeted enhancements to the interactive game simulation — covering logic corrections, visual polish, information density, and UX improvements. All changes are confined to `gameEngine.ts` and the `src/components/game/` directory, with no new types or store changes required.

---

## 1. Logic Changes

### 1a. FG Difficulty Formula

Replace `computeFGDifficulty` in `src/logic/gameEngine.ts`:

```
// Before:
difficulty = Math.max(1, 80 - progress)

// After:
difficulty = Math.round(15 - ((progress - 65) / 34) * 14)
```

- At progress 65 → difficulty 15
- At progress 99 → difficulty 1
- Clamped to [1, 15] to handle rounding edge cases

The test in `gameEngine.test.ts` for this function is updated accordingly.

### 1b. Kick FG Option (User Offense Only)

When `driveProgress >= 65` during `choose-offense`, a third button "Kick FG" appears alongside Run and Pass. Clicking it:
1. Calls a new `handleKickFG()` handler in `GameScreen`
2. Dispatches a new `KICK_FG` action (sets `fgDifficulty`, transitions to `fg-roll`)
3. Skips the rolling phase entirely — the drive goes straight to the kicker

The opponent never gets a "Kick FG" choice — their FG on 4th down remains automatic. The `KICK_FG` action signature:
```typescript
| { type: 'KICK_FG'; fgDifficulty: number }
```

---

## 2. Drive Progress Bar + GameHUD

### 2a. DriveProgressBar Numerical Labels

`DriveProgressBar` adds:
- The current yard number displayed as a small label at the ball position (e.g., `"Yd 34"`)
- Yard numbers below each marker label: `"FG 65"`, `"RZ 80"`, `"TD 100"`

### 2b. Pending Progress Display

`DriveProgressBar` accepts an optional `pendingProgress?: number` prop. When provided, the filled bar animates to `pendingProgress` instead of `progress`. `GameHUD` receives a matching `pendingYards?: number | null` prop — when non-null (i.e., during `show-play-result`), it passes `Math.min(100, Math.max(0, driveProgress + pendingYards))` as `pendingProgress`.

`GameScreen` passes `state.yardsGained` as `pendingYards` to `GameHUD`. This means the bar visually advances to the new position in the same step the differential is shown, before the user presses Step to resolve the play.

The existing `transition-all duration-300` on the fill div handles the visual animation automatically.

### 2c. GameHUD Visual Overhaul

`GameHUD` becomes a centered scoreboard header:
- Score displayed large and centered at the top
- Quarter, Drive, Down, and Possession shown as prominent labeled chips below the score
- Possession indicator uses colored text (indigo = your ball, amber = their ball) rather than plain gray

---

## 3. Player Cards In-Game

### 3a. PlayerRollCard Roster-Style Upgrade

`PlayerRollCard` in `PlayArea.tsx` is restyled to match `PlayerCard` from the Roster view:
- Team-colored left border (using `getTeamColor`)
- Position label in indigo (`QB`, `WR1`, etc.)
- Name + team badge + year badge (using `Badge`)
- Die faces grid (`DieFaces`)
- Ability string below die faces (always visible, no tab switch)
- Large roll number (or `?`) as the focal point below the ability

For `TeamUnit` slots, the position label is the unit type (`O-Line`, `D-Line`, `Secondary`).

### 3b. Roll Animation

When a `PlayerRollCard`'s `roll` prop transitions from `null` to a number, it plays a brief animation:
- Duration: ~600ms
- Effect: rapidly cycles through random numbers (updates every ~60ms) then settles on the actual value
- Implemented with `useEffect` + `useState` inside `PlayerRollCard` — no reducer changes
- Animation is non-blocking; the Step button for the next player is immediately available

### 3c. Kicker Card During FG

During `fg-roll` and `fg-result` phases, the kicker is displayed as a full `PlayerRollCard` (same upgraded style) above the difficulty readout. `PlayArea` receives a new `kicker: Player | TeamUnit | null` prop that `GameScreen` populates from the possessing team's `K` slot. The kicker's roll animation fires when `fgRoll` transitions from `null` to a value.

---

## 4. Phase-Level UI Changes

### 4a. Hide Opponent Call Until User Decides

`choose-defense` removes the opponent play call reveal. The line:
```
Opponent plays: RUN
```
is deleted from the defense choice panel. The opponent's call is revealed naturally in `PlayArea`'s matchup badge once rolling begins — at that point the user has already committed their defensive call.

### 4b. WR Selection With Full Cards

`choose-wr` replaces the two plain text buttons with two side-by-side `PlayerRollCard`s (roster style, no roll number shown). Clicking a card triggers `handleWRChoice`. If either WR slot is null, it shows a disabled card with `"Empty Slot"`.

### 4c. Advantage Breakdown in Show-Play-Result

`PlayArea` replaces the bare "Yards Gained" display in `show-play-result` with a structured breakdown block:

```
Offense: 15    Defense: 10
Pass Coverage  →  -5
──────────────────────────
Net: 0 yards
```

Four advantage labels (keyed by `offCall + defCall`):
| Matchup | Label | Bonus |
|---|---|---|
| Run vs Run Stop | Run Stuffed | -5 |
| Run vs Pass Stop | Open Field | +5 |
| Pass vs Pass Stop | Pass Coverage | -5 |
| Pass vs Run Stop | Missed Coverage | +5 |

Bonus displayed as `-5` (red) or `+5` (green) inline with the label. The net yards line uses green for positive, red for negative.

`PlayArea` already receives `offRolls` and `defRolls`, so it computes `offTotal` and `defTotal` internally — no new props required.

---

## 5. File Summary

| File | Change |
|---|---|
| `src/logic/gameEngine.ts` | Update `computeFGDifficulty`; add test for new formula |
| `src/logic/gameEngine.test.ts` | Update FG difficulty test cases |
| `src/components/game/GameScreen.tsx` | Add `KICK_FG` action + reducer case; add `handleKickFG`; pass `pendingYards`, `kicker`, `offTotal`, `defTotal` to children; hide opp call in choose-defense; redesign choose-wr |
| `src/components/game/GameHUD.tsx` | Centered scoreboard layout; accept `pendingYards` prop |
| `src/components/game/DriveProgressBar.tsx` | Numerical labels; current yard indicator; `pendingProgress` prop |
| `src/components/game/PlayArea.tsx` | `PlayerRollCard` roster upgrade + animation; kicker card; advantage breakdown; receive `kicker` prop; compute totals from existing `offRolls`/`defRolls` |

---

## 6. Out of Scope

- Opponent choosing to "Kick FG" on non-4th downs (opponent remains automatic)
- Ability gameplay effects (still display-only)
- Overtime or penalty logic
- Any change to `SimulationModal`, `gameStore`, or non-game-screen components
