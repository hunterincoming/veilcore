**dApp name:** VeilCore — Proof of Prior Possession for Plant Genetics

**Contract repository:** https://github.com/hunterincoming/veilcore

> **Revision 5 — 25 November 2026.** This revision adds contract version 2 (v2): a new main
> contract and a new claims contract, deployed on Midnight mainnet on 25 November 2026 next to
> the version 1 contracts of [revision 4](deployment-record-revision-4.md), which are unchanged
> and stay the contracts the public site uses. The design is [contract-v2.md](contract-v2.md);
> the order of work is [runbooks/deploy-v2.md](runbooks/deploy-v2.md).

**Status of v2: deployed on mainnet for testing by VeilCore; not yet independently reviewed;
not for your records.** It is not live for users. The site, the anchorer, the fee sponsor and
the SDK defaults stay on version 1. Nobody honours a v2 record yet, and no pilot or user record
goes on v2 before the professional audit's written close (design section 7, condition 8).

---

## What this revision adds

- `contract-v2/src/veilcore.compact` (24 circuits, the same as version 1's) and
  `contract-v2/src/veilcore-claims.compact` (5 circuits), built at `b128186` with compactc
  0.36.1 (runtime 0.21.0, Ledger 9).
- The 89 artefacts in [fingerprints-v2.md](fingerprints-v2.md), committed in `34b5f9f`: 58 keys,
  29 binary ZKIR files and the two `contract/index.js` files. compactc 0.36.1 writes no text
  `.zkir`. The keys were built on the maintainer's Mac and rebuilt byte for byte by GitHub
  Actions (runbook section D).
- Both contracts deployed with one temporary maintenance key and every verifier key inserted
  in slot V4 afterwards, one maintenance update per key.
- The pin: both addresses added to `deployments/mainnet.json` with `"contractVersion": 2`, their
  key table and their key states. Checkers identify v2 only by these pinned addresses, never by
  anything in its state.

What does not change: the version 1 entries, `api/src/deploy-guard.ts`
(`MAINNET_VEILCORE_ADDRESS` and `MAINNET_CLAIMS_ADDRESS` stay version 1's), the site, the
sponsor and its allowlist, Railway and Vercel settings, and every wallet's DUST settings.

## Mainnet deployment

Deployed from the maintainer's Mac on 25 November 2026 with `npm run deploy-v2 -w bboard-cli`
at commit `9aa72ca` (`9aa72cae5db63cbede98682167e219e7eccd052b`), whose contract source is that of
`b128186`. The deploy-session record (`veilcore-v2-deploy-session/v1`, created
2026-11-25T22:10:00.841Z, last updated 2026-11-25T23:44:25.452Z) names compiler 0.36.1, key slot
V4 and the SHA-256 of the key table it checked against,
`733e57afcb03274bd389683bb549dd9fb345a176dfa99ef7cc9b99baa249f0f9` (the SHA-256 of
`docs/fingerprints-v2.md` on main). The record is public: it holds addresses, transactions and
the temporary key's public key, no secret.

**Main contract v2 (`veilcore`):**

- **Contract address:** `2f3392b65bec383d7b33e9883233e8f7e9c9fd696ba4e135e9cb86cf5abf7406`
- **Deploy transaction id:** `00ba1a6ee8cdf87d870836d0a3a1bb0578529713cdd1691ff48045bdc471a163c2`
  (transaction hash `44a8e51124e97b5ecfd79fc9b7082487caf9f74ecf708756020baeefd7a883b0`, block 3614857)
- **Verifier keys:** none in the deploy; 24 inserted in slot V4, counters 0 to 23, from block
  3614860 to block 3614930 (the last, `withdrawTransfer`, counter 23, transaction hash
  `9b3edbf4e3719f1c4b79ca71257540cd175dce9d03766f4e12d237bf92492bf1`)
- **Maintenance authority:** one temporary key, threshold 1, counter 24

**Claims contract v2 (`veilcore-claims`):**

- **Contract address:** `f5bc670dcd8a759a4c0476bc1b7e4183a3f7e3727ee3af7fb54e955fa607f1dc`
- **Deploy transaction id:** `001093371c22217fe202b1de201aab9a4b20813f45c4a5f62b68f2510aa5f98b8a`
  (transaction hash `21fa8e4df9442c175e1286cf3362d2d164189cfb4972c164647ec4fa4be75e28`, block 3614933)
- **Verifier keys:** none in the deploy; 5 inserted in slot V4:

  | Circuit | Counter | Transaction hash | Block |
  |---|---|---|---|
  | `proveAttested` | 0 | `cfe37b738def506d26c3ef00c0f3549a1c6ffadf1d30e19d6ec066fa85739f86` | 3614936 |
  | `proveDistinct` | 1 | `8c9cc85769cd5c1c9add6bd8a527427c8eb7f162f14d2fc92136de3ede7a559c` | 3614939 |
  | `proveRange` | 2 | `ba6adc7074a610a764cc8e2adfeeb0a74d7999b1f59f13475305b62ae02e6616` | 3614942 |
  | `proveUnchanged` | 3 | `279ed60d523fb2214fdb0915ba43ce0fe2a28781d24d126043ff7f371228f19d` | 3614945 |
  | `proveValue` | 4 | `0863126c977093938251feb370043863e0c1a6f323a8fac5738e64bec77ba1ba` | 3614948 |

- **Maintenance authority:** one temporary key, threshold 1, counter 5

**Both:** the same temporary key (public key
`294eccde2c66e3cfcbdba58dd2b428271f8de98a1d0a5e10112385b3a477e688`). It exists only as an
age-encrypted file on the maintainer's Mac. It is handed to the 2-of-3 committee after the
policy's 14-day notice (runbook step 18), and that handover gets its own revision.

## Checks before the pin

- **`npm run verify:deployment -- --network mainnet --v2-record ...`** on the maintainer's Mac,
  25 November 2026: `RESULT: PASS`. 29 of 29 keys match `docs/fingerprints-v2.md` in slot V4;
  stage "one key, not yet handed to the committee"; authority counters 24 and 5; every
  maintenance update since each deploy is a listed V4 key insert.
- **A second look from this repository, 25 November 2026,** through VeilCore's public mainnet
  relay (`veilcore-indexer-relay-production.up.railway.app/indexer`): both addresses exist; each
  deploy transaction above is a successful `ContractDeploy` of its address, in the block given;
  the five claims inserts and the main contract's last insert are in the blocks given; and each
  contract's latest action is its last key insert, so no call or update had landed on either
  contract since. With these entries in `deployments/mainnet.json`,
  `npm run verify:deployment -- --network mainnet` through the same relay passed for all four
  contracts: 58 of 58 circuits, v2's 29 keys in slot V4, v2's authorities one key at counters
  24 and 5. The relay is run by VeilCore; for a check that does not rely on it, run the same
  command with `--indexer` or a Blockfrost project of your own.

## Self-assessment

v2 keeps every version 1 circuit with the same behaviour (design section 1.1) and lists its
changes in sections 1.3 and 1.4. This revision makes no new score: revision 4's self-assessment
is the starting point, and the audit will be asked to check it against v2. What differs for
this record:

- **Maintenance authority.** One temporary key until the handover, not the paper key of
  version 1. Until then the deployment check refuses every maintenance update except the listed
  V4 key inserts and the one handover.
- **Anyone who pays a fee can call v2.** That is acceptable only because nobody honours a v2
  record before the audit. The team makes its own test records on v2 only from the CLI or a
  maintainer-only build, never through the public site.
- **Review.** VeilCore's own review only (design section 7, condition 1; the mutation pass,
  runbook section H; the key rebuild on a second machine, section D). No independent review yet.

## Founder sign-off

- **Hunter Roberts:** deployed v2 to mainnet on 25 November 2026 and merges this pin.
- **Makoto Steiner:** approved the v2 maintenance policy text in writing (design decision 12,
  confirmed 25 November 2026).
- **Filed upstream:** not yet. Whether and when this revision is filed with Midnight is the
  founders' decision.
