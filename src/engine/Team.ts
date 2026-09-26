import type { TeamConfig, Tactics, Player } from './types';
import { PLAYER_MAP } from './db';

export const DEFAULT_TACTICS: Tactics = { offense: 'Balanced', defense: 'Man-to-Man', pace: 'Normal' };

export interface TeamValidation { ok: boolean; errors: string[]; }

/** Validates a team for play: 5 unique starters, bench 0..7 unique & disjoint, all ids exist. */
export function validateTeam(t: TeamConfig, opts: { minBench?: number; maxBench?: number } = {}): TeamValidation {
  const errors: string[] = [];
  const minBench = opts.minBench ?? 0, maxBench = opts.maxBench ?? 7;
  if (!t.name || !t.name.trim()) errors.push('Team needs a name');
  if (t.starters.length !== 5 || t.starters.some((s) => !s)) errors.push('Pick 5 starters (PG, SG, SF, PF, C)');
  const all = [...t.starters.filter(Boolean), ...t.bench];
  if (new Set(all).size !== all.length) errors.push('A player cannot be in two slots');
  for (const id of all) if (!PLAYER_MAP[id]) errors.push('Unknown player ' + id);
  if (t.bench.length < minBench) errors.push(`Bench needs at least ${minBench} players`);
  if (t.bench.length > maxBench) errors.push(`Bench can have at most ${maxBench} players`);
  return { ok: errors.length === 0, errors };
}

export function teamPlayers(t: TeamConfig): Player[] {
  return [...t.starters, ...t.bench].filter(Boolean).map((id) => PLAYER_MAP[id]);
}

export function teamOverall(t: TeamConfig): number {
  const s = t.starters.map((id) => PLAYER_MAP[id]?.overall ?? 0);
  const b = t.bench.map((id) => PLAYER_MAP[id]?.overall ?? 0).sort((a, c) => c - a).slice(0, 3);
  const sAvg = s.reduce((a, c) => a + c, 0) / 5;
  const bAvg = b.length ? b.reduce((a, c) => a + c, 0) / b.length : 50;
  return Math.round(sAvg * 0.8 + bAvg * 0.2);
}

let uid = 0;
export function newTeamId(prefix = 't'): string {
  uid++;
  return `${prefix}_${Date.now().toString(36)}_${uid}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function cloneTeam(t: TeamConfig): TeamConfig {
  return JSON.parse(JSON.stringify(t));
}
