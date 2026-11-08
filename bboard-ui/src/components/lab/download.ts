// Hand the person a text file their browser saves (a result file, an opening, a CSV).
// SPDX-License-Identifier: Apache-2.0

export const download = (text: string, name: string, mime = 'application/json'): void => {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
