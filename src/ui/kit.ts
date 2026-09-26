import type { TeamConfig } from '../engine/types';

const rgb = (h: string) => { const x = h.replace('#', ''); const n = parseInt(x.length === 3 ? x.split('').map((c) => c + c).join('') : x, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
export const dist = (a: string, b: string) => { const [r1, g1, b1] = rgb(a), [r2, g2, b2] = rgb(b); return Math.hypot(r1 - r2, g1 - g2, b1 - b2); };
/** Away team wears an alternate kit when both uniforms would look alike on court. */
export function awayKit(home: TeamConfig, away: TeamConfig): TeamConfig {
  if (dist(home.primary, away.primary) >= 140) return away;
  const alt = dist(home.primary, away.secondary) >= 140 ? away.secondary : dist(home.primary, '#ffffff') >= 140 ? '#ffffff' : '#111111';
  const sec = dist(alt, away.primary) >= 140 ? away.primary : dist(alt, '#111111') > 200 ? '#111111' : '#ffffff';
  return { ...away, primary: alt, secondary: sec };
}

