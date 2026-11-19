// L’application en français : les enregistrements sauvegardés chez VeilCore (../en/account.ts).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const account = {
  'app.account.use.faceId': 'Utiliser Face ID',
  'app.account.use.touchId': 'Utiliser Touch ID',
  'app.account.use.screenLock': 'Utiliser le verrouillage de l’écran',
  'app.account.use.windowsHello': 'Utiliser Windows Hello',
  'app.account.use.passkey': 'Utiliser une clé d’accès',

  'app.account.sheet.title': 'Gardez vos enregistrements en sécurité',
  'app.account.sheet.lead': 'Pour ne jamais les perdre, même si vous perdez cet appareil.',
  'app.account.sheet.how':
    'Vos enregistrements sont sauvegardés chez VeilCore, verrouillés pour que vous seul puissiez les ouvrir : VeilCore n’a pas la clé. Vos autres téléphones et ordinateurs sur le même compte Apple ou Google les ouvrent aussi. Les documents que vous gardez sur cet appareil seulement n’en font pas partie.',
  'app.account.sheet.usePhone':
    'Cet ordinateur ne peut pas déverrouiller une clé d’accès lui-même. Votre navigateur proposera « Utiliser un téléphone » : scannez le code avec votre téléphone.',
  'app.account.sheet.twice':
    'Votre appareil demande deux fois : une fois pour créer la clé d’accès, une fois pour vérifier qu’elle ouvre vos enregistrements.',
  'app.account.sheet.otherWays': 'Autres moyens',
  'app.account.sheet.file': 'Garder un fichier moi-même',
  'app.account.sheet.fileHint':
    'Un fichier que vous gardez vous-même, sur une clé USB ou dans un gestionnaire de mots de passe. Aussi dans les Réglages.',
  'app.account.sheet.notNow': 'Pas maintenant',
  'app.account.sheet.failed': 'Cela n’a pas marché : {why}',
  'app.account.saved.title': 'Sauvegardé.',
  'app.account.saved.text':
    'Vos enregistrements sont sauvegardés chez VeilCore. Les nouveaux se sauvegardent tout seuls.',
  'app.account.saved.bound':
    'Sauvegardé chez VeilCore, mais cette clé d’accès reste sur cet appareil seulement : si vous perdez l’appareil, elle disparaît aussi. Téléchargez une copie que vous gardez vous-même, par sécurité.',
  'app.account.saved.download': 'Télécharger une copie',
  'app.account.saved.done': 'Terminé',

  'app.account.line.none': '<b>Pas encore sauvegardé dans votre compte.</b>',
  'app.account.line.fix': 'Corriger',
  'app.account.line.older':
    '<b>Vos enregistrements sauvegardés ont besoin d’un Face ID pour continuer à se sauvegarder.</b>',
  'app.account.line.locked':
    '<b>La sauvegarde est en pause sur cet appareil.</b> Ouvrez vos enregistrements une fois pour continuer.',
  'app.account.line.continue': 'Continuer',
  'app.account.line.missing':
    '<b>Vos enregistrements sauvegardés chez VeilCore ne sont plus sur son serveur.</b> Sauvegardez-les à nouveau.',
  'app.account.line.saveAgain': 'Sauvegarder à nouveau',
  'app.account.line.slotMissing':
    '<b>Un moyen d’ouvrir vos enregistrements sauvegardés manque sur le serveur de VeilCore.</b> Configurez-le à nouveau.',
  'app.account.line.serverOlder':
    '<b>Le serveur de VeilCore montre une copie de vos enregistrements plus ancienne que celle que cet appareil a vue.</b> Rien n’a été modifié. Téléchargez une copie par sécurité.',
  'app.account.line.failing':
    '<b>La sauvegarde dans votre compte n’a pas marché.</b> {why} Elle sera réessayée toute seule.',
  'app.account.line.tryNow': 'Réessayer maintenant',
  'app.account.line.bound':
    '<b>Sauvegardé chez VeilCore, mais seul cet appareil peut l’ouvrir.</b> Téléchargez une copie que vous gardez vous-même.',
  'app.account.line.download': 'Télécharger une copie',
  'app.account.line.deviceOnly.one':
    '<b>{count} document gardé sur cet appareil seulement n’est encore dans aucune copie téléchargée.</b>',
  'app.account.line.deviceOnly.other':
    '<b>{count} documents gardés sur cet appareil seulement ne sont encore dans aucune copie téléchargée.</b>',
  'app.account.line.stale':
    'Votre {device} n’a rien sauvegardé depuis le {date}. Si vous l’utilisez encore, ouvrez VeilCore dessus.',
  'app.account.line.gone': 'Il n’existe plus',
  'app.account.line.unknownSlot':
    '<b>Quelque chose que vous n’avez pas ajouté peut ouvrir vos enregistrements sauvegardés.</b>',
  'app.account.line.seeSettings': 'Voir les Réglages',

  'app.account.device.iphone': 'iPhone',
  'app.account.device.ipad': 'iPad',
  'app.account.device.android': 'téléphone Android',
  'app.account.device.mac': 'Mac',
  'app.account.device.windows': 'ordinateur Windows',
  'app.account.device.linux': 'ordinateur',
  'app.account.device.other': 'autre appareil',

  'app.account.restore.lead': 'Ouvrez vos enregistrements sur cet appareil.',
  'app.account.restore.sameAccount':
    'Le même compte Apple ou Google que sur votre autre téléphone ? Cela marche tout simplement.',
  'app.account.restore.usePhone':
    'Sur un ordinateur sans Face ID ? Choisissez « Utiliser un téléphone » dans la fenêtre qui s’ouvre, puis scannez le code avec votre téléphone.',
  'app.account.restore.oldName': 'Clé d’accès créée sur {host} auparavant ? Essayez-la ici',
  'app.account.restore.otherWays': 'Autres moyens',
  'app.account.restore.found':
    'Vos enregistrements sauvegardés chez VeilCore le {date} ont été trouvés. Les amener sur cet appareil ?',
  'app.account.restore.bring': 'Les amener ici',
  'app.account.restore.notThis': 'Pas celle-ci',
  'app.account.restore.welcome.one': 'Bon retour. {count} enregistrement est ici.',
  'app.account.restore.welcome.other': 'Bon retour. {count} enregistrements sont ici.',
  'app.account.restore.elsewhere.one':
    '{count} document est gardé seulement sur votre {device}, il n’est donc pas affiché ici. Ouvrez-le là-bas.',
  'app.account.restore.elsewhere.other':
    '{count} documents sont gardés seulement sur votre {device}, ils ne sont donc pas affichés ici. Ouvrez-les là-bas.',
  'app.account.restore.savedOn': 'D’après vos enregistrements sauvegardés chez VeilCore le {date}.',

  'app.settings.title': 'Réglages',
  'app.settings.link': 'Réglages',
  'app.settings.account.title': 'Sauvegardé chez VeilCore',
  'app.settings.account.on': 'Sauvegardé le {date}. Les nouveaux enregistrements se sauvegardent tout seuls.',
  'app.settings.account.bound': 'Sauvegardé le {date}, mais seul cet appareil peut l’ouvrir.',
  'app.settings.account.off':
    'Pas configuré. Sauvegardez vos enregistrements chez VeilCore pour les retrouver sur un nouveau téléphone.',
  'app.settings.account.why':
    'Les clés de vos enregistrements sont stockées verrouillées sur le serveur de VeilCore, et VeilCore n’a pas la clé pour les ouvrir. Vos enregistrements reviennent aussi de là : cela marche tant que VeilCore fonctionne. Une copie téléchargée marche sans VeilCore.',
  'app.settings.ways.title': 'Moyens de les ouvrir',
  'app.settings.ways.synced': 'Clé d’accès sur vos appareils du même compte Apple ou Google · ajoutée le {date}',
  'app.settings.ways.bound': 'Clé d’accès sur un seul appareil · ajoutée le {date}',
  'app.settings.ways.unknown.one':
    '{count} moyen que vous n’avez pas ajouté peut ouvrir vos enregistrements sauvegardés. Si ce n’est pas vous, arrêtez la sauvegarde chez VeilCore et configurez-la à nouveau.',
  'app.settings.ways.unknown.other':
    '{count} moyens que vous n’avez pas ajoutés peuvent ouvrir vos enregistrements sauvegardés. Si ce n’est pas vous, arrêtez la sauvegarde chez VeilCore et configurez-la à nouveau.',
  'app.settings.devices.title': 'Vos appareils',
  'app.settings.devices.line': '{device} · dernière sauvegarde le {date}',
  'app.settings.devices.here': '{device} (celui-ci) · dernière sauvegarde le {date}',
  'app.settings.stop': 'Arrêter la sauvegarde chez VeilCore',
  'app.settings.stopConfirm':
    'Supprimer vos enregistrements sauvegardés chez VeilCore ? Cet appareil les garde. Vos autres appareils arrêtent de sauvegarder. La clé d’accès reste dans les réglages de votre téléphone.',
  'app.settings.stopped': 'Supprimé. Vos enregistrements restent sur cet appareil.',
  'app.settings.file.title': 'Télécharger une copie',
  'app.settings.file.text':
    'Un fichier que vous gardez vous-même. Il marche sans VeilCore, et c’est le seul autre endroit où sont sauvegardés les documents que vous gardez sur cet appareil seulement.',
  'app.settings.file.button': 'Télécharger une copie',
} satisfies Partial<AppTranslation>;
