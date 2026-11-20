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
  'app.offline.goesBySelf': 'No signal now. It goes by itself when you’re back online, and is dated then.',
  'app.offline.bar':
    'No signal. You can still make and seal records here; each is dated when it’s sent. Checking, sharing and date stamps wait until you’re back online.',
  'app.offline.updated': 'A newer version of VeilCore is ready.',
  'app.offline.reload': 'Reload',
  'app.offline.stampWaits': 'No signal. The key date stamp waits, and starts by itself when you’re back online.',

  'app.install.title': 'Use VeilCore with no signal',
  'app.install.text':
    'Add VeilCore to your Home Screen. It then opens with no signal: you can make and seal records, and each is dated when you’re back online.',
  'app.install.button': 'Add to Home Screen',
  'app.install.iosSteps': 'On iPhone or iPad: in Safari, tap Share, then “Add to Home Screen”.',
  'app.install.iosEmpty':
    'The Home Screen app keeps its own storage, apart from Safari, so it opens empty. Open it once with signal and get your records back there (Face ID or your backup file). Let anything still waiting in Safari send first.',
  'app.install.iosKeep':
    'On the Home Screen, VeilCore isn’t cleared the way Safari clears sites you haven’t opened for 7 days. Keep your backup anyway.',
  'app.install.ready': 'This browser keeps a copy of VeilCore, so it opens here with no signal.',
  'app.install.dismiss': 'Not now',

  'app.instant.pending': 'Timestamped {time} by {tsa} — Midnight date follows in the next batch.',
  'app.instant.also': 'Also timestamped {time} by {tsa}.',
  'app.instant.asking': 'Getting a timestamp from a timestamp authority…',
  'app.instant.fact':
    'Timestamp from {tsa}: {time}. This page checked its signature on the proof code. It shows the proof code existed by then, nothing earlier.',
  'app.verify.who.tsa': 'A timestamp ({tsa})',
  'app.verify.who.tsa.checked': '{time}, signed by the timestamp authority. This page checked the signature.',
  'app.verify.who.tsa.unbound':
    '{time}, signed by the timestamp authority. This page checked the signature, but the link you were sent carries no proof code to match it with.',
};
