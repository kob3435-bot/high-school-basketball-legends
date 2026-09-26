import type { SimEvent } from './types';
import type { MatchState } from './GameState';
import { hashString } from './rng';

export function shortName(name: string): string {
  const parts = name.split(' ');
  return parts[parts.length - 1];
}

function pick(ev: { id: number; type: string }, arr: string[]): string {
  return arr[hashString(ev.type + ev.id) % arr.length];
}

const ORD = ['', '1st', '2nd', '3rd', '4th'];
export function periodName(p: number): string { return p <= 4 ? `${ORD[p]} quarter` : p === 5 ? 'overtime' : `${p - 4}OT`; }

export function describe(st: MatchState, ev: Omit<SimEvent, 'text'> & { text?: string; kind?: string; n?: number; of?: number; tactic?: string }): string {
  const tn = (i: number) => st.teams[i].cfg.name;
  const nm = (id?: string) => {
    if (!id) return '';
    const p = st.teams[0].players[id] ?? st.teams[1].players[id];
    return p ? shortName(p.name) : id;
  };
  const P = nm(ev.player), P2 = nm(ev.player2), T = tn(ev.team);
  switch (ev.type) {
    case 'tipoff': return `${P} and ${P2} go up for the tip... ${T} win it!`;
    case 'periodStart': return `Start of the ${periodName(ev.period)}. ${T} ball.`;
    case 'overtime': return `We're going to ${periodName(ev.period).toUpperCase()}! Tied at ${ev.score[0]}.`;
    case 'periodEnd': return `End of the ${periodName(ev.period)}. ${tn(0)} ${ev.score[0]} - ${ev.score[1]} ${tn(1)}.`;
    case 'halftime': return `HALFTIME: ${tn(0)} ${ev.score[0]} - ${ev.score[1]} ${tn(1)}.`;
    case 'final': return `FINAL: ${tn(0)} ${ev.score[0]} - ${ev.score[1]} ${tn(1)}. ${tn(ev.score[0] > ev.score[1] ? 0 : 1)} win!`;
    case 'bringUp': return ev.kind === 'fast' ? pick(ev, [`${P} pushes the pace!`, `${P} races up the floor!`]) : pick(ev, [`${P} brings the ball up.`, `${P} walks it into the frontcourt.`, `${P} sets up the offense.`]);
    case 'pass': return pick(ev, [`${P} swings it to ${P2}.`, `${P} finds ${P2}.`, `${P} kicks it out to ${P2}.`, `Ball movement... ${P} to ${P2}.`]);
    case 'screen': return pick(ev, [`${P2} sets a screen for ${P}.`, `${P} runs around the screen from ${P2}!`, `Pick and roll: ${P} and ${P2}.`]);
    case 'drive': return pick(ev, [`${P} drives to the basket!`, `${P} attacks the rim!`, `${P} slashes into the lane!`, `${P} drives baseline!`]);
    case 'postUp': return pick(ev, [`${P} backs down ${P2} in the post.`, `${P} posts up on ${P2}.`, `Entry pass into ${P} on the block.`]);
    case 'cut': return pick(ev, [`${P} cuts backdoor!`, `${P} slips to the basket!`, `${P} with a sharp cut!`]);
    case 'iso': return ev.kind === 'beat' ? `${P} crosses over ${P2} — he's got a step!` : pick(ev, [`Clear out for ${P}. Isolation on ${P2}.`, `${P} sizes up ${P2}...`]);
    case 'doubleTeam': return `${P2 ? P2 + ' and help' : 'Help'} come to double ${P}!`;
    case 'pressBreak': return `${T} break the press! Numbers advantage!`;
    case 'fastBreak': return pick(ev, [`${P} leads the fast break!`, `${T} on the break with ${P}!`, `${P} out in transition!`]);
    case 'shot': {
      const ast = ev.player2 ? ` (assist ${P2})` : '';
      const st2 = ev.shotType;
      if (ev.made) {
        if (st2 === 'three') return (ev.big ? `${P} for THREE... GOOD! ` : pick(ev, [`${P} for THREE... GOOD!`, `${P} from downtown... BANG!`, `${P} drains the three!`])) + ast;
        if (st2 === 'dunk') return pick(ev, [`${P} THROWS IT DOWN!`, `SLAM! ${P} with the dunk!`, `${P} hammers it home!`]) + ast;
        if (st2 === 'layup') return pick(ev, [`${P} lays it in. GOOD!`, `${P} finishes at the rim!`, `${P} scoops it in!`]) + ast;
        if (st2 === 'post') return pick(ev, [`${P} hook shot... GOOD!`, `${P} scores over the top in the post!`]) + ast;
        if (st2 === 'floater') return pick(ev, [`${P} with the floater... GOOD!`, `${P} runner in the lane — good!`]) + ast;
        return pick(ev, [`${P} pull-up jumper... GOOD!`, `${P} from mid-range — GOOD!`, `${P} fadeaway... GOOD!`]) + ast;
      }
      if (st2 === 'three') return pick(ev, [`${P} for three... no good.`, `${P} from deep — off the rim.`, `${P} misses the three.`]);
      if (st2 === 'dunk') return `${P} goes up for the slam... off the back iron!`;
      if (st2 === 'layup') return pick(ev, [`${P} layup rolls off.`, `${P} misses at the rim.`]);
      if (st2 === 'post') return `${P} hook shot... no good.`;
      if (st2 === 'floater') return `${P} floater is short.`;
      return pick(ev, [`${P} jumper... no good.`, `${P} mid-range miss.`]);
    }
    case 'block': return pick(ev, [`BLOCKED! ${P} rejects ${P2}!`, `${P} with the BLOCK on ${P2}!`, `Get that outta here! ${P} swats ${P2}!`]);
    case 'rebound': return ev.offensive ? pick(ev, [`${P} grabs the offensive rebound!`, `Offensive board — ${P}!`, `${P} keeps it alive!`]) : pick(ev, [`Rebound ${P}.`, `${P} secures the rebound.`, `${P} cleans the glass.`]);
    case 'steal': return pick(ev, [`${P} picks the pocket of ${P2}!`, `STOLEN! ${P} jumps the lane!`, `${P} strips ${P2}!`]);
    case 'turnover': {
      switch (ev.kind) {
        case 'pass': return `${P} throws it away. Turnover.`;
        case 'travel': return `${P} is called for traveling.`;
        case 'offFoul': return `Offensive foul on ${P}! Turnover.`;
        case 'shotClock': return `Shot clock violation on ${T}!`;
        case 'press': return `${P} gets trapped by the press — turnover!`;
        case 'out': return `${P} steps out of bounds.`;
        default: return `${P} loses the handle. Turnover.`;
      }
    }
    case 'foul': return ev.kind === 'shooting' ? `Foul on ${P}! ${P2} was fouled on the shot.` : ev.kind === 'intentional' ? `${P} fouls ${P2} intentionally to stop the clock.` : ev.kind === 'offensive' ? `Offensive foul on ${P}.` : `Foul on ${P} (${ev.n} PF). ${(ev.of ?? 0) >= 5 ? 'Bonus!' : ''}`.trim();
    case 'ft': return `${P} ${ev.made ? 'makes' : 'misses'} free throw ${ev.n} of ${ev.of}.`;
    case 'sub': return `Substitution ${T}: ${P} checks in for ${P2}.`;
    case 'timeout': return `Timeout ${T}. ${ev.kind ?? ''}`.trim();
    case 'tactic': return `${T} switch to ${ev.tactic}.`;
    case 'foulOut': return `${P} has FOULED OUT! He's done for the game.`;
    case 'run': return `${T} on a ${ev.n}-${ev.of} run!`;
    case 'violation': return `Violation on ${T}.`;
    default: return ev.text ?? '';
  }
}

export function emit(st: MatchState, e: Partial<SimEvent> & { type: SimEvent['type']; team: 0 | 1; kind?: string; n?: number; of?: number; tactic?: string }): SimEvent {
  const base = {
    id: ++st.eventId, t: Math.round(st.elapsed * 10) / 10, period: st.period, clock: Math.round(st.clock * 10) / 10,
    shotClock: Math.round(st.shotClock), score: [st.teams[0].score, st.teams[1].score] as [number, number], ...e,
  };
  const text = e.text ?? describe(st, base as any);
  const ev: SimEvent = { ...(base as any), text };
  delete (ev as any).tactic;
  ev.tf = [st.teams[0].teamFouls, st.teams[1].teamFouls];
  ev.to = [st.teams[0].timeouts, st.teams[1].timeouts];
  st.buffer.push(ev);
  if (st.keepEvents) st.events.push(ev);
  return ev;
}
