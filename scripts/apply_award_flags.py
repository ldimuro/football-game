"""Cross-reference All-Pro / MVP / OPY / DPY award CSVs against player JSON
files and stamp matching player entries with is_all_pro / is_mvp / is_opy /
is_dpy flags."""
import csv
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLAYERS_DIR = os.path.join(ROOT, 'public', 'data', 'players')
ALL_PRO_DIR = os.path.join(ROOT, 'public', 'data', 'all_pro_players')
AWARDS_DIR = os.path.join(ROOT, 'public', 'data', 'awards')

# Pro-Football-Reference team abbreviations (used in all_pro CSVs) -> the
# franchise abbreviation used in this project's player JSON files. Franchises
# that relocated are consolidated under the modern abbreviation, matching how
# the player JSON data files are organized.
PFR_ABBR_TO_JSON = {
    'ARI': 'ARI', 'ATL': 'ATL', 'BAL': 'BAL', 'BUF': 'BUF', 'CAR': 'CAR',
    'CHI': 'CHI', 'CIN': 'CIN', 'CLE': 'CLE', 'DAL': 'DAL', 'DEN': 'DEN',
    'DET': 'DET', 'GNB': 'GB', 'HOU': 'HOU', 'IND': 'IND', 'JAX': 'JAX',
    'KAN': 'KC', 'LAC': 'LAC', 'LAR': 'LA', 'LVR': 'LV', 'MIA': 'MIA',
    'MIN': 'MIN', 'NOR': 'NO', 'NWE': 'NE', 'NYG': 'NYG', 'NYJ': 'NYJ',
    'OAK': 'LV', 'PHI': 'PHI', 'PIT': 'PIT', 'SDG': 'LAC', 'SEA': 'SEA',
    'SFO': 'SF', 'STL': 'LA', 'TAM': 'TB', 'TEN': 'TEN', 'WAS': 'WAS',
    '2TM': None,
}

# Full franchise names (used in award CSVs) -> JSON abbreviation.
TEAM_NAME_TO_JSON = {
    'Arizona Cardinals': 'ARI', 'Atlanta Falcons': 'ATL',
    'Baltimore Ravens': 'BAL', 'Buffalo Bills': 'BUF',
    'Carolina Panthers': 'CAR', 'Chicago Bears': 'CHI',
    'Cincinnati Bengals': 'CIN', 'Cleveland Browns': 'CLE',
    'Dallas Cowboys': 'DAL', 'Denver Broncos': 'DEN',
    'Detroit Lions': 'DET', 'Green Bay Packers': 'GB',
    'Houston Texans': 'HOU', 'Houston Oilers': 'TEN',
    'Indianapolis Colts': 'IND', 'Jacksonville Jaguars': 'JAX',
    'Kansas City Chiefs': 'KC', 'Las Vegas Raiders': 'LV',
    'Los Angeles Chargers': 'LAC', 'Los Angeles Raiders': 'LV',
    'Los Angeles Rams': 'LA', 'Miami Dolphins': 'MIA',
    'Minnesota Vikings': 'MIN', 'New England Patriots': 'NE',
    'New Orleans Saints': 'NO', 'New York Giants': 'NYG',
    'New York Jets': 'NYJ', 'Oakland Raiders': 'LV',
    'Philadelphia Eagles': 'PHI', 'Pittsburgh Steelers': 'PIT',
    'San Diego Chargers': 'LAC', 'San Francisco 49ers': 'SF',
    'Seattle Seahawks': 'SEA', 'St. Louis Rams': 'LA',
    'Tampa Bay Buccaneers': 'TB', 'Tennessee Titans': 'TEN',
    'Tennessee Oilers': 'TEN', 'Washington Redskins': 'WAS',
    'Washington Football Team': 'WAS', 'Washington Commanders': 'WAS',
}


def short_name(full_name):
    """'Larry Fitzgerald' -> 'L.Fitzgerald', matching abbreviated K/P names."""
    parts = full_name.replace('.', '').split()
    if len(parts) < 2:
        return None
    return f"{parts[0][0]}.{parts[-1]}"


def load_year_index(year):
    """team_abbr -> list of player dicts (loaded from disk, mutable)."""
    year_dir = os.path.join(PLAYERS_DIR, str(year))
    index = {}
    if not os.path.isdir(year_dir):
        return None
    for fn in os.listdir(year_dir):
        if not fn.endswith('.json'):
            continue
        path = os.path.join(year_dir, fn)
        with open(path) as f:
            data = json.load(f)
        index[fn[:-5]] = (path, data)
    return index


def find_player(index, name, team_abbr, position=None):
    """Return list of (path, data, player_dict) matches across all teams,
    preferring an exact team match when one is known."""
    candidates = []
    alt = short_name(name)
    for abbr, (path, data) in index.items():
        for p in data.get('players', []):
            if p['name'] == name or (alt and p['name'] == alt):
                candidates.append((abbr, path, data, p))

    if not candidates:
        return []

    if team_abbr:
        team_matches = [c for c in candidates if c[0] == team_abbr]
        if team_matches:
            return team_matches

    return candidates


def apply_flag(matches, flag, label, year, name, dirty_paths):
    if not matches:
        return False
    if len(matches) > 1:
        print(f"  AMBIGUOUS {label} {year} {name}: "
              f"{[(c[0], c[3]['name']) for c in matches]} -- skipping")
        return False
    abbr, path, data, player = matches[0]
    if not player.get(flag):
        player[flag] = True
        dirty_paths.add(path)
    return True


def process_all_pro(year, index, dirty_paths, stats):
    csv_path = os.path.join(ALL_PRO_DIR, f'all_pro_{year}.csv')
    if not os.path.isfile(csv_path):
        return
    with open(csv_path) as f:
        for row in csv.DictReader(f):
            name = row['Player'].strip()
            pfr_abbr = row['Tm'].strip()
            json_abbr = PFR_ABBR_TO_JSON.get(pfr_abbr)
            matches = find_player(index, name, json_abbr, row.get('Pos'))
            if apply_flag(matches, 'is_all_pro', 'All-Pro', year, name, dirty_paths):
                stats['all_pro_matched'] += 1
            else:
                stats['all_pro_unmatched'] += 1
                if not matches:
                    stats['all_pro_unmatched_names'].append((year, name, pfr_abbr))


def process_award(csv_name, flag, label, year, index, dirty_paths, stats):
    csv_path = os.path.join(AWARDS_DIR, csv_name)
    with open(csv_path) as f:
        for row in csv.DictReader(f):
            if int(row['Year']) != year:
                continue
            name = row['Player'].strip()
            json_abbr = TEAM_NAME_TO_JSON.get(row['Tm'].strip())
            matches = find_player(index, name, json_abbr, row.get('Pos'))
            if apply_flag(matches, flag, label, year, name, dirty_paths):
                stats[f'{flag}_matched'] += 1
            else:
                stats[f'{flag}_unmatched'] += 1
                if not matches:
                    stats[f'{flag}_unmatched_names'].append((year, name, row['Tm']))


def main():
    years = sorted(int(fn.split('_')[-1].split('.')[0])
                   for fn in os.listdir(ALL_PRO_DIR) if fn.endswith('.csv'))

    stats = {
        'all_pro_matched': 0, 'all_pro_unmatched': 0, 'all_pro_unmatched_names': [],
        'is_mvp_matched': 0, 'is_mvp_unmatched': 0, 'is_mvp_unmatched_names': [],
        'is_opy_matched': 0, 'is_opy_unmatched': 0, 'is_opy_unmatched_names': [],
        'is_dpy_matched': 0, 'is_dpy_unmatched': 0, 'is_dpy_unmatched_names': [],
    }
    dirty_paths = set()
    indexes = {}

    for year in years:
        index = load_year_index(year)
        if index is None:
            print(f"-- {year}: no player data, skipping")
            continue
        indexes[year] = index
        process_all_pro(year, index, dirty_paths, stats)
        process_award('mvp_winners.csv', 'is_mvp', 'MVP', year, index, dirty_paths, stats)
        process_award('opy_winners.csv', 'is_opy', 'OPY', year, index, dirty_paths, stats)
        process_award('dpy_winners.csv', 'is_dpy', 'DPY', year, index, dirty_paths, stats)

    for path in dirty_paths:
        for year, index in indexes.items():
            for abbr, (p, data) in index.items():
                if p == path:
                    with open(path, 'w') as f:
                        json.dump(data, f, indent=2)
                        f.write('\n')

    print(f"\nFiles updated: {len(dirty_paths)}")
    for key in ('all_pro', 'is_mvp', 'is_opy', 'is_dpy'):
        print(f"{key}: matched={stats[f'{key}_matched']} "
              f"unmatched={stats[f'{key}_unmatched']}")
        for year, name, tm in stats[f'{key}_unmatched_names']:
            print(f"    no candidate: {year} {name} ({tm})")


if __name__ == '__main__':
    main()
