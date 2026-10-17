// English: the source text. Every other language translates this file key by key; a
// key a translation leaves out shows in English.
// SPDX-License-Identifier: Apache-2.0

export const en = {
  // Header and footer
  'nav.newCultivar': 'New record',
  'nav.licenses': 'Agreements',
  'nav.language': 'Language',
  'nav.main': 'Main',
  'footer.about':
    "An open record format for plant and animal genetics. Recomputing a record's fingerprint needs only SHA-256 and the open specification. Its date comes from one transaction on Midnight: the check page looks it up itself when it can reach Midnight, and otherwise says the date is our registry's report. Looking a record up by its identifier on this site uses our server.",
  'footer.documents': 'Documents',
  'footer.spec': 'Specification',
  'footer.partners': 'Require a record',
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
  'draft.banner': 'Machine-drafted translation, under review. The English page is the authoritative version.',
  'draft.showEnglish': 'Show English',
  // The record app's frame (components/flow/FlowFrame.tsx) and the browser tab's title for
  // each page (App.tsx). Here, with the public pages' text, because they load with the first
  // file; the rest of the app's text is in app/.
  'app.frame.section.log': 'Log',
  'app.frame.section.send': 'Send & receive',
  'app.frame.section.license': 'License & royalties',
  'app.frame.section.prove': 'Prove & check',
  'app.frame.home': 'Home. Your progress is saved.',
  'title.founders': 'Founders',
  'title.privacy': 'Demo privacy',
  'title.privacyMainnet': 'Site privacy',
  'title.example': 'Example record',
  'title.verify': 'Check a record',
  'title.import': 'Date your collection',
  'title.records': 'Your plants',
  'title.restore': 'Get your plants back',
  'title.backup': 'Save your backup',
  'title.spec': 'The record format',
  'title.evidence': 'Records in evidence',
  'title.integrate': 'Integrating VeilCore',
  'title.implementations': 'Implementations',
  'title.new': 'Log a plant',
  'title.record': 'Record',
  'title.agreements': 'Agreements',
  // PageErrorBoundary.tsx: a page that failed to draw (round 3)
  'error.page.title': 'This page couldn’t be shown',
  'error.page.text':
    'Something went wrong while showing it. Nothing was changed. Reload the page, or go to your records.',
  'error.page.reload': 'Reload',
  'error.page.home': 'Your records',

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
  'm.stat2.s': 'Both contracts tested end to end on a Midnight test network. Not on the main network yet.',
  'm.foot.about':
    'An open record format for plant and animal genetics. Designed to anchor on Midnight; testing on a Midnight test network.',
  'm.for.2p':
    'Breeders want to use their markers to show a variety is distinct, and keep those markers as trade secrets. A VeilCore claim proves one fact about them without showing the rest. No examining office or certifier accepts it yet.',
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
  // Round 5 (15 Oct): the hero lede is three short sentences: who it's for, what it does,
  // and the one privacy line. What the server keeps (locked, apart from the public name) is in
  // step 1 of "How it works"; lab reports reaching the server are in the FAQ and the privacy note.
  'm.hero.title1': 'Date your record.',
  'm.hero.title2': 'Keep your genetics.',
  'm.hero.lede':
    'For breeders, seed companies and labs working with plant and animal genetics: give your records a date nobody can backdate. Your genetic data stays on your computer. Only a fingerprint goes on Midnight, which dates it.',
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
    'Type in either box; nothing is sent. The red line at the bottom is the fingerprint, the part that goes on Midnight. Nobody can work back from it to what you typed.',

  // Phones only: the note in one line.
  'm.hero.noteShort': 'Only the red line goes on Midnight.',

  'm.for.label': "What it's for",
  'm.for.title1': 'Many genetics disputes come down to one question:',
  'm.for.title2': 'what did you have, and when?',
  'm.for.lede':
    "Notebooks and files are dated by whoever keeps them, so they're easy to doubt. Registering the material itself means handing over what you're protecting.",
  'm.for.1t': 'A cutting walks out the door.',
  'm.for.1p':
    "Seal a record and pair its DNA report. If the plant turns up under another name, a lab can compare a new test with your report. In this web demo the pairing is saved with your record but not yet dated. VeilCore doesn't test DNA.",
  'm.for.2t': 'Variety protection and certification.',
  'm.for.2link': 'How a claim works →',
  'm.for.3t': "Material in a lab's hands.",
  'm.for.3p':
    "Send material with a lab code. The lab signs a receipt with its own key, so the record shows a second party. The receipt is a real signature, kept by VeilCore's registry, not on the chain. Terms such as no propagation are practice only in the web demo.",
  'm.for.4t': 'Lab results, back to you.',
  'm.for.4p':
    "The lab signs your report and locks it so only you can open it. No PDF sits in anyone's inbox. The locked file waits on VeilCore's server for you to open, and we don't have its key. VeilCore records who signed; it doesn't vouch for the result. New, and still being tested.",
  'm.for.6t': 'Someone asks for proof.',
  'm.for.6p':
    "They send you a link. You tap once, and their page checks on the network that you control your plant's own key. Your record named that key when it was sealed, so it can't be swapped. It says nothing about who you are or who bred the plant. This works on a Midnight test network for now.",
  'm.for.5t': 'Animal lines.',
  'm.for.5p':
    'Herd books keep the pedigree. A record can give each entry a date nobody can backdate, without publishing the genotype. You can log an animal on this site: its individual ID, sire and dam, and a DNA report.',
  'm.for.5ask': 'If you breed animals, tell us what your records need.',

  'm.how.label': 'How it works',
  'm.how.title1': 'Four steps.',
  'm.how.title2': 'The genetics stay with you.',
  'm.step1.n': '01 · Record',
  'm.step1.title': 'Write it down',
  'm.step1.text':
    "What it is and where it came from. VeilCore's server stores the details locked, and we don't have the key. The name you give it isn't locked: anyone with the record's link sees it.",
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
  'm.claims.title1': 'Share proof,',
  'm.claims.title2': 'not data.',
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
  'm.claims.statusTitle': 'The claims contract',
  'm.claims.link': 'How claims work, in the spec →',

  'm.get.label': 'What it does',
  'm.get.title1': 'What you get,',
  'm.get.title2': 'and where it stops.',
  'm.get.title': 'What you get',
  'm.get.1a': 'A date nobody can backdate,',
  'm.get.1b': 'for a record of what you hold, without showing your genetics.',
  'm.get.2a': 'Licenses and lab agreements.',
  'm.get.2b':
    "They attach to the record. A licensee can prove they hold a live license without showing which one. A royalty or other obligation on a parent shows on every offspring both holders confirmed; VeilCore records it and doesn't collect it. Tested on a Midnight test network; simulated in the web demo.",
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
  'm.open.title1': 'If VeilCore',
  'm.open.title2': 'disappears.',
  'm.open.1t': 'The dates stay.',
  'm.open.1p':
    "A batch fingerprint anchored on Midnight's main network, or stamped on Bitcoin, can't be removed by anyone, us included.",
  'm.open.1link': 'All three implementations →',
  'm.open.2t': 'Keep one file.',
  'm.open.2p':
    "From your plant's page: Download evidence bundle. One .zip with the record as sealed, its inclusion proof, the batch root, where the batch was recorded, the Bitcoin stamp file when there is one, and a page that checks it offline. Your backup file holds your keys, not these. The single files are still under Technical details: Export record, Download inclusion proof, Download Bitcoin stamp file.",
  'm.open.3t': "We don't vouch for results.",
  'm.open.3p':
    "A record shows which key signed it, the name it was registered under, any accreditation its holder declared (we don't check that), and whether VeilCore's operator has matched that name to a public license or accreditation listing, and on what day. VeilCore doesn't vouch for any lab: whoever checks a record decides what a signature is worth.",
  'm.open.4t': 'Anyone can run a registry.',
  'm.open.4p':
    "The format lets a lab, certifier or rights body run its own, under its own web domain, and anchor without asking us. Our own registry code isn't published.",
  'm.open.6t': 'Checking without us.',
  'm.open.6p':
    'With that bundle, anyone can check a record offline: open its verify.html, then look up the one transaction it names on a Midnight explorer. Records sealed since 14 October also need spec section 3.6.1, published in the spec on this site; the SDK and its three implementations get it in their next release.',
  'm.open.6link': 'Read the spec →',

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
    "Your genetic data: nothing. It's fingerprinted on your computer, as are the files you add, and they aren't uploaded. A lab report reaches our server only when a lab sends it back to you: it's locked so only you can open it, and deleted after 180 days. The details you type (breeder, dates, notes, agreement terms) and your files' names are stored on our server locked, and we don't have the key. We can read each record's name, which its public check page shows, its fingerprint, and anything you choose to show. The sample details you and a lab write for a delivery are stored locked too, with a key that travels in the lab code, and we don't have it. Labs and developers can seal records inside their own systems, so only the fingerprint goes out.",
  'm.faq.4link1': 'What the demo keeps →',
  'm.faq.4link2': 'Integration guide →',
  'm.faq.6q': 'What does it cost?',
  'm.faq.6a': 'Making a record on this site costs nothing today. Checking a record is free, always.',

  'm.demo.label': 'Demo',
  'm.demo.title1': 'Try the',
  'm.demo.title2': 'demo.',
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
  'm.updates.older': 'Older updates',
  'm.updates.all': 'Record-format changes on GitHub →',
  'm.updates.follow': 'Follow',
  // Dated posts. Facts from docs/mainnet-completeness.md (R4, M2) and
  // docs/deployment-record-revision-4.md ("Mainnet deployment").
  'm.postB.date': '11 Oct 2026',
  'm.postB.tag': 'Registry',
  'm.postB.title': 'First batch dated on Bitcoin too',
  'm.postB.text':
    "The registry's first batches were anchored on Midnight's main network, by hand. One of them, five of our own test records, also has its root stamped on Bitcoin, in block 971004. Checked on 15 October against two block explorers: the stamp leads to Bitcoin blocks 971004 and 971005. A check with the official OpenTimestamps tool and a full Bitcoin node is still to do.",
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
  'm.status.title1': 'Where things',
  'm.status.title2': 'stand.',
  'm.status.lede': "What is done, and what isn't yet.",
  'm.stat3.b': 'No audit',
  'm.stat3.s': 'No independent security audit yet. Our own reviews are public.',
  'm.stat4.b': 'First users wanted',
  'm.stat4.s': "Nobody uses it for real records yet. We're looking for the first breeders and labs.",
  // Mainnet builds only: the contract addresses, in "For technical readers".
  'm.addr.title': 'The contracts, for anyone who wants to check them.',
  'm.addr.main': 'Main contract',
  'm.addr.claims': 'Claims contract',
  'm.addr.claimsPending': 'Not on the main network yet.',
  'm.addr.explorer': 'Look them up on midnightexplorer.com (run by TexLabs) →',
  'm.status.keyTitle': 'Who can change the contract.',
  'm.status.keyText':
    "One maintenance key can change how VeilCore's contract on Midnight works. Whoever holds it can add or replace the contract's operations, which could take over any record's identity, add licenses for any issuer, add or remove obligations and parent links, or switch operations off. It cannot backdate the network's block times, and every change shows on chain. Today the key is on paper, one copy with each founder, and either copy alone can use it. Moving it to a group of keys that must agree is planned, not done. Every use is announced publicly, under a written maintenance policy.",
  'm.status.keyLink': 'Read the maintenance policy →',
  // "For technical readers" (home page, near the end): collapsed until opened.
  'm.tech.title': 'For technical readers',
  'm.tech.lede': 'How checking works by hand, the code, the Bitcoin stamp, and who can change the contracts.',
  'm.tech.show': 'Show the detail',
  'm.tech.check.t': 'Checking a record by hand',
  'm.tech.check.p':
    "Recomputing a record's fingerprint needs only SHA-256 and the open spec. Its inclusion proof ties that fingerprint to a batch fingerprint anchored on Midnight, and the transaction that anchored it gives the batch's date. The evidence bundle's verify.html does the recomputing offline and names the transaction and root to look up. The check page looks that transaction up on Midnight itself when it can reach Midnight; otherwise it says the date is our registry's report, and you can look it up on a Midnight explorer. Records sealed since 14 October name their own key, so checking them also needs spec section 3.6.1, published in the spec on this site; the SDK and its three implementations get it in their next release.",
  'm.tech.impl.t': 'One spec, three implementations',
  'm.tech.impl.p':
    "Free to implement, permanently. TypeScript, Python and Rust agree on all 100 record-format test vectors on GitHub, and anyone can run them; a 101st, for report pairing, isn't in Rust yet. One author wrote all three, and the TypeScript one is on npm as 0.15.0. One written by someone else is the test we most want.",
  'm.tech.btc.t': 'The Bitcoin stamp',
  'm.tech.btc.p':
    "Our registry stamps each sealed batch's fingerprint on Bitcoin with OpenTimestamps. The first reached Bitcoin block 971004 on 11 October. Checked on 15 October against two block explorers: the stamp leads to Bitcoin blocks 971004 and 971005. A check with the official OpenTimestamps tool and a full Bitcoin node is still to do. The stamp file is the batch's .ots file: Download Bitcoin stamp file, on the plant's page. The test site's registry doesn't stamp on Bitcoin.",
  'm.tech.dna.t': 'Report pairing and lab signatures',
  'm.tech.dna.p':
    "When a DNA report pairing goes through VeilCore's contract on Midnight, it is dated: it shows that whoever controlled the record at that date had that report, or its SHA-256, by then. What goes on chain is tied to the record and hides the report, so nobody can copy the pairing to their own record. A lab's signature on a locked report covers that exact file and the record it's about.",

  // What's live where (home page, after the status). The same on every build: it names
  // both sites. Only what the code and docs support; a feature missing from a column is
  // not there. No "test network" wording: the mainnet site shows this table too.
  'm.live.label': "What's live where",
  'm.live.title1': 'What works,',
  'm.live.title2': 'and where.',
  'm.live.lede':
    "veilcore.org runs on Midnight's main network, and records made there are real. The test site is for practice: more of it works there, and its records carry no weight.",
  'm.live.colMain': 'veilcore.org (main network)',
  'm.live.colTest': 'test.veilcore.org',
  'm.live.colNot': 'Not yet',
  'm.live.colTestNote': '(going live this week)',
  // The same column's heading on the test site itself (no link to itself, no "going live").
  'm.live.colTestHere': 'This test site (test.veilcore.org)',
  'm.live.feature': 'Feature',
  'm.live.show': 'Show the list',
  'm.live.stamp.t': 'A date stamp for your record',
  'm.live.stamp.main': 'Yes, in batches, by hand for now. Your browser sends nothing to the chain.',
  'm.live.stamp.test':
    "Yes. Batches are dated automatically, and that dates your record. Your browser also date stamps your plant's own key, which dates only the key.",
  'm.live.btc.t': 'A Bitcoin date stamp too',
  'm.live.btc.main':
    'Yes, every sealed batch. The first reached block 971004 on 11 October and was checked against two block explorers on 15 October. A check with the official tool and a full node is still to do.',
  'm.live.share.t': 'Choosing what others see',
  'm.live.share.main': 'Yes. The plant name always shows.',
  'm.live.share.test': 'Yes. The plant name always shows.',
  'm.live.lab.t': 'Lab code and signed receipt',
  'm.live.lab.main': "Yes. The lab signs with its own key. VeilCore's registry keeps the receipt, not the chain.",
  'm.live.lab.test': 'Yes, the same way.',
  'm.live.results.t': 'Lab reports locked to you',
  'm.live.results.main': 'Yes. New, and still being tested.',
  'm.live.results.test': 'Yes. New, and still being tested.',
  'm.live.dna.t': 'A date for your DNA report pairing',
  'm.live.dna.main': 'Saved with your record, not dated.',
  'm.live.dna.test': 'Yes, sent from your browser.',
  'm.live.prove.t': 'Prove it by link',
  'm.live.prove.test':
    "Yes. Their page checks on the network that you control the record's own key. The record named that key when it was sealed, so it can't be swapped.",
  'm.live.prove.not': 'On veilcore.org: it needs your browser to send a transaction.',
  'm.live.claims.t': 'Proving one fact (claims)',
  'm.live.claims.main': 'On the main network, with no maintenance key. The website can’t use it yet.',
  'm.live.claims.not': 'Using it from the website.',
  'm.live.lic.t': 'Licenses and royalties',
  'm.live.lic.main': 'Practice only.',
  'm.live.lic.test': 'Practice only.',
  'm.live.lic.not': "Real licenses from the website. They're built into the contract.",
  // The check page looking a record's date up on Midnight itself (docs/check-on-chain.md).
  // On veilcore.org it needs the read-only relay; the mainnet overlay says "Yes." once a
  // build has one (CHAIN_READS).
  'm.live.chain.t': 'The check page reads Midnight itself',
  'm.live.chain.main': 'Not yet: needs our read-only relay.',
  'm.live.chain.test': 'Yes.',

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
    "A VeilCore record describes genetic material without including the genetics. Its check page shows its name and what its holder chose to share. Only its fingerprint goes on Midnight, and it gets a date once it's anchored there. Checking one is free and needs no account.",
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
    "Your records and agreements, locked by your browser before they are sent: breeder, species, dates, notes, reference numbers, parents, the fingerprints and file names of the photos and lab reports you add, agreement terms and counterparties, the quantity and note you send a lab, the sample details you and the lab write (sample ID, seal number, where and when it was taken, a witness, how it arrived), the names you give recipients, and each record's own secret keys. Our server stores them locked, and we don't have the key: it is in your browser and your backup file. The sample details' key also travels in the lab code, so the lab can open them. Our server can read: each record's ID; the name you give it, which anyone with a check link sees; its fingerprint, key binding and profile; which fields a correction changed, and when; when the server first saw it; how many times it was saved, and when it was last saved; roughly how large it is (its size bucket); what you choose to show on its check page; the parent links you register; and its batch and date stamp. If an agreement has a royalty on offspring, our server can read which record it covers and when it took effect, and anyone can ask whether that record carries one: the lineage check needs it. For a delivery: which record it came from, which holder account received it, when it was received, and a tag in place of the recipient's name. A delivery made before tags has the name as typed, until the registry's purge replaces it. For labs: the public signing key and the attestations they publish. Requests to prove a record's key, with the name the asker typed, kept for 7 days. Your holder key, which your browser sends with every save so the server can find your records; the server keeps only a one-way digest of it. Records saved before locking stay readable to us until your browser locks them. Sample details written before sealing stay readable to us until the registry removes them. Our off-site backups made before then keep a readable copy of both until we destroy the key that opens them. Locked lab reports a lab sends you: stored locked, without the key, and deleted after 180 days. The server is VeilCore's test registry, hosted on Railway.",
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
    "On your records page, under More: Export all records downloads the records this browser holds. Download your records and agreements from VeilCore downloads what our server holds for them, opened in your browser: your records, agreements, sharing choices, and each record's proof and batch. It leaves out your deliveries with their sample details, locked lab reports, royalty obligations and requests to prove a record's key. Open deliveries, their sample details and lab reports from the delivery in the app. The lineage check answers for royalty obligations, one record at a time. Prove requests are deleted after 7 days. Neither file has your keys or your records' secret keys: those are in your backup file.",
  'm.privacy.delete.title': 'Deletion',
  'm.privacy.delete.text':
    'To have your demo data deleted from our server, email hunter@veilcore.org with the identifiers of your records.',
  'm.privacy.browser.title': 'Kept in your browser',
  'm.privacy.browser.text':
    "Your browser keeps, on this device: your holder key (a copy also goes to our server, as above); the key that locks your records, which is never sent to us; your own copy of your records; each record's secret keys, which lock its lab reports (a locked copy also goes with the record to our server); the lab codes you make or use, which hold a claim code and the key to a delivery's details; a lab's signing key if you set one up (its private half is never sent to us); the role you picked; and your language. Your backup file holds a copy of each key and of the lab codes you made. To remove them, clear this site's data in your browser settings. Save your backup first: without it, you can't find or open your records again.",
  'm.privacy.hosts.title': 'Hosting',
  'm.privacy.hosts.text':
    'This website is hosted on Vercel, which logs IP addresses and requests. Our registry server runs on Railway, which logs requests.',
  'm.privacy.who.title': 'Who keeps it, and for how long',
  'm.privacy.who.text':
    "VeilCore isn't incorporated yet, so VeilCore's founders run this site and the registry. Locked lab reports are deleted 180 days after they arrive. Requests to prove a record's key are deleted after 7 days. Nothing else has a set retention period: it stays until you ask us to delete it. Contact: hunter@veilcore.org.",
  'm.notfound.title': 'Page not found.',
  'm.notfound.text':
    'There is no page at this address. If someone gave you a link to a record, check that it is complete.',
  'm.notfound.home': 'VeilCore home →',
  'm.privacy.contact': 'Questions: hunter@veilcore.org',
} as const;

export type StringKey = keyof typeof en;
export type Strings = Partial<Record<StringKey, string>>;
