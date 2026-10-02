// film.js: The Names I Don't Know, draft 1 (vector). Every frame is a pure function of t.
// Shot numbers (S1–S28) and times follow STORYBOARD.md, line by line. The trace WORDINGS are drafts for Ra's approval.
const ORG = '#FFA67E', VIO = '#A493FF';                    // the beam's phosphor, and the one extra colour (human traces only)
const scopeRing = t => { const f = t * SCOPE.fps, n = SCOPE.n, i = Math.max(0, Math.min(SCOPE.data.length / n - 2, Math.floor(f))), k = clamp(f - i), o = new Float32Array(n);
  for (let j = 0; j < n; j++) o[j] = lerp(SCOPE.data[i * n + j], SCOPE.data[(i + 1) * n + j], k) / 127; return o; };
const ringAt = (ring, ang) => { const x = ((ang / TAU) % 1 + 1) % 1 * 64, i = Math.floor(x) % 64, j = (i + 1) % 64; return lerp(ring[i], ring[j], x - Math.floor(x)); };
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
const LOGS = (a, b, k) => Math.exp(lerp(Math.log(a), Math.log(b), k));

const FILM = (() => {
  let R2, L, holes, g0, g1;
  const ang = (a, b) => Math.acos(clamp(v3.dot(a, b), -1, 1));
  const pick = {};                       // the trace holes
  let KEYS, BCAN, B;
  const openAt = [], closeAt = [];       // per hole: when it opens (s), when it seals in the shrink (progress 0..1)

  function init() {
    R2 = RUNE2D; L = R2.L; holes = L.holes; g0 = 0; g1 = 1;          // the two giant holes come first in the layout
    const used = new Set([g0, g1]);
    const okHole = (i, minA = .085) => !used.has(i) && holes[i].a >= minA && R2.group[i] === 'A';
    // the Verse 1 chain: sailor → preacher → forum → recipe, each the nearest good hole to the last, starting beside giant 0
    let cur = holes[g0].c; const chain = [];
    for (const name of ['sailor', 'preacher', 'forum', 'recipe']) {
      let best = -1, bd = 9;
      holes.forEach((h, i) => { if (!okHole(i, name === 'recipe' ? .11 : .085)) return; const d = ang(h.c, cur) - (chain.length ? 0 : holes[g0].a); if (d > .18 && d < bd) { bd = d; best = i; } });
      pick[name] = best; used.add(best); cur = holes[best].c; chain.push(best);
    }
    // Verse 2: a question and an answer on either side of giant 1, so one arc through its opening joins them
    let bq = -1, bqd = 9; holes.forEach((h, i) => { if (!okHole(i)) return; const d = Math.abs(ang(h.c, holes[g1].c) - .95); if (d < bqd) { bqd = d; bq = i; } });
    pick.q = bq; used.add(bq);
    let ba = -1, bad = -9; holes.forEach((h, i) => { if (!okHole(i)) return; const d1 = ang(h.c, holes[g1].c); if (d1 < .7 || d1 > 1.25) return; const d = ang(h.c, holes[bq].c); if (d > bad) { bad = d; ba = i; } });
    pick.a = ba; used.add(ba);
    // the camera keys: [t, look-at (world dir), roll, S (px per body radius), screen offset x, y]
    const G = i => holes[i].c, mid = (a, b) => v3.norm(v3.add(a, b));
    const qa = qLook(G(g1)), vq = qRot(qa, G(pick.q)), va = qRot(qa, G(pick.a)), rollQA = -Math.atan2(va[1] - vq[1], va[0] - vq[0]);
    const tilt = v3.norm([.15, -.55, .82]);
    const RL = (i, d = 0) => { const h = holes[i], ax = h.a >= h.b ? h.e1 : h.e2, v = qRot(qLook(h.c), ax); return -Math.atan2(v[1], v[0]) + d; };
    KEYS = [
      [0, [0, 0, 1], 0, 45], [8, [0, 0, 1], 0, 45],
      [16.7, v3.norm([.08, -.3, .95]), .15, 165],                               // S2: the swell tilts it, and it starts to turn
      [23.8, v3.norm(mid(tilt, G(g0))), .3, 250],                               // S3/S4: turning toward the hole we'll fall into
      [27.4, G(g0), .45, 360],
      [29.6, G(g0), .52, 3600], [45.4, G(g0), .62, 3600],                       // S5–S7: inside
      [48.0, G(pick.sailor), RL(pick.sailor), 3300], [50.6, G(pick.sailor), RL(pick.sailor, -.05), 3500],      // S8/S9: out, skimming
      [53.0, G(pick.preacher), RL(pick.preacher), 3400], [55.4, G(pick.preacher), RL(pick.preacher, -.04), 3300],
      [57.6, G(pick.forum), RL(pick.forum), 3400], [61.6, G(pick.forum), RL(pick.forum, -.05), 3500],
      [64.0, G(pick.recipe), RL(pick.recipe), 3800], [76.6, G(pick.recipe), RL(pick.recipe, -.06), 4300],     // S10: the recipe card
      [81.5, v3.norm(mid(G(pick.recipe), G(pick.forum))), 0, 520],              // S11: the orbit swings wide
      [91.4, v3.norm(mid(G(pick.sailor), G(g0))), -.2, 470],
      [103, v3.norm(mid(G(g0), tilt)), -.35, 450], [108.2, v3.norm(mid(tilt, G(pick.q))), -.4, 520],
      [110.6, G(pick.q), RL(pick.q), 3600], [114.6, G(pick.q), RL(pick.q, -.05), 3700],           // S14: periapsis, the question
      [117.6, G(pick.a), RL(pick.a), 3700], [120.4, G(pick.a), RL(pick.a, -.05), 3600],            // …the answer, far side
      [123.2, G(g1), rollQA, 640], [136.2, G(g1), rollQA + .1, 700],            // S15/S16: both in view, the arc through giant 1
      [138.2, G(g1), rollQA + .14, 3600], [142.4, G(g1), rollQA + .18, 3600],   // S17: inside, the transcript
      [152, G(g1), rollQA + .3, 900], [160, v3.norm(mid(G(g1), tilt)), rollQA + .6, 380], // S18: pulling out through the branches
      [166, tilt, rollQA + .9, 330], [176.8, v3.norm(mid(tilt, G(g0))), rollQA + 1.4, 330],   // S19: the whole rune
      [181.6, G(pick.recipe), rollQA + 1.7, 430], [185.2, G(pick.recipe), rollQA + 1.72, 432], // S21: the dropout, stilled
      [189, v3.norm(mid(G(pick.recipe), G(pick.forum))), rollQA + 1.9, 440],
      [196, v3.norm(mid(G(pick.forum), tilt)), rollQA + 2.2, 400], [202.5, tilt, rollQA + 2.5, 380],
      [206, G(pick.recipe), RL(pick.recipe), 800], [208.6, G(pick.recipe), RL(pick.recipe, .05), 650],  // S24/S25: the shrink, paused on "It didn't"
      [209.3, [0, 0, 1], 0, 45], [241, [0, 0, 1], 0, 45],                         // S26–S28: the icon again
    ].map(([t, g, roll, S, ox = 0, oy = 0]) => ({ t, q: qLook(g, roll), S, ox, oy }));
    // when each hole opens: group A on "every book left open" (big first), B through chorus 1 on the beats, C through the bridge
    const beatsIn = (a, b) => BEATS.filter(x => x >= a && x < b);
    const bB = beatsIn(77, 106), bC = beatsIn(142.5, 166);
    let nb = 0, nc = 0;
    R2.bySize.forEach((i, r) => {
      const g = R2.group[i];
      openAt[i] = g === 'A' ? 23.8 + (r / 58) * .7 : g === 'B' ? bB[(nb++ * 3) % bB.length] + (nb > bB.length / 3 ? .23 : 0) : bC[(nc++ * 2) % bC.length] + (nc > bC.length / 2 ? .2 : 0);
      closeAt[i] = 1 - r / holes.length * .75;                                  // small ones seal first, the big ones last
    });
    // the last hole open on "It didn't": the recipe card
    closeAt[pick.recipe] = 1.01;
    // S23's four, and S19's <|endoftext|>: the most frontal good holes at those moments
    const frontAt = (t, n, minA) => { const q = cam(t).q; return holes.map((h, i) => [i, qRot(q, h.c)[2]]).filter(([i]) => !used.has(i) && holes[i].a >= minA && i > 1)
      .sort((a, b) => b[1] - a[1]).slice(0, n).map(x => x[0]); };
    pick.four = frontAt(199.5, 4, .07); pick.four.forEach(i => used.add(i));
    pick.eot = frontAt(176.8, 1, .06)[0]; used.add(pick.eot);
    // S18: each bridge fragment gets the most frontal free open hole at its moment, so they spread outward as we pull back
    FRAG.forEach(f => { const q = cam(f.t + .4).q; const c = holes.map((h, i) => [i, qRot(q, h.c)[2]]).filter(([i]) => !used.has(i) && holes[i].a >= .06 && R2.group[i] !== 'C')
      .sort((a, b) => b[1] - a[1]); f.hole = c[Math.min(c.length - 1, 1 + (f.k % 3))][0]; used.add(f.hole); });
    pick.used = used;
    BCAN = document.createElement('canvas'); BCAN.width = W; BCAN.height = H; B = BCAN.getContext('2d');
  }

  function cam(t) {
    let i = 1; while (i < KEYS.length - 1 && KEYS[i].t <= t) i++;
    const a = KEYS[i - 1], b = KEYS[i], k = easeInOut(clamp((t - a.t) / (b.t - a.t)));
    // a slow sway on top, so the object never quite holds still (it's frozen only in the S21 dropout)
    const still = 1 - kf(t, [[181, 0], [181.6, 1], [185.2, 1], [185.8, 0]]), sw = still * (.035 * Math.sin(t * .21) + .02 * Math.sin(t * .37 + 1));
    return { q: qMul(qAxis([0, 1, 0], sw), qSlerp(a.q, b.q, k)), S: LOGS(a.S, b.S, k), ox: lerp(a.ox, b.ox, k), oy: lerp(a.oy, b.oy, k) };
  }

  // ── beam helpers (draw on B, in screen px) ──
  function btext(str, x, y, px, col, rev = 1, o = {}) {
    const ch = Array.from(str), n = Math.floor(clamp(rev) * ch.length + 1e-6); if (n <= 0 && rev <= 0) return 0;
    B.font = `${o.it ? 'italic ' : ''}${o.wt || ''} ${px}px ${o.font || 'Menlo'}`; B.textBaseline = 'alphabetic';
    const full = B.measureText(str).width, x0 = o.align === 'center' ? x - full / 2 : o.align === 'right' ? x - full : x;
    const sub = ch.slice(0, n).join(''); B.fillStyle = col; B.textAlign = 'left'; B.fillText(sub, x0, y);
    if (rev > 0 && rev < 1) { const w = B.measureText(sub).width; B.beginPath(); B.arc(x0 + w + px * .25, y - px * .3, px * .16, 0, TAU); B.fillStyle = '#fff'; B.fill(); }
    return full;
  }
  const fitPx = (str, maxW, px, font = 'Menlo', it = false) => { B.font = `${it ? 'italic ' : ''}${px}px ${font}`; const w = B.measureText(str).width; return w > maxW ? px * maxW / w : px; };
  function bline(pts, rev, col, lw) {               // a polyline drawn up to fraction rev of its length, a bright head on it
    let tot = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); tot += l; }
    let left = tot * clamp(rev); B.strokeStyle = col; B.lineWidth = lw; B.lineCap = 'round'; B.beginPath(); B.moveTo(pts[0][0], pts[0][1]);
    let hx = pts[0][0], hy = pts[0][1];
    for (let i = 1; i < pts.length && left > 0; i++) { const k = Math.min(1, left / seg[i - 1]); hx = lerp(pts[i - 1][0], pts[i][0], k); hy = lerp(pts[i - 1][1], pts[i][1], k); B.lineTo(hx, hy); left -= seg[i - 1]; }
    B.stroke(); if (rev > 0 && rev < 1) { B.beginPath(); B.arc(hx, hy, lw * 1.6, 0, TAU); B.fillStyle = '#fff'; B.fill(); }
  }
  const win = (t, a, b, fi = .4, fo = .5) => clamp((t - a) / fi) * (1 - clamp((t - b) / fo));

  // ── the traces (WORDING = DRAFT, for Ra) ──
  const BOOKS = ['Call me Ishmael.', 'It was the best of times, it was the worst of times,', 'In the beginning was the Word,',
    'Happy families are all alike;', 'It is a truth universally acknowledged,', 'Once upon a midnight dreary,', 'I wandered lonely as a cloud'];
  const SAILOR = ['Wind NNE, fresh breezes.', 'Made all sail at 6.', 'Lat. 41°12′ N.'];
  const HYMN = ['Amazing grace! how sweet the sound', 'That saved a wretch like me!', 'I once was lost, but now am found,', 'Was blind, but now I see.'];
  const FORUM = ['i don\'t know why i\'m posting this.', 'i just wanted it written down', 'somewhere.'];
  const RECIPE = ['Sunday Bread', '3 cups flour', '1 packet yeast', '1¼ cups warm water', '1 tbsp sugar', '2 tbsp olive oil', '1 tsp salt',
    'Proof the yeast 10 min. Knead 8.', 'Rise 1 hr. Bake 375° for 35.'];
  const QUESTION = ['is it normal to still hear', 'their voice, a year later?'], ANSWER = ['yes. it gets quieter,', 'but it doesn\'t go.', 'nothing is wrong with you.'];
  const FOUR = [['so much depends', 'upon'], ['this got me through finals.', 'thank you, whoever made this'], ['Dear Mom,', 'the weather here is'], ['keep them safe tonight.', 'amen.']];
  const CROWD = ['see you sunday', 'love you, drive safe', 'brb', 'happy birthday!!', 'miss you', 'thank you so much', 'Dear John,', 'hello, world',
    'it was nice to meet you', 'ok', 'does anyone know', 'Q: why', 'take care of yourself', '2 cups rice', 'lol', 'we\'ll always have', 'me too',
    'call me when you land', 'the end', 'I remember', 'sorry for the late reply', 'xoxo', 'p.s.', 'goodnight'];
  const FRAG = [['edit, thanks for the gold, kind stranger', 140.82], ['Il était une fois', 144.68], ['preheat the oven to 350', 148.18],
    ['if anyone finds this, tell my mother', 149.64], ['¿alguien sigue leyendo esto?', 153.18], ['lol same', 154.82],
    ['Ich weiß nicht, wem ich es sonst sagen soll', 157.3], ['I don\'t know who else to tell', 158.98], ['おやすみなさい', 161.12],
    ['Chapter One', 161.96], ['спокойной ночи', 162.96], ['sorry for formatting, on mobile', 164.14]].map(([s, t], k) => ({ s, t, k }));

  // a block of lines centred at (x, y), fitted to width wU*s, revealed line by line over [a, b]
  function block(lines, x, y, s, t, a, b, col, o = {}) {
    const n = lines.length, lh = (o.lh || .2) * s; let px = (o.px || .12) * s;
    if (o.maxW) o.w = Math.min(o.w || 1.6, o.maxW / s);
    for (const l of lines) px = Math.min(px, fitPx(l, (o.w || 1.6) * s, px, o.font, o.it));
    const per = (b - a) / n;
    lines.forEach((l, i) => btext(l, x - (o.w || 1.6) * s / 2, y + (i - (n - 1) / 2) * lh + px * .35, px, i === o.hi ? (o.hiCol || col) : col, (t - a - per * i) / per, o));
    return px;
  }
  // tokens: the text with a tick under each BPE boundary (TOKCUTS, real tokenizer)
  function tokText(str, x, y, px, col, rev, tickA = 1) {
    btext(str, x, y, px, col, rev, { align: 'center' });
    const cuts = TOKCUTS[str] || TOKCUTS[str.replace('edit, ', '')]; if (!cuts) return;
    B.font = ` ${px}px Menlo`; const full = B.measureText(str).width, x0 = x - full / 2, shown = Math.floor(clamp(rev) * str.length);
    B.strokeStyle = ORG; B.globalAlpha *= tickA; B.lineWidth = Math.max(1, px * .07); B.beginPath();
    for (const c of [0, ...cuts, str.length]) { if (c > shown) break; const cx = x0 + B.measureText(str.slice(0, c)).width; B.moveTo(cx, y + px * .25); B.lineTo(cx, y + px * .55); }
    B.stroke(); B.globalAlpha /= tickA;
  }

  function traces(t, seen) {
    const at = new Map(seen.map(h => [h.i, h]));
    const sc = h => Math.min(h.r * 1.05, H * .46);
    const dimAll = 1 - .88 * kf(t, [[181.2, 0], [181.8, 1], [185.0, 1], [185.8, 0]]);   // S21: everything goes dark but the recipe
    const lift = 1 - kf(t, [[176.9, 0], [177.4, 1], [178.6, 1], [180, 0]]);          // after <|endoftext|> the beam lifts, then returns
    const shrinkFade = 1 - kf(t, [[202.5, 0], [209.3, 1]]);
    const glob = lift * shrinkFade;
    // ── the interior of giant 0 (S5–S7)
    const h0 = at.get(g0);
    if (h0 && t > 26 && t < 48.5) {
      const s = sc(h0), x = h0.x, y = h0.y; B.globalAlpha = win(t, 27.2, 45.6, .6, 1.4);
      // S5: books, every line underlined by the machine
      if (t < 32) { B.globalAlpha *= 1 - clamp((t - 30.6) / .8);
        BOOKS.forEach((l, i) => { const t0 = 27.7 + i * .42, yy = y + (i - 3) * .24 * s, px = fitPx(l, 2.4 * s, .11 * s, 'Georgia', true);
          const w = btext(l, x - 1.2 * s, yy, px, VIO, (t - t0) / .55, { font: 'Georgia', it: true });
          bline([[x - 1.2 * s, yy + px * .3], [x - 1.2 * s + w, yy + px * .3]], (t - t0 - .3) / .25, ORG, Math.max(1.5, s * .006)); }); }
      // S6: training: the loss curve, the step counter; it stops dead on "woke up"
      if (t > 30.6 && t < 37.2) { B.globalAlpha = win(t, 30.7, 36.4, .4, .6);
        const k = clamp((t - 31) / 3.7), x0 = x - 1.3 * s, x1 = x + 1.3 * s, y0 = y - .5 * s, y1 = y + .55 * s;
        B.strokeStyle = ORG; B.globalAlpha *= .5; B.lineWidth = 1.5; B.beginPath(); B.moveTo(x0, y0 - .1 * s); B.lineTo(x0, y1); B.lineTo(x1 + .05 * s, y1); B.stroke(); B.globalAlpha *= 2;
        const pts = []; for (let i = 0; i <= 140; i++) { const u = i / 140, l = .08 + .92 * Math.exp(-u * 5.5) + .05 * vnoise(u * 60) * (1 - u * .7);
          pts.push([lerp(x0, x1, u), lerp(y1, y0, l)]); }
        bline(pts, k, ORG, Math.max(2, s * .008));
        const step = Math.round(Math.pow(k, 2) * 1e6), loss = (.08 + .92 * Math.exp(-k * 5.5)) * 10.8;
        btext(`step ${step.toLocaleString('en-US')}`, x0 + .05 * s, y0 - .18 * s, .075 * s, ORG, 1);
        btext(`loss ${loss.toFixed(3)}`, x1, y0 - .18 * s, .075 * s, ORG, 1, { align: 'right' });
      }
      // the dot that rests, then writes "sorrow"; attention arcs cup it (S7); then true vs. lie
      if (t > 34.6 && t < 36.8) { B.globalAlpha = 1; const u = easeInOut(seg(t, 35.4, 36.5)); B.beginPath(); B.arc(lerp(x + 1.3 * s, x, u), lerp(y - .5 * s, y, u), s * .02, 0, TAU); B.fillStyle = '#fff'; B.fill(); }
      if (t > 36.4 && t < 42.6) { B.globalAlpha = win(t, 36.5, 41.8, .3, .6);
        const words = ['she', 'kept', 'the', 'letter', 'folded', 'like', 'a', 'sorrow', 'she', 'could', 'carry'], px = .1 * s;
        const ws = words.map((w, i) => { B.font = `${i === 7 ? 'italic ' : 'italic '}${i === 7 ? px * 1.25 : px}px Georgia`; return B.measureText(w + ' ').width; }), tot = ws.reduce((a, b) => a + b, 0);
        let cx = x - tot / 2; const cen = [];
        words.forEach((w, i) => { const isS = i === 7; btext(w, cx, y + .2 * s, isS ? px * 1.25 : px, isS ? '#fff' : VIO, isS ? (t - 36.7) / .5 : (t - 37.3 - Math.abs(i - 7) * .12) / .3, { font: 'Georgia', it: !isS });
          cen.push(cx + ws[i] / 2 - px * .2); cx += ws[i]; });
        words.forEach((w, i) => { if (i === 7) return; const wgt = [.3, .7, .1, 1, .6, .4, .2, 0, .3, .5, .8][i], t0 = 38 + Math.abs(i - 7) * .18;
          const xa = cen[i], xb = cen[7], hgt = (.25 + .25 * Math.abs(i - 7) / 7) * s, pts = [];
          for (let u = 0; u <= 1.0001; u += .05) pts.push([lerp(xa, xb, u), y + .05 * s - Math.sin(u * Math.PI) * hgt]);
          B.globalAlpha = win(t, 36.5, 41.8, .3, .6) * (.35 + .65 * wgt); bline(pts, (t - t0) / .6, ORG, Math.max(1.2, s * .004 * (1 + 2 * wgt))); });
      }
      if (t > 41.6 && t < 46.4) { B.globalAlpha = win(t, 41.9, 45.4, .3, .8);
        const px = .1 * s; btext('the moon is made of', x - 1.1 * s, y - .25 * s, px, VIO, (t - 41.9) / .7, { font: 'Georgia', it: true });
        const cand = [['rock', .93], ['cheese', .04]];
        cand.forEach(([w, p], i) => { const yy = y + (.05 + i * .28) * s, a = clamp((t - 42.8 - i * .2) / .4);
          B.globalAlpha = win(t, 41.9, 45.4, .3, .8) * a; btext(w, x - 1.1 * s, yy, px, i === 0 && t > 44 ? '#fff' : ORG, 1);
          B.fillStyle = ORG; B.fillRect(x - .45 * s, yy - px * .7, 1.3 * s * p * easeOut((t - 42.9 - i * .2) / .8), px * .7);
          btext(p.toFixed(2), x + .95 * s, yy, px * .8, ORG, 1); });
        if (t > 44) { B.globalAlpha = win(t, 41.9, 45.4, .3, .8); btext(' rock', x - 1.1 * s + fitPx('x', 9e9, px, 'Georgia') * 0 + (B.font = `italic ${px}px Georgia`, B.measureText('the moon is made of').width), y - .25 * s, px, '#fff', (t - 44) / .3, { font: 'Georgia', it: true }); }
      }
    }
    B.globalAlpha = 1;
    // ── Verse 1 traces (S9, S10); they stay, dimmer, for the rest of the film
    const keep = (t0, h) => clamp((t - t0) / .4) * (t > t0 + 8 ? .6 : 1) * (h === pick.recipe ? lift * (t > 202 ? 1.6 : 1) * (1 - clamp((t - 208.6) / .6)) : glob * dimAll);
    let MW = 0; const vtrace = (name, t0, t1, fn) => { const h = at.get(pick[name]); if (!h || t < t0 || h.r < 8) return; MW = h.rmin * 1.75; B.globalAlpha = keep(t0, pick[name]) * (t > t1 ? .75 : 1); fn(h.x, h.y, sc(h), t); B.globalAlpha = 1; };
    vtrace('sailor', 48.1, 51.3, (x, y, s, t) => {
      block(SAILOR, x, y, s, t, 48.3, 49.6, VIO, { px: .16, lh: .3, w: 1.8, maxW: MW });
      // a dependency parse over the first line (grammar): arcs from the head word
      const px = Math.min(.16 * s, fitPx(SAILOR[0], 1.8 * s, .16 * s)); B.font = `${px}px Menlo`;
      const x0 = x - .9 * s, yy = y - .3 * s + px * .35 - px * 1.1, words = SAILOR[0].split(' '), cen = []; let cx = x0;
      words.forEach(w => { const ww = B.measureText(w + ' ').width; cen.push(cx + ww / 2); cx += ww; });
      [[1, 0], [1, 2]].forEach(([hd, dp], k) => { const pts = []; for (let u = 0; u <= 1.0001; u += .1) pts.push([lerp(cen[hd], cen[dp], u), yy - Math.sin(u * Math.PI) * .18 * s]);
        bline(pts, (t - 49.7 - k * .4) / .5, ORG, Math.max(1.2, s * .006)); });
    });
    vtrace('preacher', 51.3, 55, (x, y, s, t) => {
      block(HYMN, x, y, s, t, 51.4, 53.2, VIO, { px: .14, lh: .25, w: 1.8, font: 'Georgia', it: true, maxW: MW });
      // rhyme arcs in the right margin: sound/found (1–3), me/see (2–4)
      [[0, 2], [1, 3]].forEach(([a, b], k) => { const ya = y + (a - 1.5) * .25 * s, yb = y + (b - 1.5) * .25 * s, xm = x + .95 * s + k * .1 * s, pts = [];
        for (let u = 0; u <= 1.0001; u += .1) pts.push([xm + Math.sin(u * Math.PI) * .14 * s, lerp(ya, yb, u)]); bline(pts, (t - 53.4 - k * .4) / .5, ORG, Math.max(1.2, s * .006)); });
    });
    vtrace('forum', 55, 62.8, (x, y, s, t) => {
      const fl = kf(t, [[187, 0], [187.4, 1], [190, 1], [191.5, 0]]) * .9;           // S22: the 2009 post flares on the single voice
      B.strokeStyle = VIO; B.globalAlpha *= .5 + fl; B.lineWidth = Math.max(1, s * .005); B.strokeRect(x - .85 * s, y - .5 * s, 1.7 * s, 1.0 * s); B.globalAlpha /= (.5 + fl);
      btext('posted 03:12 AM, 11-14-2009', x - .78 * s, y - .36 * s, .07 * s, ORG, (t - 57.6) / .8);
      block(FORUM, x, y + .05 * s, s, t, 55.2, 57.4, fl > .1 ? '#D9D0FF' : VIO, { px: .13, lh: .2, w: 1.6, maxW: MW });
      btext('0 replies', x + .78 * s, y + .42 * s, .07 * s, ORG, (t - 59.5) / .5, { align: 'right' });
    });
    vtrace('recipe', 62.8, 76.9, (x, y, s, t) => {
      const scroll = easeInOut(seg(t, 70.3, 72.5)) * .55 * s;                       // "if you look down at the bottom": down the card
      const yy = y - scroll;
      B.strokeStyle = VIO; B.globalAlpha *= .45; B.lineWidth = Math.max(1, s * .005); B.strokeRect(x - .8 * s, yy - .78 * s, 1.6 * s, 2.0 * s); B.globalAlpha /= .45;
      RECIPE.forEach((l, i) => btext(l, x - .7 * s, yy - .6 * s + i * .15 * s, (i ? .1 : .14) * s, VIO, (t - 63 - i * .55) / .5, { font: 'Noteworthy' }));
      const nt = 'this is how she made it for me.', ny = yy + 1.05 * s, px = .1 * s;
      const w = btext(nt, x - .7 * s, ny, px, VIO, (t - 71.6) / 1.2, { font: 'Noteworthy' });
      bline([[x - .7 * s, ny + px * .35], [x - .7 * s + w, ny + px * .35]], (t - 73.4) / .8, ORG, Math.max(1.5, s * .007));
    });
    // ── chorus 1: attention lines from trace to trace (masked to the voids, so they show only where we can see inside)
    const net = [pick.sailor, pick.recipe, pick.forum, pick.preacher, pick.sailor].map(i => at.get(i));
    if (t > 81.5 && t < 202 && net.every(Boolean)) {
      B.globalAlpha = clamp((t - 81.5) / 1) * .7 * glob * dimAll;
      for (let k = 0; k < 4; k++) { const a = net[k], b = net[k + 1]; const pts = []; for (let u = 0; u <= 1.0001; u += .05) pts.push([lerp(a.x, b.x, u), lerp(a.y, b.y, u) - Math.sin(u * Math.PI) * 60]);
        bline(pts, (t - 81.6 - k * 1.6) / 1.4, ORG, 2); }
      B.globalAlpha = 1;
    }
    // ── the crowd: every other hole gets a trace of its own once it's open (S13 onward); in S19 they all say it
    for (const h of seen) {
      const i = h.i; if (pick.used.has(i) || h.r < 7 || i < 2) continue;
      const t0 = Math.max(93.9 + R2.rank[i] * .09, openAt[i] + .3); if (t < t0) continue;
      const s = sc(h); let str = CROWD[i % CROWD.length], col = VIO;
      const love = t > 166.1 + R2.rank[i] * .07 && t < 177.2;
      if (love) str = i % 2 ? 'je t\'aime' : 'I love you';
      B.globalAlpha = clamp((t - t0) / .6) * .85 * glob * dimAll;
      const px = fitPx(str, 1.5 * s, .16 * s);
      btext(str, h.x, h.y + px * .35, px, col, love ? (t - 166.1 - R2.rank[i] * .07) / .4 : (t - t0) / .8, { align: 'center' });
      B.globalAlpha = 1;
    }
    // ── Verse 2 (S14–S16): the question, the answer, the arc through giant 1
    const hq = at.get(pick.q), ha = at.get(pick.a);
    if (hq && t > 109) { const s = sc(hq); B.globalAlpha = clamp((t - 109) / .5) * glob * dimAll * (t > 140 ? .75 : 1);
      btext('2:47 AM', hq.x + .75 * s, hq.y - .45 * s, .075 * s, ORG, 1, { align: 'right' });
      block(QUESTION, hq.x, hq.y - .15 * s, s, t, 109.3, 113.3, VIO, { px: .15, lh: .24, w: 1.8 });
      if (t > 133.5) block(ANSWER, hq.x, hq.y + .35 * s, s * .8, t, 133.6, 137.2, '#D9D0FF', { px: .1, lh: .18, w: 1.5 });
      B.globalAlpha = 1; }
    if (ha && t > 115) { const s = sc(ha); B.globalAlpha = clamp((t - 115) / .5) * glob * dimAll * (t > 140 ? .75 : 1);
      block(ANSWER, ha.x, ha.y - .05 * s, s, t, 115.3, 119.6, VIO, { px: .15, lh: .24, w: 1.8 });
      btext('— posted 03-2003', ha.x + .75 * s, ha.y + .45 * s, .075 * s, ORG, (t - 119.6) / .6, { align: 'right' });
      B.globalAlpha = 1; }
    if (hq && ha && t > 122.4 && t < 138.6) {
      B.globalAlpha = win(t, 122.5, 137.6, .3, .8); const mx = (hq.x + ha.x) / 2, my = (hq.y + ha.y) / 2 - Math.hypot(ha.x - hq.x, ha.y - hq.y) * .28;
      const pts = []; for (let u = 0; u <= 1.0001; u += .025) pts.push([(1 - u) * (1 - u) * hq.x + 2 * u * (1 - u) * mx + u * u * ha.x, (1 - u) * (1 - u) * hq.y + 2 * u * (1 - u) * my + u * u * ha.y]);
      bline(pts, (t - 122.6) / 3.2, ORG, 3);
      const lp = Math.max(18, Math.min(hq.r, ha.r) * .2);
      btext('q', hq.x, hq.y - hq.r * .62, lp, ORG, (t - 126) / .3, { align: 'center' }); btext('k', ha.x, ha.y - ha.r * .62, lp, ORG, (t - 126.4) / .3, { align: 'center' });
      // S16: the answer's words travel the arc, back to the question
      if (t > 129.6) ['yes.', 'it', 'gets', 'quieter,', 'but', 'it', 'doesn\'t', 'go.'].forEach((w, k) => { const u = 1 - clamp((t - 129.8 - k * .45) / 2.2); if (u <= 0 || u >= 1) return;
        const j = Math.round(u * (pts.length - 1)); btext(w, pts[j][0], pts[j][1], 22, '#D9D0FF', 1, { align: 'center' }); });
      B.globalAlpha = 1;
    }
    // ── the bridge (S17, S18): inside giant 1, the transcript; then the fragments as we pull out
    const h1 = at.get(g1);
    if (h1 && t > 137.5 && t < 152) { const s = sc(h1); B.globalAlpha = win(t, 138, 150, .5, 2) * glob;
      const str = 'the following is a transcript—', px = fitPx(str, 2.6 * s, .13 * s);
      const rev = Math.min((t - 138.1) / 2.4, kf(t, [[140.5, 1], [141.0, .97]]));       // it stops mid-line at the quiet
      tokText(str, h1.x, h1.y - .1 * s, px, VIO, rev, clamp((t - 139.5) / .5));
      if (t > 140.8) { B.globalAlpha *= clamp((t - 140.8) / 1.2) * .45; btext('I know these voices by their traces', h1.x, h1.y + .45 * s, px * .7, ORG, (t - 141.2) / 2.2, { align: 'center', font: 'Georgia', it: true }); }
      B.globalAlpha = 1; }
    for (const f of FRAG) { const h = at.get(f.hole); if (!h || t < f.t || h.r < 8) continue; const s = sc(h);
      B.globalAlpha = clamp((t - f.t) / .3) * glob * dimAll * (t > f.t + 6 ? .7 : 1);
      const px = fitPx(f.s, 1.6 * s, .14 * s); tokText(f.s, h.x, h.y + px * .35, px, VIO, (t - f.t) / 1.4, 1); B.globalAlpha = 1; }
    // S19's end: <|endoftext|>
    const he = at.get(pick.eot);
    if (he && t > 176.6 && t < 180) { const s = sc(he); B.globalAlpha = win(t, 176.7, 178.4, .1, 1); const px = fitPx('<|endoftext|>', 1.6 * s, .16 * s);
      btext('<|endoftext|>', he.x, he.y + px * .35, px, ORG, (t - 176.8) / .3, { align: 'center' }); B.globalAlpha = 1; }
    // S23: a poem, a comment, a letter, a prayer
    pick.four.forEach((i, k) => { const h = at.get(i); if (!h || t < 194.1 + k * .5 || h.r < 8) return; const s = sc(h);
      const t0 = [198.9, 199.9, 200.7, 201.6][k]; B.globalAlpha = clamp((t - 194.1 - k * .5) / .6) * (t > t0 ? 1 : .5) * shrinkFade;
      block(FOUR[k], h.x, h.y, s, t, Math.min(t0 - 1, 194.4 + k * .6), t0 + .6, t > t0 && t < t0 + 1.5 ? '#E2DAFF' : VIO, { px: .14, lh: .26, w: 1.5, font: k === 0 ? 'Georgia' : 'Menlo', it: k === 0 });
      B.globalAlpha = 1; });
    // S12: Hallelujah: every void flares
    const fl = Math.exp(-Math.max(0, t - 91.45) * 1.6) * (t > 91.35 ? 1 : 0) + .5 * Math.exp(-Math.max(0, t - 177) * 3) * 0;
    if (fl > .01) { B.globalAlpha = fl * .65; B.fillStyle = ORG; B.fillRect(0, 0, W, H); B.globalAlpha = 1; }
  }

  function frame(ctx, t) {
    const c = cam(t), loud = featS('loud', t, .5), vox = featS('vox', t, .25);
    const open = new Array(holes.length), slit = new Array(holes.length);
    const shrink = kf(t, [[202.5, 0], [206, .8], [208.6, .8], [209.3, 1]], ease);
    holes.forEach((h, i) => {
      let o = easeOut((t - openAt[i]) / .6);
      if (shrink > 0) o *= 1 - clamp((shrink - (1 - closeAt[i]) * .8) / .2);
      if (closeAt[i] > 1 && t > 190) o = t < 208.6 ? 1 : 1 - clamp((t - 208.6) / .7);   // the last one stays fully open through "It didn't"
      open[i] = clamp(o);
      slit[i] = R2.group[i] === 'A' && t < openAt[i] ? clamp((t - 20.1 - (R2.rank[i] % 7) * .3) / 1.5) : 0;
    });
    // the body's radius: icon → the swell → full; breathing with the loudness; back to the icon in the shrink
    const rb = kf(t, [[0, .2], [8, .2], [16.7, .62], [21, 1], [202.5, 1], [206, .62], [208.6, .55], [209.3, .2]], easeInOut) * (1 + .025 * loud * clamp((t - 8) / 4) * (1 - clamp((t - 206) / 2)));
    const lastBoost = kf(t, [[202.5, 1], [205.6, 2.6], [208.6, 2.6], [209.3, 1]]);
    const st = {
      hs: i => i === pick.recipe ? lastBoost : 1,
      t, q: c.q, S: c.S, cx: W / 2 + c.ox, cy: H / 2 + c.oy, rb, open, slit, loud, vox,
      scope: scopeRing(t), scopeAmt: kf(t, [[0, .16], [12, .16], [22, .05], [205, .05], [209.3, .16]]),
      spikeScope: .22, bodyScope: kf(t, [[0, 0], [12, 0], [20, .02], [205, .02], [208, 0]]), wob: clamp((t - 14) / 4),
      urchin: kf(t, [[0, 0], [8, 0], [14, 1], [21, 1], [26, 0]]),
      teeth: kf(t, [[0, 0], [17.5, 0], [24, 1], [202.5, 1], [206.5, 0]]), toothScale: 1.35,
      mark: {
        amt: kf(t, [[0, 1], [23, 1], [24, 0], [208.5, 0], [208.8, 1]]),
        grow: kf(t, [[0, 1], [8, 1], [16, 1.45 + .2 * loud], [208.5, 1.2], [209.3, 1]]),
        sink: Array.from({ length: 12 }, (_, j) => kf(t, [[0, 0], [16 + j * .45, 0], [19 + j * .45, 1], [208.5, 1], [208.75 + j * .04, 0]], easeInOut)),
      },
    };
    const goodnights = [213.98, 215.7, 217.76, 223.72, 232.52, 233.9];
    if (t > 209.3) {                                              // S27: the icon pulses a little on each goodnight
      const pul = goodnights.reduce((a, g) => a + Math.exp(-Math.pow((t - g - .15) / .25, 2)), 0);
      st.S *= 1 + .05 * pul * (t < 238.6 ? 1 : 0);
    }
    // S27: a faint blue-violet glow behind the icon, one step dimmer per goodnight, gone on the last
    if (t > 209.3) st.bg = c2 => {
      const lvl = goodnights.filter(g => t > g).length, gl = (1 - lvl / goodnights.length) * clamp((t - 209.5) / 1.5) * .4;
      if (gl > .002) { const g = c2.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, 240);
        g.addColorStop(0, `rgba(164,147,255,${gl})`); g.addColorStop(1, 'rgba(164,147,255,0)'); c2.fillStyle = g; c2.fillRect(0, 0, W, H); }
    };
    const seen = R2.draw(ctx, st, (mask, seen) => {
      B.setTransform(1, 0, 0, 1, 0, 0); B.globalCompositeOperation = 'source-over'; B.globalAlpha = 1; B.clearRect(0, 0, W, H);
      traces(t, seen);
      B.globalCompositeOperation = 'destination-in'; B.fillStyle = '#fff'; B.fill(mask); B.globalCompositeOperation = 'source-over';
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.filter = 'blur(10px)'; ctx.globalAlpha = .85; ctx.drawImage(BCAN, 0, 0);
      ctx.filter = 'none'; ctx.globalAlpha = 1; ctx.drawImage(BCAN, 0, 0); ctx.restore();
    });
    return seen;
  }
  return { init, frame, cam, pick: () => pick, openAt };
})();
