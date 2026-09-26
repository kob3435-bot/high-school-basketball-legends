import { describe, it, expect } from 'vitest';
import { validateTeam, teamOverall } from '../src/engine/Team';
import { profileLineup } from '../src/engine/LineupEngine';
import { evaluateChemistry } from '../src/engine/ChemistryEngine';
import { PLAYER_MAP } from '../src/engine/db';
import { possessionTurnoverChance } from '../src/engine/PassingEngine';
import { createMatch } from '../src/engine/GameState';
import { team, SHOHOKAI } from './helpers';

const P = (id: string) => PLAYER_MAP[id];

describe('Team builder & position assignment', () => {
  it('accepts a valid team and rejects invalid ones', () => {
    expect(validateTeam(SHOHOKAI).ok).toBe(true);
    expect(validateTeam(team('x', ['p01', 'p02', 'p03', 'p04'])).ok).toBe(false);
    expect(validateTeam(team('x', ['p01', 'p01', 'p03', 'p04', 'p05'])).errors.join()).toMatch(/two slots/);
    expect(validateTeam(team('x', ['p01', 'p02', 'p03', 'p04', 'p05'], ['p05'])).ok).toBe(false);
    expect(validateTeam(team('x', ['p01', 'p02', 'p03', 'p04', 'p05'], ['p06', 'p07', 'p08', 'p09', 'p10', 'p11', 'p12', 'p13'])).ok).toBe(false);
    expect(validateTeam(team('', ['p01', 'p02', 'p03', 'p04', 'p05'])).ok).toBe(false);
  });
  it('any player can play any slot (no position lock)', () => {
    const weird = team('weird', ['p03', 'p04', 'p05', 'p02', 'p20']); // C at PG, 160cm guard at C
    expect(validateTeam(weird).ok).toBe(true);
    expect(teamOverall(weird)).toBeGreaterThan(40);
  });
  it('flags a low-handling center at PG and raises turnover risk', () => {
    const normal = team('n', ['p04', 'p05', 'p02', 'p01', 'p03']);
    const bad = team('b', ['p03', 'p05', 'p02', 'p01', 'p04']);
    const profBad = profileLineup(bad.starters.map(P));
    expect(profBad.mismatches.some((m) => m.slot === 'PG')).toBe(true);
    expect(profBad.cons.join()).toMatch(/Turnover risk/);
    const st = createMatch(normal, bad, 1);
    const [a, b] = st.teams;
    const pn = profileLineup(normal.starters.map(P)), pb = profileLineup(bad.starters.map(P));
    const toN = possessionTurnoverChance(st, a, b, pn, evaluateChemistry(normal.starters.map(P)));
    const toB = possessionTurnoverChance(st, b, a, pb, evaluateChemistry(bad.starters.map(P)));
    expect(toB).toBeGreaterThan(toN + 0.02);
  });
  it('flags a small guard at C: weaker rebounding and interior defense', () => {
    const small = profileLineup(['p04', 'p05', 'p02', 'p01', 'p20'].map(P));
    const normal = profileLineup(['p04', 'p05', 'p02', 'p01', 'p03'].map(P));
    expect(small.mismatches.some((m) => m.slot === 'C')).toBe(true);
    expect(small.rebounding).toBeLessThan(normal.rebounding);
    expect(small.rimProtection).toBeLessThan(normal.rimProtection);
  });
  it('chemistry rewards elite PG + big and punishes too many ball-dominant stars', () => {
    const pnr = evaluateChemistry(['p29', 'p32', 'p28', 'p12', 'p30'].map(P));
    expect(pnr.items.some((i) => /pick & roll/.test(i.label))).toBe(true);
    const selfish = evaluateChemistry(['p16', 'p02', 'p28', 'p73', 'p54'].map(P));
    expect(selfish.items.some((i) => /ball-dominant/.test(i.label))).toBe(true);
    expect(selfish.mods.usage).toBeGreaterThan(0);
    const tiny = evaluateChemistry(['p04', 'p20', 'p09', 'p47', 'p38'].map(P));
    expect(tiny.items.some((i) => /Too small/.test(i.label))).toBe(true);
  });
});
