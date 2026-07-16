import path from 'node:path';
import { readFile } from 'node:fs/promises';
import type { Question } from '@prisma/client';
import prisma from '@/lib/db/index';
import { gradeAnswer, parseJsonArray } from '@/lib/exam/grade';
import { resolveProgressDate } from '@/lib/progress/daily';

export type FoundationUnit = {
  id: string;
  title: string;
  objective: string;
  estimatedMinutes: number;
  required: boolean;
  readingTags: string[];
  quizTags: string[];
  requiredCorrectRate: number;
  unlockAfter: string[];
  qualifiesFor: string[];
};

export type FoundationContent = {
  version: string;
  status: string;
  quizPolicy: {
    defaultRequiredCorrectRate: number;
    alternateSetRequiredAfterFailure: boolean;
    highStakesAttemptsPerDay: number;
    masterySource: string;
  };
  units: FoundationUnit[];
};

export type FoundationUnitProgress = {
  unit: FoundationUnit;
  status: 'locked' | 'missing' | 'in_progress' | 'mastered';
  correct: number;
  total: number;
  correctRate: number;
  evidence: string;
  lastAttemptId?: string;
};

type AttemptSummary = {
  id?: string;
  unitId: string;
  status: string;
  correct: number;
  total: number;
  correctRate: number;
  submittedAt?: Date | null;
};

const CURRICULUM_VERSION = '2026-summer-os';
const FOUNDATION_FILE = path.join(
  process.cwd(),
  'data',
  'curriculum',
  CURRICULUM_VERSION,
  'foundation-units.json'
);

let cachedContent: FoundationContent | null = null;

export async function loadFoundationContent(): Promise<FoundationContent> {
  if (cachedContent) return cachedContent;
  const raw = await readFile(FOUNDATION_FILE, 'utf8');
  const parsed = JSON.parse(raw) as FoundationContent;
  cachedContent = parsed;
  return parsed;
}

function matchesAnyTag(question: Pick<Question, 'knowledgePoints'>, tags: string[]): boolean {
  const wanted = new Set(tags.map((tag) => tag.toLowerCase()));
  return parseJsonArray(question.knowledgePoints).some((kp) => wanted.has(kp.toLowerCase()));
}

export function computeFoundationProgress(
  units: FoundationUnit[],
  attempts: AttemptSummary[]
): FoundationUnitProgress[] {
  const statusById = new Map<string, FoundationUnitProgress['status']>();

  return units.map((unit) => {
    const prerequisitesMet = unit.unlockAfter.every((id) => statusById.get(id) === 'mastered');
    const unitAttempts = attempts
      .filter((attempt) => attempt.unitId === unit.id && attempt.status !== 'in_progress')
      .sort((a, b) => Number(b.submittedAt || 0) - Number(a.submittedAt || 0));
    const passed = unitAttempts.find((attempt) => attempt.status === 'passed');
    const latest = unitAttempts[0];
    const correct = latest?.correct ?? 0;
    const total = latest?.total ?? 0;
    const correctRate = latest?.correctRate ?? 0;
    const status: FoundationUnitProgress['status'] = !prerequisitesMet
      ? 'locked'
      : passed
        ? 'mastered'
        : !latest
        ? 'missing'
        : 'in_progress';

    statusById.set(unit.id, status);

    return {
      unit,
      status,
      correct,
      total,
      correctRate,
      evidence:
        status === 'locked'
          ? `需先完成：${unit.unlockAfter.join('、')}`
          : !latest
            ? '尚无微单元小测 attempt'
            : `${correct}/${total} 正确，正确率 ${correctRate}%（要求 ${unit.requiredCorrectRate}%）`,
      lastAttemptId: latest?.id,
    };
  });
}

export function findFoundationUnit(content: FoundationContent, unitId: string): FoundationUnit | null {
  return content.units.find((unit) => unit.id === unitId) || null;
}

export async function pickFoundationQuestions(unit: FoundationUnit, count = 5, excludeIds: string[] = []) {
  const exclude = new Set(excludeIds);
  const candidates = await prisma.question.findMany({ take: 500 });
  const matched = candidates.filter(
    (question) => !exclude.has(question.id) && matchesAnyTag(question, unit.quizTags)
  );
  const source = matched.length >= count ? matched : candidates.filter((q) => !exclude.has(q.id));
  return [...source]
    .sort((a, b) => b.difficulty - a.difficulty + (Math.random() - 0.5))
    .slice(0, count);
}

export async function startFoundationQuizAttempt({
  studentId,
  unitId,
  highStakes = true,
}: {
  studentId: string;
  unitId: string;
  highStakes?: boolean;
}) {
  const content = await loadFoundationContent();
  const unit = findFoundationUnit(content, unitId);
  if (!unit) {
    return { error: 'FOUNDATION_UNIT_NOT_FOUND' as const };
  }

  const attemptDate = resolveProgressDate();
  const mode = highStakes ? 'high_stakes' : 'practice';
  if (highStakes) {
    const todayCount = await prisma.foundationQuizAttempt.count({
      where: { studentId, unitId, mode, attemptDate },
    });
    if (todayCount >= content.quizPolicy.highStakesAttemptsPerDay) {
      return { error: 'HIGH_STAKES_LIMIT_REACHED' as const };
    }
  }

  const previousFailed = await prisma.foundationQuizAttempt.findFirst({
    where: { studentId, unitId, mode: 'high_stakes', status: 'failed' },
    orderBy: { submittedAt: 'desc' },
  });
  const excludeIds =
    content.quizPolicy.alternateSetRequiredAfterFailure && previousFailed
      ? parseJsonArray(previousFailed.questionIds)
      : [];
  const questions = await pickFoundationQuestions(unit, 5, excludeIds);
  if (questions.length === 0) {
    return { error: 'QUESTION_SET_EMPTY' as const };
  }

  const attempt = await prisma.foundationQuizAttempt.create({
    data: {
      studentId,
      unitId,
      curriculumVersion: content.version,
      mode,
      questionIds: JSON.stringify(questions.map((question) => question.id)),
      requiredCorrectRate: unit.requiredCorrectRate,
      attemptDate,
    },
  });

  return { attempt, questions };
}

export async function submitFoundationQuizAttempt({
  studentId,
  attemptId,
  answers,
}: {
  studentId: string;
  attemptId: string;
  answers: { questionId: string; answer: string }[];
}) {
  const attempt = await prisma.foundationQuizAttempt.findFirst({
    where: { id: attemptId, studentId },
  });
  if (!attempt) return { error: 'ATTEMPT_NOT_FOUND' as const };
  if (attempt.status !== 'in_progress') return { error: 'ATTEMPT_ALREADY_SUBMITTED' as const };

  const questionIds = parseJsonArray(attempt.questionIds);
  const allowed = new Set(questionIds);
  const normalizedAnswers = answers.filter((answer) => allowed.has(answer.questionId));
  const questions = await prisma.question.findMany({ where: { id: { in: questionIds } } });
  const answerMap = new Map(normalizedAnswers.map((answer) => [answer.questionId, answer.answer]));
  let correct = 0;

  const records = questions.map((question) => {
    const userAnswer = answerMap.get(question.id) || '';
    const isCorrect = gradeAnswer(question.type, question.answer, userAnswer, parseJsonArray(question.options));
    if (isCorrect) correct++;
    return {
      studentId,
      questionId: question.id,
      answer: userAnswer,
      isCorrect,
      foundationAttemptId: attempt.id,
    };
  });

  const total = questions.length;
  const correctRate = total > 0 ? Math.round((correct / total) * 100) : 0;
  const status = correctRate >= attempt.requiredCorrectRate ? 'passed' : 'failed';

  await prisma.$transaction([
    prisma.answerRecord.createMany({ data: records }),
    prisma.foundationQuizAttempt.update({
      where: { id: attempt.id },
      data: {
        status,
        correct,
        total,
        correctRate,
        submittedAt: new Date(),
      },
    }),
  ]);

  const updated = await prisma.foundationQuizAttempt.findUnique({ where: { id: attempt.id } });
  return { attempt: updated };
}

export async function buildFoundationDashboard(studentId: string) {
  const content = await loadFoundationContent();
  const attempts = await prisma.foundationQuizAttempt.findMany({
    where: { studentId },
    orderBy: [{ submittedAt: 'desc' }, { startedAt: 'desc' }],
    take: 100,
  });
  const units = computeFoundationProgress(content.units, attempts);
  const masteredRequired = units.filter((item) => item.unit.required && item.status === 'mastered');
  const requiredTotal = units.filter((item) => item.unit.required).length;

  return {
    version: content.version,
    status: content.status,
    quizPolicy: content.quizPolicy,
    requiredTotal,
    masteredRequired: masteredRequired.length,
    allRequiredMastered: requiredTotal > 0 && masteredRequired.length === requiredTotal,
    units,
  };
}
