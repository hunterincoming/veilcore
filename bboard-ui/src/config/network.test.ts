// Where shared links point, and whether lab reports are offered, per network (round 3).
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalOriginFor, LAB_RESULTS_ENABLED, labResultsEnabledFor, NETWORK } from './network';
import { shareCodeFor } from '../veilcore/transfers';

describe('the origin shared links point at', () => {
  it('is always veilcore.org on mainnet, whatever the setting or the host', () => {
    expect(canonicalOriginFor({ mainnet: true })).toBe('https://veilcore.org');
    expect(canonicalOriginFor({ mainnet: true, configured: 'https://test.veilcore.org', here: 'https://x.dev' })).toBe(
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
    ['components/SendToLab.tsx', /LAB_RESULTS_ENABLED\s*\?\s*await resultRecipientFor/],
    ['components/RecordDetail.tsx', /LAB_RESULTS_ENABLED && record\.receivedFrom/],
    ['components/flow/LabResults.tsx', /LAB_RESULTS_ENABLED \? await arrivedOn/],
    ['components/flow/LabResults.tsx', /if \(!LAB_RESULTS_ENABLED\) \{/],
    ['components/NextStep.tsx', /!LAB_RESULTS_ENABLED/],
    ['components/flow/PlantParts.tsx', /LAB_RESULTS_ENABLED/],
  ])('%s', (file, re) => {
    expect(read(file)).toMatch(re);
  });
});
