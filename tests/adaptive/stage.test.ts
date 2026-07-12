import { describe, it, expect } from 'vitest';
import { evaluateStageUpgrade, nextStage } from '@/lib/adaptive/stage';

describe('nextStage', () => {
  it('returns next or null', () => {
    expect(nextStage('pre_study_theory')).toBe('pre_study_rust');
    expect(nextStage('project')).toBeNull();
  });
});

describe('evaluateStageUpgrade', () => {
  it('eligible when thresholds met', () => {
    const r = evaluateStageUpgrade({
      currentStage: 'pre_study_theory',
      totalQuestions: 10,
      correctAnswers: 8,
      recentAccuracy: 0.8,
      weakPointsCount: 1,
    });
    expect(r.eligible).toBe(true);
    expect(r.suggestedStage).toBe('pre_study_rust');
  });

  it('not eligible when accuracy low', () => {
    const r = evaluateStageUpgrade({
      currentStage: 'basic',
      totalQuestions: 20,
      correctAnswers: 5,
      recentAccuracy: 0.4,
      weakPointsCount: 0,
    });
    expect(r.eligible).toBe(false);
  });
});
