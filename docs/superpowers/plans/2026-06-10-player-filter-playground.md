# Player Stat Filter Playground Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `scripts/player_filter.py`, a config-and-rerun playground script for filtering the historical player/unit dataset by arbitrary stat conditions.

**Architecture:** Single standalone script following the conventions of the other `scripts/*.py` data tools (docstring header, `ROOT`/`PLAYERS_DIR` constants, `if __name__ == '__main__': main()`). Loads and flattens `players` + `units` from every `public/data/players/<year>/<TEAM>.json`, applies a `FILTERS` list as `eval`'d boolean expressions, sorts/limits, and prints a `pandas` table. No new dependencies — `pandas` is already in `scripts/requirements.txt`.

**Tech Stack:** Python 3, `pandas` (table printing only).

---

### Task 1: Create `scripts/player_filter.py`

**Files:**
- Create: `scripts/player_filter.py`

- [ ] **Step 1: Write the script**

```python
"""
Player Stat Filter Playground

Ad-hoc exploration of public/data/players/<year>/<TEAM>.json. Edit the
CONFIG block below and re-run:

    python scripts/player_filter.py
"""
import json
import os
import re

import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLAYERS_DIR = os.path.join(ROOT, 'public', 'data', 'players')

# ====================== CONFIG — edit and re-run ======================
# Which positions to consider (QB, WR, RB, K, OLine, DLine, Secondary).
# Empty list or None = all positions.
POSITIONS = ["QB"]

# Each entry is a Python boolean expression evaluated against that
# player/unit's stats (plus rating, year, team, position, name, is_all_pro).
# ALL filters must pass (AND). For OR logic, combine into one expression
# using Python's `or`.
FILTERS = [
    "avgTDPerGame > 2.0",
    "avgINTPerGame < 0.5",
]

# Stat field name, "rating", or "year". None = no sorting.
SORT_BY = "avgTDPerGame"
SORT_DESC = True

# Cap the number of rows printed. None = no limit.
LIMIT = None
# ========================================================================

NON_STAT_NAMES = {
    'and', 'or', 'not', 'True', 'False', 'None',
    'rating', 'year', 'team', 'position', 'name', 'is_all_pro',
}


def load_entries():
    """Load and flatten every player/unit entry from public/data/players."""
    entries = []
    for year in sorted(os.listdir(PLAYERS_DIR)):
        year_dir = os.path.join(PLAYERS_DIR, year)
        if not os.path.isdir(year_dir):
            continue
        for filename in sorted(os.listdir(year_dir)):
            if not filename.endswith('.json'):
                continue
            with open(os.path.join(year_dir, filename)) as f:
                data = json.load(f)
            for entry in data.get('players', []):
                entries.append({**entry, 'kind': 'player'})
            for entry in data.get('units', []):
                entries.append({**entry, 'kind': 'unit'})
    return entries


def matches_filters(entry, filters):
    """Return True if entry satisfies every filter expression (AND)."""
    namespace = dict(entry.get('stats', {}))
    namespace.update({
        'rating': entry.get('rating'),
        'year': entry.get('year'),
        'team': entry.get('team'),
        'position': entry.get('position'),
        'name': entry.get('name'),
        'is_all_pro': entry.get('is_all_pro', False),
    })
    for expr in filters:
        try:
            if not eval(expr, {'__builtins__': {}}, namespace):
                return False
        except NameError:
            return False
    return True


def label(entry):
    """Display name for a player, or '<TEAM> <Position>' for a unit."""
    if entry.get('name'):
        return entry['name']
    return f"{entry['team']} {entry['position']}"


def stat_columns(filters, sort_by):
    """Stat field names referenced across filters/sort, in first-seen order."""
    columns = []
    exprs = list(filters) + ([sort_by] if sort_by else [])
    for expr in exprs:
        for token in re.findall(r'[A-Za-z_][A-Za-z0-9_]*', expr):
            if token in NON_STAT_NAMES or token in columns:
                continue
            columns.append(token)
    return columns


def main():
    entries = load_entries()

    if POSITIONS:
        entries = [e for e in entries if e['position'] in POSITIONS]

    matches = [e for e in entries if matches_filters(e, FILTERS)]

    columns = stat_columns(FILTERS, SORT_BY)

    if SORT_BY:
        def sort_key(e):
            if SORT_BY in ('rating', 'year'):
                return e.get(SORT_BY, 0)
            return e.get('stats', {}).get(SORT_BY, float('-inf'))
        matches.sort(key=sort_key, reverse=SORT_DESC)

    if LIMIT:
        matches = matches[:LIMIT]

    if not matches:
        print("No matches.")
        return

    rows = []
    for e in matches:
        row = {
            'Year': e['year'],
            'Team': e['team'],
            'Pos': e['position'],
            'Name': label(e),
            'Rating': e.get('rating'),
        }
        for col in columns:
            row[col] = e.get('stats', {}).get(col)
        rows.append(row)

    df = pd.DataFrame(rows)
    print(df.to_string(index=False))
    print(f"\n{len(rows)} match(es)")


if __name__ == '__main__':
    main()
```

- [ ] **Step 2: Smoke-check data loading**

Run:
```bash
cd /Users/loudimuro/Desktop/claude_projects/football-game && python3 -c "
from scripts.player_filter import load_entries
entries = load_entries()
print(len(entries))
print(sum(1 for e in entries if e['kind'] == 'unit'))
print(sum(1 for e in entries if e['position'] == 'QB'))
"
```
Expected: three positive integers printed (total entries, unit count, QB count), no errors. This confirms `load_entries()` walks all 25 year directories and correctly tags `players` vs `units`.

- [ ] **Step 3: Run with the default CONFIG (QB example from the spec)**

Run:
```bash
cd /Users/loudimuro/Desktop/claude_projects/football-game && python3 scripts/player_filter.py
```
Expected: a `pandas` table with columns `Year Team Pos Name Rating avgTDPerGame avgINTPerGame`, one row per QB-season (2000–2024) where `avgTDPerGame > 2.0` and `avgINTPerGame < 0.5`, sorted by `avgTDPerGame` descending, followed by a line like `N match(es)`. No tracebacks.

- [ ] **Step 4: Sanity-check the unit/cross-position path**

Temporarily edit the CONFIG block to:
```python
POSITIONS = ["DLine"]
FILTERS = [
    "sackPct > 0.07",
]
SORT_BY = "sackPct"
SORT_DESC = True
LIMIT = 10
```
Run:
```bash
cd /Users/loudimuro/Desktop/claude_projects/football-game && python3 scripts/player_filter.py
```
Expected: a table with columns `Year Team Pos Name Rating sackPct`, up to 10 rows, where `Name` shows `"<TEAM> DLine"` (units have no `name` field), sorted by `sackPct` descending. No tracebacks.

Then revert the CONFIG block back to the original QB example values shown in Step 1 (`POSITIONS = ["QB"]`, the two `avgTDPerGame`/`avgINTPerGame` filters, `SORT_BY = "avgTDPerGame"`, `SORT_DESC = True`, `LIMIT = None`).

- [ ] **Step 5: Commit**

```bash
git add scripts/player_filter.py
git commit -m "$(cat <<'EOF'
feat: add player stat filter playground script

EOF
)"
```
