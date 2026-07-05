# Playbook Cards Design

**Date:** 2026-07-05

## Overview

Replace the binary Run/Pass play-selection with a Playbook Card system. At the start of each drive the user draws 4 cards (5 if the 5th-Down rule is active) from a weighted deck. These cards replace the Run and Pass buttons for the entire drive — one card is played per down. Defense (Run Stop / Pass Stop) is unchanged. The opponent always draws from Dive and Quick Pass only.

---

## Card Catalog

| Card | Type | Players (OFF) | Players (DEF) | Mechanic |
|---|---|---|---|---|
| Dive | run | RB, OLine | DLine | Vanilla run |
| Quick Pass | pass | QB, OLine, WR | DLine, Secondary | Vanilla pass |
| Off Tackle | run | RB, OLine | DLine | RB rolls twice, use lower; net yards floored at 0 |
| Power Run | run | RB, OLine | DLine | RB rolls twice, use higher; OLine normal |
| Ground & Pound | run | RB, OLine | DLine | Normal rolls; offense total +3 × prior-runs-this-drive, capped at +12 |
| Play Action | pass | QB, OLine, WR | DLine, Secondary | Normal; offense total +8 if previous down was a run card |
| Double Move | pass | QB, OLine, WR | DLine, Secondary | QB + OLine roll normally; WR rolls twice, use higher |
| Checkdown | pass | QB, OLine, WR | DLine, Secondary | QB + OLine roll normally; WR uses min(die) instead of rolling; immune to turnover number |
| Deep Shot | pass | WR → OLine | Secondary → DLine | WR rolls first: if ≥14 → WR only vs Secondary; if <14 → switch to OLine vs DLine (WR = 0) |
| Hail Mary | pass | QB, OLine, WR | DLine, Secondary | QB rolls first: if ≥16 → offTotal×2 − defTotal + bonus; if <16 → net yards = 0 |

### Paired-roll mapping (existing system)

The existing system pairs players as: off[0] solo, off[1] vs def[0], off[2] vs def[1].

- Run cards: off[0]=RB (solo), off[1]=OLine vs def[0]=DLine
- Pass cards: off[0]=QB (solo), off[1]=OLine vs def[0]=DLine, off[2]=WR vs def[1]=Secondary
- Deep Shot (success): off[0]=WR (solo), def=[] (defense = 0; yards = WR roll + advantage bonus)
- Deep Shot (fail): off[0]=OLine (solo), def=[DLine]

---

## Deck & Drawing

**New file:** `src/logic/playbookCards.ts`

### Weights

| Card | Weight |
|---|---|
| Dive | 3 |
| Quick Pass | 3 |
| Off Tackle | 1 |
| Power Run | 1 |
| Ground & Pound | 1 |
| Play Action | 1 |
| Double Move | 1 |
| Checkdown | 1 |
| Deep Shot | 1 |
| Hail Mary | 1 |
| **Total** | **14** |

Draw N cards by weighted random selection with replacement (each pick is independent, same weights). Duplicate cards in a hand are allowed. This skews toward Dive/Quick Pass without preventing specialty cards from dominating a rare hand.

### Opponent deck

Always draws from [Dive (50%), Quick Pass (50%)] randomly, one per down.

---

## State Changes

### `GameState` (in `GameScreen.tsx`)

Add:
```typescript
userHand: PlaybookCard[]        // drawn at drive start, size = maxDowns
activeCard: PlaybookCard | null // card chosen for the current play
```

### `driveReset()`

Must accept `maxDowns: number` to know how many cards to draw. Returns the new `userHand` as part of the reset object.

### `downHistory`

No change needed — existing `{ playCall: 'run' | 'pass', yardsGained }` is sufficient. Play Action checks `downHistory[last].playCall === 'run'`.

---

## Per-Card Mechanic Details

### Off Tackle
- In `handleStep` rolling-pairs, when `activeCard.mechanic === 'roll-twice-lower'` and rolling RB (off[0]): roll die twice, dispatch with `Math.min(r1, r2)`.
- In `RESOLVE_PLAY`: if `activeCard.mechanic === 'roll-twice-lower'`, floor net yards at 0 before returning.

### Power Run
- Same as Off Tackle but dispatch with `Math.max(r1, r2)`. No floor applied.

### Ground & Pound
- In `RESOLVE_PLAY`: if mechanic is `'ramp-run'`, compute bonus = `Math.min(12, 3 × userRunsThisDrive)` and add to yards before returning. `userRunsThisDrive` reflects runs *already committed* this drive (before this play is counted), so the counter includes earlier Dive/Off Tackle/Ground & Pound/Power Run plays.
- Show bonus in the advantage breakdown panel (like ability bonuses).

### Play Action
- In `RESOLVE_PLAY`: if mechanic is `'play-action-bonus'` and `downHistory.length > 0` and last `playCall === 'run'`, add +8 to yards.
- Show bonus in the advantage breakdown panel.

### Double Move
- In `handleStep`, when rolling WR (off[2]) and `activeCard.mechanic === 'roll-twice-higher'`: roll twice, dispatch with `Math.max(r1, r2)`.

### Checkdown
- In `handleStep`, when rolling WR (off[2]) and `activeCard.mechanic === 'checkdown'`: use `Math.min(...getPlayerDie(wrPlayer))` as the roll value instead of `rollDie()`. Dispatch normally.
- In `ROLL_PAIR`: skip the turnover number check when `activeCard.mechanic === 'checkdown'`.

### Deep Shot
- Initial setup: `offPlayers = [WR]`, `defPlayers = []` (WR rolls solo, no defense pairing).
- After WR rolls (the only off roll), check threshold in `ROLL_PAIR`:
  - If WR roll ≥ 14: proceed to `show-play-result` immediately. Yards = WR roll + advantage bonus (defense = 0).
  - If WR roll < 14: dispatch `DEEP_SHOT_SWITCH` action. This resets offPlayers to `[OLine]`, defPlayers to `[DLine]`, clears rolls/bonuses, and goes back to `rolling-pairs`. OLine then rolls normally vs DLine. The original WR roll is discarded.
- The advantage bonus uses `offensePlayCall = 'pass'` throughout (even on the OLine fallback).

### Hail Mary
- Normal pass setup: [QB, OLine, WR] vs [DLine, Secondary].
- QB rolls first (off[0] solo). Store QB roll in `offRolls[0]` normally.
- All other players roll as normal.
- In `RESOLVE_PLAY`: check `activeCard.mechanic === 'hail-mary'`:
  - If `offRolls[0] >= 16`: yards = `(offTotal × 2) − defTotal + advantageBonus`
  - If `offRolls[0] < 16`: yards = 0
- Show the Hail Mary outcome (success/fail) in the advantage breakdown.

---

## New Reducer Action

```typescript
| { type: 'DEEP_SHOT_SWITCH'; offPlayers: (Player | TeamUnit)[]; defPlayers: (Player | TeamUnit)[] }
```

Resets `offPlayers`, `defPlayers`, `offRolls`, `defRolls`, `offBonuses`, `defBonuses` and returns to `rolling-pairs`.

---

## UI Changes

### `choose-offense` phase

Replace the Run / Pass buttons with a 2×2 grid (or 2+3 for 5-card hands) of `PlaybookCardButton` components. Each button shows:
- Card name (larger, bold)
- Description (smaller, muted)

Picking a run card calls `handleCardPlay(card)` → direct to rolling (same as current Run path).  
Picking a pass card calls `handleCardPlay(card)` → `choose-wr` phase (same as current Pass path).

The FG kick button remains available alongside the card grid when in FG range.

### `PlayArea` — matchup badge

Show card name (e.g. "GROUND & POUND") instead of "RUN" / "PASS" in the offense play-call badge. Defense badge unchanged.

### New component: `PlaybookCardButton.tsx`

Simple presentational component: card name + description, styled as a selectable card. No internal state.

---

## Files to Create / Modify

| File | Action | Summary |
|---|---|---|
| `src/logic/playbookCards.ts` | Create | Card definitions, `PLAYBOOK_DECK`, `drawHand(n)` |
| `src/types/index.ts` | Modify | Add `PlaybookCard`, `PlaybookCardId`, `CardMechanic` |
| `src/components/game/PlaybookCardButton.tsx` | Create | Card UI button |
| `src/components/game/GameScreen.tsx` | Modify | State fields, draw logic, card-aware actions & rolling |
| `src/components/game/PlayArea.tsx` | Modify | Card name in matchup badge |

---

## Out of Scope

- Curated deck building (future feature — for now deck is always the full weighted pool)
- Card animations / flip reveal
- Ability interactions with specific cards (existing abilities apply to their players as normal)
- Defense cards (defense remains Run Stop / Pass Stop)
