import { buildContentReleaseCheck } from '../lib/content/release-check';
import prisma from '../lib/db/index';

async function main() {
  const mode = process.argv.includes('--release') ? 'release' : 'development';
  const result = await buildContentReleaseCheck({ mode });
  console.log(JSON.stringify(result, null, 2));
  if (result.decision === 'fail') process.exitCode = 1;
}

void main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
