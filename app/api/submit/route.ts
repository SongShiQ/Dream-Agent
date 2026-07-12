// 提交 API - 代码提交

import { NextResponse } from 'next/server';
import prisma from '@/lib/db/index';

export async function POST(req: Request) {
  try {
    const { studentId, labName, code, language, testResult, isPassed } = await req.json();

    if (!studentId || !labName || !code) {
      return NextResponse.json(
        { error: 'studentId, labName, and code are required' },
        { status: 400 }
      );
    }

    // 验证学员存在
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // 保存代码提交
    const submission = await prisma.codeSubmission.create({
      data: {
        studentId,
        labName,
        code,
        language: language || 'rust',
        testResult: testResult || '',
        isPassed: isPassed || false,
        feedback: '', // TODO: AI 分析反馈
      },
    });

    return NextResponse.json({
      submission,
      message: isPassed ? '恭喜通过！' : '继续努力！',
    });
  } catch (error) {
    console.error('Submit API error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// 获取提交历史
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    const labName = searchParams.get('labName');

    if (!studentId) {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 });
    }

    const where: { studentId: string; labName?: string } = { studentId };
    if (labName) {
      where.labName = labName;
    }

    const submissions = await prisma.codeSubmission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ submissions });
  } catch (error) {
    console.error('Get submissions error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
