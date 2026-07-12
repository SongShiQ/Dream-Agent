'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useApp } from '@/lib/context/app-context';
import { MarkdownBody } from '@/components/MarkdownBody';

interface Question {
  id: string;
  type: string;
  content: string;
  options: string[];
  answer: string;
  explanation: string;
  knowledgePoints: string[];
  difficulty: number;
  source?: string;
}

/** 本会话浏览过的题目快照（支持上一题） */
type TrailItem = {
  question: Question;
  selectedAnswer: string;
  showResult: boolean;
  isCorrect: boolean;
  explanation: string;
  readings: {
    title: string;
    excerpt: string;
    content?: string;
    source: string;
    labs: string[];
  }[];
  questionNumber: number;
  targeted: boolean;
};

const FAV_KEY = (studentId: string) => `opencamp-fav-questions-${studentId}`;
const FAV_MAX = 40;

interface ExamStats {
  total: number;
  correct: number;
  streak: number;
  maxStreak: number;
}

interface UpgradeInfo {
  eligible: boolean;
  suggestedStage: string | null;
  reason: string;
}

interface ExamPanelProps {
  studentId: string;
  /** 强制针对薄弱点 */
  focusWeak?: boolean;
  /** 专项知识点 */
  knowledgePoint?: string;
  title?: string;
  /** 快练目标题量（如卡住一键过关 = 3）；不传则无限刷 */
  targetCount?: number;
  /** 进入后自动出第一题 */
  autoStart?: boolean;
  /** 快练完成回调 */
  onSessionComplete?: (summary: { total: number; correct: number; knowledgePoint?: string }) => void;
  /** 退出练习（回地图/清空本轮） */
  onExit?: () => void;
}

export function ExamPanel({
  studentId,
  focusWeak = false,
  knowledgePoint,
  title = '练习模式',
  targetCount,
  autoStart = false,
  onSessionComplete,
  onExit,
}: ExamPanelProps) {
  const { user, updateProfile, refreshStats, addRecord } = useApp();
  const [question, setQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [difficulty, setDifficulty] = useState(user?.currentDifficulty ?? 50);
  const [stats, setStats] = useState<ExamStats>({ total: 0, correct: 0, streak: 0, maxStreak: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [targeted, setTargeted] = useState(false);
  const [upgrade, setUpgrade] = useState<UpgradeInfo | null>(null);
  const [promoting, setPromoting] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);
  const [preReadings, setPreReadings] = useState<
    { title: string; excerpt: string; content?: string; source: string; labs: string[] }[]
  >([]);
  /** 课前速览默认折叠，避免挡做题 */
  const [preOpen, setPreOpen] = useState(false);
  const [readings, setReadings] = useState<
    {
      title: string;
      excerpt: string;
      content?: string;
      source: string;
      labs: string[];
    }[]
  >([]);
  const [expandedReading, setExpandedReading] = useState<number | null>(null);
  const [askOpen, setAskOpen] = useState(false);
  const [askText, setAskText] = useState('');
  const [askBusy, setAskBusy] = useState(false);
  const [askReply, setAskReply] = useState<string | null>(null);
  const [askError, setAskError] = useState<string | null>(null);
  /** 本会话题目轨迹（含当前），用于上一题 */
  const [trail, setTrail] = useState<TrailItem[]>([]);
  const [trailIndex, setTrailIndex] = useState(-1);
  const [favorites, setFavorites] = useState<Question[]>([]);
  const [showFavPanel, setShowFavPanel] = useState(false);

  // 从 URL / 父组件 focus 变化时重置
  useEffect(() => {
    setQuestion(null);
    setShowResult(false);
    setQuestionNumber(0);
    setSessionDone(false);
    setStats({ total: 0, correct: 0, streak: 0, maxStreak: 0 });
    setPreReadings([]);
    setTrail([]);
    setTrailIndex(-1);
  }, [focusWeak, knowledgePoint, targetCount]);

  // 加载收藏
  useEffect(() => {
    if (!studentId || typeof window === 'undefined') {
      setFavorites([]);
      return;
    }
    try {
      const raw = localStorage.getItem(FAV_KEY(studentId));
      if (!raw) {
        setFavorites([]);
        return;
      }
      const arr = JSON.parse(raw);
      setFavorites(Array.isArray(arr) ? arr : []);
    } catch {
      setFavorites([]);
    }
  }, [studentId]);

  const persistFavorites = (next: Question[]) => {
    setFavorites(next);
    if (!studentId || typeof window === 'undefined') return;
    try {
      localStorage.setItem(FAV_KEY(studentId), JSON.stringify(next.slice(0, FAV_MAX)));
    } catch {
      /* ignore */
    }
  };

  const isFav = (id?: string) => !!id && favorites.some((f) => f.id === id);

  const toggleFavorite = () => {
    if (!question) return;
    if (isFav(question.id)) {
      persistFavorites(favorites.filter((f) => f.id !== question.id));
    } else {
      const entry: Question = {
        ...question,
        // 收藏时带上解析，方便回看
        explanation: explanation || question.explanation,
      };
      const next = [entry, ...favorites.filter((f) => f.id !== question.id)].slice(0, FAV_MAX);
      persistFavorites(next);
    }
  };

  const snapshotCurrent = (): TrailItem | null => {
    if (!question) return null;
    return {
      question,
      selectedAnswer,
      showResult,
      isCorrect,
      explanation,
      readings,
      questionNumber,
      targeted,
    };
  };

  const restoreTrailItem = (item: TrailItem) => {
    setQuestion(item.question);
    setSelectedAnswer(item.selectedAnswer);
    setShowResult(item.showResult);
    setIsCorrect(item.isCorrect);
    setExplanation(item.explanation);
    setReadings(item.readings);
    setQuestionNumber(item.questionNumber);
    setTargeted(item.targeted);
    setExpandedReading(null);
    setAskOpen(false);
    setAskReply(null);
    setError(null);
  };

  const goPrevQuestion = () => {
    if (trailIndex <= 0) return;
    const snap = snapshotCurrent();
    const nextIdx = trailIndex - 1;
    setTrail((prev) => {
      const copy = [...prev];
      if (snap && trailIndex >= 0 && trailIndex < copy.length) {
        copy[trailIndex] = snap;
      }
      const item = copy[nextIdx];
      if (item) {
        // 同步恢复 UI（在 setState 外再调一次保证渲染）
        queueMicrotask(() => restoreTrailItem(item));
      }
      return copy;
    });
    setTrailIndex(nextIdx);
  };

  // 专项/薄弱快练：预取 1 张卡片作「可选课前速览」（默认折叠）
  useEffect(() => {
    let cancelled = false;
    setPreOpen(false);
    setPreReadings([]);
    (async () => {
      // 综合无限刷不塞课前卡，减少噪音
      const tag = knowledgePoint || (focusWeak ? user?.weakPoints?.[0] : undefined);
      if (!tag) return;
      try {
        const kr = await fetch('/api/knowledge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tags: [tag], limit: 1 }),
        });
        const kd = await kr.json();
        if (!cancelled && kr.ok && kd.cards?.length) {
          setPreReadings(
            kd.cards.map(
              (c: {
                title: string;
                excerpt: string;
                content?: string;
                source: string;
                labs?: string[];
              }) => ({
                title: c.title,
                excerpt: c.excerpt,
                content: c.content,
                source: c.source,
                labs: c.labs || [],
              })
            )
          );
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [knowledgePoint, focusWeak, studentId]);

  const generateNewQuestion = async (opts?: { forceLlm?: boolean }) => {
    if (!studentId) {
      setError('未登录或学员 ID 无效');
      return;
    }
    // 若在历史中间点「下一题」，先前进到轨迹末尾再出新题
    if (trailIndex >= 0 && trailIndex < trail.length - 1 && !opts?.forceLlm) {
      const snap = snapshotCurrent();
      const nextIdx = trailIndex + 1;
      setTrail((prev) => {
        const copy = [...prev];
        if (snap && trailIndex < copy.length) copy[trailIndex] = snap;
        return copy;
      });
      setTrailIndex(nextIdx);
      const item = trail[nextIdx];
      if (item) {
        restoreTrailItem(item);
        return;
      }
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          action: 'generate',
          currentDifficulty: difficulty,
          focusWeak: focusWeak || (user?.weakPoints?.length ?? 0) > 0,
          knowledgePoint: knowledgePoint || undefined,
          stage: user?.currentStage,
          forceLlm: !!opts?.forceLlm,
          allowLlm: !!opts?.forceLlm,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || data.hint || '出题失败');
        return;
      }

      const q = data.question as Question;
      const normalized: Question = {
        ...q,
        options: Array.isArray(q.options) ? q.options : [],
        knowledgePoints: Array.isArray(q.knowledgePoints) ? q.knowledgePoints : [],
      };

      // 把当前题写入轨迹再推进
      const snap = snapshotCurrent();
      setTrail((prev) => {
        let base = [...prev];
        if (trailIndex >= 0 && trailIndex < base.length - 1) {
          base = base.slice(0, trailIndex + 1);
        }
        if (snap) {
          if (trailIndex >= 0 && trailIndex < base.length) {
            base[trailIndex] = snap;
          } else if (trailIndex === -1 && base.length === 0) {
            // 第一题之前无快照
          } else if (snap.question.id) {
            // 替换末尾当前或追加
            if (base.length && base[base.length - 1].question.id === snap.question.id) {
              base[base.length - 1] = snap;
            } else {
              base.push(snap);
            }
          }
        }
        const nextNum =
          base.length > 0
            ? Math.max(...base.map((t) => t.questionNumber)) + 1
            : questionNumber + 1;
        const newItem: TrailItem = {
          question: normalized,
          selectedAnswer: '',
          showResult: false,
          isCorrect: false,
          explanation: '',
          readings: [],
          questionNumber: nextNum > 0 ? nextNum : 1,
          targeted: !!data.targeted,
        };
        const nextTrail = [...base, newItem];
        setTrailIndex(nextTrail.length - 1);
        return nextTrail;
      });

      setQuestion(normalized);
      if (typeof data.difficulty === 'number') setDifficulty(data.difficulty);
      setTargeted(!!data.targeted);
      setSelectedAnswer('');
      setShowResult(false);
      setExplanation('');
      setReadings([]);
      setExpandedReading(null);
      setAskReply(null);
      setAskError(null);
      setAskText('');
      setQuestionNumber((prev) => (prev < 1 ? 1 : prev + 1));
    } catch (e) {
      console.error(e);
      setError('网络错误，无法出题');
    } finally {
      setIsLoading(false);
    }
  };

  // 自动开练（仅一次，避免 ref 伪点击）
  useEffect(() => {
    if (!autoStart || !studentId || question || isLoading || sessionDone || questionNumber > 0) {
      return;
    }
    void generateNewQuestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, studentId, knowledgePoint, focusWeak]);

  const submitAnswer = async () => {
    if (!question || !studentId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          action: 'submit',
          questionId: question.id,
          answer: selectedAnswer,
          timeSpent: 0,
          currentDifficulty: difficulty,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '提交失败');
        return;
      }

      const correct = !!data.isCorrect;
      setIsCorrect(correct);
      setShowResult(true);
      const expl = data.explanation || question.explanation;
      setExplanation(expl);

      // 同步更新轨迹中当前项
      setTrail((prev) => {
        if (trailIndex < 0 || trailIndex >= prev.length) return prev;
        const copy = [...prev];
        copy[trailIndex] = {
          ...copy[trailIndex],
          selectedAnswer,
          showResult: true,
          isCorrect: correct,
          explanation: expl,
        };
        return copy;
      });

      const nextStats = {
        total: stats.total + 1,
        correct: stats.correct + (correct ? 1 : 0),
        streak: correct ? stats.streak + 1 : 0,
        maxStreak: Math.max(stats.maxStreak, correct ? stats.streak + 1 : 0),
      };
      setStats(nextStats);

      if (typeof data.difficulty === 'number') {
        setDifficulty(data.difficulty);
        updateProfile({ currentDifficulty: data.difficulty });
      }
      if (data.stats) {
        updateProfile({
          totalQuestions: data.stats.totalQuestions,
          correctAnswers: data.stats.correctAnswers,
          weakPoints: data.weakPoints || [],
        });
      }
      if (data.upgrade) setUpgrade(data.upgrade);

      // 快练达标：本会话做满 targetCount 题
      if (targetCount && nextStats.total >= targetCount) {
        setSessionDone(true);
        onSessionComplete?.({
          total: nextStats.total,
          correct: nextStats.correct,
          knowledgePoint,
        });
        await refreshStats();
      }

      addRecord({
        mode: 'quiz',
        content: question.content.slice(0, 80),
        result: correct ? 'correct' : 'incorrect',
        knowledgePoints: question.knowledgePoints,
      });

      // 扩展阅读：按题目知识点拉知识卡片
      try {
        const tags = question.knowledgePoints || [];
        if (tags.length > 0) {
          const kr = await fetch('/api/knowledge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tags, limit: 2 }),
          });
          const kd = await kr.json();
          if (kr.ok && kd.cards?.length) {
            const nextReadings = kd.cards.map(
              (c: {
                title: string;
                excerpt: string;
                content?: string;
                source: string;
                labs?: string[];
              }) => ({
                title: c.title,
                excerpt: c.excerpt,
                content: c.content,
                source: c.source,
                labs: c.labs || [],
              })
            );
            setReadings(nextReadings);
            setExpandedReading(null);
            setTrail((prev) => {
              if (trailIndex < 0 || trailIndex >= prev.length) return prev;
              const copy = [...prev];
              copy[trailIndex] = { ...copy[trailIndex], readings: nextReadings };
              return copy;
            });
          } else {
            setReadings([]);
          }
        } else {
          setReadings([]);
        }
      } catch {
        setReadings([]);
      }
    } catch (e) {
      console.error(e);
      setError('网络错误，无法提交');
    } finally {
      setIsLoading(false);
    }
  };

  const promote = async () => {
    if (!studentId) return;
    setPromoting(true);
    try {
      const res = await fetch('/api/exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, action: 'promote' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '升级失败');
        setUpgrade(data.upgrade || null);
        return;
      }
      updateProfile({ currentStage: data.student.currentStage });
      setUpgrade({
        eligible: false,
        suggestedStage: null,
        reason: `已升级到 ${data.student.currentStage}`,
      });
      await refreshStats();
    } catch {
      setError('升级请求失败');
    } finally {
      setPromoting(false);
    }
  };

  const getDifficultyLabel = (d: number) => {
    if (d < 30) return '简单';
    if (d < 60) return '中等';
    if (d < 80) return '困难';
    return '专家';
  };

  const getDifficultyColor = (d: number) => {
    if (d < 30) return 'text-green-600';
    if (d < 60) return 'text-yellow-600';
    if (d < 80) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="flex flex-col h-full p-4 space-y-4 overflow-y-auto">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-lg font-semibold">
          {title}
          {knowledgePoint ? ` · ${knowledgePoint}` : ''}
          {focusWeak && !knowledgePoint ? ' · 薄弱点优先' : ''}
        </h2>
        <div className="flex items-center flex-wrap gap-2 text-sm text-muted-foreground">
          <span>
            题目: {targetCount ? `${Math.min(stats.total, targetCount)}/${targetCount}` : questionNumber}
          </span>
          <span>
            正确率: {stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0}%
          </span>
          <span>连续: {stats.streak}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9"
            disabled={trailIndex <= 0 || isLoading}
            onClick={goPrevQuestion}
            title="回看本会话上一题"
          >
            上一题
          </Button>
          <Button
            type="button"
            variant={isFav(question?.id) ? 'default' : 'outline'}
            size="sm"
            className="h-9"
            disabled={!question}
            onClick={toggleFavorite}
            title="收藏本题，可在收藏夹回看"
          >
            {isFav(question?.id) ? '已收藏' : '收藏'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => setShowFavPanel((v) => !v)}
          >
            收藏夹 ({favorites.length})
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-9"
            disabled={isLoading || !studentId}
            onClick={() => void generateNewQuestion({ forceLlm: true })}
            title="跳过题库，用大模型出一题（需 API Key）"
          >
            AI 出一题
          </Button>
          {onExit && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => {
                setQuestion(null);
                setShowResult(false);
                setSelectedAnswer('');
                setExplanation('');
                setReadings([]);
                setSessionDone(false);
                setAskOpen(false);
                setAskReply(null);
                setTrail([]);
                setTrailIndex(-1);
                onExit();
              }}
            >
              退出练习
            </Button>
          )}
        </div>
      </div>

      {showFavPanel && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex justify-between items-center">
              <span>我的收藏（本机，最多 {FAV_MAX} 题）</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowFavPanel(false)}>
                关闭
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-48 overflow-y-auto">
            {favorites.length === 0 ? (
              <p className="text-xs text-muted-foreground">还没有收藏。做到好题时点「收藏」。</p>
            ) : (
              favorites.map((f) => (
                <div
                  key={f.id}
                  className="flex items-start gap-2 border rounded-lg p-2 text-xs"
                >
                  <button
                    type="button"
                    className="flex-1 text-left hover:underline"
                    onClick={() => {
                      setQuestion(f);
                      setSelectedAnswer('');
                      setShowResult(true);
                      setIsCorrect(true);
                      setExplanation(f.explanation || '');
                      setReadings([]);
                      setShowFavPanel(false);
                      setError(null);
                    }}
                  >
                    <p className="font-medium line-clamp-2">{f.content}</p>
                    <p className="text-muted-foreground mt-0.5">
                      {(f.knowledgePoints || []).join(', ')} · 难度 {f.difficulty}
                      {f.source === 'llm' ? ' · AI' : ''}
                    </p>
                  </button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 h-8"
                    onClick={() => persistFavorites(favorites.filter((x) => x.id !== f.id))}
                  >
                    取消
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {preReadings.length > 0 && !sessionDone && (
        <div className="rounded-xl border border-dashed border-muted-foreground/25 bg-muted/20 overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors"
            onClick={() => setPreOpen((v) => !v)}
            aria-expanded={preOpen}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold">
              读
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground truncate">
                课前速览 · {preReadings[0]?.title || '知识点'}
              </span>
              <span className="block text-[11px] text-muted-foreground">
                可选 · 不挡做题 · 点此{preOpen ? '收起' : '展开 30 秒扫一眼'}
              </span>
            </span>
            <span
              className={`shrink-0 text-xs px-2.5 py-1 rounded-md border bg-background ${
                preOpen ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              {preOpen ? '收起' : '展开'}
            </span>
          </button>
          {preOpen && (
            <div className="px-3 pb-3 pt-0 border-t border-dashed border-muted-foreground/20">
              {preReadings.map((r, i) => {
                // 只取前几条「要点」感内容，避免整篇大纲糊脸
                const raw = (r.content || r.excerpt || '').trim();
                const tip = raw
                  .replace(/^#+\s.*$/gm, '')
                  .replace(/```[\s\S]*?```/g, '')
                  .split(/\n+/)
                  .map((l) => l.trim())
                  .filter((l) => l && !l.startsWith('---'))
                  .slice(0, 4)
                  .join('\n');
                return (
                  <div key={i} className="pt-2 space-y-2">
                    <MarkdownBody
                      compact
                      content={
                        tip
                          ? `**${r.title}**\n\n${tip.slice(0, 320)}${tip.length > 320 ? '…' : ''}`
                          : `**${r.title}**`
                      }
                    />
                    <p className="text-[10px] text-muted-foreground">
                      来源 {r.source}
                      {r.labs?.length ? ` · ${r.labs.join(', ')}` : ''}
                      {' · '}
                      做完题后「扩展阅读」有全文
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {sessionDone && (
        <Card>
          <CardContent className="p-6 space-y-3 text-center">
            <p className="text-lg font-semibold">本轮快练完成</p>
            <p className="text-sm">
              {knowledgePoint || (focusWeak ? '薄弱点' : '综合')}：{stats.correct}/{stats.total} 正确
              （
              {stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0}%）
            </p>
            <p className="text-xs text-muted-foreground">
              {stats.correct >= Math.ceil((targetCount || 3) * 0.67)
                ? '不错，薄弱点有望从列表中衰减（连续做对会自动降权）。'
                : '建议再开一轮，或回错题本看解析。'}
            </p>
            <p className="text-xs text-muted-foreground">
              建议：回学习地图勾选/查看今日三步的下一步。
            </p>
            <div className="flex flex-wrap gap-2 justify-center pt-2">
              <Button
                onClick={() => {
                  setSessionDone(false);
                  setStats({ total: 0, correct: 0, streak: 0, maxStreak: 0 });
                  setQuestion(null);
                  setShowResult(false);
                  setQuestionNumber(0);
                }}
              >
                再来一轮
              </Button>
              {onSessionComplete && (
                <Button
                  variant="outline"
                  onClick={() =>
                    onSessionComplete({
                      total: stats.total,
                      correct: stats.correct,
                      knowledgePoint,
                    })
                  }
                >
                  回学习地图
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {upgrade?.eligible && (
        <div className="p-3 border border-primary/40 bg-primary/5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <p className="text-sm">{upgrade.reason}</p>
          <Button size="sm" onClick={promote} disabled={promoting}>
            {promoting ? '升级中...' : `升级到 ${upgrade.suggestedStage}`}
          </Button>
        </div>
      )}

      {error && (
        <div className="p-3 text-sm text-red-700 bg-red-50 rounded-lg border border-red-100">
          {error}
        </div>
      )}

      {!sessionDone && question ? (
        <Card className="flex-1">
          <CardHeader>
            <div className="flex justify-between items-start gap-2">
              <CardTitle className="text-base">第 {questionNumber} 题</CardTitle>
              <div className="flex gap-2 flex-wrap justify-end">
                <span className={`text-sm font-medium ${getDifficultyColor(difficulty)}`}>
                  {getDifficultyLabel(difficulty)} ({difficulty})
                </span>
                {targeted && (
                  <span className="text-xs bg-amber-100 text-amber-900 px-2 py-1 rounded">
                    薄弱点相关
                  </span>
                )}
                {question.source && (
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      question.source === 'bank'
                        ? 'bg-secondary'
                        : 'bg-violet-100 text-violet-900'
                    }`}
                    title={
                      question.source === 'bank'
                        ? '固定题库（推荐正式课）'
                        : 'AI 动态生成（需审核）'
                    }
                  >
                    {question.source === 'bank' ? '固定题库' : 'AI 生成'}
                  </span>
                )}
                {question.knowledgePoints?.map((point, i) => (
                  <span key={i} className="text-xs bg-secondary px-2 py-1 rounded">
                    {point}
                  </span>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm whitespace-pre-wrap">{question.content}</p>

            {question.type === 'choice' && question.options.length > 0 && (
              <RadioGroup
                value={selectedAnswer}
                onValueChange={setSelectedAnswer}
                disabled={showResult}
              >
                {question.options.map((opt, i) => {
                  const letter = opt.charAt(0).toUpperCase();
                  const correctLetter = String(question.answer || '')
                    .trim()
                    .charAt(0)
                    .toUpperCase();
                  const isCorrectOpt = showResult && letter === correctLetter;
                  const isWrongPick =
                    showResult && selectedAnswer.toUpperCase() === letter && letter !== correctLetter;
                  return (
                    <div
                      key={i}
                      className={`flex items-center space-x-2 p-2 rounded border ${
                        isCorrectOpt
                          ? 'bg-green-100 border-green-400'
                          : isWrongPick
                            ? 'bg-red-100 border-red-300'
                            : 'border-transparent hover:bg-muted'
                      }`}
                    >
                      <RadioGroupItem value={letter} id={`opt-${i}`} />
                      <Label htmlFor={`opt-${i}`} className="flex-1 cursor-pointer">
                        {opt}
                        {isCorrectOpt && (
                          <span className="ml-2 text-xs font-semibold text-green-800">（正确）</span>
                        )}
                        {isWrongPick && (
                          <span className="ml-2 text-xs font-semibold text-red-800">（你的选择）</span>
                        )}
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            )}

            {question.type !== 'choice' && (
              <div>
                <Label htmlFor="fill-answer">你的答案</Label>
                <input
                  id="fill-answer"
                  type="text"
                  value={selectedAnswer}
                  onChange={(e) => setSelectedAnswer(e.target.value)}
                  disabled={showResult}
                  className="w-full p-2 border rounded mt-1"
                  placeholder="输入答案..."
                />
              </div>
            )}

            {showResult && (
              <div
                className={`p-4 rounded-lg ${
                  isCorrect ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900'
                }`}
              >
                <p className="font-medium mb-2">{isCorrect ? '✓ 正确！' : '✗ 错误'}</p>
                {!isCorrect && question && (
                  <p className="text-sm font-semibold mb-2">
                    正确答案：
                    {question.type === 'choice'
                      ? question.options.find(
                          (o) => o.charAt(0).toUpperCase() === String(question.answer).charAt(0).toUpperCase()
                        ) || question.answer
                      : question.answer}
                  </p>
                )}
                <MarkdownBody content={explanation || ''} />
              </div>
            )}

            {/* 下一题放在结果正下方，避免被长卡片顶走 */}
            {showResult && (
              <div className="flex gap-2 sticky bottom-0 z-10 py-2 bg-background/95 backdrop-blur border-y">
                <Button
                  onClick={generateNewQuestion}
                  disabled={
                    isLoading ||
                    !!(targetCount && stats.total >= targetCount)
                  }
                  className="flex-1 h-11 text-base"
                >
                  {isLoading
                    ? '生成中...'
                    : targetCount && stats.total + 1 >= targetCount
                      ? '最后一题 · 下一题'
                      : targetCount
                        ? `下一题（${stats.total + 1}/${targetCount}）`
                        : '下一题'}
                </Button>
              </div>
            )}

            {showResult && readings.length > 0 && (
              <div className="p-3 border rounded-lg space-y-3 bg-muted/40">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">扩展阅读（可选）</p>
                  <p className="text-[11px] text-muted-foreground">默认折叠，不挡下一题</p>
                </div>
                {readings.map((r, i) => {
                  const open = expandedReading === i;
                  const body = r.content || r.excerpt || '';
                  return (
                    <div key={i} className="border rounded-lg bg-background p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm">{r.title}</p>
                        <Button
                          type="button"
                          variant={open ? 'secondary' : 'default'}
                          size="sm"
                          className="shrink-0 h-9 px-4 text-sm font-medium"
                          onClick={() => setExpandedReading(open ? null : i)}
                        >
                          {open ? '收起' : '展开全文'}
                        </Button>
                      </div>
                      {open ? (
                        <div className="max-h-72 overflow-y-auto pr-1 border-t pt-2">
                          <MarkdownBody content={body} compact />
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {(r.excerpt || body).replace(/[#*`]/g, '').slice(0, 120)}
                          …
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground opacity-80">
                        来源：{r.source}
                        {r.labs?.length ? ` · labs: ${r.labs.join(', ')}` : ''}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {showResult && (
              <div className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">本题不懂？问助教</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 px-4"
                    onClick={() => setAskOpen((v) => !v)}
                  >
                    {askOpen ? '收起' : '打开问答'}
                  </Button>
                </div>
                {askOpen && (
                  <div className="space-y-2">
                    <p className="text-[11px] text-muted-foreground">
                      会把本题题干与解析一并发给助教（不离开练习）。完整历史会话请用「智能问答」。
                    </p>
                    <textarea
                      className="w-full min-h-[64px] text-sm border rounded p-2 bg-background"
                      placeholder="例如：为什么选 B？和 fork 有什么关系？"
                      value={askText}
                      onChange={(e) => setAskText(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={askBusy || !askText.trim() || !studentId}
                        onClick={async () => {
                          if (!question || !studentId) return;
                          setAskBusy(true);
                          setAskError(null);
                          setAskReply(null);
                          try {
                            const prompt = [
                              '我在练习模式做题，请结合下面题目简短讲解（先要点后细节）。',
                              `题干：${question.content}`,
                              explanation ? `官方解析：${explanation}` : '',
                              `我的问题：${askText.trim()}`,
                            ]
                              .filter(Boolean)
                              .join('\n');
                            const res = await fetch('/api/chat', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                studentId,
                                mode: 'practice',
                                newSession: true,
                                messages: [{ role: 'user', content: prompt }],
                                learnerContext: user
                                  ? {
                                      name: user.name,
                                      currentStage: user.currentStage,
                                      weakPoints: user.weakPoints,
                                      totalQuestions: user.totalQuestions,
                                      correctAnswers: user.correctAnswers,
                                    }
                                  : undefined,
                              }),
                            });
                            if (!res.ok) {
                              const t = await res.text();
                              throw new Error(t.slice(0, 200) || `HTTP ${res.status}`);
                            }
                            // 流式或纯文本
                            const reader = res.body?.getReader();
                            if (!reader) {
                              setAskReply(await res.text());
                              return;
                            }
                            const decoder = new TextDecoder();
                            let acc = '';
                            while (true) {
                              const { done, value } = await reader.read();
                              if (done) break;
                              acc += decoder.decode(value, { stream: true });
                            }
                            // 尽量抽出可读文本
                            let text = acc;
                            if (acc.includes('0:"') || acc.includes('data:')) {
                              const parts: string[] = [];
                              for (const line of acc.split('\n')) {
                                const t = line.trim();
                                if (t.startsWith('0:')) {
                                  try {
                                    parts.push(JSON.parse(t.slice(2)));
                                  } catch {
                                    /* ignore */
                                  }
                                } else if (t.startsWith('data: ') && t !== 'data: [DONE]') {
                                  try {
                                    const j = JSON.parse(t.slice(6));
                                    const p =
                                      j.choices?.[0]?.delta?.content ||
                                      j.choices?.[0]?.message?.content ||
                                      '';
                                    if (p) parts.push(p);
                                  } catch {
                                    /* ignore */
                                  }
                                }
                              }
                              if (parts.length) text = parts.join('');
                            }
                            setAskReply(text.trim() || acc.slice(0, 2000));
                          } catch (e) {
                            setAskError(e instanceof Error ? e.message : '提问失败');
                          } finally {
                            setAskBusy(false);
                          }
                        }}
                      >
                        {askBusy ? '思考中…' : '发送'}
                      </Button>
                    </div>
                    {askError && (
                      <p className="text-xs text-red-600 whitespace-pre-wrap">{askError}</p>
                    )}
                    {askReply && (
                      <div className="p-2 rounded bg-muted/50 border">
                        <MarkdownBody content={askReply} compact />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {!showResult && (
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={submitAnswer}
                  disabled={!selectedAnswer || isLoading}
                  className="flex-1 h-11"
                >
                  {isLoading ? '提交中...' : '提交答案'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : !sessionDone ? (
        <Card className="flex-1">
          <CardContent className="flex flex-col items-center justify-center h-full min-h-[200px] gap-3">
            <p className="text-muted-foreground text-sm text-center">
              {knowledgePoint
                ? `专项练习：${knowledgePoint}${targetCount ? ` · 快练 ${targetCount} 题` : ''}`
                : focusWeak
                  ? `将优先抽取与你薄弱点相关的题目${targetCount ? ` · 快练 ${targetCount} 题` : ''}`
                  : '题库智能抽题（优先薄弱点，避开近期重复）'}
            </p>
            <p className="text-xs text-muted-foreground text-center max-w-sm">
              若提示题库为空：在项目目录运行{' '}
              <code className="bg-muted px-1 rounded">npx tsx scripts/import-questions.ts</code>
            </p>
            <Button onClick={generateNewQuestion} disabled={isLoading || !studentId} size="lg">
              {isLoading
                ? '生成中...'
                : targetCount
                  ? `开始快练 ${targetCount} 题`
                  : '开始练习'}
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
