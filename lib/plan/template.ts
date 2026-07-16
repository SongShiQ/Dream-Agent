/** 无 LLM 时的学习计划模板 — 对齐细粒度 OpenCamp 阶段与 lab */

import {
  STAGE_LABELS,
  STAGE_LABS,
  STAGE_PRACTICE_TAGS,
  normalizeStage,
  stageLabel,
} from '@/lib/adaptive/stage';

export type PlanTask = {
  id: string;
  task: string;
  type: 'study' | 'practice' | 'review' | 'lab' | 'assess';
  estimatedMinutes: number;
};

export type TemplatePlan = {
  currentStage: string;
  stageLabel: string;
  dailyTasks: PlanTask[];
  weeklyGoals: string[];
  estimatedDays: number;
  recommendations: string[];
  labs: string[];
  focus: string;
  source: 'template' | 'llm';
};

/** 阶段 → 焦点 / 实验 / 练习标签 */
export const STAGE_CAMP: Record<
  string,
  { focus: string; labs: string[]; practiceTags: string[] }
> = Object.fromEntries(
  Object.keys(STAGE_LABELS)
    .filter((k) => !['basic', 'professional'].includes(k) || k === 'basic' || k === 'professional')
    .map((stage) => {
      const labs = STAGE_LABS[stage] || [];
      const practiceTags = STAGE_PRACTICE_TAGS[stage] || ['process', 'memory'];
      const focus = STAGE_LABELS[stage] || stage;
      return [stage, { focus: `巩固：${focus}`, labs, practiceTags }];
    })
) as Record<string, { focus: string; labs: string[]; practiceTags: string[] }>;

// 覆盖更自然的 focus 文案
Object.assign(STAGE_CAMP, {
  pre_study_theory: {
    focus: 'OS 角色、中断/异常、特权级基本概念',
    labs: [],
    practiceTags: ['overview', 'interrupt', 'process'],
  },
  pre_study_process: {
    focus: '进程三态、PCB、调度直觉',
    labs: [],
    practiceTags: ['process', 'scheduling', 'state', 'pcb'],
  },
  pre_study_memory: {
    focus: '虚拟地址、页表直觉、缺页概念',
    labs: [],
    practiceTags: ['memory', 'virtual_memory', 'page_fault'],
  },
  pre_study_rust: {
    focus: '所有权、借用、移动与引用',
    labs: [],
    practiceTags: ['rust', 'ownership', 'borrow'],
  },
  pre_study_rust_adv: {
    focus: 'Option/Result、结构体枚举、错误处理',
    labs: [],
    practiceTags: ['rust', 'ownership', 'lifetime'],
  },
  pre_study_tools: {
    focus: '环境、Git、调试与阅读 rCore 代码',
    labs: ['env-setup'],
    practiceTags: ['rust', 'syscall'],
  },
  basic_batch: {
    focus: '批处理 OS：加载应用、串行执行',
    labs: ['lab1-batch'],
    practiceTags: ['trap', 'syscall', 'rust'],
  },
  basic_trap: {
    focus: 'Trap 入口、ecall、系统调用分发',
    labs: ['lab1-batch'],
    practiceTags: ['trap', 'syscall', 'interrupt'],
  },
  prof_address: {
    focus: '多级页表、地址空间、权限与缺页',
    labs: ['lab2-address'],
    practiceTags: ['virtual_memory', 'page_fault', 'memory'],
  },
  prof_process: {
    focus: 'fork/wait/exit、调度与 PCB',
    labs: ['lab3-process'],
    practiceTags: ['process', 'fork', 'pcb', 'scheduling'],
  },
  prof_fs: {
    focus: 'inode、目录、读写路径',
    labs: ['lab4-filesystem'],
    practiceTags: ['filesystem', 'inode'],
  },
  prof_concurrency: {
    focus: '锁、临界区、死锁与原子操作',
    labs: ['lab5-concurrency'],
    practiceTags: ['concurrency', 'lock', 'deadlock'],
  },
  project_intro: {
    focus: '组件化 OS 与实验串讲',
    labs: ['lab-compose'],
    practiceTags: ['process', 'memory', 'concurrency'],
  },
  project: {
    focus: '项目实现与答辩准备',
    labs: ['project-final'],
    practiceTags: ['process', 'memory', 'filesystem', 'concurrency'],
  },
  // legacy
  basic: {
    focus: 'Rust 进阶 + 最小 OS（批处理 / trap）',
    labs: ['lab1-batch'],
    practiceTags: ['trap', 'syscall', 'rust'],
  },
  professional: {
    focus: '地址空间、进程、文件系统、并发',
    labs: ['lab2-address', 'lab3-process', 'lab4-filesystem', 'lab5-concurrency'],
    practiceTags: ['virtual_memory', 'process', 'inode', 'lock'],
  },
});

export function buildTemplatePlan(opts: {
  currentStage: string;
  weakPoints: string[];
  totalQuestions: number;
  correctAnswers: number;
}): TemplatePlan {
  const stage = normalizeStage(opts.currentStage || 'pre_study_theory');
  const camp = STAGE_CAMP[stage] || STAGE_CAMP.pre_study_theory;
  const label = stageLabel(stage);
  const weak = opts.weakPoints.slice(0, 5);
  const accuracy =
    opts.totalQuestions > 0 ? opts.correctAnswers / opts.totalQuestions : 0;

  const dailyTasks: PlanTask[] = [
    {
      id: 't1',
      task: `精读本阶段：${camp.focus}`,
      type: 'study',
      estimatedMinutes: 35,
    },
    {
      id: 't2',
      task:
        weak.length > 0
          ? `练习·经典题库：薄弱点 ${weak.join('、')}（可切换 AI 加练）`
          : `练习·经典题库：标签 ${camp.practiceTags.slice(0, 3).join('、')}`,
      type: 'practice',
      estimatedMinutes: 30,
    },
    {
      id: 't3',
      task: '换一种练法：概念默写 / 对比表 / 或 AI 出 2 道变式题',
      type: 'review',
      estimatedMinutes: 20,
    },
  ];

  if (camp.labs.length > 0) {
    dailyTasks.push({
      id: 't-lab',
      task: `实验：${camp.labs[0]}（对照 rCore 文档，网页可静态反馈）`,
      type: 'lab',
      estimatedMinutes: 60,
    });
  } else {
    dailyTasks.push({
      id: 't-chat',
      task: '智能问答：用自己的话讲清 1 个概念，再对照知识卡片',
      type: 'review',
      estimatedMinutes: 15,
    });
  }

  if (accuracy < 0.55 && opts.totalQuestions >= 4) {
    dailyTasks.push({
      id: 't4',
      task: '降难度：错题本订正 + 一键过关 3 题，不追求刷量',
      type: 'review',
      estimatedMinutes: 25,
    });
  }

  const weeklyGoals = [
    `夯实「${label}」：${camp.focus}`,
    weak.length
      ? `薄弱点下降：${weak.slice(0, 3).join('、')}`
      : '本阶段近 15 题正确率 ≥72% 再考虑升阶',
    camp.labs.length
      ? `推进实验：${camp.labs[0]}`
      : '完成 1 次摸底或阶段自测，确认是否升阶',
  ];

  const recommendations = [
    '练习模式可切换「经典题库」与「AI 出题」两条线，建议先经典后 AI 变式',
    accuracy >= 0.8
      ? '正确率较高：可尝试升阶或进入对应 lab'
      : '正确率一般：优先薄弱点与知识卡片，勿跳阶段',
    '参考：https://github.com/rcore-os/rCore-Tutorial-v3',
  ];

  const estimatedDays = accuracy >= 0.75 ? 5 : accuracy >= 0.5 ? 10 : 14;

  return {
    currentStage: stage,
    stageLabel: label,
    dailyTasks,
    weeklyGoals,
    estimatedDays,
    recommendations,
    labs: camp.labs,
    focus: camp.focus,
    source: 'template',
  };
}
