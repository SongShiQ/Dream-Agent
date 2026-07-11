import { createLLMProvider } from './providers';
import type { AgentLLMConfigs, LLMConfig } from './config';
import { DEFAULT_CONFIGS } from './config';

let configs: AgentLLMConfigs = { ...DEFAULT_CONFIGS };

export function updateLLMConfigs(newConfigs: Partial<AgentLLMConfigs>) {
  configs = { ...configs, ...newConfigs };
}

export function getLLMProvider(agentName: keyof AgentLLMConfigs) {
  const config = configs[agentName];
  if (!config.apiKey) {
    // 如果没有配置 API Key，尝试从环境变量获取
    const envKey = getEnvKeyForProvider(config.provider);
    if (envKey) {
      config.apiKey = envKey;
    } else {
      throw new Error(
        `API key not configured for agent: ${agentName}. ` +
        `Please set ${config.provider.toUpperCase()}_API_KEY in .env.local or call updateLLMConfigs().`
      );
    }
  }
  return createLLMProvider(config);
}

export function getLLMConfigs(): AgentLLMConfigs {
  return { ...configs };
}

function getEnvKeyForProvider(provider: string): string | undefined {
  switch (provider) {
    case 'openai':
      return process.env.OPENAI_API_KEY;
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY;
    default:
      return undefined;
  }
}
