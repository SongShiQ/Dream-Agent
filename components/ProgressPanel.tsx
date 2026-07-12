'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useApp } from '@/lib/context/app-context';
import { STAGE_LABELS as CORE_LABELS, STAGE_ORDER, STAGE_LABS } from '@/lib/adaptive/stage';

interface ProgressData {
  studentId: string;
  currentStage: string;
  totalQuestions: number;
  correctAnswers: number;
  recentAccuracy: number;
  currentDifficulty: number;
  weakPoints: string[];
}

interface ProgressPanelProps {
  studentId: string;
  onBack?: () => void;
}

const STAGE_LABELS: Record<string, string> = {
  ...CORE_LABELS,
  A1: '导学-零基础',
  A2: '导学-有编程经验',
  B1: '基础-Rust 入门',
  C1: '专业-批处理',
};

const STAGES = [...STAGE_ORDER];

export function ProgressPanel({ studentId, onBack }: ProgressPanelProps) {
  const { updateProfile } = useApp();
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) {
      setIsLoading(false);
      setError('无学员 ID');
      return;
    }
    fetchProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const fetchProgress = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/student?id=${encodeURIComponent(studentId)}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '加载失败');
        setProgress(null);
        return;
      }

      if (data.student) {
        let weak: string[] = [];
        try {
          weak = Array.isArray(data.student.weakPoints)
            ? data.student.weakPoints
            : JSON.parse(data.student.weakPoints || '[]');
        } catch {
          weak = [];
        }

        const stats = data.student.stats || {};
        const p: ProgressData = {
          studentId: data.student.id,
          currentStage: data.student.currentStage,
          totalQuestions: stats.totalQuestions ?? data.student._count?.answerRecords ?? 0,
          correctAnswers: stats.correctAnswers ?? 0,
          recentAccuracy: stats.recentAccuracy ?? 0,
          currentDifficulty: stats.currentDifficulty ?? 50,
          weakPoints: weak,
        };
        setProgress(p);
        updateProfile({
          totalQuestions: p.totalQuestions,
          correctAnswers: p.correctAnswers,
          currentStage: p.currentStage,
          weakPoints: p.weakPoints,
          currentDifficulty: p.currentDifficulty,
        });
      }
    } catch (e) {
      console.error('Failed to fetch progress:', e);
      setError('网络错误');
    } finally {
      setIsLoading(false);
    }
  };

  const getStageIndex = (stage: string) => {
    const i = (STAGES as readonly string[]).indexOf(stage);
    return i >= 0 ? i : 0;
  };

  const getProgressPercent = () => {
    if (!progress) return 0;
    const currentIndex = getStageIndex(progress.currentStage);
    return Math.round((currentIndex / (STAGES.length - 1)) * 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  if (error || !progress) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <p className="text-muted-foreground">{error || '暂无进度数据'}</p>
        <button
          onClick={fetchProgress}
          className="text-sm px-3 py-1.5 border rounded-lg hover:bg-muted"
        >
          重试
        </button>
      </div>
    );
  }

  const accuracy =
    progress.totalQuestions > 0
      ? Math.round((progress.correctAnswers / progress.totalQuestions) * 100)
      : 0;

  return (
    <div className="flex flex-col h-full p-4 space-y-4 overflow-y-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">学习进度</h2>
        <div className="flex gap-2">
          <button
            onClick={fetchProgress}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            刷新
          </button>
          {onBack && (
            <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground">
              返回聊天
            </button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">总体进度</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>
                当前阶段: {STAGE_LABELS[progress.currentStage] || progress.currentStage}
              </span>
              <span>{getProgressPercent()}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-3">
              <div
                className="bg-primary h-3 rounded-full transition-all"
                style={{ width: `${getProgressPercent()}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">学习统计（服务端）</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold">{progress.totalQuestions}</p>
              <p className="text-xs text-muted-foreground">已答题数</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold">{accuracy}%</p>
              <p className="text-xs text-muted-foreground">正确率</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold">{progress.currentDifficulty}</p>
              <p className="text-xs text-muted-foreground">当前难度</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold">
                {Math.round((progress.recentAccuracy || 0) * 100)}%
              </p>
              <p className="text-xs text-muted-foreground">近 20 题正确率</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="flex-1 overflow-hidden">
        <CardHeader>
          <CardTitle className="text-sm">阶段进度</CardTitle>
        </CardHeader>
        <CardContent className="overflow-y-auto max-h-64">
          <div className="space-y-2">
            {STAGES.map((stage, index) => {
              const currentIndex = getStageIndex(progress.currentStage);
              const isCompleted = index < currentIndex;
              const isCurrent = index === currentIndex;
              const isLocked = index > currentIndex;

              return (
                <div
                  key={stage}
                  className={`flex items-center gap-3 p-2 rounded ${
                    isCurrent ? 'bg-primary/10 border border-primary' : ''
                  } ${isLocked ? 'opacity-50' : ''}`}
                >
                  <span className="text-lg">
                    {isCompleted ? '✓' : isCurrent ? '►' : '○'}
                  </span>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${isCurrent ? 'text-primary' : ''}`}>
                      {STAGE_LABELS[stage] || stage}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {progress.weakPoints.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">薄弱知识点</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {progress.weakPoints.map((point, i) => (
                <span key={i} className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                  {point}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">训练营实验线索</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p className="text-muted-foreground">
            当前：{STAGE_LABELS[progress.currentStage] || progress.currentStage}
          </p>
          {(STAGE_LABS[progress.currentStage] || []).length > 0 ? (
            <ul className="list-disc pl-5 space-y-1">
              {(STAGE_LABS[progress.currentStage] || []).map((lab) => (
                <li key={lab}>
                  <code className="text-xs bg-muted px-1 rounded">{lab}</code>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-xs">
              本阶段以概念与刷题为主，暂无强制 lab。
            </p>
          )}
          <a
            className="text-xs underline text-muted-foreground hover:text-foreground"
            href="https://github.com/rcore-os/rCore-Tutorial-v3"
            target="_blank"
            rel="noreferrer"
          >
            rCore-Tutorial-v3 文档
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
