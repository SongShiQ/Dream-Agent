import { describe, it, expect } from 'vitest';
import { buildPathNodes, buildTodaySteps } from '@/lib/learning/path';
import {
  localDateKey,
  stepsFingerprint,
} from '@/lib/learning/today-progress';

describe('buildPathNodes', () => {
  it('marks current without inferring previous stages as done', () => {
    const nodes = buildPathNodes('basic_batch');
    expect(nodes.length).toBeGreaterThanOrEqual(12);
    const cur = nodes.find((n) => n.stage === 'basic_batch');
    expect(cur?.status).toBe('current');
    expect(nodes[0].status).toBe('locked');
    expect(nodes[nodes.length - 1].status).toBe('locked');
  });

  it('marks stages done only when mastery evidence exists', () => {
    const nodes = buildPathNodes('basic_batch', {
      masteredStages: ['pre_study_theory'],
    });
    expect(nodes.find((n) => n.stage === 'pre_study_theory')?.status).toBe('done');
    expect(nodes.find((n) => n.stage === 'pre_study_process')?.status).toBe('locked');
  });

  it('maps legacy basic to basic_batch current', () => {
    const nodes = buildPathNodes('basic');
    const cur = nodes.find((n) => n.status === 'current');
    expect(cur?.stage).toBe('basic_batch');
  });
});

describe('buildTodaySteps', () => {
  it('gives assess first for new users', () => {
    const steps = buildTodaySteps({
      totalQuestions: 0,
      weakPoints: [],
      currentStage: 'pre_study_theory',
    });
    expect(steps[0].mode).toBe('assess');
    expect(steps.length).toBe(3);
  });

  it('prioritizes weak points practice', () => {
    const steps = buildTodaySteps({
      totalQuestions: 5,
      weakPoints: ['process'],
      currentStage: 'basic',
    });
    expect(steps[0].mode).toBe('practice');
    expect(steps[0].title).toMatch(/一键过关|3/);
    expect(steps[1].mode).toBe('wrongbook');
    // basic 阶段有 lab1-batch → 第三步绑实验
    expect(steps[2].mode).toBe('lab');
  });

  it('binds lab hint for professional stage when no weak points', () => {
    const steps = buildTodaySteps({
      totalQuestions: 10,
      weakPoints: [],
      currentStage: 'professional',
      hasPlan: true,
    });
    expect(steps[0].mode).toBe('quiz');
    expect(steps[2].mode).toBe('lab');
    expect(steps[2].detail).toMatch(/静态分析|网页/);
  });
});

describe('today-progress helpers', () => {
  it('builds stable date and fingerprint', () => {
    expect(localDateKey(new Date('2026-07-13T12:00:00'))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const fp1 = stepsFingerprint({
      currentStage: 'basic',
      totalQuestions: 5,
      weakPoints: ['process'],
      stepIds: ['s1', 's2', 's3'],
    });
    const fp2 = stepsFingerprint({
      currentStage: 'basic',
      totalQuestions: 5,
      weakPoints: ['process'],
      stepIds: ['s1', 's2', 's3'],
    });
    expect(fp1).toBe(fp2);
    const fp3 = stepsFingerprint({
      currentStage: 'basic',
      totalQuestions: 5,
      weakPoints: [],
      stepIds: ['s1', 's2', 's3'],
    });
    expect(fp3).not.toBe(fp1);
  });
});
