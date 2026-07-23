import { NextResponse } from 'next/server';
import { authError, getCurrentStudent } from '@/lib/auth/session';
import { buildStudentDashboard } from '@/lib/progress/mastery';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const { student } = await getCurrentStudent(req, searchParams.get('studentId'));
    if (!student) return authError();

    const dashboard = await buildStudentDashboard(student.id);
    if (!dashboard) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    return NextResponse.json({ dashboard });
  } catch (error) {
    console.error('Dashboard GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
