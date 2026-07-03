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
export const SHOP_SLOTS = 4       // number of players offered in the shop each round
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

// ─── Roll value jump animation ────────────────────────────────────────────────
// Die value (or die + ability bonus) at or above this threshold triggers the
// jump/pop animation on the roll display number.
export const ROLL_JUMP_THRESHOLD = 15

// ─── Drive progress bar ───────────────────────────────────────────────────────
// CSS transition duration (ms) for the bar and yard label sliding to a new position.
export const DRIVE_PROGRESS_TRANSITION_MS = 600

// ─── Ability rarity weights ───────────────────────────────────────────────────
// Relative probability weights for each rarity tier. A Common ability is
// 10× more likely to be selected than a Rare one, Uncommon 4×.
// All abilities are currently Common, so these weights have no effect yet —
// they become meaningful once Uncommon/Rare entries are added to ABILITY_RARITY.
export const ABILITY_RARITY_WEIGHTS = {
  Common:   10,
  Uncommon:  4,
  Rare:      1,
} as const

// ─── Enabled league rules ─────────────────────────────────────────────────────
// Remove a rule ID from this set to prevent it from ever being selected as
// the active league rule. The full rule list still appears in the UI for
// reference; only random selection and display of the active rule are gated.
export const ENABLED_LEAGUE_RULES = new Set([
  'rz-starts-at-35',
  'field-125',
  'altitude',
  'kickers-people',
  'no-punting',
  'fifth-down',
  'ice-age',
  'defense-wins',
  'pick-2',
  'parallel-universe',
])

// ─── Enabled abilities ────────────────────────────────────────────────────────
// Remove an ability ID from this set to prevent it from being assigned to any
// player during roster generation (starting roster, shop, draft, re-roll).
// Abilities already on existing players are unaffected until the player is
// replaced or the game is restarted.
export const ENABLED_ABILITIES = new Set([
  // General
  'second-half',
  'clutch',
  'rain-man',
  'snow-man',
  'comeback-kid',
  'two-minute-drill',
  // QB
  'play-action',
  'in-rhythm',
  // WR
  'basketball-player',
  'yac',
  // RB
  'workhorse',
  'fresh-legs',
  'goal-line',
  // OLine
  'air-raid',
  'ground-and-pound',
  'psychic',
  // DLine
  'bull-rush',
  'brick-wall',
  'stack-the-box',
  'bend-dont-break',
  // Secondary
  'on-an-island',
  'no-fly-zone',
])

// ─── FG scan animation ────────────────────────────────────────────────────────
// How fast the highlight sweeps across die faces (ms per step).
export const FG_ROLL_SCAN_INTERVAL_MS = 80
// Total duration of the sweep before landing on the final value.
export const FG_ROLL_SCAN_DURATION_MS = 1600
