# Two of three keys: on contract version 2, and retiring version 1

**Status: RUNBOOK, 23 November 2026. Nothing here has been run on mainnet.** It follows the
fresh-start design in [contract-v2.md](../contract-v2.md):

- **Version 2 (v2)** is deployed with a temporary single key, then handed to a committee of
  three keys, any two of which must sign, once the third key holder is named (maintainer
  decision, 23 November 2026; contract-v2.md, section 5).
- **Version 1 (v1)** gets no committee. After v2 is public and audited, v1's existing single
  key is used once, to **retire** v1's authority. After that, nobody can change v1 again.

**Source of truth:** [contract-v2.md](../contract-v2.md) (sections 5 to 7),
[maintenance-committee.md](../maintenance-committee.md) (the procedure),
[committee-rehearsal.md](../committee-rehearsal.md) (the practice run, which must pass
first), [maintenance-policy.md](../maintenance-policy.md) (the approved rules), and
`docs/ops/release-checklist.md`. Where this page and those differ, those win.

---

## Where things stand (23 November 2026)

- **v1's single key is live on mainnet.** It is on paper; each founder holds a sheet. Either
  sheet alone can change v1's rules today. The counter was 16 on 13 November 2026.
- **v2 is a design only.** Nothing is built.
- **The committee tools are built and tested on a computer** against Midnight's own Ledger 9
  code. They have **never run on a real node**, not even a local one. The local rehearsal
  (Part B) has not been run.
- **The tool changes v2 needs are not built yet** (contract-v2.md, section 7, Stage A item 7):
  - the key slot as a parameter (`V4` for v2);
  - a sequence request;
  - the counter-range go/no-go;
  - the two named exceptions to the gate: "v2 before handover", and the v1 retire with the
    single key;
  - a way to name v2's address on mainnet before it is pinned. Today the tool always uses the
    pinned mainnet address, and v2 is pinned only after `verify:deployment` passes.

  Parts D and E give the commands where they exist today, and say where they will change.

---

## Why v2 from deploy, and v1 retired (not a committee on v1)

1. **v1 holds only the team's own test records** (contract-v2.md, 0.1), and v2 is a fresh
   start. A committee on v1 would protect a contract that is about to be retired.
2. **Retiring v1 removes its key's power for good,** with one signer and no call across time
   zones. A committee on v1 would keep that power alive, just split three ways.
3. **v2's single key is temporary.** It is handed to the committee once the third key holder
   is named, before any outside record and before the professional audit. The handover is the
   same replace-authority the tool already builds. Part B rehearses it on a practice contract.
4. **Until v1 is retired, its key stays live,** and either sheet can change v1. v1 is retired
   only once v2 is public and audited, so the public site always has a working contract
   (contract-v2.md, section 7, condition 9). Keep both sheets as safe as today until then.

---

## Decisions needed from both founders (before Part C)

1. **Who holds the third key on v2.** From [maintenance-committee.md](../maintenance-committee.md):

   | Option | Who makes and holds it | Stops one founder acting alone |
   |---|---|---|
   | **A. Independent holder** | A trusted person who is neither founder (a lawyer or an advisor), on their own computer | Yes |
   | **B. Sealed together** | Both founders, in person, sealed in a tamper-evident envelope signed across the flap by both, kept where neither can open it alone (a bank box both must attend, or a lawyer's safe) | Yes, if neither keeps a copy |
   | **C. Sealed by one founder** | One founder makes and seals it | **No** |

   A is recommended, otherwise B. C is only a short stopgap, said openly, and you must **name
   which founder**, because that founder can then act alone. B needs both founders in the
   same room, and they live in different countries. Moving the third key to an independent
   holder later takes two signatures and the policy's 14-day notice ("Changing a holder
   later", below).
2. **Change the approved policy if not A.** The policy says the third key goes to "an
   independent party named publicly when chosen". B or C changes that, so both founders
   approve the change **in writing**.
3. **Approve in writing**: the v2 committee, the v2 maintenance policy (rules never change,
   14-day notice, every use published), and **the v1 retire** (sealing isn't a use the
   approved policy lists).
4. **Where to announce, and the dates.** The policy requires an announcement **at least
   14 days before** any use of a key, with the reason. That covers v1's retire **and v2's
   handover to the committee**: the earliest handover is 14 days after its notice is
   published. Pick the place (the
   site's status page, the repo). Follow the public wording rules in `CLAUDE.md`.
5. **Where each holder keeps their two sheets** (below). Each holder decides their own two
   places, without telling the others the exact spots.
6. **Book one call for all three key holders across time zones** for the confirmations (C4
   and D3). In winter, 19:00 to 21:00 EST is 09:00 to 11:00 JST the next day.

---

## Who holds which key, and how it's stored

| Key | Holder | Made where | Stored |
|---|---|---|---|
| Hunter's v2 key | Hunter | Hunter's Mac, Wi-Fi off is fine | Two paper sheets, two different safe places (e.g. a home safe and a bank box) |
| Mako's v2 key | Mako | Mako's own computer | Two paper sheets, two different safe places |
| Backup v2 key | Decision 1 (A, B or C) | The holder's own computer (A); together in person (B); one founder (C) | A: the holder's two sheets. B or C: one sealed envelope, signed across the flap, where no one can open it alone |
| v2's temporary deploy key | Hunter, from the deploy until the handover | Hunter's Mac | Age-encrypted on disk (never on paper or in a password manager) until the handover is confirmed on chain, then destroyed (contract-v2.md, section 5) |
| v1's single key (today's) | Hunter and Mako, one sheet each | Already exists | Kept until the v1 retire (Part E), then **shredded by both** |

Rules for every committee key ([maintenance-committee.md](../maintenance-committee.md),
"Storing each key"):

- On paper only. **Never** photographed, scanned, typed into Notes, **Apple Passwords** or any
  password manager, email, chat or cloud document. Never sent to anyone, including other
  VeilCore people. Nobody will ever ask for it.
- No one place holds two keys (not the same safe, not the same bank box).
- Once a year, each holder checks their paper still reads right (`check`, step C5).
- What *is* shared: the public **card** (`committee-key-NAME.json`). It holds no secret.

---

## How long it takes

| Part | Time |
|---|---|
| A. Get the Mac ready | 15 minutes |
| B. Local rehearsal | 2 to 4 hours (mostly waiting on Docker and the wallet), one sitting |
| C. Make the three v2 keys and confirm the cards | 1 hour, plus each holder's own 15 minutes |
| D. v2 deploy, then the handover | Deploy: one day (contract-v2.md, section 7). Handover: one booked call and about 2 hours, once the third holder is named |
| E. v1 retire | 14-day notice, then about 2 hours |

---

## Part A. Get the Mac ready (Hunter)

```
cd ~/Desktop/veilcore
git checkout main
git pull
npm ci
node --version
```

**Success:** `node --version` prints `v24.11.1`. `npm ci` ends with no `ERR!`.

Check Docker Desktop is open and running, with **8 GB of memory** (Docker Desktop → Settings
→ Resources).

Check the contract is compiled (the rehearsal needs it):

```
ls contract/src/managed/veilcore
```

**Success:** it lists files. **If `No such file or directory`:** run
`cd contract && npm run compact && cd ..` (needs compactc 0.31.1). Never commit any change to
`docs/fingerprints.md`.

Run the committee tests against Midnight's Ledger 9 code:

```
node --test scripts/committee/committee.test.mjs
cd bboard-cli && npx vitest run src/launcher/committee.test.ts && cd ..
```

**Success:** the first ends with `# fail 0`; the second with every test passed. If anything
fails, stop and send Claude the last lines.

---

## Part B. Rehearse on a local network (Hunter, must pass before Part C)

From `docs/committee-rehearsal.md`. Everything here runs on a Midnight network that exists only
inside Docker on your Mac. **Throwaway keys only.** Never type the real paper key, the real
wallet phrase or the Blockfrost id anywhere in Part B.

**If any step does not do what "Success" says: stop there.** Copy the last lines it printed
(they hold no secret) and send them to Claude. Don't improvise, and don't go on to Part C.

Every key here is a practice key (`--practice`, name starting `practice-`). Mainnet refuses
practice cards. If any step prints `WARNING: ... is NOT a practice card`, stop, delete that
card, and make it again.

Use **one Terminal window** for all of Part B. Start in the repository folder:

```
cd ~/Desktop/veilcore
```

### B1. Start the local network (10 to 20 minutes the first time, for the downloads)

Open [committee-rehearsal.md](../committee-rehearsal.md), step 1 ("Start the local
network"). Copy its first code block (it starts `mkdir -p /tmp/vc-rehearsal` and ends with
`docker compose -f /tmp/vc-rehearsal/compose.yml up -d --wait`) and run it as one paste. It
is kept in one place only, so the two pages can't drift apart. The values in it that look like
secrets are fixed test constants from Midnight's own test files; they protect nothing.

**Success:** it ends with `node` shown as `Healthy` and `indexer` as `Started` or `Running`.
Then run:

```
curl -s -H 'Content-Type: application/json' -d '{"id":1,"jsonrpc":"2.0","method":"state_getRuntimeVersion","params":[]}' http://127.0.0.1:9944
```

**Success:** it prints a line holding `"specVersion"`. **Write the `specVersion` number down**;
step B5 must change it.

**If an image won't run on your Mac** (an error about `platform` or `exec format`): open
`/tmp/vc-rehearsal/compose.yml` (`open -e /tmp/vc-rehearsal/compose.yml`), add the line
`    platform: linux/amd64` under that service's `image:` line (same indent as `image:`), save,
then run `docker compose -f /tmp/vc-rehearsal/compose.yml down -v` and start B1 again from the
`docker compose ... up` line.

### B2. Make four throwaway keys

```
export REPO="$(pwd)"
export R=/tmp/vc-rehearsal
node scripts/committee/cli.mjs keygen --practice --holder practice-old --out $R/old.key --card $R/old-card.json
node scripts/committee/cli.mjs keygen --practice --holder practice-hunter --out $R/hunter.key --card $R/hunter.json
node scripts/committee/cli.mjs keygen --practice --holder practice-mako --out $R/mako.key --card $R/mako.json
node scripts/committee/cli.mjs keygen --practice --holder practice-backup --out $R/backup.key --card $R/backup.json
ls $R
```

**Success:** each prints `PRACTICE KEY: for a rehearsal only` and `Key written to ...`; `ls`
shows eight files plus `compose.yml`.

### B3. Point the tools at the local network

```
export MN_TEST_ENVIRONMENT=env-var-remote
export MN_TEST_NETWORK_ID=undeployed
export MN_TEST_INDEXER=http://127.0.0.1:8088/api/v4/graphql
export MN_TEST_INDEXER_WS=ws://127.0.0.1:8088/api/v4/graphql/ws
export MN_TEST_NODE=http://127.0.0.1:9944
export MN_TEST_NODE_WS=ws://127.0.0.1:9944
echo $MN_TEST_NETWORK_ID
```

**Success:** it prints `undeployed`. (These aren't secrets. If you open a new Terminal window,
`cd ~/Desktop/veilcore` and run B2's two `export` lines and these six again.)

### B4. Before the fork: deploy two practice contracts with the old practice key (30 to 60 minutes)

Copy the throwaway old key to the clipboard (a practice key, so the clipboard is fine here):

```
node -e "process.stdout.write(JSON.parse(require('fs').readFileSync('/tmp/vc-rehearsal/old.key','utf8')).signingKey)" | pbcopy
cd bboard-cli
npm run standalone
```

- Private-state password: any practice password, twice (16+ characters, mixed types).
- Menu: type `1` (Deploy a new VeilCore contract).
- `Keep a maintenance authority? (Y/n)`: press Enter.
- `Signing key`: paste (Cmd+V), press Enter. Nothing shows.
- Wait while it deploys and adds the circuit keys. **Copy the contract address it prints.**
- Type `0` to exit.

Save the first address:

```
read A1
```

Paste the address, press Enter. Then `export A1`.

Run `npm run standalone` a second time the same way (it's retired in B10). Save that address:

```
read A2
```

Paste, Enter, then `export A2`. Now check both:

```
npm run committee -- undeployed show --address $A1
npm run committee -- undeployed show --address $A2
```

**Success:** both say `1 key(s); 1 signature(s) needed for any change; counter 16.` (the
main contract's shape on mainnet). Any other counter: stop.

### B5. The fork: move the local network to Ledger 9 (5 minutes)

Run the first command in [committee-rehearsal.md](../committee-rehearsal.md), step 5 ("The
fork"): the one line that starts `docker compose -f /tmp/vc-rehearsal/compose.yml --profile
tools run --rm toolkit runtime-upgrade`.

(`//Alice` and the others are a local chain's built-in test accounts, not keys of ours.) Wait a
minute, then:

```
curl -s -H 'Content-Type: application/json' -d '{"id":1,"jsonrpc":"2.0","method":"state_getRuntimeVersion","params":[]}' http://127.0.0.1:9944
HEAD=$(curl -s -H 'Content-Type: application/json' -d '{"id":1,"jsonrpc":"2.0","method":"chain_getFinalizedHead","params":[]}' http://127.0.0.1:9944 | sed 's/.*"result":"\([^"]*\)".*/\1/')
curl -s -H 'Content-Type: application/json' -d '{"id":1,"jsonrpc":"2.0","method":"midnight_ledgerVersion","params":["'$HEAD'"]}' http://127.0.0.1:9944
```

**Success:** `specVersion` is higher than the number from B1, and the last line names ledger
`9.1.0.1`. If not, wait another minute and run the three lines again. Then:

```
npm run committee -- undeployed show --address $A1
```

**Success:** still `1 key(s); 1 signature(s) needed for any change; counter 16.`

### B6. Dry run of the install, and the three confirmations

```
npm run committee -- undeployed install --address $A1 --card $R/hunter.json --card $R/mako.json --card $R/backup.json --dry-run --out $R/dry-install.json
```

When it asks for the current maintenance key, copy the old practice key again with the
`node -e ... | pbcopy` line from B4 (run it in the same window, it works from here too) and
paste.

**Success:** it prints `Now:` with 1 key and counter 16, `After:` with 3 keys, 2 signatures
needed and counter 17, each key in full, the warning that a wrong committee key is PERMANENT,
a `Check code:` of 16 characters, and ends `DRY RUN, nothing sent`. No `NOT a practice card`
warning. The three keys under `After:` match the `publicKey` in each card file, and each name
starts `practice-`.

Now the three practice holders confirm (type `CONFIRM` each time):

```
node $REPO/scripts/committee/cli.mjs confirm --record $R/dry-install.json --card $R/hunter.json --key-file $R/hunter.key --out $R/confirm-hunter.json
node $REPO/scripts/committee/cli.mjs confirm --record $R/dry-install.json --card $R/mako.json --key-file $R/mako.key --out $R/confirm-mako.json
node $REPO/scripts/committee/cli.mjs confirm --record $R/dry-install.json --card $R/backup.json --key-file $R/backup.key --out $R/confirm-backup.json
node $REPO/scripts/committee/cli.mjs confirm --record $R/dry-install.json --card $R/mako.json --key-file $R/hunter.key --out $R/confirm-wrong.json
```

**Success:** the first three show the same check code as the dry run and end
`Confirmed by practice-... for check code ...`. The fourth (Mako's card with Hunter's key, the
mistake this exists to catch) says `That key is NOT the one on practice-mako's card` and
writes no `confirm-wrong.json`.

### B7. The install

First with one confirmation missing, which must refuse:

```
npm run committee -- undeployed install --address $A1 --card $R/hunter.json --card $R/mako.json --card $R/backup.json --confirm $R/confirm-hunter.json --confirm $R/confirm-mako.json --out $R/installed.json
```

**Success:** `No valid confirmation from "practice-backup"` and `Nothing was sent.`, without
asking for the old key. Then with all three:

```
npm run committee -- undeployed install --address $A1 --card $R/hunter.json --card $R/mako.json --card $R/backup.json --confirm $R/confirm-hunter.json --confirm $R/confirm-mako.json --confirm $R/confirm-backup.json --out $R/installed.json
```

Paste the old practice key when asked. It starts a Ledger 9 proof server, syncs the local
chain's built-in wallet, and asks you to type `INSTALL`.

**If it prints `The wallet's copy of Midnight Ledger 9 does not read this transaction as it
was built`: stop.** Nothing was sent; trying again won't help. Send Claude that line.

**Success:** `Sent: transaction ...`, then `On chain now: 3 key(s); 2 signature(s) needed for
any change; counter 17.` Then:

```
npm run committee -- undeployed show --address $A1 --card $R/hunter.json --card $R/mako.json --card $R/backup.json
npm run committee -- undeployed install --address $A1 --card $R/hunter.json --card $R/mako.json --card $R/backup.json
```

**Success:** `show` lists practice-hunter, practice-mako and practice-backup, counter 17. The
second says `This committee is already installed. Nothing to do.`

**If the wallet never finishes syncing, or the send fails:** this is the known uncertain part.
Stop, copy the last lines, send them to Claude. Run `show`: if it still says counter 16,
nothing changed.

### B8. The old key and one signature are refused

```
node $REPO/scripts/committee/cli.mjs keygen --practice --holder practice-backup --out $R/backup2.key --card $R/backup2.json
npm run committee -- undeployed request --address $A1 --replace --card $R/hunter.json --card $R/mako.json --card $R/backup2.json --reason "rehearsal" --out $R/request.json
node $REPO/scripts/committee/cli.mjs sign --request $R/request.json --key-file $R/old.key --out $R/sig-old.json
node $REPO/scripts/committee/cli.mjs sign --request $R/request.json --key-file $R/hunter.key --out $R/sig-hunter.json
npm run committee -- undeployed submit --request $R/request.json --sig $R/sig-hunter.json --dry-run --out $R/dry-one.json
```

Type `SIGN` each time `sign` asks.

**Success:** the `sign` with `old.key` says `This key ... is not on the contract's current
committee` and writes nothing. The `sign` with `hunter.key` writes `sig-hunter.json`. The
`submit` says `1 valid signature(s) from different committee members; 2 are needed. Nothing
was sent.`

### B9. Two signatures are accepted

```
node $REPO/scripts/committee/cli.mjs sign --request $R/request.json --key-file $R/mako.key --out $R/sig-mako.json
npm run committee -- undeployed submit --request $R/request.json --sig $R/sig-hunter.json --sig $R/sig-mako.json --dry-run --out $R/dry-two.json
npm run committee -- undeployed submit --request $R/request.json --sig $R/sig-hunter.json --sig $R/sig-mako.json --out $R/rotated.json
npm run committee -- undeployed show --address $A1
npm run committee -- undeployed submit --request $R/request.json --sig $R/sig-hunter.json --sig $R/sig-mako.json
```

Type `SIGN` for the first, `SEND` when the third asks.

**Success:** the dry run ends `DRY RUN, nothing sent`. The send prints `Sent: transaction ...`.
`show` says 3 keys, 2 needed, counter 18, and its third key is the `publicKey` in
`backup2.json`. The last command says `The chain already shows this change. Nothing to send.`

### B10. Retire the second practice contract

```
npm run committee -- undeployed request --address $A2 --retire --reason "rehearsal" --out $R/retire.json
node $REPO/scripts/committee/cli.mjs sign --request $R/retire.json --key-file $R/old.key --out $R/sig-retire.json
npm run committee -- undeployed submit --request $R/retire.json --sig $R/sig-retire.json --out $R/retired.json
npm run committee -- undeployed show --address $A2
npm run committee -- undeployed show --address $A1
```

Type `SIGN`, then `SEND`.

**Success:** the second contract says `Retired: an empty committee; nobody can change this
contract. Counter 17.` The first is untouched: 3 keys, counter 18.

### B11. Note the result, then throw it all away

Write down for Claude (no keys, even practice ones): which steps passed, the counters, your
Mac's chip (M5), whether any image needed `platform: linux/amd64`, and anything that surprised
you. Claude turns it into `docs/log/committee-rehearsal-2026-MM-DD.md` (real date) in a pull
request. Then:

```
cd ..
docker compose -f /tmp/vc-rehearsal/compose.yml down -v
rm -rf /tmp/vc-rehearsal
unset MN_TEST_ENVIRONMENT MN_TEST_NETWORK_ID MN_TEST_INDEXER MN_TEST_INDEXER_WS MN_TEST_NODE MN_TEST_NODE_WS A1 A2 R REPO HEAD
pbcopy < /dev/null
docker ps
```

**Success:** `docker ps` shows no `vc-rehearsal` containers. Close the Terminal window.

**Part C waits until every B step passed.**

Part B rehearses both mainnet operations on a practice contract shaped like v1:

- **B6 to B9:** a single key hands the contract to a committee, which is the v2 handover.
- **B10:** a single key retires a contract, which is the v1 retire.

The v2 handover on a real v2 build, with `V4` keys and the 1,024-node measurements, is
rehearsed later, on the devnet and preprod (contract-v2.md, section 7, Stage C).

---

## Part C. Make the three v2 keys (before the handover)

### C1. Hunter: read v1's counter (5 minutes; sends nothing, no wallet)

In a new Terminal window:

```
cd ~/Desktop/veilcore/bboard-cli
read -s VEILCORE_BLOCKFROST_PROJECT_ID
```

Paste the Midnight mainnet Blockfrost project id from Apple Passwords, press Enter (nothing
shows). Then:

```
export VEILCORE_BLOCKFROST_PROJECT_ID
pbcopy < /dev/null
npm run committee -- mainnet show
unset VEILCORE_BLOCKFROST_PROJECT_ID
```

**Success:** 1 key, 1 signature needed, **counter 16**. **Any other number means something
changed v1: stop and find out what** before anything else.

### C2. Founders: decide and approve in writing

Settle decisions 1 to 3 above, in writing.

### C3. Each holder makes their key on their own computer (15 minutes each)

Wi-Fi off is fine for this step.

**Hunter**, on the Mac:

```
cd ~/Desktop/veilcore
node scripts/committee/cli.mjs keygen --holder hunter --paper
```

**Mako**, once, on his computer (needs Node 24 and git):

```
git clone https://github.com/hunterincoming/veilcore
cd veilcore
npm ci
node scripts/committee/cli.mjs keygen --holder mako --paper
```

**Backup holder:** the same as Mako, with `--holder backup`. (Option C: the founder making it
runs it on their own computer. Option B: both founders together.)

For each one, the tool shows the key **once**:

1. Write it on **two sheets** of paper.
2. Type `WRITTEN`.
3. Type it back from the **second** sheet, to prove the copy is right.
4. It writes the public card, `committee-key-hunter.json` (or `-mako`, `-backup`), in the
   folder you ran it from. The card has no secret.
5. Close the Terminal window (Cmd+W).

The key is stored nowhere on the computer. Mako and the backup holder send their card file to
Hunter any way (email is fine; it's public). Hunter saves both into `~/Desktop/veilcore` next
to his own.

### C4. Confirm every card on the booked call (15 minutes, all three holders)

Each holder reads their **fingerprint** out loud: the first and last 8 characters of their
public key, from the line `Fingerprint to read out loud when you confirm it:` that keygen
printed. Hunter checks it against the card he received. This stops someone swapping a card in
transit. If one doesn't match, that holder makes a new key (C3) and you repeat C4.

### C5. Each holder checks their paper (5 minutes, any time, offline)

From the same folder where they made their key:

```
node scripts/committee/cli.mjs check --card committee-key-hunter.json
```

(Mako: `committee-key-mako.json`; backup: `committee-key-backup.json`.) Type the key from
paper. **Success:** it says OK. Do this for both sheets, then put each sheet in its safe
place.

---

## Part D. Deploy v2 with the temporary key, then hand it to the committee

**The tools exist** (`npm run deploy-v2`, `verify:deployment --v2-record`, and the committee
launcher's `--v2-record` and `--temp-key-file`). The exact commands are in
[deploy-v2.md](deploy-v2.md): steps 9 to 13 on preprod first, then steps 14 to 18 on mainnet.
The order (contract-v2.md, section 5):

1. **Deploy v2 with the temporary key** on the maintainer's Mac, kept age-encrypted on disk.
   Insert all 29 verifier keys (`V4` slot) in one wallet session, or in the fewest updates
   the devnet showed fit under the 1,024-node limit. Run `verify:deployment`, then pin v2 and
   publish the deployment record. The team may use v2 from here (contract-v2.md, section 7,
   condition 4). **Nothing else is ever done with the temporary key** but the listed inserts
   and the handover.
   *Steps 2 to 7 wait until the third key holder is named, Part C is done, and the 14-day
   notice of the handover has run.*
2. **Dry run of the handover:** the tool's install, run as the "v2 before handover" exception
   against v2's address, with the three cards from Part C. It shows the one temporary key now,
   the three keys afterwards, the counter before and after, and a check code.
3. **The three holders confirm** the dry run's check code on the booked call, each offline
   with their key from paper (as in Part B, B6).
4. **The handover:** a replace-authority from the temporary key to the committee, sent with
   all three confirmations.
5. **Check:** `show` lists the three holders, threshold 2. Then `npm run verify:deployment`
   for v2 must pass. It refuses any maintenance update before the committee block other than
   the listed key inserts and this handover.
6. **Destroy the temporary key** (delete the encrypted file and its age key), only after step 5
   passes.
7. **Publish** a deployment record revision with the handover, and the checkers' v2 state (b).

**If the session stops partway:** the temporary key is still on disk, so the remaining inserts
or the handover can be finished: run the deploy again with `--resume` (deploy-v2.md, step 9). It
never deploys a second contract while the first could still land, and it keeps every address it
built. v2 is pinned only after `verify:deployment` passes at step 1. A v2 that can't be finished
is never pinned: it is closed with one `retire` signed by the temporary key (the "v2 before
handover" exception allows that, alone; no key removal is needed after it), and a fresh v2 is
deployed (deploy-v2.md, step 15).

---

## Part E. Retire v1 with its single key

**When:** only after v2 is public and audited (contract-v2.md, section 7, condition 9), both
founders have approved the retire in writing, and the 14-day notice has run. **Before:** the
devnet test in contract-v2.md, section 8, question 1 has passed (a `retire` on a pre-fork
contract, sent from a wallet on ledger-v9 1.0.0, is accepted, and every checker accepts the
retired state). Part B, B10 has passed. The committee tool's "v1 retire with the single key"
exception is merged.

`retire` replaces v1's authority with an empty committee, which no signature set can satisfy.
**No circuit key is removed:** v1's records keep verifying, and anyone can still call its
circuits, but nobody can ever change its rules again.

### E1. Dry run (20 minutes; sends nothing, no wallet)

```
cd ~/Desktop/veilcore/bboard-cli
read -s VEILCORE_BLOCKFROST_PROJECT_ID
```

Paste the Blockfrost id, Enter, then:

```
export VEILCORE_BLOCKFROST_PROJECT_ID
pbcopy < /dev/null
npm run committee -- mainnet show
npm run committee -- mainnet request --retire --reason "Retire version 1: version 2 is public" --out retire-v1.json
node ../scripts/committee/cli.mjs sign --request retire-v1.json --out sig-retire-v1.json
npm run committee -- mainnet submit --request retire-v1.json --sig sig-retire-v1.json --dry-run --out dry-run-retire-v1.json
```

`show` must say 1 key, counter 16 (or the counter published since). `sign` asks you to type
`SIGN`, then v1's key from your sheet (hidden).

**Success:** the dry run shows the one key now, *Retired: an empty committee* afterwards, and
the counter before and after, and it ends with `DRY RUN, nothing sent`.

### E2. Send (1 to 3 hours, mostly the wallet sync)

```
npm run committee -- mainnet submit --request retire-v1.json --sig sig-retire-v1.json --send-on-mainnet --dry-run-record dry-run-retire-v1.json
```

It asks for the private-state password, the 24-word phrase of the main wallet that holds the
DUST (hidden), the DUST address, and finally a typed confirmation. Nothing is registered and
no DUST setting changes.

**Success:** `Sent: transaction ...`, and then `show` says *Retired: an empty committee;
nobody can change this contract*. Then:

```
unset VEILCORE_BLOCKFROST_PROJECT_ID
pbcopy < /dev/null
```

### E3. Shred, publish, and bring the repo in line

- **Both founders shred both sheets of v1's key.** They control nothing now.
- Send Claude the transaction and the new counter. Claude makes one pull request with:
  - `deployments/mainnet.json` (authority retired, the counter, the block);
  - the state check's accepted v1 state (b) (contract-v2.md, 3.3);
  - a new deployment record revision;
  - the site's key sentence in all five languages.
- Merge only with every check green, then deploy as usual (`CLAUDE.md`).

---

## If something goes wrong

| What happens | What to do |
|---|---|
| C1 or E1 shows a counter you didn't expect | Stop. Something changed v1. Find out what before anything else |
| A card's fingerprint doesn't match on the C4 call | That holder makes a new key (C3); redo C4 |
| `check` (C5) or a confirmation (D3) says the key doesn't match the card | **Don't hand over.** That holder makes a new key (C3); start again from C4 |
| A dry-run record is over 24 hours old | Run the dry run again with a new `--out` name |
| The v2 deploy or the handover stops partway | Part D, "If the session stops partway" |
| The retire stopped partway (Ctrl+C, connection dropped) | Run `show`. If it says retired, it landed. If it says 1 key, run E2 again. It never sends twice |
| The wallet won't sync | Nothing was sent. Try again later; if it keeps failing, send Claude the last lines |
| After the handover, one v2 key lost or destroyed | The other two sign a `--replace` with a new key for that person, with the 14-day notice. Do it soon: you're one more loss from being locked out |
| One v2 key exposed (seen, photographed, typed somewhere) | The same, announced as soon as it is safe (policy: an urgent security fix). One key alone can't change anything. Publish what happened |
| Two v2 keys lost | Nobody can change v2 again. Records stay readable. This is why keys are kept apart and checked yearly |
| Two v2 keys stolen | Whoever has them controls v2; the verifier shows the counter jump. This is why no person or place holds two keys |

## Changing a holder later (two holders sign, 14-day notice)

For example, moving the backup key on v2 to an independent holder later (option C or B now, A
later). Full steps: [maintenance-committee.md](../maintenance-committee.md), "Changing
anything later". In short:

1. Announce it **14 days ahead** (the policy).
2. The new holder makes a key and card (C3); confirm the card on a call (C4).
3. Hunter, from `bboard-cli`, with the Blockfrost id exported, makes a `request --replace` with
   the three cards (on v2's address) and the reason "Third key to an independent holder".
4. Two current holders each sign the request file, offline, from their `veilcore` folder:
   `node scripts/committee/cli.mjs sign --request` followed by the request file's name. Compare
   the check code on a call, type `SIGN`, then the key from paper.
5. The three new holders confirm the dry run's check code (as in D3), and Hunter sends with
   `submit` (dry run first, then `--send-on-mainnet`).

A request only works against the counter it was made for. Don't post signatures publicly before
they're sent.
