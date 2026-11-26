// Die Datensatz-App auf Deutsch: Belege über zwei Datensätze desselben Inhabers (../en/two-records.ts).
// ENTWURF: maschinell unterstützt, vor der Veröffentlichung von einer Muttersprachlerin oder einem
// Muttersprachler zu prüfen (docs/translations/README.md).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const twoRecords = {
  'app.tworec.more.title': 'Weitere Beweismöglichkeiten',
  'app.tworec.more.text':
    'Vergleichen Sie die in diesem Datensatz versiegelten Zahlen mit einem anderen Ihrer Datensätze, ohne die Zahlen zu zeigen.',
  'app.tworec.more.distinct': 'Zeigen, dass diese zwei Datensätze verschieden sind',
  'app.tworec.more.unchanged': 'Zeigen, dass eine Berichtigung nur das geändert hat, was sie angibt',

  'app.tworec.status.notYet': 'Gebaut, im Hauptnetz von Midnight noch nicht ausgeführt.',
  'app.tworec.status.ran': 'Das ist im Hauptnetz von Midnight gelaufen.',
  'app.tworec.unpaid':
    'Von dieser Website lässt sich das noch nicht senden: Der Gebührendienst von VeilCore bezahlt diese zwei Belege noch nicht. Sie sehen, was belegt würde. Es wird nichts gesendet.',
  'app.tworec.what': 'Was belegt werden soll',
  'app.tworec.this': 'Dieser Datensatz',
  'app.tworec.other': 'Der andere Datensatz',
  'app.tworec.original': 'Der frühere Datensatz, den dieser berichtigt',
  'app.tworec.none':
    'Sie haben keinen anderen Datensatz mit Zahlen unter dem Formular „{schema}“. Versiegeln Sie zuerst einen weiteren.',
  'app.tworec.distinct.text':
    'Das belegt, dass sich die zwei Datensätze in mindestens {k} der Zahlen unterscheiden, die ihr Formular vergleicht. Es zeigt nie, welche Zahlen sich unterscheiden, um wie viel oder wie viele. Diese Zahl legt das Formular fest; Sie können sie nicht wählen.',
  'app.tworec.unchanged.text':
    'Haken Sie die Zahlen an, die die Berichtigung ändern durfte. Das belegt, dass jede andere Zahl in beiden Datensätzen gleich ist. Die angehakte Liste ist öffentlich, die Zahlen nicht.',
  'app.tworec.unchanged.list': 'Durfte sich ändern',
  'app.tworec.unchanged.carries':
    'Über den früheren Datensatz ist schon öffentlich: {list}. Wenn Sie das belegen, gilt jedes davon auch für diesen Datensatz, weil diese Zahlen nicht angehakt sind.',
  'app.tworec.unchanged.changed': '{label} (geändert)',
  'app.tworec.preview.distinct':
    'Das belegt: Diese zwei Datensätze unterscheiden sich in mindestens {k} der Zahlen, die ihr Formular vergleicht.',
  'app.tworec.preview.unchanged':
    'Das belegt: Abgesehen von {list} ist jede Zahl in diesem Datensatz dieselbe wie im früheren.',
  'app.tworec.preview.unchangedNone': 'Das belegt: Jede Zahl in diesem Datensatz ist dieselbe wie im früheren.',
  'app.tworec.refuse.noNumbers': 'Einer dieser Datensätze hat keine versiegelten Zahlen.',
  'app.tworec.refuse.notOffered':
    'Diese Art von Datensatz lässt sich so nicht vergleichen. Das funktioniert bei Zahlen, die Sie selbst eingegeben haben, unter diesen Formularen: {forms}.',
  'app.tworec.refuse.sameRecord': 'Das ist derselbe Datensatz. Wählen Sie einen anderen.',
  'app.tworec.refuse.otherForm':
    'Die zwei Datensätze nutzen verschiedene Formulare, daher lassen sich ihre Zahlen nicht vergleichen.',
  'app.tworec.refuse.tooFew':
    'Diese zwei Datensätze unterscheiden sich in {n} der verglichenen Zahlen, nötig sind mindestens {k}. Daher lässt sich das nicht belegen. Es wurde nichts gesendet.',
  'app.tworec.refuse.undeclared':
    '{list} hat sich geändert, ist aber nicht angehakt. Haken Sie es an, sonst lässt sich das nicht belegen. Es wurde nichts gesendet.',
  'app.tworec.refuse.saysNothing': 'Wenn jede Zahl angehakt ist, sagt das nichts aus. Lassen Sie mindestens eine frei.',
  'app.tworec.err.unpaid':
    'Der Gebührendienst von VeilCore bezahlt diesen Beleg noch nicht, daher wurde nichts gesendet.',
  'app.tworec.err.deviceOnly':
    'Ein nur auf diesem Gerät aufbewahrter Datensatz lässt sich so nicht vergleichen. Es wurde nichts gesendet.',
  'app.tworec.err.tooFew':
    'Diese zwei Datensätze unterscheiden sich nicht in genug der verglichenen Zahlen, daher lässt sich das nicht belegen. Es wurde nichts gesendet.',
  'app.tworec.err.undeclared':
    'Eine Zahl, die nicht in Ihrer Liste steht, hat sich geändert, daher lässt sich das nicht belegen. Es wurde nichts gesendet.',
  'app.tworec.err.otherRecords': 'Dieser Beleg betrifft andere Datensätze.',
  'app.tworec.err.otherList': 'Bei diesem Beleg durften sich andere Zahlen ändern.',
  'app.tworec.err.listSaysNothing': 'Bei diesem Beleg darf sich jede Zahl ändern, daher sagt er nichts aus.',
  'app.tworec.err.notTwo':
    'Diese Transaktion ist nicht ein einzelner Beleg über zwei Datensätze auf dem Smart Contract für Belege von VeilCore.',
  'app.tworec.tie':
    'Die Codes beider Datensätze kommen auf Midnight, wo VeilCore und jeder mit dem Prüflink eines der beiden Datensätze diesen Beleg ihnen zuordnen kann. VeilCore kann ihn außerdem den Inhaberschlüsseln zuordnen, die sie datiert haben.',
  'app.tworec.made': 'Was Sie über zwei Datensätze belegt haben',
  'app.tworec.line.distinct':
    '{a} und {b} unterscheiden sich in mindestens {k} der Zahlen, die ihr Formular vergleicht',
  'app.tworec.line.unchanged': '{b} hat dieselben Zahlen wie {a}, abgesehen von {list}',
  'app.tworec.line.unchangedNone': '{b} hat dieselben Zahlen wie {a}',

  'app.tworec.not.title': 'Was das nicht zeigt',
  'app.tworec.not.examine':
    'Es ist eine Zählung, keine Entscheidung. Ob zwei Sorten oder Lose unterscheidbar sind, entscheidet, wer sie prüft, etwa eine Prüfstelle. Dies ersetzt diese Prüfung nicht.',
  'app.tworec.not.which': 'Es zeigt nicht, welche Zahlen sich unterscheiden, um wie viel oder wie viele.',
  'app.tworec.not.typed': 'Das zeigt nicht, dass ein Labor die Zahlen gemessen oder signiert hat.',
  'app.tworec.not.reference':
    'Der Inhaber hat den anderen Datensatz gewählt. Für einen fairen Vergleich sollte jemand anderes als der Inhaber angeben, mit welchem Datensatz verglichen wird.',
  'app.tworec.not.oneParty':
    'Der Inhaber hält beide Datensätze. Zwei Personen können damit keine Zahlen vergleichen, die keine von beiden der anderen zeigen will.',
  'app.tworec.not.correction':
    'Es zeigt nicht, welcher Datensatz die Berichtigung ist oder dass einer den anderen ersetzt hat.',
  'app.tworec.not.ticked': 'Eine Zahl auf der Liste kann sich geändert haben oder auch nicht.',
  'app.tworec.not.onlyNumbers':
    'Es betrifft nur die versiegelten Zahlen, nicht die anderen Angaben oder Dateien der Datensätze.',
  'app.tworec.not.sealed':
    'Es betrifft beide Datensätze so, wie sie versiegelt wurden, nicht, ob einer davon noch aktuell ist.',

  'app.tworec.check.title': 'Einen Beleg über zwei Datensätze prüfen',
  'app.tworec.check.intro':
    'Jemand hat Ihnen diesen Link geschickt, um eine Tatsache über die Zahlen in zwei seiner versiegelten Datensätze zu zeigen, ohne die Zahlen zu zeigen. Diese Seite liest den Beleg auf Midnight und prüft ihn.',
  'app.tworec.check.distinct':
    'Diese zwei Datensätze unterscheiden sich, so wie sie versiegelt wurden, in mindestens {k} der Zahlen, die ihr Formular vergleicht.',
  'app.tworec.check.unchanged': 'Abgesehen von {list} hat der zweite Datensatz dieselben Zahlen wie der erste.',
  'app.tworec.check.unchangedNone': 'Der zweite Datensatz hat dieselben Zahlen wie der erste.',
  'app.tworec.check.first': 'Der erste Datensatz',
  'app.tworec.check.second': 'Der zweite Datensatz',
  'app.tworec.check.earlier': 'Der frühere Datensatz (laut Inhaber)',
  'app.tworec.check.correction': 'Die Berichtigung (laut Inhaber)',
} satisfies Partial<AppTranslation>;
