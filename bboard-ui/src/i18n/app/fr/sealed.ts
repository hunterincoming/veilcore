// French (vous). DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md). Terms as in ../../fr.ts; "locked" is verrouillé, as for lab
// reports.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const sealed = {
  'app.sealed.refuse.noKey':
    'ce navigateur n’a pas la clé de vos enregistrements, donc rien n’a été enregistré. Restaurez d’abord votre fichier de secours.',
  'app.sealed.refuse.mismatch': 'il ne correspond pas à son empreinte, donc il n’a pas été enregistré',
  'app.sealed.mismatch':
    'Cet enregistrement ne correspond pas à son empreinte : il a peut-être été modifié après avoir été scellé. Il ne sera plus enregistré, envoyé ni partagé.',
  'app.sealed.locked.title.one': '{count} enregistrement verrouillé',
  'app.sealed.locked.title.other': '{count} enregistrements verrouillés',
  'app.sealed.locked.pageTitle': 'Cet enregistrement est verrouillé',
  'app.sealed.locked.text':
    'Ce navigateur n’a pas la clé de ces enregistrements. Restaurez le fichier de secours enregistré après le {date}. VeilCore ne peut pas les ouvrir pour vous.',
  'app.sealed.locked.textNoDate':
    'Ce navigateur n’a pas la clé de ces enregistrements. Restaurez votre fichier de secours le plus récent. VeilCore ne peut pas les ouvrir pour vous.',
  'app.sealed.locked.cantChange':
    'Un enregistrement verrouillé ne peut être ni modifié ni envoyé. Vous pouvez le supprimer.',
  'app.sealed.locked.restore': 'Restaurer ma copie de secours',
  'app.sealed.locked.unnamed': 'Enregistrement sans nom',
  'app.sealed.locked.delete': 'Supprimer',
  'app.sealed.locked.deleteConfirm':
    'Supprimer {name} de VeilCore ? Il ne peut pas être ouvert dans ce navigateur, et une fois supprimé, personne ne pourra le récupérer.',
  'app.sealed.locked.deleted': 'Supprimé.',
  'app.sealed.locked.deleteFailed': 'Il n’a pas été supprimé : {error}',
  'app.sealed.lockedAgreements.title.one': '{count} contrat verrouillé',
  'app.sealed.lockedAgreements.title.other': '{count} contrats verrouillés',
  'app.sealed.lockedAgreements.text':
    'Ce navigateur n’a pas la clé de ces contrats (licences, envois à un laboratoire ou partages avec un sélectionneur). Restaurez votre dernier fichier de sauvegarde. VeilCore ne peut pas les ouvrir pour vous.',
  'app.sealed.lockedAgreements.cantChange':
    'Un contrat verrouillé ne peut être ni modifié ni envoyé. Vous pouvez le supprimer.',
  'app.sealed.lockedAgreements.name': 'Contrat verrouillé',
  'app.sealed.lockedAgreements.deleteConfirm':
    'Supprimer le contrat {id} de VeilCore ? Il ne peut pas être ouvert dans ce navigateur, et une fois supprimé, personne ne peut le récupérer.',
  'app.sealed.truncated':
    'VeilCore n’a envoyé qu’une partie de vos enregistrements, donc certains peuvent manquer ici. Rechargez la page pour réessayer.',
  'app.sealed.unreadable.one':
    '{count} enregistrement est revenu sous une forme que cette version ne sait pas lire ; il n’est donc pas affiché.',
  'app.sealed.unreadable.other':
    '{count} enregistrements sont revenus sous une forme que cette version ne sait pas lire ; ils ne sont donc pas affichés.',
  'app.sealed.backupNeeded':
    '<b>Enregistrez une nouvelle copie de secours.</b> Vos enregistrements sont maintenant verrouillés avec une clé que ce navigateur est le seul à avoir, tant que vous n’avez pas enregistré de copie de secours. Sans le fichier de secours, vous ne pourrez les ouvrir nulle part ailleurs.',
  'app.sealed.err.newCode':
    'Ce code a été créé avant que les livraisons soient verrouillées, et il ne fonctionne plus. Demandez un nouveau code à l’expéditeur.',
  'app.sealed.recv.missingKey':
    'Il manque la dernière partie de ce code. Vous pouvez quand même recevoir la livraison, mais les informations de l’expéditeur (qui l’a obtenue, et quand) ne viendront pas avec. Demandez d’abord le code complet.',
  'app.sealed.recv.notOpened':
    'Les informations de l’expéditeur n’ont pas pu être ouvertes avec ce code ; seul le nom est donc arrivé.',
  'app.sealed.backup.noVaultKey':
    'Cette copie de secours ne contient pas la clé qui ouvre vos enregistrements. Enregistrez-en une nouvelle et vérifiez-la.',
  'app.sealed.backup.differentVault':
    'Ce navigateur ouvre déjà vos enregistrements avec une autre clé. Rien n’a été modifié.',
  'app.sealed.backup.olderFile':
    'Ce fichier date d’avant le verrouillage des enregistrements, il ne contient donc pas leur clé. Les enregistrements verrouillés depuis restent verrouillés jusqu’à ce que vous ouvriez un fichier de secours plus récent.',
  'app.sealed.refuse.backupFirst':
    'il a été enregistré avant le verrouillage des enregistrements. Enregistrez d’abord une copie de secours et vérifiez-la ; ses modifications pourront ensuite être enregistrées',
  'app.sealed.refuse.tooLarge': 'il est trop volumineux pour être enregistré. Raccourcissez ses notes et réessayez',
  'app.sealed.refuse.unknown':
    'VeilCore n’a pas pu être joint pour vérifier vos enregistrements, donc rien n’a été enregistré. Réessayez dans un instant.',
  'app.sealed.refuse.cantStore':
    'ce navigateur ne peut pas garder la clé qui verrouille vos enregistrements (une fenêtre privée, ou des données de site bloquées), donc rien n’a été enregistré',
  'app.sealed.tooLarge':
    'Cet enregistrement est trop volumineux pour être enregistré. Raccourcissez ses notes et réessayez. Rien de ce que vous avez saisi n’a été perdu.',
  'app.sealed.size.near': '{used} Ko utilisés sur {max} Ko.',
  'app.sealed.size.over': 'Trop volumineux pour être enregistré. Raccourcissez les notes.',
  'app.sealed.older.pageTitle': 'Une copie plus ancienne de cet enregistrement',
  'app.sealed.older':
    'Le serveur a envoyé une copie de cet enregistrement plus ancienne que celle que ce navigateur a enregistrée en dernier. Si c’est la copie voulue, utilisez-la ; sinon, supprimez-la.',
  'app.sealed.olderKept.one':
    'Le serveur a envoyé une copie plus ancienne de {count} enregistrement. Ce navigateur a gardé la copie plus récente et l’enregistre à nouveau.',
  'app.sealed.olderKept.other':
    'Le serveur a envoyé des copies plus anciennes de {count} enregistrements. Ce navigateur a gardé les copies plus récentes et les enregistre à nouveau.',
  'app.sealed.importLocked.one': ' {count} enregistrement verrouillé a été ignoré : ce navigateur n’a pas sa clé.',
  'app.sealed.importLocked.other':
    ' {count} enregistrements verrouillés ont été ignorés : ce navigateur n’a pas leur clé.',
  'app.sealed.backupBeforeLocking':
    '<b>Enregistrez une copie de secours.</b> Vos anciens enregistrements seront verrouillés dès qu’un fichier de secours contiendra la clé qui les ouvre. D’ici là, ils restent sur le serveur de VeilCore tels qu’ils ont été enregistrés, lisibles par VeilCore, et leurs modifications ne peuvent pas être enregistrées.',
  'app.sealed.cantStore':
    'Ce navigateur ne peut pas garder la clé qui verrouille vos enregistrements (une fenêtre privée, ou des données de site bloquées). Vos anciens enregistrements n’ont donc pas été verrouillés, et rien de nouveau ne peut être enregistré ici. Ouvrez VeilCore dans une fenêtre normale.',
  'app.sealed.lockedParents.one':
    '{count} enregistrement parent est verrouillé dans ce navigateur ; il est donc laissé de côté.',
  'app.sealed.lockedParents.other':
    '{count} enregistrements parents sont verrouillés dans ce navigateur ; ils sont donc laissés de côté.',
  'app.sealed.backup.cantCheck':
    'VeilCore n’a pas pu être joint pour vérifier quelle clé utilisent vos enregistrements, donc rien n’a été changé. Réessayez une fois en ligne.',
  'app.sealed.err.handleTag':
    'Cette page et le serveur de VeilCore ne correspondent pas. Rechargez la page et réessayez.',
  'app.sealed.recv.restoreFirst':
    'Ce navigateur n’a pas la clé de vos enregistrements, il ne peut donc pas enregistrer ce que vous recevez. Restaurez d’abord votre fichier de secours, puis utilisez le code.',
  'app.sealed.recv.cantCheck':
    'VeilCore n’a pas pu être joint pour vérifier vos enregistrements, donc rien n’a été reçu. Réessayez dans un instant.',
  'app.sealed.recv.cantStore':
    'Ce navigateur ne peut pas garder la clé qui verrouille vos enregistrements (une fenêtre privée, ou des données de site bloquées), donc rien n’a été reçu. Ouvrez VeilCore dans une fenêtre normale.',
  'app.sealed.recv.notFinished':
    'Il a été reçu, mais son enregistrement n’a pas été enregistré, donc rien n’a été signé : {error}. Utilisez « Terminer la réception » sur l’enregistrement pour réessayer.',
  'app.sealed.recv.failed': 'Un problème est survenu pendant la réception : {error}',
  'app.sealed.recv.notAccepted':
    'Cet enregistrement n’est pas encore enregistré chez VeilCore, il n’y a donc rien à signer. Terminez d’abord la réception.',
  'app.sealed.recv.finishTitle': 'Cette livraison n’est pas terminée',
  'app.sealed.recv.finishText':
    'Elle a été reçue, mais son enregistrement n’est pas encore enregistré. Vérifiez le code laboratoire ci-dessous (collez-le à nouveau s’il est vide), puis terminez.',
  'app.sealed.recv.finish': 'Terminer la réception',
  'app.sealed.recv.finishing': 'En cours…',
  'app.sealed.recv.noRecord': 'Cet enregistrement n’est pas dans ce navigateur.',
  'app.sealed.recv.otherCode': 'Ce code est celui d’une autre livraison.',
  'app.sealed.recv.offerMissing':
    'VeilCore n’a pas envoyé les informations verrouillées de l’expéditeur pour ce code, donc l’enregistrement n’a pas été terminé. Réessayez « Terminer la réception » sur l’enregistrement plus tard, ou demandez à l’expéditeur.',
  // Round 3: held saves, the lost-key path, older copies, grants listed before locking
  'app.sealed.agreementsBackupFirst':
    'Enregistrez d’abord une copie de secours et vérifiez-la. D’ici là, les contrats ne peuvent pas être créés ni modifiés ici.',
  'app.sealed.backup.storageRefused':
    'Ce navigateur ne garde rien pour le moment (son stockage est plein, ou bloqué dans une fenêtre privée), donc rien n’a été changé. Libérez de l’espace ou utilisez une fenêtre normale, puis réessayez.',
  'app.sealed.backupFirstAction':
    'Enregistrez d’abord une copie de secours et vérifiez-la. Ensuite, vous pourrez le faire.',
  'app.sealed.correctBackupFirst':
    'Enregistrez d’abord une copie de secours et vérifiez-la. Ensuite, vous pourrez corriger cet enregistrement.',
  'app.sealed.correctionLeft':
    'La correction {id} n’a pas pu être retirée de VeilCore. Rechargez la page et vérifiez vos enregistrements.',
  'app.sealed.grantAsk.text':
    'Avant le verrouillage de vos enregistrements, cet enregistrement partageait : {keys}. Ce n’est plus partagé tant que vous ne le dites pas.',
  'app.sealed.grantAsk.yes': 'Partager de nouveau',
  'app.sealed.grantAsk.no': 'Ne pas partager',
  'app.sealed.grantAsk.failed': 'Ce n’a pas été enregistré : {error}',
  'app.sealed.grantDiffers.text':
    'Le serveur de VeilCore affiche pour cet enregistrement un choix de partage différent de celui gardé avec lui. Rien n’a été changé. Choisissez ce que voient les inconnus.',
  'app.sealed.grantDiffers.open': 'Choisir',
  'app.sealed.importNotImported.one':
    ' {count} enregistrement sur VeilCore est verrouillé ou vidé, et le fichier n’a pas pu le remettre, il n’a donc pas été importé.',
  'app.sealed.importNotImported.other':
    ' {count} enregistrements sur VeilCore sont verrouillés ou vidés, et le fichier n’a pas pu les remettre, ils n’ont donc pas été importés.',
  'app.sealed.lost.button': 'Je n’ai pas cette copie de secours',
  'app.sealed.lost.confirm':
    'Sans ce fichier de secours, personne ne peut ouvrir ces enregistrements et contrats verrouillés, pas même VeilCore. Tant qu’ils sont sur VeilCore, rien de nouveau ne peut être enregistré pour vous. Les supprimer de VeilCore et commencer une nouvelle clé ? C’est irréversible.',
  'app.sealed.lost.done':
    'Supprimés. Une nouvelle clé est prête : enregistrez une copie de secours et vérifiez-la, et vos nouveaux enregistrements seront enregistrés.',
  'app.sealed.lost.failed': 'Rien n’a été supprimé : {error}',
  'app.sealed.lost.nothing': 'rien ici n’est verrouillé avec une clé perdue',
  'app.sealed.older.use': 'Utiliser cette copie',
  'app.sealed.older.deleteConfirm':
    'Supprimer {name} de VeilCore ? Cette copie plus ancienne est la seule copie sur le serveur de VeilCore. Une fois supprimée, personne ne pourra la récupérer.',
  'app.sealed.recv.backupFirst':
    'Cet enregistrement a été enregistré avant le verrouillage des enregistrements. Enregistrez d’abord une copie de secours et vérifiez-la ; vous pourrez ensuite signer.',
  'app.sealed.recv.backupFirstClaim':
    'Enregistrez d’abord une copie de secours et vérifiez-la, puis utilisez le code. Rien n’a encore été reçu.',
  'app.sealed.recv.noAnswer':
    'VeilCore n’a pas répondu ({error}). Le code est gardé dans ce navigateur. Si la livraison a été reçue, elle apparaît dans vos enregistrements avec « Terminer la réception » ; sinon, réessayez.',
  'app.sealed.refuse.backupFirstNew':
    'rien n’a encore été enregistré. Enregistrez d’abord une copie de secours et vérifiez-la',
  'app.sealed.unsaved.backup':
    'Pas encore enregistré. Enregistrez votre copie de secours et vérifiez-la ; d’ici là, c’est gardé seulement dans ce navigateur.',
  'app.sealed.unsaved.key':
    'Pas encore enregistré. Ce navigateur n’a pas la clé de vos enregistrements sur VeilCore. Restaurez votre copie de secours ou, si vous ne l’avez pas, utilisez « Je n’ai pas cette copie de secours » sur la page de vos enregistrements.',
  'app.sealed.unsaved.retry':
    'Pas encore enregistré sur VeilCore. C’est gardé dans ce navigateur et renvoyé au prochain enregistrement.',
  'app.sealed.unsaved.short': 'Pas encore enregistré — enregistrez votre copie de secours',
  'app.sealed.unsaved.shortRetry': 'Pas encore enregistré',
  'app.sealed.unsaved.discardConfirm':
    'Abandonner ce que ce navigateur garde pour cet enregistrement ? Ce n’est pas sur VeilCore, donc impossible à récupérer.',
  'app.sealed.unsaved.discardNew': 'Le supprimer',
  'app.sealed.unsaved.discardChange': 'Annuler la modification',
  'app.sealed.sendNotSaved':
    'Cet enregistrement n’est pas encore enregistré sur VeilCore, il ne peut donc pas être envoyé. Enregistrez d’abord une copie de secours et vérifiez-la.',
} satisfies Partial<AppTranslation>;
