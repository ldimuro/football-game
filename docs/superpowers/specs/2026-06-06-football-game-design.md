# Football Stat-Based Game — Design Spec
**Date:** 2026-06-06

---

## Overview

A single-session, browser-based football game where the player builds a mixed-era NFL roster over 17 rounds (one per NFL game week). Each round the player drafts one player from a randomly generated team/year combo, views their opponent preview and weather, then (eventually) simulates the game. This spec covers everything up to and including the simulation input phase — the simulation engine itself is TBD.

---

## 1. Data Pipeline

### Source
Pre-scraped NFL stats from nflreadr (free R/Python package) or Pro Football Reference, covering seasons 2000–2026. A one-time Python preprocessing script converts raw CSVs into game-ready JSON at build time. The script lives in `/scripts` and is not bundled with the app.

### Output Structure
```
/public/data
  /players
    /{YEAR}/{TEAM_CODE}.json   ← full roster + per-game stats for that team/year
  /teams
    /{YEAR}/{TEAM_CODE}.json   ← team-level stats for opponent preview
  meta.json                    ← index of all valid team/year combos
```

### Player Entry Shape
```json
{
  "id": "p_mahomes_2022",
  "name": "Patrick Mahomes",
  "position": "QB",
  "team": "KC",
  "year": 2022,
  "stats": {
    "passYPG": 317.4,
    "tdRatio": 0.067,
    "intRatio": 0.011,
    "qbr": 74.2
  },
  "eraNormalized": {
    "passYPG": 1.08
  }
}
```

### Team-Level Entry Shape (Opponent Preview)
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

### Era Normalization
Each per-game stat includes an era-adjustment multiplier so mixed-era roster comparisons are meaningful (e.g., passing yards in 2004 vs 2022 reflect different league-wide environments).

### Positions Tracked
| Type | Positions |
|------|-----------|
| Individual players | QB, WR1, WR2, RB, K |
| Team units | O-Line, D-Line, Secondary |

**O-Line stats:** sacks allowed/game, rush YPC, rush TD%, normalized year rank  
**D-Line stats:** sacks/game, rush YPC allowed, rush TD%  
**Secondary stats:** completion % allowed, yards/attempt allowed, TD% allowed, INT%

---

## 2. Game State & Flow

### State Shape (Zustand store)
```typescript
interface GameState {
  phase: 'setup' | 'round-hub' | 'draft-offer' | 'complete'
  round: number          // 1–17
  roster: Roster         // 8 position slots
  setupRerollsRemaining: number   // 3, consumed during initial setup only
  draftRerollAvailable: boolean   // resets to true each round
  currentOpponent: TeamStats | null
  currentWeather: WeatherCondition | null
  currentDraftOffer: DraftOffer | null
  seasonLog: RoundRecord[]
}

interface Roster {
  QB: Player | null
  WR1: Player | null
  WR2: Player | null
  RB: Player | null
  OLine: TeamUnit | null
  DLine: TeamUnit | null
  Secondary: TeamUnit | null
  K: Player | null
}
```

### Initial Setup Phase
1. App draws a random player for each of the 8 roster slots from random team/year combos.
2. Player sees their starting roster with key stats per position.
3. Player may spend up to **3 re-rolls**: each re-roll replaces one player/unit with a new random draw at the same position.
4. "Start Season" button becomes available once the player is satisfied (or re-rolls are exhausted).

### Per-Round Flow
```
Round N begins
  ├── Opponent preview generated (random team/year with team-level stats)
  ├── Weather condition generated
  ├── Round Hub displayed
  │     ├── Opponent preview panel
  │     ├── Weather badge
  │     └── Current roster aggregate stats
  │
  └── "View Draft Offer" →
        ├── Random team/year drawn
        ├── Their roster displayed, grouped by position
        ├── Player selects any one player/unit from the full roster to add to their team
        │     └── If WR: player chooses WR1 or WR2 slot
        ├── One re-roll available (swap current offer for a new random team/year)
        ├── "Skip" option (decline without penalty)
        └── Round complete → advance to Round N+1 (or season complete if N=17)
```

### Re-Roll Budget
- **Setup phase:** 3 re-rolls total, per-player granularity (re-roll one slot at a time)
- **Each round's draft offer:** 1 re-roll (re-rolls the entire team/year offer; resets each round)

### Weather Conditions
Generated randomly each round. Conditions that will affect simulation weights (TBD):
- Clear
- Rain
- Snow
- Heavy Wind
- Dome (no weather effect)

---

## 3. UI Screens

### Screen 1 — Setup / Starting Roster
- 8 player cards arranged by position
- Each card shows: player name, team/year, key stats for that position
- Re-roll button per card (disabled when 0 re-rolls remaining; counter shown)
- "Start Season" CTA

### Screen 2 — Round Hub *(main screen each round)*
- Week indicator: "Week 3 of 17"
- **Opponent Preview panel:**
  - Team name/year, offense rank (X/32), defense rank (X/32)
  - QB avg YPG, RB avg YPG, WR avg YPG, def points allowed
- **Weather badge:** condition name + icon
- **Your Team Stats panel:**
  - Pass YPG, Rush YPG, O-Line rank, D-Line rank, Secondary rank
- "View Draft Offer" button

### Screen 3 — Draft Offer
- Header: "Week N Draft — [TEAM] ([YEAR])"
- Roster grouped by position (QB, WR, RB, O-Line, D-Line, Secondary, K)
- Each player card is selectable; clicking shows a swap preview ("Replace [Current Player]?")
- WR selection prompts WR1 or WR2 slot choice
- Re-roll button (available once; labeled "Re-roll Offer" — greyed out after use)
- "Skip" button (no draft this round)
- "Confirm Pick" CTA (enabled after selection)

### Screen 4 — Roster View *(accessible via nav at any time)*
- Full roster grid: all 8 slots with player name, source team/year, and full stat breakdown
- Read-only during gameplay

---

## 4. Component Structure & Tech Stack

### Tech Stack
| Concern | Choice | Reason |
|---------|--------|--------|
| Framework | React + Vite | Fast dev, simple build, no SSR needed |
| State | Zustand | Lightweight, no boilerplate, easy to slice |
| Styling | Tailwind CSS | Utility-first, well-suited for stat card layouts |
| Routing | None | Phase-driven screen transitions via game state |
| Data | Static JSON (lazy-loaded) | No backend; Vite handles dynamic imports |

### Folder Structure
```
/src
  /components
    /roster       ← PlayerCard, RosterGrid, PositionSlot
    /draft        ← DraftOffer, TeamRoster, PlayerPickCard, SlotChooser
    /round        ← RoundHub, OpponentPreview, WeatherBadge, TeamStatsSummary
    /ui           ← Button, Badge, StatBar (shared primitives)
  /store
    gameStore.ts  ← Zustand store
  /logic
    rosterGen.ts  ← random starter generation
    draftGen.ts   ← random team/year draw, re-roll logic
    weatherGen.ts ← weather condition generator
    stats.ts      ← stat normalization helpers, aggregate team stat computation
  /data           ← lazy-loaded JSON (not imported at bundle time)
  /types
    index.ts      ← Player, TeamUnit, Roster, GameState, etc.

/scripts
  preprocess.py   ← one-time data pipeline: raw CSV → game-ready JSON
```

### Data Loading Strategy
`draftGen.ts` uses Vite dynamic imports to load only the `data/{year}/{team}.json` file needed for the current round. `meta.json` is loaded once at startup to populate the valid team/year pool.

---

## 5. Out of Scope (This Phase)
- Game simulation engine
- Backup players / injury system
- Post-season / playoff rounds
- Persistent save state / user accounts
- Multiplayer
