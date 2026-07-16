import { describe, expect, it } from 'vitest';
import { computeFoundationProgress, type FoundationUnit } from '@/lib/foundation/units';

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
});
