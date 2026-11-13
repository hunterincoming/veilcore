# Royalty payments: overdue in the open, and paying in a stablecoin

Status, 13 November 2026. Built on branch `royalty-pay`; nothing here is live on veilcore.org.

- **Part 1, overdue, notice of breach, cure period, revoke for non-payment:** built for every
  network. It needs the registry's `license-notices-v1`, `-v2` and `-v3` (veilcore-api branch
  `license-notices`, which also carries the old `license-notices-dispute` work) deployed first,
  as `scripts/registry-features.mjs` checks. The registry is the clock and the gate for
  the public lines (below). Not run on any network yet; run end to end against a real local
  registry (`e2e/royalty-registry.spec.ts`).
- **Part 2, paying in USDCx or USDM on Cardano:** built, **off everywhere** unless switched on
  on purpose: on mainnet only by changing `STABLECOIN_PAY_ON_MAINNET` in
  `bboard-ui/src/config/copy.ts` (no build setting can); on a test network only in a build that
  sets both `VITE_STABLECOIN_PAY=on` and a test token (`VITE_CARDANO_TEST_ASSET`). The test
  site's deploy sets neither; only the end-to-end build does. Not run on any network yet.

## The line this keeps

Money never passes through VeilCore. VeilCore never holds, moves, pauses, blocks or redirects
funds. It has no wallet in the middle, no contract that touches funds, no key and no admin power
over a payment. VeilCore's own fee is a flat subscription, billed separately, never a share of a
royalty. Every design choice below follows from that (research: `payments/legal.md` and
`payments/onchain.md` of 8 November, kept outside the repo).

## Part 1: not paying is visible, and costly

### Overdue and due soon (both sides)

`royalty-ledger.ts` `paymentAlerts`: an accepted report not paid in full is **due soon** in the
7 days up to its payment due date and **overdue from the day after**. The dates come only from
the terms (`royalty-periods.ts`). A short payment stays overdue. A report the licensee marked
"I paid" is not overdue: they did their part, and whether it arrived is the licensor's
confirmation. Both sides' royalty pages show the alerts at the top; the report card carries an
"Overdue" chip. The licensee's alert, and the pay screen, say what happens next: the licensor's
public check page can say a statement is overdue, and after a notice of breach they have 30 days
to pay before the license can be revoked for non-payment.

In-app only. Email and push are a separate backlog item.

### Dates are UTC

Every royalty deadline is a **UTC calendar day** (`royalty-terms.ts utcDay`): due, overdue, due
soon, the notice's day, the cure period, the public notice's dates, the CSV's dates. Both sides
get the same day at the same moment wherever they are. Before, "today" was each device's own
calendar day, so at 16:00 UTC a licensor in Tokyo (already the next day) could find a payment
overdue, post the public line and see "Revoke for non-payment" while it was still the due day for
a licensee in Los Angeles. UTC makes a payment late from 00:00 UTC on the day after its due date
for everyone (in Los Angeles that is 16:00 or 17:00 on the due date itself; the 30-day cure
period makes those hours irrelevant to revoking). Tested at that boundary in both zones
(`royalty-cure.test.ts`).

### Overdue on the public check page

A licensor's browser can be modified, so it is never trusted to decide a payment breach on its
own. The public page never states one as fact: what the registry can check, the registry checks
and enforces; what it can't is worded as the licensor's claim, with the licensee's own answer
beside it, which the licensor can't remove.

The licensor's record's public check page (`/verify/:id`) gets one line per overdue report:
**"The record holder says a royalty statement is overdue since <date>."** Once they send a
notice of breach: **"The record holder told VeilCore's registry on <date> that they had sent a
notice of breach."** (the registry's own date for when it was told; the notice itself goes to the
licensee in the deal). Nothing else: no amount, period, terms, name, or which license. It is
published from the licensor's browser under their holder key, exactly as a disclosure grant is,
signed with their deal key, and the page says whose word each part is.

- **Where it is stored:** the registry (`PUT/DELETE /api/records/:id/license-notices/:ref`,
  `GET` for the holder's own view with the registry's time, read on `/verify/:id` as
  `licenseNotices`; veilcore-api README, "License notices"). The registry refuses any body that
  isn't exactly `{kind:"overdue"|"breach", since, statement, signature}` or `{kind:"revoked",
  reason:"non-payment", on, statement, signature}`, so a line can't carry terms or text even
  from a modified client. `statement` is the fingerprint of the licensee's statement message in
  the deal; it is never public.
- **Signed by the licensor's deal key** (`license-notices.ts lineSignature`), over the record it
  goes on: `veilcore/license-line/v1\n` + canonical `{recordId, ...line}`. The registry checks it
  against the issuer key the deal holds, so only that deal's licensor can say anything about its
  statements. A stranger who learned a fingerprint, or another record holder, can't put a line
  about it anywhere, and a signature made for one record can't be replayed onto another. A
  statement's lines live on one record (the first one its licensor put a line on, until they take
  it off), so the licensee's page always reads the line about the deal's own record.
- **The reference** is 32 hex characters of SHA-256 over `veilcore/license-notice/v2\n` and the
  statement's fingerprint, which only the two sides and the registry know. The registry checks
  it, finds the deal that holds that statement, and from the deal both sides' keys (copied from
  the license invite when the deal opened). It lets both sides' pages, on any device, find the
  line. It does not make the line anonymous: see "What the public page gives away".
- **Worked out from the deal, not from one browser** (`license-notices.ts dealNotices`): what is
  public for a deal follows from its signed messages and from the chain. While the license is
  live, the licensor's royalty page puts up an overdue line per report overdue now and takes off
  the rest, leaving other licenses' alone (`syncNotices`). Once the license is gone from the
  chain, the license page, on any device that opens it, puts up the revoked line only if the deal
  holds the licensor's signed `revoked` notice dated after the cure period, the report isn't
  marked paid, and the registry's own notice-of-breach date, clock and answers allow it;
  otherwise the line comes off and nothing about payment is said. A lost answer, a cleared
  browser, a second device or a plain "Revoke" all end on the same public page. Paid, the line
  comes off.
- **Why not "the license's own" check page:** there isn't one, on purpose. A buyer proving a
  license learns only that someone holds a live license from the record (verifier rule 5), not
  which. Tying the notice to the proving license would undo that privacy, so the notice sits on
  the record's page, about "a license from this record".

### Overdue, notice, cure, revoke

Revoking for non-payment is never one click away from a missed date. The steps, each one dated
in UTC (`royalty-ledger.ts breachOf`, `paymentAlerts`):

1. **Overdue** the day after the payment due date. The licensor's report card now offers only
   **Send a notice of breach** (and the public line goes up, above).
2. **Notice of breach.** A signed, dated `notice` of kind `breach` about the payment, naming the
   report, over the deal's channel. It counts from the later of the day the licensor signed and
   the day the registry received it, so neither the sender nor the registry can date it back to
   shorten the time to pay. One sent before the payment was late starts nothing, and both pages
   say so under it, with no deadline. The licensor's page then puts the public line up as
   `breach`: the registry dates it the first time it arrives, and a resend never moves that
   date. From then on a resend of the overdue or breach line changes nothing at the registry:
   its "overdue since" date and the licensor's signature over it stay as they were, and the same
   holds once the line is revoked (review round 4, N3). Before that, once the due date the
   licensee registered has passed, "overdue since" can't be on or before it (`409 not-due`).
   The registry files a notice of breach only for a report the licensee's page registered, and
   only from the day after the due date registered with it (below, "The licensee registers
   each report"). Until then the plain overdue line stands, and the licensor's alert says why.
   When the registered date is later than the terms' and has passed, the licensor's page dates
   both lines from the day after the registered date (later than the terms say, so the line
   understates), and its alert says the two dates differ (review round 5, B1). Both sides then
   see **"Pay by <date>"**: the cure deadline, from the later of the deal's date and the
   registry's.
3. **Cure period: 30 days** (`CURE_DAYS`). The license terms carry no cure period
   (`royalty-terms.ts RoyaltyTermsFields`), and adding a field would change what both sides
   already signed, so every deal gets the same 30 days, and both pages say so. A later terms
   version can add its own; old terms keep 30.
4. **Revoke for non-payment** is offered only from the day after the cure deadline by the
   **registry's** clock, counted from the registry's date for the notice of breach, and only if
   nothing was marked paid, in the deal or at the registry (`royalty-ledger.ts
   registryAllowsRevoke`). The registry's time comes from its own answers (`now`), never this
   device's date: a licensor's browser set a month ahead offers nothing early.
   `RealLicensePanel.tsx revokeForNonPayment` asks the registry again, then revokes on Midnight
   (`revokeLicense`, the same circuit and disclosure as "Revoke"; no contract change), and only
   then sends the licensee a signed `notice` of kind `revoked` ("License revoked for non-payment
   of report N"), dated by the block's time or else the registry's, so the licensee never holds a
   signed statement the chain doesn't back. If that send doesn't land, the page sends it again
   when it next opens (only while it knows the revocation's time). The public page then says
   **"The record holder says a license from this record was revoked on <date> for
   non-payment."**, with the registry's date for the notice of breach, that the 30 days passed
   with no payment on file there, and that the registry checked those dates, not who the
   licensee is (Known limits).
5. **The registry is the gate** (veilcore-api, `license-notices-v2` and `-v3`). It accepts the
   revoked line only with a `breach` line on file for that statement (so a statement the licensee
   registered, past its due date), received at least 30 full UTC days earlier by its own clock, a
   revocation date no earlier than that, and no "paid" on file (the licensee's own answer, or a
   checked payment partner's receipt). Otherwise it answers 409 and
   the page falls back to a plain revoke: nothing public about payment, and the licensor's page
   says why. The line's date is fixed when first accepted.

"I paid" at any point before the revoke ends it: the report is no longer overdue, so there is
nothing to revoke for non-payment. A plain **Revoke** stays as it was and says nothing public
about payment (it takes this deal's overdue lines down).

### The licensee registers each report

A modified licensor client could once get "revoked for non-payment" published about something
the licensee never saw (review round 3, B2): any deal message counted as the "statement", even the
licensor's own payout message, and a notice of breach could be filed the day a report arrived,
before anything was due, so the 30 days ran out a day after the payment was due.

Now the licensee's page **registers** each of their reports at the registry, signed with their
deal key: "this is my royalty statement, and its payment is due on `dueOn`"
(`license-notices.ts registerStatement`, `POST /license-answers` with type `statement`). The due
date comes from the terms both sides signed (`royalty-ledger.ts paymentDueOf`: the report's
period's payment due date), the same date both pages already show. The page does it by itself,
for every report in the deal, whenever it opens or the deal's messages change, so it happens the
first time the licensee's page sees the report, normally as they send it. The first registration
stands.

The registry then files a notice of breach only for a registered statement, and only from the
day after its registered due date, by its own clock (`409 not-registered`, `409 not-due`). That
one rule closes all three gaps:

- the licensor's own messages are never registered, so they can't stand in for a statement;
- a notice can't be filed before the payment was due;
- the cure period can't start before the licensee's page knew about the statement, because the
  registration comes first and the registry dates the notice itself.

Why the due date comes from the registration, and why the registration happens when the report
is sent rather than when the licensor accepts it: the registry can't read the deal or the terms,
so somebody has to tell it the date, and the licensee is the side the rule protects. Registering
at acceptance would need the licensee to come back after the licensor answers; a licensee who
stops paying is the most likely to stop coming back, and then the licensor could never file a
notice. Registering as the report goes out happens while the licensee is certainly there.

**If the licensee never registers** (an old browser, or a modified licensee client that holds it
back on purpose), the licensor can't use the registry's gate for that report: the public page
can say the payment is overdue (the licensor's word, as always), but not that a notice of breach
was sent, and never "revoked for non-payment". The licensor's alert says so plainly: the report
isn't registered yet, the licensee's page normally registers it the next time they open the
license (an old or modified page, or a licensee who never comes back, won't), and the signed
notice of breach is in the deal either way. The licensor still has everything that matters in a
dispute: the signed report, the signed notice of breach, the ordinary Revoke on Midnight, and the
deal record as evidence. The registry only refuses to put its own name to a timeline it couldn't
check. A licensee whose page registers a later due date than the terms say gets the same result
for that report; the licensor's alert names the date the licensee registered, which is evidence
of its own.

### The licensee sees every public line

The licensee's page asks the registry about every message in the deal at once (`POST
/license-answers/lookup`, 100 at a time; `license-notices.ts lookupStatements`) and shows every
line the licensor's record's public page carries about them, with the day the licensor told the
registry about a notice of breach and the last day to pay, whatever its own reckoning says
(`RoyaltyPay.tsx LicenseePublicLines`). Each offers **I paid** (on a report the licensor accepted
and that isn't marked paid) or **Dispute it**. A line about a deal message that isn't one of the
licensee's reports is shown too, and a dispute about it is filed at the registry directly.

That covers every message in the deal, not only the ones the page can read (review round 4, N1).
A modified licensor client can post junk to the deal, or seal one of the licensee's own reports
again (same signed message, new fingerprint), and put an overdue line on it. The page leaves such
a message out of the ledger, but notes its fingerprint (`deal-client.ts dealSkippedReadHere`) and
asks the registry about it with the rest. A line about one says so ("a message in this deal that
this page can't open, or a second copy of a message already here, so it doesn't match any of
your reports", `app.rpay.l.pubOverdueUnreadable`) and offers **Dispute it**, filed at the
registry in the licensee's name with their deal key. Such a message can never carry a notice of
breach or a revoked line, because the licensee's page never registers it.

It holds once the license is gone from Midnight too, however it went (review round 5, M1). The
registry never learns the chain's state, so a licensor who revoked in the ordinary way could
still put lines up. The licensee's license page, once the license is gone, shows the signed
notice of a revocation for non-payment if the deal holds one, and below it the same public lines
with **Dispute it** (`RoyaltyPay.tsx LicenseeAfterRevoke`). There is nothing to pay from there,
so it offers no **I paid**.

A lookup request that fails (too many requests, the registry down, no network) is tried twice
more, after 1 and 4 seconds (longer if the registry asks, up to 15). If one still fails, the
page shows what the others read and says it couldn't check every message, with **Check again**
(`app.rpay.l.pubLookupFailed`), instead of showing no lines as if there were none (review
round 5, L1).

### The licensee's answer

On an overdue payment, before or after a notice of breach, the licensee's alert offers two
answers, both signed messages on the deal's channel:

- **I paid**: the report's own pay form, with the payment reference (a `paid` message, as
  always). The report stops being overdue.
- **Dispute it**: a short note (up to 500 characters), sent as a `notice` of kind `answer`
  about the payment. The licensor sees it on their alert and on the report. It doesn't stop the
  cure period: a court, not the app, decides who is right.

Each is also **filed at the registry in the licensee's own name** (`POST /license-answers`,
`license-notices.ts fileAnswer`): `paid` with the SHA-256 of the payment reference (never the
reference), or `disputed`, signed with the licensee's deal key, which the registry knows from the
deal holding the statement. No holder key is involved and the licensor's page plays no part, so
the licensor can't leave it off, remove it or change it. The first of each type stands, with the
registry's date. The licensee's page files it whenever the deal holds the answer and the registry
doesn't yet, so a filing that didn't land is retried, and says which ("filed on <date>", or "not
yet, tried again when this page opens").

The public page shows it beside every line about that statement: **"The licensee disputes this
(since <date>)."** or **"The licensee says it was paid (<date>)."**, its type and date and nothing
of what they wrote. A statement's lines are all on one record and all signed by the deal's
licensor, so "every line about that statement" is every public line about that payment.

A "paid" on file stops "revoked for non-payment" at the registry **for good**, whatever the
reference: the registry stores only its hash and can't tell a real reference from a made-up one.
A "paid" with an empty reference is refused (the registry refuses the hash of the empty string,
and the page never sends one). The licensor's answer to a false "paid" is the ordinary Revoke on
Midnight, which says nothing public about payment, with the signed "I paid" as evidence.

After a revocation for non-payment, the licensee's license page still shows the licensor's signed
notice, whether the public page says so, and lets them dispute it (`RoyaltyPay.tsx
RevokedForNonPayment`).

### Known limits (Part 1)

- The notice is only as current as the licensor's last visit to the royalty page. A payment
  made while they're away still shows overdue until they open it.
- A licensee who taps "I paid" without paying takes the report out of overdue. The licensor
  still has the ordinary Revoke, and the signed "I paid" as evidence.
- The registry can't check that a report is overdue at all: it sees no terms and can't read the
  deal. A modified licensor client can still post an overdue line and a notice of breach about a
  statement that was never due. That is why the page words it as the holder's claim, the
  licensee's answer stands beside it, and a "paid" on file stops the revoked line.
- A licensee who answers "paid" without paying, with any reference at all, stops the public
  revoked line for good. The licensor can still revoke on Midnight, which says nothing public
  about payment, and holds the signed "I paid" as evidence.
- A licensee whose page never registers a report (above) keeps the notice of breach and
  "revoked for non-payment" off the public page for it. The overdue line, the signed notice in
  the deal and the revoke on Midnight are unaffected.
- A report is registered as it is sent. One the licensor later asked to fix stays registered, so
  a modified licensor client could file a notice of breach about it after its due date. The
  licensee's page shows that line and offers "Dispute it"; the dispute stands beside it.
- The registry can't tell which record a deal is about (it never learns a record's on-chain
  identity). It takes the record the deal's licensor signs a line for, and keeps all of a
  statement's lines on that one record.
- The registry can't tell whether the licensee is a different person from the licensor (review
  round 4, N2). A licensor can open a license invite and accept it themselves, so they hold both
  deal keys, then send a "report" as the licensee, register it, file a notice of breach and,
  31 days later, get "revoked for non-payment" accepted on their own record. No real licensee is
  named or harmed by it (a real licensee's page never sees that deal), but the public line would
  look like a checked timeline about a real license. So the revoked line says what was checked:
  the registry checked the dates, not who the licensee is (`app.rpay.pub.revokedChecked`). It
  remains the record holder's word about *some* license. A warning on the licensee's page when
  the invite was accepted on the licensor's own device was considered and not built: someone
  doing this on purpose uses a second browser, so it would only catch honest mistakes.
- A licensee whose page registers a later due date than the terms say holds the notice of breach
  back until the day after that date, and from then on the public line can't say "overdue since"
  any earlier than that day: the registry can't check the date against the terms, which only the
  two sides hold. It can't keep either line off, though. Before the registered date has passed,
  the plain overdue line isn't held to it. Once it has passed, the licensor's page reads the
  registered date (it is public at the registry, by statement) and dates both lines from the day
  after it, so the notice of breach is filed then (review round 5, B1). The licensor's alert
  names both dates; the signed terms in the deal still say which one was agreed. A made-up date
  can delay the notice of breach and make the public line understate how long it has been
  overdue, but it can't silence the licensor's word.

### Licenses from before this

The registry learns the two sides' deal keys from the license invite, copied onto the deal when
it opens (the deal keys were kept from the `license-notices` deploy on). A deal opened before that
whose invite has since expired (invites last 30 days) has no keys on file, so the registry can
check neither side's signature for it. Nothing about it can be put up or answered there, ever:
the registry answers `409 predates`, and both pages say plainly that the license was made before
this existed (`app.rpay.predates`, `app.rpay.l.answerPredates`), instead of "tries again". The
reminders, the notice of breach, the time to pay and the dispute still work between the two of
them, signed in the deal.

The clean way for both sides to opt in is a new license (supersede): a fresh invite, so both
sides check each other's keys with the 6-digit code again, and the registry keeps them from the
start. A lighter way was considered and not built: each side signs their own deal key's public
half with the old deal key inside the deal, and the registry accepts the pair only when both
signatures check against each other. It would still rest on nothing the registry checked when
the deal opened, which is why the new license is the recommended path.

## Part 2: paying in a US dollar stablecoin on Cardano

### Why Cardano, why these tokens

There is no stablecoin on Midnight mainnet today, and a Midnight transaction carries no memo.
USDCx (Circle, through xReserve) and USDM (Moneta) are live, fiat-backed dollar tokens on
Cardano, and Cardano transactions carry metadata (CIP-20, label 674). Lace holds both Midnight
and Cardano. So: the payment runs on Cardano, the records stay on Midnight.

Pinned in source (`cardano-pay.ts CARDANO_TOKENS`), checked 8 November 2026:

| Token | Policy | Asset name | Source |
|---|---|---|---|
| USDCx | `1f3aec8bfe7ea4fe14c5f121e2a92e301afe414147860d557cac7e34` | `5553444378` | cexplorer.io asset page and Masumi's token docs agree; CIP-14 fingerprint `asset1e7eewpjw8ua3f2gpfx7y34ww9vjl63hayn80kl` matches |
| USDM | `c48cbb3d5e57ed56e276bc45f99ab39abe94e6cd7ac39fb402da47ad` | `0014df105553444d` | CoinGecko's Cardano contract field; fingerprint `asset12ffdj8kk2w485sr7a5ekmjjdyecz8ps2cm5zed` |

Decimals are pinned at 6 for both. Cardano has no on-chain decimals, and neither issuer page
said; confirm against each token registry entry before mainnet.

### When it is offered

Only when the statement is in **USD** and the licensor's signed payout says USD is payable in the
token **at 1:1**: `{type:'payout', method:'cardano:USDCx', account:<addr1…>, currency:'USD',
rate:'1'}`. The payout form says so before it is saved ("By saving this you agree that 1 USDCx
counts as 1 US dollar"), so the par risk is the licensor's, by their choice. No oracle, no rate
judgement by VeilCore. Not offered on cannabis records, like payment links. Not offered for other
currencies (a signed conversion for JPY, CHF, EUR is the next step, in `onchain.md`).

### The payment

The licensee's own CIP-30 wallet (Lace, Eternl…) signs and sends one transfer:

- one output to the licensor's signed address with the token and the minimum ada Cardano
  requires alongside it, change back to the licensee, nothing to anyone else;
- CIP-20 metadata `674: {msg: ["vc1:<ref>"]}`, where `ref` is the first 16 bytes (32 hex) of
  SHA-256 over `veilcore/pay-ref/v1\n` + statement signature + `\n` + payout address (the same
  recipe as Request Network's payment reference). It names nothing; only someone with the deal
  record can recompute it;
- the transaction hash is kept in the browser before it is sent, so a page closed mid-way
  offers to record that payment, never to pay again; then the signed "I paid" carries it.

CIP-30 wallets sign but don't build, so the page builds the unsigned transfer with EMURGO's
cardano-serialization-lib (below), loaded only on this screen.

### Settled without "received"

Both pages (and the published checker, below) look the transaction up on Cardano. It settles
the report when it is valid, at least 10 blocks deep, carries exactly one `vc1:` line and it is
this report's, and pays at least what the report leaves to pay (amount owed less declared tax)
to the licensor's signed address in that token. Then the report shows "Paid, checked on
Cardano" and drops out of what is owed, with no click from the licensor. That is SPEC 11.10's
new "Settled on chain" (veilcore-sdk branch `onchain-settle`): `checkDealRecord(record,
{ cardano })` takes a reader's own lookup, and `conformance/onchain-settle-v1.json` holds 19
vectors that the site's code is tested against too.

The lookup goes through the read-only relay (`sponsor/src/cardano-relay.ts`, `GET
/cardano/tx/<hash>`), which keeps a Blockfrost Cardano project id server-side and rebuilds the
answer in one fixed shape. Off unless `CARDANO_BLOCKFROST_PROJECT_ID` is set on the relay and
`VITE_CARDANO_RELAY_URL=<relay>/cardano` on the site; until then the page says it can't check
Cardano, and the licensor confirms by hand as today.

### Sanctions

Before anything is built, the licensor's address and every address the licensee's wallet uses
are screened against a bundled copy of OFAC's SDN list of Cardano addresses
(`veilcore/sanctions/ofac-cardano.json`, which names its source and dates). An address matches
if it is listed or shares a listed address's payment or stake key. A match, or an address the
screen can't read, stops the payment. The payout form refuses a listed address too.

Honest limits:

- **The bundled list is empty, and that's not yet verified from OFAC itself.** treasury.gov
  couldn't be reached from the session that built this. The widely used nightly extract
  (github.com/0xB10C/ofac-sanctioned-digital-currency-addresses) lists no Cardano addresses; its
  generator knows 18 asset types and ADA isn't one. Before mainnet run
  `node scripts/ofac-cardano-list.mjs <sdn_advanced.xml>` on a fresh download and commit the result.
- It is a list check, not blockchain analytics: it can't see that money came from a listed
  address.
- There is no location check (blocking sanctioned regions needs a service this site doesn't
  use). A lawyer should say whether that's needed.
- The list is only as new as its last refresh; nothing refreshes it automatically.

### Dependencies

Counted before adding anything (`npm install --package-lock-only` in a scratch folder, compared
with this lockfile):

| Library | Lockfile entries | New to this lockfile |
|---|---|---|
| @meshsdk/core 1.9.1 | 214 | 147 |
| @cardano-sdk/core 0.47.1 | 104 | 61 |
| @lucid-evolution/lucid 0.8.9 | 38 | 29 |
| @evolution-sdk/evolution 0.8.0 | 10 | 2 (but released 28 Oct, under two weeks old) |
| **@emurgo/cardano-serialization-lib-browser 17.0.0** | **1** | **1** |

Chosen: cardano-serialization-lib-browser 17.0.0 (EMURGO, MIT, released 7 August 2026, no
dependencies of its own). One entry, added to the lockfile by hand. Its WebAssembly is about
4 MB and is loaded only on the stablecoin screens (a dynamic import); the site already bundles
wasm with vite-plugin-wasm.

Fee and minimum-ada parameters are pinned (`cardano-tx.ts PROTOCOL`: Conway-era mainnet and
preprod values). If Cardano changes them, a transfer built with old ones is refused by the
network before anything moves.

### A Cardano payout this page can't pay

A payout naming `cardano:<code>` hides the bank details, the reference and "I paid" only when
this build has stablecoin pay switched on **and** can pay that token (`cardanoOffer`: a token it
knows, USD at 1:1, an address on its Cardano network). Otherwise the licensee sees a line saying
the wallet isn't offered, with the normal details, reference and "I paid" below it, recorded as
paid another way. Before, any `cardano:` payout hid all three, so a licensee on mainnet (or a
payout naming a token this build doesn't know, which a modified licensor client can send) could
not record any payment, went overdue and could be revoked (`royalty-pay.spec.ts` checks this).

### Test networks

On preprod there is no real USDCx. A test build offers stablecoin pay only with both
`VITE_STABLECOIN_PAY=on` and a test token,
`VITE_CARDANO_TEST_ASSET=CODE:policy:assetname:decimals` (both ignored on mainnet). The test
site sets neither: it needs a token minted on preprod and the relay's Cardano preprod project
id, and neither exists yet.

### Before stablecoin pay is switched on, anywhere

Found by the independent check of 12 November. Not built; each needs doing before any build
(test network included) turns stablecoin pay on:

1. **The relay can fake "settled".** The page settles a report, with no "received", on the
   VeilCore relay's word alone. A compromised relay can't invent the reference, but for a real
   transaction carrying it, it can report a larger amount, more blocks or `valid`: a payment of
   0.000001 could read as 1,000. Then VeilCore's server is vouching for a money fact. Fix: check
   in the reader's own browser against a second, independent source (a public Koios endpoint,
   say) and settle only when both agree, or keep "checked on Cardano" as information and still
   ask the licensor for "received". At least link the transaction on a public explorer. The SDK
   is already right: its reader brings its own lookup.
2. **The payee address isn't inside the signed terms.** It is in a licensor-signed `payout`
   message, which the registry can't forge, but the registry can hold back a newer payout and
   serve an older one, and both the site and the SDK accept payment to any earlier payout the
   licensor signed. Fix: settle only against the newest payout before the `paid` message (by
   `seq`) and warn on a gap in `seq`, or sign the payout's hash into the terms or an `agree`.
3. **The memo can link a record to a Cardano address.** The `vc1:` prefix marks every such
   transaction on public Cardano as a VeilCore royalty, and the overdue line coming off a record's
   check page around the same day lets an observer tie that record to the licensor's address and
   the amount. Warn the payer on the pay screen that the payment, its amount and both addresses
   are public and can be linked to the record, and consider dropping the fixed prefix (any 32-hex
   line, matched against the expected reference).
4. The relay sees which transaction hashes each browser asks about. It keeps no log of them, but
   VeilCore's server could tie a browser to a payment: say so on the pay screen.

### Before mainnet (all of these)

1. Mako's yes and a lawyer's review: money transmission (federal, NJ, NY, California's "control"),
   Circle's and Moneta's terms, the cannabis carve-out, MiCA, FINMA, Japan's PSA.
2. A fresh OFAC list from OFAC's own file (above), and a decision on location checks.
3. Token decimals confirmed against the token registry; policy ids checked once more.
4. The relay's `CARDANO_BLOCKFROST_PROJECT_ID` and the site's `VITE_CARDANO_RELAY_URL`.
5. A full run on the test network: a payment, a short one, a wrong reference, a reused
   transaction, a changed payout, a page closed mid-payment.
6. An attacker pass on the pay screen and the check, like Max's.
7. Then change `STABLECOIN_PAY_ON_MAINNET` in a reviewed commit. Nothing is called live until a
   real payment has worked once on mainnet.

## What the public page gives away

The public lines carry a kind and dates, never an amount, a name, the terms or which license. They
are still not anonymous, and nothing here should say they tell a stranger nothing:

- **Revoked.** A license's revocation is public on Midnight (`revokeLicense` discloses the
  license commitment and the issuing record). A "revoked on <date> for non-payment" line on a
  record's page can be lined up with the revocations on Midnight that day, and so with that
  license and its activation. Its reference is made from the fingerprint of the licensee's
  statement message in the deal, not from the license commitment, so it doesn't name the
  on-chain license outright; the date still narrows it, often to one.
- **Overdue.** The line's dates, and the day it comes off, are public. With stablecoin pay on,
  the day it comes off can be lined up with a `vc1:` payment on Cardano (above).
- The registry caps a record at 20 notices; above that a new line can't be put up, and the page
  says it couldn't.

## The NIGHT check (test networks)

The licensor's page checked a NIGHT payment against the amount the payer wrote in "I paid".
It now checks against what the accepted report leaves to pay, amount owed less the tax the
report declared, as SPEC 11.10's "Settled" says (`RoyaltyLedger.tsx`, tested in
`royalty-pay.test.ts`).

## Deploy order when this ships

1. Registry: merge veilcore-api `license-notices` to `main` (one branch: the notices, the
   merge with `main`, the old `license-notices-dispute` work, the v2 gates and answers and the v3
   signatures and registrations; it adds `license-notices-v1`, `-v2` and `-v3` to `/health`, and
   site deploys refuse without all three). `license-notices-dispute` points at the same commit and
   needs no merge of its own. Never set `VEILCORE_TEST_CLOCK` on Railway: the registry refuses to
   start with it there, or with `VEILCORE_ANCHOR_NETWORK=mainnet`, and answers its test clock only
   to a request from its own machine.
2. Sponsor read relay: only when turning on the Cardano lookup (`sponsor/` changed: deploy the
   code first, then add `CARDANO_BLOCKFROST_PROJECT_ID`).
3. Site.
