import type { TeamConfig, PlayerGameStats } from './types';
import { SLOTS } from './types';
import type { MatchState, TeamRT } from './GameState';
import { periodLength } from './GameState';
import { periodName } from './CommentaryEngine';

export interface BoxRow extends PlayerGameStats {
  id: string; name: string; pos: string; starter: boolean; min: number; reb: number; fgPct: number; tpPct: number; ftPct: number; fouledOut: boolean; gameScore: number;
}
export interface TeamTotals {
  pts: number; fgm: number; fga: number; fgPct: number; tpm: number; tpa: number; tpPct: number; ftm: number; fta: number; ftPct: number;
  reb: number; oreb: number; dreb: number; ast: number; stl: number; blk: number; tov: number; pf: number;
  fbPts: number; paintPts: number; secondPts: number; ptsOffTO: number; benchPts: number; possessions: number; leadMax: number; biggestRun: number; timeoutsUsed: number;
}
export interface Analysis {
  keyPlayer: string; turningPoint: string; bestLineup: string[]; bestTactic: string[]; biggestRun: string; keyMatchup: string;
  leadChanges: number; ties: number; largestLead: [number, number]; notes: string[];
}
export interface POTG { team: 0 | 1; id: string; name: string; line: string; gameScore: number; }
export interface TeamSummary { name: string; short: string; primary: string; secondary: string; logoSeed: number; score: number; periodScores: number[]; cfg: TeamConfig; }
export interface MatchResult {
  id: string; date: string; mode: string; seed: number;
  teams: [TeamSummary, TeamSummary];
  box: [BoxRow[], BoxRow[]];
  totals: [TeamTotals, TeamTotals];
  flow: { t: number; s: [number, number] }[];
  periods: number;
  potg: POTG;
  analysis: Analysis;
  userTeam: 0 | 1 | null;
  winner: 0 | 1;
}

const pct = (m: number, a: number) => (a > 0 ? Math.round((m / a) * 1000) / 10 : 0);

export function gameScore(s: PlayerGameStats): number {
  return s.pts + 0.4 * s.fgm - 0.7 * s.fga - 0.4 * (s.fta - s.ftm) + 0.7 * s.oreb + 0.3 * s.dreb + s.stl + 0.7 * s.ast + 0.7 * s.blk - 0.4 * s.pf - s.tov;
}

export function boxScore(t: TeamRT): BoxRow[] {
  return t.roster.map((id) => {
    const s = t.stats[id];
    const p = t.players[id];
    const si = t.starters.indexOf(id);
    return {
      ...s, id, name: p.name, pos: si >= 0 ? SLOTS[si] : p.pos, starter: si >= 0, min: Math.round(s.sec / 60), reb: s.oreb + s.dreb,
      fgPct: pct(s.fgm, s.fga), tpPct: pct(s.tpm, s.tpa), ftPct: pct(s.ftm, s.fta), fouledOut: !!t.fouledOut[id], gameScore: Math.round(gameScore(s) * 10) / 10,
    };
  });
}

export function teamTotals(t: TeamRT): TeamTotals {
  const rows = Object.values(t.stats);
  const sum = (k: keyof PlayerGameStats) => rows.reduce((a, s) => a + s[k], 0);
  const fgm = sum('fgm'), fga = sum('fga'), tpm = sum('tpm'), tpa = sum('tpa'), ftm = sum('ftm'), fta = sum('fta');
  return {
    pts: sum('pts'), fgm, fga, fgPct: pct(fgm, fga), tpm, tpa, tpPct: pct(tpm, tpa), ftm, fta, ftPct: pct(ftm, fta),
    reb: sum('oreb') + sum('dreb'), oreb: sum('oreb'), dreb: sum('dreb'), ast: sum('ast'), stl: sum('stl'), blk: sum('blk'), tov: sum('tov'), pf: sum('pf'),
    fbPts: t.extra.fbPts, paintPts: t.extra.paintPts, secondPts: t.extra.secondPts, ptsOffTO: t.extra.ptsOffTO, benchPts: t.extra.benchPts,
    possessions: t.extra.possessions, leadMax: t.extra.leadMax, biggestRun: t.extra.biggestRun, timeoutsUsed: t.extra.timeoutsUsed,
  };
}

/** Stat-consistency checks required by the spec. Returns list of violations (empty = OK). */
export function validateMatch(st: MatchState): string[] {
  const errs: string[] = [];
  for (const t of st.teams) {
    const tot = teamTotals(t);
    if (tot.pts !== t.score) errs.push(`${t.cfg.name}: team score ${t.score} != sum of player points ${tot.pts}`);
    const ptsCheck = tot.fgm * 2 + tot.tpm + tot.ftm;
    if (ptsCheck !== t.score) errs.push(`${t.cfg.name}: 2*FGM+3PM+FTM=${ptsCheck} != score ${t.score}`);
    for (const id of t.roster) {
      const s = t.stats[id];
      const n = t.players[id].name;
      if (s.fgm > s.fga) errs.push(`${n}: FGM > FGA`);
      if (s.tpm > s.tpa) errs.push(`${n}: 3PM > 3PA`);
      if (s.ftm > s.fta) errs.push(`${n}: FTM > FTA`);
      if (s.tpm > s.fgm) errs.push(`${n}: 3PM > FGM`);
      if (s.tpa > s.fga) errs.push(`${n}: 3PA > FGA`);
      for (const k of ['oreb', 'dreb', 'ast', 'sec', 'stl', 'blk', 'tov', 'pf', 'pts'] as const) if (s[k] < 0) errs.push(`${n}: negative ${k}`);
      if (s.pf > 5) errs.push(`${n}: more than 5 fouls`);
      if (s.sec > st.elapsed + 0.01) errs.push(`${n}: minutes exceed game length`);
    }
    const ids = t.onCourt.filter(Boolean);
    if (new Set(ids).size !== ids.length) errs.push(`${t.cfg.name}: player in two slots`);
    for (const id of ids) if (t.fouledOut[id!]) errs.push(`${t.cfg.name}: fouled-out player ${id} on court`);
    const totalSec = Object.values(t.stats).reduce((a, s) => a + s.sec, 0);
    const expected = st.elapsed * 5;
    if (totalSec > expected + 0.5) errs.push(`${t.cfg.name}: total minutes ${totalSec} > 5x game time ${expected}`);
  }
  if (st.clock < 0) errs.push('clock below zero');
  if (st.status === 'final' && st.teams[0].score === st.teams[1].score) errs.push('final score tied');
  const expectedElapsed = [1, 2, 3, 4].reduce((a, p) => a + periodLength(p), 0) + st.overtimes * 300;
  if (st.status === 'final' && Math.abs(st.elapsed - expectedElapsed) > 0.5) errs.push(`elapsed ${st.elapsed} != regulation+OT ${expectedElapsed}`);
  return errs;
}

export function playerOfGame(st: MatchState): POTG {
  const win: 0 | 1 = st.teams[0].score > st.teams[1].score ? 0 : 1;
  let best: POTG | null = null;
  for (const t of st.teams) for (const id of t.roster) {
    const s = t.stats[id];
    const g = gameScore(s) + (t.idx === win ? 3 : 0);
    if (!best || g > best.gameScore) {
      best = { team: t.idx, id, name: t.players[id].name, gameScore: Math.round(g * 10) / 10, line: statLine(s) };
    }
  }
  return best!;
}

export function statLine(s: PlayerGameStats): string {
  const parts = [`${s.pts} PTS`, `${s.oreb + s.dreb} REB`, `${s.ast} AST`];
  if (s.stl >= 2) parts.push(`${s.stl} STL`);
  if (s.blk >= 2) parts.push(`${s.blk} BLK`);
  parts.push(`${s.fgm}/${s.fga} FG`);
  if (s.tpa) parts.push(`${s.tpm}/${s.tpa} 3P`);
  return parts.join(', ');
}

function fmtClock(sec: number) { const m = Math.floor(sec / 60), s = Math.floor(sec % 60); return `${m}:${String(s).padStart(2, '0')}`; }

export function analyse(st: MatchState): Analysis {
  const [A, B] = st.teams;
  const win: 0 | 1 = A.score > B.score ? 0 : 1;
  const W = st.teams[win], L = st.teams[1 - win];
  const potg = playerOfGame(st);
  const keyPlayer = `${potg.name} (${st.teams[potg.team].cfg.name}) — ${potg.line}`;
  // biggest run
  let bestRun = { team: 0 as 0 | 1, pts: 0, start: 0, period: 1, clock: 0, end: 0 };
  let cur = { team: -1 as number, pts: 0, start: 0, period: 1, clock: 0 };
  for (const e of st.scoring) {
    if (e.team === cur.team) cur.pts += e.pts; else cur = { team: e.team, pts: e.pts, start: e.t, period: e.period, clock: e.clock };
    if (cur.pts > bestRun.pts) bestRun = { team: cur.team as 0 | 1, pts: cur.pts, start: cur.start, period: cur.period, clock: cur.clock, end: e.t };
  }
  const biggestRun = bestRun.pts ? `${st.teams[bestRun.team].cfg.name} ${bestRun.pts}-0 run starting ${periodName(bestRun.period)} ${fmtClock(bestRun.clock)}` : 'No significant runs';
  // turning point: moment winner took the lead for good
  let lastNotAhead = 0, lastPeriod = 1, lastClock = 600;
  for (const e of st.scoring) {
    const idx = st.scoring.indexOf(e);
    let s0 = 0, s1 = 0;
    for (let i = 0; i <= idx; i++) { if (st.scoring[i].team === 0) s0 += st.scoring[i].pts; else s1 += st.scoring[i].pts; }
    const wm = win === 0 ? s0 - s1 : s1 - s0;
    if (wm <= 0) { lastNotAhead = e.t; lastPeriod = e.period; lastClock = e.clock; }
  }
  const windowEv = st.scoring.filter((e) => e.t > lastNotAhead && e.t <= lastNotAhead + 240);
  const wPts = windowEv.filter((e) => e.team === win).reduce((a, e) => a + e.pts, 0);
  const lPts = windowEv.filter((e) => e.team !== win).reduce((a, e) => a + e.pts, 0);
  const scorers: Record<string, number> = {};
  for (const e of windowEv) if (e.team === win) scorers[e.player] = (scorers[e.player] ?? 0) + e.pts;
  const spark = Object.entries(scorers).sort((a, b) => b[1] - a[1])[0];
  const turningPoint = lastNotAhead === 0
    ? `${W.cfg.name} led from start to finish.`
    : `${periodName(lastPeriod)} ${fmtClock(lastClock)}: ${W.cfg.name} took the lead for good, outscoring ${L.cfg.name} ${wPts}-${lPts} over the next 4 minutes${spark ? ` (${W.players[spark[0]].name} ${spark[1]} pts)` : ''}.`;
  // best lineup per team
  const bestLineup = st.teams.map((t) => {
    const stints = Object.values(st.stints).filter((s) => s.team === t.idx && s.sec >= 120);
    if (!stints.length) return `${t.cfg.name}: n/a`;
    stints.sort((a, b) => (b.pf - b.pa) - (a.pf - a.pa) || b.sec - a.sec);
    const s = stints[0];
    const d = s.pf - s.pa;
    return `${t.cfg.name}: ${s.ids.map((id) => t.players[id].name.split(' ').pop()).join(', ')} (${Math.round(s.sec / 60)} min, ${d >= 0 ? '+' : ''}${d})`;
  });
  const bestTactic = st.teams.map((t) => {
    const e = Object.entries(t.tacticPoss).filter(([, v]) => v.poss >= 6).sort((a, b) => b[1].pts / b[1].poss - a[1].pts / a[1].poss)[0];
    return e ? `${t.cfg.name}: ${e[0]} (${(e[1].pts / e[1].poss).toFixed(2)} pts/poss over ${e[1].poss} poss)` : `${t.cfg.name}: n/a`;
  });
  // key matchup: slot with the largest scoring differential between starters
  let km = '', kmd = -1;
  for (let i = 0; i < 5; i++) {
    const a = A.starters[i], b = B.starters[i];
    if (!a || !b) continue;
    const d = Math.abs(A.stats[a].pts - B.stats[b].pts);
    if (d > kmd) { kmd = d; km = `${SLOTS[i]}: ${A.players[a].name} (${A.stats[a].pts} pts) vs ${B.players[b].name} (${B.stats[b].pts} pts)`; }
  }
  const notes: string[] = [];
  for (const t of st.teams) for (const id of t.roster) {
    const s = t.stats[id], n = t.players[id].name;
    if (s.pts >= 30) notes.push(`${n} erupted for ${s.pts} points`);
    if (s.tpm >= 6) notes.push(`${n} hit ${s.tpm} threes`);
    if (s.oreb + s.dreb >= 15) notes.push(`${n} pulled down ${s.oreb + s.dreb} rebounds`);
    if (s.ast >= 10) notes.push(`${n} dished ${s.ast} assists`);
    if (s.stl >= 5) notes.push(`${n} had ${s.stl} steals`);
    if (s.blk >= 5) notes.push(`${n} blocked ${s.blk} shots`);
    if (t.fouledOut[id]) notes.push(`${n} fouled out`);
  }
  if (st.overtimes) notes.push(`Went to ${st.overtimes === 1 ? 'overtime' : st.overtimes + ' overtimes'}`);
  const benchW = W.extra.benchPts;
  if (benchW >= 25) notes.push(`${W.cfg.name} bench exploded for ${benchW} points`);
  return { keyPlayer, turningPoint, bestLineup, bestTactic, biggestRun, keyMatchup: km || 'n/a', leadChanges: st.leadChanges, ties: st.ties, largestLead: [A.extra.leadMax, B.extra.leadMax], notes };
}

export function buildResult(st: MatchState, meta: { mode: string; userTeam: 0 | 1 | null; id?: string }): MatchResult {
  const t = st.teams;
  const summary = (x: TeamRT): TeamSummary => ({ name: x.cfg.name, short: x.cfg.short, primary: x.cfg.primary, secondary: x.cfg.secondary, logoSeed: x.cfg.logoSeed, score: x.score, periodScores: Array.from({ length: st.period }, (_, i) => x.periodScore[i] ?? 0), cfg: x.cfg });
  // downsample flow to keep saves small
  const flow = st.flow.length > 240 ? st.flow.filter((_, i) => i % Math.ceil(st.flow.length / 240) === 0 || i === st.flow.length - 1) : st.flow;
  return {
    id: meta.id ?? `m_${Date.now().toString(36)}_${st.seed.toString(36)}`, date: new Date().toISOString(), mode: meta.mode, seed: st.seed,
    teams: [summary(t[0]), summary(t[1])], box: [boxScore(t[0]), boxScore(t[1])], totals: [teamTotals(t[0]), teamTotals(t[1])],
    flow: flow.map((f) => ({ t: Math.round(f.t), s: [...f.s] as [number, number] })), periods: st.period, potg: playerOfGame(st), analysis: analyse(st),
    userTeam: meta.userTeam, winner: t[0].score > t[1].score ? 0 : 1,
  };
}
