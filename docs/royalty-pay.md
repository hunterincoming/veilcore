# Royalty payments: overdue in the open, and paying in a stablecoin

Status, 12 November 2026. Built on branch `royalty-pay`; nothing here is live on veilcore.org.

- **Part 1, overdue, notice of breach, cure period, revoke for non-payment:** built for every
  network. It needs the registry's `license-notices-v1` and `license-notices-v2` (veilcore-api
  branch `license-notices`, which also carries the old `license-notices-dispute` work) deployed
  first, as `scripts/registry-features.mjs` checks. The registry is the clock and the gate for
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
notice of breach: **"Their notice of breach reached VeilCore's registry on <date>."** (the
registry's own date). Nothing else: no amount, period, terms, name, or which license. It is
published from the licensor's browser under their holder key, exactly as a disclosure grant is,
and the page says whose word each part is.

- **Where it is stored:** the registry (`PUT/DELETE /api/records/:id/license-notices/:ref`,
  `GET` for the holder's own view with the registry's time, read on `/verify/:id` as
  `licenseNotices`; veilcore-api README, "License notices"). The registry refuses any body that
  isn't exactly `{kind:"overdue"|"breach", since, statement}` or `{kind:"revoked",
  reason:"non-payment", on, statement}`, so a line can't carry terms or text even from a
  modified client. `statement` is the fingerprint of the licensee's statement message in the
  deal; it is never public.
- **The reference** is 32 hex characters of SHA-256 over `veilcore/license-notice/v2\n` and the
  statement's fingerprint, which only the two sides and the registry know. The registry checks
  it, finds the deal that holds that statement, and from the deal the licensee's key (copied from
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
   date. Both sides then see **"Pay by <date>"**: the cure deadline, from the later of the
   deal's date and the registry's.
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
   non-payment."**, with the registry's date for the notice of breach and that the 30 days passed
   with no payment on file there.
5. **The registry is the gate** (veilcore-api, `license-notices-v2`). It accepts the revoked line
   only with a `breach` line on file for that statement, received at least 30 full UTC days
   earlier by its own clock, a revocation date no earlier than that, and no "paid" on file (the
   licensee's own answer, or a checked payment partner's receipt). Otherwise it answers 409 and
   the page falls back to a plain revoke: nothing public about payment, and the licensor's page
   says why. The line's date is fixed when first accepted.

"I paid" at any point before the revoke ends it: the report is no longer overdue, so there is
nothing to revoke for non-payment. A plain **Revoke** stays as it was and says nothing public
about payment (it takes this deal's overdue lines down).

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
of what they wrote. A "paid" on file also stops "revoked for non-payment" at the registry.

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
- The registry checks that the line's statement is a message in a deal it holds, but not that
  the record's holder is that deal's licensor: it can't tie a holder key to a deal key. Only the
  two sides (and the registry) know a statement's fingerprint.
- A licensee who answers "paid" without paying stops the public revoked line. The licensor can
  still revoke on Midnight, which says nothing public about payment, and holds the signed "I
  paid" as evidence.

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
  license and its activation. Its reference is now made from the licensor's signed `revoked`
  notice, not the license commitment, so it no longer names the on-chain license outright; the
  date still narrows it, often to one.
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
   merge with `main`, the old `license-notices-dispute` work and the v2 gates and answers; it adds
   `license-notices-v1` and `license-notices-v2` to `/health`, and site deploys refuse without
   both). `license-notices-dispute` points at the same commit and needs no merge of its own. Never
   set `VEILCORE_TEST_CLOCK` on Railway: the registry refuses to start with it there.
2. Sponsor read relay: only when turning on the Cardano lookup (`sponsor/` changed: deploy the
   code first, then add `CARDANO_BLOCKFROST_PROJECT_ID`).
3. Site.
