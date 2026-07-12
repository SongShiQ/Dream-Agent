// Assessor Agent - 水平评估

import { generateObject } from 'ai';
import { z } from 'zod';
import { getLLMProvider } from '../llm/factory';
import { AGENT_SYSTEM_PROMPTS } from './config';

// 评估结果 Schema
const AssessmentResultSchema = z.object({
  theory: z.number().min(0).max(100).describe('理论水平'),
  coding: z.number().min(0).max(100).describe('编码能力'),
  rust: z.number().min(0).max(100).describe('Rust 水平'),
  weakPoints: z.array(z.string()).describe('薄弱知识点'),
  stage: z.enum(['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3', 'C4', 'C5']).describe('建议阶段'),
  summary: z.string().describe('评估总结'),
});

export type AssessmentResult = z.infer<typeof AssessmentResultSchema>;

interface AssessOptions {
  studentName: string;
  answers: string[];
  currentStage?: string;
}

export async function assessStudent({ studentName, answers, currentStage }: AssessOptions): Promise<AssessmentResult> {
  const llm = getLLMProvider('assessor');

  const { object } = await generateObject({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    model: llm as any,
    schema: AssessmentResultSchema,
    prompt: `评估学员 "${studentName}" 的操作系统知识水平。

${currentStage ? `学员当前阶段：${currentStage}` : ''}

学员回答了以下诊断性问题：
${answers.map((a, i) => `${i + 1}. ${a}`).join('\n')}

请根据回答质量评估各维度分数（0-100）和薄弱知识点。
评估维度：
- 理论水平：对 OS 概念的理解程度
- 编码能力：系统编程能力
- Rust 水平：Rust 语言掌握程度
- 薄弱知识点：需要加强的知识领域
- 建议阶段：根据水平建议从哪个阶段开始`,
  });

  return object;
}
