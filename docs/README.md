# VeilCore documentation

Start with [design.md](design.md). The record format itself is specified in
[veilcore-sdk](https://github.com/hunterincoming/veilcore-sdk) (SPEC.md).

## How it works

| Document | What it covers |
|---|---|
| [design.md](design.md) | The main contract, the verifier rules and the trust model |
| [claims-design.md](claims-design.md) | The claims contract: proving one fact about a sealed record |
| [identity-in-record.md](identity-in-record.md) | A record that names its own key |
| [animal-profile.md](animal-profile.md) | Animal records |
| [simple-flow.md](simple-flow.md) | The order of steps in the web app, and why |
| [corrections.md](corrections.md) | Correcting a record without losing the original |
| [check-on-chain.md](check-on-chain.md) | How the check page looks a date up on Midnight |
| [evidence-bundle.md](evidence-bundle.md) | The offline evidence bundle |
| [evidence-in-practice.md](evidence-in-practice.md) | Using the evidence bundle with a lawyer, examiner or buyer |
| [lab-name-checks.md](lab-name-checks.md) | Checking a lab's name before marking its key |
| [upgrades.md](upgrades.md) | How VeilCore changes without touching existing evidence |
| [privacy-and-data-terms.md](privacy-and-data-terms.md) | Privacy and data terms (draft) |

## The deployed contracts

| Document | What it covers |
|---|---|
| [deployment-record-revision-4.md](deployment-record-revision-4.md) | The deployment record filed with Midnight, with the mainnet addresses and transactions |
| [fingerprints.md](fingerprints.md) | SHA-256 of every compiled artefact, to compare with your own build |
| [maintenance-policy.md](maintenance-policy.md) | Who holds the main contract's maintenance key, and when it may be used |
| [maintenance-committee.md](maintenance-committee.md) | The plan to move that key to two of three holders |
| [mainnet-completeness.md](mainnet-completeness.md) | What was required before mainnet, and what is still open |

## Reviews and test runs

These are adversarial reviews and run records, not a formal security audit.

| Document | What it covers |
|---|---|
| [audit/README.md](audit/README.md) | Pack for an outside reviewer: scope, history of attack rounds |
| [security-pass-30sep.md](security-pass-30sep.md) | Attack rounds 1 to 12 on both contracts |
| [log/](log/) | Dated run records: preprod smoke tests, partner kit check, round D, the 3 October self-review |
| [no-wallet-run-12oct.md](no-wallet-run-12oct.md) | No-wallet run on preprod, 12 October 2026 |
| [bitcoin-stamp-check-11oct.md](bitcoin-stamp-check-11oct.md) | Check of the first mainnet batch's Bitcoin timestamp |

## For partners

| Document | What it covers |
|---|---|
| [PARTNERS.md](PARTNERS.md) | Calling VeilCore's contracts from your own systems (`@veilcore/contracts`) |
| [partners/require-a-record.md](partners/require-a-record.md) | Asking suppliers for a VeilCore record |
| [MANAGED.md](MANAGED.md) | VeilCore-run: VeilCore operates on chain for a partner |
| [legal/](legal/) | Draft agreements, for a lawyer to review |

## Running VeilCore

| Document | What it covers |
|---|---|
| [ops/runbook.md](ops/runbook.md) | Running the CLI: rehearsal, smoke test, mainnet deploy |
| [ops/release-checklist.md](ops/release-checklist.md) | Before every release |
| [ops/incident-response.md](ops/incident-response.md) | What happens after a security report |
| [ops/mainnet-day-site.md](ops/mainnet-day-site.md) | Publishing the website in mainnet mode |
| [ops/filing-revision-4.md](ops/filing-revision-4.md) | How deployment record revision 4 was filed |
| [test-site.md](test-site.md) | The public test site, test.veilcore.org |
| [translations/README.md](translations/README.md) | How translations are made and signed off |
