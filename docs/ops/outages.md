# When something is down

For outages, not attacks (those are `incident-response.md`). Written so either founder can
follow it from a phone or the Mac without a developer. Secrets rules from `CLAUDE.md` apply
throughout: tokens go in with `read -s`, never into a chat or a note.

## What watches what

| Monitor (UptimeRobot) | Address                                                                     | Alarm when           |
| --------------------- | --------------------------------------------------------------------------- | -------------------- |
| Site                  | `https://veilcore.org`                                                      | not 200              |
| Registry up           | `https://veilcore-api-production.up.railway.app/health`                     | not 200              |
| Registry problems     | `https://veilcore-api-production.up.railway.app/alerts`                     | not 200              |
| Sponsor problems      | `https://veilcore-sponsor-mainnet-production.up.railway.app/sponsor/alerts` | not 200              |
| Relay                 | `https://veilcore-indexer-relay-production.up.railway.app/health`           | not 200              |
| Relay upstream        | `https://veilcore-indexer-relay-production.up.railway.app/alerts`           | not 200              |
| Backups               | the healthchecks.io check behind `BACKUP_PING_URL`                          | a day with no backup |

`/alerts` (registry and relay) and `/sponsor/alerts` answer 503 with short codes when something
needs you; each one is below. The relay's `/health` only says the relay itself is running. Its
`/alerts` asks Blockfrost for the latest Midnight block, so it is the one that catches Blockfrost
being down. The relay upstream monitor is new (reliability audit, 19 Nov 2026): add it once the
relay with `/alerts` is deployed. The setup checklist is `docs/ops/reliability.md`.

## What each outage does to people

| Down     | What stops                                                                     | What keeps working                                             |
| -------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| Site     | everything in the browser                                                      | records already saved; evidence bundles check offline          |
| Registry | saving, check pages, lab deliveries and reports, dating of new records         | records in people's browsers and backup files; bundles offline |
| Sponsor  | new records get no Midnight date (and, unless the registry's seal timer is on, no Bitcoin or timestamp-service date either); proving a key, claims, licences, DNA pairing on chain | everything else                                                |
| Relay    | check pages say they can't reach Midnight                                      | everything else                                                |

Nothing anyone already holds is lost by any of these. Say so in any message to users.

## Registry

**Down (`/health` not 200).** Railway → registry service → Deployments. If the latest
deploy failed or crashes, open the one before it → ⋯ → Redeploy. If a merge caused it, open
the merged pull request on GitHub → Revert → merge the revert (a new commit; never a
force-push). Railway deploys `main` again.

**`backup-overdue` / `backup-failing`.** Railway logs, search `backup FAILED`: the store's
own code names the problem (`InvalidAccessKeyId`, `AccessDenied`, … = a key or setting).
Fix the variable, then `POST /admin/backup` with the operator token to try at once.

**`backup-off` / `backup-misconfigured`.** The `BACKUP_*` variables are missing or half
set. The log line says which.

**`lab-files-failing`.** Some lab files didn't copy; they are tried again next run. If it
stays, the same as `backup-failing`.

**`database-large`.** Past 1 GB. Not urgent: plan a bigger volume (Railway plan) before 4 GB.

**`disk-low`.** Under a fifth free, or under twice the database. Backups need room for two
copies. Railway → service → Volume → grow it.

**`ots-behind`.** A batch sealed over a day ago is still not in a Bitcoin block. Nothing is
lost: the batch keeps its other dates, and the stamp is tried again every 30 minutes. Railway
logs, search `opentimestamps` or look at the batch in `GET /batches` (`opentimestamps.error`).
`some calendars did not answer` means calendars are down; wait. `gave no usable header`
means one of the Bitcoin explorers is down. If that lasts more than a day, set
`VEILCORE_BTC_EXPLORER` to just the explorer that works and deploy, then put both back once it
recovers. `does not match block` means an explorer or a calendar gave a wrong answer: change
nothing, and keep the log line.

**`timestamps-behind`.** A batch sealed over three hours ago has no token from the
timestamp service. Railway logs, search `RFC 3161`. A pinned service that renewed its
certificate needs the new fingerprint in `VEILCORE_TSA_SIGNER_SHA256`.

**Volume lost.** Restore: `veilcore-api` README, "Putting a backup back into service". Up to
a day of records and newer lab files can be lost; holders' apps save their records again
on next open (their copies are the originals).

## Sponsor

**`not-synced`.** The wallet hasn't caught up since a restart, past the grace period. A
fresh sync can take hours; if it stays, redeploy the sponsor once.

**`sync-stalled`.** The sync applied nothing for 30 minutes. Redeploy the sponsor; if it
comes back, check the relay and Blockfrost.

**`fuel-low`.** DUST is under `ALERT_DUST_LOW_DUST`, or will run out within
`ALERT_FUEL_RUNWAY_DAYS` days (default 7) at the rate it has been falling. The answer says
`fuelRunwayDays` when it knows. The sponsor wallet's NIGHT makes its DUST, so check that
first: `docs/mainnet-sponsor.md`, step 7, "Where the sponsor's DUST comes from". Never
re-register NIGHT on the main 1AM wallet and never change its DUST settings.

**`fork-mismatch`.** The sponsor's wallet, midnight-js and the contract state the indexer
serves don't agree which side of Midnight's Ledger 9 fork the network is on, so any fee it
built would be for the wrong ledger. It checks every ten minutes. Railway logs, search
`fork check`: the line names the part that disagrees. Usually the network moved and the
sponsor needs the build and proof server for the new ledger (`docs/mainnet-sponsor.md`,
step 8). If Blockfrost is serving an old indexer, wait for them. Don't redeploy over and over:
a fresh sync can take an hour.

**Budget used up for the day.** It resets at 00:00 UTC. Dating has its own share
(`ANCHOR_RESERVE_DUST`) that visitors can't use. To raise the day's budget: Railway variable
`DAILY_BUDGET_DUST`; a variable change redeploys (a Restart does not apply it).

**`anchoring-failing`** (three runs in a row). Railway logs, search `anchorBatch`. Usually the
registry or the relay; fix that first. With the registry's seal timer on
(`VEILCORE_SEAL_TIMER=on`), new records are still sealed and get their Bitcoin and timestamp
dates meanwhile. Once the sponsor is back it anchors the waiting batches on Midnight, oldest first,
one every five minutes.

**Bad sponsor deploy.** Railway → Deployments → the previous one → Redeploy. The sponsor
is deployed from the Mac (`CLAUDE.md`), so also check out the commit that was running
before and keep it until fixed.

## Relay and Blockfrost

**Relay `/health` not 200.** Railway → relay service → redeploy the previous deployment.

**Relay `/alerts`: `upstream-unreachable`.** Blockfrost didn't answer, answered an error or
answered without a block. Check status.blockfrost.io, then the Blockfrost dashboard → the
Midnight project → usage. A project over its plan answers errors until it resets or is
upgraded. The sponsor reads Midnight through Blockfrost too, so expect `sync-stalled` from
it as well.

**Relay `/alerts`: `upstream-stale`.** Blockfrost answers, but its latest Midnight block is
over 10 minutes old (Midnight makes one about every 6 seconds). Either Blockfrost's indexer
fell behind, or Midnight stopped making blocks. Check status.blockfrost.io and Midnight's
announcements. Nothing to change on our side.

**Quota.** Blockfrost dashboard → the project → usage. Over the plan: upgrade it, or wait
for the reset. Check pages are affected, and the sponsor's sync too if it uses the same
project.

## Site

**Down.** Check vercel-status.com first. A bad deploy: on the Mac,
`./tools/vercel/node_modules/.bin/vercel alias set <previous deployment URL> veilcore.org`
and again for `www.veilcore.org`. The previous deployment's URL is in the Vercel dashboard
→ Deployments (`releases/mainnet/` here records each release's commit, to find which one). Never `vercel --prod`, never `vercel git connect`.

## After any outage

One line in `docs/log/`: what broke, when, how long, what fixed it, and what would have
caught it sooner. If a monitor would have, add it here.
