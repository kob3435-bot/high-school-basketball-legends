import type { TeamConfig } from '../src/engine/types';
import { PLAYERS } from '../src/engine/db';
export function team(name: string, starters: string[], bench: string[] = [], tactics: Partial<TeamConfig['tactics']> = {}): TeamConfig {
  return { id: 'T_' + name, name, short: name.slice(0, 3).toUpperCase(), primary: '#c00', secondary: '#000', logoSeed: 1, starters, bench, tactics: { offense: 'Balanced', defense: 'Man-to-Man', pace: 'Normal', ...tactics } };
}
export const byName = (n: string) => PLAYERS.find((p) => p.name.includes(n))!.id;
export const SHOHOKAI = team('Shohokai', ['p04', 'p05', 'p02', 'p01', 'p03'], ['p06', 'p07', 'p08', 'p09']);
export const SANNOH = team('Sannoh', ['p29', 'p32', 'p28', 'p30', 'p31'], ['p33', 'p69', 'p13', 'p19', 'p25']);
