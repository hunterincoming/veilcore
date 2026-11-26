# Lawful requests: what VeilCore holds, what it can hand over, and how it answers

> **Draft, for counsel to confirm.** Not legal advice. VeilCore isn't a company yet, and no
> lawyer has reviewed this. Every fact about what VeilCore holds comes from the code and from
> [privacy-and-data-terms.md](../privacy-and-data-terms.md); where they disagree, the code is
> right and both change. Written 25 November 2026.

This page is for anyone who sends VeilCore a subpoena, court order, warrant, preservation letter
or takedown notice, and for holders who want to know what would happen if someone did. The plain
version for holders is [who-could-make-you-show-a-record.md](../who-could-make-you-show-a-record.md).

## 1. Who answers today

One person, the maintainer (Hunter Roberts), runs the registry, the fee sponsor and the site, and
is the only custodian of VeilCore's servers and backups today. Requests go to
hunter@veilcore.org.

Planned, not done: a company to receive legal process (with a registered address that isn't a
home), and a second custodian who can certify records and stand in for the first. Until then a
request may reach a person, not an entity, and there is no one to cover for the maintainer if he
is away. Counsel should say how a request is best served until the company exists.

## 2. What VeilCore holds, and could be asked for

Sources are in [privacy-and-data-terms.md](../privacy-and-data-terms.md), "What our server
keeps" and "Who else handles data". Registry code is the `veilcore-api` repository.

| What | Readable by VeilCore? | Kept for | Source |
|---|---|---|---|
| **Locked copies** of records and agreements (name, breeder, notes, parents, file codes, terms, the other party) | No. Locked in the holder's browser before sending; VeilCore has never had the key | Until the holder deletes them | `sealed.js` |
| Each record's ID, proof code, key binding, kind, first-seen time, save count and times, correction and parent links, batch | Yes | As long as the record | `server.js`, `sealed.js` |
| What a holder chose to show on a public check page | Yes, and public | Until turned off or deleted | `disclosure_grants` |
| **Holder-key fingerprint lists**: every proof code each holder key has held, with the key's digest (`h1:` + SHA-256, never the key) and when first held | Yes | Never deleted (it stops another key taking over an old proof code) | `fingerprint-holders.js` |
| **Tombstones** of deleted records: ID, holder key digest, proof code, deletion time | Yes | No end set | `tombstones.js` |
| **Lab-code relationship graph**: for each lab code, the source record, the receiving account and time, a tag made from the recipient's name; labs' public keys, names, websites and signatures | Yes (the quantity, note and sample details are locked with a key in the lab code, which VeilCore doesn't have) | No set period | `lineage/transfer.mjs`, `lineage/attesters.mjs` |
| Royalty obligations (which record, since when), licence lines, licence invites (30 days), prove requests (7 days), payment-partner receipts | Yes | As stated | privacy terms table |
| Deal messages, lab reports sent back (180 days), the account copy, and older passkey copies of a backup | No: locked to the parties or to the holder | As stated; an older passkey copy until the site moves it into an account copy and deletes it | `lineage/deals.mjs`, `lineage/lab-results.mjs`, `lineage/account-copy.mjs`, `lineage/passkey-vault.mjs` |
| Per-record timestamp quota: holder key digest, timestamp service, request time | Yes | One day | `lineage/record-stamps.mjs` |
| **Backups**: the whole database, encrypted to the operator's key, daily | Only with the operator's key | Locked 30 days; after that not yet set | `backup.mjs`, privacy terms "Backups" |

**The sponsor's IP-to-transaction link.** The fee sponsor sees each visitor's IP address and the
transaction it pays for, at the moment it pays. It writes neither down: its log is counters and
outcomes only (`sponsor/src/log.ts`), and its per-address limits are held in memory and dropped
when their window passes (`sponsor/src/limits.ts`). The transaction itself is public on Midnight
with its time. So VeilCore keeps no table joining an address to a transaction; the join could
only be rebuilt from the host's request logs (below) by matching times.

**The relay's view of who checks what.** On veilcore.org every chain read goes through
VeilCore's indexer relay. It logs only upstream errors, never a query or an address
(`sponsor/src/indexer-relay.ts`), and forwards no visitor headers upstream. Check pages name the
record ID in their address, so a host request log can show which address opened which check
page.

**Request logs.** The registry has no request logger (`test/no-request-logging.test.mjs`).
The hosts keep their own:

| Host | What its logs show | How long (by plan, from the host's docs) |
|---|---|---|
| Railway (registry, sponsor, relay) | Client IP (`@srcIp`), path, time, status | Hobby 7 days, Pro 30 days, Enterprise up to 90 ([Railway docs](https://docs.railway.com/observability/logs)) |
| Vercel (site) | Request path, time, user agent, region; per-request runtime logs. Vercel matches requests by IP address but doesn't show the IP as a log field | Hobby 1 hour, Pro 1 day, longer with paid add-ons ([Vercel docs](https://vercel.com/docs/logs/runtime)) |

Which plan each account is on, and so the real period, is to be confirmed (privacy terms,
question 8). Those logs are the host's records; VeilCore can read and export them only within
that period.

## 3. What VeilCore can't hand over

- **The contents of a locked record**, agreement, deal message, lab report or account copy.
  They are locked with keys made in the holder's browser and never sent. VeilCore can hand over
  the locked bytes and the readable facts above, nothing more.
- **Any key**: holder keys, vault keys, record keys, lab signing keys. They live in the
  holder's browser and backup file.
- **DNA files, lab report files or photos.** They never leave the holder's device; the browser
  sends only a SHA-256 of each.
- **Anything already removed** by its set period or a holder's deletion, except what earlier
  backups still hold.

Anything on Midnight or Bitcoin is public already and VeilCore can't remove it.

## 4. How a request is handled

1. **Check it is real and valid**: who sent it, under what authority, which court, which
   country. A request from outside the United States goes to counsel first.
2. **Narrow it** to named record IDs, proof codes or holder keys and a date range. The registry
   finds records by ID or holder key, not by a person's name.
3. **Tell the holder** (section 5) before handing anything over, unless the law or a court
   order forbids it.
4. **Hand over only what is asked for** and held, as an export with a note saying what each
   field means and what VeilCore can't read.
5. **Log it**: date, who asked, what was asked, what was given, and whether the holder was told.
   The log is kept with the company's records, not in a public repository.
6. **Publish a count** of requests received and answered, once a year, with no names
   (proposed; for the founders to agree).

## 5. Telling the people affected

- **Holders are told** of any request for their records, with a copy of it, unless the law or
  a court order forbids it. When that ends, they are told then. VeilCore has no email address for
  most holders: it tells them through the contact they gave, or not at all if they gave none,
  and says so in its answer to the requester.
- **Community records.** When a record has been registered on a community's behalf and the
  holder has told VeilCore who speaks for the community, that governing body is told as well,
  under the same rule. VeilCore can't tell which records belong to a community unless it is
  told.

## 6. Takedown and illegal content

What a stranger could see from VeilCore is small: what a holder chose to show on a check page,
lab names and websites, licence lines. Everything else is locked or is a code.

- **Notices** go to hunter@veilcore.org (also the contact in `/.well-known/security.txt`). Each
  is answered in writing.
- **What can be removed**: anything the registry shows publicly (a shared field, a lab's listing,
  a licence line). There is no takedown tool today: the maintainer removes it in the registry's
  database by hand and logs it. A record's locked copy can be deleted the same way, which leaves
  a tombstone.
- **What can't be removed**: anything on Midnight or Bitcoin. Those hold codes, not content.
- **Child sexual abuse material.** VeilCore never receives images: photos are hashed on the
  device. If VeilCore ever gets actual knowledge of apparent child sexual abuse material on
  anything it hosts or shows, it reports it to the National Center for Missing & Exploited
  Children's CyberTipline as soon as reasonably possible, as US law requires of providers
  ([18 U.S.C. § 2258A(a)](https://www.law.cornell.edu/uscode/text/18/2258A)); removes it from
  public view; doesn't copy or forward it; and preserves what was reported for one year, as a
  report counts as a preservation request (§ 2258A(h)). The law doesn't require providers to
  scan or monitor (§ 2258A(f)), and VeilCore doesn't. Counsel to confirm VeilCore is a
  "provider" under the section.

## 7. Litigation hold

Routine retention deletes some of what VeilCore holds (lab reports at 180 days, licence invites
at 30, prove requests at 7, the timestamp quota at one day; host logs by their own periods).
Once VeilCore receives a preservation letter, a subpoena, or learns that a case involving its
records is reasonably likely:

1. **Write the hold down** the same day: who asked, which records, holder keys, dates and kinds
   of data, and since when.
2. **Stop routine deletion for what it covers.** Export the matching rows (fingerprint lists,
   tombstones, lab-code rows, obligations, and any of the short-lived rows above) to an
   encrypted file kept outside the registry, before their period runs out.
3. **Export the host logs** that cover the period from Railway and Vercel at once, because they
   go in hours or days.
4. **Keep the backups** that cover the period beyond their 30-day lock.
5. **Holder deletions still go ahead** for the live service, but the held copy is kept, and the
   holder is told under section 5.
6. **Release the hold** in writing when counsel says the matter is over, and delete the held
   copies.

Nothing here changes what VeilCore can read: a hold keeps locked rows locked.

## 8. What VeilCore could be made to ship

This is the honest weak point. The code that locks a record runs in the holder's browser, and
VeilCore writes and serves that code. A court or government could in principle order VeilCore
to ship a changed site that sends a particular holder's keys or unlocked text to the server. A
new release reaches returning visitors automatically (the site updates itself). VeilCore intends
to challenge any such order as far as the law allows, and will not ship one voluntarily (our stance, not a guarantee).

What limits the damage:

- **Every release is published.** Each deploy writes a release list with the SHA-256 of every
  file served and the build settings, committed to this public repository
  (`releases/mainnet/`, [ops/deploying.md](../ops/deploying.md)). Anyone can check a live copy
  against it (`npm run check:site`) and rebuild a release from the code to compare
  (`npm run check:rebuild`).
- **Known limit:** neither check proves a host sent everyone the same files. A changed copy
  served to one visitor would show only if that visitor checked.
- **What a holder already has stays locked**: a changed release can take only what a holder
  opens or types in it. A check link carries no secret, so a changed site can't get a key from
  one, though it could show a wrong result: a check link works on the site that made it
  ([SELF-HOSTING.md](../SELF-HOSTING.md)). The backup file can be checked with no server at all
  ([without-veilcore.md](../without-veilcore.md)).
- **The contracts** can be changed only through the maintenance key, every use is visible on
  chain, and the key can't read a record (see
  [token-and-custody-facts.md](token-and-custody-facts.md)).

## For counsel

1. How should legal process be served until the company exists?
2. Is VeilCore a "provider" under 18 U.S.C. § 2258A and an "electronic communication service"
   or "remote computing service" under the Stored Communications Act?
3. Which host plans and log periods should we commit to, and must the privacy page name them?
4. Is the notice rule in section 5 right for holders and communities outside the US?
5. How far can VeilCore lawfully resist an order to ship a changed site?
