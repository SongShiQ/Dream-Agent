// 学习报告 API — JSON / Markdown 导出

import { NextResponse } from 'next/server';
import prisma from '@/lib/db/index';
import { getStudentStats } from '@/lib/db/student';
import { STAGE_LABELS, STAGE_LABS } from '@/lib/adaptive/stage';
import { evaluateStageUpgrade } from '@/lib/adaptive/stage';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    const format = searchParams.get('format') || 'json'; // json | md

    if (!studentId) {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        assessments: { orderBy: { assessedAt: 'desc' }, take: 3 },
        learningPlan: true,
        _count: {
          select: {
            answerRecords: true,
            codeSubmissions: true,
            chatSessions: true,
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const stats = await getStudentStats(studentId);
    let weak: string[] = [];
    try {
      weak = JSON.parse(student.weakPoints || '[]');
    } catch {
      weak = [];
    }

    const wrongTop = await prisma.answerRecord.findMany({
      where: { studentId, isCorrect: false },
      orderBy: { answeredAt: 'desc' },
      take: 10,
      include: { question: true },
    });

    const recentSubs = await prisma.codeSubmission.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        labName: true,
        isPassed: true,
        createdAt: true,
        language: true,
      },
    });

    const upgrade = evaluateStageUpgrade({
      currentStage: student.currentStage,
      totalQuestions: stats.totalQuestions,
      correctAnswers: stats.correctAnswers,
      recentAccuracy: stats.recentAccuracy,
      weakPointsCount: weak.length,
    });

    const report = {
      generatedAt: new Date().toISOString(),
      student: {
        id: student.id,
        name: student.name,
        currentStage: student.currentStage,
        stageLabel: STAGE_LABELS[student.currentStage] || student.currentStage,
        weakPoints: weak,
        feedbackMode: student.feedbackMode,
      },
      stats: {
        ...stats,
        accuracyPercent:
          stats.totalQuestions > 0
            ? Math.round((stats.correctAnswers / stats.totalQuestions) * 100)
            : 0,
        chatSessions: student._count.chatSessions,
        codeSubmissions: student._count.codeSubmissions,
      },
      labsForStage: STAGE_LABS[student.currentStage] || [],
      upgrade,
      recentWrong: wrongTop.map((w) => ({
        content: w.question.content.slice(0, 80),
        yourAnswer: w.answer,
        knowledgePoints: (() => {
          try {
            return JSON.parse(w.question.knowledgePoints || '[]');
          } catch {
            return [];
          }
        })(),
        answeredAt: w.answeredAt,
      })),
      recentSubmissions: recentSubs,
      latestAssessment: student.assessments[0]
        ? {
            theory: student.assessments[0].theory,
            coding: student.assessments[0].coding,
            rust: student.assessments[0].rust,
            assessedAt: student.assessments[0].assessedAt,
          }
        : null,
    };

    if (format === 'md' || format === 'markdown') {
      const md = toMarkdown(report);
      // filename 必须是 ASCII（Header ByteString）
      // 默认 inline 供页面预览；仅 download=1 时强制附件下载，避免 iframe 误触发下载
      const wantDownload = searchParams.get('download') === '1';
      const safeId = student.id.slice(0, 8);
      return new NextResponse(md, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': wantDownload
            ? `attachment; filename="opencamp-report-${safeId}.md"`
            : `inline; filename="opencamp-report-${safeId}.md"`,
        },
      });
    }

    return NextResponse.json({ report });
  } catch (error) {
    console.error('Report API error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toMarkdown(report: any): string {
  const s = report.student;
  const st = report.stats;
  const lines = [
    `# OpenCamp 学习报告`,
    ``,
    `- 学员：${s.name}`,
    `- 生成时间：${report.generatedAt}`,
    `- 阶段：${s.stageLabel}（${s.currentStage}）`,
    `- 已答题：${st.totalQuestions}，正确：${st.correctAnswers}，正确率：${st.accuracyPercent}%`,
    `- 近 20 题正确率：${Math.round((st.recentAccuracy || 0) * 100)}%`,
    `- 当前难度估计：${st.currentDifficulty}`,
    `- 聊天会话数：${st.chatSessions}，代码提交：${st.codeSubmissions}`,
    ``,
    `## 薄弱知识点`,
    s.weakPoints?.length ? s.weakPoints.map((w: string) => `- ${w}`).join('\n') : '- （无）',
    ``,
    `## 本阶段实验线索`,
    report.labsForStage?.length
      ? report.labsForStage.map((l: string) => `- \`${l}\``).join('\n')
      : '- （本阶段以概念为主）',
    ``,
    `## 阶段升级`,
    report.upgrade?.eligible
      ? `- 可升级至：${report.upgrade.suggestedStage}\n- ${report.upgrade.reason}`
      : `- 暂不可升级：${report.upgrade?.reason || ''}`,
    ``,
    `## 最近错题（最多 10）`,
  ];

  if (report.recentWrong?.length) {
    for (const w of report.recentWrong) {
      lines.push(`- ${w.content}…（你的答案：${w.yourAnswer}）`);
    }
  } else {
    lines.push('- （无）');
  }

  lines.push('', '## 最近代码提交');
  if (report.recentSubmissions?.length) {
    for (const sub of report.recentSubmissions) {
      lines.push(
        `- ${sub.labName} · ${sub.language} · ${sub.isPassed ? '通过' : '未通过'} · ${sub.createdAt}`
      );
    }
  } else {
    lines.push('- （无）');
  }

  if (report.latestAssessment) {
    lines.push(
      '',
      '## 最近摸底',
      `- 理论 ${report.latestAssessment.theory} / 编码 ${report.latestAssessment.coding} / Rust ${report.latestAssessment.rust}`,
      `- 时间：${report.latestAssessment.assessedAt}`
    );
  }

  lines.push(
    '',
    '---',
    '由 OpenCamp AI 助教自动生成。练习与摸底可不依赖 LLM。'
  );
  return lines.join('\n');
}
