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

type KnowledgeReviewQueue = {
  generatedAt: string;
  summary: {
    total: number;
    published: number;
    draft: number;
    deprecated: number;
    reviewed: number;
    pending: number;
    publishReady: number;
    errors: number;
    warnings: number;
    info: number;
  };
  items: Array<{
    id: string;
    title: string;
    source: string;
    contentHash: string;
    courseVersion: string;
    publicationStatus: 'published' | 'draft' | 'deprecated';
    reviewStatus: 'reviewed' | 'pending';
    reviewedBy?: string;
    reviewedAt?: string;
    sourceRefs: string[];
    tags: string[];
    prerequisiteIds: string[];
    relatedIds: string[];
    labGateIds: string[];
    questionTags: string[];
    issues: Array<{
      code: string;
      severity: 'error' | 'warning' | 'info';
      message: string;
    }>;
    publishReady: boolean;
  }>;
};

type ExperimentReviewQueue = {
  generatedAt: string;
  summary: {
    total: number;
    published: number;
    draft: number;
    reviewed: number;
    pending: number;
    errors: number;
    warnings: number;
  };
  items: Array<{
    id: string;
    title: string;
    source: string;
    contentHash: string;
    courseVersion: string;
    publicationStatus: 'published' | 'draft' | 'deprecated';
    reviewStatus: 'reviewed' | 'pending';
    reviewedBy?: string;
    reviewedAt?: string;
    sourceRefs: string[];
    gateIds: string[];
    conceptTags: string[];
    issues: Array<{ code: string; severity: 'error' | 'warning' | 'info'; message: string }>;
    reviewReady: boolean;
    publishReady: boolean;
  }>;
};

type ContentDecision = {
  id: string;
  targetKind: 'knowledge_card' | 'experiment_template';
  targetId: string;
  sourcePath: string;
  action: 'approve_review' | 'request_changes' | 'publish' | 'deprecate';
  status: 'pending' | 'applied' | 'stale' | 'cancelled';
  actor: string;
  note: string;
  createdAt: string;
  appliedAt?: string | null;
  failureReason: string;
};

type ContentReleaseCheck = {
  generatedAt: string;
  mode: 'development' | 'release';
  decision: 'pass' | 'fail';
  summary: {
    knowledgeCards: number;
    experimentTemplates: number;
    decisions: number;
    manifests: number;
    foundationUnits: number;
    foundationUncoveredTags: number;
    foundationUndercoveredTags: number;
    foundationUncoveredRemediationTags: number;
    foundationTopicPacks: number;
    foundationTopicPackIssues: number;
    errors: number;
    warnings: number;
    blockers: number;
  };
  details: {
    foundationCoverage: Array<{
      unitId: string;
      title: string;
      requiredQuestions: number;
      requiredQuestionsPerTag: number;
      availableQuestions: number;
      uncoveredTags: string[];
      undercoveredTags: string[];
      uncoveredRemediationTags: string[];
      difficulty: { min: number; max: number; average: number };
    }>;
    foundationTopicPacks: Array<{
      id: string;
      unitId: string;
      title: string;
      ready: boolean;
      learningObjectives: string[];
      misconceptions: Array<{ id: string; label: string }>;
      questionCoverage: Array<{ tag: string; label: string; questions: number }>;
      remediationCards: Array<{ id: string; title: string; available: boolean }>;
      nextTask: { unitId: string; title: string; valid: boolean };
      issues: Array<{ code: string; message: string }>;
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
  const [knowledgeQueue, setKnowledgeQueue] = useState<KnowledgeReviewQueue | null>(null);
  const [experimentQueue, setExperimentQueue] = useState<ExperimentReviewQueue | null>(null);
  const [contentRelease, setContentRelease] = useState<ContentReleaseCheck | null>(null);
  const [contentToken, setContentToken] = useState('');
  const [contentActor, setContentActor] = useState('');
  const [contentDecisions, setContentDecisions] = useState<ContentDecision[]>([]);
  const [contentNotes, setContentNotes] = useState<Record<string, string>>({});
  const [updatingContentKey, setUpdatingContentKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [updatingRiskId, setUpdatingRiskId] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('open');
  const [cohortFilter, setCohortFilter] = useState('');
  const [releaseTarget, setReleaseTarget] = useState('foundation_200');
  const [knowledgePublicationFilter, setKnowledgePublicationFilter] = useState('all');
  const [knowledgeReviewFilter, setKnowledgeReviewFilter] = useState('all');
  const [knowledgeSeverityFilter, setKnowledgeSeverityFilter] = useState('all');
  const [knowledgeQuery, setKnowledgeQuery] = useState('');

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
      const knowledgeParams = new URLSearchParams({
        publicationStatus: knowledgePublicationFilter,
        reviewStatus: knowledgeReviewFilter,
        severity: knowledgeSeverityFilter,
      });
      if (knowledgeQuery.trim()) knowledgeParams.set('q', knowledgeQuery.trim());
      if (cohortFilter.trim()) releaseParams.set('cohortId', cohortFilter.trim());
      const [healthRes, riskRes, releaseRes, knowledgeRes, contentReleaseRes] = await Promise.all([
        fetch('/api/judge/health', { headers }),
        fetch(`/api/ops/risk?${riskParams}`, { headers }),
        fetch(`/api/ops/release?${releaseParams}`, { headers }),
        fetch(`/api/ops/knowledge?${knowledgeParams}`, { headers }),
        fetch('/api/ops/content-release?mode=release', { headers }),
      ]);
      const health = await healthRes.json();
      const risk = await riskRes.json();
      const release = await releaseRes.json();
      const knowledge = await knowledgeRes.json();
      const contentReleaseData = await contentReleaseRes.json();
      if (!healthRes.ok) throw new Error(health.error || 'judge health 加载失败');
      if (!riskRes.ok) throw new Error(risk.error || 'risk queue 加载失败');
      if (!releaseRes.ok) throw new Error(release.error || 'release snapshot 加载失败');
      if (!knowledgeRes.ok) throw new Error(knowledge.error || '知识审核队列加载失败');
      if (!contentReleaseRes.ok) throw new Error(contentReleaseData.error || '内容发布门禁加载失败');
      setMetrics(health.metrics);
      setRiskQueue(risk.riskQueue);
      setReleaseSnapshot(release.snapshot);
      setKnowledgeQueue(knowledge.queue);
      setExperimentQueue(knowledge.experimentQueue);
      setContentRelease(contentReleaseData);
      sessionStorage.setItem('opencamp_ops_token', token);
      if (contentToken.trim()) {
        const decisionsRes = await fetch('/api/ops/content-decisions', {
          headers: { 'x-content-ops-token': contentToken },
        });
        const decisionsData = await decisionsRes.json();
        if (!decisionsRes.ok) throw new Error(decisionsData.error || '内容决策加载失败');
        setContentDecisions(decisionsData.decisions || []);
        sessionStorage.setItem('opencamp_content_ops_token', contentToken);
        sessionStorage.setItem('opencamp_content_ops_actor', contentActor);
      }
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

  const useSavedContentIdentity = () => {
    setContentToken(sessionStorage.getItem('opencamp_content_ops_token') || '');
    setContentActor(sessionStorage.getItem('opencamp_content_ops_actor') || '');
  };

  const reloadContentDecisions = async () => {
    if (!contentToken.trim()) return;
    const res = await fetch('/api/ops/content-decisions', {
      headers: { 'x-content-ops-token': contentToken },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '内容决策加载失败');
    setContentDecisions(data.decisions || []);
  };

  const submitContentDecision = async (input: {
    targetKind: ContentDecision['targetKind'];
    targetId: string;
    sourcePath: string;
    contentHash: string;
    action: ContentDecision['action'];
  }) => {
    const key = `${input.targetKind}:${input.sourcePath}`;
    setUpdatingContentKey(key);
    setError(null);
    try {
      const res = await fetch('/api/ops/content-decisions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-content-ops-token': contentToken,
          'x-content-ops-actor': contentActor,
        },
        body: JSON.stringify({
          operation: 'create',
          ...input,
          expectedHash: input.contentHash,
          note: contentNotes[key] || '',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '提交内容审核决策失败');
      setContentNotes((prev) => ({ ...prev, [key]: '' }));
      sessionStorage.setItem('opencamp_content_ops_token', contentToken);
      sessionStorage.setItem('opencamp_content_ops_actor', contentActor);
      await reloadContentDecisions();
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交内容审核决策失败');
    } finally {
      setUpdatingContentKey(null);
    }
  };

  const cancelContentDecision = async (decisionId: string) => {
    setUpdatingContentKey(decisionId);
    setError(null);
    try {
      const res = await fetch('/api/ops/content-decisions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-content-ops-token': contentToken,
          'x-content-ops-actor': contentActor,
        },
        body: JSON.stringify({ operation: 'cancel', decisionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '取消决策失败');
      await reloadContentDecisions();
    } catch (err) {
      setError(err instanceof Error ? err.message : '取消决策失败');
    } finally {
      setUpdatingContentKey(null);
    }
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

  const hasPendingContentDecision = (sourcePath: string) =>
    contentDecisions.some(
      (decision) => decision.sourcePath === sourcePath && decision.status === 'pending'
    );

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
            <CardTitle className="text-base">教师内容审核身份</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 md:grid-cols-[1.5fr_1fr_auto]">
            <input
              className="rounded border bg-background px-3 py-2 text-sm"
              placeholder="独立 CONTENT_OPS_TOKEN"
              type="password"
              value={contentToken}
              onChange={(event) => setContentToken(event.target.value)}
            />
            <input
              className="rounded border bg-background px-3 py-2 text-sm"
              placeholder="reviewer actor，例如 songhong"
              value={contentActor}
              onChange={(event) => setContentActor(event.target.value)}
            />
            <Button variant="outline" onClick={useSavedContentIdentity}>
              使用已保存身份
            </Button>
            <p className="text-xs text-muted-foreground md:col-span-3">
              网页只记录带 actor 和内容哈希的审核决策；文件仍需运行 content:apply-decisions 并检查 Git diff 后才改变。
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">课程知识审核筛选</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_1.5fr]">
            <select
              className="rounded border bg-background px-3 py-2 text-sm"
              value={knowledgePublicationFilter}
              onChange={(event) => setKnowledgePublicationFilter(event.target.value)}
            >
              <option value="all">全部发布状态</option>
              <option value="published">published</option>
              <option value="draft">draft</option>
              <option value="deprecated">deprecated</option>
            </select>
            <select
              className="rounded border bg-background px-3 py-2 text-sm"
              value={knowledgeReviewFilter}
              onChange={(event) => setKnowledgeReviewFilter(event.target.value)}
            >
              <option value="all">全部复核状态</option>
              <option value="reviewed">reviewed</option>
              <option value="pending">pending</option>
            </select>
            <select
              className="rounded border bg-background px-3 py-2 text-sm"
              value={knowledgeSeverityFilter}
              onChange={(event) => setKnowledgeSeverityFilter(event.target.value)}
            >
              <option value="all">全部问题级别</option>
              <option value="error">error</option>
              <option value="warning">warning</option>
              <option value="info">info</option>
            </select>
            <input
              className="rounded border bg-background px-3 py-2 text-sm"
              placeholder="搜索 ID、标题、路径或标签"
              value={knowledgeQuery}
              onChange={(event) => setKnowledgeQuery(event.target.value)}
            />
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

        {knowledgeQueue && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex flex-wrap items-center justify-between gap-2">
                <span>课程知识审核队列</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {knowledgeQueue.summary.total} 条 · error {knowledgeQueue.summary.errors} · warning{' '}
                  {knowledgeQueue.summary.warnings} · 可发布 {knowledgeQueue.summary.publishReady}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 text-sm md:grid-cols-5">
                <span>published：{knowledgeQueue.summary.published}</span>
                <span>draft：{knowledgeQueue.summary.draft}</span>
                <span>deprecated：{knowledgeQueue.summary.deprecated}</span>
                <span>reviewed：{knowledgeQueue.summary.reviewed}</span>
                <span>pending：{knowledgeQueue.summary.pending}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                审核按钮只会排队决策，不直接修改 Markdown。应用仍通过 CLI/CI 与 Git diff 完成。
              </p>
              {knowledgeQueue.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">当前筛选下没有知识卡片。</p>
              ) : (
                knowledgeQueue.items.map((item) => (
                  <details key={`${item.source}:${item.id}`} className="rounded-lg border p-3">
                    <summary className="cursor-pointer list-none">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{item.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.id} · {item.source} · {item.courseVersion}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <span className="rounded border px-2 py-0.5 text-xs">
                            {item.publicationStatus}
                          </span>
                          <span className="rounded border px-2 py-0.5 text-xs">
                            {item.reviewStatus}
                          </span>
                          <span
                            className={`rounded border px-2 py-0.5 text-xs ${
                              item.publishReady
                                ? 'border-green-200 bg-green-100 text-green-800'
                                : 'border-amber-200 bg-amber-100 text-amber-800'
                            }`}
                          >
                            {item.publishReady ? 'publish-ready' : `${item.issues.length} issues`}
                          </span>
                        </div>
                      </div>
                    </summary>
                    <div className="mt-3 space-y-2 text-xs">
                      <p>来源：{item.sourceRefs.join('、') || '无'}</p>
                      <p>标签：{item.tags.join('、') || '无'}</p>
                      <p>题目标签：{item.questionTags.join('、') || '无'}</p>
                      <p>Lab Gate：{item.labGateIds.join('、') || '无'}</p>
                      <p>
                        知识关系：
                        {[...item.prerequisiteIds, ...item.relatedIds].join('、') || '无'}
                      </p>
                      {item.reviewedBy && (
                        <p>复核：{item.reviewedBy} · {item.reviewedAt}</p>
                      )}
                      {item.issues.length > 0 && (
                        <div className="space-y-1">
                          {item.issues.map((issue) => (
                            <p
                              key={`${issue.code}:${issue.message}`}
                              className={
                                issue.severity === 'error'
                                  ? 'text-red-700'
                                  : issue.severity === 'warning'
                                    ? 'text-amber-700'
                                    : 'text-muted-foreground'
                              }
                            >
                              [{issue.severity}] {issue.message}
                            </p>
                          ))}
                        </div>
                      )}
                      <div className="space-y-2 border-t pt-2">
                        {hasPendingContentDecision(`data/knowledge/${item.source}`) && (
                          <p className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-blue-800">
                            已有待应用决策；请先运行 CLI/CI 应用，或在下方取消该决策。
                          </p>
                        )}
                        <textarea
                          className="min-h-16 w-full rounded border bg-background p-2 text-xs"
                          placeholder="教师批注；要求修改时至少 5 个字符"
                          value={contentNotes[`knowledge_card:data/knowledge/${item.source}`] || ''}
                          onChange={(event) =>
                            setContentNotes((prev) => ({
                              ...prev,
                              [`knowledge_card:data/knowledge/${item.source}`]: event.target.value,
                            }))
                          }
                        />
                        <div className="flex flex-wrap gap-2">
                          {item.reviewStatus === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => void submitContentDecision({
                                targetKind: 'knowledge_card',
                                targetId: item.id,
                                sourcePath: `data/knowledge/${item.source}`,
                                contentHash: item.contentHash,
                                action: 'approve_review',
                              })}
                              disabled={!contentToken.trim() || !contentActor.trim() || updatingContentKey !== null || hasPendingContentDecision(`data/knowledge/${item.source}`) || item.issues.some((issue) => issue.severity === 'error')}
                            >
                              批准复核
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void submitContentDecision({
                              targetKind: 'knowledge_card',
                              targetId: item.id,
                              sourcePath: `data/knowledge/${item.source}`,
                              contentHash: item.contentHash,
                              action: 'request_changes',
                            })}
                            disabled={!contentToken.trim() || !contentActor.trim() || updatingContentKey !== null || hasPendingContentDecision(`data/knowledge/${item.source}`)}
                          >
                            要求修改
                          </Button>
                          {item.reviewStatus === 'reviewed' && item.publicationStatus !== 'published' && (
                            <Button
                              size="sm"
                              onClick={() => void submitContentDecision({
                                targetKind: 'knowledge_card',
                                targetId: item.id,
                                sourcePath: `data/knowledge/${item.source}`,
                                contentHash: item.contentHash,
                                action: 'publish',
                              })}
                              disabled={!contentToken.trim() || !contentActor.trim() || updatingContentKey !== null || hasPendingContentDecision(`data/knowledge/${item.source}`) || !item.publishReady}
                            >
                              排队发布
                            </Button>
                          )}
                          {item.publicationStatus !== 'deprecated' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void submitContentDecision({
                                targetKind: 'knowledge_card',
                                targetId: item.id,
                                sourcePath: `data/knowledge/${item.source}`,
                                contentHash: item.contentHash,
                                action: 'deprecate',
                              })}
                              disabled={!contentToken.trim() || !contentActor.trim() || updatingContentKey !== null || hasPendingContentDecision(`data/knowledge/${item.source}`)}
                            >
                              排队弃用
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </details>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {contentRelease && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex flex-wrap items-center justify-between gap-2">
                <span>内容发布门禁（只读）</span>
                <span
                  className={`rounded px-2 py-0.5 text-xs ${
                    contentRelease.decision === 'pass'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {contentRelease.decision.toUpperCase()}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 text-sm md:grid-cols-4">
                <span>blocker：{contentRelease.summary.blockers}</span>
                <span>warning：{contentRelease.summary.warnings}</span>
                <span>待处理决策：{contentRelease.summary.decisions}</span>
                <span>manifest：{contentRelease.summary.manifests}</span>
              </div>
              <div className="rounded border bg-muted/30 p-3 text-xs">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-medium">Foundation 题库覆盖</span>
                  <span>
                    {contentRelease.summary.foundationUnits} 个单元 · 标签缺口{' '}
                    {contentRelease.summary.foundationUncoveredTags} · 标签题量不足{' '}
                    {contentRelease.summary.foundationUndercoveredTags} · 补弱卡缺口{' '}
                    {contentRelease.summary.foundationUncoveredRemediationTags}
                  </span>
                </div>
                <p className="mt-1 text-muted-foreground">
                  题量不足会阻断 release；语义标签缺口只做数据质量提示，不代替教师审核。
                </p>
              </div>
              <div className="space-y-1 text-xs">
                {contentRelease.details.foundationCoverage.map((coverage) => (
                  <div key={coverage.unitId} className="flex flex-wrap items-center justify-between gap-2 border-b py-1 last:border-b-0">
                    <span className="font-medium">{coverage.title}</span>
                    <span className="text-muted-foreground">
                      题目 {coverage.availableQuestions}/{coverage.requiredQuestions} · 难度 {coverage.difficulty.min}–{coverage.difficulty.max}（均值 {coverage.difficulty.average}）
                      {coverage.uncoveredTags.length > 0 ? ` · 缺标签：${coverage.uncoveredTags.join('、')}` : ''}
                      {coverage.undercoveredTags.length > 0 ? ` · 标签少于 ${coverage.requiredQuestionsPerTag} 题：${coverage.undercoveredTags.join('、')}` : ''}
                      {coverage.uncoveredRemediationTags.length > 0 ? ` · 缺补弱卡：${coverage.uncoveredRemediationTags.join('、')}` : ''}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">Foundation 纵向主题包</span>
                  <span className="text-muted-foreground">
                    {contentRelease.summary.foundationTopicPacks} 个主题包 · 结构问题{' '}
                    {contentRelease.summary.foundationTopicPackIssues}
                  </span>
                </div>
                <div className="mt-2 space-y-1">
                  {contentRelease.details.foundationTopicPacks.map((topicPack) => (
                    <div key={topicPack.id} className="flex flex-wrap items-start justify-between gap-2 border-b py-1 last:border-b-0">
                      <span className="font-medium">{topicPack.title}</span>
                      <span className="max-w-full break-words text-muted-foreground">
                        目标 {topicPack.learningObjectives.length} · 误区 {topicPack.misconceptions.length} ·
                        题目标签 {topicPack.questionCoverage.length} · 补弱卡{' '}
                        {topicPack.remediationCards.filter((card) => card.available).length} · 下一任务{' '}
                        {topicPack.nextTask.valid ? topicPack.nextTask.title : '未连通'} ·{' '}
                        {topicPack.ready ? 'READY' : `缺口 ${topicPack.issues.length}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {experimentQueue && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex flex-wrap items-center justify-between gap-2">
                <span>参数化实验模板审核</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {experimentQueue.summary.total} 个 · error {experimentQueue.summary.errors} · warning {experimentQueue.summary.warnings}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {experimentQueue.items.map((item) => {
                const key = `experiment_template:${item.source}`;
                return (
                  <div key={item.id} className="rounded-lg border p-3 text-xs space-y-2">
                    <div className="flex flex-wrap justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-muted-foreground">{item.id} · {item.source}</p>
                      </div>
                      <span>{item.publicationStatus} · {item.reviewStatus}</span>
                    </div>
                    <p>来源：{item.sourceRefs.join('、')} · Gate：{item.gateIds.join('、')}</p>
                    {item.issues.map((issue) => (
                      <p key={`${issue.code}:${issue.message}`} className={issue.severity === 'error' ? 'text-red-700' : issue.severity === 'warning' ? 'text-amber-700' : 'text-muted-foreground'}>
                        [{issue.severity}] {issue.message}
                      </p>
                    ))}
                    {hasPendingContentDecision(item.source) && (
                      <p className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-blue-800">
                        已有待应用决策；请先应用或取消。
                      </p>
                    )}
                    <textarea
                      className="min-h-16 w-full rounded border bg-background p-2 text-xs"
                      placeholder="教师批注"
                      value={contentNotes[key] || ''}
                      onChange={(event) => setContentNotes((prev) => ({ ...prev, [key]: event.target.value }))}
                    />
                    <div className="flex flex-wrap gap-2">
                      {item.reviewStatus === 'pending' && (
                        <Button size="sm" onClick={() => void submitContentDecision({ targetKind: 'experiment_template', targetId: item.id, sourcePath: item.source, contentHash: item.contentHash, action: 'approve_review' })} disabled={!contentToken.trim() || !contentActor.trim() || updatingContentKey !== null || hasPendingContentDecision(item.source) || !item.reviewReady}>
                          批准复核
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => void submitContentDecision({ targetKind: 'experiment_template', targetId: item.id, sourcePath: item.source, contentHash: item.contentHash, action: 'request_changes' })} disabled={!contentToken.trim() || !contentActor.trim() || updatingContentKey !== null || hasPendingContentDecision(item.source)}>
                        要求修改
                      </Button>
                      {item.reviewStatus === 'reviewed' && item.publicationStatus !== 'published' && (
                        <Button size="sm" onClick={() => void submitContentDecision({ targetKind: 'experiment_template', targetId: item.id, sourcePath: item.source, contentHash: item.contentHash, action: 'publish' })} disabled={!contentToken.trim() || !contentActor.trim() || updatingContentKey !== null || hasPendingContentDecision(item.source) || !item.publishReady}>
                          排队发布
                        </Button>
                      )}
                      {item.publicationStatus !== 'deprecated' && (
                        <Button size="sm" variant="outline" onClick={() => void submitContentDecision({ targetKind: 'experiment_template', targetId: item.id, sourcePath: item.source, contentHash: item.contentHash, action: 'deprecate' })} disabled={!contentToken.trim() || !contentActor.trim() || updatingContentKey !== null || hasPendingContentDecision(item.source)}>
                          排队弃用
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {contentDecisions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">最近内容审核决策</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {contentDecisions.slice(0, 20).map((decision) => (
                <div key={decision.id} className="rounded-lg border p-3 text-xs">
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="font-medium">{decision.targetId} · {decision.action}</span>
                    <span>{decision.status} · {decision.actor} · {new Date(decision.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 text-muted-foreground break-all">{decision.sourcePath}</p>
                  {decision.note && <p className="mt-1 whitespace-pre-wrap">{decision.note}</p>}
                  {decision.failureReason && <p className="mt-1 text-red-700">{decision.failureReason}</p>}
                  {decision.status === 'pending' && (
                    <Button size="sm" variant="outline" className="mt-2" onClick={() => void cancelContentDecision(decision.id)} disabled={!contentToken.trim() || !contentActor.trim() || updatingContentKey !== null}>
                      取消待应用决策
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
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
