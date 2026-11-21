# Bitcoin header fixtures: where each comes from

Every header here is a real Bitcoin mainnet header from a public source. Each file says its
source in its `source` field and, where it was cut from a larger file, that file's SHA-256 in
`sourceSha256`. All were fetched on 20 November 2026 and checked when they were made: every
header hashes to the hash given with it, and consecutive headers link (each one's
previous-block field is the hash of the one before).

| File | What | Source |
| --- | --- | --- |
| `mainnet-0-438.json` | Blocks 0 (genesis) to 438, consecutive | bitcoinj, `integration-test/src/test/resources/org/bitcoinj/core/first-100k-blocks.dat` (raw blocks in `blk*.dat` form; only the 80-byte headers kept). Block 0 hashes to the genesis hash, and block 1 is the header python-opentimestamps' own tests use (`scripts/fixtures/ots/expected.json`). |
| `mainnet-retarget-headers.json` | One header at every difficulty adjustment, heights 2016 to 878976 | bitcoinj, `core/src/main/resources/org.bitcoin.production.checkpoints.txt` (each line: base64 of chain work, height, 80-byte header) |
| `summa-spv.json` | Eight difficulty adjustments from December 2018 to April 2019 (an epoch's first block, its last block, the next block), and eight consecutive 2018 headers | summa-tx/bitcoin-spv, `testVectors.json` (`retargetAlgorithm`, `validateHeaderChain`). Its ninth adjustment vector is left out: its blocks don't link. Where a height is in both, its header is byte for byte the one bitcoinj has (a test checks). |
| `veilcore-fe71.json` | VeilCore's batch B-20261011-FE71 (`root.bin`, `root.bin.ots`) and blocks 971004 and 971005 | The registry's public batch files; the headers as mempool.space and blockstream.info both gave them on 15 October 2026 (`docs/bitcoin-stamp-check-11oct.md`). |

Bitcoin Core's difficulty tests (`src/test/pow_tests.cpp`) are copied as numbers into
`header-chain.test.ts`, each with the test it comes from.

Made-up headers appear only in the tests as attacks, made from these real ones (a changed
field, or a block mined at an easy target).
