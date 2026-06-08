"""Add a `recYPG` field to existing RB player JSON entries, computed from the
same nflverse weekly data and per-player/season grouping used by preprocess.py
(receiving_yards summed over the season / games played)."""
import json
import os
import re

import nfl_data_py as nfl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLAYERS_DIR = os.path.join(ROOT, 'public', 'data', 'players')
YEARS = list(range(2000, 2025))

ID_RE = re.compile(r'^p_(?P<pid>.+)_(?P<team>[A-Z]+)_(?P<year>\d{4})$')


def compute_rb_rec_ypg():
    weekly = nfl.import_weekly_data(YEARS, [
        'player_id', 'position', 'season', 'week', 'receiving_yards',
    ])
    weekly = weekly.fillna(0)

    rb = {}
    for (pid, yr), grp in weekly.groupby(['player_id', 'season']):
        row = grp.iloc[0]
        if str(row.get('position', '')).upper() != 'RB':
            continue
        g = len(grp)
        rb[(pid, int(yr))] = round(float(grp['receiving_yards'].sum()) / g, 1)
    return rb


def main():
    print('Fetching weekly RB receiving data...')
    rec_ypg = compute_rb_rec_ypg()

    updated_files = 0
    updated_players = 0

    for year_name in sorted(os.listdir(PLAYERS_DIR)):
        year_dir = os.path.join(PLAYERS_DIR, year_name)
        if not os.path.isdir(year_dir):
            continue
        for fn in os.listdir(year_dir):
            if not fn.endswith('.json'):
                continue
            path = os.path.join(year_dir, fn)
            with open(path) as f:
                data = json.load(f)

            changed = False
            for p in data.get('players', []):
                if p['position'] != 'RB':
                    continue
                m = ID_RE.match(p['id'])
                if not m:
                    continue
                pid, yr = m.group('pid'), int(m.group('year'))
                if (pid, yr) in rec_ypg:
                    p['stats']['recYPG'] = rec_ypg[(pid, yr)]
                    changed = True
                    updated_players += 1

            if changed:
                with open(path, 'w') as f:
                    json.dump(data, f, indent=2)
                    f.write('\n')
                updated_files += 1

    print(f'Updated {updated_players} RBs across {updated_files} files.')


if __name__ == '__main__':
    main()
