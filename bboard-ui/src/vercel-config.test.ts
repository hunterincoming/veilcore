// scripts/vercel-config.mjs refuses to deploy a build whose indexer addresses would publish
// a key, or read over plain http: the same rules as the page's own (chain/config.ts).
// SPDX-License-Identifier: Apache-2.0
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../scripts/vercel-config.mjs');

/** Run the script with these settings; its error, or the connect-src it wrote. */
const run = (extra: Record<string, string>): { error?: string; connect?: string } => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vcfg-test-'));
  fs.mkdirSync(path.join(dir, '.vercel/output'), { recursive: true });
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([k]) => !/^VITE_(REAL_CHAIN|SPONSOR_URL|INDEXER|NETWORK_ID)/.test(k)),
  );
  const r = spawnSync(process.execPath, [SCRIPT], {
    cwd: dir,
    env: { ...env, VITE_API_BASE: 'https://registry.example', ...extra },
    encoding: 'utf8',
  });
  if (r.status !== 0) return { error: String(r.stderr) };
  const cfg = JSON.parse(fs.readFileSync(path.join(dir, '.vercel/output/config.json'), 'utf8')) as {
    routes: { headers?: Record<string, string> }[];
  };
  const csp = cfg.routes[0].headers?.['Content-Security-Policy'] ?? '';
  return { connect: csp.split('; ').find((d) => d.startsWith('connect-src')) };
};

describe('scripts/vercel-config.mjs: no key, no plain http, in any indexer address', () => {
  it('refuses a key, found by its decoded name, in the relay or the second indexer', () => {
    for (const name of ['VITE_INDEXER_RELAY_URL', 'VITE_INDEXER_SECOND_URL'])
      for (const v of [
        'https://relay.example/indexer?project_id=x',
        'https://relay.example/indexer?project%5Fid=x',
        'https://relay.example/indexer?api_key=x',
        'https://relay.example/indexer?key=x',
        'https://relay.example/indexer?token=x',
        'https://relay.example/indexer#token=x',
        'https://u:p@relay.example/indexer',
      ])
        expect(run({ [name]: v }).error, `${name}=${v}`).toMatch(/carries a key/);
  });

  it('refuses a key in the chain features’ indexer (the check page’s test-network fallback), with or without the flag', () => {
    const flags: Record<string, string>[] = [{}, { VITE_REAL_CHAIN: '1', VITE_SPONSOR_URL: 'https://sponsor.example' }];
    for (const flag of flags) {
      expect(
        run({
          ...flag,
          VITE_INDEXER_URL: 'https://x.blockfrost.io/api?project%5Fid=x',
          VITE_INDEXER_WS_URL: 'wss://x/ws',
        }).error,
      ).toMatch(/VITE_INDEXER_URL carries a key/);
      expect(
        run({ ...flag, VITE_INDEXER_URL: 'https://x/graphql', VITE_INDEXER_WS_URL: 'wss://x/ws?token=x' }).error,
      ).toMatch(/VITE_INDEXER_WS_URL carries a key/);
    }
  });

  it('refuses plain http', () => {
    expect(run({ VITE_INDEXER_RELAY_URL: 'http://relay.example/indexer' }).error).toMatch(/must be an https address/);
    expect(run({ VITE_INDEXER_URL: 'http://x/graphql' }).error).toMatch(/VITE_INDEXER_URL must start with https:\/\//);
    expect(run({ VITE_INDEXER_WS_URL: 'ws://x/ws' }).error).toMatch(/VITE_INDEXER_WS_URL must start with wss:\/\//);
  });

  it('refuses a second indexer that is the first one written differently', () => {
    expect(
      run({
        VITE_INDEXER_RELAY_URL: 'https://relay.example/indexer',
        VITE_INDEXER_SECOND_URL: 'https://RELAY.example:443/indexer/',
      }).error,
    ).toMatch(/same indexer/);
  });

  it('a clean relay and a second indexer: both allowed in connect-src', () => {
    const r = run({
      VITE_INDEXER_RELAY_URL: 'https://relay.example/indexer',
      VITE_INDEXER_SECOND_URL: 'https://second.example/graphql',
    });
    expect(r.error).toBeUndefined();
    expect(r.connect).toContain('https://relay.example');
    expect(r.connect).toContain('https://second.example');
  });
});
