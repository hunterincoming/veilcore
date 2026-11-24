// The deployment-record gate, as a decision table that runs.
//
// The first version of this guard lived inside veilcore-api.ts and its table lived
// in a commit message. veilcore-api.ts cannot be imported without the whole managed
// contract bundle, so that table could never be executed — and `api` had no `test`
// script to execute it with. Both are fixed here: the guard is a leaf module, and
// every row below runs against the code that ships.
//
// `decide` is pure so the table can cover networks exhaustively. `setNetworkId` is a
// global singleton with no unset, so the live wiring — getNetworkId throwing when
// nothing has been set, and the lowercasing — is covered by the subprocess rows at
// the bottom, one process each.
//
// SPDX-License-Identifier: Apache-2.0

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  decide,
  MAINNET_CLAIMS_ADDRESS,
  MAINNET_VEILCORE_ADDRESS,
  RECORD_NOT_REQUIRED,
  REQUIRED_RECORD_REVISION,
  versionProblem,
} from './dist/api/src/deploy-guard.js';
import { MAINNET_PINNED, PREPROD_PINNED, pinnedContractsFrom } from './dist/api/src/pinned-contracts.js';

const ALLOW = 'ALLOW';
const REFUSE = 'REFUSE';

// [network, VEILCORE_DEPLOYMENT_RECORD_REVISION, expected, why this row exists]
const rows = [
  // The allowlist, with no revision declared at all. These three are the whole of
  // it, and they are exactly the three that something in this repository sets.
  ['undeployed', undefined, ALLOW, 'StandaloneConfig declares this'],
  ['preview', undefined, ALLOW, 'PreviewRemoteConfig and .env.preview declare this'],
  ['preprod', undefined, ALLOW, 'PreprodRemoteConfig and .env.preprod declare this'],

  // Formerly allowlisted, deliberately removed: nothing sets them, so each was a
  // name an outside caller could pick and be waved through with no record filed.
  ['standalone', undefined, REFUSE, 'removed from the allowlist — nothing sets it'],
  ['devnet', undefined, REFUSE, 'removed from the allowlist — nothing sets it'],
  ['testnet', undefined, REFUSE, 'removed from the allowlist — nothing sets it'],

  // Everything else refuses. This is the allowlist doing its job.
  ['mainnet', undefined, REFUSE, 'the one this exists for'],
  ['main', undefined, REFUSE, 'near-miss spelling'],
  ['prod', undefined, REFUSE, 'near-miss spelling'],
  ['production', undefined, REFUSE, 'near-miss spelling'],
  ['midnight-mainnet', undefined, REFUSE, 'a name nobody has coined yet'],
  [null, undefined, REFUSE, 'setNetworkId never called — cannot say where it deploys'],

  // Revision parsing, on a network that does require a record.
  ['mainnet', '4', ALLOW, 'the declaration this guard asks for'],
  ['mainnet', '5', ALLOW, 'a later revision is still current'],
  ['mainnet', '004', ALLOW, 'leading zeros are still four'],
  ['mainnet', '  4  ', ALLOW, 'trimmed before parsing'],
  ['mainnet', '3', REFUSE, 'the revision that predates the constructor'],
  ['mainnet', '0', REFUSE, 'below the floor'],
  ['mainnet', '', REFUSE, 'set-but-empty is not a declaration'],

  // Typos. Every one of these deployed silently before 964415d: Number('v4') is NaN
  // and NaN < 4 is false, so the input most likely to be mistyped disabled the check
  // it was mistyped into.
  ['mainnet', 'v4', REFUSE, 'typo that used to disable the check'],
  ['mainnet', 'four', REFUSE, 'typo that used to disable the check'],
  ['mainnet', '4.0.0', REFUSE, 'typo that used to disable the check'],
  ['mainnet', '4.5', REFUSE, 'typo that used to disable the check'],
  ['mainnet', '0x4', REFUSE, 'typo that used to disable the check'],
  ['mainnet', '1e9', REFUSE, 'exponent notation is not a revision'],
  ['mainnet', '٤', REFUSE, 'non-ASCII digit — \\d is ASCII-only without /u'],
  ['mainnet', '4abc', REFUSE, 'trailing junk'],

  // A declared revision overrides nothing about the network, and an allowlisted
  // network needs no declaration: the two halves are independent.
  ['preview', 'v4', ALLOW, 'allowlist short-circuits before parsing'],

  // Set.has, not object lookup — no inherited-key surprises.
  ['__proto__', undefined, REFUSE, 'not a member of a Set'],
  ['constructor', undefined, REFUSE, 'not a member of a Set'],
  ['hasOwnProperty', undefined, REFUSE, 'not a member of a Set'],

  // Whitespace and case in the network name fail closed, not open. resolveNetwork
  // lowercases but does not trim.
  [' preview ', undefined, REFUSE, 'untrimmed network name fails closed'],
];

let failed = 0;
const w = [17, 9, 8];
console.log('deployment-record gate — decision table\n');
console.log(
  `${'network'.padEnd(w[0])}${'revision'.padEnd(w[1])}${'expect'.padEnd(w[2])}actual   note`,
);
console.log('-'.repeat(96));

for (const [network, raw, expected, note] of rows) {
  const actual = decide(network, raw).allow ? ALLOW : REFUSE;
  const ok = actual === expected;
  if (!ok) failed++;
  console.log(
    `${String(network).padEnd(w[0])}${JSON.stringify(raw ?? null).padEnd(w[1])}` +
      `${expected.padEnd(w[2])}${actual.padEnd(9)}${ok ? note : `MISMATCH — ${note}`}`,
  );
}

// The live getNetworkId wiring, one process per row because setNetworkId cannot be
// undone. These are the rows the pure table cannot reach.
console.log('\nlive getNetworkId wiring (subprocess each)\n');
const live = [
  [null, REFUSE, 'setNetworkId never called — getNetworkId throws, treated as unknown'],
  ['MainNet', REFUSE, 'lowercased, then refused by the allowlist'],
  ['PREVIEW', ALLOW, 'lowercased, then allowed by the allowlist'],
  ['mainnet', REFUSE, 'the real thing, refused with the revision unset'],
];

for (const [network, expected, note] of live) {
  const script =
    (network === null ? '' : `const n=await import('./dist/api/src/network-id.js');n.setNetworkId(${JSON.stringify(network)});`) +
    `const g=await import('./dist/api/src/deploy-guard.js');` +
    `try{g.assertDeploymentRecordCurrent('lineage');process.stdout.write('${ALLOW}');}` +
    `catch{process.stdout.write('${REFUSE}');}`;
  const actual = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: import.meta.dirname,
    env: { ...process.env, VEILCORE_DEPLOYMENT_RECORD_REVISION: '' },
    encoding: 'utf8',
  });
  const ok = actual === expected;
  if (!ok) failed++;
  console.log(
    `${String(network).padEnd(w[0])}${''.padEnd(w[1])}${expected.padEnd(w[2])}${actual.padEnd(9)}` +
      `${ok ? note : `MISMATCH — ${note}`}`,
  );
}

// The joins and the pinned list (docs/contract-v2.md 3.1, rule 10). This build reads contract
// version 1 only: a contract pinned as version 2 is refused by name, never joined and read with
// version 1's layout. Version 2 is pinned here the way it will be: a copy of
// deployments/*.json with its entries added (as partner-kit/test/two-contracts.test.ts does).
console.log('\njoins and the pinned list\n');
const deployments = (n) => JSON.parse(readFileSync(new URL(`../deployments/${n}.json`, import.meta.url), 'utf8'));
const V2_MAIN = 'f2'.repeat(32);
const V2_CLAIMS = 'f3'.repeat(32);
const V2_PREPROD = 'e2'.repeat(32);
const withV2 = (d, entries) => ({
  ...d,
  contracts: [
    ...d.contracts,
    ...entries.map(([name, address]) => ({
      ...structuredClone(d.contracts.find((c) => c.name === name)),
      address,
      contractVersion: 2,
      keyStates: [{ retired: false, committee: 1, threshold: 1, counter: 24, block: 3600000, label: 'one key, not yet handed to the committee' }],
    })),
  ],
});
const fake = {
  mainnet: pinnedContractsFrom(withV2(deployments('mainnet'), [['veilcore', V2_MAIN], ['veilcore-claims', V2_CLAIMS]]), 'mainnet'),
  preprod: pinnedContractsFrom(withV2(deployments('preprod'), [['veilcore', V2_PREPROD]]), 'preprod'),
};
const today = { mainnet: MAINNET_PINNED, preprod: PREPROD_PINNED };
const v1Main = MAINNET_PINNED.find((e) => e.kind === 'veilcore' && e.version === 'v1').address;
const v1Claims = MAINNET_PINNED.find((e) => e.kind === 'claims' && e.version === 'v1').address;
const v1Preprod = PREPROD_PINNED.find((e) => e.kind === 'veilcore' && e.version === 'v1').address;
const pinRows = [
  // [what, actual, expected]
  ['MAINNET_VEILCORE_ADDRESS is the pinned version 1 main contract', MAINNET_VEILCORE_ADDRESS, v1Main],
  ['MAINNET_CLAIMS_ADDRESS is the pinned version 1 claims contract', MAINNET_CLAIMS_ADDRESS, v1Claims],
  ['today, mainnet: version 1 main has no version problem', versionProblem(v1Main, 'veilcore', 'mainnet', today), null],
  ['today, mainnet: version 1 claims has no version problem', versionProblem(v1Claims, 'claims', 'mainnet', today), null],
  ['today, mainnet: an unpinned address is left to the address check', versionProblem(V2_MAIN, 'veilcore', 'mainnet', today), null],
  ['v2 pinned, mainnet: version 1 still has none', versionProblem(v1Main, 'veilcore', 'mainnet', fake), null],
  ['v2 pinned, mainnet, 0x and capitals: version 1 still has none', versionProblem(`0x${v1Main.toUpperCase()}`, 'veilcore', 'mainnet', fake), null],
  ['v2 pinned, mainnet: version 2 main is refused by name', /version 2 .*reads VeilCore contract version 1 only/.test(versionProblem(V2_MAIN, 'veilcore', 'mainnet', fake) ?? ''), true],
  ['v2 pinned, mainnet, 0x and capitals: still refused', versionProblem(`0x${V2_MAIN.toUpperCase()}`, 'veilcore', 'mainnet', fake) !== null, true],
  ['v2 pinned, mainnet: version 2 claims is refused by name', /version 2/.test(versionProblem(V2_CLAIMS, 'claims', 'mainnet', fake) ?? ''), true],
  ['v2 pinned, mainnet: version 2 claims as the main contract is refused', /as the claims contract/.test(versionProblem(V2_CLAIMS, 'veilcore', 'mainnet', fake) ?? ''), true],
  ['v2 pinned, no network set: read as mainnet, refused', versionProblem(V2_MAIN, 'veilcore', null, fake) !== null, true],
  ['v2 pinned on preprod: refused on preprod', /deployments\/preprod\.json/.test(versionProblem(V2_PREPROD, 'veilcore', 'preprod', fake) ?? ''), true],
  ['v2 pinned on preprod: version 1 on preprod is fine', versionProblem(v1Preprod, 'veilcore', 'preprod', fake), null],
  ['v2 pinned: a local chain has no list, any address is version 1', versionProblem(V2_MAIN, 'veilcore', 'undeployed', fake), null],
  ['v2 pinned: preview has no list', versionProblem(V2_PREPROD, 'veilcore', 'preview', fake), null],
];
for (const [what, actual, expected] of pinRows) {
  const ok = actual === expected;
  if (!ok) failed++;
  console.log(`${ok ? 'ok      ' : 'MISMATCH'} ${what}${ok ? '' : ` (got ${JSON.stringify(actual)})`}`);
}

// The joins themselves, on the live network id (one process each), with the fake v2 list.
console.log('\njoins, live network id (subprocess each)\n');
const joinRows = [
  ['mainnet', 'assertJoinAllowed', v1Main, 'pinned', 'version 1 joins exactly as before'],
  ['mainnet', 'assertJoinAllowed', V2_MAIN, 'REFUSE:version 2', 'version 2 is refused by name'],
  ['mainnet', 'assertJoinAllowed', 'ab'.repeat(32), 'REFUSE:the VeilCore contract is', 'an unpinned address, refused as before'],
  ['mainnet', 'assertClaimsJoinAllowed', v1Claims, 'pinned', 'version 1 claims joins exactly as before'],
  ['mainnet', 'assertClaimsJoinAllowed', V2_CLAIMS, 'REFUSE:version 2', 'version 2 claims is refused by name'],
  ['mainnet', 'assertFinishAllowed', v1Main, 'pinned', 'finishing version 1, as before'],
  ['mainnet', 'assertFinishAllowed', V2_MAIN, 'REFUSE:version 2', 'version 2 is not this build’s to finish'],
  ['preprod', 'assertJoinAllowed', V2_PREPROD, 'REFUSE:version 2', 'pinned as version 2 on preprod'],
  ['preprod', 'assertJoinAllowed', v1Preprod, 'development', 'preprod version 1, as before'],
  ['preprod', 'assertJoinAllowed', 'ab'.repeat(32), 'development', 'preprod, an address on no list, as before'],
  ['preprod', 'assertFinishAllowed', V2_PREPROD, 'REFUSE:version 2', 'preprod version 2 is not this build’s to finish'],
  ['undeployed', 'assertJoinAllowed', V2_MAIN, 'development', 'a local chain, as before'],
];
for (const [network, fn, address, expected, note] of joinRows) {
  const script =
    `const n=await import('./dist/api/src/network-id.js');n.setNetworkId(${JSON.stringify(network)});` +
    `const g=await import('./dist/api/src/deploy-guard.js');const p=await import('./dist/api/src/pinned-contracts.js');` +
    `const lists={` +
    `mainnet:p.pinnedContractsFrom(${JSON.stringify(withV2(deployments('mainnet'), [['veilcore', V2_MAIN], ['veilcore-claims', V2_CLAIMS]]))},'mainnet'),` +
    `preprod:p.pinnedContractsFrom(${JSON.stringify(withV2(deployments('preprod'), [['veilcore', V2_PREPROD]]))},'preprod')};` +
    `const pin=${JSON.stringify(fn === 'assertClaimsJoinAllowed' ? MAINNET_CLAIMS_ADDRESS : MAINNET_VEILCORE_ADDRESS)};` +
    `try{const r=${fn === 'assertFinishAllowed' ? `g.${fn}(${JSON.stringify(address)},pin,lists)` : `g.${fn}(${JSON.stringify(address)},undefined,pin,lists)`};process.stdout.write(r);}` +
    `catch(e){process.stdout.write('REFUSE:'+e.message);}`;
  const out = execFileSync(process.execPath, ['--input-type=module', '-e', script], { cwd: import.meta.dirname, encoding: 'utf8' });
  const ok = expected.startsWith('REFUSE:') ? out.startsWith('REFUSE:') && out.includes(expected.slice(7)) : out === expected;
  if (!ok) failed++;
  console.log(`${network.padEnd(11)}${fn.padEnd(25)}${ok ? note : `MISMATCH — ${note} (got ${out})`}`);
}

console.log(
  `\nrequired revision: ${REQUIRED_RECORD_REVISION}` +
    `   allowlist: ${[...RECORD_NOT_REQUIRED].join(', ')}`,
);

if (failed > 0) {
  console.error(`\n${failed} row(s) MISMATCHED`);
  process.exit(1);
}
console.log(`\nall ${rows.length + live.length + pinRows.length + joinRows.length} rows as documented`);
