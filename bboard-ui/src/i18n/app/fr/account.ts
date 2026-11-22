// L’application en français : les enregistrements sauvegardés chez VeilCore (../en/account.ts).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const account = {
  'app.account.use.deviceLock': 'Le verrouillage de cet appareil',
  'app.account.use.passkey': 'Utiliser une clé d’accès',
  'app.account.deviceLock.hint': 'Le code, le visage ou le doigt avec lequel vous déverrouillez votre téléphone.',
  'app.account.deviceLock.hintComputer':
    'Le mot de passe, le code PIN, le visage ou le doigt avec lequel vous déverrouillez votre ordinateur.',

  'app.account.sheet.title': 'Gardez vos enregistrements en sécurité',
  'app.account.sheet.lead': 'Pour pouvoir les récupérer, même si vous perdez cet appareil.',
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
    'Seul cet appareil peut ouvrir vos enregistrements sauvegardés : s’il est perdu, remplacé ou réinitialisé, il vous faudra votre fiche de secours.',
  'app.account.saved.download': 'Télécharger une copie',
  'app.account.saved.done': 'Terminé',

  'app.account.line.none': '<b>Pas encore sauvegardé dans votre compte.</b>',
  'app.account.line.fix': 'Corriger',
  'app.account.line.older':
    '<b>Déverrouillez une fois vos enregistrements sauvegardés pour continuer à sauvegarder.</b>',
  'app.account.line.locked':
    '<b>La sauvegarde est en pause sur cet appareil.</b> Ouvrez vos enregistrements une fois pour continuer.',
  'app.account.line.continue': 'Continuer',
  'app.account.line.missing':
    '<b>Vos enregistrements sauvegardés chez VeilCore ne sont plus sur son serveur.</b> Sauvegardez-les à nouveau.',
  'app.account.line.saveAgain': 'Sauvegarder à nouveau',
  'app.account.line.slotMissing':
    '<b>Un moyen d’ouvrir vos enregistrements sauvegardés manque ou a changé sur le serveur de VeilCore.</b> Configurez-le à nouveau.',
  'app.account.line.serverOlder':
    '<b>Quelque chose ne va pas sur le serveur de VeilCore.</b> Vos enregistrements sur cet appareil vont bien, et rien n’a été modifié. Téléchargez une copie par sécurité.',
  'app.account.line.failing':
    '<b>La sauvegarde dans votre compte n’a pas marché.</b> {why} Elle sera réessayée toute seule.',
  'app.account.line.tryNow': 'Réessayer maintenant',
  'app.account.line.bound':
    '<b>Seul cet appareil peut ouvrir vos enregistrements sauvegardés.</b> Créez une fiche de secours pour les récupérer si vous le perdez.',
  'app.account.line.download': 'Télécharger une copie',
  'app.account.line.deviceOnly.one':
    '<b>{count} document est seulement sur cet appareil.</b> Téléchargez une copie pour le garder en sécurité.',
  'app.account.line.deviceOnly.other':
    '<b>{count} documents sont seulement sur cet appareil.</b> Téléchargez une copie pour les garder en sécurité.',
  'app.account.line.stale':
    'Votre {device} n’a rien sauvegardé depuis le {date}. Si vous l’utilisez encore, ouvrez VeilCore dessus.',
  'app.account.line.gone': 'Retirer cet appareil',
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
  'app.account.restore.usePhone':
    'Sur un ordinateur qui ne peut pas déverrouiller une clé d’accès tout seul ? Choisissez « Utiliser un téléphone » dans la fenêtre qui s’ouvre, puis scannez le code avec votre téléphone.',
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
    'Vos enregistrements sont gardés verrouillés sur le serveur de VeilCore, et vous seul pouvez les ouvrir. Ils reviennent de là : cela marche tant que VeilCore fonctionne. Une copie téléchargée marche sans VeilCore.',
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
    'Supprimer vos enregistrements sauvegardés chez VeilCore ? Cet appareil les garde. Vos autres appareils arrêtent de sauvegarder, et le premier qui sauvegarde à nouveau crée une nouvelle copie. Vos fiches de secours ne fonctionnent plus. La clé d’accès reste dans les réglages de votre téléphone.',
  'app.settings.stopped': 'Supprimé. Vos enregistrements restent sur cet appareil.',
  'app.settings.file.title': 'Télécharger une copie',
  'app.settings.file.text':
    'Un fichier que vous gardez vous-même. Il marche sans VeilCore, et c’est le seul autre endroit où sont sauvegardés les documents que vous gardez sur cet appareil seulement.',
  'app.settings.file.button': 'Télécharger une copie',
  'app.settings.devices.removeConfirm':
    'Retirer votre {device} de cette liste ? S’il sauvegarde à nouveau, il revient.',
  'app.account.line.healed':
    'Quelque chose n’allait pas sur le serveur de VeilCore. Votre copie la plus récente a été sauvegardée à nouveau, et rien n’a été perdu.',
  'app.account.line.ok': 'OK',
  'app.account.line.deletedHere.one':
    '<b>{count} enregistrement ici a été supprimé sur votre autre appareil.</b> Le garder ici ?',
  'app.account.line.deletedHere.other':
    '<b>{count} enregistrements ici ont été supprimés sur votre autre appareil.</b> Les garder ici ?',
  'app.account.line.keepThem': 'Garder',
  'app.account.restore.deleted.one':
    '{count} enregistrement a été supprimé sur vos autres appareils et ne sera pas amené ici.',
  'app.account.restore.deleted.other':
    '{count} enregistrements ont été supprimés sur vos autres appareils et ne seront pas amenés ici.',
  'app.account.restore.bringAnyway': 'Les amener quand même',
  'app.account.restore.adoptFailed':
    'Vos enregistrements sont ici, mais cet appareil n’a pas pu commencer à sauvegarder chez VeilCore : {why}',
  'app.account.restore.tryAgain': 'Réessayer',
  'app.account.restore.tryWww': 'Vous avez d’abord utilisé www.veilcore.org ? Ouvrez cette page là-bas.',
  'app.settings.ways.tag': 'Nommée « VeilCore: unlocks your records · {tag} » dans vos mots de passe',
  'app.settings.passkeyCheck':
    'Une clé d’accès ne marche pas sur un appareil ? <link>Vérifiez la prise en charge des clés d’accès par ce navigateur</link>.',
  'app.account.sheet.passkeyCheck':
    'Si cela se reproduit, <link>vérifiez la prise en charge des clés d’accès par ce navigateur</link>. La page montre ce que ce navigateur et cet appareil savent faire, et n’envoie rien.',
  // The way in, as a fragment after “with” (Home's first card, the live test on Windows).
  'app.account.how.deviceLock': 'le verrouillage de cet appareil',
  'app.account.how.passkey': 'une clé d’accès',
  'app.account.line.off':
    '<b>La sauvegarde chez VeilCore est désactivée.</b> Votre copie sauvegardée a été supprimée, peut-être avec « Arrêter la sauvegarde chez VeilCore » sur un autre appareil.',
} satisfies Partial<AppTranslation>;
