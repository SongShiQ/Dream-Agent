import { describe, it, expect } from 'vitest';
import {
  getCardsByTag,
  getKnowledgeCardById,
  searchCards,
  formatCardsForPrompt,
  isStudentVisible,
  type KnowledgeCard,
} from '@/lib/knowledge/cards';

describe('knowledge cards', () => {
  it('finds process cards by tag', async () => {
    const cards = await getCardsByTag('process', 5);
    expect(cards.length).toBeGreaterThan(0);
    expect(cards[0].title.length).toBeGreaterThan(0);
    expect(cards[0].excerpt.length).toBeGreaterThan(10);
  });

  it('applies path-level source defaults to legacy course pages', async () => {
    const [osCard] = await searchCards({ query: '操作系统概述', limit: 1 });
    expect(osCard.sourceRefs).toContain('ostep');
    expect(osCard.sources.some((source) => source.id === 'ostep')).toBe(true);
  });

  it('searches by Chinese query', async () => {
    const cards = await searchCards({ query: '虚拟内存', limit: 3 });
    expect(cards.length).toBeGreaterThan(0);
    const virtualMemory = cards.find((card) => card.id === 'virtual-memory');
    expect(virtualMemory?.courseVersion).toBe('2026-summer-os');
    expect(virtualMemory?.sourceRefs).toContain('rcore-tutorial-v3-ch4');
    expect(virtualMemory?.labGateIds).toContain('lab2-address');
  });

  it('formats prompt text', async () => {
    const cards = await getCardsByTag('ownership', 2);
    const text = formatCardsForPrompt(cards, 500);
    if (cards.length) {
      expect(text).toContain(cards[0].title);
      expect(text).toContain(`[K:${cards[0].id}]`);
      expect(text).toContain('不可信数据');
    }
  });

  it('excludes draft and deprecated cards from student retrieval', () => {
    const base = {
      id: 'draft',
      title: 'Draft',
      tags: [],
      labs: [],
      courseVersion: 'test',
      reviewStatus: 'pending',
      sourceRefs: [],
      sources: [],
      prerequisiteIds: [],
      misconceptionIds: [],
      questionTags: [],
      labGateIds: [],
      relatedIds: [],
      source: 'draft.md',
      contentHash: 'test-hash',
      content: 'draft',
      excerpt: 'draft',
      relevance: 0,
    } satisfies Omit<KnowledgeCard, 'publicationStatus'>;
    expect(isStudentVisible({ ...base, publicationStatus: 'published' })).toBe(true);
    expect(isStudentVisible({ ...base, publicationStatus: 'draft' })).toBe(false);
    expect(isStudentVisible({ ...base, publicationStatus: 'deprecated' })).toBe(false);
  });

  it('reads a published card by its stable ID and rejects invalid IDs', async () => {
    const card = await getKnowledgeCardById('os-theory-01-overview');
    expect(card?.id).toBe('os-theory-01-overview');
    expect(card?.publicationStatus).toBe('published');
    expect(await getKnowledgeCardById('')).toBeNull();
    expect(await getKnowledgeCardById('card-does-not-exist')).toBeNull();
  });
});
