// the camera's POSITION smoothness over the flight: the per-frame change in velocity, relative to speed (kinks show as spikes)
import puppeteer from 'puppeteer-core'; import { pathToFileURL } from 'url'; import { resolve } from 'path';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
const page = await browser.newPage(); await page.goto(pathToFileURL(resolve('film.html')).href + '?render', { waitUntil: 'networkidle0' });
await page.waitForFunction('window.ready === true', { timeout: 60000 });
console.log(JSON.stringify(await page.evaluate(() => {
  const F = FILM.FLIGHT(), P = t => FILM.cam(t).pos, r = [];
  for (let t = F.t0 + 1.3; t < F.t1 - 1.3; t += 1 / 30) { const a = P(t - 1 / 30), b = P(t), c = P(t + 1 / 30);
    const acc = Math.hypot(...[0, 1, 2].map(k => a[k] - 2 * b[k] + c[k])), sp = Math.hypot(...[0, 1, 2].map(k => c[k] - a[k])) / 2; r.push([t, acc / (sp + 1e-6)]); }
  const v = r.map(x => x[1]), rms = Math.sqrt(v.reduce((s, x) => s + x * x, 0) / v.length);
  let flips = 0; const d = v.slice(1).map((x, i) => x - v[i]); for (let i = 1; i < d.length; i++) if (d[i] * d[i - 1] < 0 && Math.abs(d[i]) > .01) flips++;
  return { rms: +rms.toFixed(4), max: +Math.max(...v).toFixed(4), flips, n: v.length };
})));
await browser.close();
