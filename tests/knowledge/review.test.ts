import { describe, expect, it } from 'vitest';
import { auditKnowledgeCards } from '@/lib/knowledge/review';
import type { KnowledgeCard } from '@/lib/knowledge/cards';

function card(overrides: Partial<KnowledgeCard> = {}): KnowledgeCard {
  return {
    id: 'virtual-memory',
    title: '虚拟内存',
    tags: ['memory'],
    stage: 'basic',
    labs: ['lab2-address'],
    courseVersion: '2026-summer-os',
    publicationStatus: 'draft',
    reviewStatus: 'pending',
    sourceRefs: ['rcore-ch4'],
    sources: [{ id: 'rcore-ch4', title: 'rCore ch4' }],
    prerequisiteIds: [],
    misconceptionIds: [],
    questionTags: ['virtual_memory'],
    labGateIds: ['lab2-address'],
    relatedIds: [],
    source: 'cards/virtual-memory.md',
    contentHash: 'test-hash',
    content: '# 虚拟内存\n正文',
    excerpt: '正文',
    relevance: 0,
    ...overrides,
  };
}

describe('knowledge review audit', () => {
  it('marks a reviewed card with valid provenance as publish-ready', () => {
    const [item] = auditKnowledgeCards({
      cards: [
        card({
          reviewStatus: 'reviewed',
          reviewedBy: 'teacher-1',
          reviewedAt: '2026-07-19T08:00:00Z',
        }),
      ],
      sourceRegistry: { 'rcore-ch4': { id: 'rcore-ch4', title: 'rCore ch4' } },
      gateIds: new Set(['lab2-address']),
      additionalRelationIds: new Set(['os-overview-interrupts']),
    });
    expect(item.publishReady).toBe(true);
    expect(item.issues).toEqual([]);
  });

  it('finds missing sources, dangling relations, unknown gates and pending review', () => {
    const [item] = auditKnowledgeCards({
      cards: [
        card({
          sourceRefs: ['missing-source'],
          prerequisiteIds: ['does-not-exist'],
          labGateIds: ['missing-gate'],
        }),
      ],
      sourceRegistry: {},
      gateIds: new Set(),
    });
    const codes = item.issues.map((issue) => issue.code);
    expect(codes).toEqual(
      expect.arrayContaining(['unknown_source', 'dangling_relation', 'unknown_gate', 'pending_review'])
    );
    expect(item.publishReady).toBe(false);
  });

  it('accepts a prerequisite owned by a Foundation unit', () => {
    const [item] = auditKnowledgeCards({
      cards: [card({ prerequisiteIds: ['foundation-unit'] })],
      sourceRegistry: { 'rcore-ch4': { id: 'rcore-ch4', title: 'rCore ch4' } },
      gateIds: new Set(['lab2-address']),
      additionalRelationIds: new Set(['foundation-unit']),
    });
    expect(item.issues.map((issue) => issue.code)).not.toContain('dangling_relation');
  });

  it('blocks published pending cards and missing review provenance', () => {
    const [item] = auditKnowledgeCards({
      cards: [card({ publicationStatus: 'published', reviewStatus: 'reviewed' })],
      sourceRegistry: { 'rcore-ch4': { id: 'rcore-ch4', title: 'rCore ch4' } },
      gateIds: new Set(['lab2-address']),
    });
    expect(item.issues.map((issue) => issue.code)).toContain('missing_review_provenance');
    expect(item.publishReady).toBe(false);
  });
});
