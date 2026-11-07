// Builds a language's mainnet overlay (the words that replace its test-network ones on
// veilcore.org) from that language's own sentences, with the same flags and the same facts
// as the English (en-mainnet.ts mainnetStrings). Used by de, es and fr; Japanese has its own
// (ja.ts jaMainnet). Every key the English overlay sets must be set here too, or the English
// sentence would show in the middle of the page (copy-truth.test.ts checks).
// SPDX-License-Identifier: Apache-2.0

import type { StringKey, Strings } from './en';
import { SCHEDULED_ANCHORING_RUN_ON_MAINNET } from '../config/copy';

export type MainnetFlags = {
  claimsOnMainnet: boolean;
  policyApproved: boolean;
  chainReads?: boolean;
  chainSends?: boolean;
  /** Licenses are switched on at veilcore.org (config/copy.ts AGREEMENTS_LIVE); applied only with chainSends. */
  agreementsLive?: boolean;
  /** Mainnet: the site offers "prove one number" (the sponsor pays for VeilCore's claims contract). Applied only with chainSends. */
  claimsOnSite?: boolean;
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
  /** The site offers "prove one number" on the claims contract (with the sponsor live). */
  claimsOnSite: Strings;
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
    claimsOnSite = false,
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
      ...(chainSends && claimsOnMainnet && claimsOnSite ? w.claimsOnSite : {}),
    };
    return withoutCadence(chainSends && agreementsLive ? { ...o, ...applyLiveSwaps(o, w.live, 'translated') } : o);
  };

/**
 * Until the scheduled anchoring job has run on mainnet (config/copy.ts
 * SCHEDULED_ANCHORING_RUN_ON_MAINNET), the mainnet pages claim no cadence, neither "by hand" nor
 * "automatically"/"hourly": batches are dated on Midnight, and that is all they say (blueprint
 * section 4). Longest phrases first; each language's phrases only match its own text.
 */
export const CADENCE_SWAPS: readonly (readonly [string, string])[] = [
  // English
  [
    "that we anchor on Midnight's main network, by hand for now, so a new record can wait a while;",
    "that is dated on Midnight's main network;",
  ],
  ["that is anchored on Midnight's main network automatically;", "that is dated on Midnight's main network;"],
  ["the batch is anchored on Midnight's main network automatically", "the batch is dated on Midnight's main network"],
  ["that we anchor on Midnight's main network by hand", "that are dated on Midnight's main network"],
  ["that are anchored on Midnight's main network automatically", "that are dated on Midnight's main network"],
  ['that we anchor there by hand for now', 'that are dated there'],
  ['that are anchored there automatically', 'that are dated there'],
  [
    'Batches are dated automatically, and that dates your record.',
    'Batches are dated on Midnight, and that dates your record.',
  ],
  // Deutsch
  [
    'den wir vorerst von Hand im Hauptnetz von Midnight verankern, ein neuer Datensatz kann also eine Weile warten;',
    'der im Hauptnetz von Midnight datiert wird;',
  ],
  ['der automatisch im Hauptnetz von Midnight verankert wird;', 'der im Hauptnetz von Midnight datiert wird;'],
  [
    'der Stapel wird automatisch im Hauptnetz von Midnight verankert',
    'der Stapel wird im Hauptnetz von Midnight datiert',
  ],
  ['die wir von Hand im Hauptnetz von Midnight verankern', 'die im Hauptnetz von Midnight datiert werden'],
  ['die automatisch im Hauptnetz von Midnight verankert werden', 'die im Hauptnetz von Midnight datiert werden'],
  ['die wir dort vorerst von Hand verankern', 'die dort datiert werden'],
  ['die dort automatisch verankert werden', 'die dort datiert werden'],
  [
    'Stapel werden automatisch datiert, und das datiert Ihren Datensatz.',
    'Stapel werden auf Midnight datiert, und das datiert Ihren Datensatz.',
  ],
  // Español
  [
    'un lote que, por ahora, anclamos a mano en la red principal de Midnight, así que un registro nuevo puede esperar un rato;',
    'un lote que se fecha en la red principal de Midnight;',
  ],
  [
    'un lote que se ancla automáticamente en la red principal de Midnight;',
    'un lote que se fecha en la red principal de Midnight;',
  ],
  [
    'el lote se ancla automáticamente en la red principal de Midnight',
    'el lote se fecha en la red principal de Midnight',
  ],
  ['que anclamos a mano en la red principal de Midnight', 'que se fechan en la red principal de Midnight'],
  ['que se anclan automáticamente en la red principal de Midnight', 'que se fechan en la red principal de Midnight'],
  ['que, por ahora, anclamos allí a mano', 'que se fechan allí'],
  ['que se anclan allí automáticamente', 'que se fechan allí'],
  [
    'Los lotes se fechan automáticamente, y eso fecha su registro.',
    'Los lotes se fechan en Midnight, y eso fecha su registro.',
  ],
  // Français
  [
    "un lot que nous ancrons à la main pour l'instant sur le réseau principal de Midnight, donc un nouvel enregistrement peut attendre un moment ;",
    'un lot daté sur le réseau principal de Midnight ;',
  ],
  [
    'un lot ancré automatiquement sur le réseau principal de Midnight ;',
    'un lot daté sur le réseau principal de Midnight ;',
  ],
  [
    'le lot est ancré automatiquement sur le réseau principal de Midnight',
    'le lot est daté sur le réseau principal de Midnight',
  ],
  ['que nous ancrons à la main sur le réseau principal de Midnight', 'datés sur le réseau principal de Midnight'],
  ['ancrés automatiquement sur le réseau principal de Midnight', 'datés sur le réseau principal de Midnight'],
  ["que nous y ancrons à la main pour l'instant", 'qui y sont datés'],
  ['qui y sont ancrés automatiquement', 'qui y sont datés'],
  [
    'Les lots sont datés automatiquement, et cela date votre enregistrement.',
    'Les lots sont datés sur Midnight, et cela date votre enregistrement.',
  ],
  // 日本語
  [
    '当面は私たちが手作業でMidnightのメインネットワークにアンカーするため、新しい記録はしばらく待つことがあります。',
    'Midnightのメインネットワークで日付が付きます。',
  ],
  [
    'そのバッチは自動でMidnightのメインネットワークにアンカーされます。',
    'そのバッチはMidnightのメインネットワークで日付が付きます。',
  ],
  ['私たちが手作業でMidnightのメインネットワークにアンカーします。', 'Midnightのメインネットワークで日付が付きます。'],
  ['自動でMidnightのメインネットワークにアンカーされます。', 'Midnightのメインネットワークで日付が付きます。'],
  ['当面は私たちが手作業でそこにアンカーします。', 'そこで日付が付きます。'],
  ['自動でそこにアンカーされます。', 'そこで日付が付きます。'],
  ['バッチが自動で日付確定され、', 'バッチがMidnightで日付確定され、'],
];

/** The overlay without a cadence claim, while the scheduled job hasn't run on mainnet. */
export const withoutCadence = (o: Strings, scheduledRan = SCHEDULED_ANCHORING_RUN_ON_MAINNET): Strings =>
  scheduledRan
    ? o
    : Object.fromEntries(
        Object.entries(o).map(([k, v]) => [
          k,
          typeof v === 'string' ? CADENCE_SWAPS.reduce((t, [a, b]) => t.split(a).join(b), v) : v,
        ]),
      );
