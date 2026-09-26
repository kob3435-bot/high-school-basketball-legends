import { useState } from 'preact/hooks';
import type { TeamConfig } from '../../engine/types';
import { SLOTS } from '../../engine/types';
import { PLAYER_MAP } from '../../engine/db';
import { generateTeam, TEMPLATES, LEVELS, type Template, type Level } from '../../engine/CPUCoachEngine';
import { teamOverall } from '../../engine/Team';
import { useApp, type Mode } from '../store';
import { OvrBadge, PlayerCard, PlayerModal, TopBar, LineupAnalysis } from '../components';
import { TeamLogo } from '../art';
import { play } from '../sound';
import type { Player } from '../../engine/types';

export const TEMPLATE_DESC: Record<string, string> = {
  'Balanced': 'Solid at every position.', 'Small Ball': 'Five quick, skilled players. Fast, but small.', 'Twin Towers': 'Two giants in the paint.',
  'Run & Gun': 'Athletes who push the pace.', 'Defense First': 'Stoppers and rim protectors.', 'Three-Point Army': 'Shooters everywhere.',
  'Inside Dominance': 'Post scorers and rebounders.', 'Super Team': 'The best available talent.', 'Superstar + Role Players': 'One star, four workers.',
};

export function Opponent({ mode, user }: { mode: Mode; user: TeamConfig }) {
  const { nav } = useApp();
  const [tpl, setTpl] = useState<Template | 'Random'>('Random');
  const [lvl, setLvl] = useState<Level>('Random');
  const [cpu, setCpu] = useState<TeamConfig | null>(null);
  const [detail, setDetail] = useState<Player | null>(null);
  const gen = () => {
    play('whistle');
    const seed = Math.floor(Math.random() * 1e9);
    const t = generateTeam(seed, { template: tpl === 'Random' ? undefined : tpl, level: lvl, exclude: [...user.starters, ...user.bench] });
    setCpu(t);
  };
  return (
    <div class="screen opponent" data-testid="opponent">
      <TopBar title="Find Opponent" />
      <section class="panel">
        <h3>CPU team generator</h3>
        <div class="gen-controls">
          <label>Style
            <select value={tpl} onChange={(e) => setTpl((e.target as HTMLSelectElement).value as Template)} data-testid="cpu-template">
              <option value="Random">Random</option>
              {TEMPLATES.map((t) => <option value={t}>{t}</option>)}
            </select>
          </label>
          <label>Strength
            <select value={lvl} onChange={(e) => setLvl((e.target as HTMLSelectElement).value as Level)} data-testid="cpu-level">
              {LEVELS.map((l) => <option value={l}>{l}</option>)}
            </select>
          </label>
          <button class="btn big primary" onClick={gen} data-testid="generate-cpu">{cpu ? 'Regenerate' : 'Generate Opponent'}</button>
        </div>
        {tpl !== 'Random' && <p class="muted small">{TEMPLATE_DESC[tpl]}</p>}
      </section>
      {cpu && (
        <section class="panel" data-testid="cpu-team">
          <div class="team-id">
            <TeamLogo team={cpu} size={56} />
            <div><h2 class="m0" data-testid="cpu-name">{cpu.name}</h2><div class="muted">{cpu.template} · {cpu.tactics.offense} / {cpu.tactics.defense} / {cpu.tactics.pace}</div></div>
            <span class="row gap">OVR <OvrBadge v={teamOverall(cpu)} /></span>
          </div>
          <div class="cards-grid">
            {cpu.starters.map((id, i) => <div><div class="slot-tag">{SLOTS[i]}</div><PlayerCard p={PLAYER_MAP[id]} compact onClick={() => setDetail(PLAYER_MAP[id])} /></div>)}
          </div>
          <h4>Bench ({cpu.bench.length})</h4>
          <div class="cards-grid">{cpu.bench.map((id) => <PlayerCard p={PLAYER_MAP[id]} compact onClick={() => setDetail(PLAYER_MAP[id])} />)}</div>
          <LineupAnalysis ids={cpu.starters} />
          <div class="cta-row">
            <button class="btn big primary" data-testid="to-preview" onClick={() => nav({ name: 'preview', mode, user, cpu })}>Match Preview →</button>
          </div>
        </section>
      )}
      {detail && <PlayerModal p={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
