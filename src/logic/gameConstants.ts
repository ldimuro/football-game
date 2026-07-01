// ─── Game structure ────────────────────────────────────────────────────────────
export const DRIVES_PER_GAME = 16
export const DRIVES_PER_QUARTER = 4
export const STARTING_YARD_LINE = 20

// ─── Scoring ──────────────────────────────────────────────────────────────────
export const TD_POINTS = 7
export const FG_POINTS = 3

// ─── Yard thresholds ──────────────────────────────────────────────────────────
export const TD_YARD = 100
export const RED_ZONE_YARD = 80
export const FG_RANGE_YARD = 65  // earliest yard from which a FG can be attempted

// ─── FG difficulty ────────────────────────────────────────────────────────────
// At FG_RANGE_YARD the difficulty is MAX; at yard 99 it is MIN.
// The linear scale spans FG_DIFFICULTY_YARD_RANGE yards (99 - FG_RANGE_YARD).
export const FG_DIFFICULTY_MAX = 15
export const FG_DIFFICULTY_MIN = 1
export const FG_DIFFICULTY_YARD_RANGE = 99 - FG_RANGE_YARD  // 34

// ─── Play call advantage ──────────────────────────────────────────────────────
// Offense gains +ADVANTAGE_BONUS when defense guessed wrong, loses it when they guessed right.
export const ADVANTAGE_BONUS = 5

// ─── Roll animation ───────────────────────────────────────────────────────────
export const ROLL_ANIMATION_DURATION_MS = 600
export const ROLL_ANIMATION_INTERVAL_MS = 60
