import type { Player, ShotType } from './types';
import type { TeamRT } from './GameState';
import { rebWeight } from './LineupEngine';
import { sig } from './Player';
import { clamp, type RNG } from './rng';
import { offMod, defMod } from './TacticalEngine';
import type { Chemistry } from './ChemistryEngine';

export interface ReboundResult { team: 0 | 1; player: Player | null; offensive: boolean; }

export function resolveRebound(o: TeamRT, d: TeamRT, shotType: ShotType | 'ft', blocked: boolean, rng: RNG, chemO?: Chemistry, chemD?: Chemistry): ReboundResult {
  const off = o.onCourt.filter(Boolean).map((id) => o.players[id!]);
  const def = d.onCourt.filter(Boolean).map((id) => d.players[id!]);
  const long = shotType === 'three' || shotType === 'mid';
  // Slot positioning: C and PF slots are near the rim; guards get long rebounds
  const posW = (t: TeamRT, p: Player) => {
    const i = t.onCourt.indexOf(p.id);
    const inside = i >= 3 ? 1.25 : i === 2 ? 1.0 : 0.8;
    return long ? 1 + (inside - 1) * 0.5 : inside;
  };
  const ow = off.map((p) => rebWeight(p, 'oreb', o.energy[p.id]) * posW(o, p) * (sig(p).oreb ?? 1));
  const dw = def.map((p) => rebWeight(p, 'dreb', d.energy[p.id]) * posW(d, p) * (sig(p).dreb ?? 1));
  const O = ow.reduce((a, b) => a + b, 0) * (chemO?.mods.rebound ?? 1);
  const D = dw.reduce((a, b) => a + b, 0) * (chemD?.mods.rebound ?? 1);
  const boxOut = def.reduce((a, p) => a + p.attrs.boxOut, 0) / Math.max(1, def.length);
  let base = shotType === 'ft' ? 0.13 : blocked ? 0.36 : long ? 0.265 : 0.275;
  let pO = base * Math.pow(O / Math.max(1, D), 1.1) * (1 - (boxOut - 70) * 0.004);
  pO *= offMod(o).oreb * defMod(d).orebAllowed;
  pO = clamp(pO, 0.06, 0.55);
  if (rng.chance(pO)) {
    const pl = off.length ? rng.weighted(off, ow.map((w) => w * w)) : null;
    return { team: o.idx, player: pl, offensive: true };
  }
  const pl = def.length ? rng.weighted(def, dw.map((w) => w * w)) : null;
  return { team: d.idx, player: pl, offensive: false };
}
