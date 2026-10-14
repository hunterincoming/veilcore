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

## Not covered

A real date stamp or a real proof on the network: those need the sponsor and a Blockfrost
key, so they are run by hand on Hunter's Mac (docs/no-wallet-preprod-run.md).
