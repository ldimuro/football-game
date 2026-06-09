# Coins / Salary Cap System

**Date:** 2026-06-08
**Status:** Approved

## Overview

A 100-coin salary cap governs roster building. Every player and unit has a coin cost derived from their rating tier. The starting roster is budget-constrained at generation time so it always fits within 100 coins. Each round the user gains access to a Shop with 3 randomly generated players; they may buy one per round. Players can also be sold directly from the roster at any time, refunding their cost.

---

## Tier → Cost Mapping

Uses the existing `ratingTier` thresholds already defined in `PlayerCard.tsx`:

| Tier | Rating threshold | Cost |
|------|-----------------|------|
| Legendary | ≥ 98 | 30 coins |
| Elite | ≥ 93 | 30 coins |
| Great | ≥ 85 | 20 coins |
| Good | ≥ 75 | 15 coins |
| Average | ≥ 65 | 10 coins |
| Below Avg | < 65 | 5 coins |

Single source of truth: `src/logic/playerValue.ts` exports `playerCost(rating: number | undefined): number`.

---

## Data Model

### Store fields (additions to `GameStore`)

| Field | Type | Description |
|-------|------|-------------|
| `coins` | `number` | Remaining cap after starting roster and purchases |
| `shopOffer` | `(Player \| TeamUnit)[] \| null` | 3 players for current round's shop |
| `shopComplete` | `boolean` | Whether user has bought from shop this round |

### Type changes

`RoundRecord` gains `shopBoughtId: string | null` (parallel to `draftedId`).

---

## Store Actions

### Modified: `generateRandomRoster()`

Generates slots sequentially with a running budget. After generating each slot, checks `playerCost(slot.rating) <= remainingBudget`. If not, re-rolls up to 5 times. After 5 retries, keeps the cheapest result found across all attempts. Guarantees total cost ≤ 100.

### Modified: `initGame()`

After generating the budget-constrained roster, sets `coins = 100 - sum(playerCost for each filled slot)`. Also resets `shopComplete: false`, `shopOffer: null`.

### Modified: `confirmSetup()`

Recalculates `coins = 100 - sum(playerCost for each filled slot)` before calling `buildNextRoundData()`, to account for any slots rerolled during setup.

### Modified: `buildNextRoundData()`

Also generates `shopOffer` via `generateShopOffer(remainingCoins)` and includes it in the returned data.

### New: `generateShopOffer(remainingCoins: number)`

1. Picks 3 `RosterPosition`s at random, without replacement, from all 8 positions.
2. For each, calls `generateRandomSlot(position)`.
3. Re-rolls up to 5 times if `playerCost(rating) > remainingCoins`.
4. Keeps the result regardless after retries (will be greyed out in UI).
5. Returns array of 3 players/units.

### New: `buyFromShop(buyId: string, sellPosition: RosterPosition)`

1. Finds player in `shopOffer` by id.
2. If `roster[sellPosition]` is not null, refunds `playerCost` of that slot to `coins`.
3. Places new player in `roster[sellPosition]`.
4. Deducts new player's `playerCost` from `coins`.
5. Sets `shopComplete: true`, records `shopBoughtId`.

### New: `sellPlayer(position: RosterPosition)`

1. Refunds `playerCost(roster[position].rating)` to `coins`.
2. Sets `roster[position]` to `null`.

### Modified: `advanceRound()`

- Includes `shopBoughtId` in `RoundRecord`.
- Resets `shopComplete: false` alongside existing `draftComplete: false`.

---

## UI Components

### New: `src/logic/playerValue.ts`

```ts
export function playerCost(rating: number | undefined): number
```

### New: `src/components/round/ShopModal.tsx`

Full-screen overlay (same pattern as `SimulationModal`). Two internal views managed by component state:

**Browse view**
- 3 `PlayerCard`s, each with a coin cost badge.
- Cards where `playerCost > coins` are rendered with `opacity-50 pointer-events-none` and a "Can't afford" label.
- "Buy" button below each affordable card.
- "Close" button dismisses the modal.
- If `shopComplete: true`, shows a "Purchased this round" message instead of cards.

**Sell-to-replace view** (shown after clicking "Buy")
- Header: the player being bought + their cost.
- Lists current roster slot(s) at that position as selectable `PlayerCard`s with their refund value shown.
- For WR: shows both WR1 and WR2 as options (user picks which to replace).
- If the target slot is already `null`: skip the sell step, go straight to the confirmation line.
- Summary line: `"Net cost: X coins (buy Y – sell Z)"`.
- [Confirm] triggers `buyFromShop()`. [Back] returns to browse view.

### Modified: `src/components/roster/PlayerCard.tsx`

Two new optional props:
- `coinValue?: number` — renders a coin cost badge in the card header when present.
- `onSell?: () => void` — renders a small "Sell" button when present.

### New: `src/components/roster/ConfirmSellModal.tsx`

Small centered modal for the standalone sell confirmation flow:
- Displays player name + "Refunds X coins".
- [Confirm Sale] calls `sellPlayer(position)`. [Cancel] closes.

### Modified: `src/components/round/RoundHub.tsx`

- "Shop" button added next to "View Draft Offer", disabled when `shopComplete || isLoading`.
- `shopOpen` boolean in component state controls `ShopModal` visibility.
- Coin display added to the header area: `"X / 100 coins"` (or `"X coins remaining"`).

### Modified: `src/components/roster/RosterSummary.tsx`

Coin usage added to the meta group: `"X / 100"` styled with color based on remaining headroom.

### Modified: `src/components/screens/RosterView.tsx` / `RosterGrid.tsx`

- `PlayerCard`s rendered with `coinValue` and `onSell` props.
- `onSell` triggers `ConfirmSellModal` for that position.

---

## Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| Target slot is already empty (sold previously) | `buyFromShop` skips the sell step; no refund, just deduct cost |
| All 3 shop players exceed remaining cap | All greyed out; shop still openable; nothing purchasable |
| Shop re-roll exhausted after 5 retries | Player kept; greyed out in UI |
| Starting roster slot can't fit after 5 retries | Use cheapest result found across all attempts |
| Selling a player leaves slot `null` | Allowed; slot shows as empty in RosterGrid |
