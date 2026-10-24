# Lending against a VeilCore license or record

For lenders, and anyone else asked to value a breeder's licenses: what VeilCore can show you,
what it can't, and how to record a claim on a record that only you can release. Part 1 is for
the person making the lending decision. Part 2 is for whoever runs your systems.

You can do all of this without talking to VeilCore. Checking is free and needs no account.

---

## Part 1: for the lender

### What the borrower can give you

**A lender pack.** A .zip the licensor downloads from their license's page. It holds:

- the license's royalty history, one file per licensee, every message exactly as each side
  signed it;
- `summary.txt`: what those files add up to;
- `README.txt`: how to check it.

Each royalty statement is signed by the **licensee**, the one who pays. A statement counts as
settled only when the licensee signed that they paid and the licensor signed that the same
amount arrived. Change one character in a file and its signature stops checking.

**Proof the license is live.** The licensee can prove, from their own VeilCore page, that they
hold a live license from the record, answering a one-time challenge you choose. That comes from
the Midnight network, not from the borrower or VeilCore.

**The record.** Its check link shows when its description was fixed, by a date on Midnight,
and any lab signatures on it.

### What it can't show

- **Who holds the licensee key.** One person can make both keys and sign a whole deal with
  themselves. Confirm with the licensee directly that the key in the file is theirs, the way you
  confirm any receivable. Their key is printed in the pack's summary.
- **That money moved**, beyond both sides' signatures. A payment made on Midnight can also be
  checked there; one made by bank transfer is the two parties' word, signed.
- **The license terms' legal effect.** The pack carries the terms as agreed. What they mean is a
  question for your lawyer.

### Check it yourself

With Node.js installed:

```
npx veilcore-records deal deal-records/1-<licensee>.json
```

It checks every signature and prints the totals. The format is open (SPEC.md section 11.10 at
github.com/hunterincoming/veilcore-sdk); the checker is the published veilcore-records package.

### A claim on the record

You can record on Midnight that a record is pledged to you. While it is in force, anyone who
checks the record sees that a claim is in force, and **only you can release it**. It does not
move the record or stop the holder using it. It tells the next lender the record is already
pledged.

It is **not a legal filing.** File your security interest the usual way (a UCC-1 in the US, or
your jurisdiction's equivalent). The chain claim sits beside it as a public flag. How the two
relate in your jurisdiction is for your counsel.

How it goes:

1. You propose the claim on chain from your own identity (Part 2).
2. You send the holder a claim link.
3. They open it on the device that holds the record. Their page reads Midnight for exactly that
   claim and offers to accept or reject it.
4. Once they accept, it is in force. When the loan is repaid, you release it.

---

## Part 2: for your systems

You need the partner kit, `@veilcore/contracts` (see its README for connecting, your wallet, and
where your secrets must be kept), and an identity of your own on VeilCore's contract: anchor one
record from your own key, once.

```js
import { commit, newSecret, toHex, claimLink } from '@veilcore/contracts';

// Once: your identity. Keep both secrets in your secret manager before anything is sent.
await vc.useRecordSecret(lenderSecret);
await vc.anchor(commit.recovery(lenderRecoverySecret));

// Per loan: the claim is a hash of your own terms with a salt you keep (never the terms).
const salt = newSecret();
const claim = commit.obligation(`Loan ${loanReference}`, salt);
await vc.proposeObligation(recordIdentity, claim);

// The holder's link (claimLink: in @veilcore/contracts from 0.3.0).
const link = claimLink('https://veilcore.org', {
  record: recordIdentity,
  claim,
  claimant: lenderIdentity,
  name: 'Your institution’s name',
});

// Repaid: release it. Only your identity's current key can.
await vc.discharge(recordIdentity, claim);
```

Until that release, the link is
`https://veilcore.org/claim#r=<record identity>&o=<claim>&b=<your identity>&n=<your name>`, all
three values as 64 lowercase hex characters and the name URL-encoded.

Check a claim's state at any time from the contract's public state: the obligation key
(`obligationKey(record, claim, you)`) is in `pendingObligations` while waiting and in
`openObligations` once accepted. `vc.checkLineage(record)` reports the claims in force on a record
and its ancestors (verifier rules 2 to 4).

You can withdraw a proposal the holder has not answered (`withdrawObligation`). A holder can
reject it. At most 8 of your proposals can wait at once.
