# Dice System Design

**Date:** 2026-06-29

## Overview

Each Player and TeamUnit is assigned a Die — a set of 6 face values — when they are first generated. The die is chosen randomly from a pool determined by the player's skill tier (rating). The die replaces the rating number as the primary visual indicator of player quality on all cards, with the stat view moved to a secondary tab.

---

## Die Pools

Six tiers, each with a pool of candidate dice. One die is picked at random from the tier's pool when a player is generated.

Tier thresholds match the existing `ratingTier()` function in `PlayerCard.tsx`:

| Tier       | Rating threshold |
|------------|-----------------|
| LEGENDARY  | ≥ 98            |
| ELITE      | ≥ 93            |
| GREAT      | ≥ 85            |
| GOOD       | ≥ 75            |
| AVERAGE    | ≥ 65            |
| BELOW AVG  | < 65            |

### Die pools (6 faces per die)

**LEGENDARY**
- 20 20 20 20 20 20
- 18 19 19 19 19 20
- 15 15 15 20 20 20

**ELITE**
- 15 16 17 18 19 20
- 5 5 5 20 20 20
- 15 15 16 16 17 17
- 16 16 16 17 17 17
- 10 16 16 16 16 20

**GREAT**
- 8 9 10 10 11 12
- 10 10 10 15 15 15
- 12 12 13 13 14 14
- 13 13 13 14 14 14
- 2 3 4 18 19 20
- 10 14 14 14 14 18
- 3 3 3 18 18 18
- 1 1 1 1 1 20

**GOOD**
- 8 8 9 9 10 10
- 7 7 7 10 10 10
- 6 7 8 9 10 11
- 1 2 3 15 16 17
- 8 12 12 12 12 16
- 3 3 3 15 15 15
- 1 1 1 1 1 20

**AVERAGE**
- 4 5 6 7 8 9
- 5 5 5 10 10 10
- 7 7 7 7 7 7
- 1 2 3 10 11 12
- 4 7 7 7 7 10
- 1 1 1 10 10 10
- 1 1 1 1 1 20

**BELOW AVG**
- 1 2 3 4 5 6
- 1 1 1 5 5 5
- 3 3 3 3 3 3
- 1 2 3 4 5 10
- 1 1 1 1 1 10

---

## Data Model

### Types (`src/types/index.ts`)

Add optional `die` field to both `Player` and `TeamUnit`:

```ts
die?: number[]  // exactly 6 values
```

Optional because raw JSON data won't have it; it is always assigned at generation time before any object reaches the UI.

### Logic (`src/logic/diceGen.ts`)

New file with:
- `DIE_POOLS: Record<string, number[][]>` — the six tier pools above
- `assignDie(rating: number | undefined): number[]` — maps rating to tier, picks one die at random

---

## Die Assignment

Die is assigned at the moment a player or unit is first generated. All generation paths go through `generateRandomSlot()` in `rosterGen.ts`, so a single assignment call there covers:
- Setup roster generation
- Setup rerolls
- Shop offer generation

Additionally, `draftGen.ts` generates players/units for draft offers directly; those are assigned a die before the `DraftOffer` object is returned.

No changes to `gameStore.ts` are needed — the die travels with the player/unit object.

---

## UI

### DieFaces component (`src/components/ui/DieFaces.tsx`)

Renders 6 squares in a 2-row × 3-column grid. Each square shows one face value. Text color and border color both reflect the player's skill tier:

| Tier       | Color         |
|------------|---------------|
| LEGENDARY  | yellow-400    |
| ELITE      | purple-400    |
| GREAT      | green-400     |
| GOOD       | blue-400      |
| AVERAGE    | gray-400      |
| BELOW AVG  | gray-500      |

### PlayerCard tabs

`PlayerCard` and `PlayerPickCard` both gain two tabs with local `useState`:

- **Die** (default tab): renders `DieFaces`
- **Stats**: renders the existing stat content unchanged

The rating number is removed from both components everywhere it currently appears. Skill quality is now communicated solely through the die face colors.
