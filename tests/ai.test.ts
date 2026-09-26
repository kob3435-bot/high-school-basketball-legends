import { describe, it, expect } from 'vitest';
import { generateTeam, makeGamePlan, TEMPLATES, pickStarters } from '../src/engine/CPUCoachEngine';
import { MatchSim, simulateMatch } from '../src/engine/Match';
import { validateTeam } from '../src/engine/Team';
import { PLAYER_MAP } from '../src/engine/db';
import { slotFit } from '../src/engine/Player';
import { validateMatch } from '../src/engine/StatisticsEngine';
import { team, SHOHOKAI, SANNOH } from './helpers';

describe('CPU team generator', () => {
  it('drafts 10-12 unique players for every template and level', () => {
    for (const tpl of TEMPLATES) for (const level of ['Weak', 'Average', 'Strong', 'Elite', 'Random'] as const) {
      const t = generateTeam(tpl.length * 1000 + level.length, { template: tpl, level });
      const all = [...t.starters, ...t.bench];
      expect(new Set(all).size).toBe(all.length);
      expect(all.length).toBeGreaterThanOrEqual(10);
      expect(all.length).toBeLessThanOrEqual(12);
      expect(validateTeam(t).ok).toBe(true);
      expect(t.template).toBe(tpl);
    }
  });
  it('excludes the opponent\'s players', () => {
    const ex = [...SHOHOKAI.starters, ...SHOHOKAI.bench];
    for (let s = 0; s < 30; s++) { const t = generateTeam(s, { exclude: ex }); for (const id of [...t.starters, ...t.bench]) expect(ex).not.toContain(id); }
  });
  it('templates shape the roster (twin towers are taller than small ball)', () => {
    let tall = 0, small = 0;
    for (let s = 0; s < 20; s++) {
      tall += ['PF', 'C'].map((_, i) => PLAYER_MAP[generateTeam(s, { template: 'Twin Towers', level: 'Average' }).starters[3 + i]].height).reduce((a, b) => a + b, 0);
      small += ['PF', 'C'].map((_, i) => PLAYER_MAP[generateTeam(s, { template: 'Small Ball', level: 'Average' }).starters[3 + i]].height).reduce((a, b) => a + b, 0);
    }
    expect(tall).toBeGreaterThan(small);
    const threes = generateTeam(3, { template: 'Three-Point Army', level: 'Strong' }).starters.map((id) => PLAYER_MAP[id].attrs.three);
    expect(threes.reduce((a, b) => a + b, 0) / 5).toBeGreaterThan(75);
  });
  it('picks sensible starters (best slot value first)', () => {
    const { starters } = pickStarters(['p03', 'p04', 'p05', 'p02', 'p01', 'p06', 'p07', 'p08', 'p09']);
    expect(starters[0]).toBe('p04');
    expect(starters[4]).toBe('p03');
    expect(slotFit(PLAYER_MAP[starters[4]], 'C')).toBeGreaterThan(slotFit(PLAYER_MAP['p09'], 'C'));
  });
});

describe('CPU game plan (responds to the opponent)', () => {
  const cpu = team('CPU', ['p65', 'p66', 'p64', 'p67', 'p68'], ['p56', 'p57', 'p58']);
  it('tight coverage on an elite shooter', () => {
    const opp = team('Shooters', ['p22', 'p17', 'p35', 'p40', 'p23']);
    const plan = makeGamePlan(cpu, opp);
    expect(plan.deny).toBe('p17');
    expect(plan.matchups['p17']).toBeTruthy();
  });
  it('packs the paint / doubles a dominant center', () => {
    const opp = team('Bigs', ['p41', 'p42', 'p43', 'p40', 'p44']);
    const plan = makeGamePlan(cpu, opp);
    expect(['Protect Paint', 'Double Team Star']).toContain(plan.tactics.defense);
    expect(plan.doubleTarget).toBe('p44');
  });
  it('attacks the paint when the opponent has no rim protector', () => {
    const opp = team('Tiny', ['p04', 'p20', 'p09', 'p47', 'p38']);
    expect(makeGamePlan(cpu, opp).tactics.offense).toBe('Inside Focus');
  });
  it('presses low-handling guards', () => {
    const opp = team('NoHandle', ['p03', 'p09', 'p13', 'p01', 'p11']);
    expect(makeGamePlan(cpu, opp).tactics.defense).toBe('Full Court Press');
  });
});

describe('CPU in-game coaching', () => {
  it('makes subs, calls timeouts to stop runs, changes tactics, manages fouls & stamina', () => {
    let subs = 0, timeouts = 0, runTimeouts = 0, tactics = 0, foulTroubleSits = 0, attack = 0;
    for (let s = 0; s < 40; s++) {
      const m = new MatchSim(generateTeam(s * 2 + 1), generateTeam(s * 2 + 2, { exclude: [] }), 900 + s);
      m.simToEnd();
      const ev = m.st.events;
      subs += ev.filter((e) => e.type === 'sub').length;
      timeouts += ev.filter((e) => e.type === 'timeout').length;
      runTimeouts += ev.filter((e) => e.type === 'timeout' && /stop the run/.test(e.text)).length;
      tactics += ev.filter((e) => e.type === 'tactic').length;
      attack += ev.filter((e) => e.type === 'tactic' && /go right at/.test(e.text)).length;
      // a starter with 2 fouls in Q1 should usually sit shortly after
      for (const t of m.st.teams) {
        const secondFoulQ1 = ev.find((e) => e.type === 'foul' && e.period === 1 && e.team === t.idx && ev.filter((x) => x.type === 'foul' && x.player === e.player && x.id <= e.id).length === 2);
        if (secondFoulQ1 && ev.some((x) => x.type === 'sub' && x.team === t.idx && x.player2 === secondFoulQ1.player && x.id > secondFoulQ1.id && x.period <= 2)) foulTroubleSits++;
      }
      expect(validateMatch(m.st)).toEqual([]);
      // stamina: nobody plays the whole game except in OT marathons / short benches
      for (const t of m.st.teams) for (const id of t.roster) expect(t.stats[id].sec).toBeLessThanOrEqual(m.st.elapsed);
    }
    expect(subs).toBeGreaterThan(40 * 10);
    expect(timeouts).toBeGreaterThan(20);
    expect(runTimeouts).toBeGreaterThan(5);
    expect(tactics).toBeGreaterThan(20);
    expect(foulTroubleSits).toBeGreaterThan(5);
    expect(attack).toBeGreaterThan(0);
  });
  it('starters play more than bench players on average', () => {
    let st = 0, bn = 0, ns = 0, nb = 0;
    for (let s = 0; s < 30; s++) {
      const m = simulateMatch(SHOHOKAI, SANNOH, 300 + s);
      for (const t of m.st.teams) for (const id of t.roster) { if (t.starters.includes(id)) { st += t.stats[id].sec; ns++; } else { bn += t.stats[id].sec; nb++; } }
    }
    expect(st / ns).toBeGreaterThan(bn / nb * 1.5);
    expect(st / ns / 60).toBeGreaterThan(22);
    expect(st / ns / 60).toBeLessThan(37);
  });
});

describe('User commands during a match', () => {
  it('queues substitutions until a dead ball and rejects invalid ones', () => {
    const m = new MatchSim(SHOHOKAI, SANNOH, 21, { userTeam: 0, autoSubUser: false });
    m.step();
    expect(m.requestSub(0, 'p04', 'p04')).toBeTruthy();
    expect(m.requestSub(0, 'p09', 'p04')).toBeTruthy();
    expect(m.requestSub(0, 'p04', 'p07')).toBeNull();
    let applied = false;
    for (let i = 0; i < 40 && !applied; i++) { m.step(); applied = m.st.teams[0].onCourt.includes('p07'); }
    expect(applied).toBe(true);
    expect(m.st.teams[0].onCourt).not.toContain('p04');
  });
  it('timeouts are limited and emitted', () => {
    const m = new MatchSim(SHOHOKAI, SANNOH, 22, { userTeam: 0 });
    m.step();
    expect(m.requestTimeout(0)).toBeNull();
    for (let i = 0; i < 20; i++) m.step();
    expect(m.st.events.some((e) => e.type === 'timeout' && e.team === 0)).toBe(true);
    expect(m.st.teams[0].timeouts).toBe(1);
    m.st.teams[0].timeouts = 0;
    expect(m.requestTimeout(0)).toMatch(/No timeouts/);
  });
  it('tactic & matchup changes apply to the live game', () => {
    const m = new MatchSim(SHOHOKAI, SANNOH, 23, { userTeam: 0 });
    m.step();
    m.setTactics(0, { offense: 'Run & Gun', pace: 'Fast', defense: '2-3 Zone' });
    expect(m.st.teams[0].tactics).toEqual({ offense: 'Run & Gun', pace: 'Fast', defense: '2-3 Zone' });
    m.setMatchup(0, 'p28', 'p09');
    expect(m.st.teams[0].matchups['p28']).toBe('p09');
    m.simToEnd();
    expect(m.st.teams[0].tacticPoss['Run & Gun'].poss).toBeGreaterThan(30);
  });
  it('manual-only team (auto-sub off) keeps its five unless fouls force changes', () => {
    const m = new MatchSim(SHOHOKAI, SANNOH, 24, { userTeam: 0, autoSubUser: false });
    m.simToEnd();
    const subs = m.st.events.filter((e) => e.type === 'sub' && e.team === 0);
    const foulOuts = m.st.events.filter((e) => e.type === 'foulOut' && e.team === 0);
    expect(subs.length).toBe(foulOuts.length);
  });
});
