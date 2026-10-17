// The record app in English: Show someone (components/wizard/Step5ProveDisclosure.tsx,
// veilcore/disclosure.ts) and proving you hold a plant by link (components/flow/ProvePage.tsx,
// components/chain/*). Source text; see log.ts.
// SPDX-License-Identifier: Apache-2.0

export const prove = {
  'app.prove.share.checkingNow': 'Checking what is shared now…',
  'app.prove.share.saveNote': ' “Get the link” saves the switches above, and the check page then shows exactly that.',
  'app.prove.share.couldntRead': 'Couldn’t read what is shared now from the registry.{save}',
  'app.prove.share.onlyBasicsUnsaved':
    'Shared now: only the basics. The switches above are a suggestion and aren’t saved yet.{save}',
  'app.prove.share.semicolon': '; ',
  'app.prove.share.onlyBasics': 'only the basics',
  'app.prove.share.sharedNow': 'Shared now: {now}.{differs}',
  'app.prove.share.differs': ' The switches above differ from that.{save}',
  // flow/ProvePage.tsx: a prove link.
  'app.prove.yourRequest': 'Your request',
  'app.prove.youAskedNamed':
    "You asked the holder of <b>{name}</b> to prove they hold it. Send them this link if you haven't yet.",
  'app.prove.youAsked':
    "You asked the holder of this plant to prove they hold it. Send them this link if you haven't yet.",
  'app.prove.openCheckPage': "Open the plant's check page",
  'app.prove.opening': 'Opening the request…',
  'app.prove.ended': 'This request has ended',
  'app.prove.cantOpen': 'Can’t open this right now',
  'app.prove.expired':
    'It has expired (requests last a week), or the link is not complete. Ask them to send a new one.',
  'app.prove.missingPart': 'This link is missing its last part',
  'app.prove.missingPartText':
    'The answer can only go back with the whole link. Open the link exactly as they sent it, or ask them to send it again.',
  'app.prove.someoneWants': 'Someone wants you to prove you hold a plant',
  'app.prove.noPlantsHere':
    'Your plants aren’t on this phone or computer. Open this link where you keep them, or get them back here from your backup file, then open the link again.',
  'app.prove.notThisPlant':
    'None of the plants here is the one they asked about. If you keep it on another phone or computer, open this link there. If you only have it in a backup file, restore it here, then open the link again.',
  'app.prove.getBack': 'Get my plants back from a backup',
  'app.prove.done': 'Done',
  'app.prove.doneText':
    "They'll see the answer on their page. Nothing about the plant was sent: only proof that you hold its record.",
  'app.prove.thePlant': 'the plant',
  'app.prove.didntSend': "Proved, but the answer didn't send",
  'app.prove.sendInstead': '({why}.) Send them this instead; they can paste it under "Do it by hand":',
  'app.prove.copy': 'Copy',
  'app.prove.title': 'Prove you hold {name}',
  'app.prove.thisPlant': 'this plant',
  'app.prove.askedBy':
    "Asked by someone who says they're <b>“{asker}”</b>. <muted>VeilCore hasn't checked that.</muted>",
  'app.prove.askedAnon': "Someone asked you to prove it. They didn't give a name.",
  'app.prove.whatSends':
    "<b>What this sends:</b> only proof that you hold this plant's record, put on the test network. No name, no genetics, nothing about your other plants.",
  'app.prove.testOnly': 'Proving works on the test version only right now.',
  'app.prove.answering': "Answering tells whoever sent you this link that you hold this plant's record.",
  'app.prove.proving': 'Proving…',
  'app.prove.proveIt': 'Prove it',
  'app.prove.fewMinutes': 'It can take a few minutes. Test network: practice only.',
  // chain/VerifierChallengePanel.tsx: asking someone to prove they hold a record.
  'app.prove.ask.cantAsk': "Can't ask for a proof from this link",
  'app.prove.ask.refused': '{reason}. A proof made with it would say nothing about this record.',
  'app.prove.ask.noLink': 'No link was made: {error}.',
  'app.prove.ask.title': 'Ask them to prove they hold it',
  'app.prove.ask.intro':
    "You send them a link. They open it and tap Prove it. The answer shows up here. This page checks the answer on the network itself, through a Midnight indexer (on the test site, reached through VeilCore's relay). For a decision that matters, check the transaction on a second indexer. Test network only.",
  'app.prove.ask.bound':
    'This record named its own key when it was sealed. This page checked that the key in your link is that one.',
  'app.prove.ask.older':
    'Older record: key not bound to this record. A proof shows control of the key the link names, which the holder chose.',
  'app.prove.ask.newRequest': 'Make a new request',
  'app.prove.ask.name': 'Your name or business (optional)',
  'app.prove.ask.nameHelp': "They'll see it, marked as not checked by VeilCore.",
  'app.prove.ask.making': 'Making the link…',
  'app.prove.ask.make': 'Make a link to send them',
  'app.prove.ask.byHand': 'Do it by hand instead',
  'app.prove.hand.intro':
    'The link you were sent names an on-chain identity for this record ({id}…). Make a challenge, send it to them, and paste back the transaction id they give you. The answer must come from that identity, answer your challenge, and the identity must be anchored and current. {bound}',
  'app.prove.hand.bound':
    'The record named this key when it was sealed, and this page checked that against its proof code.',
  'app.prove.hand.older':
    'Older record: key not bound to this record. That this identity belongs to it is the holder’s statement.',
  'app.prove.hand.make': 'Make a challenge',
  'app.prove.hand.yourChallenge': 'Your challenge (send it to the holder; it works once, in this tab):',
  'app.prove.hand.txId': 'The holder’s transaction id',
  'app.prove.hand.check': 'Check the answer',
  'app.prove.hand.acceptedKey':
    'Accepted: whoever sent that transaction controls this record’s own key, and answered your challenge.',
  'app.prove.hand.acceptedSecret':
    'Accepted: whoever sent that transaction holds this identity’s secret, and answered your challenge.',
  'app.prove.hand.notAccepted': 'Not accepted: {reason}.',
  'app.prove.hand.anchorYes': ' The anchor transaction the holder gave does create this identity.',
  'app.prove.hand.anchorNo': ' The anchor transaction the holder gave could not be confirmed.',
  // chain/key-reason-words.ts: veilcore/key-binding.ts's reasons, word for word.
  'app.prove.key.leavesOut':
    'This record names its own key, but this link leaves out what’s needed to check it. Ask the holder for a new link',
  'app.prove.key.noFp': 'This link’s proof code doesn’t match the record, so its key can’t be checked against it',
  'app.prove.key.notThis': 'The key in this link isn’t the one this record names',
  // chain/ProveWatch.tsx and veilcore/prove-relay.ts keyStampWords.
  'app.prove.watch.shareAsker':
    '{asker} is asking you to prove you hold this plant on VeilCore. Open this link: {link}',
  'app.prove.watch.share': 'I’m asking you to prove you hold this plant on VeilCore. Open this link: {link}',
  'app.prove.watch.sendIt': 'Send it',
  'app.prove.watch.copyLink': 'Copy link',
  'app.prove.watch.key': 'Key: ',
  'app.prove.watch.confirmed': 'Confirmed',
  'app.prove.watch.controlsOwn':
    'Whoever answered controls this record’s own key, right now. The record named that key when it was sealed, so it can’t be swapped.',
  'app.prove.watch.controlsLink': 'Whoever answered controls the key named in this link, right now.',
  'app.prove.watch.stampNotConfirmed': "The key's date stamp named in the link could not be confirmed.",
  'app.prove.watch.notWho': "It doesn't show who they are or who bred the plant.",
  'app.prove.watch.olderRecord': 'Older record: key not bound to this record.',
  'app.prove.watch.holderStatement':
    "That this key belongs to this plant's record is the holder's statement for now. It doesn't show who they are or who bred the plant.",
  'app.prove.watch.checkedAt':
    'Checked {when} on the test network, which can be reset: practice only, no evidential weight.',
  'app.prove.watch.expired': 'This request expired without an answer. Make a new one.',
  'app.prove.watch.checking': 'An answer came in. Checking it on the network…',
  'app.prove.watch.pending': 'An answer came in. The network hasn’t shown it yet, so this keeps checking.',
  'app.prove.watch.unreachable': 'Can’t reach VeilCore right now. Still trying.',
  'app.prove.watch.waiting':
    'Waiting for them to prove it. You can close this page: to see the answer, open the link you sent them, in this browser.',
  'app.prove.watch.refused.one': 'An answer came back that didn’t check out: {reason}',
  'app.prove.watch.refused.other': '{count} answers didn’t check out: {reason}',
  'app.prove.watch.stampedYour': 'Your plant’s key was date stamped on {when}. That dates the key, not the record.',
  'app.prove.watch.stampedThat': 'That key was date stamped on {when}. That dates the key, not the record.',
  'app.prove.watch.stampedThisEarlier':
    'This plant’s key was date stamped on the network earlier. That dates the key, not the record.',
  'app.prove.watch.stampedThatEarlier':
    'That key was date stamped on the network earlier. That dates the key, not the record.',
  // chain/ProveOwnershipPanel.tsx: "Someone asked me to prove I hold it" on the plant page.
  'app.prove.own.title': 'Prove you hold this plant’s key (test network)',
  'app.prove.own.stampFirst':
    'Set up proof you hold it first: press “Set up proof you hold it” on the plant’s page. The proof is about the plant’s on-chain identity, which that step creates.',
  'app.prove.own.intro':
    'The person checking makes a challenge on the record’s verify page and sends it to you. You answer it here; your browser proves you hold the record’s secret without revealing it, and you send them the transaction id. Together with the date stamp, that shows the key existed by block {block} and that you control it now.',
  'app.prove.own.copyChecker': 'Copy the checker’s link (it names the record’s on-chain identity)',
  'app.prove.own.tryIt': 'Try it yourself: open it as the checker',
  'app.prove.own.challenge': 'The checker’s challenge (64 characters)',
  'app.prove.own.answer': 'Answer the challenge',
  'app.prove.own.done': 'Done. Send the checker this transaction id:',
  // wizard/Step5ProveDisclosure.tsx: Show someone.
  'app.prove.share.notFound': 'Record not found.',
  'app.prove.share.notSaved': 'Your choice was not saved, so no link was made: {error}.',
  'app.prove.share.title': 'Choose what a stranger sees',
  'app.prove.share.intro':
    'Anyone who has this record’s id — from a link you send, the QR code on its certificate, or a message someone forwards — can open its verify page. Pick which facts that page shows. What you pick is sent to VeilCore’s registry unlocked, so the page can show it. The choice is saved with the record on VeilCore’s registry and applies to everyone with the id; you can change it here at any time, and links already sent then show the new choice.',
  'app.prove.share.shownOn': 'Shown on the verify page',
  'app.prove.share.strangerSees': 'What a stranger with the id will see',
  'app.prove.share.reportOn': 'With “Whether a DNA report is saved” on, the check page says so.',
  'app.prove.share.reportOff': 'With “Whether a DNA report is saved” off, the check page says nothing about it.',
  'app.prove.share.yourLink': 'Your link',
  'app.prove.share.savedOn': 'Saved on the registry',
  'app.prove.share.savedText':
    "Anyone who opens this link, or has this record's id any other way, sees the facts in the preview and nothing else; the registry does not send the rest, and editing the link cannot add to it. The genetics are never disclosed. This choice controls what the verify page shows. Proving one hidden value (a marker, a range, or that two varieties differ) without showing the rest is done by VeilCore's claims contract.",
  'app.prove.share.letThemAsk': 'Let them check the date stamp and ask me to prove I hold it',
  'app.prove.share.theLink': 'The link',
  'app.prove.share.openTheirs': "Open what they'll see",
  'app.prove.share.saving': 'Saving…',
  'app.prove.share.getLink': 'Get the link',
  // Step5ProveDisclosure.tsx: the server shows another choice (round 3)
  'app.prove.share.differs.text':
    'VeilCore’s server shows: {server}. Your choice, kept with the record: {mine}. Which should strangers see?',
  'app.prove.share.differs.keepMine': 'Keep my choice',
  'app.prove.share.differs.useServers': 'Use what the server shows',
  'app.prove.share.differs.failed': 'VeilCore didn’t store your choice. Try again.',
  'app.prove.share.nameInLink': 'Put the name in the link',
  'app.prove.share.nameInLinkHelp':
    'If on, everyone you send this link to sees the name, and so does anyone they pass it on to.',
  'app.prove.share.nameWarning': 'If on, anyone with the record ID sees the name.',
};
