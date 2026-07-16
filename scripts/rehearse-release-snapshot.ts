import prisma from '../lib/db/index';
import { buildReleaseSnapshot, releaseSnapshotToMarkdown } from '../lib/ops/release';

const UNIT_GATE_IDS = [
  'env-setup',
  'rustlings-variables',
  'rustlings-move',
  'rust-result',
  'basic-syscall-model',
];

const cohortId = `rehearsal-30-${Date.now()}`;

async function cleanup() {
  await prisma.student.deleteMany({
    where: { cohortId },
  });
}

async function seedRehearsalCohort() {
  const students = await Promise.all(
    Array.from({ length: 30 }, (_, index) =>
      prisma.student.create({
        data: {
          name: `release-rehearsal-${index + 1}`,
          email: `release-rehearsal-${Date.now()}-${index + 1}@example.test`,
          cohortId,
          currentStage: index < 8 ? 'basic_unit_oj' : 'foundation',
          learningStatus: index < 4 ? 'project_candidate' : 'active',
          curriculumVersion: '2026-summer-os',
        },
      })
    )
  );

  await Promise.all(
    students.slice(0, 28).map((student) =>
      prisma.assessment.create({
        data: {
          studentId: student.id,
          theory: 82,
          coding: 78,
          rust: 80,
          weakPoints: '[]',
        },
      })
    )
  );

  await Promise.all(
    students.slice(0, 24).map((student, index) =>
      prisma.foundationQuizAttempt.create({
        data: {
          studentId: student.id,
          curriculumVersion: '2026-summer-os',
          unitId: index % 2 === 0 ? 'rust-basics' : 'os-overview',
          mode: 'high_stakes',
          status: index < 22 ? 'passed' : 'failed',
          questionIds: '[]',
          correct: index < 22 ? 5 : 3,
          total: 5,
          correctRate: index < 22 ? 100 : 60,
          requiredCorrectRate: 80,
          attemptDate: '2026-07-14',
          submittedAt: new Date(),
        },
      })
    )
  );

  await Promise.all(
    students.slice(0, 12).map((student, index) =>
      prisma.codeSubmission.create({
        data: {
          studentId: student.id,
          labName: 'env-setup',
          gateId: 'env-setup',
          code: 'release rehearsal submission',
          language: 'rust',
          testResult: 'release rehearsal',
          verdict: index < 10 ? 'AC' : 'WA',
          judgeKind: 'unit_oj',
          judgeLog: 'release rehearsal',
          isPassed: index < 10,
          feedback: 'release rehearsal',
        },
      })
    )
  );

  await Promise.all(
    students.slice(0, 8).flatMap((student) =>
      UNIT_GATE_IDS.map((gateId) =>
        prisma.labGateProgress.create({
          data: {
            studentId: student.id,
            gateId,
            status: 'passed',
            passedAt: new Date(),
            bestVerdict: 'AC',
          },
        })
      )
    )
  );
}

async function main() {
  await cleanup();
  await seedRehearsalCohort();

  const snapshot = await buildReleaseSnapshot({
    cohortId,
    target: 'foundation_200',
    dockerVerified: false,
  });

  if (snapshot.funnel.students !== 30) {
    throw new Error(`Expected 30 rehearsal students, got ${snapshot.funnel.students}`);
  }
  if (snapshot.funnel.diagnosticDone !== 28) {
    throw new Error(`Expected 28 diagnostic students, got ${snapshot.funnel.diagnosticDone}`);
  }
  if (snapshot.funnel.foundationStarted !== 24) {
    throw new Error(`Expected 24 foundation starters, got ${snapshot.funnel.foundationStarted}`);
  }
  if (snapshot.funnel.allUnitGatesPassed !== 8) {
    throw new Error(`Expected 8 all-gate passers, got ${snapshot.funnel.allUnitGatesPassed}`);
  }
  if (snapshot.decision.decision !== 'go') {
    throw new Error(`Expected rehearsal snapshot GO, got HOLD: ${snapshot.decision.blockers.join('; ')}`);
  }
  const dockerCheck = snapshot.decision.checks.find((check) => check.id === 'docker_verified');
  if (dockerCheck?.status !== 'warn') {
    throw new Error(`Expected Docker verification warning in local rehearsal, got ${dockerCheck?.status}`);
  }

  console.log(releaseSnapshotToMarkdown(snapshot));
  console.log('');
  console.log('Release snapshot rehearsal passed.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await cleanup();
    await prisma.$disconnect();
  });
