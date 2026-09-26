/** SaveEngine: versioned persistence (LocalStorage in the browser, in-memory in tests). */
import type { TeamConfig } from './types';
import type { MatchResult } from './StatisticsEngine';
import type { TournamentState } from './Tournament';

export interface KV { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void; }

export function memoryKV(): KV {
  const m = new Map<string, string>();
  return { getItem: (k) => (m.has(k) ? m.get(k)! : null), setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
}

export function browserKV(): KV {
  try {
    const t = '__hsbl_test__';
    window.localStorage.setItem(t, '1');
    window.localStorage.removeItem(t);
    return window.localStorage;
  } catch {
    return memoryKV();
  }
}

export interface Settings { volume: number; muted: boolean; defaultSpeed: 1 | 2 | 4; autoSub: boolean; commentary: boolean; }
export const DEFAULT_SETTINGS: Settings = { volume: 0.6, muted: false, defaultSpeed: 1, autoSub: true, commentary: true };

export interface CareerLine { gp: number; pts: number; reb: number; ast: number; stl: number; blk: number; fgm: number; fga: number; tpm: number; tpa: number; }

export class SaveEngine {
  static VERSION = 1;
  constructor(private kv: KV, private prefix = 'hsbl.v1.') {}
  private get<T>(k: string, def: T): T {
    try {
      const raw = this.kv.getItem(this.prefix + k);
      if (!raw) return def;
      return JSON.parse(raw) as T;
    } catch {
      return def;
    }
  }
  private set(k: string, v: unknown): boolean {
    try { this.kv.setItem(this.prefix + k, JSON.stringify(v)); return true; } catch { return false; }
  }

  getDreamTeams(): TeamConfig[] { return this.get<TeamConfig[]>('dreamTeams', []); }
  saveDreamTeam(t: TeamConfig): TeamConfig[] {
    const list = this.getDreamTeams();
    const i = list.findIndex((x) => x.id === t.id);
    const copy = JSON.parse(JSON.stringify(t)) as TeamConfig;
    if (i >= 0) list[i] = copy; else list.push(copy);
    this.set('dreamTeams', list);
    return list;
  }
  deleteDreamTeam(id: string): TeamConfig[] {
    const list = this.getDreamTeams().filter((t) => t.id !== id);
    this.set('dreamTeams', list);
    return list;
  }

  getHistory(): MatchResult[] { return this.get<MatchResult[]>('history', []); }
  getHistoryItem(id: string): MatchResult | undefined { return this.getHistory().find((m) => m.id === id); }
  addHistory(r: MatchResult, cap = 40): MatchResult[] {
    let list = [r, ...this.getHistory().filter((m) => m.id !== r.id)].slice(0, cap);
    // shrink on quota errors
    while (!this.set('history', list) && list.length > 1) list = list.slice(0, Math.floor(list.length * 0.7));
    return list;
  }
  clearHistory() { this.kv.removeItem(this.prefix + 'history'); }

  getSettings(): Settings { return { ...DEFAULT_SETTINGS, ...this.get<Partial<Settings>>('settings', {}) }; }
  saveSettings(s: Settings) { this.set('settings', s); }

  getTournament(): TournamentState | null { return this.get<TournamentState | null>('tournament', null); }
  saveTournament(t: TournamentState) { this.set('tournament', t); }
  clearTournament() { this.kv.removeItem(this.prefix + 'tournament'); }

  careerStats(): Record<string, CareerLine> {
    const out: Record<string, CareerLine> = {};
    for (const m of this.getHistory()) for (const side of m.box) for (const r of side) {
      if (r.sec <= 0) continue;
      const c = (out[r.id] ??= { gp: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0 });
      c.gp++; c.pts += r.pts; c.reb += r.reb; c.ast += r.ast; c.stl += r.stl; c.blk += r.blk; c.fgm += r.fgm; c.fga += r.fga; c.tpm += r.tpm; c.tpa += r.tpa;
    }
    return out;
  }

  clearAll() { for (const k of ['dreamTeams', 'history', 'settings', 'tournament']) this.kv.removeItem(this.prefix + k); }
}
