# HIGH SCHOOL BASKETBALL LEGENDS — full spec (from user Teera, originally in Thai)

Build a REAL, fully playable web game (not a mockup/prototype/UI demo). Tactical Basketball Simulation + Dream Team Builder, Japanese high school basketball, 90s sports-manga atmosphere + modern broadcast graphics. Inspired by Slam Dunk archetypes BUT public-safe: new school names, altered character names (given below), new logos, new uniforms, new original portraits (generate procedurally e.g. SVG). Never copy original art/logos. "Inspiration" names only describe archetypes; never show original names in UI.

## Core loop
Player database -> build dream team -> starting five (PG SG SF PF C slots, any player in any slot, NO position lock) -> bench 5–7 -> tactics -> generate CPU team -> match preview -> START GAME -> live sim -> tactical adjustments (tactics, subs, timeouts, matchups) -> halftime -> 2nd half -> final -> box score -> match analysis -> build another team. User never controls running/shooting.
Philosophy: highest overall ≠ best team. Balance and chemistry matter; changing one player should noticeably change team style. Every START GAME should feel like anything can happen, but skill > randomness.

## Modes (all must work)
QUICK MATCH (pick 5, play). DREAM TEAM (build & save many teams: roster, starting five, bench, positions, tactics). TOURNAMENT (16 teams, R16/QF/SF/Final, bracket UI, CPU vs CPU simulated). RANDOM BATTLE (randomize both teams, simulate immediately).
Home screen: Quick Match, Dream Team, Tournament, Random Battle, Player Database, Match History, Settings. No dead buttons, no "Coming Soon".

## Position mismatch
Engine penalizes by actual skill: low-handling C at PG -> more TO, less ball movement, worse fast break. Small guard at C -> worse rebounding, interior & post defense. 5-guard / 5-C lineups must work without error and show sensible pros/cons.

## Bench / subs
Manual sub + Auto sub (considers stamina, foul trouble, performance, matchup, score, tactic).

## Attributes (every player, all filled, persistent — generated once deterministically and stored as static data, NOT re-randomized on refresh)
General: Overall, Height, Weight, Primary Pos, Secondary Pos.
Offense: Inside Scoring, Mid Range, 3PT, Free Throw, Layup, Dunk, Post Scoring, Shot Creation, Off-ball Movement.
Playmaking: Passing, Court Vision, Ball Handling, Decision Making, Pick & Roll.
Defense: Perimeter D, Interior D, Steal, Block, Help D, Defensive IQ.
Physical: Speed, Acceleration, Strength, Vertical, Agility, Stamina.
Rebounding: OREB, DREB, Box Out.
Mental: Basketball IQ, Clutch, Consistency, Composure, Teamwork.
Plus: archetype, strengths, weaknesses, signature skills (all stars), school.
Missing values derived from archetype/position/height/role/strengths/weaknesses/team style. No superstar with 99 everywhere.

## Archetypes (must affect AI behavior)
Floor General, Scoring PG, Sharpshooter, Slasher, Two-Way Guard, Point Forward, Isolation Scorer, Athletic Wing, 3&D Wing, Defensive Specialist, Stretch Four, Post Scorer, Rim Protector, Rebounding Monster, All-Round Superstar, Sixth Man.

## Signature skills (must change sim)
Quick First Step, Fadeaway Master, Deep Range, Chase Down Block, Floor General, Clutch Shooter, Relentless Rebounder, Post Dominator, Ankle Breaker, Contact Finisher, Second Jump, Lockdown Defender, Perfect Release, Game Controller, plus character-specific ones named below (map each to concrete effects).

## Characters (76). Given numbers are fixed; fill the rest.
TEAM 01 SHOHOKAI HIGH (red/black; underdog, athletic, fast break, inside-outside)
1 Hanamichi Sakurai PF/C 188cm Rebounding Monster/Athletic Finisher. REB 96, Vertical 97, Speed 88, Defense 84. Weak: outside shooting, experience, decision making. Sig: Second Jump, Rebound Instinct.
2 Kaede Rukami SF/SG 187 Isolation Ace. Scoring 96, Mid 94, Dunk 91, Handling 90. Weaker teamwork/passing. Sig: Ace Mode, Isolation Master.
3 Takenori Akiba C 197 Elite Rim Protector. IntD 94, Block 94, Reb 92. Sig: Paint Guardian.
4 Ryota Miyama PG 168 Speedy Floor General. Speed 97, Handling 94, Passing 91, Steal 88. Weak interior D, height. Sig: Lightning Drive.
5 Hisashi Mitsuba SG 184 Elite Sharpshooter. 3PT 96, Clutch 96, IQ 91. Weak: stamina. Sig: Clutch Three, Never Give Up.
6 Kiminobu Kogami SF/SG reliable veteran spot-up shooter. 7 Yasuto PG backup floor general. 8 Kakuma PF/C interior role player. 9 Shiohara SG defensive guard.
TEAM 02 RYONAMI HIGH (balanced, point forward, strong interior)
10 Akira Sendoji SF/PG 190 Point Forward/Superstar. Scoring 94, Passing 94, IQ 97, Clutch 94. Sig: Genius Vision.
11 Jun Uozora C 202 Power Center. Str 97, Reb 94, IntD 93. Sig: Giant Wall.
12 Kisho Fukuma PF/SF aggressive scorer. Inside 92, Mid 87, Athleticism 90.
13 Ryoji Ikeda SF lockdown defender, PerD 95. 14 Hiroaki Koshida SG two-way guard. 15 Tomoya Uehara PG pass-first.
TEAM 03 KAINO ACADEMY (championship, high IQ, fast, disciplined)
16 Shinichi Makino PG 184 Power PG. Str 94, Drive 95, Passing 94, IQ 97. Sig: Emperor Drive.
17 Soichiro Jinnai SG 189 Elite Shooter. 3PT 97, Off-ball 96. Sig: Perfect Release.
18 Nobunaga Kiyoshi SF/SG 178 Athletic Wing. Vertical 95, Dunk 91, Speed 94.
19 Kazuma Takagi C 191 smart defensive center. 20 Yoshinori Miyata SG 160 specialist shooter 3PT 92. 21 Tadashi Mutoha SF/PF defensive forward.
TEAM 04 SHOYO INSTITUTE (twin towers, height, zone D)
22 Kenji Fujisawa PG 178 Elite Playmaker. Passing 96, IQ 96, Mid 90. Sig: Tactical Commander.
23 Toru Hanazawa C 197 Technical Center. Post 92, Mid 89, Reb 90. Sig: Fadeaway Center.
24 Kazushi Hasebe SF 190 defensive specialist. 25 Mitsuru Nagata PF 191 interior defender. 26 Taku Itoya PG/SG 180 combo guard. 27 Shigeru Takada PF/C 193 rebounder.
TEAM 05 SANNOH PEAK ACADEMY (one of strongest; national level, elite D, full-court press, complete)
28 Eiji Sawakami SF 188 National Ace. Scoring 98, Drive 97, Defense 94, Clutch 96. Sig: National Ace. One of best 1-on-1 players.
29 Kazunari Fukase PG 180 Elite Floor General. Passing 97, IQ 98, Defense 93. Sig: Game Controller.
30 Masashi Kawahara C/PF 194 Complete Big Man. Post 96, Reb 96, Defense 96, Mid 86. Sig: Complete Center. One of best complete bigs.
31 Mikio Kawahara C 210 Massive Center. Str 99, Inside 93.
32 Minoru Matsuda SG 184 elite secondary scorer. Mid 92, 3PT 88.
33 Satoshi Ichikawa SG 172 defensive guard. PerD 96, Stamina 97.
TEAM 06 TOYONAMI HIGH (run & gun, ultra fast pace, offense)
34 Minori Kishida PF/SF 188 aggressive scorer. 35 Tsuyoshi Minato SF 184 ace shooter: Scoring 93, 3PT 91, Mid 94. 36 Daijiro Itagaki PG 183 tall offensive guard. 37 Mitsuaki Iwase C 190 mobile center. 38 Kyohei Yashiro SG fast break specialist.
TEAM 07 DAIEI EAST (technical, balanced, high IQ)
39 Hiroshi Morikawa C 199 dominant young center: Str 98, Reb 96, Dunk 97. Sig: Rising Giant. 40 Atsushi Tsuchida PF/SF 190 point forward: Passing 91, IQ 94. 41 Keisuke Naito PG technical playmaker. 42 Junpei Okada SG mid-range specialist. 43 Masato Hara SF two-way wing.
TEAM 08 MEIHO NORTH (physical, interior dominance)
44 Tetsuya Morishima C 200 power center: Str 98, Dunk 96, Reb 95. 45 Koji Naruse PF 193 rebounding forward. 46 Riku Takamura SF 187 slashing wing. 47 Naoto Shiba PG 174 fast guard. 48 Shun Arai SG 181 spot-up shooter.
TEAM 09 TAKEZORA HIGH (traditional fundamental)
49 Kohei Nakamura PG traditional floor general. 50 Daiki Matsuda SG balanced shooter. 51 Ryo Takahashi SF two-way wing. 52 Shota Kaneda PF physical forward. 53 Genki Ishida C traditional center.
TEAM 10 TSUKUMI ACADEMY (motion offense, system)
54 Tomokazu Goda SG/SF 188 three-level scorer: 3PT 91, Mid 92. 55 Tetsuya Nanjo PF/C 192 athletic big. 56 Satoru Kawasaki PG pass-first. 57 Koichi Amami SF off-ball cutter. 58 Masaya Kondo C defensive center.
TEAM 11 MIURA TECH (physical, aggressive D)
59 Kengo Murase PF physical defender. 60 Tatsuya Arakawa PG aggressive guard. 61 Shinji Miyamoto SG two-way guard. 62 Ryuichi Takeda SF athletic defender. 63 Goro Nakayama C physical center.
TEAM 12 RYOKU ACADEMY (modern balanced, deep bench)
64 Michael Okino SF 192 all-round wing: Scoring 92, Defense 91, Athleticism 94. 65 Katsumi Ichikawa PG creative playmaker. 66 Hiro Tanaka SG movement shooter. 67 Yuta Sakai PF stretch four. 68 Shogo Kitamura C rim protector.
SPECIAL LEGEND POOL (dream team/exhibition)
69 Ryuji Makabe PG elite floor general. 70 Akito Senkawa SF/PG genius point forward. 71 Rei Kazehara SG ultimate shooter. 72 Taiga Sakuraba PF ultimate rebounder. 73 Ren Rukami SF isolation superstar. 74 Daigo Akamine C elite rim protector. 75 Eito Sawagami SF national-level scorer. 76 Masato Kawashima PF/C complete big man.
Power balance examples: Sakurai elite reb/vertical/athleticism, weak shooting/experience. Rukami elite iso/scoring/creation, weaker teamwork/passing. Mitsuba elite 3PT/clutch, weak stamina. Miyama elite speed/handling, weak interior D/height. Sendoji elite IQ/passing/scoring. Makino elite strength/drive/playmaking.

## Chemistry engine
Elite PG + elite C boosts P&R. Slasher + shooter = spacing. Elite passer + off-ball shooter = better catch-and-shoot. Rebounder + fast guards = more transition. Negatives: multiple ball-dominant stars = usage conflict; few shooters = bad spacing; too small = rebounding disadvantage.

## CPU team generator (FIND OPPONENT)
Picks from same DB, 5–12 players, no duplicates within CPU team. Templates: Balanced, Small Ball, Twin Towers, Run & Gun, Defense First, Three-Point Army, Inside Dominance, Super Team, Superstar + Role Players.
CPU intelligence: vs elite shooter -> tight coverage; vs dominant C -> double/pack paint; user lacks rim protector -> attack paint; low-handling guards -> press; opponent key player in foul trouble -> attack him. CPU makes subs, timeouts (sensibly, e.g. to stop runs), tactic changes, protects stars in foul trouble, manages stamina.

## Simulation engine (MOST IMPORTANT)
NO random final score then back-filled stats. Possession-by-possession: who handles, who screens, who cuts, who shoots, where from, who defends, help D?, shot quality, foul?, who rebounds.
Possession events: pass, drive, P&R, isolation, post up, cut, spot up, mid-range, 3, layup, dunk, block, steal, TO, foul, FT, OREB, DREB, fast break.
Shot probability from: shooter rating, shot type, distance, defender, contest, fatigue, hot/cold, chemistry, tactic, clutch, shot creation, assist quality, variance.
Rebounds: height, position, reb rating, vertical, strength, box out, positioning, fatigue.
Defense: on-ball, help, interior, perimeter, steal, block, switch, double team, zone.
Format: 4 quarters x 10 min, halftime after Q2; tie -> 5-min OT repeated until winner. Shot clock 24s.
Scores typically 60–95, but allow low-scoring defensive games and 100+ run & gun. Not forced.
Offensive tactics: Balanced, Fast Break, Run & Gun, Inside Focus, Perimeter Focus, Pick & Roll, Isolation, Motion Offense. Defensive: Man-to-Man, 2-3 Zone, 3-2 Zone, Full Court Press, Half Court Press, Double Team Star, Protect Paint, Guard Perimeter. Pace: Slow/Normal/Fast (affects possessions, fatigue, TO, fast break, score). Matchup assignment (A guards B) by user. Timeouts (limited count) for tactic/matchup/sub/rest/stop momentum.
Stamina drains by minutes, pace, usage, defensive intensity; tired -> speed, shooting, defense down, TO up.
Fouls: personal, shooting, team fouls (bonus FTs), FTs, foul trouble, foul out (5 fouls; fouled-out can never return).
Momentum: small morale boost from runs (e.g. 8–0), no rubber-banding. Clutch: late-game clutch attribute slightly more impactful, never guaranteed.
Emergent storytelling possible (40-pt games, 7 threes, 20 reb, 15 ast, 6 stl, foul outs, bench explosions, comebacks, runs, buzzer beaters, OT, 2OT, upsets) — never scripted.

## Live match UI
2D/2.5D tactical court, 10 players moving (PG brings ball up, wings space, C screens, D rotates, pass/drive/shoot/rebound) and animation tied to sim state/events. Play-by-play commentary generated from real events only (e.g. "Miyama brings the ball up." "Mitsuba runs around the screen!" "Mitsuba for THREE!" "GOOD!" "BLOCKED!"). Speed: Pause/1x/2x/4x. Scoreboard: teams, score, quarter, game clock, shot clock, team fouls, timeouts. In-game controls: change tactics/pace, subs, matchups, timeout, auto-sub toggle.

## Other UI
Player card: portrait, name, school, position, height, overall, archetype; click opens detail with attributes, radar chart, strengths, weaknesses, signature skills, game stats.
Player DB: search, filter by school/position/archetype/height/overall; sort by overall, 3PT, passing, rebound, defense, speed.
Match preview: our team vs CPU, PG vs PG ... C vs C, tactical summary, NO auto "who wins the matchup".
Box score: MIN PTS REB OREB DREB AST STL BLK TO PF FGM/FGA FG% 3PM/3PA 3P% FTM/FTA FT% +/-.
Team stats: FG% 3PT% FT% REB OREB AST STL BLK TO fouls, fast break pts, paint pts, second-chance pts.
Score progression chart (score vs time) with lead changes, largest lead, biggest run.
Player of the game from actual performance. Match analysis: key player, turning point, best lineup, best tactic, biggest run, key matchup.
Match history: date, opponent, score, W/L, POTG; click to view old box score. Save via LocalStorage/IndexedDB; survives refresh.
Theme white/black/red, clean & readable, all-new visual identity (school logos + uniforms generated). Responsive desktop/tablet/mobile (360/390/412/tablet): large touch targets, swipeable player cards, responsive court, readable stats, working modals.
Sound (synthesized via WebAudio is fine): bounce, sneaker squeak, whistle, crowd, buzzer, swish, rim hit; volume + mute in settings.

## Architecture
Separate modules: GameState, Player, Team, LineupEngine, PossessionEngine, ShotEngine, PassingEngine, DefenseEngine, ReboundEngine, FoulEngine, FatigueEngine, ChemistryEngine, TacticalEngine, CPUCoachEngine, StatisticsEngine, CommentaryEngine, SaveEngine, UI layer. Sim logic must be decoupled from UI (runnable headless in Node for tests). Sim must not freeze browser; target 60fps animation.
Error handling: never blank screen; error boundary with Retry / Return to Menu / Restart Match + readable message.

## Validation & QA (required)
Stat consistency every game: team score = sum player pts; FGM≤FGA; 3PM≤3PA; FTM≤FTA; 3PM≤FGM; nonneg REB/AST/MIN; clock≥0; no player in two slots; fouled-out never returns.
Run ≥1000 simulated matches headless; report avg score, possessions, FG%, 3P%, FT%, REB, AST, TO, STL, BLK, fouls; tune formulas until realistic; iterate.
Balance tests: strong v strong, strong v average, avg v avg, weak v strong, small ball v twin towers, shooters v interior, defense v offense. Extreme lineups: 5PG, 5SG, 5SF, 5PF, 5C, mixed — no errors, sensible pros/cons.
AI tests: CPU drafts, picks starters, subs, timeouts, tactic changes, responds to matchups, manages fouls & stamina.
Clock tests: Q1→Q2→Half→Q3→Q4→Final, tie→OT, OT tie→OT2...
Automated tests for: player DB, team builder, position assignment, possession, shot, rebound, foul, FT, substitution, game clock, quarter, OT, score, stats, save/load, tournament.
DB validation: ≥60 players, unique IDs, non-empty name/team, valid position/height, all attributes, archetype, strengths/weaknesses, stars have signature skills, no duplicates/missing.
Quality gate: 0 critical/major bugs, 0 dead buttons, 0 broken navigation, 0 missing character data, 0 sim-breaking errors.
Full gameplay test (browser, end to end): home→build team→select 5→bench→tactics→generate CPU→start→change tactic→sub→timeout→finish→box score→analysis→history saved→play again. Mobile test 360/390/412/tablet. Final QA loop ≥3 rounds (full gameplay, stress, balance, mobile, desktop, fix, regression).
Deploy as public website (NOT localhost), then open production URL and smoke test: open, quick match, build team, starting five, CPU team, start, sim to end, box score, analysis, save dream team, refresh, verify save, new match. Fix & redeploy on error.
Forbidden: UI-only, fake sim, pre-rolled score, placeholder characters, dead buttons, "Coming Soon" in core features, all-99 players, overall directly deciding winner, CPU random without basketball logic.
