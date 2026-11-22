// German (Sie). Ohne Netz arbeiten, und der sofortige Zeitstempel (docs/offline.md).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const offline = {
  'app.offline.sealedHere':
    'Auf diesem Gerät versiegelt um {time} (Uhr dieses Geräts, nicht geprüft). Der Datensatz wird datiert, wenn er gesendet ist.',
  'app.offline.short': 'Versiegelt {time}, datiert beim Senden',
  'app.offline.goesBySelf': 'Sein Prüfcode wird von selbst gesendet, sobald Sie wieder online sind.',
  'app.offline.bar':
    'Kein Netz. Sie können weiter Datensätze anlegen und versiegeln; jeder erhält sein Datum, sobald er gesendet ist. Prüfen, Teilen, Übergaben an Labore und Datumsstempel von Schlüsseln warten auf Netz.',
  'app.offline.updated':
    'Eine neuere Version von VeilCore ist bereit. Laden Sie neu, wenn Sie gerade keinen Datensatz bearbeiten; nichts Versiegeltes geht verloren.',
  'app.offline.reload': 'Neu laden',
  'app.offline.stampWaits':
    'Der Datumsstempel Ihres Schlüssels wartet und startet von selbst, sobald Sie wieder online sind.',

  'app.install.title': 'VeilCore ohne Netz nutzen',
  'app.install.text':
    'Legen Sie VeilCore auf Ihren Home-Bildschirm. Dann öffnet es sich auch ohne Netz: Sie können Datensätze anlegen und versiegeln, und jeder erhält sein Datum, sobald er gesendet ist.',
  'app.install.button': 'Zum Home-Bildschirm',
  'app.install.iosSteps': 'Auf iPhone oder iPad: in Safari auf Teilen tippen, dann „Zum Home-Bildschirm“.',
  'app.install.iosEmpty':
    'Lassen Sie zuerst, mit Netz, alles senden, was in Safari noch wartet. Das Symbol auf dem Home-Bildschirm hat einen eigenen Speicher und öffnet sich deshalb leer; Ihre Datensätze sind in Safari weiter sicher. Öffnen Sie das Symbol mit Netz und holen Sie sie dort mit der Sperre dieses Geräts oder Ihrer Sicherungsdatei zurück. Nutzen Sie danach das Symbol: In Safari angelegte Datensätze erscheinen dort nicht.',
  'app.install.iosKeep':
    'Safari kann eine Website löschen, die Sie 7 Tage nicht geöffnet haben. Das Symbol auf dem Home-Bildschirm bleibt. Behalten Sie Ihre Sicherungskopie trotzdem.',
  'app.install.ready':
    'Dieser Browser hält die VeilCore-App bereit, deshalb öffnet sie sich hier auch ohne Netz. Für Ihre Datensätze brauchen Sie weiter Ihre Sicherungskopie.',
  'app.install.dismiss': 'Nicht jetzt',
  'app.install.showHow': 'So geht’s',
  'app.install.gotIt': 'Verstanden',

  'app.instant.pending':
    'Zeitstempel {time} von {tsa} — das Datum auf Midnight, der Blockchain, folgt mit dem nächsten Stapel.',
  'app.instant.also': 'Außerdem Zeitstempel {time} von {tsa}.',
  'app.instant.asking': 'Zeitstempel wird bei einem Zeitstempeldienst angefragt…',
  'app.instant.fact':
    'Zeitstempel von {tsa}: {time}. Diese Seite hat seine Signatur über dem Prüfcode geprüft, erstellt mit dem Schlüssel, den diese Website für {tsa} führt. Er zeigt, dass der Prüfcode spätestens zu diesem Zeitpunkt vorlag; über die Zeit davor sagt er nichts.',
  'app.verify.who.tsa': 'Ein Zeitstempel ({tsa})',
  'app.verify.who.tsa.checked':
    '{time}. Diese Seite hat die Signatur geprüft, erstellt mit dem Schlüssel, den diese Website für diesen Dienst führt.',
  'app.verify.who.tsa.unbound':
    '{time}. Diese Seite hat die Signatur geprüft, erstellt mit dem Schlüssel, den diese Website für diesen Dienst führt, aber der Link enthält keinen Prüfcode, um ihn zuzuordnen. Bitten Sie den Absender um den vollständigen Prüflink.',
  'app.offline.goesOnOpen': 'Sein Prüfcode wird gesendet, wenn Sie VeilCore das nächste Mal mit Netz öffnen.',
  'app.instant.disagree':
    'Zeitstempel mehrerer Zeitstempeldienste weichen um mehr als fünf Minuten voneinander ab. Die Prüfseite des Datensatzes führt jeden auf.',
  'app.verify.who.tsa.disagree': 'Diese Zeitstempel weichen um mehr als fünf Minuten voneinander ab.',
} satisfies Partial<AppTranslation>;
