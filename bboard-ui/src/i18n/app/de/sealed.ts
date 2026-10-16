// German (Sie). DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md). Terms as in ../../de.ts; "locked" is verschlossen, as for
// lab reports.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const sealed = {
  'app.sealed.refuse.noKey':
    'dieser Browser hat den Schlüssel für Ihre Datensätze nicht, daher wurde nichts gespeichert. Stellen Sie zuerst Ihre Sicherungsdatei wieder her.',
  'app.sealed.refuse.mismatch': 'er passt nicht zu seinem Fingerabdruck und wurde daher nicht gespeichert',
  'app.sealed.mismatch':
    'Dieser Datensatz passt nicht zu seinem Fingerabdruck: Er wurde möglicherweise nach dem Versiegeln geändert. Er wird nicht erneut gespeichert, gesendet oder geteilt.',
  'app.sealed.locked.title.one': '{count} verschlossener Datensatz',
  'app.sealed.locked.title.other': '{count} verschlossene Datensätze',
  'app.sealed.locked.pageTitle': 'Dieser Datensatz ist verschlossen',
  'app.sealed.locked.text':
    'Dieser Browser hat den Schlüssel für diese Datensätze nicht. Stellen Sie die Sicherungsdatei wieder her, die Sie nach dem {date} gespeichert haben. VeilCore kann sie nicht für Sie öffnen.',
  'app.sealed.locked.textNoDate':
    'Dieser Browser hat den Schlüssel für diese Datensätze nicht. Stellen Sie Ihre neueste Sicherungsdatei wieder her. VeilCore kann sie nicht für Sie öffnen.',
  'app.sealed.locked.cantChange':
    'Ein verschlossener Datensatz kann nicht geändert oder gesendet werden. Sie können ihn löschen.',
  'app.sealed.locked.restore': 'Sicherungskopie wiederherstellen',
  'app.sealed.locked.unnamed': 'Datensatz ohne Namen',
  'app.sealed.locked.delete': 'Löschen',
  'app.sealed.locked.deleteConfirm':
    'Datensatz {name} aus VeilCore löschen? Er lässt sich in diesem Browser nicht öffnen, und nach dem Löschen kann ihn niemand zurückholen.',
  'app.sealed.locked.deleted': 'Gelöscht.',
  'app.sealed.locked.deleteFailed': 'Er wurde nicht gelöscht: {error}',
  'app.sealed.lockedAgreements.title.one': '{count} verschlossene Vereinbarung',
  'app.sealed.lockedAgreements.title.other': '{count} verschlossene Vereinbarungen',
  'app.sealed.lockedAgreements.text':
    'Dieser Browser hat den Schlüssel für diese Vereinbarungen (Lizenzen, Laborübergaben oder Weitergaben an Züchter) nicht. Stellen Sie Ihre neueste Sicherungsdatei wieder her. VeilCore kann sie nicht für Sie öffnen.',
  'app.sealed.lockedAgreements.cantChange':
    'Eine verschlossene Vereinbarung kann nicht geändert oder gesendet werden. Sie können sie löschen.',
  'app.sealed.lockedAgreements.name': 'Verschlossene Vereinbarung',
  'app.sealed.lockedAgreements.deleteConfirm':
    'Vereinbarung {id} aus VeilCore löschen? Sie lässt sich in diesem Browser nicht öffnen, und nach dem Löschen kann sie niemand zurückholen.',
  'app.sealed.truncated':
    'VeilCore hat nur einen Teil Ihrer Datensätze gesendet, daher fehlen hier vielleicht einige. Laden Sie die Seite neu, um es noch einmal zu versuchen.',
  'app.sealed.unreadable.one':
    '{count} Datensatz kam in einer Form zurück, die diese Version nicht lesen kann, und wird nicht angezeigt.',
  'app.sealed.unreadable.other':
    '{count} Datensätze kamen in einer Form zurück, die diese Version nicht lesen kann, und werden nicht angezeigt.',
  'app.sealed.backupNeeded':
    '<b>Speichern Sie eine neue Sicherungskopie.</b> Ihre Datensätze sind jetzt mit einem Schlüssel verschlossen, den nur dieser Browser hat, bis Sie eine Sicherungskopie speichern. Ohne die Sicherungsdatei können Sie sie nirgendwo sonst öffnen.',
  'app.sealed.err.newCode':
    'Dieser Code wurde erstellt, bevor Lieferungen verschlossen wurden, und funktioniert nicht mehr. Bitten Sie den Absender um einen neuen Code.',
  'app.sealed.recv.missingKey':
    'Diesem Code fehlt der letzte Teil. Sie können die Lieferung trotzdem empfangen, aber die Angaben des Absenders (wer sie gezüchtet hat und wann) kommen nicht mit. Bitten Sie zuerst um den vollständigen Code.',
  'app.sealed.recv.notOpened':
    'Die Angaben des Absenders ließen sich mit diesem Code nicht öffnen, daher kam nur der Name mit.',
  'app.sealed.backup.noVaultKey':
    'Diese Sicherungskopie enthält nicht den Schlüssel, der Ihre Datensätze öffnet. Speichern Sie eine neue und prüfen Sie diese.',
  'app.sealed.backup.differentVault':
    'Dieser Browser öffnet Ihre Datensätze bereits mit einem anderen Schlüssel. Es wurde nichts geändert.',
  'app.sealed.backup.olderFile':
    'Diese Datei stammt aus der Zeit, bevor Datensätze verschlossen wurden, und enthält ihren Schlüssel nicht. Seitdem verschlossene Datensätze bleiben verschlossen, bis Sie eine neuere Sicherungsdatei öffnen.',
  'app.sealed.refuse.backupFirst':
    'er wurde gespeichert, bevor Datensätze verschlossen wurden. Speichern und prüfen Sie zuerst eine Sicherungskopie; danach lassen sich Änderungen daran speichern',
  'app.sealed.refuse.tooLarge': 'er ist zu groß zum Speichern. Kürzen Sie die Notizen und versuchen Sie es erneut',
  'app.sealed.refuse.unknown':
    'VeilCore war nicht erreichbar, um Ihre Datensätze zu prüfen, daher wurde nichts gespeichert. Versuchen Sie es gleich noch einmal.',
  'app.sealed.refuse.cantStore':
    'dieser Browser kann den Schlüssel, der Ihre Datensätze verschließt, nicht behalten (ein privates Fenster oder blockierte Websitedaten), daher wurde nichts gespeichert',
  'app.sealed.tooLarge':
    'Dieser Datensatz ist zu groß zum Speichern. Kürzen Sie die Notizen und versuchen Sie es erneut. Nichts, was Sie eingegeben haben, ging verloren.',
  'app.sealed.size.near': '{used} KB von {max} KB belegt.',
  'app.sealed.size.over': 'Zu groß zum Speichern. Kürzen Sie die Notizen.',
  'app.sealed.older.pageTitle': 'Eine ältere Kopie dieses Datensatzes',
  'app.sealed.older': 'Der Server hat eine ältere Kopie dieses Datensatzes gesendet.',
  'app.sealed.olderKept.one':
    'Der Server hat eine ältere Kopie von {count} Datensatz gesendet. Dieser Browser hat die neuere Kopie behalten und speichert sie erneut.',
  'app.sealed.olderKept.other':
    'Der Server hat ältere Kopien von {count} Datensätzen gesendet. Dieser Browser hat die neueren Kopien behalten und speichert sie erneut.',
  'app.sealed.importLocked.one':
    ' {count} verschlossener Datensatz wurde übersprungen: Dieser Browser hat seinen Schlüssel nicht.',
  'app.sealed.importLocked.other':
    ' {count} verschlossene Datensätze wurden übersprungen: Dieser Browser hat ihren Schlüssel nicht.',
  'app.sealed.backupBeforeLocking':
    '<b>Speichern Sie eine Sicherungskopie.</b> Ihre älteren Datensätze werden verschlossen, sobald eine Sicherungsdatei den Schlüssel enthält, der sie öffnet. Bis dahin bleiben sie so auf dem Server von VeilCore, wie sie gespeichert wurden, für VeilCore lesbar, und Änderungen daran lassen sich nicht speichern.',
  'app.sealed.cantStore':
    'Dieser Browser kann den Schlüssel, der Ihre Datensätze verschließt, nicht behalten (ein privates Fenster oder blockierte Websitedaten). Daher wurden Ihre älteren Datensätze nicht verschlossen, und hier lässt sich nichts Neues speichern. Öffnen Sie VeilCore in einem normalen Fenster.',
  'app.sealed.lockedParents.one':
    '{count} Elterndatensatz ist in diesem Browser verschlossen und wird daher weggelassen.',
  'app.sealed.lockedParents.other':
    '{count} Elterndatensätze sind in diesem Browser verschlossen und werden daher weggelassen.',
  'app.sealed.backup.cantCheck':
    'VeilCore war nicht erreichbar, um zu prüfen, welchen Schlüssel Ihre Datensätze verwenden, daher wurde nichts geändert. Versuchen Sie es erneut, wenn Sie online sind.',
  'app.sealed.err.handleTag':
    'Diese Seite passt nicht zum Server von VeilCore. Laden Sie die Seite neu und versuchen Sie es erneut.',
  'app.sealed.recv.restoreFirst':
    'Dieser Browser hat den Schlüssel für Ihre Datensätze nicht und kann daher nicht speichern, was Sie empfangen. Stellen Sie zuerst Ihre Sicherungsdatei wieder her und verwenden Sie dann den Code.',
  'app.sealed.recv.cantCheck':
    'VeilCore war nicht erreichbar, um Ihre Datensätze zu prüfen, daher wurde nichts empfangen. Versuchen Sie es gleich noch einmal.',
  'app.sealed.recv.cantStore':
    'Dieser Browser kann den Schlüssel, der Ihre Datensätze verschließt, nicht behalten (ein privates Fenster oder blockierte Websitedaten), daher wurde nichts empfangen. Öffnen Sie VeilCore in einem normalen Fenster.',
  'app.sealed.recv.notFinished':
    'Es wurde empfangen, aber sein Datensatz wurde nicht gespeichert, daher wurde nichts signiert: {error}. Verwenden Sie „Empfang abschließen“ beim Datensatz, um es erneut zu versuchen.',
  'app.sealed.recv.failed': 'Beim Empfangen ist etwas schiefgegangen: {error}',
  'app.sealed.recv.notAccepted':
    'Dieser Datensatz ist noch nicht bei VeilCore gespeichert, daher gibt es nichts zu signieren. Schließen Sie zuerst den Empfang ab.',
  'app.sealed.recv.finishTitle': 'Diese Lieferung ist nicht abgeschlossen',
  'app.sealed.recv.finishText':
    'Sie wurde empfangen, aber ihr Datensatz ist noch nicht gespeichert. Prüfen Sie den Laborcode unten (fügen Sie ihn erneut ein, wenn das Feld leer ist) und schließen Sie dann ab.',
  'app.sealed.recv.finish': 'Empfang abschließen',
  'app.sealed.recv.finishing': 'Wird abgeschlossen…',
  'app.sealed.recv.noRecord': 'Dieser Datensatz ist nicht in diesem Browser.',
  'app.sealed.recv.otherCode': 'Dieser Code gehört zu einer anderen Lieferung.',
  'app.sealed.recv.offerMissing':
    'VeilCore hat die verschlossenen Angaben des Absenders zu diesem Code nicht gesendet, daher wurde der Datensatz nicht abgeschlossen. Versuchen Sie später „Empfang abschließen“ beim Datensatz, oder fragen Sie den Absender.',
} satisfies Partial<AppTranslation>;
