import { useMemo, useState } from 'preact/hooks';
import type { Player, Pos, TeamConfig, Tactics } from '../../engine/types';
import { SLOTS } from '../../engine/types';
import { PLAYERS, PLAYER_MAP, SCHOOLS } from '../../engine/db';
import { DEFAULT_TACTICS, newTeamId, teamOverall, validateTeam, autoFillBench } from '../../engine/Team';
import { slotFit } from '../../engine/Player';
import { pickStarters } from '../../engine/CPUCoachEngine';
import { createTournament } from '../../engine/Tournament';
import { RNG } from '../../engine/rng';
import { useApp, save, type Mode } from '../store';
import { LineupAnalysis, OvrBadge, PlayerCard, PlayerModal, TacticsEditor, TopBar } from '../components';
import { Portrait, TeamLogo } from '../art';
import { play } from '../sound';

export const TEAM_COLORS: [string, string][] = [
  ['#c8102e', '#111111'], ['#111111', '#c8102e'], ['#1d4ed8', '#ffffff'], ['#15803d', '#fef08a'], ['#5b21b6', '#f5f5f5'],
  ['#f59e0b', '#1f1f1f'], ['#0f766e', '#ffffff'], ['#7f1d1d', '#e5e7eb'], ['#0ea5e9', '#0c2340'], ['#ffffff', '#c8102e'],
];

export function fitLabel(p: Player, slot: Pos): { label: string; cls: string } {
  const d = slotFit(p, slot) - slotFit(p, p.pos);
  if (p.pos === slot || p.pos2 === slot) return { label: 'Natural', cls: 'fit-good' };
  if (d > -3) return { label: 'Good fit', cls: 'fit-good' };
  if (d > -9) return { label: 'Out of position', cls: 'fit-mid' };
  return { label: 'Poor fit', cls: 'fit-bad' };
}

function blankTeam(): TeamConfig {
  return { id: newTeamId('dream'), name: 'My Dream Team', short: 'MDT', primary: '#c8102e', secondary: '#111111', logoSeed: Math.floor(Math.random() * 1e6), starters: ['', '', '', '', ''], bench: [], tactics: { ...DEFAULT_TACTICS } };
}

type SortKey = 'overall' | 'three' | 'passing' | 'dreb' | 'perimeterD' | 'speed' | 'height' | 'name';

export function TeamBuilder({ mode, team }: { mode: Mode; team?: TeamConfig }) {
  const { nav, toast, root } = useApp();
  const [t, setT] = useState<TeamConfig>(() => team ? JSON.parse(JSON.stringify({ ...team, starters: [...team.starters, '', '', '', '', ''].slice(0, 5) })) : blankTeam());
  const [sel, setSel] = useState<number | null>(0); // selected starter slot
  const [q, setQ] = useState('');
  const [posF, setPosF] = useState<'' | Pos>('');
  const [school, setSchool] = useState('');
  const [sort, setSort] = useState<SortKey>('overall');
  const [detail, setDetail] = useState<Player | null>(null);
  const [tab, setTab] = useState<'pool' | 'tactics' | 'analysis'>('pool');
  const [errors, setErrors] = useState<string[]>([]);

  const used = new Set([...t.starters, ...t.bench].filter(Boolean));
  const pool = useMemo(() => {
    const qq = q.trim().toLowerCase();
    let list = PLAYERS.filter((p) => (!qq || p.name.toLowerCase().includes(qq) || p.archetype.toLowerCase().includes(qq)) && (!posF || p.pos === posF || p.pos2 === posF) && (!school || p.school === school));
    list = [...list].sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : sort === 'overall' ? b.overall - a.overall : sort === 'height' ? b.height - a.height : b.attrs[sort] - a.attrs[sort]);
    return list;
  }, [q, posF, school, sort]);

  const upd = (patch: Partial<TeamConfig>) => { setT((x) => ({ ...x, ...patch })); setErrors([]); };

  const addStarter = (id: string) => {
    play('bounce');
    const starters = [...t.starters];
    let bench = t.bench.filter((b) => b !== id);
    const prevSlot = starters.indexOf(id);
    let slot = sel ?? starters.findIndex((s) => !s);
    if (slot < 0) { toast('Starting five is full — tap a slot to replace it'); return; }
    const displaced = starters[slot];
    if (prevSlot >= 0) { starters[prevSlot] = displaced; } // swap within lineup
    else if (displaced && bench.length < 7) bench = [...bench, displaced];
    starters[slot] = id;
    upd({ starters, bench });
    const nextEmpty = starters.findIndex((s) => !s);
    setSel(nextEmpty >= 0 ? nextEmpty : null);
  };
  const addBench = (id: string) => {
    if (t.bench.includes(id)) return;
    if (t.bench.length >= 7) { toast('Bench is full (max 7)'); return; }
    play('bounce');
    upd({ starters: t.starters.map((s) => (s === id ? '' : s)), bench: [...t.bench, id] });
  };
  const removeStarter = (i: number) => { const s = [...t.starters]; s[i] = ''; upd({ starters: s }); setSel(i); };
  const removeBench = (id: string) => upd({ bench: t.bench.filter((b) => b !== id) });
  const benchToSlot = (id: string) => {
    const slot = sel ?? t.starters.findIndex((s) => !s);
    if (slot < 0 || slot === null) { toast('Tap a starter slot first'); return; }
    const starters = [...t.starters];
    const out = starters[slot];
    starters[slot] = id;
    const bench = t.bench.filter((b) => b !== id);
    if (out) bench.push(out);
    upd({ starters, bench });
  };
  const tapSlot = (i: number) => {
    if (sel !== null && sel !== i && t.starters[sel] && t.starters[i]) {
      const s = [...t.starters]; [s[sel], s[i]] = [s[i], s[sel]]; upd({ starters: s }); setSel(null); return;
    }
    setSel(sel === i ? null : i);
  };
  const autoArrange = () => {
    const ids = t.starters.filter(Boolean);
    if (ids.length < 5) { toast('Pick 5 starters first'); return; }
    const r = pickStarters(ids);
    upd({ starters: r.starters });
    toast('Players moved to their best slots');
  };
  const randomize = () => {
    const rng = new RNG(Date.now());
    const ids = rng.shuffle(PLAYERS.map((p) => p.id)).slice(0, 10);
    const r = pickStarters(ids.slice(0, 5));
    upd({ starters: r.starters, bench: ids.slice(5, 10) });
    setSel(null);
  };
  const clearAll = () => { upd({ starters: ['', '', '', '', ''], bench: [] }); setSel(0); };

  const finalize = (): TeamConfig | null => {
    let tt = { ...t, name: t.name.trim() || 'My Team' };
    tt.short = tt.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 3).toUpperCase() || 'USR';
    if (tt.starters.some((s) => !s)) { setErrors(['Pick all 5 starters (PG, SG, SF, PF, C)']); toast('Pick all 5 starters'); return null; }
    if (tt.bench.length < 5) { tt = autoFillBench(tt, 5); toast(`Bench auto-filled to ${tt.bench.length} players`); }
    const v = validateTeam(tt, { minBench: 5, maxBench: 7 });
    if (!v.ok) { setErrors(v.errors); return null; }
    setT(tt);
    return { ...tt, isCPU: false };
  };

  const next = () => {
    const tt = finalize(); if (!tt) return;
    if (mode === 'Tournament') {
      const ts = createTournament(tt, Math.floor(Math.random() * 1e9));
      save.saveTournament(ts);
      root({ name: 'tournament' });
      return;
    }
    nav({ name: 'opponent', mode, user: tt });
  };
  const saveDream = (thenPlay: boolean) => {
    const tt = finalize(); if (!tt) return;
    save.saveDreamTeam(tt);
    toast(`Saved "${tt.name}"`);
    if (thenPlay) nav({ name: 'opponent', mode: 'Dream Team', user: tt }, true);
    else root({ name: 'dream' });
  };

  const full = t.starters.every(Boolean);
  const ovr = full ? teamOverall(t) : null;

  return (
    <div class="screen builder" data-testid="team-builder">
      <TopBar title={mode === 'Dream Team' ? (team ? 'Edit Dream Team' : 'New Dream Team') : mode === 'Tournament' ? 'Tournament Team' : 'Build Your Team'} />
      <div class="builder-grid">
        <section class="panel lineup-panel">
          <div class="team-id">
            <TeamLogo team={{ ...t, short: (t.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 3) || 'T').toUpperCase() }} size={48} />
            <input class="team-name" value={t.name} maxLength={28} aria-label="Team name" data-testid="team-name" onInput={(e) => upd({ name: (e.target as HTMLInputElement).value })} />
            {ovr !== null && <span class="row gap">OVR <OvrBadge v={ovr} /></span>}
          </div>
          <div class="colors" role="group" aria-label="Team colors">
            {TEAM_COLORS.map(([a, b]) => <button class={'swatch' + (t.primary === a && t.secondary === b ? ' on' : '')} style={{ background: `linear-gradient(135deg, ${a} 50%, ${b} 50%)` }} aria-label={`Colors ${a} ${b}`} onClick={() => upd({ primary: a, secondary: b })} />)}
          </div>
          <h3>Starting Five <small class="muted">tap a slot, then pick a player</small></h3>
          <div class="slots">
            {SLOTS.map((slot, i) => {
              const p = t.starters[i] ? PLAYER_MAP[t.starters[i]] : null;
              const fit = p ? fitLabel(p, slot) : null;
              return (
                <div class={'slot' + (sel === i ? ' active' : '') + (p ? '' : ' empty')} data-testid={`slot-${slot}`}>
                  <button class="slot-main" onClick={() => tapSlot(i)} aria-label={`${slot} slot${p ? ': ' + p.name : ' (empty)'}`}>
                    <span class="slot-pos">{slot}</span>
                    {p ? <Portrait player={p} size={46} primary={t.primary} secondary={t.secondary} /> : <span class="slot-plus">+</span>}
                    <span class="slot-info">
                      {p ? <><b>{p.name}</b><small>{p.pos}{p.pos2 ? '/' + p.pos2 : ''} · {p.height}cm · <span class={fit!.cls}>{fit!.label}</span></small></> : <small class="muted">{sel === i ? 'Choose a player below' : 'Empty'}</small>}
                    </span>
                    {p && <OvrBadge v={p.overall} small />}
                  </button>
                  {p && <button class="icon-btn sm" aria-label={`Remove ${p.name}`} data-testid={`slot-remove-${slot}`} onClick={() => removeStarter(i)}>✕</button>}
                </div>
              );
            })}
          </div>
          <h3>Bench <small class="muted">{t.bench.length}/7 (5–7)</small></h3>
          <div class="bench" data-testid="bench-list">
            {t.bench.length === 0 && <p class="muted small">Add 5–7 bench players with the "Bench" buttons. Quick Match auto-fills the bench if you skip this.</p>}
            {t.bench.map((id) => { const p = PLAYER_MAP[id]; return (
              <div class="bench-item" data-testid={`bench-${id}`}>
                <button class="bench-main" onClick={() => setDetail(p)}><Portrait player={p} size={34} primary={t.primary} secondary={t.secondary} /><span>{p.name}<small> {p.pos} · {p.overall}</small></span></button>
                <button class="btn xs" onClick={() => benchToSlot(id)} aria-label={`Move ${p.name} to starting slot`}>↑ Start</button>
                <button class="icon-btn sm" onClick={() => removeBench(id)} aria-label={`Remove ${p.name} from bench`}>✕</button>
              </div>
            ); })}
          </div>
          <div class="row gap wrap tools">
            <button class="btn sm" onClick={autoArrange} data-testid="auto-arrange">Best positions</button>
            <button class="btn sm" onClick={() => { upd(autoFillBench(t, 7)); }} data-testid="autofill-bench">Auto-fill bench</button>
            <button class="btn sm" onClick={randomize} data-testid="randomize-team">Randomize</button>
            <button class="btn sm" onClick={clearAll} data-testid="clear-team">Clear</button>
          </div>
          {errors.length > 0 && <div class="errors" role="alert">{errors.map((e) => <div>{e}</div>)}</div>}
          <div class="cta-row">
            {mode === 'Dream Team' ? (<>
              <button class="btn big" onClick={() => saveDream(false)} data-testid="save-dream">Save Team</button>
              <button class="btn big primary" onClick={() => saveDream(true)} data-testid="save-play">Save & Play</button>
            </>) : (
              <button class="btn big primary" onClick={next} data-testid="builder-next" disabled={!full}>{mode === 'Tournament' ? 'Enter Tournament →' : 'Next: Find Opponent →'}</button>
            )}
          </div>
        </section>

        <section class="panel side-panel">
          <div class="tabs" role="tablist">
            <button role="tab" class={tab === 'pool' ? 'on' : ''} onClick={() => setTab('pool')} data-testid="tab-pool">Players</button>
            <button role="tab" class={tab === 'tactics' ? 'on' : ''} onClick={() => setTab('tactics')} data-testid="tab-tactics">Tactics</button>
            <button role="tab" class={tab === 'analysis' ? 'on' : ''} onClick={() => setTab('analysis')} data-testid="tab-analysis">Chemistry</button>
          </div>
          {tab === 'pool' && (
            <div>
              <div class="filters">
                <input type="search" placeholder="Search name or archetype…" value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} aria-label="Search players" data-testid="pool-search" />
                <select value={posF} onChange={(e) => setPosF((e.target as HTMLSelectElement).value as Pos | '')} aria-label="Position filter"><option value="">All pos</option>{SLOTS.map((s) => <option value={s}>{s}</option>)}</select>
                <select value={school} onChange={(e) => setSchool((e.target as HTMLSelectElement).value)} aria-label="School filter"><option value="">All schools</option>{SCHOOLS.map((s) => <option value={s.id}>{s.name}</option>)}</select>
                <select value={sort} onChange={(e) => setSort((e.target as HTMLSelectElement).value as SortKey)} aria-label="Sort"><option value="overall">Overall</option><option value="three">3PT</option><option value="passing">Passing</option><option value="dreb">Rebound</option><option value="perimeterD">Defense</option><option value="speed">Speed</option><option value="height">Height</option><option value="name">Name</option></select>
              </div>
              <div class="pool" data-testid="player-pool">
                {pool.map((p) => {
                  const inStart = t.starters.includes(p.id), inBench = t.bench.includes(p.id);
                  return (
                    <PlayerCard p={p} compact onClick={() => setDetail(p)} selected={used.has(p.id)} badge={inStart ? SLOTS[t.starters.indexOf(p.id)] : inBench ? 'BENCH' : undefined}
                      actions={<>
                        <button class="btn xs primary" disabled={inStart} data-testid={`start-${p.id}`} onClick={() => addStarter(p.id)}>{sel !== null ? `→ ${SLOTS[sel]}` : 'Start'}</button>
                        <button class="btn xs" disabled={inBench} data-testid={`benchadd-${p.id}`} onClick={() => addBench(p.id)}>Bench</button>
                      </>} />
                  );
                })}
                {pool.length === 0 && <p class="muted">No players match your filters.</p>}
              </div>
            </div>
          )}
          {tab === 'tactics' && <TacticsEditor t={t.tactics} onChange={(tac: Tactics) => upd({ tactics: tac })} />}
          {tab === 'analysis' && <LineupAnalysis ids={t.starters.map((s) => s || null)} />}
        </section>
      </div>
      {detail && <PlayerModal p={detail} list={pool} onClose={() => setDetail(null)} />}
    </div>
  );
}
