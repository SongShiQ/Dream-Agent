// 共享上下文管理器 - 实现多模式隔离与通讯

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 学习模式类型
export type LearningMode = 'chat' | 'quiz' | 'assess' | 'plan' | 'practice';

// 共享上下文接口
export interface SharedContext {
  studentId: string;
  currentStage: string;
  weakPoints: string[];
  lastAssessment?: {
    theory: number;
    coding: number;
    rust: number;
    date: string;
  };
  recentTopics: string[];
  modeHistory: Record<LearningMode, {
    lastActive: string;
    messageCount: number;
  }>;
  updatedAt: string;
}

// 模式上下文接口
export interface ModeContext {
  mode: LearningMode;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
  metadata: Record<string, unknown>;
  updatedAt: string;
}

// 获取共享上下文
export async function getSharedContext(studentId: string): Promise<SharedContext> {
  // 从数据库或文件读取共享上下文
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      assessments: {
        orderBy: { assessedAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!student) {
    // 返回默认上下文
    return {
      studentId,
      currentStage: 'A1',
      weakPoints: [],
      recentTopics: [],
      modeHistory: {} as Record<LearningMode, { lastActive: string; messageCount: number }>,
      updatedAt: new Date().toISOString(),
    };
  }

  const weakPoints = student.weakPoints ? JSON.parse(student.weakPoints) : [];
  const latestAssessment = student.assessments[0];

  return {
    studentId,
    currentStage: student.currentStage,
    weakPoints,
    lastAssessment: latestAssessment ? {
      theory: latestAssessment.theory,
      coding: latestAssessment.coding,
      rust: latestAssessment.rust,
      date: latestAssessment.assessedAt.toISOString(),
    } : undefined,
    recentTopics: [], // TODO: 从对话历史提取
    modeHistory: {} as Record<LearningMode, { lastActive: string; messageCount: number }>,
    updatedAt: student.updatedAt.toISOString(),
  };
}

// 更新共享上下文
export async function updateSharedContext(
  studentId: string,
  updates: Partial<SharedContext>
): Promise<void> {
  await prisma.student.update({
    where: { id: studentId },
    data: {
      currentStage: updates.currentStage,
      weakPoints: updates.weakPoints ? JSON.stringify(updates.weakPoints) : undefined,
      updatedAt: new Date(),
    },
  });
}

// 获取模式上下文（从内存或文件）
const modeContexts: Map<string, ModeContext> = new Map();

export function getModeContext(studentId: string, mode: LearningMode): ModeContext {
  const key = `${studentId}:${mode}`;
  
  if (!modeContexts.has(key)) {
    modeContexts.set(key, {
      mode,
      messages: [],
      metadata: {},
      updatedAt: new Date().toISOString(),
    });
  }
  
  return modeContexts.get(key)!;
}

// 更新模式上下文
export function updateModeContext(
  studentId: string,
  mode: LearningMode,
  updates: Partial<ModeContext>
): void {
  const key = `${studentId}:${mode}`;
  const existing = getModeContext(studentId, mode);
  
  modeContexts.set(key, {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

// 添加消息到模式上下文
export function addMessageToMode(
  studentId: string,
  mode: LearningMode,
  message: { role: 'user' | 'assistant'; content: string }
): void {
  const context = getModeContext(studentId, mode);
  context.messages.push({
    ...message,
    timestamp: new Date().toISOString(),
  });
  
  // 限制消息数量（保留最近 50 条）
  if (context.messages.length > 50) {
    context.messages = context.messages.slice(-50);
  }
  
  updateModeContext(studentId, mode, { messages: context.messages });
}

// 构建系统提示（注入共享上下文）
export function buildSystemPrompt(
  studentId: string,
  mode: LearningMode
): string {
  const sharedContext = getSharedContext(studentId);
  const modeContext = getModeContext(studentId, mode);
  
  // 基础角色提示
  let prompt = `你是 OpenCamp 训练营的 AI 助教。

当前模式：${getModeLabel(mode)}
`;

  // 注入共享上下文（如果已解决）
  // 注意：这里需要 await，但为了简化先用同步方式
  // 实际实现应该在 API 层处理

  return prompt;
}

// 获取模式标签
function getModeLabel(mode: LearningMode): string {
  const labels: Record<LearningMode, string> = {
    chat: '智能问答',
    quiz: '练习模式',
    assess: '水平评估',
    plan: '学习计划',
    practice: '专项训练',
  };
  return labels[mode];
}

// 清理旧上下文（定期调用）
export async function cleanupOldContexts(daysToKeep: number = 30): Promise<void> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  // 清理内存中的旧上下文
  const keysToDelete: string[] = [];
  modeContexts.forEach((context, key) => {
    if (new Date(context.updatedAt) < cutoffDate) {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => modeContexts.delete(key));
}
