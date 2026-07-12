'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type ReportPayload = {
  generatedAt: string;
  student: {
    id: string;
    name: string;
    currentStage: string;
    stageLabel: string;
    weakPoints: string[];
  };
  stats: {
    totalQuestions: number;
    correctAnswers: number;
    accuracyPercent: number;
    recentAccuracy: number;
    currentDifficulty: number;
    chatSessions: number;
    codeSubmissions: number;
  };
  labsForStage: string[];
  upgrade?: { eligible: boolean; suggestedStage: string | null; reason: string };
  recentWrong?: { content: string; yourAnswer: string }[];
  recentSubmissions?: {
    labName: string;
    language: string;
    isPassed: boolean;
    createdAt: string;
  }[];
  latestAssessment?: {
    theory: number;
    coding: number;
    rust: number;
    assessedAt: string;
  } | null;
};

export function ReportPanel({ studentId }: { studentId: string }) {
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<'md' | 'json'>('md');
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/report?studentId=${encodeURIComponent(studentId)}&format=json`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '加载失败');
        setReport(null);
        return;
      }
      setReport(data.report || null);
    } catch {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const openConfirm = (format: 'md' | 'json') => {
    setDownloadFormat(format);
    setConfirmOpen(true);
  };

  const doDownload = async () => {
    if (!studentId) return;
    setDownloading(true);
    try {
      const url =
        downloadFormat === 'md'
          ? `/api/report?studentId=${encodeURIComponent(studentId)}&format=md&download=1`
          : `/api/report?studentId=${encodeURIComponent(studentId)}&format=json`;
      const res = await fetch(url);
      if (!res.ok) {
        setError('下载失败');
        return;
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download =
        downloadFormat === 'md'
          ? `opencamp-report-${studentId.slice(0, 8)}.md`
          : `opencamp-report-${studentId.slice(0, 8)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
      setConfirmOpen(false);
    } catch {
      setError('下载失败');
    } finally {
      setDownloading(false);
    }
  };

  const r = report;

  return (
    <div className="h-full overflow-y-auto p-6 max-w-2xl mx-auto space-y-4">
      <div className="flex justify-between items-start gap-2 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">学习报告</h2>
          <p className="text-sm text-muted-foreground mt-1">
            先预览，确认后再下载，避免误触反复下载。
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            刷新预览
          </Button>
          <Button size="sm" onClick={() => openConfirm('md')} disabled={!studentId || loading}>
            下载 Markdown…
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => openConfirm('json')}
            disabled={!studentId || loading}
          >
            下载 JSON…
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-700 bg-red-50 rounded-lg border border-red-100">
          {error}
        </div>
      )}

      {loading && !r && (
        <p className="text-sm text-muted-foreground">加载报告预览…</p>
      )}

      {r && (
        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">概览</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p>
                学员：<strong>{r.student.name}</strong>
              </p>
              <p>
                阶段：{r.student.stageLabel}（{r.student.currentStage}）
              </p>
              <p>
                已答 {r.stats.totalQuestions} 题 · 正确 {r.stats.correctAnswers} · 正确率{' '}
                {r.stats.accuracyPercent}%
              </p>
              <p className="text-muted-foreground text-xs">
                近 20 题正确率 {Math.round((r.stats.recentAccuracy || 0) * 100)}% · 难度约{' '}
                {r.stats.currentDifficulty} · 生成于 {new Date(r.generatedAt).toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">薄弱点</CardTitle>
            </CardHeader>
            <CardContent>
              {r.student.weakPoints?.length ? (
                <div className="flex flex-wrap gap-1">
                  {r.student.weakPoints.map((w) => (
                    <span key={w} className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">
                      {w}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">（无）</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">本阶段实验</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {r.labsForStage?.length ? (
                <ul className="list-disc pl-5 space-y-1">
                  {r.labsForStage.map((l) => (
                    <li key={l}>
                      <code className="text-xs bg-muted px-1 rounded">{l}</code>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">本阶段以概念为主</p>
              )}
              {r.upgrade && (
                <p className="text-xs text-muted-foreground mt-2">
                  升级：
                  {r.upgrade.eligible
                    ? `可考虑升至 ${r.upgrade.suggestedStage}（${r.upgrade.reason}）`
                    : r.upgrade.reason}
                </p>
              )}
            </CardContent>
          </Card>

          {r.recentWrong && r.recentWrong.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">最近错题（节选）</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-xs space-y-2 text-muted-foreground">
                  {r.recentWrong.slice(0, 5).map((w, i) => (
                    <li key={i}>
                      {w.content}…（你的答案：{w.yourAnswer}）
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmOpen(false);
          }}
        >
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-base">确认下载？</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                将下载学习报告（
                {downloadFormat === 'md' ? 'Markdown .md' : 'JSON .json'}
                ）。仅在你确认后才会开始下载。
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={downloading}>
                  取消
                </Button>
                <Button onClick={() => void doDownload()} disabled={downloading}>
                  {downloading ? '下载中…' : '确认下载'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
