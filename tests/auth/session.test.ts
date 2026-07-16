import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveStudentId, STUDENT_SESSION_COOKIE } from '@/lib/auth/session';

function req(cookie?: string, header?: string) {
  const headers = new Headers();
  if (cookie) headers.set('cookie', cookie);
  if (header) headers.set('x-opencamp-student-id', header);
  return new Request('http://localhost/api/test', { headers });
}

describe('resolveStudentId', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('prefers the HttpOnly session cookie over a forged fallback id', () => {
    const resolved = resolveStudentId(
      req(`${STUDENT_SESSION_COOKIE}=real_student`),
      'forged_student'
    );

    expect(resolved).toEqual({ studentId: 'real_student', source: 'cookie' });
  });

  it('allows legacy studentId only as a non-production dev fallback', () => {
    vi.stubEnv('NODE_ENV', 'development');

    expect(resolveStudentId(req(), 'dev_student')).toEqual({
      studentId: 'dev_student',
      source: 'dev_fallback',
    });
  });

  it('does not accept fallback studentId in production', () => {
    vi.stubEnv('NODE_ENV', 'production');

    expect(resolveStudentId(req(), 'forged_student')).toEqual({
      studentId: null,
      source: 'missing',
    });
  });
});
