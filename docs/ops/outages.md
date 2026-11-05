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
| Backups               | the healthchecks.io check behind `BACKUP_PING_URL`                          | a day with no backup |

`/alerts` and `/sponsor/alerts` answer 503 with short codes when something needs you; each one is below.

## What each outage does to people

| Down     | What stops                                                                     | What keeps working                                             |
| -------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| Site     | everything in the browser                                                      | records already saved; evidence bundles check offline          |
| Registry | saving, check pages, lab deliveries and reports, dating of new records         | records in people's browsers and backup files; bundles offline |
| Sponsor  | new records get no date; proving a key, claims, licences, DNA pairing on chain | everything else                                                |
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

**Volume lost.** Restore: `veilcore-api` README, "Putting a backup back into service". Up to
a day of records and newer lab files can be lost; holders' apps save their records again
on next open (their copies are the originals).

## Sponsor

**`not-synced`.** The wallet hasn't caught up since a restart, past the grace period. A
fresh sync can take hours; if it stays, redeploy the sponsor once.

**`sync-stalled`.** The sync applied nothing for 30 minutes. Redeploy the sponsor; if it
comes back, check the relay and Blockfrost.

**`fuel-low`.** Top up DUST for the sponsor's own wallet as in
`docs/mainnet-sponsor.md`. Never re-register NIGHT on the main 1AM wallet and never change
its DUST settings.

**Budget used up for the day.** It resets at 00:00 UTC. Dating has its own share
(`ANCHOR_RESERVE_DUST`) that visitors can't use. To raise the day's budget: Railway variable
`DAILY_BUDGET_DUST`; a variable change redeploys (a Restart does not apply it).

**`anchoring-failing`** (three runs in a row). Railway logs, search `anchorBatch`. Usually the
registry or the relay; fix that first.

**Bad sponsor deploy.** Railway → Deployments → the previous one → Redeploy. The sponsor
is deployed from the Mac (`CLAUDE.md`), so also check out the commit that was running
before and keep it until fixed.

## Relay and Blockfrost

**Relay `/health` not 200.** Railway → relay service → redeploy the previous deployment.
**Quota.** Blockfrost dashboard → the project → usage. Over the plan: upgrade it, or wait
for the reset; only check pages are affected.

## Site

**Down.** Check vercel-status.com first. A bad deploy: on the Mac,
`./tools/vercel/node_modules/.bin/vercel alias set <previous deployment URL> veilcore.org`
and again for `www.veilcore.org`. The previous deployment's URL is in the Vercel dashboard
→ Deployments (`releases/mainnet/` here records each release's commit, to find which one). Never `vercel --prod`, never `vercel git connect`.

## After any outage

One line in `docs/log/`: what broke, when, how long, what fixed it, and what would have
caught it sooner. If a monitor would have, add it here.
