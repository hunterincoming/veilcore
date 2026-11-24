// VeilCore's pinned contract list (docs/contract-v2.md 3.1, rule 10), read from the deployment
// files: deployments/mainnet.json and deployments/preprod.json. Every checker that dates a record
// on chain takes its list from here: the partner kit (partner-kit/src/network.ts, verify.ts) and
// the site's check page (bboard-ui/src/veilcore/chain/config.ts).
//
// A contract's version comes ONLY from its pinned entry: `contractVersion` in the deployments
// file (absent means 1, the contracts deployed on 8 October 2026). Never from the `contractVersion`
// or `predecessor` fields in a contract's state: Midnight does not run the constructor on chain,
// so any copy of v2 can carry those values (docs/runbooks/deploy-v2.md).
//
// So pinning v2 is one change: its entries go into deployments/mainnet.json, with
// `"contractVersion": 2`, its circuits (the verifier-key table every v2 state is checked against,
// never v1's) and `keyStates` (every authority state it may be in, each from the counter and
// block where it began). Entries are only ever added: a record dated on an older contract stays
// checkable against it.
//
// Pure: no Node or browser API, so the site and the kit share it.
// SPDX-License-Identifier: Apache-2.0

import mainnet from '../../deployments/mainnet.json' with { type: 'json' };
import preprod from '../../deployments/preprod.json' with { type: 'json' };
import type { KeyState } from './key-states.js';

export { type KeyState, matchKeyState } from './key-states.js';

/** Which build of a VeilCore contract, and so how its state is read. */
export type ContractVersion = 'v1' | 'v2';
export const CONTRACT_VERSIONS: readonly ContractVersion[] = ['v1', 'v2'];
export const isContractVersion = (v: unknown): v is ContractVersion =>
  typeof v === 'string' && (CONTRACT_VERSIONS as readonly string[]).includes(v);

/** The main contract ('veilcore') or the claims contract. */
export type PinnedKind = 'veilcore' | 'claims';

/** One contract on the pinned list. */
export type PinnedEntry = {
  readonly kind: PinnedKind;
  readonly version: ContractVersion;
  /** 64 lowercase hexadecimal characters. */
  readonly address: string;
  /** Every authority state this contract may be in. */
  readonly keyStates: readonly KeyState[];
  /**
   * Circuit name -> SHA-256 of its verifier key, from the deployments file. A v1 state is
   * checked against docs/fingerprints.md (partner-kit/src/fingerprints.ts) as before; a v2 state
   * only against this table.
   */
  readonly verifierKeys: Readonly<Record<string, string>>;
};

/**
 * Version 1's key states, when its entry lists none (docs/contract-v2.md 3.3):
 *  - main: (a) one key, threshold 1, counter 16, as since the deploy minutes on 8 October 2026
 *    (deployment record revision 4); (b) after the seal by `retire` (section 6), the same keys
 *    with the authority retired at counter 17: 16 and the one `retire` update. The seal's
 *    deployment record revision confirms that counter, and may list it as `keyStates` instead.
 *  - claims: retired since block 2922874, three blocks after its deploy.
 */
const V1_KEY_STATES: Readonly<Record<PinnedKind, readonly KeyState[]>> = {
  veilcore: [
    { retired: false, committee: 1, threshold: 1, counter: 16n, block: 2922687, label: 'one key, counter 16' },
    { retired: true, committee: 0, threshold: 1, counter: 17n, block: null, label: 'retired (sealed)' },
  ],
  claims: [{ retired: true, committee: 0, threshold: 1, counter: null, block: 2922874, label: 'retired' }],
};

const HEX64 = /^[0-9a-f]{64}$/;

const fail = (file: string, why: string): never => {
  throw new Error(`deployments/${file}.json: ${why}`);
};

const keyStateOf = (file: string, where: string, k: unknown): KeyState => {
  const o = (typeof k === 'object' && k !== null ? k : {}) as Record<string, unknown>;
  const int = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
  if (typeof o.retired !== 'boolean') fail(file, `${where}.retired must be true or false`);
  if (!int(o.committee) || !int(o.threshold)) fail(file, `${where} needs a whole committee and threshold`);
  if (o.counter !== null && !int(o.counter)) fail(file, `${where}.counter must be a whole number or null`);
  if (o.block !== null && o.block !== undefined && !int(o.block)) fail(file, `${where}.block must be a block height`);
  if (typeof o.label !== 'string' || o.label.trim() === '') fail(file, `${where}.label must say what the state is`);
  // A live authority must be stated exactly: a counter that is not compared would let a key be
  // swapped and put back unseen.
  if (o.retired === false && o.counter === null) fail(file, `${where}: a live authority needs its counter`);
  return {
    retired: o.retired as boolean,
    committee: o.committee as number,
    threshold: o.threshold as number,
    counter: o.counter === null ? null : BigInt(o.counter as number),
    block: int(o.block) ? o.block : null,
    label: (o.label as string).trim(),
  };
};

/**
 * The pinned list in a deployments file, oldest version first. Throws, naming the problem, on
 * an entry it can't read: a checker must never run on a list it half understood.
 */
export const pinnedContractsFrom = (deployments: unknown, file = 'mainnet'): readonly PinnedEntry[] => {
  const d = (typeof deployments === 'object' && deployments !== null ? deployments : {}) as { contracts?: unknown };
  if (!Array.isArray(d.contracts)) return fail(file, 'no contracts list');
  const out: PinnedEntry[] = [];
  d.contracts.forEach((raw: unknown, i) => {
    const c = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
    const where = `contracts[${i}]`;
    const kind: PinnedKind | undefined =
      c.name === 'veilcore' ? 'veilcore' : c.name === 'veilcore-claims' ? 'claims' : undefined;
    if (kind === undefined) return fail(file, `${where}.name is not veilcore or veilcore-claims`);
    const address = typeof c.address === 'string' ? c.address.trim().toLowerCase() : '';
    if (!HEX64.test(address)) return fail(file, `${where}.address is not 64 hex characters`);
    const v = c.contractVersion ?? 1;
    if (v !== 1 && v !== 2) return fail(file, `${where}.contractVersion must be 1 or 2`);
    const version: ContractVersion = v === 1 ? 'v1' : 'v2';
    const circuits = (typeof c.circuits === 'object' && c.circuits !== null ? c.circuits : {}) as Record<
      string,
      { verifierKey?: unknown }
    >;
    const verifierKeys: Record<string, string> = {};
    for (const [name, a] of Object.entries(circuits))
      if (typeof a?.verifierKey === 'string' && HEX64.test(a.verifierKey)) verifierKeys[name] = a.verifierKey;
    if (Object.keys(verifierKeys).length !== Object.keys(circuits).length || Object.keys(circuits).length === 0)
      return fail(file, `${where}: every circuit needs its verifier key's SHA-256`);
    let keyStates: readonly KeyState[];
    if (Array.isArray(c.keyStates)) {
      if (c.keyStates.length === 0) return fail(file, `${where}.keyStates is empty`);
      keyStates = c.keyStates.map((k: unknown, j) => keyStateOf(file, `${where}.keyStates[${j}]`, k));
    } else if (version === 'v1') keyStates = V1_KEY_STATES[kind];
    // v2's authority changes (the temporary key, then the committee), so its states are always
    // published with it, never assumed.
    else return fail(file, `${where} is version 2 and lists no keyStates`);
    if (out.some((e) => e.address === address)) return fail(file, `${address} is listed twice`);
    out.push({ kind, version, address, keyStates, verifierKeys });
  });
  return [...out].sort((a, b) => CONTRACT_VERSIONS.indexOf(a.version) - CONTRACT_VERSIONS.indexOf(b.version));
};

/** Mainnet's pinned list, from deployments/mainnet.json. */
export const MAINNET_PINNED: readonly PinnedEntry[] = pinnedContractsFrom(mainnet, 'mainnet');

/**
 * Preprod's pinned list, from deployments/preprod.json: the contracts the test site and its
 * fee service use. Off mainnet, a check of any other contract names its version itself.
 */
export const PREPROD_PINNED: readonly PinnedEntry[] = pinnedContractsFrom(preprod, 'preprod');

/** The pinned entry at `address` in `list`, or undefined. */
export const pinnedAt = (list: readonly PinnedEntry[], address: string): PinnedEntry | undefined => {
  const a = address.trim().toLowerCase().replace(/^0x/, '');
  return list.find((e) => e.address === a);
};

/** How a version is named to a person: "VeilCore contract version 1". */
export const versionName = (v: ContractVersion): string => `VeilCore contract version ${v.slice(1)}`;
