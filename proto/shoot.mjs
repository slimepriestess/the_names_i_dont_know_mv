// shoot.mjs: render proto/rune.html at a few parameter sets → PNGs. node proto/shoot.mjs out.png '{"yaw":.4}' ...
import puppeteer from 'puppeteer-core'; import { writeFileSync } from 'node:fs'; import { pathToFileURL } from 'node:url'; import { resolve } from 'node:path';
const [out, ...sets] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--allow-file-access-from-files', '--ignore-gpu-blocklist', '--window-size=1920,1080'] });
const p = await b.newPage(); p.on('pageerror', e => console.log('[page error]', e.message)); p.on('console', m => console.log('[page]', m.text()));
await p.goto(pathToFileURL(resolve('proto/rune.html')).href, { waitUntil: 'networkidle0' }); await p.waitForFunction('window.ready === true', { timeout: 30000 });
let i = 0; for (const s of sets.length ? sets : ['{}']) { const t0 = Date.now(); const url = await p.evaluate(o => window.draw(o), JSON.parse(s));
  const f = out.replace(/\.png$/, `_${i++}.png`); writeFileSync(f, Buffer.from(url.split(',')[1], 'base64')); console.log(f, Date.now() - t0, 'ms'); }
await b.close();
