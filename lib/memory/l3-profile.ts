// 记忆系统 - L3 跨表面综合

import type { L3Profile } from './types';
import { getAllL2Summaries } from './l2-summary';
import prisma from '../db/index';

// 获取或创建学员档案
export async function getOrCreateProfile(
  studentId: string
): Promise<L3Profile> {
  // 尝试从数据库获取
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      assessments: {
        orderBy: { assessedAt: 'desc' },
        take: 1,
      },
    },
  });
  
  if (student) {
    return {
      studentId: student.id,
      name: student.name,
      currentStage: student.currentStage,
      weakPoints: student.weakPoints ? JSON.parse(student.weakPoints) : [],
      knowledgeScope: {},
      preferences: {
        feedbackMode: (student.feedbackMode as L3Profile['preferences']['feedbackMode']) || 'hybrid',
        learningStyle: 'visual',
      },
      recentActivity: [],
      updatedAt: student.updatedAt,
    };
  }
  
  // 创建新档案
  const newStudent = await prisma.student.create({
    data: {
      id: studentId,
      name: '未命名学员',
    },
  });
  
  return {
    studentId: newStudent.id,
    name: newStudent.name,
    currentStage: newStudent.currentStage,
    weakPoints: [],
    knowledgeScope: {},
    preferences: {
      feedbackMode: 'hybrid',
      learningStyle: 'visual',
    },
    recentActivity: [],
    updatedAt: newStudent.updatedAt,
  };
}

// 综合用户画像
export async function synthesizeProfile(
  studentId: string
): Promise<L3Profile> {
  // 获取所有 L2 摘要
  const summaries = await getAllL2Summaries(studentId);
  
  // 获取学员档案
  const profile = await getOrCreateProfile(studentId);
  
  // 从 L2 摘要中提取信息
  const recentActivity: string[] = [];
  const knowledgeScope: Record<string, number> = {};
  
  for (const summary of summaries) {
    // 添加最近活动
    if (summary.summary !== '暂无对话记录') {
      recentActivity.push(summary.summary);
    }
    
    // 统计知识点
    for (const point of summary.keyPoints) {
      if (point.includes('进程')) knowledgeScope['进程'] = (knowledgeScope['进程'] || 0) + 1;
      if (point.includes('内存')) knowledgeScope['内存'] = (knowledgeScope['内存'] || 0) + 1;
      if (point.includes('文件')) knowledgeScope['文件系统'] = (knowledgeScope['文件系统'] || 0) + 1;
      if (point.includes('并发')) knowledgeScope['并发'] = (knowledgeScope['并发'] || 0) + 1;
      if (point.includes('Rust')) knowledgeScope['Rust'] = (knowledgeScope['Rust'] || 0) + 1;
    }
  }
  
  // 更新档案
  profile.recentActivity = recentActivity.slice(-10);
  profile.knowledgeScope = knowledgeScope;
  profile.updatedAt = new Date();
  
  // 保存到数据库
  await prisma.student.update({
    where: { id: studentId },
    data: {
      weakPoints: JSON.stringify(profile.weakPoints),
      updatedAt: profile.updatedAt,
    },
  });
  
  return profile;
}

// 更新学员阶段
export async function updateStudentStage(
  studentId: string,
  stage: string
): Promise<void> {
  await prisma.student.update({
    where: { id: studentId },
    data: { currentStage: stage },
  });
}

// 更新学员偏好
export async function updateStudentPreferences(
  studentId: string,
  preferences: Partial<L3Profile['preferences']>
): Promise<void> {
  const profile = await getOrCreateProfile(studentId);
  
  await prisma.student.update({
    where: { id: studentId },
    data: {
      feedbackMode: preferences.feedbackMode || profile.preferences.feedbackMode,
    },
  });
}
