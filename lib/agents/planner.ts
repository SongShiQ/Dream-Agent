import { generateObject } from 'ai';
import { z } from 'zod';
import { getLLMProvider } from '../llm/factory';
import { getStudentProgress } from '../db/student';
import { getOrCreatePlan, updatePlan } from '../db/progress';
import type { Stage } from '../db/schema';

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

export async function generateLearningPlan(studentId: string) {
  const progress = await getStudentProgress(studentId);
  
  if (!progress) {
    throw new Error('Student not found');
  }

  const currentStage = progress.currentStage as Stage;
  const latestAssessment = progress.assessments[0];
  const weakPoints = latestAssessment?.weakPoints || progress.weakPoints || [];

  const llm = getLLMProvider('planner');

  const { object } = await generateObject({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    model: llm as any,
    schema: LearningPlanSchema,
    prompt: `为学员生成个性化学习计划。

当前阶段：${currentStage}
理论水平：${latestAssessment?.theory || '未评估'}/100
编码能力：${latestAssessment?.coding || '未评估'}/100
Rust 水平：${latestAssessment?.rust || '未评估'}/100
薄弱知识点：${weakPoints.join('、') || '无'}

OpenCamp 训练营阶段：
- pre_study_theory: 导学-理论（自学）
- pre_study_rust: 导学-Rust（自学）
- pre_study_tools: 导学-工具（自学）
- basic: 基础阶段（3周）
- professional: 专业阶段（3周）
- project_intro: 项目先导（4周）
- project: 项目阶段（6周）

请生成每日任务和每周目标，考虑学员的薄弱环节。
任务要具体可执行，时间估算要合理。`,
  });

  // 保存学习计划
  await getOrCreatePlan(studentId, currentStage);
  await updatePlan(studentId, {
    dailyTasks: object.dailyTasks,
    weeklyGoals: object.weeklyGoals,
    estimatedCompletion: new Date(Date.now() + object.estimatedDays * 24 * 60 * 60 * 1000),
  });

  return object;
}
