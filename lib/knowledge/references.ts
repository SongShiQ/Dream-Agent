import type { KnowledgeCard } from './cards';

export type KnowledgeReference = {
  id: string;
  title: string;
  source: string;
  sourceRefs: string[];
  labGateIds: string[];
  publicationStatus: 'published' | 'draft' | 'deprecated';
  reviewStatus: 'reviewed' | 'pending';
  relevance: number;
};

const MAX_REFERENCES = 5;
const MAX_TEXT_LENGTH = 240;

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, MAX_TEXT_LENGTH) : '';
}

function cleanList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(cleanText)
    .filter(Boolean)
    .slice(0, 12);
}

function normalizeReference(value: unknown): KnowledgeReference | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const id = cleanText(raw.id);
  const title = cleanText(raw.title);
  const source = cleanText(raw.source);
  if (!id || !title || !source) return null;

  const publicationStatus =
    raw.publicationStatus === 'draft' || raw.publicationStatus === 'deprecated'
      ? raw.publicationStatus
      : 'published';
  const reviewStatus = raw.reviewStatus === 'reviewed' ? 'reviewed' : 'pending';
  const relevance = Number(raw.relevance);

  return {
    id,
    title,
    source,
    sourceRefs: cleanList(raw.sourceRefs),
    labGateIds: cleanList(raw.labGateIds),
    publicationStatus,
    reviewStatus,
    relevance: Number.isFinite(relevance) ? relevance : 0,
  };
}

export function toKnowledgeReferences(cards: KnowledgeCard[]): KnowledgeReference[] {
  return cards.slice(0, MAX_REFERENCES).map((card) => ({
    id: card.id,
    title: card.title,
    source: card.source,
    sourceRefs: card.sourceRefs,
    labGateIds: card.labGateIds,
    publicationStatus: card.publicationStatus,
    reviewStatus: card.reviewStatus,
    relevance: card.relevance,
  }));
}

export function parseKnowledgeReferences(value: unknown): KnowledgeReference[] {
  let parsed = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map(normalizeReference)
    .filter((item): item is KnowledgeReference => item !== null)
    .slice(0, MAX_REFERENCES);
}

export function serializeKnowledgeReferences(value: unknown): string {
  return JSON.stringify(parseKnowledgeReferences(value));
}

export function encodeKnowledgeReferencesHeader(value: unknown): string {
  return encodeURIComponent(serializeKnowledgeReferences(value));
}

export function decodeKnowledgeReferencesHeader(value: string | null): KnowledgeReference[] {
  if (!value) return [];
  try {
    return parseKnowledgeReferences(decodeURIComponent(value));
  } catch {
    return [];
  }
}
