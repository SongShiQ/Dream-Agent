'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StudentHomePanel } from '@/components/StudentHomePanel';
import { useApp } from '@/lib/context/app-context';
import { STAGE_CHAPTERS, STAGE_LABELS } from '@/lib/adaptive/stage';
import {
  buildPathNodes,
  buildTodaySteps,
  type PathNode,
  type TodayStep,
} from '@/lib/learning/path';
import {
  fetchTodayProgress,
  setTodayTaskDone,
  stepsFingerprint,
} from '@/lib/learning/today-progress';

type NavMode = 'assess' | 'quiz' | 'practice' | 'plan' | 'chat' | 'wrongbook' | 'lab';

type DashboardLite = {
  gates?: {
    mastered: boolean;
    stageIds?: string[];
  }[];
};

interface LearningMapPanelProps {
  onNavigate: (mode: NavMode) => void;
}

export function LearningMapPanel({ onNavigate }: LearningMapPanelProps) {
  const { user } = useApp();
  const [hasPlan, setHasPlan] = useState(false);
  const [autoPlanMsg, setAutoPlanMsg] = useState<string | null>(null);
  const [doneIds, setDoneIds] = useState<string[]>([]);
  const [dashboard, setDashboard] = useState<DashboardLite | null>(null);

  const stage = user?.currentStage || 'pre_study_theory';
  const masteredStages =
    dashboard?.gates
      ?.filter((g) => g.mastered)
      .flatMap((g) => g.stageIds || []) || [];
  const nodes = buildPathNodes(stage, { masteredStages });
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

  // 读取服务端证据聚合：地图节点只根据 mastered 证据显示已达标
  useEffect(() => {
    if (!user?.studentId) {
      setDashboard(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({ studentId: user.studentId });
        const res = await fetch(`/api/me/dashboard?${params.toString()}`);
        const data = await res.json();
        if (!cancelled && res.ok) setDashboard(data.dashboard);
      } catch {
        if (!cancelled) setDashboard(null);
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
    let cancelled = false;
    (async () => {
      const p = await fetchTodayProgress({
        studentId: user.studentId,
        fingerprint,
      });
      if (!cancelled) setDoneIds(p.done);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.studentId, fingerprint]);

  const handleStep = async (step: TodayStep) => {
    if (user?.studentId) {
      const next = await setTodayTaskDone({
        studentId: user.studentId,
        fingerprint,
        taskId: step.id,
        done: true,
      });
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

      {user?.studentId && (
        <StudentHomePanel studentId={user.studentId} onNavigate={onNavigate} />
      )}

      {/* 今日三步 — 学员最需要 */}
      <Card className="border-primary/30 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between gap-2">
            <span>今日三步</span>
            <span className="text-xs font-normal text-muted-foreground">
              {doneCount}/{steps.length} personal_done
            </span>
          </CardTitle>
          <p className="text-xs text-muted-foreground font-normal">
            按顺序做；这里记录的是个人完成态，不代表课程达标或 OJ 通过。
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
                  onClick={() => void handleStep(step)}
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
                      onClick={async () => {
                        const next = await setTodayTaskDone({
                          studentId: user.studentId,
                          fingerprint,
                          taskId: step.id,
                          done: true,
                        });
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

      {/* 大章横向导航 + 本章小节列表 */}
      <ChapterPathSection
        nodes={nodes}
        weakCount={user?.weakPoints?.length ?? 0}
        onNavigate={onNavigate}
      />

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

/** 大章横栏导航 + 下方本章小节 */
function ChapterPathSection({
  nodes,
  weakCount,
  onNavigate,
}: {
  nodes: PathNode[];
  weakCount: number;
  onNavigate: (mode: NavMode) => void;
}) {
  const current = nodes.find((n) => n.status === 'current') || nodes[0];
  const chapterList = STAGE_CHAPTERS.map((ch) => ({
    ...ch,
    nodes: nodes.filter((n) => ch.stages.includes(n.stage)),
  })).filter((ch) => ch.nodes.length > 0);

  const currentChapterId =
    chapterList.find((ch) => ch.nodes.some((n) => n.status === 'current'))?.id ||
    chapterList[0]?.id;

  const [activeChapterId, setActiveChapterId] = useState(currentChapterId);

  useEffect(() => {
    setActiveChapterId(currentChapterId);
  }, [currentChapterId]);

  const active =
    chapterList.find((c) => c.id === activeChapterId) || chapterList[0];
  const chapterNodes = active?.nodes || [];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold mb-1">学习路径</h3>
        <p className="text-xs text-muted-foreground mb-3">
          先选大章，再看本章小节。箭头表示推荐顺序，勿跳章硬闯。
        </p>

        {/* 大章横向导航 */}
        <div className="flex items-stretch gap-1 overflow-x-auto pb-2">
          {chapterList.map((ch, i) => {
            const hasCurrent = ch.nodes.some((n) => n.status === 'current');
            const allDone = ch.nodes.every((n) => n.status === 'done');
            const selected = ch.id === active?.id;
            return (
              <div key={ch.id} className="flex items-center shrink-0">
                {i > 0 && (
                  <span
                    className="px-1.5 text-muted-foreground text-sm select-none"
                    aria-hidden
                  >
                    →
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setActiveChapterId(ch.id)}
                  className={`px-3 py-2.5 rounded-xl border text-left min-w-[7.5rem] transition-colors ${
                    selected
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                      : hasCurrent
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <span className="block text-sm font-semibold">{ch.label}</span>
                  <span className="block text-[10px] text-muted-foreground mt-0.5">
                    {allDone
                      ? '本章已达标'
                      : hasCurrent
                        ? '进行中'
                        : `${ch.nodes.length} 个小节`}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 本章内容 */}
      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex flex-wrap items-center justify-between gap-2">
            <span>{active?.label || '本章'} · 小节</span>
            {current && (
              <span className="text-xs font-normal text-muted-foreground">
                全局当前位置：{current.label}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {chapterNodes.map((node) => (
            <div
              key={node.id}
              className={`rounded-xl border p-3 ${
                node.status === 'current'
                  ? 'border-primary bg-primary/5'
                  : node.status === 'locked'
                    ? 'opacity-60'
                    : 'bg-card'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold border-2 ${
                      node.status === 'done'
                        ? 'border-green-600 bg-green-100 text-green-800'
                        : node.status === 'current'
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-muted-foreground/30 text-muted-foreground'
                    }`}
                  >
                    {node.status === 'done' ? '✓' : node.index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{node.label}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {node.focus}
                    </p>
                  </div>
                </div>
                {node.status === 'current' && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary text-primary-foreground shrink-0">
                    你在这里
                  </span>
                )}
                {node.status === 'done' && (
                  <span className="text-xs text-green-700 shrink-0">已达标</span>
                )}
                {node.status === 'locked' && (
                  <span className="text-xs text-muted-foreground shrink-0">未解锁</span>
                )}
              </div>
              {node.labs.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2 pl-10">
                  {node.labs.map((lab) => (
                    <code key={lab} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                      {lab}
                    </code>
                  ))}
                </div>
              )}
              {node.status === 'current' && (
                <div className="flex flex-wrap gap-2 mt-3 pl-10">
                  <Button size="sm" onClick={() => onNavigate('practice')}>
                    {weakCount > 0 ? '薄弱过关 3 题' : '练本小节'}
                  </Button>
                  {node.labs[0] && (
                    <Button size="sm" variant="outline" onClick={() => onNavigate('lab')}>
                      实验 {node.labs[0]}
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => onNavigate('plan')}>
                    今日计划
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onNavigate('chat')}>
                    提问
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
