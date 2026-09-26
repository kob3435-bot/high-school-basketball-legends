// Core shared types for the HIGH SCHOOL BASKETBALL LEGENDS simulation engine.
export type Pos = 'PG' | 'SG' | 'SF' | 'PF' | 'C';
export const SLOTS: Pos[] = ['PG', 'SG', 'SF', 'PF', 'C'];

export const ATTR_GROUPS = {
  Offense: ['insideScoring', 'midRange', 'three', 'freeThrow', 'layup', 'dunk', 'postScoring', 'shotCreation', 'offBall'],
  Playmaking: ['passing', 'vision', 'handling', 'decision', 'pickRoll'],
  Defense: ['perimeterD', 'interiorD', 'steal', 'block', 'helpD', 'defIQ'],
  Physical: ['speed', 'acceleration', 'strength', 'vertical', 'agility', 'stamina'],
  Rebounding: ['oreb', 'dreb', 'boxOut'],
  Mental: ['iq', 'clutch', 'consistency', 'composure', 'teamwork'],
} as const;

export type AttrKey =
  | 'insideScoring' | 'midRange' | 'three' | 'freeThrow' | 'layup' | 'dunk' | 'postScoring' | 'shotCreation' | 'offBall'
  | 'passing' | 'vision' | 'handling' | 'decision' | 'pickRoll'
  | 'perimeterD' | 'interiorD' | 'steal' | 'block' | 'helpD' | 'defIQ'
  | 'speed' | 'acceleration' | 'strength' | 'vertical' | 'agility' | 'stamina'
  | 'oreb' | 'dreb' | 'boxOut'
  | 'iq' | 'clutch' | 'consistency' | 'composure' | 'teamwork';

export const ALL_ATTRS: AttrKey[] = Object.values(ATTR_GROUPS).flat() as AttrKey[];

export const ATTR_LABELS: Record<AttrKey, string> = {
  insideScoring: 'Inside Scoring', midRange: 'Mid Range', three: '3PT', freeThrow: 'Free Throw', layup: 'Layup', dunk: 'Dunk',
  postScoring: 'Post Scoring', shotCreation: 'Shot Creation', offBall: 'Off-ball Movement',
  passing: 'Passing', vision: 'Court Vision', handling: 'Ball Handling', decision: 'Decision Making', pickRoll: 'Pick & Roll',
  perimeterD: 'Perimeter D', interiorD: 'Interior D', steal: 'Steal', block: 'Block', helpD: 'Help D', defIQ: 'Defensive IQ',
  speed: 'Speed', acceleration: 'Acceleration', strength: 'Strength', vertical: 'Vertical', agility: 'Agility', stamina: 'Stamina',
  oreb: 'Off. Rebound', dreb: 'Def. Rebound', boxOut: 'Box Out',
  iq: 'Basketball IQ', clutch: 'Clutch', consistency: 'Consistency', composure: 'Composure', teamwork: 'Teamwork',
};

export type Attributes = Record<AttrKey, number>;

export const ARCHETYPES = [
  'Floor General', 'Scoring PG', 'Sharpshooter', 'Slasher', 'Two-Way Guard', 'Point Forward', 'Isolation Scorer',
  'Athletic Wing', '3&D Wing', 'Defensive Specialist', 'Stretch Four', 'Post Scorer', 'Rim Protector',
  'Rebounding Monster', 'All-Round Superstar', 'Sixth Man',
] as const;
export type Archetype = typeof ARCHETYPES[number];

export type Tier = 'legend' | 'superstar' | 'star' | 'starter' | 'role';

export interface Player {
  id: string;
  num: number;
  name: string;
  school: string; // school id
  pos: Pos;
  pos2: Pos | null;
  height: number; // cm
  weight: number; // kg
  overall: number;
  archetype: Archetype;
  tier: Tier;
  jersey: number;
  attrs: Attributes;
  strengths: string[];
  weaknesses: string[];
  signatures: string[];
  bio: string;
}

export interface School {
  id: string;
  name: string;
  short: string;
  primary: string;
  secondary: string;
  accent: string;
  style: string;
  logoShape: 'shield' | 'circle' | 'diamond' | 'hex' | 'star' | 'crest';
}

export const OFF_TACTICS = ['Balanced', 'Fast Break', 'Run & Gun', 'Inside Focus', 'Perimeter Focus', 'Pick & Roll', 'Isolation', 'Motion Offense'] as const;
export type OffTactic = typeof OFF_TACTICS[number];
export const DEF_TACTICS = ['Man-to-Man', '2-3 Zone', '3-2 Zone', 'Full Court Press', 'Half Court Press', 'Double Team Star', 'Protect Paint', 'Guard Perimeter'] as const;
export type DefTactic = typeof DEF_TACTICS[number];
export const PACES = ['Slow', 'Normal', 'Fast'] as const;
export type Pace = typeof PACES[number];

export interface Tactics { offense: OffTactic; defense: DefTactic; pace: Pace; }

export interface TeamConfig {
  id: string;
  name: string;
  short: string;
  primary: string;
  secondary: string;
  logoSeed: number;
  starters: string[]; // 5 player ids in slot order PG,SG,SF,PF,C
  bench: string[];
  tactics: Tactics;
  template?: string;
  isCPU?: boolean;
  /** explicit defensive assignments: opponent player id -> our defender id */
  matchups?: Record<string, string>;
}

export type ShotType = 'dunk' | 'layup' | 'post' | 'floater' | 'mid' | 'three';
export type PlayType = 'pnr' | 'iso' | 'post' | 'drive' | 'spot' | 'cut' | 'mid' | 'transition' | 'putback' | 'press-break' | 'heave';

export type EventType =
  | 'tipoff' | 'periodStart' | 'periodEnd' | 'halftime' | 'final' | 'bringUp' | 'pass' | 'screen' | 'drive' | 'postUp' | 'cut'
  | 'iso' | 'shot' | 'block' | 'rebound' | 'turnover' | 'steal' | 'foul' | 'ft' | 'sub' | 'timeout' | 'tactic' | 'fastBreak'
  | 'violation' | 'foulOut' | 'run' | 'info' | 'doubleTeam' | 'pressBreak' | 'overtime';

export interface SimEvent {
  id: number;
  t: number; // elapsed game seconds
  period: number;
  clock: number; // seconds remaining in period
  shotClock: number;
  type: EventType;
  team: 0 | 1;
  player?: string;
  player2?: string;
  shotType?: ShotType;
  playType?: PlayType;
  made?: boolean;
  pts?: number;
  x?: number; // 0..1 across attacking half (0 = baseline under the rim, 1 = half court)
  y?: number; // 0..1 sideline to sideline
  offensive?: boolean;
  text: string;
  score: [number, number];
  big?: boolean; // highlight-worthy
}

export interface PlayerGameStats {
  sec: number; pts: number; oreb: number; dreb: number; ast: number; stl: number; blk: number; tov: number; pf: number;
  fgm: number; fga: number; tpm: number; tpa: number; ftm: number; fta: number; pm: number;
}

export function emptyStats(): PlayerGameStats {
  return { sec: 0, pts: 0, oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, tov: 0, pf: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, pm: 0 };
}

export interface TeamExtraStats {
  fbPts: number; paintPts: number; secondPts: number; ptsOffTO: number; benchPts: number; possessions: number;
  timeoutsUsed: number; leadMax: number; biggestRun: number;
}
