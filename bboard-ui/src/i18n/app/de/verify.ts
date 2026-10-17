// German (Sie). DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md). Terms as in ../../de.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const verify = {
  'app.verify.report.notSaved': 'Der Inhaber hat keinen DNA-Bericht zu diesem Datensatz gespeichert.',
  'app.verify.report.pending':
    'Welcher DNA-Bericht gespeichert ist, wird gerade nicht angezeigt: Der Datensatz hat sich geändert, nachdem der Inhaber ihn freigegeben hat, und seine App hat die Aktualisierung noch nicht gesendet.',
  'app.verify.report.asOf': ' (zum Zeitpunkt, als dieser Link erstellt wurde)',
  'app.verify.report.staleNote':
    ' Dieser Link wurde erstellt, als eine andere Datei gespeichert war; diese Zeile betrifft die jetzt gespeicherte.',
  'app.verify.report.matches':
    'Der Inhaber hat einen DNA-Bericht zu diesem Datensatz gespeichert{asOf}. Seine Datei (SHA-256 {sha}) passt zum Laborbericht {lead}: Signatur in diesem Browser geprüft.{rest}{staleNote}',
  'app.verify.report.which': 'Der zu diesem Datensatz gespeicherte DNA-Bericht{asOf} (SHA-256 {sha})',
  'app.verify.report.replaced':
    '{which} wurde am {on} von seinem Labor durch einen korrigierten ersetzt. {tail}{staleNote}',
  'app.verify.report.withdrawn': '{which} wurde am {on} von seinem Labor zurückgezogen. {tail}{staleNote}',
  'app.verify.report.ownSha':
    'Der Inhaber hat eine Datei eines DNA-Berichts zu diesem Datensatz gespeichert{asOf} (SHA-256 {sha}). Keine Laborsignatur zu diesem Datensatz passt dazu, daher ist sie die eigene Angabe des Inhabers.{staleNote}',
  'app.verify.report.own':
    'Der Inhaber hat eine Datei eines DNA-Berichts zu diesem Datensatz gespeichert. Keine Laborsignatur zu diesem Datensatz passt dazu, daher ist sie die eigene Angabe des Inhabers.{staleNote}',
  'app.verify.report.unnamedSigned':
    'Der Inhaber hat einen DNA-Bericht zu diesem Datensatz gespeichert. Dieser Link nennt die Datei nicht, daher kann diese Seite nicht sagen, ob es der oben aufgeführte signierte Laborbericht ist.',
  'app.verify.report.unnamedWithdrawn':
    'Der Inhaber hat einen DNA-Bericht zu diesem Datensatz gespeichert. Dieser Link nennt die Datei nicht, und jeder zu diesem Datensatz signierte Laborbericht wurde von seinem Labor zurückgezogen, daher ist es die eigene Angabe des Inhabers.',
  'app.verify.report.unnamedNone':
    'Der Inhaber hat einen DNA-Bericht zu diesem Datensatz gespeichert. Kein Labor hat einen Laborbericht zu diesem Datensatz signiert, daher ist es die eigene Angabe des Inhabers.',
  'app.verify.kind.receipts.one': 'eine Empfangsbestätigung eines Labors',
  'app.verify.kind.receipts.other': '{count} Empfangsbestätigungen von Laboren',
  'app.verify.kind.reports.one': 'ein Laborbericht',
  'app.verify.kind.reports.other': '{count} Laborberichte',
  'app.verify.kind.statements.one': 'eine signierte Erklärung',
  'app.verify.kind.statements.other': '{count} signierte Erklärungen',
  'app.verify.kind.and': ' und ',
  'app.verify.withdrawnSignatures.one':
    'Eine Signatur wurde von ihrem Unterzeichner zurückgezogen und zählt daher nicht: {what}.',
  'app.verify.withdrawnSignatures.other':
    '{count} Signaturen wurden von ihren Unterzeichnern zurückgezogen und zählen daher nicht: {what}.',
  'app.verify.anchor.registryDate': '{date}, wie das VeilCore-Register meldet',
  'app.verify.anchor.noDate': 'nicht angegeben (das VeilCore-Register nennt für diese Transaktion kein Datum)',
  'app.verify.anchor.lookingUp': 'Diese Transaktion wird auf {network} nachgeschlagen…',
  'app.verify.anchor.twoIndexers': ' Zwei getrennte Midnight-Indexer gaben dieselbe Antwort.',
  'app.verify.anchor.checked':
    'Auf Midnight geprüft: Diese Stapelwurzel wurde durch die Transaktion {tx} in Block {block} am {at} geschrieben.{two}{test}',
  'app.verify.anchor.failed':
    'Auf Midnight nicht bestätigt: {reason}. Verlassen Sie sich nicht auf das Datum, das das Register meldet.',
  'app.verify.anchor.dateNotChecked': 'Das Datum ist {date}; hier nicht geprüft.',
  'app.verify.anchor.oneIndexer': 'Nur einer der zwei Midnight-Indexer hat geantwortet, und beide müssen es. {date}',
  'app.verify.anchor.noIndexer': 'Kein Midnight-Indexer war erreichbar. {date}',
  'app.verify.anchor.headingTest': 'Datumsstempel in einem Testnetzwerk geprüft: Übungsdaten, kein echtes Datum',
  'app.verify.anchor.headingChecked': 'Datumsstempel auf Midnight geprüft',
  'app.verify.anchor.headingFailed': 'Datumsstempel auf Midnight nicht bestätigt',
  'app.verify.anchor.eventTestTitle': 'Datumsstempel in einem Testnetzwerk geprüft',
  'app.verify.anchor.eventChecked':
    'Stapel {batch}: Diese Seite hat die Stapelwurzel in Transaktion {tx}, Block {block}, auf {where} gefunden.{test}',
  'app.verify.anchor.eventFailed':
    'Stapel {batch}: {reason}. Verlassen Sie sich nicht auf das Datum, das das Register meldet.',
  'app.verify.anchor.whyChecking': 'Diese Seite schlägt es auf Midnight nach.',
  'app.verify.anchor.whyUnreachable': 'Diese Seite konnte Midnight zum Prüfen nicht erreichen.',
  'app.verify.anchor.whyNotLooked': 'Diese Seite hat es nicht auf Midnight nachgeschlagen.',
  'app.verify.anchor.eventReportedTitle': 'Datumsstempel vom Register gemeldet',
  'app.verify.anchor.inTx': ' in Transaktion {tx}',
  'app.verify.anchor.eventReported':
    'Stapel {batch}: Das Register meldet, dass die Stapelwurzel auf {where}{tx} festgehalten wurde. Das Datum ist {date}. {why} Verlassen Sie sich nicht auf das Datum, bis es geprüft ist.{test}',
  'app.verify.anchor.summaryAdd': '{summary} Auf Midnight geprüft: der Datumsstempel der Stapelwurzel.',
  'app.verify.field.existence': 'Frühere Inhaberschaft (erst nach der Verankerung angezeigt)',
  'app.verify.field.attestation-status': 'Ob ein DNA-Bericht gespeichert ist',
  'app.verify.field.descent-clean': 'Status der Abstammung, wie das Register meldet',
  'app.verify.field.sealed-at': 'Wann versiegelt wurde (Uhr des Geräts des Inhabers)',
  'app.verify.field.parent-names': 'Namen der Elternsorten',
  'app.verify.field.breeding-method': 'Zuchtmethode',
  'app.verify.field.individual-id': 'Einzeltierkennung und ihr Kennzeichnungssystem',
  'app.verify.field.genetics': 'Die Genetik selbst – grundsätzlich nie offengelegt',
  'app.verify.sum.reports.one': 'ein Laborbericht',
  'app.verify.sum.reports.other': '{count} × Laborbericht',
  'app.verify.sum.receipts.one': 'eine Empfangsbestätigung eines Labors',
  'app.verify.sum.receipts.other': '{count} × Empfangsbestätigung eines Labors',
  'app.verify.sum.statements.one': 'eine signierte Erklärung',
  'app.verify.sum.statements.other': '{count} × signierte Erklärung',
  'app.verify.sum.what': ' ({list})',
  'app.verify.sum.comma': ', ',
  'app.verify.sum.bound': 'der Fingerabdruck des Links passt zu dem, den das Register meldet',
  'app.verify.sum.inBatch': 'der Datensatz ist in seinem Stapel',
  'app.verify.sum.signatures.one': 'eine Signatur dazu{what}',
  'app.verify.sum.signatures.other': '{count} Signaturen dazu{what}',
  'app.verify.sum.nothing':
    'Nichts auf dieser Seite konnte in diesem Browser geprüft werden: Alles ist die Meldung des VeilCore-Registers.',
  'app.verify.sum.list': '{rest} und {last}',
  'app.verify.sum.checked':
    'In diesem Browser geprüft: {list}. Alles andere ist die Meldung des VeilCore-Registers.{unbound}',
  'app.verify.sum.unbound':
    ' Dieser Link nennt keinen Fingerabdruck, daher nutzten diese Prüfungen den des Registers selbst, und nichts ist abgehakt.',
  'app.verify.heading.nothingSealed': 'Datensatz gefunden, nichts versiegelt',
  'app.verify.heading.unbound': 'Die Meldung des Registers: Dieser Link hat keinen Fingerabdruck zum Abgleichen',
  'app.verify.heading.checking': 'Wird geprüft…',
  'app.verify.heading.reported': 'Datumsstempel vom Register gemeldet, hier nicht geprüft',
  'app.verify.heading.pending': 'In einem Stapel, noch kein Datumsstempel',
  'app.verify.heading.none': 'Noch kein Datumsstempel',
  'app.verify.thisId': 'diese ID',
  'app.verify.kindReceipt': 'Empfangsbestätigung eines Labors für eine Probe',
  'app.verify.kindReport': 'Laborbericht (SHA-256 der Datei {sha})',
  'app.verify.kindStatement': 'Signierte Erklärung',
  'app.verify.forWhom': 'Für den Fingerabdruck, den das Register meldet: ',
  'app.verify.homeAria': 'VeilCore-Startseite',
  'app.verify.intro':
    'Diese Seite prüft einen VeilCore-Datensatz: einen Fingerabdruck der Beschreibung von genetischem Material, datiert, sobald er verankert ist, veröffentlicht ohne die Genetik. Die Prüfung ist kostenlos und braucht kein Konto. <link>Was ist VeilCore?</link>',
  'app.verify.checkingRecord': 'Datensatz wird geprüft',
  'app.verify.notFound': 'Kein Datensatz für {id} gefunden',
  'app.verify.notFoundText':
    'Dieser Prüflink passt zu keinem Datensatz im Register. Prüfen Sie, ob der Link vollständig und unverändert ist.',
  'app.verify.goHome': 'Zu veilcore.org',
  'app.verify.mismatch.title': 'Der Fingerabdruck dieses Links passt nicht zum Datensatz: nichts geprüft',
  'app.verify.mismatch.dontRely': 'Verlassen Sie sich nicht auf diese Seite.',
  'app.verify.mismatch.text':
    '{start}aber das Register meldet {reported} für {id}. Seine Antwort betrifft nicht den Datensatz, den der Link nennt, daher hat diese Seite nichts geprüft und zeigt nichts davon. Fragen Sie die Person, die Ihnen den Link gegeben hat, nach dem Datensatz selbst.',
  'app.verify.mismatch.linked': 'Dieser Link wurde für den Datensatz mit dem Fingerabdruck {fp} erstellt, ',
  'app.verify.mismatch.invalid':
    'Dieser Link enthält einen ungültigen Fingerabdruck (es sollten 64 Hexadezimalzeichen sein); er wurde vielleicht gekürzt oder verändert, ',
  'app.verify.mismatch.reportedFp': 'den Fingerabdruck {fp}',
  'app.verify.mismatch.noFp': 'keinen Fingerabdruck',
  'app.verify.mismatch.inLink': 'Fingerabdruck im Link: {fp}',
  'app.verify.mismatch.chip':
    'Die Antwort des Registers passt nicht zu diesem Link – nichts auf dieser Seite wurde geprüft',
  'app.verify.nameTyped': 'Name, wie vom Inhaber eingegeben: ',
  'app.verify.recordId': 'Datensatz-ID: {id}',
  'app.verify.noCommitment':
    'Dieser Datensatz enthält keine Festlegung, daher lässt sich nichts an ihm prüfen. Er existiert im Register, mehr nicht.',
  'app.verify.boundFact':
    'Dieser Link wurde für den Fingerabdruck {fp} erstellt, und das Register meldet denselben Fingerabdruck für diesen Datensatz{firstSeen}. Die erfassten Felder werden nicht geteilt, daher kann diese Seite ihn nicht neu berechnen.',
  'app.verify.firstStored': ', erstmals gespeichert am {date}',
  'app.verify.unboundFact':
    'Das Register meldet einen Datensatz mit dem Fingerabdruck {fp}{firstSeen}. Die erfassten Felder werden nicht geteilt, daher kann diese Seite ihn nicht neu berechnen.',
  'app.verify.noFpInLink':
    'Dieser Link nennt den Fingerabdruck des Datensatzes nicht, daher kann diese Seite nicht sagen, ob das Register mit dem Fingerabdruck dieses Datensatzes oder eines anderen geantwortet hat. Nichts unten ist abgehakt. Ein jetzt aus dem Datensatz erstellter Link endet auf ?fp=…; bitten Sie den Inhaber um einen.',
  'app.verify.noStampYet':
    'Noch kein Datumsstempel, soweit diese Seite erkennen kann: Hier gibt es keinen Nachweis, dass der Datensatz in einem Stapel mit Datumsstempel ist, also gibt es nichts zu prüfen.',
  'app.verify.batchBound':
    'In diesem Browser geprüft: Dieser Fingerabdruck ist in Stapel {batch}, und sein Pfad führt zur Stapelwurzel {root}….',
  'app.verify.batchUnbound':
    '{forWhom}Er ist in Stapel {batch}, und sein Pfad führt zur Stapelwurzel {root}…. Hier geprüft, aber gegen den eigenen Fingerabdruck des Registers.',
  'app.verify.rootReported':
    'Das Register meldet, dass diese Wurzel auf {network}{tx} festgehalten wurde. Ihr Datum: {date}.{notLooked}{test}',
  'app.verify.notLooked':
    ' Diese Seite hat sie nicht nachgeschlagen; tun Sie das, bevor Sie sich auf das Datum verlassen.',
  'app.verify.batchNoStamp': 'Der Stapel hat noch keinen Datumsstempel auf Midnight.',
  'app.verify.sigLine': '{forWhom}{kind}, Signatur in diesem Browser geprüft. {lead}.',
  'app.verify.sampleDetails': 'Probendetails, wie das Register meldet:',
  'app.verify.moreSigs': '{forWhom}Und {n} weitere Signaturen, jede in diesem Browser geprüft.',
  'app.verify.noneVerified':
    'Das Register meldet eine signierte Bestätigung, aber keine ließ sich in diesem Browser prüfen.',
  'app.verify.noneSigned':
    'Zu diesem Datensatz wurde weder eine Empfangsbestätigung noch ein Laborbericht eines Labors signiert.',
  'app.verify.badSigs.one':
    'Eine vom Register gemeldete Signatur lässt sich in diesem Browser nicht prüfen und zählt daher nicht.',
  'app.verify.badSigs.other':
    '{count} vom Register gemeldete Signaturen lassen sich in diesem Browser nicht prüfen und zählen daher nicht.',
  'app.verify.ownReceipt': '{lead}, verknüpft mit Ihrer Lieferung {tx}.',
  'app.verify.ownReceiptTail':
    ' Sie sehen das, weil die Pflanze in diesem Browser ist; wer Ihren Link erhält, sieht nur die Signaturzeile oben.',
  'app.verify.sharedTitle': 'Vom Inhaber geteilt · vom Register gemeldet',
  'app.verify.notGranted': 'Dieser Link fragte nach {list}, was der Inhaber nicht teilen wollte.',
  'app.verify.unavailable':
    'Dieser Link fragte nach Angaben über den Inhaber statt über diesen Datensatz ({list}). Darauf antwortet das Register nie.',
  'app.verify.footer': 'Fingerabdruck {fp} · nur die Angaben oben wurden gesendet · keine Genetik offengelegt',
  'app.verify.mark.checked': 'In diesem Browser geprüft',
  'app.verify.mark.reported': 'Hier nicht geprüft',
  'app.verify.mark.failed': 'Fehlgeschlagen oder zurückgezogen',
  'app.verify.mark.key': 'Was die Zeichen bedeuten',
  'app.verify.own.preview':
    'Frühere Inhaberschaft: erst angezeigt, wenn das Register den Stapel dieses Datensatzes als verankert meldet, und dann als Meldung des Registers.',
  'app.verify.own.anchored':
    'Frühere Inhaberschaft: Das Register meldet den Stapel dieses Datensatzes als auf {network} verankert.{found}{test}',
  'app.verify.own.found':
    ' Diese Seite hat diesen Datumsstempel selbst auf Midnight gefunden (oben). Er datiert den Datensatz, nicht, wer ihn hielt.',
  'app.verify.own.notConfirmed': ' Diese Seite hat das nicht auf der Chain bestätigt.',
  'app.verify.own.notAnchored':
    'Frühere Inhaberschaft: noch nicht verankert, daher beruht sein Datum auf den Aufzeichnungen dieses Registers.',
  'app.verify.dna.saved': 'Der Inhaber hat einen DNA-Bericht zu diesem Datensatz gespeichert.',
  'app.verify.lineage.intact':
    'Das Register meldet die Abstammung als lückenlos – eine ununterbrochene Kette zurück zum versiegelten Datensatz. Diese Seite hat das nicht geprüft.',
  'app.verify.lineage.notChecked':
    'Abstammung: auf dieser Seite nicht geprüft. Das Register verfolgt die Abstammung für einen geteilten Link nicht.',
  'app.verify.sealedAt':
    'Versiegelt, nach der Uhr des Geräts des Inhabers: {date}. Das ist die eigene Angabe des Inhabers.{first}',
  'app.verify.firstStoredBy': ' Erstmals von diesem Register gespeichert: {date}.',
  'app.verify.parents': 'Eltern, wie vom Inhaber angegeben: {list}',
  'app.verify.noParents': 'Keine Eltern erfasst.',
  'app.verify.method': 'Zuchtmethode, wie vom Inhaber angegeben: {method}',
  'app.verify.noMethod': 'Keine Zuchtmethode erfasst.',
  'app.verify.sharedNothing': 'Der Inhaber hat nichts über die Grundangaben oben hinaus geteilt.',
  'app.verify.notShared': 'Vom Inhaber nicht geteilt: {list}.',
  'app.verify.alwaysShown':
    'Immer angezeigt: der Sortenname, die Datensatz-ID, sein Fingerabdruck ({fp}), wann das Register ihn zuerst gespeichert hat, und was diese Seite über seinen Stapel und signierte Bestätigungen (eine Empfangsbestätigung eines Labors, einen Laborbericht) prüfen konnte.',
  'app.verify.ex.title': 'Beispiel: ein erfundener Datensatz.',
  'app.verify.ex.intro':
    'Das zeigt, wie die Prüfseite eines Datensatzes aussieht, mit einer Anmerkung unter jeder Zeile. Hier wurde nichts nachgeschlagen oder geprüft.',
  'app.verify.ex.status': 'Beispiel · in einem versiegelten Stapel · Verankerung gemeldet',
  'app.verify.ex.name': 'Harbour Mist (Beispiel)',
  'app.verify.ex.fact1':
    'Dieser Link wurde für den Fingerabdruck 3f9a0c41e2b7… erstellt, und das Register meldet denselben Fingerabdruck für diesen Datensatz.',
  'app.verify.ex.note1':
    'Der Fingerabdruck steht im Link selbst, daher lässt sich die Seite nicht dazu bringen, die Prüfungen eines anderen Datensatzes anzuzeigen.',
  'app.verify.ex.fact2':
    'In diesem Browser geprüft: Dieser Fingerabdruck ist in Stapel 41, und sein Pfad führt zur Stapelwurzel.',
  'app.verify.ex.note2':
    'Bei einem echten Datensatz hat diese Zeile einen Haken: Ihr eigener Browser prüft, dass der Datensatz im Stapel ist.',
  'app.verify.ex.fact3':
    'Auf Midnight geprüft: Diese Stapelwurzel wurde durch die Transaktion 9c41e0…b27d in Block 2973563 am 2026-10-11 14:03 UTC geschrieben.{test}',
  'app.verify.ex.note3':
    'Diese Transaktion auf {network} datiert den Datensatz. Bei einem echten Datensatz fragt Ihr Browser einen Midnight-Indexer danach und prüft, dass sie diese Stapelwurzel in den VeilCore-Vertrag geschrieben hat. Antwortet kein Indexer, sagt die Zeile das, und das Datum ist nur die Meldung des Registers: Schlagen Sie die Transaktion in einem Midnight-Explorer wie midnightexplorer.com nach, bevor Sie sich darauf verlassen.',
  'app.verify.ex.fact4':
    'Laborbericht (SHA-256 der Datei 7c1e04d2…9b3a51), Signatur in diesem Browser geprüft. Signiert von einem Schlüssel namens „Example Lab“ (Name nicht geprüft).',
  'app.verify.ex.note4':
    'Ein Labor kann seine Empfangsbestätigung für eine Probe und seinen Laborbericht mit seinem eigenen Schlüssel signieren. Jede Zeile sagt, welches von beiden es ist. Die Seite prüft die Signatur; ob der Schlüssel zu einem Labor gehört, dem Sie vertrauen, entscheiden Sie.',
  'app.verify.ex.fact5':
    'Der Inhaber hat einen DNA-Bericht zu diesem Datensatz gespeichert. Seine Datei (SHA-256 7c1e04d2…9b3a51) passt zum Laborbericht, signiert von einem Schlüssel namens „Example Lab“ (Name nicht geprüft): Signatur in diesem Browser geprüft.',
  'app.verify.ex.note5':
    'Der Inhaber wählt, welche Angaben hier erscheinen. Alles nicht Geteilte wird als nicht geteilt aufgeführt.',
  'app.verify.ex.marks':
    '✓ Diese Seite hat die Zeile selbst geprüft, in Ihrem Browser. ○ Das VeilCore-Register oder der Inhaber meldet es; diese Seite hat es nicht geprüft. ⊗ Eine Prüfung ist fehlgeschlagen, oder ein Labor hat zurückgezogen, was es signiert hat.',
  'app.verify.ex.checkReal': 'Einen echten Datensatz prüfen',
  'app.verify.ex.what': 'Was ist VeilCore?',
  'app.verify.noNameInLink': 'Der Inhaber hat den Namen nicht in diesen Link aufgenommen.',
  'app.verify.field.name': 'Sein Name',
  'app.verify.nameShared': 'Sein Name, vom Inhaber für alle mit der ID sichtbar gemacht: {name}',
  'app.verify.noNameShared': 'Kein Name eingetragen.',
  'app.verify.dnaCheck.help':
    'Haben Sie die Datei des DNA-Berichts, die der Inhaber Ihnen geschickt hat? Wählen Sie sie aus, um zu prüfen, ob es die mit diesem Datensatz gespeicherte ist. Die Datei wird in diesem Browser gelesen und nirgendwohin gesendet.',
  'app.verify.dnaCheck.button': 'Datei eines DNA-Berichts prüfen',
  'app.verify.dnaCheck.reading': 'Datei wird gelesen…',
  'app.verify.dnaCheck.tooBig': 'Diese Datei ist zu groß, um sie hier zu prüfen.',
  'app.verify.dnaCheck.matches': '{file} ist der DNA-Bericht, den der Inhaber mit diesem Datensatz gespeichert hat.',
  'app.verify.dnaCheck.differs': '{file} ist nicht der mit diesem Datensatz gespeicherte DNA-Bericht.',
  'app.verify.dnaCheck.noSalt':
    'Dieser Link enthält nicht, was zum Prüfen der Datei des DNA-Berichts nötig ist. Bitten Sie den Inhaber um seinen Prüflink und die Datei.',
  'app.verify.report.fileMatches': 'Die gewählte Datei ist die gespeicherte.',
  'app.verify.report.fileDiffers': 'Die gewählte Datei ist nicht die gespeicherte.',
  'app.verify.report.chooseFile':
    'Der Inhaber hat einen DNA-Bericht zu diesem Datensatz gespeichert. Um zu sehen, welchen, wählen Sie die Datei, die der Inhaber Ihnen geschickt hat: Diese Seite prüft sie mit dem, was in diesem Link steht, gegen den Datensatz.',
  'app.verify.report.noSaltInLink':
    'Der Inhaber hat einen DNA-Bericht zu diesem Datensatz gespeichert. Welche Datei es ist, lässt sich nur mit dem eigenen Prüflink des Inhabers und der Datei prüfen.',
} satisfies Partial<AppTranslation>;
