import prisma from '@/lib/db/index';

export type ReviewTargetType = 'foundation_unit' | 'gate';

export type ReviewScheduleState = {
  repetition: number;
  intervalDays: number;
  dueDate: string;
  state: 'due' | 'scheduled';
};

export type ReviewScheduleView = {
  id: string;
  targetType: ReviewTargetType;
  targetId: string;
  state: string;
  repetition: number;
  intervalDays: number;
  dueDate: string;
  lastEvidenceType: string;
  lastEvidenceId: string;
  lastEvidencePassed: boolean;
  lastEvidenceAt: string | null;
  daysOverdue: number;
};

export const REVIEW_INTERVAL_DAYS = [1, 3, 7, 14, 30] as const;

function dateValue(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

export function addReviewDays(date: string, days: number): string {
  const next = dateValue(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

export function computeNextReviewState(input: {
  passed: boolean;
  today: string;
  previous?: { repetition: number } | null;
}): ReviewScheduleState {
  if (!input.passed) {
    return {
      repetition: 0,
      intervalDays: 0,
      dueDate: input.today,
      state: 'due',
    };
  }
  const repetition = Math.max(1, (input.previous?.repetition || 0) + 1);
  const intervalDays = REVIEW_INTERVAL_DAYS[Math.min(repetition - 1, REVIEW_INTERVAL_DAYS.length - 1)];
  return {
    repetition,
    intervalDays,
    dueDate: addReviewDays(input.today, intervalDays),
    state: 'scheduled',
  };
}

export async function recordReviewEvidence(input: {
  studentId: string;
  curriculumVersion: string;
  targetType: ReviewTargetType;
  targetId: string;
  evidenceType: string;
  evidenceId: string;
  passed: boolean;
  evidenceAt?: Date;
  today: string;
}) {
  const key = {
    studentId_curriculumVersion_targetType_targetId: {
      studentId: input.studentId,
      curriculumVersion: input.curriculumVersion,
      targetType: input.targetType,
      targetId: input.targetId,
    },
  } as const;
  const previous = await prisma.reviewSchedule.findUnique({ where: key });
  const next = computeNextReviewState({
    passed: input.passed,
    today: input.today,
    previous,
  });
  return prisma.reviewSchedule.upsert({
    where: key,
    create: {
      studentId: input.studentId,
      curriculumVersion: input.curriculumVersion,
      targetType: input.targetType,
      targetId: input.targetId,
      state: next.state,
      repetition: next.repetition,
      intervalDays: next.intervalDays,
      dueDate: next.dueDate,
      lastEvidenceType: input.evidenceType,
      lastEvidenceId: input.evidenceId,
      lastEvidencePassed: input.passed,
      lastEvidenceAt: input.evidenceAt || new Date(),
    },
    update: {
      state: next.state,
      repetition: next.repetition,
      intervalDays: next.intervalDays,
      dueDate: next.dueDate,
      lastEvidenceType: input.evidenceType,
      lastEvidenceId: input.evidenceId,
      lastEvidencePassed: input.passed,
      lastEvidenceAt: input.evidenceAt || new Date(),
    },
  });
}

export async function listDueReviews(studentId: string, today: string): Promise<ReviewScheduleView[]> {
  const rows = await prisma.reviewSchedule.findMany({
    where: {
      studentId,
      dueDate: { lte: today },
      state: { in: ['due', 'scheduled'] },
    },
    orderBy: [{ dueDate: 'asc' }, { updatedAt: 'asc' }],
  });
  return rows.map((row) => ({
    id: row.id,
    targetType: row.targetType as ReviewTargetType,
    targetId: row.targetId,
    state: row.state,
    repetition: row.repetition,
    intervalDays: row.intervalDays,
    dueDate: row.dueDate,
    lastEvidenceType: row.lastEvidenceType,
    lastEvidenceId: row.lastEvidenceId,
    lastEvidencePassed: row.lastEvidencePassed,
    lastEvidenceAt: row.lastEvidenceAt?.toISOString() || null,
    daysOverdue: Math.max(
      0,
      Math.floor((dateValue(today).getTime() - dateValue(row.dueDate).getTime()) / 86_400_000)
    ),
  }));
}
