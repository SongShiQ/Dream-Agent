import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth/session', () => ({
  authError: () => new Response('unauthorized', { status: 401 }),
  getCurrentStudent: vi.fn(async () => ({ student: { id: 'student-1' } })),
}));

vi.mock('@/lib/foundation/units', () => ({
  buildFoundationDashboard: vi.fn(async () => ({ units: [] })),
  startFoundationQuizAttempt: vi.fn(),
  submitFoundationQuizAttempt: vi.fn(),
}));

vi.mock('@/lib/assess/diagnostic', () => ({ stripAnswers: (question: unknown) => question }));

import { GET, POST } from '@/app/api/foundation/route';
import {
  buildFoundationDashboard,
  startFoundationQuizAttempt,
  submitFoundationQuizAttempt,
} from '@/lib/foundation/units';

const submitMock = vi.mocked(submitFoundationQuizAttempt);
const startMock = vi.mocked(startFoundationQuizAttempt);
const dashboardMock = vi.mocked(buildFoundationDashboard);

describe('foundation API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns deterministic diagnosis with a submitted attempt', async () => {
    submitMock.mockResolvedValueOnce({
      attempt: { id: 'attempt-1', status: 'failed' },
      diagnosis: {
        unitId: 'memory-virtual-memory',
        status: 'failed',
        mode: 'high_stakes',
        weakPoints: [{ tag: 'memory', incorrect: 2, total: 2, errorRate: 100 }],
        recommendedCards: [{ id: 'virtual-memory', title: '虚拟内存与缺页' }],
        summary: '本次未达标。',
        nextAction: { kind: 'review_then_retry', label: '先复习再挑战' },
      },
    } as never);

    const response = await POST(new Request('http://localhost/api/foundation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'submit', attemptId: 'attempt-1', answers: [] }),
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      attempt: { id: 'attempt-1', status: 'failed' },
      diagnosis: {
        weakPoints: [{ tag: 'memory' }],
        recommendedCards: [{ id: 'virtual-memory' }],
      },
    });
  });

  it('restores the latest diagnosis on a subsequent dashboard read', async () => {
    dashboardMock.mockResolvedValueOnce({
      units: [],
      topicPacks: [{
        id: 'topic-os-overview-interrupts',
        unitId: 'os-overview-interrupts',
        ready: true,
        completedChecks: 5,
        totalChecks: 5,
      }],
      latestDiagnosis: {
        attemptId: 'attempt-1',
        unitId: 'memory-virtual-memory',
        status: 'failed',
        weakPoints: [{ tag: 'memory' }],
        recommendedCards: [{ id: 'virtual-memory' }],
      },
    } as never);

    const response = await GET(new Request('http://localhost/api/foundation'));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      foundation: {
        topicPacks: [{
          unitId: 'os-overview-interrupts',
          ready: true,
          completedChecks: 5,
        }],
        latestDiagnosis: {
          attemptId: 'attempt-1',
          weakPoints: [{ tag: 'memory' }],
          recommendedCards: [{ id: 'virtual-memory' }],
        },
      },
    });
  });

  it('rejects a stale question set without grading partial evidence', async () => {
    submitMock.mockResolvedValueOnce({ error: 'ATTEMPT_QUESTION_SET_STALE' });

    const response = await POST(new Request('http://localhost/api/foundation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'submit', attemptId: 'attempt-1', answers: [] }),
    }));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: 'ATTEMPT_QUESTION_SET_STALE' });
  });

  it('returns the server-side prerequisite gate for a locked unit', async () => {
    startMock.mockResolvedValueOnce({
      error: 'FOUNDATION_UNIT_LOCKED',
      unlockAfter: ['process-scheduling'],
    });

    const response = await POST(new Request('http://localhost/api/foundation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start', unitId: 'memory-virtual-memory' }),
    }));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: 'FOUNDATION_UNIT_LOCKED',
      unlockAfter: ['process-scheduling'],
    });
  });
});
