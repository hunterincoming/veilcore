// /privacy and /terms on a copy someone else runs (config/operator.ts SELF_HOSTED): who runs it,
// and links to its own privacy policy and terms. VeilCore's policy and terms describe veilcore.org
// and the people who run it, so a copy never shows them as its own.
//
// Only a self-hosted build reaches this file (veilcore.org's build leaves it out entirely), so its
// words are kept here, in all five languages, rather than in every language file of veilcore.org.
// operator-notice.test.ts checks every language has every line with the same placeholders.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { useI18n, format } from '../../i18n';
import type { Lang } from '../../config/languages';
import { OPERATOR_INFO } from '../../config/operator';

export type NoticeLine =
  | 'privacyTitle'
  | 'termsTitle'
  | 'runBy'
  | 'notVeilcore'
  | 'privacyLink'
  | 'termsLink'
  | 'contact';

export const NOTICE: Record<Lang, Record<NoticeLine, string>> = {
  en: {
    privacyTitle: 'Privacy',
    termsTitle: 'Terms of use',
    runBy:
      'This copy of VeilCore is run by {name}. Your records are kept on its server, and {name} decides what happens to them.',
    notVeilcore:
      'VeilCore wrote the open code this site runs, but VeilCore does not run this site. It can’t see, change or delete what is stored here.',
    privacyLink: 'Read {name}’s privacy policy',
    termsLink: 'Read {name}’s terms of use',
    contact: 'Questions, or to have your data deleted: {email}',
  },
  de: {
    privacyTitle: 'Datenschutz',
    termsTitle: 'Nutzungsbedingungen',
    runBy:
      'Diese Kopie von VeilCore wird von {name} betrieben. Ihre Datensätze liegen auf deren Server, und {name} entscheidet, was mit ihnen geschieht.',
    notVeilcore:
      'VeilCore hat den offenen Code geschrieben, mit dem diese Website läuft, betreibt sie aber nicht. VeilCore kann nicht sehen, ändern oder löschen, was hier gespeichert ist.',
    privacyLink: 'Datenschutzerklärung von {name} lesen',
    termsLink: 'Nutzungsbedingungen von {name} lesen',
    contact: 'Fragen, oder um Ihre Daten löschen zu lassen: {email}',
  },
  es: {
    privacyTitle: 'Privacidad',
    termsTitle: 'Condiciones de uso',
    runBy:
      'Esta copia de VeilCore la gestiona {name}. Sus registros se guardan en su servidor, y {name} decide qué se hace con ellos.',
    notVeilcore:
      'VeilCore escribió el código abierto con el que funciona este sitio, pero VeilCore no lo gestiona. No puede ver, cambiar ni borrar lo que se guarda aquí.',
    privacyLink: 'Leer la política de privacidad de {name}',
    termsLink: 'Leer las condiciones de uso de {name}',
    contact: 'Preguntas, o para que borren sus datos: {email}',
  },
  fr: {
    privacyTitle: 'Confidentialité',
    termsTitle: 'Conditions d’utilisation',
    runBy:
      'Cette copie de VeilCore est gérée par {name}. Vos enregistrements sont conservés sur son serveur, et {name} décide de ce qu’il en advient.',
    notVeilcore:
      'VeilCore a écrit le code ouvert qui fait fonctionner ce site, mais ne le gère pas. VeilCore ne peut ni voir, ni modifier, ni supprimer ce qui est conservé ici.',
    privacyLink: 'Lire la politique de confidentialité de {name}',
    termsLink: 'Lire les conditions d’utilisation de {name}',
    contact: 'Questions, ou pour faire supprimer vos données : {email}',
  },
  ja: {
    privacyTitle: 'プライバシー',
    termsTitle: '利用規約',
    runBy:
      'このVeilCoreのコピーは{name}が運営しています。記録は{name}のサーバーに保存され、その扱いは{name}が決めます。',
    notVeilcore:
      'このサイトで動いているオープンなコードはVeilCoreが書いたものですが、このサイトをVeilCoreは運営していません。ここに保存されたものをVeilCoreが見たり、変えたり、消したりすることはできません。',
    privacyLink: '{name}のプライバシーポリシーを読む',
    termsLink: '{name}の利用規約を読む',
    contact: 'お問い合わせ、またはデータの削除のご依頼：{email}',
  },
};

export const OperatorNotice: React.FC<{ kind: 'privacy' | 'terms' }> = ({ kind }) => {
  const { lang } = useI18n();
  const w = NOTICE[lang] ?? NOTICE.en;
  const vars = { name: OPERATOR_INFO.name, email: OPERATOR_INFO.email };
  const url = kind === 'privacy' ? OPERATOR_INFO.privacyUrl : OPERATOR_INFO.termsUrl;
  return (
    <>
      <header className="wrap page">
        <h1>{kind === 'privacy' ? w.privacyTitle : w.termsTitle}</h1>
        <p>{format(w.runBy, vars)}</p>
      </header>
      <section className="privacy-note" data-operator-notice={kind}>
        <div className="wrap">
          <p style={{ marginBottom: '1em' }}>
            <a href={url} rel="noopener">
              {format(kind === 'privacy' ? w.privacyLink : w.termsLink, vars)}
            </a>
          </p>
          <p style={{ marginBottom: '1em' }}>{w.notVeilcore}</p>
          <p className="privacy-contact">
            <a href={`mailto:${OPERATOR_INFO.email}`}>{format(w.contact, vars)}</a>
          </p>
        </div>
      </section>
    </>
  );
};
