// Where shared links point, and whether lab reports are offered, per network (round 3).
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalOriginFor, LAB_RESULTS_ENABLED, labResultsEnabledFor, NETWORK } from './network';
import { shareCodeFor } from '../veilcore/transfers';
import { mainnetOriginProblem } from '../../../scripts/canonical-origin.mjs';
import { DEFAULT_API } from '../../../scripts/site-mainnet-preflight.mjs';

describe('the origin shared links point at', () => {
  it("is veilcore.org on mainnet without a setting, whatever the host (veilcore.org's own build)", () => {
    expect(canonicalOriginFor({ mainnet: true })).toBe('https://veilcore.org');
    expect(canonicalOriginFor({ mainnet: true, configured: undefined, here: 'https://x.dev' })).toBe(
      'https://veilcore.org',
    );
    expect(canonicalOriginFor({ mainnet: true, configured: '', here: 'https://preview-1.vercel.app' })).toBe(
      'https://veilcore.org',
    );
    expect(canonicalOriginFor({ mainnet: true, configured: '  ', here: 'http://localhost:5173' })).toBe(
      'https://veilcore.org',
    );
  });

  it('on mainnet with a setting, is that setting: a copy someone runs with its own registry (docs/SELF-HOSTING.md)', () => {
    expect(
      canonicalOriginFor({ mainnet: true, configured: 'https://records.example.org', here: 'https://x.dev' }),
    ).toBe('https://records.example.org');
    expect(canonicalOriginFor({ mainnet: true, configured: 'https://records.example.org/' })).toBe(
      'https://records.example.org',
    );
    // Never the host it happens to be served from, and never a setting that isn't a plain https origin
    // (vite.config.ts refuses those before building: scripts/canonical-origin.mjs).
    for (const bad of [
      'http://records.example.org',
      'https://records.example.org/app',
      'https://a.org/?x=1',
      'nonsense',
    ])
      expect(canonicalOriginFor({ mainnet: true, configured: bad, here: 'https://x.dev' }), bad).toBe(
        'https://veilcore.org',
      );
  });

  it('on a test network without a setting, is the site it is served from, not veilcore.org', () => {
    expect(canonicalOriginFor({ mainnet: false, here: 'http://localhost:5173' })).toBe('http://localhost:5173');
    expect(canonicalOriginFor({ mainnet: false, configured: '  ', here: 'https://preview-123.vercel.app' })).toBe(
      'https://preview-123.vercel.app',
    );
  });

  it('on a test network with a setting, is that setting when it is a plain https origin', () => {
    expect(canonicalOriginFor({ mainnet: false, configured: 'https://test.veilcore.org/', here: 'http://x' })).toBe(
      'https://test.veilcore.org',
    );
    // A setting that isn't a plain https origin is not used.
    expect(canonicalOriginFor({ mainnet: false, configured: 'http://test.veilcore.org', here: 'http://x.local' })).toBe(
      'http://x.local',
    );
    expect(canonicalOriginFor({ mainnet: false, configured: 'https://a.org/path', here: 'http://x.local' })).toBe(
      'http://x.local',
    );
  });

  it('never uses a host that isn’t http(s), and falls back to veilcore.org with no window', () => {
    expect(canonicalOriginFor({ mainnet: false })).toBe('https://veilcore.org');
    expect(canonicalOriginFor({ mainnet: false, here: 'null' })).toBe('https://veilcore.org');
    expect(canonicalOriginFor({ mainnet: false, here: 'file://' })).toBe('https://veilcore.org');
  });
});

describe("a mainnet build's link origin, checked before building (scripts/canonical-origin.mjs)", () => {
  it("veilcore.org's build (VeilCore's registry, no setting) builds as before", () => {
    expect(mainnetOriginProblem({ api: DEFAULT_API })).toBeUndefined();
    expect(mainnetOriginProblem({ api: `${DEFAULT_API}/`, canonical: '' })).toBeUndefined();
    expect(mainnetOriginProblem({ api: DEFAULT_API, canonical: 'https://veilcore.org' })).toBeUndefined();
  });

  it("refuses veilcore.org's build with another origin left in the shell (a test-site run)", () => {
    expect(mainnetOriginProblem({ api: DEFAULT_API, canonical: 'https://test.veilcore.org' })).toMatch(
      /unset VITE_CANONICAL_ORIGIN/,
    );
    expect(mainnetOriginProblem({ api: DEFAULT_API, canonical: 'https://records.example.org' })).toMatch(
      /VeilCore's registry/,
    );
  });

  it('refuses a copy with its own registry unless it names its own address', () => {
    const api = 'https://registry.example.org';
    expect(mainnetOriginProblem({ api })).toMatch(/set VITE_CANONICAL_ORIGIN to this site's own https address/);
    expect(mainnetOriginProblem({ api, canonical: 'https://veilcore.org' })).toMatch(/never heard of your records/);
    expect(mainnetOriginProblem({ api, canonical: 'https://records.example.org' })).toBeUndefined();
  });

  it('refuses a setting that is not a plain https origin, rather than quietly pointing at veilcore.org', () => {
    for (const bad of ['http://records.example.org', 'https://records.example.org/app', 'records.example.org'])
      expect(mainnetOriginProblem({ api: 'https://registry.example.org', canonical: bad }), bad).toMatch(
        /plain https address/,
      );
  });
});

describe('lab reports through the registry', () => {
  it('are on for every network, mainnet included (16 Oct 2026)', () => {
    for (const n of ['mainnet', 'preprod', 'preview', 'undeployed']) expect(labResultsEnabledFor(n), n).toBe(true);
    // This test build is preprod (vitest.config.ts).
    expect(NETWORK).toBe('preprod');
    expect(LAB_RESULTS_ENABLED).toBe(true);
  });

  it('with them off on a network, a lab code carries no lock (SendToLab passes none)', () => {
    const claim = 'ab'.repeat(16);
    expect(shareCodeFor('TR-0A1B2C3D', claim, undefined)).toBe(`TR-0A1B2C3D.${claim}`);
  });
});

describe('every place that offers lab reports reads the one flag', () => {
  // A cheap guard: a screen that offers lab reports without asking the flag would still
  // offer them on a network where they are switched off again (config/network.ts).
  const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const read = (f: string) => fs.readFileSync(path.join(SRC, f), 'utf8');
  it.each([
    // Round 4 (F5): the record secret is saved sealed first, only where lab reports are on.
    ['components/SendToLab.tsx', /if \(LAB_RESULTS_ENABLED\) \{\s*const saved = await recordSecretSaved/],
    ['components/RecordDetail.tsx', /LAB_RESULTS_ENABLED && record\.receivedFrom/],
    ['components/flow/LabResults.tsx', /LAB_RESULTS_ENABLED \? await arrivedOn/],
    ['components/flow/LabResults.tsx', /if \(!LAB_RESULTS_ENABLED\) \{/],
    ['components/NextStep.tsx', /!LAB_RESULTS_ENABLED/],
    ['components/flow/PlantParts.tsx', /LAB_RESULTS_ENABLED/],
  ])('%s', (file, re) => {
    expect(read(file)).toMatch(re);
  });
});
