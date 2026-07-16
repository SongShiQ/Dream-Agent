/**
 * 训练营学习地图 — 细粒度阶段 + 大章分组
 */

import {
  STAGE_ORDER,
  STAGE_LABELS,
  STAGE_LABS,
  STAGE_CHAPTERS,
  normalizeStage,
  stageLabel,
  type StageId,
} from '@/lib/adaptive/stage';
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
  chapter: string;
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
  mode: TodayStepMode;
  primary?: boolean;
};

export function buildPathNodes(
  currentStage: string,
  opts: { masteredStages?: string[] } = {}
): PathNode[] {
  const curNorm = normalizeStage(currentStage);
  const cur = STAGE_ORDER.indexOf(curNorm as StageId);
  const idx = cur >= 0 ? cur : 0;
  const mastered = new Set(opts.masteredStages || []);

  return STAGE_ORDER.map((stage, i) => {
    const camp = STAGE_CAMP[stage];
    let status: PathNodeStatus = 'locked';
    if (mastered.has(stage)) status = 'done';
    else if (i === idx) status = 'current';
    const chapter =
      STAGE_CHAPTERS.find((c) => c.stages.includes(stage))?.label || '训练营';
    return {
      id: stage,
      stage,
      label: STAGE_LABELS[stage] || stage,
      focus: camp?.focus || '',
      labs: STAGE_LABS[stage] || camp?.labs || [],
      practiceTags: camp?.practiceTags || [],
      status,
      index: i,
      chapter,
    };
  });
}

function stageLabs(stage: string): string[] {
  const n = normalizeStage(stage);
  const camp = STAGE_CAMP[n];
  return STAGE_LABS[n] || camp?.labs || [];
}

function stageTags(stage: string): string[] {
  const n = normalizeStage(stage);
  return STAGE_CAMP[n]?.practiceTags || [];
}

function labHint(stage: string): string {
  const labs = stageLabs(stage);
  if (labs.length === 0) return '本阶段以概念与阅读为主';
  return `对应 lab：${labs.slice(0, 2).join('、')}`;
}

export function buildTodaySteps(opts: {
  totalQuestions: number;
  weakPoints: string[];
  currentStage: string;
  hasPlan?: boolean;
}): TodayStep[] {
  const { totalQuestions, weakPoints, hasPlan } = opts;
  const currentStage = normalizeStage(opts.currentStage);
  const isNew = totalQuestions === 0;
  const hasWeak = weakPoints.length > 0;
  const labs = stageLabs(currentStage);
  const tags = stageTags(currentStage);
  const tagHint = tags.slice(0, 3).join('、') || 'process、memory';
  const primaryLab = labs[0];
  const label = stageLabel(currentStage);

  if (isNew) {
    return [
      {
        id: 's1',
        title: '水平摸底（约 5 题）',
        detail: `校准起点 · 当前建议从「${label}」附近开始`,
        mode: 'assess',
        primary: true,
      },
      {
        id: 's2',
        title: '经典题库练 5 题',
        detail: `标签：${tagHint} · 练习模式选「经典题库」`,
        mode: 'quiz',
      },
      {
        id: 's3',
        title: primaryLab ? `了解实验：${primaryLab}` : '生成今日计划',
        detail: primaryLab
          ? '打开实验反馈，对照 rCore 文档'
          : '自动给出本阶段小步任务',
        mode: primaryLab ? 'lab' : 'plan',
      },
    ];
  }

  if (hasWeak) {
    return [
      {
        id: 's1',
        title: '经典题库 · 薄弱过关 3 题',
        detail: `薄弱：${weakPoints.slice(0, 3).join('、')} · ${labHint(currentStage)}`,
        mode: 'practice',
        primary: true,
      },
      {
        id: 's2',
        title: '换练法：错题订正或 AI 变式 1～2 题',
        detail: '练习模式可切换「AI 出题」加练，勿跳过经典题',
        mode: 'wrongbook',
      },
      {
        id: 's3',
        title: primaryLab ? `推进 ${primaryLab}` : '问答复盘 1 概念',
        detail: primaryLab
          ? 'VS Code 写代码；CLI 用同一 student id'
          : '用自己的话讲清再对照卡片',
        mode: primaryLab ? 'lab' : 'chat',
      },
    ];
  }

  return [
    {
      id: 's1',
      title: `巩固「${label}」· 经典题 5 道`,
      detail: `标签：${tagHint} · ${labHint(currentStage)}`,
      mode: 'quiz',
      primary: true,
    },
    {
      id: 's2',
      title: hasPlan ? '勾选今日计划' : '生成今日计划',
      detail: hasPlan
        ? `完成任务${primaryLab ? `（含 ${primaryLab}）` : ''}`
        : '本阶段小步任务 + lab 线索',
      mode: 'plan',
    },
    {
      id: 's3',
      title: primaryLab ? `实验检查：${primaryLab}` : 'AI 变式或概念默写',
      detail: primaryLab
        ? '静态分析 + 讲义；概念题回经典题库'
        : '练习模式可开「AI 出题」做变式，或去问答复盘',
      mode: primaryLab ? 'lab' : 'quiz',
    },
  ];
}
