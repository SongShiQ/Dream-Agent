import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import type { LLMConfig } from './config';

export function createLLMProvider(config: LLMConfig) {
  switch (config.provider) {
    case 'openai':
      return createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl,
      })(config.model);
    
    case 'anthropic':
      return createAnthropic({
        apiKey: config.apiKey,
        baseURL: config.baseUrl,
      })(config.model);
    
    case 'deepseek':
      // DeepSeek 兼容 OpenAI API
      return createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl || 'https://api.deepseek.com/v1',
      })(config.model);
    
    case 'local':
      // Ollama 兼容 OpenAI API
      return createOpenAI({
        apiKey: 'ollama',
        baseURL: config.baseUrl || 'http://localhost:11434/v1',
      })(config.model);
    
    case 'custom':
      return createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl,
      })(config.model);
    
    default:
      throw new Error(`Unsupported provider: ${config.provider}`);
  }
}
