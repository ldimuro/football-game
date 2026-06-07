"""Add new derived stat fields to existing QB/WR/RB/K player JSON entries:

  QB: replace tdRatio/intRatio with avgTDPerGame/avgINTPerGame, add completionPct
  WR: add avgTargetsPerGame / avgCatchesPerGame
  RB: add rushAttPerGame
  K:  add avgKickDistance / avgMissDistance / longestMadeKick

Recomputes from the same nflverse weekly + play-by-play sources used by
preprocess.py, using identical season-aggregation/qualification thresholds so
the player set stays unchanged -- only their `stats` dicts are augmented.
"""
import json
import os
import re

import nfl_data_py as nfl
import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLAYERS_DIR = os.path.join(ROOT, 'public', 'data', 'players')
YEARS = list(range(2000, 2025))

ID_RE = re.compile(r'^p_(?P<pid>.+)_(?P<team>[A-Z]+)_(?P<year>\d{4})$')


def compute_skill_stats():
    weekly = nfl.import_weekly_data(YEARS, [
        'player_id', 'player_display_name', 'position', 'recent_team', 'season', 'week',
        'attempts', 'completions', 'passing_tds', 'interceptions',
        'carries', 'rushing_yards', 'targets', 'receptions',
    ])
    weekly = weekly.fillna(0)
    season = weekly.copy()
    season['games'] = season.groupby(['player_id', 'season'])['week'].transform('count')

    # nflverse's `targets` column is unreliable for some seasons (it mirrors
    # `receptions` exactly, meaning real target counts weren't tracked/sourced
    # for that year). Detect and skip those seasons rather than reporting
    # targets/game identical to catches/game.
    receivers = season[season['position'].isin(['WR', 'TE'])]
    targets_reliable_by_year = {
        int(yr): bool((grp['targets'] != grp['receptions']).mean() > 0.5)
        for yr, grp in receivers.groupby('season')
    }

    qb, wr, rb = {}, {}, {}
    for (pid, yr), grp in season.groupby(['player_id', 'season']):
        row = grp.iloc[0]
        pos = str(row.get('position', '')).upper()
        g = len(grp)
        if g < 4:
            continue
        yr_int = int(yr)

        if pos == 'QB':
            atts = grp['attempts'].sum()
            if atts < 100:
                continue
            cmps = grp['completions'].sum()
            qb[(pid, yr_int)] = {
                'avgTDPerGame': round(float(grp['passing_tds'].sum()) / g, 3),
                'avgINTPerGame': round(float(grp['interceptions'].sum()) / g, 3),
                'completionPct': round(float(cmps) / atts, 4) if atts > 0 else 0.0,
            }
        elif pos in ('WR', 'TE'):
            tgt = grp['targets'].sum()
            if tgt < 20:
                continue
            wr[(pid, yr_int)] = {
                'avgTargetsPerGame': (round(float(tgt) / g, 2)
                                      if targets_reliable_by_year.get(yr_int) else None),
                'avgCatchesPerGame': round(float(grp['receptions'].sum()) / g, 2),
            }
        elif pos == 'RB':
            carries = grp['carries'].sum()
            if carries < 30:
                continue
            rb[(pid, yr_int)] = {
                'rushAttPerGame': round(float(carries) / g, 2),
            }

    return qb, wr, rb


def compute_kicker_stats():
    pbp = nfl.import_pbp_data(YEARS, columns=[
        'season', 'week', 'posteam', 'play_type', 'field_goal_result',
        'kicker_player_name', 'kicker_player_id', 'kick_distance',
    ], include_participation=False)
    fg = pbp[pbp['play_type'] == 'field_goal'].copy()

    kickers = {}
    for (_, yr), grp in fg.groupby(['posteam', 'season']):
        if len(grp) < 5 or 'kicker_player_id' not in grp.columns:
            continue
        kicker_id = str(grp['kicker_player_id'].mode().iloc[0])
        made = grp[grp['field_goal_result'] == 'made']
        missed = grp[grp['field_goal_result'] != 'made']
        kickers[(kicker_id, int(yr))] = {
            'avgKickDistance': round(float(grp['kick_distance'].mean()), 1) if len(grp) else 0.0,
            'avgMissDistance': round(float(missed['kick_distance'].mean()), 1) if len(missed) else 0.0,
            'longestMadeKick': int(made['kick_distance'].max()) if len(made) else 0,
        }
    return kickers


def main():
    print('Fetching weekly player data...')
    qb_stats, wr_stats, rb_stats = compute_skill_stats()
    print('Fetching play-by-play kicker data...')
    k_stats = compute_kicker_stats()

    updated_files = 0
    updated_players = 0
    unmatched = []

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
                m = ID_RE.match(p['id'])
                if not m:
                    continue
                pid, yr = m.group('pid'), int(m.group('year'))
                stats = p['stats']
                pos = p['position']

                if pos == 'QB' and (pid, yr) in qb_stats:
                    stats.pop('tdRatio', None)
                    stats.pop('intRatio', None)
                    stats.update(qb_stats[(pid, yr)])
                    changed = True
                    updated_players += 1
                elif pos == 'WR' and (pid, yr) in wr_stats:
                    stats.update(wr_stats[(pid, yr)])
                    changed = True
                    updated_players += 1
                elif pos == 'RB' and (pid, yr) in rb_stats:
                    stats.update(rb_stats[(pid, yr)])
                    changed = True
                    updated_players += 1
                elif pos == 'K' and (pid, yr) in k_stats:
                    stats.update(k_stats[(pid, yr)])
                    changed = True
                    updated_players += 1
                elif pos in ('QB', 'WR', 'RB', 'K'):
                    unmatched.append((year_name, fn, pos, p['name']))

            if changed:
                with open(path, 'w') as f:
                    json.dump(data, f, indent=2)
                    f.write('\n')
                updated_files += 1

    print(f'Updated {updated_players} players across {updated_files} files.')
    if unmatched:
        print(f'No new stats found for {len(unmatched)} players (insufficient volume to qualify, etc).')
        for entry in unmatched[:20]:
            print('   ', entry)


if __name__ == '__main__':
    main()
