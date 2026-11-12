// Die Datensatz-App auf Deutsch: Zahlungen von Lizenzgebühren sichtbar machen und in einem
// US-Dollar-Stablecoin auf Cardano zahlen (../en/royalty-pay.ts). ENTWURF: maschinengestützt, von
// einer muttersprachlichen Person zu prüfen, bevor es veröffentlicht wird (docs/translations/README.md).
// SPDX-License-Identifier: Apache-2.0

export const royaltyPay = {
  'app.rpay.st.overdue': 'Überfällig',
  'app.rpay.l.soon': 'Erinnerung: Die Zahlung für Bericht {n} ist am {date} fällig.',
  'app.rpay.l.overdue': 'Die Zahlung für Bericht {n} ist seit dem {date} überfällig.',
  'app.rpay.l.consequence':
    'Wer nicht zahlt, steht damit auf der öffentlichen Prüfseite, und die Lizenz kann widerrufen werden.',
  'app.rpay.i.soon': 'Die Zahlung von {licensee} für Bericht {n} ist am {date} fällig.',
  'app.rpay.i.overdue': 'Die Zahlung von {licensee} für Bericht {n} ist seit dem {date} überfällig.',
  'app.rpay.i.public':
    'Die öffentliche Prüfseite Ihres Datensatzes sagt: „Eine Lizenzgebührenabrechnung ist seit dem {date} überfällig.“ Keine Beträge, Bedingungen oder Namen. Der Hinweis verschwindet, sobald die Zahlung da ist.',
  'app.rpay.i.publicFailed':
    'Das ließ sich gerade nicht auf die öffentliche Prüfseite Ihres Datensatzes setzen. Die Seite versucht es beim nächsten Öffnen wieder.',
  'app.rpay.i.publicUnsupported':
    'Das Register von VeilCore nimmt noch keine öffentlichen Hinweise an, daher steht das nicht auf der öffentlichen Prüfseite Ihres Datensatzes.',
  'app.rpay.revoke.open': 'Wegen Nichtzahlung widerrufen',
  'app.rpay.revoke.what':
    'Damit endet die Lizenz auf Midnight, und das lässt sich nicht rückgängig machen. {licensee} erhält zuerst einen signierten Hinweis. Die öffentliche Prüfseite Ihres Datensatzes sagt dann, dass eine Lizenz davon wegen Nichtzahlung widerrufen wurde, und wann.',
  'app.rpay.revoke.yes': 'Lizenz widerrufen',
  'app.rpay.revoke.note': 'Lizenz wegen Nichtzahlung von Bericht {n} widerrufen.',
  'app.rpay.revoke.reason': 'Nichtzahlung',
  'app.rpay.revoke.done': 'Am {date} wegen Nichtzahlung widerrufen. Die öffentliche Prüfseite sagt das.',
  'app.rpay.pub.title': 'Lizenzgebühren auf Lizenzen von diesem Datensatz',
  'app.rpay.pub.overdue': 'Eine Lizenzgebührenabrechnung ist seit dem {date} überfällig.',
  'app.rpay.pub.revoked': 'Eine Lizenz von diesem Datensatz wurde am {date} wegen Nichtzahlung widerrufen.',
  'app.rpay.pub.who':
    'Angabe der Person, die diesen Datensatz hält und ihn lizenziert hat. VeilCore prüft sie nicht. Sie nennt niemanden und zeigt keine Beträge oder Bedingungen.',
  'app.rpay.payout.option': 'US-Dollar-Stablecoin auf Cardano',
  'app.rpay.payout.info':
    'Die andere Seite zahlt aus ihrem eigenen Wallet direkt an Ihre Cardano-Adresse, in {code}. Mit dem Speichern stimmen Sie zu, dass 1 {code} als 1 US-Dollar zählt. Zahlungen auf Cardano sind öffentlich: Jeder sieht den Betrag, beide Adressen und das Datum, aber nicht, wer Sie sind. Eine neue Adresse nur für diesen Vertrag hält ihn von Ihren anderen getrennt. VeilCore hält oder bewegt das Geld nie.',
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
};
