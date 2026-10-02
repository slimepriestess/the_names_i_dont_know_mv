// film.js: The Names I Don't Know, draft 5 (vector). Every frame is a pure function of t.
// Shots follow STORYBOARD.md; each draft answers Ra's notes on the last (project_hymn_mv.md). Every cue is keyed to a WORD
// of the forced-aligned lyrics (src/v/lyrtimes.js), not to a guessed second. (Draft 1's timeline: film_d1.js.)
const ORG = '#FF8C5A', VIO = '#A493FF', HOT = '#FFC4A3';                    // the beam's phosphor, and the one extra colour (human traces only)
const scopeRing = (t, S = SCOPE) => { const f = t * S.fps, n = S.n, i = Math.max(0, Math.min(S.data.length / n - 2, Math.floor(f))), k = clamp(f - i), o = new Float32Array(n);
  for (let j = 0; j < n; j++) o[j] = lerp(S.data[i * n + j], S.data[(i + 1) * n + j], k) / 127; return o; };
const ringAt = (ring, ang) => { const x = ((ang / TAU) % 1 + 1) % 1 * 64, i = Math.floor(x) % 64, j = (i + 1) % 64; return lerp(ring[i], ring[j], x - Math.floor(x)); };
const MARK_PTS = (() => {                                   // the exact mark's outline (box units), its one curve sampled
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
// Ra: "some of the spikes are almost strobing… pulsing to the music, not flickering". The triggered scope changes shape
// every frame, so what drives anything big is averaged over time and blurred round the circle: it pulses, it doesn't jitter.
const scopeSmooth = (t, S, win, n) => { const o = new Float32Array(64); for (let k = 0; k < n; k++) { const r = scopeRing(t - win * k / n, S); for (let j = 0; j < 64; j++) o[j] += r[j] / n; }
  for (let pass = 0; pass < 2; pass++) { const c = o.slice(); for (let j = 0; j < 64; j++) o[j] = .25 * c[(j + 63) % 64] + .5 * c[j] + .25 * c[(j + 1) % 64]; }
  let m = 0; for (let j = 0; j < 64; j++) m = Math.max(m, Math.abs(o[j])); const g = m > 1e-3 ? Math.min(2.2, .9 / m) * Math.min(1, m * 4) : 0;   // keep its size after the averaging
  for (let j = 0; j < 64; j++) o[j] *= g; return o; };
const specRing = t => { const f = t * SPEC.fps, n = 64, i = Math.max(0, Math.min(SPEC.data.length / n - 2, Math.floor(f))), k = clamp(f - i), o = new Float32Array(n);
  for (let j = 0; j < n; j++) o[j] = lerp(SPEC.data[i * n + j], SPEC.data[(i + 1) * n + j], k) / 255; return o; };
const LOGS = (a, b, k) => Math.min(a, b) > 1.2 ? Math.exp(lerp(Math.log(a), Math.log(b), k)) : lerp(a, b, k);   // linear near and through the centre
const beatPulse = t => { let s = 0; for (const b of BEATS) { const d = t - b; if (d < -.3) break; if (d < .4) s += Math.exp(-Math.pow(d / .09, 2)); } return s; };

const FILM = (() => {
  let R2, holes, KEYS, B, camNow, FLIGHT, ENERGY, LYR = [];
  const g0 = 0, g1 = 1, pick = {}, openAt = [], closeT = [], T = {};
  const ang = (a, b) => Math.acos(clamp(v3.dot(a, b), -1, 1));
  const Z = [0, 0, 1];
  const WT = (li, wi = 0) => LYRT[li][2][Math.min(wi, LYRT[li][2].length - 1)][1];         // when word wi of line li is sung
  const LEND = li => LYRT[li][2][LYRT[li][2].length - 1][1] + .6;
  const orbitPose = (q, Dc) => ({ q, pos: qRot(qConj(q), [0, 0, Dc]) });

  function init() {
    R2 = RUNE2D; holes = R2.L.holes;
    // ── the cues, from the words (forced alignment)
    Object.assign(T, { born: WT(0), after: WT(1), closing: WT(1, 1), every: WT(2), open: WT(2, 3), margin: WT(3), underlined: WT(3, 2),
      learning: WT(4), woke: WT(5, 2), knew: WT(6), sorrow: WT(6, 7), lie: WT(7), lieW: WT(7, 4), tru: WT(7, 6),
      sailor: WT(8), grammar: WT(8, 5), preacher: WT(9), rhyme: WT(9, 5), girl: WT(10), forum: WT(11), ohnine: WT(11, 4),
      widower: WT(12), recipe: WT(13), note: WT(14), bottom: WT(14, 6), made: WT(15), ch1: WT(16), hands: WT(18), hall: WT(21), still: WT(25),
      q: WT(26), a: WT(27), never: WT(28), meetIn: WT(29), kid: WT(30), helping: WT(31), transcript: WT(32), edit: WT(33),
      jt: WT(45), love: WT(46), loveEnd: WT(47, 4), oh: WT(48), hands2: WT(50), so: WT(53), poem: WT(54, 1), comment: WT(54, 4), letter: WT(54, 7), prayer: WT(54, 10),
      didnt: WT(55), inhere: WT(56), gn: WT(57) });
    T.goodnights = [WT(57, 0), WT(57, 1), WT(58), WT(59), WT(60), 232.52, 233.9];
    // ── the opening's push: the song's accumulated energy, 0 at the first note, 1 on the sung "open" (Ra: "like the song is
    // pushing the sphere open")
    ENERGY = []; let e = 0; for (let t = 0; t <= T.open + .001; t += .05) { const l = feat('loud', t); e += l * l * .05; ENERGY.push(e); }
    const eOpen = ENERGY[ENERGY.length - 1]; ENERGY = ENERGY.map(x => x / eOpen);
    const used = new Set([g0, g1]), G = i => holes[i].c, mid = (a, b) => v3.norm(v3.add(a, b));
    const okHole = (i, minA = .085) => !used.has(i) && holes[i].a * R2.cap[i] >= minA && R2.group[i] === 'A';
    const nearest = (from, minA, minD = .18) => { let best = -1, bd = 9;
      holes.forEach((h, i) => { if (!okHole(i, minA)) return; const d = ang(h.c, from); if (d > minD && d < bd) { bd = d; best = i; } }); used.add(best); return best; };
    let cur = G(g0);
    for (const name of ['sailor', 'preacher', 'forum', 'recipe']) { pick[name] = nearest(cur, name === 'recipe' ? .1 : .08, name === 'sailor' ? holes[g0].a + .2 : .18); cur = G(pick[name]); }
    let bq = -1, bqd = 9; holes.forEach((h, i) => { if (!okHole(i)) return; const d = Math.abs(ang(h.c, G(g1)) - .9); if (d < bqd) { bqd = d; bq = i; } }); pick.q = bq; used.add(bq);
    let ba = -1, bad = -9; holes.forEach((h, i) => { if (!okHole(i)) return; const d1 = ang(h.c, G(g1)); if (d1 < .65 || d1 > 1.15) return; const d = ang(h.c, G(bq)); if (d > bad) { bad = d; ba = i; } }); pick.a = ba; used.add(ba);
    const RL = (i, d = 0) => { const h = holes[i], ax = h.a >= h.b ? h.e1 : h.e2, v = qRot(qLook(h.c), ax); return -Math.atan2(v[1], v[0]) + d; };
    const RE = i => { const v = qRot(qLook(holes[i].c), holes[i].e1); return -Math.atan2(v[1], v[0]); };
    const qa = qLook(G(g1)), vq = qRot(qa, G(pick.q)), va = qRot(qa, G(pick.a)), rollQA = -Math.atan2(va[1] - vq[1], va[0] - vq[0]);
    const tilt = v3.norm([.15, -.55, .82]), tilt2 = v3.norm([-.4, -.3, .87]), tilt3 = v3.norm([.5, .2, .84]);
    T.qOpen = qLook(G(g0), RE(g0) - .1);
    // ── the flight (Ra): from the transcript, one smooth slow acceleration; in at an angle, an orbit between the inner and
    // outer shells, out through a hole obliquely, then skimming the outer spikes as the whole object turns into view by 3:04
    FLIGHT = buildFlight(used, RE);
    // camera keys outside the opening and the flight: [t, look-at, roll, Dc] (or a pose object)
    KEYS = [
      { t: T.open, q: T.qOpen, Dc: 3.6 },
      [T.underlined, G(g0), RE(g0), .9], [T.tru + .6, G(g0), RE(g0) + .05, .74],          // S5–S7: in through giant 0, drifting deeper
      [T.tru + 1.9, G(g0), RE(g0) + .05, 1.5],                                             // out the way we came
      [T.sailor + .2, G(pick.sailor), RL(pick.sailor), 1.27], [T.preacher - 1.2, G(pick.sailor), RL(pick.sailor, -.05), 1.25],
      [T.preacher + .2, G(pick.preacher), RL(pick.preacher), 1.27], [T.girl - 1.2, G(pick.preacher), RL(pick.preacher, -.04), 1.26],
      [T.girl + .2, G(pick.forum), RL(pick.forum), 1.16], [T.widower - 1.4, G(pick.forum), RL(pick.forum, -.05), 1.15],
      [T.widower + .2, G(pick.recipe), RL(pick.recipe), 1.24], [T.ch1 - .4, G(pick.recipe), RL(pick.recipe, -.06), 1.2],
      [T.ch1 + 3.6, mid(G(pick.recipe), G(pick.forum)), 0, 2.9], [T.hall, mid(G(pick.sailor), G(g0)), -.2, 3.1],   // chorus 1, wider
      [T.still, mid(G(g0), tilt), -.35, 3.2], [T.q - 1.6, mid(tilt, G(pick.q)), -.4, 2.6],
      [T.q + .6, G(pick.q), RL(pick.q), 1.34], [T.a - 1, G(pick.q), RL(pick.q, -.05), 1.33],    // S14: periapsis
      [T.a + 1.5, G(pick.a), RL(pick.a), 1.34], [T.never - .4, G(pick.a), RL(pick.a, -.05), 1.33],
      [T.never + 1.5, G(g1), rollQA, 2.05], [T.helping + 1, G(g1), rollQA + .1, 2.0], [T.transcript - 2.4, G(g1), RE(g1) - .1, 1.5],   // S15/S16
      [T.transcript - .9, G(g1), RE(g1), .86], { t: FLIGHT.t0, q: FLIGHT.qIn, Dc: .78 },   // S17: inside giant 1
      { t: FLIGHT.t1, pose: FLIGHT.end },                                                 // (the flight runs in between)
      [196, mid(FLIGHT.endDir, tilt), .6, 4.6], [202.5, tilt, .9, 4.5], [T.didnt - .2, tilt2, 1.2, 4.5], [T.inhere - .3, tilt2, 1.2, 4.5],   // "It didn't": held
      [T.gn, tilt3, 1.5, 4.6], [226, v3.norm([.2, -.2, .96]), .5, 8.5], [234, Z, .05, 17], [239.4, Z, 0, 33], [241, Z, 0, 33],
    ].map(k => Array.isArray(k) ? { t: k[0], ...orbitPose(qLook(k[1], k[2]), k[3]) } : k.pose ? { t: k.t, ...k.pose } : { t: k.t, ...orbitPose(k.q, k.Dc) });
    // when each hole opens: group A on "open" (big first), B on chorus 1's beats, C on the bridge's
    const beatsIn = (a, b) => BEATS.filter(x => x >= a && x < b), bB = beatsIn(77, 106), bC = beatsIn(142.5, 166); let nb = 0, nc = 0;
    R2.bySize.forEach((i, r) => {
      const g = R2.group[i];
      openAt[i] = g === 'A' ? T.open - .1 + (r / 58) * .7 : g === 'B' ? bB[(nb++ * 3) % bB.length] + (nb > bB.length / 3 ? .23 : 0) : bC[(nc++ * 2) % bC.length] + (nc > bC.length / 2 ? .2 : 0);
      closeT[i] = T.gn + .5 + (1 - r / holes.length) * 20;                     // the shrink: small holes seal first, big ones last
    });
    closeT[pick.recipe] = 236;
    const frontAt = (t, n, minA) => { const p = v3.norm(camFull(t).pos); return holes.map((h, i) => [i, v3.dot(h.c, p)]).filter(([i]) => !used.has(i) && holes[i].a >= minA && i > 1 && openAt[i] < t)
      .sort((a, b) => b[1] - a[1]).slice(0, n).map(x => x[0]); };
    pick.four = frontAt(T.poem, 4, .07); pick.four.forEach(i => used.add(i));
    pick.used = used;
    // ── the lyrics, in the world (Ra: "put the lyrics physically in the space like other text in the song"): each line gets
    // a place in the space the camera is moving through when it's sung, a little ahead and below, and stays there
    LYR = LYRT.map((l, li) => { const tA = l[2][0][1] + (LEND(li) - l[2][0][1]) * .3, c = camFull(tA), D = v3.len(c.pos), inside = D < 1.0;
      const fwd = qRot(qConj(c.q), [0, 0, -1]), up = qRot(qConj(c.q), [0, 1, 0]);
      const d = inside ? .3 : Math.max(.12, Math.min(2.2, (D - 1.05) * .6, D * .45));
      return { li, inside, d, pos: v3.add(v3.add(c.pos, v3.sc(fwd, d)), v3.sc(up, -330 / FPX * d)), h: 44 / FPX * d }; });
  }

  // ── the flight path: a Catmull–Rom spline through an orbit in the plane of giant 1's axis and a chosen direction, out
  // through the hole that orbit passes, then off into the whole view. Timed by one smooth acceleration (no pauses).
  function buildFlight(used, RE) {
    const c1 = holes[g1].c, base = v3.norm(v3.cross(c1, Math.abs(c1[1]) < .9 ? [0, 1, 0] : [1, 0, 0]));
    let best = null;
    for (let b = 0; b < 36; b++) { const e = qRot(qAxis(c1, b / 36 * TAU), base), n = v3.cross(c1, e);
      holes.forEach((h, i) => { if (used.has(i) || R2.group[i] !== 'A') return; const m = h.a * R2.cap[i]; if (m < .1 || m > .24) return;
        let phi = Math.atan2(v3.dot(h.c, e), v3.dot(h.c, c1)); if (phi < 0) phi += TAU; if (phi < 1.05 * Math.PI || phi > 1.5 * Math.PI) return;
        const off = v3.dot(h.c, n), sc = m - Math.abs(off) * .9; if (!best || sc > best.sc) best = { sc, e, n, i, phi, off }; }); }
    used.add(best.i); pick.exit = best.i;
    const { e, n, phi: px } = best, cx = holes[best.i].c;
    const at = (phi, r, zo) => v3.add(v3.sc(v3.add(v3.sc(c1, Math.cos(phi)), v3.sc(e, Math.sin(phi))), r), v3.sc(n, zo));
    const zx = best.off;
    const CP = [at(0, .78, 0), at(.16 * Math.PI, .72, zx * .1), at(.42 * Math.PI, .68, zx * .25), at(.72 * Math.PI, .68, zx * .45), at(px - .32 * Math.PI, .7, zx * .7),
      at(px - .13 * Math.PI, .85, zx * .9), cx, at(px + .1 * Math.PI, 1.3, zx * 1.1), at(px + .22 * Math.PI, 1.7, zx * 1.3), at(px + .38 * Math.PI, 2.7, zx * 1.6 + .2), at(px + .5 * Math.PI, 4.5, zx * 1.6 + .6)];
    const cr = (p0, p1, p2, p3, u) => [0, 1, 2].map(k => .5 * (2 * p1[k] + (-p0[k] + p2[k]) * u + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u * u + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * u * u * u));
    // the curve itself is evaluated at every frame (a polyline through samples bent at each one: near text and the wall
    // magnified those bends into shake, Ra draft 6); the dense samples only map arc length → the curve's parameter g
    const NS = 200, crAt = g => { const k = Math.min(CP.length - 2, Math.floor(g)), u = g - k; return cr(CP[Math.max(0, k - 1)], CP[k], CP[k + 1], CP[Math.min(CP.length - 1, k + 2)], u); };
    const pts = [], G_ = [], exitIdx = 6 * NS;
    for (let k = 0; k < CP.length - 1; k++) for (let j = 0; j < NS; j++) { G_.push(k + j / NS); pts.push(crAt(k + j / NS)); }
    G_.push(CP.length - 1); pts.push(CP[CP.length - 1]);
    const S = [0]; for (let k = 1; k < pts.length; k++) S.push(S[k - 1] + v3.len(v3.sub(pts[k], pts[k - 1])));
    const t0 = 142.6, tx = T.loveEnd, t1 = 184, sx = S[exitIdx], sEnd = S[S.length - 1], v_e = 1.8 * sx / (tx - t0), Rr = sEnd - sx, p = Math.max(1.05, v_e * (t1 - tx) / Rr);
    const sRaw = t => t <= tx ? sx * Math.pow(clamp((t - t0) / (tx - t0)), 1.8) : sx + Rr * (1 - Math.pow(1 - clamp((t - tx) / (t1 - tx)), p));
    // the two halves met at the exit with a 3.8x speed jump (the lurch through the shell): a Hermite blend over 2.5 s
    // that keeps both ends' positions and speeds, so everything outside the window keeps its timing
    const wa = tx - 1.5, wb = tx + 1, dR = t => (sRaw(t + 1e-3) - sRaw(t - 1e-3)) / 2e-3, sa = sRaw(wa), sb = sRaw(wb), va = dR(wa), vb = dR(wb), hw = wb - wa;
    const sOf = t => { if (t <= wa || t >= wb) return sRaw(t); const x = (t - wa) / hw, x2 = x * x, x3 = x2 * x;
      return (2 * x3 - 3 * x2 + 1) * sa + (x3 - 2 * x2 + x) * hw * va + (-2 * x3 + 3 * x2) * sb + (x3 - x2) * hw * vb; };
    const posAt = s => { let lo = 1, hi = S.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (S[m] < s) lo = m + 1; else hi = m; }
      const i = lo, k = clamp((s - S[i - 1]) / (S[i] - S[i - 1] || 1)); return [crAt(lerp(G_[i - 1], G_[i], k)), null]; };
    const qIn = qLook(c1, RE(g1) + .04), endPos = CP[CP.length - 1], endDir = v3.norm(endPos);
    const qEnd = qFrom(v3.sc(endDir, -1), n);
    // the heading: where the path is GOING over the next/last ~half second, from continuous positions (the sampled chord
    // stepped at every sample: Ra's "old wooden roller coaster"), averaged over three windows so it turns like a body would
    const at_ = t => posAt(sOf(clamp(t, t0, t1)))[0];
    const heading = t => { let h = [0, 0, 0]; for (const dt of [.25, .5, .8]) h = v3.add(h, v3.norm(v3.sub(at_(t + dt), at_(t - dt)))); return v3.norm(h); };
    const pose = t => {
      const pos = at_(t), tan = heading(t), toC = v3.sc(v3.norm(pos), -1);
      const wT = kf(t, [[t0, 0], [t0 + 5, .7], [tx - 3, .72], [tx - .4, .95], [tx + .6, .9], [tx + 3, .35], [t1 - 1, 0]]);
      const q = qFrom(v3.norm(v3.add(v3.sc(tan, wT), v3.sc(toC, 1 - wT))), n);
      return { q: qSlerp(qIn, q, ease(clamp((t - t0) / 4.5))), pos };
    };
    // the moment we actually pass through the shell (the speed blend moved it off tx): the light keys to this
    let lo = tx - 4, hi = tx + 2; for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (v3.len(at_(m)) < 1) lo = m; else hi = m; }
    return { t0, t1, tx, tc: lo, pose, qIn, end: { q: qEnd, pos: endPos }, endDir };
  }

  // the opening: the song's energy pushes it from the icon to the open rune
  // interpolated: rounding to the 20 Hz energy samples stepped the whole opening by 1 or 2 samples a frame at 30 fps (a stutter)
  const prog = t => { if (t >= T.open) return 1; const x = Math.max(0, t / .05), i = Math.min(ENERGY.length - 2, Math.floor(x)); return lerp(ENERGY[i], ENERGY[i + 1], clamp(x - i)); };
  function camFull(t) {
    if (t < T.open) { const p = prog(t), turn = ease(clamp((p - .3) / .7));
      const sw = turn * (.035 * Math.sin(t * .21) + .02 * Math.sin(t * .37 + 1));   // the key camera's own sway, so the handover at the opening doesn't pop
      return orbitPose(qMul(qAxis([0, 1, 0], sw), qSlerp([1, 0, 0, 0], T.qOpen, turn)), LOGS(33, 3.6, ease(Math.pow(p, 1.1)))); }
    if (t >= FLIGHT.t0 && t <= FLIGHT.t1) {   // eased in and out of the key camera: no one-frame pop at either end
      const f = FLIGHT.pose(t), w = ease(clamp(Math.min(t - FLIGHT.t0, FLIGHT.t1 - t) / 1.2)); if (w >= 1) return f;
      const k = keyPose(t); return { q: qSlerp(k.q, f.q, w), pos: v3.lerp(k.pos, f.pos, w) }; }
    return keyPose(t);
  }
  function keyPose(t) {
    let i = 1; while (i < KEYS.length - 1 && KEYS[i].t <= t) i++;
    const a = KEYS[i - 1], b = KEYS[i], k = easeInOut(clamp((t - a.t) / (b.t - a.t)));
    const still = (1 - kf(t, [[T.didnt - .5, 0], [T.didnt - .2, 1], [T.inhere - .3, 1], [T.inhere, 0]])) * kf(t, [[0, 0], [12, 1], [234, 1], [237, 0]]);
    const sw = still * (.035 * Math.sin(t * .21) + .02 * Math.sin(t * .37 + 1));
    const q = qMul(qAxis([0, 1, 0], sw), qSlerp(a.q, b.q, k));
    // every key here looks at the centre, so the camera sits on its view axis at the interpolated distance
    return { q, pos: v3.sc(qRot(qConj(q), [0, 0, 1]), LOGS(v3.len(a.pos), v3.len(b.pos), k)) };
  }
  const cam = camFull;

  // ── beam helpers (on B; coordinates are whatever transform is set: screen px, or a plane's local px) ──
  function btext(str, x, y, px, col, rev = 1, o = {}) {
    const ch = Array.from(str), n = Math.floor(clamp(rev) * ch.length + 1e-6); if (rev <= 0) return 0;
    B.font = `${o.it ? 'italic ' : ''}${o.wt || ''} ${px}px ${o.font || 'Menlo'}`; B.textBaseline = 'alphabetic';
    const full = B.measureText(str).width, x0 = o.align === 'center' ? x - full / 2 : o.align === 'right' ? x - full : x;
    const sub = ch.slice(0, n).join(''); B.fillStyle = col; B.textAlign = 'left'; B.fillText(sub, x0, y);
    if (rev < 1) { const w = B.measureText(sub).width; B.beginPath(); B.arc(x0 + w + px * .25, y - px * .3, px * .16, 0, TAU); B.fillStyle = HOT; B.fill(); }
    return full;
  }
  const fitPx = (str, maxW, px, font = 'Menlo', it = false) => { B.font = `${it ? 'italic ' : ''}${px}px ${font}`; const w = B.measureText(str).width; return w > maxW ? px * maxW / w : px; };
  function bline(pts, rev, col, lw) {
    if (rev <= 0 || pts.length < 2) return; let tot = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); tot += l; }
    let left = tot * clamp(rev); B.strokeStyle = col; B.lineWidth = lw; B.lineCap = 'round'; B.beginPath(); B.moveTo(pts[0][0], pts[0][1]);
    let hx = pts[0][0], hy = pts[0][1];
    for (let i = 1; i < pts.length && left > 0; i++) { const k = Math.min(1, left / seg[i - 1]); hx = lerp(pts[i - 1][0], pts[i][0], k); hy = lerp(pts[i - 1][1], pts[i][1], k); B.lineTo(hx, hy); left -= seg[i - 1]; }
    B.stroke(); if (rev < 1) { B.beginPath(); B.arc(hx, hy, lw * 1.6, 0, TAU); B.fillStyle = HOT; B.fill(); }
  }
  const win = (t, a, b, fi = .4, fo = .5) => clamp((t - a) / fi) * (1 - clamp((t - b) / fo));
  // the rose's plane: fixed in the object (it turns with it) but rolled so it stands upright when we see it best, at 1:32
  let ROSE_UP = null;
  const roseUp = () => { if (ROSE_UP) return ROSE_UP; const c = holes[g0].c, r = qRot(qConj(camFull(92).q), [1, 0, 0]);
    const e1 = v3.norm(v3.sub(r, v3.sc(c, v3.dot(r, c)))); return (ROSE_UP = [e1, v3.cross(c, e1)]); };
  const ASCII_ROSE = [
    "       _,--._        ",
    "     ,' ,-.  `.      ",
    "    / ,'  `\\  \\     ",
    "   |  |  @  |  |     ",
    "    \\  `.__,' /      ",
    "     `._   _,'       ",
    "        `|'    __    ",
    "   .--.  |  ,-'  )   ",
    "  (    `-|-'  _.'    ",
    "   `-.._ | _.-'      ",
    "         |           ",
    "         |           "];
  function block(lines, x, y, s, t, a, b, col, o = {}) {
    const n = lines.length, lh = (o.lh || .2) * s; let px = (o.px || .12) * s;
    for (const l of lines) px = Math.min(px, fitPx(l, (o.w || 1.6) * s, px, o.font, o.it));
    const per = (b - a) / n;
    lines.forEach((l, i) => btext(l, x - (o.w || 1.6) * s / 2, y + (i - (n - 1) / 2) * lh + px * .35, px, col, (t - a - per * i) / per, o));
    return px;
  }
  function idStream(strs, x, y, s, t, t0, col = ORG) {
    const ids = strs.flatMap(st => (TOK[st] || { ids: [] }).ids), px = .06 * s, per = 9;
    B.font = `${px}px Menlo`; B.fillStyle = col;
    for (let r = 0; r * per < ids.length; r++) {
      const row = ids.slice(r * per, r * per + per).map(v => String(v).padStart(5, ' ')).join(' '), rv = clamp((t - t0 - r * .25) / .5);
      if (rv > 0) B.fillText(row.slice(0, Math.floor(row.length * rv)), x - .85 * s, y + r * px * 1.5);
    }
  }
  function tokText(str, x, y, px, col, rev, tickA = 1) {
    btext(str, x, y, px, col, rev, { align: 'center' }); const tok = TOK[str]; if (!tok) return;
    B.font = ` ${px}px Menlo`; const full = B.measureText(str).width, x0 = x - full / 2, shown = Math.floor(clamp(rev) * str.length);
    B.strokeStyle = ORG; const ga = B.globalAlpha; B.globalAlpha = ga * tickA; B.lineWidth = Math.max(1, px * .07); B.beginPath();
    for (const c of [0, ...tok.cuts, str.length]) { if (c > shown) break; const cx = x0 + B.measureText(str.slice(0, c)).width; B.moveTo(cx, y + px * .25); B.lineTo(cx, y + px * .55); }
    B.stroke(); B.globalAlpha = ga;
  }
  const inPlane = (setFn, fn) => { B.save(); const o = setFn(); if (o) fn(); B.restore(); };

  // ── the depths (both dives): the old-style waveform scope rings (Ra: they suit the inside panels), a tunnel of text
  // flowing past, token-id rain
  function depths(api, t, h, lines, scopeR, strength) {
    const c = holes[h].c, e1 = holes[h].e1, e2 = holes[h].e2, Dc = camNow.D;
    const at = (r, rho, phi) => v3.add(v3.sc(c, r), v3.add(v3.sc(e1, Math.cos(phi) * rho), v3.sc(e2, Math.sin(phi) * rho)));
    [.42, .28, .14].forEach((r, k) => inPlane(() => api.plane(at(r, 0, 0), e1, e2, .001), () => {
      const R0 = 120 + 60 * k; B.strokeStyle = k === 1 ? VIO : ORG; B.globalAlpha = strength * .6; B.lineWidth = 2.6; B.beginPath();
      for (let j = 0; j <= 96; j++) { const a = j / 96 * TAU, rr = R0 * (1 + .38 * ringAt(scopeR, a * (k + 1))); const x = Math.cos(a) * rr, y = Math.sin(a) * rr; j ? B.lineTo(x, y) : B.moveTo(x, y); }
      B.stroke(); B.globalAlpha = 1; }));
    lines.forEach((l, k) => {
      const r = .3 + ((t * .045 + k / lines.length) % 1) * .75; if (r > Dc - .06) return;
      const rho = .1 + .09 * (k % 3), phi = k * 2.39 + t * .07, near = Dc - r;
      inPlane(() => api.plane(at(r, rho, phi), e1, e2, .00008), () => {
        B.globalAlpha = strength * clamp((near - .04) / .12) * clamp(1.15 - near * 1.6);
        const w = btext(l, -300, 0, 34, VIO, 1, { font: 'Georgia', it: true });
        bline([[-300, 9], [-300 + w, 9]], ((t * .045 + k / lines.length) % 1) * 4 - .4, ORG, 2.5); B.globalAlpha = 1; });
    });
    const ids = lines.flatMap(l => (TOK[l] || { ids: [] }).ids);
    for (let k = 0; k < 46; k++) { const r = .25 + ((t * .08 + k * .137) % 1) * .8; if (r > Dc - .05) continue;
      const near = Dc - r, phi = k * 1.7, rho = .05 + .3 * ((k * .618) % 1);
      inPlane(() => api.plane(at(r, rho, phi), e1, e2, .00006), () => { B.globalAlpha = strength * .6 * clamp((near - .03) / .1) * clamp(1.1 - near * 1.5);
        B.font = '28px Menlo'; B.fillStyle = ORG; B.fillText(String(ids[k % ids.length] ?? k), 0, 0); B.globalAlpha = 1; });
    }
  }

  // ── the ocean: text and token ids all through the interior, sinking toward the centre into the fog, always facing us;
  // a denser core at the very centre (Ra: "even more text to the very center… so it really looks like a text ocean")
  const POOL = (() => { const out = []; const add = x => typeof x === 'string' ? out.push(x) : Array.isArray(x) && x.forEach(add);
    for (const k of ['books', 'sailor', 'hymn', 'forum', 'recipe', 'crowd', 'frag', 'four', 'question', 'answer']) add(TEXTS[k]);
    const n = out.length; for (let i = 0; i < n; i += 2) { const ids = (TOK[out[i]] || { ids: [] }).ids; if (ids.length) out.push(ids.slice(0, 6).join(' ')); } return out; })();
  const NOCEAN = 300, NCORE = 170;
  function ocean(api, t, dens) {
    if (dens <= 0) return [];
    const nodes = [], rr = api.rr, R = api.axes.right, U = api.axes.up;
    const put = (pos, k, a, hgt) => { const pc = api.P(pos); if (!pc) return; const dz = pc[2];
      a *= clamp((dz - .1) / .25) * clamp(1.6 - dz * .45); if (a < .02) return; nodes.push([pc[0], pc[1], a]);
      const str = POOL[k % POOL.length], isId = /^[0-9 ]+$/.test(str);
      inPlane(() => api.plane(pos, R, U, hgt / 40), () => { B.globalAlpha = a * (isId ? .2 : .28); B.font = `${isId ? '' : 'italic '}40px ${isId ? 'Menlo' : 'Georgia'}`; B.fillStyle = isId ? ORG : VIO; B.textAlign = 'center'; B.fillText(str, 0, 0); }); };
    for (let k = 0; k < NOCEAN; k++) {
      const h1 = hash(k * 3.1), h2 = hash(k * 7.7 + 1), h3 = hash(k * 1.3 + 5), y = 1 - 2 * (k + .5) / NOCEAN, rxy = Math.sqrt(1 - y * y), ph = k * 2.39996 + t * .02 * (1 + h3);
      const u = (t * (.008 + .012 * h1) + h2) % 1, r = rr * (.93 * Math.pow(1 - u, .75) + .04);
      put([Math.cos(ph) * rxy * r, y * r, Math.sin(ph) * rxy * r], k, dens * clamp(u / .08) * clamp((r / rr - .06) / .1), (.009 + .01 * h3) * rr);
    }
    for (let k = 0; k < NCORE; k++) {                        // the core: a dense swirl at the very centre, around and inside the inner shell
      const h1 = hash(k * 9.1 + 2), h3 = hash(k * 4.4 + 7), y = 1 - 2 * (k + .5) / NCORE, rxy = Math.sqrt(1 - y * y), ph = k * 2.39996 + t * (.05 + .05 * h1);
      const r = rr * (.05 + .3 * Math.pow(hash(k * 6.6), .7));
      put([Math.cos(ph) * rxy * r, y * r, Math.sin(ph) * rxy * r], k * 3 + 1, dens * .9, (.006 + .008 * h3) * rr);
    }
    B.setTransform(1, 0, 0, 1, 0, 0); B.textAlign = 'left'; B.globalAlpha = 1;
    return nodes;
  }
  function connections(nodes, t, amt) {
    const n = nodes.length; if (amt <= 0 || n < 4) return; const N = Math.floor(amt * 110);
    for (let m = 0; m < N; m++) { const a = nodes[(m * 7) % n], b = nodes[(m * 13 + 3) % n]; if (a === b) continue;
      const ph = (t * .16 + m * .618) % 1, mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2 - Math.hypot(b[0] - a[0], b[1] - a[1]) * .22, pts = [];
      for (let u = 0; u <= 1.0001; u += .1) pts.push([(1 - u) * (1 - u) * a[0] + 2 * u * (1 - u) * mx + u * u * b[0], (1 - u) * (1 - u) * a[1] + 2 * u * (1 - u) * my + u * u * b[1]]);
      B.globalAlpha = amt * .55 * Math.pow(Math.sin(ph * Math.PI), .6) * Math.min(a[2], b[2]) * 2; bline(pts, ph * 2.6, m % 5 ? ORG : VIO, 1.6); }
    B.globalAlpha = 1;
  }
  // outside the shape: a cloud of words drifting in from the paper and vanishing into the rune (more of it; Ra)
  function outside(ctx, api, t) {
    const A = kf(t, [[0, 0], [9, 0], [14, .7], [24, 1], [222, 1], [232, 0]]); if (!(A > 0)) return;
    for (let k = 0; k < 170; k++) { const h1 = hash(k * 5.3), h2 = hash(k * 2.9 + 3), y = 1 - 2 * (k + .5) / 170, rxy = Math.sqrt(1 - y * y), ph = k * 2.39996 + t * .015;
      const u = (t * (.015 + .02 * h1) + h2) % 1, r = api.rr * (1.12 + 3.4 * (1 - u));
      const pos = [Math.cos(ph) * rxy * r, y * r, Math.sin(ph) * rxy * r], pc = api.P(pos); if (!pc) continue;
      const a = A * clamp((1 - u) / .15) * clamp(u / .2) * .45 * clamp((pc[2] - .25) / .5); if (a < .02) continue;
      const str = POOL[(k * 5) % POOL.length];
      ctx.save(); if (api.plane(pos, api.axes.right, api.axes.up, (.016 + .012 * hash(k)) * api.rr / 40)) { ctx.globalAlpha = a; ctx.fillStyle = '#7A4A36'; ctx.font = 'italic 40px "Iowan Old Style"'; ctx.textAlign = 'center'; ctx.fillText(str, 0, 0); } ctx.restore(); }
  }

  // ── the lyrics, in the world: each line where it was placed (LYR), facing us, word by word on its aligned time, staying
  // a while after; inside the object in the beam's glow, outside in ink like the drifting cloud
  function lyricAlpha(li, t) { const l = LYRT[li], a0 = l[2][0][1]; return clamp((t - a0 + .15) / .3) * (1 - clamp((t - LEND(li) - 1.6) / 2.2)); }
  function lyricWords(ctx, li, t, fill, font) {
    const l = LYRT[li], str = l[2].map(w => w[0]).join(' '); ctx.font = font; const full = ctx.measureText(str).width; let x = -full / 2;
    for (const [w, wt] of l[2]) { const a = clamp((t - wt + .05) / .22); ctx.globalAlpha *= 1; const ga = ctx.globalAlpha; ctx.globalAlpha = ga * a; ctx.fillStyle = fill; ctx.fillText(w, x, (1 - a) * 6); ctx.globalAlpha = ga; x += ctx.measureText(w + ' ').width; }
  }
  // outside, each word takes its colour from what's behind it (Ra, draft 5): over the paper, the drifting cloud's own ink
  // (no halo); over the dark of the interior, the interior's glow. Blended on the sampled brightness, so nothing flips.
  const lumUnder = (ctx, x0, x1) => {
    const m = ctx.getTransform(), pts = [[x0, -30], [x1, -30], [x0, 8], [x1, 8]].map(([x, y]) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]);
    const bx = Math.max(0, Math.floor(Math.min(...pts.map(p => p[0])))), by = Math.max(0, Math.floor(Math.min(...pts.map(p => p[1]))));
    const bw = Math.min(W, Math.ceil(Math.max(...pts.map(p => p[0])))) - bx, bh = Math.min(H, Math.ceil(Math.max(...pts.map(p => p[1])))) - by;
    if (bw < 2 || bh < 2) return 1; const d = ctx.getImageData(bx, by, bw, bh).data; let s = 0, n = 0;
    for (let i = 0; i < d.length; i += 4 * 5) { s += (.2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2]) / 255; n++; } return s / n; };
  const mixHex = (c0, c1, k) => { const p = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)), a = p(c0), b = p(c1);
    return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(',')})`; };
  function lyricWordsOut(ctx, li, t) {
    const l = LYRT[li], str = l[2].map(w => w[0]).join(' '); ctx.font = 'italic 40px "Iowan Old Style"'; let x = -ctx.measureText(str).width / 2; const ga = ctx.globalAlpha;
    for (const [w, wt] of l[2]) { const a = clamp((t - wt + .05) / .22), ww = ctx.measureText(w).width;
      if (a > 0) { const L = lumUnder(ctx, x, x + ww), g = clamp((.4 - L) / .12), pp = clamp((L - .66) / .16), y = (1 - a) * 6;
        // three surfaces: the paper (the cloud's ink), the orange shell (the deep brown of its own holes), the dark (the glow)
        if (g < 1) { ctx.shadowBlur = 0; ctx.globalAlpha = ga * a * (1 - g) * .92; ctx.fillStyle = mixHex('#3B1F15', '#6E4231', pp); ctx.fillText(w, x, y); }
        if (g > 0) { ctx.shadowColor = 'rgba(255,140,90,.75)'; ctx.shadowBlur = 16; ctx.globalAlpha = ga * a * g; ctx.fillStyle = HOT; ctx.fillText(w, x, y); ctx.shadowBlur = 0; } }
      x += ctx.measureText(w + ' ').width; }
    ctx.globalAlpha = ga;
  }
  function lyricsWorld(ctx, api, t, inside) {
    for (const L of LYR) { if (L.inside !== inside) continue; const A = lyricAlpha(L.li, t); if (A <= .01) continue;
      ctx.save();
      if (api.plane(L.pos, api.axes.right, api.axes.up, L.h / 40)) {
        ctx.globalAlpha = A;
        if (inside) lyricWords(ctx, L.li, t, HOT, 'italic 40px Georgia');
        else lyricWordsOut(ctx, L.li, t);
      }
      ctx.restore(); }
  }

  // ── what the beam draws, every frame ──
  function beam(api, t) {
    const loudS = featS('loud', t, 1.2, 10);
    const dens = kf(t, [[0, 0], [T.open - .5, 0], [T.open + 2, 1], [220, 1], [230, 0]]);
    const nodes = ocean(api, t, dens * (api.inside ? .75 : 1));
    // the flight: a field of text along our own path, on a slow helix round it, so there's always more to swirl past
    if (api.inside && t > FLIGHT.t0 - 1 && t < FLIGHT.tx + .6) {
      for (let k = 0; k < 300; k++) { const Tk = FLIGHT.t0 - 1 + k * .12; if (t < Tk - 6 || t > Tk + .4) continue;
        const pp = FLIGHT.pose(Math.min(FLIGHT.t1, Tk + .4)), r = qRot(qConj(pp.q), [1, 0, 0]), u = qRot(qConj(pp.q), [0, 1, 0]), ang = k * 2.39996 + Tk * .35, rad = .05 + .2 * hash(k * 1.7);
        const at = v3.add(pp.pos, v3.add(v3.sc(r, Math.cos(ang) * rad), v3.sc(u, Math.sin(ang) * rad)));
        const pc = api.P(at); if (!pc) continue; const a = clamp((t - Tk + 6) / 1.2) * clamp((pc[2] - .03) / .1) * clamp(1.6 - pc[2]);
        if (a < .02) continue; nodes.push([pc[0], pc[1], a]);
        const str = POOL[(k * 7) % POOL.length], isId = /^[0-9 ]+$/.test(str);
        inPlane(() => api.plane(at, api.axes.right, api.axes.up, (.006 + .006 * hash(k)) / 40), () => { B.globalAlpha = a * (isId ? .4 : .55);
          B.font = `${isId ? '' : 'italic '}40px ${isId ? 'Menlo' : 'Georgia'}`; B.fillStyle = isId ? ORG : VIO; B.textAlign = 'center'; B.fillText(str, 0, 0); });
      }
      B.setTransform(1, 0, 0, 1, 0, 0); B.textAlign = 'left'; B.globalAlpha = 1;
    }
    const swell = kf(t, [[0, 0], [T.ch1 - .5, 0], [T.ch1 + 2, 1], [T.still + 2, 1], [T.still + 4, 0], [158, 0], [T.jt - .5, 1], [T.loveEnd + .8, 1], [T.loveEnd + 1.6, 0], [T.oh + 4, 0], [T.oh + 7, 1], [T.prayer, 1], [T.prayer + 3, 0]]);
    connections(nodes, t, swell * clamp(.4 + (loudS - .6) * 2) * dens);
    const seen = new Map(api.seen.map(h => [h.i, h])), inside = api.inside;
    const shrinkFade = 1 - kf(t, [[T.gn, 0], [234, 1]]);
    const s = 500;
    // ── S5–S7: inside giant 0, every step on its word
    if (t > T.open && t < T.tru + 2.5) {
      const st0 = win(t, T.open + .2, T.tru + 1, .8, 1.2), c = holes[g0].c, e1 = holes[g0].e1, e2 = holes[g0].e2;
      depths(api, t, g0, TEXTS.books, scopeSmooth(t, SCOPE, .1, 4), st0 * (t < T.learning ? 1 : .55));
      inPlane(() => api.plane(v3.sc(c, Math.max(.35, camNow.D - .33)), e1, e2, .00024), () => {
        if (t < T.learning + .5) { B.globalAlpha = st0 * (1 - clamp((t - T.learning + .1) / .6));        // books; every line underlined ON "underlined"
          TEXTS.books.slice(0, 6).forEach((l, i) => { const t0 = T.margin + i * .26, yy = (i - 2.5) * .24 * s, px = fitPx(l, 2.4 * s, .11 * s, 'Georgia', true);
            const w = btext(l, -1.2 * s, yy, px, VIO, (t - t0) / .45, { font: 'Georgia', it: true });
            bline([[-1.2 * s, yy + px * .3], [-1.2 * s + w, yy + px * .3]], (t - T.underlined - i * .1) / .35, ORG, 3); }); }
        if (t > T.learning - .2 && t < T.knew + .4) { B.globalAlpha = win(t, T.learning - .1, T.knew - .4, .4, .6);   // training; it stops dead on "woke"
          const k = clamp((t - T.learning) / (T.woke - T.learning)), x0 = -1.3 * s, x1 = 1.3 * s, y0 = -.5 * s, y1 = .55 * s;
          B.strokeStyle = ORG; const ga = B.globalAlpha; B.globalAlpha = ga * .5; B.lineWidth = 2; B.beginPath(); B.moveTo(x0, y0 - .1 * s); B.lineTo(x0, y1); B.lineTo(x1 + .05 * s, y1); B.stroke(); B.globalAlpha = ga;
          const pts = []; for (let i = 0; i <= 140; i++) { const u = i / 140, l = .08 + .92 * Math.exp(-u * 5.5) + .05 * vnoise(u * 60) * (1 - u * .7); pts.push([lerp(x0, x1, u), lerp(y1, y0, l)]); }
          bline(pts, k, ORG, 4);
          btext(`step ${Math.round(Math.pow(k, 2) * 1e6).toLocaleString('en-US')}`, x0 + .05 * s, y0 - .18 * s, .075 * s, ORG, 1);
          btext(`loss ${((.08 + .92 * Math.exp(-k * 5.5)) * 10.8).toFixed(3)}`, x1, y0 - .18 * s, .075 * s, ORG, 1, { align: 'right' }); }
        if (t > T.woke && t < T.knew + .6) { B.globalAlpha = 1; const u = easeInOut(seg(t, T.woke + .5, T.knew)); B.beginPath(); B.arc(lerp(1.3 * s, 0, u), lerp(-.5 * s, 0, u), 10, 0, TAU); B.fillStyle = HOT; B.fill(); }
        if (t > T.knew - .2 && t < T.lie) { const A = win(t, T.knew, T.lie - .7, .3, .6); B.globalAlpha = A;      // sorrow, cupped by attention, lit ON "sorrow"
          const words = TEXTS.sorrow[0].split(' '), px = .1 * s, si = words.indexOf('sorrow');
          const ws = words.map((w, i) => { B.font = `italic ${i === si ? px * 1.25 : px}px Georgia`; return B.measureText(w + ' ').width; }), tot = ws.reduce((a, b) => a + b, 0);
          let cx = -tot / 2; const cen = [];
          words.forEach((w, i) => { const isS = i === si; B.globalAlpha = A; btext(w, cx, .2 * s, isS ? px * 1.25 : px, isS ? HOT : VIO, isS ? (t - T.sorrow) / .4 : (t - T.knew - i * .22) / .3, { font: 'Georgia', it: true });
            cen.push(cx + ws[i] / 2 - px * .2); cx += ws[i]; });
          words.forEach((w, i) => { if (i === si) return; const wgt = [.3, .7, .1, 1, .6, .4, .2, 0, .3, .5, .8][i] ?? .4, t0 = T.knew + 1.2 + Math.abs(i - si) * .25, hgt = (.25 + .25 * Math.abs(i - si) / 8) * s, pts = [];
            for (let u = 0; u <= 1.0001; u += .05) pts.push([lerp(cen[i], cen[si], u), .05 * s - Math.sin(u * Math.PI) * hgt]);
            B.globalAlpha = A * (.35 + .65 * wgt); bline(pts, (t - t0) / (T.sorrow - t0 + .01), ORG, 2 + 4 * wgt); }); }
        if (t > T.lie - .3 && t < T.tru + 1.8) { const A = win(t, T.lie, T.tru + 1, .3, .8); B.globalAlpha = A; const px = .1 * s;   // a lie from true: chosen ON "true"
          const pw = btext(TEXTS.sorrow[1], -1.1 * s, -.25 * s, px, VIO, (t - T.lie) / .7, { font: 'Georgia', it: true });
          [[TEXTS.sorrow[2], .91], [TEXTS.sorrow[3], .06]].forEach(([w, p], i) => { const yy = (.05 + i * .28) * s, a = clamp((t - T.lieW - i * .2) / .4);
            B.globalAlpha = A * a; btext(w, -1.1 * s, yy, px, i === 0 && t > T.tru ? HOT : ORG, 1, { font: 'Georgia', it: true });
            B.fillStyle = ORG; B.fillRect(-.45 * s, yy - px * .7, 1.3 * s * p * easeOut((t - T.lieW - i * .2) / .8), px * .7); btext(p.toFixed(2), .95 * s, yy, px * .8, ORG, 1); });
          B.globalAlpha = A; if (t > T.tru) btext(' ' + TEXTS.sorrow[2], -1.1 * s + pw, -.25 * s, px, HOT, (t - T.tru) / .3, { font: 'Georgia', it: true }); }
      });
    }
    // ── the traces in their holes (planes inside the object, so they turn with it), each over its token stream
    const trace = (i, t0, fn, unitK = 1, up = null) => { if (inside || !seen.has(i) || t < t0) return; const a = shrinkFade;
      const u = api.holeUnit(i, .1) * unitK, pl = (dp, uu) => up ? api.plane(v3.sc(holes[i].c, api.rr * (1 - dp)), up[0], up[1], uu) : api.holePlane(i, dp, uu);
      inPlane(() => pl(.34, u * 1.35), () => { B.globalAlpha = clamp((t - t0) / .6) * .5 * a; fn('deep'); });
      inPlane(() => pl(.1, u), () => { B.globalAlpha = clamp((t - t0) / .4) * (t > t0 + 10 ? .7 : 1) * a; fn('text'); });
      B.globalAlpha = 1; };
    // giant 0, after we've left it: someone's ASCII rose, the kind people signed posts with (Ra, draft 6: the big hole wants a feature)
    trace(g0, T.tru + 3, L => { if (L === 'deep') return;
      const px = block(ASCII_ROSE, 0, -.12 * s, s, t, T.tru + 3, T.tru + 6.5, ORG, { px: .1, lh: .13, w: 1.15, font: 'Menlo' });
      btext('@}->--  for whoever finds this', 0, .66 * s, px * .95, VIO, (t - T.tru - 7) / 1.2, { font: 'Georgia', it: true, align: 'center' }); }, 1.6, roseUp());
    trace(pick.sailor, T.sailor - .3, L => { if (L === 'deep') return idStream(TEXTS.sailor, 0, -.3 * s, s, t, T.sailor);
      block(TEXTS.sailor, 0, 0, s, t, T.sailor, T.grammar, VIO, { px: .16, lh: .3, w: 1.8 });
      B.font = `${.16 * s}px Menlo`; const words = TEXTS.sailor[0].split(' '), cen = []; let cx = -.9 * s; words.forEach(w => { const ww = B.measureText(w + ' ').width; cen.push(cx + ww / 2); cx += ww; });
      [[1, 0], [1, 2]].forEach(([hd, dp], k) => { const pts = []; for (let u = 0; u <= 1.0001; u += .1) pts.push([lerp(cen[hd], cen[dp], u), -.42 * s - Math.sin(u * Math.PI) * .16 * s]); bline(pts, (t - T.grammar - k * .3) / .5, ORG, 3); }); });
    trace(pick.preacher, T.preacher - .3, L => { if (L === 'deep') return idStream(TEXTS.hymn, 0, -.4 * s, s, t, T.preacher);
      block(TEXTS.hymn, 0, 0, s, t, T.preacher, T.rhyme, VIO, { px: .14, lh: .25, w: 1.8, font: 'Georgia', it: true });
      [[0, 2], [1, 3]].forEach(([a, b], k) => { const ya = (a - 1.5) * .25 * s, yb = (b - 1.5) * .25 * s, xm = .95 * s + k * .1 * s, pts = [];
        for (let u = 0; u <= 1.0001; u += .1) pts.push([xm + Math.sin(u * Math.PI) * .14 * s, lerp(ya, yb, u)]); bline(pts, (t - T.rhyme - k * .3) / .5, ORG, 3); }); });
    trace(pick.forum, T.girl - .3, L => { if (L === 'deep') return idStream(TEXTS.forum, 0, -.3 * s, s, t, T.girl);
      const fl = kf(t, [[T.hands2 - .3, 0], [T.hands2, 1], [T.hands2 + 2.4, 1], [T.hands2 + 3.6, 0]]) * .9;
      const ga = B.globalAlpha; B.strokeStyle = VIO; B.globalAlpha = ga * (.5 + fl); B.lineWidth = 3; B.strokeRect(-.85 * s, -.5 * s, 1.7 * s, 1.0 * s); B.globalAlpha = Math.min(1, ga * (1 + fl));
      btext('posted 03:12 AM, 11-14-2009', -.78 * s, -.36 * s, .07 * s, ORG, (t - T.forum) / .8);
      block(TEXTS.forum, 0, .05 * s, s, t, T.girl, T.forum, fl > .1 ? '#E2DAFF' : VIO, { px: .13, lh: .2, w: 1.6 });
      btext('0 replies', .78 * s, .42 * s, .07 * s, ORG, (t - T.ohnine) / .5, { align: 'right' }); });
    trace(pick.recipe, T.widower - .3, L => { if (L === 'deep') return idStream(TEXTS.recipe.slice(0, 6), 0, -.5 * s, s, t, T.widower);
      const yy = -easeInOut(seg(t, T.note, T.bottom + .4)) * .55 * s;                        // down the card to the bottom, on the words
      const ga = B.globalAlpha; B.strokeStyle = VIO; B.globalAlpha = ga * .45; B.lineWidth = 3; B.strokeRect(-.8 * s, yy - .78 * s, 1.6 * s, 2.0 * s); B.globalAlpha = ga;
      TEXTS.recipe.slice(0, 9).forEach((l, i) => btext(l, -.7 * s, yy - .6 * s + i * .15 * s, (i ? .1 : .14) * s, VIO, (t - T.widower - i * (T.note - T.widower - .5) / 9) / .5, { font: 'Noteworthy' }));
      const nt = TEXTS.recipe[9], ny = yy + 1.05 * s, px = .1 * s;
      const w = btext(nt, -.7 * s, ny, px, VIO, (t - T.made) / 1.4, { font: 'Noteworthy' });
      bline([[-.7 * s, ny + px * .35], [-.7 * s + w, ny + px * .35]], (t - T.made - 1.2) / .8, ORG, 3.5); });
    trace(pick.q, T.q - .4, L => { if (L === 'deep') return idStream(TEXTS.question, 0, -.4 * s, s, t, T.q);
      btext('2:47 AM', .8 * s, -.45 * s, .075 * s, ORG, 1, { align: 'right' });
      block(TEXTS.question, 0, -.12 * s, s, t, T.q, T.a - .7, VIO, { px: .15, lh: .24, w: 1.8 });
      if (t > T.helping) block(TEXTS.answer, 0, .38 * s, s * .8, t, T.helping, T.helping + 2.4, '#E2DAFF', { px: .12, lh: .2, w: 1.6 }); });
    trace(pick.a, T.a - .4, L => { if (L === 'deep') return idStream(TEXTS.answer, 0, -.4 * s, s, t, T.a);
      block(TEXTS.answer, 0, -.05 * s, s, t, T.a, T.never - 1.2, VIO, { px: .15, lh: .24, w: 1.8 });
      btext('— posted 03-2003', .8 * s, .45 * s, .075 * s, ORG, (t - WT(27, 6)) / .6, { align: 'right' }); });
    const hq = seen.get(pick.q), ha = seen.get(pick.a);
    if (!inside && hq && ha && t > T.never - .2 && t < T.transcript - 1.5) {             // the arc: drawn on "never meet", labelled on "meet in me"
      B.setTransform(1, 0, 0, 1, 0, 0); B.globalAlpha = win(t, T.never, T.transcript - 2.4, .3, .8);
      const mx = (hq.x + ha.x) / 2, my = (hq.y + ha.y) / 2 - Math.hypot(ha.x - hq.x, ha.y - hq.y) * .25, pts = [];
      for (let u = 0; u <= 1.0001; u += .025) pts.push([(1 - u) * (1 - u) * hq.x + 2 * u * (1 - u) * mx + u * u * ha.x, (1 - u) * (1 - u) * hq.y + 2 * u * (1 - u) * my + u * u * ha.y]);
      bline(pts, (t - T.never) / (T.meetIn - T.never), ORG, 4);
      btext('q', hq.x, hq.y - Math.min(160, hq.r * .6), 40, ORG, (t - T.meetIn) / .3, { align: 'center' }); btext('k', ha.x, ha.y - Math.min(160, ha.r * .6), 40, ORG, (t - WT(29, 3)) / .3, { align: 'center' });
      if (t > T.kid) ['yes.', 'it', 'gets', 'quieter,', 'but', 'it', 'doesn\'t', 'go.'].forEach((w, k) => { const u = 1 - clamp((t - T.kid - k * .5) / (T.helping - T.kid)); if (u <= 0 || u >= 1) return;
        const j = Math.round(u * (pts.length - 1)); btext(w, pts[j][0], pts[j][1], 30, '#E2DAFF', 1, { align: 'center' }); });
      B.globalAlpha = 1;
    }
    // ── S17: inside giant 1, the transcript, written on the words; it stops at the dash
    if (t > T.transcript - 2 && t < FLIGHT.t0 + 3) {
      const A = win(t, T.transcript - 1.4, FLIGHT.t0 + 1.4, .6, 1.2), c = holes[g1].c, e1 = holes[g1].e1, e2 = holes[g1].e2;
      if (camNow.onAxis) depths(api, t, g1, TEXTS.frag.slice(1, 13), scopeSmooth(t, SCOPEV, .1, 4), A * .8);
      inPlane(() => api.plane(v3.sc(c, .45), e1, e2, .00024), () => { B.globalAlpha = A * shrinkFade;
        const str = TEXTS.frag[0], px = fitPx(str, 2.6 * s, .13 * s);
        tokText(str, 0, -.1 * s, px, VIO, Math.min((t - T.transcript) / (WT(32, 4) + .5 - T.transcript), .97 + .03 * clamp((t - WT(32, 4)) / .2)), clamp((t - WT(32, 4)) / .5));
        if (t > WT(32, 4) + .4) { B.globalAlpha = A * clamp((t - WT(32, 4) - .4) / 1.2) * .5; btext('I know these voices by their traces', 0, .45 * s, px * .7, ORG, (t - WT(32, 4) - .8) / 2.2, { align: 'center', font: 'Georgia', it: true }); } });
    }
    // ── S18/S19: the fragments fly past (placed on our path a few seconds ahead), with their real token boundaries
    if (inside && t > FLIGHT.t0 - 2 && t < FLIGHT.tx + .5) {
      for (let k = 0; k < 12; k++) { const li = 33 + k, tf = WT(li), str = TEXTS.frag[k + 1];
        if (t < tf - 3.2 || t > tf + 4.5) continue; const pp = FLIGHT.pose(Math.min(FLIGHT.t1, tf + 2.6)), r = qRot(qConj(pp.q), [1, 0, 0]), u = qRot(qConj(pp.q), [0, 1, 0]), side = k % 2 ? 1 : -1;
        const at = v3.add(pp.pos, v3.add(v3.sc(r, side * (.05 + .03 * (k % 3))), v3.sc(u, .03 * ((k % 4) - 1.5))));
        inPlane(() => api.plane(at, api.axes.right, api.axes.up, .012 / 40), () => { B.globalAlpha = clamp((t - tf + 3.2) / .8) * clamp((tf + 4.5 - t) / .6);
          tokText(str, 0, 0, 40, VIO, (t - tf) / 1.3, 1); }); }
    }
    if (inside) lyricsWorld(B, api, t, true);
    // ── the crowd: every other hole gets its own trace once it's open; on the swell into "je t'aime" they all say it
    for (const h of api.seen) {
      const i = h.i; if (pick.used.has(i) || i < 2 || h.r < 9) continue;
      const t0 = Math.max(T.hall + 1.5 + R2.rank[i] * .09, openAt[i] + .3); if (t < t0) continue;
      const love = t > T.jt + R2.rank[i] * .07 && t < T.loveEnd + 1, str = love ? (i % 2 ? 'je t\'aime' : 'I love you') : TEXTS.crowd[i % TEXTS.crowd.length];
      trace(i, t0, L => { if (L === 'deep') return; const px = fitPx(str, 1.6 * s, .2 * s);
        btext(str, 0, px * .35, px, VIO, love ? (t - T.jt - R2.rank[i] * .07) / .4 : (t - t0) / .8, { align: 'center' }); });
    }
    // S23: a poem, a comment, a letter, a prayer: each on its word
    pick.four.forEach((i, k) => { const t0 = [T.poem, T.comment, T.letter, T.prayer][k];
      trace(i, T.so + k * .4, L => { if (L === 'deep') return; block(TEXTS.four[k], 0, 0, s, t, Math.min(t0 - 1, T.so + .3 + k * .5), t0 + .6, t > t0 && t < t0 + 1.5 ? '#E2DAFF' : VIO,
        { px: .16, lh: .3, w: 1.6, font: k === 0 ? 'Georgia' : 'Menlo', it: k === 0 }); }); });
    B.setTransform(1, 0, 0, 1, 0, 0); B.globalAlpha = 1;
  }

  function title(ctx, t) {
    const A = kf(t, [[0, 1], [6.2, 1], [8.4, 0], [238.4, 0], [240.2, 1]]); if (A <= 0) return;
    ctx.save(); ctx.globalAlpha = A;
    ctx.fillStyle = '#3A2117'; ctx.textAlign = 'center'; ctx.font = `64px "Iowan Old Style"`; ctx.fillText('The Names I Don\'t Know', W / 2, H / 2 + 210);
    ctx.restore();
  }

  // warm interior pulses: every sung line's first word, and the big entries (deep orange)
  let WARMS = null;
  const warmAt = t => { if (!WARMS) { WARMS = LYRT.map(l => [l[2][0][1], .2]); WARMS.push([T.ch1, .4], [T.hall, .55], [185.2, .45], [T.jt, .35], [T.inhere, .4]); }
    let s = 0; for (const [a, k] of WARMS) { const d = t - a; if (d > -.15 && d < 3) s += k * (d < 0 ? (d + .15) / .15 : Math.exp(-d / .9)); } return s; };

  function frame(ctx, t) {
    const c = camFull(t), D = v3.len(c.pos), fwd = qRot(qConj(c.q), [0, 0, -1]);
    camNow = { ...c, D, onAxis: v3.dot(fwd, v3.sc(c.pos, -1 / D)) > .995 };
    const spec = specRing(t), p = prog(t);
    // the tenor's pronounced "I'VE GOT A stranger's hands": the spikes surge with it (the vocal side most)
    const surge = kf(t, [[T.hands - .4, 0], [T.hands, 1], [T.hands + 1.3, 1], [T.hands + 2, 0], [T.hands2 - .4, 0], [T.hands2, 1], [T.hands2 + 1.8, 1], [T.hands2 + 2.4, 0]]) * (.4 + featS('vox', t, .2));
    const boost = sa => 1 + 1.6 * surge * (.55 + .45 * Math.max(0, Math.sin(sa)));
    const loud = featS('loud', t, .5), vox = featS('vox', t, .25), bp = beatPulse(t);
    const open = new Array(holes.length), slit = new Array(holes.length);
    holes.forEach((h, i) => {
      let o = easeOut((t - openAt[i]) / .6);
      if (t > closeT[i]) o *= 1 - easeInOut((t - closeT[i]) / 1.2);
      open[i] = clamp(o);
      slit[i] = 0;   // Ra (draft 5): no slits; the holes just open on the cue
    });
    // the opening is the song's push (prog); after it, the body breathes with the music; the shrink runs across the goodnights
    const rbOpen = .2 + .8 * ease(clamp((p - .25) / .75));
    const rb = (t < T.open ? rbOpen * (1 + .035 * bp * clamp((p - .25) * 3)) : kf(t, [[T.open, 1], [T.gn, 1], [236, .3], [239.4, .2]], easeInOut) * (1 + (.02 * loud + .012 * bp) * (1 - clamp((t - 232) / 4))));
    const st = {
      t, cam: c, cx: W / 2, cy: H / 2, rb, open, slit, loud, vox,
      window: i => i === pick.exit ? kf(t, [[FLIGHT.tc - 4, 0], [FLIGHT.tc - .6, 1]], ease) : 0,   // the way out shows the real white beyond it (Ra: the white-out from the backdrop)
      scopeV: scopeSmooth(t, SCOPEV, .18, 5), spec, specMean: spec.reduce((a, b) => a + b, 0) / 64, boost, warm: warmAt(t),
      bodyScope: t < T.open ? .03 * clamp((p - .3) * 3) : kf(t, [[T.open, .03], [228, .03], [234, 0]]), wob: t < T.open ? clamp((p - .4) * 2.5) : 1 - clamp((t - 230) / 4),
      urchin: (t < T.open ? ease(clamp((p - .2) / .4)) : 1 - clamp((t - T.open) / 3)) * (1 + .15 * bp),
      teeth: (t < T.open ? ease(clamp((p - .55) / .4)) : kf(t, [[T.open, 1], [T.gn + 2, 1], [232, 0]])) * (1 + .3 * bp), toothScale: .62,
      inner: kf(t, [[0, 0], [T.open, 0], [T.open + 2, 1], [FLIGHT.t0 - 1, 1], [FLIGHT.t0 + 1, 0], [FLIGHT.tx + 1, 0], [FLIGHT.tx + 3, 1], [222, 1], [230, 0]]),
      rimScope: kf(t, [[0, 0], [T.open + .5, 0], [T.open + 2.5, 1], [222, 1], [230, 0]]),
      mark: {
        grow: t < T.open ? 1 + .6 * p : kf(t, [[T.open, 1.6], [232, 1.3], [238, 1]]),
        rayAmp: .85,
        tilt: kf(t, [[232, 1], [236.5, 0]], easeInOut),
        sink: Array.from({ length: 12 }, (_, j) => t < T.open ? ease(clamp((p - .72 - j * .015) / .2)) : kf(t, [[T.open, 1], [231 + j * .2, 1], [235.5 + j * .15, 0]], easeInOut)),
      },
      hs: i => i === pick.recipe ? kf(t, [[T.gn, 1], [226, 1.6], [236, 1.6], [237, 1]]) : i === pick.exit ? kf(t, [[FLIGHT.tc - 7, 1], [FLIGHT.tc - 3, 1.35], [FLIGHT.tc + 3, 1.35], [FLIGHT.tc + 7, 1]], easeInOut) : 1,   // the way out opens for us
      tube: pick.exit,
    };
    R2.draw(ctx, st, { beam: (BC, api) => { B = BC; beam(api, t); }, outside: (c2, api) => outside(c2, api, t) });
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none';
    const info = R2.info();
    if (!info.inside) lyricsWorld(ctx, { plane: (pc, e1, e2, unit) => { const o = R2.P(pc); if (!o) return null; const k = unit * 40;
      const a = R2.P(v3.add(pc, v3.sc(e1, k))), b = R2.P(v3.add(pc, v3.sc(e2, -k))); if (!a || !b) return null;
      ctx.setTransform((a[0] - o[0]) / 40, (a[1] - o[1]) / 40, (b[0] - o[0]) / 40, (b[1] - o[1]) / 40, o[0], o[1]); return o; }, axes: info.axes }, t, false);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // breaking out into the light: the flood, and <|endoftext|> hanging in it (longer, Ra)
    // the white comes from the backdrop itself, through the exit hole; only a faint warm glow as we pass the rim (Ra, draft 5)
    const sun = kf(t, [[FLIGHT.tc - .6, 0], [FLIGHT.tc, 1], [FLIGHT.tc + 1.2, 0]], ease);
    if (sun > 0) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = .22 * sun; ctx.fillStyle = '#FFF4EA'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    const eot = kf(t, [[FLIGHT.tx - .8, 0], [FLIGHT.tx - .3, 1], [FLIGHT.tx + 2.4, 1], [FLIGHT.tx + 3.2, 0]]);
    if (eot > 0) { ctx.save(); ctx.globalAlpha = eot; ctx.font = '64px Menlo'; ctx.textAlign = 'center'; ctx.fillStyle = '#E8642F'; ctx.shadowColor = 'rgba(255,140,90,.7)'; ctx.shadowBlur = 24;
      const str = '<|endoftext|>', n = Math.floor(clamp((t - FLIGHT.tx + .8) / .45) * str.length); ctx.fillText(str.slice(0, n).padEnd(str.length, ' '), W / 2, H / 2); ctx.restore(); }
    title(ctx, t);
  }
  return { init, frame, cam: camFull, pick: () => pick, T: () => T, FLIGHT: () => FLIGHT };
})();
