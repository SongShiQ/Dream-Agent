import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { addressTranslationTemplateSchema } from './schema';
import type { AddressTranslationTemplate } from './types';

const TEMPLATE_DIR = join(process.cwd(), 'data', 'experiments', 'templates');

export async function loadExperimentTemplate(id: string): Promise<AddressTranslationTemplate | null> {
  if (!/^[a-z0-9][a-z0-9-]{2,80}$/.test(id)) return null;
  try {
    const raw = await readFile(join(TEMPLATE_DIR, `${id}.json`), 'utf8');
    return addressTranslationTemplateSchema.parse(JSON.parse(raw)) as AddressTranslationTemplate;
  } catch {
    return null;
  }
}

export async function listExperimentTemplates(): Promise<AddressTranslationTemplate[]> {
  const files = (await readdir(TEMPLATE_DIR)).filter((file) => file.endsWith('.json'));
  return Promise.all(
    files.map(async (file) => {
      const raw = await readFile(join(TEMPLATE_DIR, file), 'utf8');
      try {
        return addressTranslationTemplateSchema.parse(JSON.parse(raw)) as AddressTranslationTemplate;
      } catch (error) {
        throw new Error(
          `Invalid experiment template ${file}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    })
  );
}
