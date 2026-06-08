"""Compute per-year, per-position league-average stat values from the player
and unit JSON files, so the UI can color-code a stat green/orange/red relative
to its league average for that season.

Writes src/data/leagueAverages.json shaped as:
  { [year]: { QB: {field: avg, ...}, WR: {...}, ..., OLine: {...}, ... } }

`normalizedRank` is intentionally excluded -- ranks are colored by their own
1-32 scale, not relative to a league average.
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLAYERS_DIR = os.path.join(ROOT, 'public', 'data', 'players')
OUT_PATH = os.path.join(ROOT, 'src', 'data', 'leagueAverages.json')


def main():
    sums = {}
    counts = {}

    for year_name in sorted(os.listdir(PLAYERS_DIR)):
        year_dir = os.path.join(PLAYERS_DIR, year_name)
        if not os.path.isdir(year_dir):
            continue
        year = int(year_name)

        for fn in os.listdir(year_dir):
            if not fn.endswith('.json'):
                continue
            data = json.load(open(os.path.join(year_dir, fn)))

            for entry in [*data.get('players', []), *data.get('units', [])]:
                pos = entry['position']
                stats = entry['stats']
                key = (year, pos)
                for field, value in stats.items():
                    if field == 'normalizedRank' or value is None:
                        continue
                    sums.setdefault(key, {}).setdefault(field, 0.0)
                    counts.setdefault(key, {}).setdefault(field, 0)
                    sums[key][field] += float(value)
                    counts[key][field] += 1

    result = {}
    for (year, pos), fields in sums.items():
        result.setdefault(str(year), {})[pos] = {
            field: round(total / counts[(year, pos)][field], 4)
            for field, total in fields.items()
        }

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, 'w') as f:
        json.dump(result, f, indent=2, sort_keys=True)
        f.write('\n')

    print(f'Wrote league averages for {len(result)} years to {OUT_PATH}')


if __name__ == '__main__':
    main()
