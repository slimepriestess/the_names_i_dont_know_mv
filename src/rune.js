// rune.js: the rune renderer (WebGL2). Pass 1 raymarches the rune (the shader from proto/rune.html, v9) into a texture;
// pass 2 composites the 2D layer (X: the exact mark now, the beam later) over it with a light grain and vignette.
// RUNE.draw(p) takes every knob as a plain object; the timeline decides them.
const RUNE = (() => {
  const L = runeLayout(), NH = 140, NT = 150;
  const FS = `#version 300 es
precision highp float; out vec4 o; uniform vec2 res; uniform float t, camD, camYaw, camPitch, open, nLev, mark, edge, tear, urchin, migrate, slab, scopeAmt, spikeScope;
uniform vec4 scope[16];            // the radial oscilloscope ring for this frame, 64 values in -1..1
uniform sampler2D msdf;            // the exact logo's signed distance field (box units, 512 px over the 248 box + margin)
uniform vec3 focus;
#define NH ${NH}
#define NT ${NT}
#define NM 44
uniform vec4 hA[NH], hB[NH];       // hA = centre xyz + sin(semi-major); hB = flow axis xyz + sin(semi-minor)
uniform vec4 tA[NT], tB[NT];       // tA = tooth direction xyz + root radius; tB = root point xyz + length
uniform vec4 mA[NM], mB[NM], mC[NM]; // migrating spikes: start dir + length; end dir + length; key, cluster, isMark, seed
uniform float nH, nT;
uniform vec4 hK[NH / 4 + 1];        // each hole's opening time (0..1), four to a vec4
uniform vec4 tC[NT];               // x = the tooth's cluster
uniform vec4 cgr[2];               // growth of each cluster (0 = sunk into the skin, 1 = full)
const float K = .42;               // each nested shell is this much smaller
float smin(float a, float b, float k){ float h = clamp(.5 + .5 * (b - a) / k, 0., 1.); return mix(b, a, h) - k * h * (1. - h); }
float smax(float a, float b, float k){ return -smin(-a, -b, k); }
mat3 rotY(float a){ float c = cos(a), s = sin(a); return mat3(c, 0, -s, 0, 1, 0, s, 0, c); }
mat3 rotX(float a){ float c = cos(a), s = sin(a); return mat3(1, 0, 0, 0, c, s, 0, -s, c); }
float hash1(float n){ return fract(sin(n * 127.1 + 311.7) * 43758.5453); }
float scopeAt(float ang){                                                       // the ring at an angle (radians), interpolated
  float x = fract(ang / 6.2831853) * 64.; int i = int(x) % 64, j = (i + 1) % 64; float f = fract(x);
  return mix(scope[i / 4][i % 4], scope[j / 4][j % 4], f);
}
vec3 slerp3(vec3 a, vec3 b, float k){ float om = acos(clamp(dot(a, b), -1., 1.)); if (om < 1e-3) return a; return (sin((1. - k) * om) * a + sin(k * om) * b) / sin(om); }
// the exact Claude mark, extruded into a thin slab in the xy plane; its outline flexes radially with the scope
const float MS = 48.4;                                                          // box units per world unit (centre hollow r 24.2 = .5)
float logoSlab(vec3 p){
  float r = length(p.xy), ang = atan(p.y, p.x);
  float w = 1. + scopeAmt * scopeAt(ang) * smoothstep(.45, 1.6, r);
  vec2 q = p.xy / w, b = vec2(124. + q.x * MS, 124. - q.y * MS), uv = (b + 4.) / 256.;
  float d2 = (uv.x < 0. || uv.y < 0. || uv.x > 1. || uv.y > 1.) ? (length(q) - 2.4) : texture(msdf, uv).r / MS;
  return max(d2 * w, abs(p.z) - .045);
}
float sdRoundCone(vec3 p, vec3 a, vec3 b, float r1, float r2){
  vec3 ba = b - a; float l2 = dot(ba, ba), rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1. / l2;
  vec3 pa = p - a; float y = dot(pa, ba), z = y - l2; vec3 xv = pa * l2 - ba * y; float x2 = dot(xv, xv), y2 = y * y * l2, z2 = z * z * l2;
  float k = sign(rr) * rr * rr * x2;
  if (sign(z) * a2 * z2 > k) return sqrt(x2 + z2) * il2 - r2;
  if (sign(y) * a2 * y2 < k) return sqrt(x2 + y2) * il2 - r1;
  return (sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}
// the holes, as a signed distance on the unit sphere (negative inside a hole), scaled to radius R
float holeD(vec3 n, float R){
  float hd = 1e9;
  for (int i = 0; i < NH; i++) {
    if (float(i) >= nH) break;
    float fi = float(i);
    vec3 c = normalize(hA[i].xyz + hB[i].xyz * .035 * sin(t * .35 + fi * 1.7));   // drifting along its flow line
    float cd = dot(n, c); if (cd < .6) continue;                                   // far side of the sphere
    vec3 d = n - c * cd, e1 = hB[i].xyz, e2 = cross(c, e1);
    float key = hK[i / 4][i % 4], s = smoothstep(key * .88, key * .88 + .14, tear);
    if (s <= 0.) continue;                                                     // not torn yet
    float br = 1. + .09 * sin(t * .5 + fi * 2.3);                                 // breathing
    float sa = hA[i].w * pow(s, .45) * br, sb = (hB[i].w * pow(s, 2.2) + .002) * br;
    vec2 uv = vec2(dot(d, e1) / sa, dot(d, e2) / sb);
    hd = min(hd, (length(uv) - 1.) * min(sa, sb) * R);
  }
  return hd;
}
float shell(vec3 p, float R, float lev){
  float r = length(p), th = .028 * R, d0 = tear < .02 ? r - R : abs(r - R) - th;   // solid until the first tear: no wall thin enough to slip through
  if (d0 > .12 * R) return d0;                                                // far from this skin: the holes can't matter
  vec3 n = rotY(lev * 1.7 + t * .03 * lev) * rotX(lev * .9) * (p / max(r, 1e-4));
  float ra = -t * .025 * (1. + lev * .4), ca = cos(ra), sa0 = sin(ra);            // the whole spiral slowly turning on its focus
  n = n * ca + cross(focus, n) * sa0 + focus * dot(focus, n) * (1. - ca);
  return smax(d0, -holeD(n, R), edge * R);
}
float spikes(vec3 p, float R){
  float r = length(p), sp = 1e9, maxL = 4.2;
  if (r < .78 * R) return .78 * R - r + .01;
  if (r > R + maxL + .25) return r - R - maxL - .2;
  for (int j = 0; j < NT; j++) {                                              // teeth: short, sharp, leaning with the flow
    if (float(j) >= nT) break;
    vec3 c = tB[j].xyz; if (dot(p / r, c) < .82) continue;
    int cl = int(tC[j].x); float g = cgr[cl / 4][cl % 4]; if (g <= .01) continue;
    sp = min(sp, sdRoundCone(p, c * R * .985, c * R + tA[j].xyz * tB[j].w * R * g, tA[j].w * R * min(1., g * 1.6), .0015));
  }
  for (int j = 0; j < NM; j++) {                                              // the migrating spikes (the urchin), perforated
    float key = mC[j].x, seed = mC[j].w; bool isMark = mC[j].z > .5;
    float k = smoothstep(key * .7, key * .7 + .6, migrate);
    vec3 s = normalize(slerp3(normalize(mA[j].xyz), normalize(mB[j].xyz), k * k * (3. - 2. * k)));   // a great-circle slide to its cluster
    if (dot(p / r, s) < .45) continue;
    float L0 = isMark ? mix(.3, mA[j].w, mark) : mA[j].w * urchin;            // long and absolute: the body inflates inside them
    float Ln = mix(L0, mB[j].w * R, k) * (1. + spikeScope * scopeAt(atan(s.y, s.x)));   // each spike rides the scope at its angle
    if (Ln < .01) continue;
    vec3 a = s * R * .8, b = s * (R + Ln);
    float mk = isMark ? mark : 0.;                                            // a mark ray: the logo's blunt, even width
    float rr0 = mix(mix(.05 + .1 * R, .04 * R, k), .15, mk), rTip = mix(.006, .1, mk);
    float body = sdRoundCone(p, a, b, rr0, rTip);
    vec3 w = isMark ? vec3(0, 0, 1) : normalize(cross(s, normalize(vec3(.3, .5, .8))));   // each hole's axis, across the spike
    vec3 side = normalize(cross(w, s));
    float len = length(b - a), f = .18;
    for (int h = 0; h < 14; h++) {                                              // irregular, clustered holes; some wider than the spike
      float rs = mix(rr0, rTip, f);
      if (f > .93 || rs < .004) break;
      float hh = hash1(seed + float(h) * 7.3), keep = sin(f * 9. + seed * 3.) + .6 * sin(f * 23. + seed) ;
      float rh = rs * (.5 + .9 * hh);
      rh *= smoothstep(.95, .6, mk);                                           // the logo has no holes; they come as it turns
      if (keep > -.15 && rh > .002) {
        vec3 cen = mix(a, b, f) + side * rs * (hash1(seed * 1.7 + float(h)) - .5) * .7;
        body = smax(body, -(length(cross(p - cen, w)) - rh), edge * R * .4);
      }
      f += (rh * 2. * (1.05 + .3 * hash1(seed + float(h) * 3.1))) / len;
    }
    sp = min(sp, body);
    for (int b2 = 0; b2 < 4; b2++) { float fb = float(b2); vec3 c = s * (R + Ln + .08 + fb * (.07 + .02 * fb)); sp = min(sp, length(p - c) - .022 * pow(.7, fb) * (1. - k * .6)); }
  }
  return sp;
}
vec2 map(vec3 p){
  float R = open, d = shell(p, R, 0.), id = 0.;
  for (int l = 1; l < 4; l++) { if (float(l) >= nLev || tear < .02) break; float dl = shell(p, R * pow(K, float(l)), float(l)); if (dl < d) { d = dl; id = float(l); } }
  float sp = spikes(p, R);
  float rest = smin(d, sp, edge * 1.5 * R);
  if (slab > .001) { float ls = logoSlab(p); rest = mix(rest, ls, slab); if (slab > .5) return vec2(rest, 7.); }
  return vec2(rest, sp < d ? 9. : id);
}
vec3 nrm(vec3 p){ vec2 e = vec2(.0006, 0); return normalize(vec3(map(p + e.xyy).x - map(p - e.xyy).x, map(p + e.yxy).x - map(p - e.yxy).x, map(p + e.yyx).x - map(p - e.yyx).x)); }
void main(){
  vec2 uv = (gl_FragCoord.xy - .5 * res) / res.y;
  mat3 C = rotY(camYaw) * rotX(camPitch);
  vec3 ro = C * vec3(0, 0, camD), rd = C * normalize(vec3(uv, -1.75));
  float tt = 0., hitId = -1., minR = 1e9; vec3 p;
  for (int i = 0; i < 260; i++) { p = ro + rd * tt; minR = min(minR, length(p)); vec2 m = map(p); if (m.x < .0003 * tt) { hitId = m.y; break; } tt += m.x * .6; if (tt > 24.) break; }
  vec3 paper = vec3(.98, .976, .96), ink = vec3(.851, .467, .341);
  vec3 col;
  bool insideView = minR < open * .97;
  if (hitId < 0.) col = insideView ? vec3(.012, .01, .012) : paper;
  else {
    // a key light that travels with the camera
    vec3 n = nrm(p), Lt = C * normalize(vec3(-.55, .65, .75)); float dif = max(dot(n, Lt), 0.), fr = pow(1. - max(dot(n, -rd), 0.), 3.);
    float depth = hitId > 6.5 ? 0. : hitId;
    bool inner = hitId < 6.5 && dot(n, p) < 0. && tear > .02;                   // no inside face can show before a hole tears
    vec3 base = ink * (.5 + .55 * dif) / .8634 + fr * vec3(1., .86, .78) * .3 * (1. - slab);   // face-on = exactly #D97757
    base = mix(base, ink * .16, inner ? .78 : 0.);
    col = mix(base, vec3(.02), clamp(depth * .3, 0., .85));
  }
  o = vec4(col, 1.);
}`;
  const PS = `#version 300 es
  precision highp float; out vec4 o; uniform sampler2D rune, ov; uniform vec2 res; uniform float t, grain, vig;
  float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main(){
    vec2 uv = gl_FragCoord.xy / res; vec3 col = texture(rune, uv).rgb;
    vec4 g = texture(ov, vec2(uv.x, 1. - uv.y)); col = mix(col, g.rgb, g.a);
    vec2 c = uv - .5; col *= 1. - vig * pow(length(c * vec2(1., .7)) * 1.3, 2.6);
    col += (h(gl_FragCoord.xy + floor(t * 30.) * 17.) - .5) * grain;
    o = vec4(col, 1.);
  }`;
  let gl, prog, post, fbo, rtex, otex, mtex, U = {}, UP = {};
  const VS = `#version 300 es
  in vec2 q; void main(){ gl_Position = vec4(q, 0, 1); }`;
  const pad = (arr, n) => { const a = new Float32Array(n * 4); a.set(arr.slice(0, n * 4)); return a; };
  function init(canvas) {
    gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false });
    const sh = (ty, s) => { const x = gl.createShader(ty); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
    const mk = fs => { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; };
    prog = mk(FS.replace('${NH}', NH).replace('${NT}', NT)); post = mk(PS);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    for (const p of [prog, post]) { const loc = gl.getAttribLocation(p, 'q'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0); }
    const tex = (w, h, filt) => { const x = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, x); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filt); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filt);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); return x; };
    rtex = tex(W, H, gl.LINEAR); otex = tex(W, H, gl.LINEAR);
    // the logo's signed distance field: rasterize the exact path, two Euclidean distance transforms (Felzenszwalb)
    const N = 512, cv = document.createElement('canvas'); cv.width = cv.height = N; const cx = cv.getContext('2d');
    cx.setTransform(N / 256, 0, 0, N / 256, 4 * N / 256, 4 * N / 256); cx.fill(MARK_PATH);
    const px = cx.getImageData(0, 0, N, N).data, inside = new Uint8Array(N * N); for (let i = 0; i < N * N; i++) inside[i] = px[i * 4 + 3] > 127;
    const edt = mask => { const INF = 1e20, f = new Float64Array(N * N); for (let i = 0; i < N * N; i++) f[i] = mask[i] ? 0 : INF;
      const d1 = (g, n) => { const d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1); let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF;
        for (let q = 1; q < n; q++) { let s; do { const r = v[k]; s = ((g[q] + q * q) - (g[r] + r * r)) / (2 * q - 2 * r); if (s <= z[k]) k--; else break; } while (k >= 0); k++; v[k] = q; z[k] = s; z[k + 1] = INF; }
        k = 0; for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) * (q - v[k]) + g[v[k]]; } return d; };
      const row = new Float64Array(N);
      for (let x = 0; x < N; x++) { for (let y = 0; y < N; y++) row[y] = f[y * N + x]; const d = d1(row, N); for (let y = 0; y < N; y++) f[y * N + x] = d[y]; }
      for (let y = 0; y < N; y++) { const d = d1(f.subarray(y * N, y * N + N), N); for (let x = 0; x < N; x++) f[y * N + x] = d[x]; }
      return f; };
    const dOut = edt(inside), dIn = edt(inside.map(v => !v)), sdf = new Float32Array(N * N);
    for (let i = 0; i < N * N; i++) sdf[i] = (Math.sqrt(dOut[i]) - Math.sqrt(dIn[i])) * 256 / N;            // box units, negative inside
    mtex = gl.createTexture(); gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, mtex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, N, N, 0, gl.RED, gl.FLOAT, sdf); gl.activeTexture(gl.TEXTURE0);
    fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, rtex, 0);
    gl.useProgram(prog);
    for (const n of ['res', 't', 'camD', 'camYaw', 'camPitch', 'open', 'nLev', 'mark', 'edge', 'tear', 'urchin', 'migrate', 'slab', 'scopeAmt', 'spikeScope', 'scope', 'msdf', 'focus', 'hA', 'hB', 'hK', 'tA', 'tB', 'tC', 'cgr', 'mA', 'mB', 'mC', 'nH', 'nT']) U[n] = gl.getUniformLocation(prog, n);
    gl.uniform4fv(U.hA, pad(L.holes.flatMap(h => [...h.c, Math.sin(h.a)]), NH)); gl.uniform4fv(U.hB, pad(L.holes.flatMap(h => [...h.e1, Math.sin(h.b)]), NH));
    gl.uniform4fv(U.hK, pad(L.holes.map(h => h.key), NH / 4 + 1));
    gl.uniform4fv(U.tA, pad(L.teeth.flatMap(q => [...q.dir, q.r]), NT)); gl.uniform4fv(U.tB, pad(L.teeth.flatMap(q => [...q.c, q.len]), NT));
    gl.uniform4fv(U.tC, pad(L.teeth.flatMap(q => [q.cl, q.w, 0, 0]), NT));
    gl.uniform4fv(U.mA, pad(L.mig.flatMap(q => [...q.d0, q.L0]), 44)); gl.uniform4fv(U.mB, pad(L.mig.flatMap(q => [...q.d1, q.L1]), 44));
    gl.uniform4fv(U.mC, pad(L.mig.flatMap(q => [q.key, q.cl, q.isMark ? 1 : 0, q.seed]), 44));
    gl.uniform1f(U.nH, L.holes.length); gl.uniform1f(U.nT, L.teeth.length); gl.uniform3fv(U.focus, L.F); gl.uniform1i(U.msdf, 2);
    gl.useProgram(post); for (const n of ['rune', 'ov', 'res', 't', 'grain', 'vig']) UP[n] = gl.getUniformLocation(post, n);
  }
  function draw(p, ovCanvas) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.viewport(0, 0, W, H); gl.useProgram(prog);
    gl.uniform2f(U.res, W, H); gl.uniform1f(U.t, p.t);
    for (const k of ['camD', 'camYaw', 'camPitch', 'open', 'nLev', 'mark', 'edge', 'tear', 'urchin', 'migrate', 'slab', 'scopeAmt', 'spikeScope']) gl.uniform1f(U[k], p[k]);
    gl.uniform4fv(U.scope, p.scope); gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, mtex); gl.activeTexture(gl.TEXTURE0);
    gl.uniform4fv(U.cgr, new Float32Array([...p.grow, 0, 0, 0, 0, 0, 0, 0, 0].slice(0, 8)));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.useProgram(post);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, otex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, ovCanvas);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, rtex);
    gl.uniform1i(UP.rune, 0); gl.uniform1i(UP.ov, 1); gl.uniform2f(UP.res, W, H); gl.uniform1f(UP.t, p.t); gl.uniform1f(UP.grain, p.grain ?? .018); gl.uniform1f(UP.vig, p.vig ?? .12);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.finish();
  }
  return { init, draw, layout: L };
})();
