import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { parseJsonArray } from '@/lib/exam/grade';
import type { FoundationContent, FoundationUnitProgress } from '@/lib/foundation/units';

const questionTagSchema = z.object({
  tag: z.string().trim().min(1),
  label: z.string().trim().min(1),
});

const misconceptionSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  questionTags: z.array(z.string().trim().min(1)).min(1),
  remediationCardIds: z.array(z.string().trim().min(1)).min(1),
});

const topicPackSchema = z.object({
  id: z.string().trim().min(1),
  unitId: z.string().trim().min(1),
  title: z.string().trim().min(1),
  learningObjectives: z.array(z.string().trim().min(1)).min(1),
  questionTags: z.array(questionTagSchema).min(1),
  misconceptions: z.array(misconceptionSchema).min(1),
  nextTask: z.object({
    unitId: z.string().trim().min(1),
    relation: z.enum(['prerequisite', 'recommended']).default('prerequisite'),
    label: z.string().trim().min(1),
  }),
});

const topicPackFileSchema = z.object({
  version: z.string().trim().min(1),
  packs: z.array(topicPackSchema),
});

export type FoundationTopicPack = z.infer<typeof topicPackSchema>;

export type FoundationTopicPackCard = {
  id: string;
  title: string;
  publicationStatus: string;
  tags: string[];
  questionTags: string[];
};

export type FoundationTopicPackQuestion = {
  stage: string;
  knowledgePoints: string | string[];
};

export type FoundationTopicPackAudit = {
  id: string;
  unitId: string;
  title: string;
  sourcePath: string;
  learningObjectives: string[];
  misconceptions: FoundationTopicPack['misconceptions'];
  questionCoverage: Array<{ tag: string; label: string; questions: number }>;
  remediationCards: Array<{ id: string; title: string; available: boolean }>;
  nextTask: {
    unitId: string;
    title: string;
    label: string;
    relation: 'prerequisite' | 'recommended';
    valid: boolean;
  };
  checks: {
    learningObjectives: boolean;
    misconceptions: boolean;
    questionCoverage: boolean;
    remediationCards: boolean;
    nextTask: boolean;
  };
  ready: boolean;
  issues: Array<{ code: string; message: string }>;
};

export type StudentFoundationTopicPack = Omit<
  FoundationTopicPackAudit,
  'sourcePath' | 'issues' | 'remediationCards' | 'nextTask'
> & {
  remediationCards: Array<{ id: string; title: string }>;
  nextTask: FoundationTopicPackAudit['nextTask'] & {
    status: FoundationUnitProgress['status'] | 'missing';
  };
  completedChecks: number;
  totalChecks: number;
};

const TOPIC_PACK_SOURCE = 'data/curriculum/2026-summer-os/foundation-topic-packs.json';
const TOPIC_PACK_FILE = path.join(process.cwd(), ...TOPIC_PACK_SOURCE.split('/'));
let cachedTopicPacks: { version: string; packs: FoundationTopicPack[] } | null = null;

export async function loadFoundationTopicPacks() {
  if (cachedTopicPacks) return cachedTopicPacks;
  const raw = await readFile(TOPIC_PACK_FILE, 'utf8');
  cachedTopicPacks = topicPackFileSchema.parse(JSON.parse(raw));
  return cachedTopicPacks;
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.toLowerCase()))];
}

function questionTags(question: FoundationTopicPackQuestion): string[] {
  return unique(
    Array.isArray(question.knowledgePoints)
      ? question.knowledgePoints
      : parseJsonArray(question.knowledgePoints)
  );
}

function cardCoversTag(card: FoundationTopicPackCard, tag: string): boolean {
  const normalized = tag.toLowerCase();
  return [...card.questionTags, ...card.tags]
    .some((candidate) => candidate.toLowerCase() === normalized);
}

export function auditFoundationTopicPacks(input: {
  content: FoundationContent;
  topicPackVersion?: string;
  packs: FoundationTopicPack[];
  cards: FoundationTopicPackCard[];
  questions: FoundationTopicPackQuestion[];
  allowedStages: readonly string[];
  requiredQuestionsPerTag?: number;
  requiredUnitIds?: string[];
}): FoundationTopicPackAudit[] {
  const requiredQuestionsPerTag = input.requiredQuestionsPerTag ?? 2;
  const unitById = new Map(input.content.units.map((unit) => [unit.id, unit]));
  const cardById = new Map(input.cards.map((card) => [card.id, card]));
  const allowedStages = new Set(input.allowedStages);
  const eligibleQuestions = input.questions.filter((question) => allowedStages.has(question.stage));
  const packCounts = new Map<string, number>();
  const packIdCounts = new Map<string, number>();
  for (const pack of input.packs) {
    packCounts.set(pack.unitId, (packCounts.get(pack.unitId) || 0) + 1);
    packIdCounts.set(pack.id, (packIdCounts.get(pack.id) || 0) + 1);
  }

  const audits: FoundationTopicPackAudit[] = input.packs.map((pack) => {
    const issues: FoundationTopicPackAudit['issues'] = [];
    const unit = unitById.get(pack.unitId);
    const targetTags = pack.questionTags.map((item) => item.tag.toLowerCase());
    const targetTagSet = new Set(targetTags);
    const unitTagSet = new Set((unit?.quizTags || []).map((tag) => tag.toLowerCase()));
    const misconceptionIds = pack.misconceptions.map((item) => item.id);
    const misconceptionTagSet = new Set(
      pack.misconceptions.flatMap((item) => item.questionTags.map((tag) => tag.toLowerCase()))
    );

    if (!unit) {
      issues.push({ code: 'unknown_topic_pack_unit', message: `主题包指向不存在的微单元：${pack.unitId}` });
    }
    if (input.topicPackVersion && input.topicPackVersion !== input.content.version) {
      issues.push({
        code: 'topic_pack_version_mismatch',
        message: `主题包版本 ${input.topicPackVersion} 与 Foundation 版本 ${input.content.version} 不一致`,
      });
    }
    if ((packCounts.get(pack.unitId) || 0) > 1) {
      issues.push({ code: 'duplicate_topic_pack_unit', message: `微单元存在重复主题包：${pack.unitId}` });
    }
    if ((packIdCounts.get(pack.id) || 0) > 1) {
      issues.push({ code: 'duplicate_topic_pack_id', message: `主题包稳定 ID 重复：${pack.id}` });
    }
    if (new Set(targetTags).size !== targetTags.length) {
      issues.push({ code: 'duplicate_topic_question_tag', message: '主题包中的题目标签重复' });
    }
    if (new Set(misconceptionIds).size !== misconceptionIds.length) {
      issues.push({ code: 'duplicate_misconception_id', message: '主题包中的典型误区 ID 重复' });
    }

    const missingUnitTags = [...unitTagSet].filter((tag) => !targetTagSet.has(tag));
    const extraTopicTags = [...targetTagSet].filter((tag) => !unitTagSet.has(tag));
    if (missingUnitTags.length > 0 || extraTopicTags.length > 0) {
      issues.push({
        code: 'topic_question_tags_mismatch',
        message: `主题包与微单元 quizTags 不一致；缺少 ${missingUnitTags.join('、') || '无'}，多出 ${extraTopicTags.join('、') || '无'}`,
      });
    }
    const tagsWithoutMisconception = targetTags.filter((tag) => !misconceptionTagSet.has(tag));
    if (tagsWithoutMisconception.length > 0) {
      issues.push({
        code: 'topic_tag_without_misconception',
        message: `题目标签没有对应典型误区：${tagsWithoutMisconception.join('、')}`,
      });
    }

    for (const misconception of pack.misconceptions) {
      const unknownTags = misconception.questionTags
        .map((tag) => tag.toLowerCase())
        .filter((tag) => !targetTagSet.has(tag));
      if (unknownTags.length > 0) {
        issues.push({
          code: 'misconception_unknown_question_tag',
          message: `误区 ${misconception.id} 引用了主题包外标签：${unknownTags.join('、')}`,
        });
      }
    }

    const questionCoverage = pack.questionTags.map(({ tag, label }) => ({
      tag,
      label,
      questions: eligibleQuestions.filter((question) => questionTags(question).includes(tag.toLowerCase())).length,
    }));
    const undercoveredTags = questionCoverage
      .filter((item) => item.questions < requiredQuestionsPerTag)
      .map((item) => item.tag);
    if (undercoveredTags.length > 0) {
      issues.push({
        code: 'topic_tag_question_undercoverage',
        message: `主题包标签至少需要 ${requiredQuestionsPerTag} 道题：${undercoveredTags.join('、')}`,
      });
    }

    const expectedCardIds = [...new Set(pack.misconceptions.flatMap((item) => item.remediationCardIds))];
    const remediationCards = expectedCardIds.map((id) => {
      const card = cardById.get(id);
      return { id, title: card?.title || id, available: card?.publicationStatus === 'published' };
    });
    const unavailableCards = remediationCards.filter((card) => !card.available).map((card) => card.id);
    if (unavailableCards.length > 0) {
      issues.push({
        code: 'topic_remediation_card_unavailable',
        message: `主题包补弱卡不存在或对学生不可见：${unavailableCards.join('、')}`,
      });
    }
    for (const misconception of pack.misconceptions) {
      const cards = misconception.remediationCardIds
        .map((id) => cardById.get(id))
        .filter((card): card is FoundationTopicPackCard => Boolean(card && card.publicationStatus === 'published'));
      const uncoveredTags = misconception.questionTags.filter(
        (tag) => !cards.some((card) => cardCoversTag(card, tag))
      );
      if (uncoveredTags.length > 0) {
        issues.push({
          code: 'misconception_remediation_mismatch',
          message: `误区 ${misconception.id} 的补弱卡未覆盖标签：${uncoveredTags.join('、')}`,
        });
      }
    }

    const nextUnit = unitById.get(pack.nextTask.unitId);
    const nextTaskValid = Boolean(
      unit &&
      nextUnit &&
      nextUnit.id !== unit.id &&
      (pack.nextTask.relation === 'recommended' || nextUnit.unlockAfter.includes(unit.id))
    );
    if (!nextTaskValid) {
      issues.push({
        code: 'invalid_topic_next_task',
        message: pack.nextTask.relation === 'recommended'
          ? `推荐任务 ${pack.nextTask.unitId} 不存在，或与当前单元相同`
          : `下一任务 ${pack.nextTask.unitId} 不存在，或未把 ${pack.unitId} 声明为前置单元`,
      });
    }

    const checks = {
      learningObjectives: pack.learningObjectives.length > 0,
      misconceptions:
        pack.misconceptions.length > 0 &&
        !issues.some((item) => [
          'duplicate_misconception_id',
          'topic_tag_without_misconception',
          'misconception_unknown_question_tag',
        ].includes(item.code)),
      questionCoverage:
        questionCoverage.length > 0 &&
        !issues.some((item) => [
          'duplicate_topic_question_tag',
          'topic_question_tags_mismatch',
          'topic_tag_question_undercoverage',
        ].includes(item.code)),
      remediationCards:
        remediationCards.length > 0 &&
        !issues.some((item) => ['topic_remediation_card_unavailable', 'misconception_remediation_mismatch'].includes(item.code)),
      nextTask: nextTaskValid,
    };

    return {
      id: pack.id,
      unitId: pack.unitId,
      title: pack.title,
      sourcePath: TOPIC_PACK_SOURCE,
      learningObjectives: pack.learningObjectives,
      misconceptions: pack.misconceptions,
      questionCoverage,
      remediationCards,
      nextTask: {
        unitId: pack.nextTask.unitId,
        title: nextUnit?.title || pack.nextTask.unitId,
        label: pack.nextTask.label,
        relation: pack.nextTask.relation,
        valid: nextTaskValid,
      },
      checks,
      ready: issues.length === 0 && Object.values(checks).every(Boolean),
      issues,
    };
  });

  for (const unitId of input.requiredUnitIds || []) {
    if (audits.some((audit) => audit.unitId === unitId)) continue;
    const unit = unitById.get(unitId);
    audits.push({
      id: `missing-${unitId}`,
      unitId,
      title: unit ? `${unit.title}学习地图` : unitId,
      sourcePath: TOPIC_PACK_SOURCE,
      learningObjectives: [],
      misconceptions: [],
      questionCoverage: [],
      remediationCards: [],
      nextTask: {
        unitId: '',
        title: '',
        label: '',
        relation: 'prerequisite',
        valid: false,
      },
      checks: {
        learningObjectives: false,
        misconceptions: false,
        questionCoverage: false,
        remediationCards: false,
        nextTask: false,
      },
      ready: false,
      issues: [{ code: 'missing_required_topic_pack', message: `缺少必需主题包：${unitId}` }],
    });
  }
  return audits;
}

export function toStudentFoundationTopicPacks(
  audits: FoundationTopicPackAudit[],
  progress: FoundationUnitProgress[]
): StudentFoundationTopicPack[] {
  const statusByUnit = new Map(progress.map((item) => [item.unit.id, item.status]));
  return audits.map((audit) => ({
    id: audit.id,
    unitId: audit.unitId,
    title: audit.title,
    learningObjectives: audit.learningObjectives,
    misconceptions: audit.misconceptions,
    questionCoverage: audit.questionCoverage,
    remediationCards: audit.remediationCards
      .filter((card) => card.available)
      .map(({ id, title }) => ({ id, title })),
    nextTask: {
      ...audit.nextTask,
      status: statusByUnit.get(audit.nextTask.unitId) || 'missing',
    },
    checks: audit.checks,
    ready: audit.ready,
    completedChecks: Object.values(audit.checks).filter(Boolean).length,
    totalChecks: Object.keys(audit.checks).length,
  }));
}
