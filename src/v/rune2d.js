// rune2d.js: the rune as FLAT VECTOR shapes over the 3D template (Ra, 10/1: "the 3D model is a template… go over
// everything with vectors"). Draft 2: a real perspective camera that can fly through a hole into the sphere.
// Ra on draft 1: flat black voids read "like screens on a surface"; the inside should be depths filled with text and
// structures, behind a DARK OPACITY LAYER. So every frame is drawn in layers:
//   paper → back spikes → the INTERIOR (the back wall's inner surface with its holes showing paper, a dark fog over it,
//   the nested inner shell, struts vibrating on the vocal scope, the beam's planes of text) → the holes' inner walls →
//   the front shell with its holes cut out → front spikes.
// Spikes rise and sink IN PLACE, only where there's no open hole. Holes are capped so they never overlap.

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
const qAlign = (from, to) => { const a = v3.norm(from), b = v3.norm(to), d = v3.dot(a, b);
  if (d > .99999) return [1, 0, 0, 0]; if (d < -.99999) return qAxis(Math.abs(a[0]) < .9 ? v3.cross(a, [1, 0, 0]) : v3.cross(a, [0, 1, 0]), Math.PI);
  return qAxis(v3.cross(a, b), Math.acos(d)); };
const qSlerp = (a, b, k) => { let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]; if (d < 0) { b = b.map(x => -x); d = -d; }
  if (d > .9995) { const r = a.map((x, i) => x + (b[i] - x) * k), l = Math.hypot(...r); return r.map(x => x / l); }
  const om = Math.acos(d), s = Math.sin(om); return a.map((x, i) => (Math.sin((1 - k) * om) * x + Math.sin(k * om) * b[i]) / s); };
const qConj = q => [q[0], -q[1], -q[2], -q[3]];
const qLook = (g, roll = 0) => qMul(qAxis([0, 0, 1], roll), qAlign(g, [0, 0, 1]));   // world dir g to the front, rolled

const FPX = 1500, NEAR = .025;                              // focal length (px); near plane (world units)
const WALL = '#B65C3D', BACKWALL = '#8A4530', FOG = 'rgba(15,10,8,.86)', INNER = '#C9673F';
const mkCanvas = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };

const RUNE2D = (() => {
  const L = runeLayout(), holes = L.holes, NH = holes.length;
  const ang = (a, b) => Math.acos(clamp(v3.dot(a, b), -1, 1));
  const bySize = holes.map((h, i) => i).sort((i, j) => (holes[j].a + holes[j].b) - (holes[i].a + holes[i].b));
  const group = new Array(NH), rank = new Array(NH);
  bySize.forEach((i, r) => { rank[i] = r; group[i] = r < 58 ? 'A' : r < 92 ? 'B' : 'C'; });
  for (const h of holes) h.e2 = v3.cross(h.c, h.e1);
  // Ra: "holes clipping into each other". Each hole's radius toward each neighbour, grown by the most the animation can
  // add (+18%), must fit inside the gap: cap each hole's scale so it never touches another
  const rhoDir = (h, d) => { const th = Math.atan2(v3.dot(d, h.e2), v3.dot(d, h.e1)); return h.a * h.b / Math.hypot(h.b * Math.cos(th), h.a * Math.sin(th)); };
  const cap = holes.map((h, i) => { let m = 1; holes.forEach((g, j) => { if (j === i) return; const d = ang(h.c, g.c); if (d > 1.4) return;
    const k = d * .94 / (1.18 * (rhoDir(h, g.c) + rhoDir(g, h.c))); if (k < m) m = k; }); return Math.max(.35, m); });
  // the spikes: cluster teeth (on the membrane between ALL holes) + an urchin for the opening, + the mark's 12 rays as spikes
  let s = 7; const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const spikes = L.teeth.map(q => ({ d: v3.norm(q.c), L: .16 + q.len * 1.6, w: .03 + q.r * .35, per: 6 + 7 * R(), ph: R(), kind: 'tooth' }));
  // the urchin: fewer, and the first of them near the mark's own plane, between its rays, so the starburst first reads as
  // growing more rays and only becomes 3D as it turns
  for (let i = 0; i < 30; i++) { const z = i < 14 ? (R() - .5) * .35 : 1 - 2 * R(), r = Math.sqrt(1 - z * z), a = i < 14 ? (i + .5) / 14 * TAU + (R() - .5) * .2 : R() * TAU;
    spikes.push({ d: [Math.cos(a) * r, Math.sin(a) * r, z], L: .55 + .45 * R(), w: .04 + .02 * R(), per: 9 + 6 * R(), ph: R(), kind: 'urchin', early: i < 14 }); }
  // the exact mark in world units: box 248 → its hollow r 24.2 = 0.2 world (the mark's centre IS the newborn bubble)
  const MS = 24.2 / .2, MARK_A = [8.6, 49.1, 80.1, 115.7, 146.2, 179, 213.4, 235.8, 267, 302.9, 317.9, 346.2].map(a => a * Math.PI / 180);
  const MARK_R = [118.4, 121.1, 116.1, 129.3, 119.9, 117.8, 111.6, 117, 118, 116.5, 121.1, 120.5];
  const rayOf = a => { let best = 0, bd = 9; MARK_A.forEach((m, j) => { const d = Math.abs(Math.atan2(Math.sin(a - m), Math.cos(a - m))); if (d < bd) { bd = d; best = j; } }); return best; };
  const markW = MARK_PTS.map(([bx, by]) => { const x = (bx - 124) / MS, y = -(by - 124) / MS, a = Math.atan2(y, x); return { x, y, r: Math.hypot(x, y), a, ray: rayOf(a) }; });
  // Ra: "use just starburst style spikes throughout". Each of the mark's 12 rays, cut from the official path into a width
  // profile (left and right half-widths along the ray, world units). The mark IS these 12 spikes on the body from frame 0,
  // and every other spike in the film is drawn with one of the same profiles.
  const PROF = MARK_A.map((a, j) => {
    const dx = Math.cos(a), dy = Math.sin(a), N = 22, u0 = .2;
    let umax = 0; markW.forEach(m => { if (m.ray === j) umax = Math.max(umax, m.x * dx + m.y * dy); });
    const prof = []; let pl = .03, pr = .03;
    for (let k = 0; k <= N; k++) {
      const u = u0 + (umax - u0) * Math.min(k / N, .985); let vl = 9, vr = 9;
      for (let i = 0; i < markW.length; i++) { const A = markW[i], Bp = markW[(i + 1) % markW.length];
        const ua = A.x * dx + A.y * dy, ub = Bp.x * dx + Bp.y * dy; if ((ua - u) * (ub - u) > 0 || ua === ub) continue;
        const f = (u - ua) / (ub - ua), v = (-A.x * dy + A.y * dx) + ((-Bp.x * dy + Bp.y * dx) - (-A.x * dy + A.y * dx)) * f;
        if (v > 0 && v < vl) vl = v; if (v < 0 && -v < vr) vr = -v; }        // the crossings nearest the ray's axis: its own edges
      if (vl > 1) vl = pl; if (vr > 1) vr = pr; pl = vl; pr = vr; prof.push([(u - u0) / (umax - u0), vl, vr]);
    }
    prof.push([1, 0, 0]); return { len: umax - u0, prof };
  });
  MARK_A.forEach((a, j) => spikes.push({ d: [Math.cos(a), Math.sin(a), 0], L: PROF[j].len, w: 1, per: 1e9, ph: 0, kind: 'mark', j }));
  // the other spikes use the same ray outlines minus the junction flare at the root (the mark's rays meet there)
  const PROF2 = PROF.map(p => { const pr = p.prof.filter(q => q[0] >= .14).map(q => [(q[0] - .14) / .86, q[1], q[2]]); return { len: p.len, prof: pr }; });
  spikes.forEach((sp, k) => { if (sp.kind !== 'mark') { sp.j = 12 + k % 12; sp.w = sp.w / .045 * .55; } });
  PROF.push(...PROF2);
  // the struts: spokes from the inner shell to the outer, along membrane directions (the teeth roots, thinned)
  const struts = L.teeth.filter((q, i) => i % 6 === 0).map((q, k) => ({ d: v3.norm(q.c), k }));

  let cam = null, lastInfo = null;                          // { q, Dc, cx, cy }
  const toView = v => qRot(cam.q, v);
  const proj = v => { const dz = cam.Dc - v[2]; if (dz < NEAR) return null; return [cam.cx + FPX * v[0] / dz, cam.cy - FPX * v[1] / dz, dz]; };
  const P = w => proj(toView(w));

  function holeRho(h, i, th, st) {
    const base = h.a * h.b / Math.hypot(h.b * Math.cos(th), h.a * Math.sin(th)) * cap[i];
    const k = st.wob * (.6 + st.loud);
    const wob = 1 + k * (.035 * Math.sin(2 * th + i * 1.3 + st.t * .9) + .025 * Math.sin(3 * th - i * .7 - st.t * 1.3) + .02 * Math.sin(5 * th + i + st.t * 2.1));
    return base * wob * (1 + .05 * Math.sin(st.t * .7 + i * 2.3) + .05 * st.vox) * (st.hs ? st.hs(i) : 1);
  }
  // a hole's outline on the sphere of radius rr: side 'front' clamps points past the limb onto it, 'back' the reverse
  function holePts(h, i, rr, st, side, z0, n = 40, rhoMul = null) {
    const open = st.open[i], sl = st.slit[i], out = [];
    for (let k = 0; k < n; k++) {
      const th = k / n * TAU, rho = holeRho(h, i, th, st) * (rhoMul ? rhoMul(th) : 1);
      const ue = open > 0 ? Math.cos(th) : .55 * sl * Math.cos(th), uf = open > 0 ? open * Math.sin(th) : .05 * sl * Math.sin(th);
      const u = v3.add(v3.sc(h.e1, ue), v3.sc(h.e2, uf)), ul = Math.hypot(...u) || 1e-6, a = rho * (open > 0 ? .5 + .5 * open : 1) * ul;
      const d = v3.add(v3.sc(h.c, Math.cos(a)), v3.sc(u, Math.sin(a) / ul));
      let v = toView(v3.sc(d, rr));
      if (side === 'front' && v[2] < z0) { const l = Math.hypot(v[0], v[1]) || 1, rl = Math.sqrt(Math.max(0, rr * rr - z0 * z0)); v = [v[0] / l * rl, v[1] / l * rl, z0]; }
      if (side === 'back' && v[2] > z0) { const l = Math.hypot(v[0], v[1]) || 1, rl = Math.sqrt(Math.max(0, rr * rr - z0 * z0)); v = [v[0] / l * rl, v[1] / l * rl, z0]; }
      const p = proj(v); if (p) out.push(p);
    }
    return out;
  }
  const poly = (ctx, pts) => { if (pts.length < 3) return; ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); };

  // a spike in the starburst's own style: profile j along the spike, its width facing the camera (left side = the
  // ray's left, so the 12 mark rays are the exact mark when face-on)
  function spikeShape(ctx, d, rr, len, ws, j) {
    const pr = PROF[j].prof, p0 = P(v3.sc(d, rr * .98)), p1 = P(v3.sc(d, rr + len)); if (!p0 || !p1) return;
    let sx = p1[0] - p0[0], sy = p1[1] - p0[1]; const l = Math.hypot(sx, sy);
    if (l < 1) { const wp = ws * .03 * FPX / p0[2]; ctx.moveTo(p0[0] + wp, p0[1]); ctx.arc(p0[0], p0[1], wp, 0, TAU); return; }
    const pm = pr[Math.floor(pr.length * .45)], w0 = ws * Math.max(pm[1], pm[2]) * FPX / p0[2];   // the shaft's width, not the root's (the mark's root is its junction)
    if (l < w0 * 1.6) { ctx.moveTo(p0[0] + w0, p0[1]); ctx.arc(p0[0], p0[1], w0, 0, TAU); return; }   // nearly end-on: its round end
    sx /= l; sy /= l; const lx = sy, ly = -sx, L = [], R = [];
    for (const [u, vl, vr] of pr) { const c = P(v3.sc(d, rr + u * len)); if (!c) continue; const k = ws * FPX / c[2];
      L.push([c[0] + lx * vl * k, c[1] + ly * vl * k]); R.push([c[0] - lx * vr * k, c[1] - ly * vr * k]); }
    if (L.length < 2) return; ctx.moveTo(L[0][0], L[0][1]); for (const q of L) ctx.lineTo(q[0], q[1]); for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]); ctx.closePath();
  }
  // the plane helper: set ctx's transform so local px map onto a plane in the WORLD (centre, axes e1 → right, e2 → up),
  // 1 local px = `unit` world units. Returns the projected centre (or null). Text drawn there turns with the object.
  function plane(ctx, c, e1, e2, unit) {
    const o = P(c); if (!o) return null; const k = unit * 40;
    let a = P(v3.add(c, v3.sc(e1, k))), b = P(v3.add(c, v3.sc(e2, -k))); if (!a || !b) return null;
    if (a[0] < o[0]) { e1 = v3.sc(e1, -1); e2 = v3.sc(e2, -1); a = P(v3.add(c, v3.sc(e1, k))); b = P(v3.add(c, v3.sc(e2, -k))); if (!a || !b) return null; }
    ctx.setTransform((a[0] - o[0]) / 40, (a[1] - o[1]) / 40, (b[0] - o[0]) / 40, (b[1] - o[1]) / 40, o[0], o[1]);
    return o;
  }

  const I = mkCanvas(), IC = I.getContext('2d'), Wc = mkCanvas(), WC = Wc.getContext('2d'), Sc = mkCanvas(), SC = Sc.getContext('2d'), Bc = mkCanvas(), BC = Bc.getContext('2d');
  const reset = c => { c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.filter = 'none'; };

  // st: { t, q, Dc, cx, cy, rb, open[], slit[], loud, vox, wob, scope, scopeV, spikeScope, bodyScope, urchin, teeth, toothScale,
  //       mark: { amt (flat path), spikes (0..1: the rays as 3D spikes), grow, sink[12], rayAmp }, hs, bg, inner, rimScope }
  // hooks.beam(BC, api): the film's text and lines, drawn on the beam layer (composited with glow inside the object)
  function draw(ctx, st, hooks) {
    cam = { q: st.q, Dc: st.Dc, cx: st.cx, cy: st.cy };
    const rr = st.rb, inside = Math.abs(cam.Dc) <= rr * 1.03, z0 = inside ? -9 : rr * rr / cam.Dc;
    if (cam.Dc < -rr * 1.03) {                                       // out the far side, facing away: only the world (the sunlight)
      reset(ctx); ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H); if (st.bg) st.bg(ctx);
      const axes = { right: qRot(qConj(cam.q), [1, 0, 0]), up: qRot(qConj(cam.q), [0, 1, 0]) };
      if (hooks && hooks.outside) { hooks.outside(ctx, { plane: (c, e1, e2, unit) => plane(ctx, c, e1, e2, unit), P, axes, rr, inside: false, Dc: cam.Dc, beyond: true }); reset(ctx); }
      lastInfo = { inside: false, beyond: true, c0: null, limbPx: 0 }; return [];
    }
    const rl = Math.sqrt(Math.max(0, rr * rr - z0 * z0)), limbPx = inside ? 1e5 : FPX * rl / (cam.Dc - z0);
    const c0 = P([0, 0, 0]) || [cam.cx, cam.cy, 1];
    const limbPath = c => { c.beginPath(); for (let k = 0; k <= 120; k++) { const a = k / 120 * TAU, r = limbPx * (1 + st.bodyScope * (ringAt(st.spec, a) - st.specMean) * 2 + .01 * st.wob * Math.sin(3 * a + st.t));
      const x = c0[0] + Math.cos(a) * r, y = c0[1] - Math.sin(a) * r; k ? c.lineTo(x, y) : c.moveTo(x, y); } c.closePath(); };
    const openH = holes.map((h, i) => Math.max(st.open[i], st.slit[i] * .12));   // a slit is thin: it barely clears anything
    // ── spikes: own rise/sink cycle × the music (in and out with the scope, hard) × clearance from open holes
    const front = [], back = [];
    if (!inside) spikes.forEach(sp => {
      let amt, life = 1, len;
      if (sp.kind === 'mark') { amt = 1; }
      else { amt = sp.kind === 'urchin' ? st.urchin : st.teeth; if (amt <= 0) return;
        const cyc = (st.t / sp.per + sp.ph) % 1; life = Math.max(0, Math.sin(Math.min(1, cyc / .75) * Math.PI)); }
      let clear = 1;
      for (let i = 0; i < NH; i++) { if (openH[i] <= 0) continue; const g = ang(sp.d, holes[i].c) - rhoDir(holes[i], sp.d) * cap[i] * 1.1 * openH[i] - .012;
        if (g < .03) clear = Math.min(clear, clamp(g / .03)); if (clear <= 0) return; }
      const vd = toView(sp.d), sa = Math.atan2(vd[1], vd[0]);
      if (sp.kind === 'mark') len = sp.L * st.mark.grow * (1 - st.mark.sink[sp.j]) * clamp(1 + st.mark.rayAmp * (ringAt(st.spec, MARK_A[sp.j]) - st.specMean), .1, 2.3) * amt * clear;
      else len = sp.L * amt * clear * Math.pow(life, .7) * clamp(.3 + 1.5 * ringAt(st.spec, sa), .06, 2.2) * (sp.kind === 'urchin' ? 1 : st.toothScale) * (st.boost ? st.boost(sa) : 1);
      if (len < .01) return;
      (vd[2] < z0 / rr ? back : front).push([sp.d, len, sp.kind === 'mark' ? Math.pow(st.mark.grow, .4) : sp.w * Math.min(.9, .3 + len / .9), sp.j]);
    });
    const axes = { right: qRot(qConj(cam.q), [1, 0, 0]), up: qRot(qConj(cam.q), [0, 1, 0]) };
    // ── 1. paper; 2. back spikes
    reset(ctx); ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H); if (st.bg) st.bg(ctx);
    if (hooks && hooks.outside) { hooks.outside(ctx, { plane: (c, e1, e2, unit) => plane(ctx, c, e1, e2, unit), P, axes, rr, inside, Dc: cam.Dc }); reset(ctx); }
    ctx.fillStyle = INK; for (const [d, len, w, j] of back) { ctx.beginPath(); spikeShape(ctx, d, rr, len, w, j); ctx.fill(); }
    // ── 3. the interior
    reset(IC); IC.clearRect(0, 0, W, H);
    IC.save(); if (!inside) { limbPath(IC); IC.clip(); }
    IC.fillStyle = BACKWALL; IC.fillRect(0, 0, W, H);

    IC.fillStyle = FOG; IC.fillRect(0, 0, W, H);                                                 // the dark opacity layer
    for (let i = 0; i < NH; i++) { if (st.open[i] <= 0 && st.slit[i] <= 0) continue; const cv = toView(holes[i].c);
      if (!inside && cv[2] > z0 / rr + .05) continue;
      const pts = holePts(holes[i], i, rr, st, inside ? 'none' : 'back', z0, 28); if (pts.length < 3) continue;
      const pc = P(v3.sc(holes[i].c, rr)), dz = pc ? pc[2] : 3;                                 // windows onto the world behind: dim far off,
      IC.globalAlpha = inside ? .07 : clamp(.13 + .5 * clamp((.9 - dz) / .7)); IC.fillStyle = PAPER; IC.beginPath(); poly(IC, pts); IC.fill(); }   // bright up close
    IC.globalAlpha = 1;
    // the nested inner shell: the same rune, smaller, turning its own way, outline flexing with the voice
    const ri = rr * .42;
    if (st.inner > 0 && cam.Dc > ri * 1.05) {
      const q0 = cam.q; cam = { ...cam, q: qMul(cam.q, qAxis([.3, 1, .2], st.t * .11)) };
      const zi = ri * ri / cam.Dc, rli = Math.sqrt(Math.max(0, ri * ri - zi * zi)), lp = FPX * rli / (cam.Dc - zi), ci = P([0, 0, 0]);
      const ia = st.inner * (inside ? .16 : .3); if (ci) { IC.globalAlpha = ia; IC.fillStyle = INNER; IC.beginPath();
        for (let k = 0; k <= 90; k++) { const a = k / 90 * TAU, r = lp * (1 + .015 * ringAt(st.scopeV, a)); const x = ci[0] + Math.cos(a) * r, y = ci[1] - Math.sin(a) * r; k ? IC.lineTo(x, y) : IC.moveTo(x, y); }
        IC.closePath(); IC.fill(); IC.globalAlpha = ia * 1.6; IC.fillStyle = '#0E0907';
        for (let i = 0; i < NH; i++) { if (st.open[i] <= 0 || toView(holes[i].c)[2] * ri < zi) continue; const pts = holePts(holes[i], i, ri, st, 'front', zi, 20); IC.beginPath(); poly(IC, pts); IC.fill(); }
        IC.globalAlpha = 1; }
      cam = { ...cam, q: q0 };
    }
    // struts: spokes from the inner shell to the outer, vibrating like strings on the vocal scope
    if (st.inner > 0) {
      IC.strokeStyle = '#D9774F'; IC.lineCap = 'round';
      for (const sr of struts) { const pts = [], side = v3.norm(v3.cross(sr.d, Math.abs(sr.d[1]) < .9 ? [0, 1, 0] : [1, 0, 0]));
        for (let k = 0; k <= 14; k++) { const u = k / 14, base = v3.sc(sr.d, lerp(ri, rr * .93, u));
          const amp = .018 * rr * Math.sin(u * Math.PI * (1 + sr.k % 3)) * ringAt(st.scopeV, sr.k * .9 + u * 2) * (.3 + st.vox);
          const p = P(v3.add(base, v3.sc(side, amp))); if (p) pts.push(p); }
        if (pts.length < 2) continue; const dz = pts[pts.length >> 1][2];
        IC.globalAlpha = clamp(.7 / dz) * .45 * st.inner; IC.lineWidth = Math.max(1, FPX * .006 * rr / dz);
        IC.beginPath(); IC.moveTo(pts[0][0], pts[0][1]); for (const p of pts) IC.lineTo(p[0], p[1]); IC.stroke(); }
      IC.globalAlpha = 1;
    }
    // the beam: the film's planes of text and lines, plus a vocal oscilloscope round the inside of every front hole
    reset(BC); BC.clearRect(0, 0, W, H);
    const seen = [];
    for (let i = 0; i < NH; i++) { if (st.open[i] <= .05) continue; const cv = toView(holes[i].c);
      if (!inside && cv[2] < z0 / rr) continue; const pc = P(v3.sc(holes[i].c, rr)); if (!pc) continue;
      seen.push({ i, x: pc[0], y: pc[1], z: cv[2], dz: pc[2], r: FPX * rr * Math.sin((holes[i].a + holes[i].b) / 2 * cap[i]) * st.open[i] / pc[2] });
      if (!inside && st.rimScope > 0) {
        const pts = holePts(holes[i], i, rr * .97, st, 'front', z0 * .97, 64, th => .8 + .1 * ringAt(st.scopeV, th + i));
        if (pts.length > 3) { BC.globalAlpha = .38 * st.rimScope; BC.strokeStyle = ORG; BC.lineWidth = Math.max(1, 3 / pc[2]); BC.beginPath(); poly(BC, pts); BC.stroke(); BC.globalAlpha = 1; }
      }
    }
    const api = { plane: (c, e1, e2, unit) => plane(BC, c, e1, e2, unit), P, toView, rr, inside, seen, holes, cap, axes, Dc: cam.Dc,
      holePlane: (i, depth, unit) => { const h = holes[i], ax = h.a >= h.b ? h.e1 : h.e2, ay = h.a >= h.b ? h.e2 : v3.sc(h.e1, -1);
        return plane(BC, v3.sc(h.c, rr * (1 - depth)), ax, ay, unit); },
      holeUnit: (i, depth = .12) => rr * (1 - depth) * Math.sin(Math.min(holes[i].a, holes[i].b) * cap[i]) * .9 / 500 };
    if (hooks && hooks.beam) hooks.beam(BC, api);
    reset(BC);
    IC.globalCompositeOperation = 'lighter'; IC.filter = 'blur(22px)'; IC.globalAlpha = .5; IC.drawImage(Bc, 0, 0); IC.filter = 'blur(6px)'; IC.globalAlpha = .6; IC.drawImage(Bc, 0, 0);
    IC.filter = 'none'; IC.globalAlpha = 1; IC.drawImage(Bc, 0, 0); IC.globalCompositeOperation = 'source-over';
    if (st.warm > .005) { IC.globalCompositeOperation = 'lighter'; IC.globalAlpha = Math.min(.55, st.warm); IC.fillStyle = '#C8501F'; IC.fillRect(0, 0, W, H); IC.globalAlpha = 1; IC.globalCompositeOperation = 'source-over'; }
    IC.restore();
    ctx.drawImage(I, 0, 0);
    if (!inside) {
      // ── 4. the holes' inner walls (the shell's thickness), under 5. the front shell with its holes cut out
      reset(WC); WC.clearRect(0, 0, W, H); reset(SC); SC.clearRect(0, 0, W, H);
      SC.fillStyle = INK; limbPath(SC); SC.fill(); SC.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < NH; i++) { if (st.open[i] <= 0 && st.slit[i] <= 0) continue; const cv = toView(holes[i].c); if (cv[2] < z0 / rr - Math.sin(Math.max(holes[i].a, holes[i].b) * cap[i] * 1.2)) continue;   // wholly behind the limb (unit-sphere terms: the 3:51 bug mixed units)
        const outer = holePts(holes[i], i, rr, st, 'front', z0), inner = holePts(holes[i], i, rr * .93, st, 'front', z0 * .93);
        if (outer.length < 3) continue;
        SC.beginPath(); poly(SC, outer); SC.fill();
        WC.globalCompositeOperation = 'source-over'; WC.fillStyle = WALL; WC.beginPath(); poly(WC, outer); WC.fill();
        if (inner.length > 2) { WC.globalCompositeOperation = 'destination-out'; WC.beginPath(); poly(WC, inner); WC.fill(); } }
      reset(WC); reset(SC);
      ctx.save(); limbPath(ctx); ctx.clip(); ctx.drawImage(Wc, 0, 0); ctx.restore();
      ctx.drawImage(Sc, 0, 0);
      // ── 6. front spikes
      ctx.fillStyle = INK; for (const [d, len, w, j] of front) { ctx.beginPath(); spikeShape(ctx, d, rr, len, w, j); ctx.fill(); }
    }
    lastInfo = { inside, beyond: false, c0, limbPx };
    return seen;
  }
  return { info: () => lastInfo, L, draw, group, rank, bySize, cap, spikes, P: w => P(w) };
})();
