# Agreements on chain: the build to "live"

Status: in progress, 21 October 2026. Owner: hunter@veilcore.org. This page says what
the website does with VeilCore's contract once agreements are live, who does what, and
what VeilCore never does. Going live on mainnet needs both founders' approval (the switch
is in one reviewed place, below).

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
| Breeder (licensor) | Licenses a record, gets royalty statements, confirms payment, approves transfers | Only what the licensee sends them |
| Grower (licensee) | Accepts a license on their own device, files statements, proves the license to buyers | Only their own deal |
| Buyer, dispensary, regulator | Checks a license is live, checks a plant's line is clean | That a live license exists; nothing about terms or people |
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
3. **A private channel per deal.** The random values both sides already exchange for the
   code become key-exchange keys (X25519). The code covers them, so the two people who
   read it to each other are the only ones who share the resulting key. The registry
   stores the deal's messages encrypted under it and can't read or forge them.
4. **Royalty statements.** The licensee files a statement for a period (what was sold,
   what is owed under the terms). The breeder accepts or disputes it. Every statement and
   answer is encrypted for the two of them, and its fingerprint is dated on Midnight in
   the registry's hourly batch, so neither side can rewrite the history later.
   A statement can carry the sales report behind it (a Metrc export, a POS report): the file
   stays on the licensee's device, its SHA-256 goes inside the signed statement, and the
   licensor's page checks the file it is sent is that exact report (`veilcore/evidence.ts`).
   Reading sales straight from Metrc is the next step and is a business one: VeilCore applies
   to Metrc as a validated integrator, then each licensee grants it a read-only API key.
5. **Payment through a partner.** VeilCore never touches money. The payer hands a
   statement to a payment partner (a wallet or payment company, registered with VeilCore and
   its name checked).
   The partner pays through its own licensed rails, then signs a receipt over the
   statement's fingerprint with its registered key. Both sides see "paid, confirmed by
   <partner>", and the payee still confirms the money arrived. A payment made any other way is marked by the payer and confirmed by the
   payee. Any fee VeilCore charges on deals later is a decision still to make; nothing is
   charged or collected today.
6. **Offspring royalties.** A license that carries a royalty on offspring becomes an
   obligation on chain against the licensee's own record of that plant: the breeder
   proposes it, the licensee accepts it, only the breeder can release it. Every record
   both holders confirm as a descendant shows it (verifier rule 3).
7. **Parent links.** The child's holder names a parent on chain; the parent's holder
   confirms. The chain is the mailbox: a record's page lists the records waiting for it
   to confirm.
8. **Handing a license on (built 23 Oct).** The license moves in place on chain
   (proposeTransfer, approveTransfer), keeping its terms and its place, and only with both
   the holder and the breeder (`veilcore/hand-on.ts`). The breeder sends the new holder a
   hand-on link; they accept with their own key and read the breeder a second 6-digit code,
   so the breeder approves exactly the key the new holder made, whatever the old holder or
   the registry say. The breeder signs that key to the current holder ('handon'); the holder
   hands it on; the breeder approves. The holder can ask first ('handon-ask') and can take a
   proposal back until it is approved. Each earlier holder's deal and signed history stays
   with the license and in the backup. Tested against the compiled contract
   (`hand-on-actions.test.ts`). Needs the sponsor redeployed with the three calls allowed.

   **Why a license is not a Midnight token (researched 23 Oct 2026).** A license must not
   move without the breeder: selling or passing on a protected variety without the owner's
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
12. **Borrowing against licenses (built 23 Oct).** A royalty lender reads everything, under a
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
      it from its own identity (partner kit `proposeObligation`, `claimLink`), the holder
      accepts it on the record's own key, only the lender can release it. Anyone checking the
      record sees a claim is in force. Not a legal filing.
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
- ~~A partner's name comes from the registry.~~ Closed: which keys are trusted partners is
  fixed in the website's own source (`veilcore/payment-partners.ts`), changed only by a
  reviewed commit. The registry's list is shown as unchecked.
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

One reviewed change, after a full run on the test network:

- `bboard-ui/src/config/copy.ts`: `AGREEMENTS_LIVE = true` (removes every "Practice only"
  label in one place).
- `sponsor/src/policy.ts`: the mainnet list of circuits the sponsor pays for gains the
  agreement circuits. It cannot be changed by configuration on mainnet, only by this
  reviewed code change.
- The registry's deal and statement routes deployed to the mainnet registry.

Approval: Hunter and Mako, in writing.
