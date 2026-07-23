import type { KnowledgeCard, KnowledgeSource } from './cards';
import { getKnowledgeSourceRegistry, listKnowledgeCards } from './cards';
import { listGateDefs } from '@/lib/labs';
import { loadFoundationContent } from '@/lib/foundation/units';

export type KnowledgeReviewSeverity = 'error' | 'warning' | 'info';

export type KnowledgeReviewIssue = {
  code: string;
  severity: KnowledgeReviewSeverity;
  message: string;
};

export type KnowledgeReviewItem = {
  id: string;
  title: string;
  source: string;
  contentHash: string;
  courseVersion: string;
  publicationStatus: KnowledgeCard['publicationStatus'];
  reviewStatus: KnowledgeCard['reviewStatus'];
  reviewedBy?: string;
  reviewedAt?: string;
  sourceRefs: string[];
  tags: string[];
  prerequisiteIds: string[];
  relatedIds: string[];
  labGateIds: string[];
  questionTags: string[];
  issues: KnowledgeReviewIssue[];
  publishReady: boolean;
};

export type KnowledgeReviewFilters = {
  publicationStatus?: KnowledgeCard['publicationStatus'] | 'all';
  reviewStatus?: KnowledgeCard['reviewStatus'] | 'all';
  severity?: KnowledgeReviewSeverity | 'all';
  query?: string;
};

function issue(code: string, severity: KnowledgeReviewSeverity, message: string): KnowledgeReviewIssue {
  return { code, severity, message };
}

export function auditKnowledgeCards(opts: {
  cards: KnowledgeCard[];
  sourceRegistry: Record<string, KnowledgeSource>;
  gateIds: Set<string>;
  additionalRelationIds?: Set<string>;
}): KnowledgeReviewItem[] {
  const idCounts = new Map<string, number>();
  for (const card of opts.cards) idCounts.set(card.id, (idCounts.get(card.id) || 0) + 1);
  const cardIds = new Set(opts.cards.map((card) => card.id));
  const relationIds = new Set([...cardIds, ...(opts.additionalRelationIds || [])]);

  return opts.cards.map((card) => {
    const issues: KnowledgeReviewIssue[] = [];
    if ((idCounts.get(card.id) || 0) > 1) {
      issues.push(issue('duplicate_id', 'error', `稳定 ID 重复：${card.id}`));
    }
    if (!card.content.trim()) issues.push(issue('empty_content', 'error', '正文为空'));
    if (!card.sourceRefs.length) {
      issues.push(issue('missing_source', 'error', '没有可追溯 source_refs'));
    }
    for (const sourceRef of card.sourceRefs) {
      if (!opts.sourceRegistry[sourceRef]) {
        issues.push(issue('unknown_source', 'error', `来源未登记：${sourceRef}`));
      }
    }
    for (const relationId of [...card.prerequisiteIds, ...card.relatedIds]) {
      if (!relationIds.has(relationId)) {
        issues.push(issue('dangling_relation', 'error', `知识关系指向不存在的卡片：${relationId}`));
      }
    }
    for (const gateId of card.labGateIds) {
      if (!opts.gateIds.has(gateId)) {
        issues.push(issue('unknown_gate', 'error', `关联不存在的 Lab Gate：${gateId}`));
      }
    }
    if (card.reviewStatus === 'reviewed') {
      if (!card.reviewedBy || !card.reviewedAt) {
        issues.push(issue('missing_review_provenance', 'error', 'reviewed 条目缺 reviewed_by/reviewed_at'));
      } else if (Number.isNaN(Date.parse(card.reviewedAt))) {
        issues.push(issue('invalid_review_time', 'error', `reviewed_at 无法解析：${card.reviewedAt}`));
      }
    } else {
      issues.push(issue('pending_review', 'warning', '尚待教师复核'));
    }
    if (card.publicationStatus === 'published' && card.reviewStatus !== 'reviewed') {
      issues.push(issue('published_pending', 'warning', '学生可见但尚未教师复核'));
    }
    if (!card.tags.length) issues.push(issue('missing_tags', 'warning', '缺少检索标签'));
    if (!card.questionTags.length) {
      issues.push(issue('missing_question_link', 'info', '尚未关联题目标签'));
    }
    if (!card.labGateIds.length) {
      issues.push(issue('missing_gate_link', 'info', '尚未关联 Lab Gate'));
    }

    return {
      id: card.id,
      title: card.title,
      source: card.source,
      contentHash: card.contentHash,
      courseVersion: card.courseVersion,
      publicationStatus: card.publicationStatus,
      reviewStatus: card.reviewStatus,
      reviewedBy: card.reviewedBy,
      reviewedAt: card.reviewedAt,
      sourceRefs: card.sourceRefs,
      tags: card.tags,
      prerequisiteIds: card.prerequisiteIds,
      relatedIds: card.relatedIds,
      labGateIds: card.labGateIds,
      questionTags: card.questionTags,
      issues,
      publishReady:
        card.reviewStatus === 'reviewed' &&
        card.publicationStatus !== 'deprecated' &&
        !issues.some((item) => item.severity === 'error'),
    };
  });
}

function filterItems(items: KnowledgeReviewItem[], filters: KnowledgeReviewFilters) {
  const query = filters.query?.trim().toLowerCase();
  return items.filter((item) => {
    if (
      filters.publicationStatus &&
      filters.publicationStatus !== 'all' &&
      item.publicationStatus !== filters.publicationStatus
    ) return false;
    if (
      filters.reviewStatus &&
      filters.reviewStatus !== 'all' &&
      item.reviewStatus !== filters.reviewStatus
    ) return false;
    if (
      filters.severity &&
      filters.severity !== 'all' &&
      !item.issues.some((issue) => issue.severity === filters.severity)
    ) return false;
    if (query) {
      const haystack = `${item.id} ${item.title} ${item.source} ${item.tags.join(' ')}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

export async function buildKnowledgeReviewQueue(filters: KnowledgeReviewFilters = {}) {
  const [cards, sourceRegistry, gates, foundation] = await Promise.all([
    listKnowledgeCards({ includeUnpublished: true }),
    getKnowledgeSourceRegistry(),
    listGateDefs(),
    loadFoundationContent(),
  ]);
  const audited = auditKnowledgeCards({
    cards,
    sourceRegistry,
    gateIds: new Set(gates.map((gate) => gate.id)),
    additionalRelationIds: new Set(foundation.units.map((unit) => unit.id)),
  });
  const items = filterItems(audited, filters);
  const allIssues = items.flatMap((item) => item.issues);
  return {
    generatedAt: new Date().toISOString(),
    filters,
    summary: {
      total: items.length,
      published: items.filter((item) => item.publicationStatus === 'published').length,
      draft: items.filter((item) => item.publicationStatus === 'draft').length,
      deprecated: items.filter((item) => item.publicationStatus === 'deprecated').length,
      reviewed: items.filter((item) => item.reviewStatus === 'reviewed').length,
      pending: items.filter((item) => item.reviewStatus === 'pending').length,
      publishReady: items.filter((item) => item.publishReady).length,
      errors: allIssues.filter((item) => item.severity === 'error').length,
      warnings: allIssues.filter((item) => item.severity === 'warning').length,
      info: allIssues.filter((item) => item.severity === 'info').length,
    },
    items,
  };
}
