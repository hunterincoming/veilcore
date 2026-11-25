# The licensor kit (design, not built)

For breeders, variety owners and royalty administrators who license material to businesses and
want each licensee to keep dated records of what they propagate and sell.

**Status, 25 November 2026: this page is the spec for a kit that is not built yet.** Parts of it
are live on veilcore.org today: licences on chain, royalty reports sent and answered between
licensor and licensee (run end to end on mainnet on 8 November 2026,
[agreements-live.md](../agreements-live.md)), and requiring a record from applicants
([require-a-record.md](require-a-record.md)). The overdue line on a public check page is built
and not live ([royalty-pay.md](../royalty-pay.md)). The monthly licensee report and the clause
below are design only. Nothing here should be pitched as working until it has run on mainnet.

---

## Who it is for, and who it is not for

The kit is built and marketed for **business licensees**: nurseries, labs, seed companies and
other propagators who sign a licence with a breeder or an administrator.

It is **never** built or marketed for farmers growing food or saving seed. It must not be used to
check, report on or police a farmer's own saved seed, and nothing in it should make that easier.
The clause template below says so too (clause (f)).

## Before you rely on it: who can change the contract today

The VeilCore contract on Midnight mainnet has a **maintenance authority**: one key, held by
VeilCore's founders on paper (two copies, either one enough). Whoever holds it can change the
contract's rules, including removing a claim on a record or inserting a licence that nobody
issued. Every change is visible on chain and raises a public counter. A 2-of-3 committee, with
one key held independently of the founders, is planned and not done. The full disclosure, and
how to check the counter, is in [lenders.md](lenders.md#who-can-change-the-contract-today) and
[maintenance-policy.md](../maintenance-policy.md).

## What a record shows, and what it doesn't

A date shows this record existed. It doesn't show the holder didn't also seal other versions.
Weight comes from what someone else saw at the time.

That is why the reports below are delivered, not just sealed.

## The monthly licensee report: delivered and receipted

Each month the licensee reports, per licensed variety: units propagated, units sold, and the batch
or lot IDs.

**A report counts only if it was delivered to the licensor at the time, and the licensor's
receipt is what gets dated.** A report the licensee sealed privately and shows later counts for
nothing: a licensee could seal an honest report and a low one, then show whichever suits an
audit. Delivered at the time, there is one copy, held by the party who would be cheated.

How it fits what exists:

- Royalty reports already work this way. The licensee signs each report and sends it in the deal;
  the licensor answers it; the licensee's page registers it at the registry with its due date
  ([royalty-pay.md](../royalty-pay.md), "The licensee registers each report"). The monthly report
  is built on the same signed deal messages, never as a separate private seal.
- The licensor seals their receipt (the report's fingerprint and the day it arrived) as their own
  record. The licensee keeps the report and the licensor's signed acknowledgement.
- A missing month is visible to both sides as a missing message, not as a gap someone can fill in
  later.

## A warning about novelty, for breeders who haven't filed yet

Dated sales and propagation reports made before you file for plant variety protection can count
against novelty. Ask counsel what to seal, and when, before licensees start reporting on a
variety you haven't filed.

## The public overdue line

When a licensor posts that a royalty statement is overdue, the public check page carries it as
the licensor's word, with the licensee's answer beside it
([royalty-pay.md](../royalty-pay.md), "Overdue on the public check page"). The rule behind it:

**VeilCore publishes what the holder signs; the holder answers for it.** VeilCore doesn't decide
whether a payment is late, and doesn't vouch for the line.

## For breeders: licences across contract versions

**Continuity (proposed 25 November 2026; needs both founders' written approval before it is
policy).** Every VeilCore contract version stays readable, and its licences revocable, for the
life of the longest licence made under it. A licence made on one version is never stranded by a
newer one.

What this would change: the current plan for version 2 says VeilCore's site and fee service stop
sending to version 1 at the switch ([contract-v2.md](../contract-v2.md), section 6). Under this
policy, veilcore.org would keep checking and revoking version 1 licences, and paying their network
fee, for as long as one is active. The version 1 contract itself keeps every circuit callable
after its authority is retired ([runbooks/two-of-three.md](../runbooks/two-of-three.md)), so
nothing on chain stands in the way.

**Your licences are countable in public.** The contract keeps a public count of active licences
for each licensing record (`activeLicensesBy`, keyed by the record's original identity on chain).
It goes up when a licensee countersigns and down when a licence is revoked. Anyone who can tie
your variety's check link to that identity can see how many licences are active, and when the
number changes. The terms, the licensees and the royalties stay private; the count does not.

## Licence clause template: the evidence clause

> **For local counsel to review. Sample text, not legal advice.** It binds only the parties who
> sign it, not strangers. How far an agreement on evidence is respected differs by country:
> local counsel decides whether and how it is used.

> **Records.** (a) Each lot propagated or sold under this licence is recorded as a sealed
> VeilCore record before shipment, with its lab result where required. (b) The parties agree
> that a record which checks under VeilCore SPEC version [x] with [the named independent
> checker] **shall be accepted between them as evidence that it existed unchanged by the
> earliest date shown by its anchors**, unless the party disputing it proves otherwise.
> (c) This says nothing about whether the record's contents are true. (d) Each party keeps
> its backup file and records for [the licence term plus x years], and won't delete records
> covered by this licence. (e) Disputes about whether a record checks go to [named
> independent expert / WIPO expert determination]. Other disputes go to [forum].
> (f) Nothing here restricts any statutory exemption for farmers or researchers.

What each part does: (b) turns the date into a fact both parties agreed; (d) makes keeping
records a contract term, which answers "what else did you seal?" between the parties; (e) names
the expert in advance; (f) keeps the scope rule above.
