// 学员管理 API

import { NextResponse } from 'next/server';
import prisma from '@/lib/db/index';

// 创建学员
export async function POST(req: Request) {
  try {
    const { name, email } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // 检查是否已存在
    const existing = await prisma.student.findFirst({
      where: {
        OR: [
          { name },
          ...(email ? [{ email }] : []),
        ],
      },
    });

    if (existing) {
      return NextResponse.json({ student: existing });
    }

    // 创建新学员
    const student = await prisma.student.create({
      data: { name, email },
    });

    return NextResponse.json({ student });
  } catch (error) {
    console.error('Create student error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// 获取学员信息
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const name = searchParams.get('name');

    if (!id && !name) {
      return NextResponse.json({ error: 'ID or name is required' }, { status: 400 });
    }

    const student = await prisma.student.findFirst({
      where: id ? { id } : { name: name! },
      include: {
        assessments: {
          orderBy: { assessedAt: 'desc' },
          take: 1,
        },
        learningPlan: true,
        _count: {
          select: {
            answerRecords: true,
            codeSubmissions: true,
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    return NextResponse.json({ student });
  } catch (error) {
    console.error('Get student error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// 更新学员信息
export async function PUT(req: Request) {
  try {
    const { id, name, email, currentStage, weakPoints, feedbackMode } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const student = await prisma.student.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(currentStage && { currentStage }),
        ...(weakPoints && { weakPoints: JSON.stringify(weakPoints) }),
        ...(feedbackMode && { feedbackMode }),
      },
    });

    return NextResponse.json({ student });
  } catch (error) {
    console.error('Update student error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
