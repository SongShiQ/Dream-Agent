// 规划 API — 模板优先，LLM 可选增强

import { NextResponse } from 'next/server';
import prisma from '@/lib/db/index';
import { getStudentStats } from '@/lib/db/student';
import { buildTemplatePlan } from '@/lib/plan/template';
import { generateLearningPlan } from '@/lib/agents/planner';
import { authError, getCurrentStudent } from '@/lib/auth/session';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const { student } = await getCurrentStudent(req, searchParams.get('studentId'));
    if (!student) {
      return authError();
    }
    const studentId = student.id;

    const existing = await prisma.learningPlan.findUnique({
      where: { studentId },
    });
    if (!existing) {
      return NextResponse.json({ plan: null });
    }

    let dailyTasks = [];
    let weeklyGoals = [];
    try {
      dailyTasks = JSON.parse(existing.dailyTasks || '[]');
      weeklyGoals = JSON.parse(existing.weeklyGoals || '[]');
    } catch {
      /* ignore */
    }

    return NextResponse.json({
      plan: {
        currentStage: existing.currentStage,
        dailyTasks,
        weeklyGoals,
        estimatedCompletion: existing.estimatedCompletion,
        lastAdjustedAt: existing.lastAdjustedAt,
        source: 'db',
      },
    });
  } catch (error) {
    console.error('Plan GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    let body: { studentId?: string; useLlm?: boolean };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: '请求体无效' }, { status: 400 });
    }

    const { student: current } = await getCurrentStudent(req, body.studentId);
    const { useLlm } = body;
    if (!current) {
      return authError();
    }
    const studentId = current.id;

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

    let weakPoints: string[] = [];
    try {
      weakPoints = JSON.parse(student.weakPoints || '[]');
    } catch {
      weakPoints = [];
    }

    const stats = await getStudentStats(studentId);
    const latestAssessment = student.assessments[0];

    let plan = buildTemplatePlan({
      currentStage: student.currentStage,
      weakPoints,
      totalQuestions: stats.totalQuestions,
      correctAnswers: stats.correctAnswers,
    });

    // 可选 LLM 增强
    if (useLlm) {
      try {
        const llmPlan = await generateLearningPlan({
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
        plan = {
          ...plan,
          currentStage: llmPlan.currentStage || student.currentStage,
          dailyTasks: llmPlan.dailyTasks.map((t, i) => ({
            id: `llm_${i}`,
            task: t.task,
            type: t.type,
            estimatedMinutes: t.estimatedMinutes,
          })),
          weeklyGoals: llmPlan.weeklyGoals,
          estimatedDays: llmPlan.estimatedDays,
          recommendations: llmPlan.recommendations,
          source: 'llm',
        };
      } catch (e) {
        console.warn('LLM plan failed, using template:', e);
      }
    }

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

/** PUT — 更新任务清单（自定义任务 / 整表覆盖） */
export async function PUT(req: Request) {
  try {
    let body: {
      studentId?: string;
      dailyTasks?: {
        id: string;
        task: string;
        type: string;
        estimatedMinutes: number;
      }[];
      weeklyGoals?: string[];
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: '请求体无效' }, { status: 400 });
    }

    const { student: current } = await getCurrentStudent(req, body.studentId);
    const { dailyTasks, weeklyGoals } = body;
    if (!current) {
      return authError();
    }
    const studentId = current.id;
    if (!Array.isArray(dailyTasks)) {
      return NextResponse.json({ error: 'dailyTasks array required' }, { status: 400 });
    }

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const sanitized = dailyTasks
      .filter((t) => t && typeof t.task === 'string' && t.task.trim())
      .map((t, i) => ({
        id: t.id || `custom_${Date.now()}_${i}`,
        task: t.task.trim().slice(0, 500),
        type: ['study', 'practice', 'review', 'lab', 'custom'].includes(t.type)
          ? t.type
          : 'custom',
        estimatedMinutes:
          typeof t.estimatedMinutes === 'number' && t.estimatedMinutes > 0
            ? Math.min(480, Math.round(t.estimatedMinutes))
            : 30,
      }));

    const goals = Array.isArray(weeklyGoals)
      ? weeklyGoals.map((g) => String(g).slice(0, 300)).filter(Boolean)
      : undefined;

    const existing = await prisma.learningPlan.findUnique({ where: { studentId } });
    let prevGoals: string[] = [];
    if (existing) {
      try {
        prevGoals = JSON.parse(existing.weeklyGoals || '[]');
      } catch {
        prevGoals = [];
      }
    }

    const plan = await prisma.learningPlan.upsert({
      where: { studentId },
      create: {
        studentId,
        currentStage: student.currentStage,
        dailyTasks: JSON.stringify(sanitized),
        weeklyGoals: JSON.stringify(goals ?? prevGoals),
      },
      update: {
        dailyTasks: JSON.stringify(sanitized),
        ...(goals ? { weeklyGoals: JSON.stringify(goals) } : {}),
        lastAdjustedAt: new Date(),
      },
    });

    return NextResponse.json({
      plan: {
        currentStage: plan.currentStage,
        stageLabel: student.currentStage,
        dailyTasks: sanitized,
        weeklyGoals: goals ?? prevGoals,
        source: 'custom',
      },
    });
  } catch (error) {
    console.error('Plan PUT error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
