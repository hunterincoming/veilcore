// A model worker starts only under its own Content-Security-Policy (scripts/ask-model-csp.mjs),
// the exact one the site serves with its file. A browser that does not apply a worker's own
// policy, or applies another, would let the worker reach more than it should: there the model
// stays off.
//
// The check makes no request. It tries `eval`, which both worker policies refuse (no
// 'unsafe-eval', and Trusted Types required with no policy), and reads the policy the browser
// names in the violation it reports. Eval running, no report, or a report naming any other
// policy: not in force.
// SPDX-License-Identifier: Apache-2.0

import { downloadWorkerCsp, engineWorkerCsp } from '../../../scripts/ask-model-csp.mjs';
import { MANIFEST } from './manifest';

export const expectedPolicy = (which: 'download' | 'engine'): string =>
  which === 'download' ? downloadWorkerCsp(MANIFEST as never) : engineWorkerCsp();

const same = (a: string, b: string) =>
  a
    .split(';')
    .map((d) => d.trim())
    .filter(Boolean)
    .join('; ') ===
  b
    .split(';')
    .map((d) => d.trim())
    .filter(Boolean)
    .join('; ');

/** Whether this worker runs under the policy the site gives it. */
export const ownPolicyInForce = async (which: 'download' | 'engine'): Promise<boolean> => {
  const scope = globalThis as unknown as {
    addEventListener: (t: string, f: (e: SecurityPolicyViolationEvent) => void) => void;
    removeEventListener: (t: string, f: (e: SecurityPolicyViolationEvent) => void) => void;
  };
  const policies: string[] = [];
  const seen = (e: SecurityPolicyViolationEvent) => policies.push(e.originalPolicy);
  scope.addEventListener('securitypolicyviolation', seen);
  let ran = false;
  try {
    // An indirect eval of a constant: what the policy must refuse.
    (0, eval)('1');
    ran = true;
  } catch {
    /* refused, as it should be */
  }
  // The violation is reported in a task after the refusal.
  for (let i = 0; i < 20 && policies.length === 0; i++) await new Promise((r) => setTimeout(r, 10));
  scope.removeEventListener('securitypolicyviolation', seen);
  const want = expectedPolicy(which);
  return !ran && policies.length > 0 && policies.every((p) => same(p, want));
};
