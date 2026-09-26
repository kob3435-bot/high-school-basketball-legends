import type { Player, ShotType } from './types';
import type { MatchState, TeamRT } from './GameState';
import { isClutch } from './GameState';
import { eff, sig } from './Player';
import { clamp } from './rng';
import { perimeterRating, interiorRating, isZone } from './DefenseEngine';
import { defMod } from './TacticalEngine';

export const BASE: Record<ShotType, number> = { dunk: 0.82, layup: 0.565, post: 0.46, floater: 0.415, mid: 0.4, three: 0.348 };
const SLOPE: Record<ShotType, number> = { dunk: 0.0011, layup: 0.0025, post: 0.0026, floater: 0.0022, mid: 0.0028, three: 0.0033 };
const CONTEST: Record<ShotType, number> = { dunk: 0.06, layup: 0.11, post: 0.1, floater: 0.08, mid: 0.07, three: 0.065 };
export const INSIDE: ShotType[] = ['dunk', 'layup', 'post', 'floater'];

export function shooterRating(p: Player, type: ShotType, energy: number): number {
  const fr = sig(p).fatigueResist ?? 0;
  const e = (k: Parameters<typeof eff>[1]) => eff(p, k, energy, fr);
  switch (type) {
    case 'dunk': return e('dunk') * 0.6 + e('vertical') * 0.2 + e('strength') * 0.2;
    case 'layup': return e('layup') * 0.7 + e('insideScoring') * 0.3;
    case 'post': return e('postScoring') * 0.6 + e('strength') * 0.2 + e('insideScoring') * 0.2;
    case 'floater': return e('insideScoring') * 0.5 + e('midRange') * 0.3 + e('shotCreation') * 0.2;
    case 'mid': return e('midRange') * 0.85 + e('consistency') * 0.15;
    case 'three': return e('three') * 0.9 + e('consistency') * 0.1;
  }
}

export interface ShotContext {
  shooter: Player;
  o: TeamRT;
  d: TeamRT;
  type: ShotType;
  defender: Player | null;
  openness: number; // 0 = smothered, 1 = wide open
  assisted: boolean;
  assistBonus: number;
  rim: number; // team rim protection rating of defense
  transition?: boolean;
  putback?: boolean;
  chemBonus?: number;
  catchShoot?: boolean;
  heave?: boolean;
}

export function makeProbability(st: MatchState, c: ShotContext): number {
  const { shooter: p, type } = c;
  const s = sig(p);
  const energy = c.o.energy[p.id];
  const rating = shooterRating(p, type, energy);
  let prob = BASE[type] + SLOPE[type] * (rating - 70);
  const inside = INSIDE.includes(type);
  const defR = inside ? interiorRating(c.d, c.defender, p) : perimeterRating(c.d, c.defender, p);
  let contest = (1 - c.openness) * (CONTEST[type] + (defR - 70) * 0.0011);
  if ((type === 'mid' || type === 'post') && s.fadeaway) contest *= 1 - s.fadeaway;
  prob -= Math.max(-0.02, contest);
  if (inside) {
    prob -= (c.rim - 65) * 0.001 * (1 - c.openness * 0.6);
  } else {
    const dm = defMod(c.d);
    prob += dm.perimOpen * 0.35;
    if (isZone(c.d) && type === 'three') prob += 0.004;
  }
  if (type === 'three') prob += s.three ?? 0;
  if (type === 'mid' || type === 'floater') prob += s.mid ?? 0;
  if (type === 'post') prob += s.post ?? 0;
  if (type === 'dunk' || type === 'layup') prob += (s.finish ?? 0) + (c.transition ? s.drive ?? 0 : 0);
  if (c.putback) prob += s.putback ?? 0;
  if (c.catchShoot && (type === 'three' || type === 'mid')) prob += s.catchShoot ?? 0;
  if (c.assisted) prob += c.assistBonus;
  prob += (c.chemBonus ?? 0);
  // hot / cold hand. Low consistency players swing more.
  const swing = 0.018 + (100 - p.attrs.consistency) * 0.0004;
  prob += (c.o.hot[p.id] ?? 0) * swing + (c.o.form[p.id] ?? 0);
  // clutch time: attribute matters a bit more, never guaranteed
  if (isClutch(st)) {
    prob += (p.attrs.clutch - 75) * 0.0011 + (p.attrs.composure - 75) * 0.0005 + (s.clutch ?? 0);
  }
  // Ace mode: raises level when team trails or in the 4th
  if (s.aceMode && (st.period >= 4 || c.o.score < c.d.score)) prob += 0.02;
  if (c.heave) prob = 0.03 + Math.max(0, (p.attrs.three - 80) * 0.002);
  return clamp(prob, 0.03, 0.95);
}

export function blockChance(c: ShotContext, blocker: Player | null, bEnergy: number): number {
  if (!blocker) return 0;
  const inside = INSIDE.includes(c.type);
  const b = eff(blocker, 'block', bEnergy) * 0.7 + eff(blocker, 'vertical', bEnergy) * 0.3;
  const hd = blocker.height - c.shooter.height;
  let base = inside ? (c.type === 'dunk' ? 0.055 : c.type === 'post' ? 0.125 : 0.14) : c.type === 'mid' ? 0.032 : 0.014;
  let ch = base * Math.pow(Math.max(0.2, (b - 40) / 40), 2) * (1 + clamp(hd, -20, 25) * 0.03) * (1 - c.openness * 0.6);
  const s = sig(blocker);
  ch *= s.block ?? 1;
  if (c.transition) ch *= s.chaseDown ?? 1;
  return clamp(ch, 0, 0.3);
}

export function shootingFoulChance(c: ShotContext, fouler: Player | null): number {
  const base: Record<ShotType, number> = { dunk: 0.15, layup: 0.2, post: 0.19, floater: 0.09, mid: 0.045, three: 0.016 };
  let ch = base[c.type];
  const s = sig(c.shooter);
  ch += s.drawFoul ?? 0;
  if (INSIDE.includes(c.type)) ch *= 1 + (c.shooter.attrs.strength - 70) * 0.006 + (c.shooter.attrs.acceleration - 70) * 0.004;
  if (fouler) ch *= 1 + (70 - fouler.attrs.defIQ) * 0.008;
  ch *= defMod(c.d).foul;
  if (c.openness > 0.8) ch *= 0.4;
  return clamp(ch, 0.003, 0.35);
}

export function andOneBonus(c: ShotContext): number {
  // probability multiplier on a fouled attempt (fouled shots go in less often)
  const s = sig(c.shooter);
  const str = (c.shooter.attrs.strength - 70) * 0.004;
  return clamp(0.45 + str + (s.andOne ?? 0), 0.2, 0.85);
}

export function ftProbability(st: MatchState, t: TeamRT, p: Player): number {
  const e = t.energy[p.id];
  let prob = 0.705 + (eff(p, 'freeThrow', e) - 72) * 0.0088;
  if (isClutch(st)) prob += (p.attrs.composure - 75) * 0.0012 + (p.attrs.clutch - 75) * 0.0008;
  prob += (t.hot[p.id] ?? 0) * 0.01;
  return clamp(prob, 0.3, 0.95);
}

/** Shot location in attacking-half coordinates: x = metres-from-baseline / 14, y = metres-from-sideline / 15. Rim at (1.575 m, 7.5 m). */
export function shotZone(type: ShotType, r1: number, r2: number): { x: number; y: number } {
  const rimX = 1.575, rimY = 7.5;
  const polar = (rMin: number, rMax: number, aMax: number) => {
    const a = (r1 * 2 - 1) * aMax;
    const r = rMin + r2 * (rMax - rMin);
    const X = Math.max(0.3, rimX + Math.cos(a) * r), Y = Math.min(14.2, Math.max(0.8, rimY + Math.sin(a) * r));
    return { x: X / 14, y: Y / 15 };
  };
  switch (type) {
    case 'dunk': return polar(0.2, 0.6, 1.2);
    case 'layup': return polar(0.4, 1.3, 1.3);
    case 'post': return polar(1.6, 2.8, 1.1);
    case 'floater': return polar(2.6, 3.8, 1.0);
    case 'mid': return polar(3.8, 5.8, 1.35);
    case 'three': return polar(6.9, 7.8, 1.45);
  }
}
