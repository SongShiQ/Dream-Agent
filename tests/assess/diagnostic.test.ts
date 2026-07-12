import { describe, it, expect } from 'vitest';
import { accuracyToStage, scoreDiagnostic } from '@/lib/assess/diagnostic';
import type { Question } from '@prisma/client';

function q(partial: Partial<Question> & { id: string; answer: string }): Question {
  return {
    type: 'choice',
    difficulty: 40,
    knowledgePoints: '["process"]',
    content: 'q',
    options: '["A. x","B. y"]',
    explanation: 'e',
    stage: 'basic',
    createdAt: new Date(),
    ...partial,
  } as Question;
}

describe('accuracyToStage', () => {
  it('maps accuracy bands', () => {
    expect(accuracyToStage(0.9)).toBe('basic');
    expect(accuracyToStage(0.7)).toBe('pre_study_tools');
    expect(accuracyToStage(0.5)).toBe('pre_study_rust');
    expect(accuracyToStage(0.2)).toBe('pre_study_theory');
  });
});

describe('scoreDiagnostic', () => {
  it('scores and collects weak points', () => {
    const questions = [
      q({ id: '1', answer: 'A', knowledgePoints: '["process"]' }),
      q({ id: '2', answer: 'B', knowledgePoints: '["rust","ownership"]' }),
    ];
    const result = scoreDiagnostic(questions, [
      { questionId: '1', answer: 'A' },
      { questionId: '2', answer: 'A' },
    ]);
    expect(result.correct).toBe(1);
    expect(result.total).toBe(2);
    expect(result.weakPoints).toContain('rust');
    expect(result.summary.length).toBeGreaterThan(10);
  });
});
