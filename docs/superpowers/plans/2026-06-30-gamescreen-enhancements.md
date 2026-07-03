# GameScreen Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply 12 targeted enhancements to the interactive game simulation — better logic, richer player cards, cleaner HUD, and improved UX flow.

**Architecture:** All changes are confined to `src/logic/gameEngine.ts`, `src/logic/gameEngine.test.ts`, and the four existing files in `src/components/game/`, plus one new extracted component `PlayerRollCard.tsx`. No new types, no store changes, no new routes.

**Tech Stack:** React 18 + TypeScript + Tailwind CSS + Vitest

## Global Constraints

- TypeScript strict mode — `npx tsc --noEmit` must produce 0 errors after every task
- Pre-existing test failures: 2 `abilityGen` tests fail in the current codebase — these are acceptable, do not fix them; do not introduce new failures
- Test runner: `npx vitest run`
- No new npm packages
- All `PlayerRollCard` roster-style cards use `getTeamColor` for the border (from `src/logic/teamColors.ts`) and `Badge` component (from `src/components/ui/Badge.tsx`)
- Roll animation: 600 ms total, 60 ms interval, cycles random values from the player's die array before settling
- FG difficulty formula: `Math.min(15, Math.max(1, Math.round(15 - ((progress - 65) / 34) * 14)))` — progress 65 → 15, progress 99 → 1
- Kicker card in PlayArea: possession determines which kicker (`user` → `userRoster.K`, `opponent` → `oppRoster.K`)
- Enter key triggers Step only when `showStep` is `true` (i.e., during rolling/result/FG phases); no effect during choice phases
- Opponent play call hidden in `choose-defense` panel; revealed by PlayArea matchup badge once rolling begins

---

### Task 1: FG Logic — New Difficulty Formula + Kick FG Option

**Files:**
- Modify: `src/logic/gameEngine.ts` (line 34 — `computeFGDifficulty`)
- Modify: `src/logic/gameEngine.test.ts` (lines 57–67 — update FG difficulty tests)
- Modify: `src/components/game/GameScreen.tsx` (add `KICK_FG` action + reducer case + handler + UI button)

**Interfaces:**
- Produces: Updated `computeFGDifficulty(progress: number): number` — replaces old `Math.max(1, 80 - progress)` formula
- Produces: New `KICK_FG` action type in GameScreen (no payload — difficulty computed from `state.driveProgress` in reducer)

- [ ] **Step 1: Update `gameEngine.test.ts` — replace old FG difficulty tests**

The existing `computeFGDifficulty` block (lines 57–67) tests the old formula. Replace it entirely:

```typescript
describe('computeFGDifficulty', () => {
  it('returns 15 at progress 65 (minimum range)', () => {
    expect(computeFGDifficulty(65)).toBe(15)
  })
  it('returns 8 at progress 82 (midpoint)', () => {
    // round(15 - (17/34)*14) = round(15 - 7) = 8
    expect(computeFGDifficulty(82)).toBe(8)
  })
  it('returns 1 at progress 99 (max range)', () => {
    expect(computeFGDifficulty(99)).toBe(1)
  })
  it('clamps to 1 at progress 100', () => {
    expect(computeFGDifficulty(100)).toBe(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/logic/gameEngine.test.ts
```

Expected: 3 of the 4 new FG difficulty tests fail (midpoint + progress-99 + progress-100 cases all fail with the old formula).

- [ ] **Step 3: Update `computeFGDifficulty` in `src/logic/gameEngine.ts`**

Replace line 34:
```typescript
// Before:
export function computeFGDifficulty(progress: number): number {
  return Math.max(1, 80 - progress)
}

// After:
export function computeFGDifficulty(progress: number): number {
  return Math.min(15, Math.max(1, Math.round(15 - ((progress - 65) / 34) * 14)))
}
```

- [ ] **Step 4: Run tests — verify all 4 FG difficulty tests pass**

```bash
npx vitest run src/logic/gameEngine.test.ts
```

Expected: All tests in this file pass (plus any pre-existing passes). The 2 abilityGen failures do not appear here.

- [ ] **Step 5: Add `KICK_FG` action to GameScreen state machine**

In `src/components/game/GameScreen.tsx`, make these three additions:

**5a — Add to the `GameAction` union** (after the last `|` before the closing):
```typescript
| { type: 'KICK_FG' }
```

**5b — Add reducer case** (inside `gameReducer`, after the `ADVANCE_DRIVE` case, before `default`):
```typescript
case 'KICK_FG': {
  return {
    ...state,
    fgDifficulty: computeFGDifficulty(state.driveProgress),
    phase: 'fg-roll',
  }
}
```

**5c — Add handler** (alongside the other `handle*` functions, e.g. after `handleDefPlay`):
```typescript
function handleKickFG() {
  dispatch({ type: 'KICK_FG' })
}
```

- [ ] **Step 6: Update `choose-offense` UI to show Kick FG button when in range**

In `GameScreen.tsx`, replace the existing `choose-offense` JSX block:

```tsx
{state.phase === 'choose-offense' && (
  <div className="flex flex-col items-center gap-4 py-12">
    <p className="text-xs text-gray-500 uppercase tracking-wider">Choose your play</p>
    <div className="flex gap-4">
      <Button onClick={() => handleOffPlay('run')}>🏃 Run</Button>
      <Button onClick={() => handleOffPlay('pass')}>🏈 Pass</Button>
      {state.driveProgress >= 60 && (
        <Button onClick={handleKickFG}>🦵 Kick FG</Button>
      )}
    </div>
  </div>
)}
```

- [ ] **Step 7: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 8: Full test run**

```bash
npx vitest run
```

Expected: same pass count as before plus the 4 new FG difficulty tests, only the 2 pre-existing abilityGen failures.

- [ ] **Step 9: Commit**

```bash
git add src/logic/gameEngine.ts src/logic/gameEngine.test.ts src/components/game/GameScreen.tsx
git commit -m "feat: update FG difficulty formula and add Kick FG option"
```

---

### Task 2: DriveProgressBar + GameHUD Visual Overhaul

**Files:**
- Modify: `src/components/game/DriveProgressBar.tsx` (add `pendingProgress` prop, numerical labels, current yard indicator)
- Modify: `src/components/game/GameHUD.tsx` (centered scoreboard layout, add `pendingYards` prop)
- Modify: `src/components/game/GameScreen.tsx` (pass `pendingYards={state.yardsGained}` to GameHUD)

**Interfaces:**
- Consumes: `computeFGDifficulty` from Task 1 (no direct dependency — these are UI components)
- Produces: `DriveProgressBar` now accepts `pendingProgress?: number`; `GameHUD` now accepts `pendingYards?: number | null`

- [ ] **Step 1: Rewrite `DriveProgressBar.tsx`**

Replace the entire file:

```tsx
interface DriveProgressBarProps {
  progress: number
  pendingProgress?: number
}

export function DriveProgressBar({ progress, pendingProgress }: DriveProgressBarProps) {
  const displayProgress = Math.min(100, Math.max(0, pendingProgress ?? progress))

  return (
    <div className="relative w-full">
      {/* Floating "Yd N" label above bar at current position */}
      <div className="relative h-5 mb-1">
        <span
          className="absolute bottom-0 text-xs font-bold text-white -translate-x-1/2 transition-all duration-300"
          style={{ left: `${displayProgress}%` }}
        >
          Yd {Math.round(displayProgress)}
        </span>
      </div>

      {/* Bar */}
      <div className="relative h-4 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-300"
          style={{ width: `${displayProgress}%` }}
        />
        {/* Marker lines rendered inside overflow-hidden so they span the full bar height */}
        <div className="absolute top-0 h-full w-0.5 bg-yellow-400 opacity-80" style={{ left: '65%' }} />
        <div className="absolute top-0 h-full w-0.5 bg-red-400 opacity-80" style={{ left: '80%' }} />
        <div className="absolute top-0 h-full w-0.5 bg-green-400 opacity-80" style={{ left: '99.5%' }} />
      </div>

      {/* Labels below bar */}
      <div className="relative h-5 mt-1">
        <span className="absolute text-xs text-yellow-400 -translate-x-1/2" style={{ left: '65%' }}>FG 65</span>
        <span className="absolute text-xs text-red-400 -translate-x-1/2" style={{ left: '80%' }}>RZ 80</span>
        <span className="absolute text-xs text-green-400 -translate-x-1/2" style={{ left: '99.5%' }}>TD</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Rewrite `GameHUD.tsx`**

Replace the entire file:

```tsx
import { DriveProgressBar } from './DriveProgressBar'

interface GameHUDProps {
  quarter: number
  driveIndex: number
  down: number
  driveProgress: number
  userScore: number
  opponentScore: number
  possession: 'user' | 'opponent'
  opponentLabel: string
  pendingYards?: number | null
}

const DOWN_LABELS = ['1st', '2nd', '3rd', '4th']

export function GameHUD({
  quarter, driveIndex, down, driveProgress,
  userScore, opponentScore, possession, opponentLabel, pendingYards,
}: GameHUDProps) {
  const driveInQuarter = (driveIndex % 4) + 1
  const downLabel = DOWN_LABELS[down - 1] ?? `${down}th`
  const pendingProgress = pendingYards != null
    ? Math.min(100, Math.max(0, driveProgress + pendingYards))
    : undefined

  return (
    <div className="bg-gray-950 border-b border-gray-800 px-6 pt-4 pb-8">
      {/* Centered score */}
      <div className="text-center mb-3">
        <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">
          Your Team — {opponentLabel}
        </p>
        <p className="text-4xl font-bold text-white tabular-nums">
          {userScore} <span className="text-gray-600">—</span> {opponentScore}
        </p>
      </div>

      {/* Game state chips */}
      <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
        <span className="bg-indigo-900/60 text-indigo-300 px-3 py-1 rounded-full text-sm font-bold">
          Q{quarter}
        </span>
        <span className="bg-gray-800 text-gray-300 px-3 py-1 rounded-full text-sm font-semibold">
          Drive {driveInQuarter}/4
        </span>
        <span className="bg-gray-800 text-gray-300 px-3 py-1 rounded-full text-sm font-semibold">
          {downLabel} Down
        </span>
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
          possession === 'user'
            ? 'bg-indigo-900/60 text-indigo-300'
            : 'bg-amber-900/60 text-amber-300'
        }`}>
          {possession === 'user' ? 'Your ball' : 'Their ball'}
        </span>
      </div>

      <DriveProgressBar progress={driveProgress} pendingProgress={pendingProgress} />
    </div>
  )
}
```

- [ ] **Step 3: Pass `pendingYards` from `GameScreen.tsx`**

In `GameScreen.tsx`, find the `<GameHUD ... />` call and add `pendingYards={state.yardsGained}`:

```tsx
<GameHUD
  quarter={quarter}
  driveIndex={state.driveIndex}
  down={state.down}
  driveProgress={state.driveProgress}
  userScore={state.userScore}
  opponentScore={state.opponentScore}
  possession={state.possession}
  opponentLabel={opponentLabel}
  pendingYards={state.yardsGained}
/>
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/game/DriveProgressBar.tsx src/components/game/GameHUD.tsx src/components/game/GameScreen.tsx
git commit -m "feat: overhaul DriveProgressBar and GameHUD with pending progress display"
```

---

### Task 3: PlayerRollCard Roster-Style Upgrade + PlayArea Enhancement

**Files:**
- Create: `src/components/game/PlayerRollCard.tsx`
- Modify: `src/components/game/PlayArea.tsx` (import `PlayerRollCard`; add `kicker` prop; add advantage breakdown; remove inline definition)
- Modify: `src/components/game/GameScreen.tsx` (pass `kicker` prop to PlayArea)

**Interfaces:**
- Consumes: `Badge` from `src/components/ui/Badge.tsx`; `DieFaces` from `src/components/ui/DieFaces.tsx`; `getTeamColor` from `src/logic/teamColors.ts`; `getPlayerDie`, `computeAdvantageBonus` from `src/logic/gameEngine.ts`
- Produces: `export function PlayerRollCard({ player, roll, isNext })` — used by both `PlayArea.tsx` and `GameScreen.tsx` (Task 4)

- [ ] **Step 1: Create `src/components/game/PlayerRollCard.tsx`**

```tsx
import { useState, useEffect } from 'react'
import { Badge } from '../ui/Badge'
import { DieFaces } from '../ui/DieFaces'
import { getTeamColor } from '../../logic/teamColors'
import { getPlayerDie } from '../../logic/gameEngine'
import type { Player, TeamUnit } from '../../types'

function getPositionLabel(player: Player | TeamUnit): string {
  const p = player.position
  if (p === 'OLine') return 'O-Line'
  if (p === 'DLine') return 'D-Line'
  return p
}

export function PlayerRollCard({
  player,
  roll,
  isNext,
}: {
  player: Player | TeamUnit
  roll: number | null
  isNext: boolean
}) {
  const [displayValue, setDisplayValue] = useState<number | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (roll === null) {
      setDisplayValue(null)
      setIsAnimating(false)
      return
    }
    // Animate: cycle random die faces for 600ms then settle on actual roll
    const die = getPlayerDie(player)
    setIsAnimating(true)
    let elapsed = 0
    const DURATION = 600
    const INTERVAL = 60
    const id = setInterval(() => {
      elapsed += INTERVAL
      setDisplayValue(die[Math.floor(Math.random() * die.length)])
      if (elapsed >= DURATION) {
        clearInterval(id)
        setDisplayValue(roll)
        setIsAnimating(false)
      }
    }, INTERVAL)
    return () => clearInterval(id)
  }, [roll]) // player doesn't change during a play; roll is the trigger

  const name = 'name' in player ? player.name : `${player.team} ${getPositionLabel(player)}`
  const posLabel = getPositionLabel(player)
  const isUnit = !('name' in player)

  return (
    <div
      className={`border-2 rounded-xl p-3 flex flex-col gap-2 bg-white dark:bg-gray-900 ${
        isNext ? 'ring-2 ring-indigo-500 ring-offset-1 ring-offset-gray-950' : ''
      }`}
      style={{ borderColor: getTeamColor(player.team) }}
    >
      <div>
        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
          {posLabel}
        </span>
        <p className="text-gray-900 dark:text-white font-semibold text-sm mt-0.5 leading-tight">{name}</p>
        <div className="flex flex-wrap gap-1 mt-1">
          <Badge label={player.team} />
          <Badge label={String(player.year)} color="blue" />
          {isUnit && <Badge label="Unit" color="gray" />}
        </div>
      </div>
      <DieFaces faces={getPlayerDie(player)} />
      {player.ability && (
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">{player.ability}</p>
      )}
      <div
        className={`text-center text-2xl font-bold tabular-nums transition-colors ${
          displayValue !== null
            ? isAnimating ? 'text-yellow-400' : 'text-white'
            : 'text-gray-600'
        }`}
      >
        {displayValue !== null ? displayValue : '?'}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Rewrite `PlayArea.tsx`**

Replace the entire file. This removes the inline `PlayerRollCard` definition, imports the extracted version, adds the kicker card, adds the advantage breakdown, and keeps all existing functionality:

```tsx
import { computeAdvantageBonus } from '../../logic/gameEngine'
import { PlayerRollCard } from './PlayerRollCard'
import type { Player, TeamUnit } from '../../types'

interface PlayAreaProps {
  possession: 'user' | 'opponent'
  phase: string
  offPlayers: (Player | TeamUnit)[]
  defPlayers: (Player | TeamUnit)[]
  offRolls: (number | null)[]
  defRolls: (number | null)[]
  offensePlayCall: 'run' | 'pass' | null
  defensePlayCall: 'run-stop' | 'pass-stop' | null
  opponentPlayCall: 'run' | 'pass' | null
  yardsGained: number | null
  fgRoll: number | null
  fgDifficulty: number | null
  driveOutcome: 'TD' | 'FG' | 'FG-missed' | 'Punt' | null
  kicker: Player | TeamUnit | null
}

const PLAY_CALL_LABELS: Record<string, string> = {
  run: 'RUN',
  pass: 'PASS',
  'run-stop': 'RUN STOP',
  'pass-stop': 'PASS STOP',
}

const ADVANTAGE_LABELS: Record<string, string> = {
  'run-run-stop': 'Run Stuffed',
  'run-pass-stop': 'Open Field',
  'pass-pass-stop': 'Pass Coverage',
  'pass-run-stop': 'Missed Coverage',
}

const OUTCOME_LABELS: Record<string, string> = {
  TD: '🏈 TOUCHDOWN!',
  FG: '✅ FIELD GOAL!',
  'FG-missed': '❌ FG MISSED',
  Punt: '📤 PUNT',
}

const OUTCOME_COLORS: Record<string, string> = {
  TD: 'text-green-400',
  FG: 'text-blue-400',
  'FG-missed': 'text-red-400',
  Punt: 'text-gray-400',
}

export function PlayArea({
  possession, phase,
  offPlayers, defPlayers,
  offRolls, defRolls,
  offensePlayCall, defensePlayCall, opponentPlayCall,
  yardsGained, fgRoll, fgDifficulty, driveOutcome,
  kicker,
}: PlayAreaProps) {
  const offLabel = possession === 'user' ? 'Your Offense' : 'Opp Offense'
  const defLabel = possession === 'user' ? 'Opp Defense' : 'Your Defense'

  const offRollingIdx = phase === 'rolling-offense'
    ? offRolls.findIndex(r => r === null)
    : -1
  const defRollingIdx = phase === 'rolling-defense'
    ? defRolls.findIndex(r => r === null)
    : -1

  const showMatchup = offensePlayCall !== null || defensePlayCall !== null || opponentPlayCall !== null
  const matchupOff = offensePlayCall ?? opponentPlayCall
  const matchupDef = defensePlayCall

  // Advantage breakdown (only when both calls known and all rolls in)
  const offTotal = offRolls.length > 0 && offRolls.every(r => r !== null)
    ? (offRolls as number[]).reduce((a, b) => a + b, 0)
    : null
  const defTotal = defRolls.length > 0 && defRolls.every(r => r !== null)
    ? (defRolls as number[]).reduce((a, b) => a + b, 0)
    : null
  const advKey = offensePlayCall && defensePlayCall
    ? `${offensePlayCall}-${defensePlayCall}`
    : null
  const advLabel = advKey ? ADVANTAGE_LABELS[advKey] : null
  const bonus = offensePlayCall && defensePlayCall
    ? computeAdvantageBonus(offensePlayCall, defensePlayCall)
    : null

  return (
    <div className="flex flex-col gap-6 px-6 py-4">
      {/* Play call matchup badge */}
      {showMatchup && (
        <div className="flex items-center justify-center gap-3 text-sm">
          {matchupOff && (
            <span className="bg-indigo-900/50 text-indigo-300 px-3 py-1 rounded-full font-bold">
              {PLAY_CALL_LABELS[matchupOff]}
            </span>
          )}
          {matchupOff && matchupDef && <span className="text-gray-600">vs</span>}
          {matchupDef && (
            <span className="bg-gray-800 text-gray-300 px-3 py-1 rounded-full font-bold">
              {PLAY_CALL_LABELS[matchupDef]}
            </span>
          )}
        </div>
      )}

      {/* Player columns */}
      {(offPlayers.length > 0 || defPlayers.length > 0) && (
        <div className="grid grid-cols-2 gap-6">
          {/* Offense column */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{offLabel}</p>
            <div className="flex flex-col gap-2">
              {offPlayers.map((player, i) => (
                <PlayerRollCard
                  key={player.id}
                  player={player}
                  roll={offRolls[i] ?? null}
                  isNext={offRollingIdx === i}
                />
              ))}
            </div>
            {offTotal !== null && (
              <p className="text-right text-sm text-gray-400 mt-2">
                Total: <span className="text-white font-bold">{offTotal}</span>
              </p>
            )}
          </div>

          {/* Defense column */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{defLabel}</p>
            <div className="flex flex-col gap-2">
              {defPlayers.map((player, i) => (
                <PlayerRollCard
                  key={player.id}
                  player={player}
                  roll={defRolls[i] ?? null}
                  isNext={defRollingIdx === i}
                />
              ))}
            </div>
            {defTotal !== null && phase !== 'rolling-offense' && phase !== 'rolling-defense' && (
              <p className="text-right text-sm text-gray-400 mt-2">
                Total: <span className="text-white font-bold">{defTotal}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Advantage breakdown — shown in show-play-result */}
      {phase === 'show-play-result' && yardsGained !== null && offTotal !== null && defTotal !== null && advLabel && bonus !== null && (
        <div className="bg-gray-900 rounded-xl p-4 text-sm">
          <div className="flex justify-between mb-2">
            <span className="text-gray-400">Offense</span>
            <span className="text-white font-bold tabular-nums">{offTotal}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-400">Defense</span>
            <span className="text-white font-bold tabular-nums">{defTotal}</span>
          </div>
          <div className="flex justify-between mb-3">
            <span className="text-gray-400">{advLabel}</span>
            <span className={`font-bold tabular-nums ${bonus < 0 ? 'text-red-400' : 'text-green-400'}`}>
              {bonus >= 0 ? '+' : ''}{bonus}
            </span>
          </div>
          <div className="border-t border-gray-700 pt-2 flex justify-between">
            <span className="text-gray-300 font-semibold">Net yards</span>
            <span className={`text-lg font-bold tabular-nums ${yardsGained >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {yardsGained >= 0 ? '+' : ''}{yardsGained}
            </span>
          </div>
        </div>
      )}

      {/* Kicker card + FG attempt */}
      {(phase === 'fg-roll' || phase === 'fg-result') && fgDifficulty !== null && (
        <div className="flex flex-col items-center gap-4">
          {kicker && (
            <div className="w-full max-w-xs">
              <PlayerRollCard
                player={kicker}
                roll={fgRoll}
                isNext={phase === 'fg-roll' && fgRoll === null}
              />
            </div>
          )}
          <div className="text-center bg-gray-900 rounded-lg p-4 w-full max-w-xs">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Need to beat</p>
            <p className="text-2xl font-bold text-yellow-400">{fgDifficulty}</p>
          </div>
        </div>
      )}

      {/* Drive outcome */}
      {driveOutcome && (
        <div className="text-center">
          <p className={`text-2xl font-bold ${OUTCOME_COLORS[driveOutcome] ?? 'text-white'}`}>
            {OUTCOME_LABELS[driveOutcome] ?? driveOutcome}
          </p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Pass `kicker` prop from `GameScreen.tsx` to `PlayArea`**

In `GameScreen.tsx`, add one line before the `<PlayArea>` call (or inline it in the JSX):

```tsx
const kicker = state.possession === 'user' ? userRoster.K : oppRoster.K
```

Then add `kicker={kicker}` to the existing `<PlayArea ... />` call:

```tsx
<PlayArea
  possession={state.possession}
  phase={state.phase}
  offPlayers={state.offPlayers}
  defPlayers={state.defPlayers}
  offRolls={state.offRolls}
  defRolls={state.defRolls}
  offensePlayCall={state.offensePlayCall}
  defensePlayCall={state.defensePlayCall}
  opponentPlayCall={state.opponentPlayCall}
  yardsGained={state.yardsGained}
  fgRoll={state.fgRoll}
  fgDifficulty={state.fgDifficulty}
  driveOutcome={state.driveOutcome}
  kicker={kicker}
/>
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Full test run**

```bash
npx vitest run
```

Expected: same pass/fail as after Task 1 (only the 2 pre-existing abilityGen failures).

- [ ] **Step 6: Commit**

```bash
git add src/components/game/PlayerRollCard.tsx src/components/game/PlayArea.tsx src/components/game/GameScreen.tsx
git commit -m "feat: upgrade player cards with roster style, roll animation, kicker display, and advantage breakdown"
```

---

### Task 4: Phase-Level UI — WR Cards, Hide Opp Call, Enter Key

**Files:**
- Modify: `src/components/game/GameScreen.tsx` only

**Interfaces:**
- Consumes: `PlayerRollCard` from `./PlayerRollCard` (created in Task 3)
- Produces: No new exports; all changes are internal to `GameScreen`

- [ ] **Step 1: Add `PlayerRollCard` import to `GameScreen.tsx`**

At the top of `src/components/game/GameScreen.tsx`, add:

```tsx
import { PlayerRollCard } from './PlayerRollCard'
```

- [ ] **Step 2: Add `useRef` to the React import**

The React import line currently reads:
```tsx
import { useReducer, useEffect } from 'react'
```

Update to:
```tsx
import { useReducer, useEffect, useRef } from 'react'
```

- [ ] **Step 3: Add Enter → Step listener using ref pattern**

In `GameScreen`, **after** `handleStep` is defined and **after** `showStep` is computed, add:

```tsx
// Keep handleStep always up-to-date in a ref so the keydown listener never captures a stale closure
const handleStepRef = useRef(handleStep)
useEffect(() => { handleStepRef.current = handleStep })

useEffect(() => {
  if (!showStep) return
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') handleStepRef.current()
  }
  window.addEventListener('keydown', onKeyDown)
  return () => window.removeEventListener('keydown', onKeyDown)
}, [showStep])
```

- [ ] **Step 4: Remove opponent call reveal from `choose-defense` panel**

Find the `choose-defense` JSX block. It currently contains:
```tsx
<p className="text-xs text-gray-500 uppercase tracking-wider">
  Opponent plays: <span className="text-white font-bold">{(state.opponentPlayCall ?? 'run').toUpperCase()}</span>
</p>
```
Delete that `<p>` entirely. The block becomes:

```tsx
{state.phase === 'choose-defense' && (
  <div className="flex flex-col items-center gap-4 py-12">
    <p className="text-xs text-gray-500 uppercase tracking-wider">Choose your defense</p>
    <div className="flex gap-4">
      <Button onClick={() => handleDefPlay('run-stop')}>🛑 Run Stop</Button>
      <Button onClick={() => handleDefPlay('pass-stop')}>✋ Pass Stop</Button>
    </div>
  </div>
)}
```

- [ ] **Step 5: Replace `choose-wr` button panel with full player cards**

Find the `choose-wr` JSX block. Replace it entirely:

```tsx
{state.phase === 'choose-wr' && (
  <div className="flex flex-col items-center gap-4 py-8">
    <p className="text-xs text-gray-500 uppercase tracking-wider">Choose your wide receiver</p>
    <div className="grid grid-cols-2 gap-4 w-full max-w-lg px-6">
      {(['WR1', 'WR2'] as const).map(slot => {
        const wr = userRoster[slot]
        return (
          <button
            key={slot}
            onClick={() => handleWRChoice(slot)}
            className="text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-xl"
          >
            {wr ? (
              <PlayerRollCard player={wr} roll={null} isNext={false} />
            ) : (
              <div className="border-2 border-dashed border-gray-700 rounded-xl p-6 text-center text-gray-500 text-sm">
                {slot} — Empty
              </div>
            )}
          </button>
        )
      })}
    </div>
  </div>
)}
```

- [ ] **Step 6: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 7: Full test run**

```bash
npx vitest run
```

Expected: same pass/fail as after Task 3 (only the 2 pre-existing abilityGen failures).

- [ ] **Step 8: Commit**

```bash
git add src/components/game/GameScreen.tsx
git commit -m "feat: WR selection cards, hide opponent call until rolling, Enter key advances Step"
```
