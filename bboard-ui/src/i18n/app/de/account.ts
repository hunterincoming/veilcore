// Die Datensätze-App auf Deutsch: bei VeilCore gespeicherte Datensätze (../en/account.ts).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const account = {
  'app.account.use.faceId': 'Face ID verwenden',
  'app.account.use.touchId': 'Touch ID verwenden',
  'app.account.use.screenLock': 'Displaysperre verwenden',
  'app.account.use.windowsHello': 'Windows Hello verwenden',
  'app.account.use.passkey': 'Passkey verwenden',

  'app.account.sheet.title': 'Datensätze sicher aufbewahren',
  'app.account.sheet.lead': 'Damit Sie sie zurückbekommen, auch wenn Sie dieses Gerät verlieren.',
  'app.account.sheet.how':
    'Ihre Datensätze werden bei VeilCore gespeichert, so verschlossen, dass nur Sie sie öffnen können: VeilCore hat den Schlüssel nicht. Ihre anderen Handys und Computer mit demselben Apple- oder Google-Konto öffnen sie ebenfalls. Dokumente, die Sie nur auf diesem Gerät aufbewahren, sind nicht dabei.',
  'app.account.sheet.usePhone':
    'Dieser Computer kann einen Passkey nicht selbst entsperren. Ihr Browser bietet „Handy verwenden“ an: Scannen Sie den Code mit Ihrem Handy.',
  'app.account.sheet.twice':
    'Ihr Gerät fragt zweimal: einmal, um den Passkey anzulegen, und einmal, um zu prüfen, dass er Ihre Datensätze öffnet.',
  'app.account.sheet.otherWays': 'Andere Wege',
  'app.account.sheet.file': 'Selbst eine Datei aufbewahren',
  'app.account.sheet.fileHint':
    'Eine Datei, die Sie selbst aufbewahren, auf einem USB-Stick oder in einem Passwort-Manager. Auch in den Einstellungen.',
  'app.account.sheet.notNow': 'Nicht jetzt',
  'app.account.sheet.failed': 'Das hat nicht geklappt: {why}',
  'app.account.saved.title': 'Gespeichert.',
  'app.account.saved.text': 'Ihre Datensätze sind bei VeilCore gespeichert. Neue speichern sich von selbst.',
  'app.account.saved.bound':
    'Bei VeilCore gespeichert, aber dieser Passkey bleibt nur auf diesem Gerät: Verlieren Sie das Gerät, ist auch er weg. Laden Sie zur Sicherheit eine Kopie herunter, die Sie selbst aufbewahren.',
  'app.account.saved.download': 'Kopie herunterladen',
  'app.account.saved.done': 'Fertig',

  'app.account.line.none': '<b>Noch nicht in Ihrem Konto gespeichert.</b>',
  'app.account.line.fix': 'Beheben',
  'app.account.line.older':
    '<b>Entsperren Sie Ihre gespeicherten Datensätze einmal, damit weiter gespeichert wird.</b>',
  'app.account.line.locked':
    '<b>Das Speichern ist auf diesem Gerät pausiert.</b> Öffnen Sie Ihre Datensätze einmal, um weiterzumachen.',
  'app.account.line.continue': 'Weiter',
  'app.account.line.missing':
    '<b>Ihre bei VeilCore gespeicherten Datensätze sind nicht mehr auf dem Server.</b> Speichern Sie sie erneut.',
  'app.account.line.saveAgain': 'Erneut speichern',
  'app.account.line.slotMissing':
    '<b>Ein Weg, Ihre gespeicherten Datensätze zu öffnen, fehlt auf dem Server von VeilCore.</b> Richten Sie es neu ein.',
  'app.account.line.serverOlder':
    '<b>Auf dem Server von VeilCore stimmt etwas nicht.</b> Ihre Datensätze auf diesem Gerät sind in Ordnung, und es wurde nichts geändert. Laden Sie zur Sicherheit eine Kopie herunter.',
  'app.account.line.failing':
    '<b>Speichern in Ihrem Konto hat nicht geklappt.</b> {why} Es wird von selbst erneut versucht.',
  'app.account.line.tryNow': 'Jetzt versuchen',
  'app.account.line.bound':
    '<b>Bei VeilCore gespeichert, aber nur dieses Gerät kann es öffnen.</b> Laden Sie eine Kopie herunter, die Sie selbst aufbewahren.',
  'app.account.line.download': 'Kopie herunterladen',
  'app.account.line.deviceOnly.one':
    '<b>{count} Dokument ist nur auf diesem Gerät.</b> Laden Sie eine Kopie herunter, um es zu sichern.',
  'app.account.line.deviceOnly.other':
    '<b>{count} Dokumente sind nur auf diesem Gerät.</b> Laden Sie eine Kopie herunter, um sie zu sichern.',
  'app.account.line.stale':
    'Ihr {device} hat seit dem {date} nicht gespeichert. Wenn Sie es noch nutzen, öffnen Sie VeilCore darauf.',
  'app.account.line.gone': 'Dieses Gerät entfernen',
  'app.account.line.unknownSlot':
    '<b>Etwas, das Sie nicht hinzugefügt haben, kann Ihre gespeicherten Datensätze öffnen.</b>',
  'app.account.line.seeSettings': 'Zu den Einstellungen',

  'app.account.device.iphone': 'iPhone',
  'app.account.device.ipad': 'iPad',
  'app.account.device.android': 'Android-Handy',
  'app.account.device.mac': 'Mac',
  'app.account.device.windows': 'Windows-Computer',
  'app.account.device.linux': 'Computer',
  'app.account.device.other': 'anderes Gerät',

  'app.account.restore.lead': 'Öffnen Sie Ihre Datensätze auf diesem Gerät.',
  'app.account.restore.sameAccount':
    'Dasselbe Apple- oder Google-Konto wie auf Ihrem anderen Handy? Dann klappt es einfach.',
  'app.account.restore.usePhone':
    'Auf einem Computer ohne Face ID? Wählen Sie im Fenster, das sich öffnet, „Handy verwenden“ und scannen Sie den Code mit Ihrem Handy.',
  'app.account.restore.oldName': 'Passkey früher auf {host} angelegt? Hier versuchen',
  'app.account.restore.otherWays': 'Andere Wege',
  'app.account.restore.found':
    'Ihre am {date} bei VeilCore gespeicherten Datensätze wurden gefunden. Auf dieses Gerät holen?',
  'app.account.restore.bring': 'Hierher holen',
  'app.account.restore.notThis': 'Nicht diese',
  'app.account.restore.welcome.one': 'Willkommen zurück. {count} Datensatz ist hier.',
  'app.account.restore.welcome.other': 'Willkommen zurück. {count} Datensätze sind hier.',
  'app.account.restore.elsewhere.one':
    '{count} Dokument wird nur auf Ihrem {device} aufbewahrt und darum hier nicht gezeigt. Öffnen Sie es dort.',
  'app.account.restore.elsewhere.other':
    '{count} Dokumente werden nur auf Ihrem {device} aufbewahrt und darum hier nicht gezeigt. Öffnen Sie sie dort.',
  'app.account.restore.savedOn': 'Aus Ihren am {date} bei VeilCore gespeicherten Datensätzen.',

  'app.settings.title': 'Einstellungen',
  'app.settings.link': 'Einstellungen',
  'app.settings.account.title': 'Bei VeilCore gespeichert',
  'app.settings.account.on': 'Gespeichert am {date}. Neue Datensätze speichern sich von selbst.',
  'app.settings.account.bound': 'Gespeichert am {date}, aber nur dieses Gerät kann es öffnen.',
  'app.settings.account.off':
    'Nicht eingerichtet. Speichern Sie Ihre Datensätze bei VeilCore, damit Sie sie auf einem neuen Handy zurückbekommen.',
  'app.settings.account.why':
    'Ihre Datensätze liegen verschlossen auf dem Server von VeilCore, und nur Sie können sie öffnen. Sie kommen von dort zurück, das funktioniert also, solange VeilCore läuft. Eine heruntergeladene Kopie funktioniert auch ohne VeilCore.',
  'app.settings.ways.title': 'Wege, sie zu öffnen',
  'app.settings.ways.synced':
    'Passkey auf Ihren Geräten mit demselben Apple- oder Google-Konto · hinzugefügt am {date}',
  'app.settings.ways.bound': 'Passkey nur auf einem Gerät · hinzugefügt am {date}',
  'app.settings.ways.unknown.one':
    '{count} Weg, den Sie nicht hinzugefügt haben, kann Ihre gespeicherten Datensätze öffnen. Wenn nicht Sie ihn hinzugefügt haben, beenden Sie das Speichern bei VeilCore und richten Sie es neu ein.',
  'app.settings.ways.unknown.other':
    '{count} Wege, die Sie nicht hinzugefügt haben, können Ihre gespeicherten Datensätze öffnen. Wenn nicht Sie sie hinzugefügt haben, beenden Sie das Speichern bei VeilCore und richten Sie es neu ein.',
  'app.settings.devices.title': 'Ihre Geräte',
  'app.settings.devices.line': '{device} · zuletzt gespeichert am {date}',
  'app.settings.devices.here': '{device} (dieses) · zuletzt gespeichert am {date}',
  'app.settings.stop': 'Nicht mehr bei VeilCore speichern',
  'app.settings.stopConfirm':
    'Ihre bei VeilCore gespeicherten Datensätze löschen? Dieses Gerät behält sie. Ihre anderen Geräte speichern nicht mehr, und das erste, das wieder speichert, richtet eine neue Kopie ein. Der Passkey bleibt in den Einstellungen Ihres Handys.',
  'app.settings.stopped': 'Gelöscht. Ihre Datensätze bleiben auf diesem Gerät.',
  'app.settings.file.title': 'Kopie herunterladen',
  'app.settings.file.text':
    'Eine Datei, die Sie selbst aufbewahren. Sie funktioniert ohne VeilCore und ist der einzige andere Ort, an dem nur auf diesem Gerät aufbewahrte Dokumente gespeichert sind.',
  'app.settings.file.button': 'Kopie herunterladen',
  'app.settings.devices.removeConfirm':
    'Ihr {device} von dieser Liste entfernen? Speichert es wieder, erscheint es wieder.',
  'app.account.line.healed':
    'Auf dem Server von VeilCore stimmte etwas nicht. Ihre neueste Kopie wurde wieder gespeichert, und nichts ging verloren.',
  'app.account.line.ok': 'OK',
  'app.account.line.deletedHere.one':
    '<b>{count} Datensatz hier wurde auf Ihrem anderen Gerät gelöscht.</b> Hier behalten?',
  'app.account.line.deletedHere.other':
    '<b>{count} Datensätze hier wurden auf Ihrem anderen Gerät gelöscht.</b> Hier behalten?',
  'app.account.line.keepThem': 'Behalten',
  'app.account.restore.deleted.one':
    '{count} Datensatz wurde auf Ihren anderen Geräten gelöscht und wird nicht hierher geholt.',
  'app.account.restore.deleted.other':
    '{count} Datensätze wurden auf Ihren anderen Geräten gelöscht und werden nicht hierher geholt.',
  'app.account.restore.bringAnyway': 'Trotzdem hierher holen',
  'app.account.restore.adoptFailed':
    'Ihre Datensätze sind hier, aber dieses Gerät konnte nicht mit dem Speichern bei VeilCore beginnen: {why}',
  'app.account.restore.tryAgain': 'Erneut versuchen',
  'app.account.restore.tryWww': 'Zuerst www.veilcore.org genutzt? Öffnen Sie diese Seite dort.',
  'app.settings.ways.tag': 'In Ihren Passwörtern „VeilCore: unlocks your records · {tag}“ genannt',
} satisfies Partial<AppTranslation>;
