import { describe, expect, it } from 'vitest';
import {
  isFinalJudgeVerdict,
  planJudgeJobAfterRun,
  truncateJudgeLog,
  verdictCanPassGate,
} from '@/lib/judge/state';
import { completeJudgeJobFromWorker } from '@/lib/judge/worker';

describe('judge state helpers', () => {
  it('only AC can pass gate', () => {
    expect(verdictCanPassGate('AC')).toBe(true);
    expect(verdictCanPassGate('WA')).toBe(false);
    expect(verdictCanPassGate('STATIC')).toBe(false);
    expect(verdictCanPassGate('PENDING')).toBe(false);
  });

  it('separates final verdicts from pending/static', () => {
    expect(isFinalJudgeVerdict('AC')).toBe(true);
    expect(isFinalJudgeVerdict('SE')).toBe(true);
    expect(isFinalJudgeVerdict('PENDING')).toBe(false);
    expect(isFinalJudgeVerdict('STATIC')).toBe(false);
  });

  it('truncates public logs', () => {
    const log = 'x'.repeat(20);
    expect(truncateJudgeLog(log, 10)).toBe('xxxxxxxxxx\n...[truncated]');
  });

  it('rejects non-final worker verdicts before touching persistence', async () => {
    await expect(
      completeJudgeJobFromWorker({
        jobId: 'not-used',
        verdict: 'PENDING',
        publicLog: '',
      })
    ).resolves.toEqual({ error: 'INVALID_FINAL_VERDICT:PENDING' });
  });

  it('requeues SE before max attempts without passing submission', () => {
    expect(planJudgeJobAfterRun({ verdict: 'SE', attemptsBefore: 0, maxAttempts: 2 })).toEqual({
      attemptsAfter: 1,
      shouldRetry: true,
      jobStatus: 'queued',
      submissionVerdict: 'PENDING',
      submissionPassed: false,
      runStatus: 'system_error',
    });
  });

  it('finalizes SE when retry budget is exhausted', () => {
    expect(planJudgeJobAfterRun({ verdict: 'SE', attemptsBefore: 1, maxAttempts: 2 })).toEqual({
      attemptsAfter: 2,
      shouldRetry: false,
      jobStatus: 'completed',
      submissionVerdict: 'SE',
      submissionPassed: false,
      runStatus: 'system_error',
    });
  });

  it('finalizes AC as passed', () => {
    expect(planJudgeJobAfterRun({ verdict: 'AC', attemptsBefore: 0, maxAttempts: 2 })).toEqual({
      attemptsAfter: 1,
      shouldRetry: false,
      jobStatus: 'completed',
      submissionVerdict: 'AC',
      submissionPassed: true,
      runStatus: 'completed',
    });
  });
});
