import type { Pos } from './types';
import { SLOTS } from './types';
import type { MatchState, TeamRT } from './GameState';
import { availableBench } from './GameState';
import { slotFit } from './Player';
import { emit } from './CommentaryEngine';

export function foulLimit(st: MatchState): number {
  if (st.period === 1) return 2;
  if (st.period === 2) return 3;
  if (st.period === 3) return st.clock > 300 ? 3 : 4;
  if (st.period === 4) return st.clock > 360 ? 4 : 5;
  return 5;
}

/** Value of a player in a slot right now (fit, energy, fouls, form). */
export function playerValue(st: MatchState, t: TeamRT, id: string, slot: Pos): number {
  const p = t.players[id];
  let v = slotFit(p, slot) * 0.75 + p.overall * 0.25;
  const e = t.energy[id];
  if (e < 80) v -= (80 - e) * 0.55;
  const pf = t.stats[id].pf;
  if (pf >= foulLimit(st)) v -= 12 + (pf - foulLimit(st)) * 8;
  const s = t.stats[id];
  // form: hot shooters stay, ice cold ones sit a bit more
  if (s.fga >= 5) v += ((s.fgm / s.fga) - 0.42) * 12;
  v += (t.hot[id] ?? 0) * 2;
  return v;
}

export function bestReplacement(st: MatchState, t: TeamRT, slotIdx: number, exclude: string[] = []): string | null {
  const slot = SLOTS[slotIdx];
  const cands = availableBench(t).filter((id) => !exclude.includes(id) && !t.pendingSubs.some((s) => s.in === id));
  if (!cands.length) return null;
  let best: string | null = null, bv = -1e9;
  for (const id of cands) {
    const v = playerValue(st, t, id, slot);
    if (v > bv) { bv = v; best = id; }
  }
  return best;
}

export function canSub(t: TeamRT, outId: string, inId: string): string | null {
  if (!t.onCourt.includes(outId)) return 'Player is not on the court';
  if (t.onCourt.includes(inId)) return 'Player is already on the court';
  if (!t.roster.includes(inId)) return 'Player is not on this team';
  if (t.fouledOut[inId]) return 'Player has fouled out';
  return null;
}

export function performSub(st: MatchState, t: TeamRT, outId: string | null, inId: string, slotIdx?: number): boolean {
  if (outId) {
    const err = canSub(t, outId, inId);
    if (err) return false;
    const i = t.onCourt.indexOf(outId);
    t.onCourt[i] = inId;
    // transfer defensive assignments held by the outgoing player
    for (const [k, v] of Object.entries(t.matchups)) if (v === outId) t.matchups[k] = inId;
    emit(st, { type: 'sub', team: t.idx, player: inId, player2: outId });
    return true;
  }
  if (slotIdx === undefined || t.onCourt[slotIdx] !== null || t.onCourt.includes(inId) || t.fouledOut[inId]) return false;
  t.onCourt[slotIdx] = inId;
  emit(st, { type: 'sub', team: t.idx, player: inId, player2: undefined, text: `Substitution ${t.cfg.name}: ${t.players[inId].name} checks in.` });
  return true;
}

/** Apply queued (user) substitutions. Only called at dead balls. */
export function applyPendingSubs(st: MatchState, t: TeamRT) {
  const q = t.pendingSubs;
  t.pendingSubs = [];
  for (const s of q) performSub(st, t, s.out, s.in);
}
