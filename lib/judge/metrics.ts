import prisma from '@/lib/db/index';

export type JudgeJobMetricRow = {
  status: string;
  attempts: number;
  maxAttempts: number;
  leaseUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type JudgeRunMetricRow = {
  verdict: string;
  status: string;
  timeMs: number | null;
  memoryKb: number | null;
  startedAt: Date;
  finishedAt: Date;
};

function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
}

function inc(map: Record<string, number>, key: string) {
  map[key] = (map[key] || 0) + 1;
}

export function computeJudgeMetrics(opts: {
  jobs: JudgeJobMetricRow[];
  runs: JudgeRunMetricRow[];
  now?: Date;
}) {
  const now = opts.now || new Date();
  const jobsByStatus: Record<string, number> = {};
  const runsByVerdict: Record<string, number> = {};
  const runsByStatus: Record<string, number> = {};
  let expiredLeases = 0;
  let retryingSystemErrors = 0;

  for (const job of opts.jobs) {
    inc(jobsByStatus, job.status);
    if (job.status === 'running' && job.leaseUntil && job.leaseUntil < now) {
      expiredLeases++;
    }
    if (job.status === 'queued' && job.attempts > 0 && job.attempts < job.maxAttempts) {
      retryingSystemErrors++;
    }
  }

  const queueAgesMs = opts.jobs
    .filter((job) => job.status === 'queued')
    .map((job) => Math.max(0, now.getTime() - job.createdAt.getTime()));
  const runTimes = opts.runs
    .map((run) => run.timeMs)
    .filter((value): value is number => typeof value === 'number' && value >= 0);
  const memoryKbs = opts.runs
    .map((run) => run.memoryKb)
    .filter((value): value is number => typeof value === 'number' && value >= 0);

  for (const run of opts.runs) {
    inc(runsByVerdict, run.verdict);
    inc(runsByStatus, run.status);
  }

  return {
    generatedAt: now.toISOString(),
    jobs: {
      total: opts.jobs.length,
      byStatus: jobsByStatus,
      expiredLeases,
      retryingSystemErrors,
      queuedAgeMs: {
        p50: percentile(queueAgesMs, 50),
        p95: percentile(queueAgesMs, 95),
      },
    },
    runs: {
      total: opts.runs.length,
      byVerdict: runsByVerdict,
      byStatus: runsByStatus,
      timeMs: {
        p50: percentile(runTimes, 50),
        p95: percentile(runTimes, 95),
      },
      memoryKb: {
        p50: percentile(memoryKbs, 50),
        p95: percentile(memoryKbs, 95),
      },
    },
  };
}

export async function buildJudgeMetrics() {
  const jobs = await prisma.judgeJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 1000,
    select: {
      status: true,
      attempts: true,
      maxAttempts: true,
      leaseUntil: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  const runs = await prisma.judgeRun.findMany({
    orderBy: { finishedAt: 'desc' },
    take: 1000,
    select: {
      verdict: true,
      status: true,
      timeMs: true,
      memoryKb: true,
      startedAt: true,
      finishedAt: true,
    },
  });

  return computeJudgeMetrics({ jobs, runs });
}
