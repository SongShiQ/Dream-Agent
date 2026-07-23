import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/ops/content-auth', () => ({
  contentOpsAuthError: (req: Request) =>
    req.headers.get('x-content-ops-token') === 'content-ok'
      ? null
      : new Response('unauthorized', { status: 401 }),
  getContentOpsActor: (req: Request) => req.headers.get('x-content-ops-actor'),
}));

const service = vi.hoisted(() => ({
  create: vi.fn(async () => ({ decision: { id: 'decision-1' } })),
  cancel: vi.fn(async () => ({ id: 'decision-1', status: 'cancelled' })),
  list: vi.fn(async () => []),
}));

vi.mock('@/lib/content/review-decisions', async () => {
  class ContentDecisionError extends Error {
    constructor(message: string, readonly status: number, readonly code: string) {
      super(message);
    }
  }
  return {
    ContentDecisionError,
    createContentReviewDecision: service.create,
    cancelContentReviewDecision: service.cancel,
    listContentReviewDecisions: service.list,
  };
});

vi.mock('@/lib/db/index', () => ({ default: {} }));

import { GET, POST } from '@/app/api/ops/content-decisions/route';

describe('content decisions API', () => {
  it('uses a separate content token and requires an explicit actor for writes', async () => {
    expect((await GET(new Request('http://localhost/api/ops/content-decisions'))).status).toBe(401);
    const noActor = await POST(
      new Request('http://localhost/api/ops/content-decisions', {
        method: 'POST',
        headers: { 'x-content-ops-token': 'content-ok', 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    );
    expect(noActor.status).toBe(400);
  });

  it('rejects invalid hashes/actions before creating a decision', async () => {
    const response = await POST(
      new Request('http://localhost/api/ops/content-decisions', {
        method: 'POST',
        headers: {
          'x-content-ops-token': 'content-ok',
          'x-content-ops-actor': 'teacher-a',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetKind: 'knowledge_card',
          targetId: 'card',
          expectedHash: 'bad',
          action: 'publish',
        }),
      })
    );
    expect(response.status).toBe(400);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('returns 400 for malformed JSON', async () => {
    const response = await POST(
      new Request('http://localhost/api/ops/content-decisions', {
        method: 'POST',
        headers: {
          'x-content-ops-token': 'content-ok',
          'x-content-ops-actor': 'teacher-a',
          'Content-Type': 'application/json',
        },
        body: '{',
      })
    );
    expect(response.status).toBe(400);
  });

  it('passes only validated decision fields and authenticated actor to the service', async () => {
    const response = await POST(
      new Request('http://localhost/api/ops/content-decisions', {
        method: 'POST',
        headers: {
          'x-content-ops-token': 'content-ok',
          'x-content-ops-actor': 'teacher-a',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetKind: 'knowledge_card',
          targetId: 'card',
          sourcePath: 'data/knowledge/cards/card.md',
          expectedHash: 'a'.repeat(64),
          action: 'approve_review',
          note: 'checked',
          actor: 'forged-client-actor',
        }),
      })
    );
    expect(response.status).toBe(201);
    expect(service.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ actor: 'teacher-a', action: 'approve_review' })
    );
  });
});
