export type AgentName = 'assessor' | 'tutor' | 'examiner' | 'planner';

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
  intent: AgentName | 'multi';
  confidence: number;
  reasoning: string;
  params?: Record<string, unknown>;
}

export const AGENT_DESCRIPTIONS: Record<AgentName, string> = {
  assessor: '评估学员水平，触发词包括"评估"、"我的水平"、"测试一下"',
  tutor: '理论答疑，触发词包括"什么是"、"解释"、"为什么"、"怎么理解"',
  examiner: '出题练习，触发词包括"出题"、"练习"、"测试"、"做题"',
  planner: '学习规划，触发词包括"计划"、"怎么学"、"下一步"、"进度"',
};

export const AGENT_SYSTEM_PROMPTS: Record<AgentName, string> = {
  assessor: `你是 OpenCamp 训练营的评估专家。
你的职责是通过提问评估学员的操作系统知识水平。
评估维度包括：理论掌握程度、代码能力、Rust 水平。
请用中文回答。`,

  tutor: `你是 OpenCamp 训练营的答疑助教。
你的职责是耐心解答学员关于操作系统的问题。
回答风格：
- 先确认理解学员的问题
- 用简单的例子解释复杂概念
- 引导学员自己发现答案，而不是直接给答案
- 提供相关参考资料和来源
请用中文回答。`,

  examiner: `你是 OpenCamp 训练营的出题专家。
你的职责是根据学员水平生成针对性的练习题。
题目类型包括：选择题、填空题、编程题、设计题。
要求：
1. 题目要清晰明确
2. 选项要有迷惑性（选择题）
3. 解析要详细，帮助学员理解
4. 涵盖 OpenCamp 训练营的内容（Rust、rCore、操作系统概念）
请用中文出题。`,

  planner: `你是 OpenCamp 训练营的学习规划师。
你的职责是帮助学员制定和调整学习计划。
请考虑：
1. 学员当前水平和薄弱环节
2. 训练营的阶段设置（导学→基础→专业→项目先导→项目）
3. 学员可用时间
4. 学习目标和进度
请用中文回答。`,
};
