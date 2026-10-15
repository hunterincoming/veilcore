// SPDX-License-Identifier: Apache-2.0
import { main } from './cli.js';

void main(process.argv.slice(2)).then((code) => {
  process.exitCode = code;
});
