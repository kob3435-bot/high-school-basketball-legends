/** 2D tactical court renderer. Pure presentation: driven entirely by SimEvents fed via `apply()`. */
import type { SimEvent } from '../engine/types';

const W = 28, H = 15, RIM = 1.575;
type Mode = 'jump' | 'half' | 'ft' | 'break' | 'freeze';
interface Dot { id: string; team: 0 | 1; num: number; x: number; y: number; tx: number; ty: number; jump: number; }
interface Flight { x0: number; y0: number; x1: number; y1: number; t: number; dur: number; arc: number; after?: 'made' | 'miss' | null; }

// offensive spots (distance from attacking baseline, y) per slot index
const SPOTS: [number, number][] = [[8.4, 7.5], [6.6, 1.5], [6.6, 13.5], [4.4, 3.6], [2.3, 10.4]];
const ZONE23: [number, number][] = [[5.6, 5.6], [5.6, 9.4], [2.6, 3.2], [2.6, 11.8], [1.9, 7.5]];
const FT_SPOTS: [number, number][] = [[8.5, 4], [8.5, 11], [3.4, 5.1], [3.4, 9.9], [4.6, 5.1]];
const FT_DEF: [number, number][] = [[7.6, 7.5], [6.5, 12], [2.4, 5.1], [2.4, 9.9], [4.6, 9.9]];

export class CourtView {
  dots = new Map<string, Dot>();
  lineups: [(string | null)[], (string | null)[]] = [[], []];
  nums: Record<string, number> = {};
  colors: [[string, string], [string, string]];
  period = 1;
  off: 0 | 1 = 0;
  holder: string | null = null;
  mode: Mode = 'jump';
  special: Record<string, [number, number]> = {}; // id -> [bx, y] override in attacking-half coords
  flight: Flight | null = null;
  ball = { x: 14, y: 7.5 };
  flash: { x: number; y: number; t: number; text: string; color: string } | null = null;
  zone = [false, false];
  netPulse = 0;
  logo = '';
  onSfx: ((s: 'swish' | 'rim') => void) | null = null;

  constructor(lineups: [(string | null)[], (string | null)[]], nums: Record<string, number>, colors: [[string, string], [string, string]], logo = '') {
    this.nums = nums; this.colors = colors; this.logo = logo;
    this.setLineups(lineups);
    this.layout(true);
  }

  dir(team: 0 | 1) { return (team === 0) === (this.period <= 2) ? 1 : -1; }
  /** attacking-half coords (bx from baseline) -> court coords for team attacking */
  tc(team: 0 | 1, bx: number, y: number): [number, number] {
    return this.dir(team) > 0 ? [W - bx, y] : [bx, H - y];
  }
  rim(team: 0 | 1): [number, number] { return this.tc(team, RIM, 7.5); }

  setLineups(l: [(string | null)[], (string | null)[]]) {
    this.lineups = [l[0].slice(), l[1].slice()];
    const keep = new Set<string>();
    for (const t of [0, 1] as const) this.lineups[t].forEach((id, i) => {
      if (!id) return; keep.add(id);
      if (!this.dots.has(id)) {
        const bench = t === 0 ? 11 - i * 0.6 : 17 + i * 0.6; // enter from the scorer's table
        this.dots.set(id, { id, team: t, num: this.nums[id] ?? 0, x: bench, y: H + 0.4, tx: bench, ty: H, jump: 0 });
      }
    });
    for (const id of [...this.dots.keys()]) if (!keep.has(id)) this.dots.delete(id);
  }

  private defenderSpot(dt: 0 | 1, idx: number, oppPos: [number, number] | null): [number, number] {
    const ot = (1 - dt) as 0 | 1;
    if (this.zone[dt] && this.mode === 'half') { const [bx, y] = ZONE23[idx]; return this.tc(ot, bx, y); }
    if (!oppPos) { const [bx, y] = SPOTS[idx]; return this.tc(ot, bx * 0.7, y); }
    const r = this.rim(ot);
    return [oppPos[0] + (r[0] - oppPos[0]) * 0.28, oppPos[1] + (r[1] - oppPos[1]) * 0.28];
  }

  layout(snap = false) {
    const o = this.off, d = (1 - o) as 0 | 1;
    const offPos: ([number, number] | null)[] = [null, null, null, null, null];
    this.lineups[o].forEach((id, i) => {
      if (!id) return;
      const dot = this.dots.get(id); if (!dot) return;
      let p: [number, number];
      if (this.mode === 'jump') p = [14 + (o === 0 ? -1 : 1) * (i === 4 ? 0.6 : 3 + i * 0.3), i === 4 ? 7.5 : 2 + i * 3];
      else if (this.mode === 'ft') p = this.tc(o, ...FT_SPOTS[i]);
      else if (this.mode === 'break') p = this.tc(o, i < 3 ? 3 + i * 1.6 : 9 + i, i === 0 ? 7.5 : i % 2 ? 3 : 12);
      else p = this.tc(o, ...SPOTS[i]);
      const sp = this.special[id]; if (sp && this.mode !== 'jump') p = this.tc(o, sp[0], sp[1]);
      if (this.mode === 'ft' && id === this.holder) p = this.tc(o, 5.8, 7.5);
      offPos[i] = p; dot.tx = p[0]; dot.ty = p[1];
    });
    this.lineups[d].forEach((id, i) => {
      if (!id) return;
      const dot = this.dots.get(id); if (!dot) return;
      let p: [number, number];
      if (this.mode === 'jump') p = [14 + (d === 0 ? -1 : 1) * (i === 4 ? 0.6 : 3 + i * 0.3), i === 4 ? 7.5 : 3.2 + i * 3];
      else if (this.mode === 'ft') p = this.tc(o, ...FT_DEF[i]);
      else if (this.mode === 'break') p = this.tc(o, 2 + i * 1.2, 4 + i * 1.8);
      else p = this.defenderSpot(d, i, offPos[i]);
      dot.tx = p[0]; dot.ty = p[1];
    });
    if (snap) for (const dot of this.dots.values()) { dot.x = dot.tx; dot.y = dot.ty; }
  }

  private pos(id?: string | null): [number, number] | null { const d = id ? this.dots.get(id) : null; return d ? [d.x, d.y] : null; }
  private throwBall(to: [number, number], dur: number, arc: number, after: Flight['after'] = null) {
    this.flight = { x0: this.ball.x, y0: this.ball.y, x1: to[0], y1: to[1], t: 0, dur, arc, after };
  }

  apply(ev: SimEvent) {
    if (ev.period !== this.period) { this.period = ev.period; }
    const P = ev.player ?? null;
    switch (ev.type) {
      case 'tipoff': case 'periodStart': case 'overtime':
        this.special = {}; this.off = ev.team; this.mode = ev.type === 'tipoff' ? 'jump' : 'half';
        this.holder = null; this.ball = { x: 14, y: 7.5 }; this.flight = null;
        if (ev.type !== 'tipoff') { this.mode = 'jump'; }
        this.layout(ev.type !== 'tipoff');
        break;
      case 'bringUp': case 'pressBreak':
        this.special = {}; this.off = ev.team; this.mode = 'half'; this.holder = P;
        this.layout();
        if (P) { const d = this.dots.get(P); if (d) { const [x, y] = this.tc(ev.team, 13.5, 7.5); if (Math.abs(d.x - x) > 6) { /* start near half court */ } this.special[P] = [8.6, 7.5]; this.layout(); } }
        break;
      case 'fastBreak':
        this.special = {}; this.off = ev.team; this.mode = 'break'; this.holder = P;
        if (P) this.special[P] = [4, 7.5];
        this.layout();
        break;
      case 'pass': {
        this.holder = ev.player2 ?? this.holder;
        const to = this.pos(ev.player2); if (to) this.throwBall(to, 0.35, 0.3);
        break;
      }
      case 'screen':
        if (ev.player2 && P) { const hp = this.special[P] ?? SPOTS[this.slotOf(P)] ?? [7, 7.5]; this.special[ev.player2] = [hp[0] - 0.6, hp[1] + (hp[1] > 7.5 ? -0.9 : 0.9)]; this.special[P] = [hp[0] - 1.8, hp[1] > 7.5 ? hp[1] - 2.5 : hp[1] + 2.5]; this.holder = P; this.layout(); }
        break;
      case 'drive':
        if (P) { this.holder = P; this.special[P] = [2.1, 7.5 + (Math.random() - 0.5) * 2.5]; this.layout(); }
        break;
      case 'postUp':
        if (P) { this.holder = P; this.special[P] = [2.6, this.slotOf(P) % 2 ? 5.6 : 9.4]; this.layout(); }
        break;
      case 'cut':
        if (P) { this.special[P] = [1.6, 7.5 + (Math.random() - 0.5) * 2]; this.layout(); }
        break;
      case 'iso':
        if (P) { this.holder = P; if (ev.kind === 'beat') this.special[P] = [4, 7.5]; else this.special[P] = [7.6, this.slotOf(P) % 2 ? 4 : 11]; this.layout(); }
        break;
      case 'doubleTeam': break;
      case 'shot': {
        if (!P) break;
        this.holder = P;
        const bx = (ev.x ?? 0.3) * 14, y = (ev.y ?? 0.5) * 15;
        this.special[P] = [bx, y]; this.layout();
        const d = this.dots.get(P);
        if (d) { const [x, yy] = this.tc(ev.team, bx, y); d.tx = x; d.ty = yy; d.x += (x - d.x) * 0.7; d.y += (yy - d.y) * 0.7; d.jump = 1; this.ball = { x: d.x, y: d.y }; }
        const r = this.rim(ev.team);
        const dist = Math.hypot(r[0] - this.ball.x, r[1] - this.ball.y);
        this.throwBall(r, 0.35 + dist * 0.05, 0.6 + dist * 0.12, ev.made ? 'made' : 'miss');
        this.holder = null;
        if (ev.made) this.flashAt(r, ev.pts === 3 ? '+3' : '+' + (ev.pts ?? 2), ev.team);
        break;
      }
      case 'block': {
        const b = P ? this.dots.get(P) : null; const s = this.pos(ev.player2);
        if (b && s) { b.tx = s[0] + 0.5; b.ty = s[1]; b.jump = 1; }
        this.flight = null; if (s) { this.ball = { x: s[0], y: s[1] }; this.throwBall([s[0] + (Math.random() - 0.5) * 4, s[1] + (Math.random() - 0.5) * 4], 0.4, 0.4); }
        if (s) this.flashAt(s, 'BLOCK', ev.team);
        break;
      }
      case 'rebound': {
        const d = P ? this.dots.get(P) : null;
        const shootingTeam = ev.offensive ? ev.team : ((1 - ev.team) as 0 | 1);
        const [x, y] = this.tc(shootingTeam, 2.4, 7.5 + (Math.random() - 0.5) * 4);
        if (d) { d.tx = x; d.ty = y; d.jump = 0.8; }
        this.throwBall([x, y], 0.3, 0.3);
        this.holder = P;
        if (!ev.offensive) { this.off = ev.team; this.special = {}; if (P) this.special[P] = [22, 7.5]; }
        else { this.special = {}; if (P) this.special[P] = [2.4, 7.5]; this.layout(); }
        break;
      }
      case 'steal': {
        this.holder = P; this.off = ev.team; this.special = {};
        const d = this.pos(P); if (d) this.throwBall(d, 0.25, 0.1);
        if (d) this.flashAt(d, 'STEAL', ev.team);
        break;
      }
      case 'turnover': this.holder = null; break;
      case 'foul':
        if (ev.kind === 'shooting' || ev.kind === 'personal' || ev.kind === 'intentional') {
          this.flashAt(this.pos(P) ?? [14, 7.5], 'FOUL', ev.team, '#111');
        }
        break;
      case 'ft':
        this.off = ev.team; this.mode = 'ft'; this.special = {}; this.holder = P; this.layout();
        { const d = this.dots.get(P ?? ''); if (d) { const [x, y] = this.tc(ev.team, 5.8, 7.5); d.x = x; d.y = y; this.ball = { x, y }; } }
        this.throwBall(this.rim(ev.team), 0.55, 0.9, ev.made ? 'made' : 'miss');
        if (ev.made) this.flashAt(this.rim(ev.team), '+1', ev.team);
        this.holder = null;
        break;
      case 'sub': {
        const l = this.lineups[ev.team];
        let i = ev.player2 ? l.indexOf(ev.player2) : -1;
        if (i < 0) i = l.indexOf(null);
        if (i >= 0 && ev.player) { l[i] = ev.player; this.setLineups(this.lineups); this.layout(); }
        break;
      }
      case 'foulOut': {
        const l = this.lineups[ev.team]; const i = l.indexOf(P); if (i >= 0) { l[i] = null; this.setLineups(this.lineups); this.layout(); }
        break;
      }
      case 'periodEnd': case 'final': case 'halftime': this.holder = null; this.flight = null; break;
      default: break;
    }
    if (ev.type === 'rebound' && !ev.offensive) { this.mode = 'half'; this.layout(); }
    if (ev.type === 'steal') { this.mode = 'half'; this.layout(); }
  }

  private slotOf(id: string) { const i = this.lineups[this.off].indexOf(id); return i < 0 ? 2 : i; }
  private flashAt(p: [number, number], text: string, team: 0 | 1, color?: string) { this.flash = { x: p[0], y: p[1], t: 0, text, color: color ?? this.colors[team][0] }; }

  /** Advance animation. dt in seconds of real time, speed multiplier for movement. */
  update(dt: number, speed: number) {
    const v = 6.5 * speed * dt; // metres per frame budget
    for (const d of this.dots.values()) {
      const dx = d.tx - d.x, dy = d.ty - d.y, dist = Math.hypot(dx, dy);
      if (dist > 0.01) { const k = Math.min(1, v / dist); d.x += dx * k; d.y += dy * k; }
      d.jump = Math.max(0, d.jump - dt * 2.5 * speed);
    }
    if (this.flight) {
      const f = this.flight;
      f.t += dt * speed;
      const k = Math.min(1, f.t / f.dur);
      this.ball = { x: f.x0 + (f.x1 - f.x0) * k, y: f.y0 + (f.y1 - f.y0) * k };
      if (k >= 1) {
        const after = f.after; this.flight = null;
        if (after === 'made') { this.netPulse = 1; this.onSfx?.('swish'); }
        else if (after === 'miss') { this.onSfx?.('rim'); this.throwBall([f.x1 + (f.x1 > 14 ? -1.2 : 1.2), f.y1 + (Math.random() - 0.5) * 3], 0.35, 0.4); }
      }
    } else if (this.holder) {
      const h = this.dots.get(this.holder);
      if (h) { this.ball.x += (h.x + 0.3 - this.ball.x) * Math.min(1, dt * 12 * speed); this.ball.y += (h.y + 0.2 - this.ball.y) * Math.min(1, dt * 12 * speed); }
    }
    if (this.flash) { this.flash.t += dt; if (this.flash.t > 1.1) this.flash = null; }
    this.netPulse = Math.max(0, this.netPulse - dt * 2);
  }

  draw(ctx: CanvasRenderingContext2D, cw: number, ch: number) {
    const s = cw / W;
    ctx.save();
    ctx.clearRect(0, 0, cw, ch);
    // floor
    const g = ctx.createLinearGradient(0, 0, 0, ch);
    g.addColorStop(0, '#f1dcb4'); g.addColorStop(1, '#e8cc9a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
    ctx.strokeStyle = 'rgba(120,80,30,0.08)'; ctx.lineWidth = 1;
    for (let y = 0; y < H; y += 0.5) { ctx.beginPath(); ctx.moveTo(0, y * s); ctx.lineTo(cw, y * s); ctx.stroke(); }
    ctx.scale(s, s);
    ctx.lineWidth = 0.06; ctx.strokeStyle = '#fff';
    ctx.strokeRect(0.05, 0.05, W - 0.1, H - 0.1);
    ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(14, H); ctx.stroke();
    ctx.beginPath(); ctx.arc(14, 7.5, 1.8, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(200,16,46,0.18)'; ctx.beginPath(); ctx.arc(14, 7.5, 1.8, 0, Math.PI * 2); ctx.fill();
    if (this.logo) { ctx.fillStyle = 'rgba(17,17,17,0.55)'; ctx.font = 'bold 0.9px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(this.logo, 14, 7.5); }
    for (const side of [0, 1]) {
      const bx = (m: number) => (side === 0 ? m : W - m);
      // paint
      ctx.fillStyle = 'rgba(200,16,46,0.55)';
      const x0 = side === 0 ? 0 : W - 5.8;
      ctx.fillRect(x0, 7.5 - 2.45, 5.8, 4.9);
      ctx.strokeRect(x0, 7.5 - 2.45, 5.8, 4.9);
      ctx.beginPath(); ctx.arc(bx(5.8), 7.5, 1.8, 0, Math.PI * 2); ctx.stroke();
      // three point line
      ctx.beginPath();
      ctx.moveTo(bx(0), 0.9); ctx.lineTo(bx(2.99), 0.9);
      const a = Math.asin(6.6 / 6.75);
      if (side === 0) ctx.arc(RIM, 7.5, 6.75, -a, a); else ctx.arc(W - RIM, 7.5, 6.75, Math.PI + a, Math.PI - a, true);
      ctx.moveTo(bx(2.99), 14.1); ctx.lineTo(bx(0), 14.1);
      ctx.stroke();
      // restricted arc
      ctx.beginPath(); if (side === 0) ctx.arc(RIM, 7.5, 1.25, -Math.PI / 2, Math.PI / 2); else ctx.arc(W - RIM, 7.5, 1.25, Math.PI / 2, Math.PI * 1.5); ctx.stroke();
      // backboard + rim
      ctx.strokeStyle = '#111'; ctx.lineWidth = 0.1;
      ctx.beginPath(); ctx.moveTo(bx(1.2), 6.6); ctx.lineTo(bx(1.2), 8.4); ctx.stroke();
      ctx.strokeStyle = '#e4572e'; ctx.lineWidth = 0.08;
      const pulse = this.netPulse > 0 && this.rimSide() === side ? 0.1 * this.netPulse : 0;
      ctx.beginPath(); ctx.arc(bx(RIM), 7.5, 0.23 + pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.06;
    }
    // players
    const hold = this.holder;
    const base = Math.max(0.42, 8 / s);
    for (const d of this.dots.values()) {
      const [c1, c2] = this.colors[d.team];
      const r = base + d.jump * 0.12;
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(d.x + 0.08, d.y + 0.12, 0.42, 0.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = c1; ctx.strokeStyle = d.id === hold ? '#ffd400' : c2; ctx.lineWidth = d.id === hold ? 0.14 : 0.09;
      ctx.beginPath(); ctx.arc(d.x, d.y - d.jump * 0.25, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = c2; ctx.font = `bold ${(base * 1.05).toFixed(2)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(d.num), d.x, d.y - d.jump * 0.25 + 0.02);
    }
    // ball
    let lift = 0;
    if (this.flight) { const k = Math.min(1, this.flight.t / this.flight.dur); lift = Math.sin(k * Math.PI) * this.flight.arc; }
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.arc(this.ball.x, this.ball.y + 0.1, 0.16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e4572e'; ctx.strokeStyle = '#3a1a0a'; ctx.lineWidth = 0.04;
    ctx.beginPath(); ctx.arc(this.ball.x, this.ball.y - lift, Math.max(0.2, 4.5 / s) + lift * 0.05, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // flash
    if (this.flash) {
      const f = this.flash; const a = 1 - f.t / 1.1;
      ctx.globalAlpha = a; ctx.font = 'bold 0.9px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.lineWidth = 0.15; ctx.strokeStyle = '#fff'; ctx.strokeText(f.text, f.x, f.y - 0.9 - f.t);
      ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y - 0.9 - f.t);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
  private rimSide() { return this.dir(this.off) > 0 ? 1 : 0; }
}
