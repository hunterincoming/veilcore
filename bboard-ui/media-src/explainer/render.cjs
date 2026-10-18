// usage: node render.js snap t1 t2 ... (writes snaps/snap_<t>.png)
//        node render.js all            (renders frames/ then encodes)
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { chromium } = require('playwright'); // the repository's own (npm ci at the root)
const DIR = __dirname;
const LANG = process.env.VIDEO_LANG || 'en';
const URL = 'file://' + path.join(DIR, 'explainer.html') + (LANG === 'en' ? '' : `?lang=${LANG}`);
const FPS = 30;

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto(URL);
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.evaluate(() => Promise.all([...document.fonts].map(f => f.load())));
  return page;
}

(async () => {
  const mode = process.argv[2];
  const browser = await chromium.launch();
  if (mode === 'snap') {
    fs.mkdirSync(path.join(DIR, 'snaps'), { recursive: true });
    const page = await openPage(browser);
    for (const ts of process.argv.slice(3)) {
      const t = parseFloat(ts);
      await page.evaluate(t => render(t), t);
      await page.screenshot({ path: path.join(DIR, 'snaps', `snap_${LANG}_${ts}.png`) });
    }
  } else if (mode === 'poster') {
    const page = await openPage(browser);
    await page.evaluate(t => render(t), parseFloat(process.argv[3]));
    await page.screenshot({ path: path.join(DIR, LANG === 'en' ? 'veilcore-walkthrough.jpg' : `veilcore-walkthrough.${LANG}.jpg`), type: 'jpeg', quality: 92 });
  } else if (mode === 'all') {
    const fdir = path.join(DIR, LANG === 'en' ? 'frames' : `frames-${LANG}`);
    fs.mkdirSync(fdir, { recursive: true });
    const dur = await (await openPage(browser)).evaluate(() => window.DUR);
    const N = Math.round(dur * FPS);
    const W = parseInt(process.argv[3] || '3');
    const t0 = Date.now();
    let done = 0;
    await Promise.all([...Array(W)].map(async (_, w) => {
      const page = await openPage(browser);
      for (let f = w; f < N; f += W) {
        if (fs.existsSync(path.join(fdir, `frame_${String(f).padStart(5, '0')}.png`))) continue;
        await page.evaluate(t => render(t), f / FPS);
        await page.screenshot({ path: path.join(fdir, `frame_${String(f).padStart(5, '0')}.png`) });
        if (++done % 150 === 0) console.log(done, '/', N, ((Date.now() - t0) / 1000).toFixed(0) + 's');
      }
    }));
    console.log('frames done', N);
  }
  await browser.close();
})();
