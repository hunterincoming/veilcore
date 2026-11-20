// Passkey check: can this browser and device lock and open data with a passkey (WebAuthn PRF)?
//
// A small standalone page (passkey-check.html beside it) any site can copy: it tests
//   - what the browser reports it can do (PublicKeyCredential.getClientCapabilities, platform
//     authenticator, the "prf" extension);
//   - a real passkey, asked twice: does it give PRF output at all, and the same output both
//     times (the thing a passkey-locked copy depends on);
//   - whether the passkey is synced (the authenticator data's BE and BS flags);
// and shows one result line to share, with no secret in it: no key, no credential ID, no PRF
// output. The "check code" in it is 4 bytes of SHA-256 over the PRF output for a TEST-ONLY input
// (below), so the same passkey on another device must show the same code, and it says nothing
// about any key that locks anything (PRF outputs for different inputs are independent).
//
// Nothing is sent anywhere and nothing is stored but the passkey a person chooses to make.
// Strings in English, German, Spanish, French and Japanese (docs/i18n-glossary.md); the
// language is ?lang=, else the one chosen on the site, else the browser's.
// docs/passkey-support.md has the support matrix this page helps fill in.
// SPDX-License-Identifier: Apache-2.0

var PasskeyCheck = (function () {
  'use strict';

  var VERSION = 'v1';
  var PRF_LABEL = 'veilcore/passkey-check/v1/prf-input';
  var CODE_LABEL = 'veilcore/passkey-check/v1/code';
  var LANGS = ['en', 'de', 'es', 'fr', 'ja'];

  var STRINGS = {
    en: {
      title: 'Passkey check',
      intro:
        'This page tests whether this browser and device can lock and open data with a passkey, as “Saved with VeilCore” does (the WebAuthn “PRF” extension). Nothing is saved or sent anywhere: the results stay on this page.',
      capsTitle: 'What this browser says it can do',
      capWebauthn: 'Passkeys (WebAuthn)',
      capPlatform: 'A passkey on this device (Face ID, Touch ID, Windows Hello, screen lock)',
      capPrf: 'Passkey encryption (PRF), as the browser reports it',
      capHybrid: 'Using a phone’s passkey from here (QR code)',
      yes: 'Yes',
      no: 'No',
      unknown: 'Not reported',
      testTitle: 'Test a passkey',
      testIntro:
        'Each test asks for your passkey twice, with Face ID, a fingerprint or your device PIN. The page checks that the passkey gives the same secret both times, which a locked copy needs. The secret comes from a test-only input, so it can’t open anything.',
      useExisting: 'Test my passkey for this site',
      useExistingNote: 'Uses a passkey you already made here.',
      makeNew: 'Make a test passkey and test it',
      makeNewNote:
        'Adds a passkey named “Passkey check (test only)” to your password manager. Delete it there afterwards. It can’t open your records.',
      stepMake: 'Making the test passkey…',
      stepFirst: 'Asking for the passkey (1 of 2)…',
      stepSecond: 'Asking again (2 of 2)…',
      resTitle: 'Result',
      resPrf: 'Passkey encryption (PRF)',
      resStable: 'Same secret both times',
      resSynced: 'Synced to your other devices',
      syncedYes: 'Yes: backed up, so it should work on your other devices signed in to the same account',
      syncedEligible: 'It can sync, but isn’t backed up yet',
      syncedNo: 'No: only on this device (or this security key)',
      resKind: 'Kind',
      kindPlatform: 'This device',
      kindCross: 'A security key or another device',
      resCode: 'Check code',
      codeNote:
        'Run this test with the same passkey on your other device: the check code must be the same there. It comes from the test-only secret and shows nothing about your records.',
      verdictOk: 'This passkey can lock and open data in this browser.',
      verdictNoPrf:
        'This browser or passkey gives no secret (no PRF), so it can’t lock data here. Use your backup file or recovery sheet on this device.',
      verdictUnstable:
        'This passkey gave a different secret the second time. Don’t rely on it to lock data on this device, and please send us the result line.',
      errCancelled: 'Cancelled, timed out, or no passkey for this site on this device. Nothing was changed.',
      errUnsupported: 'This browser can’t use passkeys on this page.',
      errOther: 'The test stopped: {why}',
      shareTitle: 'Result line to share',
      shareNote:
        'Paste this line into a message to us or a bug report. It holds no secret: no key, no passkey ID, no address.',
      copy: 'Copy',
      copied: 'Copied',
      back: 'Back to VeilCore',
      language: 'Language',
    },
    de: {
      title: 'Passkey-Prüfung',
      intro:
        'Diese Seite prüft, ob dieser Browser und dieses Gerät Daten mit einem Passkey verschlüsseln und öffnen können, so wie es „Bei VeilCore gespeichert“ tut (die WebAuthn-Erweiterung „PRF“). Nichts wird gespeichert oder gesendet: Die Ergebnisse bleiben auf dieser Seite.',
      capsTitle: 'Was dieser Browser angibt zu können',
      capWebauthn: 'Passkeys (WebAuthn)',
      capPlatform: 'Ein Passkey auf diesem Gerät (Face ID, Touch ID, Windows Hello, Bildschirmsperre)',
      capPrf: 'Verschlüsselung mit Passkey (PRF), laut Browser',
      capHybrid: 'Den Passkey eines Handys von hier aus nutzen (QR-Code)',
      yes: 'Ja',
      no: 'Nein',
      unknown: 'Keine Angabe',
      testTitle: 'Einen Passkey prüfen',
      testIntro:
        'Jede Prüfung fragt zweimal nach Ihrem Passkey, mit Face ID, Fingerabdruck oder der PIN Ihres Geräts. Die Seite prüft, dass der Passkey beide Male dasselbe Geheimnis liefert, was eine verschlüsselte Kopie braucht. Das Geheimnis entsteht aus einer Eingabe nur für diesen Test und kann nichts öffnen.',
      useExisting: 'Meinen Passkey für diese Website prüfen',
      useExistingNote: 'Nutzt einen Passkey, den Sie hier schon erstellt haben.',
      makeNew: 'Einen Test-Passkey erstellen und prüfen',
      makeNewNote:
        'Fügt Ihrem Passwortmanager einen Passkey namens „Passkey-Prüfung (nur Test)“ hinzu. Löschen Sie ihn dort danach. Er kann Ihre Datensätze nicht öffnen.',
      stepMake: 'Test-Passkey wird erstellt …',
      stepFirst: 'Frage nach dem Passkey (1 von 2) …',
      stepSecond: 'Frage noch einmal (2 von 2) …',
      resTitle: 'Ergebnis',
      resPrf: 'Verschlüsselung mit Passkey (PRF)',
      resStable: 'Beide Male dasselbe Geheimnis',
      resSynced: 'Mit Ihren anderen Geräten synchronisiert',
      syncedYes: 'Ja: gesichert, er sollte also auf Ihren anderen Geräten mit demselben Konto funktionieren',
      syncedEligible: 'Er kann synchronisiert werden, ist aber noch nicht gesichert',
      syncedNo: 'Nein: nur auf diesem Gerät (oder diesem Sicherheitsschlüssel)',
      resKind: 'Art',
      kindPlatform: 'Dieses Gerät',
      kindCross: 'Ein Sicherheitsschlüssel oder ein anderes Gerät',
      resCode: 'Prüfcode',
      codeNote:
        'Machen Sie diese Prüfung mit demselben Passkey auf Ihrem anderen Gerät: Der Prüfcode muss dort derselbe sein. Er entsteht aus dem Geheimnis nur für diesen Test und verrät nichts über Ihre Datensätze.',
      verdictOk: 'Dieser Passkey kann in diesem Browser Daten verschlüsseln und öffnen.',
      verdictNoPrf:
        'Dieser Browser oder Passkey liefert kein Geheimnis (kein PRF) und kann hier keine Daten verschlüsseln. Nutzen Sie auf diesem Gerät Ihre Sicherungsdatei oder Ihr Wiederherstellungsblatt.',
      verdictUnstable:
        'Dieser Passkey hat beim zweiten Mal ein anderes Geheimnis geliefert. Verlassen Sie sich auf diesem Gerät nicht darauf, um Daten zu verschlüsseln, und senden Sie uns bitte die Ergebniszeile.',
      errCancelled: 'Abgebrochen, abgelaufen oder kein Passkey für diese Website auf diesem Gerät. Nichts wurde geändert.',
      errUnsupported: 'Dieser Browser kann auf dieser Seite keine Passkeys nutzen.',
      errOther: 'Die Prüfung wurde abgebrochen: {why}',
      shareTitle: 'Ergebniszeile zum Teilen',
      shareNote:
        'Fügen Sie diese Zeile in eine Nachricht an uns oder einen Fehlerbericht ein. Sie enthält kein Geheimnis: keinen Schlüssel, keine Passkey-ID, keine Adresse.',
      copy: 'Kopieren',
      copied: 'Kopiert',
      back: 'Zurück zu VeilCore',
      language: 'Sprache',
    },
    es: {
      title: 'Comprobación de llave de acceso',
      intro:
        'Esta página comprueba si este navegador y este dispositivo pueden cifrar y abrir datos con una llave de acceso (passkey), como lo hace «Guardado con VeilCore» (la extensión «PRF» de WebAuthn). No se guarda ni se envía nada: los resultados quedan en esta página.',
      capsTitle: 'Lo que este navegador dice que puede hacer',
      capWebauthn: 'Llaves de acceso (WebAuthn)',
      capPlatform: 'Una llave de acceso en este dispositivo (Face ID, Touch ID, Windows Hello, bloqueo de pantalla)',
      capPrf: 'Cifrado con llave de acceso (PRF), según el navegador',
      capHybrid: 'Usar desde aquí la llave de acceso de un celular (código QR)',
      yes: 'Sí',
      no: 'No',
      unknown: 'Sin dato',
      testTitle: 'Comprobar una llave de acceso',
      testIntro:
        'Cada prueba pide su llave de acceso dos veces, con Face ID, una huella o el PIN de su dispositivo. La página comprueba que la llave da el mismo secreto las dos veces, que es lo que necesita una copia cifrada. El secreto sale de una entrada solo para esta prueba, así que no puede abrir nada.',
      useExisting: 'Comprobar mi llave de acceso para este sitio',
      useExistingNote: 'Usa una llave de acceso que ya creó aquí.',
      makeNew: 'Crear una llave de prueba y comprobarla',
      makeNewNote:
        'Agrega a su gestor de contraseñas una llave de acceso llamada «Comprobación de llave (solo prueba)». Bórrela allí después. No puede abrir sus registros.',
      stepMake: 'Creando la llave de prueba…',
      stepFirst: 'Pidiendo la llave de acceso (1 de 2)…',
      stepSecond: 'Pidiéndola otra vez (2 de 2)…',
      resTitle: 'Resultado',
      resPrf: 'Cifrado con llave de acceso (PRF)',
      resStable: 'El mismo secreto las dos veces',
      resSynced: 'Sincronizada con sus otros dispositivos',
      syncedYes: 'Sí: tiene copia de seguridad, así que debería funcionar en sus otros dispositivos con la misma cuenta',
      syncedEligible: 'Puede sincronizarse, pero aún no tiene copia de seguridad',
      syncedNo: 'No: solo en este dispositivo (o en esta llave de seguridad)',
      resKind: 'Tipo',
      kindPlatform: 'Este dispositivo',
      kindCross: 'Una llave de seguridad u otro dispositivo',
      resCode: 'Código de comprobación',
      codeNote:
        'Haga esta prueba con la misma llave de acceso en su otro dispositivo: el código de comprobación tiene que ser el mismo allí. Sale del secreto solo para esta prueba y no muestra nada de sus registros.',
      verdictOk: 'Esta llave de acceso puede cifrar y abrir datos en este navegador.',
      verdictNoPrf:
        'Este navegador o esta llave no dan un secreto (no hay PRF), así que no pueden cifrar datos aquí. En este dispositivo use su copia de seguridad o su hoja de recuperación.',
      verdictUnstable:
        'Esta llave de acceso dio un secreto distinto la segunda vez. No confíe en ella para cifrar datos en este dispositivo, y por favor envíenos la línea de resultado.',
      errCancelled: 'Cancelado, tiempo agotado o no hay una llave de acceso para este sitio en este dispositivo. No se cambió nada.',
      errUnsupported: 'Este navegador no puede usar llaves de acceso en esta página.',
      errOther: 'La prueba se detuvo: {why}',
      shareTitle: 'Línea de resultado para compartir',
      shareNote:
        'Pegue esta línea en un mensaje para nosotros o en un informe de error. No contiene ningún secreto: ni clave, ni ID de la llave, ni dirección.',
      copy: 'Copiar',
      copied: 'Copiado',
      back: 'Volver a VeilCore',
      language: 'Idioma',
    },
    fr: {
      title: 'Vérification de clé d’accès',
      intro:
        'Cette page vérifie si ce navigateur et cet appareil peuvent chiffrer et ouvrir des données avec une clé d’accès (passkey), comme le fait « Enregistré avec VeilCore » (l’extension « PRF » de WebAuthn). Rien n’est enregistré ni envoyé : les résultats restent sur cette page.',
      capsTitle: 'Ce que ce navigateur dit savoir faire',
      capWebauthn: 'Clés d’accès (WebAuthn)',
      capPlatform: 'Une clé d’accès sur cet appareil (Face ID, Touch ID, Windows Hello, verrouillage de l’écran)',
      capPrf: 'Chiffrement par clé d’accès (PRF), selon le navigateur',
      capHybrid: 'Utiliser d’ici la clé d’accès d’un téléphone (code QR)',
      yes: 'Oui',
      no: 'Non',
      unknown: 'Non indiqué',
      testTitle: 'Vérifier une clé d’accès',
      testIntro:
        'Chaque test demande votre clé d’accès deux fois, avec Face ID, une empreinte ou le code de votre appareil. La page vérifie que la clé donne le même secret les deux fois, ce dont une copie chiffrée a besoin. Le secret vient d’une entrée réservée à ce test : il ne peut rien ouvrir.',
      useExisting: 'Vérifier ma clé d’accès pour ce site',
      useExistingNote: 'Utilise une clé d’accès que vous avez déjà créée ici.',
      makeNew: 'Créer une clé de test et la vérifier',
      makeNewNote:
        'Ajoute à votre gestionnaire de mots de passe une clé d’accès nommée « Vérification de clé (test seulement) ». Supprimez-la ensuite. Elle ne peut pas ouvrir vos enregistrements.',
      stepMake: 'Création de la clé de test…',
      stepFirst: 'Demande de la clé d’accès (1 sur 2)…',
      stepSecond: 'Nouvelle demande (2 sur 2)…',
      resTitle: 'Résultat',
      resPrf: 'Chiffrement par clé d’accès (PRF)',
      resStable: 'Le même secret les deux fois',
      resSynced: 'Synchronisée avec vos autres appareils',
      syncedYes: 'Oui : sauvegardée, elle devrait donc marcher sur vos autres appareils connectés au même compte',
      syncedEligible: 'Elle peut se synchroniser, mais n’est pas encore sauvegardée',
      syncedNo: 'Non : seulement sur cet appareil (ou cette clé de sécurité)',
      resKind: 'Type',
      kindPlatform: 'Cet appareil',
      kindCross: 'Une clé de sécurité ou un autre appareil',
      resCode: 'Code de vérification',
      codeNote:
        'Faites ce test avec la même clé d’accès sur votre autre appareil : le code de vérification doit y être le même. Il vient du secret réservé à ce test et ne montre rien de vos enregistrements.',
      verdictOk: 'Cette clé d’accès peut chiffrer et ouvrir des données dans ce navigateur.',
      verdictNoPrf:
        'Ce navigateur ou cette clé ne donne aucun secret (pas de PRF) : il ne peut pas chiffrer de données ici. Sur cet appareil, utilisez votre fichier de sauvegarde ou votre feuille de récupération.',
      verdictUnstable:
        'Cette clé d’accès a donné un autre secret la deuxième fois. Ne comptez pas sur elle pour chiffrer des données sur cet appareil, et envoyez-nous la ligne de résultat, s’il vous plaît.',
      errCancelled: 'Annulé, délai dépassé, ou aucune clé d’accès pour ce site sur cet appareil. Rien n’a été modifié.',
      errUnsupported: 'Ce navigateur ne peut pas utiliser de clé d’accès sur cette page.',
      errOther: 'Le test s’est arrêté : {why}',
      shareTitle: 'Ligne de résultat à partager',
      shareNote:
        'Collez cette ligne dans un message pour nous ou un rapport de bogue. Elle ne contient aucun secret : ni clé, ni identifiant de clé d’accès, ni adresse.',
      copy: 'Copier',
      copied: 'Copié',
      back: 'Retour à VeilCore',
      language: 'Langue',
    },
    ja: {
      title: 'パスキーの確認',
      intro:
        'このページは、このブラウザと端末がパスキーでデータに鍵をかけたり開けたりできるかを確認します（「VeilCoreに保存」と同じ方法、WebAuthnの「PRF」拡張）。何も保存も送信もしません。結果はこのページにだけ表示されます。',
      capsTitle: 'このブラウザができると報告していること',
      capWebauthn: 'パスキー（WebAuthn）',
      capPlatform: 'この端末のパスキー（Face ID、Touch ID、Windows Hello、画面ロック）',
      capPrf: 'パスキーによる暗号化（PRF）、ブラウザの報告',
      capHybrid: 'ここからスマートフォンのパスキーを使う（QRコード）',
      yes: 'はい',
      no: 'いいえ',
      unknown: '報告なし',
      testTitle: 'パスキーを確認する',
      testIntro:
        '各テストでは、Face ID、指紋、または端末のPINでパスキーを2回求めます。パスキーが2回とも同じ秘密を返すかを確認します。鍵のかかったコピーにはこれが必要です。秘密はこのテスト専用の入力から作られるため、何も開けません。',
      useExisting: 'このサイトの自分のパスキーを確認する',
      useExistingNote: 'ここで作成済みのパスキーを使います。',
      makeNew: 'テスト用パスキーを作って確認する',
      makeNewNote:
        'パスワードマネージャーに「パスキーの確認（テスト用）」という名前のパスキーを追加します。あとでそこから削除してください。あなたの記録は開けません。',
      stepMake: 'テスト用パスキーを作成しています…',
      stepFirst: 'パスキーを求めています（1/2）…',
      stepSecond: 'もう一度求めています（2/2）…',
      resTitle: '結果',
      resPrf: 'パスキーによる暗号化（PRF）',
      resStable: '2回とも同じ秘密',
      resSynced: 'ほかの端末と同期',
      syncedYes: 'はい：バックアップ済みなので、同じアカウントのほかの端末でも使えるはずです',
      syncedEligible: '同期できますが、まだバックアップされていません',
      syncedNo: 'いいえ：この端末（またはこのセキュリティキー）だけです',
      resKind: '種類',
      kindPlatform: 'この端末',
      kindCross: 'セキュリティキーまたは別の端末',
      resCode: '確認コード',
      codeNote:
        '同じパスキーで、ほかの端末でもこのテストをしてください。そこでも確認コードが同じでなければなりません。テスト専用の秘密から作られ、あなたの記録については何も示しません。',
      verdictOk: 'このパスキーは、このブラウザでデータに鍵をかけたり開けたりできます。',
      verdictNoPrf:
        'このブラウザまたはパスキーは秘密を返しません（PRFなし）。ここではデータに鍵をかけられません。この端末ではバックアップファイルか復元シートを使ってください。',
      verdictUnstable:
        'このパスキーは2回目に別の秘密を返しました。この端末でデータに鍵をかけるのに使わないでください。結果の行を私たちに送っていただけると助かります。',
      errCancelled: 'キャンセルされたか、時間切れか、この端末にこのサイトのパスキーがありません。何も変更していません。',
      errUnsupported: 'このブラウザでは、このページでパスキーを使えません。',
      errOther: 'テストが止まりました：{why}',
      shareTitle: '共有用の結果の行',
      shareNote:
        'この行を私たちへのメッセージや不具合の報告に貼り付けてください。秘密は含まれません：鍵も、パスキーのIDも、アドレスもありません。',
      copy: 'コピー',
      copied: 'コピーしました',
      back: 'VeilCoreに戻る',
      language: '言語',
    },
  };

  /** The relying party id, as the site uses it (bboard-ui/src/veilcore/passkey-backup.ts rpIdFor). */
  function rpIdFor(host) {
    var h = String(host || '').toLowerCase();
    if (h === 'test.veilcore.org' || /\.test\.veilcore\.org$/.test(h)) return 'test.veilcore.org';
    if (h === 'veilcore.org' || /\.veilcore\.org$/.test(h)) return 'veilcore.org';
    return undefined;
  }

  /** The authenticator data's flags: UP, UV, BE (can sync), BS (is backed up). Null when too short. */
  function flagsOf(authData) {
    var b = authData instanceof Uint8Array ? authData : authData ? new Uint8Array(authData) : null;
    if (!b || b.length < 37) return null;
    var f = b[32];
    return { up: !!(f & 0x01), uv: !!(f & 0x04), be: !!(f & 0x08), bs: !!(f & 0x10) };
  }

  function pickLang(query, stored, browser) {
    var q = /(?:^|[?&])lang=([a-z]{2})/.exec(query || '');
    if (q && LANGS.indexOf(q[1]) >= 0) return q[1];
    if (stored && LANGS.indexOf(stored) >= 0) return stored;
    for (var i = 0; i < (browser || []).length; i++) {
      var l = String(browser[i]).slice(0, 2).toLowerCase();
      if (LANGS.indexOf(l) >= 0) return l;
    }
    return 'en';
  }

  /** A coarse browser and system name: no version beyond the major one. */
  function clientOf(ua, uaData) {
    var browser = 'unknown browser';
    var m;
    if ((m = /Edg\/(\d+)/.exec(ua))) browser = 'Edge ' + m[1];
    else if ((m = /SamsungBrowser\/(\d+)/.exec(ua))) browser = 'Samsung Internet ' + m[1];
    else if ((m = /Firefox\/(\d+)/.exec(ua)) || (m = /FxiOS\/(\d+)/.exec(ua))) browser = 'Firefox ' + m[1];
    else if ((m = /CriOS\/(\d+)/.exec(ua)) || (m = /Chrome\/(\d+)/.exec(ua))) browser = 'Chrome ' + m[1];
    else if ((m = /Version\/(\d+(?:\.\d+)?).*Safari\//.exec(ua))) browser = 'Safari ' + m[1];
    var system = 'unknown system';
    if ((m = /(?:iPhone|iPad|iPod).*? OS (\d+)[_.](\d+)/.exec(ua))) system = 'iOS ' + m[1] + '.' + m[2];
    else if ((m = /Android (\d+)/.exec(ua))) system = 'Android ' + m[1];
    else if (/Windows NT 10/.test(ua)) system = 'Windows 10/11';
    else if (/Mac OS X/.test(ua)) system = 'macOS';
    else if (/CrOS/.test(ua)) system = 'ChromeOS';
    else if (/Linux/.test(ua)) system = 'Linux';
    if (uaData && typeof uaData.platform === 'string' && uaData.platform && system === 'unknown system') system = uaData.platform;
    return browser + ' on ' + system;
  }

  function yn(v) {
    return v === true ? 'yes' : v === false ? 'no' : '?';
  }

  /**
   * The line to share: language-neutral, with no secret. Fields: version, date, client, then
   * what the browser reports and what the test found.
   */
  function resultLine(r) {
    var parts = [
      'passkey-check ' + VERSION,
      r.date,
      r.client,
      'webauthn=' + yn(r.caps.webauthn),
      'platform=' + yn(r.caps.platform),
      'prf-reported=' + yn(r.caps.prf),
    ];
    if (r.test) {
      parts.push('test=' + r.test.kind);
      parts.push('prf=' + yn(r.test.prf));
      if (r.test.prf) parts.push('stable=' + yn(r.test.stable));
      if (r.test.flags) parts.push('be=' + (r.test.flags.be ? 1 : 0) + ' bs=' + (r.test.flags.bs ? 1 : 0));
      if (r.test.attachment) parts.push('attach=' + r.test.attachment);
      if (r.test.code) parts.push('code=' + r.test.code);
      if (r.test.error) parts.push('error=' + r.test.error);
    }
    return parts.join(' · ');
  }

  var enc = new TextEncoder();
  function sha256(bytes) {
    return crypto.subtle.digest('SHA-256', bytes).then(function (d) {
      return new Uint8Array(d);
    });
  }
  function concat(a, b) {
    var out = new Uint8Array(a.length + b.length);
    out.set(a);
    out.set(b, a.length);
    return out;
  }
  function hex(b) {
    var s = '';
    for (var i = 0; i < b.length; i++) s += (b[i] < 16 ? '0' : '') + b[i].toString(16);
    return s;
  }
  function same(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    var d = 0;
    for (var i = 0; i < a.length; i++) d |= a[i] ^ b[i];
    return d === 0;
  }
  /** 4 bytes of SHA-256(code label || PRF output): the same passkey gives the same code everywhere. */
  function checkCode(prf) {
    return sha256(concat(enc.encode(CODE_LABEL), prf)).then(function (d) {
      return hex(d.subarray(0, 4));
    });
  }
  function prfInput() {
    return sha256(enc.encode(PRF_LABEL));
  }
  function random(n) {
    var b = new Uint8Array(n);
    crypto.getRandomValues(b);
    return b;
  }

  /** What the browser reports, with no prompt. */
  function capabilities() {
    var out = { webauthn: false, platform: null, prf: null, hybrid: null };
    var P = typeof window !== 'undefined' ? window.PublicKeyCredential : undefined;
    if (!P || !navigator.credentials) return Promise.resolve(out);
    out.webauthn = true;
    var asks = [];
    if (typeof P.isUserVerifyingPlatformAuthenticatorAvailable === 'function')
      asks.push(P.isUserVerifyingPlatformAuthenticatorAvailable().then(function (v) { out.platform = !!v; }, function () {}));
    if (typeof P.getClientCapabilities === 'function')
      asks.push(P.getClientCapabilities().then(function (c) {
        if (c && typeof c['extension:prf'] === 'boolean') out.prf = c['extension:prf'];
        if (c && typeof c.hybridTransport === 'boolean') out.hybrid = c.hybridTransport;
      }, function () {}));
    return Promise.all(asks).then(function () { return out; });
  }

  /** One get(): the PRF output (or null), the flags, the attachment and the credential's raw id. */
  function ask(creds, rpId, input, allow) {
    var opts = {
      challenge: random(32),
      userVerification: 'required',
      timeout: 120000,
      extensions: { prf: { eval: { first: input } } },
    };
    if (rpId) opts.rpId = rpId;
    if (allow) opts.allowCredentials = [{ type: 'public-key', id: allow }];
    return creds.get({ publicKey: opts }).then(function (cred) {
      var ext = cred.getClientExtensionResults ? cred.getClientExtensionResults() : {};
      var first = ext && ext.prf && ext.prf.results && ext.prf.results.first;
      return {
        prf: first ? new Uint8Array(first) : null,
        flags: flagsOf(cred.response && cred.response.authenticatorData),
        attachment: cred.authenticatorAttachment || null,
        rawId: new Uint8Array(cred.rawId),
      };
    });
  }

  /** Make a test passkey with the prf extension; resolves to its raw id and what create() said. */
  function make(creds, rpId, input) {
    var rp = { name: 'Passkey check' };
    if (rpId) rp.id = rpId;
    return creds.create({
      publicKey: {
        rp: rp,
        user: { id: random(16), name: 'passkey-check', displayName: 'Passkey check (test only)' },
        challenge: random(32),
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
        timeout: 120000,
        extensions: { prf: { eval: { first: input } } },
      },
    }).then(function (cred) {
      var ext = cred.getClientExtensionResults ? cred.getClientExtensionResults() : {};
      return { rawId: new Uint8Array(cred.rawId), enabled: ext && ext.prf ? ext.prf.enabled : undefined };
    });
  }

  /**
   * The whole test: optionally make a passkey, then ask twice with the same input. `creds` is
   * navigator.credentials (a stand-in in the tests).
   */
  function runTest(kind, rpId, progress, creds) {
    creds = creds || navigator.credentials;
    var test = { kind: kind, prf: null, stable: null, flags: null, attachment: null, code: null, error: null };
    var input;
    var allow = null;
    return prfInput()
      .then(function (i) {
        input = i;
        if (kind !== 'new') return null;
        progress('stepMake');
        return make(creds, rpId, input).then(function (m) {
          allow = m.rawId;
          if (m.enabled === false) test.prf = false;
        });
      })
      .then(function () {
        progress('stepFirst');
        return ask(creds, rpId, input, allow);
      })
      .then(function (first) {
        test.flags = first.flags;
        test.attachment = first.attachment;
        test.prf = !!first.prf;
        if (!first.prf) return test;
        progress('stepSecond');
        return ask(creds, rpId, input, first.rawId).then(function (second) {
          test.stable = same(first.prf, second.prf);
          return checkCode(first.prf).then(function (c) {
            test.code = c;
            return test;
          });
        });
      })
      .catch(function (e) {
        var name = e && e.name ? e.name : 'Error';
        test.error = name === 'NotAllowedError' || name === 'AbortError' ? 'cancelled' : name === 'NotSupportedError' || name === 'SecurityError' ? 'unsupported' : name;
        test.errorMessage = e && e.message ? String(e.message).slice(0, 200) : '';
        return test;
      });
  }

  // ---- the page ---------------------------------------------------------------------------

  function init() {
    var stored = null;
    try {
      stored = localStorage.getItem('veilcore.lang');
    } catch (e) {
      stored = null;
    }
    var lang = pickLang(location.search, stored, navigator.languages || [navigator.language]);
    var S = STRINGS[lang];
    document.documentElement.lang = lang;
    document.title = S.title;
    function el(id) {
      return document.getElementById(id);
    }
    function text(id, key) {
      el(id).textContent = S[key];
    }
    function words(key, vars) {
      return S[key].replace(/\{(\w+)\}/g, function (_, k) {
        return vars && vars[k] !== undefined ? vars[k] : '';
      });
    }
    ['title', 'intro', 'capsTitle', 'testTitle', 'testIntro', 'useExisting', 'useExistingNote', 'makeNew', 'makeNewNote', 'shareTitle', 'shareNote', 'copy', 'back', 'language'].forEach(
      function (k) {
        var node = el('pk-' + k);
        if (node) node.textContent = S[k];
      },
    );
    var picker = el('pk-lang');
    LANGS.forEach(function (l) {
      var o = document.createElement('option');
      o.value = l;
      o.textContent = { en: 'English', de: 'Deutsch', es: 'Español', fr: 'Français', ja: '日本語' }[l];
      if (l === lang) o.selected = true;
      picker.appendChild(o);
    });
    picker.addEventListener('change', function () {
      location.search = '?lang=' + picker.value;
    });

    var state = { date: new Date().toISOString().slice(0, 10), client: clientOf(navigator.userAgent || '', navigator.userAgentData), caps: null, test: null };
    function row(list, label, value) {
      var dt = document.createElement('dt');
      dt.textContent = label;
      var dd = document.createElement('dd');
      dd.textContent = value;
      list.appendChild(dt);
      list.appendChild(dd);
    }
    function ynWords(v) {
      return v === true ? S.yes : v === false ? S.no : S.unknown;
    }
    function showLine() {
      el('pk-line').textContent = resultLine(state);
    }
    function showCaps() {
      var list = el('pk-caps');
      list.textContent = '';
      row(list, S.capWebauthn, ynWords(state.caps.webauthn));
      row(list, S.capPlatform, ynWords(state.caps.platform));
      row(list, S.capPrf, ynWords(state.caps.prf));
      row(list, S.capHybrid, ynWords(state.caps.hybrid));
    }
    function showTest(t) {
      var box = el('pk-result');
      box.hidden = false;
      text('pk-resTitle', 'resTitle');
      var list = el('pk-res');
      list.textContent = '';
      var verdict = el('pk-verdict');
      verdict.className = '';
      if (t.error) {
        verdict.textContent =
          t.error === 'cancelled' ? S.errCancelled : t.error === 'unsupported' ? S.errUnsupported : words('errOther', { why: t.error });
        verdict.className = 'warn';
        return;
      }
      row(list, S.resPrf, ynWords(t.prf));
      if (t.prf) row(list, S.resStable, ynWords(t.stable));
      if (t.flags) row(list, S.resSynced, t.flags.bs ? S.syncedYes : t.flags.be ? S.syncedEligible : S.syncedNo);
      if (t.attachment) row(list, S.resKind, t.attachment === 'platform' ? S.kindPlatform : S.kindCross);
      if (t.code) {
        row(list, S.resCode, t.code);
        el('pk-codeNote').textContent = S.codeNote;
        el('pk-codeNote').hidden = false;
      } else {
        el('pk-codeNote').hidden = true;
      }
      verdict.textContent = !t.prf ? S.verdictNoPrf : t.stable ? S.verdictOk : S.verdictUnstable;
      verdict.className = !t.prf || !t.stable ? 'warn' : 'ok';
    }
    var buttons = [el('pk-useExisting'), el('pk-makeNew')];
    function start(kind) {
      if (!state.caps || !state.caps.webauthn) return;
      buttons.forEach(function (b) { b.disabled = true; });
      var status = el('pk-status');
      runTest(kind, rpIdFor(location.hostname), function (k) {
        status.textContent = S[k];
      }).then(function (t) {
        status.textContent = '';
        state.test = t;
        showTest(t);
        showLine();
        buttons.forEach(function (b) { b.disabled = false; });
      });
    }
    el('pk-useExisting').addEventListener('click', function () { start('existing'); });
    el('pk-makeNew').addEventListener('click', function () { start('new'); });
    el('pk-copy').addEventListener('click', function () {
      var line = el('pk-line').textContent;
      if (navigator.clipboard && navigator.clipboard.writeText)
        navigator.clipboard.writeText(line).then(function () {
          el('pk-copy').textContent = S.copied;
        }, function () {});
    });
    capabilities().then(function (c) {
      state.caps = c;
      showCaps();
      showLine();
      if (!c.webauthn) {
        buttons.forEach(function (b) { b.disabled = true; });
        el('pk-status').textContent = S.errUnsupported;
      }
    });
  }

  if (typeof document !== 'undefined' && document.getElementById('pk-title')) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }

  return {
    VERSION: VERSION,
    PRF_LABEL: PRF_LABEL,
    LANGS: LANGS,
    STRINGS: STRINGS,
    rpIdFor: rpIdFor,
    flagsOf: flagsOf,
    pickLang: pickLang,
    clientOf: clientOf,
    resultLine: resultLine,
    checkCode: checkCode,
    runTest: runTest,
  };
})();
