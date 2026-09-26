import playersJson from '../data/players.json';
import type { Player } from './types';
import { SCHOOLS, SCHOOL_MAP } from '../data/schools';

export const PLAYERS: Player[] = playersJson as Player[];
export const PLAYER_MAP: Record<string, Player> = Object.fromEntries(PLAYERS.map((p) => [p.id, p]));
export { SCHOOLS, SCHOOL_MAP };

export function getPlayer(id: string): Player {
  const p = PLAYER_MAP[id];
  if (!p) throw new Error('Unknown player id ' + id);
  return p;
}
