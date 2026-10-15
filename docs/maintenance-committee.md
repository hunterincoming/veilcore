# Two of three keys for the main contract

**Status: PREPARED, 14 October 2026. Not done. Nothing has been sent to any network.**
The tools are built and tested against Midnight's own ledger code on a computer. They have
not run on preprod or mainnet. The preprod rehearsal below comes first. Who holds the three
keys is the founders' decision.

---

## The short version

Today one key can change VeilCore's main contract on mainnet. It is on paper, and each
founder holds a copy. So either founder, alone, can change the contract. So can anyone who
gets either sheet of paper.

The plan: replace that one key with three new keys. Any two of the three must sign before
anything changes. After the switch, the old paper key does nothing, and one person, or one
lost or stolen key, can't change the contract.

Midnight supports this. Its ledger has always had "a committee of keys and how many must
sign". Midnight's own toolkit (midnight-js) only uses a committee of one, so we built
the missing piece ourselves, the same way we already retired the claims contract's key.

## Why it matters

Whoever controls the maintenance authority controls the contract's rules. They can add or
swap circuits, and a new circuit can rewrite what the contract says now (who controls a
record, which licences exist). They can't change history or backdate anything, and every
change shows on chain. The approved maintenance policy (`docs/maintenance-policy.md`)
already says the end state is a committee of independent holders. This is that step.

## Who holds the three keys (founders decide)

Proposal: **Hunter, Mako, and an offline backup kept sealed.**

One thing to decide carefully: **whoever creates the backup key sees it.** If one founder
creates it alone, that founder has seen two of the three keys. The backup still protects
against a lost key, but it doesn't stop that founder acting alone. Three ways to do the
backup:

| Option | Who creates and holds the third key | Protects against a lost key | Stops one founder acting alone |
|---|---|---|---|
| **A. Independent holder** | A trusted person who is neither founder (for example a lawyer or an advisor). They create it on their own computer and keep the paper. | Yes | Yes |
| **B. Sealed together** | Both founders together, in person. Written on paper, sealed in a tamper-evident envelope signed across the flap by both, and kept where neither can open it alone (a bank box both must attend, or a lawyer's safe). | Yes | Yes, if neither keeps a copy |
| **C. Sealed by one founder** | One founder creates it and seals it. | Yes | **No.** It's no better than today on this point. |

Recommendation: **A** if there's a suitable person, otherwise **B**. Use C only as a short
stopgap, and say so.

Note: the approved maintenance policy says the third key goes to "an independent party
named publicly when chosen". That's option A. Choosing B or C changes the approved policy,
so both founders approve the change in writing, and `docs/maintenance-policy.md` and the
next deployment record revision say so.

## What you need

- **Every key holder:** a computer with Node 24, this code (`git clone`, then `npm ci` in
  the folder). Creating and signing with a key needs no internet. Turn Wi-Fi off for those
  steps if you like.
- **Hunter (sending):** the same setup as `npm run mainnet` (`docs/runbook.md`, *Before any
  run*): Docker Desktop running, the Blockfrost project id, the private-state password, and
  the wallet that holds the DUST. The fee is paid from DUST the wallet already has.
  Nothing is registered for DUST and no DUST address changes.
- **The current paper key** (Hunter's sheet), for one signature during the install.

The online tool runs from the `bboard-cli` folder:

```
npm run committee -- <network> <command> ...
```

If npm says the `committee` script is missing, use the long form instead:
`node --experimental-specifier-resolution=node --loader ts-node/esm src/launcher/committee.ts <network> <command> ...`

The offline tool runs from the main folder: `node scripts/committee/cli.mjs <command> ...`

## Step by step

### Part 1: rehearse on preprod (must be done first)

Same steps as mainnet, on a practice contract with practice keys. Nothing here is real.

1. **Hunter:** deploy a practice contract with a paper key: `npm run preprod-remote`, option
   1, keep the authority, let it make a key, write it down. Note the contract address.
2. **Three practice keys.** They're throwaway. Make Hunter's on paper to practise the real
   thing. The other two can go to files in `/tmp` to save time. From the main folder:
   ```
   node scripts/committee/cli.mjs keygen --holder hunter --paper --card /tmp/practice-hunter.json
   node scripts/committee/cli.mjs keygen --holder mako --out /tmp/practice-mako.key --card /tmp/practice-mako.json
   node scripts/committee/cli.mjs keygen --holder backup --out /tmp/practice-backup.key --card /tmp/practice-backup.json
   ```
3. **Install, dry run, then for real.** Export `VEILCORE_BLOCKFROST_PREPROD_PROJECT_ID` first,
   as the runbook says. From `bboard-cli`:
   ```
   npm run committee -- preprod install --address <practice address> --card /tmp/practice-hunter.json --card /tmp/practice-mako.json --card /tmp/practice-backup.json --dry-run
   npm run committee -- preprod install --address <practice address> --card /tmp/practice-hunter.json --card /tmp/practice-mako.json --card /tmp/practice-backup.json
   ```
   Type the practice paper key when asked. For the real run, use the preprod test wallet,
   never the mainnet phrase. Type `INSTALL` when asked.
4. **Check:** `npm run committee -- preprod show --address <practice address>` shows 3
   keys, 2 needed, counter up by one.
5. **A change needing two signatures:** swap the backup key for a new one.
   ```
   node scripts/committee/cli.mjs keygen --holder backup --out /tmp/practice-backup2.key --card /tmp/practice-backup2.json
   npm run committee -- preprod request --address <practice address> --replace --card /tmp/practice-hunter.json --card /tmp/practice-mako.json --card /tmp/practice-backup2.json --reason "rehearsal" --out /tmp/practice-request.json
   node scripts/committee/cli.mjs sign --request /tmp/practice-request.json --out /tmp/sig-hunter.json
   node scripts/committee/cli.mjs sign --request /tmp/practice-request.json --key-file /tmp/practice-mako.key --out /tmp/sig-mako.json
   npm run committee -- preprod submit --request /tmp/practice-request.json --sig /tmp/sig-hunter.json --dry-run
   npm run committee -- preprod submit --request /tmp/practice-request.json --sig /tmp/sig-hunter.json --sig /tmp/sig-mako.json --dry-run
   npm run committee -- preprod submit --request /tmp/practice-request.json --sig /tmp/sig-hunter.json --sig /tmp/sig-mako.json
   ```
   The first submit has only one signature and must refuse. The second must say
   `DRY RUN`. The third sends it. Then `show` should list the new backup key and the
   counter one higher. Run the last command again: it must say the change is already
   there and send nothing.
6. **Write it down** in a short `docs/preprod-committee-run-<date>.md`: the transaction ids,
   the counters, anything that surprised you. Mainnet waits until this passes.

### Part 2: mainnet

1. **Hunter: read today's counter** (no wallet, sends nothing):
   `npm run committee -- mainnet show`
   It should say 1 key, 1 signature needed, and a counter (expected 16). That number fills
   the TODO in `docs/maintenance-policy.md` and the deployment record.
2. **Founders:** choose the three holders (above), approve this change in writing, and
   announce it **at least 14 days before** sending, as the maintenance policy requires.
3. **Each holder makes their key on their own computer** (Wi-Fi off is fine):
   ```
   node scripts/committee/cli.mjs keygen --holder hunter --paper
   ```
   (`--holder mako` for Mako; the backup holder uses `--holder backup`.) It shows the key
   once. Write it on **two sheets**, type `WRITTEN`, then type it back from the second
   sheet. It is stored nowhere on the computer. It writes a public card,
   `committee-key-<name>.json`, with no secret in it. Send that card to Hunter by any means.
   Then close the Terminal window (Cmd+W).
4. **Confirm every card on a call.** Each holder reads the "fingerprint" (first and last 8
   characters of their public key) out loud, and Hunter checks it matches the card he got.
   This stops someone swapping a card in transit. A card's built-in proof shows the key was
   copied right, but not who made it.
5. **Each holder checks their paper copy** (any time, offline):
   `node scripts/committee/cli.mjs check --card committee-key-<name>.json`
   and types the key from paper. It must say OK.
6. **Hunter: dry run of the install** (checks the old paper key, the three cards, the
   counter; sends nothing; no wallet):
   ```
   npm run committee -- mainnet install --card ../committee-key-hunter.json --card ../committee-key-mako.json --card ../committee-key-backup.json --dry-run
   ```
   It shows exactly what will change, asks for the current paper key (hidden), and must end
   with `DRY RUN, nothing sent`.
7. **Hunter: install** (after the 14 days): the same command without `--dry-run`. It asks
   for the paper key, then the private-state password, the 24-word wallet phrase (hidden,
   only here), the DUST address check, a sync, and finally `Type INSTALL`. It confirms from
   the chain and writes a receipt file (public).
8. **Hunter: check again** with `npm run committee -- mainnet show`: 3 keys, 2 needed,
   counter one higher. **Then destroy both sheets of the old paper key** (shred them, Mako's
   too). They control nothing now.
9. **Publish:** a new deployment record revision with the receipt (transaction, block, new
   counter, the three public keys and who holds them), and update the maintenance policy,
   the runbook and the website wording about who holds the authority. Anyone who pinned the
   old counter in our verifier (`authorityCounter`) will see refusals until they take the
   new number.

## Storing each key

- **On paper, two sheets, in two different safe places** (a home safe, a bank box, a
  trusted relative's safe). Never photographed, scanned, typed into a notes app, password
  manager, email, chat or cloud document. Never sent to anyone, including other VeilCore
  people. Nobody will ever ask for it.
- **Not in the same place as another holder's key.** The point is that no one place holds
  two keys.
- Instead of paper, `--out FILE` writes the key to a file (readable only by you, never over
  an existing file). The tool refuses iCloud, Dropbox, Google Drive, OneDrive, Desktop,
  Documents and this code folder. Use it only on a USB drive kept offline, with a second
  copy. Paper is simpler and is what the approved policy expects.
- **Once a year, each holder runs `check`** to make sure their paper is still readable.

## Changing anything later (two holders sign)

1. **Whoever prepares it** makes a request from the chain as it is now (sends nothing):
   - change a holder: `npm run committee -- mainnet request --replace --card A --card B --card C --reason "..."`
   - switch off a circuit: `npm run committee -- mainnet request --remove <circuit> --reason "..."`
   - add a circuit key: `npm run committee -- mainnet request --insert <circuit>=<file.verifier> --reason "..."`
   - retire for good: `npm run committee -- mainnet request --retire --reason "..."`

   It writes a `request-....json` file. It holds no secret. Send it to the holders.
2. **Each signing holder, on their own computer, offline:**
   `node scripts/committee/cli.mjs sign --request request-....json`
   It shows in plain words what will change, the reason, and a check code. Compare the check
   code with the other signer on a call. Type `SIGN`, then the key from paper. It writes a
   `signature-....json` file (no secret). Send it back.
3. **Whoever sends it** (Hunter, with the DUST wallet):
   `npm run committee -- mainnet submit --request request-....json --sig sig1.json --sig sig2.json --dry-run`
   then the same without `--dry-run`, and `SEND`.

A request only works against the counter it was made for. Once any change lands, older
requests and signatures can never be used. Until then, two valid signatures are an
approval anyone could send, so don't post them publicly before they're sent.

## If something goes wrong

- **One key lost or destroyed:** the other two holders sign a `--replace` request with a
  new key for that person. The lost key then counts for nothing. Do it soon. Until then
  you're one more loss away from being locked out.
- **One key exposed** (seen, photographed, typed somewhere it shouldn't be): the same, at
  once. One key alone can't change anything, so this is urgent but not an emergency.
  Publish what happened.
- **Two keys lost:** nobody can ever change the contract again. Records stay readable. If a
  Midnight upgrade then needs a key change, the answer is a new contract version and a
  way to carry records over (`docs/upgrades.md`). This is why the keys are kept apart and
  checked yearly.
- **Two keys stolen:** whoever has them controls the contract. Anyone checking with our
  verifier sees the counter jump. This is why no person or place may hold two keys.
- **The install stopped partway** (Ctrl+C, a dropped connection): run `show`. If the
  counter went up by one and it shows 3 keys, it landed. If not, run the install again.
  It never sends twice.

## The claims contract already has no key

The claims contract's authority was replaced on 8 October 2026 by an empty committee, which
no key can ever satisfy (transaction
`0091979012d160ff9e4cb1162b8e29f18dfccdeb00068357a40913fccfe658335f`, block 2922874).
Nobody, including VeilCore, can change it. Nothing here applies to it.

## What was tested, and where

**Tested on a computer, against Midnight's real ledger code** (`@midnight-ntwrk/ledger-v8`
8.1.0, the WebAssembly build of the ledger the node runs), with a contract held in a local
ledger state. Signatures, thresholds and counters are the ledger's own checks. Proofs and
fees are switched off because a maintenance change has no proof and there's no wallet.
`node --test scripts/committee/committee.test.mjs` (15 checks) and
`cd bboard-cli && npx vitest run src/launcher/committee.test.ts` (3 checks):

- the install from one paper key to 3 keys and 2 signatures, and the old key then refused,
  alone or with a member;
- one signature refused; any two accepted in any order; three accepted;
- a lost key rotated out by the other two, then useless;
- a used or overtaken change refused; a request edited after it was made refused; a
  signature for a different request, a duplicate, a damaged one, or one from outside the
  committee refused before sending;
- removing and inserting circuit keys with two signatures (insert needs a compiled
  `.verifier` file; run with `COMMITTEE_TEST_VK=<file>`);
- the sending code: sent once, confirmed from the chain, never sent twice, "landed but the
  confirmation was lost" handled;
- the offline tool: the key never on screen with `--out` and stored only for you; the paper
  copy typed back; signing only after `SIGN`; on mainnet, signing only for the pinned
  contract;
- the online tool end to end (install dry run, install, request, two signatures, submit)
  with the wallet replaced by a stand-in that applies the transaction to that same ledger.

Seven safety checks in `core.mjs` (duplicate key, threshold, current key as a member, duplicate
signature, stale counter, edited request, signer not on the committee) were each removed
one at a time to confirm a test catches it.

**Not tested, needs the preprod rehearsal:** a real node and indexer accepting a 3-key,
2-signature authority and a 2-signature change (VeilCore has never done this on a live
network); the indexer reading the new authority back; the wallet paying for it; the proof
server step. The one-signature version of this exact path (replacing an authority with our
own update) already ran on mainnet when the claims contract was retired. No local chain
could run here (Docker images couldn't be downloaded), so testing stopped at the dry run.

## For the record: what Midnight supports, and where we read it

- **The authority is a committee, a threshold and a counter.**
  `ContractMaintenanceAuthority(committee, threshold, counter)`,
  `node_modules/@midnight-ntwrk/ledger-v8/ledger-v8.d.ts` (class at line 726): "If a
  threshold of the public keys in this committee sign off, they can change the rules of
  this contract". "At deployment, `counter` must be `0n`, and any subsequent update should
  set counter to exactly one greater than the current value."
- **A change** is `MaintenanceUpdate(address, updates, counter)` with
  `addSignature(idx, signature)` and `dataToSign` (same file, line 2202). The updates are
  `ReplaceAuthority`, `VerifierKeyRemove`, `VerifierKeyInsert` (`SingleUpdate`, line 2135).
  Each signature is the signer's place in the committee plus `signData(key, dataToSign)`.
  `dataToSign` covers only the address, the changes and the counter (it starts
  `midnight:contract-update:`), so holders can sign separately and one person sends.
- **midnight-js 4.1.1 supports only one key.** `replaceAuthority(newAuthority: SigningKey)`
  (`node_modules/@midnight-ntwrk/midnight-js-contracts/dist/governance/tx-interfaces.d.ts`,
  line 60), with a TODO for "Add additional authorities"
  (`midnight-js-contracts/dist/index.mjs`, `submitReplaceAuthorityTx`). Its builder fixes the
  threshold at 1 and the signature at place 0 (`DEFAULT_CMA_THRESHOLD = 1`,
  `node_modules/@midnight-ntwrk/compact-js/dist/esm/effect/ContractExecutable.js`, lines 28,
  192-221).
- **What the ledger checks, found by running it** (`scripts/committee/committee.test.mjs`):
  each update must carry the current counter, and every update raises it by one, however
  many changes it holds. A new authority's counter must be exactly current + 1. Signatures
  must sit at the signer's own place. Fewer than the threshold is refused. A change of
  authority can't be combined with a second change of authority.
- **What the ledger doesn't check, so our tool does:** the same key twice in a committee
  (one person would get two votes), a threshold of 0 (anyone could change the contract
  with no signature), a threshold of 2^32 (it silently becomes 0). The tool accepts only
  three different keys and a threshold of exactly 2, and refuses the current paper key as a
  member.
- **Mainnet today:** mainnet runs ledger 8 with midnight-js 4.1.1 (`docs/upgrades.md`,
  *Known* 9). The ledger accepts our own authority replacement there: the claims contract's
  empty committee (8 October) was one. A threshold above 1 hasn't been used by VeilCore on
  any live network. After Midnight's next upgrade (ledger 9) the authority carries over
  unchanged (`docs/upgrades.md`, *Known* 1), so installing the committee before that upgrade
  is the safer order.
- **How the key is held today:** made by the CLI on deploy (`sampleSigningKey`), shown once
  in groups of eight, typed back from paper, never written to disk (`bboard-cli/src/index.ts`,
  `makePaperKey`; `api/src/memory-overlays.ts`). Two sheets, one per founder
  (`docs/runbook.md`, step 18). The deploy added 16 circuit keys after the deploy
  transaction, each raising the counter (deployment record revision 4, *Mainnet deployment*),
  so the counter is expected to be 16. Read it in step 1 rather than assume it.

## The files

- `scripts/committee/core.mjs`: the rules (cards, committee checks, requests, signatures).
- `scripts/committee/cli.mjs`: the offline tool (keygen, check, read, sign).
- `scripts/committee/submit.mjs`: sending and confirming from the chain.
- `scripts/committee/committee.test.mjs`: the tests against the real ledger.
- `bboard-cli/src/launcher/committee.ts`: the online tool (show, install, request, submit).
- `bboard-cli/src/launcher/committee.test.ts`: the online tool end to end, wallet replaced.
