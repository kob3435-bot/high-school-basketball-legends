import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import { SaveEngine, browserKV, type Settings } from '../engine/SaveEngine';
import type { TeamConfig } from '../engine/types';
import type { MatchResult } from '../engine/StatisticsEngine';

export const save = new SaveEngine(browserKV());

export type Mode = 'Quick Match' | 'Dream Team' | 'Tournament' | 'Random Battle';

export type Screen =
  | { name: 'home' }
  | { name: 'builder'; mode: Mode; team?: TeamConfig }
  | { name: 'opponent'; mode: Mode; user: TeamConfig }
  | { name: 'preview'; mode: Mode; user: TeamConfig; cpu: TeamConfig; tournament?: { round: number; idx: number } }
  | { name: 'live'; mode: Mode; user: TeamConfig | null; cpu: TeamConfig; home?: TeamConfig; seed: number; tournament?: { round: number; idx: number }; spectate?: boolean }
  | { name: 'results'; result: MatchResult; mode: Mode; rematch?: { user: TeamConfig; cpu: TeamConfig }; tournament?: boolean; fromHistory?: boolean }
  | { name: 'dream' }
  | { name: 'tournament' }
  | { name: 'random' }
  | { name: 'db' }
  | { name: 'history' }
  | { name: 'settings' };

export interface AppCtx {
  nav: (s: Screen, replace?: boolean) => void;
  back: () => void;
  home: () => void;
  /** Reset the stack to [home, screen]. */
  root: (s: Screen) => void;
  settings: Settings;
  setSettings: (s: Settings) => void;
  toast: (msg: string) => void;
}
export const Ctx = createContext<AppCtx>(null as any);
export const useApp = () => useContext(Ctx);
