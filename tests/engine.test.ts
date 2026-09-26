import { describe, it, expect } from 'vitest';
import { MatchSim, simulateMatch } from '../src/engine/Match';
import { createMatch } from '../src/engine/GameState';
import { runPossession } from '../src/engine/PossessionEngine';
import { makeProbability, ftProbability } from '../src/engine/ShotEngine';
import { resolveRebound } from '../src/engine/ReboundEngine';
import { commitFoul, freeThrows } from '../src/engine/FoulEngine';
import { validateMatch, teamTotals, boxScore } from '../src/engine/StatisticsEngine';
import { RNG } from '../src/engine/rng';
import { PLAYER_MAP } from '../src/engine/db';
import { team, SHOHOKAI, SANNOH } from './helpers';

describe('Possession engine', () => {
  it('runs a possession: events, clock, possession change, points only from shots/FTs', () => {
    const m = new MatchSim(SHOHOKAI, SANNOH, 7);
    m.step(); // tipoff
    for (let i = 0; i < 60; i++) {
      const before = m.st.possession, clk = m.st.clock, score = [m.st.teams[0].score, m.st.teams[1].score];
      const evs = m.step();
      if (m.finished) break;
      expect(evs.length).toBeGreaterThan(0);
      if (evs.some((e) => e.type === 'periodStart')) continue;
      expect(m.st.clock).toBeLessThanOrEqual(clk);
      const offense = before;
      const scored = m.st.teams[offense].score - score[offense];
      const shotPts = evs.filter((e) => e.type === 'shot' && e.made && e.team === offense).reduce((a, e) => a + (e.pts ?? 0), 0);
      const ftPts = evs.filter((e) => e.type === 'ft' && e.made && e.team === offense).length;
      expect(scored).toBe(shotPts + ftPts);
      for (const e of evs) if (e.type === 'shot') expect(m.st.teams[e.team].roster).toContain(e.player);
    }
  });
  it('possession alternates after defensive outcomes', () => {
    const st = createMatch(SHOHOKAI, SANNOH, 3);
    st.status = 'live'; st.possession = 0;
    runPossession(st);
    expect(st.possession).toBe(1);
  });
});

describe('Shot engine', () => {
  const st = createMatch(SHOHOKAI, SANNOH, 1);
  const [a, b] = st.teams;
  const base = { o: a, d: b, defender: PLAYER_MAP['p32'], openness: 0.4, assisted: false, assistBonus: 0, rim: 70 };
  it('elite shooter beats poor shooter from three', () => {
    const good = makeProbability(st, { ...base, shooter: PLAYER_MAP['p05'], type: 'three' });
    const bad = makeProbability(st, { ...base, shooter: PLAYER_MAP['p01'], type: 'three' });
    expect(good).toBeGreaterThan(bad + 0.08);
  });
  it('open shots are better than contested shots; rim protection lowers layups', () => {
    const open = makeProbability(st, { ...base, shooter: PLAYER_MAP['p05'], type: 'three', openness: 0.9 });
    const cont = makeProbability(st, { ...base, shooter: PLAYER_MAP['p05'], type: 'three', openness: 0.05 });
    expect(open).toBeGreaterThan(cont);
    const l1 = makeProbability(st, { ...base, shooter: PLAYER_MAP['p02'], type: 'layup', rim: 55 });
    const l2 = makeProbability(st, { ...base, shooter: PLAYER_MAP['p02'], type: 'layup', rim: 95 });
    expect(l1).toBeGreaterThan(l2);
  });
  it('fatigue lowers make probability', () => {
    const fresh = makeProbability(st, { ...base, shooter: PLAYER_MAP['p05'], type: 'three' });
    a.energy['p05'] = 30;
    const tired = makeProbability(st, { ...base, shooter: PLAYER_MAP['p05'], type: 'three' });
    a.energy['p05'] = 100;
    expect(tired).toBeLessThan(fresh);
  });
  it('free throw probability tracks FT rating', () => {
    expect(ftProbability(st, a, PLAYER_MAP['p05'])).toBeGreaterThan(ftProbability(st, a, PLAYER_MAP['p01']) + 0.15);
  });
});

describe('Rebound engine', () => {
  it('a big lineup out-rebounds a tiny one over many misses', () => {
    const big = team('Big', ['p30', 'p31', 'p11', 'p44', 'p39']);
    const tiny = team('Tiny', ['p04', 'p20', 'p09', 'p47', 'p38']);
    const st = createMatch(big, tiny, 5);
    const rng = new RNG(9);
    let bigBoards = 0;
    for (let i = 0; i < 2000; i++) {
      const off = i % 2 === 0 ? st.teams[0] : st.teams[1];
      const def = i % 2 === 0 ? st.teams[1] : st.teams[0];
      const r = resolveRebound(off, def, 'mid', false, rng);
      if (r.team === 0) bigBoards++;
    }
    expect(bigBoards / 2000).toBeGreaterThan(0.58);
  });
});

describe('Fouls & free throws', () => {
  it('tracks personal & team fouls, bonus from the 5th team foul, foul-out at 5 with forced sub', () => {
    const st = createMatch(SHOHOKAI, SANNOH, 2);
    const d = st.teams[1];
    let bonus = false;
    for (let i = 0; i < 4; i++) bonus = commitFoul(st, d, 'p29', 'p04', 'personal');
    expect(bonus).toBe(false);
    expect(d.teamFouls).toBe(4);
    bonus = commitFoul(st, d, 'p29', 'p04', 'personal');
    expect(bonus).toBe(true);
    expect(d.stats['p29'].pf).toBe(5);
    expect(d.fouledOut['p29']).toBe(true);
    expect(d.onCourt).not.toContain('p29');
    expect(d.onCourt.filter(Boolean).length).toBe(5);
    expect(st.events.some((e) => e.type === 'foulOut')).toBe(true);
  });
  it('free throws add exactly the made count to score and stats', () => {
    const st = createMatch(SHOHOKAI, SANNOH, 4);
    const o = st.teams[0];
    let pts = 0;
    freeThrows(st, o, 'p05', 3, (n) => { pts += n; o.score += n; o.stats['p05'].pts += n; });
    expect(o.stats['p05'].fta).toBe(3);
    expect(o.stats['p05'].ftm).toBe(pts);
    expect(st.events.filter((e) => e.type === 'ft').length).toBe(3);
  });
  it('fouled-out players never return and short-handed play works', () => {
    const five = team('Five', ['p04', 'p05', 'p02', 'p01', 'p03']);
    for (let s = 0; s < 30; s++) {
      const m = new MatchSim(five, SANNOH, 100 + s);
      while (!m.finished) {
        m.step();
        for (const t of m.st.teams) for (const id of t.onCourt) if (id) expect(t.fouledOut[id]).toBeFalsy();
      }
      expect(validateMatch(m.st)).toEqual([]);
    }
  });
});

describe('Game clock, quarters, overtime', () => {
  it('runs Q1 -> Q2 -> Halftime -> Q3 -> Q4 -> Final with 40 minutes', () => {
    const m = new MatchSim(SHOHOKAI, SANNOH, 11);
    m.simToEnd();
    const types = m.st.events.filter((e) => ['tipoff', 'periodStart', 'halftime', 'periodEnd', 'final', 'overtime'].includes(e.type)).map((e) => e.type + e.period);
    expect(types.slice(0, 7)).toEqual(['tipoff1', 'periodStart1', 'periodEnd1', 'periodStart2', 'periodEnd2', 'halftime2', 'periodStart3']);
    expect(types).toContain('periodEnd4');
    expect(types[types.length - 1]).toMatch(/^final/);
    expect(m.st.elapsed).toBeCloseTo(2400 + m.st.overtimes * 300, 1);
    for (const e of m.st.events) { expect(e.clock).toBeGreaterThanOrEqual(0); expect(e.shotClock).toBeGreaterThanOrEqual(0); }
  });
  it('a tie after regulation goes to OT, and a tied OT goes to 2OT', () => {
    const m = new MatchSim(SHOHOKAI, SANNOH, 12);
    // play to the end of Q4 then force a tie
    while (!(m.st.period === 4 && m.st.clock <= 0)) m.step();
    const t0 = m.st.teams[0], t1 = m.st.teams[1];
    const fix = (t: typeof t0, target: number) => { const d = target - t.score; t.score = target; t.stats[t.starters[0]].pts += d; t.stats[t.starters[0]].ftm += d; t.stats[t.starters[0]].fta += d; };
    const tie = Math.max(t0.score, t1.score);
    fix(t0, tie); fix(t1, tie);
    m.step();
    expect(m.st.period).toBe(5);
    expect(m.st.clock).toBe(300);
    expect(m.st.events.some((e) => e.type === 'overtime')).toBe(true);
    while (!(m.st.period === 5 && m.st.clock <= 0)) m.step();
    const tie2 = Math.max(t0.score, t1.score);
    fix(t0, tie2); fix(t1, tie2);
    m.step();
    expect(m.st.period).toBe(6);
    m.simToEnd();
    expect(m.st.teams[0].score).not.toBe(m.st.teams[1].score);
    expect(m.st.overtimes).toBeGreaterThanOrEqual(2);
    expect(m.st.elapsed).toBeCloseTo(2400 + 300 * m.st.overtimes, 1);
  });
  it('natural overtimes happen in close matchups', () => {
    let ot = 0;
    for (let s = 0; s < 150; s++) { const m = simulateMatch(SHOHOKAI, team('Mirror', ['p16', 'p17', 'p18', 'p19', 'p23'], ['p20', 'p21', 'p22', 'p24', 'p25']), 500 + s); if (m.st.overtimes) ot++; }
    expect(ot).toBeGreaterThan(0);
  });
});

describe('Score & stats consistency', () => {
  it('200 games: every stat invariant holds', () => {
    for (let s = 0; s < 200; s++) {
      const m = simulateMatch(SHOHOKAI, SANNOH, 1000 + s);
      expect(validateMatch(m.st)).toEqual([]);
      for (const t of m.st.teams) {
        const tt = teamTotals(t);
        const box = boxScore(t);
        expect(box.reduce((a, r) => a + r.pts, 0)).toBe(t.score);
        expect(tt.fgm).toBeLessThanOrEqual(tt.fga);
        expect(tt.possessions).toBeGreaterThan(50);
      }
    }
  });
  it('is deterministic for a given seed', () => {
    const a = simulateMatch(SHOHOKAI, SANNOH, 4242), b = simulateMatch(SHOHOKAI, SANNOH, 4242);
    expect(a.st.teams.map((t) => t.score)).toEqual(b.st.teams.map((t) => t.score));
    expect(JSON.stringify(boxScore(a.st.teams[0]))).toEqual(JSON.stringify(boxScore(b.st.teams[0])));
  });
  it('commentary is generated from real events only (no undefined text)', () => {
    const m = new MatchSim(SHOHOKAI, SANNOH, 77);
    m.simToEnd();
    for (const e of m.st.events) { expect(e.text).toBeTruthy(); expect(e.text).not.toMatch(/undefined|NaN/); }
    const threes = m.st.events.filter((e) => e.type === 'shot' && e.shotType === 'three' && e.made);
    expect(threes.length).toBe(teamTotals(m.st.teams[0]).tpm + teamTotals(m.st.teams[1]).tpm);
  });
});
