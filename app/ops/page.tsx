'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Metrics = {
  generatedAt: string;
  jobs: {
    total: number;
    byStatus: Record<string, number>;
    expiredLeases: number;
    retryingSystemErrors: number;
    queuedAgeMs: { p50: number | null; p95: number | null };
  };
  runs: {
    total: number;
    byVerdict: Record<string, number>;
    byStatus: Record<string, number>;
    timeMs: { p50: number | null; p95: number | null };
    memoryKb: { p50: number | null; p95: number | null };
  };
};

type RiskItem = {
  id: string;
  kind: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  evidence: string;
  nextAction: string;
  studentId?: string;
  studentName?: string;
  cohortId?: string;
  resolution?: {
    status: string;
    note: string;
    handledBy: string;
    updatedAt: string;
  };
};

type RiskQueue = {
  generatedAt: string;
  filters?: {
    severity?: string;
    status?: string;
    cohortId?: string;
  };
  total: number;
  bySeverity: { high: number; medium: number; low: number };
  items: RiskItem[];
};

type ReleaseSnapshot = {
  generatedAt: string;
  target: string;
  funnel: {
    cohortId: string;
    students: number;
    diagnosticDone: number;
    foundationStarted: number;
    foundationPassedStudents: number;
    unitOjStarted: number;
    allUnitGatesPassed: number;
    projectCandidates: number;
  };
  decision: {
    decision: 'go' | 'hold';
    blockers: string[];
    checks: Array<{
      id: string;
      label: string;
      status: 'pass' | 'fail' | 'warn';
      evidence: string;
    }>;
  };
};

function fmtMs(value: number | null) {
  if (value == null) return '—';
  if (value >= 60_000) return `${Math.round(value / 60_000)}m`;
  return `${Math.round(value / 1000)}s`;
}

function severityClass(severity: RiskItem['severity']) {
  if (severity === 'high') return 'bg-red-100 text-red-800 border-red-200';
  if (severity === 'medium') return 'bg-amber-100 text-amber-800 border-amber-200';
  return 'bg-muted text-muted-foreground border-border';
}

export default function OpsPage() {
  const [token, setToken] = useState('');
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [riskQueue, setRiskQueue] = useState<RiskQueue | null>(null);
  const [releaseSnapshot, setReleaseSnapshot] = useState<ReleaseSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [updatingRiskId, setUpdatingRiskId] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('open');
  const [cohortFilter, setCohortFilter] = useState('');
  const [releaseTarget, setReleaseTarget] = useState('foundation_200');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = { 'x-judge-token': token };
      const riskParams = new URLSearchParams({
        severity: severityFilter,
        status: statusFilter,
      });
      if (cohortFilter.trim()) riskParams.set('cohortId', cohortFilter.trim());
      const releaseParams = new URLSearchParams({
        target: releaseTarget,
      });
      if (cohortFilter.trim()) releaseParams.set('cohortId', cohortFilter.trim());
      const [healthRes, riskRes, releaseRes] = await Promise.all([
        fetch('/api/judge/health', { headers }),
        fetch(`/api/ops/risk?${riskParams}`, { headers }),
        fetch(`/api/ops/release?${releaseParams}`, { headers }),
      ]);
      const health = await healthRes.json();
      const risk = await riskRes.json();
      const release = await releaseRes.json();
      if (!healthRes.ok) throw new Error(health.error || 'judge health 加载失败');
      if (!riskRes.ok) throw new Error(risk.error || 'risk queue 加载失败');
      if (!releaseRes.ok) throw new Error(release.error || 'release snapshot 加载失败');
      setMetrics(health.metrics);
      setRiskQueue(risk.riskQueue);
      setReleaseSnapshot(release.snapshot);
      sessionStorage.setItem('opencamp_ops_token', token);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const exportRisks = async (format: 'json' | 'csv') => {
    const params = new URLSearchParams({
      severity: severityFilter,
      status: statusFilter,
      format,
    });
    if (cohortFilter.trim()) params.set('cohortId', cohortFilter.trim());
    const res = await fetch(`/api/ops/risk?${params}`, {
      headers: { 'x-judge-token': token },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || '导出失败');
      return;
    }
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = `opencamp-risk-queue.${format}`;
    link.click();
    URL.revokeObjectURL(href);
  };

  const exportReleaseSnapshot = async (format: 'json' | 'md') => {
    const params = new URLSearchParams({
      target: releaseTarget,
      format,
    });
    if (cohortFilter.trim()) params.set('cohortId', cohortFilter.trim());
    const res = await fetch(`/api/ops/release?${params}`, {
      headers: { 'x-judge-token': token },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || '导出灰度快照失败');
      return;
    }
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = `opencamp-release-snapshot.${format}`;
    link.click();
    URL.revokeObjectURL(href);
  };

  const useSavedToken = () => {
    const saved = sessionStorage.getItem('opencamp_ops_token') || '';
    setToken(saved);
  };

  const updateRisk = async (
    riskId: string,
    status: 'open' | 'acknowledged' | 'resolved' | 'ignored'
  ) => {
    setUpdatingRiskId(riskId);
    setError(null);
    try {
      const res = await fetch('/api/ops/risk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-judge-token': token,
        },
        body: JSON.stringify({
          riskId,
          status,
          handledBy: 'ops-dashboard',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '更新风险状态失败');
      setRiskQueue(data.riskQueue);
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新风险状态失败');
    } finally {
      setUpdatingRiskId(null);
    }
  };

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">OpenCamp 运营面板</h1>
          <p className="text-sm text-muted-foreground mt-1">
            灰度期间用于查看 Judge 队列、SE 重试、风险学员与人工介入建议。
          </p>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">访问 token</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <input
              className="min-w-[18rem] flex-1 rounded border bg-background px-3 py-2 text-sm"
              placeholder="输入 x-judge-token"
              value={token}
              onChange={(event) => setToken(event.target.value)}
            />
            <Button onClick={() => void load()} disabled={loading || !token.trim()}>
              {loading ? '加载中…' : '刷新'}
            </Button>
            <Button variant="outline" onClick={useSavedToken}>
              使用已保存 token
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">风险筛选与导出</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 md:grid-cols-[1fr_1fr_1.5fr_auto_auto]">
            <select
              className="rounded border bg-background px-3 py-2 text-sm"
              value={severityFilter}
              onChange={(event) => setSeverityFilter(event.target.value)}
            >
              <option value="all">全部级别</option>
              <option value="high">high</option>
              <option value="medium">medium</option>
              <option value="low">low</option>
            </select>
            <select
              className="rounded border bg-background px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">全部状态</option>
              <option value="open">open</option>
              <option value="acknowledged">acknowledged</option>
              <option value="resolved">resolved</option>
              <option value="ignored">ignored</option>
            </select>
            <input
              className="rounded border bg-background px-3 py-2 text-sm"
              placeholder="cohortId，例如 2026-summer-os-main"
              value={cohortFilter}
              onChange={(event) => setCohortFilter(event.target.value)}
            />
            <Button variant="outline" onClick={() => void exportRisks('json')} disabled={!token.trim()}>
              导出 JSON
            </Button>
            <Button variant="outline" onClick={() => void exportRisks('csv')} disabled={!token.trim()}>
              导出 CSV
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">灰度验收快照</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 md:grid-cols-[1fr_auto_auto]">
            <select
              className="rounded border bg-background px-3 py-2 text-sm"
              value={releaseTarget}
              onChange={(event) => setReleaseTarget(event.target.value)}
            >
              <option value="pilot_30">30 人内测</option>
              <option value="foundation_200">200 人基础组</option>
              <option value="onboarding_2000">2,000 人导学全量</option>
            </select>
            <Button variant="outline" onClick={() => void exportReleaseSnapshot('json')} disabled={!token.trim()}>
              导出快照 JSON
            </Button>
            <Button variant="outline" onClick={() => void exportReleaseSnapshot('md')} disabled={!token.trim()}>
              导出周会 Markdown
            </Button>
          </CardContent>
        </Card>

        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        {metrics && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm">Jobs</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <p className="text-2xl font-bold">{metrics.jobs.total}</p>
                <p className="text-xs text-muted-foreground">
                  queued {metrics.jobs.byStatus.queued || 0} · running{' '}
                  {metrics.jobs.byStatus.running || 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm">Queue p95</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{fmtMs(metrics.jobs.queuedAgeMs.p95)}</p>
                <p className="text-xs text-muted-foreground">p50 {fmtMs(metrics.jobs.queuedAgeMs.p50)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm">SE / Lease</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {metrics.jobs.retryingSystemErrors}/{metrics.jobs.expiredLeases}
                </p>
                <p className="text-xs text-muted-foreground">retrying / expired</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm">Run p95</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{fmtMs(metrics.runs.timeMs.p95)}</p>
                <p className="text-xs text-muted-foreground">runs {metrics.runs.total}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {releaseSnapshot && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex flex-wrap items-center justify-between gap-2">
                <span>放量判断</span>
                <span
                  className={`rounded px-2 py-0.5 text-xs ${
                    releaseSnapshot.decision.decision === 'go'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {releaseSnapshot.decision.decision.toUpperCase()}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 text-sm md:grid-cols-4">
                <span>cohort：{releaseSnapshot.funnel.cohortId}</span>
                <span>学员：{releaseSnapshot.funnel.students}</span>
                <span>诊断：{releaseSnapshot.funnel.diagnosticDone}</span>
                <span>五关 AC：{releaseSnapshot.funnel.allUnitGatesPassed}</span>
                <span>微单元开始：{releaseSnapshot.funnel.foundationStarted}</span>
                <span>微单元达标：{releaseSnapshot.funnel.foundationPassedStudents}</span>
                <span>unit OJ 开始：{releaseSnapshot.funnel.unitOjStarted}</span>
                <span>项目候选：{releaseSnapshot.funnel.projectCandidates}</span>
              </div>
              {releaseSnapshot.decision.blockers.length > 0 && (
                <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  <p className="font-medium">阻塞项</p>
                  <ul className="mt-1 list-disc pl-5">
                    {releaseSnapshot.decision.blockers.map((blocker) => (
                      <li key={blocker}>{blocker}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="grid gap-2 md:grid-cols-2">
                {releaseSnapshot.decision.checks.map((check) => (
                  <div key={check.id} className="rounded border p-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{check.label}</span>
                      <span
                        className={`rounded px-2 py-0.5 text-xs ${
                          check.status === 'pass'
                            ? 'bg-green-100 text-green-800'
                            : check.status === 'warn'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {check.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{check.evidence}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {metrics && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Verdict 分布</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {Object.entries(metrics.runs.byVerdict).map(([verdict, count]) => (
                  <span key={verdict} className="rounded border px-2 py-1 text-sm">
                    {verdict}: {count}
                  </span>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Job 状态</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {Object.entries(metrics.jobs.byStatus).map(([status, count]) => (
                  <span key={status} className="rounded border px-2 py-1 text-sm">
                    {status}: {count}
                  </span>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {riskQueue && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex flex-wrap items-center justify-between gap-2">
                <span>风险队列</span>
                <span className="text-xs font-normal text-muted-foreground">
                  total {riskQueue.total} · high {riskQueue.bySeverity.high} · medium{' '}
                  {riskQueue.bySeverity.medium} · low {riskQueue.bySeverity.low}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {riskQueue.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无风险项。</p>
              ) : (
                riskQueue.items.map((item) => (
                  <div key={item.id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.kind}
                          {item.studentName ? ` · ${item.studentName}` : ''}
                          {item.cohortId ? ` · ${item.cohortId}` : ''}
                          {item.resolution ? ` · ${item.resolution.status}` : ' · open'}
                        </p>
                      </div>
                      <span className={`rounded border px-2 py-0.5 text-xs ${severityClass(item.severity)}`}>
                        {item.severity}
                      </span>
                    </div>
                    <p className="mt-2 text-sm">{item.evidence}</p>
                    <p className="mt-1 text-xs text-muted-foreground">建议：{item.nextAction}</p>
                    {item.resolution?.note && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        备注：{item.resolution.note}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(['open', 'acknowledged', 'resolved', 'ignored'] as const).map((status) => (
                        <Button
                          key={status}
                          size="sm"
                          variant={
                            (item.resolution?.status || 'open') === status ? 'default' : 'outline'
                          }
                          disabled={updatingRiskId === item.id}
                          onClick={() => void updateRisk(item.id, status)}
                        >
                          {status}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
