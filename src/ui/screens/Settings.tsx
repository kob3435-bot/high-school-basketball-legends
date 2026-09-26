import { useState } from 'preact/hooks';
import { useApp, save } from '../store';
import { TopBar, Confirm } from '../components';
import { play, setAudio } from '../sound';

export function SettingsScreen() {
  const { settings, setSettings, toast } = useApp();
  const [confirm, setConfirm] = useState(false);
  const s = settings;
  return (
    <div class="screen settings" data-testid="settings">
      <TopBar title="Settings" />
      <section class="panel settings-list">
        <h3>Sound</h3>
        <label class="setting">Volume <span data-testid="volume-value">{Math.round(s.volume * 100)}%</span>
          <input type="range" min={0} max={100} value={Math.round(s.volume * 100)} data-testid="volume" aria-label="Volume"
            onInput={(e) => setSettings({ ...s, volume: +(e.target as HTMLInputElement).value / 100 })} />
        </label>
        <label class="setting toggle">Mute all sound
          <input type="checkbox" checked={s.muted} data-testid="mute" onChange={(e) => setSettings({ ...s, muted: (e.target as HTMLInputElement).checked })} />
        </label>
        <div class="row gap wrap">
          <button class="btn" data-testid="test-sound" onClick={() => { setAudio(s.volume, s.muted); play('whistle'); setTimeout(() => play('swish'), 400); setTimeout(() => play('buzzer'), 900); if (s.muted) toast('Sound is muted'); }}>Test sound</button>
        </div>
        <h3>Match</h3>
        <label class="setting">Default speed
          <div class="seg">{([1, 2, 4] as const).map((v) => <button class={s.defaultSpeed === v ? 'on' : ''} data-testid={`default-speed-${v}`} onClick={() => setSettings({ ...s, defaultSpeed: v })}>{v}x</button>)}</div>
        </label>
        <label class="setting toggle">Auto-substitutions by default
          <input type="checkbox" checked={s.autoSub} data-testid="autosub-default" onChange={(e) => setSettings({ ...s, autoSub: (e.target as HTMLInputElement).checked })} />
        </label>
        <h3>Data</h3>
        <p class="muted small">Saved: {save.getDreamTeams().length} dream teams · {save.getHistory().length} matches{save.getTournament() ? ' · 1 tournament' : ''}. Everything is stored in this browser.</p>
        <button class="btn danger-outline" onClick={() => setConfirm(true)} data-testid="reset-data">Reset all data</button>
      </section>
      {confirm && <Confirm text="Delete all dream teams, match history, tournament progress and settings?" yes="Reset everything" onNo={() => setConfirm(false)} onYes={() => { save.clearAll(); setSettings(save.getSettings()); setConfirm(false); toast('All data reset'); }} />}
    </div>
  );
}
