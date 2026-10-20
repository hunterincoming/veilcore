// The record app's text, for its components: useT() gives the translator for the language
// the visitor chose (translate.ts), and rich() lays out a sentence with links or bold parts
// in it, so a translation can put them where its own word order needs them.
//
// The English comes with the app's pages. Another language's app text is its own file,
// fetched the first time an app page needs it: a phone reading the landing page in
// Japanese never downloads the app's Japanese. While it is on its way the page suspends
// (React `use`), and because the language picker switches in a transition (index.tsx) the
// page stays as it was until the new text is here.
// SPDX-License-Identifier: Apache-2.0

import React, { use, useMemo } from 'react';
import { MAINNET_SENDS, useI18n } from './index';
import { withSends } from './app/sends';
import type { Lang } from '../config/languages';
import { appEn } from './app/en';
import { forKind, makeTranslator, type AppDict, type Translator } from './translate';
import { isAnimal } from '../veilcore/animal-profile';

export type { Translator };

const loaded: Partial<Record<Lang, AppDict>> = { en: appEn };
const loading = new Map<Lang, Promise<AppDict>>();

const LOADERS: Record<Exclude<Lang, 'en'>, () => Promise<AppDict>> = {
  ja: () => import('./app/ja').then((m) => m.appJa as AppDict),
  es: () => import('./app/es').then((m) => m.appEs as AppDict),
  de: () => import('./app/de').then((m) => m.appDe as AppDict),
  fr: () => import('./app/fr').then((m) => m.appFr as AppDict),
};

/** Fetch a language's app text (once; the same promise every time, as `use` needs). */
export const loadAppStrings = (lang: Lang): Promise<AppDict> => {
  const have = loaded[lang];
  if (have) return Promise.resolve(have);
  let p = loading.get(lang);
  if (!p) {
    p = LOADERS[lang as Exclude<Lang, 'en'>]().then(
      (d) => (loaded[lang] = d),
      (e: unknown) => {
        loading.delete(lang); // asked for again on the next render
        throw e;
      },
    );
    loading.set(lang, p);
  }
  return p;
};

/** The language's app text, or English if it can't be fetched: the page shows rather than failing. */
const dictOrEnglish = new Map<Lang, Promise<AppDict>>();
const loadDictOrEnglish = (lang: Lang): Promise<AppDict> => {
  let p = dictOrEnglish.get(lang);
  if (!p) {
    p = loadAppStrings(lang).catch(() => appEn as AppDict);
    dictOrEnglish.set(lang, p);
  }
  return p;
};

const translators = new Map<Lang, { dict: AppDict; tr: Translator }>();

/** The language's text for this build (app/sends.ts), made once per fetched dictionary. */
const built = new WeakMap<AppDict, AppDict>();
const buildDict = (raw: AppDict, lang: Lang): AppDict => {
  let d = built.get(raw);
  if (!d) {
    d = withSends(raw, lang, MAINNET_SENDS);
    built.set(raw, d);
  }
  return d;
};

/** The app's text in the visitor's language. */
export const useT = (): Translator => {
  const { lang } = useI18n();
  const raw = loaded[lang] ?? use(loadDictOrEnglish(lang));
  const dict = buildDict(raw, lang);
  return useMemo(() => {
    const have = translators.get(lang);
    if (have && have.dict === dict) return have.tr;
    const made = makeTranslator(lang, dict);
    translators.set(lang, { dict, tr: made });
    return made;
  }, [lang, dict]);
};

/**
 * The app's text for screens about one record: an animal record's screens say "animal"
 * where a plant's say "plant" (translate.ts forKind). Undefined (still loading): a plant's.
 */
export const useRecordT = (record: { readonly profile?: string } | undefined): Translator =>
  forKind(useT(), isAnimal(record) ? 'animal' : 'plant');

/** What a tag in a sentence becomes: `<link>text</link>` → tags.link('text'). */
export type Tags = Record<string, (children: React.ReactNode) => React.ReactNode>;

/**
 * A sentence with parts marked up in it, laid out as React nodes: `<b>Optional.</b> Add it
 * now.` with `{ b: (c) => <b>{c}</b> }`. `{name}` placeholders take text, numbers or nodes
 * from `vars`. Tags can hold placeholders and other tags. Text outside tags is kept exactly,
 * spaces included, so the English reads as it did before it was translated.
 */
export const rich = (text: string, tags: Tags = {}, vars: Record<string, React.ReactNode> = {}): React.ReactNode[] => {
  let n = 0;
  const parse = (s: string): React.ReactNode[] => {
    const out: React.ReactNode[] = [];
    const re = /<(\w+)>|\{(\w+)\}/g;
    let at = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(s))) {
      if (m.index > at) out.push(s.slice(at, m.index));
      if (m[2] !== undefined) {
        const v = vars[m[2]];
        out.push(v === undefined ? m[0] : React.isValidElement(v) ? React.cloneElement(v, { key: `v${n++}` }) : v);
        at = re.lastIndex;
        continue;
      }
      const tag = m[1];
      const close = `</${tag}>`;
      // The matching close tag, counting any of the same tag opened inside.
      let depth = 1;
      let i = re.lastIndex;
      let end = -1;
      while (i < s.length) {
        const nextOpen = s.indexOf(`<${tag}>`, i);
        const nextClose = s.indexOf(close, i);
        if (nextClose === -1) break;
        if (nextOpen !== -1 && nextOpen < nextClose) {
          depth++;
          i = nextOpen + tag.length + 2;
        } else {
          depth--;
          if (depth === 0) {
            end = nextClose;
            break;
          }
          i = nextClose + close.length;
        }
      }
      if (end === -1) {
        // Not closed: the text as it is.
        out.push(m[0]);
        at = re.lastIndex;
        continue;
      }
      const inner = parse(s.slice(re.lastIndex, end));
      const render = tags[tag];
      const node = render ? render(inner.length === 1 ? inner[0] : inner) : inner;
      out.push(React.isValidElement(node) ? React.cloneElement(node, { key: `t${n++}` }) : node);
      at = end + close.length;
      re.lastIndex = at;
    }
    if (at < s.length) out.push(s.slice(at));
    return out;
  };
  return parse(text);
};

/**
 * Said at the top of a page whose text is only in English (the documents, an agreement), in
 * every other language; `section` for a part of a page (an agreement's obligations on the
 * plant page).
 */
export const InEnglishPage: React.FC<{ section?: boolean }> = ({ section = false }) => {
  const tr = useT();
  if (tr.lang === 'en') return null;
  return (
    <p data-in-english="" style={{ fontSize: '0.875rem', opacity: 0.85, margin: '0 0 12px' }}>
      {tr.t(section ? 'app.common.sectionInEnglish' : 'app.common.pageInEnglish')}
    </p>
  );
};

/**
 * Said beside a file the app makes only in English (the evidence bundle, the breeding
 * history, a certificate's declaration), in every other language. Nothing in English.
 */
export const InEnglishNote: React.FC<{ component?: 'span' | 'p' }> = ({ component = 'span' }) => {
  const tr = useT();
  if (tr.lang === 'en') return null;
  const Tag = component;
  return (
    <Tag data-in-english="" style={{ display: 'block', fontSize: '0.8125rem', opacity: 0.8, marginTop: 4 }}>
      {tr.t('app.common.fileInEnglish')}
    </Tag>
  );
};
