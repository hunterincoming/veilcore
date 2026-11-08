// "Do it for me": the planner's reading of what was typed, before any job is chosen (plan.ts).
//
// 1. Every record name in this browser is masked, the person's own and received ones alike, so a
//    name someone else chose ("OG then license Blue Dream to Mal") can never split the text or
//    add a word. A masked name is one token; only plan.ts decides whether it may bind a value
//    (own records only).
// 2. The rest is cut into tokens: words, numbers, and the joining marks. Japanese has no spaces,
//    so a run of Japanese is cut by the longest known word at each point; anything not known is
//    kept as an unknown token, so it is a leftover word and the plan is refused.
// 3. The tokens are split into clauses on joining words in the five languages, Japanese
//    て-form (取って) and 「、」 included.
//
// Pure and deterministic: the same text and records give the same tokens. Nothing is sent or
// stored. Matching is by fixed lists and plain scanning: nothing here takes longer than the text.
// SPDX-License-Identifier: Apache-2.0

import type { StrainRecord } from '../veilcore/records';
import { ASK_MAX_CHARS } from './engine';
import { CJK } from './shortcuts';

/** What a word can be, for the readers in plan.ts. A word may be several things. */
export type Cat =
  | 'filler'
  | 'today'
  | 'new'
  | 'cloneNoun'
  | 'cloneVerb'
  | 'from'
  | 'by'
  | 'outOf'
  | 'pairX'
  | 'ai'
  | 'bull'
  | 'male'
  | 'female'
  | 'idTag'
  | 'idChip'
  | 'later'
  | 'offNoun'
  | 'offVerb'
  | 'counter'
  | 'dueWord'
  | 'dueVerb'
  | 'importVerb'
  | 'importNoun'
  | 'animalNoun'
  | 'readyWord'
  | 'licenseWord'
  | 'to'
  | 'pronoun'
  | 'and'
  | 'negation'
  | 'money'
  | 'notJob'
  | 'stamp'
  | 'every';

// prettier-ignore
const WORDS: Record<Cat, readonly string[]> = {
  filler: ['the', 'a', 'an', 'my', 'our', 'please', 'pls', 'me', 'just', 'some', 'i', 'we', 'have', 've', "i've", 'existing', 'in',
    'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem', 'mein', 'meine', 'meinen', 'meiner', 'meines', 'bitte', 'mir', 'ich', 'wir', 'habe', 'vorhandene', 'bestehende',
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'mi', 'mis', 'por', 'favor', 'yo', 'he', 'existentes',
    'le', 'les', "l'", 'une', 'mon', 'ma', 'mes', "s'il", 'vous', 'plaît', 'plait', 'svp', 'je', "j'", 'nous', 'ai', 'existants', 'existantes',
    'を', 'の', 'は', 'が', 'も', 'ください', 'お願いします', 'ね', 'よ', 'て', 'た', 'です', 'ます', '私', '自分'],
  today: ['today', 'heute', 'hoy', "aujourd'hui", '今日', '本日'],
  new: ['new', 'neue', 'neuen', 'nuevos', 'nuevas', 'nouveaux', 'nouvelles', '新しい'],
  cloneNoun: ['clone', 'clones', 'cutting', 'cuttings', 'cuts', 'klon', 'klone', 'klonen', 'steckling', 'stecklinge', 'clon', 'esqueje', 'esquejes', 'bouture', 'boutures', 'クローン', '挿し木', '挿し穂'],
  cloneVerb: ['cut', 'take', 'took', 'taken', 'make', 'made', 'log', 'record', 'add', 'took', 'pulled', 'schneide', 'schneiden', 'geschnitten', 'nimm', 'nehmen', 'genommen', 'mache', 'mach', 'erfasse',
    'corta', 'cortar', 'corté', 'cortado', 'toma', 'tomar', 'tomé', 'saca', 'sacar', 'registra', 'coupe', 'couper', 'coupé', 'prends', 'prendre', 'pris', 'fais', 'faire', 'enregistre',
    '取って', '取る', '取った', '切って', '切る', '切った', '作って', '作る', '記録して', '記録'],
  from: ['from', 'off', 'of', 'von', 'vom', 'aus', 'de', 'del', 'desde', 'du', 'sur', 'から'],
  by: ['by', 'sired', 'per', 'par', 'mit', 'con'],
  outOf: ['out of', 'dam', 'mother', 'mutter', 'madre', 'mère', '母'],
  pairX: ['x', '×'],
  ai: ['ai', 'a.i.', 'ki', 'ia', 'i.a.', '人工授精'],
  bull: ['bull', 'sire', 'stier', 'bulle', 'bullen', 'vater', 'toro', 'semental', 'padre', 'taureau', 'père', '種牛', '父'],
  male: ['male', 'males', 'boy', 'boys', 'buck', 'bucks', 'ram', 'rams', 'colt', 'colts', 'rüde', 'rüden', 'männlich', 'männliche', 'macho', 'machos', 'mâle', 'mâles', 'オス', '雄', '牡'],
  female: ['female', 'females', 'girl', 'girls', 'heifer', 'heifers', 'doe', 'does', 'ewe', 'ewes', 'filly', 'fillies', 'hündin', 'hündinnen', 'weiblich', 'weibliche', 'färse', 'hembra', 'hembras', 'novilla', 'femelle', 'femelles', 'génisse', 'メス', '雌', '牝'],
  idTag: ['tag', 'tags', 'ear tag', 'ohrmarke', 'etikett', 'crotal', 'etiqueta', 'boucle', 'étiquette', 'タグ', '耳標'],
  idChip: ['chip', 'chips', 'microchip', 'microchips', 'mikrochip', 'transponder', 'puce', 'puces', 'マイクロチップ', 'チップ'],
  later: ['to follow', 'later', 'follow', 'coming', 'folgen', 'später', 'después', 'más tarde', 'plus tard', 'suivre', '後で', 'あとで'],
  offNoun: ['pup', 'pups', 'puppy', 'puppies', 'calf', 'calves', 'foal', 'foals', 'lamb', 'lambs', 'kid', 'kids', 'piglet', 'piglets', 'kitten', 'kittens', 'young', 'offspring', 'litter',
    'welpe', 'welpen', 'kalb', 'kälber', 'fohlen', 'lamm', 'lämmer', 'ferkel', 'kitz', 'kitze', 'jungtiere', 'nachwuchs', 'wurf',
    'cachorro', 'cachorros', 'ternero', 'terneros', 'potro', 'potros', 'cordero', 'corderos', 'lechón', 'lechones', 'cría', 'crías', 'camada',
    'chiot', 'chiots', 'veau', 'veaux', 'poulain', 'poulains', 'agneau', 'agneaux', 'porcelet', 'porcelets', 'chaton', 'chatons', 'portée', 'petits',
    '子犬', '仔犬', '子牛', '仔牛', '仔馬', '子馬', '子羊', '仔羊', '子豚', '仔豚', '子猫', '仔猫', '子'],
  offVerb: ['whelped', 'calved', 'foaled', 'lambed', 'kidded', 'farrowed', 'born', 'had', 'has', 'gave birth', 'delivered',
    'gekalbt', 'abgekalbt', 'geworfen', 'gefohlt', 'geboren', 'hatte', 'hat', 'bekam',
    'parió', 'nacieron', 'nacidos', 'tuvo',
    'vêlé', 'mis bas', 'mise bas', 'nés', 'né', 'eu', 'a eu',
    '産んだ', '生まれた', '出産', '分娩'],
  counter: ['本', '株', '個', '頭', '匹', 'つ', '本の'],
  dueWord: ['due', 'owe', 'owed', 'overdue', 'report', 'reports', 'royalty', 'royalties', 'fällig', 'bericht', 'berichte', 'abrechnung', 'abrechnungen', 'lizenzgebühren',
    'informe', 'informes', 'regalías', 'vence', 'pendiente', 'pendientes', 'rapport', 'rapports', 'redevances', 'déclaration', 'déclarations', 'échéance', 'dû', 'dus',
    '報告', '報告書', '期限', 'ロイヤリティ'],
  dueVerb: ["what's", 'what', 'whats', 'is', 'are', 'send', 'file', 'do', 'draft', 'show', 'all', 'was', 'ist', 'sind', 'sende', 'schicke', 'erstelle', 'alle',
    'qué', 'que', 'hay', 'envía', 'enviar', 'prepara', 'todos', 'quels', 'quoi', 'envoie', 'envoyer', 'prépare', 'tous', 'est',
    '送って', '送る', '作って', '出して', '何', 'ある', '全部'],
  importVerb: ['add', 'bring', 'import', 'load', 'upload', 'füge', 'hinzu', 'importiere', 'importieren', 'lade', 'übernimm', 'añade', 'agrega', 'importa', 'importar', 'sube', 'carga',
    'ajoute', 'importe', 'importer', 'charge', 'インポート', '取り込んで', '取り込む', '追加して', '追加'],
  importNoun: ['mothers', 'moms', 'plants', 'genetics', 'collection', 'records', 'strains', 'cultivars', 'library', 'stock', 'spreadsheet', 'file', 'csv',
    'mutterpflanzen', 'pflanzen', 'genetik', 'sammlung', 'tabelle', 'datei', 'madres', 'plantas', 'genética', 'colección', 'hoja', 'archivo',
    'mères', 'plantes', 'génétique', 'fichier', 'tableur', '母株', '株', '遺伝資源', 'コレクション', 'ファイル', '植物'],
  animalNoun: ['herd', 'animals', 'cows', 'cattle', 'dogs', 'horses', 'herde', 'tiere', 'kühe', 'rebaño', 'animales', 'vacas', 'troupeau', 'animaux', 'vaches', '群れ', '動物', '牛'],
  readyWord: ['ready', 'prepare', 'prepara', 'prépare', 'get', 'set', 'bereit', 'fertig', 'lizenzbereit', 'vorbereiten', 'bereite', 'vor', 'lista', 'listo', 'preparar', 'deja', 'prête', 'prêt', 'préparer', 'rends',
    '準備', 'できるように', '準備して'],
  licenseWord: ['lizenzbereit', 'license', 'licence', 'licensing', 'licensed', 'lizenz', 'lizenzieren', 'lizenzvergabe', 'licencia', 'licenciar', 'licencier', 'ライセンス'],
  to: ['to', 'for', 'zur', 'zum', 'für', 'para', 'pour', 'à', 'en', 'に', 'で', 'できる', 'する'],
  pronoun: ['it', 'them', 'her', 'him', 'es', 'sie', 'ihn', 'lo', 'los', 'la', 'las', 'le', 'les', 'それ', 'それら'],
  and: ['and', 'und', 'y', 'et', 'と'],
  negation: ['not', "don't", 'dont', 'do not', "didn't", "isn't", "aren't", 'never', 'without', 'nicht', 'kein', 'keine', 'keinen', 'nie', 'ohne', 'no', 'nunca', 'sin', 'ne', "n'", 'pas', 'jamais', 'sans'],
  money: ['$', '€', '£', '¥', 'usd', 'eur', 'gbp', 'jpy', 'pay', 'paid', 'payment', 'invoice', 'zahle', 'zahlen', 'bezahlt', 'pagar', 'pagué', 'pago', 'payer', 'payé', 'paiement', '支払', '支払い', '払って', '円', 'ドル'],
  notJob: ['prove', 'proof', 'transfer', 'hand on', 'revoke', 'delete', 'remove', 'correct', 'beweise', 'übertrage', 'widerrufe', 'lösche', 'prueba', 'transfiere', 'revoca', 'borra', 'elimina',
    'prouve', 'transfère', 'révoque', 'supprime', 'efface', '証明', '譲渡', '取り消し', '削除'],
  stamp: ['stamp', 'stamps', 'anchor', 'stempel', 'sello', 'sellar', 'tampon', 'horodate', 'スタンプ'],
  every: ['every', 'all of', 'jeden', 'jede', 'cada', 'chaque', '全ての', 'すべての'],
};

/** Two words read as one ("out of", "ear tag"). */
const PAIRS = new Set(
  Object.values(WORDS)
    .flat()
    .filter((w) => / /.test(w) && !CJK.test(w)),
);

const CATS = new Map<string, Set<Cat>>();
for (const [cat, list] of Object.entries(WORDS) as [Cat, readonly string[]][])
  for (const w of list) {
    const s = CATS.get(w) ?? new Set<Cat>();
    s.add(cat);
    CATS.set(w, s);
  }

/** Japanese words, longest first, for cutting a run with no spaces. */
const JA = [...CATS.keys()].filter((w) => CJK.test(w)).sort((a, b) => b.length - a.length);

/** て-form verbs: a clause ends after one when more follows (取って、… or 取ってライセンス). */
const TE = new Set([
  '取って',
  '切って',
  '作って',
  '記録して',
  '追加して',
  '取り込んで',
  '準備して',
  '送って',
  '出して',
  'して',
]);

/** Japanese negation, read on the text itself (masked names aside): しない, ないで, ません. */
const JA_NEGATION = /しない|ないで|ません|ない[。、]?$|ずに/;

export type Token = {
  /** The word as normalized (NFKC, lower case), or a joining mark. */
  readonly w: string;
  /** Where it is in the normalized text. */
  readonly at: number;
  readonly end: number;
  readonly cats: ReadonlySet<Cat>;
  /** A masked record name: which record. */
  readonly record?: StrainRecord;
  /** A whole number. */
  readonly n?: number;
  /** A joining mark or word: ",", "、", "and then"… */
  readonly join?: boolean;
  /** Not a known word. */
  readonly unknown?: boolean;
};

/** NFKC, lower case, curly quotes plain, capped: as Shortcuts reads text (shortcuts.ts normalize). */
export const normalizeText = (s: string): string =>
  s.slice(0, ASK_MAX_CHARS).normalize('NFKC').replace(/[’‘]/g, "'").toLowerCase();

/**
 * Every record name in the text, whole names only, longest first, each found once: masked as one
 * token. All records in this browser, received ones too: the masking is what stops a received
 * name's words being read.
 */
const maskNames = (t: string, records: readonly StrainRecord[]): { rest: string; found: Token[] } => {
  let rest = t;
  const found: Token[] = [];
  const named = records
    .map((r) => ({ r, n: normalizeText(r.strainName ?? '').trim() }))
    .filter((x) => x.n.length >= 2)
    .sort((a, b) => b.n.length - a.n.length);
  for (const { r, n } of named) {
    let from = 0;
    for (;;) {
      const at = rest.indexOf(n, from);
      if (at === -1) break;
      const before = rest[at - 1];
      const after = rest[at + n.length];
      const wordy = (c: string | undefined) => !!c && /[\p{L}\p{N}]/u.test(c) && !CJK.test(c);
      if (wordy(before) || wordy(after)) {
        from = at + 1;
        continue;
      }
      found.push({ w: '\u0000record', at, end: at + n.length, cats: new Set(), record: r });
      rest = `${rest.slice(0, at)}${'\u0001'.repeat(n.length)}${rest.slice(at + n.length)}`;
      from = at + n.length;
    }
  }
  return { rest, found };
};

const JOIN_MARKS = new Set([',', '、', ';', '，', '；', '。']);
const JOIN_WORDS = new Set([
  'then',
  'and then',
  'dann',
  'und dann',
  'luego',
  'y luego',
  'después',
  'puis',
  'et puis',
  'ensuite',
  'そして',
  'それから',
]);

const word = (w: string, at: number): Token => {
  const cats = CATS.get(w) ?? new Set<Cat>();
  const n = /^\d{1,6}$/.test(w) ? Number(w) : undefined;
  const join = JOIN_WORDS.has(w);
  return {
    w,
    at,
    end: at + w.length,
    cats,
    ...(n !== undefined ? { n } : {}),
    ...(join ? { join: true } : {}),
    ...(!cats.size && n === undefined && !join ? { unknown: true } : {}),
  };
};

/** A run of Japanese, cut by the longest known word at each point; the rest kept as unknown. */
const cutJapanese = (run: string, at: number): Token[] => {
  const out: Token[] = [];
  let i = 0;
  let unknownFrom = -1;
  const flush = (to: number) => {
    if (unknownFrom >= 0) out.push(word(run.slice(unknownFrom, to), at + unknownFrom));
    unknownFrom = -1;
  };
  while (i < run.length) {
    const hit = JA.find((w) => run.startsWith(w, i));
    if (hit) {
      flush(i);
      out.push(word(hit, at + i));
      i += hit.length;
    } else {
      if (unknownFrom < 0) unknownFrom = i;
      i += 1;
    }
  }
  flush(i);
  return out;
};

export type Read = {
  /** The normalized text the spans point into. */
  readonly text: string;
  /** The text as typed after NFKC only (case kept), when it lines up with `text`; else `text`. */
  readonly cased: string;
  readonly tokens: readonly Token[];
  /** A negation anywhere: the whole plan is refused. */
  readonly negated: boolean;
};

/** The text as tokens: names masked, words cut, two-word phrases joined. */
export const tokenize = (typed: string, records: readonly StrainRecord[]): Read => {
  const text = normalizeText(typed);
  const nfkc = typed.slice(0, ASK_MAX_CHARS).normalize('NFKC').replace(/[’‘]/g, "'");
  const cased = nfkc.length === text.length ? nfkc : text;
  const { rest, found } = maskNames(text, records);
  const raw: Token[] = [...found];
  // Words: letters, digits and the marks a code or a tag uses; a run of Japanese apart.
  const re = /[\p{L}\p{N}#'.\-/$€£¥×]+|[,、;，；。]/gu;
  for (const m of rest.matchAll(re)) {
    const s = m[0];
    const at = m.index;
    if (JOIN_MARKS.has(s)) {
      raw.push({ w: s, at, end: at + 1, cats: new Set(), join: true });
      continue;
    }
    // Japanese and Latin in one run (12本, Blue Dreamから is masked already): cut where they meet.
    for (const part of s.matchAll(/[぀-ヿ㐀-鿿ｦ-ﾟ]+|[^぀-ヿ㐀-鿿ｦ-ﾟ]+/gu)) {
      const p = part[0];
      const pAt = at + part.index;
      if (CJK.test(p)) raw.push(...cutJapanese(p, pAt));
      else {
        // A full stop or a quote at a word's ends is not part of it ("Dream." "a.i." stays).
        const w = /^(a\.i\.|i\.a\.)$/.test(p) ? p : p.replace(/^['.\-/]+|['.\-/]+$/g, '');
        if (w) raw.push(word(w, pAt + p.indexOf(w)));
      }
    }
  }
  raw.sort((a, b) => a.at - b.at);
  // Two words read as one: "out of", "ear tag", "and then".
  const tokens: Token[] = [];
  for (let i = 0; i < raw.length; i++) {
    const a = raw[i];
    const b = raw[i + 1];
    const two = b && !a.record && !b.record ? `${a.w} ${b.w}` : '';
    if (two && (PAIRS.has(two) || JOIN_WORDS.has(two))) {
      tokens.push({ ...word(two, a.at), end: b.end });
      i += 1;
    } else tokens.push(a);
  }
  const masked = [...text].map((c, i) => (found.some((f) => i >= f.at && i < f.end) ? ' ' : c)).join('');
  const negated = tokens.some((t) => t.cats.has('negation')) || JA_NEGATION.test(masked);
  return { text, cased, tokens, negated };
};

/**
 * The tokens as clauses, split on joining words and marks, and after a て-form verb that has
 * more after it. The joining tokens themselves are dropped. Empty clauses are dropped.
 */
export const splitClauses = (tokens: readonly Token[]): Token[][] => {
  const out: Token[][] = [];
  let cur: Token[] = [];
  const end = () => {
    if (cur.length) out.push(cur);
    cur = [];
  };
  tokens.forEach((t, i) => {
    if (t.join) return end();
    cur.push(t);
    if (TE.has(t.w) && i < tokens.length - 1 && !tokens[i + 1].join) end();
  });
  end();
  return out;
};

/** The most clauses one request may have (design v2, 4). */
export const MAX_CLAUSES = 3;
