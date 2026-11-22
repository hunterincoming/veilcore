// Deutsch (Sie). Die Prüfung beim Öffnen der App (veilcore/record-watch.ts).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const watch = {
  'app.watch.this': 'An diesem Datensatz hat sich im Netzwerk etwas geändert, das nicht von diesem Browser kam.',
  'app.watch.home.one': 'An „{name}“ hat sich im Netzwerk etwas geändert, das nicht von diesem Browser kam.',
  'app.watch.home.other':
    'An {count} Ihrer Datensätze hat sich im Netzwerk etwas geändert, das nicht von diesem Browser kam.',
  'app.watch.change.recovered':
    'Sein Wiederherstellungsgeheimnis wurde benutzt, um ihn auf einen neuen Schlüssel umzustellen.',
  'app.watch.change.moved': 'Er wurde auf einen neuen Schlüssel umgestellt.',
  'app.watch.change.recovery-replaced':
    'Das Geheimnis, mit dem er auf einen neuen Schlüssel umgestellt werden kann, wurde ersetzt.',
  'app.watch.what': 'Was Sie jetzt tun',
  'app.watch.hide': 'Schritte ausblenden',
  'app.watch.step.you':
    'Wenn Sie das selbst getan haben, auf einem anderen Gerät oder mit dem Befehlszeilenprogramm von VeilCore, ist alles in Ordnung.',
  'app.watch.step.copy':
    'Wenn nicht, hat vielleicht jemand eine Kopie der Schlüssel dieses Browsers oder einer Sicherungsdatei. Nutzen Sie diesen Computer nicht mehr für VeilCore, bis er geprüft wurde, und geben Sie Ihr Wiederherstellungsblatt dort nicht ein.',
  'app.watch.step.files': 'Bewahren Sie Ihre Sicherungsdateien offline auf und geben Sie jeder ein Passwort.',
  'app.watch.step.date':
    'Das Datum, an dem Ihr Datensatz zuerst gestempelt wurde, bleibt im Netzwerk. Niemand kann es ändern.',
  'app.watch.step.help':
    'Diese Website kann einen Datensatz noch nicht zurückholen. <mail>Schreiben Sie VeilCore</mail> und nennen Sie den Datensatz. Senden Sie nie seine Schlüssel, eine Sicherungsdatei oder Ihr Wiederherstellungsblatt.',
  'app.watch.open': '„{name}“ öffnen',
  'app.watch.seen': 'Das war ich',
} satisfies Partial<AppTranslation>;
