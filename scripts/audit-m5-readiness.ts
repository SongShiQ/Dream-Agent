import { access, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import prisma from '../lib/db/index';
import { buildReleaseSnapshot } from '../lib/ops/release';

type Check = {
  id: string;
  label: string;
  status: 'pass' | 'fail' | 'warn';
  evidence: string;
  nextAction?: string;
};

type Args = {
  cohortId: string;
  requireArchive: boolean;
  dockerVerified: boolean;
};

function readArg(name: string) {
  const prefix = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  return value?.slice(prefix.length);
}

function hasFlag(name: string) {
  return process.argv.includes(`--${name}`);
}

function parseArgs(): Args {
  return {
    cohortId: readArg('cohortId') || '2026-summer-os-main',
    requireArchive: hasFlag('require-archive'),
    dockerVerified: hasFlag('docker-verified'),
  };
}

async function exists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function readPackageScripts() {
  const raw = await readFile('package.json', 'utf8');
  const pkg = JSON.parse(raw) as { scripts?: Record<string, string> };
  return pkg.scripts || {};
}

async function findReleaseArchives(cohortId: string) {
  const dir = 'docs/operations/release-reviews';
  if (!(await exists(dir))) return [];
  const files = await readdir(dir);
  return files.filter((file) => file.includes(cohortId) && (file.endsWith('.md') || file.endsWith('.json')));
}

function summarize(checks: Check[]) {
  return {
    pass: checks.filter((check) => check.status === 'pass').length,
    warn: checks.filter((check) => check.status === 'warn').length,
    fail: checks.filter((check) => check.status === 'fail').length,
  };
}

async function main() {
  const args = parseArgs();
  const scripts = await readPackageScripts();
  const snapshot = await buildReleaseSnapshot({
    cohortId: args.cohortId,
    target: 'foundation_200',
    dockerVerified: args.dockerVerified,
  });
  const archives = await findReleaseArchives(args.cohortId);
  const rehearsalLeftovers = await prisma.student.count({
    where: { cohortId: { startsWith: 'rehearsal-30-' } },
  });

  const requiredFiles = [
    'docs/operations/2026-07-14-m5-grey-release-runbook.md',
    'docs/operations/2026-07-14-m5-release-acceptance-checklist.md',
    'docs/operations/2026-07-14-m5-weekly-funnel-review-template.md',
    'docs/operations/2026-07-14-m5-external-validation-handoff.md',
    'docs/operations/2026-07-14-m5-evidence-index.md',
    'scripts/rehearse-release-snapshot.ts',
    'scripts/archive-release-snapshot.ts',
    'scripts/audit-m5-readiness.ts',
    'scripts/smoke-docker-unit-oj.ts',
  ];
  const fileChecks = await Promise.all(
    requiredFiles.map(async (file): Promise<Check> => {
      const fileExists = await exists(file);
      return {
        id: `file:${file}`,
        label: `存在 ${file}`,
        status: fileExists ? 'pass' : 'fail',
        evidence: file,
        nextAction: fileExists ? undefined : `补齐 ${file}`,
      };
    })
  );

  const commandChecks: Check[] = [
    'judge:smoke',
    'judge:docker-smoke',
    'ops:m5-readiness',
    'ops:release-rehearsal',
    'ops:release-archive',
  ].map((script) => ({
    id: `script:${script}`,
    label: `npm script ${script}`,
    status: scripts[script] ? 'pass' : 'fail',
    evidence: scripts[script] || 'missing',
    nextAction: scripts[script] ? undefined : `在 package.json scripts 中加入 ${script}`,
  }));

  const snapshotChecks: Check[] = [
    {
      id: 'cohort_size',
      label: '真实内测 cohort 至少 30 人',
      status: snapshot.funnel.students >= 30 ? 'pass' : 'fail',
      evidence: `${args.cohortId}: ${snapshot.funnel.students} 人`,
      nextAction:
        snapshot.funnel.students >= 30 ? undefined : '真实 30 人内测完成后再运行 ops:release-archive',
    },
    {
      id: 'release_snapshot_decision',
      label: 'foundation_200 快照无 hard blocker',
      status: snapshot.decision.decision === 'go' ? 'pass' : 'fail',
      evidence:
        snapshot.decision.decision === 'go'
          ? 'decision=GO'
          : `decision=HOLD; ${snapshot.decision.blockers.join('; ')}`,
      nextAction:
        snapshot.decision.decision === 'go' ? undefined : '处理快照阻塞项或记录负责人签字豁免',
    },
    {
      id: 'docker_host_verified',
      label: 'Linux Docker judge host 已实机验收',
      status: args.dockerVerified ? 'pass' : 'fail',
      evidence: args.dockerVerified
        ? '调用方声明已通过 npm run judge:docker-smoke'
        : '未传入 --docker-verified',
      nextAction: args.dockerVerified ? undefined : '在 Linux judge host 上运行 npm run judge:docker-smoke',
    },
    {
      id: 'release_archive_exists',
      label: '真实 cohort 放量快照已归档',
      status: archives.length > 0 ? 'pass' : args.requireArchive ? 'fail' : 'warn',
      evidence: archives.length > 0 ? archives.join(', ') : 'docs/operations/release-reviews/ 下未找到匹配归档',
      nextAction:
        archives.length > 0
          ? undefined
          : `运行 npm run ops:release-archive -- --cohortId=${args.cohortId} --target=foundation_200`,
    },
    {
      id: 'rehearsal_cleanup',
      label: '无 rehearsal 临时学员残留',
      status: rehearsalLeftovers === 0 ? 'pass' : 'fail',
      evidence: `${rehearsalLeftovers} 个 rehearsal-30-* 学员`,
      nextAction: rehearsalLeftovers === 0 ? undefined : '检查演练脚本 cleanup 或手动清理 rehearsal cohort',
    },
  ];

  const checks = [...fileChecks, ...commandChecks, ...snapshotChecks];
  const totals = summarize(checks);
  const hardFails = checks.filter((check) => check.status === 'fail');

  console.log(`# M5 readiness audit`);
  console.log('');
  console.log(`cohortId: ${args.cohortId}`);
  console.log(`summary: pass=${totals.pass} warn=${totals.warn} fail=${totals.fail}`);
  console.log(`decision: ${hardFails.length === 0 ? 'READY_FOR_M6_PLANNING' : 'NOT_READY'}`);
  console.log('');
  console.log('| 检查 | 状态 | 证据 | 下一步 |');
  console.log('|---|---|---|---|');
  for (const check of checks) {
    console.log(`| ${check.label} | ${check.status} | ${check.evidence} | ${check.nextAction || ''} |`);
  }

  if (hardFails.length > 0) {
    process.exitCode = 1;
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
