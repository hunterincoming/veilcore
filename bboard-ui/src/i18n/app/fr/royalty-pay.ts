// L’application d’enregistrements en français : les paiements de redevances rendus visibles et
// le paiement en stablecoin en dollars américains sur Cardano (../en/royalty-pay.ts). BROUILLON :
// assisté par machine, à relire par une personne de langue maternelle avant publication
// (docs/translations/README.md).
// SPDX-License-Identifier: Apache-2.0

export const royaltyPay = {
  'app.rpay.st.overdue': 'En retard',
  'app.rpay.l.soon': 'Rappel : le paiement du rapport {n} est dû le {date}.',
  'app.rpay.l.overdue': 'Le paiement du rapport {n} est en retard depuis le {date}.',
  'app.rpay.l.consequence':
    'Ne pas payer se voit sur la page de vérification publique, et la licence peut être révoquée.',
  'app.rpay.i.soon': 'Le paiement de {licensee} pour le rapport {n} est dû le {date}.',
  'app.rpay.i.overdue': 'Le paiement de {licensee} pour le rapport {n} est en retard depuis le {date}.',
  'app.rpay.i.public':
    'La page de vérification publique de votre enregistrement indique : « Un relevé de redevances est en retard depuis le {date}. » Ni montants, ni conditions, ni noms. Elle l’enlève dès que le paiement est arrivé.',
  'app.rpay.i.publicFailed':
    'Impossible de mettre cela sur la page de vérification publique de votre enregistrement pour l’instant. La page réessaie à sa prochaine ouverture.',
  'app.rpay.i.publicUnsupported':
    'Le registre de VeilCore n’accepte pas encore d’avis publics : cela n’apparaît donc pas sur la page de vérification publique de votre enregistrement.',
  'app.rpay.revoke.open': 'Révoquer pour non-paiement',
  'app.rpay.revoke.what':
    'Cela met fin à la licence sur Midnight et ne peut pas être annulé. {licensee} reçoit d’abord un avis signé. La page de vérification publique de votre enregistrement indique ensuite qu’une licence issue de celui-ci a été révoquée pour non-paiement, et quand.',
  'app.rpay.revoke.yes': 'Révoquer la licence',
  'app.rpay.revoke.note': 'Licence révoquée pour non-paiement du rapport {n}.',
  'app.rpay.revoke.reason': 'Non-paiement',
  'app.rpay.revoke.done': 'Révoquée pour non-paiement le {date}. La page de vérification publique l’indique.',
  'app.rpay.pub.title': 'Redevances sur les licences issues de cet enregistrement',
  'app.rpay.pub.overdue': 'Un relevé de redevances est en retard depuis le {date}.',
  'app.rpay.pub.revoked': 'Une licence issue de cet enregistrement a été révoquée le {date} pour non-paiement.',
  'app.rpay.pub.who':
    'Déclaré par la personne qui détient cet enregistrement et l’a concédé en licence. VeilCore ne le vérifie pas. Cela ne nomme personne et ne montre ni montants ni conditions.',
  'app.rpay.payout.option': 'Stablecoin en dollars américains sur Cardano',
  'app.rpay.payout.info':
    'L’autre partie paie depuis son propre portefeuille, directement à votre adresse Cardano, en {code}. En enregistrant ceci, vous acceptez que 1 {code} compte pour 1 dollar américain. Les paiements sur Cardano sont publics : tout le monde voit le montant, les deux adresses et la date, mais pas qui vous êtes. Une nouvelle adresse réservée à cet accord le sépare de vos autres. VeilCore ne détient ni ne déplace jamais l’argent.',
  'app.rpay.payout.token': 'Stablecoin',
  'app.rpay.payout.address': 'Votre adresse Cardano ({prefix}…)',
  'app.rpay.payout.useMine': 'Utiliser mon adresse {name}',
  'app.rpay.payout.sanctioned':
    'Cette adresse figure sur la liste des sanctions américaines : elle ne peut pas être utilisée.',
  'app.rpay.method': 'sur Cardano, en {code} (1 {code} = 1 USD)',
  'app.rpay.addr.not': 'Ce n’est pas une adresse Cardano (vérifiez qu’elle a été copiée en entier).',
  'app.rpay.addr.notPayment': 'Ce n’est pas une adresse de paiement Cardano (elle devrait commencer par addr).',
  'app.rpay.addr.otherNetwork': 'Cette adresse est celle d’un autre réseau Cardano, pas de {network}.',
  'app.rpay.pay.title': 'Payer depuis votre portefeuille Cardano',
  'app.rpay.pay.button': 'Payer {amount} {code} avec {name}',
  'app.rpay.pay.waiting': 'En attente de votre portefeuille…',
  'app.rpay.pay.wallet': 'Portefeuille',
  'app.rpay.pay.noWallet':
    'Ce navigateur n’a pas de portefeuille Cardano. Ouvrez cette page là où vous en avez un (Lace, Eternl ou un autre portefeuille CIP-30).',
  'app.rpay.pay.shows':
    'Votre portefeuille l’affiche avant que vous signiez : {amount} {code} à {to}, un peu d’ada que Cardano exige avec un jeton, les frais du réseau et la référence {ref}.',
  'app.rpay.pay.screened':
    'Les deux adresses sont comparées à la liste des sanctions américaines (OFAC, adresses Cardano, liste du {date}) avant que quoi que ce soit ne soit construit.',
  'app.rpay.pay.howTitle': 'Comment cela fonctionne',
  'app.rpay.pay.how':
    'Votre portefeuille paie {licensor} directement. VeilCore ne détient, ne bloque ni ne déplace jamais l’argent et n’en prélève aucuns frais. La référence portée par le paiement permet aux deux pages de le retrouver sur Cardano : dès qu’il a 10 blocs de profondeur et paie au moins {amount}, le rapport compte comme payé et réglé, sans autre étape. La vérification des sanctions est seulement une comparaison avec une liste : elle ne voit pas d’où vient l’argent, et la liste n’est à jour qu’à sa date.',
  'app.rpay.pay.sent':
    'Votre portefeuille a signé la transaction {tx}, mais elle n’est pas encore enregistrée pour {licensor}.',
  'app.rpay.pay.forget': 'Absente de l’historique de mon portefeuille : payer à nouveau',
  'app.rpay.pay.off':
    '{licensor} a demandé à être payé en {code} sur Cardano. Payer ainsi depuis cette page n’est pas encore activé ici : demandez d’autres coordonnées de paiement.',
  'app.rpay.pay.notUsd':
    'Ce rapport est en {currency}. Payer en stablecoin n’est possible que pour les rapports en dollars américains.',
  'app.rpay.pay.notPar':
    'Les coordonnées Cardano de {licensor} n’indiquent pas que 1 {code} compte pour 1 dollar américain : cette page ne peut donc pas le proposer.',
  'app.rpay.w.otherNetwork':
    'Votre portefeuille est sur un autre réseau Cardano. Passez-le sur {network} et réessayez.',
  'app.rpay.w.sanctioned':
    'Arrêté : une adresse de ce paiement figure sur la liste des sanctions américaines, ou n’a pas pu être lue. Rien n’a été construit ni envoyé.',
  'app.rpay.w.noCoins': 'Votre portefeuille n’a pas de pièces pour payer.',
  'app.rpay.w.cantBuild': 'Impossible de construire le paiement ({why}). Rien n’a été envoyé.',
  'app.rpay.c.checking': 'Vérification du paiement sur Cardano…',
  'app.rpay.c.ok':
    'Payé et réglé : {amount} en {code}, vérifié sur Cardano (transaction {tx}, {n} blocs de profondeur).',
  'app.rpay.c.unconfirmed':
    'Le paiement est sur Cardano, mais n’a pas encore 10 blocs de profondeur. La page vérifie à nouveau.',
  'app.rpay.c.failed': 'Cette transaction a échoué sur Cardano. Elle n’a rien payé.',
  'app.rpay.c.no-ref': 'Cette transaction ne porte aucune référence de paiement VeilCore.',
  'app.rpay.c.many-refs': 'Cette transaction porte plus d’une référence de paiement : elle ne compte donc pour aucune.',
  'app.rpay.c.wrong-ref': 'La référence de cette transaction correspond à un autre relevé.',
  'app.rpay.c.none': 'Cette transaction n’a payé aucun {code} à l’adresse de paiement.',
  'app.rpay.c.short': 'Cette transaction a payé {paid} {code}, moins que {amount}. Le reste est toujours dû.',
  'app.rpay.c.not-found': 'Cardano ne connaît pas encore cette transaction (cela peut prendre une minute).',
  'app.rpay.c.unreachable': 'Impossible de joindre Cardano. La page réessaie.',
  'app.rpay.c.no-relay':
    'Ce site ne peut pas encore vérifier Cardano : {licensor} confirme donc le paiement à la main.',
  'app.rpay.c.not-tx': 'La référence de paiement n’est pas une transaction Cardano.',
};
