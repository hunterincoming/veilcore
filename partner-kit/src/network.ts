// Networks, their public endpoints, and which VeilCore contract each one has.
// SPDX-License-Identifier: Apache-2.0

import { RECORD_NOT_REQUIRED } from '../../api/src/deploy-guard.js';
import {
  type ContractVersion,
  MAINNET_PINNED,
  PREPROD_PINNED,
  isContractVersion,
  versionName,
} from '../../api/src/pinned-contracts.js';

/**
 * The Midnight networks this package knows. `undeployed` is a local standalone chain
 * (partner-kit/local/compose.yml), new each time it starts.
 */
export type Network = 'mainnet' | 'preprod' | 'preview' | 'undeployed';
export const NETWORKS: readonly Network[] = ['mainnet', 'preprod', 'preview', 'undeployed'];

export const isNetwork = (n: unknown): n is Network => typeof n === 'string' && (NETWORKS as string[]).includes(n);

/** Where to reach a network. */
export type Endpoints = {
  /** The indexer's GraphQL URL (https://…/graphql). */
  readonly indexer: string;
  /** The indexer's GraphQL subscription URL (wss://…/graphql/ws). */
  readonly indexerWS: string;
  /** A node's RPC URL (https://…). */
  readonly node: string;
  /** The same node over WebSocket (wss://…). */
  readonly nodeWS: string;
  /**
   * A proof server. Run your own, next to your code: the private inputs of every proof
   * (record secrets, licence secrets, hidden field values) are sent to it.
   */
  readonly proofServer: string;
};

/** A proof server on this machine, run from the image for its network (proofServerImageFor). */
export const DEFAULT_PROOF_SERVER = 'http://127.0.0.1:6300';

/**
 * A proof server is built for one Midnight ledger, and no published image serves both. Mainnet
 * moved to Ledger 9 on 6 November 2026 and needs proof server 9.0.1 (9.0.0 was never published on
 * Docker Hub), pinned by the digest in Midnight's release notes (midnight-ledger, tag
 * proof-server-9.0.1). Preprod moved to Ledger 9 on 9 November 2026 and preview was relaunched on
 * it on 7 November, so they take the same image. Only the local chain (partner-kit/local, the
 * 'undeployed' network) still runs Ledger 8, with 8.1.3 (Midnight's 2 October 2026 security
 * patch, by digest).
 */
export const PROOF_SERVER_IMAGE_LEDGER9 =
  'midnightntwrk/proof-server:9.0.1@sha256:90e36a14f92c2004127f0ed1cfd6ee89d770cf1f6e9cd7f02026ffd4ecb42f37';
export const PROOF_SERVER_IMAGE_LEDGER8 =
  'midnightntwrk/proof-server:8.1.3@sha256:0f4ab0716985eaebbe55a970348f52ff05ffd8a96631ed7232bd0c4ba02c115c';

/** The proof server image for a network: Ledger 8's only on the local chain, Ledger 9's on every public network. */
export const proofServerImageFor = (network: Network): string =>
  network === 'undeployed' ? PROOF_SERVER_IMAGE_LEDGER8 : PROOF_SERVER_IMAGE_LEDGER9;

/** The proof server image VeilCore's own tools run on mainnet. */
export const PROOF_SERVER_IMAGE = PROOF_SERVER_IMAGE_LEDGER9;

/** The networks served only through Blockfrost: mainnet since 30 September 2026, preprod since 9 October 2026. */
export type BlockfrostNetwork = 'mainnet' | 'preprod';
export const isBlockfrostNetwork = (n: string): n is BlockfrostNetwork => n === 'mainnet' || n === 'preprod';

/**
 * Where VeilCore's own tools read each network's Blockfrost project id from. One project per
 * network: Blockfrost refuses a preprod id on mainnet and the other way round.
 */
export const BLOCKFROST_ENV: Record<BlockfrostNetwork, string> = {
  mainnet: 'VEILCORE_BLOCKFROST_PROJECT_ID',
  preprod: 'VEILCORE_BLOCKFROST_PREPROD_PROJECT_ID',
};

const PUBLIC: Record<Exclude<Network, BlockfrostNetwork>, Omit<Endpoints, 'proofServer'>> = {
  preview: {
    indexer: 'https://indexer.preview.midnight.network/api/v4/graphql',
    indexerWS: 'wss://indexer.preview.midnight.network/api/v4/graphql/ws',
    node: 'https://rpc.preview.midnight.network',
    nodeWS: 'wss://rpc.preview.midnight.network',
  },
  // partner-kit/local/compose.yml publishes these ports.
  undeployed: {
    indexer: 'http://127.0.0.1:8088/api/v4/graphql',
    indexerWS: 'ws://127.0.0.1:8088/api/v4/graphql/ws',
    node: 'http://127.0.0.1:9944',
    nodeWS: 'ws://127.0.0.1:9944',
  },
};

const BLOCKFROST_NAME: Record<BlockfrostNetwork, string> = { mainnet: 'Midnight Mainnet', preprod: 'Midnight Preprod' };

/**
 * A network's indexer and node through Blockfrost, the public provider since Midnight shut
 * its own mainnet endpoints (30 September 2026) and preprod endpoints (9 October 2026). The
 * project id rides in the query string (midnight-js cannot set headers), so treat these URLs
 * as secrets: never log them.
 */
export const blockfrostEndpoints = (network: BlockfrostNetwork, projectId: string): Omit<Endpoints, 'proofServer'> => {
  if (!/^[A-Za-z0-9_-]{8,}$/.test(projectId))
    throw new Error(
      `That is not a Blockfrost project id. Create a ${BLOCKFROST_NAME[network]} project at blockfrost.io.`,
    );
  const q = `?project_id=${encodeURIComponent(projectId)}`;
  const host = `midnight-${network}.blockfrost.io`;
  return {
    indexer: `https://${host}/api/v0${q}`,
    indexerWS: `wss://${host}/api/v0/ws${q}`,
    node: `https://rpc.${host}/${q}`,
    nodeWS: `wss://rpc.${host}/${q}`,
  };
};

/** Mainnet through Blockfrost (blockfrostEndpoints). */
export const blockfrostMainnet = (projectId: string): Omit<Endpoints, 'proofServer'> =>
  blockfrostEndpoints('mainnet', projectId);

/** Preprod through Blockfrost (blockfrostEndpoints). Midnight's own preprod hosts shut on 9 October 2026. */
export const blockfrostPreprod = (projectId: string): Omit<Endpoints, 'proofServer'> =>
  blockfrostEndpoints('preprod', projectId);

/**
 * The endpoints for `network`, with any of them replaced by `overrides`. Mainnet and preprod
 * need a Blockfrost project id for that network, or all four of indexer, indexerWS, node and
 * nodeWS given.
 */
export const endpointsFor = (
  network: Network,
  overrides: Partial<Endpoints> = {},
  options: { readonly blockfrostProjectId?: string } = {},
): Endpoints => {
  if (!isNetwork(network)) throw new Error(`Unknown network ${String(network)}. Use one of ${NETWORKS.join(', ')}.`);
  const given = Object.fromEntries(Object.entries(overrides).filter(([, v]) => v !== undefined && v !== ''));
  let base: Omit<Endpoints, 'proofServer'>;
  if (isBlockfrostNetwork(network)) {
    const all = ['indexer', 'indexerWS', 'node', 'nodeWS'].every((k) => typeof given[k] === 'string');
    if (options.blockfrostProjectId !== undefined) base = blockfrostEndpoints(network, options.blockfrostProjectId);
    else if (all) base = given as unknown as Omit<Endpoints, 'proofServer'>;
    else
      throw new Error(
        `${network === 'mainnet' ? 'Mainnet' : 'Preprod'} has no public endpoints of its own` +
          `${network === 'preprod' ? ' since 9 October 2026' : ''}: give a ${BLOCKFROST_NAME[network]} Blockfrost ` +
          'project id (blockfrostProjectId), or all of indexer, indexerWS, node and nodeWS for a provider you trust.',
      );
  } else base = PUBLIC[network];
  return { ...base, proofServer: DEFAULT_PROOF_SERVER, ...given };
};

// ─────────────────────────────────────────────────────────── addresses

export type ContractKind = 'veilcore' | 'claims';

/**
 * VeilCore's contracts on preprod: the ones test.veilcore.org and its fee service use, so a
 * record made on the test site is found here. The main contract is the practice contract of
 * 7 October 2026 (docs/log/preprod-paper-key-practice.md; scripts/deploy-test-site.mjs
 * refuses a sponsor on any other), whose maintenance authority was then retired; the claims
 * contract is the one the 5 October smoke test deployed (docs/log/preprod-run-5oct.md), with
 * an empty committee. Both from the build in the deployment record. (Until November 2026 the
 * main contract here was the 5 October one, 93c062e1…, which the test site never used.)
 * Anything on preprod is test data.
 */
export const PREPROD_ADDRESSES: Readonly<Record<ContractKind, string>> = {
  veilcore: '72fe33436d424fcf247919c8e2f0de224175cc55061739be0ebffb2d650f2f73',
  claims: '29d3ea80e121518f8fd8bd72533d856cf29cdbddbda1b6f322a661aa4f2484b6',
};

export type { ContractVersion } from '../../api/src/pinned-contracts.js';

/** One contract this version of the package accepts as VeilCore's on mainnet. */
export type PinnedContract = {
  readonly version: ContractVersion;
  /** 64 lowercase hexadecimal characters. */
  readonly address: string;
};

const listOf = (kind: ContractKind): readonly PinnedContract[] =>
  MAINNET_PINNED.filter((e) => e.kind === kind).map((e) => ({ version: e.version, address: e.address }));

/**
 * Every contract of each kind accepted as VeilCore's on mainnet, oldest version first, each
 * with the version that says how its state is read: the pinned list in deployments/mainnet.json
 * (api/src/pinned-contracts.ts; docs/contract-v2.md 3.1, rule 10). Today version 1 only, the
 * contracts deployed on 8 October 2026 (also pinned in api/src/deploy-guard.ts). Version 2 is
 * added there, by address; entries are never changed or removed, so what was written on an
 * older contract stays checkable (SPEC.md 9.2.1 in veilcore-sdk). A contract's version comes
 * only from this list, never from its state. On mainnet nothing outside it is VeilCore's.
 */
export const MAINNET_CONTRACTS: Readonly<Record<ContractKind, readonly PinnedContract[]>> = {
  veilcore: listOf('veilcore'),
  claims: listOf('claims'),
};

/**
 * The version used when no address is given, and the only one this package writes to:
 * version 1 until VeilCore's public switch (docs/contract-v2.md 4 and 7). Never "the newest
 * pinned": pinning version 2 does not move a default.
 */
export const DEFAULT_VERSION: ContractVersion = 'v1';

const defaultOf = (kind: ContractKind): string =>
  MAINNET_CONTRACTS[kind].find((c) => c.version === DEFAULT_VERSION)?.address ?? '';

/**
 * VeilCore's contracts on mainnet that are used when no address is given: the version 1
 * contracts the deployment record names (deployed 8 October 2026; pinned in
 * api/src/deploy-guard.ts). Empty while none is pinned.
 */
export const MAINNET_ADDRESSES: Readonly<Record<ContractKind, string>> = {
  veilcore: defaultOf('veilcore'),
  claims: defaultOf('claims'),
};

const norm = (a: string): string => a.trim().toLowerCase().replace(/^0x/, '');

/** The address to use when none is given: the pinned one on mainnet, the known one on preprod. */
export const defaultAddress = (network: Network, kind: ContractKind): string | undefined => {
  if (network === 'mainnet') return MAINNET_ADDRESSES[kind] === '' ? undefined : MAINNET_ADDRESSES[kind];
  if (network === 'preprod') return PREPROD_ADDRESSES[kind];
  return undefined;
};

/**
 * Throw unless `address` may be treated as VeilCore's `kind` contract on `network`: on a
 * development network any address (you deployed it, or someone told you which); on every
 * other network, mainnet included, only a pinned address (MAINNET_CONTRACTS), and nothing
 * while none is. The same rule as api/src/deploy-guard.ts (assertJoinAllowed,
 * assertClaimsJoinAllowed), with the network passed in rather than read from the process.
 */
export const assertAddressFor = (network: Network, kind: ContractKind, address: string): 'development' | 'pinned' => {
  if (!/^(0x)?[0-9a-fA-F]{64}$/.test(address.trim())) throw new Error('That is not a contract address (64 hex).');
  if (RECORD_NOT_REQUIRED.has(network)) return 'development';
  const pinned = MAINNET_CONTRACTS[kind].map((c) => c.address);
  const name = kind === 'veilcore' ? 'VeilCore' : 'VeilCore claims';
  if (pinned.length === 0)
    throw new Error(
      `Refusing ${address}: on ${network} no ${name} contract is pinned in this version of @veilcore/contracts yet ` +
        '(the mainnet address goes in with the deploy). Nothing was read or sent.',
    );
  if (!pinned.includes(norm(address)))
    throw new Error(
      `Refusing ${address}: on ${network} the ${name} contract is ${pinned.join(' or ')} (the deployment record). ` +
        'Another address can carry the same circuits with other state. Nothing was read or sent.',
    );
  return 'pinned';
};

/**
 * Which pinned contract `address` is, and so how its state is read (docs/contract-v2.md 3.1,
 * rule 10). On mainnet, only by the pinned list; a `version` given must be the pinned one. Off
 * mainnet, from preprod's pinned list (deployments/preprod.json) when the address is on it,
 * otherwise from `version`, which must then be given: a defaulted version is refused, so a
 * rehearsal of version 2 is never read with version 1's layout. Call after assertAddressFor
 * (resolveAddress does).
 */
export const pinnedContractFor = (
  network: Network,
  kind: ContractKind,
  address: string,
  version?: ContractVersion,
): PinnedContract => {
  const a = norm(address);
  if (version !== undefined && !isContractVersion(version))
    throw new Error(`Unknown contract version ${String(version)}. Use 'v1' or 'v2'. Nothing was read.`);
  const listed =
    network === 'mainnet'
      ? MAINNET_CONTRACTS[kind].find((c) => c.address === a)
      : network === 'preprod'
        ? PREPROD_PINNED.filter((e) => e.kind === kind).find((e) => e.address === a)
        : undefined;
  if (listed !== undefined) {
    if (version !== undefined && version !== listed.version)
      throw new Error(
        `Refusing: ${a} is pinned as ${versionName(listed.version)}, not ${versionName(version)}. Nothing was read.`,
      );
    return { version: listed.version, address: a };
  }
  if (network === 'mainnet') throw new Error(`Refusing ${address}: not a pinned contract. Nothing was read or sent.`);
  if (version === undefined)
    throw new Error(
      `On ${network}, say which contract version ${a} is (contractVersion: 'v1' or 'v2'): off mainnet a check ` +
        'names its version, and a defaulted one is refused. Nothing was read.',
    );
  return { version, address: a };
};

/** `address`, or the default for `network`; refused unless it may be treated as VeilCore's. */
export const resolveAddress = (network: Network, kind: ContractKind, address?: string): string => {
  const a = address ?? defaultAddress(network, kind);
  if (a === undefined)
    throw new Error(
      network === 'mainnet'
        ? `No ${kind === 'veilcore' ? 'VeilCore' : 'claims'} contract is pinned for mainnet in this version yet. Nothing was read or sent.`
        : `Give the ${kind === 'veilcore' ? 'VeilCore' : 'claims'} contract's address on ${network}.`,
    );
  assertAddressFor(network, kind, a);
  return norm(a);
};

/**
 * resolveAddress for a client that sends transactions (VeilCore, Claims). On mainnet only the
 * default version's contracts: this package is built on version 1's compiled contracts, and
 * the site, the anchorer and the SDK stay on version 1 until VeilCore's public switch
 * (docs/contract-v2.md 7, condition 4). Checking a record on any pinned contract is verify.ts.
 */
export const resolveWriteAddress = (network: Network, kind: ContractKind, address?: string): string => {
  const a = resolveAddress(network, kind, address);
  if (network === 'mainnet') {
    const { version } = pinnedContractFor(network, kind, a);
    if (version !== DEFAULT_VERSION)
      throw new Error(
        `Refusing ${a}: it is ${versionName(version)}, and this version of @veilcore/contracts sends transactions ` +
          `only to ${versionName(DEFAULT_VERSION)}. Checking its records works. Nothing was sent.`,
      );
  }
  return a;
};
