import { useState } from 'preact/hooks';
import type { MatchResult } from '../../engine/StatisticsEngine';
import { useApp, save, type Mode } from '../store';
import { TopBar, Confirm } from '../components';
import { TeamLogo } from '../art';

export function History() {
  const { nav, toast } = useApp();
  const [list, setList] = useState<MatchResult[]>(() => save.getHistory());
  const [confirm, setConfirm] = useState(false);
  return (
    <div class="screen history" data-testid="history">
      <TopBar title="Match History" right={list.length > 0 ? <button class="btn sm danger-outline" onClick={() => setConfirm(true)} data-testid="clear-history">Clear</button> : undefined} />
      {list.length === 0 && <section class="panel empty-state"><p>No matches played yet.</p><p class="muted">Finished games are saved here automatically with full box scores.</p></section>}
      <div class="hist-list">
        {list.map((m) => {
          const u = m.userTeam; const opp = u === null ? 1 : 1 - u;
          const wl = u === null ? null : m.winner === u ? 'W' : 'L';
          const d = new Date(m.date);
          return (
            <button class="hist-row" onClick={() => nav({ name: 'results', result: m, mode: m.mode as Mode, fromHistory: true })} data-testid={`hist-${m.id}`}>
              {wl ? <span class={'wl ' + (wl === 'W' ? 'win' : 'loss')}>{wl}</span> : <span class="wl neutral">•</span>}
              <span class="hist-teams">
                <span class="row gap"><TeamLogo team={m.teams[u ?? 0]} size={22} /><b>{m.teams[u ?? 0].name}</b> <span class="hist-score">{m.teams[u ?? 0].score}–{m.teams[opp].score}</span> <span>vs {m.teams[opp].name}</span></span>
                <small class="muted">{d.toLocaleDateString()} {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {m.mode}{m.periods > 4 ? ` · ${m.periods === 5 ? 'OT' : m.periods - 4 + 'OT'}` : ''} · POTG {m.potg.name} ({m.potg.line})</small>
              </span>
              <span aria-hidden="true">›</span>
            </button>
          );
        })}
      </div>
      {confirm && <Confirm text="Delete all match history? Player game stats will also be reset." yes="Clear history" onNo={() => setConfirm(false)} onYes={() => { save.clearHistory(); setList([]); setConfirm(false); toast('History cleared'); }} />}
    </div>
  );
}
