import { writeFileSync, mkdirSync } from 'node:fs';
import { runBatch, summary, pair, extremeTeam, superstarTeam, gen, lineupProsCons } from '../src/engine/Balance';
import type { Pos } from '../src/engine/types';
import { teamOverall } from '../src/engine/Team';

const N = Number(process.env.N ?? 1000);
const NB = Number(process.env.NB ?? 200);
const t0 = Date.now();
const lines: string[] = [];
const f1 = (x: number) => x.toFixed(1);

function table(rows: [string, ReturnType<typeof summary>][]) {
  lines.push('| Matchup | Games | A win% | PPG | Poss | FG% | 3P% | FT% | REB | OREB | AST | TO | STL | BLK | PF | FTA | 3PA | OT% | Avg margin | Errors |');
  lines.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const [n, s] of rows) lines.push(`| ${n} | ${s.games} | ${f1(s.winPctA)} | ${f1(s.ppg)} | ${f1(s.poss)} | ${f1(s.fgPct)} | ${f1(s.tpPct)} | ${f1(s.ftPct)} | ${f1(s.reb)} | ${f1(s.oreb)} | ${f1(s.ast)} | ${f1(s.tov)} | ${f1(s.stl)} | ${f1(s.blk)} | ${f1(s.pf)} | ${f1(s.fta)} | ${f1(s.tpa)} | ${f1(s.otRate)} | ${f1(s.avgMargin)} | ${s.errors} |`);
}

// 1) mass simulation
const main = summary(runBatch(N, pair(), 7));
lines.push(`# HIGH SCHOOL BASKETBALL LEGENDS — Simulation Report`, '', `Generated ${new Date().toISOString()} — headless engine, 4x10 min + 5 min OT, FIBA fouls (5 PF, bonus from 5th team foul).`, '');
lines.push(`## 1. Mass simulation: ${N} random matches (random CPU templates & strength levels)`, '');
lines.push('Per team per game averages:', '');
lines.push('| Metric | Value | Target (HS 40 min) |', '|---|---|---|');
const rows: [string, string, string][] = [
  ['Points', f1(main.ppg), '60–95 typical'], ['Possessions', f1(main.poss), '~65–78'], ['FG%', f1(main.fgPct), '40–50'], ['3P%', f1(main.tpPct), '30–38'],
  ['FT%', f1(main.ftPct), '65–75'], ['FGA', f1(main.fga), ''], ['3PA', f1(main.tpa), ''], ['FTA', f1(main.fta), ''], ['Rebounds', f1(main.reb), '~35–42'], ['Off. rebounds', f1(main.oreb), '~9–13'],
  ['Assists', f1(main.ast), '~12–17'], ['Turnovers', f1(main.tov), '~12–17'], ['Steals', f1(main.stl), '~6–9'], ['Blocks', f1(main.blk), '~2.5–5'], ['Fouls', f1(main.pf), '~15–20'],
  ['Fast-break pts', f1(main.fbPts), ''], ['Paint pts', f1(main.paintPts), ''], ['Overtime games %', f1(main.otRate), '~4–8'], ['Team scores within 60–95 %', f1(main.inRange), 'majority'],
  ['Lowest / highest team score', `${main.minScore} / ${main.maxScore}`, 'allow 40s defensive games and 100+ shootouts'], ['10th / 90th percentile score', `${main.p10} / ${main.p90}`, ''],
  ['Avg winning margin', f1(main.avgMargin), ''], ['Foul-outs per game', f1(main.foulOutsPerGame), ''], ['30-point individual games', String(main.thirtyPtGames), 'rare but possible'],
  ['Avg starter minutes', f1(main.starterMin), '~25–32'], ['Stat-consistency violations', String(main.errors), '0'],
];
for (const r of rows) lines.push(`| ${r[0]} | ${r[1]} | ${r[2]} |`);
lines.push('');

// 2) balance tests
lines.push(`## 2. Balance matchups (${NB} games each, fresh CPU teams every game; "A" is the first team)`, '');
const bal: [string, ReturnType<typeof summary>][] = [
  ['Strong v Strong', summary(runBatch(NB, pair('Balanced', 'Strong', 'Balanced', 'Strong'), 11))],
  ['Strong v Average', summary(runBatch(NB, pair('Balanced', 'Strong', 'Balanced', 'Average'), 12))],
  ['Average v Average', summary(runBatch(NB, pair('Balanced', 'Average', 'Balanced', 'Average'), 13))],
  ['Weak v Strong', summary(runBatch(NB, pair('Balanced', 'Weak', 'Balanced', 'Strong'), 14))],
  ['Weak v Average', summary(runBatch(NB, pair('Balanced', 'Weak', 'Balanced', 'Average'), 19))],
  ['Average v Strong', summary(runBatch(NB, pair('Balanced', 'Average', 'Balanced', 'Strong'), 21))],
  ['Small Ball v Twin Towers', summary(runBatch(NB, pair('Small Ball', 'Average', 'Twin Towers', 'Average'), 15))],
  ['Three-Point Army v Inside Dominance', summary(runBatch(NB, pair('Three-Point Army', 'Average', 'Inside Dominance', 'Average'), 16))],
  ['Defense First v Run & Gun', summary(runBatch(NB, pair('Defense First', 'Average', 'Run & Gun', 'Average'), 17))],
  ['Super Team v Balanced Strong', summary(runBatch(NB, pair('Super Team', 'Elite', 'Balanced', 'Strong'), 18))],
];
table(bal);
const lvl = (['Weak', 'Average', 'Strong', 'Elite'] as const).map((l) => { let t = 0; for (let i = 0; i < 60; i++) t += teamOverall(gen(1000 + i, 'Balanced', l)); return `${l} ≈ ${(t / 60).toFixed(1)}`; });
lines.push('', `Average team overall by CPU strength level (Balanced template): ${lvl.join(', ')}. Weak-vs-Strong is a ~16-point overall gap, so upsets there are rare by design; one-tier gaps (Weak v Average, Average v Strong) produce regular upsets.`);
lines.push('');

// 3) extreme lineups
lines.push(`## 3. Extreme lineups vs a balanced Average-Strong team (${NB} games each)`, '');
const ext: [string, ReturnType<typeof summary>][] = [];
const prosCons: string[] = [];
for (const pos of ['PG', 'SG', 'SF', 'PF', 'C'] as Pos[]) {
  const s = summary(runBatch(NB, (i, rng) => { const a = extremeTeam(pos, rng.int(1, 1e9)); const b = gen(rng.int(1, 1e9), 'Balanced', rng.chance(0.5) ? 'Average' : 'Strong', [...a.starters, ...a.bench]); return [a, b]; }, 20 + pos.length));
  ext.push([`5 ${pos}`, s]);
  const pc = lineupProsCons(extremeTeam(pos, 1));
  prosCons.push(`- **5 ${pos}** — pros: ${pc.pros.join('; ') || '—'} | cons: ${pc.cons.join('; ') || '—'}${pc.mismatches.length ? ` | mismatches: ${pc.mismatches.slice(0, 3).join('; ')}` : ''}`);
}
const allStar = summary(runBatch(NB, (i, rng) => { const a = superstarTeam(); const b = gen(rng.int(1, 1e9), 'Balanced', 'Strong', [...a.starters, ...a.bench]); return [a, b]; }, 31));
ext.push(['Top-5 overall (all superstars) v Balanced Strong', allStar]);
const mixed = summary(runBatch(NB, (i, rng) => { const a = gen(rng.int(1, 1e9), 'Superstar + Role Players', 'Random'); const b = gen(rng.int(1, 1e9), 'Defense First', 'Average', [...a.starters, ...a.bench]); return [a, b]; }, 32));
ext.push(['Superstar + Role Players v Defense First', mixed]);
table(ext);
lines.push('', 'Lineup pros/cons as reported by the LineupEngine (shown in-game on Match Preview):', '', ...prosCons, '');
const allErr = [main, ...bal.map((b) => b[1]), ...ext.map((e) => e[1])].reduce((a, s) => a + s.errors, 0);
const totalGames = main.games + [...bal, ...ext].reduce((a, s) => a + s[1].games, 0);
lines.push(`## 4. Validation`, '', `Total simulated games: **${totalGames}**. Stat-consistency / clock / roster violations: **${allErr}**.`, '',
  'Checked every game: team score = sum of player points = 2·FGM + 3PM + FTM; FGM≤FGA; 3PM≤3PA; FTM≤FTA; 3PM≤FGM; non-negative stats; minutes ≤ game time; total minutes ≤ 5× game time; no player in two slots; fouled-out players never on court; final never tied; elapsed = 40 min + 5 min per OT.', '',
  `Runtime: ${((Date.now() - t0) / 1000).toFixed(1)} s.`);
mkdirSync(new URL('../reports', import.meta.url), { recursive: true });
writeFileSync(new URL('../reports/sim-report.md', import.meta.url), lines.join('\n'));
console.log(lines.join('\n'));
