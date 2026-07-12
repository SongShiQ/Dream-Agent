// 评估 API - 水平评估

import { NextResponse } from 'next/server';
import { assessStudent } from '@/lib/agents/assessor';
import prisma from '@/lib/db/index';

export async function POST(req: Request) {
  try {
    const { studentName, answers, studentId } = await req.json();

    if (!studentName || !answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: 'studentName and answers array are required' },
        { status: 400 }
      );
    }

    // 执行评估
    const result = await assessStudent({ studentName, answers });

    // 保存评估结果
    if (studentId) {
      await prisma.assessment.create({
        data: {
          studentId,
          theory: result.theory,
          coding: result.coding,
          rust: result.rust,
          weakPoints: JSON.stringify(result.weakPoints),
        },
      });

      // 更新学员薄弱点
      await prisma.student.update({
        where: { id: studentId },
        data: {
          weakPoints: JSON.stringify(result.weakPoints),
          currentStage: result.stage,
        },
      });
    }

    return NextResponse.json({ assessment: result });
  } catch (error) {
    console.error('Assess API error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
