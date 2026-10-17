# @veilcore/partner-kit

Require a VeilCore record: check a record from its check link in one call, in Node, a
browser or a terminal, and add a "VeilCore record required" field to an intake form.
Free, no account, no key. VeilCore never vouches: the answer says what was checked and
whose word the rest is.

**Status:** not on npm yet. Build with `npm run build` here; the files are in `dist/`.
Checking is free. Support: hunter@veilcore.org (no support agreement). If VeilCore stops,
the field and the default registry stop working; records still check from their evidence
bundles.

The guide for program managers and developers, with the answer's full shape, CSP, rate
limits and sample policy wording: [docs/partners/require-a-record.md](../../docs/partners/require-a-record.md).

```js
import { checkRecord } from '@veilcore/partner-kit';
const c = await checkRecord('https://veilcore.org/verify/VEIL-…?fp=…');
// c.recordExists, c.fingerprintMatches, c.dated, c.keyBound, c.labReceipts, c.whatThisDoesNotShow
```

`fingerprint` in the answer is the record's proof code, as the site and the field's own
sentences call it. A link the site makes can carry the record's name, the name's salt, the DNA
pairing salt and the lab report salt after the `#` (`n=`, `ns=`, `ds=`, `ls=`). A browser
doesn't send that part when it opens the link, but the link goes whole to wherever it is pasted:
a link pasted into your form comes to you whole. The name is checked against the record's
published name code with the link's salt (`nameCheck`: `matches`, `does-not-match`,
`not-checked` for a link or record from before 17 October 2026, `published` when the holder
shows the name, or `not-in-link`); `nameByHolder` is set only when the name is checked to be
the record's, and `nameInLink` is the link's name whatever it is. A lab report signed since
17 October 2026 names the report bound to the record (`documentBound`), not the file's
SHA-256; one signed before is withheld by the registry (`labReportsWithheld` counts them).

```sh
npx @veilcore/partner-kit check '<check link>' [--fields sealed-fields.json] [--on-chain] [--text]
```

```html
<script type="module" src="/vendor/veilcore-record-check.js"></script>
<veilcore-record-check name="veilcore_link" required></veilcore-record-check>
```

| File | What it is |
|---|---|
| `dist/index.js` | The check, browser-safe. Depends on `veilcore-records`. |
| `dist/node.js` | The same, plus the date stamp looked up on Midnight through `@veilcore/contracts` (optional peer dependency). |
| `dist/cli.js` | `partner-kit check`. Exit 0: the record exists, the link matches and nothing contradicts it; 1: something does not hold (including a date on a test network unless `--allow-test-network`, or an inclusion proof that doesn't check out); 2: nothing could be checked. |
| `dist/veilcore-record-check.js` | The form field, one self-contained file to serve from your site. Options: `required`, `allow-test-network`, `when-unreachable="allow"` (by default a required field blocks the form while the registry is down). |

## Tests

- `record-check/test/check.test.ts` (run from `partner-kit`: `npx vitest run record-check/test`):
  the answer for dated, undated, tampered, cut-off, withdrawn, custody and unchecked-name
  cases against a stand-in registry, and the look-up wired to the real `checkBatchAnchor`.
- `record-check/test/element.test.ts`: the field's own logic on a DOM stand-in (an answer
  counts only for the link it was made for; test network, proof and outage rules).
- `e2e/element.spec.ts` (Playwright) and `e2e/cli.e2e.test.mjs` (`node --test`): the field
  and the command against a local registry seeded with test records. They start one from a
  veilcore-api checkout (`REGISTRY_DIR`, default `../../../backups` from this folder) on
  port 8920 (`REGISTRY_PORT`) with a fresh database, and stop it by PID. `npm run e2e`.

Apache-2.0.
