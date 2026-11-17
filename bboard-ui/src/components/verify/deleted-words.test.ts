// A deleted record's check page: a checked date only for the link's own code (VerifyPage passes
// none otherwise), and before/after the deletion only when the times or the registry say so.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { deletedDateKey } from './deleted-words';

const deletedAt = '2026-11-17T15:30:00.000Z';

describe('a deleted record’s date', () => {
  it('a checked block before the deletion minute is before; a minute or more after is after', () => {
    expect(deletedDateKey({ checkedBlockTime: '2026-11-17T15:29:59Z', anchored: true, deletedAt })).toBe(
      'app.verify.deleted.datedChecked',
    );
    expect(deletedDateKey({ checkedBlockTime: '2026-11-17T15:31:00Z', anchored: true, deletedAt })).toBe(
      'app.verify.deleted.datedCheckedAfter',
    );
  });

  it('a checked block in the deletion’s own minute says neither, whatever the registry answers', () => {
    const inMinute = { checkedBlockTime: '2026-11-17T15:30:20Z', anchored: true, deletedAt };
    expect(deletedDateKey(inMinute)).toBe('app.verify.deleted.datedCheckedPlain');
    expect(deletedDateKey({ ...inMinute, relative: 'after' })).toBe('app.verify.deleted.datedCheckedPlain');
    expect(deletedDateKey({ ...inMinute, relative: 'before' })).toBe('app.verify.deleted.datedCheckedPlain');
  });

  it('without a check, the registry’s report, never more', () => {
    expect(deletedDateKey({ anchored: false, deletedAt })).toBe('app.verify.deleted.notDated');
    expect(deletedDateKey({ anchored: true, deletedAt, relative: 'before' })).toBe('app.verify.deleted.datedReported');
    expect(deletedDateKey({ anchored: true, deletedAt, relative: 'after' })).toBe(
      'app.verify.deleted.datedReportedAfter',
    );
    expect(deletedDateKey({ anchored: true, deletedAt })).toBe('app.verify.deleted.datedReportedPlain');
  });
});
