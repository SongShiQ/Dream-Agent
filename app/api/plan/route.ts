// 规划 API - 学习计划生成

import { NextResponse } from 'next/server';
import { generateLearningPlan } from '@/lib/agents/planner';
import prisma from '@/lib/db/index';

export async function POST(req: Request) {
  try {
    const { studentId } = await req.json();

    if (!studentId) {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 });
    }

    // 获取学员信息
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        assessments: {
          orderBy: { assessedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // 解析薄弱点
    const weakPoints = student.weakPoints
      ? JSON.parse(student.weakPoints)
      : [];

    // 获取最新评估
    const latestAssessment = student.assessments[0];

    // 生成学习计划
    const plan = await generateLearningPlan({
      studentId,
      currentStage: student.currentStage,
      weakPoints,
      assessment: latestAssessment
        ? {
            theory: latestAssessment.theory,
            coding: latestAssessment.coding,
            rust: latestAssessment.rust,
          }
        : undefined,
    });

    // 保存学习计划
    await prisma.learningPlan.upsert({
      where: { studentId },
      create: {
        studentId,
        currentStage: student.currentStage,
        dailyTasks: JSON.stringify(plan.dailyTasks),
        weeklyGoals: JSON.stringify(plan.weeklyGoals),
        estimatedCompletion: new Date(
          Date.now() + plan.estimatedDays * 24 * 60 * 60 * 1000
        ),
      },
      update: {
        currentStage: student.currentStage,
        dailyTasks: JSON.stringify(plan.dailyTasks),
        weeklyGoals: JSON.stringify(plan.weeklyGoals),
        estimatedCompletion: new Date(
          Date.now() + plan.estimatedDays * 24 * 60 * 60 * 1000
        ),
        lastAdjustedAt: new Date(),
      },
    });

    return NextResponse.json({ plan });
  } catch (error) {
    console.error('Plan API error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
