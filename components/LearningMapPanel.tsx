'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useApp } from '@/lib/context/app-context';
import { STAGE_LABELS } from '@/lib/adaptive/stage';
import { buildPathNodes, buildTodaySteps, type TodayStep } from '@/lib/learning/path';
import {
  loadTodayProgress,
  markStepDone,
  stepsFingerprint,
} from '@/lib/learning/today-progress';

type NavMode = 'assess' | 'quiz' | 'practice' | 'plan' | 'chat' | 'wrongbook' | 'lab';

interface LearningMapPanelProps {
  onNavigate: (mode: NavMode) => void;
}

export function LearningMapPanel({ onNavigate }: LearningMapPanelProps) {
  const { user } = useApp();
  const [hasPlan, setHasPlan] = useState(false);
  const [autoPlanMsg, setAutoPlanMsg] = useState<string | null>(null);
  const [doneIds, setDoneIds] = useState<string[]>([]);

  const stage = user?.currentStage || 'pre_study_theory';
  const nodes = buildPathNodes(stage);
  const steps = buildTodaySteps({
    totalQuestions: user?.totalQuestions ?? 0,
    weakPoints: user?.weakPoints ?? [],
    currentStage: stage,
    hasPlan,
  });

  const stepIdsKey = steps.map((s) => s.id).join(',');
  const weakKey = (user?.weakPoints ?? []).join(',');
  const fingerprint = useMemo(
    () =>
      stepsFingerprint({
        currentStage: stage,
        totalQuestions: user?.totalQuestions ?? 0,
        weakPoints: user?.weakPoints ?? [],
        stepIds: stepIdsKey.split(',').filter(Boolean),
      }),
    [stage, user?.totalQuestions, weakKey, stepIdsKey]
  );

  const accuracy =
    user && user.totalQuestions > 0
      ? Math.round((user.correctAnswers / user.totalQuestions) * 100)
      : 0;

  // 探测是否已有计划；没有则静默生成一版，解决「没有学习计划」
  useEffect(() => {
    if (!user?.studentId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/plan?studentId=${encodeURIComponent(user.studentId)}`
        );
        const data = await res.json();
        if (cancelled) return;
        if (data.plan?.dailyTasks?.length) {
          setHasPlan(true);
          return;
        }
        // 自动生成
        const gen = await fetch('/api/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId: user.studentId, useLlm: false }),
        });
        const gd = await gen.json();
        if (!cancelled && gen.ok && gd.plan) {
          setHasPlan(true);
          setAutoPlanMsg('已为你自动生成今日学习计划（可在「学习计划」查看）');
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.studentId]);

  // 加载今日三步完成态
  useEffect(() => {
    if (!user?.studentId) {
      setDoneIds([]);
      return;
    }
    const p = loadTodayProgress(user.studentId, fingerprint);
    setDoneIds(p.done);
  }, [user?.studentId, fingerprint]);

  const handleStep = (step: TodayStep) => {
    if (user?.studentId) {
      const next = markStepDone(user.studentId, fingerprint, step.id);
      setDoneIds(next.done);
    }
    onNavigate(step.mode);
  };

  const doneCount = steps.filter((s) => doneIds.includes(s.id)).length;
  const allDone = steps.length > 0 && doneCount >= steps.length;

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
      {/* 顶部状态 */}
      <div>
        <h2 className="text-xl font-bold">学习地图</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {user?.name} · 当前阶段{' '}
          <span className="text-foreground font-medium">
            {STAGE_LABELS[stage] || stage}
          </span>
          {user && user.totalQuestions > 0 && (
            <>
              {' '}
              · 已答 {user.totalQuestions} 题 · 正确率 {accuracy}%
            </>
          )}
        </p>
        {autoPlanMsg && (
          <p className="text-xs text-green-700 mt-2 bg-green-50 border border-green-100 rounded px-2 py-1">
            {autoPlanMsg}
          </p>
        )}
      </div>

      {/* 今日三步 — 学员最需要 */}
      <Card className="border-primary/30 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between gap-2">
            <span>今日三步</span>
            <span className="text-xs font-normal text-muted-foreground">
              {doneCount}/{steps.length} 已点开
            </span>
          </CardTitle>
          <p className="text-xs text-muted-foreground font-normal">
            按顺序做；点开会记入今日进度（本机按日重置）。做完可再点「完成」打勾。
          </p>
          {allDone && (
            <p className="text-xs text-green-700 mt-1">今日三步都走过了，不错！可继续刷题或推进 lab。</p>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {steps.map((step, i) => {
            const done = doneIds.includes(step.id);
            return (
              <div
                key={step.id}
                className={`rounded-xl border transition-colors ${
                  done
                    ? 'border-green-200 bg-green-50/50'
                    : step.primary
                      ? 'border-primary bg-primary/5'
                      : ''
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleStep(step)}
                  className={`w-full text-left p-3 rounded-xl ${
                    done ? 'hover:bg-green-50' : 'hover:bg-muted/60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        done
                          ? 'bg-green-600 text-white'
                          : step.primary
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {done ? '✓' : i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`font-medium text-sm ${done ? 'line-through opacity-80' : ''}`}>
                        {step.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{step.detail}</p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 pt-1">
                      {done ? '再做一次 →' : '开始 →'}
                    </span>
                  </div>
                </button>
                {!done && user?.studentId && (
                  <div className="px-3 pb-2 flex justify-end">
                    <button
                      type="button"
                      className="text-[11px] text-muted-foreground underline hover:text-foreground"
                      onClick={() => {
                        const next = markStepDone(user.studentId, fingerprint, step.id);
                        setDoneIds(next.done);
                      }}
                    >
                      标记完成
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* 总体路径 — 类多邻国节点，训练营语义 */}
      <div>
        <h3 className="text-sm font-semibold mb-1">总体学习路径</h3>
        <p className="text-xs text-muted-foreground mb-4">
          节点是 OpenCamp 阶段与 lab。「更早阶段」仅表示你当前阶段在其后，不代表实验已完成。
        </p>

        <div className="relative pl-4">
          {/* 竖线 */}
          <div className="absolute left-[1.65rem] top-3 bottom-3 w-0.5 bg-border" />

          <ul className="space-y-0">
            {nodes.map((node) => (
              <li key={node.id} className="relative flex gap-4 pb-6 last:pb-0">
                {/* 节点圆点 */}
                <div
                  className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${
                    node.status === 'done'
                      ? 'border-green-600 bg-green-100 text-green-800'
                      : node.status === 'current'
                        ? 'border-primary bg-primary text-primary-foreground ring-4 ring-primary/20'
                        : 'border-muted-foreground/30 bg-background text-muted-foreground'
                  }`}
                >
                  {node.status === 'done' ? '✓' : node.index + 1}
                </div>

                <div
                  className={`flex-1 rounded-xl border p-3 ${
                    node.status === 'current'
                      ? 'border-primary bg-primary/5'
                      : node.status === 'locked'
                        ? 'opacity-55'
                        : 'bg-card'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-sm">{node.label}</p>
                    {node.status === 'current' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                        你在这里
                      </span>
                    )}
                    {node.status === 'done' && (
                      <span className="text-xs text-green-700" title="相对当前阶段更靠前，不代表 lab 已交">
                        更早阶段
                      </span>
                    )}
                    {node.status === 'locked' && (
                      <span className="text-xs text-muted-foreground">后续阶段</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{node.focus}</p>
                  {node.labs.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {node.labs.map((lab) => (
                        <code
                          key={lab}
                          className="text-[10px] bg-muted px-1.5 py-0.5 rounded"
                        >
                          {lab}
                        </code>
                      ))}
                    </div>
                  )}
                  {node.status === 'current' && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Button
                        size="sm"
                        onClick={() => onNavigate('practice')}
                      >
                        {(user?.weakPoints?.length ?? 0) > 0 ? '薄弱过关 3 题' : '练本阶段'}
                      </Button>
                      {node.labs[0] && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onNavigate('lab')}
                        >
                          实验 {node.labs[0]}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onNavigate('plan')}
                      >
                        今日计划
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onNavigate('chat')}
                      >
                        提问
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 快捷 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">更多</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => onNavigate('assess')}>
            再摸底
          </Button>
          <Button variant="outline" size="sm" onClick={() => onNavigate('wrongbook')}>
            错题本
          </Button>
          <Button variant="outline" size="sm" onClick={() => onNavigate('quiz')}>
            综合练习
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('chat')}
          >
            智能问答
          </Button>
          <a
            href="https://github.com/rcore-os/rCore-Tutorial-v3"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center text-xs underline text-muted-foreground px-2"
          >
            rCore 教程仓库
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
