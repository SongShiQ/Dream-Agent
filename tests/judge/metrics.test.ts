import { describe, expect, it } from 'vitest';
import { computeJudgeMetrics } from '@/lib/judge/metrics';

describe('computeJudgeMetrics', () => {
  it('aggregates queue and run health', () => {
    const now = new Date('2026-07-14T08:00:00.000Z');
    const metrics = computeJudgeMetrics({
      now,
      jobs: [
        {
          status: 'queued',
          attempts: 0,
          maxAttempts: 2,
          leaseUntil: null,
          createdAt: new Date('2026-07-14T07:59:50.000Z'),
          updatedAt: now,
        },
        {
          status: 'running',
          attempts: 0,
          maxAttempts: 2,
          leaseUntil: new Date('2026-07-14T07:59:00.000Z'),
          createdAt: new Date('2026-07-14T07:58:00.000Z'),
          updatedAt: now,
        },
        {
          status: 'queued',
          attempts: 1,
          maxAttempts: 2,
          leaseUntil: null,
          createdAt: new Date('2026-07-14T07:59:00.000Z'),
          updatedAt: now,
        },
      ],
      runs: [
        {
          verdict: 'AC',
          status: 'completed',
          timeMs: 100,
          memoryKb: 1000,
          startedAt: now,
          finishedAt: now,
        },
        {
          verdict: 'SE',
          status: 'system_error',
          timeMs: 300,
          memoryKb: 2000,
          startedAt: now,
          finishedAt: now,
        },
      ],
    });

    expect(metrics.jobs.byStatus).toEqual({ queued: 2, running: 1 });
    expect(metrics.jobs.expiredLeases).toBe(1);
    expect(metrics.jobs.retryingSystemErrors).toBe(1);
    expect(metrics.jobs.queuedAgeMs.p95).toBe(60000);
    expect(metrics.runs.byVerdict).toEqual({ AC: 1, SE: 1 });
    expect(metrics.runs.byStatus).toEqual({ completed: 1, system_error: 1 });
    expect(metrics.runs.timeMs.p95).toBe(300);
  });
});
