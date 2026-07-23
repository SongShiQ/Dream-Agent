import prisma from '../lib/db/index';
import { applyContentReviewDecisions } from '../lib/content/review-decisions';

function arg(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const decisionId = arg('--decision');
  const result = await applyContentReviewDecisions(prisma, {
    apply,
    decisionId,
  });
  console.log(JSON.stringify(result, null, 2));
  if (
    (decisionId && result.count === 0) ||
    result.results.some((item) =>
      ['error', 'renderer_mismatch', 'stale', 'audit_blocked'].includes(String(item.outcome))
    )
  ) {
    process.exitCode = 1;
  }
}

void main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
