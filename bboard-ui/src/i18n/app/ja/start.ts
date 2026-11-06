// 記録アプリ（日本語）：新しい記録の最初の画面（../en/start.ts）。DRAFT: machine-assisted, to be
// checked by a fluent speaker before publishing (docs/translations/README.md).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const start = {
  'app.start.title': '何を証明しますか？',
  'app.start.intro': 'ひとつ選んでください。ほかのものはあとで封印できます。',
  'app.start.plant': '植物',
  'app.start.plantText': '母株、選抜株、クローン、または種子から育成した系統。',
  'app.start.animal': '動物',
  'app.start.animalText': '父、母、またはその他の繁殖用の動物。',
  'app.start.strain': '微生物・細胞株',
  'app.start.strainText': '酵母、細菌、真菌、細胞株、昆虫系統。ラボやカルチャーコレクション向け。',
  'app.start.document': '書類',
  'app.start.documentText': '検査結果、許可証、契約書など。ファイルがお使いの端末から出ることはありません。',
  'app.start.change': '封印するものを変える',
} satisfies Partial<AppTranslation>;
