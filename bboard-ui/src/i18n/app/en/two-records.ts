// The record app in English: claims about two of the holder's records (veilcore/two-record-claims.ts,
// components/document/TwoRecordClaims.tsx): "these two records are different" (proveDistinct) and
// "a correction only changed what it says" (proveUnchanged), the way in from a record's page, and
// their check page. What neither claim shows is said wherever it is offered or checked.
// SPDX-License-Identifier: Apache-2.0

export const twoRecords = {
  // The way in, under "More ways to prove" on a record's page (DocumentDetail.tsx).
  'app.tworec.more.title': 'More ways to prove',
  'app.tworec.more.text':
    'Compare the numbers sealed in this record with another of your records, without showing the numbers.',
  'app.tworec.more.distinct': 'Show these two records are different',
  'app.tworec.more.unchanged': 'Show a correction only changed what it says',

  // The panel inside it (TwoRecordClaims.tsx).
  'app.tworec.status.notYet': 'Built, not yet run on Midnight’s main network.',
  'app.tworec.status.ran': 'This has run on Midnight’s main network.',
  'app.tworec.unpaid':
    'This can’t be sent from this site yet: VeilCore’s fee service doesn’t pay for these two proofs yet. You can see what would be proved. Nothing is sent.',
  'app.tworec.what': 'What to prove',
  'app.tworec.this': 'This record',
  'app.tworec.other': 'The other record',
  'app.tworec.original': 'The earlier record this one corrects',
  'app.tworec.none': 'You have no other record with numbers under the form “{schema}”. Seal another one first.',
  'app.tworec.distinct.text':
    'This proves the two records differ in at least {k} of the numbers their form compares. It never shows which numbers differ, by how much, or how many. The form sets that number; you can’t choose it.',
  'app.tworec.unchanged.text':
    'Tick the numbers the correction was allowed to change. This proves every other number is the same in both records. The list you tick is public; the numbers are not.',
  'app.tworec.unchanged.list': 'Allowed to change',
  'app.tworec.unchanged.carries':
    'Already public about the earlier record: {list}. Proving this makes each of those true of this record too, because those numbers are left unticked.',
  'app.tworec.unchanged.changed': '{label} (changed)',
  'app.tworec.preview.distinct':
    'This proves: these two records differ in at least {k} of the numbers their form compares.',
  'app.tworec.preview.unchanged':
    'This proves: apart from {list}, every number in this record is the same as in the earlier one.',
  'app.tworec.preview.unchangedNone': 'This proves: every number in this record is the same as in the earlier one.',
  'app.tworec.refuse.noNumbers': 'One of these records has no sealed numbers.',
  'app.tworec.refuse.notOffered':
    'This kind of record can’t be compared this way. It works for numbers you typed in yourself, under these forms: {forms}.',
  'app.tworec.refuse.sameRecord': 'That is the same record. Pick a different one.',
  'app.tworec.refuse.otherForm': 'The two records use different forms, so their numbers can’t be compared.',
  'app.tworec.refuse.tooFew':
    'These two records differ in {n} of the compared numbers and at least {k} are needed, so this can’t be proved. Nothing was sent.',
  'app.tworec.refuse.undeclared':
    '{list} changed but isn’t ticked. Tick it, or this can’t be proved. Nothing was sent.',
  'app.tworec.refuse.saysNothing': 'With every number ticked this says nothing. Leave at least one unticked.',
  'app.tworec.err.unpaid': 'VeilCore’s fee service doesn’t pay for this proof yet, so nothing was sent.',
  'app.tworec.err.deviceOnly': 'A record kept on this device only can’t be compared this way. Nothing was sent.',
  'app.tworec.err.tooFew':
    'These two records don’t differ in enough of the compared numbers, so this can’t be proved. Nothing was sent.',
  'app.tworec.err.undeclared': 'A number that isn’t in your list changed, so this can’t be proved. Nothing was sent.',
  'app.tworec.err.otherRecords': 'That claim is about different records.',
  'app.tworec.err.otherList': 'That claim allowed different numbers to change.',
  'app.tworec.err.listSaysNothing': 'That claim allows every number to change, so it says nothing.',
  'app.tworec.err.notTwo': 'That transaction is not a single claim about two records on VeilCore’s claims contract.',
  'app.tworec.tie':
    'Both records’ codes go on Midnight, where VeilCore, and anyone with either record’s check link, can tie this proof to them. VeilCore can also tie it to the holder keys that dated them.',
  'app.tworec.made': 'What you’ve proved about two records',
  'app.tworec.line.distinct': '{a} and {b} differ in at least {k} of the numbers their form compares',
  'app.tworec.line.unchanged': '{b} has the same numbers as {a}, apart from {list}',
  'app.tworec.line.unchangedNone': '{b} has the same numbers as {a}',

  // What neither claim shows (SPEC 4.5, "Limits that shall be stated wherever claims are offered").
  'app.tworec.not.title': 'What this doesn’t show',
  'app.tworec.not.examine':
    'It is a count, not a decision. Whether two varieties or lots are distinct is for whoever examines them, such as an examining office. This doesn’t replace that examination.',
  'app.tworec.not.which': 'It doesn’t show which numbers differ, by how much, or how many.',
  'app.tworec.not.typed': 'This doesn’t show that a laboratory measured or signed the numbers.',
  'app.tworec.not.reference':
    'The holder chose the other record. For a fair comparison, someone other than the holder should say which record to compare with.',
  'app.tworec.not.oneParty':
    'The holder holds both records. This doesn’t let two people compare numbers neither will show the other.',
  'app.tworec.not.correction': 'It doesn’t show which record is the correction, or that one replaced the other.',
  'app.tworec.not.ticked': 'A number on the list may or may not have changed.',
  'app.tworec.not.onlyNumbers': 'It is about the sealed numbers only, not the records’ other details or files.',
  'app.tworec.not.sealed': 'It is about both records as they were sealed, not whether either is still current.',

  // The check page (/check-claim#p=…).
  'app.tworec.check.title': 'Check a proof about two records',
  'app.tworec.check.intro':
    'Someone sent you this link to show a fact about the numbers in two of their sealed records, without showing the numbers. This page reads the proof on Midnight and checks it.',
  'app.tworec.check.distinct':
    'These two records, as sealed, differ in at least {k} of the numbers their form compares.',
  'app.tworec.check.unchanged': 'Apart from {list}, the second record holds the same numbers as the first.',
  'app.tworec.check.unchangedNone': 'The second record holds the same numbers as the first.',
  'app.tworec.check.first': 'The first record',
  'app.tworec.check.second': 'The second record',
  'app.tworec.check.earlier': 'The earlier record (as the holder says)',
  'app.tworec.check.correction': 'The correction (as the holder says)',
};
