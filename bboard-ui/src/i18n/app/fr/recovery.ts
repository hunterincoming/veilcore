// L’app des enregistrements en français : la fiche de secours (../en/recovery.ts).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const recovery = {
  'app.recovery.err.length': 'Un code de secours a 28 caractères. Vérifiez que vous l’avez tapé en entier.',
  'app.recovery.err.typo': 'Ce code contient une erreur. Comparez chaque caractère avec votre fiche.',
  'app.recovery.err.wrong': 'Ce code n’ouvre aucun enregistrement sauvegardé. Comparez-le avec votre fiche.',
  'app.recovery.err.notThisSheet':
    'C’est le code d’une fiche plus ancienne. Tapez le code de la fiche que vous venez d’imprimer.',
  'app.recovery.err.needsSheet':
    'Votre clé d’accès ne peut pas ouvrir vos enregistrements sauvegardés ici. Tapez le code de votre fiche de secours pour la configurer à nouveau.',

  'app.recovery.prompt.title': 'Encore une chose : votre fiche de secours',
  'app.recovery.prompt.recommended': 'Recommandé',
  'app.recovery.prompt.text':
    'Si vous perdez un jour votre compte Apple ou Google, cette fiche est le seul moyen de revenir. VeilCore ne peut pas la récupérer pour vous.',
  'app.recovery.prompt.bound':
    'Seul cet appareil peut ouvrir vos enregistrements sauvegardés. Si vous le perdez, cette fiche est le seul moyen de revenir. VeilCore ne peut pas la récupérer pour vous.',
  'app.recovery.prompt.make': 'Imprimer ou enregistrer ma fiche de secours',
  'app.recovery.prompt.later': 'Plus tard',

  'app.recovery.title': 'Votre fiche de secours',
  'app.recovery.intro':
    'Elle porte un code qui ouvre vos enregistrements sauvegardés sur un nouvel appareil. Le code est créé sur cet appareil, et VeilCore ne le voit jamais.',
  'app.recovery.asking': 'Votre appareil demande une fois, pour ouvrir vos enregistrements et créer la fiche.',
  'app.recovery.haveOne': 'J’ai ma fiche : la vérifier',
  'app.recovery.onlyNow':
    'Ce code n’est affiché que maintenant. Imprimez la fiche, ou enregistrez-la en PDF, avant de continuer.',
  'app.recovery.print': 'Imprimer ou enregistrer en PDF',
  'app.recovery.next': 'Suite : la vérifier',
  'app.recovery.confirm.lead': 'Pour être sûr que votre fiche est juste, tapez le code en entier.',
  'app.recovery.confirm.label': 'Code de secours',
  'app.recovery.confirm.check': 'Vérifier',
  'app.recovery.confirm.skip': 'Passer pour l’instant',
  'app.recovery.confirm.back': 'Afficher le code à nouveau',
  'app.recovery.done.title': 'Votre fiche de secours fonctionne.',
  'app.recovery.done.text': 'Gardez-la avec vos papiers importants. Une fiche plus ancienne ne fonctionne plus.',
  'app.recovery.done.ok': 'Terminé',
  'app.recovery.close': 'Fermer',
  'app.recovery.failed': 'Cela n’a pas fonctionné : {why}',

  'app.recovery.sheet.title': 'Fiche de secours VeilCore',
  'app.recovery.sheet.keep':
    'Gardez-la avec votre livre généalogique ou vos autres papiers importants. Ne la photographiez pas et ne l’envoyez pas par e-mail.',
  'app.recovery.sheet.codeLabel': 'Code de secours',
  'app.recovery.sheet.made': 'Créée le {date}.',
  'app.recovery.sheet.passkey':
    'La clé d’accès qui ouvre les mêmes enregistrements s’appelle « VeilCore: unlocks your records · {tag} » dans vos mots de passe.',
  'app.recovery.sheet.how':
    'Pour récupérer vos enregistrements : allez sur {site}, touchez « Récupérer mes enregistrements », choisissez « Utiliser ma fiche de secours » et tapez le code.',
  'app.recovery.sheet.phishing':
    'VeilCore ne demande ce code que lorsque vous restaurez sur un nouvel appareil sur {site}. Ne le tapez jamais ailleurs, et ne le donnez à personne, pas même à VeilCore.',
  'app.recovery.sheet.anyone':
    'Toute personne qui a ce code peut ouvrir vos enregistrements. VeilCore ne le garde pas et ne peut pas vous le redonner.',
  'app.recovery.sheet.newer': 'Si vous créez une fiche plus récente, celle-ci ne fonctionne plus.',

  'app.recovery.restore.use': 'Utiliser ma fiche de secours',
  'app.recovery.restore.lead':
    'Tapez le code de votre fiche de secours. Les tirets et les espaces n’ont pas d’importance.',
  'app.recovery.restore.open': 'Ouvrir mes enregistrements',
  'app.recovery.restore.addTitle': 'Les ouvrir sans la fiche la prochaine fois',
  'app.recovery.restore.addText':
    'Configurez une clé d’accès sur cet appareil : il continue de sauvegarder et ouvre vos enregistrements sans la fiche.',
  'app.recovery.restore.added': 'C’est fait. Cet appareil ouvre maintenant vos enregistrements sauvegardés tout seul.',

  'app.settings.ways.sheet': 'Fiche de secours · créée le {date}',
  'app.settings.ways.sheetChecked': 'Vérifiée le {date}.',
  'app.settings.ways.sheetUnchecked': 'Pas encore vérifiée : tapez son code pour la vérifier.',
  'app.settings.sheet.why':
    'Une fiche de secours ouvre vos enregistrements sauvegardés sur un nouvel appareil si vous perdez votre compte Apple ou Google, ou le seul appareil où se trouve votre clé d’accès.',
  'app.settings.sheet.make': 'Créer une fiche de secours',
  'app.settings.sheet.makeNew': 'Créer une nouvelle fiche de secours',
  'app.settings.sheet.check': 'Vérifier ma fiche de secours',
  'app.settings.faceId.here': 'Cet appareil a ouvert vos enregistrements avec la fiche de secours.',

  'app.account.line.makeSheet': 'Créer une fiche de secours',
  'app.account.line.later': 'Plus tard',
  'app.account.line.reminder':
    '<b>Créez une fiche de secours :</b> votre moyen de revenir si vous perdez un jour votre compte Apple ou Google.',
  'app.account.line.reverify':
    'Cela fait un moment. Vérifiez que votre clé d’accès ouvre toujours vos enregistrements sauvegardés.',
  'app.account.line.check': 'Vérifier',

  'app.account.sheet.setUpAgain': 'La configurer à nouveau',
} satisfies Partial<AppTranslation>;
