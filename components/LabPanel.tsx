'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useApp } from '@/lib/context/app-context';

type GateRow = {
  id: string;
  title: string;
  chapter: string;
  judgeKind: string;
  editorMode: string;
  order: number;
  checklist: { id: string; text: string; required: boolean }[];
  docLinks: { label: string; url: string }[];
  conceptTags: string[];
  testHint?: string;
  progress: {
    status: 'locked' | 'unlocked' | 'passed';
    passedAt: string | null;
    bestVerdict: string | null;
  };
};

type RecentSubmission = {
  id: string;
  gateId: string;
  labName: string;
  verdict: string;
  isPassed: boolean;
  judgeKind: string;
  feedback: string;
  testResult?: string;
  judgeLog?: string;
  createdAt: string;
};

type FormativeTemplate = {
  id: string;
  title: string;
  description: string;
  courseVersion: string;
  gateIds: string[];
  conceptTags: string[];
  sourceRefs: string[];
  assessment: { mode: 'formative'; masteryImpact: 'none' };
};

type FormativeAttempt = {
  id: string;
  templateId: string;
  templateVersion: number;
  instanceId: string;
  variantIndex: number;
  status: 'in_progress' | 'submitted';
  prompt: string;
  input: unknown;
  answer: string;
  isCorrect: boolean | null;
  feedback: string;
  startedAt: string;
  submittedAt: string | null;
  formative: true;
  masteryImpact: 'none';
  gatePassed: false;
};

export function LabPanel({ studentId }: { studentId: string }) {
  const { user } = useApp();
  const [gates, setGates] = useState<GateRow[]>([]);
  const [policyNote, setPolicyNote] = useState('');
  const [pathDone, setPathDone] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [code, setCode] = useState(
    '// 提交评测用源码；unit gate 会进入 OJ 队列，只有 AC 才过关\n'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [lastVerdict, setLastVerdict] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [recentSubmissions, setRecentSubmissions] = useState<RecentSubmission[]>([]);
  const [formativeTemplates, setFormativeTemplates] = useState<FormativeTemplate[]>([]);
  const [formativeAttempts, setFormativeAttempts] = useState<FormativeAttempt[]>([]);
  const [formativeAvailability, setFormativeAvailability] = useState({
    total: 0,
    available: 0,
    awaitingReview: 0,
  });
  const [formativeAttempt, setFormativeAttempt] = useState<FormativeAttempt | null>(null);
  const [formativeAnswer, setFormativeAnswer] = useState('');
  const [formativeResult, setFormativeResult] = useState<{
    correct: boolean;
    expectedAnswer: string;
    feedback: string;
  } | null>(null);
  const [formativeDashboardLoading, setFormativeDashboardLoading] = useState(true);
  const [formativeLoading, setFormativeLoading] = useState(false);
  const [formativeError, setFormativeError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!studentId) return;
    setDashLoading(true);
    try {
      const res = await fetch(
        `/api/labs?studentId=${encodeURIComponent(studentId)}`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '加载关卡失败');
        return;
      }
      setGates(data.gates || []);
      setPolicyNote(data.policy?.note || '');
      setPathDone(data.assistantPathCompletedAt || null);
      const list = (data.gates || []) as GateRow[];
      const unlocked =
        list.find((g) => g.progress.status === 'unlocked') ||
        list.find((g) => g.progress.status === 'passed');
      setActiveId((prev) => prev || unlocked?.id || list[0]?.id || null);
    } catch {
      setError('网络错误');
    } finally {
      setDashLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const loadFormative = useCallback(async () => {
    if (!studentId) return;
    setFormativeDashboardLoading(true);
    try {
      const res = await fetch(`/api/experiments?studentId=${encodeURIComponent(studentId)}`);
      const data = await res.json();
      if (!res.ok) {
        setFormativeError(data.error || '加载预实验失败');
        return;
      }
      setFormativeTemplates(data.templates || []);
      setFormativeAttempts(data.attempts || []);
      setFormativeAvailability(data.availability || { total: 0, available: 0, awaitingReview: 0 });
      const activeAttempt = (data.attempts || []).find(
        (attempt: FormativeAttempt) => attempt.status === 'in_progress'
      );
      setFormativeAttempt(activeAttempt || null);
      if (!activeAttempt) setFormativeAnswer('');
    } catch {
      setFormativeError('网络错误');
    } finally {
      setFormativeDashboardLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    void loadFormative();
  }, [loadFormative]);

  const loadGateDetail = useCallback(async () => {
    if (!studentId || !activeId) return;
    try {
      const params = new URLSearchParams({ studentId, gateId: activeId });
      const res = await fetch(`/api/labs?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setRecentSubmissions(data.recentSubmissions || []);
      }
    } catch {
      /* keep current detail */
    }
  }, [studentId, activeId]);

  useEffect(() => {
    void loadGateDetail();
  }, [loadGateDetail]);

  useEffect(() => {
    const hasPending = recentSubmissions.some((s) => s.verdict === 'PENDING');
    if (!hasPending) return;
    const timer = window.setInterval(() => {
      void loadGateDetail();
      void loadDashboard();
    }, 3000);
    return () => window.clearInterval(timer);
  }, [recentSubmissions, loadGateDetail, loadDashboard]);

  const active = gates.find((g) => g.id === activeId) || null;
  const isIde = active?.editorMode === 'ide_first';
  const isLocked = active?.progress.status === 'locked';
  const isPassed = active?.progress.status === 'passed';

  const startFormative = async (templateId: string) => {
    setFormativeLoading(true);
    setFormativeError(null);
    setFormativeResult(null);
    try {
      const res = await fetch('/api/experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, action: 'start', templateId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormativeError(data.error || '启动预实验失败');
        return;
      }
      setFormativeAttempt(data.attempt);
      setFormativeAttempts((prev) => [data.attempt, ...prev.filter((item) => item.id !== data.attempt.id)]);
      setFormativeAnswer(data.attempt.answer || '');
    } catch {
      setFormativeError('网络错误');
    } finally {
      setFormativeLoading(false);
    }
  };

  const submitFormative = async () => {
    if (!formativeAttempt) return;
    setFormativeLoading(true);
    setFormativeError(null);
    try {
      const res = await fetch('/api/experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          action: 'submit',
          attemptId: formativeAttempt.id,
          answer: formativeAnswer,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormativeError(data.error || '提交预实验失败');
        return;
      }
      setFormativeAttempt(data.attempt);
      setFormativeAttempts((prev) => [data.attempt, ...prev.filter((item) => item.id !== data.attempt.id)]);
      setFormativeResult(data.result);
    } catch {
      setFormativeError('网络错误');
    } finally {
      setFormativeLoading(false);
    }
  };

  const submit = async () => {
    if (!studentId || !active) return;
    if (isLocked) {
      setError('关卡未解锁：请先 AC 前置关卡');
      return;
    }
    if (active.judgeKind === 'manual_teacher') {
      setError('项目关由老师评分，请按老师要求提交');
      return;
    }
    setIsLoading(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          gateId: active.id,
          labName: active.id,
          code,
          language: 'rust',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '提交失败');
        return;
      }
      setFeedback(data.submission?.feedback || data.message);
      setLastVerdict(data.oj?.verdict || data.submission?.verdict || null);
      setScore(data.analysis?.overallScore ?? null);
      await loadDashboard();
      await loadGateDetail();
    } catch {
      setError('网络错误');
    } finally {
      setIsLoading(false);
    }
  };

  const copyCli = async () => {
    if (!active) return;
    const cmd = `npx tsx src/index.ts submit --lab ${active.id} -f path/to/file.rs`;
    try {
      await navigator.clipboard.writeText(cmd);
    } catch {
      /* ignore */
    }
  };

  if (dashLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        加载实验关卡…
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 space-y-4 overflow-y-auto">
      <div>
        <h2 className="text-lg font-semibold">实验关卡（OJ 纪律）</h2>
        <p className="text-xs text-muted-foreground mt-1">
          过关 = 评测 <strong>AC</strong> 并写入数据库。PENDING 表示已入队；
          STATIC / WA / CE / TLE 都<strong>不能</strong>单独过关。
        </p>
        {policyNote && (
          <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-100 rounded px-2 py-1 mt-2">
            {policyNote}
          </p>
        )}
        {pathDone && (
          <p className="text-xs text-green-700 mt-2">
            助教主路径已完成（{new Date(pathDone).toLocaleString()}
            ）。项目请按老师大纲推进。
          </p>
        )}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex flex-wrap items-center gap-2">
            参数化预实验
            <span className="text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
              formative · 不直接过关
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-xs text-muted-foreground">
            这些题目由课程模板生成，用于检查概念和获得反馈；不会写入 mastery，也不会替代 OJ 的 AC 关卡证据。
          </p>
          {formativeError && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded px-2 py-1">
              {formativeError}
            </p>
          )}
          {formativeDashboardLoading ? (
            <p className="text-xs text-muted-foreground">加载预实验目录…</p>
          ) : formativeAttempt ? (
            <div className="space-y-2 rounded-lg border p-3 bg-muted/20">
              <p className="text-xs font-medium">当前题目</p>
              <pre className="text-xs whitespace-pre-wrap font-sans">{formativeAttempt.prompt}</pre>
              {formativeAttempt.status === 'in_progress' ? (
                <div className="space-y-2">
                  <label className="text-xs font-medium" htmlFor="formative-answer">
                    你的答案
                  </label>
                  <input
                    id="formative-answer"
                    className="w-full border rounded px-2 py-1 text-sm bg-background"
                    value={formativeAnswer}
                    onChange={(event) => setFormativeAnswer(event.target.value)}
                    maxLength={80}
                    autoComplete="off"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void submitFormative()}
                    disabled={formativeLoading || !formativeAnswer.trim()}
                  >
                    {formativeLoading ? '判定中…' : '提交形成性答案'}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs text-muted-foreground">本题已提交，可生成下一道变式。</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void startFormative(formativeAttempt.templateId)}
                    disabled={formativeLoading}
                  >
                    再做一题
                  </Button>
                </div>
              )}
              {formativeResult && (
                <div className={`rounded border px-2 py-2 text-xs ${formativeResult.correct ? 'border-green-200 bg-green-50 text-green-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
                  <p className="font-medium">{formativeResult.correct ? '回答正确' : '回答不正确'}</p>
                  <p className="mt-1">参考判定：{formativeResult.expectedAnswer}</p>
                  <p className="mt-1">{formativeResult.feedback}</p>
                  <p className="mt-1 font-medium">此结果不会直接获得 mastery 或 Gate 过关。</p>
                </div>
              )}
            </div>
          ) : formativeTemplates.length > 0 ? (
            <div className="space-y-2">
              {formativeTemplates.map((template) => (
                <div key={template.id} className="rounded-lg border p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{template.title}</p>
                    <p className="text-xs text-muted-foreground">{template.description}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      关联 Gate：{template.gateIds.join('、')} · {template.sourceRefs.join('、')}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void startFormative(template.id)}
                    disabled={formativeLoading}
                  >
                    开始预实验
                  </Button>
                </div>
              ))}
            </div>
          ) : formativeAvailability.awaitingReview > 0 ? (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded px-2 py-2">
              当前有 {formativeAvailability.awaitingReview} 个预实验正在教师审核中，审核通过并发布后会出现在这里。
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">当前课程暂无已发布的参数化预实验。</p>
          )}
          {formativeAttempts.filter((attempt) => attempt.status === 'submitted').length > 0 && (
            <div className="space-y-1 border-t pt-2">
              <p className="text-[11px] font-medium">最近形成性记录</p>
              {formativeAttempts
                .filter(
                  (attempt) =>
                    attempt.status === 'submitted' && attempt.id !== formativeAttempt?.id
                )
                .slice(0, 3)
                .map((attempt) => (
                  <div key={attempt.id} className="flex flex-wrap justify-between gap-2 text-[11px] text-muted-foreground">
                    <span>
                      {attempt.isCorrect ? '正确' : '未答对'} · {attempt.feedback}
                    </span>
                    <span>{new Date(attempt.submittedAt || attempt.startedAt).toLocaleString()}</span>
                  </div>
                ))}
              <p className="text-[11px] text-muted-foreground">
                共提交 {formativeAttempts.filter((attempt) => attempt.status === 'submitted').length} 次；历史结果仅供复盘，不改变关卡状态。
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-[14rem_1fr] gap-4 min-h-0">
        <Card className="h-fit">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">关卡</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 max-h-[28rem] overflow-y-auto">
            {gates.map((g) => {
              const st = g.progress.status;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    setActiveId(g.id);
                    setFeedback(null);
                    setError(null);
                    setLastVerdict(null);
                  }}
                  className={`w-full text-left px-2 py-2 rounded-lg border text-xs transition-colors ${
                    g.id === activeId
                      ? 'border-primary bg-primary/10'
                      : 'border-transparent hover:bg-muted'
                  }`}
                >
                  <span className="font-medium block truncate">{g.title}</span>
                  <span className="text-muted-foreground">
                    {st === 'passed'
                      ? '已 AC 过关'
                      : st === 'unlocked'
                        ? '已解锁'
                        : '未解锁'}
                    {' · '}
                    {g.judgeKind}
                  </span>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-3">
          {!active ? (
            <p className="text-sm text-muted-foreground">选择左侧关卡</p>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex flex-wrap items-center gap-2">
                    {active.title}
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        isPassed
                          ? 'bg-green-100 text-green-800'
                          : isLocked
                            ? 'bg-muted text-muted-foreground'
                            : 'bg-primary/15 text-primary'
                      }`}
                    >
                      {isPassed ? 'passed' : isLocked ? 'locked' : 'unlocked'}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="text-xs text-muted-foreground">
                    判题：
                    <code className="bg-muted px-1 rounded">{active.judgeKind}</code>
                    {' · '}
                    {isIde ? 'IDE 优先（VS Code）' : '可网页提交片段'}
                  </p>
                  {active.testHint && (
                    <p className="text-xs bg-muted/50 rounded p-2">{active.testHint}</p>
                  )}
                  {active.docLinks?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {active.docLinks.map((d) => (
                        <a
                          key={d.url}
                          href={d.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs underline text-primary"
                        >
                          {d.label}
                        </a>
                      ))}
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium mb-1">
                      检查清单（自检提醒，不能单独过关）
                    </p>
                    <ul className="text-xs space-y-1 list-disc pl-4 text-muted-foreground">
                      {active.checklist.map((c) => (
                        <li key={c.id}>
                          {c.text}
                          {c.required ? ' *' : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {isIde && (
                    <div className="rounded-lg border border-dashed p-3 space-y-2 bg-muted/20">
                      <p className="text-xs font-medium">请在 VS Code 完成本关</p>
                      <p className="text-[11px] text-muted-foreground">
                        1. 设置中复制 Student ID 并 CLI init
                        <br />
                        2. 本地实现并通过课程测试
                        <br />
                        3. CLI 提交（integration gate 暂不自动 AC；unit gate 可网页提交）
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void copyCli()}
                      >
                        复制 CLI submit 示例
                      </Button>
                      {user?.studentId && (
                        <p className="text-[10px] text-muted-foreground break-all">
                          studentId: {user.studentId}
                        </p>
                      )}
                    </div>
                  )}
                  {!isLocked && active.judgeKind !== 'manual_teacher' && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium">
                        {isIde
                          ? '可选：粘贴关键片段提交队列'
                          : '提交源码评测'}
                      </label>
                      <textarea
                        className="w-full h-40 font-mono text-xs border rounded p-2 bg-background"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        spellCheck={false}
                      />
                      <Button
                        onClick={() => void submit()}
                        disabled={isLoading || code.trim().length < 8}
                      >
                        {isLoading
                          ? '提交中…'
                          : active.judgeKind === 'unit_oj'
                            ? '提交到 unit OJ 队列'
                            : '提交反馈'}
                      </Button>
                      <p className="text-[10px] text-muted-foreground">
                        unit OJ 返回 AC 后，本关才会标为 passed；PENDING 会自动轮询。
                      </p>
                    </div>
                  )}
                  {isLocked && (
                    <p className="text-sm text-muted-foreground">
                      请先完成前置关卡的 AC 过关。
                    </p>
                  )}
                </CardContent>
              </Card>
              {error && (
                <div className="p-3 text-sm text-red-700 bg-red-50 rounded-lg">
                  {error}
                </div>
              )}
              {(feedback || lastVerdict) && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      最近反馈
                      {lastVerdict ? ` · ${lastVerdict}` : ''}
                      {score != null ? ` · 静态分 ${score}` : ''}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs whitespace-pre-wrap font-sans">
                      {feedback}
                    </pre>
                  </CardContent>
                </Card>
              )}
              {recentSubmissions.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">提交时间线</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {recentSubmissions.slice(0, 5).map((submission) => (
                      <div key={submission.id} className="rounded-lg border p-2 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium">
                            {submission.verdict}
                            {submission.isPassed ? ' · passed' : ''}
                          </span>
                          <span className="text-muted-foreground">
                            {submission.judgeKind} ·{' '}
                            {new Date(submission.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="mt-1 text-muted-foreground whitespace-pre-wrap">
                          {submission.judgeLog || submission.testResult || submission.feedback}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
