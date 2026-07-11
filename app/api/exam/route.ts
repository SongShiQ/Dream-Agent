import { NextResponse } from 'next/server';
import { generateQuestion } from '@/lib/agents/examiner';
import { saveAnswerRecord } from '@/lib/db/question';
import { getStudentById } from '@/lib/db/student';

export async function POST(req: Request) {
  try {
    const { studentId, action, questionId, answer, timeSpent } = await req.json();

    if (action === 'generate') {
      // 获取学员信息
      const student = await getStudentById(studentId);
      if (!student) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }

      // 生成新题目
      const result = await generateQuestion(
        studentId,
        50, // 默认难度
        student.weakPoints || []
      );
      return NextResponse.json(result);
    }

    if (action === 'submit') {
      // 提交答案
      // TODO: 实际验证答案是否正确
      const isCorrect = false; // 需要实际验证逻辑
      await saveAnswerRecord(studentId, questionId, answer, isCorrect, timeSpent || 0);
      return NextResponse.json({ isCorrect });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Exam API error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
