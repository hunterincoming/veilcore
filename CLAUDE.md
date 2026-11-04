# Working on VeilCore

Read this before changing anything here. It is for any agent or person working in this repo.
The rules below come from things that went wrong before; each one has a reason.

## What this is

VeilCore dates records (plants, animals, microbes and cell lines, documents) on Midnight without
the data leaving the holder's device. This repo is the website and app (`bboard-ui`), the fee
sponsor (`sponsor`), the contracts (`contract`) and the deploy scripts (`scripts`). The registry
is a separate repo (`veilcore-api`), and so is the SDK and spec (`veilcore-sdk`, `SPEC.md`).

## Never

- **Secrets in text.** No wallet seed or recovery phrase, Blockfrost project id, operator or
  status token, age key, Vercel token or maintenance key in chat, files, commit messages or the
  command line. To use a token: copy it from Railway, `read -s TOKEN`, use `$TOKEN`, then
  `unset TOKEN; pbcopy < /dev/null`. The header is `x-operator-token`.
- **Force-push**, or rewrite published history. A commit with a bad message gets redone on a new
  branch and the old branch is deleted unmerged.
- **Merge with a failing check.**
- **`npm audit fix`**, or upgrading npm. Lockfile changes are made by hand, one entry at a time.
- **Change or recompile the contracts** (`contract/`). A local `--skip-zk` compile for tests is
  fine.
- **`vercel git connect`**, or a Vercel deploy from anywhere but the maintainer's Mac. Ignore
  Vercel's own `vercel deploy --prod` suggestions. Never run `npm run deploy:prod`: it is the old
  deploy and builds veilcore.org without the sponsor.
- **Touch a wallet's DUST settings**, re-register NIGHT, or put a retired sponsor seed back.
- **Kill a process by name.** Kill by PID.

## Deploying veilcore.org

Order matters when more than one part changes: registry, then sponsor, then site. Each step's
script checks the one before and refuses if it is not ready.

1. **Registry** (`veilcore-api`): merging to `main` deploys it (Railway).
2. **Sponsor**, only when `sponsor/` changed:
   `npm run stage -w sponsor`, then
   `railway up "<stage folder>" --path-as-root --service veilcore-sponsor-mainnet`.
   The stage step prints the TEST service name; do not use the line it prints. A Railway
   "Restart" does not apply new variables, and a new variable the running code refuses stops the
   sponsor: deploy the code first, then add the variable. Check `/sponsor/status` says
   `"synced": true` before the site deploy.
3. **Site**:
   `VITE_INDEXER_RELAY_URL=<relay>/indexer VEILCORE_MAINNET_SPONSOR=<sponsor> npm run deploy:mainnet`,
   then commit `releases/` ("Release list: mainnet") and push.

The test site deploys with `npm run deploy:test` and the preprod registry and sponsor
(`docs/test-site.md`).

## Before anything goes to a person outside the team

Open the actual file and read every page and every word as it renders (PDFs page by page,
pages in a browser, emails as sent). Check every fact against its source. Fix what is wrong
before it is sent, not after.

## Public wording

- A record shows **prior possession** by a date. Never "ownership" or "proves you own".
- No customer, pilot or adoption claims, and no names of people or organisations we are talking
  to, in the site, the repos or commit messages (they are public).
- No dollar figures in posts. Don't tag people.
- Say what is live where precisely: live on veilcore.org, on the test network, or not built.
  Nothing is called live until it has worked once on mainnet.
- Every user-facing string exists in all five languages (en, de, es, fr, ja); the tests check.

## Commits

Commit as the maintainer: `git config user.name "Hunter Roberts"` and
`git config user.email "293143993+hunterincoming@users.noreply.github.com"`, set in every clone
before the first commit. No co-author or session trailers. Never rewrite history to change
authorship of commits already pushed.

## Working style

- Research first: look at what existing projects do before building.
- Test before claiming done: unit tests, the end-to-end tests (`npm run e2e:build` first; the
  e2e server never builds by itself), and a look at the rendered result.
- Plain, short language. When steps are needed from the maintainer, give all of them in one
  message, in order, with the exact commands.
- What only the maintainer does: approve merges and deploys, anything touching a wallet, and
  anything sent to a real person.
