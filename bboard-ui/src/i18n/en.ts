// English: the source text. Every other language translates this file key by key; a
// key a translation leaves out shows in English.
// SPDX-License-Identifier: Apache-2.0

import { policyEn } from './privacy-policy/en';

export const en = {
  // Header and footer
  'nav.newCultivar': 'New record',
  'nav.licenses': 'Agreements',
  'nav.language': 'Language',
  'nav.main': 'Main',
  'nav.home': 'VeilCore home',
  'footer.about': 'An open record format for plant, animal and microbial genetics.',
  'footer.howCheck': 'How checking works →',
  'footer.documents': 'Documents',
  'footer.spec': 'Specification',
  'footer.partners': 'Require a record',
  'footer.evidence': 'Records in evidence',
  'footer.integrate': 'Integration guide',
  'footer.source': 'Source',
  'footer.allImplementations': 'All three implementations',
  'footer.referenceImplementation': 'Reference implementation',
  'footer.rustImplementation': 'Rust implementation',
  'footer.siteCode': 'This site’s code',
  'footer.thisSite': 'This site',
  'footer.yourRecords': 'Your records',
  'footer.agreements': 'Agreements',
  'footer.privacy': 'Demo privacy',
  'title.help': 'Help',
  'title.status': 'Service status',
  'footer.help': 'Help',
  'm.help.title': 'Help',
  'm.help.lede':
    'Short answers for making, keeping, showing and checking a record. Each one says what this site does today.',
  'm.help.start.t': 'Starting',
  'm.help.start.1q': 'What is a VeilCore record?',
  'm.help.start.1a':
    "A dated description of something you hold: a plant, an animal, a strain or cell line, or a document. Your browser turns it into a short proof code, and that code is dated on Midnight in a batch with others. It shows prior possession of the record by that date. It doesn't show who has rights in anything, and it doesn't show that what the record says is true.",
  'm.help.start.2q': 'What do I need?',
  'm.help.start.2a':
    "A phone or computer with a current browser. No wallet, no sign-up and nothing to buy. Proving one number from a record needs a computer: phones haven't been tried for that.",
  'm.help.start.3q': 'What does it cost?',
  'm.help.start.3a': 'Making a record on this site and checking any record are both free.',
  'm.help.make.t': 'Making a record',
  'm.help.make.1q': 'Which kind of record do I pick?',
  'm.help.make.1a':
    'Pick what the thing is. A plant: a cultivar or a line. An animal: one animal or a line. A strain or line: microbes, fungi, cell lines, insect lines. A document: a permit, a certificate, a contract or a report, sealed as a file. A grow batch or a harvest lot: a step in a production chain, linked to the record before it.',
  'm.help.make.2q': 'What should I leave out?',
  'm.help.make.2a':
    "Other people's personal details. What you type is stored on our server encrypted, and we don't hold the key. But whoever you share a record with sees what you chose to share, and a document's check link shows everything typed into it (title, holder, issuer, reference, notes), the file's name and its SHA-256. Name files plainly, like \"Permit 2026.pdf\". Or keep a document on this device only: then nothing typed is sent at all.",
  'm.help.make.3q': 'How do I know my record is dated?',
  'm.help.make.3a':
    'The record\'s page shows "Record dated" with the date once its batch is on Midnight. Before that it says "in the next batch". The record is saved either way. Until the batch is on Midnight, its date rests on your word alone.',
  'm.help.backup.t': 'Your backup',
  'm.help.backup.1q': 'Why does the site keep asking me to save a backup?',
  'm.help.backup.1a':
    'It asks while your records have no other way back. The backup file is one way: it brings your records back on a new phone or computer, even without VeilCore. Saving them with VeilCore, with this device’s lock, is another; then the file is up to you. VeilCore can’t recover the file or make another.',
  'm.help.backup.2q': 'Where should I keep it?',
  'm.help.backup.2a':
    'On a USB stick or in a password manager, and in a second place too. Anyone with the file can open your records and act as you. Add a password when you save it: then the file alone opens nothing. If you forget the password, nobody can open the file, us included.',
  'm.help.backup.3q': 'I lost my backup. What now?',
  'm.help.backup.3a':
    "If this browser still has your records, save a new backup now. If it doesn't, nobody can open the locked copies on our server, VeilCore included. The site will offer to delete them and start a new key. Records that were already dated stay dated, but you can no longer show they are yours.",
  'm.help.backup.4q': 'How do I move to a new phone or computer?',
  'm.help.backup.4a': 'Open "Get your records back" on the new device and choose your backup file.',
  'm.help.backup.4link': 'Get your records back →',
  'm.help.backup.5q': 'My records disappeared from the browser.',
  'm.help.backup.5a':
    "Browsers can clear a site's stored data. Safari can do it after 7 days without a visit. Your backup file brings everything back.",
  'm.help.show.t': 'Showing a record to someone',
  'm.help.show.1q': 'How do I show someone my record?',
  'm.help.show.1a':
    "Open the record's certificate and copy its link to send. Whoever opens it can check the date themselves, free, with no account. The link shows the record's name only if you switch that on.",
  'm.help.show.2q': 'How do I show a document?',
  'm.help.show.2a':
    "Send the check link together with the file. The other person's browser compares the file with the sealed record, byte for byte, and shows when you had it. Their copy of the file is not uploaded.",
  'm.help.show.3q': 'Can I prove one number without showing the rest?',
  'm.help.show.3a':
    'Yes, if you sealed the record with its numbers. You can prove that one number is at most or at least a limit, or exactly a value. Use a computer.',
  'm.help.check.t': 'Checking a record someone sent you',
  'm.help.check.1q': 'Someone sent me a record. How do I check it?',
  'm.help.check.1a':
    "Open the link they sent, or enter the record's identifier on the check page. It is free and needs no account.",
  'm.help.check.1link': 'Check a record →',
  'm.help.check.2q': 'What does "dated" mean?',
  'm.help.check.2a':
    "The record's proof code is in a batch, and that batch's code is on Midnight. The date is when the batch went on Midnight. You can check this without trusting VeilCore.",
  'm.help.check.3q': "What does a record show, and what doesn't it show?",
  'm.help.check.3a':
    "It shows that someone held exactly this record by that date, and that it hasn't changed since. It doesn't show who has rights in the material, that the description is true, or that any physical thing matches it. A lab's signature on a result is a separate check.",
  'm.help.check.4q': 'Will it stand up in a dispute?',
  'm.help.check.4link': 'Records in evidence →',
  'm.help.labs.t': 'Labs and agreements',
  'm.help.labs.1q': 'What works for labs and license agreements?',
  'm.help.labs.1a':
    'The home page lists what is live on this site and what is built but not yet run here. That list is kept current with each release.',
  'm.help.labs.1link': 'What works today →',
  'm.help.wrong.t': 'When something goes wrong',
  'm.help.wrong.1q': 'My record has said "in the next batch" for a long time.',
  'm.help.wrong.1a':
    'Your record is saved and is waiting for its batch. The status page shows whether the dating service is running.',
  'm.help.wrong.1link': 'Service status →',
  'm.help.wrong.2q': "The check page says my file doesn't match.",
  'm.help.wrong.2a':
    "The file isn't byte for byte the one that was sealed. Opening a file and saving it again, exporting it, or sending it through an app that re-compresses it can change it. Ask for the original file.",
  'm.help.wrong.3q': 'What if this website is gone?',
  'm.help.wrong.3a':
    "Your records can still be checked. A free, open tool opens your backup file, checks every record's proof code, and tells you which Midnight transaction dates it, without this site.",
  'm.help.wrong.3link': 'The free tool →',
  'm.help.contact.t': 'Contact',
  'm.help.contact.p':
    "Email hunter@veilcore.org. Say what you were doing, what you saw, and the record's identifier if there is one. Never send your backup file or its password.",
  'm.status.page.title': 'Service status',
  'm.status.page.lede': 'Read live from the service that dates records on Midnight for this site.',
  'm.status.page.loading': 'Checking…',
  'm.status.page.none': 'This build has no dating service to read.',
  'm.status.page.unreachable':
    'The dating service did not answer. Records you make are saved and will be dated when it is back.',
  'm.status.page.service': 'Dating service',
  'm.status.page.running': 'Running',
  'm.status.page.behind': 'Running, catching up with Midnight',
  'm.status.page.failing': 'Running, but the last batches failed',
  'm.status.page.lastRun': 'Last run',
  'm.status.page.checked': 'Checked just now, from your browser.',
  'm.status.page.help': 'Help →',
  'footer.terms': 'Terms of use',
  'draft.banner': 'Machine-drafted translation, under review. The English page is the authoritative version.',
  'draft.showEnglish': 'Show English',
  'draft.close': 'Close this notice',
  // Shown only while a build turns it on (DATING_PAUSED, config/network.ts).
  'notice.datingPaused':
    "Dating on Midnight is paused for Midnight's network upgrade. Your records are saved and will be dated when it's back.",
  // The record app's frame (components/flow/FlowFrame.tsx) and the browser tab's title for
  // each page (App.tsx). Here, with the public pages' text, because they load with the first
  // file; the rest of the app's text is in app/.
  'app.frame.section.log': 'Log',
  'app.frame.section.send': 'Send & receive',
  'app.frame.section.license': 'License & royalties',
  'app.frame.section.prove': 'Prove & check',
  'app.frame.home': 'Your records. Your progress is saved.',
  'title.founders': 'Founders',
  // Mako's site draft of 21 November 2026 (components/site/HowItWorks.tsx, Founders.tsx and the
  // home page): the strings it needed that the site had no words for.
  'title.how': 'How it works',
  'm.foot.cta': 'Date your first record.',
  'm.status.liveNow': 'Licenses, royalty reports and lab-signed results are live on veilcore.org.',
  'm.status.whereLink': 'What works where →',
  'm.home.f3t': 'Licenses and royalties.',
  'm.home.f3p':
    "Agree a license on veilcore.org, between the two parties, with real transactions. Each royalty report gets an answer: “I paid” and “Receipt confirmed”. VeilCore records it and doesn't collect it.",
  'm.home.f4t': 'Lab-signed results.',
  'm.home.f4p':
    "A lab signs numbers and results with its own key. Only you, the lab and whoever sent the sample see them, and only you can show them. Live on veilcore.org, on Midnight's main network, since 18 November 2026.",
  'm.home.f5t': 'Free to check.',
  'm.home.f5p': 'A buyer, examiner or court checks a record free, with no account and no wallet.',
  'm.hiw.title1': 'How VeilCore',
  'm.hiw.title2': 'works.',
  'm.hiw.lede':
    'An open record format for plant, animal and microbial genetics. Your computer makes a proof code from your record, and that code is dated on Midnight. What you wrote never goes there. Later you show the record, or prove one fact about it.',
  'm.hiw.lab1': 'A second party,',
  'm.hiw.lab2': 'on the record.',
  'm.hiw.labP':
    "Labs sign receipts and reports with their own keys. VeilCore records who signed; it doesn't vouch for the result.",
  'm.hiw.split1': 'What stays with you,',
  'm.hiw.split2': 'and what goes on Midnight.',
  'm.hiw.youLbl': 'With you',
  'm.hiw.youT': 'Your genetics and your keys',
  'm.hiw.you1t': 'Your DNA files',
  'm.hiw.you1p': 'They never leave your device: your computer reads each one to make its code.',
  'm.hiw.you2t': "The record's details",
  'm.hiw.you2p':
    "Stored on VeilCore's server locked, the name included, unless you choose to show it. We don't have the key.",
  'm.hiw.you3t': 'Your backup file',
  'm.hiw.you3p': 'It holds your keys. Keep it safe.',
  'm.hiw.chainLbl': 'On Midnight',
  'm.hiw.chainT': 'Codes, never your genetics',
  'm.hiw.chain1t': 'The proof code',
  'm.hiw.chain1p': 'Nobody can work back from it to what you wrote.',
  'm.hiw.chain2t': 'A batch',
  'm.hiw.chain2p':
    'Proof codes go into batches, and each batch is anchored on Midnight. On veilcore.org, batches are also stamped on Bitcoin.',
  'm.hiw.chain3t': 'The date',
  'm.hiw.chain3p': 'The block a batch lands in shows the record existed by then.',
  'm.hiw.chainMore': 'Everything that can go on Midnight →',
  'm.hiw.more1': 'Lineage, licenses',
  'm.hiw.more2': 'and labs.',
  'm.about.grow1': 'For the people',
  'm.about.grow2': 'who grow things.',
  'm.about.growP':
    'Breeders, seed companies, tissue culture labs and herd books, and the certifiers and examiners who check their work.',
  'm.about.whereLabel': 'Where we work',
  'm.about.where': 'Tokyo|New Jersey|Japan|European Union|United States',
  'title.terms': 'Terms of use',
  'title.privacy': 'Demo privacy',
  'title.privacyMainnet': 'Privacy policy',
  'title.example': 'Example record',
  'title.verify': 'Check a record',
  'title.import': 'Date your collection',
  'title.records': 'Your records',
  'title.restore': 'Get your records back',
  'title.backup': 'Save your backup',
  'title.spec': 'The record format',
  'title.evidence': 'Records in evidence',
  'title.integrate': 'Integrating VeilCore',
  'title.implementations': 'Implementations',
  'title.partners': 'Require a record',
  'title.new': 'Make a record',
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
    'An open record format for plant, animal and microbial genetics. Designed to anchor on Midnight; testing on a Midnight test network.',
  'm.for.2p':
    'Breeders want to use their markers to show a variety is distinct, and keep those markers as trade secrets. A VeilCore claim proves one fact about them without showing the rest. No examining office or certifier accepts it yet.',
  // End of the network wording.

  'm.nav.about': 'About',
  'm.nav.team': 'Team',
  'm.nav.updates': 'Updates',
  'm.nav.spec': 'Spec',
  'm.nav.demo': 'Try the demo',
  'm.nav.yours': 'Your records',
  'm.nav.menu': 'Menu',
  'm.nav.forLabs': 'For labs',

  'm.hero.label': 'Proof of what you hold',
  // Round 3 (CTO decision, 14 Oct): not "Prove you had it first." A record shows you had
  // the record by a date, not that you had the plant first. What stays hidden is the
  // genetics. Since round 5 (17 Oct) the name is locked too: a check page shows it only when
  // the holder's link carries it (off unless the holder switches it on) or the holder
  // chooses to show it.
  // Round 5 (15 Oct): the hero lede is three short sentences: who it's for, what it does,
  // and the one privacy line. What the server keeps (locked, the name included) is in
  // step 1 of "How it works"; lab reports reaching the server are in the FAQ and the privacy note.
  'm.hero.title1': 'Date your record.',
  'm.hero.title2': 'Keep your genetics private.',
  'm.hero.lede':
    'For breeders, seed companies and labs working with plant, animal and microbial genetics: give your records a date nobody can backdate. Your genetic data stays locked: DNA files never leave your computer, and what you type reaches our server locked. Only proof codes go on Midnight, which dates them.',
  'm.hero.how': 'How it works',
  'm.hero.pasteQ': 'Got a lab code or a link from someone?',
  'm.hero.pasteGo': 'Paste it here →',
  'm.hero.restoreQ': 'Used VeilCore on another device?',
  'm.hero.restoreGo': 'Get my records back →',
  'm.hero.cultivar': 'Cultivar',
  'm.hero.bredBy': 'Bred by',
  'm.hero.bredByDefault': 'Your name here',
  'm.hero.demoLabel': 'Live proof code demo',
  'm.hero.fpUpdated': 'Proof code updated',
  // The two halves of the fingerprint box.
  'm.hero.typed': 'What you type',
  'm.hero.goes': 'What goes on Midnight',
  'm.hero.note':
    'Type in either box; nothing is sent. The gold strip at the bottom is the proof code, the part that goes on Midnight. Nobody can work back from it to what you typed.',

  // Phones only: the note in one line.
  'm.hero.noteShort': 'Only the gold strip goes on Midnight.',
  // The stamp pressed on the hero's specimen sheet: what happens to the gold strip.
  'm.hero.stampWord': 'Dated',
  'm.hero.stampLine': 'on Midnight',

  // The home page in the layout of Mako's dark design (18 November 2026). Only strings the
  // page had no words for; everything else on it reuses the keys above and below.
  // Pipe-separated lists are shown as a row of names (m.mako.leads does the same).
  'm.home.try': 'Try it. Nothing is sent.',
  'm.home.tryNote': 'The display above is drawn from this proof code. Nobody can work back from it to what you typed.',
  'm.home.audLabel': 'Who it is for',
  'm.home.audience':
    'Breeders|Seed companies|Tissue culture labs|Certifiers|Examiners|Herd books|Plant variety offices',
  'm.home.keep.t': 'Your genetics stay with you.',
  'm.home.keep.p':
    "Only proof codes go on Midnight, never what you typed or your files. A record's code is 64 characters your computer works out from it, and nobody can work back from it to the plant, the markers or the name.",
  'm.home.tlDated': 'Record dated',
  'm.home.tlAsks': 'Someone asks',
  'm.home.matters': 'Where it matters.',
  'm.home.prev': 'Previous',
  'm.home.next': 'Next',
  'm.home.custody.t': "We can't read your records: they reach us locked.",
  'm.home.custody.p1':
    'Registering the material itself means handing it over. With VeilCore, your DNA files never leave your computer.',
  'm.home.custody.p2': "The record's details reach our server locked, the name included, and we don't have the key.",
  'm.home.ex.label': 'An example record, not a real one.',
  'm.home.ex.dna': 'DNA report',
  'm.home.l2': 'Its proof code: 64 characters, worked out on your computer.',
  'm.home.l3': 'Your code joins a batch with others. The block it lands in is the date.',
  'm.home.l3b': 'One batch, many records',
  'm.home.l4v': 'The record existed by that date.',
  'm.home.l4': 'Anyone can check it, free, with no account.',
  'm.home.more': 'More than a date.',
  'm.home.f1t': 'Plants, animals and strains.',
  'm.home.f1p': 'Cultivars and lines, single animals and bloodlines, microbes, fungi and cell lines.',
  'm.home.f2t': 'Documents.',
  'm.home.f2p': 'Seal a permit, certificate, contract or lab report. The file itself stays on your device.',
  'm.home.ask.t': 'Ask, in plain words.',
  'm.home.ask.p':
    'On the record pages, Ask fills in a record, or a batch of clones or offspring, for you to check. It never signs or sends anything. You do.',
  'm.home.trustLabel': 'What it gives you',
  'm.home.trust':
    'Proof you held a record by a date|A date nobody can backdate|Free to check|An open format|No wallet, no sign-up',
  'm.home.pause': 'Pause the moving names',
  'm.home.play': 'Play the moving names',
  'm.home.fails': 'Tell us where it fails.',
  'm.home.closeLede':
    "Breeders, labs, certifiers and developers: make a record, then tell us what's missing for your work.",
  'm.home.photos': 'Photos on Unsplash:',
  'm.home.alt.jar': 'A seed sprouting over a glass jar of water, its roots in the water',
  'm.home.alt.cutting': 'A plant cutting rooting in a glass jar of water, in sunlight',
  'm.home.alt.greenhouse': 'Rows of young plants in a long greenhouse',
  'm.home.alt.lab': 'A laboratory bench with pipettes and sample tubes',
  'm.home.alt.hand': 'A hand holding a seedling above trays of young plants',
  'm.home.alt.cattle': 'Cattle eating hay together',

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
  // The lab slide's way in (lab/LabDoor.tsx), and on How it works.
  'm.for.3link': "Run a lab? Set up your lab's signing key →",
  'm.for.3t': "Material in a lab's hands.",
  'm.for.3p':
    "Send material with a lab code. The lab signs a receipt with its own key, so the record shows a second party. The receipt is a real signature, kept by VeilCore's registry, not on the chain. Terms such as no propagation are practice only in the web demo.",
  'm.for.4t': 'Lab results, back to you.',
  'm.for.4p':
    "The lab signs your report and locks it so only you can open it. No PDF sits in anyone's inbox. The locked file waits on VeilCore's server for you to open, and we don't have its key. VeilCore records who signed; it doesn't vouch for the result. New, and still being tested.",
  'm.for.6t': 'Someone asks for proof.',
  'm.for.6p':
    "They send you a link. You tap once, and their page checks on the network that you control your record's own key. Your record named that key when it was sealed, so it can't be swapped. It says nothing about who you are or who bred the plant. This works on a Midnight test network for now.",
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
    "What it is and where it came from. VeilCore's server stores the details locked, the name included, and we don't have the key. A check link carries the name only if you switch that on, for the people you send it to.",
  'm.step2.n': '02 · Proof code',
  'm.step2.title': 'Make its proof code',
  'm.step2.text': 'Done on your computer. Genetic data never leaves it unlocked.',
  'm.step3.n': '03 · Anchor',
  'm.step3.title': 'Get a date',
  'm.step3.text':
    'Only the proof code goes on Midnight, in a batch with others. The date is the block the batch lands in: it shows the record existed by then.',
  'm.step4.n': '04 · Verify',
  'm.step4.title': 'Show it later',
  'm.step4.text': 'Give it to a buyer, examiner or court. They can check it, free, with no account.',

  'm.claims.label': 'Prove one fact',
  'm.claims.1s': '1 shown · 15 sealed',
  'm.claims.2s': '1 fact · 16 sealed',
  'm.claims.3s': '≥ 6 differ',
  'm.claims.4s': '15 unchanged',
  'm.claims.5s': '1 key signed',
  'm.claims.fixed': 'fixed',
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
    "A batch's code anchored on Midnight's main network, or stamped on Bitcoin, can't be removed by anyone, us included.",
  'm.open.1link': 'All three implementations →',
  'm.open.2t': 'Keep one file.',
  'm.open.2p':
    "From your record's page: Download evidence bundle. One .zip with the record as sealed, its inclusion proof, the batch root, where the batch was recorded, the Bitcoin stamp file when there is one, and a page that checks it offline. Your backup file holds your keys, not these. The single files are still under Technical details: Export record, Download inclusion proof, Download Bitcoin stamp file.",
  'm.open.3t': "We don't vouch for results.",
  'm.open.3p':
    "A lab's signatures about a record stay private unless the record's holder shows them. Each one shown says which key signed it, the name it was registered under, any accreditation its holder declared (we don't check that), and whether VeilCore's operator has matched that name to a public license or accreditation listing, and on what day. VeilCore doesn't vouch for any lab: whoever checks a record decides what a signature is worth.",
  'm.open.4t': 'Anyone can run a registry.',
  'm.open.4p':
    "The format lets a lab, certifier or rights body run its own, under its own web domain, and anchor without asking us. Our own registry's code is public, under the Apache-2.0 license, at github.com/hunterincoming/veilcore-api.",
  'm.open.6t': 'Checking without us.',
  'm.open.6p':
    'With that bundle, anyone can check a record offline: open its verify.html, then look up the one transaction it names on a Midnight explorer. Records sealed since 14 October also need spec section 3.6.1, in the spec on this site and in SDK 0.16.0 and later.',
  'm.open.6link': 'Read the spec →',

  'm.faq.label': 'Questions',
  'm.faq.title1': 'Questions',
  'm.faq.title2': 'people ask.',
  'm.faq.1q': 'What stops someone logging my material?',
  'm.faq.1a':
    "Once records are anchored, anyone can check which was anchored first. Pair your lab report, so a later test can be compared with it. When you send material out, the receiver signs a receipt with their own key. A record is evidence, not a registration: it shows you had this record by that date, not that you had the material, and doesn't settle a dispute on its own.",
  'm.faq.2q': 'Do I need crypto or a wallet?',
  'm.faq.2a':
    'No. Making a record in the demo and checking any record need no wallet, no sign-up and nothing to buy. Your browser keeps a random key that finds your demo records on our server. The proof code goes on Midnight, a network built for privacy. You never deal with it directly.',
  'm.faq.3q': 'Will it stand up in a dispute?',
  'm.faq.3link': 'Records in evidence →',
  'm.faq.4q': 'What do you see of my data?',
  'm.faq.4a':
    "Your genetic data, unlocked: nothing. Your computer reads the files you add to make a code from each, and they aren't uploaded. A lab report reaches our server only when a lab sends it back to you: it's locked so only you can open it, and deleted after 180 days. The details you type (the record's name, breeder, dates, notes, agreement terms) and your files' names are stored on our server locked, and we don't have the key. We can read each record's proof code, and anything you choose to show. The sample details you and a lab write for a delivery are stored locked too, with a key that travels in the lab code, and we don't have it. Labs and developers can seal records inside their own systems, so only the proof code goes out.",
  'm.faq.4link1': 'What the demo keeps →',
  'm.faq.4link2': 'Integration guide →',
  'm.faq.6q': 'What does it cost?',
  'm.faq.6a': 'Free. Making a record on this site and checking any record are both free.',

  'm.demo.label': 'Demo',
  'm.demo.title1': 'Try the',
  'm.demo.title2': 'demo.',
  'm.demo.lede':
    "No sign-up, no wallet. It's a test version, so use made-up details. Records are batched and dated on Midnight; licenses and lab agreements are simulated, and DNA report pairings aren't dated yet.",
  'm.demo.privacy': 'What the demo keeps →',
  'm.demo.create.title': 'Make a record',
  'm.demo.create.text': 'A made-up plant, animal or document: seal it, save your backup, then see its page.',
  'm.demo.verify.title': 'Verify a record',
  'm.demo.verify.text': "Enter a record's identifier and see what its holder disclosed and whether it is anchored.",
  'm.demo.paste.title': 'Got a code or link?',
  'm.demo.paste.text':
    "A lab with a breeder's lab code, or anyone sent a record link or an agreement to sign: paste it and the right screen opens.",
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
  'm.postG.date': '16 Nov 2026',
  'm.postG.tag': 'Records',
  'm.postG.title': 'A production chain, step by step',
  'm.postG.text':
    "A grow batch and a harvest lot are now records of their own, each naming the one before: the plant, the batch, the lot, the lab report. Each has its own date. A link can carry the chain, so whoever checks it can open every step. The links are the holder's statement; each record's date is checked on Midnight. First run on veilcore.org on 16 November 2026.",
  'm.postF.date': '16 Nov 2026',
  'm.postF.tag': 'Privacy',
  'm.postF.title': 'Keep a document on your device only',
  'm.postF.text':
    "When you seal a document you can now keep it on this device and in your backup file only. Nothing you type is sent, locked or not: VeilCore's registry gets the record's ID, its proof code and its key binding, so it can be dated. First sealed, dated and checked on veilcore.org on 16 November 2026.",
  'm.postE.date': '2 Nov 2026',
  'm.postE.tag': 'Evidence',
  'm.postE.title': 'An evidence file for any document',
  'm.postE.text':
    "A document's page now downloads one file a lawyer or examiner can check without our website: the record as sealed, its proof, where it was dated, a page that runs the checks offline, a summary to print and sample text for a declaration. You can include a copy of the document; it's checked against the record first.",
  'm.postD.date': '31 Oct 2026',
  'm.postD.tag': 'Website',
  'm.postD.title': 'Seal a document',
  'm.postD.text':
    "Permits, certificates, contracts: your computer works out the file's code, and only the record's proof code is dated on Midnight. The file never leaves your device. Send a check link with the file, and whoever gets it can see it's the same file, byte for byte, and when you had it.",
  'm.postC.date': '19 Oct 2026',
  'm.postC.tag': 'Website',
  'm.postC.title': 'Your browser sends its own transactions',
  'm.postC.text':
    "On veilcore.org your browser now dates a DNA report pairing, proves a record by link and stamps a record's own key itself, and VeilCore pays the network fee. Records are batched and dated on Midnight's main network. No wallet needed.",
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
  'm.status.lede': 'What runs today, and how far it has been checked.',
  'm.stat3.b': 'No audit',
  'm.stat3.s': 'No independent security audit yet. Our own reviews of the contracts are public.',
  'm.stat3.link': 'Read them on GitHub →',
  'm.stat4.b': 'No sign-up, no wallet',
  'm.stat4.s': 'Make a record now. Checking one is free and needs no account.',
  // Mainnet builds only: the contract addresses, in "For technical readers".
  'm.addr.title': 'The contracts, for anyone who wants to check them.',
  'm.addr.main': 'Main contract',
  'm.addr.claims': 'Claims contract',
  'm.addr.claimsPending': 'Not on the main network yet.',
  'm.addr.explorer': 'Look them up on midnightexplorer.com (run by TexLabs) →',
  'm.status.keyTitle': 'Who can change the contract.',
  'm.status.keyText':
    "One maintenance key can change how VeilCore's contract on Midnight works. Whoever holds it can add or replace the contract's operations, which could take over any record's identity, add licenses for any issuer, add or remove obligations and parent links, or switch operations off. It cannot backdate the network's block times, and every change shows on chain. It can't change or remove a batch that's already anchored, or the date it gives a record: that is in the transaction that anchored it, which nobody can alter. Today the key is on paper, one copy with each founder, and either copy alone can use it. Moving it to three keys, where two must agree, was planned before Midnight's Ledger 9 upgrade on 6 November 2026 and has not been done. The network still accepts the key, so treat it as live. Anyone can check the contract's change counter on a Midnight explorer, and any change raises it. Every use is announced publicly, under a written maintenance policy.",
  'm.status.keyLink': 'Read the maintenance policy →',
  // "For technical readers" (home page, near the end): collapsed until opened.
  'm.tech.title': 'For technical readers',
  'm.tech.lede': 'How checking works by hand, the code, the Bitcoin stamp, and who can change the contracts.',
  'm.tech.show': 'Show the detail',
  'm.tech.check.t': 'Checking a record by hand',
  'm.tech.check.p':
    "Recomputing a record's proof code needs only SHA-256 and the open spec. Its inclusion proof ties that proof code to a batch's code anchored on Midnight, and the transaction that anchored it gives the batch's date. The evidence bundle's verify.html does the recomputing offline and names the transaction and root to look up. The check page looks that transaction up on Midnight itself when it can reach Midnight; otherwise it says the date is our registry's report, and you can look it up on a Midnight explorer. Records sealed since 14 October name their own key, so checking them also needs spec section 3.6.1, in the spec on this site and in SDK 0.16.0 and later. Looking a record up by its identifier on this site uses our server.",
  'm.tech.impl.t': 'One spec, three implementations',
  'm.tech.impl.p':
    'Free to implement, permanently. TypeScript, Python and Rust agree on all 121 record-format test vectors on GitHub, and anyone can run them. One author wrote all three, and the TypeScript one is on npm as 0.18.1. One written by someone else is the test we most want.',
  'm.tech.btc.t': 'The Bitcoin stamp',
  'm.tech.btc.p':
    "Our registry stamps each sealed batch's code on Bitcoin with OpenTimestamps. The first reached Bitcoin block 971004 on 11 October. Checked on 15 October against two block explorers: the stamp leads to Bitcoin blocks 971004 and 971005. A check with the official OpenTimestamps tool and a full Bitcoin node is still to do. The stamp file is the batch's .ots file: Download Bitcoin stamp file, on the plant's page. The test site's registry doesn't stamp on Bitcoin.",
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
    "veilcore.org runs on Midnight's main network, and records made there are real. The test site is for practice, and its records carry no weight. Some features are tried there first.",
  'm.live.colMain': 'veilcore.org (main network)',
  'm.live.colTest': 'test.veilcore.org',
  'm.live.colNot': 'Not yet',
  // The same column's heading on the test site itself (no link to itself, no "going live").
  'm.live.colTestHere': 'This test site (test.veilcore.org)',
  'm.live.feature': 'Feature',
  'm.live.show': 'Show the list',
  'm.live.stamp.t': 'A date stamp for your record',
  'm.live.stamp.main': 'Yes, in batches dated on Midnight. Your browser sends nothing to the chain.',
  'm.live.stamp.test':
    "Yes. Batches are dated automatically, and that dates your record. Your browser also date stamps your record's own key, which dates only the key.",
  'm.live.btc.t': 'A Bitcoin date stamp too',
  'm.live.btc.main':
    'Yes, every sealed batch. The first reached block 971004 on 11 October and was checked against two block explorers on 15 October. A check with the official tool and a full node is still to do.',
  'm.live.share.t': 'Choosing what others see',
  'm.live.share.main': 'Yes. You pick each fact. The name shows only in links you send, or if you choose to show it.',
  'm.live.share.test': 'Yes. You pick each fact. The name shows only in links you send, or if you choose to show it.',
  'm.live.lab.t': 'Lab code and signed receipt',
  'm.live.lab.main': "Yes. The lab signs with its own key. VeilCore's registry keeps the receipt, not the chain.",
  'm.live.lab.test': 'Yes, the same way.',
  'm.live.results.t': 'Lab reports locked to you',
  'm.live.results.main': 'Yes. New, and still being tested.',
  'm.live.results.test': 'Yes. New, and still being tested.',
  // Numbers and results a lab signs (config/network.ts LAB_SIGNING_ENABLED). The veilcore.org cell
  // says 'main' until it has worked there (config/copy.ts LAB_SIGNING_RUN_ON_MAINNET), then 'live'.
  'm.live.signed.t': 'Numbers and results a lab signs',
  'm.live.signed.main': 'Built, not yet tried on the main network.',
  'm.live.signed.test':
    'Yes. The lab signs with its own key. Only the record’s holder, the lab and whoever sent it the sample see it, and only the holder can show it to others.',
  'm.live.signed.live':
    'Yes. The lab signs with its own key. Only the record’s holder, the lab and whoever sent it the sample see it, and only the holder can show it to others. Adding a lab’s result file to another breeder’s records is built, not yet tried on the main network.',
  'm.live.local.t': 'A document kept on your device only',
  'm.live.local.main': 'Built, not yet tried on the main network.',
  'm.live.local.test':
    'Yes, for document records. Nothing you type is sent to VeilCore: only the record’s ID, its proof code and its key binding. The one exception is a number you choose to prove (next row).',
  'm.live.local.live':
    'Yes, for document records. Nothing you type is sent to VeilCore: only the record’s ID, its proof code and its key binding. The one exception is a number you choose to prove (next row).',
  'm.live.docchain.t': 'A production chain as linked records',
  'm.live.docchain.main': 'Built, not yet tried on the main network.',
  'm.live.docchain.test':
    'Built, not yet tried. A source record, a grow batch, a harvest lot and a lab report each name the one before, and each has its own date. The links are the holder’s statement.',
  'm.live.docchain.live':
    'Yes. A source record, a grow batch, a harvest lot and a lab report each name the one before, and each has its own date. The links are the holder’s statement, not checked by VeilCore or Midnight.',
  'm.live.localclaims.t': 'Proving a number from a document kept on your device',
  'm.live.localclaims.main': 'Built, not yet tried on the main network.',
  'm.live.localclaims.test':
    'Built, not yet tried. Your choice, off until you turn it on. What you prove is public on Midnight; nothing goes to VeilCore’s registry, but VeilCore can tie what you prove to the record.',
  'm.live.localclaims.live':
    'Yes. Your choice, off until you turn it on. What you prove is public on Midnight; nothing goes to VeilCore’s registry, but VeilCore can tie what you prove to the record.',
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
  'm.live.claims.live':
    "Yes, from a computer: prove one number from a sealed certificate or lab result, without showing the rest. Phones haven't been tried.",
  'm.live.lic.t': 'Licenses and royalties',
  'm.live.lic.main': 'Switched off until a final test run.',
  'm.live.lic.test': 'Yes, with real transactions: royalties, payments, handing a license on.',
  'm.live.lic.not': 'On veilcore.org, after a final test run.',
  // The veilcore.org cell until royalties v2 has worked on mainnet (config/copy.ts ROYALTIES_RUN_ON_MAINNET).
  'm.live.lic.mainNext':
    'Licenses go live with the deploy that switches them on, once a real license has worked end to end on the main network. Royalty statements and payments: built, not live yet.',
  // The test-site cell until royalties v2 has run there (config/copy.ts ROYALTIES_RUN_ON_TEST).
  'm.live.lic.testNext':
    'Yes for licenses, with real transactions. Royalty reports (they have worked on veilcore.org), and paying royalties on Midnight itself: built and offered here; they have not yet worked end to end on this network.',
  // Licenses on in code, on a build that isn't veilcore.org's (the test site, the demo): the main-network cell.
  'm.live.lic.next':
    'Built. Goes live with the next veilcore.org deploy, once a real license has worked end to end on the main network.',
  // Licenses on, on veilcore.org's own build (AGREEMENTS_LIVE, mainnet sponsor live): the main-network cell (components/site/Home.tsx).
  'm.live.lic.live':
    'Yes: licenses, with real transactions, and royalty reports with their answer, “I paid” and “Receipt confirmed”. Handing a license on is built, not yet tried on the main network. Paying royalties on Midnight itself is offered on the test site only, and has not yet worked end to end there.',
  // The check page looking a record's date up on Midnight itself (docs/check-on-chain.md).
  // On veilcore.org it needs the read-only relay; the mainnet overlay says "Yes." once a
  // build has one (CHAIN_READS).
  'm.live.chain.t': 'The check page reads Midnight itself',
  'm.live.chain.main': 'Not yet: needs our read-only relay.',
  'm.live.chain.test': 'Yes.',

  'm.contact.label': 'Get in touch',
  'm.contact.title1': 'Talk to',
  'm.contact.title2': 'the founders.',
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
  'm.foot.contact': 'Contact',
  'm.foot.verify': 'Verify a record',
  'm.foot.fine': 'Evidence you held a record by a date. Not a title to what it describes.',
  'm.foot.terms': 'Terms of use',
  'm.terms.inEnglish': 'These terms are in English, and the English text governs.',

  'm.verify.label': 'Verify',
  'm.verify.title': 'Check a record',
  'm.verify.lede':
    'Enter the record identifier printed on a certificate or shared with you. You will see what its holder chose to share, and what this page could check itself: whether the record is in a sealed batch, and whether any lab signatures verify.',
  'm.verify.what':
    "A VeilCore record describes genetic material without including the genetics. Its check page shows what its holder chose to share, and its name when the holder's link carries it. Only its proof code goes on Midnight, and it gets a date once it's anchored there. Checking one is free and needs no account.",
  'm.verify.home': 'What is VeilCore? →',
  'm.verify.field': 'Record identifier',
  'm.verify.go': 'Check it',
  'm.verify.fpField': 'Proof code (on the certificate, optional)',
  'm.verify.fpHelp': "With it, this page checks the record against the code you have, not only the registry's answer.",
  'm.verify.fpBad': 'A proof code is 64 characters, 0–9 and a–f. Leave it empty to check by the identifier alone.',
  'm.verify.scan': 'Scan a label’s QR code',
  'm.verify.example': 'Not sure what you will see? Look at an example first →',

  'm.founders.label': 'Founders',
  'm.founders.lede':
    'VeilCore is an evidentiary record format for plant, animal and microbial genetics. It gives evidence that you held a record of your material by a given date, without handing over your genetic data.',
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
  'm.privacy.sum.local.t': 'Never leaves your device unlocked',
  'm.privacy.sum.local.p': 'Your DNA files and photos never leave your device. Lab reports travel locked.',
  'm.privacy.sum.locked.t': "Stored locked, we can't read it",
  'm.privacy.sum.locked.p': 'Everything you type into a record, and lab reports a lab sends you.',
  'm.privacy.sum.read.t': 'We can read',
  'm.privacy.sum.read.p': 'The record ID, the proof code, dates, and what you choose to show. The full list is below.',
  'm.privacy.full': 'The full list',
  'm.privacy.stored.title': 'Stored on our test server',
  'm.privacy.stored.text':
    "Your records and agreements, locked by your browser before they are sent: each record's name, breeder, species, dates, notes, reference numbers, parents, the codes and file names of the photos and lab reports you add, agreement terms and counterparties, the quantity and note you send a lab, the sample details you and the lab write (sample ID, seal number, where and when it was taken, a witness, how it arrived), the names you give recipients, and each record's own secret keys. Our server stores them locked, and we don't have the key: it is in your browser and your backup file. The sample details' key also travels in the lab code, so the lab can open them. If you choose, a record's name also travels in a check link you make, after the #. A browser doesn't send that part when it opens the link, but the link goes whole to anyone you send it to and to any site you paste it into, a partner's form included. Our server can read: each record's ID; its proof code, key binding and profile type; a code made from its name, which says nothing about the name without the key in your check link; its correction links (which record a correction replaces, which fields it changed, and when); when the server first saw it; how many times it was saved, and when it was last saved; roughly how large it is (its size bucket); what you choose to show on its check page (its name, if you choose to show it, and whether a DNA report is saved, as a code that says nothing about the file without the key in your check link); the parent links you register; and its batch and date stamp. If an agreement has a royalty on offspring, our server can read which record it covers and when it took effect, and anyone can ask whether that record carries one: the lineage check needs it. For a delivery: which record it came from, which holder account received it, when it was received, and a tag in place of the recipient's name. A delivery made before tags has the name as typed, until the registry's purge replaces it. For labs: the public signing key and the signatures they make. A lab's receipts and reports about your record are private: our server shows them only to you, the lab and whoever sent the lab the sample, unless you choose to show them on your check link. If you show whether a DNA report is saved, your check page also says, for each receipt, that a lab received a sample and whether what arrived matches what was sent, without the lab's name. A lab's signature on a report names the report bound to your record with a key only you and the lab hold; one made before 17 October 2026 names the report file's SHA-256, which our server shows only to you, the lab and whoever sent the lab the sample. Requests to prove a record's key, with the name the asker typed, kept for 7 days: our server learns which on-chain key each request names. The prove and check pages never send your holder key. Your holder key, which your browser sends with every save so the server can find your records; the server keeps only a one-way digest of it. Records saved before locking stay readable to us until your browser locks them, and a record's name saved before names were locked stays readable to us until your browser saves the record again. Sample details written before sealing stay readable to us until the registry removes them. Our off-site backups made before then keep a readable copy of all of these until we destroy the key that opens them. Locked lab reports a lab sends you: stored locked, without the key, and deleted after 180 days. The server is VeilCore's test registry, hosted on Railway.",
  'm.privacy.local.title': 'Never leaves your browser unlocked',
  'm.privacy.local.text':
    'Your DNA files never leave your device. Lab reports travel locked. Your browser reads the DNA reports, lab reports and photos you add to make a code from each; the files themselves are never uploaded. A lab report reaches our server only when a lab sends it back to you, locked so only you can open it.',
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
  'm.privacy.deviceonly.title': 'A document kept on this device only',
  'm.privacy.deviceonly.text':
    'When you seal a document, you can choose to keep its record on this device and in your backup file only. Then nothing you type into it is sent to our server, locked or not. What we do get: the record ID, its proof code and its key binding, so it can be dated; your network address and the time, as with any request; and, if you keep a passkey copy, the record’s ID and its keys inside that locked copy. If you choose to date-stamp the record’s key, a code made from the key goes to Midnight through our fee service. One exception, and only if you choose it: if you prove one of its numbers, a fact about that number goes to Midnight through our fee service and is public for good. That is the limit you set and its direction or, if you prove the number exactly, the number itself. None of it goes to our registry. But what you prove is public, and we, and anyone who has the record’s check link, can tie it to the record; we can also tie it to the holder key that dated it. We can’t give such a record back: the only copies are in your browser and in a backup file saved after it was sealed, and the app asks you to save and check one straight away. Anyone you send its check link and file to can still check it. The choice is made when sealing and can’t be changed after.',
  'm.privacy.deals.title': 'Agreements and royalties',
  'm.privacy.deals.text':
    'The messages of a license deal (the terms, each royalty report, the answer to it, “I paid”, “received”, reminders and notices, and the licensor’s payout and business details) are locked with a key only the two parties share, made when they read each other the 6-digit code. Our server stores them locked and passes them on: it can’t read, change or forge them. It can see which license a deal belongs to, how many messages it has and when each arrived. Payout details (a bank account, a payment link or a Midnight address) and business details (a legal name, address and tax number) travel inside those locked messages: the other party can read them, we can’t. Every copy you download or back up (the signed record of a deal, your backup file) has them in the clear, so treat those files like a bank statement. A payment partner’s receipt can be read by anyone who holds the statement’s proof code; only the two parties and their partner have it. We keep a deal’s messages until a party asks us to delete them; the other party keeps their own copy. The license itself is on Midnight: see “What goes on Midnight”.',
  'm.privacy.chain.title': 'What goes on Midnight, permanently',
  'm.privacy.chain.text':
    'Midnight is a public network: what goes there can’t be changed or removed by anyone, us included, and anyone can read it. Your genetics, your terms, your name and your files never go there. What does: the proof code of each batch of records; a record’s own key and its date stamp; a code made from a DNA report, when you date its pairing; which records are linked as parent and child, once both holders confirm (a link can’t be undone); that a record has a license, an obligation or a lender’s claim recorded on it, and when that changed; a lab’s public key when it signs a certificate there; a value you choose to prove exactly, in full; and, where this site lets a royalty be paid in NIGHT, the amount and the two addresses. Before each of these steps, the app shows a receipt listing exactly what that step makes public. A code or key on its own says nothing about you, but anyone you give a check link to can follow what happens to that record on the network from then on.',
  'm.privacy.timestamps.title': 'Timestamps, and working with no signal',
  'm.privacy.timestamps.text':
    "When our server takes a record's proof code, it asks one or more timestamp authorities (independent services, some run by one person) for a timestamp on it, and on each batch. Each authority receives a code made from the proof code and the time it was asked, and can keep a log of them; since proof codes appear on check pages, an authority could match its log to a check link. Anyone with a check link can read, to the second, when our server took that record's proof code. For a record sealed with no signal, that is when your device next had signal. The page leads with the minute; the timestamp itself carries the second. To open with no signal, your browser keeps a copy of this site's own code, and, where it can send by itself (Chrome), the proof codes waiting to be sent and the key they are sent with. That copy is deleted when you start over or remove this site's data.",
  'm.privacy.helper.title': 'The helper, and its optional model',
  'm.privacy.helper.text':
    'Ask, the helper in the app, where this site offers it, works on your device. Nothing you type into it is sent anywhere; only the app’s own Save sends anything, and that goes to our server locked, as above. Where this site offers the optional language model, it is downloaded once from Hugging Face, a separate company: Hugging Face sees your IP address, the time, which model files, and that the request comes from this site; we see that a download started. The model runs on your device, in a part of the page that can’t reach the network, so nothing you type reaches Hugging Face or us, then or later. You can delete the model from the helper’s panel. Its “Do it for me” keeps a record of each job on your device only, never in a backup: the steps and how far they got, references to the records and agreements involved, and the figures you type for a report until it is sent; never what you typed to ask. It is deleted 7 days after the job ends. While a job waits for your approval, its new records are kept in your browser, locked, with their keys; a backup made meanwhile holds those keys too. Getting reports ready reads each of your agreements’ messages from our server, one after another, so our server can see that those agreements were read together; nothing is sent until you approve.',
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
  // VeilCore opened from an iPhone Home Screen with nothing in it (site/HomeScreenStart.tsx).
  'm.homescreen.title': 'Open your records',
  'm.homescreen.text': 'This is VeilCore on your Home Screen. It keeps its own storage, separate from Safari.',
  'm.homescreen.lost': 'Nothing has been lost. Bring your records in with your backup file.',
  'm.homescreen.restore': 'Bring in my records',
  'm.homescreen.fresh': 'New to VeilCore? Start here',
  'm.homescreen.safari':
    'No backup file with you? If you used VeilCore in Safari on this device, your records are still there.',
  'm.privacy.contact': 'Questions: hunter@veilcore.org',
  'title.checkSite': 'Check this site',
  'm.privacy.code.title': "The app's code",
  'm.privacy.code.text':
    "VeilCore serves the app's code. Each release publishes the list of its files. You can check that the files your browser received match that list, and anyone can rebuild the release from the published code and compare. This shows what we released. It can't prove a host sent everyone the same files.",
  'm.checksite.title': 'Check this site',
  'm.checksite.lede':
    "VeilCore serves the app's code. Each release publishes the list of its files. You can check that the files your browser received match that list, and anyone can rebuild the release from the published code and compare. This shows what we released. It can't prove a host sent everyone the same files.",
  'm.checksite.reading': 'Reading which release this is…',
  'm.checksite.noRelease':
    'This copy of the site wasn’t published by a release deploy, so there is no list to check it against.',
  'm.checksite.release': 'This copy of the site says it is release {commit} on {network}, made {date}.',
  'm.checksite.how':
    'The check fetches every file the release lists from this site, and every page address the app has (with random record IDs) and a random address, the way a browser opens a page. It works out the SHA-256 of each in your browser and compares it, and the security headers, with the list. It also checks that this page has no script the listed page doesn’t.',
  'm.checksite.trust':
    'This page runs on the site it checks, so a site that lies could lie here too. To check without trusting VeilCore, download the list from the public code and use it below, or run {command} from a copy of the code.',
  'm.checksite.rebuild':
    'To check the list itself against the code, rebuild the release from a copy of the code: {command}.',
  'm.checksite.pagesMatch': 'All {total} page addresses are the listed page, with the listed security headers.',
  'm.checksite.pagesDiffer': '{matched} of {total} page addresses are the listed page. These differ:',
  'm.checksite.pageDiffers': 'Different page: {path}',
  'm.checksite.headerDiffers': 'Different security header: {name}',
  'm.checksite.noHeaders':
    'This release’s list has no security headers (it was made before they were listed), so they weren’t compared.',
  'm.checksite.extraScript': 'This page has a script the listed page doesn’t: {script}',
  'm.checksite.workerOk':
    'The part that lets VeilCore open with no signal (/sw.js) is sent so browsers always fetch it fresh, and keeps only files on this release’s list.',
  'm.checksite.workerWrong':
    'The part that lets VeilCore open with no signal isn’t as it should be ({path}). Don’t rely on it with no signal: clear this site’s data, reload, and tell us.',
  'm.checksite.copyHere': 'This browser’s no-signal copy matches release {commit}.',
  'm.checksite.copyOther':
    'This browser’s no-signal copy is release {commit}, not the one checked here. It updates the next time a page loads with signal.',
  'm.checksite.limit': 'This shows what your browser received. It can’t prove the host sent everyone the same files.',
  'm.checksite.listLink': 'This release’s list in the public code',
  'm.checksite.useSite': 'Check against the list this site serves',
  'm.checksite.useFile': 'Or check against a list you downloaded:',
  'm.checksite.checking': 'Checking {done} of {total} files…',
  'm.checksite.allMatch': 'All {total} files match the release’s list.',
  'm.checksite.someDiffer': '{matched} of {total} files match the release’s list. These don’t:',
  'm.checksite.differs': 'Different: {path}',
  'm.checksite.missing': 'Missing: {path}',
  'm.checksite.noList': 'That isn’t a release list.',
  'm.checksite.otherList': 'That list is for another release, not the one this site says it is.',
  'm.checksite.uncommitted':
    'This release was built from code with changes not yet committed, so its files are not exactly the published code at that commit.',
  // The privacy policy veilcore.org shows at /privacy (components/site/PrivacyPolicy.tsx).
  ...policyEn,
} as const;

export type StringKey = keyof typeof en;
export type Strings = Partial<Record<StringKey, string>>;
