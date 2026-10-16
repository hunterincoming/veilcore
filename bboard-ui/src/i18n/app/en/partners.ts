// The record app in English: /partners, "Require a VeilCore record" (components/partners/
// PartnersPage.tsx). Source text; see log.ts. Code (attribute names, the HTML example, the
// command line) stays in the page itself and is the same in every language. The form field
// running on the page (partner-kit/record-check) has its own words, in English.
// SPDX-License-Identifier: Apache-2.0

export const partners = {
  'app.partners.label': 'For partners',
  'app.partners.title': 'Require a VeilCore record.',
  'app.partners.titleEm': 'Free to check. No account.',
  'app.partners.lede':
    'If your membership, library, registry or marketplace asks applicants for a VeilCore record, you can check every one in seconds, on your own form, without talking to us.',
  'app.partners.gives.title': 'What requiring a record gives you',
  'app.partners.gives.1.t': 'A fixed description',
  'app.partners.gives.1.d':
    'The record was sealed before they applied. If they show you the description later, you can tell whether it is the one they sealed.',
  'app.partners.gives.2.t': 'A date',
  'app.partners.gives.2.d':
    'Once the record is in a dated batch, anyone can look up when its fingerprint existed by. The date comes from Midnight, not from VeilCore or the applicant.',
  'app.partners.gives.3.t': 'Lab signatures, checked',
  'app.partners.gives.3.d':
    'Receipts for samples and lab reports, each signature checked, and whether VeilCore’s operator matched the lab’s name to a public listing. A receipt counts only when the registry ties it to a delivery of the record, and you see whether what arrived matches what was sent.',
  'app.partners.gives.4.t': 'The same check for everyone',
  'app.partners.gives.4.d': 'Every applicant’s link is checked the same way, by your page.',
  'app.partners.not.title': 'What it does not show',
  'app.partners.not.lede':
    'VeilCore never vouches. The check says what was checked and whose word the rest is. You decide.',
  'app.partners.not.1': 'What the material is. VeilCore never sees genetics.',
  'app.partners.not.2': 'That the description is true, only that it hasn’t changed.',
  'app.partners.not.3': 'Who holds the material, or the record, today.',
  'app.partners.not.4': 'That a lab’s work is right. A checked name means a public listing was matched, nothing more.',
  'app.partners.not.5': 'Parentage, rights, licenses or legal status.',
  'app.partners.demo.title': 'Try it',
  'app.partners.demo.lede':
    'Paste a record’s check link. It is checked in this browser, against the registry this site uses. Nothing is sent anywhere else, and nothing is kept.',
  'app.partners.demo.label': 'VeilCore record check link',
  'app.partners.demo.loading': 'Loading the field…',
  'app.partners.steps.title': 'Who does what',
  'app.partners.steps.applicant': 'The applicant',
  'app.partners.steps.applicant.1': 'Makes a record for each accession, on veilcore.org or in their own software.',
  'app.partners.steps.applicant.2': 'Opens the record, chooses “Show someone”, and presses “Copy link”.',
  'app.partners.steps.applicant.3':
    'Pastes the link into your form. If your rules ask, sends the record’s evidence bundle too.',
  'app.partners.steps.you': 'You',
  'app.partners.steps.you.1':
    'Add the field to your form (below), or paste links you receive into the field on this page.',
  'app.partners.steps.you.2':
    'Decide what you accept: the link matches; or also dated on Midnight’s main network; or also a lab receipt from a lab whose name was checked.',
  'app.partners.steps.you.3': 'Keep the check result with the application.',
  'app.partners.form.title': 'Add it to your form',
  'app.partners.form.lede':
    'One file, about 40 KB, served from your site. With “required”, the form will not submit until the link leads to a record that matches it and nothing contradicts it. If the applicant changes the link, it has to be checked again.',
  'app.partners.form.example': 'Example HTML',
  'app.partners.form.allowTest':
    'Also accept records dated on a test network. For trying it out: test dates carry no weight, so by default they are refused.',
  'app.partners.form.unreachable':
    'If VeilCore’s registry can’t be reached, let the form go with the link marked as not checked (the form also sends <name>-unchecked). Without it, a required field blocks the whole form while the registry is down.',
  'app.partners.form.csp':
    'Your Content Security Policy needs script-src for wherever you serve the file and connect-src for the registry. No style, image or frame exceptions; it works with Trusted Types. No cookies, no storage, no tracking.',
  'app.partners.form.status':
    'Not on npm yet: build it from partner-kit/record-check in the VeilCore repository and serve the file from your site.',
  'app.partners.facts.title': 'Before you rely on it',
  'app.partners.facts.cost': 'Cost',
  'app.partners.facts.cost.d': 'Checking is free, for you and for everyone else. No account, no key, no contract.',
  'app.partners.facts.support': 'Support',
  'app.partners.facts.support.d': 'Email <link></link>. There is no support agreement or response time.',
  'app.partners.facts.data': 'Data',
  'app.partners.facts.data.d':
    'A check sends the registry the record’s id and fingerprint, nothing about the applicant or your form. Like any website, the registry gets the visitor’s network address with each request, for rate limits. What VeilCore keeps is on the <link>privacy page</link>. Fuller data terms are a draft being reviewed; until they are published, the privacy page is what applies.',
  'app.partners.facts.down': 'If the registry is down',
  'app.partners.facts.down.d':
    'Nothing can be checked. By default a required field then blocks the form until the registry answers again. With when-unreachable="allow" the form goes through with the link marked as not checked, and you check it later on this page.',
  'app.partners.facts.gone': 'If VeilCore stops',
  'app.partners.facts.gone.d':
    'The field and the check pages on veilcore.org stop working. Records can still be checked from their evidence bundles, which check offline against an open format. Ask for evidence bundles if your program must not depend on VeilCore.',
  'app.partners.facts.npm': 'Not on npm yet',
  'app.partners.facts.npm.d': 'Build the kit from the VeilCore repository and serve the field’s file from your site.',
  'app.partners.policy.title': 'Sample policy wording',
  'app.partners.policy.note': 'Sample text, not legal advice. Adapt it to your own rules.',
  'app.partners.policy.1':
    'Applicants must provide a VeilCore record check link for each accession they deposit. The record must exist, and the link must match it. [Program] checks each link when the application is received and keeps the result with the application.',
  'app.partners.policy.2':
    'A VeilCore record is the applicant’s statement about their material, fingerprinted and dated. Accepting a record does not mean [Program] or VeilCore confirms what the material is, who holds it, or any right in it.',
  'app.partners.dev.title': 'For developers',
  'app.partners.dev.1': 'One call',
  'app.partners.dev.1.d':
    'checkRecord(link) in Node or a browser returns plain JSON: recordExists, fingerprintMatches, dated (network, batch, transaction, block time, checkedOnChain), keyBound, labReceipts with each name check, and whatThisDoesNotShow.',
  'app.partners.dev.2': 'On Midnight',
  'app.partners.dev.2.d':
    'In Node, with @veilcore/contracts installed, the date stamp is looked up on chain: VeilCore’s pinned contract, the pinned build, exactly this batch root.',
  'app.partners.dev.3': 'Command line',
  'app.partners.dev.3.d':
    'partner-kit check <link> prints the same answer. Exit 0: the record exists, the link matches and nothing contradicts it. Exit 1: something does not hold, including a date on a test network (unless --allow-test-network) or an inclusion proof that does not check out. Exit 2: nothing could be checked.',
  'app.partners.dev.4': 'Without VeilCore',
  'app.partners.dev.4.d':
    'A record’s evidence bundle checks offline, and the format is open. If VeilCore is gone, records whose evidence bundles you hold still check.',
  'app.partners.dev.guide': 'Read the full guide',
  'app.partners.dev.kit': 'The kit’s source',
};
