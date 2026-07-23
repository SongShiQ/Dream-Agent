import prisma from '@/lib/db/index';
import { recordReviewEvidence, type ReviewTargetType } from './review-scheduler';

export type HistoricalReviewEvidence = {
  studentId: string;
  curriculumVersion: string;
  targetType: ReviewTargetType;
  targetId: string;
  evidenceType: string;
  evidenceId: string;
  passed: boolean;
  evidenceAt: Date;
};

type FoundationEvidenceRow = {
  id: string;
  studentId: string;
  curriculumVersion: string;
  unitId: string;
  mode: string;
  status: string;
  submittedAt: Date | null;
};

type GateEvidenceRow = {
  id: string;
  studentId: string;
  gateId: string;
  verdict: string;
  createdAt: Date;
  student: { curriculumVersion: string };
};

function evidenceKey(item: Pick<HistoricalReviewEvidence, 'studentId' | 'curriculumVersion' | 'targetType' | 'targetId'>) {
  return `${item.studentId}\u0000${item.curriculumVersion}\u0000${item.targetType}\u0000${item.targetId}`;
}

export function selectLatestHistoricalEvidence(input: {
  foundationAttempts: FoundationEvidenceRow[];
  gateSubmissions: GateEvidenceRow[];
}): HistoricalReviewEvidence[] {
  const candidates: HistoricalReviewEvidence[] = [];
  for (const attempt of input.foundationAttempts) {
    if (
      attempt.mode !== 'high_stakes' ||
      !attempt.submittedAt ||
      !['passed', 'failed'].includes(attempt.status)
    ) continue;
    candidates.push({
      studentId: attempt.studentId,
      curriculumVersion: attempt.curriculumVersion,
      targetType: 'foundation_unit',
      targetId: attempt.unitId,
      evidenceType: 'foundation_high_stakes_backfill',
      evidenceId: attempt.id,
      passed: attempt.status === 'passed',
      evidenceAt: attempt.submittedAt,
    });
  }
  for (const submission of input.gateSubmissions) {
    if (submission.verdict !== 'AC' || !submission.gateId) continue;
    candidates.push({
      studentId: submission.studentId,
      curriculumVersion: submission.student.curriculumVersion,
      targetType: 'gate',
      targetId: submission.gateId,
      evidenceType: 'judge_ac_backfill',
      evidenceId: submission.id,
      passed: true,
      evidenceAt: submission.createdAt,
    });
  }

  const latest = new Map<string, HistoricalReviewEvidence>();
  for (const candidate of candidates) {
    const key = evidenceKey(candidate);
    const previous = latest.get(key);
    if (!previous || candidate.evidenceAt > previous.evidenceAt) latest.set(key, candidate);
  }
  return [...latest.values()].sort((a, b) => {
    const byStudent = a.studentId.localeCompare(b.studentId);
    return byStudent || a.targetType.localeCompare(b.targetType) || a.targetId.localeCompare(b.targetId);
  });
}

export async function buildReviewBackfillPlan(opts?: { cohortId?: string }) {
  const studentWhere = opts?.cohortId ? { student: { cohortId: opts.cohortId } } : {};
  const [foundationAttempts, gateSubmissions, existing] = await Promise.all([
    prisma.foundationQuizAttempt.findMany({
      where: {
        ...studentWhere,
        mode: 'high_stakes',
        status: { in: ['passed', 'failed'] },
        submittedAt: { not: null },
      },
      select: {
        id: true,
        studentId: true,
        curriculumVersion: true,
        unitId: true,
        mode: true,
        status: true,
        submittedAt: true,
      },
    }),
    prisma.codeSubmission.findMany({
      where: { ...studentWhere, verdict: 'AC', gateId: { not: '' } },
      select: {
        id: true,
        studentId: true,
        gateId: true,
        verdict: true,
        createdAt: true,
        student: { select: { curriculumVersion: true } },
      },
    }),
    prisma.reviewSchedule.findMany({
      where: opts?.cohortId ? { student: { cohortId: opts.cohortId } } : undefined,
      select: {
        studentId: true,
        curriculumVersion: true,
        targetType: true,
        targetId: true,
      },
    }),
  ]);
  const existingKeys = new Set(
    existing.map((item) =>
      evidenceKey({
        studentId: item.studentId,
        curriculumVersion: item.curriculumVersion,
        targetType: item.targetType as ReviewTargetType,
        targetId: item.targetId,
      })
    )
  );
  const selected = selectLatestHistoricalEvidence({ foundationAttempts, gateSubmissions });
  return selected.filter((item) => !existingKeys.has(evidenceKey(item)));
}

export async function applyReviewBackfill(plan: HistoricalReviewEvidence[]) {
  let applied = 0;
  let skipped = 0;
  for (const item of plan) {
    const where = {
      studentId_curriculumVersion_targetType_targetId: {
        studentId: item.studentId,
        curriculumVersion: item.curriculumVersion,
        targetType: item.targetType,
        targetId: item.targetId,
      },
    } as const;
    if (await prisma.reviewSchedule.findUnique({ where })) {
      skipped++;
      continue;
    }
    await recordReviewEvidence({
      ...item,
      today: item.evidenceAt.toISOString().slice(0, 10),
    });
    applied++;
  }
  return { applied, skipped };
}
