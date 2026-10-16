// French (vous): animal records. DRAFT: machine-assisted, to be checked by a fluent speaker
// before publishing (docs/translations/README.md). Terms as in ./index.ts, plus: animal, père
// (sire), mère (dam), numéro d'identification individuel (individual ID), système
// d'identification (ID scheme), race, sexe, troupeau. app.animal.v.<key> is <key> said of an
// animal (l'animal, il).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const animal = {
  'app.animal.choice.label': 'Que voulez-vous enregistrer ?',
  'app.animal.choice.plant': 'Une plante',
  'app.animal.choice.animal': 'Un animal',
  'app.animal.title': 'Enregistrez votre animal',
  'app.animal.name': 'Nom de l’animal',
  'app.animal.namePlaceholder': 'p. ex. Vache d’essai',
  'app.animal.individualId': 'Numéro d’identification individuel',
  'app.animal.individualIdHelp': 'Le numéro de sa boucle auriculaire ou de son enregistrement, tel qu’il est écrit.',
  'app.animal.idScheme': 'Système d’identification',
  'app.animal.idSchemeHelp':
    'La numérotation à laquelle appartient le numéro. Choisissez-en une ou saisissez la vôtre.',
  'app.animal.scheme.jp': 'Identification des bovins au Japon (10 chiffres)',
  'app.animal.scheme.earTag': 'Boucle auriculaire',
  'app.animal.scheme.microchip': 'Puce électronique',
  'app.animal.scheme.herdBook': 'Numéro du livre généalogique',
  'app.animal.species': 'Espèce',
  'app.animal.speciesPlaceholder': 'p. ex. Bovin (Bos taurus)',
  'app.animal.breed': 'Race',
  'app.animal.breedPlaceholder': 'p. ex. Noir japonais',
  'app.animal.sex': 'Sexe',
  'app.animal.sex.female': 'Femelle',
  'app.animal.sex.male': 'Mâle',
  'app.animal.sex.unknown': 'Non indiqué',
  'app.animal.dob': 'Date de naissance (votre propre note)',
  'app.animal.dobHelp': 'Laissez vide si vous ne la connaissez pas. L’horodatage public vient du réseau.',
  'app.animal.breeder': 'Éleveur ou détenteur',
  'app.animal.breederPlaceholder': 'Votre nom ou votre élevage',
  'app.animal.more': '+ Ajouter le père, la mère, le troupeau, des photos ou des notes',
  'app.animal.sire': 'Père',
  'app.animal.dam': 'Mère',
  'app.animal.sireId': 'Numéro d’identification du père',
  'app.animal.damId': 'Numéro d’identification de la mère',
  'app.animal.parentHelp': 'Choisissez un animal que vous avez enregistré, ou saisissez son nom.',
  'app.animal.parentHelpNone':
    'Saisissez son nom. Les animaux que vous enregistrez ici pourront être choisis plus tard.',
  'app.animal.linkedId': 'Repris de l’enregistrement choisi.',
  'app.animal.herd': 'Troupeau ou élevage (facultatif)',
  'app.animal.idShort': 'n°',
  'app.animal.need.nameOrId':
    'Il suffit d’un nom ou d’un numéro d’identification, de l’espèce et de l’éleveur ou du détenteur.',
  'app.animal.need.scheme': 'Indiquez à quel système d’identification appartient le numéro.',
  'app.animal.need.species': 'Ajoutez l’espèce.',
  'app.animal.need.breeder': 'Ajoutez l’éleveur ou le détenteur.',
  'app.animal.unsaved': 'Vous avez un animal non enregistré : {name}.',
  'app.animal.k.animal': 'Animal',
  'app.animal.k.speciesBreed': 'Espèce et race',
  'app.animal.k.born': 'Né le (votre note)',
  'app.animal.notStated': 'Non indiqué',
  'app.animal.idIn': '{id} ({scheme})',
  'app.animal.x.sire': 'Père : {v}',
  'app.animal.x.dam': 'Mère : {v}',
  'app.animal.x.herd': 'Troupeau : {v}',
  'app.animal.f.statedBirth': 'Date de naissance (déclaration du détenteur)',
  'app.animal.noLicensing':
    'Les accords et les redevances ne sont pas encore disponibles pour les enregistrements d’animaux.',
  'app.animal.tree.sire': 'Père',
  'app.animal.tree.dam': 'Mère',
  'app.animal.home.yourRecords': 'Vos enregistrements',
  'app.animal.verify.sireLine': 'Père, selon le détenteur : {v}',
  'app.animal.verify.damLine': 'Mère, selon le détenteur : {v}',
  'app.animal.verify.idLine': 'Numéro d’identification, selon le détenteur : {id} ({scheme})',
  'app.animal.verify.noId': 'Aucun numéro d’identification enregistré.',
  'app.animal.v.app.verify.noParents': 'Ni père ni mère enregistrés.',
  'app.animal.v.app.plant.fix.name': 'Nom de l’animal',
  'app.animal.v.app.plant.fix.bredBy': 'Éleveur ou détenteur',
  'app.animal.v.app.verify.nameTyped': 'Nom de l’animal, tel que le détenteur l’a saisi : ',
  'app.animal.import.dob': 'Date de naissance',
  'app.animal.import.scheme': 'Système d’identification, pour chaque numéro du fichier',
  'app.animal.import.schemeHelp':
    'Par exemple : identification des bovins au Japon (10 chiffres), ou boucle auriculaire.',
  'app.animal.import.species': 'Espèce, pour les lignes qui ne l’indiquent pas',
  'app.animal.import.breeder': 'Éleveur ou détenteur, pour les lignes qui ne l’indiquent pas',
  'app.animal.import.pickHint':
    'Choisissez la colonne avec le nom ou le numéro d’identification de chaque animal, et indiquez à quel système d’identification appartiennent les numéros.',

  'app.animal.v.app.log.reportIntro':
    '<b>Facultatif.</b> Vous avez déjà un rapport ADN pour cet animal ? C’est ce qui lie votre enregistrement à l’animal lui-même. Ajoutez-le maintenant, il sera conservé avec l’enregistrement. Pas encore de rapport ? Passez : la page de l’animal indique comment en obtenir un.',
  'app.animal.v.app.log.sealingPlant': 'Scellement de votre animal…',
  'app.animal.v.app.log.sealStampsKey':
    'Le scellement horodate aussi la clé de votre animal, pour que vous puissiez prouver plus tard que vous détenez son enregistrement. Seule une empreinte de la clé est envoyée.',
  'app.animal.v.app.log.publicStampLater':
    'Son horodatage public arrive quand son lot est daté sur {datedOn}. La page de votre animal indique quand cela a eu lieu. Vous n’avez rien à faire.',
  'app.animal.v.app.log.publicDateLater':
    'Sa date publique arrive quand son lot est daté sur {datedOn}. La page de votre animal l’affichera alors.',
  'app.animal.v.app.log.keyStampedAt':
    'Clé horodatée : {when}. La clé de votre animal est datée elle aussi, pour que vous puissiez prouver plus tard que vous détenez son enregistrement.{bound} Rien sur l’animal n’a été envoyé.',
  'app.animal.v.app.log.keyStamped':
    'Clé horodatée. La clé de votre animal est datée elle aussi, pour que vous puissiez prouver plus tard que vous détenez son enregistrement.{bound} Rien sur l’animal n’a été envoyé.',
  'app.animal.v.app.log.stampingTitle': 'Scellé. Horodatage de la clé de votre animal…',
  'app.animal.v.app.log.onlyFingerprint':
    'Seule une empreinte de la clé de votre animal est envoyée, rien sur l’animal. Gratuit : VeilCore paie les frais du réseau.',
  'app.animal.v.app.log.stampingAria': 'Horodatage de la clé de votre animal',
  'app.animal.v.app.log.keepOpen':
    'Gardez cet écran ouvert, environ une minute. S’il se ferme, rien n’est perdu : votre animal est enregistré, et sa page vous proposera à nouveau l’horodatage.',
  'app.animal.v.app.chain.stampMayHaveGoneOut':
    'Votre horodatage est peut-être déjà parti{tx}. Votre animal est enregistré. Ne réessayez pas tant que cette transaction n’a pas été vérifiée sur le réseau.',
  'app.animal.v.app.chain.stampUnreachable':
    'Impossible de joindre le réseau. Votre animal est enregistré. Réessayez {when}, ou faites l’horodatage plus tard.',
  'app.animal.v.app.chain.stampDidntGoThrough':
    'L’horodatage n’a pas abouti. Votre animal est enregistré. Réessayez {when}, ou faites l’horodatage plus tard.',
  'app.animal.v.app.pair.noPlant': 'Impossible de trouver l’animal sur lequel l’enregistrer.',
  'app.animal.v.app.pair.savedTitle': 'Rapport ADN enregistré sur cet animal',
  'app.animal.v.app.pair.noLabMatch':
    'Aucune signature de laboratoire sur cet animal ne correspond à ce fichier : il reste votre propre déclaration.',
  'app.animal.v.app.pair.saved':
    'Enregistré. L’empreinte de votre rapport ADN est enregistrée avec l’enregistrement de cet animal, comme votre déclaration que ce rapport lui correspond. Ce n’est pas une vérification de la génétique. {dated}',
  'app.animal.v.app.pair.title': 'Enregistrez votre rapport ADN sur cet animal',
  'app.animal.v.app.pair.intro':
    'Vous avez reçu votre rapport ADN ? Enregistrez-le sur cet animal. C’est ce qui lie votre enregistrement à l’animal réel : un nouveau test pourra ensuite y être comparé.',
  'app.animal.v.app.pair.savingTo': 'Enregistrement sur : <b>{name}</b> · éleveur ou détenteur {by}',
  'app.animal.v.app.pair.replaces':
    '<b>Cet animal a déjà un rapport ADN enregistré : « {name} »{saved}.</b> Enregistrer celui-ci le remplace. La page de votre animal, son certificat et les liens que vous partagez montreront le nouveau, pas l’ancien. Rien n’est supprimé de votre appareil.',
  'app.animal.v.app.pair.replacesChain':
    '<b>Cet animal a déjà un rapport ADN enregistré : « {name} »{saved}.</b> Enregistrer celui-ci le remplace. La page de votre animal, son certificat et les liens que vous partagez montreront le nouveau, pas l’ancien. Rien n’est supprimé de votre appareil. Si vous avez daté l’ancienne association sur le réseau, cette date y reste.',
  'app.animal.v.app.pair.chain.stampFirst':
    'Ajoutez d’abord l’horodatage de votre animal (depuis sa page) si vous voulez aussi dater ce rapport de laboratoire sur le réseau.',
  'app.animal.v.app.plant.notHereText':
    'Si vous l’avez scellé dans un autre navigateur, enregistrez-y une copie de secours et ouvrez-la ici (Récupérer vos enregistrements). Si c’est l’enregistrement de quelqu’un d’autre, ouvrez plutôt le lien de vérification qu’il vous a donné.',
  'app.animal.v.app.plant.bredByName': 'Éleveur ou détenteur : {name}',
  'app.animal.v.app.plant.action.saveReport': 'Enregistrer un rapport ADN sur cet animal',
  'app.animal.v.app.plant.f.reportSaved': 'enregistré sur cet animal ({file}) · empreinte de l’association {fp}{sha}',
  'app.animal.v.app.plant.backToPlant': 'Retour à l’animal',
  'app.animal.v.app.plant.tie.tied': 'Lié à l’animal',
  'app.animal.v.app.plant.tie.notYet': 'Pas encore lié à l’animal',
  'app.animal.v.app.plant.tie.notNow': 'Plus lié à l’animal',
  'app.animal.v.app.plant.tie.openedNotSaved': 'un rapport de laboratoire est ouvert, pas enregistré sur cet animal',
  'app.animal.v.app.plant.tie.sentence': 'Lié à l’animal : {what}, {date}.',
  'app.animal.v.app.plant.tie.sentenceNoDate': 'Lié à l’animal : {what}.',
  'app.animal.v.app.plant.tie.sentenceNone': 'Pas encore lié à l’animal : {what}.',
  'app.animal.v.app.plant.tie.sentenceNot': 'Plus lié à l’animal : {what}.',
  'app.animal.v.app.plant.tie.means':
    'Un rapport ADN permet à un laboratoire de comparer avec lui un nouveau test d’un animal. À lui seul, il ne montre pas qu’un animal correspond.',
  'app.animal.v.app.plant.tie.sub':
    'Rapport {date}. Un laboratoire peut comparer avec lui un nouveau test de l’animal.',
  'app.animal.v.app.plant.tie.why':
    'Un rapport ADN de votre laboratoire est ce qui lie un enregistrement à l’animal lui-même.',
  'app.animal.v.app.plant.savedToPlant': 'enregistré sur cet animal',
  'app.animal.v.app.plant.openedNotSaved': 'ouvert, pas enregistré sur cet animal',
  'app.animal.v.app.plant.keyStampLine':
    'Clé horodatée : {when}. La clé de votre animal est datée elle aussi : vous pourrez prouver plus tard que vous détenez son enregistrement.',
  'app.animal.v.app.plant.next.backup.why':
    'Les clés de cet animal ne sont pour l’instant que sur cet appareil. S’il casse ou si le navigateur est effacé, personne ne pourra prouver que vous détenez son enregistrement. L’enregistrement prend une minute.',
  'app.animal.v.app.plant.next.corrected.why':
    'Le laboratoire a remplacé le rapport ADN enregistré sur cet animal. Tant que vous n’enregistrez pas le rapport corrigé, la page de votre animal, son certificat et vos liens indiquent que celui enregistré a été remplacé.',
  'app.animal.v.app.plant.next.labWithdrew.whyNewer':
    'Il reste enregistré sur cet animal, et votre certificat et vos liens indiquent qu’il a été retiré. Un rapport plus récent est arrivé : ouvrez-le et enregistrez-le à la place.',
  'app.animal.v.app.plant.next.labWithdrew.why':
    'Il reste enregistré sur cet animal, et votre certificat et vos liens indiquent qu’il a été retiré. Demandez-en un nouveau au laboratoire.',
  'app.animal.v.app.plant.next.open.why':
    'Il est verrouillé avec la clé de cet animal, pour que vous seul puissiez l’ouvrir. L’ouvrir vérifie ici la signature du laboratoire.',
  'app.animal.v.app.plant.next.sample.whySaved':
    'Vous avez enregistré un rapport ADN sur cet animal : c’est votre propre déclaration. Un laboratoire qui signe avoir reçu un échantillon ajoute une seconde partie, ce qui constitue une preuve plus solide que votre seule déclaration.',
  'app.animal.v.app.plant.next.sample.why':
    'Pour l’instant, cet enregistrement est votre propre description de l’animal. Un laboratoire qui signe avoir reçu un échantillon et renvoie un rapport en fait une preuve plus solide que votre seule description.',
  'app.animal.v.app.plant.next.dna.title': 'Obtenez un rapport ADN de cet animal',
  'app.animal.v.app.plant.next.dna.why':
    'Un enregistrement daté montre qu’une description existait. Un rapport ADN (le profil génétique de l’animal fait par un laboratoire) est ce qui lie votre enregistrement à l’animal réel. Deux façons d’en obtenir un :',
  'app.animal.v.app.plant.next.dna.haveText':
    'Enregistrez-le sur cet animal. Il est lu sur votre appareil ; le fichier n’est jamais envoyé.',
  'app.animal.v.app.plant.next.date.why':
    'Il est enregistré sur cet animal, mais rien ne le date encore. Le dater montre que le rapport existait à cette date, sans montrer les marqueurs à personne.',
  'app.animal.v.app.plant.next.save.title': 'Enregistrez le rapport ADN sur cet animal',
  'app.animal.v.app.plant.next.save.why':
    'Un laboratoire a signé avoir reçu un échantillon. Quand son rapport ADN reviendra, enregistrez-le sur cet animal : c’est ce qui lie votre enregistrement à l’animal, pour pouvoir le comparer à un test ultérieur.',
  'app.animal.v.app.plant.next.save.action': 'L’enregistrer sur cet animal',
  'app.animal.v.app.plant.next.ready.why':
    'Un laboratoire a signé avoir reçu un échantillon, et un rapport ADN est enregistré sur cet animal. Les accords et les redevances ne sont pas encore disponibles pour les enregistrements d’animaux.',
  'app.animal.v.app.plant.tree.none': 'Ni père ni mère enregistrés pour l’instant.',
  'app.animal.v.app.plant.anchor.keysNotHere':
    'La clé de cet animal n’est pas dans ce navigateur. Récupérez-la depuis votre fichier de copie de secours : une nouvelle clé ne correspondrait pas à l’enregistrement scellé.',
  'app.animal.v.app.plant.bundle.keyIs':
    '(La clé de l’enregistrement est l’identifiant public de la clé créée pour cet animal quand vous l’avez scellé. Sa partie secrète reste dans votre copie de secours et ne va jamais dans le dossier.)',
  'app.animal.v.app.plant.bundle.checkedAgainst':
    'Il est comparé à celui enregistré sur cet animal avant d’être ajouté.',
  'app.animal.v.app.plant.cert.intro':
    'Pour vos dossiers et votre avocat : l’enregistrement scellé, une vérification récente qu’il n’a pas changé, s’il est ancré, si un rapport ADN le lie à l’animal, et tout accusé de réception de laboratoire. Il contient les détails de l’enregistrement, mais ni données génétiques ni fichiers de laboratoire. Le QR code ouvre la page de vérification publique de l’enregistrement.',
  'app.animal.v.app.plant.att.noReceipt':
    'Aucun laboratoire n’a encore signé d’accusé de réception pour cet animal. Un enregistrement que vous seul soutenez est une preuve plus faible qu’un enregistrement signé par un laboratoire. Envoyez un échantillon à un laboratoire : son accusé de réception est signé avec sa clé, pas la vôtre.',
  'app.animal.v.app.verify.field.parent-names': 'Père et mère (noms et numéros)',
  'app.animal.v.app.verify.alwaysShown':
    'Toujours affichés : le nom de l’animal, l’identifiant de l’enregistrement, son empreinte ({fp}), la date à laquelle le registre l’a conservé pour la première fois, et ce que cette page a pu vérifier sur son lot et sur les attestations signées (un accusé de réception de laboratoire, un rapport de laboratoire).',
  'app.animal.v.app.verify.ownReceiptTail':
    ' Vous le voyez parce que l’animal est dans ce navigateur ; la personne à qui vous envoyez le lien ne voit que la ligne de signature ci-dessus.',
  'app.animal.v.app.prove.openCheckPage': 'Ouvrir la page de vérification de l’animal',
  'app.animal.v.app.prove.doneText':
    'La réponse s’affichera sur sa page. Rien n’a été envoyé sur l’animal : seulement la preuve que vous détenez son enregistrement.',
  'app.animal.v.app.prove.thePlant': 'l’animal',
  'app.animal.v.app.prove.thisPlant': 'cet animal',
  'app.animal.v.app.prove.whatSends':
    '<b>Ce qui est envoyé :</b> seulement la preuve que vous détenez l’enregistrement de cet animal, placée sur le réseau de test. Pas de nom, pas de génétique, rien sur vos autres enregistrements.',
  'app.animal.v.app.prove.answering':
    'Répondre indique à la personne qui vous a envoyé ce lien que vous détenez l’enregistrement de cet animal.',
  'app.animal.v.app.prove.watch.notWho': 'Cela ne montre pas qui est cette personne ni qui a élevé l’animal.',
  'app.animal.v.app.prove.watch.holderStatement':
    'Que cette clé corresponde à l’enregistrement de cet animal est pour l’instant la déclaration du détenteur. Cela ne montre pas qui est cette personne ni qui a élevé l’animal.',
  'app.animal.v.app.prove.watch.stampedYour':
    'La clé de votre animal a été horodatée le {when}. Cela date la clé, pas l’enregistrement.',
  'app.animal.v.app.prove.watch.stampedThisEarlier':
    'La clé de cet animal a déjà été horodatée sur le réseau. Cela date la clé, pas l’enregistrement.',
  'app.animal.v.app.prove.own.title': 'Prouvez que vous détenez la clé de cet animal (réseau de test)',
  'app.animal.v.app.prove.own.stampFirst':
    'Ajoutez d’abord l’horodatage : touchez « Ajouter l’horodatage » sur la page de l’animal. La preuve porte sur l’identité de l’enregistrement de l’animal sur la chaîne, que crée l’horodatage.',
  // The lab report panels, a delivery and the saved report's sentence, for an animal.
  'app.animal.v.app.lab.sentence.none': 'Aucun rapport ADN n’est enregistré sur cet animal.',
  'app.animal.v.app.lab.sentence.self':
    'Un fichier de rapport ADN est enregistré sur cet animal. Aucune signature de laboratoire ne correspond : c’est la propre déclaration du détenteur.',
  'app.animal.v.app.lab.sentence.replaced':
    'Le rapport ADN enregistré sur cet animal a été remplacé par le laboratoire{on} par un rapport corrigé. {tail}',
  'app.animal.v.app.lab.sentence.withdrawn':
    'Le rapport ADN enregistré sur cet animal a été retiré par le laboratoire{on}. {tail}',
  'app.animal.v.app.lab.results.replacedNewer':
    '<b>Le rapport de laboratoire enregistré sur cet animal a été remplacé par le laboratoire.</b> Enregistrez le rapport corrigé : ouvrez-le, puis touchez « L’enregistrer sur cet animal ».',
  'app.animal.v.app.lab.results.replacedNone':
    '<b>Le rapport de laboratoire enregistré sur cet animal a été remplacé par le laboratoire.</b> Aucun rapport en vigueur de {lab} : l’original a été remplacé et la correction retirée.',
  'app.animal.v.app.lab.results.withdrawn':
    '<b>Le rapport de laboratoire enregistré sur cet animal a été retiré par le laboratoire.</b> Il reste enregistré jusqu’à ce que vous en enregistriez un autre, et votre certificat et vos liens indiquent qu’il a été retiré.',
  'app.animal.v.app.lab.results.withdrawnNewer':
    '<b>Le rapport de laboratoire enregistré sur cet animal a été retiré par le laboratoire.</b> Il reste enregistré jusqu’à ce que vous en enregistriez un autre, et votre certificat et vos liens indiquent qu’il a été retiré. Un rapport plus récent est arrivé : ouvrez-le, puis enregistrez-le sur cet animal.',
  'app.animal.v.app.lab.results.locked':
    'Verrouillés pour que vous seul puissiez les ouvrir, avec la clé de cet animal tirée de votre copie de secours. VeilCore ne peut pas les lire.',
  'app.animal.v.app.lab.results.noKey':
    'La clé de cet animal n’est pas sur cet appareil : ses rapports de laboratoire ne peuvent donc pas être ouverts ici. <link>Récupérez d’abord vos enregistrements depuis votre copie de secours</link>.',
  'app.animal.v.app.lab.results.whatOthersSee':
    '<b>Ce que les autres peuvent voir.</b> La signature du laboratoire est publique ; le rapport ne l’est pas. Quiconque a un lien vers la page de vérification de cet animal voit qu’un rapport de laboratoire le concernant a été signé, le SHA-256 du fichier du rapport et le nom sous lequel la clé du laboratoire est enregistrée : marqué « nom non vérifié » sauf si l’opérateur de VeilCore l’a rapproché d’une liste publique de licences ou d’accréditations. Si vous enregistrez le rapport sur cet animal et partagez « Si un rapport ADN est enregistré » dans Montrer à quelqu’un, on voit aussi que le fichier enregistré y correspond.',
  'app.animal.v.app.lab.results.nothingYet':
    'Rien pour l’instant. Quand un laboratoire auquel vous avez envoyé un échantillon de cet animal enverra un rapport de laboratoire, il apparaîtra ici.',
  'app.animal.v.app.lab.results.savedHere': ' · enregistré sur cet animal',
  'app.animal.v.app.lab.results.stillSaved': '. Il est toujours enregistré sur cet animal.',
  'app.animal.v.app.lab.results.replacesSaved':
    'Un rapport de laboratoire est déjà enregistré sur cet animal. Enregistrer celui-ci le remplace ; vous confirmez à l’écran suivant.',
  'app.animal.v.app.lab.send.nothingYet':
    'Rien n’a encore changé. La page de votre animal affiche « en attente » jusqu’à ce que le code soit saisi, et peut réafficher ce code. Il se colle dans le champ de l’accueil de VeilCore.',
  'app.animal.v.app.lab.send.takenFromHelp':
    'Le numéro d’identification de l’animal, ou l’endroit où l’échantillon a été prélevé.',
} satisfies Partial<AppTranslation>;
