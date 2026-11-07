# Lockfile review: WebLLM for Ask's on-device model (7 November 2026)

Branch `ask-ondevice-model`. Ask's opt-in on-device model (docs/ask-veilcore.md, "v2.1") runs
in the browser with WebLLM. This file is the entry-by-entry review of what adding it did to
`package-lock.json`.

## How the lockfile was written

- npm 11.6.2 (what CI uses), run from a separate copy of Node 24.11.1; the machine's own npm
  was not upgraded. No `npm audit fix`.
- `npx -y npm@11.6.2 install --package-lock-only --ignore-scripts --save-exact --no-audit
  --no-fund -w bboard-ui @mlc-ai/web-llm@0.2.86`, so `bboard-ui/package.json` has the exact
  version, no range.
- Running npm a second time on the result (`install --package-lock-only`) changed nothing: the
  lockfile is a fixed point. `npm ci` installs from it.
- Each new entry was checked with `npm view <name>@<version>`: the registry's integrity hash
  matches the lockfile's, and neither package has an install script (`preinstall`, `install`,
  `postinstall`). WebLLM's `prepare` script runs only for a git checkout, never for a
  registry tarball.

Footprint: **2 added, 0 removed, 0 changed.**

## Entries

| Entry | Version | Integrity (lockfile = `npm view`) | Published | Install scripts |
|---|---|---|---|---|
| `node_modules/@mlc-ai/web-llm` | 0.2.86 | `sha512-plciXBCYtY7iTKHzEcsqOfSO+s5u8NqMYFPnHmRbsN8CEdKcolgXIoGLPbzO6FtJHV43m7YP00x6qQ6Kb8CJJw==` | 11 Oct 2026 | none |
| `node_modules/loglevel` | 1.9.2 | `sha512-HgMmCqIJSAKqo68l0rS2AanEWfkxaZ5wNiEFb5ggm08lDs9Xl2KxBlX3PTcaD2chBM1gXAYf491/M2Rv8Jwayg==` | 6 Sep 2024 | none |

- **@mlc-ai/web-llm 0.2.86**, Apache-2.0. Maintainers on npm: tqchen, akaashrp, charliefruan,
  neetnestor, rickzx, ruihanglai, sudeepag (the MLC team). One runtime dependency,
  `loglevel ^1.9.1`. Its own runtime pieces (the TVM WebAssembly runtime, the tokenizer and
  xgrammar) are bundled inside `lib/index.js` (6.8 MB). The tarball the review read was
  downloaded separately and hashed: its SHA-512 is the integrity above. 0.2.87 exists; 0.2.86
  is the version the model library files below were built for, and is pinned on purpose.
- **loglevel 1.9.2**, MIT, maintainer pimterry. No dependencies.

`lib/index.js` was read for what it fetches and runs: the model's files go through the Cache
API under `webllm/config`, `webllm/model` and `webllm/wasm`, keyed by their full address, and
are fetched only when the cache has no entry. The model library (`model_lib`) is fetched from
this site's own address when the address is relative. No `eval` and no `new Function`.

## The model library files (not npm)

WebLLM needs a compiled WebAssembly library per model. They are not on npm; they come from
`mlc-ai/binary-mlc-llm-libs`, pinned to commit
`146ed9cd4b4062e967b017fd2291f7106b50599f`, folder `web-llm-models/v0_2_86/base/` (the
`modelVersion` WebLLM 0.2.86 itself names). Downloaded from GitHub on 7 November 2026 and
served from this site (`bboard-ui/public/ask-model/`), never from GitHub at run time:

| File | Bytes | SHA-256 |
|---|---|---|
| `Qwen3-1.7B-q4f16_1_cs1k-webgpu.wasm` | 6386879 | `f13c5ceb34a7c2fc75b09744aed8013e89cf198b423c4fd24a6ef6d648267083` |
| `Qwen3-0.6B-q4f16_1_cs1k-webgpu.wasm` | 6358805 | `19a1721867a481806adef35de0e0d0f2f4ff00a0c2e80d65b175fa55f21649c9` |

The same hashes are in `bboard-ui/src/ask-local/model-manifest.json`; WebLLM checks the file
against them before it compiles it (`integrity.model_lib`), and a unit test checks the files
in `public/` against them.
