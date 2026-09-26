import { useState } from 'preact/hooks';
import type { BoxRow, TeamTotals, MatchResult } from '../../engine/StatisticsEngine';
import { PLAYER_MAP } from '../../engine/db';
import { useApp, type Mode } from '../store';
import { TopBar, PlayerModal, periodLabel } from '../components';
import { TeamLogo, Portrait } from '../art';
import type { TeamConfig, Player } from '../../engine/types';
import { dist } from '../kit';

const f = (m: number, a: number) => `${m}/${a}`;

export function BoxTable({ rows, totals, compact, onPlayer }: { rows: BoxRow[]; totals?: TeamTotals; compact?: boolean; onPlayer?: (id: string) => void }) {
  const sorted = [...rows].sort((a, b) => (a.starter === b.starter ? b.sec - a.sec : a.starter ? -1 : 1));
  return (
    <div class="table-scroll" tabIndex={0}>
      <table class={'box' + (compact ? ' compact' : '')} data-testid="box-table">
        <thead><tr>
          <th class="sticky-col">Player</th><th>MIN</th><th>PTS</th><th>REB</th><th>OREB</th><th>DREB</th><th>AST</th><th>STL</th><th>BLK</th><th>TO</th><th>PF</th>
          <th>FGM/A</th><th>FG%</th><th>3PM/A</th><th>3P%</th><th>FTM/A</th><th>FT%</th><th>+/-</th>
        </tr></thead>
        <tbody>
          {sorted.map((r) => (
            <tr class={(r.starter ? 'starter' : '') + (r.sec === 0 ? ' dnp' : '')}>
              <td class="sticky-col">{onPlayer ? <button class="linkish" onClick={() => onPlayer(r.id)}>{r.name}</button> : r.name} <small class="muted">{r.starter ? r.pos : ''}{r.fouledOut ? ' FO' : ''}</small></td>
              {r.sec === 0 ? <td colSpan={17} class="muted">DNP — Coach's decision</td> : (<>
                <td>{r.min}</td><td><b>{r.pts}</b></td><td>{r.reb}</td><td>{r.oreb}</td><td>{r.dreb}</td><td>{r.ast}</td><td>{r.stl}</td><td>{r.blk}</td><td>{r.tov}</td><td>{r.pf}</td>
                <td>{f(r.fgm, r.fga)}</td><td>{r.fga ? r.fgPct.toFixed(1) : '-'}</td><td>{f(r.tpm, r.tpa)}</td><td>{r.tpa ? r.tpPct.toFixed(1) : '-'}</td><td>{f(r.ftm, r.fta)}</td><td>{r.fta ? r.ftPct.toFixed(1) : '-'}</td>
                <td class={r.pm > 0 ? 'pos' : r.pm < 0 ? 'neg' : ''}>{r.pm > 0 ? '+' : ''}{r.pm}</td></>)}
            </tr>
          ))}
          {totals && (
            <tr class="totals"><td class="sticky-col">TOTAL</td><td>200</td><td><b>{totals.pts}</b></td><td>{totals.reb}</td><td>{totals.oreb}</td><td>{totals.dreb}</td><td>{totals.ast}</td><td>{totals.stl}</td><td>{totals.blk}</td><td>{totals.tov}</td><td>{totals.pf}</td>
              <td>{f(totals.fgm, totals.fga)}</td><td>{totals.fgPct.toFixed(1)}</td><td>{f(totals.tpm, totals.tpa)}</td><td>{totals.tpPct.toFixed(1)}</td><td>{f(totals.ftm, totals.fta)}</td><td>{totals.ftPct.toFixed(1)}</td><td></td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function FlowChart({ r }: { r: MatchResult }) {
  const W = 600, H = 200, pad = 26;
  const flow = r.flow.length ? r.flow : [{ t: 0, s: [0, 0] as [number, number] }];
  const tMax = Math.max(2400, ...flow.map((p) => p.t));
  const sMax = Math.max(10, ...flow.map((p) => Math.max(p.s[0], p.s[1])));
  const x = (t: number) => pad + (t / tMax) * (W - pad * 2);
  const y = (s: number) => H - pad - (s / sMax) * (H - pad * 2);
  const path = (i: 0 | 1) => {
    let d = `M${x(0)},${y(0)}`; let prev = 0;
    for (const p of flow) { d += ` L${x(p.t)},${y(prev)} L${x(p.t)},${y(p.s[i])}`; prev = p.s[i]; }
    return d;
  };
  const light = (c: string) => dist(c, '#ffffff') < 60;
  const c0 = light(r.teams[0].primary) ? r.teams[0].secondary : r.teams[0].primary;
  let c1 = light(r.teams[1].primary) ? r.teams[1].secondary : r.teams[1].primary;
  if (dist(c0, c1) < 120) c1 = '#111111';
  const marks = [600, 1200, 1800, 2400, ...Array.from({ length: Math.max(0, r.periods - 4) }, (_, i) => 2400 + 300 * (i + 1))];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} class="flow" role="img" aria-label="Score progression chart" data-testid="flow-chart">
      <rect x={pad} y={pad} width={W - pad * 2} height={H - pad * 2} fill="#fafafa" stroke="#ddd" />
      {marks.map((m, i) => <g><line x1={x(m)} x2={x(m)} y1={pad} y2={H - pad} stroke="#e2e2e2" /><text x={x(m) - 4} y={H - 8} font-size="10" text-anchor="end" fill="#777">{periodLabel(i + 1)}</text></g>)}
      {[0, 0.5, 1].map((k) => <text x={pad - 4} y={y(sMax * k) + 3} font-size="10" text-anchor="end" fill="#777">{Math.round(sMax * k)}</text>)}
      <path d={path(0)} fill="none" stroke={c0} stroke-width="2.5" />
      <path d={path(1)} fill="none" stroke={c1} stroke-width="2.5" stroke-dasharray="5 3" />
    </svg>
  );
}

export function Results({ result: r, mode, rematch, tournament, fromHistory }: { result: MatchResult; mode: Mode; rematch?: { user: TeamConfig; cpu: TeamConfig }; tournament?: boolean; fromHistory?: boolean }) {
  const { nav, home, root } = useApp();
  const [tab, setTab] = useState<0 | 1>(r.userTeam ?? 0);
  const [detail, setDetail] = useState<Player | null>(null);
  const a = r.analysis;
  const T = r.totals;
  const U = r.userTeam;
  const stat = (label: string, k: keyof TeamTotals, pct = false) => (
    <tr><td>{T[0][k]}{pct ? '%' : ''}</td><th>{label}</th><td>{T[1][k]}{pct ? '%' : ''}</td></tr>
  );
  const date = new Date(r.date);
  return (
    <div class="screen results" data-testid="results">
      <TopBar title={fromHistory ? 'Match Report' : 'Final Result'} />
      <section class="panel result-head">
        <div class="kicker">{r.mode} · {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        <div class="final-score big">
          <span class="rs-team"><TeamLogo team={r.teams[0]} size={52} /><b>{r.teams[0].name}</b></span>
          <strong data-testid="result-score">{r.teams[0].score} – {r.teams[1].score}</strong>
          <span class="rs-team"><TeamLogo team={r.teams[1]} size={52} /><b>{r.teams[1].name}</b></span>
        </div>
        {U !== null && <div class={'final-result ' + (r.winner === U ? 'win' : 'loss')} data-testid="result-wl">{r.winner === U ? 'WIN' : 'LOSS'}{r.periods > 4 ? ` (${r.periods === 5 ? 'OT' : r.periods - 4 + 'OT'})` : ''}</div>}
        <table class="periods"><thead><tr><th></th>{r.teams[0].periodScores.map((_, i) => <th>{periodLabel(i + 1)}</th>)}<th>T</th></tr></thead>
          <tbody>{r.teams.map((t) => <tr><td><b>{t.short}</b></td>{t.periodScores.map((s) => <td>{s}</td>)}<td><b>{t.score}</b></td></tr>)}</tbody></table>
        <div class="potg-card" data-testid="potg">
          {PLAYER_MAP[r.potg.id] && <Portrait player={PLAYER_MAP[r.potg.id]} size={64} primary={r.teams[r.potg.team].primary} secondary={r.teams[r.potg.team].secondary} />}
          <div><div class="kicker">Player of the Game</div><b>{r.potg.name}</b> <small class="muted">({r.teams[r.potg.team].short})</small><div>{r.potg.line}</div></div>
        </div>
      </section>

      <section class="panel" data-testid="analysis">
        <h3>Match analysis</h3>
        <div class="analysis-grid">
          <div><h5>Key player</h5><p>{a.keyPlayer}</p></div>
          <div><h5>Turning point</h5><p>{a.turningPoint}</p></div>
          <div><h5>Biggest run</h5><p>{a.biggestRun}</p></div>
          <div><h5>Key matchup</h5><p>{a.keyMatchup}</p></div>
          <div><h5>Best lineup</h5><p>{a.bestLineup.join(' · ') || '—'}</p></div>
          <div><h5>Best tactic</h5><p>{a.bestTactic.join(' · ') || '—'}</p></div>
        </div>
        {a.notes.length > 0 && <ul class="notes">{a.notes.map((n) => <li>{n}</li>)}</ul>}
      </section>

      <section class="panel">
        <h3>Score progression</h3>
        <div class="legend"><span style={{ color: r.teams[0].primary }}>━ {r.teams[0].short}</span> <span style={{ color: r.teams[1].primary }}>╍ {r.teams[1].short}</span></div>
        <FlowChart r={r} />
        <div class="row gap wrap small">
          <span class="stat-pill">Lead changes: <b data-testid="lead-changes">{a.leadChanges}</b></span>
          <span class="stat-pill">Ties: <b>{a.ties}</b></span>
          <span class="stat-pill">Largest lead: {r.teams[0].short} {a.largestLead[0]} / {r.teams[1].short} {a.largestLead[1]}</span>
          <span class="stat-pill">Biggest run: {T[0].biggestRun >= T[1].biggestRun ? `${r.teams[0].short} ${T[0].biggestRun}-0` : `${r.teams[1].short} ${T[1].biggestRun}-0`}</span>
        </div>
      </section>

      <section class="panel">
        <h3>Team stats</h3>
        <table class="team-stats" data-testid="team-stats">
          <thead><tr><th>{r.teams[0].short}</th><th></th><th>{r.teams[1].short}</th></tr></thead>
          <tbody>
            <tr><td>{T[0].fgm}/{T[0].fga}</td><th>FG</th><td>{T[1].fgm}/{T[1].fga}</td></tr>
            {stat('FG%', 'fgPct', true)}
            <tr><td>{T[0].tpm}/{T[0].tpa}</td><th>3PT</th><td>{T[1].tpm}/{T[1].tpa}</td></tr>
            {stat('3PT%', 'tpPct', true)}
            <tr><td>{T[0].ftm}/{T[0].fta}</td><th>FT</th><td>{T[1].ftm}/{T[1].fta}</td></tr>
            {stat('FT%', 'ftPct', true)}
            {stat('Rebounds', 'reb')}{stat('Off. rebounds', 'oreb')}{stat('Assists', 'ast')}{stat('Steals', 'stl')}{stat('Blocks', 'blk')}{stat('Turnovers', 'tov')}{stat('Fouls', 'pf')}
            {stat('Fast break pts', 'fbPts')}{stat('Points in paint', 'paintPts')}{stat('Second-chance pts', 'secondPts')}{stat('Pts off turnovers', 'ptsOffTO')}{stat('Bench pts', 'benchPts')}{stat('Possessions', 'possessions')}
          </tbody>
        </table>
      </section>

      <section class="panel">
        <h3>Box score</h3>
        <div class="tabs">
          <button class={tab === 0 ? 'on' : ''} onClick={() => setTab(0)} data-testid="box-tab-0">{r.teams[0].name}</button>
          <button class={tab === 1 ? 'on' : ''} onClick={() => setTab(1)} data-testid="box-tab-1">{r.teams[1].name}</button>
        </div>
        <BoxTable rows={r.box[tab]} totals={T[tab]} onPlayer={(id) => PLAYER_MAP[id] && setDetail(PLAYER_MAP[id])} />
      </section>

      <div class="cta-row wrap">
        {rematch && !tournament && <button class="btn big primary" data-testid="play-again" onClick={() => nav({ name: 'preview', mode, user: rematch.user, cpu: rematch.cpu }, true)}>Play Again (rematch)</button>}
        {rematch && !tournament && <button class="btn big" data-testid="new-opponent" onClick={() => nav({ name: 'opponent', mode, user: rematch.user }, true)}>New Opponent</button>}
        {rematch && !tournament && <button class="btn big" data-testid="new-team" onClick={() => nav({ name: 'builder', mode: mode === 'Dream Team' ? 'Dream Team' : 'Quick Match', team: mode === 'Dream Team' ? rematch.user : undefined }, true)}>{mode === 'Dream Team' ? 'Edit Team' : 'Build New Team'}</button>}
        {tournament && <button class="btn big primary" data-testid="back-tournament" onClick={() => root({ name: 'tournament' })}>Back to Bracket</button>}
        {mode === 'Random Battle' && !fromHistory && <button class="btn big primary" onClick={() => nav({ name: 'random' }, true)}>New Random Battle</button>}
        <button class="btn big" data-testid="results-home" onClick={home}>Home</button>
      </div>
      {detail && <PlayerModal p={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
