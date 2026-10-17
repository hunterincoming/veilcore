// Every privacy sentence says what the sealed registry really reads (sealed records round 2).
//
// Since sealed records, VeilCore's server can read only a record's ID, the public name its
// holder chose, its profile, fingerprint and key binding, correction links, what the registry
// writes itself, when it first saw the record, values the holder chose to publish, recipient
// tags, registered parent links, batch and date-stamp data, and rows saved before sealing
// until they are converted. Everything else the holder types is locked with a key VeilCore
// doesn't have (CONTRACT.md #4). Since round 3 that includes a delivery's sample details,
// locked with the delivery's offer key (CONTRACT.md #27); only sample details written before
// sealing can still be readable, until the registry's purge removes them.
//
// So no English sentence that says VeilCore (its server, registry, site, "we") keeps, stores,
// sees or can read something may name a sealed field (breeder, notes, parents, quantity,
// license or agreement terms, dates), unless the same sentence says it is locked. And no
// sentence claims more than "stored locked, and we don't have the key": VeilCore also serves
// the app's code. The old, false sentences are checked to be caught, so the test can't pass
// by matching nothing.
// Run: npx vitest run src/i18n/sealed-copy.test.ts
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { en } from './en';
import { mainnetStrings } from './en-mainnet';
import { testchainStrings } from './en-testchain';
import { appEn } from './app/en';
import { de, deTestchain } from './de';
import { es, esTestchain } from './es';
import { fr, frTestchain } from './fr';
import { ja, jaMainnet, jaTestchain } from './ja';
import { appDe } from './app/de';
import { appEs } from './app/es';
import { appFr } from './app/fr';
import { appJa } from './app/ja';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Fields that are sealed, as the copy would name them. */
const SEALED: readonly (readonly [string, RegExp])[] = [
  ['breeder', /\bbreeders?\b(?![’']s (record|own))|\bbred by\b/i],
  ['notes', /\bnotes?\b/i],
  ['parents', /\bparents\b|\bparent names\b|\bsire\b|\bdam\b/i],
  ['quantity', /\bquantit(y|ies)\b/i],
  ['license terms', /\b(license|licence|agreement) terms\b|\bterms and counterparties\b/i],
  ['dates', /\bdates\b|\bdate of birth\b/i],
];
/** The sentence says someone keeps, stores, sees or reads something... */
const READ = /\b(can read|reads|readable|can see|sees|keeps?|kept|stores?|stored|holds?|saved|saves)\b/i;
/** ...and that someone is VeilCore. */
const PARTY = /\b(VeilCore|VeilCore[’']s|server|registry|website|site|we|us)\b/i;
/** Unless the sentence says it is locked. */
const LOCKED =
  /\block(ed|s)?\b|without the key|(don|doesn)[’']t have (the|its) key|never sent|never uploaded|(isn|aren)[’']t uploaded/i;

/**
 * Sample details (CONTRACT.md #27): locked since round 3, so no sentence may say VeilCore can
 * read them, unless it is about sample details written before sealing (those can still exist,
 * until the registry's purge removes them) or says they are locked.
 */
const SAMPLE_DETAILS = /\bsample (details|information)\b|\bseal numbers?\b|\bsample IDs?\b|\bcustody fields\b/i;
const BEFORE_SEALING = /\b(written|saved|made) before (sealing|locking)\b/i;

/** Claims that are false since sealing, or more than the design shows. */
const NEVER: readonly RegExp[] = [
  // Sample details are locked since round 3 (CONTRACT.md #27).
  /sample (details|information)[^.]*\b(aren[’']t|are not|not) (locked|sealed) yet\b/i,
  /\(not (locked|sealed) yet\)/i,
  /those sample details/i,
  /kept on VeilCore[’']s server/i,
  /everything you type is (kept|stored|saved)/i,
  /don[’']t type anything you need to keep secret/i,
  /a key only this browser has/i,
  /VeilCore can[’']t read/i,
  /unreadable to us/i,
  /This website keeps what you type/i,
];

const sentences = (s: string): string[] => s.split(/(?<=[.!?])\s+|\n+/).filter(Boolean);

/** The sealed fields a text names as something VeilCore reads or keeps readable. */
const readableSealed = (text: string): string[] =>
  sentences(text).flatMap((sen) =>
    READ.test(sen) && PARTY.test(sen) && !LOCKED.test(sen)
      ? [
          ...SEALED.filter(([, re]) => re.test(sen)).map(([name]) => `${name}: “${sen}”`),
          ...(SAMPLE_DETAILS.test(sen) && !BEFORE_SEALING.test(sen) ? [`sample details: “${sen}”`] : []),
        ]
      : [],
  );

/** The same old sentences in the other languages: "sample details aren't locked yet". */
const NEVER_TRANSLATED: readonly RegExp[] = [
  /Probenangaben[^.]*noch nicht verschlossen/,
  /datos de muestra[^.]*todavía no se bloquean/,
  /informations d[’']échantillon[^.]*pas encore verrouillées/,
  /サンプル情報[^。]*まだ鍵がかかりません/,
];

/** Every string a build can show in German, Spanish, French and Japanese, mainnet overlay included. */
const translated = (): Record<string, string> => {
  const out: Record<string, string> = {};
  const all: [string, Record<string, unknown>][] = [
    ['de', de],
    ['de-test', deTestchain],
    ['es', es],
    ['es-test', esTestchain],
    ['fr', fr],
    ['fr-test', frTestchain],
    ['ja', ja],
    ['ja-test', jaTestchain],
    ...[true, false].flatMap((claimsOnMainnet) =>
      [true, false].map(
        (policyApproved) =>
          [
            `ja-mainnet-${String(claimsOnMainnet)}-${String(policyApproved)}`,
            jaMainnet({ claimsOnMainnet, policyApproved }),
          ] as [string, Record<string, unknown>],
      ),
    ),
    ['app-de', appDe],
    ['app-es', appEs],
    ['app-fr', appFr],
    ['app-ja', appJa],
  ];
  for (const [lang, strings] of all)
    for (const [k, v] of Object.entries(strings)) if (typeof v === 'string') out[`${lang}:${k}`] = v;
  return out;
};

/** Every English string a build can show, with the privacy note's titles joined to their text. */
const english = (): Record<string, string> => {
  const out: Record<string, string> = {};
  const overlays: Record<string, string | undefined>[] = [
    en,
    { ...en, ...testchainStrings },
    ...[true, false].flatMap((claimsOnMainnet) =>
      [true, false].flatMap((policyApproved) =>
        [true, false].map((chainReads) => ({
          ...en,
          ...mainnetStrings({ claimsOnMainnet, policyApproved, chainReads }),
        })),
      ),
    ),
  ];
  overlays.forEach((strings, i) => {
    for (const [k, v] of Object.entries(strings)) {
      if (typeof v !== 'string') continue;
      // "Stored on our server: <list>" is one statement: read the title with the text.
      const title = k.endsWith('.text') ? strings[k.replace(/\.text$/, '.title')] : undefined;
      out[`${String(i)}:${k}`] = title ? `${title}: ${v}` : v;
    }
  });
  for (const [k, v] of Object.entries(appEn as Record<string, string>)) out[`app:${k}`] = v;
  // The holder-key file the app downloads, and the explainer video's words.
  out['holder.ts'] = fs.readFileSync(path.join(SRC, 'veilcore/holder.ts'), 'utf8');
  out['explainer.html'] = fs.readFileSync(path.join(SRC, '..', 'media-src/explainer/explainer.html'), 'utf8');
  return out;
};

describe('the English privacy copy (sealed records round 2)', () => {
  it('never names a sealed field as something VeilCore can read', () => {
    const found = Object.entries(english()).flatMap(([k, v]) => readableSealed(v).map((f) => `${k} ${f}`));
    expect(found).toEqual([]);
  });

  it('never says what sealing made false, or more than "stored locked, and we don’t have the key"', () => {
    const found = Object.entries(english()).flatMap(([k, v]) =>
      NEVER.filter((re) => re.test(v)).map((re) => `${k} ${String(re)}`),
    );
    expect(found).toEqual([]);
  });

  it('never says VeilCore can read sample details, or that they aren’t locked yet, in any language (CONTRACT.md #27)', () => {
    const found = Object.entries(english()).flatMap(([k, v]) =>
      readableSealed(v)
        .filter((f) => f.startsWith('sample details'))
        .map((f) => `${k} ${f}`),
    );
    expect(found).toEqual([]);
    const other = Object.entries(translated()).flatMap(([k, v]) =>
      NEVER_TRANSLATED.filter((re) => re.test(v)).map((re) => `${k} ${String(re)}`),
    );
    expect(other).toEqual([]);
    // The privacy notes say the sample details are locked, in every language.
    const t = translated();
    expect(t['de:m.privacy.stored.text']).toContain('die Probenangaben, die Sie und das Labor schreiben');
    expect(t['es:m.privacy.stored.text']).toContain('los datos de muestra que usted y el laboratorio escriben');
    expect(t['fr:m.privacy.stored.text']).toContain(
      "les informations d'échantillon que vous et le laboratoire écrivez",
    );
    expect(t['ja:m.privacy.stored.text']).toContain('あなたとラボが書くサンプル情報');
    expect(en['m.privacy.stored.text']).toMatch(
      /locked by your browser before they are sent: [^.]*the sample details you and the lab write/,
    );
    // The old sentences are caught, and the true one about details written before sealing is not.
    for (const old of [
      'Sample details you write for a lab aren’t locked yet.',
      "Those sample details aren't locked yet.",
      'the registry can read a delivery’s sample details (not locked yet)',
    ])
      expect(
        NEVER.some((re) => re.test(old)),
        old,
      ).toBe(true);
    expect(readableSealed('Our server can read the sample details you and the lab write.')).toHaveLength(1);
    expect(readableSealed('The registry keeps each seal number as typed.')).toHaveLength(1);
    expect(
      readableSealed('Sample details written before sealing stay readable to us until the registry removes them.'),
    ).toEqual([]);
    expect(readableSealed('The sample details you and a lab write are stored locked too.')).toEqual([]);
    for (const [lang, old] of [
      ['de', 'Probenangaben, die Sie für ein Labor schreiben, sind noch nicht verschlossen.'],
      ['es', 'Los datos de muestra que escribe para un laboratorio todavía no se bloquean.'],
      ['fr', "Les informations d'échantillon que vous écrivez pour un laboratoire ne sont pas encore verrouillées."],
      ['ja', 'ラボ向けに書くサンプル情報には、まだ鍵がかかりません。'],
    ])
      expect(
        NEVER_TRANSLATED.some((re) => re.test(old)),
        lang,
      ).toBe(true);
  });

  it('catches the sentences that were false before this round', () => {
    const OLD = {
      step1:
        "What it is and where it came from. The plant name and breeder you type are kept on VeilCore's server, and anyone with the record's link sees the name.",
      stored:
        'Stored on our server: What you type and what your browser computes from it: cultivar and breeder names, species if you enter one, dates, notes, reference numbers, parents, fingerprints of records, agreement terms and counterparties, material you send to a lab (who it is addressed to, and the quantity).',
      faq: "This website keeps what you type (names, dates, notes, agreement terms) and your lab files' names, so you can come back to them.",
      quantity: 'The registry keeps the quantity you send a lab.',
    };
    expect(readableSealed(OLD.step1).join()).toMatch(/^breeder/);
    expect(readableSealed(OLD.stored).map((f) => f.split(':')[0])).toEqual(
      expect.arrayContaining(['breeder', 'notes', 'parents', 'quantity', 'license terms', 'dates']),
    );
    expect(readableSealed(OLD.faq).map((f) => f.split(':')[0])).toEqual(
      expect.arrayContaining(['notes', 'license terms', 'dates']),
    );
    expect(readableSealed(OLD.quantity)).toHaveLength(1);
    // Saying it is locked is what makes the same list true.
    expect(
      readableSealed('Our server stores your breeder, dates and notes locked, and we don’t have the key.'),
    ).toEqual([]);
    for (const old of [
      "Everything you type is kept on our server, and a record's cultivar name is shown on its public check page. Don't type anything you need to keep secret.",
      'Your records are now locked with a key only this browser has.',
      "The locked file waits on VeilCore's server for you to open; VeilCore can't read it.",
    ])
      expect(
        NEVER.some((re) => re.test(old)),
        old,
      ).toBe(true);
  });

  it('the name field says the name is locked like the rest, and who sees it: whoever gets a check link (round 5)', () => {
    const a = appEn as Record<string, string>;
    // Since round 5 the name is sealed (CONTRACT.md #28): no field says "(public)" any more.
    for (const k of [
      'app.log.nameLabel',
      'app.plant.fix.name',
      'app.animal.nameField',
      'app.animal.v.app.plant.fix.name',
      'app.plant.dated.nameLabel',
    ])
      expect(a[k], k).not.toMatch(/public/i);
    expect(a['app.log.nameHelp']).toMatch(
      /^Locked like the other details\. Your check links carry it after the #, so the people you send a link to see it, and anyone they pass it on to\.$/,
    );
    expect(a['app.plant.dated.nameHelp']).toMatch(/^Locked like the rest\./);
    expect(a['app.log.savedOn']).toMatch(/The name is locked too; your check links carry it after the #/);
    expect(a['app.import.readHere']).toMatch(/stores them locked, the plant name included, and we don’t have the key/);
    expect(a['app.import.check.savedOn']).toMatch(/locked, the plant names included, and we don’t have the key/);
    // No English sentence says the name is public, unlocked or readable by the server.
    const NAME_PUBLIC =
      /\bname[^.]*\b(isn[’']t|is not|aren[’']t|are not|not) locked\b|\bname (is|are) public\b|anyone with (a|the|its) (check )?link sees (it|this name|the name)|our server can read [^.]*\bthe name you give\b/i;
    const found = Object.entries(english())
      .filter(([k]) => !k.endsWith('explainer.html') && !k.endsWith('holder.ts'))
      .flatMap(([k, v]) =>
        sentences(v)
          .filter((sen) => NAME_PUBLIC.test(sen))
          .map((sen) => `${k} “${sen}”`),
      );
    expect(found).toEqual([]);
    for (const old of [
      "The name you give it isn't locked: anyone with the record's link sees it.",
      'The plant name is public: anyone with a record’s check link sees it.',
      'Anyone with a check link sees this name.',
    ])
      expect(NAME_PUBLIC.test(old), old).toBe(true);
    for (const [file, key] of [
      ['components/flow/LogFlow.tsx', 'app.log.nameLabel'],
      ['components/flow/AnimalForm.tsx', 'app.animal.nameField'],
      ['components/CorrectRecord.tsx', 'app.plant.fix.name'],
    ] as const) {
      const src = fs.readFileSync(path.join(SRC, file), 'utf8');
      expect(src, file).toContain(`label={t('${key}')}`);
      expect(src, file).toContain(`helperText={t('app.log.nameHelp')}`);
    }
    expect(a['app.import.cols.intro']).toMatch(
      /The plant name is locked like the rest: the check links in your results file carry it/,
    );
    // The same in every language: no field label calls the name public.
    const t = translated();
    for (const k of ['app.log.nameLabel', 'app.plant.fix.name', 'app.animal.nameField', 'app.plant.dated.nameLabel'])
      for (const lang of ['de', 'es', 'fr', 'ja'])
        expect(t[`app-${lang}:${k}`], `${lang} ${k}`).not.toMatch(/öffentlich|público|public|公開/);
  });

  it('says what a license with a royalty on offspring makes public (round 3, P5), in every build', () => {
    const builds = [
      en,
      ...[true, false].flatMap((claimsOnMainnet) =>
        [true, false].map((policyApproved) => ({
          ...en,
          ...mainnetStrings({ claimsOnMainnet, policyApproved, chainReads: true }),
        })),
      ),
    ];
    for (const b of builds) {
      expect(b['m.privacy.stored.text']).toMatch(
        /royalty on offspring, our server can read which record it covers and when it took effect, and anyone can ask whether that record carries one/,
      );
    }
  });

  it('the lab-report lock sentences hold: the lab takes the lock only from the code or the sealed offer (round 3, P1)', () => {
    const lr = fs.readFileSync(path.join(SRC, 'veilcore/lab-results.ts'), 'utf8');
    expect(lr).not.toMatch(/the registry never had a chance to hand the lab its own/);
    const panel = fs.readFileSync(path.join(SRC, 'components/flow/LabResults.tsx'), 'utf8');
    expect(panel).not.toMatch(/useState\(record\.resultLock \?\? stored\?\.recipient\)/);
    expect(panel).toMatch(/reportLockFor\(record,/);
  });
});

// Round 4 (the fourth attack review): sentences it found false, in every language and build.
describe('round 4: the privacy sentences the fourth review found false', () => {
  const OLD: readonly RegExp[] = [
    /downloads everything our server holds for you/,
    /Download everything VeilCore holds for you/,
    /180 days after they arrive\. Nothing else has a set retention period/,
    /For a delivery: which record it came from, when it was received, and a tag in place of the recipient[’']s name\./,
    /stay readable to us until the registry removes them\. Locked lab reports/,
    /They are never sent anywhere, VeilCore has no copy/,
    /only their fingerprints and the report[’']s file name leave it, and those go locked/,
    /Record keys \(this browser only\)/,
  ];
  const builds = (): Record<string, string>[] => [
    en,
    ...[true, false].flatMap((claimsOnMainnet) =>
      [true, false].flatMap((policyApproved) =>
        [true, false].map((chainReads) => ({
          ...en,
          ...mainnetStrings({ claimsOnMainnet, policyApproved, chainReads }),
        })),
      ),
    ),
  ];

  it('the old sentences are caught, and none is left in English, the app or the READMEs', () => {
    for (const old of [
      'Download everything VeilCore holds for you downloads everything our server holds for you.',
      'Locked lab reports are deleted 180 days after they arrive. Nothing else has a set retention period: it stays.',
      "For a delivery: which record it came from, when it was received, and a tag in place of the recipient's name.",
      'Sample details written before sealing stay readable to us until the registry removes them. Locked lab reports a lab sends you',
      'They are never sent anywhere, VeilCore has no copy, and clearing this browser deletes them.',
      "only their fingerprints and the report's file name leave it, and those go locked.",
    ])
      expect(
        OLD.some((re) => re.test(old)),
        old,
      ).toBe(true);
    const texts: Record<string, string> = {
      ...english(),
      readme: fs.readFileSync(path.join(SRC, '..', '..', 'README.md'), 'utf8'),
      terms: fs.readFileSync(path.join(SRC, '..', '..', 'docs/privacy-and-data-terms.md'), 'utf8'),
    };
    const found = Object.entries(texts).flatMap(([k, v]) =>
      OLD.filter((re) => re.test(v)).map((re) => `${k} ${String(re)}`),
    );
    expect(found).toEqual([]);
  });

  it('"Our server can read" lists the delivery’s account, saves, size bucket and key binding, in every build', () => {
    for (const b of builds()) {
      const s = b['m.privacy.stored.text'] ?? '';
      expect(s).toMatch(/Our server can read: [^.]*its proof code, key binding and profile type/);
      // Round 5: the name is locked, travels after the # in check links, and is read only if shown.
      expect(s).toMatch(/locked by your browser before they are sent: each record[’']s name, breeder/);
      expect(s).toMatch(
        /If you choose, a record[’']s name also travels in a check link you make, after the #, which a browser never sends to any server\./,
      );
      expect(s).toMatch(
        /what you choose to show on its check page \(its name, if you choose to show it, and whether a DNA report is saved/,
      );
      expect(s).not.toMatch(/the name you give it/);
      expect(s).toMatch(
        /a record[’']s name saved before names were locked stays readable to us until your browser saves the record again/,
      );
      expect(s).toMatch(/how many times it was saved, and when it was last saved/);
      expect(s).toMatch(/\(its size bucket\)/);
      expect(s).toMatch(
        /For a delivery: which record it came from, which holder account received it, when it was received/,
      );
      // The tag sentence says what is true of deliveries made before tags.
      expect(s).toMatch(
        /A delivery made before tags has the name as typed, until the registry[’']s purge replaces it\./,
      );
      // Off-site backups made before locking keep a readable copy until the backup key is destroyed.
      expect(s).toMatch(
        /Our off-site backups made before then keep a readable copy of all of these until we destroy the key that opens them\./,
      );
      // Each record's secret keys are among what is locked.
      expect(s).toMatch(/locked by your browser before they are sent: [^.]*each record[’']s own secret keys\./);
    }
  });

  it('retention, what the browser keeps, and the export are said truly', () => {
    expect(en['m.privacy.who.text']).toMatch(
      /Requests to prove a record[’']s key are deleted after 7 days\. Nothing else has a set retention period/,
    );
    expect(en['m.privacy.browser.text']).toMatch(/each record[’']s secret keys, which lock its lab reports/);
    expect(en['m.privacy.browser.text']).toMatch(
      /the lab codes you make or use, which hold a claim code and the key to a delivery[’']s details/,
    );
    const ex = en['m.privacy.export.text'];
    expect(ex).not.toMatch(/everything/i);
    expect(ex).toMatch(
      /It leaves out your deliveries with their sample details, locked lab reports, royalty obligations and requests to prove a record[’']s key\./,
    );
    expect(ex).toMatch(/Prove requests are deleted after 7 days\./);
    expect(ex).toMatch(/Neither file has your keys or your records[’'] secret keys: those are in your backup file\./);
    const a = appEn as Record<string, string>;
    expect(a['app.home.export.label']).not.toMatch(/everything/i);
    expect(a['app.home.export.done']).toMatch(/Deliveries, their sample details and lab reports aren[’']t in it/);
    expect(a['app.plant.keys.holds']).toMatch(/A copy also goes inside the record[’']s locked box on VeilCore/);
    const readme = fs.readFileSync(path.join(SRC, '..', '..', 'README.md'), 'utf8');
    expect(readme).toMatch(
      /the files never leave it\. Their fingerprints and the report[’']s file name go to the registry locked, unless the holder chooses to show the DNA pairing/,
    );
    expect(readme).toMatch(/which holder account received it/);
  });

  it('the same in German, Spanish, French and Japanese (mainnet overlay included)', () => {
    const t = translated();
    const stored: [string, RegExp[]][] = [
      [
        'de',
        [
          /welches Inhaberkonto sie empfangen hat/,
          /wie oft er gespeichert wurde und wann zuletzt/,
          /Größenstufe/,
          /Schlüsselbindung/,
          /Bei einer Lieferung von vor den Kennzeichen/,
          /externen Sicherungen/,
          /der Name jedes Datensatzes, Züchter/,
          /nach dem #, das ein Browser nie an einen Server sendet/,
        ],
      ],
      [
        'es',
        [
          /qué cuenta de titular lo recibió/,
          /cuántas veces se guardó/,
          /franja de tamaño/,
          /vínculo de clave/,
          /En un envío anterior a las etiquetas/,
          /copias de seguridad externas/,
          /el nombre de cada registro, obtentor/,
          /después del #, que un navegador nunca envía a ningún servidor/,
        ],
      ],
      [
        'fr',
        [
          /quel compte de détenteur l'a reçu/,
          /combien de fois il a été enregistré/,
          /tranche de taille/,
          /lien de clé/,
          /Pour un envoi d'avant les étiquettes/,
          /sauvegardes externes/,
          /le nom de chaque enregistrement, obtenteur/,
          /après le #, qu'un navigateur n'envoie jamais à aucun serveur/,
        ],
      ],
      [
        'ja',
        [
          /どの保有者アカウントが受け取ったか/,
          /保存された回数と最後に保存された日時/,
          /サイズ区分/,
          /鍵の結び付け/,
          /タグ導入前の送付/,
          /外部バックアップ/,
          /各記録の名前、育成者/,
          /#の後ろは、ブラウザがどのサーバーにも送りません/,
        ],
      ],
    ];
    for (const [lang, res] of stored) {
      const keys = Object.keys(t).filter((k) => k.startsWith(`${lang}`) && k.endsWith(':m.privacy.stored.text'));
      expect(keys.length, lang).toBeGreaterThan(0);
      for (const k of keys) for (const re of res) expect(t[k], `${k} ${String(re)}`).toMatch(re);
    }
    expect(t['de:m.privacy.who.text']).toMatch(/nach 7 Tagen gelöscht/);
    expect(t['es:m.privacy.who.text']).toMatch(/se borran a los 7 días/);
    expect(t['fr:m.privacy.who.text']).toMatch(/supprimées après 7 jours/);
    expect(t['ja:m.privacy.who.text']).toMatch(/7日後に削除されます/);
    expect(t['de:m.privacy.browser.text']).toMatch(/Labor-Codes/);
    expect(t['es:m.privacy.browser.text']).toMatch(/códigos de laboratorio/);
    expect(t['fr:m.privacy.browser.text']).toMatch(/codes de laboratoire/);
    expect(t['ja:m.privacy.browser.text']).toMatch(/ラボコード/);
    for (const [lang, old] of [
      ['de', /lädt alles herunter, was unser Server für Sie speichert/],
      ['es', /descarga todo lo que nuestro servidor guarda para usted/],
      ['fr', /télécharge tout ce que notre serveur conserve pour vous/],
      ['ja', /保持しているすべてをダウンロード/],
    ] as const) {
      expect(t[`${lang}:m.privacy.export.text`], lang).not.toMatch(old);
      expect(t[`${lang}:m.privacy.export.text`], lang).toContain(t[`app-${lang}:app.home.export.label`]);
    }
  });
});

// Round 5 (CONTRACT.md #28, #30): the name is locked in every language, and a record's
// fingerprint is called its "proof code" everywhere a person reads it. "DNA fingerprint" is
// kept, only for genetic data. Code identifiers (recordFingerprint, data-fingerprint) are not
// words people read and are left alone.
describe('round 5: names are locked, and a record’s fingerprint is its proof code', () => {
  /** "fingerprint" as a word, unless it is "DNA fingerprint". */
  const FINGERPRINT = /(?<!DNA[ -])(?<![\w.$-])fingerprint(s|ed|ing)?(?![\w(-])/i;
  const hits = (text: string): string[] => sentences(text).filter((sen) => FINGERPRINT.test(sen));
  /** The words of an HTML page: no tags, no scripts or styles. */
  const words = (html: string): string =>
    html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ');
  /** The string literals of a source file, minus comments: what it can show a person. */
  const literals = (src: string): string[] =>
    [...src.replace(/^\s*(\/\/|\*|\/\*|\{\/\*).*$/gm, '').matchAll(/(['"`])((?:\\.|(?!\1)[^\\\n])*)\1/g)].map(
      (m) => m[2],
    );

  it('the rule catches the old words and lets "DNA fingerprint" and identifiers through', () => {
    expect(hits('Its fingerprint goes on Midnight.')).toHaveLength(1);
    expect(hits('Fingerprinting on your device…')).toHaveLength(1);
    expect(hits('LIVE FINGERPRINT')).toHaveLength(1);
    expect(hits('A DNA report (a lab’s DNA fingerprint of the plant) ties it.')).toEqual([]);
    expect(hits('r.recordFingerprint and data-fingerprint and fingerprint_hex and ${ev.record.fingerprint}')).toEqual(
      [],
    );
  });

  it('no English a person reads says "fingerprint", except "DNA fingerprint"', () => {
    const found: string[] = [];
    for (const [k, v] of Object.entries(english())) {
      if (k === 'holder.ts') continue; // read below, by its literals
      const text = k === 'explainer.html' ? words(v) : v;
      for (const sen of hits(text)) found.push(`${k}: “${sen}”`);
    }
    // Words the app builds in code, the evidence bundle, the breeding history, bulk import
    // results, and the partner kit's element and command line.
    const files = [
      'veilcore/holder.ts',
      'veilcore/api-store.ts',
      'veilcore/records.ts',
      'veilcore/transfers.ts',
      'veilcore/commitment.ts',
      'veilcore/envelope.ts',
      'veilcore/licenses.ts',
      'veilcore/animal-profile.ts',
      'veilcore/bulk-import.ts',
      'veilcore/breeding-history/html.ts',
      'veilcore/evidence/words.ts',
      'veilcore/evidence/examiner.ts',
      'veilcore/evidence/declaration.ts',
      'veilcore/evidence/bundle.ts',
      'components/chain/key-reason-words.ts',
      'components/wizard/Step3Certificate.tsx',
      'components/HeritableRights.tsx',
      'components/licensing/LicenseDetail.tsx',
    ];
    for (const f of files) {
      const full = path.join(SRC, f);
      if (!fs.existsSync(full)) {
        found.push(`${f}: missing`);
        continue;
      }
      for (const lit of literals(fs.readFileSync(full, 'utf8')))
        if (/\s/.test(lit)) for (const sen of hits(lit)) found.push(`${f}: “${sen}”`);
    }
    const page = path.join(SRC, '..', 'evidence-page', 'verify.template.html');
    for (const sen of hits(words(fs.readFileSync(page, 'utf8')))) found.push(`verify.template.html: “${sen}”`);
    const kit = path.join(SRC, '..', '..', 'partner-kit', 'record-check', 'src');
    for (const f of fs.existsSync(kit)
      ? fs.readdirSync(kit).filter((n) => /\.(ts|mjs|js)$/.test(n) && !/test/.test(n))
      : [])
      for (const lit of literals(fs.readFileSync(path.join(kit, f), 'utf8')))
        if (/\s/.test(lit)) for (const sen of hits(lit)) found.push(`partner-kit/${f}: “${sen}”`);
    expect(found).toEqual([]);
  });

  it('the same in German, Spanish, French and Japanese: "proof code", and a DNA fingerprint only for genetics', () => {
    const OTHER = [
      /(?<!DNA-)Fingerabdr(u|ü)ck/,
      /huellas?(?! de ADN)(?! genética)/i,
      /empreintes?(?! ADN)(?! génétique)/i,
      /(?<!DNA)フィンガープリント/,
      /指紋/,
    ];
    const found = Object.entries(translated()).flatMap(([k, v]) =>
      OTHER.filter((re) => re.test(v)).map((re) => `${k} ${String(re)}`),
    );
    expect(found).toEqual([]);
    const t = translated();
    expect(t['app-de:app.plant.f.recordFingerprint']).toMatch(/Prüfcode/);
    expect(t['app-es:app.plant.f.recordFingerprint']).toMatch(/Código de prueba/);
    expect(t['app-fr:app.plant.f.recordFingerprint']).toMatch(/Code de preuve/);
    expect(t['app-ja:app.plant.f.recordFingerprint']).toMatch(/証明コード/);
  });

  it('no language says the name is unlocked, public or readable by the server', () => {
    const OLD = [
      /Der Name ist nicht verschlossen/,
      /Pflanzennamen? (ist|sind) nicht verschlossen/,
      /den Namen, den Sie ihm geben und den jeder mit einem Prüflink sieht/,
      /El nombre no está bloqueado/,
      /nombres? de (la|las) plantas? no est(á|án) bloqueados?/,
      /el nombre que usted le da, que ve cualquiera/,
      /Le nom n’est pas verrouillé/,
      /noms? des? (la )?plantes? n’(est|sont) pas verrouillés?/,
      /le nom que vous lui donnez, que voit/,
      /名前はロックされません/,
      /植物名はロックされません/,
      /あなたが付けた名前（確認リンクを持つ人は誰でも見られます）/,
      /名前には鍵がかかりません/,
      /名前は公開される/,
    ];
    const found = Object.entries(translated()).flatMap(([k, v]) =>
      OLD.filter((re) => re.test(v)).map((re) => `${k} ${String(re)}`),
    );
    expect(found).toEqual([]);
  });
});
