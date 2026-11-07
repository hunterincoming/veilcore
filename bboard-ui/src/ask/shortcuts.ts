// Shortcuts: Ask's engine with no model. It reads what was typed, in English, German, Spanish,
// French or Japanese, with fixed word lists, and answers with a draft for a screen or something
// to show (engine.ts). Instant, offline, and nothing to download.
//
// It reads only the Ask box (at most ASK_MAX_CHARS characters) and the names of the person's own
// records, to find the ones they named. Matching is by word lists and plain substring search:
// no pattern here can take longer than the text is long. A miss shows the three closest things
// Ask can do, never "I didn't understand".
// SPDX-License-Identifier: Apache-2.0

import { isAnimal } from '../veilcore/animal-profile';
import { isStrain } from '../veilcore/strain-profile';
import type { StrainRecord } from '../veilcore/records';
import {
  ASK_ACTIONS,
  ASK_MAX_CHARS,
  TOPICS,
  type AskAction,
  type AskContext,
  type AskEngine,
  type AskResult,
  type Topic,
} from './engine';
import { MAX_BATCH, type AskDraft, type DraftKind, type DraftPreset } from './handoff';

// ---- word lists (a trailing * is a prefix; anything with a space or Japanese is a substring) ----

// prettier-ignore
const CLONES = ['clone*', 'cutting*', 'cut', 'cuts', 'klon*', 'steckling*', 'schneiden', 'clon*', 'esqueje*', 'cortar', 'bouture*', 'couper', 'クローン', '挿し木', '挿し穂'];
// prettier-ignore
const OFFSPRING = ['calf', 'calves', 'offspring', 'young', 'kid', 'kids', 'lamb*', 'foal*', 'piglet*', 'pup', 'puppies', 'litter', 'born', 'kalb', 'kälber', 'nachwuchs', 'nachkommen', 'jungtier*', 'geboren', 'ternero*', 'cría*', 'cria*', 'crías', 'descendencia', 'nacid*', 'veau', 'veaux', 'descendance', 'petits', 'nés', '子牛', '産子', '子を', '生まれ',
  // How breeders say it (the breeders' review): dogs, horses, sheep, goats, pigs, cats, and the verbs.
  'pups', 'puppy', 'whelp*', 'calved', 'calving', 'kitten*', 'litters', 'farrow*', 'kidded',
  'welpe*', 'fohlen', 'wurf', 'würfe', 'lamm', 'lämmer', 'ferkel', 'kitz*', 'kätzchen', 'gekalbt', 'abgekalbt', 'gefohlt', 'geworfen',
  'cachorro*', 'potro*', 'potranca*', 'camada*', 'cordero*', 'lechón', 'lechones', 'cabrito*', 'gatito*', 'parió', 'parto',
  'chiot*', 'poulain*', 'pouliche*', 'portée*', 'agneau*', 'porcelet*', 'chevreau*', 'chaton*', 'vêlé', 'vêlage', 'mis bas', 'mise bas',
  '子犬', '仔犬', '仔馬', '子馬', '子羊', '仔羊', '子豚', '仔豚', '子猫', '仔猫', '子ヤギ', '仔牛', '分娩', '出産', '産んだ'];
// prettier-ignore
const CROSS = ['cross', 'crossed', 'crossing', 'kreuz*', 'cruce', 'cruza*', 'cruzar', 'crois*', '交配', '掛け合わせ', 'かけ合わせ'];
// prettier-ignore
const NEW = ['new', 'log', 'add', 'record', 'register', 'make', 'neu*', 'anlegen', 'erfass*', 'nuev*', 'registrar', 'crear', 'nouve*', 'enregistrer', 'créer', '新しい', '新規', '登録', '記録'];
// prettier-ignore
const DUE = ['due', 'owe', 'owed', 'overdue', 'deadline*', 'fällig*', 'frist*', 'vence*', 'vencimiento*', 'pendiente*', 'échéance*', 'dû', 'dus', 'à payer', '期限', '締め切り', '支払'];
// prettier-ignore
const EXPLAIN = ['explain', 'what is', "what's a", 'what does', 'meaning', 'mean', 'define', 'erklär*', 'was ist', 'was bedeutet', 'explica*', 'qué es', 'que es', 'qué significa', 'explique*', "qu'est-ce", "c'est quoi", 'veut dire', 'とは', '説明', '意味'];
// prettier-ignore
const SEARCH = ['find', 'search', 'show', 'list', 'look', 'such*', 'finde*', 'zeig*', 'busca*', 'encuentra*', 'muestra*', 'cherche*', 'trouve*', 'montre*', '探', '検索', '見せ', '一覧'];
const BACKUP = ['backup', 'back up', 'sicherung*', 'copia', 'respaldo', 'sauvegarde*', 'バックアップ'];
// prettier-ignore
const AGREEMENTS = ['licen*', 'agreement*', 'lizenz*', 'vereinbarung*', 'licencia*', 'acuerdo*', 'accord*', 'ライセンス', '契約'];
// prettier-ignore
const IMPORT = ['import*', 'spreadsheet', 'collection', 'csv', 'excel', 'tabelle', 'sammlung', 'importar', 'hoja', 'colección', 'tableur', 'インポート', '一括', '表計算'];

// prettier-ignore
const ANIMAL_WORDS = ['animal*', 'tier', 'tiere', 'cow', 'cows', 'calf', 'calves', 'bull', 'heifer', 'steer', 'horse', 'mare', 'stallion', 'dog', 'goat', 'sheep', 'ewe', 'ram', 'pig', 'sow', 'boar', 'cattle', 'kuh', 'kühe', 'stier', 'bulle', 'pferd', 'stute', 'hund', 'ziege', 'schaf', 'schwein', 'rind*', 'vaca*', 'toro', 'novilla', 'caballo', 'yegua', 'perro', 'cabra', 'oveja', 'cerdo', 'vache*', 'taureau', 'génisse', 'cheval', 'jument', 'chien', 'chèvre', 'brebis', 'mouton', 'cochon', 'truie', '動物', '牛', '馬', '犬', '豚', '羊', '山羊', 'puppy', 'pup', 'pups', 'cat', 'cats', 'welpe*', 'katze', 'perra', 'gato', 'chienne', '猫'];
// prettier-ignore
const STRAIN_WORDS = ['microbe*', 'bacteri*', 'yeast', 'cell line', 'mikrob*', 'bakteri*', 'hefe', 'zelllinie', 'levadura', 'línea celular', 'levure', 'bactérie*', 'lignée cellulaire', '微生物', '菌株', '酵母', '細胞株'];
// prettier-ignore
const KIND_NOUNS = ['plant', 'plants', 'pflanze', 'planta', 'plante', 'cultivar', 'strain', 'animal', 'tier', 'cow', 'bull', 'calf', 'horse', 'dog', 'kuh', 'stier', 'vaca', 'toro', 'vache', 'taureau', 'microbe', 'yeast', 'culture', '植物', '動物', '牛'];
// prettier-ignore
const NAME_MARKERS = ['called', 'named', 'genannt', 'namens', 'llamado', 'llamada', 'appelé', 'appelée', 'nommé', 'nommée'];
const FROM_MARKERS = ['from', 'von', 'de', 'del', 'depuis', 'sur'];
// The words that can follow the noun in a request and are not a name: a verb at the end
// ("neue Pflanze erfassen"), "new" after the noun ("planta nueva"). Whole words only, and only
// as typed in lower case: "new plant Neuland", "nueva planta Nueva" and "new plant One" keep
// their names.
// prettier-ignore
const AFTER_NOUN = ['erfassen', 'anlegen', 'registrieren', 'eintragen', 'speichern', 'nueva', 'nuevo', 'registrar', 'crear', 'nouvelle', 'nouveau', 'enregistrer', 'créer', 'please', 'bitte'];

// prettier-ignore
const TOPIC_WORDS: Record<Topic, string[]> = {
  royaltyReport: ['royalt*', 'lizenzgebühr*', 'regalía*', 'regalia*', 'redevance*', 'ロイヤリティ'],
  proofCode: [
    'proof code',
    'fingerprint*',
    'hash',
    'prüfcode',
    'código de prueba',
    'code de preuve',
    '証明コード',
    'フィンガープリント',
  ],
  priorPossession: [
    'possession',
    'prior',
    'held',
    'früheres halten',
    'halten',
    'tenencia',
    'détention',
    '先行保有',
    '保有',
  ],
  license: ['licen*', 'lizenz*', 'licencia*', 'ライセンス'],
  dating: ['dating', 'date stamp', 'dated', 'datier*', 'fechado', 'fecha*', 'datation', 'daté*', '日付'],
  proof: ['proof', 'prove', 'nachweis', 'beweis*', 'prueba', 'preuve', 'prouver', '証明'],
};
/** Specific words first: "proof code" is not "proof". */
const TOPIC_ORDER: readonly Topic[] = ['royaltyReport', 'proofCode', 'priorPossession', 'license', 'dating', 'proof'];

/** What each action is called, for the closest matches on a miss. */
const ACTION_WORDS: Record<AskAction, string[]> = {
  record: [...NEW, 'plant', 'animal', 'pflanze', 'planta', 'plante', '植物', '動物'],
  clones: CLONES,
  offspring: OFFSPRING,
  cross: CROSS,
  due: [...DUE, 'royalty', 'report', 'payment'],
  explain: EXPLAIN,
  search: [...SEARCH, 'my records', 'meine', 'mis registros', 'mes enregistrements'],
  backup: BACKUP,
  agreements: AGREEMENTS,
  import: IMPORT,
};

// ---- reading ----

export const CJK = /[぀-ヿ㐀-鿿ｦ-ﾟ]/;

/** NFKC (full-width digits and letters become plain), lower case, curly quotes plain, capped. */
export const normalize = (s: string): string =>
  s.slice(0, ASK_MAX_CHARS).normalize('NFKC').replace(/[’‘]/g, "'").toLowerCase();

const tokensOf = (t: string): string[] => t.split(/[^\p{L}\p{N}#'-]+/u).filter(Boolean);

/** Whether a word list matches: whole words, prefixes (*), or substrings (spaces, Japanese). */
const matches = (t: string, toks: readonly string[], words: readonly string[]): boolean =>
  words.some((w) =>
    w.includes(' ') || CJK.test(w)
      ? t.includes(w)
      : w.endsWith('*')
        ? toks.some((x) => x.startsWith(w.slice(0, -1)))
        : toks.includes(w),
  );

/** The person's records named in the text, longest names first, each name found once, in text order. */
export const recordsNamed = (t: string, records: readonly StrainRecord[]): { found: StrainRecord[]; rest: string } => {
  let rest = t;
  const hits: { r: StrainRecord; at: number }[] = [];
  const named = records
    .map((r) => ({ r, n: normalize(r.strainName ?? '').trim() }))
    .filter((x) => x.n.length >= 2)
    .sort((a, b) => b.n.length - a.n.length);
  for (const { r, n } of named) {
    const at = rest.indexOf(n);
    if (at === -1) continue;
    // A whole name: not the middle of a longer word.
    const before = rest[at - 1];
    const after = rest[at + n.length];
    if (
      (before && /[\p{L}\p{N}]/u.test(before) && !CJK.test(before)) ||
      (after && /[\p{L}\p{N}]/u.test(after) && !CJK.test(after))
    )
      continue;
    hits.push({ r, at });
    rest = `${rest.slice(0, at)}${' '.repeat(n.length)}${rest.slice(at + n.length)}`;
  }
  return { found: hits.sort((a, b) => a.at - b.at).map((h) => h.r), rest };
};

/** The first count in the text: 1 to 4 digits, not part of a name like "#12". */
export const countIn = (t: string): number | undefined => {
  // Japanese puts the count right after a word (クローンを12本): only Latin letters and digits count as
  // part of a name.
  const m = /(?<![#A-Za-z0-9.])(\d{1,4})(?![0-9.,])/.exec(t);
  if (!m) return undefined;
  const n = Number(m[1]);
  return n >= 1 ? Math.min(n, MAX_BATCH) : undefined;
};

/** Every count in the text that countIn could read: not part of a name like "#12" or "12345". */
export const countsIn = (t: string): number[] =>
  [...t.matchAll(/(?<![#A-Za-z0-9.])(\d{1,4})(?![0-9.,])/g)]
    .map((m) => Number(m[1]))
    .filter((n) => n >= 1)
    .map((n) => Math.min(n, MAX_BATCH));

/** A name typed after "called" (or 「…」, or …という), else after the kind's noun ("new plant X"). */
export const nameIn = (original: string): string | undefined => {
  const o = original.slice(0, ASK_MAX_CHARS).normalize('NFKC').trim();
  const quoted = /[「"“]([^」"”]{1,120})[」"”]/.exec(o);
  if (quoted) return quoted[1].trim();
  const ja = /^(.{1,120}?)という/.exec(o);
  if (ja) return ja[1].trim();
  const words = o.split(/\s+/);
  const lower = words.map((w) => normalize(w).replace(/[^\p{L}\p{N}#'-]/gu, ''));
  const marker = lower.findIndex((w) => NAME_MARKERS.includes(w));
  const at = marker !== -1 ? marker : lower.findIndex((w) => KIND_NOUNS.includes(w));
  if (at === -1) return undefined;
  const name = words
    .slice(at + 1)
    .join(' ')
    .replace(/^[:,\s]+|[.,!?\s]+$/g, '');
  // "neue Pflanze erfassen", "planta nueva": one known word after the noun, typed in lower case,
  // is the verb or "new", not a name (AFTER_NOUN).
  const typedWords = name.normalize('NFKC').split(/\s+/).filter(Boolean);
  if (typedWords.length === 1 && AFTER_NOUN.includes(typedWords[0].replace(/[.,!?]+$/, ''))) return undefined;
  return name ? name.slice(0, 200) : undefined;
};

const kindOf = (t: string, toks: readonly string[], named: readonly StrainRecord[]): DraftKind => {
  if (matches(t, toks, STRAIN_WORDS) || named.some(isStrain)) return 'strain';
  if (matches(t, toks, ANIMAL_WORDS) || named.some(isAnimal)) return 'animal';
  return 'plant';
};

/** Text typed after "from" with no record of that name: said back so the screen asks for it. */
const afterFrom = (rest: string): string | undefined => {
  const words = rest.trim().split(/\s+/);
  const i = words.findIndex((w) => FROM_MARKERS.includes(w));
  const tail = i === -1 ? '' : words.slice(i + 1).join(' ');
  const ja = /^(.{1,80}?)から/.exec(rest.trim());
  const name = (tail || ja?.[1] || '').replace(/^\d+\s*/, '').trim();
  return name && !/^\d+$/.test(name) ? name : undefined;
};

/** Trigrams, for the closest actions on a miss. */
const grams = (s: string): Set<string> => {
  const p = `  ${s} `;
  const out = new Set<string>();
  for (let i = 0; i + 3 <= p.length; i++) out.add(p.slice(i, i + 3));
  return out;
};
const similarity = (a: Set<string>, b: Set<string>): number => {
  let common = 0;
  for (const g of a) if (b.has(g)) common++;
  return common / Math.max(1, Math.min(a.size, b.size));
};

/** The three things Ask can do closest to what was typed, best first. */
export const closestActions = (t: string): AskAction[] => {
  const mine = grams(t);
  const scored = ASK_ACTIONS.map((a, i) => ({
    a,
    i,
    s: Math.max(0, ...ACTION_WORDS[a].map((w) => similarity(mine, grams(w.replace(/\*$/, ''))))),
  }));
  scored.sort((x, y) => y.s - x.s || x.i - y.i);
  return scored.slice(0, 3).map((x) => x.a);
};

const draft = (
  kind: DraftKind,
  preset: DraftPreset,
  extra: { name?: string; count?: number; parents?: readonly StrainRecord[] } = {},
): AskDraft => ({
  v: 1,
  source: 'ask',
  kind,
  preset,
  ...(extra.name ? { name: extra.name } : {}),
  ...(extra.count ? { count: extra.count } : {}),
  ...(extra.parents?.length ? { parents: extra.parents.slice(0, 2).map((r) => r.id) } : {}),
});

/** Read what was typed. Pure: the same text and records give the same answer. */
export const interpret = (text: string, ctx: AskContext): AskResult => {
  const t = normalize(text).trim();
  const toks = tokensOf(t);
  if (!t) return { type: 'miss', closest: closestActions('') };
  const offered = (k: DraftKind) => ctx.kinds.includes(k);

  if (matches(t, toks, DUE)) return { type: 'due' };
  if (matches(t, toks, EXPLAIN)) {
    const topic = TOPIC_ORDER.find((k) => matches(t, toks, TOPIC_WORDS[k]));
    return topic ? { type: 'explain', topic } : { type: 'explain' };
  }
  // "find my Gelato crosses from 2025": a search when it starts with one.
  if (toks.length && matches(toks[0], [toks[0]], SEARCH)) {
    const query = toks
      .slice(1)
      .filter((w) => !['my', 'meine', 'mis', 'mes', 'all', 'alle', 'todos', 'tous', 'records', 'record'].includes(w))
      .join(' ');
    return { type: 'search', query };
  }
  if (matches(t, toks, BACKUP)) return { type: 'go', action: 'backup' };

  const { found, rest } = recordsNamed(t, ctx.records);
  const count = countIn(rest);

  if (matches(t, toks, OFFSPRING) && offered('animal')) {
    const parents = found.filter(isAnimal);
    const unmatched = parents.length ? [] : [afterFrom(rest)].filter((x): x is string => !!x);
    return { type: 'draft', draft: draft('animal', 'offspring', { count: count ?? 1, parents }), unmatched };
  }
  if (matches(t, toks, CLONES)) {
    const parent = found.filter((r) => !isAnimal(r) && !isStrain(r)).slice(0, 1);
    const unmatched = parent.length ? [] : [afterFrom(rest)].filter((x): x is string => !!x);
    return { type: 'draft', draft: draft('plant', 'clones', { count: count ?? 1, parents: parent }), unmatched };
  }
  if (matches(t, toks, CROSS)) {
    const kind = kindOf(t, toks, found);
    const k = offered(kind) ? kind : 'plant';
    const parents = found.filter((r) => (k === 'animal' ? isAnimal(r) : !isAnimal(r)));
    // Each side of "A x B" that names no record of theirs, said back so the screen asks for it.
    const sides = rest
      .split(/\s+(?:x|×|and|und|y|et)\s+|×|と/)
      .map((s) =>
        s
          .split(/\s+/)
          .filter((w) => w && !matches(w, [w], CROSS))
          .join(' ')
          .trim(),
      )
      .filter((s) => s && !/^\d+$/.test(s));
    const unmatched = parents.length >= 2 ? [] : sides.slice(0, 2 - parents.length);
    return { type: 'draft', draft: draft(k, 'cross', { parents }), unmatched };
  }
  if (matches(t, toks, AGREEMENTS)) return { type: 'go', action: 'agreements' };
  if (matches(t, toks, IMPORT)) return { type: 'go', action: 'import' };
  if (matches(t, toks, NEW) || matches(t, toks, KIND_NOUNS) || matches(t, toks, ANIMAL_WORDS)) {
    const kind = kindOf(t, toks, []);
    const k = offered(kind) ? kind : 'plant';
    return { type: 'draft', draft: draft(k, 'record', { name: nameIn(text) }), unmatched: [] };
  }
  return { type: 'miss', closest: closestActions(t) };
};

/** What a chip does: the same answers, with nothing typed. */
export const chipResult = (a: AskAction, ctx: AskContext): AskResult => {
  switch (a) {
    case 'record':
      return { type: 'draft', draft: draft('plant', 'record'), unmatched: [] };
    case 'clones':
      return { type: 'draft', draft: draft('plant', 'clones', { count: 1 }), unmatched: [] };
    case 'offspring':
      return ctx.kinds.includes('animal')
        ? { type: 'draft', draft: draft('animal', 'offspring', { count: 1 }), unmatched: [] }
        : { type: 'miss', closest: ['record', 'clones', 'cross'] };
    case 'cross':
      return { type: 'draft', draft: draft('plant', 'cross'), unmatched: [] };
    case 'due':
      return { type: 'due' };
    case 'explain':
      return { type: 'explain' };
    case 'search':
      return { type: 'search', query: '' };
    default:
      return { type: 'go', action: a };
  }
};

export const shortcutsEngine: AskEngine = {
  id: 'shortcuts',
  interpret: (text, ctx) => Promise.resolve(interpret(text, ctx)),
};

/** Every topic has its words (a check for tests). */
export const topicsCovered = (): boolean => TOPICS.every((k) => TOPIC_WORDS[k].length > 0);
