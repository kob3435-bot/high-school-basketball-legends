import type { MatchState, TeamRT } from './GameState';
import { lineupKey } from './GameState';
import { offMod, defMod, PACE_MODS } from './TacticalEngine';
import { sig } from './Player';

const BASE_DRAIN = 0.078; // energy per second on court for an average-stamina player
const BENCH_RECOVERY = 0.13;

export function drainRate(t: TeamRT, id: string, st?: MatchState): number {
  const p = t.players[id];
  const staminaK = 1.42 - p.attrs.stamina / 100 * 0.95; // stamina 99 -> 0.48, 50 -> 0.95
  const tactic = offMod(t).fatigue * defMod(t).fatigue * PACE_MODS[t.tactics.pace].fatigue;
  let r = BASE_DRAIN * staminaK * tactic;
  const s = sig(p);
  if (s.neverGiveUp && st && st.period >= 3) {
    const mg = t.score - st.teams[1 - t.idx].score;
    if (mg < 0) r *= 0.6;
  }
  return r;
}

/** Advance game clock by dt seconds. Updates minutes, energy, stints, shot clock. */
export function tick(st: MatchState, dt: number): number {
  dt = Math.max(0, Math.min(dt, st.clock));
  if (dt <= 0) return 0;
  st.clock = Math.max(0, st.clock - dt);
  st.shotClock = Math.max(0, st.shotClock - dt);
  st.elapsed += dt;
  for (const t of st.teams) {
    for (const id of t.roster) {
      if (t.onCourt.includes(id)) {
        t.stats[id].sec += dt;
        t.energy[id] = Math.max(0, t.energy[id] - drainRate(t, id, st) * dt);
      } else {
        t.energy[id] = Math.min(100, t.energy[id] + BENCH_RECOVERY * dt);
      }
    }
    const key = t.idx + ':' + lineupKey(t);
    const s = (st.stints[key] ??= { team: t.idx, ids: t.onCourt.filter(Boolean) as string[], sec: 0, pf: 0, pa: 0 });
    s.sec += dt;
  }
  return dt;
}

export function restAll(st: MatchState, amount: number, onlyCourt = false) {
  for (const t of st.teams) for (const id of t.roster) {
    if (onlyCourt && !t.onCourt.includes(id)) continue;
    t.energy[id] = Math.min(100, t.energy[id] + amount);
  }
}

/** multiplier 0.8..1 describing how fatigued a player is (used for TO and defense). */
export function fatigueFactor(t: TeamRT, id: string): number {
  const e = t.energy[id];
  if (e >= 78) return 1;
  const res = sig(t.players[id]).fatigueResist ?? 0;
  return 1 - (78 - e) * 0.006 * (1 - res);
}
