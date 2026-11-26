# Token and custody facts

> **Draft, for counsel to confirm.** Not legal advice. One page of facts, each with where it can
> be checked in this repository, as of 25 November 2026. If the code changes, this page changes
> with it.

## No token

VeilCore has no token, coin or presale and has never sold one (`README.md`, "No token"). The
contracts create no token, and no circuit deposits, escrows, pools or transfers one
([deployment-record-revision-4.md](../deployment-record-revision-4.md), value at risk;
[contract-v2.md](../contract-v2.md) section 2: "no payment logic, no token moves").

## No user funds

VeilCore holds and moves no user funds. It has no wallet in the middle of a payment, no contract
that touches funds, and no key or admin power over a payment
([royalty-pay.md](../royalty-pay.md), "The line this keeps").

## How royalties flow

- **On veilcore.org today:** a licence's terms, royalty reports, "I paid" and "received" are
  messages between the two parties, locked to them (`lineage/deals.mjs` in the registry). The
  licensee pays the licensor directly, by whatever means they agree, outside VeilCore. VeilCore
  records that a report was sent, answered and confirmed; it never sees, holds or starts the
  payment ([agreements-live.md](../agreements-live.md), item 4).
- **Payment partners:** a company the two parties choose can pay through its own rails and sign
  a receipt the registry stores ([PAYMENT-PARTNERS.md](../PAYMENT-PARTNERS.md)). The money goes
  through that company, not VeilCore.
- **Built, not on veilcore.org:** paying in NIGHT on Midnight, from the licensee's wallet
  straight to the licensor's address (`ONCHAIN_PAYMENTS = !IS_MAINNET`, test networks only), and
  paying in a US dollar stablecoin on Cardano, also wallet to wallet
  (`STABLECOIN_PAY_ON_MAINNET = false`), both in `bboard-ui/src/config/copy.ts`. Paid plans
  (`VITE_PAID_PLANS`) are built and off.
- **VeilCore's own fee**, once paid plans are on, is a flat subscription billed separately, never
  a share of a royalty ([royalty-pay.md](../royalty-pay.md)).

## The fee sponsor pays from its own wallet

Every Midnight transaction needs a network fee (DUST). VeilCore's fee sponsor pays it, so users
need no wallet. It pays from a wallet of its own, made only for this, holding a small amount of
VeilCore's NIGHT, which generates the DUST ([mainnet-sponsor.md](../mainnet-sponsor.md)).

- It takes no payment from users and holds nothing of theirs.
- It pays only for VeilCore's pinned contract and only for the calls on a fixed list
  (`sponsor/src/policy.ts`). Each fee, each day and each visitor is capped (`MAX_FEE_DUST`,
  `DAILY_BUDGET_DUST` in `sponsor/src/config.ts`; per-visitor limits in `sponsor/src/limits.ts`).
- It refuses to start with the deployer's or the main wallet's addresses, or with the
  maintenance key (`SPONSOR_FORBIDDEN_ADDRESSES` and a check for maintenance-key settings, both in
  `sponsor/src/config.ts`).

## What the maintenance key can and can't do

From [maintenance-policy.md](../maintenance-policy.md).

**Can:** add, replace or remove the contract's circuits, and replace the key itself. A new
circuit can write any of the contract's data, so the key holder could take over any identity,
insert licences, or add or remove obligations and parent links.

**Can't:** read a record (the chain holds codes, not contents); move funds (the contract holds
none); backdate block time; or act unseen (every use raises a public counter on chain, 16 on the
main contract on 13 November 2026, recorded in `deployments/mainnet.json`, and checked by
`npm run verify:deployment`).

**Who holds it:** today one key on paper, two copies, one with each founder; either copy alone
can use it. A committee of three keys with a two-of-three threshold, one held by an independent
party, is planned and not installed. Every use is limited to stated reasons, announced 14 days
ahead (72 hours after, for an urgent security fix) and published.
