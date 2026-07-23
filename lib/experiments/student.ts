import type { PrismaClient } from '@prisma/client';
import {
  generateAddressTranslationVariant,
  generateAddressTranslationVariantByIndex,
  gradeAddressTranslationAnswer,
} from './address-translation';
import { listExperimentTemplates, loadExperimentTemplate } from './registry';
import type { AddressTranslationTemplate } from './types';

export const EXPERIMENT_ANSWER_MAX_LENGTH = 80;

type ExperimentDb = Pick<PrismaClient, 'experimentAttempt'>;

export class ExperimentFlowError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string
  ) {
    super(message);
  }
}

function isStudentAvailable(template: AddressTranslationTemplate, courseVersion: string) {
  return (
    template.courseVersion === courseVersion &&
    template.publicationStatus === 'published' &&
    template.reviewStatus === 'reviewed'
  );
}

function activeKey(studentId: string, courseVersion: string, templateId: string) {
  return `${studentId}:${courseVersion}:${templateId}`;
}

function attemptView(attempt: {
  id: string;
  templateId: string;
  templateVersion: number;
  instanceId: string;
  variantIndex: number;
  status: string;
  promptSnapshot: string;
  inputSnapshot: string;
  answer: string;
  isCorrect: boolean | null;
  feedback: string;
  startedAt: Date;
  submittedAt: Date | null;
}) {
  return {
    id: attempt.id,
    templateId: attempt.templateId,
    templateVersion: attempt.templateVersion,
    instanceId: attempt.instanceId,
    variantIndex: attempt.variantIndex,
    status: attempt.status,
    prompt: attempt.promptSnapshot,
    input: JSON.parse(attempt.inputSnapshot) as unknown,
    answer: attempt.answer,
    isCorrect: attempt.isCorrect,
    feedback: attempt.feedback,
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt,
    formative: true,
    masteryImpact: 'none' as const,
    gatePassed: false,
  };
}

export async function getStudentExperimentDashboard(
  db: ExperimentDb,
  studentId: string,
  courseVersion: string
) {
  const templates = await listExperimentTemplates();
  const courseTemplates = templates.filter((template) => template.courseVersion === courseVersion);
  const available = courseTemplates.filter((template) => isStudentAvailable(template, courseVersion));
  const availableIds = available.map((template) => template.id);
  const attempts = await db.experimentAttempt.findMany({
    where: { studentId, courseVersion, templateId: { in: availableIds } },
    orderBy: { startedAt: 'desc' },
    take: 10,
  });

  return {
    templates: available.map((template) => ({
      id: template.id,
      title: template.title,
      description: template.description,
      courseVersion: template.courseVersion,
      gateIds: template.gateIds,
      conceptTags: template.conceptTags,
      sourceRefs: template.sourceRefs,
      assessment: { mode: 'formative' as const, masteryImpact: 'none' as const },
    })),
    availability: {
      total: courseTemplates.length,
      available: available.length,
      awaitingReview: courseTemplates.filter(
        (template) =>
          template.publicationStatus === 'draft' || template.reviewStatus === 'pending'
      ).length,
    },
    attempts: attempts.map(attemptView),
    policy: {
      formative: true,
      masteryImpact: 'none' as const,
      gatePassed: false,
      note: '参数化预实验只用于练习和反馈，不会直接获得 mastery，也不会让实验关卡 AC。',
    },
  };
}

export async function startStudentExperiment(
  db: ExperimentDb,
  input: { studentId: string; courseVersion: string; templateId: string }
) {
  const template = await loadExperimentTemplate(input.templateId);
  if (!template || !isStudentAvailable(template, input.courseVersion)) {
    throw new ExperimentFlowError('该预实验尚未发布或未完成教师审核', 409, 'template_unavailable');
  }

  const key = activeKey(input.studentId, input.courseVersion, template.id);
  const existing = await db.experimentAttempt.findUnique({ where: { activeKey: key } });
  if (existing) return { attempt: attemptView(existing), resumed: true };

  const sequence = await db.experimentAttempt.count({
    where: {
      studentId: input.studentId,
      courseVersion: input.courseVersion,
      templateId: template.id,
    },
  });
  const variant = generateAddressTranslationVariant(template, input.studentId, sequence, false);
  let attempt;
  try {
    attempt = await db.experimentAttempt.create({
      data: {
        studentId: input.studentId,
        courseVersion: input.courseVersion,
        templateId: template.id,
        templateVersion: variant.templateVersion,
        instanceId: variant.instanceId,
        variantIndex: variant.variantIndex,
        promptSnapshot: variant.prompt,
        inputSnapshot: JSON.stringify(variant.input),
        activeKey: key,
      },
    });
  } catch (error) {
    // A concurrent start can win the unique activeKey race; return that attempt rather than 500.
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      const concurrent = await db.experimentAttempt.findUnique({ where: { activeKey: key } });
      if (concurrent) return { attempt: attemptView(concurrent), resumed: true };
    }
    throw error;
  }

  return { attempt: attemptView(attempt), resumed: false };
}

export async function submitStudentExperiment(
  db: ExperimentDb,
  input: { studentId: string; courseVersion: string; attemptId: string; answer: string }
) {
  const answer = input.answer.trim();
  if (!answer || answer.length > EXPERIMENT_ANSWER_MAX_LENGTH) {
    throw new ExperimentFlowError(
      `答案长度必须为 1-${EXPERIMENT_ANSWER_MAX_LENGTH} 个字符`,
      400,
      'invalid_answer'
    );
  }

  const attempt = await db.experimentAttempt.findUnique({ where: { id: input.attemptId } });
  if (!attempt) throw new ExperimentFlowError('预实验记录不存在', 404, 'attempt_not_found');
  if (attempt.studentId !== input.studentId) {
    throw new ExperimentFlowError('无权提交其他学员的预实验', 403, 'attempt_forbidden');
  }
  if (attempt.courseVersion !== input.courseVersion) {
    throw new ExperimentFlowError('该预实验不属于当前课程版本', 409, 'course_version_mismatch');
  }
  if (attempt.status !== 'in_progress') {
    throw new ExperimentFlowError('该预实验已经提交', 409, 'attempt_submitted');
  }

  const template = await loadExperimentTemplate(attempt.templateId);
  if (!template || !isStudentAvailable(template, attempt.courseVersion)) {
    throw new ExperimentFlowError('该预实验已撤回或不再可用', 409, 'template_unavailable');
  }
  if (template.generator.version !== attempt.templateVersion) {
    throw new ExperimentFlowError('实验模板版本已变化，请联系教师处理', 409, 'template_version_changed');
  }
  const variant = generateAddressTranslationVariantByIndex(template, attempt.variantIndex, true);
  if (!variant.expected || variant.instanceId !== attempt.instanceId) {
    throw new ExperimentFlowError('无法重建该实验实例', 409, 'instance_mismatch');
  }
  const grade = gradeAddressTranslationAnswer(variant.expected, answer);
  const feedback = grade.correct
    ? '回答正确。该结果仅作为形成性练习记录。'
    : '回答不正确。请重新检查页表项有效位、访问权限和页内偏移。';
  const submittedAt = new Date();
  const updated = await db.experimentAttempt.updateMany({
    where: { id: attempt.id, studentId: input.studentId, status: 'in_progress' },
    data: {
      status: 'submitted',
      answer: grade.normalizedAnswer,
      isCorrect: grade.correct,
      feedback,
      activeKey: null,
      submittedAt,
    },
  });
  if (updated.count !== 1) {
    throw new ExperimentFlowError('该预实验已经提交', 409, 'attempt_submitted');
  }
  const submitted = await db.experimentAttempt.findUnique({ where: { id: attempt.id } });
  if (!submitted) {
    throw new ExperimentFlowError('预实验记录不存在', 404, 'attempt_not_found');
  }

  return {
    attempt: attemptView(submitted),
    result: {
      correct: grade.correct,
      expectedAnswer: grade.expectedAnswer,
      feedback,
    },
    formative: true,
    masteryImpact: 'none' as const,
    gatePassed: false,
  };
}
