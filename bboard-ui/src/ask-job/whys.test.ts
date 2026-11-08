// Why a records step waits, in the words the page uses (verification W6, S5).
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { CANT_CHECK, NO_KEY, NOT_NOTED, waitWords } from './whys';
import { NOT_WRITTEN } from '../veilcore/bulk-import';

describe('the reason a records step waits', () => {
  it('each reason its own words', () => {
    expect(waitWords(CANT_CHECK)).toBe('cantCheck');
    expect(waitWords(NOT_NOTED)).toBe('notNoted');
    expect(waitWords(NO_KEY)).toBe('noKey');
    expect(waitWords(NOT_WRITTEN)).toBe('full');
    // The registry didn't answer: offline.
    expect(
      waitWords(
        "Couldn't reach VeilCore's server. The last 2 rows were kept here and will be sent again, as the same records.",
      ),
    ).toBe('records');
    expect(
      waitWords('Too many requests. The last row was kept here and will be sent again, as the same records.'),
    ).toBe('records');
    // A lock, a thrown error, the page left: couldn't save here, will try again.
    expect(waitWords('Stopped. Pick it up again any time.')).toBe('local');
    expect(waitWords('Web Locks unavailable')).toBe('local');
  });
});
