import prisma from '@/lib/db/index';
import { markGatePassedOnAc } from '@/lib/labs';
import type { JudgeVerdict } from '@/lib/labs';

const PASSING_VERDICTS = new Set<JudgeVerdict>(['AC']);
const FINAL_VERDICTS = new Set<JudgeVerdict>(['AC', 'WA', 'CE', 'RE', 'TLE', 'SE']);

export function verdictCanPassGate(verdict: JudgeVerdict): boolean {
  return PASSING_VERDICTS.has(verdict);
}

export function isFinalJudgeVerdict(verdict: JudgeVerdict): boolean {
  return FINAL_VERDICTS.has(verdict);
}

export function truncateJudgeLog(log: string, max = 32 * 1024): string {
  if (log.length <= max) return log;
  return `${log.slice(0, max)}\n...[truncated]`;
}

export function planJudgeJobAfterRun(opts: {
  verdict: JudgeVerdict;
  attemptsBefore: number;
  maxAttempts: number;
}) {
  const attemptsAfter = opts.attemptsBefore + 1;
  const shouldRetry = opts.verdict === 'SE' && attemptsAfter < opts.maxAttempts;
  return {
    attemptsAfter,
    shouldRetry,
    jobStatus: shouldRetry ? 'queued' : 'completed',
    submissionVerdict: shouldRetry ? 'PENDING' : opts.verdict,
    submissionPassed: shouldRetry ? false : verdictCanPassGate(opts.verdict),
    runStatus: opts.verdict === 'SE' ? 'system_error' : 'completed',
  };
}

export async function queueJudgeJobForSubmission(opts: {
  submissionId: string;
  studentId: string;
  gateId: string;
  judgeKind: 'unit_oj' | 'integration_oj';
}) {
  return prisma.judgeJob.create({
    data: {
      submissionId: opts.submissionId,
      studentId: opts.studentId,
      gateId: opts.gateId,
      judgeKind: opts.judgeKind,
      status: 'queued',
    },
  });
}

export async function finalizeJudgeJob(opts: {
  jobId: string;
  verdict: JudgeVerdict;
  publicLog: string;
  rawLog?: string;
  exitCode?: number;
  timeMs?: number;
  memoryKb?: number;
}) {
  if (!isFinalJudgeVerdict(opts.verdict)) {
    throw new Error(`Cannot finalize judge job with non-final verdict: ${opts.verdict}`);
  }

  const job = await prisma.judgeJob.findUnique({
    where: { id: opts.jobId },
    include: { submission: true },
  });
  if (!job) {
    throw new Error('JudgeJob not found');
  }
  if (job.status === 'completed') {
    return { job, gatePassed: job.submission.isPassed };
  }

  const isPassed = verdictCanPassGate(opts.verdict);
  const publicLog = truncateJudgeLog(opts.publicLog);
  const rawLog = truncateJudgeLog(opts.rawLog || opts.publicLog);
  const plan = planJudgeJobAfterRun({
    verdict: opts.verdict,
    attemptsBefore: job.attempts,
    maxAttempts: job.maxAttempts,
  });

  const [, updatedJob] = await prisma.$transaction([
    prisma.judgeRun.create({
      data: {
        jobId: job.id,
        submissionId: job.submissionId,
        verdict: opts.verdict,
        status: plan.runStatus,
        publicLog,
        rawLog,
        exitCode: opts.exitCode,
        timeMs: opts.timeMs,
        memoryKb: opts.memoryKb,
      },
    }),
    prisma.judgeJob.update({
      where: { id: job.id },
      data: {
        status: plan.jobStatus,
        attempts: { increment: 1 },
        leaseOwner: null,
        leaseUntil: null,
      },
    }),
    prisma.codeSubmission.update({
      where: { id: job.submissionId },
      data: {
        verdict: plan.submissionVerdict,
        judgeLog: publicLog,
        testResult: publicLog,
        isPassed: plan.submissionPassed,
        feedback: plan.shouldRetry
          ? `OJ 系统错误，已自动重新入队（${plan.attemptsAfter}/${job.maxAttempts}）。`
          : isPassed
          ? 'OJ 判题通过：verdict=AC，已形成过关证据。'
          : `OJ 判题未通过：verdict=${opts.verdict}。`,
      },
    }),
  ]);

  if (plan.shouldRetry) {
    return { job: updatedJob, gatePassed: false };
  }

  const gatePassed = await markGatePassedOnAc({
    studentId: job.studentId,
    gateId: job.gateId,
    submitId: job.submissionId,
    verdict: opts.verdict,
  });

  return { job: updatedJob, gatePassed };
}
