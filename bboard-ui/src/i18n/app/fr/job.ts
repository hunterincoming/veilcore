// L’app des enregistrements en français : « Faites-le pour moi » dans Demander à VeilCore (../en/job.ts).
// « Valider » pour approuver ; « concéder sous licence », jamais « licencier » (qui veut dire
// renvoyer quelqu’un) ; « enregistrer » plutôt que « sauvegarder », réservé à la sauvegarde
// (users' review, 8 Nov 2026).
// DRAFT: machine-assisted, to be checked by a fluent speaker before publishing (docs/translations/README.md).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const job = {
  'app.job.mode': 'Faites-le pour moi',
  'app.job.modeHelp':
    'Je prépare tout sur cet appareil et vous montre un seul résultat. Rien n’est envoyé avant que vous validiez.',
  'app.job.can': 'Faites-le pour moi : je prépare une tâche entière, vous la validez une fois.',
  'app.job.working': 'Préparation en cours. Rien n’est envoyé avant que vous validiez.',
  'app.job.privacy':
    'La tâche est gardée sur cet appareil seulement, jamais dans une sauvegarde, et supprimée 7 jours après sa fin.',

  'app.job.understood': 'J’ai compris « {text} ».',
  'app.job.use': 'Utiliser « {text} »',
  'app.job.newRecord': 'Nouvel enregistrement',
  'app.job.suggest.ready': 'prépare {name} pour licence',
  'app.job.no.hint': 'Modifiez d’abord l’exemple, ou écrivez le vôtre : une tâche ne part que de ce que vous écrivez.',
  'app.job.no.negation':
    'Je ne traite pas les demandes à la forme négative. Dites seulement ce qu’il faut faire : par exemple « Daisy a vêlé aujourd’hui, boucle à suivre ».',
  'app.job.no.leftover': 'Je n’ai pas pu utiliser « {words} ».',
  'app.job.no.tooMany': 'C’est plus que je ne peux faire d’un coup. Demandez une seule chose.',
  'app.job.no.oneJob': 'Je fais une tâche à la fois. Demandez la première.',
  'app.job.no.partB': 'Je ne peux pas encore établir la licence. Je peux faire la première partie maintenant.',
  'app.job.no.money': 'Je n’envoie ni ne promets d’argent. Les rapports de redevances sont dans « À échéance ».',
  'app.job.no.notJob':
    'Les preuves, transferts, corrections et suppressions se font sur la page de l’enregistrement lui-même.',
  'app.job.no.stampAll':
    'Je n’horodate qu’un enregistrement que vous allez concéder sous licence. Écrivez « prépare », son nom, puis « pour licence ».',
  'app.job.no.received': 'Cet enregistrement vient de quelqu’un d’autre : je ne l’utilise donc pas ici.',
  'app.job.no.noRecord': 'Nommez l’un de vos enregistrements : la plante prélevée, ou la mère ou le père.',
  'app.job.no.notFound': 'Je ne trouve pas « {words} » dans vos enregistrements. Ajoutez-le d’abord, puis redemandez.',
  'app.job.no.twoRecords':
    'Deux de vos enregistrements s’appellent « {words} ». Renommez-en un, ou partez de la page de l’enregistrement.',
  'app.job.no.wrongKind':
    'Cet enregistrement n’est pas du bon type : les boutures viennent d’une plante, les petits d’animaux.',
  'app.job.no.count':
    'Dites combien, une fois : par exemple « 12 boutures ». Un identifiant vaut pour un animal : pour plusieurs, collez leurs identifiants à l’écran suivant.',
  'app.job.no.sexCount': 'Les nombres ne correspondent pas. Dites combien en tout, et combien de chaque.',
  'app.job.no.unknown': 'Je ne peux pas faire « {words} » dans une tâche. Le plus proche :',
  'app.job.no.vault': 'Ouvrez d’abord VeilCore une fois avec une connexion.',
  'app.job.no.paused': 'Aucune tâche n’est préparée sur cette page. Allez d’abord à vos enregistrements.',
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
  'app.job.no.whichDay': '« {words} » veut dire hier en français et « ici » en allemand. De quel jour parlez-vous ?',
  'app.job.no.notReady': 'Cette tâche n’attend plus votre validation.',
  'app.job.no.expired': 'Cette tâche a plus de 72 heures. Refaites la demande pour en créer une nouvelle.',
  'app.job.no.gone': 'Cette tâche n’est plus dans ce navigateur.',
  'app.job.no.unanswered': 'Il reste une réponse à donner avant de valider.',
  'app.job.open': 'Vérifier',

  'app.job.title': 'À vérifier : {what}',
  'app.job.what.clones.one': '{count} bouture de {name}',
  'app.job.what.clones.other': '{count} boutures de {name}',
  'app.job.what.offspring.one': '{count} petit de {name}',
  'app.job.what.offspring.other': '{count} petits de {name}',
  'app.job.what.import': 'votre collection depuis un fichier',
  'app.job.what.due.one': '{count} rapport à envoyer',
  'app.job.what.due.other': '{count} rapports à envoyer',
  'app.job.what.ready': 'préparer {name} pour une licence',
  'app.job.young.dog': 'chiot de {name}',
  'app.job.young.cattle': 'veau de {name}',
  'app.job.young.horse': 'poulain de {name}',
  'app.job.young.sheepGoat': 'agneau de {name}',
  'app.job.young.pig': 'porcelet de {name}',

  'app.job.answer.title': 'À vous de répondre',
  'app.job.answer.bredBy': 'Qui les a sélectionnés ?',
  'app.job.answer.taxon': 'De quelle espèce sont-ils ?',
  'app.job.answer.scheme': 'Quel genre d’identifiant est-ce ?',
  'app.job.answer.idsLater': 'Pas encore d’identifiants ? Laissez vide : l’accueil vous le rappellera.',
  'app.job.answer.file': 'Choisissez le fichier de votre collection (CSV ou Excel).',
  'app.job.answer.filePick': 'Choisir un fichier',
  'app.job.answer.use': 'Utiliser',
  'app.job.answer.backup':
    'Enregistrez votre sauvegarde et vérifiez-la : elle contient les clés de ce que crée cette tâche.',

  'app.job.made.title': 'Ce que j’ai préparé',
  'app.job.made.records.one': '{count} enregistrement, prêt ici et pas encore envoyé : {first}',
  'app.job.made.records.other': '{count} enregistrements, prêts ici et pas encore envoyés : de {first} à {last}',
  'app.job.made.cutFrom': 'Prélevées sur {name}, datées du {date}',
  'app.job.made.born': 'Nés le {date}',
  'app.job.made.dam': 'Mère : {name}',
  'app.job.made.sire': 'Père : {name}',
  'app.job.made.sireTyped': 'Père hors de VeilCore : {code}',
  'app.job.made.noSire': 'Père : non indiqué (à ajouter plus tard)',
  'app.job.made.semen': 'Code de semence : {code}',
  'app.job.made.sexes': 'Mâles : {m} · Femelles : {f}',
  'app.job.made.unstated': 'Sexe non précisé : {u}',
  'app.job.made.each': 'Un par un',
  'app.job.made.noId': 'pas encore d’identifiant',
  'app.job.made.tags': 'Étiquettes de plante de {first} à {last}',
  'app.job.made.lot': 'Lot : {lot}',
  'app.job.made.noIds.one': 'Pas encore d’identifiant pour {count} : l’accueil le demandera.',
  'app.job.made.noIds.other': 'Pas encore d’identifiants pour {count} : l’accueil les demandera.',
  'app.job.made.importReady.one': '{count} prêt',
  'app.job.made.importReady.other': '{count} prêts',
  'app.job.made.importFix.one':
    '{count} doit être corrigé (ligne {rows}) : corrigez-le dans le fichier et importez-le à nouveau.',
  'app.job.made.importFix.other':
    '{count} doivent être corrigés (lignes {rows}) : corrigez-les dans le fichier et importez-le à nouveau.',
  'app.job.made.expect': 'Vous avez dit {n} ; le fichier en a {m} prêts.',
  'app.job.made.file': 'Depuis {file}',
  'app.job.made.report': 'Rapport du {from} au {to}',
  'app.job.made.namedBy': '« {label} », nommé par l’autre partie',
  'app.job.made.stamp': 'Un horodatage sur Midnight pour {name}, nécessaire pour la licence',
  'app.job.made.stamped': '{name} a déjà son horodatage.',

  'app.job.approve.title': 'Quand vous validez',
  'app.job.approve.before': 'Avant de valider, « Abandonner » retire tout : rien n’a été envoyé.',
  'app.job.approve.permanent': 'Impossible à annuler',
  'app.job.approve.records.one':
    '{count} enregistrement créé et daté. C’est définitif : vous pourrez corriger une erreur, pas supprimer un enregistrement.',
  'app.job.approve.records.other':
    '{count} enregistrements créés et datés. C’est définitif : vous pourrez corriger une erreur, pas supprimer un enregistrement.',
  'app.job.approve.reports':
    'Un rapport envoyé ne peut pas être repris. S’il est faux, demandez au concédant de le marquer « Demander une correction », puis envoyez-en un corrigé.',
  'app.job.approve.stampToday':
    '{name} reçoit aujourd’hui un horodatage sur Midnight. Il est nécessaire pour accorder une licence. Jusqu’à 3 par jour sont gratuits.',
  'app.job.approve.stampTomorrow':
    'L’horodatage de {name} partira demain : les horodatages gratuits du jour semblent épuisés.',
  'app.job.approve.public': 'Ce qui devient public',
  'app.job.approve.publicStamp':
    'Public : un code qui prouve que cet enregistrement existait, et la date. Jamais le nom, la génétique ni les fichiers.',
  'app.job.approve.publicRecords':
    'Le code de preuve de chaque enregistrement va au serveur de VeilCore et est daté sur Midnight dans un lot. Les noms et détails partent verrouillés avec votre clé : le serveur ne peut pas les lire.',
  'app.job.approve.publicReports':
    'Rien de public : chaque rapport va au concédant, verrouillé, par le canal propre à votre accord.',
  'app.job.approve.offline': 'Pas de réseau ? Pas de souci. Ça part dès que vous êtes en ligne, avec VeilCore ouvert.',
  'app.job.approve.offlineRecords':
    'Pas de réseau ? Pas de souci. Ça part dès que vous êtes en ligne, avec VeilCore ouvert. Si ce n’est pas parti avant le {when}, je vous demanderai avant de l’envoyer.',
  'app.job.approve.offlineLater':
    'Pas de réseau ? Pas de souci. Ça part dès que vous êtes en ligne, avec VeilCore ouvert. Si ce n’est pas parti avant le {when}, rien n’est envoyé : redemandez-le-moi.',

  'app.job.backup.records.one':
    'Enregistrez d’abord votre sauvegarde. Sans elle, perdre ce téléphone, c’est perdre cet enregistrement.',
  'app.job.backup.records.other':
    'Enregistrez d’abord votre sauvegarde. Sans elle, perdre ce téléphone, c’est perdre ces {count} enregistrements.',
  'app.job.backup.ready':
    'Enregistrez d’abord votre sauvegarde. Un accord ne peut être enregistré tant qu’une sauvegarde vérifiée n’a pas sa clé.',
  'app.job.backup.done': 'Sauvegarde vérifiée.',
  'app.job.backup.finish': 'Revenir à la tâche',

  'app.job.btn.records.one': 'Valider : créer {count} enregistrement',
  'app.job.btn.records.other': 'Valider : créer {count} enregistrements',
  'app.job.btn.reports.one': 'Valider : envoyer {count} rapport, {total} dû au total',
  'app.job.btn.reports.other': 'Valider : envoyer {count} rapports, {total} dû au total',
  'app.job.btn.stamp': 'Valider : horodater {name}',
  'app.job.btn.ready': 'Valider',
  'app.job.btn.backup': 'Enregistrer la sauvegarde',
  'app.job.btn.change': 'Changer quelque chose',
  'app.job.btn.discard': 'Abandonner',
  'app.job.changeConfirm':
    'Cela ouvre le formulaire complet avec tout ce qui est ici. Cette tâche est abandonnée : rien n’a été envoyé.',
  'app.job.left.questions.one': 'Répondez à {count} question pour valider',
  'app.job.left.questions.other': 'Répondez à {count} questions pour valider',
  'app.job.left.backup': 'Enregistrez votre sauvegarde pour valider',
  'app.job.left.scroll': 'Lisez « Impossible à annuler » pour valider',
  'app.job.left.saving': 'Enregistrement de votre saisie…',
  'app.job.left.ready': 'Prêt à valider',
  'app.job.readOnly': 'Ouvrez-la depuis l’accueil pour la valider.',
  'app.job.discarded': 'Abandonnée. Rien n’a été envoyé.',

  'app.job.report.sales': 'Ventes du {from} au {to} ({currency})',
  'app.job.report.units': 'Unités du {from} au {to}',
  'app.job.report.offspring': 'Descendance, même période',
  'app.job.report.nothing': 'Rien à déclarer',
  'app.job.report.owed': '{amount} dû',
  'app.job.report.rate': '{rate} % de {currency} {base}',
  'app.job.report.topUp': 'Dont {amount} pour atteindre le minimum annuel',
  'app.job.report.due': 'À rendre le {date}',
  'app.job.report.overdue': 'À rendre le {date} · en retard',

  'app.job.progress.running': 'En cours',
  'app.job.progress.waiting': 'En attente d’envoi',
  'app.job.progress.approved': 'Validée',
  'app.job.progress.done': 'Terminé',
  'app.job.progress.stopped': 'Arrêtée',
  'app.job.progress.expired': 'Expirée : plus rien n’est envoyé',
  'app.job.progress.discarded': 'Abandonnée : rien n’a été envoyé',
  'app.job.step.records.one': 'Créer {count} enregistrement',
  'app.job.step.records.other': 'Créer {count} enregistrements',
  'app.job.step.report': 'Envoyer le rapport du {from} au {to}',
  'app.job.step.stamp': 'Horodater {name}',
  'app.job.state.todo': 'En attente',
  'app.job.state.running': 'Envoi…',
  'app.job.state.done': 'Terminé',
  'app.job.state.failed': 'Pas envoyé',
  'app.job.state.needsYou': 'Vous attend',
  'app.job.state.waiting': 'Nouvel essai {when}',
  'app.job.when.soon': 'dans {n} min ({time})',
  'app.job.when.at': 'à {time}',
  'app.job.when.on': 'le {date}',
  'app.job.wait.records.one':
    'Rien n’est perdu : votre enregistrement est gardé ici et part dès que vous êtes de nouveau en ligne.',
  'app.job.wait.records.other':
    'Rien n’est perdu : vos {count} enregistrements sont gardés ici et partent dès que vous êtes de nouveau en ligne.',
  'app.job.wait.cantCheck':
    'Rien n’est perdu : vos enregistrements sont gardés ici. Le serveur de VeilCore n’a pas pu dire lesquels il a déjà, donc rien n’a été renvoyé. Je redemanderai bientôt.',
  'app.job.wait.notNoted':
    'Rien n’est perdu : vos enregistrements sont gardés ici. Ce navigateur n’a pas pu noter lesquels le serveur de VeilCore a déjà, donc rien n’a été renvoyé. Je réessaierai bientôt.',
  'app.job.done.records.one': '{count} enregistrement créé.',
  'app.job.done.records.other': '{count} enregistrements créés.',
  'app.job.done.ids.one': 'L’accueil vous rappellera d’ajouter {count} identifiant.',
  'app.job.done.ids.other': 'L’accueil vous rappellera d’ajouter {count} identifiants.',
  'app.job.done.reports': 'Rapports envoyés. Le concédant répond sur la page de chaque accord.',
  'app.job.done.ready': '{name} : prêt pour une licence.',
  'app.job.done.already': 'Déjà là : rien de nouveau n’a été envoyé.',
  'app.job.needs.report':
    'Ce rapport est peut-être déjà parti. Ouvrez l’accord pour vérifier. Réessayer n’envoie rien deux fois : il vérifie d’abord.',
  'app.job.needs.stamp':
    'Cet horodatage est peut-être déjà parti. Ouvrez l’enregistrement : sa page vérifie Midnight, et vous pouvez réessayer de là.',
  'app.job.needs.lapsed':
    'Vous avez validé ceci il y a plus de 3 jours et ce n’est pas encore parti. Envoyez-le maintenant ou abandonnez-le : rien n’a été envoyé.',
  'app.job.needs.stuck':
    'Ceci s’est arrêté 30 jours après votre validation. Ouvrez vos enregistrements ou l’accord pour voir ce qui est passé.',
  'app.job.needs.stuckNone': 'Ceci s’est arrêté 30 jours après votre validation. Rien n’a été envoyé.',
  'app.job.needs.stuckRecords':
    'Le serveur de VeilCore n’a pas confirmé ces enregistrements depuis 30 jours. Ils sont toujours gardés ici. Certains y sont peut-être déjà : « Envoyer maintenant » vérifie d’abord et n’en envoie aucun deux fois.',
  'app.job.failed.amount':
    'Pas envoyé : le montant a changé depuis votre validation (un autre rapport ou paiement est arrivé). Il est maintenant de {amount}. Refaites la demande pour l’envoyer.',
  'app.job.sendNow': 'Envoyer maintenant',
  'app.job.why': 'Message reçu : {why}',
  'app.job.tryAgain': 'Réessayer',
  'app.job.openRecord': 'Ouvrir l’enregistrement',
  'app.job.openNew': 'Ouvrir les nouveaux enregistrements',
  'app.job.openAgreement': 'Ouvrir l’accord',
  'app.job.toRecords': 'Aller à vos enregistrements',

  'app.job.home.title': 'Faites-le pour moi',
  'app.job.home.check': 'À vérifier : {what}',
  'app.job.home.needs': 'Vous attend : {what}',
  'app.job.home.running': 'En cours : {what}',
  'app.job.home.ready': '{name} : prêt pour une licence',
  'app.job.home.tomorrow': '{name} : prêt demain',
  'app.job.home.ids.one': 'Petit de {dam} ({count}) : ajouter son identifiant',
  'app.job.home.ids.other': 'Portée de {dam} ({count}) : ajouter les identifiants',
  'app.job.home.open': 'Ouvrir',

  'app.job.ids.title.one': 'Ajouter un identifiant : petit de {dam}',
  'app.job.ids.title.other': 'Ajouter les identifiants : {count} petits de {dam}',
  'app.job.ids.permanent':
    'Chaque identifiant est enregistré comme correction : un nouvel enregistrement qui remplace l’ancien, lequel reste archivé. Impossible à annuler.',
  'app.job.ids.save.one': 'Enregistrer {count} identifiant',
  'app.job.ids.save.other': 'Enregistrer {count} identifiants',
  'app.job.ids.reason': 'Identifiant ajouté',
  'app.job.ids.already': 'déjà {id}',
  'app.job.ids.no.twice': '{id} est dans deux cases.',
  'app.job.ids.no.taken': '{id} est déjà l’identifiant de {name}.',
  'app.job.ids.no.elsewhere': '{id} est déjà l’identifiant de {name}, un autre de vos animaux.',
  'app.job.ids.gone': 'L’enregistrement de {name} n’est plus là. Fermez ceci et rouvrez-le.',
  'app.job.ids.keep': 'Continuer',
  'app.job.ids.discard': 'Abandonner',
  'app.job.ids.discardAsk': 'Abandonner les identifiants saisis ? Ils ne sont pas enregistrés.',
  'app.job.ids.use': 'Utiliser ces identifiants',
  'app.job.ids.paste.over':
    'Cela fait {n} lignes pour {count} cases à partir d’ici, donc ça ne correspond pas. Rien n’a été rempli. Copiez seulement les identifiants de ces petits, ou collez dans une case plus haut.',
  'app.job.ids.paste.startsAt':
    '« {id} » est déjà l’identifiant de {name}, donc cette colonne commence plus haut. Rien n’a été rempli. Copiez seulement les identifiants des petits qui n’en ont pas encore.',
  'app.job.ids.paste.comma':
    'La ligne {line} contient une virgule ou un point-virgule : un identifiant par ligne. Rien n’a été rempli.',
  'app.job.ids.no.comma': 'Un identifiant par case : celle-ci contient une virgule ou un point-virgule.',
  'app.job.wait.refused':
    'Rien n’est perdu : vos enregistrements sont gardés ici. Le serveur de VeilCore a refusé cet enregistrement, donc rien n’est encore enregistré. Je réessaierai.',
  'app.job.ids.help':
    'Saisissez ou scannez l’identifiant de chaque petit dans sa propre case. Entrée ou Tab d’un scanner passe à la case vide suivante. Vous pouvez aussi coller une colonne dans une case : elle remplit cette case et celles du dessous.',
  'app.job.ids.schemeNeeded': 'Indiquez à quelle numérotation appartiennent ces identifiants.',
  'app.job.ids.preview': 'Ce qui sera enregistré',
  'app.job.ids.previewNone': 'Rien pour l’instant : saisissez, scannez ou collez un identifiant dans une case.',
  'app.job.ids.pair': '{name} reçoit {id}',
  'app.job.ids.fix.one': 'Corrigez d’abord la case marquée en rouge.',
  'app.job.ids.fix.other': 'Corrigez d’abord les {count} cases marquées en rouge.',
  'app.job.ids.paste.columns':
    'C’est plus d’une colonne. Copiez seulement la colonne des identifiants et collez à nouveau. Rien n’a été rempli.',
  'app.job.ids.paste.header':
    '« {id} » ressemble à un en-tête de colonne, pas à un identifiant. Copiez les identifiants sans l’en-tête et collez à nouveau. Rien n’a été rempli.',
  'app.job.ids.paste.invisible':
    'La ligne {line} contient des caractères invisibles. Copiez à nouveau les identifiants ou saisissez-les. Rien n’a été rempli.',
  'app.job.ids.paste.stopped.one': 'Arrêté à {name} : il a déjà un identifiant, donc 1 ligne n’a pas été utilisée.',
  'app.job.ids.paste.stopped.other':
    'Arrêté à {name} : il a déjà un identifiant, donc {count} lignes n’ont pas été utilisées.',
  'app.job.ids.no.invisible':
    'Elle contient des caractères invisibles. Videz-la et saisissez ou scannez l’identifiant à nouveau.',
  'app.job.wait.noKey':
    'Vos enregistrements sont gardés ici, mais ce navigateur n’a pas la clé sous laquelle le serveur de VeilCore les connaît, donc rien n’a été renvoyé. Restaurez votre sauvegarde pour continuer.',
  'app.job.wait.full':
    'Rien n’est perdu : vos enregistrements sont gardés ici. Le stockage de cet appareil est plein, donc rien n’a été envoyé. Libérez un peu d’espace ; je réessaierai.',
  'app.job.wait.local':
    'Rien n’est perdu : vos enregistrements sont gardés ici. Ils n’ont pas pu être enregistrés depuis cette page pour l’instant, donc rien n’a été envoyé. Je réessaierai bientôt.',
} satisfies Partial<AppTranslation>;
