// A strain or line record's sentences: each is this language's plant sentence for the same key,
// the plant noun replaced by one of the same gender (de Linie, es cepa, fr souche, ja 系統).
// DRAFT: to be checked by a fluent speaker before publishing (docs/translations/README.md).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const strain = {
  'app.strain.v.app.verify.noParents': 'Aucun parent enregistré.',
  'app.strain.v.app.plant.fix.name': 'Nom de la souche',
  'app.strain.v.app.plant.fix.bredBy': 'Obtenue ou isolée par',
  'app.strain.v.app.verify.namePublished': 'Nom que le détenteur montre : ',
  'app.strain.v.app.verify.nameMatches': 'Le nom correspond à l’enregistrement : ',
  'app.strain.v.app.verify.nameUnchecked': 'Nom donné dans ce lien (non vérifié) : ',
  'app.strain.v.app.log.reportIntro':
    '<b>Facultatif.</b> Vous avez déjà un rapport ADN pour cette souche ? C’est ce qui lie votre enregistrement à la souche elle-même. Ajoutez-le maintenant, il sera conservé avec l’enregistrement. Pas encore de rapport ? Passez : la page de la souche indique comment en obtenir un.',
  'app.strain.v.app.log.sealingPlant': 'Scellement de votre souche…',
  'app.strain.v.app.log.sealStampsKey':
    'Le scellement horodate aussi la clé de votre souche, pour que vous puissiez prouver plus tard que vous la détenez. Seul un code de la clé est envoyé.',
  'app.strain.v.app.log.publicStampLater':
    'Son horodatage public arrive quand son lot est daté sur {datedOn}. La page de votre souche indique quand cela a eu lieu. Vous n’avez rien à faire.',
  'app.strain.v.app.log.publicDateLater':
    'Sa date publique arrive quand son lot est daté sur {datedOn}. La page de votre souche l’affichera alors.',
  'app.strain.v.app.log.keyStampedAt':
    'Clé horodatée : {when}. La clé de votre souche est datée elle aussi, pour que vous puissiez prouver plus tard que vous la détenez.{bound} Rien sur la souche n’a été envoyé.',
  'app.strain.v.app.log.keyStamped':
    'Clé horodatée. La clé de votre souche est datée elle aussi, pour que vous puissiez prouver plus tard que vous la détenez.{bound} Rien sur la souche n’a été envoyé.',
  'app.strain.v.app.log.stampingTitle': 'Scellée. Horodatage de la clé de votre souche…',
  'app.strain.v.app.log.onlyFingerprint':
    'Seul un code de la clé de votre souche est envoyé, rien sur la souche. Gratuit : VeilCore paie les frais du réseau.',
  'app.strain.v.app.log.stampingAria': 'Horodatage de la clé de votre souche',
  'app.strain.v.app.log.keepOpen':
    'Gardez cet écran ouvert, environ une minute. S’il se ferme, rien n’est perdu : votre souche est enregistrée, et sa page vous proposera à nouveau l’horodatage.',
  'app.strain.v.app.chain.stampMayHaveGoneOut':
    'Votre horodatage est peut-être déjà parti{tx}. Votre souche est enregistrée. Ne réessayez pas tant que cette transaction n’a pas été vérifiée sur le réseau.',
  'app.strain.v.app.chain.stampUnreachable':
    'Impossible de joindre le réseau. Votre souche est enregistrée. Réessayez {when}, ou faites l’horodatage plus tard.',
  'app.strain.v.app.chain.stampDidntGoThrough':
    'L’horodatage n’a pas abouti. Votre souche est enregistrée. Réessayez {when}, ou faites l’horodatage plus tard.',
  'app.strain.v.app.pair.noPlant': 'Impossible de trouver la souche sur laquelle l’enregistrer.',
  'app.strain.v.app.pair.savedTitle': 'Rapport ADN enregistré sur cette souche',
  'app.strain.v.app.pair.noLabMatch':
    'Aucune signature de laboratoire sur cette souche ne correspond à ce fichier : il reste votre propre déclaration.',
  'app.strain.v.app.pair.saved':
    'Enregistré. Le code de votre rapport ADN est enregistré avec l’enregistrement de cette souche, comme votre déclaration que ce rapport lui correspond. Ce n’est pas une vérification de la génétique. {dated}',
  'app.strain.v.app.pair.title': 'Enregistrez votre rapport ADN sur cette souche',
  'app.strain.v.app.pair.intro':
    'Vous avez reçu votre rapport ADN ? Enregistrez-le sur cette souche. C’est ce qui lie votre enregistrement à la souche réelle : un nouveau test pourra ensuite y être comparé.',
  'app.strain.v.app.pair.savingTo': 'Enregistrement sur : <b>{name}</b> · obtenue par {by}',
  'app.strain.v.app.pair.replaces':
    '<b>Cette souche a déjà un rapport ADN enregistré : « {name} »{saved}.</b> Enregistrer celui-ci le remplace. La page de votre souche, son certificat et les liens que vous partagez montreront le nouveau, pas l’ancien. Rien n’est supprimé de votre appareil.',
  'app.strain.v.app.pair.replacesChain':
    '<b>Cette souche a déjà un rapport ADN enregistré : « {name} »{saved}.</b> Enregistrer celui-ci le remplace. La page de votre souche, son certificat et les liens que vous partagez montreront le nouveau, pas l’ancien. Rien n’est supprimé de votre appareil. Si vous avez daté l’ancienne association sur le réseau, cette date y reste.',
  'app.strain.v.app.pair.chain.stampFirst':
    'Ajoutez d’abord l’horodatage de votre souche (depuis sa page) si vous voulez aussi dater ce rapport de laboratoire sur le réseau.',
  'app.strain.v.app.plant.notHereText':
    'Si vous l’avez scellé dans un autre navigateur, enregistrez-y une copie de secours et ouvrez-la ici (Récupérer vos souches). Si c’est l’enregistrement de quelqu’un d’autre, ouvrez plutôt le lien de vérification qu’il vous a donné.',
  'app.strain.v.app.plant.bredByName': 'Obtenue ou isolée par {name}',
  'app.strain.v.app.plant.action.saveReport': 'Enregistrer un rapport ADN sur cette souche',
  'app.strain.v.app.plant.f.reportSaved': 'enregistré sur cette souche ({file}) · code de l’association {fp}{sha}',
  'app.strain.v.app.plant.backToPlant': 'Retour à la souche',
  'app.strain.v.app.plant.tie.tied': 'Lié à la souche',
  'app.strain.v.app.plant.tie.notYet': 'Pas encore lié à la souche',
  'app.strain.v.app.plant.tie.notNow': 'Plus lié à la souche',
  'app.strain.v.app.plant.tie.openedNotSaved': 'un rapport de laboratoire est ouvert, pas enregistré sur cette souche',
  'app.strain.v.app.plant.tie.sentence': 'Lié à la souche : {what}, {date}.',
  'app.strain.v.app.plant.tie.sentenceNoDate': 'Lié à la souche : {what}.',
  'app.strain.v.app.plant.tie.sentenceNone': 'Pas encore lié à la souche : {what}.',
  'app.strain.v.app.plant.tie.sentenceNot': 'Plus lié à la souche : {what}.',
  'app.strain.v.app.plant.tie.means':
    'Un rapport ADN permet à un laboratoire de comparer avec lui un nouveau test d’une souche. À lui seul, il ne montre pas qu’une souche correspond.',
  'app.strain.v.app.plant.tie.sub':
    'Rapport {date}. Un laboratoire peut comparer avec lui un nouveau test de la souche.',
  'app.strain.v.app.plant.tie.why':
    'Un rapport ADN de votre laboratoire est ce qui lie un enregistrement à la souche elle-même.',
  'app.strain.v.app.plant.savedToPlant': 'enregistré sur cette souche',
  'app.strain.v.app.plant.openedNotSaved': 'ouvert, pas enregistré sur cette souche',
  'app.strain.v.app.plant.keyStampLine':
    'Clé horodatée : {when}. La clé de votre souche est datée elle aussi : vous pourrez prouver plus tard que vous la détenez.',
  'app.strain.v.app.plant.next.backup.why':
    'Les clés de cette souche ne sont pour l’instant que sur cet appareil. S’il casse ou si le navigateur est effacé, personne ne pourra prouver que vous la détenez. L’enregistrement prend une minute.',
  'app.strain.v.app.plant.next.corrected.why':
    'Le laboratoire a remplacé le rapport ADN enregistré sur cette souche. Tant que vous n’enregistrez pas le rapport corrigé, la page de votre souche, son certificat et vos liens indiquent que celui enregistré a été remplacé.',
  'app.strain.v.app.plant.next.labWithdrew.whyNewer':
    'Il reste enregistré sur cette souche, et votre certificat et vos liens indiquent qu’il a été retiré. Un rapport plus récent est arrivé : ouvrez-le et enregistrez-le à la place.',
  'app.strain.v.app.plant.next.labWithdrew.why':
    'Il reste enregistré sur cette souche, et votre certificat et vos liens indiquent qu’il a été retiré. Demandez-en un nouveau au laboratoire.',
  'app.strain.v.app.plant.next.open.why':
    'Il est verrouillé avec la clé de cette souche, pour que vous seul puissiez l’ouvrir. L’ouvrir vérifie ici la signature du laboratoire.',
  'app.strain.v.app.plant.next.sample.whySaved':
    'Vous avez enregistré un rapport ADN sur cette souche : c’est votre propre déclaration. Un laboratoire qui signe avoir reçu un échantillon ajoute une seconde partie, ce qui constitue une preuve plus solide que votre seule déclaration.',
  'app.strain.v.app.plant.next.sample.why':
    'Pour l’instant, cet enregistrement est votre propre description de la souche. Un laboratoire qui signe avoir reçu un échantillon et renvoie un rapport en fait une preuve plus solide que votre seule description.',
  'app.strain.v.app.plant.next.dna.title': 'Obtenez un rapport ADN de cette souche',
  'app.strain.v.app.plant.next.dna.why':
    'Un enregistrement daté montre qu’une description existait. Un rapport ADN (l’empreinte génétique de la souche faite par un laboratoire) est ce qui lie votre enregistrement à la souche réelle. Deux façons d’en obtenir un :',
  'app.strain.v.app.plant.next.dna.haveText':
    'Enregistrez-le sur cette souche. Il est lu sur votre appareil ; le fichier n’est jamais envoyé.',
  'app.strain.v.app.plant.next.date.why':
    'Il est enregistré sur cette souche, mais rien ne le date encore. Le dater montre que le rapport existait à cette date, sans montrer les marqueurs à personne.',
  'app.strain.v.app.plant.next.save.title': 'Enregistrez le rapport ADN sur cette souche',
  'app.strain.v.app.plant.next.save.why':
    'Un laboratoire a signé avoir reçu un échantillon. Quand son rapport ADN reviendra, enregistrez-le sur cette souche : c’est ce qui lie votre enregistrement à la souche, pour pouvoir le comparer à un test ultérieur.',
  'app.strain.v.app.plant.next.save.action': 'L’enregistrer sur cette souche',
  'app.strain.v.app.plant.next.ready.why':
    'Un laboratoire a signé avoir reçu un échantillon, et un rapport ADN est enregistré sur cette souche. Vous pouvez transmettre du matériel ou la concéder sous licence, avec des conditions qui s’appliquent aux souches déclarées comme dérivées de cet enregistrement.',
  'app.strain.v.app.plant.tree.none':
    'Aucune lignée enregistrée pour l’instant. Ajoutez les souches parentes lors de l’enregistrement pour construire l’arbre généalogique.',
  'app.strain.v.app.plant.anchor.keysNotHere':
    'La clé de cette souche n’est pas dans ce navigateur. Récupérez-la depuis votre fichier de copie de secours : une nouvelle clé ne correspondrait pas à l’enregistrement scellé.',
  'app.strain.v.app.plant.bundle.keyIs':
    '(La clé de l’enregistrement est l’identifiant public de la clé créée pour cette souche quand vous l’avez scellée. Sa partie secrète reste dans votre copie de secours et ne va jamais dans le dossier.)',
  'app.strain.v.app.plant.bundle.checkedAgainst':
    'Il est comparé à celui enregistré sur cette souche avant d’être ajouté.',
  'app.strain.v.app.plant.cert.intro':
    'Pour vos dossiers et votre avocat : l’enregistrement scellé, une vérification récente qu’il n’a pas changé, s’il est ancré, si un rapport ADN le lie à la souche, tout accusé de réception de laboratoire et les licences en vigueur. Il contient les détails de l’enregistrement, mais ni données génétiques ni fichiers de laboratoire. Le QR code ouvre la page de vérification publique de l’enregistrement.',
  'app.strain.v.app.plant.att.noReceipt':
    'Aucun laboratoire n’a encore signé d’accusé de réception pour cette souche. Un enregistrement que vous seul soutenez est une preuve plus faible qu’un enregistrement signé par un laboratoire. Envoyez un échantillon à un laboratoire : son accusé de réception est signé avec sa clé, pas la vôtre.',
  'app.strain.v.app.verify.field.parent-names': 'Souches parentes (noms et numéros de dépôt)',
  'app.strain.v.app.verify.alwaysShown':
    'Toujours affichés : l’identifiant de l’enregistrement, son code de preuve ({fp}), la date à laquelle le registre l’a conservé pour la première fois, et ce que cette page a pu vérifier sur son lot et sur les attestations signées (un accusé de réception de laboratoire, un rapport de laboratoire). Le nom, seulement quand le lien le porte (les vôtres ne le portent que si vous l’activez) ou que vous choisissez de le montrer.',
  'app.strain.v.app.verify.ownReceiptTail':
    ' Vous le voyez parce que la souche est dans ce navigateur ; la personne à qui vous envoyez le lien ne voit que la ligne de signature ci-dessus.',
  'app.strain.v.app.prove.openCheckPage': 'Ouvrir la page de vérification de la souche',
  'app.strain.v.app.prove.doneText':
    'La réponse s’affichera sur sa page. Rien n’a été envoyé sur la souche : seulement la preuve que vous détenez son enregistrement.',
  'app.strain.v.app.prove.thePlant': 'la souche',
  'app.strain.v.app.prove.thisPlant': 'cette souche',
  'app.strain.v.app.prove.whatSends':
    '<b>Ce qui est envoyé :</b> seulement la preuve que vous détenez l’enregistrement de cette souche, placée sur le réseau de test. Pas de nom, pas de génétique, rien sur vos autres souches.',
  'app.strain.v.app.prove.answering':
    'Répondre indique à la personne qui vous a envoyé ce lien que vous détenez l’enregistrement de cette souche.',
  'app.strain.v.app.prove.watch.notWho': 'Cela ne montre pas qui est cette personne ni qui a obtenu la souche.',
  'app.strain.v.app.prove.watch.holderStatement':
    'Que cette clé corresponde à l’enregistrement de cette souche est pour l’instant la déclaration du détenteur. Cela ne montre pas qui est cette personne ni qui a obtenu la souche.',
  'app.strain.v.app.prove.watch.stampedYour':
    'La clé de votre souche a été horodatée le {when}. Cela date la clé, pas l’enregistrement.',
  'app.strain.v.app.prove.watch.stampedThisEarlier':
    'La clé de cette souche a déjà été horodatée sur le réseau. Cela date la clé, pas l’enregistrement.',
  'app.strain.v.app.prove.own.title': 'Prouvez que vous détenez la clé de cette souche (réseau de test)',
  'app.strain.v.app.prove.own.stampFirst':
    'Préparez d’abord la preuve : touchez « Préparer la preuve que vous le détenez » sur la page de la souche. La preuve porte sur l’identité de la souche sur la chaîne, que crée cette étape.',
  'app.strain.v.app.lab.sentence.none': 'Aucun rapport ADN n’est enregistré sur cette souche.',
  'app.strain.v.app.lab.sentence.self':
    'Un fichier de rapport ADN est enregistré sur cette souche. Aucune signature de laboratoire ne correspond : c’est la propre déclaration du détenteur.',
  'app.strain.v.app.lab.sentence.replaced':
    'Le rapport ADN enregistré sur cette souche a été remplacé par le laboratoire{on} par un rapport corrigé. {tail}',
  'app.strain.v.app.lab.sentence.withdrawn':
    'Le rapport ADN enregistré sur cette souche a été retiré par le laboratoire{on}. {tail}',
  'app.strain.v.app.lab.results.replacedNewer':
    '<b>Le rapport ADN enregistré sur cette souche a été remplacé par le laboratoire.</b> Enregistrez le rapport corrigé : ouvrez-le, puis touchez « L’enregistrer sur cette souche ».',
  'app.strain.v.app.lab.results.replacedNone':
    '<b>Le rapport ADN enregistré sur cette souche a été remplacé par le laboratoire.</b> Aucun rapport en vigueur de {lab} : l’original a été remplacé et la correction retirée.',
  'app.strain.v.app.lab.results.withdrawn':
    '<b>Le rapport de laboratoire enregistré sur cette souche a été retiré par le laboratoire.</b> Il reste enregistré jusqu’à ce que vous en enregistriez un autre, et votre certificat et vos liens indiquent qu’il a été retiré.',
  'app.strain.v.app.lab.results.withdrawnNewer':
    '<b>Le rapport de laboratoire enregistré sur cette souche a été retiré par le laboratoire.</b> Il reste enregistré jusqu’à ce que vous en enregistriez un autre, et votre certificat et vos liens indiquent qu’il a été retiré. Un rapport plus récent est arrivé : ouvrez-le, puis enregistrez-le sur cette souche.',
  'app.strain.v.app.lab.results.locked':
    'Verrouillés pour que vous seul puissiez les ouvrir, avec la clé de cette souche tirée de votre copie de secours. VeilCore les conserve verrouillés et n’a pas la clé.',
  'app.strain.v.app.lab.results.noKey':
    'La clé de cette souche n’est pas sur cet appareil : ses rapports de laboratoire ne peuvent donc pas être ouverts ici. <link>Récupérez d’abord vos souches depuis votre copie de secours</link>.',
  'app.strain.v.app.lab.results.whatOthersSee':
    '<b>Ce que les autres peuvent voir.</b> La signature du laboratoire est publique ; le rapport ne l’est pas. Quiconque a un lien vers la page de vérification de cette souche voit qu’un rapport de laboratoire la concernant a été signé, le SHA-256 du fichier du rapport et le nom sous lequel la clé du laboratoire est enregistrée : marqué « nom non vérifié » sauf si l’opérateur de VeilCore l’a rapproché d’une liste publique de licences ou d’accréditations. Si vous enregistrez le rapport sur cette souche et partagez « Si un rapport ADN est enregistré » dans Montrer à quelqu’un, on voit aussi que le fichier enregistré y correspond.',
  'app.strain.v.app.lab.results.nothingYet':
    'Rien pour l’instant. Quand un laboratoire auquel vous avez envoyé cette souche enverra un rapport de laboratoire, il apparaîtra ici.',
  'app.strain.v.app.lab.results.savedHere': ' · enregistré sur cette souche',
  'app.strain.v.app.lab.results.stillSaved': '. Il est toujours enregistré sur cette souche.',
  'app.strain.v.app.lab.results.replacesSaved':
    'Un rapport de laboratoire est déjà enregistré sur cette souche. Enregistrer celui-ci le remplace ; vous confirmez à l’écran suivant.',
  'app.strain.v.app.lab.send.nothingYet':
    'Rien n’a encore changé. La page de votre souche affiche « en attente » jusqu’à ce que le code soit saisi, et peut réafficher ce code. Il se colle dans le champ de l’accueil de VeilCore.',
  'app.strain.v.app.lab.send.takenFromHelp': 'La souche mère ou l’étiquette de son emplacement.',
  // What a strain is made by, not bred by (strain-words.test).
  'app.strain.v.app.plant.f.method': 'Méthode d’obtention',
  'app.strain.v.app.plant.f.statedDate': 'Date déclarée d’obtention ou d’isolement (déclaration du détenteur)',
  'app.strain.v.app.plant.fix.field.cultivarName': 'nom de la souche',
  'app.strain.v.app.plant.fix.field.breederName': 'obtenue ou isolée par',
  'app.strain.v.app.plant.fix.field.breedingMethod': 'méthode d’obtention',
  'app.strain.v.app.verify.field.breeding-method': 'Méthode d’obtention',
  'app.strain.v.app.verify.field.bred-by': 'Obtenue ou isolée par',
  'app.strain.v.app.verify.method': 'Méthode d’obtention, selon le détenteur : {method}',
  'app.strain.v.app.verify.noMethod': 'Aucune méthode d’obtention enregistrée.',
  'app.strain.v.app.verify.bredByShared': 'Obtenue ou isolée par, selon le détenteur : {name}',
  'app.strain.v.app.verify.noBredBy': 'Personne n’est enregistré comme l’ayant obtenue ou isolée.',
  'app.strain.v.app.lic.row.offspring': 'Redevance sur les souches dérivées',
  'app.strain.v.app.lic.row.offspringValue': '{pct} %, sur les souches déclarées comme dérivées de celle-ci',
  'app.strain.v.app.lic.f.offspring': 'Redevance sur les souches dérivées (%)',
  'app.strain.v.app.lic.f.offspringHelp':
    'S’applique aux souches déclarées comme dérivées de cet enregistrement (enregistrées avec lui comme parent, confirmées par les deux détenteurs). Une dérivation non déclarée n’est pas détectée. Laissez vide s’il n’y en a pas.',
  'app.strain.v.app.lic.f.extraHelpDeal':
    'Tout ce qui fait aussi partie de l’accord, avec vos propres mots. Par exemple : pas de cession à des tiers, citer la source dans les publications, détruire le stock restant à la fin.',
  'app.strain.v.app.lic.detail.thisCultivar': 'cette souche',
  'app.strain.v.app.lic.detail.lineage':
    'Si une souche est enregistrée plus tard avec {name} comme parent et que les deux détenteurs le confirment, le lien vers ce contrat apparaît dans son enregistrement. Les souches dérivées que personne n’enregistre ne sont pas détectées.',
  'app.strain.v.app.lic.detail.derivatives.one': '{count} souche déjà enregistrée en descend.',
  'app.strain.v.app.lic.detail.derivatives.other': '{count} souches déjà enregistrées en descendent.',
  'app.strain.v.app.lic.off.title': 'Redevance sur les souches dérivées : {pct} %',
  'app.strain.v.app.lic.off.intro':
    'Sur Midnight, elle figure sur l’enregistrement que le licencié a de cette souche, donc chaque souche dérivée que les deux détenteurs confirment l’affiche quand quelqu’un vérifie la lignée. Le licencié l’accepte ; seul le concédant peut la lever.',
  'app.strain.v.app.lic.off.dateFirst':
    'Datez d’abord votre propre enregistrement de cette souche, puis indiquez-le ici.',
  'app.strain.v.app.lic.off.datePlant': 'Dater un enregistrement',
  'app.strain.v.app.lic.off.yourRecord': 'Votre enregistrement de cette souche',
  'app.strain.v.app.lic.off.waitName': 'En attente que l’autre partie indique son enregistrement de cette souche.',
} satisfies Partial<AppTranslation>;
