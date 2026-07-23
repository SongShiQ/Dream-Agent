import { describe, expect, it } from 'vitest';
import { selectLatestHistoricalEvidence } from '@/lib/progress/review-backfill';

describe('review schedule historical backfill', () => {
  it('keeps only the latest high-stakes evidence per student and target', () => {
    const selected = selectLatestHistoricalEvidence({
      foundationAttempts: [
        {
          id: 'old',
          studentId: 's1',
          curriculumVersion: 'v1',
          unitId: 'memory',
          mode: 'high_stakes',
          status: 'failed',
          submittedAt: new Date('2026-07-01T00:00:00Z'),
        },
        {
          id: 'new',
          studentId: 's1',
          curriculumVersion: 'v1',
          unitId: 'memory',
          mode: 'high_stakes',
          status: 'passed',
          submittedAt: new Date('2026-07-02T00:00:00Z'),
        },
        {
          id: 'practice',
          studentId: 's1',
          curriculumVersion: 'v1',
          unitId: 'memory',
          mode: 'practice',
          status: 'passed',
          submittedAt: new Date('2026-07-03T00:00:00Z'),
        },
      ],
      gateSubmissions: [],
    });
    expect(selected).toHaveLength(1);
    expect(selected[0]).toMatchObject({ evidenceId: 'new', passed: true });
  });

  it('includes only AC gate evidence and preserves curriculum version', () => {
    const selected = selectLatestHistoricalEvidence({
      foundationAttempts: [],
      gateSubmissions: [
        {
          id: 'wa',
          studentId: 's1',
          gateId: 'lab2',
          verdict: 'WA',
          createdAt: new Date('2026-07-01T00:00:00Z'),
          student: { curriculumVersion: 'v1' },
        },
        {
          id: 'ac',
          studentId: 's1',
          gateId: 'lab2',
          verdict: 'AC',
          createdAt: new Date('2026-07-02T00:00:00Z'),
          student: { curriculumVersion: 'v2' },
        },
      ],
    });
    expect(selected).toEqual([
      expect.objectContaining({ evidenceId: 'ac', targetType: 'gate', curriculumVersion: 'v2' }),
    ]);
  });
});
