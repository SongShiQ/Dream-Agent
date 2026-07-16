import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import prisma from '../lib/db/index';
import { buildReleaseSnapshot, releaseSnapshotToMarkdown, type ReleaseStage } from '../lib/ops/release';

type Args = {
  cohortId: string;
  target: ReleaseStage;
  dockerVerified: boolean;
  outDir: string;
  dryRun: boolean;
  allowSmall: boolean;
};

function readArg(name: string) {
  const prefix = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  return value?.slice(prefix.length);
}

function hasFlag(name: string) {
  return process.argv.includes(`--${name}`);
}

function parseTarget(value: string | undefined): ReleaseStage {
  if (value === 'pilot_30' || value === 'foundation_200' || value === 'onboarding_2000') {
    return value;
  }
  return 'foundation_200';
}

function parseArgs(): Args {
  return {
    cohortId: readArg('cohortId') || '2026-summer-os-main',
    target: parseTarget(readArg('target')),
    dockerVerified: hasFlag('docker-verified'),
    outDir: readArg('outDir') || 'docs/operations/release-reviews',
    dryRun: hasFlag('dry-run'),
    allowSmall: hasFlag('allow-small'),
  };
}

function slug(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'cohort';
}

function formatDateForFile(date: Date) {
  return date.toISOString().slice(0, 10);
}

function appendReviewNotes(markdown: string, opts: { dryRun: boolean }) {
  return [
    markdown,
    '',
    '## 人工复核记录',
    '',
    '- 教学负责人：',
    '- 运营负责人：',
    '- 技术负责人：',
    '- 是否放量：',
    '- warn 项解释：',
    '- 下周动作：',
    '',
    opts.dryRun
      ? '> dry-run 输出：未写入归档文件。'
      : '> 归档后请在本节补充人工复核结论；GO 不是自动放量授权。',
  ].join('\n');
}

async function main() {
  const args = parseArgs();
  const snapshot = await buildReleaseSnapshot({
    cohortId: args.cohortId,
    target: args.target,
    dockerVerified: args.dockerVerified,
  });

  if (!args.allowSmall && snapshot.funnel.students < 30) {
    throw new Error(
      `Cohort ${args.cohortId} only has ${snapshot.funnel.students} students. Use --allow-small for local checks; real M5 archive needs at least 30 pilot students.`
    );
  }

  const generatedDate = formatDateForFile(new Date(snapshot.generatedAt));
  const baseName = `${generatedDate}-${slug(args.cohortId)}-${snapshot.target}`;
  const markdown = appendReviewNotes(releaseSnapshotToMarkdown(snapshot), { dryRun: args.dryRun });
  const json = JSON.stringify(snapshot, null, 2);

  if (args.dryRun) {
    console.log(markdown);
    console.log('');
    console.log(`Dry run complete. Would write: ${join(args.outDir, `${baseName}.md`)}`);
    console.log(`Dry run complete. Would write: ${join(args.outDir, `${baseName}.json`)}`);
    return;
  }

  await mkdir(args.outDir, { recursive: true });
  const mdPath = join(args.outDir, `${baseName}.md`);
  const jsonPath = join(args.outDir, `${baseName}.json`);
  await writeFile(mdPath, markdown, 'utf8');
  await writeFile(jsonPath, `${json}\n`, 'utf8');
  console.log(`Archived release review markdown: ${mdPath}`);
  console.log(`Archived release review json: ${jsonPath}`);
  console.log(`Decision: ${snapshot.decision.decision.toUpperCase()}`);
  if (snapshot.decision.blockers.length > 0) {
    console.log(`Blockers: ${snapshot.decision.blockers.join('; ')}`);
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

