// 提交 API — 代码提交 + 静态分析反馈（无 Docker）

import { NextResponse } from 'next/server';
import prisma from '@/lib/db/index';
import { quickAnalyze, fullAnalyze, assessSubstance } from '@/lib/analysis';

const LAB_HINTS: Record<string, string> = {
  'lab1-batch': '批处理：关注 trap 入口、系统调用返回与用户程序加载。',
  'lab2-address': '地址空间：页表、权限位、用户/内核地址隔离。',
  'lab3-process': '进程：fork/wait/exit、PCB、调度切换。',
  'lab4-filesystem': '文件：inode、目录项、读写路径。',
  'lab5-concurrency': '并发：锁粒度、临界区、死锁避免。',
  'env-setup': '环境：工具链与构建脚本是否可重复。',
  'lab-compose': '组件化：模块边界与接口清晰度。',
  'project-final': '项目：完整性、文档与可演示路径。',
};

function buildFeedback(
  report: Awaited<ReturnType<typeof quickAnalyze>>,
  labName: string,
  isPassed?: boolean
): string {
  const lines: string[] = [];
  lines.push(`【静态分析总分】${report.overallScore}/100`);
  lines.push('（规则启发式评分，≠ OJ/QEMU 判题；空代码/占位不会得高分）');
  lines.push('');
  lines.push(report.summary);
  if (LAB_HINTS[labName]) {
    lines.push('');
    lines.push(`【实验提示】${LAB_HINTS[labName]}`);
  }
  // 始终展示有问题的维度；低分维度即使无 issue 也展示
  for (const r of report.results) {
    if (r.issues.length === 0 && r.score >= 80) continue;
    lines.push('');
    lines.push(`## ${r.dimension}（${r.score}）`);
    lines.push(r.summary);
    for (const issue of r.issues.slice(0, 8)) {
      const loc = issue.line ? `L${issue.line}: ` : '';
      lines.push(`- [${issue.severity}] ${loc}${issue.message}`);
    }
    for (const s of r.suggestions.slice(0, 4)) {
      lines.push(`  → ${s}`);
    }
  }
  if (isPassed === false) {
    lines.push('');
    lines.push(
      '【自报】未勾选本地测试通过：请先在本地跑通，再对照静态建议；静态高分不能代替测试。'
    );
  } else if (isPassed === true) {
    lines.push('');
    lines.push(
      '【自报】你勾选了本地测试已通过（系统未实际执行测试）。可继续打磨或进入下一 lab。'
    );
  }
  return lines.join('\n');
}

export async function POST(req: Request) {
  try {
    let body: {
      studentId?: string;
      labName?: string;
      code?: string;
      language?: string;
      testResult?: string;
      isPassed?: boolean;
      full?: boolean;
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: '请求体无效' }, { status: 400 });
    }

    const { studentId, labName, code, language, testResult, isPassed, full } = body;

    if (!studentId || !labName || code === undefined || code === null) {
      return NextResponse.json(
        { error: 'studentId, labName, and code are required' },
        { status: 400 }
      );
    }

    const codeStr = String(code);
    if (codeStr.trim().length < 8) {
      return NextResponse.json(
        { error: '代码过短或为空，请粘贴实验相关源码后再提交' },
        { status: 400 }
      );
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const lang = (language || 'rust').toLowerCase();
    const substance = assessSubstance(codeStr, lang);
    // 空/纯注释：拒绝入库，避免误导「已提交成功且满分」
    if (substance.level === 'empty' || substance.level === 'comments_only') {
      return NextResponse.json(
        {
          error: substance.issues[0]?.message || '代码无实质内容',
          substance: {
            level: substance.level,
            effectiveLines: substance.effectiveLines,
            scoreCap: substance.scoreCap,
          },
        },
        { status: 400 }
      );
    }

    const analyzeOpts = {
      testResult: testResult || undefined,
      claimedPassed: typeof isPassed === 'boolean' ? isPassed : undefined,
    };
    const report = full
      ? await fullAnalyze(codeStr, lang, analyzeOpts)
      : await quickAnalyze(codeStr, lang, analyzeOpts);

    const feedback = buildFeedback(report, labName, isPassed);

    const submission = await prisma.codeSubmission.create({
      data: {
        studentId,
        labName,
        code: codeStr,
        language: lang,
        testResult: testResult || '',
        isPassed: !!isPassed,
        feedback,
      },
    });

    return NextResponse.json({
      submission: {
        id: submission.id,
        labName: submission.labName,
        language: submission.language,
        isPassed: submission.isPassed,
        feedback: submission.feedback,
        createdAt: submission.createdAt,
      },
      analysis: {
        overallScore: report.overallScore,
        summary: report.summary,
        substanceLevel: substance.level,
        scoreCap: substance.scoreCap,
        effectiveLines: substance.effectiveLines,
        dimensions: report.results.map((r) => ({
          dimension: r.dimension,
          score: r.score,
          issueCount: r.issues.length,
        })),
      },
      message:
        substance.level === 'stub' || substance.level === 'thin'
          ? `已保存（${substance.level === 'stub' ? '占位/过短' : '内容偏少'}，静态分已封顶 ${report.overallScore}）`
          : isPassed
            ? '已保存（自报测试通过 + 静态分析）'
            : '已保存，并生成静态分析反馈',
    });
  } catch (error) {
    console.error('Submit API error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    const labName = searchParams.get('labName');

    if (!studentId) {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 });
    }

    const where: { studentId: string; labName?: string } = { studentId };
    if (labName) where.labName = labName;

    const submissions = await prisma.codeSubmission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        labName: true,
        language: true,
        isPassed: true,
        feedback: true,
        testResult: true,
        createdAt: true,
        // 列表不返回完整 code，减小体积
      },
    });

    return NextResponse.json({ submissions });
  } catch (error) {
    console.error('Get submissions error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
