// 记忆系统 - 类型定义

// 消息类型
export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// L1: 原始追踪
export interface L1Trace {
  surface: 'chat' | 'quiz' | 'assess' | 'plan';
  messages: Message[];
  createdAt: Date;
}

// L2: 表面摘要
export interface L2Summary {
  surface: string;
  summary: string;
  keyPoints: string[];
  updatedAt: Date;
}

// L3: 跨表面综合
export interface L3Profile {
  studentId: string;
  name: string;
  currentStage: string;
  weakPoints: string[];
  knowledgeScope: Record<string, number>;
  preferences: {
    feedbackMode: 'guided' | 'direct' | 'hybrid';
    learningStyle: string;
  };
  recentActivity: string[];
  updatedAt: Date;
}

// 记忆管理器接口
export interface MemoryManager {
  // L1: 追踪对话
  trace(surface: string, message: Message): Promise<void>;
  
  // L2: 提取摘要
  consolidate(surface: string): Promise<L2Summary>;
  
  // L3: 综合用户画像
  synthesize(): Promise<L3Profile>;
  
  // 获取记忆
  getL1(surface: string): Promise<L1Trace | null>;
  getL2(surface: string): Promise<L2Summary | null>;
  getL3(): Promise<L3Profile | null>;
}
