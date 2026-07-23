import { describe, expect, it } from 'vitest';
import { addReviewDays, computeNextReviewState } from '@/lib/progress/review-scheduler';

describe('deterministic review scheduler', () => {
  it('schedules passing evidence at 1/3/7/14/30 day intervals', () => {
    const today = '2026-07-19';
    expect(computeNextReviewState({ passed: true, today })).toMatchObject({
      repetition: 1,
      intervalDays: 1,
      dueDate: '2026-07-20',
    });
    expect(
      computeNextReviewState({ passed: true, today, previous: { repetition: 1 } })
    ).toMatchObject({ repetition: 2, intervalDays: 3, dueDate: '2026-07-22' });
    expect(
      computeNextReviewState({ passed: true, today, previous: { repetition: 5 } })
    ).toMatchObject({ repetition: 6, intervalDays: 30, dueDate: '2026-08-18' });
  });

  it('makes failed evidence due immediately without granting repetition credit', () => {
    expect(
      computeNextReviewState({
        passed: false,
        today: '2026-07-19',
        previous: { repetition: 4 },
      })
    ).toEqual({
      repetition: 0,
      intervalDays: 0,
      dueDate: '2026-07-19',
      state: 'due',
    });
  });

  it('uses calendar dates across month boundaries', () => {
    expect(addReviewDays('2026-07-30', 3)).toBe('2026-08-02');
  });
});
