// 记忆系统 - L1 原始追踪

import type { Message, L1Trace } from './types';

// 内存存储（生产环境应该使用文件或数据库）
const traces: Map<string, L1Trace[]> = new Map();

// 生成 trace ID
function generateTraceId(): string {
  return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 记录对话到 L1
export async function traceConversation(
  studentId: string,
  surface: string,
  message: Message
): Promise<void> {
  const key = `${studentId}:${surface}`;
  
  if (!traces.has(key)) {
    traces.set(key, []);
  }
  
  const traceList = traces.get(key)!;
  
  // 获取或创建当天的 trace
  const today = new Date().toISOString().split('T')[0];
  let todayTrace = traceList.find(t => 
    t.createdAt.toISOString().split('T')[0] === today
  );
  
  if (!todayTrace) {
    todayTrace = {
      surface: surface as L1Trace['surface'],
      messages: [],
      createdAt: new Date(),
    };
    traceList.push(todayTrace);
  }
  
  // 添加消息
  todayTrace.messages.push(message);
  
  // 限制每个 trace 最多 100 条消息
  if (todayTrace.messages.length > 100) {
    todayTrace.messages = todayTrace.messages.slice(-100);
  }
}

// 获取 L1 追踪记录
export async function getL1Traces(
  studentId: string,
  surface?: string
): Promise<L1Trace[]> {
  if (surface) {
    const key = `${studentId}:${surface}`;
    return traces.get(key) || [];
  }
  
  // 返回所有 surface 的 traces
  const allTraces: L1Trace[] = [];
  traces.forEach((traceList, key) => {
    if (key.startsWith(`${studentId}:`)) {
      allTraces.push(...traceList);
    }
  });
  return allTraces;
}

// 清理旧的 traces（保留最近 N 天）
export async function cleanupOldTraces(
  studentId: string,
  daysToKeep: number = 30
): Promise<void> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  traces.forEach((traceList, key) => {
    if (key.startsWith(`${studentId}:`)) {
      const filtered = traceList.filter(t => t.createdAt >= cutoffDate);
      traces.set(key, filtered);
    }
  });
}

// 获取最近的对话
export async function getRecentMessages(
  studentId: string,
  surface: string,
  count: number = 10
): Promise<Message[]> {
  const key = `${studentId}:${surface}`;
  const traceList = traces.get(key) || [];
  
  if (traceList.length === 0) {
    return [];
  }
  
  // 获取最新的 trace
  const latestTrace = traceList[traceList.length - 1];
  return latestTrace.messages.slice(-count);
}
