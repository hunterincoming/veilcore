// Working with no signal, and the instant timestamp (docs/offline.md, 19 Nov 2026).
//
// The one rule every line here keeps: a record sealed with no signal is dated when its proof
// code reaches VeilCore, never earlier. The time on the phone is the phone's own clock, said as
// such, and is not a date anyone can check. A timestamp authority's timestamp shows the proof
// code existed by its time, nothing earlier; the Midnight date still comes with the batch.
// SPDX-License-Identifier: Apache-2.0

export const offline = {
  'app.offline.sealedHere.phone': 'Sealed on this phone at {time} (your phone’s clock). Dated when it’s sent.',
  'app.offline.sealedHere.computer': 'Sealed on this computer at {time} (your computer’s clock). Dated when it’s sent.',
  'app.offline.short': 'Sealed {time}, dated when sent',
  'app.offline.goesBySelf': 'Its proof code goes by itself when you’re back online.',
  'app.offline.bar':
    'No signal. You can still make and seal records; each gets its date once it’s sent. Checking, sharing, lab hand-overs and key date stamps wait for signal.',
  'app.offline.updated': 'A newer VeilCore is ready. Reload when you’re between records; nothing sealed is lost.',
  'app.offline.reload': 'Reload',
  'app.offline.stampWaits': 'Your key’s date stamp waits, and starts by itself when you’re back online.',

  'app.install.title': 'Use VeilCore with no signal',
  'app.install.text':
    'Add VeilCore to your Home Screen. It then opens with no signal: you can make and seal records, and each gets its date once it’s sent.',
  'app.install.button': 'Add to Home Screen',
  'app.install.iosSteps': 'On iPhone or iPad: in Safari, tap Share, then “Add to Home Screen”.',
  'app.install.iosEmpty':
    'First, with signal, let anything waiting in Safari send. The Home Screen icon has its own storage, so it opens empty; your records are still safe in Safari. Open the icon with signal and bring them back with Face ID or your backup file. From then on, use the icon: records made in Safari won’t show there.',
  'app.install.iosKeep':
    'Safari can erase a site you haven’t opened for 7 days. The Home Screen icon is kept. Keep your backup anyway.',
  'app.install.ready':
    'This browser keeps the VeilCore app, so it opens here with no signal. Your records still need your backup.',
  'app.install.dismiss': 'Not now',

  'app.instant.pending':
    'Timestamped {time} by {tsa} (as its key names it) — the date on Midnight, the blockchain, follows in the next batch.',
  'app.instant.also': 'Also timestamped {time} by {tsa} (as its key names it).',
  'app.instant.asking': 'Getting a timestamp from a timestamp authority…',
  'app.instant.fact':
    'Timestamp from a key named {tsa} (name not checked): {time}. This page checked its signature on the proof code. It shows the proof code existed by then; it says nothing about before.',
  'app.verify.who.tsa': 'A timestamp ({tsa})',
  'app.verify.who.tsa.checked':
    '{time}. This page checked its signature. The name is the key’s own; who issued the key isn’t checked here.',
  'app.verify.who.tsa.unbound':
    '{time}. This page checked its signature, but the link you were sent carries no proof code to match it with. Ask the sender for the full check link.',
  'app.offline.goesOnOpen': 'Its proof code goes the next time you open VeilCore with signal.',
};
