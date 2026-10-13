# No-wallet run on preprod, 12 October 2026 (short version)

Hunter, on his Mac (site at localhost:4173, built from `feat/no-wallet`), against three
Railway services: `proof-server` (8.1.3), `veilcore-api-preprod` (anchors on preprod,
contract `72fe3343…2f73`, OpenTimestamps off) and `veilcore-sponsor`.

**Result: both things this run exists to prove worked, for the first time on a real network.**

1. **A record anchored from a browser with no wallet and no crypto.** "Test Run Kush"
   (made-up). The browser built and proved the `anchor` call in **36 seconds**; the sponsor
   paid the fee. Transaction `607f1266e6fe1f8279d01f50f0a2b887e82f35efe8d1c832c6633fe687f5d924`,
   block 2955100 (19:40:30 local, the chain's clock).
2. **The record was dated on chain by the sponsor's anchoring job, with nobody running a
   command.** Batch `B-20261012-97E1` (1 record) sealed 23:19:51 UTC, `anchorBatch`
   transaction `4ce95af6ca2923b9be52a16af1be3ba92812f32ba8fe07a0489ef05e164ee8d1`, block
   2954895, recorded 23:20:00 UTC: about four minutes after the record was sealed.

Finished the next morning (13 Oct), same record, same services:

3. **DNA pairing dated** from the browser (a stand-in PNG as the report) in **38 seconds**:
   transaction `86c2007c4e2447b3de91a36816315893e3009aa4c4a0034b4b195ac0a938edc7`, block 2961832.
   Evidence file downloaded.
4. **Proving possession, both sides played:** challenge made on the checker's link, answered
   from the record's Certificate step, and the checker's page said **Accepted** (the
   transaction came from the record's identity and answered the challenge). Time not noted.
5. **Restore:** keys removed from the browser, then restored from the backup file; the anchor
   came back (block 2955100). Only after a site fix, below.

Not run: the CLI cross-check of the pairing (option 44): seed 2's sync progress was set aside
on 12 Oct, so it needs an hour-long sync first.

## What broke on the way, and the fixes

| Problem | Cause | Fix |
|---|---|---|
| Sponsor wallet sync looped for 16 h (10-11 Oct) on `Wallet.Sync: [object Object]` | saved sync progress the indexer no longer matched (servicedesk#216, midnight-indexer#1460) | progress moved aside, synced from the start in about 1 h. The CLI now warns after 20 min with no progress (`sync-watch.ts`); the sponsor sets its progress aside and restarts once by itself after 30 min (`sync-stall.ts`) |
| Anchoring job: `error`, alert, every 5 min | the preprod registry's `VEILCORE_OPERATOR_TOKEN` was empty after the Raw Editor paste | set on the registry, same value as the sponsor's `REGISTRY_OPERATOR_TOKEN` |
| Every site transaction refused: "The transaction expires too far in the future" | midnight-js gives every call a one-hour expiry; `MAX_TTL_MINUTES` defaulted to 30, and the tests built their own short-lived transactions | `MAX_TTL_MINUTES=65` on Railway for this run; default now 65, under 61 refused at startup (`fae74db`) |

| After "Remove", no way to restore: the page offered only "Make this record's keys" | the anchor panel showed the keys panel (with its restore button) only once keys existed | restore shown first, new keys marked as only for a record that never had any (`3e757ee`) |
| "In this web demo the pairing isn't dated yet" right above the button that dates it | demo wording on a real-chain build | test builds say it can be dated below (`3e757ee`) |
| The backup was never downloaded: "I understand, and I will download the backup" was ticked and the page moved on | anchoring is gated on the backup, but the backup state reset after pairing and nothing made that obvious | open: part of the redesign below |

## Hunter's verdict on the site

"I feel like the site is confusing ... it needs to be so simple like you can't fuck it up ...
this is all over." His bar: a store's returns kiosk, which no employee can get wrong. What
went wrong for him, in order: too much text around every button; the steps spread over the
record page, the Certificate step and a special checker's link (the plain verify link does not
offer proving); the backup easy to skip; a dead end after removing keys; wording that
contradicted itself. Agreed next step: a mock-up of one record page that works like a
checklist (one action per step, the app leads, the backup cannot be skipped, a plain receipt
at the end), for Hunter to react to before anything is built.

## Still open before students

- The rest of Part 4 (pairing, possession, CLI check, restore).
- A hosted site cannot read preprod without a key in the page (the run's "Not covered").
- The branch's site copy predates the mainnet copy on `main`; merge before any release.
- Mainnet: the sponsor refuses it by design. Which wallet pays mainnet fees is a founders' decision.
