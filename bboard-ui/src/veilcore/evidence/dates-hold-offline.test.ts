// If VeilCore disappears, your date still holds (docs/offline.md, "If VeilCore is gone").
//
// A bundle is built here the way the site builds it (buildEvidence, bundleFiles), unpacked to a
// folder, and checked by the two offline checkers with every VeilCore address cut off:
//
//   verify.html   opened from disk in a headless browser. Every request the page makes is
//                 recorded and refused, VeilCore's hosts (veilcore.org, the registry, the relay,
//                 the sponsor) and everything else. It must reach its verdict anyway.
//   verify.py     the Python checker in the SDK's evidence package, built by the SDK for a record
//                 in the same batch, run with a Python audit hook that refuses every network call.
//
// The record and its batch are practice data, batched as the registry batches (the SDK's
// buildBatch): no real record's sealed fields are public, by design. What dates a batch is real
// mainnet data: VeilCore's first batch B-20261011-FE71, its Bitcoin stamp file and blocks 971004
// and 971005 (../bitcoin/fixtures), checked inside the same offline verify.html by the page's own
// code; its Midnight transaction is checked by the code proof/check-on-midnight.mjs runs, against
// the indexer's recorded answer (partner-kit test/bundle-batch.test.ts, "needs Midnight, not VeilCore").
//
// In CI (site-unit) the browser and python3 are installed and both must run. Elsewhere, a
// missing browser or python3 skips that part. PW_CHROMIUM_PATH points at another Chromium.
// SPDX-License-Identifier: Apache-2.0

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildBatch, buildEvidencePackage, computeCommitment, type Envelope } from 'veilcore-records';
import { buildEvidence, bundleFiles, bundleFolder, checkScriptFor, reconcile } from './bundle';
import { practiceRecord } from './test-records';
import { MAINNET_PINNED } from '../../../../api/src/pinned-contracts';
import fe71 from '../bitcoin/fixtures/veilcore-fe71.json';

const mem = new Map<string, string>();
(globalThis as unknown as { localStorage: Partial<Storage> }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
};

const HERE = path.dirname(fileURLToPath(import.meta.url));
const IN_CI = Boolean(process.env.CI);

/** VeilCore's own hosts: the site, the registry, the relay and the sponsors (all on Railway). */
const VEILCORE_HOST = /(^|\.)veilcore\.org$|^veilcore-[a-z0-9-]*\.up\.railway\.app$/;
const isVeilcore = (url: string): boolean => {
  try {
    return VEILCORE_HOST.test(new URL(url).hostname);
  } catch {
    return false;
  }
};

// VeilCore's version 1 main contract on mainnet: the page dates nothing on any other.
const CONTRACT = MAINNET_PINNED.find((e) => e.kind === 'veilcore' && e.version === 'v1')!.address;
// The practice batch's transaction: made up, like the batch. No chain holds it.
const PRACTICE_TX = 'c3'.repeat(32);

const sha256 = (b: Uint8Array): Buffer => createHash('sha256').update(b).digest();
const hexBytes = (h: string): Uint8Array => Uint8Array.from(Buffer.from(h, 'hex'));

/**
 * A pending OpenTimestamps file for a batch root, as a calendar first answers: SHA-256 of
 * root.bin, then a promise from one calendar, no Bitcoin block yet. Pending is honest here:
 * no block holds a practice root. The real stamp (block 971004) is checked further down.
 */
const pendingStamp = (root: string): Uint8Array => {
  const uri = Buffer.from('https://a.pool.opentimestamps.org');
  const payload = Buffer.concat([Buffer.from([uri.length]), uri]);
  return Uint8Array.from(
    Buffer.concat([
      Buffer.from('\x00OpenTimestamps\x00\x00Proof\x00', 'latin1'),
      Buffer.from('bf89e2e884e89294', 'hex'),
      Buffer.from([0x01, 0x08]),
      sha256(hexBytes(root)),
      Buffer.from([0x00]),
      Buffer.from('83dfe30d2ef90c8e', 'hex'),
      Buffer.from([payload.length]),
      payload,
    ]),
  );
};

/** An SDK record (SPEC envelope) for verify.py, practice data, sealed in the same batch. */
const sdkRecord = async (): Promise<Envelope & { commitment: string }> => {
  const env = {
    formatVersion: '0.1',
    recordId: 'vc_rec_offline_practice',
    subjectType: 'plant-genetic-material',
    profile: 'veilcore/profile/plant-variety/v1',
    commitmentAlgorithm: 'sha256/canonical-json/v1',
    anchor: { chain: 'midnight', network: 'mainnet' },
    sealedAt: '2026-11-20T09:00:00Z',
    holder: { id: 'vc_hld_practice' },
    parents: [],
    attestations: [],
    subject: {
      name: 'Offline check (practice record)',
      originator: 'Practice breeder (test data)',
      taxon: 'Cannabis sativa',
      claimedCreationDate: '2026-11-01',
    },
    profileData: { propagationType: 'clone', notes: 'Practice data.', nonce: '5a'.repeat(32) },
  } as unknown as Envelope;
  return { ...env, commitment: await computeCommitment(env) };
};

type Built = {
  dir: string;
  bundleDir: string;
  packageDir: string;
  root: string;
  batchId: string;
  recordId: string;
  script: string | null;
};

const build = async (): Promise<Built> => {
  const record = await practiceRecord(1);
  const sdk = await sdkRecord();
  const others = await Promise.all([3, 4].map((n) => practiceRecord(n)));
  const batch = await buildBatch(
    [record.recordFingerprint, sdk.commitment, ...others.map((r) => r.recordFingerprint)],
    'B-20261120-OFFL',
    '2026-11-20T12:00:00Z',
  );
  const anchor = {
    chain: 'midnight',
    network: 'mainnet',
    contractAddress: CONTRACT,
    txHash: PRACTICE_TX,
    blockHeight: 3_500_000,
    anchoredAt: '2026-11-20T12:05:00.000Z',
  };
  const ots = pendingStamp(batch.root);

  // The site's bundle: what the registry would answer, held to the record by reconcile.
  const gathered = await reconcile(record.recordFingerprint, {
    source: 'evidence-route',
    registryFirstSeen: '2026-11-20T11:00:00.000Z',
    proof: { ...batch.proofs[record.recordFingerprint], anchor },
    batch: {
      batchId: batch.batchId,
      root: batch.root,
      sealedAt: '2026-11-20T12:00:00.000Z',
      recordCount: 4,
      anchor,
      earlierAnchors: [],
      opentimestamps: { available: true, status: 'pending', calendars: ['https://a.pool.opentimestamps.org'] },
    },
    ots,
    attestations: [],
  });
  const ev = await buildEvidence(record, gathered, { includeKey: false, now: new Date('2026-11-21T09:00:00Z') });
  const files = await bundleFiles(ev, gathered, { includeKey: false });

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'veilcore-offline-'));
  for (const [p, bytes] of Object.entries(files)) {
    const out = path.join(dir, 'bundle', p);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, bytes);
  }

  // The SDK's evidence package, with verify.py, for the SDK record in the same batch.
  const pkg = await buildEvidencePackage({
    record: sdk,
    proof: { ...batch.proofs[sdk.commitment], anchor },
    opentimestamps: { rootBin: hexBytes(batch.root), ots },
    generatedAt: '2026-11-21T09:00:00Z',
  });
  const packageDir = path.join(dir, 'package');
  fs.mkdirSync(packageDir);
  for (const [name, bytes] of Object.entries(pkg)) fs.writeFileSync(path.join(packageDir, name), bytes);

  return {
    dir,
    bundleDir: path.join(dir, 'bundle', bundleFolder(record.id)),
    packageDir,
    root: batch.root,
    batchId: batch.batchId,
    recordId: record.id,
    script: checkScriptFor(ev),
  };
};

let built: Built;
beforeAll(async () => {
  built = await build();
});
afterAll(() => {
  if (built?.dir) fs.rmSync(built.dir, { recursive: true, force: true });
});

// ---- verify.html, in a browser, with VeilCore gone ------------------------------------------

type PwRoute = {
  request: () => { url: () => string };
  abort: (code?: string) => Promise<void>;
  continue: () => Promise<void>;
};
type PwPage = {
  goto: (url: string) => Promise<unknown>;
  on: (event: 'request', fn: (r: { url: () => string }) => void) => void;
  waitForSelector: (s: string, o?: object) => Promise<unknown>;
  locator: (s: string) => { innerText: () => Promise<string>; count: () => Promise<number> };
  evaluate: <R, A>(fn: (a: A) => R | Promise<R>, arg: A) => Promise<R>;
};
type PwContext = {
  route: (url: string, fn: (r: PwRoute) => Promise<void>) => Promise<void>;
  setOffline: (o: boolean) => Promise<void>;
  newPage: () => Promise<PwPage>;
  close: () => Promise<void>;
};
type PwBrowser = { newContext: () => Promise<PwContext>; close: () => Promise<void> };

const PW = [
  path.resolve(HERE, '../../../../node_modules/playwright'),
  path.resolve(HERE, '../../../node_modules/playwright'),
].find((p) => fs.existsSync(path.join(p, 'package.json')));

const launch = async (): Promise<PwBrowser | null> => {
  if (!PW) {
    if (IN_CI) throw new Error('playwright is not installed: the offline check of verify.html cannot run');
    return null;
  }
  const { chromium } = createRequire(import.meta.url)(PW) as {
    chromium: { launch: (o: object) => Promise<PwBrowser> };
  };
  try {
    return await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});
  } catch (e) {
    if (IN_CI) throw e;
    return null;
  }
};

/** A context where every request is recorded and refused, and the browser is offline. */
const cutOff = async (browser: PwBrowser) => {
  const ctx = await browser.newContext();
  const asked: string[] = [];
  await ctx.route('**/*', async (route) => {
    const u = route.request().url();
    // The bundle's own files, read from disk: not the network.
    if (u.startsWith('file:')) return route.continue();
    asked.push(u);
    await route.abort('internetdisconnected');
  });
  await ctx.setOffline(true);
  return { ctx, asked };
};

describe('verify.html reaches its verdict with VeilCore gone', () => {
  let browser: PwBrowser | null = null;
  beforeAll(async () => {
    browser = await launch();
  }, 60_000);
  afterAll(async () => {
    await browser?.close();
  });

  it('the trap works: a page that asks veilcore.org is caught', async (t) => {
    if (!browser) return t.skip();
    const { ctx, asked } = await cutOff(browser);
    const page = await ctx.newPage();
    await page.goto(pathToFileURL(path.join(built.bundleDir, 'README.txt')).href);
    const got = await page.evaluate(
      (u: string) =>
        fetch(u).then(
          () => 'answered',
          () => 'refused',
        ),
      'https://veilcore.org/check',
    );
    // Refused, by the route or by the browser being offline: it never got an answer.
    expect(got).toBe('refused');
    expect(asked.every(isVeilcore)).toBe(true);
    await ctx.close();
  });

  it('the record, its proof and the batch check, and the look-ups are given, with no request made', async (t) => {
    if (!browser) return t.skip();
    const { ctx, asked } = await cutOff(browser);
    const page = await ctx.newPage();
    const seen: string[] = [];
    page.on('request', (r) => seen.push(r.url()));
    const url = pathToFileURL(path.join(built.bundleDir, 'verify.html')).href;
    await page.goto(url);
    await page.waitForSelector('body[data-checked="yes"]', { timeout: 30_000 });

    const summary = await page.locator('#summary').innerText();
    expect(summary).toContain('The files agree with each other');
    const checks = await page.locator('#checks').innerText();
    expect(checks).toContain('Proof code matches');
    expect(checks).toContain('Proof leads to the batch root');
    expect(checks).not.toMatch(/does not match|does not lead/);

    // What the page leaves to the reader: one Midnight look-up (VeilCore's pinned contract, the
    // transaction) and the Bitcoin stamp, read from the bundle's own file.
    const lookups = await page.locator('#lookups').innerText();
    expect(lookups).toContain('Look it up on');
    expect(lookups).toContain(PRACTICE_TX);
    expect(lookups).toContain(built.root);
    expect(lookups).not.toContain('Not one of VeilCore’s contracts');
    expect(lookups).toContain('The stamp file starts from SHA-256 of root.bin');

    // Nothing was asked of anyone: the page itself is the only thing loaded, from disk.
    expect(seen.filter((u) => u !== url)).toEqual([]);
    expect(asked).toEqual([]);
    expect(seen.filter(isVeilcore)).toEqual([]);
    await ctx.close();
  });

  it('real mainnet: the page’s own code checks batch FE71’s Bitcoin stamp and blocks, offline', async (t) => {
    if (!browser) return t.skip();
    const { ctx, asked } = await cutOff(browser);
    const page = await ctx.newPage();
    const seen: string[] = [];
    page.on('request', (r) => seen.push(r.url()));
    const url = pathToFileURL(path.join(built.bundleDir, 'verify.html')).href;
    await page.goto(url);
    await page.waitForSelector('body[data-checked="yes"]', { timeout: 30_000 });
    // The bundle's verify.html, with its own scripts and its own pinned checkpoints: the same
    // check it runs on a bundle whose batch was stamped in Bitcoin, given VeilCore's first
    // mainnet batch (root.bin, root.bin.ots) and the stamped block's headers.
    const r = await page.evaluate(
      async (a: { ots: string; root: string; headers: { height: number; header: string }[] }) => {
        type V = {
          readStamp: (b: Uint8Array, root: string) => Promise<{ status: string; bitcoin: { height: number }[] }>;
          checkBitcoinHeaders: (
            s: unknown,
            f: unknown,
            p: unknown,
            c: unknown,
          ) => Promise<{ ok: boolean; height?: number; checkpoint?: { height: number } } | null>;
        };
        const w = window as unknown as { VeilcoreVerify?: V; BtcHeaderChain?: unknown };
        // Classic scripts' top-level vars are window properties.
        const V = w.VeilcoreVerify as V;
        const pins = JSON.parse(document.getElementById('veilcore-btc-checkpoints')!.textContent) as unknown;
        const bytes = Uint8Array.from(atob(a.ots), (c) => c.charCodeAt(0));
        const stamp = await V.readStamp(bytes, a.root);
        const file = {
          format: 'veilcore/bitcoin-headers/v1',
          height: 971004,
          headers: a.headers,
          from: ['mempool.space', 'blockstream.info'],
        };
        const headers = await V.checkBitcoinHeaders(stamp, file, pins, w.BtcHeaderChain);
        // A changed root: the same stamp file must not date it.
        const other = await V.readStamp(bytes, '00'.repeat(32));
        return { status: stamp.status, blocks: stamp.bitcoin.map((b) => b.height), headers, other: other.status };
      },
      {
        ots: fe71.otsBase64,
        root: fe71.rootHex,
        headers: fe71.headers.map((h) => ({ height: h.height, header: h.header })),
      },
    );
    expect(r.status).toBe('bitcoin');
    expect(r.blocks).toContain(971004);
    expect(r.headers).toMatchObject({ ok: true, height: 971004, checkpoint: { height: 971005 } });
    expect(r.other).not.toBe('bitcoin');
    expect(seen.filter((u) => u !== url)).toEqual([]);
    expect(asked).toEqual([]);
    await ctx.close();
  });
});

// ---- verify.py, with every network call refused -----------------------------------------------

/** Runs a Python file with an audit hook that refuses (and reports) every network call. */
const GUARD = `
import runpy, sys
NET = ("socket.connect", "socket.getaddrinfo", "socket.gethostbyname", "socket.gethostbyname_ex",
       "socket.gethostbyaddr", "socket.sendto", "socket.sendmsg", "urllib.Request", "http.client.connect")
def hook(event, args):
    if event in NET:
        sys.stderr.write("NETWORK " + event + " " + repr(args)[:200] + "\\n")
        raise OSError("no network for this check: " + event)
sys.addaudithook(hook)
target = sys.argv[1]
sys.argv = [target]
runpy.run_path(target, run_name="__main__")
`;

const PYTHON = ['python3', 'python'].find((p) => spawnSync(p, ['--version']).status === 0);

const runPython = (file: string) =>
  spawnSync(PYTHON as string, ['-I', '-c', GUARD, file], {
    cwd: path.dirname(file),
    encoding: 'utf8',
    timeout: 60_000,
  });

describe('verify.py reaches its verdict with the network refused', () => {
  it('the trap works: a lookup of veilcore.org is refused and reported', (t) => {
    if (!PYTHON) {
      if (IN_CI) throw new Error('python3 is not installed: the offline check of verify.py cannot run');
      return t.skip();
    }
    const probe = path.join(built.dir, 'probe.py');
    fs.writeFileSync(probe, 'import socket\nsocket.getaddrinfo("veilcore.org", 443)\n');
    const r = runPython(probe);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/NETWORK socket\.getaddrinfo .*veilcore\.org/);
  });

  it('every offline check passes; the date is one look-up on Midnight, named', (t) => {
    if (!PYTHON) {
      if (IN_CI) throw new Error('python3 is not installed: the offline check of verify.py cannot run');
      return t.skip();
    }
    const r = runPython(path.join(built.packageDir, 'verify.py'));
    expect(r.stderr).not.toContain('NETWORK');
    expect(r.stdout).toContain('[ok] commitment recomputed');
    expect(r.stdout).toContain('the record is exactly as it was when sealed');
    expect(r.stdout).toContain(`the commitment is in batch ${built.batchId} with root ${built.root}`);
    expect(r.stdout).toContain('root.bin.ots is an OpenTimestamps proof for root.bin');
    expect(r.stdout).toContain(`confirm transaction ${PRACTICE_TX} on midnight (mainnet)`);
    expect(r.stdout).toContain('RESULT: every offline check passed');
    expect(r.status).toBe(0);
  });

  it('and still fails a changed record, offline', (t) => {
    if (!PYTHON) {
      if (IN_CI) throw new Error('python3 is not installed: the offline check of verify.py cannot run');
      return t.skip();
    }
    const copy = path.join(built.dir, 'package-changed');
    fs.cpSync(built.packageDir, copy, { recursive: true });
    const recordFile = path.join(copy, 'record.json');
    fs.writeFileSync(
      recordFile,
      fs.readFileSync(recordFile, 'utf8').replace('Offline check (practice record)', 'Edited'),
    );
    const r = runPython(path.join(copy, 'verify.py'));
    expect(r.stderr).not.toContain('NETWORK');
    expect(r.stdout).toContain('SOME CHECKS FAILED');
    expect(r.status).toBe(1);
  });
});

// ---- the Midnight look-up names no VeilCore server ---------------------------------------------

describe('proof/check-on-midnight.mjs asks Midnight, not VeilCore', () => {
  it('it reads the batch root from Blockfrost with your own project id; no VeilCore address in it', () => {
    const script = built.script ?? '';
    expect(script).toContain("import { checkBatchAnchor } from '@veilcore/contracts';");
    expect(script).toContain('blockfrostProjectId,');
    expect(script).toContain(`txId: "${PRACTICE_TX}"`);
    expect(script).toContain(`root: Buffer.from("${built.root}", 'hex')`);
    // No indexer of anyone's choosing: the kit's default for mainnet, Blockfrost (partner-kit network.ts).
    expect(script).not.toMatch(/\bindexer\s*:/);
    expect(script).not.toMatch(/veilcore\.org|railway\.app/);
    expect(fs.readFileSync(path.join(built.bundleDir, 'proof', 'check-on-midnight.mjs'), 'utf8')).toBe(script);
  });
});
