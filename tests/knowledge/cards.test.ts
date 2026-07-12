import { describe, it, expect } from 'vitest';
import {
  getCardsByTag,
  searchCards,
  formatCardsForPrompt,
} from '@/lib/knowledge/cards';

describe('knowledge cards', () => {
  it('finds process cards by tag', async () => {
    const cards = await getCardsByTag('process', 5);
    expect(cards.length).toBeGreaterThan(0);
    expect(cards[0].title.length).toBeGreaterThan(0);
    expect(cards[0].excerpt.length).toBeGreaterThan(10);
  });

  it('searches by Chinese query', async () => {
    const cards = await searchCards({ query: '虚拟内存', limit: 3 });
    expect(cards.length).toBeGreaterThan(0);
  });

  it('formats prompt text', async () => {
    const cards = await getCardsByTag('ownership', 2);
    const text = formatCardsForPrompt(cards, 500);
    if (cards.length) {
      expect(text).toContain(cards[0].title);
    }
  });
});
