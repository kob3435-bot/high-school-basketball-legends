import { useApp, save } from '../store';
import { PLAYERS } from '../../engine/db';
import { Portrait } from '../art';
import { play } from '../sound';

const MENU = [
  { id: 'quick', label: 'Quick Match', desc: 'Pick five, find an opponent, tip off.', icon: '⚡' },
  { id: 'dream', label: 'Dream Team', desc: 'Build and save your own rosters.', icon: '★' },
  { id: 'tournament', label: 'Tournament', desc: '16 teams. Knockout bracket. One champion.', icon: '🏆' },
  { id: 'random', label: 'Random Battle', desc: 'Two random teams, simulated instantly.', icon: '🎲' },
  { id: 'db', label: 'Player Database', desc: '76 legends: ratings, skills, bios.', icon: '📋' },
  { id: 'history', label: 'Match History', desc: 'Every box score you have played.', icon: '🕘' },
  { id: 'settings', label: 'Settings', desc: 'Sound, speed and data.', icon: '⚙' },
] as const;

export function Home() {
  const { nav } = useApp();
  const stars = [...PLAYERS].sort((a, b) => b.overall - a.overall).slice(0, 5);
  const hist = save.getHistory();
  const record = hist.filter((h) => h.userTeam !== null).reduce((a, h) => { h.winner === h.userTeam ? a.w++ : a.l++; return a; }, { w: 0, l: 0 });
  const go = (id: typeof MENU[number]['id']) => {
    play('bounce');
    switch (id) {
      case 'quick': nav({ name: 'builder', mode: 'Quick Match' }); break;
      case 'dream': nav({ name: 'dream' }); break;
      case 'tournament': nav({ name: 'tournament' }); break;
      case 'random': nav({ name: 'random' }); break;
      case 'db': nav({ name: 'db' }); break;
      case 'history': nav({ name: 'history' }); break;
      case 'settings': nav({ name: 'settings' }); break;
    }
  };
  return (
    <div class="screen home" data-testid="home">
      <div class="hero">
        <div class="hero-text">
          <div class="kicker">Tactical Basketball Simulation</div>
          <h1 class="logo-title">HIGH SCHOOL<br /><span>BASKETBALL</span><br />LEGENDS</h1>
          <p class="muted">You are the coach. Build the lineup, call the tactics, manage the bench — the players do the rest.</p>
          {(record.w + record.l) > 0 && <div class="record" data-testid="home-record">Coach record: <b>{record.w}–{record.l}</b></div>}
        </div>
        <div class="hero-faces" aria-hidden="true">
          {stars.map((p, i) => <div class="hero-face" style={{ transform: `translateY(${[8, 0, -6, 0, 8][i]}px)` }}><Portrait player={p} size={64} /></div>)}
        </div>
      </div>
      <nav class="menu" aria-label="Main menu">
        {MENU.map((m, i) => (
          <button class={'menu-btn' + (i === 0 ? ' primary' : '')} data-testid={`menu-${m.id}`} onClick={() => go(m.id)}>
            <span class="menu-icon" aria-hidden="true">{m.icon}</span>
            <span class="menu-label">{m.label}</span>
            <span class="menu-desc">{m.desc}</span>
          </button>
        ))}
      </nav>
      <footer class="foot muted">Original characters, schools, logos and uniforms. Fan-made tribute to 90s basketball manga.</footer>
    </div>
  );
}
