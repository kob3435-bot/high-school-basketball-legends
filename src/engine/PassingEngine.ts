import type { Player } from './types';
import type { MatchState, TeamRT } from './GameState';
import { eff, sig } from './Player';
import { clamp, type RNG } from './rng';
import type { LineupProfile } from './LineupEngine';
import type { Chemistry } from './ChemistryEngine';
import { offMod, defMod, PACE_MODS } from './TacticalEngine';
import { fatigueFactor } from './FatigueEngine';

export function assistBonus(t: TeamRT, passer: Player | null): number {
  if (!passer) return 0;
  const e = t.energy[passer.id];
  return clamp((eff(passer, 'passing', e) * 0.6 + eff(passer, 'vision', e) * 0.4 - 72) * 0.0011, -0.02, 0.03) + (sig(passer).assist ?? 0);
}

/** Probability that the possession ends in a turnover (ball security of whole unit vs defensive pressure). */
export function possessionTurnoverChance(st: MatchState, o: TeamRT, d: TeamRT, prof: LineupProfile, chem: Chemistry): number {
  const h = prof.handler;
  const hq = h ? (h.attrs.handling * 0.45 + h.attrs.passing * 0.25 + h.attrs.decision * 0.3) * fatigueFactor(o, h.id) : 40;
  let p = 0.2 + (74 - hq) * 0.0019 + (70 - prof.ballMovement) * 0.001;
  const defs = d.onCourt.filter(Boolean).map((id) => d.players[id!]);
  const pressure = defs.reduce((a, x) => a + x.attrs.steal * 0.5 + x.attrs.perimeterD * 0.3 + x.attrs.defIQ * 0.2, 0) / Math.max(1, defs.length);
  p += (pressure - 70) * 0.0012;
  p *= offMod(o).to * PACE_MODS[o.tactics.pace].to * chem.mods.turnover * Math.sqrt(defMod(d).steal);
  let red = 0;
  for (const id of o.onCourt) if (id) red += sig(o.players[id]).teamTO ?? 0;
  p *= 1 - Math.min(0.25, red);
  p += chem.mods.usage * 0.5;
  if (o.onCourt.filter(Boolean).length < 5) p += 0.03;
  return clamp(p, 0.05, 0.3);
}

/** Who commits the turnover: primary handler more often, low handling players more likely. */
export function turnoverCulprit(o: TeamRT, prof: LineupProfile, rng: RNG): Player {
  const ps = o.onCourt.filter(Boolean).map((id) => o.players[id!]);
  const w = ps.map((p) => (p === prof.handler ? 3.2 : 1) * (1 + p.attrs.shotCreation / 100) * Math.max(0.5, (105 - p.attrs.handling) / 30));
  return rng.weighted(ps, w);
}

export function pickPasser(o: TeamRT, exclude: string | null, rng: RNG, prof: LineupProfile): Player | null {
  const ps = o.onCourt.filter((x) => x && x !== exclude).map((id) => o.players[id!]);
  if (!ps.length) return null;
  const w = ps.map((p) => Math.pow(Math.max(20, p.attrs.passing * 0.6 + p.attrs.vision * 0.4 - 35), 2) * (p === prof.handler ? 2 : 1));
  return rng.weighted(ps, w);
}
