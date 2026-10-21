// All three site deploys refuse a registry that can't serve the site (16 Oct 2026; deploy:prod
// since round 6, CONTRACT.md #35).
//
// Every build of the site uses sealed records, lab results, animal records and the claimant's
// copy of a delivery's offer ("Finish receiving"), so
// deploy:mainnet (scripts/site-mainnet-preflight.mjs) and deploy:test
// (scripts/deploy-test-site.mjs) ask the target registry's GET /health for its `features`
// and refuse, with a plain NOT DEPLOYED line naming what is missing and saying to deploy the
// registry first, unless it lists all of them (scripts/registry-features.mjs). Their earlier
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
const ALL = [
  'sealed-records-v1',
  'lab-results-v1',
  'animal-profile-v1',
  'claimant-offer-v1',
  'sealed-custody-v1',
  'record-rev-v1',
  'license-rev-v1',
  'sealed-name-v1',
  'dna-pair-binding-v1',
  'bred-by-grant-v1',
  'name-code-v1',
  'lab-doc-binding-v1',
  'dating-first-v1',
];
/** What agreements on chain use: required for a test site, and for mainnet once agreements are live. */
const AGREEMENTS = ['license-invites-v1', 'deals-v1', 'payment-receipts-v1'];
const DEPLOY_FIRST = /Deploy the registry first: put the registry's latest code live on Railway/;

const healthOf = (o: { health?: unknown; noAgreements?: boolean }): unknown => {
  const h = o.health ?? { ok: true, features: ALL };
  const f = (h as { features?: unknown }).features;
  return Array.isArray(f) && !o.noAgreements ? { ...h, features: [...(f as unknown[]), ...AGREEMENTS] } : h;
};

/** A stand-in registry: its descriptor and its /health, each with a status. */
const stubRegistry = async (o: {
  descriptor: unknown;
  health?: unknown;
  healthStatus?: number;
  /** Leave the agreement features out of a given /health (every other test lists them). */
  noAgreements?: boolean;
}): Promise<{ api: string; asked: string[]; close: () => void }> => {
  const asked: string[] = [];
  const server = http.createServer((req, res) => {
    asked.push(req.url ?? '');
    const [status, body] =
      req.url === '/.well-known/veilcore-registry'
        ? [200, o.descriptor]
        : req.url === '/health'
          ? [o.healthStatus ?? 200, healthOf(o)]
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
  it('are exactly sealed records, lab results, animal records, finishing a delivery, locked sample details, the record and agreement rev, locked names, bound DNA reports, sharing who bred it, name codes, bound lab reports and dating first', () => {
    expect(Object.keys(REQUIRED_FEATURES)).toEqual(ALL);
    expect(featuresLine('https://r.example')).toBe(
      'Registry https://r.example serves sealed records, lab results, animal records, finishing a received delivery, locked sample details, refusing an older copy of a record, refusing an older copy of an agreement, locked record names, DNA reports shown only as a bound code, sharing who bred it, checking the name in a link, keeping lab report hashes private and dating a record the moment it is sealed.',
    );
  });

  it('pass only when /health lists all six; extra features are fine', () => {
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
    const v2 = checkFeatures(
      {
        features: [
          'sealed-records-v2',
          'lab-results-v1',
          'animal-profile-v1',
          'claimant-offer-v1',
          'sealed-custody-v1',
          'record-rev-v1',
          'license-rev-v1',
          'sealed-name-v1',
          'dna-pair-binding-v1',
          'bred-by-grant-v1',
          'name-code-v1',
          'lab-doc-binding-v1',
          'dating-first-v1',
        ],
      },
      'R',
    );
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
    'refuses a registry missing a feature, naming it; builds against one with all four',
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
        /NOT DEPLOYED\. .*missing sealed-records-v1 \(sealed records\), lab-results-v1 \(lab results\), animal-profile-v1 \(animal records\), claimant-offer-v1 \(finishing a received delivery\), sealed-custody-v1 \(locked sample details\), record-rev-v1 \(refusing an older copy of a record\), license-rev-v1 \(refusing an older copy of an agreement\), sealed-name-v1 \(locked record names\), dna-pair-binding-v1 \(DNA reports shown only as a bound code\), bred-by-grant-v1 \(sharing who bred it\), name-code-v1 \(checking the name in a link\), lab-doc-binding-v1 \(keeping lab report hashes private\), dating-first-v1 \(dating a record the moment it is sealed\)/,
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

  it('refuses a preprod registry that does not serve agreements: the test site makes them', async () => {
    const noDeals = await stub({
      descriptor: preprod,
      noAgreements: true,
      health: { ok: true, features: [...ALL, 'license-invites-v1'] },
    });
    const r = await checkTestRegistry(noDeals.api);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.problem).toMatch(/is missing deals-v1 .*payment-receipts-v1/);
  });

  it('accepts a preprod registry only when its /health lists all nine', async () => {
    const ready = await stub({ descriptor: preprod });
    expect(await checkTestRegistry(ready.api)).toEqual({ ok: true });
    const noAnimals = await stub({
      descriptor: preprod,
      health: {
        ok: true,
        features: [
          'sealed-records-v1',
          'lab-results-v1',
          'claimant-offer-v1',
          'sealed-custody-v1',
          'record-rev-v1',
          'license-rev-v1',
          'sealed-name-v1',
          'dna-pair-binding-v1',
          'bred-by-grant-v1',
          'name-code-v1',
          'lab-doc-binding-v1',
          'dating-first-v1',
        ],
      },
    });
    const r = await checkTestRegistry(noAnimals.api);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.problem).toMatch(/is missing animal-profile-v1 \(animal records\), which this site uses/);
    expect(!r.ok && r.problem).toMatch(DEPLOY_FIRST);
    // A registry from before sealed records round 2: no claimant's copy of the offer.
    const beforeRound2 = await stub({
      descriptor: preprod,
      health: {
        ok: true,
        features: [
          'sealed-records-v1',
          'lab-results-v1',
          'animal-profile-v1',
          'sealed-custody-v1',
          'record-rev-v1',
          'license-rev-v1',
          'sealed-name-v1',
          'dna-pair-binding-v1',
          'bred-by-grant-v1',
          'name-code-v1',
          'lab-doc-binding-v1',
          'dating-first-v1',
        ],
      },
    });
    const r2 = await checkTestRegistry(beforeRound2.api);
    expect(!r2.ok && r2.problem).toMatch(
      /is missing claimant-offer-v1 \(finishing a received delivery\), which this site uses/,
    );
    // A registry from before round 3: it would refuse the sealed sample details (CONTRACT.md #27).
    const beforeRound3 = await stub({
      descriptor: preprod,
      health: {
        ok: true,
        features: [
          'sealed-records-v1',
          'lab-results-v1',
          'animal-profile-v1',
          'claimant-offer-v1',
          'record-rev-v1',
          'license-rev-v1',
          'sealed-name-v1',
          'dna-pair-binding-v1',
          'bred-by-grant-v1',
          'name-code-v1',
          'lab-doc-binding-v1',
          'dating-first-v1',
        ],
      },
    });
    const r3 = await checkTestRegistry(beforeRound3.api);
    expect(!r3.ok && r3.problem).toMatch(
      /is missing sealed-custody-v1 \(locked sample details\), which this site uses/,
    );
    // A registry from before it kept a record's rev: it would refuse every save that carries one.
    const beforeRev = await stub({
      descriptor: preprod,
      health: {
        ok: true,
        features: [
          'sealed-records-v1',
          'lab-results-v1',
          'animal-profile-v1',
          'claimant-offer-v1',
          'sealed-custody-v1',
          'license-rev-v1',
          'sealed-name-v1',
          'dna-pair-binding-v1',
          'bred-by-grant-v1',
          'name-code-v1',
          'lab-doc-binding-v1',
          'dating-first-v1',
        ],
      },
    });
    const r4 = await checkTestRegistry(beforeRev.api);
    expect(!r4.ok && r4.problem).toMatch(
      /is missing record-rev-v1 \(refusing an older copy of a record\), which this site uses/,
    );
    // A registry from before round 4: it would refuse every agreement save that carries a rev.
    const beforeLicenceRev = await stub({
      descriptor: preprod,
      health: {
        ok: true,
        features: [
          'sealed-records-v1',
          'lab-results-v1',
          'animal-profile-v1',
          'claimant-offer-v1',
          'sealed-custody-v1',
          'record-rev-v1',
          'sealed-name-v1',
          'dna-pair-binding-v1',
          'bred-by-grant-v1',
          'name-code-v1',
          'lab-doc-binding-v1',
          'dating-first-v1',
        ],
      },
    });
    const r5 = await checkTestRegistry(beforeLicenceRev.api);
    expect(!r5.ok && r5.problem).toMatch(
      /is missing license-rev-v1 \(refusing an older copy of an agreement\), which this site uses/,
    );
    // A registry from before round 5: it would keep record names readable, and still answer a
    // saved DNA report's plain value (CONTRACT.md #28, #29).
    const beforeRound5 = await stub({
      descriptor: preprod,
      health: { ok: true, features: ALL.filter((f) => f !== 'sealed-name-v1' && f !== 'dna-pair-binding-v1') },
    });
    const r6 = await checkTestRegistry(beforeRound5.api);
    expect(!r6.ok && r6.problem).toMatch(
      /is missing sealed-name-v1 \(locked record names\), dna-pair-binding-v1 \(DNA reports shown only as a bound code\), which this site uses/,
    );
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

// Round 6 (CONTRACT.md #35, the fifth review's finding 4): deploy:prod, the test-network site on
// veilcore.org, had no features check. Run against the registry from before round 5, every
// save from the new site was refused ("strainName must be a string of at most 500 characters").
describe('deploy:prod', () => {
  const preprod = { anchors: [{ chain: 'midnight', network: 'preprod', contractAddress: 'ab'.repeat(32) }] };
  /** What the registry before round 5 listed (the review's reg-old). */
  const BEFORE_ROUND5 = ALL.filter(
    (f) =>
      ![
        'sealed-name-v1',
        'dna-pair-binding-v1',
        'bred-by-grant-v1',
        'name-code-v1',
        'lab-doc-binding-v1',
        'dating-first-v1',
      ].includes(f),
  );

  it('refuses a registry that lacks a feature the site uses, naming it, as deploy:test and deploy:mainnet do', async () => {
    const old = await stub({ descriptor: preprod, health: { ok: true, features: BEFORE_ROUND5 } });
    const refused = await runScript('site-prod-preflight.mjs', { VITE_API_BASE: old.api });
    expect(refused.code, refused.text).toBe(1);
    expect(refused.text).toMatch(/NOT DEPLOYED\. The registry at .* is missing sealed-name-v1 \(locked record names\)/);
    expect(refused.text).toMatch(DEPLOY_FIRST);
    expect(refused.text).not.toMatch(/Building the test-network site/);
    expect(old.asked).toContain('/health');

    const ready = await stub({ descriptor: preprod });
    const ok = await runScript('site-prod-preflight.mjs', { VITE_API_BASE: ready.api });
    expect(ok.code, ok.text).toBe(0);
    expect(ok.text).toContain(featuresLine(ready.api));
    expect(ok.text).toMatch(/Building the test-network site\./);
  }, 30_000);

  it('still refuses a registry that anchors on mainnet first, without asking /health', async () => {
    const mainnet = await stub({ descriptor: { anchors: [{ network: 'mainnet' }] } });
    const r = await runScript('site-prod-preflight.mjs', { VITE_API_BASE: mainnet.api });
    expect(r.code).toBe(1);
    expect(r.text).toMatch(/NOT DEPLOYED\. The registry anchors on mainnet now/);
    expect(mainnet.asked).not.toContain('/health');
  }, 30_000);

  it('all three deploy commands check the registry first and write a release manifest', () => {
    const pkg = (
      JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as { scripts: Record<string, string> }
    ).scripts;
    expect(pkg['deploy:prod']).toMatch(/^VITE_API_BASE=\S+ node scripts\/site-prod-preflight\.mjs && /);
    expect(pkg['deploy:mainnet']).toBe('node scripts/deploy-mainnet.mjs');
    const main = fs.readFileSync(path.join(ROOT, 'scripts', 'deploy-mainnet.mjs'), 'utf8');
    expect(main.indexOf("run('node', ['scripts/site-mainnet-preflight.mjs'])")).toBeGreaterThan(-1);
    expect(main.indexOf("run('node', ['scripts/site-mainnet-preflight.mjs'])")).toBeLessThan(
      main.indexOf("'build:mainnet'"),
    );
    expect(pkg['deploy:test']).toBe('node scripts/deploy-test-site.mjs');
    for (const f of ['site-prod-preflight.mjs', 'site-mainnet-preflight.mjs', 'deploy-test-site.mjs'])
      expect(fs.readFileSync(path.join(ROOT, 'scripts', f), 'utf8'), f).toMatch(/checkRegistryFeatures\(/);
    expect(pkg['deploy:prod']).toMatch(
      /node scripts\/vercel-config\.mjs && node scripts\/release-manifest\.mjs prod \.vercel\/output\/static && npm ci --prefix tools\/vercel/,
    );
    for (const s of Object.values(pkg)) expect(s).not.toMatch(/git\s+push/);
  });
});
