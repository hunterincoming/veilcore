// Where the claims contract stands, in each language, for the line under "Show someone"
// (Step5ProveDisclosure.tsx, app.copy.claimsWhere). Three facts, one per build:
//   - onSite: veilcore.org proves a fact (config/copy.ts CLAIMS_ON_THIS_SITE, the same switch
//     as the home page's: a mainnet build sending transactions, with VeilCore's claims contract). Proving a marker or that two
//     varieties differ is still not offered here.
//   - live: the contract is on Midnight's main network (since 8 October 2026), not usable here.
//   - pending: a mainnet build whose claims address isn't pinned.
// The landing page says the same (en-mainnet.ts CLAIMS_ON_SITE, claimsLive, claimsPending).
// copy-truth.test.ts pins every language and every build.
// SPDX-License-Identifier: Apache-2.0

import type { Lang } from '../../config/languages';

export type ClaimsWhereFlags = {
  /** veilcore.org proves a fact (config/copy.ts CLAIMS_ON_THIS_SITE). */
  readonly onSite: boolean;
  /** The claims contract is pinned on mainnet, or this is a test-network build (CLAIMS_ON_MAINNET || !IS_MAINNET). */
  readonly live: boolean;
};

export const CLAIMS_WHERE_WORDS: Record<Lang, { onSite: string; live: string; pending: string }> = {
  en: {
    onSite:
      'It has been on Midnight’s main network since 8 October 2026. On this website you can prove a fact from a certificate or lab result sealed with its numbers: that a number is at most or at least a limit or exactly a value, or that a result is “not detected”. Proving a marker, or that two varieties differ, isn’t on this website yet.',
    live: 'It has been on Midnight’s main network since 8 October 2026, but it can’t be used from this website yet.',
    pending: 'It isn’t on Midnight’s main network yet, and can’t be used from this website.',
  },
  de: {
    onSite:
      'Er ist seit dem 8. Oktober 2026 im Hauptnetz von Midnight. Auf dieser Website können Sie eine Tatsache aus einem Zertifikat oder Laborergebnis belegen, das mit seinen Zahlen versiegelt wurde: dass eine Zahl höchstens oder mindestens einen Grenzwert erreicht oder genau einen Wert hat oder dass ein Ergebnis „nicht nachgewiesen“ ist. Einen Marker zu belegen oder dass sich zwei Sorten unterscheiden, ist auf dieser Website noch nicht möglich.',
    live: 'Er ist seit dem 8. Oktober 2026 im Hauptnetz von Midnight, kann aber von dieser Website aus noch nicht genutzt werden.',
    pending: 'Er ist noch nicht im Hauptnetz von Midnight und kann von dieser Website aus nicht genutzt werden.',
  },
  es: {
    onSite:
      'Está en la red principal de Midnight desde el 8 de octubre de 2026. En este sitio web puede probar un hecho de un certificado o un resultado de laboratorio sellado con sus números: que un número es como máximo o como mínimo un límite, o exactamente un valor, o que un resultado es «no detectado». Demostrar un marcador, o que dos variedades difieren, todavía no está en este sitio web.',
    live: 'Está en la red principal de Midnight desde el 8 de octubre de 2026, pero todavía no se puede usar desde este sitio web.',
    pending: 'Todavía no está en la red principal de Midnight y no se puede usar desde este sitio web.',
  },
  fr: {
    onSite:
      'Il est sur le réseau principal de Midnight depuis le 8 octobre 2026. Sur ce site web, vous pouvez prouver un fait tiré d’un certificat ou d’un résultat de laboratoire scellé avec ses nombres : qu’un nombre est au plus ou au moins une limite, ou exactement une valeur, ou qu’un résultat est « non détecté ». Prouver un marqueur, ou que deux variétés diffèrent, n’est pas encore possible sur ce site web.',
    live: 'Il est sur le réseau principal de Midnight depuis le 8 octobre 2026, mais ne peut pas encore être utilisé depuis ce site web.',
    pending: 'Il n’est pas encore sur le réseau principal de Midnight et ne peut pas être utilisé depuis ce site web.',
  },
  ja: {
    onSite:
      '2026年10月8日からMidnightのメインネットワーク上にあります。このウェブサイトでは、数値ごと封印した証明書やラボ結果について、1つの数値が上限以下・下限以上・ちょうどその値であること、または結果が「不検出」であることを証明できます。マーカーの証明や、2つの品種が異なることの証明は、このウェブサイトではまだできません。',
    live: '2026年10月8日からMidnightのメインネットワーク上にありますが、このウェブサイトからはまだ使えません。',
    pending: 'Midnightのメインネットワークにはまだなく、このウェブサイトからも使えません。',
  },
};

export const claimsWhere = (lang: Lang, f: ClaimsWhereFlags): string => {
  const w = CLAIMS_WHERE_WORDS[lang];
  return f.onSite ? w.onSite : f.live ? w.live : w.pending;
};
