// L’application en français : Demander à VeilCore et les lots de nouveaux enregistrements
// (../en/ask.ts). BROUILLON : traduction assistée par machine, à faire relire par un locuteur
// natif avant publication (docs/translations/README.md).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const ask = {
  'app.ask.button': 'Demander',
  'app.ask.title': 'Demander à VeilCore',
  'app.ask.intro': 'Choisissez, ou écrivez ce que vous voulez faire.',
  'app.ask.privacy': 'Ce que vous tapez ici n’est pas envoyé. Seul Enregistrer envoie.',
  'app.ask.engine': 'Marche hors ligne.',
  'app.ask.inputLabel': 'Que voulez-vous faire ?',
  'app.ask.inputPlaceholder': 'ex. couper 12 boutures de Blue Dream',
  'app.ask.go': 'Aller',
  'app.ask.close': 'Fermer',
  'app.ask.clear': 'Effacer',
  'app.ask.you': 'Vous : {text}',
  'app.ask.miss': 'Je ne suis pas sûr de comprendre. Le plus proche :',
  'app.ask.chip.record': 'Nouvel enregistrement',
  'app.ask.chip.clones': 'Couper des boutures',
  'app.ask.chip.offspring': 'Enregistrer une descendance',
  'app.ask.chip.cross': 'Enregistrer un croisement',
  'app.ask.chip.due': 'Ce qui est dû',
  'app.ask.chip.explain': 'Expliquer un mot',
  'app.ask.chip.search': 'Chercher mes enregistrements',
  'app.ask.chip.backup': 'Enregistrer votre sauvegarde',
  'app.ask.chip.agreements': 'Accords',
  'app.ask.chip.import': 'Dater votre collection',
  'app.ask.kind.plant': 'plante',
  'app.ask.kind.animal': 'animal',
  'app.ask.kind.strain': 'souche ou lignée',
  // ---- ce que vous pouvez faire ici (à la première ouverture, puis sous un lien) ----
  'app.ask.can.title': 'Je peux :',
  'app.ask.can.1': 'Couper des boutures ou enregistrer une descendance, plusieurs à la fois',
  'app.ask.can.1plants': 'Couper des boutures, plusieurs à la fois',
  'app.ask.can.2': 'Montrer ce qui est dû',
  'app.ask.can.3': 'Expliquer des mots comme « code de preuve »',
  'app.ask.can.4': 'Trouver vos enregistrements',
  'app.ask.can.5': 'Remplir un nouvel enregistrement, que vous vérifiez et enregistrez',
  'app.ask.can.never': 'Je ne signe et n’envoie jamais rien. C’est vous qui le faites.',
  'app.ask.can.toggle': 'Que peut-on faire ici ?',
  // ---- l’astuce près du bouton, dès qu’il y a un enregistrement (l’exemple le nomme) ----
  'app.ask.hint.try': 'Essayez : {example}',
  'app.ask.hint.dismiss': 'Masquer',
  'app.ask.example.clones': 'couper 6 boutures de {name}',
  'app.ask.example.calves': 'enregistrer 2 veaux de {name}',
  // ---- le modèle de langage sur cet appareil (facultatif) ----
  'app.ask.privacyModel':
    'Ce que vous tapez ici n’est pas envoyé. Le modèle de langage tourne sur cet appareil. Seul Enregistrer envoie.',
  'app.ask.engine.model':
    'Le modèle de langage de cet appareil ({model}) répond ; ses réponses passent les mêmes contrôles que d’habitude.',
  'app.ask.engine.starting':
    'Démarrage du modèle de langage sur cet appareil. En attendant, tout marche comme d’habitude.',
  'app.ask.engine.failed':
    'Le modèle de langage de cet appareil n’a pas démarré. {why} Sans le modèle, tout marche comme d’habitude.',
  'app.ask.model.title': 'Modèle de langage sur cet appareil (facultatif)',
  'app.ask.model.what':
    '« Demander à VeilCore » marche déjà sans cela, même hors ligne. Vous pouvez ajouter un petit modèle de langage (Qwen3) qui tourne uniquement dans ce navigateur. Il comprendra peut-être plus de façons de dire les choses. Il ne peut rien faire de plus que « Demander à VeilCore », et ses réponses passent les mêmes contrôles.',
  'app.ask.model.pick': 'Quel modèle',
  'app.ask.model.option': '{name} : environ {size}',
  'app.ask.model.size': 'Téléchargement : {size}, gardé dans ce navigateur jusqu’à ce que vous le supprimiez.',
  'app.ask.model.hf':
    'Les fichiers du modèle viennent de Hugging Face. Hugging Face voit votre adresse IP, l’heure, quel modèle, et que la demande vient de veilcore.org. Rien de ce que vous tapez n’est envoyé, ni alors ni plus tard.',
  'app.ask.model.check':
    'Avant utilisation, chaque fichier est vérifié : ce doit être exactement celui qu’attend ce site.',
  'app.ask.model.needsConnection':
    'À chaque démarrage, ce navigateur charge le programme du modèle depuis veilcore.org : il faut donc une connexion. Rien de ce que vous tapez n’est envoyé.',
  'app.ask.model.folded': 'Facultatif : un modèle de langage sur cet ordinateur',
  'app.ask.model.download': 'Télécharger ({size})',
  'app.ask.model.resume': 'Reprendre le téléchargement',
  'app.ask.model.cancel': 'Annuler',
  'app.ask.model.progress': '{done} sur {total}',
  'app.ask.model.cancelled': 'Arrêté. Ce qui est téléchargé est gardé ; reprenez quand vous voulez.',
  'app.ask.model.delete': 'Supprimer le modèle de ce navigateur',
  'app.ask.model.deleted': 'Supprimé. Tout marche comme d’habitude.',
  'app.ask.model.stored': 'Téléchargé : {name}. Il est testé une fois sur cet appareil, puis utilisé.',
  'app.ask.model.noRoom':
    'Ce navigateur a environ {free} de libre et le modèle demande {size}. Sans le modèle, tout marche comme d’habitude.',
  'app.ask.model.failed.network':
    'Le téléchargement s’est arrêté (connexion). Vous pouvez le reprendre. Sans le modèle, tout marche comme d’habitude.',
  'app.ask.model.failed.mismatch':
    'Un fichier n’était pas exactement celui qu’attend ce site, il n’a donc pas été gardé. Sans le modèle, tout marche comme d’habitude.',
  'app.ask.model.failed.storage':
    'Ce navigateur n’a pas gardé les fichiers. Sans le modèle, tout marche comme d’habitude.',
  'app.ask.model.failed.policy':
    'Ce navigateur ne peut pas faire tourner le modèle de langage. Un Chrome ou Edge à jour le peut en général. Sans le modèle, tout marche comme d’habitude.',
  'app.ask.model.why.policy':
    'Ce navigateur ne peut pas le faire tourner. Un Chrome ou Edge à jour le peut en général.',
  'app.ask.model.why.mismatch':
    'Un fichier gardé n’est pas celui qu’attend ce site. Supprimez le modèle et téléchargez-le à nouveau.',
  'app.ask.model.why.notStored': 'Une partie du modèle manque ; reprenez le téléchargement.',
  'app.ask.model.why.noGpu': 'Ce navigateur ne peut pas le faire tourner. Un Chrome ou Edge à jour le peut en général.',
  'app.ask.model.why.noF16': 'La carte graphique de cet ordinateur ne peut pas faire tourner ce modèle.',
  'app.ask.model.why.selfTest': 'Il a mal répondu au test sur cet appareil.',
  'app.ask.model.why.failed': 'Il s’est arrêté pendant le chargement.',
  'app.ask.model.notHere.narrow': 'Élargissez cette fenêtre pour voir le modèle de langage facultatif.',
  'app.ask.model.notHere.noWebgpu':
    'Ce navigateur ne peut pas faire tourner le modèle de langage. Un Chrome ou Edge à jour le peut en général. Sans le modèle, tout marche comme d’habitude.',
  'app.ask.model.notHere.noF16':
    'La carte graphique de cet ordinateur ne peut pas faire tourner le modèle de langage. Sans le modèle, tout marche comme d’habitude.',
  'app.ask.model.notHere.memory':
    'Cet ordinateur a trop peu de mémoire pour le modèle de langage. Sans le modèle, tout marche comme d’habitude.',
  'app.ask.draft.opens': 'Ouvre : {screen}',
  'app.ask.screen.record': 'Créer un enregistrement ({kind})',
  'app.ask.screen.cross': 'Créer un enregistrement : un croisement ({kind})',
  'app.ask.screen.clones': 'Couper des boutures',
  'app.ask.screen.offspring': 'Enregistrer une descendance',
  'app.ask.draft.name': 'Nom : {v}',
  'app.ask.draft.parents': 'Parents : {v}',
  'app.ask.draft.cutFrom': 'Coupées sur : {v}',
  'app.ask.draft.count': 'Combien : {n}',
  'app.ask.draft.notFound': 'Aucun de vos enregistrements ne s’appelle « {name} ». Choisissez-le sur cet écran.',
  'app.ask.draft.nothingSaved': 'Rien n’est enregistré avant que vous touchiez Enregistrer sur cet écran.',
  'app.ask.draft.open': 'Ouvrir',
  'app.ask.banner.ask': 'Rempli par Demander. Vérifiez chaque champ surligné.',
  'app.ask.banner.link':
    'Ouvert depuis un lien. Il n’a fixé que le type d’enregistrement et le nombre. Vérifiez chaque champ surligné.',
  'app.ask.replace.title': 'Vous avez un enregistrement à moitié rempli',
  'app.ask.replace.note': 'Utiliser le nouveau brouillon remplace ce que vous y avez écrit.',
  'app.ask.replace.use': 'Utiliser le nouveau brouillon',
  'app.ask.due.title': 'Ce qui est dû',
  'app.ask.due.from':
    'D’après vos accords dans ce navigateur : leurs conditions, et les rapports et paiements que cette page a lus.',
  'app.ask.due.none': 'Rien n’est dû au titre des accords de ce navigateur.',
  'app.ask.due.report': 'Rapport de redevances : {name}, du {from} au {to}',
  'app.ask.due.payment': 'Paiement de redevances : {name}, du {from} au {to}',
  'app.ask.due.check': '{name} : ouvrez l’accord pour voir ce qui est dû',
  'app.ask.due.ends': 'Fin de l’accord : {name}',
  'app.ask.due.line': '{date} : {what}',
  'app.ask.due.overdue': 'En retard',
  'app.ask.due.ics': 'Ajouter à mon agenda (.ics)',
  'app.ask.due.share': 'Partager un rappel',
  'app.ask.due.copied': 'Rappel copié.',
  'app.ask.due.shareText.one': '{count} élément dû sur VeilCore',
  'app.ask.due.shareText.other': '{count} éléments dus sur VeilCore',
  'app.ask.due.shareNote': 'Le rappel ne dit que le nombre : ni noms, ni dates, ni montants.',
  'app.ask.due.calName': 'VeilCore : {what}',
  'app.ask.explain.title': 'Expliquer',
  'app.ask.explain.pick': 'Choisissez un mot :',
  'app.ask.term.priorPossession': 'Détention antérieure',
  'app.ask.def.priorPossession':
    'Un enregistrement montre que vous déteniez quelque chose à une date : il a été scellé alors, et son code de preuve a été daté sur Midnight. C’est tout ce qu’il affirme.',
  'app.ask.term.proofCode': 'Code de preuve',
  'app.ask.def.proofCode':
    'Un code court tiré d’un enregistrement scellé. Chacun peut vérifier un enregistrement avec, et il ne montre rien de son contenu.',
  'app.ask.term.proof': 'Preuve',
  'app.ask.def.proof':
    'Une étape sur Midnight qui montre une chose sur un enregistrement, par exemple que vous le détenez aujourd’hui, sans montrer l’enregistrement.',
  'app.ask.term.dating': 'Datation',
  'app.ask.def.dating':
    'Le code de preuve de votre enregistrement va sur Midnight dans un lot avec d’autres. La date du lot est la date à laquelle votre enregistrement existait.',
  'app.ask.term.license': 'Licence',
  'app.ask.def.license':
    'Un accord qui permet à quelqu’un d’utiliser votre génétique aux conditions dont vous êtes tous deux convenus. Midnight enregistre qu’il existe et qu’il est en vigueur ; les conditions restent entre vous.',
  'app.ask.term.royaltyReport': 'Rapport de redevances',
  'app.ask.def.royaltyReport':
    'Ce qu’un licencié envoie à chaque période selon les conditions : combien il a vendu ou cultivé, et ce que cela représente.',
  'app.ask.search.title': 'Vos enregistrements',
  'app.ask.search.label': 'Chercher dans vos enregistrements',
  'app.ask.search.hint': 'Recherche dans ce navigateur. Essayez un nom, une année, « plante » ou « animal ».',
  'app.ask.search.none': 'Aucun de vos enregistrements dans ce navigateur ne correspond à « {q} ».',
  'app.ask.search.found.one': '{count} résultat',
  'app.ask.search.found.other': '{count} résultats',
  'app.ask.search.more': 'et {n} de plus',
  'app.ask.batch.clonesTitle': 'Couper des boutures',
  'app.ask.batch.offspringTitle': 'Enregistrer une descendance',
  'app.ask.batch.clonesIntro':
    'Un nouvel enregistrement par bouture, chacun lié à la plante sur laquelle elle a été coupée.',
  'app.ask.batch.offspringIntro': 'Un nouvel enregistrement par jeune animal, chacun lié à son père et à sa mère.',
  'app.ask.batch.cutFrom': 'Coupées sur',
  'app.ask.batch.noPlants':
    'Enregistrez d’abord la plante : les boutures sont coupées sur l’un de vos enregistrements.',
  'app.ask.batch.noAnimals':
    'Enregistrez d’abord le père ou la mère : la descendance est liée à vos propres enregistrements.',
  'app.ask.batch.notListed': 'Aucun',
  'app.ask.batch.howManyClones': 'Combien de boutures',
  'app.ask.batch.howManyYoung': 'Combien de jeunes',
  'app.ask.batch.upTo': 'Jusqu’à {max}.',
  'app.ask.batch.baseName': 'Nom',
  'app.ask.batch.namedLike': 'Numérotés : « {example} », et ainsi de suite.',
  'app.ask.batch.cloneName': '{name} bouture',
  'app.ask.batch.youngName': '{name} descendant',
  'app.ask.batch.cutOn': 'Coupées le',
  'app.ask.batch.bornOn': 'Nés le',
  'app.ask.batch.willMake.one': '{count} nouvel enregistrement',
  'app.ask.batch.willMake.other': '{count} nouveaux enregistrements',
  'app.ask.batch.private':
    'Chaque enregistrement garde le nom de son parent verrouillé à l’intérieur. Personne d’autre ne voit le lien.',
  'app.ask.batch.offline':
    'Vous êtes hors ligne. Vous pouvez tout vérifier ici ; l’enregistrement demande une connexion.',
  'app.ask.batch.needsConnection': 'L’enregistrement demande une connexion. Votre sauvegarde passe d’abord.',
  'app.ask.batch.needParent': 'Choisissez la plante sur laquelle elles ont été coupées.',
  'app.ask.batch.needParents': 'Choisissez le père, la mère, ou les deux.',
  'app.ask.batch.needAll': 'Remplissez chaque champ ci-dessus.',
  'app.ask.batch.sealing': 'Scellement…',
  'app.ask.batch.backupTitle': 'Enregistrez d’abord votre sauvegarde',
  'app.ask.batch.saveThem.one': 'Enregistrer {count} enregistrement',
  'app.ask.batch.saveThem.other': 'Enregistrer {count} enregistrements',
  'app.ask.batch.savingTitle': 'Enregistrement',
  'app.ask.batch.saved.one': '{count} enregistrement sauvegardé',
  'app.ask.batch.saved.other': '{count} enregistrements sauvegardés',
  'app.ask.batch.chainTitle': 'Facultatif : rendre la filiation vérifiable sur Midnight',
  'app.ask.batch.chainText':
    'Cette partie est publique. Chaque enregistrement demande deux étapes : vous nommez son parent sur Midnight, puis le titulaire du parent confirme. Faites-le depuis la page de chaque enregistrement, sous « Family on Midnight ».',
  'app.ask.batch.chainOpen': 'Ouvrir le premier',
  'app.ask.batch.toRecords': 'Aller à vos enregistrements',
  'app.ask.batch.cutClones': 'Couper des boutures de celle-ci',
  'app.ask.batch.cutClonesHint': 'Un nouvel enregistrement par bouture, chacun lié à cette plante.',
  'app.ask.batch.recordOffspring': 'Enregistrer une descendance',
  'app.ask.batch.recordOffspringHint': 'Un nouvel enregistrement par jeune animal, chacun lié à celui-ci.',
  'app.ask.batch.already':
    'Certains sont des enregistrements que vous avez déjà. Changez le nom ou la date, puis réessayez.',
  'app.ask.batch.receivedNote':
    'Rien ici n’est rempli à partir d’un enregistrement que quelqu’un vous a envoyé : saisissez-le vous-même.',
} satisfies Partial<AppTranslation>;
