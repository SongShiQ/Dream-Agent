// 反馈系统主模块

import type { FeedbackMode, FeedbackContext, FeedbackResult } from './types';
import { GuidedFeedbackGenerator } from './guided';
import { DirectFeedbackGenerator } from './direct';
import { HybridFeedbackGenerator } from './hybrid';

// 反馈生成器映射
const generators: Record<FeedbackMode, GuidedFeedbackGenerator | DirectFeedbackGenerator | HybridFeedbackGenerator> = {
  guided: new GuidedFeedbackGenerator(),
  direct: new DirectFeedbackGenerator(),
  hybrid: new HybridFeedbackGenerator(),
};

// 生成反馈
export async function generateFeedback(
  context: FeedbackContext,
  mode: FeedbackMode = 'hybrid'
): Promise<FeedbackResult> {
  const generator = generators[mode];
  if (!generator) {
    throw new Error(`Unknown feedback mode: ${mode}`);
  }
  return generator.generateFeedback(context);
}

// 根据学生偏好生成反馈
export async function generateAdaptiveFeedback(
  context: FeedbackContext,
  studentPreferences?: { feedbackMode?: FeedbackMode }
): Promise<FeedbackResult> {
  const mode = studentPreferences?.feedbackMode || 'hybrid';
  return generateFeedback(context, mode);
}

// 快速反馈（用于实时交互）
export function quickFeedback(isCorrect: boolean, topic: string): string {
  if (isCorrect) {
    const correctMessages = [
      '正确！',
      '答对了！',
      '很好！',
      '完全正确！',
    ];
    return correctMessages[Math.floor(Math.random() * correctMessages.length)];
  } else {
    const incorrectMessages = [
      '不太对，再想想。',
      '接近了，但不是完全正确。',
      '再试一次。',
      '提示：回顾一下相关概念。',
    ];
    return incorrectMessages[Math.floor(Math.random() * incorrectMessages.length)];
  }
}

// 导出所有生成器
export { GuidedFeedbackGenerator } from './guided';
export { DirectFeedbackGenerator } from './direct';
export { HybridFeedbackGenerator } from './hybrid';
export type { FeedbackMode, FeedbackContext, FeedbackResult } from './types';
