export type JudgeSandboxPolicy = {
  image: string;
  network: 'none';
  user: string;
  cpus: string;
  memory: string;
  pidsLimit: number;
  diskLimitMb: number;
  timeLimitMs: number;
  logLimitBytes: number;
  readOnlyRootfs: boolean;
  noNewPrivileges: boolean;
  capDropAll: boolean;
  tmpfs: string;
  workdir: string;
};

export type DockerRunMount = {
  source: string;
  target: string;
  readonly?: boolean;
};

export const UNIT_JUDGE_SANDBOX: JudgeSandboxPolicy = {
  image: 'opencamp/unit-judge-rust:2026-summer',
  network: 'none',
  user: '1000:1000',
  cpus: '1.0',
  memory: '512m',
  pidsLimit: 64,
  diskLimitMb: 64,
  timeLimitMs: 20_000,
  logLimitBytes: 32 * 1024,
  readOnlyRootfs: true,
  noNewPrivileges: true,
  capDropAll: true,
  tmpfs: '/tmp:rw,noexec,nosuid,size=64m',
  workdir: '/workspace',
};

export function buildDockerRunArgs(opts: {
  policy?: JudgeSandboxPolicy;
  mounts: DockerRunMount[];
  command: string[];
}) {
  const policy = opts.policy || UNIT_JUDGE_SANDBOX;
  const args = [
    'run',
    '--rm',
    '--pull',
    'never',
    '--network',
    policy.network,
    '--user',
    policy.user,
    '--cpus',
    policy.cpus,
    '--memory',
    policy.memory,
    '--memory-swap',
    policy.memory,
    '--pids-limit',
    String(policy.pidsLimit),
    '--workdir',
    policy.workdir,
    '--tmpfs',
    policy.tmpfs,
    '--label',
    'opencamp.judge=unit',
  ];

  if (policy.readOnlyRootfs) args.push('--read-only');
  if (policy.noNewPrivileges) args.push('--security-opt', 'no-new-privileges');
  if (policy.capDropAll) args.push('--cap-drop', 'ALL');

  for (const mount of opts.mounts) {
    args.push(
      '--mount',
      [
        'type=bind',
        `src=${mount.source}`,
        `dst=${mount.target}`,
        mount.readonly ? 'readonly' : '',
      ]
        .filter(Boolean)
        .join(',')
    );
  }

  args.push(policy.image, ...opts.command);
  return args;
}

export function summarizeSandboxPolicy(policy: JudgeSandboxPolicy = UNIT_JUDGE_SANDBOX) {
  return [
    `image=${policy.image}`,
    `network=${policy.network}`,
    `user=${policy.user}`,
    `cpus=${policy.cpus}`,
    `memory=${policy.memory}`,
    `pids=${policy.pidsLimit}`,
    `disk=${policy.diskLimitMb}MiB`,
    `timeout=${policy.timeLimitMs}ms`,
    `logLimit=${policy.logLimitBytes}B`,
    `readOnlyRootfs=${policy.readOnlyRootfs}`,
    `noNewPrivileges=${policy.noNewPrivileges}`,
    `capDropAll=${policy.capDropAll}`,
  ].join('; ');
}

export function classifySandboxExit(opts: {
  exitCode: number | null;
  timedOut: boolean;
  stderr: string;
}) {
  if (opts.timedOut) return { verdict: 'TLE' as const, reason: 'time limit exceeded' };
  if (opts.exitCode === 0) return { verdict: 'AC' as const, reason: 'tests passed' };
  const stderr = opts.stderr.toLowerCase();
  if (stderr.includes('memory') || stderr.includes('oom')) {
    return { verdict: 'RE' as const, reason: 'memory/runtime limit exceeded' };
  }
  if (stderr.includes('compile') || stderr.includes('error:')) {
    return { verdict: 'CE' as const, reason: 'compile error' };
  }
  return { verdict: 'WA' as const, reason: 'tests failed' };
}
