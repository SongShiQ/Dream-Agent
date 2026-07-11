import { generateObject } from 'ai';
import { z } from 'zod';
import { getLLMProvider } from '../llm/factory';
import { getStudentStats } from '../db/student';
import { adjustDifficulty, getDifficultyLabel } from '../adaptive/difficulty';
import prisma from '../db/index';

const QuestionSchema = z.object({
  type: z.enum(['choice', 'fill', 'code', 'design']),
  content: z.string().describe('题目内容'),
  options: z.array(z.string()).optional().describe('选择题选项'),
  answer: z.string().describe('参考答案'),
  explanation: z.string().describe('解析'),
  knowledgePoints: z.array(z.string()).describe('知识点标签'),
});

export async function generateQuestion(
  studentId: string,
  currentDifficulty: number,
  weakPoints: string[]
) {
  // 获取学员统计信息
  const stats = await getStudentStats(studentId);

  // 调整难度
  const newDifficulty = adjustDifficulty({
    currentDifficulty,
    recentAccuracy: stats.recentAccuracy,
    consecutiveCorrect: stats.consecutiveCorrect,
    consecutiveWrong: stats.consecutiveWrong,
  });

  const llm = getLLMProvider('examiner');

  const { object } = await generateObject({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    model: llm as any,
    schema: QuestionSchema,
    prompt: `生成一道操作系统练习题。

难度等级：${getDifficultyLabel(newDifficulty)} (${newDifficulty}/100)
重点考察知识点：${weakPoints.length > 0 ? weakPoints.join('、') : '综合'}
题目类型：随机选择（选择题、填空题、编程题、设计题）

要求：
1. 题目要清晰明确
2. 选项要有迷惑性（选择题）
3. 解析要详细，帮助学员理解
4. 涵盖 OpenCamp 训练营的内容（Rust、rCore、操作系统概念）

请用中文出题。`,
  });

  // 保存题目到数据库
  const savedQuestion = await prisma.question.create({
    data: {
      type: object.type,
      difficulty: newDifficulty,
      knowledgePoints: JSON.stringify(object.knowledgePoints),
      content: object.content,
      options: JSON.stringify(object.options || []),
      answer: object.answer,
      explanation: object.explanation,
    },
  });

  return {
    question: savedQuestion,
    difficulty: newDifficulty,
    difficultyLabel: getDifficultyLabel(newDifficulty),
  };
}
