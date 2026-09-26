import { describe, it, expect } from 'vitest';
import { SaveEngine, memoryKV, DEFAULT_SETTINGS } from '../src/engine/SaveEngine';
import { createTournament, simulateAll, simulateCpuGames, advance, userMatchIndex, recordResult, roundComplete, userEliminated } from '../src/engine/Tournament';
import { MatchSim, simulateMatch } from '../src/engine/Match';
import { extremeTeam, superstarTeam, gen, lineupProsCons } from '../src/engine/Balance';
import { validateMatch } from '../src/engine/StatisticsEngine';
import type { Pos } from '../src/engine/types';
import { SHOHOKAI, SANNOH } from './helpers';

describe('Save / load', () => {
  it('dream teams CRUD, history, settings, tournament persist through the storage layer', () => {
    const kv = memoryKV();
    const s = new SaveEngine(kv);
    s.saveDreamTeam(SHOHOKAI);
    s.saveDreamTeam({ ...SANNOH, id: 'x2' });
    expect(new SaveEngine(kv).getDreamTeams().map((t) => t.id)).toEqual([SHOHOKAI.id, 'x2']);
    s.saveDreamTeam({ ...SHOHOKAI, name: 'Renamed' });
    expect(new SaveEngine(kv).getDreamTeams()[0].name).toBe('Renamed');
    s.deleteDreamTeam('x2');
    expect(new SaveEngine(kv).getDreamTeams().length).toBe(1);
    const m = new MatchSim(SHOHOKAI, SANNOH, 5, { userTeam: 0 }); m.simToEnd();
    const r = m.result();
    s.addHistory(r);
    const back = new SaveEngine(kv).getHistoryItem(r.id)!;
    expect(back.teams[0].score).toBe(m.st.teams[0].score);
    expect(back.box[0].reduce((a, x) => a + x.pts, 0)).toBe(m.st.teams[0].score);
    for (let i = 0; i < 50; i++) s.addHistory({ ...r, id: 'h' + i });
    expect(s.getHistory().length).toBe(40);
    expect(s.getSettings()).toEqual(DEFAULT_SETTINGS);
    s.saveSettings({ ...DEFAULT_SETTINGS, volume: 0.2, muted: true });
    expect(new SaveEngine(kv).getSettings().muted).toBe(true);
    const career = s.careerStats();
    expect(Object.keys(career).length).toBeGreaterThan(5);
  });
  it('survives corrupted data', () => {
    const kv = memoryKV();
    kv.setItem('hsbl.v1.dreamTeams', '{not json');
    expect(new SaveEngine(kv).getDreamTeams()).toEqual([]);
  });
});

describe('Tournament', () => {
  it('16 teams, R16 -> QF -> SF -> Final, crowns a champion', () => {
    const ts = createTournament(SHOHOKAI, 77);
    expect(ts.teams.length).toBe(16);
    expect(ts.userIdx).not.toBeNull();
    expect(new Set(ts.teams.map((t) => t.name)).size).toBe(16);
    for (const t of ts.teams) if (t.id !== SHOHOKAI.id) for (const id of [...t.starters, ...t.bench]) expect([...SHOHOKAI.starters, ...SHOHOKAI.bench]).not.toContain(id);
    expect(ts.rounds.map((r) => r.length)).toEqual([8, 4, 2, 1]);
    // user plays their own game; cpu games simulated
    simulateCpuGames(ts);
    expect(roundComplete(ts)).toBe(false);
    const ui = userMatchIndex(ts);
    expect(ui).toBeGreaterThanOrEqual(0);
    const um = ts.rounds[0][ui];
    const sim = simulateMatch(ts.teams[um.a!], ts.teams[um.b!], 5);
    recordResult(ts, 0, ui, [sim.st.teams[0].score, sim.st.teams[1].score]);
    expect(roundComplete(ts)).toBe(true);
    advance(ts);
    expect(ts.round).toBe(1);
    expect(ts.rounds[1].every((m) => m.a !== null && m.b !== null)).toBe(true);
    simulateAll(ts);
    expect(ts.champion).not.toBeNull();
    const finalM = ts.rounds[3][0];
    expect([finalM.a, finalM.b]).toContain(ts.champion);
    expect(typeof userEliminated(ts)).toBe('boolean');
  });
  it('spectator tournament (no user team) completes', () => {
    const ts = createTournament(null, 5);
    simulateAll(ts);
    expect(ts.champion).not.toBeNull();
  });
});

describe('Extreme lineups & balance sanity', () => {
  it('5PG / 5SG / 5SF / 5PF / 5C run without errors and report pros & cons', () => {
    for (const pos of ['PG', 'SG', 'SF', 'PF', 'C'] as Pos[]) {
      const a = extremeTeam(pos, 3);
      const pc = lineupProsCons(a);
      expect(pc.pros.length + pc.cons.length).toBeGreaterThan(0);
      for (let s = 0; s < 15; s++) {
        const b = gen(s + 1, 'Balanced', 'Average', [...a.starters, ...a.bench]);
        const m = simulateMatch(a, b, 60 + s);
        expect(validateMatch(m.st)).toEqual([]);
      }
    }
    expect(lineupProsCons(extremeTeam('PG', 3)).cons.join()).toMatch(/rim protector|Undersized/);
    expect(lineupProsCons(extremeTeam('C', 3)).pros.join()).toMatch(/rim protection|Big lineup/);
  });
  it('an all-superstar lineup does not auto-win against a balanced strong team', () => {
    let wins = 0; const N = 60;
    for (let s = 0; s < N; s++) {
      const a = superstarTeam();
      const b = gen(s + 11, 'Balanced', 'Strong', [...a.starters, ...a.bench]);
      if (simulateMatch(a, b, 700 + s).st.teams[0].score > simulateMatch(a, b, 700 + s).st.teams[1].score) wins++;
    }
    expect(wins / N).toBeLessThan(0.95);
    expect(wins / N).toBeGreaterThan(0.4);
  });
  it('weaker teams can upset stronger ones sometimes, but skill wins more', () => {
    let upsets = 0; const N = 120;
    for (let s = 0; s < N; s++) {
      const strong = gen(s * 3 + 1, 'Balanced', 'Strong');
      const avg = gen(s * 3 + 2, 'Balanced', 'Average', [...strong.starters, ...strong.bench]);
      const m = simulateMatch(avg, strong, 800 + s);
      if (m.st.teams[0].score > m.st.teams[1].score) upsets++;
    }
    expect(upsets).toBeGreaterThan(4);
    expect(upsets / N).toBeLessThan(0.45);
  });
  it('realistic scoring over 150 random games', () => {
    let pts = 0, n = 0;
    for (let s = 0; s < 75; s++) { const a = gen(s * 5 + 1); const b = gen(s * 5 + 2, undefined, undefined, [...a.starters, ...a.bench]); const m = simulateMatch(a, b, s); pts += m.st.teams[0].score + m.st.teams[1].score; n += 2; }
    expect(pts / n).toBeGreaterThan(62);
    expect(pts / n).toBeLessThan(88);
  });
});
