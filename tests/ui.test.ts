import { describe, it, expect } from 'vitest';
import { MatchSim } from '../src/engine/Match';
import { generateTeam } from '../src/engine/CPUCoachEngine';
import { autoFillBench, validateTeam } from '../src/engine/Team';
import { CourtView } from '../src/ui/court';
import { awayKit, dist } from '../src/ui/kit';
import type { TeamConfig } from '../src/engine/types';

const teams = (seed: number): [TeamConfig, TeamConfig] => {
  const a = generateTeam(seed);
  const b = generateTeam(seed + 1, { exclude: [...a.starters, ...a.bench] });
  return [a, b];
};

describe('Live match event stream drives the court view', () => {
  it('court lineups stay in sync with the simulation through subs, foul-outs and every period', () => {
    for (let g = 0; g < 25; g++) {
      const [a, b] = teams(500 + g * 7);
      const m = new MatchSim(a, b, 9000 + g);
      const nums: Record<string, number> = {};
      for (const t of m.st.teams) for (const id of t.roster) nums[id] = t.players[id].jersey;
      const cv = new CourtView([m.st.teams[0].onCourt, m.st.teams[1].onCourt], nums, [['#c8102e', '#111'], ['#1d4ed8', '#fff']]);
      let steps = 0;
      while (!m.finished && steps++ < 5000) {
        const evs = m.step();
        for (const e of evs) { cv.apply(e); cv.update(0.05, 4); }
        // at every step boundary the rendered lineup equals the sim lineup
        for (const t of [0, 1] as const) expect(cv.lineups[t]).toEqual(m.st.teams[t].onCourt);
        expect(cv.dots.size).toBe(m.st.teams[0].onCourt.filter(Boolean).length + m.st.teams[1].onCourt.filter(Boolean).length);
      }
      expect(m.finished).toBe(true);
      expect(cv.period).toBe(m.st.period);
    }
  });

  it('events carry scoreboard snapshots (score, clock, shot clock, team fouls, timeouts) that never go backwards incorrectly', () => {
    const [a, b] = teams(77);
    const m = new MatchSim(a, b, 4242);
    m.simToEnd();
    let prevT = 0;
    for (const e of m.st.events) {
      expect(e.t).toBeGreaterThanOrEqual(prevT - 1e-9); prevT = e.t;
      expect(e.clock).toBeGreaterThanOrEqual(0);
      expect(e.shotClock).toBeGreaterThanOrEqual(0);
      expect(e.shotClock).toBeLessThanOrEqual(24);
      expect(e.tf).toBeDefined(); expect(e.to).toBeDefined();
      expect(e.text.length).toBeGreaterThan(0);
    }
    const last = m.st.events[m.st.events.length - 1];
    expect(last.type).toBe('final');
    expect(last.score).toEqual([m.st.teams[0].score, m.st.teams[1].score]);
  });
});

describe('User timeouts and substitutions', () => {
  it('a user timeout is its own step (play stops before the next possession) and an immediate sub applies right away', () => {
    const [a, b] = teams(31);
    const m = new MatchSim(a, b, 555, { userTeam: 0, autoSubUser: false });
    for (let i = 0; i < 20; i++) m.step();
    expect(m.requestTimeout(0)).toBeNull();
    let evs: ReturnType<typeof m.step> = [];
    for (let i = 0; i < 50; i++) { evs = m.step(); if (evs.some((e) => e.type === 'timeout' && e.team === 0)) break; }
    expect(evs.map((e) => e.type)).toEqual(['timeout']);
    const t = m.st.teams[0];
    const out = t.onCourt[0]!; const inn = t.roster.find((id) => !t.onCourt.includes(id))!;
    expect(m.subNow(0, out, inn)).toBeNull();
    expect(t.onCourt[0]).toBe(inn);
    expect(t.onCourt).not.toContain(out);
    const next = m.step();
    expect(next.some((e) => e.player === out && e.team === 0 && e.type !== 'sub')).toBe(false);
    expect(t.timeouts).toBeLessThan(2);
  });

  it('running out of timeouts is reported, not silently ignored', () => {
    const [a, b] = teams(41);
    const m = new MatchSim(a, b, 1, { userTeam: 0 });
    m.st.teams[0].timeouts = 0;
    expect(m.requestTimeout(0)).toBe('No timeouts left');
  });
});

describe('Team builder helpers and uniforms', () => {
  it('auto-fills the bench to the target with unique players', () => {
    const t: TeamConfig = { id: 'x', name: 'X', short: 'X', primary: '#000', secondary: '#fff', logoSeed: 1, starters: ['p01', 'p02', 'p03', 'p04', 'p05'].map((_, i) => generateTeam(3).starters[i]), bench: [], tactics: { offense: 'Balanced', defense: 'Man-to-Man', pace: 'Normal' } };
    const f = autoFillBench(t, 7, 99);
    expect(f.bench).toHaveLength(7);
    expect(validateTeam(f, { minBench: 5, maxBench: 7 }).ok).toBe(true);
  });
  it('away team switches to a contrasting kit when colours clash', () => {
    const home = { primary: '#c8102e', secondary: '#111111' } as TeamConfig;
    const clash = { primary: '#7f1d1d', secondary: '#e5e7eb' } as TeamConfig;
    const k = awayKit(home, clash);
    expect(dist(k.primary, home.primary)).toBeGreaterThanOrEqual(140);
    const fine = { primary: '#1d4ed8', secondary: '#ffffff' } as TeamConfig;
    expect(awayKit(home, fine)).toBe(fine);
  });
});
