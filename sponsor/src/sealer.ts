// The sealing job: after a license is revoked, make the revocation bite.
//
// A license presentation proves a path to a root the contract's license tree has had. A
// revocation removes the license from the tree, but the tree keeps its earlier roots until
// sealRevocations runs, so until then a presentation against an earlier root still checks
// out (verifier rule 5 says so: "unsealed"). The contract lets anyone seal once
// SEAL_INTERVAL (600 s) has passed since the last seal; this job does it from the sponsor
// wallet, so a revocation made on the website takes effect within minutes without anyone
// running a tool.
//
// Rules, the same as the anchoring job's:
//   - A transaction that may still land is never built or sent again: the attempt is saved
//     (transaction id, expiry) BEFORE it is sent, and a restart looks it up.
//   - Its fee comes out of the same daily budget as everything else the wallet pays, and is
//     held before anything is built. Over the per-call ceiling, or what is left today: not paid.
//   - It seals only when a revocation is waiting (unsealedChanges). The tree also keeps the
//     roots each activation adds (rootsSinceSeal), and a seal would clear those, but nothing
//     is wrong while they wait, so that alone is not worth a fee.
//   - Someone else may seal first: then the contract refuses ours ("Nothing has changed",
//     "Too soon") and the attempt is simply dropped.
//
// SPDX-License-Identifier: Apache-2.0

import type { Landing, PreparedAnchor } from './anchorer.js';
import type { FeeBudget } from './limits.js';

/** The contract's own numbers (veilcore.compact SEAL_INTERVAL, SEAL_SLACK), in seconds. */
export const SEAL_INTERVAL_S = 600n;
export const SEAL_SLACK_S = 300n;
/** How far ahead of now the seal's time is set: inside the slack, and past any block time. */
export const SEAL_AHEAD_S = 120n;
/** Clock disagreement allowed for before trying (the block time is the chain's, not ours). */
export const SEAL_SKEW_S = 60n;

export type SealView = {
  readonly unsealedChanges: boolean;
  readonly rootsSinceSeal: boolean;
  /** Seconds. */
  readonly lastSealTime: bigint;
};

export interface SealChain {
  sealView(): Promise<SealView>;
  /** Build, prove and pay for sealRevocations(boundSeconds). Nothing is sent. */
  prepareSeal(boundSeconds: bigint): Promise<PreparedAnchor>;
  lookupSeal(txId: string): Promise<Landing>;
}

export type SealAttempt = { readonly txId: string; readonly ttl: string };

export const isSealAttempt = (v: unknown): v is SealAttempt =>
  typeof v === 'object' && v !== null && typeof (v as SealAttempt).txId === 'string' && typeof (v as SealAttempt).ttl === 'string';

export interface SealStore {
  load(): SealAttempt | undefined;
  save(a: SealAttempt): void;
  clear(): void;
}

export type SealOutcome = 'idle' | 'too-soon' | 'sent' | 'waiting' | 'sealed' | 'failed-on-chain' | 'expired' | 'budget' | 'busy' | 'not-sent' | 'maybe-sent';

export class Sealer {
  private last: { at?: string; outcome?: SealOutcome } = {};

  constructor(
    private readonly chain: SealChain,
    private readonly store: SealStore,
    private readonly exclusive: <T>(job: () => Promise<T>) => Promise<T>,
    private readonly budget: FeeBudget,
    private readonly maxFeeSpecks: bigint,
    private readonly now: () => number,
    private readonly log: (level: 'info' | 'warn' | 'error', msg: string, extra?: Record<string, unknown>) => void,
    private readonly landingGraceMs = 10 * 60_000,
  ) {}

  publicStatus(): { readonly lastRunAt?: string; readonly lastOutcome?: SealOutcome } {
    return { lastRunAt: this.last.at, lastOutcome: this.last.outcome };
  }

  private done(o: SealOutcome, msg: string): SealOutcome {
    this.last = { at: new Date(this.now()).toISOString(), outcome: o };
    if (o !== 'idle') this.log(o === 'budget' || o === 'failed-on-chain' ? 'warn' : 'info', `sealing: ${msg}`);
    return o;
  }

  async runOnce(): Promise<SealOutcome> {
    const a = this.store.load();
    if (a) return this.resume(a);

    const v = await this.chain.sealView();
    if (!v.unsealedChanges) return this.done('idle', 'no revocation waiting');
    const nowS = BigInt(Math.floor(this.now() / 1000));
    if (nowS < v.lastSealTime + SEAL_INTERVAL_S + SEAL_SKEW_S) return this.done('too-soon', 'a revocation waits; too soon since the last seal');

    return this.exclusive(async (): Promise<SealOutcome> => {
      const hold = this.budget.reserveUpTo(this.maxFeeSpecks);
      if (hold === undefined) {
        return this.budget.unspent() > 0n
          ? this.done('busy', 'the fee budget is held by requests in flight; next run')
          : this.done('budget', 'the daily fee budget is used up; sealing waits for tomorrow');
      }
      let prepared: PreparedAnchor;
      try {
        prepared = await this.chain.prepareSeal(nowS + SEAL_AHEAD_S);
      } catch (e) {
        this.budget.release(hold.id);
        // The contract refused it here (someone sealed first, or the clock disagrees): nothing sent.
        return this.done('not-sent', `not built: ${e instanceof Error ? e.message : String(e)}`);
      }
      if (typeof prepared.fee !== 'bigint' || prepared.fee < 0n || prepared.fee > hold.amount) {
        this.budget.release(hold.id);
        await prepared.abandon().catch(() => undefined);
        return this.done('budget', 'sealRevocations costs more than the ceiling or what is left today; not sent');
      }
      this.budget.shrink(hold.id, prepared.fee);
      const attempt: SealAttempt = { txId: prepared.txId, ttl: prepared.ttl.toISOString() };
      try {
        this.store.save(attempt);
      } catch (e) {
        this.budget.release(hold.id);
        await prepared.abandon().catch(() => undefined);
        throw e;
      }
      try {
        await prepared.submit();
      } catch (e) {
        if (e instanceof Error && e.name === 'NotSentError') {
          this.budget.release(hold.id);
          this.store.clear();
          await prepared.abandon().catch(() => undefined);
          return this.done('not-sent', `not sent (${e.message}); next run`);
        }
        this.budget.settle(hold.id, prepared.fee);
        return this.done('maybe-sent', `sending ${prepared.txId} may have failed; will look it up`);
      }
      this.budget.settle(hold.id, prepared.fee);
      this.log('info', 'sealing: sent sealRevocations', { txId: prepared.txId });
      return this.done('sent', `sent ${prepared.txId}`);
    });
  }

  private async resume(a: SealAttempt): Promise<SealOutcome> {
    const landing = await this.chain.lookupSeal(a.txId);
    if (landing.state === 'landed') {
      this.store.clear();
      return this.done('sealed', `sealRevocations ${a.txId} landed`);
    }
    if (landing.state === 'failed') {
      this.store.clear();
      return this.done('failed-on-chain', `sealRevocations ${a.txId} failed on chain`);
    }
    if (this.now() > Date.parse(a.ttl) + this.landingGraceMs) {
      this.store.clear();
      return this.done('expired', `sealRevocations ${a.txId} never landed and has expired`);
    }
    return this.done('waiting', `waiting for ${a.txId} to land`);
  }
}
