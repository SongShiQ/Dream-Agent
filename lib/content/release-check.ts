import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { PrismaClient } from '@prisma/client';
import prisma from '@/lib/db/index';
import { buildExperimentReviewQueue } from '@/lib/experiments/review';
import { buildKnowledgeReviewQueue, type KnowledgeReviewItem } from '@/lib/knowledge/review';
import { getKnowledgeSourceRegistry } from '@/lib/knowledge/cards';
import { auditFoundationQuestionCoverage, type FoundationQuestionCoverage } from '@/lib/foundation/coverage';
import {
  auditFoundationQuestionQuality,
  type FoundationQuestionQualityAudit,
} from '@/lib/foundation/question-quality';
import {
  FOUNDATION_QUESTION_STAGES,
  FOUNDATION_QUIZ_QUESTION_COUNT,
  loadFoundationContent,
} from '@/lib/foundation/units';
import {
  auditFoundationTopicPacks,
  loadFoundationTopicPacks,
  type FoundationTopicPackAudit,
} from '@/lib/foundation/topic-packs';

export type ContentReleaseMode = 'development' | 'release';
export type ContentReleaseSeverity = 'error' | 'warning';

export type ContentReleaseIssue = {
  severity: ContentReleaseSeverity;
  code: string;
  targetKind:
    | 'knowledge_card'
    | 'experiment_template'
    | 'content_decision'
    | 'openkb_manifest'
    | 'foundation_unit'
    | 'foundation_topic_pack'
    | 'foundation_question_quality';
  targetId: string;
  sourcePath?: string;
  message: string;
};

export type OpenKBManifestAudit = {
  path: string;
  issues: Array<{ code: string; message: string }>;
};

type KnowledgeQueueItem = Pick<KnowledgeReviewItem, 'id' | 'title' | 'source' | 'publicationStatus' | 'reviewStatus' | 'tags' | 'questionTags' | 'issues'>;
type ExperimentQueueItem = {
  id: string;
  source: string;
  publicationStatus: 'published' | 'draft' | 'deprecated';
  reviewStatus: 'reviewed' | 'pending';
  issues: Array<{ code: string; severity: 'error' | 'warning' | 'info'; message: string }>;
};
type DecisionRow = {
  id: string;
  status: string;
  targetKind: string;
  targetId: string;
  sourcePath: string;
};

export type ContentReleaseCheckInput = {
  mode: ContentReleaseMode;
  knowledgeItems: KnowledgeQueueItem[];
  experimentItems: ExperimentQueueItem[];
  decisions: DecisionRow[];
  manifests?: OpenKBManifestAudit[];
  foundationCoverage?: FoundationQuestionCoverage[];
  foundationTopicPacks?: FoundationTopicPackAudit[];
  foundationQuestionQuality?: FoundationQuestionQualityAudit;
};

function pushIssue(
  issues: ContentReleaseIssue[],
  issue: Omit<ContentReleaseIssue, 'severity'> & { severity?: ContentReleaseSeverity }
) {
  const key = `${issue.targetKind}:${issue.targetId}:${issue.code}`;
  if (issues.some((item) => `${item.targetKind}:${item.targetId}:${item.code}` === key)) return;
  issues.push({ severity: 'error', ...issue });
}

export function evaluateContentRelease(input: ContentReleaseCheckInput) {
  const issues: ContentReleaseIssue[] = [];
  const isRelease = input.mode === 'release';

  for (const item of input.knowledgeItems) {
    for (const auditIssue of item.issues) {
      if (auditIssue.severity === 'error') {
        pushIssue(issues, {
          targetKind: 'knowledge_card',
          targetId: item.id,
          sourcePath: `data/knowledge/${item.source}`,
          code: auditIssue.code,
          message: auditIssue.message,
        });
      } else if (isRelease && ['pending_review', 'published_pending'].includes(auditIssue.code)) {
        pushIssue(issues, {
          targetKind: 'knowledge_card',
          targetId: item.id,
          sourcePath: `data/knowledge/${item.source}`,
          code: auditIssue.code,
          message: auditIssue.message,
        });
      } else if (auditIssue.severity === 'warning') {
        pushIssue(issues, {
          severity: 'warning',
          targetKind: 'knowledge_card',
          targetId: item.id,
          sourcePath: `data/knowledge/${item.source}`,
          code: auditIssue.code,
          message: auditIssue.message,
        });
      }
    }
    if (item.publicationStatus === 'draft') {
      pushIssue(issues, {
        severity: isRelease ? 'error' : 'warning',
        targetKind: 'knowledge_card',
        targetId: item.id,
        sourcePath: `data/knowledge/${item.source}`,
        code: 'not_published',
        message: '发布验收要求 publication_status=published（deprecated 条目除外）',
      });
    }
    if (item.reviewStatus === 'pending') {
      pushIssue(issues, {
        severity: isRelease ? 'error' : 'warning',
        targetKind: 'knowledge_card',
        targetId: item.id,
        sourcePath: `data/knowledge/${item.source}`,
        code: 'pending_review',
        message: '知识卡尚未教师复核',
      });
    }
  }

  for (const item of input.experimentItems) {
    for (const auditIssue of item.issues) {
      if (auditIssue.severity === 'error') {
        pushIssue(issues, {
          targetKind: 'experiment_template',
          targetId: item.id,
          sourcePath: item.source,
          code: auditIssue.code,
          message: auditIssue.message,
        });
      } else if (isRelease && auditIssue.code === 'pending_review') {
        pushIssue(issues, {
          targetKind: 'experiment_template',
          targetId: item.id,
          sourcePath: item.source,
          code: auditIssue.code,
          message: auditIssue.message,
        });
      } else if (auditIssue.severity === 'warning') {
        pushIssue(issues, {
          severity: 'warning',
          targetKind: 'experiment_template',
          targetId: item.id,
          sourcePath: item.source,
          code: auditIssue.code,
          message: auditIssue.message,
        });
      }
    }
    if (item.publicationStatus === 'draft') {
      pushIssue(issues, {
        severity: isRelease ? 'error' : 'warning',
        targetKind: 'experiment_template',
        targetId: item.id,
        sourcePath: item.source,
        code: 'not_published',
        message: '发布验收要求 publicationStatus=published（deprecated 条目除外）',
      });
    }
    if (item.reviewStatus === 'pending') {
      pushIssue(issues, {
        severity: isRelease ? 'error' : 'warning',
        targetKind: 'experiment_template',
        targetId: item.id,
        sourcePath: item.source,
        code: 'pending_review',
        message: '实验模板尚未教师复核',
      });
    }
  }

  for (const decision of input.decisions) {
    const code = decision.status === 'stale' ? 'stale_decision' : 'pending_decision';
    pushIssue(issues, {
      severity: isRelease ? 'error' : 'warning',
      targetKind: 'content_decision',
      targetId: decision.id,
      sourcePath: decision.sourcePath,
      code,
      message:
        decision.status === 'stale'
          ? `审核决策已 stale：${decision.targetKind}/${decision.targetId}`
          : `存在尚未应用的审核决策：${decision.targetKind}/${decision.targetId}`,
    });
  }

  for (const manifest of input.manifests || []) {
    for (const manifestIssue of manifest.issues) {
      pushIssue(issues, {
        targetKind: 'openkb_manifest',
        targetId: manifest.path,
        sourcePath: manifest.path,
        code: manifestIssue.code,
        message: manifestIssue.message,
      });
    }
  }

  for (const coverage of input.foundationCoverage || []) {
    for (const coverageIssue of coverage.issues) {
      pushIssue(issues, {
        severity: isRelease ? 'error' : 'warning',
        targetKind: 'foundation_unit',
        targetId: coverage.unitId,
        sourcePath: coverage.sourcePath,
        code: coverageIssue.code,
        message: coverageIssue.message,
      });
    }
  }

  for (const topicPack of input.foundationTopicPacks || []) {
    for (const topicPackIssue of topicPack.issues) {
      pushIssue(issues, {
        severity: isRelease ? 'error' : 'warning',
        targetKind: 'foundation_topic_pack',
        targetId: topicPack.id,
        sourcePath: topicPack.sourcePath,
        code: topicPackIssue.code,
        message: topicPackIssue.message,
      });
    }
  }

  for (const qualityIssue of input.foundationQuestionQuality?.issues || []) {
    pushIssue(issues, {
      severity: isRelease ? 'error' : 'warning',
      targetKind: 'foundation_question_quality',
      targetId: qualityIssue.questionIds.join(','),
      sourcePath: input.foundationQuestionQuality?.sourcePath,
      code: qualityIssue.code,
      message: `${qualityIssue.message}：${qualityIssue.samples.join(' / ')}`,
    });
  }

  const errors = issues.filter((issue) => issue.severity === 'error');
  const warnings = issues.filter((issue) => issue.severity === 'warning');
  return {
    generatedAt: new Date().toISOString(),
    mode: input.mode,
    decision: errors.length === 0 ? 'pass' as const : 'fail' as const,
    summary: {
      knowledgeCards: input.knowledgeItems.length,
      experimentTemplates: input.experimentItems.length,
      decisions: input.decisions.length,
      manifests: input.manifests?.length || 0,
      foundationUnits: input.foundationCoverage?.length || 0,
      foundationUncoveredTags: (input.foundationCoverage || [])
        .reduce((count, coverage) => count + coverage.uncoveredTags.length, 0),
      foundationUndercoveredTags: (input.foundationCoverage || [])
        .reduce((count, coverage) => count + coverage.undercoveredTags.length, 0),
      foundationUncoveredRemediationTags: (input.foundationCoverage || [])
        .reduce((count, coverage) => count + coverage.uncoveredRemediationTags.length, 0),
      foundationTopicPacks: input.foundationTopicPacks?.length || 0,
      foundationTopicPackIssues: (input.foundationTopicPacks || [])
        .reduce((count, topicPack) => count + topicPack.issues.length, 0),
      foundationQualityEligibleQuestions: input.foundationQuestionQuality?.eligibleQuestions || 0,
      foundationDuplicatePromptGroups: input.foundationQuestionQuality?.duplicatePromptGroups || 0,
      foundationMalformedQuestions: input.foundationQuestionQuality?.malformedChoiceQuestions || 0,
      foundationShallowExplanations: input.foundationQuestionQuality?.shallowExplanationQuestions || 0,
      errors: errors.length,
      warnings: warnings.length,
      blockers: errors.length,
    },
    issues,
    details: {
      foundationCoverage: input.foundationCoverage || [],
      foundationTopicPacks: input.foundationTopicPacks || [],
      foundationQuestionQuality: input.foundationQuestionQuality || null,
    },
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
}

/** Validate the manifest contract without importing or writing any OpenKB pages. */
export function auditOpenKBManifest(
  manifest: unknown,
  opts: { path: string; sourceRegistry: Record<string, unknown> }
): OpenKBManifestAudit {
  const issues: OpenKBManifestAudit['issues'] = [];
  const root = asRecord(manifest);
  if (!root) return { path: opts.path, issues: [{ code: 'invalid_manifest', message: 'manifest 必须是 JSON 对象' }] };
  if (typeof root.courseVersion !== 'string' || !root.courseVersion.trim()) {
    issues.push({ code: 'missing_course_version', message: 'manifest 缺少 courseVersion' });
  }
  const sources = asRecord(root.sources);
  if (!sources || Object.keys(sources).length === 0) {
    issues.push({ code: 'missing_sources', message: 'manifest 没有登记 sources' });
  }
  const refs = [
    ...asStrings(root.defaultSourceRefs),
    ...Object.values(asRecord(root.sourceMap) || {}).flatMap(asStrings),
    ...Object.values(asRecord(root.overrides) || {}).flatMap((override) => asStrings(asRecord(override)?.sourceRefs)),
  ];
  for (const ref of [...new Set(refs)]) {
    if (!sources?.[ref]) {
      issues.push({ code: 'unknown_manifest_source', message: `manifest 引用了未登记 source：${ref}` });
    } else if (!opts.sourceRegistry[ref]) {
      issues.push({ code: 'source_not_in_registry', message: `manifest source 未进入课程 index.json：${ref}` });
    }
  }
  for (const path of Object.keys(asRecord(root.sourceMap) || {})) {
    const normalized = path.replace(/\\/g, '/');
    if (normalized.startsWith('../') || normalized.includes('/../')) {
      issues.push({ code: 'unsafe_source_map_path', message: `sourceMap 路径越界：${path}` });
    }
  }
  return { path: opts.path, issues };
}

async function listManifestAudits(sourceRegistry: Record<string, unknown>) {
  const dir = join(process.cwd(), 'data', 'knowledge');
  let files: string[] = [];
  try {
    files = (await readdir(dir)).filter((file) => file.startsWith('openkb-manifest') && file.endsWith('.json'));
  } catch {
    return [];
  }
  return Promise.all(files.map(async (file) => {
    const path = `data/knowledge/${file}`;
    try {
      return auditOpenKBManifest(JSON.parse(await readFile(join(dir, file), 'utf8')), { path, sourceRegistry });
    } catch (error) {
      return { path, issues: [{ code: 'invalid_manifest', message: `manifest 无法读取或解析：${error instanceof Error ? error.message : String(error)}` }] };
    }
  }));
}

type ReleaseCheckDb = Pick<PrismaClient, 'contentReviewDecision' | 'question'>;

export async function buildContentReleaseCheck(opts: {
  mode?: ContentReleaseMode;
  db?: ReleaseCheckDb;
} = {}) {
  const mode = opts.mode || 'development';
  const db = opts.db || prisma;
  const [knowledge, experiments, decisions, sourceRegistry, foundation, topicPackData, questions] = await Promise.all([
    buildKnowledgeReviewQueue(),
    buildExperimentReviewQueue(),
    db.contentReviewDecision.findMany({
      where: { status: { in: ['pending', 'stale'] } },
      orderBy: { createdAt: 'asc' },
      take: 500,
      select: { id: true, status: true, targetKind: true, targetId: true, sourcePath: true },
    }),
    getKnowledgeSourceRegistry(),
    loadFoundationContent(),
    loadFoundationTopicPacks(),
    db.question.findMany({
      select: {
        id: true,
        type: true,
        stage: true,
        knowledgePoints: true,
        content: true,
        options: true,
        answer: true,
        explanation: true,
        difficulty: true,
      },
    }),
  ]);
  const manifests = await listManifestAudits(sourceRegistry);
  const foundationCoverage = auditFoundationQuestionCoverage(
    foundation.units,
    questions,
    foundation.quizPolicy.alternateSetRequiredAfterFailure
      ? FOUNDATION_QUIZ_QUESTION_COUNT * 2
      : FOUNDATION_QUIZ_QUESTION_COUNT,
    foundation.quizPolicy.alternateSetRequiredAfterFailure ? 2 : 1,
    knowledge.items
  );
  const foundationQuestionQuality = auditFoundationQuestionQuality(
    questions,
    FOUNDATION_QUESTION_STAGES
  );
  const foundationTopicPacks = auditFoundationTopicPacks({
    content: foundation,
    topicPackVersion: topicPackData.version,
    packs: topicPackData.packs,
    cards: knowledge.items,
    questions,
    allowedStages: FOUNDATION_QUESTION_STAGES,
    requiredQuestionsPerTag: foundation.quizPolicy.alternateSetRequiredAfterFailure ? 2 : 1,
    requiredUnitIds: ['os-overview-interrupts', 'process-scheduling', 'memory-virtual-memory'],
  });
  return evaluateContentRelease({
    mode,
    knowledgeItems: knowledge.items,
    experimentItems: experiments.items,
    decisions,
    manifests,
    foundationCoverage,
    foundationTopicPacks,
    foundationQuestionQuality,
  });
}
