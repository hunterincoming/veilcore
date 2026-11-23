# Deploying contract v2 (team only)

**Status, 23 November 2026: NOT DEPLOYED. Contract v2 is built and tested on a computer only.**
This is the order of work for Hunter's Mac. The design is [docs/contract-v2.md](../contract-v2.md);
the code is `contract-v2/`. v1 (`contract/`) stays exactly as it is and stays the contract the
public site uses.

**Read section A before anything else.** Some steps below need tools that are not built yet.
Those steps are marked **BLOCKED** and say what they wait for. Do not work around a BLOCKED
step by hand: wait for the tool and its review.

Wording until the public switch: "deployed on mainnet for testing by VeilCore; not yet
independently reviewed; not for your records." Never "live" or "audited". No posts about v2.

---

## A. What is ready, and what is not

| Piece | State |
|---|---|
| v2 contracts (`contract-v2/src/*.compact`), compiler 0.36.1 | Built. Compiles without keys in CI. |
| Every v1 test suite, ported to runtime 0.21, against v2 | Passing. |
| Tests of every v2 change, attack tests, mutation pass | Passing; every mutant killed (section H). |
| v2's hashes equal v1's, byte for byte | Passing (`v1-pure-circuits.test.ts`, `interface.test.ts`). |
| Committee tool: key slot V3 or V4 | Built (`scripts/committee`), tested against the ledger's code. |
| Building the ZK keys | On Hunter's Mac only. Not done yet (section C). |
| A command that deploys v2 (preprod and mainnet) with a temporary key | **Not built.** v1's deploy (`bboard-cli`, `api/src/deploy-fragments.ts`) wraps v1's ledger-8 contract and cannot deploy a runtime-0.21 contract. |
| `npm run verify:deployment` for v2 | **Not built.** It checks v1's keys (V3, `docs/fingerprints.md`) and v1's authority. v2 needs its own key table (V4, `docs/fingerprints-v2.md`), the 2-of-3 authority, and the history check of section 5 of the design. |
| The committee launcher (`npm run committee -w bboard-cli`) on a v2 mainnet address | **Not built.** On mainnet it acts only on the pinned v1 address, and its `request --insert` has no `--key-slot v4`. |
| Proof server 9.0.2 by digest, ledger-v9 1.0.2, on-chain runtime 4.0.2, zkir-v3 3.2.1 | **Not done** (the design's client patch, Stage A step 6). Proving claims circuits on 9.0.0 or 9.0.1 can crash. |

Decisions the design still lists as open, which both founders settle in writing before the
mainnet deploy (design section 9): who holds the third key (decision 2); the record count that
the fresh start rests on (decision 10); condition 8 (the audit booked before the team-only
deploy, or waived for a deploy with no outside records); the v2 maintenance policy text.

---

## B. Rules for every step

- **Secrets only at hidden prompts.** A wallet recovery phrase, a Blockfrost project id, a
  maintenance key or an age key is never typed on a command line, pasted in a chat or written
  to a file in the repository. When a step needs one in the shell:

  ```sh
  read -s TOKEN     # paste, press Enter; nothing shows
  # ... use "$TOKEN" ...
  unset TOKEN; pbcopy < /dev/null
  ```

- **Never** change a wallet's DUST settings. **Never** re-register NIGHT. Fees are paid from
  the DUST the wallet already has.
- **No site or sponsor switch.** Nothing in `bboard-ui/`, `sponsor/`, Railway variables or
  Vercel changes for v2. The sponsor pays for no v2 call. The public site, the anchorer and the
  SDK defaults stay on v1.
- **No pin until `verify:deployment` passes for v2.** The v2 address goes into no pinned list
  (SDK, site, `api/src/deploy-guard.ts`, `deployments/mainnet.json`) before that. A pinned list
  is never shortened, so a v2 replaced before the audit is never pinned.
- **No call to v2 on mainnet before the committee holds it.** `verify:deployment` will refuse a
  v2 whose history before the committee block holds any call, key removal, unlisted key, or IR
  change (design section 5).
- Kill a process by its PID, never by name. Never force-push.

---

## C. Build the keys on the Mac

1. Get the compiler. It goes in its own folder and is **not** put on the PATH, so v1's
   0.31.1 stays the `compact` on the PATH.

   ```sh
   mkdir -p ~/compactc-0.36.1 && cd ~/compactc-0.36.1
   curl -fsSL -o compactc.zip \
     https://github.com/midnightntwrk/compact/releases/download/compactc-v0.36.1/compactc_v0.36.1_aarch64-darwin.zip
   shasum -a 256 compactc.zip
   ```

   The hash must be `96ee68a59d9e8b093f05c97479a4cf08c79760015dcc26ecc797ec0160ca27f9`
   (`contract-v2/compiler-checksums.txt`). Then open
   https://github.com/midnightntwrk/compact/releases/tag/compactc-v0.36.1, expand **Assets**,
   and check that GitHub shows the same SHA-256 for `compactc_v0.36.1_aarch64-darwin.zip`.
   (The checksums in the file were computed from Midnight's download URLs; GitHub's page could
   not be read from the machine that wrote them. If the page disagrees, stop.)

   ```sh
   unzip -q compactc.zip && ./compactc --version     # must print 0.36.1 (7fa3a117c 2026-11-11)
   ./compactc --language-version                     # 0.28.0
   ./compactc --runtime-version                      # 0.21.0
   ```

   macOS may refuse to run a downloaded binary the first time. If it does: System Settings,
   Privacy & Security, "Allow Anyway" for each of `compactc.bin`, `zkir-v3`.

2. In the repository, on the merged commit:

   ```sh
   cd ~/veilcore && git checkout main && git pull --ff-only && npm ci
   export COMPACTC=~/compactc-0.36.1/compactc
   npm run check:compiler -w contract-v2           # compactc 0.36.1 (...)
   npm run check:compiler                          # v1: still 0.31.1
   ```

3. Run the tests once more on the Mac (about 10 minutes):

   ```sh
   npm run ci -w contract-v2
   ```

4. Build with keys. This downloads Midnight's proving parameters the first time and takes a
   while; close other heavy apps.

   ```sh
   npm run compact -w contract-v2
   ls contract-v2/src/managed/veilcore/keys | wc -l          # 48 (24 circuits x prover + verifier)
   ls contract-v2/src/managed/veilcore-claims/keys | wc -l   # 10
   npm run fingerprints -w contract-v2 -- --out ~/v2-fingerprints-mac.md
   ```

## D. Rebuild the keys on a second machine

The keys must come out byte for byte the same on another computer, or nobody can check them.

5. On the second machine (another Mac, or Linux), with the same commit:

   ```sh
   git clone https://github.com/hunterincoming/veilcore && cd veilcore
   git checkout <the same commit as on the Mac>
   npm ci
   ```

   Get the compiler as in step 1 (on Linux: `compactc_v0.36.1_x86_64-unknown-linux-musl.zip`,
   SHA-256 `9d5fedfec9ae775a1e47d5c6f785130b314c1c5c52cd1a4eb9fc56d1fc61d23a`), then:

   ```sh
   export COMPACTC=~/compactc-0.36.1/compactc
   npm run compact -w contract-v2
   ```

6. Copy `~/v2-fingerprints-mac.md` over (it holds only hashes, no secret) and compare:

   ```sh
   npm run fingerprints -w contract-v2 -- --compare v2-fingerprints-mac.md
   ```

   It must say **"The two builds match"**. If it names a file: **stop**. Do not deploy keys
   that one machine cannot rebuild. Send the output to the team; it is a finding, not a typo.

7. Open a PR that adds `docs/fingerprints-v2.md` (the Mac's table) and nothing else. This is
   the key table `verify:deployment` and the committee use for v2.

## E. Preprod first, the whole run

8. **BLOCKED** until the v2 deploy command and the client patch (proof server 9.0.2) are
   merged. Then, on preprod: deploy v2 main and v2 claims with a temporary single key, insert
   every remaining key in slot **V4**, and write down the address and the counter.
9. **BLOCKED** (same). Call every one of the 29 circuits once on preprod, through the CLI, with
   test secrets. Each must land. A claims proof that crashes the proof server means the proof
   server is not 9.0.2.
10. **BLOCKED** until the committee launcher takes a v2 address and `--key-slot v4`. Hand
    preprod v2 to a practice 2-of-3 committee (`keygen --practice`, three cards), exactly as on
    mainnet later (docs/maintenance-committee.md, Part 2), then check the temporary key is
    refused.
11. **BLOCKED** until `verify:deployment` checks v2. Run
    `npm run verify:deployment -- --network preprod` against the preprod deployment record. It
    must pass.

Only when 8 to 11 all pass on preprod, with the exact build, go on.

## F. Mainnet, team only

12. **BLOCKED** (as step 8). Deploy v2 main and v2 claims to mainnet from the Mac with a
    **temporary single key**. The tool shows the key once; write it on paper, and keep any file
    copy age-encrypted on the Mac only. The wallet's recovery phrase is typed only at the
    tool's hidden prompt. Insert every key in slot **V4** in one wallet session.
13. Make **no call** to either v2 contract. Not a test anchor, not one claim. The history check
    refuses a v2 that was called before the committee held it, and an early call would mean a
    fresh deploy.
14. **BLOCKED** (as step 11). `npm run verify:deployment -- --network mainnet` for v2: every
    key matches `docs/fingerprints-v2.md` (V4), the authority is the temporary key, no call,
    no removed key, no IR change. It must pass before anything else.
15. **The hand-over**, as soon as the third key holder is named in writing (decision 2).
    **BLOCKED** (as step 10). The three holders make their key cards (`scripts/committee/cli.mjs
    keygen`), each confirms with `confirm`, then the temporary key replaces itself with the
    2-of-3 committee by the launcher's `install`, first with `--dry-run`, then with
    `--send-on-mainnet --dry-run-record FILE --confirm FILE x3`. Then destroy the temporary key
    (paper and any file). Do the same for the claims contract.
16. `verify:deployment` again: the authority must now be the 2-of-3 committee.
17. Only now, as its own PR: the v2 addresses in the deployment record (revision 5) and the
    pinned lists. Then the team may make its own v2 records, from the CLI or a maintainer-only
    build, never through the public site.

Until step 15 is done, v2 is held by one key. That is acceptable only because nothing calls
it (step 13) and the hand-over follows as soon as the third holder is named. If that takes
more than a few days, say so in the deployment notes.

## G. Must not happen

- The site, the anchorer, the sponsor or the SDK switching to v2. That is the public switch,
  after the paid audit's written close (design section 7).
- A pin of the v2 address before `verify:deployment` passes.
- A Railway variable or Vercel change for v2.
- Any change to a wallet's DUST settings, or a NIGHT re-registration.
- A secret on a command line, in a file in the repository, or in a message.
- Keys built anywhere but the Mac (and rebuilt on the second machine to check).
- Any edit or recompile of `contract/` (v1), other than a `--skip-zk` test build.
- A pre-signed maintenance update: sign on the day, in one sitting.

## H. The mutation pass (already run; re-run before the deploy)

`contract-v2/scripts/mutation-v2.mjs` removes or weakens each new check one at a time (24
mutants: the zero-secret assert and each of its nine call sites, the four version literals,
and ten changes to the response range check), compiles each, and runs
`src/test/v2-changes.test.ts`. Every mutant must be killed. On the Mac:

```sh
COMPACTC=~/compactc-0.36.1/compactc node contract-v2/scripts/mutation-v2.mjs
```

It works in a temporary copy and changes nothing in the repository. It takes about 20 minutes.

The run on 23 November 2026 (Linux, compiler 0.36.1): 24 mutants, 24 killed, 0 survived.
