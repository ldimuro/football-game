"""Compute a 55–100 skill rating for every player and unit based on
per-year, per-position percentile ranks.

Rating formula  : rating = round(55 + composite_pct * 45)
                  where composite_pct ∈ [0, 1]

Reads  : public/data/players/<year>/<TEAM>.json
Writes : rating field back into each file in-place

Position formulas (weights must sum to 1.0):

QB       : 0.30 passYPG  + 0.25 avgTDPerGame  + 0.20 INV(avgINTPerGame) + 0.25 qbr
WR       : 0.45 recYPG   + 0.30 tdPerGame     + 0.15 avgCatchesPerGame  + 0.10 avgTargetsPerGame
RB       : 0.35 rushYPG  + 0.25 tdPerGame     + 0.20 recYPG             + 0.20 rushAttPerGame
K        : 0.45 fgAccuracy + 0.25 longestMadeKick + 0.20 avgKickDistance + 0.10 avgMissDistance
OLine    : 0.40 INV(sacksAllowedPerGame) + 0.35 rushYPC + 0.25 rushTDPct
DLine    : 0.35 sackPct + 0.30 INV(rushYPCAllowed) + 0.20 INV(rushYPGAllowed) + 0.15 INV(rushTDPerGameAllowed)
Secondary: 0.30 INV(completionPctAllowed) + 0.30 INV(yardsPerAttemptAllowed) + 0.20 INV(passTDPerGameAllowed) + 0.20 interceptionsPerGame
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLAYERS_DIR = os.path.join(ROOT, 'public', 'data', 'players')

# (stat_field, invert)
POSITION_FORMULAS: dict[str, list[tuple[str, bool, float]]] = {
    'QB': [
        ('passYPG',       False, 0.30),
        ('avgTDPerGame',  False, 0.25),
        ('avgINTPerGame', True,  0.20),
        ('qbr',           False, 0.25),
    ],
    'WR': [
        ('recYPG',             False, 0.45),
        ('tdPerGame',          False, 0.30),
        ('avgCatchesPerGame',  False, 0.15),
        ('avgTargetsPerGame',  False, 0.10),
    ],
    'RB': [
        ('rushYPG',       False, 0.35),
        ('tdPerGame',     False, 0.25),
        ('recYPG',        False, 0.20),
        ('rushAttPerGame',False, 0.20),
    ],
    'K': [
        ('fgAccuracy',      False, 0.45),
        ('longestMadeKick', False, 0.25),
        ('avgKickDistance', False, 0.20),
        ('avgMissDistance', False, 0.10),
    ],
    'OLine': [
        ('sacksAllowedPerGame', True,  0.40),
        ('rushYPC',             False, 0.35),
        ('rushTDPct',           False, 0.25),
    ],
    'DLine': [
        ('sackPct',               False, 0.35),
        ('rushYPCAllowed',        True,  0.30),
        ('rushYPGAllowed',        True,  0.20),
        ('rushTDPerGameAllowed',  True,  0.15),
    ],
    'Secondary': [
        ('completionPctAllowed',    True,  0.30),
        ('yardsPerAttemptAllowed',  True,  0.30),
        ('passTDPerGameAllowed',    True,  0.20),
        ('interceptionsPerGame',    False, 0.20),
    ],
}


def midpoint_percentile(pool: list[float], value: float) -> float:
    """Return a 0-1 percentile using the midpoint method (avoids tie artefacts)."""
    n = len(pool)
    if n == 0:
        return 0.5
    less  = sum(1 for x in pool if x < value)
    equal = sum(1 for x in pool if x == value)
    return (less + 0.5 * equal) / n


def compute_rating(composite_pct: float) -> int:
    return round(55 + composite_pct * 45)


def main() -> None:
    years = sorted(
        d for d in os.listdir(PLAYERS_DIR)
        if os.path.isdir(os.path.join(PLAYERS_DIR, d))
    )

    total_rated = 0
    for year_name in years:
        year_dir = os.path.join(PLAYERS_DIR, year_name)

        # ── 1. Load all team files ──────────────────────────────────────────
        team_files: dict[str, dict] = {}
        for fn in os.listdir(year_dir):
            if fn.endswith('.json'):
                path = os.path.join(year_dir, fn)
                team_files[path] = json.load(open(path))

        # ── 2. Build stat pools keyed by position ───────────────────────────
        # pools[pos][field] = list of all values across every team
        pools: dict[str, dict[str, list[float]]] = {pos: {} for pos in POSITION_FORMULAS}

        for data in team_files.values():
            for entry in [*data.get('players', []), *data.get('units', [])]:
                pos = entry['position']
                if pos not in POSITION_FORMULAS:
                    continue
                stats = entry.get('stats', {})
                for field, _inv, _w in POSITION_FORMULAS[pos]:
                    val = stats.get(field)
                    if val is not None:
                        pools[pos].setdefault(field, []).append(float(val))

        # ── 3. Assign ratings ───────────────────────────────────────────────
        for path, data in team_files.items():
            changed = False
            for entry in [*data.get('players', []), *data.get('units', [])]:
                pos = entry['position']
                if pos not in POSITION_FORMULAS:
                    continue
                stats = entry.get('stats', {})
                formula = POSITION_FORMULAS[pos]

                composite = 0.0
                weight_used = 0.0
                for field, invert, weight in formula:
                    val = stats.get(field)
                    if val is None:
                        continue
                    pool = pools[pos].get(field, [])
                    pct = midpoint_percentile(pool, float(val))
                    if invert:
                        pct = 1.0 - pct
                    composite += pct * weight
                    weight_used += weight

                if weight_used > 0:
                    composite /= weight_used  # renormalize if any fields were missing
                rating = compute_rating(composite)
                entry['rating'] = rating
                changed = True
                total_rated += 1

            if changed:
                with open(path, 'w') as f:
                    json.dump(data, f, indent=2, sort_keys=True)
                    f.write('\n')

        print(f'{year_name}: processed {sum(len(d.get("players",[]))+len(d.get("units",[])) for d in team_files.values())} entries')

    print(f'\nDone — rated {total_rated} players/units total.')


if __name__ == '__main__':
    main()
