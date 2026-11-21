# Staying up: setup checklist and rules

From the reliability audit of 19 November 2026. No web service is up 100% of the time. What
VeilCore can promise is this:

1. Nothing anyone already has is ever lost or becomes impossible to check.
2. A new record is never refused. If dating is down, the record is saved and dated later.
3. Dating keeps to a clock we can publish. For example: every record is dated on at least two
   independent clocks within 2 hours, 99% of the time.

The first is mostly true today. The second is being finished (offline sealing). The third
needs the registry's seal timer (below), the monitors, and the rules at the end of this page.

## What the code does now (pull requests `reliability-1`)

- **The registry seals on its own** (`veilcore-api`, `VEILCORE_SEAL_TIMER=on`). New records are
  sealed into a batch every hour and stamped on Bitcoin and by the timestamp service straight
  away, whether or not the sponsor is running. The sponsor only puts the batches on Midnight,
  oldest first. A sponsor, Midnight or Blockfrost outage then stops only the Midnight date.
- **New alarms.** Registry `/alerts` says `ots-behind` when a batch has waited over a day for
  Bitcoin. The relay has `/alerts`, which fails when Blockfrost is down or behind. The
  sponsor's `fuel-low` also fires when DUST will run out within 7 days, and says how many days
  are left.
- **Two Bitcoin explorers.** A Bitcoin stamp counts only when blockstream.info and
  mempool.space give the same block.

What each alarm means and what to do: `docs/ops/outages.md`.

## Setup checklist (Hunter, no code)

Do these in order. Each one says how you know it worked. Never paste a token, key or seed
into a chat or a note (`CLAUDE.md`).

### 1. Turn on the registry's seal timer (5 minutes, after the registry pull request is merged)

Deploy order: **registry first.** It needs no sponsor or site change. Merging the
`veilcore-api` pull request deploys the registry (Railway). Then:

1. Railway → service **veilcore-api** → **Variables** → **New Variable**:
   `VEILCORE_SEAL_TIMER` = `on`.
2. Deploy the change. A Railway **Restart** does not apply a new variable.
3. **Worked when** the deploy log has a line starting `seal timer on (every 60 min`. After
   the next record is saved, `https://veilcore-api-production.up.railway.app/batches` shows
   a new batch within the hour, with an `opentimestamps` status of `pending` (then `bitcoin`
   a few hours later). The sponsor still adds the Midnight `anchor` as before.

To turn it off: delete the variable and deploy. Sealing goes back to the sponsor alone.

### 2. Alarms reach your phone, and a second person (15 minutes)

1. Install the **UptimeRobot** app on your phone, sign in, and allow notifications.
2. On uptimerobot.com, open each monitor → **Edit** → alert contacts. Tick your phone (the
   app), your veilcore.org email, a **personal** email of yours, and **Mako's** email. The
   personal address matters: if veilcore.org's DNS or Google Workspace is down, mail to
   hunter@veilcore.org can't arrive.
3. Add the new monitor from `docs/ops/outages.md`, once the relay pull request is deployed:
   **Relay upstream**, `https://veilcore-indexer-relay-production.up.railway.app/alerts`,
   HTTP(s), every 5 minutes, the same contacts.
4. Check that all seven monitors in the table in `docs/ops/outages.md` exist.
5. On healthchecks.io, check **VeilCore registry backup** → **Integrations**: add your
   personal email and Mako's beside hunter@veilcore.org.
6. **Worked when** a test alarm reaches your phone. Add a temporary HTTP(s) monitor on
   `https://veilcore-api-production.up.railway.app/no-such-page` (it answers 404). Within
   about 5 minutes your phone should buzz and both emails should get a message. Then delete
   that monitor.

### 3. A status page that isn't on veilcore.org (10 minutes)

1. On uptimerobot.com → **Status pages** → **New status page** (one is included in the free
   plan). Add the seven monitors. Keep UptimeRobot's own address for it. Don't use
   `status.veilcore.org`: that goes down with our DNS.
2. **Worked when** the page opens on your phone with Wi-Fi off (mobile data).
3. Send Claude the page's address. Linking it from the site's footer, the help page and
   `/status` is a small site change, made in a later pull request.

### 4. The domain can't lapse (15 minutes)

A lapsed domain is the one outage that can be permanent.

1. At the registrar where veilcore.org is registered (not Vercel; Vercel only runs its DNS):
   turn **auto-renew** on, turn **registrar lock** (transfer lock) on, and check the card on
   file won't expire before the renewal date. Make sure the account's contact email is not
   only an @veilcore.org address.
2. Keep a copy of the DNS records. On the Mac, in the repository folder:
   `./tools/vercel/node_modules/.bin/vercel dns ls veilcore.org > ~/Desktop/veilcore-dns-records.txt`
   and keep that file somewhere off the Mac too.
3. In UptimeRobot, if your plan offers them, add a domain-expiry monitor and a certificate
   (SSL) expiry alert for veilcore.org.
4. **Worked when** the registrar shows auto-renew on and the lock on.

### 5. Access

Access to the hosting, registry, domain and email accounts is held by both founders and
reviewed privately.

### 6. Restore drill (20 minutes, then once a month)

A backup nobody has restored is a hope, not a backup.

1. Backblaze → bucket `veilcore-registry-backups` → download yesterday's
   `.sqlite.gz.age` file.
2. On the Mac, in Terminal:

   ```
   cd ~/Desktop/veilcore-api
   git pull
   npm ci
   read -s AGE_IDENTITY
   ```

   At `read -s`, paste the backup's private key from Apple Passwords and press Enter. Nothing
   shows on screen. Then type the line below, add a space after `--file`, drag the downloaded
   file into the Terminal window (that types its path), and press Enter:

   ```
   export AGE_IDENTITY; time node restore.mjs --to restored.db --file
   ```

3. **Worked when** it prints the record count and `integrity ok`. Then clear up:
   `unset AGE_IDENTITY; rm restored.db`.
4. Write one file in this repository, `docs/log/restore-drill-<date>.md`: the date, the
   backup's name, the record count, and how long `time` said it took.

Every three months, do a full restore into a scratch Railway service and point the test site
at it. The steps are in the `veilcore-api` README, "Putting a backup back into service".

## Design rules (keep these)

These come from the audit's Tier 3. Any change to VeilCore should keep them.

1. **Nothing a holder already has can be lost when VeilCore is down.** Every record, proof,
   Bitcoin stamp and timestamp-service token the holder has seen is in their backup file. The
   evidence bundle and the backup should refresh on their own after each batch is stamped, so
   the holder's copy is never more than one batch behind.
2. **A new record is never refused because a service is down.** It is saved on the device,
   signed and queued (offline sealing). The screen says it is saved and will be dated when the
   dating service is back.
3. **Every screen says what still works.** A small banner reads the same alarm addresses the
   monitors use, for example: "Dating on Midnight is delayed. Your records are saved, and
   checks of existing records work." `/status` does this for the sponsor today. It should also
   cover the registry and the relay, and link the outside status page.
4. **Three clocks, never one chain.** Midnight, Bitcoin and at least two timestamp services run
   independently. No one provider's outage stops more than one of them. The registry's seal
   timer is what makes this true for new records.
5. **No single provider for anything users touch.** Two hosts for each server. Two Midnight
   indexers. A copy of the site on a second host, built from the same release and checkable
   with `npm run check:site`. A service worker, so people can open their saved records while
   veilcore.org is down. The service worker needs a careful security design: cached code must
   not outlive a security fix.
6. **Failover is a switch, not a rebuild.** Server addresses come from lists, primary first.
   Each standby is restored, started and tested every three months.
7. **Every alarm reaches a phone, and two people.** Every outage gets one line in `docs/log/`,
   with "what would have caught it sooner" (`docs/ops/outages.md`, "After any outage").
8. **Published targets.** For example: saving and checking work 99.9% of the time (about 43
   minutes down a month), and records are dated on two clocks within 2 hours, 99% of the time.
   The outside monitor measures it and the status page shows it. Nothing is promised publicly
   until it has been measured.
