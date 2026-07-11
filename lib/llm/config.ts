export type LLMProvider = 'openai' | 'anthropic' | 'local' | 'custom';

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
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4o-mini',
    temperature: 0.3,
    maxTokens: 1024,
  },
  assessor: {
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4o',
    temperature: 0.5,
    maxTokens: 2048,
  },
  tutor: {
    provider: 'anthropic',
    apiKey: '',
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.7,
    maxTokens: 4096,
  },
  examiner: {
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4o',
    temperature: 0.8,
    maxTokens: 2048,
  },
  planner: {
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4o',
    temperature: 0.5,
    maxTokens: 2048,
  },
};
