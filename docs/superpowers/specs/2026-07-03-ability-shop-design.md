# Ability Shop Design

## Overview

Split the existing Shop into two independent purchase tracks: **Player Shop** (existing functionality, unchanged) and **Ability Shop** (new). Both shops appear as tabs inside a single `ShopModal`. Each shop allows one purchase per round independently — a player can buy one player and one ability in the same round.

Both shops use the `SHOP_SLOTS` constant to determine how many items are offered each round.

---

## Data Model

### Store additions (`src/store/gameStore.ts`)

| Field | Type | Description |
|---|---|---|
| `abilityShopOffer` | `string[] \| null` | Array of `SHOP_SLOTS` ability IDs; generated alongside `shopOffer` in `buildNextRoundData` |
| `abilityShopComplete` | `boolean` | Whether the player has already purchased from the Ability Shop this round; reset each round alongside `shopComplete` |

### New store action

```typescript
buyAbility: (abilityId: string, targetPosition: RosterPosition) => void
```

- Looks up cost via `abilityCost(abilityId)`
- Deducts cost from `coins`
- Sets `ability` field on `roster[targetPosition]`
- Sets `abilityShopComplete: true`
- Guards: `abilityShopOffer` must be non-null, ability must be in offer, player can afford it

---

## Ability Offer Generation

### `generateAbilityShopOffer(): string[]` in `src/logic/abilityGen.ts`

- Draws `SHOP_SLOTS` distinct ability IDs from `ENABLED_ABILITIES`
- Uses the existing `weightedPick` rarity system (no duplicates)
- Returns the array of IDs

Called in `buildNextRoundData` alongside `generateShopOffer`, stored as `abilityShopOffer`.

---

## Pricing

### `abilityCost(abilityId: string): number` in `src/logic/playerValue.ts`

Looks up `ABILITY_RARITY[abilityId]` and maps:

| Rarity | Cost |
|---|---|
| Common | 10 |
| Uncommon | 20 |
| Rare | 30 |

Falls back to 10 (Common) for any unknown ability ID.

---

## Compatibility

An ability is compatible with a roster position if:

- The ability is in `ALL_ABILITY_IDS` (general) → compatible with **all** 8 roster positions
- The ability is in `POSITION_ABILITY_IDS[pos]` for some `pos` → compatible with the matching roster slot(s)

Position mapping from `IndividualPosition / UnitPosition` → `RosterPosition`:
- `QB` → `QB`
- `WR` → `WR1`, `WR2`
- `RB` → `RB`
- `K` → `K`
- `OLine` → `OLine`
- `DLine` → `DLine`
- `Secondary` → `Secondary`

### Ability label on card

- General ability → **"Any Player"**
- Position-specific → comma-separated readable names, e.g. `"O-Line, D-Line, Secondary"` for `psychic`

---

## UI — `ShopModal.tsx`

### Tab bar

Two tabs at the top of the modal: **Player Shop** and **Ability Shop**. Active tab shown with indigo underline. Switching tabs resets the inner view state (browse vs. player-select vs. confirm).

### Player Shop tab

Unchanged from the current implementation. Gated by `shopComplete`.

### Ability Shop tab — Browse view

When `abilityShopComplete` is true, the tab body shows a centered message: *"You've already bought an ability this round."* (mirrors Player Shop's completed state).

When not complete, renders the same 3-column grid layout as the Player Shop. Each ability card shows:

1. Emoji + name (from `ABILITY_DISPLAY`)
2. Effect description (from `ABILITY_DESCRIPTIONS`)
3. Compatibility label: **"Any Player"** or position name(s)
4. Rarity badge (Common / Uncommon / Rare)
5. Coin cost
6. **Buy** button — disabled if `abilityShopComplete` or `abilityCost > coins`

### Ability Shop tab — Player Select view

Triggered when the player clicks Buy on an ability card.

Shows all 8 roster slots as a scrollable list (same order as `POSITION_LABELS`). Each slot renders its current `PlayerCard` (or an empty-slot placeholder).

Slot state rules:
- **Incompatible position** → dimmed + not clickable
- **Compatible but empty** → dimmed + not clickable
- **Compatible and occupied** → fully clickable, ring highlight on hover/select

Clicking a compatible occupied slot:
- If that player has **no ability** → immediately calls `buyAbility(abilityId, position)` and closes the modal
- If that player **already has an ability** → transition to the Confirm Replace view

### Ability Shop tab — Confirm Replace view

Inline within the same modal (no extra modal). Shows:

```
Replace "[current ability name]" with "[new ability name]"?
```

Two buttons: **Cancel** (returns to Player Select) and **Confirm** (calls `buyAbility`, closes modal).

### Back navigation

- From Player Select → Back button returns to Browse
- From Confirm Replace → Cancel returns to Player Select

---

## Files Changed

| File | Change |
|---|---|
| `src/logic/gameConstants.ts` | Add `ABILITY_SHOP_COSTS` constant mapping rarity → coin cost |
| `src/logic/abilityGen.ts` | Add `generateAbilityShopOffer()` and export `ALL_ABILITY_IDS`, `POSITION_ABILITY_IDS` |
| `src/logic/playerValue.ts` | Add `abilityCost(abilityId: string): number` |
| `src/store/gameStore.ts` | Add `abilityShopOffer`, `abilityShopComplete`, `buyAbility`; call `generateAbilityShopOffer` in `buildNextRoundData`; reset `abilityShopComplete` each round |
| `src/components/round/ShopModal.tsx` | Refactor to tabbed modal; implement Ability Shop browse, player-select, and confirm-replace views |

---

## What Does Not Change

- `shopOffer`, `shopComplete`, `buyFromShop` — untouched
- Player Shop UI and flow — untouched
- `SHOP_SLOTS` meaning — still controls both offer sizes
- Ability assignment on player cards, roll cards, play summaries — untouched
- Draft and setup ability assignment — untouched
