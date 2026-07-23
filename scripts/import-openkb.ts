import { applyOpenKBImport, buildOpenKBImportPlan } from '../lib/knowledge/openkb-import';

function value(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

async function main() {
  const args = process.argv.slice(2);
  const wikiDir = value(args, '--wiki');
  const manifestPath = value(args, '--manifest');
  const outputDir = value(args, '--out') || 'data/knowledge';
  const apply = args.includes('--apply');
  const publish = args.includes('--publish');
  const replace = args.includes('--replace');

  if (!wikiDir || !manifestPath || (publish && !apply)) {
    console.error(
      'Usage: npm run content:openkb -- --wiki <wiki-dir> --manifest <manifest.json> [--out <dir>] [--apply] [--replace] [--publish]'
    );
    process.exitCode = 2;
    return;
  }

  try {
    const plan = await buildOpenKBImportPlan({ wikiDir, manifestPath, outputDir, publish });
    console.log(
      JSON.stringify(
        {
          mode: apply ? (publish ? 'publish' : 'apply-draft') : 'dry-run',
          entries: plan.entries.map((entry) => ({
            pagePath: entry.pagePath,
            id: entry.id,
            title: entry.title,
            publicationStatus: entry.publicationStatus,
            reviewStatus: entry.reviewStatus,
            sourceRefs: entry.sourceRefs,
          })),
          issues: plan.issues,
        },
        null,
        2
      )
    );
    if (plan.issues.length) {
      process.exitCode = 1;
      return;
    }
    if (apply) {
      await applyOpenKBImport(plan, { outputDir, replace });
      console.log(`Applied ${plan.entries.length} OpenKB card(s) to ${outputDir}`);
    } else {
      console.log('Dry run only. Add --apply to write cards and index.json.');
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

void main();
