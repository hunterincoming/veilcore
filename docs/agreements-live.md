# Agreements on chain: the build to "live"

Status: live on veilcore.org. On 8 November 2026 Hunter ran it end to end on mainnet: a licence
accepted in a private window, then a royalty report sent, answered, marked paid and confirmed
received. `ROYALTIES_RUN_ON_MAINNET` (`bboard-ui/src/config/copy.ts`) is on, so the home page's
veilcore.org cell says "Yes". Handing a licence on has not been tried on mainnet yet, and the
cell says so. Licences are on the test network (test.veilcore.org) too: the licence steps of the
test run ([agreements-test-run.md](agreements-test-run.md)) went through there with a phone.
Royalties v2 has not been run there: the test-site cell says royalties are built, not live,
until it has (`ROYALTIES_RUN_ON_TEST`, same file, turned on by a reviewed commit after that
run). Paying in NIGHT on Midnight itself stays on test networks
(`ONCHAIN_PAYMENTS`). Owner: hunter@veilcore.org. This page says
what the website does with VeilCore's contract once agreements are live, who does what, and
what VeilCore never does. The switch is in one reviewed place, below.

## What does not change

The contract on mainnet (`a04de0a2…2347`, frozen at `ceb3a16`) already has every circuit
this needs: 24 of them, all small enough to prove in a browser (k ≤ 14). Nothing here
changes or recompiles it. Until now the website used 3 of them on mainnet: date a
record, prove you hold it, tie a DNA report. This build wires the rest.

VeilCore records agreements. It is not a party to them, does not enforce them, and never
holds or moves anyone's money.

## Who uses it

| Who | What they do | What they see of others |
|---|---|---|
| Breeder (licensor) | Licenses a record, answers royalty reports, confirms payment, approves transfers | Only what the licensee sends them |
| Grower (licensee) | Accepts a license on their own device, sends royalty reports and pays, proves the license to buyers | Only their own deal |
| Buyer, dispensary, regulator | Checks a license is live on Midnight (not revoked: it doesn't show the terms are current), sees the obligations recorded on confirmed ancestors | That a live license exists; nothing about terms or people |
| Payment partner | Pays a statement through its own rails and signs a receipt | The statement the payer hands it |
| Anyone | Re-checks all of it from the chain | Commitments, never terms or genetics |

## The pieces

1. **License (done).** Two devices, one link. The licensee's key is made on their
   device. Both read each other a 6-digit code made from both sides' random values, so a
   registry that swaps anything can't make the codes match. Then issue, activate, revoke
   on chain. Each page reads the license's state from the chain itself.
2. **Prove a license (done).** A checker sends a link; the holder answers from the device
   with the license; the checker's page checks it on chain (verifier rule 5). The checker
   learns only that a live license from that record was held when the answer landed.
3. **A private channel per deal (done).** The random values both sides already exchange for the
   code become key-exchange keys (X25519). The code covers them, so the two people who
   read it to each other are the only ones who share the resulting key. The registry
   stores the deal's messages encrypted under it and can't read or forge them.
4. **Royalties (v2: built and switched on in code; not run on the test site or veilcore.org yet).** Phone-first, the
   same screens on both sides; only who can press what differs. VeilCore never holds, routes or
   starts a payment.
   - *Terms.* The form opens on presets (clone, seed, breeding, semen or embryo, custom). A
     preset fills explicit values before the agreement is sealed and is never stored, so the
     signed terms never depend on what a preset means later (`veilcore/royalty-terms.ts`).
     The common case is three taps: a preset, the amount, a look at the governing law (filled
     in from the browser). The terms say the currency; the royalty as a percent of gross or
     net sales (net of returns, excise or freight, capped) or a fixed amount per named unit
     with a one-line definition; an optional royalty on offspring and how long it runs; an
     optional yearly minimum; how often reports come (default quarterly), report due N days
     after a period ends (30), payment due N days after that (14); bank fees; the exchange
     rate source; records kept N years and checked with N days' notice (over 5% underpaid:
     the licensee pays the check); governing law and where disputes go. Both sides see the
     deal in one paragraph with every value. Old terms keep their fingerprint and are read
     through fallback readers that add nothing (old flat fees read as dollars, as their form
     said). On cannabis records the territory is required and no payment link is offered.
   - *Each period.* The home card shows the next due date, overdue days, the balance accepted
     and not paid, the minimum so far, and one button. Due dates come only from the period
     dates in the terms, as calendar dates in the user's own day (`veilcore/royalty-periods.ts`;
     periods run from the start date; a start on the 31st falls back to a shorter month's last
     day). The licensee writes a report with one question per line, or taps "Nothing sold",
     and can attach the sales report (its SHA-256 goes in the signed report; the file stays
     on the device, `veilcore/evidence.ts`). Each line is rounded in the currency's own digits
     (JPY none, USD two), then added; the year's last report adds the top-up to the minimum.
     The licensor answers once: Accept, or Ask to fix with a reason; the licensee then sends a
     corrected report that replaces it. "I paid" opens only after Accept (no deemed acceptance:
     signed times are the sender's clock). The pay screen shows the amount, the licensor's
     details with copy buttons, a reference made from the report's signature with the
     licensor's initials, and who pays fees; tax withheld can be declared under "More", and
     the amount paid is the amount owed less that. If the payout details changed, "I paid"
     stays locked until the licensee ticks that they confirmed the new ones another way. The
     licensor confirms receipt of exactly the amount paid. Either side can send a signed,
     dated reminder; the licensor can send a notice of breach. Reminders say only what the
     dates and messages show. A timeline, a printable statement (an invoice when the
     licensor added invoice details), a CSV and a calendar file are on both sides.
   - *Messages and the checker.* Reports keep the top-level basis, quantity, currency and
     amount owed, with `lines` that add up to it; one first answer, one "paid", one
     "received" per report, as `veilcore-records` checkDealRecord reads them. Two reports
     from the licensee that say exactly the same thing (the message as signed, without its
     signed time, sender and report id; the period is part of it, and so is any other field)
     are one report, and an answer or payment naming either counts for the first. Sending a
     report that is already there sends nothing and says when the one there was sent; one
     with a note saying what it is for is another report. Each royalty message is signed once
     and kept, encrypted, in the browser until the registry has it: trying again after a lost
     answer sends that same message, and the deal is read first so nothing already there is
     sent again. Payout and invoice details and reminders are "latest wins": one there counts
     as sent only while it is still the newest of its kind, so going back to earlier details
     after a change sends them again. New message
     types (`invoice-details`, `notice`) are filed as unread by the published checker. Payout
     and invoice-details messages never go into a lender pack. Payment details are encrypted
     on VeilCore's servers, which can't read them; copies a user downloads include them.
   - *Next.* Real reminders by email or push; prefilling reports from the grower's own
     records; audits as a step; partial payments and changing answers after payment (needs a
     `veilcore-records` release); co-breeder splits.
5. **Payment through a partner (receipts still read; the request button is hidden in v2).**
   VeilCore never touches money, and keeps no list of "trusted" partners: choosing whose
   receipts count would be vouching for them. The payer hands a statement to a payment
   partner they choose (a wallet or payment company). The partner pays through its own
   licensed rails, then signs a receipt over the statement's fingerprint with its key. A page
   checks each receipt's signature itself, and treats it as paid through a partner only when
   the person checking has named that key, after checking it with the partner directly
   (`veilcore/payment-partners.ts`, kept in their own browser); any other receipt is shown as
   a signature from a key nobody has checked, with the registry's name for it marked unchecked.
   Either way the payee still confirms the money arrived. A payment made any other way is
   marked by the payer and confirmed by the payee. VeilCore's only fee is a flat subscription, settled: never a fee per deal, per
   payment or per royalty; nothing is charged or collected today.
6. **Offspring royalties (done).** A license that carries a royalty on offspring becomes an
   obligation on chain against the licensee's own record of that plant: the breeder
   proposes it, the licensee accepts it, only the breeder can release it. Every record
   both holders confirm as a descendant shows it (verifier rule 3).
7. **Parent links (done).** The child's holder names a parent on chain; the parent's holder
   confirms. The chain is the mailbox: a record's page lists the records waiting for it
   to confirm.
8. **Handing a license on (done).** The license moves in place on chain
   (proposeTransfer, approveTransfer), keeping its terms and its place, and only with both
   the holder and the breeder (`veilcore/hand-on.ts`). The breeder sends the new holder a
   hand-on link; they accept with their own key and read the breeder a second 6-digit code,
   so the breeder approves exactly the key the new holder made, whatever the old holder or
   the registry say. The breeder signs that key to the current holder ('handon'); the holder
   hands it on; the new holder signs their agreement to the terms; only then can the breeder
   approve (checked again just before sending). Calling it off sends 'handon-off', so the
   holder's page stops offering it. The holder can ask first ('handon-ask') and can take a
   proposal back until it is approved. Each earlier holder's deal and signed history stays
   with the license and in the backup. Tested against the compiled contract
   (`hand-on-actions.test.ts`). Needs the sponsor redeployed with the three calls allowed.

   **Why a license is not a Midnight token (researched 23 Oct 2026).** A license must not
   move without the breeder: selling or passing on a protected variety without the breeder's
   authority is what the US PVP Act calls infringement (7 U.S.C. 2541). A token a contract
   mints on Midnight, once it sits in someone's wallet, moves wallet to wallet without the
   contract (Midnight docs, "Create and transfer an unshielded token"), so the breeder could
   not stop a resale, and an unshielded token would also show every holder publicly. The
   deployed contract already does what a "consent-gated token" would: a license is a private
   leaf only its holder can prove, and it moves only when the holder proposes and the breeder
   approves (proposeTransfer, approveTransfer). So: no token, no contract change.

   **Paying and activating in one step: later, on test networks first.** Midnight can merge
   transactions built separately (ledger 9 intents), which could let a licensee's activation
   and their payment to the breeder land together or not at all, with no contract change.
   Midnight's own docs say this isn't usable on a live network yet (midnight-docs issue
   1291). Try it on a test network when it is; until then the breeder can revoke an unpaid
   license, which covers the same risk.

9. **W3C credentials (done).** The licensor's page signs a license credential and, for each
   payment it confirmed, a payment credential, and sends them over the deal's channel. They
   are W3C Verifiable Credentials 2.0 with Data Integrity `eddsa-jcs-2022` proofs and
   `did:key` identifiers (`veilcore/vc.ts`, `veilcore/credentials.ts`), checked against the
   W3C's own test vectors byte for byte. Any W3C verifier checks them without VeilCore. They
   carry the terms' fingerprint, never the terms, and say that liveness is checked on
   Midnight, not by the credential.
10. **Lost phone (done).** A copy of the backup that opens with a passkey
    (`docs/passkey-backup.md`).

11. **Paying on Midnight (built 23 Oct, test networks only).** The licensor can set their
   payout to "On Midnight (NIGHT)": their unshielded Midnight address, checked for typos and
   for the right network before it's sent (or taken straight from their wallet). For a
   statement in NIGHT, the licensee's page then shows **Pay 500 NIGHT with Lace** (or 1AM):
   their own wallet builds, shows, pays the fee for and sends a plain transfer to that address,
   and the page records it in the signed "I paid it" with the transaction. The licensor's page
   checks it on Midnight's indexer itself: the transaction succeeded and paid at least that
   much NIGHT to their address. The amount checked is the one on the statement they accepted,
   never the one the payer wrote in "I paid it", and the address is the licensor's own signed
   payout, never one the payer names. One transaction counts for one statement, across every
   deal on the licensor's device (so two licenses from the same licensor can't share one
   payment). A payment sent but
   not yet recorded (page closed, registry down) is kept in the payer's browser, and the page
   offers to record it, never to pay again. Code: `veilcore/onchain-pay.ts`,
   `components/licensing/OnChainPay.tsx`; switch: `ONCHAIN_PAYMENTS` in `config/copy.ts`,
   off on mainnet.
   - **No contract change, no custody, no conversion.** VeilCore never holds or routes the
     money, and doesn't turn dollars into NIGHT: on-chain payment is offered only when the
     statement is in the token itself.
   - **NIGHT payments are public.** NIGHT is always unshielded: amounts and addresses (not
     names, not what for) are visible to anyone. The payout form says so. A shielded USD
     stablecoin would fix both this and the currency problem; none is confirmed live on
     Midnight mainnet (ShieldUSD was announced in January 2026). When one is, it is one line in
     `ONCHAIN_TOKENS`, by a reviewed commit.
   - **To confirm on the first run:** the indexer's `tokenType` format for NIGHT (the check
     reads the raw all-zero type with or without a leading tag byte), and the length of a
     transfer's identifier (refused before sending if over 120 characters).
   - **Before mainnet:** Mako's yes and a lawyer's review (a payment feature, even with no
     custody). Then change the one line.
12. **Borrowing against licenses (done).** A royalty lender reads everything, under a
    confidentiality agreement: the license agreements themselves, a lien search, chain of
    title, and a UCC-1 filing over the royalties, which no chain record replaces (Berkeley Law,
    "Securities Interests in Royalty Financings", 2025). So no zero-knowledge proofs for
    lenders. What VeilCore adds is what a spreadsheet can't:
    - **A lender pack** (`veilcore/lender-pack.ts`): from a live license, a .zip of the signed
      record of each holder's deal, a summary worked out by the published checker
      (veilcore-records `checkDealRecord`, the same as `npx veilcore-records deal`), and a
      README saying what it shows and what it can't: whether the licensee is a real, separate
      person. The lender confirms that with the licensee.
    - **Dated prior possession and chain of title:** the records and their evidence bundles.
    - **A claim on the record** (`veilcore/claims.ts`, the /claim page): the lender proposes
      it from its own identity (from a browser at /lender, `veilcore/lender.ts`, reached from
      any record's check page; or the partner kit's `proposeObligation` and `claimLink`), the holder
      accepts it on the record's own key, only the lender can release it. Anyone checking the
      record sees a claim is recorded on it. Not a legal filing, and it doesn't stop the same
      material being pledged elsewhere.
    Lender's guide: [docs/partners/lenders.md](partners/lenders.md).

## Law and wording

- Terms of Use: VeilCore is a record-keeping tool, not a party, broker, escrow, payment
  service or legal adviser. Users are responsible for the legality of what they record
  and trade where they are. Cannabis is a listed example, not the only one.
- Every agreement screen says: the terms are between the parties; VeilCore records that
  the agreement exists, when, and its state on chain.
- Payment rails are the partner's, under the partner's licenses. A money-moving feature
  inside VeilCore needs a lawyer's opinion first; none is planned.

## Known limits (accepted, from review round 3 and the attack pass of 21 October 2026)

- **The registry can withhold a message.** It can't read, forge, alter or reorder one, but it
  can hold back the newest (a changed payout account, say). A changed account shows beside
  the old one; the payer is told to check before paying.
- ~~A partner's name comes from the registry.~~ Closed: a receipt's key counts only when the
  person checking named it themselves (`veilcore/payment-partners.ts`); VeilCore keeps no list
  of its own (blueprint section 4). The registry's name for a key is shown as unchecked.
- **Invites cost nothing to make.** Anyone can make invites and open channels for them, within
  per-client daily limits; empty channels are deleted after a week. There is no total cap,
  which would let an attacker stop every honest license.
- **Either side can fill a deal's channel so the other can't post** (2,000 messages). It takes
  at least 20 client-days at 100 messages per client per deal per day. The on-chain license is
  unaffected (the licensor can still revoke) and the signed record each side downloads shows
  what happened. Attack pass of 21 October 2026, finding 7.
- **Receipts are readable by anyone holding the statement's fingerprint** (only the two parties
  and their partner have it).

## Going live (the switch)

One reviewed change, after a full run on the test network. Everything that depends on it reads
these two lines, so the change itself is two lines:

- `bboard-ui/src/config/copy.ts`: `AGREEMENTS_LIVE = true`.
- `sponsor/src/policy.ts`: `MAINNET_AGREEMENTS = true` (a test checks the two agree). On
  mainnet the sponsor's list of circuits can't be changed by configuration, only by this line.

What follows from them, with nothing else to edit:

- The app: every "Practice only" label goes. A practice agreement made before the switch stays
  marked "Practice" wherever it appears, with a line saying it was never on Midnight
  (`veilcore/agreements-real.ts`).
- The public pages, in every language: the four sentences that called licenses and lab
  agreements simulated say they are made here (`LIVE_SWAPS` in `i18n/en-mainnet.ts`, and each
  language's own), and the "What's live where" table says yes for veilcore.org. Royalties paid
  on Midnight itself stay on test networks (`ONCHAIN_PAYMENTS`), and the pages say so.
- What crawlers read: the static summary (`vite.config.ts`) and llms.txt.
- The sponsor's `/sponsor/status` says `"agreements": true`.

The order, because each step checks the one before:

1. The registry: its deal and statement routes (`license-invites-v1`, `deals-v1`,
   `payment-receipts-v1`, `passkey-vault-v1`) deployed to the mainnet registry.
   `deploy:mainnet` refuses to build until `/health` lists them.
2. The mainnet sponsor, deployed from the switch commit. `deploy:mainnet` refuses until its
   `/sponsor/status` says `"agreements": true`, so a site can't offer licenses the sponsor would
   refuse to pay for.
   On the mainnet sponsor, also set `LIMIT_PER_NETWORK_HOUR=15` (the default, 3, is too few
   when a breeder and a grower make a license on the same Wi-Fi: issue, countersign and a
   royalty obligation are already four transactions from one network).
3. The site: `npm run deploy:mainnet` with `VEILCORE_MAINNET_SPONSOR` and
   `VITE_INDEXER_RELAY_URL` set. With licenses on it refuses to run without them.

Approval: the founders, in writing, after a clean test run.
