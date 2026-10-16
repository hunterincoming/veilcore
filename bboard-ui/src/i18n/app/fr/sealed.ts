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
  'app.sealed.truncated':
    'VeilCore n’a envoyé qu’une partie de vos enregistrements, donc certains peuvent manquer ici. Rechargez la page pour réessayer.',
  'app.sealed.unreadable.one':
    '{count} enregistrement est revenu sous une forme que cette version ne sait pas lire ; il n’est donc pas affiché.',
  'app.sealed.unreadable.other':
    '{count} enregistrements sont revenus sous une forme que cette version ne sait pas lire ; ils ne sont donc pas affichés.',
  'app.sealed.backupNeeded':
    '<b>Enregistrez une nouvelle copie de secours.</b> Vos enregistrements sont maintenant verrouillés avec une clé que seul ce navigateur possède. Sans le fichier de secours, vous ne pourrez les ouvrir nulle part ailleurs.',
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
} satisfies Partial<AppTranslation>;
