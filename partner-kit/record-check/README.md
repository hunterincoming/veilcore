# @veilcore/partner-kit

Require a VeilCore record: check a record from its check link in one call, in Node, a
browser or a terminal, and add a "VeilCore record required" field to an intake form.
Free, no account, no key. VeilCore never vouches: the answer says what was checked and
whose word the rest is.

**Status:** not on npm yet. Build with `npm run build` here; the files are in `dist/`.

The guide for program managers and developers, with the answer's full shape, CSP, rate
limits and sample policy wording: [docs/partners/require-a-record.md](../../docs/partners/require-a-record.md).

```js
import { checkRecord } from '@veilcore/partner-kit';
const c = await checkRecord('https://veilcore.org/verify/VEIL-…?fp=…');
// c.recordExists, c.fingerprintMatches, c.dated, c.keyBound, c.labReceipts, c.whatThisDoesNotShow
```

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
| `dist/cli.js` | `partner-kit check`. Exit 0: the record exists and the link matches; 1: it doesn't, or something given contradicts it; 2: nothing could be checked. |
| `dist/veilcore-record-check.js` | The form field, one self-contained file to copy onto your site. |

## Tests

- `record-check/test/check.test.ts` (run from `partner-kit`: `npx vitest run record-check/test`):
  the answer for dated, undated, tampered, withdrawn and unchecked-name cases against a
  stand-in registry, and the look-up wired to the real `checkBatchAnchor`.
- `e2e/element.spec.ts` (Playwright) and `e2e/cli.e2e.test.mjs` (`node --test`): the field
  and the command against a local registry seeded with test records. They start one from a
  veilcore-api checkout (`REGISTRY_DIR`, default `../../../backups` from this folder) on
  port 8920 (`REGISTRY_PORT`) with a fresh database, and stop it by PID. `npm run e2e`.

Apache-2.0.
