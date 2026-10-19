// Builds a language's mainnet overlay (the words that replace its test-network ones on
// veilcore.org) from that language's own sentences, with the same flags and the same facts
// as the English (en-mainnet.ts mainnetStrings). Used by de, es and fr; Japanese has its own
// (ja.ts jaMainnet). Every key the English overlay sets must be set here too, or the English
// sentence would show in the middle of the page (copy-truth.test.ts checks).
// SPDX-License-Identifier: Apache-2.0

import type { Strings } from './en';

export type MainnetFlags = {
  claimsOnMainnet: boolean;
  policyApproved: boolean;
  chainReads?: boolean;
  chainSends?: boolean;
};

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
};

export const buildMainnet =
  (w: MainnetWords) =>
  ({ claimsOnMainnet, policyApproved, chainReads = false, chainSends = false }: MainnetFlags): Strings => ({
    ...w.common,
    ...(claimsOnMainnet ? w.claimsLive : w.claimsPending),
    ...(claimsOnMainnet ? { 'm.status.keyTitle': w.keyTitlePlural } : {}),
    'm.status.keyText':
      w.keyHolders + (policyApproved ? w.policyApproved : w.policyProposed) + (claimsOnMainnet ? w.claimsNoKey : ''),
    'm.status.keyLink': policyApproved ? w.keyLinkApproved : w.keyLinkProposed,
    ...(chainReads ? w.reads : w.notReads),
    ...(chainSends ? w.sends(claimsOnMainnet) : {}),
  });
