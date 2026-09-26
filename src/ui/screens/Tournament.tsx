import { useState } from 'preact/hooks';
import type { TeamConfig } from '../../engine/types';
import { createTournament, userMatchIndex, userEliminated, simulateCpuGames, roundComplete, advance, recordResult, ROUND_NAMES, type TournamentState } from '../../engine/Tournament';
import { simulateMatch } from '../../engine/Match';
import { playerOfGame } from '../../engine/StatisticsEngine';
import { teamOverall } from '../../engine/Team';
import { useApp, save } from '../store';
import { TopBar, Confirm, OvrBadge } from '../components';
import { TeamLogo } from '../art';
import { play } from '../sound';

export function TournamentScreen() {
  const { nav, toast } = useApp();
  const [ts, setTs] = useState<TournamentState | null>(() => save.getTournament());
  const [confirmNew, setConfirmNew] = useState(false);
  const dreams = save.getDreamTeams();
  const [pick, setPick] = useState(dreams[0]?.id ?? '');
  const upd = (t: TournamentState) => { save.saveTournament(t); setTs(JSON.parse(JSON.stringify(t))); };

  const start = (team: TeamConfig | null) => {
    const t = createTournament(team ? { ...team, isCPU: false } : null, Math.floor(Math.random() * 1e9));
    upd(t); play('whistle');
  };

  if (!ts || confirmNew) {
    return (
      <div class="screen tournament" data-testid="tournament-setup">
        <TopBar title="Tournament" onBack={confirmNew ? () => setConfirmNew(false) : undefined} />
        <section class="panel">
          <h2 class="m0">16-Team Knockout</h2>
          <p class="muted">Round of 16 → Quarterfinals → Semifinals → Final. Lose once and you're out. CPU vs CPU games are fully simulated possession by possession.</p>
          <h3>Enter with a Dream Team</h3>
          {dreams.length ? (
            <div class="row gap wrap">
              <select value={pick} onChange={(e) => setPick((e.target as HTMLSelectElement).value)} data-testid="tour-dream-select" aria-label="Dream team">
                {dreams.map((d) => <option value={d.id}>{d.name} (OVR {teamOverall(d)})</option>)}
              </select>
              <button class="btn primary" data-testid="tour-start-dream" onClick={() => { const d = dreams.find((x) => x.id === pick); if (d) { setConfirmNew(false); start(d); } }}>Enter Tournament</button>
            </div>
          ) : <p class="muted small">You have no saved dream teams yet.</p>}
          <h3>Or</h3>
          <div class="row gap wrap">
            <button class="btn" data-testid="tour-build" onClick={() => { setConfirmNew(false); nav({ name: 'builder', mode: 'Tournament' }); }}>Build a Team for This Tournament</button>
            <button class="btn" data-testid="tour-spectate" onClick={() => { setConfirmNew(false); start(null); }}>Spectate (16 CPU teams)</button>
          </div>
        </section>
      </div>
    );
  }

  const ui = userMatchIndex(ts);
  const elim = userEliminated(ts);
  const rc = roundComplete(ts);
  const round = ts.rounds[ts.round];
  const T = (i: number | null) => (i === null ? null : ts.teams[i]);

  const playMine = (live: boolean) => {
    const m = round[ui]; if (!m || m.a === null || m.b === null) return;
    const userIsA = m.a === ts.userIdx;
    const user = ts.teams[ts.userIdx!]; const opp = ts.teams[userIsA ? m.b : m.a];
    if (live) { nav({ name: 'preview', mode: 'Tournament', user: { ...user, isCPU: false }, cpu: { ...opp, isCPU: true }, tournament: { round: ts.round, idx: ui } }); return; }
    const sim = simulateMatch({ ...user, isCPU: false }, { ...opp, isCPU: true }, Math.floor(Math.random() * 1e9), { userTeam: 0, mode: 'Tournament' });
    const res = sim.result();
    save.addHistory(res);
    const sc: [number, number] = userIsA ? [res.teams[0].score, res.teams[1].score] : [res.teams[1].score, res.teams[0].score];
    recordResult(ts, ts.round, ui, sc, `${res.potg.name} (${res.potg.line})`, res.id, sim.st.overtimes);
    upd(ts);
    toast(`${res.winner === 0 ? 'WIN' : 'LOSS'} ${res.teams[0].score}-${res.teams[1].score}`);
  };
  const simRound = () => {
    simulateCpuGames(ts, elim || ts.userIdx === null);
    upd(ts);
  };
  const next = () => {
    const champ = advance(ts);
    upd(ts);
    if (champ) { play('cheer'); toast(`${ts.teams[ts.champion!].name} are the champions!`); }
  };
  const simAll = () => {
    let guard = 0;
    while (ts.champion === null && guard++ < 10) {
      if (userMatchIndex(ts) >= 0) break;
      simulateCpuGames(ts, true); advance(ts);
    }
    upd(ts);
  };
  const openResult = (id?: string) => { if (!id) return; const r = save.getHistoryItem(id); if (r) nav({ name: 'results', result: r, mode: 'Tournament', fromHistory: true }); };

  const champion = ts.champion !== null ? ts.teams[ts.champion] : null;
  return (
    <div class="screen tournament" data-testid="tournament">
      <TopBar title={ts.name} />
      <section class="panel tour-status">
        {champion ? (
          <div class="champion" data-testid="champion">🏆 <b>{champion.name}</b> are the {ts.name} champions!{ts.userIdx !== null && ts.champion === ts.userIdx ? ' Congratulations, Coach!' : ''}</div>
        ) : (
          <div><b>{ROUND_NAMES[ts.round]}</b> · {ts.userIdx === null ? 'Spectator mode' : elim ? 'Your team has been eliminated — the tournament continues.' : ui >= 0 ? 'Your game is up next.' : 'Waiting for other games.'}</div>
        )}
        <div class="row gap wrap">
          {!champion && ui >= 0 && <>
            <button class="btn primary" onClick={() => playMine(true)} data-testid="tour-play-live">Play My Game (Live)</button>
            <button class="btn" onClick={() => playMine(false)} data-testid="tour-sim-mine">Quick Sim My Game</button>
          </>}
          {!champion && !rc && <button class="btn" onClick={simRound} data-testid="tour-sim-round">{ui >= 0 ? 'Sim Other Games' : 'Sim Round'}</button>}
          {!champion && rc && <button class="btn primary" onClick={next} data-testid="tour-advance">{ts.round === 3 ? 'Crown Champion' : `Advance to ${ROUND_NAMES[ts.round + 1]}`}</button>}
          {!champion && (ts.userIdx === null || elim) && <button class="btn" onClick={simAll} data-testid="tour-sim-all">Sim to Champion</button>}
          <button class="btn danger-outline" onClick={() => setConfirmNew(true)} data-testid="tour-new">New Tournament</button>
        </div>
      </section>
      <div class="bracket" data-testid="bracket">
        {ts.rounds.map((r, ri) => (
          <div class={'b-round' + (ri === ts.round && !champion ? ' current' : '')}>
            <h4>{ROUND_NAMES[ri]}</h4>
            {r.map((m, mi) => {
              const a = T(m.a), b = T(m.b);
              const mine = ts.userIdx !== null && (m.a === ts.userIdx || m.b === ts.userIdx);
              return (
                <button class={'b-match' + (mine ? ' mine' : '') + (m.resultId ? ' clickable' : '')} onClick={() => openResult(m.resultId)} disabled={!m.resultId} data-testid={`bm-${ri}-${mi}`} aria-label={`${a?.name ?? 'TBD'} vs ${b?.name ?? 'TBD'}`}>
                  {[a, b].map((t, k) => (
                    <div class={'b-team' + (m.winner !== null && m.winner === (k === 0 ? m.a : m.b) ? ' win' : m.winner !== null ? ' lose' : '')}>
                      {t ? <><TeamLogo team={t} size={20} /><span class="b-name">{t.name}{(k === 0 ? m.a : m.b) === ts.userIdx ? ' ★' : ''}</span><OvrBadge v={teamOverall(t)} small /></> : <span class="muted">TBD</span>}
                      <span class="b-score">{m.score ? m.score[k] : ''}</span>
                    </div>
                  ))}
                  {m.potg && <div class="b-potg">{m.ot ? `${m.ot === 1 ? 'OT' : m.ot + 'OT'} · ` : ''}POTG {m.potg}</div>}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
