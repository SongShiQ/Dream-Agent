import { NextResponse } from 'next/server';
import { leaseNextJudgeJob, workerAuthError, completeJudgeJobFromWorker } from '@/lib/judge/worker';

export async function GET(req: Request) {
  const auth = workerAuthError(req);
  if (auth) return auth;

  try {
    const { searchParams } = new URL(req.url);
    const workerId = searchParams.get('workerId') || 'worker-dev';
    const job = await leaseNextJudgeJob({ workerId });
    if (!job) return NextResponse.json({ job: null });

    return NextResponse.json({
      job: {
        id: job.id,
        submissionId: job.submissionId,
        gateId: job.gateId,
        judgeKind: job.judgeKind,
        language: job.submission.language,
        code: job.submission.code,
        leaseUntil: job.leaseUntil,
      },
    });
  } catch (error) {
    console.error('Judge jobs GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = workerAuthError(req);
  if (auth) return auth;

  try {
    const body = (await req.json()) as {
      jobId?: string;
      verdict?: string;
      publicLog?: string;
      rawLog?: string;
      exitCode?: number;
      timeMs?: number;
      memoryKb?: number;
    };
    if (!body.jobId || !body.verdict) {
      return NextResponse.json({ error: 'jobId and verdict required' }, { status: 400 });
    }

    const result = await completeJudgeJobFromWorker({
      jobId: body.jobId,
      verdict: body.verdict,
      publicLog: body.publicLog || '',
      rawLog: body.rawLog,
      exitCode: body.exitCode,
      timeMs: body.timeMs,
      memoryKb: body.memoryKb,
    });

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      job: {
        id: result.job.id,
        status: result.job.status,
      },
      gatePassed: result.gatePassed,
    });
  } catch (error) {
    console.error('Judge jobs POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
