# Contributing to VeilCore

Thanks for looking. The most useful contribution right now is an attack: a way to make a
record, a licence, a date or a check say something that isn't true.

## Reporting

- **Security problems:** privately, never in a public issue. See [SECURITY.md](SECURITY.md)
  (GitHub private vulnerability reporting, or hunter@veilcore.org with a subject starting
  "SECURITY").
- **Bugs, unclear docs, wrong wording:** open an issue with the commit or page, what you did,
  what you expected and what happened. Wording that claims more than the code does counts as
  a bug.
- **Anything else:** hunter@veilcore.org.

## Running the tests

Node 24 (`.nvmrc` pins 24.11.1). From the repository root:

```bash
npm ci
cd contract && npm run compact && npm test   # needs compactc 0.31.1 (README, "Building from a fresh clone")
cd ../api && npm test
cd ../bboard-cli && npx vitest run
cd ../partner-kit && npm test
cd ../bboard-ui && npm test
npm run test:bitcoin-stamp                   # from the root
```

CI runs the same suites, plus lint and type checks, on every pull request to `main`
(`.github/workflows/ci.yaml`). The record format and its conformance vectors live in
[veilcore-sdk](https://github.com/hunterincoming/veilcore-sdk).

## How changes are reviewed

- **Show it, then fix it.** A reported weakness is first demonstrated against the build as a
  failing test, then fixed or documented. The attack stays in the suite as a test that must
  keep failing (`contract/src/test/`, `bboard-cli/src/*.test.ts`, `api/`).
- **Fresh eyes.** Fixes are re-attacked by a reviewer who hasn't seen them. Every round is
  written up in `docs/` ([docs/security-pass-30sep.md](docs/security-pass-30sep.md),
  [docs/log/](docs/log/), [docs/audit/README.md](docs/audit/README.md)). These are adversarial
  reviews, not a formal audit, and we don't call them one.
- **Words are tested too.** What the site and docs say about privacy, dates and status is
  checked by tests against what the code does (for example `bboard-ui/src/i18n/copy-truth.test.ts`).
  A change that makes a sentence false should fail a test.
- **The deployed contract is frozen.** `contract/src/veilcore.compact` matches the mainnet
  build in [docs/fingerprints.md](docs/fingerprints.md). Changing it means a new deployment
  under the [maintenance policy](docs/maintenance-policy.md), not a pull request.
- Much of this code was written with an AI coding assistant. The same tests and reviews apply
  to every change, whoever wrote it.

## Pull requests

Branch from `main`, keep each pull request to one change, include the test that shows it, and
make sure CI passes. Contributions are licensed under Apache-2.0, the licence of this
repository. Please follow the [Code of Conduct](CODE_OF_CONDUCT.md).
