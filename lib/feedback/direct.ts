// 直接式反馈生成器

import type { FeedbackContext, FeedbackResult, FeedbackGenerator } from './types';

export class DirectFeedbackGenerator implements FeedbackGenerator {
  mode = 'direct' as const;

  async generateFeedback(context: FeedbackContext): Promise<FeedbackResult> {
    const { question, isCorrect, correctAnswer, topic } = context;

    if (isCorrect) {
      return this.generateCorrectFeedback(context);
    } else {
      return this.generateIncorrectFeedback(context);
    }
  }

  private generateCorrectFeedback(context: FeedbackContext): FeedbackResult {
    return {
      mode: 'direct',
      message: '正确！',
      explanation: this.generateExplanation(context),
    };
  }

  private generateIncorrectFeedback(context: FeedbackContext): FeedbackResult {
    const { correctAnswer, topic } = context;

    return {
      mode: 'direct',
      message: `错误。正确答案是：${correctAnswer}`,
      explanation: this.generateExplanation(context),
      nextSteps: [
        '仔细阅读答案解析',
        '复习相关知识点',
        '尝试类似题目巩固',
      ],
    };
  }

  private generateExplanation(context: FeedbackContext): string {
    const { topic, question } = context;

    // 根据主题生成解释
    if (topic.includes('进程')) {
      return '进程是程序执行的实例，是操作系统进行资源分配和调度的基本单位。每个进程有自己的地址空间、程序计数器、寄存器集合等。';
    } else if (topic.includes('内存')) {
      return '虚拟内存允许程序使用比实际物理内存更大的地址空间。通过页表将虚拟地址映射到物理地址，实现内存隔离和保护。';
    } else if (topic.includes('文件')) {
      return '文件系统负责管理和存储文件。inode 存储文件的元数据，包括权限、大小、时间戳等信息。';
    } else if (topic.includes('Rust')) {
      return 'Rust 的所有权系统在编译时保证内存安全，无需垃圾回收。每个值都有一个所有者，当所有者离开作用域时值会被释放。';
    }

    return '请查看相关教材和文档获取详细解释。';
  }
}
