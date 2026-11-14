# Rehearsing the 2-of-3 committee on your own Mac

**Throwaway keys and a local network only.** Everything here runs on a Midnight network that
exists only inside Docker on your Mac and is deleted at the end. No step touches mainnet or
preprod. Never type the real maintenance key, a real wallet phrase, or a Blockfrost id into
any of it. The keys made here go in `/tmp` and are thrown away.

**Status, 14 November 2026: written, not yet run.** These steps come from a local test
against Midnight's Ledger 9 code and from Midnight's own fork-test files (midnight-js
`testkit-js/compose-fork.yml`). The machine they were written on has no Docker, so no step
below has been run end to end. If a step does not do what "Pass" says, **stop there**, copy
the last lines it printed (they hold no secret), and send them to the maintainer. Do not
improvise, and do not go on to mainnet. The mainnet install waits until every step here passes.

What it shows: a contract built like ours (compactc 0.31.1, one maintenance key, counter 16)
is deployed on a local Ledger 8 chain, the chain is moved to Ledger 9 the way mainnet was, and
then the committee tool replaces the one key with three keys, two of which must sign.

What is already shown without it (`node --test scripts/committee/committee.test.mjs`):
Midnight's Ledger 9 rules accept that change, refuse the old key afterwards, refuse one
signature, refuse a wrong counter and refuse a Ledger 8 signature. What only this rehearsal
can show: a real node, indexer, proof server and wallet doing it.

## What you need

- Docker Desktop, running, with 8 GB of memory (Settings, Resources).
- Node 24.11.1 and this repository, with `npm ci` done in its folder.
- The compiled contract: `cd contract && npm run compact && cd ..` (needs compactc 0.31.1,
  the version in `compiler-version`).
- Nothing else on ports 9944 and 8088. If the partner kit's local chain is up, stop it:
  `npm run local:down -w partner-kit`.

Two things are known to be uncertain. Both are checked by a step below, and either one
failing means stop:

- whether every image runs on an Apple Silicon Mac (step 1);
- whether the wallet keeps syncing across the fork (step 7). Midnight's own test harness
  reported in September that it did not.

## Steps

All commands are run from the repository folder unless a step says otherwise.

### 1. Start the local network

```
mkdir -p /tmp/vc-rehearsal && cat > /tmp/vc-rehearsal/compose.yml <<'EOF'
name: vc-rehearsal
services:
  chainspec:
    image: 'midnightntwrk/midnight-node:1.0.400'
    user: '0:0'
    entrypoint: ['/bin/bash', '-c']
    command:
      - 'test -s /chainspec/chainspec.json || /midnight-node build-spec > /chainspec/chainspec.json'
    environment:
      CFG_PRESET: 'dev'
    volumes:
      - chainspec:/chainspec
  runtime-blob:
    image: 'midnightntwrk/midnight-node:2.1.101'
    user: '0:0'
    entrypoint: ['/bin/bash', '-c']
    command:
      - >
        set -eu; wasm=midnight_node_runtime.compact.compressed.wasm; case "$$(uname -m)" in x86_64) arch=amd64 ;;
        aarch64|arm64) arch=arm64 ;; *) echo "unsupported architecture $$(uname -m)" >&2; exit 1 ;; esac; test -s
        "/runtime/$$wasm" || cp "/artifacts-$$arch/$$wasm" "/runtime/$$wasm"; chmod 644 "/runtime/$$wasm"; ls -l
        "/runtime/$$wasm"
    volumes:
      - runtime:/runtime
  node:
    image: 'midnightntwrk/midnight-node:2.1.101'
    depends_on:
      chainspec:
        condition: service_completed_successfully
      runtime-blob:
        condition: service_completed_successfully
    restart: 'no'
    ports:
      - '127.0.0.1:9944:9944'
    volumes:
      - chainspec:/chainspec:ro
      - node-data:/node
    environment:
      CFG_PRESET: 'dev'
      CHAIN: '/chainspec/chainspec.json'
      SHOW_CONFIG: 'false'
      SIDECHAIN_BLOCK_BENEFICIARY: '04bcf7ad3be7a5c790460be82a713af570f22e0f801f6659ab8e84a52be6969e'
    healthcheck:
      test:
        - 'CMD-SHELL'
        - >
          curl -fs -H 'Content-Type: application/json' -d
          '{"id":1,"jsonrpc":"2.0","method":"chain_getBlockHash","params":[1]}' http://localhost:9944 | grep -q
          '"result":"0x'
      interval: 2s
      timeout: 5s
      retries: 200
      start_period: 10s
  indexer:
    image: 'midnightntwrk/indexer-standalone:4.4.101'
    ports:
      - '127.0.0.1:8088:8088'
    environment:
      APP__INFRA__NODE__URL: 'ws://node:9944'
      APP__APPLICATION__NETWORK_ID: 'undeployed'
      APP__INFRA__STORAGE__PASSWORD: 'indexer'
      APP__INFRA__PUB_SUB__PASSWORD: 'indexer'
      APP__INFRA__LEDGER_STATE_STORAGE__PASSWORD: 'indexer'
      APP__INFRA__SECRET: '303132333435363738393031323334353637383930313233343536373839303132'
      APP__INFRA__SPO_NODE__URL: 'ws://node:9944'
      APP__INFRA__SPO_NODE__BLOCKFROST_ID: 'dummy-not-using-spo'
      APP__INFRA__SPO_NODE__RECONNECT_MAX_DELAY: '24h'
    depends_on:
      node:
        condition: service_healthy
  toolkit:
    profiles: ['tools']
    image: 'midnightntwrk/midnight-node-toolkit:2.1.101'
    volumes:
      - runtime:/runtime:ro
volumes:
  chainspec:
  runtime:
  node-data:
EOF
docker compose -f /tmp/vc-rehearsal/compose.yml up -d --wait
```

The values in that file that look like secrets are fixed test constants from Midnight's own
test files; they protect nothing.

**Pass:** it ends with `node` shown as `Healthy` and `indexer` as `Started` or `Running`,
and this prints a line holding `"specVersion"`:

```
curl -s -H 'Content-Type: application/json' -d '{"id":1,"jsonrpc":"2.0","method":"state_getRuntimeVersion","params":[]}' http://127.0.0.1:9944
```

Write the `specVersion` number down: it is the Ledger 8 chain's, and step 5 must change it.

**If an image will not run on your Mac** (an error about `platform` or `exec format`): add
the line `platform: linux/amd64` under that service's `image:` line in the file, run
`docker compose -f /tmp/vc-rehearsal/compose.yml down -v`, and start step 1 again.

### 2. Make the throwaway keys

One "old" key (it stands in for the paper key) and three committee keys:

```
export REPO="$(pwd)"
export R=/tmp/vc-rehearsal
node scripts/committee/cli.mjs keygen --holder old --out $R/old.key --card $R/old-card.json
node scripts/committee/cli.mjs keygen --holder hunter --out $R/hunter.key --card $R/hunter.json
node scripts/committee/cli.mjs keygen --holder mako --out $R/mako.key --card $R/mako.json
node scripts/committee/cli.mjs keygen --holder backup --out $R/backup.key --card $R/backup.json
```

**Pass:** four lines saying `Key written to ...`, and `ls $R` shows eight files besides
`compose.yml`. (`$REPO` and `$R` are used in the steps below; if you open a new Terminal
window, run the two `export` lines again from the repository folder.)

### 3. Point the tools at the local network

In the Terminal window you will use for every step from here on:

```
export MN_TEST_ENVIRONMENT=env-var-remote
export MN_TEST_NETWORK_ID=undeployed
export MN_TEST_INDEXER=http://127.0.0.1:8088/api/v4/graphql
export MN_TEST_INDEXER_WS=ws://127.0.0.1:8088/api/v4/graphql/ws
export MN_TEST_NODE=http://127.0.0.1:9944
export MN_TEST_NODE_WS=ws://127.0.0.1:9944
```

**Pass:** `echo $MN_TEST_NETWORK_ID` prints `undeployed`. These are not secrets. They last
until you close the window; step 11 removes them.

### 4. Before the fork: deploy two practice contracts with the old key

Copy the old key to the clipboard (a throwaway, so the clipboard is fine here):

```
node -e "process.stdout.write(JSON.parse(require('fs').readFileSync('/tmp/vc-rehearsal/old.key','utf8')).signingKey)" | pbcopy
```

Then:

```
cd bboard-cli
npm run standalone
```

- Private-state password: any practice password, twice.
- Menu: type `1` (Deploy a new VeilCore contract).
- `Keep a maintenance authority? (Y/n)`: press Enter.
- `Signing key`: paste (Cmd+V), press Enter. Nothing shows.
- Wait while it deploys and adds the circuit keys. Copy the contract address it prints.
- Type `0` to exit.

Run `npm run standalone` a second time the same way for a second contract (it is retired in
step 10). Then:

```
export A1=<first address>
export A2=<second address>
npm run committee -- undeployed show --address $A1
npm run committee -- undeployed show --address $A2
```

**Pass:** both say `1 key(s); 1 signature(s) needed for any change; counter 16.` That is
the main contract's shape on mainnet. Any other counter: stop.

### 5. The fork: move the local network to Ledger 9

```
docker compose -f /tmp/vc-rehearsal/compose.yml --profile tools run --rm toolkit runtime-upgrade --wasm-file /runtime/midnight_node_runtime.compact.compressed.wasm -c //Dave -c //Eve -t //Alice -t //Bob --rpc-url ws://node:9944 --signer-key //Alice
```

(`//Alice` and the others are the built-in test accounts of a local chain, not keys of ours.)
The command returns once the upgrade is submitted; it takes effect a few blocks later. Wait a
minute, then:

```
curl -s -H 'Content-Type: application/json' -d '{"id":1,"jsonrpc":"2.0","method":"state_getRuntimeVersion","params":[]}' http://127.0.0.1:9944
HEAD=$(curl -s -H 'Content-Type: application/json' -d '{"id":1,"jsonrpc":"2.0","method":"chain_getFinalizedHead","params":[]}' http://127.0.0.1:9944 | sed 's/.*"result":"\([^"]*\)".*/\1/')
curl -s -H 'Content-Type: application/json' -d '{"id":1,"jsonrpc":"2.0","method":"midnight_ledgerVersion","params":["'$HEAD'"]}' http://127.0.0.1:9944
```

**Pass:** `specVersion` is higher than the number from step 1, and the last line names
ledger `9.1.0.1`. If it still shows the old values, wait another minute and run the three
lines again. Then both contracts must read exactly as before the fork:

```
npm run committee -- undeployed show --address $A1
```

**Pass:** `1 key(s); 1 signature(s) needed for any change; counter 16.`

### 6. Dry run of the install

```
npm run committee -- undeployed install --address $A1 --card $R/hunter.json --card $R/mako.json --card $R/backup.json --dry-run --out $R/dry-install.json
```

When it asks for the current maintenance key, paste the old key (copy it again with the
`pbcopy` line from step 4).

**Pass:** it prints `Now:` with 1 key and counter 16, `After:` with 3 keys, 2 signatures
needed and counter 17, each key in full, the warning that a wrong committee key is
PERMANENT, and ends with `DRY RUN, nothing sent`. Check the three keys under `After:`
against the `publicKey` in each card file. `show` still says counter 16.

### 7. The install

```
npm run committee -- undeployed install --address $A1 --card $R/hunter.json --card $R/mako.json --card $R/backup.json --out $R/installed.json
```

Paste the old key when asked. It starts a Ledger 9 proof server, syncs the local chain's
built-in wallet, and asks you to type `INSTALL`.

**Pass:** it prints `Sent: transaction ...`, then `On chain now: 3 key(s); 2 signature(s)
needed for any change; counter 17.`, and writes `$R/installed.json`. Then:

```
npm run committee -- undeployed show --address $A1 --card $R/hunter.json --card $R/mako.json --card $R/backup.json
npm run committee -- undeployed install --address $A1 --card $R/hunter.json --card $R/mako.json --card $R/backup.json
```

**Pass:** `show` lists the three keys with the names hunter, mako and backup, and counter
17. The second `install` says `This committee is already installed. Nothing to do.` and asks
for nothing.

**If the wallet never finishes syncing, or the send fails:** this is the uncertain part named
at the top. Stop, copy the last lines, and send them. Run `show`: if it still says counter
16, nothing changed.

### 8. The old key is refused; one signature is refused

A request to change the backup holder, which needs two signatures:

```
node $REPO/scripts/committee/cli.mjs keygen --holder backup --out $R/backup2.key --card $R/backup2.json
npm run committee -- undeployed request --address $A1 --replace --card $R/hunter.json --card $R/mako.json --card $R/backup2.json --reason "rehearsal" --out $R/request.json
node $REPO/scripts/committee/cli.mjs sign --request $R/request.json --key-file $R/old.key --out $R/sig-old.json
node $REPO/scripts/committee/cli.mjs sign --request $R/request.json --key-file $R/hunter.key --out $R/sig-hunter.json
npm run committee -- undeployed submit --request $R/request.json --sig $R/sig-hunter.json --dry-run --out $R/dry-one.json
```

Type `SIGN` each time `sign` asks.

**Pass:** the `sign` with `old.key` says `This key ... is not on the contract's current
committee` and writes no `sig-old.json`. The `sign` with `hunter.key` writes
`sig-hunter.json`. The `submit` with one signature says `1 valid signature(s) from different
committee members; 2 are needed. Nothing was sent.`

(That the network itself refuses the old key and a single signature, not only our tool, is
checked against Midnight's ledger code by the tests. This tool will not send either, so the
rehearsal cannot send them.)

### 9. Two signatures are accepted

```
node $REPO/scripts/committee/cli.mjs sign --request $R/request.json --key-file $R/mako.key --out $R/sig-mako.json
npm run committee -- undeployed submit --request $R/request.json --sig $R/sig-hunter.json --sig $R/sig-mako.json --dry-run --out $R/dry-two.json
npm run committee -- undeployed submit --request $R/request.json --sig $R/sig-hunter.json --sig $R/sig-mako.json --out $R/rotated.json
npm run committee -- undeployed show --address $A1
npm run committee -- undeployed submit --request $R/request.json --sig $R/sig-hunter.json --sig $R/sig-mako.json
```

Type `SIGN` for the first command, and `SEND` when the third asks.

**Pass:** the dry run ends with `DRY RUN, nothing sent`. The send prints `Sent: transaction
...`. `show` says 3 keys, 2 needed, counter 18, and its third key is the `publicKey` in
`backup2.json`. The last command says `The chain already shows this change. Nothing to send.`

### 10. Retiring, on the second practice contract only

The second contract still has the one old key. Retire it for good:

```
npm run committee -- undeployed request --address $A2 --retire --reason "rehearsal" --out $R/retire.json
node $REPO/scripts/committee/cli.mjs sign --request $R/retire.json --key-file $R/old.key --out $R/sig-retire.json
npm run committee -- undeployed submit --request $R/retire.json --sig $R/sig-retire.json --out $R/retired.json
npm run committee -- undeployed show --address $A2
npm run committee -- undeployed show --address $A1
```

Type `SIGN`, then `SEND`.

**Pass:** `show` for the second contract says `Retired: an empty committee; nobody can change
this contract. Counter 17.` The first contract is untouched: 3 keys, counter 18.

### 11. Write it down, then throw it all away

Write a short `docs/log/committee-rehearsal-<date>.md`: which steps passed, the counters, the
image versions, your Mac's chip, and anything that surprised you. No keys go in it (they are
throwaways, but keep the habit).

```
cd ..
docker compose -f /tmp/vc-rehearsal/compose.yml down -v
rm -rf /tmp/vc-rehearsal
unset MN_TEST_ENVIRONMENT MN_TEST_NETWORK_ID MN_TEST_INDEXER MN_TEST_INDEXER_WS MN_TEST_NODE MN_TEST_NODE_WS A1 A2 R REPO
pbcopy < /dev/null
```

**Pass:** `docker ps` shows no `vc-rehearsal` containers, and `/tmp/vc-rehearsal` is gone.

## What this rehearsal does not cover

These are in the test plan and have no commands here yet, because this repository's tools
cannot do them on a local Ledger 9 network today:

- **Using the contract after the fork** (issuing, countersigning and presenting a licence).
  The CLI's local mode starts a Ledger 8 proof server; after the fork it needs the Ledger 9
  one.
- **Removing a circuit key and putting it back.** The wallet in this repository uses
  ledger-v9 1.0.0, which works out too small a fee for a key removal; Midnight's release
  notes say the network rejects it. The fix is in 1.0.1, which the committee tool builds
  with, but the wallet pays the fee. A replace-authority costs the same in both.
- **Inserting a key compiled with compactc 0.36** and proving that circuit against existing
  data. The tool inserts only keys in the format our contract already uses.
- **`npm run verify:deployment`**, which checks the addresses in `deployments/`, not a local
  contract. `show` is the check here.
- **A failed change costing a fee but changing nothing.** The tool refuses to send what the
  network would refuse.

None of these is needed for the install itself. They matter for what comes after it
(`docs/upgrades.md`).
