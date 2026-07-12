'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useApp } from '@/lib/context/app-context';
import { ProgressPanel } from '@/components/ProgressPanel';

type Task = {
  id: string;
  task: string;
  type: string;
  estimatedMinutes: number;
};

type Plan = {
  currentStage: string;
  stageLabel?: string;
  dailyTasks: Task[];
  weeklyGoals: string[];
  estimatedDays?: number;
  recommendations?: string[];
  labs?: string[];
  focus?: string;
  source?: string;
};

export function PlanPanel({ studentId }: { studentId: string }) {
  const { user } = useApp();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProgress, setShowProgress] = useState(false);
  const [customText, setCustomText] = useState('');
  const [customMinutes, setCustomMinutes] = useState(30);
  const [customType, setCustomType] = useState('custom');
  const [savingCustom, setSavingCustom] = useState(false);

  const storageKey = studentId ? `opencamp-plan-check-${studentId}` : '';

  useEffect(() => {
    if (!studentId) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setChecked(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    // 加载计划；没有则自动生成（避免学员感觉「没有学习计划」）
    (async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/plan?studentId=${encodeURIComponent(studentId)}`);
        const data = await res.json();
        if (data.plan?.dailyTasks?.length) {
          setPlan(data.plan);
          return;
        }
        const gen = await fetch('/api/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId, useLlm: false }),
        });
        const gd = await gen.json();
        if (gen.ok && gd.plan) {
          setPlan(gd.plan);
        }
      } catch {
        /* ignore */
      } finally {
        setIsLoading(false);
      }
    })();
  }, [studentId, storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, JSON.stringify(checked));
  }, [checked, storageKey]);

  const generate = async (useLlm = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, useLlm }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '生成失败');
        return;
      }
      setPlan(data.plan);
      setChecked({});
    } catch {
      setError('网络错误');
    } finally {
      setIsLoading(false);
    }
  };

  const toggle = (id: string) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const persistTasks = async (dailyTasks: Task[]) => {
    if (!studentId) return;
    setSavingCustom(true);
    setError(null);
    try {
      const res = await fetch('/api/plan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          dailyTasks,
          weeklyGoals: plan?.weeklyGoals,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '保存失败');
        return;
      }
      setPlan((prev) =>
        prev
          ? { ...prev, dailyTasks: data.plan.dailyTasks, source: 'custom' }
          : {
              currentStage: user?.currentStage || 'pre_study_theory',
              dailyTasks: data.plan.dailyTasks,
              weeklyGoals: data.plan.weeklyGoals || [],
              source: 'custom',
            }
      );
    } catch {
      setError('保存自定义任务失败');
    } finally {
      setSavingCustom(false);
    }
  };

  const addCustomTask = async () => {
    const text = customText.trim();
    if (!text) return;
    const next: Task[] = [
      ...(plan?.dailyTasks || []),
      {
        id: `custom_${Date.now()}`,
        task: text,
        type: customType,
        estimatedMinutes: customMinutes || 30,
      },
    ];
    await persistTasks(next);
    setCustomText('');
  };

  const removeTask = async (id: string) => {
    if (!plan) return;
    const next = plan.dailyTasks.filter((t) => t.id !== id);
    await persistTasks(next);
    setChecked((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  if (showProgress) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-2 border-b">
          <button
            className="text-sm text-muted-foreground hover:text-foreground"
            onClick={() => setShowProgress(false)}
          >
            ← 返回任务清单
          </button>
        </div>
        <div className="flex-1 min-h-0">
          <ProgressPanel studentId={studentId} />
        </div>
      </div>
    );
  }

  const doneCount = plan
    ? plan.dailyTasks.filter((t) => checked[t.id]).length
    : 0;

  return (
    <div className="flex flex-col h-full p-4 space-y-4 overflow-y-auto">
      <div className="flex justify-between items-center gap-2 flex-wrap">
        <h2 className="text-lg font-semibold">学习计划</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowProgress(true)}>
            查看进度
          </Button>
          <Button size="sm" onClick={() => generate(false)} disabled={isLoading || !studentId}>
            {isLoading ? '生成中...' : plan ? '重新生成' : '生成今日计划'}
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        阶段：{plan?.stageLabel || user?.currentStage || '—'} · 已答{' '}
        {user?.totalQuestions ?? 0} 题
        {user?.weakPoints?.length
          ? ` · 薄弱：${user.weakPoints.slice(0, 3).join('、')}`
          : ''}
      </p>
      {plan?.focus && (
        <p className="text-xs text-muted-foreground">焦点：{plan.focus}</p>
      )}

      {error && (
        <div className="p-3 text-sm text-red-700 bg-red-50 rounded-lg">{error}</div>
      )}

      {!plan ? (
        <Card>
          <CardContent className="p-6 text-center space-y-3">
            <p className="text-muted-foreground text-sm">
              基于你的阶段与薄弱点生成可勾选任务（默认模板，无需 API Key）
            </p>
            <Button onClick={() => generate(false)} disabled={isLoading || !studentId}>
              生成今日计划
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex justify-between">
                <span>今日任务</span>
                <span className="text-muted-foreground font-normal">
                  {doneCount}/{plan.dailyTasks.length}
                  {plan.source ? ` · ${plan.source === 'llm' ? 'AI' : '模板'}` : ''}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {plan.dailyTasks.map((t) => (
                <div
                  key={t.id}
                  className={`flex items-start gap-3 p-3 border rounded-lg ${
                    checked[t.id] ? 'bg-muted/50 opacity-80' : 'hover:bg-muted/30'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={!!checked[t.id]}
                    onChange={() => toggle(t.id)}
                  />
                  <div className="flex-1 text-sm">
                    <p className={checked[t.id] ? 'line-through' : ''}>{t.task}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t.type} · 约 {t.estimatedMinutes} 分钟
                      {String(t.id).startsWith('custom_') ? ' · 自定义' : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-red-600 shrink-0"
                    title="删除任务"
                    onClick={() => void removeTask(t.id)}
                  >
                    删除
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">自定义任务</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                在模板计划上追加你自己的事项（如「今晚把 lab1 trap 看完」），会保存到服务端。
              </p>
              <textarea
                className="w-full p-2 border rounded text-sm min-h-[72px] bg-background"
                placeholder="写一条今日要做的事…"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
              />
              <div className="flex flex-wrap gap-2 items-center">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  类型
                  <select
                    className="border rounded p-1 text-sm bg-background"
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value)}
                  >
                    <option value="custom">自定义</option>
                    <option value="study">学习</option>
                    <option value="practice">练习</option>
                    <option value="review">复习</option>
                    <option value="lab">实验</option>
                  </select>
                </label>
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  分钟
                  <input
                    type="number"
                    min={5}
                    max={480}
                    className="w-16 border rounded p-1 text-sm bg-background"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(Number(e.target.value) || 30)}
                  />
                </label>
                <Button
                  size="sm"
                  onClick={() => void addCustomTask()}
                  disabled={!customText.trim() || savingCustom || !studentId}
                >
                  {savingCustom ? '保存中…' : '添加任务'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {plan.labs && plan.labs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">本阶段实验</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {plan.labs.map((lab) => (
                    <li key={lab}>
                      <code className="text-xs bg-muted px-1 rounded">{lab}</code>
                    </li>
                  ))}
                </ul>
                <a
                  className="text-xs underline text-muted-foreground mt-2 inline-block"
                  href="https://github.com/rcore-os/rCore-Tutorial-v3"
                  target="_blank"
                  rel="noreferrer"
                >
                  打开 rCore-Tutorial 仓库
                </a>
              </CardContent>
            </Card>
          )}

          {plan.weeklyGoals?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">本周目标</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {plan.weeklyGoals.map((g, i) => (
                    <li key={i}>{g}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {plan.recommendations && plan.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">建议</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 text-sm space-y-1 text-muted-foreground">
                  {plan.recommendations.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {typeof plan.estimatedDays === 'number' && (
            <p className="text-xs text-muted-foreground">
              预计约 {plan.estimatedDays} 天巩固当前阶段
            </p>
          )}
        </>
      )}
    </div>
  );
}
