// French (vous). DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md). Terms as in ../../fr.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const importing = {
  'app.import.noRows':
    'Ce fichier n’a aucune ligne sous ses noms de colonnes. Une ligne doit nommer les colonnes, avec une ligne par plante en dessous.',
  'app.import.title': 'Datez toute votre collection',
  'app.import.intro':
    'Vous tenez déjà un tableur de vos plantes ou accessions ? Scellez chaque ligne comme son propre enregistrement en une seule fois, chacune avec un horodatage, comme si vous les aviez enregistrées une par une.',
  'app.import.fileKind':
    'Un fichier CSV ou Excel (.xlsx), première feuille seulement, avec une ligne qui nomme les colonnes (un titre au-dessus ne gêne pas). Jusqu’à {max} lignes à la fois.',
  'app.import.notKept':
    'Ce navigateur ne gardera rien après sa fermeture (fenêtre privée, ou données du site bloquées). La clé de chaque enregistrement reste dans ce navigateur jusqu’à ce que vous enregistriez votre copie de secours : ouvrez donc cette page dans une fenêtre normale.',
  'app.import.reading': 'Lecture de votre fichier…',
  'app.import.choose': 'Choisir un fichier',
  'app.import.normalWindow': 'Ouvrez cette page dans une fenêtre de navigateur normale pour l’utiliser.',
  'app.import.readHere':
    'Votre fichier est lu ici, dans ce navigateur, et n’est pas envoyé. Pour chaque ligne, seules les informations que vous choisissez à l’écran suivant sont conservées, les mêmes que pour l’enregistrement d’une plante. {server} les conserve verrouillées, le nom de la plante compris, et nous n’avons pas la clé. Seul un code de preuve est daté sur {dated}.',
  'app.import.testSite': 'Ceci est un site de test : les enregistrements faits ici sont des données de test.',
  'app.import.earlierStamps': 'Horodatages des clés des importations précédentes',
  'app.import.rowLine': 'Ligne {line} : {text}',
  'app.import.row': 'Ligne {line}',
  'app.import.end': '.',
  'app.import.notGiven': 'Non indiqué',
  'app.import.field.strainName': 'Nom de la plante ou de la lignée',
  'app.import.field.refId': 'Votre identifiant (numéro d’accession ou de lot)',
  'app.import.field.taxon': 'Espèce',
  'app.import.field.parents': 'Parents',
  'app.import.field.parents2': 'Second parent',
  'app.import.field.bredBy': 'Obtenu par',
  'app.import.field.dateCreated': 'Date (votre propre note)',
  'app.import.field.notes': 'Notes',
  'app.import.header.title': 'Quelle ligne contient les noms de colonnes ?',
  'app.import.header.intro':
    'Nous avons choisi la ligne qui ressemble aux noms de colonnes. Les lignes au-dessus, comme un titre, sont laissées de côté.',
  'app.import.header.label': 'Les noms de colonnes sont à la',
  'app.import.header.names': 'Noms de colonnes (ligne {line})',
  'app.import.header.firstAt': 'Première plante (ligne {line})',
  'app.import.header.first': 'Première plante',
  'app.import.header.noRows': 'Aucune ligne sous celle-ci.',
  'app.import.header.under.one': '{count} ligne sous les noms de colonnes',
  'app.import.header.under.other': '{count} lignes sous les noms de colonnes',
  'app.import.header.above.one': ' ; {count} ligne au-dessus est laissée de côté',
  'app.import.header.above.other': ' ; {count} lignes au-dessus sont laissées de côté',
  'app.import.header.next': 'Suivant : quelle colonne est laquelle',
  'app.import.header.pickHint': 'Choisissez une ligne avec des plantes en dessous.',
  'app.import.header.back': 'Choisir un autre fichier',
  'app.import.cols.title': 'Quelle colonne est laquelle ?',
  'app.import.cols.intro':
    'Nous avons deviné d’après les noms de colonnes. Vérifiez chacune. Seul le nom de la plante est nécessaire ; les colonnes que vous laissez de côté ne sont jamais envoyées. Le nom de la plante est verrouillé comme le reste : les liens de vérification de votre fichier de résultats le portent, donc toute personne à qui vous envoyez un lien le voit. Si les noms sont secrets, choisissez une colonne de noms de code.',
  'app.import.cols.example': 'Par exemple : {v}',
  'app.import.cols.twoParents': 'Deux parents dans une cellule, c’est possible, comme « Mère x Père ».',
  'app.import.cols.pick': 'Choisir une colonne',
  'app.import.cols.notInFile': 'Pas dans mon fichier',
  'app.import.cols.bredBy': 'Obtenu par, quand une ligne ne le dit pas',
  'app.import.cols.bredByHelp':
    'Votre nom ou votre entreprise, si vous les avez obtenues. Laissez vide si vous ne savez pas.',
  'app.import.cols.dates': 'Comment les dates sont-elles écrites ?',
  'app.import.cols.datesHelp':
    'Certaines dates, comme 03/04/2021, peuvent se lire des deux façons. Choisissez comment votre fichier les écrit, sinon elles sont gardées telles quelles.',
  'app.import.cols.auto': 'Garder telles quelles les dates ambiguës',
  'app.import.cols.mdy': 'Mois d’abord (03/14/2021)',
  'app.import.cols.dmy': 'Jour d’abord (14/03/2021)',
  'app.import.cols.next': 'Suivant : vérifier les lignes',
  'app.import.cols.pickHint': 'Choisissez la colonne avec le nom de la plante ou de la lignée.',
  'app.import.cols.back': 'Changer la ligne des noms de colonnes',
  'app.import.card.name': 'Plante ou lignée',
  'app.import.card.id': 'Votre identifiant',
  'app.import.card.date': 'Date (votre note)',
  'app.import.check.title': 'Est-ce bien cela ?',
  'app.import.check.ready.one': '{count} ligne prête à sceller',
  'app.import.check.ready.other': '{count} lignes prêtes à sceller',
  'app.import.check.already': ' · {n} scellées auparavant, laissées telles quelles',
  'app.import.check.problems': ' · {n} ne peuvent pas être scellées',
  'app.import.check.pickRow': 'Choisir la ligne',
  'app.import.check.headerRows.one':
    'La ligne {rows} ressemble à des noms de colonnes, pas à une plante : elle est donc laissée de côté. Si vos noms de colonnes sont dans cette ligne, choisissez-la comme ligne des noms de colonnes.',
  'app.import.check.headerRows.other':
    'Les lignes {rows} ressemblent à des noms de colonnes, pas à des plantes : elles sont donc laissées de côté. Si vos noms de colonnes sont dans l’une d’elles, choisissez-la comme ligne des noms de colonnes.',
  'app.import.check.firstRows.one': 'La première ligne, exactement telle qu’elle sera scellée',
  'app.import.check.firstRows.other': 'Les {count} premières lignes, exactement telles qu’elles seront scellées',
  'app.import.check.ambiguous.one':
    '{count} date peut se lire jour d’abord ou mois d’abord : elle est donc gardée telle quelle. Pour changer cela, revenez en arrière et choisissez comment votre fichier écrit les dates.',
  'app.import.check.ambiguous.other':
    '{count} dates peuvent se lire jour d’abord ou mois d’abord : elles sont donc gardées telles quelles. Pour changer cela, revenez en arrière et choisissez comment votre fichier écrit les dates.',
  'app.import.check.cantSeal.one': '{count} ligne ne peut pas être scellée',
  'app.import.check.cantSeal.other': '{count} lignes ne peuvent pas être scellées',
  'app.import.check.fixThem.one':
    'Elle est laissée de côté. Corrigez-la dans votre fichier et importez-le de nouveau plus tard : les lignes déjà scellées sont ignorées.',
  'app.import.check.fixThem.other':
    'Elles sont laissées de côté. Corrigez-les dans votre fichier et importez-le de nouveau plus tard : les lignes déjà scellées sont ignorées.',
  'app.import.check.more': 'Et {n} de plus. Le fichier de résultats les liste toutes.',
  'app.import.check.onceSealed':
    '<b>Une fois scellés, ils ne peuvent plus changer.</b> Vous pourrez ajouter des rapports et des corrections plus tard ; une correction est un nouvel enregistrement qui renvoie à l’ancien.',
  'app.import.check.savedOn':
    'Les informations ci-dessus sont conservées sur {server}, un enregistrement par ligne, verrouillées, les noms des plantes compris, et nous n’avons pas la clé. Les liens de vérification de votre fichier de résultats portent chaque nom, pour les personnes à qui vous les envoyez. Seul un code de preuve de chacun est daté sur {dated}. Un horodatage montre que les informations existaient à cette date ; il ne confirme pas qu’elles sont exactes.',
  'app.import.check.sealN.one': 'Sceller {count} enregistrement',
  'app.import.check.sealN.other': 'Sceller {count} enregistrements',
  'app.import.check.nothing': 'Rien à sceller',
  'app.import.check.everyRow': 'Chaque ligne est soit déjà scellée, soit impossible à sceller.',
  'app.import.check.back': 'Changer les colonnes',
  'app.import.seal.sealing': 'Scellement de vos enregistrements…',
  'app.import.seal.paused': 'Scellement en pause',
  'app.import.seal.pickUp': 'Reprendre là où vous vous êtes arrêté',
  'app.import.seal.toSeal.one': '{file} : {count} ligne à sceller.',
  'app.import.seal.toSeal.other': '{file} : {count} lignes à sceller.',
  'app.import.seal.aria': 'Scellement de vos enregistrements',
  'app.import.seal.of': '{done} scellés sur {total}',
  'app.import.seal.keepOpen': 'Gardez cette page ouverte.',
  'app.import.seal.kept':
    'Si elle se ferme, revenez sur cette page : elle reprend là où elle s’est arrêtée, et ne scelle jamais une ligne deux fois.',
  'app.import.seal.notKept':
    'Ce navigateur n’a pas pu garder la progression : si la page se ferme, choisissez de nouveau le même fichier. Les lignes déjà scellées sont ignorées.',
  'app.import.seal.carryOn': 'Continuer le scellement',
  'app.import.seal.stop': 'M’arrêter ici et terminer avec ce qui est scellé',
  'app.import.sum.sealed.one': '{count} enregistrement scellé',
  'app.import.sum.sealed.other': '{count} enregistrements scellés',
  'app.import.sum.nothingNew': 'Rien de nouveau scellé',
  'app.import.sum.before.one': '{count} ligne scellée auparavant, laissée telle quelle.',
  'app.import.sum.before.other': '{count} lignes scellées auparavant, laissées telles quelles.',
  'app.import.sum.notSealed.one': '{count} ligne non scellée :',
  'app.import.sum.notSealed.other': '{count} lignes non scellées :',
  'app.import.sum.waiting.one': '{count} ligne pas encore scellée. Importez de nouveau le fichier pour la sceller.',
  'app.import.sum.waiting.other':
    '{count} lignes pas encore scellées. Importez de nouveau le fichier pour les sceller.',
  'app.import.sum.stampsHere':
    'Vos enregistrements sont déjà scellés et seront datés par leur lot sur {dated} ; cela ne dépend pas des horodatages de leurs clés. La clé de chaque plante reçoit aussi son propre horodatage depuis ce navigateur, environ {perDay} par jour : les {n} en attente prennent donc environ {days}. Ils commencent après votre copie de secours.',
  'app.import.sum.byBatch':
    'Leur horodatage public arrive quand leur lot est daté sur {dated}. Vous n’avez rien à faire.',
  'app.import.sum.untilSaved':
    'Tant qu’elle n’est pas enregistrée et vérifiée, les clés des nouveaux enregistrements ne sont que dans ce navigateur.',
  'app.import.sum.noDna.one':
    '{count} de ces plantes n’a pas encore de rapport ADN : elle n’est donc pas liée à la plante elle-même. Pour en ajouter un, ouvrez la page de la plante et suivez « Obtenez un rapport ADN de cette plante » : envoyez un échantillon à un laboratoire avec un code laboratoire, ou enregistrez un rapport que vous avez déjà.',
  'app.import.sum.noDna.other':
    '{count} de ces plantes n’ont pas encore de rapport ADN : elles ne sont donc pas liées aux plantes elles-mêmes. Pour en ajouter un, ouvrez la page d’une plante et suivez « Obtenez un rapport ADN de cette plante » : envoyez un échantillon à un laboratoire avec un code laboratoire, ou enregistrez un rapport que vous avez déjà.',
  'app.import.days.one': '{count} jour',
  'app.import.days.other': '{count} jours',
  'app.import.stamps.heading': 'Horodatages des clés',
  'app.import.stamps.of': '{heading} : {stamped} sur {total}',
  'app.import.stamps.already':
    'Vos enregistrements sont déjà scellés et seront datés par leur lot sur {dated}. Cela ne dépend pas de ces horodatages de clés.',
  'app.import.stamps.each':
    'La clé de chaque plante reçoit aussi un horodatage depuis ce navigateur, pour que vous puissiez prouver plus tard que vous la détenez. Le service de frais gratuit en fait environ {perDay} par jour depuis chaque navigateur{queued}. Ils partent tant que cette page est ouverte. La page de chaque plante peut aussi faire son horodatage.',
  'app.import.stamps.queued': ' : les {n} en attente prennent donc environ {days}',
  'app.import.stamps.stamping': 'Horodatage de {name}…',
  'app.import.stamps.allDone': 'Tout est fait.',
  'app.import.stamps.goOn': 'Continuer',
  'app.import.stamps.saveIt': 'L’enregistrer',
  'app.import.stamps.newSince.one':
    '{count} horodatage de clé est arrivé après votre copie de secours. Enregistrez-en une nouvelle pour le garder.',
  'app.import.stamps.newSince.other':
    '{count} horodatages de clés sont arrivés après votre copie de secours. Enregistrez-en une nouvelle pour les garder.',
  'app.import.done.title': 'Votre collection est scellée',
  'app.import.done.new.one': '{count} nouvel enregistrement',
  'app.import.done.new.other': '{count} nouveaux enregistrements',
  'app.import.done.before': ', {n} scellés auparavant',
  'app.import.done.notSealed': ', {n} non scellés',
  'app.import.done.download': 'Télécharger les résultats (CSV)',
  'app.import.done.downloadText':
    'Vos lignes telles qu’elles étaient, chacune avec son identifiant d’enregistrement, son code de preuve et un lien que chacun peut ouvrir pour la vérifier. Créé ici ; rien n’est envoyé.',
  'app.import.done.csvDna': ' Sa colonne « DNA report » indique quels enregistrements n’en ont pas encore.',
  'app.import.done.byBatch':
    'Leur horodatage public arrive quand leur lot est daté sur {dated}. La page de chaque plante montre quand c’est fait. Vous n’avez rien à faire.',
  'app.import.done.dateStamp':
    'Un horodatage montre que les informations existaient à cette date. Il ne confirme pas qu’elles sont exactes.',
  'app.import.done.toPlants': 'Aller à vos plantes',
  'app.import.done.another': 'Importer un autre fichier',
} satisfies Partial<AppTranslation>;
