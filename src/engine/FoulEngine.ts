import type { Player } from './types';
import type { MatchState, TeamRT } from './GameState';
import { emit } from './CommentaryEngine';
import { bestReplacement, performSub } from './SubstitutionEngine';
import { ftProbability } from './ShotEngine';
import { defMod } from './TacticalEngine';
import { clamp } from './rng';

export const FOUL_OUT = 5;
export const BONUS_AT = 5; // FIBA: from the 5th team foul in a period, defensive fouls give 2 FTs

/** Record a personal foul. Handles team fouls, foul-outs and forced substitutions. Returns true if the offense is in the bonus. */
export function commitFoul(st: MatchState, t: TeamRT, foulerId: string, victimId: string | undefined, kind: 'shooting' | 'personal' | 'offensive' | 'intentional'): boolean {
  const s = t.stats[foulerId];
  s.pf++;
  t.teamFouls++;
  emit(st, { type: 'foul', team: t.idx, player: foulerId, player2: victimId, kind, n: s.pf, of: t.teamFouls });
  if (s.pf >= FOUL_OUT && !t.fouledOut[foulerId]) {
    t.fouledOut[foulerId] = true;
    emit(st, { type: 'foulOut', team: t.idx, player: foulerId, big: true });
    const slot = t.onCourt.indexOf(foulerId);
    // cancel any pending sub involving him
    t.pendingSubs = t.pendingSubs.filter((p) => p.in !== foulerId && p.out !== foulerId);
    if (slot >= 0) {
      const rep = bestReplacement(st, t, slot);
      if (rep) performSub(st, t, foulerId, rep);
      else {
        t.onCourt[slot] = null;
        emit(st, { type: 'info', team: t.idx, text: `${t.cfg.name} have no substitutes left — playing short-handed!` });
      }
    }
  }
  return t.teamFouls >= BONUS_AT;
}

export function nonShootingFoulChance(o: TeamRT, d: TeamRT): number {
  const defs = d.onCourt.filter(Boolean).map((id) => d.players[id!]);
  const iq = defs.reduce((a, p) => a + p.attrs.defIQ, 0) / Math.max(1, defs.length);
  return clamp(0.14 * defMod(d).foul * (1 + (70 - iq) * 0.012), 0.03, 0.2);
}

export function pickFouler(d: TeamRT, near: Player | null, rnd: number): Player | null {
  const defs = d.onCourt.filter(Boolean).map((id) => d.players[id!]);
  if (!defs.length) return null;
  const w = defs.map((p) => (near && p.id === near.id ? 3 : 1) * Math.max(0.4, (100 - p.attrs.defIQ) / 30));
  const tot = w.reduce((a, b) => a + b, 0);
  let r = rnd * tot;
  for (let i = 0; i < defs.length; i++) { r -= w[i]; if (r <= 0) return defs[i]; }
  return defs[0];
}

/** Shoots n free throws. Returns whether the last one was made. */
export function freeThrows(st: MatchState, o: TeamRT, shooterId: string, n: number, onScore: (pts: number) => void): boolean {
  const p = o.players[shooterId];
  let last = false;
  for (let i = 1; i <= n; i++) {
    const prob = ftProbability(st, o, p);
    const made = st.rng.chance(prob);
    o.stats[shooterId].fta++;
    if (made) { o.stats[shooterId].ftm++; onScore(1); }
    emit(st, { type: 'ft', team: o.idx, player: shooterId, made, n: i, of: n });
    last = made;
  }
  return last;
}
