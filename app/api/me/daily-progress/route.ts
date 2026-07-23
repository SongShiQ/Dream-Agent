import { NextResponse } from 'next/server';
import { authError, getCurrentStudent } from '@/lib/auth/session';
import { getDailyProgress, setTaskPersonalDone } from '@/lib/progress/daily';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const { student } = await getCurrentStudent(req, searchParams.get('studentId'));
    if (!student) return authError();

    const state = await getDailyProgress({
      studentId: student.id,
      date: searchParams.get('date'),
      fingerprint: searchParams.get('fingerprint'),
    });

    return NextResponse.json({ progress: state, evidenceKind: 'personal_done' });
  } catch (error) {
    console.error('Daily progress GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    let body: {
      studentId?: string;
      taskId?: string;
      done?: boolean;
      date?: string;
      fingerprint?: string;
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: '请求体无效' }, { status: 400 });
    }

    const { student } = await getCurrentStudent(req, body.studentId);
    if (!student) return authError();
    if (!body.taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
    }

    const state = await setTaskPersonalDone({
      studentId: student.id,
      taskId: body.taskId,
      done: body.done !== false,
      date: body.date,
      fingerprint: body.fingerprint,
    });

    return NextResponse.json({ progress: state, evidenceKind: 'personal_done' });
  } catch (error) {
    console.error('Daily progress PUT error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
