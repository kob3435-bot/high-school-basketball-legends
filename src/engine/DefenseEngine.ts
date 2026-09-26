import type { Player } from './types';
import type { TeamRT } from './GameState';
import { eff, sig } from './Player';
import { profileLineup, rimScore } from './LineupEngine';
import { defMod } from './TacticalEngine';
import { fatigueFactor } from './FatigueEngine';
import { clamp } from './rng';

export const isZone = (d: TeamRT) => d.tactics.defense === '2-3 Zone' || d.tactics.defense === '3-2 Zone';

/** Full defensive assignment: offensive player id -> defender id. Honours user/CPU matchups, then slots. */
export function assignments(o: TeamRT, d: TeamRT): Record<string, string> {
  const res: Record<string, string> = {};
  const used = new Set<string>();
  const offOn = o.onCourt.filter(Boolean) as string[];
  const defOn = d.onCourt.filter(Boolean) as string[];
  for (const oid of offOn) {
    const m = d.matchups[oid];
    if (m && defOn.includes(m) && !used.has(m)) { res[oid] = m; used.add(m); }
  }
  o.onCourt.forEach((oid, i) => {
    if (!oid || res[oid]) return;
    const cand = d.onCourt[i];
    if (cand && !used.has(cand)) { res[oid] = cand; used.add(cand); }
  });
  for (const oid of offOn) {
    if (res[oid]) continue;
    const free = defOn.find((x) => !used.has(x));
    if (free) { res[oid] = free; used.add(free); }
  }
  return res;
}

export function defenderOf(o: TeamRT, d: TeamRT, offId: string): Player | null {
  const id = assignments(o, d)[offId];
  return id ? d.players[id] : null;
}

export function perimeterRating(d: TeamRT, def: Player | null, shooter?: Player): number {
  if (!def) return 30;
  const e = d.energy[def.id];
  let r = eff(def, 'perimeterD', e) * 0.6 + eff(def, 'agility', e) * 0.2 + eff(def, 'speed', e) * 0.1 + def.attrs.defIQ * 0.1 + (sig(def).onBallD ?? 0);
  if (shooter) {
    const quick = (shooter.attrs.speed + shooter.attrs.acceleration) / 2 - (def.attrs.speed + def.attrs.agility) / 2;
    if (quick > 0) r -= quick * 0.25;
    // length helps contest jumpers
    r += clamp(def.height - shooter.height, -15, 15) * 0.25;
  }
  return r;
}

export function interiorRating(d: TeamRT, def: Player | null, shooter?: Player): number {
  if (!def) return 30;
  const e = d.energy[def.id];
  let r = eff(def, 'interiorD', e) * 0.5 + eff(def, 'block', e) * 0.2 + eff(def, 'strength', e) * 0.15 + def.attrs.defIQ * 0.15 + (sig(def).onBallD ?? 0) * 0.5;
  if (shooter) r += clamp(def.height - shooter.height, -20, 20) * 0.45 + (def.attrs.strength - shooter.attrs.strength) * 0.08;
  return r;
}

/** Team rim protection 30..100 for the current on-court defense incl. fatigue, signatures and tactic. */
export function rimProtection(d: TeamRT): { rating: number; protector: Player | null } {
  const slots = d.onCourt.map((id) => (id ? d.players[id] : null));
  const prof = profileLineup(slots);
  let r = prof.rimProtection;
  if (prof.rimProtector) r *= fatigueFactor(d, prof.rimProtector.id);
  for (const id of d.onCourt) if (id) r += sig(d.players[id]).paint ?? 0;
  r += defMod(d).insideContest * 200;
  return { rating: r, protector: prof.rimProtector };
}

/** Pick a help defender for blocks: weighted toward rim protectors. */
export function helpDefender(d: TeamRT, exclude: string | null, rnd: number): Player | null {
  const cands = (d.onCourt.filter((x) => x && x !== exclude) as string[]).map((id) => d.players[id]);
  if (!cands.length) return null;
  const w = cands.map((p) => Math.pow(Math.max(5, rimScore(p) + 20), 3));
  const tot = w.reduce((a, b) => a + b, 0);
  let r = rnd * tot;
  for (let i = 0; i < cands.length; i++) { r -= w[i]; if (r <= 0) return cands[i]; }
  return cands[cands.length - 1];
}

/** Average perimeter defense of the defense (used for zone coverage and help rotation). */
export function teamPerimeter(d: TeamRT): number {
  const ps = d.onCourt.filter(Boolean).map((id) => d.players[id!]);
  if (!ps.length) return 30;
  return ps.reduce((a, p) => a + perimeterRating(d, p) * 0.7 + p.attrs.helpD * 0.3, 0) / ps.length - (5 - ps.length) * 8;
}

export function stealer(d: TeamRT, near: Player | null, rnd: number): Player | null {
  const cands = d.onCourt.filter(Boolean).map((id) => d.players[id!]);
  if (!cands.length) return null;
  const w = cands.map((p) => Math.pow(p.attrs.steal, 3) * (sig(p).steal ?? 1) * (near && p.id === near.id ? 2.2 : 1));
  const tot = w.reduce((a, b) => a + b, 0);
  let r = rnd * tot;
  for (let i = 0; i < cands.length; i++) { r -= w[i]; if (r <= 0) return cands[i]; }
  return cands[0];
}
