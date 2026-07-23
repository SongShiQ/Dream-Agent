'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FoundationUnitPanel } from '@/components/FoundationUnitPanel';

type NavMode = 'assess' | 'quiz' | 'practice' | 'plan' | 'chat' | 'wrongbook' | 'lab';

type EvidenceState = 'viewed' | 'personal_done' | 'mastered' | 'missing';

type Dashboard = {
  student: {
    id: string;
    name: string;
    currentStage: string;
    stageLabel: string;
    weakPoints: string[];
  };
  dailyProgress: {
    done: string[];
  };
  foundation?: {
    masteredRequired: number;
    requiredTotal: number;
    recommendedUnit: null | {
      id: string;
      title: string;
      status: string;
      objective: string;
      evidence: string;
    };
  };
  reviewQueue?: {
    dueCount: number;
    items: Array<{
      targetType: 'foundation_unit' | 'gate';
      targetId: string;
      title: string;
      dueDate: string;
      daysOverdue: number;
    }>;
  };
  todaySteps: {
    id: string;
    title: string;
    detail: string;
    mode: NavMode;
  }[];
  primaryTask: null | {
    id: string;
    title: string;
    mode: NavMode;
    evidenceRequired: string;
  };
  conditions: {
    id: string;
    label: string;
    state: EvidenceState;
    evidence: string;
  }[];
  gates: {
    id: string;
    title: string;
    status: string;
    mastered: boolean;
    evidence: string | null;
  }[];
};

function stateLabel(state: EvidenceState): string {
  if (state === 'mastered') return '已达标';
  if (state === 'personal_done') return '个人完成';
  if (state === 'viewed') return '已浏览/有记录';
  return '缺失';
}

function stateClass(state: EvidenceState): string {
  if (state === 'mastered') return 'bg-green-100 text-green-800 border-green-200';
  if (state === 'personal_done') return 'bg-blue-100 text-blue-800 border-blue-200';
  if (state === 'viewed') return 'bg-amber-100 text-amber-800 border-amber-200';
  return 'bg-muted text-muted-foreground border-border';
}

export function StudentHomePanel({
  studentId,
  onNavigate,
}: {
  studentId: string;
  onNavigate: (mode: NavMode | 'wrongbook') => void;
}) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoStartUnitId, setAutoStartUnitId] = useState<string | null>(null);
  const [autoStartHighStakes, setAutoStartHighStakes] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams({ studentId });
        const res = await fetch(`/api/me/dashboard?${params.toString()}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || '状态加载失败');
          return;
        }
        setDashboard(data.dashboard);
      } catch {
        if (!cancelled) setError('状态加载失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  if (loading && !dashboard) {
    return (
      <Card className="border-primary/20">
        <CardContent className="p-4 text-sm text-muted-foreground">
          正在加载你的当前状态…
        </CardContent>
      </Card>
    );
  }

  if (error && !dashboard) {
    return (
      <Card className="border-red-200 bg-red-50/50">
        <CardContent className="p-4 text-sm text-red-700">{error}</CardContent>
      </Card>
    );
  }

  if (!dashboard) return null;

  const firstStep = dashboard.todaySteps[0];
  const primary =
    dashboard.primaryTask ||
    (firstStep
      ? {
          id: firstStep.id,
          title: firstStep.title,
          mode: firstStep.mode,
          evidenceRequired: '完成个人任务只记录 personal_done',
        }
      : null);
  const masteredCount = dashboard.gates.filter((g) => g.mastered).length;
  const nextMissing = dashboard.conditions.find((c) => c.state === 'missing');
  const stuckMode: NavMode | 'wrongbook' =
    dashboard.student.weakPoints.length > 0 ? 'wrongbook' : 'chat';

  return (
    <Card className="border-primary/30 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex flex-wrap items-center justify-between gap-2">
          <span>我的状态与下一步</span>
          <span className="text-xs font-normal text-muted-foreground">
            {dashboard.student.stageLabel} · OJ {masteredCount}/{dashboard.gates.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-lg border p-3 bg-primary/5 border-primary/20">
            <p className="text-xs text-muted-foreground mb-1">唯一主任务</p>
            <p className="font-semibold text-sm">{primary?.title || '生成今日计划'}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {primary?.evidenceRequired || '个人完成态不等于课程达标'}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button
                size="sm"
                onClick={() => {
                  if (primary?.id.startsWith('foundation:')) {
                    setAutoStartHighStakes(true);
                    setAutoStartUnitId(primary.id.slice('foundation:'.length));
                    return;
                  }
                  if (primary?.id.startsWith('review:foundation_unit:')) {
                    setAutoStartHighStakes(false);
                    setAutoStartUnitId(primary.id.slice('review:foundation_unit:'.length));
                    return;
                  }
                  onNavigate(primary?.mode || 'plan');
                }}
              >
                开始
              </Button>
              <Button size="sm" variant="outline" onClick={() => onNavigate(stuckMode)}>
                卡住了
              </Button>
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground mb-1">卡住时怎么走</p>
            <p className="text-sm">
              {dashboard.student.weakPoints.length > 0
                ? `先处理薄弱点：${dashboard.student.weakPoints.slice(0, 3).join('、')}`
                : nextMissing
                  ? `先补证据：${nextMissing.label}`
                  : '继续推进下一关，保留提交记录'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              公开样例、错题订正和问答都能帮你脱困，但只有小测达标或 OJ AC 会变成 mastered。
            </p>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-3">
          {dashboard.conditions.map((c) => (
            <div key={c.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{c.label}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${stateClass(c.state)}`}>
                  {stateLabel(c.state)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{c.evidence}</p>
            </div>
          ))}
        </div>

        {dashboard.foundation?.recommendedUnit && (
          <div className="rounded-lg border p-3 bg-primary/5 border-primary/20">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground mb-1">推荐导学微单元</p>
                <p className="text-sm font-semibold">
                  {dashboard.foundation.recommendedUnit.title}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {dashboard.foundation.recommendedUnit.objective}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {dashboard.foundation.recommendedUnit.evidence}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => onNavigate('practice')}>
                去专项练习
              </Button>
            </div>
          </div>
        )}

        <FoundationUnitPanel
          studentId={studentId}
          recommendedUnitId={dashboard.foundation?.recommendedUnit?.id}
          autoStartUnitId={autoStartUnitId}
          autoStartHighStakes={autoStartHighStakes}
          onAutoStartHandled={() => setAutoStartUnitId(null)}
          onPractice={() => onNavigate('practice')}
        />
        {dashboard.reviewQueue && dashboard.reviewQueue.dueCount > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
            <p className="text-sm font-semibold">到期复习 {dashboard.reviewQueue.dueCount} 项</p>
            <p className="mt-1 text-xs text-muted-foreground">
              复习结果只调整下次日期；不会把未通过的小测/OJ 改成 mastered。
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {dashboard.reviewQueue.items.slice(0, 3).map((review) => (
                <Button
                  key={`${review.targetType}:${review.targetId}`}
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (review.targetType === 'foundation_unit') {
                      setAutoStartHighStakes(false);
                      setAutoStartUnitId(review.targetId);
                      return;
                    }
                    onNavigate('lab');
                  }}
                >
                  {review.title}{review.daysOverdue > 0 ? ` · 逾期 ${review.daysOverdue} 天` : ' · 今日'}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
