import prisma from './index';
import type { LearningPlan, Stage } from './schema';
import { Prisma } from '@prisma/client';

export async function getOrCreatePlan(
  studentId: string,
  currentStage: Stage
): Promise<LearningPlan> {
  let plan = await prisma.learningPlan.findUnique({
    where: { studentId },
  });

  if (!plan) {
    plan = await prisma.learningPlan.create({
      data: {
        studentId,
        currentStage,
        dailyTasks: [],
        weeklyGoals: [],
      },
    });
  }

  return plan;
}

export async function updatePlan(
  studentId: string,
  updates: {
    dailyTasks?: unknown[];
    weeklyGoals?: string[];
    estimatedCompletion?: Date;
    currentStage?: string;
  }
): Promise<LearningPlan> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {
    weeklyGoals: updates.weeklyGoals,
    estimatedCompletion: updates.estimatedCompletion,
    currentStage: updates.currentStage,
    lastAdjustedAt: new Date(),
  };

  if (updates.dailyTasks) {
    data.dailyTasks = updates.dailyTasks as unknown as Prisma.InputJsonValue;
  }

  return prisma.learningPlan.update({
    where: { studentId },
    data,
  });
}

export async function getPlanByStudentId(studentId: string): Promise<LearningPlan | null> {
  return prisma.learningPlan.findUnique({
    where: { studentId },
  });
}
