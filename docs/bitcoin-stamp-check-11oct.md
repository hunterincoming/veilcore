# Bitcoin stamp check: batch B-20261011-FE71 (block 971004)

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
586) from the official library's own test data. `npm run test:bitcoin-stamp`. It has not
been run against the live registry or the explorers: the checking computer can't reach
them.

**Checked 15 October 2026. Result: NOT DONE. The check could not start, so this is not a
pass and not a fail.**

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
