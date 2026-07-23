'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, Play, X } from 'lucide-react';
import { MarkdownBody } from '@/components/MarkdownBody';
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

type QuizDiagnosis = {
  unitId: string;
  status: 'passed' | 'failed';
  weakPoints: Array<{
    tag: string;
    incorrect: number;
    total: number;
    errorRate: number;
  }>;
  recommendedCards: Array<{
    id: string;
    title: string;
    matchedTags: string[];
  }>;
  summary: string;
  nextAction: { kind: string; label: string };
};

type FoundationTopicPack = {
  id: string;
  unitId: string;
  title: string;
  learningObjectives: string[];
  misconceptions: Array<{
    id: string;
    label: string;
    questionTags: string[];
  }>;
  questionCoverage: Array<{
    tag: string;
    label: string;
    questions: number;
  }>;
  remediationCards: Array<{ id: string; title: string }>;
  nextTask: {
    unitId: string;
    title: string;
    label: string;
    valid: boolean;
    status: FoundationStatus | 'missing';
  };
  ready: boolean;
  completedChecks: number;
  totalChecks: number;
};

type FoundationResponse = {
  foundation: {
    masteredRequired: number;
    requiredTotal: number;
    latestDiagnosis?: QuizDiagnosis | null;
    topicPacks?: FoundationTopicPack[];
    units: FoundationUnitProgress[];
  };
};

type KnowledgeCardDetail = {
  id: string;
  title: string;
  content: string;
  reviewStatus: 'reviewed' | 'pending';
  sourceRefs: string[];
  sources: Array<{
    id: string;
    title: string;
    url?: string;
    kind?: string;
    version?: string;
  }>;
  source: string;
  questionTags: string[];
};

type KnowledgeCardReader = {
  unitId: string;
  cardId: string;
  loading: boolean;
  card?: KnowledgeCardDetail;
  error?: string;
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
  autoStartUnitId,
  autoStartHighStakes = true,
  onAutoStartHandled,
  onPractice,
}: {
  studentId: string;
  recommendedUnitId?: string | null;
  autoStartUnitId?: string | null;
  autoStartHighStakes?: boolean;
  onAutoStartHandled?: () => void;
  onPractice: () => void;
}) {
  const [units, setUnits] = useState<FoundationUnitProgress[]>([]);
  const [topicPacks, setTopicPacks] = useState<FoundationTopicPack[]>([]);
  const [summary, setSummary] = useState({ masteredRequired: 0, requiredTotal: 0 });
  const [error, setError] = useState<string | null>(null);
  const [activeAttempt, setActiveAttempt] = useState<{
    id: string;
    unitId: string;
    requiredCorrectRate: number;
    mode: 'practice' | 'high_stakes';
  } | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busyUnitId, setBusyUnitId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState<QuizDiagnosis | null>(null);
  const [reader, setReader] = useState<KnowledgeCardReader | null>(null);

  const loadFoundation = async () => {
    const params = new URLSearchParams({ studentId });
    const res = await fetch(`/api/foundation?${params.toString()}`);
    const data = (await res.json()) as FoundationResponse | { error?: string };
    if (!res.ok || !('foundation' in data)) {
      throw new Error(('error' in data && data.error) || '导学单元加载失败');
    }
    setUnits(data.foundation.units);
    setTopicPacks(data.foundation.topicPacks || []);
    setSummary({
      masteredRequired: data.foundation.masteredRequired,
      requiredTotal: data.foundation.requiredTotal,
    });
    setDiagnosis(data.foundation.latestDiagnosis || null);
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

  useEffect(() => {
    if (!autoStartUnitId || units.length === 0 || activeAttempt || busyUnitId) return;
    const target = units.find((item) => item.unit.id === autoStartUnitId);
    if (target && target.status !== 'locked') {
      void startQuiz(target.unit.id, autoStartHighStakes);
      onAutoStartHandled?.();
    }
  }, [autoStartUnitId, autoStartHighStakes, units, activeAttempt, busyUnitId, onAutoStartHandled]);

  useEffect(() => {
    if (!reader) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setReader(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [reader]);

  const openKnowledgeCard = async (unitId: string, cardId: string) => {
    setReader({ unitId, cardId, loading: true });
    try {
      const params = new URLSearchParams({ id: cardId });
      const res = await fetch(`/api/knowledge?${params.toString()}`);
      const data = (await res.json()) as { card?: KnowledgeCardDetail; error?: string };
      if (!res.ok || !data.card) {
        throw new Error(data.error || '知识卡加载失败');
      }
      setReader((current) =>
        current?.unitId === unitId && current.cardId === cardId
          ? { unitId, cardId, loading: false, card: data.card }
          : current
      );
    } catch {
      setReader((current) =>
        current?.unitId === unitId && current.cardId === cardId
          ? { unitId, cardId, loading: false, error: '知识卡加载失败，请稍后重试。' }
          : current
      );
    }
  };

  const startQuiz = async (unitId: string, highStakes = true) => {
    try {
      setBusyUnitId(unitId);
      setError(null);
      setMessage(null);
      setDiagnosis(null);
      const res = await fetch('/api/foundation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          action: 'start',
          unitId,
          highStakes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg =
          data.error === 'HIGH_STAKES_LIMIT_REACHED'
            ? '今天这个单元的高 stakes 小测次数已用完，明天再来。'
            : data.error === 'FOUNDATION_UNIT_LOCKED'
              ? `请先完成：${Array.isArray(data.unlockAfter) ? data.unlockAfter.join('、') : '前置微单元'}`
            : data.error === 'QUESTION_SET_INSUFFICIENT'
              ? `这个单元目前只有 ${data.available ?? 0} 道匹配题，暂不能生成可信小测；请先补齐题目。`
            : data.error || '小测创建失败';
        setError(msg);
        return;
      }
      setActiveAttempt({
        id: data.attempt.id,
        unitId: data.attempt.unitId,
        requiredCorrectRate: data.attempt.requiredCorrectRate,
        mode: data.attempt.mode,
      });
      setQuestions(data.questions || []);
      setAnswers({});
      setMessage(
        highStakes
          ? '小测已开始：提交后会成为导学微单元达标证据。'
          : '到期复习已开始：结果只更新复习调度，不替代 mastered 证据。'
      );
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
        setError(
          data.error === 'ATTEMPT_QUESTION_SET_STALE' || data.error === 'ATTEMPT_UNIT_STALE'
            ? '这次小测的题目已经变化，结果未计入；请重新开始。'
            : data.error || '小测提交失败'
        );
        return;
      }
      const passed = data.attempt?.status === 'passed';
      setMessage(
        passed && activeAttempt.mode === 'high_stakes'
          ? `小测通过：${data.attempt.correct}/${data.attempt.total}，已形成 mastered 证据。`
          : passed
            ? `复习完成：${data.attempt.correct}/${data.attempt.total}，已更新下次复习日期；不改变 mastered。`
            : `小测未达标：${data.attempt.correct}/${data.attempt.total}，建议先复习后再挑战。`
      );
      setDiagnosis(data.diagnosis || null);
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
      {diagnosis && (
        <div className="mb-3 border-l-2 border-primary pl-3 text-xs">
          <p className="font-medium text-foreground">{diagnosis.summary}</p>
          {diagnosis.weakPoints.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
              {diagnosis.weakPoints.slice(0, 4).map((point) => (
                <span key={point.tag}>
                  {point.tag}：错 {point.incorrect}/{point.total}
                </span>
              ))}
            </div>
          )}
          {diagnosis.recommendedCards.length > 0 && (
            <div className="mt-1 space-y-0.5 text-muted-foreground">
              {diagnosis.recommendedCards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  className="flex max-w-full items-start gap-1 text-left text-primary hover:underline"
                  onClick={() => void openKnowledgeCard(diagnosis.unitId, card.id)}
                >
                  <BookOpen className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 break-words">[K:{card.id}] {card.title}</span>
                </button>
              ))}
            </div>
          )}
          <p className="mt-1 text-primary">{diagnosis.nextAction.label}</p>
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
                setMessage(null);
                void loadFoundation();
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
          const topicPack = topicPacks.find((pack) => pack.unitId === item.unit.id);
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
              {topicPack && (
                <details className="mt-2 border-t pt-2" open={recommended || undefined}>
                  <summary className="cursor-pointer text-xs font-medium text-foreground marker:text-muted-foreground">
                    主题学习地图 · {topicPack.completedChecks}/{topicPack.totalChecks} 项已连通
                  </summary>
                  <div className="mt-2 space-y-2 text-[11px] leading-5 text-muted-foreground">
                    <div>
                      <p className="font-medium text-foreground">学完后能够</p>
                      <ol className="list-decimal space-y-0.5 pl-4">
                        {topicPack.learningObjectives.map((objective) => (
                          <li key={objective}>{objective}</li>
                        ))}
                      </ol>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">需要纠正的典型误区</p>
                      <ul className="list-disc space-y-0.5 pl-4">
                        {topicPack.misconceptions.map((misconception) => (
                          <li key={misconception.id}>{misconception.label}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">小测覆盖</p>
                      <p className="break-words">
                        {topicPack.questionCoverage
                          .map((coverage) => `${coverage.label}（${coverage.questions} 题）`)
                          .join(' · ')}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">答错后先看</p>
                      {topicPack.remediationCards.map((card) => (
                        <button
                          key={card.id}
                          type="button"
                          className="flex max-w-full items-start gap-1 text-left text-primary hover:underline"
                          onClick={() => void openKnowledgeCard(item.unit.id, card.id)}
                        >
                          <BookOpen className="mt-1 h-3 w-3 shrink-0" aria-hidden="true" />
                          <span className="min-w-0 break-words">[K:{card.id}] {card.title}</span>
                        </button>
                      ))}
                    </div>
                    <div className="border-t pt-1.5">
                      <p className="font-medium text-foreground">达标后的下一步</p>
                      <p>{topicPack.nextTask.label}</p>
                    </div>
                    {!topicPack.ready && (
                      <p className="text-amber-700">当前学习地图仍有内容连接缺口，暂以本单元小测为准。</p>
                    )}
                  </div>
                </details>
              )}
              <div className="mt-2 flex justify-end">
                <Button
                  size="sm"
                  variant={recommended ? 'default' : 'outline'}
                  disabled={item.status === 'locked' || busyUnitId === item.unit.id}
                  onClick={() => void startQuiz(item.unit.id, true)}
                >
                  {item.status === 'mastered' ? '再测一次' : '开始小测'}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {reader && (() => {
        const readerUnit = units.find((item) => item.unit.id === reader.unitId);
        const unitLocked = !readerUnit || readerUnit.status === 'locked';
        return (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-2 sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="knowledge-card-reader-title"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setReader(null);
            }}
          >
            <div className="flex max-h-[calc(100vh-1rem)] w-full max-w-3xl min-w-0 flex-col overflow-hidden rounded-lg border bg-background shadow-xl sm:max-h-[calc(100vh-2rem)]">
              <div className="flex min-w-0 items-start justify-between gap-3 border-b p-3 sm:p-4">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground break-all">[K:{reader.cardId}]</p>
                  <h2 id="knowledge-card-reader-title" className="break-words text-base font-semibold">
                    {reader.card?.title || '知识卡'}
                  </h2>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0"
                  title="关闭知识卡"
                  aria-label="关闭知识卡"
                  onClick={() => setReader(null)}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>

              <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4">
                {reader.loading && (
                  <p className="py-8 text-center text-sm text-muted-foreground">正在加载知识卡...</p>
                )}
                {reader.error && (
                  <div className="rounded-lg border border-red-200 bg-red-50/50 p-3 text-sm text-red-700">
                    <p>{reader.error}</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-3"
                      onClick={() => void openKnowledgeCard(reader.unitId, reader.cardId)}
                    >
                      重新加载
                    </Button>
                  </div>
                )}
                {reader.card && (
                  <div className="min-w-0 space-y-4">
                    {reader.card.reviewStatus === 'pending' && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
                        本卡内容尚待教师复核，可用于预习和补弱；关键结论请以课程正式材料为准。
                      </div>
                    )}

                    <MarkdownBody
                      content={reader.card.content}
                      className="min-w-0 break-words [&_*]:max-w-full"
                    />

                    <div className="border-t pt-3 text-xs text-muted-foreground">
                      <p className="font-medium text-foreground">资料来源</p>
                      {reader.card.sources.length > 0 ? (
                        <ul className="mt-1 space-y-1">
                          {reader.card.sources.map((source) => (
                            <li key={source.id} className="break-words">
                              {source.url ? (
                                <a
                                  href={source.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-primary underline"
                                >
                                  {source.title}
                                </a>
                              ) : (
                                source.title
                              )}
                              {source.version ? ` · ${source.version}` : ''}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1 break-all">
                          {reader.card.sourceRefs.length > 0
                            ? reader.card.sourceRefs.join('、')
                            : reader.card.source}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t p-3 sm:p-4">
                <Button type="button" size="sm" variant="outline" onClick={() => setReader(null)}>
                  <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
                  返回学习地图
                </Button>
                <div className="min-w-0 text-right">
                  {unitLocked && (
                    <p className="mb-1 max-w-64 text-xs text-muted-foreground">
                      请先完成前置微单元，再开始本单元小测。
                    </p>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    disabled={unitLocked || reader.loading || Boolean(reader.error) || busyUnitId === reader.unitId}
                    onClick={() => {
                      setReader(null);
                      void startQuiz(reader.unitId, true);
                    }}
                  >
                    <Play className="mr-1 h-4 w-4" aria-hidden="true" />
                    开始{readerUnit ? `“${readerUnit.unit.title}”` : '本单元'}小测
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
