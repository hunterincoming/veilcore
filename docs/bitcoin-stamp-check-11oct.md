# Bitcoin stamp check: batch B-20261011-FE71 (block 971004)

## Result (15 Oct 2026)

**PASS with VeilCore's own script, against two block explorers. Not yet checked with the
official OpenTimestamps client and a full Bitcoin node.**

Hunter ran `npm run check:bitcoin-stamp -- B-20261011-FE71` on his Mac on 15 October 2026
at 13:26 UTC. The script (`scripts/check-bitcoin-stamp.mjs`, at `9d3ac72`) downloaded both
files from the production registry and printed:

| What | Value |
|---|---|
| `root.bin` contents (the batch root) | `2e0be735fa4be9155d93282be2c19da4d9f46da45ade29183e2b01b768c3225b` |
| SHA-256 of `root.bin` | `b4bfd264bb803e4793d4e40a033ef11eaa2d74aeee170b9af5a3c394c92b2bc4`, the digest the stamp starts from: match |
| `root.bin.ots` | 2,895 bytes, SHA-256 `540cc44691a644b7898a4341c49587718d61ed40bbf12f8b0065244811edd6cc` |
| Bitcoin block 971004 | hash `000000000000000000012ae85ff3cdc65ea795ae3facbcad20da8f6b462956a1`, merkle root `755f3fa7edc9cb9aa62dfb30cca6c3d6329941a24199e29a0b8242e873e0d7cd`, time 2026-10-11 23:55:44 UTC |
| Bitcoin block 971005 | hash `0000000000000000000042601b4858534f518c3fc526a6f1544a728d92f8ead4`, merkle root `7a618d2e54eb21fcb063c7b8fc4bd2a2ab39d1b78f9b8636eb1778adfb208870`, time 2026-10-11 23:53:12 UTC |
| Other calendars in the stamp | bob, alice, catallaxy, eternitywall: still pending |

The stamp has two Bitcoin attestations, one per calendar that has reached Bitcoin: its
steps lead from that digest to the merkle root of block 971004 and to the merkle root of
block 971005. For each block, mempool.space and blockstream.info gave the same hash and
merkle root, and the raw header hashed to the block hash and passed the proof-of-work
check. Block 971005's time being 2.5 minutes earlier than 971004's is normal: Bitcoin
block times are not strictly in order.

What this run did not do, still to do:

- **The official client with a full node.** This was VeilCore's own script, written by the
  same author as the registry's stamping code (tested offline against the official
  client's output on its 13 example stamps). It trusts the two explorers for which block is
  at each height. The independent check is `ots verify -f root.bin root.bin.ots` with
  opentimestamps-client and a local Bitcoin Core node (steps below). Until that is done, R4
  and item 7 in `docs/mainnet-completeness.md` stay partly done.
- The full printed output is not pasted here; the values above are from it.
- Not part of this check: that this `root.bin` is the root anchored on Midnight for this
  batch (transaction `e13c88f5…bcbf`, `docs/mainnet-completeness.md` M2).

## The one command (on the Mac, about a minute, no keys)

From the repository folder:

```sh
npm run check:bitcoin-stamp -- B-20261011-FE71
```

It downloads the batch's `root.bin` and `root.bin.ots` from the production registry,
checks the stamp file is about that `root.bin` (its SHA-256 is what the stamp starts from),
follows the stamp's steps to its Bitcoin attestation (the block, and the merkle root that
block must have), then asks mempool.space and blockstream.info for that block: its hash,
its `merkle_root` and its raw 80-byte header. The header must hash to the block's hash and
carry the stamp's merkle root, and both explorers must give the same block. It prints every
value, then **PASS**, **FAIL** or **NOT DONE** (a site couldn't be reached, or the stamp
isn't in Bitcoin yet), and the official-client commands below for anyone who wants them.
Nothing needs installing beyond Node; no Python.

Paste its whole output under a new dated heading at the end of this file, with the result,
and update R4 and item 7 in `docs/mainnet-completeness.md`. Files you already have:
`npm run check:bitcoin-stamp -- B-20261011-FE71 --files root.bin root.bin.ots`.

How it was tested (15 October 2026, offline): its reader for `.ots` files gives the same
digest and, where there is one, the same Bitcoin block and merkle root as the official client (`ots info`, opentimestamps-client
0.7.2) on all 13 example stamps in that client's repository, including the real
`hello-world.txt.ots` (block 358391); the byte order is checked on two real blocks (1 and
586) from the official library's own test data. `npm run test:bitcoin-stamp`. It was first
run against the live registry and the explorers on Hunter's Mac on 15 October (Result,
above).

**First attempt, earlier on 15 October 2026, from a separate checking computer: NOT DONE.
The check could not start, so it was not a pass and not a fail. Kept as the record of that
attempt; the result is at the top.**

## In plain words

The plan was to take the batch's two public files from the live registry and check them
with the official OpenTimestamps tool, then compare the Bitcoin part by hand with two
block explorers. The first step failed: from the checking computer, neither the
terminal nor the web fetch tool was allowed to reach the registry, and the two files
are not saved anywhere in our repositories. Without them there is nothing to check, so
the check stopped there. `docs/mainnet-completeness.md` (R4 and item 7) still says the
official-client check is to do, and that stays true.

The steps are below so Hunter, or anyone with normal internet access, can run it in about
ten minutes. Nothing in it needs a key or a wallet.

## What was tried (15 October 2026)

1. **Looked for the files locally.** Searched both repositories (site
   `feat/lab-results` at `19674df`, registry `feat/lab-results` at `1f35505`) for
   `FE71`, `971004` and `.ots`. Only documentation mentions them
   (`docs/mainnet-completeness.md`, lines 44, 51 and 106). The registry repository's
   `veilcore.db` is a local test database; its `batches` table is empty. No `root.bin` or
   `root.bin.ots` for this batch is stored anywhere checked.
2. **Terminal download from the production registry:**
   ```
   curl -sS -m 30 -o root.bin     https://veilcore-api-production.up.railway.app/batches/B-20261011-FE71/root.bin
   curl -sS -m 30 -o root.bin.ots https://veilcore-api-production.up.railway.app/batches/B-20261011-FE71/root.bin.ots
   ```
   Both: `curl: (56) CONNECT tunnel failed, response 403`. The checking computer's
   network only allows listed hosts, and the registry is not one. Not worked around.
3. **Web fetch tool** for
   `https://veilcore-api-production.up.railway.app/batches/B-20261011-FE71/root.bin` and
   `https://veilcore-api-production.up.railway.app/batches/B-20261011-FE71`: both refused
   by the tool (`PROVENANCE_REQUIRED`: it only fetches addresses a person has given it).
   Not worked around.

4. **Installed the official client** to confirm the steps below:
   `pip install --break-system-packages opentimestamps-client` gave `ots --version` =
   `v0.7.2`. Its source confirms what the steps rely on: `ots info` prints
   `File sha256 hash: …` and, under a Bitcoin attestation, `# Bitcoin block merkle root …`
   already in the byte order explorers use; `ots --no-bitcoin verify` checks the file
   against the stamp and prints `To verify manually, check that Bitcoin block <n> has
   merkleroot <hex>`.

Steps not run, because there were no files to run them on: `ots info`, `ots verify`, the
SHA-256 comparison, and the explorer comparison.

## How to finish it (any computer with normal internet access)

```sh
mkdir fe71 && cd fe71
B=https://veilcore-api-production.up.railway.app/batches/B-20261011-FE71
curl -fsS -o root.bin     "$B/root.bin"
curl -fsS -o root.bin.ots "$B/root.bin.ots"

pip install opentimestamps-client     # the official client (on Linux add --break-system-packages if pip refuses)

sha256sum root.bin                    # (macOS: shasum -a 256 root.bin)
ots info root.bin.ots
ots verify -f root.bin root.bin.ots                  # needs a local Bitcoin Core node
ots --no-bitcoin verify -f root.bin root.bin.ots     # without one
```

What each should show, and what counts as a pass:

1. **`root.bin` is 32 bytes** (`ls -l root.bin`): the batch root as raw bytes, as SPEC.md's
   `opentimestamps` row says.
2. **The file the stamp is about.** `ots info` prints `File sha256 hash: <64 hex>` near the
   top. It must equal the output of `sha256sum root.bin`. If not: FAIL, stop.
3. **The Bitcoin attestation.** `ots info` must end a path in
   `verify BitcoinBlockHeaderAttestation(971004)`. If it only shows
   `PendingAttestation(...)`: the file was not upgraded; run `ots upgrade root.bin.ots` and
   look again. If it names another block, write down which.
4. **`ots verify`.** With a running Bitcoin Core node on the same computer it says
   `Success! Bitcoin block 971004 attests existence as of <date>`: PASS, done. Without a
   node it says `Could not connect to local Bitcoin node`; then run the `--no-bitcoin`
   line. It must not say `File does not match original!` (that is a FAIL), and it prints
   `To verify manually, check that Bitcoin block 971004 has merkleroot <hex>`. The same
   value is on the `# Bitcoin block merkle root` line of `ots info`. Do step 5 with it.
5. **By hand, against two explorers.** Read block 971004's merkle root from two explorers
   that don't share a backend (the value from step 4 is already in the byte order they
   print):
   ```
   curl -s https://mempool.space/api/block-height/971004            # prints the block hash
   curl -s https://mempool.space/api/block/<that hash>              # look at "merkle_root" and "timestamp"
   curl -s https://blockstream.info/api/block-height/971004         # must print the same hash
   curl -s https://blockstream.info/api/block/<that hash>           # "merkle_root" again
   ```
   PASS only if the value from step 4 equals `merkle_root` from both explorers, and both give
   the same block hash. The block's time should match the 2026-10-11 23:55:44 UTC in
   `docs/mainnet-completeness.md` (`timestamp` is in Unix seconds:
   `date -u -d @<timestamp>`).

Write the outputs into this file under a new dated heading, with the result, and update
R4 and item 7 in `docs/mainnet-completeness.md`.

## Full output, as printed on Hunter's Mac (15 Oct 2026)

```
chunk@Chunks-MacBook-Air veilcore % npm run check:bitcoin-stamp -- B-20261011-FE71

> @veilcore/workspace@0.1.0 check:bitcoin-stamp
> node scripts/check-bitcoin-stamp.mjs B-20261011-FE71

Bitcoin stamp check: batch B-20261011-FE71 (2026-10-15T13:26:58.495Z)

1. The batch files
  https://veilcore-api-production.up.railway.app/batches/B-20261011-FE71/root.bin
  https://veilcore-api-production.up.railway.app/batches/B-20261011-FE71/root.bin.ots
  root.bin:      32 bytes, contents 2e0be735fa4be9155d93282be2c19da4d9f46da45ade29183e2b01b768c3225b
  root.bin.ots:  2895 bytes, SHA-256 540cc44691a644b7898a4341c49587718d61ed40bbf12f8b0065244811edd6cc

2. The stamp file is about root.bin
  the stamp starts from (sha256):  b4bfd264bb803e4793d4e40a033ef11eaa2d74aeee170b9af5a3c394c92b2bc4
  sha256(root.bin):                b4bfd264bb803e4793d4e40a033ef11eaa2d74aeee170b9af5a3c394c92b2bc4
  match

3. What the stamp file attests
  pending at https://bob.btc.calendar.opentimestamps.org, after 14 steps
  bitcoin block 971004, after 82 steps
  pending at https://alice.btc.calendar.opentimestamps.org, after 10 steps
  bitcoin block 971005, after 78 steps
  pending at https://btc.calendar.catallaxy.com, after 10 steps
  pending at https://finney.calendar.eternitywall.com, after 12 steps

4. Bitcoin block 971004
  the stamp's steps end on (header byte order):   cdd7e073e842820b9ae29941a2419932d6c3a6cc30fb2da69acbc9eda73f5f75
  so block 971004's merkle root must be (explorer order): 755f3fa7edc9cb9aa62dfb30cca6c3d6329941a24199e29a0b8242e873e0d7cd
  mempool.space:
    block hash:            000000000000000000012ae85ff3cdc65ea795ae3facbcad20da8f6b462956a1
    merkle_root:           755f3fa7edc9cb9aa62dfb30cca6c3d6329941a24199e29a0b8242e873e0d7cd
    height:                971004
    timestamp:             1791762944 (2026-10-11 23:55:44 UTC)
    header:                00e0ff3fc5b094d6b5f10f40fa3920ee8df31ccf52edff55e4ce01000000000000000000cdd7e073e842820b9ae29941a2419932d6c3a6cc30fb2da69acbc9eda73f5f750022cc6af01e021747558224
    header hashes to:      000000000000000000012ae85ff3cdc65ea795ae3facbcad20da8f6b462956a1
    header's merkle root:  755f3fa7edc9cb9aa62dfb30cca6c3d6329941a24199e29a0b8242e873e0d7cd
    header's time:         1791762944 (2026-10-11 23:55:44 UTC)
    matches the stamp
  blockstream.info:
    block hash:            000000000000000000012ae85ff3cdc65ea795ae3facbcad20da8f6b462956a1
    merkle_root:           755f3fa7edc9cb9aa62dfb30cca6c3d6329941a24199e29a0b8242e873e0d7cd
    height:                971004
    timestamp:             1791762944 (2026-10-11 23:55:44 UTC)
    header:                00e0ff3fc5b094d6b5f10f40fa3920ee8df31ccf52edff55e4ce01000000000000000000cdd7e073e842820b9ae29941a2419932d6c3a6cc30fb2da69acbc9eda73f5f750022cc6af01e021747558224
    header hashes to:      000000000000000000012ae85ff3cdc65ea795ae3facbcad20da8f6b462956a1
    header's merkle root:  755f3fa7edc9cb9aa62dfb30cca6c3d6329941a24199e29a0b8242e873e0d7cd
    header's time:         1791762944 (2026-10-11 23:55:44 UTC)
    matches the stamp

4. Bitcoin block 971005
  the stamp's steps end on (header byte order):   708820fbad7817eb36869b8fb7d139aba2d24bfcb8c763b0fc21eb542e8d617a
  so block 971005's merkle root must be (explorer order): 7a618d2e54eb21fcb063c7b8fc4bd2a2ab39d1b78f9b8636eb1778adfb208870
  mempool.space:
    block hash:            0000000000000000000042601b4858534f518c3fc526a6f1544a728d92f8ead4
    merkle_root:           7a618d2e54eb21fcb063c7b8fc4bd2a2ab39d1b78f9b8636eb1778adfb208870
    height:                971005
    timestamp:             1791762792 (2026-10-11 23:53:12 UTC)
    header:                0060ae2ca15629466b8fda20adbcac3fae95a75ec6cdf35fe82a01000000000000000000708820fbad7817eb36869b8fb7d139aba2d24bfcb8c763b0fc21eb542e8d617a6821cc6af01e0217ed603da5
    header hashes to:      0000000000000000000042601b4858534f518c3fc526a6f1544a728d92f8ead4
    header's merkle root:  7a618d2e54eb21fcb063c7b8fc4bd2a2ab39d1b78f9b8636eb1778adfb208870
    header's time:         1791762792 (2026-10-11 23:53:12 UTC)
    matches the stamp
  blockstream.info:
    block hash:            0000000000000000000042601b4858534f518c3fc526a6f1544a728d92f8ead4
    merkle_root:           7a618d2e54eb21fcb063c7b8fc4bd2a2ab39d1b78f9b8636eb1778adfb208870
    height:                971005
    timestamp:             1791762792 (2026-10-11 23:53:12 UTC)
    header:                0060ae2ca15629466b8fda20adbcac3fae95a75ec6cdf35fe82a01000000000000000000708820fbad7817eb36869b8fb7d139aba2d24bfcb8c763b0fc21eb542e8d617a6821cc6af01e0217ed603da5
    header hashes to:      0000000000000000000042601b4858534f518c3fc526a6f1544a728d92f8ead4
    header's merkle root:  7a618d2e54eb21fcb063c7b8fc4bd2a2ab39d1b78f9b8636eb1778adfb208870
    header's time:         1791762792 (2026-10-11 23:53:12 UTC)
    matches the stamp

Result: PASS

The same check with the official OpenTimestamps tool:
  curl -fsS -o root.bin     https://veilcore-api-production.up.railway.app/batches/B-20261011-FE71/root.bin
  curl -fsS -o root.bin.ots https://veilcore-api-production.up.railway.app/batches/B-20261011-FE71/root.bin.ots
  pip install opentimestamps-client     # on Linux add --break-system-packages if pip refuses
  shasum -a 256 root.bin                # must equal "File sha256 hash" below (Linux: sha256sum)
  ots info root.bin.ots                 # ends in "verify BitcoinBlockHeaderAttestation(<height>)"
  ots --no-bitcoin verify -f root.bin root.bin.ots
                                        # prints "check that Bitcoin block <height> has merkleroot <hex>"
  ots verify -f root.bin root.bin.ots   # with a local Bitcoin Core node: "Success! Bitcoin block …"
```
