// 反馈 API

import { NextResponse } from 'next/server';
import { generateFeedback, generateAdaptiveFeedback } from '@/lib/feedback/index';
import type { FeedbackMode, FeedbackContext } from '@/lib/feedback/types';
import prisma from '@/lib/db/index';

export async function POST(req: Request) {
  try {
    const { 
      studentId, 
      question, 
      studentAnswer, 
      correctAnswer, 
      isCorrect, 
      topic, 
      difficulty, 
      mode 
    } = await req.json();

    // 获取学生信息
    let studentLevel = 50; // 默认水平
    let feedbackMode: FeedbackMode = mode || 'hybrid';

    if (studentId) {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
      });

      if (student) {
        // 从学生档案获取水平和偏好
        const weakPoints = student.weakPoints ? JSON.parse(student.weakPoints) : [];
        studentLevel = weakPoints.length > 0 ? 40 : 60; // 简化：根据薄弱点判断
        feedbackMode = (student.feedbackMode as FeedbackMode) || 'hybrid';
      }
    }

    // 构建反馈上下文
    const context: FeedbackContext = {
      question: question || '',
      studentAnswer,
      correctAnswer,
      isCorrect,
      topic: topic || 'general',
      difficulty: difficulty || 50,
      studentLevel,
      attemptCount: 1, // TODO: 从数据库获取尝试次数
    };

    // 生成反馈
    const feedback = await generateFeedback(context, feedbackMode);

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error('Feedback API error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
