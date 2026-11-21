# Translation glossary

One word per idea, per language, and where the word comes from. The translations of the site
and the app (`bboard-ui/src/i18n/`) keep to these. Check a new string against this page before
it goes in; if a word here is wrong, change it here and in every file in the same pull request.

Japanese, Spanish, German and French were reviewed against the official and industry sources
below, not by a fluent human reviewer, and switched on by the founder's decision on
19 November 2026 ([translations/README.md](translations/README.md), "Sign-off"). The English
is the source text, and the terms of use say the English governs.

## Rules for every language

- **Hold, never own.** A record shows prior possession by a date. Never a word for ownership
  or property.
- Polite register: です/ます in Japanese, *usted* in Spanish, *Sie* in German, *vous* in French.
  Headings and short labels may be noun phrases.
- Keep every placeholder (`{name}`) and tag (`<b>`, `<link>`) exactly.
- A fragment that fills a placeholder (`app.copy.ourServer`, `app.common.network.*`) starts
  lowercase in Spanish, German and French. Never put such a placeholder first in a sentence:
  write the sentence so it comes after a preposition ("en {server}", "auf {server}",
  "sur {server}").
- Keep every limit and every "does not" exactly as strong as the English.

## Japanese

| English | Japanese | Source |
| --- | --- | --- |
| record | 記録 | — |
| hold, holder | 保有, 保有者 (never 所有) | site rule; MAFF uses 育成者権者 only for the legal right holder, which a record does not make anyone |
| breeder (plants) | 育成者 | MAFF 品種登録制度 pamphlet: 「育成者及びその承継人」 ([hinshu2.maff.go.jp](https://www.hinshu2.maff.go.jp/pvr/pamphlet/seido.pdf)) |
| breeder or holder (animals) | 生産者または保有者 | MAFF 家畜遺伝資源: 「精液・受精卵生産事業者」 ([maff.go.jp](https://www.maff.go.jp/j/pr/annual/pdf/wagyu_idenshigen_hogo.pdf)) |
| variety | 品種 | MAFF pamphlet |
| licence | ライセンス (the legal act: 許諾) | MAFF pamphlet: 「許諾を受けた者は契約で定められた範囲で…利用」 |
| royalty | ロイヤリティ (one spelling; not ロイヤルティ) | — |
| agreement, contract | 契約 | MAFF 家畜遺伝資源: 「譲渡契約約款」 |
| seal (a record) | 封印 | — |
| seal (on a sample bag) | 封緘 | — |
| date stamp | 日付スタンプ | — |
| proof code | 証明コード | — |
| backup | バックアップ | bank app help pages use 引き継ぎ for moving to a new phone ([77bank.co.jp](https://www.77bank.co.jp/77bank_appli/faq_12.html)); the app keeps バックアップ for the file |
| lab report | 検査報告書 (DNA報告書 for a DNA report; never ラボレポート, DNAレポート) | — |
| lab | ラボ, throughout (not 検査機関): the same word for the user's role and in running text | CTO decision, 19 Nov 2026 review (S3) |
| prior possession | ある日付までに保有していたこと; in a line prefix 日付までの保有 (not それ以前からの保有) | 19 Nov 2026 review (S1) |
| second party | もう一方の当事者 / 相手方 (never 第三者, which reads as an independent outsider; 第三者 only where the English means outsiders) | 19 Nov 2026 review (B2) |
| claim (the claims feature) | クレーム (never 証明, which says "proof") | site glossary; 19 Nov 2026 review (B3) |
| attestation, signed statement | 署名付きの陳述 (never 証明) | 19 Nov 2026 review (B4) |
| batch root | バッチのルート (never バッチの証明コード: 証明コード is a record's fingerprint) | 19 Nov 2026 review (B5) |
| evidence bundle | 証拠バンドル (not 証拠パッケージ) | 19 Nov 2026 review (S4) |
| locked | 鍵をかける / 鍵のかかった / 鍵がかかっています in body text and labels (not ロック) | CTO decision, 19 Nov 2026 review (S14) |
| delivery | 送付 (not 受け渡し; not 移転, which is a transfer of rights) | 19 Nov 2026 review (S5, S6) |
| species | 種名 (種 alone reads as たね, "seed") | 19 Nov 2026 review (S7) |
| to date (a record) | 日付を付ける (not 日付記録する) | 19 Nov 2026 review (S10) |
| check, verify | 確認 throughout (not 検証) | 19 Nov 2026 review (S20) |
| new phone | 機種変更 | CTO decision; 77bank app help (S26) |
| credential (W3C) | クレデンシャル (not 証明書, which is the record certificate) | 19 Nov 2026 review (S27) |
| at least / at most {n} | {n}以上 / {n}以下 | 19 Nov 2026 review (S28) |
| a record is "yours" | あなたの手元に残ります / あなたが保有していた (never あなたのもの for a record) | site rule; 19 Nov 2026 review (B6) |
| device | 端末 (not デバイス) | bank app help pages: 機種変更, 端末 |
| we (VeilCore) | 私たち, as the English says "we" (not 当社) | — |
| the Ask helper | 「VeilCoreに聞く」 | — |
| passkey | パスキー | Apple and Google Japanese help pages |
| saved with VeilCore (the account copy) | VeilCoreに保存 (not バックアップ, which is the file) | easy mode step 2, 19 Nov 2026 |
| recovery sheet, recovery code | 復旧シート, 復旧コード | Apple's own name for its printed code: 「復旧キー」 ([support.apple.com/ja-jp/HT208072](https://support.apple.com/ja-jp/HT208072)) |
| screen lock (Android, on the button) | 端末のPIN・パターン・パスワードを使う (what the phone actually asks for; 画面ロック names the setting, not what is typed) | easy mode step 2, 19 Nov 2026 |
| herd book (on the recovery sheet) | 血統書 (the papers a Japanese breeder keeps with it) | easy mode step 3 |
| tap | タップ | 77bank app help: 「…をタップし」 |

Typography: no space between a Latin word and Japanese (`VeilCoreの`, `記録ID`), and the
full-width colon `：` (19 Nov 2026 review, S12, S13).

## Spanish (neutral, reads naturally in Argentina)

| English | Spanish | Source |
| --- | --- | --- |
| record | registro | — |
| holder | titular in UI chrome (never dueño, propietario, propiedad). In honesty lines and the authority pack, name the party: "quien lo selló", "la asociación". Where rights are assigned, "el licenciante"; in lending, "el titular del registro" | CTO decision, 19 Nov 2026. INASE uses "titular de la variedad" for the registered owner (RNPC Título de Propiedad), so a bare "titular" next to a variety can read as ownership |
| prior possession | descriptive words, never "posesión" or "tenencia": label "Constancia de que ya lo tenía a una fecha"; in a sentence "muestra que quien lo selló ya tenía su archivo y sus datos a esa fecha" | CTO decision, 19 Nov 2026. CCyC arts. 1909-1910: "posesión" is acting as owner, "tenencia" holding for another; "tenencia" also echoes Ley 23.737 |
| by a date | "a esa fecha", "ya existía el {date}" (never "en esa fecha", which is "on") | 19 Nov 2026 review (5) |
| shows | muestra (not demuestra, which is "proves") | 19 Nov 2026 review (6) |
| registry (our server) | servidor de registros, always; a bare "registro" is a record. Checked by translations.test.ts | CTO decision, 19 Nov 2026 review (4, G4) |
| no sign-up | sin crear una cuenta, sin cuenta (never "sin registro", which reads "no record") | 19 Nov 2026 review (3) |
| claim (the claims feature) | afirmación; the contract: contrato de afirmaciones | CTO decision (G3) |
| lab test | análisis | CTO decision (G3); labresult.ts and Argentine labs |
| evidence | prueba | CTO decision (G3) |
| attestation, signed statement | declaración firmada (not atestación) | 19 Nov 2026 review (23) |
| public listing | listado público ("registro público" is an official registry in Argentina) | 19 Nov 2026 review (7) |
| add | agregar (not añadir) | 19 Nov 2026 review (14) |
| payment partner | proveedor de pagos; a partner organisation: organización asociada (a "socio" is an association member) | 19 Nov 2026 review (15) |
| check link | enlace de comprobación (not enlace de verificación) | 19 Nov 2026 review (21) |
| batch root | raíz del lote | 19 Nov 2026 review (22) |
| US dollars | US$ ("$" is the peso sign). The old flat-fee form is in US dollars; the practice royalty ledger is in the agreement's own currency, so its label says "en la moneda del acuerdo" | CTO decision; code: veilcore/royalty-terms.ts currencyOf (defaults to USD), TermsBuilder currencyForLocale |
| the authority pack | "Documentación de respaldo para REPROCANN / SEDRONAR"; "armar la documentación". SEDRONAR stays: oversight moved to SEDRONAR by Res. 376/2026 art. 17 | CTO decision, 19 Nov 2026 |
| legal citation style | "art. 4° ter" | Res. MS 1780/2025 |
| breeder (plants) | obtentor | INASE: "derecho de obtentor"; Res. 631/1992: "obtentores nacionales y extranjeros" ([argentina.gob.ar](https://www.argentina.gob.ar/normativa/nacional/norma-27578/texto)) |
| breeder (animals) | criador | — |
| variety | variedad, cultivar | INASE cannabis FAQ: "variedades nuevas", "Registro Nacional de Cultivares" ([argentina.gob.ar/inase](https://www.argentina.gob.ar/inase/cultivodecannabis/preguntas-frecuentes-sobre-cannabis)) |
| cutting, clone | esqueje | INASE cannabis FAQ: "esquejes enraizados y plantines" |
| registration (with an office) | inscripción | Res. 631/1992: "Solicitud de Inscripción" |
| licence, royalty | licencia, regalía | — |
| seal, date stamp | sellar, sello de fecha | — |
| proof code | código de prueba | — |
| backup | copia de seguridad (not respaldo) | — |
| locked, encrypted | cifrado (not cerrado, not bloqueado). "bloqueado" only for a record or agreement this browser can't open (it lacks the key) | CTO decision (G2); Argentine bank help pages say "cifrado" |
| lab report | informe de laboratorio | — |
| phone, computer | teléfono or celular, computadora (never móvil, ordenador) | Mi Argentina FAQ: "Si te roban o perdés el celular" ([argentina.gob.ar](https://www.argentina.gob.ar/node/152432)) |
| fill in | completar (not rellenar) | — |
| press (a button) | presionar or tocar (not pulsar) | — |
| wallet | billetera (not cartera) | — |
| accession number | n.º de accesión (never "número de registro") | 19 Nov 2026 review (18) |
| target (qPCR) | blanco (not diana); SOP: POE (not PNT) | 19 Nov 2026 review (19) |
| ear tag | caravana | SENASA |
| the Ask helper | «Preguntar» | — |
| passkey | llave de acceso | Apple and Google Spanish help pages |
| saved with VeilCore | guardado con VeilCore | easy mode step 2, 19 Nov 2026 |
| recovery sheet, recovery code | hoja de recuperación, código de recuperación | Apple: "clave de recuperación" ([support.apple.com/es-lamr/HT208072](https://support.apple.com/es-lamr/HT208072)) |

Register: *usted*. Argentine government pages use *vos* ("Descargá", "podés"); the founder
chose neutral *usted*, which reads correctly in Argentina and the rest of Latin America.

## German

| English | German | Source |
| --- | --- | --- |
| record | Datensatz | — |
| holder, hold | Inhaber, halten (never Besitz, besitzen, Eigentum). Next to variety or licence rights: "Inhaber des Datensatzes" / "Datensatzinhaber" | site rule. SortSchG uses "Sortenschutzinhaber" for the legal holder ([gesetze-im-internet.de](https://www.gesetze-im-internet.de/sortschg_1985/BJNR021700985.html)); CTO decision, 19 Nov 2026 |
| prior possession | Früheres Vorliegen (never Inhaberschaft, Besitz, Eigentum) | CTO decision, 19 Nov 2026. "Inhaberschaft" reads as holding a right; § 12 PatG "Erfindungsbesitz" is a prior-user right |
| the on-chain contract | Smart Contract (Haupt-Smart-Contract, Beleg-Smart-Contract); "Vertrag" only for licences and agreements | CTO decision, 19 Nov 2026 |
| claim (the claims feature) | Beleg, belegen (not Claim, not Nachweis) | CTO decision; "Claim" suggests a Patentanspruch |
| declared (offspring) | angegeben (not angemeldet: Anmeldung is the application for Sortenschutz) | CTO decision |
| challenge (one-time) | Abfragecode (not Prüfauftrag) | CTO decision |
| breeder | Züchter | SortSchG § 8: "Ursprungszüchter" |
| variety | Sorte | SortSchG § 2 |
| licence | Lizenz (the statute says Nutzungsrecht) | SortSchG § 11 |
| royalty | Lizenzgebühr | — |
| proof code | Prüfcode (not Nachweiscode) | — |
| date stamp | Datumsstempel | — |
| backup | Sicherungskopie; the file: Sicherungsdatei | Sparkasse's app help says "Backup" ([sparkasse.de](https://www.sparkasse.de/pk/produkte/konten-und-karten/finanzen-apps/app-geraetewechsel.html)); Sicherungskopie is the standard German word and the app keeps it |
| phone | Handy (not Telefon for the device; "am Telefon" for a call) | Sparkasse: "neues Handy", "Gerätewechsel" |
| batch (anchoring) | Stapel; a grow batch is Charge | — |
| existed by a date | spätestens an diesem Datum / spätestens zu diesem Zeitpunkt | — |
| main network | Hauptnetz | — |
| the Ask helper | „Fragen“ | — |
| passkey | Passkey | Apple and Google German help pages |
| saved with VeilCore | bei VeilCore gespeichert | easy mode step 2, 19 Nov 2026 |
| recovery sheet, recovery code | Wiederherstellungsblatt, Wiederherstellungscode | Apple: "Wiederherstellungsschlüssel" |
| herd book | Herdbuch | — |

Register: *Sie*, as the Sparkasse help pages do.

## French

| English | French | Source |
| --- | --- | --- |
| record | enregistrement | — |
| holder, hold | détenteur, détenir (never propriétaire, posséder, titulaire) | SEMAE: "détenteur du COV" ([semae.fr](https://www.semae.fr/uploads/D1752-FICHE-Pourquoi-la-creation-varietale-doit-elle-etre-protegee.pdf)) |
| breeder | obtenteur everywhere; for a mixed plant and animal audience, "obtenteurs et éleveurs" | CTO decision, 19 Nov 2026 (was: sélectionneur on public pages); the professional term for a CIOPORA or SEMAE audience |
| prior possession | "Détention antérieure" as a label; in a sentence "vous déteniez déjà cet enregistrement à cette date" (never "possession antérieure", never "propriété") | CTO decision. CPI art. L613-7 "possession personnelle antérieure" is a prior-user right |
| agreements | accords, in every label and in running text ("Contrats" is gone) | CTO decision, 19 Nov 2026 review (B4) |
| the on-chain contract | smart contract on first mention in a paragraph, then contrat | CTO decision; Bpifrance writes "smart contract" (OQLF: "contrat intelligent") |
| claim; the claims contract | preuve; contrat des preuves (never revendication, the patent-claim term) | CTO decision (B5) |
| holder next to rights | détenteur de l’enregistrement (SEMAE uses "détenteur du COV" for the right holder) | 19 Nov 2026 review |
| licence, royalty | licence, redevance | SEMAE: "délivrer des licences", "contrepartie d'une redevance" |
| proof code | code de preuve | — |
| date stamp | horodatage | — |
| backup | sauvegarde, fichier de sauvegarde (not copie de secours) | — |
| lab report | rapport de laboratoire | — |
| accession number | n° d’accession | — |
| the Ask helper | « Demander » | — |
| passkey | clé d’accès | Google French help pages (Apple says "clé d’identification"; the app keeps one word) |
| saved with VeilCore | sauvegardé chez VeilCore | easy mode step 2, 19 Nov 2026 |
| recovery sheet, recovery code | fiche de secours, code de secours | Apple: "clé de secours" |

Register: *vous*. Typography: the typographic apostrophe (’) everywhere, and a space before
`;`, `:`, `?` and `!`.

## Second review (19 November 2026, later the same day)

Two independent passes, one Japanese and one Spanish, then one German and French, read the
strings against the English and the sources above. Every blocker and should-fix item was
applied, with the CTO's decisions on the open glossary questions; the decisions and their
sources are in the tables above. `translations.test.ts` ("the glossary terms stay settled")
fails if a word they took out comes back, on the site (with every mainnet overlay) or in the
app, and checks that Spanish names the registry "servidor de registros" at least as often as
the English says "registry".

## How this review was done (19 November 2026)

1. Every string of the site and the app was checked by script for: placeholders and tags
   against the English, text left in English, the wrong register, Spain-only words in Spanish,
   ownership words, and placeholder fragments at the start of a sentence.
2. Key terms were counted in each language and the minority variants changed to the term
   above.
3. The home page, the record app's home and new record screens, the check page and the backup
   screen were read against the English in each language. The rest of the app (licenses,
   royalties, lab results, documents, import) was covered by steps 1 and 2 only.
4. Screenshots at phone width (390 px) of those screens, in each language with the browser set
   to it, were looked at for text that is cut off or runs off the screen.

What this review is not: a fluent speaker reading every screen. Wording that is correct but
not how a native speaker would put it can remain, most likely on the screens step 3 did not
read. A fluent speaker's corrections are welcome, as in [translations/README.md](translations/README.md).

## Scanning and labels (docs/scan-and-labels.md)

| English | Japanese | Spanish | German | French |
| --- | --- | --- | --- | --- |
| scan | スキャン | escanear | scannen | scanner |
| QR code, barcode | QRコード, バーコード | código QR, código de barras | QR-Code, Barcode | code QR, code-barres |
| label (printed) | ラベル | etiqueta | Etikett | étiquette |
| NFC tag | NFCタグ | etiqueta NFC | NFC-Tag | puce NFC |
| stick reader (ear tags) | スティックリーダー | lector de bastón | Stablesegerät | bâton lecteur |
| check page | 確認ページ | página de comprobación | Prüfseite | page de vérification |
| "Scan to check" (on a label) | スキャンして確認 | Escanee para comprobar | Zum Prüfen scannen | Scanner pour vérifier |
| straw canister | ストローの容器 | recipiente de pajuelas (not "contenedor": it holds "tenedor", which the Spanish check refuses) | Paillettenbehälter | visotube |

## A lab key's identity level (docs/lab-identity-levels.md)

"Verified" (確認済み) only for a match to a public listing; a key on a website is "listed on". Japanese keeps 確認 for verify.

| English | Japanese | Spanish | German | French |
| --- | --- | --- | --- | --- |
| Not verified | 未確認 | No verificada (la clave) | Nicht verifiziert | Non vérifiée (la clé) |
| Listed on {domain} | {domain}に掲載 | Publicada en {domain} | Aufgeführt auf {domain} | Publiée sur {domain} |
| Verified against {listing} | {listing}で確認済み | Verificada con {listing} | Verifiziert anhand von {listing} | Vérifiée auprès de {listing} |
| Withdrawn by website | ウェブサイトが撤回 | Retirada por el sitio web | Von der Website zurückgezogen | Retirée par le site web |
| Not verified: listing match withdrawn | 未確認：公開リストとの照合を取り消し | No verificada: cotejo con listado retirado | Nicht verifiziert: Abgleich mit Verzeichnis zurückgenommen | Non vérifiée : rapprochement avec une liste retiré |
| a key calling itself "X" | 「X」と名乗る鍵 | una clave que se presenta como "X" | ein Schlüssel, der sich „X“ nennt | une clé qui se présente comme « X » |
