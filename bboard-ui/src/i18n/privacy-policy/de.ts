// German: the privacy policy (privacy-policy/en.ts is the source; docs/i18n-glossary.md for the terms).
// SPDX-License-Identifier: Apache-2.0
import type { PolicyStrings } from './index';

export const policyDe: PolicyStrings = {
  'm.pp.title': 'Datenschutzerklärung',
  'm.pp.updated': 'Zuletzt geändert am {date}.',
  'm.pp.lede':
    'Diese Erklärung gilt für veilcore.org: die Website, den Server von VeilCore, der Datensätze aufbewahrt (das Register), und den Dienst, der die Netzwerkgebühren von Midnight für Sie zahlt (den Gebührendienst). Sie sagt, was wir aufbewahren, was öffentlich ist, wer sonst was sieht und was Sie tun können.',

  'm.pp.short.t': 'Kurz gesagt',
  'm.pp.short.1':
    'Ihre DNA-Dateien, Laborberichtsdateien und Fotos verlassen Ihr Gerät nie. Ihr Browser macht aus jeder einen Code; die Datei selbst wird nie hochgeladen.',
  'm.pp.short.2':
    'Was Sie in einen Datensatz eingeben, wird in Ihrem Browser verschlossen, bevor es gesendet wird. Unser Server speichert es verschlossen, und wir haben den Schlüssel nicht.',
  'm.pp.short.3':
    'Unser Server kann lesen, was er zum Arbeiten braucht: die ID eines Datensatzes, seinen Prüfcode, wann er gespeichert wurde, und was Sie zeigen möchten. Die vollständige Liste steht unten.',
  'm.pp.short.4':
    'Nur Codes und was Sie belegen möchten landen in öffentlichen Netzwerken (Midnight und, über OpenTimestamps, Bitcoin). Was Sie eingegeben haben, landet dort nur, wenn Sie eine Zahl daraus genau belegen. Dort kann es niemand löschen, auch wir nicht.',
  'm.pp.short.5': 'Wir verkaufen Ihre Daten nicht. Keine Werbung, keine Analyse oder Verfolgung, keine Cookies.',
  'm.pp.short.6':
    'Sie können Ihre Datensätze herunterladen und löschen. Für alles andere schreiben Sie an hunter@veilcore.org.',

  'm.pp.who.t': 'Wer wir sind',
  'm.pp.who.p':
    'Die Gründer von VeilCore betreiben diese Website, das Register und den Gebührendienst. Schreiben Sie uns an hunter@veilcore.org.',

  'm.pp.device.t': 'Was auf Ihrem Gerät bleibt',
  'm.pp.col.what': 'Was',
  'm.pp.device.col': 'Was damit geschieht',
  'm.pp.device.files.t': 'DNA-Berichte, Laborberichtsdateien und Fotos, die Sie hinzufügen',
  'm.pp.device.files.p':
    'Ihr Browser liest jede Datei, um ihren Code (ihren SHA-256) zu bilden. Die Datei wird nie hochgeladen.',
  'm.pp.device.vault.t': 'Der Schlüssel, der Ihre Datensätze verschließt',
  'm.pp.device.vault.p':
    'Liegt in Ihrem Browser und Ihrer Sicherungsdatei und wird nie unverschlossen an uns gesendet. Wenn Sie „Bei VeilCore gespeichert“ einschalten, kommt er in eine verschlossene Kopie, die nur Ihr Passkey oder Ihr Wiederherstellungsblatt öffnet.',
  'm.pp.device.recordkeys.t': 'Die geheimen Schlüssel jedes Datensatzes',
  'm.pp.device.recordkeys.p':
    'Liegen in Ihrem Browser und Ihrer Sicherungsdatei. Eine verschlossene Kopie geht mit dem Datensatz an unseren Server, damit Ihre Sicherungskopie sie zurückbringt.',
  'm.pp.device.labkey.t': 'Der private Signaturschlüssel eines Labors',
  'm.pp.device.labkey.p':
    'Liegt im Browser des Labors und in seiner Sicherungsdatei. Nur der öffentliche Schlüssel wird unverschlossen an uns gesendet. Mit „Bei VeilCore gespeichert“ kommt auch der private Schlüssel in Ihre verschlossene Kopie.',
  'm.pp.device.deviceonly.t': 'Ein Dokument, das Sie nur auf diesem Gerät aufbewahren',
  'm.pp.device.deviceonly.p':
    'Nichts, was Sie darin eingeben, wird an uns gesendet, weder verschlossen noch offen. Wir erhalten seine ID, seinen Prüfcode und seine Schlüsselbindung, damit es datiert werden kann. Mit „Bei VeilCore gespeichert“ kommen seine ID und seine Schlüssel, nicht was Sie eingegeben haben, auch in Ihre verschlossene Kopie. Wir können es nicht zurückgeben: Bewahren Sie die Sicherungsdatei auf, um die die App Sie bittet.',
  'm.pp.device.scan.t': 'Die Kamera, wenn Sie einen Code scannen',
  'm.pp.device.scan.p':
    'Das Bild wird in der Seite gelesen und verworfen. Nur der gelesene Text kommt in das Feld, in das Sie gescannt haben, und von dort nur dorthin, wohin dieses Feld ohnehin geht.',
  'm.pp.device.labels.t': 'QR-Etiketten, die Sie drucken',
  'm.pp.device.labels.p':
    'Auf Ihrem Gerät gezeichnet und von Ihrem Browser gedruckt. Ein Etikett trägt die ID und den Prüfcode des Datensatzes, und seinen Namen nur, wenn Sie das ankreuzen.',
  'm.pp.device.sheet.t': 'Der Code Ihres Wiederherstellungsblatts',
  'm.pp.device.sheet.p':
    'Auf Ihrem Gerät erstellt und von dort gedruckt. Er wird nie an uns gesendet und nicht auf dem Gerät gespeichert.',
  'm.pp.device.passkey.t': 'Die Passkey-Prüfseite',
  'm.pp.device.passkey.p': 'Testet Ihren Passkey in Ihrem Browser. Es wird nichts gesendet.',
  'm.pp.device.import.t': 'Eine Tabelle, die Sie importieren',
  'm.pp.device.import.p':
    'Wird in Ihrem Browser gelesen und nie hochgeladen. Für jede Zeile werden nur die Angaben gespeichert, die Sie auswählen, verschlossen wie bei jedem Datensatz. Ihr Browser behält die Zeilen Ihres letzten Imports (jede Spalte, den Dateinamen und das Ergebnis jeder Zeile), bis Sie Ihre nächste Datei wählen oder „Entfernen“ oder „Eine weitere Datei importieren“ drücken. Wenn Sie sich die Spalten einer Tabelle merken lassen, behält er außerdem ihre Namen, welche Spalte was ist, die Zeile, in der sie stehen, und die dort gesetzten Vorgaben (Züchter, Art, ID-System und Datumsreihenfolge), bis Sie „Vergessen“ drücken, für bis zu 20 Tabellen (die am längsten nicht benutzte fällt zuerst weg). Keines von beiden wird an uns gesendet.',
  'm.pp.device.ask.t': '„Fragen“, der Helfer in der App',
  'm.pp.device.ask.p':
    'Arbeitet auf Ihrem Gerät. Was Sie dort eintippen, wird nicht gesendet. Nur Speichern sendet, oder die Freigabe eines Auftrags „Für mich erledigen“, der dann genau das speichert, als Bericht sendet oder datiert, was Sie freigegeben haben. Ein Auftrag bleibt nur auf Ihrem Gerät und wird 7 Tage nach seinem Ende gelöscht.',

  'm.pp.browser.t': 'Was Ihr Browser speichert',
  'm.pp.browser.p1':
    'Die Website legt Folgendes im Speicher Ihres Browsers auf diesem Gerät ab. Manches davon ist geheim: Wer den Speicher dieses Browsers lesen kann, könnte es benutzen, und wenn Sie ihn löschen, ist es weg, außer es steckt in Ihrer Sicherungsdatei.',
  'm.pp.browser.records.t': 'Ihre Datensätze und ihre Geheimnisse',
  'm.pp.browser.records.p':
    'Ihre Datensätze, ein Datensatz, den Sie noch nicht fertig haben, nur auf diesem Gerät aufbewahrte Dokumente, Speicherungen, die auf das Senden warten, Aufträge „Für mich erledigen“ sowie die Zeilen Ihres letzten Tabellenimports und Spalten, die Sie sich merken lassen. Geheim sind: Ihr Inhaberschlüssel (der Schlüssel, der Ihre Datensätze auf unserem Server findet), der Schlüssel, der Ihre Datensätze verschließt, die geheimen Schlüssel jedes Datensatzes und der Signaturschlüssel eines Labors. Ihre Sicherungsdatei enthält diese Schlüssel und Ihre Datensätze. Speicherungen, die auf das Senden warten, gehen verschlossen an unseren Server, mit Ihrem Inhaberschlüssel, wie jede Speicherung. Wo der Browser von selbst senden kann (Chrome), liegen dort auch Datensätze, die auf ihr Datum warten, mit Ihrem Inhaberschlüssel, bis wieder Netz da ist. Mit „Bei VeilCore gespeichert“ speichert er außerdem zwei aus Ihrem Kontoschlüssel gebildete Schlüssel, die die Seite benutzen, aber nicht auslesen kann.',
  'm.pp.browser.deals.t': 'Lizenzen und Lizenzgeschäfte',
  'm.pp.browser.deals.p':
    'Die Lizenzen, die Sie vergeben oder halten, signierte, noch nicht zugestellte Nachrichten eines Lizenzgeschäfts (verschlossen, bis zu 30 Tage), die Ansprüche eines Kreditgebers und die Schlüssel von Zahlungspartnern, die Sie benannt haben. Geheim sind: das Geheimnis hinter jeder Lizenz, die Sie halten, die Schlüssel Ihrer Lizenzgeschäfte und die Geheimnisse eines Kreditgebers. Ihre Sicherungsdatei enthält sie. Lizenzen und Nachrichten der Geschäfte gehen verschlossen an unseren Server. Die Partnerschlüssel, die Sie benennen, werden nie gesendet.',
  'm.pp.browser.moving.t': 'Was Sie empfangen oder senden',
  'm.pp.browser.moving.p':
    'Laborcodes, die Sie erstellt oder erhalten haben, ein Code, den Sie gerade empfangen, bis sein Datensatz gespeichert ist, mit dem, was der Absender dazu geschickt hat, Namen, die Sie Empfängern gegeben haben, und Lieferschlüssel, die darauf warten, dass ihr Datensatz gespeichert wird, welche Laborberichte Sie geöffnet haben, Ihre Anfragen, den Schlüssel eines Datensatzes nachzuweisen (7 Tage lang), eine Anfrage, die Ihnen die Website eines Partners geschickt hat (in diesem Tab, bis zu einer Stunde), und Datumsstempel für Schlüssel oder Datierungen von Laborberichten, die noch ausstehen. Geheim sind: die Codes und die Lieferschlüssel. Ihre Sicherungsdatei enthält die Laborcodes, die Sie erstellt haben, und die Lieferungen eines Labors, aber keinen Code, den Sie noch empfangen. Empfängernamen und Lieferschlüssel gehen in der verschlossenen Kopie des Datensatzes an unseren Server.',
  'm.pp.browser.settings.t': 'Einstellungen und „schon gesehen“-Markierungen',
  'm.pp.browser.settings.p':
    'Ihre Sprache und Rolle, Ihre Entscheidungen, Hinweise, die Sie geschlossen haben, welche Datensätze aus einer Sicherung kamen oder aus diesem Browser entfernt wurden, was eine geprüfte Sicherung enthält, ein zufälliges Ticket für den Gebührendienst und kurzlebige Markierungen, die verhindern, dass zwei Tabs dasselbe tun. Keine davon enthält einen Schlüssel oder etwas, das Sie eingegeben haben. Das Ticket geht an den Gebührendienst, und die ID der gespeicherten Kopie geht an unseren Server, wenn die Kopie gespeichert oder geprüft wird.',
  'm.pp.browser.caches.t': 'Zwischenspeicher mit öffentlichen Dateien',
  'm.pp.browser.caches.p':
    'Eine Kopie des Codes dieser Website, damit sie ohne Netz öffnet, und die öffentlichen Dateien, die Ihr Browser braucht, um einen Beweis für Midnight zu erstellen, einmal von dieser Website geladen. Nichts von Ihnen.',
  'm.pp.browser.p2':
    'Keine Cookies. Um alles zu entfernen, löschen Sie die Daten dieser Website in den Einstellungen Ihres Browsers. Speichern Sie vorher Ihre Sicherungskopie: Ohne sie können Sie Ihre Datensätze nicht mehr finden oder öffnen. Was nicht in Ihrer Sicherung steckt, etwa ein Code, den Sie noch empfangen, oder ein unfertiger Datensatz, ist dann endgültig verloren. Den Namen jedes gespeicherten Eintrags finden Sie unter „Technische Einzelheiten“ am Ende.',

  'm.pp.server.t': 'Was unser Server aufbewahrt',
  'm.pp.server.p':
    'Unser Server ist das Register von VeilCore, gehostet bei Railway. „Verschlossen“ heißt: Ihr Browser hat es vor dem Senden verschlossen, und wir haben den Schlüssel nicht.',
  'm.pp.col.read': 'Können wir es lesen?',
  'm.pp.col.keep': 'Wie lange',
  'm.pp.server.records.t':
    'Ihre Datensätze und Vereinbarungen: Name, Züchter, Art, Daten, Notizen, Referenznummern und Eltern jedes Datensatzes, die Codes und Dateinamen der Fotos und Laborberichte, die Sie hinzufügen, Vertragsbedingungen und die andere Seite, die Namen, die Sie Empfängern geben, und die geheimen Schlüssel jedes Datensatzes',
  'm.pp.server.records.read': 'Nein. Verschlossen.',
  'm.pp.server.records.keep': 'Bis Sie es löschen oder uns darum bitten',
  'm.pp.server.facts.t':
    'Zu jedem Datensatz: seine ID, sein Prüfcode, seine Schlüsselbindung und seine Art; ein Code aus seinem Namen, der ohne den Schlüssel in Ihrem Prüflink nichts über den Namen verrät; seine Korrekturverweise; wann unser Server ihn zuerst gesehen hat; wie oft er gespeichert wurde und wann zuletzt; ungefähr wie groß er ist; die Elternverknüpfungen, die Sie registrieren; sein Stapel und seine Zeitstempel',
  'm.pp.server.facts.read':
    'Ja. Jeder mit der ID des Datensatzes sieht seinen Prüfcode, wann unser Server ihn zuerst gesehen hat, seine Korrekturverweise, seinen Stapel und seine Zeitstempel und ob er Laborsignaturen hat.',
  'm.pp.server.facts.keep': 'So lange wie der Datensatz',
  'm.pp.server.shown.t':
    'Was Sie auf der Prüfseite eines Datensatzes zeigen möchten, etwa seinen Namen, die Signatur eines Labors oder ob ein DNA-Bericht gespeichert ist (als Code)',
  'm.pp.server.shown.read': 'Ja. Jeder mit der ID des Datensatzes sieht es.',
  'm.pp.server.shown.keep': 'Bis Sie es ausschalten oder den Datensatz löschen',
  'm.pp.server.holder.t': 'Ihr Inhaberschlüssel, den Ihr Browser bei jedem Speichern mitsendet',
  'm.pp.server.holder.read': 'Wir behalten davon nur einen Einweg-Hash.',
  'm.pp.server.holder.keep':
    'So lange wie Ihre Datensätze, danach neben jedem gelöschten Datensatz und jedem Prüfcode, den Sie gehalten haben',
  'm.pp.server.copy.t':
    '„Bei VeilCore gespeichert“: eine verschlossene Kopie dessen, was Ihre Sicherungsdatei enthält, außer den Datensätzen selbst (Ihre Schlüssel, Laborcodes sowie Lizenz- und Geschäftsschlüssel), und ein verschlossener Schlüssel für jeden Zugang (einen Passkey oder ein Wiederherstellungsblatt)',
  'm.pp.server.copy.read':
    'Nein. Verschlossen. Wir sehen, welche Zugänge welche Kopie öffnen und welcher Art sie sind, die ungefähre Größe der Kopie und wann sie gespeichert oder geprüft wird. Uns wird nicht gesagt, von wem die Kopie stammt, aber Zeitpunkt und Adresse einer Speicherung könnten uns erraten lassen, zu welchen Datensätzen sie passt.',
  'm.pp.server.copy.keep': 'Bis Sie „Nicht mehr bei VeilCore speichern“ wählen',
  'm.pp.server.delivery.t':
    'Laborcodes (Lieferungen): aus welchem Datensatz eine Lieferung stammt, welches Konto sie empfangen hat und wann, und ein Kennzeichen anstelle des Empfängernamens. Menge, Notiz und Probenangaben (Proben-ID, Siegelnummer, wo und wann die Probe genommen wurde, ein Zeuge, wie sie ankam) sind mit einem Schlüssel verschlossen, der im Laborcode steckt.',
  'm.pp.server.delivery.read': 'Teilweise. Die Angaben sind verschlossen.',
  'm.pp.server.delivery.keep': 'Keine feste Frist',
  'm.pp.server.labs.t':
    'Labore: der öffentliche Schlüssel eines Labors, der Name, die Rolle und die Website, die es angibt, unsere Notizen zur Prüfung seines Namens und die Signaturen, die es erstellt. Empfangsbestätigungen und Berichte eines Labors zu Ihrem Datensatz sehen nur Sie, das Labor und wer ihm die Probe geschickt hat, außer Sie möchten sie zeigen.',
  'm.pp.server.labs.read': 'Ja',
  'm.pp.server.labs.keep': 'Keine feste Frist',
  'm.pp.server.results.t': 'Laborberichte, die ein Labor Ihnen schickt',
  'm.pp.server.results.read': 'Nein. Verschlossen mit dem Schlüssel Ihres Datensatzes.',
  'm.pp.server.results.keep':
    '180 Tage nach Eingang gelöscht. Kopien in unseren Sicherungskopien bleiben, bis diese entfernt werden.',
  'm.pp.server.prove.t':
    'Anfragen, den Schlüssel eines Datensatzes nachzuweisen: der Name, den der Fragende eingegeben hat, und die Antworten. Unser Server erfährt, welchen On-Chain-Schlüssel jede Anfrage nennt.',
  'm.pp.server.prove.read': 'Ja, und auch jeder mit dem Link der Anfrage',
  'm.pp.server.prove.keep': 'Nach 7 Tagen gelöscht',
  'm.pp.server.invites.t':
    'Lizenzeinladungen: die Bezeichnung, die Sie der anderen Seite geben, für welchen Datensatz sie gilt, und die Codes und Transaktions-IDs, die die beiden Browser austauschen',
  'm.pp.server.invites.read': 'Ja, und auch jeder mit dem Link der Einladung',
  'm.pp.server.invites.keep': 'Nach 30 Tagen gelöscht',
  'm.pp.server.deals.t':
    'Die Nachrichten eines Lizenzgeschäfts: die Bedingungen, Berichte über Lizenzgebühren und Antworten darauf, „Ich habe gezahlt“, „Erhalten“ sowie Auszahlungs- und Geschäftsangaben',
  'm.pp.server.deals.read':
    'Nein. Verschlossen mit einem Schlüssel, den nur die beiden Seiten teilen. Wir sehen, zu welcher Lizenz sie gehören, wie viele es sind und wann jede ankam.',
  'm.pp.server.deals.keep':
    'Bis eine Seite uns bittet, sie zu löschen. Ein Geschäft ohne Nachrichten wird nach 7 Tagen gelöscht.',
  'm.pp.server.notices.t':
    'Lizenzzeilen auf der Prüfseite eines Datensatzes (ein überfälliger Bericht, eine Mitteilung über einen Vertragsverstoß, widerrufen) und die Antwort der anderen Seite darauf (ihre Art und ihr Datum)',
  'm.pp.server.notices.read': 'Ja. Jeder mit der ID des Datensatzes sieht sie.',
  'm.pp.server.notices.keep': 'Bis die Zeile entfernt oder der Datensatz gelöscht wird. Antworten bleiben gespeichert.',
  'm.pp.server.obligations.t':
    'Eine Lizenzgebühr auf Nachkommen: welchen Datensatz sie betrifft und seit wann sie gilt. Jeder kann fragen, ob ein Datensatz eine trägt.',
  'm.pp.server.obligations.read': 'Ja',
  'm.pp.server.obligations.keep': 'So lange wie die Lizenz',
  'm.pp.server.receipts.t':
    'Die Quittung eines Zahlungspartners für einen Bericht über Lizenzgebühren: Betrag, Währung, das bezahlte Konto, ihre Referenz und wann',
  'm.pp.server.receipts.read':
    'Ja, von jedem, der den Code des Berichts hat; den haben nur die beiden Seiten und ihr Partner.',
  'm.pp.server.receipts.keep': 'Keine feste Frist',
  'm.pp.server.batches.t':
    'Stapel: der Prüfcode jedes Datensatzes, der Nachweis, dass er in seinem Stapel ist, der Code des Stapels, wo er verankert wurde, sein Bitcoin-Stempel und seine Zeitstempel',
  'm.pp.server.batches.read': 'Ja',
  'm.pp.server.batches.keep': 'Bleiben: Sie machen alte Datensätze prüfbar',
  'm.pp.server.logs':
    'Unser Register führt kein Protokoll der Anfragen und hält nicht fest, wer eine Prüfseite angesehen hat. Gegen Missbrauch zählt es Anfragen je Netzwerkadresse nur im Arbeitsspeicher; die Zählungen sind nach einem Neustart weg. Um Zeitstempel-Anfragen zu begrenzen, behält es außerdem einen Tag lang, wann jeder Inhaberschlüssel einen angefragt hat. Der Gebührendienst protokolliert nur Zähler und Ergebnisse, nie, was gesendet wurde. Unsere Hoster führen eigene Anfrageprotokolle (siehe unten).',
  'm.pp.server.purge':
    'Text, der gespeichert wurde, bevor Datensätze verschlossen wurden, wurde am 18. Oktober 2026 von unserem Server entfernt, und die Sicherungskopien von davor lassen sich nicht mehr öffnen: Wir haben ihren Schlüssel am selben Tag vernichtet.',
  'm.pp.server.backup':
    'Sicherungskopien: Einmal am Tag werden die Daten unseres Registers und die verschlossenen Laborberichtsdateien mit einem Schlüssel verschlüsselt, den unser Server nie hat, und bei Backblaze B2 gespeichert. Der Speicher ist so eingestellt, dass jede Kopie 30 Tage gesperrt ist, sodass niemand sie früher löschen kann; wie lange Kopien danach bleiben, ist noch nicht festgelegt. Ein Datensatz, den Sie löschen, bleibt in den Sicherungskopien von davor, bis diese entfernt werden.',

  'm.pp.chain.t': 'Was dauerhaft öffentlich ist',
  'm.pp.chain.p1':
    'Midnight und Bitcoin sind öffentliche Netzwerke. Was dort landet, kann niemand ändern oder entfernen, auch wir nicht, und jeder kann es lesen. Was Sie eingegeben haben und Ihre Dateien landen dort nie, außer einer Zahl, die Sie genau belegen möchten (unten). Was dort landet:',
  'm.pp.chain.1':
    'der Code jedes Stapels von Datensätzen (ein Code, der für jeden Datensatz darin steht), auf Midnight und, über OpenTimestamps, auf Bitcoin;',
  'm.pp.chain.2': 'der eigene Schlüssel eines Datensatzes und sein Datumsstempel, wenn Sie ihn datieren;',
  'm.pp.chain.3': 'ein Code aus einem DNA-Bericht, wenn Sie dessen Kopplung datieren;',
  'm.pp.chain.4':
    'welche Datensätze als Eltern und Nachkommen verknüpft sind, sobald beide Datensatzinhaber bestätigen;',
  'm.pp.chain.5':
    'dass auf einem Datensatz eine Lizenz, eine Verpflichtung oder der Anspruch eines Kreditgebers vermerkt ist, und wann sich das geändert hat;',
  'm.pp.chain.6': 'der öffentliche Schlüssel eines Labors, wenn es dort ein Zertifikat signiert;',
  'm.pp.chain.7':
    'was Sie über eine Zahl belegen möchten: die Grenze und ihre Richtung oder, wenn Sie die Zahl genau belegen, die Zahl selbst. Ein Abstammungsergebnis belegt nur, dass seine Konfliktzahlen und verglichenen SNPs innerhalb der Grenzen der ICAR liegen; kein Genotyp und keine Zählung wird veröffentlicht.',
  'm.pp.chain.p2':
    'Unser Gebührendienst verankert jeden Stapel. Bei den anderen Schritten zeigt die App zuerst eine Quittung, die genau auflistet, was der Schritt öffentlich macht, und Ihr Browser sendet ihn über unseren Gebührendienst, der die Gebühr zahlt. Ein Code oder Schlüssel allein sagt nichts über Sie, aber wer von Ihnen einen Prüflink bekommt, kann von da an verfolgen, was mit diesem Datensatz im Netzwerk geschieht.',

  'm.pp.ts.t': 'Zeitstempel, und Prüfen auf Bitcoin',
  'm.pp.ts.p1':
    'Wenn unser Server den Prüfcode eines Datensatzes annimmt, bittet er einen oder mehrere Zeitstempeldienste (unabhängige Dienste, manche von einer einzelnen Person betrieben) um einen Zeitstempel darauf, und auf jeden Stapel. Jeder Dienst erhält einen aus dem Prüfcode gebildeten Code und den Zeitpunkt der Anfrage und kann ein Protokoll darüber führen. Da Prüfcodes auf Prüfseiten erscheinen, könnte ein Dienst sein Protokoll einem Prüflink zuordnen. Wer einen Prüflink hat, kann sekundengenau lesen, wann unser Server den Prüfcode dieses Datensatzes angenommen hat. Bei einem ohne Netz versiegelten Datensatz ist das, wann Ihr Gerät wieder Netz hatte.',
  'm.pp.ts.p2':
    'Die Prüfseite eines Datensatzes kann seinen Bitcoin-Stempel selbst prüfen. Nur wenn Sie „Auf Bitcoin prüfen“ drücken, fragt Ihr Browser zwei Block-Explorer, mempool.space und blockstream.info, nach Block-Headern. Sie sehen Ihre IP-Adresse, dass ein Stapel von VeilCore geprüft wird, und welchen Block; nicht den Datensatz. Ein Beweispaket tut dasselbe nur, wenn Sie „Bitcoin-Block-Header beifügen“ ankreuzen.',

  'm.pp.others.t': 'Wer sonst mit Daten umgeht',
  'm.pp.others.p': 'Diese Dienste arbeiten für uns, oder es sind die öffentlichen Netzwerke, die wir nutzen.',
  'm.pp.col.service': 'Dienst',
  'm.pp.col.does': 'Was er tut',
  'm.pp.col.gets': 'Was er erhält',
  'm.pp.others.vercel.n': 'Vercel',
  'm.pp.others.vercel.does': 'Hostet diese Website',
  'm.pp.others.vercel.gets':
    'Ihre IP-Adresse und die Seiten und Dateien, die Sie laden, auch die Adresse einer Prüfseite, die ID und Prüfcode des Datensatzes enthält. Vercel führt Anfrageprotokolle.',
  'm.pp.others.railway.n': 'Railway',
  'm.pp.others.railway.does':
    'Betreibt unser Register, den Gebührendienst und das Relais, über das Ihr Browser Midnight liest',
  'm.pp.others.railway.gets':
    'Ihre IP-Adresse und Ihre Anfragen an diese Dienste (das Prüfen eines Datensatzes nennt seine ID), und die gespeicherten Daten des Registers. Railway führt Anfrageprotokolle.',
  'm.pp.others.blockfrost.n': 'Blockfrost',
  'm.pp.others.blockfrost.does': 'Verbindet unseren Gebührendienst und unser Relais mit Midnight',
  'm.pp.others.blockfrost.gets':
    'Die Transaktionen, die der Gebührendienst sendet, und die Fragen des Relais (was die App und Prüfseiten auf Midnight nachschlagen). Sie kommen von unserem Dienst, nicht von Ihrem Browser.',
  'm.pp.others.midnight.n': 'Das Midnight-Netzwerk',
  'm.pp.others.midnight.does': 'Datiert Stapel und hält fest, was Ihr Browser sendet',
  'm.pp.others.midnight.gets': 'Öffentliche Transaktionen (siehe oben)',
  'm.pp.others.ots.n': 'OpenTimestamps-Kalender',
  'm.pp.others.ots.does': 'Stempeln die Codes der Stapel auf Bitcoin',
  'm.pp.others.ots.gets': 'Die Codes der Stapel, von unserem Register',
  'm.pp.others.tsa.n': 'Zeitstempeldienste, etwa FreeTSA und DigiCert',
  'm.pp.others.tsa.does': 'Stempeln jeden Prüfcode und jeden Stapel mit der Zeit',
  'm.pp.others.tsa.gets': 'Einen aus jedem gebildeten Code und wann er angefragt wurde, von unserem Register',
  'm.pp.others.explorers.n': 'Bitcoin-Block-Explorer: mempool.space und blockstream.info',
  'm.pp.others.explorers.does':
    'Prüfen Bitcoin-Stempel: Unser Register fragt sie für jeden Stapel, Ihr Browser nur, wenn Sie es wollen',
  'm.pp.others.explorers.gets':
    'Welchen Block. Von Ihrem Browser außerdem Ihre IP-Adresse und dass ein Stapel von VeilCore geprüft wird.',
  'm.pp.others.backblaze.n': 'Backblaze B2',
  'm.pp.others.backblaze.does': 'Bewahrt unsere Sicherungskopien auf',
  'm.pp.others.backblaze.gets': 'Verschlüsselte Dateien, die es nicht öffnen kann',
  'm.pp.others.labsite.n': 'Die eigene Website eines Labors',
  'm.pp.others.labsite.does':
    'Nennt ein Labor seine Website, prüft unser Register täglich, ob sie den Schlüssel des Labors aufführt',
  'm.pp.others.labsite.gets': 'Eine Anfrage von unserem Register. Nichts über Sie.',
  'm.pp.others.passkey.n': 'Ihr Passkey-Anbieter, etwa der iCloud-Schlüsselbund oder der Google Passwortmanager',
  'm.pp.others.passkey.does':
    'Bewahrt den Passkey auf, den Sie für „Bei VeilCore gespeichert“ nutzen, nach seinen eigenen Bedingungen',
  'm.pp.others.passkey.gets': 'Dass Sie einen Passkey für veilcore.org haben. Den Passkey erhalten wir nie.',
  'm.pp.others.links':
    'Seiten hier verlinken auf andere Websites, etwa Midnight-Explorer, GitHub und die Dokumente, die wir zitieren. Wenn Sie eine öffnen, ist das eine Sache zwischen Ihnen und dieser Website.',

  'm.pp.dont.t': 'Was wir nicht tun',
  'm.pp.dont.1': 'Wir verkaufen oder vermieten Ihre Daten nicht und geben sie nicht für Werbung weiter.',
  'm.pp.dont.2':
    'Keine Werbung, keine Analyse, keine Tracking-Pixel, keine Skripte oder Schriften von Dritten und keine Cookies.',
  'm.pp.dont.3': 'VeilCore bürgt für keinen Datensatz, keinen Züchter und kein Labor.',

  'm.pp.pay.t': 'Zahlungen',
  'm.pp.pay.p':
    'Diese Website nimmt keine Zahlungen an, und VeilCore hält oder bewegt nie Geld. Lizenzgebühren zahlen die beiden Seiten untereinander oder über einen Zahlungspartner, den sie wählen (seine Quittung steht oben). Bevor hier eine Zahlungsfunktion eingeschaltet wird, ändern wir diese Seite.',

  'm.pp.rights.t': 'Was Sie tun können',
  'm.pp.rights.see.t': 'Einsehen und herunterladen',
  'm.pp.rights.see.p':
    'Auf Ihrer Datensatzseite unter „Mehr“: „Alle Datensätze exportieren“ lädt herunter, was dieser Browser hält, und „Ihre Datensätze und Vereinbarungen von VeilCore herunterladen“ lädt Ihre Datensätze, Lizenzen und Freigabe-Einstellungen so herunter, wie unser Server sie aufbewahrt. Nicht enthalten sind Lieferungen mit ihren Probenangaben, Laborberichte und -signaturen, Lizenzgebühren auf Nachkommen, Lizenzeinladungen, Nachrichten zu Vereinbarungen, Nachweis-Anfragen und Zeitstempel einzelner Datensätze; Lieferungen und Laborberichte öffnen Sie in der App bei der Lieferung. Ihre Schlüssel stehen in Ihrer Sicherungsdatei (Einstellungen, „Kopie herunterladen“). Für alles andere schreiben Sie uns.',
  'm.pp.rights.delete.t': 'Löschen',
  'm.pp.rights.delete.p':
    '„Diesen Datensatz löschen“ auf der Seite eines Datensatzes entfernt seine Angaben, seine verschlossene Kopie und alles, was Sie gezeigt haben, endgültig von unserem Server. „Nicht mehr bei VeilCore speichern“ in den Einstellungen löscht Ihre gespeicherte Kopie und jeden Zugang dazu. Für alles andere, etwa Nachrichten zu Vereinbarungen, Lieferungen oder alles auf einmal, schreiben Sie an hunter@veilcore.org und nennen Sie die IDs.',
  'm.pp.rights.keep.t': 'Was sich nicht löschen lässt',
  'm.pp.rights.keep.p':
    'Alles auf Midnight oder Bitcoin. Nach dem Löschen eines Datensatzes behält unser Server seine ID, seinen Prüfcode, wann er gelöscht wurde, und einen Einweg-Hash Ihres Inhaberschlüssels, damit seine Prüflinks sagen können, dass sein Inhaber ihn gelöscht hat, und niemand ihn wiederverwenden kann. Er behält außerdem dauerhaft jeden Prüfcode, den ein Inhaberschlüssel gehalten hat, mit diesem Hash und dem Zeitpunkt, ab dem er gehalten wurde. Bereits vermerkte Elternverknüpfungen und Verpflichtungen bleiben, ebenso Signaturen, die ein Labor schon erstellt hat. Sicherungskopien von vor der Löschung behalten ihre Kopie, bis sie entfernt werden. Kopien, die andere schon haben, etwa ein Prüflink, den Sie geschickt haben, bleiben bei ihnen.',
  'm.pp.rights.fix.t': 'Berichtigen',
  'm.pp.rights.fix.p':
    'Ein versiegelter Datensatz kann sich nicht ändern. Um einen zu berichtigen, versiegeln Sie einen neuen Datensatz, der auf den alten verweist.',
  'm.pp.rights.ask.t': 'Uns fragen',
  'm.pp.rights.ask.p':
    'Schreiben Sie an hunter@veilcore.org, um zu erfahren, was wir über Sie aufbewahren, oder um es löschen oder berichtigen zu lassen. Nennen Sie die IDs der betroffenen Datensätze: Unser Server findet Datensätze über ihre IDs oder Ihren Inhaberschlüssel, nicht über Ihren Namen.',

  'm.pp.changes.t': 'Änderungen dieser Erklärung',
  'm.pp.changes.p': 'Jede Änderung veröffentlichen wir hier mit ihrem Datum, bevor sie gilt.',

  'm.pp.tech.t': 'Technische Einzelheiten',
  'm.pp.tech.storage':
    'Speicher im Browser, nach Gruppen: jeder Name, den die Website auf veilcore.org verwendet. Local Storage, wenn nicht anders angegeben.',
  'm.pp.tech.storage.records':
    'Ihre Datensätze und ihre Geheimnisse: veilcore.holder.v1 (Inhaberschlüssel), veilcore.vault.v1 (der Schlüssel, der Ihre Datensätze verschließt), veilcore.vault.made.v1 (wann dieser Schlüssel erstellt wurde), veilcore.records.v1 (Datensätze), veilcore.record-keys.v1 (Schlüssel der Datensätze), veilcore.attester.v1 (der Signaturschlüssel eines Labors), veilcore.log-draft.v1 (ein unfertiger Datensatz), veilcore.device-only.v1 (nur auf diesem Gerät aufbewahrte Dokumente), veilcore.outbox.v1 (Speicherungen, die auf das Senden warten), veilcore.unsure.v1 (ein Datensatz, dessen Korrektur keine klare Antwort bekam, bis er geprüft ist), veilcore.bulk-import.job.v1 (die Zeilen Ihres letzten Imports), veilcore.import-layouts.v1 (Spalten, die Sie sich merken lassen), veilcore.bulk-import.v1 (welche importierte Zeile zu welchem Datensatz wurde). IndexedDB: veilcore-offline (Datensätze, die auf ihr Datum warten, mit dem Inhaberschlüssel), veilcore.account.v1 (die zwei aus Ihrem Kontoschlüssel gebildeten Schlüssel), veilcore.ask.job.v1 (Aufträge von „Fragen“).',
  'm.pp.tech.storage.deals':
    'Lizenzen und Lizenzgeschäfte: veilcore.licenses.v1 (Lizenzen), veilcore.held-licenses.v1 (Lizenzen, die Sie halten, mit ihren Geheimnissen), veilcore.issuer-deals.v1 (Schlüssel der Lizenzgeschäfte), veilcore.deal-outbox.v1.<deal> (noch nicht zugestellte Nachrichten eines Geschäfts, verschlossen), veilcore.lender.v1 (die Ansprüche eines Kreditgebers), veilcore.partnerKeys.v1 (Schlüssel von Zahlungspartnern, die Sie benannt haben).',
  'm.pp.tech.storage.moving':
    'Empfangen und Senden: veilcore.lab-deliveries.v1, veilcore.sent-codes.v1 und veilcore.opened-results.v1 (Laborcodes und geöffnete Berichte), veilcore.receiving.v1, veilcore.receiving-claims.v1 und veilcore.receiving-refused.v1 (ein Code, der gerade empfangen wird), veilcore.outbox-names.v1 und veilcore.outbox-offer-keys.v1 (Empfängernamen und Lieferschlüssel, die auf ihren Datensatz warten), veilcore.prove-asks.v1 und veilcore.verifier-challenges.lasting.v1 (Nachweis-Anfragen, 7 Tage), veilcore.key-stamp-retry.v1 (Datumsstempel für Schlüssel, die erneut versucht werden), veilcore.lab-report-dating.v1 (ein Laborbericht, der gerade datiert wird). Session Storage, nur dieser Tab: veilcore.verifier-challenges.v1 (die Herausforderung einer Nachweis-Anfrage, 24 Stunden), veilcore:intake (die Anfrage der Website eines Partners, 1 Stunde).',
  'm.pp.tech.storage.settings':
    'Einstellungen und Markierungen: veilcore.lang und veilcore.role.v1 (Einstellungen), veilcore.bulk-import.stamps-on.v1 und veilcore.bulk-import.stamps.v1 (Datumsstempel für Schlüssel bei Importen), veilcore.sponsor-ticket.v1 (ein zufälliges Ticket für den Gebührendienst, nicht Ihr Inhaberschlüssel), veilcore.account-copy.v1 (der Stand der gespeicherten Kopie), veilcore.account.device.v1 (die zufällige ID dieses Geräts in dieser Kopie), veilcore.account.last-passkey.v1 und veilcore:passkey-copy (die ID des zuletzt benutzten Passkeys, nicht der Passkey), veilcore.rev.v1 (die neueste gesehene Version jedes Datensatzes), veilcore.records.arrived.v1, veilcore.record-keys.forgotten.v1, veilcore.record-keys.forgotten-at.v1 und veilcore.record-keys.restored.v1 (IDs von Datensätzen, die aus einer Sicherung kamen, entfernt oder zurückgeholt wurden), veilcore.attester.backed-up.v1, veilcore.attester.backed-up.copy.v1, veilcore.issuer-deals-backed-up.v1, veilcore.issuer-deals-backed-up.copy.v1 und veilcore.device-only-backup.v1 (was eine geprüfte Sicherung enthält), veilcore.invite-unsure.v1.<license> (eine Einladung ohne klare Antwort), veilcore.record-watch.seen.v1, veilcore.ask.seen.v1, veilcore.draft-notice-closed.v1, veilcore.install-card.v1, veilcore.lab-visibility-seen.v2, veilcore.log-kind.v1, veilcore.note.old-links.v1, veilcore.stamp-pressed.v1, veilcore.account.keep-safe-shown.v1 und veilcore.account.sheet-reminder.v1 (gesehene oder geschlossene Hinweise), veilcore.lock.<task> (ein Tab nach dem anderen, 30 Sekunden). Session Storage: veilcore.record-watch.v1 (was der letzte Blick ins Netzwerk gefunden hat), veilcore.homescreen.fresh, veilcore:backup-return (die Seite, zu der es nach einer Sicherung zurückgeht).',
  'm.pp.tech.storage.caches':
    'Cache Storage: veilcore-shell-<release> und veilcore-offline-meta (der Code dieser Website), veilcore-zk-<contract> und veilcore-zk-claims-<contract> (öffentliche Beweisdateien von dieser Website).',
  'm.pp.tech.locking':
    'Verschließen. Datensätze werden in Ihrem Browser mit AES-GCM verschlossen. Ihr Inhaberschlüssel wird als h1: und sein SHA-256 gespeichert. Die gespeicherte Kopie ist AES-256-GCM, auf eine Größenstufe aufgefüllt, und unser Server behält nur den SHA-256 der Tokens, die sie lesen oder ändern. Laborberichte werden mit age für den Schlüssel Ihres Datensatzes verschlüsselt.',
  'm.pp.tech.network':
    'Verbindungen. Die Sicherheitsrichtlinie dieser Website erlaubt einer Seite Verbindungen nur zu veilcore.org selbst, unserem Register, unserem Gebührendienst und Relais, mempool.space und blockstream.info. Nur diese Website darf nach der Kamera fragen, und Ihr Browser fragt Sie zuerst; Mikrofon und Standort sind aus.',
  'm.pp.tech.logs':
    'Protokolle. Das Register hat keinen Anfrage-Logger, und sein Test test/no-request-logging.test.mjs schlägt fehl, wenn einer hinzukommt; seine Konsole zeigt Start- und Fehlermeldungen. Seine Begrenzungen zählen Anfragen je Adressblock (eine IPv4-Adresse oder ein IPv6-/64 oder -/48) im Arbeitsspeicher. Der Gebührendienst zählt je Adressblock (/24 oder /48) und je Ticket im Arbeitsspeicher, vergisst eine Adresse, wenn ihr Zeitfenster vorbei ist, und schreibt je Ereignis eine Zeile nur mit Zählern und Ergebnissen.',
  'm.pp.tech.backups':
    'Sicherungskopien. Jeden Tag wird die Datenbank des Registers komprimiert, mit age für den öffentlichen Schlüssel des Betreibers verschlüsselt und jedes Mal unter neuem Namen in einen Bucket bei Backblaze B2 hochgeladen; die verschlossenen Laborberichtsdateien gehen mit. Der Bucket sperrt jede Kopie 30 Tage lang (Object Lock).',
};
