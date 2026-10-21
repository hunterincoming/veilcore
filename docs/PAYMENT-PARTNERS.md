# Paying royalties through VeilCore: a guide for payment partners

For wallets and payment companies that want their users to pay royalties on genetics
licensed through VeilCore. The first part is for the person deciding. The rest is for the
developer.

## Part 1, in plain English

**What VeilCore does.** A breeder licenses a plant variety to a grower. VeilCore records
the license on Midnight, and gives the two of them a private, signed channel where the
grower files what they owe each period and the breeder accepts it.

**What VeilCore does not do.** It never holds, moves or touches money, and it is not a
party to the deal. The payment is yours, under your licences and your compliance checks.

**What you get.**

- A payment request the grower hands you, in which the amount owed is signed by the grower
  and the account to pay is signed by the breeder. The signatures show neither was changed
  after the two of them wrote it. They don't show whose keys they are: before the first
  payment to an account, confirm it with the breeder (see step 3 below).
- A place to file your receipt. Once you file it, both sides see "paid through <your name>"
  under the statement, checked by their own browsers against your key.

**What you do.**

1. Register your signing key with VeilCore's registry as a payment partner (once).
2. Ask us to check your name (once a year). The registry takes receipts only from partners
   whose name we have checked: anyone can register a key under any name.
3. For each payment: check the request, pay, sign a receipt, file it.

---

## Part 2, for the developer

### Keys

One Ed25519 key, kept by you. Its public half (32 bytes, 64 lowercase hex characters) is
your identity at the registry. Register it once with `POST /attesters`, `role` set to
`payment-partner` and `displayName` set to your company's name, signed by the key itself
(`registrationPayload` in the registry's `lineage/attesters.mjs`). Write to
hunter@veilcore.org to have the name checked; we check it against a public listing and your
email domain.

### The payment request

The grower's browser saves it as `veilcore-payment-request-<id>.json`:

```json
{
  "v": "veilcore/payment-request/v1",
  "registry": "https://<registry>",
  "pay": { "amount": "500.00", "currency": "USD", "to": "acct-123", "method": "Example Pay" },
  "statement": { "message": { "type": "statement", "...": "..." }, "signature": "<128 hex>", "signer": "<grower key>", "fingerprint": "<64 hex>" },
  "payout":    { "message": { "type": "payout", "...": "..." },    "signature": "<128 hex>", "signer": "<breeder key>", "fingerprint": "<64 hex>" }
}
```

Before paying, check:

1. Both signatures: Ed25519 over the UTF-8 bytes of
   `"veilcore/deal-message/v1\n" + canonical(message)`, where `canonical` is VeilCore's
   canonical JSON (`canonicalise` in `veilcore-records`: keys sorted, no spaces). The
   statement must verify against `statement.signer` and say `"from": "licensee"`; the payout
   against `payout.signer` and say `"from": "issuer"`.
2. `pay` matches them: `amount` and `currency` are the statement's `amountOwed` and
   `currency`; `to` is the payout's `account`.
3. Whose keys they are. Inside VeilCore the code exchange binds them: the grower and the
   breeder read each other a 6-digit code made from both keys, so each holds the other's
   real key. You weren't part of that, and anyone who edits the request file can re-sign it
   with keys of their own. So before the first payment to a new `payout.signer` or a new
   `to` account, confirm with the breeder, through a channel you already trust, the first
   eight characters of `payout.signer` and the account.

Amounts are decimal strings. Never read them as floating-point numbers.

### The receipt

After paying, sign and file:

```json
{
  "v": "veilcore/payment-receipt/v1",
  "statementFingerprint": "<statement.fingerprint>",
  "statementId": "<statement.message.statementId>",
  "amount": "500.00",
  "currency": "USD",
  "payTo": "acct-123",
  "reference": "<your payment id>",
  "paidAt": "2026-10-21T12:00:00.000Z",
  "partner": "<your public key>"
}
```

Sign the UTF-8 bytes of `"veilcore/payment-receipt/v1\n" + canonical(receipt)` with your key,
then send `POST <registry>/payment-receipts` with `{ "receipt": …, "signature": "<128 hex>" }`.

In Node 22 or later:

```js
import { sign, createPrivateKey } from 'node:crypto';
import { canonicalise } from 'veilcore-records';

const bytes = Buffer.from(`veilcore/payment-receipt/v1\n${canonicalise(receipt)}`, 'utf8');
const signature = sign(null, bytes, createPrivateKey(yourPrivateKeyPem)).toString('hex');
await fetch(`${request.registry}/payment-receipts`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ receipt, signature }),
});
```

The registry keeps a receipt only when the signature verifies, your key is registered as a
`payment-partner`, and the statement is one it holds. Filing the same receipt twice is
harmless. A different receipt under the same `reference` is refused. Both sides' pages
re-check your signature, and flag a receipt whose amount, currency or account differs
from the statement.

### What the grower and breeder still do

Your receipt says you paid. The breeder still confirms the money arrived, in their own
words, on their own page. Both steps are signed, private to the two of them, and dated on
Midnight by the registry's hourly anchor.
