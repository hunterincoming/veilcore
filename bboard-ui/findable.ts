// Being found: the files search engines and AI assistants read, written at build time
// (vite.config.ts, plugin `veilcore-findable`).
//
// veilcore.org: robots.txt names the sitemap; sitemap.xml lists the public pages; llms.txt is a
// plain summary with links to the documents as Markdown (the llms.txt convention,
// https://llmstxt.org); llms-full.txt carries the documents themselves, for assistants that
// read one file and don't run the site's script. index.html also carries who VeilCore is as
// schema.org data (Organization, WebSite), which search engines read and nothing executes.
//
// Every other build (the test site, previews, the e2e build) asks not to be indexed: robots.txt
// disallows everything and index.html says noindex, so practice records and a test network's
// wording never compete with veilcore.org in search.
//
// Facts here are the same as the site's own (SUMMARY in vite.config.ts): what VeilCore is, that
// a record shows prior possession and not ownership, that it tests no DNA, that there is no
// token and no formal audit, and whether licenses are on (AGREEMENTS_LIVE in config/copy.ts,
// read here so this file can't say otherwise).
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const SITE = 'https://veilcore.org';

/** The public pages, in the order a sitemap lists them. Pages that hold a person's records aren't here. */
export const SITE_PAGES = [
  '/',
  '/founders',
  '/docs/spec',
  '/docs/evidence',
  '/docs/integrate',
  '/implementations',
  '/partners',
  '/verify/example',
  '/check-this-site',
  '/privacy',
  '/terms',
] as const;

const SDK_RAW = 'https://raw.githubusercontent.com/hunterincoming/veilcore-sdk/main';
const APP_RAW = 'https://raw.githubusercontent.com/hunterincoming/veilcore/main';

/** Whether licenses are on at veilcore.org, as the app's own switch says. */
export const agreementsLive = (root: string): boolean =>
  /export const AGREEMENTS_LIVE\s*=\s*true\b/.test(readFileSync(resolve(root, 'src/config/copy.ts'), 'utf8'));

const status = (live: boolean): string[] => [
  "- On Midnight's main network since 8 October 2026: records are sealed in the browser and batches of proof codes are anchored every hour. VeilCore pays the network fee; no wallet or account is needed.",
  live
    ? '- Licenses: a breeder licenses a record to a grower on Midnight, with royalty statements and payments signed by both sides, royalties on declared offspring, handing a license on with the breeder’s approval, and lenders’ claims. VeilCore records obligations and never holds money.'
    : '- Licenses and royalties are built and run on the test site (test.veilcore.org); on veilcore.org they are switched off until a final test run.',
  '- No formal security audit yet. The adversarial reviews are public in the code repository.',
  '- No token. VeilCore has never sold a token, coin or presale.',
];

/** llms.txt: what VeilCore is, in plain words, and where to read more (Markdown links). */
export const llmsTxt = (live: boolean): string =>
  [
    '# VeilCore',
    '',
    '> An open record format and a service on Midnight for dated, private records of plant and animal genetics. A breeder or lab proves what they held and when, without showing the genetics. Checking a record is free, offline-capable and needs no account.',
    '',
    'A record is sealed in the browser. Only a 32-byte proof code is dated on Midnight, in a batch with others; the details stay locked and DNA files never leave the device. Later a buyer, examiner or court can check what the record said and when it existed.',
    '',
    'What it is not: a record shows prior possession of a description by a date, not ownership. VeilCore does not test DNA and does not vouch for any record, holder or lab. A parent link means both holders agreed, not a genetic test.',
    '',
    'Who it is for: plant breeders, seed companies, tissue-culture and testing labs, animal breeders and herd books, seed certifiers and variety examiners, and lenders or buyers who need to check a breeder’s records.',
    '',
    ...status(live),
    '',
    '## Documents',
    '',
    `- [The record format (specification)](${SDK_RAW}/SPEC.md): record structure, canonical serialization, commitments, anchoring, corrections, attester identity, verification.`,
    `- [Records in evidence](${SDK_RAW}/EVIDENCE.md): what a party can establish with a record, how it is authenticated, and what it does not prove. For counsel.`,
    `- [Integrating VeilCore](${SDK_RAW}/INTEGRATING.md): adding commitments to software a lab or registry already runs. No account, server or key.`,
    `- [Licenses and royalties](${APP_RAW}/docs/agreements-live.md): how licenses, royalty statements, payments, offspring royalties, handing a license on and lenders' claims work.`,
    `- [Lending against a license or record](${APP_RAW}/docs/partners/lenders.md): what a lender can check, and recording a claim only the lender can release.`,
    `- [Calling the contracts from your own systems](${APP_RAW}/docs/PARTNERS.md): the partner kit, @veilcore/contracts on npm.`,
    `- [Design and verifier rules](${APP_RAW}/docs/design.md): the contract, the trust model and its known limits.`,
    '',
    '## Code',
    '',
    '- [veilcore](https://github.com/hunterincoming/veilcore): the Compact contracts on Midnight, the web app, the CLI. Apache-2.0.',
    '- [veilcore-sdk](https://github.com/hunterincoming/veilcore-sdk): the open record format, conformance vectors, and the TypeScript reference implementation (npm: veilcore-records; check a record with `npx veilcore-records verify record.json`).',
    '- [veilcore-rs](https://github.com/hunterincoming/veilcore-rs): a Rust implementation that passes the same vectors.',
    '',
    '## Optional',
    '',
    `- [Who runs VeilCore](${SITE}/founders): Mako Steiner (CEO, Tokyo) and Hunter Roberts (COO, New Jersey).`,
    `- [Everything in one file](${SITE}/llms-full.txt): this summary followed by the three documents above.`,
    '',
  ].join('\n');

/** llms-full.txt: the summary, then the specification, the evidence guide and the integration guide. */
export const llmsFullTxt = (root: string, live: boolean): string => {
  const doc = (f: string) => readFileSync(resolve(root, 'src/docs', f), 'utf8').trim();
  return [
    llmsTxt(live).trim(),
    '',
    '---',
    '',
    doc('SPEC.md'),
    '',
    '---',
    '',
    doc('EVIDENCE.md'),
    '',
    '---',
    '',
    doc('INTEGRATING.md'),
    '',
  ].join('\n');
};

export const sitemapXml = (): string =>
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...SITE_PAGES.map((p) => `  <url><loc>${SITE}${p}</loc></url>`),
    '</urlset>',
    '',
  ].join('\n');

export const robotsTxt = (indexed: boolean): string =>
  indexed ? `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n';

/** Who VeilCore is, as schema.org data in index.html. A data block: browsers never run it. */
export const structuredData = (): string =>
  JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE}/#org`,
        name: 'VeilCore',
        url: `${SITE}/`,
        logo: `${SITE}/icon.png`,
        description:
          'An open record format and a service on Midnight for dated, private records of plant and animal genetics.',
        email: 'hunter@veilcore.org',
        founder: [
          { '@type': 'Person', name: 'Makoto Steiner', jobTitle: 'Co-Founder & CEO' },
          { '@type': 'Person', name: 'Hunter Roberts', jobTitle: 'Co-Founder & COO' },
        ],
        sameAs: ['https://github.com/hunterincoming/veilcore', 'https://x.com/VeilCoreProof'],
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE}/#site`,
        name: 'VeilCore',
        url: `${SITE}/`,
        publisher: { '@id': `${SITE}/#org` },
      },
    ],
  });
