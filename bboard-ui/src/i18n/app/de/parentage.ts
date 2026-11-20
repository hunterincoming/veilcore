// The record app in German: claims on a laboratory's parentage result (../en/parentage.ts).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const parentage = {
  'app.parentage.offer.sireConflicts': 'Konflikte mit dem Vater: höchstens {n} (ICAR: akzeptiert)',
  'app.parentage.offer.damConflicts': 'Konflikte mit der Mutter: höchstens {n} (ICAR: akzeptiert)',
  'app.parentage.offer.trioConflicts': 'Konflikte im Trio: höchstens {n} (ICAR: akzeptiert)',
  'app.parentage.offer.sireCompared': 'Mit dem Vater verglichene SNPs: mindestens {n} (ICAR-Minimum)',
  'app.parentage.offer.damCompared': 'Mit der Mutter verglichene SNPs: mindestens {n} (ICAR-Minimum)',
  'app.parentage.line.sireConflicts': 'Konflikte mit dem Vater: höchstens {n}',
  'app.parentage.line.damConflicts': 'Konflikte mit der Mutter: höchstens {n}',
  'app.parentage.line.trioConflicts': 'Konflikte im Trio: höchstens {n}',
  'app.parentage.line.sireCompared': 'Mit dem Vater verglichene SNPs: mindestens {n}',
  'app.parentage.line.damCompared': 'Mit der Mutter verglichene SNPs: mindestens {n}',
  'app.parentage.fixed':
    'Das ist die Grenze von ICAR selbst, keine aus der Zählung des Labors gerundete Zahl. Sie zeigt daher nur, dass das Ergebnis im Bereich „akzeptiert“ liegt.',
  'app.parentage.bands.title': 'Bereiche nach ICAR 2023 für die Abstammungsprüfung mit SNPs',
  'app.parentage.bands.single':
    'Mit einem Elternteil: 0 bis 2 Konflikte gelten als akzeptiert, 3 bis 5 als fraglich, mehr als 5 als ausgeschlossen.',
  'app.parentage.bands.trio':
    'Im Trio (Nachkomme, Vater und Mutter): 0 bis 3 Konflikte gelten als akzeptiert, 4 bis 7 als fraglich, mehr als 7 als ausgeschlossen.',
  'app.parentage.bands.compared':
    'Mit jedem Elternteil müssen mindestens 175 SNPs mit dem Nachkommen verglichen sein, im Trio mindestens 165, die beide Eltern gemeinsam haben.',
  'app.parentage.bands.only':
    'Hier werden nur die Grenzen für „akzeptiert“ angeboten, nie eine gerundete: „höchstens 5“ wäre die Obergrenze von „fraglich“.',
  'app.parentage.unmet.sireConflicts':
    'Die Zählung des Labors für Konflikte mit dem Vater liegt nicht im Bereich „akzeptiert“. Daher wird kein Beleg zum Vater angeboten.',
  'app.parentage.unmet.damConflicts':
    'Die Zählung des Labors für Konflikte mit der Mutter liegt nicht im Bereich „akzeptiert“. Daher wird kein Beleg zur Mutter angeboten.',
  'app.parentage.unmet.trioConflicts':
    'Die Zählung des Labors für Konflikte im Trio liegt nicht im Bereich „akzeptiert“. Daher wird kein Beleg zum Trio angeboten.',
  'app.parentage.unmet.sireCompared':
    'Mit dem Vater wurden weniger SNPs verglichen, als ICAR mindestens verlangt. Dieses Minimum lässt sich daher nicht belegen.',
  'app.parentage.unmet.damCompared':
    'Mit der Mutter wurden weniger SNPs verglichen, als ICAR mindestens verlangt. Dieses Minimum lässt sich daher nicht belegen.',
  'app.parentage.all':
    'Um zu zeigen, dass das Ergebnis die Annahmekriterien von ICAR 2023 erfüllt, belegen Sie alle fünf und kopieren dann einen Link mit allen. Wenn jeder Beleg gültig ist und ein Labor hinter den Zahlen steht, sagt die Prüfseite dann, dass das Ergebnis die Annahmekriterien von ICAR 2023 erfüllt.',
  'app.parentage.none':
    'Nichts in diesem Ergebnis erfüllt die Annahmegrenzen von ICAR. Daher wird kein Beleg angeboten.',
  'app.parentage.cert.title': 'Erfüllt die Annahmekriterien von ICAR 2023 für die Abstammungsprüfung',
  'app.parentage.cert.text':
    'Das signierte Abstammungsergebnis eines Labors, auf Midnight datiert. Der Inhaber hat belegt, dass es die Annahmekriterien von ICAR 2023 erfüllt, ohne die Genotypen oder die Zählungen zu zeigen. Das Labor hat die Genotypen gesehen. Mit der Abstammung vereinbar heißt nicht, dass die Abstammung bewiesen ist. VeilCore hat nichts untersucht.',
  'app.parentage.cert.bounds':
    'Belegt: höchstens 2 Konflikte mit dem Vater und höchstens 2 mit der Mutter, höchstens 3 im Trio und mindestens 175 mit jedem Elternteil verglichene SNPs. Das ICAR-Minimum von 165 SNPs, die beide Eltern gemeinsam haben, für das Trio wendet das Labor an; kein Beleg zeigt es.',
  'app.parentage.source.lab':
    'Die Zählungen des Labors, aus dem Ergebnis, das es signiert hat. Es sind Zählungen, keine Entscheidung eines Zuchtverbands.',
  'app.parentage.limits.labSaw':
    'Das Labor hat die drei Genotypen und die Zählungen gesehen, wie heute auch. Die Belege halten sie vor allen anderen verborgen, nicht vor dem Labor.',
  'app.parentage.limits.descent':
    'Mit der Abstammung vereinbar heißt nicht, dass die Abstammung bewiesen ist. Ein Tier, das mit dem tatsächlichen Elternteil eng verwandt ist, etwa ein Vollbruder des Vaters, kann die Prüfung bestehen.',
  'app.parentage.limits.which':
    'Welche Tiere untersucht wurden (über ihre Prüfcodes), das Panel und die Methode stehen in der Ergebnisdatei des Labors, nicht im Beleg. Der Beleg betrifft das Ergebnis, nicht den eigenen Datensatz des Tieres.',
  'app.parentage.limits.sample':
    'Ein Ergebnis sagt, was die unter diesen Datensätzen eingesandten Proben gezeigt haben. Es zeigt nicht, dass das Tier vor Ihnen das beprobte ist.',
  'app.parentage.limits.trioMin':
    'Das Formular hat keine Zahl für die SNPs, die beide Eltern gemeinsam haben (das ICAR-Minimum von 165 für das Trio). Dieses Minimum anzuwenden ist Sache des Labors, und kein Beleg zeigt es.',
  'app.parentage.limits.society':
    'Es ist keine Bescheinigung eines Zuchtverbands. VeilCore hat nichts untersucht und bürgt für kein Labor.',
  'app.parentage.unmet.trioParents':
    'ICAR bewertet das Trio erst, wenn beide Eltern akzeptiert sind. Daher wird kein Beleg zum Trio angeboten.',
  'app.parentage.unmet.grade.sireConflicts':
    'Das Labor hat den Vater nicht als akzeptiert bewertet. Daher wird kein Beleg zum Vater angeboten.',
  'app.parentage.unmet.grade.damConflicts':
    'Das Labor hat die Mutter nicht als akzeptiert bewertet. Daher wird kein Beleg zur Mutter angeboten.',
  'app.parentage.unmet.grade.trioConflicts':
    'Das Labor hat das Trio nicht als akzeptiert bewertet. Daher wird kein Beleg zum Trio angeboten.',
} satisfies Partial<AppTranslation>;
