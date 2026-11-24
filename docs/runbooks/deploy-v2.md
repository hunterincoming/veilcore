# Deploying contract v2 (team only)

**Status, 23 November 2026: NOT DEPLOYED. Contract v2 is built and tested on a computer only.**
This is the order of work for Hunter's Mac. The design is [docs/contract-v2.md](../contract-v2.md);
the code is `contract-v2/`. v1 (`contract/`) stays exactly as it is and stays the contract the
public site uses.

**Read section A before anything else.** Step 8 (the proof server 9.0.2 digest) can only be
done on the Mac, and everything after it waits for it.

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
| Building the ZK keys | On Hunter's Mac only. Not done yet (section C). |
| `docs/fingerprints-v2.md` (the key table) | Not yet. Its own PR after sections C and D (step 7). |
| The v2 deploy command, `npm run deploy-v2 -w bboard-cli` | Built and tested against Midnight's ledger code (PR "Contract v2: deploy, verify and committee tools"). Not yet run on a network. |
| `npm run verify:deployment -- --v2-record FILE` | Built and tested the same way. Checks every key against `docs/fingerprints-v2.md` in slot V4, the authority (temporary key, then the 2-of-3 committee), and every maintenance update since the deploy. |
| The committee launcher on v2 (`--v2-record`, the key slot, the mainnet gate) | Built and tested the same way. |
| The client stack: midnight-js 5.0.1, ledger-v9 1.0.2, on-chain runtime 4.0.2 | Merged (#188, 23 November 2026). |
| Proof server **9.0.2, pinned by its digest**, for the v2 tools | **Digest not filled in yet.** It goes in one place, `bboard-cli/proof-server-v2.yml`, from Hunter's Mac (step 8). Until then every v2 tool (deploy, committee on v2, smoke run) refuses to start. Every v2 send starts that file's proof server, on preprod too. v1's tools keep `proof-server-mainnet.yml` (9.0.1). |
| The smoke run, `npm run smoke-v2 -w bboard-cli`: every v2 circuit called once, each result checked, a pass/fail table | Built (PR "Contract v2: a client that calls every v2 circuit"). Tested in this repository: the whole plan through midnight-js's own call builder, offline; and deploy, find and first call on Midnight's ledger code. Not yet run on a network: proving and sending are first shown in step 11. |

Decisions the design still lists as open, which both founders settle in writing:

- **Before the mainnet deploy:** the v2 maintenance policy text (design section 9); the record
  count the fresh start rests on (decision 10, confirmed 23 November 2026).
- **Before the handover (not before the deploy):** who holds the third key (decision 2).
- **Condition 8 is waived** by Hunter, 23 November 2026: the team-only deploy rests on VeilCore's
  own review. The public switch, and any pilot or real user record on v2, still wait for the
  professional audit's written close.

---

## B. Rules for every step

- **Secrets only at hidden prompts.** A wallet recovery phrase, a Blockfrost project id, an age
  passphrase or a maintenance key is never typed on a command line, pasted in a chat or written
  to a file in the repository. The tools ask for the recovery phrase and the age passphrase at
  their own hidden prompts. The Blockfrost id goes in like this:

  ```sh
  read -s VEILCORE_BLOCKFROST_PREPROD_PROJECT_ID     # paste, press Enter; nothing shows
  export VEILCORE_BLOCKFROST_PREPROD_PROJECT_ID
  ```

  (`VEILCORE_BLOCKFROST_PROJECT_ID` for mainnet.) When you are done:
  `unset VEILCORE_BLOCKFROST_PREPROD_PROJECT_ID VEILCORE_BLOCKFROST_PROJECT_ID; pbcopy < /dev/null`.
- **The temporary key is only ever an age-encrypted file on this Mac.** The deploy command makes
  it and hands it straight to `age`, which asks you for a passphrase. It is never shown, never
  on paper, never in a password manager, never in the repository. The passphrase is the only
  thing you remember; keep it out of every file and chat too.
- **Never** change a wallet's DUST settings. **Never** re-register NIGHT. Fees are paid from
  the DUST the wallet already has.
- **No site or sponsor switch.** Nothing in `bboard-ui/`, `sponsor/`, Railway variables or
  Vercel changes for v2. The sponsor pays for no v2 call. The public site, the anchorer and the
  SDK defaults stay on v1.
- **No pin until `verify:deployment` passes for v2.** The v2 address goes into no pinned list
  (SDK, site, `api/src/deploy-guard.ts`, `deployments/mainnet.json`) before that. The deploy
  command writes only its own session record (outside the repository, in `~/veilcore-v2/`). A
  pinned list is never shortened, so a v2 replaced before the audit is never pinned.
- **Checkers identify v2 by its pinned address, never by its `contractVersion` or
  `predecessor` fields.** Midnight does not run the constructor on chain, so any copy of v2 can
  carry those values.
- **Calls.** Anyone who pays a fee can call v2 from its deploy block (`anchorBatch` needs no
  secret). That is harmless only because nobody honours a v2 record yet (design condition 4).
  `verify:deployment` never refuses a call; it refuses **maintenance** updates other than the
  listed V4 key inserts and the one handover (any key removal, any key not in
  `docs/fingerprints-v2.md`, any V3 key, any IR change, any other authority change). The team
  makes no call of its own until v2 is pinned (step 17); after that it may. The only calls
  before that are the smoke run's on preprod (step 11).
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
   cd ~/Desktop/veilcore && git checkout main && git pull --ff-only && npm ci
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

## E. Before the first run: the tools on the Mac

8. **Pin proof server 9.0.2 by its digest, in one place.** A claims proof (the lab-signature
   circuit, `proveAttested`) can crash proof server 9.0.0 and 9.0.1, so every v2 tool runs 9.0.2
   and refuses any other. The proof server sees every secret of every call, so the image is
   pinned **only** when the digest Docker pulls is the one Midnight published in its GitHub
   release (`midnightntwrk/midnight-ledger`, tag `proof-server-9.0.2`), the same source as the
   9.0.1 pin. That check is not optional.

   **Do this step only after contract v2's tools are on `main`** (PR #189, which carries this
   work, merged). Before that, `scripts/v2/proof-server.mjs` and `bboard-cli/proof-server-v2.yml`
   are not on main. Check:

   ```sh
   cd ~/Desktop/veilcore && git checkout main && git pull --ff-only
   ls scripts/v2/proof-server.mjs bboard-cli/proof-server-v2.yml
   ```

   Both must be listed. If either is missing, stop: #189 is not merged yet.

   Open Docker Desktop, then get the digest Docker pulls:

   ```sh
   docker pull midnightntwrk/proof-server:9.0.2
   docker inspect --format '{{index .RepoDigests 0}}' midnightntwrk/proof-server:9.0.2
   ```

   The second command prints one line: `midnightntwrk/proof-server@sha256:` and 64 characters.
   It is public (it names the image; it unlocks nothing).

   Now Midnight's release. Save it and list every digest it names:

   ```sh
   mkdir -p ~/veilcore-v2
   curl -fsS https://api.github.com/repos/midnightntwrk/midnight-ledger/releases/tags/proof-server-9.0.2 -o ~/veilcore-v2/proof-server-9.0.2-release.json
   grep -o 'sha256:[0-9a-f]\{64\}' ~/veilcore-v2/proof-server-9.0.2-release.json | sort -u
   ```

   You can also read it in a browser:
   https://github.com/midnightntwrk/midnight-ledger/releases/tag/proof-server-9.0.2

   **Stop, and pin nothing, if:**

   - `curl` fails, because there is no such release;
   - the `grep` prints nothing, because the release names no digest;
   - none of the lines it prints is exactly the `sha256:...` part of your `docker inspect` line;
   - the release page does not show that digest next to `midnightntwrk/proof-server:9.0.2`, or
     marks the release as a pre-release.

   Send both outputs to the team instead. The pin command below makes the same comparison
   itself and refuses in the same cases, so it cannot pin an image the release does not name.

   **Optional, a second check: Midnight's signed build manifest.** The release also carries
   `build-manifest.json`, its signature `build-manifest.json.asc`, and Midnight's public key
   `midnight-proof-server-public.asc`. The manifest names the image's digest, and the signature
   shows Midnight's signing key vouches for it. The key comes from the same release page, so the
   check is only worth something together with the key's fingerprint below. The same key signed
   the 9.0.1 manifest, whose digest is the 9.0.1 pin already in this repository. It needs GnuPG
   (`brew install gnupg` once), and uses a throwaway keyring, so nothing is added to yours:

   ```sh
   mkdir -p ~/veilcore-v2/ps-9.0.2 && cd ~/veilcore-v2/ps-9.0.2
   for f in build-manifest.json build-manifest.json.asc midnight-proof-server-public.asc; do
     curl -fsSLO "https://github.com/midnightntwrk/midnight-ledger/releases/download/proof-server-9.0.2/$f"
   done
   export GNUPGHOME="$(mktemp -d)"
   gpg --import midnight-proof-server-public.asc
   gpg --fingerprint security@midnight.foundation
   gpg --verify build-manifest.json.asc build-manifest.json
   grep image_digest build-manifest.json
   unset GNUPGHOME; cd ~/Desktop/veilcore
   ```

   This check passes when all three of these hold:

   - The fingerprint reads `2D55 ACA7 93E9 495E 4288  9A35 4523 91B0 57AD D8C7`.
   - `gpg --verify` says `Good signature from "Midnight Foundation (Proof Server Signing Key)"`.
     A warning that the key "is not certified with a trusted signature" is normal.
   - The `image_digest` line shows the same `sha256:...` as your `docker inspect` line.

   If any of the three differs, stop and send the output to the team.

   Check the version inside the image says 9.0.2 (this starts it for a moment, on this Mac only):

   ```sh
   docker run -d --rm --name ps-check -p 127.0.0.1:6399:6300 midnightntwrk/proof-server:9.0.2 midnight-proof-server -v
   sleep 15; curl -s http://127.0.0.1:6399/version; echo
   docker stop ps-check
   ```

   It must print exactly `9.0.2` (not `9.0.2-rc1` or anything else). Then pin it, on a branch of
   its own. In the `pin` line, paste the whole line `docker inspect` printed in place of
   `PASTE_THE_LINE`, keeping the quotes:

   ```sh
   git switch -c pin/proof-server-9.0.2
   node scripts/v2/proof-server.mjs pin "PASTE_THE_LINE" --release-json ~/veilcore-v2/proof-server-9.0.2-release.json
   node scripts/v2/proof-server.mjs show       # proof server OK: midnightntwrk/proof-server:9.0.2@sha256:...
   git diff                                    # one line changes, in bboard-cli/proof-server-v2.yml
   git add bboard-cli/proof-server-v2.yml
   git commit -m "Proof server 9.0.2 pinned by digest for the v2 tools"
   git push -u origin pin/proof-server-9.0.2
   ```

   The `pin` line must say "The digest Docker pulled is the one Midnight published in
   proof-server-9.0.2". If it refuses, nothing was written: stop and send its message to the team.

   Open the pull request at
   https://github.com/hunterincoming/veilcore/pull/new/pin/proof-server-9.0.2 and wait for every
   check to pass. One of them, **Proof server pin**, fetches Midnight's release itself, on
   GitHub's machines, and fails unless the release ties the pinned digest to
   `midnightntwrk/proof-server:9.0.2`. If it fails, do not merge. When everything passes, merge,
   then run `git checkout main && git pull --ff-only`.

   You can instead send Claude the `docker inspect` line. Claude then runs the same `pin`
   command, which reads the release itself and refuses on any mismatch, before it opens that
   one-line PR.

   `bboard-cli/proof-server-v2.yml` is the only place the digest lives. The deploy, the committee
   on v2 and the smoke run all start the proof server from it, and refuse while it is not filled
   in.

9. Check the tools are up to date. From the repository:

   ```sh
   cd ~/Desktop/veilcore && git checkout main && git pull --ff-only && npm ci
   node -e "import('./scripts/v2/stack.mjs').then(m => console.log(m.stackProblems().join('\n') || 'stack OK'))"
   ```

   It must print **`stack OK`**. If it names a package, run `npm ci` again. If it names the proof
   server, step 8 is not merged yet: stop here.

   Then make the folder for v2's files (outside the repository), keep it out of Time Machine
   (so no old copy of a key file lingers in a backup), and check `age` is there:

   ```sh
   mkdir -p ~/veilcore-v2 && chmod 700 ~/veilcore-v2
   tmutil addexclusion ~/veilcore-v2
   age --version || brew install age
   ```

## F. Preprod first, the whole run

Use the **preprod test wallet**, never the mainnet recovery phrase. It must already have DUST
(get some with `npm run preprod-remote`, which registers for DUST on preprod only).

10. **Deploy v2 to preprod.** Put the preprod Blockfrost id in (section B), then:

    ```sh
    cd ~/Desktop/veilcore/bboard-cli
    npm run deploy-v2 -- preprod --key-file ~/veilcore-v2/preprod-temp-key.age --out ~/veilcore-v2/preprod-record.json
    ```

    In order, it:
    1. checks the client stack, `docs/fingerprints-v2.md`, and every key of your build against it;
    2. makes the temporary key and writes it to the age file: **type a new passphrase of your
       own, twice** (at least 12 characters; nothing shows; an empty one is refused). Then `age`
       itself asks for it **once more**, to prove the file opens. Keep the passphrase in your
       head only;
    3. asks you to type `DEPLOY V2`;
    4. asks the private-state password and the wallet's recovery phrase (hidden);
    5. deploys v2 main and v2 claims with the temporary key alone, then inserts all 29 keys in
       slot **V4**, one update each (about 31 transactions; it takes a while).

    It prints both addresses. Write them down with today's date. If it stops partway, run the
    same command with `--resume ~/veilcore-v2/preprod-record.json` in place of `--out ...`, and
    the same `--key-file`. Never start a second deploy for the same run. If it stopped while a
    deploy was being sent, the resume waits: it will not deploy again until that deploy can no
    longer land (an hour and ten minutes after it was built), and it keeps the old address in the
    record either way. If the resume says another transaction came after a step that landed, find
    that step on a block explorer (the contract address, then its transactions) and add
    `--landed-tx <its hash>`.

11. **Call every v2 circuit once on preprod: the smoke run.** Same Terminal (the preprod
    Blockfrost id still in, section B). Use the **preprod test wallet**; it needs DUST for about
    34 transactions.

    ```sh
    cd ~/Desktop/veilcore/bboard-cli
    npm run smoke-v2 -- --network preprod --v2-record ~/veilcore-v2/preprod-record.json --out ~/veilcore-v2/preprod-smoke.json
    ```

    In order, it:
    1. checks the client stack, the 9.0.2 pin, the record (preprod, both contracts deployed) and
       that the keys are built on this Mac, before anything is typed;
    2. asks you to type `SMOKE V2`;
    3. starts proof server 9.0.2 from `bboard-cli/proof-server-v2.yml` and asks it its version; if
       it does not say 9.0.2 it stops, before the wallet;
    4. asks the private-state password and the wallet's recovery phrase (hidden);
    5. makes 34 calls covering all 29 circuits (24 main, 5 claims, including the lab-signature one,
       `proveAttested`), with test records made up for this run and thrown away after it. After
       each call it reads the contract's state and checks the call did what it should.

    Each call is proved on this Mac: expect about an hour. It ends with a table, one row per call.
    The last line must be **`PASS: all 29 circuits landed and their results checked.`** The same
    table is saved in `~/veilcore-v2/preprod-smoke.json` (public: test data and transaction ids,
    no secret).

    If a row says FAIL, the run stops there and the rest say NOT RUN. Send the table to the team;
    do not work around it by hand. A FAIL on `proveAttested` that mentions the proof server means
    the proof server is not 9.0.2. A FAIL on `sealRevocations` about the time being too far ahead,
    or not ahead of the block time, is the Mac's clock: check it is set automatically, then run
    the whole command again. A new run uses new test records, so it can be repeated on the same
    contracts; `--out` needs a new file name each time.

    The smoke run refuses mainnet unless given `--network mainnet --i-understand-team-only` and
    `SMOKE V2 ON MAINNET` is typed, and it refuses mainnet until both v2 addresses are in
    `deployments/mainnet.json` (the pin, step 17).

12. **Check it.** From the repository:

    ```sh
    cd ~/Desktop/veilcore
    npm run verify:deployment -- --network preprod --v2-record ~/veilcore-v2/preprod-record.json
    ```

    It must end **`RESULT: PASS`** and say "one key, not yet handed to the committee" for both.

13. **Practice handover on preprod, exactly as on mainnet later** (practice keys; no 14-day
    notice on a test network). Make three practice cards:

    ```sh
    cd ~/Desktop/veilcore
    node scripts/committee/cli.mjs keygen --practice --holder practice-hunter --out /tmp/practice-hunter.key --card /tmp/practice-hunter.json
    node scripts/committee/cli.mjs keygen --practice --holder practice-mako --out /tmp/practice-mako.key --card /tmp/practice-mako.json
    node scripts/committee/cli.mjs keygen --practice --holder practice-backup --out /tmp/practice-backup.key --card /tmp/practice-backup.json
    ```

    Then, for the main contract (age asks for the preprod key file's passphrase each time):

    ```sh
    cd ~/Desktop/veilcore/bboard-cli
    npm run committee -- preprod install --v2-record ~/veilcore-v2/preprod-record.json --temp-key-file ~/veilcore-v2/preprod-temp-key.age --card /tmp/practice-hunter.json --card /tmp/practice-mako.json --card /tmp/practice-backup.json --dry-run --out /tmp/v2-dry-main.json
    node ../scripts/committee/cli.mjs confirm --record /tmp/v2-dry-main.json --card /tmp/practice-hunter.json --key-file /tmp/practice-hunter.key --out /tmp/v2-confirm-hunter.json
    node ../scripts/committee/cli.mjs confirm --record /tmp/v2-dry-main.json --card /tmp/practice-mako.json --key-file /tmp/practice-mako.key --out /tmp/v2-confirm-mako.json
    node ../scripts/committee/cli.mjs confirm --record /tmp/v2-dry-main.json --card /tmp/practice-backup.json --key-file /tmp/practice-backup.key --out /tmp/v2-confirm-backup.json
    npm run committee -- preprod install --v2-record ~/veilcore-v2/preprod-record.json --temp-key-file ~/veilcore-v2/preprod-temp-key.age --card /tmp/practice-hunter.json --card /tmp/practice-mako.json --card /tmp/practice-backup.json --confirm /tmp/v2-confirm-hunter.json --confirm /tmp/v2-confirm-mako.json --confirm /tmp/v2-confirm-backup.json --out ~/veilcore-v2/preprod-handover-main.json
    ```

    Type `CONFIRM` at each `confirm`, then the wallet's recovery phrase and `INSTALL` at the
    last line. Do the same for the claims contract: add `--contract veilcore-claims` to both
    `install` lines, and use `/tmp/v2-dry-claims.json` and `~/veilcore-v2/preprod-handover-claims.json`
    in place of the main contract's files (make three new confirmations for its dry run).

14. **Check the temporary key has no power left.** The chain now takes a change only with two
    of the three practice keys, so the temporary key alone can change nothing:

    ```sh
    npm run committee -- preprod show --v2-record ~/veilcore-v2/preprod-record.json
    npm run committee -- preprod show --v2-record ~/veilcore-v2/preprod-record.json --contract veilcore-claims
    ```

    Each must say **3 key(s); 2 signature(s) needed**, and none of the three is the temporary key.
    Then check again, with both receipts:

    ```sh
    cd ~/Desktop/veilcore
    npm run verify:deployment -- --network preprod --v2-record ~/veilcore-v2/preprod-record.json --receipt ~/veilcore-v2/preprod-handover-main.json --receipt ~/veilcore-v2/preprod-handover-claims.json
    ```

    It must end **`RESULT: PASS`** and say "held by the 2-of-3 committee" for both. Then delete
    the practice keys: `rm /tmp/practice-*.key`.

Only when 10 to 14 all pass on preprod, with the exact build, go on.

## G. Mainnet, team only (target: 28 and 29 November 2026)

15. **Deploy v2 to mainnet.** Put the **mainnet** Blockfrost id in (section B), have the DUST
    address your wallet app shows ready to paste, then:

    ```sh
    cd ~/Desktop/veilcore/bboard-cli
    npm run deploy-v2 -- mainnet --send-on-mainnet --key-file ~/veilcore-v2/mainnet-temp-key.age --out ~/veilcore-v2/mainnet-record.json
    ```

    Use a **new** passphrase for the mainnet key file, not the preprod one. Type
    `DEPLOY V2 ON MAINNET` when asked. The recovery phrase goes in only at the tool's hidden
    prompt. All inserts go in this one wallet session. If it stops partway, run it again with
    `--resume ~/veilcore-v2/mainnet-record.json` in place of `--out ...`.

16. **Check it** before anything else (make no call to either contract until step 17):

    ```sh
    cd ~/Desktop/veilcore
    npm run verify:deployment -- --network mainnet --v2-record ~/veilcore-v2/mainnet-record.json
    ```

    It must end **`RESULT: PASS`**: every key matches `docs/fingerprints-v2.md` in V4, the
    authority is the temporary key, every maintenance update is a listed insert. For a check
    that does not rely on VeilCore's relay, it uses your Blockfrost project when the variable is
    set (section B). Nothing else happens before this passes.

    **If it fails**, v2 is never pinned. Stop and send the output to the team. If the team decides
    to abandon it, close it for good with one `retire` (the launcher allows that, alone, on v2
    before its handover; with the 14-day notice once v2 is pinned, which it is not here), for each
    contract, then deploy a fresh v2:

    ```sh
    cd ~/Desktop/veilcore/bboard-cli
    npm run committee -- mainnet request --v2-record ~/veilcore-v2/mainnet-record.json --retire --reason "Abandoned v2 deploy" --out ~/veilcore-v2/retire-main.json
    npm run committee -- mainnet submit --v2-record ~/veilcore-v2/mainnet-record.json --request ~/veilcore-v2/retire-main.json --temp-key-file ~/veilcore-v2/mainnet-temp-key.age --dry-run --out ~/veilcore-v2/retire-main-dry.json
    npm run committee -- mainnet submit --v2-record ~/veilcore-v2/mainnet-record.json --request ~/veilcore-v2/retire-main.json --temp-key-file ~/veilcore-v2/mainnet-temp-key.age --send-on-mainnet --dry-run-record ~/veilcore-v2/retire-main-dry.json
    ```

    (For claims: add `--contract veilcore-claims` and use `retire-claims` file names.)

    Then the fresh deploy is step 15 again with **new file names**, because the tool never writes
    over a key file or a record:

    ```sh
    npm run deploy-v2 -- mainnet --send-on-mainnet --key-file ~/veilcore-v2/mainnet-2-temp-key.age --out ~/veilcore-v2/mainnet-2-record.json
    ```

    From then on, use `mainnet-2-temp-key.age` and `mainnet-2-record.json` wherever the steps below
    say `mainnet-temp-key.age` and `mainnet-record.json`. Keep the first record: it is the public
    account of the abandoned deploy. Delete the first key file once both retires are confirmed.

17. **Pin v2, as its own PR, straight after step 16 passes:** the v2 addresses in the deployment
    record (revision 5) and the pinned lists. Once it is merged, the team may make its own v2
    records, from the CLI or a maintainer-only build, never through the public site. Wording stays
    "deployed on mainnet for testing by VeilCore; not yet independently reviewed; not for your
    records".

18. **The handover, after the 14-day notice.** It comes later than the pin. The handover is a use of v2's key, so the policy's
    notice comes first:
    1. When the third key holder is named in writing (decision 2), **publish the notice**: the
       handover of v2 main and v2 claims to the 2-of-3 committee, with the date.
    2. Wait **at least 14 days** from the notice. The earliest handover is notice + 14 days.
    3. On the day, with one call for all three holders: each makes a real card
       (`node scripts/committee/cli.mjs keygen --holder <name> --paper`), each card is
       confirmed out loud on the call (docs/maintenance-committee.md, Part 2, steps 3 to 5).
    4. Dry run, confirmations, then send, for the main contract:

       ```sh
       cd ~/Desktop/veilcore/bboard-cli
       npm run committee -- mainnet install --v2-record ~/veilcore-v2/mainnet-record.json --temp-key-file ~/veilcore-v2/mainnet-temp-key.age --card ../committee-key-hunter.json --card ../committee-key-mako.json --card ../committee-key-<third>.json --dry-run --out ~/veilcore-v2/mainnet-dry-main.json
       ```

       Send `mainnet-dry-main.json` to the three holders (it is public: no key in it). Each
       runs, on their own computer, with their own key:
       `node scripts/committee/cli.mjs confirm --record mainnet-dry-main.json --card committee-key-<name>.json`
       and sends back the confirmation file. Then, within 24 hours of the dry run:

       ```sh
       npm run committee -- mainnet install --v2-record ~/veilcore-v2/mainnet-record.json --temp-key-file ~/veilcore-v2/mainnet-temp-key.age --card ../committee-key-hunter.json --card ../committee-key-mako.json --card ../committee-key-<third>.json --send-on-mainnet --dry-run-record ~/veilcore-v2/mainnet-dry-main.json --confirm <hunter's confirmation> --confirm <mako's confirmation> --confirm <third's confirmation> --out ~/veilcore-v2/mainnet-handover-main.json
       ```

       Type `INSTALL ON MAINNET`. Then the same for the claims contract, with
       `--contract veilcore-claims` and its own dry run, confirmations and receipt
       (`mainnet-dry-claims.json`, `mainnet-handover-claims.json`).
    5. Check (it must end **`RESULT: PASS`**, "held by the 2-of-3 committee" for both):

       ```sh
       cd ~/Desktop/veilcore
       npm run verify:deployment -- --network mainnet --v2-record ~/veilcore-v2/mainnet-record.json --receipt ~/veilcore-v2/mainnet-handover-main.json --receipt ~/veilcore-v2/mainnet-handover-claims.json
       ```

    6. **Destroy the temporary key**, only now: `rm ~/veilcore-v2/mainnet-temp-key.age` (and
       `rm ~/veilcore-v2/preprod-temp-key.age`). The folder is kept out of Time Machine (step 9),
       so there is no other copy.
    7. **A deployment record revision**, as its own PR, with the handover's two receipts. This
       check is for v2 up to its handover; a later committee change needs a new revision too.

19. **The deadline for the single key.** v2 is held by one key until step 18 is done. That is
    acceptable only because nobody honours a v2 record yet. **The handover happens before any v2
    record leaves the team.** If no outside holder is named by then, the handover uses
    **option C** (one founder holds two of the three keys for now), and the deployment notes
    and the policy say so openly, naming the founder who can act alone.


## Must not happen

- The site, the anchorer, the sponsor or the SDK switching to v2. That is the public switch,
  after the paid audit's written close (design section 7).
- A pin of the v2 address before `verify:deployment` passes.
- A handover sooner than 14 days after its notice.
- A Railway variable or Vercel change for v2.
- Any change to a wallet's DUST settings, or a NIGHT re-registration.
- A secret on a command line, in a file in the repository, or in a message. The temporary key
  on paper, or anywhere but its age file.
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
