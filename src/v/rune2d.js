// rune2d.js: the rune as FLAT VECTOR shapes (Ra, 10/1: "the 3D model is a template… go over everything with vectors").
// The 3D layout (gen.js) and a camera rotation give the positions; everything drawn is a flat fill:
//   paper, the orange body, a darker orange for a hole's inner wall, black for the void inside it.
// The exact mark lies in the rune's equatorial plane (z = 0), so tilting it only foreshortens the same path: no seam.
// Spikes rise and sink IN PLACE, only where there is no open hole (Ra, 10/1).

// ── 3D helpers: vectors as [x, y, z], quaternions as [w, x, y, z] ──
const v3 = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sc: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
};
const qAxis = (ax, ang) => { const s = Math.sin(ang / 2), n = v3.norm(ax); return [Math.cos(ang / 2), n[0] * s, n[1] * s, n[2] * s]; };
const qMul = (a, b) => [a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3], a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
  a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1], a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0]];
const qRot = (q, v) => { const [w, x, y, z] = q, u = [x, y, z], t = v3.sc(v3.cross(u, v), 2); return v3.add(v3.add(v, v3.sc(t, w)), v3.cross(u, t)); };
const qAlign = (from, to) => { const a = v3.norm(from), b = v3.norm(to), d = v3.dot(a, b);   // the rotation taking `from` onto `to`
  if (d > .99999) return [1, 0, 0, 0]; if (d < -.99999) return qAxis(Math.abs(a[0]) < .9 ? v3.cross(a, [1, 0, 0]) : v3.cross(a, [0, 1, 0]), Math.PI);
  return qAxis(v3.cross(a, b), Math.acos(d)); };
const qSlerp = (a, b, k) => { let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]; if (d < 0) { b = b.map(x => -x); d = -d; }
  if (d > .9995) { const r = a.map((x, i) => x + (b[i] - x) * k), l = Math.hypot(...r); return r.map(x => x / l); }
  const om = Math.acos(d), s = Math.sin(om); return a.map((x, i) => (Math.sin((1 - k) * om) * x + Math.sin(k * om) * b[i]) / s); };
// the camera quaternion that puts world direction g at the front of the view (+z), rolled by `roll`
const qLook = (g, roll = 0) => qMul(qAxis([0, 0, 1], roll), qAlign(g, [0, 0, 1]));

const WALL = '#B65C3D', VOID = '#0C0B0A';
const RUNE2D = (() => {
  const L = runeLayout();
  const H_N = L.holes.length;
  // hole order by size: the opening groups (A at "every book left open", B through chorus 1, C through the bridge)
  const bySize = L.holes.map((h, i) => i).sort((i, j) => (L.holes[j].a + L.holes[j].b) - (L.holes[i].a + L.holes[i].b));
  const group = new Array(H_N), rank = new Array(H_N);
  bySize.forEach((i, r) => { rank[i] = r; group[i] = r < 58 ? 'A' : r < 92 ? 'B' : 'C'; });
  for (const h of L.holes) h.e2 = v3.cross(h.c, h.e1);
  // the spikes: the cluster teeth (on the membrane between ALL holes) + an urchin of extra spikes for the opening,
  // which sink as holes open near them. Each rises and sinks in place on its own slow cycle.
  let s = 7; const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const spikes = L.teeth.map(q => ({ d: v3.norm(q.c), L: .16 + q.len * 1.6, w: .03 + q.r * .35, per: 7 + 9 * R(), ph: R(), urchin: 0 }));
  for (let i = 0; i < 64; i++) { const z = 1 - 2 * R(), r = Math.sqrt(1 - z * z), a = R() * TAU;
    spikes.push({ d: [Math.cos(a) * r, Math.sin(a) * r, z], L: .65 + .7 * R(), w: .045 + .03 * R(), per: 9 + 8 * R(), ph: R(), urchin: 1 }); }
  // the mark in world units: box (248) → its hollow r 24.2 = 0.2 world, so the mark's centre IS the newborn bubble
  const MS = 24.2 / .2, MARK_A = [8.6, 49.1, 80.1, 115.7, 146.2, 179, 213.4, 235.8, 267, 302.9, 317.9, 346.2].map(a => a * Math.PI / 180);
  const rayOf = a => { let best = 0, bd = 9; MARK_A.forEach((m, j) => { const d = Math.abs(Math.atan2(Math.sin(a - m), Math.cos(a - m))); if (d < bd) { bd = d; best = j; } }); return best; };
  const markW = MARK_PTS.map(([bx, by]) => { const x = (bx - 124) / MS, y = -(by - 124) / MS, a = Math.atan2(y, x); return { x, y, r: Math.hypot(x, y), a, ray: rayOf(a) }; });

  let cam = null;                                          // {q, S, cx, cy, D}
  const toView = v => qRot(cam.q, v);
  const proj = v => { const f = cam.D / (cam.D - v[2]); return [cam.cx + cam.S * v[0] * f, cam.cy - cam.S * v[1] * f, v[2]]; };
  const angd = (a, b) => Math.acos(clamp(v3.dot(a, b), -1, 1));

  // a hole's angular radius in direction th of its own frame, with the fluid wobble
  function holeRho(h, i, th, st) {
    const base = h.a * h.b / Math.hypot(h.b * Math.cos(th), h.a * Math.sin(th));
    const k = st.wob * (.6 + st.loud);
    const wob = 1 + k * (.045 * Math.sin(2 * th + i * 1.3 + st.t * .9) + .035 * Math.sin(3 * th - i * .7 - st.t * 1.3) + .025 * Math.sin(5 * th + i + st.t * 2.1));
    return base * wob * (1 + .07 * Math.sin(st.t * .7 + i * 2.3) + .06 * st.vox) * (st.hs ? st.hs(i) : 1);
  }
  // outline of hole i on a sphere of radius rr, in screen space (points behind the limb pushed onto it)
  function holePts(h, i, rr, open, st, n = 40) {
    const out = [];
    for (let k = 0; k < n; k++) {
      const th = k / n * TAU; let rho = holeRho(h, i, th, st);
      let ra = rho, rb = rho;                                                   // open: slit (thin along e2) → full
      const sl = st.slit[i];
      const u = v3.add(v3.sc(h.e1, Math.cos(th) * (open > 0 ? 1 : .55 * sl)), v3.sc(h.e2, Math.sin(th) * (open > 0 ? open : .05 * sl)));
      const ang = rho * (open > 0 ? (.5 + .5 * open) : 1);
      const d = v3.norm(v3.add(v3.sc(h.c, Math.cos(ang)), v3.sc(v3.norm(u), Math.sin(ang) * Math.hypot(...u))));
      let v = toView(v3.sc(d, rr));
      if (v[2] < 0) { const l = Math.hypot(v[0], v[1]) || 1; v = [v[0] / l * rr, v[1] / l * rr, 0]; }
      out.push(proj(v));
    }
    return out;
  }
  const poly = (ctx, pts) => { ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); };

  function spikeShape(ctx, d, rr, len, w, st) {
    const r0 = toView(v3.sc(d, rr * .96)), r1 = toView(v3.sc(d, rr + len));
    const p0 = proj(r0), p1 = proj(r1); let dx = p1[0] - p0[0], dy = p1[1] - p0[1]; const l = Math.hypot(dx, dy);
    const wp = w * cam.S; if (l < 1) { ctx.moveTo(p0[0] + wp, p0[1]); ctx.arc(p0[0], p0[1], wp, 0, TAU); return; }
    dx /= l; dy /= l; const nx = -dy, ny = dx;
    ctx.moveTo(p0[0] + nx * wp, p0[1] + ny * wp); ctx.lineTo(p1[0], p1[1]); ctx.lineTo(p0[0] - nx * wp, p0[1] - ny * wp); ctx.closePath();
    // the dotted bead ray past the tip (Ra's doodles), only on long spikes
    if (len > .22) for (let b = 1; b <= 3; b++) {
      const q = proj(toView(v3.sc(d, rr + len * (1 + .13 * b)))), br = wp * (.55 - .13 * b) * Math.min(1, len / .5);
      if (br > .6) { ctx.moveTo(q[0] + br, q[1]); ctx.arc(q[0], q[1], br, 0, TAU); }
    }
  }

  // st: { t, q, S, cx, cy, rb, spikes (global 0..1), urchin, teeth, open[i], slit[i], scope, scopeAmt, loud, vox, wob,
  //       mark: {grow, sink[12], amt}, beam(ctx, info) callback }
  function draw(ctx, st, beamCompose) {
    cam = { q: st.q, S: st.S, cx: st.cx, cy: st.cy, D: 9 };
    const rr = st.rb;
    // which holes are open now (for spike clearance and drawing)
    const hv = L.holes.map((h, i) => ({ h, i, o: st.open[i], c: h.c }));
    // spikes: length = base × own rise/sink cycle × music × clearance from open holes
    const front = [], back = [];
    spikes.forEach((sp, j) => {
      const amt = sp.urchin ? st.urchin : st.teeth; if (amt <= 0) return;
      const cyc = (st.t / sp.per + sp.ph) % 1, life = Math.max(0, Math.sin(Math.min(1, cyc / .78) * Math.PI));   // rise, stand, sink; then gone a while
      let clear = 1;
      for (const o of hv) { if (o.o <= 0 && st.slit[o.i] <= 0) continue; const g = angd(sp.d, o.c) - Math.max(o.h.a, o.h.b) * Math.max(o.o, st.slit[o.i] * .6) - sp.w;
        if (g < .08) clear = Math.min(clear, clamp(g / .08)); }
      const vd = toView(sp.d), sa = Math.atan2(vd[1], vd[0]);
      const len = sp.L * amt * clear * Math.pow(life, .7) * (.55 + .75 * st.loud) * (1 + st.spikeScope * ringAt(st.scope, sa)) * (sp.urchin ? 1 : st.toothScale);
      if (len < .01) return;
      (vd[2] < 0 ? back : front).push([sp.d, len, sp.w * Math.min(1, .35 + len / .4)]);
    });
    // the mark, in the plane z = 0 (world), rays grown/sunk per ray, flexed by the scope
    let markBack = null, markFront = null;
    if (st.mark.amt > 0) {
      const pts = markW.map(m => {
        const g = st.mark.grow * (1 - st.mark.sink[m.ray]);
        const rw = m.r <= .2 ? m.r : .2 + (m.r - .2) * g * (1 + st.scopeAmt * ringAt(st.scope, m.a) * smooth01((m.r - .25) / .6));
        const rw2 = rw <= .2 ? rw * rr / .2 : rr + (rw - .2);                   // the hollow scales with the body; rays stand on its surface
        return proj(toView([Math.cos(m.a) * rw2, Math.sin(m.a) * rw2, 0]));
      });
      // split by depth: the far half of the plane draws behind the body. The plane's normal in view decides the halves.
      markBack = pts; markFront = pts;
    }
    const nz = toView([0, 0, 1]);                          // the mark plane's normal in view space
    // ── 1. paper
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
    if (st.bg) st.bg(ctx);
    // ── 2. back spikes, and the mark's far half
    ctx.fillStyle = INK; ctx.beginPath(); for (const [d, len, w] of back) spikeShape(ctx, d, rr, len, w, st); ctx.fill();
    const halfClip = (front) => {                            // the screen half-plane where the mark plane is in front of the body's centre
      const c = proj([0, 0, 0]); const a = toView([1, 0, 0]), b = toView([0, 1, 0]);
      // direction in the plane along which view z increases fastest, projected to the screen
      const gx = a[2], gy = b[2]; if (Math.hypot(gx, gy) < 1e-3) return false;
      const img = (x, y) => [a[0] * x + b[0] * y, -(a[1] * x + b[1] * y)];       // plane coords → screen direction (the affine skew included)
      let [sx, sy] = img(gx, gy), [nx, ny] = img(-gy, gx); const l = Math.hypot(sx, sy) || 1, ln = Math.hypot(nx, ny) || 1;
      sx /= l; sy /= l; nx /= ln; ny /= ln; if (!front) { sx = -sx; sy = -sy; }
      ctx.beginPath(); const F = 6000;
      ctx.moveTo(c[0] + nx * F, c[1] + ny * F); ctx.lineTo(c[0] + nx * F + sx * F, c[1] + ny * F + sy * F);
      ctx.lineTo(c[0] - nx * F + sx * F, c[1] - ny * F + sy * F); ctx.lineTo(c[0] - nx * F, c[1] - ny * F); ctx.closePath(); ctx.clip(); return true;
    };
    if (markBack) { ctx.save(); ctx.globalAlpha = st.mark.amt; const tilted = halfClip(false); ctx.fillStyle = INK; ctx.beginPath(); poly(ctx, markBack); ctx.fill(); ctx.restore(); }
    // ── 3. the body: a disc whose outline flexes with the scope
    const c0 = proj(toView([0, 0, 0])), Rpx = cam.S * rr;
    ctx.fillStyle = INK; ctx.beginPath();
    for (let k = 0; k <= 96; k++) { const a = k / 96 * TAU, r = Rpx * (1 + st.bodyScope * ringAt(st.scope, a) + .012 * st.wob * Math.sin(3 * a + st.t)); const x = c0[0] + Math.cos(a) * r, y = c0[1] - Math.sin(a) * r; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.closePath(); ctx.fill();
    // ── 4. holes: inner wall (darker), then the void; collect the void as the beam's mask; report each visible hole
    const mask = new Path2D(), seen = [];
    const th = .07;
    for (const o of hv) {
      const sl = st.slit[o.i]; if (o.o <= 0 && sl <= 0) continue;
      const cv = toView(o.c); if (cv[2] < -Math.sin(Math.max(o.h.a, o.h.b))) continue;      // fully behind
      const outer = holePts(o.h, o.i, rr, o.o, st), inner = holePts(o.h, o.i, rr * (1 - th), o.o, st);
      ctx.fillStyle = WALL; ctx.beginPath(); poly(ctx, outer); ctx.fill();
      ctx.save(); ctx.beginPath(); poly(ctx, outer); ctx.clip(); ctx.fillStyle = VOID; ctx.beginPath(); poly(ctx, inner); ctx.fill(); ctx.restore();
      const mp = new Path2D(); poly(mp, inner); mask.addPath(mp);
      const pc = proj(v3.sc(cv, rr)), rad = cam.S * rr * Math.sin((o.h.a + o.h.b) / 2) * clamp(o.o) * clamp(cv[2] * 1.5 + .3);
      seen.push({ i: o.i, x: pc[0], y: pc[1], r: rad, rmin: cam.S * rr * Math.sin(Math.min(o.h.a, o.h.b)) * clamp(o.o) * clamp(cv[2] * 1.5 + .3), z: cv[2], o: o.o, rank: rank[o.i], path: mp });
    }
    // ── 5. the beam, masked to the voids (it never draws on the skin)
    if (beamCompose) beamCompose(mask, seen);
    // ── 6. front spikes and the mark's near half
    ctx.fillStyle = INK; ctx.beginPath(); for (const [d, len, w] of front) spikeShape(ctx, d, rr, len, w, st); ctx.fill();
    if (markFront && Math.abs(nz[2]) < .999) { ctx.save(); ctx.globalAlpha = st.mark.amt; if (halfClip(true)) { ctx.fillStyle = INK; ctx.beginPath(); poly(ctx, markFront); ctx.fill(); } ctx.restore(); }
    return seen;
  }
  const smooth01 = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  return { L, draw, group, rank, bySize, proj: v => proj(toView(v)), toView: v => toView(v), spikes };
})();
