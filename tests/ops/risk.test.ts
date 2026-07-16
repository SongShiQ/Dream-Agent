import { describe, expect, it } from 'vitest';
import { computeStudentRisks, computeSystemRisks, filterRiskItems, riskItemsToCsv } from '@/lib/ops/risk';

describe('ops risk queue', () => {
  it('flags repeated non-AC submissions', () => {
    const risks = computeStudentRisks({
      studentId: 's1',
      studentName: 'Ada',
      cohortId: 'cohort-a',
      hasAssessment: true,
      submissions: [
        { gateId: 'rust-result', verdict: 'WA', createdAt: new Date() },
        { gateId: 'rust-result', verdict: 'CE', createdAt: new Date() },
        { gateId: 'rust-result', verdict: 'WA', createdAt: new Date() },
      ],
      foundationAttempts: [],
    });
    expect(risks[0]).toMatchObject({
      kind: 'student_repeated_non_ac',
      severity: 'medium',
      studentId: 's1',
      cohortId: 'cohort-a',
    });
  });

  it('flags repeated foundation failures', () => {
    const risks = computeStudentRisks({
      studentId: 's1',
      studentName: 'Ada',
      hasAssessment: true,
      submissions: [],
      foundationAttempts: [
        { unitId: 'rust-basics', status: 'failed', mode: 'high_stakes', submittedAt: new Date() },
        { unitId: 'rust-basics', status: 'failed', mode: 'high_stakes', submittedAt: new Date() },
      ],
    });
    expect(risks[0].kind).toBe('foundation_repeated_fail');
  });

  it('flags system judge risks from metrics', () => {
    const risks = computeSystemRisks({
      generatedAt: new Date().toISOString(),
      jobs: {
        total: 3,
        byStatus: { queued: 2, running: 1 },
        expiredLeases: 1,
        retryingSystemErrors: 1,
        queuedAgeMs: { p50: 1000, p95: 31 * 60 * 1000 },
      },
      runs: {
        total: 0,
        byVerdict: {},
        byStatus: {},
        timeMs: { p50: null, p95: null },
        memoryKb: { p50: null, p95: null },
      },
    });
    expect(risks.map((risk) => risk.kind)).toEqual([
      'judge_expired_lease',
      'judge_queue_backlog',
      'judge_se_retry',
    ]);
    expect(risks[1].severity).toBe('high');
  });

  it('filters risks by severity, status, and cohort', () => {
    const items = [
      {
        id: 'system:judge_queue_backlog',
        kind: 'judge_queue_backlog',
        severity: 'high' as const,
        title: '队列积压',
        evidence: 'queued p95 too high',
        nextAction: '扩容 worker',
      },
      {
        id: 'student:s1:repeated_non_ac:rust-result',
        kind: 'student_repeated_non_ac',
        severity: 'medium' as const,
        title: '连续非 AC',
        evidence: 'WA/CE/WA',
        nextAction: 'TA 介入',
        studentId: 's1',
        studentName: 'Ada',
        cohortId: 'cohort-a',
        resolution: {
          status: 'acknowledged',
          note: '',
          handledBy: 'ta',
          updatedAt: new Date().toISOString(),
        },
      },
    ];

    expect(filterRiskItems(items, { severity: 'medium', status: 'acknowledged', cohortId: 'cohort-a' })).toEqual([
      items[1],
    ]);
    expect(filterRiskItems(items, { status: 'open' })).toEqual([items[0]]);
  });

  it('exports risk items as escaped CSV', () => {
    const csv = riskItemsToCsv([
      {
        id: 'student:s1:foundation',
        kind: 'foundation_repeated_fail',
        severity: 'medium',
        title: '导学微单元多次未达标',
        evidence: 'Ada 说 "题目不清楚"',
        nextAction: '检查题目歧义',
        studentId: 's1',
        studentName: 'Ada',
        cohortId: 'cohort-a',
      },
    ]);

    expect(csv).toContain('"cohortId"');
    expect(csv).toContain('"Ada 说 ""题目不清楚"""');
  });
});
