// The mainnet overlay in Deutsch (German): the same flags and the same facts as en-mainnet.ts,
// built by mainnet-overlay.ts. Draft, like the rest of this language; shown under the draft
// banner. The dated posts keep the network they ran on.
// SPDX-License-Identifier: Apache-2.0

import type { Strings } from './en';
import { buildMainnet } from './mainnet-overlay';

const sendsCommon: Strings = {
  'm.hero.status':
    'Der Contract von VeilCore läuft im Hauptnetz von Midnight. Datensätze, die auf dieser Website versiegelt werden, sind echte Datensätze: Sie kommen in Stapel, die dort automatisch verankert werden. Einen Datensatz per Link nachweisen und einen DNA-Bericht datieren funktioniert hier ebenfalls, und VeilCore zahlt die Netzwerkgebühr. Lizenzen und Laborvereinbarungen sind hier noch simuliert.',
  'm.faq.3a':
    'Es ist als Beweismittel gebaut, und unser Hinweis für Juristen sagt, was ein Datensatz beweist und was nicht. Datensätze, die hier versiegelt werden, kommen in Stapel, die automatisch im Hauptnetz von Midnight verankert werden. Sobald der Stapel eines Datensatzes verankert ist, zeigt das Datum, dass der Datensatz zu diesem Zeitpunkt existierte; was das in einem Streit wert ist, entscheidet das Gericht.',
  'm.demo.lede':
    'Keine Anmeldung, keine Wallet. Datensätze, die Sie hier versiegeln, sind echte Datensätze: Jeder kommt in einen Stapel, der automatisch im Hauptnetz von Midnight verankert wird; seine Prüfseite zeigt, wann sein Stapel verankert ist. Prüfen ist kostenlos, und VeilCore zahlt die Netzwerkgebühr für das, was Ihr Browser sendet. Lizenzen und Laborvereinbarungen sind simuliert. Der Name eines Datensatzes ist wie alles andere verschlossen; ein Prüflink enthält ihn nur, wenn Sie das einschalten.',
  'm.privacy.lede':
    'Dieser Hinweis gilt für diese Website. Datensätze, die Sie hier versiegeln, sind echte Datensätze: Sie kommen in Stapel, die automatisch im Hauptnetz von Midnight verankert werden.',
  'm.privacy.test.text':
    'Der Prüfcode Ihres Datensatzes kommt in einen Stapel, und der Stapel wird automatisch im Hauptnetz von Midnight verankert. Wenn Sie den eigenen Schlüssel Ihres Datensatzes datieren, einen Datensatz per Link nachweisen oder die Kopplung eines DNA-Berichts datieren, sendet Ihr Browser diese Transaktion selbst, über den Gebührendienst von VeilCore, der die Gebühr zahlt. Was Sie eingegeben haben und Ihre Dateien werden nie ins Netzwerk gesendet. Einmal im Netzwerk, ist es dauerhaft: Niemand, auch wir nicht, kann es löschen.',
  'm.privacy.hosts.text':
    'Diese Website wird bei Vercel gehostet, das IP-Adressen und Anfragen protokolliert. Unser Registerserver und der Dienst, der die Netzwerkgebühr zahlt und die Netzwerkabfragen dieser Seite weiterleitet, laufen bei Railway, das Anfragen protokolliert. Dieser Dienst liest das Netzwerk über Blockfrost.',
  'm.for.1p':
    'Versiegeln Sie einen Datensatz und koppeln Sie seinen DNA-Bericht. Taucht die Pflanze unter anderem Namen auf, kann ein Labor einen neuen Test mit Ihrem Bericht vergleichen. Auf dieser Website können Sie die Kopplung aus Ihrem Browser datieren, und niemand kann sie in seinen eigenen Datensatz kopieren. VeilCore testet keine DNA.',
  'm.for.6p':
    'Man schickt Ihnen einen Link. Sie tippen einmal, und die Seite der anderen Person prüft im Netzwerk, dass Sie den eigenen Schlüssel Ihrer Pflanze kontrollieren. Ihr Datensatz hat diesen Schlüssel beim Versiegeln benannt, deshalb lässt er sich nicht austauschen. Wer Sie sind oder wer die Pflanze gezüchtet hat, zeigt es nicht.',
  'm.live.stamp.main':
    'Ja. Stapel werden automatisch datiert, und das datiert Ihren Datensatz. Ihr Browser setzt außerdem einen Datumsstempel auf den eigenen Schlüssel Ihres Datensatzes, der nur den Schlüssel datiert.',
  'm.live.dna.main': 'Ja, aus Ihrem Browser gesendet. VeilCore zahlt die Gebühr.',
};

export const deMainnet = buildMainnet({
  common: {
    'm.hero.status':
      'Der Contract von VeilCore läuft im Hauptnetz von Midnight. Datensätze, die auf dieser Website versiegelt werden, sind echte Datensätze: Sie kommen in Stapel, die wir dort vorerst von Hand verankern. Lizenzen und Laborvereinbarungen sind hier noch simuliert.',
    'm.faq.3a':
      'Es ist als Beweismittel gebaut, und unser Hinweis für Juristen sagt, was ein Datensatz beweist und was nicht. Datensätze, die hier versiegelt werden, kommen in Stapel, die wir von Hand im Hauptnetz von Midnight verankern. Sobald der Stapel eines Datensatzes verankert ist, zeigt das Datum, dass der Datensatz zu diesem Zeitpunkt existierte; was das in einem Streit wert ist, entscheidet das Gericht.',
    'm.stat2.b': 'Hauptnetz',
    'm.foot.about':
      'Ein offenes Datensatzformat für pflanzliche und tierische Genetik. Datensätze werden durch Verankerung im Hauptnetz von Midnight datiert.',
    'm.get.2b':
      'Sie hängen am Datensatz. Ein Lizenznehmer kann beweisen, dass er eine gültige Lizenz hält, ohne zu zeigen, welche. Eine Lizenzgebühr oder andere Verpflichtung auf einem Elternteil erscheint bei jedem Nachkommen, den beide Inhaber bestätigt haben; VeilCore erfasst sie und zieht sie nicht ein. Im Contract im Hauptnetz von Midnight eingebaut; auf dieser Website simuliert.',
    'm.demo.lede':
      'Keine Anmeldung, keine Wallet. Datensätze, die Sie hier versiegeln, sind echte Datensätze: Jeder kommt in einen Stapel, den wir vorerst von Hand im Hauptnetz von Midnight verankern, ein neuer Datensatz kann also eine Weile warten; seine Prüfseite zeigt, wann sein Stapel verankert ist. Prüfen ist kostenlos. Lizenzen und Laborvereinbarungen sind simuliert, und Kopplungen von DNA-Berichten werden nicht datiert. Der Name eines Datensatzes ist wie alles andere verschlossen; ein Prüflink enthält ihn nur, wenn Sie das einschalten.',
    'm.post0.text':
      'Beide Contracts haben alle 37 End-to-End-Prüfungen im Preprod-Testnetz von Midnight bestanden, einschließlich der neuen Claims: ein Wert, ein Bereich, ein Unterschied, eine unveränderte Korrektur und eine Signatur von einem Test-Laborschlüssel. Erfundene Markerdaten.',
    'm.post2.title': 'Ein vollständiger Durchlauf im Testnetz von Midnight',
    'm.post2.text':
      'Der Contract wurde im Testnetz von Midnight bereitgestellt und hat alle 26 End-to-End-Prüfungen bestanden, wobei 16 seiner 24 Operationen mit echten Beweisen genutzt wurden.',
    'm.contact.1p': 'Legen Sie einen Datensatz an und sagen Sie uns dann, was für Ihre Arbeit fehlt.',
    'm.nav.demo': 'Datensatz anlegen',
    'm.foot.demo': 'Datensatz anlegen',
    'm.hero.demoLabel': 'Prüfcode live',
    'm.demo.label': 'Benutzen',
    'm.demo.title1': 'Datensatz anlegen',
    'm.demo.title2': 'oder prüfen.',
    'm.demo.create.text':
      'Erfassen Sie eine Pflanze oder ein Tier, speichern Sie Ihre Sicherungskopie und sehen Sie dann seine Seite.',
    'm.demo.privacy': 'Was diese Website speichert →',
    'm.faq.4link1': 'Was diese Website speichert →',
    'm.faq.2a':
      'Nein. Einen Datensatz auf dieser Website anzulegen und jeden Datensatz zu prüfen, braucht keine Wallet, keine Anmeldung und keinen Kauf. Ihr Browser bewahrt einen Zufallsschlüssel auf, der Ihre Datensätze auf unserem Server findet. Der Prüfcode kommt auf Midnight, ein Netzwerk, das für Privatsphäre gebaut ist. Sie haben nie direkt damit zu tun.',
    'm.for.1p':
      'Versiegeln Sie einen Datensatz und koppeln Sie seinen DNA-Bericht. Taucht die Pflanze unter anderem Namen auf, kann ein Labor einen neuen Test mit Ihrem Bericht vergleichen. Auf dieser Website wird die Kopplung mit Ihrem Datensatz gespeichert, aber noch nicht datiert. VeilCore testet keine DNA.',
    'm.for.3p':
      'Senden Sie Material mit einem Laborcode. Das Labor signiert eine Empfangsbestätigung mit seinem eigenen Schlüssel, sodass der Datensatz eine zweite Partei zeigt. Die Bestätigung ist eine echte Signatur, gespeichert im Register von VeilCore, nicht auf der Chain. Bedingungen wie „keine Vermehrung“ sind auf dieser Website nur zum Üben.',
    'm.for.6p':
      'Man schickt Ihnen einen Link. Sie tippen einmal, und die Seite der anderen Person prüft im Netzwerk, dass Sie den eigenen Schlüssel Ihrer Pflanze kontrollieren. Ihr Datensatz hat diesen Schlüssel beim Versiegeln benannt, deshalb lässt er sich nicht austauschen. Wer Sie sind oder wer die Pflanze gezüchtet hat, zeigt es nicht. Diese Website kann das noch nicht.',
    'footer.privacy': 'Datenschutz der Website',
    'title.privacy': 'Datenschutz der Website',
    'm.foot.privacy': 'Datenschutz der Website',
    'm.privacy.label': 'Datenschutz der Website',
    'm.privacy.title': 'Was diese Website speichert.',
    'm.privacy.lede':
      'Dieser Hinweis gilt für diese Website. Datensätze, die Sie hier versiegeln, sind echte Datensätze: Sie kommen in Stapel, die wir von Hand im Hauptnetz von Midnight verankern.',
    'm.privacy.stored.title': 'Auf unserem Server gespeichert',
    'm.privacy.stored.text':
      'Ihre Datensätze und Vereinbarungen, von Ihrem Browser verschlossen, bevor sie gesendet werden: der Name jedes Datensatzes, Züchter, Art, Daten, Notizen, Referenznummern, Eltern, die Prüfcodes und Dateinamen der Fotos und Laborberichte, die Sie hinzufügen, Vertragsbedingungen und Vertragspartner, Menge und Notiz, die Sie einem Labor schicken, die Probenangaben, die Sie und das Labor schreiben (Proben-ID, Siegelnummer, wo und wann die Probe genommen wurde, ein Zeuge, wie sie ankam), die Namen, die Sie Empfängern geben, und die geheimen Schlüssel jedes Datensatzes. Unser Server speichert sie verschlossen, und wir haben den Schlüssel nicht: Er liegt in Ihrem Browser und in Ihrer Sicherungsdatei. Der Schlüssel der Probenangaben steckt auch im Laborcode, damit das Labor sie öffnen kann. Wenn Sie es wählen, steckt der Name eines Datensatzes außerdem in einem Prüflink, den Sie erstellen, nach dem #. Diesen Teil sendet ein Browser nicht, wenn er den Link öffnet, aber der Link geht vollständig an jeden, dem Sie ihn schicken, und an jede Website, in die Sie ihn einfügen, auch an das Formular eines Partners. Lesen kann unser Server: die ID jedes Datensatzes; seinen Prüfcode, seine Schlüsselbindung und seine Profilart; einen Code aus seinem Namen, der ohne den Schlüssel in Ihrem Prüflink nichts über den Namen verrät; seine Korrekturverweise (welchen Datensatz eine Korrektur ersetzt, welche Felder sie geändert hat und wann); wann der Server ihn zuerst gesehen hat; wie oft er gespeichert wurde und wann zuletzt; ungefähr wie groß er ist (seine Größenstufe); was Sie auf seiner Prüfseite zeigen möchten (seinen Namen, wenn Sie ihn zeigen möchten, und ob ein DNA-Bericht gespeichert ist, als Code, der ohne den Schlüssel in Ihrem Prüflink nichts über die Datei verrät); die Elternverknüpfungen, die Sie registrieren; und seinen Stapel mit dessen Datumsstempel. Hat eine Vereinbarung eine Lizenzgebühr auf Nachkommen, kann unser Server lesen, welchen Datensatz sie betrifft und seit wann sie gilt, und jeder kann fragen, ob dieser Datensatz eine trägt: Die Abstammungsprüfung braucht das. Bei einer Lieferung: aus welchem Datensatz sie stammt, welches Inhaberkonto sie empfangen hat, wann sie empfangen wurde und ein Kennzeichen anstelle des Empfängernamens. Bei Laboren: der öffentliche Signaturschlüssel und die Signaturen, die sie veröffentlichen. Die Signatur eines Labors über einen Bericht nennt den Bericht gebunden an Ihren Datensatz, mit einem Schlüssel, den nur Sie und das Labor haben; eine vor dem 17. Oktober 2026 erstellte nennt den SHA-256 der Berichtsdatei, den unser Server nur Ihnen und dem Labor zeigt. Anfragen, den Schlüssel eines Datensatzes nachzuweisen, mit dem Namen, den der Fragende eingegeben hat, 7 Tage lang: Unser Server erfährt, welchen On-Chain-Schlüssel jede Anfrage nennt. Die Nachweis- und Prüfseiten senden Ihren Inhaberschlüssel nie. Ihr Inhaberschlüssel, den Ihr Browser bei jedem Speichern mitsendet, damit der Server Ihre Datensätze findet; der Server behält davon nur einen Einweg-Hash. Text, der vor dem Verschließen gespeichert wurde, haben wir am 18. Oktober 2026 von unserem Server entfernt, und die externen Sicherungen von davor lassen sich nicht mehr öffnen: Wir haben ihren Schlüssel am selben Tag vernichtet. Verschlossene Laborberichte, die ein Labor Ihnen schickt: verschlossen gespeichert, ohne den Schlüssel, und nach 180 Tagen gelöscht. Der Server ist das Register von VeilCore, gehostet bei Railway.',
    'm.privacy.test.title': 'Im Hauptnetz von Midnight datiert',
    'm.privacy.test.text':
      'Der Prüfcode Ihres Datensatzes kommt in einen Stapel, und wir verankern den Stapel vorerst von Hand im Hauptnetz von Midnight; das kann also eine Weile dauern. Nur der Code des Stapels kommt ins Netzwerk, nie das, was Sie eingegeben haben. Einmal verankert, ist er dauerhaft: Niemand, auch wir nicht, kann ihn löschen.',
    'm.privacy.madeup.title': 'Was Fremde sehen können',
    'm.privacy.madeup.text':
      'Der Name eines Datensatzes wird verschlossen gespeichert, wie alles andere, was Sie in einen Datensatz eingeben, es sei denn, Sie entscheiden, ihn auf seiner Prüfseite zu zeigen. Ein Prüflink, den Sie erstellen, enthält den Namen nach dem # nur, wenn Sie das einschalten; dann sehen ihn die Personen, denen Sie den Link schicken, und alle, an die sie ihn weitergeben. Die Probenangaben, die Sie und ein Labor schreiben, werden ebenfalls verschlossen gespeichert. Ihre DNA-Dateien verlassen nie Ihr Gerät. Laborberichte werden verschlossen übertragen.',
    'm.privacy.delete.text':
      'Wir können löschen, was unser Server zu Ihren Datensätzen speichert: Schreiben Sie an hunter@veilcore.org und nennen Sie die Kennungen der Datensätze. Der Code eines bereits auf Midnight verankerten Stapels bleibt dort.',
  },
  claimsLive: {
    'm.claims.status':
      'Ein zweiter Midnight-Contract, im Hauptnetz von Midnight. Vor dem Start hat er jede End-to-End-Prüfung bestanden, mit erfundenen Markerdaten. Auf dieser Website ist er noch nicht.',
    'm.stat2.s':
      'Beide Contracts laufen im Hauptnetz von Midnight. Datensätze, die auf dieser Website versiegelt werden, kommen in Stapel, die wir dort vorerst von Hand verankern.',
  },
  claimsPending: {
    'm.claims.status':
      'Ein zweiter Midnight-Contract. In den Tests vor dem Start hat er jede End-to-End-Prüfung bestanden, mit erfundenen Markerdaten. Im Hauptnetz von Midnight ist er noch nicht, und auf dieser Website auch nicht.',
    'm.stat2.s':
      'Der Haupt-Contract läuft im Hauptnetz von Midnight. Datensätze, die auf dieser Website versiegelt werden, kommen in Stapel, die wir dort vorerst von Hand verankern. Der Claims-Contract folgt.',
  },
  keyHolders:
    'Ein Wartungsschlüssel kann ändern, wie der Haupt-Contract von VeilCore auf Midnight funktioniert. Wer ihn hält, kann Operationen des Contracts hinzufügen oder ersetzen und damit die Identität jedes Datensatzes übernehmen, Lizenzen für jeden Aussteller anlegen, Verpflichtungen und Elternverknüpfungen hinzufügen oder entfernen oder Operationen abschalten. Die Blockzeiten des Netzwerks kann er nicht zurückdatieren, und jede Änderung ist on-chain sichtbar. Einen bereits verankerten Stapel und das Datum, das er einem Datensatz gibt, kann er weder ändern noch entfernen: Das steht in der Transaktion, die ihn verankert hat, und die kann niemand ändern. Heute liegt der Schlüssel auf Papier vor, je eine Kopie bei jedem Gründer, und jede Kopie allein genügt, um ihn zu verwenden. Ihn auf eine Gruppe von Schlüsseln zu verlagern, die zustimmen müssen, ist geplant, aber noch nicht umgesetzt.',
  policyApproved: ' Jede Verwendung wird öffentlich angekündigt, nach einer schriftlichen Wartungsrichtlinie.',
  policyProposed: ' Eine Richtlinie für seine Verwendung ist vorgeschlagen, aber noch nicht beschlossen.',
  claimsNoKey: ' Der Claims-Contract hat keinen Wartungsschlüssel: Niemand, auch wir nicht, kann ihn ändern.',
  keyTitlePlural: 'Wer die Contracts ändern kann.',
  keyLinkApproved: 'Wartungsrichtlinie lesen →',
  keyLinkProposed: 'Vorgeschlagene Richtlinie lesen →',
  reads: {
    'm.tech.check.p':
      'Um den Prüfcode eines Datensatzes neu zu berechnen, braucht es nur SHA-256 und die offene Spezifikation. Sein Einschlussnachweis verbindet diesen Prüfcode mit einem Code des Stapels, der auf Midnight verankert ist, und die Transaktion, die ihn verankert hat, liefert das Datum des Stapels. Die verify.html im Beweispaket rechnet das offline nach und nennt die Transaktion und den Code des Stapels, die nachzuschlagen sind. Die Prüfseite schlägt diese Transaktion selbst auf Midnight nach. Datensätze, die seit dem 14. Oktober versiegelt wurden, benennen ihren eigenen Schlüssel; ihre Prüfung braucht deshalb auch Abschnitt 3.6.1, in der Spezifikation auf dieser Website und im SDK 0.16.0. Wer auf dieser Website einen Datensatz über seine Kennung nachschlägt, nutzt dafür unseren Server.',
    'm.live.chain.main': 'Ja.',
    'm.privacy.hosts.text':
      'Diese Website wird bei Vercel gehostet, das IP-Adressen und Anfragen protokolliert. Unser Registerserver und der Nur-Lese-Dienst, der die Netzwerkabfragen dieser Seite weiterleitet, laufen bei Railway, das Anfragen protokolliert. Dieser Dienst liest das Netzwerk über Blockfrost.',
  },
  notReads: {
    'm.tech.check.p':
      'Um den Prüfcode eines Datensatzes neu zu berechnen, braucht es nur SHA-256 und die offene Spezifikation. Sein Einschlussnachweis verbindet diesen Prüfcode mit einem Code des Stapels, der auf Midnight verankert ist, und die Transaktion, die ihn verankert hat, liefert das Datum des Stapels. Die verify.html im Beweispaket rechnet das offline nach und nennt die Transaktion und den Code des Stapels, die nachzuschlagen sind. Die Prüfseite wird Midnight selbst lesen, sobald unser Nur-Lese-Relay läuft; bis dahin sagt sie, dass das Datum die Angabe unseres Registers ist, und Sie können die Transaktion selbst in einem Midnight-Explorer nachschlagen. Datensätze, die seit dem 14. Oktober versiegelt wurden, benennen ihren eigenen Schlüssel; ihre Prüfung braucht deshalb auch Abschnitt 3.6.1, in der Spezifikation auf dieser Website und im SDK 0.16.0. Wer auf dieser Website einen Datensatz über seine Kennung nachschlägt, nutzt dafür unseren Server.',
  },
  sends: (claimsOnMainnet) => ({
    ...sendsCommon,
    'm.stat2.s': claimsOnMainnet
      ? 'Beide Contracts laufen im Hauptnetz von Midnight. Datensätze, die auf dieser Website versiegelt werden, kommen in Stapel, die dort automatisch verankert werden.'
      : 'Der Haupt-Contract läuft im Hauptnetz von Midnight. Datensätze, die auf dieser Website versiegelt werden, kommen in Stapel, die dort automatisch verankert werden. Der Claims-Contract folgt.',
  }),
});
