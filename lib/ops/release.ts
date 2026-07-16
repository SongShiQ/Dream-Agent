import prisma from '@/lib/db/index';
import { buildJudgeMetrics } from '@/lib/judge/metrics';
import { buildRiskQueue, type RiskItem } from '@/lib/ops/risk';

export type ReleaseStage = 'pilot_30' | 'foundation_200' | 'onboarding_2000';

export type CohortFunnelStats = {
  cohortId: string;
  students: number;
  diagnosticDone: number;
  foundationStarted: number;
  foundationPassedStudents: number;
  unitOjStarted: number;
  allUnitGatesPassed: number;
  projectCandidates: number;
};

export type ReleaseDecision = {
  target: ReleaseStage;
  decision: 'go' | 'hold';
  blockers: string[];
  checks: Array<{
    id: string;
    label: string;
    status: 'pass' | 'fail' | 'warn';
    evidence: string;
  }>;
};

type JudgeMetricsLike = Awaited<ReturnType<typeof buildJudgeMetrics>>;

const UNIT_GATE_IDS = [
  'env-setup',
  'rustlings-variables',
  'rustlings-move',
  'rust-result',
  'basic-syscall-model',
];

export function computeReleaseDecision(opts: {
  target: ReleaseStage;
  funnel: CohortFunnelStats;
  riskItems: RiskItem[];
  metrics: JudgeMetricsLike;
  dockerVerified?: boolean;
}): ReleaseDecision {
  const highOpenRisks = opts.riskItems.filter(
    (risk) => risk.severity === 'high' && (risk.resolution?.status || 'open') === 'open'
  );
  const mediumOpenRisks = opts.riskItems.filter(
    (risk) => risk.severity === 'medium' && (risk.resolution?.status || 'open') === 'open'
  );
  const queuedP95 = opts.metrics.jobs.queuedAgeMs.p95 || 0;
  const runP95 = opts.metrics.runs.timeMs.p95 || 0;
  const verdicts = opts.metrics.runs.byVerdict;
  const seRuns = verdicts.SE || 0;
  const totalRuns = Math.max(1, opts.metrics.runs.total);
  const seRate = seRuns / totalRuns;

  const checks: ReleaseDecision['checks'] = [
    {
      id: 'no_open_high_risk',
      label: '高优先级风险清零',
      status: highOpenRisks.length === 0 ? 'pass' : 'fail',
      evidence: `${highOpenRisks.length} 个 open high 风险`,
    },
    {
      id: 'medium_risk_capacity',
      label: '中优先级风险在 TA 容量内',
      status: mediumOpenRisks.length <= 20 ? 'pass' : 'warn',
      evidence: `${mediumOpenRisks.length} 个 open medium 风险`,
    },
    {
      id: 'queue_latency',
      label: '队列等待 p95 不积压',
      status: queuedP95 < 10 * 60 * 1000 ? 'pass' : queuedP95 < 30 * 60 * 1000 ? 'warn' : 'fail',
      evidence: `queued age p95=${Math.round(queuedP95 / 1000)}s`,
    },
    {
      id: 'run_latency',
      label: '判题执行 p95 可接受',
      status: runP95 < 60 * 1000 ? 'pass' : runP95 < 180 * 1000 ? 'warn' : 'fail',
      evidence: `run time p95=${Math.round(runP95 / 1000)}s`,
    },
    {
      id: 'system_error_rate',
      label: 'SE 比例可解释',
      status: seRate <= 0.02 ? 'pass' : seRate <= 0.05 ? 'warn' : 'fail',
      evidence: `SE ${seRuns}/${opts.metrics.runs.total}`,
    },
    {
      id: 'no_expired_lease',
      label: '无过期 running lease',
      status: opts.metrics.jobs.expiredLeases === 0 ? 'pass' : 'fail',
      evidence: `${opts.metrics.jobs.expiredLeases} 个 expired lease`,
    },
    {
      id: 'docker_verified',
      label: 'Linux Docker worker 实机验证',
      status: opts.dockerVerified ? 'pass' : 'warn',
      evidence: opts.dockerVerified ? '已完成 Docker worker 验证' : '本地未证明生产 Docker worker',
    },
  ];

  if (opts.target !== 'pilot_30') {
    checks.push({
      id: 'pilot_signal',
      label: '已有足够内测样本',
      status: opts.funnel.students >= 30 ? 'pass' : 'warn',
      evidence: `${opts.funnel.students} 名 cohort 学员`,
    });
  }

  if (opts.target === 'onboarding_2000') {
    checks.push(
      {
        id: 'foundation_signal',
        label: '基础组样本足够',
        status: opts.funnel.students >= 200 ? 'pass' : 'warn',
        evidence: `${opts.funnel.students} 名 cohort 学员`,
      },
      {
        id: 'unit_gate_completion_signal',
        label: 'unit gate 完成样本可复盘',
        status: opts.funnel.allUnitGatesPassed >= 30 ? 'pass' : 'warn',
        evidence: `${opts.funnel.allUnitGatesPassed} 人五个 unit gate 全部通过`,
      }
    );
  }

  const blockers = checks
    .filter((check) => check.status === 'fail')
    .map((check) => `${check.label}：${check.evidence}`);

  return {
    target: opts.target,
    decision: blockers.length === 0 ? 'go' : 'hold',
    blockers,
    checks,
  };
}

export function releaseSnapshotToMarkdown(snapshot: {
  generatedAt: string;
  target: ReleaseStage;
  funnel: CohortFunnelStats;
  decision: ReleaseDecision;
}) {
  const lines = [
    `# OpenCamp M5 灰度验收快照`,
    ``,
    `- 生成时间：${snapshot.generatedAt}`,
    `- cohort：${snapshot.funnel.cohortId}`,
    `- 目标阶段：${snapshot.target}`,
    `- 结论：${snapshot.decision.decision === 'go' ? 'GO' : 'HOLD'}`,
    ``,
    `## 漏斗`,
    ``,
    `| 指标 | 数值 |`,
    `|---|---:|`,
    `| 学员数 | ${snapshot.funnel.students} |`,
    `| 完成诊断 | ${snapshot.funnel.diagnosticDone} |`,
    `| 开始导学微单元 | ${snapshot.funnel.foundationStarted} |`,
    `| 有微单元达标记录 | ${snapshot.funnel.foundationPassedStudents} |`,
    `| 开始 unit OJ | ${snapshot.funnel.unitOjStarted} |`,
    `| 五个 unit gate 全部通过 | ${snapshot.funnel.allUnitGatesPassed} |`,
    `| 项目候选 | ${snapshot.funnel.projectCandidates} |`,
    ``,
    `## 放量检查`,
    ``,
    `| 检查 | 状态 | 证据 |`,
    `|---|---|---|`,
    ...snapshot.decision.checks.map((check) => `| ${check.label} | ${check.status} | ${check.evidence} |`),
  ];

  if (snapshot.decision.blockers.length > 0) {
    lines.push(``, `## 阻塞项`, ``);
    for (const blocker of snapshot.decision.blockers) {
      lines.push(`- ${blocker}`);
    }
  }

  return lines.join('\n');
}

export async function buildReleaseSnapshot(opts: {
  cohortId?: string;
  target?: ReleaseStage;
  dockerVerified?: boolean;
}) {
  const cohortId = opts.cohortId || '2026-summer-os-main';
  const target = opts.target || 'foundation_200';
  const [students, diagnosticDone, foundationStartedRows, foundationPassedRows, unitOjStartedRows, allGateRows] =
    await Promise.all([
      prisma.student.findMany({
        where: { cohortId },
        select: { id: true, learningStatus: true },
        take: 5000,
      }),
      prisma.assessment.groupBy({
        by: ['studentId'],
        where: { student: { cohortId } },
      }),
      prisma.foundationQuizAttempt.groupBy({
        by: ['studentId'],
        where: { student: { cohortId } },
      }),
      prisma.foundationQuizAttempt.groupBy({
        by: ['studentId'],
        where: { student: { cohortId }, status: 'passed' },
      }),
      prisma.codeSubmission.groupBy({
        by: ['studentId'],
        where: { student: { cohortId }, judgeKind: 'unit_oj' },
      }),
      prisma.labGateProgress.findMany({
        where: {
          student: { cohortId },
          gateId: { in: UNIT_GATE_IDS },
          status: 'passed',
        },
        select: { studentId: true, gateId: true },
      }),
    ]);

  const gateSetByStudent = new Map<string, Set<string>>();
  for (const row of allGateRows) {
    const set = gateSetByStudent.get(row.studentId) || new Set<string>();
    set.add(row.gateId);
    gateSetByStudent.set(row.studentId, set);
  }

  const funnel: CohortFunnelStats = {
    cohortId,
    students: students.length,
    diagnosticDone: diagnosticDone.length,
    foundationStarted: foundationStartedRows.length,
    foundationPassedStudents: foundationPassedRows.length,
    unitOjStarted: unitOjStartedRows.length,
    allUnitGatesPassed: [...gateSetByStudent.values()].filter((set) =>
      UNIT_GATE_IDS.every((gateId) => set.has(gateId))
    ).length,
    projectCandidates: students.filter((student) =>
      ['project_candidate', 'project_confirmed'].includes(student.learningStatus)
    ).length,
  };
  const [metrics, riskQueue] = await Promise.all([
    buildJudgeMetrics(),
    buildRiskQueue({ cohortId, status: 'all', severity: 'all' }),
  ]);
  const decision = computeReleaseDecision({
    target,
    funnel,
    metrics,
    riskItems: riskQueue.items,
    dockerVerified: opts.dockerVerified,
  });

  return {
    generatedAt: new Date().toISOString(),
    target,
    funnel,
    metrics,
    riskQueue,
    decision,
  };
}

