# Royalty payments: overdue in the open, and paying in a stablecoin

Status, 8 November 2026. Built on branch `royalty-pay`; nothing here is live on veilcore.org.

- **Part 1, overdue, reminders, revoke for non-payment:** built for every network. It needs the
  registry's `license-notices-v1` (veilcore-api branch `license-notices`) deployed first, as
  `scripts/registry-features.mjs` checks. Not run on any network yet.
- **Part 2, paying in USDCx or USDM on Cardano:** built, **off on mainnet**
  (`STABLECOIN_PAY_ON_MAINNET = false` in `bboard-ui/src/config/copy.ts`), on for test networks.
  Not run on any network yet.

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
"Overdue" chip. The licensee's alert, and the pay screen, say: "Not paying shows on the public
check page, and the license can be revoked."

In-app only. Email and push are a separate backlog item.

### Overdue on the public check page

The licensor's record's public check page (`/verify/:id`) gets one line per overdue report:
**"A royalty statement is overdue since <date>."** Nothing else: no amount, period, terms, name,
or which license. It is the licensor's own statement about their record, published from their
browser under their holder key, exactly as a disclosure grant is, and the page labels it as the
record holder's word, not checked by VeilCore.

- **Where it is stored:** the registry (`PUT/DELETE /api/records/:id/license-notices/:ref`,
  read on `/verify/:id` as `licenseNotices`). The registry refuses any body that isn't exactly
  `{kind:"overdue", since}` or `{kind:"revoked", reason:"non-payment", on}`, so a notice can't
  carry terms even from a modified client.
- **The reference** is 32 hex characters of SHA-256 over the kind and the statement's
  signature (or the license commitment). Only the two parties hold those, so it tells a stranger
  nothing and lets the licensor's pages on any device find their own notice.
- **Kept in step:** whenever the licensor's royalty page opens, it reads the public notices
  and puts up or takes off this deal's, leaving other licenses' alone
  (`license-notices.ts syncNotices`). Paid, it comes off.
- **Why not "the license's own" check page:** there isn't one, on purpose. A buyer proving a
  license learns only that someone holds a live license from the record (verifier rule 5), not
  which. Tying the notice to the proving license would undo that privacy, so the notice sits on
  the record's page, about "a license from this record".

### Revoke for non-payment

On an overdue report the licensor gets **Revoke for non-payment**. It does three things, in
order (`RealLicensePanel.tsx revokeForNonPayment`):

1. A signed notice to the licensee over the deal's channel (a `notice` of kind `breach`, so
   the published checker and older apps read it): "License revoked for non-payment of report N."
2. The existing revocation on Midnight (`revokeLicense`, the same circuit and disclosure as
   "Revoke"). No contract change.
3. The record's public check page: **"A license from this record was revoked on <date> for
   non-payment."**, and the overdue line for that deal comes off. Sent again each time the page
   opens until the registry has it.

The reason is the licensor's word; the revocation itself is on chain.

### Known limits (Part 1)

- The notice is only as current as the licensor's last visit to the royalty page. A payment
  made while they're away still shows overdue until they open it.
- A licensee who taps "I paid" without paying takes the report out of overdue. The licensor
  still has the notice of breach and the ordinary Revoke.
- The registry stores what the holder sends. It can't check that a report is overdue: it sees
  no terms. That is why the page says whose word it is.

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

### Test networks

On preprod there is no real USDCx. A test build names a test token with
`VITE_CARDANO_TEST_TOKEN=CODE:policy:assetname:decimals` (ignored on mainnet). The test site
needs one minted on preprod and the relay's Cardano preprod project id; neither exists yet.

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

## The NIGHT check (test networks)

The licensor's page checked a NIGHT payment against the amount the payer wrote in "I paid".
It now checks against what the accepted report leaves to pay, amount owed less the tax the
report declared, as SPEC 11.10's "Settled" says (`RoyaltyLedger.tsx`, tested in
`royalty-pay.test.ts`).

## Deploy order when this ships

1. Registry: merge veilcore-api `license-notices` (adds `license-notices-v1`; site deploys
   refuse without it).
2. Sponsor read relay: only when turning on the Cardano lookup (`sponsor/` changed: deploy the
   code first, then add `CARDANO_BLOCKFROST_PROJECT_ID`).
3. Site.
