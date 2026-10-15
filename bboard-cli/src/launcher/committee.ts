// SPDX-License-Identifier: Apache-2.0
/**
 * The maintenance committee, online: read who can change the main contract, install the
 * 2-of-3 committee, make a request for the holders to sign, and send a signed change.
 *
 *   node --loader ts-node/esm src/launcher/committee.ts <network> <command> [options]
 *
 *   network   mainnet | preprod | undeployed (a local chain)
 *   command   show                       read the authority now (no wallet, sends nothing)
 *             install --card A --card B --card C [--dry-run]
 *                                        the CURRENT single key (typed from paper) hands the
 *                                        contract to the three keys on the cards, any 2 of 3
 *             request --replace --card A --card B --card C | --retire |
 *                     --remove CIRCUIT ... | --insert CIRCUIT=FILE ...  [--reason TEXT] [--out FILE]
 *                                        write a request file for the holders to sign
 *             submit --request FILE --sig FILE --sig FILE [--dry-run]
 *                                        check the signatures against the chain and send it
 *   --address HEX   the contract, on preprod or a local chain (mainnet: always the pinned one)
 *
 * --dry-run reads the chain, builds and checks everything, and stops before the wallet:
 * nothing is sent. Sending asks for the wallet's recovery phrase hidden, here only, the way
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
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { type TestEnvironment } from '@midnight-ntwrk/testkit-js';
import {
  type Action,
  type AuthorityView,
  type KeyCard,
  type Request,
  assembleSigned,
  checkKeyCard,
  describeRequest,
  fingerprint,
  isRetired,
  makeRequest,
  parseSigningKey,
  rebuildRequest,
  requestLanded,
  signRequest,
} from '../../../scripts/committee/core.mjs';
import { readAuthorityNow, sendMaintenanceUpdate } from '../../../scripts/committee/submit.mjs';
import { MAINNET_VEILCORE_ADDRESS } from '../../../api/src/deploy-guard';
import { endpointsFor } from '../../../partner-kit/src/network';
import {
  type Config,
  MainnetConfig,
  PreprodRemoteConfig,
  StandaloneConfig,
  blockfrostProjectIdFor,
  currentDir,
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

type Network = 'mainnet' | 'preprod' | 'undeployed';
type Command = 'show' | 'install' | 'request' | 'submit';

export class UsageError extends Error {}

export type Options = {
  readonly network: Network;
  readonly command: Command;
  readonly dryRun: boolean;
  readonly address?: string;
  readonly cards: string[];
  readonly sigs: string[];
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
  install --card FILE --card FILE --card FILE [--dry-run]
  request (--replace --card FILE --card FILE --card FILE | --retire | --remove CIRCUIT ... | --insert CIRCUIT=VKFILE ...)
          [--reason TEXT] [--out FILE]
  submit  --request FILE --sig FILE --sig FILE [--dry-run]
  --address HEX   the contract on preprod or a local chain (mainnet always uses the pinned address)
See docs/maintenance-committee.md.`;

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
    cards: [] as string[],
    sigs: [] as string[],
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
  return o;
};

const readJson = (file: string, what: string): unknown => {
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as unknown;
  } catch (e) {
    throw new UsageError(`Could not read the ${what} ${file}: ${e instanceof Error ? e.message : String(e)}`);
  }
};

/** The three cards, each checked (format, valid key, proof of possession). */
const readCards = (files: readonly string[]): KeyCard[] =>
  files.map((f) => {
    const card = readJson(f, 'key card');
    const c = checkKeyCard(card);
    if (!c.ok) throw new UsageError(`${f}: ${c.problem}`);
    return card as KeyCard;
  });

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
  return indexerPublicDataProvider(e.indexer, e.indexerWS);
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
    const zk = new NodeZkConfigProvider<string>(config.zkConfigPath);
    return {
      providers: {
        publicDataProvider: indexerPublicDataProvider(env.indexer, env.indexerWS),
        proofProvider: httpClientProofProvider(env.proofServer, zk),
        walletProvider: wallet,
        midnightProvider: wallet,
      },
      stop,
    };
  } catch (e) {
    await stop().catch(() => undefined);
    throw e;
  }
};

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

type StateReader = Parameters<typeof readAuthorityNow>[0];

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
  word: string,
): Promise<boolean> => {
  const { o, prompt, logger } = c;
  const sender = await c.openSender(o.network, prompt, logger);
  if (sender === undefined) return false;
  try {
    const mainnetNote =
      o.network === 'mainnet'
        ? ' This is MAINNET. Send it only if both founders approved it in writing and it was announced at least ' +
          '14 days ago (docs/maintenance-policy.md).'
        : '';
    logger.info(`Everything is ready.${mainnetNote}`);
    if ((await prompt.rli.question(`Type ${word} to send it now, anything else to stop: `)).trim() !== word) {
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
  const a = await readAuthorityNow(reader, address);
  logger.info(`Contract ${address} on ${o.network}:`);
  for (const l of describeAuthority(a, readCards(o.cards))) logger.info(l);
  return true;
};

const install = async (c: Ctx): Promise<boolean> => {
  const { o, prompt, logger } = c;
  const cards = readCards(o.cards);
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
    logger.info(
      'DRY RUN, nothing sent: the paper key is the one on chain, the three cards are valid and different, and the ' +
        `change is built for counter ${current.counter}. Run again without --dry-run to send it.`,
    );
    return true;
  }
  const done = await send(c, req, signed.update, 'INSTALL');
  if (done)
    logger.info(
      'Installed. The old paper key can no longer change anything: once a second check (show) agrees, destroy ' +
        'both paper copies of it (docs/maintenance-committee.md, step 7).',
    );
  return done;
};

const requestCommand = async ({ o, logger, reader }: Ctx): Promise<boolean> => {
  const address = contractOf(o);
  const current = await readAuthorityNow(reader, address);
  if (isRetired(current)) throw new UsageError('This contract is retired: nobody can change it.');
  let actions: Action[];
  if (o.replace) actions = [{ kind: 'replace-authority', committee: readCards(o.cards), threshold: 2 }];
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
  const req = makeRequest({ network: o.network, contractAddress: address, current, actions, reason: o.reason });
  const rebuilt = rebuildRequest(req);
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
  const current = await readAuthorityNow(c.reader, address);
  if (requestLanded(req, current)) {
    logger.info('The chain already shows this change. Nothing to send.');
    return true;
  }
  const signed = assembleSigned(
    req,
    o.sigs.map((f) => readJson(f, 'signature')),
    current,
  );
  if (!signed.ok) throw new UsageError(signed.problems.join(' '));
  for (const w of signed.warnings) logger.warn(`Ignored: ${w}`);
  logger.info(`Signed by ${signed.signers.join(' and ')}: enough for this committee (${current.threshold} needed).`);
  if (o.dryRun) {
    logger.info(
      'DRY RUN, nothing sent: the signatures are valid for the chain as it is now. Run again without --dry-run to send.',
    );
    return true;
  }
  return send(c, req, signed.update, 'SEND');
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
