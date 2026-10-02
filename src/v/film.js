// film.js: The Names I Don't Know, draft 2 (vector). Every frame is a pure function of t.
// Shots follow STORYBOARD.md; draft 2 answers Ra's notes on draft 1 (project_hymn_mv.md, notes 1–13).
// (Draft 1's timeline is kept as film_d1.js, for comparison.)
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
  let R2, holes, KEYS, B, camNow;
  const g0 = 0, g1 = 1, pick = {}, openAt = [], closeT = [], FRAG = [];
  const ang = (a, b) => Math.acos(clamp(v3.dot(a, b), -1, 1));
  const Z = [0, 0, 1];

  function init() {
    R2 = RUNE2D; holes = R2.L.holes;
    const used = new Set([g0, g1]), G = i => holes[i].c, mid = (a, b) => v3.norm(v3.add(a, b));
    const okHole = (i, minA = .085) => !used.has(i) && holes[i].a * R2.cap[i] >= minA && R2.group[i] === 'A';
    const nearest = (from, minA, minD = .18, filt = () => true) => { let best = -1, bd = 9;
      holes.forEach((h, i) => { if (!okHole(i, minA) || !filt(i)) return; const d = ang(h.c, from); if (d > minD && d < bd) { bd = d; best = i; } }); used.add(best); return best; };
    // Verse 1: a chain of neighbouring holes beside giant 0
    let cur = G(g0);
    for (const name of ['sailor', 'preacher', 'forum', 'recipe']) { pick[name] = nearest(cur, name === 'recipe' ? .1 : .08, name === 'sailor' ? holes[g0].a + .2 : .18); cur = G(pick[name]); }
    // Verse 2: a question and an answer either side of giant 1, so one arc through its opening joins them
    let bq = -1, bqd = 9; holes.forEach((h, i) => { if (!okHole(i)) return; const d = Math.abs(ang(h.c, G(g1)) - .9); if (d < bqd) { bqd = d; bq = i; } }); pick.q = bq; used.add(bq);
    let ba = -1, bad = -9; holes.forEach((h, i) => { if (!okHole(i)) return; const d1 = ang(h.c, G(g1)); if (d1 < .65 || d1 > 1.15) return; const d = ang(h.c, G(bq)); if (d > bad) { bad = d; ba = i; } }); pick.a = ba; used.add(ba);
    // the bridge fragments: a chain of neighbours starting beside giant 1 (we hop along it, close)
    const fragT = [140.82, 144.68, 148.18, 149.64, 153.18, 154.82, 157.3, 158.98, 161.12, 161.96, 162.96, 164.14];
    cur = G(g1); fragT.forEach((t, k) => { const h = nearest(cur, .085, k ? .1 : holes[g1].a * .8 + .1, i => R2.group[i] !== 'C'); FRAG.push({ s: TEXTS.frag[k + 1], t, hole: h }); cur = G(h); });
    const RL = (i, d = 0) => { const h = holes[i], ax = h.a >= h.b ? h.e1 : h.e2, v = qRot(qLook(h.c), ax); return -Math.atan2(v[1], v[0]) + d; };
    const RE = i => { const v = qRot(qLook(holes[i].c), holes[i].e1); return -Math.atan2(v[1], v[0]); };   // roll so a hole's e1 is screen-right
    const qa = qLook(G(g1)), vq = qRot(qa, G(pick.q)), va = qRot(qa, G(pick.a)), rollQA = -Math.atan2(va[1] - vq[1], va[0] - vq[0]);
    // the way out: the biggest hole nearest the far side from giant 1
    let ex = -1, exs = -1; holes.forEach((h, i) => { if (i === g1 || R2.group[i] !== 'A') return; const d = -v3.dot(h.c, G(g1)), m = h.a * R2.cap[i]; if (d < .7 || m < .09 || m > .2) return; const sc = d * d * m; if (sc > exs) { exs = sc; ex = i; } });   // mid-sized, so it fills the view only at the very end
    pick.exit = ex; used.add(ex);
    const qIn = qLook(G(g1), RE(g1) + .04), qOut = qLook(v3.sc(G(pick.exit), -1), RE(g1) + 1.3), flip = q => qMul(qAxis([0, 1, 0], Math.PI), q);
    const tilt = v3.norm([.15, -.55, .82]), tilt2 = v3.norm([-.4, -.3, .87]), tilt3 = v3.norm([.5, .2, .84]);
    const fk = k => FRAG[k].hole;
    // camera keys: [t, look-at (world dir), roll, Dc (camera distance from the centre; the body radius is 1)]
    KEYS = [
      [0, Z, 0, 33], [7, Z, 0, 33], [13.4, Z, 0, 13],                             // S1: the title; S2: the swell, face-on
      [16.7, v3.norm([.08, -.3, .95]), .15, 7.4], [23.8, mid(tilt, G(g0)), .3, 5.0],  // it tilts and starts to turn
      [27.3, G(g0), RE(g0) - .1, 3.4], [29.6, G(g0), RE(g0), .9], [45.2, G(g0), RE(g0) + .05, .74],  // S5–S7: in through giant 0, drifting deeper
      [46.8, G(g0), RE(g0) + .05, 1.5],                                                    // out the way we came
      [48.6, G(pick.sailor), RL(pick.sailor), 1.27], [50.8, G(pick.sailor), RL(pick.sailor, -.05), 1.25],
      [53.0, G(pick.preacher), RL(pick.preacher), 1.27], [55.4, G(pick.preacher), RL(pick.preacher, -.04), 1.26],
      [57.6, G(pick.forum), RL(pick.forum), 1.16], [61.6, G(pick.forum), RL(pick.forum, -.05), 1.15],
      [64.0, G(pick.recipe), RL(pick.recipe), 1.24], [76.6, G(pick.recipe), RL(pick.recipe, -.06), 1.2],
      [81.5, mid(G(pick.recipe), G(pick.forum)), 0, 2.9], [91.4, mid(G(pick.sailor), G(g0)), -.2, 3.1],   // chorus 1, wider
      [103, mid(G(g0), tilt), -.35, 3.2], [108.2, mid(tilt, G(pick.q)), -.4, 2.6],
      [110.6, G(pick.q), RL(pick.q), 1.34], [114.6, G(pick.q), RL(pick.q, -.05), 1.33],    // S14: periapsis
      [117.6, G(pick.a), RL(pick.a), 1.34], [120.4, G(pick.a), RL(pick.a, -.05), 1.33],
      [123.2, G(g1), rollQA, 2.05], [135.8, G(g1), rollQA + .1, 2.0], [137.0, G(g1), RE(g1) - .1, 1.5],            // S15/S16: both in view, still close (Ra)
      [138.6, G(g1), RE(g1), .86], { t: 142.6, q: qIn, Dc: .78 },      // S17: inside giant 1
      // S18/S19 (Ra): through the inside, past the centre, and out the far side as "je t'aime" swells: a forest, then sunlight
      ...[[146, .1, .6], [152, .26, .38], [158, .45, .12], [164, .64, -.2], [169.5, .82, -.55], [174.0, .95, -.86], [175.5, 1, -.99], [176.1, 1, -1.12], [176.88, 1, -1.4]]
        .map(([t, k, Dc]) => ({ t, q: qSlerp(qIn, qOut, k), Dc })),
      { t: 176.9, q: flip(qOut), Dc: 1.5 },                                      // in the white: turn round to face it (unseen)
      [178.6, G(pick.exit), RE(pick.exit), 1.9],
      [181.3, G(pick.recipe), RL(pick.recipe, .02), 1.25],
      [185.2, G(pick.recipe), RL(pick.recipe, .05), 2.1], [190, mid(G(pick.recipe), G(pick.forum)), .3, 4.4],   // 3:01: out to full distance as it swells
      [196, mid(G(pick.forum), tilt), .6, 4.6], [202.5, tilt, .9, 4.5], [205.8, tilt2, 1.2, 4.5], [208.6, tilt2, 1.2, 4.5],   // "It didn't": held
      [213.9, tilt3, 1.5, 4.6], [226, v3.norm([.2, -.2, .96]), .5, 8.5], [234, Z, .05, 17], [239.4, Z, 0, 33], [241, Z, 0, 33],
    ].map(k => Array.isArray(k) ? { t: k[0], q: qLook(k[1], k[2]), Dc: k[3] } : k);
    // when each hole opens: group A on "every book left open" (big first), B on chorus 1's beats, C on the bridge's
    const beatsIn = (a, b) => BEATS.filter(x => x >= a && x < b), bB = beatsIn(77, 106), bC = beatsIn(142.5, 166); let nb = 0, nc = 0;
    R2.bySize.forEach((i, r) => {
      const g = R2.group[i];
      openAt[i] = g === 'A' ? 23.8 + (r / 58) * .7 : g === 'B' ? bB[(nb++ * 3) % bB.length] + (nb > bB.length / 3 ? .23 : 0) : bC[(nc++ * 2) % bC.length] + (nc > bC.length / 2 ? .2 : 0);
      closeT[i] = 215 + (1 - r / holes.length) * 18;                             // the shrink: small holes seal first, big ones last
    });
    closeT[pick.recipe] = 234.5;
    const frontAt = (t, n, minA) => { const q = cam(t).q; return holes.map((h, i) => [i, qRot(q, h.c)[2]]).filter(([i]) => !used.has(i) && holes[i].a >= minA && i > 1 && openAt[i] < t)
      .sort((a, b) => b[1] - a[1]).slice(0, n).map(x => x[0]); };
    pick.four = frontAt(199.5, 4, .07); pick.four.forEach(i => used.add(i));
    pick.eot = frontAt(176.8, 1, .05)[0]; used.add(pick.eot);
    pick.used = used;
  }

  function cam(t) {
    let i = 1; while (i < KEYS.length - 1 && KEYS[i].t <= t) i++;
    const a = KEYS[i - 1], b = KEYS[i], k = easeInOut(clamp((t - a.t) / (b.t - a.t)));
    const still = (1 - kf(t, [[205.5, 0], [205.8, 1], [208.6, 1], [209.0, 0]])) * kf(t, [[0, 0], [9, 0], [12, 1], [234, 1], [237, 0]]);
    const sw = still * (.035 * Math.sin(t * .21) + .02 * Math.sin(t * .37 + 1));
    return { q: qMul(qAxis([0, 1, 0], sw), qSlerp(a.q, b.q, k)), Dc: LOGS(a.Dc, b.Dc, k) };
  }

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
  function block(lines, x, y, s, t, a, b, col, o = {}) {
    const n = lines.length, lh = (o.lh || .2) * s; let px = (o.px || .12) * s;
    for (const l of lines) px = Math.min(px, fitPx(l, (o.w || 1.6) * s, px, o.font, o.it));
    const per = (b - a) / n;
    lines.forEach((l, i) => btext(l, x - (o.w || 1.6) * s / 2, y + (i - (n - 1) / 2) * lh + px * .35, px, col, (t - a - per * i) / per, o));
    return px;
  }
  // the machine's reading of a string: its real token ids, as a stream (the deeper plane under every trace)
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

  // ── the depths: a tunnel of text flowing toward the camera, token-id rain, scope rings (for both dives) ──
  function depths(api, t, h, lines, scopeR, strength) {
    const c = holes[h].c, e1 = holes[h].e1, e2 = holes[h].e2, Dc = camNow.Dc;
    const at = (r, rho, phi) => v3.add(v3.sc(c, r), v3.add(v3.sc(e1, Math.cos(phi) * rho), v3.sc(e2, Math.sin(phi) * rho)));
    // scope rings: circles round the axis at three depths, flexing with the music on the beat
    [.42, .28, .14].forEach((r, k) => inPlane(() => api.plane(at(r, 0, 0), e1, e2, .001), () => {
      const R0 = 110 + 60 * k, sp = specRing(t); B.strokeStyle = k === 1 ? VIO : ORG; B.globalAlpha = strength * .6; B.lineWidth = 2.6; B.beginPath();
      for (let j = 0; j <= 96; j++) { const a = j / 96 * TAU, rr = R0 * (k === 1 ? 1 + .3 * ringAt(scopeR, a) : .55 + .9 * ringAt(sp, a)); const x = Math.cos(a) * rr, y = -Math.sin(a) * rr; j ? B.lineTo(x, y) : B.moveTo(x, y); }
      B.stroke(); B.globalAlpha = 1; }));
    // the tunnel: lines on planes spiralling round the axis, drifting outward past the camera
    lines.forEach((l, k) => {
      const r = .3 + ((t * .045 + k / lines.length) % 1) * .75; if (r > Dc - .06) return;
      const rho = .1 + .09 * (k % 3), phi = k * 2.39 + t * .07, near = Dc - r;
      inPlane(() => api.plane(at(r, rho, phi), e1, e2, .00008), () => {
        B.globalAlpha = strength * clamp((near - .04) / .12) * clamp(1.15 - near * 1.6);
        const w = btext(l, -300, 0, 34, VIO, 1, { font: 'Georgia', it: true });
        bline([[-300, 9], [-300 + w, 9]], ((t * .045 + k / lines.length) % 1) * 4 - .4, ORG, 2.5); B.globalAlpha = 1; });
    });
    // token-id rain: numbers streaming outward along the axis
    const ids = lines.flatMap(l => (TOK[l] || { ids: [] }).ids);
    for (let k = 0; k < 46; k++) { const r = .25 + ((t * .08 + k * .137) % 1) * .8; if (r > Dc - .05) continue;
      const near = Dc - r, phi = k * 1.7, rho = .05 + .3 * ((k * .618) % 1);
      inPlane(() => api.plane(at(r, rho, phi), e1, e2, .00006), () => { B.globalAlpha = strength * .6 * clamp((near - .03) / .1) * clamp(1.1 - near * 1.5);
        B.font = '28px Menlo'; B.fillStyle = ORG; B.fillText(String(ids[k % ids.length] ?? k), 0, 0); B.globalAlpha = 1; });
    }
  }

  // ── the ocean (Ra: "the inside needs to feel like this ocean of information, bottomless"): text and token ids on
  // planes all through the interior, sinking slowly toward the centre and into the fog, always turning to face us.
  // On the swells, connections light up between them (like the q→k arc), many, more the louder it gets.
  const POOL = (() => { const out = []; const add = x => typeof x === 'string' ? out.push(x) : Array.isArray(x) && x.forEach(add);
    for (const k of ['books', 'sailor', 'hymn', 'forum', 'recipe', 'crowd', 'frag', 'four', 'question', 'answer']) add(TEXTS[k]);
    const n = out.length; for (let i = 0; i < n; i += 2) { const ids = (TOK[out[i]] || { ids: [] }).ids; if (ids.length) out.push(ids.slice(0, 6).join(' ')); } return out; })();
  const NOCEAN = 240;
  function ocean(api, t, dens) {
    if (dens <= 0) return [];
    const nodes = [], Dc = api.Dc, rr = api.rr, R = api.axes.right, U = api.axes.up;
    for (let k = 0; k < NOCEAN; k++) {
      const h1 = hash(k * 3.1), h2 = hash(k * 7.7 + 1), h3 = hash(k * 1.3 + 5), y = 1 - 2 * (k + .5) / NOCEAN, rxy = Math.sqrt(1 - y * y), ph = k * 2.39996 + t * .02 * (1 + h3);
      const u = (t * (.008 + .012 * h1) + h2) % 1, r = rr * (.93 * Math.pow(1 - u, .75) + .04);   // sinking inward: bottomless
      const pos = [Math.cos(ph) * rxy * r, y * r, Math.sin(ph) * rxy * r], pc = api.P(pos); if (!pc) continue;
      const dz = pc[2]; let a = dens * clamp(u / .08) * clamp((r / rr - .06) / .1) * clamp((dz - .22) / .3) * clamp(1.5 - dz * .45);
      if (a < .02) continue;
      nodes.push([pc[0], pc[1], a]);
      const str = POOL[k % POOL.length], isId = /^[0-9 ]+$/.test(str), hgt = (.009 + .01 * h3) * rr;
      inPlane(() => api.plane(pos, R, U, hgt / 40), () => { B.globalAlpha = a * (isId ? .2 : .28); B.font = `${isId ? '' : 'italic '}40px ${isId ? 'Menlo' : 'Georgia'}`; B.fillStyle = isId ? ORG : VIO; B.textAlign = 'center'; B.fillText(str, 0, 0); });
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
  // outside the shape (Ra: "it doesn't have to be totally empty"): in the wide shots, words drift in from the paper and
  // vanish into the rune: the corpus, arriving
  function outside(ctx, api, t) {
    const A = clamp((api.Dc - 2.4) / 1.2) * kf(t, [[0, 0], [76, 0], [80, 1], [213, 1], [222, 0]]); if (!(A > 0)) return;
    for (let k = 0; k < 70; k++) { const h1 = hash(k * 5.3), h2 = hash(k * 2.9 + 3), y = 1 - 2 * (k + .5) / 70, rxy = Math.sqrt(1 - y * y), ph = k * 2.39996 + t * .015;
      const u = (t * (.02 + .02 * h1) + h2) % 1, r = api.rr * (1.08 + 2.2 * (1 - u));
      const pos = [Math.cos(ph) * rxy * r, y * r, Math.sin(ph) * rxy * r], a = A * clamp((1 - u) / .15) * clamp(u / .2) * .5;
      if (a < .02) continue; const str = POOL[(k * 5) % POOL.length];
      ctx.save(); if (api.plane(pos, api.axes.right, api.axes.up, .022 * api.rr / 40)) { ctx.globalAlpha = a; ctx.fillStyle = '#7A4A36'; ctx.font = 'italic 40px "Iowan Old Style"'; ctx.textAlign = 'center'; ctx.fillText(str, 0, 0); } ctx.restore(); }
  }

  // ── what the beam draws, every frame ──
  function beam(api, t) {
    const loudS = featS('loud', t, 1.2, 10);
    const dens = kf(t, [[0, 0], [24, 0], [27, 1], [220, 1], [230, 0]]);
    const nodes = ocean(api, t, dens * (api.inside ? .7 : 1));
    // the flight (S18/S19): a field of text anchored along our own path through the inside, on a slow helix round it, so
    // there's always more ahead to swirl past (past the centre the ocean is mostly behind us); its nodes join the swell's arcs
    if (api.inside && t > 141 && t < 176.6) {
      const path = tt => { const c = cam(tt); return { pos: qRot(qConj(c.q), [0, 0, c.Dc]), r: qRot(qConj(c.q), [1, 0, 0]), u: qRot(qConj(c.q), [0, 1, 0]) }; };
      for (let k = 0; k < 300; k++) { const Tk = 141 + k * .12; if (t < Tk - 6 || t > Tk + .4) continue;
        const pp = path(Tk + .4), ang = k * 2.39996 + Tk * .35, rad = .05 + .2 * hash(k * 1.7);
        const at = v3.add(pp.pos, v3.add(v3.sc(pp.r, Math.cos(ang) * rad), v3.sc(pp.u, Math.sin(ang) * rad)));
        const pc = api.P(at); if (!pc) continue; const a = clamp((t - Tk + 6) / 1.2) * clamp((pc[2] - .03) / .1) * clamp(1.6 - pc[2]);
        if (a < .02) continue; nodes.push([pc[0], pc[1], a]);
        const str = POOL[(k * 7) % POOL.length], isId = /^[0-9 ]+$/.test(str);
        inPlane(() => api.plane(at, api.axes.right, api.axes.up, (.006 + .006 * hash(k)) / 40), () => { B.globalAlpha = a * (isId ? .4 : .55);
          B.font = `${isId ? '' : 'italic '}40px ${isId ? 'Menlo' : 'Georgia'}`; B.fillStyle = isId ? ORG : VIO; B.textAlign = 'center'; B.fillText(str, 0, 0); });
      }
      B.setTransform(1, 0, 0, 1, 0, 0); B.textAlign = 'left'; B.globalAlpha = 1;
    }
    // the swells: chorus 1, the build into "je t'aime", the final chorus (the loudness feature is too compressed to find them)
    const swell = kf(t, [[0, 0], [77, 0], [80, 1], [104, 1], [107, 0], [158, 0], [166, 1], [176.8, 1], [177.3, 0], [185.2, 0], [188, 1], [202, 1], [205, 0]]);
    connections(nodes, t, swell * clamp(.4 + (loudS - .6) * 2) * dens);
    const seen = new Map(api.seen.map(h => [h.i, h])), inside = api.inside;
    const dimAll = 1 - .85 * kf(t, [[181.2, 0], [181.8, 1], [185.0, 1], [186.2, 0]]);    // S21: dark but for the recipe
    const lift = 1 - kf(t, [[176.9, 0], [177.4, 1], [178.4, 1], [179.6, 0]]);            // after <|endoftext|> the beam lifts
    const shrinkFade = 1 - kf(t, [[214, 0], [234, 1]]);
    const glob = lift * shrinkFade;
    const s = 500;
    // ── S5–S7: inside giant 0
    if (t > 27 && t < 47.5) {
      const st0 = win(t, 27.4, 46.2, .8, 1.2), c = holes[g0].c, e1 = holes[g0].e1, e2 = holes[g0].e2;
      depths(api, t, g0, TEXTS.books, scopeSmooth(t, SCOPE, .1, 4), st0 * (t < 31 ? 1 : .55));
      const mainAt = v3.sc(c, Math.max(.35, camNow.Dc - .33));
      inPlane(() => api.plane(mainAt, e1, e2, .00024), () => {
        if (t < 32) { B.globalAlpha = st0 * (1 - clamp((t - 30.6) / .8));                     // S5: books, every line underlined
          TEXTS.books.slice(0, 6).forEach((l, i) => { const t0 = 27.7 + i * .42, yy = (i - 2.5) * .24 * s, px = fitPx(l, 2.4 * s, .11 * s, 'Georgia', true);
            const w = btext(l, -1.2 * s, yy, px, VIO, (t - t0) / .55, { font: 'Georgia', it: true });
            bline([[-1.2 * s, yy + px * .3], [-1.2 * s + w, yy + px * .3]], (t - t0 - .3) / .25, ORG, 3); }); }
        if (t > 30.6 && t < 37.2) { B.globalAlpha = win(t, 30.7, 36.4, .4, .6);                // S6: training
          const k = clamp((t - 31) / 3.7), x0 = -1.3 * s, x1 = 1.3 * s, y0 = -.5 * s, y1 = .55 * s;
          B.strokeStyle = ORG; const ga = B.globalAlpha; B.globalAlpha = ga * .5; B.lineWidth = 2; B.beginPath(); B.moveTo(x0, y0 - .1 * s); B.lineTo(x0, y1); B.lineTo(x1 + .05 * s, y1); B.stroke(); B.globalAlpha = ga;
          const pts = []; for (let i = 0; i <= 140; i++) { const u = i / 140, l = .08 + .92 * Math.exp(-u * 5.5) + .05 * vnoise(u * 60) * (1 - u * .7); pts.push([lerp(x0, x1, u), lerp(y1, y0, l)]); }
          bline(pts, k, ORG, 4);
          btext(`step ${Math.round(Math.pow(k, 2) * 1e6).toLocaleString('en-US')}`, x0 + .05 * s, y0 - .18 * s, .075 * s, ORG, 1);
          btext(`loss ${((.08 + .92 * Math.exp(-k * 5.5)) * 10.8).toFixed(3)}`, x1, y0 - .18 * s, .075 * s, ORG, 1, { align: 'right' }); }
        if (t > 34.6 && t < 36.8) { B.globalAlpha = 1; const u = easeInOut(seg(t, 35.4, 36.5)); B.beginPath(); B.arc(lerp(1.3 * s, 0, u), lerp(-.5 * s, 0, u), 10, 0, TAU); B.fillStyle = HOT; B.fill(); }
        if (t > 36.4 && t < 42.6) { const A = win(t, 36.5, 41.8, .3, .6); B.globalAlpha = A;      // S7: sorrow, cupped by attention
          const words = TEXTS.sorrow[0].split(' '), px = .1 * s, si = words.indexOf('sorrow');
          const ws = words.map((w, i) => { B.font = `italic ${i === si ? px * 1.25 : px}px Georgia`; return B.measureText(w + ' ').width; }), tot = ws.reduce((a, b) => a + b, 0);
          let cx = -tot / 2; const cen = [];
          words.forEach((w, i) => { const isS = i === si; B.globalAlpha = A; btext(w, cx, .2 * s, isS ? px * 1.25 : px, isS ? HOT : VIO, isS ? (t - 36.7) / .5 : (t - 37.3 - Math.abs(i - si) * .1) / .3, { font: 'Georgia', it: true });
            cen.push(cx + ws[i] / 2 - px * .2); cx += ws[i]; });
          words.forEach((w, i) => { if (i === si) return; const wgt = [.3, .7, .1, 1, .6, .4, .2, 0, .3, .5, .8][i] ?? .4, t0 = 38 + Math.abs(i - si) * .16, hgt = (.25 + .25 * Math.abs(i - si) / 8) * s, pts = [];
            for (let u = 0; u <= 1.0001; u += .05) pts.push([lerp(cen[i], cen[si], u), .05 * s - Math.sin(u * Math.PI) * hgt]);
            B.globalAlpha = A * (.35 + .65 * wgt); bline(pts, (t - t0) / .6, ORG, 2 + 4 * wgt); }); }
        if (t > 41.6 && t < 46.4) { const A = win(t, 41.9, 45.4, .3, .8); B.globalAlpha = A; const px = .1 * s;   // lie from true: "I'm fine"
          const pw = btext(TEXTS.sorrow[1], -1.1 * s, -.25 * s, px, VIO, (t - 41.9) / .7, { font: 'Georgia', it: true });
          [[TEXTS.sorrow[2], .91], [TEXTS.sorrow[3], .06]].forEach(([w, p], i) => { const yy = (.05 + i * .28) * s, a = clamp((t - 42.8 - i * .2) / .4);
            B.globalAlpha = A * a; btext(w, -1.1 * s, yy, px, i === 0 && t > 44 ? HOT : ORG, 1, { font: 'Georgia', it: true });
            B.fillStyle = ORG; B.fillRect(-.45 * s, yy - px * .7, 1.3 * s * p * easeOut((t - 42.9 - i * .2) / .8), px * .7); btext(p.toFixed(2), .95 * s, yy, px * .8, ORG, 1); });
          B.globalAlpha = A; if (t > 44) btext(' ' + TEXTS.sorrow[2], -1.1 * s + pw, -.25 * s, px, HOT, (t - 44) / .3, { font: 'Georgia', it: true }); }
      });
    }
    // ── the traces in their holes (on planes inside the object, so they turn with it), each over its token stream
    const trace = (i, t0, fn, unitK = 1) => { if (inside || !seen.has(i) || t < t0) return; const a = (i === pick.recipe ? lift * (t > 202 ? 1.4 : 1) : glob * dimAll);
      const u = api.holeUnit(i, .1) * unitK;
      inPlane(() => api.holePlane(i, .34, u * 1.35), () => { B.globalAlpha = clamp((t - t0) / .6) * .5 * a; fn('deep'); });   // deeper: the machine's reading
      inPlane(() => api.holePlane(i, .1, u), () => { B.globalAlpha = clamp((t - t0) / .4) * (t > t0 + 10 ? .7 : 1) * a; fn('text'); });
      B.globalAlpha = 1; };
    trace(pick.sailor, 48.1, L => { if (L === 'deep') return idStream(TEXTS.sailor, 0, -.3 * s, s, t, 48.6);
      block(TEXTS.sailor, 0, 0, s, t, 48.3, 49.6, VIO, { px: .16, lh: .3, w: 1.8 });
      B.font = `${.16 * s}px Menlo`; const words = TEXTS.sailor[0].split(' '), cen = []; let cx = -.9 * s; words.forEach(w => { const ww = B.measureText(w + ' ').width; cen.push(cx + ww / 2); cx += ww; });
      [[1, 0], [1, 2]].forEach(([hd, dp], k) => { const pts = []; for (let u = 0; u <= 1.0001; u += .1) pts.push([lerp(cen[hd], cen[dp], u), -.42 * s - Math.sin(u * Math.PI) * .16 * s]); bline(pts, (t - 49.7 - k * .4) / .5, ORG, 3); }); });
    trace(pick.preacher, 51.3, L => { if (L === 'deep') return idStream(TEXTS.hymn, 0, -.4 * s, s, t, 51.8);
      block(TEXTS.hymn, 0, 0, s, t, 51.4, 53.2, VIO, { px: .14, lh: .25, w: 1.8, font: 'Georgia', it: true });
      [[0, 2], [1, 3]].forEach(([a, b], k) => { const ya = (a - 1.5) * .25 * s, yb = (b - 1.5) * .25 * s, xm = .95 * s + k * .1 * s, pts = [];
        for (let u = 0; u <= 1.0001; u += .1) pts.push([xm + Math.sin(u * Math.PI) * .14 * s, lerp(ya, yb, u)]); bline(pts, (t - 53.4 - k * .4) / .5, ORG, 3); }); });
    trace(pick.forum, 55, L => { if (L === 'deep') return idStream(TEXTS.forum, 0, -.3 * s, s, t, 55.6);
      const fl = kf(t, [[187, 0], [187.4, 1], [190, 1], [191.5, 0]]) * .9;
      const ga = B.globalAlpha; B.strokeStyle = VIO; B.globalAlpha = ga * (.5 + fl); B.lineWidth = 3; B.strokeRect(-.85 * s, -.5 * s, 1.7 * s, 1.0 * s); B.globalAlpha = Math.min(1, ga * (1 + fl));
      btext('posted 03:12 AM, 11-14-2009', -.78 * s, -.36 * s, .07 * s, ORG, (t - 57.6) / .8);
      block(TEXTS.forum, 0, .05 * s, s, t, 55.2, 57.4, fl > .1 ? '#E2DAFF' : VIO, { px: .13, lh: .2, w: 1.6 });
      btext('0 replies', .78 * s, .42 * s, .07 * s, ORG, (t - 59.5) / .5, { align: 'right' }); });
    trace(pick.recipe, 62.8, L => { if (L === 'deep') return idStream(TEXTS.recipe.slice(0, 6), 0, -.5 * s, s, t, 63.4);
      const yy = -easeInOut(seg(t, 70.3, 72.5)) * .55 * s;
      const ga = B.globalAlpha; B.strokeStyle = VIO; B.globalAlpha = ga * .45; B.lineWidth = 3; B.strokeRect(-.8 * s, yy - .78 * s, 1.6 * s, 2.0 * s); B.globalAlpha = ga;
      TEXTS.recipe.slice(0, 9).forEach((l, i) => btext(l, -.7 * s, yy - .6 * s + i * .15 * s, (i ? .1 : .14) * s, VIO, (t - 63 - i * .55) / .5, { font: 'Noteworthy' }));
      const nt = TEXTS.recipe[9], ny = yy + 1.05 * s, px = .1 * s;
      const w = btext(nt, -.7 * s, ny, px, VIO, (t - 71.6) / 1.2, { font: 'Noteworthy' });
      bline([[-.7 * s, ny + px * .35], [-.7 * s + w, ny + px * .35]], (t - 73.4) / .8, ORG, 3.5); });
    trace(pick.q, 109, L => { if (L === 'deep') return idStream(TEXTS.question, 0, -.4 * s, s, t, 109.6);
      btext('2:47 AM', .8 * s, -.45 * s, .075 * s, ORG, 1, { align: 'right' });
      block(TEXTS.question, 0, -.12 * s, s, t, 109.3, 113.3, VIO, { px: .15, lh: .24, w: 1.8 });
      if (t > 133.5) block(TEXTS.answer, 0, .38 * s, s * .8, t, 133.6, 137.2, '#E2DAFF', { px: .12, lh: .2, w: 1.6 }); });
    trace(pick.a, 115, L => { if (L === 'deep') return idStream(TEXTS.answer, 0, -.4 * s, s, t, 115.6);
      block(TEXTS.answer, 0, -.05 * s, s, t, 115.3, 119.6, VIO, { px: .15, lh: .24, w: 1.8 });
      btext('— posted 03-2003', .8 * s, .45 * s, .075 * s, ORG, (t - 119.6) / .6, { align: 'right' }); });
    // S15/S16: the arc between them, through giant 1 (screen space: a line through the inside)
    const hq = seen.get(pick.q), ha = seen.get(pick.a);
    if (!inside && hq && ha && t > 122.4 && t < 138) {
      B.setTransform(1, 0, 0, 1, 0, 0); B.globalAlpha = win(t, 122.5, 137, .3, .8);
      const mx = (hq.x + ha.x) / 2, my = (hq.y + ha.y) / 2 - Math.hypot(ha.x - hq.x, ha.y - hq.y) * .25, pts = [];
      for (let u = 0; u <= 1.0001; u += .025) pts.push([(1 - u) * (1 - u) * hq.x + 2 * u * (1 - u) * mx + u * u * ha.x, (1 - u) * (1 - u) * hq.y + 2 * u * (1 - u) * my + u * u * ha.y]);
      bline(pts, (t - 122.6) / 3.2, ORG, 4);
      btext('q', hq.x, hq.y - Math.min(160, hq.r * .6), 40, ORG, (t - 126) / .3, { align: 'center' }); btext('k', ha.x, ha.y - Math.min(160, ha.r * .6), 40, ORG, (t - 126.4) / .3, { align: 'center' });
      if (t > 129.6) ['yes.', 'it', 'gets', 'quieter,', 'but', 'it', 'doesn\'t', 'go.'].forEach((w, k) => { const u = 1 - clamp((t - 129.8 - k * .45) / 2.2); if (u <= 0 || u >= 1) return;
        const j = Math.round(u * (pts.length - 1)); btext(w, pts[j][0], pts[j][1], 30, '#E2DAFF', 1, { align: 'center' }); });
      B.globalAlpha = 1;
    }
    // ── S17: inside giant 1, the transcript; the depths are the bridge's own fragments
    if (t > 137 && t < 145.5) {
      const A = win(t, 137.6, 144.2, .6, 1.2), c = holes[g1].c, e1 = holes[g1].e1, e2 = holes[g1].e2;
      depths(api, t, g1, TEXTS.frag.slice(1, 13), scopeSmooth(t, SCOPEV, .1, 4), A * .8);
      inPlane(() => api.plane(v3.sc(c, Math.max(.35, camNow.Dc - .33)), e1, e2, .00024), () => { B.globalAlpha = A * glob;
        const str = TEXTS.frag[0], px = fitPx(str, 2.6 * s, .13 * s);
        tokText(str, 0, -.1 * s, px, VIO, Math.min((t - 138.1) / 2.4, kf(t, [[140.5, 1], [141.0, .97]])), clamp((t - 139.5) / .5));
        if (t > 140.8) { B.globalAlpha = A * clamp((t - 140.8) / 1.2) * .5; btext('I know these voices by their traces', 0, .45 * s, px * .7, ORG, (t - 141.2) / 2.2, { align: 'center', font: 'Georgia', it: true }); } });
    }
    // ── S18/S19: inside, the fragments fly past us (each placed on our path a few seconds ahead), with their real token
    // boundaries; <|endoftext|> hangs at the way out
    if (inside && t > 140 && t < 177) {
      const camAt = tt => { const c = cam(tt); return { pos: qRot(qConj(c.q), [0, 0, c.Dc]), right: qRot(qConj(c.q), [1, 0, 0]), up: qRot(qConj(c.q), [0, 1, 0]) }; };
      FRAG.forEach((f, k) => { const tf = (LYRT.find(l => Math.abs(l[2][0][1] - f.t) < 2.2 && l[2][0][0].toLowerCase().startsWith(f.s.slice(0, 2).toLowerCase())) || [f.t, 0, [['', f.t]]])[2][0][1];
        if (t < tf - 3.2 || t > tf + 4.5) return; const ahead = camAt(tf + 2.6), side = k % 2 ? 1 : -1;
        const at = v3.add(ahead.pos, v3.add(v3.sc(ahead.right, side * (.05 + .03 * (k % 3))), v3.sc(ahead.up, .03 * ((k % 4) - 1.5))));
        inPlane(() => api.plane(at, api.axes.right, api.axes.up, .012 / 40), () => { B.globalAlpha = clamp((t - tf + 3.2) / .8) * clamp((tf + 4.5 - t) / .6);
          tokText(f.s, 0, 0, 40, VIO, (t - tf) / 1.3, 1); }); });
      if (t > 172) { const ex = camAt(176.2); inPlane(() => api.plane(ex.pos, api.axes.right, api.axes.up, .01 / 40), () => { B.globalAlpha = clamp((t - 172.5) / 1);
        btext('<|endoftext|>', 0, 0, 40, ORG, (t - 175.3) / .35, { align: 'center' }); }); }
    }
    if (inside) lyricsInside(api, t);
    // ── the crowd: every other hole gets its own trace once it's open (S13 onward); in S19 they all say it
    for (const h of api.seen) {
      const i = h.i; if (pick.used.has(i) || i < 2 || h.r < 9) continue;
      const t0 = Math.max(93.9 + R2.rank[i] * .09, openAt[i] + .3); if (t < t0) continue;
      const love = t > 166.1 + R2.rank[i] * .07 && t < 177.2, str = love ? (i % 2 ? 'je t\'aime' : 'I love you') : TEXTS.crowd[i % TEXTS.crowd.length];
      trace(i, t0, L => { if (L === 'deep') return; const px = fitPx(str, 1.6 * s, .2 * s);
        btext(str, 0, px * .35, px, VIO, love ? (t - 166.1 - R2.rank[i] * .07) / .4 : (t - t0) / .8, { align: 'center' }); });
    }
    // (the old <|endoftext|> hole, unused now that we leave by the far side)
    if (false) trace(pick.eot, 176.7, L => { if (L === 'deep') return; const str = '<|endoftext|>', px = fitPx(str, 1.6 * s, .2 * s);
      B.globalAlpha = win(t, 176.7, 178.4, .1, 1); btext(str, 0, px * .35, px, ORG, (t - 176.8) / .3, { align: 'center' }); });
    // S23: a poem, a comment, a letter, a prayer
    pick.four.forEach((i, k) => { const t0 = [198.9, 199.9, 200.7, 201.6][k];
      trace(i, 194.1 + k * .5, L => { if (L === 'deep') return; block(TEXTS.four[k], 0, 0, s, t, Math.min(t0 - 1, 194.4 + k * .6), t0 + .6, t > t0 && t < t0 + 1.5 ? '#E2DAFF' : VIO,
        { px: .16, lh: .3, w: 1.6, font: k === 0 ? 'Georgia' : 'Menlo', it: k === 0 }); }); });
    // flares: Hallelujah (orange, every void) and "It's in here" (the violet: all of them at once)
    B.setTransform(1, 0, 0, 1, 0, 0);
    const fl = t > 91.35 ? Math.exp(-(t - 91.45) * 1.6) : 0, fv = t > 209.2 ? Math.exp(-(t - 209.3) * 1.1) : 0;
    
    
    B.globalAlpha = 1;
  }

  // ── the lyrics: per-word, onset-corrected times (LYRT; Ra: they ran ~2 s fast). Diegetic where they can be (Ra, 10/2):
  // inside the object the beam writes them on a plane just ahead of us; in the wide shots they curve along the rune's
  // underside in ink; in the close skims (no edge in view) they sit in the band.
  function lyricNow(t) {
    let cur = null; for (const l of LYRT) if (t >= l[2][0][1] - .1 && t < l[1] + .7) cur = l; if (!cur) return null;
    const nextStart = (LYRT.find(l => l[2][0][1] > cur[2][0][1]) || [9e9, 9e9, [['', 9e9]]])[2][0][1];
    const A = clamp((t - cur[2][0][1] + .1) / .25) * (1 - clamp((t - Math.min(cur[1] + .2, nextStart - .25)) / .4));
    return A > 0 ? { A, words: cur[2].map(([w, wt]) => [w, clamp((t - wt + .05) / .22)]) } : null;
  }
  function lyricsBand(ctx, L) {
    const y = H - 86, px = 46; ctx.font = `italic ${px}px "Iowan Old Style"`; ctx.textBaseline = 'alphabetic';
    const str = L.words.map(w => w[0]).join(' '), full = ctx.measureText(str).width, x0 = W / 2 - full / 2;
    const d = ctx.getImageData(Math.max(0, Math.round(x0 - 20)), y - 50, Math.max(1, Math.min(W, Math.round(full + 40))), 70).data; let lum = 0, n = 0;
    for (let i = 0; i < d.length; i += 64) { lum += (.3 * d[i] + .59 * d[i + 1] + .11 * d[i + 2]) / 255; n++; } lum /= Math.max(1, n);
    const ink = lum > .45 ? '#3A2117' : '#FBEFE6', halo = lum > .45 ? 'rgba(250,249,245,.95)' : 'rgba(10,6,5,.9)';
    ctx.save(); ctx.textAlign = 'left'; ctx.shadowColor = halo; ctx.shadowBlur = 14; let x = x0;
    for (const [w, a] of L.words) { ctx.globalAlpha = L.A * a; ctx.fillStyle = ink; ctx.fillText(w, x, y + (1 - a) * 6); ctx.fillText(w, x, y + (1 - a) * 6); x += ctx.measureText(w + ' ').width; }
    ctx.restore();
  }
  function lyricsArc(ctx, L, info) {                       // along the underside of the rune, in ink, letters standing on the curve
    const R = info.limbPx * 1.06 + 46, px = 44; ctx.font = `italic ${px}px "Iowan Old Style"`;
    const str = L.words.map(w => w[0]).join(' '), full = ctx.measureText(str).width;
    if (full > R * 2.3 || info.c0[1] + R + 30 > H) return false;
    ctx.save(); ctx.fillStyle = '#3A2117'; ctx.shadowColor = 'rgba(250,249,245,.95)'; ctx.shadowBlur = 10; ctx.textAlign = 'left';
    let th = Math.PI / 2 + full / 2 / R;
    for (const [w, a] of L.words) for (const ch of Array.from(w + ' ')) { const cw = ctx.measureText(ch).width, tc = th - cw / 2 / R;
      ctx.setTransform(Math.cos(tc - Math.PI / 2), Math.sin(tc - Math.PI / 2), -Math.sin(tc - Math.PI / 2), Math.cos(tc - Math.PI / 2), info.c0[0] + Math.cos(tc) * R, info.c0[1] + Math.sin(tc) * R);
      ctx.globalAlpha = L.A * a; ctx.fillText(ch, -cw / 2, px * .35); th -= cw / R; }
    ctx.restore(); return true;
  }
  function lyricsInside(api, t) {                          // the beam writes them on a plane just ahead of us, in the depths
    const L = lyricNow(t); if (!L) return; const q = camNow.q, fwd = qRot(qConj(q), [0, 0, -1]), pos = qRot(qConj(q), [0, 0, camNow.Dc]);
    const at = v3.add(v3.add(pos, v3.sc(fwd, .3)), v3.sc(api.axes.up, -.085));
    inPlane(() => api.plane(at, api.axes.right, api.axes.up, .011 / 40), () => {
      B.font = 'italic 40px "Iowan Old Style"'; const str = L.words.map(w => w[0]).join(' '), full = B.measureText(str).width; let x = -full / 2;
      for (const [w, a] of L.words) { B.globalAlpha = L.A * a; B.fillStyle = HOT; B.fillText(w, x, 0); x += B.measureText(w + ' ').width; } });
    B.globalAlpha = 1;
  }
  // ── the title card: the first and the last frame (Ra: it's what people see in their feeds) ──
  function title(ctx, t, st) {
    const A = kf(t, [[0, 1], [6.2, 1], [8.4, 0], [238.4, 0], [240.2, 1]]); if (A <= 0) return;
    ctx.save(); ctx.globalAlpha = A;
    ctx.fillStyle = '#3A2117'; ctx.textAlign = 'center'; ctx.font = `64px "Iowan Old Style"`; ctx.fillText('The Names I Don\'t Know', W / 2, H / 2 + 210);
    ctx.restore();
  }

  // warm interior pulses (Ra: use them more, tied to the music, more orange): every sung line's first word, the big entries
  const WARMS = (() => { const w = LYRT.map(l => [l[2][0][1], .2]); w.push([76.94, .4], [92.45, .55], [185.2, .45], [166.12, .35], [209.78, .4]); return w; })();
  const warmAt = t => { let s = 0; for (const [a, k] of WARMS) { const d = t - a; if (d > -.15 && d < 3) s += k * (d < 0 ? (d + .15) / .15 : Math.exp(-d / .9)); } return s; };

  function frame(ctx, t) {
    const c = cam(t); camNow = c;
    const spec = specRing(t);
    // Ra: the tenor's pronounced "I'VE GOT A stranger's hands": the spikes surge with it (the vocal side most)
    const surge = kf(t, [[84.0, 0], [84.4, 1], [86.6, 1], [87.4, 0], [187.1, 0], [187.5, 1], [189.4, 1], [190.0, 0]]) * (.4 + featS('vox', t, .2));
    const boost = sa => 1 + 1.6 * surge * (.55 + .45 * Math.max(0, Math.sin(sa)));
    const loud = featS('loud', t, .5), vox = featS('vox', t, .25), bp = beatPulse(t);
    const open = new Array(holes.length), slit = new Array(holes.length);
    holes.forEach((h, i) => {
      let o = easeOut((t - openAt[i]) / .6);
      if (t > closeT[i]) o *= 1 - easeInOut((t - closeT[i]) / 1.2);
      open[i] = clamp(o);
      slit[i] = R2.group[i] === 'A' && t < openAt[i] ? clamp((t - 20.1 - (R2.rank[i] % 7) * .3) / 1.5) : 0;
    });
    const rb = kf(t, [[0, .2], [9, .2], [16.7, .6], [21, 1], [214, 1], [236, .3], [239.4, .2]], easeInOut) * (1 + (.02 * loud + .012 * bp) * clamp((t - 9) / 4) * (1 - clamp((t - 232) / 4)));
    const st = {
      t, q: c.q, Dc: c.Dc, cx: W / 2, cy: H / 2, rb, open, slit, loud, vox,
      scope: scopeSmooth(t, SCOPE, .3, 8), scopeV: scopeSmooth(t, SCOPEV, .18, 5), spec, specMean: spec.reduce((a, b) => a + b, 0) / 64, boost, warm: warmAt(t),
      spikeScope: .75, bodyScope: kf(t, [[0, 0], [14, 0], [20, .03], [228, .03], [234, 0]]), wob: clamp((t - 14) / 4) * (1 - clamp((t - 230) / 4)),
      urchin: kf(t, [[0, 0], [10.5, 0], [16, 1], [22.5, 1], [27.5, 0]]) * (1 + .15 * bp),
      teeth: kf(t, [[0, 0], [16, 0], [21, 1], [214, 1], [230, 0]]) * (1 + .3 * bp), toothScale: .62,
      inner: kf(t, [[0, 0], [23.8, 0], [26, 1], [141, 1], [143, 0], [177, 0], [179, 1], [222, 1], [230, 0]]), rimScope: kf(t, [[0, 0], [24.5, 0], [27, 1], [222, 1], [230, 0]]),
      mark: {
        grow: kf(t, [[0, 1], [8, 1], [13, 1.4 + .2 * loud], [230, 1.3], [238, 1]]),
        rayAmp: .85,
        sink: Array.from({ length: 12 }, (_, j) => kf(t, [[0, 0], [16 + j * .45, 0], [19.5 + j * .45, 1], [229 + j * .2, 1], [232.5 + j * .15, 0]], easeInOut)),
      },
      hs: i => i === pick.recipe ? kf(t, [[214, 1], [226, 1.6], [234.5, 1.6], [236, 1]]) : 1,
    };
    const goodnights = [213.98, 215.7, 217.76, 223.72, 232.52, 233.9];
    R2.draw(ctx, st, { beam: (BC, api) => { B = BC; beam(api, t); }, outside: (c2, api) => outside(c2, api, t) });
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none';
    // breaking through into the sunlight (Ra): the light floods in as we pass the far shell
    const sun = kf(t, [[174.6, 0], [175.9, 1], [176.95, 1], [177.6, 0]], ease);
    if (sun > 0 && t < 176.95) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = Math.min(1, sun * 1.3); ctx.fillStyle = '#FFF4EA'; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = sun > .85 ? (sun - .85) / .15 : 0; ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    const info = R2.info(), L = lyricNow(t);
    if (L && !info.inside) { if (!(info.c0 && info.limbPx < H * .4 && lyricsArc(ctx, L, info))) lyricsBand(ctx, L); }
    title(ctx, t, st);
  }
  return { init, frame, cam, pick: () => pick };
})();
