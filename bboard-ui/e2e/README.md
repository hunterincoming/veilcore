# Browser tests

The built site, in a real browser (Chromium) at phone size. Unit tests run in Node and
can't see what only breaks in a browser: how the site is bundled, browser storage, the
chain code loading, a page that comes up blank. These can.

Every request that isn't the site itself (or the registry you name) is refused, so a test
can never reach the Midnight network, the fee sponsor or anything else, and never spends
anything.

## In CI (every push and pull request)

```
npm run e2e:build      # a test build: test network, made-up contract, stand-in registry
npm run e2e            # site.spec.ts; flow.spec.ts is skipped
```

`site.spec.ts`: every page opens with no script errors; the checker asks by link and an
answer is checked by the chain code in the browser; the holder's and a stranger's view of
a prove link; the paste box. The registry is a stand-in inside the test.

## Against a real registry (before merging site changes)

Start a registry (the `veilcore-api` repository) locally, for example on port 8790 with
`DB_PATH=/tmp/e2e.db VEILCORE_OTS=off PORT=8790 node server.js`, then:

```
E2E_API_BASE=http://127.0.0.1:8790 npm run e2e:build
E2E_API_BASE=http://127.0.0.1:8790 npm run e2e
```

`flow.spec.ts` then runs the whole journey against it: log a plant, the date stamp failing
safely (the network is blocked) and a way past it, sharing with the date stamp in the
link, a checker asking by link, the holder opening it, an answer arriving, the checker
coming back in a new tab. The stand-in tests are skipped.

`sealed-records.spec.ts` checks that the registry can't read what a holder typed: a plant
logged with a marker in every field and sent to a lab leaves none of them in the registry's
database file (give its path as `E2E_REGISTRY_DB`, e.g. `E2E_REGISTRY_DB=/tmp/e2e.db`; that
test is skipped without it); a backup restored in a fresh browser opens the records; and a
browser with the holder key but not the vault key shows them as locked.

`evidence-bundle.spec.ts` downloads a record's evidence bundle from the plant page and opens
its `verify.html` from `file://` with the network off. Against a real registry it also
needs an operator token and an anchor contract (`E2E_OPERATOR_TOKEN`,
`E2E_ANCHOR_CONTRACT`): how to start one for it is in `docs/evidence-bundle.md`.

## The registry contract, without a browser

`src/veilcore/registry-contract.test.ts` drives the app's own modules (saving, opening,
corrections, grants, offers and claims, receipts, licences, the export, the backup) against
a real registry process and then reads the registry's database file byte for byte. Give it a
`veilcore-api` checkout; it starts its own registry on a free port with a fresh database:

```
VEILCORE_CONTRACT_REGISTRY=../../veilcore-api npx vitest run src/veilcore/registry-contract.test.ts
```

(or a running registry's address, with `VEILCORE_CONTRACT_DB` naming its database file). It
is skipped when the variable isn't set.

## Not covered

A real date stamp or a real proof on the network: those need the sponsor and a Blockfrost
key, so they are run by hand on Hunter's Mac (docs/no-wallet-preprod-run.md).
