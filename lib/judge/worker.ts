import { NextResponse } from 'next/server';
import prisma from '@/lib/db/index';
import { finalizeJudgeJob, isFinalJudgeVerdict } from '@/lib/judge/state';
import type { JudgeVerdict } from '@/lib/labs';

const DEFAULT_DEV_TOKEN = 'dev-judge-token';

export function workerAuthError(req: Request) {
  const expected = process.env.JUDGE_WORKER_TOKEN || DEFAULT_DEV_TOKEN;
  const actual = req.headers.get('x-judge-token') || '';
  if (actual !== expected) {
    return NextResponse.json({ error: 'Unauthorized judge worker' }, { status: 401 });
  }
  return null;
}

export async function leaseNextJudgeJob({
  workerId,
  leaseMs = 60_000,
}: {
  workerId: string;
  leaseMs?: number;
}) {
  const now = new Date();
  const job = await prisma.judgeJob.findFirst({
    where: {
      OR: [
        { status: 'queued' },
        { status: 'running', leaseUntil: { lt: now } },
      ],
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    include: { submission: true },
  });
  if (!job) return null;

  const leaseUntil = new Date(Date.now() + leaseMs);
  const claimed = await prisma.judgeJob.updateMany({
    where: {
      id: job.id,
      OR: [
        { status: 'queued' },
        { status: 'running', leaseUntil: { lt: now } },
      ],
    },
    data: {
      status: 'running',
      leaseOwner: workerId,
      leaseUntil,
    },
  });
  if (claimed.count !== 1) return null;

  return prisma.judgeJob.findUniqueOrThrow({
    where: { id: job.id },
    include: { submission: true },
  });
}

export async function completeJudgeJobFromWorker(opts: {
  jobId: string;
  verdict: string;
  publicLog: string;
  rawLog?: string;
  exitCode?: number;
  timeMs?: number;
  memoryKb?: number;
}) {
  const verdict = opts.verdict as JudgeVerdict;
  if (!isFinalJudgeVerdict(verdict)) {
    return { error: `INVALID_FINAL_VERDICT:${opts.verdict}` as const };
  }

  return finalizeJudgeJob({
    jobId: opts.jobId,
    verdict,
    publicLog: opts.publicLog,
    rawLog: opts.rawLog,
    exitCode: opts.exitCode,
    timeMs: opts.timeMs,
    memoryKb: opts.memoryKb,
  });
}
