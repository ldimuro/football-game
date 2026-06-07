"""
NFL Stats Preprocessor
Outputs: public/data/meta.json, public/data/players/{year}/{team}.json,
         public/data/teams/{year}/{team}.json

Run: cd scripts && pip install -r requirements.txt && python preprocess.py
"""

import json
import os
import sys
from pathlib import Path

import nfl_data_py as nfl
import pandas as pd

YEARS = list(range(2000, 2025))
OUT = Path(__file__).parent.parent / "public" / "data"

TEAM_ABBR_MAP = {
    "ARI": "ARI", "ATL": "ATL", "BAL": "BAL", "BUF": "BUF",
    "CAR": "CAR", "CHI": "CHI", "CIN": "CIN", "CLE": "CLE",
    "DAL": "DAL", "DEN": "DEN", "DET": "DET", "GB": "GB",
    "HOU": "HOU", "IND": "IND", "JAX": "JAX", "KC": "KC",
    "LAC": "LAC", "LAR": "LAR", "LV": "LV", "MIA": "MIA",
    "MIN": "MIN", "NE": "NE", "NO": "NO", "NYG": "NYG",
    "NYJ": "NYJ", "PHI": "PHI", "PIT": "PIT", "SEA": "SEA",
    "SF": "SF", "TB": "TB", "TEN": "TEN", "WAS": "WAS",
    # legacy abbreviations
    "OAK": "LV", "SD": "LAC", "STL": "LAR",
}


def normalize_team(abbr: str) -> str:
    return TEAM_ABBR_MAP.get(abbr.upper(), abbr.upper())


def era_factor(series: pd.Series, value: float) -> float:
    mean = series.mean()
    return round(value / mean, 4) if mean > 0 else 1.0


def compute_league_averages(weekly: pd.DataFrame) -> dict:
    """Compute per-year league averages for era normalization."""
    avgs = {}
    weekly = weekly.copy()
    weekly["games"] = 1
    for year, grp in weekly.groupby("season"):
        qbs = grp[grp["position"] == "QB"].copy()
        qbs = qbs.groupby("player_id").agg({"passing_yards": "sum", "games": "sum"}).query("games >= 4")
        avg_pass_ypg = (qbs["passing_yards"] / qbs["games"]).mean() if len(qbs) > 0 else 250
        avgs[int(year)] = {"avg_pass_ypg": avg_pass_ypg}
    return avgs


def process_players(weekly: pd.DataFrame, era_avgs: dict) -> dict:
    """Returns {(team, year): {players: [...], units: [...]}}"""
    roster_map: dict = {}

    def add(key, category, entry):
        if key not in roster_map:
            roster_map[key] = {"players": [], "units": []}
        roster_map[key][category].append(entry)

    # Individual players: aggregate to season totals, compute per-game
    season = weekly.copy()
    season["games"] = season.groupby(["player_id", "season"])["week"].transform("count")

    for (pid, yr), grp in season.groupby(["player_id", "season"]):
        row = grp.iloc[0]
        pos = str(row.get("position", "")).upper()
        team = normalize_team(str(row.get("recent_team", "")))
        if team not in TEAM_ABBR_MAP.values():
            continue
        g = len(grp)
        if g < 4:
            continue
        key = (team, int(yr))
        yr_int = int(yr)

        if pos == "QB":
            pass_yds = grp["passing_yards"].sum()
            pass_td = grp["passing_tds"].sum()
            ints = grp["interceptions"].sum()
            atts = grp["attempts"].sum()
            epa = grp["passing_epa"].mean() if "passing_epa" in grp.columns else 0.0
            if atts < 100:
                continue
            ypg = round(pass_yds / g, 1)
            avg_ypg = era_avgs.get(yr_int, {}).get("avg_pass_ypg", 250)
            qbr = round(max(0, min(100, 50 + epa * 10)), 1)
            add(key, "players", {
                "id": f"p_{pid}_{team}_{yr_int}",
                "name": str(row.get("player_display_name", pid)),
                "position": "QB",
                "team": team,
                "year": yr_int,
                "stats": {
                    "passYPG": ypg,
                    "tdRatio": round(pass_td / atts, 4) if atts > 0 else 0,
                    "intRatio": round(ints / atts, 4) if atts > 0 else 0,
                    "qbr": qbr,
                },
                "eraNormFactor": era_factor(pd.Series([avg_ypg]), ypg),
            })

        elif pos in ("WR", "TE"):
            rec_yds = grp["receiving_yards"].sum()
            rec_td = grp["receiving_tds"].sum()
            tgt = grp["targets"].sum()
            if tgt < 20:
                continue
            ypg = round(rec_yds / g, 1)
            add(key, "players", {
                "id": f"p_{pid}_{team}_{yr_int}",
                "name": str(row.get("player_display_name", pid)),
                "position": "WR",
                "team": team,
                "year": yr_int,
                "stats": {"recYPG": ypg, "tdPerGame": round(rec_td / g, 3)},
                "eraNormFactor": 1.0,
            })

        elif pos == "RB":
            rush_yds = grp["rushing_yards"].sum()
            rush_td = grp["rushing_tds"].sum()
            carries = grp["carries"].sum()
            if carries < 30:
                continue
            ypg = round(rush_yds / g, 1)
            add(key, "players", {
                "id": f"p_{pid}_{team}_{yr_int}",
                "name": str(row.get("player_display_name", pid)),
                "position": "RB",
                "team": team,
                "year": yr_int,
                "stats": {"rushYPG": ypg, "tdPerGame": round(rush_td / g, 3)},
                "eraNormFactor": 1.0,
            })

    return roster_map


def process_kickers(pbp: pd.DataFrame, roster_map: dict) -> None:
    """Extract kicker FG accuracy from play-by-play and add to roster_map."""
    fg_plays = pbp[pbp["play_type"] == "field_goal"].copy()
    if fg_plays.empty:
        return

    for (team_raw, yr), grp in fg_plays.groupby(["posteam", "season"]):
        team = normalize_team(str(team_raw))
        yr_int = int(yr)
        key = (team, yr_int)
        att = len(grp)
        if att < 5:
            continue
        made = grp["field_goal_result"].eq("made").sum() if "field_goal_result" in grp.columns else 0
        accuracy = round(made / att, 4) if att > 0 else 0.0
        kicker_name = str(grp["kicker_player_name"].mode().iloc[0]) if "kicker_player_name" in grp.columns else "K"
        kicker_id = str(grp["kicker_player_id"].mode().iloc[0]) if "kicker_player_id" in grp.columns else f"k_{team}_{yr_int}"

        if key not in roster_map:
            roster_map[key] = {"players": [], "units": []}
        roster_map[key]["players"].append({
            "id": f"p_{kicker_id}_{team}_{yr_int}",
            "name": kicker_name,
            "position": "K",
            "team": team,
            "year": yr_int,
            "stats": {"fgAccuracy": accuracy},
            "eraNormFactor": 1.0,
        })


def compute_defense_stats(pbp: pd.DataFrame) -> dict:
    """Derive real D-Line and Secondary unit stats per team/season from play-by-play data.

    Returns {(team, year): {"dline": {...}, "secondary": {...}}} with normalizedRank
    computed relative to other teams in the same season (lower allowed yards = better).
    """
    defense: dict = {}
    plays = pbp.dropna(subset=["defteam"])

    for (team_raw, yr), grp in plays.groupby(["defteam", "season"]):
        team = normalize_team(str(team_raw))
        yr_int = int(yr)
        games = max(1, int(grp["week"].nunique()))

        rush = grp[grp["rush_attempt"] == 1]
        rush_attempts = len(rush)
        sacks = float(grp["sack"].sum())

        passes = grp[grp["pass_attempt"] == 1]
        pass_attempts = len(passes)

        defense[(team, yr_int)] = {
            "dline": {
                "sacksPerGame": round(sacks / games, 2),
                "rushYPCAllowed": round(float(rush["rushing_yards"].sum()) / rush_attempts, 2) if rush_attempts else 0.0,
                "rushTDPctAllowed": round(float(rush["rush_touchdown"].sum()) / rush_attempts, 4) if rush_attempts else 0.0,
            },
            "secondary": {
                "completionPctAllowed": round(float(passes["complete_pass"].sum()) / pass_attempts, 4) if pass_attempts else 0.0,
                "yardsPerAttemptAllowed": round(float(passes["passing_yards"].sum()) / pass_attempts, 2) if pass_attempts else 0.0,
                "tdPctAllowed": round(float(passes["pass_touchdown"].sum()) / pass_attempts, 4) if pass_attempts else 0.0,
                "intPct": round(float(passes["interception"].sum()) / pass_attempts, 4) if pass_attempts else 0.0,
            },
        }

    for yr in set(yr for _, yr in defense.keys()):
        yr_entries = [(team, d) for (team, y), d in defense.items() if y == yr]
        dline_sorted = sorted(yr_entries, key=lambda x: x[1]["dline"]["rushYPCAllowed"])
        secondary_sorted = sorted(yr_entries, key=lambda x: x[1]["secondary"]["yardsPerAttemptAllowed"])
        for rank, (team, _) in enumerate(dline_sorted, 1):
            defense[(team, yr)]["dline"]["normalizedRank"] = rank
        for rank, (team, _) in enumerate(secondary_sorted, 1):
            defense[(team, yr)]["secondary"]["normalizedRank"] = rank

    return defense


def process_team_units(schedules: pd.DataFrame, weekly: pd.DataFrame, roster_map: dict, defense_stats: dict) -> dict:
    """Compute O-Line, D-Line, Secondary units and team-level stats. Returns team_stats_map."""
    team_stats_map: dict = {}

    # Aggregate season rushing/passing offense and defense from weekly data
    off_rush = weekly.groupby(["recent_team", "season"]).agg(
        rush_yds=("rushing_yards", "sum"),
        rush_td=("rushing_tds", "sum"),
        carries=("carries", "sum"),
        games=("week", "count"),
    ).reset_index()

    off_pass = weekly.groupby(["recent_team", "season"]).agg(
        pass_yds=("passing_yards", "sum"),
        pass_td=("passing_tds", "sum"),
        attempts=("attempts", "sum"),
        completions=("completions", "sum"),
    ).reset_index()

    # Compute per-team season rushing stats for O-Line
    off_rush["ypc"] = (off_rush["rush_yds"] / off_rush["carries"]).fillna(0)
    off_rush["td_pct"] = (off_rush["rush_td"] / off_rush["carries"]).fillna(0)

    # Compute O-Line rank per year (lower sacks allowed = better)
    # We'll derive sacks allowed from opponent's sack data (not in weekly by default — approximate)
    # Use rushing YPC rank as primary O-Line metric
    for yr, yr_grp in off_rush.groupby("season"):
        yr_int = int(yr)
        yr_grp = yr_grp.copy()
        yr_grp["oline_rank"] = yr_grp["ypc"].rank(ascending=False).astype(int)
        yr_grp["dline_rank"] = yr_grp["ypc"].rank(ascending=True).astype(int)  # lower YPC allowed = better DL

        for _, row in yr_grp.iterrows():
            team = normalize_team(str(row["recent_team"]))
            g = max(1, int(row["games"]))
            key = (team, yr_int)

            if key not in roster_map:
                roster_map[key] = {"players": [], "units": []}

            roster_map[key]["units"].append({
                "id": f"u_{team}_OLine_{yr_int}",
                "position": "OLine",
                "team": team,
                "year": yr_int,
                "stats": {
                    "sacksAllowedPerGame": 2.5,  # placeholder; needs PBP sack data
                    "rushYPC": round(float(row["ypc"]), 2),
                    "rushTDPct": round(float(row["td_pct"]), 4),
                    "normalizedRank": int(row["oline_rank"]),
                },
                "eraNormFactor": 1.0,
            })

    # D-Line and Secondary: derived from real play-by-play defensive stats (compute_defense_stats)
    fallback_dline = {"sacksPerGame": 2.5, "rushYPCAllowed": 4.2, "rushTDPctAllowed": 0.045, "normalizedRank": 16}
    fallback_secondary = {"completionPctAllowed": 0.635, "yardsPerAttemptAllowed": 7.0, "tdPctAllowed": 0.04, "intPct": 0.025, "normalizedRank": 16}
    for (team_raw, yr), grp in schedules.groupby(["home_team", "season"]):
        team = normalize_team(str(team_raw))
        yr_int = int(yr)
        key = (team, yr_int)
        if key not in roster_map:
            roster_map[key] = {"players": [], "units": []}

        team_defense = defense_stats.get(key)

        if not any(u["position"] == "DLine" for u in roster_map[key].get("units", [])):
            roster_map[key]["units"].append({
                "id": f"u_{team}_DLine_{yr_int}",
                "position": "DLine",
                "team": team,
                "year": yr_int,
                "stats": team_defense["dline"] if team_defense else fallback_dline,
                "eraNormFactor": 1.0,
            })

        if not any(u["position"] == "Secondary" for u in roster_map[key].get("units", [])):
            roster_map[key]["units"].append({
                "id": f"u_{team}_Secondary_{yr_int}",
                "position": "Secondary",
                "team": team,
                "year": yr_int,
                "stats": team_defense["secondary"] if team_defense else fallback_secondary,
                "eraNormFactor": 1.0,
            })

    # Build team_stats_map from schedules
    for (team_raw, yr), grp in schedules.groupby(["home_team", "season"]):
        team = normalize_team(str(team_raw))
        yr_int = int(yr)
        team_stats_map[(team, yr_int)] = {
            "team": team, "year": yr_int,
            "offenseRank": 16, "defenseRank": 16,
            "qbAvgYPG": 0.0, "rbAvgYPG": 0.0, "wrAvgYPG": 0.0,
            "defPointsAllowed": float(grp["away_score"].mean()) if "away_score" in grp.columns else 22.0,
        }

    # Fill in per-team YPG stats from weekly
    for (team_raw, yr), grp in weekly.groupby(["recent_team", "season"]):
        team = normalize_team(str(team_raw))
        yr_int = int(yr)
        key = (team, yr_int)
        if key not in team_stats_map:
            team_stats_map[key] = {
                "team": team, "year": yr_int,
                "offenseRank": 16, "defenseRank": 16,
                "qbAvgYPG": 0.0, "rbAvgYPG": 0.0, "wrAvgYPG": 0.0,
                "defPointsAllowed": 22.0,
            }
        g = max(1, len(grp["week"].unique()))
        qb_rows = grp[grp["position"] == "QB"]
        rb_rows = grp[grp["position"] == "RB"]
        wr_rows = grp[grp["position"].isin(["WR", "TE"])]
        if not qb_rows.empty:
            team_stats_map[key]["qbAvgYPG"] = round(qb_rows["passing_yards"].sum() / g, 1)
        if not rb_rows.empty:
            team_stats_map[key]["rbAvgYPG"] = round(rb_rows["rushing_yards"].sum() / g, 1)
        if not wr_rows.empty:
            team_stats_map[key]["wrAvgYPG"] = round(wr_rows["receiving_yards"].sum() / g, 1)

    # Compute offense/defense ranks per year
    for yr in set(yr for _, yr in team_stats_map.keys()):
        yr_teams = [(t, d) for (t, y), d in team_stats_map.items() if y == yr]
        total_off = sorted(yr_teams, key=lambda x: (x[1]["qbAvgYPG"] + x[1]["rbAvgYPG"] + x[1]["wrAvgYPG"]), reverse=True)
        total_def = sorted(yr_teams, key=lambda x: x[1]["defPointsAllowed"])
        for rank, (team, _) in enumerate(total_off, 1):
            team_stats_map[(team, yr)]["offenseRank"] = rank
        for rank, (team, _) in enumerate(total_def, 1):
            team_stats_map[(team, yr)]["defenseRank"] = rank

    return team_stats_map


def write_outputs(roster_map: dict, team_stats_map: dict) -> list:
    meta = []
    for (team, yr), data in roster_map.items():
        if not data["players"] and not data["units"]:
            continue
        player_dir = OUT / "players" / str(yr)
        player_dir.mkdir(parents=True, exist_ok=True)
        with open(player_dir / f"{team}.json", "w") as f:
            json.dump(data, f, indent=2)
        meta.append({"team": team, "year": yr})

    for (team, yr), stats in team_stats_map.items():
        team_dir = OUT / "teams" / str(yr)
        team_dir.mkdir(parents=True, exist_ok=True)
        with open(team_dir / f"{team}.json", "w") as f:
            json.dump(stats, f, indent=2)

    with open(OUT / "meta.json", "w") as f:
        json.dump(sorted(meta, key=lambda x: (x["year"], x["team"])), f, indent=2)

    return meta


def main():
    print(f"Fetching weekly player data for {YEARS[0]}–{YEARS[-1]}...")
    weekly_cols = [
        "player_id", "player_display_name", "position", "recent_team", "season", "week",
        "passing_yards", "passing_tds", "interceptions", "attempts", "completions", "passing_epa",
        "rushing_yards", "rushing_tds", "carries",
        "receiving_yards", "receiving_tds", "receptions", "targets",
    ]
    weekly = nfl.import_weekly_data(YEARS, weekly_cols)
    weekly = weekly.fillna(0)

    print("Computing era averages...")
    era_avgs = compute_league_averages(weekly)

    print("Processing player stats...")
    roster_map = process_players(weekly, era_avgs)

    print("Fetching schedules...")
    schedules = nfl.import_schedules(YEARS)

    print("Fetching play-by-play data (this may take a while)...")
    pbp_cols = [
        "season", "week", "posteam", "defteam", "play_type",
        "field_goal_result", "kicker_player_name", "kicker_player_id",
        "sack", "rush_attempt", "rushing_yards", "rush_touchdown",
        "pass_attempt", "complete_pass", "passing_yards", "pass_touchdown", "interception",
    ]
    pbp = None
    defense_stats = {}
    try:
        pbp = nfl.import_pbp_data(YEARS, columns=pbp_cols, include_participation=False)
        defense_stats = compute_defense_stats(pbp)
    except Exception as e:
        print(f"Warning: Could not fetch play-by-play data: {e}")

    print("Processing team units and team stats...")
    team_stats_map = process_team_units(schedules, weekly, roster_map, defense_stats)

    if pbp is not None:
        print("Processing kicker stats...")
        try:
            process_kickers(pbp, roster_map)
        except Exception as e:
            print(f"Warning: Could not process kicker data: {e}")

    print("Writing output files...")
    meta = write_outputs(roster_map, team_stats_map)
    print(f"Done. Generated {len(meta)} team/year combos.")
    print(f"Output written to {OUT}")


if __name__ == "__main__":
    main()
