import path from 'node:path';
import { readFile } from 'node:fs/promises';
import type { Question } from '@prisma/client';
import prisma from '@/lib/db/index';
import { gradeAnswer, parseJsonArray } from '@/lib/exam/grade';
import { resolveProgressDate } from '@/lib/progress/daily';
import { recordReviewEvidence } from '@/lib/progress/review-scheduler';
import { listKnowledgeCards, type KnowledgeCard } from '@/lib/knowledge/cards';
import {
  auditFoundationTopicPacks,
  loadFoundationTopicPacks,
  toStudentFoundationTopicPacks,
} from '@/lib/foundation/topic-packs';

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

export const FOUNDATION_QUESTION_STAGES = [
  'pre_study_theory',
  'pre_study_rust',
  'pre_study_tools',
  'basic',
  'B1',
  'B2',
] as const;
export const FOUNDATION_QUIZ_QUESTION_COUNT = 5;
export const FOUNDATION_DIFFICULTY_TARGETS = [35, 40, 45, 50, 55] as const;

type AttemptSummary = {
  id?: string;
  unitId: string;
  mode?: string;
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

function questionTags(question: Pick<Question, 'knowledgePoints'>): string[] {
  return [...new Set(parseJsonArray(question.knowledgePoints).map((tag) => tag.toLowerCase()))];
}

export function selectFoundationQuestionSet<T extends Pick<Question, 'id' | 'knowledgePoints' | 'difficulty'>>(
  candidates: T[],
  unit: Pick<FoundationUnit, 'quizTags'>,
  count: number,
  excludeIds: string[] = []
): T[] {
  const exclude = new Set(excludeIds);
  const matched = candidates.filter(
    (question) => !exclude.has(question.id) && matchesAnyTag(question, unit.quizTags)
  );

  // Prefer one available quiz tag per slot and move through a basic-to-stretch
  // difficulty curve. If a semantic tag has no questions yet, fall back only
  // to another matching tag; never fill with an unrelated topic.
  const selected: T[] = [];
  const selectedIds = new Set<string>();
  const targetTags = unit.quizTags.map((tag) => tag.toLowerCase());
  for (let index = 0; index < count && selected.length < matched.length; index++) {
    const preferredTag = targetTags[index % Math.max(1, targetTags.length)];
    const remaining = matched.filter((question) => !selectedIds.has(question.id));
    const preferred = remaining.filter((question) => questionTags(question).includes(preferredTag));
    const pool = preferred.length > 0 ? preferred : remaining;
    const targetDifficulty = FOUNDATION_DIFFICULTY_TARGETS[index % FOUNDATION_DIFFICULTY_TARGETS.length];
    const [chosen] = [...pool].sort(
      (a, b) =>
        Math.abs(a.difficulty - targetDifficulty) - Math.abs(b.difficulty - targetDifficulty) ||
        a.difficulty - b.difficulty ||
        a.id.localeCompare(b.id)
    );
    if (!chosen) break;
    selected.push(chosen);
    selectedIds.add(chosen.id);
  }
  return selected;
}

export function summarizeFoundationQuestionSet(
  unit: Pick<FoundationUnit, 'quizTags'>,
  questions: Array<Pick<Question, 'knowledgePoints' | 'difficulty'>>
) {
  const present = new Set(questions.flatMap((question) => questionTags(question)));
  const coveredTags = unit.quizTags.filter((tag) => present.has(tag.toLowerCase()));
  const difficulties = questions.map((question) => question.difficulty);
  return {
    count: questions.length,
    coveredTags,
    missingTags: unit.quizTags.filter((tag) => !present.has(tag.toLowerCase())),
    difficulty: {
      min: difficulties.length ? Math.min(...difficulties) : 0,
      max: difficulties.length ? Math.max(...difficulties) : 0,
      average: difficulties.length
        ? Math.round(difficulties.reduce((sum, value) => sum + value, 0) / difficulties.length)
        : 0,
    },
  };
}

export type FoundationWeakPoint = {
  tag: string;
  incorrect: number;
  total: number;
  errorRate: number;
};

export type FoundationRemediationCard = {
  id: string;
  title: string;
  source: string;
  matchedTags: string[];
};

export type FoundationQuizDiagnosis = {
  unitId: string;
  status: 'passed' | 'failed';
  mode: string;
  weakPoints: FoundationWeakPoint[];
  recommendedCards: FoundationRemediationCard[];
  summary: string;
  nextAction: {
    kind: 'review_then_retry' | 'continue_review';
    label: string;
  };
};

export function buildFoundationQuizDiagnosis(input: {
  unit: Pick<FoundationUnit, 'id' | 'quizTags'>;
  mode: string;
  status: 'passed' | 'failed';
  questions: Array<Pick<Question, 'id' | 'knowledgePoints'>>;
  answerResults: Array<{ questionId: string; isCorrect: boolean }>;
}): Omit<FoundationQuizDiagnosis, 'recommendedCards'> {
  const resultByQuestion = new Map(input.answerResults.map((result) => [result.questionId, result.isCorrect]));
  const tagOrder = new Map(input.unit.quizTags.map((tag, index) => [tag.toLowerCase(), index]));
  const stats = new Map<string, { incorrect: number; total: number }>();

  for (const question of input.questions) {
    const isCorrect = resultByQuestion.get(question.id) === true;
    const tags = questionTags(question).filter((tag) => tagOrder.has(tag));
    for (const tag of tags) {
      const current = stats.get(tag) || { incorrect: 0, total: 0 };
      current.total++;
      if (!isCorrect) current.incorrect++;
      stats.set(tag, current);
    }
  }

  const weakPoints = [...stats.entries()]
    .filter(([, value]) => value.incorrect > 0)
    .sort(
      ([tagA, a], [tagB, b]) =>
        b.incorrect - a.incorrect ||
        b.incorrect / b.total - a.incorrect / a.total ||
        (tagOrder.get(tagA) || 0) - (tagOrder.get(tagB) || 0) ||
        tagA.localeCompare(tagB)
    )
    .map(([tag, value]) => ({
      tag,
      incorrect: value.incorrect,
      total: value.total,
      errorRate: Math.round((value.incorrect / value.total) * 100),
    }));

  const nextAction = input.status === 'failed'
    ? { kind: 'review_then_retry' as const, label: `先复习${weakPoints.length ? `：${weakPoints.slice(0, 3).map((item) => item.tag).join('、')}` : '本微单元'}，再挑战下一套题` }
    : { kind: 'continue_review' as const, label: '本次证据已记录，按到期复习计划继续巩固' };
  const summary = input.status === 'failed'
    ? `本次未达标。${weakPoints.length ? `主要薄弱点：${weakPoints.slice(0, 3).map((item) => `${item.tag} ${item.errorRate}% 错误率`).join('、')}。` : '暂未形成可细分的知识点错误归因。'}`
    : `本次${input.mode === 'high_stakes' ? '高 stakes 小测通过，已形成达标证据' : '复习完成，已更新复习调度'}。`;

  return {
    unitId: input.unit.id,
    status: input.status,
    mode: input.mode,
    weakPoints,
    summary,
    nextAction,
  };
}

export function selectFoundationRemediationCards(
  weakPoints: FoundationWeakPoint[],
  cards: Array<Pick<KnowledgeCard, 'id' | 'title' | 'source' | 'tags' | 'questionTags'>>,
  limit = 3
): FoundationRemediationCard[] {
  const weakOrder = new Map(weakPoints.map((point, index) => [point.tag.toLowerCase(), index]));
  return cards
    .map((card) => {
      const matchedTags = weakPoints
        .filter((point) => {
          const tag = point.tag.toLowerCase();
          return card.questionTags.some((candidate) => candidate.toLowerCase() === tag) ||
            card.tags.some((candidate) => candidate.toLowerCase() === tag);
        })
        .map((point) => point.tag);
      const exactCount = matchedTags.filter((tag) =>
        card.questionTags.some((candidate) => candidate.toLowerCase() === tag.toLowerCase())
      ).length;
      return {
        card,
        matchedTags,
        score: exactCount * 4 + matchedTags.length * 2,
        firstWeakIndex: Math.min(...matchedTags.map((tag) => weakOrder.get(tag.toLowerCase()) ?? 999)),
      };
    })
    .filter((item) => item.matchedTags.length > 0)
    .sort((a, b) => b.score - a.score || a.firstWeakIndex - b.firstWeakIndex || a.card.id.localeCompare(b.card.id))
    .slice(0, limit)
    .map((item) => ({
      id: item.card.id,
      title: item.card.title,
      source: item.card.source,
      matchedTags: item.matchedTags,
    }));
}

function attachFoundationRemediationCards(
  diagnosis: Omit<FoundationQuizDiagnosis, 'recommendedCards'>,
  cards: Array<Pick<KnowledgeCard, 'id' | 'title' | 'source' | 'tags' | 'questionTags'>>
): FoundationQuizDiagnosis {
  return {
    ...diagnosis,
    recommendedCards: selectFoundationRemediationCards(diagnosis.weakPoints, cards, 3),
  };
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
    const passed = unitAttempts.find(
      (attempt) => attempt.mode === 'high_stakes' && attempt.status === 'passed'
    );
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
  const candidates = await prisma.question.findMany({
    where: { stage: { in: [...FOUNDATION_QUESTION_STAGES] } },
    take: 500,
  });
  return selectFoundationQuestionSet(candidates, unit, count, [...exclude]);
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

  const existingAttempts = await prisma.foundationQuizAttempt.findMany({
    where: { studentId },
    orderBy: [{ submittedAt: 'desc' }, { startedAt: 'desc' }],
    take: 100,
  });
  const unitProgress = computeFoundationProgress(content.units, existingAttempts)
    .find((item) => item.unit.id === unitId);
  if (unitProgress?.status === 'locked') {
    return {
      error: 'FOUNDATION_UNIT_LOCKED' as const,
      unlockAfter: unit.unlockAfter,
    };
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
  const requiredQuestionCount = FOUNDATION_QUIZ_QUESTION_COUNT;
  const questions = await pickFoundationQuestions(unit, requiredQuestionCount, excludeIds);
  if (questions.length < requiredQuestionCount) {
    return {
      error: 'QUESTION_SET_INSUFFICIENT' as const,
      available: questions.length,
      required: requiredQuestionCount,
    };
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

  return { attempt, questions, questionSet: summarizeFoundationQuestionSet(unit, questions) };
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
  const unit = findFoundationUnit(await loadFoundationContent(), attempt.unitId);
  if (!unit) return { error: 'ATTEMPT_UNIT_STALE' as const };

  const questionIds = parseJsonArray(attempt.questionIds);
  const allowed = new Set(questionIds);
  const normalizedAnswers = answers.filter((answer) => allowed.has(answer.questionId));
  const questions = await prisma.question.findMany({ where: { id: { in: questionIds } } });
  if (questions.length !== questionIds.length) {
    return { error: 'ATTEMPT_QUESTION_SET_STALE' as const };
  }
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
  const status: 'passed' | 'failed' = correctRate >= attempt.requiredCorrectRate ? 'passed' : 'failed';

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

  try {
    await recordReviewEvidence({
      studentId,
      curriculumVersion: attempt.curriculumVersion,
      targetType: 'foundation_unit',
      targetId: attempt.unitId,
      evidenceType: attempt.mode === 'high_stakes' ? 'foundation_high_stakes' : 'foundation_review',
      evidenceId: attempt.id,
      passed: status === 'passed',
      evidenceAt: new Date(),
      today: attempt.attemptDate,
    });
  } catch (error) {
    // Review scheduling is auxiliary; never turn a graded attempt into a failed request.
    console.warn('foundation: review schedule update failed', error);
  }

  const updated = await prisma.foundationQuizAttempt.findUnique({ where: { id: attempt.id } });
  const diagnosisBase = buildFoundationQuizDiagnosis({
    unit,
    mode: attempt.mode,
    status,
    questions,
    answerResults: records.map((record) => ({ questionId: record.questionId, isCorrect: record.isCorrect })),
  });
  let diagnosis: FoundationQuizDiagnosis = { ...diagnosisBase, recommendedCards: [] };
  try {
    diagnosis = attachFoundationRemediationCards(diagnosisBase, await listKnowledgeCards());
  } catch (error) {
    console.warn('foundation: remediation card lookup failed', error);
  }
  return { attempt: updated, diagnosis };
}

export async function buildFoundationDashboard(studentId: string) {
  const content = await loadFoundationContent();
  const [attempts, topicPackData, topicPackCards, topicPackQuestions] = await Promise.all([
    prisma.foundationQuizAttempt.findMany({
      where: { studentId },
      orderBy: [{ submittedAt: 'desc' }, { startedAt: 'desc' }],
      take: 100,
      include: {
        answerRecords: {
          include: { question: true },
          orderBy: { answeredAt: 'asc' },
        },
      },
    }),
    loadFoundationTopicPacks(),
    listKnowledgeCards(),
    prisma.question.findMany({
      select: { stage: true, knowledgePoints: true },
    }),
  ]);
  const units = computeFoundationProgress(content.units, attempts);
  const masteredRequired = units.filter((item) => item.unit.required && item.status === 'mastered');
  const requiredTotal = units.filter((item) => item.unit.required).length;
  const latestAttempt = attempts.find(
    (attempt) => attempt.status !== 'in_progress' && attempt.answerRecords.length > 0
  );
  let latestDiagnosis: (FoundationQuizDiagnosis & {
    attemptId: string;
    submittedAt: string | null;
  }) | null = null;
  if (latestAttempt) {
    const unit = findFoundationUnit(content, latestAttempt.unitId);
    if (unit) {
      const diagnosisBase = buildFoundationQuizDiagnosis({
        unit,
        mode: latestAttempt.mode,
        status: latestAttempt.status === 'passed' ? 'passed' : 'failed',
        questions: latestAttempt.answerRecords.map((record) => record.question),
        answerResults: latestAttempt.answerRecords.map((record) => ({
          questionId: record.questionId,
          isCorrect: record.isCorrect,
        })),
      });
      let diagnosis: FoundationQuizDiagnosis = { ...diagnosisBase, recommendedCards: [] };
      try {
        diagnosis = attachFoundationRemediationCards(diagnosisBase, topicPackCards);
      } catch (error) {
        console.warn('foundation: dashboard remediation card lookup failed', error);
      }
      latestDiagnosis = {
        ...diagnosis,
        attemptId: latestAttempt.id,
        submittedAt: latestAttempt.submittedAt?.toISOString() || null,
      };
    }
  }
  const topicPackAudits = auditFoundationTopicPacks({
    content,
    topicPackVersion: topicPackData.version,
    packs: topicPackData.packs,
    cards: topicPackCards,
    questions: topicPackQuestions,
    allowedStages: FOUNDATION_QUESTION_STAGES,
    requiredQuestionsPerTag: content.quizPolicy.alternateSetRequiredAfterFailure ? 2 : 1,
    requiredUnitIds: ['os-overview-interrupts', 'process-scheduling', 'memory-virtual-memory'],
  });

  return {
    version: content.version,
    status: content.status,
    quizPolicy: content.quizPolicy,
    requiredTotal,
    masteredRequired: masteredRequired.length,
    allRequiredMastered: requiredTotal > 0 && masteredRequired.length === requiredTotal,
    latestDiagnosis,
    topicPacks: toStudentFoundationTopicPacks(topicPackAudits, units),
    units,
  };
}
