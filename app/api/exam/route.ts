import { NextResponse } from 'next/server';
import { generateQuestion } from '@/lib/agents/examiner';
import {
  getQuestionById,
  pickQuestion,
  getRecentQuestionIds,
  saveAnswerRecord,
  createQuestion,
  getWrongQuestions,
} from '@/lib/db/question';
import {
  getStudentById,
  getStudentStats,
  mergeWeakPoints,
  decayWeakPointsOnCorrect,
  updateStudentStage,
} from '@/lib/db/student';
import { adjustDifficulty } from '@/lib/adaptive/difficulty';
import { gradeAnswer, parseJsonArray } from '@/lib/exam/grade';
import { evaluateStageUpgrade } from '@/lib/adaptive/stage';

function serializeQuestion(
  q: {
    id: string;
    type: string;
    content: string;
    options: string;
    answer: string;
    explanation: string;
    knowledgePoints: string;
    difficulty: number;
  },
  source: 'bank' | 'llm' = 'bank'
) {
  return {
    id: q.id,
    type: q.type,
    content: q.content,
    options: parseJsonArray(q.options),
    answer: q.answer,
    explanation: q.explanation,
    knowledgePoints: parseJsonArray(q.knowledgePoints),
    difficulty: q.difficulty,
    source,
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    const action = searchParams.get('action') || 'wrongbook';

    if (!studentId) {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 });
    }

    if (action === 'wrongbook') {
      const items = await getWrongQuestions(studentId, 40);
      return NextResponse.json({ items, total: items.length });
    }

    if (action === 'stage') {
      const student = await getStudentById(studentId);
      if (!student) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }
      const stats = await getStudentStats(studentId);
      let weakCount = 0;
      try {
        weakCount = JSON.parse(student.weakPoints || '[]').length;
      } catch {
        weakCount = 0;
      }
      const upgrade = evaluateStageUpgrade({
        currentStage: student.currentStage,
        totalQuestions: stats.totalQuestions,
        correctAnswers: stats.correctAnswers,
        recentAccuracy: stats.recentAccuracy,
        weakPointsCount: weakCount,
      });
      return NextResponse.json({
        currentStage: student.currentStage,
        upgrade,
        stats,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Exam GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    let body: {
      studentId?: string;
      action?: string;
      questionId?: string;
      answer?: string;
      timeSpent?: number;
      currentDifficulty?: number;
      focusWeak?: boolean;
      knowledgePoint?: string;
      stage?: string;
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: '请求体无效' }, { status: 400 });
    }

    const {
      studentId,
      action,
      questionId,
      answer,
      timeSpent,
      currentDifficulty,
      focusWeak,
      knowledgePoint,
      stage,
    } = body;

    if (!studentId) {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 });
    }

    if (action === 'generate') {
      const student = await getStudentById(studentId);
      if (!student) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }

      const stats = await getStudentStats(studentId);
      const difficulty =
        typeof currentDifficulty === 'number' ? currentDifficulty : stats.currentDifficulty;
      const weakPoints = parseJsonArray(student.weakPoints);
      const excludeIds = await getRecentQuestionIds(studentId, 12);

      const bankQ = await pickQuestion({
        difficulty,
        weakPoints,
        excludeIds,
        focusWeak: !!focusWeak || weakPoints.length > 0,
        knowledgePoint,
        stage,
      });

      if (bankQ) {
        const kps = parseJsonArray(bankQ.knowledgePoints);
        const targeted =
          !!knowledgePoint ||
          (weakPoints.length > 0 && kps.some((k) => weakPoints.includes(k)));
        return NextResponse.json({
          question: serializeQuestion(bankQ, 'bank'),
          difficulty,
          targeted,
          weakPoints,
        });
      }

      try {
        const generated = await generateQuestion({
          studentId,
          currentDifficulty: difficulty,
          weakPoints,
          stage: student.currentStage || 'basic',
        });

        const saved = await createQuestion({
          type: generated.type,
          difficulty: generated.difficulty ?? difficulty,
          knowledgePoints: generated.knowledgePoints || [],
          content: generated.content,
          options: generated.options || [],
          answer: generated.answer,
          explanation: generated.explanation,
        });

        return NextResponse.json({
          question: serializeQuestion(saved, 'llm'),
          difficulty,
          targeted: false,
          weakPoints,
        });
      } catch (llmError) {
        console.error('LLM generate failed:', llmError);
        return NextResponse.json(
          { error: '题库为空且 LLM 出题失败，请先导入题库或配置 API Key' },
          { status: 503 }
        );
      }
    }

    if (action === 'submit') {
      if (!questionId || answer === undefined) {
        return NextResponse.json({ error: 'questionId and answer required' }, { status: 400 });
      }

      const student = await getStudentById(studentId);
      if (!student) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }

      const question = await getQuestionById(questionId);
      if (!question) {
        return NextResponse.json({ error: 'Question not found' }, { status: 404 });
      }

      const options = parseJsonArray(question.options);
      const isCorrect = gradeAnswer(question.type, question.answer, String(answer), options);
      const kps = parseJsonArray(question.knowledgePoints);

      await saveAnswerRecord(
        studentId,
        questionId,
        String(answer),
        isCorrect,
        timeSpent || 0
      );

      let weakPoints = parseJsonArray(student.weakPoints);
      if (!isCorrect) {
        if (kps.length > 0) {
          weakPoints = await mergeWeakPoints(studentId, kps);
        }
      } else {
        weakPoints = await decayWeakPointsOnCorrect(studentId, kps);
      }

      const stats = await getStudentStats(studentId);
      const baseDiff =
        typeof currentDifficulty === 'number' ? currentDifficulty : stats.currentDifficulty;
      const newDifficulty = adjustDifficulty({
        currentDifficulty: baseDiff,
        recentAccuracy: stats.recentAccuracy,
        consecutiveCorrect: stats.consecutiveCorrect,
        consecutiveWrong: stats.consecutiveWrong,
      });

      const upgrade = evaluateStageUpgrade({
        currentStage: student.currentStage,
        totalQuestions: stats.totalQuestions,
        correctAnswers: stats.correctAnswers,
        recentAccuracy: stats.recentAccuracy,
        weakPointsCount: weakPoints.length,
      });

      return NextResponse.json({
        isCorrect,
        explanation: question.explanation,
        correctAnswer: question.answer,
        difficulty: newDifficulty,
        stats: {
          totalQuestions: stats.totalQuestions,
          correctAnswers: stats.correctAnswers,
          recentAccuracy: stats.recentAccuracy,
          consecutiveCorrect: stats.consecutiveCorrect,
          consecutiveWrong: stats.consecutiveWrong,
        },
        weakPoints,
        upgrade,
      });
    }

    if (action === 'promote') {
      const student = await getStudentById(studentId);
      if (!student) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }
      const stats = await getStudentStats(studentId);
      let weakCount = 0;
      try {
        weakCount = JSON.parse(student.weakPoints || '[]').length;
      } catch {
        weakCount = 0;
      }
      const upgrade = evaluateStageUpgrade({
        currentStage: student.currentStage,
        totalQuestions: stats.totalQuestions,
        correctAnswers: stats.correctAnswers,
        recentAccuracy: stats.recentAccuracy,
        weakPointsCount: weakCount,
      });
      if (!upgrade.eligible || !upgrade.suggestedStage) {
        return NextResponse.json(
          { error: '暂不符合升级条件', upgrade },
          { status: 400 }
        );
      }
      const updated = await updateStudentStage(studentId, upgrade.suggestedStage);
      return NextResponse.json({
        student: updated,
        upgrade: { ...upgrade, eligible: false, reason: '已升级' },
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Exam API error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
