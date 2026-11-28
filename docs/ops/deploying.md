# Deploying the web app

(Moved from the README on 23 October 2026: it is for whoever runs the site, not for a first-time reader.)

Always use `--prebuilt`. A bare `vercel --prod` builds from source and has broken production before.

The script runs the Vercel CLI pinned in `tools/vercel/` (exact version, own lockfile), never `npx vercel`, which would download whatever version is newest at deploy time. To upgrade it, change the version in `tools/vercel/package.json` and run `npm install --package-lock-only` in that folder.

veilcore.org is published from the maintainer's Mac with `deploy:mainnet`, with the relay and
sponsor addresses written out in full (no `<…>` placeholders: the shell refuses them):

```bash
VITE_INDEXER_RELAY_URL=https://veilcore-indexer-relay-production.up.railway.app/indexer \
VEILCORE_MAINNET_SPONSOR=https://veilcore-sponsor-mainnet-production.up.railway.app \
npm run deploy:mainnet
```

The proving keys and parameters are not in the site's build: they are published once on
`https://keys.veilcore.org` (`npm run publish:proof-files`, [`docs/proof-files.md`](../proof-files.md)),
and `deploy:mainnet` and `deploy:test` download and check every one of them before building, and
refuse if any is missing or different. A site deploy no longer stores them on Vercel (they were
over 135 MB of every deploy, and filled the Hobby team's 10 GB).

The site talks to the production registry (`https://veilcore-api-production.up.railway.app`).
To build against another one, add `VEILCORE_MAINNET_REGISTRY=https://<registry>`; the script
refuses anything that is not a plain https address, before building anything.

Then commit the release list (`git add releases && git commit -m "Release list: mainnet"`)
and push. More in [`docs/ops/mainnet-day-site.md`](mainnet-day-site.md) and `CLAUDE.md`,
"Deploying veilcore.org". test.veilcore.org is published with `npm run deploy:test`
([`docs/test-site.md`](../test-site.md)).

**Never run `npm run deploy:prod`.** It is the old deploy from before mainnet. It builds
veilcore.org without the sponsor and with the test-network wording. It now reads the
registry's `/.well-known/veilcore-registry` and refuses because the registry anchors on
mainnet, but don't rely on that.

Order when more than one part changed: registry, then sponsor, then site (`CLAUDE.md`).
`deploy:mainnet` and `deploy:test` refuse unless the registry's `/health` lists every feature in
`scripts/registry-features.mjs` (and, for a build that makes agreements, its `AGREEMENT_FEATURES`): a site build against a registry without one of them fails the people
who use it.

Each deploy writes a release manifest before uploading (`scripts/release-manifest.mjs`):
the SHA-256 of every file served, the security headers, the build mode, every `VITE_*` setting
and the Node and npm versions, at `releases/<network>/<commit>.json` (`prod` for
`deploy:prod`). Commit and push it with the release. Anyone can then check a live copy
(`npm run check:site -- <address>`, which also fetches every page address the app serves and a
random one, the way a browser opens a page) and rebuild the release from the code to compare
(`npm run check:rebuild -- releases/<network>/<commit>.json`; use the Node version it names).
Neither can prove a host sent everyone the same files.

