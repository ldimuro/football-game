# Player Stat Filter Playground — Design

## Goal

A small standalone Python script for ad-hoc exploration of the historical
player/unit dataset (`public/data/players/<year>/<TEAM>.json`, years
2000–2024). Lets you answer questions like "which QBs in history have
`avgTDPerGame > 2.0` and `avgINTPerGame < 0.5`?" by editing a config block
and re-running.

Not a feature of the game itself — lives in `scripts/` alongside the other
data-processing utilities and uses only stdlib + `pandas` (already a
dependency per `scripts/requirements.txt`).

## Data model

Each `public/data/players/<year>/<TEAM>.json` file has two top-level arrays:

- `players`: individual QB/WR/RB/K entries with `id`, `name`, `position`,
  `rating`, `stats` (position-specific dict), `team`, `year`, optional
  `is_all_pro`.
- `units`: team-level OLine/DLine/Secondary entries with `id`, `position`,
  `rating`, `stats`, `team`, `year` (no `name`).

The script loads every file under `public/data/players/`, flattening both
arrays into one list of "entries" tagged with their source (`player` /
`unit`).

## Config

A small block at the top of the script, edited directly and re-run via
`python scripts/player_filter.py`:

```python
POSITIONS = ["QB"]      # which positions to consider; [] or None = all
FILTERS = [
    "avgTDPerGame > 2.0",
    "avgINTPerGame < 0.5",
]
SORT_BY = "avgTDPerGame"   # stat field, "rating", or "year"; None = no sort
SORT_DESC = True
LIMIT = None               # cap rows printed; None = all
```

## Filter semantics

- `POSITIONS` is a pre-filter on `entry["position"]`. Empty/`None` means no
  position restriction.
- Each string in `FILTERS` is a Python boolean expression, evaluated per
  entry via `eval()` against a namespace built from that entry's `stats`
  dict plus top-level fields `rating`, `year`, `team`, `position`, `name`
  (for units, `name` is absent — substituted with `None`), and `is_all_pro`
  (defaults to `False` if absent).
- All filters in the list must pass (AND). For OR logic, combine into a
  single expression string using Python's `or`.
- If an expression references a name not present for that entry (e.g.
  `avgTDPerGame` on a WR), the entry is excluded rather than raising — so
  `POSITIONS` is a convenience, not a requirement, for position-specific
  stat names.

## Output

A plain-text table printed via `pandas`, with columns:

- `Year`, `Team`, `Pos`, `Name`, `Rating`
- One column per distinct stat field referenced across `FILTERS` and
  `SORT_BY` (in order of first appearance)

Rows are filtered, sorted per `SORT_BY`/`SORT_DESC`, and truncated to
`LIMIT` if set. For unit entries, `Name` displays as `"<TEAM> <Position>"`
(e.g. `"KC OLine"`).

## Out of scope

- No CLI argument parsing — config-block-and-rerun only.
- No career-level aggregation across seasons — each row is one
  player-season (or unit-season).
- No derivation of true attempt-based TD%/INT% (the source data doesn't
  include attempts) — `FILTERS` operate on the per-game stat fields that
  actually exist (`avgTDPerGame`, `avgINTPerGame`, etc.).
