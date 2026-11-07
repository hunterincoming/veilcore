// The promise rule (Trust Alchemist, round 8; blueprint section 4): a sentence that says
// genetic data, a record or what someone typed "never leaves", "nothing leaves" or "can't be
// seen/read" must say it is locked (or never leaves unlocked). Those details do reach the
// registry, locked; a sentence without the qualifier is false for them. Sentences about files
// and keys that truly never leave the device pass. Used by copy-truth.test.ts over every
// language, every build.
// SPDX-License-Identifier: Apache-2.0

/**
 * Never/nothing leaves, can't see or read, "your genetic data: nothing", per language. Sending
 * is not the claim here: "never sent to the network" is true of typed details, which go to the
 * registry, locked, and never to the chain.
 */
const CLAIM =
  /never leaves?|nothing (?:you \w+ )?leaves|(?:can[’']t|cannot|can ?not|don[’']t|doesn[’']t) (?:see|read)|verl(?:ä|a)ss\w*[^.]*\bnie\b|\bnie\b[^.]*verl(?:ä|a)ss|nicht (?:lesen|sehen)|nunca sale|nada sale|no (?:puede|podemos|pueden) (?:ver|leer)|ne (?:l[ea]s? |l[’'])?quitte\w* jamais|rien ne (?:quitte|sort)|ne (?:peut|peuvent|pouvons) (?:ni )?(?:pas )?(?:voir|lire)|(?:genetic|genetischen|gen(?:é|e)tic|g(?:é|e)n(?:é|e)tiques)[^.:]*:\s*(?:nothing|nichts|nada|rien)\b|出ません|出ることはありません|出ない|読めません|見えません|読むことはできません/i;

/** Not a privacy claim: a version that can't read a format. */
const NOT_A_CLAIM = /this version|diese Version|esta versi(?:ó|o)n|cette version|このバージョン/i;

/** What the claim is about: genetic data, a record or its details, what someone typed. */
const SUBJECT =
  /genetic|genetics|\brecords?\b|what you (?:type|typed|write)|typed|details|\bnames?\b|notes|\bdata\b|genet|Datens(?:a|ä)tz|eingeb|Angaben|Notizen|Daten\b|registros?|escrib|datos|nombre|notas|g(?:é|e)n(?:é|e)ti|enregistrement|fiches?|saisi|donn(?:é|e)es|\bnom\b|遺伝|記録|入力|データ|名前|メモ|情報/i;

/** Said locked: the qualifier that makes the sentence true. */
const QUALIFIED =
  /encrypted|verschlüsselt|cifrad|chiffr|暗号化|\bunlocked\b|\blocked\b|\block(?:s|ed)? it\b|unverschlossen|verschlossen|sin cerrar|cerrad[oa]s?|déverrouill|verrouill|鍵/i;

/** Sentences, by the language's own full stops. */
export const sentences = (text: string): string[] =>
  text
    .split(/(?<=[.!?。！？])\s*/)
    .map((s) => s.trim())
    .filter(Boolean);

/** The sentences of a string that break the rule. */
export const brokenPromises = (text: string): string[] =>
  sentences(text).filter((s) => CLAIM.test(s) && SUBJECT.test(s) && !QUALIFIED.test(s) && !NOT_A_CLAIM.test(s));
