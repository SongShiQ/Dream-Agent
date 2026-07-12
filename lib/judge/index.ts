// Judge 模块 - 判断学员是否已尝试过某道题

import type { JudgeResult } from '../agents/types';

interface JudgeContext {
  studentId: string;
  questionId: string;
  lastInteractionTime?: Date;
  hasSubmittedCode?: boolean;
  hasRunTests?: boolean;
  hasClickedAttempted?: boolean;
  conversationHistory?: string[];
}

// 规则引擎
const RULES = {
  // 层级 1：明确已尝试
  TRIED: [
    {
      id: 'R1',
      name: '代码已提交',
      check: (ctx: JudgeContext) => ctx.hasSubmittedCode === true,
      confidence: 1.0,
      evidence: '学员提交了代码',
    },
    {
      id: 'R2',
      name: '测试已运行',
      check: (ctx: JudgeContext) => ctx.hasRunTests === true,
      confidence: 1.0,
      evidence: '学员运行了测试',
    },
    {
      id: 'R3',
      name: '点击尝试按钮',
      check: (ctx: JudgeContext) => ctx.hasClickedAttempted === true,
      confidence: 1.0,
      evidence: '学员点击了"我尝试了"按钮',
    },
    {
      id: 'R4',
      name: '对话中明确表示',
      check: (ctx: JudgeContext) => {
        if (!ctx.conversationHistory) return false;
        const keywords = ['我试过了', '我做了', '我尝试了', '我写完了'];
        return ctx.conversationHistory.some(msg => 
          keywords.some(kw => msg.includes(kw))
        );
      },
      confidence: 0.95,
      evidence: '学员在对话中明确表示已尝试',
    },
  ],

  // 层级 2：明确未尝试
  NOT_TRIED: [
    {
      id: 'R5',
      name: '刚看到题目',
      check: (ctx: JudgeContext) => {
        if (!ctx.lastInteractionTime) return true;
        const timeDiff = Date.now() - ctx.lastInteractionTime.getTime();
        return timeDiff < 30 * 1000; // 30秒内
      },
      confidence: 0.95,
      evidence: '学员刚看到题目（< 30秒）',
    },
    {
      id: 'R6',
      name: '无交互记录',
      check: (ctx: JudgeContext) => {
        return !ctx.hasSubmittedCode && 
               !ctx.hasRunTests && 
               !ctx.hasClickedAttempted &&
               (!ctx.conversationHistory || ctx.conversationHistory.length === 0);
      },
      confidence: 0.9,
      evidence: '学员没有任何交互记录',
    },
  ],
};

// 判断主函数
export function judgeAttempt(context: JudgeContext): JudgeResult {
  // 检查层级 1：明确已尝试
  for (const rule of RULES.TRIED) {
    if (rule.check(context)) {
      return {
        status: 'tried',
        confidence: rule.confidence,
        evidence: `[${rule.id}] ${rule.evidence}`,
      };
    }
  }

  // 检查层级 2：明确未尝试
  for (const rule of RULES.NOT_TRIED) {
    if (rule.check(context)) {
      return {
        status: 'not_tried',
        confidence: rule.confidence,
        evidence: `[${rule.id}] ${rule.evidence}`,
      };
    }
  }

  // 层级 3：模糊情况，需要 LLM 判断
  return {
    status: 'uncertain',
    needsLLM: true,
  };
}

// LLM 判断提示词
export const JUDGE_LLM_PROMPT = `你是一个判断学员是否尝试过某道题的专家。

根据以下信息判断学员是否已经尝试过这道题：
1. 学员的对话历史
2. 学员的行为记录

请返回 JSON 格式：
{
  "tried": true/false,
  "confidence": 0-1,
  "reasoning": "判断理由"
}

注意：
- 如果学员说"我试了一下但不知道对不对"，应该判断为已尝试
- 如果学员问了相关问题但没有明确说尝试过，应该判断为未尝试
- 如果学员在题目上花了很长时间但没有提交，应该判断为已尝试`;
