import { describe, expect, it } from 'vitest';
import {
  evaluateUnitSubmission,
  loadUnitJudgeSpec,
  type UnitJudgeSpec,
} from '@/lib/judge/unit-runner';

const spec: UnitJudgeSpec = {
  gateId: 'rustlings-variables',
  title: 'Variables',
  publicDescription: 'test',
  rules: [
    { id: 'mut', description: 'use mut', requiredIncludes: ['let mut'] },
    { id: 'assert', description: 'use assert', requiredAnyIncludes: ['assert_eq!', 'assert!'] },
  ],
  forbiddenIncludes: ['todo!()'],
};

describe('evaluateUnitSubmission', () => {
  it('returns AC when public rules pass', () => {
    const result = evaluateUnitSubmission(spec, 'fn main() { let mut x = 1; x += 1; assert_eq!(x, 2); }');
    expect(result.verdict).toBe('AC');
  });

  it('returns WA for missing rule', () => {
    const result = evaluateUnitSubmission(spec, 'fn main() { let x = 1; assert_eq!(x, 1); }');
    expect(result.verdict).toBe('WA');
    expect(result.publicLog).toContain('use mut');
  });

  it('returns CE for obviously incomplete braces', () => {
    const result = evaluateUnitSubmission(spec, 'fn main() { let mut x = 1;');
    expect(result.verdict).toBe('CE');
  });
});

describe('unit judge specs', () => {
  it('loads all five M4 basic unit gate specs', async () => {
    await expect(loadUnitJudgeSpec('env-setup')).resolves.toMatchObject({ gateId: 'env-setup' });
    await expect(loadUnitJudgeSpec('rustlings-variables')).resolves.toMatchObject({
      gateId: 'rustlings-variables',
    });
    await expect(loadUnitJudgeSpec('rustlings-move')).resolves.toMatchObject({
      gateId: 'rustlings-move',
    });
    await expect(loadUnitJudgeSpec('rust-result')).resolves.toMatchObject({
      gateId: 'rust-result',
    });
    await expect(loadUnitJudgeSpec('basic-syscall-model')).resolves.toMatchObject({
      gateId: 'basic-syscall-model',
    });
  });

  it('provides executable harnesses for Rust code unit gates', async () => {
    await expect(loadUnitJudgeSpec('rustlings-variables')).resolves.toMatchObject({
      harness: { mode: 'rust_single_file' },
    });
    await expect(loadUnitJudgeSpec('rustlings-move')).resolves.toMatchObject({
      harness: { mode: 'rust_single_file' },
    });
    await expect(loadUnitJudgeSpec('rust-result')).resolves.toMatchObject({
      harness: { mode: 'rust_single_file' },
    });
    await expect(loadUnitJudgeSpec('basic-syscall-model')).resolves.toMatchObject({
      harness: { mode: 'rust_single_file' },
    });
  });
});
