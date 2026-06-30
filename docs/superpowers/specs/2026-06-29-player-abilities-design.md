# Player Abilities Design

**Date:** 2026-06-29

## Overview

Each Player and TeamUnit is assigned a random Ability string when they are first generated. Abilities are drawn from a single flat pool — all 21 abilities are available to any player regardless of skill tier. For now, abilities have no gameplay effect; they are purely display data stored as a string on each player/unit object.

---

## Ability Pool

All 21 abilities, stored and displayed as-is (emoji + name + optional parameters):

| Ability | Display string |
|---|---|
| Reroll | `🔄Reroll` |
| Mega Reroll | `🔄Mega Reroll` |
| Lucky Reroll | `🔄Lucky Reroll` |
| Unlucky Reroll | `🔄Unlucky Reroll` |
| Loaded | `🎲Loaded: {num1} become {num2}` |
| Second Chance | `🎲Second Chance` |
| Average | `🧮Average` |
| Copycat | `🐈‍⬛Copycat` |
| Evens | `2️⃣Evens` |
| Odds | `3️⃣Odds` |
| Evil Evens | `2️⃣Evil Evens` |
| Evil Odds | `3️⃣Evil Odds` |
| Lockdown | `🔒Lockdown` |
| Read the Play | `📖Read the Play` |
| 2nd-Half Player | `💪🏻2nd-Half Player` |
| Clutch | `💪🏻Clutch` |
| Road Warrior | `🚗Road Warrior` |
| Rain Man | `🌧️Rain Man` |
| Snow Man | `❄️Snow Man` |
| Goal Line | `🏈Goal Line` |
| Two Minute Drill | `⏱️Two Minute Drill` |

**Loaded parameters:** `num1` is a random integer from 1–10 inclusive; `num2` is a random integer from 11–20 inclusive. Example: `"🎲Loaded: 4 become 17"`.

---

## Data Model

### Types (`src/types/index.ts`)

Add optional `ability` field to both `Player` and `TeamUnit`:

```ts
ability?: string
```

Optional because raw JSON data won't have it; always assigned at generation time before any object reaches the UI.

### Logic (`src/logic/abilityGen.ts`)

New file with:
- `ABILITIES: string[]` — all 21 ability strings, with `"🎲Loaded"` as a sentinel entry (the function resolves it to the parameterized form)
- `assignAbility(): string` — picks a random ability; if Loaded is selected, generates num1 ∈ [1–10] and num2 ∈ [11–20] and returns the full string

---

## Assignment

Ability is assigned at the same six generation points as `die`, following the exact same pattern:

1. `generateRandomSlot` in `rosterGen.ts` — spread `ability: assignAbility()` onto returned object
2. Practice squad loop in `generateRandomRoster` — mutate `slot.ability = assignAbility()`
3. `selectTopRoster` in `rosterGen.ts` — extend the `withDie` helper to also assign ability (renamed `withExtras`)
4. `generateDraftOffer` in `draftGen.ts` — add to spread map
5. `rerollDraftOfferTeam` in `draftGen.ts` — add to spread map
6. `rerollDraftOfferYear` in `draftGen.ts` — add to spread map

---

## UI

The ability string is displayed in the Die tab of both `PlayerCard` and `PlayerPickCard`, directly below the `DieFaces` grid. It renders as a single line of small text showing the raw ability string (emoji + name + parameters). The Stats tab is unaffected.
