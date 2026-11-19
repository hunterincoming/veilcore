# Translations

VeilCore's pages and its record app come in English, Spanish, Japanese, German and French.
English is the source text. The other four are machine-assisted translations. On
19 November 2026 they were reviewed against native official and industry sources (the terms
and sources are in [../i18n-glossary.md](../i18n-glossary.md)) and switched on by the founder's
decision, without a fluent human reviewer. A fluent speaker's check is still welcome: this page
says where the text lives, how to check a language, and how a language is switched on or off.

## Where each language shows

One switch decides it: `PUBLISHED_LANGUAGES` in
[`bboard-ui/src/config/languages.ts`](../../bboard-ui/src/config/languages.ts), one flag per
language. English is always on.

All five flags are `true`: every build offers all five languages in the picker, with no draft
banner, and a visitor whose browser (or phone) asks for Japanese, Spanish, German or French
gets it on the first visit. A language they pick in the picker is kept on that browser.

If a flag is set back to `false`, that language becomes a draft again:

| Build | Language picker offers | Draft banner |
| --- | --- | --- |
| Test site (test.veilcore.org) and the demo build | every language | on every page in a language whose flag is `false` |
| veilcore.org (mainnet build) | each language whose flag is `true`, plus the drafts in `MAINNET_DRAFTS` | on a draft |

A draft can always be opened with a link such as `https://veilcore.org/?lang=ja`, and the
browser's own language never picks one.

The picker is on every page, site and app. The banner says the translation is a draft and
offers the English.

## Where the text lives

| What | Files |
| --- | --- |
| Public pages (home, about, FAQ, footer, page titles) | `bboard-ui/src/i18n/en.ts` and `ja.ts`, `es.ts`, `de.ts`, `fr.ts` next to it, with the overlays `en-mainnet.ts` and `en-testchain.ts` |
| The record app (logging a plant, backup, plant page, lab code, check page, proving, collection import, the partners page) | `bboard-ui/src/i18n/app/<language>/<screen>.ts`, merged in `app/<language>/index.ts` |

A visitor downloads only the language they read: English comes with the first file, and
another language's words are fetched when it is chosen (`i18n/index.tsx` for the public
pages, `i18n/app.tsx` for the app). `i18n/catalogs.ts` has every language at once, for tests.

App keys are named by screen: `app.log.*`, `app.backup.*`, `app.home.*`, `app.plant.*`,
`app.lab.*`, `app.pair.*`, `app.verify.*`, `app.prove.*`, `app.chain.*`, `app.import.*`,
`app.history.*`, `app.partners.*`, `app.lic.*` (licenses, royalties, handing a license on,
proving a license, lenders' claims), with `app.common.*`
for words that several screens share. `{name}` is a placeholder for a value, and `<b>…</b>` or
`<link>…</link>` marks a part shown in bold or as a link. Keep both exactly, and move them to
wherever the sentence needs them. A key ending `.one` or `.other` is one plural form.
Japanese has no `.one`.

Each language's `app/<language>/index.ts` lists the words it uses for each idea, one word per
idea. Keep to them.

## What stays in English

Some files the app makes are in English only, whatever language the page is in. They are
evidence that other people check, and one wording keeps them comparable:

- the evidence bundle (`README.txt`, `verify.html`, the examiner summary);
- a certificate's declaration;
- the breeding history download;
- the certificate card and its PNG and JSON downloads (the screen around it is translated).

Some pages and parts stay in English for now, with a line in the page's language saying so:
the published documents and the implementations page. A lender pack (its `README.txt` and
`summary.txt`) is in English too, like the other evidence files. The partners page's live form field
(`partner-kit/record-check`) has its own English words. Downloaded lab report file names
are in English.

Beside each of these downloads, the app says "This file is in English" in the page's language
(`app.common.fileInEnglish`). Error details that come straight from the registry or from the
network can also show in English.

## Rules every language keeps

These hold in every language, and the tests check them (`bboard-ui/src/i18n/copy-truth.test.ts`
for the site, `bboard-ui/src/i18n/translations.test.ts` for the app):

- **One word per idea**, as listed in [../i18n-glossary.md](../i18n-glossary.md).
- **Hold, never own.** A record shows what someone held. Never write "own" or "ownership":
  no 所有 (use 保有), no Besitz, besitzen or Eigentum (use halten, Inhaber), no posséder or
  propriété (use détenir, détenteur), no poseer, propiedad or dueño (use tener, titular).
- **VeilCore never vouches** for a lab, a name or a plant.
- Keep every limit and every "does not" exactly. The English is careful not to claim too much.
- Short, plain sentences. Use the words people already know: date stamp, lab code, lab report,
  backup, link.
- Every key that the English has, with the same placeholders and the same tags.

## How to check a language

1. Open the test site (test.veilcore.org) and choose the language in the picker. Go through
   the whole product in it: the home page, logging a plant, saving the backup, the plant page,
   sending to a lab with a lab code, receiving with a lab code, the check page, proving
   you hold a plant, and a license from start to finish (making it, royalties, handing it on). Then check the files listed under "Where the text lives" side by side
   with the English, key by key.
2. Correct the translation in the language's files and send the change as a pull request.
   Say in it what you changed and why. If a sentence can't say what the English says
   naturally, write a note instead of guessing.
3. Read every limitation twice: "not checked", "not a check of the genetics", "test network
   only", "doesn't vouch". These must say exactly what the English says.
4. When the whole language is right, site **and** app, add one line for it to the sign-off
   table below, in the same pull request or a later one.

## How to switch a language on

1. The language has a sign-off line in the table below, with "site and app", who checked it
   (and how, if not a fluent speaker) and the date.
2. In `bboard-ui/src/config/languages.ts`, set the language's flag in `PUBLISHED_LANGUAGES` to
   `true`.
3. Run `npx vitest run src/i18n` in `bboard-ui`. `translations.test.ts` fails if a language
   is switched on without a sign-off line here.
4. Build and deploy veilcore.org as usual. The language is then in the picker, with no draft
   banner, and visitors whose browser asks for it get it.

To switch a language off again, set its flag back to `false`. Its sign-off line can stay.

If the English changes after a sign-off, the changed keys need checking again before the
next release. Say which keys changed in the pull request that changes them.

## Sign-off

One line per language. A language is switched on only with a line here.

| Language | Checked | Checked by | Date |
| --- | --- | --- | --- |
| ja | site and app | Founder's decision (Hunter Roberts): review against native official sources, no fluent human reviewer ([glossary](../i18n-glossary.md)) | 2026-11-19 |
| es | site and app | Founder's decision (Hunter Roberts): review against native official sources, no fluent human reviewer ([glossary](../i18n-glossary.md)) | 2026-11-19 |
| de | site and app | Founder's decision (Hunter Roberts): review against native official sources, no fluent human reviewer ([glossary](../i18n-glossary.md)) | 2026-11-19 |
| fr | site and app | Founder's decision (Hunter Roberts): review against native official sources, no fluent human reviewer ([glossary](../i18n-glossary.md)) | 2026-11-19 |
