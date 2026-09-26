/**
 * PossessionEngine: simulates one full possession action-by-action.
 * Every stat is produced by an event here — nothing is back-filled.
 */
import type { Player, ShotType, PlayType } from './types';
import type { MatchState, TeamRT } from './GameState';
import { tick } from './FatigueEngine';
import { emit } from './CommentaryEngine';
import { profileLineup, type LineupProfile } from './LineupEngine';
import { evaluateChemistry, type Chemistry } from './ChemistryEngine';
import { playWeights, possessionDuration, transitionChance, HALF_PLAYS, offMod, defMod, type HalfPlay } from './TacticalEngine';
import { assignments, defenderOf, perimeterRating, interiorRating, rimProtection, helpDefender, stealer, teamPerimeter, isZone } from './DefenseEngine';
import { makeProbability, blockChance, shootingFoulChance, andOneBonus, shotZone, INSIDE, type ShotContext } from './ShotEngine';
import { assistBonus, possessionTurnoverChance, turnoverCulprit, pickPasser } from './PassingEngine';
import { resolveRebound } from './ReboundEngine';
import { commitFoul, freeThrows, nonShootingFoulChance, pickFouler } from './FoulEngine';
import { sig, eff } from './Player';
import { clamp } from './rng';

interface Ctx { o: TeamRT; d: TeamRT; prof: LineupProfile; chem: Chemistry; dchem: Chemistry; cause: MatchState['lastEnd']; second: boolean; transition: boolean; }
type Result = 'made' | 'miss' | 'tov' | 'steal' | 'ftMade' | 'ftMiss' | 'reset' | 'clock' | 'oreb';
interface ShotOpts { shooter: Player; type: ShotType; openness: number; assister: Player | null; playType: PlayType; catchShoot?: boolean; putback?: boolean; heave?: boolean; }

const lineupCache = new Map<string, { prof: LineupProfile; chem: Chemistry }>();
function lineupInfo(t: TeamRT) {
  const key = t.onCourt.map((x) => x ?? '-').join(',');
  let v = lineupCache.get(key);
  if (!v) {
    const slots = t.onCourt.map((id) => (id ? t.players[id] : null));
    v = { prof: profileLineup(slots), chem: evaluateChemistry(slots) };
    if (lineupCache.size > 5000) lineupCache.clear();
    lineupCache.set(key, v);
  }
  return v;
}

const on = (t: TeamRT) => t.onCourt.filter(Boolean).map((id) => t.players[id!]);

function usageMult(st: MatchState, o: TeamRT, d: TeamRT, p: Player): number {
  const s = sig(p);
  let m = s.usage ?? 1;
  if (s.aceMode && (st.period >= 4 || o.score < d.score)) m *= 1.25;
  const e = o.energy[p.id];
  if (e < 60) m *= 0.85;
  if (d.deny === p.id) m *= 0.78;
  if (o.attackTarget) {
    const a = assignments(o, d);
    if (a[p.id] === o.attackTarget) m *= 1.7;
  }
  // archetype tendencies
  if (['Isolation Scorer', 'All-Round Superstar', 'Scoring PG', 'Sixth Man'].includes(p.archetype)) m *= 1.15;
  if (['Defensive Specialist', 'Rim Protector'].includes(p.archetype)) m *= 0.75;
  return m;
}

function choose(st: MatchState, c: Ctx, cands: Player[], score: (p: Player) => number, exclude?: string): Player | null {
  const list = cands.filter((p) => p.id !== exclude);
  if (!list.length) return null;
  const w = list.map((p) => Math.pow(Math.max(3, score(p) - 38), 1.9) * usageMult(st, c.o, c.d, p));
  return st.rng.weighted(list, w);
}

// ---------------------------------------------------------------- scoring bookkeeping
function addScore(st: MatchState, c: Ctx, pid: string, pts: number, meta: { paint?: boolean; fb?: boolean }) {
  const o = c.o, d = c.d;
  const before = o.score - d.score;
  o.score += pts;
  o.stats[pid].pts += pts;
  o.periodScore[st.period - 1] = (o.periodScore[st.period - 1] ?? 0) + pts;
  for (const id of o.onCourt) if (id) o.stats[id].pm += pts;
  for (const id of d.onCourt) if (id) d.stats[id].pm -= pts;
  if (meta.paint) o.extra.paintPts += pts;
  if (meta.fb) o.extra.fbPts += pts;
  if (c.second) o.extra.secondPts += pts;
  if (c.cause === 'tov' || c.cause === 'steal') o.extra.ptsOffTO += pts;
  if (!o.starters.includes(pid)) o.extra.benchPts += pts;
  const ko = o.idx + ':' + o.onCourt.filter(Boolean).slice().sort().join('|');
  const kd = d.idx + ':' + d.onCourt.filter(Boolean).slice().sort().join('|');
  if (st.stints[ko]) st.stints[ko].pf += pts;
  if (st.stints[kd]) st.stints[kd].pa += pts;
  const after = o.score - d.score;
  if (before < 0 && after > 0) st.leadChanges++;
  if (before !== 0 && after === 0) st.ties++;
  o.extra.leadMax = Math.max(o.extra.leadMax, after);
  st.flow.push({ t: st.elapsed, s: [st.teams[0].score, st.teams[1].score] });
  st.scoring.push({ t: st.elapsed, team: o.idx, pts, player: pid, period: st.period, clock: st.clock });
  // runs & momentum (small, no rubber-banding)
  if (st.runTeam === o.idx) st.runPts += pts;
  else { st.runTeam = o.idx; st.runPts = pts; st.momentumOn = false; }
  o.extra.biggestRun = Math.max(o.extra.biggestRun, st.runPts);
  if (st.runPts >= 8 && !st.momentumOn) {
    st.momentumOn = true;
    emit(st, { type: 'run', team: o.idx, n: st.runPts, of: 0, big: true });
  }
}

function updateHot(t: TeamRT, id: string, made: boolean) {
  const h = t.hot[id] ?? 0;
  t.hot[id] = clamp(h * 0.75 + (made ? 0.3 : -0.22), -1, 1);
}

// ---------------------------------------------------------------- shot resolution
function resolveShot(st: MatchState, c: Ctx, so: ShotOpts): Result {
  const { o, d } = c;
  const rng = st.rng;
  const p = so.shooter;
  const inside = INSIDE.includes(so.type);
  let defender = defenderOf(o, d, p.id);
  // zones: the nearest zone defender contests — blend toward the zone's coverage for that area
  if (isZone(d) && defender && !inside) {
    const perimCover = teamPerimeter(d);
    const dr = perimeterRating(d, defender, p);
    if (perimCover < dr) so.openness = clamp(so.openness + 0.04, 0, 1);
  }
  if (d.deny === p.id && !inside) so.openness = clamp(so.openness - 0.18, 0, 1);
  const rim = rimProtection(d).rating;
  const ctx: ShotContext = {
    shooter: p, o, d, type: so.type, defender, openness: so.openness, assisted: !!so.assister,
    assistBonus: so.assister ? assistBonus(o, so.assister) : 0, rim, transition: c.transition, putback: so.putback,
    chemBonus: (so.type === 'three' && so.catchShoot ? c.chem.mods.catchShoot : 0) + (so.playType === 'pnr' ? c.chem.mods.pnr * 0.5 : 0) - c.chem.mods.usage + (st.momentumOn && st.runTeam === o.idx ? 0.008 : 0),
    catchShoot: so.catchShoot, heave: so.heave,
  };
  const zone = shotZone(so.type, rng.next(), rng.next());
  const help = helpDefender(d, defender?.id ?? null, rng.next());
  const fouler = inside ? (rng.chance(0.65) ? defender : help) : defender;
  const fouled = !so.heave && !!fouler && rng.chance(shootingFoulChance(ctx, fouler));
  const blocker = inside ? (rng.chance(0.55) ? help : defender) : defender;
  const is3 = so.type === 'three';
  const pts = is3 ? 3 : 2;
  const s = o.stats[p.id];
  if (!fouled && blocker && rng.chance(blockChance(ctx, blocker, d.energy[blocker.id]))) {
    s.fga++; if (is3) s.tpa++;
    d.stats[blocker.id].blk++;
    updateHot(o, p.id, false);
    emit(st, { type: 'shot', team: o.idx, player: p.id, shotType: so.type, playType: so.playType, made: false, x: zone.x, y: zone.y, text: `${short(p)} goes up...` });
    emit(st, { type: 'block', team: d.idx, player: blocker.id, player2: p.id, x: zone.x, y: zone.y, big: true });
    return rebound(st, c, so.type, true);
  }
  let prob = makeProbability(st, ctx);
  if (fouled) prob *= andOneBonus(ctx);
  const made = rng.chance(prob);
  if (!fouled || made) { s.fga++; if (is3) s.tpa++; }
  updateHot(o, p.id, made);
  if (made) {
    s.fgm++; if (is3) s.tpm++;
    if (so.assister) o.stats[so.assister.id].ast++;
    addScore(st, c, p.id, pts, { paint: inside, fb: c.transition });
  }
  const clutchBig = made && st.period >= 4 && st.clock < 30 && Math.abs(o.score - d.score) <= 3;
  emit(st, { type: 'shot', team: o.idx, player: p.id, player2: made && so.assister ? so.assister.id : undefined, shotType: so.type, playType: so.playType, made, pts: made ? pts : 0, x: zone.x, y: zone.y, big: clutchBig || (made && (so.type === 'dunk' || is3)) });
  if (fouled && fouler) {
    const bonusShots = made ? 1 : is3 ? 3 : 2;
    commitFoul(st, d, fouler.id, p.id, 'shooting');
    const last = freeThrows(st, o, p.id, bonusShots, (n) => addScore(st, c, p.id, n, {}));
    if (last) return 'ftMade';
    return rebound(st, c, 'ft', false);
  }
  if (made) return 'made';
  return rebound(st, c, so.type, false);
}

function short(p: Player) { const a = p.name.split(' '); return a[a.length - 1]; }

function rebound(st: MatchState, c: Ctx, type: ShotType | 'ft', blocked: boolean): Result {
  const { o, d } = c;
  if (on(o).length === 0 && on(d).length === 0) return 'miss';
  const r = resolveRebound(o, d, type, blocked, st.rng, c.chem, c.dchem);
  if (r.player) {
    const t = st.teams[r.team];
    if (r.offensive) t.stats[r.player.id].oreb++; else t.stats[r.player.id].dreb++;
    emit(st, { type: 'rebound', team: r.team, player: r.player.id, offensive: r.offensive, x: 0.12, y: 0.5 });
  }
  if (r.offensive) { reboundHolder = r.player; return 'oreb'; }
  return 'miss';
}
let reboundHolder: Player | null = null;

// ---------------------------------------------------------------- turnovers & fouls
function turnover(st: MatchState, c: Ctx, forceKind?: string): Result {
  const { o, d, prof } = c;
  const rng = st.rng;
  const culprit = turnoverCulprit(o, prof, rng);
  const stealP = 0.52 * Math.sqrt(defMod(d).steal);
  const kind = forceKind ?? (rng.chance(stealP) ? 'steal' : rng.weighted(['pass', 'lost', 'travel', 'offFoul', 'out'], [3, 2, 1.2, 1.1, 0.8]));
  o.stats[culprit.id].tov++;
  if (kind === 'steal') {
    const defOfCulprit = defenderOf(o, d, culprit.id);
    const thief = stealer(d, defOfCulprit, rng.next());
    if (thief) {
      d.stats[thief.id].stl++;
      emit(st, { type: 'steal', team: d.idx, player: thief.id, player2: culprit.id, x: 0.4, y: 0.5 });
      emit(st, { type: 'turnover', team: o.idx, player: culprit.id, kind: 'stolen', text: `Turnover ${o.cfg.name}.` });
      stealBy = thief;
      return 'steal';
    }
  }
  if (kind === 'offFoul') {
    emit(st, { type: 'turnover', team: o.idx, player: culprit.id, kind: 'offFoul' });
    commitFoul(st, o, culprit.id, undefined, 'offensive');
    return 'tov';
  }
  emit(st, { type: 'turnover', team: o.idx, player: culprit.id, kind: kind === 'steal' ? 'lost' : kind });
  return 'tov';
}
let stealBy: Player | null = null;

// ---------------------------------------------------------------- plays
function openBase(st: MatchState, lo: number, spread: number) { return lo + st.rng.next() * spread; }

function jumperType(p: Player, rng: MatchState['rng'], threeBias = 1): ShotType {
  const s = sig(p);
  const w3 = Math.pow(Math.max(1, p.attrs.three - 45), 2) * threeBias * (s.deep ?? 1);
  const w2 = Math.pow(Math.max(1, p.attrs.midRange - 45), 2) * 0.8;
  return rng.weighted<ShotType>(['three', 'mid'], [w3, w2]);
}

function finishType(p: Player, rng: MatchState['rng'], openness: number): ShotType {
  const wd = p.attrs.dunk >= 70 && p.height >= 180 ? Math.pow(p.attrs.dunk - 55, 2) * (0.3 + openness) * (p.height - 170) / 20 : 0;
  const wl = Math.pow(Math.max(5, p.attrs.layup - 40), 2) * 1.2;
  const wf = Math.pow(Math.max(5, (p.attrs.insideScoring + p.attrs.midRange) / 2 - 45), 2) * (1.2 - openness) * 0.6;
  return rng.weighted<ShotType>(['dunk', 'layup', 'floater'], [wd, wl, wf]);
}

function spotShooter(st: MatchState, c: Ctx, exclude?: string): Player | null {
  return choose(st, c, on(c.o), (p) => p.attrs.three * 0.8 + p.attrs.offBall * 0.2, exclude);
}

function pass(st: MatchState, c: Ctx, from: Player | null, to: Player) {
  if (from && from.id !== to.id) emit(st, { type: 'pass', team: c.o.idx, player: from.id, player2: to.id });
}

function movementOpen(st: MatchState, c: Ctx): number {
  const bm = (c.prof.ballMovement - 70) * 0.004;
  const tp = (teamPerimeter(c.d) - 68) * 0.005;
  return bm - tp + c.chem.mods.spacing + offMod(c.o).open;
}

function runPlay(st: MatchState, c: Ctx, play: HalfPlay): ShotOpts | Result {
  const { o, d, prof } = c;
  const rng = st.rng;
  const ps = on(o);
  const handler = prof.handler && o.onCourt.includes(prof.handler.id) ? prof.handler : ps[0];
  const doubling = d.tactics.defense === 'Double Team Star' ? d.doubleTarget : null;
  const maybeDouble = (star: Player): ShotOpts | Result | null => {
    if (!doubling || star.id !== doubling) return null;
    const helper = on(d).find((x) => x.id !== defenderOf(o, d, star.id)?.id);
    emit(st, { type: 'doubleTeam', team: d.idx, player: star.id, player2: helper?.id });
    if (rng.chance(0.13 + (75 - star.attrs.passing) * 0.003)) return turnover(st, c);
    if (rng.chance(0.62)) {
      const sh = spotShooter(st, c, star.id);
      if (sh) { pass(st, c, star, sh); return { shooter: sh, type: jumperType(sh, rng, 1.4), openness: openBase(st, 0.55, 0.35), assister: star, playType: 'spot', catchShoot: true }; }
    }
    return { shooter: star, type: jumperType(star, rng), openness: openBase(st, 0.0, 0.12), assister: null, playType: 'iso' };
  };
  switch (play) {
    case 'pnr': {
      const bh = choose(st, c, ps, (p) => (p.attrs.pickRoll * 0.5 + p.attrs.handling * 0.5) + (p === handler ? 12 : 0)) ?? handler;
      const scr = choose(st, c, ps, (p) => (p.attrs.pickRoll * 0.4 + p.attrs.insideScoring * 0.3 + p.attrs.strength * 0.3) + (o.onCourt.indexOf(p.id) >= 3 ? 8 : 0), bh.id);
      if (!scr) return { shooter: bh, type: jumperType(bh, rng), openness: openBase(st, 0.2, 0.3), assister: null, playType: 'pnr' };
      emit(st, { type: 'screen', team: o.idx, player: bh.id, player2: scr.id });
      const shooter = spotShooter(st, c, bh.id);
      const opts = ['pull', 'drive', 'roll', 'pop', 'kick'] as const;
      const w = [
        (bh.attrs.midRange + bh.attrs.three) / 2 - 40,
        (bh.attrs.layup + bh.attrs.acceleration) / 2 - 40,
        (scr.attrs.insideScoring + scr.attrs.dunk) / 2 - 38 + (bh.attrs.passing - 70) * 0.4,
        scr.attrs.three >= 74 ? scr.attrs.three - 50 : 0,
        shooter && shooter.id !== scr.id ? (shooter.attrs.three - 45) * (bh.attrs.vision / 90) * 0.7 : 0,
      ];
      const ch = rng.weighted(opts, w.map((x) => Math.max(0.5, x)));
      const pnrB = c.chem.mods.pnr;
      if (ch === 'pull') return { shooter: bh, type: jumperType(bh, rng), openness: openBase(st, 0.28, 0.3) + pnrB, assister: null, playType: 'pnr' };
      if (ch === 'drive') { emit(st, { type: 'drive', team: o.idx, player: bh.id }); const op = openBase(st, 0.28, 0.32) + pnrB; return { shooter: bh, type: finishType(bh, rng, op), openness: op, assister: null, playType: 'pnr' }; }
      if (ch === 'roll') { pass(st, c, bh, scr); const op = openBase(st, 0.38, 0.32) + pnrB * 2; return { shooter: scr, type: finishType(scr, rng, op), openness: op, assister: bh, playType: 'pnr' }; }
      if (ch === 'pop') { pass(st, c, bh, scr); return { shooter: scr, type: jumperType(scr, rng, 1.3), openness: openBase(st, 0.45, 0.3), assister: bh, playType: 'pnr', catchShoot: true }; }
      if (shooter) { pass(st, c, bh, shooter); return { shooter, type: jumperType(shooter, rng, 1.5), openness: openBase(st, 0.4, 0.35) + movementOpen(st, c), assister: bh, playType: 'spot', catchShoot: true }; }
      return { shooter: bh, type: jumperType(bh, rng), openness: 0.3, assister: null, playType: 'pnr' };
    }
    case 'iso': {
      const p = choose(st, c, ps, (x) => x.attrs.shotCreation * 0.7 + x.attrs.handling * 0.3)!;
      if (p !== handler) pass(st, c, handler, p);
      const dbl = maybeDouble(p); if (dbl) return dbl;
      const def = defenderOf(o, d, p.id);
      emit(st, { type: 'iso', team: o.idx, player: p.id, player2: def?.id });
      const s = sig(p);
      const beat = rng.chance(clamp(0.33 + (p.attrs.shotCreation * 0.5 + p.attrs.acceleration * 0.3 + p.attrs.handling * 0.2 - perimeterRating(d, def, p)) * 0.009 + (s.firstStep ?? 0) + (s.iso ?? 0) * 2, 0.1, 0.8));
      if (beat) emit(st, { type: 'iso', team: o.idx, player: p.id, player2: def?.id, kind: 'beat' });
      const op = beat ? openBase(st, 0.45, 0.3) : openBase(st, 0.08, 0.22);
      const rimW = (p.attrs.layup + p.attrs.acceleration) / 2 - 45 + (beat ? 12 : 0);
      const wJ = (p.attrs.midRange * 0.6 + p.attrs.three * 0.4) - 45;
      const drive = rng.chance(Math.max(1, rimW) / (Math.max(1, rimW) + Math.max(1, wJ)));
      const isoBonus = s.iso ?? 0;
      if (drive) { emit(st, { type: 'drive', team: o.idx, player: p.id }); return { shooter: p, type: finishType(p, rng, op), openness: clamp(op + isoBonus, 0, 1), assister: null, playType: 'iso' }; }
      return { shooter: p, type: jumperType(p, rng), openness: clamp(op + isoBonus, 0, 1), assister: null, playType: 'iso' };
    }
    case 'post': {
      const p = choose(st, c, ps, (x) => x.attrs.postScoring * 0.6 + x.attrs.strength * 0.2 + x.attrs.insideScoring * 0.2 + (x.height - 185) * 0.4)!;
      const passer = p === handler ? pickPasser(o, p.id, rng, prof) : handler;
      pass(st, c, passer, p);
      const def = defenderOf(o, d, p.id);
      emit(st, { type: 'postUp', team: o.idx, player: p.id, player2: def?.id });
      const dbl = maybeDouble(p); if (dbl) return dbl;
      if (d.tactics.defense === 'Protect Paint' && rng.chance(0.35)) {
        const sh = spotShooter(st, c, p.id);
        if (sh) { emit(st, { type: 'doubleTeam', team: d.idx, player: p.id }); pass(st, c, p, sh); return { shooter: sh, type: jumperType(sh, rng, 1.5), openness: openBase(st, 0.5, 0.35), assister: p, playType: 'spot', catchShoot: true }; }
      }
      const adv = (eff(p, 'postScoring', o.energy[p.id]) * 0.6 + p.attrs.strength * 0.4) - interiorRating(d, def, p);
      const op = clamp(0.12 + adv * 0.007 + rng.next() * 0.28, 0, 0.8);
      const s = sig(p);
      const wPost = 3, wFade = p.attrs.midRange >= 78 ? 1 + (s.fadeaway ?? 0) * 3 : 0.2, wPower = adv > 5 ? 1.5 : 0.5;
      const t = rng.weighted<ShotType>(['post', 'mid', 'dunk'], [wPost, wFade, p.attrs.dunk > 75 ? wPower : 0.1]);
      return { shooter: p, type: t === 'dunk' ? finishType(p, rng, op) : t, openness: op, assister: rng.chance(0.35) ? passer : null, playType: 'post' };
    }
    case 'drive': {
      const p = choose(st, c, ps, (x) => (x.attrs.layup + x.attrs.acceleration + x.attrs.shotCreation) / 3 + (x === handler ? 5 : 0))!;
      if (p !== handler && rng.chance(0.6)) pass(st, c, handler, p);
      const dbl = maybeDouble(p); if (dbl) return dbl;
      emit(st, { type: 'drive', team: o.idx, player: p.id });
      const def = defenderOf(o, d, p.id);
      const s = sig(p);
      const rim = rimProtection(d).rating;
      const kickW = 1 + c.prof.shooters * 0.9 + Math.max(0, rim - 70) * 0.05 + (p.attrs.vision - 70) * 0.03;
      const dumpW = 0.8 + Math.max(0, rim - 70) * 0.03;
      const ch = rng.weighted(['finish', 'kick', 'dump'], [4.2, kickW, dumpW]);
      if (ch === 'kick') { const sh = spotShooter(st, c, p.id); if (sh) { pass(st, c, p, sh); return { shooter: sh, type: jumperType(sh, rng, 1.6), openness: openBase(st, 0.45, 0.35) + movementOpen(st, c), assister: p, playType: 'drive', catchShoot: true }; } }
      if (ch === 'dump') {
        const big = choose(st, c, ps, (x) => (x.attrs.insideScoring + x.attrs.dunk) / 2 + (x.height - 185) * 0.5, p.id);
        if (big) { pass(st, c, p, big); const op = openBase(st, 0.4, 0.3); return { shooter: big, type: finishType(big, rng, op), openness: op, assister: p, playType: 'drive' }; }
      }
      const beat = (p.attrs.acceleration * 0.5 + p.attrs.handling * 0.2 + p.attrs.shotCreation * 0.3) - perimeterRating(d, def, p);
      const op = clamp(0.2 + beat * 0.006 + (s.firstStep ?? 0) + c.chem.mods.spacing + rng.next() * 0.3, 0, 0.9);
      return { shooter: p, type: finishType(p, rng, op), openness: op, assister: null, playType: 'drive' };
    }
    case 'spot': {
      let from: Player | null = handler;
      const passes = clamp(Math.round(1 + rng.next() * 2 + offMod(o).passes), 1, 4);
      let last: Player | null = handler;
      for (let i = 0; i < passes - 1; i++) {
        const nx = choose(st, c, ps, (x) => x.attrs.passing * 0.5 + x.attrs.offBall * 0.5, last?.id);
        if (nx) { pass(st, c, last, nx); last = nx; }
      }
      const sh = spotShooter(st, c, last?.id) ?? handler;
      from = last;
      pass(st, c, from, sh);
      return { shooter: sh, type: jumperType(sh, rng, 1.6), openness: clamp(openBase(st, 0.32, 0.36) + movementOpen(st, c) + (passes - 2) * 0.03, 0, 0.95), assister: rng.chance(0.85) ? from : null, playType: 'spot', catchShoot: true };
    }
    case 'cut': {
      const cutter = choose(st, c, ps, (x) => x.attrs.offBall * 0.6 + (x.attrs.layup + x.attrs.dunk) / 2 * 0.4, handler.id) ?? handler;
      const passer = cutter === handler ? pickPasser(o, cutter.id, rng, prof) : (rng.chance(0.6) ? handler : pickPasser(o, cutter.id, rng, prof));
      emit(st, { type: 'cut', team: o.idx, player: cutter.id });
      pass(st, c, passer, cutter);
      const helpAvg = on(d).reduce((a, x) => a + x.attrs.helpD, 0) / Math.max(1, on(d).length);
      const op = clamp(0.38 + (cutter.attrs.offBall - helpAvg) * 0.008 + (passer ? (passer.attrs.passing - 70) * 0.004 : 0) + rng.next() * 0.3 + offMod(o).open, 0, 0.95);
      return { shooter: cutter, type: finishType(cutter, rng, op), openness: op, assister: passer, playType: 'cut' };
    }
    case 'mid': {
      const sh = choose(st, c, ps, (x) => x.attrs.midRange * 0.8 + x.attrs.offBall * 0.2)!;
      const scr = choose(st, c, ps, (x) => x.attrs.strength, sh.id);
      if (scr) emit(st, { type: 'screen', team: o.idx, player: sh.id, player2: scr.id });
      const assisted = sh !== handler && rng.chance(0.6);
      if (assisted) pass(st, c, handler, sh);
      const t: ShotType = rng.chance(sh.attrs.midRange >= 70 ? 0.85 : 0.5) ? 'mid' : 'floater';
      return { shooter: sh, type: t, openness: openBase(st, 0.25, 0.35), assister: assisted ? handler : null, playType: 'mid', catchShoot: assisted };
    }
  }
}

// ---------------------------------------------------------------- possession phases
function transitionPlay(st: MatchState, c: Ctx): ShotOpts | Result | 'pullout' {
  const { o, d } = c;
  const rng = st.rng;
  const ps = on(o);
  const cand = c.cause === 'steal' && stealBy && ps.some((p) => p.id === stealBy!.id) && stealBy.attrs.speed >= 70 ? stealBy : null;
  const runner = cand ?? choose(st, c, ps, (p) => (p.attrs.speed + p.attrs.acceleration) / 2 + (p.attrs.layup - 70) * 0.3)!;
  emit(st, { type: 'fastBreak', team: o.idx, player: runner.id, x: 0.55, y: 0.5 });
  tick(st, rng.range(2.5, 5.5));
  if (st.clock <= 0) return 'clock';
  // defense gets back? faster defenses kill breaks
  const defSpeed = on(d).reduce((a, p) => a + p.attrs.speed, 0) / Math.max(1, on(d).length);
  const offSpeed = on(o).reduce((a, p) => a + p.attrs.speed, 0) / Math.max(1, on(o).length);
  const pullOut = clamp(0.3 + (defSpeed - offSpeed) * 0.01, 0.1, 0.6);
  if (rng.chance(pullOut)) return 'pullout';
  const trailer = spotShooter(st, c, runner.id);
  const rg = o.tactics.offense === 'Run & Gun' || o.tactics.pace === 'Fast';
  if (trailer && rng.chance(rg ? 0.3 : 0.14)) {
    pass(st, c, runner, trailer);
    return { shooter: trailer, type: 'three', openness: openBase(st, 0.5, 0.35), assister: runner, playType: 'transition', catchShoot: true };
  }
  const finisher = rng.chance(0.3) ? choose(st, c, ps, (p) => (p.attrs.speed + p.attrs.dunk) / 2, runner.id) : null;
  if (finisher) {
    pass(st, c, runner, finisher);
    const op = openBase(st, 0.55, 0.4);
    return { shooter: finisher, type: finishType(finisher, rng, op), openness: op, assister: runner, playType: 'transition' };
  }
  const op = openBase(st, 0.5, 0.4);
  return { shooter: runner, type: finishType(runner, rng, op), openness: op, assister: null, playType: 'transition' };
}

function halfCourt(st: MatchState, c: Ctx, bringUp: boolean, maxDur: number): Result {
  const { o, d, prof } = c;
  const rng = st.rng;
  const ps = on(o);
  if (!ps.length) { tick(st, Math.min(st.clock, 24)); return 'tov'; }
  const handler = prof.handler && o.onCourt.includes(prof.handler.id) ? prof.handler : ps[0];
  let used = 0;
  let dur = Math.min(maxDur, possessionDuration(st, o, d, rng));
  // End of period: hold for the last shot
  const lastShot = st.clock <= 24.5;
  if (lastShot) dur = Math.max(0.5, st.clock - rng.range(0.4, 2.5));
  if (bringUp) {
    const press = defMod(d).pressTO;
    emit(st, { type: 'bringUp', team: o.idx, player: handler.id, kind: o.tactics.pace === 'Fast' || o.tactics.offense === 'Run & Gun' ? 'fast' : undefined, x: 0.9, y: 0.5 });
    const bt = Math.min(dur * 0.35, rng.range(2.5, 5) + (press ? 1.5 : 0));
    used += tick(st, bt);
    if (press > 0 && !lastShot) {
      const hq = (eff(handler, 'handling', o.energy[handler.id]) * 0.5 + handler.attrs.decision * 0.3 + handler.attrs.passing * 0.2);
      const pTO = clamp(press * (1 + (72 - hq) * 0.035) * (d.tactics.defense === 'Full Court Press' ? 1 : 0.8), 0.005, 0.25);
      if (rng.chance(pTO)) return turnover(st, c, rng.chance(0.65) ? 'steal' : 'press');
      if (rng.chance(clamp(0.12 + (hq - 72) * 0.008, 0.02, 0.35))) {
        emit(st, { type: 'pressBreak', team: o.idx, player: handler.id });
        c.transition = true;
        const r = transitionPlay(st, c);
        if (r !== 'pullout') {
          if (r === 'clock') return 'clock';
          if (typeof r === 'string') return r;
          return resolveShot(st, c, r);
        }
        c.transition = false;
      }
    }
  }
  if (st.clock <= 0) return 'clock';
  // turnover check (spread over the possession)
  const toP = possessionTurnoverChance(st, o, d, prof, c.chem) * (c.second ? 0.55 : 1);
  if (rng.chance(toP)) {
    used += tick(st, rng.range(0.2, 0.9) * Math.max(0.5, dur - used));
    if (rng.chance(0.4)) { const nx = pickPasser(o, handler.id, rng, prof); if (nx) pass(st, c, handler, nx); }
    if (st.clock <= 0 && lastShot) return 'clock';
    // shot clock violation is a rare flavour of turnover for poor offenses
    const sc = dur > 22 && rng.chance(0.25) ? 'shotClock' : undefined;
    if (sc) tick(st, Math.max(0, 24 - used));
    return turnover(st, c, sc);
  }
  // non-shooting foul
  if (!lastShot && rng.chance(nonShootingFoulChance(o, d) * (c.second ? 0.5 : 1))) {
    used += tick(st, rng.range(0.2, 0.8) * Math.max(0.5, dur - used));
    const victim = rng.weighted(ps, ps.map((p) => (p === handler ? 2 : 1) * (p.attrs.shotCreation + p.attrs.strength)));
    const fouler = pickFouler(d, defenderOf(o, d, victim.id), rng.next());
    if (fouler) {
      const bonus = commitFoul(st, d, fouler.id, victim.id, 'personal');
      if (bonus) {
        const last = freeThrows(st, o, victim.id, 2, (n) => addScore(st, c, victim.id, n, {}));
        return last ? 'ftMade' : rebound(st, c, 'ft', false);
      }
      return 'reset';
    }
  }
  // choose the play
  const w = playWeights(o, d, prof, c.chem);
  const play = rng.weighted(HALF_PLAYS, HALF_PLAYS.map((k) => w[k]));
  // time elapses while the play develops
  const pre = Math.max(0, (dur - used) * rng.range(0.55, 0.8));
  used += tick(st, pre);
  if (st.clock <= 0) return 'clock';
  const r = runPlay(st, c, play);
  if (typeof r === 'string') return r;
  used += tick(st, Math.max(0.3, dur - used));
  if (st.clock <= 0.05 && lastShot) {
    // buzzer beater attempt
  }
  return resolveShot(st, c, r);
}

/** Heave at the end of a period when there is almost no time left. */
function heave(st: MatchState, c: Ctx): Result {
  const ps = on(c.o);
  if (!ps.length) { tick(st, st.clock); return 'clock'; }
  const p = choose(st, c, ps, (x) => x.attrs.three + x.attrs.clutch * 0.3)!;
  const close = st.clock > 1.2 && st.rng.chance(0.3);
  tick(st, st.clock);
  return resolveShot(st, c, close ? { shooter: p, type: 'layup', openness: 0.3, assister: null, playType: 'heave' } : { shooter: p, type: 'three', openness: 0.1, assister: null, playType: 'heave', heave: true });
}

function intentionalFoulNeeded(st: MatchState, o: TeamRT, d: TeamRT): boolean {
  if (st.period < 4 || st.clock > 40 || st.clock < 1) return false;
  const deficit = o.score - d.score; // defense trailing by this much
  return deficit >= 1 && deficit <= 8 && on(d).length >= 1;
}

export function runPossession(st: MatchState): void {
  const oi = st.possession;
  const o = st.teams[oi], d = st.teams[1 - oi];
  const li = lineupInfo(o), ld = lineupInfo(d);
  const c: Ctx = { o, d, prof: li.prof, chem: li.chem, dchem: ld.chem, cause: st.lastEnd, second: false, transition: false };
  st.totalPossessions[oi]++;
  o.extra.possessions++;
  const startScore = o.score;
  const tk = o.tactics.offense;
  st.shotClock = 24;
  let result: Result;
  let loops = 0;
  let phase: 'start' | 'half' | 'second' = 'start';
  for (;;) {
    loops++;
    if (st.clock <= 0) { result = 'clock'; break; }
    if (loops > 12) { tick(st, Math.min(st.clock, 20)); result = 'tov'; break; }
    if (st.clock <= 1.5) { result = heave(st, c); }
    else if (phase === 'start' && intentionalFoulNeeded(st, o, d)) {
      // trailing defense fouls quickly to stop the clock
      tick(st, st.rng.range(1, 4));
      const ps = on(o);
      const victim = st.rng.weighted(ps, ps.map((p) => 1 + (100 - p.attrs.freeThrow) / 20));
      const fouler = pickFouler(d, null, st.rng.next());
      if (!fouler) { result = halfCourt(st, c, true, 24); }
      else {
        const bonus = commitFoul(st, d, fouler.id, victim.id, 'intentional');
        if (bonus) {
          const last = freeThrows(st, o, victim.id, 2, (n) => addScore(st, c, victim.id, n, {}));
          result = last ? 'ftMade' : rebound(st, c, 'ft', false);
        } else result = 'reset';
      }
    } else if (phase === 'start' && (st.lastEnd === 'dreb' || st.lastEnd === 'steal') && st.rng.chance(transitionChance(st, o, d, c.prof, c.chem, st.lastEnd))) {
      c.transition = true;
      const r = transitionPlay(st, c);
      if (r === 'pullout') { c.transition = false; result = halfCourt(st, c, false, 18); }
      else if (r === 'clock') result = 'clock';
      else if (typeof r === 'string') result = r;
      else result = resolveShot(st, c, r);
      c.transition = false;
    } else if (phase === 'second') {
      // offensive rebound: putback or reset
      const rb = reboundHolder;
      if (rb && o.onCourt.includes(rb.id) && st.rng.chance(clamp(0.32 + (rb.height - 188) * 0.012 + (rb.attrs.insideScoring - 70) * 0.004, 0.12, 0.6))) {
        tick(st, st.rng.range(0.5, 2));
        result = resolveShot(st, c, { shooter: rb, type: rb.attrs.dunk >= 80 && st.rng.chance(0.35) ? 'dunk' : 'layup', openness: st.rng.range(0.1, 0.45), assister: null, playType: 'putback', putback: true });
      } else {
        st.shotClock = 14;
        result = halfCourt(st, c, false, 13.5);
      }
    } else {
      result = halfCourt(st, c, phase === 'start', phase === 'half' ? Math.max(4, st.shotClock - 0.5) : 24);
    }
    if (result === 'oreb') { phase = 'second'; c.second = true; continue; }
    if (result === 'reset') { st.shotClock = Math.max(st.shotClock, 14); phase = 'half'; continue; }
    break;
  }
  // bookkeeping for tactic effectiveness
  const tp = (o.tacticPoss[tk] ??= { poss: 0, pts: 0 });
  tp.poss++; tp.pts += o.score - startScore;
  // possession change
  switch (result) {
    case 'made': st.lastEnd = 'made'; st.deadBall = true; break;
    case 'ftMade': st.lastEnd = 'ft'; st.deadBall = true; break;
    case 'steal': st.lastEnd = 'steal'; st.deadBall = false; break;
    case 'tov': st.lastEnd = 'tov'; st.deadBall = true; break;
    case 'miss': st.lastEnd = 'dreb'; st.deadBall = false; break;
    case 'clock': st.lastEnd = 'period'; st.deadBall = true; break;
    default: st.lastEnd = 'dreb'; st.deadBall = false;
  }
  st.possession = (1 - oi) as 0 | 1;
}
