/** 阶段升级建议（规则，非 LLM）— 细粒度 OpenCamp 路径 */

export const STAGE_ORDER = [
  // 导学（细拆）
  'pre_study_theory',
  'pre_study_process',
  'pre_study_memory',
  'pre_study_rust',
  'pre_study_rust_adv',
  'pre_study_tools',
  // 基础（lab1 前后）
  'basic_batch',
  'basic_trap',
  // 专业（按 lab 拆）
  'prof_address',
  'prof_process',
  'prof_fs',
  'prof_concurrency',
  // 项目
  'project_intro',
  'project',
] as const;

export type StageId = (typeof STAGE_ORDER)[number];

/** 旧阶段 id → 新细粒度（兼容库里已有学员） */
export const STAGE_LEGACY_MAP: Record<string, string> = {
  basic: 'basic_batch',
  professional: 'prof_address',
  // 已是新 id 的保持不变
};

export function normalizeStage(stage: string): string {
  return STAGE_LEGACY_MAP[stage] || stage;
}

export const STAGE_LABELS: Record<string, string> = {
  pre_study_theory: '导学·OS 总览与中断',
  pre_study_process: '导学·进程与调度',
  pre_study_memory: '导学·内存与虚存入门',
  pre_study_rust: '导学·Rust 语法与所有权',
  pre_study_rust_adv: '导学·Rust 错误处理与类型',
  pre_study_tools: '导学·工具链与读代码',
  basic_batch: '基础·批处理 OS',
  basic_trap: '基础·Trap 与系统调用',
  prof_address: '专业·地址空间 (lab2)',
  prof_process: '专业·进程管理 (lab3)',
  prof_fs: '专业·文件系统 (lab4)',
  prof_concurrency: '专业·并发 (lab5)',
  project_intro: '项目·组件化串讲',
  project: '项目·实现与答辩',
  // legacy 显示
  basic: '基础阶段（旧）',
  professional: '专业阶段（旧）',
};

/** 大章分组（地图 UI 用） */
export const STAGE_CHAPTERS: {
  id: string;
  label: string;
  stages: string[];
}[] = [
  {
    id: 'ch_pre',
    label: '导学大章',
    stages: [
      'pre_study_theory',
      'pre_study_process',
      'pre_study_memory',
      'pre_study_rust',
      'pre_study_rust_adv',
      'pre_study_tools',
    ],
  },
  {
    id: 'ch_basic',
    label: '基础大章',
    stages: ['basic_batch', 'basic_trap'],
  },
  {
    id: 'ch_prof',
    label: '专业大章',
    stages: ['prof_address', 'prof_process', 'prof_fs', 'prof_concurrency'],
  },
  {
    id: 'ch_proj',
    label: '项目大章',
    stages: ['project_intro', 'project'],
  },
];

/** 阶段对应 OpenCamp / rCore 实验线索 */
export const STAGE_LABS: Record<string, string[]> = {
  pre_study_theory: [],
  pre_study_process: [],
  pre_study_memory: [],
  pre_study_rust: [],
  pre_study_rust_adv: [],
  pre_study_tools: ['env-setup'],
  basic_batch: ['lab1-batch'],
  basic_trap: ['lab1-batch'],
  prof_address: ['lab2-address'],
  prof_process: ['lab3-process'],
  prof_fs: ['lab4-filesystem'],
  prof_concurrency: ['lab5-concurrency'],
  project_intro: ['lab-compose'],
  project: ['project-final'],
  basic: ['lab1-batch'],
  professional: ['lab2-address', 'lab3-process', 'lab4-filesystem', 'lab5-concurrency'],
};

/** 阶段默认练习标签（抽题/计划） */
export const STAGE_PRACTICE_TAGS: Record<string, string[]> = {
  pre_study_theory: ['overview', 'interrupt', 'process'],
  pre_study_process: ['process', 'scheduling', 'state', 'pcb'],
  pre_study_memory: ['memory', 'virtual_memory', 'page_fault'],
  pre_study_rust: ['rust', 'ownership', 'borrow'],
  pre_study_rust_adv: ['rust', 'ownership', 'lifetime'],
  pre_study_tools: ['rust', 'syscall', 'modules'],
  basic_batch: ['trap', 'syscall', 'rust'],
  basic_trap: ['trap', 'syscall', 'interrupt'],
  prof_address: ['virtual_memory', 'page_fault', 'memory'],
  prof_process: ['process', 'fork', 'pcb', 'scheduling'],
  prof_fs: ['filesystem', 'inode'],
  prof_concurrency: ['concurrency', 'lock', 'deadlock', 'spinlock'],
  project_intro: ['process', 'memory', 'concurrency'],
  project: ['process', 'memory', 'filesystem', 'concurrency'],
};

export function stageLabel(stage: string): string {
  const n = normalizeStage(stage);
  return STAGE_LABELS[n] || STAGE_LABELS[stage] || stage;
}

export function nextStage(current: string): string | null {
  const cur = normalizeStage(current);
  const i = STAGE_ORDER.indexOf(cur as StageId);
  if (i < 0) return STAGE_ORDER[0];
  if (i >= STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[i + 1];
}

export function chapterOf(stage: string): string {
  const n = normalizeStage(stage);
  for (const ch of STAGE_CHAPTERS) {
    if (ch.stages.includes(n)) return ch.label;
  }
  return '训练营';
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
 * 细粒度升级：每小步要求更扎实，避免「导学一下就项目」
 * - 累计答题 ≥ 6（每小阶段）
 * - 近况正确率 ≥ 0.72
 * - 薄弱点 ≤ 2
 */
export function evaluateStageUpgrade(input: StageUpgradeInput): StageUpgradeResult {
  const current = normalizeStage(input.currentStage);
  const suggested = nextStage(current);
  if (!suggested) {
    return {
      eligible: false,
      suggestedStage: null,
      reason: '已在最高阶段',
    };
  }

  const reasons: string[] = [];
  if (input.totalQuestions < 6) {
    reasons.push(`本阶段累计答题需 ≥6（当前 ${input.totalQuestions}）`);
  }
  if (input.recentAccuracy < 0.72) {
    reasons.push(
      `近 20 题正确率需 ≥72%（当前 ${Math.round(input.recentAccuracy * 100)}%）`
    );
  }
  if (input.weakPointsCount > 2) {
    reasons.push(`薄弱点需 ≤2（当前 ${input.weakPointsCount}）`);
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
    reason: `表现稳定，建议从「${stageLabel(current)}」进入「${stageLabel(suggested)}」`,
  };
}
