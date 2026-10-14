#!/usr/bin/env node
// A short screen recording of the public test site, made with one command:
//
//   cd ~/Desktop/veilcore/bboard-ui && npm run record:walkthrough
//
// Two phones: a breeder logs a plant (date stamped on the test network), saves and checks
// the backup, shares one link; someone checking opens it and asks for proof by link; the
// breeder taps Prove it; the checker's page confirms it against the network. Captions are
// drawn into the page; long waits are cut out afterwards with ffmpeg.
//
// Each phone is filmed frame by frame through Chromium's screencast, every frame stamped with
// the time it was drawn. Playwright's own recordVideo was tried first: it writes every frame
// for at least 1/25 s, so a busy page (spinners, scrolling) runs long and the two phones
// drifted apart by seconds; with the frames' own times the cuts and the side-by-side line up.
//
// It sends 2 transactions on the test network (the date stamp and the proof), fees paid by
// VeilCore's sponsor. Nothing is ever retried: a second on-chain action is worse than
// stopping, so any failure stops with a screenshot and the step in plain words.
//
// Settings (all optional):
//   SITE=https://test.veilcore.org      the site to record
//   OUT=~/Desktop/veilcore-recording    where the video goes (raw recordings in OUT/raw)
//   EDIT_ONLY=1                         re-edit the last raw recordings, record nothing
//   DRY_RUN=1                           for testing without a network (see dryRun below)
//
// Not a test: playwright.config.ts only picks up *.spec.ts files.
// SPDX-License-Identifier: Apache-2.0

import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);

// --- settings ---------------------------------------------------------------------------

const home = (p) => (p.startsWith('~') ? path.join(os.homedir(), p.slice(1)) : p);
const SITE = (process.env.SITE || 'https://test.veilcore.org').replace(/\/+$/, '');
const OUT = path.resolve(home(process.env.OUT || path.join(os.homedir(), 'Desktop', 'veilcore-recording')));
const RAW = path.join(OUT, 'raw');
const EDIT_ONLY = process.env.EDIT_ONLY === '1';
// DRY_RUN=1 is for checking this script where the network can't be reached: everything but
// the site and its registry (DRY_RUN_REGISTRY) is blocked; when the date stamp fails it
// uses "Do the date stamp later" and puts a made-up date stamp in the browser, as the
// browser tests do (e2e/flow.spec.ts), so the share link, the checker's request and the
// holder's prove page can still be recorded and edited. Never for a real recording.
const DRY_RUN = process.env.DRY_RUN === '1';
const DRY_RUN_REGISTRY = process.env.DRY_RUN_REGISTRY || 'http://127.0.0.1:8790';

const PLANT = 'Harbour Mist';
const BRED_BY = 'Example Breeding Co.';
const CHECKER_NAME = 'Example Lab';

const MIN = 60_000;
const STAMP_WAIT = 6 * MIN; // about a minute on 12 Oct; the network can be slow
const PROVE_WAIT = 6 * MIN;
const CONFIRM_WAIT = 6 * MIN;

// Waits longer than this are cut out of the video, keeping a little either side.
const CUT_OVER = 8_000;
const KEEP_BEFORE = 2_500;
const KEEP_AFTER = 1_500;

const VIEW = { width: 390, height: 844 };
const BG = '#F5F6F2';

const CAPTIONS = {
  log: 'Log a plant. Only a fingerprint leaves your device.',
  stamp: 'The date stamp goes on Midnight’s test network.',
  backup: 'Save your backup, and check it opens.',
  share: 'Choose what others see, and share one link.',
  ask: 'Someone checking asks you to prove it, with a link.',
  tap: 'You tap once.',
  check: 'Their page checks the network itself.',
  end: 'Test network: records here are practice, not evidence.',
};

const say = (s) => console.log(s);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- what the viewer sees on top of the page --------------------------------------------

/** Runs in the page on every load: a caption card at the bottom, a tap marker, a "later" tag. */
function overlay({ label }) {
  const KEY = 'veilcore-recording-caption';
  const font = '"Space Grotesk", Inter, system-ui, -apple-system, sans-serif';
  const draw = () => {
    if (document.getElementById('vc-rec-bar')) return;
    const style = document.createElement('style');
    // Room under the page's last button, so it can scroll clear of the caption.
    style.textContent =
      'body{padding-bottom:120px !important;background:#F5F6F2 !important}' +
      '@keyframes vcRecTap{from{transform:translate(-50%,-50%) scale(.4);opacity:.55}to{transform:translate(-50%,-50%) scale(1.25);opacity:0}}';
    document.head.appendChild(style);
    const bar = document.createElement('div');
    bar.id = 'vc-rec-bar';
    bar.setAttribute('aria-hidden', 'true');
    bar.style.cssText =
      'position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483646;pointer-events:none;' +
      'background:#fff;color:#16201B;border:1px solid #DADFD8;border-radius:14px;' +
      'padding:10px 14px 12px;box-shadow:0 6px 24px rgba(22,32,27,.10);font-family:' +
      font;
    const who = document.createElement('div');
    who.textContent = label;
    who.style.cssText = 'font-size:11px;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:#5B6B62;';
    const text = document.createElement('div');
    text.id = 'vc-rec-text';
    text.style.cssText = 'font-size:17px;line-height:1.3;font-weight:500;margin-top:3px;';
    const later = document.createElement('div');
    later.id = 'vc-rec-later';
    later.style.cssText =
      'position:absolute;left:0;bottom:calc(100% + 8px);display:none;background:#16201B;color:#fff;' +
      'border-radius:999px;padding:4px 11px;font-size:13px;font-weight:500;';
    bar.append(who, text, later);
    document.documentElement.appendChild(bar);
    show(sessionStorage.getItem(KEY) || '');
  };
  const show = (t) => {
    const el = document.getElementById('vc-rec-text');
    if (!el) return;
    el.textContent = t;
    el.style.display = t ? 'block' : 'none';
  };
  window.__vcRec = {
    set(t) {
      try {
        sessionStorage.setItem(KEY, t);
      } catch {
        /* the caption still shows on this page */
      }
      draw();
      show(t);
    },
    later(t, ms) {
      draw();
      const el = document.getElementById('vc-rec-later');
      el.textContent = t;
      el.style.display = 'block';
      setTimeout(() => (el.style.display = 'none'), ms);
    },
    tap(x, y) {
      const d = document.createElement('div');
      d.style.cssText =
        `position:fixed;left:${x}px;top:${y}px;width:46px;height:46px;border-radius:50%;` +
        'background:rgba(22,32,27,.35);z-index:2147483647;pointer-events:none;animation:vcRecTap .45s ease-out forwards;';
      document.documentElement.appendChild(d);
      setTimeout(() => d.remove(), 600);
    },
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', draw);
  else draw();
}

/** After a new screen: back to its top, as a person would see it. */
const toTop = async (page) => {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' })).catch(() => undefined);
  await sleep(500);
};

const caption = (page, text) => page.evaluate((t) => window.__vcRec?.set(t), text).catch(() => undefined);

/** Click as a person would: bring it into view, show the tap, pause a beat. */
const tap = async (page, locator, pause = 900) => {
  await locator.scrollIntoViewIfNeeded();
  await sleep(350);
  const box = await locator.boundingBox();
  if (box) await page.evaluate(([x, y]) => window.__vcRec?.tap(x, y), [box.x + box.width / 2, box.y + box.height / 2]);
  await sleep(150);
  await locator.click();
  await sleep(pause);
};

const type = async (locator, text) => {
  await locator.click();
  await locator.pressSequentially(text, { delay: 55 });
  await sleep(500);
};

// --- the run ----------------------------------------------------------------------------

/** A stop the person can act on: what happened, in plain words. */
class Stop extends Error {}

const timeline = { site: SITE, dryRun: DRY_RUN, cuts: [] };
let step = 'Starting';
const films = {};

/**
 * Film a page: each screencast frame is saved as a JPEG with the time it was drawn (at most
 * 30 a second). During a long wait (`slow`), frames that will be cut are thinned to two a
 * second as they age, so minutes of spinner don't fill the disk.
 */
const film = async (ctx, page, who) => {
  const dir = path.join(RAW, who);
  fs.mkdirSync(dir, { recursive: true });
  const cdp = await ctx.newCDPSession(page);
  const frames = [];
  let n = 0;
  let held;
  let timer;
  let stopped = false;
  let slowFrom = 0;
  let thinned = 0;
  const thin = () => {
    const lo = slowFrom + KEEP_BEFORE + 500;
    const hi = Date.now() - 3_000;
    let kept = -Infinity;
    for (; thinned < frames.length - 1 && frames[thinned].t < hi; thinned++) {
      const fr = frames[thinned];
      if (fr.t < lo) continue;
      if (fr.t - kept < 500) {
        fs.rmSync(path.join(dir, fr.f), { force: true });
        fr.gone = true;
      } else kept = fr.t;
    }
  };
  const write = ({ t, data }) => {
    const f = `${String(n++).padStart(6, '0')}.jpg`;
    fs.writeFileSync(path.join(dir, f), data);
    frames.push({ t, f });
    if (slowFrom) thin();
  };
  cdp.on('Page.screencastFrame', (e) => {
    cdp.send('Page.screencastFrameAck', { sessionId: e.sessionId }).catch(() => undefined);
    if (stopped) return;
    const fr = {
      t: e.metadata?.timestamp ? e.metadata.timestamp * 1000 : Date.now(),
      data: Buffer.from(e.data, 'base64'),
    };
    clearTimeout(timer);
    held = undefined;
    if (fr.t - (frames.at(-1)?.t ?? -Infinity) >= 33) write(fr);
    else {
      // Too soon after the last one: keep it in case nothing follows (the end of a scroll).
      held = fr;
      timer = setTimeout(() => held && (write(held), (held = undefined)), 40);
    }
  });
  const start = () =>
    cdp.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 88,
      maxWidth: VIEW.width * 2,
      maxHeight: VIEW.height * 2,
    });
  await start();
  // A page load can swap the page's renderer; asking again keeps the frames coming.
  page.on('framenavigated', (fr) => fr === page.mainFrame() && !stopped && void start().catch(() => undefined));
  films[who] = {
    slow: (on) => {
      slowFrom = on ? Date.now() : 0;
      thinned = 0;
    },
    stop: async () => {
      await cdp.send('Page.stopScreencast').catch(() => undefined);
      clearTimeout(timer);
      if (held) write(held);
      stopped = true;
      return { dir, frames: frames.filter((fr) => !fr.gone).map((fr) => [fr.t, fr.f]) };
    },
  };
};

/** A long wait begins: both phones thin out what will be cut. */
const waiting = () => {
  for (const f of Object.values(films)) f.slow(true);
  return Date.now();
};

/** Wait until one of the outcomes is on screen; returns its name, or throws Stop on timeout. */
const waitFor = async (outcomes, ms, slow) => {
  const until = Date.now() + ms;
  let nextNote = Date.now() + 30_000;
  for (;;) {
    for (const [name, loc] of Object.entries(outcomes)) {
      if (
        await loc
          .first()
          .isVisible()
          .catch(() => false)
      )
        return name;
    }
    if (Date.now() > until) throw new Stop(slow);
    if (Date.now() > nextNote) {
      say(`  still waiting (${Math.round((Date.now() + ms - until) / 1000)} s so far)…`);
      nextNote += 30_000;
    }
    await sleep(500);
  }
};

const laterText = (ms) => {
  const s = ms / 1000;
  if (s < 55) return `…${Math.max(10, Math.round(s / 5) * 5)} seconds later`;
  const m = Math.round(s / 60);
  return m <= 1 ? '…about a minute later' : `…about ${m} minutes later`;
};

/** A wait has ended: if it was long, cut it from the video and say how long it took. */
const waited = async (page, from) => {
  const to = Date.now();
  for (const f of Object.values(films)) f.slow(false);
  if (to - from > CUT_OVER) {
    timeline.cuts.push([from + KEEP_BEFORE, to - KEEP_AFTER]);
    await page.evaluate((t) => window.__vcRec?.later(t, 3000), laterText(to - from)).catch(() => undefined);
  }
};

const fail = (what) => {
  throw new Stop(what);
};

const run = async () => {
  let pw;
  try {
    pw = require('@playwright/test');
  } catch {
    try {
      pw = require('playwright');
    } catch {
      fail('Playwright is missing. In the veilcore folder, run: npm install');
    }
  }

  say(`Recording ${SITE}`);
  if (!DRY_RUN)
    say('This sends 2 practice transactions on the test network (VeilCore’s sponsor pays). About 5–10 minutes.');

  step = 'Opening the site';
  try {
    const r = await fetch(`${SITE}/records`, { signal: AbortSignal.timeout(20_000) });
    if (!r.ok) fail(`${SITE} answered ${r.status}. Check the address and try again later.`);
  } catch (e) {
    if (e instanceof Stop) throw e;
    fail(`Can't reach ${SITE}. Check the internet connection and try again.`);
  }

  step = 'Starting the recording browser';
  let browser;
  try {
    browser = await pw.chromium.launch();
  } catch (e) {
    if (/Executable doesn't exist|playwright install/i.test(String(e?.message ?? e))) {
      fail(
        'The recording browser isn’t installed yet. Run this once, then run the recording again:\n\n  npx playwright install chromium\n',
      );
    }
    throw e;
  }

  fs.rmSync(RAW, { recursive: true, force: true });
  fs.mkdirSync(RAW, { recursive: true });
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'veilcore-rec-'));
  const pages = {};
  const contexts = [];

  const phone = async (who, label, url) => {
    const ctx = await browser.newContext({
      viewport: VIEW,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      colorScheme: 'light',
      locale: 'en-US',
      acceptDownloads: true,
    });
    contexts.push(ctx);
    await ctx.addInitScript(overlay, { label });
    if (DRY_RUN) {
      const allowed = new Set([new URL(SITE).origin, new URL(DRY_RUN_REGISTRY).origin]);
      await ctx.route('**/*', (route) =>
        allowed.has(new URL(route.request().url()).origin) ? route.continue() : route.abort(),
      );
    }
    const start = Date.now();
    const page = await ctx.newPage();
    pages[who] = page;
    timeline[who] = { start };
    await page.goto(url);
    await film(ctx, page, who);
    return page;
  };

  try {
    // 1. The breeder logs a plant.
    step = 'Logging a plant';
    say('Logging a plant…');
    const b = await phone('breeder', 'Breeder', `${SITE}/records`);
    const role = b.getByRole('button', { name: /I breed or hold genetics/ });
    const start = b.getByText('Start', { exact: true });
    await waitFor({ role, start }, 30_000, 'The site opened but the first screen never showed.');
    timeline.breeder.shown = Date.now();
    await caption(b, CAPTIONS.log);
    await sleep(1200);
    if (await role.isVisible()) await tap(b, role);
    await tap(b, start);
    const nameBox = b.getByLabel(/Plant or line name/);
    await nameBox.waitFor({ timeout: 30_000 });
    await type(nameBox, PLANT);
    await type(b.getByLabel(/Bred by/), BRED_BY);
    await tap(b, b.getByRole('button', { name: 'Next: check it' }));
    await b.getByText('Is this right?').waitFor({ timeout: 15_000 });
    await sleep(800);

    step = 'Date stamping the plant';
    const seal = b.getByRole('button', { name: 'Seal it and date stamp it' });
    if (!(await seal.isVisible().catch(() => false))) {
      fail(
        'This site isn’t set up to add date stamps right now (there is no "Seal it and date stamp it" button). Nothing was sent.',
      );
    }
    await caption(b, CAPTIONS.stamp);
    await sleep(700);
    await tap(b, seal, 300);
    await toTop(b);
    say('Waiting for the date stamp (can take a few minutes)…');
    const stampFrom = waiting();
    const stamp = await waitFor(
      {
        done: b.getByText('Date stamped', { exact: true }),
        // The screen shows plain words; the raw error is on the alert's data-error.
        error: b.locator('[data-error]').first(),
        notReady: b.getByText(/Its public date stamp comes when its batch is dated/),
        backupFirst: b.getByText('Save your backup first'),
      },
      STAMP_WAIT,
      `The date stamp didn't arrive within ${STAMP_WAIT / MIN} minutes. Nothing was retried. The test network may be slow: try again later.`,
    );
    if (stamp === 'error' && DRY_RUN) {
      say('  (dry run: no network here, so using "Do the date stamp later")');
      await waited(b, stampFrom);
      await sleep(1500);
      await tap(b, b.getByRole('button', { name: 'Do the date stamp later' }));
      await toTop(b);
    } else if (stamp === 'error') {
      const box = b.locator('[data-error]').first();
      const why = ((await box.getAttribute('data-error')) || (await box.innerText())).trim();
      fail(`The date stamp didn't go through. The site said: "${why}" Nothing was retried, so nothing was sent twice.`);
    } else if (stamp === 'notReady') {
      fail(
        'The site sealed the plant but isn’t set up to send the date stamp itself. Nothing was sent to the network.',
      );
    } else if (stamp === 'backupFirst') {
      fail(
        'The recording browser won’t keep data, so the site asked for the backup first. This shouldn’t happen: tell Claude.',
      );
    } else {
      await waited(b, stampFrom);
      say('  Date stamped.');
      await sleep(2500);
      await tap(b, b.getByRole('button', { name: 'Next', exact: true }));
      await toTop(b);
    }
    await tap(b, b.getByRole('button', { name: 'No report yet: skip' }));
    await toTop(b);

    // The backup: save it, then open the saved copy.
    step = 'Saving the backup';
    say('Saving the backup and checking it opens…');
    await caption(b, CAPTIONS.backup);
    await sleep(1200);
    const saveBtn = b.getByRole('button', { name: 'Save backup file' });
    await saveBtn.scrollIntoViewIfNeeded();
    const [download] = await Promise.all([b.waitForEvent('download', { timeout: 20_000 }), tap(b, saveBtn, 300)]);
    const backupFile = path.join(scratch, download.suggestedFilename() || 'backup.json');
    await download.saveAs(backupFile);
    await sleep(900);
    step = 'Checking the backup opens';
    const openBtn = b.getByRole('button', { name: 'Open my saved copy' });
    const [chooser] = await Promise.all([b.waitForEvent('filechooser', { timeout: 20_000 }), tap(b, openBtn, 200)]);
    await chooser.setFiles(backupFile);
    await b.getByText('It works.', { exact: true }).waitFor({ timeout: 20_000 });
    await sleep(1600);
    await tap(b, b.getByRole('button', { name: 'Finish', exact: true }));
    await b.waitForURL(/\/record\//, { timeout: 20_000 });
    await toTop(b);
    await sleep(1500);

    if (DRY_RUN) {
      // What the network would have done (as e2e/flow.spec.ts does): a made-up date stamp.
      await b.evaluate(() => {
        const all = JSON.parse(localStorage.getItem('veilcore.record-keys.v1') ?? '{}');
        const id = Object.keys(all)[0];
        const tx = 'a8'.repeat(32);
        all[id].anchor = {
          identity: 'e2'.repeat(32),
          network: 'preview',
          contractAddress: '0'.repeat(64),
          txId: tx,
          txHash: tx,
          blockHeight: 1,
        };
        localStorage.setItem('veilcore.record-keys.v1', JSON.stringify(all));
      });
      await b.reload();
      await sleep(800);
    }

    // 2. Share one link.
    step = 'Making the share link';
    say('Making the share link…');
    await caption(b, CAPTIONS.share);
    await tap(b, b.getByRole('button', { name: /Show someone/ }));
    await toTop(b);
    await tap(b, b.getByRole('button', { name: 'Get the link' }), 600);
    const linkBox = b.locator('input[readonly]').first();
    await linkBox.waitFor({ timeout: 20_000 });
    const ask = b.getByLabel('Let them check the date stamp and ask me to prove I hold it');
    if (!(await ask.isVisible().catch(() => false))) {
      fail('The share link doesn’t offer "ask me to prove I hold it", so the plant has no date stamp in this browser.');
    }
    if (!(await ask.isChecked())) await tap(b, ask);
    await linkBox.scrollIntoViewIfNeeded();
    const link = new URL(await linkBox.inputValue());
    if (!link.searchParams.get('chain')) fail('The share link doesn’t carry the date stamp.');
    await sleep(2500);
    timeline.shareDone = Date.now();

    // 3. Someone checking opens it and asks for proof by link.
    step = 'Opening the link as the checker';
    say('Opening the link as someone checking…');
    await caption(b, '');
    const c = await phone('checker', 'Checker', `${SITE}${link.pathname}${link.search}`);
    await c.getByText(PLANT).first().waitFor({ timeout: 30_000 });
    timeline.checker.shown = Date.now();
    await caption(c, CAPTIONS.ask);
    await sleep(2000);
    step = 'Asking for proof by link';
    const askHeading = c.getByRole('heading', { name: 'Ask them to prove they hold it' });
    await askHeading
      .waitFor({ timeout: 20_000 })
      .catch(() => fail('The checker’s page doesn’t offer "Ask them to prove they hold it".'));
    await askHeading.evaluate((el) => el.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    await sleep(1400);
    await type(c.getByLabel(/Your name or business/), CHECKER_NAME);
    await tap(c, c.getByRole('button', { name: 'Make a link to send them' }), 600);
    const proveText = c.getByText(/\/prove\/PR-/).first();
    await proveText.waitFor({ timeout: 20_000 });
    // The id, and the answer token in the link's fragment: without it the answer can't go back.
    const [, id, token] = /\/prove\/(PR-[0-9A-F]{32})#t=([A-Za-z0-9_-]{22})/.exec(await proveText.innerText()) ?? [];
    if (!id || !token) fail('The checker’s page made a link that doesn’t look right.');
    await proveText.scrollIntoViewIfNeeded();
    await sleep(2200);

    // 4. The breeder opens it and proves.
    step = 'Opening the prove link as the breeder';
    say('Opening the prove link as the breeder…');
    await caption(c, '');
    await caption(b, CAPTIONS.tap);
    await b.goto(`${SITE}/prove/${id}#t=${token}`);
    const proveBtn = b.getByRole('button', { name: 'Prove it', exact: true });
    const which = await waitFor(
      {
        prove: proveBtn,
        other: b.getByText(/Someone wants you to prove|request has ended|Can’t open this|missing its last part/),
      },
      30_000,
      'The prove link didn’t open on the breeder’s phone.',
    );
    if (which === 'other') fail('The prove link opened, but not as the plant’s holder.');
    await sleep(2200);
    step = 'Proving';
    if (!DRY_RUN) say('Proving (can take a few minutes)…');
    await tap(b, proveBtn, 300);
    const proveFrom = waiting();
    const proved = await waitFor(
      {
        done: b.getByRole('heading', { name: 'Done', exact: true }),
        notSent: b.getByText(/Proved, but the answer didn.t send/),
        error: b.locator('[data-error]').first(),
      },
      PROVE_WAIT,
      `The proof didn't finish within ${PROVE_WAIT / MIN} minutes. Nothing was retried.`,
    );
    await waited(b, proveFrom);
    if (proved === 'error' && DRY_RUN) {
      say('  (dry run: no network here, so the proof failed, as expected)');
    } else if (proved === 'error') {
      const box = b.locator('[data-error]').first();
      const why = ((await box.getAttribute('data-error')) || (await box.innerText())).trim();
      fail(`The proof didn't go through. The site said: "${why}" Nothing was retried.`);
    } else if (proved === 'notSent') {
      fail('The proof went on the network, but the answer didn’t reach the checker’s page. Nothing was retried.');
    } else {
      say('  Proved.');
    }
    await sleep(2000);

    // 5. The checker's page checks it on the network.
    step = 'Waiting for the checker’s page to confirm';
    await caption(b, '');
    await caption(c, CAPTIONS.check);
    const checkFrom = waiting();
    if (DRY_RUN) {
      say('  (dry run: no answer can arrive; holding on the waiting screen)');
      await sleep(12_000);
      await waited(c, checkFrom);
    } else {
      say('Waiting for the checker’s page to confirm it…');
      const seen = await waitFor(
        {
          ok: c.getByText('Confirmed', { exact: true }),
          refused: c.getByText(/didn.t check out/),
          expired: c.getByText(/expired without an answer/),
        },
        CONFIRM_WAIT,
        `The checker's page didn't confirm within ${CONFIRM_WAIT / MIN} minutes. The proof is on the network; the page may just be slow.`,
      );
      if (seen === 'refused') fail('The checker’s page said the answer didn’t check out.');
      if (seen === 'expired') fail('The request expired before the answer arrived.');
      await waited(c, checkFrom);
      say('  Confirmed.');
      await c.getByText('Confirmed', { exact: true }).scrollIntoViewIfNeeded();
    }
    await sleep(2500);
    await caption(b, CAPTIONS.end);
    await caption(c, CAPTIONS.end);
    await sleep(3500);
    timeline.end = Date.now();
    step = 'Saving the recording';
  } catch (e) {
    say('');
    say(`Stopped at: ${step}.`);
    say(e instanceof Stop ? e.message : `Something went wrong: ${String(e?.message ?? e).split('\n')[0]}`);
    for (const [who, page] of Object.entries(pages)) {
      const shot = path.join(OUT, `stopped-${who}.png`);
      if (
        await page.screenshot({ path: shot }).then(
          () => true,
          () => false,
        )
      )
        say(`Screenshot: ${shot}`);
    }
    await saveRaw(contexts, browser, scratch);
    for (const who of Object.keys(films)) rawVideo(timeline, who);
    say(`Raw recordings kept in ${RAW}`);
    process.exitCode = 1;
    return false;
  }
  await saveRaw(contexts, browser, scratch);
  return true;
};

/** Stop filming, close the browsers, and keep the frames with the timeline. */
const saveRaw = async (contexts, browser, scratch) => {
  for (const [who, f] of Object.entries(films)) Object.assign(timeline[who], await f.stop());
  for (const ctx of contexts) await ctx.close().catch(() => undefined);
  await browser?.close().catch(() => undefined);
  fs.writeFileSync(path.join(RAW, 'timeline.json'), JSON.stringify(timeline));
  fs.rmSync(scratch, { recursive: true, force: true });
};

// --- the edit ---------------------------------------------------------------------------

/**
 * An ffmpeg input for one phone over [from, to] (wall-clock ms): its frames, each shown
 * until the next one was drawn (ffconcat list).
 */
const frameList = (t, who, from, to, name) => {
  const fr = t[who].frames ?? [];
  let i = 0;
  while (i + 1 < fr.length && fr[i + 1][0] <= from) i++;
  const lines = ['ffconcat version 1.0'];
  let last;
  for (let j = i; j < fr.length && (j === i || fr[j][0] < to); j++) {
    const s = j === i ? from : fr[j][0];
    const e = Math.min(fr[j + 1]?.[0] ?? to, to);
    if (e <= s) continue;
    last = path.join(t[who].dir, fr[j][1]).replace(/'/g, "'\\''");
    lines.push(`file '${last}'`, `duration ${((e - s) / 1000).toFixed(4)}`);
  }
  if (last) lines.push(`file '${last}'`); // ffconcat applies the last duration only if a file follows
  const file = path.join(RAW, 'edit', `${name}.txt`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, lines.join('\n') + '\n');
  return ['-f', 'concat', '-safe', '0', '-i', file];
};

/** One phone's whole recording, uncut, for when the run stopped part way. */
const rawVideo = (t, who) => {
  const fr = t[who]?.frames;
  if (!fr?.length) return;
  const out = path.join(RAW, `${who}.mp4`);
  const r = spawnSync('ffmpeg', [
    '-y',
    '-loglevel',
    'error',
    ...frameList(t, who, fr[0][0], fr.at(-1)[0] + 1000, `${who}-all`),
    '-vf',
    'fps=30,scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p',
    '-c:v',
    'libx264',
    '-crf',
    '23',
    '-an',
    out,
  ]);
  if (r.status === 0) say(`Raw recording: ${out}`);
};

const hasFfmpeg = () => !spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).error;

/** [from, to] minus the cuts, in wall-clock ms. */
const pieces = (from, to, cuts) => {
  let out = [[from, to]];
  for (const [a, b] of cuts) {
    out = out.flatMap(([x, y]) =>
      b <= x || a >= y
        ? [[x, y]]
        : [
            [x, a],
            [b, y],
          ].filter(([p, q]) => q - p > 0),
    );
  }
  return out.filter(([x, y]) => y - x > 250);
};

const edit = (t) => {
  const PH = 980; // phone height on a 1920x1080 canvas
  const GAP = 120;
  const inputs = [];
  const filters = [];
  const labels = [];
  let count = 0;
  const input = (who, from, to) => {
    inputs.push(...frameList(t, who, from, to, `${who}-${count}`));
    return count++;
  };
  // A thin border in the site's own line colour, then the phone on the site's background.
  const phoneOf = (n, out) =>
    filters.push(
      `[${n}:v]fps=30,scale=-2:${PH}:flags=lanczos,setsar=1,format=yuv420p,pad=iw+4:ih+4:2:2:color=0xDADFD8,setpts=PTS-STARTPTS[${out}]`,
    );

  const both = t.checker?.frames?.length > 0;
  const soloEnd = both ? t.checker.shown : t.end;
  for (const [a, b] of pieces(t.breeder.shown - 300, soloEnd ?? t.end, t.cuts)) {
    const k = labels.length;
    phoneOf(input('breeder', a, b), `p${k}`);
    filters.push(`[p${k}]pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=${BG.replace('#', '0x')}[s${k}]`);
    labels.push(`[s${k}]`);
  }
  if (both) {
    for (const [a, b] of pieces(t.checker.shown - 300, t.end, t.cuts)) {
      const k = labels.length;
      phoneOf(input('breeder', a, b), `l${k}`);
      phoneOf(input('checker', a, b), `r${k}`);
      filters.push(
        `[l${k}]pad=iw+${GAP}:ih:0:0:color=${BG.replace('#', '0x')}[lp${k}]`,
        `[lp${k}][r${k}]hstack=inputs=2:shortest=1,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=${BG.replace('#', '0x')}[s${k}]`,
      );
      labels.push(`[s${k}]`);
    }
  }
  filters.push(
    `${labels.join('')}concat=n=${labels.length}:v=1:a=0,tpad=stop_mode=clone:stop_duration=1.5,format=yuv420p[out]`,
  );

  const mp4 = path.join(OUT, 'veilcore-test-site-walkthrough.mp4');
  const poster = path.join(OUT, 'veilcore-test-site-walkthrough-poster.jpg');
  for (const crf of [23, 27, 31]) {
    const r = spawnSync(
      'ffmpeg',
      [
        '-y',
        '-loglevel',
        'error',
        ...inputs,
        '-filter_complex',
        filters.join(';'),
        '-map',
        '[out]',
        '-c:v',
        'libx264',
        '-preset',
        'slow',
        '-crf',
        String(crf),
        '-pix_fmt',
        'yuv420p',
        '-r',
        '30',
        '-movflags',
        '+faststart',
        '-an',
        mp4,
      ],
      { stdio: ['ignore', 'inherit', 'pipe'], maxBuffer: 64 * 1024 * 1024 },
    );
    if (r.status !== 0) {
      say(
        String(r.stderr ?? '')
          .trim()
          .split('\n')
          .slice(-5)
          .join('\n'),
      );
      return undefined;
    }
    if (fs.statSync(mp4).size <= 15 * 1024 * 1024) break;
  }
  const length = Number(
    spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4]).stdout.toString(),
  );
  // The poster: the last moment, both phones and the final caption.
  spawnSync('ffmpeg', [
    '-y',
    '-loglevel',
    'error',
    '-ss',
    String(Math.max(0, length - 2)),
    '-i',
    mp4,
    '-frames:v',
    '1',
    '-q:v',
    '3',
    poster,
  ]);
  return { mp4, poster, length, size: fs.statSync(mp4).size };
};

// --- main -------------------------------------------------------------------------------

const main = async () => {
  if (!hasFfmpeg()) {
    // Checked first, so no transactions are spent on a recording that can't be edited.
    say('Install ffmpeg first: brew install ffmpeg');
    say('Then run this again. Nothing was recorded or sent.');
    process.exitCode = 1;
    return;
  }
  fs.mkdirSync(OUT, { recursive: true });
  let t;
  if (EDIT_ONLY) {
    try {
      t = JSON.parse(fs.readFileSync(path.join(RAW, 'timeline.json'), 'utf8'));
    } catch {
      say(`No raw recording to edit in ${RAW}.`);
      process.exitCode = 1;
      return;
    }
  } else {
    let ok;
    try {
      ok = await run();
    } catch (e) {
      say('');
      say(`Stopped at: ${step}.`);
      say(e instanceof Stop ? e.message : String(e?.message ?? e));
      process.exitCode = 1;
      return;
    }
    if (!ok) return;
    t = timeline;
  }
  if (!t.breeder?.frames?.length || !t.end) {
    say('The raw recording is incomplete, so there is nothing to edit.');
    process.exitCode = 1;
    return;
  }
  say('Editing the video (cutting the waits, putting the two phones side by side)…');
  const done = edit(t);
  if (!done) {
    say(`Editing didn't work. The raw recordings are kept in ${RAW}.`);
    process.exitCode = 1;
    return;
  }
  say('');
  say(`Done. ${Math.round(done.length)} seconds, ${(done.size / 1024 / 1024).toFixed(1)} MB.`);
  say(`Video:  ${done.mp4}`);
  say(`Poster: ${done.poster}`);
  say(`Raw recordings: ${RAW}`);
  if (t.dryRun) say('(Dry run: the date stamp and the proof in this video did not happen.)');
};

await main();
