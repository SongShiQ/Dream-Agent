'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

type FoundationStatus = 'locked' | 'missing' | 'in_progress' | 'mastered';

type FoundationUnitProgress = {
  unit: {
    id: string;
    title: string;
    objective: string;
    estimatedMinutes: number;
    required: boolean;
    requiredCorrectRate: number;
  };
  status: FoundationStatus;
  correct: number;
  total: number;
  correctRate: number;
  evidence: string;
};

type QuizQuestion = {
  id: string;
  type: string;
  content: string;
  options: string[];
  knowledgePoints: string[];
  difficulty: number;
};

type FoundationResponse = {
  foundation: {
    masteredRequired: number;
    requiredTotal: number;
    units: FoundationUnitProgress[];
  };
};

function statusText(status: FoundationStatus): string {
  if (status === 'mastered') return '已达标';
  if (status === 'in_progress') return '进行中';
  if (status === 'locked') return '未解锁';
  return '待开始';
}

function statusClass(status: FoundationStatus): string {
  if (status === 'mastered') return 'bg-green-100 text-green-800 border-green-200';
  if (status === 'in_progress') return 'bg-blue-100 text-blue-800 border-blue-200';
  if (status === 'locked') return 'bg-muted text-muted-foreground border-border';
  return 'bg-amber-100 text-amber-800 border-amber-200';
}

export function FoundationUnitPanel({
  studentId,
  recommendedUnitId,
  onPractice,
}: {
  studentId: string;
  recommendedUnitId?: string | null;
  onPractice: () => void;
}) {
  const [units, setUnits] = useState<FoundationUnitProgress[]>([]);
  const [summary, setSummary] = useState({ masteredRequired: 0, requiredTotal: 0 });
  const [error, setError] = useState<string | null>(null);
  const [activeAttempt, setActiveAttempt] = useState<{
    id: string;
    unitId: string;
    requiredCorrectRate: number;
  } | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busyUnitId, setBusyUnitId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadFoundation = async () => {
    const params = new URLSearchParams({ studentId });
    const res = await fetch(`/api/foundation?${params.toString()}`);
    const data = (await res.json()) as FoundationResponse | { error?: string };
    if (!res.ok || !('foundation' in data)) {
      throw new Error(('error' in data && data.error) || '导学单元加载失败');
    }
    setUnits(data.foundation.units);
    setSummary({
      masteredRequired: data.foundation.masteredRequired,
      requiredTotal: data.foundation.requiredTotal,
    });
  };

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        await loadFoundation();
        if (cancelled) return;
      } catch {
        if (!cancelled) setError('导学单元加载失败');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const startQuiz = async (unitId: string) => {
    try {
      setBusyUnitId(unitId);
      setError(null);
      setMessage(null);
      const res = await fetch('/api/foundation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          action: 'start',
          unitId,
          highStakes: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg =
          data.error === 'HIGH_STAKES_LIMIT_REACHED'
            ? '今天这个单元的高 stakes 小测次数已用完，明天再来。'
            : data.error || '小测创建失败';
        setError(msg);
        return;
      }
      setActiveAttempt({
        id: data.attempt.id,
        unitId: data.attempt.unitId,
        requiredCorrectRate: data.attempt.requiredCorrectRate,
      });
      setQuestions(data.questions || []);
      setAnswers({});
      setMessage('小测已开始：提交后会成为导学微单元达标证据。');
    } catch {
      setError('小测创建失败');
    } finally {
      setBusyUnitId(null);
    }
  };

  const submitQuiz = async () => {
    if (!activeAttempt) return;
    try {
      setBusyUnitId(activeAttempt.unitId);
      setError(null);
      setMessage(null);
      const res = await fetch('/api/foundation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          action: 'submit',
          attemptId: activeAttempt.id,
          answers: questions.map((question) => ({
            questionId: question.id,
            answer: answers[question.id] || '',
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '小测提交失败');
        return;
      }
      const passed = data.attempt?.status === 'passed';
      setMessage(
        passed
          ? `小测通过：${data.attempt.correct}/${data.attempt.total}，已形成 mastered 证据。`
          : `小测未达标：${data.attempt.correct}/${data.attempt.total}，建议先复习后再挑战。`
      );
      setActiveAttempt(null);
      setQuestions([]);
      setAnswers({});
      await loadFoundation();
    } catch {
      setError('小测提交失败');
    } finally {
      setBusyUnitId(null);
    }
  };

  if (error) {
    // 错误不让整个导学区域消失；下面仍会渲染已有状态。
  }

  if (units.length === 0) return null;

  return (
    <div className="rounded-lg border p-3 bg-card">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-sm font-semibold">导学微单元</p>
          <p className="text-xs text-muted-foreground">
            {summary.masteredRequired}/{summary.requiredTotal} 个必修单元达标；诊断只推荐，达标看小测证据。
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onPractice}>
          做推荐练习
        </Button>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50/50 p-2 text-xs text-red-700">
          {error}
        </div>
      )}
      {message && (
        <div className="mb-3 rounded-lg border border-green-200 bg-green-50/50 p-2 text-xs text-green-700">
          {message}
        </div>
      )}

      {activeAttempt && questions.length > 0 && (
        <div className="mb-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <p className="text-sm font-semibold">微单元小测</p>
            <p className="text-xs text-muted-foreground">
              达标线：{activeAttempt.requiredCorrectRate}%
            </p>
          </div>
          <div className="space-y-3">
            {questions.map((question, index) => (
              <div key={question.id} className="rounded-lg border bg-background p-2">
                <p className="text-sm">
                  {index + 1}. {question.content}
                </p>
                {question.options.length > 0 ? (
                  <div className="mt-2 grid gap-1">
                    {question.options.map((option) => (
                      <label
                        key={option}
                        className="flex items-center gap-2 rounded border px-2 py-1 text-xs hover:bg-muted/60"
                      >
                        <input
                          type="radio"
                          name={question.id}
                          value={option}
                          checked={answers[question.id] === option}
                          onChange={() =>
                            setAnswers((prev) => ({ ...prev, [question.id]: option }))
                          }
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <input
                    className="mt-2 w-full rounded border bg-background px-2 py-1 text-sm"
                    placeholder="输入答案"
                    value={answers[question.id] || ''}
                    onChange={(event) =>
                      setAnswers((prev) => ({ ...prev, [question.id]: event.target.value }))
                    }
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setActiveAttempt(null);
                setQuestions([]);
                setAnswers({});
              }}
            >
              先不提交
            </Button>
            <Button
              size="sm"
              disabled={busyUnitId === activeAttempt.unitId}
              onClick={() => void submitQuiz()}
            >
              提交小测
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-2 md:grid-cols-2">
        {units.map((item) => {
          const recommended = item.unit.id === recommendedUnitId;
          return (
            <div
              key={item.unit.id}
              className={`rounded-lg border p-2.5 ${
                recommended ? 'border-primary/50 bg-primary/5' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  {item.unit.title}
                  {recommended && (
                    <span className="ml-1 text-[10px] text-primary">推荐</span>
                  )}
                </p>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded border ${statusClass(
                    item.status
                  )}`}
                >
                  {statusText(item.status)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {item.unit.objective}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {item.evidence}
              </p>
              <div className="mt-2 flex justify-end">
                <Button
                  size="sm"
                  variant={recommended ? 'default' : 'outline'}
                  disabled={item.status === 'locked' || busyUnitId === item.unit.id}
                  onClick={() => void startQuiz(item.unit.id)}
                >
                  {item.status === 'mastered' ? '再测一次' : '开始小测'}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
