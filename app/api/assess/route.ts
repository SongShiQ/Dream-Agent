// 评估 API — 规则摸底（题库）优先，可选 LLM 兜底

import { NextResponse } from 'next/server';
import prisma from '@/lib/db/index';
import { getStudentById } from '@/lib/db/student';
import { scoreDiagnostic, stripAnswers } from '@/lib/assess/diagnostic';
import { assessStudent } from '@/lib/agents/assessor';
import { pickDiagnosticSet } from '@/lib/db/question';
import { authError, getCurrentStudent } from '@/lib/auth/session';
import { gradeAnswer, parseJsonArray } from '@/lib/exam/grade';

const DIAGNOSTIC_SIZE = 12;

/**
 * GET — 给当前学员下发 12 题摸底卷（不含答案）
 * 策略：固定题库分层抽题（易/中/难）+ 排除近期做过 → 可复现、有区分度、少重复
 * 不在此用 AI 出卷（评估要稳定可比；AI 适合练习加练）
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedStudentId = searchParams.get('studentId');
    const { student } = await getCurrentStudent(req, requestedStudentId);

    if (!student) {
      return authError();
    }
    const studentId = student.id;

    const count = await prisma.question.count();
    if (count === 0) {
      return NextResponse.json(
        { error: '题库为空，请先运行 npm run content:import' },
        { status: 503 }
      );
    }

    const selected = await pickDiagnosticSet(studentId, DIAGNOSTIC_SIZE);

    return NextResponse.json({
      questions: selected.map(stripAnswers),
      total: selected.length,
      studentId,
      policy: 'bank_stratified',
      hint: '水平评估使用经典题库 12 题三维抽题（OS/Rust/编码），只推荐起点；AI 出题请在练习模式使用',
    });
  } catch (error) {
    console.error('Assess GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/** POST — 提交摸底答案（规则评分）或 LLM 自由评估 */
export async function POST(req: Request) {
  try {
    let body: {
      studentId?: string;
      studentName?: string;
      answers?: { questionId: string; answer: string }[] | string[];
      mode?: 'diagnostic' | 'llm';
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: '请求体无效' }, { status: 400 });
    }

    const { student } = await getCurrentStudent(req, body.studentId);

    if (!student) {
      return authError();
    }
    const studentId = student.id;

    // 诊断卷提交
    if (
      body.mode !== 'llm' &&
      Array.isArray(body.answers) &&
      body.answers.length > 0 &&
      typeof body.answers[0] === 'object'
    ) {
      const ans = body.answers as { questionId: string; answer: string }[];
      const ids = ans.map((a) => a.questionId);
      const questions = await prisma.question.findMany({
        where: { id: { in: ids } },
      });
      if (questions.length === 0) {
        return NextResponse.json({ error: '题目不存在' }, { status: 400 });
      }

      const result = scoreDiagnostic(questions, ans);

      await prisma.assessment.create({
        data: {
          studentId,
          theory: result.theory,
          coding: result.coding,
          rust: result.rust,
          weakPoints: JSON.stringify(result.weakPoints),
        },
      });

      await prisma.answerRecord.createMany({
        data: ans.map((a) => {
          const q = questions.find((item) => item.id === a.questionId);
          const isCorrect = q
            ? gradeAnswer(q.type, q.answer, a.answer, parseJsonArray(q.options))
            : false;
          return {
            studentId,
            questionId: a.questionId,
            answer: a.answer,
            isCorrect,
            feedbackMode: student.feedbackMode,
          };
        }),
      });

      await prisma.student.update({
        where: { id: studentId },
        data: {
          weakPoints: JSON.stringify(result.weakPoints),
        },
      });

      return NextResponse.json({
        assessment: result,
        source: 'diagnostic',
      });
    }

    // LLM 路径（兼容旧接口：string[] answers）
    if (Array.isArray(body.answers) && typeof body.answers[0] === 'string') {
      const result = await assessStudent({
        studentName: body.studentName || student.name,
        answers: body.answers as string[],
        currentStage: student.currentStage,
      });

      await prisma.assessment.create({
        data: {
          studentId,
          theory: result.theory,
          coding: result.coding,
          rust: result.rust,
          weakPoints: JSON.stringify(result.weakPoints),
        },
      });

      // LLM stage 可能是 A1.. 映射到 schema 友好值
      const stageMap: Record<string, string> = {
        A1: 'pre_study_theory',
        A2: 'pre_study_theory',
        A3: 'pre_study_rust',
        B1: 'pre_study_rust',
        B2: 'basic',
        B3: 'pre_study_tools',
        C1: 'professional',
        C2: 'professional',
        C3: 'professional',
        C4: 'professional',
        C5: 'professional',
      };
      const stage = stageMap[result.stage] || student.currentStage;

      await prisma.student.update({
        where: { id: studentId },
        data: {
          weakPoints: JSON.stringify(result.weakPoints),
        },
      });

      return NextResponse.json({
        assessment: { ...result, stage },
        source: 'llm',
      });
    }

    return NextResponse.json(
      { error: 'answers required (diagnostic objects or llm string array)' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Assess API error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
