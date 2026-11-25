// French (vous). DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md). Terms as in ../../fr.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const log = {
  'app.log.stepOf': 'Étape {n} sur {total}',
  'app.log.optional': 'Facultatif',
  'app.log.method.f1': 'Graine — F1',
  'app.log.method.f2': 'Graine — F2',
  'app.log.method.s1': 'Graine — autofécondée (S1)',
  'app.log.method.backcross': 'Graine — rétrocroisement',
  'app.log.method.clone': 'Clone / bouture',
  'app.log.method.tissue': 'Culture de tissus',
  'app.log.method.selection': 'Sélection',
  'app.log.method.landrace': 'Variété locale / ancienne',
  'app.log.method.other': 'Autre',
  'app.log.nextSaveBackup': 'Suivant : enregistrer votre sauvegarde',
  'app.log.reportIntro':
    '<b>Facultatif.</b> Vous avez déjà un rapport ADN pour cette plante ? C’est ce qui lie votre enregistrement à la plante elle-même. Ajoutez-le maintenant, il sera conservé avec l’enregistrement. Pas encore de rapport ? Passez : la page de la plante indique comment en obtenir un.',
  'app.log.finish': 'Terminer',
  'app.log.nextStageTitle': 'Enregistrer la génération ou la sélection suivante',
  'app.log.opening': 'Ouverture de {id}…',
  'app.log.notInBrowser':
    'S’il ne s’ouvre pas, cette plante n’est pas dans ce navigateur. <link>Enregistrer plutôt une nouvelle plante</link>',
  'app.log.keptEitherWay': 'Elle reste conservée dans ce navigateur dans tous les cas.',
  'app.log.keepAndStart': 'La garder et commencer l’étape suivante',
  'app.log.continueThat': 'Continuer cette plante',
  'app.log.unsavedPlant': 'Vous avez une plante non enregistrée : {name}.',
  'app.log.noNameYet': '(pas encore de nom)',
  'app.log.title': 'Enregistrer votre plante',
  'app.log.fillIn': 'Indiquez ce que vous savez. Vous vérifierez ensuite.',
  'app.log.sealEachStage':
    'Un enregistrement ne date rien d’antérieur au jour où il est scellé. Scellez chaque étape quand elle a lieu.',
  'app.log.parentLinked': ' Son parent est {name}, déjà lié ci-dessous.',
  'app.log.keptLastTime': 'Nous avons gardé ce que vous aviez saisi la dernière fois.',
  'app.log.startOver': 'Recommencer',
  'app.log.nameLabel': 'Nom de la plante ou de la lignée',
  'app.log.namePlaceholder': 'p. ex. Harbour Pippin',
  'app.log.nameHelp':
    'Verrouillé comme les autres détails. Un lien de vérification ne le porte après le # que si vous l’activez ; alors les personnes à qui vous envoyez le lien le voient, ainsi que toute personne à qui elles le transmettent.',
  'app.log.eg': 'p. ex. {v}',
  'app.log.egNextSelection': 'p. ex. {name}, sélection suivante',
  'app.log.bredBy': 'Obtenteur',
  'app.log.whenMade': 'Quand vous l’avez obtenue (votre propre note)',
  'app.log.whenMadeHelp': 'L’horodatage public vient du réseau. Ceci est votre note.',
  'app.log.stagePrompt': 'De quelle étape s’agit-il ? (p. ex. F3, deuxième série de clones)',
  'app.log.stageHelp': 'Scellé dans les notes sous la forme « Stage: … ».',
  'app.log.selectedPrompt': 'Sur quoi avez-vous sélectionné ?',
  'app.log.selectedHelp': 'Scellé dans les notes sous la forme « Selected for: … ».',
  'app.log.fewer': '− Moins de détails',
  'app.log.more': '+ Ajouter parents, espèce, photos ou notes',
  'app.log.parents': 'Parents',
  'app.log.parentsHelp': 'Choisissez une plante déjà enregistrée, ou tapez un nom et appuyez sur Entrée.',
  'app.log.species': 'Espèce',
  'app.log.speciesPlaceholder': 'p. ex. Solanum lycopersicum',
  'app.log.howMade': 'Comment elle a été obtenue',
  'app.log.howMadeStageHelp': 'Comment cette étape a-t-elle été obtenue ? Ce n’est pas repris du parent.',
  'app.log.notSaying': 'Je préfère ne pas le dire',
  'app.log.readingPhotos': 'Lecture des photos…',
  'app.log.addPhotos': 'Ajouter des photos',
  'app.log.photos.one': '{count} photo',
  'app.log.photos.other': '{count} photos',
  'app.log.photosStay': 'Les photos restent sur votre appareil. Seuls leurs codes sont conservés.',
  'app.log.refId': 'Votre propre numéro de lot ou de référence',
  'app.log.registration': 'Numéro d’inscription de la variété, si elle est inscrite',
  'app.log.registrationHelp':
    'Tel que le registre l’écrit, par exemple INASE RNC 12345. Scellé dans les notes de l’enregistrement. C’est votre déclaration : personne ne la vérifie.',
  'app.log.notes': 'Notes',
  'app.log.nextCheck': 'Suivant : vérifier',
  'app.log.readingYourPhotos': 'Lecture de vos photos…',
  'app.log.reviewTitle': 'Est-ce correct ?',
  'app.log.fixNow':
    'Vérifiez-le. Une fois scellé, il ne peut plus changer. Vous pourrez ajouter une correction plus tard.',
  'app.log.k.plant': 'Plante ou lignée',
  'app.log.k.made': 'Obtenue (votre note)',
  'app.log.k.more': 'Plus de détails',
  'app.log.noneAdded': 'Rien d’ajouté',
  'app.log.x.stage': 'Étape : {v}',
  'app.log.x.selectedFor': 'Sélectionnée pour : {v}',
  'app.log.x.parents': 'Parents : {v}',
  'app.log.x.species': 'Espèce : {v}',
  'app.log.x.madeBy': 'Méthode : {v}',
  'app.log.x.ref': 'Votre référence : {v}',
  'app.log.x.registration': 'Inscription de la variété : {v}',
  'app.log.x.notes': 'Notes ajoutées',
  'app.log.sealedWarn':
    '<b>Une fois scellée, cette partie ne peut plus changer.</b> Vous pourrez ajouter des rapports et des corrections plus tard ; une correction est un nouvel enregistrement qui renvoie à celui-ci. C’est ce qui donne sa valeur à l’horodatage.',
  'app.log.savedOn':
    'Les détails sont conservés verrouillés sur {server} pour que vous puissiez y revenir, et nous n’avons pas la clé. Le nom est verrouillé lui aussi ; un lien de vérification ne le porte après le # que si vous l’activez. Seul un code de preuve est daté, sur {datedOn}.',
  'app.log.sealing': 'Scellement…',
  'app.log.sealPlain':
    'Publié de façon permanente sur Midnight : uniquement des codes tirés de cet enregistrement. Jamais vos textes ni vos photos : ils restent privés ; vous seul pouvez les ouvrir.',
  'app.log.sealDetails': 'Qu’est-ce qui est publié ?',
  'app.log.seal': 'Sceller',
  'app.log.sealingPlant': 'Scellement de votre plante…',
  'app.log.sealStampsKey':
    'Le scellement horodate aussi la clé de votre plante, pour que vous puissiez prouver plus tard que vous la détenez. Seul un code de la clé est envoyé.',
  'app.log.sealed': 'Scellée',
  'app.log.publicStampLater':
    'Son horodatage public arrive quand son lot est daté sur {datedOn}. La page de votre plante indique quand cela a eu lieu. Vous n’avez rien à faire.',
  'app.log.privateWindow':
    'Ce navigateur ne gardera rien une fois fermé (une fenêtre privée, ou les données du site sont bloquées). Enregistrez d’abord votre sauvegarde, puis nous ajouterons l’horodatage.',
  'app.log.backupFirstTitle': 'Enregistrez d’abord votre sauvegarde',
  'app.log.nowStamp': 'Ajouter maintenant l’horodatage',
  'app.log.recordDatedWaiting': 'Enregistrement daté : en attente d’un lot',
  'app.log.publicDateLater':
    'Sa date publique arrive quand son lot est daté sur {datedOn}. La page de votre plante l’affichera alors.',
  'app.log.keyStampedAt':
    'Clé horodatée : {when}. La clé de votre plante est datée elle aussi, pour que vous puissiez prouver plus tard que vous la détenez.{bound} Rien sur la plante n’a été envoyé.',
  'app.log.keyStamped':
    'Clé horodatée. La clé de votre plante est datée elle aussi, pour que vous puissiez prouver plus tard que vous la détenez.{bound} Rien sur la plante n’a été envoyé.',
  'app.log.keyBound': ' L’enregistrement scellé désigne cette clé, donc personne ne peut la remplacer par une autre.',
  'app.log.stampFailedTitle': 'Enregistrement scellé. Horodatage facultatif de la clé : pas encore',
  'app.log.stampingTitle': 'Enregistrement scellé. Horodatage facultatif de la clé en cours…',
  'app.log.onlyFingerprint':
    'Facultatif, nécessaire seulement pour prouver que vous détenez cet enregistrement ou pour le concéder sous licence. Seul un code de sa clé est envoyé, rien sur la plante. Gratuit.',
  'app.log.stampingAria': 'Horodatage de la clé en cours',
  'app.log.stampLater': 'Continuer sans attendre',
  'app.log.stampNotYet': 'L’horodatage de la clé n’est pas encore passé. Il se réessaie tout seul.',
  'app.log.keepOpen':
    'Inutile d’attendre ici. Cela prend environ une minute et se réessaie tout seul tant que VeilCore est ouvert. Si cela s’arrête, rien n’est perdu : la page de votre plante propose à nouveau l’horodatage de la clé.',
} satisfies Partial<AppTranslation>;
