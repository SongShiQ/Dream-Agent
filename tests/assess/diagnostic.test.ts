import { describe, it, expect } from 'vitest';
import {
  accuracyToStage,
  classifyQuestionDims,
  scoreDiagnostic,
  weakPointsToRecommendedUnit,
} from '@/lib/assess/diagnostic';
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
    expect(accuracyToStage(0.9)).toBe('basic_trap');
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
    expect(result.recommendedStage).toBe(result.stage);
    expect(result.recommendedUnit).toBe('rust-ownership-result');
    expect(result.summary.length).toBeGreaterThan(10);
  });
});

describe('diagnostic recommendations', () => {
  it('classifies question dimensions from knowledge points', () => {
    expect(classifyQuestionDims(q({ id: 'r', answer: 'A', knowledgePoints: '["rust"]' }))).toEqual([
      'rust',
    ]);
    expect(classifyQuestionDims(q({ id: 'c', answer: 'A', knowledgePoints: '["syscall"]' }))).toEqual([
      'coding',
    ]);
    expect(classifyQuestionDims(q({ id: 't', answer: 'A', knowledgePoints: '["memory"]' }))).toEqual([
      'theory',
    ]);
  });

  it('maps weak points to a concrete foundation unit', () => {
    expect(weakPointsToRecommendedUnit(['borrow'])).toBe('rust-ownership-result');
    expect(weakPointsToRecommendedUnit(['page_fault'])).toBe('memory-virtual-memory');
    expect(weakPointsToRecommendedUnit(['process'])).toBe('process-scheduling');
  });
});
