import { useMemo, useState } from 'preact/hooks';
import type { Player, Pos } from '../../engine/types';
import { SLOTS, ARCHETYPES } from '../../engine/types';
import { PLAYERS, SCHOOLS } from '../../engine/db';
import { TopBar, PlayerCard, PlayerModal } from '../components';

type SortKey = 'overall' | 'three' | 'passing' | 'rebound' | 'defense' | 'speed' | 'height' | 'name';
const val = (p: Player, k: SortKey): number => {
  switch (k) {
    case 'overall': return p.overall;
    case 'three': return p.attrs.three;
    case 'passing': return p.attrs.passing;
    case 'rebound': return (p.attrs.dreb + p.attrs.oreb) / 2;
    case 'defense': return (p.attrs.perimeterD + p.attrs.interiorD + p.attrs.helpD) / 3;
    case 'speed': return p.attrs.speed;
    case 'height': return p.height;
    default: return 0;
  }
};

export function PlayerDB() {
  const [q, setQ] = useState('');
  const [school, setSchool] = useState('');
  const [pos, setPos] = useState<'' | Pos>('');
  const [arch, setArch] = useState('');
  const [minH, setMinH] = useState(0);
  const [minO, setMinO] = useState(0);
  const [sort, setSort] = useState<SortKey>('overall');
  const [asc, setAsc] = useState(false);
  const [detail, setDetail] = useState<Player | null>(null);
  const list = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const l = PLAYERS.filter((p) => (!qq || p.name.toLowerCase().includes(qq)) && (!school || p.school === school) && (!pos || p.pos === pos || p.pos2 === pos) && (!arch || p.archetype === arch) && p.height >= minH && p.overall >= minO);
    l.sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : val(b, sort) - val(a, sort) || b.overall - a.overall);
    if (asc) l.reverse();
    return l;
  }, [q, school, pos, arch, minH, minO, sort, asc]);
  const reset = () => { setQ(''); setSchool(''); setPos(''); setArch(''); setMinH(0); setMinO(0); setSort('overall'); setAsc(false); };
  return (
    <div class="screen db" data-testid="player-db">
      <TopBar title="Player Database" />
      <section class="panel filters db-filters">
        <input type="search" placeholder="Search players…" value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} aria-label="Search players" data-testid="db-search" />
        <select value={school} onChange={(e) => setSchool((e.target as HTMLSelectElement).value)} aria-label="School" data-testid="db-school"><option value="">All schools</option>{SCHOOLS.map((s) => <option value={s.id}>{s.name}</option>)}</select>
        <select value={pos} onChange={(e) => setPos((e.target as HTMLSelectElement).value as Pos | '')} aria-label="Position" data-testid="db-pos"><option value="">All positions</option>{SLOTS.map((s) => <option value={s}>{s}</option>)}</select>
        <select value={arch} onChange={(e) => setArch((e.target as HTMLSelectElement).value)} aria-label="Archetype" data-testid="db-arch"><option value="">All archetypes</option>{ARCHETYPES.map((a) => <option value={a}>{a}</option>)}</select>
        <select value={minH} onChange={(e) => setMinH(+(e.target as HTMLSelectElement).value)} aria-label="Minimum height" data-testid="db-height"><option value={0}>Any height</option>{[175, 180, 185, 190, 195, 200].map((h) => <option value={h}>{h}+ cm</option>)}</select>
        <select value={minO} onChange={(e) => setMinO(+(e.target as HTMLSelectElement).value)} aria-label="Minimum overall" data-testid="db-ovr"><option value={0}>Any overall</option>{[60, 70, 75, 80, 85, 90].map((h) => <option value={h}>{h}+ OVR</option>)}</select>
        <select value={sort} onChange={(e) => setSort((e.target as HTMLSelectElement).value as SortKey)} aria-label="Sort by" data-testid="db-sort">
          <option value="overall">Sort: Overall</option><option value="three">Sort: 3PT</option><option value="passing">Sort: Passing</option><option value="rebound">Sort: Rebound</option><option value="defense">Sort: Defense</option><option value="speed">Sort: Speed</option><option value="height">Sort: Height</option><option value="name">Sort: Name</option>
        </select>
        <button class="btn sm" onClick={() => setAsc(!asc)} data-testid="db-order" aria-label="Toggle sort order">{asc ? '↑ Asc' : '↓ Desc'}</button>
        <button class="btn sm" onClick={reset} data-testid="db-reset" disabled={!q && !school && !pos && !arch && !minH && !minO && sort === 'overall' && !asc}>Reset</button>
      </section>
      <p class="muted small" data-testid="db-count">{list.length} of {PLAYERS.length} players</p>
      <div class="cards-grid db-grid" data-testid="db-grid">
        {list.map((p) => <PlayerCard p={p} onClick={() => setDetail(p)} />)}
      </div>
      {list.length === 0 && <p class="panel muted">No players match these filters.</p>}
      {detail && <PlayerModal p={detail} list={list} onClose={() => setDetail(null)} />}
    </div>
  );
}
