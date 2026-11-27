// The record app in French: document records (../en/document.ts). DRAFT: machine-assisted,
// to be checked by a fluent speaker before publishing (docs/translations/README.md).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const document = {
  'app.doc.orDocument':
    'Vous voulez plutôt sceller un document ? Un permis, un certificat d’analyse, un contrat, un document de transport.',
  'app.doc.orDocumentAction': 'Sceller un document',
  'app.doc.new.title': 'Sceller un document',
  'app.doc.new.intro':
    'Choisissez le fichier. Il reste sur cet appareil. Seuls un code calculé à partir de son contenu, son nom et sa taille sont scellés, avec une date que personne ne peut avancer. Si un seul caractère du fichier change, le code ne correspond plus.',
  'app.doc.new.proves':
    'Ce que cela montrera : un fichier avec exactement ces octets était entre vos mains au plus tard à la date où il est scellé. Pas que le document est authentique, que l’émetteur l’a émis, ni que ce qu’il dit est vrai.',
  'app.doc.f.files': 'Fichiers',
  'app.doc.f.filesHelp': 'Jusqu’à {max} : un contrat et ses annexes, un certificat d’analyse et ses chromatogrammes.',
  'app.doc.f.add': 'Ajouter un fichier',
  'app.doc.f.addMore': 'Ajouter un autre fichier',
  'app.doc.f.reading': 'Lecture de {name}…',
  'app.doc.f.tooLarge': '{name} dépasse {mb} Mo, il ne peut donc pas être lu ici.',
  'app.doc.f.duplicate': '{name} est le même fichier qu’un fichier déjà ajouté.',
  'app.doc.f.full': 'Cela fait {max} fichiers, le maximum pour un document.',
  'app.doc.f.remove': 'Retirer {name}',
  'app.doc.f.title': 'Titre',
  'app.doc.f.titleHelp': 'Comment vous l’appelleriez : « Document de transport 0042 », « Certificat d’analyse lot 7 ».',
  'app.doc.f.type': 'Type',
  'app.doc.f.issuer': 'Émis par (facultatif)',
  'app.doc.f.issuerHelp': 'Tel qu’indiqué dessus. C’est votre déclaration ; cela ne montre pas qu’ils l’ont émis.',
  'app.doc.f.reference': 'Numéro de référence (facultatif)',
  'app.doc.f.referenceHelp': 'Un numéro de permis, de facture, un lot.',
  'app.doc.f.issued': 'Date sur le document (facultatif)',
  'app.doc.f.about': 'Ce qu’il concerne (facultatif)',
  'app.doc.f.aboutHelp': 'Vos enregistrements qu’il concerne : un certificat d’analyse avec la plante testée.',
  'app.doc.f.aboutNone': 'Aucun',
  'app.doc.f.holder': 'Détenu par',
  'app.doc.f.holderHelp': 'Vous, ou votre organisation.',
  'app.doc.f.notes': 'Notes (facultatif)',
  'app.doc.need.file': 'Ajoutez d’abord le fichier.',
  'app.doc.need.title': 'Donnez-lui un titre.',
  'app.doc.need.holder': 'Indiquez qui le détient.',
  'app.doc.need.heading': 'Il manque encore, avant de pouvoir le sceller :',
  'app.doc.seal': 'Le sceller',
  'app.doc.sealing': 'Scellement…',
  'app.doc.type.permit': 'Permis ou licence',
  'app.doc.type.certificate-of-analysis': 'Certificat d’analyse (COA)',
  'app.doc.type.lab-report': 'Rapport de laboratoire',
  'app.doc.type.contract': 'Contrat ou accord',
  'app.doc.type.protocol': 'Protocole ou procédure',
  'app.doc.type.transport': 'Document de transport ou d’expédition',
  'app.doc.type.invoice': 'Facture ou reçu',
  'app.doc.type.other': 'Procès-verbal, résolution ou autre',
  'app.doc.kind': 'Document',
  'app.doc.homeLine': 'Document · {type}',
  'app.doc.k.type': 'Type',
  'app.doc.k.issuer': 'Émis par (votre déclaration)',
  'app.doc.k.issuerHolder': 'Émis par (déclaration du détenteur)',
  'app.doc.k.reference': 'Référence',
  'app.doc.k.issued': 'Date sur le document',
  'app.doc.k.files': 'Fichiers',
  'app.doc.k.about': 'Concerne',
  'app.doc.k.holder': 'Détenu par',
  'app.doc.k.notes': 'Notes',
  'app.doc.k.sealed': 'Scellé (horloge de cet appareil)',
  'app.doc.k.dated': 'Date sur Midnight',
  'app.doc.k.proofCode': 'Code de preuve',
  'app.doc.fileSize': '{size} octets',
  'app.doc.share.title': 'Prouver que vous aviez ce fichier',
  'app.doc.share.text':
    'Envoyez-lui le fichier et ce lien. Son navigateur vérifie que le fichier est, octet pour octet, l’un de ceux scellés ici, et quand il a été daté : rien n’est envoyé, et la réponse ne repose pas sur la parole de VeilCore.',
  'app.doc.share.warn':
    'Le lien montre à quiconque l’a tout ce que contient cet enregistrement de document : titre, type, émetteur, référence, date, le nom et le SHA-256 de chaque fichier, les noms des enregistrements qu’il concerne et vos notes. Jamais le fichier lui-même.',
  'app.doc.share.copy': 'Copier le lien : prouve que vous aviez ce fichier',
  'app.doc.share.notDatedYet':
    'Pas encore daté. Toute personne qui ouvre le lien maintenant lira qu’il ne faut pas s’y fier. Envoyez-le une fois que cette page affiche une date.',
  'app.doc.share.copied': 'Copié.',
  'app.doc.compare.title': 'Est-ce le même fichier ?',
  'app.doc.compare.text': 'Choisissez un fichier à comparer avec ceux scellés ici. Il n’est pas envoyé.',
  'app.doc.compare.pick': 'Choisir un fichier',
  'app.doc.compare.match': '<b>{name}</b> est, octet pour octet, {sealed}, scellé ici.',
  'app.doc.compare.matchSame': '<b>{name}</b> est, octet pour octet, le fichier scellé ici.',
  'app.doc.compare.noMatch':
    '<b>Pas de correspondance.</b> {name} n’est pas le fichier scellé. L’enregistrer à nouveau, l’imprimer en PDF ou l’envoyer par certaines applications modifie le fichier : demandez le fichier d’origine.',
  'app.doc.new.introTech': 'Pour les spécialistes : ce code est le SHA-256 du fichier.',
  'app.doc.backupFirst':
    'Scellé. Enregistrez maintenant une sauvegarde et vérifiez-la. D’ici là, les clés de cet enregistrement ne sont que dans ce navigateur, et VeilCore ne conserve pas encore de copie de l’enregistrement pour vous. Cela vous sera demandé jusqu’à ce qu’une sauvegarde contenant la clé de ce navigateur soit vérifiée.',
  'app.doc.notBacked':
    'Pas encore dans une sauvegarde vérifiée. D’ici là, les clés de cet enregistrement ne sont que dans ce navigateur.',
  'app.doc.tech.title': 'Détails techniques',
  'app.doc.tech.text':
    'Inutile pour la date de ce document. Horodater la clé de cet enregistrement sur Midnight vous permet de montrer plus tard, si on vous le demande, que vous détenez toujours cet enregistrement.',
  'app.doc.home.sealedOn': 'Scellé le {date}',
  'app.doc.home.dated': 'Daté le {date}',
  'app.doc.home.waiting': 'en attente de sa date',
  'app.doc.home.datedReported': 'Daté le {date} (selon VeilCore)',
  'app.doc.home.checkingDate': 'date annoncée, en cours de vérification',
  'app.doc.home.notConfirmed': 'date non confirmée sur Midnight',
  'app.doc.compare.tooLarge': 'Ce fichier dépasse {mb} Mo, il ne peut donc pas être lu ici.',
  'app.doc.check.title': 'Vérifier un document',
  'app.doc.check.intro':
    'Quelqu’un vous a envoyé un document et ce lien. Choisissez le fichier reçu : votre navigateur vérifie que c’est le même fichier, octet pour octet (rien n’est envoyé), et affiche sa date sur Midnight, une blockchain publique, en la vérifiant lui-même quand il le peut.',
  'app.doc.check.missing':
    'Ce lien ne contient aucun enregistrement de document. Demandez le lien complet à la personne qui l’a envoyé.',
  'app.doc.check.unreadable': 'Ce lien est endommagé. Redemandez-le.',
  'app.doc.check.notDoc': 'Ce que contient ce lien n’est pas un enregistrement de document vérifiable ici.',
  'app.doc.check.recomputed': 'Code de preuve, recalculé ici à partir du lien',
  'app.doc.check.registryOnly':
    'Le registre de VeilCore donne cette date. Cette page ne peut pas la vérifier sur Midnight : pour l’instant, elle repose sur la parole de VeilCore.',
  'app.doc.check.notConfirmed':
    'Le registre de VeilCore donne cette date, mais cette page n’a pas pu la confirmer sur Midnight pour l’instant. Réessayez dans quelques minutes avant de vous y fier.',
  'app.doc.check.notDated':
    'Rien ne date encore cet enregistrement, ou le lien a été modifié. Ne vous y fiez pas avant qu’il affiche une date.',
  'app.doc.check.what':
    'Ce que cela montre : un fichier avec exactement ces octets était entre les mains du détenteur au plus tard à cette date. Ce que cela ne montre pas : que le document est authentique, que l’émetteur l’a émis, ni que ce qu’il dit est vrai. « Émis par » est la déclaration du détenteur.',
  'app.doc.check.whatUndated':
    'Ce que cela montrera, une fois daté : un fichier avec exactement ces octets était entre les mains du détenteur au plus tard à sa date. Ce que cela ne montre pas : que le document est authentique, que l’émetteur l’a émis, ni que ce qu’il dit est vrai. « Émis par » est la déclaration du détenteur.',
  'app.doc.check.inLink': 'Dans le lien (les propres mots du détenteur)',
  'app.doc.nums.title': 'Les chiffres qui y figurent (facultatif)',
  'app.doc.nums.help':
    'Saisissez-les tels qu’imprimés. Ils sont scellés avec le document pour que vous puissiez plus tard en prouver un, comme « germination d’au moins 85 % », sans montrer les autres ni le certificat.',
  'app.doc.nums.which': 'Quels chiffres',
  'app.doc.nums.none': 'Aucun',
  'app.doc.nums.bad': 'Un nombre avec au plus {places} décimales, comme 0,21.',
  'app.doc.need.numbers': 'L’un des chiffres ne peut pas être enregistré par ce formulaire. Corrigez-le ou effacez-le.',
  'app.doc.need.aNumber': 'Saisissez au moins un chiffre, ou choisissez « Aucun ».',
  'app.doc.schema.potency': 'Teneur en cannabinoïdes',
  'app.doc.schema.seed-quality': 'Qualité des semences',
  'app.doc.slot.totalThc': 'THC total',
  'app.doc.slot.delta9Thc': 'THC delta-9',
  'app.doc.slot.thca': 'THCA',
  'app.doc.slot.totalCbd': 'CBD total',
  'app.doc.slot.cbda': 'CBDA',
  'app.doc.slot.cbg': 'CBG',
  'app.doc.slot.totalCannabinoids': 'Cannabinoïdes totaux',
  'app.doc.slot.moisture': 'Humidité',
  'app.doc.slot.germination': 'Germination',
  'app.doc.slot.pureSeed': 'Semences pures',
  'app.doc.slot.otherCropSeed': 'Semences d’autres cultures',
  'app.doc.slot.weedSeed': 'Graines d’adventices',
  'app.doc.slot.inertMatter': 'Matières inertes',
  'app.doc.nums.heldTitle': 'Ses chiffres',
  'app.doc.nums.heldText':
    'Scellés avec ce document sous {schema}. Vous seul les voyez : l’enregistrement contient un code qui les engage, pas les chiffres.',
  'app.claim.title': 'Prouver un fait',
  'app.claim.text':
    'Prouvez à quiconque un fait sans montrer le chiffre en cause, ni les autres chiffres ni le certificat : qu’un chiffre que vous avez scellé respecte une limite, ou qu’un résultat est « non détecté ». La preuve va sur Midnight, où chacun peut la vérifier.',
  'app.claim.example':
    'Par exemple : montrez à un acheteur que la germination d’un lot de semences est d’au moins 85 %, ou qu’un test de pathogènes a donné « non détecté », sans lui donner le chiffre ni le reste de l’enregistrement. Vous choisissez le chiffre et le seuil. Il reçoit un lien qui le vérifie.',
  'app.claim.notReady': 'Les preuves ne sont pas encore activées sur ce site.',
  'app.claim.number': 'Quel chiffre',
  'app.claim.how': 'Que prouver',
  'app.claim.atMost': 'Il est au plus…',
  'app.claim.atLeast': 'Il est au moins…',
  'app.claim.exactly': 'Il est exactement celui-ci (montre le chiffre)',
  'app.claim.bound': 'Seuil',
  'app.claim.boundBad': 'Un nombre avec au plus {places} décimales.',
  'app.claim.wontMeet':
    'Votre chiffre scellé ne respecte pas cela, il ne peut donc pas être prouvé. Rien n’a été envoyé.',
  'app.claim.exactWarn': 'Cela publie {label} : {value} {unit}, visible de tous, pour toujours.',
  'app.claim.already': 'Déjà public sur {label} : {list}.',
  'app.claim.leak': 'Chaque seuil prouvé est public pour toujours, et ensemble ils resserrent le chiffre.',
  'app.claim.computer':
    'La preuve prend une ou deux minutes sur un ordinateur portable et beaucoup de mémoire : utilisez un ordinateur. Les téléphones n’ont pas encore été testés.',
  'app.claim.go': 'Le prouver sur Midnight',
  'app.claim.going': 'Preuve en cours…',
  'app.claim.done': 'Prouvé sur Midnight :',
  'app.claim.copy': 'Copier le lien qui le prouve',
  'app.claim.copied': 'Copié.',
  'app.claim.made': 'Ce que vous avez prouvé',
  'app.claim.line.atMost': '{label} est au plus {bound} {unit}',
  'app.claim.line.atLeast': '{label} est au moins {bound} {unit}',
  'app.claim.line.value': '{label} est {value} {unit}',
  'app.claim.holderTyped': 'Les chiffres sont les vôtres, tels que saisis : aucun laboratoire ne les a signés.',
  'app.claim.check.title': 'Vérifier une preuve',
  'app.claim.verdict.bad': 'Ce lien est illisible : rien n’a été vérifié.',
  'app.claim.verdict.checking': 'Vérification de cette preuve dans votre navigateur…',
  'app.claim.verdict.failed': 'Cette preuve n’a pas passé la vérification. Ne vous y fiez pas.',
  'app.claim.verdict.unreadable':
    'Impossible de lire cette preuve sur Midnight pour le moment. Ne vous y fiez pas tant qu’elle n’est pas confirmée : réessayez dans quelques minutes.',
  'app.claim.verdict.labFailed':
    'Cette preuve a passé la vérification, mais pas la signature du laboratoire. Voir ci-dessous.',
  'app.claim.verdict.someFailed':
    'Cette preuve a passé la vérification, mais pas une autre de ce lien. Voir ci-dessous.',
  'app.claim.verdict.okWhen': 'Prouvé le {date}. Vérifié dans votre navigateur.',
  'app.claim.verdict.notDated':
    'Cette preuve a passé la vérification, mais aucune date sur Midnight n’a été confirmée pour un enregistrement qu’elle nomme. Ne vous y fiez pas tant que cet enregistrement n’affiche pas de date.',
  'app.claim.verdict.dateFailed':
    'Cette preuve a passé la vérification, mais pas la date d’un enregistrement qu’elle nomme. Ne vous fiez pas à la date de cet enregistrement.',
  'app.claim.verdict.ok': 'Cette preuve a passé la vérification dans votre navigateur.',
  'app.claim.verdict.labConflict':
    'Cette preuve a passé la vérification, mais plusieurs laboratoires disent détenir la clé qui l’a signée : lisez les chiffres comme la déclaration du détenteur. Voir ci-dessous.',
  'app.claim.verdict.labWithdrawn':
    'Cette preuve a passé la vérification, mais le laboratoire a retiré sa signature : lisez les chiffres comme la déclaration du détenteur. Voir ci-dessous.',
  'app.doc.verdict.noDate':
    'VeilCore n’a pas encore de date pour ce document exact. Un document tout juste scellé reçoit sa date avec le prochain lot ; un lien modifié ne correspondra pas.',
  'app.doc.verdict.bad': 'Ce lien est illisible : rien n’a été vérifié.',
  'app.doc.verdict.dated': 'Daté du {date}. Vérifié dans votre navigateur.',
  'app.doc.verdict.datedChooseFile':
    'Daté du {date}. Vérifié dans votre navigateur. Choisissez le fichier ci-dessous pour vérifier que c’est le même.',
  'app.doc.verdict.datedSameFile':
    'Daté du {date}, et le fichier choisi est bien celui qui a été scellé. Vérifié dans votre navigateur.',
  'app.doc.verdict.datedOtherFile': 'Daté du {date}, mais le fichier choisi n’est pas celui qui a été scellé.',
  'app.claim.check.intro':
    'Quelqu’un vous a envoyé ce lien pour montrer un fait tiré d’un document scellé, sans montrer ses chiffres ni le document. Cette page lit la preuve sur Midnight et la vérifie.',
  'app.claim.check.oldLink':
    'Ce lien de preuve désigne sa transaction comme le faisait une ancienne version du site : il ne peut donc pas être vérifié. Demandez un nouveau lien à l’expéditeur.',
  'app.claim.check.bad': 'Ce lien est illisible. Redemandez-le.',
  'app.claim.check.checking': 'Lecture de la preuve sur Midnight…',
  'app.claim.check.okWhen': 'Prouvé sur Midnight dans le bloc {block}{date}.',
  'app.claim.check.failed': 'Non confirmé : {reason} Ne vous y fiez pas.',
  'app.claim.check.record': 'L’enregistrement concerné',
  'app.claim.check.what':
    'Ce que cela montre : le chiffre scellé dans cet enregistrement respecte le seuil (ou est cette valeur). Ce que cela ne montre pas : qu’un laboratoire l’a mesuré, ni que le document est authentique ; le détenteur a saisi les chiffres. Chaque seuil prouvé sur un chiffre est public, et ensemble ils le resserrent.',
  'app.claim.check.schema': 'Selon le formulaire publié « {schema} ».',
  // EvidenceBundle.tsx: what differs for a document record.
  'app.doc.bundle.keyIs':
    '(La clé de l’enregistrement est l’identifiant public de la clé créée pour ce document lors du scellement. Sa partie secrète reste dans votre sauvegarde et n’entre jamais dans le dossier.)',
  'app.doc.bundle.includeFiles':
    'Inclure une copie du document. Sans elle, le dossier ne contient que le code de chaque fichier, et la personne qui vérifie aura besoin du fichier séparément.',
  'app.doc.bundle.chooseFiles': 'Choisir le ou les fichiers du document',
  'app.doc.bundle.checkedAgainst':
    'Chacun est comparé aux fichiers scellés dans cet enregistrement avant d’être inclus.',
  'app.doc.bundle.filesAria': 'Fichiers du document',
  'app.doc.bundle.chooseOrUntick': 'Choisissez le fichier du document, ou décochez la case.',
  // ---- kept on this device only (docs/device-only-records.md; DocumentNew.tsx, DocumentDetail.tsx) ----
  'app.doc.local.choice': 'Garder cet enregistrement uniquement sur cet appareil et dans ma sauvegarde',
  'app.doc.local.before': 'Avant de choisir :',
  'app.doc.local.p1':
    'Rien de ce que vous saisissez ici n’est envoyé à VeilCore, verrouillé ou non. Ce qui est envoyé, pour que l’enregistrement reçoive sa date : son identifiant, son code de preuve et sa liaison de clé (un code tiré de la clé propre à l’enregistrement).',
  'app.doc.local.p2': 'Le serveur de VeilCore ne peut pas vous rendre cet enregistrement : il ne l’a à aucun moment.',
  'app.doc.local.p3':
    'Les seules copies sont celle de ce navigateur et celle d’un fichier de sauvegarde enregistré après le scellement. Une sauvegarde enregistrée avant ne contient pas cet enregistrement, et une copie avec clé d’accès ne le contient en aucun cas. Dès le scellement, il vous sera demandé d’enregistrer une sauvegarde et de la vérifier.',
  'app.doc.local.p4': 'Toute personne qui a son lien de vérification et le fichier peut toujours le vérifier.',
  'app.doc.local.p5': 'Ce choix se fait une seule fois, au scellement. Il ne peut pas être modifié ensuite.',
  'app.doc.local.title': 'Gardé uniquement sur cet appareil',
  'app.doc.local.text':
    'Rien de ce qui a été saisi dans cet enregistrement n’a été envoyé à VeilCore, verrouillé ou non. Les seules copies sont dans ce navigateur et dans le fichier de sauvegarde que vous avez vérifié. Si vous perdez les deux, l’enregistrement est perdu : VeilCore ne peut pas vous le rendre. Une sauvegarde enregistrée avant le scellement ne le contient pas, et une copie avec clé d’accès ne le contient en aucun cas.',
  'app.doc.local.notBacked':
    'Pas encore dans une sauvegarde. La seule copie de cet enregistrement est dans ce navigateur : si ses données sont effacées maintenant, l’enregistrement est perdu, et VeilCore ne peut pas vous le rendre. Enregistrez votre fichier de sauvegarde et vérifiez-le maintenant.',
  'app.doc.local.sent':
    'Ce qui est sorti de cet appareil : l’identifiant de l’enregistrement, son code de preuve et sa liaison de clé, envoyés à VeilCore pour le dater. Chaque requête montre à VeilCore votre adresse réseau et l’heure. Si vous avez une copie avec clé d’accès, elle contient l’identifiant et les clés de cet enregistrement, verrouillés, sur le serveur de VeilCore ; en aucun cas ce que vous avez saisi.',
  'app.doc.local.stamp':
    'Horodater la clé de cet enregistrement est votre choix, et seul le bouton ci-dessous le lance. Si vous le faites, un code tiré de la clé part vers Midnight par le service de frais de VeilCore. Rien de ce que vous avez saisi ne l’accompagne.',
  'app.doc.stamp.title': 'Horodater la clé de cet enregistrement sur {network}',
  'app.doc.stamp.button': 'Horodater la clé de cet enregistrement',
  'app.doc.local.conflict':
    'Le serveur de VeilCore a répondu par autre chose que le seul code de preuve de cet enregistrement. Ce que vous voyez est la copie propre à cet appareil. Rien de plus n’est envoyé, et la réponse du serveur ne change rien ici.',
  'app.doc.local.homeNotBacked': 'Uniquement sur cet appareil · pas encore sauvegardé',
  'app.doc.local.backup': 'Enregistrer une sauvegarde',
  'app.doc.local.homeLine': 'Uniquement sur cet appareil',
  'app.doc.local.staysHere':
    'Cet enregistrement est gardé uniquement sur cet appareil ; ce n’est donc pas proposé pour lui.',
  'app.doc.local.delete': 'Supprimer de cet appareil',
  'app.doc.local.deleteConfirm':
    'Supprimer cet enregistrement de cet appareil ? Cela ne peut pas être annulé ici. Un fichier de sauvegarde qui le contient le contient toujours. VeilCore garde ce qui lui a déjà été envoyé : l’identifiant, le code de preuve et la liaison de clé de l’enregistrement. Une copie avec clé d’accès, si vous en avez une, contient encore son identifiant et ses clés jusqu’à ce que vous mettiez cette copie à jour. Si vous avez horodaté sa clé, cela reste sur Midnight. Sa date reste valable pour quiconque a le lien de vérification.',
  'app.doc.local.toRecord': 'Aller à l’enregistrement',
  'app.doc.local.backupNow':
    'Scellé. Enregistrez maintenant une sauvegarde et vérifiez-la : d’ici là, la seule copie de cet enregistrement est dans ce navigateur.',
  'app.doc.local.backupMissing':
    'Cette sauvegarde ne contient pas vos documents gardés uniquement sur cet appareil. Enregistrez-en une nouvelle et vérifiez-la.',
  'app.doc.local.backupFailed':
    'La sauvegarde n’a pas pu être créée : un document gardé uniquement sur cet appareil n’a pas pu y être mis. Rien n’a été enregistré.',
  'app.doc.local.noCorrect':
    'Un enregistrement gardé uniquement sur cet appareil ne peut pas être corrigé. Scellez de nouveau le document comme un nouvel enregistrement.',
  'app.doc.local.unreadable.title': 'Un enregistrement de cet appareil n’a pas pu être lu',
  'app.doc.local.unreadable.text':
    'L’enregistrement {id} est gardé uniquement sur cet appareil, et son entrée dans ce navigateur est endommagée : il ne peut donc pas être affiché. Il n’est envoyé nulle part. Une sauvegarde enregistrée maintenant contient l’entrée telle qu’elle est. Vous pouvez enregistrer l’entrée dans un fichier, ou la supprimer de cet appareil.',
  'app.doc.local.unreadable.export': 'Enregistrer l’entrée dans un fichier',
  'app.doc.local.unreadable.delete': 'La supprimer de cet appareil',
  'app.doc.local.unreadable.deleteConfirm':
    'Supprimer cette entrée endommagée de cet appareil ? Cela ne peut pas être annulé ici. Un fichier de sauvegarde qui la contient la contient toujours.',
  'app.doc.local.unreadable.backupNote':
    'Un enregistrement gardé uniquement sur cet appareil n’a pas pu être lu. Cette sauvegarde contient son entrée telle qu’elle est : rien n’est donc perdu avec le fichier. Tout le reste y figure comme d’habitude.',
  // ---- a production chain, and proving a number from a device-only record (docs/document-chain.md) ----
  'app.doc.chain.kind.grow-batch': 'Lot de culture',
  'app.doc.chain.kind.harvest-lot': 'Lot de récolte',
  'app.doc.schema.grow-batch': 'Lot de culture',
  'app.doc.schema.harvest-lot': 'Lot de récolte',
  'app.doc.slot.plants': 'Plantes dans ce lot à la date de l’enregistrement',
  'app.doc.slot.plantsInFlower': 'Parmi elles, plantes au stade de floraison à la date de l’enregistrement',
  'app.doc.slot.areaSquareMetres': 'Surface au sol cultivée pour ce lot, en mètres carrés',
  'app.doc.slot.plantsHarvested': 'Plantes récoltées dans ce lot',
  'app.doc.slot.wetWeightGrams': 'Poids frais à la récolte, plantes entières telles que coupées, en grammes',
  'app.doc.slot.dryWeightGrams': 'Poids sec du lot tel que stocké, en grammes',
  'app.doc.chain.start.title': 'Enregistrer une chaîne de production ?',
  'app.doc.chain.start.text':
    'Scellez chaque étape comme un enregistrement à part, chacun concernant le précédent : la plante ou la souche d’origine, un lot de culture, un lot de récolte, le rapport de laboratoire. Chacun reçoit sa date.',
  'app.doc.chain.start.plain': 'Un autre document',
  'app.doc.chain.f.titleHelp':
    'Facultatif. Laissé vide, il reprend le type et l’identifiant. N’y mettez ni comptes ni poids.',
  'app.doc.chain.f.reference.grow-batch': 'Identifiant du lot',
  'app.doc.chain.f.reference.harvest-lot': 'Identifiant du lot',
  'app.doc.chain.f.referenceHelp': 'Tel que vous l’écrivez dans vos propres registres.',
  'app.doc.chain.f.site': 'Nom du site (facultatif)',
  'app.doc.chain.f.siteHelp': 'Votre propre nom pour une salle, un champ ou une installation. Il va dans les notes.',
  'app.doc.chain.f.variety': 'Variété (facultatif)',
  'app.doc.chain.f.varietyHelp': 'Elle va dans les notes.',
  'app.doc.chain.f.numbers': 'Ses chiffres',
  'app.doc.chain.f.numbersHelp':
    'Les comptes et les poids vont ici et nulle part ailleurs : ne les répétez ni dans le titre ni dans les notes. Ils sont scellés tels que vous les saisissez, non tels que quelqu’un les a mesurés, pour que vous puissiez plus tard en prouver un, comme « au plus 100 plantes », sans montrer les autres.',
  'app.doc.chain.note.site': 'Site',
  'app.doc.chain.note.variety': 'Variété',
  'app.doc.chain.titleFor.grow-batch': 'Lot de culture {id}',
  'app.doc.chain.titleFor.harvest-lot': 'Lot de récolte {id}',
  'app.doc.chain.need.reference': 'Indiquez l’identifiant du lot.',
  'app.doc.chain.need.aNumber': 'Saisissez au moins un chiffre.',
  'app.doc.chain.sheet.title': 'Pas de fichier ?',
  'app.doc.chain.sheet.text':
    'Un enregistrement a besoin d’un fichier. Votre propre fiche de lot est le meilleur choix : elle date un document de travail que vous tenez déjà. Si vous n’en avez pas, ceci crée une fiche en texte brut à partir de l’identifiant, de la date, du site, de la variété, du détenteur et de « Concerne » ci-dessus, sans comptes ni poids, et l’enregistre sur cet appareil. Remplissez d’abord ces champs.',
  'app.doc.chain.sheet.make': 'Créer une fiche avec ma saisie',
  'app.doc.chain.sheet.made':
    'Créée et enregistrée sous {name}. Gardez ce fichier : il est nécessaire pour vérifier l’enregistrement et doit rester identique octet pour octet. Si vous modifiez votre saisie ci-dessus, la fiche ne change pas avec elle.',
  'app.doc.chain.aboutHelp':
    'Vos enregistrements qu’il concerne : un certificat d’analyse avec la plante testée, un lot de récolte avec son lot de culture. C’est votre déclaration. Rien ne la compare à l’enregistrement choisi.',
  'app.doc.chain.aboutNote':
    '« Concerne » est la déclaration du détenteur lui-même, scellée avec cet enregistrement. Ni VeilCore ni Midnight ne la comparent à l’enregistrement qu’elle nomme. Une chaîne d’enregistrements ne vaut que par la date et le code de preuve de chacun.',
  'app.doc.chain.carried':
    'Les enregistrements liés ici sont venus dans ce lien, de la personne qui l’a envoyé. L’enregistrement scellé ne nomme chacun que par son identifiant : rien ici ne montre donc qu’un enregistrement lié est bien celui qui est nommé.',
  'app.doc.chain.idOnly':
    'Quand ce lien ne porte que l’identifiant d’un enregistrement, sa page montre ce que le registre de VeilCore rapporte pour cet identifiant, sans rien cocher. Pour une date vérifiée, demandez au détenteur le lien de vérification de cet enregistrement.',
  'app.doc.chain.namedAs':
    'Vous avez ouvert ceci depuis un autre enregistrement, qui le nomme enregistrement {id}. Rien dans le lien ne rattache cet identifiant au code de preuve de cet enregistrement.',
  'app.doc.chain.askRegistry': 'Voir ce que le registre de VeilCore rapporte pour l’enregistrement {id}',
  'app.doc.chain.askRegistrySends':
    'Cette page envoie l’identifiant de l’enregistrement au registre de VeilCore et, dans son adresse, ce code de preuve à l’hébergeur du site. Rien d’autre de ce lien.',
  'app.doc.chain.next.title': 'L’étape suivante de sa chaîne',
  'app.doc.chain.next.text':
    'Scellez l’étape suivante comme un enregistrement à part, qui concerne celui-ci. Elle reçoit sa propre date.',
  'app.doc.chain.next.grow-batch': 'Enregistrer un lot de culture à partir de celui-ci',
  'app.doc.chain.next.harvest-lot': 'Enregistrer son lot de récolte',
  'app.doc.chain.next.report': 'Sceller son rapport de laboratoire',
  'app.doc.chain.title': 'Sa chaîne, sur cet appareil',
  'app.doc.chain.text':
    'Établie ici à partir des enregistrements que ce navigateur détient, y compris ceux gardés uniquement sur cet appareil. Rien n’est demandé à VeilCore pour cela, et un enregistrement détenu ailleurs n’y figure pas.',
  'app.doc.chain.up': 'Ce que ceci concerne',
  'app.doc.chain.down': 'Enregistrements qui concernent celui-ci',
  'app.doc.chain.none': 'Aucun sur cet appareil.',
  'app.doc.chain.notHeld': '{name} (pas sur cet appareil)',
  'app.doc.chain.share.title': 'L’envoyer avec sa chaîne',
  'app.doc.chain.share.text':
    'Ce lien porte aussi les enregistrements que celui-ci concerne, et ceux que ceux-là concernent, pour que la personne qui vérifie puisse ouvrir chacun et voir sa date.',
  'app.doc.chain.share.warn':
    'Quiconque a ce lien voit aussi tout ce que contient chacun de ces enregistrements de document, comme le lien ci-dessus montre celui-ci : {list}. D’un enregistrement qui n’est pas un document, il ne porte que l’identifiant et le code de preuve.',
  'app.doc.chain.share.copy': 'Copier le lien avec sa chaîne',
  'app.doc.chain.share.copied': 'Copié.',
  'app.doc.local.p6':
    'S’il a des chiffres, vous pourrez plus tard choisir de prouver un fait à partir de ceux-ci. Cela publie ce fait sur Midnight, par le service de frais de VeilCore, et seulement si vous l’activez pour cet enregistrement.',
  'app.doc.local.prove.off':
    'Prouver un fait n’est pas activé pour un enregistrement gardé uniquement sur cet appareil.',
  'app.doc.local.prove.title': 'Prouver un fait : à vous de choisir',
  'app.doc.local.prove.text':
    'Désactivé tant que vous ne l’activez pas ici. Prouver publie pour toujours un fait tiré de cet enregistrement sur Midnight, par le service de frais de VeilCore. Rien n’est envoyé au registre de VeilCore. Avant toute preuve, vous voyez exactement ce qui serait publié.',
  'app.doc.local.prove.choice': 'Afficher « Prouver un fait » pour cet enregistrement',
  'app.doc.local.prove.publish.title': 'Ce qui sera publié si vous continuez',
  'app.doc.local.prove.publish.range':
    'Sur Midnight, public et permanent : le formulaire « {schema} », le champ « {label} », le seuil {bound} et le sens ({direction}), avec un code qui représente cet enregistrement. Le chiffre lui-même n’est pas publié. Chaque seuil prouvé le resserre.',
  'app.doc.local.prove.publish.exact':
    'Sur Midnight, public et permanent : le formulaire « {schema} », le champ « {label} » et le chiffre lui-même, {value}, avec un code qui représente cet enregistrement.',
  'app.doc.local.prove.publish.noBound': 'Saisissez un seuil pour voir exactement ce qui serait publié.',
  'app.doc.local.prove.publish.route':
    'Cela part de ce navigateur vers Midnight par le service de frais de VeilCore, qui voit ce qui est publié et votre adresse réseau. Rien n’est envoyé au registre de VeilCore. Le chiffre est celui que vous avez saisi, non celui qu’un laboratoire a mesuré.',
  'app.doc.local.prove.direction.atMost': 'au plus',
  'app.doc.local.prove.direction.atLeast': 'au moins',
  'app.doc.local.prove.confirmExact': 'Oui, publier le chiffre lui-même : {value}, sur Midnight, pour toujours.',
  'app.doc.local.textProved':
    'Rien de ce qui a été saisi dans cet enregistrement n’a été envoyé au registre de VeilCore, verrouillé ou non. Ce que vous avez choisi de prouver sur ses chiffres est public sur Midnight. Les seules copies de l’enregistrement sont dans ce navigateur et dans le fichier de sauvegarde que vous avez vérifié. Si vous perdez les deux, l’enregistrement est perdu : VeilCore ne peut pas vous le rendre. Une sauvegarde enregistrée avant le scellement ne le contient pas, et une copie avec clé d’accès ne le contient en aucun cas.',
  'app.doc.local.proved':
    'Vous avez choisi de prouver des faits sur les chiffres de cet enregistrement. Ils sont partis vers Midnight par le service de frais de VeilCore et sont publics pour toujours ; ils figurent ci-dessous. Rien de ce qui a été saisi dans cet enregistrement n’a été envoyé au registre de VeilCore.',
  'app.claim.tie':
    'Ce que vous prouvez est public sur Midnight d’une manière que VeilCore, et toute personne ayant le lien de vérification de cet enregistrement, peut rattacher à cet enregistrement. VeilCore peut aussi le rattacher à la clé de détenteur qui a daté l’enregistrement.',
  'app.doc.local.aboutStaysHere':
    'Cet enregistrement nomme un enregistrement gardé uniquement sur cet appareil ; il doit donc lui aussi être gardé uniquement sur cet appareil. Sinon, le nom et l’identifiant de cet autre enregistrement partiraient vers VeilCore dans la copie verrouillée de celui-ci. Rien n’a été enregistré ni envoyé.',
  'app.doc.chain.aboutLocalOnly':
    'Un enregistrement gardé uniquement sur cet appareil ne peut être choisi que si cet enregistrement est lui aussi gardé uniquement sur cet appareil (la case ci-dessous). Ce qu’un enregistrement concerne est scellé dans sa copie verrouillée : un enregistrement ordinaire enverrait donc à VeilCore le nom et l’identifiant de cet autre enregistrement.',
  'app.doc.check.tooLarge':
    'Ce lien porte plus que ce qu’un lien de vérification peut porter. Demandez à l’expéditeur le lien propre à chaque enregistrement.',
  'app.doc.chain.share.warnLocal':
    'Rien de ce qui a été saisi dans un enregistrement gardé uniquement sur cet appareil n’a jamais été envoyé au registre de VeilCore. En copiant ce lien, vous remettez ce qui a été saisi dans chacun de ceux qu’il porte (marqués ci-dessus, et cet enregistrement s’il en est un) à quiconque le reçoit.',
  'app.doc.chain.aboutHolderNote':
    'Ouvrir l’un de ces liens interroge le registre de VeilCore sur l’identifiant de cet enregistrement, depuis votre adresse réseau. Pour un enregistrement gardé uniquement sur cet appareil, c’est une chose de plus que le registre apprend : que ce navigateur l’a consulté.',
  'app.doc.copy.title': 'Votre copie d’un résultat de laboratoire',
  'app.doc.copy.text':
    'Une copie d’un résultat que {lab} conserve. La date est celle du laboratoire, pas la vôtre. VeilCore conserve cette copie, mais ne peut pas la dater pour vous.',
  'app.doc.copy.aLab': 'un laboratoire',
  'app.doc.copy.homeLine': 'Copie d’un résultat que {lab} conserve : la date est celle du laboratoire',
  'app.doc.copy.noExport':
    'Ceci est une copie d’un résultat qu’un laboratoire conserve : elle ne peut pas être exportée comme votre enregistrement.',
  'app.doc.copy.delete':
    'Ceci est votre copie d’un résultat que le laboratoire conserve : la supprimer ne retire que votre copie. L’enregistrement du laboratoire et sa date restent.',
  'app.doc.copy.made': '« {name} » est conservé comme copie du résultat de {lab} : il ne peut pas être daté pour vous.',
} satisfies Partial<AppTranslation>;
