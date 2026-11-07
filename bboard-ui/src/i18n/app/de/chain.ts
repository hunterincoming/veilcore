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
  'app.chain.details': 'Details',
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
  // components/chain/FamilyOnChain.tsx: a record's parents and offspring on Midnight.
  'app.family.title': 'Familie auf Midnight',
  'app.family.intro':
    'Abstammung, der beide Inhaber zugestimmt haben, auf der Chain. Sie erlaubt jedem, die Linie einer Pflanze zu prüfen, und trägt die Nachkommen-Lizenzgebühr eines Elternteils zu dessen Nachkommen. Eine bestätigte Verknüpfung ist öffentlich und dauerhaft: Sie lässt sich nicht zurücknehmen, und Lizenzgebühren, die der Inhaber des Elternteils später übernimmt, erscheinen ebenfalls in der Linie dieses Datensatzes.',
  'app.family.reading': 'Die Chain wird gelesen…',
  'app.family.parents': 'Eltern:',
  'app.family.noneConfirmed': 'keine bestätigt',
  'app.family.offspring': 'Nachkommen:',
  'app.family.waitingParent':
    'Warten, bis {name} bestätigt, ein Elternteil zu sein. Der Inhaber sieht das auf der Seite seines Datensatzes.',
  'app.family.theRecord': 'der Datensatz {key}',
  'app.family.takeBack': 'Zurücknehmen',
  'app.family.putOnChain': '„{name}“ als Elternteil auf Midnight eintragen',
  'app.family.pasteLabel': 'Ein Elternteil in fremder Hand: dessen Prüflink oder On-Chain-Schlüssel',
  'app.family.nameIt': 'Benennen',
  'app.family.namesParent':
    '{who} benennt diesen Datensatz als Elternteil. Bestätigen Sie nur, wenn er wirklich von dieser Pflanze stammt. Die Bestätigung ist öffentlich und dauerhaft, und alles, was auf dieser Pflanze geschuldet ist, jetzt oder später, erscheint in seiner Linie.',
  'app.family.confirm': 'Bestätigen',
  'app.family.confirmQ':
    'Bestätigen, dass diese Pflanze ein Elternteil von {who} ist? Bestätigen Sie nur einen Datensatz, von dem Sie wissen, dass er von ihr stammt. Das ist öffentlich und dauerhaft: Seine Linie und alles, was auf dieser Pflanze jetzt oder später geschuldet ist, erscheinen darauf.{fixes}',
  'app.family.confirmFixes':
    ' Sobald ein Datensatz bestätigte Nachkommen hat, lassen sich seine eigenen Eltern nicht mehr ändern.',
  'app.family.notConfirmed': 'Nicht bestätigt.',
  'app.family.noParentHere': 'Dieser Browser hält den Datensatz dieses Elternteils nicht.',
  'app.family.step1': 'Elternteil auf Midnight benennen (1 von 2)…',
  'app.family.step2': 'Vom Elternteil bestätigen (2 von 2)…',
  'app.family.readError': 'Die Chain konnte nicht gelesen werden: {error}',
  'app.family.named': '„{name}“ (Schlüssel {key})',
  'app.family.namedKey': 'der Datensatz mit Schlüssel {key}',
} satisfies Partial<AppTranslation>;
