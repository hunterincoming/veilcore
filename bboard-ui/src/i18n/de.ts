// German. DRAFT: machine-assisted, to be checked by a fluent speaker before publishing.
// SPDX-License-Identifier: Apache-2.0
import type { Strings } from './en';
export const de: Strings = {
  // Header and footer
  'nav.language': 'Sprache',
  'footer.documents': 'Dokumente',
  'footer.spec': 'Spezifikation',
  'footer.evidence': 'Datensätze als Beweismittel',
  'footer.integrate': 'Integrationsleitfaden',
  'footer.source': 'Quellcode',
  'footer.allImplementations': 'Alle drei Implementierungen',
  'footer.referenceImplementation': 'Referenzimplementierung',
  'footer.rustImplementation': 'Rust-Implementierung',
  'footer.thisSite': 'Diese Website',
  'footer.whatThisIs': 'Worum es geht',
  'footer.yourRecords': 'Ihre Datensätze',
  'footer.agreements': 'Vereinbarungen',
  'footer.privacy': 'Datenschutz in der Demo',
  'draft.banner':
    'Übersetzungsentwurf, noch nicht von einer muttersprachlichen Person geprüft. Maßgeblich ist die englische Seite.',
  'draft.showEnglish': 'Englisch anzeigen',
  // Public pages (Mako's 25 September layout)
  'm.nav.about': 'Über',
  'm.nav.team': 'Team',
  'm.nav.updates': 'Neuigkeiten',
  'm.nav.spec': 'Spezifikation',
  'm.nav.demo': 'Demo testen',
  'm.nav.menu': 'Menü',
  'm.hero.label': 'Nachweis dessen, was Sie besitzen',
  'm.hero.title1': 'Beweisen Sie, dass Sie es zuerst hatten.',
  'm.hero.title2': 'Ohne jemandem Ihre Genetik zu zeigen.',
  'm.hero.how': 'So funktioniert es',
  'm.hero.cultivar': 'Sorte',
  'm.hero.bredBy': 'Gezüchtet von',
  'm.hero.bredByDefault': 'Ihr Name',
  'm.hero.demoLabel': 'Live-Demo des Fingerabdrucks',
  'm.hero.fpUpdated': 'Fingerabdruck aktualisiert',
  'm.hero.typed': 'Was Sie eingeben',
  'm.hero.goes': 'Was auf Midnight kommt',
  'm.foot.demo': 'Demo',
  'm.step1.n': '01 · Datensatz',
  'm.step2.n': '02 · Fingerabdruck',
  'm.step3.n': '03 · Verankern',
  'm.step4.n': '04 · Prüfen',
  'm.step4.title': 'Später vorlegen',
  'm.demo.label': 'Demo',
  'm.demo.title1': 'Wählen Sie, wie Sie',
  'm.demo.title2': 'es sehen möchten.',
  'm.demo.create.title': 'Eine Pflanze erfassen',
  'm.demo.create.text':
    'Erfassen Sie eine erfundene Pflanze, speichern Sie Ihre Sicherungskopie und sehen Sie dann die Seite Ihrer Pflanze.',
  'm.demo.verify.title': 'Datensatz prüfen',
  'm.demo.verify.text':
    'Geben Sie die Kennung eines Datensatzes ein und sehen Sie, was sein Inhaber offengelegt hat und ob er verankert ist.',
  'm.demo.video.title': 'Ansehen, wie es funktioniert',
  'm.demo.video.text':
    'Eine 60-Sekunden-Animation der Idee: was bei Ihnen bleibt, was auf Midnight kommt und wie jemand es prüft.',
  'm.chip.video': 'Video',
  'm.chip.60s': '60 s',
  'm.chip.75s': '75 s',
  'm.chip.interactive': 'Interaktiv',
  'm.chip.3min': '~3 Min.',
  'm.chip.1min': '~1 Min.',
  'm.team.label': 'Team',
  'm.team.title1': 'Zwei Gründer.',
  'm.team.title2': 'Tokio und New Jersey.',
  'm.team.more': 'Vollständige Profile →',
  'm.mako.role': 'Mitgründer & CEO · Tokio',
  'm.mako.short': 'Kommerzielle Leitung: Normungs- und Sortenschutzgremien in Japan und der EU.',
  'm.hunter.role': 'Mitgründer & COO · New Jersey',
  'm.hunter.short': 'Entwickelt den Contract, die Website und die API. Leitet die Kontaktarbeit in den USA.',
  'm.updates.label': 'Neuigkeiten',
  'm.updates.title1': 'Neues aus',
  'm.updates.title2': 'der Entwicklung.',
  'm.updates.read': 'Lesen →',
  'm.updates.all': 'Änderungen am Datensatzformat auf GitHub →',
  'm.updates.follow': 'Folgen',
  'm.post1.date': '3. Okt. 2026',
  'm.post1.tag': 'Format',
  'm.post1.title': 'Drei Implementierungen, eine Antwort',
  'm.post1.text':
    'Ein Differenztest ergab, dass unsere Implementierungen in TypeScript, Python und Rust bei einigen Zahlen voneinander abwichen. Behoben: Sie stimmen jetzt bei jeder einzelnen von 81.000 Eingaben überein, und die gemeinsamen Testvektoren prüfen das.',
  'm.post2.date': '2. Okt. 2026',
  'm.post2.tag': 'Contract',
  'm.post2.title': 'Ein vollständiger Durchlauf im Testnetz von Midnight',
  'm.post2.text':
    'Der Contract wurde im Testnetz von Midnight bereitgestellt und hat alle 26 End-to-End-Prüfungen bestanden, wobei 16 seiner 24 Operationen mit echten Beweisen genutzt wurden.',
  'm.status.label': 'Wo wir stehen',
  'm.status.title1': 'Ehrlich darüber,',
  'm.status.title2': 'wo wir stehen.',
  'm.status.lede': 'Was fertig ist und was noch nicht.',
  'm.stat3.b': 'Kein Audit',
  'm.status.keyTitle': 'Wer den Contract ändern kann.',
  'm.status.keyText':
    'Ein Wartungsschlüssel kann ändern, wie der VeilCore-Contract auf Midnight funktioniert. Wer ihn hält, kann Operationen des Contracts hinzufügen oder ersetzen und damit die Identität jedes Datensatzes übernehmen, Lizenzen für jeden Aussteller anlegen, Verpflichtungen und Elternverknüpfungen hinzufügen oder entfernen oder Operationen abschalten. Die Blockzeiten des Netzwerks kann er nicht zurückdatieren, und jede Änderung ist on-chain sichtbar. Heute liegt der Schlüssel auf Papier vor, je eine Kopie bei jedem Gründer, und jede Kopie allein genügt, um ihn zu verwenden. Ihn auf eine Gruppe von Schlüsseln zu verlagern, die zustimmen müssen, ist geplant, aber noch nicht umgesetzt. Jede Verwendung wird öffentlich angekündigt, nach einer schriftlichen Wartungsrichtlinie.',
  'm.status.keyLink': 'Wartungsrichtlinie lesen →',
  'm.contact.label': 'Kontakt aufnehmen',
  'm.contact.title1': 'Sagen Sie uns,',
  'm.contact.title2': 'wo es versagt.',
  'm.contact.email': 'E-Mail an die Gründer',
  'm.contact.spec': 'Spezifikation lesen',
  'm.foot.explore': 'Entdecken',
  'm.foot.build': 'Entwicklung',
  'm.foot.contact': 'Kontakt',
  'm.foot.verify': 'Datensatz prüfen',
  'm.foot.fine': 'Nachweis, dass Sie einen Datensatz zu einem Datum hatten. Kein Rechtstitel an der Pflanze.',
  'm.foot.privacy': 'Datenschutz in der Demo',
  'm.verify.label': 'Prüfen',
  'm.verify.title': 'Einen Datensatz prüfen',
  'm.verify.lede':
    'Geben Sie die Datensatzkennung ein, die auf einem Zertifikat aufgedruckt ist oder Ihnen mitgeteilt wurde. Sie sehen, was der Inhaber teilen wollte, und was diese Seite selbst prüfen konnte: ob der Datensatz in einem versiegelten Stapel ist und ob Laborsignaturen gültig sind.',
  'm.verify.field': 'Datensatzkennung',
  'm.verify.go': 'Prüfen',
  'm.founders.label': 'Gründer',
  'm.founders.leads': 'Leitet',
  'm.founders.also': 'Außerdem',
  'm.founders.languages': 'Sprachen',
  'm.mako.bio1':
    'Makoto (Mako) Steiner ist Mitgründer und CEO von VeilCore. Er leitet die kommerzielle Strategie, die Finanzierung sowie die Kontaktarbeit mit Institutionen und Investoren weltweit.',
  'm.mako.bio2': 'Er hat Environmental Studies an der Denison University studiert und lebt in Tokio.',
  'm.mako.leads': 'Japan|EU|Normungsgremien|Geschäftsentwicklung',
  'm.mako.also': 'Midnight Nightforce Leader (Japan) · Build Club, Kohorte 1',
  'm.mako.languages': 'Englisch · Japanisch',
  'm.hunter.bio1':
    'Hunter Roberts ist Mitgründer und COO von VeilCore. Er leitet das Produkt und das VeilCore-Protokoll, vom Datensatzformat bis zum Contract auf Midnight. Er leitet die Kontaktarbeit von VeilCore mit US-Institutionen, darunter Saatgutanerkennungs-, Normungs- und Sortenstellen.',
  'm.hunter.bio2':
    "Er kommt aus der praktischen Arbeit mit Pflanzen, einschließlich Züchtung und Gewebekultur, und baut Chunk's Trees auf, eine Anbauanlage in New Jersey.",
  'm.hunter.leads': 'USA|Protokoll & Spezifikation|Engineering',
  'm.hunter.also': 'Midnight Nightforce Leader (US) · Build Club, Kohorte 1',
  'm.founders.band1': 'Sprechen Sie mit uns. Wir',
  'm.founders.band2': 'hören lieber, wo es versagt,',
  'm.founders.band3': 'als dass man uns sagt, es funktioniert.',
  'm.founders.bandText':
    'Wenn Sie ein Zuchtprogramm, ein Labor, eine Saatgutanerkennungsstelle oder ein Sortenschutzgremium leiten, würden wir gern mit Ihnen sprechen. Das Format ist kostenlos zu implementieren und kostenlos zu prüfen.',
  'm.founders.emailBoth': 'E-Mail an beide Gründer',
  'm.portraitOf': 'Porträt von {name}',
  'm.privacy.label': 'Datenschutz in der Demo',
  'm.privacy.title': 'Was die Demo speichert.',
  'm.privacy.lede':
    'Dieser Hinweis gilt für die Demo auf dieser Website. Sie ist ein Test, auf dem Testnetzwerk von Midnight. Bitte verwenden Sie erfundene Daten.',
  'm.privacy.stored.title': 'Auf unserem Testserver gespeichert',
  'm.privacy.stored.text':
    'Was Sie eingeben und was Ihr Browser daraus berechnet: Sorten- und Züchternamen, die Art, falls Sie eine angeben, Datumsangaben, Notizen, Referenznummern, Eltern, Fingerabdrücke von Datensätzen, Fotos und Laborberichten, Dateinamen von Laborberichten, Vertragsbedingungen und Vertragspartner, Material, das Sie an ein Labor senden (an wen es adressiert ist und die Menge), und bei Laboren der öffentliche Signaturschlüssel und die Bestätigungen, die sie veröffentlichen. Außerdem Ihr Inhaberschlüssel, den Ihr Browser bei jedem Speichern mitsendet, damit der Server Ihre Datensätze findet. Der Server ist das Testregister von VeilCore, gehostet bei Railway.',
  'm.privacy.local.title': 'Verlässt nie Ihren Browser',
  'm.privacy.local.text':
    'Genetische Daten, Labor- und DNA-Berichtsdateien sowie Fotos. Ihr Browser liest sie, um ihre Fingerabdrücke zu berechnen. Die Dateien selbst werden nie hochgeladen.',
  'm.privacy.test.title': 'Ein Testnetzwerk',
  'm.privacy.test.text':
    'Die Demo nutzt das Testnetzwerk von Midnight, nicht das Live-Netzwerk. Demodaten können gelöscht werden, wenn das Testnetzwerk zurückgesetzt wird.',
  'm.privacy.madeup.title': 'Verwenden Sie erfundene Daten',
  'm.privacy.madeup.text':
    'Bitte geben Sie keine echten Namen, echten Sorten oder vertraulichen Angaben ein. Die Demo dient dazu, das Format auszuprobieren.',
  'm.privacy.export.title': 'Export',
  'm.privacy.export.text':
    'Auf Ihrer Datensatzseite gibt es eine Schaltfläche „Export“, die die Datensätze herunterlädt, die dieser Browser hält. Ein einzelner Download von allem, was unser Server für Sie speichert, ist in Vorbereitung; er ist noch nicht verfügbar.',
  'm.privacy.delete.title': 'Löschung',
  'm.privacy.delete.text':
    'Wenn Sie Ihre Demodaten von unserem Server löschen lassen möchten, schreiben Sie an hunter@veilcore.org und nennen Sie die Kennungen Ihrer Datensätze.',
  'm.privacy.browser.title': 'In Ihrem Browser gespeichert',
  'm.privacy.browser.text':
    'Ihr Browser speichert auf diesem Gerät: Ihren Inhaberschlüssel (eine Kopie geht auch an unseren Server, siehe oben), den Signaturschlüssel eines Labors, falls Sie einen eingerichtet haben (sein privater Teil verlässt dieses Gerät nie), die gewählte Rolle und Ihre Sprache. Um sie zu entfernen, löschen Sie die Daten dieser Website in den Einstellungen Ihres Browsers. Sichern Sie vorher Ihren Inhaberschlüssel: Ohne ihn findet dieser Browser Ihre Datensätze nicht mehr.',
  'm.privacy.hosts.title': 'Hosting',
  'm.privacy.hosts.text':
    'Diese Website wird bei Vercel gehostet, das IP-Adressen und Anfragen protokolliert. Unser Registerserver läuft bei Railway, das Anfragen protokolliert.',
  'm.privacy.who.title': 'Wer es aufbewahrt, und wie lange',
  'm.privacy.who.text':
    'VeilCore ist noch nicht als Unternehmen gegründet; die Gründer von VeilCore betreiben diese Website und das Register. Es gibt keine feste Aufbewahrungsfrist: Was das Register speichert, bleibt dort, bis Sie uns bitten, es zu löschen. Kontakt: hunter@veilcore.org.',
  'm.notfound.title': 'Seite nicht gefunden.',
  'm.notfound.text':
    'Unter dieser Adresse gibt es keine Seite. Wenn Ihnen jemand einen Link zu einem Datensatz gegeben hat, prüfen Sie, ob er vollständig ist.',
  'm.notfound.home': 'Startseite von VeilCore →',
  'm.privacy.contact': 'Fragen: hunter@veilcore.org',
  // Round 2 truth pass (14 Oct 2026): keys added or newly translated.
  'm.hero.lede':
    'Für Züchter, Saatgutunternehmen und Labore, die mit pflanzlicher und tierischer Genetik arbeiten. Genetische Daten und Labordateien verlassen nie Ihren Computer. Nur ein Fingerabdruck kommt auf Midnight, das ihn datiert. Sortenname und Züchter, die Sie eingeben, speichert VeilCore auf seinem Server, und wer den Link zu einem Datensatz hat, sieht dessen Namen. Kostenlos zu prüfen. Keine Anmeldung, keine Wallet.',
  'm.for.3p':
    'Senden Sie Material mit einem Laborcode. Wenn das Labor ihn eingibt, signiert es eine Empfangsbestätigung mit seinem eigenen Schlüssel. So zeigt der Datensatz eine zweite Partei, was das Labor ebenso schützt wie den Auftraggeber. Die Bestätigung ist eine echte Signatur, gespeichert im Register von VeilCore, nicht auf der Chain. Bedingungen wie der Verwendungszweck, keine Vermehrung und Rückgabe oder Vernichtung danach sind in der Web-Demo nur zum Üben.',
  'm.get.1b': 'für einen Datensatz dessen, was Sie haben, ohne Ihre Genetik zu zeigen.',
  'm.get.3b':
    'Eine Elternverknüpfung zählt nur, wenn beide Inhaber sie bestätigen. Auf dieser Website erfasst sie das Register von VeilCore, nicht die Chain.',
  'm.open.2t': 'Zum Prüfen braucht es uns nicht.',
  'm.open.2p':
    'Bewahren Sie zwei Dateien von der Seite Ihrer Pflanze auf: den exportierten Datensatz und seinen Einschlussnachweis (eine kleine Datei, die zeigt, dass der Datensatz in einem datierten Stapel ist). Mit beiden kann jeder ihn mit SHA-256, der offenen Spezifikation und einer Abfrage in einem Midnight-Explorer prüfen, auch wenn es VeilCore nicht mehr gibt. Ihre Sicherungsdatei enthält Ihre Schlüssel, nicht diese Dateien.',
  'm.faq.1a':
    'Sobald Datensätze verankert sind, kann jeder prüfen, welcher zuerst verankert wurde. Koppeln Sie Ihren Laborbericht, damit ein späterer Test damit verglichen werden kann. Wenn Sie Material versenden, bestätigt der Empfänger es mit seinem eigenen Schlüssel. Ein Datensatz ist ein Beweismittel, keine Registrierung: Er zeigt, dass Sie diesen Datensatz zu diesem Datum hatten, nicht, dass Sie die Pflanze hatten, und entscheidet einen Streit nicht allein.',
  'm.faq.5a':
    'Die Daten bleiben: Einen Stapel-Fingerabdruck, der im Hauptnetz von Midnight verankert oder auf Bitcoin gestempelt ist, kann niemand entfernen, auch wir nicht. Um einen Datensatz ohne uns zu prüfen, brauchen Sie zwei Dateien, die nur unser Server hat, solange Sie sie nicht speichern: den Datensatz („Export record“) und seinen Einschlussnachweis („Download inclusion proof“), beide auf der Seite Ihrer Pflanze unter „Technical details“. Ihre Sicherungsdatei enthält Ihre Schlüssel, nicht diese Dateien. Die Spezifikation ist offen, und der Code in TypeScript, Python und Rust ist veröffentlicht. Ein Beweispaket mit einem Klick ist in Vorbereitung.',
  'm.post0.date': '4. Okt. 2026',
  'm.post0.tag': 'Contract',
  'm.post0.title': 'Eine Tatsache beweisen, den Rest behalten',
  'm.post0.text':
    'Beide Contracts haben alle 37 End-to-End-Prüfungen im Preprod-Testnetz von Midnight bestanden, einschließlich der neuen Claims: ein Wert, ein Bereich, ein Unterschied, eine unveränderte Korrektur und eine Signatur von einem Test-Laborschlüssel. Erfundene Markerdaten.',
  'm.postA.date': '8. Okt. 2026',
  'm.postA.tag': 'Start',
  'm.postA.title': 'Live im Hauptnetz von Midnight',
  'm.postA.text':
    'Beide Contracts sind im Hauptnetz von Midnight bereitgestellt. Der Claims-Contract hat keinen Wartungsschlüssel: Niemand, auch wir nicht, kann ihn ändern.',
  'm.postB.date': '11. Okt. 2026',
  'm.postB.tag': 'Register',
  'm.postB.title': 'Erster Stapel auch auf Bitcoin datiert',
  'm.postB.text':
    'Die ersten Stapel des Registers wurden von Hand im Hauptnetz von Midnight verankert. Bei einem davon, mit fünf unserer eigenen Testdatensätze, ist die Wurzel zusätzlich auf Bitcoin gestempelt, in Block 971004. Eine Prüfung mit dem offiziellen OpenTimestamps-Werkzeug steht noch aus.',
  'm.founders.lede':
    'VeilCore ist ein Datensatzformat für Beweiszwecke, für pflanzliche und tierische Genetik. Es belegt, dass Sie einen Datensatz Ihres Materials zu einem bestimmten Datum hatten, ohne dass Sie Ihre genetischen Daten herausgeben.',
  'm.live.label': 'Was wo läuft',
  'm.live.title1': 'Was funktioniert,',
  'm.live.title2': 'und wo.',
  'm.live.lede':
    'veilcore.org läuft im Hauptnetz von Midnight, und Datensätze dort sind echt. Die Test-Website ist zum Üben: Dort funktioniert mehr, und ihre Datensätze haben kein Gewicht.',
  'm.live.colMain': 'veilcore.org (Hauptnetz)',
  'm.live.colTest': 'Test-Website',
  'm.live.colNot': 'Noch nicht',
  'm.live.stamp.t': 'Ein Datumsstempel für Ihren Datensatz',
  'm.live.stamp.main':
    'Ja. VeilCore datiert Datensätze in Stapeln, vorerst von Hand. Ihr Browser sendet nichts an die Chain.',
  'm.live.stamp.test': 'Ja. Ihr Browser stempelt jeden Datensatz, und Stapel werden automatisch datiert.',
  'm.live.share.t': 'Wählen, was andere sehen',
  'm.live.share.main': 'Ja. Der Sortenname ist immer sichtbar.',
  'm.live.share.test': 'Ja. Der Sortenname ist immer sichtbar.',
  'm.live.lab.t': 'Laborcode und signierte Empfangsbestätigung',
  'm.live.lab.main':
    'Ja. Das Labor signiert mit seinem eigenen Schlüssel. Das Register von VeilCore bewahrt die Bestätigung auf, nicht die Chain.',
  'm.live.lab.test': 'Ja, auf die gleiche Weise.',
  'm.live.results.t': 'Laborberichte, die nur Sie öffnen können',
  'm.live.results.test': 'Ja. Neu und noch in der Erprobung.',
  'm.live.results.not': 'Auf veilcore.org.',
  'm.live.dna.t': 'Ein Datum für die Kopplung Ihres DNA-Berichts',
  'm.live.dna.main': 'Mit Ihrem Datensatz gespeichert, nicht datiert.',
  'm.live.dna.test': 'Ja, aus Ihrem Browser gesendet.',
  'm.live.prove.t': 'Nachweis per Link',
  'm.live.prove.test': 'Ja. Die Seite der anderen Person prüft im Netzwerk, dass Sie den Datensatz halten.',
  'm.live.prove.not': 'Auf veilcore.org: Dafür muss Ihr Browser eine Transaktion senden.',
  'm.live.claims.t': 'Eine Tatsache beweisen (Claims)',
  'm.live.claims.main':
    'Der Contract ist im Hauptnetz, ohne Wartungsschlüssel. Die Website kann ihn noch nicht nutzen.',
  'm.live.claims.not': 'Ihn über die Website nutzen.',
  'm.live.lic.t': 'Lizenzen und Lizenzgebühren',
  'm.live.lic.main': 'Nur zum Üben.',
  'm.live.lic.test': 'Nur zum Üben.',
  'm.live.lic.not': 'Echte Lizenzen über die Website. Sie sind im Contract eingebaut.',
};

/** The public test site (en-testchain.ts), in this language. Draft, like the rest of this file. */
export const deTestchain: Strings = {
  'm.hero.status':
    'Dies ist die Test-Website: Datumsstempel, Laborcodes und Nachweis-Links funktionieren wirklich, im Testnetz von Midnight. Datensätze hier sind Übung, kein Beweismittel.',
  'm.claims.status':
    'Ein zweiter Midnight-Contract. Er hat am 4. Oktober 2026 jede End-to-End-Prüfung im Preprod-Testnetz von Midnight bestanden, mit erfundenen Markerdaten, und ist seit dem 8. Oktober 2026 im Hauptnetz von Midnight. Auf dieser Website ist er noch nicht.',
  'm.faq.3a':
    'Es ist als Beweismittel gebaut, und unser Hinweis für Juristen sagt, was es beweist und was nicht. Diese Test-Website datiert Datensätze im Testnetz von Midnight, und ein Datum aus einem Testnetz hat keine Beweiskraft. Echte Datensätze gehören auf veilcore.org, das im Hauptnetz von Midnight läuft.',
  'm.stat2.b': 'Test-Website',
  'm.stat2.s':
    'Diese Website läuft im Preprod-Testnetz von Midnight, zum Üben. Beide Contracts sind seit dem 8. Oktober 2026 im Hauptnetz von Midnight.',
  'm.foot.about':
    'Ein offenes Datensatzformat für pflanzliche und tierische Genetik. Dies ist die Test-Website, in einem Testnetz von Midnight; veilcore.org läuft im Hauptnetz von Midnight.',
  'm.for.1p':
    'Versiegeln Sie einen Datensatz und koppeln Sie seinen DNA-Bericht. Taucht die Pflanze unter anderem Namen auf, kann ein Labor einen neuen Test mit Ihrem Bericht vergleichen. Wenn Sie über den VeilCore-Contract auf Midnight koppeln, wird auch die Kopplung datiert: Sie zeigt, dass, wer Ihren Datensatz zu diesem Datum kontrollierte, diesen Bericht oder seinen SHA-256 bis dahin hatte. Was auf die Chain kommt, ist an Ihren Datensatz gebunden und verbirgt den Bericht, sodass niemand Ihre Kopplung auf seinen eigenen Datensatz kopieren kann. Auf dieser Test-Website können Sie die Kopplung aus Ihrem Browser datieren. VeilCore führt keine DNA-Tests durch.',
  'm.demo.lede':
    'Keine Anmeldung, keine Wallet. Dies ist die Test-Website, verwenden Sie also erfundene Angaben. Ihr Browser stempelt jeden Datensatz im Testnetz von Midnight (VeilCore zahlt die Gebühr), und Stapel werden automatisch verankert. Auch die Kopplung eines DNA-Berichts können Sie datieren. Die Empfangsbestätigung eines Labors ist eine echte Signatur mit dem eigenen Schlüssel des Labors, außerhalb der Chain gespeichert. Lizenzen und Laborvereinbarungen sind nur zum Üben.',
  'm.privacy.test.text':
    'Diese Website nutzt das Preprod-Testnetz von Midnight, nicht das Hauptnetz. Ihr Browser sendet jeden Datumsstempel über den Gebührendienst von VeilCore an dieses Netz; was Sie eingegeben haben und Ihre Dateien werden nie dorthin gesendet. Ein Testnetz kann zurückgesetzt werden, und Testdaten können gelöscht werden.',
  'm.privacy.hosts.text':
    'Diese Website wird bei Vercel gehostet, das IP-Adressen und Anfragen protokolliert. Unser Registerserver und der Dienst, der die Gebühren im Testnetz zahlt und die Netzabfragen dieser Seite weiterreicht, laufen bei Railway, das Anfragen protokolliert. Dieser Dienst liest das Netz über Blockfrost.',
};
