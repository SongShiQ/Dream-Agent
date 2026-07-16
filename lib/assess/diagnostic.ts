/** 规则化水平摸底：不依赖 LLM */

import type { Question } from '@prisma/client';
import { gradeAnswer, parseJsonArray } from '@/lib/exam/grade';

export type DimScores = {
  theory: number;
  coding: number;
  rust: number;
};

export type DiagnosticResult = DimScores & {
  weakPoints: string[];
  recommendedStage: string;
  recommendedUnit: string;
  stage: string;
  summary: string;
  total: number;
  correct: number;
  accuracy: number;
};

const THEORY_KP = new Set([
  'process',
  'scheduling',
  'memory',
  'virtual_memory',
  'filesystem',
  'inode',
  'interrupt',
  'trap',
  'state',
  'deadlock',
  'concurrency',
]);
const RUST_KP = new Set(['rust', 'ownership', 'borrow', 'lifetime', 'safe']);
const CODING_KP = new Set(['code', 'syscall', 'fork', 'spinlock', 'lab']);

function classifyKp(kp: string): keyof DimScores {
  const k = kp.toLowerCase();
  if (RUST_KP.has(k) || k.includes('rust') || k.includes('owner')) return 'rust';
  if (CODING_KP.has(k) || k.includes('code') || k.includes('lab')) return 'coding';
  return 'theory';
}

export function classifyQuestionDims(question: Pick<Question, 'knowledgePoints'>): (keyof DimScores)[] {
  const kps = parseJsonArray(question.knowledgePoints);
  const dims = Array.from(new Set(kps.map(classifyKp)));
  return dims.length > 0 ? dims : ['theory'];
}

/** 按正确率映射建议细粒度阶段（避免一下跳到项目） */
export function accuracyToStage(accuracy: number): string {
  if (accuracy >= 0.9) return 'basic_trap';
  if (accuracy >= 0.8) return 'basic_batch';
  if (accuracy >= 0.7) return 'pre_study_tools';
  if (accuracy >= 0.55) return 'pre_study_rust_adv';
  if (accuracy >= 0.4) return 'pre_study_rust';
  if (accuracy >= 0.25) return 'pre_study_process';
  return 'pre_study_theory';
}

export function weakPointsToRecommendedUnit(weakPoints: string[]): string {
  const weak = weakPoints.map((w) => w.toLowerCase());
  if (weak.some((w) => w.includes('rust') || w.includes('owner') || w.includes('borrow'))) {
    return 'rust-ownership-result';
  }
  if (weak.some((w) => w.includes('tool') || w.includes('cargo') || w.includes('git'))) {
    return 'toolchain-code-reading';
  }
  if (weak.some((w) => w.includes('memory') || w.includes('page'))) {
    return 'memory-virtual-memory';
  }
  if (weak.some((w) => w.includes('process') || w.includes('sched') || w.includes('fork'))) {
    return 'process-scheduling';
  }
  if (weak.some((w) => w.includes('trap') || w.includes('interrupt') || w.includes('syscall'))) {
    return 'os-overview-interrupts';
  }
  return 'rust-basics';
}

export function scoreDiagnostic(
  questions: Question[],
  answers: { questionId: string; answer: string }[]
): DiagnosticResult {
  const answerMap = new Map(answers.map((a) => [a.questionId, a.answer]));

  const dim = {
    theory: { hit: 0, total: 0 },
    coding: { hit: 0, total: 0 },
    rust: { hit: 0, total: 0 },
  };
  const weak: string[] = [];
  let correct = 0;

  for (const q of questions) {
    const ua = answerMap.get(q.id) ?? '';
    const options = parseJsonArray(q.options);
    const ok = gradeAnswer(q.type, q.answer, ua, options);
    if (ok) correct++;

    const kps = parseJsonArray(q.knowledgePoints);
    const dims = new Set<keyof DimScores>(classifyQuestionDims(q));

    for (const d of dims) {
      dim[d].total++;
      if (ok) dim[d].hit++;
    }

    if (!ok) {
      weak.push(...kps);
    }
  }

  const total = questions.length;
  const accuracy = total > 0 ? correct / total : 0;

  const score = (d: { hit: number; total: number }) =>
    d.total > 0 ? Math.round((d.hit / d.total) * 100) : Math.round(accuracy * 100);

  const theory = score(dim.theory);
  const coding = score(dim.coding);
  const rust = score(dim.rust);
  const stage = accuracyToStage(accuracy);
  const weakPoints = Array.from(new Set(weak)).slice(0, 12);
  const recommendedUnit = weakPointsToRecommendedUnit(weakPoints);

  const summary = [
    `摸底完成：${correct}/${total} 正确（${Math.round(accuracy * 100)}%）。`,
    `理论 ${theory}、编码 ${coding}、Rust ${rust}。`,
    weakPoints.length
      ? `建议优先复习：${weakPoints.join('、')}。`
      : '暂无明显薄弱点，可进入常规练习。',
    `推荐起点：${stage}；推荐微单元：${recommendedUnit}。`,
  ].join(' ');

  return {
    theory,
    coding,
    rust,
    weakPoints,
    recommendedStage: stage,
    recommendedUnit,
    stage,
    summary,
    total,
    correct,
    accuracy,
  };
}

export function stripAnswers(q: Question) {
  return {
    id: q.id,
    type: q.type,
    content: q.content,
    options: parseJsonArray(q.options),
    knowledgePoints: parseJsonArray(q.knowledgePoints),
    difficulty: q.difficulty,
  };
}
