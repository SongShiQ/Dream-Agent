import { NextResponse } from 'next/server';
import { authError, getCurrentStudent } from '@/lib/auth/session';
import prisma from '@/lib/db/index';
import {
  ExperimentFlowError,
  getStudentExperimentDashboard,
  startStudentExperiment,
  submitStudentExperiment,
} from '@/lib/experiments/student';

function flowError(error: unknown) {
  if (error instanceof ExperimentFlowError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  console.error('Experiments API error:', error);
  return NextResponse.json({ error: 'Server error' }, { status: 500 });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const { student } = await getCurrentStudent(req, searchParams.get('studentId'));
    if (!student) return authError();
    const dashboard = await getStudentExperimentDashboard(
      prisma,
      student.id,
      student.curriculumVersion
    );
    return NextResponse.json(dashboard);
  } catch (error) {
    return flowError(error);
  }
}

export async function POST(req: Request) {
  try {
    let body: { studentId?: string; action?: string; templateId?: string; attemptId?: string; answer?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: '请求体无效' }, { status: 400 });
    }
    const { student } = await getCurrentStudent(req, body.studentId);
    if (!student) return authError();

    if (body.action === 'start') {
      if (!body.templateId) {
        return NextResponse.json({ error: '缺少 templateId' }, { status: 400 });
      }
      return NextResponse.json(
        await startStudentExperiment(prisma, {
          studentId: student.id,
          courseVersion: student.curriculumVersion,
          templateId: body.templateId,
        })
      );
    }
    if (body.action === 'submit') {
      if (!body.attemptId || typeof body.answer !== 'string') {
        return NextResponse.json({ error: '缺少 attemptId 或 answer' }, { status: 400 });
      }
      return NextResponse.json(
        await submitStudentExperiment(prisma, {
          studentId: student.id,
          courseVersion: student.curriculumVersion,
          attemptId: body.attemptId,
          answer: body.answer,
        })
      );
    }
    return NextResponse.json({ error: '不支持的 action' }, { status: 400 });
  } catch (error) {
    return flowError(error);
  }
}
