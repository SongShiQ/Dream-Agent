/**
 * 知识库入口 — 文件卡片检索（非向量）
 */

export {
  searchCards,
  getCardsByTag,
  getStageMeta,
  getAllStageMeta,
  getOpencampMeta,
  formatCardsForPrompt,
  type KnowledgeCard,
} from './cards';

/** 兼容旧调用名 */
export async function searchKnowledge(
  query: string,
  topic?: string,
  limit: number = 5
) {
  const tags = topic ? [topic] : [];
  const cards = await (
    await import('./cards')
  ).searchCards({ query, tags, limit });
  return cards.map((c) => ({
    content: c.excerpt || c.content.slice(0, 500),
    source: c.source,
    topic: c.tags[0] || topic || 'general',
    relevance: c.relevance,
    title: c.title,
    tags: c.tags,
    labs: c.labs,
  }));
}
