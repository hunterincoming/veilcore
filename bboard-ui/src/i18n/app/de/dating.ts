// German (Sie). DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md). Dating first, Datumsstempel automatisch erneut, "Dort
// weitermachen, wo Sie aufgehört haben" und "Angaben für den Support kopieren" (CONTRACT.md #38).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const dating = {
  'app.chain.progress.starting': 'Der Beweiser wird auf Ihrem Gerät gestartet…',

  'app.log.recordDatedNext.one':
    'Ihr Datensatz erhält sein Datum mit der nächsten Gruppe von Datensätzen (etwa jede {count} Minute im Testnetz)',
  'app.log.recordDatedNext.other':
    'Ihr Datensatz erhält sein Datum mit der nächsten Gruppe von Datensätzen (etwa alle {count} Minuten im Testnetz)',
  'app.log.recordDatedNextPlain': 'Ihr Datensatz erhält sein Datum mit der nächsten Gruppe von Datensätzen',
  'app.log.inSeconds': 'in {n} s',
  'app.log.retryingIn': 'Neuer Versuch von selbst {when} (Versuch {n}).',
  'app.log.retriesUsed':
    'Es wurde mehrmals versucht. Versuchen Sie es, wann Sie möchten: Das Datum Ihres Datensatzes hängt nicht davon ab.',
  'app.log.tryNow': 'Jetzt erneut versuchen',
  'app.log.keepsTrying':
    'Es wird von selbst weiter versucht, solange VeilCore geöffnet ist, und die Startseite zeigt es, bis es durchgeht.',

  'app.plant.nextBatch': 'mit der nächsten Gruppe von Datensätzen',
  'app.plant.nextBatchEvery.one': 'etwa jede {count} Minute im Testnetz',
  'app.plant.nextBatchEvery.other': 'etwa alle {count} Minuten im Testnetz',
  'app.plant.notSentYet': 'noch nicht an VeilCore gesendet; wird von selbst erneut versucht',
  'app.plant.keyStampRetrying':
    'Schlüssel mit Datumsstempel: noch nicht. Es ging nicht durch und wird von selbst erneut versucht.',
  'app.plant.keyStampMaySent':
    'Schlüssel mit Datumsstempel: noch nicht. Einer könnte schon gesendet sein, deshalb wird er nicht von selbst erneut gesendet: Prüfen Sie unten, bevor Sie es erneut versuchen.',
  'app.plant.keyStampCannot':
    'Schlüssel mit Datumsstempel: noch nicht. Diese Website kann ihn gerade nicht setzen; der Grund steht unten.',

  'app.home.restoreFirstTitle': 'VeilCore schon auf einem anderen Gerät genutzt?',
  'app.home.restoreFirstText':
    'Holen Sie zuerst Ihre Datensätze hierher zurück: mit {how} oder mit der gespeicherten Sicherungsdatei.',
  'app.home.restoreFirstButton': 'Meine Datensätze zurückholen',

  'app.pickup.title': 'Noch in Arbeit',
  'app.pickup.open': 'Öffnen',
  'app.pickup.tryNow': 'Jetzt versuchen',
  'app.pickup.saveBackup': 'Sicherungskopie speichern',
  'app.pickup.openAgreements': 'Vereinbarungen öffnen',
  'app.pickup.dating.notSent': '{name}: versiegelt. Sein Prüfcode geht an VeilCore, sobald VeilCore erreichbar ist.',
  'app.pickup.dating.next': '{name} erhält sein Datum mit der nächsten Gruppe von Datensätzen.',
  'app.pickup.dating.nextEvery.one':
    '{name} erhält sein Datum mit der nächsten Gruppe von Datensätzen (etwa jede {count} Minute eine).',
  'app.pickup.dating.nextEvery.other':
    '{name} erhält sein Datum mit der nächsten Gruppe von Datensätzen (etwa alle {count} Minuten eine).',
  'app.pickup.dating.batched': '{name} ist in einem Stapel und wartet auf sein Datum.',
  'app.pickup.dating.progress': 'Schritt {n} von {total} zu seinem Datum',
  'app.pickup.more.one': 'und {count} weiterer auf dem Weg zu seinem Datum',
  'app.pickup.more.other': 'und {count} weitere auf dem Weg zu ihrem Datum',
  'app.pickup.stamp.retrying':
    'Der Datumsstempel des Schlüssels für {name} ging noch nicht durch. Er wird von selbst erneut versucht; nächster Versuch {when}.',
  'app.pickup.stamp.now': 'Datumsstempel des Schlüssels für {name}: wird jetzt versucht…',
  'app.pickup.stamp.paused':
    'Der Datumsstempel des Schlüssels für {name} ging auch nach mehreren Versuchen nicht durch.',
  'app.pickup.stamp.sent':
    'Der Datumsstempel des Schlüssels für {name} könnte schon gesendet sein. Prüfen Sie ihn auf seiner Seite, bevor Sie es erneut versuchen.',
  'app.pickup.stamp.cannot':
    'Der Datumsstempel des Schlüssels für {name} kann von dieser Website gerade nicht gesetzt werden. Seine Seite sagt, warum.',
  'app.pickup.deliveriesSent.one': '{count} Lieferung ans Labor gesendet, noch nicht angenommen.',
  'app.pickup.deliveriesSent.other': '{count} Lieferungen ans Labor gesendet, noch nicht angenommen.',
  'app.pickup.deliveriesUnsigned.one':
    '{count} Lieferung vom Labor angenommen, Empfangsbestätigung noch nicht signiert.',
  'app.pickup.deliveriesUnsigned.other':
    '{count} Lieferungen vom Labor angenommen, Empfangsbestätigungen noch nicht signiert.',
  'app.pickup.labUnsigned.one': '{count} Probe angenommen, Empfangsbestätigung noch nicht signiert.',
  'app.pickup.labUnsigned.other': '{count} Proben angenommen, Empfangsbestätigungen noch nicht signiert.',
  'app.pickup.results.one': '{count} Laborbericht wartet darauf, geöffnet zu werden.',
  'app.pickup.results.other': '{count} Laborberichte warten darauf, geöffnet zu werden.',
  'app.pickup.agreements.one': '{count} Vereinbarung wartet auf die Gegenzeichnung der anderen Seite.',
  'app.pickup.agreements.other': '{count} Vereinbarungen warten auf die Gegenzeichnung der anderen Seite.',

  'app.support.copy': 'Angaben für den Support kopieren',
  'app.support.copied': 'Kopiert. Fügen Sie es in eine E-Mail an VeilCore ein.',
  'app.support.email': 'Per E-Mail an {email} senden',
  'app.support.selectIt': 'Dieser Browser hat es nicht kopiert. Markieren Sie den Text unten und kopieren Sie ihn:',
} satisfies Partial<AppTranslation>;
