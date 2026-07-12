// 引导式反馈生成器

import type { FeedbackContext, FeedbackResult, FeedbackGenerator } from './types';

export class GuidedFeedbackGenerator implements FeedbackGenerator {
  mode = 'guided' as const;

  async generateFeedback(context: FeedbackContext): Promise<FeedbackResult> {
    const { question, isCorrect, topic, difficulty, attemptCount } = context;

    if (isCorrect) {
      return this.generateCorrectFeedback(context);
    } else {
      return this.generateIncorrectFeedback(context);
    }
  }

  private generateCorrectFeedback(context: FeedbackContext): FeedbackResult {
    const encouragements = [
      '很好！你理解了这个概念。',
      '正确！继续加油。',
      '答对了！你对这个知识点掌握得很好。',
    ];

    return {
      mode: 'guided',
      message: encouragements[Math.floor(Math.random() * encouragements.length)],
      nextSteps: [
        '尝试用你自己的话解释这个概念',
        '思考这个知识点在实际系统中的应用',
        '准备进入下一个知识点',
      ],
    };
  }

  private generateIncorrectFeedback(context: FeedbackContext): FeedbackResult {
    const { question, topic, attemptCount } = context;

    const hints = this.generateHints(context);

    return {
      mode: 'guided',
      message: '不太对，让我们换个角度思考。',
      hints,
      encouragement: attemptCount > 2 
        ? '别灰心，这个知识点确实有难度。' 
        : '再试一次，我相信你能想到。',
    };
  }

  private generateHints(context: FeedbackContext): string[] {
    const { topic, difficulty } = context;
    const hints: string[] = [];

    // 根据主题生成提示
    if (topic.includes('进程')) {
      hints.push('想想进程和程序的区别');
      hints.push('进程有哪些状态？');
      hints.push('进程控制块包含哪些信息？');
    } else if (topic.includes('内存')) {
      hints.push('虚拟地址和物理地址的关系');
      hints.push('页表的作用是什么？');
      hints.push('什么是页面置换？');
    } else if (topic.includes('文件')) {
      hints.push('文件系统如何组织数据？');
      hints.push('inode 包含什么信息？');
      hints.push('目录和文件的关系');
    } else {
      hints.push('回顾一下相关的基础概念');
      hints.push('想想这个问题的核心是什么');
      hints.push('尝试画个图来理解');
    }

    return hints;
  }
}
