// French: the privacy policy (privacy-policy/en.ts is the source; docs/i18n-glossary.md for the terms).
// SPDX-License-Identifier: Apache-2.0
import type { PolicyStrings } from './index';

export const policyFr: PolicyStrings = {
  'm.pp.title': 'Politique de confidentialité',
  'm.pp.updated': 'Dernière mise à jour : {date}.',
  'm.pp.lede':
    'Cette politique couvre veilcore.org : le site, le serveur de VeilCore qui conserve les enregistrements (le registre) et le service qui paie pour vous les frais du réseau Midnight (le service de frais). Elle dit ce que nous conservons, ce qui est public, qui d’autre voit quoi, et ce que vous pouvez faire.',

  'm.pp.short.t': 'En bref',
  'm.pp.short.1':
    'Vos fichiers ADN, vos fichiers de rapports de laboratoire et vos photos ne quittent jamais votre appareil. Votre navigateur tire un code de chacun ; le fichier lui-même n’est jamais envoyé.',
  'm.pp.short.2':
    'Ce que vous saisissez dans un enregistrement est verrouillé dans votre navigateur avant d’être envoyé. Notre serveur le conserve verrouillé, et nous n’avons pas la clé.',
  'm.pp.short.3':
    'Notre serveur peut lire ce dont il a besoin pour fonctionner : l’identifiant d’un enregistrement, son code de preuve, quand il a été sauvegardé, et ce que vous choisissez de montrer. La liste complète est ci-dessous.',
  'm.pp.short.4':
    'Seuls des codes et ce que vous choisissez de prouver partent sur des réseaux publics (Midnight et, via OpenTimestamps, Bitcoin). Ce que vous avez saisi n’y part que si vous en prouvez un chiffre exactement. Une fois là, personne ne peut le supprimer, nous compris.',
  'm.pp.short.5':
    'Nous ne vendons pas vos données. Pas de publicité, pas de mesure d’audience ni de pistage, pas de cookies.',
  'm.pp.short.6':
    'Vous pouvez télécharger vos enregistrements et les supprimer. Pour tout le reste, écrivez à hunter@veilcore.org.',

  'm.pp.who.t': 'Qui nous sommes',
  'm.pp.who.p':
    'Les fondateurs de VeilCore exploitent ce site, le registre et le service de frais. Écrivez-nous à hunter@veilcore.org.',

  'm.pp.device.t': 'Ce qui reste sur votre appareil',
  'm.pp.col.what': 'Quoi',
  'm.pp.device.col': 'Ce qu’il en advient',
  'm.pp.device.files.t': 'Les rapports ADN, fichiers de rapports de laboratoire et photos que vous ajoutez',
  'm.pp.device.files.p':
    'Votre navigateur lit chacun pour en tirer son code (son SHA-256). Le fichier n’est jamais envoyé.',
  'm.pp.device.vault.t': 'La clé qui verrouille vos enregistrements',
  'm.pp.device.vault.p':
    'Gardée dans votre navigateur et votre fichier de sauvegarde, et jamais envoyée non verrouillée. Si vous activez « Sauvegardé chez VeilCore », elle va dans une copie verrouillée que seule votre clé d’accès ou votre feuille de récupération ouvre.',
  'm.pp.device.recordkeys.t': 'Les clés secrètes de chaque enregistrement',
  'm.pp.device.recordkeys.p':
    'Gardées dans votre navigateur et votre fichier de sauvegarde. Une copie verrouillée part avec l’enregistrement sur notre serveur, pour que votre sauvegarde les ramène.',
  'm.pp.device.labkey.t': 'La clé de signature privée d’un laboratoire',
  'm.pp.device.labkey.p':
    'Gardée dans le navigateur du laboratoire et son fichier de sauvegarde. Seule la clé publique nous est envoyée non verrouillée. Avec « Sauvegardé chez VeilCore » activé, la clé privée va aussi dans votre copie verrouillée.',
  'm.pp.device.deviceonly.t': 'Un document que vous gardez sur cet appareil uniquement',
  'm.pp.device.deviceonly.p':
    'Rien de ce que vous y saisissez ne nous est envoyé, verrouillé ou non. Nous recevons son identifiant, son code de preuve et sa liaison de clé, pour qu’il puisse être daté. Avec « Sauvegardé chez VeilCore » activé, son identifiant et ses clés, pas ce que vous avez saisi, vont aussi dans votre copie verrouillée. Nous ne pouvons pas vous le rendre : gardez le fichier de sauvegarde que l’application vous demande d’enregistrer.',
  'm.pp.device.scan.t': 'La caméra, quand vous scannez un code',
  'm.pp.device.scan.p':
    'L’image est lue dans la page puis jetée. Seul le texte lu va dans le champ où vous avez scanné, et de là seulement là où ce champ va déjà.',
  'm.pp.device.labels.t': 'Les étiquettes QR que vous imprimez',
  'm.pp.device.labels.p':
    'Dessinées sur votre appareil et imprimées par votre navigateur. Une étiquette porte l’identifiant et le code de preuve de l’enregistrement, et son nom seulement si vous le cochez.',
  'm.pp.device.sheet.t': 'Le code de votre feuille de récupération',
  'm.pp.device.sheet.p':
    'Créé sur votre appareil et imprimé depuis celui-ci. Il ne nous est jamais envoyé, et n’est pas gardé sur l’appareil.',
  'm.pp.device.passkey.t': 'La page de vérification des clés d’accès',
  'm.pp.device.passkey.p': 'Teste votre clé d’accès dans votre navigateur. Rien n’est envoyé.',
  'm.pp.device.ask.t': '« Demander », l’aide de l’application',
  'm.pp.device.ask.p':
    'Fonctionne sur votre appareil. Ce que vous lui écrivez n’est pas envoyé. Seul Enregistrer envoie, ou l’approbation d’une tâche « Faites-le pour moi », qui enregistre, envoie des relevés ou date alors exactement ce que vous avez approuvé. Une tâche est gardée sur votre appareil uniquement, et supprimée 7 jours après sa fin.',

  'm.pp.browser.t': 'Ce que garde votre navigateur',
  'm.pp.browser.p1':
    'Le site utilise le stockage de votre navigateur sur cet appareil : votre clé de détenteur (la clé qui retrouve vos enregistrements sur notre serveur), la clé qui verrouille vos enregistrements, vos enregistrements et licences, les clés secrètes de chaque enregistrement, les clés de vos accords de licence, les codes de laboratoire, un enregistrement pas encore terminé, vos réglages et votre langue, et une copie du code de ce site pour qu’il s’ouvre sans réseau. Là où le navigateur peut envoyer tout seul (Chrome), il garde aussi les enregistrements qui attendent leur date, avec votre clé de détenteur, jusqu’au retour du réseau. Avec « Sauvegardé chez VeilCore » activé, il garde en plus deux clés tirées de votre clé de compte, que la page peut utiliser sans pouvoir les extraire.',
  'm.pp.browser.p2':
    'Pas de cookies. Pour tout retirer, effacez les données de ce site dans les réglages de votre navigateur. Enregistrez d’abord votre sauvegarde : sans elle, vous ne pourrez plus retrouver ni ouvrir vos enregistrements. Le nom de chaque élément stocké figure dans « Détails techniques », à la fin.',

  'm.pp.server.t': 'Ce que conserve notre serveur',
  'm.pp.server.p':
    'Notre serveur est le registre de VeilCore, hébergé chez Railway. « Verrouillé » veut dire que votre navigateur l’a verrouillé avant de l’envoyer, et que nous n’avons pas la clé.',
  'm.pp.col.read': 'Pouvons-nous le lire ?',
  'm.pp.col.keep': 'Combien de temps',
  'm.pp.server.records.t':
    'Vos enregistrements et accords : le nom, l’obtenteur ou l’éleveur, l’espèce, les dates, les notes, les numéros de référence et les parents de chaque enregistrement, les codes et noms de fichier des photos et rapports de laboratoire que vous ajoutez, les conditions des accords et l’autre partie, les noms que vous donnez aux destinataires, et les clés secrètes de chaque enregistrement',
  'm.pp.server.records.read': 'Non. Verrouillé.',
  'm.pp.server.records.keep': 'Jusqu’à ce que vous le supprimiez, ou nous le demandiez',
  'm.pp.server.facts.t':
    'Sur chaque enregistrement : son identifiant, son code de preuve, sa liaison de clé et son type ; un code tiré de son nom, qui ne dit rien du nom sans la clé de votre lien de vérification ; ses liens de correction ; quand notre serveur l’a vu pour la première fois ; combien de fois il a été enregistré, et la dernière fois ; sa taille approximative ; les liens de parenté que vous déclarez ; son lot et ses horodatages',
  'm.pp.server.facts.read':
    'Oui. Toute personne ayant l’identifiant de l’enregistrement voit son code de preuve, quand notre serveur l’a vu pour la première fois, ses liens de correction, son lot et ses horodatages, et s’il a des signatures de laboratoire.',
  'm.pp.server.facts.keep': 'Tant que l’enregistrement existe',
  'm.pp.server.shown.t':
    'Ce que vous choisissez de montrer sur la page de vérification d’un enregistrement, comme son nom, la signature d’un laboratoire, ou si un rapport ADN est enregistré (sous forme de code)',
  'm.pp.server.shown.read': 'Oui. Toute personne ayant l’identifiant de l’enregistrement le voit.',
  'm.pp.server.shown.keep': 'Jusqu’à ce que vous le désactiviez ou supprimiez l’enregistrement',
  'm.pp.server.holder.t': 'Votre clé de détenteur, que votre navigateur envoie chaque fois que vous enregistrez',
  'm.pp.server.holder.read': 'Nous n’en gardons qu’un condensé à sens unique.',
  'm.pp.server.holder.keep':
    'Tant que vos enregistrements existent, puis à côté de chaque enregistrement supprimé et de chaque code de preuve que vous avez détenu',
  'm.pp.server.copy.t':
    '« Sauvegardé chez VeilCore » : une copie verrouillée de ce que contient votre fichier de sauvegarde, sauf les enregistrements eux-mêmes (vos clés, les codes de laboratoire, et les clés de licences et d’accords), et une clé verrouillée pour chaque accès (une clé d’accès ou une feuille de récupération)',
  'm.pp.server.copy.read':
    'Non. Verrouillé. Nous voyons quels accès ouvrent quelle copie et de quel type est chacun, la taille approximative de la copie, et quand elle est enregistrée ou vérifiée. On ne nous dit pas de qui vient la copie, mais l’heure et l’adresse d’un enregistrement pourraient nous laisser deviner à quels enregistrements elle correspond.',
  'm.pp.server.copy.keep': 'Jusqu’à ce que vous choisissiez « Arrêter la sauvegarde chez VeilCore »',
  'm.pp.server.delivery.t':
    'Codes de laboratoire (envois) : de quel enregistrement vient un envoi, quel compte l’a reçu et quand, et une étiquette à la place du nom du destinataire. La quantité, la note et les données d’échantillon (identifiant d’échantillon, numéro de scellé, où et quand il a été prélevé, un témoin, comment il est arrivé) sont verrouillées avec une clé qui voyage dans le code de laboratoire.',
  'm.pp.server.delivery.read': 'En partie. Les détails sont verrouillés.',
  'm.pp.server.delivery.keep': 'Pas de durée fixée',
  'm.pp.server.labs.t':
    'Laboratoires : la clé publique d’un laboratoire, le nom, le rôle et le site qu’il indique, nos notes sur la vérification de son nom, et les signatures qu’il fait. Les accusés de réception et rapports d’un laboratoire sur votre enregistrement ne sont montrés qu’à vous, au laboratoire et à la personne qui lui a envoyé l’échantillon, sauf si vous choisissez de les montrer.',
  'm.pp.server.labs.read': 'Oui',
  'm.pp.server.labs.keep': 'Pas de durée fixée',
  'm.pp.server.results.t': 'Les rapports de laboratoire qu’un laboratoire vous envoie',
  'm.pp.server.results.read': 'Non. Verrouillés avec la clé de votre enregistrement.',
  'm.pp.server.results.keep':
    'Supprimés 180 jours après leur arrivée. Les copies dans nos sauvegardes restent jusqu’à ce que celles-ci soient retirées.',
  'm.pp.server.prove.t':
    'Les demandes de prouver la clé d’un enregistrement : le nom saisi par la personne qui demande, et les réponses. Notre serveur apprend quelle clé on-chain chaque demande nomme.',
  'm.pp.server.prove.read': 'Oui, ainsi que toute personne ayant le lien de la demande',
  'm.pp.server.prove.keep': 'Supprimées après 7 jours',
  'm.pp.server.invites.t':
    'Les invitations de licence : le libellé que vous donnez à l’autre partie, l’enregistrement concerné, et les codes et identifiants de transaction qu’échangent les deux navigateurs',
  'm.pp.server.invites.read': 'Oui, ainsi que toute personne ayant le lien de l’invitation',
  'm.pp.server.invites.keep': 'Supprimées après 30 jours',
  'm.pp.server.deals.t':
    'Les messages d’un accord de licence : les conditions, les relevés de redevances et leurs réponses, « J’ai payé », « Reçu », et les coordonnées de paiement et de l’entreprise',
  'm.pp.server.deals.read':
    'Non. Verrouillés avec une clé que seules les deux parties partagent. Nous voyons à quelle licence ils appartiennent, combien il y en a et quand chacun est arrivé.',
  'm.pp.server.deals.keep':
    'Jusqu’à ce qu’une partie nous demande de les supprimer. Un accord sans message est supprimé après 7 jours.',
  'm.pp.server.notices.t':
    'Les lignes de licence sur la page de vérification d’un enregistrement (un relevé en retard, un avis de manquement, révoquée), et la réponse de l’autre partie (son type et sa date)',
  'm.pp.server.notices.read': 'Oui. Toute personne ayant l’identifiant de l’enregistrement les voit.',
  'm.pp.server.notices.keep':
    'Jusqu’au retrait de la ligne ou à la suppression de l’enregistrement. Les réponses restent conservées.',
  'm.pp.server.obligations.t':
    'Une redevance sur la descendance : quel enregistrement elle couvre et depuis quand elle s’applique. Tout le monde peut demander si un enregistrement en porte une.',
  'm.pp.server.obligations.read': 'Oui',
  'm.pp.server.obligations.keep': 'Tant que la licence existe',
  'm.pp.server.receipts.t':
    'Le reçu d’un prestataire de paiement pour un relevé de redevances : le montant, la devise, le compte payé, sa référence et la date',
  'm.pp.server.receipts.read':
    'Oui, par toute personne ayant le code du relevé, que seules les deux parties et leur prestataire ont.',
  'm.pp.server.receipts.keep': 'Pas de durée fixée',
  'm.pp.server.batches.t':
    'Les lots : le code de preuve de chaque enregistrement, la preuve qu’il est dans son lot, le code du lot, où il a été ancré, son horodatage Bitcoin et ses jetons d’horodatage',
  'm.pp.server.batches.read': 'Oui',
  'm.pp.server.batches.keep': 'Conservés : ce sont eux qui rendent les anciens enregistrements vérifiables',
  'm.pp.server.logs':
    'Notre registre ne tient aucun journal des requêtes et ne note pas qui a consulté une page de vérification. Pour limiter les abus, il compte les requêtes par adresse réseau en mémoire seulement ; les comptes disparaissent à son redémarrage. Pour plafonner les demandes d’horodatage, il garde aussi, pendant un jour, quand chaque clé de détenteur en a demandé un. Le service de frais ne journalise que des compteurs et des résultats, jamais ce qui a été envoyé. Nos hébergeurs tiennent leurs propres journaux de requêtes (ci-dessous).',
  'm.pp.server.purge':
    'Le texte enregistré avant que les enregistrements soient verrouillés a été retiré de notre serveur le 18 octobre 2026, et les sauvegardes faites avant ne peuvent plus être ouvertes : nous avons détruit leur clé le jour même.',
  'm.pp.server.backup':
    'Sauvegardes : une fois par jour, les données de notre registre et les fichiers verrouillés des rapports de laboratoire sont chiffrés avec une clé que notre serveur n’a jamais, et stockés chez Backblaze B2. Le stockage est réglé pour bloquer chaque copie 30 jours, si bien que personne ne peut la supprimer avant ; la durée de conservation au-delà n’est pas encore fixée. Un enregistrement que vous supprimez reste dans les sauvegardes faites avant, jusqu’à ce qu’elles soient retirées.',

  'm.pp.chain.t': 'Ce qui est public, pour toujours',
  'm.pp.chain.p1':
    'Midnight et Bitcoin sont des réseaux publics. Ce qui y part ne peut être modifié ni retiré par personne, nous compris, et tout le monde peut le lire. Ce que vous avez saisi et vos fichiers n’y vont jamais, sauf un chiffre que vous choisissez de prouver exactement (ci-dessous). Ce qui y va :',
  'm.pp.chain.1':
    'le code de chaque lot d’enregistrements (un code qui représente tous les enregistrements du lot), sur Midnight et, via OpenTimestamps, sur Bitcoin ;',
  'm.pp.chain.2': 'la clé propre d’un enregistrement et son horodatage, quand vous datez l’enregistrement ;',
  'm.pp.chain.3': 'un code tiré d’un rapport ADN, quand vous datez son appariement ;',
  'm.pp.chain.4':
    'quels enregistrements sont liés comme parent et descendant, une fois que les deux détenteurs le confirment ;',
  'm.pp.chain.5':
    'qu’un enregistrement porte une licence, une obligation ou le droit d’un prêteur, et quand cela a changé ;',
  'm.pp.chain.6': 'la clé publique d’un laboratoire, quand il y signe un certificat ;',
  'm.pp.chain.7':
    'ce que vous choisissez de prouver sur un chiffre : le seuil et son sens ou, si vous le prouvez exactement, le chiffre lui-même. Un résultat de filiation prouve seulement que les seuils de l’ICAR sont respectés ; aucun génotype ni aucun décompte n’est publié.',
  'm.pp.chain.p2':
    'Notre service de frais ancre chaque lot. Pour les autres étapes, l’application montre d’abord un reçu qui liste exactement ce que l’étape rend public, et votre navigateur l’envoie par notre service de frais, qui paie les frais. Un code ou une clé seuls ne disent rien de vous, mais toute personne à qui vous donnez un lien de vérification peut suivre ce qui arrive à cet enregistrement sur le réseau à partir de là.',

  'm.pp.ts.t': 'Horodatages, et vérification sur Bitcoin',
  'm.pp.ts.p1':
    'Quand notre serveur reçoit le code de preuve d’un enregistrement, il demande à un ou plusieurs services d’horodatage (des services indépendants, certains tenus par une seule personne) un jeton d’horodatage dessus, et sur chaque lot. Chaque service reçoit un code tiré du code de preuve et l’heure de la demande, et peut en garder un journal. Comme les codes de preuve figurent sur les pages de vérification, un service pourrait rapprocher son journal d’un lien de vérification. Toute personne ayant un lien de vérification peut lire, à la seconde, quand notre serveur a reçu le code de preuve de cet enregistrement. Pour un enregistrement scellé sans réseau, c’est le moment où votre appareil a retrouvé du réseau.',
  'm.pp.ts.p2':
    'La page de vérification d’un enregistrement peut vérifier elle-même son horodatage Bitcoin. C’est seulement quand vous appuyez sur « Vérifier sur Bitcoin » que votre navigateur demande des en-têtes de bloc à deux explorateurs de blocs, mempool.space et blockstream.info. Ils voient votre adresse IP, qu’un lot VeilCore est vérifié, et quel bloc ; pas l’enregistrement. Un dossier de preuves fait de même seulement si vous cochez « Inclure les en-têtes de bloc Bitcoin ».',

  'm.pp.others.t': 'Qui d’autre traite des données',
  'm.pp.others.p': 'Ces services travaillent pour nous, ou ce sont les réseaux publics que nous utilisons.',
  'm.pp.col.service': 'Service',
  'm.pp.col.does': 'Ce qu’il fait',
  'm.pp.col.gets': 'Ce qu’il reçoit',
  'm.pp.others.vercel.n': 'Vercel',
  'm.pp.others.vercel.does': 'Héberge ce site',
  'm.pp.others.vercel.gets':
    'Votre adresse IP et les pages et fichiers que vous chargez, y compris l’adresse d’une page de vérification, qui porte l’identifiant et le code de preuve de l’enregistrement. Vercel tient des journaux de requêtes.',
  'm.pp.others.railway.n': 'Railway',
  'm.pp.others.railway.does':
    'Fait tourner notre registre, le service de frais et le relais par lequel votre navigateur lit Midnight',
  'm.pp.others.railway.gets':
    'Votre adresse IP et vos requêtes à ces services (vérifier un enregistrement donne son identifiant), et les données stockées du registre. Railway tient des journaux de requêtes.',
  'm.pp.others.blockfrost.n': 'Blockfrost',
  'm.pp.others.blockfrost.does': 'Relie notre service de frais et notre relais à Midnight',
  'm.pp.others.blockfrost.gets':
    'Les transactions que le service de frais envoie, et les questions du relais (ce que l’application et les pages de vérification consultent sur Midnight). Elles viennent de notre service, pas de votre navigateur.',
  'm.pp.others.midnight.n': 'Le réseau Midnight',
  'm.pp.others.midnight.does': 'Date les lots, et inscrit ce que votre navigateur envoie',
  'm.pp.others.midnight.gets': 'Des transactions publiques (ci-dessus)',
  'm.pp.others.ots.n': 'Les calendriers OpenTimestamps',
  'm.pp.others.ots.does': 'Horodatent les codes des lots sur Bitcoin',
  'm.pp.others.ots.gets': 'Les codes des lots, depuis notre registre',
  'm.pp.others.tsa.n': 'Des services d’horodatage, comme FreeTSA et DigiCert',
  'm.pp.others.tsa.does': 'Horodatent chaque code de preuve et chaque lot',
  'm.pp.others.tsa.gets': 'Un code tiré de chacun, et l’heure de la demande, depuis notre registre',
  'm.pp.others.explorers.n': 'Des explorateurs de blocs Bitcoin : mempool.space et blockstream.info',
  'm.pp.others.explorers.does':
    'Vérifient les horodatages Bitcoin : notre registre les interroge pour chaque lot, votre navigateur seulement quand vous le demandez',
  'm.pp.others.explorers.gets':
    'Quel bloc. Depuis votre navigateur, aussi votre adresse IP et le fait qu’un lot VeilCore est vérifié.',
  'm.pp.others.backblaze.n': 'Backblaze B2',
  'm.pp.others.backblaze.does': 'Stocke nos sauvegardes',
  'm.pp.others.backblaze.gets': 'Des fichiers chiffrés qu’il ne peut pas ouvrir',
  'm.pp.others.labsite.n': 'Le site d’un laboratoire',
  'm.pp.others.labsite.does':
    'Si un laboratoire indique son site, notre registre vérifie chaque jour qu’il affiche la clé du laboratoire',
  'm.pp.others.labsite.gets': 'Une requête de notre registre. Rien sur vous.',
  'm.pp.others.passkey.n':
    'Votre fournisseur de clés d’accès, comme le trousseau iCloud ou le Gestionnaire de mots de passe de Google',
  'm.pp.others.passkey.does':
    'Garde la clé d’accès que vous utilisez avec « Sauvegardé chez VeilCore », selon ses propres conditions',
  'm.pp.others.passkey.gets': 'Que vous avez une clé d’accès pour veilcore.org. Nous ne recevons jamais la clé.',
  'm.pp.others.links':
    'Des pages d’ici renvoient vers d’autres sites, comme des explorateurs Midnight, GitHub et les documents que nous citons. En ouvrir un, c’est entre vous et ce site.',

  'm.pp.dont.t': 'Ce que nous ne faisons pas',
  'm.pp.dont.1': 'Nous ne vendons ni ne louons vos données, et ne les partageons pas à des fins publicitaires.',
  'm.pp.dont.2':
    'Pas de publicité, pas de mesure d’audience, pas de pixels de pistage, pas de scripts ni de polices de tiers, et pas de cookies.',
  'm.pp.dont.3': 'VeilCore ne se porte garant d’aucun enregistrement, obtenteur, éleveur ou laboratoire.',

  'm.pp.pay.t': 'Paiements',
  'm.pp.pay.p':
    'Ce site ne prend aucun paiement, et VeilCore ne détient ni ne déplace jamais d’argent. Les redevances sont payées entre les deux parties, ou par un prestataire de paiement qu’elles choisissent (son reçu figure ci-dessus). Avant qu’une fonction de paiement soit activée ici, nous mettrons cette page à jour.',

  'm.pp.rights.t': 'Ce que vous pouvez faire',
  'm.pp.rights.see.t': 'Voir et télécharger',
  'm.pp.rights.see.p':
    'Sur votre page d’enregistrements, sous « Plus » : « Exporter tous les enregistrements » télécharge ce que ce navigateur détient, et « Télécharger vos enregistrements et accords depuis VeilCore » télécharge vos enregistrements, licences et choix de partage tels que notre serveur les conserve. Ce téléchargement laisse de côté les envois et leurs données d’échantillon, les rapports et signatures de laboratoire, les redevances sur la descendance, les invitations de licence, les messages d’accords, les demandes de preuve et les horodatages de chaque enregistrement ; ouvrez les envois et les rapports de laboratoire depuis l’envoi dans l’application. Vos clés sont dans votre fichier de sauvegarde (Réglages, « Télécharger une copie »). Pour tout le reste, écrivez-nous.',
  'm.pp.rights.delete.t': 'Supprimer',
  'm.pp.rights.delete.p':
    '« Supprimer cet enregistrement », sur la page d’un enregistrement, retire définitivement de notre serveur ses détails, sa copie verrouillée et tout ce que vous avez montré. « Arrêter la sauvegarde chez VeilCore », dans les Réglages, supprime votre copie sauvegardée et tous ses accès. Pour tout le reste, comme les messages d’accords, les envois ou tout à la fois, écrivez à hunter@veilcore.org avec les identifiants.',
  'm.pp.rights.keep.t': 'Ce qui ne peut pas être supprimé',
  'm.pp.rights.keep.p':
    'Tout ce qui est sur Midnight ou Bitcoin. Après la suppression d’un enregistrement, notre serveur garde son identifiant, son code de preuve, le moment de la suppression et un condensé à sens unique de votre clé de détenteur, pour que ses liens de vérification puissent dire que son détenteur l’a supprimé et que personne ne puisse le réutiliser. Il garde aussi, pour toujours, chaque code de preuve qu’une clé de détenteur a détenu, avec ce condensé et la date à partir de laquelle il a été détenu. Les liens de parenté et obligations déjà inscrits restent, tout comme les signatures qu’un laboratoire a déjà faites. Les sauvegardes faites avant la suppression gardent leur copie jusqu’à ce qu’elles soient retirées. Les copies que d’autres ont déjà, comme un lien de vérification que vous avez envoyé, restent chez eux.',
  'm.pp.rights.fix.t': 'Corriger',
  'm.pp.rights.fix.p':
    'Un enregistrement scellé ne peut pas changer. Pour en corriger un, vous scellez un nouvel enregistrement qui renvoie à l’ancien.',
  'm.pp.rights.ask.t': 'Nous demander',
  'm.pp.rights.ask.p':
    'Écrivez à hunter@veilcore.org pour savoir ce que nous conservons sur vous, ou pour le faire supprimer ou corriger. Indiquez les identifiants des enregistrements concernés : notre serveur retrouve les enregistrements par leur identifiant ou votre clé de détenteur, pas par votre nom.',

  'm.pp.changes.t': 'Modifications de cette politique',
  'm.pp.changes.p': 'Nous publierons ici toute modification, avec sa date, avant qu’elle ne s’applique.',

  'm.pp.tech.t': 'Détails techniques',
  'm.pp.tech.storage':
    'Stockage du navigateur. Local Storage : veilcore.holder.v1 (clé de détenteur), veilcore.vault.v1 (la clé qui verrouille vos enregistrements), veilcore.records.v1 et veilcore.licenses.v1 (enregistrements et licences), veilcore.record-keys.v1 (clés des enregistrements), veilcore.attester.v1 (la clé de signature d’un laboratoire), veilcore.lab-deliveries.v1, veilcore.sent-codes.v1 et veilcore.opened-results.v1 (codes de laboratoire et rapports ouverts), veilcore.prove-asks.v1 et veilcore.verifier-challenges.v1 (demandes de preuve), veilcore.log-draft.v1 (un enregistrement pas terminé), veilcore.device-only.v1 (documents gardés sur cet appareil uniquement), veilcore.outbox.v1 (enregistrements en attente d’envoi), veilcore.sponsor-ticket.v1 (un ticket aléatoire pour le service de frais, pas votre clé de détenteur), veilcore.issuer-deals.v1 (clés des accords de licence), veilcore.lender.v1 (les droits d’un prêteur), veilcore.account-copy.v1 (l’état de la copie sauvegardée), veilcore.role.v1 et veilcore.lang (réglages). IndexedDB : veilcore-offline (enregistrements en attente de leur date, avec la clé de détenteur), veilcore.account.v1 (les deux clés tirées de votre clé de compte), veilcore.ask.job.v1 (les tâches de « Demander »). Cache Storage : veilcore-shell-<release> et veilcore-offline-meta (le code de ce site). Ce sont les principaux ; le code publié les nomme tous.',
  'm.pp.tech.locking':
    'Verrouillage. Les enregistrements sont verrouillés dans votre navigateur avec AES-GCM. Votre clé de détenteur est conservée sous la forme h1: suivi de son SHA-256. La copie sauvegardée est en AES-256-GCM, complétée jusqu’à la tranche de taille suivante, et notre serveur ne garde que le SHA-256 des jetons qui la lisent ou la modifient. Les rapports de laboratoire sont chiffrés avec age pour la clé de votre enregistrement.',
  'm.pp.tech.network':
    'Connexions. La politique de sécurité de ce site ne laisse une page se connecter qu’à veilcore.org lui-même, à notre registre, à notre service de frais et relais, à mempool.space et à blockstream.info. Seul ce site peut demander la caméra, et votre navigateur vous le demande d’abord ; le micro et la localisation sont coupés.',
  'm.pp.tech.logs':
    'Journaux. Le registre n’a pas de journal des requêtes, et son test test/no-request-logging.test.mjs échoue si on en ajoute un ; sa console montre les messages de démarrage et d’erreur. Ses limites comptent les requêtes par bloc d’adresses (une adresse IPv4, ou un /64 ou /48 IPv6) en mémoire. Le service de frais compte par bloc d’adresses (/24 ou /48) et par ticket en mémoire, oublie une adresse quand sa fenêtre est passée, et écrit une ligne par événement avec seulement des compteurs et des résultats.',
  'm.pp.tech.backups':
    'Sauvegardes. Chaque jour, la base de données du registre est compressée, chiffrée avec age pour la clé publique de l’opérateur et envoyée dans un bucket Backblaze B2 sous un nouveau nom à chaque fois ; les fichiers verrouillés des rapports de laboratoire partent aussi. Le bucket bloque chaque copie pendant 30 jours (Object Lock).',
};
