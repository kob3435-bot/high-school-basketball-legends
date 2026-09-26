import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { SimEvent, TeamConfig, Tactics } from '../../engine/types';
import { SLOTS } from '../../engine/types';
import { MatchSim } from '../../engine/Match';
import { boxScore, teamTotals, type BoxRow, type TeamTotals, type MatchResult } from '../../engine/StatisticsEngine';
import { recordResult } from '../../engine/Tournament';
import { useApp, save, type Mode } from '../store';
import { Modal, TacticsEditor, fmtClock, periodLabel } from '../components';
import { TeamLogo, Portrait } from '../art';
import { CourtView } from '../court';
import { play } from '../sound';
import { BoxTable } from './Results';
import { awayKit } from '../kit';

const DUR: Partial<Record<SimEvent['type'], number>> = {
  tipoff: 1.4, periodStart: 1.0, bringUp: 1.3, pass: 0.65, screen: 0.85, drive: 0.85, postUp: 1.0, cut: 0.75, iso: 0.9, doubleTeam: 0.8,
  shot: 1.25, block: 1.0, rebound: 0.8, steal: 0.9, turnover: 0.9, foul: 1.0, ft: 1.0, sub: 0.45, timeout: 1.2, tactic: 0.5, fastBreak: 1.0,
  run: 0.7, info: 0.7, foulOut: 1.3, periodEnd: 1.8, halftime: 1.0, overtime: 1.5, final: 1.0, pressBreak: 0.9, violation: 0.8,
};
const BASE = 0.8;

interface Snap {
  onCourt: [(string | null)[], (string | null)[]];
  bench: [string[], string[]];
  energy: [Record<string, number>, Record<string, number>];
  box: [BoxRow[], BoxRow[]];
  totals: [TeamTotals, TeamTotals];
  fouledOut: [Record<string, boolean>, Record<string, boolean>];
  pending: { out: string; in: string }[];
  timeouts: [number, number];
  pendingTimeout: boolean;
  tactics: [Tactics, Tactics];
  matchups: Record<string, string>;
}

interface Props { mode: Mode; user: TeamConfig | null; cpu: TeamConfig; home?: TeamConfig; seed: number; tournament?: { round: number; idx: number }; spectate?: boolean }

export function LiveMatch({ mode, user, cpu: cpuCfg, home, seed, tournament, spectate }: Props) {
  const { nav, settings, toast } = useApp();
  const A = (user ?? home)!;
  const cpu = useMemo(() => awayKit(A, cpuCfg), []);
  const U: 0 | null = user ? 0 : null;
  const simRef = useRef<MatchSim>();
  if (!simRef.current) simRef.current = new MatchSim(A, cpuCfg, seed, { userTeam: U, autoSubUser: settings.autoSub, mode });
  const sim = simRef.current;
  const names = useMemo(() => { const m: Record<string, string> = {}; for (const t of sim.st.teams) for (const id of t.roster) m[id] = t.players[id].name; return m; }, []);

  const [speed, setSpeed] = useState<0 | 1 | 2 | 4>(settings.defaultSpeed);
  const [score, setScore] = useState<[number, number]>([0, 0]);
  const [period, setPeriod] = useState(1);
  const [tf, setTf] = useState<[number, number]>([0, 0]);
  const [to, setTo] = useState<[number, number]>([sim.st.teams[0].timeouts, sim.st.teams[1].timeouts]);
  const [log, setLog] = useState<SimEvent[]>([]);
  const [snap, setSnap] = useState<Snap>(() => takeSnap());
  const [tab, setTab] = useState<'pbp' | 'lineup' | 'tactics' | 'box'>('pbp');
  const [modal, setModal] = useState<null | 'halftime' | 'timeout'>(null);
  const [final, setFinal] = useState<MatchResult | null>(null);
  const [autoSub, setAutoSubS] = useState(sim.st.teams[0].autoSub);
  const [banner, setBanner] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const clockRef = useRef<HTMLSpanElement>(null);
  const shotRef = useRef<HTMLSpanElement>(null);
  const R = useRef({ queue: [] as SimEvent[], timer: 0, cur: 1, prevClock: 600, evClock: 600, shot: 24, prevShot: 24, blocked: false, speed: settings.defaultSpeed as number, done: false, period: 1, lastId: -1, logBuf: [] as SimEvent[], dirty: false });

  const court = useMemo(() => {
    const nums: Record<string, number> = {};
    for (const t of sim.st.teams) for (const id of t.roster) nums[id] = t.players[id].jersey;
    const cv = new CourtView([sim.st.teams[0].onCourt, sim.st.teams[1].onCourt], nums, [[A.primary, A.secondary], [cpu.primary, cpu.secondary]], A.short);
    cv.zone = [false, false];
    cv.onSfx = (s) => play(s);
    return cv;
  }, []);

  function takeSnap(): Snap {
    const st = sim.st; const t = st.teams;
    return {
      onCourt: [t[0].onCourt.slice(), t[1].onCourt.slice()],
      bench: [t[0].roster.filter((id) => !t[0].onCourt.includes(id)), t[1].roster.filter((id) => !t[1].onCourt.includes(id))],
      energy: [{ ...t[0].energy }, { ...t[1].energy }],
      box: [boxScore(t[0]), boxScore(t[1])], totals: [teamTotals(t[0]), teamTotals(t[1])],
      fouledOut: [{ ...t[0].fouledOut }, { ...t[1].fouledOut }],
      pending: t[0].pendingSubs.slice(), timeouts: [t[0].timeouts, t[1].timeouts], pendingTimeout: t[0].pendingTimeout,
      tactics: [{ ...t[0].tactics }, { ...t[1].tactics }], matchups: { ...t[0].matchups },
    };
  }
  const refresh = () => setSnap(takeSnap());

  const finish = () => {
    const r = R.current; if (r.done) return; r.done = true;
    const result = sim.result();
    if (!spectate) {
      save.addHistory(result);
      if (tournament) {
        const ts = save.getTournament();
        if (ts) {
          const m = ts.rounds[tournament.round]?.[tournament.idx];
          if (m && m.winner === null && m.a !== null && m.b !== null) {
            const userIsA = m.a === ts.userIdx;
            const sc: [number, number] = userIsA ? [result.teams[0].score, result.teams[1].score] : [result.teams[1].score, result.teams[0].score];
            recordResult(ts, tournament.round, tournament.idx, sc, `${result.potg.name} (${result.potg.line})`, result.id, sim.st.overtimes);
            save.saveTournament(ts);
          }
        }
      }
    }
    setScore([sim.st.teams[0].score, sim.st.teams[1].score]);
    refresh();
    setFinal(result);
    play('buzzer'); setTimeout(() => play('cheer'), 300);
  };

  const showEvent = (ev: SimEvent) => {
    const r = R.current;
    court.apply(ev);
    r.prevClock = r.evClock; r.prevShot = r.shot;
    if (ev.period !== r.period) { r.prevClock = ev.clock; r.period = ev.period; }
    r.lastId = ev.id;
    r.evClock = ev.clock; r.shot = ev.shotClock;
    r.logBuf.push(ev); r.dirty = true;
    setScore(ev.score); setPeriod(ev.period);
    if (ev.tf) setTf(ev.tf);
    if (ev.to) setTo(ev.to);
    // sound
    switch (ev.type) {
      case 'bringUp': play('bounce'); break;
      case 'drive': case 'cut': case 'iso': play('squeak'); break;
      case 'foul': case 'timeout': case 'violation': case 'sub': case 'periodStart': case 'tipoff': play('whistle'); break;
      case 'turnover': if (ev.kind !== 'stolen') play('whistle'); break;
      case 'periodEnd': play('buzzer'); break;
      case 'run': play('crowd'); break;
      case 'block': play('cheer'); break;
      case 'shot': if (ev.made && (ev.big || ev.shotType === 'dunk' || ev.shotType === 'three')) setTimeout(() => play('cheer'), 350); break;
    }
    if (ev.big && (ev.type === 'shot' || ev.type === 'block' || ev.type === 'run' || ev.type === 'foulOut' || ev.type === 'overtime')) { setBanner(ev.text); setTimeout(() => setBanner((b) => (b === ev.text ? null : b)), 1800); }
    if (ev.type === 'sub' || ev.type === 'foulOut') refresh();
    if (ev.type === 'halftime' && !spectate) { r.blocked = true; refresh(); setModal('halftime'); }
    if (ev.type === 'timeout') { refresh(); if (U !== null && ev.team === U) { r.blocked = true; setModal('timeout'); } }
    if (ev.type === 'final') finish();
  };

  // main loop
  useEffect(() => {
    let raf = 0, last = performance.now();
    const ctx = canvasRef.current!.getContext('2d')!;
    let cw = 0, ch = 0;
    const resize = () => {
      const w = wrapRef.current!.clientWidth; const dpr = Math.min(2, window.devicePixelRatio || 1);
      cw = w; ch = Math.round((w * 15) / 28);
      const c = canvasRef.current!; c.width = Math.round(cw * dpr); c.height = Math.round(ch * dpr); c.style.height = ch + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(wrapRef.current!);
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      const r = R.current;
      const sp = r.blocked || r.done ? 0 : r.speed;
      if (sp > 0) {
        r.timer -= dt * sp;
        let guard = 0;
        while (r.timer <= 0 && !r.blocked && !r.done && guard++ < 40) {
          if (r.queue.length === 0) {
            if (sim.finished) { finish(); break; }
            refresh();
            court.setLineups([sim.st.teams[0].onCourt, sim.st.teams[1].onCourt]);
            r.queue.push(...sim.step());
            if (!r.queue.length) continue;
          }
          const ev = r.queue.shift()!;
          const d = (DUR[ev.type] ?? 0.7) * BASE;
          r.cur = d; r.timer += d;
          showEvent(ev);
        }
      }
      if (r.dirty) { r.dirty = false; const add = r.logBuf.splice(0); setLog((l) => [...add.reverse(), ...l].slice(0, 250)); }
      // interpolated clocks
      const k = r.cur > 0 ? Math.min(1, Math.max(0, 1 - r.timer / r.cur)) : 1;
      const clk = r.prevClock + (r.evClock - r.prevClock) * k;
      if (clockRef.current) clockRef.current.textContent = fmtClock(r.done ? r.evClock : clk);
      if (shotRef.current) shotRef.current.textContent = String(Math.max(0, Math.ceil(r.shot)));
      court.update(dt, sp > 0 ? Math.max(1, sp) : 0.25);
      court.draw(ctx, cw, ch);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    (window as any).__hsbl = { sim, setSpeed: (n: number) => { R.current.speed = n; } };
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  const setSp = (s: 0 | 1 | 2 | 4) => { setSpeed(s); R.current.speed = s; };
  const simToEnd = () => {
    const r = R.current; if (r.done) return;
    setModal(null); r.blocked = false;
    // Everything already simulated is shown in the log, then the rest of the game is simulated instantly.
    r.queue = [];
    sim.simToEnd();
    const tail = sim.st.events.filter((e) => e.id > r.lastId).slice(-60);
    const lastEv = sim.st.events[sim.st.events.length - 1];
    if (lastEv) { r.evClock = lastEv.clock; r.prevClock = lastEv.clock; setPeriod(lastEv.period); if (lastEv.tf) setTf(lastEv.tf); if (lastEv.to) setTo(lastEv.to); court.period = lastEv.period; }
    setLog((l) => [...tail.reverse(), ...l].slice(0, 250));
    court.setLineups([sim.st.teams[0].onCourt, sim.st.teams[1].onCourt]);
    finish();
  };

  const changeTactics = (t: Tactics) => {
    if (U === null) return;
    const evs = sim.setTactics(U, t);
    if (evs.length) { setLog((l) => [...evs, ...l]); toast(`Tactics: ${t.offense} / ${t.defense} / ${t.pace}`); }
    court.zone[0] = t.defense.includes('Zone');
    refresh();
  };
  const doSub = (outId: string, inId: string): string | null => {
    if (U === null) return 'Spectating';
    const immediate = R.current.blocked || sim.st.status === 'pregame';
    if (immediate) {
      const err = sim.subNow(U, outId, inId);
      if (err) return err;
      const evs = sim.st.buffer.slice();
      for (const e of evs) court.apply(e);
      setLog((l) => [...evs.reverse(), ...l]);
      refresh();
      play('whistle');
      return null;
    }
    const err = sim.requestSub(U, outId, inId);
    if (!err) { refresh(); toast(`Sub queued: ${names[inId]} for ${names[outId]} (next dead ball)`); }
    return err;
  };
  const timeout = () => {
    if (U === null) return;
    const err = sim.requestTimeout(U);
    if (err) toast(err); else { toast('Timeout requested — called at the next dead ball'); refresh(); }
  };
  const resume = () => { setModal(null); R.current.blocked = false; play('whistle'); };
  const toggleAuto = () => { if (U === null) return; const v = !autoSub; sim.setAutoSub(U, v); setAutoSubS(v); toast(`Auto-sub ${v ? 'ON' : 'OFF'}`); };
  const setMatchup = (oppId: string, defId: string) => { if (U === null) return; sim.setMatchup(U, oppId, defId || null); refresh(); toast(defId ? `${names[defId]} now guards ${names[oppId]}` : 'Matchup set to auto'); };

  const goResults = () => {
    if (!final) return;
    nav({ name: 'results', result: final, mode, rematch: user ? { user, cpu: cpuCfg } : undefined, tournament: !!tournament }, true);
  };

  const T = sim.st.teams;
  const teamsCfg = [A, cpu];

  return (
    <div class="screen live" data-testid="live-match">
      <div class="scoreboard" data-testid="scoreboard">
        {[0, 1].map((i) => (
          <div class={'sb-team' + (i === 1 ? ' right' : '')} style={{ '--tc': teamsCfg[i].primary } as any}>
            <TeamLogo team={teamsCfg[i]} size={34} />
            <div class="sb-name"><b>{teamsCfg[i].short}</b><small class="sb-full">{teamsCfg[i].name}</small>
              <small class="sb-meta">TF {tf[i]}{tf[i] >= 5 ? ' BONUS' : ''} · TO {to[i]}</small></div>
            <div class="sb-score" data-testid={`score-${i}`}>{score[i]}</div>
          </div>
        ))}
        <div class="sb-mid">
          <div class="sb-period" data-testid="period">{periodLabel(period)}</div>
          <div class="sb-clock"><span ref={clockRef} data-testid="clock">10:00</span></div>
          <div class="sb-shot">SHOT <span ref={shotRef}>24</span></div>
        </div>
      </div>

      <div class="live-grid"><div class="live-left">
      <div class="court-wrap" ref={wrapRef}>
        <canvas ref={canvasRef} class="court" aria-label="Live tactical court" role="img" data-testid="court" />
        {banner && <div class="court-banner">{banner}</div>}
        {log[0] && <div class="court-caption" data-testid="caption">{log[0].text}</div>}
      </div>

      <div class="live-controls">
        <div class="seg" role="group" aria-label="Speed">
          <button class={speed === 0 ? 'on' : ''} onClick={() => setSp(0)} data-testid="speed-pause" aria-label="Pause">❚❚</button>
          <button class={speed === 1 ? 'on' : ''} onClick={() => setSp(1)} data-testid="speed-1">1x</button>
          <button class={speed === 2 ? 'on' : ''} onClick={() => setSp(2)} data-testid="speed-2">2x</button>
          <button class={speed === 4 ? 'on' : ''} onClick={() => setSp(4)} data-testid="speed-4">4x</button>
        </div>
        {U !== null && <button class={'btn sm' + (snap.pendingTimeout ? ' warn' : '')} onClick={timeout} disabled={to[0] <= 0 || !!final || snap.pendingTimeout} data-testid="timeout-btn">Timeout ({to[0]}){snap.pendingTimeout ? ' …' : ''}</button>}
        {U !== null && <button class={'btn sm' + (autoSub ? ' on' : '')} onClick={toggleAuto} data-testid="autosub-toggle" aria-pressed={autoSub}>Auto-sub {autoSub ? 'ON' : 'OFF'}</button>}
        <button class="btn sm" onClick={simToEnd} disabled={!!final} data-testid="sim-to-end">Sim to End ⏭</button>
      </div>

      </div><div class="live-right">
      <div class="tabs" role="tablist">
        <button role="tab" class={tab === 'pbp' ? 'on' : ''} onClick={() => setTab('pbp')} data-testid="ltab-pbp">Play-by-play</button>
        {U !== null && <button role="tab" class={tab === 'lineup' ? 'on' : ''} onClick={() => setTab('lineup')} data-testid="ltab-lineup">Lineup & Subs</button>}
        {U !== null && <button role="tab" class={tab === 'tactics' ? 'on' : ''} onClick={() => setTab('tactics')} data-testid="ltab-tactics">Tactics</button>}
        <button role="tab" class={tab === 'box' ? 'on' : ''} onClick={() => { refresh(); setTab('box'); }} data-testid="ltab-box">Box Score</button>
      </div>
      <div class="panel tab-body">
        {tab === 'pbp' && (
          <ol class="pbp" data-testid="pbp">
            {log.slice(0, 120).map((e) => (
              <li class={(e.big ? 'big ' : '') + (e.type === 'shot' && e.made ? 'made' : '')} style={{ borderLeftColor: teamsCfg[e.team].primary }}>
                <span class="pbp-t">{periodLabel(e.period)} {fmtClock(e.clock)}</span>
                <span class="pbp-x">{e.text}</span>
                {e.type === 'shot' && e.made && <span class="pbp-s">{e.score[0]}-{e.score[1]}</span>}
              </li>
            ))}
            {log.length === 0 && <li class="muted">Tip-off coming up…</li>}
          </ol>
        )}
        {tab === 'lineup' && U !== null && <SubPanel snap={snap} team={0} names={names} onSub={doSub} immediate={R.current.blocked} sim={sim} onCancel={() => { sim.cancelSubs(0); refresh(); }} />}
        {tab === 'tactics' && U !== null && (
          <div>
            <TacticsEditor t={snap.tactics[0]} onChange={changeTactics} />
            <p class="muted small">Opponent: {snap.tactics[1].offense} / {snap.tactics[1].defense} / {snap.tactics[1].pace}</p>
            <MatchupEditor snap={snap} names={names} onSet={setMatchup} />
          </div>
        )}
        {tab === 'box' && (
          <div>
            {[0, 1].map((i) => <div><h4>{teamsCfg[i].name} — {score[i]}</h4><BoxTable rows={snap.box[i]} totals={snap.totals[i]} compact /></div>)}
            <p class="muted small">Live box score updates after each possession.</p>
          </div>
        )}
      </div>
      </div></div>

      {modal && !final && (
        <Modal title={modal === 'halftime' ? `Halftime — ${A.short} ${score[0]} : ${score[1]} ${cpu.short}` : 'Timeout'} onClose={resume} wide testid={modal === 'halftime' ? 'halftime-modal' : 'timeout-modal'}>
          {modal === 'halftime' && <HalfStats snap={snap} teams={teamsCfg} />}
          <h4>Tactics</h4>
          <TacticsEditor t={snap.tactics[0]} onChange={changeTactics} compact />
          <h4>Substitutions (immediate)</h4>
          <SubPanel snap={snap} team={0} names={names} onSub={doSub} immediate sim={sim} onCancel={() => { sim.cancelSubs(0); refresh(); }} />
          <div class="cta-row"><button class="btn big primary" onClick={resume} data-testid="resume-btn">{modal === 'halftime' ? 'Start 2nd Half' : 'Resume Game'}</button></div>
        </Modal>
      )}

      {final && (
        <div class="final-overlay" data-testid="final-overlay">
          <div class="final-card">
            <div class="kicker">FINAL{final.periods > 4 ? (final.periods === 5 ? ' / OT' : ` / ${final.periods - 4}OT`) : ''}</div>
            <div class="final-score">
              <span><TeamLogo team={teamsCfg[0]} size={40} /><b>{teamsCfg[0].short}</b></span>
              <strong data-testid="final-score">{final.teams[0].score} – {final.teams[1].score}</strong>
              <span><b>{teamsCfg[1].short}</b><TeamLogo team={teamsCfg[1]} size={40} /></span>
            </div>
            <div class="final-result">{U !== null ? (final.winner === U ? 'VICTORY!' : 'DEFEAT') : `${final.teams[final.winner].name} win`}</div>
            <div class="potg">Player of the Game: <b>{final.potg.name}</b> — {final.potg.line}</div>
            <button class="btn big primary" onClick={goResults} data-testid="view-results">Box Score & Analysis →</button>
          </div>
        </div>
      )}
    </div>
  );
}

function HalfStats({ snap, teams }: { snap: Snap; teams: TeamConfig[] }) {
  const top = (i: 0 | 1) => [...snap.box[i]].sort((a, b) => b.pts - a.pts).slice(0, 2);
  return (
    <table class="mini half-stats"><thead><tr><th></th><th>FG%</th><th>3P%</th><th>REB</th><th>TO</th><th>Top scorers</th></tr></thead>
      <tbody>{[0, 1].map((i) => { const t = snap.totals[i as 0 | 1]; return <tr><td><b>{teams[i].short}</b></td><td>{t.fgPct}</td><td>{t.tpPct}</td><td>{t.reb}</td><td>{t.tov}</td><td>{top(i as 0 | 1).map((r) => `${r.name.split(' ').slice(-1)[0]} ${r.pts}`).join(', ')}</td></tr>; })}</tbody>
    </table>
  );
}

function SubPanel({ snap, team, names, onSub, immediate, sim, onCancel }: { snap: Snap; team: 0 | 1; names: Record<string, string>; onSub: (o: string, i: string) => string | null; immediate?: boolean; sim: MatchSim; onCancel: () => void }) {
  const [out, setOut] = useState<string | null>(null);
  const [inn, setInn] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const box = Object.fromEntries(snap.box[team].map((r) => [r.id, r]));
  const P = sim.st.teams[team].players;
  const go = () => {
    if (!out || !inn) { setErr('Pick a player to take out and one to bring in'); return; }
    const e = onSub(out, inn); setErr(e); if (!e) { setOut(null); setInn(null); }
  };
  const row = (id: string, sel: boolean, onClick: () => void, slot?: string, disabled?: boolean) => {
    const b = box[id]; const en = Math.round(snap.energy[team][id] ?? 100);
    return (
      <button class={'sub-row' + (sel ? ' sel' : '') + (snap.fouledOut[team][id] ? ' out' : '')} onClick={onClick} disabled={disabled} data-testid={`subrow-${id}`}>
        {slot && <span class="slot-pos sm">{slot}</span>}
        <Portrait player={P[id]} size={30} />
        <span class="sub-name">{names[id]}<small>{b?.pts ?? 0} pts · {b?.pf ?? 0} PF{snap.fouledOut[team][id] ? ' · FOULED OUT' : ''}</small></span>
        <span class="energy" title={`Energy ${en}`}><i style={{ width: en + '%', background: en > 70 ? '#16a34a' : en > 45 ? '#f59e0b' : '#dc2626' }} /></span>
      </button>
    );
  };
  return (
    <div class="subpanel" data-testid="sub-panel">
      <div class="sub-cols">
        <div><h5>On court — tap to take out</h5>{snap.onCourt[team].map((id, i) => id ? row(id, out === id, () => setOut(out === id ? null : id), SLOTS[i]) : <div class="sub-row empty">{SLOTS[i]} — empty</div>)}</div>
        <div><h5>Bench — tap to bring in</h5>{snap.bench[team].map((id) => row(id, inn === id, () => setInn(inn === id ? null : id), undefined, !!snap.fouledOut[team][id]))}</div>
      </div>
      {err && <div class="errors" role="alert">{err}</div>}
      <div class="row gap wrap">
        <button class="btn primary" onClick={go} disabled={!out || !inn} data-testid="do-sub">{immediate ? 'Substitute now' : 'Substitute (next dead ball)'}</button>
        {snap.pending.length > 0 && <><span class="small">Pending: {snap.pending.map((s) => `${names[s.in]} for ${names[s.out]}`).join(', ')}</span><button class="btn sm" onClick={onCancel}>Cancel pending</button></>}
      </div>
    </div>
  );
}

function MatchupEditor({ snap, names, onSet }: { snap: Snap; names: Record<string, string>; onSet: (opp: string, def: string) => void }) {
  return (
    <div class="mu-edit" data-testid="live-matchups">
      <h4>Defensive matchups</h4>
      {snap.onCourt[1].map((oid, i) => oid && (
        <label class="mu-edit-row">{SLOTS[i]} {names[oid]} ←
          <select value={snap.matchups[oid] && snap.onCourt[0].includes(snap.matchups[oid]) ? snap.matchups[oid] : ''} onChange={(e) => onSet(oid, (e.target as HTMLSelectElement).value)} data-testid={`live-matchup-${i}`}>
            <option value="">Auto</option>
            {snap.onCourt[0].filter(Boolean).map((id) => <option value={id!}>{names[id!]}</option>)}
          </select>
        </label>
      ))}
    </div>
  );
}
