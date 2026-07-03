# Roster Stats Redesign

**Date:** 2026-07-02  
**Status:** Approved

## Overview

Two UI changes: replace the My Roster summary panel with Mean/Median/Mode stats + cap space + ability emojis, and replace the Week view team-comparison tabs with a single stat table showing the same stats plus each team's Turnover Number.

---

## Change 1 — My Roster (`RosterSummary.tsx`)

### What's replaced
The current panel showing Total Off. YPG, TDs/Game, Avg Off/Def Rank, O-Line, D-Line, Secondary, Avg Rank, All-Pros, Award Winners, Roster Filled, Cap Space.

### New layout (three sections)

**Section 1 — Rating stats table**

| | Mean | Median | Mode |
|---|---|---|---|
| OFF | 78.5 | 80 | — |
| DEF | 85.0 | 85 | — |
| All | 80.2 | 81 | 76 |

- **OFF** = QB, WR1, WR2, RB ratings
- **DEF** = DLine, Secondary ratings
- **All** = all 8 roster slots
- **Mean**: 1 decimal (e.g. `78.5`), null slots excluded
- **Median**: integer or half-integer; for even-length sets, average of the two middle values
- **Mode**: most frequently occurring rating; `—` if all values are distinct (common for small sets)
- Each value colored by existing tier: ≥85 → green, ≥70 → yellow, <70 → red; null → gray `—`

**Section 2 — Cap Space**

`42 / 200` colored by existing logic (red < 20, yellow < 50, green otherwise).

**Section 3 — Abilities**

A row of emoji icons — one per roster slot that has an `ability`. Emoji is the first token of the `ABILITY_DISPLAY[ability]` string (e.g. `'🌧️ Rain Man'` → `🌧️`). Each emoji has a `title` attribute with the full display name for tooltip. If no abilities on the roster, show `—`.

---

## Change 2 — Week View Team Comparison (`MatchupSummary.tsx`)

### What's replaced
The "Yards Per Game" and "Ratings" tab switcher and their respective tables.

### New layout

Single always-visible stat table using the existing `StatTable` component. Rows:

| Row | Better = |
|---|---|
| OFF Mean | higher |
| OFF Median | higher |
| OFF Mode | higher (or `—` if no mode) |
| *(separator)* | |
| DEF Mean | higher |
| DEF Median | higher |
| DEF Mode | higher |
| *(separator)* | |
| All Mean | higher |
| All Median | higher |
| All Mode | higher |
| *(separator)* | |
| Turnover # | no winner highlight (neutral attribute) |

- Same OFF/DEF/All groupings as Change 1
- Existing `StatTable` green-highlights the better side per row
- Turnover # row: `userBetter: false, oppBetter: false` — both values shown neutral

### Prop changes

`MatchupSummary` gains two new required props:
```ts
userTurnoverNumber: number
opponentTurnoverNumber: number
```

`RoundHub` reads these from `useGameStore()` (already present as of the Turnovers feature) and passes them through.

---

## Implementation Touchpoints

| File | Change |
|---|---|
| `src/logic/stats.ts` | Add `computeRatingStats(ratings: (number\|null)[]): { mean, median, mode }` helper |
| `src/components/roster/RosterSummary.tsx` | Full rewrite of panel contents |
| `src/components/round/MatchupSummary.tsx` | Remove tab state + both tab views; add new single stats view |
| `src/components/round/RoundHub.tsx` | Pass `userTurnoverNumber` and `opponentTurnoverNumber` as props to `MatchupSummary` |

No new files. No type changes. No test changes required (stats helper can be tested but not strictly necessary).
