// German. Published: machine-assisted, reviewed against native official sources (docs/i18n-glossary.md).
// SPDX-License-Identifier: Apache-2.0
import type { Strings } from './en';
export const de: Strings = {
  // Header and footer
  'nav.language': 'Sprache',
  'nav.main': 'Hauptnavigation',
  'nav.home': 'VeilCore-Startseite',
  'footer.documents': 'Dokumente',
  'footer.spec': 'Spezifikation',
  'footer.partners': 'Einen Nachweis verlangen',
  'footer.evidence': 'Datensätze als Beweismittel',
  'footer.integrate': 'Integrationsleitfaden',
  'footer.source': 'Quellcode',
  'footer.allImplementations': 'Alle drei Implementierungen',
  'footer.referenceImplementation': 'Referenzimplementierung',
  'footer.rustImplementation': 'Rust-Implementierung',
  'footer.siteCode': 'Code dieser Website',
  'footer.thisSite': 'Diese Website',
  'footer.yourRecords': 'Ihre Datensätze',
  'footer.agreements': 'Vereinbarungen',
  'footer.privacy': 'Datenschutz in der Demo',
  'title.help': 'Hilfe',
  'title.status': 'Status des Dienstes',
  'footer.help': 'Hilfe',
  'm.help.title': 'Hilfe',
  'm.help.lede':
    'Kurze Antworten zum Anlegen, Aufbewahren, Zeigen und Prüfen eines Datensatzes. Jede sagt, was diese Website heute tut.',
  'm.help.start.t': 'Der Anfang',
  'm.help.start.1q': 'Was ist ein VeilCore-Datensatz?',
  'm.help.start.1a':
    'Eine datierte Beschreibung von etwas, das Sie halten: eine Pflanze, ein Tier, ein Stamm oder eine Zelllinie, oder ein Dokument. Ihr Browser macht daraus einen kurzen Prüfcode, und dieser Code wird zusammen mit anderen in einem Stapel auf Midnight datiert. Er belegt, dass Sie diesen Datensatz zu diesem Datum bereits hatten. Er belegt nicht, wer Rechte an etwas hat, und nicht, dass der Inhalt des Datensatzes stimmt.',
  'm.help.start.2q': 'Was brauche ich?',
  'm.help.start.2a':
    'Ein Handy oder einen Computer mit aktuellem Browser. Keine Wallet, keine Anmeldung, nichts zu kaufen. Um eine einzelne Zahl aus einem Datensatz zu belegen, brauchen Sie einen Computer: Auf Handys wurde das noch nicht ausprobiert.',
  'm.help.start.3q': 'Was kostet es?',
  'm.help.start.3a': 'Einen Datensatz auf dieser Website anzulegen und jeden Datensatz zu prüfen ist kostenlos.',
  'm.help.make.t': 'Einen Datensatz anlegen',
  'm.help.make.1q': 'Welche Art von Datensatz wähle ich?',
  'm.help.make.1a':
    'Wählen Sie, was es ist. Eine Pflanze: eine Sorte oder eine Linie. Ein Tier: ein einzelnes Tier oder eine Linie. Ein Stamm oder eine Linie: Mikroben, Pilze, Zelllinien, Insektenlinien. Ein Dokument: eine Genehmigung, ein Zertifikat, ein Vertrag oder ein Bericht, als Datei versiegelt. Eine Anbaucharge oder eine Erntepartie: ein Schritt in einer Produktionskette, verknüpft mit dem Datensatz davor.',
  'm.help.make.2q': 'Was lasse ich weg?',
  'm.help.make.2a':
    'Persönliche Angaben anderer Menschen. Was Sie eingeben, wird verschlüsselt auf unserem Server gespeichert, und wir haben den Schlüssel nicht. Wem Sie einen Datensatz zeigen, der sieht aber, was Sie freigegeben haben, und der Prüflink eines Dokuments zeigt alles, was darin eingegeben wurde (Titel, Inhaber, Aussteller, Referenz, Notizen), den Dateinamen und den SHA-256 der Datei. Benennen Sie Dateien schlicht, etwa „Genehmigung 2026.pdf“. Oder behalten Sie ein Dokument nur auf diesem Gerät: Dann wird nichts Eingegebenes gesendet.',
  'm.help.make.3q': 'Woran erkenne ich, dass mein Datensatz datiert ist?',
  'm.help.make.3a':
    'Die Seite des Datensatzes zeigt „Datensatz datiert“ mit dem Datum, sobald sein Stapel auf Midnight ist. Vorher steht dort „im nächsten Stapel“. Gespeichert ist der Datensatz in beiden Fällen. Bis der Stapel auf Midnight ist, stützt sich sein Datum allein auf Ihr Wort.',
  'm.help.backup.t': 'Ihre Sicherungskopie',
  'm.help.backup.1q': 'Warum fordert die Website mich immer wieder auf, eine Sicherungskopie zu speichern?',
  'm.help.backup.1a':
    'Die Sicherungskopie ist der einzige Weg zu belegen, dass Sie Ihre Datensätze halten, und der einzige Weg, sie auf ein neues Handy oder einen neuen Computer zu holen. VeilCore kann sie nicht wiederherstellen und keine neue erstellen.',
  'm.help.backup.2q': 'Wo bewahre ich sie auf?',
  'm.help.backup.2a':
    'Auf einem USB-Stick oder in einem Passwortmanager, und zusätzlich an einem zweiten Ort. Wer die Datei hat, kann Ihre Datensätze öffnen und in Ihrem Namen handeln. Geben Sie beim Speichern ein Passwort an: Dann öffnet die Datei allein nichts. Wenn Sie das Passwort vergessen, kann niemand die Datei öffnen, auch wir nicht.',
  'm.help.backup.3q': 'Ich habe meine Sicherungskopie verloren. Was nun?',
  'm.help.backup.3a':
    'Wenn dieser Browser Ihre Datensätze noch hat, speichern Sie jetzt eine neue Sicherungskopie. Wenn nicht, kann niemand die verschlossenen Kopien auf unserem Server öffnen, auch VeilCore nicht. Die Website bietet dann an, sie zu löschen und einen neuen Schlüssel zu beginnen. Bereits datierte Datensätze bleiben datiert, aber Sie können nicht mehr zeigen, dass es Ihre sind.',
  'm.help.backup.4q': 'Wie wechsle ich auf ein neues Handy oder einen neuen Computer?',
  'm.help.backup.4a':
    'Öffnen Sie auf dem neuen Gerät „Datensätze wiederherstellen“ und wählen Sie Ihre Sicherungskopie.',
  'm.help.backup.4link': 'Datensätze wiederherstellen →',
  'm.help.backup.5q': 'Meine Datensätze sind aus dem Browser verschwunden.',
  'm.help.backup.5a':
    'Browser können die gespeicherten Daten einer Website löschen. Safari kann das nach 7 Tagen ohne Besuch tun. Ihre Sicherungskopie bringt alles zurück.',
  'm.help.show.t': 'Jemandem einen Datensatz zeigen',
  'm.help.show.1q': 'Wie zeige ich jemandem meinen Datensatz?',
  'm.help.show.1a':
    'Öffnen Sie das Zertifikat des Datensatzes und kopieren Sie den Link zum Versenden. Wer ihn öffnet, kann das Datum selbst prüfen, kostenlos und ohne Konto. Der Link zeigt den Namen des Datensatzes nur, wenn Sie das einschalten.',
  'm.help.show.2q': 'Wie zeige ich ein Dokument?',
  'm.help.show.2a':
    'Senden Sie den Prüflink zusammen mit der Datei. Der Browser der anderen Person vergleicht die Datei Byte für Byte mit dem versiegelten Datensatz und zeigt, seit wann Sie sie hatten. Deren Kopie der Datei wird nicht hochgeladen.',
  'm.help.show.3q': 'Kann ich eine Zahl belegen, ohne den Rest zu zeigen?',
  'm.help.show.3a':
    'Ja, wenn Sie den Datensatz mit seinen Zahlen versiegelt haben. Sie können belegen, dass eine Zahl höchstens oder mindestens einen Grenzwert erreicht oder genau einem Wert entspricht. Nutzen Sie einen Computer.',
  'm.help.check.t': 'Einen Datensatz prüfen, den Ihnen jemand geschickt hat',
  'm.help.check.1q': 'Jemand hat mir einen Datensatz geschickt. Wie prüfe ich ihn?',
  'm.help.check.1a':
    'Öffnen Sie den Link, den Sie bekommen haben, oder geben Sie die Kennung des Datensatzes auf der Prüfseite ein. Das ist kostenlos und braucht kein Konto.',
  'm.help.check.1link': 'Datensatz prüfen →',
  'm.help.check.2q': 'Was heißt „datiert“?',
  'm.help.check.2a':
    'Der Prüfcode des Datensatzes liegt in einem Stapel, und der Code dieses Stapels steht auf Midnight. Das Datum ist der Zeitpunkt, zu dem der Stapel auf Midnight kam. Sie können das prüfen, ohne VeilCore zu vertrauen.',
  'm.help.check.3q': 'Was belegt ein Datensatz, und was nicht?',
  'm.help.check.3a':
    'Er belegt, dass jemand genau diesen Datensatz zu diesem Datum hielt und dass er seitdem unverändert ist. Er belegt nicht, wer Rechte am Material hat, dass die Beschreibung stimmt oder dass ein physischer Gegenstand dazu passt. Die Signatur eines Labors unter einem Ergebnis ist eine eigene Prüfung.',
  'm.help.check.4q': 'Hält das in einem Streit stand?',
  'm.help.check.4link': 'Datensätze als Beweismittel →',
  'm.help.labs.t': 'Labore und Vereinbarungen',
  'm.help.labs.1q': 'Was funktioniert für Labore und Lizenzvereinbarungen?',
  'm.help.labs.1a':
    'Die Startseite listet auf, was auf dieser Website läuft und was gebaut, hier aber noch nicht ausgeführt ist. Diese Liste wird mit jeder Veröffentlichung aktuell gehalten.',
  'm.help.labs.1link': 'Was heute funktioniert →',
  'm.help.wrong.t': 'Wenn etwas schiefgeht',
  'm.help.wrong.1q': 'Bei meinem Datensatz steht schon lange „im nächsten Stapel“.',
  'm.help.wrong.1a':
    'Ihr Datensatz ist gespeichert und wartet auf seinen Stapel. Die Statusseite zeigt, ob der Datierungsdienst läuft.',
  'm.help.wrong.1link': 'Status des Dienstes →',
  'm.help.wrong.2q': 'Die Prüfseite sagt, meine Datei passt nicht.',
  'm.help.wrong.2a':
    'Die Datei ist nicht Byte für Byte die versiegelte. Eine Datei zu öffnen und neu zu speichern, sie zu exportieren oder über eine App zu senden, die sie neu komprimiert, kann sie verändern. Bitten Sie um die Originaldatei.',
  'm.help.wrong.3q': 'Was, wenn es diese Website nicht mehr gibt?',
  'm.help.wrong.3a':
    'Ihre Datensätze lassen sich weiterhin prüfen. Ein kostenloses, offenes Werkzeug öffnet Ihre Sicherungskopie, prüft den Prüfcode jedes Datensatzes und nennt die Midnight-Transaktion, die ihn datiert, ohne diese Website.',
  'm.help.wrong.3link': 'Das kostenlose Werkzeug →',
  'm.help.contact.t': 'Kontakt',
  'm.help.contact.p':
    'Schreiben Sie an hunter@veilcore.org. Sagen Sie, was Sie getan haben, was Sie gesehen haben, und nennen Sie die Kennung des Datensatzes, falls es eine gibt. Senden Sie niemals Ihre Sicherungskopie oder deren Passwort.',
  'm.status.page.title': 'Status des Dienstes',
  'm.status.page.lede': 'Live abgefragt bei dem Dienst, der für diese Website Datensätze auf Midnight datiert.',
  'm.status.page.loading': 'Wird geprüft…',
  'm.status.page.none': 'Dieser Build hat keinen Datierungsdienst, der abgefragt werden könnte.',
  'm.status.page.unreachable':
    'Der Datierungsdienst hat nicht geantwortet. Datensätze, die Sie anlegen, sind gespeichert und werden datiert, sobald er wieder da ist.',
  'm.status.page.service': 'Datierungsdienst',
  'm.status.page.running': 'Läuft',
  'm.status.page.behind': 'Läuft und holt zu Midnight auf',
  'm.status.page.failing': 'Läuft, aber die letzten Stapel sind fehlgeschlagen',
  'm.status.page.lastRun': 'Letzter Lauf',
  'm.status.page.checked': 'Gerade eben geprüft, aus Ihrem Browser.',
  'm.status.page.help': 'Hilfe →',
  'footer.terms': 'Nutzungsbedingungen',
  'draft.banner': 'Maschinell erstellter Übersetzungsentwurf, wird noch geprüft. Maßgeblich ist die englische Seite.',
  'draft.showEnglish': 'Englisch anzeigen',
  'draft.close': 'Hinweis schließen',
  'notice.datingPaused':
    'Das Datieren auf Midnight ist wegen des Netzwerk-Upgrades von Midnight pausiert. Ihre Datensätze sind gespeichert und werden datiert, sobald es wieder läuft.',
  // The record app's frame and the browser tab's titles.
  'app.frame.section.log': 'Erfassen',
  'app.frame.section.send': 'Senden und empfangen',
  'app.frame.section.license': 'Lizenzen und Lizenzgebühren',
  'app.frame.section.prove': 'Nachweisen und prüfen',
  'app.frame.home': 'Ihre Datensätze. Ihr Fortschritt ist gespeichert.',
  'title.founders': 'Gründer',
  'title.terms': 'Nutzungsbedingungen',
  'title.privacy': 'Datenschutz in der Demo',
  'title.privacyMainnet': 'Datenschutz der Website',
  'title.example': 'Beispieldatensatz',
  'title.verify': 'Datensatz prüfen',
  'title.import': 'Ihre Sammlung datieren',
  'title.records': 'Ihre Datensätze',
  'title.restore': 'Datensätze wiederherstellen',
  'title.backup': 'Sicherungskopie speichern',
  'title.spec': 'Das Datensatzformat',
  'title.evidence': 'Datensätze als Beweismittel',
  'title.integrate': 'VeilCore einbinden',
  'title.implementations': 'Implementierungen',
  'title.partners': 'Einen Nachweis verlangen',
  'title.new': 'Einen Datensatz anlegen',
  'title.record': 'Datensatz',
  'title.agreements': 'Vereinbarungen',
  // PageErrorBoundary.tsx: a page that failed to draw (round 3)
  'error.page.title': 'Diese Seite konnte nicht angezeigt werden',
  'error.page.text':
    'Beim Anzeigen ist etwas schiefgegangen. Es wurde nichts geändert. Laden Sie die Seite neu oder gehen Sie zu Ihren Datensätzen.',
  'error.page.reload': 'Neu laden',
  'error.page.home': 'Ihre Datensätze',
  // Public pages (Mako's 25 September layout)
  'm.nav.about': 'Über',
  'm.nav.team': 'Team',
  'm.nav.updates': 'Neuigkeiten',
  'm.nav.spec': 'Spezifikation',
  'm.nav.demo': 'Demo testen',
  'm.nav.yours': 'Ihre Datensätze',
  'm.nav.menu': 'Menü',
  'm.hero.label': 'Nachweis dessen, was Sie in Händen halten',
  'm.hero.title1': 'Datieren Sie Ihren Datensatz.',
  'm.hero.title2': 'Ihre Genetik bleibt privat.',
  'm.hero.how': 'So funktioniert es',
  'm.hero.pasteQ': 'Laborcode oder Link von jemandem bekommen?',
  'm.hero.pasteGo': 'Hier einfügen →',
  'm.hero.cultivar': 'Sorte',
  'm.hero.bredBy': 'Gezüchtet von',
  'm.hero.bredByDefault': 'Ihr Name',
  'm.hero.demoLabel': 'Live-Demo des Prüfcodes',
  'm.hero.fpUpdated': 'Prüfcode aktualisiert',
  'm.hero.typed': 'Was Sie eingeben',
  'm.hero.goes': 'Was auf Midnight kommt',
  'm.foot.demo': 'Demo',
  'm.step1.n': '01 · Datensatz',
  'm.step2.n': '02 · Prüfcode',
  'm.step3.n': '03 · Verankern',
  'm.step4.n': '04 · Prüfen',
  'm.step4.title': 'Später vorlegen',
  'm.demo.label': 'Demo',
  'm.demo.title1': 'Probieren Sie',
  'm.demo.title2': 'die Demo.',
  'm.demo.create.title': 'Einen Datensatz anlegen',
  'm.demo.create.text':
    'Eine erfundene Pflanze, ein erfundenes Tier oder ein Dokument: versiegeln, Sicherungskopie speichern und dann seine Seite ansehen.',
  'm.demo.verify.title': 'Datensatz prüfen',
  'm.demo.verify.text':
    'Geben Sie die Kennung eines Datensatzes ein und sehen Sie, was sein Inhaber offengelegt hat und ob er verankert ist.',
  'm.demo.paste.title': 'Code oder Link bekommen?',
  'm.demo.paste.text':
    'Ein Labor mit dem Laborcode eines Züchters, oder jemand mit einem Link zu einem Datensatz oder einer Vereinbarung zum Unterschreiben: einfügen, und die passende Seite öffnet sich.',
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
  'm.status.title1': 'Wo die Dinge',
  'm.status.title2': 'stehen.',
  'm.status.lede': 'Was heute läuft und wie weit es geprüft ist.',
  'm.stat3.b': 'Kein Audit',
  'm.status.keyTitle': 'Wer den Contract ändern kann.',
  'm.status.keyText':
    'Ein Wartungsschlüssel kann ändern, wie der VeilCore-Contract auf Midnight funktioniert. Wer ihn hält, kann Operationen des Contracts hinzufügen oder ersetzen und damit die Identität jedes Datensatzes übernehmen, Lizenzen für jeden Aussteller anlegen, Verpflichtungen und Elternverknüpfungen hinzufügen oder entfernen oder Operationen abschalten. Die Blockzeiten des Netzwerks kann er nicht zurückdatieren, und jede Änderung ist on-chain sichtbar. Einen bereits verankerten Stapel und das Datum, das er einem Datensatz gibt, kann er weder ändern noch entfernen: Das steht in der Transaktion, die ihn verankert hat, und die kann niemand ändern. Heute liegt der Schlüssel auf Papier vor, je eine Kopie bei jedem Gründer, und jede Kopie allein genügt, um ihn zu verwenden. Ihn auf drei Schlüssel zu verlagern, von denen zwei zustimmen müssen, war vor dem Ledger-9-Upgrade von Midnight am 6. November 2026 geplant und ist nicht umgesetzt. Das Netzwerk akzeptiert den Schlüssel weiterhin; betrachten Sie ihn also als aktiv. Der Änderungszähler des Contracts stand am 13. November 2026 bei 16. Jeder kann ihn prüfen, und jede Änderung erhöht ihn. Jede Verwendung wird öffentlich angekündigt, nach einer schriftlichen Wartungsrichtlinie.',
  'm.status.keyLink': 'Wartungsrichtlinie lesen →',
  'm.contact.label': 'Kontakt aufnehmen',
  'm.contact.title1': 'Sprechen Sie',
  'm.contact.title2': 'mit den Gründern.',
  'm.contact.email': 'E-Mail an die Gründer',
  'm.contact.spec': 'Spezifikation lesen',
  'm.foot.explore': 'Entdecken',
  'm.foot.contact': 'Kontakt',
  'm.foot.verify': 'Datensatz prüfen',
  'm.foot.fine':
    'Nachweis, dass Sie einen Datensatz zu einem Datum hatten. Kein Rechtstitel an dem, was er beschreibt.',
  'm.foot.terms': 'Nutzungsbedingungen',
  'm.terms.inEnglish': 'Diese Bedingungen sind auf Englisch; es gilt der englische Text.',
  'm.verify.label': 'Prüfen',
  'm.verify.title': 'Einen Datensatz prüfen',
  'm.verify.lede':
    'Geben Sie die Datensatzkennung ein, die auf einem Zertifikat aufgedruckt ist oder Ihnen mitgeteilt wurde. Sie sehen, was der Inhaber teilen wollte, und was diese Seite selbst prüfen konnte: ob der Datensatz in einem versiegelten Stapel ist und ob Laborsignaturen gültig sind.',
  'm.verify.field': 'Datensatzkennung',
  'm.verify.go': 'Prüfen',
  'm.verify.fpField': 'Prüfcode (auf dem Zertifikat, optional)',
  'm.verify.fpHelp':
    'Damit prüft diese Seite den Datensatz gegen den Code, den Sie haben, nicht nur gegen die Antwort des Registers.',
  'm.verify.fpBad':
    'Ein Prüfcode hat 64 Zeichen, 0–9 und a–f. Lassen Sie das Feld leer, um nur über die Kennung zu prüfen.',
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
    'Dieser Hinweis gilt für die Demo auf dieser Website. Sie ist ein Test, auf dem Testnetz von Midnight. Bitte verwenden Sie erfundene Daten.',
  'm.privacy.sum.local.t': 'Verlässt Ihr Gerät nie unverschlossen',
  'm.privacy.sum.local.p': 'Ihre DNA-Dateien und Fotos verlassen nie Ihr Gerät. Laborberichte reisen verschlossen.',
  'm.privacy.sum.locked.t': 'Verschlossen gespeichert, wir können es nicht lesen',
  'm.privacy.sum.locked.p':
    'Alles, was Sie in einen Datensatz eingeben, und Laborberichte, die ein Labor Ihnen schickt.',
  'm.privacy.sum.read.t': 'Wir können lesen',
  'm.privacy.sum.read.p':
    'Die ID des Datensatzes, den Prüfcode, Daten und was Sie zeigen möchten. Die vollständige Liste steht unten.',
  'm.privacy.full': 'Die vollständige Liste',
  'm.privacy.stored.title': 'Auf unserem Testserver gespeichert',
  'm.privacy.stored.text':
    'Ihre Datensätze und Vereinbarungen, von Ihrem Browser verschlossen, bevor sie gesendet werden: der Name jedes Datensatzes, Züchter, Art, Daten, Notizen, Referenznummern, Eltern, die Prüfcodes und Dateinamen der Fotos und Laborberichte, die Sie hinzufügen, Vertragsbedingungen und Vertragspartner, Menge und Notiz, die Sie einem Labor schicken, die Probenangaben, die Sie und das Labor schreiben (Proben-ID, Siegelnummer, wo und wann die Probe genommen wurde, ein Zeuge, wie sie ankam), die Namen, die Sie Empfängern geben, und die geheimen Schlüssel jedes Datensatzes. Unser Server speichert sie verschlossen, und wir haben den Schlüssel nicht: Er liegt in Ihrem Browser und in Ihrer Sicherungsdatei. Der Schlüssel der Probenangaben steckt auch im Laborcode, damit das Labor sie öffnen kann. Wenn Sie es wählen, steckt der Name eines Datensatzes außerdem in einem Prüflink, den Sie erstellen, nach dem #. Diesen Teil sendet ein Browser nicht, wenn er den Link öffnet, aber der Link geht vollständig an jeden, dem Sie ihn schicken, und an jede Website, in die Sie ihn einfügen, auch an das Formular eines Partners. Lesen kann unser Server: die ID jedes Datensatzes; seinen Prüfcode, seine Schlüsselbindung und seine Profilart; einen Code aus seinem Namen, der ohne den Schlüssel in Ihrem Prüflink nichts über den Namen verrät; seine Korrekturverweise (welchen Datensatz eine Korrektur ersetzt, welche Felder sie geändert hat und wann); wann der Server ihn zuerst gesehen hat; wie oft er gespeichert wurde und wann zuletzt; ungefähr wie groß er ist (seine Größenstufe); was Sie auf seiner Prüfseite zeigen möchten (seinen Namen, wenn Sie ihn zeigen möchten, und ob ein DNA-Bericht gespeichert ist, als Code, der ohne den Schlüssel in Ihrem Prüflink nichts über die Datei verrät); die Elternverknüpfungen, die Sie registrieren; und seinen Stapel mit dessen Datumsstempel. Hat eine Vereinbarung eine Lizenzgebühr auf Nachkommen, kann unser Server lesen, welchen Datensatz sie betrifft und seit wann sie gilt, und jeder kann fragen, ob dieser Datensatz eine trägt: Die Abstammungsprüfung braucht das. Bei einer Lieferung: aus welchem Datensatz sie stammt, welches Inhaberkonto sie empfangen hat, wann sie empfangen wurde und ein Kennzeichen anstelle des Empfängernamens. Bei einer Lieferung von vor den Kennzeichen steht der Name so da, wie er eingegeben wurde, bis die Bereinigung des Registers ihn ersetzt. Bei Laboren: der öffentliche Signaturschlüssel und die Signaturen, die sie erstellen. Empfangsbestätigungen und Berichte eines Labors zu Ihrem Datensatz sind privat: Unser Server zeigt sie nur Ihnen, dem Labor und demjenigen, der ihm die Probe geschickt hat, außer Sie zeigen sie auf Ihrem Prüflink. Wenn Sie zeigen, ob ein DNA-Bericht gespeichert ist, sagt Ihre Prüfseite außerdem für jede Empfangsbestätigung, dass ein Labor eine Probe erhalten hat und ob das Angekommene dem Gesendeten entspricht, ohne den Namen des Labors. Die Signatur eines Labors über einen Bericht nennt den Bericht gebunden an Ihren Datensatz, mit einem Schlüssel, den nur Sie und das Labor haben; eine vor dem 17. Oktober 2026 erstellte nennt den SHA-256 der Berichtsdatei, den unser Server nur Ihnen, dem Labor und demjenigen zeigt, der ihm die Probe geschickt hat. Anfragen, den Schlüssel eines Datensatzes nachzuweisen, mit dem Namen, den der Fragende eingegeben hat, 7 Tage lang: Unser Server erfährt, welchen On-Chain-Schlüssel jede Anfrage nennt. Die Nachweis- und Prüfseiten senden Ihren Inhaberschlüssel nie. Ihr Inhaberschlüssel, den Ihr Browser bei jedem Speichern mitsendet, damit der Server Ihre Datensätze findet; der Server behält davon nur einen Einweg-Hash. Datensätze, die vor dem Verschließen gespeichert wurden, bleiben für uns lesbar, bis Ihr Browser sie verschließt, und der Name eines Datensatzes, der gespeichert wurde, bevor Namen verschlossen wurden, bleibt für uns lesbar, bis Ihr Browser den Datensatz erneut speichert. Probenangaben, die vor dem Verschließen geschrieben wurden, bleiben für uns lesbar, bis das Register sie entfernt. Unsere externen Sicherungen von davor behalten eine lesbare Kopie von alledem, bis wir den Schlüssel vernichten, der sie öffnet. Verschlossene Laborberichte, die ein Labor Ihnen schickt: verschlossen gespeichert, ohne den Schlüssel, und nach 180 Tagen gelöscht. Der Server ist das Testregister von VeilCore, gehostet bei Railway.',
  'm.privacy.local.title': 'Verlässt Ihren Browser nie unverschlossen',
  'm.privacy.local.text':
    'Ihre DNA-Dateien verlassen nie Ihr Gerät. Laborberichte reisen verschlossen. Ihr Browser liest die DNA-Berichte, Laborberichte und Fotos, die Sie hinzufügen, um aus jeder einen Code zu machen; die Dateien selbst werden nie hochgeladen. Ein Laborbericht erreicht unseren Server nur, wenn ein Labor ihn an Sie zurückschickt, verschlossen, sodass nur Sie ihn öffnen können.',
  'm.privacy.test.title': 'Ein Testnetz',
  'm.privacy.test.text':
    'Die Demo nutzt das Testnetz von Midnight, nicht das Live-Netzwerk. Demodaten können gelöscht werden, wenn das Testnetz zurückgesetzt wird.',
  'm.privacy.madeup.title': 'Verwenden Sie erfundene Daten',
  'm.privacy.madeup.text':
    'Bitte geben Sie keine echten Namen, echten Sorten oder vertraulichen Angaben ein. Die Demo dient dazu, das Format auszuprobieren.',
  'm.privacy.export.title': 'Export',
  'm.privacy.export.text':
    'Auf Ihrer Datensatzseite unter „Mehr“: „Alle Datensätze exportieren“ lädt die Datensätze herunter, die dieser Browser hält. „Ihre Datensätze und Vereinbarungen von VeilCore herunterladen“ lädt herunter, was unser Server dafür speichert, in Ihrem Browser geöffnet: Ihre Datensätze, Vereinbarungen, Freigabe-Einstellungen und für jeden Datensatz seinen Nachweis und seinen Stapel. Nicht enthalten sind Ihre Lieferungen mit ihren Probenangaben, verschlossene Laborberichte, Lizenzgebühren auf Nachkommen und Anfragen, den Schlüssel eines Datensatzes nachzuweisen. Lieferungen, ihre Probenangaben und Laborberichte öffnen Sie in der App bei der Lieferung. Über Lizenzgebühren auf Nachkommen gibt die Abstammungsprüfung Auskunft, für jeweils einen Datensatz. Nachweis-Anfragen werden nach 7 Tagen gelöscht. Keine der beiden Dateien enthält Ihre Schlüssel oder die geheimen Schlüssel Ihrer Datensätze: Die stehen in Ihrer Sicherungsdatei.',
  'm.privacy.delete.title': 'Löschung',
  'm.privacy.delete.text':
    'Wenn Sie Ihre Demodaten von unserem Server löschen lassen möchten, schreiben Sie an hunter@veilcore.org und nennen Sie die Kennungen Ihrer Datensätze.',
  'm.privacy.browser.title': 'In Ihrem Browser gespeichert',
  'm.privacy.browser.text':
    'Ihr Browser speichert auf diesem Gerät: Ihren Inhaberschlüssel (eine Kopie geht auch an unseren Server, siehe oben); den Schlüssel, der Ihre Datensätze verschließt und nie an uns gesendet wird; Ihre eigene Kopie Ihrer Datensätze; die geheimen Schlüssel jedes Datensatzes, die seine Laborberichte verschließen (eine verschlossene Kopie geht auch mit dem Datensatz); die Labor-Codes, die Sie erstellen oder verwenden, mit einem Abholcode und dem Schlüssel zu den Angaben einer Lieferung; den Signaturschlüssel eines Labors, falls Sie einen eingerichtet haben (sein privater Teil wird nie an uns gesendet); die gewählte Rolle; und Ihre Sprache. Ihre Sicherungsdatei enthält eine Kopie jedes Schlüssels und der Labor-Codes, die Sie erstellt haben. Um sie zu entfernen, löschen Sie die Daten dieser Website in den Einstellungen Ihres Browsers. Speichern Sie vorher Ihre Sicherungskopie: Ohne sie können Sie Ihre Datensätze nicht mehr finden oder öffnen.',
  'm.privacy.deviceonly.title': 'Ein Dokument, das nur auf diesem Gerät aufbewahrt wird',
  'm.privacy.deviceonly.text':
    'Wenn Sie ein Dokument versiegeln, können Sie wählen, seinen Datensatz nur auf diesem Gerät und in Ihrer Sicherungsdatei aufzubewahren. Dann wird nichts, was Sie dort eingeben, an unseren Server gesendet, weder verschlossen noch offen. Was wir erhalten: die Kennung des Datensatzes, seinen Prüfcode und seine Schlüsselbindung, damit er datiert werden kann; Ihre Netzwerkadresse und die Uhrzeit, wie bei jeder Anfrage; und, wenn Sie eine Passkey-Kopie haben, die Kennung und die Schlüssel des Datensatzes in dieser verschlossenen Kopie. Wenn Sie den Schlüssel des Datensatzes mit einem Datum stempeln, geht ein Code aus dem Schlüssel über unseren Gebührendienst an Midnight. Eine Ausnahme, und nur, wenn Sie sie wählen: Wenn Sie eine seiner Zahlen belegen, geht eine Tatsache über diese Zahl über unseren Gebührendienst an Midnight und ist dauerhaft öffentlich. Das ist die Grenze, die Sie setzen, mit ihrer Richtung oder, wenn Sie die Zahl genau belegen, die Zahl selbst. Nichts davon geht an unser Register. Was Sie belegen, ist aber öffentlich, und wir und jeder, der den Prüflink des Datensatzes hat, können es dem Datensatz zuordnen; wir können es außerdem dem Inhaberschlüssel zuordnen, der ihn datiert hat. Einen solchen Datensatz können wir nicht zurückgeben: Die einzigen Kopien liegen in Ihrem Browser und in einer Sicherungsdatei, die nach dem Versiegeln gespeichert wurde; die App bittet Sie sofort, eine zu speichern und zu prüfen. Wer von Ihnen den Prüflink und die Datei erhält, kann ihn weiterhin prüfen. Die Wahl wird beim Versiegeln getroffen und lässt sich danach nicht ändern.',
  'm.privacy.deals.title': 'Vereinbarungen und Lizenzgebühren',
  'm.privacy.deals.text':
    'Die Nachrichten eines Lizenzgeschäfts (die Bedingungen, jeder Bericht über Lizenzgebühren, die Antwort darauf, „Ich habe gezahlt“, „Erhalten“, Erinnerungen und Mitteilungen sowie die Auszahlungs- und Geschäftsangaben des Lizenzgebers) sind mit einem Schlüssel verschlossen, den nur die beiden Seiten teilen; er entsteht, wenn sie sich den 6-stelligen Code vorlesen. Unser Server speichert sie verschlossen und reicht sie weiter: Er kann sie weder lesen noch ändern noch fälschen. Er sieht, zu welcher Lizenz ein Geschäft gehört, wie viele Nachrichten es hat und wann jede ankam. Auszahlungsangaben (ein Bankkonto, ein Zahlungslink oder eine Midnight-Adresse) und Geschäftsangaben (rechtlicher Name, Anschrift und Steuernummer) reisen in diesen verschlossenen Nachrichten: Die andere Seite kann sie lesen, wir nicht. Jede Kopie, die Sie herunterladen oder sichern (der signierte Verlauf eines Geschäfts, Ihre Sicherungsdatei), enthält sie im Klartext; behandeln Sie diese Dateien also wie einen Kontoauszug. Die Quittung eines Zahlungspartners kann lesen, wer den Prüfcode der Abrechnung hat; den haben nur die beiden Seiten und ihr Partner. Wir bewahren die Nachrichten eines Geschäfts auf, bis eine Seite uns bittet, sie zu löschen; die andere Seite behält ihre eigene Kopie. Die Lizenz selbst liegt auf Midnight: siehe „Was auf Midnight landet“.',
  'm.privacy.chain.title': 'Was auf Midnight landet, dauerhaft',
  'm.privacy.chain.text':
    'Midnight ist ein öffentliches Netzwerk: Was dort landet, kann niemand ändern oder entfernen, auch wir nicht, und jeder kann es lesen. Ihre Genetik, Ihre Bedingungen, Ihr Name und Ihre Dateien landen dort nie. Was dort landet: der Prüfcode jedes Stapels von Datensätzen; der eigene Schlüssel eines Datensatzes und sein Datumsstempel; ein Code aus einem DNA-Bericht, wenn Sie dessen Kopplung datieren; welche Datensätze als Eltern und Nachkommen verknüpft sind, sobald beide Inhaber bestätigen (eine Verknüpfung lässt sich nicht zurücknehmen); dass auf einem Datensatz eine Lizenz, eine Verpflichtung oder der Anspruch eines Kreditgebers vermerkt ist, und wann sich das geändert hat; der öffentliche Schlüssel eines Labors, wenn es dort ein Zertifikat signiert; ein Wert, den Sie exakt nachweisen wollen, vollständig; und, wo diese Website Lizenzgebühren in NIGHT zahlen lässt, der Betrag und die beiden Adressen. Vor jedem dieser Schritte zeigt die App eine Quittung, die genau auflistet, was der Schritt öffentlich macht. Ein Code oder Schlüssel allein sagt nichts über Sie, aber wer von Ihnen einen Prüflink bekommt, kann von da an verfolgen, was mit diesem Datensatz im Netzwerk geschieht.',
  'm.privacy.helper.title': 'Der Helfer und sein optionales Modell',
  'm.privacy.helper.text':
    '„Fragen“, der Helfer in der App, arbeitet dort, wo diese Website ihn anbietet, auf Ihrem Gerät. Nichts, was Sie dort eingeben, wird irgendwohin gesendet; nur das Speichern der App selbst sendet etwas, und das geht verschlossen an unseren Server, wie oben beschrieben. Wo diese Website das optionale Sprachmodell anbietet, wird es einmal von Hugging Face heruntergeladen, einem eigenen Unternehmen: Hugging Face sieht Ihre IP-Adresse, die Uhrzeit, welche Modelldateien und dass die Anfrage von dieser Website kommt; wir sehen, dass ein Download begonnen hat. Das Modell läuft auf Ihrem Gerät, in einem Teil der Seite, der das Netzwerk nicht erreichen kann; nichts, was Sie eingeben, gelangt zu Hugging Face oder zu uns, weder dann noch später. Sie können das Modell im Bereich des Helfers löschen. Sein „Für mich erledigen“ führt zu jedem Auftrag eine Aufzeichnung nur auf Ihrem Gerät, nie in einer Sicherung: die Schritte und wie weit sie sind, Verweise auf die beteiligten Datensätze und Vereinbarungen und die Zahlen, die Sie für einen Bericht eingeben, bis er gesendet ist; nie, was Sie zum Fragen geschrieben haben. Sie wird 7 Tage nach dem Ende des Auftrags gelöscht. Solange ein Auftrag auf Ihre Zustimmung wartet, bleiben seine neuen Datensätze verschlossen mit ihren Schlüsseln in Ihrem Browser; eine Sicherung aus dieser Zeit enthält diese Schlüssel ebenfalls. Um Berichte vorzubereiten, werden die Nachrichten Ihrer Vereinbarungen nacheinander von unserem Server gelesen, sodass unser Server sehen kann, dass diese Vereinbarungen zusammen gelesen wurden; gesendet wird erst, wenn Sie freigeben.',
  'm.privacy.hosts.title': 'Hosting',
  'm.privacy.hosts.text':
    'Diese Website wird bei Vercel gehostet, das IP-Adressen und Anfragen protokolliert. Unser Registerserver läuft bei Railway, das Anfragen protokolliert.',
  'm.privacy.who.title': 'Wer es aufbewahrt, und wie lange',
  'm.privacy.who.text':
    'VeilCore ist noch nicht als Unternehmen gegründet; die Gründer von VeilCore betreiben diese Website und das Register. Verschlossene Laborberichte werden 180 Tage nach Eingang gelöscht. Anfragen, den Schlüssel eines Datensatzes nachzuweisen, werden nach 7 Tagen gelöscht. Für alles andere gibt es keine feste Aufbewahrungsfrist: Es bleibt, bis Sie uns bitten, es zu löschen. Kontakt: hunter@veilcore.org.',
  'm.notfound.title': 'Seite nicht gefunden.',
  'm.notfound.text':
    'Unter dieser Adresse gibt es keine Seite. Wenn Ihnen jemand einen Link zu einem Datensatz gegeben hat, prüfen Sie, ob er vollständig ist.',
  'm.notfound.home': 'Startseite von VeilCore →',
  'm.privacy.contact': 'Fragen: hunter@veilcore.org',
  // Round 2 truth pass (14 Oct 2026): keys added or newly translated.
  'm.hero.lede':
    'Für Züchter, Saatgutunternehmen und Labore, die mit pflanzlicher, tierischer und mikrobieller Genetik arbeiten: Geben Sie Ihren Datensätzen ein Datum, das niemand zurückdatieren kann. Ihre genetischen Daten bleiben verschlossen: DNA-Dateien verlassen Ihren Computer nie, und was Sie eingeben, erreicht unseren Server verschlossen. Nur Prüfcodes kommen auf Midnight, das sie datiert.',
  'm.for.3p':
    'Senden Sie Material mit einem Laborcode. Das Labor signiert eine Empfangsbestätigung mit seinem eigenen Schlüssel, sodass der Datensatz eine zweite Partei zeigt. Die Bestätigung ist eine echte Signatur, gespeichert im Register von VeilCore, nicht auf der Chain. Bedingungen wie „keine Vermehrung“ sind in der Web-Demo nur zum Üben.',
  'm.get.1b': 'für einen Datensatz dessen, was Sie haben, ohne Ihre Genetik zu zeigen.',
  'm.get.3b':
    'Eine Elternverknüpfung zählt nur, wenn beide Inhaber sie bestätigen. Auf dieser Website erfasst sie das Register von VeilCore, nicht die Chain.',
  'm.open.2t': 'Bewahren Sie eine Datei auf.',
  'm.open.2p':
    'Auf der Seite Ihres Datensatzes: „Nachweispaket herunterladen“. Eine .zip-Datei mit dem Datensatz, wie er versiegelt wurde, seinem Einschlussnachweis, dem Prüfcode des Stapels, dem Ort, an dem der Stapel festgehalten wurde, der Bitcoin-Stempeldatei, falls es eine gibt, und einer Seite, die alles offline prüft. Ihre Sicherungsdatei enthält Ihre Schlüssel, nicht diese Dateien. Die einzelnen Dateien gibt es weiterhin unter „Technische Details“: „Datensatz exportieren“, „Inklusionsnachweis herunterladen“, „Bitcoin-Stempeldatei herunterladen“.',
  'm.faq.1a':
    'Sobald Datensätze verankert sind, kann jeder prüfen, welcher zuerst verankert wurde. Koppeln Sie Ihren Laborbericht, damit ein späterer Test damit verglichen werden kann. Wenn Sie Material versenden, signiert der Empfänger mit seinem eigenen Schlüssel eine Empfangsbestätigung. Ein Datensatz ist ein Beweismittel, keine Registrierung: Er zeigt, dass Sie diesen Datensatz zu diesem Datum hatten, nicht, dass Sie das Material hatten, und entscheidet einen Streit nicht allein.',
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
  'm.postG.date': '16. Nov. 2026',
  'm.postG.tag': 'Datensätze',
  'm.postG.title': 'Eine Produktionskette, Schritt für Schritt',
  'm.postG.text':
    'Eine Anbaucharge und eine Erntepartie sind jetzt eigene Datensätze, die jeweils den vorherigen nennen: die Pflanze, die Charge, die Partie, der Laborbericht. Jeder hat sein eigenes Datum. Ein Link kann die Kette mitnehmen, sodass jeder, der ihn prüft, jeden Schritt öffnen kann. Die Verknüpfungen sind die Angabe des Inhabers; das Datum jedes Datensatzes wird auf Midnight geprüft. Am 16. November 2026 zum ersten Mal auf veilcore.org durchgeführt.',
  'm.postF.date': '16. Nov. 2026',
  'm.postF.tag': 'Datenschutz',
  'm.postF.title': 'Ein Dokument nur auf Ihrem Gerät behalten',
  'm.postF.text':
    'Beim Versiegeln eines Dokuments können Sie es jetzt nur auf diesem Gerät und in Ihrer Sicherungsdatei behalten. Nichts, was Sie eingeben, wird gesendet, weder verschlossen noch offen: Das Register von VeilCore erhält die ID des Datensatzes, seinen Prüfcode und seine Schlüsselbindung, damit er datiert werden kann. Am 16. November 2026 zum ersten Mal auf veilcore.org versiegelt, datiert und geprüft.',
  'm.postE.date': '2. Nov. 2026',
  'm.postE.tag': 'Nachweis',
  'm.postE.title': 'Eine Nachweisdatei für jedes Dokument',
  'm.postE.text':
    'Auf der Seite eines Dokuments lässt sich jetzt eine Datei herunterladen, die eine Anwältin oder ein Prüfer ohne unsere Website prüfen kann: der Datensatz wie versiegelt, sein Nachweis, wo er datiert wurde, eine Seite, die die Prüfungen offline ausführt, eine Zusammenfassung zum Drucken und ein Mustertext für eine Erklärung. Sie können eine Kopie des Dokuments beilegen; sie wird vorher mit dem Datensatz abgeglichen.',
  'm.postD.date': '31. Okt. 2026',
  'm.postD.tag': 'Website',
  'm.postD.title': 'Ein Dokument versiegeln',
  'm.postD.text':
    'Genehmigungen, Zertifikate, Verträge: Ihr Computer berechnet den Code der Datei, und nur der Prüfcode des Datensatzes wird auf Midnight datiert. Die Datei verlässt Ihr Gerät nie. Schicken Sie einen Prüflink mit der Datei, und wer sie bekommt, sieht, dass es Byte für Byte dieselbe Datei ist und wann Sie sie hatten.',
  'm.postC.date': '19. Okt. 2026',
  'm.postC.tag': 'Website',
  'm.postC.title': 'Ihr Browser sendet seine eigenen Transaktionen',
  'm.postC.text':
    'Auf veilcore.org datiert Ihr Browser jetzt selbst die Kopplung eines DNA-Berichts, weist einen Datensatz per Link nach und versieht den eigenen Schlüssel eines Datensatzes mit einem Datumsstempel; VeilCore zahlt die Netzwerkgebühr. Datensätze werden in Stapeln im Hauptnetz von Midnight datiert. Kein Wallet nötig.',
  'm.postB.date': '11. Okt. 2026',
  'm.postB.tag': 'Register',
  'm.postB.title': 'Erster Stapel auch auf Bitcoin datiert',
  'm.postB.text':
    'Die ersten Stapel des Registers wurden von Hand im Hauptnetz von Midnight verankert. Bei einem davon, mit fünf unserer eigenen Testdatensätze, ist die Wurzel zusätzlich auf Bitcoin gestempelt, in Block 971004. Am 15. Oktober mit zwei Block-Explorern geprüft: Der Stempel führt zu den Bitcoin-Blöcken 971004 und 971005. Eine Prüfung mit dem offiziellen OpenTimestamps-Werkzeug und einem vollständigen Bitcoin-Knoten steht noch aus.',
  'm.founders.lede':
    'VeilCore ist ein Datensatzformat für Beweiszwecke, für pflanzliche, tierische und mikrobielle Genetik. Es belegt, dass Sie einen Datensatz Ihres Materials zu einem bestimmten Datum hatten, ohne dass Sie Ihre genetischen Daten herausgeben.',
  'm.live.label': 'Was wo läuft',
  'm.live.title1': 'Was funktioniert,',
  'm.live.title2': 'und wo.',
  'm.live.lede':
    'veilcore.org läuft im Hauptnetz von Midnight, und Datensätze dort sind echt. Die Test-Website ist zum Üben, und ihre Datensätze haben kein Gewicht. Manche Funktionen werden dort zuerst ausprobiert.',
  'm.live.colMain': 'veilcore.org (Hauptnetz)',
  'm.live.colTest': 'test.veilcore.org',
  'm.live.colNot': 'Noch nicht',
  'm.live.stamp.t': 'Ein Datumsstempel für Ihren Datensatz',
  'm.live.stamp.main': 'Ja, in Stapeln, auf Midnight datiert. Ihr Browser sendet nichts an die Chain.',
  'm.live.stamp.test':
    'Ja. Stapel werden automatisch datiert, und das datiert Ihren Datensatz. Ihr Browser versieht außerdem den eigenen Schlüssel Ihres Datensatzes mit einem Datumsstempel; der datiert nur den Schlüssel.',
  'm.live.share.t': 'Wählen, was andere sehen',
  'm.live.share.main':
    'Ja. Sie wählen jede Angabe. Der Name erscheint nur in Links, die Sie senden, oder wenn Sie ihn zeigen möchten.',
  'm.live.share.test':
    'Ja. Sie wählen jede Angabe. Der Name erscheint nur in Links, die Sie senden, oder wenn Sie ihn zeigen möchten.',
  'm.live.lab.t': 'Laborcode und signierte Empfangsbestätigung',
  'm.live.lab.main':
    'Ja. Das Labor signiert mit seinem eigenen Schlüssel. Das Register von VeilCore bewahrt die Bestätigung auf, nicht die Chain.',
  'm.live.lab.test': 'Ja, auf die gleiche Weise.',
  'm.live.results.t': 'Laborberichte, die nur Sie öffnen können',
  'm.live.results.main': 'Ja. Neu und noch in der Erprobung.',
  'm.live.results.test': 'Ja. Neu und noch in der Erprobung.',
  // Numbers and results a lab signs (config/network.ts LAB_SIGNING_ENABLED). The veilcore.org cell
  // says 'main' until it has worked there (config/copy.ts LAB_SIGNING_RUN_ON_MAINNET), then 'live'.
  'm.live.signed.t': 'Zahlen und Ergebnisse, die ein Labor signiert',
  'm.live.signed.main': 'Gebaut, im Hauptnetz aber noch nicht ausprobiert.',
  'm.live.signed.test':
    'Ja. Das Labor signiert mit seinem eigenen Schlüssel. Nur der Inhaber des Datensatzes, das Labor und wer ihm die Probe geschickt hat, sehen es, und nur der Inhaber kann es anderen zeigen.',
  'm.live.signed.live':
    'Ja. Das Labor signiert mit seinem eigenen Schlüssel. Nur der Inhaber des Datensatzes, das Labor und wer ihm die Probe geschickt hat, sehen es, und nur der Inhaber kann es anderen zeigen. Die Ergebnisdatei eines Labors zu den Datensätzen eines anderen Züchters hinzuzufügen ist gebaut, aber noch nicht im Hauptnetz erprobt.',
  'm.live.local.t': 'Ein Dokument, das nur auf Ihrem Gerät aufbewahrt wird',
  'm.live.local.main': 'Gebaut, im Hauptnetz aber noch nicht ausprobiert.',
  'm.live.local.test':
    'Ja, für Dokument-Datensätze. Nichts von dem, was Sie eingeben, wird an VeilCore gesendet: nur die Kennung des Datensatzes, sein Prüfcode und seine Schlüsselbindung. Die einzige Ausnahme ist eine Zahl, die Sie belegen wollen (nächste Zeile).',
  'm.live.local.live':
    'Ja, für Dokument-Datensätze. Nichts von dem, was Sie eingeben, wird an VeilCore gesendet: nur die Kennung des Datensatzes, sein Prüfcode und seine Schlüsselbindung. Die einzige Ausnahme ist eine Zahl, die Sie belegen wollen (nächste Zeile).',
  'm.live.docchain.t': 'Eine Produktionskette als verknüpfte Datensätze',
  'm.live.docchain.main': 'Gebaut, im Hauptnetz aber noch nicht ausprobiert.',
  'm.live.docchain.test':
    'Gebaut, aber noch nicht ausprobiert. Ausgangsdatensatz, Anbaucharge, Erntelos und Laborbericht nennen jeweils den vorherigen, und jeder hat sein eigenes Datum. Die Verknüpfungen sind die Angabe des Inhabers.',
  'm.live.docchain.live':
    'Ja. Ausgangsdatensatz, Anbaucharge, Erntelos und Laborbericht nennen jeweils den vorherigen, und jeder hat sein eigenes Datum. Die Verknüpfungen sind die Angabe des Inhabers und werden weder von VeilCore noch von Midnight geprüft.',
  'm.live.localclaims.t': 'Eine Zahl aus einem Dokument belegen, das nur auf Ihrem Gerät liegt',
  'm.live.localclaims.main': 'Gebaut, im Hauptnetz aber noch nicht ausprobiert.',
  'm.live.localclaims.test':
    'Gebaut, aber noch nicht ausprobiert. Ihre Wahl, aus, bis Sie es einschalten. Was Sie belegen, ist auf Midnight öffentlich; an das Register von VeilCore geht nichts, aber VeilCore kann das Belegte dem Datensatz zuordnen.',
  'm.live.localclaims.live':
    'Ja. Ihre Wahl, aus, bis Sie es einschalten. Was Sie belegen, ist auf Midnight öffentlich; an das Register von VeilCore geht nichts, aber VeilCore kann das Belegte dem Datensatz zuordnen.',
  'm.live.dna.t': 'Ein Datum für die Kopplung Ihres DNA-Berichts',
  'm.live.dna.main': 'Mit Ihrem Datensatz gespeichert, nicht datiert.',
  'm.live.dna.test': 'Ja, aus Ihrem Browser gesendet.',
  'm.live.prove.t': 'Nachweis per Link',
  'm.live.prove.test':
    'Ja. Die Seite der anderen Person prüft im Netzwerk, dass Sie den eigenen Schlüssel des Datensatzes kontrollieren. Der Datensatz hat diesen Schlüssel beim Versiegeln benannt, deshalb lässt er sich nicht austauschen.',
  'm.live.prove.not': 'Auf veilcore.org: Dafür muss Ihr Browser eine Transaktion senden.',
  'm.live.claims.t': 'Eine Tatsache beweisen (Claims)',
  'm.live.claims.main': 'Im Hauptnetz, ohne Wartungsschlüssel. Die Website kann ihn noch nicht nutzen.',
  'm.live.claims.not': 'Ihn über die Website nutzen.',
  'm.live.claims.live':
    'Ja, an einem Computer: eine Zahl aus einem versiegelten Zertifikat oder Laborergebnis belegen, ohne den Rest zu zeigen. Auf Handys noch nicht ausprobiert.',
  'm.live.lic.t': 'Lizenzen und Lizenzgebühren',
  'm.live.lic.main': 'Abgeschaltet bis zu einem letzten Testlauf.',
  'm.live.lic.test': 'Ja, mit echten Transaktionen: Lizenzgebühren, Zahlungen, Weitergabe einer Lizenz.',
  'm.live.lic.not': 'Auf veilcore.org, nach einem letzten Testlauf.',
  // The veilcore.org cell until royalties v2 has worked on mainnet (config/copy.ts ROYALTIES_RUN_ON_MAINNET).
  'm.live.lic.mainNext':
    'Lizenzen gehen mit dem Deployment live, das sie einschaltet, sobald eine echte Lizenz im Hauptnetz einmal vollständig funktioniert hat. Abrechnungen von Lizenzgebühren und Zahlungen: gebaut, noch nicht live.',
  // The test-site cell until royalties v2 has run there (config/copy.ts ROYALTIES_RUN_ON_TEST).
  'm.live.lic.testNext':
    'Ja für Lizenzen, mit echten Transaktionen. Berichte über Lizenzgebühren (auf veilcore.org haben sie funktioniert) und das Zahlen direkt auf Midnight: gebaut und hier angeboten; in diesem Netz haben sie noch nicht vollständig funktioniert.',
  // Licenses on in code, on a build that isn't veilcore.org's (the test site, the demo): the main-network cell.
  'm.live.lic.next':
    'Gebaut. Geht mit dem nächsten Deployment von veilcore.org live, sobald eine echte Lizenz im Hauptnetz einmal vollständig funktioniert hat.',
  // Licenses on, on veilcore.org's own build (AGREEMENTS_LIVE, mainnet sponsor live): the main-network cell (components/site/Home.tsx).
  'm.live.lic.live':
    'Ja: Lizenzen, mit echten Transaktionen, und Berichte über Lizenzgebühren mit Antwort, „Ich habe bezahlt“ und „Eingang bestätigt“. Die Weitergabe einer Lizenz ist gebaut, im Hauptnetz aber noch nicht ausprobiert. Lizenzgebühren direkt auf Midnight zahlen gibt es nur auf der Testseite, und dort hat es noch nicht vollständig funktioniert.',
  'm.live.chain.t': 'Die Prüfseite liest Midnight selbst',
  'm.live.chain.main': 'Noch nicht: Dafür braucht es unseren Relaisdienst, der nur liest.',
  'm.live.chain.test': 'Ja.',
  // Round 3 (14 Oct 2026): the rest of the landing page, so no English shows through.
  'nav.newCultivar': 'Neuer Datensatz',
  'nav.licenses': 'Vereinbarungen',
  'footer.about': 'Ein offenes Datensatzformat für pflanzliche, tierische und mikrobielle Genetik.',
  'footer.howCheck': 'Wie die Prüfung funktioniert →',
  'm.hero.status':
    'Start im Hauptnetz von Midnight. Heute werden Datensätze in einem Testnetz von Midnight datiert, und das beweist noch nichts.',
  'm.claims.status':
    'Ein zweiter Midnight-Contract, am 4. Oktober 2026 im Preprod-Testnetz von Midnight durchgängig getestet, mit erfundenen Markerdaten. Er ist noch nicht in dieser Web-Demo und noch nicht im Hauptnetz.',
  'm.faq.3a':
    'Es ist als Beweismittel gebaut, und unser Hinweis für Juristen sagt, was es beweist und was nicht. Heute werden Datensätze in einem Testnetz von Midnight datiert, und ein Datum aus einem Testnetz hat keine Beweiskraft. Der Start im Hauptnetz steht kurz bevor.',
  'm.stat2.b': 'Testnetz',
  'm.stat2.s': 'Beide Contracts in einem Testnetz von Midnight durchgehend getestet. Noch nicht im Hauptnetz.',
  'm.foot.about':
    'Ein offenes Datensatzformat für pflanzliche, tierische und mikrobielle Genetik. Gebaut für die Verankerung auf Midnight; getestet in einem Testnetz von Midnight.',
  'm.for.2p':
    'Züchter möchten mit ihren Markern zeigen, dass eine Sorte unterscheidbar ist, und behandeln diese Marker als Geschäftsgeheimnis. Ein VeilCore-Claim beweist eine Tatsache über sie, ohne den Rest zu zeigen. Noch akzeptiert keine Prüfstelle und keine Anerkennungsstelle ihn.',
  'm.hero.note':
    'Tippen Sie in eines der beiden Felder; nichts wird gesendet. Der goldene Streifen unten ist der Prüfcode, der Teil, der auf Midnight kommt. Niemand kann daraus zurückrechnen, was Sie eingegeben haben.',
  'm.hero.noteShort': 'Nur der goldene Streifen kommt auf Midnight.',
  'm.hero.stampWord': 'Datiert',
  'm.hero.stampLine': 'auf Midnight',
  'm.home.try': 'Probieren Sie es aus. Nichts wird gesendet.',
  'm.home.tryNote':
    'Das Bild oben wird aus diesem Prüfcode gezeichnet. Niemand kann daraus zurückrechnen, was Sie eingegeben haben.',
  'm.home.audLabel': 'Für wen',
  'm.home.audience': 'Züchter|Saatgutunternehmen|Gewebekulturlabore|Zertifizierer|Prüfer|Herdbücher|Sortenämter',
  'm.home.keep.t': 'Ihre Genetik bleibt bei Ihnen.',
  'm.home.keep.p':
    'Auf Midnight kommen nur Prüfcodes, nie das, was Sie eingegeben haben, und nie Ihre Dateien. Der Code eines Datensatzes sind 64 Zeichen, die Ihr Computer daraus berechnet, und niemand kann daraus auf die Pflanze, die Marker oder den Namen zurückschließen.',
  'm.home.tlDated': 'Datensatz datiert',
  'm.home.tlAsks': 'Jemand fragt nach',
  'm.home.matters': 'Wo es zählt.',
  'm.home.prev': 'Zurück',
  'm.home.next': 'Weiter',
  'm.home.custody.t': 'Wir können Ihre Datensätze nicht lesen: Sie erreichen uns verschlossen.',
  'm.home.custody.p1':
    'Das Material selbst zu registrieren heißt, es herzugeben. Mit VeilCore verlassen Ihre DNA-Dateien Ihren Computer nie.',
  'm.home.custody.p2':
    'Die Angaben des Datensatzes erreichen unseren Server verschlossen, der Name eingeschlossen, und wir haben den Schlüssel nicht.',
  'm.home.ex.label': 'Ein Beispieldatensatz, kein echter.',
  'm.home.ex.dna': 'DNA-Bericht',
  'm.home.l2': 'Sein Prüfcode: 64 Zeichen, auf Ihrem Computer berechnet.',
  'm.home.l3': 'Ihr Code kommt mit anderen in einen Stapel. Der Block, in dem er landet, ist das Datum.',
  'm.home.l3b': 'Ein Stapel, viele Datensätze',
  'm.home.l4v': 'Der Datensatz existierte spätestens an diesem Datum.',
  'm.home.l4': 'Jeder kann es prüfen, kostenlos und ohne Konto.',
  'm.home.more': 'Mehr als ein Datum.',
  'm.home.f1t': 'Pflanzen, Tiere und Stämme.',
  'm.home.f1p': 'Sorten und Linien, einzelne Tiere und Blutlinien, Mikroben, Pilze und Zelllinien.',
  'm.home.f2t': 'Dokumente.',
  'm.home.f2p':
    'Versiegeln Sie eine Genehmigung, ein Zertifikat, einen Vertrag oder einen Laborbericht. Die Datei selbst bleibt auf Ihrem Gerät.',
  'm.home.ask.t': '„Fragen“, in einfachen Worten.',
  'm.home.ask.p':
    'Auf den Seiten Ihrer Datensätze füllt „Fragen“ einen Datensatz oder eine Reihe von Stecklingen oder Nachkommen aus, damit Sie ihn prüfen. Es unterschreibt und sendet nie etwas. Das tun Sie.',
  'm.home.trustLabel': 'Was es Ihnen gibt',
  'm.home.trust':
    'Nachweis, dass Sie einen Datensatz spätestens zu einem Datum hatten|Ein Datum, das niemand zurückdatieren kann|Prüfen ist kostenlos|Ein offenes Format|Keine Wallet, keine Anmeldung',
  'm.home.pause': 'Laufende Namen anhalten',
  'm.home.play': 'Laufende Namen fortsetzen',
  'm.home.fails': 'Sagen Sie uns, wo es scheitert.',
  'm.home.closeLede':
    'Züchter, Labore, Zertifizierer und Entwickler: Legen Sie einen Datensatz an und sagen Sie uns dann, was für Ihre Arbeit fehlt.',
  'm.home.photos': 'Fotos auf Unsplash:',
  'm.home.alt.jar': 'Ein Samen keimt über einem Glas mit Wasser, die Wurzeln im Wasser',
  'm.home.alt.cutting': 'Ein junger Sämling wächst aus dunkler Erde',
  'm.home.alt.greenhouse': 'Reihen junger Pflanzen in einem langen Gewächshaus',
  'm.home.alt.lab': 'Ein Labortisch mit Pipetten und Probenröhrchen',
  'm.home.alt.hand': 'Zwei Hände halten einen Sämling in einem Klumpen Erde',
  'm.home.alt.cattle': 'Milchkühe mit Ohrmarken auf einer Weide bei Sonnenuntergang',
  'm.for.label': 'Wofür es da ist',
  'm.for.title1': 'Viele Streitigkeiten um Genetik laufen auf eine Frage hinaus:',
  'm.for.title2': 'Was hatten Sie, und wann?',
  'm.for.lede':
    'Notizbücher und Dateien datiert, wer sie führt, deshalb lassen sie sich leicht anzweifeln. Das Material selbst zu registrieren heißt, genau das herauszugeben, was Sie schützen wollen.',
  'm.for.1t': 'Ein Steckling verschwindet.',
  'm.for.1p':
    'Versiegeln Sie einen Datensatz und koppeln Sie seinen DNA-Bericht. Taucht die Pflanze unter anderem Namen auf, kann ein Labor einen neuen Test mit Ihrem Bericht vergleichen. In der Web-Demo wird die Kopplung mit Ihrem Datensatz gespeichert, aber noch nicht datiert. VeilCore führt keine DNA-Tests durch.',
  'm.for.2t': 'Sortenschutz und Anerkennung.',
  'm.for.2link': 'So funktioniert ein Claim →',
  'm.for.3t': 'Material in den Händen eines Labors.',
  'm.for.4t': 'Laborergebnisse, zurück zu Ihnen.',
  'm.for.4p':
    'Das Labor signiert Ihren Bericht und verschließt ihn so, dass nur Sie ihn öffnen können. Kein PDF liegt in irgendeinem Posteingang. Die verschlossene Datei wartet auf dem Server von VeilCore darauf, dass Sie sie öffnen, und wir haben ihren Schlüssel nicht. VeilCore erfasst, wer signiert hat; für das Ergebnis bürgt VeilCore nicht. Neu und noch in der Erprobung.',
  'm.for.6t': 'Jemand verlangt einen Nachweis.',
  'm.for.6p':
    'Man schickt Ihnen einen Link. Sie tippen einmal, und die Seite der anderen Person prüft im Netzwerk, dass Sie den eigenen Schlüssel Ihres Datensatzes kontrollieren. Ihr Datensatz hat diesen Schlüssel beim Versiegeln benannt, deshalb lässt er sich nicht austauschen. Wer Sie sind oder wer die Pflanze gezüchtet hat, zeigt es nicht. Das funktioniert vorerst in einem Testnetz von Midnight.',
  'm.for.5t': 'Tierlinien.',
  'm.for.5p':
    'Herdbücher führen die Abstammung. Ein Datensatz kann jedem Eintrag ein Datum geben, das niemand zurückdatieren kann, ohne den Genotyp zu veröffentlichen. Auf dieser Website können Sie ein Tier erfassen: seine Einzeltierkennung, Vater und Mutter und einen DNA-Bericht.',
  'm.for.5ask': 'Wenn Sie Tiere züchten, sagen Sie uns, was Ihre Datensätze brauchen.',
  'm.how.label': 'So funktioniert es',
  'm.how.title1': 'Vier Schritte.',
  'm.how.title2': 'Die Genetik bleibt bei Ihnen.',
  'm.step1.title': 'Aufschreiben',
  'm.step1.text':
    'Was es ist und woher es stammt. Der Server von VeilCore speichert die Angaben verschlossen, auch den Namen, und wir haben den Schlüssel nicht. Ein Prüflink trägt den Namen nur, wenn Sie das einschalten, für die Menschen, denen Sie ihn schicken.',
  'm.step2.title': 'Prüfcode erstellen',
  'm.step2.text': 'Auf Ihrem Computer. Genetische Daten verlassen ihn nie unverschlossen.',
  'm.step3.title': 'Ein Datum bekommen',
  'm.step3.text':
    'Nur der Prüfcode kommt auf Midnight, in einem Stapel mit anderen. Das Datum ist der Block, in dem der Stapel landet: Er zeigt, dass der Datensatz spätestens dann existierte.',
  'm.step4.text':
    'Geben Sie ihn einem Käufer, einer Prüfstelle oder einem Gericht. Dort kann man ihn kostenlos prüfen, ohne Konto.',
  'm.claims.label': 'Eine Tatsache beweisen',
  'm.claims.title1': 'Nachweis teilen,',
  'm.claims.title2': 'nicht die Daten.',
  'm.claims.lede':
    'Ein Datensatz kann bis zu sechzehn Werte versiegeln, etwa Markerergebnisse oder eine Keimrate. Später beweisen Sie eine Tatsache über sie. Sonst wird nichts gezeigt.',
  'm.claims.1t': 'Ein Wert ist, was Sie sagen.',
  'm.claims.1p': 'Dieser eine Wert wird gezeigt. Die übrigen bleiben versiegelt.',
  'm.claims.2t': 'Eine Zahl erreicht eine Schwelle.',
  'm.claims.2p': 'Zum Beispiel eine Keimrate von mindestens 95 %. Die Zahl selbst bleibt verborgen.',
  'm.claims.3t': 'Zwei Sorten unterscheiden sich.',
  'm.claims.3p':
    'In mindestens einer festgelegten Zahl von Markerwerten. Welche sich unterscheiden, bleibt privat. Ob eine Sorte dadurch unterscheidbar ist, entscheidet die Prüfstelle, nicht wir.',
  'm.claims.4t': 'Eine Korrektur ließ den Rest unberührt.',
  'm.claims.4p':
    'Nachdem Sie einen Datensatz korrigiert haben, beweisen Sie, dass die Werte, die Sie nicht angefasst haben, unverändert sind.',
  'm.claims.5t': 'Ein Labor hat die Werte signiert.',
  'm.claims.5p':
    'Der Claim nennt den Schlüssel, der den Datensatz signiert hat. Es geht also um Werte, die dieser Schlüssel signiert hat, nicht nur um Zahlen, die Sie eingegeben haben. Ob der Schlüssel zu einem Labor gehört, dem Sie vertrauen, entscheiden Sie.',
  'm.claims.limitsTitle': 'Grenzen.',
  'm.claims.limits':
    'Sechzehn Werte pro Datensatz. Um zwei Sorten zu vergleichen, braucht es eine Partei, die beide Wertesätze hat, etwa den Züchter oder ein Labor, das beide getestet hat. Wem Sie einen versiegelten Wert geben, der kann ebenfalls Claims darüber machen. Für Vergleiche über Tausende von Werten ist es nicht gemacht. Ohne Signatur eines Labors sind die Werte nur das Wort des Inhabers.',
  'm.claims.statusTitle': 'Der Claims-Contract',
  'm.claims.link': 'Wie Claims funktionieren, in der Spezifikation →',
  'm.get.label': 'Was es leistet',
  'm.get.title1': 'Was Sie bekommen,',
  'm.get.title2': 'und wo es endet.',
  'm.get.title': 'Was Sie bekommen',
  'm.get.1a': 'Ein Datum, das niemand zurückdatieren kann,',
  'm.get.2a': 'Lizenzen und Laborvereinbarungen.',
  'm.get.2b':
    'Sie hängen am Datensatz. Ein Lizenznehmer kann beweisen, dass er eine gültige Lizenz hält, ohne zu zeigen, welche. Eine Lizenzgebühr oder andere Verpflichtung auf einem Elternteil erscheint bei jedem Nachkommen, den beide Inhaber bestätigt haben; VeilCore erfasst sie und zieht sie nicht ein. Getestet in einem Testnetz von Midnight; in der Web-Demo simuliert.',
  'm.get.3a': 'Abstammung, der beide Seiten zugestimmt haben.',
  'm.stops.title': 'Wo es endet, und was den Rest abdeckt',
  'm.stops.1a': 'Es ist ein Beweismittel, kein Rechtstitel.',
  'm.stops.1b': 'Es schafft kein neues Recht. Es stützt die Rechte und Verträge, die Sie schon haben.',
  'm.stops.2a': 'Es legt fest, wann, nicht ob.',
  'm.stops.2b':
    'Ein Datensatz beweist, was wann aufgeschrieben wurde. Ein gekoppelter Laborbericht oder die Signatur eines Labors gibt dem Inhalt Gewicht.',
  'm.stops.3a': 'Es ergänzt DNA-Tests, statt sie zu ersetzen.',
  'm.stops.3b':
    'Es datiert einen DNA-Bericht, den Sie schon haben, damit ein späterer Test damit verglichen werden kann. Eine Elternverknüpfung heißt, dass beide Inhaber zugestimmt haben; die Abstammung beweist die DNA.',
  'm.stops.4a': 'Was niemand angibt, sieht es nicht.',
  'm.stops.4b':
    'Stille Vermehrung wird nicht erkannt. Aber sobald Sie eine Lizenz widerrufen, akzeptiert ein Käufer oder Labor, das richtig prüft, sie nicht mehr als gültig.',
  'm.open.label': 'Offenes Format',
  'm.open.title1': 'Wenn es VeilCore',
  'm.open.title2': 'nicht mehr gibt.',
  'm.open.1t': 'Die Datierungen bleiben.',
  'm.open.1p':
    'Einen Code des Stapels, der im Hauptnetz von Midnight verankert oder auf Bitcoin gestempelt ist, kann niemand entfernen, auch wir nicht.',
  'm.open.1link': 'Alle drei Implementierungen →',
  'm.open.3t': 'Wir bürgen nicht für Ergebnisse.',
  'm.open.3p':
    'Die Signaturen eines Labors zu einem Datensatz bleiben privat, außer der Inhaber des Datensatzes zeigt sie. Jede gezeigte nennt den Schlüssel, der signiert hat, den Namen, unter dem dieser registriert wurde, eine Akkreditierung, die sein Inhaber angegeben hat (das prüfen wir nicht), und ob der Betreiber von VeilCore diesen Namen mit einem öffentlichen Lizenz- oder Akkreditierungsverzeichnis abgeglichen hat, und an welchem Tag. VeilCore bürgt für kein Labor: Wer einen Datensatz prüft, entscheidet, was eine Signatur wert ist.',
  'm.open.4t': 'Jeder kann ein Register betreiben.',
  'm.open.4p':
    'Das Format erlaubt einem Labor, einer Anerkennungsstelle oder einem Sortenschutzgremium, ein eigenes Register unter eigener Webdomain zu betreiben und zu verankern, ohne uns zu fragen. Unser eigener Registercode ist öffentlich, unter der Apache-2.0-Lizenz, auf github.com/hunterincoming/veilcore-api.',
  'm.faq.label': 'Fragen',
  'm.faq.title1': 'Fragen,',
  'm.faq.title2': 'die man uns stellt.',
  'm.faq.1q': 'Was hindert jemanden daran, mein Material einzutragen?',
  'm.faq.2q': 'Brauche ich Krypto oder eine Wallet?',
  'm.faq.2a':
    'Nein. Einen Datensatz in der Demo anzulegen und jeden Datensatz zu prüfen, braucht keine Wallet, keine Anmeldung und keinen Kauf. Ihr Browser bewahrt einen Zufallsschlüssel auf, der Ihre Demo-Datensätze auf unserem Server findet. Der Prüfcode kommt auf Midnight, ein Netzwerk, das für Privatsphäre gebaut ist. Sie haben nie direkt damit zu tun.',
  'm.faq.3q': 'Hält es in einem Streit stand?',
  'm.faq.3link': 'Datensätze als Beweismittel →',
  'm.faq.4q': 'Was sehen Sie von meinen Daten?',
  'm.faq.4a':
    'Von Ihren genetischen Daten, unverschlossen: nichts. Ihr Computer liest die Dateien, die Sie hinzufügen, um aus jeder einen Code zu machen; hochgeladen werden sie nicht. Ein Laborbericht erreicht unseren Server nur, wenn ein Labor ihn an Sie zurückschickt: verschlossen, sodass nur Sie ihn öffnen können, und nach 180 Tagen gelöscht. Die Angaben, die Sie eingeben (der Name des Datensatzes, Züchter, Daten, Notizen, Vertragsbedingungen), und die Namen Ihrer Dateien speichert unser Server verschlossen, und wir haben den Schlüssel nicht. Lesen können wir den Prüfcode jedes Datensatzes und alles, was Sie zeigen möchten. Auch die Probenangaben, die Sie und ein Labor zu einer Lieferung schreiben, werden verschlossen gespeichert, mit einem Schlüssel, der im Laborcode steckt und den wir nicht haben. Labore und Entwickler können Datensätze in ihren eigenen Systemen versiegeln, sodass nur der Prüfcode hinausgeht.',
  'm.faq.4link1': 'Was die Demo speichert →',
  'm.faq.4link2': 'Integrationsleitfaden →',
  'm.faq.6q': 'Was kostet es?',
  'm.faq.6a':
    'Kostenlos. Einen Datensatz auf dieser Website anzulegen und jeden Datensatz zu prüfen, ist beides kostenlos.',
  'm.demo.lede':
    'Keine Anmeldung, keine Wallet. Es ist eine Testversion, verwenden Sie also erfundene Angaben. Datensätze werden in Stapeln auf Midnight datiert; Lizenzen und Laborvereinbarungen sind simuliert, und Kopplungen von DNA-Berichten werden noch nicht datiert.',
  'm.demo.privacy': 'Was die Demo speichert →',
  'm.updates.more': 'Alle Neuigkeiten',
  'm.stat3.s': 'Noch kein unabhängiges Sicherheitsaudit. Unsere eigenen Prüfungen der Contracts sind öffentlich.',
  'm.stat3.link': 'Auf GitHub lesen →',
  'm.stat4.b': 'Keine Anmeldung, keine Wallet',
  'm.stat4.s': 'Legen Sie jetzt einen Datensatz an. Das Prüfen ist kostenlos und braucht kein Konto.',
  'm.addr.title': 'Die Contracts, für alle, die sie prüfen wollen.',
  'm.addr.main': 'Haupt-Contract',
  'm.addr.claims': 'Claims-Contract',
  'm.addr.claimsPending': 'Noch nicht im Hauptnetz.',
  'm.addr.explorer': 'Auf midnightexplorer.com nachschlagen (betrieben von TexLabs) →',
  'm.live.btc.t': 'Auch ein Datumsstempel auf Bitcoin',
  'm.live.btc.main':
    'Ja, jeder versiegelte Stapel. Der erste kam am 11. Oktober in Block 971004 und wurde am 15. Oktober mit zwei Block-Explorern geprüft. Eine Prüfung mit dem offiziellen Werkzeug und einem vollständigen Knoten steht noch aus.',
  'm.contact.1t': 'Züchter und Labore',
  'm.contact.1p':
    'Probieren Sie es mit erfundenen Datensätzen aus und sagen Sie uns dann, was es für Ihre echten bräuchte.',
  'm.contact.2t': 'Saatgutanerkennung, Prüfstellen und Rechteorganisationen',
  'm.contact.2p': 'Sagen Sie uns, welche Nachweise Sie sehen müssten, und in welcher Form.',
  'm.contact.3t': 'Entwickler',
  'm.contact.3p': 'Bauen Sie es in Software ein, die Sie schon betreiben. Kein Konto und kein API-Schlüssel bei uns.',
  'm.contact.4t': 'Investoren',
  'm.contact.4p': 'Schreiben Sie an Mako, unseren CEO.',
  'm.contact.integrate': 'Integrationsleitfaden',
  'm.verify.what':
    'Ein VeilCore-Datensatz beschreibt genetisches Material, ohne die Genetik zu enthalten. Seine Prüfseite zeigt, was sein Inhaber freigegeben hat, und seinen Namen, wenn der Link des Inhabers ihn enthält. Nur sein Prüfcode kommt auf Midnight, und er erhält ein Datum, sobald er dort verankert ist. Einen Datensatz zu prüfen, ist kostenlos und braucht kein Konto.',
  'm.verify.home': 'Was ist VeilCore? →',
  'm.verify.example': 'Nicht sicher, was Sie sehen werden? Sehen Sie sich zuerst ein Beispiel an →',
  // Round 5 (15 Oct 2026): landing page rework, keys added.
  'm.open.6t': 'Prüfen ohne uns.',
  'm.open.6p':
    'Mit diesem Beweispaket kann jeder einen Datensatz offline prüfen: seine verify.html öffnen und dann die eine Transaktion, die sie nennt, in einem Midnight-Explorer nachschlagen. Datensätze, die seit dem 14. Oktober versiegelt wurden, brauchen außerdem Abschnitt 3.6.1 der Spezifikation, in der Spezifikation auf dieser Website und im SDK ab 0.16.0.',
  'm.open.6link': 'Spezifikation lesen →',
  'm.updates.older': 'Ältere Neuigkeiten',
  'm.live.colTestHere': 'Diese Test-Website (test.veilcore.org)',
  'm.live.feature': 'Funktion',
  'm.live.show': 'Liste anzeigen',
  'm.tech.title': 'Für technisch Interessierte',
  'm.tech.lede':
    'Wie die Prüfung von Hand funktioniert, der Code, der Bitcoin-Stempel und wer die Contracts ändern kann.',
  'm.tech.show': 'Details anzeigen',
  'm.tech.check.t': 'Einen Datensatz von Hand prüfen',
  'm.tech.check.p':
    'Um den Prüfcode eines Datensatzes neu zu berechnen, braucht es nur SHA-256 und die offene Spezifikation. Sein Einschlussnachweis verbindet diesen Prüfcode mit einem Code des Stapels, der auf Midnight verankert ist, und die Transaktion, die ihn verankert hat, liefert das Datum des Stapels. Die verify.html im Beweispaket rechnet das offline nach und nennt die Transaktion und den Code des Stapels, die nachzuschlagen sind. Die Prüfseite schlägt diese Transaktion selbst auf Midnight nach, wenn sie Midnight erreicht; sonst sagt sie, dass das Datum die Angabe unseres Registers ist, und Sie können es in einem Midnight-Explorer nachschlagen. Datensätze, die seit dem 14. Oktober versiegelt wurden, benennen ihren eigenen Schlüssel; ihre Prüfung braucht deshalb auch Abschnitt 3.6.1, in der Spezifikation auf dieser Website und im SDK ab 0.16.0. Wer auf dieser Website einen Datensatz über seine Kennung nachschlägt, nutzt dafür unseren Server.',
  'm.tech.impl.t': 'Eine Spezifikation, drei Implementierungen',
  'm.tech.impl.p':
    'Dauerhaft kostenlos zu implementieren. TypeScript, Python und Rust stimmen bei allen 121 Testvektoren des Datensatzformats auf GitHub überein, und jeder kann sie ausführen. Ein Autor hat alle drei geschrieben, und die TypeScript-Version ist auf npm als 0.18.1. Eine Implementierung von jemand anderem ist der Test, den wir uns am meisten wünschen.',
  'm.tech.btc.t': 'Der Bitcoin-Stempel',
  'm.tech.btc.p':
    'Unser Register stempelt den Code jedes versiegelten Stapels mit OpenTimestamps auf Bitcoin. Der erste kam am 11. Oktober in Bitcoin-Block 971004. Am 15. Oktober mit zwei Block-Explorern geprüft: Der Stempel führt zu den Bitcoin-Blöcken 971004 und 971005. Eine Prüfung mit dem offiziellen OpenTimestamps-Werkzeug und einem vollständigen Bitcoin-Knoten steht noch aus. Die Stempeldatei ist die .ots-Datei des Stapels: „Bitcoin-Stempeldatei herunterladen“ auf der Seite der Pflanze. Das Register der Test-Website stempelt nicht auf Bitcoin.',
  'm.tech.dna.t': 'Kopplung von Berichten und Laborsignaturen',
  'm.tech.dna.p':
    'Läuft die Kopplung eines DNA-Berichts über den VeilCore-Contract auf Midnight, wird sie datiert: Sie zeigt, dass, wer den Datensatz zu diesem Datum kontrollierte, diesen Bericht oder seinen SHA-256 bis dahin hatte. Was auf die Chain kommt, ist an den Datensatz gebunden und verbirgt den Bericht, sodass niemand die Kopplung auf seinen eigenen Datensatz kopieren kann. Die Signatur eines Labors auf einem verschlossenen Bericht umfasst genau diese Datei und den Datensatz, um den es geht.',
  'title.checkSite': 'Diese Website prüfen',
  'm.privacy.code.title': 'Der Code der App',
  'm.privacy.code.text':
    'VeilCore stellt den Code der App bereit. Jede Version veröffentlicht die Liste ihrer Dateien. Sie können prüfen, ob die Dateien, die Ihr Browser erhalten hat, mit dieser Liste übereinstimmen, und jeder kann die Version aus dem veröffentlichten Code neu bauen und vergleichen. Das zeigt, was wir veröffentlicht haben. Es kann nicht beweisen, dass ein Host allen dieselben Dateien geschickt hat.',
  'm.checksite.title': 'Diese Website prüfen',
  'm.checksite.lede':
    'VeilCore stellt den Code der App bereit. Jede Version veröffentlicht die Liste ihrer Dateien. Sie können prüfen, ob die Dateien, die Ihr Browser erhalten hat, mit dieser Liste übereinstimmen, und jeder kann die Version aus dem veröffentlichten Code neu bauen und vergleichen. Das zeigt, was wir veröffentlicht haben. Es kann nicht beweisen, dass ein Host allen dieselben Dateien geschickt hat.',
  'm.checksite.reading': 'Es wird gelesen, welche Version dies ist…',
  'm.checksite.noRelease':
    'Diese Kopie der Website wurde nicht über eine Versionsbereitstellung veröffentlicht, daher gibt es keine Liste, mit der sie sich prüfen ließe.',
  'm.checksite.release': 'Diese Kopie der Website gibt an, Version {commit} auf {network} zu sein, erstellt am {date}.',
  'm.checksite.how':
    'Die Prüfung lädt jede Datei, die die Version auflistet, von dieser Website, dazu jede Seitenadresse der App (mit zufälligen Datensatz-IDs) und eine zufällige Adresse, so wie ein Browser eine Seite öffnet. Sie berechnet den SHA-256 jeder Antwort in Ihrem Browser und vergleicht ihn und die Sicherheits-Header mit der Liste. Außerdem prüft sie, dass diese Seite kein Skript hat, das die gelistete Seite nicht hat.',
  'm.checksite.trust':
    'Diese Seite läuft auf der Website, die sie prüft; eine Website, die lügt, könnte also auch hier lügen. Um zu prüfen, ohne VeilCore zu vertrauen, laden Sie die Liste aus dem öffentlichen Code herunter und verwenden Sie sie unten, oder führen Sie {command} in einer Kopie des Codes aus.',
  'm.checksite.rebuild':
    'Um die Liste selbst mit dem Code zu vergleichen, bauen Sie die Version aus einer Kopie des Codes neu: {command}.',
  'm.checksite.pagesMatch':
    'Alle {total} Seitenadressen sind die gelistete Seite, mit den gelisteten Sicherheits-Headern.',
  'm.checksite.pagesDiffer': '{matched} von {total} Seitenadressen sind die gelistete Seite. Diese weichen ab:',
  'm.checksite.pageDiffers': 'Andere Seite: {path}',
  'm.checksite.headerDiffers': 'Anderer Sicherheits-Header: {name}',
  'm.checksite.noHeaders':
    'Die Liste dieser Version enthält keine Sicherheits-Header (sie wurde erstellt, bevor sie aufgeführt wurden), daher wurden sie nicht verglichen.',
  'm.checksite.extraScript': 'Diese Seite hat ein Skript, das die gelistete Seite nicht hat: {script}',
  'm.checksite.limit':
    'Das zeigt, was Ihr Browser erhalten hat. Es kann nicht beweisen, dass der Host allen dieselben Dateien geschickt hat.',
  'm.checksite.listLink': 'Die Liste dieser Version im öffentlichen Code',
  'm.checksite.useSite': 'Mit der Liste prüfen, die diese Website bereitstellt',
  'm.checksite.useFile': 'Oder mit einer heruntergeladenen Liste prüfen:',
  'm.checksite.checking': 'Datei {done} von {total} wird geprüft…',
  'm.checksite.allMatch': 'Alle {total} Dateien stimmen mit der Liste der Version überein.',
  'm.checksite.someDiffer': '{matched} von {total} Dateien stimmen mit der Liste der Version überein. Diese nicht:',
  'm.checksite.differs': 'Abweichend: {path}',
  'm.checksite.missing': 'Fehlt: {path}',
  'm.checksite.noList': 'Das ist keine Versionsliste.',
  'm.checksite.otherList': 'Diese Liste gehört zu einer anderen Version, nicht zu der, die diese Website angibt.',
  'm.checksite.uncommitted':
    'Diese Version wurde aus Code mit noch nicht eingecheckten Änderungen erstellt; ihre Dateien sind daher nicht genau der veröffentlichte Code dieses Commits.',
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
    'Diese Website läuft in einem Testnetz von Midnight, zum Üben. Beide Contracts sind seit dem 8. Oktober 2026 im Hauptnetz von Midnight.',
  'm.foot.about':
    'Ein offenes Datensatzformat für pflanzliche, tierische und mikrobielle Genetik. Dies ist die Test-Website, in einem Testnetz von Midnight; veilcore.org läuft im Hauptnetz von Midnight.',
  'm.for.1p':
    'Versiegeln Sie einen Datensatz und koppeln Sie seinen DNA-Bericht. Taucht die Pflanze unter anderem Namen auf, kann ein Labor einen neuen Test mit Ihrem Bericht vergleichen. Auf dieser Test-Website können Sie die Kopplung aus Ihrem Browser datieren, und niemand kann sie auf seinen eigenen Datensatz kopieren. VeilCore führt keine DNA-Tests durch.',
  'm.demo.lede':
    'Keine Anmeldung, keine Wallet. Dies ist die Test-Website, verwenden Sie also erfundene Angaben. Stapel werden im Testnetz von Midnight automatisch verankert, und das datiert Ihre Datensätze. Die Empfangsbestätigung eines Labors ist eine echte Signatur mit dem eigenen Schlüssel des Labors, außerhalb der Chain gespeichert. Lizenzen und Laborvereinbarungen laufen hier ebenfalls mit echten Transaktionen, im Testnetz.',
  'm.privacy.test.text':
    'Diese Website nutzt das Preprod-Testnetz von Midnight, nicht das Hauptnetz. Ihr Browser sendet jeden Datumsstempel über den Gebührendienst von VeilCore an dieses Netz; was Sie eingegeben haben und Ihre Dateien werden nie dorthin gesendet. Ein Testnetz kann zurückgesetzt werden, und Testdaten können gelöscht werden.',
  'm.privacy.hosts.text':
    'Diese Website wird bei Vercel gehostet, das IP-Adressen und Anfragen protokolliert. Unser Registerserver und der Dienst, der die Gebühren im Testnetz zahlt und die Netzabfragen dieser Seite weiterreicht, laufen bei Railway, das Anfragen protokolliert. Dieser Dienst liest das Netz über Blockfrost.',
  'm.tech.check.p':
    'Um den Prüfcode eines Datensatzes neu zu berechnen, braucht es nur SHA-256 und die offene Spezifikation. Sein Einschlussnachweis verbindet diesen Prüfcode mit einem Code des Stapels, der auf Midnight verankert ist, und die Transaktion, die ihn verankert hat, liefert das Datum des Stapels. Die verify.html im Beweispaket rechnet das offline nach und nennt die Transaktion und den Code des Stapels, die nachzuschlagen sind. Die Prüfseite schlägt diese Transaktion selbst auf Midnight nach, wenn sie Midnight erreicht. Datensätze, die seit dem 14. Oktober versiegelt wurden, benennen ihren eigenen Schlüssel; ihre Prüfung braucht deshalb auch Abschnitt 3.6.1, in der Spezifikation auf dieser Website und im SDK ab 0.16.0. Wer auf dieser Website einen Datensatz über seine Kennung nachschlägt, nutzt dafür unseren Server.',
  // Agreements are real on the test site: every type, on Midnight's test network.
  'm.get.2b':
    'Sie hängen am Datensatz. Ein Lizenznehmer kann beweisen, dass er eine gültige Lizenz hält, ohne zu zeigen, welche. Eine Lizenzgebühr oder andere Verpflichtung auf einem Elternteil erscheint bei jedem Nachkommen, den beide Inhaber bestätigt haben; VeilCore erfasst sie und zieht sie nicht ein. Auf dieser Test-Website mit echten Transaktionen im Testnetz von Midnight nutzbar.',
  // Agreements are real on the test site: every type, on Midnight's test network.
  'm.for.3p':
    'Senden Sie Material mit einem Laborcode. Das Labor signiert eine Empfangsbestätigung mit seinem eigenen Schlüssel, sodass der Datensatz eine zweite Partei zeigt. Die Bestätigung ist eine echte Signatur, gespeichert im Register von VeilCore, nicht auf der Chain. Bedingungen wie „keine Vermehrung“ stehen in einer Laborvereinbarung, die Sie und das Labor hier im Testnetz von Midnight schließen.',
};
