// Planner Agent - 学习规划

import { generateObject } from 'ai';
import { z } from 'zod';
import { getLLMProvider } from '../llm/factory';
import { AGENT_SYSTEM_PROMPTS } from './config';

// 学习计划 Schema
const LearningPlanSchema = z.object({
  currentStage: z.string(),
  dailyTasks: z.array(z.object({
    task: z.string(),
    type: z.enum(['study', 'practice', 'review']),
    estimatedMinutes: z.number(),
  })),
  weeklyGoals: z.array(z.string()),
  estimatedDays: z.number().describe('预计完成当前阶段的天数'),
  recommendations: z.array(z.string()).describe('学习建议'),
});

export type LearningPlan = z.infer<typeof LearningPlanSchema>;

interface PlanOptions {
  studentId: string;
  currentStage: string;
  weakPoints: string[];
  assessment?: {
    theory: number;
    coding: number;
    rust: number;
  };
}

// 阶段描述
const STAGE_DESCRIPTIONS: Record<string, string> = {
  'A1': '导学-零基础',
  'A2': '导学-有编程经验',
  'A3': '导学-有其他语言基础',
  'B1': '基础-Rust 入门',
  'B2': '基础-Rust 进阶',
  'B3': '基础-工具使用',
  'C1': '专业-批处理',
  'C2': '专业-地址空间',
  'C3': '专业-进程',
  'C4': '专业-文件系统',
  'C5': '专业-并发',
  'D1': '项目-组件化 OS',
  'D2': '项目-项目实践',
};

export async function generateLearningPlan({
  studentId,
  currentStage,
  weakPoints,
  assessment,
}: PlanOptions): Promise<LearningPlan> {
  const llm = getLLMProvider('planner');

  const stageDesc = STAGE_DESCRIPTIONS[currentStage] || currentStage;

  const assessmentInfo = assessment
    ? `
理论水平：${assessment.theory}/100
编码能力：${assessment.coding}/100
Rust 水平：${assessment.rust}/100`
    : '未评估';

  const { object } = await generateObject({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    model: llm as any,
    schema: LearningPlanSchema,
    prompt: `为学员生成个性化学习计划。

当前阶段：${stageDesc}
${assessmentInfo}
薄弱知识点：${weakPoints.join('、') || '无'}

OpenCamp 训练营阶段：
- A1-A3: 导学阶段（自学）
- B1-B3: 基础阶段（3周）
- C1-C5: 专业阶段（3周）
- D1-D2: 项目阶段（6周）

请生成每日任务和每周目标，考虑学员的薄弱环节。
任务要具体可执行，时间估算要合理。`,
  });

  return object;
}
