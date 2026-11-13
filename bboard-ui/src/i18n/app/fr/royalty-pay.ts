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
    'Sans paiement, la page de vérification publique de l’enregistrement de {licensor} peut indiquer qu’un relevé de redevances est en retard. Après un avis de manquement, vous avez {days} jours pour payer avant que la licence puisse être révoquée pour non-paiement.',
  'app.rpay.i.soon': 'Le paiement de {licensee} pour le rapport {n} est dû le {date}.',
  'app.rpay.i.overdue': 'Le paiement de {licensee} pour le rapport {n} est en retard depuis le {date}.',
  'app.rpay.i.publicFailed':
    'Impossible de mettre cela sur la page de vérification publique de votre enregistrement pour l’instant. La page réessaie à sa prochaine ouverture.',
  'app.rpay.i.publicUnsupported':
    'Le registre de VeilCore n’accepte pas encore d’avis publics : cela n’apparaît donc pas sur la page de vérification publique de votre enregistrement.',
  'app.rpay.revoke.open': 'Révoquer pour non-paiement',
  'app.rpay.revoke.yes': 'Révoquer la licence',
  'app.rpay.revoke.note': 'Licence révoquée pour non-paiement du rapport {n}.',
  'app.rpay.revoke.reason': 'Non-paiement',
  'app.rpay.pub.title': 'Redevances sur les licences issues de cet enregistrement',
  'app.rpay.payout.option': 'Stablecoin en dollars américains sur Cardano',
  'app.rpay.payout.info':
    'L’autre partie paie depuis son propre portefeuille, directement à votre adresse Cardano, en {code}. En enregistrant ceci, vous acceptez que 1 {code} compte pour 1 dollar américain. Les paiements sur Cardano sont publics : tout le monde voit le montant, les deux adresses et la date. Le paiement ne vous nomme pas, mais une adresse peut souvent être reliée à une personne, par exemple via une plateforme d’échange. Une nouvelle adresse réservée à cet accord le sépare de vos autres. VeilCore ne détient ni ne déplace jamais l’argent.',
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
  'app.rpay.l.breach':
    '{licensor} a envoyé un avis de manquement le {date}. Payez au plus tard le {cureBy} : après ce jour, si rien n’est indiqué comme payé, la licence peut être révoquée pour non-paiement.',
  'app.rpay.l.cureOver':
    '{licensor} a envoyé un avis de manquement le {date}, et le délai pour payer a pris fin le {cureBy}. La licence peut maintenant être révoquée pour non-paiement. Si vous avez payé, indiquez-le avec « J’ai payé ».',
  'app.rpay.i.breach':
    'Vous avez envoyé un avis de manquement le {date}. {licensee} a jusqu’au {cureBy} pour payer. « Révoquer pour non-paiement » est proposé dès le lendemain, si rien n’est indiqué comme payé.',
  'app.rpay.i.cureOver':
    'Vous avez envoyé un avis de manquement le {date}. Le délai pour payer a pris fin le {cureBy} sans paiement indiqué : vous pouvez révoquer pour non-paiement.',
  'app.rpay.i.noNotice':
    'Pour révoquer pour non-paiement, envoyez d’abord un avis de manquement sur le rapport ci-dessous. {licensee} aura alors {days} jours pour payer.',
  'app.rpay.i.answered': '{licensee} conteste ({date}) : « {note} »',
  'app.rpay.l.iPaid': 'J’ai payé',
  'app.rpay.l.dispute': 'Contester',
  'app.rpay.l.disputeAgain': 'Répondre à nouveau',
  'app.rpay.l.disputeNote': 'Pourquoi (court ; l’autre partie le verra)',
  'app.rpay.l.disputeSend': 'Envoyer ma réponse',
  'app.rpay.breach.open': 'Envoyer un avis de manquement',
  'app.rpay.breach.what':
    'Un avis signé et daté à {licensee} indiquant que ce paiement est en retard. Il dispose ensuite de {days} jours pour payer. Ce n’est qu’après, si rien n’est indiqué comme payé, que vous pouvez révoquer la licence pour non-paiement.',
  'app.rpay.breach.send': 'Envoyer l’avis',
  'app.rpay.breach.extra': 'Autre chose à ajouter (facultatif ; l’autre partie le verra)',
  'app.rpay.breach.note':
    'Le paiement du rapport {n}, dû le {due}, n’a pas été effectué. Vous avez {days} jours à compter de cet avis pour payer. Ensuite, s’il reste impayé, la licence peut être révoquée pour non-paiement.',
  'app.rpay.revoke.notYet':
    'Pas encore : la révocation pour non-paiement n’est possible qu’une fois le délai pour payer après votre avis de manquement écoulé sans paiement indiqué.',
  'app.rpay.notice.answer': '{who} a contesté le paiement pour {period} le {date} : « {note} »',
  'app.rpay.notice.revoked': '{who} a révoqué la licence pour non-paiement ({period}) le {date}.',
  'app.rpay.notice.cureBy': 'Délai pour payer : jusqu’au {cureBy}.',
  'app.rpay.pub.disputed': 'Le licencié le conteste (depuis le {date}).',
  'app.rpay.i.public':
    'La page de vérification publique de votre enregistrement indique : « La personne qui détient cet enregistrement déclare qu’un relevé de redevances est en retard depuis le {date}. » Ni montants, ni conditions, ni noms. Elle l’enlève à la prochaine vérification de cette page, une fois le paiement enregistré.',
  'app.rpay.i.publicBreach':
    'La page de vérification publique de votre enregistrement indique, comme votre déclaration, qu’un relevé de redevances est en retard depuis le {date}, et que vous avez indiqué au registre de VeilCore le {breach} avoir envoyé un avis de manquement. Le délai pour payer court à partir de ce jour. Ni montants, ni conditions, ni noms.',
  'app.rpay.i.publicAnswers': 'À côté, au nom du licencié lui-même : {answers}',
  'app.rpay.i.publicNoRecord':
    'Cet enregistrement n’est pas conservé au registre de VeilCore sous la clé de détenteur de ce navigateur : rien ne peut donc être mis sur sa page de vérification publique depuis ici. Ouvrez la licence sur l’appareil qui a sauvegardé l’enregistrement, ou restaurez ici votre sauvegarde.',
  'app.rpay.revoke.what':
    'Cela met fin à la licence sur Midnight et ne peut pas être annulé. Votre avis de manquement a été envoyé et le délai pour payer est écoulé selon l’horloge du registre de VeilCore, sans paiement indiqué. {licensee} reçoit ensuite un avis signé indiquant qu’elle a été révoquée pour non-paiement. La page de vérification publique de votre enregistrement l’indique, avec la date, si le registre confirme que le délai s’est écoulé sans paiement enregistré ; sinon, elle ne dit rien du paiement.',
  'app.rpay.revoke.done': 'Révoquée pour non-paiement le {date}.',
  'app.rpay.revoke.public': 'La page de vérification publique de votre enregistrement l’indique.',
  'app.rpay.revoke.notPublic':
    'Le registre de VeilCore n’a pas accepté de ligne publique sur le non-paiement (le délai n’était pas écoulé selon son horloge, ou un paiement y est enregistré) : la page de vérification publique ne dit donc rien du paiement.',
  'app.rpay.pub.overdue':
    'La personne qui détient cet enregistrement déclare qu’un relevé de redevances est en retard depuis le {date}.',
  'app.rpay.pub.breach':
    'La personne qui détient cet enregistrement a indiqué au registre de VeilCore le {date} avoir envoyé un avis de manquement.',
  'app.rpay.pub.revoked':
    'La personne qui détient cet enregistrement déclare qu’une licence issue de cet enregistrement a été révoquée le {date} pour non-paiement.',
  'app.rpay.pub.revokedChecked':
    'La personne qui détient cet enregistrement a indiqué au registre de VeilCore le {date} avoir envoyé un avis de manquement, et {days} jours se sont écoulés ensuite sans paiement enregistré au registre avant que cette ligne soit acceptée.',
  'app.rpay.pub.answerPaid': 'Le licencié déclare avoir payé ({date}).',
  'app.rpay.pub.who':
    'Qu’un paiement soit dû relève de la déclaration de la personne qui détient l’enregistrement ; VeilCore ne le vérifie pas. La date à côté d’un avis de manquement est le jour où cette personne l’a indiqué au registre de VeilCore, selon l’horloge du registre. Les réponses du licencié sont signées par lui, et la personne qui détient l’enregistrement ne peut pas les retirer. Personne n’est nommé, et aucun montant ni aucune condition n’est affiché.',
  'app.rpay.l.answered':
    'Vous l’avez contesté le {date} : « {note} ». {licensor} le voit. Votre réponse est déposée au registre de VeilCore sous votre propre clé (le {filed}). Toute ligne sur ce paiement dans la page de vérification publique de l’enregistrement de {licensor} indique que vous contestez, avec cette date, et {licensor} ne peut pas la retirer.',
  'app.rpay.l.answerPending':
    'Vous l’avez contesté le {date} : « {note} ». {licensor} le voit. Le dépôt de votre réponse au registre de VeilCore, où la page de vérification publique de l’enregistrement de {licensor} l’affiche, n’a pas encore abouti. Cette page réessaie à chaque ouverture.',
  'app.rpay.l.disputeShows':
    '{licensor} le voit, signé par vous. Votre réponse est aussi déposée en votre nom au registre de VeilCore : la page de vérification publique indique seulement que vous contestez et la date, jamais ce que vous avez écrit.',
  'app.rpay.pay.otherWay':
    '{licensor} a demandé à être payé en {code} sur Cardano, ce que cette page ne peut pas faire. Demandez à {licensor} d’autres coordonnées de paiement, payez par ce moyen, puis indiquez-le ci-dessous avec « J’ai payé ».',
  'app.rpay.l.revoked':
    '{licensor} a révoqué la licence pour non-paiement du rapport {n}, dans un avis signé daté du {date}.',
  'app.rpay.l.revokedPublic':
    'La page de vérification publique de l’enregistrement de {licensor} indique qu’elle a été révoquée le {date} pour non-paiement. Le registre de VeilCore ne l’a accepté qu’une fois le délai pour payer écoulé selon son horloge, sans paiement enregistré.',
  'app.rpay.l.revokedNotPublic':
    'La page de vérification publique de l’enregistrement de {licensor} ne dit rien d’un non-paiement : le registre de VeilCore ne l’a pas accepté.',
  'app.rpay.l.revokedDisputed':
    'Vous l’avez contesté le {date}. Votre réponse est déposée en votre propre nom au registre de VeilCore, et {licensor} ne peut pas la retirer : toute ligne sur ce paiement dans la page de vérification publique de l’enregistrement de {licensor} indique que vous contestez.',
  'app.rpay.notice.early':
    'Il a été envoyé avant que le paiement soit en retard : il n’ouvre donc aucun délai pour payer.',
  'app.rpay.notice.notThisOne':
    'Le délai pour payer court à partir du premier avis de manquement envoyé après que le paiement est en retard.',
  'app.rpay.predates':
    'Cette licence a été faite avant que le registre de VeilCore conserve les clés dont les avis publics ont besoin : rien sur ses paiements ne peut donc aller sur la page de vérification publique ni y recevoir de réponse. Les rappels, les avis de manquement, le délai pour payer et les réponses fonctionnent toujours entre vous deux, signés.',
  'app.rpay.i.breachNotRegistered':
    'La page de vérification publique indique que ce paiement est en retard, mais pas encore que vous avez envoyé un avis de manquement : la page de {licensee} n’a pas encore enregistré ce rapport au registre de VeilCore. Elle le fait d’elle-même à la prochaine ouverture de la licence. D’ici là, le délai pour payer ne peut pas commencer au registre. Votre avis signé est dans l’accord dans tous les cas.',
  'app.rpay.i.breachNotDue':
    '{licensee} a enregistré ce rapport au registre de VeilCore comme dû le {due} : la page de vérification publique ne peut donc indiquer que vous avez envoyé un avis de manquement qu’à partir du lendemain. D’ici là, elle indique que le paiement est en retard. Votre avis signé est dans l’accord dans tous les cas.',
  'app.rpay.l.answerPredates':
    'Vous l’avez contesté le {date} : « {note} ». {licensor} le voit, signé par vous. Cette licence a été faite avant que le registre de VeilCore conserve les clés dont les réponses ont besoin : elle ne peut donc pas y être déposée.',
  'app.rpay.l.pubOverdue':
    'La page de vérification publique de l’enregistrement de {licensor} indique, comme sa déclaration, qu’un relevé de redevances est en retard depuis le {date} (rapport {n}).',
  'app.rpay.l.pubOverdueOther':
    'La page de vérification publique de l’enregistrement de {licensor} indique, comme sa déclaration, qu’un relevé de redevances est en retard depuis le {date}, à propos d’un message de cet accord qui n’est pas l’un de vos rapports.',
  'app.rpay.l.pubRevoked':
    'La page de vérification publique de l’enregistrement de {licensor} indique, comme sa déclaration, qu’une licence issue de cet enregistrement a été révoquée le {date} pour non-paiement.',
  'app.rpay.l.pubBreach':
    '{licensor} a indiqué au registre de VeilCore le {date} avoir envoyé un avis de manquement. Le délai pour payer court jusqu’au {cureBy}.',
  'app.rpay.l.pubAnswers': 'À côté, en votre propre nom : {answers}',
  'app.rpay.l.pubDisputeFailed': 'Votre réponse n’a pas pu être déposée pour l’instant. Réessayez dans un moment.',
};
