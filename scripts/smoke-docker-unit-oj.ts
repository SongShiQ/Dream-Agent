import { spawnSync } from 'node:child_process';
import prisma from '../lib/db/index';
import { syncStudentGateProgress } from '../lib/labs';
import { queueJudgeJobForSubmission } from '../lib/judge/state';
import { runUnitJudgeInDocker } from '../lib/judge/docker-executor';
import { completeJudgeJobFromWorker } from '../lib/judge/worker';
import { UNIT_JUDGE_SANDBOX } from '../lib/judge/sandbox';

const GATE_SUBMISSIONS: { gateId: string; code: string }[] = [
  {
    gateId: 'env-setup',
    code: 'rustc --version\ncargo --version\ngit --version\n',
  },
  {
    gateId: 'rustlings-variables',
    code: 'pub fn main() { let mut x = 1; x += 1; assert_eq!(x, 2); }\n',
  },
  {
    gateId: 'rustlings-move',
    code: 'pub fn main() { let s = String::from("hello"); let r: &String = &s; assert_eq!(r.len(), 5); }\n',
  },
  {
    gateId: 'rust-result',
    code: 'pub fn parse_num(s: &str) -> Result<i32, String> { match s.parse::<i32>() { Ok(v) => Ok(v), Err(_) => Err("bad".to_string()) } }\npub fn main() { assert_eq!(parse_num("7").unwrap_or(0), 7); }\n',
  },
  {
    gateId: 'basic-syscall-model',
    code: 'enum Syscall { Write }\nfn dispatch(call: Syscall, user_arg: usize) -> usize { match call { Syscall::Write => kernel_write(user_arg) } }\nfn kernel_write(user_arg: usize) -> usize { user_arg }\npub fn main() { assert_eq!(dispatch(Syscall::Write, 1), 1); }\n',
  },
];

function runChecked(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'pipe',
  });
  if (result.status !== 0) {
    throw new Error(
      [
        `${command} ${args.join(' ')} failed with exit ${result.status}`,
        result.stdout ? `[stdout]\n${result.stdout}` : '',
        result.stderr ? `[stderr]\n${result.stderr}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    );
  }
  return result;
}

async function submitAndJudgeInDocker(studentId: string, gateId: string, code: string) {
  const progressBefore = await syncStudentGateProgress(studentId);
  const before = progressBefore.get(gateId)?.status;
  if (before === 'locked') {
    throw new Error(`Gate ${gateId} is locked before Docker smoke submission`);
  }

  const submission = await prisma.codeSubmission.create({
    data: {
      studentId,
      labName: gateId,
      gateId,
      code,
      language: 'rust',
      verdict: 'PENDING',
      judgeKind: 'unit_oj',
      judgeLog: 'docker smoke queued',
      isPassed: false,
      feedback: 'docker smoke queued',
    },
  });
  const job = await queueJudgeJobForSubmission({
    submissionId: submission.id,
    studentId,
    gateId,
    judgeKind: 'unit_oj',
  });
  const result = await runUnitJudgeInDocker({ gateId, code });
  const completed = await completeJudgeJobFromWorker({
    jobId: job.id,
    verdict: result.verdict,
    publicLog: result.publicLog,
  });
  if ('error' in completed) {
    throw new Error(completed.error);
  }
  if (result.verdict !== 'AC' || !completed.gatePassed) {
    throw new Error(`Gate ${gateId} expected Docker AC/pass, got ${result.verdict}`);
  }
  const progress = await prisma.labGateProgress.findUnique({
    where: { studentId_gateId: { studentId, gateId } },
  });
  if (progress?.status !== 'passed' || progress.bestVerdict !== 'AC') {
    throw new Error(`Gate ${gateId} progress not passed after Docker AC`);
  }
  console.log(`✓ ${gateId}: Docker AC → passed`);
}

async function main() {
  if (process.platform !== 'linux' && !process.argv.includes('--allow-non-linux')) {
    throw new Error(
      'Production Docker judge smoke must run on a Linux judge host. Pass --allow-non-linux only for local contract debugging; it does not count as M5 production validation.'
    );
  }

  runChecked('docker', ['version']);
  runChecked('docker', ['build', '-t', UNIT_JUDGE_SANDBOX.image, 'docker/unit-judge']);

  const student = await prisma.student.create({
    data: {
      name: `smoke-docker-unit-oj-${Date.now()}`,
      cohortId: `docker-smoke-${Date.now()}`,
      currentStage: 'basic_unit_oj',
    },
  });

  try {
    await syncStudentGateProgress(student.id);
    for (const item of GATE_SUBMISSIONS) {
      await submitAndJudgeInDocker(student.id, item.gateId, item.code);
    }
    const lab1 = await prisma.labGateProgress.findUnique({
      where: { studentId_gateId: { studentId: student.id, gateId: 'lab1-batch' } },
    });
    if (lab1?.status !== 'unlocked') {
      throw new Error(`lab1-batch should unlock after Docker unit gates, got ${lab1?.status}`);
    }
    console.log('✓ lab1-batch unlocked after five Docker unit gates');
    console.log('Docker unit OJ production smoke passed.');
  } finally {
    await prisma.student.delete({ where: { id: student.id } }).catch(() => undefined);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

