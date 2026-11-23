// German (Sie): what a failure says (../en/errors.ts). Terms as in ../../de.ts and
// docs/i18n-glossary.md: Smart Contract for the on-chain contract, Beleg for a claim about a
// number, Anspruch for a lender's claim, Register for the registry.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const errors = {
  'app.err.unknown': 'Etwas ist schiefgelaufen. Versuchen Sie es erneut.',
  'app.err.technical': 'Etwas ist schiefgelaufen. Technische Details (auf Englisch): {detail}',
  'app.err.technicalReason': 'ein technisches Problem (Details auf Englisch: {detail})',

  'app.err.registry.unexpected': 'Unerwartete Antwort vom Register.',
  'app.err.registry.notAsExpected': 'Das Register hat nicht wie erwartet geantwortet.',
  'app.err.registry.answered': 'das Register hat mit {status} geantwortet',
  'app.err.registry.unexpectedLower': 'unerwartete Antwort vom Register',
  'app.err.registry.refusedCorrection':
    'Das Register hat diese Korrektur abgelehnt, daher wurde nichts geändert. {refusals}',

  'app.err.chain.unreachable':
    'Das Midnight-Netzwerk oder der Gebührendienst war nicht erreichbar. Es wurde nichts gesendet. Versuchen Sie es in ein paar Minuten erneut.',
  'app.err.chain.contractNotFound':
    'Der Smart Contract von VeilCore wurde im Netzwerk nicht gefunden. Es wurde nichts gesendet.',
  'app.err.chain.demoNotFound': 'Der Demo-Smart-Contract wurde im Netzwerk nicht gefunden.',
  'app.err.chain.claimsNotFound': 'Der Beleg-Smart-Contract wurde im Netzwerk nicht gefunden.',
  'app.err.chain.otherContract':
    'Der Smart Contract im Netzwerk ist nicht der, für den diese Website gebaut wurde. Es wurde nichts gesendet.',
  'app.err.chain.otherClaimsContract':
    'Der Beleg-Smart-Contract im Netzwerk ist nicht der, für den diese Website gebaut wurde. Es wurde nichts gesendet.',
  'app.err.chain.filesMismatch':
    'Die Beweisdateien dieser Website passen nicht zum Smart Contract im Netzwerk. Es wurde nichts gesendet.',
  'app.err.chain.claimsFilesMismatch':
    'Die Beweisdateien dieser Website passen nicht zum Beleg-Smart-Contract. Es wurde nichts gesendet.',
  'app.err.chain.circuitFilesMismatch':
    'Die Beweisdateien dieser Website für {circuit} passen nicht zum Smart Contract.',
  'app.err.chain.filesMissing': 'Die Beweisdateien für {circuit} sind noch nicht auf dieser Website.',
  'app.err.chain.paramsMissing': 'Die öffentlichen Parameter (k={k}) sind noch nicht auf dieser Website.',
  'app.err.chain.callFailed': 'Das Netzwerk hat den Aufruf aufgenommen, aber er war nicht erfolgreich ({status}).',
  'app.err.chain.claimFailed': 'Das Netzwerk hat den Beleg aufgenommen, aber er war nicht erfolgreich ({status}).',
  'app.err.chain.noSlot': 'Es wurde kein freier Lizenzplatz gefunden. Es wurde nichts gesendet.',
  'app.err.chain.notSendersRecord':
    'Dieser Link nennt einen Datensatz, der nicht der des Absenders ist. Es wurde nichts gesendet: Bitten Sie um einen neuen Link.',
  'app.err.chain.pow': 'Der Arbeitsnachweis konnte nicht abgeschlossen werden.',
  'app.err.chain.notToSponsor': 'An den Gebührendienst wurde nichts gesendet.',
  'app.err.chain.proverStart': 'Der Beweiser konnte in diesem Browser nicht starten: {reason}',
  'app.err.chain.proverSlow':
    'Der Beweiser ist nicht rechtzeitig gestartet. Versuchen Sie es erneut oder auf einem Laptop.',
  'app.err.chain.noRecordKeys': 'Dieser Browser hält die Schlüssel des Datensatzes nicht.',
  'app.err.chain.pairingNotSaved':
    'Dieser Browser konnte die Zufallszahl der Kopplung nicht speichern, daher wurde nichts gesendet.',
  'app.err.chain.noIdentity': 'Dieser Datensatz hat noch keine On-Chain-Identität.',
  'app.err.chain.notTx': 'Das ist keine Transaktions-ID.',
  'app.err.chain.badRandom': 'Der Zufallsgenerator hat einen unbrauchbaren Wert geliefert.',
  'app.err.chain.noIdentityToCheck': 'Dieser Datensatz hat keine On-Chain-Identität, die geprüft werden könnte.',
  'app.err.chain.notOurChallenge':
    'Diese Seite hat diesen Abfragecode nicht erstellt. Erstellen Sie einen neuen und senden Sie ihn.',
  'app.err.chain.challengeUsed': 'Dieser Abfragecode wurde schon einmal beantwortet. Erstellen Sie einen neuen.',
  'app.err.chain.notOurRequest': 'Diese Seite hat diesen Abfragecode nicht erstellt. Stellen Sie eine neue Anfrage.',
  'app.err.chain.requestUsed': 'Dieser Abfragecode wurde schon einmal beantwortet. Stellen Sie eine neue Anfrage.',
  'app.err.chain.noRecordKey': 'Kein Datensatzschlüssel zum Abgleichen.',
  'app.err.chain.indexerUnreachable':
    'der Indexer des Midnight-Netzwerks war nicht erreichbar; versuchen Sie es in ein paar Minuten erneut',
  'app.err.chain.stateUnreadable':
    'der aktuelle Stand des Smart Contracts konnte nicht gelesen werden; versuchen Sie es in ein paar Minuten erneut',

  'app.err.claims.noNumbers': 'Dieses Dokument hat keine versiegelten Zahlen.',
  'app.err.claims.noSchema': 'Kein veröffentlichtes Schema {schema}.',
  'app.err.claims.otherSchema': 'Das Schema auf dieser Website ist nicht das, unter dem die Zahlen versiegelt wurden.',
  'app.err.claims.notOnCertificate': 'Diese Zahl stand nicht im Zertifikat, als es versiegelt wurde.',
  'app.err.claims.boundNotMet': 'Die versiegelte Zahl erfüllt diese Grenze nicht, daher lässt sie sich nicht belegen.',
  'app.err.claims.sigOtherRecord': 'Diese Signatur gehört zu einem anderen Datensatz.',
  'app.err.claims.sigNoCheck':
    'Diese Signatur lässt sich nicht bestätigen: Sie wurde nicht mit diesem Schlüssel für diesen Datensatz erstellt.',
  'app.err.claims.tooMany': 'Zu viele Belege für einen Link.',
  'app.err.claims.onePerNumber': 'Ein Beleg pro Zahl in einem Link.',
  'app.err.claims.sameRecord': 'Belege in einem Link müssen zum selben Datensatz, Formular und Smart Contract gehören.',
  'app.err.claims.provingOff':
    'Belegen ist für diesen Datensatz aus, bis Sie es auf seiner Seite einschalten. Es wurde nichts gesendet.',
  'app.err.claims.confirmPublish':
    'Um die Zahl selbst zu veröffentlichen, brauchen wir zuerst Ihre Bestätigung. Es wurde nichts gesendet.',
  'app.err.claims.notOffered':
    'Dieser Beleg wird für diese Art von Ergebnis nicht angeboten. Es wurde nichts gesendet.',
  'app.err.claims.slotNotNumber': 'Feld {slot} ist keine Zahl in {schema}.',
  'app.err.claims.noLabSignature': 'Der Link nennt keine Laborsignatur.',
  'app.err.claims.txNotLabSignature': 'Diese Transaktion ist keine Laborsignatur.',
  'app.err.claims.labSigOtherRecord': 'Diese Laborsignatur gehört zu einem anderen Datensatz.',
  'app.err.claims.otherKey': 'Dieser Datensatz wurde mit einem anderen Schlüssel signiert.',
  'app.err.claims.unknownSchema': 'Der Link nennt ein Schema, das diese Website nicht veröffentlicht.',
  'app.err.claims.otherKind': 'Diese Transaktion hat eine andere Art von Beleg erstellt.',
  'app.err.claims.otherRecord': 'Dieser Beleg betrifft einen anderen Datensatz.',
  'app.err.claims.otherSchemaClaim': 'Dieser Beleg wurde unter einem anderen Schema erstellt.',
  'app.err.claims.otherNumber': 'Dieser Beleg betrifft eine andere Zahl.',
  'app.err.claims.otherBound': 'Dieser Beleg hat eine andere Grenze belegt.',
  'app.err.claims.notANumber': 'Dieser Beleg hat etwas veröffentlicht, das keine Zahl ist.',
  'app.err.claims.otherValue': 'Dieser Beleg hat einen anderen Wert veröffentlicht.',
  'app.err.claims.noContract': 'Diese Website kann keine Belege lesen: Es ist kein Beleg-Smart-Contract eingerichtet.',
  'app.err.claims.notOurContract':
    'Der Link nennt einen Beleg-Smart-Contract, der in diesem Netzwerk nicht der von VeilCore ist.',

  'app.err.lab.notRequest': 'Diese Datei ist keine Anfrage für eine Laborsignatur.',
  'app.err.lab.noForm': 'Die Anfrage verwendet Zahlen, für die diese Website kein Formular veröffentlicht.',
  'app.err.lab.notInForm':
    'Die Zahlen der Anfrage passen nicht zu dem Formular, das sie nennt. Signieren Sie sie nicht; bitten Sie erneut darum.',
  'app.err.lab.cantCheck': 'Die Anfrage lässt sich nicht prüfen: {reason}',
  'app.err.lab.notDocument': 'es ist kein Dokument-Datensatz.',
  'app.err.lab.rootMismatch': 'seine Zahlen ergeben nicht die Wurzel, die versiegelt wurde.',
  'app.err.lab.notRecord':
    'Die Zahlen der Anfrage ergeben nicht den Datensatz, den sie nennt. Signieren Sie sie nicht; bitten Sie erneut darum.',
  'app.err.lab.notKey': 'Das ist kein Labor-Signaturschlüssel.',
  'app.err.lab.notSignature': 'Diese Datei ist keine Laborsignatur.',
  'app.err.lab.sigKeyNotLab': 'Der Schlüssel dieser Signatur ist kein Labor-Signaturschlüssel.',
  'app.err.lab.numbersUnreadable': 'Die Zahlen in diesem Bericht können nicht gelesen werden.',
  'app.err.lab.numbersTooLarge': 'Die Zahlen sind zu groß zum Senden.',
  'app.err.lab.noLock': 'Der Laborcode enthält kein Schloss für Laborberichte.',
  'app.err.lab.notLockedHere':
    'Dieser Laborbericht wurde nicht für diese Pflanze verschlüsselt, oder die Datei ist beschädigt.',
  'app.err.lab.signatureDamaged': 'Die Laborsignatur in dieser Datei ist beschädigt. Es wurde nichts geändert.',
  'app.err.lab.keyExists':
    'In diesem Browser gibt es schon einen Laborschlüssel. Veröffentlichen Sie ihn erneut oder laden Sie seine Sicherungskopie herunter; es wurde kein neuer erstellt.',

  'app.err.lic.licensorSigns': 'Nur der Lizenzgeber signiert diese Nachweise.',
  'app.err.lic.otherStatement': 'Diese Bestätigung gehört zu einer anderen Abrechnung.',
  'app.err.lic.alreadyIssued': 'Schon auf der Chain ausgestellt: Stornieren Sie sie stattdessen.',
  'app.err.lic.notOnChain': 'Diese Lizenz ist nicht auf der Chain.',
  'app.err.lic.noDealMessages': 'Diese Lizenz hat noch keine Vereinbarungsnachrichten.',
  'app.err.lic.badKey': 'Der Schlüssel der anderen Seite ist nicht verwendbar.',
  'app.err.lic.handOnNotReady': 'Die Weitergabe kann noch nicht abgeschlossen werden.',
  'app.err.lic.evidenceTooLarge':
    'Diese Datei ist größer als 50 MB. Hängen Sie einen Bericht nur für diesen Zeitraum an.',
  'app.err.lic.fileEmpty': 'Diese Datei ist leer.',
  'app.err.lic.notIssuedByTx': 'Diese Transaktion hat diese Lizenz nicht ausgestellt.',
  'app.err.lic.notLiveByTx': 'Diese Transaktion hat diese Lizenz nicht in Kraft gesetzt.',
  'app.err.lend.needWords': 'Ein Anspruch braucht einen Text zum Kredit.',
  'app.err.lend.needName': 'Geben Sie den Namen an, den die Inhaber sehen.',
  'app.err.lend.noIdentity': 'In diesem Browser gibt es keine Kreditgeber-Identität.',
  'app.err.lend.notRecordKey': 'Das ist kein On-Chain-Schlüssel eines Datensatzes.',
  'app.err.lend.notOwnIdentity': 'Ein Anspruch kann nicht auf Ihre eigene Identität lauten.',
  'app.err.lend.wordsTooLong': 'Halten Sie den Text zum Kredit unter 200 Zeichen.',

  'app.err.rec.importTooLarge': 'Diese Datei ist größer als 20 MB. Es wurde nichts importiert.',
  'app.err.rec.notExport': 'Diese Datei ist kein VeilCore-Datensatzexport. Es wurde nichts importiert.',
  'app.err.rec.notExportShort': 'Diese Datei ist kein VeilCore-Datensatzexport.',
  'app.err.rec.unreadableEntries':
    'Diese Datei hat {count} Einträge, die diese Version nicht lesen kann. Es wurde nichts importiert.',
  'app.err.rec.deviceOnlyImport':
    '{id}: Nur ein Dokument kann ausschließlich auf diesem Gerät bleiben. Es wurde nichts importiert.',
  'app.err.rec.codeMismatch': '{id}: Sein Prüfcode passt nicht zu seinen Feldern. Es wurde nichts importiert.',
  'app.err.rec.noNonce':
    '{id}: Er hat einen Prüfcode, aber keine Nonce, daher lässt er sich nicht prüfen. Es wurde nichts importiert.',
  'app.err.rec.exportMismatch':
    '{id}: Sein Prüfcode passt nicht zu seinen gespeicherten Feldern, daher ließ sich ein Export nicht mit dem abgleichen, was das Register hält. Es wurde nichts exportiert.',
  'app.err.rec.fileTooLarge':
    '{file} ist größer als 200 MB und wurde daher nicht gelesen. Es wurde nichts gesendet oder gespeichert.',
  'app.err.rec.strainCantSeal': 'Dieser Sorten-Datensatz kann nicht versiegelt werden: {problems}.',
  'app.err.rec.animalCantSeal': 'Dieser Tier-Datensatz kann nicht versiegelt werden: {problems}.',
  'app.err.rec.docCantSeal': 'Dieser Dokument-Datensatz kann nicht versiegelt werden: {problems}.',
  'app.err.rec.docCantShare': 'Dieser Dokument-Datensatz kann nicht geteilt werden: {problems}.',
  'app.err.rec.chainTooLarge':
    'Diese Kette ist zu groß für einen Link. Senden Sie stattdessen den eigenen Link jedes Datensatzes.',
  'app.err.rec.aboutItself': 'Ein Datensatz kann sich nicht auf sich selbst beziehen.',
  'app.err.keys.notKeysFile': 'Das ist keine VeilCore-Datei mit Datensatzschlüsseln.',
  'app.err.keys.damaged': 'Diese Datei ist beschädigt: Die Schlüssel darin sind nicht lesbar.',
  'app.err.keys.differentKeys':
    'Dieser Browser hält schon andere Schlüssel für diesen Datensatz. Es wurde nichts geändert.',
  'app.err.keys.noVault': 'Dieser Browser hat keinen Tresorschlüssel.',
  'app.err.keys.holderKey': 'Ein Inhaberschlüssel besteht aus 64 Hexadezimalzeichen.',
  'app.err.keys.proofCode': 'Ein Prüfcode besteht aus 64 Hexadezimalzeichen.',
  'app.err.sheet.noSheet': 'Diese Tabelle enthält kein Blatt.',
  'app.err.sheet.wrongKind':
    'Diese Art von Tabelle wird hier nicht gelesen. Speichern Sie sie als Excel (.xlsx) oder CSV und wählen Sie diese Datei.',
  'app.err.sheet.notXlsx':
    'Diese Datei ließ sich nicht als Excel-Datei (.xlsx) öffnen. Speichern Sie sie als .xlsx oder CSV und versuchen Sie es erneut.',
  'app.err.sheet.tooLarge':
    'Diese Tabelle ist zu groß, um sie hier zu lesen. Speichern Sie sie mit weniger Zeilen und versuchen Sie es erneut.',
  'app.err.sheet.fileTooLarge':
    'Diese Datei ist größer als {mb} MB. Importieren Sie höchstens {rows} Zeilen auf einmal.',
} satisfies Partial<AppTranslation>;
