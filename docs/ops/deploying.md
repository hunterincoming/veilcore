# Deploying the web app

(Moved from the README on 23 October 2026: it is for whoever runs the site, not for a first-time reader.)

Always use `--prebuilt`. A bare `vercel --prod` builds from source and has broken production before.

The script runs the Vercel CLI pinned in `tools/vercel/` (exact version, own lockfile), never `npx vercel`, which would download whatever version is newest at deploy time. To upgrade it, change the version in `tools/vercel/package.json` and run `npm install --package-lock-only` in that folder.

```bash
npm run deploy:prod
```

veilcore.org is published with `npm run deploy:mainnet` ([`docs/ops/mainnet-day-site.md`](docs/ops/mainnet-day-site.md)),
and test.veilcore.org with `npm run deploy:test` ([`docs/test-site.md`](docs/test-site.md)).
`deploy:prod` published the test-network wording before mainnet; it reads the registry's
`/.well-known/veilcore-registry` and refuses now that the registry anchors on mainnet.

Deploy the registry before the site. All three deploys (`deploy:prod`, `deploy:mainnet` and
`deploy:test`) refuse unless the registry's `/health` lists every feature in
`scripts/registry-features.mjs` (and, for a build that makes agreements, its `AGREEMENT_FEATURES`): a site build against a registry without one of them fails the people
who use it.

Each of the three writes a release manifest before uploading (`scripts/release-manifest.mjs`):
the SHA-256 of every file served, the security headers, the build mode, every `VITE_*` setting
and the Node and npm versions, at `releases/<network>/<commit>.json` (`prod` for
`deploy:prod`). Commit and push it with the release. Anyone can then check a live copy
(`npm run check:site -- <address>`, which also fetches every page address the app serves and a
random one, the way a browser opens a page) and rebuild the release from the code to compare
(`npm run check:rebuild -- releases/<network>/<commit>.json`; use the Node version it names).
Neither can prove a host sent everyone the same files.

