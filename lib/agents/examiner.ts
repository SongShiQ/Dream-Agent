// Examiner Agent - 出题练习

import { generateObject } from 'ai';
import { z } from 'zod';
import { getLLMProvider } from '../llm/factory';
import { AGENT_SYSTEM_PROMPTS } from './config';
import type { FeedbackMode } from './types';

// 题目 Schema
const QuestionSchema = z.object({
  type: z.enum(['choice', 'fill', 'code', 'design']),
  content: z.string().describe('题目内容'),
  options: z.array(z.string()).optional().describe('选择题选项'),
  answer: z.string().describe('参考答案'),
  explanation: z.string().describe('解析'),
  knowledgePoints: z.array(z.string()).describe('知识点标签'),
  difficulty: z.number().min(0).max(100).describe('难度等级'),
});

export type Question = z.infer<typeof QuestionSchema>;

interface ExamOptions {
  studentId: string;
  currentDifficulty: number;
  weakPoints: string[];
  stage: string;
  feedbackMode?: FeedbackMode;
}

// 难度调整
function adjustDifficulty(
  current: number,
  recentAccuracy: number,
  consecutiveCorrect: number,
  consecutiveWrong: number
): number {
  let adjustment = 0;

  if (consecutiveCorrect >= 3) {
    adjustment += 10;
  }
  if (consecutiveWrong >= 2) {
    adjustment -= 15;
  }
  if (recentAccuracy > 0.8) {
    adjustment += 5;
  }
  if (recentAccuracy < 0.5) {
    adjustment -= 10;
  }

  return Math.max(0, Math.min(100, current + adjustment));
}

// 难度标签
function getDifficultyLabel(difficulty: number): string {
  if (difficulty < 30) return '简单';
  if (difficulty < 60) return '中等';
  if (difficulty < 80) return '困难';
  return '专家';
}

export async function generateQuestion({
  studentId,
  currentDifficulty,
  weakPoints,
  stage,
  feedbackMode = 'hybrid',
}: ExamOptions): Promise<Question> {
  // 这里应该从数据库获取学员统计信息
  // 暂时使用默认值
  const recentAccuracy = 0.6;
  const consecutiveCorrect = 1;
  const consecutiveWrong = 0;

  // 调整难度
  const newDifficulty = adjustDifficulty(
    currentDifficulty,
    recentAccuracy,
    consecutiveCorrect,
    consecutiveWrong
  );

  const llm = getLLMProvider('examiner');

  const { object } = await generateObject({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    model: llm as any,
    schema: QuestionSchema,
    prompt: `生成一道操作系统练习题。

难度等级：${getDifficultyLabel(newDifficulty)} (${newDifficulty}/100)
重点考察知识点：${weakPoints.length > 0 ? weakPoints.join('、') : '综合'}
当前阶段：${stage}
题目类型：随机选择（选择题、填空题、编程题、设计题）

要求：
1. 题目要清晰明确
2. 选项要有迷惑性（选择题）
3. 解析要详细，帮助学员理解
4. 涵盖 OpenCamp 训练营的内容（Rust、rCore、操作系统概念）

请用中文出题。`,
  });

  return object;
}
