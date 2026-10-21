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
5. **Payment through a partner.** VeilCore never touches money. The payer hands a
   statement to a payment partner (for example a wallet that holds an API key with us).
   The partner pays through its own licensed rails, then signs a receipt over the
   statement's fingerprint with its registered key. Both sides see "paid, confirmed by
   <partner>". A payment made any other way is marked by the payer and confirmed by the
   payee. VeilCore's share of a deal is calculated and shown, never collected here.
6. **Offspring royalties.** A license that carries a royalty on offspring becomes an
   obligation on chain against the licensee's own record of that plant: the breeder
   proposes it, the licensee accepts it, only the breeder can release it. Every record
   both holders confirm as a descendant shows it (verifier rule 3).
7. **Parent links.** The child's holder names a parent on chain; the parent's holder
   confirms. The chain is the mailbox: a record's page lists the records waiting for it
   to confirm.
8. **License transfers.** A licensee hands a license on to a new holder, whose key is
   made on their own device. Takes effect only when the breeder approves.

## Law and wording

- Terms of Use: VeilCore is a record-keeping tool, not a party, broker, escrow, payment
  service or legal adviser. Users are responsible for the legality of what they record
  and trade where they are. Cannabis is a listed example, not the only one.
- Every agreement screen says: the terms are between the parties; VeilCore records that
  the agreement exists, when, and its state on chain.
- Payment rails are the partner's, under the partner's licenses. A money-moving feature
  inside VeilCore needs a lawyer's opinion first; none is planned.

## Going live (the switch)

One reviewed change, after a full run on the test network:

- `bboard-ui/src/config/copy.ts`: `AGREEMENTS_LIVE = true` (removes every "Practice only"
  label in one place).
- `sponsor/src/policy.ts`: the mainnet list of circuits the sponsor pays for gains the
  agreement circuits. It cannot be changed by configuration on mainnet, only by this
  reviewed code change.
- The registry's deal and statement routes deployed to the mainnet registry.

Approval: Hunter and Mako, in writing.
