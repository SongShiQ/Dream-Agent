import { describe, expect, it } from 'vitest';
import { auditFoundationQuestionQuality, normalizeQuestionPrompt } from '@/lib/foundation/question-quality';

describe('foundation question quality', () => {
  it('normalizes prompts and reports duplicate, malformed, and shallow questions', () => {
    expect(normalizeQuestionPrompt('页表：如何工作？')).toBe('页表如何工作');

    const audit = auditFoundationQuestionQuality([
      {
        id: 'q-1',
        type: 'choice',
        stage: 'basic',
        knowledgePoints: ['virtual_memory'],
        content: '页表：如何工作？',
        options: ['A. 完成地址翻译', 'B. 保存文件'],
        answer: 'A',
        explanation: '页表把虚拟页映射到物理页框。',
        difficulty: 45,
      },
      {
        id: 'q-2',
        type: 'choice',
        stage: 'basic',
        knowledgePoints: ['virtual_memory'],
        content: '页表 如何工作',
        options: ['A. 相同选项', 'A. 相同选项'],
        answer: 'E',
        explanation: '太短',
        difficulty: 45,
      },
      {
        id: 'q-3',
        type: 'choice',
        stage: 'professional',
        knowledgePoints: ['virtual_memory'],
        content: '不应进入 Foundation 审计的题目',
        options: ['A. 正确', 'B. 错误'],
        answer: 'A',
        explanation: '这道题不属于当前基础阶段。',
        difficulty: 50,
      },
    ], ['basic']);

    expect(audit.eligibleQuestions).toBe(2);
    expect(audit.uniquePrompts).toBe(1);
    expect(audit.duplicatePromptGroups).toBe(1);
    expect(audit.malformedChoiceQuestions).toBe(1);
    expect(audit.shallowExplanationQuestions).toBe(1);
    expect(audit.issues.map((issue) => issue.code)).toEqual([
      'duplicate_question_prompt',
      'malformed_choice_question',
      'shallow_question_explanation',
    ]);
  });

  it('accepts valid choices and explanations without producing issues', () => {
    const audit = auditFoundationQuestionQuality([
      {
        id: 'q-valid',
        type: 'choice',
        stage: 'pre_study_theory',
        knowledgePoints: ['os_overview'],
        content: '操作系统的核心职责是什么？',
        options: ['A. 管理资源', 'B. 只负责显示页面', 'C. 只保存文本'],
        answer: 'A',
        explanation: '操作系统负责管理硬件资源并向程序提供受控抽象。',
        difficulty: 30,
      },
    ], ['pre_study_theory']);

    expect(audit.issues).toEqual([]);
    expect(audit.malformedChoiceQuestions).toBe(0);
    expect(audit.shallowExplanationQuestions).toBe(0);
  });
});
