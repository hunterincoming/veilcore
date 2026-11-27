// French (vous): what a failure says (../en/errors.ts). Terms as in docs/i18n-glossary.md:
// smart contract, then contrat; preuve for a claim about a number (contrat des preuves);
// mention for a lender's claim; registre for the registry; code de preuve.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const errors = {
  'app.err.unknown': 'Un problème est survenu. Réessayez.',
  'app.err.technical': 'Un problème est survenu. Détails techniques (en anglais) : {detail}',
  'app.err.technicalReason': 'un problème technique (détails en anglais : {detail})',

  'app.err.registry.unexpected': 'Réponse inattendue du registre.',
  'app.err.registry.notAsExpected': 'Le registre n’a pas répondu comme prévu.',
  'app.err.registry.answered': 'le registre a répondu {status}',
  'app.err.registry.unexpectedLower': 'réponse inattendue du registre',
  'app.err.registry.refusedCorrection': 'Le registre a refusé cette correction, donc rien n’a été modifié. {refusals}',

  'app.err.chain.unreachable':
    'Impossible de joindre le réseau Midnight ou le service de frais. Rien n’a été envoyé. Réessayez dans quelques minutes.',
  'app.err.chain.contractNotFound': 'Le smart contract de VeilCore est introuvable sur le réseau. Rien n’a été envoyé.',
  'app.err.chain.demoNotFound': 'Le smart contract de démonstration est introuvable sur le réseau.',
  'app.err.chain.claimsNotFound': 'Le contrat des preuves est introuvable sur le réseau.',
  'app.err.chain.otherContract':
    'Le smart contract du réseau n’est pas celui pour lequel ce site a été conçu. Rien n’a été envoyé.',
  'app.err.chain.otherClaimsContract':
    'Le contrat des preuves du réseau n’est pas celui pour lequel ce site a été conçu. Rien n’a été envoyé.',
  'app.err.chain.filesMismatch':
    'Les fichiers de preuve de ce site ne sont pas ceux qu’utilise le smart contract du réseau. Rien n’a été envoyé.',
  'app.err.chain.claimsFilesMismatch':
    'Les fichiers de preuve de ce site ne sont pas ceux qu’utilise le contrat des preuves. Rien n’a été envoyé.',
  'app.err.chain.circuitFilesMismatch':
    'Les fichiers de preuve de ce site pour {circuit} ne sont pas ceux qu’utilise le smart contract.',
  'app.err.chain.filesMissing': 'Les fichiers de preuve pour {circuit} ne sont pas encore sur ce site.',
  'app.err.chain.paramsMissing': 'Les paramètres publics (k={k}) ne sont pas encore sur ce site.',
  'app.err.chain.callFailed': 'Le réseau a inclus l’appel, mais il n’a pas abouti ({status}).',
  'app.err.chain.hashUnreadable': 'Le réseau l’a incluse, mais son hachage de transaction n’a pas pu être lu',
  'app.err.chain.claimFailed': 'Le réseau a inclus la preuve, mais elle n’a pas abouti ({status}).',
  'app.err.chain.noSlot': 'Aucune place de licence libre n’a été trouvée. Rien n’a été envoyé.',
  'app.err.chain.notSendersRecord':
    'Ce lien désigne un enregistrement qui n’est pas celui de l’expéditeur. Rien n’a été envoyé : demandez-lui un nouveau lien.',
  'app.err.chain.pow': 'Impossible de terminer la preuve de travail.',
  'app.err.chain.notToSponsor': 'Rien n’a été envoyé au service de frais.',
  'app.err.chain.proverStart': 'Le générateur de preuves n’a pas pu démarrer dans ce navigateur : {reason}',
  'app.err.chain.proverSlow':
    'Le générateur de preuves n’a pas démarré à temps. Réessayez, ou sur un ordinateur portable.',
  'app.err.chain.noRecordKeys': 'Ce navigateur ne détient pas les clés de l’enregistrement.',
  'app.err.chain.pairingNotSaved':
    'Ce navigateur n’a pas pu garder le nombre aléatoire de l’appariement, donc rien n’a été envoyé.',
  'app.err.chain.noIdentity': 'Cet enregistrement n’a pas encore d’identité sur la chaîne.',
  'app.err.chain.notTx': 'Ce n’est pas un identifiant de transaction.',
  'app.err.chain.badRandom': 'Le générateur aléatoire a renvoyé une valeur inutilisable.',
  'app.err.chain.noIdentityToCheck': 'Cet enregistrement n’a pas d’identité sur la chaîne à vérifier.',
  'app.err.chain.notOurChallenge': 'Cette page n’a pas créé ce défi. Créez-en un nouveau et envoyez-le.',
  'app.err.chain.challengeUsed': 'Ce défi a déjà reçu une réponse. Créez-en un nouveau.',
  'app.err.chain.notOurRequest': 'Cette page n’a pas créé ce défi. Faites une nouvelle demande.',
  'app.err.chain.requestUsed': 'Ce défi a déjà reçu une réponse. Faites une nouvelle demande.',
  'app.err.chain.noRecordKey': 'Aucune clé d’enregistrement à laquelle comparer.',
  'app.err.chain.callUnreadable':
    'impossible de lire cette transaction sur Midnight pour le moment ; réessayez dans quelques minutes',
  'app.err.chain.noSuchTx': 'Midnight n’a pas cette transaction.',
  'app.err.chain.indexerUnreachable':
    'impossible de joindre l’indexeur du réseau Midnight ; réessayez dans quelques minutes',
  'app.err.chain.stateUnreadable':
    'impossible de lire l’état actuel du smart contract ; réessayez dans quelques minutes',

  'app.err.claims.noNumbers': 'Ce document n’a pas de nombres scellés.',
  'app.err.claims.noSchema': 'Aucun schéma publié {schema}.',
  'app.err.claims.otherSchema': 'Le schéma de ce site n’est pas celui sous lequel les nombres ont été scellés.',
  'app.err.claims.notOnCertificate': 'Ce nombre ne figurait pas sur le certificat quand il a été scellé.',
  'app.err.claims.boundNotMet': 'Le nombre scellé ne respecte pas cette limite, donc il ne peut pas être prouvé.',
  'app.err.claims.sigOtherRecord': 'Cette signature concerne un autre enregistrement.',
  'app.err.claims.sigNoCheck':
    'Cette signature ne se vérifie pas : elle n’a pas été faite pour cet enregistrement avec cette clé.',
  'app.err.claims.tooMany': 'Trop de preuves pour un seul lien.',
  'app.err.claims.onePerNumber': 'Une preuve par nombre dans un lien.',
  'app.err.claims.sameRecord':
    'Les preuves d’un même lien doivent porter sur le même enregistrement, le même formulaire et le même contrat.',
  'app.err.claims.provingOff':
    'Les preuves sont désactivées pour cet enregistrement jusqu’à ce que vous les activiez sur sa page. Rien n’a été envoyé.',
  'app.err.claims.confirmPublish':
    'Publier le nombre lui-même demande d’abord votre confirmation. Rien n’a été envoyé.',
  'app.err.claims.notOffered': 'Cette preuve n’est pas proposée pour ce type de résultat. Rien n’a été envoyé.',
  'app.err.claims.slotNotNumber': 'La case {slot} n’est pas un nombre dans {schema}.',
  'app.err.claims.noLabSignature': 'Le lien ne désigne aucune signature de laboratoire.',
  'app.err.claims.txNotLabSignature': 'Cette transaction n’est pas une signature de laboratoire.',
  'app.err.claims.labSigOtherRecord': 'Cette signature de laboratoire porte sur un autre enregistrement.',
  'app.err.claims.otherKey': 'Cet enregistrement a été signé avec une autre clé.',
  'app.err.claims.unknownSchema': 'Le lien désigne un schéma que ce site ne publie pas.',
  'app.err.claims.otherKind': 'Cette transaction a fait une autre sorte de preuve.',
  'app.err.claims.otherRecord': 'Cette preuve porte sur un autre enregistrement.',
  'app.err.claims.otherSchemaClaim': 'Cette preuve a été faite sous un autre schéma.',
  'app.err.claims.otherNumber': 'Cette preuve porte sur un autre nombre.',
  'app.err.claims.otherBound': 'Cette preuve a prouvé une autre limite.',
  'app.err.claims.notANumber': 'Cette preuve a publié quelque chose qui n’est pas un nombre.',
  'app.err.claims.otherValue': 'Cette preuve a publié une autre valeur.',
  'app.err.claims.noContract': 'Ce site ne peut pas lire les preuves : aucun contrat des preuves n’est configuré.',
  'app.err.claims.notOurContract':
    'Le lien désigne un contrat des preuves qui n’est pas celui de VeilCore sur ce réseau.',

  'app.err.lab.notRequest': 'Ce fichier n’est pas une demande de signature de laboratoire.',
  'app.err.lab.noForm': 'La demande utilise des nombres pour lesquels ce site ne publie pas de formulaire.',
  'app.err.lab.notInForm':
    'Les nombres de la demande ne figurent pas dans le formulaire qu’elle désigne. Ne la signez pas ; redemandez-la.',
  'app.err.lab.cantCheck': 'La demande ne peut pas être vérifiée : {reason}',
  'app.err.lab.notDocument': 'ce n’est pas un enregistrement de document.',
  'app.err.lab.rootMismatch': 'ses nombres ne donnent pas la racine qu’il a scellée.',
  'app.err.lab.notRecord':
    'Les nombres de la demande ne donnent pas l’enregistrement qu’elle désigne. Ne la signez pas ; redemandez-la.',
  'app.err.lab.notKey': 'Ce n’est pas une clé de signature de laboratoire.',
  'app.err.lab.notSignature': 'Ce fichier n’est pas une signature de laboratoire.',
  'app.err.lab.sigKeyNotLab': 'La clé de cette signature n’est pas une clé de signature de laboratoire.',
  'app.err.lab.numbersUnreadable': 'Les nombres de ce rapport ne peuvent pas être lus.',
  'app.err.lab.numbersTooLarge': 'Les nombres sont trop volumineux pour être envoyés.',
  'app.err.lab.noLock': 'Le code de laboratoire ne contient pas de verrou pour les rapports de laboratoire.',
  'app.err.lab.notLockedHere':
    'Ce rapport de laboratoire n’a pas été verrouillé pour cette plante, ou le fichier est endommagé.',
  'app.err.lab.signatureDamaged': 'La signature de laboratoire de ce fichier est endommagée. Rien n’a été modifié.',
  'app.err.lab.keyExists':
    'Une clé de laboratoire existe déjà dans ce navigateur. Publiez-la à nouveau ou téléchargez sa sauvegarde ; aucune nouvelle clé n’a été créée.',

  'app.err.lic.licensorSigns': 'Seul le concédant signe ces attestations.',
  'app.err.lic.otherStatement': 'Cette confirmation concerne un autre relevé.',
  'app.err.lic.alreadyIssued': 'Déjà émise sur la chaîne : annulez-la plutôt.',
  'app.err.lic.notOnChain': 'Cette licence n’est pas sur la chaîne.',
  'app.err.lic.noDealMessages': 'Cette licence n’a pas encore de messages d’accord.',
  'app.err.lic.badKey': 'La clé de l’autre partie n’est pas utilisable.',
  'app.err.lic.handOnNotReady': 'La transmission ne peut pas encore être terminée.',
  'app.err.lic.evidenceTooLarge': 'Ce fichier dépasse 50 Mo. Joignez un rapport pour cette seule période.',
  'app.err.lic.fileEmpty': 'Ce fichier est vide.',
  'app.err.lic.notIssuedByTx': 'Cette transaction n’a pas émis cette licence.',
  'app.err.lic.notLiveByTx': 'Cette transaction n’a pas mis cette licence en vigueur.',
  'app.err.lend.needWords': 'Une mention a besoin d’un texte sur le prêt.',
  'app.err.lend.needName': 'Indiquez le nom que verront les détenteurs.',
  'app.err.lend.noIdentity': 'Aucune identité de prêteur dans ce navigateur.',
  'app.err.lend.notRecordKey': 'Ce n’est pas la clé sur la chaîne d’un enregistrement.',
  'app.err.lend.notOwnIdentity': 'Une mention ne peut pas porter sur votre propre identité.',
  'app.err.lend.wordsTooLong': 'Gardez le texte sur le prêt sous 200 caractères.',

  'app.err.rec.importTooLarge': 'Ce fichier dépasse 20 Mo. Rien n’a été importé.',
  'app.err.rec.notExport': 'Ce fichier n’est pas un export d’enregistrements VeilCore. Rien n’a été importé.',
  'app.err.rec.notExportShort': 'Ce fichier n’est pas un export d’enregistrements VeilCore.',
  'app.err.rec.unreadableEntries':
    'Ce fichier contient {count} entrées que cette version ne sait pas lire. Rien n’a été importé.',
  'app.err.rec.deviceOnlyImport':
    '{id} : seul un document peut être gardé uniquement sur cet appareil. Rien n’a été importé.',
  'app.err.rec.codeMismatch': '{id} : son code de preuve ne correspond pas à ses champs. Rien n’a été importé.',
  'app.err.rec.noNonce':
    '{id} : il a un code de preuve mais pas de nonce, donc il ne peut pas être vérifié. Rien n’a été importé.',
  'app.err.rec.exportMismatch':
    '{id} : son code de preuve ne correspond pas à ses champs enregistrés, donc un export n’a pas pu être relié à ce que détient le registre. Rien n’a été exporté.',
  'app.err.rec.fileTooLarge': '{file} dépasse 200 Mo, il n’a donc pas été lu. Rien n’a été envoyé ni gardé.',
  'app.err.rec.strainCantSeal': 'Cet enregistrement de variété ne peut pas être scellé : {problems}.',
  'app.err.rec.animalCantSeal': 'Cet enregistrement d’animal ne peut pas être scellé : {problems}.',
  'app.err.rec.docCantSeal': 'Cet enregistrement de document ne peut pas être scellé : {problems}.',
  'app.err.rec.docCantShare': 'Cet enregistrement de document ne peut pas être partagé : {problems}.',
  'app.err.rec.chainTooLarge':
    'Cette chaîne est trop grande pour un seul lien. Envoyez plutôt le lien de chaque enregistrement.',
  'app.err.rec.aboutItself': 'Un enregistrement ne peut pas porter sur lui-même.',
  'app.err.keys.notKeysFile': 'Ce n’est pas un fichier de clés d’enregistrement VeilCore.',
  'app.err.keys.damaged': 'Ce fichier est endommagé : les clés qu’il contient sont illisibles.',
  'app.err.keys.differentKeys':
    'Ce navigateur détient déjà d’autres clés pour cet enregistrement. Rien n’a été modifié.',
  'app.err.keys.noVault': 'Ce navigateur n’a pas de clé de coffre.',
  'app.err.keys.holderKey': 'Une clé de détenteur compte 64 caractères hexadécimaux.',
  'app.err.keys.proofCode': 'Un code de preuve compte 64 caractères hexadécimaux.',
  'app.err.sheet.noSheet': 'Ce tableur ne contient aucune feuille.',
  'app.err.sheet.wrongKind':
    'Ce type de tableur n’est pas lu ici. Enregistrez-le en Excel (.xlsx) ou en CSV et choisissez ce fichier.',
  'app.err.sheet.notXlsx':
    'Ce fichier n’a pas pu être ouvert comme fichier Excel (.xlsx). Enregistrez-le en .xlsx ou en CSV et réessayez.',
  'app.err.sheet.tooLarge':
    'Ce tableur est trop grand pour être lu ici. Enregistrez-le avec moins de lignes et réessayez.',
  'app.err.sheet.fileTooLarge': 'Ce fichier dépasse {mb} Mo. Importez au plus {rows} lignes à la fois.',
} satisfies Partial<AppTranslation>;
