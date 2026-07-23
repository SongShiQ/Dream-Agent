import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';

const fixture = vi.hoisted(() => ({
  knowledgeRaw: [
    '---',
    'id: test-card',
    'title: Test card',
    'course_version: course-v1',
    'publication_status: draft',
    'review_status: pending',
    'source_refs: [source-1]',
    'tags: [test]',
    'question_tags: [test]',
    'lab_gate_ids: [gate-1]',
    '---',
    '',
    '# Test card',
    '',
    'Body',
    '',
  ].join('\n'),
  experimentRaw: JSON.stringify({
    schemaVersion: 1,
    id: 'test-template',
    courseVersion: 'course-v1',
    title: 'Test template',
    publicationStatus: 'draft',
    reviewStatus: 'pending',
  }, null, 2) + '\n',
  tempWrites: new Map<string, string>(),
  knowledgeIssues: [] as Array<{ severity: 'error' | 'warning'; code: string; message: string }>,
}));

const sha = (value: string) => createHash('sha256').update(value).digest('hex');

vi.mock('@/lib/knowledge/review', () => ({
  buildKnowledgeReviewQueue: vi.fn(async () => ({
    items: [
      {
        id: 'test-card',
        title: 'Test card',
        source: 'cards/test-review.md',
        contentHash: sha(fixture.knowledgeRaw),
        courseVersion: 'course-v1',
        publicationStatus: 'draft',
        reviewStatus: 'pending',
        sourceRefs: ['source-1'],
        tags: ['test'],
        prerequisiteIds: [],
        relatedIds: [],
        labGateIds: ['gate-1'],
        questionTags: ['test'],
        issues: fixture.knowledgeIssues,
        publishReady: false,
      },
    ],
  })),
}));

vi.mock('@/lib/experiments/review', () => ({
  buildExperimentReviewQueue: vi.fn(async () => ({
    items: [
      {
        id: 'test-template',
        title: 'Test template',
        source: 'data/experiments/templates/test-template.json',
        contentHash: sha(fixture.experimentRaw),
        courseVersion: 'course-v1',
        publicationStatus: 'draft',
        reviewStatus: 'pending',
        issues: [],
        reviewReady: true,
        publishReady: false,
      },
    ],
  })),
}));

import {
  applyContentReviewDecisions,
  cancelContentReviewDecision,
  createContentReviewDecision,
} from '@/lib/content/review-decisions';

const testIo = {
  readText: vi.fn(async (path: string) =>
    path.endsWith('test-review.md') ? fixture.knowledgeRaw : fixture.experimentRaw
  ),
  writeText: vi.fn(async (path: string, content: string) => {
    fixture.tempWrites.set(path, content);
  }),
  move: vi.fn(async (from: string, to: string) => {
    const content = fixture.tempWrites.get(from);
    if (content === undefined) throw new Error('missing temp content');
    if (to.endsWith('test-review.md')) fixture.knowledgeRaw = content;
    else fixture.experimentRaw = content;
    fixture.tempWrites.delete(from);
  }),
  remove: vi.fn(async (path: string) => {
    fixture.tempWrites.delete(path);
  }),
};

const createDecision = (
  db: Parameters<typeof createContentReviewDecision>[0],
  input: Parameters<typeof createContentReviewDecision>[1]
) => createContentReviewDecision(db, input, testIo);

const applyDecisions = (
  db: Parameters<typeof applyContentReviewDecisions>[0],
  opts: Parameters<typeof applyContentReviewDecisions>[1]
) => applyContentReviewDecisions(db, opts, testIo);

type Decision = {
  id: string;
  targetKind: string;
  targetId: string;
  sourcePath: string;
  courseVersion: string;
  action: string;
  status: string;
  activeKey: string | null;
  actor: string;
  note: string;
  expectedHash: string;
  proposedHash: string;
  beforeState: string;
  afterState: string;
  failureReason: string;
  createdAt: Date;
  appliedAt: Date | null;
};

function fakeDb() {
  const decisions: Decision[] = [];
  let nextId = 1;
  const delegate = {
    create: vi.fn(async ({ data }: { data: Omit<Decision, 'id' | 'createdAt' | 'failureReason'> }) => {
      if (data.activeKey && decisions.some((item) => item.activeKey === data.activeKey)) {
        throw Object.assign(new Error('unique'), { code: 'P2002' });
      }
      const decision: Decision = {
        ...data,
        id: `decision-${nextId++}`,
        failureReason: '',
        createdAt: new Date('2026-07-20T01:00:00.000Z'),
      };
      decisions.push(decision);
      return decision;
    }),
    findMany: vi.fn(async ({ where, orderBy, take }: { where?: Record<string, unknown>; orderBy?: unknown; take?: number }) => {
      let rows = [...decisions];
      if (where) {
        rows = rows.filter((item) =>
          Object.entries(where).every(([key, value]) => item[key as keyof Decision] === value)
        );
      }
      rows.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      return take ? rows.slice(0, take) : rows;
    }),
    findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
      decisions.find((item) => item.id === where.id) || null
    ),
    update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<Decision> }) => {
      const decision = decisions.find((item) => item.id === where.id);
      if (!decision) throw new Error('missing decision');
      Object.assign(decision, data);
      return decision;
    }),
  };
  return {
    db: { contentReviewDecision: delegate } as unknown as Parameters<typeof createContentReviewDecision>[0],
    decisions,
    delegate,
  };
}

describe('content review decisions', () => {
  beforeEach(() => {
    fixture.knowledgeRaw = [
      '---',
      'id: test-card',
      'title: Test card',
      'course_version: course-v1',
      'publication_status: draft',
      'review_status: pending',
      'source_refs: [source-1]',
      'tags: [test]',
      'question_tags: [test]',
      'lab_gate_ids: [gate-1]',
      '---',
      '',
      '# Test card',
      '',
      'Body',
      '',
    ].join('\n');
    fixture.experimentRaw = JSON.stringify({
      schemaVersion: 1,
      id: 'test-template',
      courseVersion: 'course-v1',
      title: 'Test template',
      publicationStatus: 'draft',
      reviewStatus: 'pending',
    }, null, 2) + '\n';
    fixture.tempWrites.clear();
    fixture.knowledgeIssues = [];
  });

  it('queues an approval with reviewer provenance and rejects stale or duplicate decisions', async () => {
    const { db, decisions } = fakeDb();
    await expect(
      createDecision(db, {
        targetKind: 'knowledge_card',
        targetId: 'test-card',
        sourcePath: 'data/knowledge/cards/test-review.md',
        expectedHash: '0'.repeat(64),
        action: 'approve_review',
        actor: 'teacher-a',
      })
    ).rejects.toMatchObject({ code: 'stale_content', status: 409 });

    const created = await createDecision(db, {
      targetKind: 'knowledge_card',
      targetId: 'test-card',
      sourcePath: 'data/knowledge/cards/test-review.md',
      expectedHash: sha(fixture.knowledgeRaw),
      action: 'approve_review',
      actor: 'teacher-a',
      note: 'checked sources',
    });
    expect(created.decision.status).toBe('pending');
    expect(JSON.parse(decisions[0].afterState)).toMatchObject({
      reviewStatus: 'reviewed',
      reviewedBy: 'teacher-a',
    });
    await expect(
      createDecision(db, {
        targetKind: 'knowledge_card',
        targetId: 'test-card',
        sourcePath: 'data/knowledge/cards/test-review.md',
        expectedHash: sha(fixture.knowledgeRaw),
        action: 'deprecate',
        actor: 'teacher-b',
      })
    ).rejects.toMatchObject({ code: 'pending_decision_exists', status: 409 });
  });

  it('records request_changes immediately and requires a meaningful note', async () => {
    const { db, decisions } = fakeDb();
    await expect(
      createDecision(db, {
        targetKind: 'knowledge_card',
        targetId: 'test-card',
        sourcePath: 'data/knowledge/cards/test-review.md',
        expectedHash: sha(fixture.knowledgeRaw),
        action: 'request_changes',
        actor: 'teacher-a',
        note: 'fix',
      })
    ).rejects.toMatchObject({ code: 'note_required', status: 400 });
    await createDecision(db, {
      targetKind: 'knowledge_card',
      targetId: 'test-card',
      sourcePath: 'data/knowledge/cards/test-review.md',
      expectedHash: sha(fixture.knowledgeRaw),
      action: 'request_changes',
      actor: 'teacher-a',
      note: 'Please add an exact source chapter.',
    });
    expect(decisions[0]).toMatchObject({ status: 'applied', activeKey: null });
  });

  it('dry-runs without writing, then atomically applies the exact approved content', async () => {
    const { db, decisions } = fakeDb();
    await createDecision(db, {
      targetKind: 'knowledge_card',
      targetId: 'test-card',
      sourcePath: 'data/knowledge/cards/test-review.md',
      expectedHash: sha(fixture.knowledgeRaw),
      action: 'approve_review',
      actor: 'teacher-a',
    });
    const before = fixture.knowledgeRaw;
    const dryRun = await applyDecisions(db, {});
    expect(dryRun.results).toContainEqual(expect.objectContaining({ outcome: 'would_apply' }));
    expect(fixture.knowledgeRaw).toBe(before);
    expect(decisions[0].status).toBe('pending');

    const applied = await applyDecisions(db, { apply: true });
    expect(applied.results).toContainEqual(expect.objectContaining({ outcome: 'applied' }));
    expect(fixture.knowledgeRaw).toContain('review_status: reviewed');
    expect(fixture.knowledgeRaw).toContain('reviewed_by: teacher-a');
    expect(fixture.knowledgeRaw).toContain('---\n\n# Test card');
    expect(decisions[0]).toMatchObject({ status: 'applied', activeKey: null, failureReason: '' });
  });

  it('marks a changed source stale instead of overwriting it', async () => {
    const { db, decisions } = fakeDb();
    await createDecision(db, {
      targetKind: 'knowledge_card',
      targetId: 'test-card',
      sourcePath: 'data/knowledge/cards/test-review.md',
      expectedHash: sha(fixture.knowledgeRaw),
      action: 'approve_review',
      actor: 'teacher-a',
    });
    fixture.knowledgeRaw += '\nTeacher edited this after review.\n';
    const result = await applyDecisions(db, { apply: true });
    expect(result.results).toContainEqual(expect.objectContaining({ outcome: 'stale' }));
    expect(decisions[0]).toMatchObject({ status: 'stale', activeKey: null });
    expect(fixture.knowledgeRaw).toContain('Teacher edited this after review.');
  });

  it('rechecks current audit rules before applying an older approval', async () => {
    const { db, decisions } = fakeDb();
    await createDecision(db, {
      targetKind: 'knowledge_card',
      targetId: 'test-card',
      sourcePath: 'data/knowledge/cards/test-review.md',
      expectedHash: sha(fixture.knowledgeRaw),
      action: 'approve_review',
      actor: 'teacher-a',
    });
    fixture.knowledgeIssues = [
      { severity: 'error', code: 'new_rule', message: 'New audit rule blocks this card.' },
    ];
    const result = await applyDecisions(db, { apply: true });
    expect(result.results).toContainEqual(expect.objectContaining({ outcome: 'audit_blocked' }));
    expect(decisions[0]).toMatchObject({ status: 'stale', activeKey: null });
    expect(fixture.knowledgeRaw).toContain('review_status: pending');
  });

  it('cancels a pending decision and releases its active key', async () => {
    const { db, decisions } = fakeDb();
    const created = await createDecision(db, {
      targetKind: 'knowledge_card',
      targetId: 'test-card',
      sourcePath: 'data/knowledge/cards/test-review.md',
      expectedHash: sha(fixture.knowledgeRaw),
      action: 'approve_review',
      actor: 'teacher-a',
    });
    await cancelContentReviewDecision(db, {
      decisionId: created.decision.id,
      actor: 'teacher-b',
      note: 'wrong target',
    });
    expect(decisions[0]).toMatchObject({ status: 'cancelled', activeKey: null });
  });

  it('applies experiment review provenance and blocks publishing a pending template', async () => {
    const { db, decisions } = fakeDb();
    await expect(
      createDecision(db, {
        targetKind: 'experiment_template',
        targetId: 'test-template',
        sourcePath: 'data/experiments/templates/test-template.json',
        expectedHash: sha(fixture.experimentRaw),
        action: 'publish',
        actor: 'teacher-a',
      })
    ).rejects.toMatchObject({ code: 'not_publish_ready', status: 409 });

    await createDecision(db, {
      targetKind: 'experiment_template',
      targetId: 'test-template',
      sourcePath: 'data/experiments/templates/test-template.json',
      expectedHash: sha(fixture.experimentRaw),
      action: 'approve_review',
      actor: 'teacher-a',
    });
    await applyDecisions(db, { apply: true });
    const parsed = JSON.parse(fixture.experimentRaw) as Record<string, unknown>;
    expect(parsed).toMatchObject({ reviewStatus: 'reviewed', reviewedBy: 'teacher-a' });
    expect(decisions[0]).toMatchObject({ status: 'applied', activeKey: null });
  });
});
