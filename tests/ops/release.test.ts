import { describe, expect, it } from 'vitest';
import { computeReleaseDecision, releaseSnapshotToMarkdown } from '@/lib/ops/release';

const baseMetrics = {
  generatedAt: new Date().toISOString(),
  jobs: {
    total: 0,
    byStatus: {},
    expiredLeases: 0,
    retryingSystemErrors: 0,
    queuedAgeMs: { p50: null, p95: 1000 },
  },
  runs: {
    total: 100,
    byVerdict: { AC: 95, WA: 5 },
    byStatus: { completed: 100 },
    timeMs: { p50: 500, p95: 1000 },
    memoryKb: { p50: 1000, p95: 2000 },
  },
};

const baseFunnel = {
  cohortId: 'cohort-a',
  students: 200,
  diagnosticDone: 180,
  foundationStarted: 160,
  foundationPassedStudents: 120,
  unitOjStarted: 80,
  allUnitGatesPassed: 35,
  projectCandidates: 20,
};

describe('ops release snapshot', () => {
  it('holds release when high risks or expired leases exist', () => {
    const decision = computeReleaseDecision({
      target: 'foundation_200',
      funnel: baseFunnel,
      metrics: {
        ...baseMetrics,
        jobs: { ...baseMetrics.jobs, expiredLeases: 1 },
      },
      riskItems: [
        {
          id: 'system:judge_expired_lease',
          kind: 'judge_expired_lease',
          severity: 'high',
          title: '存在过期 running lease',
          evidence: '1 个 running job lease 已过期',
          nextAction: '检查 worker',
        },
      ],
      dockerVerified: true,
    });

    expect(decision.decision).toBe('hold');
    expect(decision.blockers).toEqual(
      expect.arrayContaining([
        expect.stringContaining('高优先级风险清零'),
        expect.stringContaining('无过期 running lease'),
      ])
    );
  });

  it('allows release with warnings but no hard blockers', () => {
    const decision = computeReleaseDecision({
      target: 'foundation_200',
      funnel: { ...baseFunnel, students: 12 },
      metrics: baseMetrics,
      riskItems: [],
      dockerVerified: false,
    });

    expect(decision.decision).toBe('go');
    expect(decision.checks.find((check) => check.id === 'docker_verified')?.status).toBe('warn');
    expect(decision.checks.find((check) => check.id === 'pilot_signal')?.status).toBe('warn');
  });

  it('renders a markdown release snapshot', () => {
    const decision = computeReleaseDecision({
      target: 'onboarding_2000',
      funnel: baseFunnel,
      metrics: baseMetrics,
      riskItems: [],
      dockerVerified: true,
    });
    const markdown = releaseSnapshotToMarkdown({
      generatedAt: '2026-07-14T08:00:00.000Z',
      target: 'onboarding_2000',
      funnel: baseFunnel,
      decision,
    });

    expect(markdown).toContain('OpenCamp M5 灰度验收快照');
    expect(markdown).toContain('| 五个 unit gate 全部通过 | 35 |');
    expect(markdown).toContain('目标阶段：onboarding_2000');
  });
});

