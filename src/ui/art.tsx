/** Procedural, original SVG art: portraits, school/team logos and uniforms. */
import type { Player } from '../engine/types';
import { SCHOOL_MAP } from '../engine/db';
import { RNG, hashString } from '../engine/rng';

const SKIN = ['#f3d2b3', '#eac39f', '#e0b48c', '#d6a57c', '#c99268', '#b98058', '#f7dcc3'];
const HAIR = ['#141414', '#1f1a17', '#2b211b', '#3a2a1f', '#4a3525', '#0f0f1a', '#5b3a24', '#1a1a1a'];

export function teamColors(p: Player) {
  const s = SCHOOL_MAP[p.school];
  return { primary: s?.primary ?? '#c8102e', secondary: s?.secondary ?? '#111', accent: s?.accent ?? '#fff' };
}

function contrast(hex: string): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  return r * 0.299 + g * 0.587 + b * 0.114 > 150 ? '#111' : '#fff';
}
export { contrast };

export function Portrait({ player, size = 64, primary, secondary }: { player: Player; size?: number; primary?: string; secondary?: string }) {
  const rng = new RNG(hashString('face' + player.id));
  const col = teamColors(player);
  const jp = primary ?? col.primary, js = secondary ?? col.secondary;
  const skin = SKIN[rng.int(0, SKIN.length - 1)];
  const hairC = HAIR[rng.int(0, HAIR.length - 1)];
  const style = rng.int(0, 7);
  const faceW = 30 + (player.attrs.strength - 60) * 0.08 + rng.range(-2, 2);
  const faceH = 36 + (player.height - 185) * 0.05 + rng.range(-2, 2);
  const eyeY = 46 + rng.range(-1, 1.5), eyeGap = 9 + rng.range(-1, 1.5);
  const brow = rng.int(0, 2);
  const mouth = rng.int(0, 3);
  const headband = rng.chance(0.14);
  const id = 'pg' + player.id;
  const hair = () => {
    switch (style) {
      case 0: return <path d={`M${50 - faceW / 2 - 2} 42 Q50 ${10} ${50 + faceW / 2 + 2} 42 L${50 + faceW / 2} 34 L${50 + faceW / 2 - 4} 22 L${50 + 6} 26 L50 14 L${50 - 8} 25 L${50 - faceW / 2 + 3} 22 Z`} fill={hairC} />; // spiky
      case 1: return <path d={`M${50 - faceW / 2} 40 Q50 ${20} ${50 + faceW / 2} 40 Q50 ${28} ${50 - faceW / 2} 40 Z`} fill={hairC} />; // buzz
      case 2: return <path d={`M${50 - faceW / 2 - 3} 52 Q${50 - faceW / 2 - 4} 18 50 18 Q${50 + faceW / 2 + 4} 18 ${50 + faceW / 2 + 3} 52 L${50 + faceW / 2 - 2} 38 Q50 30 ${50 - faceW / 2 + 2} 38 Z`} fill={hairC} />; // long
      case 3: return <path d={`M${50 - faceW / 2 - 1} 40 Q${50 - 6} 16 ${50 + faceW / 2 + 2} 30 L${50 + faceW / 2} 40 Q50 26 ${50 - faceW / 2 - 1} 40 Z`} fill={hairC} />; // slick back
      case 4: return <g fill={hairC}>{[...Array(9)].map((_, i) => <circle cx={50 - faceW / 2 + i * faceW / 8} cy={30 - Math.sin((i / 8) * Math.PI) * 8} r={6} />)}</g>; // curly
      case 5: return <path d={`M${50 - 5} 38 L${50 - 4} 12 L${50 + 4} 12 L${50 + 5} 38 Z M${50 - faceW / 2} 40 Q50 32 ${50 + faceW / 2} 40 Q50 36 ${50 - faceW / 2} 40`} fill={hairC} />; // mohawk
      case 6: return <path d={`M${50 - faceW / 2 - 2} 44 Q50 14 ${50 + faceW / 2 + 2} 44 L${50 + faceW / 2} 36 Q${50 + 4} 32 ${50 - 2} 38 Q${50 - 8} 30 ${50 - faceW / 2} 38 Z`} fill={hairC} />; // parted
      default: return <path d={`M${50 - faceW / 2 - 2} 40 Q50 16 ${50 + faceW / 2 + 2} 40 L${50 + faceW / 2 + 1} 30 Q50 22 ${50 - faceW / 2 - 1} 30 Z`} fill={hairC} />; // crop
    }
  };
  return (
    <svg class="portrait" width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`Portrait of ${player.name}`}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f4f4" /><stop offset="1" stop-color="#d9d9d9" /></linearGradient>
      </defs>
      <rect width="100" height="100" rx="14" fill={`url(#${id})`} />
      {/* jersey */}
      <path d="M14 100 Q16 78 34 74 L42 72 Q50 80 58 72 L66 74 Q84 78 86 100 Z" fill={jp} />
      <path d="M42 72 Q50 84 58 72" stroke={js} stroke-width="3" fill="none" />
      <text x="50" y="96" font-size="13" font-weight="800" text-anchor="middle" fill={contrast(jp)} font-family="Arial, sans-serif">{player.jersey}</text>
      {/* neck */}
      <rect x="44" y="62" width="12" height="12" fill={skin} />
      {/* ears */}
      <ellipse cx={50 - faceW / 2} cy="50" rx="3" ry="5" fill={skin} />
      <ellipse cx={50 + faceW / 2} cy="50" rx="3" ry="5" fill={skin} />
      {/* face */}
      <ellipse cx="50" cy="48" rx={faceW / 2} ry={faceH / 2} fill={skin} />
      {hair()}
      {headband && <rect x={50 - faceW / 2 - 1} y="34" width={faceW + 2} height="5" fill={js === '#ffffff' || js === '#f5f5f5' ? jp : js} rx="2" />}
      {/* brows */}
      {brow === 0 && <g stroke="#1a1a1a" stroke-width="2.2" stroke-linecap="round"><path d={`M${50 - eyeGap - 4} ${eyeY - 6} L${50 - eyeGap + 4} ${eyeY - 5}`} /><path d={`M${50 + eyeGap - 4} ${eyeY - 5} L${50 + eyeGap + 4} ${eyeY - 6}`} /></g>}
      {brow === 1 && <g stroke="#1a1a1a" stroke-width="2.4" stroke-linecap="round"><path d={`M${50 - eyeGap - 4} ${eyeY - 7} L${50 - eyeGap + 4} ${eyeY - 4}`} /><path d={`M${50 + eyeGap - 4} ${eyeY - 4} L${50 + eyeGap + 4} ${eyeY - 7}`} /></g>}
      {brow === 2 && <g stroke="#1a1a1a" stroke-width="1.8" stroke-linecap="round" fill="none"><path d={`M${50 - eyeGap - 4} ${eyeY - 5} Q${50 - eyeGap} ${eyeY - 8} ${50 - eyeGap + 4} ${eyeY - 5}`} /><path d={`M${50 + eyeGap - 4} ${eyeY - 5} Q${50 + eyeGap} ${eyeY - 8} ${50 + eyeGap + 4} ${eyeY - 5}`} /></g>}
      {/* eyes */}
      <ellipse cx={50 - eyeGap} cy={eyeY} rx="2.6" ry="1.9" fill="#111" />
      <ellipse cx={50 + eyeGap} cy={eyeY} rx="2.6" ry="1.9" fill="#111" />
      {/* nose & mouth */}
      <path d={`M50 ${eyeY + 3} L48.5 ${eyeY + 9} L51 ${eyeY + 9}`} stroke="#8a5a3c" stroke-width="1.2" fill="none" />
      {mouth === 0 && <path d={`M45 ${eyeY + 14} Q50 ${eyeY + 17} 55 ${eyeY + 14}`} stroke="#6b3b2a" stroke-width="1.8" fill="none" />}
      {mouth === 1 && <path d={`M45 ${eyeY + 15} L55 ${eyeY + 15}`} stroke="#6b3b2a" stroke-width="1.8" />}
      {mouth === 2 && <path d={`M45 ${eyeY + 15} Q50 ${eyeY + 13} 55 ${eyeY + 15}`} stroke="#6b3b2a" stroke-width="1.8" fill="none" />}
      {mouth === 3 && <path d={`M46 ${eyeY + 14} Q50 ${eyeY + 18} 54 ${eyeY + 14} Z`} fill="#fff" stroke="#6b3b2a" stroke-width="1.2" />}
    </svg>
  );
}

function shapePath(shape: string): string {
  switch (shape) {
    case 'circle': return 'M50 4 A46 46 0 1 1 49.9 4 Z';
    case 'diamond': return 'M50 3 L97 50 L50 97 L3 50 Z';
    case 'hex': return 'M50 3 L91 26 L91 74 L50 97 L9 74 L9 26 Z';
    case 'star': return 'M50 3 L62 36 L97 38 L69 60 L79 95 L50 75 L21 95 L31 60 L3 38 L38 36 Z';
    case 'crest': return 'M10 8 L90 8 L90 50 Q90 84 50 97 Q10 84 10 50 Z';
    default: return 'M12 6 L88 6 L88 46 Q88 80 50 96 Q12 80 12 46 Z';
  }
}

export function Logo({ primary, secondary, text, shape = 'shield', size = 40, seed = 1 }: { primary: string; secondary: string; text: string; shape?: string; size?: number; seed?: number }) {
  const rng = new RNG(seed * 7919 + hashString(text));
  const emblem = rng.int(0, 3);
  const stroke = contrast(primary) === '#fff' ? '#fff' : '#111';
  return (
    <svg class="logo" width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`${text} logo`}>
      <path d={shapePath(shape)} fill={primary} stroke={secondary} stroke-width="6" stroke-linejoin="round" />
      {emblem === 0 && <path d="M22 70 L78 30" stroke={secondary} stroke-width="7" opacity="0.8" />}
      {emblem === 1 && <circle cx="50" cy="50" r="24" fill="none" stroke={secondary} stroke-width="4" opacity="0.85" />}
      {emblem === 2 && <path d="M30 30 Q50 50 30 70 M70 30 Q50 50 70 70" stroke={secondary} stroke-width="4" fill="none" opacity="0.8" />}
      {emblem === 3 && <path d="M50 22 L56 40 L75 40 L60 51 L66 70 L50 58 L34 70 L40 51 L25 40 L44 40 Z" fill={secondary} opacity="0.55" />}
      <text x="50" y="60" font-size={text.length > 2 ? 26 : 32} font-weight="900" text-anchor="middle" fill={stroke} font-family="Arial Black, Arial, sans-serif" style="letter-spacing:-1px">{text}</text>
    </svg>
  );
}

export function SchoolLogo({ schoolId, size = 40 }: { schoolId: string; size?: number }) {
  const s = SCHOOL_MAP[schoolId];
  if (!s) return null;
  return <Logo primary={s.primary} secondary={s.secondary} text={s.short} shape={s.logoShape} size={size} seed={s.id.length} />;
}

export function TeamLogo({ team, size = 40 }: { team: { primary: string; secondary: string; short: string; logoSeed: number }; size?: number }) {
  const shapes = ['shield', 'circle', 'diamond', 'hex', 'star', 'crest'];
  return <Logo primary={team.primary} secondary={team.secondary} text={team.short.slice(0, 3)} shape={shapes[Math.abs(team.logoSeed) % shapes.length]} size={size} seed={team.logoSeed} />;
}

export function Jersey({ primary, secondary, num, size = 48 }: { primary: string; secondary: string; num: number | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Uniform">
      <path d="M30 6 L40 6 Q50 18 60 6 L70 6 L72 20 Q82 24 86 34 L86 94 L14 94 L14 34 Q18 24 28 20 Z" fill={primary} stroke={secondary} stroke-width="4" />
      <path d="M40 6 Q50 22 60 6" stroke={secondary} stroke-width="5" fill="none" />
      <path d="M14 80 L86 80" stroke={secondary} stroke-width="4" />
      <text x="50" y="66" font-size="30" font-weight="900" text-anchor="middle" fill={contrast(primary)} font-family="Arial Black, Arial, sans-serif">{num}</text>
    </svg>
  );
}
