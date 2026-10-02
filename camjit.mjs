// measures the camera's frame-to-frame rotation over the flythrough: jitter = the frame-to-frame CHANGE in angular speed
import puppeteer from 'puppeteer-core'; import { pathToFileURL } from 'url'; import { resolve } from 'path';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
const page = await browser.newPage();
await page.goto(pathToFileURL(resolve('film.html')).href + '?render', { waitUntil: 'networkidle0' });
await page.waitForFunction('window.ready === true', { timeout: 60000 });
const r = await page.evaluate(() => {
  const F = FILM.FLIGHT(), fw = t => { const q = FILM.cam(t).q; return qRot(qConj(q), [0, 0, -1]); };
  const ang = (a, b) => Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));
  const w = []; let prev = fw(F.t0 - 1 / 30);
  for (let t = F.t0; t <= F.t1 + 1e-6; t += 1 / 30) { const f = fw(t); w.push([t, ang(prev, f) * 30 * 180 / Math.PI]); prev = f; }
  const jerk = w.slice(1).map((x, i) => [x[0], Math.abs(x[1] - w[i][1])]);
  const rms = Math.sqrt(jerk.reduce((s, x) => s + x[1] * x[1], 0) / jerk.length), worst = jerk.slice().sort((a, b) => b[1] - a[1]).slice(0, 5);
  const pj = t => { const a = FILM.cam(t - 1 / 30), b = FILM.cam(t); return [ang(qRot(qConj(a.q), [0, 0, -1]), qRot(qConj(b.q), [0, 0, -1])) * 180 / Math.PI, Math.hypot(...a.pos.map((v, k) => v - b.pos[k]))]; };
  return { rms, worst: worst.slice(0, 2), maxWat: w.reduce((m, x) => x[1] > m[1] ? x : m), atT0: [pj(F.t0 - 1 / 30), pj(F.t0), pj(F.t0 + 1 / 30)], atT1: [pj(F.t1), pj(F.t1 + 1 / 30), pj(F.t1 + 2 / 30)] };
});
console.log(JSON.stringify(r)); await browser.close();
