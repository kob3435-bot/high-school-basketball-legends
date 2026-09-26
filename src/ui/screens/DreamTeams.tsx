import { useState } from 'preact/hooks';
import type { TeamConfig } from '../../engine/types';
import { SLOTS } from '../../engine/types';
import { PLAYER_MAP } from '../../engine/db';
import { newTeamId, teamOverall, cloneTeam } from '../../engine/Team';
import { useApp, save } from '../store';
import { TopBar, Confirm, OvrBadge, TeamStrip } from '../components';
import { TeamLogo } from '../art';

export function DreamTeams() {
  const { nav, toast } = useApp();
  const [list, setList] = useState<TeamConfig[]>(() => save.getDreamTeams());
  const [del, setDel] = useState<TeamConfig | null>(null);
  const dup = (t: TeamConfig) => { const c = cloneTeam(t); c.id = newTeamId('dream'); c.name = (t.name + ' copy').slice(0, 28); setList(save.saveDreamTeam(c)); toast(`Duplicated "${t.name}"`); };
  return (
    <div class="screen dream" data-testid="dream-teams">
      <TopBar title="Dream Teams" />
      <div class="cta-row left"><button class="btn big primary" onClick={() => nav({ name: 'builder', mode: 'Dream Team' })} data-testid="new-dream">+ Create New Team</button></div>
      {list.length === 0 && <section class="panel empty-state"><p>No saved teams yet.</p><p class="muted">Create a team: choose a starting five, a 5–7 man bench and your tactics. Saved teams stay after refresh.</p></section>}
      <div class="team-list">
        {list.map((t) => (
          <section class="panel team-card" data-testid={`dream-${t.id}`}>
            <div class="team-id">
              <TeamLogo team={t} size={48} />
              <div><h3 class="m0 dream-name">{t.name}</h3><small class="muted">{t.tactics.offense} · {t.tactics.defense} · {t.tactics.pace} · bench {t.bench.length}</small></div>
              <span class="row gap">OVR <OvrBadge v={teamOverall(t)} /></span>
            </div>
            <TeamStrip team={t} />
            <div class="small muted">{t.starters.map((id, i) => `${SLOTS[i]} ${PLAYER_MAP[id]?.name ?? '?'}`).join(' · ')}</div>
            <div class="row gap wrap">
              <button class="btn primary" onClick={() => nav({ name: 'opponent', mode: 'Dream Team', user: { ...t, isCPU: false } })} data-testid="dream-play">Play</button>
              <button class="btn" onClick={() => nav({ name: 'builder', mode: 'Dream Team', team: t })} data-testid="dream-edit">Edit</button>
              <button class="btn" onClick={() => dup(t)} data-testid="dream-dup">Duplicate</button>
              <button class="btn danger-outline" onClick={() => setDel(t)} data-testid="dream-delete">Delete</button>
            </div>
          </section>
        ))}
      </div>
      {del && <Confirm text={`Delete "${del.name}"? This cannot be undone.`} yes="Delete" onNo={() => setDel(null)} onYes={() => { setList(save.deleteDreamTeam(del.id)); toast(`Deleted "${del.name}"`); setDel(null); }} />}
    </div>
  );
}
