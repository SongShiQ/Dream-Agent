import { NextResponse } from 'next/server';
import prisma from '@/lib/db/index';

export const STUDENT_SESSION_COOKIE = 'opencamp_student_id';

export type CurrentStudent = {
  id: string;
  name: string;
  email: string | null;
  currentStage: string;
  weakPoints: string;
  feedbackMode: string;
};

function parseCookieHeader(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  }
  return out;
}

export function getSessionStudentId(req: Request): string | null {
  const cookies = parseCookieHeader(req.headers.get('cookie'));
  const fromCookie = cookies[STUDENT_SESSION_COOKIE]?.trim();
  if (fromCookie) return fromCookie;

  if (process.env.NODE_ENV !== 'production') {
    const fromHeader = req.headers.get('x-opencamp-student-id')?.trim();
    if (fromHeader) return fromHeader;
  }

  return null;
}

export function resolveStudentId(req: Request, devFallbackStudentId?: string | null): {
  studentId: string | null;
  source: 'cookie' | 'dev_header' | 'dev_fallback' | 'missing';
} {
  const cookies = parseCookieHeader(req.headers.get('cookie'));
  const fromCookie = cookies[STUDENT_SESSION_COOKIE]?.trim();
  if (fromCookie) return { studentId: fromCookie, source: 'cookie' };

  if (process.env.NODE_ENV !== 'production') {
    const fromHeader = req.headers.get('x-opencamp-student-id')?.trim();
    if (fromHeader) return { studentId: fromHeader, source: 'dev_header' };
    if (devFallbackStudentId?.trim()) {
      return { studentId: devFallbackStudentId.trim(), source: 'dev_fallback' };
    }
  }

  return { studentId: null, source: 'missing' };
}

export async function getCurrentStudent(
  req: Request,
  devFallbackStudentId?: string | null
): Promise<{ student: CurrentStudent | null; source: ReturnType<typeof resolveStudentId>['source'] }> {
  const resolved = resolveStudentId(req, devFallbackStudentId);
  if (!resolved.studentId) return { student: null, source: resolved.source };

  const student = await prisma.student.findUnique({
    where: { id: resolved.studentId },
    select: {
      id: true,
      name: true,
      email: true,
      currentStage: true,
      weakPoints: true,
      feedbackMode: true,
    },
  });

  return { student, source: resolved.source };
}

export function authError(message = 'Authentication required') {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function attachStudentSession<T>(
  response: NextResponse<T>,
  studentId: string
): NextResponse<T> {
  response.cookies.set(STUDENT_SESSION_COOKIE, studentId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
