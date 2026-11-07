# Lockfile review: midnight-js 5 / Ledger 9 (6 November 2026)

Branch `ledger-9`. Midnight mainnet moved to Ledger 9 on 6 November 2026; this upgrade moves
every workspace to midnight-js 5.0.0 and wallet SDK 2.0.0. This file is the entry-by-entry
review of what that did to `package-lock.json`.

## How the lockfile was written

- npm 11.6.2 (what CI uses), run from a separate copy of Node 24.11.1; the machine's own npm
  was not upgraded. No `npm audit fix`.
- Exact pins in `package.json` (`--save-exact`), then
  `npm install --package-lock-only --ignore-scripts --save-exact`.
- The result was diffed against `main` package by package. Patch bumps of packages the upgrade
  did not need were reverted by hand and npm was run again; npm then rewrote some of them (the
  lockfile it wrote from the reverted one was not stable, and `npm ci` failed on it), so the
  ones listed below as changed stayed. The second-pass lockfile is a fixed point: running npm
  on it changes nothing, and `npm ci` installs from it.
- Each new or changed entry was checked with `npm view <name>@<version>`: the registry's
  integrity hash matches the lockfile's, the publish date and maintainers are recorded, and
  none of them has an install script.

Footprint against `main`: **55 added, 25 removed, 37 changed** (`node_modules/...` paths; a
package nested in two places counts twice).

Kept on purpose:

- `@midnight-ntwrk/compact-runtime` **0.16.0** at the root: the runtime compactc 0.31.1
  compiles for, imported by VeilCore's compiled contracts (unchanged). midnight-js 5 brings
  **0.21.0** nested under `midnight-js-protocol` and `compact-js`, and reaches Ledger 8
  contracts through its own alias of 0.16.0 (`compact-runtime-ledger8`, the same tarball and
  integrity as the root copy). Both 0.16.0 copies use the one `onchain-runtime-v3` 3.1.2.
- One copy each of the WebAssembly packages: `@midnightntwrk/ledger-v8` 8.1.3,
  `@midnightntwrk/ledger-v9` 1.0.0, `@midnightntwrk/onchain-runtime-v4` 4.0.0,
  `@midnight-ntwrk/onchain-runtime-v3` 3.1.2, `@midnight-ntwrk/platform-js` 3.0.0
  (root `overrides` pin them; checked with `npm ls`).

Worth knowing: most Midnight packages here were published on 4 to 6 November 2026, days before
this review (the fork release). `@apollo/client` 4.3.7 and `undici` 7.30.2 were published on
5 November. They come in as dependencies of the Midnight packages.

## Every new or changed entry

`was` is the version on `main` (`new` if it was not there). `LOOKUP FAILED` for
`compact-runtime-ledger8` is expected: it is an npm alias, not a package name; its tarball is
`@midnight-ntwrk/compact-runtime@0.16.0`, whose integrity matches.

| package | was | dev | integrity matches registry | published | maintainers | install script |
|---|---|---|---|---|---|---|
| @apollo/client@4.3.7 | 4.2.3 | prod | yes | 2026-11-05 | phryneas, jerelmiller, apollo-bot, abernix | no |
| @effect/platform@0.96.3 | new | prod | yes | 2026-07-13 | schickling, michael.arnaldi, effect-bot | no |
| @effect/platform@0.97.2 | 0.95.0 | prod | yes | 2026-09-09 | schickling, michael.arnaldi, effect-bot | no |
| @emnapi/core@1.11.1 | new | dev, optional | yes | 2026-06-13 | toyobayashi | no |
| @emnapi/runtime@1.11.1 | new | dev, optional | yes | 2026-06-13 | toyobayashi | no |
| @emnapi/wasi-threads@1.2.2 | new | dev, optional | yes | 2026-06-08 | toyobayashi | no |
| @emnapi/wasi-threads@1.2.3 | 1.2.2 | dev, optional | yes | 2026-07-25 | toyobayashi | no |
| @grpc/grpc-js@1.14.7 | 1.14.5 | prod | yes | 2026-10-29 | murgatroid99, grpc-packages, nicolasnoble | no |
| @midnight-ntwrk/compact-js@3.0.0 | 2.5.1 | prod | yes | 2026-11-05 | ntwrk-bot | no |
| @midnight-ntwrk/compact-runtime@0.21.0 | new | prod | yes | 2026-11-03 | ntwrk-bot | no |
| @midnight-ntwrk/midnight-js-compact@5.0.0 | 4.1.1 | prod | yes | 2026-11-06 | ntwrk-bot | no |
| @midnight-ntwrk/midnight-js-contracts@5.0.0 | 4.1.1 | prod | yes | 2026-11-06 | ntwrk-bot | no |
| @midnight-ntwrk/midnight-js-fetch-zk-config-provider@5.0.0 | 4.1.1 | prod | yes | 2026-11-06 | ntwrk-bot | no |
| @midnight-ntwrk/midnight-js-http-client-proof-provider@5.0.0 | 4.1.1 | prod | yes | 2026-11-06 | ntwrk-bot | no |
| @midnight-ntwrk/midnight-js-indexer-public-data-provider@5.0.0 | 4.1.1 | prod | yes | 2026-11-06 | ntwrk-bot | no |
| @midnight-ntwrk/midnight-js-level-private-state-provider@5.0.0 | 4.1.1 | prod | yes | 2026-11-06 | ntwrk-bot | no |
| @midnight-ntwrk/midnight-js-node-zk-config-provider@5.0.0 | 4.1.1 | prod | yes | 2026-11-06 | ntwrk-bot | no |
| @midnight-ntwrk/midnight-js-protocol@5.0.0 | 4.1.1 | prod | yes | 2026-11-06 | ntwrk-bot | no |
| @midnight-ntwrk/midnight-js-types@5.0.0 | 4.1.1 | prod | yes | 2026-11-06 | ntwrk-bot | no |
| @midnight-ntwrk/midnight-js-utils@5.0.0 | 4.1.1 | prod | yes | 2026-11-06 | ntwrk-bot | no |
| @midnight-ntwrk/onchain-runtime-v3@3.1.2 | 3.0.0 | prod | yes | 2026-10-02 | ntwrk-bot | no |
| @midnight-ntwrk/platform-js@3.0.0 | 2.2.4 | prod | yes | 2026-06-24 | ntwrk-bot | no |
| @midnight-ntwrk/testkit-js@5.0.0 | 4.1.1 | prod | yes | 2026-11-06 | ntwrk-bot | no |
| @midnight-ntwrk/zkir-v2@2.2.0 | 2.1.0 | prod | yes | 2026-11-04 | ntwrk-bot | no |
| @midnightntwrk/dapp-connector-api@4.1.0 | new | prod | yes | 2026-11-05 | ntwrk-bot | no |
| @midnightntwrk/ledger-v8@8.1.3 | new | prod | yes | 2026-10-02 | ntwrk-bot | no |
| @midnightntwrk/ledger-v9@1.0.0 | new | prod | yes | 2026-11-04 | ntwrk-bot | no |
| @midnightntwrk/onchain-runtime-v4@4.0.0 | new | prod | yes | 2026-11-04 | ntwrk-bot | no |
| @midnightntwrk/wallet-sdk-abstractions@3.0.0 | new | prod | yes | 2026-11-05 | ntwrk-bot | no |
| @midnightntwrk/wallet-sdk-address-format@4.0.0 | new | prod | yes | 2026-11-05 | ntwrk-bot | no |
| @midnightntwrk/wallet-sdk-capabilities@4.0.0 | new | prod | yes | 2026-11-05 | ntwrk-bot | no |
| @midnightntwrk/wallet-sdk-dust-wallet@5.0.0 | new | prod | yes | 2026-11-05 | ntwrk-bot | no |
| @midnightntwrk/wallet-sdk-facade@5.0.0 | new | prod | yes | 2026-11-05 | ntwrk-bot | no |
| @midnightntwrk/wallet-sdk-hd@4.0.0 | new | prod | yes | 2026-11-05 | ntwrk-bot | no |
| @midnightntwrk/wallet-sdk-indexer-client@2.0.0 | new | prod | yes | 2026-11-05 | ntwrk-bot | no |
| @midnightntwrk/wallet-sdk-node-client@2.0.0 | new | prod | yes | 2026-11-05 | ntwrk-bot | no |
| @midnightntwrk/wallet-sdk-prover-client@2.0.0 | new | prod | yes | 2026-11-05 | ntwrk-bot | no |
| @midnightntwrk/wallet-sdk-runtime@2.0.0 | new | prod | yes | 2026-11-05 | ntwrk-bot | no |
| @midnightntwrk/wallet-sdk-shielded@4.0.0 | new | prod | yes | 2026-11-05 | ntwrk-bot | no |
| @midnightntwrk/wallet-sdk-unshielded-wallet@4.0.0 | new | prod | yes | 2026-11-05 | ntwrk-bot | no |
| @midnightntwrk/wallet-sdk-utilities@1.3.0 | new | prod | yes | 2026-11-05 | ntwrk-bot | no |
| @midnightntwrk/wallet-sdk@2.0.0 | new | prod | yes | 2026-11-05 | ntwrk-bot | no |
| @midnightntwrk/zkir-v2@2.2.0 | new | prod | yes | 2026-11-04 | ntwrk-bot | no |
| @midnightntwrk/zkir-v3@3.2.0 | new | prod | yes | 2026-11-04 | ntwrk-bot | no |
| @noble/ciphers@2.4.0 | 2.2.0 | prod | yes | 2026-08-27 | paulmillr | no |
| @noble/curves@2.4.0 | new | prod | yes | 2026-08-27 | paulmillr | no |
| @noble/hashes@2.4.0 | new | prod | yes | 2026-08-27 | paulmillr | no |
| @protobufjs/utf8@1.1.2 | 1.1.1 | prod | yes | 2026-07-05 | dcode, protobufjs, google-wombot | no |
| @scure/base@2.4.0 | new | prod | yes | 2026-08-28 | paulmillr | no |
| @scure/bip39@2.4.0 | new | prod | yes | 2026-08-28 | paulmillr | no |
| b4a@1.9.0 | 1.8.1 | prod | yes | 2026-09-13 | mafintosh | no |
| bare-buffer@3.7.1 | new | prod | yes | 2026-09-02 | mafintosh | no |
| bare-events@2.9.2 | 2.9.1 | prod | yes | 2026-08-26 | mafintosh | no |
| bare-fs@4.8.4 | 4.7.2 | prod | yes | 2026-10-09 | mafintosh | no |
| bare-path@3.1.2 | 3.0.1 | prod | yes | 2026-09-01 | mafintosh | no |
| bare-stream@2.13.4 | 2.13.3 | prod | yes | 2026-08-26 | mafintosh | no |
| bare-url@2.5.6 | 2.4.5 | prod | yes | 2026-11-04 | mafintosh | no |
| compact-runtime-ledger8@0.16.0 | new | false | LOOKUP FAILED | | | |
| docker-compose@1.5.0 | 1.4.2 | prod | yes | 2026-09-17 | alexzeitler | no |
| dockerode@4.0.12 | new | prod, optional | yes | 2026-04-23 | apocas | no |
| dockerode@5.0.1 | 5.0.0 | prod | yes | 2026-06-24 | apocas | no |
| effect@3.22.4 | 3.21.4 | prod | yes | 2026-10-22 | michael.arnaldi, effect-bot | no |
| fflate@0.8.3 | new | prod | yes | 2026-05-16 | 101arrowz | no |
| get-port@5.1.1 | 7.2.0 | prod | yes | 2020-01-15 | sindresorhus | no |
| get-port@7.2.0 | new | prod, optional | yes | 2026-03-22 | sindresorhus | no |
| graphql@17.1.0 | new | prod | yes | 2026-11-04 | benjie, leebyron, yaacovcr, i1g, mjmahone, enisdenjo | no |
| multipasta@0.2.9 | 0.2.7 | prod | yes | 2026-10-21 | tim-smart | no |
| readable-stream@3.6.2 | new | prod, optional | yes | 2023-03-10 | cwmma, matteo.collina, nodejs-foundation | no |
| streamx@2.28.1 | 2.28.0 | prod | yes | 2026-08-25 | mafintosh | no |
| tar-fs@2.1.5 | new | prod, optional | yes | 2026-06-27 | mafintosh, maxogden | no |
| tar-fs@3.1.3 | 3.1.2 | prod | yes | 2026-06-27 | mafintosh, maxogden | no |
| tar-stream@2.2.0 | new | prod, optional | yes | 2020-12-29 | mafintosh, maxogden | no |
| tar-stream@3.2.2 | 3.2.0 | prod | yes | 2026-10-02 | mafintosh | no |
| testcontainers@12.2.1 | 12.0.3 | prod | yes | 2026-10-13 | cristianrgreco | no |
| undici@7.30.2 | new | prod, optional | yes | 2026-11-05 | matteo.collina, ronag, ethan_arrowood | no |
| uuid@10.0.0 | new | prod, optional | yes | 2024-06-09 | broofa, ctavan | no |

## Removed

- `bboard-ui/node_modules/fflate@0.8.3`
- `node_modules/@emnapi/core@1.11.1`
- `node_modules/@emnapi/runtime@1.11.1`
- `node_modules/@midnight-ntwrk/dapp-connector-api@4.0.1`
- `node_modules/@midnight-ntwrk/ledger-v8@8.1.0`
- `node_modules/@midnight-ntwrk/midnight-js-network-id@4.1.1`
- `node_modules/@midnight-ntwrk/testkit-js/node_modules/@midnight-ntwrk/wallet-sdk@1.1.0`
- `node_modules/@midnight-ntwrk/wallet-sdk@1.2.0`
- `node_modules/@midnight-ntwrk/wallet-sdk-abstractions@2.1.0`
- `node_modules/@midnight-ntwrk/wallet-sdk-address-format@3.1.2`
- `node_modules/@midnight-ntwrk/wallet-sdk-capabilities@3.3.1`
- `node_modules/@midnight-ntwrk/wallet-sdk-dust-wallet@4.2.0`
- `node_modules/@midnight-ntwrk/wallet-sdk-facade@4.1.0`
- `node_modules/@midnight-ntwrk/wallet-sdk-hd@3.0.3`
- `node_modules/@midnight-ntwrk/wallet-sdk-indexer-client@1.2.3`
- `node_modules/@midnight-ntwrk/wallet-sdk-node-client@1.1.3`
- `node_modules/@midnight-ntwrk/wallet-sdk-prover-client@1.2.3`
- `node_modules/@midnight-ntwrk/wallet-sdk-prover-client/node_modules/@effect/platform@0.96.2`
- `node_modules/@midnight-ntwrk/wallet-sdk-runtime@1.0.5`
- `node_modules/@midnight-ntwrk/wallet-sdk-shielded@3.0.2`
- `node_modules/@midnight-ntwrk/wallet-sdk-unshielded-wallet@3.1.0`
- `node_modules/@midnight-ntwrk/wallet-sdk-utilities@1.2.1`
- `node_modules/@polkadot-api/substrate-client@0.1.4`
- `node_modules/bare-os@3.9.1`
- `node_modules/smoldot@2.0.26`
