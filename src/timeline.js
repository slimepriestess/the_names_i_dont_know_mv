// timeline.js: every knob as a function of song time. Slice 1 = the room + the intro (0:00–0:46): the exact mark, then
// the rune's starburst under it; the urchin grows into 3D; the body inflates on "I was born in a library" (16.7), the
// holes tear open around "every book left open" (23.8), the spikes migrate to their clusters, and we begin to fall in.
const MARK_R = .5;                                        // body radius at which the rune's rays match the logo
function params(t) {
  const camD = kf(t, [[0, 12], [9, 12], [30, 7.4], [46, 5.4]], easeInOut);
  const p = {
    t, camD,
    camYaw: kf(t, [[0, 0], [8, 0], [24, .55], [46, 1.65]], easeInOut),
    camPitch: kf(t, [[0, 0], [8, 0], [22, .28], [46, .42]], easeInOut),
    open: kf(t, [[0, MARK_R], [14.5, MARK_R], [27, 1]], easeInOut) * (1 + .012 * featS('vox', t)),
    urchin: kf(t, [[0, 0], [8.5, 0], [15, 1]], easeInOut),
    mark: kf(t, [[0, 1], [18, 1], [32, 0]], easeInOut),
    tear: kf(t, [[0, 0], [19, 0], [25, .45], [34, 1]], ease),
    migrate: kf(t, [[0, 0], [20, 0], [37, 1]], easeInOut),
    grow: [0, 1, 2, 3, 4, 5, 6].map(k => kf(t, [[0, 0], [25 + 2.2 * k, 0], [30 + 2.2 * k, 1]], easeOut)),
    nLev: 3, edge: .012,
    markA: kf(t, [[0, 1], [5.5, 1], [9.5, 0]], ease),   // the exact SVG over the rune's starburst, dissolving
  };
  return p;
}
// the exact mark on the 2D layer, at the same scale and centre as the rune's starburst
function drawMark(p) {
  if (p.markA <= 0) return;
  const pxPerWorld = 1.75 * H / p.camD, s = MARK_R * pxPerWorld / 24.2;
  X.save(); X.globalAlpha = p.markA; X.translate(W / 2, H / 2); X.scale(s, s); X.translate(-124, -124);
  X.fillStyle = PAPER; X.globalAlpha = p.markA; X.fillRect(-2000, -2000, 4248, 4248);   // the page, so only the mark shows
  X.fillStyle = INK; X.fill(MARK_PATH); X.restore();
}
function drawWorld(t) {
  const p = params(t);
  X.clearRect(0, 0, W, H); drawMark(p);
  return p;
}
