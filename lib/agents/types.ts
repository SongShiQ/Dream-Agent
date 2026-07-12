// Agent 类型定义

export type AgentName = 'router' | 'tutor' | 'assessor' | 'examiner' | 'planner';

export interface AgentResponse {
  agent: AgentName;
  content: string;
  toolCalls?: ToolCall[];
  metadata?: Record<string, unknown>;
}

export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
  result?: string;
}

export interface RouterDecision {
  intent: AgentName;
  confidence: number;
  reasoning: string;
  params?: Record<string, unknown>;
}

// Judge 模块类型
export type JudgeResult = 
  | { status: 'tried'; confidence: number; evidence: string }
  | { status: 'not_tried'; confidence: number; evidence: string }
  | { status: 'uncertain'; needsLLM: boolean };

// Agent 配置
export interface AgentConfig {
  name: AgentName;
  description: string;
  systemPrompt: string;
  tools?: string[];
}

// 反馈模式
export type FeedbackMode = 'guided' | 'direct' | 'hybrid';

// 学员状态
export interface StudentState {
  id: string;
  currentStage: string;
  weakPoints: string[];
  feedbackMode: FeedbackMode;
}
