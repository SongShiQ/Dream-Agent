// 聊天 API - 集成 Router + Judge + Agent

import { streamText } from 'ai';
import { routeUserMessage } from '@/lib/agents/router';
import { judgeAttempt } from '@/lib/judge/index';
import { getLLMProvider } from '@/lib/llm/factory';
import type { AgentName } from '@/lib/agents/types';
import { AGENT_SYSTEM_PROMPTS } from '@/lib/agents/config';

export async function POST(req: Request) {
  try {
    const { messages, studentId } = await req.json();
    const lastMessage = messages[messages.length - 1];

    // 1. 路由决策
    const decision = await routeUserMessage(lastMessage.content);
    let agentName: AgentName = decision.intent as AgentName;

    // 2. 如果是出题相关，检查 Judge
    if (agentName === 'examiner' && studentId) {
      const judgeResult = judgeAttempt({
        studentId,
        questionId: 'current', // 这里应该从上下文获取
        conversationHistory: messages.map((m: { content: string }) => m.content),
      });

      // 如果学员已尝试过，路由到 Tutor
      if (judgeResult.status === 'tried') {
        agentName = 'tutor';
      }
    }

    // 3. 获取 LLM
    let llm;
    try {
      llm = getLLMProvider(agentName);
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'LLM 配置错误，请检查 API Key 配置' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. 流式输出
    const result = await streamText({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: llm as any,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      system: AGENT_SYSTEM_PROMPTS[agentName],
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: '服务器错误' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
