# HIGH SCHOOL BASKETBALL LEGENDS — Simulation Report

Generated 2026-09-26T09:15:44.496Z — headless engine, 4x10 min + 5 min OT, FIBA fouls (5 PF, bonus from 5th team foul).

## 1. Mass simulation: 1000 random matches (random CPU templates & strength levels)

Per team per game averages:

| Metric | Value | Target (HS 40 min) |
|---|---|---|
| Points | 75.5 | 60–95 typical |
| Possessions | 77.0 | ~65–78 |
| FG% | 43.9 | 40–50 |
| 3P% | 34.4 | 30–38 |
| FT% | 70.5 | 65–75 |
| FGA | 65.3 |  |
| 3PA | 18.4 |  |
| FTA | 16.9 |  |
| Rebounds | 39.4 | ~35–42 |
| Off. rebounds | 10.2 | ~9–13 |
| Assists | 14.7 | ~12–17 |
| Turnovers | 14.1 | ~12–17 |
| Steals | 7.3 | ~6–9 |
| Blocks | 3.1 | ~2.5–5 |
| Fouls | 16.6 | ~15–20 |
| Fast-break pts | 7.6 |  |
| Paint pts | 31.3 |  |
| Overtime games % | 1.6 | ~4–8 |
| Team scores within 60–95 % | 73.2 | majority |
| Lowest / highest team score | 22 / 133 | allow 40s defensive games and 100+ shootouts |
| 10th / 90th percentile score | 55 / 96 |  |
| Avg winning margin | 20.6 |  |
| Foul-outs per game | 0.8 |  |
| 30-point individual games | 165 | rare but possible |
| Avg starter minutes | 29.0 | ~25–32 |
| Stat-consistency violations | 0 | 0 |

## 2. Balance matchups (200 games each, fresh CPU teams every game; "A" is the first team)

| Matchup | Games | A win% | PPG | Poss | FG% | 3P% | FT% | REB | OREB | AST | TO | STL | BLK | PF | FTA | 3PA | OT% | Avg margin | Errors |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Strong v Strong | 200 | 48.5 | 76.4 | 74.1 | 45.1 | 36.0 | 73.3 | 37.9 | 10.3 | 15.0 | 12.1 | 6.2 | 3.5 | 16.0 | 16.5 | 17.0 | 3.5 | 14.1 | 0 |
| Strong v Average | 200 | 77.5 | 73.0 | 74.8 | 43.5 | 34.3 | 69.9 | 39.0 | 10.2 | 14.2 | 13.0 | 6.6 | 3.6 | 16.6 | 17.1 | 16.0 | 2.5 | 16.3 | 0 |
| Average v Average | 200 | 46.0 | 70.2 | 75.0 | 42.4 | 30.6 | 67.7 | 39.6 | 10.4 | 13.3 | 14.0 | 7.1 | 3.0 | 17.1 | 17.4 | 15.3 | 2.5 | 13.6 | 0 |
| Weak v Strong | 200 | 4.0 | 71.5 | 76.1 | 42.7 | 33.0 | 67.9 | 39.5 | 10.1 | 13.8 | 14.6 | 7.3 | 2.7 | 16.6 | 16.7 | 17.6 | 0.5 | 27.1 | 0 |
| Weak v Average | 200 | 13.5 | 68.9 | 75.9 | 41.7 | 31.2 | 65.5 | 40.0 | 10.4 | 12.8 | 15.1 | 7.5 | 2.8 | 17.5 | 18.0 | 15.7 | 0.5 | 16.9 | 0 |
| Average v Strong | 200 | 26.0 | 73.3 | 75.0 | 43.6 | 33.9 | 71.2 | 38.8 | 9.8 | 14.1 | 13.0 | 6.7 | 3.3 | 16.3 | 16.8 | 16.1 | 1.0 | 15.8 | 0 |
| Small Ball v Twin Towers | 200 | 30.5 | 74.8 | 77.8 | 43.8 | 32.3 | 67.5 | 40.3 | 10.7 | 14.6 | 14.5 | 7.3 | 2.7 | 16.9 | 17.2 | 16.9 | 1.0 | 17.1 | 0 |
| Three-Point Army v Inside Dominance | 200 | 26.0 | 71.4 | 73.4 | 44.1 | 33.1 | 68.9 | 37.6 | 10.1 | 13.9 | 13.9 | 7.0 | 2.2 | 16.1 | 15.6 | 17.0 | 1.0 | 17.4 | 0 |
| Defense First v Run & Gun | 200 | 60.5 | 75.3 | 80.2 | 43.4 | 32.0 | 67.6 | 40.4 | 9.9 | 15.4 | 15.8 | 8.5 | 2.6 | 17.8 | 18.8 | 18.0 | 1.0 | 17.4 | 0 |
| Super Team v Balanced Strong | 200 | 77.5 | 76.7 | 74.2 | 45.4 | 37.3 | 76.7 | 37.2 | 9.7 | 15.4 | 12.1 | 6.2 | 3.9 | 15.1 | 15.4 | 16.7 | 2.5 | 18.2 | 0 |

Average team overall by CPU strength level (Balanced template): Weak ≈ 69.4, Average ≈ 77.0, Strong ≈ 85.5, Elite ≈ 92.5. Weak-vs-Strong is a ~16-point overall gap, so upsets there are rare by design; one-tier gaps (Weak v Average, Average v Strong) produce regular upsets.

## 3. Extreme lineups vs a balanced Average-Strong team (200 games each)

| Matchup | Games | A win% | PPG | Poss | FG% | 3P% | FT% | REB | OREB | AST | TO | STL | BLK | PF | FTA | 3PA | OT% | Avg margin | Errors |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 5 PG | 200 | 34.5 | 75.0 | 73.9 | 44.0 | 33.8 | 71.3 | 38.7 | 11.1 | 14.4 | 12.5 | 6.5 | 2.8 | 16.6 | 17.5 | 17.3 | 2.5 | 16.0 | 0 |
| 5 SG | 200 | 27.0 | 72.3 | 74.9 | 43.6 | 33.0 | 72.3 | 37.9 | 10.0 | 13.8 | 14.3 | 7.5 | 2.7 | 16.4 | 16.3 | 17.6 | 2.5 | 16.8 | 0 |
| 5 SF | 200 | 58.0 | 73.6 | 75.6 | 43.4 | 33.6 | 74.3 | 38.6 | 10.1 | 13.9 | 13.8 | 7.2 | 3.5 | 16.4 | 16.5 | 16.9 | 2.5 | 14.5 | 0 |
| 5 PF | 200 | 58.5 | 72.1 | 75.1 | 43.5 | 31.1 | 68.3 | 39.1 | 10.6 | 13.4 | 13.8 | 7.1 | 3.5 | 17.6 | 18.7 | 13.8 | 1.5 | 16.5 | 0 |
| 5 C | 200 | 45.0 | 71.7 | 75.5 | 44.5 | 32.7 | 69.2 | 37.6 | 9.6 | 13.8 | 14.7 | 7.3 | 3.8 | 16.7 | 17.4 | 12.4 | 2.0 | 14.6 | 0 |
| Top-5 overall (all superstars) v Balanced Strong | 200 | 76.5 | 75.2 | 74.3 | 44.8 | 36.0 | 75.5 | 37.5 | 9.9 | 14.9 | 12.7 | 6.5 | 4.0 | 15.2 | 15.4 | 16.4 | 3.0 | 15.9 | 0 |
| Superstar + Role Players v Defense First | 200 | 63.0 | 68.3 | 72.0 | 43.2 | 32.0 | 68.1 | 37.4 | 9.2 | 12.1 | 13.0 | 6.5 | 2.8 | 16.1 | 16.3 | 14.9 | 1.0 | 16.8 | 0 |

Lineup pros/cons as reported by the LineupEngine (shown in-game on Match Preview):

- **5 PG** — pros: Excellent ball handling at PG; Very fast: dangerous in transition; Elite shot creator for late-clock possessions; Great ball movement | cons: No rim protector — opponents will attack the paint; Undersized: rebounding and post defense disadvantage | mismatches: Katsumi Ichikawa (176cm) at PF: gets bullied inside; Kohei Nakamura (177cm) at C: weaker rebounding, interior & post defense
- **5 SG** — pros: Elite floor spacing; Elite shot creator for late-clock possessions | cons: — | mismatches: Hiroaki Koshida (180cm) at PF: gets bullied inside; Soichiro Jinnai (189cm) at C: weaker rebounding, interior & post defense
- **5 SF** — pros: Elite floor spacing; Dominant interior scorer; Elite shot creator for late-clock possessions; Great ball movement | cons: — | mismatches: Nobunaga Kiyoshi (178cm) at C: weaker rebounding, interior & post defense
- **5 PF** — pros: Excellent ball handling at PG; Strong rim protection | cons: Poor spacing — defenses can pack the paint | mismatches: Hanamichi Sakurai (188cm) at C: weaker rebounding, interior & post defense
- **5 C** — pros: Strong rim protection; Big lineup: rebounding and interior size; Dominant interior scorer | cons: Poor spacing — defenses can pack the paint; Slow: vulnerable in transition defense | mismatches: Toru Hanazawa (197cm) at SG: struggles to stay in front of quick guards; Hiroshi Morikawa on the wing: defenders sag off, cramped spacing

## 4. Validation

Total simulated games: **4400**. Stat-consistency / clock / roster violations: **0**.

Checked every game: team score = sum of player points = 2·FGM + 3PM + FTM; FGM≤FGA; 3PM≤3PA; FTM≤FTA; 3PM≤FGM; non-negative stats; minutes ≤ game time; total minutes ≤ 5× game time; no player in two slots; fouled-out players never on court; final never tied; elapsed = 40 min + 5 min per OT.

Runtime: 75.5 s.