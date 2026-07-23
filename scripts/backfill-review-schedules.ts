import prisma from '../lib/db/index';
import { applyReviewBackfill, buildReviewBackfillPlan } from '../lib/progress/review-backfill';

function value(args: string[], name: string) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

async function main() {
  const args = process.argv.slice(2);
  const cohortId = value(args, '--cohort');
  const apply = args.includes('--apply');
  const plan = await buildReviewBackfillPlan({ cohortId });
  console.log(
    JSON.stringify(
      {
        mode: apply ? 'apply' : 'dry-run',
        cohortId: cohortId || 'all',
        count: plan.length,
        items: plan.map((item) => ({
          studentId: item.studentId,
          targetType: item.targetType,
          targetId: item.targetId,
          evidenceType: item.evidenceType,
          evidenceId: item.evidenceId,
          passed: item.passed,
          evidenceAt: item.evidenceAt.toISOString(),
        })),
      },
      null,
      2
    )
  );
  if (!apply) {
    console.log('Dry run only. Add --apply after reviewing the plan.');
    return;
  }
  console.log(JSON.stringify(await applyReviewBackfill(plan)));
}

void main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
