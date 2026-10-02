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
  const ARMS = o.arms ?? 8, Q = o.ratio ?? .77, A0 = o.big ?? .27, PIT = o.armPitch ?? .5;
  holes.push({ c: F, e1: E1, a: o.core ?? .17, b: o.core ?? .17 });
  for (let m = 0; m < ARMS; m++) {
    let th = (o.core ?? .17) + A0 * .62, ph = m * Math.PI * 2 / ARMS + R() * .08, a = A0;
    for (let i = 0; i < 14 && a > .03 && th < Math.PI - .2; i++) {
      const c = dirAt(th, ph);
      const tang = norm([0, 1, 2].map(k => (dirAt(th + 1e-3 * Math.cos(PIT), ph + 1e-3 * Math.sin(PIT) / Math.sin(th))[k] - c[k])));
      const elong = 1.15 + 1.5 * Math.exp(-i * .5);                           // petals near the centre, rounder outward
      if (fits(c, (a + a / elong) / 2 * 1.05)) holes.push({ c, e1: tang, a, b: a / elong });
      const an = a * Q, step = (a + an) * 1.08;
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
  // 3. teeth on the membrane: greedy again on what's left, sized by the gap, leaning with the flow
  const teeth = []; const tg = gaps.slice(); const MAXT = o.maxTeeth ?? 150;
  while (teeth.length < MAXT) {
    let bi = 0; for (let i = 1; i < N; i++) if (tg[i] > tg[bi]) bi = i;
    const g = tg[bi]; if (g < .012) break;
    const c = cand[bi], th = ang(c, F), ph = Math.atan2(dot(c, E2), dot(c, E1)), fl = flow(th, ph);
    const lean = .35, dir = norm(c.map((x, i) => x + fl[i] * lean));
    teeth.push({ c, dir, r: g * .9, len: g * (2.2 + 1.6 * R()) });
    for (let i = 0; i < N; i++) tg[i] = Math.min(tg[i], ang(cand[i], c) - g * 1.05);
  }
  return { F, holes, teeth };
}
if (typeof module !== 'undefined') module.exports = { runeLayout };
