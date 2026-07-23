import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressTranslationTemplate } from '@/lib/experiments/types';

const registry = vi.hoisted(() => ({
  templates: [] as AddressTranslationTemplate[],
}));

vi.mock('@/lib/experiments/registry', () => ({
  listExperimentTemplates: vi.fn(async () => registry.templates),
  loadExperimentTemplate: vi.fn(async (id: string) =>
    registry.templates.find((template) => template.id === id) || null
  ),
}));

import {
  getStudentExperimentDashboard,
  startStudentExperiment,
  submitStudentExperiment,
} from '@/lib/experiments/student';
import {
  generateAddressTranslationVariantByIndex,
  gradeAddressTranslationAnswer,
} from '@/lib/experiments/address-translation';

type Attempt = {
  id: string;
  studentId: string;
  courseVersion: string;
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
  activeKey: string | null;
  startedAt: Date;
  submittedAt: Date | null;
};

function template(
  id: string,
  publicationStatus: AddressTranslationTemplate['publicationStatus'],
  reviewStatus: AddressTranslationTemplate['reviewStatus']
): AddressTranslationTemplate {
  return {
    schemaVersion: 1,
    id,
    courseVersion: 'course-v1',
    title: `Template ${id}`,
    description: 'A sufficiently detailed formative experiment template.',
    publicationStatus,
    reviewStatus,
    ...(reviewStatus === 'reviewed'
      ? { reviewedBy: 'teacher', reviewedAt: '2026-07-19T08:00:00.000Z' }
      : {}),
    sourceRefs: ['source-1'],
    gateIds: ['gate-1'],
    conceptTags: ['virtual_memory'],
    generator: {
      kind: 'address_translation_v1',
      version: 1,
      variantCount: 64,
      pageSizes: [4096],
      virtualPageMin: 1,
      virtualPageMax: 32,
      physicalFrameMin: 16,
      physicalFrameMax: 128,
    },
    assessment: {
      mode: 'formative',
      masteryImpact: 'none',
      answerFormat: 'physical_address_or_fault',
      hiddenCaseCount: 8,
      requiredScenarios: ['mapped', 'not_present', 'privilege_fault', 'write_fault'],
    },
    resources: { timeLimitMs: 1000, memoryMb: 64, network: 'none' },
  };
}

function fakeDb() {
  const attempts: Attempt[] = [];
  let nextId = 1;
  const matchesWhere = (attempt: Attempt, where: Record<string, unknown>) =>
    Object.entries(where).every(([key, value]) => {
      const field = attempt[key as keyof Attempt];
      if (value && typeof value === 'object' && 'in' in value) {
        return (value.in as unknown[]).includes(field);
      }
      return field === value;
    });
  const experimentAttempt = {
    findMany: vi.fn(async ({ where, take }: { where: Record<string, unknown>; take: number }) =>
      attempts
        .filter((attempt) => matchesWhere(attempt, where))
        .sort((left, right) => right.startedAt.getTime() - left.startedAt.getTime())
        .slice(0, take)
    ),
    findUnique: vi.fn(async ({ where }: { where: { id?: string; activeKey?: string } }) =>
      attempts.find(
        (attempt) =>
          (where.id !== undefined && attempt.id === where.id) ||
          (where.activeKey !== undefined && attempt.activeKey === where.activeKey)
      ) || null
    ),
    count: vi.fn(async ({ where }: { where: Partial<Attempt> }) =>
      attempts.filter((attempt) =>
        Object.entries(where).every(([key, value]) => attempt[key as keyof Attempt] === value)
      ).length
    ),
    create: vi.fn(async ({ data }: { data: Omit<Attempt, 'id' | 'status' | 'answer' | 'isCorrect' | 'feedback' | 'startedAt' | 'submittedAt'> }) => {
      const attempt: Attempt = {
        ...data,
        id: `attempt-${nextId++}`,
        status: 'in_progress',
        answer: '',
        isCorrect: null,
        feedback: '',
        startedAt: new Date(`2026-07-19T09:00:0${nextId}.000Z`),
        submittedAt: null,
      };
      attempts.push(attempt);
      return attempt;
    }),
    updateMany: vi.fn(async ({ where, data }: { where: Record<string, unknown>; data: Partial<Attempt> }) => {
      const matches = attempts.filter((attempt) => matchesWhere(attempt, where));
      matches.forEach((attempt) => Object.assign(attempt, data));
      return { count: matches.length };
    }),
  };
  return {
    db: { experimentAttempt } as unknown as Parameters<typeof getStudentExperimentDashboard>[0],
    attempts,
    experimentAttempt,
  };
}

describe('student formative experiment flow', () => {
  beforeEach(() => {
    registry.templates = [
      template('published-reviewed', 'published', 'reviewed'),
      template('draft-pending', 'draft', 'pending'),
      template('published-pending', 'published', 'pending'),
    ];
  });

  it('only exposes published and reviewed templates to students', async () => {
    const { db } = fakeDb();
    const dashboard = await getStudentExperimentDashboard(db, 'student-a', 'course-v1');
    expect(dashboard.templates.map((item) => item.id)).toEqual(['published-reviewed']);
    expect(dashboard.availability).toEqual({ total: 3, available: 1, awaitingReview: 2 });
    expect(JSON.stringify(dashboard)).not.toContain('expected');
    expect(dashboard.policy).toMatchObject({ formative: true, masteryImpact: 'none', gatePassed: false });
  });

  it('rejects unavailable templates and resumes one active attempt', async () => {
    const { db, experimentAttempt } = fakeDb();
    await expect(
      startStudentExperiment(db, {
        studentId: 'student-a',
        courseVersion: 'course-v1',
        templateId: 'draft-pending',
      })
    ).rejects.toMatchObject({
      status: 409,
      code: 'template_unavailable',
    });

    const first = await startStudentExperiment(db, {
      studentId: 'student-a',
      courseVersion: 'course-v1',
      templateId: 'published-reviewed',
    });
    const second = await startStudentExperiment(db, {
      studentId: 'student-a',
      courseVersion: 'course-v1',
      templateId: 'published-reviewed',
    });
    expect(second.resumed).toBe(true);
    expect(second.attempt.id).toBe(first.attempt.id);
    expect(experimentAttempt.create).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(first.attempt)).not.toContain('expected');
  });

  it('enforces ownership and recomputes the expected answer server-side', async () => {
    const { db, attempts } = fakeDb();
    const started = await startStudentExperiment(db, {
      studentId: 'student-a',
      courseVersion: 'course-v1',
      templateId: 'published-reviewed',
    });
    await expect(
      submitStudentExperiment(db, {
        studentId: 'student-b',
        courseVersion: 'course-v1',
        attemptId: started.attempt.id,
        answer: 'PAGE_FAULT_NOT_PRESENT',
      })
    ).rejects.toMatchObject({ status: 403, code: 'attempt_forbidden' });

    const expected = generateAddressTranslationVariantByIndex(
      registry.templates[0],
      started.attempt.variantIndex,
      true
    ).expected!;
    const correctAnswer =
      expected.kind === 'fault' ? expected.fault : String(expected.physicalAddress);
    const submitted = await submitStudentExperiment(db, {
      studentId: 'student-a',
      courseVersion: 'course-v1',
      attemptId: started.attempt.id,
      answer: correctAnswer,
    });
    expect(submitted).toMatchObject({
      formative: true,
      masteryImpact: 'none',
      gatePassed: false,
      result: { correct: true },
    });
    expect(attempts[0]).toMatchObject({ status: 'submitted', isCorrect: true, activeKey: null });
  });

  it('does not accept a client pass claim and records incorrect formative evidence only', async () => {
    const { db, experimentAttempt } = fakeDb();
    const started = await startStudentExperiment(db, {
      studentId: 'student-a',
      courseVersion: 'course-v1',
      templateId: 'published-reviewed',
    });
    const generated = generateAddressTranslationVariantByIndex(
      registry.templates[0],
      started.attempt.variantIndex,
      true
    );
    const definitelyWrong = gradeAddressTranslationAnswer(generated.expected!, 'NOT_A_REAL_RESULT').correct
      ? '0'
      : 'NOT_A_REAL_RESULT';
    const result = await submitStudentExperiment(db, {
      studentId: 'student-a',
      courseVersion: 'course-v1',
      attemptId: started.attempt.id,
      answer: definitelyWrong,
      ...({ isPassed: true, gatePassed: true, expected: 'NOT_A_REAL_RESULT' } as object),
    });
    expect(result.result.correct).toBe(false);
    expect(result.gatePassed).toBe(false);
    expect(experimentAttempt.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ isPassed: expect.anything() }),
      })
    );
  });

  it('hides revoked template history and blocks submission after withdrawal', async () => {
    const { db } = fakeDb();
    const started = await startStudentExperiment(db, {
      studentId: 'student-a',
      courseVersion: 'course-v1',
      templateId: 'published-reviewed',
    });
    registry.templates[0] = template('published-reviewed', 'draft', 'pending');

    const dashboard = await getStudentExperimentDashboard(db, 'student-a', 'course-v1');
    expect(dashboard.attempts).toEqual([]);
    await expect(
      submitStudentExperiment(db, {
        studentId: 'student-a',
        courseVersion: 'course-v1',
        attemptId: started.attempt.id,
        answer: '0',
      })
    ).rejects.toMatchObject({ status: 409, code: 'template_unavailable' });
  });

  it('allows only one atomic submission and rejects a stale course attempt', async () => {
    const { db } = fakeDb();
    const started = await startStudentExperiment(db, {
      studentId: 'student-a',
      courseVersion: 'course-v1',
      templateId: 'published-reviewed',
    });
    await expect(
      submitStudentExperiment(db, {
        studentId: 'student-a',
        courseVersion: 'course-v2',
        attemptId: started.attempt.id,
        answer: '0',
      })
    ).rejects.toMatchObject({ status: 409, code: 'course_version_mismatch' });

    await submitStudentExperiment(db, {
      studentId: 'student-a',
      courseVersion: 'course-v1',
      attemptId: started.attempt.id,
      answer: '0',
    });
    await expect(
      submitStudentExperiment(db, {
        studentId: 'student-a',
        courseVersion: 'course-v1',
        attemptId: started.attempt.id,
        answer: '0',
      })
    ).rejects.toMatchObject({ status: 409, code: 'attempt_submitted' });
  });
});
