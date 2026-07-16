import prisma from '@/lib/db/index';
import { buildJudgeMetrics } from '@/lib/judge/metrics';

export type RiskSeverity = 'high' | 'medium' | 'low';

export type RiskItem = {
  id: string;
  kind: string;
  severity: RiskSeverity;
  title: string;
  evidence: string;
  nextAction: string;
  studentId?: string;
  studentName?: string;
  cohortId?: string;
  resolution?: {
    status: string;
    note: string;
    handledBy: string;
    updatedAt: string;
  };
};

type SubmissionRow = {
  gateId: string;
  verdict: string;
  createdAt: Date;
};

type FoundationAttemptRow = {
  unitId: string;
  status: string;
  mode: string;
  submittedAt: Date | null;
};

export function computeStudentRisks(input: {
  studentId: string;
  studentName: string;
  cohortId?: string;
  submissions: SubmissionRow[];
  foundationAttempts: FoundationAttemptRow[];
  hasAssessment: boolean;
  now?: Date;
}): RiskItem[] {
  const risks: RiskItem[] = [];
  const recentFinal = input.submissions
    .filter((s) => !['AC', 'PENDING', 'STATIC', 'SE'].includes(s.verdict))
    .slice(0, 5);
  if (recentFinal.length >= 3) {
    const firstThree = recentFinal.slice(0, 3);
    const sameGate = firstThree.every((s) => s.gateId === firstThree[0].gateId);
    risks.push({
      id: `student:${input.studentId}:repeated_non_ac:${firstThree[0].gateId}`,
      kind: 'student_repeated_non_ac',
      severity: 'medium',
      title: '连续非 AC 提交',
      evidence: `${input.studentName} 最近 ${firstThree.length} 次非 AC：${firstThree
        .map((s) => `${s.gateId}/${s.verdict}`)
        .join('、')}`,
      nextAction: sameGate
        ? `TA 主动检查 ${firstThree[0].gateId} 的代码与题意理解`
        : 'TA 查看错因分布，优先引导公开样例和知识卡',
      studentId: input.studentId,
      studentName: input.studentName,
      cohortId: input.cohortId,
    });
  }

  const failedHighStakes = input.foundationAttempts
    .filter((a) => a.mode === 'high_stakes' && a.status === 'failed')
    .slice(0, 3);
  if (failedHighStakes.length >= 2) {
    risks.push({
      id: `student:${input.studentId}:foundation_repeated_fail:${failedHighStakes[0].unitId}`,
      kind: 'foundation_repeated_fail',
      severity: 'medium',
      title: '导学微单元多次未达标',
      evidence: `${input.studentName} 最近 ${failedHighStakes.length} 次 high-stakes 小测失败：${failedHighStakes
        .map((a) => a.unitId)
        .join('、')}`,
      nextAction: '推送对应知识卡，必要时检查题目歧义或换等价题集',
      studentId: input.studentId,
      studentName: input.studentName,
      cohortId: input.cohortId,
    });
  }

  if (!input.hasAssessment && input.submissions.length === 0 && input.foundationAttempts.length === 0) {
    risks.push({
      id: `student:${input.studentId}:no_diagnostic`,
      kind: 'no_diagnostic',
      severity: 'low',
      title: '尚未完成入口诊断',
      evidence: `${input.studentName} 没有诊断、小测或提交记录`,
      nextAction: '引导先完成 12 题诊断，生成推荐微单元',
      studentId: input.studentId,
      studentName: input.studentName,
      cohortId: input.cohortId,
    });
  }

  return risks;
}

export function computeSystemRisks(metrics: Awaited<ReturnType<typeof buildJudgeMetrics>>): RiskItem[] {
  const risks: RiskItem[] = [];
  if (metrics.jobs.expiredLeases > 0) {
    risks.push({
      id: 'system:judge_expired_lease',
      kind: 'judge_expired_lease',
      severity: 'high',
      title: '存在过期 running lease',
      evidence: `${metrics.jobs.expiredLeases} 个 running job lease 已过期`,
      nextAction: '检查/重启 worker；确认 Docker host 与数据库连接',
    });
  }
  const queuedP95 = metrics.jobs.queuedAgeMs.p95 || 0;
  if (queuedP95 >= 10 * 60 * 1000) {
    risks.push({
      id: 'system:judge_queue_backlog',
      kind: 'judge_queue_backlog',
      severity: queuedP95 >= 30 * 60 * 1000 ? 'high' : 'medium',
      title: '判题队列等待时间过长',
      evidence: `queued age p95=${Math.round(queuedP95 / 1000)}s`,
      nextAction: '暂停放量，增加 worker 或检查长任务/卡死任务',
    });
  }
  if (metrics.jobs.retryingSystemErrors > 0) {
    risks.push({
      id: 'system:judge_se_retry',
      kind: 'judge_se_retry',
      severity: 'medium',
      title: '存在系统错误重试中的判题任务',
      evidence: `${metrics.jobs.retryingSystemErrors} 个 job 正在等待 SE 重试`,
      nextAction: '查看 worker 和 Docker 日志；若集中在某 gate，回滚题包',
    });
  }
  return risks;
}

function severityRank(severity: RiskSeverity) {
  return severity === 'high' ? 0 : severity === 'medium' ? 1 : 2;
}

export type RiskQueueFilters = {
  severity?: RiskSeverity | 'all';
  status?: 'open' | 'acknowledged' | 'resolved' | 'ignored' | 'all';
  cohortId?: string;
};

function normalizeResolutionStatus(item: RiskItem) {
  return item.resolution?.status || 'open';
}

export function filterRiskItems(items: RiskItem[], filters: RiskQueueFilters = {}) {
  return items.filter((item) => {
    if (filters.severity && filters.severity !== 'all' && item.severity !== filters.severity) {
      return false;
    }
    if (
      filters.status &&
      filters.status !== 'all' &&
      normalizeResolutionStatus(item) !== filters.status
    ) {
      return false;
    }
    if (filters.cohortId && item.cohortId !== filters.cohortId) {
      return false;
    }
    return true;
  });
}

function csvCell(value: unknown) {
  const text = value == null ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function riskItemsToCsv(items: RiskItem[]) {
  const headers = [
    'id',
    'kind',
    'severity',
    'status',
    'cohortId',
    'studentId',
    'studentName',
    'title',
    'evidence',
    'nextAction',
    'handledBy',
    'updatedAt',
  ];
  const rows = items.map((item) => [
    item.id,
    item.kind,
    item.severity,
    normalizeResolutionStatus(item),
    item.cohortId || '',
    item.studentId || '',
    item.studentName || '',
    item.title,
    item.evidence,
    item.nextAction,
    item.resolution?.handledBy || '',
    item.resolution?.updatedAt || '',
  ]);
  return [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
}

export async function buildRiskQueue(filters: RiskQueueFilters = {}) {
  const metrics = await buildJudgeMetrics();
  const students = await prisma.student.findMany({
    where: filters.cohortId ? { cohortId: filters.cohortId } : undefined,
    orderBy: { updatedAt: 'desc' },
    take: 200,
    include: {
      assessments: { orderBy: { assessedAt: 'desc' }, take: 1 },
      codeSubmissions: {
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: { gateId: true, verdict: true, createdAt: true },
      },
      foundationQuizAttempts: {
        orderBy: [{ submittedAt: 'desc' }, { startedAt: 'desc' }],
        take: 8,
        select: { unitId: true, status: true, mode: true, submittedAt: true },
      },
    },
  });

  const computedItems = [
    ...computeSystemRisks(metrics),
    ...students.flatMap((student) =>
      computeStudentRisks({
        studentId: student.id,
        studentName: student.name,
        cohortId: student.cohortId,
        submissions: student.codeSubmissions,
        foundationAttempts: student.foundationQuizAttempts,
        hasAssessment: student.assessments.length > 0,
      })
    ),
  ];
  const resolutions = await prisma.riskResolution.findMany({
    where: { riskId: { in: computedItems.map((item) => item.id) } },
  });
  const resolutionMap = new Map(resolutions.map((resolution) => [resolution.riskId, resolution]));
  const sortedItems = computedItems
    .map((item) => {
      const resolution = resolutionMap.get(item.id);
      if (!resolution) return item;
      return {
        ...item,
        resolution: {
          status: resolution.status,
          note: resolution.note,
          handledBy: resolution.handledBy,
          updatedAt: resolution.updatedAt.toISOString(),
        },
      };
    })
    .sort((a, b) => {
      const statusA = a.resolution?.status || 'open';
      const statusB = b.resolution?.status || 'open';
      if (statusA !== statusB) {
        if (statusA === 'open') return -1;
        if (statusB === 'open') return 1;
      }
      return severityRank(a.severity) - severityRank(b.severity);
    });
  const items = filterRiskItems(sortedItems, filters);

  return {
    generatedAt: new Date().toISOString(),
    filters,
    total: items.length,
    bySeverity: {
      high: items.filter((item) => item.severity === 'high').length,
      medium: items.filter((item) => item.severity === 'medium').length,
      low: items.filter((item) => item.severity === 'low').length,
    },
    items,
  };
}

export async function updateRiskResolution(opts: {
  riskId: string;
  status: 'open' | 'acknowledged' | 'resolved' | 'ignored';
  note?: string;
  handledBy?: string;
}) {
  return prisma.riskResolution.upsert({
    where: { riskId: opts.riskId },
    create: {
      riskId: opts.riskId,
      status: opts.status,
      note: opts.note || '',
      handledBy: opts.handledBy || '',
    },
    update: {
      status: opts.status,
      note: opts.note || '',
      handledBy: opts.handledBy || '',
    },
  });
}
