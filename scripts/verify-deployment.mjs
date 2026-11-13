// Do VeilCore's deployed contracts carry the published build? One command, no secrets:
//
//   npm run verify:deployment -- --network mainnet
//
// For each contract in deployments/<network>.json it asks a public Midnight indexer for the
// contract's current state, and compares the SHA-256 of every circuit's verifier key in that
// state with the published one (the same hashes as docs/fingerprints.md and the zk-r4 release).
// A proof is checked on chain against the verifier key stored in the contract, so matching keys
// mean every call the chain accepts was proved against the published circuits. It also checks
// the maintenance authority (who could change the keys) against the file.
//
// The comparison is api/src/state-check.ts's `checkContractState`, the check the registry and
// the partner kit run before trusting a state; the state is decoded by
// contract/src/contract-state.ts, which reads both Ledger 8 and Ledger 9 states. Neither needs
// the compiled contract, so this runs on a fresh clone after `npm ci`, with no compiler.
//
// Options:
//   --network mainnet|preprod   default mainnet
//   --contract <name>           only veilcore or veilcore-claims
//   --indexer <url>             an indexer GraphQL URL of your choice
//   --second-indexer <url>      a second indexer; both must report the same verifier key for
//                               every circuit and the same maintenance authority (if they don't,
//                               the run cannot check that contract: exit 2). The rest of the
//                               state (the ledger data, which changes with every anchored batch)
//                               is not compared: the verdict does not rest on it.
//
// With no --indexer: a Blockfrost project id of your own in the variable the file names
// (VEILCORE_BLOCKFROST_PROJECT_ID on mainnet) is used if set; otherwise VeilCore's public
// read-only relay. The relay is run by VeilCore: for an independent check, use an indexer you
// choose. The project id is never printed; only host names are.
//
// Exit 0: every circuit and authority matches. Exit 1: something differs (the output names it).
// Exit 2: the check could not be made (bad arguments, an indexer unreachable or refusing, two
// indexers disagreeing about the keys or the authority), or the script itself failed with an
// internal error (printed as is): no verdict either way.
// SPDX-License-Identifier: Apache-2.0
import { createHash } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadDeployments, verifierPins } from './deployments.mjs';
import { ContractStateMismatchError, authorityReport, checkContractState } from '../api/src/state-check.js';
import { readContractStateHex, stateEraOf } from '../contract/src/contract-state.js';

const USAGE =
  'Usage: npm run verify:deployment -- [--network mainnet|preprod] [--contract veilcore|veilcore-claims] [--indexer <url>] [--second-indexer <url>]';

export const STATE_QUERY = 'query VEILCORE_STATE($address: HexEncoded!) { contractAction(address: $address) { state } }';

class CannotCheck extends Error {}

const sha256Hex = (b) => createHash('sha256').update(b).digest('hex');
const hostOf = (url) => {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return '';
  }
};
const namesNetwork = (url, n) => new RegExp(`(^|[.-])${n}([.-]|$)`).test(hostOf(url).replace(/:\d+$/, ''));

export const parseArgs = (argv) => {
  const o = { network: 'mainnet', contract: undefined, indexer: undefined, secondIndexer: undefined, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const val = () => {
      const v = argv[++i];
      if (v === undefined || v.startsWith('--')) throw new CannotCheck(`${a} needs a value.\n${USAGE}`);
      return v;
    };
    if (a === '--network') o.network = val();
    else if (a === '--contract') o.contract = val();
    else if (a === '--indexer') o.indexer = val();
    else if (a === '--second-indexer') o.secondIndexer = val();
    else if (a === '--help' || a === '-h') o.help = true;
    else throw new CannotCheck(`Unknown argument ${a}.\n${USAGE}`);
  }
  return o;
};

/** An indexer to ask: its URL (possibly carrying a key), what to print for it, and any headers. */
const indexerFor = (url, d, label) => {
  let u;
  try {
    u = new URL(url);
  } catch {
    throw new CannotCheck(`${label} is not a URL.`);
  }
  if (u.protocol !== 'https:' && !['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname))
    throw new CannotCheck(`${label} must be https (plain http only on this computer).`);
  const other = d.network === 'mainnet' ? ['preprod', 'preview'] : ['mainnet'];
  for (const n of other)
    if (namesNetwork(url, n)) throw new CannotCheck(`${label} (${u.host}) is a ${n} indexer, but the network is ${d.network}. Nothing was read.`);
  const known = d.indexers.find((i) => i.url === url);
  return {
    url,
    shown: u.host,
    operator: known?.operator,
    headers: known?.origin !== undefined ? { origin: known.origin } : {},
  };
};

/** Which indexer(s) to ask, from the options, the environment and the deployments file. */
export const chooseIndexers = (opts, d, env = process.env) => {
  let first;
  if (opts.indexer !== undefined) first = indexerFor(opts.indexer, d, '--indexer');
  else {
    const bf = d.indexers.find((i) => i.projectIdEnv !== undefined && (env[i.projectIdEnv] ?? '').trim() !== '');
    if (bf !== undefined) {
      const id = env[bf.projectIdEnv].trim();
      if (!/^[A-Za-z0-9_-]{8,}$/.test(id)) throw new CannotCheck(`${bf.projectIdEnv} is set but is not a Blockfrost project id.`);
      first = { ...indexerFor(bf.url, d, bf.projectIdEnv), url: `${bf.url}?project_id=${encodeURIComponent(id)}`, operator: `${bf.operator}, your project` };
    } else {
      const relay = d.indexers.find((i) => i.projectIdEnv === undefined);
      if (relay === undefined) throw new CannotCheck(`deployments/${d.network}.json names no indexer that works without a key; give --indexer.`);
      first = indexerFor(relay.url, d, 'the relay');
    }
  }
  const second = opts.secondIndexer === undefined ? undefined : indexerFor(opts.secondIndexer, d, '--second-indexer');
  if (second !== undefined && second.url === first.url) throw new CannotCheck('--second-indexer is the same indexer as the first; a second check needs a different one.');
  return { first, second };
};

/** The contract's current state, as the hex one indexer reports. */
export const fetchStateHex = async (ix, address, timeoutMs = 30_000) => {
  let res;
  try {
    res = await fetch(ix.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...ix.headers },
      body: JSON.stringify({ query: STATE_QUERY, variables: { address } }),
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'error',
    });
  } catch (e) {
    throw new CannotCheck(`Could not reach the indexer at ${ix.shown} (${e?.cause?.code ?? e?.name ?? 'network error'}).`);
  }
  if (!res.ok) throw new CannotCheck(`The indexer at ${ix.shown} answered HTTP ${res.status}.`);
  let body;
  try {
    body = await res.json();
  } catch {
    throw new CannotCheck(`The indexer at ${ix.shown} did not answer with JSON.`);
  }
  if (Array.isArray(body?.errors) && body.errors.length > 0)
    throw new CannotCheck(`The indexer at ${ix.shown} refused the query: ${String(body.errors[0]?.message ?? 'no message').slice(0, 200)}`);
  const hex = body?.data?.contractAction?.state;
  if (typeof hex !== 'string' || !/^(0x)?(?:[0-9a-fA-F]{2})+$/.test(hex))
    throw new CannotCheck(`The indexer at ${ix.shown} has no contract at ${address}.`);
  return hex.replace(/^0x/i, '').toLowerCase();
};

/** What the verdict rests on, from one state: each circuit's verifier key hash and the authority. */
export const verdictFacts = (stateHex) => {
  let state;
  try {
    state = readContractStateHex(stateHex);
  } catch (e) {
    throw new CannotCheck(`A state the indexers gave could not be read: ${e instanceof Error ? e.message : String(e)}`);
  }
  const keys = {};
  for (const n of state.operations()) {
    const name = typeof n === 'string' ? n : Buffer.from(n).toString('utf8');
    let vk;
    try {
      vk = state.operation(name)?.verifierKey;
    } catch {
      vk = undefined;
    }
    keys[name] = vk instanceof Uint8Array && vk.length > 0 ? sha256Hex(vk) : null;
  }
  const a = authorityReport(state);
  return { keys, authority: { committee: a.committee, threshold: a.threshold, counter: String(a.counter), retired: a.retired } };
};

/** Where two indexers' facts differ: the circuits, and "maintenance authority". Empty: they agree. */
export const factsDiffer = (x, y) => {
  const out = [...new Set([...Object.keys(x.keys), ...Object.keys(y.keys)])].sort().filter((n) => x.keys[n] !== y.keys[n]);
  if (JSON.stringify(x.authority) !== JSON.stringify(y.authority)) out.push('maintenance authority');
  return out;
};

const short = (h) => (h === undefined ? 'none' : `${h.slice(0, 16)}…`);

/** Every line of one contract's check, and whether it passed. */
export const checkOne = (c, stateHex, network) => {
  const lines = [];
  const bytes = Buffer.from(stateHex, 'hex');
  let era;
  let state;
  try {
    era = stateEraOf(new Uint8Array(bytes));
    state = readContractStateHex(stateHex);
  } catch (e) {
    throw new CannotCheck(`The state the indexer gave for ${c.name} could not be read: ${e instanceof Error ? e.message : String(e)}`);
  }
  lines.push(`  state read in Ledger ${era.slice(1)} format; the contract was compiled for Ledger ${c.ledgerVersion} (compactc ${c.compiler})`);

  const pins = verifierPins(c);
  const onChain = state.operations().map((n) => (typeof n === 'string' ? n : Buffer.from(n).toString('utf8')));
  const width = Math.max(...[...Object.keys(pins), ...onChain].map((n) => n.length));
  let failed = 0;
  for (const name of Object.keys(pins).sort()) {
    let vk;
    try {
      vk = onChain.includes(name) ? state.operation(name)?.verifierKey : undefined;
    } catch {
      vk = undefined;
    }
    const have = vk instanceof Uint8Array && vk.length > 0 ? sha256Hex(vk) : undefined;
    if (have === pins[name]) lines.push(`  PASS  ${name.padEnd(width)}  ${short(have)}`);
    else {
      failed++;
      const why = !onChain.includes(name) ? 'not on chain' : have === undefined ? 'on chain with no verifier key' : `on chain ${short(have)}, published ${short(pins[name])}`;
      lines.push(`  FAIL  ${name.padEnd(width)}  ${why}`);
    }
  }
  for (const name of onChain.filter((n) => !(n in pins)).sort()) {
    failed++;
    lines.push(`  FAIL  ${name.padEnd(width)}  on chain, but not a circuit of the published build`);
  }

  // The same verdict through the check the registry and the partner kit use, so this script
  // and they can never disagree about a state.
  let shared = 'pinned';
  try {
    shared = checkContractState(state, { verifierKeys: pins }, `${network} now`).keys;
  } catch (e) {
    if (!(e instanceof ContractStateMismatchError)) throw e;
    shared = 'refused';
  }
  if ((shared === 'pinned') !== (failed === 0)) throw new Error(`Internal error: the per-circuit comparison and checkContractState disagree for ${c.name}.`);

  const a = authorityReport(state);
  const want = c.maintenanceAuthority;
  const seen = a.retired ? `retired (empty committee), counter ${a.counter}` : `${a.committee} key(s), threshold ${a.threshold}, counter ${a.counter}`;
  const expected = want.retired ? 'retired (empty committee)' : `${want.committee} key(s), threshold ${want.threshold}`;
  const authOk =
    a.retired === want.retired &&
    (want.retired || (a.committee === want.committee && a.threshold === want.threshold)) &&
    (want.counter === null || a.counter === BigInt(want.counter));
  const counterNote = want.counter === null ? '; the counter is not recorded in the file, so it is reported only' : `, counter ${want.counter}`;
  lines.push(`  ${authOk ? 'PASS' : 'FAIL'}  maintenance authority: ${seen} (published: ${expected}${counterNote})`);
  const circuits = Object.keys(pins).length;
  lines.push(`  ${circuits - Math.min(failed, circuits)} of ${circuits} circuits match the published build.`);
  return { lines, ok: failed === 0 && authOk, circuits, failed, authOk, era, authority: a };
};

export const run = async (argv, { env = process.env, log = console.log } = {}) => {
  const opts = parseArgs(argv);
  if (opts.help) {
    log(USAGE);
    return 0;
  }
  let d;
  try {
    d = loadDeployments(opts.network);
  } catch (e) {
    throw new CannotCheck(e.message);
  }
  const contracts = d.contracts.filter((c) => opts.contract === undefined || c.name === opts.contract);
  if (contracts.length === 0) throw new CannotCheck(`No contract named ${opts.contract} in deployments/${d.network}.json.`);
  const { first, second } = chooseIndexers(opts, d, env);

  log(`VeilCore deployment check: ${d.network} (deployments/${d.network}.json)`);
  log(`Indexer: ${first.shown}${first.operator ? ` (${first.operator})` : ''}${second ? `; second indexer: ${second.shown}` : ''}`);
  if (first.operator === 'VeilCore' && second === undefined)
    log('Note: this relay is run by VeilCore. For a check that does not trust us, add --indexer or --second-indexer with one you choose.');

  let allOk = true;
  let circuits = 0;
  let matching = 0;
  // Contracts the two indexers report differently: not a finding about the chain, so the run
  // cannot say PASS or FAIL for them (exit 2), unless another contract already FAILs (exit 1).
  const disagree = [];
  for (const c of contracts) {
    log(`\n${c.name}  ${c.address}`);
    const hex = await fetchStateHex(first, c.address);
    if (second !== undefined) {
      // Only what the verdict rests on is compared: the rest of the state changes with every
      // anchored batch, so two healthy indexers a block apart would rarely be byte-identical.
      const other = await fetchStateHex(second, c.address);
      const differ = other === hex ? [] : factsDiffer(verdictFacts(hex), verdictFacts(other));
      if (differ.length > 0) {
        disagree.push(c.name);
        log(
          `  CANNOT CHECK  the two indexers report different verifier keys or maintenance authority for this contract (${differ.join(', ')}; one may be behind; try again shortly)`,
        );
        continue;
      }
      const rest = other === hex ? 'the same state, byte for byte' : 'the rest of the state differs, as it does between batches; it is not what is checked';
      log(`  both indexers report the same verifier key for every circuit and the same maintenance authority (${rest})`);
    }
    const r = checkOne(c, hex, d.network);
    for (const l of r.lines) log(l);
    circuits += r.circuits;
    matching += r.circuits - Math.min(r.failed, r.circuits);
    allOk &&= r.ok;
  }
  log('');
  const unchecked =
    disagree.length > 0 ? ` Not checked, the indexers disagree: ${disagree.join(', ')}.` : '';
  if (!allOk) {
    log(`RESULT: FAIL. The chain does not match deployments/${d.network}.json (see FAIL above): ${matching} of ${circuits} circuits match.${unchecked}`);
    return 1;
  }
  if (disagree.length > 0) {
    log(
      `RESULT: CANNOT CHECK: indexers disagree about ${disagree.join(', ')} (one may be behind; try again shortly).${circuits > 0 ? ` The rest matches: ${matching} of ${circuits} circuits.` : ''}`,
    );
    return 2;
  }
  log(
    `RESULT: PASS. On ${d.network}, every circuit's verifier key matches the published build (${matching} of ${circuits}), and each maintenance authority is as published.`,
  );
  return 0;
};

const invoked = () => {
  try {
    return process.argv[1] !== undefined && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
};
if (invoked()) {
  run(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (e) => {
      console.error(e instanceof CannotCheck ? `CANNOT CHECK: ${e.message}` : e);
      process.exit(2);
    },
  );
}
