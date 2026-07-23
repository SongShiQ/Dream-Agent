import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { auditExperimentTemplate } from './audit';
import { listExperimentTemplates } from './registry';

export async function buildExperimentReviewQueue() {
  const templates = await listExperimentTemplates();
  const items = await Promise.all(
    templates.map(async (template) => {
      const source = `data/experiments/templates/${template.id}.json`;
      const raw = await readFile(join(process.cwd(), source), 'utf8');
      const audit = await auditExperimentTemplate(template);
      return {
        id: template.id,
        title: template.title,
        source,
        contentHash: createHash('sha256').update(raw).digest('hex'),
        courseVersion: template.courseVersion,
        publicationStatus: template.publicationStatus,
        reviewStatus: template.reviewStatus,
        reviewedBy: template.reviewedBy,
        reviewedAt: template.reviewedAt,
        sourceRefs: template.sourceRefs,
        gateIds: template.gateIds,
        conceptTags: template.conceptTags,
        issues: audit.issues,
        reviewReady: !audit.issues.some((issue) => issue.severity === 'error'),
        publishReady:
          template.reviewStatus === 'reviewed' &&
          !audit.issues.some((issue) => issue.severity === 'error'),
      };
    })
  );
  const issues = items.flatMap((item) => item.issues);
  return {
    generatedAt: new Date().toISOString(),
    summary: {
      total: items.length,
      published: items.filter((item) => item.publicationStatus === 'published').length,
      draft: items.filter((item) => item.publicationStatus === 'draft').length,
      reviewed: items.filter((item) => item.reviewStatus === 'reviewed').length,
      pending: items.filter((item) => item.reviewStatus === 'pending').length,
      errors: issues.filter((issue) => issue.severity === 'error').length,
      warnings: issues.filter((issue) => issue.severity === 'warning').length,
    },
    items,
  };
}
