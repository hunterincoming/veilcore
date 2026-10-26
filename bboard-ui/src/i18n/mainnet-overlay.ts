// Builds a language's mainnet overlay (the words that replace its test-network ones on
// veilcore.org) from that language's own sentences, with the same flags and the same facts
// as the English (en-mainnet.ts mainnetStrings). Used by de, es and fr; Japanese has its own
// (ja.ts jaMainnet). Every key the English overlay sets must be set here too, or the English
// sentence would show in the middle of the page (copy-truth.test.ts checks).
// SPDX-License-Identifier: Apache-2.0

import type { StringKey, Strings } from './en';

export type MainnetFlags = {
  claimsOnMainnet: boolean;
  policyApproved: boolean;
  chainReads?: boolean;
  chainSends?: boolean;
  /** Licenses are switched on at veilcore.org (config/copy.ts AGREEMENTS_LIVE); applied only with chainSends. */
  agreementsLive?: boolean;
};

/** Sentences that change when licenses go live: key → [the practice sentence, the live one]. */
export type LiveSwaps = Partial<Record<StringKey, readonly [string, string]>>;

/**
 * The live wording, swapped into the overlay already built. Throws if a practice sentence is
 * missing, so an edit to one can't leave the live site saying "simulated" (copy-truth.test.ts
 * builds every language with licenses on).
 */
export const applyLiveSwaps = (o: Strings, swaps: LiveSwaps, lang: string): Strings =>
  Object.fromEntries(
    Object.entries(swaps).map(([k, pair]) => {
      const [from, to] = pair;
      const text = o[k as StringKey];
      if (!text || !text.includes(from)) throw new Error(`${lang} mainnet copy, licenses live: "${from}" not found`);
      return [k, text.replace(from, to)];
    }),
  );

export type MainnetWords = {
  /** Every build. */
  common: Strings;
  /** The claims contract's address is pinned, or not yet. */
  claimsLive: Strings;
  claimsPending: Strings;
  /** Who can change the contracts (keyText = keyHolders + one policy sentence + claimsNoKey when pinned). */
  keyHolders: string;
  policyApproved: string;
  policyProposed: string;
  claimsNoKey: string;
  keyTitlePlural: string;
  keyLinkApproved: string;
  keyLinkProposed: string;
  /** The check page reads Midnight itself (relay), or not yet. */
  reads: Strings;
  notReads: Strings;
  /** The mainnet sponsor is live; `stat2` depends on the claims pin. */
  sends: (claimsOnMainnet: boolean) => Strings;
  /** Licenses switched on (with the sponsor live). */
  live: LiveSwaps;
};

export const buildMainnet =
  (w: MainnetWords) =>
  ({
    claimsOnMainnet,
    policyApproved,
    chainReads = false,
    chainSends = false,
    agreementsLive = false,
  }: MainnetFlags): Strings => {
    const o: Strings = {
      ...w.common,
      ...(claimsOnMainnet ? w.claimsLive : w.claimsPending),
      ...(claimsOnMainnet ? { 'm.status.keyTitle': w.keyTitlePlural } : {}),
      'm.status.keyText':
        w.keyHolders + (policyApproved ? w.policyApproved : w.policyProposed) + (claimsOnMainnet ? w.claimsNoKey : ''),
      'm.status.keyLink': policyApproved ? w.keyLinkApproved : w.keyLinkProposed,
      ...(chainReads ? w.reads : w.notReads),
      ...(chainSends ? w.sends(claimsOnMainnet) : {}),
    };
    return chainSends && agreementsLive ? { ...o, ...applyLiveSwaps(o, w.live, 'translated') } : o;
  };
