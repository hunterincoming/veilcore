// Keeps deployments/*.json in step with everything else that states the same facts:
// docs/fingerprints.md, the README's address table, the pinned mainnet addresses
// (api/src/deploy-guard.ts), the deployment record, the generated table the partner kit ships
// (partner-kit/src/fingerprints.ts), the key and ZKIR files every site release served
// (releases/<network>/*.json), and the pinned toolchain (compiler-version, .nvmrc, CI, README).
// Run: node --test scripts/deployments.test.mjs
// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import {
  NETWORKS,
  ROOT,
  artefactRows,
  loadDeployments,
  parseFingerprints,
  pinnedCompiler,
  readJson,
  schema,
  tableDifferences,
  validate,
  verifierPins,
} from './deployments.mjs';
import { compareCompiler, installedCompiler } from './check-compiler.mjs';

const read = (f) => readFileSync(path.join(ROOT, f), 'utf8');
const fingerprints = parseFingerprints(read('docs/fingerprints.md'));
const deployments = Object.fromEntries(NETWORKS.map((n) => [n, loadDeployments(n)]));
/** Contract version 1's entries; version 2's ("contractVersion": 2, the pin) are checked on their own below. */
const isV1 = (c) => (c.contractVersion ?? 1) === 1;
const byName = (d, name) => d.contracts.find((c) => c.name === name && isV1(c));

test('every deployments/*.json file conforms to the schema and is a known network', () => {
  const files = readdirSync(path.join(ROOT, 'deployments')).filter((f) => f.endsWith('.json') && f !== 'schema.json');
  assert.deepEqual(files.sort(), NETWORKS.map((n) => `${n}.json`).sort());
  for (const n of NETWORKS) {
    assert.deepEqual(validate(schema(), readJson(path.join(ROOT, 'deployments', `${n}.json`))), []);
    assert.deepEqual(deployments[n].contracts.filter(isV1).map((c) => c.name).sort(), ['veilcore', 'veilcore-claims']);
  }
});

// Pinning contract v2 is adding its entries to deployments/mainnet.json (docs/contract-v2.md 3.1;
// api/src/pinned-contracts.ts reads them). The schema takes such an entry as it will be written.
test('the schema takes a version 2 entry, and refuses a bad one', () => {
  const d = readJson(path.join(ROOT, 'deployments', 'mainnet.json'));
  const v2 = {
    ...structuredClone(byName(d, 'veilcore')),
    contractVersion: 2,
    source: 'contract-v2/src/veilcore.compact',
    address: 'f2'.repeat(32),
    compiler: '0.36.1',
    compactRuntime: '0.21.0',
    ledgerVersion: 9,
    keyStates: [{ retired: false, committee: 1, threshold: 1, counter: 24, block: 3600000, label: 'one key, not yet handed to the committee' }],
  };
  assert.deepEqual(validate(schema(), { ...d, contracts: [...d.contracts, v2] }), []);
  const errs = validate(schema(), {
    ...d,
    contracts: [...d.contracts, { ...v2, contractVersion: 3, source: 'elsewhere/v2.compact', keyStates: [{ retired: 'no' }] }],
  }).join('\n');
  for (const want of ['contractVersion: must be one of 1, 2', 'source', 'keyStates[0].retired', 'keyStates[0]: "label" is missing'])
    assert.ok(errs.includes(want), `expected an error naming ${want}:\n${errs}`);
});

test('a pinned version 2 entry: its keys are docs/fingerprints-v2.md, its compiler contract-v2\'s, its states and record published', async () => {
  const pinned = NETWORKS.flatMap((n) => deployments[n].contracts.filter((c) => !isV1(c)).map((c) => [n, c]));
  if (pinned.length === 0) return; // Not pinned yet (docs/runbooks/deploy-v2.md, step 17).
  const { loadFingerprintsV2 } = await import('./v2/fingerprints.mjs');
  const table = loadFingerprintsV2();
  for (const [n, c] of pinned) {
    assert.equal(c.compiler, read('contract-v2/compiler-version').trim(), `${n} ${c.name} v2 compiler`);
    assert.ok(Array.isArray(c.keyStates) && c.keyStates.length > 0, `${n} ${c.name} v2 keyStates`);
    assert.deepEqual(verifierPins(c), table.pins[c.name], `${n} ${c.name} v2 verifier keys`);
    assert.ok(read(c.deployment.record.split('#')[0]).includes(c.address), `${c.deployment.record} names ${c.address}`);
  }
});

// Pinning v2 adds entries to deployments/mainnet.json; it never edits or removes v1's. The
// fields v1's entries hold today are frozen (a SHA-256 of each one's sorted JSON, every field
// but maintenanceAuthority, which changes when v1 is sealed). New fields, like keyStates after
// the seal, may be added. If this fails, a v1 entry was changed: put it back.
const V1_FROZEN = {
  veilcore: {
    address: 'a04de0a2684f3713276325649540c7278ffd07cba8b014e7489844f319a02347',
    anchorBatch: '8ae5b4c15c3a20993e8d34b4022d180d95ed2d88927fca184527ca6857f06104',
    digest: '47e9d7c10808a68e2ff4a9826cd2bdb971247c2a5aa9d2ae29dad41a6aee6952',
  },
  'veilcore-claims': {
    address: 'ef763eb4ad1846b716dbfa90c00560a9a943ffb4d1fc638b0707df5adefd070d',
    digest: '2a99bfc624633c51e3fe47676f9bd31b953dc03329fcacdf604e42abfd768353',
  },
};
const V1_FIELDS = [
  'name', 'source', 'address', 'network', 'compiler', 'compactRuntime', 'ledgerVersion', 'commit',
  'sourceCommit', 'fingerprintsCommit', 'deployment', 'contractCode', 'circuits',
];
const canonical = (v) =>
  Array.isArray(v)
    ? `[${v.map(canonical).join(',')}]`
    : v !== null && typeof v === 'object'
      ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`
      : JSON.stringify(v);

test('v1\'s mainnet entries never change: same addresses, same verifier keys, every field as filed', async () => {
  const { createHash } = await import('node:crypto');
  const d = readJson(path.join(ROOT, 'deployments', 'mainnet.json'));
  for (const [name, want] of Object.entries(V1_FROZEN)) {
    const all = d.contracts.filter((c) => c.name === name && isV1(c));
    assert.equal(all.length, 1, `exactly one v1 ${name} entry in deployments/mainnet.json`);
    const [c] = all;
    assert.equal(c.address, want.address, `${name} address`);
    if (want.anchorBatch) assert.equal(c.circuits.anchorBatch.verifierKey, want.anchorBatch, `${name} anchorBatch key`);
    for (const f of V1_FIELDS) assert.ok(f in c, `${name}.${f} is still there`);
    const kept = Object.fromEntries(V1_FIELDS.map((f) => [f, c[f]]));
    assert.equal(createHash('sha256').update(canonical(kept)).digest('hex'), want.digest, `${name}: a filed field changed`);
  }
});

test('the schema validator refuses what it should', () => {
  const good = readJson(path.join(ROOT, 'deployments', 'mainnet.json'));
  const bad = structuredClone(good);
  bad.contracts[0].circuits.anchor.verifierKey = 'ABC';
  bad.contracts[1].address = 'a04de0a2';
  delete bad.contracts[1].commit;
  bad.surprise = true;
  bad.contracts[0].maintenanceAuthority.counter = 'sixteen';
  const errs = validate(schema(), bad).join('\n');
  for (const want of ['anchor.verifierKey', 'contracts[1].address', '"commit" is missing', '.surprise: not allowed', 'maintenanceAuthority.counter'])
    assert.ok(errs.includes(want), `expected an error naming ${want}:\n${errs}`);
  assert.ok(validate({ type: 'object', if: {} }, {}).some((e) => /does not check/.test(e)), 'an unknown keyword is an error');
});

test('every artefact hash equals docs/fingerprints.md, in both directions, for both networks', () => {
  for (const n of NETWORKS)
    for (const name of ['veilcore', 'veilcore-claims']) {
      const c = byName(deployments[n], name);
      assert.deepEqual(tableDifferences(artefactRows(c), fingerprints[name].rows, `deployments/${n}.json`, 'docs/fingerprints.md'), [], `${n} ${name}`);
    }
  assert.equal(fingerprints.veilcore.rows.size, 97);
  assert.equal(fingerprints['veilcore-claims'].rows.size, 21);
  assert.equal(Object.keys(byName(deployments.mainnet, 'veilcore').circuits).length, 24);
  assert.equal(Object.keys(byName(deployments.mainnet, 'veilcore-claims').circuits).length, 5);
});

test('the build commit and compiler agree with the fingerprints header', () => {
  for (const name of ['veilcore', 'veilcore-claims']) {
    const c = byName(deployments.mainnet, name);
    assert.ok(c.commit.startsWith(fingerprints[name].commit), `${name}: ${c.commit} vs fingerprints ${fingerprints[name].commit}`);
    assert.equal(c.compiler, fingerprints[name].compiler);
  }
});

test('the README lists exactly the mainnet addresses', () => {
  const readme = read('README.md');
  const table = readme.slice(readme.indexOf('## On mainnet since'), readme.indexOf('## Where it stands'));
  const listed = [...table.matchAll(/`([0-9a-f]{64})`/g)].map((m) => m[1]).sort();
  assert.deepEqual(listed, deployments.mainnet.contracts.map((c) => c.address).sort());
  assert.match(table, /`veilcore\.compact`[^|]*\| `a04de0a2/);
  assert.match(table, /`veilcore-claims\.compact`[^|]*\| `ef763eb4/);
  assert.match(readme, /npm run verify:deployment -- --network mainnet/);
  assert.match(readme, /docs\/reproduce-build\.md/);
});

test('the addresses pinned in api/src/deploy-guard.ts are the deployments file\'s', () => {
  const guard = read('api/src/deploy-guard.ts');
  const pin = (n) => new RegExp(`export const ${n}(?:: string)? = '([0-9a-f]{64})'`).exec(guard)?.[1];
  assert.equal(pin('MAINNET_VEILCORE_ADDRESS'), byName(deployments.mainnet, 'veilcore').address);
  assert.equal(pin('MAINNET_CLAIMS_ADDRESS'), byName(deployments.mainnet, 'veilcore-claims').address);
});

test('the deployment record carries each mainnet address, deploy transaction and block', () => {
  const rec = read('docs/deployment-record-revision-4.md');
  const at = rec.indexOf('### Mainnet deployment');
  assert.ok(at > 0);
  const section = rec.slice(at, rec.indexOf('\n### ', at + 1));
  for (const c of deployments.mainnet.contracts.filter(isV1)) {
    assert.ok(section.includes(c.address), `${c.name} address`);
    assert.ok(section.includes(c.deployment.transaction), `${c.name} deploy transaction`);
    assert.ok(section.includes(`block ${c.deployment.block}`), `${c.name} block`);
    assert.ok(section.includes(c.commit.slice(0, 7)) && section.includes(c.sourceCommit.slice(0, 7)) && section.includes(c.fingerprintsCommit.slice(0, 7)), `${c.name} commits`);
    if (c.maintenanceAuthority.retiredBy) assert.ok(section.includes(c.maintenanceAuthority.retiredBy), `${c.name} retirement`);
  }
  for (const c of deployments.mainnet.contracts) assert.ok(existsSync(path.join(ROOT, c.deployment.record.split('#')[0])));
  for (const c of deployments.preprod.contracts.filter(isV1)) {
    assert.ok(existsSync(path.join(ROOT, c.deployment.record)), c.deployment.record);
    assert.ok(read(c.deployment.record).includes(c.address), `${c.deployment.record} names ${c.address}`);
  }
});

test('the partner kit\'s generated table is the same build', () => {
  const src = read('partner-kit/src/fingerprints.ts');
  for (const name of ['veilcore', 'veilcore-claims']) {
    const block = new RegExp(`'?${name}'?: \\{([^}]*)\\}`).exec(src)?.[1] ?? '';
    const rows = new Map([...block.matchAll(/'([^']+)': '([0-9a-f]{64})'/g)].map((m) => [m[1], m[2]]));
    assert.deepEqual(tableDifferences(rows, artefactRows(byName(deployments.mainnet, name)), 'partner-kit/src/fingerprints.ts', 'deployments/mainnet.json'), [], name);
  }
});

test('every key and ZKIR file each site release served is the published build', () => {
  for (const n of NETWORKS) {
    const all = new Map();
    for (const c of deployments[n].contracts) for (const [f, h] of artefactRows(c)) if (!f.startsWith('contract/')) all.set(`/${f}`, h);
    const dir = path.join(ROOT, 'releases', n);
    let files = 0;
    let checked = 0;
    for (const m of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
      const manifest = readJson(path.join(dir, m));
      files++;
      for (const [served, h] of Object.entries(manifest.files)) {
        if (!/^\/(keys|zkir)\//.test(served)) continue;
        checked++;
        assert.ok(all.has(served), `releases/${n}/${m} serves ${served}, which is not an artefact of deployments/${n}.json`);
        assert.equal(h, all.get(served), `releases/${n}/${m}: ${served}`);
      }
      const s = manifest.build?.settings ?? {};
      if (s.VITE_REAL_CHAIN_CONTRACT_ADDRESS) assert.equal(s.VITE_REAL_CHAIN_CONTRACT_ADDRESS, byName(deployments[n], 'veilcore').address, `releases/${n}/${m}`);
      if (s.VITE_REAL_CHAIN_CLAIMS_ADDRESS) assert.equal(s.VITE_REAL_CHAIN_CLAIMS_ADDRESS, byName(deployments[n], 'veilcore-claims').address, `releases/${n}/${m}`);
    }
    assert.ok(files > 0 && checked > 0, `releases/${n} has manifests with keys`);
  }
});

test('the relay each deployments file names is the one the latest site release reads through', () => {
  for (const n of NETWORKS) {
    const dir = path.join(ROOT, 'releases', n);
    const latest = readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => readJson(path.join(dir, f)))
      .sort((a, b) => a.date.localeCompare(b.date))
      .at(-1);
    const relay = deployments[n].indexers.find((i) => i.projectIdEnv === undefined);
    assert.equal(relay.url, latest.build.settings.VITE_INDEXER_URL, n);
    for (const i of deployments[n].indexers) assert.doesNotMatch(i.url, /project_id|key=|token/i);
  }
});

test('one compiler and one Node version everywhere', () => {
  const v = pinnedCompiler();
  assert.match(v, /^\d+\.\d+\.\d+$/);
  for (const n of NETWORKS) {
    assert.equal(deployments[n].toolchain.compiler, v);
    for (const c of deployments[n].contracts.filter(isV1)) assert.equal(c.compiler, v);
    assert.equal(deployments[n].toolchain.node, read('.nvmrc').trim());
  }
  assert.equal(/COMPACTC_VERSION: "([^"]+)"/.exec(read('.github/actions/setup/action.yml'))?.[1], v);
  assert.match(read('.github/actions/setup/action.yml'), new RegExp(`test "\\$v" = "${v.replace(/\./g, '\\.')}"`));
  assert.equal(/compact update (\d+\.\d+\.\d+)/.exec(read('README.md'))?.[1], v);
  assert.equal(/compact update (\d+\.\d+\.\d+)/.exec(read('docs/reproduce-build.md'))?.[1], v);
  const rt = readJson(path.join(ROOT, 'package.json')).dependencies['@midnight-ntwrk/compact-runtime'];
  for (const n of NETWORKS) for (const c of deployments[n].contracts.filter(isV1)) assert.equal(c.compactRuntime, rt);
});

test('the circuit pins a verifier would use are the 24 + 5 verifier keys', () => {
  const main = verifierPins(byName(deployments.mainnet, 'veilcore'));
  assert.equal(main.proveLicense, 'b338dda3501ae2dec26b241b353495580debcb359455b0671b6619197f29d59b');
  assert.equal(main.proveOwnership, fingerprints.veilcore.rows.get('keys/proveOwnership.verifier'));
  assert.deepEqual(Object.keys(verifierPins(byName(deployments.mainnet, 'veilcore-claims'))).sort(), ['proveAttested', 'proveDistinct', 'proveRange', 'proveUnchanged', 'proveValue']);
});

test('the compiler check: match, mismatch, none', () => {
  assert.equal(compareCompiler('0.31.1', '0.31.1').ok, true);
  const w = compareCompiler('0.35.0', '0.31.1');
  assert.equal(w.level, 'warn');
  assert.match(w.message, /0\.35\.0 is installed.*0\.31\.1/);
  assert.equal(compareCompiler(undefined, '0.31.1').level, 'error');
  assert.equal(installedCompiler((cmd) => (cmd === 'compact' ? '0.31.1' : undefined)), '0.31.1');
  assert.equal(installedCompiler((cmd) => (cmd === 'compactc' ? 'compactc 0.31.1 (abc)' : undefined)), '0.31.1');
  assert.equal(installedCompiler(() => undefined), undefined);
});

test('no link to the repository\'s old name', () => {
  for (const f of ['README.md', ...readdirSync(path.join(ROOT, 'docs')).filter((x) => x.endsWith('.md')).map((x) => `docs/${x}`)])
    assert.doesNotMatch(read(f), /github\.com\/hunterincoming\/veilcore-midnight-testnet/, f);
});

test('verify:build with nothing built cannot check (exit 2), with --partial too; a built file that differs FAILs (exit 1)', async () => {
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { spawnSync } = await import('node:child_process');
  const dir = mkdtempSync(path.join(tmpdir(), 'verify-build-'));
  try {
    for (const c of deployments.mainnet.contracts) mkdirSync(path.join(dir, c.name), { recursive: true });
    const run = (...extra) =>
      spawnSync(process.execPath, ['scripts/verify-build.mjs', '--network', 'mainnet', '--managed', dir, ...extra], {
        cwd: ROOT,
        encoding: 'utf8',
      });
    for (const extra of [[], ['--partial']]) {
      const r = run(...extra);
      assert.equal(r.status, 2, r.stdout + r.stderr);
      assert.match(r.stdout, /CANNOT CHECK: nothing to compare\. None of the 118 artefacts/);
      assert.doesNotMatch(r.stdout, /PASS/);
    }
    // One file there, and not the published one.
    mkdirSync(path.join(dir, 'veilcore', 'contract'), { recursive: true });
    writeFileSync(path.join(dir, 'veilcore', 'contract', 'index.js'), 'not the build\n');
    const r = run('--partial');
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /DIFFERS {2}contract\/index\.js/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// The CLI tools (deploy-v2, smoke-v2, committee) load these sources with Node's own ESM loader
// (ts-node/esm), which refuses a JSON import without `with { type: 'json' }`. A bundler doesn't
// care, so the site and the kit's tests pass either way; only the Mac's deploy run fails.
test('every JSON import the CLI can reach carries the json import attribute', () => {
  const here = path.dirname(new URL(import.meta.url).pathname);
  const root = path.join(here, '..');
  const bad = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === 'dist' || e.name === 'managed') continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(ts|mts|mjs)$/.test(e.name) && !/\.test\./.test(e.name)) {
        readFileSync(p, 'utf8').split('\n').forEach((line, i) => {
          if (/^\s*import\s.+\sfrom\s+['"][^'"]+\.json['"]/.test(line) && !/\bwith\s*\{\s*type:\s*['"]json['"]\s*\}/.test(line))
            bad.push(`${path.relative(root, p)}:${i + 1}`);
        });
      }
    }
  };
  for (const d of ['api/src', 'partner-kit/src', 'bboard-cli/src', 'scripts']) {
    if (existsSync(path.join(root, d))) walk(path.join(root, d));
  }
  assert.deepEqual(bad, [], `JSON imports without \`with { type: 'json' }\`: ${bad.join(', ')}`);
});
