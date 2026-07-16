// 提交 API — OJ 纪律：isPassed 仅 verdict=AC
// M4：unit_oj 进入 JudgeJob 队列；integration/manual 仍不自动过关

import { NextResponse } from "next/server";
import prisma from "@/lib/db/index";
import { quickAnalyze, fullAnalyze, assessSubstance } from "@/lib/analysis";
import { getGateDef, syncStudentGateProgress } from "@/lib/labs";
import type { JudgeVerdict } from "@/lib/labs";
import { authError, getCurrentStudent } from "@/lib/auth/session";
import { queueJudgeJobForSubmission } from "@/lib/judge/state";

const LAB_HINTS: Record<string, string> = {
  "lab1-batch": "批处理：关注 trap 入口、系统调用返回与用户程序加载。",
  "lab2-address": "地址空间：页表、权限位、用户/内核地址隔离。",
  "lab3-process": "进程：fork/wait/exit、PCB、调度切换。",
  "lab4-filesystem": "文件：inode、目录项、读写路径。",
  "lab5-concurrency": "并发：锁粒度、临界区、死锁避免。",
  "env-setup": "环境：工具链与构建脚本是否可重复。",
  "lab-compose": "组件化：模块边界与接口清晰度。",
  "project-final": "项目：完整性、文档与可演示路径。",
  "rustlings-variables": "Rust 变量与 mut；以 cargo test 为准（Phase B 真跑测）。",
  "rustlings-move": "所有权与 move；以 cargo test 为准（Phase B 真跑测）。",
};

function buildFeedback(
  report: Awaited<ReturnType<typeof quickAnalyze>>,
  gateId: string,
  verdict: JudgeVerdict,
  editorMode?: string
): string {
  const lines: string[] = [];
  lines.push("【评测结论】" + verdict);
  if (verdict === "STATIC") {
    lines.push("（当前为静态分析，≠ OJ 过关。关卡 passed 仅当未来真跑测返回 AC。）");
  }
  lines.push("");
  lines.push("【静态分析总分】" + report.overallScore + "/100");
  lines.push(report.summary);
  const hint = LAB_HINTS[gateId];
  if (hint) {
    lines.push("");
    lines.push("【关卡提示】" + hint);
  }
  if (editorMode === "ide_first") {
    lines.push("");
    lines.push(
      "【IDE 优先】请在 VS Code 完成本关实现，使用 CLI：dream-agent submit --lab " +
        gateId +
        " -f <文件>"
    );
  }
  for (const r of report.results) {
    if (r.issues.length === 0 && r.score >= 80) continue;
    lines.push("");
    lines.push("## " + r.dimension + "（" + r.score + "）");
    lines.push(r.summary);
    for (const issue of r.issues.slice(0, 8)) {
      const loc = issue.line ? "L" + issue.line + ": " : "";
      lines.push("- [" + issue.severity + "] " + loc + issue.message);
    }
    for (const s of r.suggestions.slice(0, 4)) {
      lines.push("  → " + s);
    }
  }
  lines.push("");
  lines.push("【OJ 纪律】客户端自报通过不会写入过关。过关条件：评测机 verdict=AC。");
  return lines.join("\n");
}

function publicSubmission(s: {
  id: string;
  labName: string;
  gateId: string;
  language: string;
  isPassed: boolean;
  verdict: string;
  judgeKind: string;
  feedback: string;
  createdAt: Date;
}) {
  return {
    id: s.id,
    labName: s.labName,
    gateId: s.gateId,
    language: s.language,
    isPassed: s.isPassed,
    verdict: s.verdict,
    judgeKind: s.judgeKind,
    feedback: s.feedback,
    createdAt: s.createdAt,
  };
}

export async function POST(req: Request) {
  try {
    let body: {
      studentId?: string;
      labName?: string;
      gateId?: string;
      code?: string;
      language?: string;
      testResult?: string;
      isPassed?: boolean;
      full?: boolean;
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "请求体无效" }, { status: 400 });
    }

    const { code, language, testResult, full } = body;
    const gateId = (body.gateId || body.labName || "").trim();
    const { student } = await getCurrentStudent(req, body.studentId);

    if (!student) {
      return authError();
    }
    const studentId = student.id;

    if (!gateId || code === undefined || code === null) {
      return NextResponse.json(
        { error: "gateId(or labName), and code are required" },
        { status: 400 }
      );
    }

    const codeStr = String(code);
    if (codeStr.trim().length < 8) {
      return NextResponse.json(
        { error: "代码过短或为空，请提交有效源码" },
        { status: 400 }
      );
    }

    const gate = await getGateDef(gateId);
    const judgeKind = gate?.judgeKind || "none";
    const editorMode = gate?.editorMode;

    if (judgeKind === "manual_teacher") {
      const submission = await prisma.codeSubmission.create({
        data: {
          studentId,
          labName: gateId,
          gateId,
          code: codeStr,
          language: (language || "rust").toLowerCase(),
          testResult: testResult || "",
          verdict: "PENDING",
          judgeKind,
          judgeLog: "等待老师评分，助教不自动判定 AC",
          isPassed: false,
          feedback: "项目类关卡由老师评分，提交已归档。",
        },
      });
      return NextResponse.json({
        submission: publicSubmission(submission),
        message: "已归档，等待老师评分（不会自动过关）",
        oj: { verdict: "PENDING", canPassGate: false },
      });
    }

    const lang = (language || "rust").toLowerCase();
    const substance = assessSubstance(codeStr, lang);
    if (substance.level === "empty" || substance.level === "comments_only") {
      return NextResponse.json(
        {
          error: substance.issues[0]?.message || "代码无实质内容",
          substance: {
            level: substance.level,
            effectiveLines: substance.effectiveLines,
            scoreCap: substance.scoreCap,
          },
        },
        { status: 400 }
      );
    }

    if (judgeKind === "unit_oj") {
      const progressMap = await syncStudentGateProgress(studentId);
      const progress = progressMap.get(gateId);
      if (progress?.status === "locked") {
        return NextResponse.json(
          {
            error: "关卡尚未解锁，请先完成前置 gate",
            gateId,
            status: progress.status,
          },
          { status: 423 }
        );
      }

      const submission = await prisma.codeSubmission.create({
        data: {
          studentId,
          labName: gateId,
          gateId,
          code: codeStr,
          language: lang,
          testResult: "",
          verdict: "PENDING",
          judgeKind,
          judgeLog: "已进入 unit OJ 队列，等待 worker 判题",
          isPassed: false,
          feedback: "已进入 unit OJ 队列；只有 worker 返回 verdict=AC 才会标记关卡 passed。",
        },
      });
      const job = await queueJudgeJobForSubmission({
        submissionId: submission.id,
        studentId,
        gateId,
        judgeKind: "unit_oj",
      });

      return NextResponse.json({
        submission: publicSubmission(submission),
        judgeJob: {
          id: job.id,
          status: job.status,
          gateId: job.gateId,
          judgeKind: job.judgeKind,
        },
        oj: {
          verdict: "PENDING",
          judgeKind,
          gateId,
          gatePassed: false,
          note: "unit OJ 已入队；最终是否过关只看 worker verdict=AC。",
        },
        message: "已提交到 unit OJ 队列，等待判题。",
      });
    }

    const analyzeOpts = { testResult: testResult || undefined, claimedPassed: false };
    const report = full
      ? await fullAnalyze(codeStr, lang, analyzeOpts)
      : await quickAnalyze(codeStr, lang, analyzeOpts);

    const verdict: JudgeVerdict = "STATIC";
    const feedback = buildFeedback(report, gateId, verdict, editorMode);

    const submission = await prisma.codeSubmission.create({
      data: {
        studentId,
        labName: gateId,
        gateId,
        code: codeStr,
        language: lang,
        testResult: testResult || "",
        verdict,
        judgeKind,
        judgeLog: "static overall=" + report.overallScore + "; substance=" + substance.level,
        isPassed: false,
        feedback,
      },
    });

    const gatePassed = false;

    return NextResponse.json({
      submission: publicSubmission(submission),
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
      oj: {
        verdict,
        judgeKind,
        gateId,
        gatePassed,
        note: "Phase A：仅静态分析。真 OJ 见计划 Phase B/C；当前提交不会将关卡标为 passed。",
      },
      message: "已保存静态分析反馈。OJ 纪律：未 AC 不算过关。",
    });
  } catch (error) {
    console.error("Submit API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedStudentId = searchParams.get("studentId");
    const labName = searchParams.get("labName");
    const gateId = searchParams.get("gateId");
    const { student } = await getCurrentStudent(req, requestedStudentId);
    if (!student) {
      return authError();
    }
    const studentId = student.id;
    const where: { studentId: string; labName?: string; gateId?: string } = { studentId };
    if (gateId) where.gateId = gateId;
    else if (labName) where.labName = labName;
    const submissions = await prisma.codeSubmission.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        labName: true,
        gateId: true,
        language: true,
        isPassed: true,
        verdict: true,
        judgeKind: true,
        feedback: true,
        testResult: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ submissions });
  } catch (error) {
    console.error("Get submissions error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
