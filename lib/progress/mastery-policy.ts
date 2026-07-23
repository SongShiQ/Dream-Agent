export type ActionableFoundationUnit = {
  unit: {
    id: string;
    title: string;
    objective?: string;
    required: boolean;
    requiredCorrectRate: number;
  };
  status: 'locked' | 'missing' | 'in_progress' | 'mastered';
  evidence?: string;
};

export type ActionableGate = {
  id: string;
  title: string;
  progress: { status: string };
};

export type FallbackStep = {
  id: string;
  title: string;
  mode: string;
};

export type ActionableReview = {
  targetType: 'foundation_unit' | 'gate';
  targetId: string;
  title: string;
  dueDate: string;
  daysOverdue: number;
};

export type PrimaryLearningTask = {
  id: string;
  title: string;
  mode: string;
  evidenceRequired: string;
};

export function resolveRecommendedFoundationUnitId(
  weakPoints: string[],
  mapWeakPoints: (points: string[]) => string
): string | null {
  return weakPoints.length > 0 ? mapWeakPoints(weakPoints) : null;
}

export function selectActionableFoundationUnit(
  units: ActionableFoundationUnit[],
  recommendedUnitId?: string | null
): ActionableFoundationUnit | null {
  const actionable = units.filter(
    (item) => item.unit.required && (item.status === 'missing' || item.status === 'in_progress')
  );
  return (
    actionable.find((item) => item.unit.id === recommendedUnitId) ||
    actionable.find((item) => item.status === 'in_progress') ||
    actionable[0] ||
    null
  );
}

export function selectPrimaryLearningTask(opts: {
  foundationUnits: ActionableFoundationUnit[];
  allRequiredFoundationMastered: boolean;
  recommendedUnitId?: string | null;
  gates: ActionableGate[];
  dueReviews?: ActionableReview[];
  fallbackStep?: FallbackStep | null;
}): PrimaryLearningTask | null {
  if (!opts.allRequiredFoundationMastered) {
    const unit = selectActionableFoundationUnit(opts.foundationUnits, opts.recommendedUnitId);
    if (unit) {
      return {
        id: `foundation:${unit.unit.id}`,
        title: `完成微单元：${unit.unit.title}`,
        mode: 'practice',
        evidenceRequired: `高 stakes 小测达到 ${unit.unit.requiredCorrectRate}% 才算 mastered`,
      };
    }
  }

  const review = opts.dueReviews?.[0];
  if (review) {
    return {
      id: `review:${review.targetType}:${review.targetId}`,
      title: `到期复习：${review.title}`,
      mode: review.targetType === 'gate' ? 'lab' : 'practice',
      evidenceRequired:
        review.daysOverdue > 0
          ? `已逾期 ${review.daysOverdue} 天；复习只更新调度，不替代 mastered/AC`
          : '今日到期；复习只更新调度，不替代 mastered/AC',
    };
  }

  const gate = opts.gates.find((item) => item.progress.status === 'unlocked');
  if (gate) {
    return {
      id: `gate:${gate.id}`,
      title: `完成关卡：${gate.title}`,
      mode: 'lab',
      evidenceRequired: '只有 OJ verdict=AC 才能标记 mastered',
    };
  }

  if (opts.fallbackStep) {
    return {
      id: opts.fallbackStep.id,
      title: opts.fallbackStep.title,
      mode: opts.fallbackStep.mode,
      evidenceRequired: '完成个人任务只记录 personal_done',
    };
  }

  return null;
}
