// Examiner Agent - AI 出题（显式调用，不默认替代经典题库）

import { generateObject } from 'ai';
import { z } from 'zod';
import { getLLMProvider } from '../llm/factory';
import type { FeedbackMode } from './types';
import { stageLabel } from '@/lib/adaptive/stage';

/** 强制选择题为主，保证前端有 options 可渲染 */
const QuestionSchema = z.object({
  type: z.enum(['choice', 'fill']).describe('优先 choice'),
  content: z.string().describe('题干，可用简单 Markdown，勿只输出标题'),
  options: z
    .array(z.string())
    .min(4)
    .max(4)
    .describe('必须 4 项，且每项以 A. B. C. D. 开头'),
  answer: z
    .string()
    .describe('仅一个字母 A/B/C/D，不要写选项全文'),
  explanation: z
    .string()
    .describe('解析，说明为何正确；可用 Markdown'),
  knowledgePoints: z.array(z.string()).describe('英文短标签，如 process, fork'),
  difficulty: z.number().min(0).max(100),
});

export type Question = z.infer<typeof QuestionSchema>;

interface ExamOptions {
  studentId: string;
  currentDifficulty: number;
  weakPoints: string[];
  stage: string;
  feedbackMode?: FeedbackMode;
  /** 强制题型 */
  preferType?: 'choice' | 'fill';
}

function getDifficultyLabel(difficulty: number): string {
  if (difficulty < 30) return '简单';
  if (difficulty < 60) return '中等';
  if (difficulty < 80) return '困难';
  return '专家';
}

/** 规范化 AI 输出，保证 choice 有 4 个带字母选项 */
export function normalizeGeneratedQuestion(raw: Question): Question {
  const letters = ['A', 'B', 'C', 'D'];
  let type: Question['type'] = raw.type === 'fill' ? 'fill' : 'choice';
  let options = [...(raw.options || [])];
  let answer = String(raw.answer || 'A').trim();

  if (type === 'choice') {
    while (options.length < 4) {
      options.push(`${letters[options.length]}. （待补充选项）`);
    }
    options = options.slice(0, 4).map((o, i) => {
      const t = String(o).trim();
      if (/^[A-Da-d][\.、\)]\s*/.test(t)) {
        const rest = t.replace(/^[A-Da-d][\.、\)]\s*/, '');
        return `${letters[i]}. ${rest}`;
      }
      if (/^[A-Da-d]\s+/.test(t)) {
        return `${letters[i]}. ${t.slice(2).trim()}`;
      }
      return `${letters[i]}. ${t}`;
    });

    const al = answer.charAt(0).toUpperCase();
    if (/^[A-D]$/.test(al)) {
      answer = al;
    } else {
      const hit = options.findIndex((o) => {
        const body = o.replace(/^[A-D]\.\s*/, '');
        return body && (answer.includes(body) || body.includes(answer));
      });
      answer = hit >= 0 ? letters[hit] : 'A';
    }
  }

  return {
    type,
    content: String(raw.content || '（无题干）').trim(),
    options: type === 'choice' ? options : [],
    answer,
    explanation: String(raw.explanation || '请结合教材理解本题。').trim(),
    knowledgePoints:
      raw.knowledgePoints?.length > 0
        ? raw.knowledgePoints.map(String)
        : ['general'],
    difficulty: Math.max(0, Math.min(100, Number(raw.difficulty) || 50)),
  };
}

export async function generateQuestion({
  currentDifficulty,
  weakPoints,
  stage,
  preferType = 'choice',
}: ExamOptions): Promise<Question> {
  const llm = getLLMProvider('examiner');
  const label = stageLabel(stage);
  const diff = Math.max(20, Math.min(85, currentDifficulty || 50));

  const { object } = await generateObject({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    model: llm as any,
    schema: QuestionSchema,
    prompt: `你是 OpenCamp OS 训练营出题老师。请生成 **1 道${preferType === 'fill' ? '填空' : '四选一选择'}题**。

## 约束（必须遵守）
1. type 必须是 "${preferType}"
2. 若是 choice：options **恰好 4 个字符串**，格式严格为：
   "A. …"
   "B. …"
   "C. …"
   "D. …"
3. answer **只能是** "A" 或 "B" 或 "C" 或 "D" 单个字母
4. content 为完整题干（中文），不要只写标题
5. explanation 说明为何正确、其它选项错在哪（中文，可用简单 Markdown）
6. knowledgePoints 用英文短标签，优先：${weakPoints.length ? weakPoints.join(', ') : 'process, memory, trap, ownership'}
7. difficulty 填 0-100 的整数，目标约 ${diff}（${getDifficultyLabel(diff)}）

## 学情
- 学员阶段：${stage}（${label}）
- 薄弱/焦点：${weakPoints.length ? weakPoints.join('、') : '综合巩固'}

## 内容范围
OpenCamp / rCore：操作系统概念、Rust 与内核实验相关；不要超纲到无关领域。

请直接生成符合 schema 的题目。`,
  });

  return normalizeGeneratedQuestion(object as Question);
}
