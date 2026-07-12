// 知识点管理器

import prisma from '../db/index';

// 知识点状态
export type KnowledgeStatus = 'learning' | 'mastered' | 'review';

// 知识点信息
export interface KnowledgePoint {
  name: string;
  status: KnowledgeStatus;
  attempts: number;
  correctStreak: number;
  lastAttempt: Date | null;
}

// 知识点掌握阈值
const MASTERY_THRESHOLD = 3; // 连续正确 3 次视为掌握
const REVIEW_INTERVAL_DAYS = 7; // 7 天后复习

// 判断知识点是否掌握
export function isMastered(point: KnowledgePoint): boolean {
  return point.correctStreak >= MASTERY_THRESHOLD;
}

// 判断是否需要复习
export function needsReview(point: KnowledgePoint): boolean {
  if (point.status !== 'mastered') return false;
  if (!point.lastAttempt) return false;
  
  const daysSinceLastAttempt = daysBetween(point.lastAttempt, new Date());
  return daysSinceLastAttempt >= REVIEW_INTERVAL_DAYS;
}

// 更新知识点状态
export async function updateKnowledgePoint(
  studentId: string,
  knowledgePoint: string,
  isCorrect: boolean
): Promise<KnowledgePoint> {
  // 获取当前状态
  const student = await prisma.student.findUnique({
    where: { id: studentId },
  });
  
  if (!student) {
    throw new Error('Student not found');
  }
  
  // 解析现有的知识点
  const weakPoints: string[] = student.weakPoints 
    ? JSON.parse(student.weakPoints) 
    : [];
  
  // 简化实现：只更新薄弱点列表
  if (isCorrect) {
    // 如果答对了，从薄弱点中移除
    const index = weakPoints.indexOf(knowledgePoint);
    if (index > -1) {
      weakPoints.splice(index, 1);
    }
  } else {
    // 如果答错了，添加到薄弱点
    if (!weakPoints.includes(knowledgePoint)) {
      weakPoints.push(knowledgePoint);
    }
  }
  
  // 更新数据库
  await prisma.student.update({
    where: { id: studentId },
    data: {
      weakPoints: JSON.stringify(weakPoints),
    },
  });
  
  return {
    name: knowledgePoint,
    status: isCorrect ? 'mastered' : 'learning',
    attempts: 1,
    correctStreak: isCorrect ? 1 : 0,
    lastAttempt: new Date(),
  };
}

// 获取学员的薄弱知识点
export async function getWeakPoints(studentId: string): Promise<string[]> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
  });
  
  if (!student || !student.weakPoints) {
    return [];
  }
  
  return JSON.parse(student.weakPoints);
}

// 获取学员的知识点掌握情况
export async function getKnowledgeStatus(
  studentId: string
): Promise<Record<string, KnowledgeStatus>> {
  const weakPoints = await getWeakPoints(studentId);
  const status: Record<string, KnowledgeStatus> = {};
  
  // 薄弱点标记为 learning
  for (const point of weakPoints) {
    status[point] = 'learning';
  }
  
  // 其他知识点标记为 mastered（简化实现）
  const allTopics = ['进程', '内存', '文件系统', '并发', 'Rust'];
  for (const topic of allTopics) {
    if (!status[topic]) {
      status[topic] = 'mastered';
    }
  }
  
  return status;
}

// 从上下文中移除已掌握的知识点
export function recycleFromContext(
  masteredPoints: string[],
  context: string
): string {
  let cleanedContext = context;
  
  // 移除已掌握知识点的详细解释
  for (const point of masteredPoints) {
    // 简化实现：移除包含该知识点的段落
    const regex = new RegExp(`[^。]*${point}[^。]*。`, 'g');
    cleanedContext = cleanedContext.replace(regex, '');
  }
  
  return cleanedContext.trim();
}

// 计算两个日期之间的天数
function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((date1.getTime() - date2.getTime()) / oneDay));
}
