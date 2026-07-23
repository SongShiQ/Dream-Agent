import { describe, expect, it } from 'vitest';
import { auditOpenKBManifest, evaluateContentRelease } from '@/lib/content/release-check';

const knowledge = {
  id: 'virtual-memory',
  title: '虚拟内存与缺页',
  source: 'cards/virtual-memory.md',
  publicationStatus: 'draft' as const,
  reviewStatus: 'pending' as const,
  tags: ['memory'],
  questionTags: ['virtual_memory'],
  issues: [{ code: 'pending_review', severity: 'warning' as const, message: '待复核' }],
};

const experiment = {
  id: 'vm-address-translation-v1',
  source: 'data/experiments/templates/vm-address-translation-v1.json',
  publicationStatus: 'draft' as const,
  reviewStatus: 'pending' as const,
  issues: [{ code: 'pending_review', severity: 'warning' as const, message: '待复核' }],
};

describe('content release check', () => {
  it('allows draft and pending content in development mode with warnings omitted from blockers', () => {
    const result = evaluateContentRelease({
      mode: 'development',
      knowledgeItems: [knowledge],
      experimentItems: [experiment],
      decisions: [{ id: 'decision-1', status: 'pending', targetKind: 'knowledge_card', targetId: knowledge.id, sourcePath: `data/knowledge/${knowledge.source}` }],
    });
    expect(result.decision).toBe('pass');
    expect(result.summary.errors).toBe(0);
    expect(result.summary.warnings).toBe(5);
  });

  it('blocks release for draft, pending, and unapplied decisions', () => {
    const result = evaluateContentRelease({
      mode: 'release',
      knowledgeItems: [knowledge],
      experimentItems: [experiment],
      decisions: [{ id: 'decision-1', status: 'pending', targetKind: 'knowledge_card', targetId: knowledge.id, sourcePath: `data/knowledge/${knowledge.source}` }],
    });
    expect(result.decision).toBe('fail');
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['pending_review', 'not_published', 'pending_decision'])
    );
  });

  it('treats stale decisions as release blockers', () => {
    const result = evaluateContentRelease({
      mode: 'release',
      knowledgeItems: [],
      experimentItems: [],
      decisions: [{ id: 'decision-1', status: 'stale', targetKind: 'knowledge_card', targetId: 'x', sourcePath: 'data/knowledge/cards/x.md' }],
    });
    expect(result.issues).toContainEqual(expect.objectContaining({ code: 'stale_decision', severity: 'error' }));
  });

  it('checks OpenKB source references against both the manifest and course registry', () => {
    const result = auditOpenKBManifest(
      {
        courseVersion: '2026-summer-os',
        sources: { known: { title: 'Known' } },
        defaultSourceRefs: ['known', 'missing'],
      },
      { path: 'data/knowledge/openkb-manifest.json', sourceRegistry: { known: {} } }
    );
    expect(result.issues.map((issue) => issue.code)).toContain('unknown_manifest_source');

    const missingRegistry = auditOpenKBManifest(
      { courseVersion: '2026-summer-os', sources: { known: { title: 'Known' } }, defaultSourceRefs: ['known'] },
      { path: 'data/knowledge/openkb-manifest.json', sourceRegistry: {} }
    );
    expect(missingRegistry.issues.map((issue) => issue.code)).toContain('source_not_in_registry');
  });

  it('warns in development and blocks release when a foundation unit lacks matching questions', () => {
    const foundationCoverage = [{
      unitId: 'toolchain-code-reading',
      title: '工具链与读代码',
      sourcePath: 'data/curriculum/2026-summer-os/foundation-units.json',
      requiredQuestions: 5,
      requiredQuestionsPerTag: 2,
      availableQuestions: 2,
      tagCoverage: [{ tag: 'tooling', questions: 2 }],
      uncoveredTags: ['cargo'],
      undercoveredTags: ['cargo'],
      remediationCoverage: [{ tag: 'tooling', cardIds: [] }],
      uncoveredRemediationTags: ['tooling'],
      difficulty: { min: 35, max: 50, average: 42 },
      issues: [{
        code: 'insufficient_question_coverage',
        message: '微单元需要至少 5 道匹配题，当前只有 2 道',
      }, {
        code: 'insufficient_tag_coverage',
        message: '每个目标标签需要至少 2 道题，当前不足：cargo',
      }, {
        code: 'missing_remediation_card',
        message: '答错后没有学生可见补弱知识卡：tooling',
      }],
    }];

    const development = evaluateContentRelease({
      mode: 'development',
      knowledgeItems: [],
      experimentItems: [],
      decisions: [],
      foundationCoverage,
    });
    const release = evaluateContentRelease({
      mode: 'release',
      knowledgeItems: [],
      experimentItems: [],
      decisions: [],
      foundationCoverage,
    });

    expect(development.decision).toBe('pass');
    expect(development.summary.foundationUncoveredTags).toBe(1);
    expect(development.summary.foundationUndercoveredTags).toBe(1);
    expect(development.summary.foundationUncoveredRemediationTags).toBe(1);
    expect(development.details.foundationCoverage[0].difficulty.average).toBe(42);
    expect(development.issues[0]).toMatchObject({ severity: 'warning', targetKind: 'foundation_unit' });
    expect(release.decision).toBe('fail');
    expect(release.issues[0]).toMatchObject({ severity: 'error', code: 'insufficient_question_coverage' });
    expect(release.issues).toContainEqual(expect.objectContaining({
      severity: 'error',
      code: 'insufficient_tag_coverage',
    }));
    expect(release.issues).toContainEqual(expect.objectContaining({
      severity: 'error',
      code: 'missing_remediation_card',
    }));
  });

  it('warns in development and blocks release when a required topic pack has broken links', () => {
    const foundationTopicPacks = [{
      id: 'topic-os-overview-interrupts',
      unitId: 'os-overview-interrupts',
      title: 'OS 总览与中断学习地图',
      sourcePath: 'data/curriculum/2026-summer-os/foundation-topic-packs.json',
      learningObjectives: ['区分用户态与内核态'],
      misconceptions: [],
      questionCoverage: [],
      remediationCards: [],
      nextTask: {
        unitId: 'process-scheduling',
        title: '进程与调度',
        label: '继续学习',
        relation: 'prerequisite' as const,
        valid: false,
      },
      checks: {
        learningObjectives: true,
        misconceptions: false,
        questionCoverage: false,
        remediationCards: false,
        nextTask: false,
      },
      ready: false,
      issues: [{ code: 'invalid_topic_next_task', message: '下一任务没有连接到课程前置关系' }],
    }];
    const development = evaluateContentRelease({
      mode: 'development',
      knowledgeItems: [],
      experimentItems: [],
      decisions: [],
      foundationTopicPacks,
    });
    const release = evaluateContentRelease({
      mode: 'release',
      knowledgeItems: [],
      experimentItems: [],
      decisions: [],
      foundationTopicPacks,
    });

    expect(development.decision).toBe('pass');
    expect(development.summary.foundationTopicPacks).toBe(1);
    expect(development.summary.foundationTopicPackIssues).toBe(1);
    expect(development.issues[0]).toMatchObject({
      severity: 'warning',
      targetKind: 'foundation_topic_pack',
    });
    expect(release.decision).toBe('fail');
    expect(release.issues[0]).toMatchObject({
      severity: 'error',
      code: 'invalid_topic_next_task',
    });
  });
});
