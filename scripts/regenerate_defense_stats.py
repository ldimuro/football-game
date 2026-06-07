"""Regenerate D-Line and Secondary unit stats for every team/year from the
real defensive box-score CSVs in public/data/defenses (replacing the earlier
play-by-play-derived estimates baked into the player JSON files)."""
import glob
import json
import os

import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLAYERS_DIR = os.path.join(ROOT, 'public', 'data', 'players')
DEFENSES_DIR = os.path.join(ROOT, 'public', 'data', 'defenses')

SUMMARY_ROWS = {'Avg Team', 'League Total', 'Avg Tm/G'}

# Full franchise names (as they appear in the defense CSVs, across relocations)
# -> the abbreviation used in this project's player JSON files.
TEAM_NAME_TO_JSON = {
    'Arizona Cardinals': 'ARI', 'Atlanta Falcons': 'ATL',
    'Baltimore Ravens': 'BAL', 'Buffalo Bills': 'BUF',
    'Carolina Panthers': 'CAR', 'Chicago Bears': 'CHI',
    'Cincinnati Bengals': 'CIN', 'Cleveland Browns': 'CLE',
    'Dallas Cowboys': 'DAL', 'Denver Broncos': 'DEN',
    'Detroit Lions': 'DET', 'Green Bay Packers': 'GB',
    'Houston Texans': 'HOU', 'Indianapolis Colts': 'IND',
    'Jacksonville Jaguars': 'JAX', 'Kansas City Chiefs': 'KC',
    'Las Vegas Raiders': 'LV', 'Oakland Raiders': 'LV',
    'Los Angeles Raiders': 'LV', 'Los Angeles Chargers': 'LAC',
    'San Diego Chargers': 'LAC', 'Los Angeles Rams': 'LA',
    'St. Louis Rams': 'LA', 'Miami Dolphins': 'MIA',
    'Minnesota Vikings': 'MIN', 'New England Patriots': 'NE',
    'New Orleans Saints': 'NO', 'New York Giants': 'NYG',
    'New York Jets': 'NYJ', 'Philadelphia Eagles': 'PHI',
    'Pittsburgh Steelers': 'PIT', 'San Francisco 49ers': 'SF',
    'Seattle Seahawks': 'SEA', 'Tampa Bay Buccaneers': 'TB',
    'Tennessee Titans': 'TEN', 'Tennessee Oilers': 'TEN',
    'Houston Oilers': 'TEN', 'Washington Redskins': 'WAS',
    'Washington Football Team': 'WAS', 'Washington Commanders': 'WAS',
}


def parse_pct(val):
    if isinstance(val, str):
        return round(float(val.strip().rstrip('%')) / 100, 4)
    return round(float(val) / 100, 4)


def load_team_rows(csv_path, header=0):
    df = pd.read_csv(csv_path, header=header)
    df = df[~df['Tm'].isin(SUMMARY_ROWS)]
    for _, row in df.iterrows():
        abbr = TEAM_NAME_TO_JSON.get(row['Tm'])
        if abbr:
            yield abbr, row


def compute_year_stats(year):
    """Returns {team_abbr: {'dline': {...}, 'secondary': {...}}} for a season,
    with normalizedRank filled in relative to the rest of the league."""
    defenses_csv = os.path.join(DEFENSES_DIR, f'{year}_defenses.csv')
    advanced_csv = os.path.join(DEFENSES_DIR, f'{year}_defenses_advanced.csv')
    if not (os.path.isfile(defenses_csv) and os.path.isfile(advanced_csv)):
        return None

    base = {}
    for abbr, row in load_team_rows(defenses_csv, header=1):
        games = float(row['G'])
        pass_att, pass_cmp = float(row['Att']), float(row['Cmp'])
        rush_yds, rush_td = float(row['Yds.2']), float(row['TD.1'])
        pass_yds, pass_td, pass_int = float(row['Yds.1']), float(row['TD']), float(row['Int'])
        base[abbr] = {
            'dline': {
                'rushYPCAllowed': round(float(row['Y/A']), 2),
                'rushYPGAllowed': round(rush_yds / games, 2),
                'rushTDPerGameAllowed': round(rush_td / games, 2),
            },
            'secondary': {
                'completionPctAllowed': round(pass_cmp / pass_att, 4) if pass_att else 0.0,
                'yardsPerAttemptAllowed': round(float(row['NY/A']), 2),
                'passYPGAllowed': round(pass_yds / games, 2),
                'passTDPerGameAllowed': round(pass_td / games, 2),
                'interceptionsPerGame': round(pass_int / games, 2),
            },
        }

    # Pre-2018 advanced tables lack the pass-rush pressure columns (Bltz%/Prss%
    # weren't tracked by PFR until 2018); leave those at 0 for those seasons.
    has_pressure_cols = 'Bltz%' in pd.read_csv(advanced_csv, nrows=0).columns
    for abbr, row in load_team_rows(advanced_csv):
        if abbr not in base:
            continue
        sk, att = float(row['Sk']), float(row['Att'])
        base[abbr]['dline']['sackPct'] = round(sk / att, 4) if att else 0.0
        if has_pressure_cols:
            base[abbr]['dline']['blitzPct'] = parse_pct(row['Bltz%'])
            base[abbr]['dline']['pressurePct'] = parse_pct(row['Prss%'])
        else:
            base[abbr]['dline']['blitzPct'] = 0.0
            base[abbr]['dline']['pressurePct'] = 0.0

    dline_sorted = sorted(base.items(), key=lambda kv: kv[1]['dline']['rushYPGAllowed'])
    secondary_sorted = sorted(base.items(), key=lambda kv: kv[1]['secondary']['passYPGAllowed'])
    for rank, (abbr, _) in enumerate(dline_sorted, 1):
        base[abbr]['dline']['normalizedRank'] = rank
    for rank, (abbr, _) in enumerate(secondary_sorted, 1):
        base[abbr]['secondary']['normalizedRank'] = rank

    return base


def main():
    years = sorted(int(os.path.basename(p).split('_')[0])
                   for p in glob.glob(os.path.join(DEFENSES_DIR, '*_defenses.csv')))

    updated_files = 0
    updated_units = 0
    skipped_years = []

    for year in years:
        year_dir = os.path.join(PLAYERS_DIR, str(year))
        if not os.path.isdir(year_dir):
            continue

        year_stats = compute_year_stats(year)
        if year_stats is None:
            skipped_years.append(year)
            continue

        for fn in os.listdir(year_dir):
            if not fn.endswith('.json'):
                continue
            abbr = fn[:-5]
            stats = year_stats.get(abbr)
            if stats is None:
                # Some seasons split the Rams' offense (LA.json) and defense
                # (LAR.json) across two team files; both represent the same
                # franchise, so the LAR defensive units reuse the LA stats.
                if abbr == 'LAR' and 'LA' in year_stats:
                    stats = year_stats['LA']
                else:
                    continue

            path = os.path.join(year_dir, fn)
            with open(path) as f:
                data = json.load(f)

            changed = False
            for unit in data.get('units', []):
                if unit['position'] == 'DLine':
                    unit['stats'] = stats['dline']
                    changed = True
                    updated_units += 1
                elif unit['position'] == 'Secondary':
                    unit['stats'] = stats['secondary']
                    changed = True
                    updated_units += 1

            if changed:
                with open(path, 'w') as f:
                    json.dump(data, f, indent=2)
                    f.write('\n')
                updated_files += 1

    print(f"Updated {updated_units} units across {updated_files} files.")
    if skipped_years:
        print(f"Skipped years (missing/incomplete defense CSVs): {skipped_years}")


if __name__ == '__main__':
    main()
