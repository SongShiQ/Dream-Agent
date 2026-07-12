'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useApp } from '@/lib/context/app-context';
import { STAGE_LABS, STAGE_LABELS } from '@/lib/adaptive/stage';

const ALL_LABS = [
  'env-setup',
  'lab1-batch',
  'lab2-address',
  'lab3-process',
  'lab4-filesystem',
  'lab5-concurrency',
  'lab-compose',
  'project-final',
];

interface Submission {
  id: string;
  labName: string;
  language: string;
  isPassed: boolean;
  feedback: string;
  createdAt: string;
}

export function LabPanel({ studentId }: { studentId: string }) {
  const { user } = useApp();
  const [labName, setLabName] = useState('lab1-batch');
  const [language, setLanguage] = useState('rust');
  const [code, setCode] = useState(
    '// 粘贴实验相关源码（不要只留默认模板）\n// 空代码或仅 hello 占位会被判为低分/拒绝\n'
  );
  const [testResult, setTestResult] = useState('');
  const [isPassed, setIsPassed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [history, setHistory] = useState<Submission[]>([]);

  const stage = user?.currentStage || 'pre_study_theory';
  const suggested = STAGE_LABS[stage] || [];

  useEffect(() => {
    if (suggested[0]) setLabName(suggested[0]);
  }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!studentId) return;
    (async () => {
      try {
        const res = await fetch(
          `/api/submit?studentId=${encodeURIComponent(studentId)}`
        );
        const data = await res.json();
        if (res.ok) setHistory(data.submissions || []);
      } catch {
        /* ignore */
      }
    })();
  }, [studentId]);

  const submit = async () => {
    if (!studentId) return;
    setIsLoading(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          labName,
          code,
          language,
          testResult,
          isPassed,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '提交失败');
        return;
      }
      setFeedback(data.submission?.feedback || data.message);
      setScore(data.analysis?.overallScore ?? null);
      // 刷新历史
      const h = await fetch(`/api/submit?studentId=${encodeURIComponent(studentId)}`);
      const hd = await h.json();
      if (h.ok) setHistory(hd.submissions || []);
    } catch {
      setError('网络错误');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-4 space-y-4 overflow-y-auto">
      <div>
        <h2 className="text-lg font-semibold">实验代码反馈</h2>
        <p className="text-xs text-muted-foreground mt-1">
          当前阶段：{STAGE_LABELS[stage] || stage} · 仅静态分析，不是 OJ 判题
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          在 VS Code 写代码；可用 CLI 绑定同一 Student ID 后{' '}
          <code className="bg-muted px-1 rounded">dream-agent submit</code>，或在此粘贴提交。
        </p>
      </div>

      {suggested.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="text-muted-foreground">建议 lab：</span>
          {suggested.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLabName(l)}
              className={`px-2 py-1 rounded border ${
                labName === l ? 'border-primary bg-primary/10' : 'hover:bg-muted'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">提交</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <label className="text-sm">
              Lab
              <select
                className="ml-2 border rounded p-1"
                value={labName}
                onChange={(e) => setLabName(e.target.value)}
              >
                {ALL_LABS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              语言
              <select
                className="ml-2 border rounded p-1"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="rust">rust</option>
                <option value="c">c</option>
                <option value="python">python</option>
              </select>
            </label>
            <label className="text-sm flex items-start gap-1 max-w-xs">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={isPassed}
                onChange={(e) => setIsPassed(e.target.checked)}
              />
              <span>
                我确认本地测试已通过
                <span className="block text-[10px] text-muted-foreground">
                  自报结果，不会替你跑 QEMU；勿误勾
                </span>
              </span>
            </label>
          </div>

          <textarea
            className="w-full h-48 font-mono text-xs border rounded p-2 bg-background"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
          />

          <textarea
            className="w-full h-16 text-xs border rounded p-2"
            placeholder="可选：粘贴测试输出 / 报错"
            value={testResult}
            onChange={(e) => setTestResult(e.target.value)}
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button
            onClick={submit}
            disabled={isLoading || !studentId || code.trim().length < 8}
          >
            {isLoading ? '分析中...' : '提交并分析'}
          </Button>
          {code.trim().length < 8 && (
            <p className="text-xs text-amber-700">请先粘贴有效代码（过短无法提交）</p>
          )}
        </CardContent>
      </Card>

      {feedback && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              反馈
              {score != null
                ? ` · 静态分 ${score}${score < 40 ? '（内容不足）' : score < 70 ? '（需加强）' : ''}`
                : ''}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <pre className="text-xs whitespace-pre-wrap font-sans">{feedback}</pre>
            <div className="text-xs text-muted-foreground border-t pt-2 space-y-1">
              <p className="font-medium text-foreground">建议下一步</p>
              <p>1. 按反馈改代码，本地再跑测试</p>
              <p>2. 概念不清 → 回网页「卡住一键过关」或智能问答</p>
              <p>3. 对照 rCore-Tutorial 文档对应 lab 章节</p>
            </div>
            <a
              className="text-xs underline text-muted-foreground inline-block"
              href="https://github.com/rcore-os/rCore-Tutorial-v3"
              target="_blank"
              rel="noreferrer"
            >
              打开 rCore-Tutorial 仓库
            </a>
          </CardContent>
        </Card>
      )}

      {history.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">最近提交</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {history.slice(0, 8).map((s) => (
              <button
                key={s.id}
                type="button"
                className="w-full text-left text-xs p-2 border rounded hover:bg-muted"
                onClick={() => setFeedback(s.feedback)}
              >
                {s.labName} · {s.language} · {s.isPassed ? '通过' : '未通过'} ·{' '}
                {new Date(s.createdAt).toLocaleString()}
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
