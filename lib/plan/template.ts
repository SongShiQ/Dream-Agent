/** 无 LLM 时的学习计划模板 — 对齐 OpenCamp 阶段与 lab */

import { STAGE_LABELS } from '@/lib/adaptive/stage';

export type PlanTask = {
  id: string;
  task: string;
  type: 'study' | 'practice' | 'review' | 'lab';
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

/** 阶段 → 焦点 / 实验 / 阅读建议 */
export const STAGE_CAMP: Record<
  string,
  { focus: string; labs: string[]; practiceTags: string[] }
> = {
  pre_study_theory: {
    focus: '操作系统基本概念：进程、内存、文件、中断',
    labs: [],
    practiceTags: ['process', 'memory', 'filesystem'],
  },
  pre_study_rust: {
    focus: 'Rust 所有权、借用与错误处理',
    labs: [],
    practiceTags: ['rust', 'ownership', 'borrow'],
  },
  pre_study_tools: {
    focus: '环境、Git、调试与阅读代码',
    labs: ['env-setup'],
    practiceTags: ['rust', 'syscall'],
  },
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
};

export function buildTemplatePlan(opts: {
  currentStage: string;
  weakPoints: string[];
  totalQuestions: number;
  correctAnswers: number;
}): TemplatePlan {
  const stage = opts.currentStage || 'pre_study_theory';
  const camp = STAGE_CAMP[stage] || STAGE_CAMP.pre_study_theory;
  const stageLabel = STAGE_LABELS[stage] || stage;
  const weak = opts.weakPoints.slice(0, 5);
  const accuracy =
    opts.totalQuestions > 0 ? opts.correctAnswers / opts.totalQuestions : 0;

  const dailyTasks: PlanTask[] = [
    {
      id: 't1',
      task: `精读：${camp.focus}`,
      type: 'study',
      estimatedMinutes: 40,
    },
    {
      id: 't2',
      task:
        weak.length > 0
          ? `专项/练习：针对薄弱点 ${weak.join('、')}（侧栏「专项训练」）`
          : `完成 5 道题（标签建议：${camp.practiceTags.slice(0, 3).join('、')}）`,
      type: 'practice',
      estimatedMinutes: 30,
    },
    {
      id: 't3',
      task: '智能问答：用知识库复盘 1 个概念（先自己讲再对照）',
      type: 'review',
      estimatedMinutes: 20,
    },
  ];

  if (camp.labs.length > 0) {
    dailyTasks.push({
      id: 't-lab',
      task: `实验推进：${camp.labs[0]}（对照 rCore-Tutorial 文档）`,
      type: 'lab',
      estimatedMinutes: 60,
    });
  }

  if (accuracy < 0.5 && opts.totalQuestions >= 3) {
    dailyTasks.push({
      id: 't4',
      task: '降难度：打开错题本，只订正不追求刷题量',
      type: 'review',
      estimatedMinutes: 25,
    });
  }

  const weeklyGoals = [
    `巩固阶段「${stageLabel}」：${camp.focus}`,
    weak.length
      ? `薄弱点下降：${weak.slice(0, 3).join('、')}`
      : '练习近 20 题正确率 ≥70%',
    camp.labs.length
      ? `推进实验：${camp.labs.slice(0, 2).join('、')}`
      : '完成 1 次水平摸底，确认阶段建议',
  ];

  const recommendations = [
    '路径：摸底 → 练习/专项 → 错题本 → 问答（知识卡片会注入助教）',
    accuracy >= 0.8
      ? '正确率较高：可尝试升级阶段或进入对应 lab'
      : '正确率一般：优先薄弱点专项与知识卡片',
    '参考：https://github.com/rcore-os/rCore-Tutorial-v3',
  ];

  const estimatedDays = accuracy >= 0.75 ? 7 : accuracy >= 0.5 ? 14 : 21;

  return {
    currentStage: stage,
    stageLabel,
    dailyTasks,
    weeklyGoals,
    estimatedDays,
    recommendations,
    labs: camp.labs,
    focus: camp.focus,
    source: 'template',
  };
}
