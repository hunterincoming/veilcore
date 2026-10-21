import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { assertNotForbidden, assertNotMaintenanceKey, ConfigError, loadConfig, MAINNET_CONTRACT, SPECKS_PER_DUST } from './config.js';
import { AGREEMENT_CIRCUITS, PHASE1_PUBLIC_CIRCUITS } from './policy.js';

const base = {
  SPONSOR_SEED: '11'.repeat(32),
  SPONSOR_FORBIDDEN_ADDRESSES: 'mn_addr_preprod1deployer',
  VEILCORE_CONTRACT_ADDRESS: '9c7b69275e53acc38fcbebff93c53febe46a3898580c11fd2c4b923fc5efb7a3',
  PROOF_SERVER_URL: 'http://proof-server.railway.internal:6300',
  BLOCKFROST_PROJECT_ID: 'preprodTestProjectId123',
};

const problems = (env: Record<string, string>): string[] => {
  try {
    loadConfig(env);
    return [];
  } catch (e) {
    if (e instanceof ConfigError) return [...e.problems];
    throw e;
  }
};

describe('configuration', () => {
  it('the operator status token is optional, and refused when short or spaced', () => {
    expect(loadConfig(base).statusToken).toBe('');
    expect(loadConfig({ ...base, SPONSOR_STATUS_TOKEN: 'f'.repeat(64) }).statusToken).toBe('f'.repeat(64));
    expect(problems({ ...base, SPONSOR_STATUS_TOKEN: 'short' })).toEqual([expect.stringMatching(/SPONSOR_STATUS_TOKEN/)]);
    expect(problems({ ...base, SPONSOR_STATUS_TOKEN: `${'a'.repeat(20)} ${'b'.repeat(20)}` })).toHaveLength(1);
  });

  it('preprod goes through Blockfrost: a project id is required, kept as a log secret', () => {
    const c = loadConfig(base);
    expect(c.indexer).toBe('https://midnight-preprod.blockfrost.io/api/v0?project_id=preprodTestProjectId123');
    expect(c.indexerWS).toBe('wss://midnight-preprod.blockfrost.io/api/v0/ws?project_id=preprodTestProjectId123');
    expect(c.nodeWS).toBe('wss://rpc.midnight-preprod.blockfrost.io/?project_id=preprodTestProjectId123');
    expect(c.logSecrets).toEqual(['preprodTestProjectId123']);
    const { BLOCKFROST_PROJECT_ID: _drop, ...without } = base;
    void _drop;
    expect(problems(without)).toEqual([expect.stringMatching(/BLOCKFROST_PROJECT_ID is required on preprod.*9 October 2026/)]);
    expect(problems({ ...without, BLOCKFROST_PROJECT_ID: 'x' })).toEqual([expect.stringMatching(/not a Blockfrost project id/)]);
    const own = { INDEXER_URL: 'https://i/graphql', INDEXER_WS_URL: 'wss://i/ws', NODE_WS_URL: 'wss://n' };
    expect(loadConfig({ ...without, ...own })).toMatchObject({ indexer: 'https://i/graphql', logSecrets: [] });
    expect(loadConfig({ ...without, SPONSOR_NETWORK: 'preview' }).indexer).toMatch(/indexer\.preview\.midnight\.network/);
  });

  it('loads with the minimum, with preprod defaults', () => {
    const c = loadConfig(base);
    expect(c.network).toBe('preprod');
    expect(c.indexer).toMatch(/preprod/);
    // A test network pays for the agreement calls too, so they can be tried before mainnet.
    expect([...c.allowedCircuits].sort()).toEqual([...PHASE1_PUBLIC_CIRCUITS, ...AGREEMENT_CIRCUITS].sort());
    expect(c.maxFeeSpecks).toBe(5n * SPECKS_PER_DUST);
    expect(c.anchorer.enabled).toBe(false);
  });

  it('refuses to start next to anything that holds or unlocks the maintenance key', () => {
    expect(problems({ ...base, VEILCORE_PRIVATE_STATE_PASSWORD: 'x' })[0]).toMatch(/maintenance key/);
    expect(problems({ ...base, MAINTENANCE_SIGNING_KEY: 'x' })[0]).toMatch(/maintenance key/);
    expect(problems({ ...base, CONTRACT_AUTHORITY_KEY: 'x' })[0]).toMatch(/maintenance key/);
  });

  it('requires the deployer wallet’s addresses, a seed, a contract and a proof server', () => {
    const p = problems({});
    expect(p.join('\n')).toMatch(/SPONSOR_SEED/);
    expect(p.join('\n')).toMatch(/SPONSOR_FORBIDDEN_ADDRESSES/);
    expect(p.join('\n')).toMatch(/VEILCORE_CONTRACT_ADDRESS/);
    expect(p.join('\n')).toMatch(/PROOF_SERVER_URL/);
  });

  describe('mainnet', () => {
    const main = {
      SPONSOR_SEED: '11'.repeat(32),
      SPONSOR_FORBIDDEN_ADDRESSES: 'mn_addr1deployer,mn_dust1deployer',
      SPONSOR_NETWORK: 'mainnet',
      VEILCORE_CONTRACT_ADDRESS: MAINNET_CONTRACT,
      PROOF_SERVER_URL: 'http://proof-server.railway.internal:6300',
      BLOCKFROST_PROJECT_ID: 'mainnetTestProjectId123',
      DAILY_BUDGET_DUST: '20',
      MAX_FEE_DUST: '1',
      LIMIT_PER_NETWORK_DAY: '30',
      SPONSOR_STATUS_TOKEN: 'f'.repeat(64),
    };

    it('starts with every limit given, on the mainnet Blockfrost hosts', () => {
      const c = loadConfig(main);
      expect(c.network).toBe('mainnet');
      expect(c.indexer).toBe('https://midnight-mainnet.blockfrost.io/api/v0?project_id=mainnetTestProjectId123');
      expect(c.nodeWS).toBe('wss://rpc.midnight-mainnet.blockfrost.io/?project_id=mainnetTestProjectId123');
      expect(c.logSecrets).toEqual(['mainnetTestProjectId123']);
      expect(c.dailyBudgetSpecks).toBe(20n * SPECKS_PER_DUST);
      expect(c.maxFeeSpecks).toBe(1n * SPECKS_PER_DUST);
      expect(c.limits.perIpDay).toBe(30);
      expect([...c.allowedCircuits].sort()).toEqual(['anchor', 'pairDna', 'proveOwnership']);
    });

    it('pays only for VeilCore’s pinned contract, the one api/src/deploy-guard.ts pins', () => {
      expect(readFileSync(new URL('../../api/src/deploy-guard.ts', import.meta.url), 'utf8')).toContain(
        `MAINNET_VEILCORE_ADDRESS: string = '${MAINNET_CONTRACT}'`,
      );
      expect(problems({ ...main, VEILCORE_CONTRACT_ADDRESS: 'ab'.repeat(32) })).toEqual([
        expect.stringMatching(/must be VeilCore's contract/),
      ]);
    });

    it('takes no test default for money or limits', () => {
      for (const k of ['DAILY_BUDGET_DUST', 'MAX_FEE_DUST', 'LIMIT_PER_NETWORK_DAY', 'SPONSOR_STATUS_TOKEN'] as const) {
        const { [k]: _drop, ...without } = main;
        void _drop;
        expect(problems(without)).toEqual([expect.stringContaining(k)]);
      }
    });

    it('refuses a preprod Blockfrost id, hand-set endpoints and a changed circuit list', () => {
      expect(problems({ ...main, BLOCKFROST_PROJECT_ID: 'preprodTestProjectId123' })).toEqual([
        expect.stringMatching(/Mainnet" project id/),
      ]);
      expect(problems({ ...main, INDEXER_URL: 'https://i/graphql' })[0]).toMatch(/BLOCKFROST_PROJECT_ID only/);
      expect(problems({ ...main, SPONSOR_CIRCUITS: 'anchor' })[0]).toMatch(/cannot be changed/);
    });
  });

  it('never allows the job-only circuits to be public', () => {
    expect(problems({ ...base, SPONSOR_CIRCUITS: 'anchor,anchorBatch' })[0]).toMatch(/anchoring job/);
  });

  it('reads DUST amounts with decimals', () => {
    const c = loadConfig({ ...base, MAX_FEE_DUST: '0.25', DAILY_BUDGET_DUST: '12' });
    expect(c.maxFeeSpecks).toBe(SPECKS_PER_DUST / 4n);
    expect(c.dailyBudgetSpecks).toBe(12n * SPECKS_PER_DUST);
    expect(problems({ ...base, MAX_FEE_DUST: 'lots' })[0]).toMatch(/MAX_FEE_DUST/);
  });

  it('turns the anchoring job on only with a registry and its operator token', () => {
    const c = loadConfig({ ...base, REGISTRY_URL: 'https://reg.example', REGISTRY_OPERATOR_TOKEN: 't' });
    expect(c.anchorer).toMatchObject({ enabled: true, everyMs: 3_600_000, sealAtPending: 25 });
  });
});

describe('wallet safety checks', () => {
  it('refuses the deployer’s wallet', () => {
    expect(() => assertNotForbidden(['mn_addr_preprod1sponsor', 'mn_dust_preprod1x'], ['MN_ADDR_PREPROD1SPONSOR'])).toThrow(ConfigError);
    expect(() => assertNotForbidden(['mn_addr_preprod1sponsor'], ['mn_addr_preprod1deployer'])).not.toThrow();
  });

  it('refuses a seed that is the maintenance committee’s key', () => {
    const vk = (sk: string) => `vk-of-${sk}`;
    expect(() => assertNotMaintenanceKey('aa', ['vk-of-aa'], vk)).toThrow(/maintenance key/);
    expect(() => assertNotMaintenanceKey('aa', ['vk-of-bb'], vk)).not.toThrow();
    expect(() =>
      assertNotMaintenanceKey('zz', ['x'], () => {
        throw new Error('not a key');
      }),
    ).not.toThrow();
  });
});

describe('MAX_TTL_MINUTES (first live preprod run, 12 Oct 2026)', () => {
  it('defaults to 65 minutes, above midnight-js\'s one-hour expiry', () => {
    expect(loadConfig(base).maxTtlMs).toBe(65 * 60_000);
  });
  it('refuses a limit under an hour, which would refuse every transaction from the site', () => {
    expect(problems({ ...base, MAX_TTL_MINUTES: '30' }).join(' ')).toMatch(/at least 61/);
    expect(problems({ ...base, MAX_TTL_MINUTES: '61' })).toEqual([]);
  });
});
