import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/judge/worker', () => ({
  workerAuthError: (req: Request) =>
    req.headers.get('x-judge-token') === 'ok' ? null : new Response('unauthorized', { status: 401 }),
}));

vi.mock('@/lib/knowledge/review', () => ({
  buildKnowledgeReviewQueue: vi.fn(async () => ({ summary: { total: 1 }, items: [] })),
}));

vi.mock('@/lib/experiments/review', () => ({
  buildExperimentReviewQueue: vi.fn(async () => ({ summary: { total: 1 }, items: [] })),
}));

import { GET } from '@/app/api/ops/knowledge/route';

describe('ops knowledge API', () => {
  it('requires the existing ops token boundary', async () => {
    const unauthorized = await GET(new Request('http://localhost/api/ops/knowledge'));
    expect(unauthorized.status).toBe(401);
    const authorized = await GET(
      new Request('http://localhost/api/ops/knowledge?reviewStatus=pending', {
        headers: { 'x-judge-token': 'ok' },
      })
    );
    expect(authorized.status).toBe(200);
    expect(await authorized.json()).toEqual({
      queue: { summary: { total: 1 }, items: [] },
      experimentQueue: { summary: { total: 1 }, items: [] },
    });
  });
});
