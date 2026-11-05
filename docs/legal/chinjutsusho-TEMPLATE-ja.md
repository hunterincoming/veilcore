# 陳述書（ひな形・草案）

**これは見本の文章です。法的助言ではありません。日本語を母語とする方の確認と、事件を担当する
弁護士による修正を経てから使ってください。** (Draft. Needs a native Japanese reviewer and the
case's lawyer before anyone uses it.)

## これは何のためのものか（英語の説明）

VeilCore's evidence bundle carries a declaration in the US federal form (28 U.S.C. 1746).
A Japanese court expects a witness statement (陳述書), in Japanese (民事訴訟規則 138条:
documents in a foreign language need a Japanese translation), and gives weight to a
document carrying the person's own seal or electronic signature (民事訴訟法 228条4項;
電子署名法 3条). From 1 December 2026 the amended Seed Act (種苗法) presumes seed sold under
a registered variety's name is that variety, so a defendant who says otherwise needs dated
evidence of what they had, and when. An outside review of the evidence path (5 November
2026) found no Japanese-ready statement in VeilCore.

This is the holder's statement. Facts from the bundle go in the brackets; the holder writes
everything else in their own words. Attachments are numbered as the party's exhibits
(甲号証 for the plaintiff, 乙号証 for the defendant).

---

令和〔　〕年〔　〕月〔　〕日

〔　〕地方裁判所　御中

陳　述　書

住所　〔　〕
氏名　〔　〕　㊞

第１　私について

１　私は、〔職業。例：〇〇の育種家／〇〇県で〇〇を栽培する者〕です。〔経歴を簡潔に〕

第２　本件の〔植物／動物〕について

１　〔品種名・系統名・個体識別番号〕（以下「本件〔　〕」といいます。）は、私が〔年月〕から
　〔場所〕で〔育成／保有〕しているものです。

２　その来歴は次のとおりです。〔交配の親、入手先と時期、増殖の経過を、自分の言葉で時系列に〕

第３　記録の作成について

１　私は、〔年月日〕、VeilCore（ベールコア）というソフトウェアを使い、本件〔　〕について
　記録を作成しました。記録の内容は〔記録に書いた項目。例：名称、親、入手日、写真〕です。

２　VeilCoreでは、記録の内容は私の端末の中に保存され、VeilCoreのサーバーには記録から計算した
　「指紋」（SHA-256による値）だけが送られます。遺伝情報そのものは送られません。

３　この記録の指紋は〔64桁の値〕であり、乙第〔　〕号証の記録ファイルから誰でも同じ値を
　計算し直すことができます。

第４　記録の日時について

１　この指紋は、VeilCoreのバッチ〔バッチ番号〕に含まれています。バッチの値（ルート）は〔64桁〕
　です（乙第〔　〕号証）。

２　このルートについては、次の三つの方法で日時が付けられています。

　(1) ビットコイン：OpenTimestamps により、ビットコインのブロック〔高さ〕（〔日時・UTC〕）に
　　記録されています（乙第〔　〕号証）。VeilCoreがなくなっても、公開の道具で確認できます。

　(2) タイムスタンプ局（RFC 3161）：〔事業者名〕が〔日時〕付けで発行したタイムスタンプトークンが
　　あります（乙第〔　〕号証）。〔認定タイムスタンプである場合はその旨と確認した日〕

　(3) Midnight：Midnight ネットワークの取引〔取引ハッシュ〕（ブロック〔高さ〕、〔日時・UTC〕）に
　　記録されています（乙第〔　〕号証）。

３　これらは、遅くともその日時に本件の記録が存在したことを示すものです。記録に書いた内容が
　正しいことや、私が本件〔　〕の権利者であることを示すものではありません。記録の内容は、
　私が上記第２で述べたとおりです。

第５　検査機関の結果について（ある場合）

１　〔検査機関名〕は、〔日付〕、本件〔　〕の試料について〔検査の種類〕を行いました。試料は
　〔誰が、いつ、どのように採取し封をしたか〕。結果は乙第〔　〕号証のとおりです。

２　〔検査機関が VeilCore 上で署名している場合〕その署名は、同機関の鍵によるもので、
　〔同機関のウェブサイト〔ドメイン〕がその鍵を掲載していること／VeilCoreの運営者が〔日付〕に
　名称を照合したこと〕を確認できます。VeilCore は検査機関の作業を保証しません。

第６　添付資料

　乙第〔　〕号証　記録ファイル（VeilCore 証拠一式。各ファイルの SHA-256 は別紙のとおり）
　乙第〔　〕号証　〔root.bin、root.bin.ots、root.tst〕
　乙第〔　〕号証　〔検査結果〕

以上のとおり相違ありません。

以上

---

**注（英語）**

- 乙 is the defendant's exhibit mark; a plaintiff uses 甲 instead.
- Keep it in the holder's own words; a court discounts a statement that reads as written by
  someone else. The headings are only a common shape for a 陳述書.
- Use "prior possession" (先に保有していたこと), never ownership (所有権・権利者).
- A registry operator's statement on how the registry works is
  `operator-certification-TEMPLATE.md` (to be put into Japanese by a translator if used).
- Sources: 民事訴訟規則 138条; 民事訴訟法 228条4項; 電子署名法 3条; 種苗法 (2026 amendment,
  MAFF Q&A, `docs/evidence-in-practice.md`).

**これは見本の文章です。法的助言ではありません。**
