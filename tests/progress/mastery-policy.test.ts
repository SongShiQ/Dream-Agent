import { describe, expect, it } from 'vitest';
import {
  selectActionableFoundationUnit,
  selectPrimaryLearningTask,
  resolveRecommendedFoundationUnitId,
  type ActionableFoundationUnit,
} from '@/lib/progress/mastery-policy';

function unit(
  id: string,
  status: ActionableFoundationUnit['status'],
  required = true
): ActionableFoundationUnit {
  return {
    unit: { id, title: id, required, requiredCorrectRate: 80 },
    status,
  };
}

describe('mastery primary-task policy', () => {
  it('does not invent a Rust recommendation when no real weak point exists', () => {
    const mapper = (points: string[]) => points.includes('memory') ? 'memory' : 'rust-basics';
    expect(resolveRecommendedFoundationUnitId([], mapper)).toBeNull();
    expect(resolveRecommendedFoundationUnitId(['memory'], mapper)).toBe('memory');
  });

  it('continues an in-progress unit when there is no evidence-based recommendation', () => {
    const selected = selectActionableFoundationUnit(
      [unit('rust-basics', 'missing'), unit('os-overview', 'in_progress')],
      null
    );
    expect(selected?.unit.id).toBe('os-overview');
  });

  it('never recommends a locked weak-point unit', () => {
    const selected = selectActionableFoundationUnit(
      [unit('locked-weak', 'locked'), unit('open', 'missing')],
      'locked-weak'
    );
    expect(selected?.unit.id).toBe('open');
  });

  it('prioritizes an actionable required unit before an unlocked gate', () => {
    const task = selectPrimaryLearningTask({
      foundationUnits: [unit('memory', 'missing')],
      allRequiredFoundationMastered: false,
      recommendedUnitId: 'memory',
      gates: [{ id: 'env-setup', title: 'Env', progress: { status: 'unlocked' } }],
      fallbackStep: null,
    });
    expect(task?.id).toBe('foundation:memory');
    expect(task?.evidenceRequired).toContain('80%');
  });

  it('advances to an unlocked OJ gate after foundation mastery', () => {
    const task = selectPrimaryLearningTask({
      foundationUnits: [unit('memory', 'mastered')],
      allRequiredFoundationMastered: true,
      gates: [{ id: 'env-setup', title: 'Env', progress: { status: 'unlocked' } }],
      fallbackStep: null,
    });
    expect(task).toMatchObject({ id: 'gate:env-setup', mode: 'lab' });
  });

  it('prioritizes a due deterministic review after foundation mastery', () => {
    const task = selectPrimaryLearningTask({
      foundationUnits: [unit('memory', 'mastered')],
      allRequiredFoundationMastered: true,
      gates: [{ id: 'lab2', title: 'Lab2', progress: { status: 'unlocked' } }],
      dueReviews: [
        {
          targetType: 'foundation_unit',
          targetId: 'memory',
          title: '内存与虚存',
          dueDate: '2026-07-18',
          daysOverdue: 1,
        },
      ],
    });
    expect(task).toMatchObject({
      id: 'review:foundation_unit:memory',
      mode: 'practice',
    });
    expect(task?.evidenceRequired).toContain('不替代 mastered/AC');
  });

  it('does not let a due review preempt unfinished required foundation', () => {
    const task = selectPrimaryLearningTask({
      foundationUnits: [unit('memory', 'missing')],
      allRequiredFoundationMastered: false,
      gates: [],
      dueReviews: [
        {
          targetType: 'gate',
          targetId: 'old-gate',
          title: '旧关卡',
          dueDate: '2026-07-01',
          daysOverdue: 18,
        },
      ],
    });
    expect(task?.id).toBe('foundation:memory');
  });

  it('falls back to a personal task instead of recommending a locked gate', () => {
    const task = selectPrimaryLearningTask({
      foundationUnits: [],
      allRequiredFoundationMastered: true,
      gates: [{ id: 'locked', title: 'Locked', progress: { status: 'locked' } }],
      fallbackStep: { id: 's1', title: 'Review', mode: 'chat' },
    });
    expect(task).toMatchObject({ id: 's1', mode: 'chat' });
  });
});
