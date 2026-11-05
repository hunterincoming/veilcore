# Certification of the registry operator (template)

**SAMPLE TEXT. NOT LEGAL ADVICE. A lawyer in the court's jurisdiction adapts it before
anyone signs it.**

## What this is for

A VeilCore evidence bundle already carries a declaration for the record's holder and, if
wanted, a technical witness (`DECLARATION-TEMPLATE.txt`, built by
`bboard-ui/src/veilcore/evidence/declaration.ts`). Neither can speak to how the registry
works: the holder only knows what "the registry reported". US Federal Rules of Evidence
902(11) and 902(13), and Vermont's 12 V.S.A. 1913, want that from "a qualified person"
who knows the process and can say it is done as a regular practice. That person is
VeilCore's registry operator. An outside review of the evidence path (5 November 2026)
named the missing operator certification as the second biggest gap for courts.

The operator signs one of these **on request**, for one batch, after checking every fact
in it against the registry and the chains. It says what the registry did and when. It says
nothing about the record's contents, the plant or animal, who bred it, or any lab's work.

## How to fill it in

1. `GET /batches` on the registry: find the batch, its root and its sealing time.
2. `GET /batches/<id>/root.bin`, `/root.bin.ots` and, when there is one, `/root.tst`. Keep
   the files; their SHA-256 go in Schedule A.
3. The Midnight transaction: look it up on a block explorer or through the relay, and copy
   the block height and time as the chain shows them, not as the registry says.
4. The Bitcoin block: `ots verify root.bin.ots` (the official client, with a Bitcoin node),
   or the two-explorer check in `docs/bitcoin-stamp-check-11oct.md`.
5. The RFC 3161 token: `openssl ts -verify -data root.bin -in root.tst -token_in -CAfile
   <the TSA's chain>`. State the TSA and whether it is on an EU trusted list as a qualified
   service, checked on the day (not from the registry's `qualified` flag).
6. Leave out anything you did not check yourself.

---

## CERTIFICATION OF [NAME], REGISTRY OPERATOR, VEILCORE

I, [full name], declare:

1. I am [role] of [VeilCore's legal entity, or "the persons operating VeilCore" until one
   exists]. Since [date] I have been responsible for operating the VeilCore registry at
   [registry address] and for the services that date its batches. I am familiar with how
   the registry receives, seals and dates records, and I make this certification from that
   knowledge and from the checks described below, which I made myself on [date].

2. **How the registry works, as a regular practice.** The registry receives a record's
   fingerprint (a SHA-256 commitment computed in the holder's browser) when the holder's
   app saves it, at or near the time the record is made, together with a copy of the record
   locked with the holder's vault key, which the registry does not hold and cannot open,
   and a few readable fields (the record's id, kind and fingerprint, and anything the holder
   chose to show on a check page) [check against the privacy terms in force on the date,
   `docs/privacy-and-data-terms.md`]. By default, when 25 fingerprints are waiting or an hour has passed (checked
   every few minutes), VeilCore's anchoring service has the registry seal every
   fingerprint received since the last batch into a batch: a Merkle tree whose
   root (the batch root) commits to each fingerprint, and gives each record an inclusion
   proof. The batch root is then dated:
   (a) on the Midnight network, by a transaction to VeilCore's published contract
   [contract address], made automatically by VeilCore's anchoring service [since date];
   (b) on Bitcoin, through the public OpenTimestamps calendars, automatically on sealing;
   (c) [when there is one] by a timestamp token from [TSA name], an RFC 3161 Time Stamping
   Authority, requested automatically within the hour of sealing.
   These steps are done by the registry's software for every batch, as a regular practice
   of VeilCore's operation, and not for any particular dispute. The process produces an
   accurate result: each date can be re-checked by anyone from the files in Schedule A
   against Midnight, Bitcoin and the TSA, without VeilCore. I last received the dates in
   paragraph 3 from those networks on [date and time, UTC]. The software is published
   at [repository address(es)], at version [commit] on the date of the batch.

3. **This batch.** Batch [batch id] was sealed at [sealing time, UTC] with [n] records.
   Its root is [64 hex characters]. I checked that:
   (a) Midnight transaction [hash] in block [height], dated [block time, UTC] by the
   network, calls VeilCore's contract with this root;
   (b) the OpenTimestamps proof in Schedule A verifies against Bitcoin block [height],
   dated [block time, UTC]; [if pending: it was still pending on the day I checked];
   (c) [if any] the RFC 3161 token in Schedule A, from [TSA], verifies against this root
   and states the time [genTime, UTC]. [The TSA was / was not] listed as a qualified
   time-stamping service on [the trusted list checked] on [date].

4. **What this does not say.** The dates above show that the batch root, and so every
   fingerprint in it, existed by those times. They do not show what a record says is true,
   who holds or bred any plant or animal, that a lab's work was sound, or that a holder
   owns anything. A record is the holder's own dated account of what it describes, which can
   support a claim of prior possession; it is not evidence of ownership.

5. **Schedule A** lists the files I checked and attach, with their SHA-256:
   | File | SHA-256 |
   | --- | --- |
   | root.bin | [hash] |
   | root.bin.ots | [hash] |
   | root.tst | [hash] |
   | [any explorer printouts] | [hash] |

I declare under penalty of perjury under the laws of the United States of America that
the foregoing is true and correct. [Use the form the court requires: a sworn affidavit,
a statutory declaration, or a Japanese 陳述書 (`chinjutsusho-TEMPLATE-ja.md`).]

Executed on [date] at [place].

[signature]
[full name]

---

**Where this comes from.** FRE 902(11) with 803(6) (records of a regularly conducted
activity, made at or near the time, certified by a qualified person), 902(13) (a record
generated by an electronic process that produces an accurate result) and 902(14) (data
copied from an electronic file, identified by its hash: Schedule A); written notice to the
other side before the hearing is required. 12 V.S.A. 1913 (Vermont): a declaration of a
qualified person, under oath, stating their qualification, the date and time the record
entered the blockchain, the date and time it was received from the blockchain, and that it
was kept and made as a regular practice. The sources are quoted in `docs/evidence-in-practice.md`.

**SAMPLE TEXT. NOT LEGAL ADVICE.**
