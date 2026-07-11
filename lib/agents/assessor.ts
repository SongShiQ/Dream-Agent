import { generateObject } from 'ai';
import { z } from 'zod';
import { getLLMProvider } from '../llm/factory';
import { getOrCreateStudent, updateStudentWeakPoints } from '../db/student';
import prisma from '../db/index';

const AssessmentResultSchema = z.object({
  theory: z.number().min(0).max(100).describe('理论水平'),
  coding: z.number().min(0).max(100).describe('编码能力'),
  rust: z.number().min(0).max(100).describe('Rust 水平'),
  weakPoints: z.array(z.string()).describe('薄弱知识点'),
  summary: z.string().describe('评估总结'),
});

export async function assessStudent(name: string, answers: string[]) {
  const student = await getOrCreateStudent(name);
  const llm = getLLMProvider('assessor');

  const { object } = await generateObject({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    model: llm as any,
    schema: AssessmentResultSchema,
    prompt: `评估学员 "${name}" 的操作系统知识水平。

学员回答了以下诊断性问题：
${answers.map((a, i) => `${i + 1}. ${a}`).join('\n')}

请根据回答质量评估各维度分数（0-100）和薄弱知识点。
评估维度：
- 理论水平：对 OS 概念的理解程度
- 编码能力：系统编程能力
- Rust 水平：Rust 语言掌握程度
- 薄弱知识点：需要加强的知识领域`,
  });

  // 保存评估结果
  await prisma.assessment.create({
    data: {
      studentId: student.id,
      theory: object.theory,
      coding: object.coding,
      rust: object.rust,
      weakPoints: JSON.stringify(object.weakPoints),
    },
  });

  // 更新学员薄弱点
  await updateStudentWeakPoints(student.id, object.weakPoints);

  return {
    studentId: student.id,
    assessment: object,
  };
}
