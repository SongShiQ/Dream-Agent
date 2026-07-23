import { describe, expect, it } from 'vitest';
import {
  buildFoundationQuizDiagnosis,
  computeFoundationProgress,
  selectFoundationRemediationCards,
  selectFoundationQuestionSet,
  summarizeFoundationQuestionSet,
  type FoundationUnit,
} from '@/lib/foundation/units';

const units: FoundationUnit[] = [
  {
    id: 'rust-basics',
    title: 'Rust 基础',
    objective: '读懂简单 Rust',
    estimatedMinutes: 30,
    required: true,
    readingTags: ['rust'],
    quizTags: ['rust'],
    requiredCorrectRate: 80,
    unlockAfter: [],
    qualifiesFor: ['orientation_to_basic'],
  },
  {
    id: 'rust-ownership-result',
    title: '所有权',
    objective: '解释 borrow',
    estimatedMinutes: 35,
    required: true,
    readingTags: ['ownership'],
    quizTags: ['ownership'],
    requiredCorrectRate: 80,
    unlockAfter: ['rust-basics'],
    qualifiesFor: ['orientation_to_basic'],
  },
];

describe('computeFoundationProgress', () => {
  it('locks dependent units until prerequisites are mastered', () => {
    const progress = computeFoundationProgress(units, [
      {
        unitId: 'rust-basics',
        status: 'failed',
        correct: 1,
        total: 2,
        correctRate: 50,
      },
    ]);

    expect(progress[0].status).toBe('in_progress');
    expect(progress[1].status).toBe('locked');
  });

  it('marks a unit mastered only when matching quiz evidence reaches threshold', () => {
    const progress = computeFoundationProgress(units, [
      {
        unitId: 'rust-basics',
        mode: 'high_stakes',
        status: 'passed',
        correct: 5,
        total: 5,
        correctRate: 100,
      },
      {
        unitId: 'rust-ownership-result',
        status: 'failed',
        correct: 2,
        total: 5,
        correctRate: 40,
      },
    ]);

    expect(progress[0].status).toBe('mastered');
    expect(progress[0].correctRate).toBe(100);
    expect(progress[1].status).toBe('in_progress');
    expect(progress[1].correctRate).toBe(40);
  });

  it('never promotes a practice/review attempt to mastered', () => {
    const progress = computeFoundationProgress(units, [
      {
        unitId: 'rust-basics',
        mode: 'practice',
        status: 'passed',
        correct: 5,
        total: 5,
        correctRate: 100,
      },
    ]);

    expect(progress[0].status).toBe('in_progress');
    expect(progress[1].status).toBe('locked');
  });
});

describe('selectFoundationQuestionSet', () => {
  const candidates = [
    { id: 'memory-1', difficulty: 30, knowledgePoints: '["memory"]' },
    { id: 'memory-2', difficulty: 50, knowledgePoints: '["virtual_memory"]' },
    { id: 'process-1', difficulty: 90, knowledgePoints: '["process"]' },
  ];

  it('never fills a unit quiz with unrelated knowledge points', () => {
    const selected = selectFoundationQuestionSet(
      candidates,
      { quizTags: ['memory', 'virtual_memory'] },
      3
    );

    expect(selected.map((question) => question.id)).toEqual(['memory-1', 'memory-2']);
  });

  it('honors alternate-set exclusions without crossing topic boundaries', () => {
    const selected = selectFoundationQuestionSet(
      candidates,
      { quizTags: ['memory', 'virtual_memory'] },
      5,
      ['memory-2']
    );

    expect(selected).toHaveLength(1);
    expect(selected[0].id).toBe('memory-1');
  });

  it('uses available tag coverage and a basic difficulty curve before stretch questions', () => {
    const selected = selectFoundationQuestionSet(
      [
        { id: 'memory-35', difficulty: 35, knowledgePoints: '["memory"]' },
        { id: 'virtual-40', difficulty: 40, knowledgePoints: '["virtual_memory"]' },
        { id: 'fault-45', difficulty: 45, knowledgePoints: '["page_fault"]' },
        { id: 'memory-90', difficulty: 90, knowledgePoints: '["memory"]' },
      ],
      { quizTags: ['memory', 'virtual_memory', 'page_fault'] },
      3
    );

    expect(selected.map((question) => question.id)).toEqual([
      'memory-35',
      'virtual-40',
      'fault-45',
    ]);
    expect(
      summarizeFoundationQuestionSet(
        { quizTags: ['memory', 'virtual_memory', 'page_fault', 'tlb'] },
        selected
      )
    ).toEqual({
      count: 3,
      coveredTags: ['memory', 'virtual_memory', 'page_fault'],
      missingTags: ['tlb'],
      difficulty: { min: 35, max: 45, average: 40 },
    });
  });
});

describe('foundation quiz diagnosis', () => {
  const diagnosis = buildFoundationQuizDiagnosis({
    unit: { id: 'memory-virtual-memory', quizTags: ['memory', 'virtual_memory', 'page_fault'] },
    mode: 'high_stakes',
    status: 'failed',
    questions: [
      { id: 'q1', knowledgePoints: '["memory", "virtual_memory"]' },
      { id: 'q2', knowledgePoints: '["page_fault"]' },
      { id: 'q3', knowledgePoints: '["memory"]' },
    ],
    answerResults: [
      { questionId: 'q1', isCorrect: false },
      { questionId: 'q2', isCorrect: true },
      { questionId: 'q3', isCorrect: false },
    ],
  });

  it('aggregates incorrect answers only within the unit knowledge tags', () => {
    expect(diagnosis.weakPoints).toEqual([
      { tag: 'memory', incorrect: 2, total: 2, errorRate: 100 },
      { tag: 'virtual_memory', incorrect: 1, total: 1, errorRate: 100 },
    ]);
    expect(diagnosis.nextAction.kind).toBe('review_then_retry');
  });

  it('maps weak tags to the most specific published knowledge cards', () => {
    const cards = selectFoundationRemediationCards(diagnosis.weakPoints, [
      {
        id: 'virtual-memory',
        title: '虚拟内存与缺页',
        source: 'cards/virtual-memory.md',
        tags: ['memory', 'virtual_memory'],
        questionTags: ['virtual_memory', 'memory', 'page_fault'],
      },
      {
        id: 'ownership',
        title: '所有权',
        source: 'cards/ownership.md',
        tags: ['rust', 'ownership'],
        questionTags: ['ownership'],
      },
    ]);

    expect(cards).toEqual([
      {
        id: 'virtual-memory',
        title: '虚拟内存与缺页',
        source: 'cards/virtual-memory.md',
        matchedTags: ['memory', 'virtual_memory'],
      },
    ]);
  });
});
