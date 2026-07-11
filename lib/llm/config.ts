export type LLMProvider = 'openai' | 'anthropic' | 'deepseek' | 'local' | 'custom';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AgentLLMConfigs {
  router: LLMConfig;
  assessor: LLMConfig;
  tutor: LLMConfig;
  examiner: LLMConfig;
  planner: LLMConfig;
}

export const DEFAULT_CONFIGS: AgentLLMConfigs = {
  router: {
    provider: 'deepseek',
    apiKey: '',
    model: 'deepseek-chat',
    temperature: 0.3,
    maxTokens: 1024,
  },
  assessor: {
    provider: 'deepseek',
    apiKey: '',
    model: 'deepseek-chat',
    temperature: 0.5,
    maxTokens: 2048,
  },
  tutor: {
    provider: 'deepseek',
    apiKey: '',
    model: 'deepseek-chat',
    temperature: 0.7,
    maxTokens: 4096,
  },
  examiner: {
    provider: 'deepseek',
    apiKey: '',
    model: 'deepseek-chat',
    temperature: 0.8,
    maxTokens: 2048,
  },
  planner: {
    provider: 'deepseek',
    apiKey: '',
    model: 'deepseek-chat',
    temperature: 0.5,
    maxTokens: 2048,
  },
};
