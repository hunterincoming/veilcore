// German (Sie). DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md). Terms: see ./index.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const partners = {
  'app.partners.label': 'Für Partner',
  'app.partners.title': 'Verlangen Sie einen VeilCore-Datensatz.',
  'app.partners.titleEm': 'Prüfen kostet nichts. Kein Konto.',
  'app.partners.lede':
    'Wenn Ihre Mitgliedschaft, Sammlung, Ihr Register oder Marktplatz von Antragstellern einen VeilCore-Datensatz verlangt, können Sie jeden in Sekunden prüfen, in Ihrem eigenen Formular, ohne mit uns zu sprechen.',
  'app.partners.gives.title': 'Was Ihnen ein verlangter Datensatz bringt',
  'app.partners.gives.1.t': 'Eine feste Beschreibung',
  'app.partners.gives.1.d':
    'Der Datensatz wurde versiegelt, bevor der Antrag gestellt wurde. Zeigt man Ihnen die Beschreibung später, können Sie erkennen, ob es die versiegelte ist.',
  'app.partners.gives.2.t': 'Ein Datum',
  'app.partners.gives.2.d':
    'Sobald der Datensatz in einem datierten Stapel ist, kann jeder nachsehen, bis wann sein Prüfcode existierte. Das Datum stammt von Midnight, nicht von VeilCore oder vom Antragsteller.',
  'app.partners.gives.3.t': 'Laborsignaturen, geprüft',
  'app.partners.gives.3.d':
    'Empfangsbestätigungen für Proben und Laborberichte, jede Signatur geprüft, und ob der Betreiber von VeilCore den Namen des Labors mit einem öffentlichen Verzeichnis abgeglichen hat. Eine Empfangsbestätigung zählt nur, wenn das Register sie einer Lieferung des Datensatzes zuordnet, und Sie sehen, ob das Angekommene zum Gesendeten passt.',
  'app.partners.gives.4.t': 'Dieselbe Prüfung für alle',
  'app.partners.gives.4.d': 'Der Link jedes Antragstellers wird auf dieselbe Weise geprüft, von Ihrer Seite.',
  'app.partners.not.title': 'Was es nicht zeigt',
  'app.partners.not.lede':
    'VeilCore bürgt nie für etwas. Die Prüfung sagt, was geprüft wurde und auf wessen Angabe der Rest beruht. Sie entscheiden.',
  'app.partners.not.1': 'Was das Material ist. VeilCore sieht nie Genetik.',
  'app.partners.not.2': 'Dass die Beschreibung stimmt, nur dass sie sich nicht geändert hat.',
  'app.partners.not.3': 'Wer das Material oder den Datensatz heute hält.',
  'app.partners.not.4':
    'Dass die Arbeit eines Labors richtig ist. Ein geprüfter Name heißt, dass ein öffentliches Verzeichnis abgeglichen wurde, mehr nicht.',
  'app.partners.not.5': 'Abstammung, Rechte, Lizenzen oder rechtlichen Status.',
  'app.partners.demo.title': 'Ausprobieren',
  'app.partners.demo.lede':
    'Fügen Sie den Prüflink eines Datensatzes ein. Er wird in diesem Browser geprüft, gegen das Register, das diese Website nutzt. Nichts wird anderswohin gesendet, und nichts wird gespeichert.',
  'app.partners.demo.label': 'Prüflink eines VeilCore-Datensatzes',
  'app.partners.demo.loading': 'Das Feld wird geladen…',
  'app.partners.steps.title': 'Wer was tut',
  'app.partners.steps.applicant': 'Der Antragsteller',
  'app.partners.steps.applicant.1':
    'Legt für jede Akzession einen Datensatz an, auf veilcore.org oder in der eigenen Software.',
  'app.partners.steps.applicant.2': 'Öffnet den Datensatz, wählt „Jemandem zeigen“ und drückt „Link kopieren“.',
  'app.partners.steps.applicant.3':
    'Fügt den Link in Ihr Formular ein. Wenn Ihre Regeln es verlangen, sendet er auch das Nachweispaket des Datensatzes.',
  'app.partners.steps.you': 'Sie',
  'app.partners.steps.you.1':
    'Fügen das Feld Ihrem Formular hinzu (unten) oder fügen erhaltene Links in das Feld auf dieser Seite ein.',
  'app.partners.steps.you.2':
    'Entscheiden, was Sie annehmen: Der Link passt; oder zusätzlich datiert auf dem Hauptnetz von Midnight; oder zusätzlich eine Empfangsbestätigung eines Labors, dessen Name geprüft wurde.',
  'app.partners.steps.you.3': 'Bewahren das Prüfergebnis beim Antrag auf.',
  'app.partners.form.title': 'In Ihr Formular einbauen',
  'app.partners.form.lede':
    'Eine Datei, etwa 40 KB, von Ihrer Website ausgeliefert. Mit „required“ lässt sich das Formular erst absenden, wenn der Link zu einem passenden Datensatz führt und nichts dagegen spricht. Ändert der Antragsteller den Link, muss er erneut geprüft werden.',
  'app.partners.form.example': 'HTML-Beispiel',
  'app.partners.form.allowTest':
    'Nimmt auch Datensätze an, die auf einem Testnetz datiert sind. Zum Ausprobieren: Testdaten haben kein Gewicht, deshalb werden sie standardmäßig abgelehnt.',
  'app.partners.form.unreachable':
    'Ist das Register von VeilCore nicht erreichbar, geht das Formular durch, mit dem Link als nicht geprüft markiert (das Formular sendet dann auch <name>-unchecked). Ohne diese Option blockiert ein Pflichtfeld das ganze Formular, solange das Register nicht erreichbar ist.',
  'app.partners.form.csp':
    'Ihre Content Security Policy braucht script-src für den Ort, von dem Sie die Datei ausliefern, und connect-src für das Register. Keine Ausnahmen für Styles, Bilder oder Frames; es funktioniert mit Trusted Types. Keine Cookies, kein Speicher, kein Tracking.',
  'app.partners.form.status':
    'Noch nicht auf npm: Bauen Sie es aus partner-kit/record-check im VeilCore-Repository und liefern Sie die Datei von Ihrer Website aus.',
  'app.partners.facts.title': 'Bevor Sie sich darauf verlassen',
  'app.partners.facts.cost': 'Kosten',
  'app.partners.facts.cost.d':
    'Prüfen kostet nichts, für Sie und für alle anderen. Kein Konto, kein Schlüssel, kein Vertrag.',
  'app.partners.facts.support': 'Support',
  'app.partners.facts.support.d': 'E-Mail: <link></link>. Es gibt keine Supportvereinbarung und keine Antwortfrist.',
  'app.partners.facts.data': 'Daten',
  'app.partners.facts.data.d':
    'Eine Prüfung sendet dem Register die ID und den Prüfcode des Datensatzes, nichts über den Antragsteller oder Ihr Formular. Wie jede Website erhält das Register bei jeder Anfrage die Netzwerkadresse des Besuchers, für Ratenbegrenzungen. Was VeilCore speichert, steht auf der <link>Datenschutzseite</link>. Ausführlichere Datenbedingungen sind ein Entwurf, der geprüft wird; bis sie veröffentlicht sind, gilt die Datenschutzseite.',
  'app.partners.facts.down': 'Wenn das Register nicht erreichbar ist',
  'app.partners.facts.down.d':
    'Nichts kann geprüft werden. Standardmäßig blockiert ein Pflichtfeld dann das Formular, bis das Register wieder antwortet. Mit when-unreachable="allow" geht das Formular durch, mit dem Link als nicht geprüft markiert, und Sie prüfen ihn später auf dieser Seite.',
  'app.partners.facts.gone': 'Wenn VeilCore aufhört',
  'app.partners.facts.gone.d':
    'Das Feld und die Prüfseiten auf veilcore.org funktionieren dann nicht mehr. Datensätze lassen sich weiterhin über ihre Nachweispakete prüfen, die offline gegen ein offenes Format geprüft werden. Verlangen Sie Nachweispakete, wenn Ihr Programm nicht von VeilCore abhängen darf.',
  'app.partners.facts.npm': 'Noch nicht auf npm',
  'app.partners.facts.npm.d':
    'Bauen Sie das Kit aus dem VeilCore-Repository und liefern Sie die Datei des Feldes von Ihrer Website aus.',
  'app.partners.policy.title': 'Beispieltext für Ihre Regeln',
  'app.partners.policy.note': 'Beispieltext, keine Rechtsberatung. Passen Sie ihn an Ihre eigenen Regeln an.',
  'app.partners.policy.1':
    'Antragsteller müssen für jede hinterlegte Akzession einen Prüflink zu einem VeilCore-Datensatz angeben. Der Datensatz muss existieren, und der Link muss zu ihm passen. [Programm] prüft jeden Link beim Eingang des Antrags und bewahrt das Ergebnis beim Antrag auf.',
  'app.partners.policy.2':
    'Ein VeilCore-Datensatz ist die Angabe des Antragstellers zu seinem Material, mit Prüfcode und Datum. Die Annahme eines Datensatzes bedeutet nicht, dass [Programm] oder VeilCore bestätigt, was das Material ist, wer es hält oder irgendein Recht daran.',
  'app.partners.dev.title': 'Für Entwickler',
  'app.partners.dev.1': 'Ein Aufruf',
  'app.partners.dev.1.d':
    'checkRecord(link) liefert in Node oder im Browser einfaches JSON: recordExists, fingerprintMatches, dated (network, batch, transaction, block time, checkedOnChain), keyBound, labReceipts mit der Prüfung jedes Namens und whatThisDoesNotShow.',
  'app.partners.dev.2': 'Auf Midnight',
  'app.partners.dev.2.d':
    'In Node, mit installiertem @veilcore/contracts, wird der Datumsstempel auf der Chain nachgesehen: der festgelegte Vertrag von VeilCore, der festgelegte Build, genau diese Stapelwurzel.',
  'app.partners.dev.3': 'Kommandozeile',
  'app.partners.dev.3.d':
    'partner-kit check <link> gibt dieselbe Antwort aus. Exit 0: Der Datensatz existiert, der Link passt und nichts spricht dagegen. Exit 1: Etwas trifft nicht zu, auch ein Datum auf einem Testnetz (außer mit --allow-test-network) oder ein Inklusionsnachweis, der nicht aufgeht. Exit 2: Nichts konnte geprüft werden.',
  'app.partners.dev.4': 'Ohne VeilCore',
  'app.partners.dev.4.d':
    'Das Nachweispaket eines Datensatzes lässt sich offline prüfen, und das Format ist offen. Gibt es VeilCore nicht mehr, lassen sich Datensätze, deren Nachweispakete Sie haben, weiterhin prüfen.',
  'app.partners.dev.guide': 'Die ganze Anleitung lesen',
  'app.partners.dev.kit': 'Der Quellcode des Kits',
} satisfies Partial<AppTranslation>;
