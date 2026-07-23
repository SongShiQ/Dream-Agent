import { afterEach, describe, expect, it, vi } from 'vitest';
import { contentOpsAuthError, getContentOpsActor } from '@/lib/ops/content-auth';

describe('content operations auth', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses a dedicated development token', () => {
    vi.stubEnv('NODE_ENV', 'test');
    expect(
      contentOpsAuthError(
        new Request('http://localhost', {
          headers: { 'x-content-ops-token': 'dev-content-ops-token' },
        })
      )
    ).toBeNull();
    expect(contentOpsAuthError(new Request('http://localhost'))?.status).toBe(401);
  });

  it('requires explicit production configuration', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('CONTENT_OPS_TOKEN', '');
    expect(contentOpsAuthError(new Request('http://localhost'))?.status).toBe(503);
    vi.stubEnv('CONTENT_OPS_TOKEN', 'teacher-secret');
    expect(
      contentOpsAuthError(
        new Request('http://localhost', {
          headers: { 'x-content-ops-token': 'teacher-secret' },
        })
      )
    ).toBeNull();
  });

  it('rejects anonymous or malformed actors', () => {
    expect(getContentOpsActor(new Request('http://localhost'))).toBeNull();
    expect(
      getContentOpsActor(
        new Request('http://localhost', { headers: { 'x-content-ops-actor': 'a' } })
      )
    ).toBeNull();
    expect(
      getContentOpsActor(
        new Request('http://localhost', { headers: { 'x-content-ops-actor': 'teacher-a' } })
      )
    ).toBe('teacher-a');
  });
});
