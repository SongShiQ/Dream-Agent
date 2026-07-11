import { generateText } from 'ai';
import { getLLMProvider } from '../llm/factory';
import { searchKnowledgeTool } from '../tools/search-knowledge';
import { analyzeCodeTool } from '../tools/analyze-code';
import { AGENT_SYSTEM_PROMPTS } from './types';

export async function tutorAgent(question: string) {
  const llm = getLLMProvider('tutor');

  const result = await generateText({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    model: llm as any,
    prompt: question,
    system: AGENT_SYSTEM_PROMPTS.tutor,
    tools: {
      searchKnowledge: searchKnowledgeTool,
      analyzeCode: analyzeCodeTool,
    },
    maxSteps: 3,
  });

  return result.text;
}
