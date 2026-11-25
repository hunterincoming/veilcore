# Hash-based signatures for labs (and later holders)

**Design, not built. Prepared in case current signatures are broken; nothing is broken publicly
as of 25 Nov 2026.**

Nothing here changes the contracts, the record format or any page. It says what VeilCore would
do, in what order, if the public-key cryptography it uses today stopped being safe.

## In plain words

**Why this exists.** In late November 2026 there was unverified public talk that attacks on
factoring, elliptic curves and lattice problems may already exist. Nothing has been shown in
public. This note is the plan we would pick up if something is.

**The short version.** VeilCore's dates would survive. Lab signatures would not, unless we act
before the break. So:

1. **Dates survive.** A record's date rests on SHA-256 and on Bitcoin's proof of work (the
   OpenTimestamps stamp on every batch). Neither uses a signature. Breaking elliptic curves,
   RSA or lattices does not let anyone move a Bitcoin-stamped date.
2. **Signatures don't.** A lab's signature today is Ed25519 (the attestation) plus Schnorr over
   Jubjub (what the claims contract checks on Midnight). Both are elliptic-curve. After a break,
   anyone could make a "lab signature" that checks.
3. **The fix is a second signature that only uses hash functions:** SLH-DSA, the NIST standard
   (FIPS 205). It rests on the same thing our dates already rest on. A lab would sign with both
   for a while, the old key and the new one.
4. **Old signatures keep their value if they were dated before the break.** A signature that was
   provably on Bitcoin before anyone could forge one is genuine. So we stamp every signature,
   withdrawal and timestamp token into Bitcoin, at least once a year. A forger after the break
   can't put a new fake into an old stamp.
5. **Timing is the whole game.** The lab's new hash-based key has to be tied to its old key
   *before* the old key can be forged. After the break, the old key can't vouch for anything.
   So the two cheap steps (the Bitcoin re-stamp and enrolling the new key) are worth more the
   earlier they happen. The full rebuild can wait for a trigger.

**What we'd lose for a while.** Midnight checks lab signatures on chain with Jubjub only, and its
own proofs rest on elliptic-curve maths. After a break, a claim on Midnight ("not detected",
"at most 95 % similar") would no longer show the lab signed it by itself. The holder would show
the lab's result file instead, which carries the hash-based signature. Showing one exact value
without the others still works with hashes alone; proving a range ("at most 95 %") without
showing the value does not, until a hash-based proof system replaces today's.

**What we would not do.** Write our own crypto, use a library that hasn't been reviewed, keep
signing state in a browser, or call anything "quantum-proof".

---

## 1. What survives and what doesn't

Assumption for this whole note: elliptic-curve discrete log (Ed25519, X25519, Jubjub, P-256,
BLS12-381), RSA and lattice problems (ML-KEM, ML-DSA) are all broken, by a quantum computer or
anything else. SHA-256, SHA-512 and AES-256 hold. Grover's algorithm at most halves their security
in bits; SHA-256 preimages stay around 2^128 work and AES-256 stays around 2^128.

| Piece | What it uses today | After a break | Why |
|---|---|---|---|
| A record's proof code (fingerprint) and its inclusion proof | SHA-256 (SPEC 4, 5) | **Survives** | Hash only |
| Bitcoin date (OpenTimestamps `.ots`, `bitcoin-headers.json` checked in `verify.html`) | SHA-256, Bitcoin proof of work | **Survives** | No signature anywhere on the path from the batch root to a block header. Bitcoin coins secured by ECDSA keys could be stolen, but the header chain's proof of work does not depend on them; rewriting old blocks still needs the work |
| Midnight anchor (batch root in a contract transaction) | Midnight consensus and transaction signatures (elliptic curve) | **Weakens** | With block-signing keys forgeable, an alternative Midnight history is no longer ruled out by cryptography. The same batch root is on Bitcoin, so the date stands on Bitcoin |
| RFC 3161 token (`proof/root.tst`) | The TSA's RSA or ECDSA signature (SPEC 3.2) | **Breaks**, unless the token itself was Bitcoin-stamped before the break (section 4) | Anyone could mint a token with any date |
| Lab signatures: attestations, receipts, report signatures, withdrawals | Ed25519 (SPEC 7; `attester-keys.ts`) | **Breaks** | Private key recoverable from the public key |
| Lab claims key, `proveAttested` | Schnorr over Jubjub (`claims-key.ts`, `contract/src/attest`) | **Breaks** | Same |
| Lab's key on its website (`lab-domain-keys.md`) | The key's Ed25519 claim; HTTPS (ECDHE, RSA/ECDSA certificates); DNS | **Weakens** | The claim signature is forgeable; the fetch can be intercepted |
| Midnight proofs (claims, licences, ownership) | PLONK with KZG commitments, pairing-friendly curve ([midnight-proofs](https://docs.rs/crate/midnight-proofs/0.8.0/source/README.md); [the switch to BLS](https://docs.midnight.network/blog/tags/zkp)) | **Breaks for soundness** | A false proof could be made to verify. Whether past proofs stay *private* depends on the proof's zero-knowledge property, which in PLONK-style systems usually does not rest on the hard problem; a cryptographer should confirm this for Midnight's system |
| Holder key (`x-holder-key`) | 32 random bytes, a bearer secret (`holder.ts`) | **Survives at rest**; **exposed in transit** | Not a public key. But it travels over TLS, and TLS key exchange is elliptic-curve: someone who recorded traffic could later read it |
| Vault key, local backup file | AES-256-GCM, PBKDF2-SHA256 (`backup.ts`) | **Survives** | Symmetric |
| Passkey copy of a backup | WebAuthn PRF output (HMAC inside the authenticator), then HKDF | **The copy survives**; the passkey's own P-256 login signature does not | PRF is symmetric |
| Holder's ledger identity, licences, deals | Midnight identity and proofs; deal messages Ed25519 + X25519 (`deal.ts`) | **Breaks** | Elliptic-curve |
| Registry data at rest | SQLite on Railway; records' private parts already locked by the holder's vault key | **Survives** for what is vault-locked | Symmetric |
| Registry off-site backups | age to an X25519 recipient (`veilcore-api/backup.mjs`) | **Exposed later** | "Harvest now, decrypt later": a copy taken today opens after a break |
| Lab report files locked to a breeder | age X25519 (`lab-results.ts`) | **Exposed later** | Same |

**The urgent lesson is not signatures.** A signature can be replaced on the day it breaks,
provided its past uses were dated in time (section 4). Encryption cannot: anything stored today
under X25519 (lab report files, registry backups, deal secrets, recorded TLS) is readable after a
break, retroactively. Hybrid ML-KEM + X25519 does not help in this note's scenario, because it
assumes lattices fall too; only symmetric keys survive. That deserves its own note; it is listed
here so it isn't lost.

## 2. SLH-DSA, the facts

**What it is.** SLH-DSA is the stateless hash-based signature standard, FIPS 205 (published
August 2024), standardised from SPHINCS+
([FIPS 205](https://csrc.nist.gov/pubs/fips/205/final)). Its security rests only on the hash
function. It is the conservative choice among NIST's post-quantum signatures, and the only one
whose security does not rest on lattices: ML-DSA (FIPS 204) and Falcon are lattice schemes, so
they are no answer in this scenario.

**Parameter sets.** Twelve: SHA2 or SHAKE, at security categories 1, 3 and 5 (128, 192, 256),
each in a small ("s") or fast ("f") form. Sizes in bytes
([noble-post-quantum README](https://jsr.io/@noble/post-quantum/0.7.1/README.md), matching FIPS
205):

| Set | Public key | Private key | Signature |
|---|---:|---:|---:|
| SLH-DSA-128s | 32 | 64 | 7,856 |
| SLH-DSA-128f | 32 | 64 | 17,088 |
| SLH-DSA-192s | 48 | 96 | 16,224 |
| SLH-DSA-192f | 48 | 96 | 35,664 |
| SLH-DSA-256s | 64 | 128 | 29,792 |
| SLH-DSA-256f | 64 | 128 | 49,856 |

For comparison, Ed25519 is 32 / 32 / 64. The key is as small as today's; the signature is
about 120 to 780 times bigger.

**Speed.** Measured by the noble authors in JavaScript on an Apple M4
([README](https://jsr.io/@noble/post-quantum/0.7.1/README.md)):

| Set | Key generation | Sign | Verify |
|---|---:|---:|---:|
| SHA2-128s | 140 ms | 1,068 ms | 1.1 ms |
| SHA2-128f | 2 ms | 47 ms | 3 ms |
| SHA2-192s | 209 ms | 2,114 ms | 1.9 ms |
| SHAKE-128s | 673 ms | 5,114 ms | 5.2 ms |

**On a phone:** not measured. A mid-range phone usually runs JavaScript a few times slower than
an M4, so expect roughly 3 to 5 seconds to sign with SHA2-128s and a few milliseconds to verify.
That is an estimate; the build measures it on real phones (section 5). Verifying is fast
everywhere, which is what matters for `verify.html` and the check pages. Signing is slow but
rare: once per result, by a lab, usually at a desk. SHA2 sets are about five times faster than
SHAKE in JavaScript, and SHA-256 is already the one hash VeilCore rests on.

**Libraries.**

- **noble-post-quantum** (`@noble/post-quantum`, JavaScript, by Paul Miller, who also wrote the
  `@noble/curves` and `@noble/hashes` VeilCore already uses). Implements all twelve SLH-DSA sets
  with FIPS 205 contexts and the pre-hash variant. Audit status per its README: **not
  independently audited**; version 0.6.1 was self-audited by the maintainers in April 2026
  ([README](https://jsr.io/@noble/post-quantum/0.7.1/README.md)). The noble curves and hashes
  libraries have had independent audits; this one has not yet.
- **OpenSSL 3.5 and later** implement SLH-DSA
  ([EVP_PKEY-SLH-DSA](https://docs.openssl.org/3.5/man7/EVP_PKEY-SLH-DSA)), and **Node.js 24**
  lists SLH-DSA key types (for example `slh-dsa-sha2-128s`) in `node:crypto` when built with
  OpenSSL 3.5 ([Node.js crypto docs](https://nodejs.org/download/release/v24.18.0/docs/api/crypto.html)).
  That gives an independent second implementation for offline checking: a Node script or an
  `openssl pkeyutl -verify` command.
- **WebCrypto:** SLH-DSA is in the WICG "Modern Algorithms in the Web Cryptography API" draft, a
  community report, not a W3C standard
  ([draft, 23 Oct 2026](https://wicg.github.io/webcrypto-modern-algos)). Chrome's developer trial
  covers ML-KEM and ML-DSA behind a flag (`webcrypto-pqc`, about milestone 150), not SLH-DSA
  ([blink-dev, 3 Jun 2026](https://groups.google.com/a/chromium.org/g/blink-dev/c/WKF2N040tGM)).
  No browser ships SLH-DSA in WebCrypto today, so a page that checks it must carry a JavaScript
  implementation.

**Maturity.** FIPS 205 is final. The underlying construction has been public and attacked since
SPHINCS (2015). NIST's draft SP 800-230 (April 2026) adds six smaller-signature sets limited to
2^24 signatures per key, "not approved for general-purpose use"
([NIST news, 13 Apr 2026](https://www.nist.gov/news-events/news/2026/04/nist-releases-initial-public-draft-ipd-sp-800-230-additional-slh-dsa));
worth revisiting when final, not before.

## 3. Design

### 3.1 Dual signing during the transition

Keep every signature made today, and add one SLH-DSA signature beside it.

- **Ed25519 attestations stay** (SPEC 7). They are what every reader checks today.
- **Jubjub stays** for `proveAttested`. The claims contract is frozen and deployed; it checks
  only Jubjub, and the contracts are not to be changed.
- **SLH-DSA is added** over the same thing each existing signature covers:
  - a lab result (v1 or v2): the record commitment's 32 raw bytes (the value the lab's Jubjub
    signature covers, SPEC 4.5 and 11.12);
  - an attestation, receipt or report signature, and a withdrawal: the same canonical payload
    the Ed25519 signature covers (SPEC 7, 7.1).
- **Separate contexts.** FIPS 205 takes a context string of up to 255 bytes. Each use gets its own:
  `veilcore:lab-result:slh:v1`, `veilcore:attestation:slh:v1`, `veilcore:retraction:slh:v1`.
  A signature for one use then never checks as another. Pure SLH-DSA (not the pre-hash form):
  the messages are already a hash or small canonical text.
- **Set: SLH-DSA-SHA2-128s**, randomised (hedged) signing, the FIPS 205 default. Small signature,
  fast verify, the same hash as everything else. Category 1 is NIST's level for AES-128 and is
  believed to hold against quantum attack. Whether 25-to-30-year plant rights justify
  SHA2-192s (16 KB, about twice as slow) is a question for the outside cryptographer (section 5).
- **Both or one, by date.** While nothing is broken, a reader reports the Ed25519 result as today
  and shows the SLH-DSA one beside it. Once VeilCore publishes a **cutoff date** (section 5), a
  classical signature counts only if it is provably dated before the cutoff (section 4);
  anything after the cutoff needs a valid SLH-DSA signature. Stripping the SLH-DSA signature
  then gains an attacker nothing: the item just reads as unsigned.

### 3.2 Tying the new key to the lab

This is the step whose timing matters.

- **Derived, not a second backup.** The SLH-DSA key is derived from the attester key's seed, the
  way the claims key is (`claims-key.ts`): HKDF-SHA256(seed, info `veilcore:slh-dsa-key:v1:<n>`)
  gives the three n-byte seeds FIPS 205 key generation takes. The lab's existing backup covers
  it. Recovering an Ed25519 or Jubjub private scalar after a break does not reveal the seed (the
  scalar is a hash output of the seed), so the derived key stays secret. The cryptographer
  confirms this.
- **Cross-signed both ways.** An enrolment statement names the lab's Ed25519 key, the SLH-DSA
  public key, the set and `validFrom`. The Ed25519 key signs it (the lab vouches for the new key)
  and the SLH-DSA key signs it (whoever holds the new key chose this lab), the same owner-proof
  pattern as the claims key.
- **Dated on Bitcoin.** The enrolment is an attestation on the registry, so it goes into the
  next re-stamp (section 4). **An enrolment dated before the cutoff is what carries the lab's
  identity across the break.** One made after it can only be vouched for out of band (the lab's
  website, a body's list), and those channels are weaker after a break too.
- **On the lab's website.** `veilcore-lab.json` and did.json gain an entry with an algorithm
  field (`"alg": "slh-dsa-sha2-128s"`): the 128s public key is 32 bytes, the same length as an
  Ed25519 key, so the algorithm has to be stated, never guessed from length. The website listing
  should be re-stamped too.

### 3.3 Where the signature lives

Nothing already signed changes. The new signature sits next to what it signs.

- **Lab result file (v2).** `lab-result.json` is inside the record's `files` and covered by the
  commitment; it is not touched. The result file gains a sibling entry, outside the commitment:
  `pqSignatures: [{ alg, context, publicKey, signature }]`, signature as base64 (about 10.5 KB
  per 128s signature; hex would be 15.7 KB).
- **Attestations** (SPEC 3.3, 7): optional `pqSignature`, `pqSignatureAlgorithm`, `pqPublicKey`,
  outside the signed material like today's `signature`. SPEC 7's "signed material is,
  exhaustively" stays true.
- **Evidence bundle.** `lab/signatures.json` carries the same fields. A new
  `proof/restamp/` folder holds the re-stamp proofs (section 4) for the batch, its RFC 3161
  token and each lab signature.
- **Claim links.** About 10.5 KB does not fit a QR code. A claim link keeps naming the
  `proveAttested` transaction as today; the hash-based signature reaches the checker in the
  result file the holder shows, which `/check-claim` already takes.
- **Sizes in practice.** A 100-row CSV run adds about 1 MB of signatures. A bundle grows by
  about 10 KB per lab signature. Both are fine.

### 3.4 How verify.html and the offline checkers check it

- **`verify.html`.** WebCrypto has no SLH-DSA, so the page carries a pinned copy of
  noble-post-quantum's SLH-DSA verifier (verify only, SHA2 sets only), inlined the way the SDK's
  `canonical.js` is today, its SHA-256 listed in the release manifest. The page's
  Content-Security-Policy still forbids every request. It reports each SLH-DSA signature as
  valid, invalid, or "not checked here", and states the re-stamp date when there is one.
- **A second, independent check.** README.txt gives the command for OpenSSL 3.5+
  (`openssl pkeyutl -verify` with the context set) and a short Node script using `node:crypto`.
  Two implementations from different authors agreeing is worth more than either alone.
- **`verify.py`** (SDK evidence package): Python's standard library has no SLH-DSA. Options to
  weigh in the build: a vetted package, or calling OpenSSL. Until then it says "not checked
  here".
- **Tests.** NIST's ACVP vectors for SLH-DSA, run against both noble and OpenSSL, plus
  VeilCore's own vectors computed from the spec text, as for SPEC 11.12.

### 3.5 What can't be checked on Midnight, and what that means

- **Midnight cannot check SLH-DSA on chain.** One SLH-DSA-128s verification is thousands of hash
  calls; SPEC 4.5 notes one SHA-256 block already costs about two thousand circuit rows. The
  claims contract is frozen anyway.
- **So after a break, `proveAttested` stops meaning "a lab signed this".** Anyone could make a
  Jubjub signature for a lab's key and publish a claim. The check page would then name a lab on
  a claim only if it is also shown that lab's SLH-DSA signature over the same commitment
  (in the result file), or if the claim's own transaction is provably dated before the cutoff.
- **Midnight's own proofs lose soundness.** Every Midnight claim (`proveValue`, `proveRange`,
  `proveDistinct`, `proveUnchanged`) becomes unreliable after the cutoff.
- **What still works with hashes only.** Showing one exact value: the holder gives the value, its
  salt, the other fifteen leaves, the schema id and the JSON digest; the checker recomputes the
  field-set root and the commitment (all SHA-256, SPEC 4.5) and checks the lab's SLH-DSA
  signature on it. Each salt is derived per slot, so the other values stay hidden. No format
  change is needed.
- **What doesn't.** Proving a range or a count without showing the value ("at most 95 %",
  "0 conflicts" without the numbers). That needs a zero-knowledge proof built on hashes only
  (STARK-type systems). That is Midnight's to replace, not VeilCore's to build.

### 3.6 Key rotation, and stateless versus stateful

- **Stateless (SLH-DSA) versus stateful (XMSS, LMS).** XMSS (RFC 8391) and LMS (RFC 8554) have
  smaller signatures (a few KB) and faster signing, but each one-time key inside must never be
  used twice. Reusing one, by restoring a backup, opening two tabs, or signing on two devices,
  lets anyone forge. NIST's SP 800-208 approves them only where the signing state is kept
  reliably, in practice inside a hardware module
  ([SP 800-208](https://csrc.nist.gov/pubs/sp/800/208/final)). VeilCore's labs sign in browsers,
  restore backups and use several devices.
- **Recommendation: SLH-DSA everywhere. No stateful keys, not even for VeilCore's own signing.**
- **Rotation.** As SPEC 7.3 already describes: a key has `validFrom`, optionally `validUntil`
  and `status`. A new SLH-DSA key (next `<n>`) is enrolled by a statement signed by the old
  SLH-DSA key and the new one. Once a lab's first SLH-DSA key is enrolled before the cutoff, its
  whole rotation chain after that is hash-based and survives the break.
- **Signature count.** SLH-DSA-128s is specified for up to 2^64 signatures per key, so no lab
  will run out. (The SP 800-230 sets, at 2^24, would need counting; another reason to wait.)
- **Lost or stolen key.** Unchanged from SPEC 7.1 and 7.3: mark it compromised from a date. The
  re-stamp shows which signatures existed before that date.

### 3.7 Holders, later

Holders sign less than labs: deal messages (`deal.ts`, Ed25519), and, through Midnight, their
ledger identity. A holder's SLH-DSA key would be derived from the vault or record secret the same
way, so the existing backup covers it. Holder signing waits until labs are done: the ledger
identity, licences and deals depend on Midnight's own move to post-quantum proofs, which
VeilCore cannot do for it.

## 4. Re-stamping old evidence

**The idea.** A date is the strongest thing VeilCore has, and it survives the break. We use
it to protect everything that doesn't: once a year (and at once on a trigger), we stamp a
fingerprint of all of it into Bitcoin. This is the established method for long-term archives:
RFC 4998, Evidence Record Syntax, renews timestamps over archived data before their
algorithms weaken ([RFC 4998](https://www.rfc-editor.org/rfc/rfc4998)).

**What exists today.** Every hourly batch root is already stamped on Bitcoin, so record dates
are already covered. What is not on Bitcoin: lab signatures and the attestations that carry
them, withdrawals, key enrolments and name bindings, RFC 3161 tokens, the Midnight anchor
transactions, and the lab website listings the registry recorded. A lab's signature is over a
record that is dated; the signature itself is not.

**The re-stamp.**

1. The registry lists every item: each batch root; the SHA-256 of each `.ots` file, each RFC
   3161 token, each attestation as served (Ed25519 signature included), each withdrawal, each
   enrolment, each domain check it recorded, and each Midnight anchor's transaction id and block.
2. It sorts the list and builds a SHA-256 Merkle tree exactly as SPEC 5 builds a batch (same
   hashing, same proof form), with its own tag so a re-stamp root can't be mistaken for a batch
   root.
3. It stamps the root with OpenTimestamps (and an RFC 3161 token, for convenience), publishes the
   manifest, and the mirror (`scripts/mirror` in veilcore-api) copies it.
4. Each evidence bundle made after that carries, per item, its path to the re-stamp root and the
   re-stamp's `.ots` (section 3.3). `verify.html` checks the path offline and the Bitcoin headers
   as it does for a batch today.

**Privacy.** The manifest holds hashes only. A private lab signature's hash reveals nothing: the
item hashed includes a 64-byte signature nobody can guess. What the manifest does show is how many
items of each kind existed by each re-stamp, so it should list kinds no finer than that. The
cryptographer checks this with the construction.

**Why it preserves signatures.** A signature shown by a Bitcoin block to exist before anyone
could forge one was made by whoever held the key at the time. After the break, a forger can make
new signatures, but cannot put one into a Merkle tree already stamped into an old block; that
would need a SHA-256 second preimage or rewriting Bitcoin's proof of work. So an old Ed25519
lab signature, or an old RFC 3161 token, keeps its weight as long as its re-stamp predates the
cutoff. What it doesn't fix: a key stolen in the ordinary way before that date. That stays
SPEC 7.3's compromise rule.

**How often.** Annual is the floor. A stamp costs nothing (OpenTimestamps calendars are free),
and its value is entirely in being early, so monthly is better once anything is on watch, and an
immediate run is the first act on any trigger. A private attack would come before a public one;
a stamp from last month is better evidence than one from last year.

**If SHA-256 itself ever weakens** (not expected): the next re-stamp hashes the old items, and the
old re-stamps, under a second hash (SHA-512 or SHA3-256) as well, the RFC 4998 renewal. Nothing
needs to be re-signed for that.

## 5. Triggers, size and the outside cryptographer

**Ready (now).** This note. Nothing built.

**Worth doing without a trigger, in judgement:** the re-stamp (section 4). It is small, it adds
dates on Bitcoin for things that have none today (withdrawals, enrolments, tokens) whether or not
anything breaks, and it can only work if it is done before. Hunter decides.

**Build now when any of these happens:**

- a credible public demonstration of a practical attack, or a sharp drop in the cost of one, on
  elliptic-curve discrete log, factoring or lattice problems (a reduced-size break that clearly
  scales counts);
- emergency guidance from NIST, NCSC, BSI or ANSSI to move off those schemes on a short timeline;
- Bitcoin, Cardano or Midnight core developers starting an emergency signature migration;
- a body that could list lab keys (ICAR, ISTA, a variety office), or a lab, asking for
  post-quantum signatures;
- a dispute in which the long-term strength of a lab signature matters.

**On a trigger, in this order:**

| Step | What | Rough size |
|---|---|---|
| 1 | Run a re-stamp at once (built already, if done above) | Small: a registry job, the manifest format, bundle files, the `verify.html` path check. About a week |
| 2 | Enrol SLH-DSA keys: derivation, cross-signed enrolment, website entry with `alg` | Small to medium: about a week, plus a spec section and vectors |
| 3 | Dual signing on lab results, attestations, receipts, withdrawals; check pages, `verify.html`, OpenSSL and Node checks; every new string in five languages | Medium: about three to five weeks, then an outside review |
| 4 | Publish the cutoff date and the reading rules; switch check pages to them | Small once the policy is set; the policy is the hard part |
| 5 | Holder signatures, and Midnight claims replaced by hash-only disclosure where possible | Depends on Midnight's own plan; not VeilCore's to schedule |

Separately, and arguably first: move the X25519-locked data (registry backups, lab report files,
deal secrets) to symmetric-only protection, because that exposure is retroactive (section 1).

**What needs an outside cryptographer:**

- the parameter set (SHA2-128s or SHA2-192s) for records meant to matter for 25 to 30 years;
- deriving the SLH-DSA key from the existing attester seed, and that a broken Ed25519 or Jubjub
  scalar does not lead back to it;
- the enrolment protocol (cross-signing, contexts, what binds to what);
- the re-stamp construction, against RFC 4998;
- the cutoff policy: who sets the date, how far before a public break, and how readers apply it;
- whether Midnight's past proofs stay private after a break;
- the library choice, while noble-post-quantum has no independent audit.

## 6. What not to do

- **No home-made cryptography.** No own hash-based scheme, no own SLH-DSA code, no own
  Merkle-batch signing of many results under one signature without review. Use FIPS 205 as
  written, through a reviewed library.
- **Use audited libraries, and say plainly when one isn't.** noble-post-quantum is the natural
  fit and is not independently audited as of this note; that is the first thing to settle, or to
  pay for. Cross-check every signature in tests with OpenSSL 3.5+.
- **No stateful hash-based keys** (XMSS, LMS) anywhere a browser, a backup or a second device is
  involved.
- **No lattice scheme as the fix.** ML-DSA and ML-KEM are good choices in general, not in a
  scenario where lattices fall.
- **Don't drop Ed25519 or Jubjub** while nothing is broken: every reader and the claims contract
  depend on them.
- **Don't touch the contracts** (`contract/`). Nothing here needs a contract change.
- **Don't use the SP 800-230 sets** before they are final.
- **Don't say "quantum-proof" or "quantum-safe"** anywhere public. Say what is signed with what,
  and what is dated where.
