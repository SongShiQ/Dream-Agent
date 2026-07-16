import { leaseNextJudgeJob, completeJudgeJobFromWorker } from '../lib/judge/worker';
import { runUnitJudge } from '../lib/judge/unit-runner';
import { summarizeSandboxPolicy } from '../lib/judge/sandbox';
import { runUnitJudgeInDocker } from '../lib/judge/docker-executor';

async function main() {
  const workerId = process.env.JUDGE_WORKER_ID || `unit-worker-${process.pid}`;
  const executionMode = process.env.JUDGE_EXECUTION_MODE || 'local-rules';
  const once = process.argv.includes('--once');
  let processed = 0;

  console.log(`Unit judge worker ${workerId} mode=${executionMode}`);
  if (executionMode === 'docker') {
    console.log(`Sandbox policy: ${summarizeSandboxPolicy()}`);
  }

  do {
    const job = await leaseNextJudgeJob({ workerId, leaseMs: 120_000 });
    if (!job) {
      if (once) {
        console.log('No queued judge job.');
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
      continue;
    }

    if (job.judgeKind !== 'unit_oj') {
      await completeJudgeJobFromWorker({
        jobId: job.id,
        verdict: 'SE',
        publicLog: `SE: unit worker cannot handle judgeKind=${job.judgeKind}`,
      });
      processed++;
      continue;
    }

    const result =
      executionMode === 'docker'
        ? await runUnitJudgeInDocker({ gateId: job.gateId, code: job.submission.code })
        : await runUnitJudge(job.gateId, job.submission.code);
    const policyNote =
      executionMode === 'docker'
        ? `\n\n[sandbox]\n${summarizeSandboxPolicy()}`
        : '\n\n[sandbox]\nlocal-rules runner；Docker 沙箱配置已固化，启用需设置 JUDGE_EXECUTION_MODE=docker。';
    const completed = await completeJudgeJobFromWorker({
      jobId: job.id,
      verdict: result.verdict,
      publicLog: `${result.publicLog}${policyNote}`,
    });

    if ('error' in completed) {
      throw new Error(completed.error);
    }
    console.log(
      `Completed job=${job.id} gate=${job.gateId} verdict=${result.verdict} gatePassed=${completed.gatePassed}`
    );
    processed++;
  } while (!once);

  console.log(`Processed ${processed} job(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
