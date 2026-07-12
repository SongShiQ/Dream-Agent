// 反馈系统 - 类型定义

// 反馈模式
export type FeedbackMode = 'guided' | 'direct' | 'hybrid';

// 反馈上下文
export interface FeedbackContext {
  question: string;
  studentAnswer?: string;
  correctAnswer?: string;
  isCorrect?: boolean;
  topic: string;
  difficulty: number;
  studentLevel: number;
  attemptCount: number;
}

// 反馈结果
export interface FeedbackResult {
  mode: FeedbackMode;
  message: string;
  hints?: string[];
  explanation?: string;
  nextSteps?: string[];
  encouragement?: string;
}

// 反馈生成器接口
export interface FeedbackGenerator {
  mode: FeedbackMode;
  generateFeedback(context: FeedbackContext): Promise<FeedbackResult>;
}
