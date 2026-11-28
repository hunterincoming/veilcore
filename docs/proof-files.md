# Proof files: keys.veilcore.org

The proving keys and Midnight's public parameters are the big files the browser needs to make a
proof: 54 keys (135.5 MB) and 4 parameter files (k=13 to k=16). They never change for a
contract version.

Until 27 November 2026 every build of the site carried a full copy, so every `deploy:mainnet` and
`deploy:test` stored another copy on Vercel. The Hobby team has 10 GB of deployment storage, and
it kept filling up. Now the files are published **once**, on VeilCore's own file host
`https://keys.veilcore.org` (a second project, `veilcore-proof-files`, on the same Vercel team),
and the site reads them from there. A site deploy no longer stores them.

## How the site uses them

- The site's build pins the SHA-256 of every key and parameter file:
  `bboard-ui/src/veilcore/chain/proof-files.json`. These are the same fingerprints as
  `deployments/mainnet.json` (the `zk-r4` release) and `bboard-ui/scripts/params.sha256.json`
  (Midnight's own list); `scripts/deployments.test.mjs` and `proof-files.test.ts` fail if they
  ever differ.
- The page fetches each file by its fingerprint, `https://keys.veilcore.org/sha256/<SHA-256>`,
  and checks it before using it, and again when it reads it back from the browser's cache. A file
  that doesn't match is never used. So the host doesn't have to be trusted, only reached.
- The browser's cache is looked at first, under both addresses a copy may be kept at (the
  host's, and this site's own `/keys/` and `/params/`, where a visitor from before 27 November
  2026 has one); a good copy is used without downloading it again.
- If the host has no good copy, the site's own `/keys/` and `/params/` are tried too, with the
  same check (a self-hosted copy may serve them there; `docs/SELF-HOSTING.md`, step 6).
- If no good copy can be had, the visitor sees, in their language: "The proving files could not
  be downloaded right now. Nothing was sent. Try again in a few minutes." A wrong file: "A proving
  file was not the exact file this site was built to use, so it was not used. Nothing was sent."
- After the first download the browser keeps the files (Cache Storage), so a visitor who has
  proved before doesn't need the host again.
- The circuits (`/zkir/`) and `compiler/contract-info.json` are small and stay in the site.
- The release list (`releases/<network>/<commit>.json`) has a `proofFiles` section: the host and
  every file the release reads from it, with its SHA-256.
- Privacy: the host is VeilCore's, on the same Vercel team as the site. It has no page, no
  scripts, no analytics. It sees what Vercel sees for the site: the visitor's IP address and which
  public file was asked for. No record goes near it.
- Evidence bundles and offline copies are unchanged: they never carried the keys
  (`@veilcore/contracts` fetches its own from the `zk-r4` release and checks them).

## What the deploys check

`npm run deploy:mainnet` and `npm run deploy:test` download every pinned file from
keys.veilcore.org and check its SHA-256 **before building** (over 135 MB, a minute or so). Any
file missing or different, and they stop with `NOT DEPLOYED` and say to publish first. They also
refuse a build folder that still has `keys/` or `params/` in it. They no longer need the keys or
parameters on this computer.

`npm run check:proof-files` runs the same check on its own.

## Hunter's one-time setup (on the Mac)

After this change is merged, and before the next site deploy. In this order:

1. **Free space on Vercel first** (the storage may be full now, and the first publish uploads
   about 135 MB plus the parameters). On vercel.com: team **veil-core** → the veilcore.org project
   → **Deployments** → set the environment filter to **Preview** → tick every preview deployment
   except the newest one (test.veilcore.org runs on it) → **Delete**. Leave the Production
   deployments alone: rollbacks use them.
2. **Wait for CI on `main` to go green after the merge**:
   https://github.com/hunterincoming/veilcore/actions?query=branch%3Amain. The newest **CI** and
   **Scan** runs (for the merge commit) must both show a green tick. The publish refuses
   otherwise.
3. **In Terminal**:

   ```bash
   cd ~/Desktop/veilcore
   git checkout main && git pull
   npm ci
   npm exec --package=@veilcore/contracts@0.3.0 -- veilcore-keys fetch --to contract/src/managed
   cd bboard-ui && node scripts/fetch-params.mjs && cd ..
   npm run publish:proof-files
   npm run check:proof-files
   ```

4. If the last step says keys.veilcore.org answered 401: in Vercel, `veilcore-proof-files` →
   Settings → Deployment Protection, turn Vercel Authentication off, then run
   `npm run check:proof-files` again.
5. Then deploy the site as usual (`CLAUDE.md`, "Deploying veilcore.org").

What the commands do:

- The `veilcore-keys fetch` and `fetch-params.mjs` lines make sure every key and parameter is on
  the Mac, each checked against its fingerprint (they are the same commands the deploys used to
  need).
- `npm run publish:proof-files` runs only on the Mac, from `origin/main`, with CI green (the same
  gate as the site deploys). Every Vercel command it runs names the site's own Vercel team (the
  `orgId` in `~/Desktop/veilcore/.vercel/project.json`; it refuses if that is missing), and none
  sees `VERCEL_ORG_ID` or `VERCEL_PROJECT_ID`. The first time, it creates the Vercel project
  `veilcore-proof-files` and puts `keys.veilcore.org` on it (veilcore.org's DNS is on Vercel, so
  nothing else is needed). If Vercel can't say whether that project exists (an expired login,
  say), it stops instead of creating it. It stages the files in `~/.veilcore/proof-files-stage`
  (outside the repository), refuses if that folder is linked to the site's project, makes one
  production deployment, points keys.veilcore.org at it, then downloads every file back and checks
  it. Any failure ends with one `NOT PUBLISHED` line that says what to do.

## Later

- **Nothing to do on site deploys.** The host keeps its one production deployment.
- **A new contract version** (or new circuits): add their files to `proof-files.json`, merge, then
  run `npm run publish:proof-files` once before the site deploy that uses them. A publish never
  removes anything: every file the host already lists is downloaded, checked against its own
  fingerprint and published again, so an older release of the site keeps working.
- **Never** remove a row from `proof-files.json` to "clean up": the host keeps the file anyway, and
  the row is what older site releases are checked against.

## Storage

One copy of the proof files now sits in `veilcore-proof-files`, once: the 54 keys are
135.5 MB (sizes of the `zk-r4` release assets), plus the four parameter files. Each site deploy
drops from about 206 MB plus the parameters to about 70 MB (measured 27 November 2026 on a build
of this commit: the site's own files are about 70 MB, of which the videos in `/media` are 22 MB).
Older site deployments still holding
the keys age out under Vercel's retention; step 1 of the one-time setup frees the space sooner.
