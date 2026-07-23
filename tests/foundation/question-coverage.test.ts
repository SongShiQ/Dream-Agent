import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { auditFoundationQuestionCoverage } from '@/lib/foundation/coverage';
import { listKnowledgeCards } from '@/lib/knowledge/cards';
import { selectFoundationRemediationCards } from '@/lib/foundation/units';

type Unit = { id: string; quizTags: string[] };
type Question = { knowledgePoints?: string[]; stage?: string; difficulty?: number };

describe('foundation question coverage', () => {
  it('keeps at least five source questions for every required unit', async () => {
    const root = process.cwd();
    const curriculum = JSON.parse(
      await readFile(join(root, 'data', 'curriculum', '2026-summer-os', 'foundation-units.json'), 'utf8')
    ) as { quizPolicy: { alternateSetRequiredAfterFailure: boolean }; units: Unit[] };
    const files = await readdir(join(root, 'data', 'questions'));
    const questions: Question[] = [];
    for (const file of files.filter((name) => name.endsWith('.json') && !name.startsWith('_'))) {
      const parsed = JSON.parse(await readFile(join(root, 'data', 'questions', file), 'utf8')) as Question[];
      questions.push(...parsed);
    }

    const coverage = auditFoundationQuestionCoverage(
      curriculum.units as Parameters<typeof auditFoundationQuestionCoverage>[0],
      questions.map((question) => ({
        stage: question.stage || '',
        knowledgePoints: question.knowledgePoints || [],
        difficulty: question.difficulty || 0,
      })),
      curriculum.quizPolicy.alternateSetRequiredAfterFailure ? 10 : 5,
      curriculum.quizPolicy.alternateSetRequiredAfterFailure ? 2 : 1
    );

    expect(coverage).toHaveLength(curriculum.units.length);
    expect(coverage.every((item) => item.availableQuestions >= item.requiredQuestions)).toBe(true);
    expect(coverage.flatMap((item) => item.issues)).toEqual([]);
    expect(coverage.every((item) => item.uncoveredTags.length === 0)).toBe(true);
    expect(coverage.every((item) => item.undercoveredTags.length === 0)).toBe(true);
    expect(
      coverage
        .flatMap((item) => item.tagCoverage)
        .filter((item) => ['os_overview', 'variables', 'match'].includes(item.tag))
        .every((item) => item.questions >= 2)
    ).toBe(true);
    expect(coverage.every((item) => item.difficulty.max >= item.difficulty.min)).toBe(true);
  });

  it('flags a thin semantic tag even when the unit has enough total questions', () => {
    const coverage = auditFoundationQuestionCoverage(
      [{
        id: 'rust-basics',
        title: 'Rust 基础',
        objective: '基础语法',
        estimatedMinutes: 30,
        required: true,
        readingTags: ['rust'],
        quizTags: ['rust', 'match'],
        requiredCorrectRate: 80,
        unlockAfter: [],
        qualifiesFor: [],
      }],
      [
        { stage: 'pre_study_rust', knowledgePoints: ['rust', 'match'], difficulty: 35 },
        { stage: 'pre_study_rust', knowledgePoints: ['rust'], difficulty: 40 },
        { stage: 'pre_study_rust', knowledgePoints: ['rust'], difficulty: 45 },
      ],
      3,
      2,
      []
    );

    expect(coverage[0].availableQuestions).toBe(3);
    expect(coverage[0].undercoveredTags).toEqual(['match']);
    expect(coverage[0].issues).toContainEqual(expect.objectContaining({
      code: 'insufficient_tag_coverage',
    }));
    expect(coverage[0].issues).toContainEqual(expect.objectContaining({
      code: 'missing_remediation_card',
    }));
  });

  it('maps every Foundation weak-point tag to a student-visible remediation card', async () => {
    const root = process.cwd();
    const curriculum = JSON.parse(
      await readFile(join(root, 'data', 'curriculum', '2026-summer-os', 'foundation-units.json'), 'utf8')
    ) as { quizPolicy: { alternateSetRequiredAfterFailure: boolean }; units: Unit[] };
    const files = await readdir(join(root, 'data', 'questions'));
    const questions: Question[] = [];
    for (const file of files.filter((name) => name.endsWith('.json') && !name.startsWith('_'))) {
      const parsed = JSON.parse(await readFile(join(root, 'data', 'questions', file), 'utf8')) as Question[];
      questions.push(...parsed);
    }
    const cards = await listKnowledgeCards();
    const coverage = auditFoundationQuestionCoverage(
      curriculum.units as Parameters<typeof auditFoundationQuestionCoverage>[0],
      questions.map((question) => ({
        stage: question.stage || '',
        knowledgePoints: question.knowledgePoints || [],
        difficulty: question.difficulty || 0,
      })),
      10,
      2,
      cards
    );

    const osOverview = coverage.find((item) => item.unitId === 'os-overview-interrupts');
    const toolchain = coverage.find((item) => item.unitId === 'toolchain-code-reading');
    expect(osOverview?.uncoveredRemediationTags).toEqual([]);
    expect(coverage.every((item) => item.uncoveredRemediationTags.length === 0)).toBe(true);
    expect(toolchain?.remediationCoverage.find((item) => item.tag === 'compiler_error')?.cardIds)
      .toContain('rust-09-modules');

    const osWeakPoints = ['os_overview', 'interrupt', 'trap'].map((tag) => ({
      tag,
      incorrect: 1,
      total: 1,
      errorRate: 100,
    }));
    const recommended = selectFoundationRemediationCards(osWeakPoints, cards, 3);
    expect(new Set(recommended.flatMap((card) => card.matchedTags))).toEqual(
      new Set(['os_overview', 'interrupt', 'trap'])
    );
    expect(recommended.map((card) => card.id)).toEqual(
      expect.arrayContaining(['os-theory-01-overview', 'trap-syscall'])
    );

    const toolchainRecommended = selectFoundationRemediationCards([{
      tag: 'compiler_error',
      incorrect: 1,
      total: 1,
      errorRate: 100,
    }], cards, 3);
    expect(toolchainRecommended).toContainEqual(expect.objectContaining({
      id: 'rust-09-modules',
      matchedTags: ['compiler_error'],
    }));
  });
});
