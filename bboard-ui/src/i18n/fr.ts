// French. Published: machine-assisted, reviewed against native official sources (docs/i18n-glossary.md).
// SPDX-License-Identifier: Apache-2.0
import type { Strings } from './en';
import { policyFr } from './privacy-policy/fr';
export const fr: Strings = {
  // Header and footer
  'nav.language': 'Langue',
  'nav.main': 'Navigation principale',
  'nav.home': 'Accueil VeilCore',
  'footer.documents': 'Documents',
  'footer.spec': 'Spécification',
  'footer.partners': 'Exiger un enregistrement',
  'footer.evidence': 'Les enregistrements comme preuve',
  'footer.integrate': 'Guide d’intégration',
  'footer.source': 'Code source',
  'footer.allImplementations': 'Les trois implémentations',
  'footer.referenceImplementation': 'Implémentation de référence',
  'footer.rustImplementation': 'Implémentation en Rust',
  'footer.siteCode': 'Code de ce site',
  'footer.thisSite': 'Ce site',
  'footer.yourRecords': 'Vos enregistrements',
  'footer.agreements': 'Accords',
  'footer.privacy': 'Confidentialité de la démo',
  'title.help': 'Aide',
  'title.status': 'État du service',
  'footer.help': 'Aide',
  'm.help.title': 'Aide',
  'm.help.lede':
    'Des réponses courtes pour créer, conserver, montrer et vérifier un enregistrement. Chacune dit ce que ce site fait aujourd’hui.',
  'm.help.start.t': 'Pour commencer',
  'm.help.start.1q': 'Qu’est-ce qu’un enregistrement VeilCore ?',
  'm.help.start.1a':
    'Une description datée de quelque chose que vous détenez : une plante, un animal, une souche ou une lignée cellulaire, ou un document. Votre navigateur en tire un court code de preuve, et ce code est daté sur Midnight dans un lot avec d’autres. Il montre que vous déteniez déjà cet enregistrement à cette date. Il n’établit pas qui a des droits sur quoi que ce soit, ni que ce que dit l’enregistrement est vrai.',
  'm.help.start.2q': 'De quoi ai-je besoin ?',
  'm.help.start.2a':
    'D’un téléphone ou d’un ordinateur avec un navigateur à jour. Ni portefeuille, ni inscription, ni achat. Pour prouver un fait tiré d’un enregistrement, il faut un ordinateur : cela n’a pas encore été essayé sur téléphone.',
  'm.help.start.3q': 'Combien cela coûte-t-il ?',
  'm.help.start.3a': 'Créer un enregistrement sur ce site et vérifier n’importe quel enregistrement sont gratuits.',
  'm.help.make.t': 'Créer un enregistrement',
  'm.help.make.1q': 'Quel type d’enregistrement choisir ?',
  'm.help.make.1a':
    'Choisissez ce que c’est. Une plante : un cultivar ou une lignée. Un animal : un animal ou une lignée. Une souche ou une lignée : microbes, champignons, lignées cellulaires, lignées d’insectes. Un document : un permis, un certificat, un contrat ou un rapport, scellé sous forme de fichier. Un lot de culture ou un lot de récolte : une étape d’une chaîne de production, liée à l’enregistrement précédent.',
  'm.help.make.2q': 'Que dois-je laisser de côté ?',
  'm.help.make.2a':
    'Les données personnelles d’autres personnes. Ce que vous saisissez est stocké chiffré sur notre serveur, et nous n’avons pas la clé. Mais la personne à qui vous montrez un enregistrement voit ce que vous avez choisi de partager, et le lien de vérification d’un document affiche tout ce qui y a été saisi (titre, détenteur, émetteur, référence, notes), le nom du fichier et son SHA-256. Donnez aux fichiers des noms simples, comme « Permis 2026.pdf ». Ou gardez un document sur cet appareil seulement : alors rien de ce que vous saisissez n’est envoyé.',
  'm.help.make.3q': 'Comment savoir que mon enregistrement est daté ?',
  'm.help.make.3a':
    'La page de l’enregistrement affiche « Enregistrement daté » avec la date dès que son lot est sur Midnight. Avant cela, elle indique « dans le prochain lot ». Dans les deux cas, l’enregistrement est sauvegardé. Tant que le lot n’est pas sur Midnight, sa date ne repose que sur votre parole.',
  'm.help.backup.t': 'Votre sauvegarde',
  'm.help.backup.1q': 'Pourquoi le site me demande-t-il sans cesse d’enregistrer une sauvegarde ?',
  'm.help.backup.1a':
    'Il est demandé tant que vos enregistrements n’ont pas d’autre moyen de revenir. Le fichier de sauvegarde en est un : il récupère vos enregistrements sur un nouveau téléphone ou ordinateur, même sans VeilCore. Les sauvegarder chez VeilCore, avec le verrouillage de cet appareil, en est un autre ; le fichier est alors à votre choix. VeilCore ne peut ni récupérer le fichier ni en refaire un.',
  'm.help.backup.2q': 'Où dois-je le conserver ?',
  'm.help.backup.2a':
    'Sur une clé USB ou dans un gestionnaire de mots de passe, et aussi à un deuxième endroit. Toute personne qui a le fichier peut ouvrir vos enregistrements et agir en votre nom. Ajoutez un mot de passe en l’enregistrant : le fichier seul n’ouvre alors rien. Si vous oubliez le mot de passe, personne ne peut ouvrir le fichier, nous non plus.',
  'm.help.backup.3q': 'J’ai perdu ma sauvegarde. Que faire ?',
  'm.help.backup.3a':
    'Si ce navigateur a encore vos enregistrements, enregistrez tout de suite une nouvelle sauvegarde. Sinon, personne ne peut ouvrir les copies verrouillées sur notre serveur, VeilCore non plus. Le site proposera de les supprimer et de repartir avec une nouvelle clé. Les enregistrements déjà datés restent datés, mais vous ne pouvez plus montrer qu’ils sont les vôtres.',
  'm.help.backup.4q': 'Comment passer à un nouveau téléphone ou ordinateur ?',
  'm.help.backup.4a':
    'Ouvrez « Récupérez vos enregistrements » sur le nouvel appareil et choisissez votre fichier de sauvegarde.',
  'm.help.backup.4link': 'Récupérez vos enregistrements →',
  'm.help.backup.5q': 'Mes enregistrements ont disparu du navigateur.',
  'm.help.backup.5a':
    'Les navigateurs peuvent effacer les données stockées d’un site. Safari peut le faire après 7 jours sans visite. Votre fichier de sauvegarde ramène tout.',
  'm.help.show.t': 'Montrer un enregistrement à quelqu’un',
  'm.help.show.1q': 'Comment montrer mon enregistrement à quelqu’un ?',
  'm.help.show.1a':
    'Ouvrez le certificat de l’enregistrement et copiez son lien pour l’envoyer. La personne qui l’ouvre peut vérifier la date elle-même, gratuitement et sans compte. Le lien n’affiche le nom de l’enregistrement que si vous l’activez.',
  'm.help.show.2q': 'Comment montrer un document ?',
  'm.help.show.2a':
    'Envoyez le lien de vérification avec le fichier. Le navigateur de l’autre personne compare le fichier à l’enregistrement scellé, octet par octet, et indique depuis quand vous l’aviez. Sa copie du fichier n’est pas téléversée.',
  'm.help.show.3q': 'Puis-je prouver un fait sans montrer le reste ?',
  'm.help.show.3a':
    'Oui, si vous avez scellé l’enregistrement avec ses nombres. Vous pouvez prouver qu’un nombre est au plus ou au moins égal à une limite, ou exactement égal à une valeur, ou qu’un résultat de laboratoire est « non détecté ». Utilisez un ordinateur.',
  'm.help.check.t': 'Vérifier un enregistrement qu’on vous a envoyé',
  'm.help.check.1q': 'On m’a envoyé un enregistrement. Comment le vérifier ?',
  'm.help.check.1a':
    'Ouvrez le lien reçu, ou saisissez l’identifiant de l’enregistrement sur la page de vérification. C’est gratuit et sans compte.',
  'm.help.check.1link': 'Vérifier un enregistrement →',
  'm.help.check.2q': 'Que signifie « daté » ?',
  'm.help.check.2a':
    'Le code de preuve de l’enregistrement est dans un lot, et le code de ce lot est sur Midnight. La date est le moment où le lot est arrivé sur Midnight. Vous pouvez le vérifier sans faire confiance à VeilCore.',
  'm.help.check.3q': 'Que montre un enregistrement, et que ne montre-t-il pas ?',
  'm.help.check.3a':
    'Il montre que quelqu’un détenait déjà exactement cet enregistrement à cette date, et qu’il n’a pas changé depuis. Il ne montre pas qui a des droits sur le matériel, que la description est vraie, ni qu’un objet physique y correspond. La signature d’un laboratoire sur un résultat est une vérification distincte.',
  'm.help.check.4q': 'Est-ce que cela tiendra dans un litige ?',
  'm.help.check.4link': 'Les enregistrements comme preuve →',
  'm.help.labs.t': 'Laboratoires et accords',
  'm.help.labs.1q': 'Qu’est-ce qui fonctionne pour les laboratoires et les accords de licence ?',
  'm.help.labs.1a':
    'La page d’accueil liste ce qui fonctionne sur ce site et ce qui est construit mais pas encore exécuté ici. Cette liste est tenue à jour à chaque version.',
  'm.help.labs.1link': 'Ce qui fonctionne aujourd’hui →',
  'm.help.wrong.t': 'Quand quelque chose ne va pas',
  'm.help.wrong.1q': 'Mon enregistrement indique « dans le prochain lot » depuis longtemps.',
  'm.help.wrong.1a':
    'Votre enregistrement est sauvegardé et attend son lot. La page d’état indique si le service de datation fonctionne.',
  'm.help.wrong.1link': 'État du service →',
  'm.help.wrong.2q': 'La page de vérification dit que mon fichier ne correspond pas.',
  'm.help.wrong.2a':
    'Le fichier n’est pas, octet par octet, celui qui a été scellé. Ouvrir un fichier et l’enregistrer à nouveau, l’exporter ou l’envoyer par une application qui le recompresse peut le modifier. Demandez le fichier d’origine.',
  'm.help.wrong.3q': 'Et si ce site disparaît ?',
  'm.help.wrong.3a':
    'Vos enregistrements restent vérifiables. Un outil libre et gratuit ouvre votre fichier de sauvegarde, vérifie le code de preuve de chaque enregistrement et vous indique quelle transaction Midnight le date, sans ce site.',
  'm.help.wrong.3link': 'L’outil gratuit →',
  'm.help.contact.t': 'Contact',
  'm.help.contact.p':
    'Écrivez à hunter@veilcore.org. Dites ce que vous faisiez, ce que vous avez vu, et l’identifiant de l’enregistrement s’il y en a un. N’envoyez jamais votre fichier de sauvegarde ni son mot de passe.',
  'm.status.page.title': 'État du service',
  'm.status.page.lede': 'Lu en direct auprès du service qui date les enregistrements sur Midnight pour ce site.',
  'm.status.page.loading': 'Vérification…',
  'm.status.page.none': 'Cette version n’a pas de service de datation à interroger.',
  'm.status.page.unreachable':
    'Le service de datation n’a pas répondu. Les enregistrements que vous créez sont sauvegardés et seront datés à son retour.',
  'm.status.page.service': 'Service de datation',
  'm.status.page.running': 'En marche',
  'm.status.page.behind': 'En marche, en train de rattraper Midnight',
  'm.status.page.failing': 'En marche, mais les derniers lots ont échoué',
  'm.status.page.lastRun': 'Dernière exécution',
  'm.status.page.checked': 'Vérifié à l’instant, depuis votre navigateur.',
  'm.status.page.help': 'Aide →',
  'footer.terms': 'Conditions d’utilisation',
  'draft.banner': 'Traduction provisoire faite par machine, en cours de relecture. La page en anglais fait foi.',
  'draft.showEnglish': 'Afficher en anglais',
  'draft.close': 'Fermer cet avis',
  'notice.datingPaused':
    'La datation sur Midnight est suspendue pendant la mise à niveau du réseau de Midnight. Vos enregistrements sont sauvegardés et seront datés dès son retour.',
  // The record app's frame and the browser tab's titles.
  'app.frame.section.log': 'Enregistrer',
  'app.frame.section.send': 'Envoyer et recevoir',
  'app.frame.section.license': 'Licences et redevances',
  'app.frame.section.prove': 'Prouver et vérifier',
  'app.frame.home': 'Vos enregistrements. Votre progression est enregistrée.',
  'title.founders': 'Fondateurs',
  // Mako's site draft of 21 November 2026 (components/site/HowItWorks.tsx, Founders.tsx and the
  // home page): the strings it needed that the site had no words for.
  'title.how': 'Comment ça marche',
  'm.foot.cta': 'Datez votre premier enregistrement.',
  'm.status.liveNow':
    'Les licences, les rapports de redevances et les résultats signés par un laboratoire fonctionnent sur veilcore.org.',
  'm.status.whereLink': 'Ce qui fonctionne, et où →',
  'm.home.f3t': 'Licences et redevances.',
  'm.home.f3p':
    'Convenez d’une licence sur veilcore.org, entre les deux parties, avec de vraies transactions. Chaque rapport de redevances reçoit une réponse : « J’ai payé » et « Réception confirmée ». VeilCore l’enregistre et ne l’encaisse pas.',
  'm.home.f4t': 'Résultats signés par un laboratoire.',
  'm.home.f4p':
    'Un laboratoire signe des valeurs et des résultats avec sa propre clé. Seuls vous, le laboratoire et la personne qui a envoyé l’échantillon les voyez, et vous seul pouvez les montrer. En service sur veilcore.org, sur le réseau principal de Midnight, depuis le 18 novembre 2026.',
  'm.home.f5t': 'Vérification gratuite.',
  'm.home.f5p':
    'Un acheteur, un examinateur ou un tribunal vérifie un enregistrement gratuitement, sans compte et sans portefeuille.',
  'm.hiw.title1': 'Comment fonctionne',
  'm.hiw.title2': 'VeilCore.',
  'm.hiw.lede':
    'Un format d’enregistrement ouvert pour la génétique végétale, animale et microbienne. Votre ordinateur calcule un code de preuve à partir de votre enregistrement, et ce code est daté sur Midnight. Ce que vous avez écrit n’y va jamais. Plus tard, vous montrez l’enregistrement, ou vous prouvez un seul fait à son sujet.',
  'm.hiw.lab1': 'Une seconde partie,',
  'm.hiw.lab2': 'dans l’enregistrement.',
  'm.hiw.labP':
    'Les laboratoires signent les accusés de réception et les rapports avec leurs propres clés. VeilCore enregistre qui a signé ; il ne se porte pas garant du résultat.',
  'm.hiw.split1': 'Ce qui reste chez vous,',
  'm.hiw.split2': 'et ce qui va sur Midnight.',
  'm.hiw.youLbl': 'Chez vous',
  'm.hiw.youT': 'Votre génétique et vos clés',
  'm.hiw.you1t': 'Vos fichiers ADN',
  'm.hiw.you1p': 'Ils ne quittent jamais votre appareil : votre ordinateur lit chacun pour calculer son code.',
  'm.hiw.you2t': 'Les informations de l’enregistrement',
  'm.hiw.you2p':
    'Conservées verrouillées sur le serveur de VeilCore, le nom compris, sauf si vous choisissez de le montrer. Nous n’avons pas la clé.',
  'm.hiw.you3t': 'Votre fichier de sauvegarde',
  'm.hiw.you3p': 'Il contient vos clés. Gardez-le en lieu sûr.',
  'm.hiw.chainLbl': 'Sur Midnight',
  'm.hiw.chainT': 'Des codes, jamais votre génétique',
  'm.hiw.chain1t': 'Le code de preuve',
  'm.hiw.chain1p': 'Personne ne peut en remonter à ce que vous avez écrit.',
  'm.hiw.chain2t': 'Un lot',
  'm.hiw.chain2p':
    'Les codes de preuve vont dans des lots, et chaque lot est ancré sur Midnight. Sur veilcore.org, les lots sont aussi horodatés sur Bitcoin.',
  'm.hiw.chain3t': 'La date',
  'm.hiw.chain3p': 'Le bloc où arrive un lot montre que l’enregistrement existait déjà à ce moment-là.',
  'm.hiw.chainMore': 'Tout ce qui peut aller sur Midnight →',
  'm.hiw.more1': 'Lignées, licences',
  'm.hiw.more2': 'et laboratoires.',
  'm.about.grow1': 'Pour celles et ceux',
  'm.about.grow2': 'qui font pousser et élèvent.',
  'm.about.growP':
    'Obtenteurs et éleveurs, semenciers, laboratoires de culture in vitro et livres généalogiques, et les certificateurs et examinateurs qui vérifient leur travail.',
  'm.about.whereLabel': 'Où nous travaillons',
  'm.about.where': 'Tokyo|New Jersey|Japon|Union européenne|États-Unis',
  'title.terms': 'Conditions d’utilisation',
  'title.privacy': 'Confidentialité de la démo',
  'title.privacyMainnet': 'Politique de confidentialité',
  'title.example': 'Enregistrement d’exemple',
  'title.verify': 'Vérifier un enregistrement',
  'title.import': 'Datez votre collection',
  'title.records': 'Vos enregistrements',
  'title.restore': 'Récupérez vos enregistrements',
  'title.backup': 'Enregistrez votre sauvegarde',
  'title.spec': 'Le format d’enregistrement',
  'title.evidence': 'Les enregistrements comme preuve',
  'title.integrate': 'Intégrer VeilCore',
  'title.implementations': 'Implémentations',
  'title.partners': 'Exiger un enregistrement',
  'title.new': 'Créer un enregistrement',
  'title.record': 'Enregistrement',
  'title.agreements': 'Accords',
  // PageErrorBoundary.tsx: a page that failed to draw (round 3)
  'error.page.title': 'Cette page n’a pas pu être affichée',
  'error.page.text':
    'Un problème est survenu à l’affichage. Rien n’a été changé. Rechargez la page ou allez à vos enregistrements.',
  'error.page.reload': 'Recharger',
  'error.page.home': 'Vos enregistrements',
  // Public pages (Mako's 25 September layout)
  'm.nav.about': 'À propos',
  'm.nav.team': 'Équipe',
  'm.nav.updates': 'Actualités',
  'm.nav.spec': 'Spécification',
  'm.nav.demo': 'Essayer la démo',
  'm.nav.yours': 'Vos enregistrements',
  'm.nav.menu': 'Menu',
  'm.nav.forLabs': 'Pour les laboratoires',
  'm.hero.label': 'La preuve de ce que vous détenez',
  'm.hero.title1': 'Datez votre enregistrement.',
  'm.hero.title2': 'Gardez votre génétique privée.',
  'm.hero.how': 'Comment ça marche',
  'm.hero.pasteQ': 'Quelqu’un vous a envoyé un code laboratoire ou un lien ?',
  'm.hero.pasteGo': 'Collez-le ici →',
  'm.hero.restoreQ': 'Vous avez utilisé VeilCore sur un autre appareil ?',
  'm.hero.restoreGo': 'Récupérer mes enregistrements →',
  'm.hero.cultivar': 'Cultivar',
  'm.hero.bredBy': 'Obtenu par',
  'm.hero.bredByDefault': 'Votre nom ici',
  'm.hero.demoLabel': 'Démo de code de preuve en direct',
  'm.hero.fpUpdated': 'Code de preuve mis à jour',
  'm.hero.typed': 'Ce que vous saisissez',
  'm.hero.goes': 'Ce qui va sur Midnight',
  'm.foot.demo': 'Démo',
  'm.step1.n': '01 · Enregistrement',
  'm.step2.n': '02 · Code de preuve',
  'm.step3.n': '03 · Ancrage',
  'm.step4.n': '04 · Vérification',
  'm.step4.title': 'Le présenter plus tard',
  'm.demo.label': 'Démo',
  'm.demo.title1': 'Essayez',
  'm.demo.title2': 'la démo.',
  'm.demo.create.title': 'Créer un enregistrement',
  'm.demo.create.text':
    'Une plante, un animal ou un document fictif : scellez-le, gardez votre sauvegarde, puis découvrez sa page.',
  'm.demo.verify.title': 'Vérifier un enregistrement',
  'm.demo.verify.text':
    'Saisissez l’identifiant d’un enregistrement et voyez ce que son détenteur a divulgué et s’il est ancré.',
  'm.demo.paste.title': 'Vous avez reçu un code ou un lien ?',
  'm.demo.paste.text':
    'Un laboratoire avec le code laboratoire d’un obtenteur, ou toute personne qui a reçu un lien vers un enregistrement ou un accord à signer : collez-le et le bon écran s’ouvre.',
  'm.demo.video.title': 'Voir comment cela fonctionne',
  'm.demo.video.text':
    'Une animation de 60 secondes sur l’idée : ce qui reste chez vous, ce qui va sur Midnight, et comment quelqu’un le vérifie.',
  'm.chip.video': 'Vidéo',
  'm.chip.60s': '60 s',
  'm.chip.75s': '75 s',
  'm.chip.interactive': 'Interactif',
  'm.chip.3min': '~3 min',
  'm.chip.1min': '~1 min',
  'm.team.label': 'Équipe',
  'm.team.title1': 'Deux fondateurs.',
  'm.team.title2': 'Tokyo et New Jersey.',
  'm.team.more': 'Profils complets →',
  'm.mako.role': 'Cofondateur et CEO · Tokyo',
  'm.mako.short':
    'Responsable commercial : organismes de normalisation et de protection des obtentions végétales au Japon et dans l’UE.',
  'm.hunter.role': 'Cofondateur et COO · New Jersey',
  'm.hunter.short': 'Développe le smart contract, le site et l’API. Mène les prises de contact aux États-Unis.',
  'm.updates.label': 'Actualités',
  'm.updates.title1': 'Les dernières nouvelles',
  'm.updates.title2': 'du développement.',
  'm.updates.read': 'Lire →',
  'm.updates.all': 'Modifications du format d’enregistrement sur GitHub →',
  'm.updates.follow': 'Suivre',
  'm.post1.date': '3 oct. 2026',
  'm.post1.tag': 'Format',
  'm.post1.title': 'Trois implémentations, une seule réponse',
  'm.post1.text':
    'Un test différentiel a révélé que nos implémentations TypeScript, Python et Rust divergeaient sur certains nombres. Corrigé : elles concordent désormais sur chacune des 81 000 entrées, et les vecteurs de test partagés le vérifient.',
  'm.post2.date': '2 oct. 2026',
  'm.post2.tag': 'Smart contract',
  'm.post2.title': 'Une exécution complète sur le réseau de test de Midnight',
  'm.post2.text':
    'Le smart contract a été déployé sur le réseau de test de Midnight et a passé les 26 vérifications de bout en bout, en utilisant 16 de ses 24 opérations avec de vraies preuves.',
  'm.status.label': 'Où nous en sommes',
  'm.status.title1': 'Où en sont',
  'm.status.title2': 'les choses.',
  'm.status.lede': 'Ce qui fonctionne aujourd’hui, et jusqu’où cela a été vérifié.',
  'm.stat3.b': 'Aucun audit',
  'm.status.keyTitle': 'Qui peut modifier le smart contract.',
  'm.status.keyText':
    'Une clé de maintenance peut modifier le fonctionnement du smart contract de VeilCore sur Midnight. Son détenteur peut ajouter ou remplacer des opérations du contrat, ce qui pourrait lui permettre de prendre le contrôle de l’identité de n’importe quel enregistrement, d’ajouter des licences au nom de n’importe quel émetteur, d’ajouter ou de retirer des obligations et des liens de parenté, ou de désactiver des opérations. Elle ne peut pas antidater les heures de bloc du réseau, et chaque modification est visible sur la chaîne. Elle ne peut ni modifier ni retirer un lot déjà ancré, ni la date qu’il donne à un enregistrement : elle se trouve dans la transaction qui l’a ancré, que personne ne peut modifier. Aujourd’hui, la clé est sur papier, une copie chez chaque fondateur, et une seule copie suffit pour l’utiliser. Le passage à trois clés, dont deux doivent s’accorder, était prévu avant la mise à niveau Ledger 9 de Midnight du 6 novembre 2026 et n’a pas été fait. Le réseau accepte toujours la clé : considérez-la donc comme active. Tout le monde peut vérifier le compteur de modifications du contrat sur un explorateur Midnight, et toute modification l’augmente. Chaque utilisation est annoncée publiquement, selon une politique de maintenance écrite.',
  'm.status.keyLink': 'Lire la politique de maintenance →',
  'm.contact.label': 'Nous contacter',
  'm.contact.title1': 'Parlez',
  'm.contact.title2': 'aux fondateurs.',
  'm.contact.email': 'Écrire aux fondateurs',
  'm.contact.spec': 'Lire la spécification',
  'm.foot.explore': 'Explorer',
  'm.foot.contact': 'Contact',
  'm.foot.verify': 'Vérifier un enregistrement',
  'm.foot.fine':
    'La preuve que vous déteniez déjà un enregistrement à une date donnée. Pas un titre sur ce qu’il décrit.',
  'm.foot.terms': 'Conditions d’utilisation',
  'm.terms.inEnglish': 'Ces conditions sont en anglais, et le texte anglais fait foi.',
  'm.verify.label': 'Vérifier',
  'm.verify.title': 'Vérifier un enregistrement',
  'm.verify.lede':
    'Saisissez l’identifiant d’enregistrement imprimé sur un certificat ou qui vous a été communiqué. Vous verrez ce que son détenteur a choisi de partager, et ce que cette page a pu vérifier elle-même : si l’enregistrement est dans un lot scellé, et si les éventuelles signatures de laboratoire sont valides.',
  'm.verify.field': 'Identifiant d’enregistrement',
  'm.verify.go': 'Vérifier',
  'm.verify.fpField': 'Code de preuve (sur le certificat, facultatif)',
  'm.verify.fpHelp':
    'Avec lui, cette page vérifie l’enregistrement par rapport au code que vous avez, pas seulement d’après la réponse du registre.',
  'm.verify.fpBad':
    'Un code de preuve fait 64 caractères, 0–9 et a–f. Laissez-le vide pour vérifier par l’identifiant seul.',
  'm.founders.label': 'Fondateurs',
  'm.founders.leads': 'Dirige',
  'm.founders.also': 'Également',
  'm.founders.languages': 'Langues',
  'm.mako.bio1':
    'Makoto (Mako) Steiner est cofondateur et CEO de VeilCore. Il dirige la stratégie commerciale, la levée de fonds et les prises de contact avec les institutions et les investisseurs dans le monde entier.',
  'm.mako.bio2': 'Il a étudié les sciences de l’environnement à Denison University et vit à Tokyo.',
  'm.mako.leads': 'Japon|UE|Organismes de normalisation|Développement commercial',
  'm.mako.also': 'Midnight Nightforce Leader (Japon) · Build Club, cohorte 1',
  'm.mako.languages': 'Anglais · Japonais',
  'm.hunter.bio1':
    'Hunter Roberts est cofondateur et COO de VeilCore. Il dirige le produit et le protocole VeilCore, du format d’enregistrement au smart contract sur Midnight. Il mène les prises de contact de VeilCore avec les institutions américaines, notamment les organismes de certification des semences, de normalisation et des variétés végétales.',
  'm.hunter.bio2':
    'Il vient du travail de terrain sur les plantes, notamment la sélection et la culture de tissus, et construit Chunk’s Trees, une installation de culture dans le New Jersey.',
  'm.hunter.leads': 'États-Unis|Protocole et spécification|Ingénierie',
  'm.hunter.also': 'Midnight Nightforce Leader (US) · Build Club, cohorte 1',
  'm.founders.band1': 'Parlez-nous. Nous',
  'm.founders.band2': 'préférons savoir où ça échoue',
  'm.founders.band3': 'plutôt qu’entendre que ça marche.',
  'm.founders.bandText':
    'Si vous dirigez un programme de sélection, un laboratoire, un organisme de certification des semences ou un organisme de protection des obtentions végétales, nous aimerions échanger avec vous. Le format est gratuit à implémenter et gratuit à vérifier.',
  'm.founders.emailBoth': 'Écrire aux deux fondateurs',
  'm.portraitOf': 'Portrait de {name}',
  'm.privacy.label': 'Confidentialité de la démo',
  'm.privacy.title': 'Ce que la démo conserve.',
  'm.privacy.lede':
    'Cette note concerne la démo de ce site. Il s’agit d’un test, sur le réseau de test de Midnight. Merci d’utiliser des données fictives.',
  'm.privacy.sum.local.t': 'Ne quitte jamais votre appareil non verrouillé',
  'm.privacy.sum.local.p':
    'Vos fichiers ADN et vos photos ne quittent jamais votre appareil. Les rapports de laboratoire voyagent verrouillés.',
  'm.privacy.sum.locked.t': 'Conservé verrouillé, nous ne pouvons pas le lire',
  'm.privacy.sum.locked.p':
    'Tout ce que vous saisissez dans un enregistrement, et les rapports qu’un laboratoire vous envoie.',
  'm.privacy.sum.read.t': 'Nous pouvons lire',
  'm.privacy.sum.read.p':
    'L’identifiant de l’enregistrement, le code de preuve, les dates et ce que vous choisissez de montrer. La liste complète est ci-dessous.',
  'm.privacy.full': 'La liste complète',
  'm.privacy.stored.title': 'Conservé sur notre serveur de test',
  'm.privacy.stored.text':
    'Vos enregistrements et accords, verrouillés par votre navigateur avant d’être envoyés : le nom de chaque enregistrement, obtenteur, espèce, dates, notes, numéros de référence, parents, les codes de preuve et noms de fichier des photos et rapports de laboratoire que vous ajoutez, conditions et contreparties des accords, la quantité et la note que vous envoyez à un laboratoire, les informations d’échantillon que vous et le laboratoire écrivez (identifiant d’échantillon, numéro de scellé, où et quand il a été prélevé, un témoin, son état à l’arrivée), les noms que vous donnez aux destinataires, et les clés secrètes de chaque enregistrement. Notre serveur les conserve verrouillés, et nous n’avons pas la clé : elle est dans votre navigateur et dans votre fichier de sauvegarde. La clé des informations d’échantillon se trouve aussi dans le code de laboratoire, pour que le laboratoire puisse les ouvrir. Si vous le choisissez, le nom d’un enregistrement voyage aussi dans un lien de vérification que vous créez, après le #. Un navigateur n’envoie pas cette partie quand il ouvre le lien, mais le lien va entier à toute personne à qui vous l’envoyez et à tout site où vous le collez, y compris le formulaire d’un partenaire. Notre serveur peut lire : l’identifiant de chaque enregistrement ; son code de preuve, son lien de clé et son type de profil ; un code fait à partir de son nom, qui ne dit rien du nom sans la clé de votre lien de vérification ; ses liens de correction (quel enregistrement une correction remplace, quels champs elle a modifiés, et quand) ; quand le serveur l’a vu pour la première fois ; combien de fois il a été enregistré, et quand pour la dernière fois ; à peu près sa taille (sa tranche de taille) ; ce que vous choisissez de montrer sur sa page de vérification (son nom, si vous choisissez de le montrer, et si un rapport ADN est enregistré, sous la forme d’un code qui ne dit rien du fichier sans la clé de votre lien de vérification) ; les liens de parenté que vous enregistrez ; et son lot avec son horodatage. Si un accord prévoit une redevance sur la descendance, notre serveur peut lire quel enregistrement il couvre et depuis quand il s’applique, et chacun peut demander si cet enregistrement en porte une : la vérification de lignée en a besoin. Pour un envoi : de quel enregistrement il vient, quel compte de détenteur l’a reçu, quand il a été reçu, et une étiquette à la place du nom du destinataire. Pour un envoi d’avant les étiquettes, le nom est tel qu’il a été saisi, jusqu’à ce que le nettoyage du registre le remplace. Pour les laboratoires : la clé publique de signature et les signatures qu’ils font. Les accusés de réception et les rapports d’un laboratoire sur votre enregistrement sont privés : notre serveur ne les montre qu’à vous, au laboratoire et à la personne qui lui a envoyé l’échantillon, sauf si vous choisissez de les montrer sur votre lien de vérification. Si vous montrez si un rapport ADN est enregistré, votre page de vérification indique aussi, pour chaque accusé de réception, qu’un laboratoire a reçu un échantillon et si ce qui est arrivé correspond à ce qui a été envoyé, sans le nom du laboratoire. La signature d’un laboratoire sur un rapport désigne le rapport lié à votre enregistrement avec une clé que seuls vous et le laboratoire détenez ; une signature faite avant le 17 octobre 2026 désigne le SHA-256 du fichier du rapport, que notre serveur ne montre qu’à vous, au laboratoire et à la personne qui lui a envoyé l’échantillon. Les demandes de prouver la clé d’un enregistrement, avec le nom saisi par le demandeur, pendant 7 jours : notre serveur apprend quelle clé sur la chaîne chaque demande désigne. Les pages de preuve et de vérification n’envoient jamais votre clé de détenteur. Votre clé de détenteur, que votre navigateur envoie à chaque enregistrement pour que le serveur retrouve vos enregistrements ; le serveur n’en garde qu’un condensé à sens unique. Les enregistrements faits avant le verrouillage restent lisibles pour nous jusqu’à ce que votre navigateur les verrouille, et le nom d’un enregistrement fait avant le verrouillage des noms reste lisible pour nous jusqu’à ce que votre navigateur enregistre de nouveau l’enregistrement. Les informations d’échantillon écrites avant le verrouillage restent lisibles pour nous jusqu’à ce que le registre les supprime. Nos sauvegardes externes faites avant gardent une copie lisible de tout cela jusqu’à ce que nous détruisions la clé qui les ouvre. Les rapports de laboratoire verrouillés qu’un laboratoire vous envoie : conservés verrouillés, sans la clé, et supprimés après 180 jours. Le serveur est le registre de test de VeilCore, hébergé chez Railway.',
  'm.privacy.local.title': 'Ne quitte jamais votre navigateur non verrouillé',
  'm.privacy.local.text':
    'Vos fichiers ADN ne quittent jamais votre appareil. Les rapports de laboratoire voyagent verrouillés. Votre navigateur lit les rapports ADN, rapports de laboratoire et photos que vous ajoutez pour faire un code de chacun ; les fichiers eux-mêmes ne sont jamais envoyés. Un rapport de laboratoire n’arrive sur notre serveur que lorsqu’un laboratoire vous le renvoie, verrouillé pour que vous seul puissiez l’ouvrir.',
  'm.privacy.test.title': 'Un réseau de test',
  'm.privacy.test.text':
    'La démo utilise le réseau de test de Midnight, pas le réseau en production. Les données de la démo peuvent être supprimées lorsque le réseau de test est réinitialisé.',
  'm.privacy.madeup.title': 'Utilisez des données fictives',
  'm.privacy.madeup.text':
    'Merci de ne saisir ni vrais noms, ni vraies variétés, ni rien de confidentiel. La démo sert à essayer le format.',
  'm.privacy.export.title': 'Export',
  'm.privacy.export.text':
    'Sur votre page d’enregistrements, sous « Plus » : « Exporter tous les enregistrements » télécharge les enregistrements que ce navigateur détient. « Télécharger vos enregistrements et accords depuis VeilCore » télécharge ce que notre serveur conserve pour eux, ouvert dans votre navigateur : vos enregistrements, accords, choix de partage et, pour chaque enregistrement, sa preuve et son lot. Il laisse de côté vos envois avec leurs informations d’échantillon, les rapports de laboratoire verrouillés, les redevances sur la descendance et les demandes de prouver la clé d’un enregistrement. Les envois, leurs informations d’échantillon et les rapports de laboratoire s’ouvrent depuis l’envoi dans l’application. La vérification de lignée répond pour les redevances, un enregistrement à la fois. Les demandes de preuve sont supprimées après 7 jours. Aucun des deux fichiers ne contient vos clés ni les clés secrètes de vos enregistrements : elles sont dans votre fichier de sauvegarde.',
  'm.privacy.delete.title': 'Suppression',
  'm.privacy.delete.text':
    'Pour faire supprimer vos données de démo de notre serveur, écrivez à hunter@veilcore.org en indiquant les identifiants de vos enregistrements.',
  'm.privacy.browser.title': 'Conservé dans votre navigateur',
  'm.privacy.browser.text':
    'Votre navigateur conserve, sur cet appareil : votre clé de détenteur (une copie est aussi envoyée à notre serveur, voir plus haut) ; la clé qui verrouille vos enregistrements, qui ne nous est jamais envoyée ; votre propre copie de vos enregistrements ; les clés secrètes de chaque enregistrement, qui verrouillent ses rapports de laboratoire (une copie verrouillée part aussi avec l’enregistrement) ; les codes de laboratoire que vous créez ou utilisez, avec un code de retrait et la clé des informations d’un envoi ; la clé de signature d’un laboratoire si vous en avez configuré une (sa partie privée ne nous est jamais envoyée) ; le rôle choisi ; et votre langue. Votre fichier de sauvegarde contient une copie de chaque clé et des codes de laboratoire que vous avez créés. Pour les supprimer, effacez les données de ce site dans les réglages de votre navigateur. Enregistrez d’abord votre sauvegarde : sans elle, vous ne pourrez plus retrouver ni ouvrir vos enregistrements.',
  'm.privacy.deviceonly.title': 'Un document gardé uniquement sur cet appareil',
  'm.privacy.deviceonly.text':
    'Quand vous scellez un document, vous pouvez choisir de garder son enregistrement uniquement sur cet appareil et dans votre fichier de sauvegarde. Alors rien de ce que vous y saisissez n’est envoyé à notre serveur, verrouillé ou non. Ce que nous recevons : l’identifiant de l’enregistrement, son code de preuve et sa liaison de clé, pour qu’il puisse être daté ; votre adresse réseau et l’heure, comme pour toute requête ; et, si vous avez une copie avec clé d’accès, l’identifiant et les clés de l’enregistrement dans cette copie verrouillée. Si vous choisissez d’horodater la clé de l’enregistrement, un code tiré de la clé part vers Midnight par notre service de frais. Une exception, et seulement si vous la choisissez : si vous prouvez l’un de ses chiffres, un fait sur ce chiffre part vers Midnight par notre service de frais et reste public pour toujours. C’est le seuil que vous fixez et son sens ou, si vous prouvez le chiffre exact, le chiffre lui-même. Rien de cela ne va à notre registre. Mais ce que vous prouvez est public, et nous, ainsi que toute personne ayant le lien de vérification de l’enregistrement, pouvons le rattacher à l’enregistrement ; nous pouvons aussi le rattacher à la clé de détenteur qui l’a daté. Nous ne pouvons pas vous rendre un tel enregistrement : les seules copies sont dans votre navigateur et dans un fichier de sauvegarde enregistré après le scellement, et l’application vous demande aussitôt d’en enregistrer un et de le vérifier. Toute personne à qui vous envoyez son lien de vérification et le fichier peut toujours le vérifier. Le choix se fait au scellement et ne peut pas être modifié ensuite.',
  'm.privacy.deals.title': 'Accords et redevances',
  'm.privacy.deals.text':
    'Les messages d’un accord de licence (les conditions, chaque rapport de redevances, sa réponse, « j’ai payé », « reçu », les rappels et avis, et les coordonnées de paiement et d’entreprise du concédant) sont verrouillés avec une clé que seules les deux parties partagent, créée quand elles se lisent le code à 6 chiffres. Notre serveur les conserve verrouillés et les transmet : il ne peut ni les lire, ni les modifier, ni les contrefaire. Il voit à quelle licence un accord appartient, combien de messages il compte et quand chacun est arrivé. Les coordonnées de paiement (un compte bancaire, un lien de paiement ou une adresse Midnight) et les coordonnées d’entreprise (nom légal, adresse et numéro fiscal) voyagent dans ces messages verrouillés : l’autre partie peut les lire, pas nous. Chaque copie que vous téléchargez ou sauvegardez (la trace signée d’un accord, votre fichier de sauvegarde) les contient en clair ; traitez donc ces fichiers comme un relevé bancaire. Le reçu d’un partenaire de paiement peut être lu par quiconque détient le code de preuve du relevé ; seules les deux parties et leur partenaire l’ont. Nous gardons les messages d’un accord jusqu’à ce qu’une partie nous demande de les supprimer ; l’autre partie garde sa propre copie. La licence elle-même est sur Midnight : voir « Ce qui va sur Midnight ».',
  'm.privacy.chain.title': 'Ce qui va sur Midnight, pour toujours',
  'm.privacy.chain.text':
    'Midnight est un réseau public : ce qui y va ne peut être ni modifié ni retiré par personne, nous compris, et tout le monde peut le lire. Votre génétique, vos conditions, votre nom et vos fichiers n’y vont jamais. Ce qui y va : le code de preuve de chaque lot d’enregistrements ; la clé propre d’un enregistrement et son horodatage ; un code tiré d’un rapport ADN, quand vous datez son association ; quels enregistrements sont liés comme parent et enfant, une fois que les deux détenteurs confirment (un lien ne peut pas être défait) ; qu’un enregistrement porte une licence, une obligation ou une mention de prêteur, et quand cela a changé ; la clé publique d’un laboratoire quand il y signe un certificat ; une valeur que vous choisissez de prouver exactement, en entier ; et, là où ce site permet de payer une redevance en NIGHT, le montant et les deux adresses. Avant chacune de ces étapes, l’application affiche un reçu qui liste exactement ce que l’étape rend public. Un code ou une clé seuls ne disent rien de vous, mais quiconque reçoit de vous un lien de vérification peut suivre dès lors ce qui arrive à cet enregistrement sur le réseau.',
  'm.privacy.timestamps.title': 'Horodatages, et travailler sans réseau',
  'm.privacy.timestamps.text':
    'Quand notre serveur reçoit le code de preuve d’un enregistrement, il demande à un ou plusieurs services d’horodatage (des services indépendants, certains tenus par une seule personne) un jeton d’horodatage dessus, et sur chaque lot. Chaque service reçoit un code tiré du code de preuve et l’heure de la demande, et peut en garder un journal ; comme les codes de preuve figurent sur les pages de vérification, un service pourrait rapprocher son journal d’un lien de vérification. Toute personne ayant un lien de vérification peut lire, à la seconde, quand notre serveur a reçu le code de preuve de cet enregistrement. Pour un enregistrement scellé sans réseau, c’est le moment où votre appareil a retrouvé du réseau. La page donne d’abord la minute ; le jeton lui-même porte la seconde. Pour s’ouvrir sans réseau, votre navigateur garde une copie du code de ce site et, là où il peut envoyer tout seul (Chrome), les codes de preuve en attente d’envoi et la clé avec laquelle ils partent. Cette copie est supprimée quand vous recommencez ou effacez les données de ce site.',
  'm.privacy.helper.title': 'L’assistant et son modèle facultatif',
  'm.privacy.helper.text':
    '« Demander », l’assistant de l’application, là où ce site le propose, fonctionne sur votre appareil. Rien de ce que vous y tapez n’est envoyé nulle part ; seul le bouton Enregistrer de l’application envoie quelque chose, et cela part verrouillé vers notre serveur, comme décrit plus haut. Là où ce site propose le modèle de langue facultatif, il est téléchargé une fois depuis Hugging Face, une société distincte : Hugging Face voit votre adresse IP, l’heure, quels fichiers du modèle et que la demande vient de ce site ; nous voyons qu’un téléchargement a commencé. Le modèle tourne sur votre appareil, dans une partie de la page qui ne peut pas atteindre le réseau ; rien de ce que vous tapez n’atteint Hugging Face ni nous, ni à ce moment ni plus tard. Vous pouvez supprimer le modèle depuis le panneau de l’assistant. Son « Faites-le pour moi » garde une trace de chaque tâche sur votre appareil seulement, jamais dans une sauvegarde : les étapes et leur avancement, des références aux enregistrements et accords concernés, et les chiffres que vous saisissez pour un rapport jusqu’à son envoi ; jamais ce que vous avez écrit pour demander. Elle est supprimée 7 jours après la fin de la tâche. Tant qu’une tâche attend votre accord, ses nouveaux enregistrements restent verrouillés dans votre navigateur, avec leurs clés ; une sauvegarde faite entre-temps contient aussi ces clés. Préparer les rapports lit les messages de chacun de vos accords sur notre serveur, l’un après l’autre : notre serveur peut donc voir que ces accords ont été lus ensemble ; rien n’est envoyé avant que vous validiez.',
  'm.privacy.hosts.title': 'Hébergement',
  'm.privacy.hosts.text':
    'Ce site est hébergé chez Vercel, qui enregistre les adresses IP et les requêtes. Notre serveur de registre fonctionne chez Railway, qui enregistre les requêtes.',
  'm.privacy.who.title': 'Qui les conserve, et combien de temps',
  'm.privacy.who.text':
    'VeilCore n’est pas encore constituée en société ; les fondateurs de VeilCore exploitent ce site et le registre. Les rapports de laboratoire verrouillés sont supprimés 180 jours après leur arrivée. Les demandes de prouver la clé d’un enregistrement sont supprimées après 7 jours. Rien d’autre n’a de durée de conservation fixée : tout reste jusqu’à ce que vous nous demandiez de le supprimer. Contact : hunter@veilcore.org.',
  'm.notfound.title': 'Page introuvable.',
  'm.notfound.text':
    'Il n’y a pas de page à cette adresse. Si quelqu’un vous a donné un lien vers un enregistrement, vérifiez qu’il est complet.',
  'm.notfound.home': 'Accueil de VeilCore →',
  'm.homescreen.title': 'Ouvrir vos enregistrements',
  'm.homescreen.text': 'Voici VeilCore sur votre écran d’accueil. Il a son propre stockage, séparé de Safari.',
  'm.homescreen.lost': 'Rien n’a été perdu. Récupérez ici vos enregistrements avec votre fichier de sauvegarde.',
  'm.homescreen.restore': 'Récupérer mes enregistrements',
  'm.homescreen.fresh': 'Nouveau sur VeilCore ? Commencer ici',
  'm.homescreen.safari':
    'Pas de fichier de sauvegarde sous la main ? Si vous avez utilisé VeilCore dans Safari sur cet appareil, vos enregistrements y sont toujours.',
  'm.privacy.contact': 'Questions : hunter@veilcore.org',
  // Round 2 truth pass (14 Oct 2026): keys added or newly translated.
  'm.hero.lede':
    'Pour les obtenteurs, les éleveurs, les semenciers et les laboratoires qui travaillent sur la génétique végétale, animale et microbienne : donnez à vos enregistrements une date que personne ne peut antidater. Vos données génétiques restent verrouillées : les fichiers ADN ne quittent jamais votre ordinateur, et ce que vous saisissez arrive verrouillé sur notre serveur. Seuls des codes de preuve vont sur Midnight, qui les date.',
  'm.for.3p':
    'Envoyez du matériel avec un code laboratoire. Le laboratoire signe un accusé de réception avec sa propre clé, et l’enregistrement montre ainsi une seconde partie. L’accusé est une vraie signature, conservée par le registre de VeilCore, pas sur la chaîne. Des conditions comme l’interdiction de multiplier ne sont qu’un exercice dans la démo web.',
  'm.get.1b': 'pour un enregistrement de ce que vous détenez, sans montrer votre génétique.',
  'm.get.3b':
    'Un lien de parenté ne compte que si les deux détenteurs le confirment. Sur ce site, c’est le registre de VeilCore qui l’enregistre, pas la chaîne.',
  'm.open.2t': 'Gardez un seul fichier.',
  'm.open.2p':
    'Sur la page de votre enregistrement : « Télécharger le dossier de preuve ». Un seul .zip avec l’enregistrement tel qu’il a été scellé, sa preuve d’inclusion, le code de preuve du lot, l’endroit où le lot a été inscrit, le fichier d’horodatage Bitcoin s’il y en a un, et une page qui vérifie le tout hors ligne. Votre fichier de sauvegarde contient vos clés, pas ces fichiers. Les fichiers séparés restent sous « Détails techniques » : « Exporter l’enregistrement », « Télécharger la preuve d’inclusion », « Télécharger le fichier d’horodatage Bitcoin ».',
  'm.faq.1a':
    'Une fois les enregistrements ancrés, chacun peut vérifier lequel a été ancré en premier. Associez votre rapport de laboratoire, pour qu’un test ultérieur puisse y être comparé. Quand vous envoyez du matériel, le destinataire signe un accusé de réception avec sa propre clé. Un enregistrement est une preuve, pas une inscription : il montre que vous déteniez déjà cet enregistrement à cette date, pas que vous déteniez le matériel, et ne tranche pas un litige à lui seul.',
  'm.post0.date': '4 oct. 2026',
  'm.post0.tag': 'Smart contract',
  'm.post0.title': 'Prouver un fait, garder le reste',
  'm.post0.text':
    'Les deux smart contracts ont passé les 37 vérifications de bout en bout sur le réseau de test preprod de Midnight, y compris les nouvelles preuves d’un fait : une valeur, une plage, une différence, une correction qui laisse le reste inchangé et une signature d’une clé de laboratoire de test. Données de marqueurs fictives.',
  'm.postA.date': '8 oct. 2026',
  'm.postA.tag': 'Lancement',
  'm.postA.title': 'En service sur le réseau principal de Midnight',
  'm.postA.text':
    'Les deux smart contracts sont déployés sur le réseau principal de Midnight. Le contrat des preuves d’un fait n’a pas de clé de maintenance : personne, nous compris, ne peut le modifier.',
  'm.postG.date': '16 nov. 2026',
  'm.postG.tag': 'Enregistrements',
  'm.postG.title': 'Une chaîne de production, étape par étape',
  'm.postG.text':
    'Un lot de culture et un lot de récolte sont maintenant des enregistrements à part entière, chacun nommant le précédent : la plante, le lot de culture, le lot de récolte, le rapport de laboratoire. Chacun a sa propre date. Un lien peut transporter la chaîne, pour que la personne qui le vérifie puisse ouvrir chaque étape. Les liens sont la déclaration du détenteur ; la date de chaque enregistrement est vérifiée sur Midnight. Essayé pour la première fois sur veilcore.org le 16 novembre 2026.',
  'm.postF.date': '16 nov. 2026',
  'm.postF.tag': 'Confidentialité',
  'm.postF.title': 'Garder un document sur votre appareil seulement',
  'm.postF.text':
    'En scellant un document, vous pouvez maintenant le garder sur cet appareil et dans votre fichier de sauvegarde seulement. Rien de ce que vous saisissez n’est envoyé, chiffré ou non : le registre de VeilCore reçoit l’identifiant de l’enregistrement, son code de preuve et le lien de sa clé, pour pouvoir le dater. Scellé, daté et vérifié pour la première fois sur veilcore.org le 16 novembre 2026.',
  'm.postE.date': '2 nov. 2026',
  'm.postE.tag': 'Preuve',
  'm.postE.title': 'Un dossier de preuve pour tout document',
  'm.postE.text':
    'La page d’un document télécharge désormais un fichier qu’un avocat ou un examinateur peut vérifier sans notre site : l’enregistrement tel que scellé, sa preuve, où il a été daté, une page qui fait les vérifications hors ligne, un résumé à imprimer et un modèle de déclaration. Vous pouvez y joindre une copie du document ; elle est d’abord comparée à l’enregistrement.',
  'm.postD.date': '31 oct. 2026',
  'm.postD.tag': 'Site web',
  'm.postD.title': 'Sceller un document',
  'm.postD.text':
    'Permis, certificats, contrats : votre ordinateur calcule le code du fichier, et seul le code de preuve de l’enregistrement est daté sur Midnight. Le fichier ne quitte jamais votre appareil. Envoyez un lien de vérification avec le fichier : celui qui le reçoit voit que c’est le même fichier, octet pour octet, et quand vous l’aviez.',
  'm.postC.date': '19 oct. 2026',
  'm.postC.tag': 'Site web',
  'm.postC.title': 'Votre navigateur envoie ses propres transactions',
  'm.postC.text':
    'Sur veilcore.org, votre navigateur date désormais lui-même l’association d’un rapport ADN, prouve un enregistrement par lien et horodate la clé propre d’un enregistrement, et VeilCore paie les frais de réseau. Les enregistrements sont regroupés en lots et datés sur le réseau principal de Midnight. Aucun portefeuille nécessaire.',
  'm.postB.date': '11 oct. 2026',
  'm.postB.tag': 'Registre',
  'm.postB.title': 'Premier lot daté aussi sur Bitcoin',
  'm.postB.text':
    'Les premiers lots du registre ont été ancrés à la main sur le réseau principal de Midnight. L’un d’eux, cinq de nos propres enregistrements de test, a aussi sa racine horodatée sur Bitcoin, dans le bloc 971004. Vérifié le 15 octobre avec deux explorateurs de blocs : l’horodatage mène aux blocs Bitcoin 971004 et 971005. Une vérification avec l’outil officiel OpenTimestamps et un nœud Bitcoin complet reste à faire.',
  'm.founders.lede':
    'VeilCore est un format d’enregistrement probatoire pour la génétique végétale, animale et microbienne. Il prouve que vous déteniez déjà un enregistrement de votre matériel à une date donnée, sans remettre vos données génétiques.',
  'm.live.label': 'Ce qui marche où',
  'm.live.title1': 'Ce qui fonctionne,',
  'm.live.title2': 'et où.',
  'm.live.lede':
    'veilcore.org fonctionne sur le réseau principal de Midnight, et les enregistrements qui y sont faits sont réels. Le site de test sert à s’entraîner, et ses enregistrements n’ont aucune valeur probante. Certaines fonctions y sont essayées d’abord.',
  'm.live.colMain': 'veilcore.org (réseau principal)',
  'm.live.colTest': 'test.veilcore.org',
  'm.live.colNot': 'Pas encore',
  'm.live.stamp.t': 'Un horodatage pour votre enregistrement',
  'm.live.stamp.main': 'Oui, par lots datés sur Midnight. Votre navigateur n’envoie rien à la chaîne.',
  'm.live.stamp.test':
    'Oui. Les lots sont datés automatiquement, ce qui date votre enregistrement. Votre navigateur horodate aussi la clé propre à votre enregistrement ; cet horodatage ne date que la clé.',
  'm.live.share.t': 'Choisir ce que les autres voient',
  'm.live.share.main':
    'Oui. Vous choisissez chaque information. Le nom n’apparaît que dans les liens que vous envoyez, ou si vous choisissez de l’afficher.',
  'm.live.share.test':
    'Oui. Vous choisissez chaque information. Le nom n’apparaît que dans les liens que vous envoyez, ou si vous choisissez de l’afficher.',
  'm.live.lab.t': 'Code de laboratoire et accusé signé',
  'm.live.lab.main':
    'Oui. Le laboratoire signe avec sa propre clé. Le registre de VeilCore conserve l’accusé, pas la chaîne.',
  'm.live.lab.test': 'Oui, de la même façon.',
  'm.live.results.t': 'Rapports de laboratoire verrouillés pour vous',
  'm.live.results.main': 'Oui. Nouveau, encore en test.',
  'm.live.results.test': 'Oui. Nouveau, encore en test.',
  // Numbers and results a lab signs (config/network.ts LAB_SIGNING_ENABLED). The veilcore.org cell
  // says 'main' until it has worked there (config/copy.ts LAB_SIGNING_RUN_ON_MAINNET), then 'live'.
  'm.live.signed.t': 'Chiffres et résultats signés par un laboratoire',
  'm.live.signed.main': 'Construit, mais pas encore essayé sur le réseau principal.',
  'm.live.signed.test':
    'Oui. Le laboratoire signe avec sa propre clé. Seuls le détenteur de l’enregistrement, le laboratoire et la personne qui lui a envoyé l’échantillon le voient, et seul le détenteur peut le montrer à d’autres.',
  'm.live.signed.live':
    'Oui. Le laboratoire signe avec sa propre clé. Seuls le détenteur de l’enregistrement, le laboratoire et la personne qui lui a envoyé l’échantillon le voient, et seul le détenteur peut le montrer à d’autres. Ajouter le fichier de résultat d’un laboratoire aux enregistrements d’un autre obtenteur : oui, depuis le 21 novembre 2026.',
  'm.live.local.t': 'Un document gardé uniquement sur votre appareil',
  'm.live.local.main': 'Construit, mais pas encore essayé sur le réseau principal.',
  'm.live.local.test':
    'Oui, pour les enregistrements de documents. Rien de ce que vous saisissez n’est envoyé à VeilCore : seulement l’identifiant de l’enregistrement, son code de preuve et sa liaison de clé. La seule exception est un fait que vous choisissez de prouver (ligne suivante).',
  'm.live.local.live':
    'Oui, pour les enregistrements de documents. Rien de ce que vous saisissez n’est envoyé à VeilCore : seulement l’identifiant de l’enregistrement, son code de preuve et sa liaison de clé. La seule exception est un fait que vous choisissez de prouver (ligne suivante).',
  'm.live.docchain.t': 'Une chaîne de production en enregistrements liés',
  'm.live.docchain.main': 'Construit, mais pas encore essayé sur le réseau principal.',
  'm.live.docchain.test':
    'Construit, mais pas encore essayé. Un enregistrement d’origine, un lot de culture, un lot de récolte et un rapport de laboratoire nomment chacun le précédent, et chacun a sa date. Les liens sont la déclaration du détenteur.',
  'm.live.docchain.live':
    'Oui. Un enregistrement d’origine, un lot de culture, un lot de récolte et un rapport de laboratoire nomment chacun le précédent, et chacun a sa date. Les liens sont la déclaration du détenteur ; ni VeilCore ni Midnight ne les vérifient.',
  'm.live.localclaims.t': 'Prouver un fait tiré d’un document gardé sur votre appareil',
  'm.live.localclaims.main': 'Construit, mais pas encore essayé sur le réseau principal.',
  'm.live.localclaims.test':
    'Construit, mais pas encore essayé. À vous de choisir ; désactivé tant que vous ne l’activez pas. Ce que vous prouvez est public sur Midnight ; rien ne va au registre de VeilCore, mais VeilCore peut rattacher ce que vous prouvez à l’enregistrement.',
  'm.live.localclaims.live':
    'Oui. À vous de choisir ; désactivé tant que vous ne l’activez pas. Ce que vous prouvez est public sur Midnight ; rien ne va au registre de VeilCore, mais VeilCore peut rattacher ce que vous prouvez à l’enregistrement.',
  'm.live.dna.t': 'Une date pour l’association de votre rapport ADN',
  'm.live.dna.main': 'Conservée avec votre enregistrement, non datée.',
  'm.live.dna.test': 'Oui, envoyée depuis votre navigateur.',
  'm.live.prove.t': 'Le prouver par un lien',
  'm.live.prove.test':
    'Oui. Leur page vérifie sur le réseau que vous contrôlez la clé propre à l’enregistrement. L’enregistrement a nommé cette clé au moment où il a été scellé : elle ne peut donc pas être remplacée.',
  'm.live.prove.not': 'Sur veilcore.org : il faut que votre navigateur envoie une transaction.',
  'm.live.claims.t': 'Prouver un fait',
  'm.live.claims.main': 'Sur le réseau principal, sans clé de maintenance. Le site ne peut pas encore l’utiliser.',
  'm.live.claims.not': 'L’utiliser depuis le site.',
  'm.live.claims.live':
    'Oui, depuis un ordinateur : prouver un fait tiré d’un certificat ou d’un résultat de laboratoire scellé sans montrer le reste. Pas encore essayé sur téléphone.',
  'm.live.lic.t': 'Licences et redevances',
  'm.live.lic.main': 'Désactivé jusqu’à un dernier essai complet.',
  'm.live.lic.test': 'Oui, avec de vraies transactions : redevances, paiements, transmission d’une licence.',
  'm.live.lic.not': 'Sur veilcore.org, après un dernier essai complet.',
  // The veilcore.org cell until royalties v2 has worked on mainnet (config/copy.ts ROYALTIES_RUN_ON_MAINNET).
  'm.live.lic.mainNext':
    'Les licences sont mises en service avec le déploiement qui les active, une fois qu’une vraie licence aura fonctionné de bout en bout sur le réseau principal. Relevés de redevances et paiements : construits, pas encore en service.',
  // The test-site cell until royalties v2 has run there (config/copy.ts ROYALTIES_RUN_ON_TEST).
  'm.live.lic.testNext':
    'Oui pour les licences, avec de vraies transactions. Rapports de redevances (ils ont fonctionné sur veilcore.org) et paiement des redevances sur Midnight même : construits et proposés ici ; sur ce réseau, ils n’ont pas encore fonctionné de bout en bout.',
  // Licenses on in code, on a build that isn't veilcore.org's (the test site, the demo): the main-network cell.
  'm.live.lic.next':
    'Construit. Mis en service avec le prochain déploiement de veilcore.org, une fois qu’une vraie licence aura fonctionné de bout en bout sur le réseau principal.',
  // Licenses on, on veilcore.org's own build (AGREEMENTS_LIVE, mainnet sponsor live): the main-network cell (components/site/Home.tsx).
  'm.live.lic.live':
    'Oui : licences, avec de vraies transactions, et rapports de redevances avec leur réponse, « J’ai payé » et « Réception confirmée ». La transmission d’une licence est construite, mais pas encore essayée sur le réseau principal. Payer les redevances sur Midnight même n’est proposé que sur le site de test, et n’y a pas encore fonctionné de bout en bout.',
  'm.live.chain.t': 'La page de vérification lit Midnight elle-même',
  'm.live.chain.main': 'Pas encore : il faut notre relais en lecture seule.',
  'm.live.chain.test': 'Oui.',
  // Round 3 (14 Oct 2026): the rest of the landing page, so no English shows through.
  'nav.newCultivar': 'Nouvel enregistrement',
  'nav.licenses': 'Accords',
  'footer.about': 'Un format d’enregistrement ouvert pour la génétique végétale, animale et microbienne.',
  'footer.howCheck': 'Comment fonctionne la vérification →',
  'm.hero.status':
    'Lancement sur le réseau principal de Midnight. Aujourd’hui, les enregistrements sont datés sur un réseau de test de Midnight, ce qui ne prouve encore rien.',
  'm.claims.status':
    'Un second smart contract Midnight, testé de bout en bout sur le réseau de test preprod de Midnight le 4 octobre 2026 avec des données de marqueurs fictives. Il n’est encore ni dans cette démo web ni sur le réseau principal.',
  'm.faq.3a':
    'Il est conçu pour servir de preuve, et notre note pour les juristes dit ce qu’il prouve et ce qu’il ne prouve pas. Aujourd’hui, les enregistrements sont datés sur un réseau de test de Midnight, et une date sur un réseau de test n’a aucune valeur probante. Le lancement sur le réseau principal est proche.',
  'm.stat2.b': 'Réseau de test',
  'm.stat2.s':
    'Les deux smart contracts testés de bout en bout sur un réseau de test de Midnight. Pas encore sur le réseau principal.',
  'm.foot.about':
    'Un format d’enregistrement ouvert pour la génétique végétale, animale et microbienne. Conçu pour s’ancrer sur Midnight ; en test sur un réseau de test de Midnight.',
  'm.for.2p':
    'Les obtenteurs veulent utiliser leurs marqueurs pour montrer qu’une variété est distincte, et les gardent comme secrets d’affaires. Une preuve VeilCore démontre un fait à leur sujet sans montrer le reste. Aucun office d’examen ni organisme de certification ne l’accepte encore.',
  'm.hero.note':
    'Tapez dans l’un ou l’autre champ ; rien n’est envoyé. La bande dorée en bas est le code de preuve, la partie qui va sur Midnight. Personne ne peut remonter de celle-ci à ce que vous avez saisi.',
  'm.hero.noteShort': 'Seule la bande dorée va sur Midnight.',
  'm.hero.stampWord': 'Daté',
  'm.hero.stampLine': 'sur Midnight',
  'm.home.try': 'Essayez. Rien n’est envoyé.',
  'm.home.tryNote':
    'Le dessin ci-dessus est tracé à partir de ce code de preuve. Personne ne peut remonter de celui-ci à ce que vous avez saisi.',
  'm.home.audLabel': 'Pour qui',
  'm.home.audience':
    'Obtenteurs et éleveurs|Semenciers|Laboratoires de culture in vitro|Certificateurs|Examinateurs|Livres généalogiques|Offices des variétés végétales',
  'm.home.keep.t': 'Votre génétique reste chez vous.',
  'm.home.keep.p':
    'Seuls des codes de preuve vont sur Midnight, jamais ce que vous avez saisi ni vos fichiers. Le code d’un enregistrement fait 64 caractères que votre ordinateur calcule à partir de celui-ci, et personne ne peut en remonter à la plante, aux marqueurs ou au nom.',
  'm.home.tlDated': 'Enregistrement daté',
  'm.home.tlAsks': 'Quelqu’un demande',
  'm.home.matters': 'Là où ça compte.',
  'm.home.prev': 'Précédent',
  'm.home.next': 'Suivant',
  'm.home.custody.t': 'Nous ne pouvons pas lire vos enregistrements : ils nous arrivent verrouillés.',
  'm.home.custody.p1':
    'Enregistrer le matériel lui-même, c’est le remettre. Avec VeilCore, vos fichiers ADN ne quittent jamais votre ordinateur.',
  'm.home.custody.p2':
    'Les informations de l’enregistrement arrivent verrouillées sur notre serveur, le nom compris, et nous n’avons pas la clé.',
  'm.home.ex.label': 'Un enregistrement d’exemple, pas un vrai.',
  'm.home.ex.dna': 'Rapport ADN',
  'm.home.l2': 'Son code de preuve : 64 caractères, calculés sur votre ordinateur.',
  'm.home.l3': 'Votre code rejoint un lot avec d’autres. Le bloc où il arrive en donne la date.',
  'm.home.l3b': 'Un lot, de nombreux enregistrements',
  'm.home.l4v': 'L’enregistrement existait déjà à cette date.',
  'm.home.l4': 'Tout le monde peut le vérifier, gratuitement et sans compte.',
  'm.home.more': 'Plus qu’une date.',
  'm.home.f1t': 'Plantes, animaux et souches.',
  'm.home.f1p':
    'Cultivars et lignées, animaux individuels et lignées d’élevage, microbes, champignons et lignées cellulaires.',
  'm.home.f2t': 'Documents.',
  'm.home.f2p':
    'Scellez un permis, un certificat, un contrat ou un rapport de laboratoire. Le fichier lui-même reste sur votre appareil.',
  'm.home.ask.t': '« Demander », en mots simples.',
  'm.home.ask.p':
    'Sur les pages des enregistrements, « Demander » remplit un enregistrement, ou un lot de boutures ou de descendants, que vous vérifiez ensuite. Il ne signe et n’envoie jamais rien. C’est vous qui le faites.',
  'm.home.trustLabel': 'Ce que cela vous apporte',
  'm.home.trust':
    'Preuve que vous déteniez déjà un enregistrement à une date|Une date que personne ne peut antidater|Vérifier est gratuit|Un format ouvert|Sans portefeuille, sans inscription',
  'm.home.pause': 'Mettre en pause le défilement',
  'm.home.play': 'Reprendre le défilement',
  'm.home.fails': 'Dites-nous où ça ne va pas.',
  'm.home.closeLede':
    'Obtenteurs, éleveurs, laboratoires, certificateurs et développeurs : créez un enregistrement, puis dites-nous ce qui manque pour votre travail.',
  'm.home.photos': 'Photos sur Unsplash :',
  'm.home.alt.jar': 'Une graine qui germe au-dessus d’un bocal d’eau, racines dans l’eau',
  'm.home.alt.cutting': 'Une bouture qui s’enracine dans un bocal d’eau, au soleil',
  'm.home.alt.greenhouse': 'Des rangées de jeunes plants dans une longue serre',
  'm.home.alt.lab': 'Une paillasse de laboratoire avec des pipettes et des tubes d’échantillons',
  'm.home.alt.hand': 'Une main tenant un jeune plant au-dessus de plateaux de semis',
  'm.home.alt.cattle': 'Des bovins qui mangent du foin ensemble',
  'm.for.label': 'À quoi ça sert',
  'm.for.title1': 'Beaucoup de litiges sur la génétique se ramènent à une question :',
  'm.for.title2': 'qu’aviez-vous, et quand ?',
  'm.for.lede':
    'Les carnets et les fichiers sont datés par ceux qui les tiennent, ils sont donc faciles à mettre en doute. Enregistrer le matériel lui-même, c’est remettre ce que vous cherchez à protéger.',
  'm.for.1t': 'Une bouture disparaît.',
  'm.for.1p':
    'Scellez un enregistrement et associez-y son rapport ADN. Si la plante réapparaît sous un autre nom, un laboratoire peut comparer un nouveau test avec votre rapport. Dans la démo web, l’association est enregistrée avec votre enregistrement mais pas encore datée. VeilCore ne fait pas de tests ADN.',
  'm.for.2t': 'Protection des obtentions et certification.',
  'm.for.2link': 'Comment fonctionne une preuve →',
  // The lab slide's way in (lab/LabDoor.tsx), and on How it works.
  'm.for.3link': 'Vous dirigez un laboratoire ? Configurez la clé de signature de votre laboratoire →',
  'm.for.3t': 'Du matériel entre les mains d’un laboratoire.',
  'm.for.4t': 'Les résultats du laboratoire, renvoyés vers vous.',
  'm.for.4p':
    'Le laboratoire signe votre rapport et le verrouille pour que vous seul puissiez l’ouvrir. Aucun PDF ne traîne dans une boîte de réception. Le fichier verrouillé attend sur le serveur de VeilCore que vous l’ouvriez, et nous n’avons pas sa clé. VeilCore enregistre qui a signé ; il ne se porte pas garant du résultat. Nouveau, encore en test.',
  'm.for.6t': 'Quelqu’un demande une preuve.',
  'm.for.6p':
    'On vous envoie un lien. Vous touchez une fois, et la page de votre interlocuteur vérifie sur le réseau que vous contrôlez la clé propre à votre enregistrement. Votre enregistrement a nommé cette clé au moment où il a été scellé : elle ne peut donc pas être remplacée. Cela ne dit rien de qui vous êtes ni de qui a obtenu la plante. Cela fonctionne pour l’instant sur un réseau de test de Midnight.',
  'm.for.5t': 'Lignées animales.',
  'm.for.5p':
    'Les livres généalogiques tiennent le pedigree. Un enregistrement peut donner à chaque entrée une date que personne ne peut antidater, sans publier le génotype. Sur ce site, vous pouvez enregistrer un animal : son numéro d’identification individuel, son père et sa mère, et un rapport ADN.',
  'm.for.5ask': 'Si vous élevez des animaux, dites-nous ce dont vos enregistrements ont besoin.',
  'm.how.label': 'Comment ça marche',
  'm.how.title1': 'Quatre étapes.',
  'm.how.title2': 'La génétique reste chez vous.',
  'm.step1.title': 'Le noter',
  'm.step1.text':
    'Ce que c’est et d’où ça vient. Le serveur de VeilCore conserve les détails verrouillés, le nom compris, et nous n’avons pas la clé. Un lien de vérification ne porte le nom que si vous l’activez, pour les personnes à qui vous l’envoyez.',
  'm.step2.title': 'En faire le code de preuve',
  'm.step2.text': 'Sur votre ordinateur. Les données génétiques ne le quittent jamais déverrouillées.',
  'm.step3.title': 'Obtenir une date',
  'm.step3.text':
    'Seul le code de preuve va sur Midnight, dans un lot avec d’autres. La date est celle du bloc où arrive le lot : elle montre que l’enregistrement existait déjà à ce moment-là.',
  'm.step4.text':
    'Donnez-le à un acheteur, un examinateur ou un tribunal. Ils peuvent le vérifier gratuitement, sans compte.',
  'm.claims.label': 'Prouver un fait',
  'm.claims.1s': '1 affichée · 15 scellées',
  'm.claims.2s': '1 fait · 16 scellées',
  'm.claims.3s': '≥ 6 diffèrent',
  'm.claims.4s': '15 inchangées',
  'm.claims.5s': '1 clé a signé',
  'm.claims.fixed': 'corrigée',
  'm.claims.title1': 'Partager la preuve,',
  'm.claims.title2': 'pas les données.',
  'm.claims.lede':
    'Un enregistrement peut sceller jusqu’à seize valeurs, comme des résultats de marqueurs ou un taux de germination. Plus tard, vous prouvez un fait à leur sujet. Rien d’autre n’est montré.',
  'm.claims.1t': 'Une valeur est bien ce que vous dites.',
  'm.claims.1p': 'Cette seule valeur est montrée. Les autres restent scellées.',
  'm.claims.2t': 'Un nombre atteint un seuil.',
  'm.claims.2p': 'Par exemple, une germination d’au moins 95 %. Le nombre lui-même reste caché.',
  'm.claims.3t': 'Deux variétés diffèrent.',
  'm.claims.3p':
    'Sur au moins un nombre fixé de valeurs de marqueurs. Lesquelles diffèrent reste privé. Savoir si cela rend une variété distincte relève de l’examinateur, pas de nous.',
  'm.claims.4t': 'Une correction a laissé le reste intact.',
  'm.claims.4p':
    'Après avoir corrigé un enregistrement, prouvez que les valeurs que vous n’avez pas touchées sont inchangées.',
  'm.claims.5t': 'Un laboratoire a signé les valeurs.',
  'm.claims.5p':
    'La preuve nomme la clé qui a signé l’enregistrement : elle porte donc sur des valeurs signées par cette clé, pas seulement sur des nombres que vous avez saisis. À vous de juger si cette clé est celle d’un laboratoire de confiance.',
  'm.claims.limitsTitle': 'Limites.',
  'm.claims.limits':
    'Seize valeurs par enregistrement. Comparer deux variétés demande une partie qui détient les deux séries, comme l’obtenteur ou un laboratoire qui a testé les deux. Toute personne à qui vous donnez une valeur scellée peut aussi faire des preuves à son sujet. Ce n’est pas adapté aux comparaisons sur des milliers de valeurs. Sans la signature d’un laboratoire, les valeurs ne sont que la parole du détenteur.',
  'm.claims.statusTitle': 'Le contrat des preuves',
  'm.claims.link': 'Comment fonctionnent les preuves, dans la spécification →',
  'm.get.label': 'Ce que ça fait',
  'm.get.title1': 'Ce que vous obtenez,',
  'm.get.title2': 'et où ça s’arrête.',
  'm.get.title': 'Ce que vous obtenez',
  'm.get.1a': 'Une date que personne ne peut antidater,',
  'm.get.2a': 'Licences et accords de laboratoire.',
  'm.get.2b':
    'Ils sont attachés à l’enregistrement. Un licencié peut prouver qu’il détient une licence en vigueur sans montrer laquelle. Une redevance ou autre obligation sur un parent apparaît sur chaque descendant confirmé par les deux détenteurs ; VeilCore l’enregistre et ne la perçoit pas. Testé sur un réseau de test de Midnight ; simulé dans la démo web.',
  'm.get.3a': 'Une lignée acceptée des deux côtés.',
  'm.stops.title': 'Où ça s’arrête, et ce qui couvre le reste',
  'm.stops.1a': 'C’est une preuve, pas un titre juridique.',
  'm.stops.1b': 'Cela ne crée aucun droit nouveau. Cela appuie les droits et les contrats que vous avez déjà.',
  'm.stops.2a': 'Cela établit la date, pas la véracité.',
  'm.stops.2b':
    'Un enregistrement prouve ce qui a été écrit, et quand. Un rapport de laboratoire associé ou la signature d’un laboratoire donne du poids au contenu.',
  'm.stops.3a': 'Cela accompagne les tests ADN, sans les remplacer.',
  'm.stops.3b':
    'Cela date un rapport ADN que vous avez déjà, pour qu’un test ultérieur puisse y être comparé. Un lien de parenté signifie que les deux détenteurs l’ont accepté ; c’est l’ADN qui prouve la filiation.',
  'm.stops.4a': 'Cela ne voit pas ce que personne ne déclare.',
  'm.stops.4b':
    'Une multiplication discrète n’est pas détectée. Mais une fois que vous révoquez une licence, un acheteur ou un laboratoire qui vérifie correctement ne l’acceptera plus comme valide.',
  'm.open.label': 'Format ouvert',
  'm.open.title1': 'Si VeilCore',
  'm.open.title2': 'disparaît.',
  'm.open.1t': 'Les dates restent.',
  'm.open.1p':
    'Un code de lot ancré sur le réseau principal de Midnight, ou horodaté sur Bitcoin, ne peut être supprimé par personne, nous compris.',
  'm.open.1link': 'Les trois implémentations →',
  'm.open.3t': 'Nous ne nous portons pas garants des résultats.',
  'm.open.3p':
    'Les signatures d’un laboratoire sur un enregistrement restent privées, sauf si le détenteur de l’enregistrement les montre. Chacune de celles qui sont montrées indique quelle clé a signé, le nom sous lequel cette clé a été enregistrée, toute accréditation déclarée par son détenteur (nous ne la vérifions pas), et si l’opérateur de VeilCore a rapproché ce nom d’une liste publique de licences ou d’accréditations, et à quelle date. VeilCore ne se porte garant d’aucun laboratoire : c’est la personne qui vérifie un enregistrement qui décide de ce que vaut une signature.',
  'm.open.4t': 'Chacun peut tenir un registre.',
  'm.open.4p':
    'Le format permet à un laboratoire, un organisme de certification ou un organisme de droits de gérer son propre registre, sous son propre domaine web, et d’ancrer sans nous demander. Le code de notre propre registre est public, sous licence Apache-2.0, sur github.com/hunterincoming/veilcore-api.',
  'm.faq.label': 'Questions',
  'm.faq.title1': 'Les questions',
  'm.faq.title2': 'qu’on nous pose.',
  'm.faq.1q': 'Qu’est-ce qui empêche quelqu’un d’enregistrer mon matériel ?',
  'm.faq.2q': 'Ai-je besoin de crypto ou d’un portefeuille ?',
  'm.faq.2a':
    'Non. Créer un enregistrement dans la démo et vérifier n’importe quel enregistrement ne demandent ni portefeuille, ni inscription, ni achat. Votre navigateur garde une clé aléatoire qui retrouve vos enregistrements de démo sur notre serveur. Le code de preuve va sur Midnight, un réseau conçu pour la confidentialité. Vous n’avez jamais affaire à lui directement.',
  'm.faq.3q': 'Est-ce que ça tiendra dans un litige ?',
  'm.faq.3link': 'Les enregistrements comme preuve →',
  'm.faq.4q': 'Que voyez-vous de mes données ?',
  'm.faq.4a':
    'De vos données génétiques déverrouillées : rien. Votre ordinateur lit les fichiers que vous ajoutez pour faire un code de chacun, et ils ne sont pas téléversés. Un rapport de laboratoire n’arrive sur notre serveur que lorsqu’un laboratoire vous le renvoie : il est verrouillé pour que vous seul puissiez l’ouvrir, et supprimé après 180 jours. Les détails que vous saisissez (le nom de l’enregistrement, obtenteur, dates, notes, conditions des accords) et les noms de vos fichiers sont conservés verrouillés sur notre serveur, et nous n’avons pas la clé. Nous pouvons lire le code de preuve de chaque enregistrement et tout ce que vous choisissez de montrer. Les informations d’échantillon que vous et un laboratoire écrivez pour un envoi sont elles aussi conservées verrouillées, avec une clé qui se trouve dans le code de laboratoire et que nous n’avons pas. Les laboratoires et les développeurs peuvent sceller des enregistrements dans leurs propres systèmes, pour que seul le code de preuve sorte.',
  'm.faq.4link1': 'Ce que la démo conserve →',
  'm.faq.4link2': 'Guide d’intégration →',
  'm.faq.6q': 'Combien cela coûte-t-il ?',
  'm.faq.6a': 'Gratuit. Créer un enregistrement sur ce site et vérifier n’importe quel enregistrement sont gratuits.',
  'm.demo.lede':
    'Sans inscription, sans portefeuille. C’est une version de test : utilisez des informations fictives. Les enregistrements sont datés par lots sur Midnight ; les licences et les accords de laboratoire sont simulés, et les associations de rapports ADN ne sont pas encore datées.',
  'm.demo.privacy': 'Ce que la démo conserve →',
  'm.updates.more': 'Toutes les actualités',
  'm.stat3.s': 'Pas encore d’audit de sécurité indépendant. Nos propres revues des smart contracts sont publiques.',
  'm.stat3.link': 'Les lire sur GitHub →',
  'm.stat4.b': 'Sans inscription, sans portefeuille',
  'm.stat4.s': 'Créez un enregistrement maintenant. En vérifier un est gratuit et ne demande aucun compte.',
  'm.addr.title': 'Les smart contracts, pour qui veut les vérifier.',
  'm.addr.main': 'Smart contract principal',
  'm.addr.claims': 'Contrat des preuves d’un fait',
  'm.addr.claimsPending': 'Pas encore sur le réseau principal.',
  'm.addr.explorer': 'Les consulter sur midnightexplorer.com (géré par TexLabs) →',
  'm.live.btc.t': 'Un horodatage sur Bitcoin, en plus',
  'm.live.btc.main':
    'Oui, chaque lot scellé. Le premier est arrivé dans le bloc 971004 le 11 octobre et a été vérifié avec deux explorateurs de blocs le 15 octobre. La vérification avec l’outil officiel et un nœud complet reste à faire.',
  'm.contact.1t': 'Obtenteurs, éleveurs et laboratoires',
  'm.contact.1p':
    'Essayez-le sur des enregistrements fictifs, puis dites-nous ce qu’il lui faudrait pour vos vrais enregistrements.',
  'm.contact.2t': 'Certificateurs de semences, examinateurs et organismes de gestion de droits',
  'm.contact.2p': 'Dites-nous quelles preuves vous auriez besoin de voir, et sous quelle forme.',
  'm.contact.3t': 'Développeurs',
  'm.contact.3p': 'Ajoutez-le à un logiciel que vous utilisez déjà. Ni compte ni clé d’API chez nous.',
  'm.contact.4t': 'Investisseurs',
  'm.contact.4p': 'Écrivez à Mako, notre CEO.',
  'm.contact.integrate': 'Guide d’intégration',
  'm.verify.what':
    'Un enregistrement VeilCore décrit du matériel génétique sans contenir la génétique. Sa page de vérification montre ce que son détenteur a choisi de partager, et son nom quand le lien du détenteur le porte. Seul son code de preuve va sur Midnight, et il reçoit une date une fois ancré. En vérifier un est gratuit et ne demande aucun compte.',
  'm.verify.home': 'Qu’est-ce que VeilCore ? →',
  'm.verify.scan': 'Scanner le code QR d’une étiquette',
  'm.verify.example': 'Vous ne savez pas ce que vous allez voir ? Regardez d’abord un exemple →',
  // Round 5 (15 Oct 2026): landing page rework, keys added.
  'm.open.6t': 'Vérifier sans nous.',
  'm.open.6p':
    'Avec ce dossier de preuve, n’importe qui peut vérifier un enregistrement hors ligne : ouvrir son verify.html, puis consulter sur un explorateur Midnight la transaction qu’il nomme. Les enregistrements scellés depuis le 14 octobre demandent aussi la section 3.6.1 de la spécification, dans la spécification sur ce site et dans le SDK 0.16.0 et suivants.',
  'm.open.6link': 'Lire la spécification →',
  'm.updates.older': 'Actualités plus anciennes',
  'm.live.colTestHere': 'Ce site de test (test.veilcore.org)',
  'm.live.feature': 'Fonction',
  'm.live.show': 'Afficher la liste',
  'm.tech.title': 'Pour les lecteurs techniques',
  'm.tech.lede': 'Comment vérifier à la main, le code, l’horodatage Bitcoin et qui peut modifier les smart contracts.',
  'm.tech.show': 'Afficher le détail',
  'm.tech.check.t': 'Vérifier un enregistrement à la main',
  'm.tech.check.p':
    'Recalculer le code de preuve d’un enregistrement ne demande que SHA-256 et la spécification ouverte. Sa preuve d’inclusion relie ce code de preuve à un code de preuve de lot ancré sur Midnight, et la transaction qui l’a ancré donne la date du lot. Le verify.html du dossier de preuve refait ce calcul hors ligne et nomme la transaction et le code de preuve de lot à consulter. La page de vérification consulte elle-même cette transaction sur Midnight quand elle peut joindre Midnight ; sinon, elle indique que la date est celle que rapporte notre registre, et vous pouvez la consulter sur un explorateur Midnight. Les enregistrements scellés depuis le 14 octobre nomment leur propre clé ; les vérifier demande donc aussi la section 3.6.1, dans la spécification sur ce site et dans le SDK 0.16.0 et suivants. Rechercher un enregistrement par son identifiant sur ce site passe par notre serveur.',
  'm.tech.impl.t': 'Une spécification, trois implémentations',
  'm.tech.impl.p':
    'Libre à implémenter, pour toujours. TypeScript, Python et Rust s’accordent sur les 121 vecteurs de test du format d’enregistrement sur GitHub, et chacun peut les exécuter. Un seul auteur a écrit les trois, et la version TypeScript est sur npm en 0.18.1. Une implémentation écrite par quelqu’un d’autre est le test que nous souhaitons le plus.',
  'm.tech.btc.t': 'L’horodatage Bitcoin',
  'm.tech.btc.p':
    'Notre registre horodate sur Bitcoin le code de chaque lot scellé, avec OpenTimestamps. Le premier est arrivé dans le bloc Bitcoin 971004 le 11 octobre. Vérifié le 15 octobre avec deux explorateurs de blocs : l’horodatage mène aux blocs Bitcoin 971004 et 971005. Une vérification avec l’outil officiel OpenTimestamps et un nœud Bitcoin complet reste à faire. Le fichier d’horodatage est le fichier .ots du lot : « Télécharger le fichier d’horodatage Bitcoin », sur la page de la plante. Le registre du site de test n’horodate pas sur Bitcoin.',
  'm.tech.dna.t': 'Association de rapports et signatures de laboratoire',
  'm.tech.dna.p':
    'Quand l’association d’un rapport ADN passe par le smart contract de VeilCore sur Midnight, elle est datée : elle montre que la personne qui contrôlait l’enregistrement à cette date avait déjà ce rapport, ou son SHA-256, à ce moment-là. Ce qui va sur la chaîne est lié à l’enregistrement et cache le rapport, de sorte que personne ne peut copier l’association sur son propre enregistrement. La signature d’un laboratoire sur un rapport verrouillé couvre exactement ce fichier et l’enregistrement concerné.',
  'title.checkSite': 'Vérifier ce site',
  'm.privacy.code.title': 'Le code de l’application',
  'm.privacy.code.text':
    'VeilCore sert le code de l’application. Chaque version publie la liste de ses fichiers. Vous pouvez vérifier que les fichiers reçus par votre navigateur correspondent à cette liste, et chacun peut reconstruire la version à partir du code publié et comparer. Cela montre ce que nous avons publié. Cela ne peut pas prouver qu’un hébergeur a envoyé à tous les mêmes fichiers.',
  'm.checksite.title': 'Vérifier ce site',
  'm.checksite.lede':
    'VeilCore sert le code de l’application. Chaque version publie la liste de ses fichiers. Vous pouvez vérifier que les fichiers reçus par votre navigateur correspondent à cette liste, et chacun peut reconstruire la version à partir du code publié et comparer. Cela montre ce que nous avons publié. Cela ne peut pas prouver qu’un hébergeur a envoyé à tous les mêmes fichiers.',
  'm.checksite.reading': 'Lecture de la version…',
  'm.checksite.noRelease':
    'Cette copie du site n’a pas été publiée par un déploiement de version : il n’y a donc pas de liste avec laquelle la vérifier.',
  'm.checksite.release': 'Cette copie du site dit être la version {commit} sur {network}, faite le {date}.',
  'm.checksite.how':
    'La vérification télécharge depuis ce site chaque fichier que liste la version, ainsi que chaque adresse de page de l’application (avec des identifiants d’enregistrement au hasard) et une adresse au hasard, comme un navigateur ouvre une page. Elle calcule le SHA-256 de chacun dans votre navigateur et le compare, avec les en-têtes de sécurité, à la liste. Elle vérifie aussi que cette page n’a aucun script que la page listée n’a pas.',
  'm.checksite.trust':
    'Cette page tourne sur le site qu’elle vérifie : un site qui mentirait pourrait mentir ici aussi. Pour vérifier sans faire confiance à VeilCore, téléchargez la liste depuis le code public et utilisez-la ci-dessous, ou lancez {command} depuis une copie du code.',
  'm.checksite.rebuild':
    'Pour comparer la liste elle-même au code, reconstruisez la version à partir d’une copie du code : {command}.',
  'm.checksite.pagesMatch': 'Les {total} adresses de page sont la page listée, avec les en-têtes de sécurité listés.',
  'm.checksite.pagesDiffer': '{matched} adresses de page sur {total} sont la page listée. Celles-ci diffèrent :',
  'm.checksite.pageDiffers': 'Page différente : {path}',
  'm.checksite.headerDiffers': 'En-tête de sécurité différent : {name}',
  'm.checksite.noHeaders':
    'La liste de cette version n’a pas d’en-têtes de sécurité (elle a été faite avant qu’ils y figurent) : ils n’ont donc pas été comparés.',
  'm.checksite.extraScript': 'Cette page a un script que la page listée n’a pas : {script}',
  'm.checksite.workerOk':
    'La partie qui permet d’ouvrir VeilCore sans réseau (/sw.js) est envoyée pour que les navigateurs la rechargent toujours, et ne garde que des fichiers de la liste de cette version.',
  'm.checksite.workerWrong':
    'La partie qui permet d’ouvrir VeilCore sans réseau n’est pas comme elle devrait ({path}). Ne comptez pas dessus sans réseau : effacez les données de ce site, rechargez et prévenez-nous.',
  'm.checksite.copyHere': 'La copie sans réseau de ce navigateur correspond à la version {commit}.',
  'm.checksite.copyOther':
    'La copie sans réseau de ce navigateur est la version {commit}, pas celle vérifiée ici. Elle se met à jour au prochain chargement d’une page avec du réseau.',
  'm.checksite.limit':
    'Cela montre ce que votre navigateur a reçu. Cela ne peut pas prouver que l’hébergeur a envoyé à tous les mêmes fichiers.',
  'm.checksite.listLink': 'La liste de cette version dans le code public',
  'm.checksite.useSite': 'Vérifier avec la liste que sert ce site',
  'm.checksite.useFile': 'Ou vérifier avec une liste téléchargée :',
  'm.checksite.checking': 'Vérification de {done} fichiers sur {total}…',
  'm.checksite.allMatch': 'Les {total} fichiers correspondent à la liste de la version.',
  'm.checksite.someDiffer': '{matched} fichiers sur {total} correspondent à la liste de la version. Ceux-ci non :',
  'm.checksite.differs': 'Différent : {path}',
  'm.checksite.missing': 'Manquant : {path}',
  'm.checksite.noList': 'Ce n’est pas une liste de version.',
  'm.checksite.otherList': 'Cette liste est celle d’une autre version, pas de celle que ce site dit être.',
  'm.checksite.uncommitted':
    'Cette version a été faite à partir de code avec des modifications non encore validées : ses fichiers ne sont donc pas exactement le code publié à ce commit.',
  // The privacy policy veilcore.org shows at /privacy (components/site/PrivacyPolicy.tsx).
  ...policyFr,
};

/** The public test site (en-testchain.ts), in this language. Draft, like the rest of this file. */
export const frTestchain: Strings = {
  'm.hero.status':
    'Ceci est le site de test : horodatages, codes de laboratoire et liens de preuve fonctionnent pour de vrai, sur le réseau de test de Midnight. Les enregistrements ici servent à s’entraîner, ce ne sont pas des preuves.',
  'm.claims.status':
    'Un second smart contract Midnight. Il a passé toutes les vérifications de bout en bout sur le réseau de test preprod de Midnight le 4 octobre 2026, avec des données de marqueurs fictives, et il est sur le réseau principal de Midnight depuis le 8 octobre 2026. Il n’est pas encore sur ce site.',
  'm.faq.3a':
    'Il est conçu pour servir de preuve, et notre note pour les juristes dit ce qu’il prouve et ce qu’il ne prouve pas. Ce site de test date les enregistrements sur le réseau de test de Midnight, et une date sur un réseau de test n’a aucune valeur probante. Les vrais enregistrements vont sur veilcore.org, qui fonctionne sur le réseau principal de Midnight.',
  'm.stat2.b': 'Site de test',
  'm.stat2.s':
    'Ce site fonctionne sur un réseau de test de Midnight, pour s’exercer. Les deux smart contracts sont sur le réseau principal de Midnight depuis le 8 octobre 2026.',
  'm.foot.about':
    'Un format d’enregistrement ouvert pour la génétique végétale, animale et microbienne. Ceci est le site de test, sur un réseau de test de Midnight ; veilcore.org fonctionne sur le réseau principal de Midnight.',
  'm.for.1p':
    'Scellez un enregistrement et associez-y son rapport ADN. Si la plante réapparaît sous un autre nom, un laboratoire peut comparer un nouveau test avec votre rapport. Sur ce site de test, vous pouvez dater l’association depuis votre navigateur, et personne ne peut la copier sur son propre enregistrement. VeilCore ne fait pas de tests ADN.',
  'm.demo.lede':
    'Pas d’inscription, pas de portefeuille. Ceci est le site de test, utilisez donc des données inventées. Les lots sont ancrés automatiquement sur le réseau de test de Midnight, ce qui date vos enregistrements. L’accusé de réception d’un laboratoire est une vraie signature avec la propre clé du laboratoire, conservée hors chaîne. Les licences et les accords de laboratoire se font aussi ici avec de vraies transactions, sur le réseau de test.',
  'm.privacy.test.text':
    'Ce site utilise le réseau de test preprod de Midnight, pas le réseau principal. Votre navigateur envoie chaque horodatage à ce réseau via le service de frais de VeilCore ; ce que vous avez saisi et vos fichiers n’y sont jamais envoyés. Un réseau de test peut être réinitialisé, et les données de test peuvent être supprimées.',
  'm.privacy.hosts.text':
    'Ce site est hébergé chez Vercel, qui enregistre les adresses IP et les requêtes. Notre serveur de registre, et le service qui paie les frais du réseau de test et relaie les lectures du réseau faites par cette page, fonctionnent chez Railway, qui enregistre les requêtes. Ce service lit le réseau via Blockfrost.',
  'm.tech.check.p':
    'Recalculer le code de preuve d’un enregistrement ne demande que SHA-256 et la spécification ouverte. Sa preuve d’inclusion relie ce code de preuve à un code de preuve de lot ancré sur Midnight, et la transaction qui l’a ancré donne la date du lot. Le verify.html du dossier de preuve refait ce calcul hors ligne et nomme la transaction et le code de preuve de lot à consulter. La page de vérification consulte elle-même cette transaction sur Midnight quand elle peut joindre Midnight. Les enregistrements scellés depuis le 14 octobre nomment leur propre clé ; les vérifier demande donc aussi la section 3.6.1, dans la spécification sur ce site et dans le SDK 0.16.0 et suivants. Rechercher un enregistrement par son identifiant sur ce site passe par notre serveur.',
  // Agreements are real on the test site: every type, on Midnight's test network.
  'm.get.2b':
    'Ils sont attachés à l’enregistrement. Un licencié peut prouver qu’il détient une licence en vigueur sans montrer laquelle. Une redevance ou autre obligation sur un parent apparaît sur chaque descendant confirmé par les deux détenteurs ; VeilCore l’enregistre et ne la perçoit pas. Utilisable depuis ce site de test, avec de vraies transactions sur le réseau de test de Midnight.',
  // Agreements are real on the test site: every type, on Midnight's test network.
  'm.for.3p':
    'Envoyez du matériel avec un code laboratoire. Le laboratoire signe un accusé de réception avec sa propre clé, et l’enregistrement montre ainsi une seconde partie. L’accusé est une vraie signature, conservée par le registre de VeilCore, pas sur la chaîne. Des conditions comme l’interdiction de multiplier figurent dans un accord avec le laboratoire, que vous et le laboratoire concluez ici sur le réseau de test de Midnight.',
};
