// German (Sie). DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md). Terms as in ../../de.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const chain = {
  'app.chain.inAboutMinutes.one': 'in etwa {count} Minute',
  'app.chain.inAboutMinutes.other': 'in etwa {count} Minuten',
  'app.chain.inAFewMinutes': 'in ein paar Minuten',
  'app.chain.txParen': ' (Transaktion {tx})',
  'app.chain.mayHaveGoneOut':
    'Möglicherweise wurde es schon gesendet{tx}. Versuchen Sie es erst wieder, wenn diese Transaktion im Netzwerk geprüft wurde.',
  'app.chain.nothingSent': ' Es wurde nichts gesendet.',
  'app.chain.unreachable': 'Das Netzwerk war nicht erreichbar.{nothingSent} Versuchen Sie es {when} erneut.',
  'app.chain.didntGoThrough': 'Das hat nicht geklappt.{nothingSent} Versuchen Sie es {when} erneut.',
  'app.chain.didntGoThroughBecause': 'Das hat nicht geklappt: {reason}.{nothingSent}',
  'app.chain.stampMayHaveGoneOut':
    'Ihr Datumsstempel wurde möglicherweise schon gesendet{tx}. Ihre Pflanze ist gespeichert. Versuchen Sie es erst wieder, wenn diese Transaktion im Netzwerk geprüft wurde.',
  'app.chain.stampUnreachable':
    'Das Netzwerk war nicht erreichbar. Ihre Pflanze ist gespeichert. Versuchen Sie es {when} erneut oder setzen Sie den Datumsstempel später.',
  'app.chain.stampDidntGoThrough':
    'Der Datumsstempel hat nicht geklappt. Ihre Pflanze ist gespeichert. Versuchen Sie es {when} erneut oder setzen Sie den Datumsstempel später.',
  'app.chain.progress.reading': 'Vertrag wird aus dem Netzwerk gelesen…',
  'app.chain.progress.checkingFiles': 'Die Beweisdateien dieser Website werden mit dem Vertrag abgeglichen…',
  'app.chain.progress.preparing': 'Die Transaktion wird auf Ihrem Gerät vorbereitet…',
  'app.chain.progress.provingPhone':
    'Der Beweis wird auf Ihrem Gerät erstellt. Auf einem Handy kann das eine Minute dauern…',
  'app.chain.progress.waiting': 'Warten, bis das Netzwerk sie aufnimmt (meist unter einer Minute)…',
  'app.chain.progress.proving': 'Der Beweis wird auf Ihrem Gerät erstellt…',
  'app.chain.progress.work': 'Eine kleine Rechenaufgabe zeigt, dass hier ein Mensch ist und kein Skript…',
  'app.chain.progress.sending': 'Wird an VeilCore gesendet, das die Netzwerkgebühr zahlt…',
  'app.chain.progress.keys': 'Die Beweisschlüssel werden heruntergeladen (nur beim ersten Mal)…',
  'app.chain.progress.params': 'Die öffentlichen Parameter werden heruntergeladen (nur beim ersten Mal)…',
  'app.chain.progress.answer': 'Die Antwort wird zurückgesendet…',
  'app.chain.progress.readingAnswer': 'Die Antwort wird aus dem Netzwerk gelesen…',
  'app.chain.working': 'In Arbeit…',
  'app.chain.txLine': '{label}: Transaktion {tx} · Block {block}',
} satisfies Partial<AppTranslation>;
