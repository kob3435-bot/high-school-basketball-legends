/** WebAudio-synthesised sound effects (no external assets). */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let volume = 0.6, muted = false;

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const C = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!C) return null;
    try { ctx = new C(); master = ctx!.createGain(); master.connect(ctx!.destination); } catch { return null; }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  if (master) master.gain.value = muted ? 0 : volume;
  return ctx;
}

export function setAudio(v: number, m: boolean) { volume = v; muted = m; if (master) master.gain.value = m ? 0 : v; }

function noise(c: AudioContext, dur: number) {
  const b = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * dur)), c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = c.createBufferSource(); s.buffer = b; return s;
}

function env(c: AudioContext, g: GainNode, a: number, peak: number, dur: number) {
  const t = c.currentTime;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}

export type Sfx = 'bounce' | 'squeak' | 'whistle' | 'crowd' | 'buzzer' | 'swish' | 'rim' | 'cheer';

export function play(s: Sfx) {
  if (typeof window !== 'undefined') (window as any).__sfxCount = ((window as any).__sfxCount || 0) + 1;
  if (muted || volume <= 0) return;
  const c = ac(); if (!c || !master) return;
  const g = c.createGain(); g.connect(master);
  const t = c.currentTime;
  try {
    switch (s) {
      case 'bounce': { const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.12); o.connect(g); env(c, g, 0.005, 0.6, 0.15); o.start(); o.stop(t + 0.16); break; }
      case 'squeak': { const o = c.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(1800, t); o.frequency.linearRampToValueAtTime(2600, t + 0.05); o.frequency.linearRampToValueAtTime(1500, t + 0.1); o.connect(g); env(c, g, 0.005, 0.12, 0.11); o.start(); o.stop(t + 0.12); break; }
      case 'whistle': { const o = c.createOscillator(); const lfo = c.createOscillator(); const lg = c.createGain(); o.type = 'sine'; o.frequency.value = 2900; lfo.frequency.value = 38; lg.gain.value = 120; lfo.connect(lg); lg.connect(o.frequency); o.connect(g); env(c, g, 0.01, 0.25, 0.42); o.start(); lfo.start(); o.stop(t + 0.44); lfo.stop(t + 0.44); break; }
      case 'crowd': case 'cheer': { const n = noise(c, s === 'cheer' ? 1.4 : 0.9); const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.6; n.connect(f); f.connect(g); env(c, g, 0.15, s === 'cheer' ? 0.35 : 0.16, s === 'cheer' ? 1.4 : 0.9); n.start(); break; }
      case 'buzzer': { const o = c.createOscillator(); o.type = 'square'; o.frequency.value = 220; const o2 = c.createOscillator(); o2.type = 'square'; o2.frequency.value = 233; o.connect(g); o2.connect(g); env(c, g, 0.01, 0.18, 1.0); o.start(); o2.start(); o.stop(t + 1.02); o2.stop(t + 1.02); break; }
      case 'swish': { const n = noise(c, 0.25); const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 3500; n.connect(f); f.connect(g); env(c, g, 0.02, 0.3, 0.25); n.start(); break; }
      case 'rim': { const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = 620; const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = 1340; o.connect(g); o2.connect(g); env(c, g, 0.002, 0.35, 0.35); o.start(); o2.start(); o.stop(t + 0.36); o2.stop(t + 0.36); break; }
    }
  } catch { /* ignore audio errors */ }
}
