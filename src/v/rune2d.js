// rune2d.js: the rune as FLAT VECTOR shapes over the 3D template (Ra, 10/1: "the 3D model is a template… go over
// everything with vectors"). Draft 5: a FREE camera (a position and an orientation), so it can fly in at an angle, orbit
// between the shells and leave through a hole obliquely (Ra's flythrough). Every frame is drawn in layers:
//   paper → (outside text) → back spikes → the INTERIOR (the back wall's inner surface with its holes showing paper, a dark
//   fog over it, the nested inner shell, struts on the vocal scope, the beam's planes of text) → the holes' inner walls →
//   the front shell with its holes cut out → front spikes.
// Spikes are the mark's own 12 rays, cut straight from the official path (exact when face-on), and rise and sink IN PLACE,
// only where there's no open hole. Holes are capped so they never overlap.

// ── 3D helpers: vectors as [x, y, z], quaternions as [w, x, y, z] ──
const v3 = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], sc: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], len: a => Math.hypot(a[0], a[1], a[2]),
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  lerp: (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k],
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
// a view rotation from a forward direction and an up hint (camera looks down its own -z)
const qFrom = (fwd, upHint) => { const z = v3.sc(v3.norm(fwd), -1), x = v3.norm(v3.cross(upHint, z)), y = v3.cross(z, x);
  const m00 = x[0], m01 = x[1], m02 = x[2], m10 = y[0], m11 = y[1], m12 = y[2], m20 = z[0], m21 = z[1], m22 = z[2], tr = m00 + m11 + m22;   // rows = world→view
  let w, qx, qy, qz;
  if (tr > 0) { const S = Math.sqrt(tr + 1) * 2; w = .25 * S; qx = (m21 - m12) / S; qy = (m02 - m20) / S; qz = (m10 - m01) / S; }
  else if (m00 > m11 && m00 > m22) { const S = Math.sqrt(1 + m00 - m11 - m22) * 2; w = (m21 - m12) / S; qx = .25 * S; qy = (m01 + m10) / S; qz = (m02 + m20) / S; }
  else if (m11 > m22) { const S = Math.sqrt(1 + m11 - m00 - m22) * 2; w = (m02 - m20) / S; qx = (m01 + m10) / S; qy = .25 * S; qz = (m12 + m21) / S; }
  else { const S = Math.sqrt(1 + m22 - m00 - m11) * 2; w = (m10 - m01) / S; qx = (m02 + m20) / S; qy = (m12 + m21) / S; qz = .25 * S; }
  return [w, qx, qy, qz]; };

const FPX = 1500, NEAR = .02;                               // focal length (px); near plane (world units)
const WALL = '#B65C3D', BACKWALL = '#8A4530', FOG = 'rgba(15,10,8,.86)', INNER = '#C9673F';
const mkCanvas = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };

const RUNE2D = (() => {
  const DBG = typeof location !== 'undefined' && location.search.includes('dbg');
  const dbgFill = (side, j) => DBG ? (j < 12 && side ? '#2a9d3a' : side === 'front' ? '#d02020' : '#2050d0') : INK;
  const L = runeLayout(), holes = L.holes, NH = holes.length;
  const ang = (a, b) => Math.acos(clamp(v3.dot(a, b), -1, 1));
  const bySize = holes.map((h, i) => i).sort((i, j) => (holes[j].a + holes[j].b) - (holes[i].a + holes[i].b));
  const group = new Array(NH), rank = new Array(NH);
  bySize.forEach((i, r) => { rank[i] = r; group[i] = r < 58 ? 'A' : r < 92 ? 'B' : 'C'; });
  for (const h of holes) h.e2 = v3.cross(h.c, h.e1);
  // holes never touch: each hole's radius toward each neighbour, grown by the most the animation adds (+18%), fits the gap
  const rhoDir = (h, d) => { const th = Math.atan2(v3.dot(d, h.e2), v3.dot(d, h.e1)); return h.a * h.b / Math.hypot(h.b * Math.cos(th), h.a * Math.sin(th)); };
  const cap = holes.map((h, i) => { let m = 1; holes.forEach((g, j) => { if (j === i) return; const d = ang(h.c, g.c); if (d > 1.4) return;
    const k = d * .94 / (1.18 * (rhoDir(h, g.c) + rhoDir(g, h.c))); if (k < m) m = k; }); return Math.max(.35, m); });
  // ── the mark's 12 rays as exact polygons, cut straight from the official path (Ra: "starburst style spikes throughout").
  // Local coordinates per ray: u along it from the centre, v to its left (world units: the mark's hollow r 24.2 = 0.2).
  const MS = 24.2 / .2, MARK_A = [8.6, 49.1, 80.1, 115.7, 146.2, 179, 213.4, 235.8, 267, 302.9, 317.9, 346.2].map(a => a * Math.PI / 180);
  const rayOf = a => { let best = 0, bd = 9; MARK_A.forEach((m, j) => { const d = Math.abs(Math.atan2(Math.sin(a - m), Math.cos(a - m))); if (d < bd) { bd = d; best = j; } }); return best; };
  const MW = MARK_PTS.map(([bx, by]) => { const x = (bx - 124) / MS, y = -(by - 124) / MS; return { x, y, ray: rayOf(Math.atan2(y, x)) }; });
  // Split the outline at its 12 notches (the innermost points, between rays) and close each ray through the centre: the 12
  // wedges together ARE the mark, junction included.
  const RAYS = (() => {
    const n = MW.length, r = MW.map(m => Math.hypot(m.x, m.y)), th = MW.map(m => Math.atan2(m.y, m.x)), notch = [];
    for (const i of r.map((v, i) => i).sort((a, b) => r[a] - r[b])) {
      if (notch.length === 12) break; if (notch.every(k => Math.abs(Math.atan2(Math.sin(th[i] - th[k]), Math.cos(th[i] - th[k]))) > .26)) notch.push(i); }
    notch.sort((a, b) => a - b);
    const out = new Array(12);
    notch.forEach((s0, q) => { const s1 = notch[(q + 1) % 12], seg = []; for (let k = s0; ; k = (k + 1) % n) { seg.push(MW[k]); if (k === s1) break; }
      const tip = seg.reduce((m, p) => Math.hypot(p.x, p.y) > Math.hypot(m.x, m.y) ? p : m), j = rayOf(Math.atan2(tip.y, tip.x)), a = MARK_A[j], dx = Math.cos(a), dy = Math.sin(a);
      const pts = [[0, 0], ...seg.map(m => [m.x * dx + m.y * dy, -m.x * dy + m.y * dx])];
      const umax = Math.max(...pts.map(p => p[0])), shaft = pts.filter(p => p[0] > .2 + (umax - .2) * .35 && p[0] < .2 + (umax - .2) * .6);
      out[j] = { pts, len: umax - .2, half: Math.max(.01, ...shaft.map(p => Math.abs(p[1]))) }; });
    return out;
  })();
  // the other spikes use the same outlines without the junction at the root, so they stand alone on the skin
  RAYS.push(...RAYS.map(r => { const pts = r.pts.filter(p => p[0] >= .24);
    pts.push([.12, pts[pts.length - 1][1]], [.12, pts[0][1]]);   // the root runs straight down into the body: no flat cut floating off the skin
    return { pts, len: r.len, half: r.half }; }));
  // the spikes: cluster teeth (on the membrane between ALL holes), an urchin for the opening, the mark's own 12 rays
  let s = 7; const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const spikes = L.teeth.map((q, k) => ({ d: v3.norm(q.c), L: .16 + q.len * 1.6, w: (.03 + q.r * .35) / .045 * .55, per: 6 + 7 * R(), ph: R(), kind: 'tooth', j: 12 + k % 12 }));
  for (let i = 0; i < 30; i++) { const z = i < 14 ? (R() - .5) * .35 : 1 - 2 * R(), r = Math.sqrt(1 - z * z), a = i < 14 ? (i + .5) / 14 * TAU + (R() - .5) * .2 : R() * TAU;
    spikes.push({ d: [Math.cos(a) * r, Math.sin(a) * r, z], L: .55 + .45 * R(), w: (.04 + .02 * R()) / .045 * .55, per: 9 + 6 * R(), ph: R(), kind: 'urchin', j: 12 + i % 12 }); }
  MARK_A.forEach((a, j) => spikes.push({ d: [Math.cos(a), Math.sin(a), 0], L: RAYS[j].len, w: 1, per: 1e9, ph: 0, kind: 'mark', j }));
  const MARK_TILT = MARK_A.map((a, j) => (j % 2 ? -1 : 1) * (.55 + .35 * ((j * .618) % 1)));
  const struts = L.teeth.filter((q, i) => i % 6 === 0).map((q, k) => ({ d: v3.norm(q.c), k }));

  // ── the camera: q = world→view rotation (it looks down its own -z), pos = its position in the world
  let cam = null, D = 1, qa = null, qai = null, lastInfo = null;
  const toView = w => qRot(cam.q, [w[0] - cam.pos[0], w[1] - cam.pos[1], w[2] - cam.pos[2]]);
  const projV = v => { const dz = -v[2]; if (dz < NEAR) return null; return [cam.cx + FPX * v[0] / dz, cam.cy - FPX * v[1] / dz, dz]; };
  const P = w => projV(toView(w));
  const toA = w => qRot(qa, w), fromA = a => qRot(qai, a);   // the axis frame: the camera on +z, looking at the centre
  // a polygon in the world: into view space, clipped at the near plane, projected (handles shapes reaching behind us)
  function polyW(ws) {
    const vs = ws.map(toView), out = [], n = vs.length;
    for (let i = 0; i < n; i++) { const a = vs[i], b = vs[(i + 1) % n], ia = -a[2] >= NEAR, ib = -b[2] >= NEAR;
      if (ia) out.push(a); if (ia !== ib) out.push(v3.lerp(a, b, (-NEAR - a[2]) / (b[2] - a[2]))); }
    return out.map(projV).filter(Boolean);
  }
  const poly = (ctx, pts) => { if (pts.length < 3) return; ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); };

  function holeRho(h, i, th, st) {
    const base = h.a * h.b / Math.hypot(h.b * Math.cos(th), h.a * Math.sin(th)) * cap[i];
    const k = st.wob * (.6 + st.loud);
    const wob = 1 + k * (.035 * Math.sin(2 * th + i * 1.3 + st.t * .9) + .025 * Math.sin(3 * th - i * .7 - st.t * 1.3) + .02 * Math.sin(5 * th + i + st.t * 2.1));
    return base * wob * (1 + .05 * Math.sin(st.t * .7 + i * 2.3) + .05 * st.vox) * (st.hs ? st.hs(i) : 1);
  }
  // a hole's outline on the sphere of radius rr (world points); 'front' clamps what's past the limb onto it, 'back' the reverse
  function holeWorld(h, i, rr, st, side, n = 40, rhoMul = null, rot = null) {
    const open = st.open[i], sl = st.slit[i], out = [], zc = rr * rr / D, rlc = Math.sqrt(Math.max(0, rr * rr - zc * zc));
    const c = rot ? qRot(rot, h.c) : h.c, e1 = rot ? qRot(rot, h.e1) : h.e1, e2 = rot ? qRot(rot, h.e2) : h.e2;
    for (let k = 0; k < n; k++) {
      const th = k / n * TAU, rho = holeRho(h, i, th, st) * (rhoMul ? rhoMul(th) : 1);
      const ue = open > 0 ? Math.cos(th) : .55 * sl * Math.cos(th), uf = open > 0 ? open * Math.sin(th) : .05 * sl * Math.sin(th);
      const u = v3.add(v3.sc(e1, ue), v3.sc(e2, uf)), ul = Math.hypot(...u) || 1e-6, a = rho * (open > 0 ? .5 + .5 * open : 1) * ul;
      let w = v3.sc(v3.add(v3.sc(c, Math.cos(a)), v3.sc(u, Math.sin(a) / ul)), rr);
      if (side !== 'none') { let A = toA(w);
        if ((side === 'front' && A[2] < zc) || (side === 'back' && A[2] > zc)) { const l = Math.hypot(A[0], A[1]) || 1; A = [A[0] / l * rlc, A[1] / l * rlc, zc]; w = fromA(A); } }
      out.push(w);
    }
    return out;
  }
  // the silhouette: the limb circle in the axis frame, flexed by the spectrum at its SCREEN angle (tenor left, alto right)
  function limbWorld(rr, st, n = 120, flex = true) {
    const z0 = rr * rr / D, rl = Math.sqrt(Math.max(0, rr * rr - z0 * z0)), c0 = P([0, 0, 0]), out = [];
    for (let k = 0; k < n; k++) { const a = k / n * TAU, A = [Math.cos(a) * rl, Math.sin(a) * rl, z0]; let f = 1;
      if (flex && c0) { const p = P(fromA(A)); if (p) { const sa = Math.atan2(-(p[1] - c0[1]), p[0] - c0[0]); f = 1 + st.bodyScope * (ringAt(st.spec, sa) - st.specMean) * 2 + .01 * st.wob * Math.sin(3 * a + st.t); } }
      out.push(fromA([A[0] * f, A[1] * f, z0])); }
    return out;
  }
  // a spike: ray outline j along direction d, its width facing the camera (the mark's 12 are exact when face-on)
  function spikeShape(ctx, d, rr, len, ws, j, tp = 1) {
    const ray = RAYS[j], p0 = P(v3.sc(d, rr)), p1 = P(v3.sc(d, rr + len)); if (!p0 || !p1) return;
    let sx = p1[0] - p0[0], sy = p1[1] - p0[1]; const l = Math.hypot(sx, sy), shaft = ws * ray.half * FPX / p0[2];
    if (l < shaft * 1.6) { ctx.moveTo(p0[0] + shaft, p0[1]); ctx.arc(p0[0], p0[1], shaft, 0, TAU); return; }   // end-on: its round end
    sx /= l; sy /= l; const lx = sy, ly = -sx, k = len / ray.len; let first = true;
    const taper = j >= 12 ? tp : 0;   // on the body the spikes thin toward the head (the mark's rays only as they turn: face-on they're the logo)
    for (const [u, v] of ray.pts) { const c = P(v3.sc(d, u < .2 ? rr * Math.max(0, u) / .2 : rr + (u - .2) * k)); if (!c) continue;
      const sc = ws * FPX / Math.max(c[2], p0[2]) * (1 + taper * (.15 - .6 * clamp((u - .2) / ray.len)));
      const x = c[0] + lx * v * sc, y = c[1] + ly * v * sc; if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y); }
    ctx.closePath();
  }
  // a plane in the WORLD (centre, axes e1 → right, e2 → up): ctx's transform maps local px onto it, 1 px = `unit` world.
  // Never upside down: if its x axis points left on screen it's turned 180° (handedness kept).
  function plane(ctx, c, e1, e2, unit) {
    const o = P(c); if (!o) return null; const k = unit * 40;
    let a = P(v3.add(c, v3.sc(e1, k))), b = P(v3.add(c, v3.sc(e2, -k))); if (!a || !b) return null;
    if (a[0] < o[0]) { e1 = v3.sc(e1, -1); e2 = v3.sc(e2, -1); a = P(v3.add(c, v3.sc(e1, k))); b = P(v3.add(c, v3.sc(e2, -k))); if (!a || !b) return null; }
    ctx.setTransform((a[0] - o[0]) / 40, (a[1] - o[1]) / 40, (b[0] - o[0]) / 40, (b[1] - o[1]) / 40, o[0], o[1]);
    return o;
  }

  const Tb = mkCanvas(), TC = Tb.getContext('2d'), I = mkCanvas(), IC = I.getContext('2d'), Wc = mkCanvas(), WC = Wc.getContext('2d'), Sc = mkCanvas(), SC = Sc.getContext('2d'), Bc = mkCanvas(), BC = Bc.getContext('2d');
  const reset = c => { c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.filter = 'none'; };

  // passing through a hole: its side wall is a short tube round us (nothing else draws it from there); quads far→near
  function tubeWall(ctx, st, rr) {
    const i = st.tube, n = 64, o = holeWorld(holes[i], i, rr, st, 'none', n), w = holeWorld(holes[i], i, rr * .93, st, 'none', n), qs = [];
    for (let k = 0; k < n; k++) { const q = [o[k], o[(k + 1) % n], w[(k + 1) % n], w[k]], m = q.reduce((a, b) => v3.add(a, b), [0, 0, 0]);
      qs.push([v3.len(v3.sub(v3.sc(m, .25), cam.pos)), q]); }
    qs.sort((a, b) => b[0] - a[0]); reset(ctx); ctx.fillStyle = WALL; ctx.strokeStyle = WALL; ctx.lineWidth = 1.5;
    for (const [, q] of qs) { const pts = polyW(q); if (pts.length < 3) continue; ctx.beginPath(); poly(ctx, pts); ctx.fill(); ctx.stroke(); }
  }

  // st: { t, cam: {q, pos}, cx, cy, rb, open[], slit[], loud, vox, wob, spec, specMean, scopeV, bodyScope, urchin, teeth,
  //       toothScale, boost, mark: { grow, sink[12], rayAmp }, hs, inner, rimScope, warm }
  function draw(ctx, st, hooks) {
    cam = { q: st.cam.q, pos: st.cam.pos, cx: st.cx, cy: st.cy };
    D = v3.len(cam.pos); qa = qAlign(v3.sc(cam.pos, 1 / D), [0, 0, 1]); qai = qConj(qa);
    const rr = st.rb, inside = D <= rr, z0 = rr * rr / D;
    const axes = { right: qRot(qConj(cam.q), [1, 0, 0]), up: qRot(qConj(cam.q), [0, 1, 0]) };
    const c0 = P([0, 0, 0]); let tubeK = 0;
    // IN the hole's tube (within the shell's thickness, inside its aperture): ahead is only the world outside, round us its
    // wall. Neither the inside view (its window wraps round the lens) nor the outside one (its limb does) holds here.
    if (st.tube != null && D > rr * .93 && D < rr * 1.06) { const h = holes[st.tube], dn = v3.sc(cam.pos, 1 / D);
      const th = Math.atan2(v3.dot(dn, h.e2), v3.dot(dn, h.e1)), ap = holeRho(h, st.tube, th, st) * (.5 + .5 * st.open[st.tube]);
      if (ang(dn, h.c) < ap * .98) {
        // eased in over the first stretch of the shell's thickness (the interior's last sliver and glow fade, not snap)
        const k = clamp((D - rr * .93) / (rr * .025)), tc = k < 1 ? TC : ctx;
        reset(tc); tc.fillStyle = PAPER; tc.fillRect(0, 0, W, H); if (st.bg) st.bg(tc);
        if (hooks && hooks.outside) { hooks.outside(tc, { plane: (c, e1, e2, unit) => plane(tc, c, e1, e2, unit), P, axes, rr, inside: false, Dc: D }); reset(tc); }
        tubeWall(tc, st, rr);
        if (k >= 1) { lastInfo = { inside: false, c0, limbPx: 0, D, axes, tube: true }; return []; }
        tubeK = k;
      } }
    const anyOpen = st.open.some(o => o > 0) || st.slit.some(o => o > 0);
    // ── spikes: own rise/sink cycle × the radial spectrum at their screen angle × clearance from open holes
    const openH = holes.map((h, i) => Math.max(st.open[i], st.slit[i] * .12)), front = [], back = [];
    const offAxis = Math.acos(clamp(cam.pos[2] / D, -1, 1)), markTilt = (st.mark.tilt ?? 1) * clamp(offAxis / .5) ** 1.5;   // only as far as the camera has left the face-on axis
    if (!inside) spikes.forEach(sp => {
      // the mark's rays lie in one plane: seen obliquely they'd bunch into slabs, so they splay out of it (alternately toward
      // and away from the face-on view, so face-on it's still the exact mark) while the camera leaves the axis
      const d = sp.kind === 'mark' && markTilt > 0 ? v3.norm(v3.add(sp.d, [0, 0, MARK_TILT[sp.j] * markTilt])) : sp.d;
      let amt = 1, life = 1, len;
      if (sp.kind !== 'mark') { amt = sp.kind === 'urchin' ? st.urchin : st.teeth; if (amt <= 0) return;
        const cyc = (st.t / sp.per + sp.ph) % 1; life = Math.max(0, Math.sin(Math.min(1, cyc / .75) * Math.PI)); }
      let clear = 1;
      for (let i = 0; i < NH; i++) { if (openH[i] <= 0) continue; const g = ang(d, holes[i].c) - rhoDir(holes[i], d) * cap[i] * 1.1 * openH[i] - .012;
        if (g < .03) clear = Math.min(clear, clamp(g / .03)); if (clear <= 0) return; }
      const pr = P(v3.sc(d, rr)), pt = P(v3.sc(d, rr * 1.3)), sa = pr && pt ? Math.atan2(-(pt[1] - pr[1]), pt[0] - pr[0]) : 0;
      if (sp.kind === 'mark') len = sp.L * st.mark.grow * (1 - st.mark.sink[sp.j]) * clamp(1 + st.mark.rayAmp * (ringAt(st.spec, MARK_A[sp.j]) - st.specMean), .1, 2.3) * clear;
      else len = sp.L * amt * clear * Math.pow(life, .7) * clamp(.3 + 1.5 * ringAt(st.spec, sa), .06, 2.2) * (sp.kind === 'urchin' ? 1 : st.toothScale) * (st.boost ? st.boost(sa) : 1);
      if (len < .01) return;
      // the mark's rays keep the logo's own junction only face-on (where it's exact); turned, its flat width would flap out past the
      // body's edge, so they stand on buried roots like every other spike. Short spikes are needles, thickening as they grow.
      (toA(d)[2] * rr < z0 ? back : front).push([d, len, sp.kind === 'mark' ? Math.pow(st.mark.grow, .4) : sp.w * Math.min(.9, .2 + len / .5), sp.kind === 'mark' && markTilt > .02 ? sp.j + 12 : sp.j, sp.kind === 'mark' ? markTilt : 1]);
    });
    // ── 1. paper; the outside text; 2. back spikes
    reset(ctx); ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H); if (st.bg) st.bg(ctx);
    if (hooks && hooks.outside) { hooks.outside(ctx, { plane: (c, e1, e2, unit) => plane(ctx, c, e1, e2, unit), P, axes, rr, inside, Dc: D }); reset(ctx); }
    for (const [d, len, w, j, tp] of back) { ctx.fillStyle = dbgFill('back', j); ctx.beginPath(); spikeShape(ctx, d, rr, len, w, j, tp); ctx.fill(); }
    const limb = inside ? null : polyW(limbWorld(rr, st));
    // ── 3. the interior (only once something has opened: before that there's nothing to see in, and no seam to leave)
    const seen = [];
    if (inside || anyOpen) {
      reset(IC); IC.clearRect(0, 0, W, H); IC.save();
      if (!inside) { IC.beginPath(); poly(IC, polyW(limbWorld(rr * .995, st))); IC.clip(); }
      IC.fillStyle = BACKWALL; IC.fillRect(0, 0, W, H);
      IC.fillStyle = FOG; IC.fillRect(0, 0, W, H);                                                 // the dark opacity layer
      for (let i = 0; i < NH; i++) { if (st.open[i] <= 0 && st.slit[i] <= 0) continue;          // windows onto the world behind
        if (!inside && toA(holes[i].c)[2] > z0 / rr + .05) continue;
        const pts = polyW(holeWorld(holes[i], i, rr, st, inside ? 'none' : 'back', 28)); if (pts.length < 3) continue;
        const pc = P(v3.sc(holes[i].c, rr)), dz = pc ? pc[2] : 3;
        IC.globalAlpha = Math.max(inside ? .07 : clamp(.13 + .5 * clamp((.9 - dz) / .7)), st.window ? st.window(i) : 0); IC.fillStyle = PAPER; IC.beginPath(); poly(IC, pts); IC.fill(); }
      IC.globalAlpha = 1;
      // the nested inner shell: the same rune, smaller, turning its own way, its outline flexing with the voice
      const ri = rr * .42;
      if (st.inner > 0 && D > ri * 1.08) {
        const rot = qAxis([.3, 1, .2], st.t * .11), zi = ri * ri / D, rli = Math.sqrt(Math.max(0, ri * ri - zi * zi)), ia = st.inner * (inside ? .16 : .3);
        const lw = []; for (let k = 0; k < 90; k++) { const a = k / 90 * TAU, f = 1 + .015 * ringAt(st.scopeV, a); lw.push(fromA([Math.cos(a) * rli * f, Math.sin(a) * rli * f, zi])); }
        const lp = polyW(lw);
        if (lp.length > 2) { IC.globalAlpha = ia; IC.fillStyle = INNER; IC.beginPath(); poly(IC, lp); IC.fill(); IC.globalAlpha = ia * 1.6; IC.fillStyle = '#0E0907';
          const zsave = D; for (let i = 0; i < NH; i++) { if (st.open[i] <= 0) continue; const cw = qRot(rot, holes[i].c); if (toA(cw)[2] * ri < zi) continue;
            const pts = polyW(holeWorld(holes[i], i, ri, st, 'front', 20, null, rot)); IC.beginPath(); poly(IC, pts); IC.fill(); }
          IC.globalAlpha = 1; }
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
      for (let i = 0; i < NH; i++) { if (st.open[i] <= .05) continue; const A = toA(holes[i].c);
        if (!inside && A[2] < z0 / rr) continue; const pc = P(v3.sc(holes[i].c, rr)); if (!pc) continue;
        seen.push({ i, x: pc[0], y: pc[1], z: A[2], dz: pc[2], r: FPX * rr * Math.sin((holes[i].a + holes[i].b) / 2 * cap[i]) * st.open[i] / pc[2] });
        if (!inside && st.rimScope > 0) {
          const pts = polyW(holeWorld(holes[i], i, rr * .97, st, 'front', 64, th => .8 + .1 * ringAt(st.scopeV, th + i)));
          if (pts.length > 3) { BC.globalAlpha = .38 * st.rimScope; BC.strokeStyle = ORG; BC.lineWidth = Math.max(1, 3 / pc[2]); BC.beginPath(); poly(BC, pts); BC.stroke(); BC.globalAlpha = 1; }
        }
      }
      const api = { plane: (c, e1, e2, unit) => plane(BC, c, e1, e2, unit), P, toView, rr, inside, seen, holes, cap, axes, Dc: D, camPos: cam.pos,
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
      if (inside && st.tube != null && D > rr * .85) tubeWall(ctx, st, rr);
    }
    if (!inside && limb && limb.length > 2) {
      // ── 4. the holes' inner walls (the shell's thickness), under 5. the front shell with its holes cut out
      reset(WC); WC.clearRect(0, 0, W, H); reset(SC); SC.clearRect(0, 0, W, H);
      SC.fillStyle = INK; SC.beginPath(); poly(SC, limb); SC.fill(); SC.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < NH; i++) { if (st.open[i] <= 0 && st.slit[i] <= 0) continue;
        if (toA(holes[i].c)[2] < z0 / rr - Math.sin(Math.max(holes[i].a, holes[i].b) * cap[i] * 1.2)) continue;   // wholly behind the limb
        const outer = polyW(holeWorld(holes[i], i, rr, st, 'front')), inner = polyW(holeWorld(holes[i], i, rr * .93, st, 'front'));
        if (outer.length < 3) continue;
        SC.beginPath(); poly(SC, outer); SC.fill();
        WC.globalCompositeOperation = 'source-over'; WC.fillStyle = WALL; WC.beginPath(); poly(WC, outer); WC.fill();
        if (inner.length > 2) { WC.globalCompositeOperation = 'destination-out'; WC.beginPath(); poly(WC, inner); WC.fill(); } }
      reset(WC); reset(SC);
      if (anyOpen) { ctx.save(); ctx.beginPath(); poly(ctx, limb); ctx.clip(); ctx.drawImage(Wc, 0, 0); ctx.restore(); }
      ctx.drawImage(Sc, 0, 0);
      // ── 6. front spikes
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); poly(ctx, limb); ctx.clip('evenodd');
      for (const [d, len, w, j, tp] of front) { ctx.fillStyle = dbgFill('front', j); ctx.beginPath(); spikeShape(ctx, d, rr, len, w, j, tp); ctx.fill(); }
      ctx.restore();
    }
    if (tubeK > 0) { reset(ctx); ctx.globalAlpha = tubeK; ctx.drawImage(Tb, 0, 0); reset(ctx); }
    let limbPx = 0; if (limb && c0 && limb.length) limbPx = limb.reduce((m, p) => Math.max(m, Math.hypot(p[0] - c0[0], p[1] - c0[1])), 0) * .97;
    lastInfo = { inside, c0, limbPx, D, axes };
    return seen;
  }
  return { info: () => lastInfo, L, draw, group, rank, bySize, cap, spikes, P: w => P(w) };
})();
