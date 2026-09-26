import type { Player, Pos } from './types';
import { SLOTS } from './types';
import { slotFit } from './Player';

export interface LineupProfile {
  handler: Player | null;
  handlerQuality: number;
  ballMovement: number;
  shooters: number;
  spacing: number;
  rimProtection: number;
  rimProtector: Player | null;
  rebounding: number;
  size: number;
  perimeterD: number;
  speed: number;
  interiorScoring: number;
  creation: number;
  mismatches: { slot: Pos; playerId: string; text: string; severity: number }[];
  pros: string[];
  cons: string[];
  fitAvg: number;
}

export function rebWeight(p: Player, kind: 'oreb' | 'dreb', energy = 100): number {
  const fat = energy >= 75 ? 1 : 1 - (75 - energy) * 0.006;
  const r = p.attrs[kind] * 0.55 + p.attrs.boxOut * 0.15 + p.attrs.vertical * 0.15 + p.attrs.strength * 0.15;
  const h = 1 + (p.height - 186) * 0.018;
  return Math.max(5, r * h * fat);
}

export function handlerScore(p: Player): number {
  return p.attrs.handling * 0.45 + p.attrs.passing * 0.25 + p.attrs.decision * 0.3;
}

export function rimScore(p: Player): number {
  return p.attrs.block * 0.4 + p.attrs.interiorD * 0.45 + p.attrs.helpD * 0.15 + (p.height - 190) * 0.8;
}

/** Profile of five players in slot order (PG,SG,SF,PF,C). Null = empty slot (short-handed). */
export function profileLineup(slots: (Player | null)[]): LineupProfile {
  const ps = slots.filter((x): x is Player => !!x);
  const n = Math.max(1, ps.length);
  const avg = (f: (p: Player) => number) => ps.reduce((a, p) => a + f(p), 0) / n;
  const handler = slots[0] ?? ps.slice().sort((a, b) => handlerScore(b) - handlerScore(a))[0] ?? null;
  const handlerQuality = handler ? handlerScore(handler) : 40;
  const shooters = ps.filter((p) => p.attrs.three >= 78).length + ps.filter((p) => p.attrs.three >= 88).length * 0.5;
  const spacing = ps.reduce((a, p) => a + Math.max(0, p.attrs.three - 55) / 30, 0);
  // rim protection: C slot player counts most (positioning), best other big helps
  let rimProtection = 40, rimProtector: Player | null = null;
  const cands = slots.map((p, i) => (p ? { p, v: rimScore(p) * (i === 4 ? 1 : i === 3 ? 0.92 : 0.8) } : null)).filter(Boolean) as { p: Player; v: number }[];
  if (cands.length) { cands.sort((a, b) => b.v - a.v); rimProtection = cands[0].v + (cands[1] ? cands[1].v * 0.15 : 0) - 8; rimProtector = cands[0].p; }
  const rebounding = ps.reduce((a, p) => a + rebWeight(p, 'dreb'), 0) * (5 / n);
  const size = avg((p) => p.height);
  const perimeterD = avg((p) => p.attrs.perimeterD);
  const speed = avg((p) => (p.attrs.speed + p.attrs.acceleration) / 2);
  const interiorScoring = Math.max(0, ...ps.map((p) => (p.attrs.postScoring + p.attrs.insideScoring) / 2));
  const creation = Math.max(0, ...ps.map((p) => p.attrs.shotCreation));
  const ballMovement = avg((p) => p.attrs.passing * 0.4 + p.attrs.vision * 0.3 + p.attrs.teamwork * 0.3);
  const mismatches: LineupProfile['mismatches'] = [];
  slots.forEach((p, i) => {
    if (!p) return;
    const slot = SLOTS[i];
    if (slot === 'PG' && p.attrs.handling < 70) mismatches.push({ slot, playerId: p.id, severity: (70 - p.attrs.handling) / 10, text: `${p.name} (handling ${p.attrs.handling}) at PG: more turnovers, less ball movement, weaker fast break` });
    if (slot === 'C' && (p.height < 190 || (p.attrs.dreb + p.attrs.interiorD) / 2 < 70)) mismatches.push({ slot, playerId: p.id, severity: Math.max(0, (192 - p.height) / 6), text: `${p.name} (${p.height}cm) at C: weaker rebounding, interior & post defense` });
    if (slot === 'PF' && p.height < 184) mismatches.push({ slot, playerId: p.id, severity: (184 - p.height) / 8, text: `${p.name} (${p.height}cm) at PF: gets bullied inside` });
    if ((slot === 'PG' || slot === 'SG') && p.height >= 196) mismatches.push({ slot, playerId: p.id, severity: 1, text: `${p.name} (${p.height}cm) at ${slot}: struggles to stay in front of quick guards` });
    if ((slot === 'SG' || slot === 'SF') && p.attrs.three < 55 && p.attrs.handling < 60) mismatches.push({ slot, playerId: p.id, severity: 0.8, text: `${p.name} on the wing: defenders sag off, cramped spacing` });
  });
  const fitAvg = slots.reduce((a, p, i) => a + (p ? slotFit(p, SLOTS[i]) : 30), 0) / 5;
  const pros: string[] = [], cons: string[] = [];
  if (shooters >= 3.5) pros.push('Elite floor spacing'); else if (shooters <= 1) cons.push('Poor spacing — defenses can pack the paint');
  if (handlerQuality >= 85) pros.push('Excellent ball handling at PG'); else if (handlerQuality < 68) cons.push('Turnover risk: weak primary ball handler');
  if (rimProtection >= 80) pros.push('Strong rim protection'); else if (rimProtection < 58) cons.push('No rim protector — opponents will attack the paint');
  if (size >= 192) pros.push('Big lineup: rebounding and interior size'); else if (size <= 181) cons.push('Undersized: rebounding and post defense disadvantage');
  if (speed >= 84) pros.push('Very fast: dangerous in transition'); else if (speed <= 66) cons.push('Slow: vulnerable in transition defense');
  if (perimeterD >= 82) pros.push('Lockdown perimeter defense'); else if (perimeterD < 62) cons.push('Leaky perimeter defense');
  if (interiorScoring >= 88) pros.push('Dominant interior scorer');
  if (creation >= 92) pros.push('Elite shot creator for late-clock possessions');
  if (ballMovement >= 80) pros.push('Great ball movement'); else if (ballMovement < 62) cons.push('Stagnant ball movement');
  if (ps.length < 5) cons.push(`Short-handed (${ps.length} players)`);
  return { handler, handlerQuality, ballMovement, shooters, spacing, rimProtection, rimProtector, rebounding, size, perimeterD, speed, interiorScoring, creation, mismatches, pros, cons, fitAvg };
}
