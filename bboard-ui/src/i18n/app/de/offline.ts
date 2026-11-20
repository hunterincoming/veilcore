// German (Sie). Ohne Netz arbeiten, und der sofortige Zeitstempel (docs/offline.md).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const offline = {
  'app.offline.sealedHere.phone':
    'Auf diesem Handy versiegelt um {time} (Uhr Ihres Handys). Datiert wird er, wenn er gesendet ist.',
  'app.offline.sealedHere.computer':
    'Auf diesem Computer versiegelt um {time} (Uhr Ihres Computers). Datiert wird er, wenn er gesendet ist.',
  'app.offline.short': 'Versiegelt {time}, datiert beim Senden',
  'app.offline.goesBySelf':
    'Gerade kein Netz. Er wird von selbst gesendet, sobald Sie wieder online sind, und dann datiert.',
  'app.offline.bar':
    'Kein Netz. Sie können hier weiter Datensätze anlegen und versiegeln; jeder wird datiert, wenn er gesendet ist. Prüfen, Teilen und Datumsstempel warten, bis Sie wieder online sind.',
  'app.offline.updated': 'Eine neuere Version von VeilCore ist bereit.',
  'app.offline.reload': 'Neu laden',
  'app.offline.stampWaits':
    'Kein Netz. Der Datumsstempel des Schlüssels wartet und startet von selbst, sobald Sie wieder online sind.',

  'app.install.title': 'VeilCore ohne Netz nutzen',
  'app.install.text':
    'Legen Sie VeilCore auf Ihren Home-Bildschirm. Dann öffnet es sich auch ohne Netz: Sie können Datensätze anlegen und versiegeln, und jeder wird datiert, sobald Sie wieder online sind.',
  'app.install.button': 'Zum Home-Bildschirm',
  'app.install.iosSteps': 'Auf iPhone oder iPad: in Safari auf Teilen tippen, dann „Zum Home-Bildschirm“.',
  'app.install.iosEmpty':
    'Die App auf dem Home-Bildschirm hat einen eigenen Speicher, getrennt von Safari, und öffnet sich deshalb leer. Öffnen Sie sie einmal mit Netz und holen Sie Ihre Datensätze dort zurück (Face ID oder Ihre Sicherungsdatei). Lassen Sie vorher alles senden, was in Safari noch wartet.',
  'app.install.iosKeep':
    'Auf dem Home-Bildschirm wird VeilCore nicht gelöscht, wie Safari Websites löscht, die Sie 7 Tage nicht geöffnet haben. Behalten Sie Ihre Sicherungskopie trotzdem.',
  'app.install.ready': 'Dieser Browser hält eine Kopie von VeilCore, deshalb öffnet es sich hier auch ohne Netz.',
  'app.install.dismiss': 'Nicht jetzt',

  'app.instant.pending': 'Zeitstempel {time} von {tsa} — das Datum auf Midnight folgt mit dem nächsten Stapel.',
  'app.instant.also': 'Außerdem Zeitstempel {time} von {tsa}.',
  'app.instant.asking': 'Zeitstempel wird bei einem Zeitstempeldienst angefragt…',
  'app.instant.fact':
    'Zeitstempel von {tsa}: {time}. Diese Seite hat seine Signatur über dem Prüfcode geprüft. Er zeigt, dass der Prüfcode spätestens zu diesem Zeitpunkt vorlag, nicht früher.',
  'app.verify.who.tsa': 'Ein Zeitstempel ({tsa})',
  'app.verify.who.tsa.checked': '{time}, signiert vom Zeitstempeldienst. Diese Seite hat die Signatur geprüft.',
  'app.verify.who.tsa.unbound':
    '{time}, signiert vom Zeitstempeldienst. Diese Seite hat die Signatur geprüft, aber der Link enthält keinen Prüfcode, um ihn zuzuordnen.',
} satisfies Partial<AppTranslation>;
