/** Headless batch simulation + aggregation, shared by the sim-report script and tests. */
import type { Pos, TeamConfig } from './types';
import { PLAYERS } from './db';
import { generateTeam, type Template, type Level } from './CPUCoachEngine';
import { simulateMatch } from './Match';
import { teamTotals, validateMatch } from './StatisticsEngine';
import { profileLineup } from './LineupEngine';
import { RNG } from './rng';

export interface Agg {
  games: number; pts: number; poss: number; fgm: number; fga: number; tpm: number; tpa: number; ftm: number; fta: number;
  reb: number; oreb: number; ast: number; tov: number; stl: number; blk: number; pf: number; fbPts: number; paintPts: number;
  ot: number; errors: string[]; scores: number[]; margins: number[]; foulOuts: number; bigGames: number; winsA: number; starterMin: number; starterCount: number;
}
export function emptyAgg(): Agg {
  return { games: 0, pts: 0, poss: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, reb: 0, oreb: 0, ast: 0, tov: 0, stl: 0, blk: 0, pf: 0, fbPts: 0, paintPts: 0, ot: 0, errors: [], scores: [], margins: [], foulOuts: 0, bigGames: 0, winsA: 0, starterMin: 0, starterCount: 0 };
}

export function runBatch(n: number, make: (i: number, rng: RNG) => [TeamConfig, TeamConfig], seed = 1): Agg {
  const agg = emptyAgg();
  const rng = new RNG(seed);
  for (let i = 0; i < n; i++) {
    const [a, b] = make(i, rng);
    const m = simulateMatch(a, b, seed * 100003 + i * 7919);
    const st = m.st;
    const errs = validateMatch(st);
    if (errs.length) agg.errors.push(`game ${i}: ${errs.join('; ')}`);
    agg.games++;
    if (st.overtimes) agg.ot++;
    if (st.teams[0].score > st.teams[1].score) agg.winsA++;
    agg.margins.push(st.teams[0].score - st.teams[1].score);
    for (const t of st.teams) {
      const tt = teamTotals(t);
      agg.pts += tt.pts; agg.poss += tt.possessions; agg.fgm += tt.fgm; agg.fga += tt.fga; agg.tpm += tt.tpm; agg.tpa += tt.tpa; agg.ftm += tt.ftm; agg.fta += tt.fta;
      agg.reb += tt.reb; agg.oreb += tt.oreb; agg.ast += tt.ast; agg.tov += tt.tov; agg.stl += tt.stl; agg.blk += tt.blk; agg.pf += tt.pf; agg.fbPts += tt.fbPts; agg.paintPts += tt.paintPts;
      agg.scores.push(tt.pts);
      agg.foulOuts += Object.keys(t.fouledOut).length;
      for (const id of t.roster) if (t.stats[id].pts >= 30) agg.bigGames++;
      for (const id of t.starters) { agg.starterMin += t.stats[id].sec / 60; agg.starterCount++; }
    }
  }
  return agg;
}

export function summary(a: Agg) {
  const tg = a.games * 2;
  const sorted = [...a.scores].sort((x, y) => x - y);
  const inRange = a.scores.filter((s) => s >= 60 && s <= 95).length / a.scores.length;
  return {
    games: a.games,
    ppg: a.pts / tg, poss: a.poss / tg, fgPct: (a.fgm / a.fga) * 100, tpPct: (a.tpm / a.tpa) * 100, ftPct: (a.ftm / a.fta) * 100,
    fga: a.fga / tg, tpa: a.tpa / tg, fta: a.fta / tg, reb: a.reb / tg, oreb: a.oreb / tg, ast: a.ast / tg, tov: a.tov / tg, stl: a.stl / tg, blk: a.blk / tg, pf: a.pf / tg,
    fbPts: a.fbPts / tg, paintPts: a.paintPts / tg, otRate: (a.ot / a.games) * 100, winPctA: (a.winsA / a.games) * 100,
    minScore: sorted[0], maxScore: sorted[sorted.length - 1], p10: sorted[Math.floor(sorted.length * 0.1)], p90: sorted[Math.floor(sorted.length * 0.9)], inRange: inRange * 100,
    avgMargin: a.margins.reduce((x, y) => x + Math.abs(y), 0) / a.games, foulOutsPerGame: a.foulOuts / a.games, thirtyPtGames: a.bigGames, starterMin: a.starterMin / Math.max(1, a.starterCount),
    errors: a.errors.length,
  };
}

export function gen(seed: number, template?: Template, level?: Level, exclude: string[] = []): TeamConfig {
  return generateTeam(seed, { template, level, exclude });
}

export function pair(ta?: Template, la?: Level, tb?: Template, lb?: Level) {
  return (i: number, rng: RNG): [TeamConfig, TeamConfig] => {
    // alternate draft order so neither side always gets first pick of the pool
    if (i % 2 === 0) {
      const a = gen(rng.int(1, 1e9), ta, la);
      const b = gen(rng.int(1, 1e9), tb, lb, [...a.starters, ...a.bench]);
      return [a, b];
    }
    const b = gen(rng.int(1, 1e9), tb, lb);
    const a = gen(rng.int(1, 1e9), ta, la, [...b.starters, ...b.bench]);
    return [a, b];
  };
}

/** Five players of the same primary position + a balanced bench. */
export function extremeTeam(pos: Pos, seed: number, exclude: string[] = []): TeamConfig {
  const rng = new RNG(seed);
  const pool = PLAYERS.filter((p) => p.pos === pos && !exclude.includes(p.id)).sort((a, b) => b.overall - a.overall);
  const top = pool.slice(0, 9);
  rng.shuffle(top);
  const starters = top.slice(0, 5).sort((a, b) => b.attrs.handling - a.attrs.handling).map((p) => p.id);
  const others = PLAYERS.filter((p) => !starters.includes(p.id) && !exclude.includes(p.id) && p.overall >= 66 && p.overall <= 80);
  rng.shuffle(others);
  const bench = others.slice(0, 5).map((p) => p.id);
  return { id: 'x' + pos, name: `All-${pos}`, short: pos, primary: '#444', secondary: '#eee', logoSeed: 3, starters, bench, tactics: { offense: 'Balanced', defense: 'Man-to-Man', pace: 'Normal' } };
}

export function superstarTeam(exclude: string[] = []): TeamConfig {
  const top = PLAYERS.filter((p) => !exclude.includes(p.id)).sort((a, b) => b.overall - a.overall);
  const starters = top.slice(0, 5).map((p) => p.id);
  const bench = top.slice(5, 10).map((p) => p.id);
  return { id: 'allstar', name: 'All-Superstars', short: 'ASS', primary: '#b8860b', secondary: '#000', logoSeed: 9, starters, bench, tactics: { offense: 'Balanced', defense: 'Man-to-Man', pace: 'Normal' } };
}

export function lineupProsCons(t: TeamConfig) {
  const prof = profileLineup(t.starters.map((id) => PLAYERS.find((p) => p.id === id)!));
  return { pros: prof.pros, cons: prof.cons, mismatches: prof.mismatches.map((m) => m.text) };
}
