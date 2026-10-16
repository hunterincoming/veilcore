// German (Sie). DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md). Terms as in ../../de.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const history = {
  'app.history.label': 'Zuchtverlauf (Entwurf)',
  'app.history.intro':
    'Diese Pflanze und die mit ihr verknüpften Eltern, die Sie hier halten, eine Zeile pro Datensatz, mit dem Datumsstempel und dem Nachweispaket jedes Datensatzes. Ein Entwurf zum Abschreiben für einen Sortenantrag. Keine Rechtsberatung.',
  'app.history.notEarlier':
    'Ein Datensatz datiert nichts vor dem Tag, an dem er versiegelt wurde. Jeder Schritt, der versiegelt wurde, als er geschah, trägt sein eigenes Datum; ein in der Woche des Antrags abgetippter Verlauf ist so viel wert wie jeder abgetippte Verlauf.',
  'app.history.oneFile':
    'Eine Datei mit einem druckbaren Zuchtverlauf (die Abstammungslinie, dann eine Zeile pro Datensatz: das von Ihnen angegebene Datum, sein Datumsstempel, die Stufe und worauf Sie selektiert haben, wie er entstand), gegliedert unter einfachen Überschriften für einen US-PVP-Antrag, einen Fragebogen im UPOV-Stil und einen japanischen Antrag. Felder für das, was VeilCore nicht hat (Homogenität, Beständigkeit, Varianten), bleiben für Sie leer. Ein einseitiges Deckblatt sagt, was es zeigt und was nicht, und das Nachweispaket jedes Datensatzes liegt bei.',
  'app.history.held.one': '{count} Datensatz, den Sie hier halten',
  'app.history.held.other': '{count} Datensätze, die Sie hier halten',
  'app.history.theirs.one': ', {count} verknüpfter Elternteil, den jemand anderes hält (als dessen aufgeführt)',
  'app.history.theirs.other': ', {count} verknüpfte Eltern, die jemand anderes hält (als dessen aufgeführt)',
  'app.history.named.one': ', {count} Elternteil ohne Datensatz genannt',
  'app.history.named.other': ', {count} Eltern ohne Datensatz genannt',
  'app.history.leftOut.one': ', {count} Datensatz ausgelassen (es werden die nächsten {max} genommen)',
  'app.history.leftOut.other': ', {count} Datensätze ausgelassen (es werden die nächsten {max} genommen)',
  'app.history.end': '.',
  'app.history.notPut':
    'Die Schlüssel Ihrer Datensätze und Laborberichtsdateien kommen nicht hinein. Wo ein Laborbericht bei einer Pflanze gespeichert ist, enthält ihr Nachweispaket den SHA-256 des Berichts und den Fingerabdruck, der ihn mit der Pflanze koppelt, sodass jeder, dem die Datei später gezeigt wird, sie abgleichen kann. VeilCore bürgt für nichts, was ein Datensatz sagt. Entwurf. Keine Rechtsberatung.',
  'app.history.downloaded':
    '{name} heruntergeladen. Öffnen Sie darin zuerst COVER-NOTE.html, dann breeding-history.html zum Drucken.',
} satisfies Partial<AppTranslation>;
