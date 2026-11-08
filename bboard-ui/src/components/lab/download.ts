// Hand the person a file their browser saves (a result file, a sequence file, a CSV, a zip).
// SPDX-License-Identifier: Apache-2.0

export const download = (content: string | Uint8Array, name: string, mime = 'application/json'): void => {
  const url = URL.createObjectURL(new Blob([content as BlobPart], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/** A file name made only of safe characters, from what the lab typed. */
export const fileSafe = (s: string): string => s.replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 60) || 'result';

/**
 * One file name per result, from its accession, sample and (for a panel) target, unique within
 * the set: each result goes to its own client, so no file ever holds two clients' results.
 */
export const resultFileNames = (
  statements: readonly { accession: string; sampleId: string; result?: unknown }[],
): string[] => {
  const used = new Set<string>();
  return statements.map((s) => {
    const target = (s.result as { target?: string } | undefined)?.target;
    const base = fileSafe([s.accession, s.sampleId, target].filter(Boolean).join('-'));
    let name = `${base}.veilcore-result.json`;
    for (let i = 2; used.has(name); i++) name = `${base}-${i}.veilcore-result.json`;
    used.add(name);
    return name;
  });
};
