/** 浏览器端读取设置中的 LLM 配置，随请求发给服务端 */

export type ClientLLMConfig = {
  provider?: string;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  feedbackMode?: string;
};

export function readClientLLMConfig(): ClientLLMConfig | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem('llm-config');
    if (!raw) return undefined;
    const c = JSON.parse(raw);
    if (!c.apiKey && !c.provider) return undefined;
    return {
      provider: c.provider,
      apiKey: c.apiKey || undefined,
      model: c.model,
      baseUrl: c.baseUrl,
      feedbackMode: c.feedbackMode,
    };
  } catch {
    return undefined;
  }
}
