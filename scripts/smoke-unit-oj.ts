import prisma from '../lib/db/index';
import { syncStudentGateProgress } from '../lib/labs';
import { queueJudgeJobForSubmission } from '../lib/judge/state';
import { runUnitJudge } from '../lib/judge/unit-runner';
import { completeJudgeJobFromWorker } from '../lib/judge/worker';

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

async function submitAndJudge(studentId: string, gateId: string, code: string) {
  const mapBefore = await syncStudentGateProgress(studentId);
  const before = mapBefore.get(gateId)?.status;
  if (before === 'locked') {
    throw new Error(`Gate ${gateId} is locked before smoke submission`);
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
      judgeLog: 'smoke test queued',
      isPassed: false,
      feedback: 'smoke test queued',
    },
  });
  const job = await queueJudgeJobForSubmission({
    submissionId: submission.id,
    studentId,
    gateId,
    judgeKind: 'unit_oj',
  });
  const result = await runUnitJudge(gateId, code);
  const completed = await completeJudgeJobFromWorker({
    jobId: job.id,
    verdict: result.verdict,
    publicLog: result.publicLog,
  });
  if ('error' in completed) {
    throw new Error(completed.error);
  }
  if (result.verdict !== 'AC' || !completed.gatePassed) {
    throw new Error(`Gate ${gateId} expected AC/pass, got ${result.verdict}`);
  }
  const row = await prisma.labGateProgress.findUnique({
    where: { studentId_gateId: { studentId, gateId } },
  });
  if (row?.status !== 'passed') {
    throw new Error(`Gate ${gateId} progress not passed after AC`);
  }
  console.log(`✓ ${gateId}: AC → passed`);
}

async function main() {
  const student = await prisma.student.create({
    data: {
      name: `smoke-unit-oj-${Date.now()}`,
    },
  });

  try {
    await syncStudentGateProgress(student.id);
    for (const item of GATE_SUBMISSIONS) {
      await submitAndJudge(student.id, item.gateId, item.code);
    }

    const lab1 = await prisma.labGateProgress.findUnique({
      where: { studentId_gateId: { studentId: student.id, gateId: 'lab1-batch' } },
    });
    if (lab1?.status !== 'unlocked') {
      throw new Error(`lab1-batch should be unlocked after five unit gates, got ${lab1?.status}`);
    }

    console.log('✓ lab1-batch unlocked after five unit gates');
    console.log('Smoke unit OJ e2e passed.');
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
