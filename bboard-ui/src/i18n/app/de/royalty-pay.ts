// Die Datensatz-App auf Deutsch: Zahlungen von Lizenzgebühren sichtbar machen und in einem
// US-Dollar-Stablecoin auf Cardano zahlen (../en/royalty-pay.ts). ENTWURF: maschinengestützt, von
// einer muttersprachlichen Person zu prüfen, bevor es veröffentlicht wird (docs/translations/README.md).
// SPDX-License-Identifier: Apache-2.0

export const royaltyPay = {
  'app.rpay.st.overdue': 'Überfällig',
  'app.rpay.l.soon': 'Erinnerung: Die Zahlung für Bericht {n} ist am {date} fällig.',
  'app.rpay.l.overdue': 'Die Zahlung für Bericht {n} ist seit dem {date} überfällig.',
  'app.rpay.l.consequence':
    'Wird nicht gezahlt, kann die öffentliche Prüfseite des Datensatzes von {licensor} sagen, dass eine Lizenzabrechnung überfällig ist. Nach einer Mitteilung über die Vertragsverletzung haben Sie {days} Tage Zeit zu zahlen, bevor die Lizenz wegen Nichtzahlung widerrufen werden kann.',
  'app.rpay.i.soon': 'Die Zahlung von {licensee} für Bericht {n} ist am {date} fällig.',
  'app.rpay.i.overdue': 'Die Zahlung von {licensee} für Bericht {n} ist seit dem {date} überfällig.',
  'app.rpay.i.publicFailed':
    'Das ließ sich gerade nicht auf die öffentliche Prüfseite Ihres Datensatzes setzen. Die Seite versucht es beim nächsten Öffnen wieder.',
  'app.rpay.i.publicUnsupported':
    'Das Register von VeilCore nimmt noch keine öffentlichen Hinweise an, daher steht das nicht auf der öffentlichen Prüfseite Ihres Datensatzes.',
  'app.rpay.revoke.open': 'Wegen Nichtzahlung widerrufen',
  'app.rpay.revoke.yes': 'Lizenz widerrufen',
  'app.rpay.revoke.note': 'Lizenz wegen Nichtzahlung von Bericht {n} widerrufen.',
  'app.rpay.revoke.reason': 'Nichtzahlung',
  'app.rpay.pub.title': 'Lizenzgebühren auf Lizenzen von diesem Datensatz',
  'app.rpay.payout.option': 'US-Dollar-Stablecoin auf Cardano',
  'app.rpay.payout.info':
    'Die andere Seite zahlt aus ihrem eigenen Wallet direkt an Ihre Cardano-Adresse, in {code}. Mit dem Speichern stimmen Sie zu, dass 1 {code} als 1 US-Dollar zählt. Zahlungen auf Cardano sind öffentlich: Jeder sieht den Betrag, beide Adressen und das Datum. Die Zahlung nennt Ihren Namen nicht, aber eine Adresse lässt sich oft einer Person zuordnen, zum Beispiel über eine Börse. Eine neue Adresse nur für diesen Vertrag hält ihn von Ihren anderen getrennt. VeilCore hält oder bewegt das Geld nie.',
  'app.rpay.payout.token': 'Stablecoin',
  'app.rpay.payout.address': 'Ihre Cardano-Adresse ({prefix}…)',
  'app.rpay.payout.useMine': 'Meine {name}-Adresse verwenden',
  'app.rpay.payout.sanctioned': 'Diese Adresse steht auf der US-Sanktionsliste und kann nicht verwendet werden.',
  'app.rpay.method': 'auf Cardano, in {code} (1 {code} = 1 USD)',
  'app.rpay.addr.not': 'Das ist keine Cardano-Adresse (prüfen Sie, ob sie vollständig kopiert wurde).',
  'app.rpay.addr.notPayment': 'Das ist keine Cardano-Zahlungsadresse (sie sollte mit addr beginnen).',
  'app.rpay.addr.otherNetwork': 'Diese Adresse gehört zu einem anderen Cardano-Netzwerk, nicht zu {network}.',
  'app.rpay.pay.title': 'Aus Ihrem Cardano-Wallet zahlen',
  'app.rpay.pay.button': '{amount} {code} mit {name} zahlen',
  'app.rpay.pay.waiting': 'Warten auf Ihr Wallet…',
  'app.rpay.pay.wallet': 'Wallet',
  'app.rpay.pay.noWallet':
    'Dieser Browser hat kein Cardano-Wallet. Öffnen Sie diese Seite dort, wo Sie eines haben (Lace, Eternl oder ein anderes CIP-30-Wallet).',
  'app.rpay.pay.shows':
    'Ihr Wallet zeigt die Zahlung, bevor Sie signieren: {amount} {code} an {to}, etwas ada, das Cardano zusammen mit einem Token verlangt, die Netzwerkgebühr und die Referenz {ref}.',
  'app.rpay.pay.screened':
    'Beide Adressen werden mit der US-Sanktionsliste abgeglichen (OFAC, Cardano-Adressen, Liste vom {date}), bevor etwas erstellt wird.',
  'app.rpay.pay.howTitle': 'So funktioniert es',
  'app.rpay.pay.how':
    'Ihr Wallet zahlt {licensor} direkt. VeilCore hält, stoppt oder bewegt das Geld nie und nimmt keine Gebühr davon. Mit der Referenz auf der Zahlung finden beide Seiten sie auf Cardano: Sobald sie 10 Blöcke tief ist und mindestens {amount} zahlt, gilt der Bericht als bezahlt und erledigt, ohne weiteren Schritt. Der Sanktionsabgleich ist nur ein Listenabgleich: Er sieht nicht, woher Geld kam, und die Liste ist nur so aktuell wie ihr Datum.',
  'app.rpay.pay.sent': 'Ihr Wallet hat die Transaktion {tx} signiert, aber sie ist für {licensor} noch nicht erfasst.',
  'app.rpay.pay.forget': 'Nicht im Verlauf meines Wallets: erneut zahlen',
  'app.rpay.pay.off':
    '{licensor} möchte in {code} auf Cardano bezahlt werden. Diese Zahlungsart ist auf dieser Seite hier noch nicht eingeschaltet: Bitten Sie um andere Zahlungsangaben.',
  'app.rpay.pay.notUsd':
    'Dieser Bericht ist in {currency}. Zahlen in einem Stablecoin gibt es nur für Berichte in US-Dollar.',
  'app.rpay.pay.notPar':
    'Die Cardano-Angaben von {licensor} sagen nicht, dass 1 {code} als 1 US-Dollar zählt, daher kann diese Seite es nicht anbieten.',
  'app.rpay.w.otherNetwork':
    'Ihr Wallet ist in einem anderen Cardano-Netzwerk. Stellen Sie es auf {network} um und versuchen Sie es erneut.',
  'app.rpay.w.sanctioned':
    'Gestoppt: Eine Adresse in dieser Zahlung steht auf der US-Sanktionsliste oder ließ sich nicht lesen. Nichts wurde erstellt oder gesendet.',
  'app.rpay.w.noCoins': 'Ihr Wallet hat keine Coins zum Bezahlen.',
  'app.rpay.w.cantBuild': 'Die Zahlung ließ sich nicht erstellen ({why}). Nichts wurde gesendet.',
  'app.rpay.c.checking': 'Die Zahlung wird auf Cardano geprüft…',
  'app.rpay.c.ok': 'Bezahlt und erledigt: {amount} in {code}, auf Cardano geprüft (Transaktion {tx}, {n} Blöcke tief).',
  'app.rpay.c.unconfirmed': 'Die Zahlung ist auf Cardano, aber noch nicht 10 Blöcke tief. Die Seite prüft erneut.',
  'app.rpay.c.failed': 'Diese Transaktion ist auf Cardano fehlgeschlagen. Sie hat nichts gezahlt.',
  'app.rpay.c.no-ref': 'Diese Transaktion trägt keine Zahlungsreferenz von VeilCore.',
  'app.rpay.c.many-refs': 'Diese Transaktion trägt mehr als eine Zahlungsreferenz und zählt daher für keine.',
  'app.rpay.c.wrong-ref': 'Die Referenz dieser Transaktion gehört zu einer anderen Abrechnung.',
  'app.rpay.c.none': 'Diese Transaktion hat kein {code} an die Auszahlungsadresse gezahlt.',
  'app.rpay.c.short': 'Diese Transaktion hat {paid} {code} gezahlt, weniger als {amount}. Der Rest ist noch offen.',
  'app.rpay.c.not-found': 'Cardano kennt diese Transaktion noch nicht (das kann eine Minute dauern).',
  'app.rpay.c.unreachable': 'Cardano war nicht erreichbar. Die Seite versucht es erneut.',
  'app.rpay.c.no-relay':
    'Diese Website kann Cardano noch nicht prüfen, daher bestätigt {licensor} die Zahlung von Hand.',
  'app.rpay.c.not-tx': 'Die Zahlungsreferenz ist keine Cardano-Transaktion.',
  'app.rpay.l.breach':
    '{licensor} hat am {date} eine Mitteilung über die Vertragsverletzung gesendet. Zahlen Sie bis zum {cureBy}: Danach kann die Lizenz wegen Nichtzahlung widerrufen werden, wenn nichts als bezahlt markiert ist.',
  'app.rpay.l.cureOver':
    '{licensor} hat am {date} eine Mitteilung über die Vertragsverletzung gesendet, und die Frist zum Zahlen endete am {cureBy}. Die Lizenz kann jetzt wegen Nichtzahlung widerrufen werden. Wenn Sie gezahlt haben, halten Sie es mit „Ich habe bezahlt“ fest.',
  'app.rpay.i.breach':
    'Sie haben am {date} eine Mitteilung über die Vertragsverletzung gesendet. {licensee} hat bis zum {cureBy} Zeit zu zahlen. „Wegen Nichtzahlung widerrufen“ wird ab dem Tag danach angeboten, wenn nichts als bezahlt markiert ist.',
  'app.rpay.i.cureOver':
    'Sie haben am {date} eine Mitteilung über die Vertragsverletzung gesendet. Die Frist zum Zahlen endete am {cureBy}, ohne dass etwas als bezahlt markiert wurde. Sie können wegen Nichtzahlung widerrufen.',
  'app.rpay.i.noNotice':
    'Um wegen Nichtzahlung zu widerrufen, senden Sie zuerst beim Bericht unten eine Mitteilung über die Vertragsverletzung. {licensee} hat dann {days} Tage Zeit zu zahlen.',
  'app.rpay.i.answered': '{licensee} widerspricht ({date}): „{note}“',
  'app.rpay.l.iPaid': 'Ich habe bezahlt',
  'app.rpay.l.dispute': 'Widersprechen',
  'app.rpay.l.disputeAgain': 'Erneut antworten',
  'app.rpay.l.disputeNote': 'Warum (kurz; die andere Seite sieht es)',
  'app.rpay.l.disputeSend': 'Antwort senden',
  'app.rpay.breach.open': 'Mitteilung über Vertragsverletzung senden',
  'app.rpay.breach.what':
    'Eine signierte, datierte Mitteilung an {licensee}, dass diese Zahlung überfällig ist. Danach bleiben {days} Tage zum Zahlen. Erst dann, wenn nichts als bezahlt markiert ist, können Sie die Lizenz wegen Nichtzahlung widerrufen.',
  'app.rpay.breach.send': 'Mitteilung senden',
  'app.rpay.breach.extra': 'Ergänzung (freiwillig; die andere Seite sieht es)',
  'app.rpay.breach.note':
    'Die Zahlung für Bericht {n}, fällig am {due}, ist nicht erfolgt. Sie haben ab dieser Mitteilung {days} Tage Zeit zu zahlen. Ist sie danach noch offen, kann die Lizenz wegen Nichtzahlung widerrufen werden.',
  'app.rpay.revoke.notYet':
    'Noch nicht: Ein Widerruf wegen Nichtzahlung ist erst möglich, wenn die Frist nach Ihrer Mitteilung über die Vertragsverletzung abgelaufen ist und nichts als bezahlt markiert wurde.',
  'app.rpay.notice.answer': '{who} hat am {date} der Zahlung für {period} widersprochen: „{note}“',
  'app.rpay.notice.revoked': '{who} hat die Lizenz am {date} wegen Nichtzahlung widerrufen ({period}).',
  'app.rpay.notice.cureBy': 'Frist zum Zahlen: bis zum {cureBy}.',
  'app.rpay.pub.disputed': 'Die Lizenznehmerseite widerspricht (seit dem {date}).',
  'app.rpay.i.public':
    'Die öffentliche Prüfseite Ihres Datensatzes sagt: „Die Person, die diesen Datensatz hält, gibt an, dass eine Lizenzgebührenabrechnung seit dem {date} überfällig ist.“ Keine Beträge, Bedingungen oder Namen. Der Hinweis verschwindet, wenn diese Seite das nächste Mal prüft, sobald die Zahlung vermerkt ist.',
  'app.rpay.i.publicBreach':
    'Die öffentliche Prüfseite Ihres Datensatzes sagt, als Ihre Angabe, dass eine Lizenzgebührenabrechnung seit dem {date} überfällig ist, und dass Sie dem Register von VeilCore am {breach} mitgeteilt haben, eine Mitteilung über die Vertragsverletzung gesendet zu haben. Die Frist zum Zahlen zählt ab diesem Tag. Keine Beträge, Bedingungen oder Namen.',
  'app.rpay.i.publicAnswers': 'Daneben, im eigenen Namen der Lizenznehmerseite: {answers}',
  'app.rpay.i.publicNoRecord':
    'Dieser Datensatz ist im Register von VeilCore nicht unter dem Inhaberschlüssel dieses Browsers gespeichert, daher kann von hier nichts auf seine öffentliche Prüfseite. Öffnen Sie die Lizenz auf dem Gerät, das den Datensatz gespeichert hat, oder stellen Sie hier Ihre Sicherung wieder her.',
  'app.rpay.revoke.what':
    'Damit endet die Lizenz auf Midnight, und das lässt sich nicht rückgängig machen. Ihre Mitteilung über die Vertragsverletzung ist gesendet, und die Frist zum Zahlen ist nach der Uhr des Registers von VeilCore abgelaufen, ohne dass etwas als bezahlt markiert wurde. {licensee} erhält dann einen signierten Hinweis, dass sie wegen Nichtzahlung widerrufen wurde. Die öffentliche Prüfseite Ihres Datensatzes sagt das mit Datum, wenn das Register bestätigt, dass die Frist ohne vermerkte Zahlung abgelaufen ist; sonst sagt sie nichts zur Zahlung.',
  'app.rpay.revoke.done': 'Am {date} wegen Nichtzahlung widerrufen.',
  'app.rpay.revoke.public': 'Die öffentliche Prüfseite Ihres Datensatzes sagt das.',
  'app.rpay.revoke.notPublic':
    'Das Register von VeilCore hat keinen öffentlichen Hinweis auf Nichtzahlung angenommen (die Frist war nach seiner Uhr nicht abgelaufen, oder eine Zahlung ist vermerkt). Die öffentliche Prüfseite sagt daher nichts zur Zahlung.',
  'app.rpay.pub.overdue':
    'Die Person, die diesen Datensatz hält, gibt an, dass eine Lizenzgebührenabrechnung seit dem {date} überfällig ist.',
  'app.rpay.pub.breach':
    'Die Person, die diesen Datensatz hält, hat dem Register von VeilCore am {date} mitgeteilt, dass sie eine Mitteilung über die Vertragsverletzung gesendet hat.',
  'app.rpay.pub.revoked':
    'Die Person, die diesen Datensatz hält, gibt an, dass eine Lizenz von diesem Datensatz am {date} wegen Nichtzahlung widerrufen wurde.',
  'app.rpay.pub.revokedChecked':
    'Die Person, die diesen Datensatz hält, hat dem Register von VeilCore am {date} mitgeteilt, dass sie eine Mitteilung über die Vertragsverletzung gesendet hat, und danach vergingen {days} Tage ohne dort vermerkte Zahlung, bevor dieser Hinweis angenommen wurde. Das Register hat diese Datumsangaben geprüft, nicht aber, wer die Lizenznehmerseite ist.',
  'app.rpay.pub.answerPaid': 'Die Lizenznehmerseite gibt an, dass bezahlt wurde ({date}).',
  'app.rpay.pub.who':
    'Ob eine Zahlung fällig war, ist die Angabe der Person, die den Datensatz hält; VeilCore prüft das nicht. Das Datum neben einer Mitteilung über die Vertragsverletzung ist der Tag, an dem diese Person sie dem Register von VeilCore mitgeteilt hat, nach der Uhr des Registers. Die Antworten der Lizenznehmerseite sind von ihr signiert, und die Person, die den Datensatz hält, kann sie nicht entfernen. Niemand wird genannt, und es werden keine Beträge oder Bedingungen gezeigt.',
  'app.rpay.l.answered':
    'Sie haben dem am {date} widersprochen: „{note}“. {licensor} sieht das. Ihre Antwort ist beim Register von VeilCore unter Ihrem eigenen Schlüssel hinterlegt (am {filed}). Jeder Hinweis zu dieser Zahlung auf der öffentlichen Prüfseite des Datensatzes von {licensor} zeigt, dass Sie widersprechen, mit diesem Datum, und {licensor} kann das nicht entfernen.',
  // Before a full read of the registry: nothing said about filing either way.
  'app.rpay.l.answerSeen': 'Sie haben dem am {date} widersprochen: „{note}“. {licensor} sieht das.',
  'app.rpay.l.answerPending':
    'Sie haben dem am {date} widersprochen: „{note}“. {licensor} sieht das. Ihre Antwort beim Register von VeilCore zu hinterlegen, wo die öffentliche Prüfseite des Datensatzes von {licensor} sie zeigt, hat noch nicht geklappt. Diese Seite versucht es bei jedem Öffnen wieder.',
  'app.rpay.l.disputeShows':
    '{licensor} sieht das, von Ihnen signiert. Es wird auch in Ihrem Namen beim Register von VeilCore hinterlegt: Die öffentliche Prüfseite zeigt nur, dass Sie widersprechen, und das Datum, nie, was Sie geschrieben haben.',
  'app.rpay.pay.otherWay':
    '{licensor} möchte in {code} auf Cardano bezahlt werden, was diese Seite nicht zahlen kann. Bitten Sie {licensor} um andere Zahlungsangaben, zahlen Sie auf diesem Weg und halten Sie es unten mit „Ich habe bezahlt“ fest.',
  'app.rpay.l.revoked':
    '{licensor} hat die Lizenz wegen Nichtzahlung von Bericht {n} widerrufen, in einem signierten Hinweis vom {date}.',
  'app.rpay.l.revokedPublic':
    'Die öffentliche Prüfseite des Datensatzes von {licensor} sagt, dass sie am {date} wegen Nichtzahlung widerrufen wurde. Das Register von VeilCore hat das erst angenommen, nachdem die Frist zum Zahlen nach seiner Uhr ohne vermerkte Zahlung abgelaufen war.',
  'app.rpay.l.revokedNotPublic':
    'Die öffentliche Prüfseite des Datensatzes von {licensor} sagt nichts über Nichtzahlung: Das Register von VeilCore hat es nicht angenommen.',
  'app.rpay.l.revokedDisputed':
    'Sie haben dem am {date} widersprochen. Ihre Antwort ist in Ihrem eigenen Namen beim Register von VeilCore hinterlegt, und {licensor} kann sie nicht entfernen: Jeder Hinweis zu dieser Zahlung auf der öffentlichen Prüfseite des Datensatzes von {licensor} zeigt, dass Sie widersprechen.',
  'app.rpay.notice.early':
    'Sie wurde gesendet, bevor die Zahlung überfällig war, und setzt daher keine Frist zum Zahlen in Gang.',
  'app.rpay.notice.notThisOne':
    'Die Frist zum Zahlen zählt ab der ersten Mitteilung über die Vertragsverletzung, nachdem die Zahlung überfällig war.',
  'app.rpay.predates':
    'Diese Lizenz wurde erstellt, bevor das Register von VeilCore die Schlüssel aufbewahrt hat, die öffentliche Hinweise brauchen. Zu ihren Zahlungen kann daher nichts auf die öffentliche Prüfseite und dort auch nichts beantwortet werden. Erinnerungen, Mitteilungen über die Vertragsverletzung, die Frist zum Zahlen und Antworten funktionieren zwischen Ihnen beiden weiterhin, signiert.',
  'app.rpay.i.breachNotRegistered':
    'Die öffentliche Prüfseite sagt, dass diese Zahlung überfällig ist, aber noch nicht, dass Sie eine Mitteilung über die Vertragsverletzung gesendet haben: Die Seite von {licensee} hat diesen Bericht noch nicht beim Register von VeilCore registriert. Das geschieht normalerweise von selbst, wenn die Lizenz dort das nächste Mal geöffnet wird. Bis dahin kann die Frist zum Zahlen dort nicht beginnen. Ihre signierte Mitteilung liegt so oder so vor.',
  'app.rpay.i.breachNotDue':
    '{licensee} hat diesen Bericht beim Register von VeilCore als am {due} fällig registriert. Das Register nimmt eine Mitteilung über die Vertragsverletzung erst ab dem Tag danach an, daher sagt die öffentliche Prüfseite Ihres Datensatzes noch nicht, dass Sie eine gesendet haben. Diese Seite fragt erneut nach, wenn sie nach dem {due} geöffnet wird. Ihre signierte Mitteilung liegt so oder so vor.',
  'app.rpay.l.answerPredates':
    'Sie haben dem am {date} widersprochen: „{note}“. {licensor} sieht das, von Ihnen signiert. Diese Lizenz wurde erstellt, bevor das Register von VeilCore die Schlüssel aufbewahrt hat, die Antworten brauchen, daher kann sie dort nicht hinterlegt werden.',
  'app.rpay.l.pubOverdue':
    'Die öffentliche Prüfseite des Datensatzes von {licensor} sagt, als dessen Angabe, dass eine Lizenzgebührenabrechnung seit dem {date} überfällig ist (Bericht {n}).',
  'app.rpay.l.pubOverdueOther':
    'Die öffentliche Prüfseite des Datensatzes von {licensor} sagt, als dessen Angabe, dass eine Lizenzgebührenabrechnung seit dem {date} überfällig ist, zu einer Nachricht in dieser Vereinbarung, die keiner Ihrer Berichte ist.',
  'app.rpay.l.pubOverdueUnreadable':
    'Die öffentliche Prüfseite des Datensatzes von {licensor} sagt, als dessen Angabe, dass eine Lizenzgebührenabrechnung seit dem {date} überfällig ist, zu einer Nachricht in dieser Vereinbarung, die diese Seite nicht öffnen kann, oder zu einer zweiten Kopie einer Nachricht, die schon hier ist. Sie passt daher zu keinem Ihrer Berichte.',
  'app.rpay.l.pubRevoked':
    'Die öffentliche Prüfseite des Datensatzes von {licensor} sagt, als dessen Angabe, dass eine Lizenz von diesem Datensatz am {date} wegen Nichtzahlung widerrufen wurde.',
  'app.rpay.l.pubBreach':
    '{licensor} hat dem Register von VeilCore am {date} mitgeteilt, eine Mitteilung über die Vertragsverletzung gesendet zu haben. Die Frist zum Zahlen läuft bis zum {cureBy}.',
  'app.rpay.l.pubAnswers': 'Daneben, in Ihrem eigenen Namen: {answers}',
  'app.rpay.l.pubDisputeFailed':
    'Ihre Antwort ließ sich gerade nicht hinterlegen. Versuchen Sie es gleich noch einmal.',
  'app.rpay.i.dueDiffers':
    'Die Seite von {licensee} hat diesen Bericht beim Register von VeilCore als am {registered} fällig registriert, später als der {due}, den Ihre signierten Bedingungen nennen. Das Register richtet sich nach dem registrierten Datum: Es nimmt eine Mitteilung über die Vertragsverletzung erst ab dem Tag danach an, und sobald dieses Datum vorbei ist, kann die öffentliche Prüfseite Ihres Datensatzes die Zahlung erst ab dem Tag danach als überfällig nennen. Die signierten Bedingungen in der Vereinbarung nennen weiterhin den {due}.',
  'app.rpay.l.pubLookupFailed':
    'Gerade ließ sich nicht jede Nachricht dieser Vereinbarung beim Register von VeilCore prüfen. Eine Angabe, die die öffentliche Prüfseite des Datensatzes von {licensor} zu einer davon macht, fehlt hier daher vielleicht. Prüfen Sie gleich noch einmal.',
  'app.rpay.l.pubLookupAgain': 'Erneut prüfen',
};
