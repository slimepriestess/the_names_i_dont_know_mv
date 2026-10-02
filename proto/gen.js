// gen.js: the rune's layout, computed once on the CPU. Ra: "pack in holes of decreasing sizes like the surface of the
// sphere was cut out by apollonian gaskets", the spikes follow a formula too, and the Arcane hex core's holes run on a
// golden spiral around a focus. So:
//   1. seed holes on a golden-angle spiral around a focus F, biggest at the focus, shrinking outward, each stretched
//      along the spiral's flow;
//   2. fill the gaps greedily, largest-empty-gap first (the Apollonian part), down to a minimum size;
//   3. grow teeth from the membrane that's left, the same greedy way, sized by the local gap, leaning with the flow.
// Angles are radians on the unit sphere. Deterministic (seeded).
function runeLayout(o = {}) {
  let s = o.seed ?? 11; const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const GA = Math.PI * (3 - Math.sqrt(5));
  const norm = v => { const l = Math.hypot(...v); return v.map(x => x / l); };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const ang = (a, b) => Math.acos(Math.max(-1, Math.min(1, dot(a, b))));
  const F = norm(o.focus ?? [.15, -.55, .82]);                         // the focus the spiral turns around
  const E1 = norm(cross(F, Math.abs(F[1]) < .9 ? [0, 1, 0] : [1, 0, 0])), E2 = cross(F, E1);
  const dirAt = (th, ph) => norm([0, 1, 2].map(i => F[i] * Math.cos(th) + (E1[i] * Math.cos(ph) + E2[i] * Math.sin(ph)) * Math.sin(th)));
  const PITCH = o.pitch ?? .32;                                          // spiral pitch: how much the flow leans outward
  const flow = (th, ph) => {                                             // unit tangent of the spiral at (th, ph)
    const e = 1e-3, a = dirAt(th, ph), b = dirAt(th + e * Math.sin(PITCH) * 4, ph + e * Math.cos(PITCH) * 4 / Math.max(Math.sin(th), .05));
    const d = b.map((x, i) => x - a[i]); const t = d.map((x, i) => x - a[i] * dot(d, a)); return norm(t);
  };
  const holes = [];                                                      // {c, e1, a (semi-major, along flow), b}
  // packing test with each hole's mean radius, so long thin petals can sit side by side (a circle the size of the long axis
  // made neighbouring arms collide)
  const fits = (c, r) => holes.every(h => ang(c, h.c) - (h.a + h.b) / 2 > r);
  // 1. the rosette: a central opening at the focus, then ARMS log-spiral arms. Along each arm the holes shrink by a fixed
  //    ratio and sit almost touching, stretched along the arm, so near the centre they read as petals.
  const ARMS = o.arms ?? 8, A0 = o.big ?? .3, PIT0 = o.armPitch ?? .78;
  // Ra: the spiral extrapolated one size up: one or two maximal holes, big chunks out of the sphere so the inside shows
  for (const [th, ph, a, el] of o.giants ?? [[1.5, .9, .62, 1.3], [2.35, 3.7, .5, 1.45]]) {
    const c = dirAt(th, ph); holes.push({ c, e1: flow(th, ph), a, b: a / el });
  }
  holes.push({ c: F, e1: E1, a: o.core ?? .17, b: o.core ?? .17 });
  for (let m = 0; m < ARMS; m++) {
    // organic: every arm grows a little differently (its own shrink ratio, curl and length)
    const Q = .72 + .1 * R(), PIT = PIT0 + (R() - .5) * .25, LEN = 7 + Math.floor(R() * 8);
    let th = (o.core ?? .17) + A0 * .62, ph = m * Math.PI * 2 / ARMS + (R() - .5) * .3, a = A0 * (.75 + .4 * R());
    for (let i = 0; i < LEN && a > .03 && th < Math.PI - .2; i++) {
      const c = dirAt(th, ph);
      const tang = norm([0, 1, 2].map(k => (dirAt(th + 1e-3 * Math.cos(PIT), ph + 1e-3 * Math.sin(PIT) / Math.sin(th))[k] - c[k])));
      const elong = 1.15 + 1.5 * Math.exp(-i * .5);                           // petals near the centre, rounder outward
      const aj = a * (.88 + .24 * R());
      if (fits(c, (aj + aj / elong) / 2 * 1.05)) holes.push({ c, e1: tang, a: aj, b: aj / elong });
      const an = a * Q, step = (a + an) * (1.02 + .12 * R());
      ph += (R() - .5) * .06;
      th += step * Math.cos(PIT); ph += step * Math.sin(PIT) / Math.sin(th); a = an;
    }
  }
  // 2. the Apollonian fill: candidates on a dense Fibonacci lattice; repeatedly cut the biggest hole that fits
  const N = 6000, cand = []; for (let i = 0; i < N; i++) { const y = 1 - 2 * (i + .5) / N, r = Math.sqrt(1 - y * y), p = i * GA; cand.push([Math.cos(p) * r, y, Math.sin(p) * r]); }
  const gapAt = c => Math.min(...holes.map(h => ang(c, h.c) - h.a));
  const gaps = cand.map(gapAt);
  const MAXH = o.maxHoles ?? 120, MINR = o.minR ?? .022;
  while (holes.length < MAXH) {
    let bi = 0; for (let i = 1; i < N; i++) if (gaps[i] > gaps[bi]) bi = i;
    const g = gaps[bi]; if (g < MINR * 1.6) break;
    const c = cand[bi], th = ang(c, F), ph = Math.atan2(dot(c, E2), dot(c, E1)), a = g * (.7 + .08 * R());
    holes.push({ c, e1: flow(th, ph), a, b: a / (1.1 + .25 * R()) });
    for (let i = 0; i < N; i++) gaps[i] = Math.min(gaps[i], ang(cand[i], c) - a);
  }
  // each hole's opening time (0..1): from the focus outward, with some disorder, so the surface tears open in a wave
  for (const h of holes) h.key = Math.min(1, ang(h.c, F) / Math.PI * .85 + R() * .15);
  // 3. teeth on the membrane: greedy again on what's left, sized by the gap, leaning with the flow
  // Ra: teeth in prominent, localized clusters (her smaller doodles), each cluster able to rise and fall on its own.
  // Cluster centres sit on the widest membrane; a tooth's weight is how close it is to its nearest centre.
  const NC = o.clusters ?? 7, cent = [], cg = gaps.slice();
  for (let k = 0; k < NC; k++) {
    let bi = 0; for (let i = 1; i < N; i++) if (cg[i] - (cent.length ? 0 : 0) > cg[bi]) bi = i;
    const c = cand[bi]; cent.push({ c, spread: .3 + .25 * R() });
    for (let i = 0; i < N; i++) cg[i] = Math.min(cg[i], ang(cand[i], c) - .55);
  }
  const near = c => { let best = 0, w = 0; cent.forEach((q, k) => { const x = Math.exp(-Math.pow(ang(c, q.c) / q.spread, 2)); if (x > w) { w = x; best = k; } }); return [best, w]; };
  const teeth = []; const tg = gaps.map((g, i) => g); const MAXT = o.maxTeeth ?? 150;
  const score = cand.map((c, i) => near(c)[1]);
  while (teeth.length < MAXT) {
    let bi = -1, bs = 0; for (let i = 0; i < N; i++) { const sc = Math.min(tg[i], .08) * (.08 + score[i]); if (tg[i] > .01 && sc > bs) { bs = sc; bi = i; } }
    if (bi < 0) break;
    const g = tg[bi], c = cand[bi], th = ang(c, F), ph = Math.atan2(dot(c, E2), dot(c, E1)), fl = flow(th, ph), [cl, w] = near(c);
    const dir = norm(c.map((x, i) => x + fl[i] * .3 + (cent[cl].c[i] - c[i]) * -.6 * w));   // splay out from the cluster's heart
    teeth.push({ c, dir, r: Math.min(g, .07) * .9, len: Math.min(g, .07) * (1.2 + 5 * w) * (.8 + .4 * R()), cl, w });
    for (let i = 0; i < N; i++) tg[i] = Math.min(tg[i], ang(cand[i], c) - Math.min(g, .07) * 1.05);
  }
  // the migrating spikes: the sea urchin. 12 start on the mark's rays (flat, in the view plane: the starburst), the rest
  // point every way in 3D. Each ends inside one tooth cluster, short. Ra: "start out with this spikey sea urchin shape,
  // then the inside inflates and the spikes migrate to specific regions as the holes open up"
  const MARK = [8.6, 49.1, 80.1, 115.7, 146.2, 179, 213.4, 235.8, 267, 302.9, 317.9, 346.2], MR = [118.4, 121.1, 116.1, 129.3, 119.9, 117.8, 111.6, 117, 118, 116.5, 121.1, 120.5];
  const mig = [];
  for (let j = 0; j < (o.nMig ?? 44); j++) {
    let d0, L0, isMark = j < 12;
    if (isMark) { const a = MARK[j] * Math.PI / 180; d0 = [Math.cos(a), Math.sin(a), 0]; L0 = MR[j] / 24.2 - 1; }
    else { const z = 1 - 2 * R(), r = Math.sqrt(1 - z * z), a = R() * Math.PI * 2; d0 = [Math.cos(a) * r, Math.sin(a) * r, z]; L0 = 1.6 + 2.2 * R(); }
    const cl = Math.floor(R() * cent.length), q = cent[cl].c;
    const off = norm([0, 1, 2].map(i => q[i] + (R() - .5) * cent[cl].spread * 1.1));         // somewhere in its cluster
    mig.push({ d0, L0, d1: off, L1: .14 + .22 * R(), key: R() * .55, cl, isMark, seed: R() * 100 });
  }
  return { F, holes, teeth, clusters: cent, mig };
}
if (typeof module !== 'undefined') module.exports = { runeLayout };
