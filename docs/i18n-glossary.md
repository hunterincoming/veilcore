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
| lab report | 検査報告書 (DNA報告書 for a DNA report) | — |
| lab | ラボ | — |
| device | 端末 (not デバイス) | bank app help pages: 機種変更, 端末 |
| we (VeilCore) | 私たち, as the English says "we" (not 当社) | — |
| the Ask helper | 「VeilCoreに聞く」 | — |
| tap | タップ | 77bank app help: 「…をタップし」 |

## Spanish (neutral, reads naturally in Argentina)

| English | Spanish | Source |
| --- | --- | --- |
| record | registro | — |
| holder | titular (never dueño, propietario, propiedad) | site rule. INASE's own "título de propiedad" is a legal title a record is not |
| breeder (plants) | obtentor | INASE: "derecho de obtentor"; Res. 631/1992: "obtentores nacionales y extranjeros" ([argentina.gob.ar](https://www.argentina.gob.ar/normativa/nacional/norma-27578/texto)) |
| breeder (animals) | criador | — |
| variety | variedad, cultivar | INASE cannabis FAQ: "variedades nuevas", "Registro Nacional de Cultivares" ([argentina.gob.ar/inase](https://www.argentina.gob.ar/inase/cultivodecannabis/preguntas-frecuentes-sobre-cannabis)) |
| cutting, clone | esqueje | INASE cannabis FAQ: "esquejes enraizados y plantines" |
| registration (with an office) | inscripción | Res. 631/1992: "Solicitud de Inscripción" |
| licence, royalty | licencia, regalía | — |
| seal, date stamp | sellar, sello de fecha | — |
| proof code | código de prueba | — |
| backup | copia de seguridad (not respaldo) | — |
| locked | bloqueado (not cerrado) | — |
| lab report | informe de laboratorio | — |
| phone, computer | teléfono or celular, computadora (never móvil, ordenador) | Mi Argentina FAQ: "Si te roban o perdés el celular" ([argentina.gob.ar](https://www.argentina.gob.ar/node/152432)) |
| fill in | completar (not rellenar) | — |
| press (a button) | presionar or tocar (not pulsar) | — |
| wallet | billetera (not cartera) | — |
| accession number | n.º de accesión | — |
| the Ask helper | «Preguntar» | — |

Register: *usted*. Argentine government pages use *vos* ("Descargá", "podés"); the founder
chose neutral *usted*, which reads correctly in Argentina and the rest of Latin America.

## German

| English | German | Source |
| --- | --- | --- |
| record | Datensatz | — |
| holder, hold | Inhaber, halten (never Besitz, besitzen, Eigentum) | site rule. SortSchG uses "Sortenschutzinhaber" for the legal holder ([gesetze-im-internet.de](https://www.gesetze-im-internet.de/sortschg_1985/BJNR021700985.html)) |
| breeder | Züchter | SortSchG § 8: "Ursprungszüchter" |
| variety | Sorte | SortSchG § 2 |
| licence | Lizenz (the statute says Nutzungsrecht) | SortSchG § 11 |
| royalty | Lizenzgebühr | — |
| proof code | Prüfcode (not Nachweiscode) | — |
| date stamp | Datumsstempel | — |
| backup | Sicherungskopie; the file: Sicherungsdatei | Sparkasse's app help says "Backup" ([sparkasse.de](https://www.sparkasse.de/pk/produkte/konten-und-karten/finanzen-apps/app-geraetewechsel.html)); Sicherungskopie is the standard German word and the app keeps it |
| phone | Handy (not Telefon for the device; "am Telefon" for a call) | Sparkasse: "neues Handy", "Gerätewechsel" |
| batch (anchoring) | Stapel; a grow batch is Charge | — |
| existed by a date | spätestens an diesem Datum | — |
| the Ask helper | „Fragen“ | — |

Register: *Sie*, as the Sparkasse help pages do.

## French

| English | French | Source |
| --- | --- | --- |
| record | enregistrement | — |
| holder, hold | détenteur, détenir (never propriétaire, posséder, titulaire) | SEMAE: "détenteur du COV" ([semae.fr](https://www.semae.fr/uploads/D1752-FICHE-Pourquoi-la-creation-varietale-doit-elle-etre-protegee.pdf)) |
| breeder | obtenteur (sélectionneur on the public pages, as SEMAE writes "sélectionneur (ou obtenteur)") | SEMAE |
| licence, royalty | licence, redevance | SEMAE: "délivrer des licences", "contrepartie d'une redevance" |
| proof code | code de preuve | — |
| date stamp | horodatage | — |
| backup | sauvegarde, fichier de sauvegarde (not copie de secours) | — |
| lab report | rapport de laboratoire | — |
| accession number | n° d’accession | — |
| the Ask helper | « Demander » | — |

Register: *vous*. Typography: the typographic apostrophe (’) everywhere, and a space before
`;`, `:`, `?` and `!`.

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
