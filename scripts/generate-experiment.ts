import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  generateAddressTranslationVariant,
  loadExperimentTemplate,
} from '../lib/experiments';

function value(args: string[], name: string) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

async function main() {
  const args = process.argv.slice(2);
  const templateId = value(args, '--template');
  const learnerKey = value(args, '--learner');
  const sequence = Number(value(args, '--sequence') || '0');
  const output = value(args, '--out');
  const teacher = args.includes('--teacher');
  const apply = args.includes('--apply');
  if (!templateId || !learnerKey || !Number.isInteger(sequence) || sequence < 0) {
    console.error(
      'Usage: npm run experiment:generate -- --template <id> --learner <stable-key> [--sequence N] [--teacher] [--out file --apply]'
    );
    process.exitCode = 2;
    return;
  }
  const template = await loadExperimentTemplate(templateId);
  if (!template) throw new Error(`Unknown or invalid template: ${templateId}`);
  const variant = generateAddressTranslationVariant(template, learnerKey, sequence, teacher);
  const serialized = `${JSON.stringify(variant, null, 2)}\n`;
  console.log(serialized.trimEnd());
  if (apply) {
    if (!output) throw new Error('--apply requires --out');
    const path = resolve(output);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, serialized, 'utf8');
    console.log(`Wrote ${path}`);
  } else if (output) {
    console.log('Dry run only. Add --apply to write --out.');
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
