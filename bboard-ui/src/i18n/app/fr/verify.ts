// French (vous). DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md). Terms as in ../../fr.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const verify = {
  'app.verify.report.notSaved': 'Le détenteur n’a pas enregistré de rapport de laboratoire sur cet enregistrement.',
  'app.verify.report.asOf': ' (au moment où ce lien a été créé)',
  'app.verify.report.staleNote':
    ' Ce lien a été créé quand un autre fichier était enregistré ; cette ligne concerne celui enregistré maintenant.',
  'app.verify.report.matches':
    'Le détenteur a enregistré un rapport de laboratoire sur cet enregistrement{asOf}. Son fichier (SHA-256 {sha}) correspond au rapport de laboratoire {lead} : signature vérifiée dans ce navigateur.{rest}{staleNote}',
  'app.verify.report.which': 'Le rapport de laboratoire enregistré sur cet enregistrement{asOf} (SHA-256 {sha})',
  'app.verify.report.replaced':
    '{which} a été remplacé par son laboratoire le {on} par un rapport corrigé. {tail}{staleNote}',
  'app.verify.report.withdrawn': '{which} a été retiré par son laboratoire le {on}. {tail}{staleNote}',
  'app.verify.report.ownSha':
    'Le détenteur a enregistré un fichier de rapport de laboratoire sur cet enregistrement{asOf} (SHA-256 {sha}). Aucune signature de laboratoire sur cet enregistrement n’y correspond : c’est la propre déclaration du détenteur.{staleNote}',
  'app.verify.report.own':
    'Le détenteur a enregistré un fichier de rapport de laboratoire sur cet enregistrement. Aucune signature de laboratoire sur cet enregistrement n’y correspond : c’est la propre déclaration du détenteur.{staleNote}',
  'app.verify.report.unnamedSigned':
    'Le détenteur a enregistré un rapport de laboratoire sur cet enregistrement. Ce lien ne nomme pas le fichier : cette page ne peut donc pas dire s’il s’agit du rapport signé indiqué ci-dessus.',
  'app.verify.report.unnamedWithdrawn':
    'Le détenteur a enregistré un rapport de laboratoire sur cet enregistrement. Ce lien ne nomme pas le fichier, et chaque rapport signé au sujet de cet enregistrement a été retiré par son laboratoire : c’est donc la propre déclaration du détenteur.',
  'app.verify.report.unnamedNone':
    'Le détenteur a enregistré un rapport de laboratoire sur cet enregistrement. Aucun laboratoire n’a signé de rapport au sujet de cet enregistrement : c’est donc la propre déclaration du détenteur.',
  'app.verify.kind.receipts.one': 'un accusé de réception de laboratoire',
  'app.verify.kind.receipts.other': '{count} accusés de réception de laboratoire',
  'app.verify.kind.reports.one': 'un rapport de laboratoire',
  'app.verify.kind.reports.other': '{count} rapports de laboratoire',
  'app.verify.kind.statements.one': 'une déclaration signée',
  'app.verify.kind.statements.other': '{count} déclarations signées',
  'app.verify.kind.and': ' et ',
  'app.verify.withdrawnSignatures.one':
    'Une signature a été retirée par son signataire et n’est donc pas comptée : {what}.',
  'app.verify.withdrawnSignatures.other':
    '{count} signatures ont été retirées par leurs signataires et ne sont donc pas comptées : {what}.',
  'app.verify.anchor.registryDate': '{date}, selon le registre de VeilCore',
  'app.verify.anchor.noDate': 'non indiquée (le registre de VeilCore ne donne pas de date pour cette transaction)',
  'app.verify.anchor.lookingUp': 'Consultation de cette transaction sur {network}…',
  'app.verify.anchor.twoIndexers': ' Deux indexeurs Midnight distincts ont donné la même réponse.',
  'app.verify.anchor.checked':
    'Vérifié sur Midnight : cette racine de lot a été écrite par la transaction {tx} dans le bloc {block} le {at}.{two}{test}',
  'app.verify.anchor.failed':
    'Non confirmé sur Midnight : {reason}. Ne vous fiez pas à la date signalée par le registre.',
  'app.verify.anchor.dateNotChecked': 'La date est {date} ; non vérifiée ici.',
  'app.verify.anchor.oneIndexer': 'Un seul des deux indexeurs Midnight a répondu, et il faut les deux. {date}',
  'app.verify.anchor.noIndexer': 'Impossible de joindre un indexeur Midnight. {date}',
  'app.verify.anchor.headingTest':
    'Horodatage vérifié sur un réseau de test : données d’entraînement, pas une vraie date',
  'app.verify.anchor.headingChecked': 'Horodatage vérifié sur Midnight',
  'app.verify.anchor.headingFailed': 'Horodatage non confirmé sur Midnight',
  'app.verify.anchor.eventTestTitle': 'Horodatage vérifié sur un réseau de test',
  'app.verify.anchor.eventChecked':
    'Lot {batch} : cette page a trouvé la racine du lot dans la transaction {tx}, bloc {block}, sur {where}.{test}',
  'app.verify.anchor.eventFailed': 'Lot {batch} : {reason}. Ne vous fiez pas à la date signalée par le registre.',
  'app.verify.anchor.whyChecking': 'Cette page la consulte sur Midnight.',
  'app.verify.anchor.whyUnreachable': 'Cette page n’a pas pu joindre Midnight pour la vérifier.',
  'app.verify.anchor.whyNotLooked': 'Cette page ne l’a pas consultée sur Midnight.',
  'app.verify.anchor.eventReportedTitle': 'Horodatage signalé par le registre',
  'app.verify.anchor.inTx': ' dans la transaction {tx}',
  'app.verify.anchor.eventReported':
    'Lot {batch} : le registre indique que la racine du lot a été inscrite sur {where}{tx}. La date est {date}. {why} Ne vous fiez pas à la date tant qu’elle n’est pas vérifiée.{test}',
  'app.verify.anchor.summaryAdd': '{summary} Vérifié sur Midnight : l’horodatage de la racine du lot.',
  'app.verify.field.existence': 'Détention antérieure (affichée seulement une fois ancré)',
  'app.verify.field.attestation-status': 'Si un rapport de laboratoire est enregistré',
  'app.verify.field.descent-clean': 'État de la lignée, selon le registre',
  'app.verify.field.sealed-at': 'Quand il a été scellé (horloge de l’appareil du détenteur)',
  'app.verify.field.parent-names': 'Noms des cultivars parents',
  'app.verify.field.breeding-method': 'Méthode de sélection',
  'app.verify.field.genetics': 'La génétique elle-même — jamais divulguée, par conception',
  'app.verify.sum.reports.one': 'un rapport de laboratoire',
  'app.verify.sum.reports.other': '{count} × rapport de laboratoire',
  'app.verify.sum.receipts.one': 'un accusé de réception de laboratoire',
  'app.verify.sum.receipts.other': '{count} × accusé de réception de laboratoire',
  'app.verify.sum.statements.one': 'une déclaration signée',
  'app.verify.sum.statements.other': '{count} × déclaration signée',
  'app.verify.sum.what': ' ({list})',
  'app.verify.sum.comma': ', ',
  'app.verify.sum.bound': 'l’empreinte du lien correspond à celle que signale le registre',
  'app.verify.sum.inBatch': 'l’enregistrement est dans son lot',
  'app.verify.sum.signatures.one': 'une signature le concernant{what}',
  'app.verify.sum.signatures.other': '{count} signatures le concernant{what}',
  'app.verify.sum.nothing':
    'Rien sur cette page n’a pu être vérifié dans ce navigateur : tout provient du registre de VeilCore.',
  'app.verify.sum.list': '{rest} et {last}',
  'app.verify.sum.checked':
    'Vérifié dans ce navigateur : {list}. Tout le reste provient du registre de VeilCore.{unbound}',
  'app.verify.sum.unbound':
    ' Ce lien ne nomme aucune empreinte : ces vérifications ont donc utilisé celle du registre, et rien n’est coché.',
  'app.verify.heading.nothingSealed': 'Enregistrement trouvé, rien de scellé',
  'app.verify.heading.unbound': 'Ce que signale le registre : ce lien n’a pas d’empreinte à comparer',
  'app.verify.heading.checking': 'Vérification…',
  'app.verify.heading.reported': 'Horodatage signalé par le registre, non vérifié ici',
  'app.verify.heading.pending': 'Dans un lot, pas encore d’horodatage',
  'app.verify.heading.none': 'Pas encore d’horodatage',
  'app.verify.thisId': 'cet identifiant',
  'app.verify.kindReceipt': 'Accusé de réception d’un laboratoire pour un échantillon',
  'app.verify.kindReport': 'Rapport de laboratoire (SHA-256 du fichier {sha})',
  'app.verify.kindStatement': 'Déclaration signée',
  'app.verify.forWhom': 'Pour l’empreinte que signale le registre : ',
  'app.verify.homeAria': 'Accueil VeilCore',
  'app.verify.intro':
    'Cette page vérifie un enregistrement VeilCore : une empreinte de la description d’un matériel génétique, datée une fois ancrée, publiée sans la génétique. La vérification est gratuite et ne demande aucun compte. <link>Qu’est-ce que VeilCore ?</link>',
  'app.verify.checkingRecord': 'Vérification de l’enregistrement',
  'app.verify.notFound': 'Aucun enregistrement trouvé pour {id}',
  'app.verify.notFoundText':
    'Ce lien de vérification ne correspond à aucun enregistrement du registre. Vérifiez que le lien est complet et non modifié.',
  'app.verify.goHome': 'Aller sur veilcore.org',
  'app.verify.mismatch.title': 'L’empreinte de ce lien ne correspond pas à l’enregistrement : rien n’a été vérifié',
  'app.verify.mismatch.dontRely': 'Ne vous fiez pas à cette page.',
  'app.verify.mismatch.text':
    '{start}mais le registre signale {reported} pour {id}. Sa réponse ne concerne pas l’enregistrement que nomme le lien : cette page n’a donc rien vérifié et n’en affiche rien. Demandez l’enregistrement lui-même à la personne qui vous a donné le lien.',
  'app.verify.mismatch.linked': 'Ce lien a été créé pour l’enregistrement d’empreinte {fp}, ',
  'app.verify.mismatch.invalid':
    'Ce lien contient une empreinte non valide (elle devrait compter 64 caractères hexadécimaux) ; elle a peut-être été tronquée ou modifiée, ',
  'app.verify.mismatch.reportedFp': 'l’empreinte {fp}',
  'app.verify.mismatch.noFp': 'aucune empreinte',
  'app.verify.mismatch.inLink': 'Empreinte dans le lien : {fp}',
  'app.verify.mismatch.chip':
    'La réponse du registre ne correspond pas à ce lien — rien sur cette page n’a été vérifié',
  'app.verify.nameTyped': 'Nom, tel que le détenteur l’a saisi : ',
  'app.verify.recordId': 'Identifiant de l’enregistrement : {id}',
  'app.verify.noCommitment':
    'Cet enregistrement ne porte aucun engagement : rien ne peut donc y être vérifié. Il existe dans le registre, c’est tout.',
  'app.verify.boundFact':
    'Ce lien a été créé pour l’empreinte {fp}, et le registre signale la même empreinte pour cet enregistrement{firstSeen}. Les champs qu’elle couvre ne sont pas partagés : cette page ne peut donc pas la recalculer.',
  'app.verify.firstStored': ', conservé pour la première fois le {date}',
  'app.verify.unboundFact':
    'Le registre signale un enregistrement d’empreinte {fp}{firstSeen}. Les champs qu’elle couvre ne sont pas partagés : cette page ne peut donc pas la recalculer.',
  'app.verify.noFpInLink':
    'Ce lien ne nomme pas l’empreinte de l’enregistrement : cette page ne peut donc pas dire si le registre a répondu avec l’empreinte de cet enregistrement ou celle d’un autre. Rien ci-dessous n’est coché. Un lien créé maintenant depuis l’enregistrement se termine par ?fp=… ; demandez-en un au détenteur.',
  'app.verify.noStampYet':
    'Pas encore d’horodatage, pour autant que cette page puisse le dire : il n’y a ici aucune preuve que l’enregistrement est dans un lot horodaté, il n’y a donc rien à vérifier.',
  'app.verify.batchBound':
    'Vérifié dans ce navigateur : cette empreinte est dans le lot {batch}, et son chemin mène à la racine du lot {root}….',
  'app.verify.batchUnbound':
    '{forWhom}elle est dans le lot {batch}, et son chemin mène à la racine du lot {root}…. Vérifié ici, mais avec l’empreinte du registre lui-même.',
  'app.verify.rootReported':
    'Le registre indique que cette racine a été inscrite sur {network}{tx}. Sa date : {date}.{notLooked}{test}',
  'app.verify.notLooked': ' Cette page ne l’a pas consultée ; faites-le avant de vous fier à la date.',
  'app.verify.batchNoStamp': 'Le lot n’a pas encore d’horodatage sur Midnight.',
  'app.verify.sigLine': '{forWhom}{kind}, signature vérifiée dans ce navigateur. {lead}.',
  'app.verify.sampleDetails': 'Détails de l’échantillon, selon le registre :',
  'app.verify.moreSigs': '{forWhom}Et {n} signatures de plus, chacune vérifiée dans ce navigateur.',
  'app.verify.noneVerified':
    'Le registre signale une attestation signée, mais aucune n’a pu être vérifiée dans ce navigateur.',
  'app.verify.noneSigned':
    'Aucun accusé de réception ni rapport de laboratoire n’a été signé au sujet de cet enregistrement.',
  'app.verify.badSigs.one':
    'Une signature signalée par le registre ne se vérifie pas dans ce navigateur : elle n’est donc pas comptée.',
  'app.verify.badSigs.other':
    '{count} signatures signalées par le registre ne se vérifient pas dans ce navigateur : elles ne sont donc pas comptées.',
  'app.verify.ownReceipt': '{lead}, lié à votre livraison {tx}.',
  'app.verify.ownReceiptTail':
    ' Vous le voyez parce que la plante est dans ce navigateur ; la personne à qui vous envoyez le lien ne voit que la ligne de signature ci-dessus.',
  'app.verify.sharedTitle': 'Partagé par le détenteur · signalé par le registre',
  'app.verify.notGranted': 'Ce lien demandait {list}, que le détenteur n’a pas choisi de partager.',
  'app.verify.unavailable':
    'Ce lien demandait des informations sur le détenteur plutôt que sur cet enregistrement ({list}). Le registre n’y répond jamais.',
  'app.verify.footer':
    'Empreinte {fp} · seules les informations ci-dessus ont été envoyées · aucune génétique divulguée',
  'app.verify.mark.checked': 'Vérifié dans ce navigateur',
  'app.verify.mark.reported': 'Non vérifié ici',
  'app.verify.mark.failed': 'Échec ou retrait',
  'app.verify.mark.key': 'Ce que signifient les marques',
  'app.verify.own.preview':
    'Détention antérieure : affichée seulement quand le registre signale le lot de cet enregistrement comme ancré, et alors comme ce que signale le registre.',
  'app.verify.own.anchored':
    'Détention antérieure : le registre signale le lot de cet enregistrement comme ancré sur {network}.{found}{test}',
  'app.verify.own.found':
    ' Cette page a trouvé elle-même cet horodatage sur Midnight (ci-dessus). Il date l’enregistrement, pas qui le détenait.',
  'app.verify.own.notConfirmed': ' Cette page ne l’a pas confirmé sur la chaîne.',
  'app.verify.own.notAnchored':
    'Détention antérieure : pas encore ancré, sa date repose donc sur les données de ce registre.',
  'app.verify.dna.saved': 'Le détenteur a enregistré un rapport de laboratoire sur cet enregistrement.',
  'app.verify.lineage.intact':
    'Le registre signale la lignée comme intacte — une chaîne ininterrompue jusqu’à l’enregistrement scellé. Cette page ne l’a pas vérifié.',
  'app.verify.lineage.notChecked':
    'Lignée : non vérifiée sur cette page. Le registre ne parcourt pas la descendance pour un lien partagé.',
  'app.verify.sealedAt':
    'Scellé, selon l’horloge de l’appareil du détenteur : {date}. C’est la propre déclaration du détenteur.{first}',
  'app.verify.firstStoredBy': ' Conservé pour la première fois par ce registre : {date}.',
  'app.verify.parents': 'Parents, selon le détenteur : {list}',
  'app.verify.noParents': 'Aucun parent enregistré.',
  'app.verify.method': 'Méthode de sélection, selon le détenteur : {method}',
  'app.verify.noMethod': 'Aucune méthode de sélection enregistrée.',
  'app.verify.sharedNothing': 'Le détenteur n’a rien partagé au-delà des éléments de base ci-dessus.',
  'app.verify.notShared': 'Non partagé par le détenteur : {list}.',
  'app.verify.alwaysShown':
    'Toujours affichés : le nom du cultivar, l’identifiant de l’enregistrement, son empreinte ({fp}), la date à laquelle le registre l’a conservé pour la première fois, et ce que cette page a pu vérifier sur son lot et sur les attestations signées (un accusé de réception de laboratoire, un rapport de laboratoire).',
  'app.verify.ex.title': 'Exemple : un enregistrement inventé.',
  'app.verify.ex.intro':
    'Ceci montre à quoi ressemble la page de vérification d’un enregistrement, avec une note sous chaque ligne. Rien n’y a été consulté ni vérifié.',
  'app.verify.ex.status': 'Exemple · dans un lot scellé · ancrage signalé',
  'app.verify.ex.name': 'Harbour Mist (exemple)',
  'app.verify.ex.fact1':
    'Ce lien a été créé pour l’empreinte 3f9a0c41e2b7…, et le registre signale la même empreinte pour cet enregistrement.',
  'app.verify.ex.note1':
    'L’empreinte est dans le lien lui-même : on ne peut donc pas tromper la page pour lui faire afficher les vérifications d’un autre enregistrement.',
  'app.verify.ex.fact2':
    'Vérifié dans ce navigateur : cette empreinte est dans le lot 41, et son chemin mène à la racine du lot.',
  'app.verify.ex.note2':
    'Sur un vrai enregistrement, cette ligne porte une coche : votre propre navigateur vérifie que l’enregistrement est dans le lot.',
  'app.verify.ex.fact3':
    'Vérifié sur Midnight : cette racine de lot a été écrite par la transaction 9c41e0…b27d dans le bloc 2973563 le 2026-10-11 14:03 UTC.{test}',
  'app.verify.ex.note3':
    'Cette transaction, sur {network}, est ce qui date l’enregistrement. Sur un vrai enregistrement, votre navigateur la demande à un indexeur Midnight et vérifie qu’elle a écrit cette racine de lot dans le contrat de VeilCore. Si aucun indexeur ne répond, la ligne le dit et la date n’est que ce que signale le registre : consultez la transaction sur un explorateur Midnight, comme midnightexplorer.com, avant de vous y fier.',
  'app.verify.ex.fact4':
    'Rapport de laboratoire (SHA-256 du fichier 7c1e04d2…9b3a51), signature vérifiée dans ce navigateur. Signé par une clé nommée « Example Lab » (nom non vérifié).',
  'app.verify.ex.note4':
    'Un laboratoire peut signer avec sa propre clé son accusé de réception d’un échantillon et son rapport de laboratoire. Chaque ligne dit de quoi il s’agit. La page vérifie la signature ; c’est à vous de juger si la clé appartient à un laboratoire de confiance.',
  'app.verify.ex.fact5':
    'Le détenteur a enregistré un rapport de laboratoire sur cet enregistrement. Son fichier (SHA-256 7c1e04d2…9b3a51) correspond au rapport de laboratoire signé par une clé nommée « Example Lab » (nom non vérifié) : signature vérifiée dans ce navigateur.',
  'app.verify.ex.note5':
    'Le détenteur choisit quelles informations apparaissent ici. Tout ce qui n’est pas partagé est indiqué comme non partagé.',
  'app.verify.ex.marks':
    '✓ cette page a vérifié la ligne elle-même, dans votre navigateur. ○ le registre de VeilCore ou le détenteur le signale ; cette page ne l’a pas vérifié. ⊗ une vérification a échoué, ou un laboratoire a retiré ce qu’il avait signé.',
  'app.verify.ex.checkReal': 'Vérifier un vrai enregistrement',
  'app.verify.ex.what': 'Qu’est-ce que VeilCore ?',
} satisfies Partial<AppTranslation>;
