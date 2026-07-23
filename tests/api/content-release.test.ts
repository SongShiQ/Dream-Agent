import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/judge/worker', () => ({
  workerAuthError: (req: Request) =>
    req.headers.get('x-judge-token') === 'ok' ? null : new Response('unauthorized', { status: 401 }),
}));

vi.mock('@/lib/content/release-check', () => ({
  buildContentReleaseCheck: vi.fn(async ({ mode }: { mode: string }) => ({
    mode,
    decision: 'pass',
    summary: { errors: 0, warnings: 0 },
    issues: [],
  })),
}));

import { GET } from '@/app/api/ops/content-release/route';

describe('ops content release API', () => {
  it('requires the ops token and forwards release mode', async () => {
    expect((await GET(new Request('http://localhost/api/ops/content-release'))).status).toBe(401);
    const response = await GET(
      new Request('http://localhost/api/ops/content-release?mode=release', {
        headers: { 'x-judge-token': 'ok' },
      })
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ mode: 'release', decision: 'pass' });
  });
});
