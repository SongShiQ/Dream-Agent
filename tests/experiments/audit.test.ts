import { describe, expect, it } from 'vitest';
import { auditExperimentTemplate, loadExperimentTemplate } from '@/lib/experiments';

describe('experiment publication audit', () => {
  it('accepts the draft for development but reports pending teacher review', async () => {
    const template = (await loadExperimentTemplate('vm-address-translation-v1'))!;
    const report = await auditExperimentTemplate(template);
    expect(report.passed).toBe(true);
    expect(report.hiddenCoverage).toEqual([
      'mapped',
      'not_present',
      'privilege_fault',
      'write_fault',
    ]);
    expect(report.issues).toContainEqual(
      expect.objectContaining({ code: 'pending_review', severity: 'warning' })
    );
  });

  it('blocks release while the template is draft and pending', async () => {
    const template = (await loadExperimentTemplate('vm-address-translation-v1'))!;
    const report = await auditExperimentTemplate(template, { release: true });
    expect(report.passed).toBe(false);
    expect(report.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['pending_review', 'not_published'])
    );
  });
});
