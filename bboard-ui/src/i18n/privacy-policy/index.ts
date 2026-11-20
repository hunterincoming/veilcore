// The privacy policy's words: the English source and the type every translation must fill
// (privacy-policy/<lang>.ts, spread into each language's pack; components/site/PrivacyPolicy.tsx).
// SPDX-License-Identifier: Apache-2.0
import type { policyEn } from './en';

export type PolicyKey = keyof typeof policyEn;
/** Every key, in every language: a missing one is a type error, not English showing through. */
export type PolicyStrings = Record<PolicyKey, string>;
