#!/usr/bin/env node
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join } from 'node:path';

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function includesAny(source, needles = []) {
  const lower = source.toLowerCase();
  return needles.some((needle) => lower.includes(String(needle).toLowerCase()));
}

function includesAll(source, needles = []) {
  const lower = source.toLowerCase();
  return needles.every((needle) => lower.includes(String(needle).toLowerCase()));
}

function checkPublicRules(spec, submission) {
  const failed = [];
  const forbidden = (spec.forbiddenIncludes || []).filter((needle) =>
    submission.toLowerCase().includes(String(needle).toLowerCase())
  );
  if (forbidden.length > 0) {
    failed.push(`forbidden: ${forbidden.join(', ')}`);
  }
  for (const rule of spec.rules || []) {
    if (rule.requiredIncludes && !includesAll(submission, rule.requiredIncludes)) {
      failed.push(rule.description);
    }
    if (rule.requiredAnyIncludes && !includesAny(submission, rule.requiredAnyIncludes)) {
      failed.push(rule.description);
    }
  }
  return failed;
}

function run(command, args, cwd) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('close', (code) => resolve({ code, stdout, stderr }));
    child.on('error', (error) => resolve({ code: 127, stdout, stderr: String(error) }));
  });
}

const gate = arg('--gate');
const submissionPath = arg('--submission');
const specPath = arg('--spec');

if (!gate || !submissionPath || !specPath) {
  console.error('missing required args: --gate --submission --spec');
  process.exit(2);
}

const submission = await readFile(submissionPath, 'utf8');
const spec = JSON.parse(await readFile(specPath, 'utf8'));

if (spec.gateId !== gate) {
  console.error(`spec gate mismatch: expected ${gate}, got ${spec.gateId}`);
  process.exit(2);
}

const failedRules = checkPublicRules(spec, submission);
if (failedRules.length > 0) {
  console.error(`public rules failed:\n${failedRules.map((item) => `- ${item}`).join('\n')}`);
  process.exit(1);
}

if (!spec.harness || spec.harness.mode !== 'rust_single_file') {
  console.log('public rules passed; no executable harness configured');
  process.exit(0);
}

const projectDir = '/tmp/opencamp-unit-crate';
await mkdir(join(projectDir, 'src'), { recursive: true });
await writeFile(
  join(projectDir, 'Cargo.toml'),
  '[package]\nname = "opencamp_unit_judge"\nversion = "0.1.0"\nedition = "2021"\n\n[lib]\npath = "src/lib.rs"\n',
  'utf8'
);
const libRs = spec.harness.template
  .replace('{{submission}}', submission)
  .replace('{{tests}}', spec.harness.tests || '');
await writeFile(join(projectDir, 'src', 'lib.rs'), libRs, 'utf8');

const result = await run('cargo', ['test', '--quiet', '--offline'], projectDir);
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
process.exit(result.code ?? 1);
