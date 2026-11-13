# Check the deployed contracts against the source

Two checks, for anyone. Neither needs an account, a wallet or anything from VeilCore.

1. **The chain carries the published build.** Read each contract's verifier keys from a
   Midnight indexer and compare them with the published hashes. Needs Node and this repository;
   no compiler. About a minute.
2. **The published build comes from this source.** Compile the contracts yourself with the
   same compiler and compare every file's hash. Needs the Compact compiler 0.31.1.

Together they show that what runs on mainnet was compiled from the source in this repository.

The hashes live in [`deployments/mainnet.json`](../deployments/mainnet.json) (and
[`deployments/preprod.json`](../deployments/preprod.json) for the test network), described by
[`deployments/schema.json`](../deployments/schema.json). They are the same hashes as
[`docs/fingerprints.md`](fingerprints.md), the deployment record and the files served under
`/keys/` on veilcore.org (`releases/mainnet/`); a test (`scripts/deployments.test.mjs`) fails if
any of them disagree.

## What was deployed

| Contract | Mainnet address | Built from | Compiler |
|---|---|---|---|
| `veilcore` (24 circuits) | `a04de0a2684f3713276325649540c7278ffd07cba8b014e7489844f319a02347` | `ceb3a1606e29fb87da3def2d0c69036e99f1f055` | compactc 0.31.1 |
| `veilcore-claims` (5 circuits) | `ef763eb4ad1846b716dbfa90c00560a9a943ffb4d1fc638b0707df5adefd070d` | `c75c155e5eb48bcbc601cfb39db940a6aa6158a6` (source as at `cd30c11`) | compactc 0.31.1 |

Neither contract's source (`contract/src/*.compact`) has changed since those commits, so the
current `main` builds the same contracts. Both are Ledger 8 contracts (Compact runtime 0.16.0);
mainnet has run Ledger 9 since 6 November 2026, and the indexer now serves their state in
Ledger 9's format with the same verifier keys. The check reads both formats.

The circuit `proveOwnership` has a historical name: it proves knowledge of a record's secret,
which shows possession of the record (and, with the record's anchor date, prior possession). It
does not prove legal ownership. It keeps its name because renaming a circuit changes its keys.

## 1. Check the chain (no compiler)

```bash
git clone https://github.com/hunterincoming/veilcore.git
cd veilcore
npm ci
npm run verify:deployment -- --network mainnet
```

For each circuit it prints `PASS` or `FAIL` with the first 16 hex digits of the hash, then the
maintenance authority, then one result line. It exits 0 when everything matches, 1 when
anything differs, 2 when it could not check (an indexer unreachable, bad arguments, or two
indexers reporting different verifier keys or maintenance authority for a contract). An
internal error in the script itself (a bug: it is printed as is, with no `RESULT` line) also
exits 2: no verdict either way. Expected ending on mainnet:

```
RESULT: PASS. On mainnet, every circuit's verifier key matches the published build (29 of 29), and each maintenance authority is as published.
```

**Which indexer.** Without options it reads through VeilCore's public read-only relay
(`veilcore-indexer-relay-production.up.railway.app`), which needs no key. That relay is ours,
so a check that does not trust us should use an indexer you choose:

- your own Blockfrost project for Midnight Mainnet (free at blockfrost.io). Put its id in the
  environment without typing it on the command line, then run the same command:
  ```bash
  read -s VEILCORE_BLOCKFROST_PROJECT_ID && export VEILCORE_BLOCKFROST_PROJECT_ID
  npm run verify:deployment -- --network mainnet
  unset VEILCORE_BLOCKFROST_PROJECT_ID
  ```
  The id is never printed; only host names are.
- or any indexer: `--indexer <GraphQL URL>`, and `--second-indexer <URL>` to require two
  indexers to agree on what the verdict rests on: every circuit's verifier key and the
  maintenance authority. The rest of the state (the ledger data, which changes with every
  anchored batch) is not compared, so two indexers a block apart still agree. If they disagree
  on a key or the authority, or a state cannot be read, that contract is not checked and the
  run ends `RESULT: CANNOT CHECK: …` with exit 2; try again shortly. If any other contract
  differs from the file, the run is still a `FAIL` (exit 1) and names the contracts not
  checked.

**What it compares.** The SHA-256 of each circuit's verifier key in the contract's current
state, against `circuits.<name>.verifierKey` in the deployments file. Midnight checks every proof
against the verifier key stored in the contract, so matching keys mean the chain only accepts
calls proved against the published circuits. A circuit that is missing, extra, or has a
different key is a `FAIL`. The maintenance authority (who could change the keys) is compared
with `maintenanceAuthority`: the claims contract must show an empty committee (no key can change
it); the main contract one key and threshold 1, with its counter printed (it is not recorded
yet; 16 is expected). The comparison is `checkContractState` in `api/src/state-check.ts`, the
check the registry and the partner kit run before trusting a state.

**What it does not show.** The indexer is trusted for what it reports; use two you trust for a
decision that matters. It checks the state now: a key swapped and restored in between would show
only as a higher authority counter.

## 2. Rebuild and compare (compiler 0.31.1)

### The toolchain

| | Version | Pinned in |
|---|---|---|
| Compact compiler (`compactc`) | **0.31.1** | `compiler-version`, `.github/workflows/ci.yaml` (with the Linux download's SHA-256) |
| Node | **24.11.1** (npm 11.6.2) | `.nvmrc`, CI |
| Compact runtime | 0.16.0 | `package.json` |

Node only runs the scripts; the compiler alone decides the compiled files. A different
compiler version produces different circuits and keys, so nothing will match.

### Install compiler 0.31.1

macOS or Linux, with Midnight's installer at a fixed release (not "latest"):

```bash
curl --proto '=https' --tlsv1.2 -LsSf \
  https://github.com/midnightntwrk/compact/releases/download/compact-v0.5.3/compact-installer.sh | sh
# open a new terminal, then:
compact update 0.31.1
compact compile --version        # must print 0.31.1
```

On Linux x86-64 you can instead take the compiler release directly, as CI does
(`.github/workflows/ci.yaml`, "Install Compact compiler"), check it, unpack it, and add the
same small `compact` shim CI uses, because `contract/package.json` runs `compact compile`:

```bash
dir="$HOME/compactc-0.31.1"
zip="$dir.zip"
curl -fsSL --retry 3 -o "$zip" \
  https://github.com/midnightntwrk/compact/releases/download/compactc-v0.31.1/compactc_v0.31.1_x86_64-unknown-linux-musl.zip
echo "e291b4bab4d4e857707008f8b1c25c2b8e0c843f6c737d0ee6c0d9ac69a6bbfb  $zip" | sha256sum -c -
mkdir -p "$dir"
unzip -q "$zip" -d "$dir"
# `compact compile …` goes straight to the pinned compactc; nothing else is available.
cat > "$dir/compact" <<'SHIM'
#!/usr/bin/env bash
set -euo pipefail
if [ "${1:-}" != "compile" ]; then echo "compact (CI): only 'compile' is available" >&2; exit 2; fi
shift
exec compactc "$@"
SHIM
chmod +x "$dir/compact"
export PATH="$dir:$PATH"        # in this terminal; add it to your shell profile to keep it
compact compile --version       # must print 0.31.1
```

(CI records this checksum. No checksum for the macOS download is recorded in this repository.)

From the repository, `npm run check:compiler` says whether the installed compiler is the pinned
one (`-- --strict` makes a mismatch an error).

### Build and compare

Build on `main`, as cloned above. Stay on it: the commits in the table are where each
contract was built, but the scripts used here (`verify:build`, `check:compiler`) and the
`compact` step that builds both contracts are newer (at `ceb3a16` the claims contract did not
exist yet, and `npm run compact` builds only the main one). The contracts' source on `main` is
the same as at those commits, which you can check yourself; each command prints nothing:

```bash
git diff ceb3a1606e29fb87da3def2d0c69036e99f1f055 main -- contract/src/veilcore.compact
git diff c75c155e5eb48bcbc601cfb39db940a6aa6158a6 main -- 'contract/src/*.compact'
```

(`contract/src/` holds more than the contracts: TypeScript checking code and tests, which have
changed since and are not compiled into either contract. The `.compact` files are the whole
source of both.)

```bash
nvm use                                                 # Node 24.11.1 from .nvmrc
npm ci
npm run check:compiler -- --strict
cd contract && npm run compact && cd ..                 # both contracts, keys included
npm run verify:build -- --network mainnet
```

`npm run compact` writes `contract/src/managed/` (git-ignored). Generating keys downloads
Midnight's public proving parameters, so it needs the internet. `verify:build` hashes every file
and compares it with `deployments/mainnet.json`: 97 files for the main contract (a prover key, a
verifier key, `.zkir` and `.bzkir` for each of 24 circuits, and `contract/index.js`) and 21 for
the claims contract. Expected ending: `PASS: all 118 artefacts match deployments/mainnet.json.`

The older check does the same against `docs/fingerprints.md`:
`cd contract && npm run fingerprints:check`.

Without the proving parameters, `compact compile --skip-zk` builds only the ZKIR and the
contract code; compare those with `npm run verify:build -- --network mainnet --partial`.
`verify:build` exits 0 when everything it compared matches, 1 when a file differs (or, without
`--partial`, is missing), and 2 when it cannot check: bad arguments, no build folder, or not
one artefact built to compare.

### What has been reproduced so far

The 24 + 5 `.zkir` files and both `contract/index.js` files have been rebuilt byte for byte from
the source with the checksummed compiler (6 October 2026, `docs/audit/README.md`). The prover and
verifier keys and the `.bzkir` files were built once, on the maintainer's Mac. **A full rebuild
by you would be the first independent check of the keys.** Whether key generation is
deterministic for a given compiler and parameter set has not been shown; if your keys differ,
please open an issue with the `verify:build` output.

### Check the published key files

The keys are also published as the `zk-r4` release of this repository, and served by the site
under `/keys/`. Their SHA-256 must equal the deployments file. Download one from the release,
with the GitHub CLI or with curl:

```bash
gh release download zk-r4 -R hunterincoming/veilcore -p 'veilcore.proveLicense.verifier'
# or
curl -fLO https://github.com/hunterincoming/veilcore/releases/download/zk-r4/veilcore.proveLicense.verifier
```

Then hash it. On macOS:

```bash
shasum -a 256 veilcore.proveLicense.verifier
# b338dda3501ae2dec26b241b353495580debcb359455b0671b6619197f29d59b
```

On Linux (`shasum` is not always installed there):

```bash
sha256sum veilcore.proveLicense.verifier
# b338dda3501ae2dec26b241b353495580debcb359455b0671b6619197f29d59b
```

Every key file in the release is named `<contract>.<circuit>.verifier` (for example
`veilcore-claims.proveRange.verifier`); its hash is `circuits.<circuit>.verifierKey` under that
contract in `deployments/mainnet.json`.

## The test network

`deployments/preprod.json` lists the contracts test.veilcore.org uses on Midnight's preprod
network, built from the same source. Check them with
`npm run verify:deployment -- --network preprod` (through the test site's relay, or your own
Blockfrost preprod project in `VEILCORE_BLOCKFROST_PREPROD_PROJECT_ID`).

## When this changes

A new contract version, a new compiler, or a change to either maintenance authority means a
new `deployments/<network>.json` entry and a new deployment record revision. The consistency
test (`node --test scripts/deployments.test.mjs`) keeps the file, `docs/fingerprints.md`, the
README addresses, the pinned addresses in `api/src/deploy-guard.ts`, the release manifests and
the pinned compiler in step.
