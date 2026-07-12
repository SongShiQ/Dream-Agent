import { describe, it, expect } from 'vitest';
import { buildTemplatePlan } from '@/lib/plan/template';

describe('buildTemplatePlan', () => {
  it('builds tasks with weak points', () => {
    const plan = buildTemplatePlan({
      currentStage: 'pre_study_theory',
      weakPoints: ['process', 'memory'],
      totalQuestions: 4,
      correctAnswers: 1,
    });
    expect(plan.dailyTasks.length).toBeGreaterThanOrEqual(3);
    expect(plan.weeklyGoals.length).toBeGreaterThan(0);
    expect(plan.source).toBe('template');
    expect(plan.dailyTasks.some((t) => t.task.includes('process'))).toBe(true);
    expect(plan.stageLabel).toBeTruthy();
  });

  it('includes labs for professional stage', () => {
    const plan = buildTemplatePlan({
      currentStage: 'professional',
      weakPoints: [],
      totalQuestions: 10,
      correctAnswers: 8,
    });
    expect(plan.labs.length).toBeGreaterThan(0);
    expect(plan.dailyTasks.some((t) => t.type === 'lab')).toBe(true);
  });
});
