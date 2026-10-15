// English: the source text. Every other language translates this file key by key; a
// key a translation leaves out shows in English.
// SPDX-License-Identifier: Apache-2.0

export const en = {
  // Header and footer
  'nav.newCultivar': 'New record',
  'nav.licenses': 'Agreements',
  'nav.language': 'Language',
  'footer.about':
    "An open record format for plant and animal genetics. Recomputing a record's fingerprint needs only SHA-256 and the open specification; checking its date also needs a look-up on a Midnight explorer. Looking a record up by its identifier on this site uses our server.",
  'footer.documents': 'Documents',
  'footer.spec': 'Specification',
  'footer.evidence': 'Records in evidence',
  'footer.integrate': 'Integration guide',
  'footer.source': 'Source',
  'footer.allImplementations': 'All three implementations',
  'footer.referenceImplementation': 'Reference implementation',
  'footer.rustImplementation': 'Rust implementation',
  'footer.thisSite': 'This site',
  'footer.whatThisIs': 'What this is',
  'footer.yourRecords': 'Your records',
  'footer.agreements': 'Agreements',
  'footer.privacy': 'Demo privacy',
  'draft.banner':
    'Draft translation, not yet checked by a fluent speaker. The English page is the authoritative version.',
  'draft.showEnglish': 'Show English',

  // Public pages (home and founders), laid out from Mako's 25 September templates.
  //
  // Network wording. These describe a test network. A mainnet build (`--mode mainnet`)
  // replaces them, and every other test-network sentence on the public pages, with the
  // strings in en-mainnet.ts; nothing here is edited by hand on mainnet day. The page
  // description in index.html is set by the build mode too (vite.config.ts).
  'm.hero.status':
    "Launching on Midnight's main network. Today records are dated on a Midnight test network, which isn't evidence of anything yet.",
  'm.claims.status':
    "A second Midnight contract, tested end to end on Midnight's preprod test network on 4 October 2026 with made-up marker data. It isn't in this web demo or on the main network yet.",
  'm.faq.3a':
    "It's built to be evidence, and our note for lawyers says what it proves and what it doesn't. Today records are dated on a Midnight test network, and a test-network date carries no evidentiary weight. The main network launch is close.",
  'm.stat2.b': 'Test network',
  'm.stat2.s': "Both contracts tested end to end on Midnight's preprod test network. Not on the main network yet.",
  'm.foot.about':
    'An open record format for plant and animal genetics. Designed to anchor on Midnight; testing on a Midnight test network.',
  'm.for.2p':
    "Breeders want to use their markers to show a variety is distinct, and treat those markers as trade secrets. A VeilCore claim proves one fact about them without showing the rest. No examining office or certifier accepts it yet; we've written to some to ask what they would need.",
  // End of the network wording.

  'm.nav.about': 'About',
  'm.nav.team': 'Team',
  'm.nav.updates': 'Updates',
  'm.nav.spec': 'Spec',
  'm.nav.demo': 'Try the demo',
  'm.nav.menu': 'Menu',

  'm.hero.label': 'Proof of what you hold',
  // Round 3 (CTO decision, 14 Oct): not "Prove you had it first." A record shows you had
  // the record by a date, not that you had the plant first. Not "without showing anyone
  // what it is" either: the plant name is on every record's public check page. What stays
  // hidden is the genetics.
  'm.hero.title1': 'Date your record.',
  'm.hero.title2': 'Keep your genetics.',
  'm.hero.lede':
    "For breeders, seed companies and labs working with plant and animal genetics. Genetic data never leaves your computer. Only a fingerprint goes on Midnight, which dates it. The plant name and breeder you type are kept on VeilCore's server, and anyone with a record's link sees its name. A lab report reaches our server only when a lab sends it back to you, locked so only you can open it. Free to check. No sign-up, no wallet.",
  'm.hero.how': 'How it works',
  'm.hero.cultivar': 'Cultivar',
  'm.hero.bredBy': 'Bred by',
  'm.hero.bredByDefault': 'Your name here',
  'm.hero.demoLabel': 'Live fingerprint demo',
  'm.hero.fpUpdated': 'Fingerprint updated',
  // The two halves of the fingerprint box.
  'm.hero.typed': 'What you type',
  'm.hero.goes': 'What goes on Midnight',
  'm.hero.note':
    'Type in either box; nothing is sent. The green line is the fingerprint, the part that goes on Midnight. Nobody can work back from it to what you typed.',

  // Phones only: the note in one line.
  'm.hero.noteShort': 'Only the green line goes on Midnight.',

  'm.for.label': "What it's for",
  'm.for.title1': 'Many genetics disputes come down to one question:',
  'm.for.title2': 'what did you have, and when?',
  'm.for.lede':
    "Notebooks and files are dated by whoever keeps them, so they're easy to doubt. Registering the material itself means handing over what you're protecting. VeilCore gives your record a date nobody can backdate, and the genetics stay with you.",
  'm.for.1t': 'A cutting walks out the door.',
  'm.for.1p':
    "Seal a record and pair its DNA report. If the plant turns up under another name, a lab can compare a new test with your report. When you pair through VeilCore's contract on Midnight, the pairing is dated too: it shows that whoever controlled your record at that date had that report, or its SHA-256, by then. What goes on chain is tied to your record and hides the report, so nobody can copy your pairing to their own record. In this web demo the pairing is saved with your record but not yet dated. VeilCore doesn't test DNA.",
  'm.for.2t': 'Variety protection and certification.',
  'm.for.2link': 'How a claim works →',
  'm.for.3t': "Material in a lab's hands.",
  'm.for.3p':
    "Send material with a lab code. When the lab enters it, the lab signs a receipt with its own key, so the record shows a second party, which protects the lab as much as the client. The receipt is a real signature, kept by VeilCore's registry, not on the chain. Terms such as what it's for, no propagation, and return or destroy it after are practice only in the web demo.",
  'm.for.4t': 'Lab results, back to you.',
  'm.for.4p':
    "The lab signs your results and locks them so only you can open them. No PDF sits in anyone's inbox: VeilCore only holds the locked file. The signature covers that exact file and the record it's about. VeilCore records who signed; it doesn't vouch for the result. New, and still being tested.",
  'm.for.6t': 'Someone asks for proof.',
  'm.for.6p':
    "They send you a link. You tap once, and their page checks on the network that you control your plant's own key. Your record named that key when it was sealed, so it can't be swapped. It says nothing about who you are or who bred the plant. This works on a Midnight test network for now.",
  'm.for.5t': 'Animal lines.',
  'm.for.5p':
    "Herd books keep the pedigree. A record can give each entry a date nobody can backdate, without publishing the genotype. The format covers animals; this demo is set up for plants, and the animal record fields aren't published yet.",
  'm.for.5ask': 'If you breed animals, tell us what your records need.',

  'm.how.label': 'How it works',
  'm.how.title1': 'Four steps.',
  'm.how.title2': 'The genetics stay with you.',
  'm.step1.n': '01 · Record',
  'm.step1.title': 'Write it down',
  'm.step1.text': 'What it is and where it came from. Add lab reports as files.',
  'm.step2.n': '02 · Fingerprint',
  'm.step2.title': 'Fingerprint it',
  'm.step2.text': 'Done on your computer. Genetic data never leaves it.',
  'm.step3.n': '03 · Anchor',
  'm.step3.title': 'Get a date',
  'm.step3.text':
    'Only the fingerprint goes on Midnight, in a batch with others. The date is the block the batch lands in: it shows the record existed by then.',
  'm.step4.n': '04 · Verify',
  'm.step4.title': 'Show it later',
  'm.step4.text': 'Give it to a buyer, examiner or court. They can check it, free, with no account.',

  'm.claims.label': 'Prove one fact',
  'm.claims.title1': 'Show the answer.',
  'm.claims.title2': 'Keep the data.',
  'm.claims.lede':
    'A record can seal up to sixteen values, like marker results or a germination rate. Later you prove one fact about them. Nothing else is shown.',
  'm.claims.1t': 'A value is what you say it is.',
  'm.claims.1p': 'That one value is shown. The rest stay sealed.',
  'm.claims.2t': 'A number clears a bar.',
  'm.claims.2p': 'For example, germination of at least 95%. The number itself stays hidden.',
  'm.claims.3t': 'Two varieties differ.',
  'm.claims.3p':
    "In at least a set number of marker values. Which ones differ stays private. Whether that makes a variety distinct is the examiner's call, not ours.",
  'm.claims.4t': 'A correction left the rest alone.',
  'm.claims.4p': "After you correct a record, prove the values you didn't touch are unchanged.",
  'm.claims.5t': 'A lab signed the values.',
  'm.claims.5p':
    "The claim names the key that signed the record, so it's about values that key signed, not just numbers you typed. Whether the key is a lab you trust is your call.",
  'm.claims.limitsTitle': 'Limits.',
  'm.claims.limits':
    "Sixteen values per record. Comparing two varieties needs one party who holds both sets, such as the breeder or a lab that tested both. Anyone you give a sealed value to can make claims about it too. It doesn't fit comparisons across thousands of values. Without a lab's signature, the values are only the holder's word.",
  'm.claims.statusTitle': 'Status.',
  'm.claims.link': 'How claims work, in the spec →',

  'm.get.label': 'What it does',
  'm.get.title1': 'What you get,',
  'm.get.title2': 'and where it stops.',
  'm.get.title': 'What you get',
  'm.get.1a': 'A date nobody can backdate,',
  'm.get.1b': 'for a record of what you hold, without showing your genetics.',
  'm.get.2a': 'Terms that travel.',
  'm.get.2b':
    "Licenses and lab agreements attach to the record. A licensee can prove they hold a live license without showing which one. An obligation on a parent, such as a royalty, shows on every offspring both holders confirmed; VeilCore records it and doesn't collect it. Tested on a Midnight test network; simulated in the web demo.",
  'm.get.3a': 'Lineage both sides agreed to.',
  'm.get.3b':
    "A parent link counts only when both holders confirm it. On this website, VeilCore's registry records it, not the chain.",
  'm.stops.title': 'Where it stops, and what covers the rest',
  'm.stops.1a': "It's evidence, not a title.",
  'm.stops.1b': 'It creates no new legal right. It backs up the rights and contracts you already have.',
  'm.stops.2a': 'It fixes when, not whether.',
  'm.stops.2b':
    "A record proves what was written and when. A paired lab report or a lab's signature gives the content weight.",
  'm.stops.3a': 'It works with DNA testing, not instead of it.',
  'm.stops.3b':
    'It dates a DNA report you already have, so a later test can be compared with it. A parent link means both holders agreed; DNA is what proves descent.',
  'm.stops.4a': "It can't see what nobody declares.",
  'm.stops.4b':
    "Quiet propagation isn't detected. But once you revoke a license, a buyer or lab who checks properly won't accept it as live.",

  'm.open.label': 'Open format',
  'm.open.title1': 'Built to',
  'm.open.title2': 'outlast us.',
  'm.open.1t': 'An open specification, three implementations.',
  'm.open.1p':
    'Free to implement, permanently. TypeScript, Python and Rust agree on all 100 record-format test vectors (Rust does not run the newer report-pairing one yet), and anyone can run them. We wrote all three; one written by someone else is the test we most want.',
  'm.open.1link': 'All three implementations →',
  'm.open.2t': "Checking a record doesn't need us.",
  'm.open.2p':
    "Keep two files from your plant's page: the exported record and its inclusion proof (a small file showing the record is in a dated batch). With both, anyone can check it with SHA-256, the open spec and a look-up on a Midnight explorer, even if VeilCore is gone. Your backup file holds your keys, not these. The Bitcoin date needs a third file, the batch's Bitcoin stamp file, which today is only on our server.",
  'm.open.3t': "We don't vouch for results.",
  'm.open.3p':
    "A record shows which key signed it, the name and accreditor registered with that key, and whether VeilCore's operator has matched that name to a public license or accreditation listing, and on what day. VeilCore doesn't vouch for any lab: whoever checks a record decides what a signature is worth.",
  'm.open.4t': 'Anyone can run a registry.',
  'm.open.4p':
    "The format lets a lab, certifier or rights body run its own, under its own web domain, with its own field definitions, and anchor without asking us. Our own registry code isn't published.",
  'm.open.5t': 'Checking is free, always.',
  'm.open.5p': 'No account, no payment, for anyone.',

  'm.faq.label': 'Questions',
  'm.faq.title1': 'Questions',
  'm.faq.title2': 'people ask.',
  'm.faq.1q': 'What stops someone logging my cultivar?',
  'm.faq.1a':
    "Once records are anchored, anyone can check which was anchored first. Pair your lab report, so a later test can be compared with it. When you send material out, the receiver signs a receipt with their own key. A record is evidence, not a registration: it shows you had this record by that date, not that you had the plant, and doesn't settle a dispute on its own.",
  'm.faq.2q': 'Do I need crypto or a wallet?',
  'm.faq.2a':
    'No. Making a record in the demo and checking any record need no wallet, no sign-up and nothing to buy. Your browser keeps a random key that finds your demo records on our server. The fingerprint goes on Midnight, a blockchain built for privacy. You never deal with it directly.',
  'm.faq.3q': 'Will it stand up in a dispute?',
  'm.faq.3link': 'Records in evidence →',
  'm.faq.4q': 'What do you see of my data?',
  'm.faq.4a':
    "Your genetic data: nothing. It's fingerprinted on your computer, as are the files you add, and they aren't uploaded. A lab report reaches our server only when a lab sends it back to you: it's locked so only you can open it, and deleted after 180 days. This website keeps what you type (names, dates, notes, agreement terms) and your lab files' names, so you can come back to them, and a record's public check page shows its cultivar name. Labs and developers can seal records inside their own systems, so only the fingerprint goes out.",
  'm.faq.4link1': 'What the demo keeps →',
  'm.faq.4link2': 'Integration guide →',
  'm.faq.5q': 'What if VeilCore disappears?',
  'm.faq.5a':
    "The dates stay: a batch fingerprint anchored on Midnight's main network, or stamped on Bitcoin, can't be removed by anyone, us included. To check a record without us, you need two files that only our server holds unless you save them: the record (Export record) and its inclusion proof (Download inclusion proof), both on your plant's page under Technical details. Your backup file holds your keys, not these. To check the Bitcoin date without us you also need the batch's Bitcoin stamp file, which today is only on our server; the plant's page doesn't offer it. The spec is open and the TypeScript, Python and Rust code is published. A one-click evidence bundle with all of it is coming.",
  'm.faq.6q': 'What does it cost?',
  'm.faq.6a': 'Making a record on this site costs nothing today. Checking a record is free, always.',

  'm.demo.label': 'Demo',
  'm.demo.title1': 'Pick how you',
  'm.demo.title2': 'want to see it.',
  'm.demo.lede':
    "No sign-up, no wallet. It's a test version, so use made-up details. Records are anchored in batches, by hand for now; licenses and lab agreements are simulated, and DNA report pairings aren't dated yet.",
  'm.demo.privacy': 'What the demo keeps →',
  'm.demo.create.title': 'Log a plant',
  'm.demo.create.text': "Log a made-up plant, save your backup, then see your plant's page.",
  'm.demo.verify.title': 'Verify a record',
  'm.demo.verify.text': "Enter a record's identifier and see what its holder disclosed and whether it is anchored.",
  'm.demo.video.title': 'Watch how it works',
  'm.demo.video.text':
    'A 60-second animation of the idea: what stays with you, what goes on Midnight, and how someone checks it.',
  'm.chip.video': 'Video',
  'm.chip.60s': '60 s',
  // No longer shown (the video is 60 seconds now); kept so older translations still type-check.
  'm.chip.75s': '75 s',
  'm.chip.interactive': 'Interactive',
  'm.chip.3min': '~3 min',
  'm.chip.1min': '~1 min',

  'm.team.label': 'Team',
  'm.team.title1': 'Two founders.',
  'm.team.title2': 'Tokyo and New Jersey.',
  'm.team.more': 'Full profiles →',
  'm.mako.role': 'Co-Founder & CEO · Tokyo',
  'm.mako.short': 'Commercial lead: standards and plant-rights bodies in Japan and the EU.',
  'm.hunter.role': 'Co-Founder & COO · New Jersey',
  'm.hunter.short': 'Builds the contract, the site and the API. Leads US outreach.',

  'm.updates.label': 'Updates',
  'm.updates.title1': 'Latest from',
  'm.updates.title2': 'the build.',
  'm.updates.read': 'Read →',
  // Phones only: the toggle that opens the older updates.
  'm.updates.more': 'All updates',
  'm.updates.all': 'Record-format changes on GitHub →',
  'm.updates.follow': 'Follow',
  // Dated posts. Facts from docs/mainnet-completeness.md (R4, M2) and
  // docs/deployment-record-revision-4.md ("Mainnet deployment").
  'm.postB.date': '11 Oct 2026',
  'm.postB.tag': 'Registry',
  'm.postB.title': 'First batch dated on Bitcoin too',
  'm.postB.text':
    "The registry's first batches were anchored on Midnight's main network, by hand. One of them, five of our own test records, also has its root stamped on Bitcoin, in block 971004. A check with the official OpenTimestamps tool is still to do.",
  'm.postA.date': '8 Oct 2026',
  'm.postA.tag': 'Launch',
  'm.postA.title': "Live on Midnight's main network",
  'm.postA.text':
    "Both contracts are deployed on Midnight's main network. The claims contract has no maintenance key: nobody, including us, can change it.",
  'm.post0.date': '4 Oct 2026',
  'm.post0.tag': 'Contract',
  'm.post0.title': 'Proving one fact, keeping the rest',
  'm.post0.text':
    "Both contracts passed all 37 end-to-end checks on Midnight's preprod test network, including the new claims: a value, a range, a difference, an unchanged correction and a signature from a test lab key. Made-up marker data.",
  'm.post1.date': '3 Oct 2026',
  'm.post1.tag': 'Format',
  'm.post1.title': 'Three implementations, one answer',
  'm.post1.text':
    'A differential test found our TypeScript, Python and Rust implementations disagreeing on some numbers. Fixed: they now agree on every one of 81,000 inputs, and the shared test vectors check for it.',
  'm.post2.date': '2 Oct 2026',
  'm.post2.tag': 'Contract',
  'm.post2.title': "A full run on Midnight's test network",
  'm.post2.text':
    "The contract deployed to Midnight's test network and passed all 26 end-to-end checks, using 16 of its 24 operations with real proofs.",

  'm.status.label': 'Where this is',
  'm.status.title1': 'Straight about',
  'm.status.title2': 'where we are.',
  'm.status.lede': "What is done, and what isn't yet.",
  'm.stat1.b': '100 / 100',
  'm.stat1.s':
    'record-format test vectors passed in TypeScript, Python and Rust on GitHub (one author wrote all three; TypeScript is on npm as 0.15.0). A 101st, for report pairing, is not in Rust yet',
  'm.stat3.b': 'No audit',
  'm.stat3.s': 'No independent security audit yet. Our own reviews are public.',
  'm.stat4.b': 'First users wanted',
  'm.stat4.s': "Nobody uses it for real records yet. We're looking for the first breeders and labs.",
  // Mainnet builds only: the contract addresses under the status tiles.
  'm.addr.title': 'The contracts, for anyone who wants to check them.',
  'm.addr.main': 'Main contract',
  'm.addr.claims': 'Claims contract',
  'm.addr.claimsPending': 'Not on the main network yet.',
  'm.addr.explorer': 'Look them up on midnightexplorer.com (run by TexLabs) →',
  'm.status.keyTitle': 'Who can change the contract.',
  'm.status.keyText':
    "One maintenance key can change how VeilCore's contract on Midnight works. Whoever holds it can add or replace the contract's operations, which could take over any record's identity, add licenses for any issuer, add or remove obligations and parent links, or switch operations off. It cannot backdate the network's block times, and every change shows on chain. Today the key is on paper, one copy with each founder, and either copy alone can use it. Moving it to a group of keys that must agree is planned, not done. Every use is announced publicly, under a written maintenance policy.",
  'm.status.keyLink': 'Read the maintenance policy →',

  // What's live where (home page, after the status). The same on every build: it names
  // both sites. Only what the code and docs support; a feature missing from a column is
  // not there. No "test network" wording: the mainnet site shows this table too.
  'm.live.label': "What's live where",
  'm.live.title1': 'What works,',
  'm.live.title2': 'and where.',
  'm.live.lede':
    "veilcore.org runs on Midnight's main network, and records made there are real. The test site is for practice: more of it works there, and its records carry no weight.",
  'm.live.colMain': 'veilcore.org (main network)',
  'm.live.colTest': 'Test site',
  'm.live.colNot': 'Not yet',
  'm.live.stamp.t': 'A date stamp for your record',
  'm.live.stamp.main':
    'Yes. VeilCore dates records in batches, by hand for now. Your browser sends nothing to the chain.',
  'm.live.stamp.test':
    "Yes. Batches are dated automatically, and that dates your record. Your browser also date stamps your plant's own key, which dates only the key.",
  'm.live.btc.t': 'A Bitcoin date stamp too',
  'm.live.btc.main':
    "Yes. Our registry stamps each sealed batch's fingerprint on Bitcoin with OpenTimestamps. The first reached Bitcoin block 971004 on 11 October; a check with the official OpenTimestamps tool is still to do.",
  'm.live.btc.not': "Getting the stamp file from the website. Today it's only on our server.",
  'm.live.share.t': 'Choosing what others see',
  'm.live.share.main': 'Yes. The plant name always shows.',
  'm.live.share.test': 'Yes. The plant name always shows.',
  'm.live.lab.t': 'Lab code and signed receipt',
  'm.live.lab.main': "Yes. The lab signs with its own key. VeilCore's registry keeps the receipt, not the chain.",
  'm.live.lab.test': 'Yes, the same way.',
  'm.live.results.t': 'Lab reports locked to you',
  'm.live.results.test': 'Yes. New, and still being tested.',
  'm.live.results.not': 'On veilcore.org: turned off for now, on the test site first.',
  'm.live.dna.t': 'A date for your DNA report pairing',
  'm.live.dna.main': 'Saved with your record, not dated.',
  'm.live.dna.test': 'Yes, sent from your browser.',
  'm.live.prove.t': 'Prove it by link',
  'm.live.prove.test':
    "Yes. Their page checks on the network that you control the record's own key. The record named that key when it was sealed, so it can't be swapped.",
  'm.live.prove.not': 'On veilcore.org: it needs your browser to send a transaction.',
  'm.live.claims.t': 'Proving one fact (claims)',
  'm.live.claims.main': 'The contract is on the main network, with no maintenance key. The website can’t use it yet.',
  'm.live.claims.not': 'Using it from the website.',
  'm.live.lic.t': 'Licenses and royalties',
  'm.live.lic.main': 'Practice only.',
  'm.live.lic.test': 'Practice only.',
  'm.live.lic.not': 'Real licenses from the website. They are built into the contract.',

  'm.contact.label': 'Get in touch',
  'm.contact.title1': 'Tell us',
  'm.contact.title2': 'where it fails.',
  'm.contact.1t': 'Breeders and labs',
  'm.contact.1p': 'Try it on made-up records, then tell us what it would need for your real ones.',
  'm.contact.2t': 'Seed certifiers, examiners and rights bodies',
  'm.contact.2p': 'Tell us what evidence you would need to see, and in what form.',
  'm.contact.3t': 'Developers',
  'm.contact.3p': 'Add it to software you already run. No account or API key with us.',
  'm.contact.4t': 'Investors',
  'm.contact.4p': 'Write to Mako, our CEO.',
  'm.contact.email': 'Email the founders',
  'm.contact.integrate': 'Integration guide',
  'm.contact.spec': 'Read the spec',

  'm.foot.explore': 'Explore',
  'm.foot.demo': 'Demo',
  'm.foot.build': 'Build',
  'm.foot.contact': 'Contact',
  'm.foot.verify': 'Verify a record',
  'm.foot.fine': 'Evidence you held a record by a date. Not a title to the plant.',
  'm.foot.privacy': 'Demo privacy',

  'm.verify.label': 'Verify',
  'm.verify.title': 'Check a record',
  'm.verify.lede':
    'Enter the record identifier printed on a certificate or shared with you. You will see what its holder chose to share, and what this page could check itself: whether the record is in a sealed batch, and whether any lab signatures verify.',
  'm.verify.what':
    "A VeilCore record describes genetic material without including the genetics. Only its fingerprint is published, and it gets a date once it's anchored on Midnight. Checking one is free and needs no account.",
  'm.verify.home': 'What is VeilCore? →',
  'm.verify.field': 'Record identifier',
  'm.verify.go': 'Check it',
  'm.verify.example': 'Not sure what you will see? Look at an example first →',

  'm.founders.label': 'Founders',
  'm.founders.lede':
    'VeilCore is an evidentiary record format for plant and animal genetics. It gives evidence that you held a record of your material by a given date, without handing over your genetic data.',
  'm.founders.leads': 'Leads',
  'm.founders.also': 'Also',
  'm.founders.languages': 'Languages',
  'm.mako.bio1':
    "Makoto (Mako) Steiner is VeilCore's co-founder and CEO, leading commercial strategy, fundraising, and outreach to institutions and investors worldwide.",
  'm.mako.bio2': 'He studied Environmental Studies at Denison University and is based in Tokyo.',
  'm.mako.leads': 'Japan|EU|Standards bodies|Business development',
  'm.mako.also': 'Midnight Nightforce Leader (Japan) · Midnight Build Club, Cohort 1',
  'm.mako.languages': 'English · Japanese',
  'm.hunter.bio1':
    "Hunter Roberts is VeilCore's co-founder and COO, leading product and the VeilCore protocol, from the record format to the contract on Midnight. He leads VeilCore's outreach to US institutions, including seed certification, standards and plant-variety bodies.",
  'm.hunter.bio2':
    "He comes from hands-on plant work, including breeding and tissue culture, and is building Chunk's Trees, a cultivation facility in New Jersey.",
  'm.hunter.leads': 'United States|Protocol & spec|Engineering',
  'm.hunter.also': 'Midnight Nightforce Leader (US) · Midnight Build Club, Cohort 1',
  'm.founders.band1': "Talk to us. We'd",
  'm.founders.band2': 'rather hear where it fails',
  'm.founders.band3': 'than be told it works.',
  'm.founders.bandText':
    "If you run a breeding program, a lab, a seed certification agency or a plant-rights body, we'd like to talk. The format is free to implement and free to verify.",
  'm.founders.emailBoth': 'Email both founders',
  'm.portraitOf': 'Portrait of {name}',

  // Demo privacy note (/privacy). Only facts that are true of the demo today.
  'm.privacy.label': 'Demo privacy',
  'm.privacy.title': 'What the demo keeps.',
  'm.privacy.lede':
    "This note covers the demo on this site. It is a test, on Midnight's test network. Please use made-up data.",
  'm.privacy.stored.title': 'Stored on our test server',
  'm.privacy.stored.text':
    "What you type and what your browser computes from it: cultivar and breeder names, species if you enter one, dates, notes, reference numbers, parents, fingerprints of records, fingerprints of the photos and lab reports you add (only the fingerprints, never the files), lab report file names, agreement terms and counterparties, material you send to a lab (who it is addressed to, and the quantity), and, for labs, the public signing key and the attestations they publish. Also your holder key, which your browser sends with every save so the server can find your records. Locked lab reports a lab sends you: stored unreadable to us, and deleted after 180 days. The server is VeilCore's test registry, hosted on Railway.",
  'm.privacy.local.title': 'Never leaves your browser',
  'm.privacy.local.text':
    'Genetic data, and the lab reports, DNA reports and photos you add. Your browser reads them to compute their fingerprints; the files themselves are never uploaded. A lab report reaches our server only when a lab sends it back to you, locked so only you can open it.',
  'm.privacy.test.title': 'A test network',
  'm.privacy.test.text':
    "The demo uses Midnight's test network, not the live one. Demo data may be deleted when the test network is reset.",
  'm.privacy.madeup.title': 'Use made-up data',
  'm.privacy.madeup.text':
    "Please don't enter real names, real varieties or anything confidential. The demo is for trying the format.",
  'm.privacy.export.title': 'Export',
  'm.privacy.export.text':
    'Your records page has an Export button that downloads the records this browser holds. A single download of everything our server holds for you is coming; it is not available yet.',
  'm.privacy.delete.title': 'Deletion',
  'm.privacy.delete.text':
    'To have your demo data deleted from our server, email hunter@veilcore.org with the identifiers of your records.',
  'm.privacy.browser.title': 'Kept in your browser',
  'm.privacy.browser.text':
    "Your browser keeps, on this device: your holder key (a copy also goes to our server, as above), a lab's signing key if you set one up (its private half never leaves this device), the role you picked, and your language. To remove them, clear this site's data in your browser settings. Save your holder key first: without it, this browser can't find your records again.",
  'm.privacy.hosts.title': 'Hosting',
  'm.privacy.hosts.text':
    'This website is hosted on Vercel, which logs IP addresses and requests. Our registry server runs on Railway, which logs requests.',
  'm.privacy.who.title': 'Who keeps it, and for how long',
  'm.privacy.who.text':
    "VeilCore isn't incorporated yet, so VeilCore's founders run this site and the registry. Locked lab reports are deleted 180 days after they arrive. Nothing else has a set retention period: it stays until you ask us to delete it. Contact: hunter@veilcore.org.",
  'm.notfound.title': 'Page not found.',
  'm.notfound.text':
    'There is no page at this address. If someone gave you a link to a record, check that it is complete.',
  'm.notfound.home': 'VeilCore home →',
  'm.privacy.contact': 'Questions: hunter@veilcore.org',
} as const;

export type StringKey = keyof typeof en;
export type Strings = Partial<Record<StringKey, string>>;
