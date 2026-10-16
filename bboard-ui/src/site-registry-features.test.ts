// Both site deploys refuse a registry that can't serve the site (16 Oct 2026).
//
// Every build of the site uses sealed records, lab results and animal records, so
// deploy:mainnet (scripts/site-mainnet-preflight.mjs) and deploy:test
// (scripts/deploy-test-site.mjs) ask the target registry's GET /health for its `features`
// and refuse, with a plain NOT DEPLOYED line naming what is missing and saying to deploy the
// registry first, unless it lists all three (scripts/registry-features.mjs). Their earlier
// checks still come first and still refuse as before.
//
// The registry here is a stand-in on 127.0.0.1; nothing reaches the network and nothing is
// built. Run: npx vitest run src/site-registry-features.test.ts
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, afterAll } from 'vitest';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';
import { readMainnetPins } from '../../scripts/mainnet-pins.mjs';
import {
  REQUIRED_FEATURES,
  checkFeatures,
  checkRegistryFeatures,
  featuresLine,
} from '../../scripts/registry-features.mjs';
import { checkTestRegistry } from '../../scripts/deploy-test-site.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const ALL = ['sealed-records-v1', 'lab-results-v1', 'animal-profile-v1'];
const DEPLOY_FIRST = /Deploy the registry first: put the registry's latest code live on Railway/;

/** A stand-in registry: its descriptor and its /health, each with a status. */
const stubRegistry = async (o: {
  descriptor: unknown;
  health?: unknown;
  healthStatus?: number;
}): Promise<{ api: string; asked: string[]; close: () => void }> => {
  const asked: string[] = [];
  const server = http.createServer((req, res) => {
    asked.push(req.url ?? '');
    const [status, body] =
      req.url === '/.well-known/veilcore-registry'
        ? [200, o.descriptor]
        : req.url === '/health'
          ? [o.healthStatus ?? 200, o.health ?? { ok: true, features: ALL }]
          : [404, {}];
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(typeof body === 'string' ? body : JSON.stringify(body));
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  return {
    api: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    asked,
    close: () => server.close(),
  };
};
const servers: { close: () => void }[] = [];
const stub = async (o: Parameters<typeof stubRegistry>[0]) => {
  const s = await stubRegistry(o);
  servers.push(s);
  return s;
};
afterAll(() => servers.forEach((s) => s.close()));

/** Runs a script as npm runs it, with none of vitest's VITE_ values. */
const runScript = (script: string, env: Record<string, string>, cwd = ROOT) =>
  new Promise<{ code: number | null; text: string }>((resolve) => {
    const clean = Object.fromEntries(
      Object.entries(process.env).filter(([k]) => !/^(VITEST|VITE_|NODE_ENV$|TEST$|MODE$|VEILCORE_)/.test(k)),
    );
    const p = spawn(process.execPath, [path.join(ROOT, 'scripts', script)], { cwd, env: { ...clean, ...env } });
    let text = '';
    p.stdout.on('data', (d) => (text += d));
    p.stderr.on('data', (d) => (text += d));
    p.on('close', (code) => resolve({ code, text }));
  });

describe('the features the site needs', () => {
  it('are exactly sealed records, lab results and animal records', () => {
    expect(Object.keys(REQUIRED_FEATURES)).toEqual(ALL);
    expect(featuresLine('https://r.example')).toBe(
      'Registry https://r.example serves sealed records, lab results and animal records.',
    );
  });

  it('pass only when /health lists all three; extra features are fine', () => {
    expect(checkFeatures({ ok: true, features: ALL }, 'R')).toEqual({ ok: true });
    expect(checkFeatures({ ok: true, features: [...ALL, 'something-new-v1'].reverse() }, 'R')).toEqual({ ok: true });
    for (const gone of ALL) {
      const r = checkFeatures({ ok: true, features: ALL.filter((f) => f !== gone) }, 'R');
      expect(r.ok, gone).toBe(false);
      expect(!r.ok && r.missing).toEqual([gone]);
      expect(!r.ok && r.problem).toContain(`The registry at R is missing ${gone} (${REQUIRED_FEATURES[gone]})`);
      expect(!r.ok && r.problem).toMatch(DEPLOY_FIRST);
    }
  });

  it('refuse a registry that lists none: an older build, or a malformed answer', () => {
    for (const health of [{ ok: true }, { features: 'lab-results-v1' }, { features: [1, null] }, null, 'x']) {
      const r = checkFeatures(health, 'R');
      expect(r.ok).toBe(false);
      expect(!r.ok && r.missing).toEqual(ALL);
      expect(!r.ok && r.problem).toMatch(/it lists no features, so it is an older registry/);
    }
    // A version that is not v1 is a different feature.
    const v2 = checkFeatures({ features: ['sealed-records-v2', 'lab-results-v1', 'animal-profile-v1'] }, 'R');
    expect(!v2.ok && v2.missing).toEqual(['sealed-records-v1']);
  });

  it('are read from the registry itself: not ready, unreadable and not JSON each say so', async () => {
    const good = await stub({ descriptor: {} });
    expect(await checkRegistryFeatures(good.api)).toEqual({ ok: true });
    expect(good.asked).toEqual(['/health']);
    const starting = await stub({ descriptor: {}, healthStatus: 503, health: { ok: false, status: 'starting' } });
    const r503 = await checkRegistryFeatures(starting.api);
    expect(!r503.ok && r503.problem).toMatch(/is not ready \(its \/health answered 503\)/);
    const garbled = await stub({ descriptor: {}, health: 'not json' });
    const rGarbled = await checkRegistryFeatures(garbled.api);
    expect(!rGarbled.ok && rGarbled.problem).toMatch(DEPLOY_FIRST);
    const down = await checkRegistryFeatures('http://127.0.0.1:1');
    expect(!down.ok && down.problem).toMatch(/Could not read http:\/\/127\.0\.0\.1:1\/health/);
  });
});

describe('deploy:mainnet', () => {
  const pins = readMainnetPins();
  const mainnetAt = (contractAddress: string) => ({
    anchors: [{ chain: 'midnight', network: 'mainnet', contractAddress }],
  });

  it.skipIf(!pins.ok)(
    'refuses a registry missing a feature, naming it; builds against one with all three',
    async () => {
      if (!pins.ok) return;
      const ready = await stub({ descriptor: mainnetAt(pins.veilcore) });
      const ok = await runScript('site-mainnet-preflight.mjs', { VITE_API_BASE: ready.api });
      expect(ok.code, ok.text).toBe(0);
      expect(ok.text).toContain(featuresLine(ready.api));
      expect(ok.text).toMatch(/anchors on mainnet to the same contract\. Building the mainnet site\./);

      const noLab = await stub({
        descriptor: mainnetAt(pins.veilcore),
        health: { ok: true, features: ['sealed-records-v1', 'animal-profile-v1'] },
      });
      const refused = await runScript('site-mainnet-preflight.mjs', { VITE_API_BASE: noLab.api });
      expect(refused.code).toBe(1);
      expect(refused.text).toMatch(
        new RegExp(
          `NOT DEPLOYED\\. The registry at ${noLab.api.replace(/\./g, '\\.')} is missing lab-results-v1 \\(lab results\\)`,
        ),
      );
      expect(refused.text).toMatch(DEPLOY_FIRST);
      expect(refused.text).not.toMatch(/Building the mainnet site/);

      const old = await stub({ descriptor: mainnetAt(pins.veilcore), health: { ok: true } });
      const older = await runScript('site-mainnet-preflight.mjs', { VITE_API_BASE: old.api });
      expect(older.code).toBe(1);
      expect(older.text).toMatch(
        /NOT DEPLOYED\. .*missing sealed-records-v1 \(sealed records\), lab-results-v1 \(lab results\), animal-profile-v1 \(animal records\)/,
      );
    },
    30_000,
  );

  it.skipIf(!pins.ok)(
    'still refuses a registry anchoring elsewhere first, without asking /health',
    async () => {
      const preview = await stub({
        descriptor: { anchors: [{ network: 'preview', contractAddress: 'ab'.repeat(32) }] },
      });
      const r = await runScript('site-mainnet-preflight.mjs', { VITE_API_BASE: preview.api });
      expect(r.code).toBe(1);
      expect(r.text).toMatch(/NOT DEPLOYED\. The registry does not anchor on mainnet yet \(it says: preview\)/);
      expect(preview.asked).not.toContain('/health');
    },
    30_000,
  );
});

describe('deploy:test', () => {
  const preprod = { anchors: [{ chain: 'midnight', network: 'preprod', contractAddress: 'ab'.repeat(32) }] };

  it('accepts a preprod registry only when its /health lists all three', async () => {
    const ready = await stub({ descriptor: preprod });
    expect(await checkTestRegistry(ready.api)).toEqual({ ok: true });
    const noAnimals = await stub({
      descriptor: preprod,
      health: { ok: true, features: ['sealed-records-v1', 'lab-results-v1'] },
    });
    const r = await checkTestRegistry(noAnimals.api);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.problem).toMatch(/is missing animal-profile-v1 \(animal records\), which this site uses/);
    expect(!r.ok && r.problem).toMatch(DEPLOY_FIRST);
  });

  it('keeps its earlier registry checks, in order, before /health', async () => {
    const mainnet = await stub({ descriptor: { anchors: [{ network: 'mainnet' }] } });
    const rMainnet = await checkTestRegistry(mainnet.api);
    expect(!rMainnet.ok && rMainnet.problem).toMatch(/The registry anchors on mainnet now/);
    const preview = await stub({ descriptor: { anchors: [{ network: 'preview' }] } });
    expect(await checkTestRegistry(preview.api)).toEqual({
      ok: false,
      problem: 'That registry does not say it anchors on preprod.',
    });
    const unreadable = await stub({ descriptor: 'not json' });
    const rUnreadable = await checkTestRegistry(unreadable.api);
    expect(!rUnreadable.ok && rUnreadable.problem).toMatch(/Could not read .*\/\.well-known\/veilcore-registry/);
    for (const s of [mainnet, preview, unreadable]) expect(s.asked).not.toContain('/health');
  });

  it('the script refuses with a plain NOT DEPLOYED line', async () => {
    // Run from an empty folder: its first check (the proving parameters) stops it there.
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'vc-deploy-test-'));
    try {
      const r = await runScript('deploy-test-site.mjs', {}, empty);
      expect(r.code).toBe(1);
      expect(r.text).toMatch(/NOT DEPLOYED\. The test site is unchanged\. The proving parameters are missing/);
    } finally {
      fs.rmSync(empty, { recursive: true, force: true });
    }
  }, 30_000);
});
