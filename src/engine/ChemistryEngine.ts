import type { Player } from './types';
import { ballDominant } from './Player';

export interface ChemItem { label: string; value: number; }
export interface Chemistry {
  score: number;
  items: ChemItem[];
  mods: { pnr: number; spacing: number; catchShoot: number; transition: number; usage: number; rebound: number; turnover: number; assist: number };
}

/** Evaluates on-court chemistry. Slot order matters (PG slot = primary handler, C slot = anchor). */
export function evaluateChemistry(slots: (Player | null)[]): Chemistry {
  const ps = slots.filter((x): x is Player => !!x);
  const items: ChemItem[] = [];
  const mods = { pnr: 0, spacing: 0, catchShoot: 0, transition: 0, usage: 0, rebound: 1, turnover: 1, assist: 0 };
  const pg = slots[0];
  const bigs = [slots[3], slots[4]].filter((x): x is Player => !!x);
  const shooters = ps.filter((p) => p.attrs.three >= 82);
  // Elite PG + elite big -> pick & roll
  if (pg && pg.attrs.passing >= 86 && pg.attrs.pickRoll >= 78 && bigs.some((b) => b.attrs.insideScoring >= 82 || b.attrs.pickRoll >= 78)) {
    mods.pnr += 0.04; items.push({ label: 'Elite PG + big: deadly pick & roll', value: 4 });
  }
  // Slasher + shooters -> spacing
  const slashers = ps.filter((p) => ['Slasher', 'Athletic Wing', 'Isolation Scorer', 'Scoring PG', 'All-Round Superstar'].includes(p.archetype) && p.attrs.layup >= 80);
  if (slashers.length >= 1 && shooters.length >= 2) { mods.spacing += 0.05; items.push({ label: 'Slasher + shooters: driving lanes open up', value: 4 }); }
  // Elite passer + off-ball shooter -> catch & shoot
  const passers = ps.filter((p) => p.attrs.passing >= 88);
  const offBallShooters = ps.filter((p) => p.attrs.offBall >= 82 && p.attrs.three >= 84);
  if (passers.length && offBallShooters.some((s) => !passers.every((pp) => pp.id === s.id))) { mods.catchShoot += 0.03; items.push({ label: 'Elite passer finds off-ball shooters', value: 3 }); }
  // Rebounder + fast guards -> transition
  const rebounders = ps.filter((p) => p.archetype === 'Rebounding Monster' || p.attrs.dreb >= 90);
  const fast = ps.filter((p) => p.attrs.speed >= 86);
  if (rebounders.length && fast.length >= 2) { mods.transition += 0.06; items.push({ label: 'Rebounder + fast guards: instant transition', value: 3 }); }
  // Same school familiarity
  const bySchool: Record<string, number> = {};
  for (const p of ps) if (p.school !== 'legends') bySchool[p.school] = (bySchool[p.school] ?? 0) + 1;
  const fam = Math.max(0, ...Object.values(bySchool));
  if (fam >= 3) { mods.turnover *= 0.95; mods.assist += 0.01; items.push({ label: `${fam} teammates from the same school: familiarity`, value: fam - 1 }); }
  // Teamwork
  const tw = ps.reduce((a, p) => a + p.attrs.teamwork, 0) / Math.max(1, ps.length);
  if (tw >= 80) { mods.assist += 0.01; mods.turnover *= 0.96; items.push({ label: 'High teamwork', value: 2 }); }
  if (tw < 64) { mods.turnover *= 1.05; items.push({ label: 'Low teamwork: selfish possessions', value: -2 }); }
  // Negatives
  const dominant = ps.filter(ballDominant);
  if (dominant.length >= 3) { mods.usage += 0.012 * (dominant.length - 2); mods.turnover *= 1 + 0.04 * (dominant.length - 2); items.push({ label: `${dominant.length} ball-dominant stars: usage conflict`, value: -3 * (dominant.length - 2) }); }
  const realShooters = ps.filter((p) => p.attrs.three >= 75).length;
  if (realShooters <= 1) { mods.spacing -= 0.06; items.push({ label: 'Few shooters: cramped spacing', value: -4 }); }
  const avgH = ps.reduce((a, p) => a + p.height, 0) / Math.max(1, ps.length);
  if (avgH < 182) { mods.rebound *= 0.9; items.push({ label: 'Too small: rebounding disadvantage', value: -3 }); }
  const handlers = ps.filter((p) => p.attrs.handling >= 75).length;
  if (handlers === 0) { mods.turnover *= 1.1; items.push({ label: 'No reliable ball handler', value: -4 }); }
  const score = items.reduce((a, i) => a + i.value, 0);
  return { score, items, mods };
}
