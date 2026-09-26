import { Component, type ComponentChildren } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { Ctx, save, type Screen, type AppCtx } from './store';
import type { Settings } from '../engine/SaveEngine';
import { setAudio } from './sound';
import { Home } from './screens/Home';
import { TeamBuilder } from './screens/TeamBuilder';
import { Opponent } from './screens/Opponent';
import { Preview } from './screens/Preview';
import { LiveMatch } from './screens/LiveMatch';
import { Results } from './screens/Results';
import { DreamTeams } from './screens/DreamTeams';
import { TournamentScreen } from './screens/Tournament';
import { RandomBattle } from './screens/RandomBattle';
import { PlayerDB } from './screens/PlayerDB';
import { History } from './screens/History';
import { SettingsScreen } from './screens/Settings';

class ErrorBoundary extends Component<{ children: ComponentChildren; onHome: () => void; onRestart: (() => void) | null; resetKey: unknown }, { err: Error | null }> {
  state = { err: null as Error | null };
  static getDerivedStateFromError(err: Error) { return { err }; }
  componentDidCatch(err: Error) { console.warn('[HSBL] UI error caught by boundary:', err); }
  componentDidUpdate(prev: { resetKey: unknown }) { if (prev.resetKey !== this.props.resetKey && this.state.err) this.setState({ err: null }); }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div class="screen error-screen" data-testid="error-boundary">
        <h1>Something went wrong</h1>
        <p>The game hit an unexpected problem: <code>{String(this.state.err.message || this.state.err)}</code></p>
        <p class="muted">Your saved teams and history are safe.</p>
        <div class="row gap wrap">
          <button class="btn primary" onClick={() => this.setState({ err: null })}>Retry</button>
          <button class="btn" onClick={() => { this.setState({ err: null }); this.props.onHome(); }}>Return to Menu</button>
          {this.props.onRestart && <button class="btn" onClick={() => { this.setState({ err: null }); this.props.onRestart!(); }}>Restart Match</button>}
        </div>
      </div>
    );
  }
}

export function App() {
  const [stack, setStack] = useState<Screen[]>([{ name: 'home' }]);
  const [settings, setSettingsState] = useState<Settings>(() => save.getSettings());
  const [toastMsg, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number>();
  const cur = stack[stack.length - 1];

  useEffect(() => { setAudio(settings.volume, settings.muted); }, [settings]);

  // browser back button support
  useEffect(() => {
    history.replaceState({ depth: 0 }, '');
    const onPop = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const nav = useCallback((s: Screen, replace = false) => {
    setStack((st) => {
      if (replace) return [...st.slice(0, -1), s];
      history.pushState({ depth: st.length }, '');
      return [...st, s];
    });
    window.scrollTo(0, 0);
  }, []);
  const back = useCallback(() => {
    setStack((st) => (st.length > 1 ? st.slice(0, -1) : st));
    window.scrollTo(0, 0);
  }, []);
  const home = useCallback(() => { setStack([{ name: 'home' }]); window.scrollTo(0, 0); }, []);
  const root = useCallback((s: Screen) => { setStack([{ name: 'home' }, s]); window.scrollTo(0, 0); }, []);
  const setSettings = useCallback((s: Settings) => { save.saveSettings(s); setSettingsState(s); }, []);
  const toast = useCallback((m: string) => {
    setToast(m);
    clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  const ctx: AppCtx = { nav, back, home, root, settings, setSettings, toast };
  const restart = cur.name === 'live' ? () => nav({ ...cur, seed: (cur.seed * 7 + 13) >>> 0 }, true) : null;

  let view;
  switch (cur.name) {
    case 'home': view = <Home />; break;
    case 'builder': view = <TeamBuilder key={stack.length} mode={cur.mode} team={cur.team} />; break;
    case 'opponent': view = <Opponent mode={cur.mode} user={cur.user} />; break;
    case 'preview': view = <Preview {...cur} />; break;
    case 'live': view = <LiveMatch key={cur.seed} {...cur} />; break;
    case 'results': view = <Results {...cur} />; break;
    case 'dream': view = <DreamTeams />; break;
    case 'tournament': view = <TournamentScreen />; break;
    case 'random': view = <RandomBattle />; break;
    case 'db': view = <PlayerDB />; break;
    case 'history': view = <History />; break;
    case 'settings': view = <SettingsScreen />; break;
  }

  return (
    <Ctx.Provider value={ctx}>
      <div class="app" data-screen={cur.name}>
        <ErrorBoundary onHome={home} onRestart={restart} resetKey={cur}>
          {view}
        </ErrorBoundary>
        {toastMsg && <div class="toast" role="status" data-testid="toast">{toastMsg}</div>}
      </div>
    </Ctx.Provider>
  );
}

