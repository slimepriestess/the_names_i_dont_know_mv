// timeline.js: every knob as a function of song time. Slice 1 = the room + the intro (0:00–0:46).
// The exact mark, flexing on the radial oscilloscope from the first note; under it the same logo as a 3D slab (so the
// dissolve between them is invisible); as it turns, a bubble swells out of the logo's centre, the flat rays round into
// spikes and the urchin grows; the body inflates on "I was born in a library" (16.7), the holes tear open around
// "every book left open" (23.8), the spikes slide to their clusters, and we begin to fall in.
const MS = 48.4;                                          // box units per world unit (the mark's hollow r 24.2 = .5)
const ss = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
// the radial oscilloscope at time t: 64 values in -1..1 (src/scope.js), interpolated between video frames
function scopeRing(t) {
  const f = t * SCOPE.fps, i = Math.max(0, Math.min(SCOPE.data.length / SCOPE.n - 2, Math.floor(f))), k = clamp(f - i), out = new Float32Array(SCOPE.n);
  for (let j = 0; j < SCOPE.n; j++) out[j] = lerp(SCOPE.data[i * SCOPE.n + j], SCOPE.data[(i + 1) * SCOPE.n + j], k) / 127;
  return out;
}
const ringAt = (ring, ang) => { const x = ((ang / TAU) % 1 + 1) % 1 * 64, i = Math.floor(x) % 64, j = (i + 1) % 64; return lerp(ring[i], ring[j], x - Math.floor(x)); };
function params(t) {
  const p = {
    t, camD: kf(t, [[0, 12], [9, 12], [30, 7.4], [46, 5.4]], easeInOut),
    camYaw: kf(t, [[0, 0], [8, 0], [24, .55], [46, 1.65]], easeInOut),
    camPitch: kf(t, [[0, 0], [8, 0], [22, .28], [46, .42]], easeInOut),
    slab: kf(t, [[0, 1], [9, 1], [17, 0]], easeInOut),                                     // the flat logo, then gone
    open: kf(t, [[0, .04], [8, .04], [15, .5], [27, 1]], easeInOut) * (1 + .012 * featS('vox', t)),   // a bubble out of its centre
    urchin: kf(t, [[0, 0], [10, 0], [17, 1]], easeInOut),
    mark: kf(t, [[0, 1], [18, 1], [32, 0]], easeInOut),
    tear: kf(t, [[0, 0], [19, 0], [25, .45], [34, 1]], ease),
    migrate: kf(t, [[0, 0], [19, 0], [40, 1]], easeInOut),
    grow: [0, 1, 2, 3, 4, 5, 6].map(k => kf(t, [[0, 0], [25 + 2.2 * k, 0], [31 + 2.2 * k, 1]], ease)),
    scopeAmt: .09, spikeScope: .14,
    nLev: 3, edge: .012,
    markA: kf(t, [[0, 1], [6.5, 1], [8.5, 0]], ease),                                       // the anti-aliased SVG over the identical slab
  };
  p.ring = scopeRing(t); p.scope = p.ring;
  return p;
}
// the mark's outline as points (box units), parsed once from the exact path (its one curve sampled)
const MARK_PTS = (() => {
  const tk = MARK_D.match(/[MLHVCZ]|-?[0-9.]+/g), pts = []; let i = 0, cmd = '', x = 0, y = 0;
  while (i < tk.length) {
    if (/[MLHVCZ]/.test(tk[i])) { cmd = tk[i++]; if (cmd === 'Z') continue; }
    if (cmd === 'M' || cmd === 'L') { x = +tk[i]; y = +tk[i + 1]; i += 2; pts.push([x, y]); }
    else if (cmd === 'H') { x = +tk[i++]; pts.push([x, y]); }
    else if (cmd === 'V') { y = +tk[i++]; pts.push([x, y]); }
    else if (cmd === 'C') { const [x1, y1, x2, y2, x3, y3] = tk.slice(i, i + 6).map(Number); i += 6;
      for (let s = 1; s <= 6; s++) { const u = s / 6, v = 1 - u; pts.push([v * v * v * x + 3 * v * v * u * x1 + 3 * v * u * u * x2 + u * u * u * x3, v * v * v * y + 3 * v * v * u * y1 + 3 * v * u * u * y2 + u * u * u * y3]); }
      x = x3; y = y3; }
    else i++;
  }
  return pts;
})();
// the exact mark on the 2D layer, warped by the scope exactly as the slab is, at the slab's scale and centre
function drawMark(p) {
  if (p.markA <= 0) return;
  const s = 1.75 * H / p.camD / MS;
  X.save(); X.globalAlpha = p.markA;                          // the logo only: the page and the slab under it are identical
  X.translate(W / 2, H / 2); X.scale(s, s); X.translate(-124, -124);
  X.beginPath();
  MARK_PTS.forEach(([bx, by], i) => {
    const wx = (bx - 124) / MS, wy = -(by - 124) / MS, r = Math.hypot(wx, wy), a = Math.atan2(wy, wx);
    const w = 1 + p.scopeAmt * ringAt(p.ring, a) * ss(.45, 1.6, r), X1 = 124 + (bx - 124) * w, Y1 = 124 + (by - 124) * w;
    i ? X.lineTo(X1, Y1) : X.moveTo(X1, Y1);
  });
  X.closePath(); X.fillStyle = INK; X.fill(); X.restore();
}
function drawWorld(t) {
  const p = params(t);
  X.clearRect(0, 0, W, H); drawMark(p);
  return p;
}
