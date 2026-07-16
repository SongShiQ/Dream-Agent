import { describe, it, expect } from 'vitest';
import {
  evaluateStageUpgrade,
  nextStage,
  normalizeStage,
  STAGE_ORDER,
} from '@/lib/adaptive/stage';

describe('nextStage', () => {
  it('walks fine-grained pre_study path', () => {
    expect(nextStage('pre_study_theory')).toBe('pre_study_process');
    expect(nextStage('pre_study_process')).toBe('pre_study_memory');
    expect(nextStage('project')).toBeNull();
  });

  it('normalizes legacy basic/professional', () => {
    expect(normalizeStage('basic')).toBe('basic_batch');
    expect(normalizeStage('professional')).toBe('prof_address');
    expect(nextStage('basic')).toBe('basic_trap');
  });

  it('has enough steps so camp is not rushed', () => {
    expect(STAGE_ORDER.length).toBeGreaterThanOrEqual(12);
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
    expect(r.suggestedStage).toBe('pre_study_process');
  });

  it('not eligible when accuracy low', () => {
    const r = evaluateStageUpgrade({
      currentStage: 'basic_batch',
      totalQuestions: 20,
      correctAnswers: 5,
      recentAccuracy: 0.4,
      weakPointsCount: 0,
    });
    expect(r.eligible).toBe(false);
  });

  it('stricter weak points on fine stages', () => {
    const r = evaluateStageUpgrade({
      currentStage: 'pre_study_theory',
      totalQuestions: 10,
      correctAnswers: 9,
      recentAccuracy: 0.9,
      weakPointsCount: 3,
    });
    expect(r.eligible).toBe(false);
  });
});
