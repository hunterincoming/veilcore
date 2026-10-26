// Starts the sponsor: configuration, safety checks, wallet, the HTTP routes and the
// anchoring job. Every refusal to start says why, in plain words.
// SPDX-License-Identifier: Apache-2.0

import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocket } from 'ws';
import { signatureVerifyingKey } from '@midnight-ntwrk/ledger-v8';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { assertNotForbidden, assertNotMaintenanceKey, ConfigError, loadConfig } from './config.js';
import { paysForAgreements } from './policy.js';
import { FacadeWallet } from './wallet.js';
import { ProofOfWork } from './pow.js';
import { DailyBudget, Limits, MINUTE, SingleFlight, type BudgetState } from './limits.js';
import { Sponsor } from './sponsor.js';
import { startServer } from './server.js';
import { createIndexerRelay } from './indexer-relay.js';
import { JsonFile } from './state-file.js';
import { ANCHOR_TICK_MINUTES, Anchorer, type Attempt } from './anchorer.js';
import { Sealer, isSealAttempt, type SealAttempt } from './sealer.js';
import { HttpRegistry } from './registry.js';
import { loadVeilcore, MidnightAnchorChain } from './chain.js';
import { log, scrubOutput } from './log.js';

const here = dirname(fileURLToPath(import.meta.url));

/** Where the compiled contract is: the env var, a staged deploy's ./artifacts, or the repo's contract build. */
const findArtifacts = (configured: string): string => {
  if (configured) return resolve(configured);
  const staged = resolve(here, '..', 'artifacts', 'veilcore');
  if (existsSync(staged)) return staged;
  return resolve(here, '..', '..', 'contract', 'src', 'managed', 'veilcore');
};

const isBudget = (v: unknown): v is BudgetState =>
  typeof v === 'object' && v !== null && typeof (v as BudgetState).day === 'string' && /^\d+$/.test(String((v as BudgetState).spent));
const isAttempt = (v: unknown): v is Attempt =>
  typeof v === 'object' && v !== null && typeof (v as Attempt).batchId === 'string' && typeof (v as Attempt).txId === 'string';

const main = async (): Promise<void> => {
  if (!('WebSocket' in globalThis)) (globalThis as { WebSocket?: unknown }).WebSocket = WebSocket;
  const cfg = loadConfig(process.env);
  // Before anything can print an endpoint URL: they carry the Blockfrost project id.
  scrubOutput(cfg.logSecrets);
  setNetworkId(cfg.network);
  const now = () => Date.now();

  const wallet = await FacadeWallet.build(cfg.seed, {
    network: cfg.network,
    indexer: cfg.indexer,
    indexerWS: cfg.indexerWS,
    nodeWS: cfg.nodeWS,
    proofServer: cfg.proofServer,
    stateDir: cfg.stateDir,
  });
  assertNotForbidden([wallet.addresses.unshielded, wallet.addresses.dust], cfg.forbiddenAddresses);
  log('info', 'sponsor wallet', { network: cfg.network, unshielded: wallet.addresses.unshielded, dust: wallet.addresses.dust });

  // The contract must exist here, and the seed must not be its maintenance key.
  const contract = await indexerPublicDataProvider(cfg.indexer, cfg.indexerWS).queryContractState(cfg.contractAddress);
  if (!contract) throw new ConfigError([`There is no contract at ${cfg.contractAddress} on ${cfg.network}.`]);
  assertNotMaintenanceKey(cfg.seed, contract.maintenanceAuthority.committee, signatureVerifyingKey);

  await wallet.start();
  log('info', 'wallet started; syncing (the first sync can take a long time)');

  const pow = process.env.POW_SECRET?.trim()
    ? new ProofOfWork(Buffer.from(process.env.POW_SECRET.trim()), cfg.powDifficulty, 10 * MINUTE, now)
    : ProofOfWork.withRandomSecret(cfg.powDifficulty, 10 * MINUTE, now);
  const limits = new Limits(cfg.limits, now);
  const budgetFile = new JsonFile<BudgetState>(join(cfg.stateDir, 'budget.json'), isBudget);
  const budget = new DailyBudget(cfg.dailyBudgetSpecks, now, budgetFile.load(), (s) => budgetFile.save(s));
  const queue = new SingleFlight(cfg.queueDepth);
  const sponsor = new Sponsor(
    {
      policy: {
        contractAddress: cfg.contractAddress,
        allowedCircuits: cfg.allowedCircuits,
        maxBytes: cfg.maxTxBytes,
        maxTtlMs: cfg.maxTtlMs,
      },
      maxFeeSpecks: { default: cfg.maxFeeSpecks },
      sponsorTtlMs: cfg.maxTtlMs,
      rememberMs: 2 * 60 * MINUTE,
      syncWaitMs: 30_000,
    },
    wallet,
    pow,
    limits,
    budget,
    queue,
    now,
  );

  let anchorer: Anchorer | undefined;
  let sealer: Sealer | undefined;
  let anchorerNote = cfg.anchorer.enabled ? '' : `off: ${cfg.anchorer.why}`;
  // Runs a job while holding the wallet (one fee payment at a time).
  const exclusive = <T>(job: () => Promise<T>) =>
    queue.run(async () => {
      if (!wallet.isSynced() && !(await wallet.waitSynced(60_000))) throw new Error('wallet not synced');
      return job();
    }, { bypassLimit: true });
  // The contract on chain, for both background jobs. Sealing revocations does not need the
  // anchoring job: it runs whenever this build's sealRevocations key matches the chain's.
  let chain: MidnightAnchorChain | undefined;
  let check: Awaited<ReturnType<MidnightAnchorChain['contractCheck']>> | undefined;
  try {
    const artifacts = findArtifacts(cfg.artifactsDir);
    const veilcore = await loadVeilcore(artifacts);
    chain = new MidnightAnchorChain(
      veilcore,
      artifacts,
      cfg.contractAddress,
      cfg.indexer,
      cfg.indexerWS,
      cfg.proofServer,
      wallet,
      wallet.coinPublicKey,
      wallet.encryptionPublicKey,
    );
    check = await chain.contractCheck();
  } catch (e) {
    if (cfg.anchorer.enabled) anchorerNote = `off: ${e instanceof Error ? e.message : String(e)}`;
    log('warn', `sealing job off: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (cfg.anchorer.enabled && chain && check) {
    if (!check.anchorBatchKeyMatches) {
      anchorerNote = 'off: the anchorBatch key in VEILCORE_ARTIFACTS_DIR is not the one on chain (wrong build)';
    } else {
      const attempts = new JsonFile<Attempt>(join(cfg.stateDir, 'anchor-attempt.json'), isAttempt);
      anchorer = new Anchorer(
        {
          network: cfg.network,
          contractAddress: cfg.contractAddress,
          sealEveryMs: cfg.anchorer.everyMs,
          sealAtPending: cfg.anchorer.sealAtPending,
          landingGraceMs: 10 * MINUTE,
          waitForLandingMs: 5 * MINUTE,
          pollMs: 10_000,
          maxFeeSpecks: cfg.maxFeeSpecks,
        },
        new HttpRegistry(cfg.anchorer.registryUrl, cfg.anchorer.operatorToken),
        chain,
        { load: () => attempts.load(), save: (a) => attempts.save(a), clear: () => attempts.clear() },
        exclusive,
        budget, // the same daily budget the public endpoint pays from
        now,
        (ms) => new Promise((r) => setTimeout(r, ms)),
        log,
      );
    }
  }
  if (chain && check?.sealKeyMatches) {
    const seals = new JsonFile<SealAttempt>(join(cfg.stateDir, 'seal-attempt.json'), isSealAttempt);
    sealer = new Sealer(
      chain,
      { load: () => seals.load(), save: (a) => seals.save(a), clear: () => seals.clear() },
      exclusive,
      budget,
      cfg.maxFeeSpecks,
      now,
      log,
    );
  } else if (chain) log('warn', 'sealing job off: no sealRevocations key matching the chain in VEILCORE_ARTIFACTS_DIR');
  if (anchorerNote) log('warn', `anchoring job ${anchorerNote}`);

  const server = startServer(
    {
      sponsor,
      pow,
      limits,
      // Public: no error text (anchorerNote can hold one) and no batch or transaction in flight.
      extraStatus: (detail) => ({
        network: cfg.network,
        contractAddress: cfg.contractAddress,
        // Whether this sponsor pays for license and other agreement calls (policy.ts): what
        // deploy:mainnet checks before it puts a site with licenses switched on live.
        agreements: paysForAgreements(cfg.allowedCircuits),
        // True while the wallet sync has applied nothing for 30 minutes (wallet.ts checkStall).
        syncStalled: wallet.syncStalled(),
        sealer: sealer ? { enabled: true, ...sealer.publicStatus() } : { enabled: false },
        anchorer: anchorer
          ? detail
            ? { enabled: true, ...anchorer.status() }
            : anchorer.publicStatus()
          : detail
            ? { enabled: false, note: anchorerNote }
            : { enabled: false },
      }),
      statusToken: cfg.statusToken || undefined,
      allowedOrigins: cfg.allowedOrigins,
      trustProxyHops: cfg.trustProxyHops,
      maxBodyBytes: Math.ceil((cfg.maxTxBytes * 4) / 3) + 4096,
      // A hosted test site reads the chain through here, so its page carries no key.
      indexerRelay: createIndexerRelay({
        indexer: cfg.indexer,
        indexerWS: cfg.indexerWS,
        allowedOrigins: cfg.allowedOrigins,
      }),
    },
    cfg.port,
  );
  log('info', 'listening', { port: cfg.port });

  setInterval(() => limits.sweep(), MINUTE).unref();
  setInterval(() => log('info', 'counters', { ...sponsor.counters, queue: queue.waiting }), 60 * MINUTE).unref();

  let running = false;
  const tick = async () => {
    if ((!anchorer && !sealer) || running || !wallet.isSynced()) return;
    running = true;
    try {
      if (anchorer) {
        const outcome = await anchorer.runOnce().catch((e: unknown) => `failed: ${e instanceof Error ? e.message : String(e)}`);
        log('info', `anchoring: ${outcome}`);
      }
      if (sealer) await sealer.runOnce().catch((e: unknown) => log('warn', `sealing: ${e instanceof Error ? e.message : String(e)}`));
    } finally {
      running = false;
    }
  };
  setInterval(() => void tick(), ANCHOR_TICK_MINUTES * MINUTE).unref();
  setTimeout(() => void tick(), MINUTE).unref();

  const stop = async () => {
    log('info', 'stopping');
    server.close();
    await wallet.stop().catch(() => undefined);
    process.exit(0);
  };
  process.on('SIGTERM', () => void stop());
  process.on('SIGINT', () => void stop());
};

main().catch((e: unknown) => {
  log('error', e instanceof ConfigError ? e.message : `the sponsor stopped: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
