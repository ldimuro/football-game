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
export const FG_RANGE_YARD = 60  // earliest yard from which a FG can be attempted

// ─── FG difficulty ────────────────────────────────────────────────────────────
// At FG_RANGE_YARD the difficulty is MAX; at yard 99 it is MIN.
// The linear scale spans FG_DIFFICULTY_YARD_RANGE yards (99 - FG_RANGE_YARD).
export const FG_DIFFICULTY_MAX = 15
export const FG_DIFFICULTY_MIN = 1
export const FG_DIFFICULTY_YARD_RANGE = 99 - FG_RANGE_YARD  // 34

// ─── Play call advantage ──────────────────────────────────────────────────────
// Offense gains +ADVANTAGE_BONUS when defense guessed wrong, loses it when they guessed right.
export const ADVANTAGE_BONUS = 5

// ─── Shop ─────────────────────────────────────────────────────────────────────
export const SHOP_SLOTS = 3       // number of players offered in the shop each round
export const CAP_SPACE = 200      // total salary cap; coins = CAP_SPACE - roster cost

// ─── Setup roster ─────────────────────────────────────────────────────────────
// The 3 starting players are guaranteed to fall in these rating tiers.
export const SETUP_GOOD_MIN_RATING = 75    // Good tier: 75–84
export const SETUP_GOOD_MAX_RATING = 84
export const SETUP_GREAT_MIN_RATING = 85   // Great tier: 85–92
export const SETUP_GREAT_MAX_RATING = 92
export const SETUP_ELITE_MIN_RATING = 93   // Elite tier: 93+
export const SETUP_ABILITY_MIN = 1         // min starting players that have an ability
export const SETUP_ABILITY_MAX = 2         // max starting players that have an ability

// ─── Roll animation ───────────────────────────────────────────────────────────
export const ROLL_ANIMATION_DURATION_MS = 0//600
export const ROLL_ANIMATION_INTERVAL_MS = 0//60
