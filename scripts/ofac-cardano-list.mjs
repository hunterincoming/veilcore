// Refresh the bundled list of OFAC-sanctioned Cardano addresses from OFAC's own file.
//
//   1. Download sdn_advanced.xml from OFAC (the link is in the list file's "source").
//   2. node scripts/ofac-cardano-list.mjs <path to sdn_advanced.xml>
//   3. Read the diff of bboard-ui/src/veilcore/sanctions/ofac-cardano.json, then commit it.
//
// It reads the entries whose feature type is "Digital Currency Address - ADA", as the
// widely used extractor github.com/0xB10C/ofac-sanctioned-digital-currency-addresses does for
// other assets, and the file's date of issue. It never downloads anything itself: the file you
// give it is the one the list says it came from. Nothing here runs in the site.
// SPDX-License-Identifier: Apache-2.0

import { readFile, writeFile } from "node:fs/promises";

const OUT = new URL("../bboard-ui/src/veilcore/sanctions/ofac-cardano.json", import.meta.url);
const FEATURE = "Digital Currency Address - ADA";

/** The ADA addresses in an sdn_advanced.xml, and its date of issue. */
export const extract = (xml) => {
  const type = new RegExp(`<FeatureType\\s+ID="(\\d+)"[^>]*>\\s*${FEATURE}\\s*</FeatureType>`).exec(xml);
  const addresses = [];
  if (type) {
    const feature = new RegExp(`<Feature\\b[^>]*FeatureTypeID="${type[1]}"[^>]*>([\\s\\S]*?)</Feature>`, "g");
    for (const m of xml.matchAll(feature))
      for (const d of m[1].matchAll(/<VersionDetail\b[^>]*>([^<]+)<\/VersionDetail>/g)) addresses.push(d[1].trim());
  }
  const issue = /<DateOfIssue>\s*<Year>(\d{4})<\/Year>\s*<Month>(\d{1,2})<\/Month>\s*<Day>(\d{1,2})<\/Day>/.exec(xml);
  const listIssued = issue ? `${issue[1]}-${issue[2].padStart(2, "0")}-${issue[3].padStart(2, "0")}` : null;
  return { typeFound: Boolean(type), addresses: [...new Set(addresses)].sort(), listIssued };
};

const main = async () => {
  const path = process.argv[2];
  if (!path) {
    console.error("Usage: node scripts/ofac-cardano-list.mjs <path to sdn_advanced.xml>");
    process.exit(2);
  }
  const xml = await readFile(path, "utf8");
  if (!/<Sanctions\b/.test(xml) || !/DistinctParties/.test(xml)) {
    console.error("That doesn't look like OFAC's sdn_advanced.xml.");
    process.exit(1);
  }
  const { typeFound, addresses, listIssued } = extract(xml);
  const before = JSON.parse(await readFile(OUT, "utf8"));
  const today = new Date().toISOString().slice(0, 10);
  const how = typeFound
    ? `Read from OFAC's sdn_advanced.xml (issued ${listIssued ?? "date not found"}) by scripts/ofac-cardano-list.mjs on ${today}: every entry of feature type "${FEATURE}".`
    : `Read from OFAC's sdn_advanced.xml (issued ${listIssued ?? "date not found"}) by scripts/ofac-cardano-list.mjs on ${today}: the file has no feature type "${FEATURE}", so OFAC lists no Cardano addresses.`;
  const out = { ...before, listIssued, extracted: today, how, addresses };
  await writeFile(OUT, JSON.stringify(out, null, 2) + "\n");
  console.log(`${addresses.length} Cardano address(es); list issued ${listIssued ?? "(date not found)"}.`);
};

if (import.meta.url === `file://${process.argv[1]}`) await main();
