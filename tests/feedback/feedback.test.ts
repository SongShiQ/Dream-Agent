import { describe, it, expect } from 'vitest';
import { generateFeedback, quickFeedback } from '@/lib/feedback/index';
import type { FeedbackContext } from '@/lib/feedback/types';

describe('Feedback System', () => {
  describe('Guided Feedback', () => {
    it('should generate guided feedback for correct answer', async () => {
      const context: FeedbackContext = {
        question: '什么是进程？',
        isCorrect: true,
        topic: '进程',
        difficulty: 50,
        studentLevel: 60,
        attemptCount: 1,
      };

      const result = await generateFeedback(context, 'guided');
      expect(result.mode).toBe('guided');
      expect(result.message).toBeTruthy();
    });

    it('should generate hints for incorrect answer', async () => {
      const context: FeedbackContext = {
        question: '什么是进程？',
        isCorrect: false,
        topic: '进程',
        difficulty: 50,
        studentLevel: 60,
        attemptCount: 1,
      };

      const result = await generateFeedback(context, 'guided');
      expect(result.mode).toBe('guided');
      expect(result.hints).toBeDefined();
      expect(result.hints!.length).toBeGreaterThan(0);
    });
  });

  describe('Direct Feedback', () => {
    it('should provide correct answer for incorrect response', async () => {
      const context: FeedbackContext = {
        question: '什么是进程？',
        studentAnswer: '程序',
        correctAnswer: '程序执行的实例',
        isCorrect: false,
        topic: '进程',
        difficulty: 50,
        studentLevel: 60,
        attemptCount: 1,
      };

      const result = await generateFeedback(context, 'direct');
      expect(result.mode).toBe('direct');
      expect(result.message).toContain('正确答案');
    });
  });

  describe('Hybrid Feedback', () => {
    it('should use guided for first attempt', async () => {
      const context: FeedbackContext = {
        question: '什么是进程？',
        isCorrect: false,
        topic: '进程',
        difficulty: 50,
        studentLevel: 60,
        attemptCount: 1,
      };

      const result = await generateFeedback(context, 'hybrid');
      expect(result.mode).toBe('guided');
    });

    it('should use direct after multiple attempts', async () => {
      const context: FeedbackContext = {
        question: '什么是进程？',
        correctAnswer: '程序执行的实例',
        isCorrect: false,
        topic: '进程',
        difficulty: 50,
        studentLevel: 60,
        attemptCount: 3,
      };

      const result = await generateFeedback(context, 'hybrid');
      expect(result.mode).toBe('direct');
    });
  });

  describe('Quick Feedback', () => {
    it('should return correct message for correct answer', () => {
      const message = quickFeedback(true, '进程');
      expect(message).toBeTruthy();
    });

    it('should return encouragement for incorrect answer', () => {
      const message = quickFeedback(false, '进程');
      expect(message).toBeTruthy();
    });
  });
});
