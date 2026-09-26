# HIGH SCHOOL BASKETBALL LEGENDS — Simulation Report

Generated 2026-09-26T08:45:57.589Z — headless engine, 4x10 min + 5 min OT, FIBA fouls (5 PF, bonus from 5th team foul).

## 1. Mass simulation: 1000 random matches (random CPU templates & strength levels)

Per team per game averages:

| Metric | Value | Target (HS 40 min) |
|---|---|---|
| Points | 74.3 | 60–95 typical |
| Possessions | 76.2 | ~65–78 |
| FG% | 43.7 | 40–50 |
| 3P% | 33.8 | 30–38 |
| FT% | 70.7 | 65–75 |
| FGA | 64.6 |  |
| 3PA | 18.3 |  |
| FTA | 16.6 |  |
| Rebounds | 39.1 | ~35–42 |
| Off. rebounds | 10.2 | ~9–13 |
| Assists | 14.4 | ~12–17 |
| Turnovers | 14.0 | ~12–17 |
| Steals | 7.2 | ~6–9 |
| Blocks | 3.1 | ~2.5–5 |
| Fouls | 16.2 | ~15–20 |
| Fast-break pts | 7.9 |  |
| Paint pts | 31.2 |  |
| Overtime games % | 1.8 | ~4–8 |
| Team scores within 60–95 % | 67.2 | majority |
| Lowest / highest team score | 17 / 146 | allow 40s defensive games and 100+ shootouts |
| 10th / 90th percentile score | 52 / 97 |  |
| Avg winning margin | 20.1 |  |
| Foul-outs per game | 0.7 |  |
| 30-point individual games | 171 | rare but possible |
| Avg starter minutes | 29.7 | ~25–32 |
| Stat-consistency violations | 0 | 0 |

## 2. Balance matchups (200 games each, fresh CPU teams every game; "A" is the first team)

| Matchup | Games | A win% | PPG | Poss | FG% | 3P% | FT% | REB | OREB | AST | TO | STL | BLK | PF | FTA | 3PA | OT% | Avg margin | Errors |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Strong v Strong | 200 | 54.0 | 75.1 | 72.8 | 45.5 | 37.1 | 72.7 | 36.8 | 9.9 | 14.8 | 12.2 | 6.0 | 3.4 | 16.0 | 16.3 | 16.0 | 2.0 | 13.2 | 0 |
| Strong v Average | 200 | 81.5 | 71.9 | 74.0 | 43.5 | 33.9 | 70.6 | 38.4 | 10.0 | 14.0 | 13.1 | 6.5 | 3.6 | 16.2 | 16.2 | 15.9 | 1.5 | 15.7 | 0 |
| Average v Average | 200 | 49.5 | 69.4 | 74.9 | 42.3 | 30.8 | 65.7 | 39.5 | 10.2 | 13.1 | 14.3 | 7.1 | 2.8 | 17.2 | 17.7 | 15.6 | 0.5 | 15.7 | 0 |
| Weak v Strong | 200 | 1.5 | 71.2 | 75.0 | 43.1 | 33.5 | 69.8 | 38.1 | 10.0 | 13.9 | 14.9 | 7.6 | 2.7 | 16.2 | 15.9 | 18.4 | 0.0 | 31.0 | 0 |
| Small Ball v Twin Towers | 200 | 38.0 | 71.7 | 75.3 | 43.2 | 32.5 | 65.8 | 39.4 | 10.5 | 13.6 | 14.1 | 7.1 | 2.8 | 16.6 | 17.7 | 16.4 | 3.5 | 15.7 | 0 |
| Three-Point Army v Inside Dominance | 200 | 28.0 | 68.9 | 71.6 | 43.5 | 31.7 | 66.8 | 37.4 | 10.3 | 13.4 | 13.4 | 6.6 | 2.1 | 15.5 | 15.3 | 17.1 | 2.5 | 16.1 | 0 |
| Defense First v Run & Gun | 200 | 63.5 | 74.3 | 81.1 | 42.5 | 31.2 | 66.2 | 41.3 | 10.1 | 14.8 | 16.7 | 8.9 | 2.8 | 18.3 | 19.6 | 18.1 | 2.0 | 16.6 | 0 |
| Super Team v Balanced Strong | 200 | 80.0 | 76.4 | 73.2 | 45.8 | 37.2 | 77.5 | 36.7 | 9.7 | 15.6 | 11.9 | 5.8 | 3.9 | 14.9 | 14.8 | 16.6 | 2.5 | 15.9 | 0 |

## 3. Extreme lineups vs a balanced Average-Strong team (200 games each)

| Matchup | Games | A win% | PPG | Poss | FG% | 3P% | FT% | REB | OREB | AST | TO | STL | BLK | PF | FTA | 3PA | OT% | Avg margin | Errors |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 5 PG | 200 | 32.5 | 74.4 | 72.8 | 44.6 | 33.6 | 70.3 | 38.0 | 10.9 | 14.2 | 12.2 | 6.1 | 2.6 | 16.9 | 17.7 | 17.0 | 2.5 | 15.5 | 0 |
| 5 SG | 200 | 28.0 | 71.3 | 73.7 | 43.0 | 33.1 | 72.0 | 38.1 | 10.1 | 13.4 | 13.9 | 7.0 | 2.5 | 16.5 | 16.6 | 17.6 | 4.0 | 15.5 | 0 |
| 5 SF | 200 | 56.0 | 73.0 | 74.6 | 43.6 | 34.5 | 73.7 | 38.0 | 9.8 | 14.0 | 13.6 | 7.0 | 3.4 | 16.3 | 16.6 | 16.7 | 1.0 | 14.9 | 0 |
| 5 PF | 200 | 64.0 | 71.0 | 74.2 | 43.2 | 31.4 | 68.4 | 38.8 | 10.8 | 13.4 | 13.6 | 6.6 | 3.6 | 17.1 | 18.0 | 13.8 | 3.0 | 14.1 | 0 |
| 5 C | 200 | 50.5 | 70.3 | 74.8 | 44.1 | 31.9 | 68.1 | 37.7 | 9.7 | 13.3 | 14.6 | 7.3 | 4.0 | 16.9 | 17.7 | 12.2 | 2.0 | 12.2 | 0 |
| Top-5 overall (all superstars) v Balanced Strong | 200 | 75.0 | 74.7 | 73.4 | 44.9 | 36.1 | 75.2 | 37.3 | 9.9 | 14.9 | 12.4 | 6.2 | 4.0 | 15.2 | 15.5 | 16.1 | 2.5 | 14.8 | 0 |
| Superstar + Role Players v Defense First | 200 | 69.5 | 62.0 | 66.8 | 42.2 | 30.4 | 69.2 | 35.2 | 8.9 | 10.9 | 12.4 | 5.9 | 2.7 | 15.2 | 14.9 | 13.5 | 1.0 | 16.0 | 0 |

Lineup pros/cons as reported by the LineupEngine (shown in-game on Match Preview):

- **5 PG** — pros: Excellent ball handling at PG; Very fast: dangerous in transition; Elite shot creator for late-clock possessions; Great ball movement | cons: No rim protector — opponents will attack the paint; Undersized: rebounding and post defense disadvantage | mismatches: Katsumi Ichikawa (176cm) at PF: gets bullied inside; Kohei Nakamura (177cm) at C: weaker rebounding, interior & post defense
- **5 SG** — pros: Elite floor spacing; Elite shot creator for late-clock possessions | cons: — | mismatches: Hiroaki Koshida (180cm) at PF: gets bullied inside; Soichiro Jinnai (189cm) at C: weaker rebounding, interior & post defense
- **5 SF** — pros: Elite floor spacing; Dominant interior scorer; Elite shot creator for late-clock possessions; Great ball movement | cons: — | mismatches: Nobunaga Kiyoshi (178cm) at C: weaker rebounding, interior & post defense
- **5 PF** — pros: Excellent ball handling at PG; Strong rim protection | cons: Poor spacing — defenses can pack the paint | mismatches: Hanamichi Sakurai (188cm) at C: weaker rebounding, interior & post defense
- **5 C** — pros: Strong rim protection; Big lineup: rebounding and interior size; Dominant interior scorer | cons: Poor spacing — defenses can pack the paint; Slow: vulnerable in transition defense | mismatches: Toru Hanazawa (197cm) at SG: struggles to stay in front of quick guards; Hiroshi Morikawa on the wing: defenders sag off, cramped spacing

## 4. Validation

Total simulated games: **4000**. Stat-consistency / clock / roster violations: **0**.

Checked every game: team score = sum of player points = 2·FGM + 3PM + FTM; FGM≤FGA; 3PM≤3PA; FTM≤FTA; 3PM≤FGM; non-negative stats; minutes ≤ game time; total minutes ≤ 5× game time; no player in two slots; fouled-out players never on court; final never tied; elapsed = 40 min + 5 min per OT.

Runtime: 66.7 s.