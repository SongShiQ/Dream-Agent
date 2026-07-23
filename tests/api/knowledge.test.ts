import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/knowledge/cards', () => ({
  getAllStageMeta: vi.fn(),
  getCardsByTag: vi.fn(),
  getKnowledgeCardById: vi.fn(),
  getOpencampMeta: vi.fn(),
  getStageMeta: vi.fn(),
  searchCards: vi.fn(),
}));

import { GET } from '@/app/api/knowledge/route';
import { getKnowledgeCardById } from '@/lib/knowledge/cards';

const getCardMock = vi.mocked(getKnowledgeCardById);

const publishedCard = {
  id: 'os-theory-01-overview',
  title: '操作系统概述',
  tags: ['os_overview'],
  stage: 'pre_study_theory',
  labs: [],
  courseVersion: '2026-summer-os',
  publicationStatus: 'published' as const,
  reviewStatus: 'pending' as const,
  sourceRefs: ['ostep'],
  sources: [{ id: 'ostep', title: 'OSTEP', url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/' }],
  prerequisiteIds: [],
  misconceptionIds: [],
  questionTags: ['os_overview'],
  labGateIds: [],
  relatedIds: [],
  source: 'os-theory/01-overview.md',
  contentHash: 'hash',
  content: '# 操作系统概述',
  excerpt: '操作系统是管理计算机资源的系统软件。',
  relevance: 0,
};

describe('knowledge card API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a student-visible card by stable ID', async () => {
    getCardMock.mockResolvedValueOnce(publishedCard);
    const response = await GET(new Request('http://localhost/api/knowledge?id=os-theory-01-overview'));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      card: {
        id: 'os-theory-01-overview',
        content: '# 操作系统概述',
        sourceRefs: ['ostep'],
      },
    });
    expect(getCardMock).toHaveBeenCalledWith('os-theory-01-overview');
  });

  it('returns 404 for a missing or non-visible card', async () => {
    getCardMock.mockResolvedValueOnce(null);
    const response = await GET(new Request('http://localhost/api/knowledge?id=missing-card'));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Knowledge card not found' });
  });

  it('keeps the existing required-parameter guard', async () => {
    const response = await GET(new Request('http://localhost/api/knowledge'));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'Provide id, tag, q, stage, or action=stages',
    });
  });
});
