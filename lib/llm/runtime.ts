/**
 * 运行时 LLM 配置：请求体覆盖 > 进程内 updateLLMConfigs > 环境变量
 */

import type { AgentLLMConfigs, LLMConfig, LLMProvider } from './config';
import { DEFAULT_CONFIGS } from './config';
import { createLLMProvider } from './providers';

export type ClientLLMOverride = {
  provider?: string;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  temperature?: number;
};

let processConfigs: AgentLLMConfigs = { ...DEFAULT_CONFIGS };

export function updateLLMConfigs(newConfigs: Partial<AgentLLMConfigs>) {
  processConfigs = { ...processConfigs, ...newConfigs };
}

export function getLLMConfigs(): AgentLLMConfigs {
  return { ...processConfigs };
}

function envKey(provider: string): string | undefined {
  switch (provider) {
    case 'openai':
      return process.env.OPENAI_API_KEY;
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY;
    case 'deepseek':
      return process.env.DEEPSEEK_API_KEY;
    default:
      return undefined;
  }
}

function resolveProvider(p?: string): LLMProvider {
  if (p === 'openai' || p === 'anthropic' || p === 'deepseek' || p === 'local' || p === 'custom') {
    return p;
  }
  return 'deepseek';
}

/** 合并 agent 默认 + 客户端覆盖 + 环境变量 */
export function resolveLLMConfig(
  agentName: keyof AgentLLMConfigs,
  override?: ClientLLMOverride | null
): LLMConfig {
  const base = { ...processConfigs[agentName] };
  if (override?.provider) base.provider = resolveProvider(override.provider);
  if (override?.model) base.model = override.model;
  if (override?.baseUrl) base.baseUrl = override.baseUrl;
  if (typeof override?.temperature === 'number') base.temperature = override.temperature;

  // API Key：客户端 > 已有 > 环境
  if (override?.apiKey?.trim()) {
    base.apiKey = override.apiKey.trim();
  } else if (!base.apiKey) {
    base.apiKey = envKey(base.provider) || '';
  }

  // DeepSeek 默认 baseUrl
  if (base.provider === 'deepseek' && !base.baseUrl) {
    base.baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
  }

  if (!base.apiKey) {
    throw new Error(
      `API key not configured for agent: ${agentName}. ` +
        `请在设置中填写 Key，或在 .env.local 配置 ${base.provider.toUpperCase()}_API_KEY。`
    );
  }
  return base;
}

export function getLLMProvider(
  agentName: keyof AgentLLMConfigs,
  override?: ClientLLMOverride | null
) {
  const config = resolveLLMConfig(agentName, override);
  return createLLMProvider(config);
}
