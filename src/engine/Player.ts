import type { AttrKey, Attributes, Player, Pos } from './types';
import { clamp } from './rng';
import { sigEffect, type SigEffect } from './signatures';

const OVR_W: Record<Pos, Partial<Record<AttrKey, number>>> = {
  PG: { handling: 3, passing: 3, vision: 2, decision: 2, three: 1.5, midRange: 1, layup: 1, shotCreation: 1.5, perimeterD: 1.5, steal: 1, speed: 1.5, iq: 1.5, pickRoll: 1, clutch: 0.5 },
  SG: { three: 3, midRange: 2, shotCreation: 2, offBall: 1.5, layup: 1, handling: 1.5, perimeterD: 1.5, steal: 1, speed: 1, freeThrow: 1, iq: 1, clutch: 1 },
  SF: { insideScoring: 1.5, midRange: 1.5, three: 1.5, shotCreation: 2, layup: 1.5, perimeterD: 1.5, helpD: 1, vertical: 1, speed: 1, dreb: 1, iq: 1, handling: 1, dunk: 1 },
  PF: { insideScoring: 2, postScoring: 1.5, midRange: 1, dreb: 2, oreb: 1.5, boxOut: 1, interiorD: 2, block: 1, strength: 1.5, vertical: 1, helpD: 1, iq: 1 },
  C: { interiorD: 2.5, block: 2, dreb: 2, oreb: 1.5, boxOut: 1.5, postScoring: 1.5, insideScoring: 1.5, strength: 1.5, helpD: 1, iq: 1, dunk: 0.5 },
};

export function slotRating(a: Attributes, pos: Pos, height: number): number {
  const w = OVR_W[pos];
  let s = 0, t = 0;
  for (const [k, v] of Object.entries(w)) { s += a[k as AttrKey] * (v as number); t += v as number; }
  let r = s / t;
  // size requirements per slot (in cm) — small bigs and giant guards lose value
  const ideal: Record<Pos, number> = { PG: 178, SG: 183, SF: 188, PF: 192, C: 197 };
  const diff = height - ideal[pos];
  if (pos === "C" || pos === "PF") r += clamp(diff, -25, 5) * 0.28;
  else if (pos === 'PG') r -= Math.max(0, diff - 8) * 0.25;
  return r;
}

export function computeOverall(a: Attributes, pos: Pos, height: number): number {
  const raw = slotRating(a, pos, height);
  // Overall also rewards the general quality of the whole profile a little
  const avg = Object.values(a).reduce((x, y) => x + y, 0) / Object.values(a).length;
  const posAdj: Record<Pos, number> = { PG: 0, SG: 0.5, SF: 1, PF: -1.5, C: -3 };
  const v = raw * 0.8 + avg * 0.2 + posAdj[pos];
  return Math.round(clamp(62 + (v - 66) * 1.3, 45, 97));
}

/** How well does player fit a slot, 0..100ish. Used by LineupEngine, auto-subs, and CPU drafting. */
export function slotFit(p: Player, pos: Pos): number {
  return slotRating(p.attrs, pos, p.height);
}

const sigCache = new Map<string, SigEffect>();
export function sig(p: Player): SigEffect {
  let s = sigCache.get(p.id);
  if (!s) { s = sigEffect(p.signatures); sigCache.set(p.id, s); }
  return s;
}

/** Fatigue-adjusted attribute. energy 0..100. */
export function eff(p: Player, k: AttrKey, energy: number, fatigueResist = 0): number {
  const base = p.attrs[k];
  if (energy >= 78) return base;
  const pen = (78 - energy) * 0.38 * (1 - fatigueResist);
  return base - pen;
}

export function isBig(p: Player) { return p.pos === 'C' || p.pos === 'PF' || p.height >= 193; }
export function isGuard(p: Player) { return p.pos === 'PG' || p.pos === 'SG'; }

export function ballDominant(p: Player) {
  return ['Isolation Scorer', 'Scoring PG', 'All-Round Superstar'].includes(p.archetype) || p.attrs.shotCreation >= 92;
}

export function shooterScore(p: Player) { return p.attrs.three; }
