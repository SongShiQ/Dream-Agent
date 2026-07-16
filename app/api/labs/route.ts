// 实验关卡 API — 定义 + 进度（OJ：passed 仅 AC）

import { NextResponse } from 'next/server';
import {
  buildGatesDashboard,
  getGateDef,
  listGateDefs,
  syncStudentGateProgress,
} from '@/lib/labs';
import prisma from '@/lib/db/index';
import { authError, getCurrentStudent } from '@/lib/auth/session';

/** GET — 当前学员关卡列表 + 进度；?gateId= 单关 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedStudentId = searchParams.get('studentId');
    const gateId = searchParams.get('gateId');
    const { student } = await getCurrentStudent(req, requestedStudentId);

    if (!student) {
      return authError();
    }
    const studentId = student.id;

    if (gateId) {
      const def = await getGateDef(gateId);
      if (!def) {
        return NextResponse.json({ error: 'Unknown gate' }, { status: 404 });
      }
      const dash = await buildGatesDashboard(studentId);
      const row = dash.gates.find((g) => g.id === gateId);
      const recent = await prisma.codeSubmission.findMany({
        where: { studentId, OR: [{ gateId }, { labName: gateId }] },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          gateId: true,
          labName: true,
          verdict: true,
          isPassed: true,
          judgeKind: true,
          feedback: true,
          testResult: true,
          judgeLog: true,
          createdAt: true,
        },
      });
      return NextResponse.json({ gate: row, recentSubmissions: recent, policy: dash.policy });
    }

    const dashboard = await buildGatesDashboard(studentId);
    return NextResponse.json(dashboard);
  } catch (error) {
    console.error('Labs GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * POST — 仅同步解锁状态 / 查询
 * 禁止客户端直接 mark passed
 */
export async function POST(req: Request) {
  try {
    let body: { studentId?: string; action?: string };
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

    if (body.action === 'sync') {
      await syncStudentGateProgress(studentId);
      const dashboard = await buildGatesDashboard(studentId);
      return NextResponse.json(dashboard);
    }

    if (body.action === 'defs') {
      const gates = await listGateDefs();
      return NextResponse.json({ gates });
    }

    return NextResponse.json(
      {
        error:
          '不支持的 action。关卡过关只能通过评测 AC（提交代码后 verdict=AC），禁止客户端自报 passed。',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('Labs POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
