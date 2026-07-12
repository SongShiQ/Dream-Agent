// 混合式反馈生成器

import type { FeedbackContext, FeedbackResult, FeedbackGenerator } from './types';
import { GuidedFeedbackGenerator } from './guided';
import { DirectFeedbackGenerator } from './direct';

export class HybridFeedbackGenerator implements FeedbackGenerator {
  mode = 'hybrid' as const;
  private guided = new GuidedFeedbackGenerator();
  private direct = new DirectFeedbackGenerator();

  async generateFeedback(context: FeedbackContext): Promise<FeedbackResult> {
    const { isCorrect, attemptCount, difficulty, studentLevel } = context;

    // 根据情况选择反馈策略
    if (isCorrect) {
      // 答对了，直接确认
      return this.direct.generateFeedback(context);
    }

    // 答错了，根据尝试次数决定
    if (attemptCount === 1) {
      // 第一次答错，给引导
      return this.guided.generateFeedback(context);
    } else if (attemptCount === 2) {
      // 第二次答错，给更多提示
      const guidedResult = await this.guided.generateFeedback(context);
      return {
        ...guidedResult,
        message: '再试一次，这里有个提示：',
        hints: guidedResult.hints?.slice(0, 2), // 减少提示数量
      };
    } else {
      // 第三次及以上，直接给答案
      return this.direct.generateFeedback(context);
    }
  }

  // 根据难度和学生水平调整策略
  private shouldUseGuided(difficulty: number, studentLevel: number): boolean {
    // 如果题目难度高于学生水平，使用引导式
    if (difficulty > studentLevel + 20) {
      return true;
    }
    // 否则使用直接式
    return false;
  }
}
