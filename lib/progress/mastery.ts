import prisma from '@/lib/db/index';
import { STAGE_LABELS } from '@/lib/adaptive/stage';
import { buildTodaySteps } from '@/lib/learning/path';
import { stepsFingerprint } from '@/lib/learning/today-progress';
import { getDailyProgress, resolveProgressDate } from '@/lib/progress/daily';
import { buildGatesDashboard } from '@/lib/labs';
import { getStudentStats } from '@/lib/db/student';
import { buildFoundationDashboard } from '@/lib/foundation/units';
import { weakPointsToRecommendedUnit } from '@/lib/assess/diagnostic';

export type EvidenceState = 'viewed' | 'personal_done' | 'mastered' | 'missing';

export type DashboardCondition = {
  id: string;
  label: string;
  state: EvidenceState;
  evidence: string;
};

function parseWeakPoints(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export async function buildStudentDashboard(studentId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      assessments: { orderBy: { assessedAt: 'desc' }, take: 1 },
      learningPlan: true,
    },
  });
  if (!student) return null;

  const stats = await getStudentStats(studentId);
  const weakPoints = parseWeakPoints(student.weakPoints);
  const gatesDashboard = await buildGatesDashboard(studentId);
  const foundationDashboard = await buildFoundationDashboard(studentId);
  const masteredGates = gatesDashboard.gates.filter((g) => g.progress.status === 'passed');
  const recommendedUnitId = weakPointsToRecommendedUnit(weakPoints);
  const recommendedFoundationUnit =
    foundationDashboard.units.find((item) => item.unit.id === recommendedUnitId) ||
    foundationDashboard.units.find((item) => item.status !== 'mastered') ||
    null;
  const nextGate =
    gatesDashboard.gates.find((g) => g.progress.status === 'unlocked') ||
    gatesDashboard.gates.find((g) => g.progress.status === 'locked') ||
    null;

  const planTasks = (() => {
    try {
      return student.learningPlan?.dailyTasks
        ? JSON.parse(student.learningPlan.dailyTasks)
        : [];
    } catch {
      return [];
    }
  })();

  const todaySteps = buildTodaySteps({
    totalQuestions: stats.totalQuestions,
    weakPoints,
    currentStage: student.currentStage,
    hasPlan: Array.isArray(planTasks) && planTasks.length > 0,
  });
  const fingerprint = stepsFingerprint({
    currentStage: student.currentStage,
    totalQuestions: stats.totalQuestions,
    weakPoints,
    stepIds: todaySteps.map((s) => s.id),
  });
  const dailyProgress = await getDailyProgress({
    studentId,
    date: resolveProgressDate(),
    fingerprint,
  });

  const latestAssessment = student.assessments[0] || null;
  const assessmentMastered =
    latestAssessment &&
    latestAssessment.theory >= 80 &&
    latestAssessment.coding >= 80 &&
    latestAssessment.rust >= 80;

  const conditions: DashboardCondition[] = [
    {
      id: 'diagnostic',
      label: '导学诊断/小测证据',
      state: assessmentMastered ? 'mastered' : latestAssessment ? 'viewed' : 'missing',
      evidence: latestAssessment
        ? `最近：理论 ${latestAssessment.theory} / 编码 ${latestAssessment.coding} / Rust ${latestAssessment.rust}`
        : '尚无服务端测评记录',
    },
    {
      id: 'daily-personal',
      label: '今日个人待办',
      state: dailyProgress.done.length > 0 ? 'personal_done' : 'missing',
      evidence: `${dailyProgress.done.length}/${todaySteps.length} 项 personal_done；不作为晋级证据`,
    },
    {
      id: 'foundation-units',
      label: '导学微单元',
      state: foundationDashboard.allRequiredMastered
        ? 'mastered'
        : foundationDashboard.masteredRequired > 0
          ? 'personal_done'
          : 'missing',
      evidence: `${foundationDashboard.masteredRequired}/${foundationDashboard.requiredTotal} 个必修微单元达到 ${foundationDashboard.quizPolicy.defaultRequiredCorrectRate}% 小测要求`,
    },
    {
      id: 'oj-gates',
      label: '实验/OJ 关卡',
      state: masteredGates.length > 0 ? 'mastered' : 'missing',
      evidence: `${masteredGates.length}/${gatesDashboard.gates.length} 个 gate 已 AC/passed`,
    },
  ];

  const primaryTask = nextGate
    ? {
        id: `gate:${nextGate.id}`,
        title:
          nextGate.progress.status === 'locked'
            ? `等待解锁：${nextGate.title}`
            : `完成关卡：${nextGate.title}`,
        mode: 'lab',
        evidenceRequired: '只有 OJ verdict=AC 才能标记 mastered',
      }
    : todaySteps[0]
      ? {
          id: todaySteps[0].id,
          title: todaySteps[0].title,
          mode: todaySteps[0].mode,
          evidenceRequired: '完成个人任务只记录 personal_done',
        }
      : null;

  return {
    student: {
      id: student.id,
      name: student.name,
      currentStage: student.currentStage,
      stageLabel: STAGE_LABELS[student.currentStage] || student.currentStage,
      weakPoints,
    },
    stats,
    dailyProgress,
    foundation: {
      version: foundationDashboard.version,
      masteredRequired: foundationDashboard.masteredRequired,
      requiredTotal: foundationDashboard.requiredTotal,
      allRequiredMastered: foundationDashboard.allRequiredMastered,
      recommendedUnit: recommendedFoundationUnit
        ? {
            id: recommendedFoundationUnit.unit.id,
            title: recommendedFoundationUnit.unit.title,
            status: recommendedFoundationUnit.status,
            objective: recommendedFoundationUnit.unit.objective,
            evidence: recommendedFoundationUnit.evidence,
          }
        : null,
    },
    todaySteps,
    primaryTask,
    conditions,
    gates: gatesDashboard.gates.map((g) => ({
      id: g.id,
      title: g.title,
      stageIds: g.stageIds,
      judgeKind: g.judgeKind,
      status: g.progress.status,
      mastered: g.progress.status === 'passed',
      evidence: g.progress.bestVerdict || null,
    })),
  };
}
