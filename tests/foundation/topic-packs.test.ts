import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { listKnowledgeCards } from '@/lib/knowledge/cards';
import {
  FOUNDATION_QUESTION_STAGES,
  computeFoundationProgress,
  loadFoundationContent,
} from '@/lib/foundation/units';
import {
  auditFoundationTopicPacks,
  loadFoundationTopicPacks,
  toStudentFoundationTopicPacks,
} from '@/lib/foundation/topic-packs';

type Question = { knowledgePoints?: string[]; stage?: string };

async function loadQuestions(): Promise<Question[]> {
  const root = process.cwd();
  const files = await readdir(join(root, 'data', 'questions'));
  const questions: Question[] = [];
  for (const file of files.filter((name) => name.endsWith('.json') && !name.startsWith('_'))) {
    questions.push(...JSON.parse(
      await readFile(join(root, 'data', 'questions', file), 'utf8')
    ) as Question[]);
  }
  return questions;
}

describe('foundation topic packs', () => {
  it('keeps the required learning maps fully connected to questions, remediation, and the next unit', async () => {
    const [content, topicPackData, cards, questions] = await Promise.all([
      loadFoundationContent(),
      loadFoundationTopicPacks(),
      listKnowledgeCards(),
      loadQuestions(),
    ]);
    const audits = auditFoundationTopicPacks({
      content,
      topicPackVersion: topicPackData.version,
      packs: topicPackData.packs,
      cards,
      questions: questions.map((question) => ({
        stage: question.stage || '',
        knowledgePoints: question.knowledgePoints || [],
      })),
      allowedStages: FOUNDATION_QUESTION_STAGES,
      requiredQuestionsPerTag: 2,
      requiredUnitIds: ['os-overview-interrupts', 'process-scheduling', 'memory-virtual-memory'],
    });

    expect(audits).toHaveLength(3);
    const overview = audits.find((audit) => audit.unitId === 'os-overview-interrupts');
    const process = audits.find((audit) => audit.unitId === 'process-scheduling');
    const memory = audits.find((audit) => audit.unitId === 'memory-virtual-memory');
    expect(overview).toBeDefined();
    expect(process).toBeDefined();
    expect(memory).toBeDefined();
    expect(overview).toMatchObject({
      unitId: 'os-overview-interrupts',
      ready: true,
      checks: {
        learningObjectives: true,
        misconceptions: true,
        questionCoverage: true,
        remediationCards: true,
        nextTask: true,
      },
      nextTask: { unitId: 'process-scheduling', valid: true },
    });
    expect(overview?.issues).toEqual([]);
    expect(overview?.questionCoverage.every((item) => item.questions >= 2)).toBe(true);
    expect(overview?.remediationCards.map((card) => card.id)).toEqual([
      'os-theory-01-overview',
      'trap-syscall',
    ]);
    expect(process).toMatchObject({
      unitId: 'process-scheduling',
      ready: true,
      checks: {
        learningObjectives: true,
        misconceptions: true,
        questionCoverage: true,
        remediationCards: true,
        nextTask: true,
      },
      nextTask: { unitId: 'memory-virtual-memory', valid: true },
      remediationCards: [
        { id: 'os-theory-02-process-thread', title: '进程与线程管理' },
        { id: 'scheduling', title: '进程调度基础' },
      ],
    });
    expect(process?.issues).toEqual([]);
    expect(process?.questionCoverage.every((item) => item.questions >= 2)).toBe(true);
    expect(memory).toMatchObject({
      unitId: 'memory-virtual-memory',
      ready: true,
      checks: {
        learningObjectives: true,
        misconceptions: true,
        questionCoverage: true,
        remediationCards: true,
        nextTask: true,
      },
      nextTask: {
        unitId: 'rust-basics',
        relation: 'recommended',
        valid: true,
      },
      remediationCards: [
        { id: 'os-theory-03-memory', title: '内存管理' },
        { id: 'virtual-memory', title: '虚拟内存与缺页' },
      ],
    });
    expect(memory?.issues).toEqual([]);
    expect(memory?.questionCoverage.every((item) => item.questions >= 2)).toBe(true);

    const progress = computeFoundationProgress(content.units, []);
    const studentPacks = toStudentFoundationTopicPacks(audits, progress);
    expect(studentPacks.find((pack) => pack.unitId === 'os-overview-interrupts')).toMatchObject({
      ready: true,
      completedChecks: 5,
      totalChecks: 5,
      remediationCards: [
        { id: 'os-theory-01-overview', title: '操作系统概述' },
        { id: 'trap-syscall', title: '陷入与系统调用' },
      ],
      nextTask: { status: 'locked' },
    });
    expect(studentPacks.find((pack) => pack.unitId === 'process-scheduling')).toMatchObject({
      ready: true,
      completedChecks: 5,
      totalChecks: 5,
      nextTask: { unitId: 'memory-virtual-memory', status: 'locked' },
    });
    expect(studentPacks.find((pack) => pack.unitId === 'memory-virtual-memory')).toMatchObject({
      ready: true,
      completedChecks: 5,
      totalChecks: 5,
      nextTask: { unitId: 'rust-basics', relation: 'recommended', status: 'missing' },
    });
  });

  it('reports missing required packs and broken card or next-task links', async () => {
    const [content, topicPackData, cards, questions] = await Promise.all([
      loadFoundationContent(),
      loadFoundationTopicPacks(),
      listKnowledgeCards(),
      loadQuestions(),
    ]);
    const brokenPack = structuredClone(topicPackData.packs[0]);
    brokenPack.misconceptions[0].remediationCardIds = ['missing-card'];
    brokenPack.nextTask.unitId = 'missing-unit';
    brokenPack.questionTags.push(structuredClone(brokenPack.questionTags[0]));
    const broken = auditFoundationTopicPacks({
      content,
      topicPackVersion: topicPackData.version,
      packs: [brokenPack],
      cards,
      questions: questions.map((question) => ({
        stage: question.stage || '',
        knowledgePoints: question.knowledgePoints || [],
      })),
      allowedStages: FOUNDATION_QUESTION_STAGES,
      requiredUnitIds: ['os-overview-interrupts'],
    });

    expect(broken[0].ready).toBe(false);
    expect(broken[0].issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      'topic_remediation_card_unavailable',
      'misconception_remediation_mismatch',
      'invalid_topic_next_task',
      'duplicate_topic_question_tag',
    ]));

    const missing = auditFoundationTopicPacks({
      content,
      topicPackVersion: topicPackData.version,
      packs: [],
      cards,
      questions: [],
      allowedStages: FOUNDATION_QUESTION_STAGES,
      requiredUnitIds: ['os-overview-interrupts', 'process-scheduling', 'memory-virtual-memory'],
    });
    expect(missing).toHaveLength(3);
    expect(missing[0].issues).toEqual([
      { code: 'missing_required_topic_pack', message: '缺少必需主题包：os-overview-interrupts' },
    ]);
    expect(missing[1].issues).toEqual([
      { code: 'missing_required_topic_pack', message: '缺少必需主题包：process-scheduling' },
    ]);
    expect(missing[2].issues).toEqual([
      { code: 'missing_required_topic_pack', message: '缺少必需主题包：memory-virtual-memory' },
    ]);
  });
});
