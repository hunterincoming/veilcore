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

Not run this time: DNA pairing, proving possession, the CLI cross-check (option 44) and
the restore test (Part 4, steps 4, 5, 7 and 8).

## What broke on the way, and the fixes

| Problem | Cause | Fix |
|---|---|---|
| Sponsor wallet sync looped for 16 h (10-11 Oct) on `Wallet.Sync: [object Object]` | saved sync progress the indexer no longer matched (servicedesk#216, midnight-indexer#1460) | progress moved aside, synced from the start in about 1 h. The CLI now warns after 20 min with no progress (`sync-watch.ts`); the sponsor sets its progress aside and restarts once by itself after 30 min (`sync-stall.ts`) |
| Anchoring job: `error`, alert, every 5 min | the preprod registry's `VEILCORE_OPERATOR_TOKEN` was empty after the Raw Editor paste | set on the registry, same value as the sponsor's `REGISTRY_OPERATOR_TOKEN` |
| Every site transaction refused: "The transaction expires too far in the future" | midnight-js gives every call a one-hour expiry; `MAX_TTL_MINUTES` defaulted to 30, and the tests built their own short-lived transactions | `MAX_TTL_MINUTES=65` on Railway for this run; default now 65, under 61 refused at startup (`fae74db`) |

## Still open before students

- The rest of Part 4 (pairing, possession, CLI check, restore).
- A hosted site cannot read preprod without a key in the page (the run's "Not covered").
- The branch's site copy predates the mainnet copy on `main`; merge before any release.
- Mainnet: the sponsor refuses it by design. Which wallet pays mainnet fees is a founders' decision.
