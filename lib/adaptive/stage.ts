/** 阶段升级建议（规则，非 LLM） */

export const STAGE_ORDER = [
  'pre_study_theory',
  'pre_study_rust',
  'pre_study_tools',
  'basic',
  'professional',
  'project_intro',
  'project',
] as const;

export type StageId = (typeof STAGE_ORDER)[number];

export const STAGE_LABELS: Record<string, string> = {
  pre_study_theory: '导学-理论',
  pre_study_rust: '导学-Rust',
  pre_study_tools: '导学-工具',
  basic: '基础阶段',
  professional: '专业阶段',
  project_intro: '项目先导',
  project: '项目阶段',
};

/** 阶段对应 OpenCamp / rCore 实验线索 */
export const STAGE_LABS: Record<string, string[]> = {
  pre_study_theory: [],
  pre_study_rust: [],
  pre_study_tools: ['env-setup'],
  basic: ['lab1-batch'],
  professional: ['lab2-address', 'lab3-process', 'lab4-filesystem', 'lab5-concurrency'],
  project_intro: ['lab-compose'],
  project: ['project-final'],
};

export function stageLabel(stage: string): string {
  return STAGE_LABELS[stage] || stage;
}

export function nextStage(current: string): string | null {
  const i = STAGE_ORDER.indexOf(current as StageId);
  if (i < 0) return STAGE_ORDER[0];
  if (i >= STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[i + 1];
}

export interface StageUpgradeInput {
  currentStage: string;
  totalQuestions: number;
  correctAnswers: number;
  recentAccuracy: number;
  weakPointsCount: number;
}

export interface StageUpgradeResult {
  eligible: boolean;
  suggestedStage: string | null;
  reason: string;
}

/**
 * 升级条件（需同时满足）：
 * - 近况正确率 ≥ 0.7
 * - 累计答题 ≥ 8
 * - 薄弱点 ≤ 3
 * - 存在下一阶段
 */
export function evaluateStageUpgrade(input: StageUpgradeInput): StageUpgradeResult {
  const suggested = nextStage(input.currentStage);
  if (!suggested) {
    return {
      eligible: false,
      suggestedStage: null,
      reason: '已在最高阶段',
    };
  }

  const reasons: string[] = [];
  if (input.totalQuestions < 8) {
    reasons.push(`累计答题需 ≥8（当前 ${input.totalQuestions}）`);
  }
  if (input.recentAccuracy < 0.7) {
    reasons.push(`近 20 题正确率需 ≥70%（当前 ${Math.round(input.recentAccuracy * 100)}%）`);
  }
  if (input.weakPointsCount > 3) {
    reasons.push(`薄弱点需 ≤3（当前 ${input.weakPointsCount}）`);
  }

  if (reasons.length > 0) {
    return {
      eligible: false,
      suggestedStage: suggested,
      reason: reasons.join('；'),
    };
  }

  return {
    eligible: true,
    suggestedStage: suggested,
    reason: `表现稳定，建议从「${STAGE_LABELS[input.currentStage] || input.currentStage}」进入「${STAGE_LABELS[suggested] || suggested}」`,
  };
}
