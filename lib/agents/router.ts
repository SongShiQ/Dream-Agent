import { generateText } from 'ai';
import { getLLMProvider } from '../llm/factory';
import type { AgentName, RouterDecision } from './types';

const ROUTER_PROMPT = `你是一个意图识别专家。根据用户消息，判断应该调用哪个专业 Agent。

可用的 Agent：
- assessor: 评估学员水平，触发词包括"评估"、"我的水平"、"测试一下"、"诊断"
- tutor: 理论答疑，触发词包括"什么是"、"解释"、"为什么"、"怎么理解"、"原理"
- examiner: 出题练习，触发词包括"出题"、"练习"、"测试"、"做题"、"题目"
- planner: 学习规划，触发词包括"计划"、"怎么学"、"下一步"、"进度"、"安排"

请返回 JSON 格式：
{
  "intent": "agent名称",
  "confidence": 0-1的置信度,
  "reasoning": "判断理由"
}

注意：
1. 只返回 JSON，不要有其他内容
2. intent 必须是上述 agent 名称之一
3. confidence 是 0-1 之间的数字`;

export async function routeUserMessage(message: string): Promise<RouterDecision> {
  try {
    const llm = getLLMProvider('router');
    
    const result = await generateText({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: llm as any,
      prompt: `${ROUTER_PROMPT}\n\n用户消息: ${message}`,
      temperature: 0.3,
      maxTokens: 256,
    });

    // 尝试解析 JSON
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const decision = JSON.parse(jsonMatch[0]) as RouterDecision;
      
      // 验证 intent 是否有效
      const validIntents: AgentName[] = ['assessor', 'tutor', 'examiner', 'planner'];
      if (validIntents.includes(decision.intent as AgentName)) {
        return decision;
      }
    }
    
    // 如果解析失败，使用关键词匹配作为后备
    return fallbackRouting(message);
  } catch (error) {
    console.error('Router error:', error);
    return fallbackRouting(message);
  }
}

function fallbackRouting(message: string): RouterDecision {
  const lowerMessage = message.toLowerCase();
  
  // 关键词匹配
  const keywords: Record<AgentName, string[]> = {
    assessor: ['评估', '水平', '测试', '诊断', '评估一下'],
    tutor: ['什么是', '解释', '为什么', '怎么', '原理', '如何', '是什么'],
    examiner: ['出题', '练习', '做题', '题目', '考试'],
    planner: ['计划', '怎么学', '下一步', '进度', '安排', '规划'],
  };

  for (const [agent, words] of Object.entries(keywords)) {
    if (words.some(word => lowerMessage.includes(word))) {
      return {
        intent: agent as AgentName,
        confidence: 0.6,
        reasoning: `关键词匹配: ${words.filter(w => lowerMessage.includes(w)).join(', ')}`,
      };
    }
  }

  // 默认路由到 tutor
  return {
    intent: 'tutor',
    confidence: 0.4,
    reasoning: '无法识别意图，默认路由到答疑 Agent',
  };
}
