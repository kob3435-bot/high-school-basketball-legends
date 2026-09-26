/** Match orchestrator: clock/periods/OT, dead-ball management, user commands. Runs headless or step-by-step for the UI. */
import type { SimEvent, TeamConfig, Tactics } from './types';
import { createMatch, type MatchState, type TeamRT } from './GameState';
import { runPossession } from './PossessionEngine';
import { emit } from './CommentaryEngine';
import { restAll } from './FatigueEngine';
import { applyPendingSubs, canSub } from './SubstitutionEngine';
import { autoSubs, coachAdjust, wantsTimeout, makeGamePlan, applyGamePlan } from './CPUCoachEngine';
import { buildResult, type MatchResult } from './StatisticsEngine';

export interface MatchOptions { userTeam?: 0 | 1 | null; autoSubUser?: boolean; keepEvents?: boolean; mode?: string; }

export class MatchSim {
  st: MatchState;
  userTeam: 0 | 1 | null;
  mode: string;
  constructor(a: TeamConfig, b: TeamConfig, seed: number, opts: MatchOptions = {}) {
    this.userTeam = opts.userTeam ?? null;
    this.mode = opts.mode ?? 'Quick Match';
    const cpu: [boolean, boolean] = [this.userTeam !== 0, this.userTeam !== 1];
    const auto: [boolean, boolean] = [cpu[0] || (opts.autoSubUser ?? true), cpu[1] || (opts.autoSubUser ?? true)];
    this.st = createMatch(a, b, seed, { cpu, autoSub: auto, keepEvents: opts.keepEvents ?? true });
    for (const t of this.st.teams) {
      if (t.isCPU) applyGamePlan(t, makeGamePlan(t.cfg, this.st.teams[1 - t.idx].cfg));
    }
  }

  get finished() { return this.st.status === 'final'; }

  /** Advance one "unit" (tip-off, a possession, or a period break). Returns the events produced. */
  step(): SimEvent[] {
    const st = this.st;
    st.buffer = [];
    if (st.status === 'final') return [];
    if (st.status === 'pregame') { this.tipoff(); return st.buffer; }
    if (st.clock <= 0) { this.endPeriod(); return st.buffer; }
    if (st.deadBall) this.deadBall();
    runPossession(st);
    return st.buffer;
  }

  simToEnd(maxSteps = 5000): void {
    let n = 0;
    while (!this.finished && n++ < maxSteps) this.step();
    if (!this.finished) throw new Error('Simulation did not finish');
  }

  private tipoff() {
    const st = this.st;
    const jumper = (t: TeamRT) => {
      const c = t.onCourt[4] ?? t.onCourt.find(Boolean)!;
      return t.players[c!];
    };
    const a = jumper(st.teams[0]), b = jumper(st.teams[1]);
    const sa = a.height + a.attrs.vertical * 0.5, sb = b.height + b.attrs.vertical * 0.5;
    const win: 0 | 1 = st.rng.chance(0.5 + (sa - sb) * 0.02) ? 0 : 1;
    st.possession = win; st.arrow = (1 - win) as 0 | 1;
    st.status = 'live';
    emit(st, { type: 'tipoff', team: win, player: a.id, player2: b.id });
    emit(st, { type: 'periodStart', team: win });
    st.deadBall = true; st.lastEnd = 'start';
  }

  private callTimeout(t: TeamRT, reason: string) {
    const st = this.st;
    if (t.timeouts <= 0) return;
    t.timeouts--; t.extra.timeoutsUsed++; t.pendingTimeout = false;
    emit(st, { type: 'timeout', team: t.idx, kind: reason ? `(${reason})` : undefined });
    restAll(st, 4, true);
    st.momentumOn = false;
    st.lastEnd = 'timeout';
    if (t.isCPU) { coachAdjust(st, t, true); autoSubs(st, t, 5); }
  }

  private deadBall() {
    const st = this.st;
    for (const t of st.teams) {
      if (t.pendingTimeout && t.timeouts > 0) this.callTimeout(t, '');
      else if (t.pendingTimeout) t.pendingTimeout = false;
      else if (t.isCPU) { const why = wantsTimeout(st, t); if (why) this.callTimeout(t, why); }
    }
    for (const t of st.teams) if (t.pendingSubs.length) applyPendingSubs(st, t);
    for (const t of st.teams) {
      if (t.isCPU) coachAdjust(st, t);
      if (t.isCPU || t.autoSub) autoSubs(st, t);
    }
  }

  private endPeriod() {
    const st = this.st;
    emit(st, { type: 'periodEnd', team: st.possession });
    st.momentumOn = false;
    if (st.period >= 4) {
      if (st.teams[0].score !== st.teams[1].score) {
        st.status = 'final';
        emit(st, { type: 'final', team: st.teams[0].score > st.teams[1].score ? 0 : 1, big: true });
        return;
      }
      st.period++; st.overtimes++; st.clock = 300;
      for (const t of st.teams) t.timeouts = 1;
      restAll(st, 10);
      st.possession = st.arrow; st.arrow = (1 - st.arrow) as 0 | 1;
      emit(st, { type: 'overtime', team: st.possession, big: true });
    } else {
      if (st.period === 2) {
        emit(st, { type: 'halftime', team: st.possession });
        restAll(st, 32);
        for (const t of st.teams) t.timeouts = 3;
      } else restAll(st, 8);
      st.period++; st.clock = 600;
      for (const t of st.teams) t.teamFouls = 0;
      st.possession = st.arrow; st.arrow = (1 - st.arrow) as 0 | 1;
      emit(st, { type: 'periodStart', team: st.possession });
    }
    st.shotClock = 24; st.deadBall = true; st.lastEnd = 'period';
    for (const t of st.teams) if (t.isCPU) coachAdjust(st, t, true);
  }

  // ------------------------------------------------------------ user commands
  setTactics(team: 0 | 1, patch: Partial<Tactics>) {
    const t = this.st.teams[team];
    const before = { ...t.tactics };
    Object.assign(t.tactics, patch);
    const changed = (Object.keys(patch) as (keyof Tactics)[]).filter((k) => before[k] !== t.tactics[k]);
    if (changed.length) { this.st.buffer = []; emit(this.st, { type: 'tactic', team, tactic: changed.map((k) => t.tactics[k]).join(' / ') }); return this.st.buffer; }
    return [];
  }
  requestSub(team: 0 | 1, outId: string, inId: string): string | null {
    const t = this.st.teams[team];
    const err = canSub(t, outId, inId);
    if (err) return err;
    if (t.pendingSubs.some((s) => s.out === outId || s.in === inId)) return 'Substitution already queued';
    t.pendingSubs.push({ out: outId, in: inId });
    return null;
  }
  cancelSubs(team: 0 | 1) { this.st.teams[team].pendingSubs = []; }
  /** Immediate substitution (used while the game is stopped for a timeout / break). */
  subNow(team: 0 | 1, outId: string, inId: string): string | null {
    const t = this.st.teams[team];
    const err = canSub(t, outId, inId);
    if (err) return err;
    this.st.buffer = [];
    const i = t.onCourt.indexOf(outId);
    t.onCourt[i] = inId;
    for (const [k, v] of Object.entries(t.matchups)) if (v === outId) t.matchups[k] = inId;
    t.subT[inId] = this.st.elapsed; t.subT[outId] = this.st.elapsed;
    emit(this.st, { type: 'sub', team, player: inId, player2: outId });
    return null;
  }
  requestTimeout(team: 0 | 1): string | null {
    const t = this.st.teams[team];
    if (t.timeouts <= 0) return 'No timeouts left';
    if (this.finished) return 'Game is over';
    t.pendingTimeout = true;
    return null;
  }
  setMatchup(team: 0 | 1, oppId: string, defId: string | null) {
    const t = this.st.teams[team];
    for (const k of Object.keys(t.matchups)) if (defId && t.matchups[k] === defId) delete t.matchups[k];
    if (defId) t.matchups[oppId] = defId; else delete t.matchups[oppId];
  }
  setAutoSub(team: 0 | 1, on: boolean) { this.st.teams[team].autoSub = on; }

  result(): MatchResult { return buildResult(this.st, { mode: this.mode, userTeam: this.userTeam }); }
}

export function simulateMatch(a: TeamConfig, b: TeamConfig, seed: number, opts: MatchOptions = {}): MatchSim {
  const m = new MatchSim(a, b, seed, { keepEvents: false, ...opts });
  m.simToEnd();
  return m;
}
