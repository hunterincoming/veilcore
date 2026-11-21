// The privacy policy veilcore.org shows at /privacy (components/site/PrivacyPolicy.tsx). The
// source text; de.ts, es.ts, fr.ts and ja.ts beside it translate it key by key, and each
// language's pack spreads its file in (i18n/en.ts, de.ts, ...). The test site keeps its own
// short note (m.privacy.*).
//
// Every sentence here must be true of what veilcore.org does: where this text and the code
// disagree, the code is right and this text changes. The lawyer-review copy, with the sources
// for each claim and the open questions, is docs/privacy-and-data-terms.md: change both together.
// Features built but switched off on veilcore.org (paid plans, payments on Midnight or Cardano)
// are left out; the page says it will be updated before any payment feature is turned on.
// SPDX-License-Identifier: Apache-2.0

export const policyEn = {
  'm.pp.title': 'Privacy policy',
  'm.pp.updated': 'Last updated {date}.',
  'm.pp.lede':
    'This policy covers veilcore.org: the website, VeilCore’s server that keeps records (the registry), and the service that pays Midnight’s network fees for you (the fee sponsor). It says what we keep, what is public, who else sees what, and what you can do about it.',

  'm.pp.short.t': 'The short version',
  'm.pp.short.1':
    'Your DNA files, lab report files and photos never leave your device. Your browser makes a code from each one; the file itself is never uploaded.',
  'm.pp.short.2':
    'What you type into a record is locked in your browser before it is sent. Our server stores it locked, and we don’t have the key.',
  'm.pp.short.3':
    'Our server can read what it needs to work: a record’s ID, its proof code, when it was saved, and what you choose to show. The full list is below.',
  'm.pp.short.4':
    'Only codes, and what you choose to prove, go on public networks (Midnight, and Bitcoin through OpenTimestamps). What you typed goes there only if you prove a number from it exactly. Once there, nobody can delete it, us included.',
  'm.pp.short.5': 'We don’t sell your data. No ads, no analytics or tracking, no cookies.',
  'm.pp.short.6': 'You can download your records and delete them. For anything else, write to hunter@veilcore.org.',

  'm.pp.who.t': 'Who we are',
  'm.pp.who.p':
    'VeilCore’s founders run this website, the registry and the fee sponsor. Write to us at hunter@veilcore.org.',

  'm.pp.device.t': 'What stays on your device',
  'm.pp.col.what': 'What',
  'm.pp.device.col': 'What happens to it',
  'm.pp.device.files.t': 'DNA reports, lab report files and photos you add',
  'm.pp.device.files.p': 'Your browser reads each one to make its code (its SHA-256). The file is never uploaded.',
  'm.pp.device.vault.t': 'The key that locks your records',
  'm.pp.device.vault.p':
    'Kept in your browser and your backup file, and never sent to us unlocked. If you turn on “Saved with VeilCore”, it goes inside a locked copy that only your passkey or your recovery sheet opens.',
  'm.pp.device.recordkeys.t': 'Each record’s secret keys',
  'm.pp.device.recordkeys.p':
    'Kept in your browser and your backup file. A locked copy goes with the record to our server, so your backup brings them back.',
  'm.pp.device.labkey.t': 'A lab’s private signing key',
  'm.pp.device.labkey.p':
    'Kept in the lab’s browser and its backup file. Only the public key is sent to us unlocked. With “Saved with VeilCore” on, the private key also goes inside your locked copy.',
  'm.pp.device.deviceonly.t': 'A document you keep on this device only',
  'm.pp.device.deviceonly.p':
    'Nothing you type into it is sent to us, locked or not. We get its ID, its proof code and its key binding, so it can be dated. With “Saved with VeilCore” on, its ID and keys, not what you typed, also go inside your locked copy. We can’t give it back: keep the backup file the app asks you to save.',
  'm.pp.device.scan.t': 'The camera, when you scan a code',
  'm.pp.device.scan.p':
    'The picture is read in the page and dropped. Only the text it reads goes into the box you scanned into, and from there only where that box already goes.',
  'm.pp.device.labels.t': 'QR labels you print',
  'm.pp.device.labels.p':
    'Drawn on your device and printed by your browser. A label carries the record’s ID and proof code, and its name only if you tick that.',
  'm.pp.device.sheet.t': 'Your recovery sheet’s code',
  'm.pp.device.sheet.p': 'Made on your device and printed from it. It is never sent to us, and not kept on the device.',
  'm.pp.device.passkey.t': 'The passkey check page',
  'm.pp.device.passkey.p': 'Tests your passkey in your browser. Nothing is sent.',
  'm.pp.device.ask.t': 'Ask, the helper in the app',
  'm.pp.device.ask.p':
    'Works on your device. Typing to it sends nothing. Only Save sends, or approving a “Do it for me” job, which then saves, sends reports or dates exactly what you approved. A job is kept on your device only, and deleted 7 days after it ends.',

  'm.pp.browser.t': 'What your browser keeps',
  'm.pp.browser.p1':
    'The site uses your browser’s storage on this device: your holder key (the key that finds your records on our server), the key that locks your records, your records and licenses, each record’s secret keys, the keys of your license deals, lab codes, a record you haven’t finished, your settings and language, and a copy of this site’s own code so it opens with no signal. Where the browser can send by itself (Chrome), records waiting to be dated are kept there too, with your holder key, until signal comes back. With “Saved with VeilCore” on, it also keeps two keys made from your account key, which the page can use but not read out.',
  'm.pp.browser.p2':
    'No cookies. To remove all of it, clear this site’s data in your browser’s settings. Save your backup first: without it, you can’t find or open your records again. The name of each stored item is under “Technical details” at the end.',

  'm.pp.server.t': 'What our server keeps',
  'm.pp.server.p':
    'Our server is VeilCore’s registry, hosted on Railway. “Locked” means your browser locked it before sending it, and we don’t have the key.',
  'm.pp.col.read': 'Can we read it?',
  'm.pp.col.keep': 'How long',
  'm.pp.server.records.t':
    'Your records and agreements: each record’s name, breeder, species, dates, notes, reference numbers and parents, the codes and file names of the photos and lab reports you add, agreement terms and the other party, the names you give recipients, and each record’s secret keys',
  'm.pp.server.records.read': 'No. Locked.',
  'm.pp.server.records.keep': 'Until you delete it, or ask us to',
  'm.pp.server.facts.t':
    'About each record: its ID, proof code, key binding and kind; a code made from its name, which says nothing about the name without the key in your check link; its correction links; when our server first saw it; how many times it was saved, and when last; roughly how large it is; the parent links you register; its batch and timestamps',
  'm.pp.server.facts.read':
    'Yes. Anyone with the record’s ID sees its proof code, when our server first saw it, its correction links, its batch and timestamps, and whether it has lab signatures.',
  'm.pp.server.facts.keep': 'As long as the record',
  'm.pp.server.shown.t':
    'What you choose to show on a record’s check page, such as its name, a lab’s signature, or whether a DNA report is saved (as a code)',
  'm.pp.server.shown.read': 'Yes. Anyone with the record’s ID sees it.',
  'm.pp.server.shown.keep': 'Until you turn it off or delete the record',
  'm.pp.server.holder.t': 'Your holder key, which your browser sends with every save',
  'm.pp.server.holder.read': 'We keep only a one-way digest of it.',
  'm.pp.server.holder.keep':
    'As long as your records, and after that beside each deleted record and each proof code you held',
  'm.pp.server.copy.t':
    '“Saved with VeilCore”: one locked copy of what your backup file holds except the records themselves (your keys, lab codes, and license and deal keys), and a locked key for each way in (a passkey or a recovery sheet)',
  'm.pp.server.copy.read':
    'No. Locked. We see which ways in open which copy and what kind each is, the copy’s rough size, and when it is saved or checked. We aren’t told whose copy it is, but the time and address of a save could let us guess which records it goes with.',
  'm.pp.server.copy.keep': 'Until you choose “Stop saving with VeilCore”',
  'm.pp.server.delivery.t':
    'Lab codes (deliveries): which record a delivery came from, which account received it and when, and a tag in place of the recipient’s name. The quantity, note and sample details (sample ID, seal number, where and when it was taken, a witness, how it arrived) are locked with a key that travels in the lab code.',
  'm.pp.server.delivery.read': 'Partly. The details are locked.',
  'm.pp.server.delivery.keep': 'No set period',
  'm.pp.server.labs.t':
    'Labs: a lab’s public key, the name, role and website it gives, our notes on checking its name, and the signatures it makes. A lab’s receipts and reports about your record are shown only to you, the lab and whoever sent the lab the sample, unless you choose to show them.',
  'm.pp.server.labs.read': 'Yes',
  'm.pp.server.labs.keep': 'No set period',
  'm.pp.server.results.t': 'Lab reports a lab sends you',
  'm.pp.server.results.read': 'No. Locked to your record’s key.',
  'm.pp.server.results.keep': 'Deleted 180 days after they arrive. Copies in our backups stay until those are removed.',
  'm.pp.server.prove.t':
    'Requests to prove a record’s key: the name the asker typed, and the answers. Our server learns which on-chain key each request names.',
  'm.pp.server.prove.read': 'Yes, and so can anyone with the request’s link',
  'm.pp.server.prove.keep': 'Deleted after 7 days',
  'm.pp.server.invites.t':
    'License invites: the label you give the other party, which record it is for, and the codes and transaction IDs the two browsers exchange',
  'm.pp.server.invites.read': 'Yes, and so can anyone with the invite’s link',
  'm.pp.server.invites.keep': 'Deleted after 30 days',
  'm.pp.server.deals.t':
    'The messages of a license deal: the terms, royalty reports and answers, “I paid”, “received”, and payout and business details',
  'm.pp.server.deals.read':
    'No. Locked with a key only the two parties share. We see which license they belong to, how many there are and when each arrived.',
  'm.pp.server.deals.keep': 'Until a party asks us to delete them. A deal with no messages is deleted after 7 days.',
  'm.pp.server.notices.t':
    'License lines on a record’s check page (a report overdue, a notice of breach, revoked), and the other party’s answer to one (its kind and date)',
  'm.pp.server.notices.read': 'Yes. Anyone with the record’s ID sees them.',
  'm.pp.server.notices.keep': 'Until the line is taken off or the record deleted. Answers stay on file.',
  'm.pp.server.obligations.t':
    'A royalty on offspring: which record it covers and when it took effect. Anyone can ask whether a record carries one.',
  'm.pp.server.obligations.read': 'Yes',
  'm.pp.server.obligations.keep': 'As long as the license',
  'm.pp.server.receipts.t':
    'A payment partner’s receipt for a royalty report: the amount, the currency, the account paid, its reference and when',
  'm.pp.server.receipts.read':
    'Yes, by anyone who has the report’s code, which only the two parties and their partner have.',
  'm.pp.server.receipts.keep': 'No set period',
  'm.pp.server.batches.t':
    'Batches: each record’s proof code, the proof that it is in its batch, the batch’s code, where it was anchored, its Bitcoin stamp and its timestamps',
  'm.pp.server.batches.read': 'Yes',
  'm.pp.server.batches.keep': 'Kept: they are what make old records checkable',
  'm.pp.server.logs':
    'Our registry keeps no log of requests and doesn’t record who looked at a check page. To limit abuse it counts requests per network address in memory only; the counts are gone when it restarts. To cap timestamp requests, it also keeps, for a day, when each holder key asked for one. The fee sponsor logs counters and outcomes only, never what was sent. Our hosts keep their own request logs (below).',
  'm.pp.server.purge':
    'Text saved before records were locked was removed from our server on 18 October 2026, and the backups made before then can no longer be opened: we destroyed their key the same day.',
  'm.pp.server.backup':
    'Backups: once a day, our registry’s data, and the locked lab report files, are encrypted to a key our server never holds and stored with Backblaze B2. The storage is set to lock each copy for 30 days, so nobody can delete it sooner; how long copies are kept after that is not set yet. A record you delete stays in the backups made before, until those are removed.',

  'm.pp.chain.t': 'What is public, for good',
  'm.pp.chain.p1':
    'Midnight and Bitcoin are public networks. What goes there can’t be changed or removed by anyone, us included, and anyone can read it. What you typed and your files never go there, except a number you choose to prove exactly (below). What does:',
  'm.pp.chain.1':
    'the code of each batch of records (one code standing for every record in it), on Midnight and, through OpenTimestamps, on Bitcoin;',
  'm.pp.chain.2': 'a record’s own key and its date stamp, when you date it;',
  'm.pp.chain.3': 'a code made from a DNA report, when you date its pairing;',
  'm.pp.chain.4': 'which records are linked as parent and child, once both holders confirm;',
  'm.pp.chain.5': 'that a record has a license, an obligation or a lender’s claim on it, and when that changed;',
  'm.pp.chain.6': 'a lab’s public key, when it signs a certificate there;',
  'm.pp.chain.7':
    'what you choose to prove about a number: the limit and its direction or, if you prove it exactly, the number itself. A parentage result proves only that its conflict counts and SNPs compared are within ICAR’s limits; no genotype or count is published.',
  'm.pp.chain.p2':
    'Our fee sponsor anchors each batch. For the other steps, the app first shows a receipt listing exactly what that step makes public, and your browser sends it through our fee sponsor, which pays the fee. A code or key on its own says nothing about you, but anyone you give a check link to can follow what happens to that record on the network from then on.',

  'm.pp.ts.t': 'Timestamps, and checking on Bitcoin',
  'm.pp.ts.p1':
    'When our server takes a record’s proof code, it asks one or more timestamp authorities (independent services, some run by one person) for a timestamp on it, and on each batch. Each authority receives a code made from the proof code and the time it was asked, and can keep a log of them. Since proof codes appear on check pages, an authority could match its log to a check link. Anyone with a check link can read, to the second, when our server took that record’s proof code. For a record sealed with no signal, that is when your device next had signal.',
  'm.pp.ts.p2':
    'A record’s check page can check its Bitcoin stamp itself. Only when you press “Check on Bitcoin” does your browser ask two block explorers, mempool.space and blockstream.info, for block headers. They see your IP address, that a VeilCore batch is being checked, and which block; not the record. An evidence bundle does the same only if you tick “Include Bitcoin block headers”.',

  'm.pp.others.t': 'Who else handles data',
  'm.pp.others.p': 'These services do work for us, or are the public networks we use.',
  'm.pp.col.service': 'Service',
  'm.pp.col.does': 'What it does',
  'm.pp.col.gets': 'What it gets',
  'm.pp.others.vercel.n': 'Vercel',
  'm.pp.others.vercel.does': 'Hosts this website',
  'm.pp.others.vercel.gets':
    'Your IP address and the pages and files you load, including a check page’s address, which carries the record’s ID and proof code. Vercel keeps request logs.',
  'm.pp.others.railway.n': 'Railway',
  'm.pp.others.railway.does': 'Runs our registry, the fee sponsor, and the relay your browser reads Midnight through',
  'm.pp.others.railway.gets':
    'Your IP address and your requests to them (checking a record names its ID), and the registry’s stored data. Railway keeps request logs.',
  'm.pp.others.blockfrost.n': 'Blockfrost',
  'm.pp.others.blockfrost.does': 'Connects our fee sponsor and relay to Midnight',
  'm.pp.others.blockfrost.gets':
    'The transactions the fee sponsor sends, and the relay’s questions (what the app and check pages look up on Midnight). They come from our service, not from your browser.',
  'm.pp.others.midnight.n': 'The Midnight network',
  'm.pp.others.midnight.does': 'Dates batches, and records what your browser sends',
  'm.pp.others.midnight.gets': 'Public transactions (above)',
  'm.pp.others.ots.n': 'OpenTimestamps calendars',
  'm.pp.others.ots.does': 'Stamp batch codes on Bitcoin',
  'm.pp.others.ots.gets': 'Batch codes, from our registry',
  'm.pp.others.tsa.n': 'Timestamp authorities, such as FreeTSA and DigiCert',
  'm.pp.others.tsa.does': 'Timestamp each proof code and each batch',
  'm.pp.others.tsa.gets': 'A code made from each one, and when it was asked, from our registry',
  'm.pp.others.explorers.n': 'Bitcoin block explorers: mempool.space and blockstream.info',
  'm.pp.others.explorers.does':
    'Check Bitcoin stamps: our registry asks them for each batch, your browser only when you ask',
  'm.pp.others.explorers.gets':
    'Which block. From your browser, also your IP address and that a VeilCore batch is being checked.',
  'm.pp.others.backblaze.n': 'Backblaze B2',
  'm.pp.others.backblaze.does': 'Stores our backups',
  'm.pp.others.backblaze.gets': 'Encrypted files it can’t open',
  'm.pp.others.labsite.n': 'A lab’s own website',
  'm.pp.others.labsite.does': 'If a lab names its website, our registry checks daily that it lists the lab’s key',
  'm.pp.others.labsite.gets': 'A request from our registry. Nothing about you.',
  'm.pp.others.passkey.n': 'Your passkey provider, such as iCloud Keychain or Google Password Manager',
  'm.pp.others.passkey.does': 'Keeps the passkey you use with “Saved with VeilCore”, under its own terms',
  'm.pp.others.passkey.gets': 'That you have a passkey for veilcore.org. We never receive the passkey.',
  'm.pp.others.links':
    'Pages here link to other sites, such as Midnight explorers, GitHub and the documents we cite. Opening one is between you and that site.',

  'm.pp.dont.t': 'What we don’t do',
  'm.pp.dont.1': 'We don’t sell or rent your data, or share it for advertising.',
  'm.pp.dont.2': 'No ads, no analytics, no tracking pixels, no third-party scripts or fonts, and no cookies.',
  'm.pp.dont.3': 'VeilCore doesn’t vouch for any record, breeder or lab.',

  'm.pp.pay.t': 'Payments',
  'm.pp.pay.p':
    'This site takes no payments, and VeilCore never holds or moves money. Royalties are paid between the two parties, or through a payment partner they choose (its receipt is listed above). Before any payment feature is turned on here, we will update this page.',

  'm.pp.rights.t': 'Your choices',
  'm.pp.rights.see.t': 'See and download',
  'm.pp.rights.see.p':
    'On your records page, under More: “Export all records” downloads what this browser holds, and “Download your records and agreements from VeilCore” downloads your records, licenses and sharing choices as our server holds them. That download leaves out deliveries and their sample details, lab reports and signatures, royalty obligations, license invites, agreement messages, prove requests and per-record timestamps; open deliveries and lab reports from the delivery in the app. Your keys are in your backup file (Settings, “Download a copy”). For anything else, write to us.',
  'm.pp.rights.delete.t': 'Delete',
  'm.pp.rights.delete.p':
    '“Delete this record” on a record’s page removes its details, its locked copy and anything you shared from our server for good. “Stop saving with VeilCore” in Settings deletes your saved copy and every way in to it. For anything else, such as agreement messages, deliveries or everything at once, email hunter@veilcore.org with the IDs.',
  'm.pp.rights.keep.t': 'What can’t be deleted',
  'm.pp.rights.keep.p':
    'Anything on Midnight or Bitcoin. After a record is deleted, our server keeps its ID, its proof code, when it was deleted and a one-way digest of your holder key, so its check links can say it was deleted by its holder and nobody can reuse it. It also keeps, for good, each proof code a holder key has held, with that digest and when it was first held. Parent links and obligations already recorded stay, and so do signatures a lab already made. Backups made before the deletion keep their copy until they are removed. Copies other people already have, such as a check link you sent, stay with them.',
  'm.pp.rights.fix.t': 'Correct',
  'm.pp.rights.fix.p':
    'A sealed record can’t change. To correct one, you seal a new record that points to the old one.',
  'm.pp.rights.ask.t': 'Ask us',
  'm.pp.rights.ask.p':
    'Write to hunter@veilcore.org to ask what we hold about you, or to have it deleted or corrected. Include the IDs of the records it is about: our server finds records by their IDs or your holder key, not by your name.',

  'm.pp.changes.t': 'Changes to this policy',
  'm.pp.changes.p': 'We will post any change here, with its date, before it applies.',

  'm.pp.tech.t': 'Technical details',
  'm.pp.tech.storage':
    'Browser storage. Local storage: veilcore.holder.v1 (holder key), veilcore.vault.v1 (the key that locks your records), veilcore.records.v1 and veilcore.licenses.v1 (records and licenses), veilcore.record-keys.v1 (record keys), veilcore.attester.v1 (a lab’s signing key), veilcore.lab-deliveries.v1, veilcore.sent-codes.v1 and veilcore.opened-results.v1 (lab codes and opened reports), veilcore.prove-asks.v1 and veilcore.verifier-challenges.v1 (prove requests), veilcore.log-draft.v1 (an unfinished record), veilcore.device-only.v1 (documents kept on this device only), veilcore.outbox.v1 (saves waiting to be sent), veilcore.sponsor-ticket.v1 (a random ticket for the fee sponsor, not your holder key), veilcore.issuer-deals.v1 (license deal keys), veilcore.lender.v1 (a lender’s claims), veilcore.account-copy.v1 (the saved copy’s state), veilcore.role.v1 and veilcore.lang (settings). IndexedDB: veilcore-offline (records waiting to be dated, with the holder key), veilcore.account.v1 (the two keys made from your account key), veilcore.ask.job.v1 (Ask’s jobs). Cache Storage: veilcore-shell-<release> and veilcore-offline-meta (this site’s code). These are the main ones; the published code names every one.',
  'm.pp.tech.locking':
    'Locking. Records are locked in your browser with AES-GCM. Your holder key is stored as h1: and its SHA-256. The saved copy is AES-256-GCM, padded to a size bucket, and our server keeps only the SHA-256 of the tokens that read or change it. Lab reports are encrypted to your record’s key with age.',
  'm.pp.tech.network':
    'Connections. This site’s security policy lets a page connect only to veilcore.org itself, our registry, our fee sponsor and relay, mempool.space and blockstream.info. Only this site may ask for the camera, and your browser asks you first; the microphone and location are off.',
  'm.pp.tech.logs':
    'Logs. The registry has no request logger, and its test test/no-request-logging.test.mjs fails if one is added; its console shows start-up and error messages. Its rate limits count requests per address block (an IPv4 address, or an IPv6 /64 or /48) in memory. The fee sponsor counts per address block (/24 or /48) and per ticket in memory, forgets an address when its window passes, and logs one line per event with counters and outcomes only.',
  'm.pp.tech.backups':
    'Backups. Every day the registry’s database is compressed, encrypted with age to the operator’s public key and uploaded to a Backblaze B2 bucket under a new name each time; the locked lab report files go too. The bucket locks each copy for 30 days (Object Lock).',
} as const;
