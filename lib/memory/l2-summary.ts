// 记忆系统 - L2 表面摘要

import type { L2Summary, Message } from './types';
import { getL1Traces } from './l1-trace';

// 内存存储
const summaries: Map<string, L2Summary[]> = new Map();

// 从 L1 提取摘要
export async function consolidateSurface(
  studentId: string,
  surface: string
): Promise<L2Summary> {
  const traces = await getL1Traces(studentId, surface);
  
  if (traces.length === 0) {
    return {
      surface,
      summary: '暂无对话记录',
      keyPoints: [],
      updatedAt: new Date(),
    };
  }
  
  // 收集所有消息
  const allMessages: Message[] = [];
  for (const trace of traces) {
    allMessages.push(...trace.messages);
  }
  
  // 提取关键点（简化版本）
  const keyPoints = extractKeyPoints(allMessages);
  
  // 生成摘要
  const summary = generateSummary(allMessages, surface);
  
  const l2Summary: L2Summary = {
    surface,
    summary,
    keyPoints,
    updatedAt: new Date(),
  };
  
  // 保存到内存
  const key = `${studentId}`;
  if (!summaries.has(key)) {
    summaries.set(key, []);
  }
  
  const existing = summaries.get(key)!;
  const index = existing.findIndex(s => s.surface === surface);
  if (index >= 0) {
    existing[index] = l2Summary;
  } else {
    existing.push(l2Summary);
  }
  
  return l2Summary;
}

// 获取 L2 摘要
export async function getL2Summary(
  studentId: string,
  surface: string
): Promise<L2Summary | null> {
  const key = `${studentId}`;
  const summaryList = summaries.get(key) || [];
  return summaryList.find(s => s.surface === surface) || null;
}

// 获取所有 L2 摘要
export async function getAllL2Summaries(
  studentId: string
): Promise<L2Summary[]> {
  const key = `${studentId}`;
  return summaries.get(key) || [];
}

// 提取关键点
function extractKeyPoints(messages: Message[]): string[] {
  const keyPoints: string[] = [];
  
  // 简化实现：提取用户问题中的关键词
  for (const msg of messages) {
    if (msg.role === 'user') {
      // 提取包含"什么是"、"解释"等关键词的句子
      const sentences = msg.content.split(/[。！？]/);
      for (const sentence of sentences) {
        if (sentence.includes('什么是') || 
            sentence.includes('解释') ||
            sentence.includes('为什么')) {
          keyPoints.push(sentence.trim());
        }
      }
    }
  }
  
  // 去重并限制数量
  const uniquePoints = Array.from(new Set(keyPoints));
  return uniquePoints.slice(0, 10);
}

// 生成摘要
function generateSummary(messages: Message[], surface: string): string {
  const userMessages = messages.filter(m => m.role === 'user');
  const assistantMessages = messages.filter(m => m.role === 'assistant');
  
  const totalMessages = messages.length;
  const userMessageCount = userMessages.length;
  
  // 统计主题
  const topics = new Map<string, number>();
  for (const msg of userMessages) {
    if (msg.content.includes('进程')) topics.set('进程', (topics.get('进程') || 0) + 1);
    if (msg.content.includes('内存')) topics.set('内存', (topics.get('内存') || 0) + 1);
    if (msg.content.includes('文件')) topics.set('文件系统', (topics.get('文件系统') || 0) + 1);
    if (msg.content.includes('并发')) topics.set('并发', (topics.get('并发') || 0) + 1);
    if (msg.content.includes('Rust')) topics.set('Rust', (topics.get('Rust') || 0) + 1);
  }
  
  const topTopics = Array.from(topics.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([topic]) => topic);
  
  return `${surface}对话共 ${totalMessages} 条消息，用户提问 ${userMessageCount} 次。主要讨论主题：${topTopics.join('、') || '未识别'}`;
}
