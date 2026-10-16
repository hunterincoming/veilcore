// French (vous). DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md). Terms as in ../../fr.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const backup = {
  'app.backup.title': 'Enregistrez votre copie de secours',
  'app.backup.done': 'Terminé',
  'app.backup.shareTitle': 'Copie de secours VeilCore',
  'app.backup.onlyWay':
    '<b>Ce fichier est le seul moyen de prouver que vous détenez vos plantes</b>, et de les récupérer sur un nouveau téléphone ou ordinateur. VeilCore ne peut ni le récupérer ni en refaire un.',
  'app.backup.saveIt': 'L’enregistrer',
  'app.backup.saved': 'Enregistrée',
  'app.backup.savedSub': '{file} · un seul fichier pour tout',
  'app.backup.saveFile': 'Enregistrer le fichier de secours',
  'app.backup.copyTitle': 'En mettre une copie ailleurs',
  'app.backup.wayBack':
    'Si ce téléphone ou cet ordinateur tombe en panne, cette copie vous permettra de tout récupérer.',
  'app.backup.actAsYou':
    'Ce fichier permet à quiconque l’a d’agir en votre nom. Gardez-le dans un endroit que vous seul pouvez ouvrir.',
  'app.backup.sentCopy': 'Copie envoyée ✓',
  'app.backup.sendCopy': 'Envoyer une copie (e-mail, Drive, Fichiers…)',
  'app.backup.shareFailed': 'Ce navigateur n’a pas pu ouvrir son menu de partage.',
  'app.backup.byHand':
    'Envoyez-le-vous par e-mail, ou mettez-le sur Google Drive, iCloud ou une clé USB. C’est le fichier que vous venez d’enregistrer, dans votre dossier Téléchargements.',
  'app.backup.checkTitle': 'Vérifier qu’elle fonctionne',
  'app.backup.itWorks': 'Elle fonctionne.',
  'app.backup.openIntro':
    'Ouvrez la copie que vous venez d’enregistrer. Nous vérifierons qu’elle s’ouvre et qu’elle contient tout. Rien n’est envoyé.',
  'app.backup.openCopy': 'Ouvrir ma copie enregistrée',
  'app.backup.saveFirst': 'Enregistrez d’abord le fichier de secours.',
  'app.backup.turnsOn': 'S’active une fois la vérification réussie.',
  'app.backup.restoreTitle': 'Récupérez vos plantes',
  'app.backup.restoreIntro':
    'Nouveau téléphone ou ordinateur, ou navigateur vidé ? Ouvrez le fichier de secours que vous avez enregistré.',
  'app.backup.plantsBack': 'Vos plantes sont de retour.',
  'app.backup.restored': 'Restauré.',
  'app.backup.nothingNew': 'Rien de nouveau dans ce fichier.',
  'app.backup.sentence': '{s} ',
  'app.backup.labSigBack': 'La signature de votre laboratoire est revenue aussi. ',
  'app.backup.workRestored': 'Restauré aussi : {work}. ',
  'app.backup.worksLikeBefore': 'Tout fonctionne comme avant.',
  'app.backup.nDeliveries.one': '{count} livraison à un laboratoire',
  'app.backup.nDeliveries.other': '{count} livraisons à des laboratoires',
  'app.backup.nCodes.one': '{count} code laboratoire',
  'app.backup.nCodes.other': '{count} codes laboratoire',
  'app.backup.and': '{a} et {b}',
  'app.backup.seeMyPlants': 'Voir mes plantes',
  'app.backup.lookIn':
    'Cherchez dans vos e-mails, dans Drive ou iCloud, ou sur votre clé USB. N’importe quel nom de fichier convient. Rien n’est envoyé.',
  'app.backup.openFile': 'Ouvrir mon fichier de secours',
  'app.backup.onlyKey': 'Vous n’avez que votre clé de détenteur (64 caractères) ?',
  'app.backup.keyLabel': 'Votre clé de détenteur (64 caractères)',
  'app.backup.useIt': 'L’utiliser',
  'app.backup.olderVersion':
    'Seulement si vous l’avez copiée depuis une ancienne version de ce site : elle n’est plus affichée nulle part. Elle rétablit vos enregistrements. Les clés d’horodatage d’une plante ne sont que dans le fichier de secours.',
  'app.backup.cantFind':
    '<b>Vous ne trouvez pas le fichier ?</b> Alors personne ne peut récupérer les plantes, pas même nous : nous n’avons jamais eu votre clé. C’est ce qui vous permet de prouver que vous les détenez. Si votre ancien appareil fonctionne encore, ouvrez-y VeilCore et enregistrez une nouvelle copie de secours.',
  'app.backup.holds.none': 'Vos enregistrements y sont.',
  'app.backup.holds.records.one': 'Votre enregistrement y est.',
  'app.backup.holds.records.other': 'Vos {count} enregistrements y sont tous.',
  'app.backup.holds.plants.one': 'Votre plante y est.',
  'app.backup.holds.plants.other': 'Vos {count} plantes y sont toutes.',
  'app.backup.restoredPlants.one': 'Clés de {count} plante restaurées.',
  'app.backup.restoredPlants.other': 'Clés de {count} plantes restaurées.',
  'app.backup.restoredRecords.one': 'Clés de {count} enregistrement restaurées ({plants}, {datings}).',
  'app.backup.restoredRecords.other': 'Clés de {count} enregistrements restaurées ({plants}, {datings}).',
  'app.backup.nPlants.one': '{count} plante',
  'app.backup.nPlants.other': '{count} plantes',
  'app.backup.nDatedReports.one': '{count} rapport de laboratoire daté',
  'app.backup.nDatedReports.other': '{count} rapports de laboratoire datés',
  'app.backup.err.notBackup':
    'Ce fichier n’est pas une copie de secours VeilCore. Choisissez le fichier que vous avez enregistré depuis VeilCore.',
  'app.backup.err.olderFile':
    'C’est un fichier plus ancien ou différent. Choisissez la copie de secours que vous venez d’enregistrer.',
  'app.backup.err.otherSet':
    'Cette copie de secours appartient à un autre ensemble d’enregistrements. Choisissez celle que vous venez d’enregistrer.',
  'app.backup.err.notNow':
    'Cette copie de secours ne contient pas vos enregistrements dans leur état actuel. Enregistrez-en une nouvelle et vérifiez-la.',
  'app.backup.err.noLabSignature':
    'Cette copie de secours ne contient pas la signature de votre laboratoire. Enregistrez-en une nouvelle et vérifiez-la.',
  'app.backup.err.noDeliveries':
    'Cette copie de secours ne contient pas vos dernières livraisons. Enregistrez-en une nouvelle et vérifiez-la.',
  'app.backup.err.differentKeys': 'Ce navigateur a déjà d’autres clés pour l’une de ces plantes. Rien n’a été modifié.',
  'app.backup.err.differentSet':
    'Ce navigateur utilise déjà un autre ensemble d’enregistrements. Rien n’a été modifié.',
  'app.backup.err.differentLab': 'Ce navigateur a déjà une autre signature de laboratoire. Rien n’a été modifié.',
  'app.backup.err.missingLatest.one':
    'Il manque à cette copie de secours l’état le plus récent de {count} de vos enregistrements. Enregistrez-en une nouvelle et vérifiez-la.',
  'app.backup.err.missingLatest.other':
    'Il manque à cette copie de secours l’état le plus récent de {count} de vos enregistrements. Enregistrez-en une nouvelle et vérifiez-la.',
} satisfies Partial<AppTranslation>;
