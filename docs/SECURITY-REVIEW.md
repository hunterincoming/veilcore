# Security review: scope for an outside reviewer

For a security firm reviewing VeilCore before agreements go live on mainnet. Contact:
hunter@veilcore.org.

## What VeilCore is, in two lines

A breeder dates a plant record on Midnight and licenses its genetics to growers. The license,
its terms, royalty statements and payments are private between the two parties; VeilCore
records that they exist and in what state, and never holds money or reads the terms.

## In scope

The off-chain layer built in October 2026, which has had internal review only:

| Area | Code | What to attack |
|---|---|---|
| Deal channel | site `bboard-ui/src/veilcore/deal.ts`, `deal-client.ts`; registry `lineage/deals.mjs` | Ed25519 → X25519 ECDH, HKDF, AES-GCM, signatures, ordering by signed time. Can the registry or a third party read, forge, reorder, replay or splice messages between deals? |
| License invites and the 6-digit code | site `veilcore/license-invites.ts`, `components/licensing/RealLicensePanel.tsx`, `LicenseInvitePage.tsx`; registry `lineage/license-invites.mjs` | Can a registry or link-holder substitute a key without the two people's codes differing? Commit-reveal ordering. |
| Money arithmetic | site `veilcore/money.ts` | Rounding, precision, malformed decimals, percent handling. |
| Payment requests and receipts | site `veilcore/payments.ts`, `payment-partners.ts`; registry `lineage/payment-receipts.mjs`; `docs/PAYMENT-PARTNERS.md` | Can a receipt be forged, replayed onto another statement, or shown as trusted when it isn't? |
| Passkey backup copy | site `veilcore/passkey-backup.ts`, `components/flow/PasskeyCopy.tsx`; registry `lineage/passkey-vault.mjs`; `docs/passkey-backup.md` | PRF → HKDF derivation, AES-GCM binding, registry rollback, overwriting someone else's copy, restore merging into an existing browser. |
| W3C credentials | site `veilcore/vc.ts`, `credentials.ts` | eddsa-jcs-2022 conformance, JCS edge cases, did:key parsing, accepting a credential not about this license or holder. |
| Sales report evidence | site `veilcore/evidence.ts` | Anything that lets a statement's report be swapped after signing. |
| Backups | site `veilcore/backup.ts` | A restored file changing keys it shouldn't; a backup marked complete when it isn't. |

## Out of scope

- The Compact contract on mainnet (`a04de0a2…2347`). It is frozen, has had two external
  attacker passes, and is not changed by any of the above.
- Midnight itself, the proof server, wallets.
- Denial of service by volume beyond the per-client limits documented in each registry module.

## Threat model

- **The registry operator is not trusted** for secrecy or integrity of deal content, backups or
  credentials. It is trusted only to store and serve; withholding is a known, accepted limit
  (`docs/agreements-live.md`, "Known limits").
- **Each party trusts its own device** and the 6-digit code read aloud between the two of them.
- **A payment partner is trusted** only once its key is in the website's own list.
- **The website build is trusted** (served from VeilCore's Vercel deploy, pinned contract).

## Already found and fixed internally

Review rounds 1 to 3 on this layer and an independent attack pass on 21 October 2026 (one
High: a credential signed for terms other than the agreed ones; four Medium: passkey copies
overwriting each other, a passkey copy counting as the backup file, a malformed signed message
breaking the license page, and a delete using the wrong passkey; all fixed with tests) are in
the git history of `feat/real-licences` (site) and `license-invites` (registry). The accepted
limits are in `docs/agreements-live.md`.

## How to run it

```
git clone <site repo>; git checkout feat/real-licences
cd bboard-ui && npm ci && npx vitest run
git clone <registry repo>; git checkout license-invites
npm ci && npm test
```

A test-network deployment (test.veilcore.org with the preprod registry) can be provided for
live testing.
