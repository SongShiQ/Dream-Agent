import { describe, it, expect } from 'vitest';
import { computeUnlockStatus, listGateDefs } from '@/lib/labs/gates';
import type { LabGateDef } from '@/lib/labs/types';
import { normalizeGeneratedQuestion } from '@/lib/agents/examiner';

const base = (partial: Partial<LabGateDef> & { id: string }): LabGateDef => ({
  id: partial.id,
  title: partial.title || partial.id,
  chapter: partial.chapter || 'basic',
  stageIds: partial.stageIds || [],
  order: partial.order || 0,
  judgeKind: partial.judgeKind || 'unit_oj',
  editorMode: partial.editorMode || 'web_snippet',
  docLinks: [],
  checklist: [],
  conceptTags: [],
  unlockAfter: partial.unlockAfter || [],
});

describe('computeUnlockStatus', () => {
  it('unlocks root gates', () => {
    const g = base({ id: 'env-setup', unlockAfter: [] });
    expect(computeUnlockStatus(g, new Map())).toBe('unlocked');
  });

  it('locks until preds passed', () => {
    const g = base({ id: 'lab2', unlockAfter: ['lab1'] });
    const map = new Map([['lab1', { status: 'unlocked' }]]);
    expect(computeUnlockStatus(g, map)).toBe('locked');
    map.set('lab1', { status: 'passed' });
    expect(computeUnlockStatus(g, map)).toBe('unlocked');
  });

  it('keeps passed', () => {
    const g = base({ id: 'lab1', unlockAfter: [] });
    const map = new Map([['lab1', { status: 'passed' }]]);
    expect(computeUnlockStatus(g, map)).toBe('passed');
  });
});

describe('M4 unit gate chain', () => {
  it('keeps five basic unit gates before lab1', async () => {
    const gates = await listGateDefs();
    const ids = gates.map((g) => g.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'env-setup',
        'rustlings-variables',
        'rustlings-move',
        'rust-result',
        'basic-syscall-model',
        'lab1-batch',
      ])
    );

    const lab1 = gates.find((g) => g.id === 'lab1-batch');
    expect(lab1?.unlockAfter).toEqual(['basic-syscall-model']);
    expect(gates.filter((g) => g.judgeKind === 'unit_oj').slice(0, 5).map((g) => g.id)).toEqual([
      'env-setup',
      'rustlings-variables',
      'rustlings-move',
      'rust-result',
      'basic-syscall-model',
    ]);
  });
});

describe('OJ answer normalize still works', () => {
  it('ai options get letters', () => {
    const q = normalizeGeneratedQuestion({
      type: 'choice',
      content: 'test',
      options: ['x', 'y', 'z', 'w'],
      answer: 'y',
      explanation: 'e',
      knowledgePoints: ['process'],
      difficulty: 40,
    });
    expect(q.options[1].startsWith('B.')).toBe(true);
    expect(q.answer).toBe('B');
  });
});
