/**
 * CPUCoachEngine: drafts CPU teams from the database, sets a game plan against the opponent,
 * and makes in-game decisions (subs, timeouts, tactic changes, matchups, foul & stamina management).
 */
import type { Player, Pos, TeamConfig, Tactics, DefTactic, OffTactic, Pace } from './types';
import { SLOTS } from './types';
import { PLAYERS, SCHOOLS } from './db';
import { RNG, clamp } from './rng';
import { slotFit } from './Player';
import { profileLineup } from './LineupEngine';
import type { MatchState, TeamRT } from './GameState';
import { availableBench } from './GameState';
import { emit } from './CommentaryEngine';
import { foulLimit, playerValue, bestReplacement, performSub } from './SubstitutionEngine';
import { perimeterRating, interiorRating } from './DefenseEngine';

export const TEMPLATES = ['Balanced', 'Small Ball', 'Twin Towers', 'Run & Gun', 'Defense First', 'Three-Point Army', 'Inside Dominance', 'Super Team', 'Superstar + Role Players'] as const;
export type Template = typeof TEMPLATES[number];
export const LEVELS = ['Random', 'Weak', 'Average', 'Strong', 'Elite'] as const;
export type Level = typeof LEVELS[number];

const TEMPLATE_TACTICS: Record<Template, Tactics> = {
  'Balanced': { offense: 'Balanced', defense: 'Man-to-Man', pace: 'Normal' },
  'Small Ball': { offense: 'Fast Break', defense: 'Half Court Press', pace: 'Fast' },
  'Twin Towers': { offense: 'Inside Focus', defense: '2-3 Zone', pace: 'Slow' },
  'Run & Gun': { offense: 'Run & Gun', defense: 'Full Court Press', pace: 'Fast' },
  'Defense First': { offense: 'Motion Offense', defense: 'Man-to-Man', pace: 'Slow' },
  'Three-Point Army': { offense: 'Perimeter Focus', defense: '3-2 Zone', pace: 'Normal' },
  'Inside Dominance': { offense: 'Inside Focus', defense: 'Protect Paint', pace: 'Normal' },
  'Super Team': { offense: 'Balanced', defense: 'Man-to-Man', pace: 'Normal' },
  'Superstar + Role Players': { offense: 'Isolation', defense: 'Man-to-Man', pace: 'Normal' },
};

const TEAM_NAMES = ['Kanto Thunder', 'Osaka Red Hawks', 'Hokkaido Blizzard', 'Kyushu Volcanoes', 'Nagoya Samurai', 'Sendai Storm', 'Kobe Harbor Kings', 'Yokohama Waves',
  'Hiroshima Phoenix', 'Chiba Comets', 'Kyoto Temple Knights', 'Niigata Snow Wolves', 'Okinawa Sunrays', 'Shizuoka Tea Titans', 'Nara Deer Guardians', 'Akita Dogs',
  'Saitama Rockets', 'Fukuoka Lions', 'Gunma Mountaineers', 'Ehime Oranges'];
const COLORS: [string, string][] = [['#0f172a', '#f97316'], ['#991b1b', '#fde68a'], ['#1e40af', '#e0f2fe'], ['#065f46', '#fef08a'], ['#6b21a8', '#f5d0fe'], ['#111827', '#e5e7eb'],
  ['#b45309', '#111827'], ['#0e7490', '#ecfeff'], ['#be123c', '#ffe4e6'], ['#334155', '#facc15']];

const LEVEL_BAND: Record<Level, [number, number]> = { Random: [0, 99], Weak: [62, 72], Average: [70, 79], Strong: [78, 86], Elite: [86, 99] };
function levelWeight(p: Player, level: Level): number {
  const [lo, hi] = LEVEL_BAND[level];
  const o = p.overall;
  const d = o < lo ? lo - o : o > hi ? o - hi : 0;
  return Math.exp(-(d * d) / 18);
}

function templateScore(p: Player, slot: Pos, tpl: Template): number {
  const a = p.attrs;
  let s = slotFit(p, slot);
  switch (tpl) {
    case 'Small Ball': s += (a.speed - 70) * 0.4 + (a.three - 65) * 0.3 - Math.max(0, p.height - 190) * 1.5; break;
    case 'Twin Towers': if (slot === 'PF' || slot === 'C') s += (p.height - 190) * 1.6 + (a.dreb - 75) * 0.3 + (a.interiorD - 70) * 0.3; else s += (p.height - 184) * 0.4; break;
    case 'Run & Gun': s += (a.speed - 70) * 0.35 + (a.stamina - 70) * 0.2 + (a.three - 65) * 0.25; break;
    case 'Defense First': s += (a.perimeterD - 70) * 0.35 + (a.interiorD - 70) * 0.25 + (a.defIQ - 70) * 0.3 + (a.helpD - 70) * 0.2; break;
    case 'Three-Point Army': s += (a.three - 65) * 0.8; break;
    case 'Inside Dominance': s += (a.postScoring - 65) * 0.4 + (a.insideScoring - 65) * 0.4 + (slot === 'SF' ? (p.height - 186) * 0.8 : 0); break;
    case 'Super Team': s = p.overall * 0.8 + slotFit(p, slot) * 0.2; break;
    default: break;
  }
  return s;
}

export interface GenOptions { template?: Template; level?: Level; exclude?: string[]; name?: string; benchSize?: number; seed?: number; pool?: Player[]; }

export function generateTeam(seed: number, opts: GenOptions = {}): TeamConfig {
  const rng = new RNG(seed);
  const tpl: Template = opts.template ?? rng.pick(TEMPLATES);
  const level: Level = opts.level && opts.level !== 'Random' ? opts.level : rng.weighted<Level>(['Weak', 'Average', 'Strong', 'Elite', 'Random'], [2, 4, 3, 1, 0.6]);
  const used = new Set<string>(opts.exclude ?? []);
  const pool = (opts.pool ?? PLAYERS).filter((p) => !used.has(p.id));
  const starters: string[] = [];
  const order = [4, 0, 3, 1, 2]; // draft bigs & PG first
  const slotsPicked: (string | null)[] = [null, null, null, null, null];
  let starQuota = tpl === 'Superstar + Role Players' ? 1 : 99;
  for (const si of order) {
    const slot = SLOTS[si];
    let cands = pool.filter((p) => !used.has(p.id));
    if (tpl === 'Superstar + Role Players') {
      if (starQuota > 0 && si === order[0]) { /* star can be anywhere; handled below */ }
    }
    if (tpl === 'Superstar + Role Players' && starQuota > 0 && si === 4) {
      // pick the superstar first at his natural slot instead
      const stars = cands.filter((p) => p.overall >= 89 && ['SF', 'SG', 'PG'].includes(p.pos));
      const star = rng.pick(stars.length ? stars : cands.slice().sort((a, b) => b.overall - a.overall).slice(0, 6));
      const idx = SLOTS.indexOf(star.pos);
      slotsPicked[idx] = star.id; used.add(star.id); starQuota = 0;
      cands = cands.filter((p) => p.id !== star.id);
    }
    if (slotsPicked[si]) continue;
    if (tpl === 'Superstar + Role Players') cands = cands.filter((p) => p.overall <= 76);
    const scored = cands.map((p) => { const lw = levelWeight(p, level); return { p, s: templateScore(p, slot, tpl) * (0.6 + 0.4 * lw) - (1 - lw) * 40 }; });
    scored.sort((a, b) => b.s - a.s);
    const top = scored.slice(0, 7);
    const pick = rng.weighted(top, top.map((x, i) => Math.exp(-i * 0.45)));
    if (!pick) continue;
    slotsPicked[si] = pick.p.id; used.add(pick.p.id);
  }
  // fill any gaps defensively (e.g. tiny pools)
  for (let i = 0; i < 5; i++) if (!slotsPicked[i]) { const p = pool.find((x) => !used.has(x.id)); if (p) { slotsPicked[i] = p.id; used.add(p.id); } }
  starters.push(...(slotsPicked.filter(Boolean) as string[]));
  if (starters.length < 5) throw new Error('Not enough players available to build a team');
  // bench: coverage (guard, wing, big) + best extra
  const benchSize = opts.benchSize ?? rng.int(5, 7);
  const bench: string[] = [];
  const need: Pos[] = ['PG', 'C', 'SF', 'SG', 'PF', 'SF', 'C'];
  for (const slot of need) {
    if (bench.length >= benchSize) break;
    const cands = pool.filter((p) => !used.has(p.id)).map((p) => { const lw = levelWeight(p, level); return { p, s: templateScore(p, slot, tpl) * (0.6 + 0.4 * lw) - (1 - lw) * 40 - (tpl === 'Superstar + Role Players' && p.overall > 78 ? 30 : 0) }; });
    cands.sort((a, b) => b.s - a.s);
    const top = cands.slice(0, 6);
    if (!top.length) break;
    const pick = rng.weighted(top, top.map((x, i) => Math.exp(-i * 0.5)));
    bench.push(pick.p.id); used.add(pick.p.id);
  }
  const lineup = pickStarters([...starters, ...bench]);
  starters.splice(0, 5, ...lineup.starters);
  bench.splice(0, bench.length, ...lineup.bench);
  const [primary, secondary] = rng.pick(COLORS);
  const name = opts.name ?? rng.pick(TEAM_NAMES);
  return {
    id: 'cpu_' + seed.toString(36), name, short: name.split(' ').map((w) => w[0]).join('').slice(0, 3).toUpperCase(), primary, secondary,
    logoSeed: seed, starters, bench, tactics: { ...TEMPLATE_TACTICS[tpl] }, template: tpl, isCPU: true,
  };
}

/** CPU picks its starting five: best total slot value (fit + quality), bigs and PG first. */
export function pickStarters(ids: string[]): { starters: string[]; bench: string[] } {
  const P = (id: string) => PLAYERS.find((p) => p.id === id)!;
  const val = (id: string, slot: Pos) => slotFit(P(id), slot) * 0.75 + P(id).overall * 0.25;
  const used = new Set<string>();
  const starters: string[] = ['', '', '', '', ''];
  for (const si of [4, 0, 3, 1, 2]) {
    const best = ids.filter((id) => !used.has(id)).sort((a, b) => val(b, SLOTS[si]) - val(a, SLOTS[si]))[0];
    if (best) { starters[si] = best; used.add(best); }
  }
  return { starters, bench: ids.filter((id) => !used.has(id)) };
}

/** A school's real roster as a team (bench filled from its own school first). */
export function schoolTeam(schoolId: string): TeamConfig {
  const school = SCHOOLS.find((s) => s.id === schoolId)!;
  const ps = PLAYERS.filter((p) => p.school === schoolId);
  const starters: string[] = [];
  const used = new Set<string>();
  for (const slot of SLOTS) {
    const best = ps.filter((p) => !used.has(p.id)).sort((a, b) => slotFit(b, slot) + b.overall * 0.5 - (slotFit(a, slot) + a.overall * 0.5))[0];
    if (best) { starters.push(best.id); used.add(best.id); }
  }
  const bench = ps.filter((p) => !used.has(p.id)).map((p) => p.id);
  return { id: 'school_' + schoolId, name: school.name, short: school.short, primary: school.primary, secondary: school.secondary, logoSeed: schoolId.length * 97, starters, bench, tactics: { offense: 'Balanced', defense: 'Man-to-Man', pace: 'Normal' }, isCPU: true };
}

// ------------------------------------------------------------------ game plan
export interface GamePlan { tactics: Tactics; matchups: Record<string, string>; deny: string | null; doubleTarget: string | null; notes: string[]; }

export function makeGamePlan(me: TeamConfig, opp: TeamConfig): GamePlan {
  const P = (id: string) => PLAYERS.find((p) => p.id === id)!;
  const oppStart = opp.starters.map(P);
  const myStart = me.starters.map(P);
  const tactics: Tactics = { ...me.tactics };
  const notes: string[] = [];
  const matchups: Record<string, string> = {};
  let deny: string | null = null, doubleTarget: string | null = null;
  const oppProf = profileLineup(oppStart);
  const eliteShooters = oppStart.filter((p) => p.attrs.three >= 90).sort((a, b) => b.attrs.three - a.attrs.three);
  const dominantBig = oppStart.filter((p) => Math.max(p.attrs.postScoring, p.attrs.insideScoring) >= 90 && p.height >= 193).sort((a, b) => b.attrs.postScoring - a.attrs.postScoring)[0];
  const superScorer = oppStart.filter((p) => p.attrs.shotCreation >= 94).sort((a, b) => b.attrs.shotCreation - a.attrs.shotCreation)[0];
  const usedDef = new Set<string>();
  const bestPerim = () => myStart.filter((p) => !usedDef.has(p.id)).sort((a, b) => (b.attrs.perimeterD + b.attrs.agility * 0.3) - (a.attrs.perimeterD + a.attrs.agility * 0.3))[0];
  const bestInt = () => myStart.filter((p) => !usedDef.has(p.id)).sort((a, b) => (b.attrs.interiorD + b.height * 0.3) - (a.attrs.interiorD + a.height * 0.3))[0];
  let defSet = false;
  if (oppProf.handlerQuality < 70) {
    tactics.defense = 'Full Court Press'; defSet = true;
    notes.push(`Press: ${oppProf.handler?.name ?? 'their PG'} is a shaky ball handler`);
  }
  if (dominantBig) {
    const d = bestInt(); if (d) { matchups[dominantBig.id] = d.id; usedDef.add(d.id); }
    if (!defSet) { tactics.defense = eliteShooters.length >= 2 ? 'Double Team Star' : 'Protect Paint'; defSet = true; }
    doubleTarget = dominantBig.id;
    notes.push(`Pack the paint vs ${dominantBig.name}${d ? ` (${d.name} guards him)` : ''}`);
  }
  if (eliteShooters.length) {
    const s = eliteShooters[0];
    const d = bestPerim(); if (d) { matchups[s.id] = d.id; usedDef.add(d.id); }
    deny = s.id;
    if (!defSet && eliteShooters.length >= 2) { tactics.defense = 'Guard Perimeter'; defSet = true; }
    notes.push(`Tight coverage on shooter ${s.name}${d ? ` (${d.name})` : ''}`);
  }
  if (superScorer && !matchups[superScorer.id]) {
    const d = bestPerim(); if (d) { matchups[superScorer.id] = d.id; usedDef.add(d.id); }
    if (!doubleTarget) doubleTarget = superScorer.id;
    notes.push(`Best defender${d ? ` ${d.name}` : ''} on ${superScorer.name}`);
  }
  if (oppProf.rimProtection < 60) {
    tactics.offense = 'Inside Focus';
    notes.push('Attack the paint: no rim protector');
  }
  if (!notes.length) notes.push('Play our game');
  return { tactics, matchups, deny, doubleTarget, notes };
}

export function applyGamePlan(t: TeamRT, plan: GamePlan) {
  t.tactics = { ...plan.tactics };
  t.matchups = { ...plan.matchups, ...t.matchups };
  t.deny = plan.deny;
  t.doubleTarget = plan.doubleTarget;
  t.coachNotes = plan.notes;
}

// ------------------------------------------------------------------ in-game decisions
function setTactic(st: MatchState, t: TeamRT, patch: Partial<Tactics>, why: string) {
  const before = { ...t.tactics };
  Object.assign(t.tactics, patch);
  const changed = (Object.keys(patch) as (keyof Tactics)[]).filter((k) => before[k] !== t.tactics[k]);
  if (!changed.length) return false;
  const label = changed.map((k) => t.tactics[k]).join(' / ');
  emit(st, { type: 'tactic', team: t.idx, tactic: label, text: `${t.cfg.name} switch to ${label} (${why}).` });
  return true;
}

/** Should the CPU call a timeout now? */
export function wantsTimeout(st: MatchState, t: TeamRT): string | null {
  if (t.timeouts <= 0) return null;
  const opp = 1 - t.idx;
  if (st.runTeam === opp && st.runPts >= 8 && st.momentumOn) return 'to stop the run';
  const tired = t.onCourt.filter((id) => id && t.energy[id] < 45).length;
  if (tired >= 3 && availableBench(t).length < 2) return 'to rest tired legs';
  if (st.period >= 4 && st.clock < 35 && st.clock > 5 && st.possession === t.idx && t.score < st.teams[opp].score && st.teams[opp].score - t.score <= 3) return 'to draw up a late play';
  return null;
}

export function coachAdjust(st: MatchState, t: TeamRT, force = false) {
  if (!force && st.elapsed - t.lastCoachT < 240) return;
  t.lastCoachT = st.elapsed;
  const opp = st.teams[1 - t.idx];
  const os = Object.values(opp.stats);
  const oTPM = os.reduce((a, s) => a + s.tpm, 0), oTPA = os.reduce((a, s) => a + s.tpa, 0);
  const myS = Object.values(t.stats);
  const mTPM = myS.reduce((a, s) => a + s.tpm, 0), mTPA = myS.reduce((a, s) => a + s.tpa, 0);
  const mg = t.score - opp.score;
  const secondHalf = st.period >= 3;
  if (secondHalf && mg <= -10 && st.period >= 4 || (st.period >= 4 && st.clock < 240 && mg <= -6)) {
    setTactic(st, t, { defense: 'Full Court Press', pace: 'Fast' }, `trailing by ${-mg}`);
  } else if (st.period >= 4 && mg >= 12) {
    setTactic(st, t, { pace: 'Slow', defense: 'Man-to-Man' }, 'protecting the lead');
  } else if (oTPA >= 10 && oTPM / oTPA >= 0.4 && t.tactics.defense !== 'Guard Perimeter') {
    setTactic(st, t, { defense: 'Guard Perimeter' }, `opponent hitting ${oTPM}/${oTPA} from three`);
  } else if (opp.extra.paintPts >= 16 && opp.extra.paintPts >= opp.score * 0.55 && t.tactics.defense !== 'Protect Paint') {
    setTactic(st, t, { defense: 'Protect Paint' }, `${opp.extra.paintPts} points allowed in the paint`);
  }
  if (mTPA >= 10 && mTPM / mTPA < 0.25 && t.tactics.offense === 'Perimeter Focus') setTactic(st, t, { offense: 'Inside Focus' }, 'cold from outside');
  else if (mg < 0 && t.tactics.offense === 'Balanced' && st.period >= 2) {
    // exploit own strengths
    const ps = t.onCourt.filter(Boolean).map((id) => t.players[id!]);
    const post = Math.max(...ps.map((p) => p.attrs.postScoring));
    const shooters = ps.filter((p) => p.attrs.three >= 82).length;
    if (post >= 86) setTactic(st, t, { offense: 'Inside Focus' }, 'feeding the post');
    else if (shooters >= 3) setTactic(st, t, { offense: 'Perimeter Focus' }, 'spreading the floor');
  }
  // respond to matchups: put best defender on the hottest scorer
  const hot = opp.onCourt.filter(Boolean).map((id) => ({ id: id!, pts: opp.stats[id!].pts })).sort((a, b) => b.pts - a.pts)[0];
  if (hot && hot.pts >= 12) {
    const hp = opp.players[hot.id];
    const mine = t.onCourt.filter(Boolean).map((id) => t.players[id!]);
    const inside = hp.pos === 'C' || hp.pos === 'PF';
    const best = mine.sort((a, b) => (inside ? interiorRating(t, b, hp) - interiorRating(t, a, hp) : perimeterRating(t, b, hp) - perimeterRating(t, a, hp)))[0];
    if (best && t.matchups[hot.id] !== best.id) {
      for (const k of Object.keys(t.matchups)) if (t.matchups[k] === best.id) delete t.matchups[k];
      t.matchups[hot.id] = best.id;
      emit(st, { type: 'tactic', team: t.idx, tactic: 'matchup', text: `${t.cfg.name} adjust: ${best.name} now guards ${hp.name} (${hot.pts} pts).` });
      if (hot.pts >= 16 && t.tactics.defense === 'Man-to-Man') { t.doubleTarget = hot.id; }
    }
  }
  // attack an opponent in foul trouble
  const lim = foulLimit(st);
  const trouble = opp.onCourt.filter((id) => id && opp.stats[id].pf >= lim).map((id) => id!)[0] ?? null;
  if (trouble && t.attackTarget !== trouble) {
    t.attackTarget = trouble;
    emit(st, { type: 'tactic', team: t.idx, tactic: 'attack', text: `${t.cfg.name} go right at ${opp.players[trouble].name} (${opp.stats[trouble].pf} fouls).` });
  } else if (!trouble) t.attackTarget = null;
}

/** Auto-substitutions at a dead ball: stamina, foul trouble, performance, score situation. */
export function autoSubs(st: MatchState, t: TeamRT, maxSubs = 3): number {
  let made = 0;
  const mg = t.score - st.teams[1 - t.idx].score;
  const late = st.period >= 4 && st.clock < 240 && Math.abs(mg) <= 8;
  const garbage = (st.period >= 4 && (st.clock < 300 ? Math.abs(mg) >= 18 : Math.abs(mg) >= 24)) || (st.period === 3 && st.clock < 240 && Math.abs(mg) >= 30);
  const chosen: string[] = [];
  for (let i = 0; i < 5 && made < maxSubs; i++) {
    const cur = t.onCourt[i];
    if (!cur) {
      const rep = bestReplacement(st, t, i, chosen);
      if (rep && performSub(st, t, null, rep, i)) { made++; chosen.push(rep); t.subT[rep] = st.elapsed; }
      continue;
    }
    const slot = SLOTS[i];
    const e = t.energy[cur];
    const p = t.players[cur];
    const starLike = p.overall >= 85;
    const threshold = late ? 38 : starLike ? 56 : 62;
    const tired = e < threshold;
    const trouble = t.stats[cur].pf >= foulLimit(st) && !(st.period >= 4 && st.clock < 300);
    const justIn = st.elapsed - (t.subT[cur] ?? -999) < 100;
    const rep = bestReplacement(st, t, i, chosen);
    if (!rep) continue;
    const repRested = t.energy[rep] >= 72 && st.elapsed - (t.subT[rep] ?? -999) > 90;
    const curV = playerValue(st, t, cur, slot), repV = playerValue(st, t, rep, slot);
    let doIt = false;
    if (garbage) { if (t.starters.includes(cur) && !t.starters.includes(rep) && repRested) doIt = true; }
    else if ((tired || trouble) && repRested && repV > curV - (trouble ? 12 : 6)) doIt = true;
    else if (!t.starters.includes(cur) && t.starters.includes(rep) && repRested && repV > curV + 2 && !justIn) doIt = true;
    else if (!justIn && repRested && repV > curV + 14 && st.elapsed > 60) doIt = true;
    if (doIt && performSub(st, t, cur, rep)) { made++; chosen.push(rep); t.subT[rep] = st.elapsed; t.subT[cur] = st.elapsed; }
  }
  return made;
}
