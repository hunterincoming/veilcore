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
    '<b>Speichern Sie eine neue Sicherungskopie.</b> Ihre Datensätze sind jetzt mit einem Schlüssel verschlossen, den nur dieser Browser hat. Ohne die Sicherungsdatei können Sie sie nirgendwo sonst öffnen.',
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
} satisfies Partial<AppTranslation>;
