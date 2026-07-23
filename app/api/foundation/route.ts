import { NextResponse } from 'next/server';
import { authError, getCurrentStudent } from '@/lib/auth/session';
import {
  buildFoundationDashboard,
  startFoundationQuizAttempt,
  submitFoundationQuizAttempt,
} from '@/lib/foundation/units';
import { stripAnswers } from '@/lib/assess/diagnostic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const { student } = await getCurrentStudent(req, searchParams.get('studentId'));
    if (!student) return authError();

    const foundation = await buildFoundationDashboard(student.id);
    return NextResponse.json({ foundation });
  } catch (error) {
    console.error('Foundation GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      studentId?: string;
      action?: 'start' | 'submit';
      unitId?: string;
      highStakes?: boolean;
      attemptId?: string;
      answers?: { questionId: string; answer: string }[];
    };
    const { student } = await getCurrentStudent(req, body.studentId);
    if (!student) return authError();

    if (body.action === 'start') {
      if (!body.unitId) {
        return NextResponse.json({ error: 'unitId required' }, { status: 400 });
      }
      const result = await startFoundationQuizAttempt({
        studentId: student.id,
        unitId: body.unitId,
        highStakes: body.highStakes ?? true,
      });
      if ('error' in result) {
        const status =
          result.error === 'HIGH_STAKES_LIMIT_REACHED'
            ? 429
            : result.error === 'FOUNDATION_UNIT_LOCKED'
              ? 409
            : result.error === 'QUESTION_SET_INSUFFICIENT'
              ? 422
              : 400;
        return NextResponse.json(
          {
            error: result.error,
            ...('available' in result
              ? { available: result.available, required: result.required }
              : {}),
            ...('unlockAfter' in result ? { unlockAfter: result.unlockAfter } : {}),
          },
          { status }
        );
      }
      return NextResponse.json({
        attempt: result.attempt,
        questionSet: result.questionSet,
        questions: result.questions.map(stripAnswers),
      });
    }

    if (body.action === 'submit') {
      if (!body.attemptId || !Array.isArray(body.answers)) {
        return NextResponse.json({ error: 'attemptId and answers required' }, { status: 400 });
      }
      const result = await submitFoundationQuizAttempt({
        studentId: student.id,
        attemptId: body.attemptId,
        answers: body.answers,
      });
      if ('error' in result) {
        const status =
          result.error === 'ATTEMPT_QUESTION_SET_STALE' || result.error === 'ATTEMPT_UNIT_STALE'
            ? 409
            : 400;
        return NextResponse.json({ error: result.error }, { status });
      }
      const foundation = await buildFoundationDashboard(student.id);
      return NextResponse.json({ attempt: result.attempt, diagnosis: result.diagnosis, foundation });
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Foundation POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
