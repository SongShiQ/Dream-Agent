import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { JudgeVerdict } from '@/lib/labs';
import {
  UNIT_JUDGE_SANDBOX,
  buildDockerRunArgs,
  classifySandboxExit,
  summarizeSandboxPolicy,
  type JudgeSandboxPolicy,
} from '@/lib/judge/sandbox';
import { loadUnitJudgeSpec, type UnitJudgeResult } from '@/lib/judge/unit-runner';

type SpawnLike = (
  command: string,
  args: string[]
) => ChildProcessWithoutNullStreams;

export type DockerExecutionPlan = {
  workspaceDir: string;
  submissionPath: string;
  specPath: string;
  dockerCommand: string;
  dockerArgs: string[];
  policySummary: string;
};

export function truncateOutput(output: string, limit = UNIT_JUDGE_SANDBOX.logLimitBytes) {
  if (Buffer.byteLength(output, 'utf8') <= limit) return output;
  const buf = Buffer.from(output, 'utf8');
  return `${buf.subarray(0, limit).toString('utf8')}\n...[truncated]`;
}

export function buildUnitDockerExecutionPlan(opts: {
  gateId: string;
  workspaceDir: string;
  policy?: JudgeSandboxPolicy;
}): DockerExecutionPlan {
  const policy = opts.policy || UNIT_JUDGE_SANDBOX;
  const submissionPath = join(opts.workspaceDir, 'submission.rs');
  const specPath = join(opts.workspaceDir, 'judge-spec.json');
  const dockerArgs = buildDockerRunArgs({
    policy,
    mounts: [{ source: opts.workspaceDir, target: policy.workdir }],
    command: [
      'unit-judge',
      '--gate',
      opts.gateId,
      '--submission',
      `${policy.workdir}/submission.rs`,
      '--spec',
      `${policy.workdir}/judge-spec.json`,
    ],
  });

  return {
    workspaceDir: opts.workspaceDir,
    submissionPath,
    specPath,
    dockerCommand: 'docker',
    dockerArgs,
    policySummary: summarizeSandboxPolicy(policy),
  };
}

function collectProcessOutput(
  child: ChildProcessWithoutNullStreams,
  timeoutMs: number,
  logLimitBytes: number
): Promise<{ exitCode: number | null; timedOut: boolean; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    let settled = false;
    const timer = setTimeout(() => {
      settled = true;
      child.kill('SIGKILL');
      resolve({
        exitCode: null,
        timedOut: true,
        stdout: truncateOutput(stdout, logLimitBytes),
        stderr: truncateOutput(stderr, logLimitBytes),
      });
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout = truncateOutput(stdout + String(chunk), logLimitBytes);
    });
    child.stderr.on('data', (chunk) => {
      stderr = truncateOutput(stderr + String(chunk), logLimitBytes);
    });
    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        exitCode: code,
        timedOut: false,
        stdout: truncateOutput(stdout, logLimitBytes),
        stderr: truncateOutput(stderr, logLimitBytes),
      });
    });
  });
}

export async function runUnitJudgeInDocker(opts: {
  gateId: string;
  code: string;
  policy?: JudgeSandboxPolicy;
  spawnImpl?: SpawnLike;
}): Promise<UnitJudgeResult> {
  const spec = await loadUnitJudgeSpec(opts.gateId);
  if (!spec) {
    return { verdict: 'SE', publicLog: `SE: 未找到 unit judge 题包：${opts.gateId}` };
  }

  const policy = opts.policy || UNIT_JUDGE_SANDBOX;
  const workspaceDir = await mkdtemp(join(tmpdir(), 'opencamp-unit-judge-'));
  const plan = buildUnitDockerExecutionPlan({ gateId: opts.gateId, workspaceDir, policy });

  try {
    await writeFile(plan.submissionPath, opts.code, 'utf8');
    await writeFile(plan.specPath, JSON.stringify(spec, null, 2), 'utf8');

    const spawnImpl = opts.spawnImpl || spawn;
    const child = spawnImpl(plan.dockerCommand, plan.dockerArgs);
    const result = await collectProcessOutput(child, policy.timeLimitMs, policy.logLimitBytes);
    const classified = classifySandboxExit({
      exitCode: result.exitCode,
      timedOut: result.timedOut,
      stderr: result.stderr,
    });
    const verdict = classified.verdict as JudgeVerdict;
    const publicLog = [
      `[docker_unit_oj] ${spec.title}`,
      `verdict=${verdict}; reason=${classified.reason}`,
      '',
      '[stdout]',
      result.stdout || '(empty)',
      '',
      '[stderr]',
      result.stderr || '(empty)',
      '',
      '[sandbox]',
      plan.policySummary,
    ].join('\n');

    return { verdict, publicLog };
  } catch (error) {
    return {
      verdict: 'SE',
      publicLog: [
        `SE: Docker unit judge 执行失败：${error instanceof Error ? error.message : String(error)}`,
        '',
        '[sandbox]',
        plan.policySummary,
      ].join('\n'),
    };
  } finally {
    await rm(workspaceDir, { recursive: true, force: true });
  }
}
