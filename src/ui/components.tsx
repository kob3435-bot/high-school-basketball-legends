import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Player, Tactics, TeamConfig } from '../engine/types';
import { ATTR_GROUPS, ATTR_LABELS, OFF_TACTICS, DEF_TACTICS, PACES, SLOTS } from '../engine/types';
import { SCHOOL_MAP, PLAYER_MAP } from '../engine/db';
import { SIGNATURES } from '../engine/signatures';
import { profileLineup } from '../engine/LineupEngine';
import { evaluateChemistry } from '../engine/ChemistryEngine';
import { Portrait, SchoolLogo } from './art';
import { save } from './store';

export function Modal({ title, onClose, children, wide, testid }: { title: string; onClose: () => void; children: ComponentChildren; wide?: boolean; testid?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    ref.current?.focus();
    return () => window.removeEventListener('keydown', k);
  }, []);
  return (
    <div class="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div class={'modal' + (wide ? ' wide' : '')} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref} data-testid={testid ?? 'modal'}>
        <div class="modal-head">
          <h2>{title}</h2>
          <button class="icon-btn" aria-label="Close" data-testid="modal-close" onClick={onClose}>✕</button>
        </div>
        <div class="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Confirm({ text, onYes, onNo, yes = 'Yes', no = 'Cancel' }: { text: string; onYes: () => void; onNo: () => void; yes?: string; no?: string }) {
  return (
    <Modal title="Please confirm" onClose={onNo} testid="confirm-modal">
      <p>{text}</p>
      <div class="row gap end">
        <button class="btn" onClick={onNo} data-testid="confirm-no">{no}</button>
        <button class="btn danger" onClick={onYes} data-testid="confirm-yes">{yes}</button>
      </div>
    </Modal>
  );
}

export function OvrBadge({ v, small }: { v: number; small?: boolean }) {
  const cls = v >= 90 ? 'ovr s' : v >= 82 ? 'ovr a' : v >= 74 ? 'ovr b' : v >= 66 ? 'ovr c' : 'ovr d';
  return <span class={cls + (small ? ' sm' : '')}>{v}</span>;
}

export function PlayerCard({ p, onClick, actions, compact, selected, badge }: { p: Player; onClick?: () => void; actions?: ComponentChildren; compact?: boolean; selected?: boolean; badge?: string }) {
  const s = SCHOOL_MAP[p.school];
  return (
    <div class={'pcard' + (compact ? ' compact' : '') + (selected ? ' selected' : '')} data-testid={`pcard-${p.id}`}>
      <button class="pcard-main" onClick={onClick} aria-label={`Open ${p.name} details`} data-testid={`pcard-open-${p.id}`}>
        <Portrait player={p} size={compact ? 44 : 60} />
        <div class="pcard-info">
          <div class="pcard-name">{p.name}{badge && <span class="tag">{badge}</span>}</div>
          <div class="pcard-sub"><SchoolLogo schoolId={p.school} size={14} /> {s?.short} · {p.pos}{p.pos2 ? '/' + p.pos2 : ''} · {p.height}cm</div>
          {!compact && <div class="pcard-arch">{p.archetype}</div>}
        </div>
        <OvrBadge v={p.overall} />
      </button>
      {actions && <div class="pcard-actions">{actions}</div>}
    </div>
  );
}

export function Radar({ p, size = 220 }: { p: Player; size?: number }) {
  const groups = Object.entries(ATTR_GROUPS);
  const vals = groups.map(([, keys]) => keys.reduce((a, k) => a + p.attrs[k as keyof typeof p.attrs], 0) / keys.length);
  const cx = 110, cy = 110, R = 80;
  const pt = (i: number, v: number) => { const a = -Math.PI / 2 + (i / groups.length) * Math.PI * 2; return [cx + Math.cos(a) * R * (v / 100), cy + Math.sin(a) * R * (v / 100)]; };
  return (
    <svg width={size} height={size} viewBox="0 0 220 220" class="radar" role="img" aria-label="Attribute radar chart">
      {[25, 50, 75, 100].map((r) => <polygon points={groups.map((_, i) => pt(i, r).join(',')).join(' ')} fill="none" stroke="#ddd" />)}
      {groups.map((_, i) => { const [x, y] = pt(i, 100); return <line x1={cx} y1={cy} x2={x} y2={y} stroke="#e5e5e5" />; })}
      <polygon points={vals.map((v, i) => pt(i, v).join(',')).join(' ')} fill="rgba(200,16,46,0.28)" stroke="#c8102e" stroke-width="2" />
      {groups.map(([g], i) => { const [x, y] = pt(i, 122); return <text x={x} y={y} font-size="10" text-anchor="middle" dominant-baseline="middle" fill="#333">{g} {Math.round(vals[i])}</text>; })}
    </svg>
  );
}

export function AttrBar({ label, v }: { label: string; v: number }) {
  const c = v >= 90 ? '#c8102e' : v >= 80 ? '#e4572e' : v >= 70 ? '#555' : v >= 60 ? '#888' : '#bbb';
  return (
    <div class="attr"><span class="attr-l">{label}</span><span class="attr-bar"><i style={{ width: `${v}%`, background: c }} /></span><span class="attr-v">{v}</span></div>
  );
}

export function PlayerModal({ p, onClose, list }: { p: Player; onClose: () => void; list?: Player[] }) {
  const [cur, setCur] = useState(p);
  const idx = list ? list.findIndex((x) => x.id === cur.id) : -1;
  const go = (d: number) => { if (!list || idx < 0) return; setCur(list[(idx + d + list.length) % list.length]); };
  const touch = useRef<number | null>(null);
  const career = save.careerStats()[cur.id];
  const s = SCHOOL_MAP[cur.school];
  return (
    <Modal title={cur.name} onClose={onClose} wide testid="player-modal">
      <div class="pm" onTouchStart={(e) => (touch.current = e.touches[0].clientX)} onTouchEnd={(e) => { if (touch.current === null) return; const dx = e.changedTouches[0].clientX - touch.current; if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1); touch.current = null; }}>
        <div class="pm-top">
          <Portrait player={cur} size={110} />
          <div class="pm-id">
            <div class="row gap"><SchoolLogo schoolId={cur.school} size={28} /><b>{s?.name}</b></div>
            <div>#{cur.jersey} · {cur.pos}{cur.pos2 ? ` / ${cur.pos2}` : ''} · {cur.height} cm · {cur.weight} kg</div>
            <div><b>{cur.archetype}</b> · {cur.tier === 'legend' ? 'Legend' : cur.tier[0].toUpperCase() + cur.tier.slice(1)}</div>
            <div class="row gap">Overall <OvrBadge v={cur.overall} /></div>
            <p class="muted">{cur.bio}</p>
          </div>
          <Radar p={cur} size={200} />
        </div>
        {list && <div class="row gap center"><button class="btn sm" onClick={() => go(-1)} data-testid="pm-prev">‹ Prev</button><span class="muted">swipe for more</span><button class="btn sm" onClick={() => go(1)} data-testid="pm-next">Next ›</button></div>}
        <div class="pm-cols">
          <div>
            <h4>Strengths</h4><ul class="chips good">{cur.strengths.map((x) => <li>{x}</li>)}</ul>
            <h4>Weaknesses</h4><ul class="chips bad">{cur.weaknesses.map((x) => <li>{x}</li>)}</ul>
            <h4>Signature skills</h4>
            {cur.signatures.length ? <ul class="sigs">{cur.signatures.map((x) => <li><b>{x}</b> — {SIGNATURES[x]?.desc}</li>)}</ul> : <p class="muted">None</p>}
            <h4>Game stats (saved matches)</h4>
            {career ? (
              <table class="mini"><tbody>
                <tr><td>Games</td><td>{career.gp}</td><td>PPG</td><td>{(career.pts / career.gp).toFixed(1)}</td></tr>
                <tr><td>RPG</td><td>{(career.reb / career.gp).toFixed(1)}</td><td>APG</td><td>{(career.ast / career.gp).toFixed(1)}</td></tr>
                <tr><td>FG%</td><td>{career.fga ? ((career.fgm / career.fga) * 100).toFixed(1) : '-'}</td><td>3P%</td><td>{career.tpa ? ((career.tpm / career.tpa) * 100).toFixed(1) : '-'}</td></tr>
              </tbody></table>
            ) : <p class="muted">No games played yet.</p>}
          </div>
          <div class="attr-groups">
            {Object.entries(ATTR_GROUPS).map(([g, keys]) => (
              <div class="attr-group"><h4>{g}</h4>{keys.map((k) => <AttrBar label={ATTR_LABELS[k]} v={cur.attrs[k]} />)}</div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export const OFF_DESC: Record<string, string> = {
  'Balanced': 'Takes what the defense gives.', 'Fast Break': 'Push after every rebound and steal.', 'Run & Gun': 'Ultra fast pace, early threes. Tiring.',
  'Inside Focus': 'Pound the paint: post-ups, drives, cuts.', 'Perimeter Focus': 'Spread the floor and shoot threes.', 'Pick & Roll': 'Heavy PG + big two-man game.',
  'Isolation': 'Clear out for your best scorer.', 'Motion Offense': 'Constant cutting and ball movement.',
};
export const DEF_DESC: Record<string, string> = {
  'Man-to-Man': 'Honest one-on-one matchups.', '2-3 Zone': 'Protects the paint; gives up threes and offensive boards.', '3-2 Zone': 'Covers shooters; weaker in the post.',
  'Full Court Press': 'Forces turnovers vs weak handlers. Very tiring, fouls more.', 'Half Court Press': 'Aggressive traps in the half court.',
  'Double Team Star': 'Send two at their star; leaves shooters open.', 'Protect Paint': 'Pack the lane; concede outside shots.', 'Guard Perimeter': 'Run shooters off the line; exposed inside.',
};

export function TacticsEditor({ t, onChange, compact }: { t: Tactics; onChange: (t: Tactics) => void; compact?: boolean }) {
  return (
    <div class={'tactics' + (compact ? ' compact' : '')} data-testid="tactics-editor">
      <label>Offense
        <select value={t.offense} data-testid="tactic-offense" onChange={(e) => onChange({ ...t, offense: (e.target as HTMLSelectElement).value as Tactics['offense'] })}>
          {OFF_TACTICS.map((o) => <option value={o}>{o}</option>)}
        </select>
        {!compact && <small>{OFF_DESC[t.offense]}</small>}
      </label>
      <label>Defense
        <select value={t.defense} data-testid="tactic-defense" onChange={(e) => onChange({ ...t, defense: (e.target as HTMLSelectElement).value as Tactics['defense'] })}>
          {DEF_TACTICS.map((o) => <option value={o}>{o}</option>)}
        </select>
        {!compact && <small>{DEF_DESC[t.defense]}</small>}
      </label>
      <label>Pace
        <div class="seg" role="group" aria-label="Pace">
          {PACES.map((p) => <button class={t.pace === p ? 'on' : ''} data-testid={`pace-${p}`} onClick={() => onChange({ ...t, pace: p })}>{p}</button>)}
        </div>
      </label>
    </div>
  );
}

export function LineupAnalysis({ ids }: { ids: (string | null)[] }) {
  const players = ids.map((id) => (id ? PLAYER_MAP[id] : null));
  if (players.filter(Boolean).length === 0) return <p class="muted">Pick players to see lineup analysis.</p>;
  const prof = profileLineup(players);
  const chem = evaluateChemistry(players);
  return (
    <div class="analysis" data-testid="lineup-analysis">
      <div class="row gap wrap">
        <span class={'chem ' + (chem.score >= 4 ? 'good' : chem.score < 0 ? 'bad' : '')}>Chemistry {chem.score >= 0 ? '+' : ''}{chem.score}</span>
        <span class="stat-pill">Size {prof.size.toFixed(0)}cm</span>
        <span class="stat-pill">Shooters {prof.shooters.toFixed(1)}</span>
        <span class="stat-pill">Rim prot. {Math.round(prof.rimProtection)}</span>
        <span class="stat-pill">Speed {Math.round(prof.speed)}</span>
      </div>
      {chem.items.length > 0 && <ul class="chem-items">{chem.items.map((i) => <li class={i.value >= 0 ? 'good' : 'bad'}>{i.value >= 0 ? '▲' : '▼'} {i.label}</li>)}</ul>}
      {(prof.pros.length > 0 || prof.cons.length > 0) && (
        <div class="proscons">
          {prof.pros.map((x) => <div class="good">✔ {x}</div>)}
          {prof.cons.map((x) => <div class="bad">✖ {x}</div>)}
        </div>
      )}
      {prof.mismatches.length > 0 && <div class="mismatch">{prof.mismatches.map((m) => <div>⚠ {m.text}</div>)}</div>}
    </div>
  );
}

export function TeamStrip({ team }: { team: TeamConfig }) {
  return (
    <div class="team-strip">
      {team.starters.map((id, i) => id ? (
        <div class="ts-slot"><Portrait player={PLAYER_MAP[id]} size={40} primary={team.primary} secondary={team.secondary} /><small>{SLOTS[i]}</small></div>
      ) : <div class="ts-slot empty"><small>{SLOTS[i]}</small></div>)}
    </div>
  );
}

export function fmtClock(sec: number) {
  const s = Math.max(0, sec);
  if (s < 60) return s.toFixed(1);
  const m = Math.floor(s / 60), r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, '0')}`;
}
export function periodLabel(p: number) { return p <= 4 ? `Q${p}` : p === 5 ? 'OT' : `${p - 4}OT`; }

import { useApp } from './store';
export function TopBar({ title, right, onBack }: { title: string; right?: ComponentChildren; onBack?: () => void }) {
  const { back, home } = useApp();
  return (
    <header class="topbar">
      <button class="icon-btn" aria-label="Back" data-testid="back-btn" onClick={onBack ?? back}>←</button>
      <h1 class="topbar-title">{title}</h1>
      <div class="topbar-right">
        {right}
        <button class="icon-btn" aria-label="Home" data-testid="home-btn" onClick={home}>⌂</button>
      </div>
    </header>
  );
}
