import { streamText } from 'ai';
import { routeUserMessage } from '@/lib/agents/router';
import { getLLMProvider } from '@/lib/llm/factory';
import type { AgentName } from '@/lib/agents/types';
import { AGENT_SYSTEM_PROMPTS } from '@/lib/agents/config';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1];

    // 路由决策
    const decision = await routeUserMessage(lastMessage.content);

    // 根据意图选择 Agent
    const agentName: AgentName = decision.intent as AgentName;
    
    let llm;
    try {
      llm = getLLMProvider(agentName);
    } catch (error) {
      // 如果 LLM 配置失败，返回错误提示
      return new Response(
        JSON.stringify({ error: 'LLM 配置错误，请检查 API Key 配置' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 流式输出
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
