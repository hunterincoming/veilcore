// L’app des enregistrements en français : « Faites-le pour moi » dans Demander à VeilCore (../en/job.ts).
// DRAFT: machine-assisted, to be checked by a fluent speaker before publishing (docs/translations/README.md).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const job = {
  'app.job.mode': 'Faites-le pour moi',
  'app.job.modeHelp':
    'Je prépare tout sur cet appareil et vous montre un seul résultat. Rien n’est envoyé avant votre accord.',
  'app.job.working': 'Préparation en cours. Rien n’est envoyé avant votre accord.',
  'app.job.privacy':
    'La tâche est gardée sur cet appareil seulement, jamais dans une sauvegarde, et supprimée 7 jours après sa fin.',

  'app.job.no.hint': 'Modifiez d’abord l’exemple, ou écrivez le vôtre : une tâche ne part que de ce que vous écrivez.',
  'app.job.no.negation': 'Je n’agis pas sur une demande qui dit quoi ne pas faire. Dites seulement quoi faire.',
  'app.job.no.leftover': 'Je n’ai pas pu utiliser chaque mot : « {words} ». Dites-le plus simplement.',
  'app.job.no.tooMany': 'C’est plus que je ne peux faire d’un coup. Demandez une seule chose.',
  'app.job.no.oneJob': 'Je fais une tâche à la fois. Demandez la première.',
  'app.job.no.partB':
    'Accorder une licence ne fait pas encore partie de « Faites-le pour moi ». Ouvrez la page de l’enregistrement pour le faire.',
  'app.job.no.money': 'Je n’envoie ni ne promets d’argent. Les rapports de redevances sont dans « À échéance ».',
  'app.job.no.notJob':
    'Les preuves, transferts, corrections et suppressions se font sur la page de l’enregistrement lui-même.',
  'app.job.no.stampAll':
    'Je n’horodate qu’un enregistrement que vous allez licencier. Dites « prépare », son nom, puis « pour licence ».',
  'app.job.no.received': 'Cet enregistrement vient de quelqu’un d’autre : je ne l’utilise donc pas ici.',
  'app.job.no.noRecord':
    'Je n’ai pas trouvé cet enregistrement dans ce navigateur. Utilisez son nom tel qu’il est sur sa page.',
  'app.job.no.wrongKind':
    'Cet enregistrement n’est pas du bon type : les boutures viennent d’une plante, les petits d’animaux.',
  'app.job.no.count': 'Dites combien, une fois : par exemple « 12 boutures ».',
  'app.job.no.sexCount': 'Les nombres ne correspondent pas. Dites combien en tout, et combien de chaque.',
  'app.job.no.unknown': 'Je ne peux pas faire cela comme tâche. Le plus proche :',
  'app.job.no.vault': 'Ouvrez d’abord VeilCore une fois avec une connexion.',
  'app.job.no.records': 'Un enregistrement dont cette tâche a besoin n’est plus ici, ou n’a pas pu être scellé.',
  'app.job.no.already': 'Ce sont des enregistrements que vous avez déjà.',
  'app.job.no.nothingDue': 'Aucun rapport n’est dû sur vos accords pour l’instant.',
  'app.job.no.tooManyReports':
    '{n} rapports sont dus : plus que je n’en envoie d’un coup (5). Ouvrez chaque accord pour faire le rapport.',
  'app.job.no.offline':
    'Les derniers messages de vos accords ne se lisent pas sans connexion. Réessayez une fois en ligne.',
  'app.job.no.noChain': 'Ce site ne peut pas faire d’horodatage pour l’instant.',
  'app.job.no.noKey': 'La clé de cet enregistrement n’est pas dans ce navigateur. Restaurez d’abord votre sauvegarde.',
  'app.job.no.readyNow': 'Cet enregistrement est déjà prêt pour une licence.',
  'app.job.no.file': 'Ce fichier n’a pas pu être utilisé.',
  'app.job.no.changed': 'Cette tâche a changé dans un autre onglet. Vérifiez-la à nouveau.',
  'app.job.no.notReady': 'Cette tâche n’attend plus votre accord.',
  'app.job.no.expired': 'Cette tâche a plus de 72 heures. Redemandez pour en faire une nouvelle.',
  'app.job.no.gone': 'Cette tâche n’est plus dans ce navigateur.',
  'app.job.open': 'Vérifier',

  'app.job.title.clones.one': 'À vérifier : {count} bouture de {name}',
  'app.job.title.clones.other': 'À vérifier : {count} boutures de {name}',
  'app.job.title.offspring.one': 'À vérifier : {count} petit de {name}',
  'app.job.title.offspring.other': 'À vérifier : {count} petits de {name}',
  'app.job.title.import': 'À vérifier : votre collection depuis un fichier',
  'app.job.title.due.one': 'À vérifier : {count} rapport à envoyer',
  'app.job.title.due.other': 'À vérifier : {count} rapports à envoyer',
  'app.job.title.ready': 'À vérifier : préparer {name} pour une licence',

  'app.job.answer.title': 'Vous seul pouvez répondre',
  'app.job.answer.bredBy': 'Qui les a sélectionnés ?',
  'app.job.answer.taxon': 'De quelle espèce sont-ils ?',
  'app.job.answer.scheme': 'Quel genre d’identifiant est-ce ?',
  'app.job.answer.ids': 'Identifiants (facultatif) : collez une colonne, un par ligne, dans l’ordre',
  'app.job.answer.idsLater': 'Pas encore d’identifiants ? Laissez vide : l’accueil vous le rappellera.',
  'app.job.answer.idsCount': '{n} sur {count} collés.',
  'app.job.answer.file': 'Choisissez le fichier de votre collection (CSV ou Excel).',
  'app.job.answer.filePick': 'Choisir un fichier',
  'app.job.answer.use': 'Utiliser',
  'app.job.answer.backup': 'Enregistrez votre sauvegarde et vérifiez-la (plus bas).',

  'app.job.made.title': 'Ce que j’ai préparé',
  'app.job.made.records.one': '{count} enregistrement, scellé ici et non envoyé : {first}',
  'app.job.made.records.other': '{count} enregistrements, scellés ici et non envoyés : de {first} à {last}',
  'app.job.made.cutFrom': 'Prélevées sur {name}, datées d’aujourd’hui ({date})',
  'app.job.made.born': 'Nés aujourd’hui ({date})',
  'app.job.made.dam': 'Mère : {name}',
  'app.job.made.sire': 'Père : {name}',
  'app.job.made.sireTyped': 'Père hors de VeilCore : {code}',
  'app.job.made.sexes': '{m} mâles, {f} femelles, {u} non précisés',
  'app.job.made.tags': 'Étiquettes de plante de {first} à {last}',
  'app.job.made.ids': 'Identifiants : de {first} à {last}',
  'app.job.made.noIds.one': 'Pas encore d’identifiant pour {count} : l’accueil le demandera.',
  'app.job.made.noIds.other': 'Pas encore d’identifiants pour {count} : l’accueil les demandera.',
  'app.job.made.importReady.one': '{count} prêt',
  'app.job.made.importReady.other': '{count} prêts',
  'app.job.made.importFix.one':
    '{count} doit être corrigé (ligne {rows}) : corrigez-le dans le fichier et apportez-le à nouveau.',
  'app.job.made.importFix.other':
    '{count} doivent être corrigés (lignes {rows}) : corrigez-les dans le fichier et apportez-le à nouveau.',
  'app.job.made.expect': 'Vous avez dit {n} ; le fichier en a {m} prêts.',
  'app.job.made.file': 'Depuis {file}',
  'app.job.made.report': 'Rapport du {from} au {to}',
  'app.job.made.namedBy': '« {label} », nommé par l’autre partie',
  'app.job.made.stamp': 'Un horodatage sur Midnight pour la clé de {name}',
  'app.job.made.stamped': 'La clé de {name} est déjà horodatée.',

  'app.job.approve.title': 'Quand vous donnez votre accord',
  'app.job.approve.before': 'Avant votre accord, « Abandonner » retire tout : rien n’a été envoyé.',
  'app.job.approve.permanent': 'Impossible à annuler',
  'app.job.approve.records.one':
    '{count} enregistrement sauvegardé et daté. C’est définitif : vous pourrez corriger une erreur, pas supprimer un enregistrement.',
  'app.job.approve.records.other':
    '{count} enregistrements sauvegardés et datés. C’est définitif : vous pourrez corriger une erreur, pas supprimer un enregistrement.',
  'app.job.approve.reports':
    'Un rapport envoyé ne peut pas être repris. S’il est faux, demandez au concédant de le marquer « Demander une correction », puis envoyez-en un corrigé.',
  'app.job.approve.stampToday':
    '{name} reçoit aujourd’hui un horodatage sur Midnight. Il faut pour accorder une licence. Jusqu’à 3 par jour sont gratuits.',
  'app.job.approve.stampTomorrow':
    'L’horodatage de {name} part demain : ceux gratuits d’aujourd’hui semblent épuisés vu d’ici.',
  'app.job.approve.public': 'Ce qui devient public',
  'app.job.approve.publicRecords':
    'Le code de preuve de chaque enregistrement va au serveur de VeilCore et est daté sur Midnight dans un lot. Les noms et détails partent verrouillés avec votre clé : le serveur ne peut pas les lire.',
  'app.job.approve.publicReports':
    'Rien de public : chaque rapport va au concédant, verrouillé, par le canal propre à votre accord.',
  'app.job.approve.offline':
    'Pas de réseau ? Pas de souci. Je l’enverrai quand vous serez en ligne, avec VeilCore ouvert.',

  'app.job.backup.records.one':
    'Enregistrez d’abord votre sauvegarde. Sans elle, perdre ce téléphone, c’est perdre cet enregistrement.',
  'app.job.backup.records.other':
    'Enregistrez d’abord votre sauvegarde. Sans elle, perdre ce téléphone, c’est perdre ces {count} enregistrements.',
  'app.job.backup.ready':
    'Enregistrez d’abord votre sauvegarde. Un accord ne peut être enregistré tant qu’une sauvegarde vérifiée n’a pas sa clé.',
  'app.job.backup.done': 'Sauvegarde vérifiée.',
  'app.job.backup.finish': 'Revenir à la tâche',

  'app.job.btn.records.one': 'Accepter : sauvegarder {count} enregistrement',
  'app.job.btn.records.other': 'Accepter : sauvegarder {count} enregistrements',
  'app.job.btn.reports.one': 'Accepter : envoyer {count} rapport, {total} dû au total',
  'app.job.btn.reports.other': 'Accepter : envoyer {count} rapports, {total} dû au total',
  'app.job.btn.stamp': 'Accepter : horodater {name}',
  'app.job.btn.ready': 'Accepter',
  'app.job.btn.change': 'Changer quelque chose',
  'app.job.btn.discard': 'Abandonner',
  'app.job.left.questions.one': 'Répondez à {count} question pour accepter',
  'app.job.left.questions.other': 'Répondez à {count} questions pour accepter',
  'app.job.left.scroll': 'Lisez « Impossible à annuler » pour accepter',
  'app.job.left.ready': 'Prêt à accepter',
  'app.job.readOnly': 'Ouvrez-la depuis l’accueil pour l’accepter.',
  'app.job.discarded': 'Abandonnée. Rien n’a été envoyé.',

  'app.job.report.sales': 'Ventes du {from} au {to} ({currency})',
  'app.job.report.units': 'Unités du {from} au {to}',
  'app.job.report.offspring': 'Descendance, même période',
  'app.job.report.nothing': 'Rien à déclarer',
  'app.job.report.owed': '{amount} dû',
  'app.job.report.topUp': 'Un complément jusqu’au minimum annuel peut s’ajouter à l’envoi.',

  'app.job.progress.running': 'En cours',
  'app.job.progress.approved': 'Acceptée',
  'app.job.progress.done': 'Terminé',
  'app.job.progress.stopped': 'Arrêtée',
  'app.job.progress.expired': 'Expirée : plus rien n’est envoyé',
  'app.job.progress.discarded': 'Abandonnée : rien n’a été envoyé',
  'app.job.step.records.one': 'Sauvegarder {count} enregistrement',
  'app.job.step.records.other': 'Sauvegarder {count} enregistrements',
  'app.job.step.report': 'Envoyer le rapport du {from} au {to}',
  'app.job.step.stamp': 'Horodater {name}',
  'app.job.state.todo': 'En attente',
  'app.job.state.running': 'Envoi…',
  'app.job.state.done': 'Terminé',
  'app.job.state.failed': 'Refusé',
  'app.job.state.needsYou': 'Vous attend',
  'app.job.state.waiting': 'Nouvel essai {when}',
  'app.job.done.records.one': '{count} enregistrement sauvegardé.',
  'app.job.done.records.other': '{count} enregistrements sauvegardés.',
  'app.job.done.reports': 'Rapports envoyés. Le concédant répond sur la page de chaque accord.',
  'app.job.done.ready': '{name} : prêt pour une licence.',
  'app.job.done.already': 'Déjà là : rien de nouveau n’a été envoyé.',
  'app.job.needs.report':
    'Ce rapport est peut-être déjà parti. Ouvrez l’accord pour vérifier. Réessayer n’envoie rien deux fois : il vérifie d’abord.',
  'app.job.needs.stamp':
    'Cet horodatage est peut-être déjà parti. Ouvrez l’enregistrement pour vérifier avant de réessayer.',
  'app.job.why': 'Ce qu’il a dit : {why}',
  'app.job.tryAgain': 'Réessayer',
  'app.job.openRecord': 'Ouvrir l’enregistrement',
  'app.job.openAgreement': 'Ouvrir l’accord',
  'app.job.toRecords': 'Aller à vos enregistrements',

  'app.job.home.title': 'Tâches de Demander à VeilCore',
  'app.job.home.check': 'Une tâche est prête à vérifier.',
  'app.job.home.needs': 'Une tâche vous attend.',
  'app.job.home.running': 'Une tâche est en cours.',
  'app.job.home.ready': '{name} : prêt pour une licence',
  'app.job.home.tomorrow': '{name} : prêt demain',
  'app.job.home.ids.one': 'Ajouter {count} identifiant',
  'app.job.home.ids.other': 'Ajouter {count} identifiants',
  'app.job.home.open': 'Ouvrir',
} satisfies Partial<AppTranslation>;
