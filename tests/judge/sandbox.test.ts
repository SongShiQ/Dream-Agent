import { describe, expect, it } from 'vitest';
import {
  UNIT_JUDGE_SANDBOX,
  buildDockerRunArgs,
  classifySandboxExit,
  summarizeSandboxPolicy,
} from '@/lib/judge/sandbox';

describe('judge sandbox policy', () => {
  it('builds docker args with resource and isolation limits', () => {
    const args = buildDockerRunArgs({
      mounts: [{ source: '/tmp/submission', target: '/workspace', readonly: true }],
      command: ['cargo', 'test', '--quiet'],
    });

    expect(args).toContain('--network');
    expect(args).toContain('none');
    expect(args).toContain('--read-only');
    expect(args).toContain('--security-opt');
    expect(args).toContain('no-new-privileges');
    expect(args).toContain('--cap-drop');
    expect(args).toContain('ALL');
    expect(args).toContain('--pids-limit');
    expect(args).toContain(String(UNIT_JUDGE_SANDBOX.pidsLimit));
    expect(args).toContain('--memory');
    expect(args).toContain(UNIT_JUDGE_SANDBOX.memory);
    expect(args).toContain('--tmpfs');
    expect(args).toContain(UNIT_JUDGE_SANDBOX.tmpfs);
    expect(args).toContain('--pull');
    expect(args).toContain('never');
  });

  it('summarizes the policy for audit logs', () => {
    const summary = summarizeSandboxPolicy();
    expect(summary).toContain('network=none');
    expect(summary).toContain('readOnlyRootfs=true');
    expect(summary).toContain('capDropAll=true');
  });

  it('classifies sandbox exits into judge verdicts', () => {
    expect(classifySandboxExit({ exitCode: 0, timedOut: false, stderr: '' }).verdict).toBe('AC');
    expect(classifySandboxExit({ exitCode: 1, timedOut: true, stderr: '' }).verdict).toBe('TLE');
    expect(
      classifySandboxExit({ exitCode: 1, timedOut: false, stderr: 'error: expected ;' }).verdict
    ).toBe('CE');
    expect(classifySandboxExit({ exitCode: 1, timedOut: false, stderr: 'test failed' }).verdict).toBe(
      'WA'
    );
  });
});
