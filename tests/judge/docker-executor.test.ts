import { describe, expect, it } from 'vitest';
import { tmpdir } from 'node:os';
import {
  buildUnitDockerExecutionPlan,
  truncateOutput,
} from '@/lib/judge/docker-executor';

describe('docker unit judge executor', () => {
  it('builds an auditable docker execution plan', () => {
    const plan = buildUnitDockerExecutionPlan({
      gateId: 'rust-result',
      workspaceDir: `${tmpdir()}/opencamp-test`,
    });

    expect(plan.dockerCommand).toBe('docker');
    expect(plan.dockerArgs).toContain('unit-judge');
    expect(plan.dockerArgs).toContain('--gate');
    expect(plan.dockerArgs).toContain('rust-result');
    expect(plan.dockerArgs).toContain('--submission');
    expect(plan.dockerArgs).toContain('/workspace/submission.rs');
    expect(plan.dockerArgs).toContain('--spec');
    expect(plan.dockerArgs).toContain('/workspace/judge-spec.json');
    expect(plan.dockerArgs.join(' ')).toContain('unit-judge --gate rust-result');
    expect(plan.policySummary).toContain('network=none');
  });

  it('truncates output by byte budget', () => {
    expect(truncateOutput('abcdef', 4)).toBe('abcd\n...[truncated]');
    expect(truncateOutput('abc', 4)).toBe('abc');
  });
});
