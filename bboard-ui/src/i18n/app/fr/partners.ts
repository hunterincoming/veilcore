// French (vous). DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md). Terms: see ./index.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const partners = {
  'app.partners.label': 'Pour les partenaires',
  'app.partners.title': 'Exigez un enregistrement VeilCore.',
  'app.partners.titleEm': 'Vérification gratuite. Sans compte.',
  'app.partners.lede':
    'Si votre adhésion, votre collection, votre registre ou votre place de marché demande aux candidats un enregistrement VeilCore, vous pouvez vérifier chacun en quelques secondes, sur votre propre formulaire, sans passer par nous.',
  'app.partners.gives.title': 'Ce qu’exiger un enregistrement vous apporte',
  'app.partners.gives.1.t': 'Une description figée',
  'app.partners.gives.1.d':
    'L’enregistrement a été scellé avant la candidature. Si on vous montre la description plus tard, vous pouvez savoir si c’est celle qui a été scellée.',
  'app.partners.gives.2.t': 'Une date',
  'app.partners.gives.2.d':
    'Une fois l’enregistrement dans un lot daté, chacun peut consulter à quelle date son empreinte existait au plus tard. La date vient de Midnight, ni de VeilCore ni du candidat.',
  'app.partners.gives.3.t': 'Des signatures de laboratoire, vérifiées',
  'app.partners.gives.3.d':
    'Des accusés de réception pour les échantillons et les rapports de laboratoire, chaque signature vérifiée, et si l’opérateur de VeilCore a rapproché le nom du laboratoire d’une liste publique. Un accusé ne compte que si le registre le relie à une livraison de l’enregistrement, et vous voyez si ce qui est arrivé correspond à ce qui a été envoyé.',
  'app.partners.gives.4.t': 'La même vérification pour tous',
  'app.partners.gives.4.d': 'Le lien de chaque candidat est vérifié de la même manière, par votre page.',
  'app.partners.not.title': 'Ce qu’il ne montre pas',
  'app.partners.not.lede':
    'VeilCore ne se porte jamais garant. La vérification dit ce qui a été vérifié et sur la parole de qui repose le reste. C’est vous qui décidez.',
  'app.partners.not.1': 'Ce qu’est le matériel. VeilCore ne voit jamais de génétique.',
  'app.partners.not.2': 'Que la description est vraie ; seulement qu’elle n’a pas changé.',
  'app.partners.not.3': 'Qui détient le matériel, ou l’enregistrement, aujourd’hui.',
  'app.partners.not.4':
    'Que le travail d’un laboratoire est juste. Un nom vérifié signifie qu’une liste publique a été rapprochée, rien de plus.',
  'app.partners.not.5': 'La filiation, les droits, les licences ou le statut juridique.',
  'app.partners.demo.title': 'Essayez',
  'app.partners.demo.lede':
    'Collez le lien de vérification d’un enregistrement. Il est vérifié dans ce navigateur, auprès du registre qu’utilise ce site. Rien n’est envoyé ailleurs, et rien n’est conservé.',
  'app.partners.demo.label': 'Lien de vérification d’un enregistrement VeilCore',
  'app.partners.demo.loading': 'Chargement du champ…',
  'app.partners.steps.title': 'Qui fait quoi',
  'app.partners.steps.applicant': 'Le candidat',
  'app.partners.steps.applicant.1':
    'Crée un enregistrement pour chaque accession, sur veilcore.org ou dans son propre logiciel.',
  'app.partners.steps.applicant.2':
    'Ouvre l’enregistrement, choisit « Montrer à quelqu’un » et appuie sur « Copier le lien ».',
  'app.partners.steps.applicant.3':
    'Colle le lien dans votre formulaire. Si vos règles le demandent, envoie aussi le dossier de preuve de l’enregistrement.',
  'app.partners.steps.you': 'Vous',
  'app.partners.steps.you.1':
    'Ajoutez le champ à votre formulaire (ci-dessous), ou collez les liens reçus dans le champ de cette page.',
  'app.partners.steps.you.2':
    'Décidez de ce que vous acceptez : le lien correspond ; ou en plus daté sur le réseau principal de Midnight ; ou en plus un accusé de réception d’un laboratoire dont le nom a été vérifié.',
  'app.partners.steps.you.3': 'Conservez le résultat de la vérification avec la candidature.',
  'app.partners.form.title': 'Ajoutez-le à votre formulaire',
  'app.partners.form.lede':
    'Un seul fichier, d’environ 40 Ko, servi depuis votre site. Avec « required », le formulaire ne s’envoie pas tant que le lien ne mène pas à un enregistrement qui lui correspond sans rien qui le contredise. Si le candidat change le lien, il faut le vérifier de nouveau.',
  'app.partners.form.example': 'Exemple HTML',
  'app.partners.form.allowTest':
    'Accepte aussi les enregistrements datés sur un réseau de test. Pour essayer : les dates de test n’ont aucune valeur, elles sont donc refusées par défaut.',
  'app.partners.form.unreachable':
    'Si le registre de VeilCore est injoignable, laisse passer le formulaire avec le lien marqué comme non vérifié (le formulaire envoie aussi <name>-unchecked). Sans cela, un champ obligatoire bloque tout le formulaire tant que le registre est indisponible.',
  'app.partners.form.csp':
    'Votre Content Security Policy doit autoriser script-src pour l’endroit d’où vous servez le fichier et connect-src pour le registre. Aucune exception pour les styles, les images ou les cadres ; cela fonctionne avec Trusted Types. Pas de cookies, pas de stockage, pas de pistage.',
  'app.partners.form.status':
    'Pas encore sur npm : compilez-le depuis partner-kit/record-check dans le dépôt VeilCore et servez le fichier depuis votre site.',
  'app.partners.facts.title': 'Avant de vous y fier',
  'app.partners.facts.cost': 'Coût',
  'app.partners.facts.cost.d':
    'La vérification est gratuite, pour vous comme pour tout le monde. Pas de compte, pas de clé, pas de contrat.',
  'app.partners.facts.support': 'Assistance',
  'app.partners.facts.support.d': 'E-mail : <link></link>. Il n’y a ni contrat d’assistance ni délai de réponse.',
  'app.partners.facts.data': 'Données',
  'app.partners.facts.data.d':
    'Une vérification envoie au registre l’identifiant et l’empreinte de l’enregistrement, rien sur le candidat ni sur votre formulaire. Comme tout site web, le registre reçoit l’adresse réseau du visiteur à chaque requête, pour limiter le débit. Ce que VeilCore conserve figure sur la <link>page de confidentialité</link>. Des conditions plus complètes sur les données sont un projet en cours de relecture ; jusqu’à leur publication, c’est la page de confidentialité qui s’applique.',
  'app.partners.facts.down': 'Si le registre est indisponible',
  'app.partners.facts.down.d':
    'Rien ne peut être vérifié. Par défaut, un champ obligatoire bloque alors le formulaire jusqu’à ce que le registre réponde de nouveau. Avec when-unreachable="allow", le formulaire passe avec le lien marqué comme non vérifié, et vous le vérifiez plus tard sur cette page.',
  'app.partners.facts.gone': 'Si VeilCore s’arrête',
  'app.partners.facts.gone.d':
    'Le champ et les pages de vérification de veilcore.org cessent de fonctionner. Les enregistrements restent vérifiables grâce à leurs dossiers de preuve, qui se vérifient hors ligne selon un format ouvert. Demandez les dossiers de preuve si votre programme ne doit pas dépendre de VeilCore.',
  'app.partners.facts.npm': 'Pas encore sur npm',
  'app.partners.facts.npm.d':
    'Compilez le kit depuis le dépôt VeilCore et servez le fichier du champ depuis votre site.',
  'app.partners.policy.title': 'Exemple de règlement',
  'app.partners.policy.note': 'Texte d’exemple, pas un conseil juridique. Adaptez-le à vos propres règles.',
  'app.partners.policy.1':
    'Les candidats doivent fournir un lien de vérification d’un enregistrement VeilCore pour chaque accession qu’ils déposent. L’enregistrement doit exister et le lien doit lui correspondre. [Programme] vérifie chaque lien à la réception de la candidature et conserve le résultat avec celle-ci.',
  'app.partners.policy.2':
    'Un enregistrement VeilCore est la déclaration du candidat sur son matériel, avec empreinte et date. Accepter un enregistrement ne signifie pas que [Programme] ou VeilCore confirme ce qu’est le matériel, qui le détient, ni aucun droit sur celui-ci.',
  'app.partners.dev.title': 'Pour les développeurs',
  'app.partners.dev.1': 'Un seul appel',
  'app.partners.dev.1.d':
    'checkRecord(link), dans Node ou un navigateur, renvoie du JSON simple : recordExists, fingerprintMatches, dated (network, batch, transaction, block time, checkedOnChain), keyBound, labReceipts avec la vérification de chaque nom, et whatThisDoesNotShow.',
  'app.partners.dev.2': 'Sur Midnight',
  'app.partners.dev.2.d':
    'Dans Node, avec @veilcore/contracts installé, l’horodatage est consulté sur la chaîne : le contrat épinglé de VeilCore, le build épinglé, exactement cette racine de lot.',
  'app.partners.dev.3': 'Ligne de commande',
  'app.partners.dev.3.d':
    'partner-kit check <link> affiche la même réponse. Code 0 : l’enregistrement existe, le lien correspond et rien ne le contredit. Code 1 : quelque chose ne tient pas, y compris une date sur un réseau de test (sauf avec --allow-test-network) ou une preuve d’inclusion qui ne se vérifie pas. Code 2 : rien n’a pu être vérifié.',
  'app.partners.dev.4': 'Sans VeilCore',
  'app.partners.dev.4.d':
    'Le dossier de preuve d’un enregistrement se vérifie hors ligne, et le format est ouvert. Si VeilCore disparaît, les enregistrements dont vous détenez les dossiers de preuve restent vérifiables.',
  'app.partners.dev.guide': 'Lire le guide complet',
  'app.partners.dev.kit': 'Le code source du kit',
} satisfies Partial<AppTranslation>;
