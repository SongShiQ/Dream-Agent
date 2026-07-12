// Tutor Agent - 理论答疑

import { generateText } from 'ai';
import { getLLMProvider } from '../llm/factory';
import { searchKnowledgeTool } from '../tools/search-knowledge';
import { analyzeCodeTool } from '../tools/analyze-code';
import { AGENT_SYSTEM_PROMPTS } from './config';
import type { FeedbackMode } from './types';

interface TutorOptions {
  question: string;
  feedbackMode?: FeedbackMode;
  studentLevel?: string;
}

// 根据反馈模式调整提示词
function getFeedbackPrompt(mode: FeedbackMode): string {
  switch (mode) {
    case 'guided':
      return '\n\n重要：请引导学员自己发现答案，不要直接给出答案。用提问的方式帮助他们思考。';
    case 'direct':
      return '\n\n重要：请直接给出答案和解释，帮助学员快速理解。';
    case 'hybrid':
    default:
      return '\n\n重要：先尝试引导学员思考，如果他们确实需要帮助，再给出答案。';
  }
}

export async function tutorAgent({ question, feedbackMode = 'hybrid', studentLevel }: TutorOptions) {
  const llm = getLLMProvider('tutor');
  const feedbackPrompt = getFeedbackPrompt(feedbackMode);
  
  const levelPrompt = studentLevel 
    ? `\n\n学员当前水平：${studentLevel}，请根据水平调整解释的深度。`
    : '';

  const result = await generateText({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    model: llm as any,
    prompt: question,
    system: AGENT_SYSTEM_PROMPTS.tutor + feedbackPrompt + levelPrompt,
    tools: {
      searchKnowledge: searchKnowledgeTool,
      analyzeCode: analyzeCodeTool,
    },
    maxSteps: 3,
  });

  return result.text;
}
