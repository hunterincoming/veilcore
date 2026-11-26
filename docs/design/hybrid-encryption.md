# Hybrid encryption: X25519 plus ML-KEM

**Design, not built. Nothing is broken publicly as of 25 Nov 2026.**

Nothing here changes the contracts, the record format or any page. It lists everything VeilCore
locks with a public key today, says which of it someone could copy now and open later, and says
what we would change, in what order. It is the note that
[hash-based-signatures.md](hash-based-signatures.md) (section 1) said encryption deserved.

## In plain words

**The risk.** Some of what VeilCore locks is locked with X25519, an elliptic-curve key exchange.
If elliptic curves are ever broken (a large quantum computer would do it), every file locked
that way opens, including copies someone took years earlier. That is "harvest now, decrypt
later". Signatures can be replaced on the day they break; locked data can't be un-copied. That
is why this matters before anything is broken, not after.

**What is already safe.** Most of VeilCore. A record's private details are sealed in your
browser with a random 256-bit key (AES-256-GCM) that never leaves your devices. The backup file,
the passkey copy, the recovery sheet and the "Saved with VeilCore" account copy are all sealed
with keys made from a password, a passkey or a long code, never sent anywhere. None of that uses
an elliptic curve, so a curve break doesn't open it.

**What isn't.** Five things use X25519 to get a key to someone else:

1. **Lab reports** locked to a breeder (the `age` format).
2. **Deal messages** between the two sides of a licence.
3. **The registry's off-site backups.** Old ones, taken before records were sealed, hold
   records in plain text.
4. **The bundle VeilCore-run hands a partner when they leave** (it holds their record secrets).
5. **The connection itself** (TLS) to the registry, which carries the holder key.

**The fix.** Lock each of these with two key exchanges at once: X25519 as today, and ML-KEM-768,
the NIST standard built on a different kind of maths (FIPS 203). The two are combined the
standard way (X-Wing), so the lock holds if either one holds. Nothing new to invent: the `age`
library VeilCore already uses can do this today, and the post-quantum code it needs is already
installed.

**Old data.** New data gets the hybrid lock first. Old files stay readable forever (each file
says which lock it used). Re-locking an old copy doesn't help against someone who already took
it; what helps is deleting copies we no longer need. So the cheapest strong step is housekeeping:
make sure the old pre-sealing backups are actually deleted, not just "key destroyed".

**First step.** Switch the registry's backups to a hybrid `age` key. It needs a new key made on
Hunter's Mac and one Railway setting, and the code that reads that setting very likely already
takes it (a test has to confirm). About a day, mostly checking.

**What we would not do.** Write our own crypto, combine keys our own way, or call anything
"quantum-proof". If lattices (ML-KEM's maths) fall as well as curves, only the symmetric locks
survive; the hybrid lock is the best that exists, not a guarantee.

---

## 1. Inventory

What each locked thing protects, how its key gets there, and who could hold a copy of the
locked bytes today. "Registry" means the database on Railway; "B2" the off-site backup bucket.

| # | Thing | What it protects | Key exchange or wrap | Who could copy the locked bytes | Kept for | Harvest risk |
|---|---|---|---|---|---|---|
| 1 | **Lab report files** (`bboard-ui/src/veilcore/lab-results.ts`; registry `lineage/lab-results.mjs`) | The lab's actual report and numbers for a sample | `age` X25519 recipient. Identity = HKDF-SHA256(record secret, `veilcore:v1:lab-results:x25519[:<transfer id>]`) | Registry, Railway, every registry backup in B2 (lab files are copied there once, `backup.mjs`), anyone the report passes through | 180 days at the registry; B2 copy until the bucket's lifecycle rule removes it | **High.** The most sensitive content VeilCore carries |
| 2 | **Pre-purge registry backups** (`veilcore-api/backup.mjs`, `docs/rotate-backup-key.md`) | Every record in plain text, from before sealing and the purge | `age` X25519 to the operator's backup key | B2 (Backblaze), anyone who ever held a read key to the bucket | Object Lock 30 days, then until the lifecycle rule deletes them (the README says without one "they simply pile up") | **High, if any still exist.** Destroying the old private key stops a key thief, not someone who copied the file and waits for a break |
| 3 | **Deal messages** (`deal.ts`, `deal-client.ts`; registry `lineage/deals.mjs`) | Licence terms, statements, payment confirmations between the two sides | Each side's Ed25519 deal key converted to X25519; static-static DH; HKDF `veilcore/deal/v1` → AES-256-GCM | Registry, Railway, every backup. **Both public keys are at the registry too** (they are the invite nonces), so a copy is complete | The licence's life (years) | **High.** Everything needed to open them sits in one place |
| 4 | **VeilCore-run exit bundles** (`veilcore-run/src/box.ts` `sealTo`, `partner-keys.ts`; `docs/MANAGED.md`) | A partner's record secrets and keys when they leave | ECIES: fresh X25519 ephemeral, HKDF-SHA256 `veilcore-run/v1/sealed`, AES-256-GCM. Recipient key is in the header | Whatever carries the file (email, a file share), and wherever the partner keeps it | Indefinitely, outside our control | **High value, rare.** A record secret also re-derives that plant's lab-report keys (row 1) |
| 5 | **TLS to the registry, relay and sponsor** (`*.up.railway.app`) | The holder key (`x-holder-key`, the only credential), write and read tokens, public fields, metadata | Whatever TLS the edge negotiates; X25519 unless it offers X25519MLKEM768 | Any network observer on the path | As long as someone records traffic | **Medium-high.** A recorded holder key still works later unless rotated |
| 6 | **Current registry backups** | Public fields, the delivery graph by handle tag, timings, digests; private parts are already AES-sealed by the holder's vault key | `age` X25519 to the operator's key | B2 | Lock plus lifecycle | **Medium.** Metadata only, but it contains rows 1 and 3 |
| 7 | **TLS to veilcore.org** (Vercel) | The page's code; nothing secret is sent to the site | Vercel turned on post-quantum key exchange for HTTPS on 7 Nov 2025 ([Vercel changelog](https://vercel.com/changelog/post-quantum-crypto)) | — | — | **Low.** Already hybrid on Vercel's side, per Vercel; check from the Mac (section 5) |

A note on rows 1, 2 and 6: `age` mixes the recipient's public key into its key derivation, so a
future attacker also needs that public key, not just the file. That is not a protection to rely
on. A lab lock travels in a lab code that people send by email or chat, and older codes took it
from the record the registry served; the backup key's public half sits in Railway's settings.

## 2. What is already safe, and why

| Thing | Lock | Why a curve break doesn't open it |
|---|---|---|
| Sealed records and licences (`vault.ts`) | AES-256-GCM with the vault key: 32 random bytes, never sent | No public key anywhere. Grover's algorithm at best halves the key length in bits: 2^128 work, still out of reach |
| Sealed offers and custody details (`vault.ts` `OfferBox`, `transfers.ts`) | AES-256-GCM, key in the delivery code | Symmetric. The code is as safe as the channel it was sent on, which is outside VeilCore's maths either way |
| Local backup file (`backup.ts`) | PBKDF2-SHA256, 600,000 iterations, then AES-256-GCM | Only the password opens it. A quantum computer doesn't make each password guess cheaper in any practical way; the password's strength is what counts, as today |
| Passkey copy and account copy slots (`passkey-backup.ts`, `account-copy.ts`) | WebAuthn PRF output (an HMAC inside the authenticator), HKDF, AES-256-GCM | PRF is symmetric. The passkey's own login signature (usually P-256) would break, but that only logs in; it never locked anything |
| Recovery sheet (`recovery-code.ts`) | 135-bit random code, HKDF, AES-256-GCM | Symmetric, above the 128-bit level NIST treats as enough against quantum search |
| Account key at rest (`account-key-store.ts`) | Non-extractable WebCrypto AES and HMAC keys in IndexedDB | Symmetric, and never leaves the device |
| Partner custody vault (`veilcore-run/src/box.ts`, password box) | scrypt (N = 2^17), AES-256-GCM | Symmetric |
| Maintenance key file (`bboard-cli/src/age-key.ts`) | `age` passphrase (scrypt) recipient | Symmetric; no X25519 stanza |
| Holder key at rest at the registry (`veilcore-api/holder-key.js`) | SHA-256 digest of 32 random bytes | A hash of a random value; not reversible |

**The pattern:** where both ends are the same person (or the key is handed over in person or in
a code), VeilCore already uses symmetric keys, and those survive. The risky items are exactly the
ones where a key has to reach *someone else* through the registry or a file.

## 3. The hybrid design

### 3.1 The construction: X-Wing

Use **X25519 + ML-KEM-768 combined as X-Wing**
([draft-connolly-cfrg-xwing-kem-11](https://www.ietf.org/archive/id/draft-connolly-cfrg-xwing-kem-11.html)):

```
ss = SHA3-256(ss_MLKEM || ss_X25519 || ct_X25519 || pk_X25519 || "\./" "/^\")
```

Public key 1,216 bytes, ciphertext 1,120, private key a 32-byte seed, shared secret 32. It is
the same KEM HPKE's post-quantum draft lists as **MLKEM768-X25519**, codepoint 0x647a
([draft-ietf-hpke-pq-05](https://datatracker.ietf.org/doc/html/draft-ietf-hpke-pq-05); the X-Wing
draft requests the same codepoint). The shared secret holds if *either* X25519 or ML-KEM-768
holds. ML-KEM itself is final: FIPS 203, August 2024.

### 3.2 Libraries and their status

| Library | What it gives | Status |
|---|---|---|
| **`age-encryption`** (typage, the JavaScript `age`, by the author of `age`) | Hybrid identities and recipients: `generateHybridIdentity()`, `identityToRecipient()` ([README 0.3.1](https://jsr.io/@age/age-encryption/0.3.1/README.md)) | **Already pinned at 0.3.1 in both repos**, and its lockfile entry already pulls `@noble/post-quantum` 0.5.4. Its README names no independent audit |
| **`age` (Go)** | Native hybrid keys since **v1.3.0**: recipients `age1pq1…`, identities `AGE-SECRET-KEY-PQ-1…`, stanza `mlkem768x25519`; `age-plugin-pq` for older versions. A hybrid recipient "can only be used along with other post-quantum recipients" ([pkg.go.dev, v1.3.2](https://pkg.go.dev/filippo.io/age@v1.3.2)) | Stable release. Lets anyone open a hybrid file with the free `age` tool, as today |
| **`@noble/post-quantum`** | ML-KEM-512/768/1024, and `ml_kem768_x25519` (X-Wing), tested against xwing-kem-10 and the CFRG hybrid-KEM drafts ([README 0.7.1](https://jsr.io/@noble/post-quantum/0.7.1/README.md)) | **Not independently audited.** 0.6.1 was self-audited by its author in April 2026; it does not claim constant-time execution. Our tree has 0.5.4, before that self-audit, and typage's `^0.5.3` range can't move past 0.5.x without a typage release |
| **WebCrypto in browsers** | `encapsulateKey` / ML-KEM, per the WICG draft ([Modern Algorithms](https://wicg.github.io/webcrypto-modern-algos)) | A community draft, not a W3C standard. Chrome and Edge from 155 and Firefox 163; Safari (including iOS) not yet ([caniuse](https://caniuse.com/mdn-api_subtlecrypto_encapsulatekey)). No X-Wing. So pages must carry the JavaScript implementation |
| **Node.js WebCrypto** | ML-KEM since 24.7.0; hybrid KEMs since 24.22.0 / 26.10.0 ([Node docs](https://nodejs.org/download/nightly/v27.0.0-nightly202610259b5d938fad/docs/api/webcrypto.md)) | The registry runs 24.11.1: ML-KEM yes, hybrid no. Not needed if typage is used |
| **OpenSSL 3.5+** | ML-KEM ([EVP_KEM-ML-KEM](https://docs.openssl.org/3.5/man7/EVP_KEM-ML-KEM/)) and the X25519MLKEM768 TLS group ([EVP_PKEY-MLX-KEM](https://docs.openssl.org/master/man7/EVP_PKEY-MLX-KEM)) | Final. An independent second implementation for tests, and the tool to check TLS (section 5) |

**Recommendation:** use `age` hybrid recipients wherever VeilCore already uses `age` (rows 1, 2,
6), and wherever a file is sealed to someone (row 4). Use `@noble/post-quantum`'s
`ml_kem768_x25519` directly only for deals (row 3), which aren't files. Cross-check both in tests
against the Go `age` and OpenSSL 3.5.

### 3.3 Sizes and speed

| | X25519 today | Hybrid |
|---|---:|---:|
| Public key (lock) | 32 B; `age1…` is 62 characters | 1,216 B; `age1pq1…` is about 2,000 characters |
| Per-recipient overhead in a file | about 200 B of header | about 1.6 KB of header (age-inspect's own example: 1,627 B header) |
| Deal setup | 32 B per side | +1,216 B public key and +1,120 B ciphertext per side, once per deal |
| Speed (noble, Apple M4) | — | about 4,600 key generations and 4,000 shared secrets a second |

A lab report grows by about 1.5 KB (the limit is 15 MB); a backup by the same. Speed is not an
issue anywhere. The one real cost is the **long lock**: about 2,000 characters will not fit a
typed lab code or a QR code (3.4).

### 3.4 Each risky item

**Lab reports (row 1).**
- New deliveries get a hybrid lock: a 32-byte X-Wing seed = HKDF-SHA256(record secret,
  `veilcore:v2:lab-results:mlkem768x25519:<TRANSFER ID>`), encoded as an
  `AGE-SECRET-KEY-PQ-1…` identity. This assumes, as we expect, that `age`'s hybrid identity is
  that 32-byte seed; the build checks it against the C2SP age spec. The record secret is
  already in the breeder's backup, so nothing new to back up.
- The lock travels **only inside the sealed offer** (AES, opened by the delivery code's key),
  which the code already supports. The lab code keeps its length. The rule from round 3 stands:
  never from the registry.
- The lab's browser encrypts to it with typage's `Encrypter`. One recipient per file, so the
  rule against mixing classical and hybrid recipients is never hit.
- The breeder's browser adds every identity it might need (hybrid per delivery, X25519 per
  delivery, X25519 per plant), as it already does for two.
- The registry checks only that a file starts with `age-encryption.org/v1`, so it needs no
  change.

**Registry backups (rows 2, 6).**
- A new operator key made on Hunter's Mac with `age` 1.3+ (its post-quantum key option,
  `age-keygen -pq`; confirm with `age-keygen -h`), following
  `docs/rotate-backup-key.md`. `BACKUP_AGE_RECIPIENT` becomes the `age1pq1…` line.
- `backup.mjs` accepts `^age1[0-9a-z]{20,}$`, which an `age1pq1…` string matches, and checks the
  key with `new Encrypter().addRecipient()`, which typage 0.3.1 should accept for a hybrid
  recipient. A test must prove both, and that `restore.mjs` opens a hybrid file, before the key
  is set. The ~2,000-character value has to survive Railway's variable field intact.
- Backup names already carry the key id, so the bucket shows which backups are hybrid.

**Deal messages (row 3).** Section 3.5.

**Exit bundles (row 4).** Seal new bundles with `age` to a hybrid recipient derived from the
partner's master (a new label, `veilcore-run/v2/bundle-key`, giving the 32-byte seed). The format
becomes plain `age`, which a partner's developer can open with the standard tool instead of the
custom ECIES in `MANAGED.md`. A `veilcore-run/box/1` bundle still opens.

**TLS (row 5).** Not VeilCore's code. Current Chrome, Edge and Firefox offer X25519MLKEM768 by default; the
question is whether Railway's edge accepts it (not found documented). If it doesn't, put the
registry behind an edge that does, on a VeilCore domain. Either way, VeilCore's own design limits
the damage: the holder key is the only secret on the wire, and it opens no sealed record.

### 3.5 Deals: how the 6-digit code covers an ML-KEM key

Today each side's contribution to the code is its Ed25519 deal public key, and the commit-then-
reveal exchange (`license-invites.ts`) means a registry that swaps a key changes the code the two
people read to each other.

**Version 2:**

1. Each side makes, alongside its Ed25519 deal key, an X-Wing key pair (seed derived from the
   deal secret with HKDF, label `veilcore/deal-xwing/v2`).
2. Its contribution becomes `c = SHA-256("veilcore/deal-contribution/v2" || ed25519_pub ||
   xwing_pub)`: still 32 bytes, so the commit, the reveal and `licenseCode` keep their shape.
   The full keys travel beside it in the invite (two new optional fields, about 1.6 KB of
   base64url each), and each side checks they hash to `c`. **A swapped ML-KEM key changes the
   code, exactly as a swapped Ed25519 key does today.**
3. After the codes match, each side encapsulates to the other's X-Wing key and posts the
   ciphertext (signed with its Ed25519 deal key, as messages are today).
4. The channel key comes from all three secrets:
   `HKDF-SHA256(ikm = X25519_DH || ss_issuer→licensee || ss_licensee→issuer,
   salt = SHA-256(commitment || issuer record || both ciphertexts), info = "veilcore/deal/v2")`,
   split into the AES key, the channel id and the write token as in v1.

Why both directions: each side's key includes a secret it made itself and sent to a key the code
proved. A registry that swaps a ciphertext learns at most one of the three inputs and the deal
just fails to open. A future attacker who breaks curves gets the DH secret and nothing else. One
direction would already stop "harvest now"; two directions also stop someone who could break
curves secretly *today* and controls the registry. The pattern (concatenate the classical and
post-quantum secrets, then one KDF) is the one hybrid TLS and Signal's PQXDH use
([PQXDH](https://signal.org/docs/specifications/pqxdh/)), but **this exact composition is ours,
so it is the first thing the cryptographer reviews (section 6) before any of it is built.**

Registry changes: the two optional invite fields, and a deal message type for the ciphertexts
(1,120 B each, well inside the 16 KB message limit).

### 3.6 Versioning, so old data stays readable

- **`age` files describe themselves:** each stanza names its type (`X25519` or
  `mlkem768x25519`). Files are never rewritten; readers load every identity they hold.
- **Labels carry the version:** `veilcore:v2:lab-results:mlkem768x25519:…`,
  `veilcore/deal/v2`, `veilcore-run/v2/bundle-key`. A v1 key is never derived under a v2 label or
  the reverse.
- **Deals:** an invite either has the v2 fields or it doesn't. A v1 deal stays v1 for life
  (unless moved, section 4); both sides' browsers open both.
- **Backups:** the file name's key id says which key opens it; `restore.mjs` takes both
  identities during the switch.
- **Bundles:** `veilcore-run/box/1` (ECIES) opens as before; new bundles are `age`.
- **Downgrade:** once a breeder's browser makes hybrid locks, it never puts an X25519 lock in a
  new sealed offer. A lab browser that sees a hybrid lock never falls back. After the switch, a
  page refuses to make a new classical deal.

## 4. Migration

**New data first.** Every new lab lock, deal, backup and bundle goes hybrid. That stops the pile
from growing, which is most of the value.

**Old copies can't be un-copied.** Re-locking a file we hold doesn't touch a copy someone already
took. What re-locking *does* gain: copies made **from now on** (future backups, a future registry
breach, a future bucket leak) are hybrid. What *deleting* gains: no future copy at all. So for old
data, deleting beats re-locking, wherever we can delete.

| Item | Re-lock? | Why |
|---|---|---|
| Pre-purge backups | **No: delete.** Confirm the bucket's lifecycle rule exists and that every backup from before the purge is gone, not only that the old key was destroyed | They hold every record in plain text, and key destruction does nothing against a stored copy plus a future break |
| Current backups | No. New ones are hybrid; old ones expire through the lock and lifecycle | Nothing gained by rewriting files that are about to be deleted |
| Lab reports at the registry | No. They are deleted after 180 days. Consider shortening that, and the B2 copy's life | Re-locking would need the breeder's browser to open and re-upload each one, to protect copies that age out anyway |
| Live deals | **Yes, optional, for long licences.** Both sides open a "move to v2" step: a v2 handshake (code read again), old messages re-posted inside v2, then the v1 channel deleted at the registry | Licences last years, so their v1 channels would sit in every backup for years |
| Exit bundles already handed over | Can't. Offer a fresh hybrid bundle on request | They are with the partner |
| Recorded TLS | Can't. Rotating a holder key ends what a recorded one is worth | The holder key is a bearer secret |

## 5. Order, and rough size

| Step | What | Rough size |
|---|---|---|
| 0 | **Housekeeping, no code.** Confirm the B2 lifecycle rule and that pre-purge backups are deleted. Check TLS from the Mac: `openssl s_client -groups X25519MLKEM768 -connect veilcore-api-production.up.railway.app:443` (OpenSSL 3.5+, e.g. Homebrew), same for the relay, the sponsor and veilcore.org; it fails if the host doesn't offer the hybrid group. (This could not be checked from the build machine: its network goes through a proxy.) | An hour |
| 1 | **Registry backups to a hybrid `age` key.** A test that `backup.mjs` and `restore.mjs` take an `age1pq1…` key and open its file; then the key rotation runbook with `age-keygen -pq`. Registry repo, so Hunter merges and sets the key | About a day |
| 2 | **Lab reports.** Hybrid lock derivation, lock in the sealed offer only, breeder opens all three kinds, e2e run of a hybrid report, cross-check with Go `age`. Strings: probably none new; any that are new, in five languages | One to two weeks |
| 3 | **Exit bundles to `age` hybrid.** `veilcore-run`, `MANAGED.md` updated | Three to five days |
| 4 | **TLS.** If Railway doesn't offer hybrid: put the registry, relay and sponsor behind a VeilCore domain on an edge that does | Small to medium; ops, mostly Hunter |
| 5 | **Deals v2.** After the cryptographer has signed off 3.5: invite fields, ciphertext messages, v2 key schedule, the "move to v2" step, five languages, outside review | Three to four weeks, plus the review |
| 6 | **Library hygiene.** Move to a `@noble/post-quantum` past its April 2026 self-audit (needs a typage release that allows it; lockfile edited by hand, one entry), and fund or wait for an independent audit | Small, but waits on others |

Steps 1 to 3 need no new cryptography from VeilCore: they use `age`'s hybrid recipients as
shipped. That is why they come first.

## 6. The outside cryptographer, and the line

**What needs an outside cryptographer:**

- the deal v2 key schedule (3.5): what goes into the HKDF, the transcript in the salt, two
  ciphertexts versus one, and how the code binds the keys;
- deriving X-Wing seeds from existing secrets with HKDF (record secret for lab locks, deal
  secret, partner master), and that one seed's use never weakens another's;
- that `age`'s hybrid identity is the 32-byte seed we think it is, and that deterministic
  per-delivery identities are fine with its stanza;
- the library choice while `@noble/post-quantum` has no independent audit and doesn't claim
  constant time (it runs in the holder's own browser on their own key, which limits the
  timing risk, but the cryptographer says whether that is enough);
- ML-KEM-768 versus 1024 for records meant to matter for 25 to 30 years (X-Wing fixes 768,
  NIST category 3);
- the downgrade rules in 3.6.

**The line: no home-made crypto.**

- Use X-Wing and `age`'s `mlkem768x25519` stanza exactly as specified. No own combiner, no own
  KEM, no own HPKE, no own file format where `age` already fits.
- The one composition VeilCore would add (deals, 3.5) is not built until it is reviewed. If the
  review prefers a standard protocol to it, use that.
- Every new format gets test vectors cross-checked against a second implementation (Go `age`,
  OpenSSL 3.5).
- Don't drop X25519: hybrid means both.
- Don't change the contracts (`contract/`). Nothing here touches them.
- Don't say "quantum-proof" or "quantum-safe" anywhere public. Say what is locked with what.
- If lattices fall as well as curves (the scenario in
  [hash-based-signatures.md](hash-based-signatures.md)), only section 2's symmetric locks hold.
  The honest answer for rows 1 to 6 then is keeping less: shorter retention and prompt deletion,
  which are worth doing anyway.
