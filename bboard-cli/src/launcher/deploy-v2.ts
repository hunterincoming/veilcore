// SPDX-License-Identifier: Apache-2.0
/**
 * Deploy contract v2 (main and claims) with a temporary single key, and insert every key in
 * slot V4 (docs/contract-v2.md 5; docs/runbooks/deploy-v2.md, sections E and F).
 *
 *   npm run deploy-v2 -w bboard-cli -- <preprod|mainnet|undeployed> --key-file FILE [options]
 *
 *   --key-file FILE      where the temporary key is kept: a NEW age-encrypted file (a new run), or
 *                        the existing one (--resume). The key is never shown, printed or logged.
 *   --out FILE           the deploy-session record to write (default: v2-deploy-<network>-<time>.json)
 *   --resume FILE        finish a run that stopped, from its record (and the same --key-file)
 *   --keys-per-update N  keys in each maintenance update, 1 to 8 (default 1, the route v1 took)
 *   --send-on-mainnet    needed on mainnet, together with typing DEPLOY V2 ON MAINNET
 *   --fingerprints FILE  another copy of docs/fingerprints-v2.md (tests)
 *
 * What it does, in order, and refuses before anything is typed if any of it fails:
 *  1. the client stack is the Ledger 9 one contract v2 needs (scripts/v2/stack.mjs: midnight-js
 *     5.0.1, ledger-v9 1.0.2, on-chain runtime 4.0.2, proof server 9.0.2 by digest);
 *  2. docs/fingerprints-v2.md is here, and every key of the local build (contract-v2/src/managed)
 *     is the published one, in V4;
 *  3. the temporary key: made here and written ONLY as an age-encrypted file (age asks for the
 *     passphrase itself; read back once to prove the file opens). Never on paper, never shown;
 *  4. the wallet: the recovery phrase at a hidden prompt (the committee launcher's prompt), the
 *     DUST address checked on mainnet, fees from DUST the wallet already has. Nothing registers
 *     for DUST and no DUST setting changes;
 *  5. scripts/v2/deploy-core.mjs: deploy each contract with the temporary key alone, then every
 *     key in V4, the record saved before and after each transaction.
 *
 * It prints each address and writes the record. It pins nothing: no deployments/*.json, no
 * api/src/deploy-guard.ts, no SDK or site list (the pin is its own PR, after verify:deployment).
 * It makes no call to either contract.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Logger } from 'pino';
import { sampleSigningKey } from 'ledger-v9-committee';
import { setNetworkId } from '../../../api/src/network-id.js';
import { endpointsFor } from '../../../partner-kit/src/network';
import {
  blockfrostProjectIdFor,
  currentDir,
  MainnetConfig,
  PreprodRemoteConfig,
  StandaloneConfig,
  type Config,
} from '../config.js';
import { createLogger, redactThisSession, scrubTerminal } from '../logger-utils.js';
import { createPrompt, PromptClosedError, type Prompt } from '../prompt.js';
import { SavedProgressNotOpenedError } from '../midnight-wallet-provider.js';
import { V2_WALLET, openWallet } from './committee.js';
import { type KeyStore, KeyFileError, ageKeyStore } from '../age-key.js';

export { type KeyStore, ageKeyStore };
import { stackProblems } from '../../../scripts/v2/stack.mjs';
import { ROOT, V2_CONTRACTS, loadFingerprintsV2, type V2Pins } from '../../../scripts/v2/fingerprints.mjs';
import { type Session, IDENTIFY_NOTE, emptySession, readSession, writeSession } from '../../../scripts/v2/session.mjs';
import { publicKeyOf, runDeploy, type SentTx } from '../../../scripts/v2/deploy-core.mjs';
import { sendLedger9Tx } from '../../../scripts/v2/send.mjs';
import { constructorStateBytes, haveCompiled, MANAGED } from '../../../scripts/v2/constructor.mjs';

type Network = 'mainnet' | 'preprod' | 'undeployed';

export class UsageError extends Error {}

export type Options = {
  readonly network: Network;
  readonly keyFile: string;
  readonly out?: string;
  readonly resume?: string;
  readonly perUpdate: number;
  readonly sendOnMainnet: boolean;
  readonly fingerprints?: string;
};

export const USAGE = `Usage: deploy-v2.ts <preprod|mainnet|undeployed> --key-file FILE [--out FILE | --resume FILE]
       [--keys-per-update N] [--send-on-mainnet]
See docs/runbooks/deploy-v2.md.`;

export const parseOptions = (argv: readonly string[]): Options => {
  const [network, ...rest] = argv;
  if (network !== 'mainnet' && network !== 'preprod' && network !== 'undeployed')
    throw new UsageError(`First say the network: preprod, mainnet or undeployed.\n${USAGE}`);
  const o = { network, perUpdate: 1, sendOnMainnet: false } as { -readonly [K in keyof Options]: Options[K] };
  for (let i = 0; i < rest.length; i++) {
    const flag = rest[i];
    const value = (): string => {
      const v = rest[++i];
      if (v === undefined || v.startsWith('--')) throw new UsageError(`${flag} needs a value.`);
      return v;
    };
    if (flag === '--key-file') o.keyFile = value();
    else if (flag === '--out') o.out = value();
    else if (flag === '--resume') o.resume = value();
    else if (flag === '--fingerprints') o.fingerprints = value();
    else if (flag === '--send-on-mainnet') o.sendOnMainnet = true;
    else if (flag === '--keys-per-update') {
      const n = Number(value());
      if (!Number.isInteger(n) || n < 1 || n > 8)
        throw new UsageError('--keys-per-update is a whole number from 1 to 8.');
      o.perUpdate = n;
    } else throw new UsageError(`Unknown option ${flag}.\n${USAGE}`);
  }
  if (o.keyFile === undefined) throw new UsageError(`Say where the temporary key is kept: --key-file FILE.\n${USAGE}`);
  if (o.resume !== undefined && o.out !== undefined)
    throw new UsageError('--resume writes to its own record; leave out --out.');
  if (o.sendOnMainnet && o.network !== 'mainnet')
    throw new UsageError(`--send-on-mainnet is for mainnet only; this is ${o.network}.`);
  if (o.network === 'mainnet' && !o.sendOnMainnet)
    throw new UsageError(
      'Deploying to MAINNET needs --send-on-mainnet (and typing DEPLOY V2 ON MAINNET). Nothing was done.',
    );
  return o;
};

/* **********************************************************************
 * The chain, read without the wallet.
 */

type Sender = NonNullable<Awaited<ReturnType<typeof openWallet>>>;
type Reader = Sender['providers']['publicDataProvider'];

const configFor = (network: Network): Config =>
  network === 'mainnet'
    ? new MainnetConfig()
    : network === 'preprod'
      ? new PreprodRemoteConfig()
      : new StandaloneConfig();

/** The contract's state bytes now, or undefined. */
const stateBytes = async (reader: Reader, address: string): Promise<Uint8Array | undefined> => {
  const r = (await reader.queryContractState(address)) as
    | { contractState?: { serialize(): Uint8Array } }
    | null
    | undefined;
  return r?.contractState?.serialize();
};

const LATEST_QUERY =
  'query VEILCORE_V2_LATEST($address: HexEncoded!) { contractAction(address: $address) { transaction { hash } } }';

/** The hash of the contract's latest action's transaction, from the indexer (to finish a step whose send stopped). */
const latestTxFrom =
  (network: Network) =>
  async (address: string): Promise<{ txHash: string }> => {
    const e =
      network === 'undeployed'
        ? endpointsFor('undeployed')
        : endpointsFor(network, {}, { blockfrostProjectId: blockfrostProjectIdFor(network) });
    const res = await fetch(e.indexer, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: LATEST_QUERY, variables: { address } }),
      redirect: 'error',
    });
    const body = (await res.json()) as { data?: { contractAction?: { transaction?: { hash?: string } } } };
    const h = body.data?.contractAction?.transaction?.hash;
    if (typeof h !== 'string') throw new Error(`The indexer does not show the latest transaction of ${address}.`);
    return { txHash: h.replace(/^0x/, '').toLowerCase() };
  };

/* **********************************************************************
 * Start.
 */

export type Deps = {
  readonly logger?: Logger;
  readonly prompt?: Prompt;
  readonly keyStore?: KeyStore;
  readonly stack?: () => string[];
  readonly openSender?: (network: Network, prompt: Prompt, logger: Logger) => Promise<Sender | undefined>;
  readonly latestTx?: (address: string) => Promise<{ txHash: string }>;
  readonly constructorBytes?: (name: string) => Promise<Uint8Array>;
  readonly localKey?: (name: string, circuit: string) => Uint8Array;
  readonly wait?: () => Promise<void>;
  readonly commit?: string;
};

const gitCommit = (): string => {
  const r = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] });
  return r.status === 0 ? r.stdout.toString().trim() : 'unknown';
};

const localKeyFile = (name: string, circuit: string): string => path.join(MANAGED, name, 'keys', `${circuit}.verifier`);

export const main = async (argv: readonly string[], deps: Deps = {}): Promise<number> => {
  let o: Options;
  try {
    o = parseOptions(argv);
  } catch (e) {
    process.stdout.write(`${e instanceof Error ? e.message : String(e)}\n`);
    return 2;
  }
  setNetworkId(o.network);
  let logger: Logger;
  try {
    const secrets =
      o.network === 'undeployed' || deps.openSender !== undefined ? [] : [blockfrostProjectIdFor(o.network)];
    logger =
      deps.logger ??
      (await createLogger(
        path.resolve(currentDir, '..', 'logs', `${o.network}-deploy-v2`, `${new Date().toISOString()}.log`),
        secrets,
      ));
    if (deps.logger === undefined) scrubTerminal(secrets);
  } catch (e) {
    process.stdout.write(`${e instanceof Error ? e.message : String(e)}\n`);
    return 2;
  }
  if (deps.prompt === undefined) process.umask(0o077);
  const prompt = deps.prompt ?? createPrompt();
  const stop = (lines: string[]): number => {
    for (const l of lines) logger.error(l);
    return 1;
  };
  try {
    // 1. The client stack.
    const stack = (deps.stack ?? stackProblems)();
    if (stack.length > 0) return stop(stack);

    // 2. The published keys, and the local build against them.
    let pins: V2Pins;
    let fileSha256: string;
    let compiler: string | undefined;
    try {
      ({ pins, fileSha256, compiler } = loadFingerprintsV2(o.fingerprints));
    } catch (e) {
      return stop([e instanceof Error ? e.message : String(e)]);
    }
    const localKey =
      deps.localKey ??
      ((name: string, circuit: string): Uint8Array => {
        const f = localKeyFile(name, circuit);
        if (!existsSync(f))
          throw new UsageError(`${f} is missing: build the keys on this Mac (runbook section C). Nothing was done.`);
        return new Uint8Array(readFileSync(f));
      });
    if (deps.constructorBytes === undefined)
      for (const name of V2_CONTRACTS)
        if (!haveCompiled(name))
          return stop([`contract-v2 is not built here (npm run compact -w contract-v2). Nothing was done.`]);

    // 3. The record and the temporary key.
    const keyStore = deps.keyStore ?? ageKeyStore;
    let record: Session;
    let file: string;
    let signingKey: string;
    if (o.resume !== undefined) {
      record = readSession(o.resume);
      if (record.network !== o.network) return stop([`${o.resume} is for ${record.network}, not ${o.network}.`]);
      file = o.resume;
      logger.info('Open the temporary key file: age asks for its passphrase.');
      signingKey = keyStore.open(o.keyFile);
      redactThisSession(signingKey);
      if (publicKeyOf(signingKey) !== record.temporaryKey.publicKey)
        return stop([`${o.keyFile} does not hold this record's temporary key. Nothing was sent.`]);
    } else {
      signingKey = sampleSigningKey().value;
      redactThisSession(signingKey);
      logger.info(
        'A new temporary key has been made. It is written ONLY to the age-encrypted file ' +
          `${o.keyFile}; age now asks for a passphrase for it (twice). It is never shown and never goes on paper.`,
      );
      keyStore.create(o.keyFile, signingKey);
      logger.info('Now open it once, with the same passphrase, to prove the file is readable.');
      if (keyStore.open(o.keyFile) !== signingKey)
        return stop([`${o.keyFile} does not read back as the key just made. Nothing was sent.`]);
      record = emptySession({
        network: o.network,
        commit: deps.commit ?? gitCommit(),
        compiler: compiler ?? 'unknown',
        fingerprintsSha256: fileSha256,
        publicKey: publicKeyOf(signingKey),
      });
      file = writeSession(
        o.out ?? `v2-deploy-${o.network}-${record.createdAt.replace(/[-:]|\.\d+/g, '')}.json`,
        record,
        { first: true },
      );
      logger.info(`Deploy-session record (public, no secrets): ${file}`);
    }

    // 4. Say what will happen, and have it typed.
    const word = o.network === 'mainnet' ? 'DEPLOY V2 ON MAINNET' : 'DEPLOY V2';
    logger.info(
      `This deploys contract v2 (main and claims) on ${o.network} with the temporary key alone, then inserts its ` +
        `${Object.keys(pins.veilcore).length + Object.keys(pins['veilcore-claims']).length} keys in slot V4. No call is made. ` +
        'Nothing is pinned. Fees come from the DUST this wallet already has.',
    );
    if ((await prompt.rli.question(`Type ${word} to go on, anything else to stop: `)).trim() !== word) {
      logger.info('Stopped. Nothing was sent.');
      return 1;
    }

    // 5. The wallet, then the deploy.
    const sender = await (deps.openSender ?? ((n, p, l) => openWallet(n, configFor(n), p, l, V2_WALLET)))(
      o.network,
      prompt,
      logger,
    );
    if (sender === undefined) return 1;
    try {
      const reader = sender.providers.publicDataProvider;
      await runDeploy({
        network: String(sender.providers.config.networkId),
        record,
        save: (r) => writeSession(file, r),
        signingKey,
        pins,
        constructorBytes: deps.constructorBytes ?? ((n) => constructorStateBytes(n)),
        localKey,
        send: (tx): Promise<SentTx> =>
          sendLedger9Tx(sender.providers, tx, { allowMainnet: o.network === 'mainnet' && o.sendOnMainnet }),
        readState: (a) => stateBytes(reader, a),
        latestTx: deps.latestTx ?? latestTxFrom(o.network),
        wait: deps.wait ?? (() => new Promise((r) => setTimeout(r, 2_000))),
        log: (l) => logger.info(l),
        perUpdate: o.perUpdate,
      });
    } finally {
      await sender.stop();
    }
    for (const name of V2_CONTRACTS) logger.info(`${name} (v2) address: ${record.contracts[name].address}`);
    logger.info(`Record: ${file}. ${IDENTIFY_NOTE}`);
    logger.info(
      `Next: make NO call to either contract. Run npm run verify:deployment -- --network ${o.network} --v2-record ${file}. ` +
        `Keep ${o.keyFile} until the handover is confirmed on chain, then delete it (docs/runbooks/deploy-v2.md).`,
    );
    return 0;
  } catch (e) {
    if (e instanceof UsageError || e instanceof KeyFileError || e instanceof SavedProgressNotOpenedError)
      logger.error(e.message);
    else if (!(e instanceof PromptClosedError))
      logger.error(
        `Stopped: ${e instanceof Error ? e.message : String(e)}. Run the same command with --resume and the record, ` +
          'and the same --key-file. Do not start a new deploy.',
      );
    return 1;
  } finally {
    if (deps.prompt === undefined) prompt.rli.close();
  }
};

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  process.exit(await main(process.argv.slice(2)));
