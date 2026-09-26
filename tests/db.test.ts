import { describe, it, expect } from 'vitest';
import { PLAYERS, SCHOOLS } from '../src/engine/db';
import { ALL_ATTRS, ARCHETYPES, SLOTS } from '../src/engine/types';
import { SIGNATURES } from '../src/engine/signatures';
import { buildPlayers } from '../scripts/generate-players';
import playersJson from '../src/data/players.json';

describe('Player database validation', () => {
  it('has at least 60 players (all 76 characters)', () => { expect(PLAYERS.length).toBe(76); });
  it('has unique ids, numbers and names', () => {
    expect(new Set(PLAYERS.map((p) => p.id)).size).toBe(PLAYERS.length);
    expect(new Set(PLAYERS.map((p) => p.num)).size).toBe(PLAYERS.length);
    expect(new Set(PLAYERS.map((p) => p.name)).size).toBe(PLAYERS.length);
  });
  it('every player has name, valid school, position, height, weight', () => {
    const schools = new Set(SCHOOLS.map((s) => s.id));
    for (const p of PLAYERS) {
      expect(p.name.trim().length).toBeGreaterThan(2);
      expect(schools.has(p.school)).toBe(true);
      expect(SLOTS).toContain(p.pos);
      if (p.pos2) expect(SLOTS).toContain(p.pos2);
      expect(p.height).toBeGreaterThanOrEqual(155);
      expect(p.height).toBeLessThanOrEqual(215);
      expect(p.weight).toBeGreaterThan(45);
      expect(p.overall).toBeGreaterThanOrEqual(40);
      expect(p.overall).toBeLessThanOrEqual(99);
    }
  });
  it('every attribute is filled with a sane value', () => {
    for (const p of PLAYERS) for (const k of ALL_ATTRS) {
      expect(typeof p.attrs[k]).toBe('number');
      expect(p.attrs[k]).toBeGreaterThanOrEqual(15);
      expect(p.attrs[k]).toBeLessThanOrEqual(99);
    }
  });
  it('archetype, strengths, weaknesses present; stars have signature skills that exist', () => {
    for (const p of PLAYERS) {
      expect(ARCHETYPES).toContain(p.archetype);
      expect(p.strengths.length).toBeGreaterThan(0);
      expect(p.weaknesses.length).toBeGreaterThan(0);
      if (['star', 'superstar', 'legend'].includes(p.tier)) expect(p.signatures.length).toBeGreaterThan(0);
      for (const s of p.signatures) expect(SIGNATURES[s]).toBeTruthy();
    }
  });
  it('all 16 archetypes are represented', () => { expect(new Set(PLAYERS.map((p) => p.archetype)).size).toBe(16); });
  it('no superstar is 99 everywhere', () => {
    for (const p of PLAYERS) {
      const high = ALL_ATTRS.filter((k) => p.attrs[k] >= 95).length;
      const low = ALL_ATTRS.filter((k) => p.attrs[k] < 75).length;
      expect(high).toBeLessThan(12);
      expect(low).toBeGreaterThanOrEqual(4);
    }
  });
  it('spec-fixed numbers are respected', () => {
    const f = (n: number) => PLAYERS.find((p) => p.num === n)!;
    expect(f(1).attrs.vertical).toBe(97); expect(f(1).attrs.oreb).toBeGreaterThanOrEqual(95); expect(f(1).attrs.three).toBeLessThan(50);
    expect(f(4).height).toBe(168); expect(f(4).attrs.speed).toBe(97); expect(f(4).attrs.handling).toBe(94);
    expect(f(5).attrs.three).toBe(96); expect(f(5).attrs.clutch).toBe(96); expect(f(5).attrs.stamina).toBeLessThan(60);
    expect(f(17).attrs.three).toBe(97); expect(f(28).attrs.shotCreation).toBe(98); expect(f(31).height).toBe(210); expect(f(31).attrs.strength).toBe(99);
    expect(f(20).height).toBe(160);
    expect(f(2).signatures).toEqual(['Ace Mode', 'Isolation Master']);
  });
  it('is generated deterministically and committed as static data (never re-randomised)', () => {
    expect(buildPlayers()).toEqual(playersJson);
    expect(buildPlayers()).toEqual(buildPlayers());
  });
  it('shows no original manga names', () => {
    const banned = ['Sakuragi', 'Rukawa', 'Akagi', 'Miyagi', 'Mitsui', 'Sendoh', 'Maki', 'Jin ', 'Fujima', 'Sawakita', 'Fukatsu', 'Kawata', 'Shohoku', 'Ryonan', 'Kainan', 'Uozumi'];
    const words = (s: string) => s.split(/\s+/);
    for (const p of PLAYERS) for (const b of banned) expect(words(p.name)).not.toContain(b.trim());
    for (const s of SCHOOLS) for (const b of banned) expect(words(s.name)).not.toContain(b.trim());
  });
});
