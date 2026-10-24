// The mainnet overlay in Français (French): the same flags and the same facts as en-mainnet.ts,
// built by mainnet-overlay.ts. Draft, like the rest of this language; shown under the draft
// banner. The dated posts keep the network they ran on.
// SPDX-License-Identifier: Apache-2.0

import type { Strings } from './en';
import { buildMainnet } from './mainnet-overlay';

const sendsCommon: Strings = {
  'm.hero.status':
    'Le contrat de VeilCore est sur le réseau principal de Midnight. Les enregistrements scellés sur ce site sont de vrais enregistrements : ils vont dans des lots qui y sont ancrés automatiquement. Prouver un enregistrement par un lien et dater un rapport ADN fonctionnent aussi ici, et VeilCore paie les frais du réseau. Les licences et les accords avec les laboratoires sont encore simulés ici.',
  'm.faq.3a':
    "Il est conçu pour servir de preuve, et notre note pour les juristes dit ce qu'un enregistrement prouve et ce qu'il ne prouve pas. Les enregistrements scellés ici vont dans des lots ancrés automatiquement sur le réseau principal de Midnight. Une fois le lot d'un enregistrement ancré, la date montre que l'enregistrement existait à ce moment-là ; ce que cela vaut dans un litige, c'est au tribunal d'en juger.",
  'm.demo.lede':
    "Pas d'inscription, pas de portefeuille. Les enregistrements que vous scellez ici sont de vrais enregistrements : chacun va dans un lot ancré automatiquement sur le réseau principal de Midnight ; sa page de vérification indique quand son lot est ancré. La vérification est gratuite, et VeilCore paie les frais du réseau pour ce que votre navigateur envoie. Les licences et les accords avec les laboratoires sont simulés. Le nom d'un enregistrement est verrouillé comme le reste ; un lien de vérification ne le contient que si vous l'activez.",
  'm.privacy.lede':
    'Cette note porte sur ce site. Les enregistrements que vous scellez ici sont de vrais enregistrements : ils vont dans des lots ancrés automatiquement sur le réseau principal de Midnight.',
  'm.privacy.test.text':
    "Le code de preuve de votre enregistrement va dans un lot, et le lot est ancré automatiquement sur le réseau principal de Midnight. Quand vous datez la clé propre à votre enregistrement, prouvez un enregistrement par un lien ou datez l'association d'un rapport ADN, votre navigateur envoie lui-même cette transaction, via le service de frais de VeilCore, qui paie les frais. Ce que vous avez saisi et vos fichiers ne sont jamais envoyés au réseau. Une fois sur le réseau, c'est permanent : personne, pas même nous, ne peut le supprimer.",
  'm.privacy.hosts.text':
    'Ce site est hébergé chez Vercel, qui enregistre les adresses IP et les requêtes. Notre serveur de registre et le service qui paie les frais du réseau et relaie les lectures du réseau de cette page fonctionnent chez Railway, qui enregistre les requêtes. Ce service lit le réseau via Blockfrost.',
  'm.for.1p':
    "Scellez un enregistrement et associez-y son rapport ADN. Si la plante réapparaît sous un autre nom, un laboratoire peut comparer un nouveau test avec votre rapport. Sur ce site, vous pouvez dater l'association depuis votre navigateur, et personne ne peut la copier sur son propre enregistrement. VeilCore ne fait pas de tests ADN.",
  'm.for.6p':
    'On vous envoie un lien. Vous touchez une fois, et la page de votre interlocuteur vérifie sur le réseau que vous contrôlez la clé propre à votre plante. Votre enregistrement a nommé cette clé au moment où il a été scellé : elle ne peut donc pas être remplacée. Cela ne dit rien de qui vous êtes ni de qui a obtenu la plante.',
  'm.live.stamp.main':
    'Oui. Les lots sont datés automatiquement, et cela date votre enregistrement. Votre navigateur appose aussi un horodatage sur la clé propre à votre enregistrement, qui ne date que la clé.',
  'm.live.dna.main': 'Oui, envoyé depuis votre navigateur. VeilCore paie les frais.',
};

export const frMainnet = buildMainnet({
  common: {
    'm.hero.status':
      "Le contrat de VeilCore est sur le réseau principal de Midnight. Les enregistrements scellés sur ce site sont de vrais enregistrements : ils vont dans des lots que nous y ancrons à la main pour l'instant. Les licences et les accords avec les laboratoires sont encore simulés ici.",
    'm.faq.3a':
      "Il est conçu pour servir de preuve, et notre note pour les juristes dit ce qu'un enregistrement prouve et ce qu'il ne prouve pas. Les enregistrements scellés ici vont dans des lots que nous ancrons à la main sur le réseau principal de Midnight. Une fois le lot d'un enregistrement ancré, la date montre que l'enregistrement existait à ce moment-là ; ce que cela vaut dans un litige, c'est au tribunal d'en juger.",
    'm.stat2.b': 'Réseau principal',
    'm.foot.about':
      "Un format d'enregistrement ouvert pour la génétique végétale et animale. Les enregistrements sont datés par ancrage sur le réseau principal de Midnight.",
    'm.get.2b':
      "Ils sont attachés à l'enregistrement. Un licencié peut prouver qu'il détient une licence en vigueur sans montrer laquelle. Une redevance ou autre obligation sur un parent apparaît sur chaque descendant confirmé par les deux détenteurs ; VeilCore l'enregistre et ne la perçoit pas. Intégré au contrat sur le réseau principal de Midnight ; simulé sur ce site.",
    'm.demo.lede':
      "Pas d'inscription, pas de portefeuille. Les enregistrements que vous scellez ici sont de vrais enregistrements : chacun va dans un lot que nous ancrons à la main pour l'instant sur le réseau principal de Midnight, donc un nouvel enregistrement peut attendre un moment ; sa page de vérification indique quand son lot est ancré. La vérification est gratuite. Les licences et les accords avec les laboratoires sont simulés, et les associations de rapports ADN ne sont pas datées. Le nom d'un enregistrement est verrouillé comme le reste ; un lien de vérification ne le contient que si vous l'activez.",
    'm.post0.text':
      "Les deux contrats ont passé les 37 vérifications de bout en bout sur le réseau de test preprod de Midnight, y compris les nouvelles preuves d'un fait : une valeur, une plage, une différence, une correction qui laisse le reste inchangé et une signature d'une clé de laboratoire de test. Données de marqueurs fictives.",
    'm.post2.title': 'Une exécution complète sur le réseau de test de Midnight',
    'm.post2.text':
      'Le contrat a été déployé sur le réseau de test de Midnight et a passé les 26 vérifications de bout en bout, en utilisant 16 de ses 24 opérations avec de vraies preuves.',
    'm.contact.1p': 'Créez un enregistrement, puis dites-nous ce qui manque pour votre travail.',
    'm.nav.demo': 'Créer un enregistrement',
    'm.foot.demo': 'Créer un enregistrement',
    'm.hero.demoLabel': 'Code de preuve en direct',
    'm.demo.label': "L'utiliser",
    'm.demo.title1': 'Créez un enregistrement',
    'm.demo.title2': 'ou vérifiez-en un.',
    'm.demo.create.text': 'Enregistrez une plante ou un animal, gardez votre sauvegarde, puis voyez sa page.',
    'm.demo.privacy': 'Ce que ce site conserve →',
    'm.faq.4link1': 'Ce que ce site conserve →',
    'm.faq.2a':
      "Non. Créer un enregistrement sur ce site et vérifier n'importe quel enregistrement ne demandent ni portefeuille, ni inscription, ni achat. Votre navigateur garde une clé aléatoire qui retrouve vos enregistrements sur notre serveur. Le code de preuve va sur Midnight, un réseau conçu pour la confidentialité. Vous n'avez jamais affaire à lui directement.",
    'm.for.1p':
      "Scellez un enregistrement et associez-y son rapport ADN. Si la plante réapparaît sous un autre nom, un laboratoire peut comparer un nouveau test avec votre rapport. Sur ce site, l'association est conservée avec votre enregistrement mais pas encore datée. VeilCore ne fait pas de tests ADN.",
    'm.for.3p':
      "Envoyez du matériel avec un code laboratoire. Le laboratoire signe un accusé de réception avec sa propre clé, et l'enregistrement montre ainsi une seconde partie. L'accusé est une vraie signature, conservée par le registre de VeilCore, pas sur la chaîne. Des conditions comme l'interdiction de multiplier ne sont qu'un exercice sur ce site.",
    'm.for.6p':
      'On vous envoie un lien. Vous touchez une fois, et la page de votre interlocuteur vérifie sur le réseau que vous contrôlez la clé propre à votre plante. Votre enregistrement a nommé cette clé au moment où il a été scellé : elle ne peut donc pas être remplacée. Cela ne dit rien de qui vous êtes ni de qui a obtenu la plante. Ce site ne peut pas encore le faire.',
    'footer.privacy': 'Confidentialité du site',
    'title.privacy': 'Confidentialité du site',
    'm.foot.privacy': 'Confidentialité du site',
    'm.privacy.label': 'Confidentialité du site',
    'm.privacy.title': 'Ce que ce site conserve.',
    'm.privacy.lede':
      'Cette note porte sur ce site. Les enregistrements que vous scellez ici sont de vrais enregistrements : ils vont dans des lots que nous ancrons à la main sur le réseau principal de Midnight.',
    'm.privacy.stored.title': 'Conservé sur notre serveur',
    'm.privacy.stored.text':
      "Vos enregistrements et accords, verrouillés par votre navigateur avant d'être envoyés : le nom de chaque enregistrement, obtenteur, espèce, dates, notes, numéros de référence, parents, les codes de preuve et noms de fichier des photos et rapports de laboratoire que vous ajoutez, conditions et contreparties des accords, la quantité et la note que vous envoyez à un laboratoire, les informations d'échantillon que vous et le laboratoire écrivez (identifiant d'échantillon, numéro de scellé, où et quand il a été prélevé, un témoin, son état à l'arrivée), les noms que vous donnez aux destinataires, et les clés secrètes de chaque enregistrement. Notre serveur les conserve verrouillés, et nous n'avons pas la clé : elle est dans votre navigateur et dans votre fichier de secours. La clé des informations d'échantillon se trouve aussi dans le code de laboratoire, pour que le laboratoire puisse les ouvrir. Si vous le choisissez, le nom d'un enregistrement voyage aussi dans un lien de vérification que vous créez, après le #. Un navigateur n'envoie pas cette partie quand il ouvre le lien, mais le lien va entier à toute personne à qui vous l'envoyez et à tout site où vous le collez, y compris le formulaire d'un partenaire. Notre serveur peut lire : l'identifiant de chaque enregistrement ; son code de preuve, son lien de clé et son type de profil ; un code fait à partir de son nom, qui ne dit rien du nom sans la clé de votre lien de vérification ; ses liens de correction (quel enregistrement une correction remplace, quels champs elle a modifiés, et quand) ; quand le serveur l'a vu pour la première fois ; combien de fois il a été enregistré, et quand pour la dernière fois ; à peu près sa taille (sa tranche de taille) ; ce que vous choisissez de montrer sur sa page de vérification (son nom, si vous choisissez de le montrer, et si un rapport ADN est enregistré, sous la forme d'un code qui ne dit rien du fichier sans la clé de votre lien de vérification) ; les liens de parenté que vous enregistrez ; et son lot avec son horodatage. Si un accord prévoit une redevance sur la descendance, notre serveur peut lire quel enregistrement il couvre et depuis quand il s’applique, et chacun peut demander si cet enregistrement en porte une : la vérification de lignée en a besoin. Pour un envoi : de quel enregistrement il vient, quel compte de détenteur l'a reçu, quand il a été reçu, et une étiquette à la place du nom du destinataire. Pour les laboratoires : la clé publique de signature et les signatures qu'ils publient. La signature d'un laboratoire sur un rapport désigne le rapport lié à votre enregistrement avec une clé que seuls vous et le laboratoire détenez ; une signature faite avant le 17 octobre 2026 désigne le SHA-256 du fichier du rapport, que notre serveur ne montre qu'à vous et au laboratoire. Les demandes de prouver la clé d'un enregistrement, avec le nom saisi par le demandeur, pendant 7 jours : notre serveur apprend quelle clé sur la chaîne chaque demande désigne. Les pages de preuve et de vérification n'envoient jamais votre clé de détenteur. Votre clé de détenteur, que votre navigateur envoie à chaque enregistrement pour que le serveur retrouve vos enregistrements ; le serveur n'en garde qu'un condensé à sens unique. Le texte enregistré avant le verrouillage a été supprimé de notre serveur le 18 octobre 2026, et les sauvegardes externes faites avant ne peuvent plus être ouvertes : nous avons détruit leur clé le même jour. Les rapports de laboratoire verrouillés qu'un laboratoire vous envoie : conservés verrouillés, sans la clé, et supprimés après 180 jours. Le serveur est le registre de VeilCore, hébergé chez Railway.",
    'm.privacy.test.title': 'Daté sur le réseau principal de Midnight',
    'm.privacy.test.text':
      "Le code de preuve de votre enregistrement va dans un lot, et nous ancrons le lot sur le réseau principal de Midnight, à la main pour l'instant, ce qui peut prendre un moment. Seul le code du lot va sur le réseau, jamais ce que vous avez saisi. Une fois ancré, il est permanent : personne, pas même nous, ne peut le supprimer.",
    'm.privacy.madeup.title': 'Ce que des inconnus peuvent voir',
    'm.privacy.madeup.text':
      "Le nom d'un enregistrement est conservé verrouillé, comme tout ce que vous saisissez dans un enregistrement, sauf si vous choisissez de l'afficher sur sa page de vérification. Un lien de vérification que vous créez ne contient le nom après le # que si vous l'activez ; les personnes à qui vous l'envoyez le voient alors, ainsi que toute personne à qui elles transmettent le lien. Les informations d'échantillon que vous et un laboratoire écrivez sont aussi conservées verrouillées. Vos fichiers ADN ne quittent jamais votre appareil. Les rapports de laboratoire circulent verrouillés.",
    'm.privacy.delete.text':
      "Nous pouvons supprimer ce que notre serveur conserve pour vos enregistrements : écrivez à hunter@veilcore.org en indiquant les identifiants des enregistrements. Le code d'un lot déjà ancré sur Midnight y reste.",
  },
  claimsLive: {
    'm.claims.status':
      "Un second contrat Midnight, sur le réseau principal de Midnight. Avant le lancement, il a réussi toutes les vérifications de bout en bout, avec des données de marqueurs inventées. Il n'est pas encore sur ce site.",
    'm.stat2.s':
      "Les deux contrats sont sur le réseau principal de Midnight. Les enregistrements scellés sur ce site vont dans des lots que nous y ancrons à la main pour l'instant.",
  },
  claimsPending: {
    'm.claims.status':
      "Un second contrat Midnight. Lors des tests avant le lancement, il a réussi toutes les vérifications de bout en bout, avec des données de marqueurs inventées. Il n'est pas encore sur le réseau principal de Midnight, ni sur ce site.",
    'm.stat2.s':
      "Le contrat principal est sur le réseau principal de Midnight. Les enregistrements scellés sur ce site vont dans des lots que nous y ancrons à la main pour l'instant. Le contrat de revendications suivra.",
  },
  keyHolders:
    "Une clé de maintenance peut modifier le fonctionnement du contrat principal de VeilCore sur Midnight. Son détenteur peut ajouter ou remplacer des opérations du contrat, ce qui pourrait lui permettre de prendre le contrôle de l'identité de n'importe quel enregistrement, d'ajouter des licences au nom de n'importe quel émetteur, d'ajouter ou de retirer des obligations et des liens de parenté, ou de désactiver des opérations. Elle ne peut pas antidater les heures de bloc du réseau, et chaque modification est visible sur la chaîne. Elle ne peut ni modifier ni retirer un lot déjà ancré, ni la date qu’il donne à un enregistrement : elle se trouve dans la transaction qui l’a ancré, que personne ne peut modifier. Aujourd'hui, la clé est sur papier, une copie chez chaque fondateur, et une seule copie suffit pour l'utiliser. Le passage à un groupe de clés qui doivent s'accorder est prévu, mais pas encore fait.",
  policyApproved: ' Chaque utilisation est annoncée publiquement, selon une politique de maintenance écrite.',
  policyProposed: ' Une politique pour son utilisation est proposée, pas encore décidée.',
  claimsNoKey:
    " Le contrat de revendications n'a pas de clé de maintenance : personne, pas même nous, ne peut le modifier.",
  keyTitlePlural: 'Qui peut modifier les contrats.',
  keyLinkApproved: 'Lire la politique de maintenance →',
  keyLinkProposed: 'Lire la politique proposée →',
  reads: {
    'm.tech.check.p':
      "Recalculer le code de preuve d'un enregistrement ne demande que SHA-256 et la spécification ouverte. Sa preuve d'inclusion relie ce code de preuve à un code de preuve de lot ancré sur Midnight, et la transaction qui l'a ancré donne la date du lot. Le verify.html du dossier de preuve refait ce calcul hors ligne et nomme la transaction et le code de preuve de lot à consulter. La page de vérification consulte elle-même cette transaction sur Midnight. Les enregistrements scellés depuis le 14 octobre nomment leur propre clé ; les vérifier demande donc aussi la section 3.6.1, dans la spécification sur ce site et dans le SDK 0.16.0 et suivants. Rechercher un enregistrement par son identifiant sur ce site passe par notre serveur.",
    'm.live.chain.main': 'Oui.',
    'm.privacy.hosts.text':
      'Ce site est hébergé chez Vercel, qui enregistre les adresses IP et les requêtes. Notre serveur de registre et le service en lecture seule qui relaie les lectures du réseau de cette page fonctionnent chez Railway, qui enregistre les requêtes. Ce service lit le réseau via Blockfrost.',
  },
  notReads: {
    'm.tech.check.p':
      "Recalculer le code de preuve d'un enregistrement ne demande que SHA-256 et la spécification ouverte. Sa preuve d'inclusion relie ce code de preuve à un code de preuve de lot ancré sur Midnight, et la transaction qui l'a ancré donne la date du lot. Le verify.html du dossier de preuve refait ce calcul hors ligne et nomme la transaction et le code de preuve de lot à consulter. La page de vérification lira elle-même Midnight une fois notre relais en lecture seule en service ; d'ici là, elle indique que la date est celle que rapporte notre registre, et vous pouvez consulter la transaction vous-même sur un explorateur Midnight. Les enregistrements scellés depuis le 14 octobre nomment leur propre clé ; les vérifier demande donc aussi la section 3.6.1, dans la spécification sur ce site et dans le SDK 0.16.0 et suivants. Rechercher un enregistrement par son identifiant sur ce site passe par notre serveur.",
  },
  sends: (claimsOnMainnet) => ({
    ...sendsCommon,
    'm.stat2.s': claimsOnMainnet
      ? 'Les deux contrats sont sur le réseau principal de Midnight. Les enregistrements scellés sur ce site vont dans des lots qui y sont ancrés automatiquement.'
      : 'Le contrat principal est sur le réseau principal de Midnight. Les enregistrements scellés sur ce site vont dans des lots qui y sont ancrés automatiquement. Le contrat de revendications suivra.',
  }),
});
