// What a failure says on screen, in the visitor's language.
//
// The record code (veilcore/*) words its errors in English, so its own tests and the support
// details read the same everywhere. Each sentence a person can see is also an app key
// (app/en/errors.ts and the other screens' files) with the same English, and this file turns
// one back into the other: an English message that is a key's English, word for word or
// with its {placeholders} filled, is said in the chosen language. A message that is already
// in the chosen language (a screen threw its own words) shows as it is. Anything else (a
// browser's own error, a library's) gets a translated sentence with the technical words
// after it, marked as English, so nobody reads a bare English sentence in another language.
//
// error-words.test.ts fails if a new English sentence is thrown that is not a key here.
// SPDX-License-Identifier: Apache-2.0

import { appEn, type AppKey } from './app/en';
import { enT, type Translator, type Vars } from './translate';
import { backupMessageWords } from '../components/flow/backup-words';

/**
 * The first sentence of an error, safe to show under "Details" so a person can report it.
 * Long hex (a key, a secret, a contract address, a transaction) never shows: anything over
 * 16 hex characters becomes "…". Cut short if it is long.
 */
export const errorDetail = (error: string): string => {
  const e = error.trim().replace(/^(Error|SponsorRefusal|TypeError):\s*/, '');
  let first = (/^(.+?[.!?])(\s|$)/s.exec(e)?.[1] ?? e).replace(/\s+/g, ' ').trim();
  first = first.replace(/(0x)?[0-9a-fA-F]{17,}/g, '…');
  if (first.length > 200) first = `${first.slice(0, 197).trimEnd()}…`;
  return first;
};

/** A thrown value's words: an Error's message, or the value as text. */
export const messageOf = (e: unknown): string =>
  (e instanceof Error ? e.message : typeof e === 'string' ? e : e == null ? '' : (JSON.stringify(e) ?? '')).trim();

type Pattern = { key: AppKey; re: RegExp; names: string[]; literal: number };
type Index = { exact: Map<string, AppKey>; patterns: Pattern[] };

/** Placeholders that hold another message, which is said in the language too. */
const NESTED = new Set(['error', 'why', 'reason', 'refusals', 'detail']);
/** A template must have this many letters of its own before it is matched with placeholders. */
const MIN_LITERAL = 12;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildIndex = (template: (key: AppKey) => string): Index => {
  const exact = new Map<string, AppKey>();
  const patterns: Pattern[] = [];
  for (const key of Object.keys(appEn) as AppKey[]) {
    const text = template(key).trim();
    if (!text || text.includes('<')) continue;
    const names = [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
    if (names.length === 0) {
      if (!exact.has(text)) exact.set(text, key);
      continue;
    }
    const literal = text.replace(/\{\w+\}/g, '').replace(/[\s\p{P}]/gu, '').length;
    if (literal < MIN_LITERAL) continue;
    const re = new RegExp(
      `^${text
        .split(/\{\w+\}/)
        .map(escape)
        .join('([\\s\\S]+?)')}$`,
    );
    patterns.push({ key, re, names, literal });
  }
  // The most specific template first: the one with the most words of its own.
  patterns.sort((a, b) => b.literal - a.literal);
  return { exact, patterns };
};

const lookup = (index: Index, message: string): { key: AppKey; vars?: Record<string, string> } | undefined => {
  const exact = index.exact.get(message);
  if (exact) return { key: exact };
  for (const p of index.patterns) {
    const m = p.re.exec(message);
    if (m) return { key: p.key, vars: Object.fromEntries(p.names.map((n, i) => [n, m[i + 1]])) };
  }
  return undefined;
};

let englishIndex: Index | undefined;
const english = (): Index => (englishIndex ??= buildIndex((k) => (appEn as Record<string, string>)[k]));

const indexes = new WeakMap<Translator, Index>();
/** The chosen language's own sentences, to recognise a message a screen already translated. */
const own = (tr: Translator): Index => {
  let i = indexes.get(tr);
  if (!i) {
    i = buildIndex((k) => tr.t(k));
    indexes.set(tr, i);
  }
  return i;
};

/** An English message said in `tr`'s language, if it is one of the app's sentences. */
const known = (message: string, tr: Translator, depth = 0): string | undefined => {
  const backup = backupMessageWords(message, tr);
  if (backup !== message) return backup;
  const hit = lookup(english(), message);
  if (!hit) return undefined;
  if (!hit.vars) return tr.t(hit.key);
  const vars: Vars = {};
  for (const [name, value] of Object.entries(hit.vars))
    vars[name] = NESTED.has(name) && depth < 2 ? (known(value, tr, depth + 1) ?? value) : value;
  return tr.t(hit.key, vars);
};

/**
 * A message already in `tr`'s language (a screen threw its own words), with any English
 * message inside it ("Couldn't withdraw it: {error}") said in the language too.
 */
const inLanguage = (message: string, tr: Translator): string | undefined => {
  const hit = lookup(own(tr), message);
  if (!hit) return undefined;
  if (!hit.vars || !Object.keys(hit.vars).some((n) => NESTED.has(n))) return message;
  const vars: Vars = {};
  for (const [name, value] of Object.entries(hit.vars))
    vars[name] = NESTED.has(name) ? (known(value, tr) ?? value) : value;
  return tr.t(hit.key, vars);
};

/**
 * An error as a sentence to show on its own (an alert, a toast, a line under a button).
 * English is unchanged. Another language: the app's own sentence when there is one; else a
 * translated sentence with the technical words after it.
 */
export const errorWords = (e: unknown, tr: Translator = enT): string => {
  const message = messageOf(e);
  if (!message) return tr.t('app.err.unknown');
  if (tr.lang === 'en') return message;
  return known(message, tr) ?? inLanguage(message, tr) ?? tr.t('app.err.technical', { detail: errorDetail(message) });
};

/**
 * An error as the {reason} or {error} inside another translated sentence ("That didn't go
 * through: {reason}."). English is unchanged. Another language: the app's own words when there
 * are some; else "a technical problem" with the technical words, marked as English.
 */
export const errorReason = (e: unknown, tr: Translator = enT): string => {
  const message = messageOf(e);
  if (tr.lang === 'en' || !message) return message;
  return (
    known(message, tr) ?? inLanguage(message, tr) ?? tr.t('app.err.technicalReason', { detail: errorDetail(message) })
  );
};

/** Whether a message is one of the app's sentences (in English), so it can be said in any language. */
export const isKnownError = (message: string): boolean =>
  lookup(english(), message.trim()) !== undefined || backupMessageWords(message.trim(), enT) !== message.trim();
