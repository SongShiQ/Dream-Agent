import { describe, expect, it } from 'vitest';
import {
  decodeKnowledgeReferencesHeader,
  encodeKnowledgeReferencesHeader,
  parseKnowledgeReferences,
  serializeKnowledgeReferences,
} from '@/lib/knowledge/references';

const reference = {
  id: 'virtual-memory',
  title: '虚拟内存与缺页',
  source: 'cards/virtual-memory.md',
  sourceRefs: ['rcore-tutorial-v3-ch4'],
  labGateIds: ['lab2-address'],
  publicationStatus: 'published' as const,
  reviewStatus: 'pending' as const,
  relevance: 5,
};

describe('knowledge references', () => {
  it('round-trips Chinese references through the response header', () => {
    const encoded = encodeKnowledgeReferencesHeader([reference]);
    expect(decodeKnowledgeReferencesHeader(encoded)).toEqual([reference]);
  });

  it('sanitizes stored JSON and rejects malformed values', () => {
    expect(parseKnowledgeReferences('not-json')).toEqual([]);
    expect(parseKnowledgeReferences([{ id: '', title: 'x', source: 'x' }])).toEqual([]);
    expect(JSON.parse(serializeKnowledgeReferences([reference]))).toEqual([reference]);
  });
});
