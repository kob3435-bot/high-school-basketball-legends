import { useEffect, useState } from 'preact/hooks';
import type { TeamConfig } from '../../engine/types';
import { generateTeam } from '../../engine/CPUCoachEngine';
import { simulateMatch } from '../../engine/Match';
import type { MatchResult } from '../../engine/StatisticsEngine';
import { teamOverall } from '../../engine/Team';
import { useApp, save } from '../store';
import { TopBar, OvrBadge, TeamStrip, periodLabel } from '../components';
import { TeamLogo } from '../art';
import { BoxTable } from './Results';
import { play } from '../sound';

interface Battle { a: TeamConfig; b: TeamConfig; seed: number; result: MatchResult; }

function roll(): Battle {
  const s1 = Math.floor(Math.random() * 1e9), s2 = Math.floor(Math.random() * 1e9);
  const a = generateTeam(s1);
  const b = generateTeam(s2, { exclude: [...a.starters, ...a.bench] });
  if (b.name === a.name) b.name = b.name + ' II';
  const seed = Math.floor(Math.random() * 2 ** 31);
  const sim = simulateMatch(a, b, seed, { userTeam: null, mode: 'Random Battle' });
  const result = sim.result();
  save.addHistory(result);
  return { a, b, seed, result };
}

export function RandomBattle() {
  const { nav } = useApp();
  const [b, setB] = useState<Battle | null>(null);
  const [tab, setTab] = useState<0 | 1>(0);
  useEffect(() => { setB(roll()); play('buzzer'); }, []);
  if (!b) return <div class="screen"><TopBar title="Random Battle" /><p class="panel">Simulating…</p></div>;
  const r = b.result;
  return (
    <div class="screen random" data-testid="random-battle">
      <TopBar title="Random Battle" />
      <section class="panel">
        <div class="final-score big">
          <span class="rs-team"><TeamLogo team={b.a} size={52} /><b>{b.a.name}</b><small class="muted">{b.a.template}</small><OvrBadge v={teamOverall(b.a)} small /></span>
          <strong data-testid="random-score">{r.teams[0].score} – {r.teams[1].score}</strong>
          <span class="rs-team"><TeamLogo team={b.b} size={52} /><b>{b.b.name}</b><small class="muted">{b.b.template}</small><OvrBadge v={teamOverall(b.b)} small /></span>
        </div>
        <div class="final-result">{r.teams[r.winner].name} win{r.periods > 4 ? ` in ${r.periods === 5 ? 'OT' : r.periods - 4 + 'OT'}` : ''}</div>
        <table class="periods"><thead><tr><th></th>{r.teams[0].periodScores.map((_, i) => <th>{periodLabel(i + 1)}</th>)}<th>T</th></tr></thead>
          <tbody>{r.teams.map((t) => <tr><td><b>{t.short}</b></td>{t.periodScores.map((s) => <td>{s}</td>)}<td><b>{t.score}</b></td></tr>)}</tbody></table>
        <p>Player of the Game: <b>{r.potg.name}</b> — {r.potg.line}</p>
        <div class="two-col"><TeamStrip team={b.a} /><TeamStrip team={b.b} /></div>
        <div class="row gap wrap">
          <button class="btn primary" onClick={() => { setB(roll()); play('buzzer'); }} data-testid="reroll">🎲 Re-roll</button>
          <button class="btn" onClick={() => nav({ name: 'live', mode: 'Random Battle', user: null, home: b.a, cpu: b.b, seed: b.seed, spectate: true })} data-testid="watch-live">Watch Live (same game)</button>
          <button class="btn" onClick={() => nav({ name: 'results', result: r, mode: 'Random Battle', fromHistory: true })} data-testid="random-report">Full Report & Analysis</button>
        </div>
      </section>
      <section class="panel">
        <div class="tabs">
          <button class={tab === 0 ? 'on' : ''} onClick={() => setTab(0)}>{b.a.name}</button>
          <button class={tab === 1 ? 'on' : ''} onClick={() => setTab(1)}>{b.b.name}</button>
        </div>
        <BoxTable rows={r.box[tab]} totals={r.totals[tab]} />
      </section>
    </div>
  );
}
