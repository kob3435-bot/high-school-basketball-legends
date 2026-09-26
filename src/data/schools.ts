import type { School } from '../engine/types';

// Original fictional schools. Colours/logos are generated procedurally from these values.
export const SCHOOLS: School[] = [
  { id: 'shohokai', name: 'Shohokai High', short: 'SHK', primary: '#c8102e', secondary: '#111111', accent: '#ffffff', style: 'Underdog, athletic, fast break, inside-outside', logoShape: 'shield' },
  { id: 'ryonami', name: 'Ryonami High', short: 'RYN', primary: '#1d4ed8', secondary: '#ffffff', accent: '#0b1f4d', style: 'Balanced, point forward, strong interior', logoShape: 'circle' },
  { id: 'kaino', name: 'Kaino Academy', short: 'KAI', primary: '#5b21b6', secondary: '#f5f5f5', accent: '#facc15', style: 'Championship, high IQ, fast, disciplined', logoShape: 'crest' },
  { id: 'shoyo', name: 'Shoyo Institute', short: 'SHY', primary: '#15803d', secondary: '#ffffff', accent: '#0f2e1c', style: 'Twin towers, height, zone defense', logoShape: 'hex' },
  { id: 'sannoh', name: 'Sannoh Peak Academy', short: 'SNP', primary: '#f8f8f8', secondary: '#7f1d1d', accent: '#111111', style: 'National level, elite defense, full-court press, complete', logoShape: 'star' },
  { id: 'toyonami', name: 'Toyonami High', short: 'TYN', primary: '#f59e0b', secondary: '#1f1f1f', accent: '#ffffff', style: 'Run & gun, ultra fast pace, offense', logoShape: 'diamond' },
  { id: 'daiei', name: 'Daiei East', short: 'DAE', primary: '#1e3a8a', secondary: '#eab308', accent: '#ffffff', style: 'Technical, balanced, high IQ', logoShape: 'shield' },
  { id: 'meiho', name: 'Meiho North', short: 'MHN', primary: '#7f1d1d', secondary: '#9ca3af', accent: '#ffffff', style: 'Physical, interior dominance', logoShape: 'hex' },
  { id: 'takezora', name: 'Takezora High', short: 'TKZ', primary: '#0f766e', secondary: '#ffffff', accent: '#042f2e', style: 'Traditional fundamental basketball', logoShape: 'circle' },
  { id: 'tsukumi', name: 'Tsukumi Academy', short: 'TSK', primary: '#38bdf8', secondary: '#0c2340', accent: '#ffffff', style: 'Motion offense, system basketball', logoShape: 'diamond' },
  { id: 'miura', name: 'Miura Tech', short: 'MRT', primary: '#171717', secondary: '#ea580c', accent: '#ffffff', style: 'Physical, aggressive defense', logoShape: 'crest' },
  { id: 'ryoku', name: 'Ryoku Academy', short: 'RYK', primary: '#047857', secondary: '#111827', accent: '#d1fae5', style: 'Modern balanced, deep bench', logoShape: 'star' },
  { id: 'legends', name: 'Legends Select', short: 'LGD', primary: '#b8860b', secondary: '#0a0a0a', accent: '#fff8dc', style: 'Special legend pool for dream teams and exhibitions', logoShape: 'star' },
];

export const SCHOOL_MAP: Record<string, School> = Object.fromEntries(SCHOOLS.map((s) => [s.id, s]));
