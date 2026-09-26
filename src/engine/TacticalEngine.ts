import type { DefTactic, OffTactic, Pace, PlayType } from './types';
import type { TeamRT, MatchState } from './GameState';
import type { LineupProfile } from './LineupEngine';
import type { Chemistry } from './ChemistryEngine';
import type { RNG } from './rng';
import { clamp } from './rng';
import { sig } from './Player';

export type HalfPlay = 'pnr' | 'iso' | 'post' | 'drive' | 'spot' | 'cut' | 'mid';
export const HALF_PLAYS: HalfPlay[] = ['pnr', 'iso', 'post', 'drive', 'spot', 'cut', 'mid'];

interface OffMod { w: Partial<Record<HalfPlay, number>>; trans: number; dur: number; oreb: number; to: number; fatigue: number; passes: number; open: number; assist: number; }
interface DefMod { w: Partial<Record<HalfPlay, number>>; insideContest: number; perimOpen: number; steal: number; foul: number; orebAllowed: number; fatigue: number; dur: number; pressTO: number; transAllowed: number; }

export const OFF_MODS: Record<OffTactic, OffMod> = {
  'Balanced': { w: {}, trans: 1, dur: 1, oreb: 1, to: 1, fatigue: 1, passes: 0, open: 0, assist: 1 },
  'Fast Break': { w: { drive: 1.15 }, trans: 1.65, dur: 0.93, oreb: 0.85, to: 1.03, fatigue: 1.06, passes: 0, open: 0, assist: 1 },
  'Run & Gun': { w: { spot: 1.4, mid: 0.8, post: 0.6, drive: 1.1 }, trans: 1.45, dur: 0.86, oreb: 0.85, to: 1.07, fatigue: 1.12, passes: -0.5, open: -0.02, assist: 0.95 },
  'Inside Focus': { w: { post: 2.0, drive: 1.5, cut: 1.3, spot: 0.6, mid: 0.7, iso: 0.8 }, trans: 0.95, dur: 1.05, oreb: 1.12, to: 1.02, fatigue: 1.02, passes: 0, open: 0, assist: 1 },
  'Perimeter Focus': { w: { spot: 1.9, mid: 1.2, pnr: 1.1, post: 0.5, drive: 0.8, cut: 0.7 }, trans: 1, dur: 1, oreb: 0.92, to: 0.98, fatigue: 1, passes: 0.5, open: 0.02, assist: 1.05 },
  'Pick & Roll': { w: { pnr: 2.6, iso: 0.8, post: 0.8, drive: 0.9, spot: 0.9, cut: 0.8, mid: 0.8 }, trans: 1, dur: 1.02, oreb: 1, to: 1, fatigue: 1, passes: 0, open: 0.01, assist: 1.05 },
  'Isolation': { w: { iso: 2.8, spot: 0.7, cut: 0.5, pnr: 0.7, post: 1.0, mid: 1.1 }, trans: 0.95, dur: 1.08, oreb: 0.95, to: 0.95, fatigue: 1, passes: -1, open: -0.03, assist: 0.8 },
  'Motion Offense': { w: { cut: 2.0, spot: 1.4, pnr: 0.9, iso: 0.5, post: 0.8, drive: 0.9 }, trans: 1, dur: 1.1, oreb: 1, to: 1.03, fatigue: 1.03, passes: 1.2, open: 0.05, assist: 1.15 },
};

export const DEF_MODS: Record<DefTactic, DefMod> = {
  'Man-to-Man': { w: {}, insideContest: 0, perimOpen: 0, steal: 1, foul: 1, orebAllowed: 1, fatigue: 1, dur: 1, pressTO: 0, transAllowed: 1 },
  '2-3 Zone': { w: { drive: 0.7, post: 0.75, spot: 1.25, mid: 1.15, iso: 0.85 }, insideContest: 0.03, perimOpen: 0.06, steal: 0.9, foul: 0.85, orebAllowed: 1.12, fatigue: 0.92, dur: 1.08, pressTO: 0, transAllowed: 1 },
  '3-2 Zone': { w: { drive: 0.9, post: 1.2, spot: 0.9, cut: 1.1 }, insideContest: -0.02, perimOpen: -0.02, steal: 1.05, foul: 0.9, orebAllowed: 1.08, fatigue: 0.95, dur: 1.05, pressTO: 0, transAllowed: 1 },
  'Full Court Press': { w: {}, insideContest: -0.01, perimOpen: 0.02, steal: 1.3, foul: 1.25, orebAllowed: 1.02, fatigue: 1.32, dur: 0.92, pressTO: 0.07, transAllowed: 1.1 },
  'Half Court Press': { w: { drive: 1.05 }, insideContest: 0, perimOpen: 0.01, steal: 1.15, foul: 1.12, orebAllowed: 1, fatigue: 1.12, dur: 0.95, pressTO: 0.03, transAllowed: 1.03 },
  'Double Team Star': { w: {}, insideContest: 0, perimOpen: 0.04, steal: 1.08, foul: 1.03, orebAllowed: 1.05, fatigue: 1.08, dur: 1.02, pressTO: 0, transAllowed: 1 },
  'Protect Paint': { w: { drive: 0.7, post: 0.7, cut: 0.75, spot: 1.3, mid: 1.1 }, insideContest: 0.045, perimOpen: 0.07, steal: 0.95, foul: 0.95, orebAllowed: 0.92, fatigue: 1, dur: 1.03, pressTO: 0, transAllowed: 1 },
  'Guard Perimeter': { w: { spot: 0.7, mid: 0.9, drive: 1.25, post: 1.25, cut: 1.1 }, insideContest: -0.035, perimOpen: -0.07, steal: 1.05, foul: 1.05, orebAllowed: 1.05, fatigue: 1.05, dur: 1.02, pressTO: 0, transAllowed: 1 },
};

export const PACE_MODS: Record<Pace, { dur: number; trans: number; fatigue: number; to: number }> = {
  Slow: { dur: 1.08, trans: 0.7, fatigue: 0.9, to: 0.95 },
  Normal: { dur: 1, trans: 1, fatigue: 1, to: 1 },
  Fast: { dur: 0.9, trans: 1.25, fatigue: 1.12, to: 1.06 },
};

/** Tactic "execution" boost from players like Tactical Commander / Game Controller on the floor. */
export function tacticBoost(t: TeamRT): number {
  let b = 0;
  for (const id of t.onCourt) if (id) b += sig(t.players[id]).tacticBoost ?? 0;
  return Math.min(0.4, b);
}

function amp(v: number, boost: number) { return 1 + (v - 1) * (1 + boost); }

export function offMod(t: TeamRT) { return OFF_MODS[t.tactics.offense]; }
export function defMod(t: TeamRT) { return DEF_MODS[t.tactics.defense]; }

export function playWeights(o: TeamRT, d: TeamRT, prof: LineupProfile, chem: Chemistry): Record<HalfPlay, number> {
  const ps = o.onCourt.filter(Boolean).map((id) => o.players[id!]);
  const mx = (f: (p: typeof ps[number]) => number) => Math.max(40, ...ps.map(f));
  const bestCreate = mx((p) => p.attrs.shotCreation);
  const bestPost = mx((p) => (p.attrs.postScoring * 0.7 + p.attrs.strength * 0.3));
  const bestDrive = mx((p) => (p.attrs.layup + p.attrs.acceleration + p.attrs.shotCreation) / 3);
  const bestMid = mx((p) => p.attrs.midRange);
  const avgOffBall = ps.reduce((a, p) => a + p.attrs.offBall, 0) / Math.max(1, ps.length);
  const pnrQ = prof.handler ? (prof.handler.attrs.pickRoll + mx((p) => (p === prof.handler ? 0 : p.attrs.pickRoll * 0.5 + p.attrs.insideScoring * 0.5))) / 2 : 50;
  const f = (x: number, c: number) => Math.pow(clamp((x - c) / 25, 0.15, 2.2), 1.4);
  const base: Record<HalfPlay, number> = {
    pnr: 17 * f(pnrQ, 50) * (1 + chem.mods.pnr * 6),
    iso: 11 * f(bestCreate, 58),
    post: 12 * f(bestPost, 60),
    drive: 15 * f(bestDrive, 55) * (1 + chem.mods.spacing * 3),
    spot: 19 * clamp(prof.spacing / 2.2, 0.25, 2.2),
    cut: 8 * f(avgOffBall, 52),
    mid: 10 * f(bestMid, 55),
  };
  const om = offMod(o), dm = defMod(d);
  const ob = tacticBoost(o);
  const out = {} as Record<HalfPlay, number>;
  for (const k of HALF_PLAYS) out[k] = base[k] * amp(om.w[k] ?? 1, ob) * (dm.w[k] ?? 1);
  return out;
}

/** Seconds from start of half-court possession to the final action. */
export function possessionDuration(st: MatchState, o: TeamRT, d: TeamRT, rng: RNG): number {
  const om = offMod(o), dm = defMod(d), pm = PACE_MODS[o.tactics.pace];
  // stacked tempo modifiers are capped so even run & gun vs a press stays within realistic 40-minute tempo
  let mean = 18.2 * clamp(om.dur * dm.dur * pm.dur, 0.87, 1.08);
  // Late game clock management
  const mg = o.score - d.score;
  if (st.period >= 4 && st.clock < 150) {
    if (mg > 0) mean = 21; // milk the clock
    else if (mg < 0) mean = Math.min(mean, 9);
  }
  let dur = clamp(rng.gauss(mean, 3.0), 4, 22.6);
  return dur;
}

export function transitionChance(st: MatchState, o: TeamRT, d: TeamRT, prof: LineupProfile, chem: Chemistry, cause: 'dreb' | 'steal'): number {
  const om = offMod(o), dm = defMod(d), pm = PACE_MODS[o.tactics.pace];
  const base = cause === 'steal' ? 0.38 : 0.1;
  const speed = clamp((prof.speed - 70) / 60, -0.25, 0.3);
  const handler = clamp((prof.handlerQuality - 72) / 80, -0.25, 0.2);
  let fb = 0;
  for (const id of o.onCourt) if (id) fb += sig(o.players[id]).fastBreak ?? 0;
  const p = base * om.trans * pm.trans * dm.transAllowed * (1 + speed + handler) + chem.mods.transition * (cause === 'steal' ? 1 : 0.5) + fb;
  return clamp(p, 0.02, cause === 'steal' ? 0.7 : 0.4);
}
