// SPDX-License-Identifier: Apache-2.0
/**
 * The contract v2 smoke run: call every circuit of v2 main and v2 claims once, with throwaway
 * test records, check each result in the contract's state, and print a pass/fail table
 * (docs/runbooks/deploy-v2.md, step 11).
 *
 *   npm run smoke-v2 -- --network preprod --v2-record ~/veilcore-v2/preprod-record.json [--out FILE]
 *
 *   --network NAME             preprod (the run the runbook needs), or undeployed (a local Ledger 9
 *                              chain). mainnet only together with --i-understand-team-only.
 *   --v2-record FILE           the deploy-session record (`npm run deploy-v2`): the two addresses
 *   --out FILE                 also write the table as JSON (public: no secret is in it)
 *   --i-understand-team-only   needed on mainnet, together with typing SMOKE V2 ON MAINNET
 *
 * Before anything is typed it refuses unless: the client stack is the Ledger 9 one and proof
 * server 9.0.2 is pinned by digest (scripts/v2/stack.mjs, scripts/v2/proof-server.mjs); the
 * record is for this network and names both contracts; the keys are built here (runbook C).
 * Then it starts proof server 9.0.2 from bboard-cli/proof-server-v2.yml, asks it its version
 * (it must say 9.0.2), and only then asks for the wallet's recovery phrase, at a hidden prompt.
 *
 * Fees come from DUST the wallet already has; nothing registers for DUST and no DUST or NIGHT
 * setting is touched. Every test secret is made fresh for the run and kept in memory only.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { type Logger } from 'pino';
import { setNetworkId } from '../../../api/src/network-id.js';
import {
  blockfrostProjectIdFor,
  currentDir,
  MainnetConfig,
  PreprodRemoteConfig,
  StandaloneConfig,
  type Config,
} from '../config.js';
import { createLogger, scrubTerminal } from '../logger-utils.js';
import { createPrompt, PromptClosedError, type Prompt } from '../prompt.js';
import { SavedProgressNotOpenedError } from '../midnight-wallet-provider.js';
import { V2_WALLET, openWallet } from './committee.js';
import { stackProblems } from '../../../scripts/v2/stack.mjs';
import { ROOT, V2_CONTRACTS } from '../../../scripts/v2/fingerprints.mjs';
import { readSession } from '../../../scripts/v2/session.mjs';
import { MANAGED } from '../../../scripts/v2/constructor.mjs';

type Network = 'mainnet' | 'preprod' | 'undeployed';

export class UsageError extends Error {}

export type Options = {
  readonly network: Network;
  readonly record: string;
  readonly out?: string;
  readonly teamOnly: boolean;
};

export const USAGE = `Usage: smoke-v2.ts --network <preprod|undeployed> --v2-record FILE [--out FILE]
       smoke-v2.ts --network mainnet --i-understand-team-only --v2-record FILE [--out FILE]
See docs/runbooks/deploy-v2.md, step 11.`;

export const MAINNET_REFUSAL =
  'The smoke run makes real transactions on the contract it is pointed at. On MAINNET it needs ' +
  '--network mainnet --i-understand-team-only (and typing SMOKE V2 ON MAINNET). Nothing was done.';

export const parseOptions = (argv: readonly string[]): Options => {
  const o = { teamOnly: false } as { -readonly [K in keyof Options]: Options[K] };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const value = (): string => {
      const v = argv[++i];
      if (v === undefined || v.startsWith('--')) throw new UsageError(`${flag} needs a value.`);
      return v;
    };
    if (flag === '--network') {
      const n = value();
      if (n !== 'mainnet' && n !== 'preprod' && n !== 'undeployed')
        throw new UsageError(`Unknown network "${n}": preprod, undeployed or mainnet.\n${USAGE}`);
      o.network = n;
    } else if (flag === '--v2-record') o.record = value();
    else if (flag === '--out') o.out = value();
    else if (flag === '--i-understand-team-only') o.teamOnly = true;
    else throw new UsageError(`Unknown option ${flag}.\n${USAGE}`);
  }
  if (o.network === undefined) throw new UsageError(`Say the network: --network preprod.\n${USAGE}`);
  if (o.record === undefined) throw new UsageError(`Say which v2 deploy to test: --v2-record FILE.\n${USAGE}`);
  if (o.network === 'mainnet' && !o.teamOnly) throw new UsageError(MAINNET_REFUSAL);
  if (o.teamOnly && o.network !== 'mainnet')
    throw new UsageError(`--i-understand-team-only is for mainnet only; this is ${o.network}.`);
  return o;
};

/* **********************************************************************
 * The plan and the chain live in contract-v2 (compiled with its own compiler and runtime), and
 * are loaded when the run starts: the CLI's own build does not compile contract v2.
 */

type Row = { result: 'PASS' | 'FAIL' | 'NOT RUN' } & Record<string, unknown>;
type Chain = unknown;
export type SmokeModules = {
  runSmoke(chain: Chain, o: { log: (l: string) => void }): Promise<Row[]>;
  formatTable(rows: readonly Row[]): string;
  SMOKE_CALLS: number;
  midnightSmokeChain(d: { providers: unknown; proofServer: string; addresses: Record<string, string> }): Promise<Chain>;
};

export const loadSmoke = async (): Promise<SmokeModules> => {
  const src = path.join(ROOT, 'contract-v2', 'src');
  const plan = (await import(pathToFileURL(path.join(src, 'smoke.ts')).href)) as Pick<
    SmokeModules,
    'runSmoke' | 'formatTable' | 'SMOKE_CALLS'
  >;
  const chain = (await import(pathToFileURL(path.join(src, 'smoke-chain.ts')).href)) as Pick<
    SmokeModules,
    'midnightSmokeChain'
  >;
  return { ...plan, ...chain };
};

/** Why the keys are not built here; empty when both contracts have their keys (runbook section C). */
export const keyProblems = (managed: string = MANAGED): string[] =>
  V2_CONTRACTS.flatMap((name: string) => {
    const dir = path.join(managed, name, 'keys');
    const has = existsSync(dir) && readdirSync(dir).some((f) => f.endsWith('.prover'));
    return has
      ? []
      : [`${dir} has no keys: build them on this Mac first (runbook section C, npm run compact -w contract-v2).`];
  });

type Sender = NonNullable<Awaited<ReturnType<typeof openWallet>>>;

const configFor = (network: Network): Config =>
  network === 'mainnet'
    ? new MainnetConfig()
    : network === 'preprod'
      ? new PreprodRemoteConfig()
      : new StandaloneConfig();

export type Deps = {
  readonly logger?: Logger;
  readonly prompt?: Prompt;
  readonly stack?: () => string[];
  readonly keys?: () => string[];
  readonly load?: () => Promise<SmokeModules>;
  readonly openSender?: (network: Network, prompt: Prompt, logger: Logger) => Promise<Sender | undefined>;
  readonly commit?: string;
};

const gitCommit = (): string => {
  const r = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] });
  return r.status === 0 ? r.stdout.toString().trim() : 'unknown';
};

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
        path.resolve(currentDir, '..', 'logs', `${o.network}-smoke-v2`, `${new Date().toISOString()}.log`),
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
    // 1. The client stack, and proof server 9.0.2 by digest.
    const stack = (deps.stack ?? stackProblems)();
    if (stack.length > 0) return stop(stack);

    // 2. The two contracts, from the deploy record.
    let addresses: Record<string, string>;
    try {
      const s = readSession(o.record);
      if (s.network !== o.network)
        return stop([`${o.record} is for ${s.network}, not ${o.network}. Nothing was done.`]);
      addresses = {};
      for (const name of V2_CONTRACTS) {
        const a = s.contracts[name].address;
        if (a === null || s.contracts[name].deploy === null)
          return stop([
            `The record has no deployed ${name}: finish the deploy first (deploy-v2 --resume). Nothing was done.`,
          ]);
        addresses[name] = a;
      }
    } catch (e) {
      return stop([e instanceof Error ? e.message : String(e)]);
    }

    // 3. The keys, built on this Mac.
    const keys = (deps.keys ?? keyProblems)();
    if (keys.length > 0) return stop(keys);

    // 4. The plan (loaded now, so a broken checkout stops before the wallet).
    const smoke = await (deps.load ?? loadSmoke)();

    // 5. Say what will happen, and have it typed.
    const word = o.network === 'mainnet' ? 'SMOKE V2 ON MAINNET' : 'SMOKE V2';
    logger.info(
      `This calls every circuit of contract v2 on ${o.network} (main ${addresses.veilcore}, claims ` +
        `${addresses['veilcore-claims']}): ${smoke.SMOKE_CALLS} transactions, with test records made up for this run. ` +
        'Fees come from the DUST this wallet already has. It takes a while (each call is proved on this Mac).',
    );
    if (o.network === 'mainnet')
      logger.info('MAINNET: these are real transactions on the v2 contracts, for the team only. Nothing is pinned.');
    if ((await prompt.rli.question(`Type ${word} to go on, anything else to stop: `)).trim() !== word) {
      logger.info('Stopped. Nothing was sent.');
      return 1;
    }

    // 6. Proof server 9.0.2 (asked its version), then the wallet.
    const sender = await (deps.openSender ?? ((n, p, l) => openWallet(n, configFor(n), p, l, V2_WALLET)))(
      o.network,
      prompt,
      logger,
    );
    if (sender === undefined) return 1;
    let rows: Row[];
    try {
      const net = String(sender.providers.config.networkId).toLowerCase();
      if (net !== o.network) return stop([`The wallet is on ${net}, not ${o.network}. Nothing was sent.`]);
      if (sender.proofServer === undefined) return stop(['No proof server was started. Nothing was sent.']);
      const chain = await smoke.midnightSmokeChain({
        providers: sender.providers,
        proofServer: sender.proofServer,
        addresses,
      });
      rows = await smoke.runSmoke(chain, { log: (l) => logger.info(l) });
    } finally {
      await sender.stop();
    }

    // 7. The table.
    const table = smoke.formatTable(rows);
    process.stdout.write(`\n${table}\n\n`);
    if (o.out !== undefined) {
      const file = path.resolve(o.out);
      writeFileSync(
        file,
        `${JSON.stringify(
          {
            what: 'A VeilCore contract v2 smoke run (docs/runbooks/deploy-v2.md, step 11). Public: test data only, no secret.',
            network: o.network,
            commit: deps.commit ?? gitCommit(),
            at: new Date().toISOString(),
            addresses,
            rows,
          },
          (_k, v: unknown) => (typeof v === 'bigint' ? v.toString() : v),
          2,
        )}\n`,
        { flag: 'wx', mode: 0o644 },
      );
      logger.info(`Written: ${file}`);
    }
    return rows.every((r) => r.result === 'PASS') ? 0 : 1;
  } catch (e) {
    if (e instanceof UsageError || e instanceof SavedProgressNotOpenedError) logger.error(e.message);
    else if (!(e instanceof PromptClosedError)) logger.error(`Stopped: ${e instanceof Error ? e.message : String(e)}`);
    return 1;
  } finally {
    if (deps.prompt === undefined) prompt.rli.close();
  }
};

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  process.exit(await main(process.argv.slice(2)));
