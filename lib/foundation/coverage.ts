import type { FoundationUnit } from './units';
import { FOUNDATION_QUESTION_STAGES } from './units';
import { parseJsonArray } from '@/lib/exam/grade';

export type FoundationQuestionCoverage = {
  unitId: string;
  title: string;
  sourcePath: string;
  requiredQuestions: number;
  requiredQuestionsPerTag: number;
  availableQuestions: number;
  tagCoverage: Array<{ tag: string; questions: number }>;
  uncoveredTags: string[];
  undercoveredTags: string[];
  remediationCoverage: Array<{ tag: string; cardIds: string[] }>;
  uncoveredRemediationTags: string[];
  difficulty: { min: number; max: number; average: number };
  issues: Array<{ code: string; message: string }>;
};

type QuestionCoverageInput = {
  stage: string;
  knowledgePoints: string | string[];
  difficulty: number;
};

type RemediationCardCoverageInput = {
  id: string;
  publicationStatus: string;
  tags: string[];
  questionTags: string[];
};

function questionTags(question: QuestionCoverageInput): string[] {
  return Array.isArray(question.knowledgePoints)
    ? question.knowledgePoints
    : parseJsonArray(question.knowledgePoints);
}

export function auditFoundationQuestionCoverage(
  units: FoundationUnit[],
  questions: QuestionCoverageInput[],
  requiredQuestions = 5,
  requiredQuestionsPerTag = 1,
  remediationCards?: RemediationCardCoverageInput[]
): FoundationQuestionCoverage[] {
  const allowedStages = new Set<string>(FOUNDATION_QUESTION_STAGES);
  const eligible = questions.filter((question) => allowedStages.has(question.stage));

  return units.map((unit) => {
    const tags = new Set(unit.quizTags.map((tag) => tag.toLowerCase()));
    const matched = eligible.filter((question) =>
      questionTags(question).some((tag) => tags.has(tag.toLowerCase()))
    );
    const availableQuestions = matched.length;
    const tagCoverage = unit.quizTags.map((tag) => ({
      tag,
      questions: eligible.filter((question) =>
        questionTags(question).some((candidate) => candidate.toLowerCase() === tag.toLowerCase())
      ).length,
    }));
    const uncoveredTags = tagCoverage.filter((item) => item.questions === 0).map((item) => item.tag);
    const undercoveredTags = tagCoverage
      .filter((item) => item.questions < requiredQuestionsPerTag)
      .map((item) => item.tag);
    const studentVisibleCards = (remediationCards || [])
      .filter((card) => card.publicationStatus === 'published');
    const remediationCoverage = remediationCards
      ? unit.quizTags.map((tag) => {
          const normalizedTag = tag.toLowerCase();
          return {
            tag,
            cardIds: studentVisibleCards
              .filter((card) => [...card.questionTags, ...card.tags]
                .some((candidate) => candidate.toLowerCase() === normalizedTag))
              .map((card) => card.id)
              .sort(),
          };
        })
      : [];
    const uncoveredRemediationTags = remediationCoverage
      .filter((item) => item.cardIds.length === 0)
      .map((item) => item.tag);
    const difficulties = matched.map((question) => question.difficulty);
    const issues: Array<{ code: string; message: string }> = [];
    if (availableQuestions < requiredQuestions) {
      issues.push({
          code: 'insufficient_question_coverage',
          message: `微单元需要至少 ${requiredQuestions} 道匹配题，当前只有 ${availableQuestions} 道`,
      });
    }
    if (undercoveredTags.length > 0) {
      issues.push({
        code: 'insufficient_tag_coverage',
        message: `每个目标标签需要至少 ${requiredQuestionsPerTag} 道题，当前不足：${undercoveredTags.join('、')}`,
      });
    }
    if (uncoveredRemediationTags.length > 0) {
      issues.push({
        code: 'missing_remediation_card',
        message: `答错后没有学生可见补弱知识卡：${uncoveredRemediationTags.join('、')}`,
      });
    }

    return {
      unitId: unit.id,
      title: unit.title,
      sourcePath: 'data/curriculum/2026-summer-os/foundation-units.json',
      requiredQuestions,
      requiredQuestionsPerTag,
      availableQuestions,
      tagCoverage,
      uncoveredTags,
      undercoveredTags,
      remediationCoverage,
      uncoveredRemediationTags,
      difficulty: {
        min: difficulties.length ? Math.min(...difficulties) : 0,
        max: difficulties.length ? Math.max(...difficulties) : 0,
        average: difficulties.length
          ? Math.round(difficulties.reduce((sum, value) => sum + value, 0) / difficulties.length)
          : 0,
      },
      issues,
    };
  });
}
