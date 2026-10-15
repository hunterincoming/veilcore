# Using the evidence bundle in practice

15 October 2026. For a breeder and their lawyer.

> **Not legal advice.** This page explains what the evidence bundle is and what public
> rules and court decisions say about records like it. It does not say what any court or
> agency will do with yours. Before you rely on the bundle in a dispute, an application or
> a contract, ask a lawyer where you are.

## In one paragraph

The evidence bundle is one `.zip` you download from a plant's page on the VeilCore site
(**Download evidence bundle**). It lets anyone check, without VeilCore, that your record
existed, unchanged, by the date of a public transaction. It now also holds two files for
people who are not technical: **`EXAMINER-SUMMARY.html`**, a printable summary you can print to PDF
for a lawyer, an examiner or a court clerk, and **`DECLARATION-TEMPLATE.txt`**, sample text
for a written declaration about the record and the bundle. The bundle shows *when* a record
existed and that it hasn't changed. It doesn't show that what the record says is true, and
VeilCore doesn't vouch for anyone.

## What is in the bundle

The full list is in [`evidence-bundle.md`](evidence-bundle.md). The parts that matter here:

| File | Who it is for | What it does |
|---|---|---|
| `verify.html` | Anyone | Checks the files against each other on your own computer, with the internet off. |
| `EXAMINER-SUMMARY.html` | A lawyer, examiner, clerk | A printable summary: the record as sealed, its fingerprint, batch, transaction and network, how it was checked and when, lab signatures, sample receipts, the Bitcoin stamp, and "what this shows / what this does not show". Text only: it has no script and loads nothing. Open it in a browser and print to PDF. |
| `DECLARATION-TEMPLATE.txt` | You, your lawyer, a technical witness | Fill-in-the-blanks sample text. The bundle's facts are filled in (record ID, fingerprint, batch root, transaction) and Schedule A lists every other file with its SHA-256. Marked "Sample text. Not legal advice." at the top and bottom. |
| `README.txt` | Anyone | What each file is, how to check it, what it proves and what it doesn't. |

## What the bundle shows, and what it can't

**It shows**, once someone looks up the transaction (steps in the summary and README):

- this record existed, exactly as sealed, by the time of that transaction (or Bitcoin block);
- so whoever had it sealed held this record by then;
- a lab key that signed a report or a sample receipt about the record did so (the
  signature checks), and whether it later withdrew it.

**It can't show:**

- that anything the record says is true: the name, who bred it, the stated date. You wrote those;
- who holds the plant or the record now;
- that a signing key belongs to the lab it names. VeilCore doesn't vouch for anyone;
- any date before the transaction. The sealing time inside the record is your device's
  clock, and the registry's "first saw" time is the registry's clock: each is one party's word;
- that a sample was handled properly before it reached the lab. That is what the chain of
  custody (below) is for.

## Four situations

### A dispute: "we bred it first", or a lab result is challenged

1. Download the bundle as soon as a dispute looks likely, and keep the `.zip` unchanged.
   Write down where you keep it and who has had it (the declaration asks for this).
2. Give your lawyer the whole folder. The examiner summary is the page to read first.
3. Have someone check it independently: open `verify.html` offline, look the transaction up
   on a Midnight explorer, and check the Bitcoin stamp with the OpenTimestamps client.
   Part 2 of the declaration template is for that person.
4. The date helps only together with the rest of your evidence: breeding notebooks, photos,
   lab reports, emails, invoices, people who saw the plants. Courts weigh it with everything
   else (see "What courts and rule-makers have said").
5. If the dispute is about a lab result, the sample's custody matters most: who took it,
   sealed it, sent it, and what the lab wrote on arrival (see "Chain of custody").

### A licence negotiation

The licensee wants to know the plant is what you say and that you held it before them.

- Send the examiner summary (printed to PDF) with your offer. It shows the record's date and
  any lab signatures without revealing anything you didn't seal.
- Leave the record's key out of the bundle unless they need it: with it, anyone can tie the
  record to everything its key does on the network. It is off by default.
- Put the record ID and fingerprint in the licence itself, so both sides point at the same
  record. The fingerprint changes if one character of the record changes.

### A plant variety application

The US Plant Variety Protection Office asks for an origin and breeding history (Exhibit A)
and accepts additional supporting data and attachments (Exhibit D). Vegetatively propagated
varieties need no deposit; the applicant signs a declaration that the propagating material
will be kept at a named location, open to inspection
([USDA AMS, PVP application](https://www.ams.usda.gov/node/5780)). The office doesn't ask for
a blockchain date. If you choose to attach the examiner summary as supporting material, say
what it is in plain words: "a dated record of the breeding entry, checkable without VeilCore".
Ask your lawyer or the examiner first whether it helps.

### A sale of plants, seed or a breeding line

- Give the buyer the record ID, the summary, and (if they ask) the full bundle. They can
  check it offline.
- If you hand the record over in VeilCore, the buyer's copy is checkable the same way; the
  bundle you made before still dates *your* record.
- The bundle doesn't make the sale lawful, and doesn't show the buyer may propagate the
  plant. That is what the contract and any licence are for.

## Chain of custody: the sample matters as much as the record

When a case turns on a lab test, the question is often "is this the sample you say it is?"
In 2026 China's Supreme People's Court published typical plant-variety cases on technical
fact-finding ([China IP Law Update, 9 June 2026](https://www.chinaiplawupdate.com/?p=4122)):

- in the "Xiangxue" gardenia case, samples that a notary watched being taken and sealed,
  with the seal matching the test report, were accepted;
- in the "Bainong 207" wheat case, the first court discounted a control sample that "lacked a
  sample number" and whose source was questionable (on appeal the Supreme People's Court
  ordered a court appraisal and reversed);
- in an Anthurium case, a DNA report built from only 10 varieties was given no weight.

China's Hangzhou Internet Court, accepting blockchain evidence in 2018, also first checked
how the data was captured and that the platform was neutral
([China Justice Observer](https://www.chinajusticeobserver.com/a/how-chinese-courts-review-electronic-evidence-stored-on-blockchain)).

What this means for you: fill in the sample details when you make a lab code (sample ID,
seal number, where and when it was taken, who saw it), use a numbered tamper-evident bag,
and keep the courier receipt. When the lab signs its receipt, the bundle and the examiner
summary carry what each side wrote and whether the lab's signature covers it, and
`verify.html` rechecks that offline: it works out the digest of the sample details again and
compares it with the one in the lab's signed receipt. The declaration template says which
deliveries a lab signed for, which lab codes were never used, and gives what the lab wrote on
arrival only where its signature covers it. VeilCore doesn't check any of it: it records who
wrote what, and when.

## What courts and rule-makers have said

Only sources we could read are listed. Where a source is a law firm's or a journal's report
of a decision rather than the decision itself, it says so.

| Where | What it says | What it doesn't do |
|---|---|---|
| **US federal courts** | Federal Rules of Evidence 902(13) and 902(14) (2017): a record generated by an electronic process "that produces an accurate result", and data copied from a device or file and "authenticated by a process of digital identification", can be authenticated by "a certification of a qualified person" that meets Rule 902(11) or 902(12), with reasonable written notice to the other side ([rule text and committee notes, govinfo](https://www.govinfo.gov/content/pkg/USCODE-2023-title28/html/USCODE-2023-title28-app-federalru-dup2-rule902.htm); [Federal Judicial Center explainer](https://www.fjc.gov/sites/default/files/materials/35/Evidence%20Rules%20902%2013%20and%2014%20Video%20Transcript.pdf)). The committee note: if the hash values of the original and the copy are the same, "it is highly improbable that the original and copy are not identical". | "A certification under this Rule can only establish that the proffered item is authentic." The other side can still object, for example as hearsay. It says nothing about blockchains. |
| **US federal declarations** | 28 U.S.C. 1746: a written declaration "under penalty of perjury that the foregoing is true and correct", dated and signed, can stand in for a sworn statement in federal matters ([govinfo](https://www.govinfo.gov/content/pkg/USCODE-2022-title28/html/USCODE-2022-title28-partV-chap115-sec1746.htm)). The declaration template uses this wording. | State courts and other countries have their own forms. |
| **Vermont** | 12 V.S.A. 1913: a digital record registered in a blockchain is self-authenticating with a written declaration of a qualified person, made under oath, stating their qualification, when the record entered the blockchain, when it was received from it, and that it was kept and made as a regular practice. It presumes the date and time recorded are when it was added ([statute](https://legislature.vermont.gov/statutes/section/12/081/01913)). | The presumptions "do not extend to the truthfulness, validity, or legal status" of the contents. One state only. |
| **European Union** | eIDAS (Regulation 910/2014), Article 41: an electronic time stamp can't be refused as evidence just because it is electronic or not qualified; a **qualified** electronic time stamp "shall enjoy the presumption of the accuracy of the date and the time it indicates and the integrity of the data" ([EUR-Lex](https://eur-lex.europa.eu/eli/reg/2014/910/oj/eng); text as read on [legislation.gov.uk](https://www.legislation.gov.uk/eur/2014/910/chapter/III/section/6)). Since the 2024 amendment, Article 45k gives the same kind of presumption ("unique and accurate sequential chronological ordering" and integrity) only to data in a **qualified electronic ledger** ([Article 45k text, Better Regulation](https://service.betterregulation.com/document/720976)). | Midnight and Bitcoin are not qualified ledgers, and VeilCore is not a qualified trust service provider. A judge weighs our dates case by case. |
| **France** | Tribunal judiciaire de Marseille, 20 March 2025 (AZ Factory v. Valeria Moda): a blockchain registration of design sketches, backed by a bailiff's report and other evidence, was accepted as one element of a "block of evidence" for who created the designs ([as reported by Dreyfus & associés](https://www.dreyfus.fr/en/2025/10/15/is-blockchain-evidence-legally-recognized-in-copyright-law/)). | Not "pure" evidence on its own; the judge kept full discretion over its weight. |
| **China** | Hangzhou Internet Court, 27 June 2018 (Huatai Yimei v. Daotong): blockchain evidence accepted after the court checked the platform's neutrality, how the data was captured, and that the hashes matched ([China Justice Observer](https://www.chinajusticeobserver.com/a/how-chinese-courts-review-electronic-evidence-stored-on-blockchain)). Supreme People's Court Online Litigation Rules (2021): data stored by blockchain and checked by technology may be held not tampered with *after* it went on chain, unless rebutted ([summary, CJO](https://www.chinajusticeobserver.com/law/x/online-litigation-rules-for-people-s-courts-20210616)). | Courts still examine whether the data was accurate *before* it went on chain. |
| **Japan** | We found no court decision that weighs a blockchain date directly. | |

Nowhere does a bare blockchain date settle a case by itself. Don't describe the bundle as
"court-proof".

## A qualified electronic time stamp and a blockchain anchor are different things

- A **qualified electronic time stamp** (EU eIDAS Articles 41 and 42) is issued by a
  qualified trust service provider that a national supervisor has checked. It binds the
  data to a time from a source linked to UTC, signed by that provider. In the EU it carries
  a legal presumption that the date and the data are right. The usual format is an RFC 3161
  token ([IETF RFC 3161](https://www.rfc-editor.org/rfc/rfc3161)).
- A **blockchain anchor** (what VeilCore does on Midnight, plus a Bitcoin stamp through
  OpenTimestamps) records a fingerprint in a transaction on a public network. Once a
  transaction is confirmed, no single party can rewrite it, VeilCore included; that rests
  on each network's consensus rules, not on anyone's promise. Anyone can check it without
  trusting VeilCore, and it outlives VeilCore. But no supervisor has checked
  it and, in the EU, it carries no legal presumption: it is evidence a judge weighs.
- They can be combined: the same batch root can carry both. The bundle today has only the
  blockchain anchors. A qualified time stamp is a possible addition (the SDK already reads
  RFC 3161 tokens); qualified providers usually charge for each one.

## The declaration template: where its structure comes from

`DECLARATION-TEMPLATE.txt` follows the public sources above:

- **Part 1, the record holder**: who you are and how you know; how and when the record was
  made; how it was dated (the transaction, filled in); how the bundle's files were made and
  kept; that the copies are true copies, identified by SHA-256 (the hash identification FRE
  902(14) describes); lab signatures and sample receipts; what you are not saying; the 28
  U.S.C. 1746 closing.
- **Part 2, an optional technical witness**: qualifications; what they received; how they
  checked each part (hashes, `verify.html`, the transaction look-up, the Bitcoin stamp); how
  the method works and what they did not check. This is the "qualified person" of FRE
  902(13)/(14) and the Vermont statute.
- **Schedule A**: every other file in the bundle with its SHA-256, so a copy can be matched
  to the original file by file.
- **Notes for whoever adapts it**: the rules above in short, to delete before signing.

Every fact only the signer can know is a `[blank]`. Delete anything that isn't true. Courts
differ on form (declaration, sworn affidavit, notarised statement): a lawyer where you are
should adapt it.

## What VeilCore can't do

- Vouch for a record, a breeder, a lab or a key.
- Make a record true, or make a court accept it.
- Give a qualified (legally presumed) time stamp, today.
- Prove what happened to a sample before a lab signed for it. The sample details are what
  each side typed.
- Recover a record's date if the batch was never anchored, or delete a fingerprint already
  anchored on a public network.
- Act as your lawyer or expert witness.

## Sources used

Primary or official: the [Federal Rules of Evidence 902, with 2017 committee notes
(govinfo)](https://www.govinfo.gov/content/pkg/USCODE-2023-title28/html/USCODE-2023-title28-app-federalru-dup2-rule902.htm);
the [Federal Judicial Center transcript on Rules 902(13) and (14)](https://www.fjc.gov/sites/default/files/materials/35/Evidence%20Rules%20902%2013%20and%2014%20Video%20Transcript.pdf);
[28 U.S.C. 1746 (govinfo)](https://www.govinfo.gov/content/pkg/USCODE-2022-title28/html/USCODE-2022-title28-partV-chap115-sec1746.htm);
[Vermont 12 V.S.A. 1913](https://legislature.vermont.gov/statutes/section/12/081/01913);
[eIDAS on EUR-Lex](https://eur-lex.europa.eu/eli/reg/2014/910/oj/eng) and
[Articles 41 and 42 as read on legislation.gov.uk](https://www.legislation.gov.uk/eur/2014/910/chapter/III/section/6);
[USDA AMS, PVP application](https://www.ams.usda.gov/node/5780);
[IETF RFC 3161](https://www.rfc-editor.org/rfc/rfc3161).

Reports of decisions and rules: [China IP Law Update on the SPC's 2026 plant-variety
cases](https://www.chinaiplawupdate.com/?p=4122); [China Justice Observer on the Hangzhou
case](https://www.chinajusticeobserver.com/a/how-chinese-courts-review-electronic-evidence-stored-on-blockchain)
and [on the Online Litigation Rules](https://www.chinajusticeobserver.com/law/x/online-litigation-rules-for-people-s-courts-20210616);
[Dreyfus & associés on the Marseille decision](https://www.dreyfus.fr/en/2025/10/15/is-blockchain-evidence-legally-recognized-in-copyright-law/);
[Better Regulation, eIDAS Article 45k](https://service.betterregulation.com/document/720976).

Couldn't read directly: the Cornell LII copies of FRE 902 and 28 U.S.C. 1746 (blocked here;
the govinfo copies were used), the full text of eIDAS Articles 41 and 45k on EUR-Lex (the page
didn't load as text), and the article-by-article text of the 2021 Online Litigation Rules.
Have a lawyer check the current text before relying on any of it.
