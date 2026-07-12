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

/** 按正确率映射建议阶段（对齐 schema Stage） */
export function accuracyToStage(accuracy: number): string {
  if (accuracy >= 0.85) return 'basic';
  if (accuracy >= 0.65) return 'pre_study_tools';
  if (accuracy >= 0.4) return 'pre_study_rust';
  return 'pre_study_theory';
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
    const dims = new Set(kps.map(classifyKp));
    if (dims.size === 0) dims.add('theory');

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

  const summary = [
    `摸底完成：${correct}/${total} 正确（${Math.round(accuracy * 100)}%）。`,
    `理论 ${theory}、编码 ${coding}、Rust ${rust}。`,
    weakPoints.length
      ? `建议优先复习：${weakPoints.join('、')}。`
      : '暂无明显薄弱点，可进入常规练习。',
    `建议阶段：${stage}。`,
  ].join(' ');

  return {
    theory,
    coding,
    rust,
    weakPoints,
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
