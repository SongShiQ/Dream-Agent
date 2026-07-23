import { parseJsonArray } from '@/lib/exam/grade';

export const FOUNDATION_QUESTION_MIN_EXPLANATION_LENGTH = 8;

export type FoundationQuestionQualityInput = {
  id?: string;
  type: string;
  stage: string;
  knowledgePoints: string | string[];
  content: string;
  options: string | string[];
  answer: string;
  explanation: string;
  difficulty: number;
};

export type FoundationQuestionQualityIssue = {
  code: 'duplicate_question_prompt' | 'malformed_choice_question' | 'shallow_question_explanation';
  questionIds: string[];
  message: string;
  samples: string[];
};

export type FoundationQuestionQualityAudit = {
  sourcePath: string;
  eligibleQuestions: number;
  uniquePrompts: number;
  duplicatePromptGroups: number;
  malformedChoiceQuestions: number;
  shallowExplanationQuestions: number;
  minimumExplanationLength: number;
  issues: FoundationQuestionQualityIssue[];
};

function asStringArray(value: string | string[]): string[] {
  return Array.isArray(value) ? value : parseJsonArray(value);
}

export function normalizeQuestionPrompt(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s，。！？、；：,.!?;:（）()【】\[\]“”"'`]+/g, '');
}

function stableQuestionId(question: FoundationQuestionQualityInput, index: number): string {
  return question.id || `${question.stage || 'unknown'}:${index + 1}`;
}

export function auditFoundationQuestionQuality(
  questions: FoundationQuestionQualityInput[],
  allowedStages: readonly string[],
  minimumExplanationLength = FOUNDATION_QUESTION_MIN_EXPLANATION_LENGTH
): FoundationQuestionQualityAudit {
  const allowed = new Set(allowedStages);
  const eligible = questions.filter((question) => allowed.has(question.stage));
  const promptGroups = new Map<string, Array<{ id: string; content: string }>>();
  const malformed: Array<{ id: string; content: string }> = [];
  const shallow: Array<{ id: string; content: string; length: number }> = [];

  eligible.forEach((question, index) => {
    const id = stableQuestionId(question, index);
    const normalizedPrompt = normalizeQuestionPrompt(question.content || '');
    if (normalizedPrompt) {
      const group = promptGroups.get(normalizedPrompt) || [];
      group.push({ id, content: question.content });
      promptGroups.set(normalizedPrompt, group);
    }

    if (question.type === 'choice') {
      const options = asStringArray(question.options || []);
      const optionKeys = options.map(normalizeQuestionPrompt);
      const optionLetters = options.map((option) => option.trim().charAt(0).toUpperCase());
      const answerLetter = String(question.answer || '').trim().charAt(0).toUpperCase();
      const choiceValid =
        options.length >= 2 &&
        optionKeys.every(Boolean) &&
        new Set(optionKeys).size === options.length &&
        /^[A-D]$/.test(answerLetter) &&
        optionLetters.includes(answerLetter);
      if (!choiceValid) malformed.push({ id, content: question.content });
    }

    const explanationLength = String(question.explanation || '').trim().length;
    if (explanationLength < minimumExplanationLength) {
      shallow.push({ id, content: question.content, length: explanationLength });
    }
  });

  const duplicateGroups = [...promptGroups.values()].filter((group) => group.length > 1);
  const issues: FoundationQuestionQualityIssue[] = [];
  for (const group of duplicateGroups) {
    issues.push({
      code: 'duplicate_question_prompt',
      questionIds: group.map((item) => item.id),
      message: `存在 ${group.length} 道规范化后题干相同的 Foundation 题目`,
      samples: group.map((item) => item.content),
    });
  }
  for (const item of malformed) {
    issues.push({
      code: 'malformed_choice_question',
      questionIds: [item.id],
      message: '选择题选项、选项字母或答案结构无效',
      samples: [item.content],
    });
  }
  for (const item of shallow) {
    issues.push({
      code: 'shallow_question_explanation',
      questionIds: [item.id],
      message: `题目解析少于 ${minimumExplanationLength} 个字符（当前 ${item.length}）`,
      samples: [item.content],
    });
  }

  return {
    sourcePath: 'data/questions/*.json',
    eligibleQuestions: eligible.length,
    uniquePrompts: promptGroups.size,
    duplicatePromptGroups: duplicateGroups.length,
    malformedChoiceQuestions: malformed.length,
    shallowExplanationQuestions: shallow.length,
    minimumExplanationLength,
    issues,
  };
}
