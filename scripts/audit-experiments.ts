import { auditExperimentTemplate, listExperimentTemplates } from '../lib/experiments';

async function main() {
  const release = process.argv.includes('--release');
  const templates = await listExperimentTemplates();
  if (!templates.length) throw new Error('No experiment templates found');
  const reports = await Promise.all(
    templates.map((template) => auditExperimentTemplate(template, { release }))
  );
  console.log(JSON.stringify({ release, templates: reports }, null, 2));
  if (reports.some((report) => !report.passed)) process.exitCode = 1;
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
