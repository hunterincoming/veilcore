// SPDX-License-Identifier: Apache-2.0
/**
 * The maintenance committee, online: read who can change the main contract, install the
 * 2-of-3 committee, make a request for the holders to sign, and send a signed change.
 *
 *   node --loader ts-node/esm src/launcher/committee.ts <network> <command> [options]
 *
 *   network   mainnet | preprod | undeployed (a local chain)
 *   command   show                       read the authority now (no wallet, sends nothing)
 *             install --card A --card B --card C [--dry-run] [--confirm FILE x3]
 *                                        the CURRENT single key (typed from paper) hands the
 *                                        contract to the three keys on the cards, any 2 of 3
 *             request --replace --card A --card B --card C | --retire |
 *                     --remove CIRCUIT ... | --insert CIRCUIT=FILE ...  [--reason TEXT] [--out FILE]
 *                                        write a request file for the holders to sign
 *             submit --request FILE --sig FILE --sig FILE [--dry-run] [--confirm FILE x3]
 *                                        check the signatures against the chain and send it
 *   --address HEX   the contract, on preprod or a local chain (mainnet: always the pinned one)
 *
 * --dry-run reads the chain, builds and checks everything, and stops before the wallet:
 * nothing is sent. It writes a dry-run record (a public file: what was checked, for which
 * counter, when, and the request itself).
 *
 * MAINNET IS OFF BY DEFAULT. On mainnet, install and submit send nothing unless the command
 * has both --send-on-mainnet and --dry-run-record FILE, where FILE is the record a --dry-run
 * of exactly the same change wrote in the last 24 hours, for the counter the chain still
 * shows. Without them the command is refused before anything is read or typed. The record is
 * a speed bump, not proof that a dry run happened: it is a plain file, and everything in it
 * that can be worked out again is, and compared.
 *
 * A NEW COMMITTEE NEEDS ITS HOLDERS' CONFIRMATIONS. A change that installs a committee is
 * sent on mainnet only with --confirm FILE three times: each new holder's signature over the
 * dry run's check code, made offline with their stored key (scripts/committee/cli.mjs
 * confirm). All three are verified before the paper key or the wallet is asked for. On a
 * test network they are checked when given.
 *
 * PRACTICE CARDS (keygen --practice) are refused by every mainnet command. On a test network
 * a card that is not a practice card gets a warning, not a refusal. Every run prints exactly what will
 * change (each key that can change the contract now, each key afterwards, the counter before
 * and after) and warns that a wrong committee key is permanent.
 *
 * Everything is built and signed with Midnight Ledger 9 types (scripts/committee/core.mjs),
 * so it sends only on a network that is on Ledger 9. That path has been run against the
 * ledger's own code, not yet against a node: rehearse on a local network first
 * (docs/committee-rehearsal.md).
 *
 * Sending asks for the wallet's recovery phrase hidden, here only, the way
 * `npm run mainnet` does; the phrase is never written anywhere. Fees are paid from DUST
 * the wallet already has: nothing is registered for DUST and no DUST address is changed.
 *
 * The rules (three different keys, threshold two, counters, signatures) live in
 * scripts/committee/core.mjs and are tested against the real ledger in
 * scripts/committee/committee.test.mjs. docs/maintenance-committee.md says it in plain words.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocket } from 'ws';
import { type Logger } from 'pino';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { midnightConfig, setNetworkId } from '../../../api/src/network-id.js';
import { type TestEnvironment } from '@midnight-ntwrk/testkit-js';
import {
  type Action,
  type AuthorityView,
  type KeyCard,
  type Request,
  DRY_RUN_FORMAT,
  DRY_RUN_MAX_AGE_MS,
  PRACTICE_ON_MAINNET,
  assembleSigned,
  changeSummary,
  checkKeyCard,
  confirmationProblems,
  describeRequest,
  fingerprint,
  isPracticeCard,
  isRetired,
  makeRequest,
  newCommittee,
  parseSigningKey,
  rebuildRequest,
  requestLanded,
  signRequest,
} from '../../../scripts/committee/core.mjs';
import { assertLedger9Network, readAuthorityNow, sendMaintenanceUpdate } from '../../../scripts/committee/submit.mjs';
import { MAINNET_VEILCORE_ADDRESS } from '../../../api/src/deploy-guard';
import { indexerWebSocket, usePlainForBlockfrost } from '../../../api/src/indexer-websocket';
import { endpointsFor } from '../../../partner-kit/src/network';
import {
  type Config,
  MainnetConfig,
  PreprodRemoteConfig,
  StandaloneConfig,
  blockfrostProjectIdFor,
  currentDir,
  useMainnetProofServer,
} from '../config.js';
import { createLogger, redactThisSession, scrubTerminal } from '../logger-utils.js';
import { createPrompt, PromptClosedError, type Prompt } from '../prompt.js';
import { settlePassword } from '../password.js';
import { StoreInUseError, lockStoreDir } from '../store-lock.js';
import { storeDirFor } from '../private-store.js';
import { MidnightWalletProvider, SavedProgressNotOpenedError } from '../midnight-wallet-provider.js';
import { syncWallet } from '../wallet-utils.js';

// @ts-expect-error: the indexer client needs a global WebSocket, as in index.ts
globalThis.WebSocket = WebSocket;
// To Blockfrost, the plain protocol only (api/src/indexer-websocket.ts), as in index.ts.
usePlainForBlockfrost();

/** midnight-js's indexer reader, offering Blockfrost the plain protocol only. */
const indexerReader = (indexer: string, indexerWS: string) =>
  indexerPublicDataProvider(indexer, indexerWS, indexerWebSocket(indexerWS, WebSocket) as never);

type Network = 'mainnet' | 'preprod' | 'undeployed';
type Command = 'show' | 'install' | 'request' | 'submit';

export class UsageError extends Error {}

export type Options = {
  readonly network: Network;
  readonly command: Command;
  readonly dryRun: boolean;
  /** Mainnet only: the operator asked, in so many words, to send to mainnet. */
  readonly sendOnMainnet: boolean;
  /** The record a --dry-run of the same change wrote (required to send on mainnet). */
  readonly dryRunRecord?: string;
  readonly address?: string;
  readonly cards: string[];
  readonly sigs: string[];
  /** New holders' confirmations of the check code (needed to send a new committee on mainnet). */
  readonly confirms: string[];
  readonly request?: string;
  readonly replace: boolean;
  readonly retire: boolean;
  readonly remove: string[];
  readonly insert: string[];
  readonly reason: string;
  readonly out?: string;
};

export const USAGE = `Usage: committee.ts <mainnet|preprod|undeployed> <show|install|request|submit> [options]
  show
  install --card FILE --card FILE --card FILE [--dry-run] [--out FILE]
          [--confirm FILE --confirm FILE --confirm FILE]
  request (--replace --card FILE --card FILE --card FILE | --retire | --remove CIRCUIT ... | --insert CIRCUIT=VKFILE ...)
          [--reason TEXT] [--out FILE]
  submit  --request FILE --sig FILE --sig FILE [--dry-run] [--out FILE]
          [--confirm FILE --confirm FILE --confirm FILE]
  --address HEX   the contract on preprod or a local chain (mainnet always uses the pinned address)
  --send-on-mainnet --dry-run-record FILE
                  mainnet only, both needed to send: FILE is what --dry-run wrote for the same change,
                  in the last 24 hours
  --confirm FILE  each new holder's confirmation of the dry run's check code (cli.mjs confirm);
                  all three are needed to send a new committee on mainnet
See docs/maintenance-committee.md.`;

export const MAINNET_OFF =
  'Sending to MAINNET is off by default. First run the same command with --dry-run: it sends nothing and writes ' +
  'a dry-run record. Then, to send, run it with --send-on-mainnet --dry-run-record FILE (the record the dry run ' +
  'wrote) in place of --dry-run. Nothing was read, signed or sent.';

/** The command line, checked. Throws UsageError with what is wrong. */
export const parseOptions = (argv: readonly string[]): Options => {
  const [network, command, ...rest] = argv;
  if (network !== 'mainnet' && network !== 'preprod' && network !== 'undeployed')
    throw new UsageError(`First say the network: mainnet, preprod or undeployed.\n${USAGE}`);
  if (command !== 'show' && command !== 'install' && command !== 'request' && command !== 'submit')
    throw new UsageError(`Then say what to do: show, install, request or submit.\n${USAGE}`);
  const o = {
    network,
    command,
    dryRun: false,
    sendOnMainnet: false,
    cards: [] as string[],
    sigs: [] as string[],
    confirms: [] as string[],
    replace: false,
    retire: false,
    remove: [] as string[],
    insert: [] as string[],
    reason: '',
  } as {
    -readonly [K in keyof Options]: Options[K];
  };
  for (let i = 0; i < rest.length; i++) {
    const flag = rest[i];
    const value = (): string => {
      const v = rest[++i];
      if (v === undefined || v.startsWith('--')) throw new UsageError(`${flag} needs a value.`);
      return v;
    };
    switch (flag) {
      case '--dry-run':
        o.dryRun = true;
        break;
      case '--send-on-mainnet':
        o.sendOnMainnet = true;
        break;
      case '--dry-run-record':
        o.dryRunRecord = value();
        break;
      case '--replace':
        o.replace = true;
        break;
      case '--retire':
        o.retire = true;
        break;
      case '--address':
        o.address = value().trim().toLowerCase();
        break;
      case '--card':
        o.cards.push(value());
        break;
      case '--sig':
        o.sigs.push(value());
        break;
      case '--confirm':
        o.confirms.push(value());
        break;
      case '--request':
        o.request = value();
        break;
      case '--remove':
        o.remove.push(value());
        break;
      case '--insert':
        o.insert.push(value());
        break;
      case '--reason':
        o.reason = value();
        break;
      case '--out':
        o.out = value();
        break;
      default:
        throw new UsageError(`Unknown option ${flag}.\n${USAGE}`);
    }
  }
  if (o.network === 'mainnet' && o.address !== undefined && o.address !== MAINNET_VEILCORE_ADDRESS)
    throw new UsageError('On mainnet this tool works only on the pinned VeilCore main contract. Leave out --address.');
  if (o.network !== 'mainnet' && o.address === undefined && o.command !== 'submit')
    throw new UsageError(`On ${o.network}, say which contract: --address HEX.`);
  if (o.command === 'install' && o.cards.length !== 3)
    throw new UsageError('install needs the three key cards: --card FILE three times.');
  if (o.command === 'submit' && (o.request === undefined || o.sigs.length === 0))
    throw new UsageError('submit needs --request FILE and the signature files (--sig FILE, once for each).');
  if (o.command === 'request') {
    const kinds = [o.replace, o.retire, o.remove.length + o.insert.length > 0].filter(Boolean).length;
    if (kinds !== 1)
      throw new UsageError('request needs one of: --replace (with 3 cards), --retire, or --remove/--insert.');
    if (o.replace && o.cards.length !== 3)
      throw new UsageError('--replace needs the three key cards: --card FILE three times.');
  }
  if (o.dryRun && (o.command === 'show' || o.command === 'request'))
    throw new UsageError(`${o.command} never sends anything; --dry-run is not needed.`);
  const sends = (o.command === 'install' || o.command === 'submit') && !o.dryRun;
  if (o.sendOnMainnet && o.network !== 'mainnet')
    throw new UsageError(`--send-on-mainnet is for mainnet only; this is ${o.network}.`);
  if ((o.sendOnMainnet || o.dryRunRecord !== undefined) && !sends)
    throw new UsageError(
      '--send-on-mainnet and --dry-run-record are for the run that sends (install or submit, without --dry-run).',
    );
  if (o.confirms.length > 0 && !sends)
    throw new UsageError('--confirm is for the run that sends (install or submit, without --dry-run).');
  if (o.network === 'mainnet' && sends && !(o.sendOnMainnet && o.dryRunRecord !== undefined))
    throw new UsageError(MAINNET_OFF);
  return o;
};

const readJson = (file: string, what: string): unknown => {
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as unknown;
  } catch (e) {
    throw new UsageError(`Could not read the ${what} ${file}: ${e instanceof Error ? e.message : String(e)}`);
  }
};

/**
 * The cards, each checked (format, valid key, proof of possession). On mainnet a practice
 * card is refused, whatever the command. On a test network a card that is NOT a practice card
 * gets a warning: it may be a real card being checked, which is allowed.
 */
const readCards = (files: readonly string[], network: Network, logger: Logger): KeyCard[] =>
  files.map((f) => {
    const card = readJson(f, 'key card');
    const c = checkKeyCard(card);
    if (!c.ok) throw new UsageError(`${f}: ${c.problem}`);
    if (network === 'mainnet' && c.practice)
      throw new UsageError(`${f}: "${c.holder}" ${PRACTICE_ON_MAINNET} Nothing was read, signed or sent.`);
    if (network !== 'mainnet' && !c.practice) logger.warn(notPracticeWarning(c.holder, c.publicKey, network));
    return card as KeyCard;
  });

export const notPracticeWarning = (holder: string, publicKey: string, network: string): string =>
  `WARNING: "${holder}" (${fingerprint(publicKey)}) is NOT a practice card, and this is ${network}, a test ` +
  'network. For a rehearsal, make practice keys (keygen --practice --holder practice-NAME). If this is a real ' +
  'card being checked here, never delete its key.';

/** Write a public file, never over an existing one. */
const writePublic = (file: string, value: unknown): string => {
  const p = path.resolve(file);
  if (existsSync(p)) throw new UsageError(`${p} already exists; it is never written over. Choose another --out.`);
  writeFileSync(p, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx', mode: 0o644 });
  return p;
};

const configFor = (network: Network): Config =>
  network === 'mainnet'
    ? new MainnetConfig()
    : network === 'preprod'
      ? new PreprodRemoteConfig()
      : new StandaloneConfig();

/** The indexer, read only: no wallet, no proof server, nothing sent. */
const readOnlyIndexer = (network: Network) => {
  const e =
    network === 'undeployed'
      ? endpointsFor('undeployed')
      : endpointsFor(network, {}, { blockfrostProjectId: blockfrostProjectIdFor(network) });
  return indexerReader(e.indexer, e.indexerWS);
};

const describeAuthority = (a: AuthorityView, cards: readonly KeyCard[] = []): string[] => {
  if (isRetired(a)) return [`Retired: an empty committee; nobody can change this contract. Counter ${a.counter}.`];
  return [
    `${a.committee.length} key(s); ${a.threshold} signature(s) needed for any change; counter ${a.counter}.`,
    ...a.committee.map((k, i) => {
      const who = cards.find((c) => c.publicKey === k)?.holder;
      return `  ${i + 1}. ${fingerprint(k)}${who === undefined ? '' : ` (${who})`}`;
    }),
  ];
};

/* **********************************************************************
 * The wallet, as `npm run mainnet` builds it (bboard-cli/src/index.ts, run and buildWallet):
 * the same private-state password (so a saved sync is reused), the same recovery-phrase
 * prompt, the same DUST address check before the sync, the same rule never to register
 * for DUST on mainnet. Only what sending one maintenance transaction needs.
 */

const GENESIS_MINT_WALLET_SEED = '0000000000000000000000000000000000000000000000000000000000000001';

/** True while a maintenance transaction is being sent: Ctrl+C then says to wait (main). */
let sending = false;

type Sender = {
  readonly providers: Parameters<typeof sendMaintenanceUpdate>[0];
  readonly stop: () => Promise<void>;
};

/**
 * The wallet, typed in hidden: the 24-word recovery phrase, or (preprod and local chains
 * only, as the CLI allows there) a hex seed. Never logged, never stored.
 */
const askWallet = async (
  network: Network,
  prompt: Prompt,
  logger: Logger,
): Promise<{ mnemonic: string } | { seed: string } | undefined> => {
  logger.info(
    "Type or paste your wallet's 24-word recovery phrase, separated by spaces" +
      (network === 'mainnet' ? '' : ' (or, on a test network, its hex seed)') +
      '. Nothing shows; it is not logged or stored. If it is on several lines, paste them all.',
  );
  const words = (lines: readonly string[]): string[] =>
    lines
      .join(' ')
      .split(/\s+/)
      .filter((w) => w !== '');
  const isSeed = (ls: readonly string[]): boolean =>
    network !== 'mainnet' && ls.length === 1 && /^([0-9a-fA-F]{2}){16,64}$/.test(ls[0]);
  const lines = await prompt.askHiddenLines(
    'Recovery phrase: ',
    (ls) => words(ls).length >= 24 || isSeed(ls),
    (ls) => `${words(ls).length} of 24 words so far. Paste or type the rest, then press Enter.`,
  );
  for (const l of lines) redactThisSession(l);
  if (isSeed(lines)) return { seed: lines[0] };
  const list = words(lines).map((w) => w.toLowerCase());
  if (list.length !== 24) {
    logger.error(`That is ${list.length} words, not 24. Nothing was sent.`);
    return undefined;
  }
  const mnemonic = list.join(' ');
  redactThisSession(mnemonic);
  return { mnemonic };
};

const openWallet = async (
  network: Network,
  config: Config,
  prompt: Prompt,
  logger: Logger,
): Promise<Sender | undefined> => {
  // One tool on this network's wallet progress at a time (store-lock.ts), as the CLI does.
  try {
    lockStoreDir(storeDirFor(network));
  } catch (e) {
    if (!(e instanceof StoreInUseError)) throw e;
    logger.error(e.message);
    return undefined;
  }
  if (network !== 'undeployed' && !(await settlePassword(prompt.askHidden, logger))) return undefined;
  // A local chain is read at fixed local addresses (endpointsFor('undeployed')). The wallet
  // must use that same chain, not start a new one of its own, which is what the test kit does
  // unless it is told where the chain is (docs/committee-rehearsal.md, step 3).
  if (network === 'undeployed' && process.env.MN_TEST_ENVIRONMENT !== 'env-var-remote') {
    logger.error(
      'To send on a local chain, say where it is: set MN_TEST_ENVIRONMENT=env-var-remote and the MN_TEST_* ' +
        'variables as in docs/committee-rehearsal.md (step 3). Nothing was sent.',
    );
    return undefined;
  }
  // This tool sends only on a Ledger 9 network (assertLedger9Network), and a proof server
  // serves one ledger: the 9.0.1 one, on every network.
  useMainnetProofServer();
  const testEnv: TestEnvironment = config.getEnvironment(logger);
  let wallet: MidnightWalletProvider | undefined;
  const stop = async (): Promise<void> => {
    try {
      if (wallet !== undefined) await wallet.stop();
    } finally {
      await testEnv.shutdown();
    }
  };
  try {
    const env = await testEnv.start();
    const source =
      network === 'undeployed' ? { seed: GENESIS_MINT_WALLET_SEED } : await askWallet(network, prompt, logger);
    if (source === undefined) {
      await stop();
      return undefined;
    }
    wallet = await MidnightWalletProvider.build(logger, env, source, {
      confirmFreshSync:
        network === 'mainnet'
          ? async () =>
              (
                await prompt.rli.question(
                  'That password does not open your saved progress. If you are sure, type CONTINUE to sync from the start: ',
                )
              ).trim() === 'CONTINUE'
          : undefined,
    });
    const dustAddress = wallet.dustAddress(env.networkId);
    logger.info(`This wallet's DUST address: ${dustAddress}`);
    if (network === 'mainnet') {
      const expected =
        (process.env.VEILCORE_EXPECTED_DUST_ADDRESS ?? '').trim() ||
        (await prompt.rli.question('Paste the DUST address your wallet app shows (mn_dust1…): ')).trim();
      if (expected !== dustAddress) {
        logger.error('That is not this wallet: the recovery phrase gives a different DUST address. Nothing was sent.');
        await stop();
        return undefined;
      }
      logger.info('DUST address matches. Syncing with mainnet; this can take a long time.');
    }
    await wallet.start();
    const synced = await syncWallet(logger, wallet.wallet);
    const dust = synced.dust.balance(new Date(Date.now())) || 0n;
    if (dust === 0n) {
      logger.error(
        'This wallet has no DUST to pay the fee with. Nothing was sent.' +
          (network === 'preprod'
            ? ' On preprod, get some first with npm run preprod-remote (it registers for DUST).'
            : ''),
      );
      await stop();
      return undefined;
    }
    logger.info(`DUST available for fees: ${dust}`);
    // As in index.ts: the pinned compiler writes no integrity manifest.
    const zk = new NodeZkConfigProvider<string>(config.zkConfigPath, { verify: 'require-if-present' });
    return {
      providers: {
        publicDataProvider: indexerReader(env.indexer, env.indexerWS),
        proofProvider: httpClientProofProvider(env.proofServer, zk),
        walletProvider: wallet,
        midnightProvider: wallet,
        config: midnightConfig(),
      },
      stop,
    };
  } catch (e) {
    await stop().catch(() => undefined);
    throw e;
  }
};

/* **********************************************************************
 * The dry-run record: what a --dry-run checked, so the run that sends can be held to it.
 * Public: it holds no key and no signature.
 */

export { DRY_RUN_FORMAT };

type DryRunRecord = {
  readonly format: string;
  readonly what: string;
  readonly network: string;
  readonly contractAddress: string;
  readonly counterBefore: string;
  readonly counterAfter: string;
  /** SHA-256 of the exact bytes the signatures cover: the address, the change and the counter. */
  readonly dataToSignSha256: string;
  readonly change: string[];
  /** When the dry run was made. A record older than 24 hours is refused. */
  readonly createdAt: string;
  /** The request that was checked (public). Holders confirm a new committee from it. */
  readonly request: Request;
};

const digestOf = (update: { readonly dataToSign: Uint8Array }): string =>
  createHash('sha256').update(update.dataToSign).digest('hex');

/** Write the record of a dry run that passed. Returns the file. */
const writeDryRunRecord = (
  o: Options,
  req: Request,
  update: { readonly dataToSign: Uint8Array },
  current: AuthorityView,
): string => {
  const digest = digestOf(update);
  const record: DryRunRecord = {
    format: DRY_RUN_FORMAT,
    what:
      'A VeilCore maintenance change, checked against the chain in a dry run. Nothing was sent. This file is ' +
      'not proof of anything: the tool works everything in it out again before it sends.',
    network: o.network,
    contractAddress: req.contractAddress,
    counterBefore: String(current.counter),
    counterAfter: String(current.counter + 1n),
    dataToSignSha256: digest,
    change: changeSummary(req),
    createdAt: new Date().toISOString(),
    request: req,
  };
  if (o.out !== undefined) return writePublic(o.out, record);
  // The default name holds the counter, the check code and the time: one file for each dry run.
  return writePublic(
    `dry-run-${o.network}-counter-${record.counterBefore}-${digest.slice(0, 16)}-${record.createdAt.replace(/[-:]|\.\d+/g, '')}.json`,
    record,
  );
};

/** A clock a little ahead of this one is not a record from the future. */
const DRY_RUN_FUTURE_MS = 5 * 60 * 1000;

const readJsonFiles = (files: readonly string[], what: string): unknown[] | { problem: string } => {
  const out: unknown[] = [];
  for (const f of files) {
    try {
      out.push(JSON.parse(readFileSync(f, 'utf8')) as unknown);
    } catch (e) {
      return { problem: `Could not read the ${what} ${f}: ${e instanceof Error ? e.message : String(e)}` };
    }
  }
  return out;
};

/**
 * The new holders' confirmations (--confirm): the reasons this change must not be sent, or
 * none. A change that installs a committee needs a valid confirmation from each of its three
 * holders on mainnet; on a test network they are checked when any is given.
 */
export const confirmationSendProblems = (o: Pick<Options, 'network' | 'confirms'>, req: Request): string[] => {
  if (newCommittee(req).length === 0) return [];
  if (o.network !== 'mainnet' && o.confirms.length === 0) return [];
  const files = readJsonFiles(o.confirms, 'confirmation');
  if ('problem' in files) return [files.problem, 'Nothing was sent.'];
  const problems = confirmationProblems(req, files);
  return problems.length === 0 ? [] : [...problems, 'Nothing was sent.'];
};

/**
 * On mainnet: the reasons this change must not be sent, or none. It needs --send-on-mainnet,
 * the record of a dry run of exactly this change made in the last 24 hours for the counter the
 * chain shows now, and, for a new committee, each new holder's confirmation.
 *
 * The record is a speed bump, not proof: it is a plain file anyone could write. So nothing in
 * it is trusted. Every field is compared with what this run works out for itself from the
 * chain and the command line, and the request inside it is rebuilt and must give the same bytes.
 */
export const mainnetSendProblems = (
  o: Pick<Options, 'network' | 'sendOnMainnet' | 'dryRunRecord' | 'confirms'>,
  req: Request,
  update: { readonly dataToSign: Uint8Array },
  current: AuthorityView,
  now: number = Date.now(),
): string[] => {
  if (o.network !== 'mainnet') return [];
  if (!o.sendOnMainnet || o.dryRunRecord === undefined) return [MAINNET_OFF];
  let r: Partial<DryRunRecord> | null;
  try {
    r = JSON.parse(readFileSync(o.dryRunRecord, 'utf8')) as Partial<DryRunRecord> | null;
  } catch (e) {
    return [`Could not read the dry-run record ${o.dryRunRecord}: ${e instanceof Error ? e.message : String(e)}`];
  }
  const problems: string[] = [];
  if (r === null || typeof r !== 'object' || r.format !== DRY_RUN_FORMAT)
    return [`${o.dryRunRecord} is not a dry-run record (${DRY_RUN_FORMAT}). Make a new dry run with this tool.`];
  if (r.network !== 'mainnet') problems.push(`The dry-run record is for ${String(r.network)}, not mainnet.`);
  if (r.contractAddress !== req.contractAddress) problems.push('The dry-run record is for a different contract.');
  if (r.counterBefore !== String(current.counter))
    problems.push(
      `The dry run was made at counter ${String(r.counterBefore)}; the chain now shows ${current.counter}. ` +
        'Something changed the contract since. Start again from a new dry run.',
    );
  else if (r.counterAfter !== String(current.counter + 1n))
    problems.push(
      `The dry-run record gives the counter after the change as ${String(r.counterAfter)}; it would be ${current.counter + 1n}.`,
    );
  const digest = digestOf(update);
  if (r.dataToSignSha256 !== digest)
    problems.push('The dry-run record is for a different change than this one (other keys, or another request).');
  // Its age. The time is in the file, so this stops an old record, not a made-up one.
  const made = typeof r.createdAt === 'string' ? Date.parse(r.createdAt) : NaN;
  if (
    typeof r.createdAt !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(r.createdAt) ||
    Number.isNaN(made)
  )
    problems.push('The dry-run record does not say when it was made. Make a new dry run.');
  else if (made > now + DRY_RUN_FUTURE_MS)
    problems.push(`The dry-run record says it was made in the future (${r.createdAt}). Make a new dry run.`);
  else if (now - made > DRY_RUN_MAX_AGE_MS)
    problems.push(
      `The dry-run record is more than 24 hours old (made ${r.createdAt}). Make a new dry run, and send within ` +
        '24 hours of it.',
    );
  // The request inside it, rebuilt: the same bytes, for the same network and contract.
  const inside = rebuildRequest(r.request);
  if (!inside.ok)
    problems.push(`The request inside the dry-run record is not acceptable: ${inside.problems.join(' ')}`);
  else if (
    digestOf(inside.update) !== digest ||
    r.request?.network !== 'mainnet' ||
    r.request.contractAddress !== req.contractAddress
  )
    problems.push('The request inside the dry-run record is not this change.');
  if (!Array.isArray(r.change) || r.change.join('\n') !== changeSummary(req).join('\n'))
    problems.push('What the dry-run record says will change is not what this run would change.');
  if (problems.length > 0) return [...problems, 'Nothing was sent.'];
  return confirmationSendProblems(o, req);
};

/** Every reason not to send, on any network (the mainnet switch, and the confirmations). */
const sendProblems = (o: Options, req: Request, update: { readonly dataToSign: Uint8Array }, current: AuthorityView) =>
  o.network === 'mainnet' ? mainnetSendProblems(o, req, update, current) : confirmationSendProblems(o, req);

/* **********************************************************************
 * The commands.
 */

const contractOf = (o: Options, req?: Request): string => {
  if (o.network === 'mainnet') return MAINNET_VEILCORE_ADDRESS;
  const a = o.address ?? req?.contractAddress;
  if (a === undefined || !/^[0-9a-f]{64}$/.test(a))
    throw new UsageError('Say which contract: --address HEX (64 characters).');
  return a;
};

type StateReader = Parameters<typeof sendMaintenanceUpdate>[0]['publicDataProvider'];

/** What a command works with. Tests give their own reader and sender (a local ledger). */
export type Ctx = {
  readonly o: Options;
  readonly prompt: Prompt;
  readonly logger: Logger;
  /** The chain, read only. */
  readonly reader: StateReader;
  /** The wallet and providers that send, opened only when something is to be sent. */
  readonly openSender: (network: Network, prompt: Prompt, logger: Logger) => Promise<Sender | undefined>;
  readonly sendOptions?: { waitMs?: number };
};

/** Send `update`, after the operator types `word`. */
const send = async (
  c: Ctx,
  req: Request,
  update: Parameters<typeof sendMaintenanceUpdate>[2],
  current: AuthorityView,
  word: string,
): Promise<boolean> => {
  const { o, prompt, logger } = c;
  // Mainnet is off by default (top of file): the flag, a dry-run record of exactly this change
  // for the counter the chain shows now, and a new committee's confirmations. Checked before a
  // wallet is opened.
  const blocked = sendProblems(o, req, update, current);
  if (blocked.length > 0) {
    for (const l of blocked) logger.error(l);
    return false;
  }
  // The update is a Ledger 9 one (submit.mjs): say so before a wallet is opened, so nobody
  // syncs a wallet for an hour to be refused at the end.
  try {
    await assertLedger9Network(c.reader);
  } catch (e) {
    logger.error(e instanceof Error ? e.message : String(e));
    return false;
  }
  const sender = await c.openSender(o.network, prompt, logger);
  if (sender === undefined) return false;
  try {
    const mainnetNote =
      o.network === 'mainnet'
        ? ' This is MAINNET. Send it only if both founders approved it in writing and it was announced at least ' +
          '14 days ago (docs/maintenance-policy.md).'
        : '';
    logger.info(`Everything is ready.${mainnetNote} This is exactly what will change:`);
    for (const l of changeSummary(req)) logger.info(l);
    const typed = o.network === 'mainnet' ? `${word} ON MAINNET` : word;
    if ((await prompt.rli.question(`Type ${typed} to send it now, anything else to stop: `)).trim() !== typed) {
      logger.info('Not sent.');
      return false;
    }
    const address = req.contractAddress;
    sending = true;
    let r: Awaited<ReturnType<typeof sendMaintenanceUpdate>>;
    try {
      r = await sendMaintenanceUpdate(sender.providers, address, update, (a) => requestLanded(req, a), {
        log: (l) => logger.info(l),
        ...c.sendOptions,
        // Reached on mainnet only past mainnetSendProblems above.
        allowMainnet: o.network === 'mainnet' && o.sendOnMainnet && o.dryRunRecord !== undefined,
      });
    } finally {
      sending = false;
    }
    for (const l of describeAuthority(r.authority)) logger.info(`On chain now: ${l}`);
    const receipt = {
      what: 'VeilCore maintenance change, as sent and confirmed from the chain',
      network: o.network,
      contractAddress: address,
      transaction: r.txId ?? '(not known: see the explorer for the block)',
      blockHeight: r.blockHeight,
      authorityAfter: {
        committee: r.authority.committee,
        threshold: r.authority.threshold,
        counter: String(r.authority.counter),
      },
      request: req,
      confirmedAt: new Date().toISOString(),
    };
    const file = writePublic(
      o.out ?? `maintenance-done-${o.network}-counter-${String(r.authority.counter)}.json`,
      receipt,
    );
    logger.info(`Receipt (public, no secrets) written to ${file}. It goes into the next deployment record revision.`);
    return true;
  } finally {
    await sender.stop();
  }
};

const show = async ({ o, logger, reader }: Ctx): Promise<boolean> => {
  const address = contractOf(o);
  // The cards first: a practice card on mainnet is refused before the chain is read.
  const cards = readCards(o.cards, o.network, logger);
  const a = await readAuthorityNow(reader, address);
  logger.info(`Contract ${address} on ${o.network}:`);
  for (const l of describeAuthority(a, cards)) logger.info(l);
  return true;
};

const install = async (c: Ctx): Promise<boolean> => {
  const { o, prompt, logger } = c;
  const cards = readCards(o.cards, o.network, logger);
  const address = contractOf(o);
  const current = await readAuthorityNow(c.reader, address);
  logger.info(`The authority now: ${describeAuthority(current).join(' ')}`);
  if (current.threshold === 2 && current.committee.join() === cards.map((c) => c.publicKey).join()) {
    logger.info('This committee is already installed. Nothing to do.');
    return true;
  }
  if (current.committee.length !== 1 || current.threshold !== 1)
    throw new UsageError(
      'install is for a contract with one maintenance key. This one has another authority: use request and submit.',
    );
  const req = makeRequest({
    network: o.network,
    contractAddress: address,
    current,
    actions: [{ kind: 'replace-authority', committee: cards, threshold: 2 }],
    reason: o.reason || 'Move maintenance from one key to a 2-of-3 committee (docs/maintenance-committee.md).',
    forbid: current.committee,
  });
  const rebuilt = rebuildRequest(req);
  if (!rebuilt.ok) throw new UsageError(rebuilt.problems.join(' '));
  for (const l of describeRequest(req, rebuilt, { pinnedMainnetAddress: MAINNET_VEILCORE_ADDRESS })) logger.info(l);
  // Hold the run that sends to its dry run (mainnet) and to the new holders' confirmations
  // before the paper key is asked for.
  if (!o.dryRun) {
    const blocked = sendProblems(o, req, rebuilt.update, current);
    if (blocked.length > 0) {
      for (const l of blocked) logger.error(l);
      return false;
    }
  }

  logger.info('The current maintenance key is on paper. It is held in memory for one signature, then dropped.');
  let signature: ReturnType<typeof signRequest> | undefined;
  for (;;) {
    const typed = await prompt.askHidden(
      'Current maintenance key, from your paper (64 hex; spaces fine; nothing shows; blank to stop): ',
    );
    if (typed === '') {
      logger.info('Stopped. Nothing was signed or sent.');
      return false;
    }
    redactThisSession(typed.replace(/[\s-]/g, ''));
    const k = parseSigningKey(typed);
    if ('problem' in k) {
      logger.error(`${k.problem} Try again.`);
      continue;
    }
    redactThisSession(k.value);
    if (k.publicKey !== current.committee[0]) {
      logger.error(
        `That key is not the one on chain (it would be ${fingerprint(k.publicKey)}; the chain has ` +
          `${fingerprint(current.committee[0])}). Check the paper copy for a typo.`,
      );
      continue;
    }
    signature = signRequest(req, k.value);
    break;
  }
  const signed = assembleSigned(req, [signature], current);
  if (!signed.ok) throw new UsageError(signed.problems.join(' '));
  logger.info(
    `Signed by the current key (${fingerprint(current.committee[0])}). Check code ` +
      `${createHash('sha256').update(signed.update.dataToSign).digest('hex').slice(0, 16)}.`,
  );
  if (o.dryRun) {
    const record = writeDryRunRecord(o, req, signed.update, current);
    logger.info(
      'DRY RUN, nothing sent: the paper key is the one on chain, the three cards are valid and different, and the ' +
        `change is built for counter ${current.counter}. Dry-run record (public, no secrets): ${record}. ` +
        CONFIRM_NEXT +
        (o.network === 'mainnet'
          ? 'Then, to send on mainnet within 24 hours, run again with --send-on-mainnet --dry-run-record and that ' +
            'file, and --confirm three times, in place of --dry-run.'
          : 'Run again without --dry-run to send it (with --confirm three times to check the confirmations).'),
    );
    return true;
  }
  const done = await send(c, req, signed.update, current, 'INSTALL');
  if (done)
    logger.info(
      'Installed. The old paper key can no longer change anything: once a second check (show) agrees, destroy ' +
        'both paper copies of it (docs/maintenance-committee.md, Part 2, step 9).',
    );
  return done;
};

const CONFIRM_NEXT =
  'Next, each of the three new holders signs the check code with their stored key, offline: ' +
  'node scripts/committee/cli.mjs confirm --record <that file> --card <their card>. ';

/** On a test network: a warning for each card of a new committee that is not a practice card. */
const warnRealCards = (o: Options, req: Request, logger: Logger): void => {
  if (o.network === 'mainnet') return;
  for (const card of newCommittee(req))
    if (!isPracticeCard(card)) logger.warn(notPracticeWarning(card.holder, card.publicKey, o.network));
};

const requestCommand = async ({ o, logger, reader }: Ctx): Promise<boolean> => {
  const address = contractOf(o);
  // The cards first: a practice card on mainnet is refused before the chain is read.
  const cards = o.replace ? readCards(o.cards, o.network, logger) : [];
  const current = await readAuthorityNow(reader, address);
  if (isRetired(current)) throw new UsageError('This contract is retired: nobody can change it.');
  let actions: Action[];
  if (o.replace) actions = [{ kind: 'replace-authority', committee: cards, threshold: 2 }];
  else if (o.retire) actions = [{ kind: 'retire' }];
  else
    actions = [
      ...o.remove.map((circuit): Action => ({ kind: 'remove-key', circuit })),
      ...o.insert.map((pair): Action => {
        const [circuit, file] = pair.split('=');
        if (!circuit || !file) throw new UsageError('--insert takes CIRCUIT=FILE (a .verifier file).');
        const vk = readFileSync(file);
        return {
          kind: 'insert-key',
          circuit,
          verifierKey: vk.toString('hex'),
          verifierKeySha256: createHash('sha256').update(vk).digest('hex'),
        };
      }),
    ];
  // A single key that can change the contract today cannot be a member of the new committee:
  // the same rule as install. core.mjs applies it to every request by itself; it is said here
  // too so the rule does not rest on one place.
  const forbid = current.committee.length === 1 ? current.committee : [];
  let req: Request;
  try {
    req = makeRequest({ network: o.network, contractAddress: address, current, actions, reason: o.reason, forbid });
  } catch (e) {
    throw new UsageError(e instanceof Error ? e.message : String(e));
  }
  const rebuilt = rebuildRequest(req, { forbid });
  if (!rebuilt.ok) throw new UsageError(rebuilt.problems.join(' '));
  for (const l of describeRequest(req, rebuilt, { pinnedMainnetAddress: MAINNET_VEILCORE_ADDRESS })) logger.info(l);
  const file = writePublic(
    o.out ?? `request-${o.network}-counter-${req.current.counter}-${req.dataToSignSha256.slice(0, 8)}.json`,
    req,
  );
  logger.info(
    `Request written to ${file}. It holds no secret. Send it to the key holders; ${current.threshold} must sign it.`,
  );
  return true;
};

const submit = async (c: Ctx): Promise<boolean> => {
  const { o, logger } = c;
  const req = readJson(o.request ?? '', 'request') as Request;
  if (req?.network !== o.network)
    throw new UsageError(`That request is for ${String(req?.network)}, not ${o.network}.`);
  const address = contractOf(o, req);
  if (req.contractAddress !== address) throw new UsageError('That request is for a different contract.');
  const rebuilt = rebuildRequest(req);
  if (!rebuilt.ok) throw new UsageError(rebuilt.problems.join(' '));
  for (const l of describeRequest(req, rebuilt, { pinnedMainnetAddress: MAINNET_VEILCORE_ADDRESS })) logger.info(l);
  warnRealCards(o, req, logger);
  const current = await readAuthorityNow(c.reader, address);
  if (requestLanded(req, current)) {
    logger.info('The chain already shows this change. Nothing to send.');
    return true;
  }
  // A single key that can change the contract today cannot be a member of the new committee,
  // judged against the chain as it is now, not only against what the request file says.
  const forbid = current.committee.length === 1 ? current.committee : [];
  const signed = assembleSigned(
    req,
    o.sigs.map((f) => readJson(f, 'signature')),
    current,
    { forbid },
  );
  if (!signed.ok) throw new UsageError(signed.problems.join(' '));
  for (const w of signed.warnings) logger.warn(`Ignored: ${w}`);
  logger.info(`Signed by ${signed.signers.join(' and ')}: enough for this committee (${current.threshold} needed).`);
  if (o.dryRun) {
    const record = writeDryRunRecord(o, req, signed.update, current);
    logger.info(
      `DRY RUN, nothing sent: the signatures are valid for the chain as it is now. Dry-run record (public, no secrets): ${record}. ` +
        (newCommittee(req).length > 0 ? CONFIRM_NEXT : '') +
        (o.network === 'mainnet'
          ? 'To send on mainnet within 24 hours, run again with --send-on-mainnet --dry-run-record and that file ' +
            (newCommittee(req).length > 0 ? '(and --confirm three times) ' : '') +
            'in place of --dry-run.'
          : 'Run again without --dry-run to send.'),
    );
    return true;
  }
  return send(c, req, signed.update, current, 'SEND');
};

/* **********************************************************************
 * Start.
 */

/** Run one command. `deps` replaces the chain, the wallet, the prompt or the logger (tests). */
export const main = async (
  argv: readonly string[],
  deps: Partial<Pick<Ctx, 'reader' | 'openSender' | 'prompt' | 'logger' | 'sendOptions'>> = {},
): Promise<number> => {
  let o: Options;
  try {
    o = parseOptions(argv);
  } catch (e) {
    process.stdout.write(`${e instanceof Error ? e.message : String(e)}\n`);
    return 2;
  }
  setNetworkId(o.network);
  let logger: Logger;
  let reader: StateReader;
  try {
    // Mainnet and preprod are read through Blockfrost; its project id travels in the URLs.
    const secrets = o.network === 'undeployed' || deps.reader !== undefined ? [] : [blockfrostProjectIdFor(o.network)];
    logger =
      deps.logger ??
      (await createLogger(
        path.resolve(currentDir, '..', 'logs', `${o.network}-committee`, `${new Date().toISOString()}.log`),
        secrets,
      ));
    if (deps.logger === undefined) scrubTerminal(secrets);
    reader = deps.reader ?? readOnlyIndexer(o.network);
  } catch (e) {
    process.stdout.write(`${e instanceof Error ? e.message : String(e)}\n`);
    return 2;
  }
  // Everything this writes is for this user only.
  if (deps.prompt === undefined) process.umask(0o077);
  const prompt = deps.prompt ?? createPrompt();
  const ctx: Ctx = {
    o,
    prompt,
    logger,
    reader,
    openSender: deps.openSender ?? ((n, p, l) => openWallet(n, configFor(n), p, l)),
    sendOptions: deps.sendOptions,
  };
  // Ctrl+C: stops at once, except while the transaction is being sent, when stopping would
  // leave you not knowing whether it landed. The third press stops anyway.
  let presses = 0;
  const onInterrupt = (): void => {
    if (sending && ++presses < 3) {
      logger.warn('The change is being sent. Wait for the result. Press Ctrl+C three times to stop anyway.');
      return;
    }
    if (sending)
      logger.warn('Stopped while sending. Run "show" in a few minutes: if the counter went up by one, it landed.');
    process.exit(130);
  };
  prompt.rli.on('SIGINT', onInterrupt);
  if (deps.prompt === undefined) process.on('SIGINT', onInterrupt);
  try {
    const ok =
      o.command === 'show'
        ? await show(ctx)
        : o.command === 'install'
          ? await install(ctx)
          : o.command === 'request'
            ? await requestCommand(ctx)
            : await submit(ctx);
    return ok ? 0 : 1;
  } catch (e) {
    if (e instanceof UsageError || e instanceof SavedProgressNotOpenedError) logger.error(e.message);
    else if (!(e instanceof PromptClosedError)) logger.error(`Stopped: ${e instanceof Error ? e.message : String(e)}`);
    return 1;
  } finally {
    prompt.rli.off('SIGINT', onInterrupt);
    process.off('SIGINT', onInterrupt);
    if (deps.prompt === undefined) prompt.rli.close();
  }
};

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  process.exit(await main(process.argv.slice(2)));
