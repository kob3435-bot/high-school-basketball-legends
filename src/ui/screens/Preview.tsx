import { useState } from 'preact/hooks';
import type { TeamConfig } from '../../engine/types';
import { SLOTS } from '../../engine/types';
import { PLAYER_MAP } from '../../engine/db';
import { teamOverall } from '../../engine/Team';
import { profileLineup } from '../../engine/LineupEngine';
import { evaluateChemistry } from '../../engine/ChemistryEngine';
import { useApp, type Mode } from '../store';
import { OvrBadge, TacticsEditor, TopBar, OFF_DESC, DEF_DESC } from '../components';
import { Portrait, TeamLogo } from '../art';
import { play } from '../sound';

function Summary({ t }: { t: TeamConfig }) {
  const ps = t.starters.map((id) => PLAYER_MAP[id]);
  const prof = profileLineup(ps);
  const chem = evaluateChemistry(ps);
  return (
    <div class="tsum">
      <div class="row gap"><TeamLogo team={t} size={36} /><b>{t.name}</b> <OvrBadge v={teamOverall(t)} small /></div>
      <div class="small">Offense: <b>{t.tactics.offense}</b> — {OFF_DESC[t.tactics.offense]}</div>
      <div class="small">Defense: <b>{t.tactics.defense}</b> — {DEF_DESC[t.tactics.defense]}</div>
      <div class="small">Pace: <b>{t.tactics.pace}</b> · Chemistry {chem.score >= 0 ? '+' : ''}{chem.score} · Avg height {prof.size.toFixed(0)}cm</div>
      <div class="proscons small">{prof.pros.slice(0, 3).map((x) => <div class="good">✔ {x}</div>)}{prof.cons.slice(0, 3).map((x) => <div class="bad">✖ {x}</div>)}</div>
    </div>
  );
}

export function Preview({ mode, user, cpu, tournament }: { mode: Mode; user: TeamConfig; cpu: TeamConfig; tournament?: { round: number; idx: number } }) {
  const { nav } = useApp();
  const [me, setMe] = useState<TeamConfig>(() => ({ ...user, matchups: { ...(user.matchups ?? {}) } }));
  const setMatch = (oppId: string, defId: string) => {
    const m = { ...(me.matchups ?? {}) };
    for (const k of Object.keys(m)) if (m[k] === defId) delete m[k];
    if (defId) m[oppId] = defId; else delete m[oppId];
    setMe({ ...me, matchups: m });
  };
  const start = () => {
    play('whistle');
    nav({ name: 'live', mode, user: me, cpu, seed: Math.floor(Math.random() * 2 ** 31), tournament });
  };
  return (
    <div class="screen preview" data-testid="preview">
      <TopBar title="Match Preview" />
      <section class="panel vs-panel">
        <div class="vs-head">
          <div class="vs-team"><TeamLogo team={me} size={64} /><b>{me.name}</b></div>
          <div class="vs">VS</div>
          <div class="vs-team"><TeamLogo team={cpu} size={64} /><b>{cpu.name}</b></div>
        </div>
        <div class="matchups">
          {SLOTS.map((s, i) => {
            const a = PLAYER_MAP[me.starters[i]], b = PLAYER_MAP[cpu.starters[i]];
            return (
              <div class="mu-row" data-testid={`mu-${s}`}>
                <div class="mu-side"><Portrait player={a} size={42} primary={me.primary} secondary={me.secondary} /><span><b>{a.name}</b><small>{a.height}cm · {a.overall}</small></span></div>
                <div class="mu-pos">{s}</div>
                <div class="mu-side right"><span><b>{b.name}</b><small>{b.height}cm · {b.overall}</small></span><Portrait player={b} size={42} primary={cpu.primary} secondary={cpu.secondary} /></div>
              </div>
            );
          })}
        </div>
      </section>
      <div class="two-col">
        <section class="panel"><h3>Tactical summary</h3><Summary t={me} /><hr /><Summary t={cpu} /></section>
        <section class="panel">
          <h3>Your tactics</h3>
          <TacticsEditor t={me.tactics} onChange={(tac) => setMe({ ...me, tactics: tac })} />
          <h3>Defensive matchups</h3>
          <p class="muted small">Who guards each opponent starter (default: same slot).</p>
          <div class="mu-edit">
            {cpu.starters.map((oid, i) => (
              <label class="mu-edit-row">{SLOTS[i]} {PLAYER_MAP[oid].name} ←
                <select value={me.matchups?.[oid] ?? ''} data-testid={`matchup-${SLOTS[i]}`} onChange={(e) => setMatch(oid, (e.target as HTMLSelectElement).value)}>
                  <option value="">Auto ({PLAYER_MAP[me.starters[i]].name})</option>
                  {me.starters.map((id) => <option value={id}>{PLAYER_MAP[id].name}</option>)}
                </select>
              </label>
            ))}
          </div>
        </section>
      </div>
      <div class="cta-row sticky">
        <button class="btn big primary start-btn" onClick={start} data-testid="start-game">START GAME</button>
      </div>
    </div>
  );
}
