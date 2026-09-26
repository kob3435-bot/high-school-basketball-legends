/** 16-team knockout tournament: R16 -> QF -> SF -> Final. CPU vs CPU games are fully simulated headless. */
import type { TeamConfig } from './types';
import { generateTeam, TEMPLATES, type Level } from './CPUCoachEngine';
import { simulateMatch } from './Match';
import { RNG } from './rng';
import { playerOfGame } from './StatisticsEngine';

export const ROUND_NAMES = ['Round of 16', 'Quarterfinals', 'Semifinals', 'Final'];
export interface TMatch { a: number | null; b: number | null; winner: number | null; score?: [number, number]; potg?: string; resultId?: string; ot?: number; }
export interface TournamentState { id: string; name: string; seed: number; teams: TeamConfig[]; userIdx: number | null; rounds: TMatch[][]; round: number; champion: number | null; createdAt: string; }

const CUP_NAMES = ['Winter Cup', 'Inter-High Championship', 'National Invitational', 'Legends Cup'];

export function createTournament(user: TeamConfig | null, seed: number): TournamentState {
  const rng = new RNG(seed);
  const teams: TeamConfig[] = [];
  const exclude = user ? [...user.starters, ...user.bench] : [];
  const usage: Record<string, number> = {};
  const levels: Level[] = ['Elite', 'Elite', 'Strong', 'Strong', 'Strong', 'Strong', 'Strong', 'Average', 'Average', 'Average', 'Average', 'Average', 'Average', 'Weak', 'Weak', 'Strong'];
  rng.shuffle(levels);
  const names = new Set<string>();
  const need = user ? 15 : 16;
  for (let i = 0; i < need; i++) {
    let overused = Object.entries(usage).filter(([, n]) => n >= 2).map(([id]) => id);
    if (76 - exclude.length - overused.length < 18) overused = Object.entries(usage).filter(([, n]) => n >= 3).map(([id]) => id);
    if (76 - exclude.length - overused.length < 18) overused = [];
    let t: TeamConfig;
    let tries = 0;
    do {
      t = generateTeam(rng.int(1, 1e9), { template: rng.pick(TEMPLATES), level: levels[i], exclude: [...exclude, ...overused], benchSize: 5 });
      tries++;
    } while (names.has(t.name) && tries < 30);
    if (names.has(t.name)) t.name = t.name + ' ' + (i + 1);
    names.add(t.name);
    t.id = `tour_${seed}_${i}`;
    for (const id of [...t.starters, ...t.bench]) usage[id] = (usage[id] ?? 0) + 1;
    teams.push(t);
  }
  let userIdx: number | null = null;
  if (user) { teams.push({ ...user, isCPU: false }); }
  // random seeding
  const order = rng.shuffle(teams.map((_, i) => i));
  const seeded = order.map((i) => teams[i]);
  if (user) userIdx = seeded.findIndex((t) => t.id === user.id);
  const r16: TMatch[] = [];
  for (let i = 0; i < 8; i++) r16.push({ a: i * 2, b: i * 2 + 1, winner: null });
  const rounds: TMatch[][] = [r16, [0, 1, 2, 3].map(() => ({ a: null, b: null, winner: null })), [0, 1].map(() => ({ a: null, b: null, winner: null })), [{ a: null, b: null, winner: null }]];
  return { id: 'tour_' + seed.toString(36), name: rng.pick(CUP_NAMES), seed, teams: seeded, userIdx, rounds, round: 0, champion: null, createdAt: new Date().toISOString() };
}

export function userMatchIndex(ts: TournamentState): number {
  if (ts.userIdx === null || ts.champion !== null) return -1;
  return ts.rounds[ts.round].findIndex((m) => m.winner === null && (m.a === ts.userIdx || m.b === ts.userIdx));
}

export function userEliminated(ts: TournamentState): boolean {
  if (ts.userIdx === null) return false;
  for (const r of ts.rounds) for (const m of r) if (m.winner !== null && (m.a === ts.userIdx || m.b === ts.userIdx) && m.winner !== ts.userIdx) return true;
  return false;
}

export function recordResult(ts: TournamentState, round: number, idx: number, score: [number, number], potg?: string, resultId?: string, ot = 0) {
  const m = ts.rounds[round][idx];
  if (m.a === null || m.b === null) throw new Error('Match not ready');
  if (score[0] === score[1]) throw new Error('Knockout games cannot end tied');
  m.score = score; m.winner = score[0] > score[1] ? m.a : m.b; m.potg = potg; m.resultId = resultId; m.ot = ot;
}

/** Simulate every unplayed CPU-vs-CPU game in the current round (user game is left for the player). */
export function simulateCpuGames(ts: TournamentState, includeUser = false) {
  const r = ts.round;
  ts.rounds[r].forEach((m, i) => {
    if (m.winner !== null || m.a === null || m.b === null) return;
    const isUser = ts.userIdx !== null && (m.a === ts.userIdx || m.b === ts.userIdx);
    if (isUser && !includeUser) return;
    const sim = simulateMatch({ ...ts.teams[m.a], isCPU: true }, { ...ts.teams[m.b], isCPU: true }, ts.seed * 31 + r * 1000 + i * 17 + 5);
    const p = playerOfGame(sim.st);
    recordResult(ts, r, i, [sim.st.teams[0].score, sim.st.teams[1].score], `${p.name} (${p.line})`, undefined, sim.st.overtimes);
  });
}

export function roundComplete(ts: TournamentState): boolean { return ts.rounds[ts.round].every((m) => m.winner !== null); }

/** Move winners into the next round. Returns true when a champion has been crowned. */
export function advance(ts: TournamentState): boolean {
  if (!roundComplete(ts)) return false;
  const cur = ts.rounds[ts.round];
  if (ts.round === ts.rounds.length - 1) { ts.champion = cur[0].winner; return true; }
  const next = ts.rounds[ts.round + 1];
  cur.forEach((m, i) => { const nm = next[Math.floor(i / 2)]; if (i % 2 === 0) nm.a = m.winner; else nm.b = m.winner; });
  ts.round++;
  return false;
}

/** Convenience: play the whole tournament headless (used in tests / "sim to champion"). */
export function simulateAll(ts: TournamentState) {
  let guard = 0;
  while (ts.champion === null && guard++ < 10) { simulateCpuGames(ts, true); advance(ts); }
}
