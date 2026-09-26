import type { Player, PlayerGameStats, SimEvent, Tactics, TeamConfig, TeamExtraStats } from './types';
import { emptyStats } from './types';
import { PLAYER_MAP } from './db';
import { RNG } from './rng';

export interface TeamRT {
  idx: 0 | 1;
  cfg: TeamConfig;
  players: Record<string, Player>;
  roster: string[];
  starters: string[];
  onCourt: (string | null)[];
  energy: Record<string, number>;
  stats: Record<string, PlayerGameStats>;
  fouledOut: Record<string, boolean>;
  teamFouls: number;
  timeouts: number;
  tactics: Tactics;
  matchups: Record<string, string>;
  autoSub: boolean;
  isCPU: boolean;
  score: number;
  pendingSubs: { out: string; in: string }[];
  pendingTimeout: boolean;
  hot: Record<string, number>;
  extra: TeamExtraStats;
  deny: string | null;
  doubleTarget: string | null;
  attackTarget: string | null;
  tacticPoss: Record<string, { poss: number; pts: number }>;
  lastCoachT: number;
  periodScore: number[];
  subT: Record<string, number>;
  form: Record<string, number>;
  coachNotes: string[];
}

export interface Stint { team: 0 | 1; ids: string[]; sec: number; pf: number; pa: number; }

export interface MatchState {
  seed: number;
  rng: RNG;
  teams: [TeamRT, TeamRT];
  period: number;
  clock: number;
  elapsed: number;
  shotClock: number;
  possession: 0 | 1;
  arrow: 0 | 1;
  status: 'pregame' | 'live' | 'final';
  deadBall: boolean;
  lastEnd: 'start' | 'made' | 'dreb' | 'steal' | 'tov' | 'foul' | 'period' | 'ft' | 'timeout';
  events: SimEvent[];
  flow: { t: number; s: [number, number] }[];
  scoring: { t: number; team: 0 | 1; pts: number; player: string; period: number; clock: number }[];
  stints: Record<string, Stint>;
  eventId: number;
  lastEventText?: string;
  keepEvents: boolean;
  buffer: SimEvent[];
  totalPossessions: [number, number];
  overtimes: number;
  runTeam: -1 | 0 | 1;
  runPts: number;
  momentumOn: boolean;
  leadChanges: number;
  ties: number;
}

export const periodLength = (p: number) => (p <= 4 ? 600 : 300);

export function createTeamRT(idx: 0 | 1, cfg: TeamConfig, opts: { isCPU?: boolean; autoSub?: boolean } = {}): TeamRT {
  const roster = [...cfg.starters, ...cfg.bench].filter(Boolean);
  const players: Record<string, Player> = {};
  for (const id of roster) {
    const p = PLAYER_MAP[id];
    if (!p) throw new Error('Unknown player ' + id);
    players[id] = p;
  }
  const energy: Record<string, number> = {}, stats: Record<string, PlayerGameStats> = {}, hot: Record<string, number> = {};
  for (const id of roster) { energy[id] = 100; stats[id] = emptyStats(); hot[id] = 0; }
  return {
    idx, cfg, players, roster, starters: [...cfg.starters], onCourt: [...cfg.starters], energy, stats, fouledOut: {},
    teamFouls: 0, timeouts: 2, tactics: { ...cfg.tactics }, matchups: { ...(cfg.matchups ?? {}) },
    autoSub: opts.autoSub ?? true, isCPU: opts.isCPU ?? !!cfg.isCPU, score: 0, pendingSubs: [], pendingTimeout: false, hot,
    extra: { fbPts: 0, paintPts: 0, secondPts: 0, ptsOffTO: 0, benchPts: 0, possessions: 0, timeoutsUsed: 0, leadMax: 0, biggestRun: 0 },
    deny: null, doubleTarget: null, attackTarget: null, tacticPoss: {}, lastCoachT: -999, periodScore: [], subT: {}, form: {}, coachNotes: [],
  };
}

export function createMatch(a: TeamConfig, b: TeamConfig, seed: number, opts: { cpu?: [boolean, boolean]; autoSub?: [boolean, boolean]; keepEvents?: boolean } = {}): MatchState {
  const cpu = opts.cpu ?? [!!a.isCPU, !!b.isCPU];
  const auto = opts.autoSub ?? [true, true];
  const st = createMatchRaw(a, b, seed, cpu, auto, opts.keepEvents ?? true);
  // "Day form": every player has a good or bad night — inconsistent players swing more. Team form too.
  for (const t of st.teams) {
    const teamForm = st.rng.gauss(0, 0.032);
    for (const id of t.roster) t.form[id] = teamForm + st.rng.gauss(0, 0.032 * (1.35 - t.players[id].attrs.consistency / 100));
  }
  return st;
}

function createMatchRaw(a: TeamConfig, b: TeamConfig, seed: number, cpu: [boolean, boolean], auto: [boolean, boolean], keepEvents: boolean): MatchState {
  const opts = { keepEvents };
  return {
    seed, rng: new RNG(seed),
    teams: [createTeamRT(0, a, { isCPU: cpu[0], autoSub: auto[0] }), createTeamRT(1, b, { isCPU: cpu[1], autoSub: auto[1] })],
    period: 1, clock: 600, elapsed: 0, shotClock: 24, possession: 0, arrow: 1, status: 'pregame', deadBall: true, lastEnd: 'start',
    events: [], flow: [{ t: 0, s: [0, 0] }], scoring: [], stints: {}, eventId: 0, keepEvents: opts.keepEvents ?? true, buffer: [],
    totalPossessions: [0, 0], overtimes: 0, runTeam: -1, runPts: 0, momentumOn: false, leadChanges: 0, ties: 0,
  };
}

export function onCourtPlayers(t: TeamRT): Player[] {
  return t.onCourt.filter((x): x is string => !!x).map((id) => t.players[id]);
}

export function benchIds(t: TeamRT): string[] {
  return t.roster.filter((id) => !t.onCourt.includes(id));
}

export function availableBench(t: TeamRT): string[] {
  return benchIds(t).filter((id) => !t.fouledOut[id]);
}

export function lineupKey(t: TeamRT): string {
  return t.onCourt.filter(Boolean).slice().sort().join('|');
}

export function margin(st: MatchState, team: 0 | 1): number {
  return st.teams[team].score - st.teams[1 - team].score;
}

export function isClutch(st: MatchState): boolean {
  return st.period >= 4 && st.clock <= 150 && Math.abs(st.teams[0].score - st.teams[1].score) <= 6;
}
