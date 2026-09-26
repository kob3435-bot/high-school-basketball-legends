/**
 * Deterministic player database generator. Run ONCE (npm run gen:players) and commit src/data/players.json.
 * The runtime NEVER re-randomises players; it only reads the static JSON.
 */
import { writeFileSync } from 'node:fs';
import { RNG, hashString, clamp } from '../src/engine/rng';
import { ALL_ATTRS, ATTR_LABELS, type AttrKey, type Archetype, type Player, type Pos, type Tier } from '../src/engine/types';
import { SIGNATURES } from '../src/engine/signatures';
import { computeOverall } from '../src/engine/Player';

type Def = {
  n: number; name: string; school: string; pos: Pos; pos2?: Pos; h: number; arch: Archetype; tier: Tier;
  set?: Partial<Record<AttrKey, number>>; weak?: string[]; strong?: string[]; sig?: string[]; bio?: string;
};

const D: Def[] = [
  // TEAM 01 SHOHOKAI HIGH
  { n: 1, name: 'Hanamichi Sakurai', school: 'shohokai', pos: 'PF', pos2: 'C', h: 188, arch: 'Rebounding Monster', tier: 'star',
    set: { oreb: 97, dreb: 95, boxOut: 90, vertical: 97, speed: 88, acceleration: 90, perimeterD: 80, interiorD: 84, helpD: 82, block: 84, steal: 76, defIQ: 70,
      strength: 88, stamina: 96, dunk: 88, three: 36, midRange: 48, freeThrow: 50, decision: 52, iq: 52, composure: 55, consistency: 54, shotCreation: 50, postScoring: 58, handling: 55, passing: 55, vision: 50, teamwork: 68, clutch: 78, layup: 70, insideScoring: 74 },
    weak: ['Outside shooting', 'Experience', 'Decision making'], strong: ['Elite rebounding', 'Vertical leap', 'Athleticism'], sig: ['Second Jump', 'Rebound Instinct'],
    bio: 'Raw, fearless rookie whose rebounding instincts and bounce change games.' },
  { n: 2, name: 'Kaede Rukami', school: 'shohokai', pos: 'SF', pos2: 'SG', h: 187, arch: 'Isolation Scorer', tier: 'superstar',
    set: { insideScoring: 94, shotCreation: 96, layup: 94, midRange: 94, dunk: 91, handling: 90, three: 84, teamwork: 58, passing: 68, vision: 70, perimeterD: 84, speed: 88, vertical: 89, clutch: 90, composure: 88 },
    weak: ['Teamwork', 'Passing'], strong: ['Isolation scoring', 'Mid-range', 'Shot creation'], sig: ['Ace Mode', 'Isolation Master'],
    bio: 'Silent ace who wants the ball in every big moment.' },
  { n: 3, name: 'Takenori Akiba', school: 'shohokai', pos: 'C', h: 197, arch: 'Rim Protector', tier: 'star',
    set: { interiorD: 94, block: 94, oreb: 90, dreb: 93, boxOut: 94, strength: 94, postScoring: 84, insideScoring: 84, three: 25, iq: 84, stamina: 82, teamwork: 85 },
    strong: ['Rim protection', 'Rebounding', 'Strength'], weak: ['Perimeter shooting', 'Speed'], sig: ['Paint Guardian'], bio: 'Captain and anchor of the paint.' },
  { n: 4, name: 'Ryota Miyama', school: 'shohokai', pos: 'PG', h: 168, arch: 'Floor General', tier: 'star',
    set: { speed: 97, acceleration: 96, handling: 94, passing: 91, steal: 88, vision: 86, interiorD: 38, block: 28, agility: 95, three: 70, decision: 80 },
    weak: ['Interior defense', 'Height'], strong: ['Speed', 'Ball handling', 'Passing'], sig: ['Lightning Drive'], bio: 'Lightning-quick point guard who pushes every possession.' },
  { n: 5, name: 'Hisashi Mitsuba', school: 'shohokai', pos: 'SG', h: 184, arch: 'Sharpshooter', tier: 'star',
    set: { three: 96, clutch: 96, iq: 91, stamina: 52, freeThrow: 91, midRange: 88, composure: 88, offBall: 88 },
    weak: ['Stamina'], strong: ['3PT shooting', 'Clutch', 'Basketball IQ'], sig: ['Clutch Three', 'Never Give Up'], bio: 'Returning shooter with a textbook stroke and an iron will.' },
  { n: 6, name: 'Kiminobu Kogami', school: 'shohokai', pos: 'SF', pos2: 'SG', h: 178, arch: 'Sharpshooter', tier: 'role',
    set: { three: 80, consistency: 82, composure: 80, teamwork: 85, iq: 78 }, bio: 'Reliable veteran spot-up shooter.' },
  { n: 7, name: 'Yasuto Kanda', school: 'shohokai', pos: 'PG', h: 170, arch: 'Floor General', tier: 'role', set: { composure: 78, teamwork: 84 }, bio: 'Steady backup floor general.' },
  { n: 8, name: 'Tetsu Kakuma', school: 'shohokai', pos: 'PF', pos2: 'C', h: 190, arch: 'Post Scorer', tier: 'role', bio: 'Interior role player who does the dirty work.' },
  { n: 9, name: 'Daichi Shiohara', school: 'shohokai', pos: 'SG', h: 176, arch: 'Defensive Specialist', tier: 'role', bio: 'Pesky defensive guard.' },
  // TEAM 02 RYONAMI HIGH
  { n: 10, name: 'Akira Sendoji', school: 'ryonami', pos: 'SF', pos2: 'PG', h: 190, arch: 'Point Forward', tier: 'superstar',
    set: { insideScoring: 92, shotCreation: 94, layup: 93, midRange: 90, three: 84, passing: 94, vision: 95, iq: 97, clutch: 94, composure: 94, handling: 88, decision: 92 },
    strong: ['Basketball IQ', 'Passing', 'Scoring'], weak: ['Motivation in blowouts'], sig: ['Genius Vision'], bio: 'Easy-going genius who can win games as scorer or passer.' },
  { n: 11, name: 'Jun Uozora', school: 'ryonami', pos: 'C', h: 202, arch: 'Rim Protector', tier: 'star',
    set: { strength: 97, oreb: 90, dreb: 95, boxOut: 94, interiorD: 93, block: 86, postScoring: 80, speed: 50 }, strong: ['Strength', 'Rebounding', 'Interior defense'], weak: ['Speed', 'Shooting'], sig: ['Giant Wall'], bio: 'Towering power center.' },
  { n: 12, name: 'Kisho Fukuma', school: 'ryonami', pos: 'PF', pos2: 'SF', h: 188, arch: 'Slasher', tier: 'star',
    set: { insideScoring: 92, midRange: 87, speed: 88, vertical: 90, acceleration: 90, agility: 88, dunk: 88, perimeterD: 64, teamwork: 60 }, weak: ['Defensive focus', 'Teamwork'], sig: ['Quick First Step', 'Contact Finisher'], bio: 'Aggressive scorer who attacks the rim relentlessly.' },
  { n: 13, name: 'Ryoji Ikeda', school: 'ryonami', pos: 'SF', h: 186, arch: 'Defensive Specialist', tier: 'starter', set: { perimeterD: 95, steal: 82, defIQ: 86 }, sig: ['Lockdown Defender'], bio: 'Lockdown wing defender.' },
  { n: 14, name: 'Hiroaki Koshida', school: 'ryonami', pos: 'SG', h: 180, arch: 'Two-Way Guard', tier: 'starter', bio: 'Two-way guard with a steady jumper.' },
  { n: 15, name: 'Tomoya Uehara', school: 'ryonami', pos: 'PG', h: 175, arch: 'Floor General', tier: 'role', bio: 'Pass-first point guard.' },
  // TEAM 03 KAINO ACADEMY
  { n: 16, name: 'Shinichi Makino', school: 'kaino', pos: 'PG', h: 184, arch: 'Scoring PG', tier: 'superstar',
    set: { strength: 94, layup: 95, insideScoring: 92, acceleration: 92, handling: 92, shotCreation: 93, passing: 94, vision: 93, iq: 97, decision: 94, perimeterD: 88, three: 80, clutch: 92 },
    strong: ['Strength', 'Driving', 'Playmaking'], weak: ['Pure jump shooting'], sig: ['Emperor Drive'], bio: 'Emperor of the high school game — a powerful, cerebral point guard.' },
  { n: 17, name: 'Soichiro Jinnai', school: 'kaino', pos: 'SG', h: 189, arch: 'Sharpshooter', tier: 'star',
    set: { three: 97, offBall: 96, freeThrow: 92, consistency: 92, midRange: 88 }, strong: ['3PT shooting', 'Off-ball movement'], sig: ['Perfect Release', 'Deep Range'], bio: 'Hardest worker in the country with a perfect release.' },
  { n: 18, name: 'Nobunaga Kiyoshi', school: 'kaino', pos: 'SF', pos2: 'SG', h: 178, arch: 'Athletic Wing', tier: 'star',
    set: { vertical: 95, dunk: 91, speed: 94, acceleration: 93, decision: 58, composure: 60 }, weak: ['Decision making', 'Composure'], sig: ['Chase Down Block', 'Quick First Step'], bio: 'Hyperactive high-flying rookie.' },
  { n: 19, name: 'Kazuma Takagi', school: 'kaino', pos: 'C', h: 191, arch: 'Rim Protector', tier: 'starter', set: { iq: 84, defIQ: 86 }, bio: 'Smart, positional defensive center.' },
  { n: 20, name: 'Yoshinori Miyata', school: 'kaino', pos: 'SG', h: 160, arch: 'Sharpshooter', tier: 'role', set: { three: 92, perimeterD: 50, strength: 38 }, weak: ['Size', 'Defense'], bio: 'Tiny specialist shooter.' },
  { n: 21, name: 'Tadashi Mutoha', school: 'kaino', pos: 'SF', pos2: 'PF', h: 187, arch: 'Defensive Specialist', tier: 'role', bio: 'Disciplined defensive forward.' },
  // TEAM 04 SHOYO INSTITUTE
  { n: 22, name: 'Kenji Fujisawa', school: 'shoyo', pos: 'PG', h: 178, arch: 'Floor General', tier: 'star',
    set: { passing: 96, iq: 96, midRange: 90, vision: 95, decision: 93, composure: 92 }, sig: ['Tactical Commander', 'Floor General'], bio: 'Player-coach who runs the floor like a chess board.' },
  { n: 23, name: 'Toru Hanazawa', school: 'shoyo', pos: 'C', h: 197, arch: 'Post Scorer', tier: 'star',
    set: { postScoring: 92, midRange: 89, oreb: 88, dreb: 91, boxOut: 88 }, sig: ['Fadeaway Center'], bio: 'Technical center with a soft turnaround.' },
  { n: 24, name: 'Kazushi Hasebe', school: 'shoyo', pos: 'SF', h: 190, arch: 'Defensive Specialist', tier: 'starter', bio: 'Long defensive specialist.' },
  { n: 25, name: 'Mitsuru Nagata', school: 'shoyo', pos: 'PF', h: 191, arch: 'Rim Protector', tier: 'starter', bio: 'Interior defender and shot blocker.' },
  { n: 26, name: 'Taku Itoya', school: 'shoyo', pos: 'PG', pos2: 'SG', h: 180, arch: 'Scoring PG', tier: 'role', bio: 'Combo guard.' },
  { n: 27, name: 'Shigeru Takada', school: 'shoyo', pos: 'PF', pos2: 'C', h: 193, arch: 'Rebounding Monster', tier: 'role', bio: 'Energy rebounder.' },
  // TEAM 05 SANNOH PEAK ACADEMY
  { n: 28, name: 'Eiji Sawakami', school: 'sannoh', pos: 'SF', h: 188, arch: 'All-Round Superstar', tier: 'legend',
    set: { insideScoring: 97, shotCreation: 98, layup: 97, midRange: 94, three: 86, handling: 94, acceleration: 95, perimeterD: 94, helpD: 90, defIQ: 92, steal: 86, clutch: 96, composure: 95, iq: 93, passing: 82 },
    strong: ['1-on-1 scoring', 'Driving', 'Defense', 'Clutch'], weak: ['Occasional over-dribbling'], sig: ['National Ace', 'Ankle Breaker'], bio: 'The best high school player in the nation.' },
  { n: 29, name: 'Kazunari Fukase', school: 'sannoh', pos: 'PG', h: 180, arch: 'Floor General', tier: 'superstar',
    set: { passing: 97, iq: 98, vision: 96, decision: 96, perimeterD: 93, steal: 88, defIQ: 94, composure: 96 }, sig: ['Game Controller'], bio: 'Unflappable floor general who controls every game.' },
  { n: 30, name: 'Masashi Kawahara', school: 'sannoh', pos: 'C', pos2: 'PF', h: 194, arch: 'Post Scorer', tier: 'superstar',
    set: { postScoring: 96, oreb: 94, dreb: 96, boxOut: 95, interiorD: 96, block: 90, helpD: 94, defIQ: 94, perimeterD: 80, midRange: 86, iq: 92, speed: 70, agility: 72 },
    strong: ['Post scoring', 'Rebounding', 'Defense'], sig: ['Complete Center'], bio: 'One of the most complete big men in the country.' },
  { n: 31, name: 'Mikio Kawahara', school: 'sannoh', pos: 'C', h: 210, arch: 'Post Scorer', tier: 'starter',
    set: { strength: 99, insideScoring: 93, speed: 42, agility: 44, iq: 60 }, weak: ['Speed', 'Agility', 'Experience'], sig: ['Post Dominator'], bio: 'Massive young center still learning the game.' },
  { n: 32, name: 'Minoru Matsuda', school: 'sannoh', pos: 'SG', h: 184, arch: 'Isolation Scorer', tier: 'star', set: { midRange: 92, three: 88, teamwork: 76 }, sig: ['Fadeaway Master'], bio: 'Elite secondary scorer.' },
  { n: 33, name: 'Satoshi Ichikawa', school: 'sannoh', pos: 'SG', h: 172, arch: 'Defensive Specialist', tier: 'starter', set: { perimeterD: 96, stamina: 97, steal: 86 }, sig: ['Lockdown Defender'], bio: 'Relentless perimeter stopper.' },
  // TEAM 06 TOYONAMI HIGH
  { n: 34, name: 'Minori Kishida', school: 'toyonami', pos: 'PF', pos2: 'SF', h: 188, arch: 'Slasher', tier: 'star', sig: ['Contact Finisher'], bio: 'Aggressive, physical scorer.' },
  { n: 35, name: 'Tsuyoshi Minato', school: 'toyonami', pos: 'SF', h: 184, arch: 'Sharpshooter', tier: 'star',
    set: { insideScoring: 86, shotCreation: 90, three: 91, midRange: 94 }, sig: ['Deep Range', 'Clutch Shooter'], bio: 'Ace shooter of the run-and-gun kings.' },
  { n: 36, name: 'Daijiro Itagaki', school: 'toyonami', pos: 'PG', h: 183, arch: 'Scoring PG', tier: 'starter', sig: ['Quick First Step'], bio: 'Tall offensive guard.' },
  { n: 37, name: 'Mitsuaki Iwase', school: 'toyonami', pos: 'C', h: 190, arch: 'Post Scorer', tier: 'starter', set: { speed: 72, agility: 70 }, bio: 'Mobile center.' },
  { n: 38, name: 'Kyohei Yashiro', school: 'toyonami', pos: 'SG', h: 178, arch: 'Slasher', tier: 'role', set: { speed: 90 }, bio: 'Fast break specialist.' },
  // TEAM 07 DAIEI EAST
  { n: 39, name: 'Hiroshi Morikawa', school: 'daiei', pos: 'C', h: 199, arch: 'Post Scorer', tier: 'star',
    set: { strength: 98, oreb: 95, dreb: 96, dunk: 97, iq: 64, composure: 66 }, weak: ['Experience', 'Composure'], sig: ['Rising Giant'], bio: 'Dominant young center with raw power.' },
  { n: 40, name: 'Atsushi Tsuchida', school: 'daiei', pos: 'PF', pos2: 'SF', h: 190, arch: 'Point Forward', tier: 'star', set: { passing: 91, iq: 94, vision: 90 }, sig: ['Floor General'], bio: 'Cerebral point forward.' },
  { n: 41, name: 'Keisuke Naito', school: 'daiei', pos: 'PG', h: 176, arch: 'Floor General', tier: 'starter', bio: 'Technical playmaker.' },
  { n: 42, name: 'Junpei Okada', school: 'daiei', pos: 'SG', h: 181, arch: 'Sixth Man', tier: 'starter', set: { midRange: 88 }, sig: ['Fadeaway Master'], bio: 'Mid-range specialist.' },
  { n: 43, name: 'Masato Hara', school: 'daiei', pos: 'SF', h: 186, arch: '3&D Wing', tier: 'starter', bio: 'Two-way wing.' },
  // TEAM 08 MEIHO NORTH
  { n: 44, name: 'Tetsuya Morishima', school: 'meiho', pos: 'C', h: 200, arch: 'Post Scorer', tier: 'star', set: { strength: 98, dunk: 96, oreb: 94, dreb: 95 }, sig: ['Post Dominator'], bio: 'Power center.' },
  { n: 45, name: 'Koji Naruse', school: 'meiho', pos: 'PF', h: 193, arch: 'Rebounding Monster', tier: 'starter', sig: ['Relentless Rebounder'], bio: 'Rebounding forward.' },
  { n: 46, name: 'Riku Takamura', school: 'meiho', pos: 'SF', h: 187, arch: 'Slasher', tier: 'starter', bio: 'Slashing wing.' },
  { n: 47, name: 'Naoto Shiba', school: 'meiho', pos: 'PG', h: 174, arch: 'Scoring PG', tier: 'role', set: { speed: 90 }, bio: 'Fast guard.' },
  { n: 48, name: 'Shun Arai', school: 'meiho', pos: 'SG', h: 181, arch: 'Sharpshooter', tier: 'role', bio: 'Spot-up shooter.' },
  // TEAM 09 TAKEZORA HIGH
  { n: 49, name: 'Kohei Nakamura', school: 'takezora', pos: 'PG', h: 177, arch: 'Floor General', tier: 'starter', bio: 'Traditional floor general.' },
  { n: 50, name: 'Daiki Matsuda', school: 'takezora', pos: 'SG', h: 182, arch: 'Sharpshooter', tier: 'role', bio: 'Balanced shooter.' },
  { n: 51, name: 'Ryo Takahashi', school: 'takezora', pos: 'SF', h: 186, arch: '3&D Wing', tier: 'starter', bio: 'Two-way wing.' },
  { n: 52, name: 'Shota Kaneda', school: 'takezora', pos: 'PF', h: 190, arch: 'Rebounding Monster', tier: 'role', bio: 'Physical forward.' },
  { n: 53, name: 'Genki Ishida', school: 'takezora', pos: 'C', h: 195, arch: 'Post Scorer', tier: 'role', bio: 'Traditional center.' },
  // TEAM 10 TSUKUMI ACADEMY
  { n: 54, name: 'Tomokazu Goda', school: 'tsukumi', pos: 'SG', pos2: 'SF', h: 188, arch: 'Isolation Scorer', tier: 'star', set: { three: 91, midRange: 92 }, sig: ['Fadeaway Master', 'Clutch Shooter'], bio: 'Three-level scorer.' },
  { n: 55, name: 'Tetsuya Nanjo', school: 'tsukumi', pos: 'PF', pos2: 'C', h: 192, arch: 'Rim Protector', tier: 'starter', set: { vertical: 88, speed: 76 }, bio: 'Athletic big.' },
  { n: 56, name: 'Satoru Kawasaki', school: 'tsukumi', pos: 'PG', h: 175, arch: 'Floor General', tier: 'role', bio: 'Pass-first guard.' },
  { n: 57, name: 'Koichi Amami', school: 'tsukumi', pos: 'SF', h: 185, arch: 'Athletic Wing', tier: 'role', set: { offBall: 86 }, bio: 'Off-ball cutter.' },
  { n: 58, name: 'Masaya Kondo', school: 'tsukumi', pos: 'C', h: 196, arch: 'Rim Protector', tier: 'role', bio: 'Defensive center.' },
  // TEAM 11 MIURA TECH
  { n: 59, name: 'Kengo Murase', school: 'miura', pos: 'PF', h: 190, arch: 'Defensive Specialist', tier: 'starter', set: { strength: 86, interiorD: 82 }, bio: 'Physical defender.' },
  { n: 60, name: 'Tatsuya Arakawa', school: 'miura', pos: 'PG', h: 177, arch: 'Scoring PG', tier: 'starter', bio: 'Aggressive guard.' },
  { n: 61, name: 'Shinji Miyamoto', school: 'miura', pos: 'SG', h: 182, arch: 'Two-Way Guard', tier: 'starter', bio: 'Two-way guard.' },
  { n: 62, name: 'Ryuichi Takeda', school: 'miura', pos: 'SF', h: 188, arch: '3&D Wing', tier: 'role', bio: 'Athletic defender.' },
  { n: 63, name: 'Goro Nakayama', school: 'miura', pos: 'C', h: 196, arch: 'Rebounding Monster', tier: 'role', bio: 'Physical center.' },
  // TEAM 12 RYOKU ACADEMY
  { n: 64, name: 'Michael Okino', school: 'ryoku', pos: 'SF', h: 192, arch: 'All-Round Superstar', tier: 'star',
    set: { insideScoring: 90, shotCreation: 90, midRange: 88, perimeterD: 91, helpD: 88, speed: 92, vertical: 94, acceleration: 92, agility: 90 }, sig: ['Chase Down Block', 'Quick First Step'], bio: 'Modern all-round wing.' },
  { n: 65, name: 'Katsumi Ichikawa', school: 'ryoku', pos: 'PG', h: 176, arch: 'Floor General', tier: 'starter', bio: 'Creative playmaker.' },
  { n: 66, name: 'Hiro Tanaka', school: 'ryoku', pos: 'SG', h: 181, arch: 'Sharpshooter', tier: 'starter', bio: 'Movement shooter.' },
  { n: 67, name: 'Yuta Sakai', school: 'ryoku', pos: 'PF', h: 192, arch: 'Stretch Four', tier: 'starter', bio: 'Stretch four.' },
  { n: 68, name: 'Shogo Kitamura', school: 'ryoku', pos: 'C', h: 198, arch: 'Rim Protector', tier: 'starter', bio: 'Rim protector.' },
  // SPECIAL LEGEND POOL
  { n: 69, name: 'Ryuji Makabe', school: 'legends', pos: 'PG', h: 181, arch: 'Floor General', tier: 'legend', sig: ['Floor General', 'Game Controller'], bio: 'Legendary floor general.' },
  { n: 70, name: 'Akito Senkawa', school: 'legends', pos: 'SF', pos2: 'PG', h: 191, arch: 'Point Forward', tier: 'legend', sig: ['Floor General', 'Clutch Shooter'], bio: 'Genius point forward.' },
  { n: 71, name: 'Rei Kazehara', school: 'legends', pos: 'SG', h: 185, arch: 'Sharpshooter', tier: 'legend', set: { three: 98 }, sig: ['Deep Range', 'Perfect Release', 'Clutch Shooter'], bio: 'The ultimate shooter.' },
  { n: 72, name: 'Taiga Sakuraba', school: 'legends', pos: 'PF', h: 193, arch: 'Rebounding Monster', tier: 'legend', sig: ['Relentless Rebounder', 'Second Jump'], bio: 'The ultimate rebounder.' },
  { n: 73, name: 'Ren Rukami', school: 'legends', pos: 'SF', h: 189, arch: 'Isolation Scorer', tier: 'legend', sig: ['Ankle Breaker', 'Fadeaway Master'], bio: 'Isolation superstar.' },
  { n: 74, name: 'Daigo Akamine', school: 'legends', pos: 'C', h: 203, arch: 'Rim Protector', tier: 'legend', sig: ['Chase Down Block', 'Lockdown Defender'], bio: 'Elite rim protector.' },
  { n: 75, name: 'Eito Sawagami', school: 'legends', pos: 'SF', h: 190, arch: 'All-Round Superstar', tier: 'legend', sig: ['Quick First Step', 'Clutch Shooter', 'Contact Finisher'], bio: 'National-level scorer.' },
  { n: 76, name: 'Masato Kawashima', school: 'legends', pos: 'PF', pos2: 'C', h: 200, arch: 'Post Scorer', tier: 'legend', sig: ['Post Dominator', 'Second Jump'], bio: 'Complete big man.' },
];

const LEVEL: Record<Tier, number> = { legend: 84, superstar: 82, star: 77, starter: 71, role: 65 };

const ARCH: Record<Archetype, Partial<Record<AttrKey, number>>> = {
  'Floor General': { passing: 14, vision: 14, handling: 10, decision: 12, pickRoll: 8, iq: 10, teamwork: 8, steal: 4, speed: 4, postScoring: -20, dunk: -15, block: -18, interiorD: -15, oreb: -15, dreb: -10, strength: -10, boxOut: -10, insideScoring: -6 },
  'Scoring PG': { shotCreation: 12, handling: 10, midRange: 6, three: 6, layup: 8, passing: 5, vision: 3, speed: 8, acceleration: 8, postScoring: -18, block: -18, interiorD: -15, oreb: -15, dreb: -10, boxOut: -10, teamwork: -3 },
  Sharpshooter: { three: 16, midRange: 8, freeThrow: 12, offBall: 12, consistency: 6, composure: 4, insideScoring: -10, postScoring: -22, dunk: -15, block: -18, interiorD: -15, oreb: -15, dreb: -10, strength: -10, boxOut: -10, handling: -2, perimeterD: -4 },
  Slasher: { layup: 14, dunk: 10, insideScoring: 10, acceleration: 12, speed: 10, shotCreation: 6, handling: 4, three: -10, freeThrow: -4, midRange: -4, postScoring: -10, block: -8 },
  'Two-Way Guard': { perimeterD: 12, steal: 10, defIQ: 8, handling: 4, three: 2, midRange: 2, speed: 6, agility: 8, stamina: 6, postScoring: -18, block: -12, interiorD: -10, oreb: -12 },
  'Point Forward': { passing: 12, vision: 12, iq: 10, handling: 8, decision: 8, shotCreation: 4, midRange: 4, dreb: 2, teamwork: 6 },
  'Isolation Scorer': { shotCreation: 15, midRange: 12, handling: 8, insideScoring: 8, layup: 8, three: 4, clutch: 6, teamwork: -10, passing: -6, helpD: -6, defIQ: -4 },
  'Athletic Wing': { vertical: 14, speed: 10, acceleration: 10, dunk: 12, agility: 8, layup: 6, perimeterD: 4, stamina: 6, three: -6, midRange: -4, postScoring: -8, decision: -4 },
  '3&D Wing': { three: 10, perimeterD: 12, helpD: 6, defIQ: 6, steal: 4, offBall: 6, shotCreation: -10, handling: -6, postScoring: -12, passing: -4 },
  'Defensive Specialist': { perimeterD: 16, steal: 8, helpD: 10, defIQ: 12, interiorD: 4, stamina: 8, agility: 6, shotCreation: -14, midRange: -10, three: -10, insideScoring: -8, postScoring: -10, handling: -6 },
  'Stretch Four': { three: 10, midRange: 8, freeThrow: 4, pickRoll: 6, dreb: 4, block: -4, interiorD: -4, speed: -4, postScoring: -4, handling: -6 },
  'Post Scorer': { postScoring: 15, insideScoring: 12, strength: 10, layup: 4, oreb: 6, dreb: 4, boxOut: 6, three: -22, midRange: -4, handling: -15, speed: -10, agility: -10, perimeterD: -10, steal: -8, passing: -6 },
  'Rim Protector': { block: 16, interiorD: 16, helpD: 10, defIQ: 6, dreb: 10, boxOut: 10, strength: 8, three: -25, midRange: -10, handling: -18, shotCreation: -18, speed: -10, perimeterD: -8, passing: -8 },
  'Rebounding Monster': { oreb: 18, dreb: 16, boxOut: 14, vertical: 10, strength: 8, stamina: 8, three: -20, midRange: -12, freeThrow: -10, shotCreation: -15, handling: -15, passing: -8, postScoring: -4 },
  'All-Round Superstar': { shotCreation: 8, midRange: 6, three: 2, iq: 6, clutch: 6, perimeterD: 4, insideScoring: 4, layup: 4, passing: 2, handling: 4 },
  'Sixth Man': { shotCreation: 8, midRange: 8, three: 6, consistency: -4, handling: 2, defIQ: -4, perimeterD: -4, postScoring: -8, block: -10 },
};

const HEIGHT_K: Partial<Record<AttrKey, number>> = {
  block: 6, interiorD: 4, oreb: 5, dreb: 5, boxOut: 3, postScoring: 4, dunk: 5, strength: 3, insideScoring: 2,
  speed: -5, acceleration: -5, agility: -5, handling: -4, three: -2, perimeterD: -2, steal: -3, stamina: -1,
};

const STRENGTH_PHRASE: Partial<Record<AttrKey, string>> = {
  three: '3PT shooting', midRange: 'Mid-range game', insideScoring: 'Inside scoring', layup: 'Finishing', dunk: 'Dunking', postScoring: 'Post moves',
  shotCreation: 'Shot creation', offBall: 'Off-ball movement', passing: 'Passing', vision: 'Court vision', handling: 'Ball handling', decision: 'Decision making',
  pickRoll: 'Pick & roll', perimeterD: 'Perimeter defense', interiorD: 'Interior defense', steal: 'Steals', block: 'Shot blocking', helpD: 'Help defense',
  defIQ: 'Defensive IQ', speed: 'Speed', acceleration: 'Acceleration', strength: 'Strength', vertical: 'Vertical leap', agility: 'Agility', stamina: 'Stamina',
  oreb: 'Offensive rebounding', dreb: 'Defensive rebounding', boxOut: 'Boxing out', iq: 'Basketball IQ', clutch: 'Clutch', consistency: 'Consistency',
  composure: 'Composure', teamwork: 'Teamwork', freeThrow: 'Free throws',
};

// jersey numbers per school (Japanese HS style 4..15)
const jerseyCounters: Record<string, number> = {};
const usedLegendNums = new Set<number>();

export function buildPlayers(): Player[] {
for (const k of Object.keys(jerseyCounters)) delete jerseyCounters[k];
usedLegendNums.clear();
return D.map((d) => {
  const rng = new RNG(hashString('hsbl-v1-' + d.n + d.name));
  const L = LEVEL[d.tier];
  const hk = (d.h - 186) / 10;
  const a = {} as Record<AttrKey, number>;
  for (const k of ALL_ATTRS) {
    const off = (ARCH[d.arch][k] ?? 0) + (HEIGHT_K[k] ?? 0) * hk;
    a[k] = Math.round(clamp(L + off + rng.gauss(0, 4), 25, 95));
  }
  // correlations
  a.freeThrow = Math.round(clamp((a.freeThrow + a.three * 0.5 + a.midRange * 0.5) / 2 + rng.gauss(0, 3), 35, 95));
  if (d.set) for (const [k, v] of Object.entries(d.set)) a[k as AttrKey] = v as number;
  // keep FT believable relative to set shooting values
  if (d.set && !d.set.freeThrow && (d.set.three || d.set.midRange)) a.freeThrow = Math.round(clamp(Math.max(a.freeThrow, ((d.set.three ?? a.three) + (d.set.midRange ?? a.midRange)) / 2 - 4), 35, 95));
  // No all-99 superstar: cap every attribute and make sure at least 4 attributes sit below 75
  for (const k of ALL_ATTRS) a[k] = clamp(a[k], 20, 99);
  const sortedLow = [...ALL_ATTRS].sort((x, y) => a[x] - a[y]);
  let lows = sortedLow.filter((k) => a[k] < 75).length;
  for (let i = 0; lows < 4 && i < sortedLow.length; i++) { const k = sortedLow[i]; if (a[k] >= 75 && !(d.set && k in d.set)) { a[k] = 70 - i; lows++; } }

  const overall = computeOverall(a, d.pos, d.h);
  const top = [...ALL_ATTRS].filter((k) => k !== 'stamina' || a[k] > 90).sort((x, y) => a[y] - a[x]).slice(0, 3).map((k) => STRENGTH_PHRASE[k]!);
  const bottom = [...ALL_ATTRS].sort((x, y) => a[x] - a[y]).slice(0, 2).map((k) => STRENGTH_PHRASE[k]!);
  const strengths = Array.from(new Set([...(d.strong ?? []), ...top])).slice(0, 4);
  const weaknesses = Array.from(new Set([...(d.weak ?? []), ...bottom])).slice(0, 3);
  for (const s of d.sig ?? []) if (!SIGNATURES[s]) throw new Error('Unknown signature ' + s);
  let jersey: number;
  if (d.school === 'legends') { do { jersey = rng.int(0, 33); } while (usedLegendNums.has(jersey)); usedLegendNums.add(jersey); }
  else { jerseyCounters[d.school] = (jerseyCounters[d.school] ?? 3) + 1; jersey = jerseyCounters[d.school]; }
  const weight = Math.max(52, Math.round((d.h - 100) * 0.82 + (a.strength - 70) * 0.35 + rng.gauss(0, 2)));
  return {
    id: 'p' + String(d.n).padStart(2, '0'), num: d.n, name: d.name, school: d.school, pos: d.pos, pos2: d.pos2 ?? null,
    height: d.h, weight, overall, archetype: d.arch, tier: d.tier, jersey, attrs: a, strengths, weaknesses, signatures: d.sig ?? [],
    bio: d.bio ?? `${d.arch} for ${d.school}.`,
  };
});
}

if (process.argv[1] && process.argv[1].includes('generate-players')) {
const players = buildPlayers();

writeFileSync(new URL('../src/data/players.json', import.meta.url), JSON.stringify(players, null, 1));
const ovr = players.map((p) => `${p.num} ${p.name} ${p.pos} ${p.overall} (${p.tier}) 3P:${p.attrs.three} REB:${p.attrs.dreb}`);
console.log(ovr.join('\n'));
console.log('Generated', players.length, 'players.', 'labels ok:', Object.keys(ATTR_LABELS).length);
}
