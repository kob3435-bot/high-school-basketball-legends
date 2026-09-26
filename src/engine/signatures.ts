// Signature skills and their concrete simulation effects. Every value here is consumed by an engine module.
export interface SigEffect {
  drive?: number;        // finishing / success bonus on drives & transition (probability pts)
  firstStep?: number;    // chance to beat the on-ball defender (more open looks)
  mid?: number;          // mid-range make bonus
  fadeaway?: number;     // reduces contest penalty on mid/post shots (0..1 fraction)
  three?: number;        // 3PT make bonus
  deep?: number;         // extra 3PA tendency multiplier
  catchShoot?: number;   // bonus on assisted jumpers
  post?: number;         // post scoring bonus
  finish?: number;       // layup/dunk bonus
  andOne?: number;       // extra chance a fouled shot still goes in
  drawFoul?: number;     // extra shooting-foul chance drawn
  oreb?: number;         // rebound weight multiplier on offensive glass
  dreb?: number;         // rebound weight multiplier on defensive glass
  putback?: number;      // putback make bonus
  block?: number;        // block chance multiplier
  chaseDown?: number;    // block multiplier in transition
  onBallD?: number;      // on-ball contest bonus (rating pts)
  steal?: number;        // steal chance multiplier
  teamTO?: number;       // reduces team turnover rate (fraction)
  assist?: number;       // improves quality of shots he creates for others (probability pts)
  clutch?: number;       // make bonus in clutch time
  iso?: number;          // isolation play bonus (probability pts)
  usage?: number;        // usage multiplier
  fatigueResist?: number;// fraction of fatigue penalty ignored
  paint?: number;        // team rim-protection bonus while on court (rating pts)
  fastBreak?: number;    // team fast break frequency bonus
  tacticBoost?: number;  // amplifies team tactic effect
  aceMode?: boolean;     // scoring surge when team trails or in 4th quarter
  neverGiveUp?: boolean; // ignores most fatigue when team trails in 2nd half
}

export const SIGNATURES: Record<string, { desc: string; effect: SigEffect }> = {
  'Quick First Step': { desc: 'Explosive first step beats defenders off the dribble.', effect: { firstStep: 0.12, drive: 0.03 } },
  'Fadeaway Master': { desc: 'Fadeaway jumper is almost impossible to contest.', effect: { fadeaway: 0.5, mid: 0.03 } },
  'Deep Range': { desc: 'Comfortable pulling up from well beyond the arc.', effect: { deep: 1.35, three: 0.015 } },
  'Chase Down Block': { desc: 'Hunts down fast-break layups from behind.', effect: { chaseDown: 2.2, block: 1.15 } },
  'Floor General': { desc: 'Organises the offense; fewer turnovers, better shots for teammates.', effect: { teamTO: 0.1, assist: 0.015 } },
  'Clutch Shooter': { desc: 'Raises his game in the final minutes of close games.', effect: { clutch: 0.05 } },
  'Relentless Rebounder': { desc: 'Crashes the glass on every possession.', effect: { oreb: 1.3, dreb: 1.15 } },
  'Post Dominator': { desc: 'Overpowers defenders on the block.', effect: { post: 0.05, drawFoul: 0.03 } },
  'Ankle Breaker': { desc: 'Crossover leaves defenders stumbling.', effect: { firstStep: 0.1, iso: 0.03 } },
  'Contact Finisher': { desc: 'Finishes through contact for and-ones.', effect: { andOne: 0.18, drawFoul: 0.03, finish: 0.02 } },
  'Second Jump': { desc: 'Jumps again before anyone else lands.', effect: { oreb: 1.35, putback: 0.08 } },
  'Lockdown Defender': { desc: 'Suffocating on-ball defense.', effect: { onBallD: 8, steal: 1.15 } },
  'Perfect Release': { desc: 'Textbook release on catch-and-shoot threes.', effect: { catchShoot: 0.045, three: 0.01 } },
  'Game Controller': { desc: 'Dictates tempo; the team rarely loses its composure.', effect: { teamTO: 0.14, assist: 0.012, tacticBoost: 0.15 } },
  // Character-specific signatures
  'Rebound Instinct': { desc: 'Reads the carom before the ball leaves the shooter\'s hand.', effect: { oreb: 1.2, dreb: 1.2 } },
  'Ace Mode': { desc: 'Takes over when the team needs a bucket.', effect: { aceMode: true, usage: 1.1 } },
  'Isolation Master': { desc: 'Clear the floor and let him work.', effect: { iso: 0.05, firstStep: 0.06 } },
  'Paint Guardian': { desc: 'Owns the paint; drivers think twice.', effect: { paint: 8, block: 1.2 } },
  'Lightning Drive': { desc: 'Blazing speed turns every rebound into a fast break.', effect: { drive: 0.04, fastBreak: 0.05, firstStep: 0.08 } },
  'Clutch Three': { desc: 'Late-game threes with ice in his veins.', effect: { clutch: 0.06, three: 0.01 } },
  'Never Give Up': { desc: 'Keeps going on empty when the team is behind.', effect: { neverGiveUp: true, fatigueResist: 0.2 } },
  'Genius Vision': { desc: 'Sees passing lanes nobody else can.', effect: { assist: 0.03, teamTO: 0.08 } },
  'Giant Wall': { desc: 'Immovable box-outs and a wall at the rim.', effect: { dreb: 1.25, paint: 5 } },
  'Emperor Drive': { desc: 'Bulldozes to the rim and finishes through anyone.', effect: { drive: 0.05, andOne: 0.12, drawFoul: 0.03 } },
  'Tactical Commander': { desc: 'Coach on the floor; tactics are executed perfectly.', effect: { tacticBoost: 0.3, assist: 0.012 } },
  'Fadeaway Center': { desc: 'Unblockable turnaround fadeaway from the post.', effect: { fadeaway: 0.45, post: 0.03 } },
  'National Ace': { desc: 'The best one-on-one player in the country.', effect: { iso: 0.04, clutch: 0.03, firstStep: 0.06, onBallD: 3 } },
  'Complete Center': { desc: 'Scores, defends and rebounds at an elite level.', effect: { post: 0.03, paint: 5, dreb: 1.1 } },
  'Rising Giant': { desc: 'Raw power that overwhelms the paint.', effect: { finish: 0.04, oreb: 1.15, drawFoul: 0.02 } },
};

export function sigEffect(signatures: string[]): SigEffect {
  const out: SigEffect = {};
  for (const s of signatures) {
    const e = SIGNATURES[s]?.effect;
    if (!e) continue;
    for (const [k, v] of Object.entries(e)) {
      const key = k as keyof SigEffect;
      if (typeof v === 'boolean') (out as any)[key] = v || (out as any)[key];
      else if (['oreb', 'dreb', 'block', 'chaseDown', 'steal', 'usage', 'deep'].includes(key)) (out as any)[key] = ((out as any)[key] ?? 1) * v;
      else (out as any)[key] = ((out as any)[key] ?? 0) + v;
    }
  }
  return out;
}
