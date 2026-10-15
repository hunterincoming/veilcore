// French. DRAFT: machine-assisted, to be checked by a fluent speaker before publishing.
// SPDX-License-Identifier: Apache-2.0
import type { Strings } from './en';
export const fr: Strings = {
  // Header and footer
  'nav.language': 'Langue',
  'footer.documents': 'Documents',
  'footer.spec': 'Spécification',
  'footer.evidence': 'Les enregistrements comme preuve',
  'footer.integrate': "Guide d'intégration",
  'footer.source': 'Code source',
  'footer.allImplementations': 'Les trois implémentations',
  'footer.referenceImplementation': 'Implémentation de référence',
  'footer.rustImplementation': 'Implémentation en Rust',
  'footer.thisSite': 'Ce site',
  'footer.whatThisIs': "De quoi il s'agit",
  'footer.yourRecords': 'Vos enregistrements',
  'footer.agreements': 'Contrats',
  'footer.privacy': 'Confidentialité de la démo',
  'draft.banner': 'Traduction provisoire, pas encore relue par un locuteur natif. La page en anglais fait foi.',
  'draft.showEnglish': 'Afficher en anglais',
  // Public pages (Mako's 25 September layout)
  'm.nav.about': 'À propos',
  'm.nav.team': 'Équipe',
  'm.nav.updates': 'Actualités',
  'm.nav.spec': 'Spécification',
  'm.nav.demo': 'Essayer la démo',
  'm.nav.menu': 'Menu',
  'm.hero.label': 'La preuve de ce que vous détenez',
  'm.hero.title1': 'Datez votre enregistrement.',
  'm.hero.title2': 'Gardez votre génétique.',
  'm.hero.how': 'Comment ça marche',
  'm.hero.cultivar': 'Cultivar',
  'm.hero.bredBy': 'Obtenu par',
  'm.hero.bredByDefault': 'Votre nom ici',
  'm.hero.demoLabel': "Démo d'empreinte en direct",
  'm.hero.fpUpdated': 'Empreinte mise à jour',
  'm.hero.typed': 'Ce que vous saisissez',
  'm.hero.goes': 'Ce qui va sur Midnight',
  'm.foot.demo': 'Démo',
  'm.step1.n': '01 · Enregistrement',
  'm.step2.n': '02 · Empreinte',
  'm.step3.n': '03 · Ancrage',
  'm.step4.n': '04 · Vérification',
  'm.step4.title': 'Le présenter plus tard',
  'm.demo.label': 'Démo',
  'm.demo.title1': 'Choisissez comment',
  'm.demo.title2': 'vous voulez le voir.',
  'm.demo.create.title': 'Enregistrer une plante',
  'm.demo.create.text':
    'Enregistrez une plante fictive, sauvegardez votre copie de secours, puis découvrez la page de votre plante.',
  'm.demo.verify.title': 'Vérifier un enregistrement',
  'm.demo.verify.text':
    "Saisissez l'identifiant d'un enregistrement et voyez ce que son détenteur a divulgué et s'il est ancré.",
  'm.demo.video.title': 'Voir comment cela fonctionne',
  'm.demo.video.text':
    "Une animation de 60 secondes sur l'idée : ce qui reste chez vous, ce qui va sur Midnight, et comment quelqu'un le vérifie.",
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
    "Responsable commercial : organismes de normalisation et de protection des obtentions végétales au Japon et dans l'UE.",
  'm.hunter.role': 'Cofondateur et COO · New Jersey',
  'm.hunter.short': "Développe le contrat, le site et l'API. Mène les prises de contact aux États-Unis.",
  'm.updates.label': 'Actualités',
  'm.updates.title1': 'Les dernières nouvelles',
  'm.updates.title2': 'du développement.',
  'm.updates.read': 'Lire →',
  'm.updates.all': "Modifications du format d'enregistrement sur GitHub →",
  'm.updates.follow': 'Suivre',
  'm.post1.date': '3 oct. 2026',
  'm.post1.tag': 'Format',
  'm.post1.title': 'Trois implémentations, une seule réponse',
  'm.post1.text':
    'Un test différentiel a révélé que nos implémentations TypeScript, Python et Rust divergeaient sur certains nombres. Corrigé : elles concordent désormais sur chacune des 81 000 entrées, et les vecteurs de test partagés le vérifient.',
  'm.post2.date': '2 oct. 2026',
  'm.post2.tag': 'Contrat',
  'm.post2.title': 'Une exécution complète sur le réseau de test de Midnight',
  'm.post2.text':
    'Le contrat a été déployé sur le réseau de test de Midnight et a passé les 26 vérifications de bout en bout, en utilisant 16 de ses 24 opérations avec de vraies preuves.',
  'm.status.label': 'Où nous en sommes',
  'm.status.title1': 'Franchement,',
  'm.status.title2': 'où nous en sommes.',
  'm.status.lede': "Ce qui est fait, et ce qui ne l'est pas encore.",
  'm.stat3.b': 'Aucun audit',
  'm.status.keyTitle': 'Qui peut modifier le contrat.',
  'm.status.keyText':
    "Une clé de maintenance peut modifier le fonctionnement du contrat de VeilCore sur Midnight. Son détenteur peut ajouter ou remplacer des opérations du contrat, ce qui pourrait lui permettre de prendre le contrôle de l'identité de n'importe quel enregistrement, d'ajouter des licences au nom de n'importe quel émetteur, d'ajouter ou de retirer des obligations et des liens de parenté, ou de désactiver des opérations. Elle ne peut pas antidater les heures de bloc du réseau, et chaque modification est visible sur la chaîne. Aujourd'hui, la clé est sur papier, une copie chez chaque fondateur, et une seule copie suffit pour l'utiliser. Le passage à un groupe de clés qui doivent s'accorder est prévu, mais pas encore fait. Chaque utilisation est annoncée publiquement, selon une politique de maintenance écrite.",
  'm.status.keyLink': 'Lire la politique de maintenance →',
  'm.contact.label': 'Nous contacter',
  'm.contact.title1': 'Dites-nous',
  'm.contact.title2': 'où ça échoue.',
  'm.contact.email': 'Écrire aux fondateurs',
  'm.contact.spec': 'Lire la spécification',
  'm.foot.explore': 'Explorer',
  'm.foot.build': 'Développement',
  'm.foot.contact': 'Contact',
  'm.foot.verify': 'Vérifier un enregistrement',
  'm.foot.fine': 'La preuve que vous déteniez un enregistrement à une date. Pas un titre sur la plante.',
  'm.foot.privacy': 'Confidentialité de la démo',
  'm.verify.label': 'Vérifier',
  'm.verify.title': 'Vérifier un enregistrement',
  'm.verify.lede':
    "Saisissez l'identifiant d'enregistrement imprimé sur un certificat ou qui vous a été communiqué. Vous verrez ce que son détenteur a choisi de partager, et ce que cette page a pu vérifier elle-même : si l'enregistrement est dans un lot scellé, et si les éventuelles signatures de laboratoire sont valides.",
  'm.verify.field': "Identifiant d'enregistrement",
  'm.verify.go': 'Vérifier',
  'm.founders.label': 'Fondateurs',
  'm.founders.leads': 'Dirige',
  'm.founders.also': 'Également',
  'm.founders.languages': 'Langues',
  'm.mako.bio1':
    'Makoto (Mako) Steiner est cofondateur et CEO de VeilCore. Il dirige la stratégie commerciale, la levée de fonds et les prises de contact avec les institutions et les investisseurs dans le monde entier.',
  'm.mako.bio2': "Il a étudié les sciences de l'environnement à Denison University et vit à Tokyo.",
  'm.mako.leads': 'Japon|UE|Organismes de normalisation|Développement commercial',
  'm.mako.also': 'Midnight Nightforce Leader (Japon) · Build Club, cohorte 1',
  'm.mako.languages': 'Anglais · Japonais',
  'm.hunter.bio1':
    "Hunter Roberts est cofondateur et COO de VeilCore. Il dirige le produit et le protocole VeilCore, du format d'enregistrement au contrat sur Midnight. Il mène les prises de contact de VeilCore avec les institutions américaines, notamment les organismes de certification des semences, de normalisation et des variétés végétales.",
  'm.hunter.bio2':
    "Il vient du travail de terrain sur les plantes, notamment la sélection et la culture de tissus, et construit Chunk's Trees, une installation de culture dans le New Jersey.",
  'm.hunter.leads': 'États-Unis|Protocole et spécification|Ingénierie',
  'm.hunter.also': 'Midnight Nightforce Leader (US) · Build Club, cohorte 1',
  'm.founders.band1': 'Parlez-nous. Nous',
  'm.founders.band2': 'préférons savoir où ça échoue',
  'm.founders.band3': "plutôt qu'entendre que ça marche.",
  'm.founders.bandText':
    'Si vous dirigez un programme de sélection, un laboratoire, un organisme de certification des semences ou un organisme de protection des obtentions végétales, nous aimerions échanger avec vous. Le format est gratuit à implémenter et gratuit à vérifier.',
  'm.founders.emailBoth': 'Écrire aux deux fondateurs',
  'm.portraitOf': 'Portrait de {name}',
  'm.privacy.label': 'Confidentialité de la démo',
  'm.privacy.title': 'Ce que la démo conserve.',
  'm.privacy.lede':
    "Cette note concerne la démo de ce site. Il s'agit d'un test, sur le réseau de test de Midnight. Merci d'utiliser des données fictives.",
  'm.privacy.stored.title': 'Conservé sur notre serveur de test',
  'm.privacy.stored.text':
    "Ce que vous saisissez et ce que votre navigateur en calcule : noms de cultivars et d'obtenteurs, l'espèce si vous en indiquez une, dates, notes, numéros de référence, parents, empreintes des enregistrements, empreintes des photos et des rapports de laboratoire que vous ajoutez (seulement les empreintes, jamais les fichiers), noms de fichier des rapports de laboratoire, conditions et contreparties des accords, le matériel que vous envoyez à un laboratoire (à qui il est adressé et la quantité) et, pour les laboratoires, la clé publique de signature et les attestations qu'ils publient. Également votre clé de détenteur, que votre navigateur envoie à chaque enregistrement pour que le serveur retrouve vos enregistrements. Les rapports de laboratoire verrouillés qu'un laboratoire vous envoie : conservés sans que nous puissions les lire, et supprimés après 180 jours. Le serveur est le registre de test de VeilCore, hébergé chez Railway.",
  'm.privacy.local.title': 'Ne quitte jamais votre navigateur',
  'm.privacy.local.text':
    "Les données génétiques, et les rapports de laboratoire, rapports ADN et photos que vous ajoutez. Votre navigateur les lit pour calculer leurs empreintes ; les fichiers eux-mêmes ne sont jamais envoyés. Un rapport de laboratoire n'arrive sur notre serveur que lorsqu'un laboratoire vous le renvoie, verrouillé pour que vous seul puissiez l'ouvrir.",
  'm.privacy.test.title': 'Un réseau de test',
  'm.privacy.test.text':
    'La démo utilise le réseau de test de Midnight, pas le réseau en production. Les données de la démo peuvent être supprimées lorsque le réseau de test est réinitialisé.',
  'm.privacy.madeup.title': 'Utilisez des données fictives',
  'm.privacy.madeup.text':
    'Merci de ne saisir ni vrais noms, ni vraies variétés, ni rien de confidentiel. La démo sert à essayer le format.',
  'm.privacy.export.title': 'Export',
  'm.privacy.export.text':
    "Votre page d'enregistrements comporte un bouton « Export » qui télécharge les enregistrements détenus par ce navigateur. Un téléchargement unique de tout ce que notre serveur conserve pour vous est en préparation ; il n'est pas encore disponible.",
  'm.privacy.delete.title': 'Suppression',
  'm.privacy.delete.text':
    'Pour faire supprimer vos données de démo de notre serveur, écrivez à hunter@veilcore.org en indiquant les identifiants de vos enregistrements.',
  'm.privacy.browser.title': 'Conservé dans votre navigateur',
  'm.privacy.browser.text':
    "Votre navigateur conserve, sur cet appareil : votre clé de détenteur (une copie est aussi envoyée à notre serveur, voir plus haut), la clé de signature d'un laboratoire si vous en avez configuré une (sa partie privée ne quitte jamais cet appareil), le rôle choisi et votre langue. Pour les supprimer, effacez les données de ce site dans les réglages de votre navigateur. Sauvegardez d'abord votre clé de détenteur : sans elle, ce navigateur ne retrouvera plus vos enregistrements.",
  'm.privacy.hosts.title': 'Hébergement',
  'm.privacy.hosts.text':
    'Ce site est hébergé chez Vercel, qui enregistre les adresses IP et les requêtes. Notre serveur de registre fonctionne chez Railway, qui enregistre les requêtes.',
  'm.privacy.who.title': 'Qui les conserve, et combien de temps',
  'm.privacy.who.text':
    "VeilCore n'est pas encore constituée en société ; les fondateurs de VeilCore exploitent ce site et le registre. Les rapports de laboratoire verrouillés sont supprimés 180 jours après leur arrivée. Rien d'autre n'a de durée de conservation fixée : tout reste jusqu'à ce que vous nous demandiez de le supprimer. Contact : hunter@veilcore.org.",
  'm.notfound.title': 'Page introuvable.',
  'm.notfound.text':
    "Il n'y a pas de page à cette adresse. Si quelqu'un vous a donné un lien vers un enregistrement, vérifiez qu'il est complet.",
  'm.notfound.home': 'Accueil de VeilCore →',
  'm.privacy.contact': 'Questions : hunter@veilcore.org',
  // Round 2 truth pass (14 Oct 2026): keys added or newly translated.
  'm.hero.lede':
    "Pour les obtenteurs, les semenciers et les laboratoires qui travaillent avec la génétique végétale et animale. Les données génétiques ne quittent jamais votre ordinateur. Seule une empreinte va sur Midnight, qui la date. Le nom de la plante et l'obtenteur que vous saisissez sont conservés sur le serveur de VeilCore, et toute personne qui a le lien d'un enregistrement voit son nom. Un rapport de laboratoire n'arrive sur notre serveur que lorsqu'un laboratoire vous le renvoie, verrouillé pour que vous seul puissiez l'ouvrir. Vérification gratuite. Sans inscription, sans portefeuille.",
  'm.for.3p':
    "Envoyez du matériel avec un code de laboratoire. Quand le laboratoire le saisit, il signe un accusé de réception avec sa propre clé : l'enregistrement montre ainsi une seconde partie, ce qui protège le laboratoire autant que le client. L'accusé est une vraie signature, conservée par le registre de VeilCore, pas sur la chaîne. Les conditions, comme l'usage prévu, l'interdiction de multiplier, et le retour ou la destruction après, ne servent qu'à s'entraîner dans la démo web.",
  'm.get.1b': 'pour un enregistrement de ce que vous détenez, sans montrer votre génétique.',
  'm.get.3b':
    "Un lien de parenté ne compte que si les deux détenteurs le confirment. Sur ce site, c'est le registre de VeilCore qui l'enregistre, pas la chaîne.",
  'm.open.2t': 'Vérifier un enregistrement ne dépend pas de nous.',
  'm.open.2p':
    "Conservez deux fichiers depuis la page de votre plante : l'enregistrement exporté et sa preuve d'inclusion (un petit fichier montrant que l'enregistrement est dans un lot daté). Avec les deux, n'importe qui peut le vérifier avec SHA-256, la spécification ouverte et une consultation sur un explorateur Midnight, même si VeilCore a disparu. Votre fichier de sauvegarde contient vos clés, pas ces fichiers. La date Bitcoin demande un troisième fichier, le fichier d'horodatage Bitcoin du lot, qui n'existe aujourd'hui que sur notre serveur.",
  'm.faq.1a':
    "Une fois les enregistrements ancrés, chacun peut vérifier lequel a été ancré en premier. Associez votre rapport de laboratoire, pour qu'un test ultérieur puisse y être comparé. Quand vous envoyez du matériel, le destinataire signe un accusé de réception avec sa propre clé. Un enregistrement est une preuve, pas une inscription : il montre que vous déteniez cet enregistrement à cette date, pas que vous déteniez la plante, et ne tranche pas un litige à lui seul.",
  'm.faq.5a':
    "Les dates restent : une empreinte de lot ancrée sur le réseau principal de Midnight, ou horodatée sur Bitcoin, ne peut être supprimée par personne, nous compris. Pour vérifier un enregistrement sans nous, il vous faut deux fichiers que seul notre serveur détient tant que vous ne les enregistrez pas : l'enregistrement (« Export record ») et sa preuve d'inclusion (« Download inclusion proof »), tous deux sur la page de votre plante, sous « Technical details ». Votre fichier de sauvegarde contient vos clés, pas ces fichiers. Pour vérifier la date Bitcoin sans nous, il vous faut aussi le fichier d'horodatage Bitcoin du lot, qui n'existe aujourd'hui que sur notre serveur ; la page de la plante ne le propose pas. La spécification est ouverte et le code TypeScript, Python et Rust est publié. Un dossier de preuve en un clic, avec tout cela, arrive bientôt.",
  'm.post0.date': '4 oct. 2026',
  'm.post0.tag': 'Contrat',
  'm.post0.title': 'Prouver un fait, garder le reste',
  'm.post0.text':
    "Les deux contrats ont passé les 37 vérifications de bout en bout sur le réseau de test preprod de Midnight, y compris les nouvelles preuves d'un fait : une valeur, une plage, une différence, une correction qui laisse le reste inchangé et une signature d'une clé de laboratoire de test. Données de marqueurs fictives.",
  'm.postA.date': '8 oct. 2026',
  'm.postA.tag': 'Lancement',
  'm.postA.title': 'En service sur le réseau principal de Midnight',
  'm.postA.text':
    "Les deux contrats sont déployés sur le réseau principal de Midnight. Le contrat des preuves d'un fait n'a pas de clé de maintenance : personne, nous compris, ne peut le modifier.",
  'm.postB.date': '11 oct. 2026',
  'm.postB.tag': 'Registre',
  'm.postB.title': 'Premier lot daté aussi sur Bitcoin',
  'm.postB.text':
    "Les premiers lots du registre ont été ancrés à la main sur le réseau principal de Midnight. L'un d'eux, cinq de nos propres enregistrements de test, a aussi sa racine horodatée sur Bitcoin, dans le bloc 971004. Une vérification avec l'outil officiel OpenTimestamps reste à faire.",
  'm.founders.lede':
    "VeilCore est un format d'enregistrement probatoire pour la génétique végétale et animale. Il prouve que vous déteniez un enregistrement de votre matériel à une date donnée, sans remettre vos données génétiques.",
  'm.live.label': 'Ce qui marche où',
  'm.live.title1': 'Ce qui fonctionne,',
  'm.live.title2': 'et où.',
  'm.live.lede':
    "veilcore.org fonctionne sur le réseau principal de Midnight, et les enregistrements qui y sont faits sont réels. Le site de test sert à s'entraîner : davantage y fonctionne, et ses enregistrements n'ont aucune valeur probante.",
  'm.live.colMain': 'veilcore.org (réseau principal)',
  'm.live.colTest': 'Site de test',
  'm.live.colNot': 'Pas encore',
  'm.live.stamp.t': 'Un horodatage pour votre enregistrement',
  'm.live.stamp.main':
    "Oui. VeilCore date les enregistrements par lots, à la main pour l'instant. Votre navigateur n'envoie rien à la chaîne.",
  'm.live.stamp.test':
    'Oui. Les lots sont datés automatiquement, ce qui date votre enregistrement. Votre navigateur horodate aussi la clé propre à votre plante ; cet horodatage ne date que la clé.',
  'm.live.share.t': 'Choisir ce que les autres voient',
  'm.live.share.main': 'Oui. Le nom de la plante est toujours visible.',
  'm.live.share.test': 'Oui. Le nom de la plante est toujours visible.',
  'm.live.lab.t': 'Code de laboratoire et accusé signé',
  'm.live.lab.main':
    "Oui. Le laboratoire signe avec sa propre clé. Le registre de VeilCore conserve l'accusé, pas la chaîne.",
  'm.live.lab.test': 'Oui, de la même façon.',
  'm.live.results.t': 'Rapports de laboratoire verrouillés pour vous',
  'm.live.results.test': 'Oui. Nouveau, encore en test.',
  'm.live.results.not': "Sur veilcore.org : désactivé pour l'instant, d'abord sur le site de test.",
  'm.live.dna.t': "Une date pour l'association de votre rapport ADN",
  'm.live.dna.main': 'Conservée avec votre enregistrement, non datée.',
  'm.live.dna.test': 'Oui, envoyée depuis votre navigateur.',
  'm.live.prove.t': 'Le prouver par un lien',
  'm.live.prove.test':
    "Oui. Leur page vérifie sur le réseau que vous contrôlez la clé propre à l'enregistrement. L'enregistrement a nommé cette clé au moment où il a été scellé : elle ne peut donc pas être remplacée.",
  'm.live.prove.not': 'Sur veilcore.org : il faut que votre navigateur envoie une transaction.',
  'm.live.claims.t': 'Prouver un seul fait',
  'm.live.claims.main':
    "Le contrat est sur le réseau principal, sans clé de maintenance. Le site ne peut pas encore l'utiliser.",
  'm.live.claims.not': "L'utiliser depuis le site.",
  'm.live.lic.t': 'Licences et redevances',
  'm.live.lic.main': "Pour s'entraîner seulement.",
  'm.live.lic.test': "Pour s'entraîner seulement.",
  'm.live.lic.not': 'De vraies licences depuis le site. Elles sont intégrées au contrat.',
  // Round 3 (14 Oct 2026): the rest of the landing page, so no English shows through.
  'nav.newCultivar': 'Nouvel enregistrement',
  'nav.licenses': 'Contrats',
  'footer.about':
    "Un format d'enregistrement ouvert pour la génétique végétale et animale. Recalculer l'empreinte d'un enregistrement ne demande que SHA-256 et la spécification ouverte ; vérifier sa date demande aussi une consultation sur un explorateur Midnight. Rechercher un enregistrement par son identifiant sur ce site passe par notre serveur.",
  'm.hero.status':
    "Lancement sur le réseau principal de Midnight. Aujourd'hui, les enregistrements sont datés sur un réseau de test de Midnight, ce qui ne prouve encore rien.",
  'm.claims.status':
    "Un second contrat Midnight, testé de bout en bout sur le réseau de test preprod de Midnight le 4 octobre 2026 avec des données de marqueurs fictives. Il n'est encore ni dans cette démo web ni sur le réseau principal.",
  'm.faq.3a':
    "Il est conçu pour servir de preuve, et notre note pour les juristes dit ce qu'il prouve et ce qu'il ne prouve pas. Aujourd'hui, les enregistrements sont datés sur un réseau de test de Midnight, et une date sur un réseau de test n'a aucune valeur probante. Le lancement sur le réseau principal est proche.",
  'm.stat2.b': 'Réseau de test',
  'm.stat2.s':
    'Les deux contrats ont été testés de bout en bout sur le réseau de test preprod de Midnight. Pas encore sur le réseau principal.',
  'm.foot.about':
    "Un format d'enregistrement ouvert pour la génétique végétale et animale. Conçu pour s'ancrer sur Midnight ; en test sur un réseau de test de Midnight.",
  'm.for.2p':
    "Les obtenteurs veulent utiliser leurs marqueurs pour montrer qu'une variété est distincte, et traitent ces marqueurs comme des secrets d'affaires. Une preuve VeilCore établit un fait à leur sujet sans montrer le reste. Aucun office d'examen ni organisme de certification ne l'accepte encore ; nous avons écrit à certains pour leur demander ce qu'il leur faudrait.",
  'm.hero.note':
    "Tapez dans l'un ou l'autre champ ; rien n'est envoyé. La ligne verte est l'empreinte, la partie qui va sur Midnight. Personne ne peut remonter de celle-ci à ce que vous avez saisi.",
  'm.hero.noteShort': 'Seule la ligne verte va sur Midnight.',
  'm.for.label': 'À quoi ça sert',
  'm.for.title1': 'Beaucoup de litiges sur la génétique se ramènent à une question :',
  'm.for.title2': "qu'aviez-vous, et quand ?",
  'm.for.lede':
    "Carnets et fichiers sont datés par ceux qui les tiennent, et sont donc faciles à mettre en doute. Déposer le matériel lui-même, c'est remettre ce que vous voulez protéger. VeilCore donne à votre enregistrement une date que personne ne peut antidater, et la génétique reste chez vous.",
  'm.for.1t': 'Une bouture disparaît.',
  'm.for.1p':
    "Scellez un enregistrement et associez-y son rapport ADN. Si la plante réapparaît sous un autre nom, un laboratoire peut comparer un nouveau test avec votre rapport. Quand vous l'associez via le contrat de VeilCore sur Midnight, l'association est datée elle aussi : elle montre que la personne qui contrôlait votre enregistrement à cette date avait ce rapport, ou son SHA-256, à ce moment-là. Ce qui va sur la chaîne est lié à votre enregistrement et cache le rapport, si bien que personne ne peut copier votre association sur son propre enregistrement. Dans cette démo web, l'association est conservée avec votre enregistrement mais pas encore datée. VeilCore ne fait pas de tests ADN.",
  'm.for.2t': 'Protection des obtentions et certification.',
  'm.for.2link': 'Comment fonctionne une preuve →',
  'm.for.3t': "Du matériel entre les mains d'un laboratoire.",
  'm.for.4t': 'Les résultats du laboratoire, renvoyés vers vous.',
  'm.for.4p':
    "Le laboratoire signe vos résultats et les verrouille pour que vous seul puissiez les ouvrir. Aucun PDF ne traîne dans une boîte de réception : VeilCore ne garde que le fichier verrouillé. La signature couvre exactement ce fichier et l'enregistrement concerné. VeilCore enregistre qui a signé ; il ne se porte pas garant du résultat. Nouveau, encore en test.",
  'm.for.6t': "Quelqu'un demande une preuve.",
  'm.for.6p':
    "On vous envoie un lien. Vous touchez une fois, et la page de votre interlocuteur vérifie sur le réseau que vous contrôlez la clé propre à votre plante. Votre enregistrement a nommé cette clé au moment où il a été scellé : elle ne peut donc pas être remplacée. Cela ne dit rien de qui vous êtes ni de qui a obtenu la plante. Cela fonctionne pour l'instant sur un réseau de test de Midnight.",
  'm.for.5t': 'Lignées animales.',
  'm.for.5p':
    'Les livres généalogiques conservent le pedigree. Un enregistrement peut donner à chaque entrée une date que personne ne peut antidater, sans publier le génotype. Le format couvre les animaux ; cette démo est configurée pour les plantes, et les champs des enregistrements animaux ne sont pas encore publiés.',
  'm.for.5ask': 'Si vous élevez des animaux, dites-nous ce dont vos enregistrements ont besoin.',
  'm.how.label': 'Comment ça marche',
  'm.how.title1': 'Quatre étapes.',
  'm.how.title2': 'La génétique reste chez vous.',
  'm.step1.title': 'Le noter',
  'm.step1.text': "Ce que c'est et d'où ça vient. Ajoutez des rapports de laboratoire en fichiers.",
  'm.step2.title': "En faire l'empreinte",
  'm.step2.text': 'Sur votre ordinateur. Les données génétiques ne le quittent jamais.',
  'm.step3.title': 'Obtenir une date',
  'm.step3.text':
    "Seule l'empreinte va sur Midnight, dans un lot avec d'autres. La date est celle du bloc où arrive le lot : elle montre que l'enregistrement existait à ce moment-là.",
  'm.step4.text':
    'Donnez-le à un acheteur, un examinateur ou un tribunal. Ils peuvent le vérifier gratuitement, sans compte.',
  'm.claims.label': 'Prouver un fait',
  'm.claims.title1': 'Montrer la réponse.',
  'm.claims.title2': 'Garder les données.',
  'm.claims.lede':
    "Un enregistrement peut sceller jusqu'à seize valeurs, comme des résultats de marqueurs ou un taux de germination. Plus tard, vous prouvez un fait à leur sujet. Rien d'autre n'est montré.",
  'm.claims.1t': 'Une valeur est bien ce que vous dites.',
  'm.claims.1p': 'Cette seule valeur est montrée. Les autres restent scellées.',
  'm.claims.2t': 'Un nombre atteint un seuil.',
  'm.claims.2p': "Par exemple, une germination d'au moins 95 %. Le nombre lui-même reste caché.",
  'm.claims.3t': 'Deux variétés diffèrent.',
  'm.claims.3p':
    "Sur au moins un nombre fixé de valeurs de marqueurs. Lesquelles diffèrent reste privé. Savoir si cela rend une variété distincte relève de l'examinateur, pas de nous.",
  'm.claims.4t': 'Une correction a laissé le reste intact.',
  'm.claims.4p':
    "Après avoir corrigé un enregistrement, prouvez que les valeurs que vous n'avez pas touchées sont inchangées.",
  'm.claims.5t': 'Un laboratoire a signé les valeurs.',
  'm.claims.5p':
    "La preuve nomme la clé qui a signé l'enregistrement : elle porte donc sur des valeurs signées par cette clé, pas seulement sur des nombres que vous avez saisis. À vous de juger si cette clé est celle d'un laboratoire de confiance.",
  'm.claims.limitsTitle': 'Limites.',
  'm.claims.limits':
    "Seize valeurs par enregistrement. Comparer deux variétés demande une partie qui détient les deux séries, comme l'obtenteur ou un laboratoire qui a testé les deux. Toute personne à qui vous donnez une valeur scellée peut aussi faire des preuves à son sujet. Ce n'est pas adapté aux comparaisons sur des milliers de valeurs. Sans la signature d'un laboratoire, les valeurs ne sont que la parole du détenteur.",
  'm.claims.statusTitle': 'État.',
  'm.claims.link': 'Comment fonctionnent les preuves, dans la spécification →',
  'm.get.label': 'Ce que ça fait',
  'm.get.title1': 'Ce que vous obtenez,',
  'm.get.title2': "et où ça s'arrête.",
  'm.get.title': 'Ce que vous obtenez',
  'm.get.1a': 'Une date que personne ne peut antidater,',
  'm.get.2a': "Des conditions qui suivent l'enregistrement.",
  'm.get.2b':
    "Les licences et les accords de laboratoire sont attachés à l'enregistrement. Un licencié peut prouver qu'il détient une licence en vigueur sans montrer laquelle. Une obligation sur un parent, comme une redevance, apparaît sur chaque descendant confirmé par les deux détenteurs ; VeilCore l'enregistre et ne la perçoit pas. Testé sur un réseau de test de Midnight ; simulé dans la démo web.",
  'm.get.3a': 'Une lignée acceptée des deux côtés.',
  'm.stops.title': "Où ça s'arrête, et ce qui couvre le reste",
  'm.stops.1a': "C'est une preuve, pas un titre.",
  'm.stops.1b': 'Cela ne crée aucun droit nouveau. Cela appuie les droits et les contrats que vous avez déjà.',
  'm.stops.2a': 'Cela fixe le quand, pas le si.',
  'm.stops.2b':
    "Un enregistrement prouve ce qui a été écrit, et quand. Un rapport de laboratoire associé ou la signature d'un laboratoire donne du poids au contenu.",
  'm.stops.3a': 'Cela accompagne les tests ADN, sans les remplacer.',
  'm.stops.3b':
    "Cela date un rapport ADN que vous avez déjà, pour qu'un test ultérieur puisse y être comparé. Un lien de parenté signifie que les deux détenteurs l'ont accepté ; c'est l'ADN qui prouve la filiation.",
  'm.stops.4a': 'Cela ne voit pas ce que personne ne déclare.',
  'm.stops.4b':
    "Une multiplication discrète n'est pas détectée. Mais une fois que vous révoquez une licence, un acheteur ou un laboratoire qui vérifie correctement ne l'acceptera plus comme valide.",
  'm.open.label': 'Format ouvert',
  'm.open.title1': 'Conçu pour',
  'm.open.title2': 'nous survivre.',
  'm.open.1t': 'Une spécification ouverte, trois implémentations.',
  'm.open.1p':
    "Libre à implémenter, pour toujours. TypeScript, Python et Rust s'accordent sur les 100 vecteurs de test du format d'enregistrement (Rust n'exécute pas encore le plus récent, sur l'association de rapports), et chacun peut les exécuter. Nous avons écrit les trois ; une implémentation écrite par quelqu'un d'autre est le test que nous souhaitons le plus.",
  'm.open.1link': 'Les trois implémentations →',
  'm.open.3t': 'Nous ne nous portons pas garants des résultats.',
  'm.open.3p':
    "Un enregistrement montre quelle clé l'a signé, le nom et l'organisme d'accréditation enregistrés avec cette clé, et si l'opérateur de VeilCore a rapproché ce nom d'une liste publique de licences ou d'accréditations, et à quelle date. VeilCore ne se porte garant d'aucun laboratoire : c'est la personne qui vérifie un enregistrement qui décide de ce que vaut une signature.",
  'm.open.4t': 'Chacun peut tenir un registre.',
  'm.open.4p':
    "Le format permet à un laboratoire, un organisme de certification ou un organisme de gestion de droits de tenir le sien, sous son propre domaine web, avec ses propres définitions de champs, et d'ancrer sans nous demander. Le code de notre propre registre n'est pas publié.",
  'm.open.5t': 'Vérifier est gratuit, toujours.',
  'm.open.5p': 'Ni compte, ni paiement, pour personne.',
  'm.faq.label': 'Questions',
  'm.faq.title1': 'Les questions',
  'm.faq.title2': "qu'on nous pose.",
  'm.faq.1q': "Qu'est-ce qui empêche quelqu'un d'enregistrer mon cultivar ?",
  'm.faq.2q': "Ai-je besoin de crypto ou d'un portefeuille ?",
  'm.faq.2a':
    "Non. Créer un enregistrement dans la démo et vérifier n'importe quel enregistrement ne demandent ni portefeuille, ni inscription, ni achat. Votre navigateur garde une clé aléatoire qui retrouve vos enregistrements de démo sur notre serveur. L'empreinte va sur Midnight, une blockchain conçue pour la confidentialité. Vous n'avez jamais affaire à elle directement.",
  'm.faq.3q': 'Est-ce que ça tiendra dans un litige ?',
  'm.faq.3link': 'Les enregistrements comme preuve →',
  'm.faq.4q': 'Que voyez-vous de mes données ?',
  'm.faq.4a':
    "De vos données génétiques : rien. Leur empreinte est calculée sur votre ordinateur, comme celle des fichiers que vous ajoutez, et rien de cela n'est téléversé. Un rapport de laboratoire n'arrive sur notre serveur que lorsqu'un laboratoire vous le renvoie : il est verrouillé pour que vous seul puissiez l'ouvrir, et supprimé après 180 jours. Ce site conserve ce que vous saisissez (noms, dates, notes, conditions des accords) et les noms de vos fichiers de laboratoire, pour que vous puissiez y revenir, et la page de vérification publique d'un enregistrement montre son nom de cultivar. Les laboratoires et les développeurs peuvent sceller des enregistrements dans leurs propres systèmes, pour que seule l'empreinte sorte.",
  'm.faq.4link1': 'Ce que la démo conserve →',
  'm.faq.4link2': "Guide d'intégration →",
  'm.faq.5q': 'Et si VeilCore disparaît ?',
  'm.faq.6q': 'Combien ça coûte ?',
  'm.faq.6a':
    "Créer un enregistrement sur ce site ne coûte rien aujourd'hui. Vérifier un enregistrement est gratuit, toujours.",
  'm.demo.lede':
    "Sans inscription, sans portefeuille. C'est une version de test : utilisez des informations fictives. Les enregistrements sont ancrés par lots, à la main pour l'instant ; les licences et les accords de laboratoire sont simulés, et les associations de rapports ADN ne sont pas encore datées.",
  'm.demo.privacy': 'Ce que la démo conserve →',
  'm.updates.more': 'Toutes les actualités',
  'm.stat1.b': '100 / 100',
  'm.stat1.s':
    "vecteurs de test du format d'enregistrement réussis en TypeScript, Python et Rust sur GitHub (un seul auteur a écrit les trois ; TypeScript est sur npm en version 0.15.0). Un 101e, pour l'association de rapports, n'est pas encore en Rust",
  'm.stat3.s': "Pas encore d'audit de sécurité indépendant. Nos propres revues sont publiques.",
  'm.stat4.b': 'Premiers utilisateurs recherchés',
  'm.stat4.s':
    "Personne ne l'utilise encore pour de vrais enregistrements. Nous cherchons les premiers obtenteurs et laboratoires.",
  'm.addr.title': 'Les contrats, pour qui veut les vérifier.',
  'm.addr.main': 'Contrat principal',
  'm.addr.claims': "Contrat des preuves d'un fait",
  'm.addr.claimsPending': 'Pas encore sur le réseau principal.',
  'm.addr.explorer': 'Les consulter sur midnightexplorer.com (géré par TexLabs) →',
  'm.live.btc.t': 'Un horodatage sur Bitcoin, en plus',
  'm.live.btc.main':
    "Oui. Notre registre horodate sur Bitcoin l'empreinte de chaque lot scellé, avec OpenTimestamps. Le premier est arrivé dans le bloc Bitcoin 971004 le 11 octobre ; une vérification avec l'outil officiel OpenTimestamps reste à faire.",
  'm.live.btc.not': "Récupérer le fichier d'horodatage depuis le site. Aujourd'hui, il n'est que sur notre serveur.",
  'm.contact.1t': 'Obtenteurs et laboratoires',
  'm.contact.1p':
    "Essayez-le sur des enregistrements fictifs, puis dites-nous ce qu'il lui faudrait pour vos vrais enregistrements.",
  'm.contact.2t': 'Certificateurs de semences, examinateurs et organismes de gestion de droits',
  'm.contact.2p': 'Dites-nous quelles preuves vous auriez besoin de voir, et sous quelle forme.',
  'm.contact.3t': 'Développeurs',
  'm.contact.3p': "Ajoutez-le à un logiciel que vous utilisez déjà. Ni compte ni clé d'API chez nous.",
  'm.contact.4t': 'Investisseurs',
  'm.contact.4p': 'Écrivez à Mako, notre CEO.',
  'm.contact.integrate': "Guide d'intégration",
  'm.verify.what':
    'Un enregistrement VeilCore décrit du matériel génétique sans contenir la génétique. Seule son empreinte est publiée, et elle reçoit une date une fois ancrée sur Midnight. En vérifier un est gratuit et ne demande aucun compte.',
  'm.verify.home': "Qu'est-ce que VeilCore ? →",
  'm.verify.example': "Vous ne savez pas ce que vous allez voir ? Regardez d'abord un exemple →",
};

/** The public test site (en-testchain.ts), in this language. Draft, like the rest of this file. */
export const frTestchain: Strings = {
  'm.hero.status':
    "Ceci est le site de test : horodatages, codes de laboratoire et liens de preuve fonctionnent pour de vrai, sur le réseau de test de Midnight. Les enregistrements ici servent à s'entraîner, ce ne sont pas des preuves.",
  'm.claims.status':
    "Un second contrat Midnight. Il a passé toutes les vérifications de bout en bout sur le réseau de test preprod de Midnight le 4 octobre 2026, avec des données de marqueurs fictives, et il est sur le réseau principal de Midnight depuis le 8 octobre 2026. Il n'est pas encore sur ce site.",
  'm.faq.3a':
    "Il est conçu pour servir de preuve, et notre note pour les juristes dit ce qu'il prouve et ce qu'il ne prouve pas. Ce site de test date les enregistrements sur le réseau de test de Midnight, et une date sur un réseau de test n'a aucune valeur probante. Les vrais enregistrements vont sur veilcore.org, qui fonctionne sur le réseau principal de Midnight.",
  'm.stat2.b': 'Site de test',
  'm.stat2.s':
    "Ce site fonctionne sur le réseau de test preprod de Midnight, pour s'entraîner. Les deux contrats sont sur le réseau principal de Midnight depuis le 8 octobre 2026.",
  'm.foot.about':
    "Un format d'enregistrement ouvert pour la génétique végétale et animale. Ceci est le site de test, sur un réseau de test de Midnight ; veilcore.org fonctionne sur le réseau principal de Midnight.",
  'm.for.1p':
    "Scellez un enregistrement et associez-y son rapport ADN. Si la plante réapparaît sous un autre nom, un laboratoire peut comparer un nouveau test avec votre rapport. Quand vous l'associez via le contrat de VeilCore sur Midnight, l'association est datée elle aussi : elle montre que la personne qui contrôlait votre enregistrement à cette date avait ce rapport, ou son SHA-256, à ce moment-là. Ce qui va sur la chaîne est lié à votre enregistrement et cache le rapport, si bien que personne ne peut copier votre association sur son propre enregistrement. Sur ce site de test, vous pouvez dater l'association depuis votre navigateur. VeilCore ne fait pas de tests ADN.",
  'm.demo.lede':
    "Sans inscription, sans portefeuille. Ceci est le site de test : utilisez des informations fictives. Les lots sont ancrés automatiquement sur le réseau de test de Midnight, ce qui date vos enregistrements. Votre navigateur horodate aussi la clé propre à chaque plante, ce qui ne date que la clé (VeilCore paie les frais). Vous pouvez aussi dater l'association d'un rapport ADN. L'accusé de réception d'un laboratoire est une vraie signature avec sa propre clé, conservée hors de la chaîne. Les licences et les accords de laboratoire servent seulement à s'entraîner.",
  'm.privacy.test.text':
    "Ce site utilise le réseau de test preprod de Midnight, pas le réseau principal. Votre navigateur envoie chaque horodatage à ce réseau via le service de frais de VeilCore ; ce que vous avez saisi et vos fichiers n'y sont jamais envoyés. Un réseau de test peut être réinitialisé, et les données de test peuvent être supprimées.",
  'm.privacy.hosts.text':
    'Ce site est hébergé chez Vercel, qui enregistre les adresses IP et les requêtes. Notre serveur de registre, et le service qui paie les frais du réseau de test et relaie les lectures du réseau faites par cette page, fonctionnent chez Railway, qui enregistre les requêtes. Ce service lit le réseau via Blockfrost.',
};
