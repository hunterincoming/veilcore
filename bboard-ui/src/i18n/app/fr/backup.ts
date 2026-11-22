// French (vous). DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md). Terms as in ../../fr.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const backup = {
  'app.backup.title': 'Enregistrez votre sauvegarde',
  'app.backup.done': 'Terminé',
  'app.backup.shareTitle': 'Sauvegarde VeilCore',
  'app.backup.oneWay':
    '<b>Un fichier que vous gardez.</b> L’un des moyens de récupérer vos enregistrements, et il marche même sans VeilCore.',
  'app.backup.lock.text':
    'Sauvegarde vos enregistrements chez VeilCore, verrouillés pour que vous seul puissiez les ouvrir : VeilCore n’a pas la clé.',
  'app.backup.lock.orFile': 'Ou gardez vous-même un fichier',
  'app.backup.lock.savedTitle': 'Sauvegardé chez VeilCore.',
  'app.backup.lock.savedText':
    'Ces enregistrements reviennent sur un nouvel appareil avec votre clé d’accès. Les nouveaux se sauvegardent tout seuls. Un fichier à garder vous-même est dans les Réglages, si vous en voulez un aussi.',
  'app.backup.lock.saving': 'Sauvegarde chez VeilCore…',
  'app.backup.saveIt': 'L’enregistrer',
  'app.backup.saved': 'Enregistrée',
  'app.backup.savedSub': '{file} · un seul fichier pour tout',
  'app.backup.labKeyNotMade':
    'La clé de réception de votre laboratoire n’a pas pu être créée pour l’instant : ce fichier de sauvegarde ne la contient donc pas encore. Pour tout le reste, il est valable. Enregistrez-en un nouveau après l’arrivée de votre premier enregistrement.',
  'app.backup.saveFile': 'Enregistrer le fichier de sauvegarde',
  'app.backup.copyTitle': 'En mettre une copie ailleurs (recommandé)',
  'app.backup.wayBack':
    'Si ce téléphone ou cet ordinateur tombe en panne, cette copie vous permettra de tout récupérer.',
  'app.backup.safari':
    'Ce navigateur peut effacer les données d’un site après 7 jours sans visite. Votre fichier de sauvegarde est ce qui ramène vos enregistrements : gardez-le.',
  'app.backup.actAsYou':
    'Quiconque a ce fichier peut ouvrir vos enregistrements et agir en votre nom, sauf s’il a un mot de passe. Le mieux : une clé USB ou un gestionnaire de mots de passe. Gardez le mot de passe à part du fichier.',
  'app.backup.sentCopy': 'Copie envoyée ✓',
  'app.backup.sendCopy': 'Enregistrer une copie ailleurs (Fichiers, Drive…)',
  'app.backup.shareFailed': 'Ce navigateur n’a pas pu ouvrir son menu de partage.',
  'app.backup.byHand': 'C’est le fichier que vous venez d’enregistrer, dans votre dossier Téléchargements.',
  'app.backup.saveAgain': 'Enregistrer une autre copie',
  'app.backup.savedAgain': 'Autre copie enregistrée ✓',
  'app.backup.checkTitle': 'Vérifier qu’elle fonctionne',
  'app.backup.itWorks': 'Elle fonctionne.',
  'app.backup.openIntro':
    'Ouvrez la copie que vous venez d’enregistrer. Nous vérifierons qu’elle s’ouvre et qu’elle contient tout. Rien n’est envoyé.',
  'app.backup.openCopy': 'Ouvrir ma copie enregistrée',
  'app.backup.saveFirst': 'Enregistrez d’abord le fichier de sauvegarde.',
  'app.backup.turnsOn': 'S’active une fois la vérification réussie.',
  'app.backup.pw.add': 'Le verrouiller avec un mot de passe (conseillé)',
  'app.backup.pw.why':
    'Le fichier seul n’ouvre alors rien : qui l’a doit aussi avoir le mot de passe. Si vous l’oubliez, personne ne peut ouvrir le fichier, pas même nous.',
  'app.backup.pw.label': 'Mot de passe du fichier de sauvegarde',
  'app.backup.pw.again': 'Saisissez-le de nouveau',
  'app.backup.pw.short': 'Au moins {n} caractères.',
  'app.backup.pw.mismatch': 'Les deux ne correspondent pas.',
  'app.backup.pw.keep': 'Gardez-le dans un gestionnaire de mots de passe, ou noté, à part du fichier.',
  'app.backup.pw.locking': 'Verrouillage du fichier…',
  'app.backup.pw.savedSub': '{file} · un seul fichier pour tout, verrouillé par votre mot de passe',
  'app.backup.pw.needed': 'Cette sauvegarde a un mot de passe. Saisissez-le pour ouvrir le fichier.',
  'app.backup.pw.wrong': 'Ce mot de passe n’ouvre pas cette sauvegarde. Rien n’a été modifié.',
  'app.backup.pw.checkLabel': 'Le mot de passe de la sauvegarde',
  'app.backup.pw.open': 'L’ouvrir',
  'app.backup.restoreTitle': 'Récupérez vos enregistrements',
  'app.backup.restoreIntro':
    'Nouveau téléphone ou ordinateur, ou navigateur vidé ? Ouvrez le fichier de sauvegarde que vous avez enregistré.',
  'app.backup.ownOnly':
    'N’ouvrez qu’un fichier ou un code que vous avez enregistré vous-même. VeilCore ne vous en demandera ni ne vous en enverra jamais.',
  'app.backup.preview.one':
    'Cette sauvegarde a été faite le {date} et contient {count} enregistrement. L’ajouter ici ?',
  'app.backup.preview.other':
    'Cette sauvegarde a été faite le {date} et contient {count} enregistrements. Les ajouter ici ?',
  'app.backup.previewUndated.one': 'Cette sauvegarde contient {count} enregistrement. L’ajouter ici ?',
  'app.backup.previewUndated.other': 'Cette sauvegarde contient {count} enregistrements. Les ajouter ici ?',
  'app.backup.plantsBack': 'Vos enregistrements sont de retour.',
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
  'app.backup.seeMyPlants': 'Voir mes enregistrements',
  'app.backup.lookIn':
    'Cherchez sur votre clé USB, dans votre gestionnaire de mots de passe, vos e-mails ou votre cloud. Rien n’est envoyé.',
  'app.backup.openFile': 'Ouvrir mon fichier de sauvegarde',
  'app.backup.onlyKey': 'Vous n’avez que votre clé de détenteur (64 caractères) ?',
  'app.backup.keyLabel': 'Votre clé de détenteur (64 caractères)',
  'app.backup.useIt': 'L’utiliser',
  'app.backup.olderVersion':
    'Seulement si vous l’avez copiée depuis une ancienne version de ce site : elle n’est plus affichée nulle part. Elle retrouve vos enregistrements, mais ils restent verrouillés jusqu’à ce que vous ouvriez votre fichier de sauvegarde. Les clés d’horodatage d’un enregistrement ne sont, elles aussi, que dans ce fichier.',
  'app.backup.cantFind':
    '<b>Vous ne trouvez pas le fichier ?</b> Alors personne ne peut récupérer les enregistrements, pas même nous : nous n’avons jamais eu votre clé. C’est ce qui vous permet de prouver que vous les détenez. Si votre ancien appareil fonctionne encore, ouvrez-y VeilCore et enregistrez une nouvelle sauvegarde.',
  'app.backup.holds.none': 'Vos enregistrements y sont.',
  'app.backup.holds.records.one': 'Votre enregistrement y est.',
  'app.backup.holds.records.other': 'Vos {count} enregistrements y sont tous.',
  'app.backup.restoredPlants.one': 'Clés de {count} enregistrement restaurées.',
  'app.backup.restoredPlants.other': 'Clés de {count} enregistrements restaurées.',
  'app.backup.restoredRecords.one': 'Clés de {count} enregistrement restaurées ({plants}, {datings}).',
  'app.backup.restoredRecords.other': 'Clés de {count} enregistrements restaurées ({plants}, {datings}).',
  'app.backup.nPlants.one': '{count} plante',
  'app.backup.nPlants.other': '{count} plantes',
  'app.backup.nDatedReports.one': '{count} rapport de laboratoire daté',
  'app.backup.nDatedReports.other': '{count} rapports de laboratoire datés',
  'app.backup.err.notBackup':
    'Ce fichier n’est pas une sauvegarde VeilCore. Choisissez le fichier que vous avez enregistré depuis VeilCore.',
  'app.backup.err.olderFile':
    'C’est un fichier plus ancien ou différent. Choisissez la sauvegarde que vous venez d’enregistrer.',
  'app.backup.err.otherSet':
    'Cette sauvegarde appartient à un autre ensemble d’enregistrements. Choisissez celle que vous venez d’enregistrer.',
  'app.backup.err.notNow':
    'Cette sauvegarde ne contient pas vos enregistrements dans leur état actuel. Enregistrez-en une nouvelle et vérifiez-la.',
  'app.backup.err.noLabSignature':
    'Cette sauvegarde ne contient pas la signature de votre laboratoire. Enregistrez-en une nouvelle et vérifiez-la.',
  'app.backup.err.noLicenses':
    'Cette sauvegarde ne contient pas vos dernières licences. Enregistrez-en une nouvelle et vérifiez-la.',
  'app.backup.err.noLender':
    'Cette sauvegarde ne contient pas votre clé de prêteur ni vos dernières mentions de prêteur. Enregistrez-en une nouvelle et vérifiez-la.',
  'app.backup.err.noDeliveries':
    'Cette sauvegarde ne contient pas vos dernières livraisons. Enregistrez-en une nouvelle et vérifiez-la.',
  'app.backup.err.differentKeys':
    'Ce navigateur a déjà d’autres clés pour l’un de ces enregistrements. Rien n’a été modifié.',
  'app.backup.err.differentSet':
    'Ce navigateur utilise déjà un autre ensemble d’enregistrements. Rien n’a été modifié.',
  'app.backup.err.differentLab': 'Ce navigateur a déjà une autre signature de laboratoire. Rien n’a été modifié.',
  'app.backup.err.missingLatest.one':
    'Il manque à cette sauvegarde l’état le plus récent de {count} de vos enregistrements. Enregistrez-en une nouvelle et vérifiez-la.',
  'app.backup.err.missingLatest.other':
    'Il manque à cette sauvegarde l’état le plus récent de {count} de vos enregistrements. Enregistrez-en une nouvelle et vérifiez-la.',
  // A passkey, and records saved with VeilCore (veilcore/passkey-backup.ts, account-copy.ts).
  'app.backup.passkey.err.unsupported':
    'Ce téléphone ou ce navigateur ne peut pas créer de clé d’accès qui ouvre une sauvegarde. Utilisez le fichier de sauvegarde, ou essayez Safari sur un iPhone (iOS 18.4 ou plus récent) ou Chrome.',
  'app.backup.passkey.err.cancelled': 'Annulé. Rien n’a été modifié.',
  'app.backup.passkey.err.noCopy':
    'Aucun enregistrement sauvegardé chez VeilCore trouvé pour cette clé d’accès. Ouvrez plutôt votre fichier de sauvegarde.',
  'app.backup.passkey.err.unreachable':
    'Impossible de joindre le registre VeilCore. Vérifiez votre connexion et réessayez.',
  'app.backup.passkey.err.older':
    'Le registre a proposé une copie plus ancienne que celle que cet appareil connaît déjà. Rien n’a été modifié. Réessayez plus tard, et gardez votre fichier de sauvegarde.',
  'app.backup.passkey.err.damaged':
    'Cette copie ne s’est pas ouverte. Elle a peut-être été modifiée. Ouvrez plutôt votre fichier de sauvegarde.',
  // A partner's intake (flow/IntakePage.tsx, veilcore/intake.ts).
  'app.intake.stay': 'Pas maintenant, rester sur VeilCore',
  'app.intake.pickAgain': 'Choisir un enregistrement pour eux',
  'app.intake.oddHost':
    'Vérifiez bien cette adresse : {host} est un nombre, un nom codé ou comporte un port, ce n’est peut-être pas qui vous croyez.',
  'app.intake.err.notPicked':
    'Cet enregistrement n’a pas été choisi pour cette demande. Choisissez celui que vous voulez envoyer.',
  'app.intake.title': 'Enregistrer un échantillon pour {host}',
  'app.intake.intro':
    '<b>{host}</b> vous a demandé d’enregistrer cet échantillon avec VeilCore. Vous créez l’enregistrement ici, sur VeilCore, et il reste chez vous. À la fin, vous choisissez de leur envoyer ou non son identifiant, son code de preuve et son lien de vérification. Rien d’autre ne leur parvient.',
  'app.intake.ref': 'Leur référence, telle qu’ils l’ont écrite :',
  'app.intake.new': 'En enregistrer un nouveau',
  'app.intake.pick': 'Ou envoyer un enregistrement déjà fait',
  'app.intake.back': 'Revenir sur {host} sans rien envoyer',
  'app.intake.banner': 'Enregistrement pour {host}. À la fin, vous choisissez ce que vous leur envoyez.',
  'app.intake.send.title': 'Envoyer cet enregistrement à {host} ?',
  'app.intake.send.what':
    'Ils reçoivent l’identifiant {id} ({name}), son code de preuve et son lien de vérification, pour le vérifier sur VeilCore.',
  'app.intake.send.not':
    'Ils ne reçoivent ni vos détails, ni vos photos, ni votre rapport ADN, ni vos clés, ni votre sauvegarde.',
  'app.intake.send.button': 'Envoyer à {host}',
  'app.intake.send.opening': 'Ouverture de {id}…',
  'app.intake.send.kept': 'L’enregistrement reste dans votre VeilCore dans tous les cas.',
  'app.intake.err.title': 'Ce lien ne peut pas être utilisé',
  'app.intake.err.help': 'Demandez-en un nouveau à la personne qui l’a envoyé. Rien n’a été enregistré ni envoyé.',
  'app.intake.err.paste': 'Coller un code ou un lien',
  'app.intake.err.records': 'Aller à vos enregistrements',
  'app.intake.err.lab': 'Je suis un laboratoire : résultats de laboratoire',
  'app.intake.err.gone':
    'La demande de l’autre site n’est plus là (cet onglet a été fermé ou rouvert). Rouvrez leur lien.',
  'app.intake.err.noReturn': 'Il n’indique pas où vous renvoyer.',
  'app.intake.err.tooLong': 'Son adresse de retour est trop longue.',
  'app.intake.err.notUrl': 'Son adresse de retour n’est pas une adresse web.',
  'app.intake.err.notHttps': 'Son adresse de retour n’est pas sécurisée (https).',
  'app.intake.err.credentials': 'Son adresse de retour contient un nom d’utilisateur ou un mot de passe.',
  'app.intake.err.hasHash': 'Son adresse de retour a déjà une partie #.',
  'app.intake.err.badState': 'Sa valeur de sécurité (state) est absente ou invalide.',
  'app.backup.fromFileAdded': 'Enregistrements récupérés depuis le fichier lui-même : {n}.',
  'app.backup.fromFileProblem':
    'Les enregistrements du fichier n’ont pas pu être récupérés : {why} Vos clés sont restaurées.',
  'app.backup.passkey.err.busy': 'Votre autre appareil a sauvegardé au même moment. Cela sera réessayé tout seul.',
} satisfies Partial<AppTranslation>;
