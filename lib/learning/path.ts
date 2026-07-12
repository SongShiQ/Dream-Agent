/**
 * 训练营学习地图（类多邻国路径感，但按阶段/实验组织）
 */

import { STAGE_ORDER, STAGE_LABELS, STAGE_LABS, type StageId } from '@/lib/adaptive/stage';
import { STAGE_CAMP } from '@/lib/plan/template';

export type PathNodeStatus = 'done' | 'current' | 'locked';

export type PathNode = {
  id: string;
  stage: string;
  label: string;
  focus: string;
  labs: string[];
  practiceTags: string[];
  status: PathNodeStatus;
  index: number;
};

export type TodayStepMode =
  | 'assess'
  | 'quiz'
  | 'practice'
  | 'plan'
  | 'chat'
  | 'wrongbook'
  | 'lab';

export type TodayStep = {
  id: string;
  title: string;
  detail: string;
  /** 点击后跳转的模式 */
  mode: TodayStepMode;
  primary?: boolean;
};

export function buildPathNodes(currentStage: string): PathNode[] {
  const cur = STAGE_ORDER.indexOf(currentStage as StageId);
  const idx = cur >= 0 ? cur : 0;

  return STAGE_ORDER.map((stage, i) => {
    const camp = STAGE_CAMP[stage];
    let status: PathNodeStatus = 'locked';
    if (i < idx) status = 'done';
    else if (i === idx) status = 'current';
    return {
      id: stage,
      stage,
      label: STAGE_LABELS[stage] || stage,
      focus: camp?.focus || '',
      labs: STAGE_LABS[stage] || camp?.labs || [],
      practiceTags: camp?.practiceTags || [],
      status,
      index: i,
    };
  });
}

function stageLabs(stage: string): string[] {
  const camp = STAGE_CAMP[stage];
  return STAGE_LABS[stage] || camp?.labs || [];
}

function stageTags(stage: string): string[] {
  return STAGE_CAMP[stage]?.practiceTags || [];
}

function labHint(stage: string): string {
  const labs = stageLabs(stage);
  if (labs.length === 0) return '本阶段以概念与工具为主';
  return `对应 lab：${labs.slice(0, 2).join('、')}`;
}

export function buildTodaySteps(opts: {
  totalQuestions: number;
  weakPoints: string[];
  currentStage: string;
  hasPlan?: boolean;
}): TodayStep[] {
  const { totalQuestions, weakPoints, currentStage, hasPlan } = opts;
  const isNew = totalQuestions === 0;
  const hasWeak = weakPoints.length > 0;
  const labs = stageLabs(currentStage);
  const tags = stageTags(currentStage);
  const tagHint = tags.slice(0, 3).join('、') || 'process、memory';
  const primaryLab = labs[0];

  if (isNew) {
    return [
      {
        id: 's1',
        title: '水平摸底（约 5 题）',
        detail: `校准起点 · 阶段将对齐 OpenCamp（${STAGE_LABELS[currentStage] || currentStage}）`,
        mode: 'assess',
        primary: true,
      },
      {
        id: 's2',
        title: '练习 5 题打底',
        detail: `优先标签：${tagHint} · ${labHint(currentStage)}`,
        mode: 'quiz',
      },
      {
        id: 's3',
        title: primaryLab ? `了解实验：${primaryLab}` : '生成今日计划',
        detail: primaryLab
          ? '打开实验反馈页，对照 rCore 文档与静态检查'
          : '自动给出今日任务与本周目标',
        mode: primaryLab ? 'lab' : 'plan',
      },
    ];
  }

  if (hasWeak) {
    return [
      {
        id: 's1',
        title: '卡住一键过关 · 3 题',
        detail: `薄弱：${weakPoints.slice(0, 3).join('、')} · 1 卡片 + 3 相似题 · ${labHint(currentStage)}`,
        mode: 'practice',
        primary: true,
      },
      {
        id: 's2',
        title: '订正错题本',
        detail: '看解析后可再点「一键过关 · 3 题」',
        mode: 'wrongbook',
      },
      {
        id: 's3',
        title: primaryLab ? `推进实验 ${primaryLab}` : '问 1 个卡点',
        detail: primaryLab
          ? 'VS Code 写代码；CLI 用网页同一 student id 提交'
          : '智能问答会带上知识卡片与你的档案',
        mode: primaryLab ? 'lab' : 'chat',
      },
    ];
  }

  return [
    {
      id: 's1',
      title: '继续练习 5 题',
      detail: `阶段标签：${tagHint} · ${labHint(currentStage)}`,
      mode: 'quiz',
      primary: true,
    },
    {
      id: 's2',
      title: hasPlan ? '勾选今日计划' : '生成今日计划',
      detail: hasPlan
        ? `完成可勾选任务${primaryLab ? `（含 ${primaryLab}）` : ''}`
        : '一键生成阶段相关任务与 lab 线索',
      mode: 'plan',
    },
    {
      id: 's3',
      title: primaryLab ? `实验检查：${primaryLab}` : '复盘一个概念',
      detail: primaryLab
        ? '静态分析 + 对照讲义；概念题回网页练'
        : '用问答讲清楚，或去专项训练加深',
      mode: primaryLab ? 'lab' : 'chat',
    },
  ];
}
